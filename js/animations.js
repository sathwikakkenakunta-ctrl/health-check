/* ============================================
   BodyWise — GSAP Animations & Effects
   ============================================ */

(function () {
  'use strict';

  /* Wait for GSAP to load */
  function initGSAPAnimations() {
    if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') {
      setTimeout(initGSAPAnimations, 100);
      return;
    }

    gsap.registerPlugin(ScrollTrigger);

    /* ---- Initial states for GSAP-animated elements ---- */
    gsap.set('.section-header', { opacity: 0, y: 30 });
    gsap.set('.feature-card', { opacity: 0, y: 50 });
    gsap.set('.body-preview-info', { opacity: 0, x: -50 });
    gsap.set('.body-interactive', { opacity: 0, x: 50 });
    gsap.set('.body-pulse', { opacity: 0, scale: 0 });
    gsap.set('.body-preview-feature', { opacity: 0, x: -30 });
    gsap.set('.cta-card', { opacity: 0, y: 40, scale: 0.97 });
    gsap.set('.footer-column', { opacity: 0, y: 20 });

    /* ---- Hero entrance — set initial hidden states ---- */
    gsap.set('.hero-badge', { opacity: 0, y: 20 });
    gsap.set('.hero-title .line', { opacity: 0, y: 40 });
    gsap.set('.hero-subtitle', { opacity: 0, y: 20 });
    gsap.set('.hero-actions .btn', { opacity: 0, y: 20 });
    gsap.set('.hero-stat', { opacity: 0, y: 15 });
    gsap.set('.hero-body-container', { opacity: 0, scale: 0.9 });
    gsap.set('.hero-orbit', { opacity: 0, scale: 0 });

    /* ---- Hero entrance — animate in ---- */
    var heroTL = gsap.timeline({ defaults: { ease: 'power3.out' } });

    heroTL
      .to('.hero-badge', {
        opacity: 1,
        y: 0,
        duration: 0.8,
        delay: 0.3
      })
      .to('.hero-title .line', {
        opacity: 1,
        y: 0,
        duration: 0.9,
        stagger: 0.15
      }, '-=0.4')
      .to('.hero-subtitle', {
        opacity: 1,
        y: 0,
        duration: 0.7
      }, '-=0.5')
      .to('.hero-actions .btn', {
        opacity: 1,
        y: 0,
        duration: 0.6,
        stagger: 0.1
      }, '-=0.4')
      .to('.hero-stat', {
        opacity: 1,
        y: 0,
        duration: 0.5,
        stagger: 0.1
      }, '-=0.3')
      .to('.hero-body-container', {
        opacity: 1,
        scale: 1,
        duration: 1,
        ease: 'power2.out'
      }, '-=1.2')
      .to('.hero-orbit', {
        opacity: 1,
        scale: 1,
        duration: 0.6,
        stagger: 0.1,
        ease: 'back.out(1.7)'
      }, '-=0.6');

    /* ---- Section header animation ---- */
    gsap.to('.section-header', {
      scrollTrigger: {
        trigger: '.section-header',
        start: 'top 85%',
        toggleActions: 'play none none none'
      },
      opacity: 1,
      y: 0,
      duration: 0.8,
      ease: 'power2.out'
    });

    /* ---- Features section animations ---- */
    gsap.to('.feature-card', {
      scrollTrigger: {
        trigger: '.features-grid',
        start: 'top 85%',
        toggleActions: 'play none none none'
      },
      opacity: 1,
      y: 0,
      duration: 0.8,
      stagger: 0.12,
      ease: 'power2.out'
    });

    /* ---- Body Preview section ---- */
    gsap.to('.body-preview-info', {
      scrollTrigger: {
        trigger: '.body-preview-wrapper',
        start: 'top 80%',
        toggleActions: 'play none none none'
      },
      opacity: 1,
      x: 0,
      duration: 1,
      ease: 'power2.out'
    });

    gsap.to('.body-interactive', {
      scrollTrigger: {
        trigger: '.body-preview-wrapper',
        start: 'top 80%',
        toggleActions: 'play none none none'
      },
      opacity: 1,
      x: 0,
      duration: 1,
      ease: 'power2.out'
    });

    gsap.to('.body-pulse', {
      scrollTrigger: {
        trigger: '.body-interactive',
        start: 'top 75%',
        toggleActions: 'play none none none'
      },
      opacity: 1,
      scale: 1,
      duration: 0.5,
      stagger: 0.08,
      ease: 'back.out(2)'
    });

    /* ---- Body preview features list ---- */
    gsap.to('.body-preview-feature', {
      scrollTrigger: {
        trigger: '.body-preview-features',
        start: 'top 85%',
        toggleActions: 'play none none none'
      },
      opacity: 1,
      x: 0,
      duration: 0.6,
      stagger: 0.12,
      ease: 'power2.out'
    });

    /* ---- CTA section ---- */
    gsap.to('.cta-card', {
      scrollTrigger: {
        trigger: '.cta-section',
        start: 'top 85%',
        toggleActions: 'play none none none'
      },
      opacity: 1,
      y: 0,
      scale: 1,
      duration: 0.9,
      ease: 'power2.out'
    });

    /* ---- Footer columns ---- */
    gsap.to('.footer-column', {
      scrollTrigger: {
        trigger: '.footer-grid',
        start: 'top 90%',
        toggleActions: 'play none none none'
      },
      opacity: 1,
      y: 0,
      duration: 0.6,
      stagger: 0.1,
      ease: 'power2.out'
    });

    /* ---- Parallax background blobs ---- */
    gsap.to('.hero-bg-gradient.g1', {
      scrollTrigger: {
        trigger: '.hero',
        start: 'top top',
        end: 'bottom top',
        scrub: 1
      },
      y: -100,
      ease: 'none'
    });

    gsap.to('.hero-bg-gradient.g2', {
      scrollTrigger: {
        trigger: '.hero',
        start: 'top top',
        end: 'bottom top',
        scrub: 1
      },
      y: -60,
      ease: 'none'
    });

    /* ---- Floating animation for orbit items ---- */
    document.querySelectorAll('.hero-orbit-item').forEach(function (item, i) {
      gsap.to(item, {
        y: -12 - (i * 3),
        duration: 3 + (i * 0.5),
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
        delay: i * 0.3
      });
    });

    /* ---- Stats counter animation ---- */
    document.querySelectorAll('.hero-stat-value').forEach(function (stat) {
      var text = stat.textContent;
      var match = text.match(/(\d+)/);
      if (match) {
        var target = parseInt(match[0]);
        var suffix = text.replace(match[0], '');
        var obj = { val: 0 };

        gsap.to(obj, {
          val: target,
          duration: 2,
          delay: 1,
          ease: 'power2.out',
          onUpdate: function () {
            stat.textContent = Math.round(obj.val) + suffix;
          }
        });
      }
    });
  }

  /* ---- Initialize ---- */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGSAPAnimations);
  } else {
    initGSAPAnimations();
  }

})();
