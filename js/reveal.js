// Each .rv block fades up the first time it enters the screen, while scrolling or sliding.
// Without IntersectionObserver every block shows at once.
(function () {
  var blocks = Array.prototype.slice.call(document.querySelectorAll('.rv'));
  if (!('IntersectionObserver' in window)) {
    blocks.forEach(function (block) { block.classList.add('in'); });
    return;
  }
  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('in');
      observer.unobserve(entry.target);
    });
  }, { rootMargin: '0px 0px -6% 0px', threshold: 0.08 });
  blocks.forEach(function (block) { observer.observe(block); });
})();
