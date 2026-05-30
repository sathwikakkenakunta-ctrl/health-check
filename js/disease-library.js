/* ============================================
   DISEASE LIBRARY — Search, filters, and details
   ============================================ */

(function () {
  'use strict';

  var dataUrl = 'data/diseases.json';
  var diseaseData = null;

  function getQueryParam(name) {
    var params = new URLSearchParams(window.location.search);
    return params.get(name);
  }

  function slugify(value) {
    return String(value || '').toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9\-]/g, '');
  }

  function loadDataWithXhr(callback) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', dataUrl, true);
    xhr.onreadystatechange = function () {
      if (xhr.readyState !== 4) return;
      if (xhr.status === 200 || xhr.status === 0) {
        try {
          diseaseData = JSON.parse(xhr.responseText);
          callback(diseaseData);
        } catch (error) {
          console.error(error);
          var status = document.getElementById('diseaseSearchStatus');
          if (status) {
            status.textContent = 'Unable to parse disease database. Please refresh the page.';
          }
        }
      } else {
        var status = document.getElementById('diseaseSearchStatus');
        console.error('XHR load failed', xhr.status);
        if (status) {
          status.textContent = 'Unable to load disease database. Please refresh the page.';
        }
      }
    };
    xhr.send();
  }

  function fetchData(callback) {
    if (diseaseData) {
      callback(diseaseData);
      return;
    }

    if (window.fetch) {
      fetch(dataUrl)
        .then(function (response) {
          if (!response.ok) throw new Error('Unable to load disease data');
          return response.json();
        })
        .then(function (data) {
          diseaseData = data;
          callback(diseaseData);
        })
        .catch(function (error) {
          console.warn('Fetch failed, falling back to XHR:', error);
          loadDataWithXhr(callback);
        });
    } else {
      loadDataWithXhr(callback);
    }
  }

  function getCategories(diseases) {
    var categories = diseases.reduce(function (list, disease) {
      if (disease.category && list.indexOf(disease.category) === -1) {
        list.push(disease.category);
      }
      return list;
    }, []);
    return categories.sort();
  }

  function matchesQuery(disease, query) {
    var normalized = String(query || '').toLowerCase();
    if (!normalized) return true;
    var haystack = [disease.name, disease.category, disease.overview]
      .concat(disease.symptoms, disease.causes, disease.riskFactors)
      .join(' ')
      .toLowerCase();
    return haystack.indexOf(normalized) !== -1;
  }

  function filterDiseases(diseases, query, category) {
    return diseases.filter(function (disease) {
      var categoryMatch = category === 'all' || !category || disease.category === category;
      return categoryMatch && matchesQuery(disease, query);
    });
  }

  function renderStatus(count, query) {
    var status = document.getElementById('diseaseSearchStatus');
    if (!status) return;
    if (!query) {
      status.textContent = count + ' diseases available.';
    } else {
      status.textContent = count + ' matching diseases for "' + query + '".';
    }
  }

  function createDiseaseCard(disease) {
    var url = 'disease-detail.html?id=' + encodeURIComponent(disease.id);
    return '<article class="disease-card">'
      + '<div>'
      + '<div class="disease-category">' + disease.category + '</div>'
      + '<h3>' + disease.name + '</h3>'
      + '<p>' + disease.overview + '</p>'
      + '</div>'
      + '<div class="disease-actions">'
      + '<a class="btn btn-primary btn-sm" href="' + url + '">View details</a>'
      + '</div>'
      + '</article>';
  }

  function renderCategorySelect(categories, selectedCategory) {
    var container = document.getElementById('diseaseFilters');
    var select = document.getElementById('diseaseCategorySelect');
    if (!container || !select) return;
    var html = '<option value="all">All categories</option>';
    categories.forEach(function (category) {
      html += '<option value="' + category + '"' + (category === selectedCategory ? ' selected' : '') + '>' + category + '</option>';
    });
    select.innerHTML = html;
    select.value = selectedCategory || 'all';
    select.onchange = function () {
      updateLibrary(this.value);
    };
  }

  function renderLibraryPage(diseases, category) {
    var list = document.getElementById('diseaseList');
    var searchInput = document.getElementById('diseaseSearchInput');
    if (!list || !searchInput) return;

    var query = searchInput.value.trim();
    var filtered = filterDiseases(diseases, query, category);
    renderStatus(filtered.length, query);
    renderCategorySelect(getCategories(diseases), category || 'all');

    if (!filtered.length) {
      list.innerHTML = '<div class="disease-empty-state"><p>No diseases match your search. Try a different keyword or category.</p></div>';
      return;
    }

    list.innerHTML = filtered.map(createDiseaseCard).join('');
  }

  function updateLibrary(category) {
    var searchInput = document.getElementById('diseaseSearchInput');
    var currentCategory = category || getCurrentCategory();
    renderLibraryPage(diseaseData, currentCategory);
    updateActiveFilter(currentCategory);
  }

  function getCurrentCategory() {
    var select = document.getElementById('diseaseCategorySelect');
    return select ? select.value : 'all';
  }

  function updateActiveFilter(category) {
    var select = document.getElementById('diseaseCategorySelect');
    if (select) {
      select.value = category || 'all';
    }
  }

  function initLibrary() {
    var searchInput = document.getElementById('diseaseSearchInput');
    if (!searchInput) return;

    fetchData(function (diseases) {
      renderLibraryPage(diseases, 'all');
      searchInput.addEventListener('input', function () {
        updateLibrary(getCurrentCategory());
      });
    });
  }

  function getSeverityLabel(category, emergencySigns) {
    if (emergencySigns && emergencySigns.length >= 3) {
      return 'High severity';
    }
    var moderateCategories = ['Cardiovascular', 'Neurological', 'Infectious', 'Cancer', 'Chronic'];
    if (moderateCategories.indexOf(category) !== -1) {
      return 'Moderate severity';
    }
    return 'General reference';
  }

  function buildDetailSection(title, items, extraClass) {
    if (!items || !items.length) {
      return '<section class="disease-detail-panel' + (extraClass ? ' ' + extraClass : '') + '"><h2>' + title + '</h2><p class="detail-text">Information is unavailable.</p></section>';
    }

    return '<section class="disease-detail-panel' + (extraClass ? ' ' + extraClass : '') + '">'
      + '<h2>' + title + '</h2>'
      + '<ul>' + items.map(function (item) {
        return '<li>' + item + '</li>';
      }).join('') + '</ul>'
      + '</section>';
  }

  function renderDetailPage(disease) {
    var container = document.getElementById('diseaseDetailContent');
    if (!container) return;

    if (!disease) {
      container.innerHTML = '<div class="disease-empty-state"><h2>Disease not found</h2><p>The disease you selected could not be loaded. Please return to the library and try again.</p><a class="btn btn-primary" href="disease-library.html">Return to Disease Library</a></div>';
      return;
    }

    document.title = disease.name + ' — Disease Library';
    var severityLabel = getSeverityLabel(disease.category, disease.emergencySigns);

    var html = '<div class="section-header">'
      + '<p class="disease-search-status">Disease details and care guide</p>'
      + '<h1>' + disease.name + '</h1>'
      + '</div>';

    html += '<div class="disease-detail-summary">'
      + '<section class="disease-summary-card">'
      + '<div class="summary-headline">'
      + '<span class="category-pill">' + disease.category + '</span>'
      + '<span class="severity-pill">' + severityLabel + '</span>'
      + '</div>'
      + '<p class="summary-copy">' + disease.overview + '</p>'
      + '</section>'
      + '</div>';

    html += '<div class="disease-detail-grid">'
      + buildDetailSection('Common Symptoms', disease.symptoms)
      + buildDetailSection('Causes', disease.causes)
      + buildDetailSection('Risk Factors', disease.riskFactors)
      + buildDetailSection('Prevention Tips', disease.prevention)
      + buildDetailSection('Home Care Guidance', disease.homeCare)
      + buildDetailSection('When To See A Doctor', disease.whenToSeeDoctor)
      + '</div>';

    html += buildDetailSection('Emergency Warning Signs', disease.emergencySigns, 'emergency-section');

    html += '<div class="important-note info">'
      + '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>'
      + '<div class="important-note-content">'
      + '<strong>Medical Disclaimer</strong>'
      + '<p>BodyWise provides educational health information only and does not diagnose, treat, or replace professional medical advice. Consult a qualified healthcare professional for medical concerns.</p>'
      + '</div></div>';

    container.innerHTML = html;
  }

  function initDetail() {
    var detailContainer = document.getElementById('diseaseDetailContent');
    if (!detailContainer) return;

    var diseaseId = getQueryParam('id');
    fetchData(function (diseases) {
      var disease = diseases.find(function (item) {
        return item.id === diseaseId;
      });
      renderDetailPage(disease);
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    initLibrary();
    initDetail();
  });
})();
