/* ============================================
   SYMPTOMS ENGINE — Data loading, search, filter
   ============================================ */

var SymptomsEngine = (function () {
  'use strict';

  var data = [];
  var loaded = false;
  var listeners = [];

  /* Load the symptom database */
  function load(callback) {
    if (loaded) {
      if (callback) callback(data);
      return;
    }

    var xhr = new XMLHttpRequest();
    xhr.open('GET', 'data/symptoms.json', true);
    xhr.onreadystatechange = function () {
      if (xhr.readyState === 4) {
        if (xhr.status === 200 || xhr.status === 0) {
          try {
            data = JSON.parse(xhr.responseText);
            loaded = true;
            listeners.forEach(function (fn) { fn(data); });
            listeners = [];
            if (callback) callback(data);
          } catch (e) {
            console.error('Failed to parse symptoms data:', e);
          }
        }
      }
    };
    xhr.send();
  }

  /* Wait for data */
  function onReady(fn) {
    if (loaded) {
      fn(data);
    } else {
      listeners.push(fn);
    }
  }

  /* Get all body parts */
  function getAllParts() {
    return data.map(function (d) {
      return { bodyPart: d.bodyPart, icon: d.icon, region: d.region, symptomCount: d.symptoms.length };
    });
  }

  /* Get data for a specific body part */
  function getByPart(partName) {
    for (var i = 0; i < data.length; i++) {
      if (data[i].bodyPart.toLowerCase() === partName.toLowerCase()) {
        return data[i];
      }
    }
    return null;
  }

  /* Get a specific symptom */
  function getSymptom(partName, symptomName) {
    var part = getByPart(partName);
    if (!part) return null;
    for (var j = 0; j < part.symptoms.length; j++) {
      if (part.symptoms[j].name.toLowerCase() === symptomName.toLowerCase()) {
        return { bodyPart: part.bodyPart, icon: part.icon, symptom: part.symptoms[j] };
      }
    }
    return null;
  }

  /* Search across all symptoms */
  function search(query) {
    if (!query || query.length < 2) return [];
    var q = query.toLowerCase();
    var results = [];

    data.forEach(function (part) {
      /* Match body part name */
      if (part.bodyPart.toLowerCase().indexOf(q) !== -1) {
        results.push({
          type: 'bodyPart',
          bodyPart: part.bodyPart,
          icon: part.icon,
          text: part.bodyPart,
          symptomCount: part.symptoms.length
        });
      }

      /* Match symptoms */
      part.symptoms.forEach(function (sym) {
        var matched = false;
        if (sym.name.toLowerCase().indexOf(q) !== -1) matched = true;
        if (!matched) {
          sym.causes.forEach(function (c) {
            if (c.toLowerCase().indexOf(q) !== -1) matched = true;
          });
        }
        if (!matched) {
          sym.remedies.forEach(function (r) {
            if (r.toLowerCase().indexOf(q) !== -1) matched = true;
          });
        }
        if (matched) {
          results.push({
            type: 'symptom',
            bodyPart: part.bodyPart,
            icon: part.icon,
            text: sym.name,
            seriousness: sym.seriousness,
            emergency: sym.emergency
          });
        }
      });
    });

    return results.slice(0, 15);
  }

  /* Severity color mapping */
  function severityClass(level) {
    if (!level) return 'mild';
    switch (level.toLowerCase()) {
      case 'serious': return 'serious';
      case 'moderate': return 'moderate';
      default: return 'mild';
    }
  }

  function severityColor(level) {
    switch (severityClass(level)) {
      case 'serious': return '#FF5C7A';
      case 'moderate': return '#FFC832';
      default: return '#00FFC6';
    }
  }

  return {
    load: load,
    onReady: onReady,
    getAllParts: getAllParts,
    getByPart: getByPart,
    getSymptom: getSymptom,
    search: search,
    severityClass: severityClass,
    severityColor: severityColor
  };
})();

/* Auto-load on include */
SymptomsEngine.load();
