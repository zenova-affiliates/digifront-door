/**
 * DIGIFRONT DOOR — CINEMATIC DOOR SCROLL PLAYER (REFACTORED & HARDENED)
 * 
 * Features:
 * 1. Passive, rAF-throttled scroll & resize listeners (immune to layout thrashing & script noise)
 * 2. Robust, bounded scroll math (0.0 to 1.0 clamping with NaN/infinity/viewport guards)
 * 3. Safe preloading, decoding, and null-safe canvas frame draw pipeline
 * 4. Resilient render loop lifecycle (auto-restarting on scroll/gate open/resize)
 * 5. Full prefers-reduced-motion & low-memory device scaling
 */

(() => {
  'use strict';

  const TOTAL = 240;
  const EMBED = typeof FRAMES !== 'undefined';
  const path = n => EMBED ? FRAMES[n - 1] : `frames/frame_${String(n).padStart(3, '0')}.webp`;

  // Device memory & viewport capabilities
  const small = window.matchMedia('(max-width:768px)').matches || 
                (navigator.deviceMemory && navigator.deviceMemory <= 4);
  const STEP = small ? 2 : 1;
  const idx = [];
  for (let n = 1; n <= TOTAL; n += STEP) idx.push(n);
  const COUNT = idx.length;

  const reduce = window.matchMedia('(prefers-reduced-motion:reduce)').matches;
  const GATE = reduce ? 1 : (small ? 12 : 24);
  const MAX_CONCURRENCY = small ? 4 : 8;

  const $ = id => document.getElementById(id);
  const track = $('track');
  const cv = $('cv');
  if (!track || !cv) return; // Exit gracefully if not on home page

  const ctx = cv.getContext('2d', { alpha: false });
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

  // Prevent scroll initially until gate opens or failsafe triggers
  document.documentElement.style.overflow = 'hidden';
  if (ctx) {
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
  }

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
  let scrollTicking = false;
  let resizeTicking = false;

  let target = 0;
  let current = 0;
  let last = performance.now();
  let shownF = -1;

  // ---------------------------------------------------------------------------
  // 1. Safe Image Validation & Nearest-Frame Search
  // ---------------------------------------------------------------------------
  function isValidImage(im) {
    return (
      im &&
      im instanceof HTMLImageElement &&
      im.complete &&
      im.naturalWidth > 0 &&
      im.naturalHeight > 0
    );
  }

  function nearest(i) {
    // Search backward for the closest loaded frame
    for (let k = i; k >= 0; k--) {
      if (isValidImage(imgs[k])) return imgs[k];
    }
    // Search forward if no previous frame is available
    for (let k = i + 1; k < COUNT; k++) {
      if (isValidImage(imgs[k])) return imgs[k];
    }
    return null;
  }

  // ---------------------------------------------------------------------------
  // 2. Render Loop Lifecycle & Resiliency
  // ---------------------------------------------------------------------------
  function startRenderLoop() {
    if (!rafId && isTrackVisible) {
      last = performance.now();
      rafId = window.requestAnimationFrame(frame);
    }
  }

  function openGate() {
    if (opened) return;
    opened = true;
    if (gate) {
      gate.classList.add('off');
      setTimeout(() => {
        try { gate.remove(); } catch (e) {}
      }, 600);
    }
    document.documentElement.style.overflow = '';
    isTrackVisible = true;
    readScroll();
    current = target;
    dirty = true;
    startRenderLoop();
  }

  // Fail-safe timeout: never permanently lock the visitor behind gate (max 3.5 seconds)
  const failSafeTimeout = setTimeout(() => {
    if (!opened) {
      openGate();
    }
  }, 3500);

  if (gateSkip) {
    gateSkip.addEventListener('click', (e) => {
      e.preventDefault();
      clearTimeout(failSafeTimeout);
      openGate();
    });
  }

  function progress() {
    if (bar) bar.style.width = ((loaded / COUNT) * 100).toFixed(1) + '%';
    const g = Math.min(1, loaded / GATE);
    if (gateBar) gateBar.style.width = (g * 100).toFixed(1) + '%';
    if (gatePct) gatePct.textContent = Math.round(g * 100) + '%';

    if (!opened && loaded >= GATE) {
      clearTimeout(failSafeTimeout);
      openGate();
    }
    if (loaded === COUNT && loadEl) {
      loadEl.classList.add('done');
    }
  }

  // Progressive frame loader
  function pump() {
    if (reduce && loaded >= 1) return;

    while (next < COUNT && inflight < MAX_CONCURRENCY) {
      const i = next++;
      const im = new Image();
      inflight++;

      const fin = (ok) => {
        if (ok && im.naturalWidth > 0) {
          imgs[i] = im;
          if (i === 0) {
            dirty = true;
            startRenderLoop();
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

  // ---------------------------------------------------------------------------
  // 3. Canvas Resizing & Viewport Cover Drawing
  // ---------------------------------------------------------------------------
  function resize() {
    if (!cv) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    cw = Math.round((window.innerWidth || document.documentElement.clientWidth || 320) * dpr);
    ch = Math.round((window.innerHeight || document.documentElement.clientHeight || 480) * dpr);
    cv.width = cw;
    cv.height = ch;
    if (ctx) {
      ctx.imageSmoothingQuality = 'high';
    }
    dirty = true;
  }

  function paint(im, alpha) {
    if (!ctx || !isValidImage(im) || cw <= 0 || ch <= 0) return;
    const nw = im.naturalWidth;
    const nh = im.naturalHeight;
    if (!nw || !nh) return;

    const s = Math.max(cw / nw, ch / nh);
    const w = nw * s;
    const h = nh * s;
    const x = (cw - w) * 0.5;
    const y = (ch - h) * 0.5;

    ctx.globalAlpha = Math.min(1, Math.max(0, alpha));
    ctx.drawImage(im, x, y, w, h);
    ctx.globalAlpha = 1;
  }

  function draw(f) {
    if (!ctx || cw <= 0 || ch <= 0) return;

    const clampedF = Math.min(COUNT - 1, Math.max(0, f));
    const i0 = Math.floor(clampedF);
    const a = clampedF - i0;
    const i1 = Math.min(i0 + 1, COUNT - 1);

    const imgA = nearest(i0);
    if (!imgA) {
      // Solid neutral background while initial frames decode
      ctx.fillStyle = '#a9a2c4';
      ctx.fillRect(0, 0, cw, ch);
      return;
    }

    paint(imgA, 1);

    if (a > 0.01) {
      const imgB = imgs[i1];
      if (isValidImage(imgB) && imgB !== imgA) {
        paint(imgB, a);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // 4. Robust & Bounded Scroll Math
  // ---------------------------------------------------------------------------
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const win = (p, a, b, e = 0.04) => clamp((p - a) / e) * (1 - clamp((p - (b - e)) / e));

  function readScroll() {
    if (!track) return;

    const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 1;
    const trackRect = track.getBoundingClientRect();
    const trackHeight = trackRect.height || track.offsetHeight || 1;
    const scrollableDistance = trackHeight - viewportHeight;

    if (scrollableDistance <= 0) {
      target = 0;
      return;
    }

    // -trackRect.top is 0 when track aligns with top of viewport
    // It equals scrollableDistance when track bottom hits viewport bottom
    const rawProgress = -trackRect.top / scrollableDistance;

    // Guaranteed [0.0, 1.0] clamping, resilient to NaN, Infinity, or layout shifts
    const safeProgress = Number.isFinite(rawProgress) ? rawProgress : 0;
    target = clamp(safeProgress, 0, 1);
  }

  // Throttled passive scroll listener using requestAnimationFrame
  function onScroll() {
    if (!scrollTicking) {
      scrollTicking = true;
      window.requestAnimationFrame(() => {
        readScroll();
        scrollTicking = false;
        // Wake up render loop if stopped
        if (isTrackVisible && !rafId) {
          startRenderLoop();
        }
      });
    }
  }
  window.addEventListener('scroll', onScroll, { passive: true });

  // Throttled resize listener
  function onResize() {
    if (!resizeTicking) {
      resizeTicking = true;
      window.requestAnimationFrame(() => {
        resize();
        readScroll();
        dirty = true;
        resizeTicking = false;
        if (isTrackVisible && !rafId) {
          startRenderLoop();
        }
      });
    }
  }
  window.addEventListener('resize', onResize, { passive: true });

  // ---------------------------------------------------------------------------
  // 5. Hero UI Elements Sync
  // ---------------------------------------------------------------------------
  function ui(p) {
    if (hero) {
      const h = 1 - clamp(p / 0.12);
      hero.style.opacity = h.toFixed(3);
      hero.style.transform = `translateY(${(-24 * (1 - h)).toFixed(1)}px)`;
      hero.style.pointerEvents = h < 0.2 ? 'none' : '';
    }

    if (hint) {
      const hintOpacity = 1 - clamp(p / 0.06);
      hint.style.opacity = hintOpacity.toFixed(3);
      hint.style.pointerEvents = p > 0.06 ? 'none' : 'auto';
    }

    const a = win(p, 0.17, 0.40);
    const b = win(p, 0.42, 0.62);

    if (cap1 && cap2) {
      cap1.style.opacity = a.toFixed(3);
      cap2.style.opacity = b.toFixed(3);
      const mob = (window.innerWidth || 1000) <= 760;
      const shift = (v, d) => `translateY(${mob ? '0px' : '-50%'}) translateY(${((1 - v) * d).toFixed(1)}px)`;
      cap1.style.transform = shift(a, 18);
      cap2.style.transform = shift(b, 18);
    }
  }

  // ---------------------------------------------------------------------------
  // 6. Animation Frame Step Function
  // ---------------------------------------------------------------------------
  function frame(now) {
    if (!isTrackVisible) {
      rafId = null;
      return;
    }

    const dt = Math.min(0.05, Math.max(0.001, (now - last) / 1000));
    last = now;

    // Frame-rate independent exponential smoothing
    const k = reduce ? 1 : 1 - Math.exp(-dt / 0.085);
    current += (target - current) * k;

    if (Math.abs(target - current) < 0.00005) {
      current = target;
    }

    const f = current * (COUNT - 1);
    if (dirty || Math.abs(f - shownF) > 0.002) {
      draw(f);
      shownF = f;
      dirty = false;
    }

    ui(current);
    rafId = window.requestAnimationFrame(frame);
  }

  // ---------------------------------------------------------------------------
  // 7. Visibility Observer with Generous rootMargin
  // ---------------------------------------------------------------------------
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        isTrackVisible = entry.isIntersecting;
        if (isTrackVisible) {
          dirty = true;
          startRenderLoop();
        }
      });
    }, { 
      threshold: [0, 0.01, 0.1],
      rootMargin: '120px 0px 120px 0px' // Pre-warm before track enters viewport
    });
    observer.observe(track);
  }

  // ---------------------------------------------------------------------------
  // 8. Initialization & Anchor Seeking
  // ---------------------------------------------------------------------------
  resize();
  readScroll();
  current = target;
  startRenderLoop();
  pump();

  function seek(p) {
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 1;
    const trackHeight = track.offsetHeight || track.getBoundingClientRect().height || 1;
    const top = track.offsetTop + p * (trackHeight - viewportHeight);
    window.scrollTo({ top, behavior: reduce ? 'auto' : 'smooth' });
  }

  document.querySelectorAll('[data-seek]').forEach(el => {
    el.addEventListener('click', e => {
      e.preventDefault();
      seek(parseFloat(el.dataset.seek));
    });
  });

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
