/* ============================================
   HOSPITAL DETAILS - Selected hospital profile
   ============================================ */

(function () {
  'use strict';

  var card = document.getElementById('hospitalDetailCard');
  var back = document.getElementById('hospitalDetailBack');

  function readSelection() {
    try {
      return JSON.parse(sessionStorage.getItem('bodycheck-selected-hospital') || 'null');
    } catch (e) {
      return null;
    }
  }

  function escapeHTML(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /* Open Google Maps directly while the list page still uses Leaflet/OpenStreetMap for display. */
  function googleMapsURL(hospital) {
    return 'https://www.google.com/maps/dir/?api=1&destination=' + hospital.lat + ',' + hospital.lon;
  }

  function websiteURL(value) {
    if (!value) return '';
    return /^https?:\/\//i.test(value) ? value : 'https://' + value;
  }

  /* Render only real OSM fields so incomplete map data never creates repetitive empty rows. */
  function detailRow(label, value, href) {
    if (!value) return '';
    var safeValue = escapeHTML(value);
    var output = href ? '<a href="' + escapeHTML(href) + '" target="_blank" rel="noopener">' + safeValue + '</a>' : '<strong>' + safeValue + '</strong>';
    return '<div class="hospital-detail-row"><span>' + label + '</span>' + output + '</div>';
  }

  function copyText(value) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(value);
    }

    var textArea = document.createElement('textarea');
    textArea.value = value;
    textArea.setAttribute('readonly', '');
    textArea.style.position = 'fixed';
    textArea.style.opacity = '0';
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    textArea.remove();
    return Promise.resolve();
  }

  /* Prefer native mobile sharing, then fall back to copying a Google Maps link. */
  function shareHospital(hospital) {
    var url = googleMapsURL(hospital);
    if (navigator.share) {
      return navigator.share({
        title: hospital.name,
        text: hospital.name + ' - ' + hospital.lat + ', ' + hospital.lon,
        url: url
      });
    }

    return copyText(url).then(function () {
      alert('Google Maps link copied.');
    });
  }

  function render() {
    var selected = readSelection();
    if (!selected || !selected.hospital) {
      card.innerHTML = '<div class="hospital-empty-state"><h1>No hospital selected</h1><p>Return to the hospital finder and choose a hospital to view details.</p><a class="btn btn-primary btn-sm" href="consultation.html#hospital-finder">Find Hospitals</a></div>';
      return;
    }

    var hospital = selected.hospital;
    var tags = hospital.tags || {};
    var website = websiteURL(hospital.website);
    back.href = 'consultation.html#hospital-finder';

    var coordinates = hospital.lat + ', ' + hospital.lon;
    var mapsUrl = googleMapsURL(hospital);

    var html = '<div class="hospital-detail-hero">';
    html += '<div class="hospital-detail-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 21h18M5 21V7l8-4 8 4v14M8 21v-2a2 2 0 0 1 4 0v2"/><path d="M10 11h6M13 8v6"/></svg></div>';
    html += '<div class="hospital-detail-title">';
    html += '<div class="hospital-card-kicker">' + escapeHTML(hospital.emergencyLabel || 'Hospital') + '</div>';
    html += '<h1>' + escapeHTML(hospital.name) + '</h1>';
    html += '<p>' + [hospital.distanceLabel ? hospital.distanceLabel + ' away' : '', hospital.address || ''].filter(Boolean).map(escapeHTML).join(' - ') + '</p>';
    html += '</div>';
    html += '</div>';

    html += '<div class="hospital-detail-actions">';
    html += '<a class="btn btn-primary btn-sm" target="_blank" rel="noopener" href="' + mapsUrl + '">Navigate</a>';
    html += '<a class="btn btn-secondary btn-sm" target="_blank" rel="noopener" href="' + mapsUrl + '">Open in Google Maps</a>';
    if (hospital.phone) html += '<a class="btn btn-secondary btn-sm" href="tel:' + escapeHTML(hospital.phone) + '">Call</a>';
    if (website) html += '<a class="btn btn-secondary btn-sm" target="_blank" rel="noopener" href="' + escapeHTML(website) + '">Website</a>';
    html += '<button class="btn btn-secondary btn-sm" id="copyCoordinatesBtn">Copy Coordinates</button>';
    html += '<button class="btn btn-secondary btn-sm" id="shareHospitalBtn">Share Hospital</button>';
    html += '</div>';

    html += '<section class="hospital-detail-section hospital-overview-section"><h2>Overview</h2>';
    html += '<div class="hospital-overview-grid">';
    if (hospital.distanceLabel) html += '<div><span>Distance</span><strong>' + escapeHTML(hospital.distanceLabel) + '</strong></div>';
    html += '<div><span>Type</span><strong>' + escapeHTML(hospital.emergencyLabel || 'Hospital') + '</strong></div>';
    if (hospital.operator) html += '<div><span>Operator</span><strong>' + escapeHTML(hospital.operator) + '</strong></div>';
    html += '</div>';
    html += '</section>';

    var contactRows = '';
    contactRows += detailRow('Phone', hospital.phone, hospital.phone ? 'tel:' + hospital.phone : '');
    contactRows += detailRow('Website', hospital.website, website);
    contactRows += detailRow('Operator', hospital.operator);
    if (contactRows) {
      html += '<section class="hospital-detail-section"><h2>Contact Information</h2>' + contactRows + '</section>';
    }

    html += '<section class="hospital-detail-section"><h2>Location</h2>';
    html += detailRow('Address', hospital.address);
    html += detailRow('Coordinates', coordinates);
    html += detailRow('Google Maps', 'Open directions', mapsUrl);
    html += '</section>';

    html += '<section class="hospital-detail-section"><h2>Care Notes</h2>';
    html += '<ul class="detail-list">';
    html += '<li>Call ahead when possible to confirm availability and wait times.</li>';
    html += '<li>For severe or life-threatening symptoms, contact local emergency services immediately.</li>';
    html += '<li>Bring identification, insurance information, and a list of current medications.</li>';
    if (selected.selectedSymptom) {
      html += '<li>This hospital was selected while searching for ' + escapeHTML(selected.selectedSymptom) + ' care.</li>';
    }
    html += '</ul></section>';

    if (Object.keys(tags).length) {
      html += '<section class="hospital-detail-section"><h2>Map Data</h2>';
      html += '<p class="detail-text">Details are based on the current OpenStreetMap record for this facility.</p>';
      html += '</section>';
    }

    card.innerHTML = html;

    document.getElementById('copyCoordinatesBtn').addEventListener('click', function () {
      var btn = this;
      copyText(coordinates).then(function () {
        btn.textContent = 'Copied';
        setTimeout(function () { btn.textContent = 'Copy Coordinates'; }, 1200);
      });
    });

    document.getElementById('shareHospitalBtn').addEventListener('click', function () {
      shareHospital(hospital);
    });
  }

  render();
})();
