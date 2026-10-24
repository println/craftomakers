// Every screen: each wheel tick, swipe, arrow key or up/down button moves one slide (one section).
// A section taller than the screen is walked through in screen-sized steps before the next one.
(function () {
  if (!window.gsap || !window.Observer) return;
  gsap.registerPlugin(Observer);

  var wide = window.matchMedia('(min-width: 768px)');
  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  var root = document.documentElement;
  var slides = Array.prototype.slice.call(document.querySelectorAll('[data-slide]'));
  var nav = document.querySelector('[data-slide-nav]');
  var swipeRows = Array.prototype.slice.call(document.querySelectorAll('[data-swipe-x]'));
  var prevButton = document.querySelector('[data-slide-prev]');
  var nextButton = document.querySelector('[data-slide-next]');
  var position = { y: 0 };
  var target = null;
  var streak = 0;
  var touchStart = null;
  var lastWheelTime = 0;
  var lastWheelSize = 0;
  var lastWheelStep = 0;

  // Like a presentation slide, a section a little taller than the screen shrinks to fit it, down to
  // 72%. One taller than that keeps its size and is walked through in steps (see stops). Phones
  // never shrink (the text would get too small to read); tablets and desktops do.
  function fit() {
    slides.forEach(function (slide) { slide.style.removeProperty('--fit'); });
    if (!wide.matches) return;
    slides.forEach(function (slide) {
      var ratio = window.innerHeight / slide.offsetHeight;
      if (ratio < 1 && ratio >= 0.72) slide.style.setProperty('--fit', ratio.toFixed(4));
    });
  }

  function maxScroll() {
    return root.scrollHeight - window.innerHeight;
  }

  // Scroll positions where the page may rest: the top of each slide, the screens inside a tall
  // slide, and the end of the page (the footer). A slide that overflows the screen by less than
  // 8% of it gets no extra stop: that overflow is bottom padding, and a tiny step feels like a
  // stuck slide.
  function stops() {
    var screen = window.innerHeight;
    var list = [];
    slides.forEach(function (slide) {
      // getBoundingClientRect, not offsetHeight: it counts the --fit zoom.
      var box = slide.getBoundingClientRect();
      var top = box.top + window.scrollY;
      var bottom = top + box.height;
      list.push(top);
      if (bottom - screen - top < screen * 0.08) return;
      for (var y = top + screen * 0.85; y < bottom - screen; y += screen * 0.85) list.push(y);
      list.push(bottom - screen);
    });
    list.push(maxScroll());
    return list
      .map(function (y) { return Math.round(Math.min(Math.max(y, 0), maxScroll())); })
      .sort(function (a, b) { return a - b; })
      .filter(function (y, i, all) { return i === 0 || y - all[i - 1] > 4; });
  }

  // A move that starts while another is running picks up from where the page is, aims one stop
  // further and gets shorter: pressing again and again speeds the slides up.
  function goTo(y) {
    var chained = target !== null;
    streak = chained ? streak + 1 : 0;
    target = y;
    position.y = window.scrollY;
    gsap.to(position, {
      y: y,
      duration: reducedMotion.matches ? 0 : Math.max(0.25, 0.6 - streak * 0.1),
      ease: chained ? 'power2.out' : 'power2.inOut',
      overwrite: true,
      onUpdate: function () { window.scrollTo(0, position.y); },
      onComplete: function () { target = null; }
    });
  }

  function step(direction) {
    var from = target !== null ? target : window.scrollY;
    var list = stops();
    var next = direction > 0
      ? list.find(function (y) { return y > from + 2; })
      : list.slice().reverse().find(function (y) { return y < from - 2; });
    if (next !== undefined) goTo(next);
  }

  // A trackpad keeps firing weaker and weaker wheel events after the fingers leave it. A new
  // gesture is a wheel event after a pause, or one at least as strong as the last after 300 ms
  // (a mouse wheel turned again and again, a second push on the trackpad).
  function onWheel(self) {
    var size = Math.abs(self.deltaY);
    var now = Date.now();
    if (size < 2 || Math.abs(self.deltaX) > size) return;
    var fresh = now - lastWheelTime > 160 || (now - lastWheelStep > 300 && size >= lastWheelSize && size >= 10);
    lastWheelTime = now;
    lastWheelSize = size;
    if (!fresh) return;
    lastWheelStep = now;
    step(self.deltaY > 0 ? 1 : -1);
  }

  function isTyping(element) {
    return element && (element.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(element.tagName));
  }

  function onKey(event) {
    if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || isTyping(event.target)) return;
    var keys = { ArrowDown: 1, ArrowRight: 1, PageDown: 1, ArrowUp: -1, ArrowLeft: -1, PageUp: -1 };
    var direction = event.key === ' ' ? (event.shiftKey ? -1 : 1) : keys[event.key];
    if (event.key === 'Home') { event.preventDefault(); goTo(0); return; }
    if (event.key === 'End') { event.preventDefault(); goTo(maxScroll()); return; }
    if (!direction) return;
    event.preventDefault();
    step(direction);
  }

  function onAnchor(event) {
    var link = event.target.closest('a[href^="#"]');
    if (!link) return;
    var target = document.getElementById(link.getAttribute('href').slice(1));
    if (!target) return;
    event.preventDefault();
    goTo(Math.min(target.getBoundingClientRect().top + window.scrollY, maxScroll()));
  }

  // One vertical swipe, one slide. Only the native scroll is blocked: taps still click, two
  // fingers still zoom, and a row marked data-swipe-x (the offers on phones) still scrolls sideways.
  function onTouchStart(event) {
    if (event.touches.length !== 1) { touchStart = null; return; }
    touchStart = { x: event.touches[0].clientX, y: event.touches[0].clientY };
  }

  function onTouchMove(event) {
    if (touchStart === null || !event.cancelable) return;
    if (event.target.closest && event.target.closest('[data-swipe-x]')) return;
    event.preventDefault();
  }

  function onTouchEnd(event) {
    if (touchStart === null) return;
    var dx = touchStart.x - event.changedTouches[0].clientX;
    var dy = touchStart.y - event.changedTouches[0].clientY;
    touchStart = null;
    if (Math.abs(dy) >= 30 && Math.abs(dy) > Math.abs(dx)) step(dy > 0 ? 1 : -1);
  }

  // The hero has its own "Role para descobrir" link, so the buttons only show after it. On phones
  // they also step aside while a card row (offers, cases) passes behind them.
  function coversRow() {
    if (wide.matches) return false;
    var navTop = nav.getBoundingClientRect().top;
    return swipeRows.some(function (row) {
      var box = row.getBoundingClientRect();
      return box.top < window.innerHeight && box.bottom > navTop;
    });
  }

  function updateButtons() {
    var heroEnd = slides[1].getBoundingClientRect().top + window.scrollY;
    nav.classList.toggle('is-away', window.scrollY < heroEnd / 2 || coversRow());
    prevButton.disabled = window.scrollY <= 2;
    nextButton.disabled = window.scrollY >= maxScroll() - 2;
  }

  root.classList.add('slides');
  fit();
  window.addEventListener('resize', fit);
  Observer.create({
    target: window,
    type: 'wheel',
    preventDefault: true,
    onWheel: onWheel
  });
  window.addEventListener('touchstart', onTouchStart, { passive: true });
  window.addEventListener('touchmove', onTouchMove, { passive: false });
  window.addEventListener('touchend', onTouchEnd);
  document.addEventListener('keydown', onKey);
  document.addEventListener('click', onAnchor);
  prevButton.addEventListener('click', function () { step(-1); });
  nextButton.addEventListener('click', function () { step(1); });
  window.addEventListener('scroll', updateButtons, { passive: true });
  window.addEventListener('resize', updateButtons);
  updateButtons();
  nav.hidden = false;
})();
