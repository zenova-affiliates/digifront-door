/**
 * DIGIFRONT DOOR — HIGH-PERFORMANCE CINEMATIC DOOR SCROLL PLAYER
 * 
 * Engineered for 60fps buttery-smooth scroll scrub:
 * 1. Tiered Keyframe Skeleton: Bootstraps 25 distributed keyframes in <1s for instant scrubbing across the entire track.
 * 2. Scroll-Proximity Priority Loader: Dynamically prioritizes downloading frames directly at and ahead of the user's active scroll position.
 * 3. Bi-Directional Nearest-Frame Search with Crossfade: Zero frozen frames; seamlessly blends available frames.
 * 4. Resilient Lifecycle: Independent of brittle IntersectionObserver thresholds, immune to layout thrashing.
 * 5. Full Accessibility: Reduced-motion compliant (instant scrub response without nausea-inducing inertia lag).
 */

(() => {
  'use strict';

  const TOTAL = 240;
  const EMBED = typeof FRAMES !== 'undefined';
  const frameSrc = n => EMBED ? FRAMES[n - 1] : `frames/frame_${String(n).padStart(3, '0')}.webp`;

  // Hardware and network adaptability
  const isMobile = window.matchMedia('(max-width: 768px)').matches;
  const isLowPower = (navigator.deviceMemory && navigator.deviceMemory <= 4) || (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4);
  const STEP = (isMobile || isLowPower) ? 2 : 1;

  // Build frame index list
  const idx = [];
  for (let n = 1; n <= TOTAL; n += STEP) idx.push(n);
  const COUNT = idx.length;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const MAX_CONCURRENT = isMobile ? 4 : 6;

  // DOM Elements
  const $ = id => document.getElementById(id);
  const track = $('track');
  const cv = $('cv');
  if (!track || !cv) return; // Exit gracefully if track or canvas not present

  const ctx = cv.getContext('2d', { alpha: false });
  const hero = $('hero');
  const hint = $('hint');
  const cap1 = $('cap1');
  const cap2 = $('cap2');
  const loadBar = $('loadBar');
  const loadEl = $('load');
  const gate = $('gate');
  const gateBar = $('gateBar');
  const gatePct = $('gatePct');
  const gateSkip = $('gateSkip');

  // Prevent scroll initially until first keyframe paints or failsafe triggers
  document.documentElement.style.overflow = 'hidden';
  if (ctx) {
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
  }

  // Frame storage & loading state
  // status: 0 = unrequested, 1 = loading, 2 = loaded, -1 = error
  const imgs = new Array(COUNT);
  const status = new Int8Array(COUNT);
  let loadedCount = 0;
  let activeInflight = 0;
  let cw = 0;
  let ch = 0;
  let dirty = true;
  let opened = false;
  let rafId = null;

  let targetProgress = 0;
  let currentProgress = 0;
  let targetFrame = 0;
  let lastTime = performance.now();
  let shownF = -1;

  // Pre-generate Keyframe Indices (Tier 1 Skeleton)
  // Evenly spaced across the entire timeline to guarantee scrub responsiveness from second 1
  const KEYFRAME_INTERVAL = 10;
  const keyframes = [];
  for (let i = 0; i < COUNT; i += KEYFRAME_INTERVAL) {
    keyframes.push(i);
  }
  if (!keyframes.includes(COUNT - 1)) {
    keyframes.push(COUNT - 1);
  }

  // ---------------------------------------------------------------------------
  // 1. Safe Image Validation
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

  // ---------------------------------------------------------------------------
  // 2. Intelligent Bi-Directional Nearest-Frame Search with Crossfade
  // ---------------------------------------------------------------------------
  function getFramePair(f) {
    const clampedF = Math.min(COUNT - 1, Math.max(0, f));
    const i0 = Math.floor(clampedF);
    const frac = clampedF - i0;

    // Fast path: exact target frame is loaded
    if (isValidImage(imgs[i0])) {
      const i1 = Math.min(COUNT - 1, i0 + 1);
      if (frac > 0.01 && isValidImage(imgs[i1])) {
        return { imgA: imgs[i0], imgB: imgs[i1], alphaB: frac };
      }
      return { imgA: imgs[i0], imgB: null, alphaB: 0 };
    }

    // Bi-directional search: locate closest loaded frame before and after
    let prev = -1;
    for (let k = i0 - 1; k >= 0; k--) {
      if (isValidImage(imgs[k])) {
        prev = k;
        break;
      }
    }

    let next = -1;
    for (let k = i0 + 1; k < COUNT; k++) {
      if (isValidImage(imgs[k])) {
        next = k;
        break;
      }
    }

    if (prev !== -1 && next !== -1) {
      const span = next - prev;
      const progress = (clampedF - prev) / span;
      return { imgA: imgs[prev], imgB: imgs[next], alphaB: progress };
    } else if (prev !== -1) {
      return { imgA: imgs[prev], imgB: null, alphaB: 0 };
    } else if (next !== -1) {
      return { imgA: imgs[next], imgB: null, alphaB: 0 };
    }

    return { imgA: null, imgB: null, alphaB: 0 };
  }

  // ---------------------------------------------------------------------------
  // 3. Canvas Resizing & Painting
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

    const pair = getFramePair(f);
    if (!pair.imgA && !pair.imgB) {
      ctx.fillStyle = '#a9a2c4';
      ctx.fillRect(0, 0, cw, ch);
      return;
    }

    if (pair.imgA) {
      paint(pair.imgA, 1);
    }

    if (pair.imgB && pair.alphaB > 0.01 && pair.imgB !== pair.imgA) {
      paint(pair.imgB, pair.alphaB);
    }
  }

  // ---------------------------------------------------------------------------
  // 4. Hero UI Sync
  // ---------------------------------------------------------------------------
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const win = (p, a, b, e = 0.05) => clamp((p - a) / e) * (1 - clamp((p - (b - e)) / e));

  function ui(p) {
    if (hero) {
      const h = 1 - clamp(p / 0.12);
      hero.style.opacity = h.toFixed(3);
      hero.style.transform = `translateY(${(-24 * (1 - h)).toFixed(1)}px)`;
      hero.style.pointerEvents = h < 0.15 ? 'none' : '';
    }

    if (hint) {
      const hintOpacity = 1 - clamp(p / 0.06);
      hint.style.opacity = hintOpacity.toFixed(3);
      hint.style.pointerEvents = p > 0.06 ? 'none' : 'auto';
    }

    const a = win(p, 0.17, 0.40);
    const b = win(p, 0.42, 0.65);

    if (cap1 && cap2) {
      cap1.style.opacity = a.toFixed(3);
      cap2.style.opacity = b.toFixed(3);
      const isNarrow = (window.innerWidth || 1000) <= 760;
      const shift = (v, d) => `translateY(${isNarrow ? '0px' : '-50%'}) translateY(${((1 - v) * d).toFixed(1)}px)`;
      cap1.style.transform = shift(a, 18);
      cap2.style.transform = shift(b, 18);
    }
  }

  // ---------------------------------------------------------------------------
  // 5. Gate & Loading UI
  // ---------------------------------------------------------------------------
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
    readScroll();
    currentProgress = targetProgress;
    dirty = true;
    startRenderLoop();
  }

  // Fail-safe: ensure user is never trapped behind gate longer than 2.0s
  const failSafeTimeout = setTimeout(() => {
    if (!opened) openGate();
  }, 2000);

  if (gateSkip) {
    gateSkip.addEventListener('click', (e) => {
      e.preventDefault();
      clearTimeout(failSafeTimeout);
      openGate();
    });
  }

  function updateProgress() {
    if (loadBar) {
      loadBar.style.width = ((loadedCount / COUNT) * 100).toFixed(1) + '%';
    }
    
    // Gate unlocks once initial frame + 6 keyframes are ready
    const gateTarget = Math.min(6, keyframes.length);
    let loadedKeyframes = 0;
    for (const k of keyframes) {
      if (status[k] === 2) loadedKeyframes++;
    }

    const gateFraction = Math.min(1, loadedKeyframes / gateTarget);
    if (gateBar) gateBar.style.width = (gateFraction * 100).toFixed(1) + '%';
    if (gatePct) gatePct.textContent = Math.round(gateFraction * 100) + '%';

    if (!opened && (status[0] === 2 && loadedKeyframes >= gateTarget)) {
      clearTimeout(failSafeTimeout);
      openGate();
    }

    if (loadedCount === COUNT && loadEl) {
      loadEl.classList.add('done');
    }
  }

  // ---------------------------------------------------------------------------
  // 6. Proximity-Aware Priority Frame Loader
  // ---------------------------------------------------------------------------
  function getNextFrameIndex() {
    // 1. Mandatory Priority: Frame 0 (initial view)
    if (status[0] === 0) return 0;

    // 2. High Priority: Keyframe Skeleton (Tier 1)
    for (const k of keyframes) {
      if (status[k] === 0) return k;
    }

    // 3. Dynamic Interactive Priority: Frames immediately surrounding target scroll frame (Tier 2)
    const tf = targetFrame;
    for (let d = 0; d < COUNT; d++) {
      const ahead = tf + d;
      const behind = tf - d;
      if (ahead < COUNT && status[ahead] === 0) return ahead;
      if (behind >= 0 && status[behind] === 0) return behind;
    }

    return -1;
  }

  function pump() {
    while (activeInflight < MAX_CONCURRENT) {
      const i = getNextFrameIndex();
      if (i === -1) break; // All frames either requested or loaded

      status[i] = 1; // Mark in-flight
      activeInflight++;

      const im = new Image();
      const onDone = (success) => {
        activeInflight--;
        if (success && im.naturalWidth > 0) {
          imgs[i] = im;
          status[i] = 2; // Loaded
          loadedCount++;

          if (i === 0 || Math.abs(i - targetFrame) <= 3) {
            dirty = true;
            startRenderLoop();
          }
        } else {
          status[i] = -1; // Failed, allow nearest fallback
          loadedCount++;
        }

        updateProgress();
        pump();
      };

      im.onload = () => {
        // Asynchronously decode if supported, but assign image immediately so it is available
        imgs[i] = im;
        if (im.decode) {
          im.decode().then(() => onDone(true)).catch(() => onDone(true));
        } else {
          onDone(true);
        }
      };

      im.onerror = () => onDone(false);
      im.src = frameSrc(idx[i]);
    }
  }

  // ---------------------------------------------------------------------------
  // 7. Scroll Tracking & Render Loop
  // ---------------------------------------------------------------------------
  function readScroll() {
    if (!track) return;

    const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 1;
    const trackRect = track.getBoundingClientRect();
    const trackHeight = trackRect.height || track.offsetHeight || 1;
    const scrollableDistance = trackHeight - viewportHeight;

    if (scrollableDistance <= 0) {
      targetProgress = 0;
      targetFrame = 0;
      return;
    }

    // -trackRect.top is 0 when track starts at top of screen
    const rawProgress = -trackRect.top / scrollableDistance;
    targetProgress = clamp(Number.isFinite(rawProgress) ? rawProgress : 0, 0, 1);
    targetFrame = Math.round(targetProgress * (COUNT - 1));

    // Request pump to prioritize any newly needed proximity frames
    pump();
  }

  function startRenderLoop() {
    if (!rafId) {
      lastTime = performance.now();
      rafId = window.requestAnimationFrame(renderStep);
    }
  }

  function renderStep(now) {
    const viewportHeight = window.innerHeight || 800;
    const trackRect = track.getBoundingClientRect();
    const isNearViewport = (trackRect.bottom > -200 && trackRect.top < viewportHeight + 200);

    // If far out of viewport and convergence reached, sleep cleanly
    if (!isNearViewport && !dirty && Math.abs(targetProgress - currentProgress) < 0.0001) {
      rafId = null;
      return;
    }

    const dt = Math.min(0.05, Math.max(0.001, (now - lastTime) / 1000));
    lastTime = now;

    // Smooth exponential approach; instant when reduced-motion preferred
    const k = reduceMotion ? 1 : (1 - Math.exp(-dt / 0.085));
    currentProgress += (targetProgress - currentProgress) * k;

    if (Math.abs(targetProgress - currentProgress) < 0.00008) {
      currentProgress = targetProgress;
    }

    const f = currentProgress * (COUNT - 1);
    if (dirty || Math.abs(f - shownF) > 0.001) {
      draw(f);
      shownF = f;
      dirty = false;
    }

    ui(currentProgress);
    rafId = window.requestAnimationFrame(renderStep);
  }

  // Active scroll listeners
  function onScroll() {
    readScroll();
    dirty = true;
    startRenderLoop();
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('touchmove', onScroll, { passive: true });

  window.addEventListener('resize', () => {
    resize();
    readScroll();
    dirty = true;
    startRenderLoop();
  }, { passive: true });

  // ---------------------------------------------------------------------------
  // 8. Navigation & Jump Handlers
  // ---------------------------------------------------------------------------
  function seek(p) {
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 1;
    const trackHeight = track.offsetHeight || track.getBoundingClientRect().height || 1;
    const top = track.offsetTop + p * (trackHeight - viewportHeight);
    window.scrollTo({ top, behavior: reduceMotion ? 'auto' : 'smooth' });
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
      const contentSection = $('services-preview') || $('main-content');
      if (contentSection) {
        contentSection.scrollIntoView({ behavior: 'smooth' });
      }
    });
  }

  // ---------------------------------------------------------------------------
  // 9. Startup
  // ---------------------------------------------------------------------------
  resize();
  readScroll();
  currentProgress = targetProgress;
  startRenderLoop();
  pump();

})();
