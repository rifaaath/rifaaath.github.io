/* ============================================================
   RIFAATH AMEEN — PORTFOLIO JS
   Crosshair cursor · GSAP intro · COCO-17 skeleton canvas
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
     COCO-17 SKELETON CANVAS
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

    /* COCO-17 skeleton connections */
    const CONN = [
      [0,1],[0,2],[1,3],[2,4],         // head
      [5,6],                            // shoulders
      [5,7],[7,9],                      // left arm
      [6,8],[8,10],                     // right arm
      [5,11],[6,12],[11,12],            // torso
      [11,13],[13,15],                  // left leg
      [12,14],[14,16],                  // right leg
    ];

    /* 3 poses: [x, y] normalised 0–1 */
    const POSES = [
      /* Standing neutral */
      [[.50,.07],[.52,.06],[.48,.06],[.55,.07],[.45,.07],
       [.61,.21],[.39,.21],[.66,.35],[.34,.35],[.63,.49],[.37,.49],
       [.57,.54],[.43,.54],[.58,.71],[.42,.71],[.57,.89],[.43,.89]],

      /* Arms raised */
      [[.50,.07],[.52,.06],[.48,.06],[.55,.07],[.45,.07],
       [.61,.21],[.39,.21],[.72,.13],[.28,.13],[.76,.03],[.24,.03],
       [.57,.54],[.43,.54],[.58,.71],[.42,.71],[.57,.89],[.43,.89]],

      /* Surf / dynamic */
      [[.43,.22],[.44,.20],[.41,.21],[.47,.21],[.38,.22],
       [.34,.30],[.57,.28],[.22,.20],[.67,.37],[.16,.12],[.73,.45],
       [.40,.50],[.54,.48],[.32,.64],[.61,.60],[.30,.80],[.65,.75]],
    ];

    const HOLD_MS  = 2600;
    const TRANS_MS = 1900;
    let poseIdx  = 0;
    let phase    = 'hold';   // 'hold' | 'trans'
    let elapsed  = 0;
    let prevTs   = null;
    let frame    = 0;

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
      /* Corner labels */
      ctx.fillStyle = 'rgba(0,229,255,0.18)';
      ctx.font = `${9 / DPR * DPR}px JetBrains Mono, monospace`;
      ctx.textAlign = 'left';
      ctx.fillText('(0,0)', 5, 12);
      ctx.textAlign = 'right';
      ctx.fillText(`(${CW},${CH})`, CW - 4, CH - 5);
    }

    function drawSkeleton(pts) {
      /* Lines */
      CONN.forEach(([a, b]) => {
        ctx.beginPath();
        ctx.moveTo(pts[a][0], pts[a][1]);
        ctx.lineTo(pts[b][0], pts[b][1]);
        const isLeg = (a >= 11 && b >= 11);
        const isArm = ((a >= 5 && a <= 10) && b >= 5 && b <= 10 && !(a < 7 && b < 7));
        ctx.strokeStyle = isLeg ? 'rgba(157,143,255,0.45)' : isArm ? 'rgba(0,229,255,0.55)' : 'rgba(0,229,255,0.3)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      });

      /* Keypoints */
      pts.forEach(([x, y], i) => {
        /* Glow */
        const grad = ctx.createRadialGradient(x, y, 0, x, y, 9);
        grad.addColorStop(0, 'rgba(0,229,255,0.15)');
        grad.addColorStop(1, 'rgba(0,229,255,0)');
        ctx.beginPath();
        ctx.arc(x, y, 9, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();

        /* Dot */
        ctx.beginPath();
        ctx.arc(x, y, i === 0 ? 3.5 : 2.5, 0, Math.PI * 2);
        ctx.fillStyle = i === 0 ? '#ffffff' : '#00e5ff';
        ctx.fill();

        /* Keypoint index */
        ctx.fillStyle = 'rgba(0,229,255,0.35)';
        ctx.font = `8px JetBrains Mono, monospace`;
        ctx.textAlign = 'left';
        ctx.fillText(i, x + 5, y - 3);
      });
    }

    function drawOverlay() {
      ctx.fillStyle = 'rgba(0,229,255,0.25)';
      ctx.font = '9px JetBrains Mono, monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`FRAME  ${String(frame).padStart(4, '0')}`, 6, CH - 18);
      ctx.fillText(`CONF   0.${96 + (frame % 3)}`, 6, CH - 7);
      /* Top-right: mode */
      const poseNames = ['STAND', 'RAISE', 'SURF '];
      ctx.textAlign = 'right';
      ctx.fillText(`POSE  ${poseNames[poseIdx]}`, CW - 5, 12);
    }

    function tick(ts) {
      if (!prevTs) prevTs = ts;
      const dt = Math.min(ts - prevTs, 50);
      prevTs = ts;
      elapsed += dt;
      frame++;

      let t = 0;
      if (phase === 'hold') {
        t = 0;
        if (elapsed >= HOLD_MS) { phase = 'trans'; elapsed = 0; }
      } else {
        const raw = clamp(elapsed / TRANS_MS, 0, 1);
        t = smoothstep(raw);
        if (elapsed >= TRANS_MS) {
          poseIdx = (poseIdx + 1) % POSES.length;
          phase   = 'hold';
          elapsed = 0;
          t = 0;
        }
      }

      const from = POSES[poseIdx];
      const to   = POSES[(poseIdx + 1) % POSES.length];
      const pts  = from.map(([fx, fy], i) => [
        lerp(fx, to[i][0], t) * CW,
        lerp(fy, to[i][1], t) * CH,
      ]);

      ctx.clearRect(0, 0, CW, CH);
      drawGrid();
      drawSkeleton(pts);
      drawOverlay();

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
