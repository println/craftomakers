// Card rows on phones (offers, cases). Each row gets dots below it that show the current card and
// jump to a card when tapped. A row with data-start opens on that card (the offers open on the
// landing page, the main offer). A row marked data-autoplay (the cases) moves one card at a time
// on its own, forth to the last card and back to the first, then forth again. It waits while the
// row is off screen, and for a few seconds after the visitor touches it. With reduced motion it
// never moves on its own.
(function () {
  var phone = window.matchMedia('(max-width: 767px)');
  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  var rows = Array.prototype.slice.call(document.querySelectorAll('[data-swipe-x]'));
  var INTERVAL = 3500;
  var PAUSE_AFTER_TOUCH = 6000;

  rows.forEach(function (row) {
    var cards = Array.prototype.slice.call(row.children);
    var visible = false;
    var pausedUntil = 0;
    var direction = 1;

    function start() {
      return row.getBoundingClientRect().left + parseFloat(getComputedStyle(row).scrollPaddingLeft || 0);
    }

    function show(card, behavior) {
      row.scrollTo({ left: row.scrollLeft + card.getBoundingClientRect().left - start(), behavior: behavior });
    }

    function current() {
      if (row.scrollLeft >= row.scrollWidth - row.clientWidth - 4) return cards.length - 1;
      var edge = start();
      var distances = cards.map(function (card) { return Math.abs(card.getBoundingClientRect().left - edge); });
      return distances.indexOf(Math.min.apply(null, distances));
    }

    var dots = document.createElement('div');
    dots.className = 'swipe-dots';
    dots.setAttribute('aria-label', 'Escolher cartão');
    var buttons = cards.map(function (card, index) {
      var button = document.createElement('button');
      button.type = 'button';
      button.setAttribute('aria-label', 'Cartão ' + (index + 1) + ' de ' + cards.length);
      button.addEventListener('click', function () { pause(); show(card, reducedMotion.matches ? 'auto' : 'smooth'); });
      dots.appendChild(button);
      return button;
    });
    row.after(dots);

    function updateDots() {
      var active = current();
      buttons.forEach(function (button, index) { button.setAttribute('aria-current', index === active ? 'true' : 'false'); });
    }
    row.addEventListener('scroll', updateDots, { passive: true });

    function pause() { pausedUntil = Date.now() + PAUSE_AFTER_TOUCH; }
    row.addEventListener('touchstart', pause, { passive: true });
    row.addEventListener('pointerdown', pause);
    row.addEventListener('focusin', pause);

    // Rows marked data-arrows (the offers) also get a faint arrow on each side, hidden at the ends.
    var arrows = [];
    if (row.hasAttribute('data-arrows')) {
      var frame = document.createElement('div');
      frame.className = 'swipe-frame';
      row.before(frame);
      frame.appendChild(row);
      arrows = [-1, 1].map(function (side) {
        var arrow = document.createElement('button');
        arrow.type = 'button';
        arrow.className = 'swipe-arrow ' + (side < 0 ? 'is-prev' : 'is-next');
        arrow.setAttribute('aria-label', side < 0 ? 'Oferta anterior' : 'Próxima oferta');
        arrow.innerHTML = '<svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="' + (side < 0 ? 'M15 6l-6 6 6 6' : 'M9 6l6 6-6 6') + '"></path></svg>';
        arrow.addEventListener('click', function () {
          var target = cards[Math.min(Math.max(current() + side, 0), cards.length - 1)];
          show(target, reducedMotion.matches ? 'auto' : 'smooth');
        });
        frame.appendChild(arrow);
        return arrow;
      });
    }

    function updateArrows() {
      if (!arrows.length) return;
      var active = current();
      arrows[0].hidden = active === 0;
      arrows[1].hidden = active === cards.length - 1;
    }
    row.addEventListener('scroll', updateArrows, { passive: true });

    var first = cards[Number(row.getAttribute('data-start')) || 0];
    if (phone.matches && first) show(first, 'auto');
    updateDots();
    updateArrows();

    if (!row.hasAttribute('data-autoplay')) return;

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        visible = entries[0].isIntersecting;
      }, { threshold: 0.5 }).observe(row);
    }

    function next() {
      var edge = start();
      if (row.scrollLeft >= row.scrollWidth - row.clientWidth - 4) direction = -1;
      if (row.scrollLeft <= 4) direction = 1;
      var card = direction > 0
        ? cards.find(function (item) { return item.getBoundingClientRect().left > edge + 4; })
        : cards.slice().reverse().find(function (item) { return item.getBoundingClientRect().left < edge - 4; });
      if (card) show(card, 'smooth');
    }

    setInterval(function () {
      if (!phone.matches || reducedMotion.matches || !visible || Date.now() < pausedUntil) return;
      next();
    }, INTERVAL);
  });
})();
