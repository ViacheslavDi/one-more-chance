/* One More Chance on the website: the board as the game draws it (tray, wells, cubes in the game's colors),
   the hero board that builds itself, and a playable game with the real shapes and rules (27.10.2026).
   The shapes, colors and rules are copies of OneMoreChance/Model/Cards.swift and Game.swift. */
(function () {
  "use strict";
  var D = window.OMC || {};
  var IMG = D.img || "assets/img/";
  var T = D.T || {};
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ——— Shapes (Model/Cards.swift, deck v3) ———
  var DECK = [
    [["#"], 4], [["##"], 4], [["###"], 2], [["##", "#."], 2],
    [["####"], 1], [["##", "##"], 1], [["###", ".#."], 1], [["###", "#.."], 2], [[".##", "##."], 1],
    [["##", "##", "#."], 1], [["#.#", "###"], 1], [["###", ".#.", ".#."], 1], [[".#.", "###", ".#."], 1], [["#..", "#..", "###"], 1],
    [["####", "#..."], 1], [["####", ".#.."], 1], [["#####"], 1], [["##..", ".###"], 1],
    [["###", "###"], 1], [["####", "##.."], 1], [["##.", "###", "..#"], 1], [["###", "##.", ".#."], 1], [["###.", ".###"], 1],
    [["#...", "####", "#..."], 1], [["####", "#...", "#..."], 1],
    [["###", "###", "#.."], 1], [["####", "###."], 1], [["##..", "####", "#..."], 1], [["####", "##..", "#..."], 1],
    [["##..", "####", ".#.."], 1], [[".##.", "####", ".#.."], 1]
  ];
  var STARTS = [
    ["####", "####"], ["####", ".##.", ".##."], ["###", "###", ".#.", ".#."], ["#####", ".###."], ["###", "###", "#.#"],
    ["#..#", "####", ".##."], ["####", "#..#", "#..#"], ["#...#", "#####", "..#.."], [".#.#.", "#####", "..#.."], ["#.#", "#.#", "###", ".#."]
  ];

  function parse(rows) {
    var c = [];
    rows.forEach(function (r, y) { for (var x = 0; x < r.length; x++) if (r[x] === "#") c.push([x, y]); });
    return c;
  }
  function norm(cells) {
    var mx = Math.min.apply(null, cells.map(function (c) { return c[0]; }));
    var my = Math.min.apply(null, cells.map(function (c) { return c[1]; }));
    return cells.map(function (c) { return [c[0] - mx, c[1] - my]; }).sort(function (a, b) { return a[1] - b[1] || a[0] - b[0]; });
  }
  function key(cells) { return norm(cells).map(function (c) { return c[0] + "," + c[1]; }).join(";"); }
  function rotR(cells) { return norm(cells.map(function (c) { return [-c[1], c[0]]; })); }
  function rotL(cells) { return norm(cells.map(function (c) { return [c[1], -c[0]]; })); }
  function flip(cells) { return norm(cells.map(function (c) { return [-c[0], c[1]]; })); }
  function orientations(cells) {
    var out = [], seen = {}, c = norm(cells);
    for (var f = 0; f < 2; f++) {
      for (var r = 0; r < 4; r++) { var k = key(c); if (!seen[k]) { seen[k] = 1; out.push(c); } c = rotR(c); }
      c = flip(c);
    }
    return out;
  }
  function canon(cells) { return orientations(cells).map(key).sort()[0]; }
  function size(cells) {
    var w = 0, h = 0;
    cells.forEach(function (c) { w = Math.max(w, c[0] + 1); h = Math.max(h, c[1] + 1); });
    return [w, h];
  }

  // ——— Colors (PieceColor in Cards.swift; the tint is PieceRenderer.apply) ———
  var LOOKS = [[1, 0, "n"], [6, 0, "n"], [4, 0, "n"], [7, 0, "n"], [2, 0, "n"], [5, 0, "n"], [6, -28, "n"], [1, 38, "n"], [6, 0, "d"], [2, 8, "d"], [5, 0, "l"], [3, 0, "n"]];
  var SHAPE_COLORS = [0, 1, 2, 3, 6, 11, 5, 9, 7, 10, 7, 4, 11, 5, 0, 1, 3, 8, 8, 4, 6, 3, 2, 10, 11, 1, 5, 9, 7, 2, 0];
  var CARDS = [];
  DECK.forEach(function (d) { for (var i = 0; i < d[1]; i++) CARDS.push({ id: CARDS.length, cells: norm(parse(d[0])) }); });
  var COLOR = {};
  (function () {
    var next = 0;
    CARDS.slice().sort(function (a, b) { return a.cells.length - b.cells.length || a.id - b.id; }).forEach(function (card) {
      var k = canon(card.cells);
      if (COLOR[k] !== undefined) return;
      COLOR[k] = next < SHAPE_COLORS.length ? SHAPE_COLORS[next] : next % LOOKS.length;
      next++;
    });
  })();
  function lookOf(cells) {
    var k = canon(cells);
    if (COLOR[k] !== undefined) return COLOR[k];
    return cells.reduce(function (s, c) { return s + c[0] * 3 + c[1] * 5; }, cells.length * 7) % LOOKS.length;
  }
  function paint(el, look) {
    if (look === "start") { el.style.backgroundImage = "url(" + IMG + "tile-start.png)"; return; }
    var L = LOOKS[look];
    el.style.backgroundImage = "url(" + IMG + "tile" + L[0] + ".png)";
    var f = [];
    if (L[1]) f.push("hue-rotate(" + L[1] + "deg)");
    if (L[2] === "l") f.push("saturate(.5) brightness(1.2)");
    if (L[2] === "d") f.push("brightness(.7)");
    if (f.length) el.style.filter = f.join(" ");
  }

  // ——— The board, drawn like TileRenderer: the tray art stretched by the theme's numbers, wells, cubes ———
  var TRAY = D.tray || { x0: 29, y0: 38, x1: 1226, y1: 1205, side: 1254 };
  function Board(el, opts) {
    opts = opts || {};
    this.el = el;
    el.classList.add("board");
    var vw = (TRAY.x1 - TRAY.x0) / TRAY.side, vh = (TRAY.y1 - TRAY.y0) / TRAY.side;
    var tray = document.createElement("img");
    tray.className = "tray"; tray.alt = ""; tray.src = IMG + "tray.png";
    tray.style.width = (100 / vw) + "%"; tray.style.height = (100 / vh) + "%";
    tray.style.left = (-TRAY.x0 / TRAY.side / vw * 100) + "%"; tray.style.top = (-TRAY.y0 / TRAY.side / vh * 100) + "%";
    el.appendChild(tray);
    var grid = document.createElement("div"); grid.className = "grid";
    this.wells = [];
    for (var i = 0; i < 81; i++) {
      var w = document.createElement("div"); w.className = "well" + (i === 40 && opts.dot ? " dot" : "");
      grid.appendChild(w); this.wells.push(w);
    }
    el.appendChild(grid);
    this.tiles = document.createElement("div"); this.tiles.className = "tiles"; el.appendChild(this.tiles);
    this.ghostEl = document.createElement("div"); this.ghostEl.className = "ghost"; el.appendChild(this.ghostEl);
    this.cells = new Array(81).fill(null);
  }
  Board.prototype.tile = function (x, y, look, layer, cls) {
    var t = document.createElement("div");
    t.className = "tile" + (cls ? " " + cls : "");
    t.style.left = (x * 100 / 9) + "%"; t.style.top = (y * 100 / 9) + "%";
    paint(t, look);
    (layer || this.tiles).appendChild(t);
    return t;
  };
  Board.prototype.put = function (cells, x, y, look, cls, delay) {
    var self = this;
    cells.forEach(function (c, i) {
      var t = self.tile(x + c[0], y + c[1], look, null, cls);
      if (delay !== undefined) t.style.animationDelay = (delay + i * 0.025) + "s";
      self.cells[(y + c[1]) * 9 + x + c[0]] = look;
    });
    if (this.cells[40] !== null) this.wells[40].classList.remove("dot");
  };
  Board.prototype.clear = function () {
    this.tiles.innerHTML = ""; this.ghostEl.innerHTML = ""; this.cells.fill(null);
    if (this.wells[40]) this.wells[40].classList.add("dot");
  };
  Board.prototype.ghost = function (cells, x, y, look, ok) {
    this.ghostEl.innerHTML = "";
    if (!cells) return;
    var self = this;
    this.ghostEl.classList.toggle("bad", !ok);
    cells.forEach(function (c) { self.tile(x + c[0], y + c[1], look, self.ghostEl); });
  };
  Board.prototype.free = function (cells, x, y) {
    for (var i = 0; i < cells.length; i++) {
      var cx = x + cells[i][0], cy = y + cells[i][1];
      if (cx < 0 || cy < 0 || cx > 8 || cy > 8 || this.cells[cy * 9 + cx] !== null) return false;
    }
    return true;
  };
  Board.prototype.parrot = function () {
    var p = document.createElement("img");
    p.className = "parrot"; p.alt = ""; p.src = IMG + "parrot.png";
    // Feet on the left end of the top bamboo rail, as BoardParrot sits in the game.
    var h = 0.58, w = h * 458 / 1000, fx = 0.694, fy = 0.404, feetX = 0.095, feetY = 0.03;
    p.style.width = (w * 100) + "%";
    p.style.left = ((feetX - fx * w) * 100) + "%"; p.style.top = ((feetY - fy * h) * 100) + "%";
    this.el.appendChild(p);
  };

  // ——— The hero: the board builds itself from the cover's layout, then a piece hovers over its slot ———
  var LAYOUT = D.layout || ["AAA.BB**.", "A...BB**C", ".DD..EECC", ".DD.FFE.C", "H.SSSSS.I", "HH.SSS.II", "H..J...I.", "KKJJJ.LL.", "K...MMLL."];
  function hero(el) {
    var b = new Board(el, {});
    b.parrot();
    var pieces = {}, slot = [];
    LAYOUT.forEach(function (row, y) {
      for (var x = 0; x < 9; x++) {
        var ch = row[x];
        if (ch === ".") continue;
        if (ch === "*") { slot.push([x, y]); continue; }
        (pieces[ch] = pieces[ch] || []).push([x, y]);
      }
    });
    var order = Object.keys(pieces).sort(function (a, b) { return a === "S" ? -1 : b === "S" ? 1 : 0; });
    var t = reduce ? 0 : 0.35;
    order.forEach(function (ch, i) {
      var cells = pieces[ch];
      var look = ch === "S" ? "start" : (D.slots && D.slots[ch] !== undefined ? D.slots[ch] : lookOf(cells));
      cells.forEach(function (c, j) {
        var tile = b.tile(c[0], c[1], look, null, reduce ? "" : "drop");
        if (!reduce) tile.style.animationDelay = (t + i * 0.17 + j * 0.03) + "s";
        b.cells[c[1] * 9 + c[0]] = look;
      });
    });
    var later = reduce ? 0 : (t + order.length * 0.17 + 0.4) * 1000;
    setTimeout(function () {
      slot.forEach(function (c) {
        var s = document.createElement("div"); s.className = "slot";
        s.style.left = (c[0] * 100 / 9) + "%"; s.style.top = (c[1] * 100 / 9) + "%";
        b.tiles.appendChild(s);
      });
      if (!slot.length) return;
      var minX = Math.min.apply(null, slot.map(function (c) { return c[0]; })), minY = Math.min.apply(null, slot.map(function (c) { return c[1]; }));
      var sh = norm(slot), wh = size(sh);
      var fly = document.createElement("div"); fly.className = "flyer";
      fly.style.left = (minX * 100 / 9) + "%"; fly.style.top = (minY * 100 / 9) + "%";
      fly.style.width = (wh[0] * 100 / 9) + "%"; fly.style.height = (wh[1] * 100 / 9) + "%";
      var look = 5;
      sh.forEach(function (c) {
        var tl = document.createElement("div"); tl.className = "tile";
        tl.style.width = (100 / wh[0]) + "%"; tl.style.height = (100 / wh[1]) + "%";
        tl.style.left = (c[0] * 100 / wh[0]) + "%"; tl.style.top = (c[1] * 100 / wh[1]) + "%";
        paint(tl, look); fly.appendChild(tl);
      });
      b.tiles.appendChild(fly);
    }, later);
  }

  // ——— The playable game ———
  function fmt(s) { var a = [].slice.call(arguments, 1), i = 0; return (s || "").replace(/%(\d\$)?(lld|@|d)/g, function (m, n) { return n ? a[parseInt(n, 10) - 1] : a[i++]; }); }
  function shuffle(a) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }

  function Demo(root) {
    this.root = root;
    this.$ = function (id) { return root.querySelector("[data-d=" + id + "]"); };
    this.board = new Board(this.$("board"), { dot: true });
    if (D.parrot) this.board.parrot();
    this.bind();
    this.start();
  }
  Demo.prototype.start = function () {
    this.board.clear();
    this.deck = shuffle(CARDS.slice());
    this.round = 0;
    this.chanceUsed = false;
    this.phase = "start";
    var s = norm(parse(STARTS[Math.floor(Math.random() * STARTS.length)]));
    this.pair = [{ cells: s, start: true }];
    this.sel = 0;
    this.shape = s;
    var wh = size(s);
    this.pos = { x: 4 - Math.floor(wh[0] / 2), y: 4 - Math.floor(wh[1] / 2) };
    this.$("result").hidden = true;
    this.$("play").hidden = false;
    this.render();
  };
  Demo.prototype.look = function () { var c = this.pair[this.sel]; return c && c.start ? "start" : lookOf(this.shape); };
  Demo.prototype.fits = function (cells, x, y) {
    if (!this.board.free(cells, x, y)) return false;
    if (this.phase === "start") return cells.some(function (c) { return x + c[0] === 4 && y + c[1] === 4; });
    return true;
  };
  Demo.prototype.anyFit = function (cells) {
    var os = orientations(cells);
    for (var o = 0; o < os.length; o++) for (var y = 0; y < 9; y++) for (var x = 0; x < 9; x++) if (this.board.free(os[o], x, y)) return true;
    return false;
  };
  Demo.prototype.nextRound = function () {
    if (this.board.cells.every(function (c) { return c !== null; })) return this.over("perfect");
    this.round++;
    if (this.deck.length < 2) return this.over("noShapes");
    this.pair = [this.deck.shift(), this.deck.shift()];
    this.sel = -1; this.shape = null;
    var self = this;
    var ok = this.pair.map(function (c) { return self.anyFit(c.cells); });
    this.fitsAny = ok;
    this.phase = ok[0] || ok[1] ? "pick" : "stuck";
    this.render();
  };
  Demo.prototype.choose = function (i) {
    if (this.phase === "over" || this.phase === "stuck" || this.phase === "start" || this.phase === "chanceOut") return;
    if (this.fitsAny && !this.fitsAny[i]) { this.shakeCard(i); return; }
    this.sel = i;
    // As drawn first; if it fits nowhere that way, the first turn that fits — so «Place» works right away.
    var tries = [this.pair[i].cells].concat(orientations(this.pair[i].cells));
    this.shape = tries[0];
    var wh = size(this.shape);
    this.pos = this.clamp(this.shape, 4 - Math.floor(wh[0] / 2), 4 - Math.floor(wh[1] / 2));
    for (var k = 0; k < tries.length; k++) {
      var w2 = size(tries[k]), p = this.bestNear(tries[k], 4 - Math.floor(w2[0] / 2), 4 - Math.floor(w2[1] / 2), true);
      if (p) { this.shape = tries[k]; this.pos = p; break; }
    }
    this.render();
  };
  Demo.prototype.bestNear = function (cells, x0, y0, strict) {
    var wh = size(cells), best = null, bd = 1e9;
    for (var y = 0; y <= 9 - wh[1]; y++) for (var x = 0; x <= 9 - wh[0]; x++) {
      if (!this.fits(cells, x, y)) continue;
      var d = (x - x0) * (x - x0) + (y - y0) * (y - y0);
      if (d < bd) { bd = d; best = { x: x, y: y }; }
    }
    return best || (strict ? null : this.clamp(cells, x0, y0));
  };
  Demo.prototype.clamp = function (cells, x, y) {
    var wh = size(cells);
    return { x: Math.max(0, Math.min(9 - wh[0], x)), y: Math.max(0, Math.min(9 - wh[1], y)) };
  };
  Demo.prototype.turn = function (fn) {
    if (!this.shape || this.phase === "over") return;
    var wh0 = size(this.shape);
    var cx = this.pos.x + wh0[0] / 2, cy = this.pos.y + wh0[1] / 2;
    this.shape = fn(this.shape);
    var wh = size(this.shape);
    this.pos = this.clamp(this.shape, Math.round(cx - wh[0] / 2), Math.round(cy - wh[1] / 2));
    this.render();
  };
  Demo.prototype.place = function () {
    if (!this.shape || this.phase === "over") return;
    if (!this.fits(this.shape, this.pos.x, this.pos.y)) { this.shake(); return; }
    var look = this.look();
    this.board.put(this.shape, this.pos.x, this.pos.y, look, reduce ? "" : "drop", 0);
    this.board.ghost(null);
    var was = this.phase;
    if (was === "start" || was === "pick" || was === "chancePlace") this.nextRound();
  };
  Demo.prototype.takeChance = function () {
    if (this.phase !== "stuck" || this.chanceUsed) return;
    this.chanceUsed = true;
    // The chance shape comes from the bottom of the deck (Game.chanceFromBottom).
    var card = this.deck.pop();
    if (!card) return this.over("noShapes");
    this.pair = [card];
    if (!this.anyFit(card.cells)) { this.phase = "chanceOut"; this.sel = -1; this.shape = null; this.fitsAny = [false]; this.render();
      var self = this; setTimeout(function () { self.over("chanceOut"); }, 1600); return; }
    this.phase = "chancePlace"; this.fitsAny = [true]; this.sel = -1;
    this.choose(0);
  };
  Demo.prototype.over = function (why) {
    this.phase = "over";
    this.shape = null;
    this.board.ghost(null);
    var empty = this.board.cells.filter(function (c) { return c === null; }).length;
    this.$("play").hidden = true;
    var r = this.$("result");
    r.hidden = false;
    r.querySelector("[data-r=title]").textContent = empty === 0 ? T.perfect : T.gameOver;
    r.querySelector("[data-r=num]").textContent = String(empty);
    r.querySelector("[data-r=why]").textContent = why === "noShapes" ? T.noShapes : why === "chanceOut" || why === "noChances" ? T.noChances : "";
    this.renderHud();
  };
  Demo.prototype.shake = function () {
    var el = this.board.el; el.classList.remove("shake"); void el.offsetWidth; el.classList.add("shake");
  };
  Demo.prototype.shakeCard = function (i) {
    var c = this.$("cards").children[i]; if (!c) return;
    c.animate && c.animate([{ transform: "translateX(-6px)" }, { transform: "translateX(6px)" }, { transform: "none" }], { duration: 260 });
  };
  Demo.prototype.renderHud = function () {
    var empty = this.board.cells.filter(function (c) { return c === null; }).length;
    this.$("empty").textContent = String(empty);
    this.$("round").textContent = this.round ? fmt(T.round, this.round, this.deck.length) : T.startShape;
    this.$("chances").textContent = String(this.chanceUsed ? 0 : 1);
    this.$("chanceChip").classList.toggle("warn", this.chanceUsed);
  };
  Demo.prototype.render = function () {
    this.renderHud();
    var self = this, cards = this.$("cards");
    cards.innerHTML = "";
    cards.classList.toggle("one", this.pair.length < 2);
    this.pair.forEach(function (card, i) {
      var b = document.createElement("button");
      b.type = "button";
      var no = self.fitsAny && self.fitsAny[i] === false && self.phase !== "start";
      b.className = "pcard" + (i === self.sel ? " on" : "") + (no ? " no" : "");
      b.setAttribute("aria-pressed", i === self.sel ? "true" : "false");
      b.setAttribute("aria-label", fmt(T.cells, card.cells.length));
      var wh = size(card.cells), n = Math.max(wh[0], wh[1], 3), mini = document.createElement("div");
      mini.className = "mini";
      mini.style.width = (wh[0] / n * 86) + "%"; mini.style.height = (wh[1] / n * 86) + "%";
      mini.style.aspectRatio = wh[0] + " / " + wh[1];
      card.cells.forEach(function (c) {
        var t = document.createElement("div"); t.className = "tile";
        t.style.width = (100 / wh[0]) + "%"; t.style.height = (100 / wh[1]) + "%";
        t.style.left = (c[0] * 100 / wh[0]) + "%"; t.style.top = (c[1] * 100 / wh[1]) + "%";
        paint(t, card.start ? "start" : lookOf(card.cells));
        mini.appendChild(t);
      });
      b.appendChild(mini);
      b.addEventListener("click", function () { self.choose(i); });
      cards.appendChild(b);
    });
    var tip = "";
    if (this.phase === "start") tip = T.tipStart;
    else if (this.phase === "pick") tip = this.sel < 0 ? T.tipPick : T.tipPlace;
    else if (this.phase === "stuck") tip = this.chanceUsed ? T.noChances : T.tipNoFit;
    else if (this.phase === "chancePlace") tip = T.tipChanceFits;
    else if (this.phase === "chanceOut") tip = T.tipChanceOut;
    this.$("tip").textContent = tip;
    var stuck = this.phase === "stuck";
    this.$("tools").hidden = stuck || this.phase === "chanceOut";
    this.$("chanceBox").hidden = !stuck;
    var cb = this.$("chanceBtn");
    cb.textContent = this.chanceUsed ? T.noChances : T.chance;
    cb.disabled = this.chanceUsed;
    if (stuck && this.chanceUsed) { setTimeout(function () { if (self.phase === "stuck") self.over("noChances"); }, 1400); }
    if (this.shape) this.board.ghost(this.shape, this.pos.x, this.pos.y, this.look(), this.fits(this.shape, this.pos.x, this.pos.y));
    else this.board.ghost(null);
  };
  Demo.prototype.cellAt = function (e) {
    var g = this.board.el.querySelector(".grid").getBoundingClientRect();
    return { x: Math.floor((e.clientX - g.left) / g.width * 9), y: Math.floor((e.clientY - g.top) / g.height * 9) };
  };
  Demo.prototype.moveTo = function (e) {
    if (!this.shape) return;
    var c = this.cellAt(e), wh = size(this.shape);
    var p = this.clamp(this.shape, c.x - Math.floor((wh[0] - 1) / 2), c.y - Math.floor((wh[1] - 1) / 2));
    if (p.x !== this.pos.x || p.y !== this.pos.y) { this.pos = p; this.board.ghost(this.shape, p.x, p.y, this.look(), this.fits(this.shape, p.x, p.y)); }
  };
  Demo.prototype.bind = function () {
    var self = this, el = this.board.el, down = null;
    el.tabIndex = 0;
    el.setAttribute("role", "application");
    el.setAttribute("aria-label", T.boardLabel || "Board");
    el.addEventListener("pointermove", function (e) {
      if (e.pointerType === "mouse" || down) self.moveTo(e);
    });
    el.addEventListener("pointerdown", function (e) {
      down = { x: e.clientX, y: e.clientY, t: e.pointerType };
      if (e.pointerType !== "mouse") { el.setPointerCapture && el.setPointerCapture(e.pointerId); self.moveTo(e); }
    });
    el.addEventListener("pointerup", function (e) {
      var d = down; down = null;
      if (!d) return;
      // A mouse click places the shape; a finger moves it, and «Place» puts it down — as in the game.
      if (d.t === "mouse" && Math.abs(e.clientX - d.x) + Math.abs(e.clientY - d.y) < 8) { self.moveTo(e); self.place(); }
    });
    el.addEventListener("pointercancel", function () { down = null; });
    el.addEventListener("keydown", function (e) {
      if (!self.shape) return;
      var m = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key];
      if (m) { e.preventDefault(); self.pos = self.clamp(self.shape, self.pos.x + m[0], self.pos.y + m[1]); self.render(); }
      else if (e.key === "Enter" || e.key === " ") { e.preventDefault(); self.place(); }
      else if (e.key === "r" || e.key === "R") self.turn(rotR);
      else if (e.key === "f" || e.key === "F") self.turn(flip);
    });
    this.$("rotL").addEventListener("click", function () { self.turn(rotL); });
    this.$("rotR").addEventListener("click", function () { self.turn(rotR); });
    this.$("flip").addEventListener("click", function () { self.turn(flip); });
    this.$("place").addEventListener("click", function () { self.place(); });
    this.$("chanceBtn").addEventListener("click", function () { self.takeChance(); });
    this.$("again").addEventListener("click", function () { self.start(); });
  };

  // ——— Little scenes for the three steps of «How to play», drawn with the same cubes ———
  function shapeEl(rows, look, cell) {
    var cells = norm(parse(rows)), wh = size(cells), el = document.createElement("div");
    el.className = "shape"; el.style.width = (wh[0] * cell) + "px"; el.style.height = (wh[1] * cell) + "px";
    cells.forEach(function (c) {
      var t = document.createElement("div"); t.className = "tile";
      t.style.width = cell + "px"; t.style.height = cell + "px"; t.style.left = (c[0] * cell) + "px"; t.style.top = (c[1] * cell) + "px";
      paint(t, look === undefined ? lookOf(cells) : look); el.appendChild(t);
    });
    return el;
  }
  function mcard(rows, cls) {
    var c = document.createElement("div"); c.className = "mcard" + (cls ? " " + cls : "");
    var n = Math.max(rows.length, rows[0].length);
    c.appendChild(shapeEl(rows, undefined, Math.floor(64 / Math.max(n, 2))));
    return c;
  }
  function watch(el, on, off) {
    if (!("IntersectionObserver" in window)) { on(); return; }
    new IntersectionObserver(function (e) { e[0].isIntersecting ? on() : off && off(); }, { threshold: 0.4 }).observe(el);
  }
  var scenes = {
    pick: function (el) {
      var row = document.createElement("div"); row.className = "mcards";
      var a = mcard(["##.", ".##"]), b = mcard(["###", ".#.", ".#."]);
      row.appendChild(a); row.appendChild(b); el.appendChild(row);
      var k = 0, t = 0;
      var step = function () { a.classList.toggle("on", k === 0); b.classList.toggle("on", k === 1); k = 1 - k; };
      step();
      if (!reduce) watch(el, function () { if (!t) t = setInterval(step, 1800); }, function () { clearInterval(t); t = 0; });
    },
    chance: function (el) {
      var row = document.createElement("div"); row.className = "mcards";
      var no = mcard(["####", "#..."], "no"), ban = document.createElement("i"); ban.className = "ban"; no.appendChild(ban);
      var arrow = document.createElement("div"); arrow.className = "arrow";
      var clover = document.createElement("img"); clover.src = IMG + "clover.png"; clover.alt = ""; arrow.appendChild(clover);
      var yes = mcard(["##", "#."], "new");
      row.appendChild(no); row.appendChild(arrow); row.appendChild(yes); el.appendChild(row);
      if (reduce) { yes.style.opacity = 1; yes.style.transform = "none"; return; }
      var t = 0, run = function () { el.classList.remove("go"); void el.offsetWidth; el.classList.add("go"); };
      watch(el, function () { run(); if (!t) t = setInterval(run, 4200); }, function () { clearInterval(t); t = 0; });
    },
    win: function (el) {
      var b = document.createElement("div"); el.appendChild(b);
      var board = new Board(b, {});
      // The cover's board, nearly full: every empty cell joins a neighbouring shape, two stay empty.
      var g = LAYOUT.map(function (r) { return r.replace(/\*/g, "Z").split(""); });
      var holes = [];
      g.forEach(function (r, y) { r.forEach(function (ch, x) { if (ch === ".") holes.push([x, y]); }); });
      var keep = { "8,0": 1, "5,6": 1 };
      for (var pass = 0; pass < 9; pass++) {
        holes.forEach(function (h) {
          var x = h[0], y = h[1];
          if (g[y][x] !== "." || keep[x + "," + y]) return;
          var n = [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]].filter(function (c) { return c[0] >= 0 && c[1] >= 0 && c[0] < 9 && c[1] < 9; });
          for (var i = 0; i < n.length; i++) { var ch = g[n[i][1]][n[i][0]]; if (ch !== "." && ch !== "S") { g[y][x] = ch; break; } }
        });
      }
      var pieces = {};
      g.forEach(function (r, y) { r.forEach(function (ch, x) { if (ch !== ".") (pieces[ch] = pieces[ch] || []).push([x, y]); }); });
      var order = Object.keys(pieces).sort(function (p, q) { return p === "S" ? -1 : q === "S" ? 1 : 0; });
      var drawAll = function () {
        order.forEach(function (ch, i) {
          var look = ch === "S" ? "start" : ch === "Z" ? 5 : (D.slots && D.slots[ch] !== undefined ? D.slots[ch] : lookOf(pieces[ch]));
          pieces[ch].forEach(function (c, j) {
            var tile = board.tile(c[0], c[1], look, null, reduce ? "" : "drop");
            if (!reduce) tile.style.animationDelay = (i * 0.09 + j * 0.02) + "s";
          });
        });
      };
      var crown = document.createElement("img"); crown.className = "crown"; crown.src = IMG + "crown.png"; crown.alt = ""; el.appendChild(crown);
      var chip = document.createElement("span"); chip.className = "chip";
      chip.innerHTML = '<img src="' + IMG + 'empty.png" alt=""><span></span><b>2</b>';
      chip.querySelector("span").textContent = T.emptyShort || "";
      el.appendChild(chip);
      var done = false;
      watch(el, function () { if (!done) { done = true; drawAll(); } });
    }
  };

  window.OMCGame = { hero: hero, Demo: Demo, Board: Board };
  document.querySelectorAll("[data-hero-board]").forEach(hero);
  document.querySelectorAll("[data-vis]").forEach(function (el) { var f = scenes[el.getAttribute("data-vis")]; if (f) f(el); });
  document.querySelectorAll("[data-demo]").forEach(function (d) { new Demo(d); });
})();
