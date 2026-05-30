/* ============================================
   QUESTIONNAIRE ENGINE - Guided symptom analysis
   ============================================ */

var QuestionnaireEngine = (function () {
  'use strict';

  var config = null;
  var loaded = false;
  var listeners = [];

  function load(callback) {
    if (loaded) {
      if (callback) callback(config);
      return;
    }

    var xhr = new XMLHttpRequest();
    xhr.open('GET', 'data/questionnaire.json', true);
    xhr.onreadystatechange = function () {
      if (xhr.readyState === 4) {
        if (xhr.status === 200 || xhr.status === 0) {
          try {
            config = JSON.parse(xhr.responseText);
            loaded = true;
            listeners.forEach(function (fn) { fn(config); });
            listeners = [];
            if (callback) callback(config);
          } catch (e) {
            console.error('Failed to parse questionnaire data:', e);
          }
        }
      }
    };
    xhr.send();
  }

  function onReady(fn) {
    if (loaded) {
      fn(config);
    } else {
      listeners.push(fn);
    }
  }

  function getPartConfig(partName) {
    var fallback = config && config.default ? config.default : { questions: [], emergencyRules: [] };
    var partConfig = config && config.parts ? config.parts[partName] : null;

    return {
      intro: (partConfig && partConfig.intro) || fallback.intro || '',
      questions: (partConfig && partConfig.questions) || fallback.questions || [],
      emergencyRules: (partConfig && partConfig.emergencyRules) || fallback.emergencyRules || []
    };
  }

  function normalize(value) {
    return String(value || '').toLowerCase();
  }

  function selectedOptions(question, answer) {
    var values = Array.isArray(answer) ? answer : [answer];
    return question.options.filter(function (option) {
      return values.indexOf(option.label) !== -1 || values.indexOf(option.value) !== -1;
    });
  }

  function addKeywordScores(scores, symptoms, keywords, weight) {
    if (!keywords) return;

    symptoms.forEach(function (sym) {
      var haystack = normalize(sym.name + ' ' + (sym.causes || []).join(' '));
      keywords.forEach(function (keyword) {
        if (haystack.indexOf(normalize(keyword)) !== -1) {
          scores[sym.name] = (scores[sym.name] || 0) + (weight || 1);
        }
      });
    });
  }

  function addSeverityScores(scores, symptoms, selectedSeverity) {
    if (!selectedSeverity) return;

    symptoms.forEach(function (sym) {
      var seriousness = normalize(sym.seriousness);
      if (selectedSeverity === 'severe' && seriousness === 'serious') scores[sym.name] = (scores[sym.name] || 0) + 2;
      if (selectedSeverity === 'moderate' && seriousness === 'moderate') scores[sym.name] = (scores[sym.name] || 0) + 1.5;
      if (selectedSeverity === 'mild' && seriousness === 'mild') scores[sym.name] = (scores[sym.name] || 0) + 1.5;
    });
  }

  function collectFlags(flags, option) {
    if (!option.flags) return;
    option.flags.forEach(function (flag) {
      if (flags.indexOf(flag) === -1) flags.push(flag);
    });
  }

  function findEmergencyWarnings(rules, flags) {
    return rules.filter(function (rule) {
      return rule.flags.every(function (flag) {
        return flags.indexOf(flag) !== -1;
      });
    }).map(function (rule) {
      return rule.message;
    });
  }

  function fallbackScores(scores, symptoms) {
    symptoms.forEach(function (sym, index) {
      if (!scores[sym.name]) scores[sym.name] = Math.max(1, symptoms.length - index);
    });
  }

  function analyze(partName, answers, partData) {
    var partConfig = getPartConfig(partName);
    var symptoms = partData ? partData.symptoms : [];
    var scores = {};
    var flags = [];

    // Score selected answers against configured condition names and symptom keywords.
    partConfig.questions.forEach(function (question) {
      var answer = answers[question.id];
      if (!answer || (Array.isArray(answer) && answer.length === 0)) return;

      selectedOptions(question, answer).forEach(function (option) {
        collectFlags(flags, option);

        if (option.scores) {
          Object.keys(option.scores).forEach(function (name) {
            scores[name] = (scores[name] || 0) + option.scores[name];
          });
        }

        addKeywordScores(scores, symptoms, option.keywords, option.weight);

        if (question.type === 'severity') {
          addSeverityScores(scores, symptoms, option.value);
        }
      });
    });

    fallbackScores(scores, symptoms);

    var topScore = Math.max.apply(null, Object.keys(scores).map(function (name) { return scores[name]; }));
    var ranked = symptoms.map(function (sym) {
      var raw = scores[sym.name] || 0;
      var confidence = topScore > 0 ? Math.round((raw / topScore) * 92) : 0;

      return {
        symptom: sym,
        score: raw,
        confidence: Math.max(confidence, raw > 0 ? 18 : 0)
      };
    }).sort(function (a, b) {
      return b.confidence - a.confidence;
    });

    return {
      partName: partName,
      answers: answers,
      ranked: ranked,
      emergencyWarnings: findEmergencyWarnings(partConfig.emergencyRules, flags)
    };
  }

  return {
    load: load,
    onReady: onReady,
    getPartConfig: getPartConfig,
    analyze: analyze
  };
})();

QuestionnaireEngine.load();
