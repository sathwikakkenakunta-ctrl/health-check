/* ============================================
   BodyWise — Core Application Logic
   ============================================ */

(function () {
  'use strict';

  /* ---- DOM References ---- */
  const navbar = document.getElementById('navbar');
  const navLinks = document.getElementById('navLinks');
  const navHamburger = document.getElementById('navHamburger');
  const navOverlay = document.getElementById('navOverlay');
  const navLinkItems = document.querySelectorAll('.nav-link');
  const bodyRegions = document.querySelectorAll('.body-region');
  const bodyPulses = document.querySelectorAll('.body-pulse');

  /* ============================================
     NAVBAR — Scroll Effect
     ============================================ */
  let lastScroll = 0;

  function handleNavbarScroll() {
    if (!navbar) return;
    const scrollY = window.scrollY;

    if (scrollY > 50) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }

    lastScroll = scrollY;
  }

  window.addEventListener('scroll', handleNavbarScroll, { passive: true });

  /* ============================================
     NAVBAR — Mobile Menu
     ============================================ */
  function toggleMobileMenu() {
    if (!navLinks || !navHamburger) return;
    const isOpen = navLinks.classList.contains('open');

    navLinks.classList.toggle('open');
    navHamburger.classList.toggle('active');
    if (navOverlay) navOverlay.classList.toggle('active');

    document.body.style.overflow = isOpen ? '' : 'hidden';
  }

  function closeMobileMenu() {
    if (navLinks) navLinks.classList.remove('open');
    if (navHamburger) navHamburger.classList.remove('active');
    if (navOverlay) navOverlay.classList.remove('active');
    document.body.style.overflow = '';
  }

  if (navHamburger) navHamburger.addEventListener('click', toggleMobileMenu);
  if (navOverlay) navOverlay.addEventListener('click', closeMobileMenu);

  navLinkItems.forEach(function (link) {
    link.addEventListener('click', closeMobileMenu);
  });

  /* ============================================
     NAVBAR — Active Link Highlight
     ============================================ */
  const sections = document.querySelectorAll('section[id]');

  function highlightActiveNav() {
    const scrollY = window.scrollY + 150;

    sections.forEach(function (section) {
      const top = section.offsetTop;
      const height = section.offsetHeight;
      const id = section.getAttribute('id');

      if (scrollY >= top && scrollY < top + height) {
        navLinkItems.forEach(function (link) {
          link.classList.remove('active');
          if (link.getAttribute('href') === '#' + id) {
            link.classList.add('active');
          }
        });
      }
    });
  }

  window.addEventListener('scroll', highlightActiveNav, { passive: true });

  /* ============================================
     SMOOTH SCROLL
     ============================================ */
  document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
    anchor.addEventListener('click', function (e) {
      var href = this.getAttribute('href');
      if (href === '#') return;
      e.preventDefault();
      var target = document.querySelector(href);
      if (target) {
        var offset = navbar ? navbar.offsetHeight : 0;
        var top = target.getBoundingClientRect().top + window.scrollY - offset;
        window.scrollTo({ top: top, behavior: 'smooth' });
      }
    });
  });

  /* ============================================
     SCROLL REVEAL
     ============================================ */
  var revealElements = document.querySelectorAll('.reveal');

  function checkReveal() {
    var windowHeight = window.innerHeight;
    var triggerBottom = windowHeight * 0.88;

    revealElements.forEach(function (el) {
      var rect = el.getBoundingClientRect();
      if (rect.top < triggerBottom) {
        el.classList.add('visible');
      }
    });
  }

  window.addEventListener('scroll', checkReveal, { passive: true });
  window.addEventListener('load', checkReveal);

  /* ============================================
     BODY PREVIEW — Interactive Regions
     ============================================ */
  var regionInfoMap = {
    'head': { label: 'Head & Brain', color: '#00FFC6' },
    'chest': { label: 'Chest & Heart', color: '#FF5C7A' },
    'torso': { label: 'Torso & Organs', color: '#5B8CFF' },
    'stomach': { label: 'Stomach & Abdomen', color: '#00D1FF' },
    'left-arm': { label: 'Left Arm', color: '#00D1FF' },
    'right-arm': { label: 'Right Arm', color: '#00D1FF' },
    'left-leg': { label: 'Left Leg', color: '#00FFC6' },
    'right-leg': { label: 'Right Leg', color: '#00FFC6' }
  };

  bodyRegions.forEach(function (region) {
    region.addEventListener('mouseenter', function () {
      var regionName = this.getAttribute('data-region');
      highlightRegion(regionName);
    });

    region.addEventListener('mouseleave', function () {
      clearRegionHighlight();
    });

    region.addEventListener('click', function () {
      var regionName = this.getAttribute('data-region');
      activateRegion(regionName);
    });
  });

  bodyPulses.forEach(function (pulse) {
    pulse.addEventListener('click', function () {
      var regionName = this.getAttribute('data-region');
      activateRegion(regionName);
    });
  });

  function highlightRegion(name) {
    bodyRegions.forEach(function (r) {
      if (r.getAttribute('data-region') === name) {
        r.style.opacity = '1';
        r.style.filter = 'drop-shadow(0 0 15px rgba(0, 209, 255, 0.6))';
      }
    });
  }

  function clearRegionHighlight() {
    bodyRegions.forEach(function (r) {
      r.style.opacity = '';
      r.style.filter = '';
      r.classList.remove('active');
    });
  }

  function activateRegion(name) {
    clearRegionHighlight();
    bodyRegions.forEach(function (r) {
      if (r.getAttribute('data-region') === name) {
        r.classList.add('active');
      }
    });

    bodyPulses.forEach(function (p) {
      var dot = p.querySelector('.body-pulse-dot');
      if (p.getAttribute('data-region') === name) {
        dot.style.background = regionInfoMap[name] ? regionInfoMap[name].color : 'var(--accent-cyan)';
        dot.style.boxShadow = '0 0 16px ' + (regionInfoMap[name] ? regionInfoMap[name].color : 'var(--accent-cyan)');
      } else {
        dot.style.background = '';
        dot.style.boxShadow = '';
      }
    });
  }

  /* ============================================
     PARTICLES CANVAS
     ============================================ */
  var canvas = document.getElementById('particles-canvas');
  if (canvas) {
    var ctx = canvas.getContext('2d');
    var particles = [];
    var particleCount = 60;
    var mouse = { x: null, y: null };

    function resizeCanvas() {
      canvas.width = canvas.parentElement.offsetWidth;
      canvas.height = canvas.parentElement.offsetHeight;
    }

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    function Particle() {
      this.x = Math.random() * canvas.width;
      this.y = Math.random() * canvas.height;
      this.size = Math.random() * 2 + 0.5;
      this.speedX = (Math.random() - 0.5) * 0.5;
      this.speedY = (Math.random() - 0.5) * 0.5;
      this.opacity = Math.random() * 0.5 + 0.1;
    }

    Particle.prototype.update = function () {
      this.x += this.speedX;
      this.y += this.speedY;

      if (this.x > canvas.width) this.x = 0;
      if (this.x < 0) this.x = canvas.width;
      if (this.y > canvas.height) this.y = 0;
      if (this.y < 0) this.y = canvas.height;
    };

    Particle.prototype.draw = function () {
      ctx.fillStyle = 'rgba(0, 209, 255, ' + this.opacity + ')';
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fill();
    };

    function initParticles() {
      particles = [];
      for (var i = 0; i < particleCount; i++) {
        particles.push(new Particle());
      }
    }

    function connectParticles() {
      for (var i = 0; i < particles.length; i++) {
        for (var j = i + 1; j < particles.length; j++) {
          var dx = particles[i].x - particles[j].x;
          var dy = particles[i].y - particles[j].y;
          var dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 120) {
            var opacity = (1 - dist / 120) * 0.15;
            ctx.strokeStyle = 'rgba(0, 209, 255, ' + opacity + ')';
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }
    }

    function animateParticles() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particles.forEach(function (p) {
        p.update();
        p.draw();
      });

      connectParticles();
      requestAnimationFrame(animateParticles);
    }

    canvas.addEventListener('mousemove', function (e) {
      var rect = canvas.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
    });

    initParticles();
    animateParticles();
  }

  /* ============================================
     KEYBOARD ACCESSIBILITY
     ============================================ */
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      closeMobileMenu();
    }
  });

  /* ============================================
     CURSOR GLOW EFFECT
     ============================================ */
  var cursorGlow = document.getElementById('cursorGlow');
  if (cursorGlow) {
    document.addEventListener('mousemove', function (e) {
      cursorGlow.style.left = e.clientX + 'px';
      cursorGlow.style.top = e.clientY + 'px';
    });

    document.addEventListener('mouseenter', function () {
      cursorGlow.style.opacity = '1';
    }, true);

    document.addEventListener('mouseleave', function () {
      cursorGlow.style.opacity = '0';
    }, true);
  }

  /* ============================================
     PAGE TRANSITION ON LOAD
     ============================================ */
  document.body.classList.add('page-transition');

  /* ============================================
     LOADING SCREEN
     ============================================ */
  var loadingScreen = document.getElementById('loadingScreen');
  if (loadingScreen) {
    function hideLoadingScreen() {
      setTimeout(function () {
        loadingScreen.classList.add('hidden');
      }, 500);
    }

    if (document.readyState === 'complete') {
      hideLoadingScreen();
    } else {
      window.addEventListener('load', hideLoadingScreen);
      setTimeout(function () {
        loadingScreen.classList.add('hidden');
      }, 3000);
    }
  }

})();
