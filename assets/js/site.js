/* =========================================================
   Baishift — motor de gráficos SVG e interações do site.
   Sem dependências externas. Tudo desenhado em tempo de execução.
   ========================================================= */
(function () {
"use strict";

var CFG = window.BAISHIFT || {};
var NS = "http://www.w3.org/2000/svg";
var RM = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
var C = {
  blue: "#1652F0", blueL: "#4D8BFF", orange: "#FF7A1A", green: "#12855A", red: "#D8402F",
  line: "#DDE5F3", muted: "#5B6E93", ink: "#0A1B3D", soft: "#E8EFFE"
};
var MONO = "IBM Plex Mono, monospace", SANS = "Inter, sans-serif", DISP = "Sora, sans-serif";

/* ---------- utilitários ---------- */
function E(n, a) {
  var e = document.createElementNS(NS, n);
  for (var k in a) e.setAttribute(k, a[k]);
  return e;
}
function T(a, txt) { var t = E("text", a); t.textContent = txt; return t; }
function br(v, d) {
  return Number(v).toLocaleString("pt-BR", { minimumFractionDigits: d || 0, maximumFractionDigits: d || 0 });
}
function el(id) { return document.getElementById(id); }
function on(id, fn) { var h = el(id); if (h) fn(h); }

/* gerador pseudoaleatório com semente: o mesmo desenho a cada carregamento */
function seeded(seed) {
  var s = seed >>> 0;
  return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

/* dispara uma vez quando o elemento entra na tela */
function vis(node, fn) {
  if (!("IntersectionObserver" in window)) { fn(); return; }
  var o = new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (e.isIntersecting) { fn(); o.unobserve(e.target); } });
  }, { rootMargin: "0px 0px -6% 0px" });
  o.observe(node);
}

/* laço de animação que só roda com a aba visível e o elemento na tela */
function rafLoop(node, tick) {
  if (RM) return function () {};
  var id = null, onScreen = false, dead = false;
  function frame(ts) { tick(ts || 0); id = requestAnimationFrame(frame); }
  function start() { if (!dead && id === null && onScreen && !document.hidden) id = requestAnimationFrame(frame); }
  function stop() { if (id !== null) { cancelAnimationFrame(id); id = null; } }
  var io = null;
  if ("IntersectionObserver" in window) {
    io = new IntersectionObserver(function (es) { onScreen = es[0].isIntersecting; onScreen ? start() : stop(); }, { rootMargin: "120px" });
    io.observe(node);
  } else { onScreen = true; start(); }
  function onVis() { document.hidden ? stop() : start(); }
  document.addEventListener("visibilitychange", onVis);
  return function () { dead = true; stop(); if (io) io.disconnect(); document.removeEventListener("visibilitychange", onVis); };
}

/* ---------- tooltip ---------- */
function tipEl(h) { var d = document.createElement("div"); d.className = "tip"; h.appendChild(d); return d; }
function show(tip, svg, W, x, y, txt) {
  var r = svg.getBoundingClientRect(), s = r.width / W;
  tip.textContent = txt; tip.style.left = (x * s) + "px"; tip.style.top = (y * s) + "px"; tip.classList.add("on");
}
function hide(tip) { tip.classList.remove("on"); }
function hoverable(shape, enter, leave) {
  shape.addEventListener("pointerenter", enter);
  shape.addEventListener("pointerleave", leave);
  shape.addEventListener("pointercancel", leave);
}

/* transição de atributo SVG */
function grow(node, attr, to, dur) {
  if (RM) { node.setAttribute(attr, to); return; }
  node.style.transition = "none";
  void node.getBoundingClientRect();
  node.style.transition = attr + " " + (dur || 900) + "ms cubic-bezier(.22,.75,.3,1)";
  node.setAttribute(attr, to);
}

/* ---------- gráfico de linha ---------- */
function lineChart(host, o) {
  var W = o.w || 320, H = o.h || (o.small ? 70 : 132), P = o.small ? 4 : 16, BT = o.labels ? 16 : 6;
  var svg = E("svg", { viewBox: "0 0 " + W + " " + H, role: "img", "aria-label": o.alt || "gráfico de linha" });
  var all = [];
  o.series.forEach(function (s) { all = all.concat(s.d); });
  var mn = Math.min.apply(null, all), mx = Math.max.apply(null, all), pad = (mx - mn) * .18 || 1;
  mn -= pad; mx += pad;
  var r = mx - mn, IH = H - P - BT;
  if (!o.small) for (var i = 0; i < 4; i++) {
    var y = P + (IH / 3) * i;
    svg.appendChild(E("line", { x1: 0, y1: y, x2: W, y2: y, stroke: C.line, "stroke-width": 1 }));
  }
  var X = function (i, n) { return (i / (n - 1)) * (W - 6) + 3; };
  var Y = function (v) { return P + IH - ((v - mn) / r) * IH; };
  var f = o.fmt || function (v) { return br(v); };

  o.series.forEach(function (s) {
    var d = "", n = s.d.length;
    for (var i = 0; i < n; i++) d += (i ? "L" : "M") + X(i, n).toFixed(1) + " " + Y(s.d[i]).toFixed(1);
    if (!o.small) svg.appendChild(E("path", { d: d + "L" + (W - 3) + " " + (P + IH) + "L3 " + (P + IH) + "Z", fill: s.c, opacity: .09 }));
    var p = E("path", { d: d, fill: "none", stroke: s.c, "stroke-width": o.small ? 1.8 : 2.2, "stroke-linejoin": "round", "stroke-linecap": "round" });
    svg.appendChild(p);
    if (!RM) {
      var L = p.getTotalLength();
      p.setAttribute("stroke-dasharray", L); p.setAttribute("stroke-dashoffset", L);
      vis(host, function () { p.style.transition = "stroke-dashoffset 1.3s ease"; p.setAttribute("stroke-dashoffset", 0); });
    }
    svg.appendChild(E("circle", { cx: X(n - 1, n), cy: Y(s.d[n - 1]), r: o.small ? 2.4 : 3.4, fill: s.c }));
    /* valores escritos nas pontas da linha */
    var fs = o.fs || 7.4;
    if (o.end) svg.appendChild(T({ x: X(n - 1, n) - 2, y: Y(s.d[n - 1]) - 8, "text-anchor": "end", "font-family": MONO, "font-size": fs, "font-weight": 600, fill: s.c }, f(s.d[n - 1])));
    if (o.start) svg.appendChild(T({ x: X(0, n) + 2, y: Y(s.d[0]) - 8, "text-anchor": "start", "font-family": MONO, "font-size": fs, fill: C.muted }, f(s.d[0])));
  });
  if (o.labels) {
    [0, Math.floor(o.labels.length / 2), o.labels.length - 1].forEach(function (i) {
      svg.appendChild(T({ x: X(i, o.labels.length), y: H - 3, "text-anchor": i === 0 ? "start" : (i === o.labels.length - 1 ? "end" : "middle"),
        "font-family": MONO, "font-size": 7.6, fill: C.muted }, o.labels[i]));
    });
  }
  var tip = tipEl(host), n0 = o.series[0].d.length;
  var cross = E("line", { y1: P, y2: P + IH, stroke: C.blue, "stroke-width": 1, "stroke-dasharray": "3 3", opacity: 0 });
  svg.appendChild(cross);
  svg.addEventListener("pointermove", function (ev) {
    var rc = svg.getBoundingClientRect(), x = (ev.clientX - rc.left) / rc.width * W;
    var i = Math.round((x - 3) / (W - 6) * (n0 - 1)); i = Math.max(0, Math.min(n0 - 1, i));
    cross.setAttribute("x1", X(i, n0)); cross.setAttribute("x2", X(i, n0)); cross.setAttribute("opacity", .6);
    show(tip, svg, W, X(i, n0), Y(o.series[0].d[i]) - 8, o.series.map(function (s) { return (s.k ? s.k + " " : "") + f(s.d[i]); }).join("  ·  "));
  });
  function clear() { cross.setAttribute("opacity", 0); hide(tip); }
  svg.addEventListener("pointerleave", clear); svg.addEventListener("pointercancel", clear);
  host.appendChild(svg);
}

/* ---------- barras agrupadas ---------- */
function barChart(host, o) {
  var W = o.w || 320, H = o.h || (o.small ? 70 : 120), P = 6, BT = o.labels ? 14 : 4, IH = H - P - BT;
  var svg = E("svg", { viewBox: "0 0 " + W + " " + H, role: "img", "aria-label": o.alt || "gráfico de barras" });
  var all = o.a.concat(o.b || []), mx = Math.max.apply(null, all) * 1.14;
  var n = o.a.length, bw = (W - 4) / n, tip = tipEl(host);
  for (var i = 0; i < n; i++) (function (i) {
    var x = 2 + i * bw, two = o.b && o.b.length, w = two ? bw * .38 : bw * .6, ha = (o.a[i] / mx) * IH;
    var r1 = E("rect", { x: x + (two ? 1 : bw * .2), y: P + IH, width: w, height: 0, rx: 2, fill: o.ca || C.blue });
    svg.appendChild(r1);
    vis(host, function () { grow(r1, "height", ha.toFixed(1), 800); grow(r1, "y", (P + IH - ha).toFixed(1), 800); });
    hoverable(r1, function () { show(tip, svg, W, x + bw * .4, P + IH - ha - 4, (o.ka || "") + " " + br(o.a[i])); }, function () { hide(tip); });
    if (two) {
      var hb = (o.b[i] / mx) * IH;
      var r2 = E("rect", { x: x + bw * .45, y: P + IH, width: w, height: 0, rx: 2, fill: o.cb || C.orange, opacity: .9 });
      svg.appendChild(r2);
      vis(host, function () { grow(r2, "height", hb.toFixed(1), 800); grow(r2, "y", (P + IH - hb).toFixed(1), 800); });
      hoverable(r2, function () { show(tip, svg, W, x + bw * .65, P + IH - hb - 4, (o.kb || "") + " " + br(o.b[i])); }, function () { hide(tip); });
    }
  })(i);
  /* rótulos nas extremidades: primeiro e último da lista, seja qual for o tamanho dela */
  if (o.labels && o.labels.length) [[0, o.labels[0]], [n - 1, o.labels[o.labels.length - 1]]].forEach(function (pair) {
    svg.appendChild(T({ x: 2 + pair[0] * bw + bw * .4, y: H - 2, "text-anchor": pair[0] ? "end" : "start", "font-family": MONO, "font-size": 7.4, fill: C.muted }, pair[1]));
  });
  host.appendChild(svg);
}

/* ---------- barras horizontais ---------- */
function hBar(host, o) {
  var W = o.w || 200, rh = o.rh || 17, H = o.rows.length * rh + 2, fs = o.fs || 6.6, LW = o.lw || 64, VW = o.vw || 32;
  var svg = E("svg", { viewBox: "0 0 " + W + " " + H, role: "img", "aria-label": o.alt || "comparativo" });
  var mx = o.max || Math.max.apply(null, o.rows.map(function (r) { return r.v; }));
  o.rows.forEach(function (r, i) {
    var y = i * rh + 2, bh = Math.max(6, Math.round(rh * .42));
    svg.appendChild(T({ x: 0, y: y + rh / 2 + fs * .35, "font-family": MONO, "font-size": fs, fill: C.muted }, r.k));
    svg.appendChild(E("rect", { x: LW, y: y + rh / 2 - bh / 2, width: W - LW - VW, height: bh, rx: bh / 2, fill: C.line }));
    var w = (r.v / mx) * (W - LW - VW);
    var bar = E("rect", { x: LW, y: y + rh / 2 - bh / 2, width: 0, height: bh, rx: bh / 2, fill: r.c || (r.alert ? C.orange : C.blue) });
    svg.appendChild(bar);
    vis(host, function () { grow(bar, "width", w.toFixed(1), 900); });
    svg.appendChild(T({ x: W, y: y + rh / 2 + fs * .35, "text-anchor": "end", "font-family": MONO, "font-size": fs, "font-weight": 600, fill: r.alert ? C.orange : C.ink }, r.t || (br(r.v) + "%")));
  });
  host.appendChild(svg);
}

/* ---------- barras pareadas (antes/depois, hoje/plano) ---------- */
function dualBar(host, o) {
  var narrow = host.clientWidth && host.clientWidth < 480;
  var W = narrow ? Math.min(o.w || 320, 300) : (o.w || 320), rh = o.rh || 30, H = o.rows.length * rh + 4;
  var fs = (o.fs || 7.4) + (narrow ? 1 : 0), LW = o.lw || 92, VW = o.vw || 44;
  var svg = E("svg", { viewBox: "0 0 " + W + " " + H, role: "img", "aria-label": o.alt || "comparativo antes e depois" });
  var mxAll = Math.max.apply(null, o.rows.map(function (r) { return Math.max(r.a, r.b); }));
  var TW = W - LW - VW, tip = tipEl(host);
  o.rows.forEach(function (r, i) {
    var y = i * rh + 2, mx = o.max || (o.norm === "row" ? Math.max(r.a, r.b) : mxAll);
    svg.appendChild(T({ x: 0, y: y + rh / 2 + fs * .35, "font-family": MONO, "font-size": fs, fill: C.ink }, r.k));
    [[r.a, o.ca || C.orange, r.ta, y + rh * .2, 6], [r.b, o.cb || C.blue, r.tb, y + rh * .55, 8]].forEach(function (s) {
      var w = (s[0] / mx) * TW;
      svg.appendChild(E("rect", { x: LW, y: s[3], width: TW, height: s[4], rx: s[4] / 2, fill: C.line, opacity: .7 }));
      var bar = E("rect", { x: LW, y: s[3], width: 0, height: s[4], rx: s[4] / 2, fill: s[1] });
      svg.appendChild(bar);
      vis(host, function () { grow(bar, "width", w.toFixed(1), 1000); });
      svg.appendChild(T({ x: W, y: s[3] + s[4] / 2 + fs * .35, "text-anchor": "end", "font-family": MONO, "font-size": fs, "font-weight": 600, fill: s[1] }, s[2]));
      hoverable(bar, function () { show(tip, svg, W, LW + w, s[3] - 2, r.k + " · " + s[2]); }, function () { hide(tip); });
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
    var a1 = a0 + (s.v / tot) * Math.PI * 2;
    var x0 = cx + Math.cos(a0) * R, y0 = cy + Math.sin(a0) * R, x1 = cx + Math.cos(a1) * R, y1 = cy + Math.sin(a1) * R;
    var p = E("path", { d: "M" + x0 + " " + y0 + " A" + R + " " + R + " 0 " + ((a1 - a0) > Math.PI ? 1 : 0) + " 1 " + x1 + " " + y1, fill: "none", stroke: s.c, "stroke-width": th });
    p.style.transition = "stroke-width .2s";
    hoverable(p, function () { p.setAttribute("stroke-width", th + 4); show(tip, svg, W, cx, cy - R - 2, s.k + " " + br(s.v / tot * 100, 1) + "%"); },
      function () { p.setAttribute("stroke-width", th); hide(tip); });
    svg.appendChild(p); a0 = a1;
    var ly = 18 + i * 17;
    svg.appendChild(E("rect", { x: 104, y: ly - 6, width: 8, height: 8, rx: 2, fill: s.c }));
    svg.appendChild(T({ x: 117, y: ly + 1, "font-family": MONO, "font-size": 6.8, fill: C.muted }, s.k + " · " + br(s.v / tot * 100, 0) + "%"));
  });
  svg.appendChild(T({ x: cx, y: cy + 2, "text-anchor": "middle", "font-family": DISP, "font-size": 12, "font-weight": 600, fill: C.ink }, o.center || ""));
  svg.appendChild(T({ x: cx, y: cy + 12, "text-anchor": "middle", "font-family": MONO, "font-size": 6, fill: C.muted }, o.sub || ""));
  host.appendChild(svg);
}

/* ---------- mapa de calor de recebimentos ---------- */
function heat(host) {
  var cols = 14, rows = 4, cell = 11, gap = 2.6, W = 200, H = rows * (cell + gap);
  var svg = E("svg", { viewBox: "0 0 " + W + " " + H, role: "img", "aria-label": "recebimentos por dia" });
  var tip = tipEl(host), rnd = seeded(20260901);
  for (var r = 0; r < rows; r++) for (var c = 0; c < cols; c++) (function (r, c) {
    var v = rnd(), x = c * (cell + gap), y = r * (cell + gap);
    var rect = E("rect", { x: x, y: y, width: cell, height: cell, rx: 2.6, fill: v > .4 ? C.blue : C.line, opacity: v > .4 ? .12 + v * .85 : 1 });
    hoverable(rect, function () { show(tip, svg, W, x + cell / 2, y - 2, "R$ " + br(2400 + v * 7200) + " recebidos"); }, function () { hide(tip); });
    svg.appendChild(rect);
  })(r, c);
  host.appendChild(svg);
}

/* ---------- funil ---------- */
function funnel(host, o) {
  var W = o.w || 200, rh = o.rh || 19, H = o.rows.length * rh + 2, fs = o.fs || 7;
  var svg = E("svg", { viewBox: "0 0 " + W + " " + H, role: "img", "aria-label": "funil comercial" });
  var mx = o.rows[0].v, tip = tipEl(host);
  o.rows.forEach(function (r, i) {
    var y = i * rh + 2, w = (r.v / mx) * (W - 8), x = (W - w) / 2, last = i === o.rows.length - 1;
    var rect = E("rect", { x: W / 2, y: y, width: 0, height: rh - 5, rx: 3, fill: last ? C.green : C.blue, opacity: 1 - i * .1 });
    svg.appendChild(rect);
    vis(host, function () { grow(rect, "width", w.toFixed(1), 800); grow(rect, "x", x.toFixed(1), 800); });
    var label = r.k + " · " + br(r.v), tw = label.length * fs * .62;
    /* quando a barra é mais estreita que o texto, o texto sai da barra em vez de ser cortado */
    var dentro = w >= tw + 10;
    svg.appendChild(T({ x: dentro ? W / 2 : x + w + 5, y: y + rh / 2 + 1, "text-anchor": dentro ? "middle" : "start", "font-family": MONO, "font-size": fs,
      "font-weight": 500, fill: dentro ? "#fff" : (last ? C.green : C.ink) }, label));
    hoverable(rect, function () { show(tip, svg, W, W / 2, y - 1, label + (i ? " (" + br(r.v / mx * 100, 0) + "%)" : "")); }, function () { hide(tip); });
  });
  host.appendChild(svg);
}

/* ---------- medidor ---------- */
function gauge(host, o) {
  var W = 200, H = 100, cx = W / 2, cy = 80, R = 58;
  var svg = E("svg", { viewBox: "0 0 " + W + " " + H, role: "img", "aria-label": (o.k || "medidor") + ": " + o.v + "%" });
  function arc(p) { var a = Math.PI * (1 - p); return [cx + Math.cos(a) * R, cy - Math.sin(a) * R]; }
  var e = arc(1);
  svg.appendChild(E("path", { d: "M" + (cx - R) + " " + cy + " A" + R + " " + R + " 0 0 1 " + e[0] + " " + e[1], fill: "none", stroke: C.line, "stroke-width": 11, "stroke-linecap": "round" }));
  var p = o.v / 100, pe = arc(p);
  /* o arco nunca passa de meia-volta, então large-arc é sempre 0 — com 1 o navegador
     escolhe o outro centro e desenha um arco enorme para fora da caixa */
  var path = E("path", { d: "M" + (cx - R) + " " + cy + " A" + R + " " + R + " 0 0 1 " + pe[0] + " " + pe[1], fill: "none", stroke: o.c || C.blue, "stroke-width": 11, "stroke-linecap": "round" });
  var L = Math.PI * R;
  path.setAttribute("stroke-dasharray", L); path.setAttribute("stroke-dashoffset", L);
  svg.appendChild(path);
  vis(host, function () { if (RM) { path.setAttribute("stroke-dashoffset", 0); return; } path.style.transition = "stroke-dashoffset 1.1s ease"; path.setAttribute("stroke-dashoffset", 0); });
  svg.appendChild(T({ x: cx, y: cy - 8, "text-anchor": "middle", "font-family": DISP, "font-size": 21, "font-weight": 600, fill: C.ink }, o.v + "%"));
  svg.appendChild(T({ x: cx, y: cy + 8, "text-anchor": "middle", "font-family": MONO, "font-size": 6.6, fill: C.muted }, o.k || ""));
  host.appendChild(svg);
}

/* ---------- trilha de etapas ---------- */
function steps(host, list) {
  var W = 200, H = 50, n = list.length, X = function (i) { return 14 + i * (W - 28) / (n - 1); };
  var svg = E("svg", { viewBox: "0 0 " + W + " " + H, role: "img", "aria-label": "etapas do projeto" });
  svg.appendChild(E("line", { x1: X(0), y1: 20, x2: X(n - 1), y2: 20, stroke: C.line, "stroke-width": 2 }));
  var pr = E("line", { x1: X(0), y1: 20, x2: X(0), y2: 20, stroke: C.blue, "stroke-width": 2 });
  pr.style.transition = "all 1.2s ease"; svg.appendChild(pr);
  var tip = tipEl(host);
  list.forEach(function (s, i) {
    var g = E("g"), c = E("circle", { cx: X(i), cy: 20, r: 6, fill: s.alert ? C.orange : (s.done ? C.blue : "#fff"), stroke: (s.done || s.alert) ? "none" : C.line, "stroke-width": 2 });
    c.style.transition = "r .22s";
    g.appendChild(c);
    g.appendChild(T({ x: X(i), y: 39, "text-anchor": "middle", "font-family": MONO, "font-size": 6.2, fill: s.alert ? C.orange : C.muted }, s.k));
    g.style.cursor = "pointer";
    hoverable(g, function () { c.setAttribute("r", 8.5); show(tip, svg, W, X(i), 14, s.v); }, function () { c.setAttribute("r", 6); hide(tip); });
    svg.appendChild(g);
  });
  host.appendChild(svg);
  vis(host, function () { pr.setAttribute("x2", X(n - 2)); });
}

/* ---------- integração (mini, nos cards) ---------- */
function pipeline(host) {
  var W = 200, H = 58, svg = E("svg", { viewBox: "0 0 " + W + " " + H, role: "img", "aria-label": "integração entre IXC, OPA e banco" });
  var movers = [];
  [{ k: "IXC", y: 9 }, { k: "OPA", y: 29 }, { k: "BANCO", y: 49 }].forEach(function (s, i) {
    svg.appendChild(E("rect", { x: 0, y: s.y - 7, width: 46, height: 14, rx: 3, fill: "#fff", stroke: C.line }));
    svg.appendChild(T({ x: 7, y: s.y + 2.6, "font-family": MONO, "font-size": 5.6, fill: C.muted }, s.k));
    var p = E("path", { d: "M46," + s.y + " C74," + s.y + " 80,29 104,29", fill: "none", stroke: C.blue, "stroke-width": 1.3, opacity: .45 });
    svg.appendChild(p);
    var dot = E("circle", { r: 2.3, fill: C.blue }); svg.appendChild(dot);
    movers.push({ p: p, dot: dot, len: p.getTotalLength(), off: i * 730 });
  });
  svg.appendChild(E("circle", { cx: 110, cy: 29, r: 6, fill: C.orange }));
  svg.appendChild(E("path", { d: "M117,29 L142,29", stroke: C.orange, "stroke-width": 1.3 }));
  svg.appendChild(E("rect", { x: 144, y: 16, width: 52, height: 26, rx: 4, fill: "#fff", stroke: C.line }));
  svg.appendChild(E("path", { d: "M150,37 L162,31 L174,34 L189,22", fill: "none", stroke: C.blue, "stroke-width": 2, "stroke-linecap": "round" }));
  host.appendChild(svg);
  rafLoop(host, function (ts) {
    movers.forEach(function (m) { var pt = m.p.getPointAtLength(((ts + m.off) / 22) % m.len); m.dot.setAttribute("cx", pt.x); m.dot.setAttribute("cy", pt.y); });
  });
}

/* ---------- integração (grande) ---------- */
var stopInteg = null;
function integration() {
  var host = el("integ"); if (!host) return;
  if (stopInteg) { stopInteg(); stopInteg = null; }
  host.innerHTML = "";
  var W = host.clientWidth || 900, narrow = W < 720;
  var S = [{ k: "IXC Soft", n: "IXC", s: "ERP do provedor" }, { k: "OPA Suite", n: "OPA", s: "atendimento" }, { k: "Banco do ERP", n: "Banco", s: "leitura direta" },
           { k: "Boletos e PIX", n: "Boletos/PIX", s: "recebimentos" }, { k: "Planilhas", n: "Planilhas", s: "o que vive fora" }];
  var O = [{ k: "Painel da diretoria", n: "Painel", s: "base, caixa, churn, campo" }, { k: "Celular", n: "Celular", s: "a pergunta em 5 s" },
           { k: "Alertas", n: "Alertas", s: "meta estourada, fila parada" }, { k: "Fechamento", n: "Fechamento", s: "auditável até o dia 5" }];
  var NW = narrow ? Math.min(124, (W - 28) / 3) : Math.min(210, (W - 150) / 3), NH = narrow ? 38 : 48, G = narrow ? 9 : 13;
  var HW = narrow ? Math.min(118, NW) : 176, HH = narrow ? 60 : 78;
  var rows = Math.max(S.length, O.length), H = rows * (NH + G) - G + 12, cx = W / 2, cy = H / 2, xr = W - NW;
  var svg = E("svg", { viewBox: "0 0 " + W + " " + H, width: "100%", height: H, role: "img", "aria-label": "fontes de dados do provedor entrando na Baishift e saindo em painel, celular, alertas e fechamento" });
  var movers = [];
  function yAt(i, count) { return cy - (count * (NH + G) - G) / 2 + i * (NH + G); }
  function node(x, y, d, accent) {
    var g = E("g");
    g.appendChild(E("rect", { x: x, y: y, width: NW, height: NH, rx: 9, fill: "#fff", stroke: C.line, "stroke-width": 1.2 }));
    g.appendChild(E("rect", { x: x, y: y + 9, width: 3, height: NH - 18, rx: 1.5, fill: accent }));
    g.appendChild(T({ x: x + 12, y: y + (narrow ? 16 : 20), "font-family": DISP, "font-size": narrow ? 9.5 : 12, "font-weight": 600, fill: C.ink }, narrow ? d.n : d.k));
    g.appendChild(T({ x: x + 12, y: y + (narrow ? 28 : 35), "font-family": SANS, "font-size": narrow ? 7.5 : 9.2, fill: C.muted }, d.s));
    svg.appendChild(g);
  }
  function wire(x0, y0, x1, y1, color, off) {
    var mx = (x0 + x1) / 2;
    var p = E("path", { d: "M" + x0 + "," + y0 + " C" + mx + "," + y0 + " " + mx + "," + y1 + " " + x1 + "," + y1, fill: "none", stroke: color, "stroke-width": 1.4, opacity: .38 });
    svg.appendChild(p);
    var dot = E("circle", { r: 3, fill: color }); svg.appendChild(dot);
    movers.push({ p: p, dot: dot, len: p.getTotalLength(), off: off });
  }
  S.forEach(function (s, i) { var y = yAt(i, S.length); wire(NW, y + NH / 2, cx - HW / 2, cy, C.blue, i * 640); node(0, y, s, C.blue); });
  O.forEach(function (o, i) { var y = yAt(i, O.length); wire(cx + HW / 2, cy, xr, y + NH / 2, C.green, 1900 + i * 700); node(xr, y, o, C.green); });
  /* núcleo */
  var hub = E("g");
  hub.appendChild(E("rect", { x: cx - HW / 2, y: cy - HH / 2, width: HW, height: HH, rx: 14, fill: C.ink }));
  hub.appendChild(E("rect", { x: cx - HW / 2 + 12, y: cy - HH / 2 + 12, width: 8, height: 8, rx: 2, fill: C.orange }));
  hub.appendChild(T({ x: cx, y: cy + (narrow ? 1 : 2), "text-anchor": "middle", "font-family": DISP, "font-size": narrow ? 12 : 16, "font-weight": 700, fill: "#fff" }, "Baishift"));
  hub.appendChild(T({ x: cx, y: cy + (narrow ? 14 : 18), "text-anchor": "middle", "font-family": MONO, "font-size": narrow ? 6.5 : 8, fill: "#8FB4FF", "letter-spacing": 1 }, "DADOS INTEGRADOS"));
  svg.appendChild(hub);
  host.appendChild(svg);
  stopInteg = rafLoop(host, function (ts) {
    movers.forEach(function (m) { var pt = m.p.getPointAtLength(((ts + m.off) / 16) % m.len); m.dot.setAttribute("cx", pt.x); m.dot.setAttribute("cy", pt.y); });
  });
}

/* ---------- cascata: do contrato ao caixa ---------- */
function waterfall() {
  var host = el("wf"); if (!host) return;
  host.innerHTML = "";
  var W = host.clientWidth || 520, H = 230, PL = 6, PR = 6, PT = 30, PB = 40;
  var data = [{ k: "Venda", v: 214, t: 1 }, { k: "Viabilidade", s: "Viab.", d: -7 }, { k: "Instalação", s: "Instal.", d: -38, alert: 1 },
              { k: "Faturamento", s: "Fatur.", d: 0 }, { k: "Cobrança", s: "Cobr.", d: -7, note: "em atraso" }, { k: "Caixa", v: 162, t: 1, end: 1 }];
  var n = data.length, cw = (W - PL - PR) / n, bw = Math.min(64, cw * .6), IH = H - PT - PB, max = 214;
  var Y = function (v) { return PT + IH - (v / max) * IH; }, narrow = cw < 78;
  var svg = E("svg", { viewBox: "0 0 " + W + " " + H, width: "100%", height: H, role: "img", "aria-label": "cascata: 214 contratos vendidos, 162 chegam ao caixa" });
  [0, .5, 1].forEach(function (g) { svg.appendChild(E("line", { x1: PL, x2: W - PR, y1: Y(max * g), y2: Y(max * g), stroke: "rgba(255,255,255,.08)" })); });
  var level = 214, tip = tipEl(host);
  data.forEach(function (s, i) {
    var x = PL + i * cw + (cw - bw) / 2, top, bot, fill, val;
    if (s.t) { top = Y(s.v); bot = Y(0); fill = s.end ? "#5ED9A0" : C.blueL; val = String(s.v); }
    else {
      var nv = level + s.d;
      top = Y(Math.max(level, nv)); bot = Y(Math.min(level, nv));
      if (s.d === 0) { bot = top + 3; fill = "rgba(255,255,255,.35)"; } else fill = s.alert ? C.orange : "rgba(255,154,77,.7)";
      val = s.d === 0 ? "0" : "−" + Math.abs(s.d);
    }
    if (i > 0) svg.appendChild(E("line", { x1: x - cw + bw, x2: x, y1: Y(level), y2: Y(level), stroke: "rgba(255,255,255,.3)", "stroke-dasharray": "3 3" }));
    var r = E("rect", { x: x, y: bot, width: bw, height: 0, rx: 4, fill: fill }); svg.appendChild(r);
    vis(host, function () { grow(r, "height", (bot - top).toFixed(1), 800); grow(r, "y", top.toFixed(1), 800); });
    svg.appendChild(T({ x: x + bw / 2, y: top - 8, "text-anchor": "middle", "font-family": MONO, "font-size": 12.5, "font-weight": 600,
      fill: s.t ? (s.end ? "#5ED9A0" : "#fff") : (s.alert ? "#FF9A4D" : "rgba(255,255,255,.78)") }, val));
    svg.appendChild(T({ x: x + bw / 2, y: H - 18, "text-anchor": "middle", "font-family": SANS, "font-size": narrow ? 9.5 : 11, fill: "rgba(255,255,255,.65)" }, narrow && s.s ? s.s : s.k));
    if (s.note) svg.appendChild(T({ x: x + bw / 2, y: H - 5, "text-anchor": "middle", "font-family": MONO, "font-size": 8.5, fill: "rgba(255,255,255,.4)" }, s.note));
    var txt = s.t ? s.k + " · " + s.v + " contratos" : s.k + " · " + val + " contratos";
    hoverable(r, function () { show(tip, svg, W, x + bw / 2, top - 4, txt); }, function () { hide(tip); });
    if (!s.t) level += s.d;
  });
  host.appendChild(svg);
}

/* ---------- fluxo do pedido ao caixa ---------- */
var STEPS = [
  { k: "Venda",       n: 214, q: "214",        u: "propostas aceitas",   t: "1,2 dia" },
  { k: "Viabilidade", n: 207, q: "207",        u: "aprovadas em rota",   t: "0,8 dia", drop: "−7" },
  { k: "Instalação",  n: 169, q: "169",        u: "38 parados na fila",  t: "6,4 dias", drop: "−38", alert: 1 },
  { k: "Faturamento", n: 169, q: "169",        u: "nota no mesmo ciclo", t: "0,3 dia" },
  { k: "Cobrança",    n: 162, q: "162",        u: "7 em atraso",         t: "11 dias", drop: "−7" },
  { k: "Caixa",       n: 162, q: "R$ 162 mil", u: "entrada realizada",   t: "—", end: 1 }
];
var stopFlow = null;
function procFlow() {
  var host = el("procflow"); if (!host) return;
  if (stopFlow) { stopFlow(); stopFlow = null; }
  host.innerHTML = "";
  var W = host.clientWidth || 900, horiz = W >= 880, n = STEPS.length, NW, NH, GAP, H;
  if (horiz) { GAP = Math.max(30, W * .03); NW = (W - GAP * (n - 1)) / n; NH = 104; H = NH + 30; }
  else { NW = W; NH = 74; GAP = 38; H = n * NH + (n - 1) * GAP; }
  var svg = E("svg", { viewBox: "0 0 " + W + " " + H, width: "100%", height: H, role: "img", "aria-label": "fluxo do pedido ao caixa, com volume, tempo e perda em cada etapa" });
  function pos(i) { return horiz ? { x: i * (NW + GAP), y: 14 } : { x: 0, y: i * (NH + GAP) }; }
  var band = function (c) { return 8 + 26 * (c / STEPS[0].n); };
  var runners = [];
  for (var i = 0; i < n - 1; i++) {
    var a = pos(i), b = pos(i + 1), st = STEPS[i + 1], warn = st.alert, d;
    if (horiz) {
      /* fita cuja espessura é o volume que passa de uma etapa para a outra */
      var my = a.y + NH / 2, h0 = band(STEPS[i].n), h1 = band(st.n), x0 = a.x + NW, x1 = b.x;
      svg.appendChild(E("path", { d: "M" + x0 + " " + (my - h0 / 2) + " L" + x1 + " " + (my - h1 / 2) + " L" + x1 + " " + (my + h1 / 2) + " L" + x0 + " " + (my + h0 / 2) + "Z",
        fill: warn ? "rgba(255,122,26,.22)" : "rgba(77,139,255,.22)" }));
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
    var dot = E("circle", { r: 3.6, fill: warn ? C.orange : "#4D8BFF" }); svg.appendChild(dot);
    runners.push({ p: track, dot: dot, len: track.getTotalLength(), off: i * 420 });
  }
  STEPS.forEach(function (s, i) {
    var p = pos(i), g = E("g");
    var stroke = s.alert ? C.orange : (s.end ? "#5ED9A0" : "rgba(255,255,255,.2)");
    var fill = s.alert ? "rgba(255,122,26,.10)" : (s.end ? "rgba(94,217,160,.09)" : "rgba(10,27,61,.9)");
    g.appendChild(E("rect", { x: p.x, y: p.y, width: NW, height: NH, rx: 13, fill: fill, stroke: stroke, "stroke-width": 1.3 }));
    g.appendChild(E("rect", { x: p.x, y: p.y + 13, width: 3, height: NH - 26, rx: 2, fill: s.alert ? C.orange : (s.end ? "#5ED9A0" : "#4D8BFF") }));
    var px = p.x + 16, py = p.y + (horiz ? 26 : 24);
    g.appendChild(T({ x: px, y: py, "font-family": DISP, "font-size": 14.5, "font-weight": 600, fill: "#fff" }, s.k));
    g.appendChild(T({ x: px, y: py + (horiz ? 26 : 22), "font-family": MONO, "font-size": horiz ? 16 : 15, fill: s.alert ? "#FFB166" : (s.end ? "#5ED9A0" : "#fff") }, s.q));
    g.appendChild(T({ x: px, y: py + (horiz ? 43 : 39), "font-family": SANS, "font-size": 10.5, fill: "rgba(255,255,255,.55)" }, s.u));
    if (s.t !== "—") g.appendChild(T({ x: horiz ? px : (NW - 16), y: horiz ? (p.y + NH - 13) : (py + 39), "text-anchor": horiz ? "start" : "end", "font-family": MONO, "font-size": 9.6,
      fill: s.alert ? "#FF9A4D" : "rgba(255,255,255,.42)" }, "tempo médio " + s.t));
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
  var EV = [["g", "Cliente ativado · plano 500 Mega"], ["b", "OS 4.812 concluída · equipe B"], ["g", "Boleto pago · R$ 104,90"],
            ["o", "Fila de instalação · 38 parados"], ["b", "Nota fiscal emitida · ciclo 09"], ["g", "PIX recebido · R$ 89,90"],
            ["r", "Cancelamento · motivo: mudança"], ["b", "Acordo de cobrança · 3 parcelas"], ["g", "Viabilidade aprovada · rota 12"],
            ["o", "Inadimplência · 4,8% (meta 3,5%)"]];
  var idx = 0, MAXR = 4;
  function hora(off) { var d = new Date(Date.now() - off * 1000); return [d.getHours(), d.getMinutes(), d.getSeconds()].map(function (n) { return (n < 10 ? "0" : "") + n; }).join(":"); }
  function row(ev, off) {
    var d = document.createElement("div"), i = document.createElement("i"), s = document.createElement("span"), t = document.createElement("span");
    i.className = ev[0]; s.textContent = ev[1]; t.className = "t"; t.textContent = hora(off);
    d.appendChild(i); d.appendChild(s); d.appendChild(t); return d;
  }
  for (var k = MAXR - 1; k >= 0; k--) host.appendChild(row(EV[k], (MAXR - 1 - k) * 0));
  Array.prototype.forEach.call(host.children, function (c, j) { c.querySelector(".t").textContent = hora((MAXR - 1 - j) * 0 + j * 41); });
  idx = MAXR;
  if (RM) return;
  var timer = null;
  function tick() { host.insertBefore(row(EV[idx % EV.length], 0), host.firstChild); idx++; while (host.children.length > MAXR) host.removeChild(host.lastChild); }
  function start() { if (timer === null) timer = setInterval(tick, 3100); }
  function stop() { if (timer !== null) { clearInterval(timer); timer = null; } }
  start();
  document.addEventListener("visibilitychange", function () { document.hidden ? stop() : start(); });
}

/* ---------- contadores ---------- */
function counters() {
  Array.prototype.forEach.call(document.querySelectorAll("[data-count]"), function (e) {
    var to = parseFloat(e.getAttribute("data-count")), dec = +(e.getAttribute("data-dec") || 0);
    var pre = e.getAttribute("data-prefix") || "", suf = e.getAttribute("data-suffix") || "";
    var fmt = function (v) { return pre + (v < 0 ? "−" : "") + br(Math.abs(v), dec) + suf; };
    e.textContent = fmt(to);
    if (RM || isNaN(to)) return;
    vis(e, function () {
      var s = performance.now();
      (function step(now) {
        var p = Math.min((now - s) / 1300, 1), k = 1 - Math.pow(1 - p, 3);
        e.textContent = fmt(to * k);
        if (p < 1) requestAnimationFrame(step);
      })(s);
    });
  });
}

/* ================= INTERFACE ================= */

/* menu mobile */
(function () {
  var toggle = el("navtoggle"), menu = el("navlinks");
  if (!toggle || !menu) return;
  function close() { menu.classList.remove("open"); toggle.setAttribute("aria-expanded", "false"); document.body.classList.remove("nav-open"); }
  toggle.addEventListener("click", function () {
    var open = menu.classList.toggle("open");
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
    document.body.classList.toggle("nav-open", open);
  });
  menu.addEventListener("click", function (e) { if (e.target.closest("a")) close(); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") close(); });
  window.addEventListener("resize", function () { if (window.innerWidth > 900) close(); });
})();

/* barra: tema sobre o hero, progresso e seção ativa */
(function () {
  var bar = el("bar"), prog = el("prog"), hero = document.querySelector(".hero");
  var links = Array.prototype.slice.call(document.querySelectorAll('.navlinks a[href^="#"]:not(.cta)'));
  var targets = links.map(function (a) { return el(a.getAttribute("href").slice(1)); });
  var ticking = false;
  function update() {
    ticking = false;
    var h = document.documentElement, top = window.pageYOffset || h.scrollTop;
    if (prog) prog.style.width = ((top / ((h.scrollHeight - h.clientHeight) || 1)) * 100) + "%";
    if (bar && hero) bar.classList.toggle("on-dark", top < hero.offsetTop + hero.offsetHeight - 62);
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
  var io = new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
  }, { rootMargin: "0px 0px -8% 0px" });
  Array.prototype.forEach.call(nodes, function (e) { io.observe(e); });
})();

/* WhatsApp e formulário */
(function () {
  var MSG = "Olá! Quero agendar o diagnóstico de gestão do provedor.";
  function waLink(msg) {
    var n = String(CFG.whatsapp || "").replace(/\D/g, "");
    return n ? "https://wa.me/" + n + "?text=" + encodeURIComponent(msg) : null;
  }
  Array.prototype.forEach.call(document.querySelectorAll("[data-whatsapp]"), function (a) {
    var l = waLink(a.getAttribute("data-whatsapp") || MSG);
    if (l) { a.href = l; a.target = "_blank"; a.rel = "noopener"; return; }
    a.href = a.getAttribute("data-fallback-href") || "#contato";
    a.classList.add("mail");
    var f = a.getAttribute("data-fallback"), sp = a.querySelector("span");
    if (f) (sp || a).textContent = f;
  });
  var form = el("lead"); if (!form) return;
  var note = el("fnote"), ok = el("fok");
  if (note) note.textContent = waLink("x") ? "Abre o WhatsApp com a mensagem pronta." : "Abre o seu e-mail com a mensagem pronta para enviar.";
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (!form.checkValidity()) { form.reportValidity(); return; }
    var d = new FormData(form), g = function (k) { return String(d.get(k) || "").trim(); };
    var linhas = [MSG, "", "Nome: " + g("nome"), "Provedor: " + g("provedor"), "Cidade/UF: " + (g("cidade") || "—"),
                  "Assinantes: " + g("assinantes"), "Sistema: " + g("sistema")];
    if (g("msg")) linhas.push("", "Como funciona hoje: " + g("msg"));
    var msg = linhas.join("\n"), l = waLink(msg);
    if (l) window.open(l, "_blank", "noopener");
    else location.href = "mailto:" + (CFG.email || "contato@baishift.com.br") + "?subject=" + encodeURIComponent("Diagnóstico de gestão · " + g("provedor")) + "&body=" + encodeURIComponent(msg);
    if (ok) ok.hidden = false;
  });
})();

var yr = el("yr");
if (yr) yr.textContent = new Date().getFullYear();

/* ================= DADOS DO PAINEL DEMONSTRATIVO ================= */
try {
  var M    = ["out", "nov", "dez", "jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set"];
  var REC  = [892, 905, 940, 968, 1002, 1031, 1058, 1090, 1124, 1168, 1205, 1242];
  var DES  = [712, 724, 748, 760, 779, 788, 795, 801, 806, 809, 808, 806];
  var ATIV = [168, 171, 180, 176, 188, 192, 186, 199, 203, 208, 210, 214];
  var CANC = [122, 131, 128, 119, 124, 116, 109, 102, 98, 94, 89, 86];
  var mil = function (v) { return "R$ " + br(v) + " mil"; };

  /* --- topo: painel do provedor --- */
  on("cRec", function (h) { lineChart(h, { w: 340, h: 126, labels: M, end: true, fs: 7, alt: "receita e despesa nos últimos 12 meses",
    series: [{ d: REC, c: C.blue, k: "receita" }, { d: DES, c: C.orange, k: "despesa" }], fmt: mil }); });
  on("cBase", function (h) { barChart(h, { w: 340, h: 86, a: ATIV, b: CANC, ca: C.green, cb: C.red, ka: "ativações", kb: "cancelamentos", labels: M, alt: "ativações e cancelamentos por mês" }); });
  on("cDonut", function (h) { donut(h, { center: "R$ 1,24 mi", sub: "receita do mês", alt: "composição da receita",
    data: [{ k: "Internet", v: 74, c: C.blue }, { k: "SVA", v: 14, c: C.orange }, { k: "Instalação", v: 7, c: C.green }, { k: "Outros", v: 5, c: "#9AB4E8" }] }); });
  on("cHeat", heat);
  feed();

  /* --- frentes de atuação: um gráfico grande por frente --- */
  on("v1", function (h) { funnel(h, { w: 240, rh: 22, fs: 7.6, rows: [{ k: "Leads", v: 640 }, { k: "Propostas", v: 312 }, { k: "Vendas", v: 214 }, { k: "Ativados", v: 169 }] }); });
  on("v2", function (h) { hBar(h, { w: 240, rh: 21, fs: 7.4, lw: 80, vw: 36, alt: "tempo médio de ciclo por processo",
    rows: [{ k: "INSTALAÇÃO", v: 6.4, t: "6,4 d", alert: 1 }, { k: "COBRANÇA", v: 11, t: "11 d", alert: 1 }, { k: "CANCELAM.", v: 2.1, t: "2,1 d" }, { k: "FATURAM.", v: 0.3, t: "0,3 d" }] }); });
  on("v3", function (h) { barChart(h, { w: 240, h: 92, a: [820, 845, 860, 875, 890, 906], b: [806, 838, 852, 881, 872, 868], ca: "#9AB4E8", cb: C.blue,
    ka: "orçado", kb: "realizado", labels: ["abr", "mai", "jun", "jul", "ago", "set"], alt: "orçado contra realizado" }); });
  on("v4", function (h) { gauge(h, { v: 68, k: "rotinas sem toque humano", c: C.blue }); });
  on("v5", function (h) { hBar(h, { w: 240, rh: 21, fs: 7.4, lw: 80, vw: 36, alt: "cobertura de indicadores por área",
    rows: [{ k: "COMERCIAL", v: 100, t: "100%" }, { k: "FINANCEIRO", v: 100, t: "100%" }, { k: "CAMPO", v: 85, t: "85%" }, { k: "FISCAL", v: 60, t: "60%", alert: 1 }] }); });
  on("v6", function (h) { lineChart(h, { w: 240, h: 92, end: true, start: true, fs: 7.2, labels: ["mês 1", "mês 4", "mês 8"], alt: "horas manuais eliminadas",
    series: [{ d: [0, 18, 44, 72, 96, 118, 141, 160], c: C.green }], fmt: function (v) { return br(v) + " h"; } }); });

  /* --- integração --- */
  integration();
  on("phChart", function (h) { lineChart(h, { small: 1, w: 200, h: 44, series: [{ d: [26, 31, 29, 34, 38, 36, 41], c: C.green }], fmt: function (v) { return br(v) + " ativações"; } }); });

  /* --- método --- */
  on("m1", function (h) { hBar(h, { rh: 15, alt: "maturidade encontrada no diagnóstico",
    rows: [{ k: "PROCESSOS", v: 42, t: "42%", alert: 1 }, { k: "CONTROLES", v: 35, t: "35%", alert: 1 }, { k: "INDICADORES", v: 28, t: "28%", alert: 1 }] }); });
  on("m2", function (h) { steps(h, [{ k: "CONTAS", v: "Plano de contas", done: true }, { k: "ROTINA", v: "Calendário de fechamento", done: true }, { k: "CONTROLE", v: "Alçadas definidas" }]); });
  on("m3", pipeline);
  on("m4", function (h) { lineChart(h, { small: 1, w: 200, h: 54, series: [{ d: [28, 36, 45, 54, 63, 70, 75], c: C.blue }], fmt: function (v) { return v + "% do plano concluído"; } }); });

  /* --- fluxo --- */
  procFlow();
  waterfall();

  /* --- painéis --- */
  on("pAtiv", function (h) { barChart(h, { w: 240, h: 82, a: ATIV, ca: C.green, ka: "ativações", labels: M, alt: "ativações por mês" }); });
  on("pChurn", function (h) { lineChart(h, { w: 240, h: 82, end: true, start: true, alt: "churn nos últimos seis meses", series: [{ d: [2.02, 1.94, 1.88, 1.79, 1.71, 1.62], c: C.blue }], fmt: function (v) { return br(v, 2) + "%"; } }); });
  on("pInad", function (h) { lineChart(h, { w: 240, h: 82, end: true, start: true, alt: "inadimplência nos últimos seis meses", series: [{ d: [6.9, 6.4, 6.0, 5.6, 5.2, 4.8], c: C.orange }], fmt: function (v) { return br(v, 1) + "%"; } }); });
  on("pProd", function (h) { hBar(h, { rh: 18, alt: "produtividade por equipe de campo",
    rows: [{ k: "EQUIPE A", v: 96, t: "96%" }, { k: "EQUIPE B", v: 92, t: "92%" }, { k: "EQUIPE C", v: 88, t: "88%" }, { k: "EQUIPE D", v: 74, t: "74%", alert: 1 }] }); });
  on("pCresc", function (h) { lineChart(h, { w: 240, h: 82, labels: M, end: true, start: true, alt: "receita acumulada em 12 meses", series: [{ d: REC, c: C.blue }], fmt: mil }); });
  on("pGauge", function (h) { gauge(h, { v: 75, k: "controles no ar", c: C.green }); });
  on("dAfter", function (h) { dualBar(h, { w: 360, rh: 34, fs: 8, lw: 118, vw: 52, norm: "row", alt: "quatro indicadores antes e depois de seis meses de rito",
    rows: [{ k: "Inadimplência", a: 6.9, b: 4.8, ta: "6,9%", tb: "4,8%" }, { k: "Churn mensal", a: 2.02, b: 1.62, ta: "2,02%", tb: "1,62%" },
           { k: "Fechamento", a: 20, b: 5, ta: "dia 20", tb: "dia 5" }, { k: "Fila de instalação", a: 38, b: 6, ta: "38", tb: "6" }] }); });

  /* --- diagnóstico --- */
  on("dMat", function (h) { dualBar(h, { w: 360, rh: 30, fs: 8, lw: 96, vw: 40, max: 100, alt: "maturidade por área, hoje e depois do plano",
    rows: [{ k: "Processos", a: 42, b: 88, ta: "42%", tb: "88%" }, { k: "Controles", a: 35, b: 82, ta: "35%", tb: "82%" }, { k: "Indicadores", a: 28, b: 92, ta: "28%", tb: "92%" },
           { k: "Fechamento", a: 40, b: 90, ta: "40%", tb: "90%" }, { k: "Cobrança", a: 48, b: 85, ta: "48%", tb: "85%" }, { k: "Sistemas", a: 52, b: 80, ta: "52%", tb: "80%" }] }); });

  counters();

  /* --- KPIs com variação leve --- */
  var K = [{ id: "k1", v: 12480, f: "int", vol: .004 }, { id: "k2", v: 1242000, f: "brl", vol: .012 }, { id: "k3", v: 35.1, f: "pct", vol: .02 },
           { id: "k4", v: 1.62, f: "pct2", vol: .03 }, { id: "k5", v: 4.8, f: "pct", vol: .03 }, { id: "k6", v: 99.4, f: "money", vol: .01 }];
  var fm = function (v, f) {
    if (f === "brl") return v >= 1e6 ? "R$ " + br(v / 1e6, 2) + " mi" : "R$ " + br(v / 1000) + " mil";
    if (f === "pct") return br(v, 1) + "%";
    if (f === "pct2") return br(v, 2) + "%";
    if (f === "money") return "R$ " + br(v, 2);
    return br(v);
  };
  K.forEach(function (k) { var e = el(k.id); if (e) e.textContent = fm(k.v, k.f); });
  if (!RM) (function () {
    var kpiTimer = null;
    function tickKpi() {
      K.forEach(function (k) {
        var e = el(k.id); if (!e) return;
        var from = k.v, to = k.v * (1 + (Math.random() - .5) * k.vol), s = performance.now();
        (function step(now) { var p = Math.min((now - s) / 620, 1); e.textContent = fm(from + (to - from) * p, k.f); if (p < 1) requestAnimationFrame(step); })(s);
        k.v = to;
      });
    }
    function start() { if (kpiTimer === null) kpiTimer = setInterval(tickKpi, 2900); }
    function stop() { if (kpiTimer !== null) { clearInterval(kpiTimer); kpiTimer = null; } }
    start();
    document.addEventListener("visibilitychange", function () { document.hidden ? stop() : start(); });
  })();

  /* --- redimensionamento dos desenhos que dependem da largura --- */
  var rt = null, lastW = window.innerWidth;
  window.addEventListener("resize", function () {
    if (window.innerWidth === lastW) return;   /* ignora barra de endereço em mobile */
    lastW = window.innerWidth;
    clearTimeout(rt);
    rt = setTimeout(function () { procFlow(); waterfall(); integration(); }, 220);
  });
} catch (err) {
  /* um gráfico com problema não pode derrubar o restante da página */
  if (window.console && console.error) console.error("Baishift · falha ao montar os gráficos:", err);
}

})();
