/* ============================================
   QUESTION FLOW - One-question-at-a-time route
   ============================================ */

(function () {
  'use strict';

  var params = new URLSearchParams(window.location.search);
  var bodyPart = params.get('bodyPart') || '';
  var shouldReset = params.get('reset') === '1';
  var storageKey = 'bodycheck-question-flow';
  var partTitle = document.getElementById('questionPartTitle');
  var progressText = document.getElementById('questionProgressText');
  var progressBar = document.getElementById('questionProgressBar');
  var questionContainer = document.getElementById('questionContainer');
  var previousBtn = document.getElementById('previousQuestionBtn');
  var nextBtn = document.getElementById('nextQuestionBtn');
  var questions = [];
  var session = null;

  function readSession() {
    try {
      return JSON.parse(sessionStorage.getItem(storageKey) || 'null');
    } catch (e) {
      return null;
    }
  }

  function saveSession() {
    sessionStorage.setItem(storageKey, JSON.stringify(session));
  }

  function createSession() {
    var existing = readSession();
    if (!shouldReset && existing && existing.bodyPart === bodyPart) return existing;

    return {
      bodyPart: bodyPart,
      currentIndex: 0,
      answers: {},
      startedAt: new Date().toISOString()
    };
  }

  function getSelectedValue(question) {
    var saved = session.answers[question.id];
    if (question.type === 'multiple') {
      return Array.isArray(saved) ? saved : [];
    }
    return saved || '';
  }

  function renderQuestion() {
    var question = questions[session.currentIndex];
    var selected = getSelectedValue(question);
    var current = session.currentIndex + 1;

    partTitle.textContent = bodyPart;
    progressText.textContent = 'Question ' + current + ' of ' + questions.length;
    progressBar.style.width = Math.round((current / questions.length) * 100) + '%';
    previousBtn.disabled = session.currentIndex === 0;
    nextBtn.textContent = session.currentIndex === questions.length - 1 ? 'See Results' : 'Next';

    var html = '<div class="question-label flow-question-label"><span>' + current + '</span>' + question.label + '</div>';
    html += '<div class="question-options">';
    question.options.forEach(function (option) {
      var type = question.type === 'multiple' ? 'checkbox' : 'radio';
      var value = option.value || option.label;
      var checked = Array.isArray(selected) ? selected.indexOf(option.label) !== -1 : selected === option.label;
      html += '<label class="question-option">';
      html += '<input type="' + type + '" name="' + question.id + '" value="' + value + '" data-label="' + option.label + '"' + (checked ? ' checked' : '') + '>';
      html += '<span>' + option.label + '</span>';
      html += '</label>';
    });
    html += '</div>';

    questionContainer.innerHTML = html;
    questionContainer.querySelectorAll('input').forEach(function (input) {
      input.addEventListener('change', collectAnswer);
    });
    updateNextState();
  }

  function collectAnswer() {
    var question = questions[session.currentIndex];
    var checked = questionContainer.querySelectorAll('input:checked');
    var values = Array.prototype.map.call(checked, function (input) {
      return input.getAttribute('data-label') || input.value;
    });

    session.answers[question.id] = question.type === 'multiple' ? values : (values[0] || '');
    saveSession();
    updateNextState();
  }

  function updateNextState() {
    var question = questions[session.currentIndex];
    var answer = session.answers[question.id];
    nextBtn.disabled = Array.isArray(answer) ? answer.length === 0 : !answer;
  }

  function goPrevious() {
    if (session.currentIndex === 0) return;
    session.currentIndex -= 1;
    saveSession();
    renderQuestion();
  }

  function goNext() {
    if (nextBtn.disabled) return;

    if (session.currentIndex === questions.length - 1) {
      session.completedAt = new Date().toISOString();
      saveSession();
      window.location.href = 'results.html?bodyPart=' + encodeURIComponent(bodyPart);
      return;
    }

    session.currentIndex += 1;
    saveSession();
    renderQuestion();
  }

  function init() {
    if (!bodyPart || !SymptomsEngine.getByPart(bodyPart)) {
      window.location.href = 'body-map.html';
      return;
    }

    questions = QuestionnaireEngine.getPartConfig(bodyPart).questions;
    if (!questions.length) {
      window.location.href = 'body-map.html';
      return;
    }

    session = createSession();
    if (session.currentIndex >= questions.length) session.currentIndex = questions.length - 1;
    saveSession();
    renderQuestion();
  }

  previousBtn.addEventListener('click', goPrevious);
  nextBtn.addEventListener('click', goNext);

  SymptomsEngine.onReady(function () {
    QuestionnaireEngine.onReady(init);
  });
})();
