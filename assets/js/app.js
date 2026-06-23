/* ============================================================
   RIFAATH AMEEN — PORTFOLIO JS
   Crosshair cursor · GSAP intro · cabin failure-search canvas
   Scroll animations · Theme toggle · Mobile nav · Nav hide
   ============================================================ */

(function () {
  'use strict';

  /* ──────────────────────────────────────────
     UTILS
  ────────────────────────────────────────── */
  function lerp(a, b, t) { return a + (b - a) * t; }
  function smoothstep(t) { return t * t * (3 - 2 * t); }
  function clamp(v, lo, hi) { return Math.min(Math.max(v, lo), hi); }

  /* ──────────────────────────────────────────
     CROSSHAIR CURSOR
  ────────────────────────────────────────── */
  const cursor = document.getElementById('cursor');
  if (cursor && window.matchMedia('(pointer: fine)').matches) {
    let mx = -100, my = -100;
    document.addEventListener('mousemove', e => {
      mx = e.clientX;
      my = e.clientY;
      cursor.style.left = mx + 'px';
      cursor.style.top  = my + 'px';
    });
    document.addEventListener('mouseleave', () => { cursor.style.opacity = '0'; });
    document.addEventListener('mouseenter', () => { cursor.style.opacity = '1'; });

    const hoverEls = document.querySelectorAll('a, button, .pc, .sp, .soc, .ec, .ai');
    hoverEls.forEach(el => {
      el.addEventListener('mouseenter', () => cursor.classList.add('hover'));
      el.addEventListener('mouseleave', () => cursor.classList.remove('hover'));
    });
  } else if (cursor) {
    cursor.style.display = 'none';
  }

  /* ──────────────────────────────────────────
     THEME TOGGLE
  ────────────────────────────────────────── */
  const themeBtn = document.getElementById('theme-btn');
  if (themeBtn) {
    const html = document.documentElement;
    const saved = localStorage.getItem('theme') || 'dark';
    html.dataset.theme = saved;
    themeBtn.textContent = saved === 'dark' ? '☀' : '☾';

    themeBtn.addEventListener('click', () => {
      html.classList.add('tt');
      const next = html.dataset.theme === 'dark' ? 'light' : 'dark';
      html.dataset.theme = next;
      localStorage.setItem('theme', next);
      themeBtn.textContent = next === 'dark' ? '☀' : '☾';
      setTimeout(() => html.classList.remove('tt'), 350);
    });
  }

  /* ──────────────────────────────────────────
     NAV — HIDE ON SCROLL DOWN
  ────────────────────────────────────────── */
  const nav = document.getElementById('nav');
  if (nav) {
    let lastY = 0;
    window.addEventListener('scroll', () => {
      const y = window.scrollY;
      nav.style.transform = (y > lastY && y > 100) ? 'translateY(-100%)' : 'translateY(0)';
      lastY = y;
    }, { passive: true });
  }

  /* ──────────────────────────────────────────
     MOBILE NAV
  ────────────────────────────────────────── */
  const mobNav   = document.getElementById('mob-nav');
  const burger   = document.getElementById('hamburger');
  const mobClose = document.getElementById('mob-close');
  if (mobNav && burger) {
    burger.addEventListener('click',   () => mobNav.classList.add('open'));
    mobClose.addEventListener('click', () => mobNav.classList.remove('open'));
    mobNav.querySelectorAll('a').forEach(a => a.addEventListener('click', () => mobNav.classList.remove('open')));
  }

  /* ──────────────────────────────────────────
     INTERSECTION OBSERVER — SCROLL FADE-IN
  ────────────────────────────────────────── */
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('vis');
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '-40px 0px' });

  document.querySelectorAll('.fi').forEach(el => io.observe(el));

  /* ──────────────────────────────────────────
     PARAMETERIZED CABIN FAILURE-SEARCH (BLENDER SIM)
     A synthetic in-cabin scene is procedurally perturbed;
     a search climbs toward configurations that are most
     likely to break the monitoring model, viewed through a
     120° camera mounted below the rear-view mirror.
  ────────────────────────────────────────── */
  const canvas = document.getElementById('skeleton-canvas');
  if (canvas) {
    const DPR = window.devicePixelRatio || 1;
    const CW  = 380;
    const CH  = 520;
    canvas.width  = CW * DPR;
    canvas.height = CH * DPR;
    canvas.style.width  = CW + 'px';
    canvas.style.height = CH + 'px';
    const ctx = canvas.getContext('2d');
    ctx.scale(DPR, DPR);

    const SEARCH_MS = 3200;
    const FOUND_MS  = 1700;
    const RESET_MS  = 320;
    const ITER_MS   = 260;

    let stage        = 'search'; // 'search' | 'found' | 'reset'
    let stageElapsed = 0;
    let lastIterAt   = 0;
    let iter         = 0;
    let failScore    = 0.12;
    let cfg          = { headYaw: 0, seatTilt: 0, occX: 0, occY: 0 };
    let prevTs       = null;
    let frame        = 0;

    function drawGrid() {
      ctx.strokeStyle = 'rgba(255,255,255,0.028)';
      ctx.lineWidth = 1;
      const step = 32;
      for (let x = 0; x <= CW; x += step) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, CH); ctx.stroke();
      }
      for (let y = 0; y <= CH; y += step) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(CW, y); ctx.stroke();
      }
    }

    function rr(x, y, w, h, r) {
      if (ctx.roundRect) { ctx.roundRect(x, y, w, h, r); return; }
      ctx.rect(x, y, w, h);
    }

    function drawCabin(c, alpha) {
      const top = 0.06 * CH, bottom = 0.74 * CH;
      const left = 0.07 * CW, right = 0.93 * CW;

      /* Wide-angle (120°) lens frame */
      ctx.strokeStyle = `rgba(255,255,255,${0.10 * alpha})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(left + 18, top);
      ctx.lineTo(right - 18, top);
      ctx.quadraticCurveTo(right + 12, (top + bottom) / 2, right - 18, bottom);
      ctx.lineTo(left + 18, bottom);
      ctx.quadraticCurveTo(left - 12, (top + bottom) / 2, left + 18, top);
      ctx.stroke();

      /* Camera marker — below rear-view mirror */
      ctx.beginPath();
      ctx.fillStyle = `rgba(251,146,60,${0.85 * alpha})`;
      ctx.arc((left + right) / 2, top + 2, 3, 0, Math.PI * 2);
      ctx.fill();

      /* Dash line */
      ctx.strokeStyle = `rgba(0,229,255,${0.3 * alpha})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(left + 8, top + 20);
      ctx.lineTo(right - 8, top + 20);
      ctx.stroke();

      /* Steering wheel, partial */
      const swX = left + 50, swY = top + 32, swR = 32;
      ctx.beginPath();
      ctx.strokeStyle = `rgba(0,229,255,${0.35 * alpha})`;
      ctx.lineWidth = 1.5;
      ctx.arc(swX, swY, swR, Math.PI * 0.15, Math.PI * 1.55);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(swX, swY);
      ctx.lineTo(swX, swY + swR * 0.85);
      ctx.stroke();

      /* Seat — position/tilt shift with search parameters */
      const seatCX = (left + right) / 2 + c.occX * CW;
      const seatTopY = top + 86;
      ctx.save();
      ctx.translate(seatCX, seatTopY + 70);
      ctx.rotate(c.seatTilt * Math.PI / 180 * 0.18);
      ctx.strokeStyle = `rgba(255,255,255,${0.26 * alpha})`;
      ctx.lineWidth = 1.4;
      ctx.beginPath(); rr(-46, -86, 92, 150, 14); ctx.stroke();
      ctx.beginPath(); rr(-28, -112, 56, 32, 9); ctx.stroke();
      ctx.restore();

      /* Occupant head — yaw + offset are search parameters */
      const headX = seatCX;
      const headY = seatTopY + c.occY * CH;
      const yaw = c.headYaw * Math.PI / 180;
      ctx.save();
      ctx.translate(headX, headY);
      ctx.beginPath();
      ctx.fillStyle = `rgba(0,229,255,${0.12 * alpha})`;
      ctx.ellipse(0, 0, Math.max(10, 20 * Math.cos(yaw)), 23, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = `rgba(0,229,255,${0.7 * alpha})`;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      /* Gaze vector */
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.sin(yaw) * 38, -4);
      ctx.strokeStyle = `rgba(251,146,60,${0.55 * alpha})`;
      ctx.stroke();
      ctx.restore();

      /* Torso + seatbelt */
      ctx.beginPath();
      ctx.strokeStyle = `rgba(255,255,255,${0.22 * alpha})`;
      ctx.lineWidth = 1.4;
      rr(seatCX - 32, headY + 22, 64, 86, 16);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(seatCX - 26, headY + 24);
      ctx.lineTo(seatCX + 20, headY + 100);
      ctx.strokeStyle = `rgba(157,143,255,${0.4 * alpha})`;
      ctx.stroke();
    }

    function drawTelemetry(c, score, iterN, curStage, alpha) {
      const panelY = CH - 86;
      ctx.strokeStyle = `rgba(255,255,255,${0.08 * alpha})`;
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(0, panelY); ctx.lineTo(CW, panelY); ctx.stroke();

      ctx.textAlign = 'left';
      ctx.fillStyle = `rgba(157,143,255,${0.75 * alpha})`;
      ctx.font = '8px JetBrains Mono, monospace';
      ctx.fillText('PARAMETER SEARCH', 12, panelY + 16);

      ctx.font = '9px JetBrains Mono, monospace';
      ctx.fillStyle = `rgba(210,208,220,${0.85 * alpha})`;
      ctx.fillText(`HEAD_YAW ${c.headYaw.toFixed(1)}°   SEAT_TILT ${c.seatTilt.toFixed(1)}°`, 12, panelY + 34);
      ctx.fillText(`OCC_X ${(c.occX * 100).toFixed(1)}cm   ITER ${iterN}`, 12, panelY + 50);

      const barX = 12, barY = panelY + 62, barW = CW - 24, barH = 6;
      ctx.fillStyle = `rgba(255,255,255,${0.08 * alpha})`;
      ctx.fillRect(barX, barY, barW, barH);
      ctx.fillStyle = curStage === 'found' ? `rgba(251,146,60,${0.95 * alpha})` : `rgba(0,229,255,${0.7 * alpha})`;
      ctx.fillRect(barX, barY, barW * score, barH);

      ctx.textAlign = 'right';
      ctx.fillStyle = curStage === 'found' ? `rgba(251,146,60,${alpha})` : `rgba(0,229,255,${0.7 * alpha})`;
      ctx.fillText(`FAILURE SCORE ${score.toFixed(2)}`, CW - 12, panelY + 74);
    }

    function drawOverlay(curStage) {
      ctx.textAlign = 'left';
      ctx.fillStyle = 'rgba(0,229,255,0.25)';
      ctx.font = '9px JetBrains Mono, monospace';
      ctx.fillText('CABIN CAM · 120° FOV', 6, 14);
      ctx.textAlign = 'right';
      ctx.fillStyle = curStage === 'found' ? 'rgba(251,146,60,0.85)' : 'rgba(0,229,255,0.25)';
      ctx.fillText(curStage === 'found' ? 'FAILURE CASE FOUND' : 'SEARCHING…', CW - 5, 14);
    }

    function draw() {
      ctx.clearRect(0, 0, CW, CH);
      drawGrid();

      const alpha = stage === 'reset' ? Math.max(0, 1 - stageElapsed / RESET_MS) : 1;

      if (stage === 'found') {
        const flashA = ((Math.sin(frame * 0.3) + 1) / 2) * 0.12;
        ctx.fillStyle = `rgba(251,146,60,${flashA})`;
        ctx.fillRect(0, 0, CW, CH);
      }

      drawCabin(cfg, alpha);
      drawTelemetry(cfg, failScore, iter, stage, alpha);
      drawOverlay(stage);

      if (stage === 'found') {
        ctx.textAlign = 'center';
        ctx.fillStyle = `rgba(251,146,60,${0.9 * alpha})`;
        ctx.font = '12px JetBrains Mono, monospace';
        ctx.fillText('FAILURE CASE FOUND', CW / 2, CH * 0.42);
      }
    }

    function tick(ts) {
      if (!prevTs) prevTs = ts;
      const dt = Math.min(ts - prevTs, 50);
      prevTs = ts;
      frame++;
      stageElapsed += dt;

      if (stage === 'search') {
        const progress = clamp(stageElapsed / SEARCH_MS, 0, 1);
        if (stageElapsed - lastIterAt >= ITER_MS) {
          lastIterAt = stageElapsed;
          iter++;
          const intensity = 0.15 + smoothstep(progress) * 0.85;
          cfg = {
            headYaw: Math.sin(iter * 0.7) * 22 * intensity,
            seatTilt: Math.cos(iter * 0.5) * 10 * intensity,
            occX: Math.sin(iter * 0.33) * 0.05 * intensity,
            occY: Math.cos(iter * 0.41) * 0.025 * intensity,
          };
          failScore = clamp(0.12 + intensity * 0.82 + Math.sin(iter) * 0.025, 0, 0.97);
        }
        if (stageElapsed >= SEARCH_MS) {
          stage = 'found'; stageElapsed = 0;
          failScore = Math.max(failScore, 0.9);
        }
      } else if (stage === 'found') {
        if (stageElapsed >= FOUND_MS) { stage = 'reset'; stageElapsed = 0; }
      } else if (stage === 'reset') {
        if (stageElapsed >= RESET_MS) {
          stage = 'search'; stageElapsed = 0; iter = 0; lastIterAt = 0;
          failScore = 0.12;
          cfg = { headYaw: 0, seatTilt: 0, occX: 0, occY: 0 };
        }
      }

      draw();
      requestAnimationFrame(tick);
    }

    requestAnimationFrame(tick);
  }

  /* ──────────────────────────────────────────
     INTRO ANIMATION (GSAP — only on index)
  ────────────────────────────────────────── */
  const intro    = document.getElementById('intro');
  const introBtn = document.getElementById('intro-btn');
  const sliderA  = document.getElementById('slider-a');
  const sliderB  = document.getElementById('slider-b');
  const site     = document.getElementById('site');

  if (intro && introBtn && typeof gsap !== 'undefined') {
    /* Skip if already seen this session */
    if (sessionStorage.getItem('introSeen')) {
      intro.style.display  = 'none';
      sliderA.style.display = 'none';
      sliderB.style.display = 'none';
      site.style.transform = 'none';
      triggerHero();
    } else {
      /* Animate lines in */
      gsap.to('.intro-line', {
        y: '0%',
        duration: 0.95,
        stagger: 0.22,
        ease: 'power3.out',
        delay: 0.25,
      });
      gsap.to('#intro-btn', {
        opacity: 1,
        duration: 0.55,
        delay: 1.4,
        ease: 'power2.out',
      });

      introBtn.addEventListener('click', launchSite, { once: true });
    }

    function launchSite() {
      sessionStorage.setItem('introSeen', '1');

      gsap.to('.intro-line', { y: '-110%', duration: 0.55, stagger: 0.08, ease: 'power3.in' });
      gsap.to('#intro-btn',  { opacity: 0, duration: 0.25 });

      gsap.to('#slider-a', { y: '-100%', duration: 0.7, delay: 0.7, ease: 'power4.inOut' });
      gsap.to('#slider-b', { y: '-100%', duration: 0.7, delay: 0.95, ease: 'power4.inOut', onComplete: () => {
        intro.style.display  = 'none';
        sliderA.style.display = 'none';
        sliderB.style.display = 'none';
      }});
      gsap.to('#intro',    { y: '-100%', duration: 0.7, delay: 1.1,  ease: 'power4.inOut' });
      gsap.to('#site',     { y: 0,       duration: 0.9, delay: 0.85, ease: 'power4.out',
        onComplete: () => {
          site.style.transform = 'none';
          triggerHero();
        }
      });
    }
  } else if (site) {
    site.style.transform = 'none';
    triggerHero();
  }

  function triggerHero() {
    document.querySelectorAll('#hero .fi').forEach(el => {
      setTimeout(() => el.classList.add('vis'), 100);
    });
  }

})();
