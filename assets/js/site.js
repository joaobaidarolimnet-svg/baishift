/* =========================================================
   Baishift — motor de gráficos SVG e interações do site.
   Sem dependências externas. Tudo desenhado em tempo de execução.
   ========================================================= */
(function () {
"use strict";

var CFG = window.BAISHIFT || {};
var NS = "http://www.w3.org/2000/svg";
var RM = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
var C = { blue: "#1652F0", blueL: "#4D8BFF", orange: "#FF7A1A", green: "#12855A", red: "#D8402F", line: "#DDE5F3", muted: "#5B6E93", ink: "#0A1B3D" };
var MONO = "IBM Plex Mono, monospace", SANS = "Inter, sans-serif", DISP = "Sora, sans-serif";

/* ---------- utilitários ---------- */
function E(n, a) { var e = document.createElementNS(NS, n); for (var k in a) e.setAttribute(k, a[k]); return e; }
function T(a, txt) { var t = E("text", a); t.textContent = txt; return t; }
function br(v, d) { return Number(v).toLocaleString("pt-BR", { minimumFractionDigits: d || 0, maximumFractionDigits: d || 0 }); }
function el(id) { return document.getElementById(id); }
function on(id, fn) { var h = el(id); if (h) fn(h); }
function seeded(seed) { var s = seed >>> 0; return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
function vis(node, fn) {
  if (!("IntersectionObserver" in window)) { fn(); return; }
  var o = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { fn(); o.unobserve(e.target); } }); }, { rootMargin: "0px 0px -6% 0px" });
  o.observe(node);
}
/* laço de animação que só roda com a aba visível e o elemento na tela */
function rafLoop(node, tick) {
  if (RM) return function () {};
  var id = null, onScreen = false, dead = false, io = null;
  function frame(ts) { tick(ts || 0); id = requestAnimationFrame(frame); }
  function start() { if (!dead && id === null && onScreen && !document.hidden) id = requestAnimationFrame(frame); }
  function stop() { if (id !== null) { cancelAnimationFrame(id); id = null; } }
  if ("IntersectionObserver" in window) { io = new IntersectionObserver(function (es) { onScreen = es[0].isIntersecting; onScreen ? start() : stop(); }, { rootMargin: "120px" }); io.observe(node); }
  else { onScreen = true; start(); }
  function onVis() { document.hidden ? stop() : start(); }
  document.addEventListener("visibilitychange", onVis);
  return function () { dead = true; stop(); if (io) io.disconnect(); document.removeEventListener("visibilitychange", onVis); };
}
/* intervalo que pausa com a aba escondida */
function everyMs(ms, fn) {
  if (RM) return;
  var t = null;
  function start() { if (t === null) t = setInterval(fn, ms); }
  function stop() { if (t !== null) { clearInterval(t); t = null; } }
  start();
  document.addEventListener("visibilitychange", function () { document.hidden ? stop() : start(); });
}
function tipEl(h) { var d = document.createElement("div"); d.className = "tip"; h.appendChild(d); return d; }
function show(tip, svg, W, x, y, txt) { var r = svg.getBoundingClientRect(), s = r.width / W; tip.textContent = txt; tip.style.left = (x * s) + "px"; tip.style.top = (y * s) + "px"; tip.classList.add("on"); }
function hide(tip) { tip.classList.remove("on"); }
function hoverable(shape, enter, leave) { shape.addEventListener("pointerenter", enter); shape.addEventListener("pointerleave", leave); shape.addEventListener("pointercancel", leave); }
function grow(node, attr, to, dur) {
  if (RM) { node.setAttribute(attr, to); return; }
  node.style.transition = "none"; void node.getBoundingClientRect();
  node.style.transition = attr + " " + (dur || 900) + "ms cubic-bezier(.22,.75,.3,1)"; node.setAttribute(attr, to);
}

/* ---------- tema escuro: gradientes, brilho e halo ---------- */
var LIGHT = { grid: C.line, muted: C.muted, ink: C.ink, track: C.line, glow: false };
var DARK  = { grid: "rgba(255,255,255,.09)", muted: "rgba(255,255,255,.55)", ink: "#fff", track: "rgba(255,255,255,.1)", glow: true };
function pal(o) { return o.dark ? DARK : LIGHT; }
function tone(c, o) { return o.dark ? ({ "#1652F0": "#4D8BFF", "#12855A": "#5ED9A0", "#FF7A1A": "#FF9A4D", "#D8402F": "#FF6B6B" }[c] || c) : c; }
var UID = 0;
function glow(svg) {
  var id = "fx" + (++UID), d = E("defs"), f = E("filter", { id: id, x: "-20%", y: "-60%", width: "140%", height: "220%" });
  f.appendChild(E("feGaussianBlur", { stdDeviation: 2.4, result: "b" }));
  var m = E("feMerge"); m.appendChild(E("feMergeNode", { in: "b" })); m.appendChild(E("feMergeNode", { in: "SourceGraphic" }));
  f.appendChild(m); d.appendChild(f); svg.appendChild(d); return "url(#" + id + ")";
}
function gradient(svg, color, vertical, a0, a1) {
  var id = "gr" + (++UID), d = E("defs"), g = E("linearGradient", vertical ? { id: id, x1: 0, y1: 0, x2: 0, y2: 1 } : { id: id, x1: 0, y1: 0, x2: 1, y2: 0 });
  g.appendChild(E("stop", { offset: "0%", "stop-color": color, "stop-opacity": a0 })); g.appendChild(E("stop", { offset: "100%", "stop-color": color, "stop-opacity": a1 }));
  d.appendChild(g); svg.appendChild(d); return "url(#" + id + ")";
}
function halo(svg, cx, cy, color) {
  var h = E("circle", { cx: cx, cy: cy, r: 5, fill: color, opacity: .3 });
  if (!RM) { h.appendChild(E("animate", { attributeName: "r", values: "4;11;4", dur: "2.6s", repeatCount: "indefinite" })); h.appendChild(E("animate", { attributeName: "opacity", values: ".35;0;.35", dur: "2.6s", repeatCount: "indefinite" })); }
  svg.appendChild(h);
}

/* ---------- gráfico de linha ---------- */
function lineChart(host, o) {
  var P0 = pal(o), W = o.w || 320, H = o.h || (o.small ? 70 : 132), P = o.small ? 4 : 16, BT = o.labels ? 16 : 6;
  var svg = E("svg", { viewBox: "0 0 " + W + " " + H, role: "img", "aria-label": o.alt || "gráfico de linha" });
  var fx = P0.glow ? glow(svg) : null, all = [];
  o.series.forEach(function (s) { all = all.concat(s.d); });
  var mn = Math.min.apply(null, all), mx = Math.max.apply(null, all), pad = (mx - mn) * .18 || 1;
  mn -= pad; mx += pad;
  var r = mx - mn, IH = H - P - BT;
  if (!o.small) for (var i = 0; i < 4; i++) { var y = P + (IH / 3) * i; svg.appendChild(E("line", { x1: 0, y1: y, x2: W, y2: y, stroke: P0.grid, "stroke-width": 1, "stroke-dasharray": o.dark ? "2 4" : "none" })); }
  var X = function (i, n) { return (i / (n - 1)) * (W - 6) + 3; }, Y = function (v) { return P + IH - ((v - mn) / r) * IH; };
  var f = o.fmt || function (v) { return br(v); };
  o.series.forEach(function (s) {
    var c = tone(s.c, o), d = "", n = s.d.length;
    for (var i = 0; i < n; i++) d += (i ? "L" : "M") + X(i, n).toFixed(1) + " " + Y(s.d[i]).toFixed(1);
    if (!o.small) svg.appendChild(E("path", { d: d + "L" + (W - 3) + " " + (P + IH) + "L3 " + (P + IH) + "Z", fill: o.dark ? gradient(svg, c, true, .38, 0) : c, opacity: o.dark ? 1 : .09 }));
    var p = E("path", { d: d, fill: "none", stroke: c, "stroke-width": o.small ? 1.8 : 2.2, "stroke-linejoin": "round", "stroke-linecap": "round" });
    if (fx) p.setAttribute("filter", fx);
    svg.appendChild(p);
    if (!RM) { var L = p.getTotalLength(); p.setAttribute("stroke-dasharray", L); p.setAttribute("stroke-dashoffset", L); vis(host, function () { p.style.transition = "stroke-dashoffset 1.3s ease"; p.setAttribute("stroke-dashoffset", 0); }); }
    if (o.dark && !o.small) halo(svg, X(n - 1, n), Y(s.d[n - 1]), c);
    svg.appendChild(E("circle", { cx: X(n - 1, n), cy: Y(s.d[n - 1]), r: o.small ? 2.4 : 3.4, fill: c, stroke: o.dark ? "#071433" : "none", "stroke-width": 1.5 }));
    var fs = o.fs || 7.4;
    if (o.end) svg.appendChild(T({ x: X(n - 1, n) - 2, y: Y(s.d[n - 1]) - 9, "text-anchor": "end", "font-family": MONO, "font-size": fs, "font-weight": 600, fill: c }, f(s.d[n - 1])));
    if (o.start) svg.appendChild(T({ x: X(0, n) + 2, y: Y(s.d[0]) - 9, "text-anchor": "start", "font-family": MONO, "font-size": fs, fill: P0.muted }, f(s.d[0])));
  });
  if (o.labels) [0, Math.floor(o.labels.length / 2), o.labels.length - 1].forEach(function (i) {
    svg.appendChild(T({ x: X(i, o.labels.length), y: H - 3, "text-anchor": i === 0 ? "start" : (i === o.labels.length - 1 ? "end" : "middle"), "font-family": MONO, "font-size": 7.6, fill: P0.muted }, o.labels[i]));
  });
  var tip = tipEl(host), n0 = o.series[0].d.length;
  var cross = E("line", { y1: P, y2: P + IH, stroke: o.dark ? "rgba(255,255,255,.5)" : C.blue, "stroke-width": 1, "stroke-dasharray": "3 3", opacity: 0 });
  svg.appendChild(cross);
  svg.addEventListener("pointermove", function (ev) {
    var rc = svg.getBoundingClientRect(), x = (ev.clientX - rc.left) / rc.width * W, i = Math.round((x - 3) / (W - 6) * (n0 - 1)); i = Math.max(0, Math.min(n0 - 1, i));
    cross.setAttribute("x1", X(i, n0)); cross.setAttribute("x2", X(i, n0)); cross.setAttribute("opacity", .6);
    show(tip, svg, W, X(i, n0), Y(o.series[0].d[i]) - 8, o.series.map(function (s) { return (s.k ? s.k + " " : "") + f(s.d[i]); }).join("  ·  "));
  });
  function clear() { cross.setAttribute("opacity", 0); hide(tip); }
  svg.addEventListener("pointerleave", clear); svg.addEventListener("pointercancel", clear);
  host.appendChild(svg);
}

/* ---------- linha ao vivo: a série anda sozinha ---------- */
function liveLine(host, o) {
  var W = o.w || 900, H = o.h || 120, P = 14, BT = 6, IH = H - P - BT, n = o.n || 60, c = tone(o.c || C.green, { dark: 1 });
  var svg = E("svg", { viewBox: "0 0 " + W + " " + H, width: "100%", height: H, role: "img", "aria-label": o.alt || "monitor ao vivo" });
  var fx = glow(svg), fill = gradient(svg, c, true, .35, 0), rnd = seeded(o.seed || 7);
  [0, .5, 1].forEach(function (g) { svg.appendChild(E("line", { x1: 0, x2: W, y1: P + IH * g, y2: P + IH * g, stroke: DARK.grid, "stroke-dasharray": "2 4" })); });
  var data = [], base = o.base || 6200, v = base;
  for (var i = 0; i < n; i++) { v = v * (1 + (rnd() - .48) * .08); v = Math.max(base * .55, Math.min(base * 1.6, v)); data.push(v); }
  var area = E("path", { fill: fill }), line = E("path", { fill: "none", stroke: c, "stroke-width": 2, "stroke-linejoin": "round", "stroke-linecap": "round", filter: fx });
  var dot = E("circle", { r: 3.6, fill: c, stroke: "#071433", "stroke-width": 1.5 });
  var lbl = T({ "text-anchor": "end", "font-family": MONO, "font-size": 9, "font-weight": 600, fill: c }, "");
  svg.appendChild(area); svg.appendChild(line); svg.appendChild(dot); svg.appendChild(lbl);
  var out = o.out;
  function draw() {
    var mn = Math.min.apply(null, data), mx = Math.max.apply(null, data), r = (mx - mn) || 1;
    var X = function (i) { return (i / (n - 1)) * (W - 8) + 4; }, Y = function (val) { return P + IH * .92 - ((val - mn) / r) * IH * .84; }, d = "";
    for (var i = 0; i < n; i++) d += (i ? "L" : "M") + X(i).toFixed(1) + " " + Y(data[i]).toFixed(1);
    line.setAttribute("d", d); area.setAttribute("d", d + "L" + X(n - 1) + " " + (P + IH) + "L4 " + (P + IH) + "Z");
    var last = data[n - 1];
    dot.setAttribute("cx", X(n - 1)); dot.setAttribute("cy", Y(last));
    lbl.setAttribute("x", X(n - 1) - 8); lbl.setAttribute("y", Y(last) - 9); lbl.textContent = "R$ " + br(last);
    if (out) out.textContent = "R$ " + br(last) + " · última hora";
  }
  draw();
  host.appendChild(svg);
  everyMs(o.ms || 1100, function () { v = v * (1 + (Math.random() - .48) * .09); v = Math.max(base * .55, Math.min(base * 1.6, v)); data.push(v); data.shift(); draw(); });
}

/* ---------- barras agrupadas ---------- */
function barChart(host, o) {
  var P0 = pal(o), W = o.w || 320, H = o.h || (o.small ? 70 : 120), P = 6, BT = o.labels ? 14 : 4, IH = H - P - BT;
  var svg = E("svg", { viewBox: "0 0 " + W + " " + H, role: "img", "aria-label": o.alt || "gráfico de barras" });
  var all = o.a.concat(o.b || []), mx = Math.max.apply(null, all) * 1.14, n = o.a.length, bw = (W - 4) / n, tip = tipEl(host);
  var ca = tone(o.ca || C.blue, o), cb = tone(o.cb || C.orange, o), fa = o.dark ? gradient(svg, ca, true, 1, .45) : ca, fb = o.dark ? gradient(svg, cb, true, 1, .45) : cb;
  if (o.dark) [0, .5, 1].forEach(function (g) { var y = P + IH * (1 - g); svg.appendChild(E("line", { x1: 0, x2: W, y1: y, y2: y, stroke: P0.grid, "stroke-dasharray": "2 4" })); });
  for (var i = 0; i < n; i++) (function (i) {
    var x = 2 + i * bw, two = o.b && o.b.length, w = two ? bw * .38 : bw * .6, ha = (o.a[i] / mx) * IH, xa = x + (two ? 1 : bw * .2);
    if (o.dark) svg.appendChild(E("rect", { x: xa, y: P, width: w, height: IH, rx: 2, fill: P0.track, opacity: .6 }));
    var r1 = E("rect", { x: xa, y: P + IH, width: w, height: 0, rx: 2, fill: fa }); svg.appendChild(r1);
    vis(host, function () { grow(r1, "height", ha.toFixed(1), 800); grow(r1, "y", (P + IH - ha).toFixed(1), 800); });
    hoverable(r1, function () { show(tip, svg, W, x + bw * .4, P + IH - ha - 4, (o.ka || "") + " " + br(o.a[i])); }, function () { hide(tip); });
    if (two) {
      var hb = (o.b[i] / mx) * IH, r2 = E("rect", { x: x + bw * .45, y: P + IH, width: w, height: 0, rx: 2, fill: fb, opacity: .9 }); svg.appendChild(r2);
      vis(host, function () { grow(r2, "height", hb.toFixed(1), 800); grow(r2, "y", (P + IH - hb).toFixed(1), 800); });
      hoverable(r2, function () { show(tip, svg, W, x + bw * .65, P + IH - hb - 4, (o.kb || "") + " " + br(o.b[i])); }, function () { hide(tip); });
    }
  })(i);
  if (o.labels && o.labels.length) [[0, o.labels[0]], [n - 1, o.labels[o.labels.length - 1]]].forEach(function (pair) {
    svg.appendChild(T({ x: 2 + pair[0] * bw + bw * .4, y: H - 2, "text-anchor": pair[0] ? "end" : "start", "font-family": MONO, "font-size": 7.4, fill: P0.muted }, pair[1]));
  });
  host.appendChild(svg);
}

/* ---------- barras horizontais ---------- */
function hBar(host, o) {
  var P0 = pal(o), W = o.w || 200, rh = o.rh || 17, H = o.rows.length * rh + 2, fs = o.fs || 6.6, LW = o.lw || 64, VW = o.vw || 32;
  var svg = E("svg", { viewBox: "0 0 " + W + " " + H, role: "img", "aria-label": o.alt || "comparativo" });
  var mx = o.max || Math.max.apply(null, o.rows.map(function (r) { return r.v; }));
  o.rows.forEach(function (r, i) {
    var y = i * rh + 2, bh = Math.max(6, Math.round(rh * .42)), c = tone(r.c || (r.alert ? C.orange : C.blue), o);
    svg.appendChild(T({ x: 0, y: y + rh / 2 + fs * .35, "font-family": MONO, "font-size": fs, fill: P0.muted }, r.k));
    svg.appendChild(E("rect", { x: LW, y: y + rh / 2 - bh / 2, width: W - LW - VW, height: bh, rx: bh / 2, fill: P0.track }));
    var w = (r.v / mx) * (W - LW - VW), bar = E("rect", { x: LW, y: y + rh / 2 - bh / 2, width: 0, height: bh, rx: bh / 2, fill: o.dark ? gradient(svg, c, false, .55, 1) : c });
    svg.appendChild(bar); vis(host, function () { grow(bar, "width", w.toFixed(1), 900); });
    svg.appendChild(T({ x: W, y: y + rh / 2 + fs * .35, "text-anchor": "end", "font-family": MONO, "font-size": fs, "font-weight": 600, fill: r.alert ? tone(C.orange, o) : P0.ink }, r.t || (br(r.v) + "%")));
  });
  host.appendChild(svg);
}

/* ---------- barras pareadas ---------- */
function dualBar(host, o) {
  var P0 = pal(o), narrow = host.clientWidth && host.clientWidth < 480;
  var W = narrow ? Math.min(o.w || 320, 300) : (o.w || 320), rh = o.rh || 30, H = o.rows.length * rh + 4, fs = (o.fs || 7.4) + (narrow ? 1 : 0), LW = o.lw || 92, VW = o.vw || 44;
  var svg = E("svg", { viewBox: "0 0 " + W + " " + H, role: "img", "aria-label": o.alt || "comparativo antes e depois" });
  var mxAll = Math.max.apply(null, o.rows.map(function (r) { return Math.max(r.a, r.b); })), TW = W - LW - VW, tip = tipEl(host), ca = tone(o.ca || C.orange, o), cb = tone(o.cb || C.blue, o);
  o.rows.forEach(function (r, i) {
    var y = i * rh + 2, mx = o.max || (o.norm === "row" ? Math.max(r.a, r.b) : mxAll);
    svg.appendChild(T({ x: 0, y: y + rh / 2 + fs * .35, "font-family": MONO, "font-size": fs, fill: P0.ink }, r.k));
    [[r.a, ca, r.ta, y + rh * .2, 6], [r.b, cb, r.tb, y + rh * .55, 8]].forEach(function (sg) {
      var w = (sg[0] / mx) * TW;
      svg.appendChild(E("rect", { x: LW, y: sg[3], width: TW, height: sg[4], rx: sg[4] / 2, fill: P0.track, opacity: o.dark ? 1 : .7 }));
      var bar = E("rect", { x: LW, y: sg[3], width: 0, height: sg[4], rx: sg[4] / 2, fill: o.dark ? gradient(svg, sg[1], false, .55, 1) : sg[1] });
      svg.appendChild(bar); vis(host, function () { grow(bar, "width", w.toFixed(1), 1000); });
      svg.appendChild(T({ x: W, y: sg[3] + sg[4] / 2 + fs * .35, "text-anchor": "end", "font-family": MONO, "font-size": fs, "font-weight": 600, fill: sg[1] }, sg[2]));
      hoverable(bar, function () { show(tip, svg, W, LW + w, sg[3] - 2, r.k + " · " + sg[2]); }, function () { hide(tip); });
    });
  });
  host.appendChild(svg);
}

/* ---------- rosca ---------- */
function donut(host, o) {
  var W = 200, H = o.h || 108, cx = 54, cy = H / 2, R = 38, th = 13;
  var svg = E("svg", { viewBox: "0 0 " + W + " " + H, role: "img", "aria-label": o.alt || "composição" });
  var tot = o.data.reduce(function (a, b) { return a + b.v; }, 0), a0 = -Math.PI / 2, tip = tipEl(host);
  o.data.forEach(function (s, i) {
    var a1 = a0 + (s.v / tot) * Math.PI * 2, x0 = cx + Math.cos(a0) * R, y0 = cy + Math.sin(a0) * R, x1 = cx + Math.cos(a1) * R, y1 = cy + Math.sin(a1) * R;
    var p = E("path", { d: "M" + x0 + " " + y0 + " A" + R + " " + R + " 0 " + ((a1 - a0) > Math.PI ? 1 : 0) + " 1 " + x1 + " " + y1, fill: "none", stroke: s.c, "stroke-width": th });
    p.style.transition = "stroke-width .2s";
    hoverable(p, function () { p.setAttribute("stroke-width", th + 4); show(tip, svg, W, cx, cy - R - 2, s.k + " " + br(s.v / tot * 100, 1) + "%"); }, function () { p.setAttribute("stroke-width", th); hide(tip); });
    svg.appendChild(p); a0 = a1;
    var ly = 18 + i * 17;
    svg.appendChild(E("rect", { x: 104, y: ly - 6, width: 8, height: 8, rx: 2, fill: s.c }));
    svg.appendChild(T({ x: 117, y: ly + 1, "font-family": MONO, "font-size": 6.8, fill: C.muted }, s.k + " · " + br(s.v / tot * 100, 0) + "%"));
  });
  svg.appendChild(T({ x: cx, y: cy + 2, "text-anchor": "middle", "font-family": DISP, "font-size": 12, "font-weight": 600, fill: C.ink }, o.center || ""));
  svg.appendChild(T({ x: cx, y: cy + 12, "text-anchor": "middle", "font-family": MONO, "font-size": 6, fill: C.muted }, o.sub || ""));
  host.appendChild(svg);
}

/* ---------- mapa de calor ---------- */
function heat(host) {
  var cols = 14, rows = 4, cell = 11, gap = 2.6, W = 200, H = rows * (cell + gap);
  var svg = E("svg", { viewBox: "0 0 " + W + " " + H, role: "img", "aria-label": "recebimentos por dia" }), tip = tipEl(host), rnd = seeded(20260901);
  for (var r = 0; r < rows; r++) for (var c = 0; c < cols; c++) (function (r, c) {
    var v = rnd(), x = c * (cell + gap), y = r * (cell + gap);
    var rect = E("rect", { x: x, y: y, width: cell, height: cell, rx: 2.6, fill: v > .4 ? C.blue : C.line, opacity: v > .4 ? .12 + v * .85 : 1 });
    hoverable(rect, function () { show(tip, svg, W, x + cell / 2, y - 2, "R$ " + br(2400 + v * 7200) + " recebidos"); }, function () { hide(tip); });
    svg.appendChild(rect);
  })(r, c);
  host.appendChild(svg);
}

/* ---------- medidor ---------- */
function gauge(host, o) {
  var P0 = pal(o), W = 200, H = 100, cx = W / 2, cy = 80, R = 58, c = tone(o.c || C.blue, o);
  var svg = E("svg", { viewBox: "0 0 " + W + " " + H, role: "img", "aria-label": (o.k || "medidor") + ": " + o.v + "%" });
  function arc(p) { var a = Math.PI * (1 - p); return [cx + Math.cos(a) * R, cy - Math.sin(a) * R]; }
  var e = arc(1);
  svg.appendChild(E("path", { d: "M" + (cx - R) + " " + cy + " A" + R + " " + R + " 0 0 1 " + e[0] + " " + e[1], fill: "none", stroke: P0.track, "stroke-width": 11, "stroke-linecap": "round" }));
  if (o.dark) for (var k = 0; k <= 10; k++) {
    var a = Math.PI * (1 - k / 10), r0 = R + 9, r1 = R + (k % 5 ? 12 : 15);
    svg.appendChild(E("line", { x1: cx + Math.cos(a) * r0, y1: cy - Math.sin(a) * r0, x2: cx + Math.cos(a) * r1, y2: cy - Math.sin(a) * r1, stroke: k % 5 ? P0.grid : P0.muted, "stroke-width": 1 }));
  }
  var p = o.v / 100, pe = arc(p);
  /* o arco nunca passa de meia-volta: large-arc é sempre 0 */
  var path = E("path", { d: "M" + (cx - R) + " " + cy + " A" + R + " " + R + " 0 0 1 " + pe[0] + " " + pe[1], fill: "none", stroke: c, "stroke-width": 11, "stroke-linecap": "round" });
  if (P0.glow) path.setAttribute("filter", glow(svg));
  var L = Math.PI * R; path.setAttribute("stroke-dasharray", L); path.setAttribute("stroke-dashoffset", L); svg.appendChild(path);
  vis(host, function () { if (RM) { path.setAttribute("stroke-dashoffset", 0); return; } path.style.transition = "stroke-dashoffset 1.1s ease"; path.setAttribute("stroke-dashoffset", 0); });
  if (o.dark) halo(svg, pe[0], pe[1], c);
  svg.appendChild(T({ x: cx, y: cy - 8, "text-anchor": "middle", "font-family": DISP, "font-size": 21, "font-weight": 600, fill: P0.ink }, o.v + "%"));
  svg.appendChild(T({ x: cx, y: cy + 8, "text-anchor": "middle", "font-family": MONO, "font-size": 6.6, fill: P0.muted }, o.k || ""));
  host.appendChild(svg);
}

/* ---------- 01 · caminho dos dados: fontes → emblema BaiShift → decisão ---------- */
var stopPath = null;
function sparkle(svg, x, y, size, color, dur, delay, host) {
  var k = size, q = size * .26;
  var p = E("path", { d: "M0," + (-k) + " L" + q + "," + (-q) + " L" + k + ",0 L" + q + "," + q + " L0," + k + " L" + (-q) + "," + q + " L" + (-k) + ",0 L" + (-q) + "," + (-q) + "Z",
    fill: color, transform: "translate(" + x + " " + y + ")", opacity: .9 });
  if (!RM) {
    p.appendChild(E("animate", { attributeName: "opacity", values: ".25;1;.25", dur: dur + "s", begin: delay + "s", repeatCount: "indefinite" }));
    p.appendChild(E("animateTransform", { attributeName: "transform", type: "rotate", from: "0 0 0", to: "90 0 0", dur: (dur * 2.5) + "s", repeatCount: "indefinite", additive: "sum" }));
  }
  (host || svg).appendChild(p);
}
function filtro(svg, sd, forte) {
  var id = "f" + (++UID), d = E("defs"), f = E("filter", { id: id, x: "-40%", y: "-60%", width: "180%", height: "220%" });
  f.appendChild(E("feGaussianBlur", { stdDeviation: sd, result: "b" }));
  if (forte !== "so") { var m = E("feMerge"); m.appendChild(E("feMergeNode", { in: "b" })); if (forte) m.appendChild(E("feMergeNode", { in: "b" })); m.appendChild(E("feMergeNode", { in: "SourceGraphic" })); f.appendChild(m); }
  d.appendChild(f); svg.appendChild(d); return "url(#" + id + ")";
}
function grad(svg, stops, attrs) {
  var id = "g" + (++UID), d = E("defs"), g = E("linearGradient", Object.assign({ id: id }, attrs || { x1: 0, y1: 0, x2: 0, y2: 1 }));
  stops.forEach(function (st) { g.appendChild(E("stop", st[2] ? { offset: st[0], "stop-color": st[1], "stop-opacity": st[2] } : { offset: st[0], "stop-color": st[1] })); });
  d.appendChild(g); svg.appendChild(d); return "url(#" + id + ")";
}
/* a logo oficial (versão branca sobre navy), em unidades 1500×360 */
function emblema(svg, s, ox, oy) {
  var g = E("g", { transform: "translate(" + ox + " " + oy + ") scale(" + s + ")" });
  g.appendChild(E("rect", { x: 16, y: 16, width: 1468, height: 328, rx: 40, fill: "#0B1440" }));
  var img = E("image", { x: 200, y: 42, width: 1100, height: 283.5, preserveAspectRatio: "xMidYMid meet" });
  var src = (document.querySelector(".brand .lg-white") || {}).getAttribute ? document.querySelector(".brand .lg-white").getAttribute("src") : "assets/marca/01-logo/baishift-branco.svg";
  img.setAttribute("href", src);
  img.setAttributeNS("http://www.w3.org/1999/xlink", "xlink:href", src);
  g.appendChild(img);
  /* a logo processando: um feixe de luz varre o cartão da esquerda para a direita
     e um filete de luz corre pela borda */
  var clipId = "clip" + (++UID), defs = E("defs"), cp = E("clipPath", { id: clipId });
  cp.appendChild(E("rect", { x: 16, y: 16, width: 1468, height: 328, rx: 40 })); defs.appendChild(cp); svg.appendChild(defs);
  /* o feixe tem forma de seta ">" apontando no sentido do fluxo, com borda suave e núcleo mais claro */
  var sweepG = E("g", { "clip-path": "url(#" + clipId + ")" }), mover = E("g");
  function chev(t, d) { var y0 = -90, y1 = 450, ym = 180; return [0, y0, d, ym, 0, y1, t, y1, d + t, ym, t, y0].join(","); }
  /* seta larga e transparente: um degradê que clareia no meio e some nas bordas, desfocado */
  var gid = "sweep" + (++UID), lg = E("linearGradient", { id: gid, x1: 0, y1: 0, x2: 1, y2: 0 });
  [["0%", "#FFFFFF", 0], ["50%", "#DDE9FF", .2], ["100%", "#FFFFFF", 0]].forEach(function (st) { lg.appendChild(E("stop", { offset: st[0], "stop-color": st[1], "stop-opacity": st[2] })); });
  defs.appendChild(lg);
  mover.appendChild(E("polygon", { points: chev(300, 170), fill: "url(#" + gid + ")", filter: filtro(svg, 12, "so") }));
  if (!RM) mover.appendChild(E("animateTransform", { attributeName: "transform", type: "translate", from: "-520 0", to: "1720 0", dur: "4.2s", repeatCount: "indefinite" }));
  sweepG.appendChild(mover); g.appendChild(sweepG);
  var run = E("rect", { x: 16, y: 16, width: 1468, height: 328, rx: 40, fill: "none", stroke: "#9FC0FF", "stroke-width": 6, "stroke-linecap": "round", "stroke-dasharray": "300 3400", opacity: 1, filter: filtro(svg, 4) });
  if (!RM) run.appendChild(E("animate", { attributeName: "stroke-dashoffset", from: 0, to: -3680, dur: "4.2s", repeatCount: "indefinite" }));
  g.appendChild(run);
  svg.appendChild(g);
  var P = function (x, y) { return [ox + x * s, oy + y * s]; };
  return { rings: [P(16, 105), P(16, 155), P(16, 205), P(16, 255)], tips: [P(1484, 180), P(1484, 180)] };
}
function dataPath() {
  var host = el("datapath"); if (!host) return;
  if (stopPath) { stopPath(); stopPath = null; }
  host.innerHTML = "";
  var W = host.clientWidth || 900, narrow = W < 720;
  var S = [{ k: "ERP", n: "ERP", s: "IXC Soft · contratos, OS, fiscal" }, { k: "Omnichannel", n: "Omnichannel", s: "OPA Suite · atendimento" },
           { k: "Recebimentos", n: "Recebim.", s: "boletos, PIX, carteira" }, { k: "Pagamentos", n: "Pagam.", s: "fornecedores, folha, link" }];
  var O = [{ k: "Painel da diretoria", n: "Painel", s: "base, caixa, churn, campo", c: C.green },
           { k: "Indicadores de alta performance", n: "Alta perform.", s: "o que puxar para cima", c: C.green },
           { k: "Indicadores de baixa performance", n: "Baixa perform.", s: "o que precisa de decisão", c: C.orange },
           { k: "Fechamento", n: "Fechamento", s: "auditável até o dia 5", c: C.green }];
  var rows = 4, NH = narrow ? 42 : 58, G = narrow ? 10 : 16, NW, H, s, ox, oy, svg, movers = [], cardW;
  var EW = 1500, EH = 360;
  if (narrow) { NW = (W - 12) / 2; s = W / EW; H = EH * s + 34 + rows * (NH + G) - G + 6; ox = 0; oy = 0; }
  else {
    /* cards largos e legíveis; a logo fica pequena no centro, com espaço de fio dos dois lados */
    NW = Math.min(290, (W - 560) / 2); cardW = Math.min(470, W - 2 * NW - 320); s = cardW / EW;
    H = Math.max(rows * (NH + G) - G + 16, EH * s + 40); ox = (W - cardW) / 2; oy = (H - EH * s) / 2;
  }
  var cy = H / 2, xr = W - NW;
  svg = E("svg", { viewBox: "0 0 " + W + " " + H, width: "100%", height: H, role: "img", "aria-label": "ERP, omnichannel, recebimentos e pagamentos entrando na BaiShift e saindo como painel da diretoria, indicadores e fechamento" });
  if (!narrow) {
    /* barramento: a informação atravessa a tela e passa por baixo da Baishift */
    [-16, 0, 16].forEach(function (dy, k) {
      var bus = E("path", { d: "M" + (NW + 16) + "," + (cy + dy) + " H" + (W - NW - 16), fill: "none", stroke: C.blue, "stroke-width": 1.4, opacity: .22, "stroke-dasharray": "7 11" });
      if (!RM) bus.appendChild(E("animate", { attributeName: "stroke-dashoffset", from: 72, to: 0, dur: (1.3 + k * .25) + "s", repeatCount: "indefinite" }));
      svg.appendChild(bus);
    });
    /* sombra azul suave sob a logo: volume e tecnologia sem alterar a marca */
    svg.appendChild(E("rect", { x: ox + 16 * s, y: oy + 16 * s + 10, width: 1468 * s, height: 328 * s, rx: 40 * s, fill: C.blue, opacity: .28, filter: filtro(svg, 14, "so") }));
  }
  var anc = emblema(svg, s, ox, oy);
  function yAt(i) { return narrow ? EH * s + 34 + i * (NH + G) : cy - (rows * (NH + G) - G) / 2 + i * (NH + G); }
  function node(x, y, d, accent) {
    var g = E("g");
    g.appendChild(E("rect", { x: x, y: y, width: NW, height: NH, rx: 9, fill: "#fff", stroke: C.line, "stroke-width": 1.2 }));
    g.appendChild(E("rect", { x: x, y: y + 9, width: 3, height: NH - 18, rx: 1.5, fill: accent }));
    g.appendChild(T({ x: x + 14, y: y + (narrow ? 17 : 24), "font-family": DISP, "font-size": narrow ? 9.5 : 13.5, "font-weight": 600, fill: C.ink }, narrow ? d.n : d.k));
    g.appendChild(T({ x: x + 14, y: y + (narrow ? 30 : 42), "font-family": SANS, "font-size": narrow ? 7.5 : 10.2, fill: C.muted }, d.s));
    svg.appendChild(g);
  }
  function wire(x0, y0, x1, y1, color, off, vertical) {
    var d = vertical ? "M" + x0 + "," + y0 + " C" + x0 + "," + ((y0 + y1) / 2) + " " + x1 + "," + ((y0 + y1) / 2) + " " + x1 + "," + y1
                     : "M" + x0 + "," + y0 + " C" + ((x0 + x1) / 2) + "," + y0 + " " + ((x0 + x1) / 2) + "," + y1 + " " + x1 + "," + y1;
    var p = E("path", { d: d, fill: "none", stroke: color, "stroke-width": 1.4, opacity: .5 }); svg.appendChild(p);
    for (var k = 0; k < (vertical ? 1 : 2); k++) { var dot = E("circle", { r: 3, fill: color }); svg.appendChild(dot); movers.push({ p: p, dot: dot, len: p.getTotalLength(), off: off + k * 1100 }); }
  }
  if (narrow) {
    /* no celular os fios cruzariam os cards: cada coluna ganha um rótulo e um conector curto animado */
    var hy = EH * s + 22;
    [[NW * .5, C.blue, "ENTRA · FONTES", 0], [xr + NW * .5, C.green, "SAI · DECISÃO", 900]].forEach(function (c) {
      wire(c[0], EH * s * .92, c[0], hy - 10, c[1], c[3], true);
      svg.appendChild(T({ x: c[0], y: hy + 1, "text-anchor": "middle", "font-family": MONO, "font-size": 7, "letter-spacing": 1.4, fill: c[1] }, c[2]));
    });
  }
  S.forEach(function (d, i) {
    var y = yAt(i), r = anc.rings[i];
    if (!narrow) wire(NW, y + NH / 2, r[0], r[1], C.blue, i * 640);
    node(0, y, d, C.blue);
  });
  O.forEach(function (d, i) {
    var y = yAt(i), t = anc.tips[0];
    if (!narrow) wire(t[0], t[1] + (i - 1.5) * 50 * s, xr, y + NH / 2, d.c, 1900 + i * 700);
    node(xr, y, d, d.c);
  });
  host.appendChild(svg);
  stopPath = rafLoop(host, function (ts) {
    movers.forEach(function (m) { var pt = m.p.getPointAtLength(((ts + m.off) / 12) % m.len); m.dot.setAttribute("cx", pt.x); m.dot.setAttribute("cy", pt.y); });
  });
}

/* ---------- 02 · processo ao vivo: negociação → faturamento ---------- */
var STEPS = [
  { k: "Negociação",  n: 320, q: "320", u: "propostas abertas",     t: "2,1 dias" },
  { k: "Viabilidade", n: 296, q: "296", u: "aprovadas em rota",     t: "0,8 dia",  drop: "−24" },
  { k: "Venda",       n: 214, q: "214", u: "contratos fechados",    t: "1,2 dia",  drop: "−82" },
  { k: "Instalação",  n: 169, q: "169", u: "38 parados na fila",    t: "6,4 dias", drop: "−45", alert: 1 },
  { k: "Faturamento", n: 169, q: "169", u: "nota no mesmo ciclo",   t: "0,3 dia",  end: 1 }
];
var stopFlow = null;
function procFlow() {
  var host = el("procflow"); if (!host) return;
  if (stopFlow) { stopFlow(); stopFlow = null; }
  host.innerHTML = "";
  var W = host.clientWidth || 900, horiz = W >= 820, n = STEPS.length, NW, NH, GAP, H;
  if (horiz) { GAP = Math.max(34, W * .04); NW = (W - GAP * (n - 1)) / n; NH = 104; H = NH + 30; }
  else { NW = W; NH = 74; GAP = 38; H = n * NH + (n - 1) * GAP; }
  var svg = E("svg", { viewBox: "0 0 " + W + " " + H, width: "100%", height: H, role: "img", "aria-label": "processo da negociação ao faturamento, com volume, tempo e perda em cada etapa" });
  function pos(i) { return horiz ? { x: i * (NW + GAP), y: 14 } : { x: 0, y: i * (NH + GAP) }; }
  var band = function (c) { return 8 + 26 * (c / STEPS[0].n); }, runners = [];
  for (var i = 0; i < n - 1; i++) {
    var a = pos(i), b = pos(i + 1), st = STEPS[i + 1], warn = st.alert, d;
    if (horiz) {
      var my = a.y + NH / 2, h0 = band(STEPS[i].n), h1 = band(st.n), x0 = a.x + NW, x1 = b.x;
      svg.appendChild(E("path", { d: "M" + x0 + " " + (my - h0 / 2) + " L" + x1 + " " + (my - h1 / 2) + " L" + x1 + " " + (my + h1 / 2) + " L" + x0 + " " + (my + h0 / 2) + "Z", fill: warn ? "rgba(255,122,26,.22)" : "rgba(77,139,255,.22)" }));
      d = "M" + x0 + " " + my + " L" + x1 + " " + my;
      if (st.drop) {
        var mx = (x0 + x1) / 2, wy = my + h1 / 2 + 2;
        svg.appendChild(E("path", { d: "M" + (mx - 6) + " " + wy + " L" + (mx + 6) + " " + wy + " L" + mx + " " + (wy + 13) + "Z", fill: warn ? C.orange : "rgba(255,154,77,.7)" }));
        svg.appendChild(T({ x: mx, y: wy + 26, "text-anchor": "middle", "font-family": MONO, "font-size": 11, "font-weight": 600, fill: warn ? "#FF9A4D" : "rgba(255,255,255,.6)" }, st.drop));
      }
    } else {
      d = "M" + (NW / 2) + " " + (a.y + NH) + " L" + (NW / 2) + " " + b.y;
      svg.appendChild(E("path", { d: d, fill: "none", stroke: warn ? C.orange : "rgba(255,255,255,.22)", "stroke-width": 1.6, "stroke-dasharray": "5 5" }));
      if (st.drop) svg.appendChild(T({ x: NW / 2 + 10, y: (a.y + NH + b.y) / 2 + 4, "font-family": MONO, "font-size": 10.5, fill: warn ? "#FF9A4D" : "rgba(255,255,255,.45)" }, st.drop));
    }
    var track = E("path", { d: d, fill: "none", stroke: "none" }); svg.appendChild(track);
    for (var k = 0; k < 2; k++) { var dot = E("circle", { r: 3.6, fill: warn ? C.orange : "#4D8BFF" }); svg.appendChild(dot); runners.push({ p: track, dot: dot, len: track.getTotalLength(), off: i * 420 + k * 900 }); }
  }
  STEPS.forEach(function (s, i) {
    var p = pos(i), g = E("g"), stroke = s.alert ? C.orange : (s.end ? "#5ED9A0" : "rgba(255,255,255,.2)");
    var fill = s.alert ? "rgba(255,122,26,.10)" : (s.end ? "rgba(94,217,160,.09)" : "rgba(10,27,61,.9)");
    g.appendChild(E("rect", { x: p.x, y: p.y, width: NW, height: NH, rx: 13, fill: fill, stroke: stroke, "stroke-width": 1.3 }));
    g.appendChild(E("rect", { x: p.x, y: p.y + 13, width: 3, height: NH - 26, rx: 2, fill: s.alert ? C.orange : (s.end ? "#5ED9A0" : "#4D8BFF") }));
    var px = p.x + 16, py = p.y + (horiz ? 26 : 24);
    g.appendChild(T({ x: px, y: py, "font-family": DISP, "font-size": 14.5, "font-weight": 600, fill: "#fff" }, s.k));
    g.appendChild(T({ x: px, y: py + (horiz ? 26 : 22), "font-family": MONO, "font-size": horiz ? 16 : 15, fill: s.alert ? "#FFB166" : (s.end ? "#5ED9A0" : "#fff") }, s.q));
    g.appendChild(T({ x: px, y: py + (horiz ? 43 : 39), "font-family": SANS, "font-size": 10.5, fill: "rgba(255,255,255,.55)" }, s.u));
    g.appendChild(T({ x: horiz ? px : (NW - 16), y: horiz ? (p.y + NH - 13) : (py + 39), "text-anchor": horiz ? "start" : "end", "font-family": MONO, "font-size": 9.6, fill: s.alert ? "#FF9A4D" : "rgba(255,255,255,.42)" }, "tempo médio " + s.t));
    if (s.alert) {
      var bw = 64, bx = p.x + NW - bw - 12, by = p.y + 11;
      g.appendChild(E("rect", { x: bx, y: by, width: bw, height: 17, rx: 8.5, fill: C.orange }));
      g.appendChild(T({ x: bx + bw / 2, y: by + 12, "text-anchor": "middle", "font-family": MONO, "font-size": 9, "font-weight": 600, fill: "#3A1704" }, "GARGALO"));
    }
    svg.appendChild(g);
  });
  host.appendChild(svg);
  if (runners.length) stopFlow = rafLoop(host, function (ts) {
    runners.forEach(function (r) { var pt = r.p.getPointAtLength(((ts + r.off) / 16) % r.len); r.dot.setAttribute("cx", pt.x); r.dot.setAttribute("cy", pt.y); });
  });
}

/* ---------- feed de eventos do painel ---------- */
function feed() {
  var host = el("feed"); if (!host) return;
  var EV = [["g", "Cliente ativado · plano 500 Mega"], ["b", "OS 4.812 concluída · equipe B"], ["g", "Boleto pago · R$ 104,90"], ["o", "Fila de instalação · 38 parados"],
            ["b", "Nota fiscal emitida · ciclo 09"], ["g", "PIX recebido · R$ 89,90"], ["r", "Cancelamento · motivo: mudança"], ["b", "Acordo de cobrança · 3 parcelas"],
            ["g", "Viabilidade aprovada · rota 12"], ["o", "Inadimplência · 4,8% (meta 3,5%)"]];
  var idx = 0, MAXR = 4;
  function hora(off) { var d = new Date(Date.now() - off * 1000); return [d.getHours(), d.getMinutes(), d.getSeconds()].map(function (n) { return (n < 10 ? "0" : "") + n; }).join(":"); }
  function row(ev, off) {
    var d = document.createElement("div"), i = document.createElement("i"), s = document.createElement("span"), t = document.createElement("span");
    i.className = ev[0]; s.textContent = ev[1]; t.className = "t"; t.textContent = hora(off);
    d.appendChild(i); d.appendChild(s); d.appendChild(t); return d;
  }
  for (var k = 0; k < MAXR; k++) host.appendChild(row(EV[k], k * 41));
  idx = MAXR;
  everyMs(3100, function () { host.insertBefore(row(EV[idx % EV.length], 0), host.firstChild); idx++; while (host.children.length > MAXR) host.removeChild(host.lastChild); });
}

/* ---------- contadores ---------- */
function counters() {
  Array.prototype.forEach.call(document.querySelectorAll("[data-count]"), function (e) {
    var to = parseFloat(e.getAttribute("data-count")), dec = +(e.getAttribute("data-dec") || 0), pre = e.getAttribute("data-prefix") || "", suf = e.getAttribute("data-suffix") || "";
    var fmt = function (v) { return pre + (v < 0 ? "−" : "") + br(Math.abs(v), dec) + suf; };
    e.textContent = fmt(to);
    if (RM || isNaN(to)) return;
    vis(e, function () { var s = performance.now(); (function step(now) { var p = Math.min((now - s) / 1300, 1), k = 1 - Math.pow(1 - p, 3); e.textContent = fmt(to * k); if (p < 1) requestAnimationFrame(step); })(s); });
  });
}

/* ---------- 03 · painéis com troca de período ---------- */
var M = ["out", "nov", "dez", "jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set"];
var REC = [892, 905, 940, 968, 1002, 1031, 1058, 1090, 1124, 1168, 1205, 1242], DES = [712, 724, 748, 760, 779, 788, 795, 801, 806, 809, 808, 806];
var ATIV = [168, 171, 180, 176, 188, 192, 186, 199, 203, 208, 210, 214], CANC = [122, 131, 128, 119, 124, 116, 109, 102, 98, 94, 89, 86];
var mil = function (v) { return "R$ " + br(v) + " mil"; }, pct1 = function (v) { return br(v, 1) + "%"; }, pct2 = function (v) { return br(v, 2) + "%"; };
function serie(seed, n, a, b) { var r = seeded(seed), out = []; for (var i = 0; i < n; i++) out.push(+(a + (b - a) * (i / (n - 1)) + (r() - .5) * Math.abs(b - a) * .25).toFixed(2)); out[n - 1] = b; return out; }
var D30 = []; for (var i30 = 1; i30 <= 30; i30++) D30.push(String(i30));
var PANELS = {
  "7d":  { nome: "7 dias",   ativ: { d: [26, 31, 29, 34, 38, 36, 41], l: ["seg", "ter", "qua", "qui", "sex", "sáb", "dom"], pv: "235", pd: "+6,3% vs. semana anterior" },
           churn: { d: serie(11, 7, 1.71, 1.62), pv: "1,62%", pd: "−0,09 p.p. na semana" }, inad: { d: serie(12, 7, 5.2, 4.8), pv: "4,8%", pd: "meta 3,5%" },
           prod: [96, 91, 89, 72], cresc: { d: serie(13, 7, 1180, 1242), l: ["seg", "qui", "dom"], pv: "+5,3%", pd: "na semana" } },
  "30d": { nome: "30 dias",  ativ: { d: serie(21, 30, 4, 9).map(Math.round), l: D30, pv: "214", pd: "+9,7% vs. período anterior" },
           churn: { d: serie(22, 30, 1.79, 1.62), pv: "1,62%", pd: "−0,17 p.p. no mês" }, inad: { d: serie(23, 30, 5.6, 4.8), pv: "4,8%", pd: "meta 3,5%" },
           prod: [95, 92, 88, 74], cresc: { d: serie(24, 30, 1205, 1242), l: ["1", "15", "30"], pv: "+3,1%", pd: "no mês" } },
  "12m": { nome: "12 meses", ativ: { d: ATIV, l: M, pv: "214", pd: "+9,7% vs. período anterior" },
           churn: { d: [2.02, 1.94, 1.88, 1.79, 1.71, 1.62], pv: "1,62%", pd: "−0,4 p.p. no semestre" }, inad: { d: [6.9, 6.4, 6.0, 5.6, 5.2, 4.8], pv: "4,8%", pd: "meta 3,5%" },
           prod: [96, 92, 88, 74], cresc: { d: REC, l: M, pv: "+31,5%", pd: "em 12 meses" } }
};
function renderPanels(per) {
  var P = PANELS[per]; if (!P) return;
  Array.prototype.forEach.call(document.querySelectorAll(".panel[data-panel]"), function (pn) {
    var kind = pn.getAttribute("data-panel"), host = pn.querySelector(".chart"), pv = pn.querySelector(".pv"), pd = pn.querySelector(".pd"), span = pn.querySelector(".per");
    host.innerHTML = "";
    if (span) span.textContent = P.nome;
    if (kind === "ativ") { barChart(host, { dark: 1, w: 240, h: 82, a: P.ativ.d, ca: C.green, ka: "ativações", labels: P.ativ.l, alt: "ativações no período" }); pv.textContent = P.ativ.pv; pd.textContent = P.ativ.pd; }
    if (kind === "churn") { lineChart(host, { dark: 1, w: 240, h: 82, end: true, start: true, alt: "churn no período", series: [{ d: P.churn.d, c: C.blue }], fmt: pct2 }); pv.textContent = P.churn.pv; pd.textContent = P.churn.pd; }
    if (kind === "inad") { lineChart(host, { dark: 1, w: 240, h: 82, end: true, start: true, alt: "inadimplência no período", series: [{ d: P.inad.d, c: C.orange }], fmt: pct1 }); pv.textContent = P.inad.pv; pd.textContent = P.inad.pd; }
    if (kind === "prod") { hBar(host, { dark: 1, rh: 18, alt: "produtividade por equipe", rows: ["A", "B", "C", "D"].map(function (q, i) { return { k: "EQUIPE " + q, v: P.prod[i], t: P.prod[i] + "%", alert: P.prod[i] < 85 ? 1 : 0 }; }) }); pv.textContent = Math.round(P.prod.reduce(function (a, b) { return a + b; }, 0) / 4) + "%"; }
    if (kind === "cresc") { lineChart(host, { dark: 1, w: 240, h: 82, labels: P.cresc.l, end: true, start: true, alt: "receita no período", series: [{ d: P.cresc.d, c: C.blue }], fmt: mil }); pv.textContent = P.cresc.pv; pd.textContent = P.cresc.pd; }
    if (kind === "gauge") { gauge(host, { dark: 1, v: 75, k: "controles no ar", c: C.green }); }
  });
}

/* ================= INTERFACE ================= */

/* menu mobile */
(function () {
  var toggle = el("navtoggle"), menu = el("navlinks"); if (!toggle || !menu) return;
  function close() { menu.classList.remove("open"); toggle.setAttribute("aria-expanded", "false"); document.body.classList.remove("nav-open"); }
  toggle.addEventListener("click", function () { var open = menu.classList.toggle("open"); toggle.setAttribute("aria-expanded", open ? "true" : "false"); document.body.classList.toggle("nav-open", open); });
  menu.addEventListener("click", function (e) { if (e.target.closest("a")) close(); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") close(); });
  window.addEventListener("resize", function () { if (window.innerWidth > 900) close(); });
})();

/* menu "Outros" */
(function () {
  var dd = el("dd"); if (!dd) return;
  var btn = dd.querySelector(".ddb");
  function set(open) { dd.classList.toggle("open", open); btn.setAttribute("aria-expanded", open ? "true" : "false"); }
  btn.addEventListener("click", function () { set(!dd.classList.contains("open")); });
  document.addEventListener("click", function (e) { if (!dd.contains(e.target)) set(false); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") set(false); });
})();

/* barra: tema sobre o hero, progresso e seção ativa */
(function () {
  var bar = el("bar"), prog = el("prog"), hero = document.querySelector(".hero");
  var links = Array.prototype.slice.call(document.querySelectorAll('.navlinks > a[href^="#"]:not(.cta)'));
  var targets = links.map(function (a) { return el(a.getAttribute("href").slice(1)); }), ticking = false;
  function update() {
    ticking = false;
    var h = document.documentElement, top = window.pageYOffset || h.scrollTop;
    if (prog) prog.style.width = ((top / ((h.scrollHeight - h.clientHeight) || 1)) * 100) + "%";
    if (bar) bar.classList.toggle("on-dark", hero ? top < hero.offsetTop + hero.offsetHeight - 62 : false);
    var mark = top + 120, active = -1;
    targets.forEach(function (t, i) { if (t && t.offsetTop <= mark) active = i; });
    links.forEach(function (a, i) { i === active ? a.setAttribute("aria-current", "true") : a.removeAttribute("aria-current"); });
  }
  window.addEventListener("scroll", function () { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
  window.addEventListener("resize", update);
  update();
})();

/* revelação ao rolar */
(function () {
  var nodes = document.querySelectorAll(".rv");
  if (!("IntersectionObserver" in window)) { Array.prototype.forEach.call(nodes, function (e) { e.classList.add("in"); }); return; }
  var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }); }, { rootMargin: "0px 0px -8% 0px" });
  Array.prototype.forEach.call(nodes, function (e) { io.observe(e); });
})();

/* WhatsApp, formulário do diagnóstico e formulários de lista */
(function () {
  var MSG = "Olá! Quero agendar o diagnóstico de gestão do provedor.";
  function waLink(msg) { var n = String(CFG.whatsapp || "").replace(/\D/g, ""); return n ? "https://wa.me/" + n + "?text=" + encodeURIComponent(msg) : null; }
  Array.prototype.forEach.call(document.querySelectorAll("[data-whatsapp]"), function (a) {
    var l = waLink(a.getAttribute("data-whatsapp") || MSG);
    if (l) { a.href = l; a.target = "_blank"; a.rel = "noopener"; return; }
    a.href = a.getAttribute("data-fallback-href") || "#contato"; a.classList.add("mail");
    var f = a.getAttribute("data-fallback"), sp = a.querySelector("span"); if (f) (sp || a).textContent = f;
  });
  var mail = CFG.email || "contato@baishift.com.br";
  var form = el("lead");
  if (form) {
    var note = el("fnote"), ok = el("fok");
    if (note) note.textContent = waLink("x") ? "Abre o WhatsApp com a mensagem pronta." : "Abre o seu e-mail com a mensagem pronta para enviar.";
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!form.checkValidity()) { form.reportValidity(); return; }
      var d = new FormData(form), g = function (k) { return String(d.get(k) || "").trim(); };
      var linhas = [MSG, "", "Nome: " + g("nome"), "Provedor: " + g("provedor"), "Cidade/UF: " + (g("cidade") || "—"), "Assinantes: " + g("assinantes"), "Sistema: " + g("sistema")];
      if (g("msg")) linhas.push("", "Como funciona hoje: " + g("msg"));
      var msg = linhas.join("\n"), l = waLink(msg);
      if (l) window.open(l, "_blank", "noopener"); else location.href = "mailto:" + mail + "?subject=" + encodeURIComponent("Diagnóstico de gestão · " + g("provedor")) + "&body=" + encodeURIComponent(msg);
      if (ok) ok.hidden = false;
    });
  }
  /* formulários simples (lista de espera das outras soluções): abrem o e-mail com os campos */
  Array.prototype.forEach.call(document.querySelectorAll("form[data-mail]"), function (f) {
    f.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!f.checkValidity()) { f.reportValidity(); return; }
      var d = new FormData(f), linhas = [];
      d.forEach(function (v, k) { if (String(v).trim()) linhas.push(k.charAt(0).toUpperCase() + k.slice(1) + ": " + String(v).trim()); });
      location.href = "mailto:" + mail + "?subject=" + encodeURIComponent(f.getAttribute("data-mail")) + "&body=" + encodeURIComponent(linhas.join("\n"));
      var ok2 = f.querySelector(".ok"); if (ok2) ok2.hidden = false;
    });
  });
})();

var yr = el("yr"); if (yr) yr.textContent = new Date().getFullYear();

/* ================= MONTAGEM DOS GRÁFICOS ================= */
try {
  /* hero */
  on("cRec", function (h) { lineChart(h, { w: 340, h: 126, labels: M, end: true, fs: 7, alt: "receita e despesa nos últimos 12 meses", series: [{ d: REC, c: C.blue, k: "receita" }, { d: DES, c: C.orange, k: "despesa" }], fmt: mil }); });
  on("cBase", function (h) { barChart(h, { w: 340, h: 86, a: ATIV, b: CANC, ca: C.green, cb: C.red, ka: "ativações", kb: "cancelamentos", labels: M, alt: "ativações e cancelamentos por mês" }); });
  on("cDonut", function (h) { donut(h, { center: "R$ 1,24 mi", sub: "receita do mês", alt: "composição da receita", data: [{ k: "Internet", v: 74, c: C.blue }, { k: "SVA", v: 14, c: C.orange }, { k: "Instalação", v: 7, c: C.green }, { k: "Outros", v: 5, c: "#9AB4E8" }] }); });
  on("cHeat", heat);
  feed();

  /* 01 · diagnóstico */
  dataPath();
  counters();

  /* 02 · processos */
  procFlow();

  /* 03 · dashboard */
  on("phChart", function (h) { lineChart(h, { small: 1, w: 200, h: 44, series: [{ d: [26, 31, 29, 34, 38, 36, 41], c: C.green }], fmt: function (v) { return br(v) + " ativações"; } }); });
  on("monitor", function (h) { liveLine(h, { w: Math.max(600, h.clientWidth || 900), h: 110, n: 64, base: 6200, out: el("monNow"), alt: "recebimentos chegando, minuto a minuto" }); });
  renderPanels("12m");
  Array.prototype.forEach.call(document.querySelectorAll(".seg [data-periodo]"), function (b) {
    b.addEventListener("click", function () {
      Array.prototype.forEach.call(b.parentNode.children, function (x) { x.setAttribute("aria-pressed", x === b ? "true" : "false"); });
      renderPanels(b.getAttribute("data-periodo"));
    });
  });
  on("dAfter", function (h) { dualBar(h, { dark: 1, w: 360, rh: 34, fs: 8, lw: 118, vw: 52, norm: "row", alt: "quatro indicadores antes e depois de seis meses de rito",
    rows: [{ k: "Inadimplência", a: 6.9, b: 4.8, ta: "6,9%", tb: "4,8%" }, { k: "Churn mensal", a: 2.02, b: 1.62, ta: "2,02%", tb: "1,62%" }, { k: "Fechamento", a: 20, b: 5, ta: "dia 20", tb: "dia 5" }, { k: "Fila de instalação", a: 38, b: 6, ta: "38", tb: "6" }] }); });

  /* KPIs do hero com variação leve */
  var K = [{ id: "k1", v: 12480, f: "int", vol: .004 }, { id: "k2", v: 1242000, f: "brl", vol: .012 }, { id: "k3", v: 35.1, f: "pct", vol: .02 }, { id: "k4", v: 1.62, f: "pct2", vol: .03 }, { id: "k5", v: 4.8, f: "pct", vol: .03 }, { id: "k6", v: 99.4, f: "money", vol: .01 }];
  var fm = function (v, f) { if (f === "brl") return v >= 1e6 ? "R$ " + br(v / 1e6, 2) + " mi" : "R$ " + br(v / 1000) + " mil"; if (f === "pct") return br(v, 1) + "%"; if (f === "pct2") return br(v, 2) + "%"; if (f === "money") return "R$ " + br(v, 2); return br(v); };
  K.forEach(function (k) { var e = el(k.id); if (e) e.textContent = fm(k.v, k.f); });
  everyMs(2900, function () {
    K.forEach(function (k) {
      var e = el(k.id); if (!e) return;
      var from = k.v, to = k.v * (1 + (Math.random() - .5) * k.vol), s = performance.now();
      (function step(now) { var p = Math.min((now - s) / 620, 1); e.textContent = fm(from + (to - from) * p, k.f); if (p < 1) requestAnimationFrame(step); })(s);
      k.v = to;
    });
  });

  /* desenhos que dependem da largura */
  var rt = null, lastW = window.innerWidth;
  window.addEventListener("resize", function () {
    if (window.innerWidth === lastW) return;
    lastW = window.innerWidth; clearTimeout(rt);
    rt = setTimeout(function () { dataPath(); procFlow(); }, 220);
  });
} catch (err) {
  if (window.console && console.error) console.error("Baishift · falha ao montar os gráficos:", err);
}

})();
