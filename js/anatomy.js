/* ============================================
   ANATOMY NAVIGATOR — Interactive body map
   ============================================ */

(function () {
  'use strict';

  /* ---- DOM refs ---- */
  var bodyFront = document.getElementById('bodyFront');
  var bodyBack = document.getElementById('bodyBack');
  var viewFrontBtn = document.getElementById('viewFront');
  var viewBackBtn = document.getElementById('viewBack');
  var genderMaleBtn = document.getElementById('genderMale');
  var genderFemaleBtn = document.getElementById('genderFemale');
  var tooltip = document.getElementById('anatomyTooltip');
  var partsList = document.getElementById('partsList');
  var searchInput = document.getElementById('symptomSearch');
  var searchResults = document.getElementById('searchResults');
  var detailPanel = document.getElementById('detailPanel');
  var panelEmpty = document.getElementById('panelEmpty');
  var panelSkeleton = document.getElementById('panelSkeleton');
  var panelContent = document.getElementById('panelContent');
  var panelHeader = document.getElementById('panelHeader');
  var panelIcon = document.getElementById('panelIcon');
  var panelTitle = document.getElementById('panelTitle');
  var panelSymptomCount = document.getElementById('panelSymptomCount');
  var panelSymptoms = document.getElementById('panelSymptoms');
  var panelSymptomDetail = document.getElementById('panelSymptomDetail');
  var panelBackBtn = document.getElementById('panelBackBtn');
  var rippleContainer = document.getElementById('rippleContainer');
  var emergencyAlertPanel = document.getElementById('emergencyAlertPanel');
  var emergencyAlertClose = document.getElementById('emergencyAlertClose');

  var currentPart = null;
  var currentSymptom = null;
  var selectedEmergencySymptoms = [];

  /* ---- View Toggle ---- */
  function switchView(view) {
    if (view === 'front') {
      bodyFront.classList.add('active');
      bodyBack.classList.remove('active');
      viewFrontBtn.classList.add('active');
      viewBackBtn.classList.remove('active');
    } else {
      bodyBack.classList.add('active');
      bodyFront.classList.remove('active');
      viewBackBtn.classList.add('active');
      viewFrontBtn.classList.remove('active');
    }
  }

  viewFrontBtn.addEventListener('click', function () { switchView('front'); });
  viewBackBtn.addEventListener('click', function () { switchView('back'); });

  /* ---- Gender Toggle ---- */
  genderMaleBtn.addEventListener('click', function () {
    genderMaleBtn.classList.add('active');
    genderFemaleBtn.classList.remove('active');
  });
  genderFemaleBtn.addEventListener('click', function () {
    genderFemaleBtn.classList.add('active');
    genderMaleBtn.classList.remove('active');
  });

  /* ---- Tooltip ---- */
  function showTooltip(e, label, icon) {
    var wrapper = e.currentTarget.closest('.anatomy-body-wrapper') || e.currentTarget.closest('.anatomy-body-view');
    if (!wrapper) return;
    var rect = wrapper.getBoundingClientRect();
    var x = e.clientX - rect.left + 14;
    var y = e.clientY - rect.top - 10;
    tooltip.querySelector('.anatomy-tooltip-icon').textContent = icon || '';
    tooltip.querySelector('.anatomy-tooltip-label').textContent = label;
    tooltip.style.left = x + 'px';
    tooltip.style.top = y + 'px';
    tooltip.classList.add('visible');
  }

  function hideTooltip() {
    tooltip.classList.remove('visible');
  }

  /* ---- Body part hover & click ---- */
  function initBodyParts() {
    var allParts = document.querySelectorAll('.body-part');
    allParts.forEach(function (el) {
      el.addEventListener('mouseenter', function (e) {
        var partName = el.getAttribute('data-part');
        var partData = SymptomsEngine.getByPart(partName);
        showTooltip(e, partName, partData ? partData.icon : '');
      });
      el.addEventListener('mousemove', function (e) {
        var partName = el.getAttribute('data-part');
        var partData = SymptomsEngine.getByPart(partName);
        showTooltip(e, partName, partData ? partData.icon : '');
      });
      el.addEventListener('mouseleave', hideTooltip);
      el.addEventListener('click', function (e) {
        createRipple(e);
        selectBodyPart(el.getAttribute('data-part'));
      });
    });

    /* Pulse dots */
    var dots = document.querySelectorAll('.pulse-dot');
    dots.forEach(function (dot) {
      dot.addEventListener('click', function (e) {
        createRipple(e);
        selectBodyPart(dot.getAttribute('data-part'));
      });
    });
  }

  function highlightBodyParts(partName) {
    document.querySelectorAll('.body-part').forEach(function (el) {
      el.classList.remove('active');
      if (el.getAttribute('data-part') === partName) {
        el.classList.add('active');
      }
    });
    /* Highlight part chip */
    document.querySelectorAll('.part-chip').forEach(function (chip) {
      chip.classList.remove('active');
      if (chip.getAttribute('data-part') === partName) {
        chip.classList.add('active');
      }
    });
  }

  /* ---- Select body part → show symptoms ---- */
  function selectBodyPart(partName) {
    currentPart = partName;
    currentSymptom = null;
    highlightBodyParts(partName);

    /* Show loading skeleton briefly */
    panelEmpty.style.display = 'none';
    panelContent.style.display = 'none';
    panelSkeleton.classList.add('visible');

    setTimeout(function () {
      var partData = SymptomsEngine.getByPart(partName);
      panelSkeleton.classList.remove('visible');

      if (!partData) {
        panelEmpty.style.display = 'block';
        return;
      }

      /* Populate header */
      panelIcon.textContent = partData.icon;
      panelTitle.textContent = partData.bodyPart;
      panelSymptomCount.textContent = partData.symptoms.length + ' symptom' + (partData.symptoms.length !== 1 ? 's' : '') + ' found';
      panelBackBtn.style.display = 'none';
      panelSymptomDetail.style.display = 'none';
      panelSymptoms.style.display = 'block';

      /* Build symptom cards */
      var html = '';
      partData.symptoms.forEach(function (sym) {
        var cls = SymptomsEngine.severityClass(sym.seriousness);
        html += '<div class="symptom-card ' + cls + '" data-symptom="' + sym.name + '">';
        html += '  <div class="symptom-card-top">';
        html += '    <span class="symptom-card-name">' + sym.name;
        if (sym.emergency) {
          html += '    <span class="emergency-flag">⚠ Emergency</span>';
        }
        html += '    </span>';
        html += '    <svg class="symptom-card-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>';
        html += '  </div>';
        html += '  <div style="margin-bottom:6px">';
        html += '    <span class="severity-badge ' + cls + '"><span class="severity-dot ' + cls + ' pulse"></span> ' + sym.seriousness + '</span>';
        html += '  </div>';
        html += '  <div class="symptom-card-causes">' + sym.causes.slice(0, 3).join(' · ') + '</div>';
        html += '</div>';
      });

      panelSymptoms.innerHTML = html;
      panelContent.style.display = 'block';

      /* Animate cards in */
      var cards = panelSymptoms.querySelectorAll('.symptom-card');
      cards.forEach(function (card, i) {
        card.style.opacity = '0';
        card.style.transform = 'translateY(16px)';
        setTimeout(function () {
          card.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
          card.style.opacity = '1';
          card.style.transform = 'translateY(0)';
        }, i * 80);

        card.addEventListener('click', function (e) {
          createRipple(e);
          selectSymptom(partName, card.getAttribute('data-symptom'));
        });
      });

      /* Scroll panel into view on mobile */
      if (window.innerWidth <= 1024) {
        detailPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 400);
  }

  /* ---- Select symptom → show detail ---- */
  function selectSymptom(partName, symptomName) {
    var result = SymptomsEngine.getSymptom(partName, symptomName);
    if (!result) return;

    currentSymptom = symptomName;
    var sym = result.symptom;
    var cls = SymptomsEngine.severityClass(sym.seriousness);

    /* Check for emergency symptoms */
    checkEmergencySymptoms(symptomName);

    panelSymptoms.style.display = 'none';
    panelSymptomDetail.style.display = 'block';
    panelBackBtn.style.display = 'flex';

    var html = '';

    /* Emergency banner */
    if (sym.emergency) {
      html += '<div class="emergency-banner">';
      html += '  <div class="emergency-banner-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg></div>';
      html += '  <div class="emergency-banner-text">';
      html += '    <h4>Seek Medical Attention</h4>';
      html += '    <p>This symptom may require immediate professional evaluation. If symptoms are severe, call emergency services.</p>';
      html += '  </div>';
      html += '</div>';
    }

    /* Header */
    html += '<div class="symptom-detail-header">';
    html += '  <h3 class="symptom-detail-name">' + sym.name + '</h3>';
    html += '  <div class="symptom-detail-badges">';
    html += '    <span class="severity-badge ' + cls + '"><span class="severity-dot ' + cls + ' pulse"></span> ' + sym.seriousness + '</span>';
    if (sym.emergency) {
      html += '  <span class="severity-badge serious"><span class="severity-dot serious pulse"></span> Emergency</span>';
    }
    html += '  </div>';
    html += '</div>';

    /* Sections */
    html += buildSection('Possible Causes', '<path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/>', sym.causes, 'list');
    html += buildSection('Seriousness', '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/>', sym.seriousness, 'text-severity');
    html += buildSection('Remedies', '<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>', sym.remedies, 'list');
    html += buildSection('Exercises', '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>', sym.exercises, 'list');
    html += buildSection('Hydration', '<path d="M12 2v20M2 12h20"/>', sym.hydration, 'text');
    html += buildSection('Nutrition', '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>', sym.nutrition, 'list');
    html += buildSection('Prevention', '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/>', sym.prevention, 'list');

    /* Find Hospitals Button */
    html += '<div class="detail-section">';
    html += '<div class="detail-section-title"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18M5 21V7l8-4 8 4v14M8 21v-2a2 2 0 0 1 4 0v2"/></svg> Find Hospitals</div>';
    html += '<a href="consultation.html?symptom=' + encodeURIComponent(sym.name) + '&bodyPart=' + encodeURIComponent(partName) + '" class="btn btn-primary btn-sm" style="width: 100%; margin-top: 8px;">';
    html += '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>';
    html += ' Find Nearby Hospitals for ' + sym.name;
    html += '</a>';
    html += '</div>';

    panelSymptomDetail.innerHTML = html;

    /* Animate sections in */
    var sections = panelSymptomDetail.querySelectorAll('.detail-section, .emergency-banner, .symptom-detail-header');
    sections.forEach(function (sec, i) {
      sec.style.opacity = '0';
      sec.style.transform = 'translateY(12px)';
      setTimeout(function () {
        sec.style.transition = 'opacity 0.35s ease, transform 0.35s ease';
        sec.style.opacity = '1';
        sec.style.transform = 'translateY(0)';
      }, i * 60);
    });
  }

  function buildSection(title, svgPath, content, type) {
    if (!content || (Array.isArray(content) && content.length === 0)) return '';

    var html = '<div class="detail-section">';
    html += '<div class="detail-section-title"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + svgPath + '</svg> ' + title + '</div>';

    if (type === 'list') {
      html += '<ul class="detail-list">';
      content.forEach(function (item) {
        html += '<li>' + item + '</li>';
      });
      html += '</ul>';
    } else if (type === 'text') {
      html += '<p class="detail-text">' + content + '</p>';
    } else if (type === 'text-severity') {
      var cls = SymptomsEngine.severityClass(content);
      html += '<p class="detail-text"><span class="severity-badge ' + cls + '" style="font-size:0.85rem;padding:4px 14px"><span class="severity-dot ' + cls + ' pulse"></span> ' + content + '</span></p>';
    }

    html += '</div>';
    return html;
  }

  /* ---- Back button ---- */
  panelBackBtn.addEventListener('click', function () {
    if (currentPart) {
      selectBodyPart(currentPart);
    }
  });

  /* ---- Parts list (bottom chips) ---- */
  function buildPartsList() {
    SymptomsEngine.onReady(function () {
      var parts = SymptomsEngine.getAllParts();
      var html = '';
      parts.forEach(function (p) {
        html += '<div class="part-chip" data-part="' + p.bodyPart + '">';
        html += '<span class="part-chip-icon">' + p.icon + '</span> ' + p.bodyPart;
        html += '</div>';
      });
      partsList.innerHTML = html;

      partsList.querySelectorAll('.part-chip').forEach(function (chip) {
        chip.addEventListener('click', function (e) {
          createRipple(e);
          selectBodyPart(chip.getAttribute('data-part'));
        });
      });
    });
  }

  /* ---- Search ---- */
  var searchTimeout;
  searchInput.addEventListener('input', function () {
    clearTimeout(searchTimeout);
    var q = searchInput.value.trim();
    if (q.length < 2) {
      searchResults.classList.remove('open');
      searchResults.innerHTML = '';
      return;
    }
    searchTimeout = setTimeout(function () {
      var results = SymptomsEngine.search(q);
      if (results.length === 0) {
        searchResults.innerHTML = '<div class="search-result-item"><div class="search-result-info"><span class="search-result-name" style="color:var(--text-secondary)">No results found</span></div></div>';
        searchResults.classList.add('open');
        return;
      }

      var html = '';
      results.forEach(function (r) {
        html += '<div class="search-result-item" data-type="' + r.type + '" data-part="' + r.bodyPart + '" data-symptom="' + (r.text || '') + '">';
        html += '<span class="search-result-icon">' + r.icon + '</span>';
        html += '<div class="search-result-info">';
        html += '<div class="search-result-name">' + r.text + '</div>';
        if (r.type === 'symptom') {
          html += '<div class="search-result-part">' + r.bodyPart + '</div>';
        } else {
          html += '<div class="search-result-part">' + r.symptomCount + ' symptoms</div>';
        }
        html += '</div>';
        if (r.seriousness) {
          html += '<span class="search-result-severity ' + SymptomsEngine.severityClass(r.seriousness) + '">' + r.seriousness + '</span>';
        }
        html += '</div>';
      });
      searchResults.innerHTML = html;
      searchResults.classList.add('open');

      searchResults.querySelectorAll('.search-result-item').forEach(function (item) {
        item.addEventListener('click', function () {
          var type = item.getAttribute('data-type');
          var part = item.getAttribute('data-part');
          var sym = item.getAttribute('data-symptom');
          searchResults.classList.remove('open');
          searchInput.value = '';

          if (type === 'bodyPart') {
            selectBodyPart(part);
          } else {
            selectBodyPart(part);
            setTimeout(function () {
              selectSymptom(part, sym);
            }, 500);
          }
        });
      });
    }, 200);
  });

  /* Close search on outside click */
  document.addEventListener('click', function (e) {
    if (!e.target.closest('.anatomy-search')) {
      searchResults.classList.remove('open');
    }
  });

  /* ---- Ripple effect ---- */
  function createRipple(e) {
    var ripple = document.createElement('div');
    ripple.className = 'ripple';
    var size = 40;
    ripple.style.width = size + 'px';
    ripple.style.height = size + 'px';
    ripple.style.left = (e.clientX - size / 2) + 'px';
    ripple.style.top = (e.clientY - size / 2) + 'px';
    rippleContainer.appendChild(ripple);
    setTimeout(function () {
      ripple.remove();
    }, 600);
  }

  /* ---- Emergency Alert Logic ---- */
  function checkEmergencySymptoms(symptomName) {
    var result = SymptomsEngine.getSymptom(currentPart, symptomName);
    if (result && result.symptom.emergency) {
      selectedEmergencySymptoms.push(symptomName);
      showEmergencyAlert();
    }
  }

  function showEmergencyAlert() {
    if (selectedEmergencySymptoms.length > 0 && emergencyAlertPanel) {
      emergencyAlertPanel.style.display = 'block';
    }
  }

  function hideEmergencyAlert() {
    if (emergencyAlertPanel) {
      emergencyAlertPanel.style.display = 'none';
    }
  }

  if (emergencyAlertClose) {
    emergencyAlertClose.addEventListener('click', hideEmergencyAlert);
  }

  /* ---- Init ---- */
  SymptomsEngine.onReady(function () {
    initBodyParts();
    buildPartsList();
  });

})();
