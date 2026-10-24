// Cards marked data-tilt lean toward the mouse in 3D, up to 8 degrees, and settle back when it
// leaves. Only with a mouse, and never with reduced motion. The card's own rotation (some cards
// are drawn slightly crooked) is kept after the tilt.
(function () {
  var mouse = window.matchMedia('(hover: hover) and (pointer: fine)');
  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  var MAX = 8;
  // The entrance fade (js/reveal.js) also animates opacity and translate; keep them in the list.
  var KEEP = ', opacity .7s cubic-bezier(.22,1,.36,1), translate .7s cubic-bezier(.22,1,.36,1)';

  Array.prototype.slice.call(document.querySelectorAll('[data-tilt]')).forEach(function (card) {
    var base = card.style.transform || '';
    card.addEventListener('pointermove', function (event) {
      if (!mouse.matches || reducedMotion.matches || event.pointerType !== 'mouse') return;
      var box = card.getBoundingClientRect();
      var x = (event.clientX - box.left) / box.width - 0.5;
      var y = (event.clientY - box.top) / box.height - 0.5;
      card.style.transition = 'transform .12s ease-out' + KEEP;
      card.style.transform = 'perspective(900px) rotateX(' + (-y * MAX).toFixed(2) + 'deg) rotateY(' + (x * MAX).toFixed(2) + 'deg) scale(1.02) ' + base;
    });

    card.addEventListener('pointerleave', function () {
      card.style.transition = 'transform .5s cubic-bezier(.22,1,.36,1)' + KEEP;
      card.style.transform = base;
    });
  });
})();
