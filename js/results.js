/* ============================================
   RESULTS PAGE - Ranked condition summary
   ============================================ */

(function () {
  'use strict';

  var params = new URLSearchParams(window.location.search);
  var bodyPart = params.get('bodyPart') || '';
  var storageKey = 'bodycheck-question-flow';
  var partTitle = document.getElementById('resultsPartTitle');
  var summary = document.getElementById('resultsSummary');
  var content = document.getElementById('resultsContent');
  var backBtn = document.getElementById('resultsBackBtn');

  if (backBtn) {
    backBtn.href = 'body-map.html';
    backBtn.addEventListener('click', function (e) {
      e.preventDefault();
      window.location.assign('body-map.html');
    });
  }

  var medicationTerms = [
    'medication', 'medications', 'pain relief', 'pain relievers', 'anti-inflammatory',
    'antacids', 'triptans', 'drops', 'decongestants', 'antihistamines', 'simethicone',
    'charcoal', 'gel', 'wax softener', 'spray', 'artificial tears', 'supplements',
    'b12', 'caffeine', 'corticosteroid'
  ];

  function readSession() {
    try {
      return JSON.parse(sessionStorage.getItem(storageKey) || 'null');
    } catch (e) {
      return null;
    }
  }

  function saveSession(session) {
    sessionStorage.setItem(storageKey, JSON.stringify(session));
  }

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function listItems(items) {
    if (!items || !items.length) return '<p class="detail-text">No matching guidance is available in the current data.</p>';
    return '<ul class="detail-list">' + items.map(function (item) {
      return '<li>' + escapeHtml(item) + '</li>';
    }).join('') + '</ul>';
  }

  function isMedication(item) {
    var value = String(item || '').toLowerCase();
    return medicationTerms.some(function (term) {
      return value.indexOf(term) !== -1;
    });
  }

  function medicationPurpose(item, conditionName) {
    var value = String(item || '').toLowerCase();
    if (value.indexOf('antacid') !== -1) return 'May help reduce acid-related discomfort.';
    if (value.indexOf('anti-inflammatory') !== -1) return 'May help reduce inflammation and pain.';
    if (value.indexOf('pain') !== -1) return 'May help relieve pain related to ' + conditionName + '.';
    if (value.indexOf('drops') !== -1 || value.indexOf('spray') !== -1 || value.indexOf('artificial tears') !== -1) return 'May help relieve local irritation or dryness.';
    if (value.indexOf('simethicone') !== -1 || value.indexOf('charcoal') !== -1) return 'May help with gas or bloating symptoms.';
    if (value.indexOf('triptan') !== -1) return 'May help migraine symptoms when prescribed by a clinician.';
    return 'Listed in the current project data for this condition.';
  }

  function medicationCards(symptom) {
    var meds = (symptom.remedies || []).filter(isMedication);
    if (!meds.length) {
      return '<p class="detail-text">No medication suggestions are available in the current data for this condition.</p>';
    }

    var html = '<div class="medication-list">';
    meds.forEach(function (med) {
      html += '<div class="medication-item">';
      html += '<strong>' + escapeHtml(med) + '</strong>';
      html += '<span>' + escapeHtml(medicationPurpose(med, symptom.name)) + '</span>';
      html += '</div>';
    });
    html += '</div>';
    html += '<p class="medical-disclaimer">Medical disclaimer: this is general information from the project data, not a diagnosis or prescription. Ask a qualified healthcare professional before taking medication.</p>';
    return html;
  }

  function selfCareItems(symptom) {
    var items = [];
    (symptom.remedies || []).forEach(function (item) {
      if (!isMedication(item)) items.push(item);
    });
    if (symptom.hydration) items.push(symptom.hydration);
    if (symptom.exercises && symptom.exercises.length) items = items.concat(symptom.exercises.slice(0, 3));
    if (symptom.prevention && symptom.prevention.length) items = items.concat(symptom.prevention.slice(0, 3));
    return items.slice(0, 10);
  }

  function warningItems(symptom, analysis) {
    var items = [];
    if (symptom.emergency) items.push('This condition is marked as emergency-related in the current data.');
    if (symptom.seriousness && symptom.seriousness.toLowerCase() === 'serious') items.push('Symptoms are rated serious in the current data.');
    if (analysis.emergencyWarnings && analysis.emergencyWarnings.length) items = items.concat(analysis.emergencyWarnings);
    items.push('See a doctor if symptoms are severe, worsening, persistent, or unusual for you.');
    return items;
  }

  function reportedAnswers(session) {
    var items = [];
    Object.keys(session.answers || {}).forEach(function (key) {
      var answer = session.answers[key];
      if (Array.isArray(answer)) {
        items = items.concat(answer);
      } else if (answer) {
        items.push(answer);
      }
    });
    return items;
  }

  function resultSection(title, html) {
    return '<section class="result-section"><h2>' + title + '</h2>' + html + '</section>';
  }

  function render() {
    var session = readSession();
    var partData = SymptomsEngine.getByPart(bodyPart);

    if (!bodyPart || !partData || !session || session.bodyPart !== bodyPart) {
      window.location.href = 'question-flow.html?bodyPart=' + encodeURIComponent(bodyPart || 'Head');
      return;
    }

    var questions = QuestionnaireEngine.getPartConfig(bodyPart).questions;
    session.currentIndex = Math.max(questions.length - 1, 0);
    saveSession(session);

    var analysis = QuestionnaireEngine.analyze(bodyPart, session.answers, partData);
    var top = analysis.ranked[0];
    var symptom = top.symptom;
    var commonSymptoms = [symptom.name].concat(reportedAnswers(session)).slice(0, 8);

    partTitle.textContent = bodyPart;
    summary.textContent = 'Most relevant match: ' + symptom.name + ' (' + top.confidence + '% match)';
    backBtn.href = 'body-map.html';

    var html = '<div class="top-condition-card ' + SymptomsEngine.severityClass(symptom.seriousness) + '">';
    html += '<div><span class="severity-badge ' + SymptomsEngine.severityClass(symptom.seriousness) + '">' + escapeHtml(symptom.seriousness) + '</span></div>';
    html += '<h2>' + escapeHtml(symptom.name) + '</h2>';
    html += '<p>' + top.confidence + '% match based on your answers.</p>';
    html += '</div>';

    html += resultSection('Possible Cause', '<h3>' + escapeHtml(symptom.name) + '</h3><p class="detail-text">This may be associated with ' + escapeHtml((symptom.causes || []).slice(0, 3).join(', ')) + '.</p>');
    html += resultSection('Common Symptoms', listItems(commonSymptoms));
    html += resultSection('Suggested Medications', medicationCards(symptom));
    html += resultSection('Self-Care Steps', listItems(selfCareItems(symptom)));
    html += resultSection('When to See a Doctor', listItems(warningItems(symptom, analysis)));

    if (analysis.ranked.length > 1) {
      html += '<section class="result-section"><h2>Other Possible Matches</h2><div class="other-matches">';
      analysis.ranked.slice(1, 4).forEach(function (item) {
        html += '<div class="other-match"><strong>' + escapeHtml(item.symptom.name) + '</strong><span>' + item.confidence + '% match</span></div>';
      });
      html += '</div></section>';
    }

    content.innerHTML = html;
  }

  SymptomsEngine.onReady(function () {
    QuestionnaireEngine.onReady(render);
  });
})();
