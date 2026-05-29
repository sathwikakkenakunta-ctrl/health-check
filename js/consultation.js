/* ============================================
   CONSULTATION PAGE — Interactive functionality
   ============================================ */

(function () {
  'use strict';

  /* ---- DOM References ---- */
  var filterBtns = document.querySelectorAll('.filter-btn');
  var doctorCards = document.querySelectorAll('.doctor-card');
  var bookConsultationBtns = document.querySelectorAll('.book-consultation');

  /* ---- Filter Functionality ---- */
  filterBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      var filter = this.getAttribute('data-filter');
      
      /* Update active state */
      filterBtns.forEach(function (b) {
        b.classList.remove('active');
      });
      this.classList.add('active');

      /* Filter doctor cards */
      doctorCards.forEach(function (card) {
        var specialty = card.getAttribute('data-specialty');
        
        if (filter === 'all' || specialty === filter) {
          card.style.display = '';
          card.style.opacity = '0';
          card.style.transform = 'translateY(8px)';
          requestAnimationFrame(function () {
            card.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
          });
        } else {
          card.style.display = 'none';
        }
      });
    });
  });

  /* ---- Book Consultation Button ---- */
  bookConsultationBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      var card = this.closest('.doctor-card');
      var doctorName = card.querySelector('.doctor-name').textContent;
      var specialty = card.querySelector('.doctor-specialty').textContent;
      
      alert('Booking consultation with ' + doctorName + ' (' + specialty + ').\n\nThis would open a booking modal in the full implementation.');
    });
  });

  /* ---- Hospital Search ---- */
  var hospitalLocationInput = document.getElementById('hospitalLocationInput');
  var searchHospitalsBtn = document.getElementById('searchHospitalsBtn');
  var useMyLocationBtn = document.getElementById('useMyLocationBtn');
  var symptomTypeSelect = document.getElementById('symptomType');
  var hospitalMap = document.getElementById('hospitalMap');
  var hospitalList = document.getElementById('hospitalList');
  var hospitalLoading = document.getElementById('hospitalLoading');
  var hospitalPlaceholder = document.getElementById('hospitalPlaceholder');
  var map = null;
  var markers = [];
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

    // Create hospital list HTML
    var listHTML = '';
    
    filteredHospitals.forEach(function (hospital, index) {
      // Add marker to map
      var marker = L.marker([hospital.lat, hospital.lon], {
        icon: L.divIcon({
          className: 'custom-marker',
          html: '<div style="background: #EF4444; width: 16px; height: 16px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 8px rgba(239,68,68,0.3);"></div>',
          iconSize: [20, 20],
          iconAnchor: [10, 10]
        })
      }).addTo(map);
      
      // Add popup
      marker.bindPopup('<strong>' + hospital.name + '</strong>');
      markers.push(marker);
      bounds.extend([hospital.lat, hospital.lon]);

      // Calculate distance
      var distance = calculateDistance(userLocation.lat, userLocation.lng, hospital.lat, hospital.lon);
      var distanceMiles = distance.toFixed(1);

      listHTML += '<div class="hospital-item" data-index="' + index + '">';
      listHTML += '<div class="hospital-info">';
      listHTML += '<h4>' + hospital.name + '</h4>';
      listHTML += '<p>' + distanceMiles + ' miles away</p>';
      listHTML += '</div>';
      listHTML += '<button class="btn btn-secondary btn-sm get-directions-btn" data-lat="' + hospital.lat + '" data-lng="' + hospital.lon + '">Directions</button>';
      listHTML += '</div>';
    });

    // Fit map to show all hospitals
    map.fitBounds(bounds, { padding: [50, 50] });

    // Update list
    hospitalList.innerHTML = listHTML;

    // Add click handlers for directions
    document.querySelectorAll('.get-directions-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var lat = this.getAttribute('data-lat');
        var lng = this.getAttribute('data-lng');
        // Open in OpenStreetMap routing
        window.open('https://www.openstreetmap.org/directions?from=' + userLocation.lat + ',' + userLocation.lng + '&to=' + lat + ',' + lng, '_blank');
      });
    });

    // Add hover effects for markers
    document.querySelectorAll('.hospital-item').forEach(function (item, index) {
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
