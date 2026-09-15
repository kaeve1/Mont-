'use strict';

const durS = 0.4;
const durM = 0.8;
const durL = 1.2;
const stagger = 0.1;
const delayReveal = 0.3;
const breakPoint = 992;
const stepMove = 1;
const stepHold = 0.55;
const autoDuration = 6;
const loaderWait = 8;

const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const sel = (s, r = document) => r.querySelector(s);
const all = (s, r = document) => Array.from(r.querySelectorAll(s));

let lenis = null;

function registerEases() {
  CustomEase.create('Out', '0.25,1,0.5,1');
  CustomEase.create('In', '0.5,0,0.75,0');
  CustomEase.create('InOut', '0.75,0,0.25,1');
  CustomEase.create('Ease', '0.25,0.1,0.25,1');
  CustomEase.create('diveIn', '0.6,0,0,1');
  CustomEase.create('descent', '0.62,0,0.06,1');
  CustomEase.create('mist', '0.33,0,0.67,1');
  CustomEase.create('loaderEase', 'M0,0,C0,0,0.13,0.34,0.238,0.442,0.305,0.506,0.322,0.514,0.396,0.54,0.478,0.568,0.468,0.56,0.522,0.584,0.572,0.606,0.61,0.719,0.714,0.826,0.798,0.912,1,1,1,1');
}

let viewportWidth = -1;

function setViewportUnit() {
  if (window.innerWidth === viewportWidth) return;
  viewportWidth = window.innerWidth;
  document.documentElement.style.setProperty('--vh', window.innerHeight + 'px');
}

function initLenis() {
  lenis = new Lenis({ duration: durL, smoothWheel: true, touchMultiplier: 2 });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add(time => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(500, 33);
}

function whenLoaded(run) {
  if (document.readyState === 'complete') run();
  else window.addEventListener('load', run, { once: true });
}

function trackLoading(onProgress) {
  const shots = all('img').filter(node => node.getAttribute('loading') !== 'lazy');
  const media = all('video');
  const total = shots.length + media.length + 1;
  let done = 0;
  let reported = 0;
  const step = () => {
    done += 1;
    const value = Math.min(done / total, 1);
    if (value <= reported) return;
    reported = value;
    onProgress(value);
  };
  const watch = (node, event) => {
    node.addEventListener(event, step, { once: true });
    node.addEventListener('error', step, { once: true });
  };
  shots.forEach(node => { if (node.complete) step(); else watch(node, 'load'); });
  media.forEach(node => { if (node.readyState >= 1) step(); else watch(node, 'loadedmetadata'); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(step, step);
  else step();
}

function lockScroll() {
  const width = window.innerWidth - document.documentElement.clientWidth;
  document.body.style.paddingRight = width + 'px';
  document.body.style.overflow = 'hidden';
  if (lenis) lenis.stop();
}

function unlockScroll() {
  document.body.style.paddingRight = '';
  document.body.style.overflow = '';
  if (lenis) lenis.start();
}

function splitFor(node, config) {
  const width = node.clientWidth;
  if (node._split && node._splitWidth === width && width > 0) return node._split;
  if (node._split) {
    gsap.killTweensOf(node._split.lines || node._split.chars);
    node._split.revert();
  }
  if (node.querySelector('br')) node.classList.add('has-break');
  node._split = new SplitText(node, config);
  node._splitWidth = width;
  return node._split;
}

function stage(tl, at) {
  if (!tl) return { set: (t, v) => gsap.set(t, v), to: (t, v) => gsap.to(t, v), fromTo: (t, f, v) => gsap.fromTo(t, f, v) };
  return {
    set: (t, v) => tl.set(t, v, at),
    to: (t, v) => tl.to(t, v, at),
    fromTo: (t, f, v) => tl.fromTo(t, f, v, at)
  };
}

function resetSplit(node) {
  if (!node._split) return;
  gsap.killTweensOf(node._split.lines || node._split.chars);
  node._split.revert();
  node._split = null;
  node._splitWidth = null;
}

function animateTextA(target, state, delay, tl, at) {
  const nodes = gsap.utils.toArray(target);
  const q = stage(tl, at);
  nodes.forEach((node, index) => {
    if (!node.textContent.trim()) return;
    const chars = splitFor(node, { type: 'chars', tag: 'span', charsClass: 'split-char', smartWrap: true }).chars;
    const offset = index * stagger;
    if (state === 'reveal') {
      q.fromTo(chars,
        { opacity: 0, rotateX: 90, x: '10rem', transformOrigin: 'center bottom' },
        { opacity: 1, rotateX: 0, x: '0rem', duration: durL, delay: (delay ?? delayReveal) + offset, stagger: stagger, ease: 'Out', overwrite: true });
    } else if (state === 'hide') {
      q.to(chars, { opacity: 0, rotateX: -90, x: '-10rem', transformOrigin: 'center top', duration: durS, delay: delay ?? 0, stagger: stagger * 0.5, ease: 'In', overwrite: true });
    } else {
      q.set(chars, { opacity: 0, rotateX: -90, x: '-10rem', transformOrigin: 'center top' });
    }
  });
}

function animateTextH(target, state, delay, tl, at) {
  const nodes = gsap.utils.toArray(target);
  const q = stage(tl, at);
  nodes.forEach((node, index) => {
    if (!node.textContent.trim()) return;
    const chars = splitFor(node, { type: 'words,chars', tag: 'span', wordsClass: 'split-word', charsClass: 'split-char', smartWrap: true }).chars;
    const offset = index * stagger;
    if (state === 'reveal') {
      q.fromTo(chars,
        { opacity: 0, yPercent: 50, rotateY: 90 },
        { opacity: 1, yPercent: 0, rotateY: 0, duration: durL, delay: (delay ?? delayReveal) + offset, stagger: stagger * 0.5, ease: 'Out', overwrite: true });
    } else if (state === 'hide') {
      q.to(chars, { opacity: 0, yPercent: -50, rotateY: -90, duration: durS, delay: delay ?? 0, stagger: stagger * 0.25, ease: 'In', overwrite: true });
    } else {
      q.set(chars, { opacity: 0, yPercent: 50, rotateY: 90 });
    }
  });
}

function animateTextP(target, state, delay, tl, at) {
  const nodes = gsap.utils.toArray(target);
  const q = stage(tl, at);
  nodes.forEach((node, index) => {
    if (!node.textContent.trim()) return;
    const lines = splitFor(node, { type: 'lines,words', tag: 'span', linesClass: 'split-line', wordsClass: 'split-word', mask: 'lines' }).lines;
    const offset = index * stagger;
    if (state === 'reveal') {
      q.fromTo(lines, { yPercent: 110 }, { yPercent: 0, duration: durL, delay: (delay ?? delayReveal) + offset, stagger: stagger, ease: 'Out', overwrite: true });
    } else if (state === 'hide') {
      q.to(lines, { yPercent: -110, duration: durS, delay: delay ?? 0, stagger: stagger * 0.5, ease: 'In', overwrite: true });
    } else {
      q.set(lines, { yPercent: 110 });
    }
  });
}

function animateCtn(target, state, delay, tl, at) {
  const nodes = gsap.utils.toArray(target);
  if (!nodes.length) return;
  const q = stage(tl, at);
  const from = window.innerWidth >= breakPoint ? '3.333rem' : '11.54rem';
  if (state === 'reveal') {
    q.fromTo(nodes, { opacity: 0, y: from }, { opacity: 1, y: '0rem', duration: durL, delay: delay ?? delayReveal, stagger: stagger, ease: 'Out', overwrite: true });
  } else if (state === 'hide') {
    q.to(nodes, { opacity: 0, y: '0rem', duration: durS, delay: delay ?? 0, stagger: stagger * 0.5, ease: 'In', overwrite: true });
  } else {
    q.set(nodes, { opacity: 0, y: from });
  }
}

function animateLine(target, state, delay, tl, at) {
  const nodes = gsap.utils.toArray(target);
  if (!nodes.length) return;
  const q = stage(tl, at);
  if (state === 'reveal') {
    q.fromTo(nodes, { clipPath: 'inset(0% 0% 100% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: durL, delay: delay ?? delayReveal, stagger: stagger, ease: 'Out', overwrite: true });
  } else if (state === 'hide') {
    q.to(nodes, { clipPath: 'inset(100% 0% 0% 0%)', duration: durS, delay: delay ?? 0, stagger: stagger * 0.5, ease: 'In', overwrite: true });
  } else {
    q.set(nodes, { clipPath: 'inset(0% 0% 100% 0%)' });
  }
}

function animateSlide(target, state, delay, tl, at) {
  const nodes = gsap.utils.toArray(target);
  if (!nodes.length) return;
  const q = stage(tl, at);
  const inner = nodes.map(node => node.firstElementChild).filter(Boolean);
  if (state === 'reveal') {
    q.fromTo(nodes,
      { clipPath: 'polygon(100% 0%, 100% 0%, 101% 100%, 125% 100%)' },
      { clipPath: 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)', duration: durL, delay: delay ?? delayReveal, ease: 'InOut', overwrite: true });
    q.fromTo(inner, { scale: 1.5, xPercent: 25 }, { scale: 1, xPercent: 0, duration: durL, delay: delay ?? delayReveal, ease: 'InOut', overwrite: true });
  } else if (state === 'hide') {
    q.fromTo(nodes,
      { clipPath: 'polygon(0% 0%, 100% 0%, 125% 100%, 0% 100%)' },
      { clipPath: 'polygon(0% 0%, 0% 0%, 0% 100%, 0% 100%)', duration: durL, delay: delay ?? 0, ease: 'InOut', overwrite: true });
    q.to(inner, { scale: 1.5, xPercent: -25, duration: durL, delay: delay ?? 0, ease: 'InOut', overwrite: true });
  } else {
    q.set(nodes, { clipPath: 'inset(100% 0% 0% 0%)' });
    q.set(inner, { scale: 1.5, xPercent: 25 });
  }
}

function animateVeil(target, state, delay) {
  const nodes = gsap.utils.toArray(target);
  if (!nodes.length) return;
  const inner = nodes.map(node => node.querySelector('img')).filter(Boolean);
  if (state === 'reveal') {
    gsap.fromTo(nodes, { clipPath: 'inset(100% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: durL, delay: delay ?? delayReveal, ease: 'InOut', overwrite: true });
    gsap.fromTo(inner, { scale: 1.24 }, { scale: 1, duration: durL * 1.3, delay: delay ?? delayReveal, ease: 'InOut', overwrite: true });
  } else {
    gsap.set(nodes, { clipPath: 'inset(100% 0% 0% 0%)' });
    gsap.set(inner, { scale: 1.24 });
  }
}

const revealKinds = {
  a: animateTextA,
  h: animateTextH,
  p: animateTextP,
  ctn: animateCtn,
  line: animateLine,
  slide: animateSlide,
  veil: animateVeil
};

function initRevealFirst() {
  const groups = new Map();
  all('[data-reveal-first]').forEach(node => {
    const parent = node.parentElement;
    if (!groups.has(parent)) groups.set(parent, []);
    groups.get(parent).push(node);
  });
  groups.forEach(items => {
    items.slice(1).forEach(item => {
      all('[data-reveal]', item).forEach(node => node.removeAttribute('data-reveal'));
    });
  });
}

function initScrollElementsReveal() {
  Object.keys(revealKinds).forEach(kind => {
    const run = revealKinds[kind];
    const nodes = all(`[data-reveal="${kind}"]`);
    if (!nodes.length) return;
    const groups = new Map();
    nodes.forEach(node => {
      const owner = node.closest('[data-reveal="w"]') || node;
      if (!groups.has(owner)) groups.set(owner, []);
      groups.get(owner).push(node);
    });
    groups.forEach((items, owner) => {
      gsap.set(items, { visibility: 'visible' });
      if (kind === 'words') {
        run(items, 'reveal');
        return;
      }
      run(items, 'initial');
      ScrollTrigger.create({
        trigger: owner,
        start: 'top bottom',
        once: true,
        onEnter: () => run(items, 'reveal')
      });
    });
  });
}

function animateVisibleElements(root, state) {
  Object.keys(revealKinds).forEach(kind => {
    if (kind === 'words') return;
    all(`[data-reveal="${kind}"]`, root).forEach(node => {
      const box = node.getBoundingClientRect();
      if (box.top < window.innerHeight && box.bottom > 0) revealKinds[kind](node, state, 0);
    });
  });
}

function initThemeChange() {
  const themed = all('[data-theme]');
  if (!themed.length) return;
  const map = { dark: 'theme_on-dark', mist: 'theme_on-mist', paper: 'theme_on-paper', photo: 'theme_on-photo' };
  const every = Object.values(map);

  const markers = [];
  Object.keys(map).forEach(key => {
    all(`[data-bg="${key}"]`).forEach(node => markers.push({ node, cls: map[key] }));
  });
  if (!markers.length) return;
  markers.sort((one, two) =>
    (one.node.compareDocumentPosition(two.node) & Node.DOCUMENT_POSITION_FOLLOWING) ? -1 : 1);

  let bands = [];
  let targets = [];

  function measure() {
    const offset = window.scrollY;
    bands = markers
      .filter(entry => getComputedStyle(entry.node).display !== 'none')
      .map(entry => {
        const box = entry.node.getBoundingClientRect();
        return { cls: entry.cls, top: box.top + offset, bottom: box.bottom + offset, left: box.left, right: box.right };
      });
    targets = themed.map(node => {
      const box = node.getBoundingClientRect();
      return { node, line: box.top + box.height / 2, center: box.left + box.width / 2, current: null };
    });
  }

  function apply() {
    const offset = window.scrollY;
    targets.forEach(target => {
      const line = offset + target.line;
      let winner = null;
      for (let i = 0; i < bands.length; i++) {
        const band = bands[i];
        if (target.center < band.left || target.center > band.right) continue;
        if (band.top <= line && band.bottom >= line) winner = band.cls;
      }
      if (!winner || winner === target.current) return;
      target.current = winner;
      target.node.classList.add(winner);
      target.node.classList.remove(...every.filter(name => name !== winner));
    });
  }

  measure();
  apply();
  ScrollTrigger.addEventListener('refresh', () => { measure(); apply(); });
  ScrollTrigger.create({ start: 'top top', end: 'bottom bottom', onUpdate: apply });
}

function initAllParallax() {
  all('[data-parallax="img"]').forEach(node => {
    const frame = node.closest('[data-parallax="w"]');
    if (!frame) return;
    gsap.fromTo(node, { yPercent: -15 }, {
      yPercent: 15, ease: 'none',
      scrollTrigger: { trigger: frame, start: 'top bottom', scrub: 0.5 }
    });
  });
  all('[data-parallax="img-out"]').forEach(node => {
    const frame = node.closest('[data-parallax="w"]');
    if (!frame) return;
    gsap.fromTo(node, { yPercent: 0 }, {
      yPercent: 20, ease: 'none',
      scrollTrigger: { trigger: frame, start: 'bottom bottom', end: 'bottom top', scrub: 0.5 }
    });
  });
  all('[data-parallax="ctn-down"]').forEach(node => {
    if (window.innerWidth < breakPoint && node.dataset.mob === 'off') return;
    gsap.fromTo(node, { yPercent: -10 }, {
      yPercent: 10, ease: 'none',
      scrollTrigger: { trigger: node, start: 'top 125%', end: 'bottom -25%', scrub: 0.5 }
    });
  });
  all('[data-parallax="ctn-up"]').forEach(node => {
    if (window.innerWidth < breakPoint && node.dataset.mob === 'off') return;
    gsap.fromTo(node, { yPercent: 10 }, {
      yPercent: -10, ease: 'none',
      scrollTrigger: { trigger: node, start: 'top 125%', end: 'bottom -25%', scrub: 0.5 }
    });
  });
  all('[data-parallax]').forEach(node => {
    const strength = parseFloat(node.dataset.parallax);
    if (!strength) return;
    gsap.fromTo(node,
      { yPercent: -strength * 50, scale: 1 + strength * 0.4 },
      {
        yPercent: strength * 50, ease: 'none',
        scrollTrigger: { trigger: node.parentElement, start: 'top bottom', end: 'bottom top', scrub: 0.5 }
      });
  });
}

function initMist() {
  all('[data-mist]').forEach(layer => {
    const depth = parseFloat(layer.dataset.mist) || 1;
    gsap.to(layer, {
      yPercent: -18 * depth, xPercent: 6 * depth, ease: 'none',
      scrollTrigger: { trigger: layer.closest('section') || layer, start: 'top bottom', end: 'bottom top', scrub: 0.5 }
    });
    gsap.to(layer, {
      xPercent: '+=' + (4 * depth), yPercent: '+=' + (2.5 * depth),
      duration: 18 + depth * 7, ease: 'mist', repeat: -1, yoyo: true
    });
  });
}

function initLogo() {
  const logo = sel('[data-logo-ring]');
  if (!logo) return;
  const state = { speed: 30 };
  let angle = 0;
  let direction = 1;
  let settle;
  let moved = false;
  window.addEventListener('wheel', () => { moved = true; }, { once: true, passive: true });
  window.addEventListener('touchmove', () => { moved = true; }, { once: true, passive: true });
  gsap.ticker.add((time, delta) => {
    const step = Math.min(delta, 100);
    angle += state.speed * (step / 1000);
    gsap.set(logo, { rotation: angle, transformOrigin: 'center center' });
  });
  if (!lenis) return;
  lenis.on('scroll', ({ velocity }) => {
    if (!moved) return;
    if (velocity !== 0) direction = velocity > 0 ? 1 : -1;
    gsap.to(state, { speed: direction * (30 + 10 * Math.abs(velocity)), duration: 0.3, ease: 'Out', overwrite: true });
    clearTimeout(settle);
    settle = setTimeout(() => {
      gsap.to(state, { speed: 30 * direction, duration: durL, ease: 'Out' });
    }, 100);
  });
}

function initScrollBar() {
  const bar = sel('[data-s-bar]');
  if (!bar || window.innerWidth < breakPoint) return;
  const thumb = sel('[data-s-bar-thumb]', bar);
  const label = sel('[data-s-bar-label]', bar);
  ScrollTrigger.create({
    start: 'top top',
    end: 'bottom bottom',
    onUpdate: state => {
      bar.style.setProperty('--progress', state.progress * 100 + '%');
      if (label) label.textContent = String(Math.round(state.progress * 100)).padStart(2, '0');
    }
  });
  if (!thumb) return;
  let dragging = false;
  thumb.addEventListener('pointerdown', event => {
    dragging = true;
    thumb.setPointerCapture(event.pointerId);
    document.body.style.cursor = 'grabbing';
  });
  thumb.addEventListener('pointermove', event => {
    if (!dragging) return;
    const track = thumb.parentElement.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (event.clientY - track.top) / track.height));
    const distance = document.documentElement.scrollHeight - window.innerHeight;
    if (lenis) lenis.scrollTo(ratio * distance, { duration: 3.2 });
  });
  thumb.addEventListener('pointerup', () => { dragging = false; document.body.style.cursor = ''; });
}

function initSlider() {
  all('[data-slider-root]').forEach(root => {
    const state = {
      slides: all('[data-slider="slide"]', root),
      pag: sel('[data-slider="pag"]', root),
      prev: sel('[data-slider="prev"]', root),
      next: sel('[data-slider="next"]', root),
      current: sel('[data-slider="current"]', root),
      nextNum: sel('[data-slider="next-num"]', root),
      progress: sel('[data-slider="progress"]', root),
      desc: sel('[data-slider-desc]', root),
      index: 0,
      previous: null,
      turn: null
    };
    state.texts = state.slides.map(slide => slide.dataset.desc || '');
    state.length = state.slides.length;
    if (!state.length) return;
    if (state.length === 1) { if (state.pag) state.pag.style.display = 'none'; return; }

    let timer;

    function paint() {
      if (state.current) state.current.textContent = String(state.index + 1);
      if (state.nextNum) state.nextNum.textContent = String(state.index === state.length - 1 ? 1 : state.index + 2);
    }

    function change() {
      const out = state.slides[state.previous];
      const into = state.slides[state.index];
      if (state.turn) state.turn.kill();
      const parts = slide => ({
        h: all('[data-slider="h"]', slide),
        c: all('[data-slider="ctn"]', slide),
        i: all('[data-slider="img"]', slide)
      });
      const leaving = parts(out);
      const coming = parts(into);
      gsap.killTweensOf([out, into]);
      out.style.zIndex = 0;
      into.style.zIndex = 1;

      state.slides.forEach(slide => {
        if (slide !== out && slide !== into) gsap.set(slide, { display: 'none', position: 'absolute' });
      });
      gsap.set(into, { display: 'block', position: 'relative' });
      gsap.set(out, { display: 'block', position: 'absolute' });

      const settle = () => {
        out.style.zIndex = 'auto';
        into.style.zIndex = 1;
        state.slides.forEach(slide => {
          if (slide === into) return;
          gsap.set(slide, { display: 'none', position: 'absolute' });
        });
        gsap.set(into, { display: 'block', position: 'relative' });
        showText(state.index, true);
        state.turn = null;
      };
      const turn = gsap.timeline({ onComplete: settle, onInterrupt: settle });
      state.turn = turn;

      animateTextH(coming.h, 'initial', 0, turn, 0);
      animateCtn(coming.c, 'initial', 0, turn, 0);
      animateSlide(coming.i, 'initial', 0, turn, 0);

      animateTextH(leaving.h, 'hide', 0, turn, 0);
      animateCtn(leaving.c, 'hide', 0, turn, 0);
      animateSlide(leaving.i, 'hide', 0, turn, 0);
      animateSlide(coming.i, 'reveal', 0, turn, 0);

      turn.set(out, { display: 'none' }, durS + stagger);

      animateTextH(coming.h, 'reveal', 0, turn, durM);
      animateCtn(coming.c, 'reveal', durS, turn, durM);

      if (state.desc) {
        animateTextP(state.desc, 'hide', 0, turn, 0);
        turn.call(() => showText(state.index, false), null, durM);
      }
    }

    function showText(index, atRest) {
      const node = state.desc;
      if (!node) return;
      const wanted = state.texts[index] || '';
      if (node.textContent !== wanted) {
        resetSplit(node);
        node.textContent = wanted;
      }
      if (atRest) {
        if (node._split) gsap.set(node._split.lines, { yPercent: 0 });
        return;
      }
      animateTextP(node, 'reveal', 0);
    }

    function busy() {
      return !!(state.turn && state.turn.isActive());
    }

    function advance() {
      if (busy()) return;
      state.previous = state.index;
      state.index = state.index === state.length - 1 ? 0 : state.index + 1;
      paint();
      (state.change || change)();
    }

    function fill() {
      if (state.progress) gsap.fromTo(state.progress, { width: '0%' }, { width: '100%', duration: autoDuration, ease: 'none' });
    }

    function clear() {
      if (!state.progress) return;
      gsap.killTweensOf(state.progress);
      gsap.set(state.progress, { width: '0%' });
    }

    function play() {
      if (reducedMotion.matches) return null;
      fill();
      return setInterval(() => {
        if (document.hidden) return;
        advance();
        fill();
      }, autoDuration * 1000);
    }
    function stop() { clearInterval(timer); clear(); }

    if (reducedMotion.matches) {
      state.change = () => {
        state.slides.forEach((slide, i) => gsap.set(slide, { display: i === state.index ? 'block' : 'none', position: i === state.index ? 'relative' : 'absolute' }));
        showText(state.index, true);
      };
    }
    gsap.set(state.slides, { display: 'none', position: 'absolute' });
    gsap.set(state.slides[state.index], { display: 'block', position: 'relative' });
    if (state.desc) state.desc.textContent = state.texts[state.index] || '';
    paint();

    ScrollTrigger.create({
      trigger: root,
      start: 'top bottom',
      end: 'bottom top',
      onEnter: () => { stop(); timer = play(); },
      onEnterBack: () => { stop(); timer = play(); },
      onLeave: stop,
      onLeaveBack: stop
    });

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) stop();
      else { stop(); timer = play(); }
    });

    state.prev.addEventListener('click', () => {
      if (busy()) return;
      state.previous = state.index;
      state.index = state.index === 0 ? state.length - 1 : state.index - 1;
      paint();
      (state.change || change)();
      stop();
      timer = play();
    });

    state.next.addEventListener('click', () => {
      if (busy()) return;
      stop();
      timer = play();
      advance();
    });
  });
}

function initPins() {
  const pins = all('[data-pin]');
  const button = sel('.hero-s_btn');
  const marks = pins.concat(button ? [button] : []);
  if (!marks.length) return;
  const area = sel('.hero-scroll-area');
  const guards = area ? all('.hero-s h1, .hero-s .hero-s_logo_a, .hero-s_title > *', area) : [];
  const clearance = 32;
  const margin = 8;
  const state = new Map();

  function resolve() {
    if (area) {
      const scope = area.getBoundingClientRect();
      if (scope.bottom < 0 || scope.top > window.innerHeight) return;
    }
    const walls = guards
      .map(node => node.getBoundingClientRect())
      .filter(wall => wall.width && wall.height);
    marks.forEach(mark => {
      const box = mark.getBoundingClientRect();
      const covered = walls.some(wall =>
        wall.left < box.right + clearance && wall.right > box.left - clearance &&
        wall.top < box.bottom + clearance && wall.bottom > box.top - clearance);
      const cropped = mark === button && (box.bottom > window.innerHeight - margin || box.top < margin);
      const blocked = covered || cropped;
      if (state.get(mark) === !blocked) return;
      state.set(mark, !blocked);
      const gate = mark === button ? sel('.btn-circle', button) : mark;
      if (gate) gate.style.pointerEvents = blocked ? 'none' : 'auto';
      if (blocked) mark.dispatchEvent(new CustomEvent('pinblocked'));
      gsap.to(mark, { opacity: blocked ? 0 : 1, duration: blocked ? durS : durM, ease: 'Out', overwrite: true });
    });
  }

  gsap.set(marks, { opacity: 0 });
  gsap.ticker.add(resolve);

  pins.forEach(pin => {
    const pulses = all('[data-pin-pulse]', pin);
    const ico = sel('[data-ico-plus] svg', pin);
    const size = pin.offsetWidth;
    if (pulses.length && size) {
      gsap.fromTo(pulses,
        { opacity: 1, width: size, height: size },
        { opacity: 0, width: size * 1.6, height: size * 1.6, duration: durL, ease: 'In', stagger: 0.2, repeat: -1 });
    }
    if (!ico) return;
    pin.addEventListener('mouseenter', () => {
      gsap.fromTo(ico, { rotate: 0 }, { rotate: -90, duration: durM, ease: 'Out', overwrite: true });
    });
    pin.addEventListener('mouseleave', () => {
      gsap.to(ico, { rotate: -180, duration: durM, ease: 'Out', overwrite: true });
    });
  });
}

function initBtnCircle() {
  all('[data-btn-circle]').forEach(node => {
    const arcs = all('[data-arc]', node);
    if (!arcs.length) return;
    const round = 2 * Math.PI * 103.5;
    gsap.set(arcs, { strokeDasharray: (round * 0.0417) + ' ' + round });
    const turn = gsap.timeline({ paused: true })
      .to(arcs, { strokeDasharray: (round / 2) + ' ' + round, duration: durM, ease: 'InOut' });
    const open = () => turn.play();
    const close = () => turn.reverse();
    node.addEventListener('mouseenter', open);
    node.addEventListener('mouseleave', close);
    node.addEventListener('focusin', open);
    node.addEventListener('focusout', close);
  });
}

function initTips() {
  const wrap = sel('[data-tips]');
  const pins = all('[data-pin]');
  if (!wrap || !pins.length) return;
  const cards = new Map(all('[data-tip]', wrap).map(node => [node.dataset.tip, node]));
  const hoverable = matchMedia('(hover: hover) and (pointer: fine)');
  const gap = 16;
  let open = null;
  let owner = null;

  function place(card, x, y) {
    const width = card.offsetWidth;
    const height = card.offsetHeight;
    const flipX = x + gap + width > window.innerWidth;
    const flipY = y + gap + height > window.innerHeight;
    return {
      x: flipX ? x - gap : x + gap,
      y: flipY ? y - gap : y + gap,
      xPercent: flipX ? -100 : 0,
      yPercent: flipY ? -100 : 0
    };
  }

  function hide() {
    if (!open) return;
    const card = open;
    const pin = owner;
    open = null;
    owner = null;
    if (pin) { pin.classList.remove('is-open'); pin.setAttribute('aria-expanded', 'false'); }
    gsap.killTweensOf(card);
    gsap.to(card, {
      opacity: 0, duration: durS, ease: 'In',
      onComplete: () => { gsap.set(card, { visibility: 'hidden' }); card.classList.remove('is-tap'); }
    });
  }

  function show(pin, x, y, tap) {
    const card = cards.get(pin.dataset.pin);
    if (!card) return;
    if (open && open !== card) hide();
    open = card;
    owner = pin;
    pin.classList.add('is-open');
    pin.setAttribute('aria-expanded', 'true');
    card.classList.toggle('is-tap', tap === true);
    gsap.killTweensOf(card);
    gsap.set(card, { visibility: 'visible' });
    gsap.set(card, place(card, x, y));
    gsap.fromTo(card, { opacity: 0 }, { opacity: 1, duration: durM, ease: 'Out' });
    animateTextP(sel('.tip-card_b p', card), 'reveal', 0);
  }

  function anchor(pin) {
    const box = pin.getBoundingClientRect();
    return [box.right, box.bottom];
  }

  document.addEventListener('mousemove', event => {
    if (!open || !hoverable.matches || open.classList.contains('is-tap')) return;
    gsap.to(open, Object.assign({ duration: durL * 2, ease: 'power3' }, place(open, event.clientX, event.clientY)));
  });

  pins.forEach(pin => {
    pin.addEventListener('mouseenter', event => { if (hoverable.matches) show(pin, event.clientX, event.clientY); });
    pin.addEventListener('mouseleave', () => { if (hoverable.matches) hide(); });
    pin.addEventListener('pinblocked', () => { if (owner === pin) hide(); });
    pin.addEventListener('focus', () => { if (hoverable.matches) show(pin, ...anchor(pin)); });
    pin.addEventListener('blur', () => { if (hoverable.matches) hide(); });
    pin.addEventListener('click', event => {
      event.preventDefault();
      if (hoverable.matches) return;
      if (owner === pin) hide();
      else show(pin, ...anchor(pin), true);
    });
  });

  all('[data-tip-close]').forEach(node => node.addEventListener('click', hide));
  document.addEventListener('click', event => {
    if (hoverable.matches || !open) return;
    if (event.target.closest('[data-pin]') || event.target.closest('[data-tip]')) return;
    hide();
  });
  window.addEventListener('resize', hide);
}

function initHeroTabs() {
  const tabs = all('[data-hero-tab]');
  const master = sel('[data-hero-master]');
  if (!tabs.length || !master) return;
  const night = sel('.is-night', master);
  tabs.forEach(tab => tab.addEventListener('click', () => {
    const mode = tab.dataset.heroTab;
    tabs.forEach(node => node.setAttribute('aria-pressed', String(node === tab)));
    gsap.to(night, { opacity: mode === 'night' ? 1 : 0, duration: durM, ease: 'InOut' });
  }));
}

function initHeroFlow() {
  const area = sel('.hero-scroll-area');
  if (!area) return;
  const content = sel('.hero-s', area);
  const bg = sel('.hero-w_bg', area);
  const over = sel('[data-hero-over]', area);
  if (!content || !bg) return;

  const build = () => {
    const height = bg.offsetHeight;
    const narrow = window.innerWidth < breakPoint;
    if (over) over.style.height = narrow ? '' : height + 'px';
    const flow = gsap.timeline({
      scrollTrigger: { trigger: area, start: 'top top', end: 'bottom bottom', scrub: true, invalidateOnRefresh: true }
    });
    if (!narrow) {
      flow
        .fromTo(content, { y: 0 }, { y: -(height * 1.25 - window.innerHeight), ease: 'Ease', duration: 0.6 })
        .fromTo([bg, over].filter(Boolean), { y: 0 }, { y: -(height - window.innerHeight), ease: 'Ease', duration: 0.6 }, '<');
    }
    flow.fromTo(narrow ? bg : [bg, over].filter(Boolean),
      { scale: 1, transformOrigin: '50% 75%' },
      { scale: 2, ease: 'In', duration: 0.6 }, narrow ? '>' : '-=0.2');
  };

  const image = sel('img', bg);
  if (image && !image.complete) image.addEventListener('load', build, { once: true });
  else build();
  if (over) window.addEventListener('resize', () => {
    over.style.height = window.innerWidth < breakPoint ? '' : bg.offsetHeight + 'px';
  });
}

function initHorizontal() {
  all('[data-horizontal]').forEach(track => {
    const section = track.closest('section');
    const rail = track.parentElement;
    if (!section) return;
    const distance = () => Math.max(0, track.scrollWidth - rail.clientWidth);
    const panels = all('.crossing-panel', track);
    const narrow = window.innerWidth < breakPoint;
    const span = 1 / Math.max(1, panels.length);
    const marks = [];
    const timeline = gsap.timeline({
      scrollTrigger: { trigger: section, start: 'top top', end: 'bottom bottom', scrub: 0.5, invalidateOnRefresh: true }
    });
    if (narrow) {
      let time = 0;
      timeline.set(track, { x: 0 }, 0);
      marks.push(0);
      for (let index = 1; index < panels.length; index += 1) {
        time += stepHold;
        timeline.to(track, { x: () => -Math.min(panels[index].offsetLeft, distance()), ease: 'InOut', duration: stepMove }, time);
        time += stepMove;
        marks.push(time);
      }
    } else {
      timeline.to(track, { x: () => -distance(), ease: 'none', duration: 1 }, 0);
      panels.forEach((panel, index) => marks.push(Math.max(0, index * span - span * 0.5)));
    }
    const fade = narrow ? stepMove * 0.6 : span * 0.7;
    const grow = narrow ? stepMove * 1.2 : span * 1.4;
    panels.forEach((panel, index) => {
      const copy = panel.querySelector('.crossing-copy');
      const figure = panel.querySelector('.crossing-figure img');
      const at = narrow ? Math.max(0, marks[index] - stepMove * 0.55) : marks[index];
      if (copy) timeline.fromTo(copy, { opacity: 0, y: 34 }, { opacity: 1, y: 0, ease: 'Out', duration: fade }, at);
      if (figure) timeline.fromTo(figure, { scale: 1.16 }, { scale: 1, ease: 'none', duration: grow }, at);
    });
    timeline.to({}, { duration: narrow ? stepHold : 0.28 });
  });
}

function initCanvas() {
  all('[data-canvas]').forEach(stage => {
    const section = stage.closest('section');
    const track = stage.querySelector('[data-canvas-track]');
    const bg = stage.querySelector('[data-canvas-bg]');
    const hint = stage.querySelector('[data-canvas-hint]');
    const video = stage.querySelector('video');
    if (!section || !track) return;

    const travel = () => Math.max(0, track.scrollWidth - stage.clientWidth);
    const drift = () => Math.max(0, bg ? bg.offsetWidth - stage.clientWidth : 0);
    const panels = all('.canvas-panel', track);
    const narrow = window.innerWidth < breakPoint;
    const span = 1 / Math.max(1, panels.length);
    const marks = [];

    const timeline = gsap.timeline({
      scrollTrigger: {
        trigger: section, start: 'top top', end: 'bottom bottom', scrub: 0.5,
        invalidateOnRefresh: true,
        onToggle: state => {
          if (!video) return;
          if (state.isActive) { const play = video.play(); if (play && play.catch) play.catch(() => {}); }
          else video.pause();
        }
      }
    });

    if (narrow) {
      let time = 0;
      timeline.set(track, { x: 0 }, 0);
      marks.push(0);
      for (let index = 1; index < panels.length; index += 1) {
        time += stepHold;
        timeline.to(track, { x: () => -Math.min(panels[index].offsetLeft, travel()), ease: 'InOut', duration: stepMove }, time);
        time += stepMove;
        marks.push(time);
      }
      timeline.to({}, { duration: stepHold }, time);
    } else {
      timeline.to(track, { x: () => -travel(), ease: 'none', duration: 1 }, 0);
      panels.forEach((panel, index) => marks.push(Math.max(0, index * span - span * 0.5)));
    }

    const fade = narrow ? stepMove * 0.6 : span * 0.7;
    const grow = narrow ? stepMove * 1.2 : span * 1.4;
    const pop = narrow ? stepMove * 0.6 : span * 0.8;
    panels.forEach((panel, index) => {
      const copy = panel.querySelector('.canvas-copy');
      const figure = panel.querySelector('.canvas-figure img');
      const mark = panel.querySelector('.canvas-mark');
      const at = narrow ? Math.max(0, marks[index] - stepMove * 0.55) : marks[index];
      if (copy) timeline.fromTo(copy, { opacity: 0, y: 34 }, { opacity: 1, y: 0, ease: 'Out', duration: fade }, at);
      if (figure) timeline.fromTo(figure, { scale: 1.14 }, { scale: 1, ease: 'none', duration: grow }, at);
      if (mark) timeline.fromTo(mark, { opacity: 0, scale: 0.88 }, { opacity: 1, scale: 1, ease: 'Out', duration: pop }, at);
    });

    const total = timeline.duration();
    if (bg) timeline.to(bg, { x: () => -drift(), ease: 'none', duration: total }, 0);
    if (hint) timeline.to(hint, { opacity: 0, ease: 'none', duration: total * span * 0.6 }, 0);
  });
}

function initPorta() {
  all('[data-porta]').forEach(area => {
    const veil = area.querySelector('[data-porta-veil]');
    const back = area.querySelector('[data-porta-back]');
    const galhos = area.querySelectorAll('[data-porta-galho]');
    if (!veil || getComputedStyle(veil).display === 'none') return;
    const timeline = gsap.timeline({
      scrollTrigger: { trigger: area, start: 'top top', end: 'bottom bottom', scrub: 0.5 }
    });
    timeline
      .fromTo(veil,
        { '--ww': '24vw', '--wg': '2.2vw', '--wt': '19vh', '--wb': '19vh', '--wd': '3vh' },
        { '--ww': '33vw', '--wg': '0vw', '--wt': '13vh', '--wb': '13vh', '--wd': '0vh', ease: 'InOut', duration: 0.3 }, 0)
      .to(veil,
        { '--ww': '52vw', '--wt': '0vh', '--wb': '0vh', ease: 'InOut', duration: 0.4 }, 0.3);
    if (back) timeline.fromTo(back, { scale: 0.92 }, { scale: 1, ease: 'none', duration: 0.5 }, 0);
    const word = area.querySelector('.contact-content .giant-title');
    if (word) timeline.fromTo(word, { scale: 0.8 }, { scale: 1, ease: 'InOut', duration: 0.7 }, 0);
    const quiet = area.querySelectorAll('.contact-content > p, .contact-content > .line-link');
    if (quiet.length) timeline.fromTo(quiet, { opacity: 0 }, { opacity: 1, ease: 'Out', duration: 0.22 }, 0.52);
    if (galhos.length) timeline.fromTo(galhos, { opacity: 1 }, { opacity: 0, ease: 'Out', duration: 0.25 }, 0.34);
    timeline.to({}, { duration: 0.3 }, 0.7);
  });
}

function initMagnetic() {
  if (window.innerWidth < breakPoint) return;
  all('[data-magnetic]').forEach(node => {
    const pull = parseFloat(node.dataset.magnetic) || 0.25;
    node.addEventListener('pointermove', event => {
      const box = node.getBoundingClientRect();
      gsap.to(node, {
        x: (event.clientX - box.left - box.width / 2) * pull,
        y: (event.clientY - box.top - box.height / 2) * pull,
        duration: 1.6, ease: 'power4.out', overwrite: true
      });
    });
    node.addEventListener('pointerleave', () => {
      gsap.to(node, { x: 0, y: 0, duration: 1.6, ease: 'elastic.out(1, 0.3)', overwrite: true });
    });
  });
}

function startSite() {
  initRevealFirst();
  initScrollElementsReveal();
  initThemeChange();
  initAllParallax();
  initMist();
  initHeroFlow();
  initHeroTabs();
  initPins();
  initBtnCircle();
  initTips();
  initHorizontal();
  initCanvas();
  initPorta();
  initSlider();
  initScrollBar();
  initLogo();
  initMagnetic();
  ScrollTrigger.refresh();
  animateVisibleElements(document, 'reveal');
}

function runPreloaderIntro() {
  const loader = sel('[data-loader]');
  if (!loader) { whenLoaded(startSite); return; }
  const marks = all('[data-part="a"]', loader);
  const heads = all('[data-part="h"]', loader);
  const paras = all('[data-part="p"]', loader);
  const blocks = all('[data-part="ctn"]', loader);
  const wash = sel('.loader_bg_a', loader);
  const decor = all('.loader_bg_arch, .loader_bg_decor', loader);
  const track = sel('.loader_progress_track', loader);
  const master = sel('[data-hero-master]');

  const openWidth = window.innerWidth >= breakPoint ? '24vw' : '40vw';
  const wideWidth = window.innerWidth >= breakPoint ? '36vw' : '50vw';
  const heroScale = window.innerWidth >= breakPoint ? 0.75 : 1.15;

  window.scrollTo(0, 0);
  lockScroll();
  if (master) gsap.set(master, { scale: heroScale, transformOrigin: 'center top' });
  gsap.set(track, { y: 0, yPercent: -100 });

  const intro = gsap.timeline()
    .set(loader, { '--arch-w': openWidth, '--arch-y': '104vh' })
    .add(() => {
      animateTextA(marks, 'reveal');
      animateTextH(heads, 'reveal');
      animateTextP(paras, 'reveal');
      animateCtn(blocks, 'reveal', durS);
    })
    .to({}, { duration: durL })
    .fromTo(wash, { opacity: 0 }, { opacity: 0.05, duration: durL, ease: 'Out' })
    .fromTo(decor, { opacity: 0 }, { opacity: 1, duration: durL, ease: 'Out' }, '<');

  let carried = 0;
  trackLoading(value => {
    if (value <= carried) return;
    carried = value;
    gsap.to(track, { yPercent: -100 + value * 100, duration: durL, ease: 'Out', overwrite: true });
  });

  const filled = new Promise(resolve => {
    let closed = false;
    const close = () => {
      if (closed) return;
      closed = true;
      carried = 1;
      gsap.to(track, { yPercent: 0, duration: durM, ease: 'loaderEase', overwrite: true, onComplete: resolve });
    };
    whenLoaded(close);
    setTimeout(close, loaderWait * 1000);
  });

  Promise.all([intro, filled]).then(() => {
    gsap.timeline()
      .fromTo(loader,
        { '--arch-w': openWidth, '--arch-y': '104vh' },
        { '--arch-w': wideWidth, '--arch-y': '15vh', duration: durL * 1.25, ease: 'InOut' })
      .to(loader, { '--arch-w': '125vw', '--arch-y': '-100vh', duration: durL * 2, ease: 'diveIn' }, '<90%')
      .fromTo(master, { scale: heroScale }, { scale: 1, duration: durL * 1.25, ease: 'InOut' }, '<')
      .add(() => startSite(), '<25%')
      .add(() => { unlockScroll(); gsap.set(loader, { display: 'none' }); });
  });
}

function runPreloaderShort() {
  const loader = sel('[data-loader]');
  if (!loader) { startSite(); return; }
  const master = sel('[data-hero-master]');
  const heroScale = window.innerWidth >= breakPoint ? 0.75 : 1.15;
  window.scrollTo(0, 0);
  lockScroll();
  if (master) gsap.set(master, { scale: heroScale, transformOrigin: 'center top' });
  gsap.set(all('[data-part]', loader), { opacity: 0 });
  gsap.timeline()
    .set(loader, { '--arch-w': '36vw', '--arch-y': '15vh' })
    .to(loader, { '--arch-w': '125vw', '--arch-y': '-100vh', duration: durL * 2, ease: 'diveIn' })
    .fromTo(master, { scale: heroScale }, { scale: 1, duration: durL * 1.25, ease: 'InOut' }, '<')
    .add(() => startSite(), '<25%')
    .add(() => { unlockScroll(); gsap.set(loader, { display: 'none' }); });
}

function boot() {
  setViewportUnit();
  window.addEventListener('resize', setViewportUnit);
  ScrollTrigger.config({ ignoreMobileResize: true });

  if (reducedMotion.matches) {
    whenLoaded(() => {
      document.documentElement.classList.remove('is-loading');
      document.documentElement.classList.add('no-motion');
      const loader = sel('[data-loader]');
      if (loader) loader.remove();
      gsap.registerPlugin(ScrollTrigger, SplitText, CustomEase);
      registerEases();
      initThemeChange();
      initSlider();
      initScrollBar();
      ScrollTrigger.refresh();
    });
    return;
  }

  gsap.registerPlugin(ScrollTrigger, SplitText, CustomEase);
  registerEases();
  initLenis();

  let seen = null;
  try { seen = sessionStorage.getItem('monteVisited'); } catch (error) { seen = null; }
  try { sessionStorage.setItem('monteVisited', '1'); } catch (error) { seen = seen; }

  if (seen) {
    whenLoaded(() => {
      document.documentElement.classList.remove('is-loading');
      runPreloaderShort();
    });
    return;
  }

  document.documentElement.classList.remove('is-loading');
  runPreloaderIntro();
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();
