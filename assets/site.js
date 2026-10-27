/* One More Chance website (27.10.2026, second design): the header, things that appear and count on scroll, depth
   in the hero, the phone that follows the story of playing together, the theme carousel. */
(function () {
  "use strict";
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return [].slice.call((r || document).querySelectorAll(s)); };

  // ——— Header: solid once the page moves; the menu on narrow screens ———
  var nav = $(".nav");
  function onScrollNav() { if (nav) nav.classList.toggle("solid", window.scrollY > 24 || nav.classList.contains("open")); }
  if (nav) {
    var burger = $(".burger", nav);
    burger && burger.addEventListener("click", function () {
      var open = !nav.classList.contains("open");
      nav.classList.toggle("open", open);
      burger.setAttribute("aria-expanded", open ? "true" : "false");
      onScrollNav();
    });
    $$(".links a", nav).forEach(function (a) { a.addEventListener("click", function () { nav.classList.remove("open"); onScrollNav(); }); });
  }
  document.addEventListener("click", function (e) {
    $$("details.lang[open]").forEach(function (d) { if (!d.contains(e.target)) d.removeAttribute("open"); });
    if (nav && nav.classList.contains("open") && !nav.contains(e.target)) { nav.classList.remove("open"); onScrollNav(); }
  });
  // A language picked here is remembered (the English page sends visitors on to it).
  $$("a[data-l]").forEach(function (a) {
    a.addEventListener("click", function () { try { localStorage.setItem("lang", a.getAttribute("data-l")); } catch (e) {} });
  });

  // ——— Things appear as they come into view ———
  var pending = $$("[data-reveal]");
  function show(el) {
    if (el.classList.contains("in")) return;
    el.classList.add("in");
    $$("[data-count]", el).forEach(count);
    el.dispatchEvent(new CustomEvent("reveal"));
  }
  function sweep() {
    var h = window.innerHeight;
    pending = pending.filter(function (el) {
      var r = el.getBoundingClientRect();
      if (r.top < h * 0.92 && r.bottom > 0) { show(el); return false; }
      return true;
    });
  }
  if (reduce || !("IntersectionObserver" in window)) pending.forEach(show);
  else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { show(e.target); io.unobserve(e.target); } });
    }, { rootMargin: "0px 0px -8% 0px" });
    pending.forEach(function (el) { io.observe(el); });
  }
  function count(el) {
    var to = parseInt(el.getAttribute("data-count"), 10) || 0;
    if (reduce) { el.textContent = String(to); return; }
    var t0 = null, dur = 1400;
    el.textContent = "0";
    requestAnimationFrame(function step(t) {
      if (t0 === null) t0 = t;
      var k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3);
      el.textContent = String(Math.round(to * e));
      if (k < 1) requestAnimationFrame(step);
    });
  }

  // ——— Depth in the hero: the scene, the phones and the cubes move at different speeds ———
  var hero = $(".hero"), heroImg = $(".hero-img"), stack = $(".stack"), cubes = $$(".hero .cube");
  var mx = 0, my = 0, raf = 0;
  function paint() {
    raf = 0;
    var y = window.scrollY;
    onScrollNav();
    sweep();
    if (reduce || !hero) return;
    var hh = hero.offsetHeight;
    if (y > hh) return;
    if (heroImg) heroImg.style.transform = "translate3d(" + (mx * -10) + "px," + (y * 0.28 + my * -8) + "px,0) scale(1.06)";
    if (stack) stack.style.transform = "translate3d(0," + (y * -0.06) + "px,0) rotateY(" + (mx * 5) + "deg) rotateX(" + (my * -4) + "deg)";
    cubes.forEach(function (c) {
      var d = parseFloat(c.getAttribute("data-depth")) || 0.3;
      c.style.transform = "translate3d(" + (mx * d * 46) + "px," + (my * d * 36 - y * d * 0.5) + "px,0)";
    });
  }
  function ask() { if (!raf) raf = requestAnimationFrame(paint); }
  window.addEventListener("scroll", function () { onScrollNav(); ask(); }, { passive: true });
  window.addEventListener("resize", ask);
  if (hero && !reduce && matchMedia("(pointer: fine)").matches) {
    hero.addEventListener("pointermove", function (e) {
      var r = hero.getBoundingClientRect();
      mx = (e.clientX - r.left) / r.width * 2 - 1; my = (e.clientY - r.top) / r.height * 2 - 1;
      ask();
    });
    hero.addEventListener("pointerleave", function () { mx = 0; my = 0; ask(); });
  }
  paint();

  // ——— Playing together: the phone on the side shows the screen of the step being read ———
  var story = $("[data-story]");
  if (story) {
    var steps = $$(".story-step", story), layers = $$(".story-stage .layer", story);
    var setStep = function (i) {
      steps.forEach(function (s, k) { s.classList.toggle("on", k === i); });
      layers.forEach(function (l, k) { l.classList.toggle("on", k === i); });
    };
    setStep(0);
    if ("IntersectionObserver" in window) {
      var so = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) { if (e.isIntersecting) setStep(steps.indexOf(e.target)); });
      }, { rootMargin: "-42% 0px -42% 0px" });
      steps.forEach(function (s) { so.observe(s); });
    }
  }

  // ——— The themes: a carousel of phones; the section takes on the theme's colours ———
  var th = $("[data-themes]");
  if (th) {
    var items = $$(".flow-item", th), dots = $$(".tdot", th), bgs = $$(".th-bg div", th);
    var nameEl = $(".flow-label b", th), tagEl = $(".flow-label .tag", th);
    var n = items.length, at = 0, timer = 0, visible = false, hold = false;
    var place = function () {
      var wide = window.innerWidth;
      var gap = wide < 560 ? 0.52 : wide < 980 ? 0.6 : 0.66;
      items.forEach(function (it, k) {
        var d = k - at;
        if (d > n / 2) d -= n;
        if (d < -n / 2) d += n;
        var a = Math.abs(d), w = it.offsetWidth;
        it.style.transform = "translateX(" + (-w / 2 + d * w * gap) + "px) translateZ(" + (-a * 140) + "px) rotateY(" + (-d * 24) + "deg) scale(" + (1 - Math.min(a, 3) * 0.08) + ")";
        it.style.opacity = a > 2 ? "0" : String(1 - a * 0.22);
        it.style.zIndex = String(20 - a);
        it.style.pointerEvents = a > 2 ? "none" : "auto";
        it.style.filter = a ? "brightness(" + (1 - a * 0.18) + ")" : "none";
        it.setAttribute("aria-current", k === at ? "true" : "false");
        it.tabIndex = k === at ? 0 : -1;
      });
      dots.forEach(function (d, k) { d.classList.toggle("on", k === at); d.setAttribute("aria-pressed", k === at ? "true" : "false"); });
      bgs.forEach(function (b, k) {
        if (k === at && !b.style.backgroundImage) b.style.backgroundImage = "url(" + b.getAttribute("data-bg") + ")";
        b.classList.toggle("on", k === at);
      });
      var cur = items[at];
      if (nameEl) nameEl.textContent = cur.getAttribute("data-name");
      if (tagEl) {
        var free = cur.getAttribute("data-free") === "1";
        tagEl.className = "tag " + (free ? "free" : "prem");
        tagEl.innerHTML = free ? cur.getAttribute("data-tag") : '<img src="' + th.getAttribute("data-lock") + '" alt="">' + cur.getAttribute("data-tag");
      }
    };
    var go = function (k) { at = (k + n) % n; place(); };
    var tick = function () { clearTimeout(timer); if (reduce) return; timer = setTimeout(function () { if (visible && !hold && !document.hidden) go(at + 1); tick(); }, 3800); };
    items.forEach(function (it, k) { it.addEventListener("click", function () { go(k); tick(); }); });
    dots.forEach(function (d, k) { d.addEventListener("click", function () { go(k); tick(); }); });
    $(".flow-nav.prev", th).addEventListener("click", function () { go(at - 1); tick(); });
    $(".flow-nav.next", th).addEventListener("click", function () { go(at + 1); tick(); });
    var flow = $(".flow", th);
    flow.addEventListener("mouseenter", function () { hold = true; });
    flow.addEventListener("mouseleave", function () { hold = false; });
    flow.addEventListener("keydown", function (e) {
      if (e.key === "ArrowLeft") { go(at - 1); tick(); e.preventDefault(); }
      if (e.key === "ArrowRight") { go(at + 1); tick(); e.preventDefault(); }
    });
    var sx = null;
    flow.addEventListener("pointerdown", function (e) { sx = e.clientX; });
    flow.addEventListener("pointerup", function (e) {
      if (sx === null) return;
      var dx = e.clientX - sx; sx = null;
      if (Math.abs(dx) > 40) { go(at + (dx < 0 ? 1 : -1)); tick(); }
    });
    window.addEventListener("resize", place);
    if ("IntersectionObserver" in window) new IntersectionObserver(function (e) { visible = e[0].isIntersecting; }, { threshold: 0.3 }).observe(th);
    else visible = true;
    place(); tick();
  }
})();
