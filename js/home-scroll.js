/**
 * DIGIFRONT DOOR — CINEMATIC DOOR SCROLL PLAYER
 * Optimized frame loading, fail-safe gate timeout, skip controls,
 * off-screen rAF pausing, and reduced-motion compliance.
 */

(() => {
  'use strict';

  const TOTAL = 240;
  const EMBED = typeof FRAMES !== 'undefined';
  const path = n => EMBED ? FRAMES[n - 1] : `frames/frame_${String(n).padStart(3, '0')}.webp`;
  
  // Device memory & viewport check
  const small = window.matchMedia('(max-width:768px)').matches || 
                (navigator.deviceMemory && navigator.deviceMemory <= 4);
  const STEP = small ? 2 : 1;
  const idx = [];
  for (let n = 1; n <= TOTAL; n += STEP) idx.push(n);
  const COUNT = idx.length;
  
  const reduce = window.matchMedia('(prefers-reduced-motion:reduce)').matches;
  // Dynamic gate threshold: 1 on reduced motion, 12 on mobile, 24 on desktop
  const GATE = reduce ? 1 : (small ? 12 : 24);
  const MAX_CONCURRENCY = small ? 4 : 8;

  const $ = id => document.getElementById(id);
  const track = $('track');
  const cv = $('cv');
  if (!track || !cv) return; // Exit gracefully if not on home page
  
  const ctx = cv.getContext('2d');
  const hero = $('hero');
  const hint = $('hint');
  const cap1 = $('cap1');
  const cap2 = $('cap2');
  const bar = $('loadBar');
  const loadEl = $('load');
  const gate = $('gate');
  const gateBar = $('gateBar');
  const gatePct = $('gatePct');
  const gateSkip = $('gateSkip');

  // Prevent scroll initially until gate opens
  document.documentElement.style.overflow = 'hidden';
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  const imgs = new Array(COUNT);
  let loaded = 0;
  let next = 0;
  let inflight = 0;
  let cw = 0;
  let ch = 0;
  let dirty = true;
  let opened = false;
  let isTrackVisible = true;
  let rafId = null;

  // Open gate and restore scrolling
  function openGate() {
    if (opened) return;
    opened = true;
    if (gate) {
      gate.classList.add('off');
      setTimeout(() => gate.remove(), 600);
    }
    document.documentElement.style.overflow = '';
    readScroll();
    current = target;
    dirty = true;
  }

  // Fail-safe timeout: never permanently lock the visitor behind gate (max 3.5 seconds)
  const failSafeTimeout = setTimeout(() => {
    if (!opened) {
      openGate();
    }
  }, 3500);

  // Manual Skip Intro on gate
  if (gateSkip) {
    gateSkip.addEventListener('click', (e) => {
      e.preventDefault();
      clearTimeout(failSafeTimeout);
      openGate();
    });
  }

  function progress() {
    if (bar) bar.style.width = (loaded / COUNT * 100) + '%';
    const g = Math.min(1, loaded / GATE);
    if (gateBar) gateBar.style.width = (g * 100) + '%';
    if (gatePct) gatePct.textContent = Math.round(g * 100) + '%';

    if (!opened && loaded >= GATE) {
      clearTimeout(failSafeTimeout);
      openGate();
    }
    if (loaded === COUNT && loadEl) {
      loadEl.classList.add('done');
    }
  }

  // Pump frames with concurrency control
  function pump() {
    // If reduced motion, we only need the first frame
    if (reduce && loaded >= 1) return;

    while (next < COUNT && inflight < MAX_CONCURRENCY) {
      const i = next++;
      const im = new Image();
      inflight++;

      const fin = (ok) => {
        if (ok) {
          imgs[i] = im;
          // Paint initial frame immediately if it is frame 0
          if (i === 0) {
            dirty = true;
          }
        }
        inflight--;
        loaded++;
        dirty = true;
        progress();
        pump();
      };

      im.onload = () => {
        if (im.decode) {
          im.decode().then(() => fin(true), () => fin(true));
        } else {
          fin(true);
        }
      };
      im.onerror = () => fin(false);
      im.src = path(idx[i]);
    }
  }

  /* Canvas sizing + cover draw */
  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    cw = Math.round(window.innerWidth * dpr);
    ch = Math.round(window.innerHeight * dpr);
    cv.width = cw;
    cv.height = ch;
    ctx.imageSmoothingQuality = 'high';
    dirty = true;
  }
  window.addEventListener('resize', resize, { passive: true });
  resize();

  function nearest(i) {
    for (let k = i; k >= 0; k--) if (imgs[k]) return imgs[k];
    for (let k = i + 1; k < COUNT; k++) if (imgs[k]) return imgs[k];
    return null;
  }

  function paint(im, alpha) {
    if (!im || !im.naturalWidth) return;
    const s = Math.max(cw / im.naturalWidth, ch / im.naturalHeight);
    const w = im.naturalWidth * s;
    const h = im.naturalHeight * s;
    ctx.globalAlpha = alpha;
    ctx.drawImage(im, (cw - w) / 2, (ch - h) / 2, w, h);
    ctx.globalAlpha = 1;
  }

  function draw(f) {
    const i0 = Math.floor(f);
    const a = f - i0;
    const i1 = Math.min(i0 + 1, COUNT - 1);
    const A = nearest(i0);
    if (!A) return;
    paint(A, 1);
    const B = imgs[i1];
    if (B && B !== A && a > 0.01) {
      paint(B, a);
    }
  }

  /* Scroll mapping */
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const win = (p, a, b, e = 0.04) => clamp((p - a) / e) * (1 - clamp((p - (b - e)) / e));
  let target = 0;
  let current = 0;

  function readScroll() {
    const r = track.getBoundingClientRect();
    const scrollable = r.height - window.innerHeight;
    if (scrollable <= 0) return;
    target = clamp(-r.top / scrollable);
  }
  window.addEventListener('scroll', readScroll, { passive: true });
  readScroll();
  current = target;

  function ui(p) {
    if (hero) {
      const h = 1 - clamp(p / 0.12);
      hero.style.opacity = h;
      hero.style.transform = `translateY(${(-24 * (1 - h)).toFixed(1)}px)`;
      hero.style.pointerEvents = h < 0.2 ? 'none' : '';
    }

    if (hint) {
      hint.style.opacity = 1 - clamp(p / 0.06);
      hint.style.pointerEvents = p > 0.06 ? 'none' : 'auto';
    }

    const a = win(p, 0.17, 0.40);
    const b = win(p, 0.42, 0.62);

    if (cap1 && cap2) {
      cap1.style.opacity = a;
      cap2.style.opacity = b;
      const mob = window.innerWidth <= 760;
      const shift = (v, d) => `translateY(${mob ? '0px' : '-50%'}) translateY(${((1 - v) * d).toFixed(1)}px)`;
      cap1.style.transform = shift(a, 18);
      cap2.style.transform = shift(b, 18);
    }
  }

  let last = performance.now();
  let shownF = -1;

  function frame(now) {
    if (!isTrackVisible) {
      // Pause loop when off-screen to conserve CPU/GPU
      rafId = null;
      return;
    }

    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const k = reduce ? 1 : 1 - Math.exp(-dt / 0.085);
    current += (target - current) * k;
    if (Math.abs(target - current) < 0.00005) current = target;

    const f = current * (COUNT - 1);
    if (dirty || Math.abs(f - shownF) > 0.002) {
      draw(f);
      shownF = f;
      dirty = false;
    }
    ui(current);
    rafId = requestAnimationFrame(frame);
  }

  // IntersectionObserver to pause rAF loop when track is offscreen
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        isTrackVisible = entry.isIntersecting;
        if (isTrackVisible && !rafId) {
          last = performance.now();
          rafId = requestAnimationFrame(frame);
        }
      });
    }, { threshold: 0.01 });
    observer.observe(track);
  }

  rafId = requestAnimationFrame(frame);
  pump();

  /* Anchor seeking */
  function seek(p) {
    const top = track.offsetTop + p * (track.offsetHeight - window.innerHeight);
    window.scrollTo({ top, behavior: reduce ? 'auto' : 'smooth' });
  }

  document.querySelectorAll('[data-seek]').forEach(el => {
    el.addEventListener('click', e => {
      e.preventDefault();
      seek(parseFloat(el.dataset.seek));
    });
  });

  // Skip scroll to main content
  const skipToContentBtn = $('skipToContent');
  if (skipToContentBtn) {
    skipToContentBtn.addEventListener('click', (e) => {
      e.preventDefault();
      const contentSection = $('services-preview') || $('contact');
      if (contentSection) {
        contentSection.scrollIntoView({ behavior: 'smooth' });
      }
    });
  }

})();
