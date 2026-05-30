/* ============================================
   CONSULTATION PAGE — Interactive functionality
   ============================================ */

(function () {
  'use strict';

  /* ---- Hospital Search ---- */
  var hospitalLocationInput = document.getElementById('hospitalLocationInput');
  var searchHospitalsBtn = document.getElementById('searchHospitalsBtn');
  var useMyLocationBtn = document.getElementById('useMyLocationBtn');
  var symptomTypeSelect = document.getElementById('symptomType');
  var hospitalMap = document.getElementById('hospitalMap');
  var hospitalList = document.getElementById('hospitalList');
  var hospitalLoading = document.getElementById('hospitalLoading');
  var hospitalPlaceholder = document.getElementById('hospitalPlaceholder');
  var hospitalBottomSheet = document.getElementById('hospitalBottomSheet');
  var hospitalSheetContent = document.getElementById('hospitalSheetContent');
  var map = null;
  var markers = [];
  var currentHospitals = [];
  var currentUserLocation = null;
  var userLocationMarker = null;
  var selectedSymptom = null;
  var selectedBodyPart = null;

  /* Get URL parameters for symptom-based recommendations */
  function getURLParameter(name) {
    var urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(name);
  }

  /* Map body parts to hospital specialties */
  function mapBodyPartToSpecialty(bodyPart) {
    var specialtyMap = {
      'Head': 'neurology',
      'Eyes': 'ophthalmology',
      'Ears': 'otolaryngology',
      'Nose': 'otolaryngology',
      'Mouth': 'dentistry',
      'Neck': 'orthopedics',
      'Shoulder': 'orthopedics',
      'Chest': 'cardiology',
      'Abdomen': 'gastroenterology',
      'Back': 'orthopedics',
      'Arm': 'orthopedics',
      'Elbow': 'orthopedics',
      'Wrist': 'orthopedics',
      'Hand': 'orthopedics',
      'Fingers': 'orthopedics',
      'Hip': 'orthopedics',
      'Thigh': 'orthopedics',
      'Knee': 'orthopedics',
      'Leg': 'orthopedics',
      'Ankle': 'orthopedics',
      'Foot': 'orthopedics'
    };
    return specialtyMap[bodyPart] || 'general';
  }

  /* Initialize with URL parameters if present */
  function initializeFromURL() {
    selectedSymptom = getURLParameter('symptom');
    selectedBodyPart = getURLParameter('bodyPart');

    if (selectedSymptom && selectedBodyPart) {
      // Update symptom filter based on body part
      var specialty = mapBodyPartToSpecialty(selectedBodyPart);
      if (symptomTypeSelect) {
        symptomTypeSelect.value = specialty;
      }

      // Show notification about symptom-based search
      var notification = document.createElement('div');
      notification.style.cssText = 'position: fixed; top: 80px; left: 50%; transform: translateX(-50%); z-index: 1000; padding: 12px 20px; border-radius: 12px; display: flex; align-items: center; gap: 10px; background: var(--bg-card); border: 1px solid var(--border); box-shadow: var(--shadow-card-hover); font-size: 0.875rem; color: var(--text-primary); opacity: 0; transition: opacity 0.3s ease;';
      notification.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:20px;height:20px;color:var(--accent);flex-shrink:0"><path d="M3 21h18M5 21V7l8-4 8 4v14M8 21v-2a2 2 0 0 1 4 0v2"/></svg><span>Searching hospitals for <strong>' + selectedSymptom + '</strong> (' + selectedBodyPart + ')</span>';
      document.body.appendChild(notification);
      requestAnimationFrame(function () { notification.style.opacity = '1'; });

      setTimeout(function () {
        notification.style.opacity = '0';
        setTimeout(function () { notification.remove(); }, 300);
      }, 5000);

      // Scroll to hospital finder
      var hospitalFinder = document.getElementById('hospital-finder');
      if (hospitalFinder) {
        setTimeout(function () {
          hospitalFinder.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
      }
    }
  }

  /* Initialize Leaflet Map */
  function initMap() {
    if (typeof L !== 'undefined') {
      // Initialize map centered on a default location
      map = L.map('hospitalMap').setView([40.7128, -74.0060], 13);

      // Add light theme tile layer
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19
      }).addTo(map);

      // Add zoom control
      L.control.zoom({
        position: 'topright'
      }).addTo(map);
    }
  }

  /* Geocode location using Nominatim (OpenStreetMap) */
  function geocodeLocation(location) {
    return fetch('https://nominatim.openstreetmap.org/search?format=json&q=' + encodeURIComponent(location) + '&limit=1')
      .then(function (response) {
        return response.json();
      })
      .then(function (data) {
        if (data && data.length > 0) {
          return {
            lat: parseFloat(data[0].lat),
            lng: parseFloat(data[0].lon),
            display_name: data[0].display_name
          };
        }
        return null;
      });
  }

  /* Search hospitals using Overpass API */
  function searchNearbyHospitals(lat, lng) {
    var radius = 10000; // 10km radius
    var query = `
      [out:json][timeout:25];
      (
        node["amenity"="hospital"](around:${radius},${lat},${lng});
        way["amenity"="hospital"](around:${radius},${lat},${lng});
        relation["amenity"="hospital"](around:${radius},${lat},${lng});
      );
      out body center;
      >;
      out skel qt;
    `;

    return fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      body: 'data=' + encodeURIComponent(query) + '&out=json'
    })
      .then(function (response) {
        return response.json();
      })
      .then(function (data) {
        return data.elements.map(function (element) {
          var lat = element.lat || (element.center && element.center.lat);
          var lon = element.lon || (element.center && element.center.lon);
          var name = element.tags && element.tags.name || 'Hospital';
          return {
            lat: lat,
            lon: lon,
            name: name,
            tags: element.tags || {}
          };
        });
      });
  }

  /* Calculate distance between two points (Haversine formula) */
  function calculateDistance(lat1, lon1, lat2, lon2) {
    var R = 3959; // Earth's radius in miles
    var dLat = (lat2 - lat1) * Math.PI / 180;
    var dLon = (lon2 - lon1) * Math.PI / 180;
    var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  function escapeHTML(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function buildAddress(tags) {
    var parts = [];
    ['addr:housenumber', 'addr:street', 'addr:city', 'addr:state', 'addr:postcode'].forEach(function (key) {
      if (tags && tags[key]) parts.push(tags[key]);
    });
    return parts.join(', ');
  }

  function getPhone(tags) {
    return tags.phone || tags['contact:phone'] || tags.telephone || '';
  }

  function getWebsite(tags) {
    return tags.website || tags['contact:website'] || '';
  }

  function websiteURL(value) {
    if (!value) return '';
    return /^https?:\/\//i.test(value) ? value : 'https://' + value;
  }

  function getEmergencyLabel(tags) {
    if (tags.emergency === 'yes' || tags.emergency_service === 'yes') return 'Emergency care';
    if (tags.emergency === 'no') return 'Emergency status unknown';
    return 'Hospital';
  }

  /* Build Google Maps direction links while keeping Leaflet/OpenStreetMap as the map display provider. */
  function googleMapsURL(hospital) {
    return 'https://www.google.com/maps/dir/?api=1&destination=' + hospital.lat + ',' + hospital.lon;
  }

  /* Copy coordinates with a textarea fallback for older mobile browsers. */
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

  /* Share hospital details when the Web Share API is available, otherwise copy the Maps URL. */
  function shareHospital(hospital) {
    var url = googleMapsURL(hospital);
    var text = hospital.name + ' - ' + hospital.lat + ', ' + hospital.lon;

    if (navigator.share) {
      return navigator.share({
        title: hospital.name,
        text: text,
        url: url
      });
    }

    return copyText(url).then(function () {
      alert('Google Maps link copied.');
    });
  }

  function enrichHospital(hospital, index, userLocation) {
    var tags = hospital.tags || {};
    var distance = calculateDistance(userLocation.lat, userLocation.lng, hospital.lat, hospital.lon);
    return {
      id: 'hospital-' + index,
      index: index,
      lat: hospital.lat,
      lon: hospital.lon,
      name: hospital.name || 'Hospital',
      tags: tags,
      address: buildAddress(tags),
      phone: getPhone(tags),
      website: getWebsite(tags),
      emergencyLabel: getEmergencyLabel(tags),
      operator: tags.operator || '',
      distanceMiles: distance,
      distanceLabel: distance.toFixed(1) + ' mi'
    };
  }

  function saveSelectedHospital(hospital) {
    sessionStorage.setItem('bodycheck-selected-hospital', JSON.stringify({
      hospital: hospital,
      userLocation: currentUserLocation,
      selectedSymptom: selectedSymptom,
      selectedBodyPart: selectedBodyPart
    }));
  }

  function selectHospital(index, options) {
    options = options || {};
    var hospital = currentHospitals[index];
    if (!hospital) return;

    saveSelectedHospital(hospital);

    document.querySelectorAll('.hospital-card').forEach(function (card) {
      card.classList.toggle('active', Number(card.getAttribute('data-index')) === index);
    });

    markers.forEach(function (marker, markerIndex) {
      if (markerIndex === index) {
        marker.openPopup();
      } else {
        marker.closePopup();
      }
    });

    if (map && !options.skipPan) {
      map.setView([hospital.lat, hospital.lon], Math.max(map.getZoom(), 15));
    }

    renderBottomSheet(hospital);
  }

  function openHospitalDetails(index) {
    var hospital = currentHospitals[index];
    if (!hospital) return;
    saveSelectedHospital(hospital);
    window.location.href = 'hospital-details.html';
  }

  function renderBottomSheet(hospital) {
    if (!hospitalBottomSheet || !hospitalSheetContent) return;

    var html = '<div class="hospital-sheet-header">';
    html += '<div><div class="hospital-card-kicker">' + escapeHTML(hospital.emergencyLabel) + '</div>';
    html += '<h3>' + escapeHTML(hospital.name) + '</h3></div>';
    html += '<button class="hospital-sheet-close" id="hospitalSheetClose" aria-label="Close details">x</button>';
    html += '</div>';
    html += '<p class="hospital-card-meta">' + escapeHTML(hospital.distanceLabel) + ' away' + (hospital.address ? ' - ' + escapeHTML(hospital.address) : '') + '</p>';
    if (hospital.phone || hospital.website || hospital.operator) {
      html += '<div class="hospital-contact-row">';
      if (hospital.phone) html += '<a href="tel:' + escapeHTML(hospital.phone) + '">Call</a>';
      if (hospital.website) html += '<a href="' + escapeHTML(websiteURL(hospital.website)) + '" target="_blank" rel="noopener">Website</a>';
      if (hospital.operator) html += '<span>' + escapeHTML(hospital.operator) + '</span>';
      html += '</div>';
    }
    html += '<div class="hospital-card-actions">';
    html += '<a class="btn btn-primary btn-sm" target="_blank" rel="noopener" href="' + googleMapsURL(hospital) + '">Navigate</a>';
    html += '<button class="btn btn-secondary btn-sm hospital-share-btn" id="hospitalSheetShare">Share</button>';
    html += '<button class="btn btn-secondary btn-sm" id="hospitalSheetDetails">Details</button>';
    html += '</div>';

    hospitalSheetContent.innerHTML = html;
    hospitalBottomSheet.classList.add('open');

    document.getElementById('hospitalSheetClose').addEventListener('click', function () {
      hospitalBottomSheet.classList.remove('open');
    });
    document.getElementById('hospitalSheetDetails').addEventListener('click', function () {
      openHospitalDetails(hospital.index);
    });
    document.getElementById('hospitalSheetShare').addEventListener('click', function () {
      shareHospital(hospital);
    });
  }

  /* Search hospitals by location */
  function searchHospitals(location) {
    if (!location) return;

    // Show loading state
    hospitalLoading.style.display = 'flex';
    hospitalPlaceholder.style.display = 'none';
    hospitalList.innerHTML = '';
    hospitalList.appendChild(hospitalLoading);

    var cachedLocation = null;

    geocodeLocation(location)
      .then(function (locationData) {
        if (!locationData) {
          hospitalLoading.style.display = 'none';
          hospitalList.innerHTML = '<p style="text-align: center; color: var(--text-secondary);">Location not found. Please try again.</p>';
          return Promise.resolve(null);
        }

        cachedLocation = locationData;

        if (map) {
          map.setView([locationData.lat, locationData.lng], 13);
        }

        if (userLocationMarker && map) {
          map.removeLayer(userLocationMarker);
        }
        if (map) {
          userLocationMarker = L.marker([locationData.lat, locationData.lng], {
            icon: L.divIcon({
              className: 'custom-marker',
              html: '<div style="background: var(--accent); width: 14px; height: 14px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 8px rgba(16,185,129,0.4);"></div>',
              iconSize: [14, 14],
              iconAnchor: [7, 7]
            })
          }).addTo(map);
          userLocationMarker.bindPopup('Your Location').openPopup();
        }

        return searchNearbyHospitals(locationData.lat, locationData.lng);
      })
      .then(function (hospitals) {
        hospitalLoading.style.display = 'none';

        if (hospitals && hospitals.length > 0 && cachedLocation) {
          displayHospitals(hospitals, cachedLocation);
        } else if (hospitals !== null) {
          hospitalList.innerHTML = '<p style="text-align: center; color: var(--text-secondary);">No hospitals found in this area. Try a different location.</p>';
        }
      })
      .catch(function (error) {
        hospitalLoading.style.display = 'none';
        hospitalList.innerHTML = '<p style="text-align: center; color: var(--text-secondary);">Error searching for hospitals. Please try again.</p>';
        console.error('Error:', error);
      });
  }

  /* Display hospitals on map and list */
  function displayHospitals(hospitals, userLocation) {
    // Clear existing markers
    markers.forEach(function (marker) {
      map.removeLayer(marker);
    });
    markers = [];
    currentUserLocation = userLocation;
    if (hospitalBottomSheet) hospitalBottomSheet.classList.remove('open');

    // Filter by symptom type if selected
    var symptomFilter = symptomTypeSelect ? symptomTypeSelect.value : 'all';
    var filteredHospitals = hospitals;

    if (symptomFilter !== 'all') {
      // In a real implementation, you would filter based on hospital specialties
      // For now, we'll just show all hospitals
      filteredHospitals = hospitals;
    }

    // Create bounds for map
    var bounds = L.latLngBounds();

    currentHospitals = filteredHospitals
      .filter(function (hospital) { return hospital.lat && hospital.lon; })
      .map(function (hospital, index) {
        return enrichHospital(hospital, index, userLocation);
      })
      .sort(function (a, b) { return a.distanceMiles - b.distanceMiles; })
      .slice(0, 20);

    // Create hospital list HTML
    var listHTML = '<div class="hospital-results-header"><div><strong>' + currentHospitals.length + ' hospitals found</strong><span>Sorted by distance</span></div></div>';
    
    currentHospitals.forEach(function (hospital, index) {
      hospital.index = index;
      // Add marker to map
      var marker = L.marker([hospital.lat, hospital.lon], {
        icon: L.divIcon({
          className: 'hospital-map-marker',
          html: '<div class="hospital-marker-pin"><span>+</span></div>',
          iconSize: [34, 42],
          iconAnchor: [17, 38],
          popupAnchor: [0, -36]
        })
      }).addTo(map);
      
      // Add popup
      marker.bindPopup('<strong>' + escapeHTML(hospital.name) + '</strong><br><span>' + hospital.distanceLabel + ' away</span>');
      marker.on('click', function () {
        selectHospital(index, { skipPan: true });
      });
      markers.push(marker);
      bounds.extend([hospital.lat, hospital.lon]);

      listHTML += '<article class="hospital-card" data-index="' + index + '">';
      listHTML += '<button class="hospital-card-main" data-action="select" data-index="' + index + '">';
      listHTML += '<div class="hospital-card-top">';
      listHTML += '<div><div class="hospital-card-kicker">' + escapeHTML(hospital.emergencyLabel) + '</div>';
      listHTML += '<h4>' + escapeHTML(hospital.name) + '</h4></div>';
      listHTML += '<span class="hospital-distance">' + escapeHTML(hospital.distanceLabel) + '</span>';
      listHTML += '</div>';
      if (hospital.address) {
        listHTML += '<p class="hospital-card-meta">' + escapeHTML(hospital.address) + '</p>';
      }
      if (hospital.operator || hospital.phone || hospital.website) {
        listHTML += '<div class="hospital-contact-row">';
        if (hospital.operator) listHTML += '<span>Operator: ' + escapeHTML(hospital.operator) + '</span>';
        if (hospital.phone) listHTML += '<span>' + escapeHTML(hospital.phone) + '</span>';
        if (hospital.website) listHTML += '<span>Website</span>';
        listHTML += '</div>';
      }
      listHTML += '</button>';
      listHTML += '<div class="hospital-card-actions">';
      listHTML += '<a class="btn btn-primary btn-sm" target="_blank" rel="noopener" href="' + googleMapsURL(hospital) + '">Navigate</a>';
      listHTML += hospital.phone ? '<a class="btn btn-secondary btn-sm" href="tel:' + escapeHTML(hospital.phone) + '">Call</a>' : '';
      listHTML += '<button class="btn btn-secondary btn-sm hospital-copy-btn" data-index="' + index + '">Copy Coordinates</button>';
      listHTML += '<button class="btn btn-secondary btn-sm hospital-share-btn" data-index="' + index + '">Share</button>';
      listHTML += '<button class="btn btn-secondary btn-sm hospital-details-btn" data-index="' + index + '">Details</button>';
      listHTML += '</div>';
      listHTML += '</article>';
    });

    // Fit map to show all hospitals
    if (currentHospitals.length > 0) {
      map.fitBounds(bounds, { padding: [50, 50] });
    }

    // Update list
    hospitalList.innerHTML = listHTML;

    document.querySelectorAll('.hospital-card-main').forEach(function (btn) {
      btn.addEventListener('click', function () {
        selectHospital(Number(btn.getAttribute('data-index')));
      });
    });

    document.querySelectorAll('.hospital-details-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        openHospitalDetails(Number(btn.getAttribute('data-index')));
      });
    });

    document.querySelectorAll('.hospital-copy-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var hospital = currentHospitals[Number(btn.getAttribute('data-index'))];
        copyText(hospital.lat + ', ' + hospital.lon).then(function () {
          btn.textContent = 'Copied';
          setTimeout(function () { btn.textContent = 'Copy Coordinates'; }, 1200);
        });
      });
    });

    document.querySelectorAll('.hospital-share-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        shareHospital(currentHospitals[Number(btn.getAttribute('data-index'))]);
      });
    });

    // Add hover effects for markers
    document.querySelectorAll('.hospital-card').forEach(function (item, index) {
      item.addEventListener('mouseenter', function () {
        if (markers[index]) {
          markers[index].openPopup();
        }
      });
      item.addEventListener('mouseleave', function () {
        if (markers[index]) {
          markers[index].closePopup();
        }
      });
    });

    if (currentHospitals.length > 0) {
      selectHospital(0, { skipPan: true });
    }
  }

  /* Use user's current location */
  function useMyLocation() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        function (position) {
          var lat = position.coords.latitude;
          var lng = position.coords.longitude;
          
          // Reverse geocode to get address
          fetch('https://nominatim.openstreetmap.org/reverse?format=json&lat=' + lat + '&lon=' + lng)
            .then(function (response) {
              return response.json();
            })
            .then(function (data) {
              if (data && data.display_name) {
                hospitalLocationInput.value = data.display_name;
                searchHospitals(data.display_name);
              } else {
                // Use coordinates if reverse geocode fails
                hospitalLocationInput.value = lat + ', ' + lng;
                searchHospitals(lat + ', ' + lng);
              }
            });
        },
        function (error) {
          alert('Unable to retrieve your location. Please enter it manually.');
        }
      );
    } else {
      alert('Geolocation is not supported by your browser. Please enter your location manually.');
    }
  }

  /* Event Listeners */
  if (searchHospitalsBtn) {
    searchHospitalsBtn.addEventListener('click', function () {
      var location = hospitalLocationInput.value.trim();
      if (location) {
        searchHospitals(location);
      } else {
        alert('Please enter a location or zip code.');
      }
    });
  }

  if (useMyLocationBtn) {
    useMyLocationBtn.addEventListener('click', useMyLocation);
  }

  if (hospitalLocationInput) {
    hospitalLocationInput.addEventListener('keypress', function (e) {
      if (e.key === 'Enter') {
        searchHospitalsBtn.click();
      }
    });
  }

  if (symptomTypeSelect) {
    symptomTypeSelect.addEventListener('change', function () {
      if (hospitalLocationInput.value.trim()) {
        searchHospitals(hospitalLocationInput.value.trim());
      }
    });
  }

  /* Initialize map when Leaflet loads */
  if (typeof L !== 'undefined') {
    initMap();
  } else {
    // Wait for Leaflet to load
    window.addEventListener('load', function () {
      setTimeout(initMap, 500);
    });
  }

  /* Initialize URL parameters on page load */
  initializeFromURL();

  /* ---- Smooth Scroll for Anchor Links ---- */
  document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
    anchor.addEventListener('click', function (e) {
      var href = this.getAttribute('href');
      if (href === '#') return;
      e.preventDefault();
      var target = document.querySelector(href);
      if (target) {
        var offset = document.getElementById('navbar').offsetHeight;
        var top = target.getBoundingClientRect().top + window.scrollY - offset;
        window.scrollTo({ top: top, behavior: 'smooth' });
      }
    });
  });

})();
