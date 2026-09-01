/* =========================================================
   Baishift — motor de gráficos SVG e interações do site.
   Sem dependências externas. Tudo desenhado em tempo de execução.
   ========================================================= */
(function () {
"use strict";

var NS = "http://www.w3.org/2000/svg";
var RM = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
var C = {
  blue: "#1652F0", orange: "#FF7A1A", green: "#12855A", red: "#D8402F",
  line: "#DDE5F3", muted: "#5B6E93", ink: "#0A1B3D", soft: "#E8EFFE"
};

/* ---------- utilitários ---------- */
function E(n, a) {
  var e = document.createElementNS(NS, n);
  for (var k in a) e.setAttribute(k, a[k]);
  return e;
}
function br(v, d) {
  return Number(v).toLocaleString("pt-BR", {
    minimumFractionDigits: d || 0, maximumFractionDigits: d || 0
  });
}
function el(id) { return document.getElementById(id); }
function on(id, fn) { var h = el(id); if (h) fn(h); }

/* gerador pseudoaleatório com semente: o mesmo desenho a cada carregamento */
function seeded(seed) {
  var s = seed >>> 0;
  return function () {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/* dispara uma vez quando o elemento entra na tela */
function vis(node, fn) {
  if (!("IntersectionObserver" in window)) { fn(); return; }
  var o = new IntersectionObserver(function (es) {
    es.forEach(function (e) {
      if (e.isIntersecting) { fn(); o.unobserve(e.target); }
    });
  }, { rootMargin: "0px 0px -6% 0px" });
  o.observe(node);
}

/* laço de animação que só roda com a aba visível e o elemento na tela */
function rafLoop(node, tick) {
  if (RM) return;
  var id = null, onScreen = false;
  function frame(ts) { tick(ts || 0); id = requestAnimationFrame(frame); }
  function start() { if (id === null && onScreen && !document.hidden) id = requestAnimationFrame(frame); }
  function stop() { if (id !== null) { cancelAnimationFrame(id); id = null; } }
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (es) {
      onScreen = es[0].isIntersecting;
      onScreen ? start() : stop();
    }, { rootMargin: "120px" }).observe(node);
  } else { onScreen = true; start(); }
  document.addEventListener("visibilitychange", function () {
    document.hidden ? stop() : start();
  });
  return stop;
}

/* ---------- tooltip ---------- */
function tipEl(h) {
  var d = document.createElement("div");
  d.className = "tip";
  h.appendChild(d);
  return d;
}
function show(tip, svg, W, x, y, txt) {
  var r = svg.getBoundingClientRect(), s = r.width / W;
  tip.textContent = txt;
  tip.style.left = (x * s) + "px";
  tip.style.top = (y * s) + "px";
  tip.classList.add("on");
}
function hide(tip) { tip.classList.remove("on"); }

/* liga tooltip a uma forma, respondendo a mouse e toque */
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

  o.series.forEach(function (s) {
    var d = "", n = s.d.length;
    for (var i = 0; i < n; i++) d += (i ? "L" : "M") + X(i, n).toFixed(1) + " " + Y(s.d[i]).toFixed(1);
    if (!o.small) svg.appendChild(E("path", {
      d: d + "L" + (W - 3) + " " + (P + IH) + "L3 " + (P + IH) + "Z", fill: s.c, opacity: .09
    }));
    var p = E("path", {
      d: d, fill: "none", stroke: s.c, "stroke-width": o.small ? 1.8 : 2.2,
      "stroke-linejoin": "round", "stroke-linecap": "round"
    });
    svg.appendChild(p);
    if (!RM) {
      var L = p.getTotalLength();
      p.setAttribute("stroke-dasharray", L);
      p.setAttribute("stroke-dashoffset", L);
      vis(host, function () {
        p.style.transition = "stroke-dashoffset 1.3s ease";
        p.setAttribute("stroke-dashoffset", 0);
      });
    }
    svg.appendChild(E("circle", { cx: X(n - 1, n), cy: Y(s.d[n - 1]), r: o.small ? 2.4 : 3.4, fill: s.c }));
  });

  if (o.labels) {
    [0, Math.floor(o.labels.length / 2), o.labels.length - 1].forEach(function (i) {
      var t = E("text", {
        x: X(i, o.labels.length), y: H - 3,
        "text-anchor": i === 0 ? "start" : (i === o.labels.length - 1 ? "end" : "middle"),
        "font-family": "IBM Plex Mono, monospace", "font-size": 7.6, fill: C.muted
      });
      t.textContent = o.labels[i];
      svg.appendChild(t);
    });
  }

  var tip = tipEl(host), n0 = o.series[0].d.length;
  var cross = E("line", { y1: P, y2: P + IH, stroke: C.blue, "stroke-width": 1, "stroke-dasharray": "3 3", opacity: 0 });
  svg.appendChild(cross);
  svg.addEventListener("pointermove", function (ev) {
    var rc = svg.getBoundingClientRect(), x = (ev.clientX - rc.left) / rc.width * W;
    var i = Math.round((x - 3) / (W - 6) * (n0 - 1));
    i = Math.max(0, Math.min(n0 - 1, i));
    cross.setAttribute("x1", X(i, n0));
    cross.setAttribute("x2", X(i, n0));
    cross.setAttribute("opacity", .6);
    var txt = o.series.map(function (s) {
      return (s.k ? s.k + " " : "") + (o.fmt ? o.fmt(s.d[i]) : br(s.d[i]));
    }).join("  ·  ");
    show(tip, svg, W, X(i, n0), Y(o.series[0].d[i]) - 8, txt);
  });
  function clear() { cross.setAttribute("opacity", 0); hide(tip); }
  svg.addEventListener("pointerleave", clear);
  svg.addEventListener("pointercancel", clear);
  host.appendChild(svg);
}

/* ---------- barras agrupadas ---------- */
function barChart(host, o) {
  var W = o.w || 320, H = o.h || (o.small ? 70 : 120), P = 6, BT = o.labels ? 14 : 4, IH = H - P - BT;
  var svg = E("svg", { viewBox: "0 0 " + W + " " + H, role: "img", "aria-label": o.alt || "gráfico de barras" });
  var all = o.a.concat(o.b || []), mx = Math.max.apply(null, all) * 1.14;
  var n = o.a.length, bw = (W - 4) / n, tip = tipEl(host);

  for (var i = 0; i < n; i++) {
    (function (i) {
      var x = 2 + i * bw, two = o.b && o.b.length, w = two ? bw * .38 : bw * .6;
      var ha = (o.a[i] / mx) * IH;
      var r1 = E("rect", { x: x + (two ? 1 : bw * .2), y: P + IH, width: w, height: 0, rx: 2, fill: o.ca || C.blue });
      svg.appendChild(r1);
      vis(host, function () {
        grow(r1, "height", ha.toFixed(1), 800);
        grow(r1, "y", (P + IH - ha).toFixed(1), 800);
      });
      hoverable(r1,
        function () { show(tip, svg, W, x + bw * .4, P + IH - ha - 4, (o.ka || "") + " " + br(o.a[i])); },
        function () { hide(tip); });

      if (two) {
        var hb = (o.b[i] / mx) * IH;
        var r2 = E("rect", { x: x + bw * .45, y: P + IH, width: w, height: 0, rx: 2, fill: o.cb || C.orange, opacity: .9 });
        svg.appendChild(r2);
        vis(host, function () {
          grow(r2, "height", hb.toFixed(1), 800);
          grow(r2, "y", (P + IH - hb).toFixed(1), 800);
        });
        hoverable(r2,
          function () { show(tip, svg, W, x + bw * .65, P + IH - hb - 4, (o.kb || "") + " " + br(o.b[i])); },
          function () { hide(tip); });
      }
    })(i);
  }
  if (o.labels) [0, n - 1].forEach(function (i) {
    var t = E("text", {
      x: 2 + i * bw + bw * .4, y: H - 2, "text-anchor": i ? "end" : "start",
      "font-family": "IBM Plex Mono, monospace", "font-size": 7.4, fill: C.muted
    });
    t.textContent = o.labels[i];
    svg.appendChild(t);
  });
  host.appendChild(svg);
}

/* ---------- barras horizontais ---------- */
function hBar(host, o) {
  var W = 200, rh = o.rh || 17, H = o.rows.length * rh + 2;
  var svg = E("svg", { viewBox: "0 0 " + W + " " + H, role: "img", "aria-label": o.alt || "comparativo" });
  var mx = Math.max.apply(null, o.rows.map(function (r) { return r.v; }));
  o.rows.forEach(function (r, i) {
    var y = i * rh + 2;
    var t = E("text", { x: 0, y: y + 8, "font-family": "IBM Plex Mono, monospace", "font-size": 6.6, fill: C.muted });
    t.textContent = r.k;
    svg.appendChild(t);
    svg.appendChild(E("rect", { x: 64, y: y + 2, width: W - 96, height: 7, rx: 3.5, fill: C.line }));
    var w = (r.v / mx) * (W - 96);
    var bar = E("rect", { x: 64, y: y + 2, width: 0, height: 7, rx: 3.5, fill: r.c || (r.alert ? C.orange : C.blue) });
    svg.appendChild(bar);
    vis(host, function () { grow(bar, "width", w.toFixed(1), 900); });
    var v = E("text", {
      x: W, y: y + 8, "text-anchor": "end", "font-family": "IBM Plex Mono, monospace",
      "font-size": 6.6, fill: r.alert ? C.orange : C.ink
    });
    v.textContent = r.t || (br(r.v) + "%");
    svg.appendChild(v);
  });
  host.appendChild(svg);
}

/* ---------- rosca ---------- */
function donut(host, o) {
  var W = 200, H = o.h || 108, cx = 54, cy = H / 2, R = 38, th = 13;
  var svg = E("svg", { viewBox: "0 0 " + W + " " + H, role: "img", "aria-label": o.alt || "composição" });
  var tot = o.data.reduce(function (a, b) { return a + b.v; }, 0);
  var a0 = -Math.PI / 2, tip = tipEl(host);

  o.data.forEach(function (s, i) {
    var a1 = a0 + (s.v / tot) * Math.PI * 2;
    var x0 = cx + Math.cos(a0) * R, y0 = cy + Math.sin(a0) * R;
    var x1 = cx + Math.cos(a1) * R, y1 = cy + Math.sin(a1) * R;
    var big = (a1 - a0) > Math.PI ? 1 : 0;
    var p = E("path", {
      d: "M" + x0 + " " + y0 + " A" + R + " " + R + " 0 " + big + " 1 " + x1 + " " + y1,
      fill: "none", stroke: s.c, "stroke-width": th, "stroke-linecap": "butt"
    });
    p.style.transition = "stroke-width .2s";
    hoverable(p,
      function () { p.setAttribute("stroke-width", th + 4); show(tip, svg, W, cx, cy - R - 2, s.k + " " + br(s.v / tot * 100, 1) + "%"); },
      function () { p.setAttribute("stroke-width", th); hide(tip); });
    svg.appendChild(p);
    a0 = a1;

    var ly = 18 + i * 17;
    svg.appendChild(E("rect", { x: 104, y: ly - 6, width: 8, height: 8, rx: 2, fill: s.c }));
    var t = E("text", { x: 117, y: ly + 1, "font-family": "IBM Plex Mono, monospace", "font-size": 6.8, fill: C.muted });
    t.textContent = s.k + " · " + br(s.v / tot * 100, 0) + "%";
    svg.appendChild(t);
  });

  var c = E("text", { x: cx, y: cy + 2, "text-anchor": "middle", "font-family": "Sora, sans-serif", "font-size": 12, "font-weight": 600, fill: C.ink });
  c.textContent = o.center || "";
  svg.appendChild(c);
  var c2 = E("text", { x: cx, y: cy + 12, "text-anchor": "middle", "font-family": "IBM Plex Mono, monospace", "font-size": 6, fill: C.muted });
  c2.textContent = o.sub || "";
  svg.appendChild(c2);
  host.appendChild(svg);
}

/* ---------- mapa de calor de recebimentos ---------- */
function heat(host) {
  var cols = 14, rows = 4, cell = 11, gap = 2.6, W = 200, H = rows * (cell + gap);
  var svg = E("svg", { viewBox: "0 0 " + W + " " + H, role: "img", "aria-label": "recebimentos por dia" });
  var tip = tipEl(host), rnd = seeded(20260901);

  for (var r = 0; r < rows; r++) for (var c = 0; c < cols; c++) {
    (function (r, c) {
      var v = rnd(), x = c * (cell + gap), y = r * (cell + gap);
      var op = .12 + v * .85;
      var rect = E("rect", {
        x: x, y: y, width: cell, height: cell, rx: 2.6,
        fill: v > .4 ? C.blue : C.line, opacity: v > .4 ? op : 1
      });
      hoverable(rect,
        function () { show(tip, svg, W, x + cell / 2, y - 2, "R$ " + br(2400 + v * 7200) + " recebidos"); },
        function () { hide(tip); });
      svg.appendChild(rect);
    })(r, c);
  }
  host.appendChild(svg);
}

/* ---------- funil ---------- */
function funnel(host, o) {
  var W = 200, rh = o.rh || 19, H = o.rows.length * rh + 2;
  var svg = E("svg", { viewBox: "0 0 " + W + " " + H, role: "img", "aria-label": "funil comercial" });
  var mx = o.rows[0].v, tip = tipEl(host);

  o.rows.forEach(function (r, i) {
    var y = i * rh + 2, w = (r.v / mx) * (W - 8), x = (W - w) / 2;
    var rect = E("rect", {
      x: W / 2, y: y, width: 0, height: rh - 5, rx: 3,
      fill: i === o.rows.length - 1 ? C.green : C.blue, opacity: 1 - i * .1
    });
    svg.appendChild(rect);
    vis(host, function () { grow(rect, "width", w.toFixed(1), 800); grow(rect, "x", x.toFixed(1), 800); });
    var t = E("text", {
      x: W / 2, y: y + rh / 2 + 1, "text-anchor": "middle",
      "font-family": "IBM Plex Mono, monospace", "font-size": 7, fill: "#fff", "font-weight": 500
    });
    t.textContent = r.k + " · " + br(r.v);
    svg.appendChild(t);
    hoverable(rect,
      function () { show(tip, svg, W, W / 2, y - 1, r.k + " · " + br(r.v) + (i ? " (" + br(r.v / mx * 100, 0) + "%)" : "")); },
      function () { hide(tip); });
  });
  host.appendChild(svg);
}

/* ---------- medidor ---------- */
function gauge(host, o) {
  var W = 200, H = 96, cx = W / 2, cy = 76, R = 58;
  var svg = E("svg", { viewBox: "0 0 " + W + " " + H, role: "img", "aria-label": (o.k || "medidor") + ": " + o.v + "%" });
  function arc(p) { var a = Math.PI * (1 - p); return [cx + Math.cos(a) * R, cy - Math.sin(a) * R]; }

  var e = arc(1);
  svg.appendChild(E("path", {
    d: "M" + (cx - R) + " " + cy + " A" + R + " " + R + " 0 0 1 " + e[0] + " " + e[1],
    fill: "none", stroke: C.line, "stroke-width": 11, "stroke-linecap": "round"
  }));
  var p = o.v / 100, pe = arc(p);
  var path = E("path", {
    d: "M" + (cx - R) + " " + cy + " A" + R + " " + R + " 0 " + (p > .5 ? 1 : 0) + " 1 " + pe[0] + " " + pe[1],
    fill: "none", stroke: o.c || C.blue, "stroke-width": 11, "stroke-linecap": "round"
  });
  var L = Math.PI * R;
  path.setAttribute("stroke-dasharray", L);
  path.setAttribute("stroke-dashoffset", L);
  svg.appendChild(path);
  vis(host, function () {
    if (RM) { path.setAttribute("stroke-dashoffset", 0); return; }
    path.style.transition = "stroke-dashoffset 1.1s ease";
    path.setAttribute("stroke-dashoffset", 0);
  });
  var t = E("text", { x: cx, y: cy - 8, "text-anchor": "middle", "font-family": "Sora, sans-serif", "font-size": 21, "font-weight": 600, fill: C.ink });
  t.textContent = o.v + "%";
  svg.appendChild(t);
  var s = E("text", { x: cx, y: cy + 8, "text-anchor": "middle", "font-family": "IBM Plex Mono, monospace", "font-size": 6.6, fill: C.muted });
  s.textContent = o.k || "";
  svg.appendChild(s);
  host.appendChild(svg);
}

/* ---------- trilha de etapas ---------- */
function steps(host, list) {
  var W = 200, H = 50, n = list.length;
  var X = function (i) { return 14 + i * (W - 28) / (n - 1); };
  var svg = E("svg", { viewBox: "0 0 " + W + " " + H, role: "img", "aria-label": "etapas do projeto" });
  svg.appendChild(E("line", { x1: X(0), y1: 20, x2: X(n - 1), y2: 20, stroke: C.line, "stroke-width": 2 }));
  var pr = E("line", { x1: X(0), y1: 20, x2: X(0), y2: 20, stroke: C.blue, "stroke-width": 2 });
  pr.style.transition = "all 1.2s ease";
  svg.appendChild(pr);
  var tip = tipEl(host);

  list.forEach(function (s, i) {
    var g = E("g");
    var c = E("circle", {
      cx: X(i), cy: 20, r: 6,
      fill: s.alert ? C.orange : (s.done ? C.blue : "#fff"),
      stroke: (s.done || s.alert) ? "none" : C.line, "stroke-width": 2
    });
    c.style.transition = "r .22s";
    var t = E("text", {
      x: X(i), y: 39, "text-anchor": "middle", "font-family": "IBM Plex Mono, monospace",
      "font-size": 5.4, fill: s.alert ? C.orange : C.muted
    });
    t.textContent = s.k;
    g.appendChild(c); g.appendChild(t);
    g.style.cursor = "pointer";
    hoverable(g,
      function () { c.setAttribute("r", 8.5); show(tip, svg, W, X(i), 14, s.v); },
      function () { c.setAttribute("r", 6); hide(tip); });
    svg.appendChild(g);
  });
  host.appendChild(svg);
  vis(host, function () { pr.setAttribute("x2", X(n - 2)); });
}

/* ---------- integração de fontes ---------- */
function pipeline(host) {
  var W = 200, H = 58;
  var svg = E("svg", { viewBox: "0 0 " + W + " " + H, role: "img", "aria-label": "integração entre IXC, OPA e banco" });
  var movers = [];

  [{ k: "IXC", y: 9 }, { k: "OPA", y: 29 }, { k: "BANCO", y: 49 }].forEach(function (s, i) {
    svg.appendChild(E("rect", { x: 0, y: s.y - 7, width: 46, height: 14, rx: 3, fill: "#fff", stroke: C.line }));
    var t = E("text", { x: 7, y: s.y + 2.6, "font-family": "IBM Plex Mono, monospace", "font-size": 5.6, fill: C.muted });
    t.textContent = s.k;
    svg.appendChild(t);
    var p = E("path", { d: "M46," + s.y + " C74," + s.y + " 80,29 104,29", fill: "none", stroke: C.blue, "stroke-width": 1.3, opacity: .45 });
    svg.appendChild(p);
    var dot = E("circle", { r: 2.3, fill: C.blue });
    svg.appendChild(dot);
    movers.push({ p: p, dot: dot, len: p.getTotalLength(), off: i * 730 });
  });

  svg.appendChild(E("circle", { cx: 110, cy: 29, r: 6, fill: C.orange }));
  svg.appendChild(E("path", { d: "M117,29 L142,29", stroke: C.orange, "stroke-width": 1.3 }));
  svg.appendChild(E("rect", { x: 144, y: 16, width: 52, height: 26, rx: 4, fill: "#fff", stroke: C.line }));
  svg.appendChild(E("path", { d: "M150,37 L162,31 L174,34 L189,22", fill: "none", stroke: C.blue, "stroke-width": 2, "stroke-linecap": "round" }));
  host.appendChild(svg);

  rafLoop(host, function (ts) {
    movers.forEach(function (m) {
      var pt = m.p.getPointAtLength(((ts + m.off) / 22) % m.len);
      m.dot.setAttribute("cx", pt.x);
      m.dot.setAttribute("cy", pt.y);
    });
  });
}

/* ---------- radar de maturidade ---------- */
function radar(host, o) {
  var W = 440, H = 215, cx = W / 2, cy = H / 2 + 6, R = 84, n = o.axes.length;
  var svg = E("svg", { viewBox: "0 0 " + W + " " + H, role: "img", "aria-label": "maturidade da gestão hoje e depois do plano" });
  function pt(i, v) {
    var a = -Math.PI / 2 + i * (Math.PI * 2 / n);
    return [cx + Math.cos(a) * R * v, cy + Math.sin(a) * R * v];
  }
  [.25, .5, .75, 1].forEach(function (g) {
    var d = "";
    for (var i = 0; i < n; i++) { var p = pt(i, g); d += (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1); }
    svg.appendChild(E("path", { d: d + "Z", fill: "none", stroke: C.line, "stroke-width": 1 }));
  });
  for (var i = 0; i < n; i++) {
    var p = pt(i, 1);
    svg.appendChild(E("line", { x1: cx, y1: cy, x2: p[0], y2: p[1], stroke: C.line, "stroke-width": 1 }));
  }
  function poly(vals, color, op) {
    var d = "";
    for (var i = 0; i < n; i++) { var p = pt(i, vals[i]); d += (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1); }
    var pa = E("path", { d: d + "Z", fill: color, "fill-opacity": op, stroke: color, "stroke-width": 2, "stroke-linejoin": "round" });
    svg.appendChild(pa);
    return pa;
  }
  poly(o.now, C.orange, .14);
  poly(o.after, C.blue, .10).setAttribute("stroke-dasharray", "4 3");

  o.axes.forEach(function (k, i) {
    var p = pt(i, 1.22);
    var t = E("text", {
      x: p[0], y: p[1] + 2,
      "text-anchor": p[0] > cx + 6 ? "start" : (p[0] < cx - 6 ? "end" : "middle"),
      "font-family": "IBM Plex Mono, monospace", "font-size": 7.4, fill: C.muted
    });
    t.textContent = k;
    svg.appendChild(t);
  });
  var l1 = E("text", { x: 6, y: 12, "font-family": "IBM Plex Mono, monospace", "font-size": 7.4, fill: C.orange });
  l1.textContent = "■ hoje";
  svg.appendChild(l1);
  var l2 = E("text", { x: 56, y: 12, "font-family": "IBM Plex Mono, monospace", "font-size": 7.4, fill: C.blue });
  l2.textContent = "■ depois do plano";
  svg.appendChild(l2);
  host.appendChild(svg);
}

/* ---------- fluxo do pedido ao caixa ---------- */
var STEPS = [
  { k: "Venda",       q: "214",        u: "propostas aceitas",   t: "1,2 dia" },
  { k: "Viabilidade", q: "207",        u: "aprovadas em rota",   t: "0,8 dia", drop: "−7" },
  { k: "Instalação",  q: "169",        u: "38 parados na fila",  t: "6,4 dias", drop: "−38", alert: 1 },
  { k: "Faturamento", q: "169",        u: "nota no mesmo ciclo", t: "0,3 dia" },
  { k: "Cobrança",    q: "162",        u: "7 em atraso",         t: "11 dias", drop: "−7" },
  { k: "Caixa",       q: "R$ 162 mil", u: "entrada realizada",   t: "—", end: 1 }
];
var stopFlow = null;

function procFlow() {
  var host = el("procflow");
  if (!host) return;
  if (stopFlow) { stopFlow(); stopFlow = null; }
  host.innerHTML = "";

  var W = host.clientWidth || 900, horiz = W >= 880, n = STEPS.length, NW, NH, GAP, H;
  if (horiz) { GAP = Math.max(24, W * .026); NW = (W - GAP * (n - 1)) / n; NH = 104; H = NH + 30; }
  else { NW = W; NH = 74; GAP = 38; H = n * NH + (n - 1) * GAP; }

  var svg = E("svg", {
    viewBox: "0 0 " + W + " " + H, width: "100%", height: H,
    role: "img", "aria-label": "fluxo do pedido ao caixa, com volume, tempo e perda em cada etapa"
  });
  function pos(i) { return horiz ? { x: i * (NW + GAP), y: 14 } : { x: 0, y: i * (NH + GAP) }; }
  var runners = [];

  for (var i = 0; i < n - 1; i++) {
    var a = pos(i), b = pos(i + 1), d;
    if (horiz) d = "M" + (a.x + NW) + " " + (a.y + NH / 2) + " L" + b.x + " " + (b.y + NH / 2);
    else d = "M" + (NW / 2) + " " + (a.y + NH) + " L" + (NW / 2) + " " + b.y;
    var st = STEPS[i + 1], warn = st.alert;
    var track = E("path", { d: d, fill: "none", stroke: warn ? C.orange : "rgba(255,255,255,.22)", "stroke-width": 1.6, "stroke-dasharray": "5 5" });
    svg.appendChild(track);
    var dot = E("circle", { r: 3.6, fill: warn ? C.orange : "#4D8BFF" });
    svg.appendChild(dot);
    runners.push({ p: track, dot: dot, len: track.getTotalLength(), off: i * 420 });

    if (st.drop) {
      var mx = horiz ? (a.x + NW + b.x) / 2 : NW / 2 + 10;
      var my = horiz ? a.y + NH / 2 - 11 : (a.y + NH + b.y) / 2 + 4;
      var t = E("text", {
        x: mx, y: my, "text-anchor": horiz ? "middle" : "start",
        "font-family": "IBM Plex Mono, monospace", "font-size": 10.5,
        fill: warn ? "#FF9A4D" : "rgba(255,255,255,.45)"
      });
      t.textContent = st.drop;
      svg.appendChild(t);
    }
  }

  STEPS.forEach(function (s, i) {
    var p = pos(i), g = E("g");
    var stroke = s.alert ? C.orange : (s.end ? "#5ED9A0" : "rgba(255,255,255,.2)");
    var fill = s.alert ? "rgba(255,122,26,.10)" : (s.end ? "rgba(94,217,160,.09)" : "rgba(255,255,255,.045)");
    g.appendChild(E("rect", { x: p.x, y: p.y, width: NW, height: NH, rx: 13, fill: fill, stroke: stroke, "stroke-width": 1.3 }));
    g.appendChild(E("rect", { x: p.x, y: p.y + 13, width: 3, height: NH - 26, rx: 2, fill: s.alert ? C.orange : (s.end ? "#5ED9A0" : "#4D8BFF") }));

    var px = p.x + 16, py = p.y + (horiz ? 26 : 24);
    var t1 = E("text", { x: px, y: py, "font-family": "Sora, sans-serif", "font-size": 14.5, "font-weight": 600, fill: "#fff" });
    t1.textContent = s.k;
    g.appendChild(t1);
    var t2 = E("text", {
      x: px, y: py + (horiz ? 26 : 22), "font-family": "IBM Plex Mono, monospace",
      "font-size": horiz ? 16 : 15, fill: s.alert ? "#FFB166" : (s.end ? "#5ED9A0" : "#fff")
    });
    t2.textContent = s.q;
    g.appendChild(t2);
    var t3 = E("text", { x: px, y: py + (horiz ? 43 : 39), "font-family": "Inter, sans-serif", "font-size": 10.5, fill: "rgba(255,255,255,.55)" });
    t3.textContent = s.u;
    g.appendChild(t3);

    if (s.t !== "—") {
      var tx = horiz ? px : (NW - 16), ty = horiz ? (p.y + NH - 13) : (py + 2);
      var t4 = E("text", {
        x: tx, y: ty, "text-anchor": horiz ? "start" : "end", "font-family": "IBM Plex Mono, monospace",
        "font-size": 9.6, fill: s.alert ? "#FF9A4D" : "rgba(255,255,255,.42)"
      });
      t4.textContent = "tempo médio " + s.t;
      g.appendChild(t4);
    }
    if (s.alert) {
      var bw = 64, bx = p.x + NW - bw - 12, by = p.y + 11;
      g.appendChild(E("rect", { x: bx, y: by, width: bw, height: 17, rx: 8.5, fill: C.orange }));
      var tb = E("text", {
        x: bx + bw / 2, y: by + 12, "text-anchor": "middle", "font-family": "IBM Plex Mono, monospace",
        "font-size": 9, "font-weight": 600, fill: "#3A1704"
      });
      tb.textContent = "GARGALO";
      g.appendChild(tb);
    }
    svg.appendChild(g);
  });

  host.appendChild(svg);
  if (runners.length) stopFlow = rafLoop(host, function (ts) {
    runners.forEach(function (r) {
      var pt = r.p.getPointAtLength(((ts + r.off) / 16) % r.len);
      r.dot.setAttribute("cx", pt.x);
      r.dot.setAttribute("cy", pt.y);
    });
  });
}

/* ---------- menu mobile ---------- */
(function () {
  var toggle = el("navtoggle"), menu = el("navlinks");
  if (!toggle || !menu) return;
  function close() {
    menu.classList.remove("open");
    toggle.setAttribute("aria-expanded", "false");
    document.body.classList.remove("nav-open");
  }
  toggle.addEventListener("click", function () {
    var open = menu.classList.toggle("open");
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
    document.body.classList.toggle("nav-open", open);
  });
  menu.addEventListener("click", function (e) { if (e.target.closest("a")) close(); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") close(); });
  window.addEventListener("resize", function () { if (window.innerWidth > 900) close(); });
})();

/* ---------- barra de progresso + seção ativa ---------- */
(function () {
  var prog = el("prog");
  var links = Array.prototype.slice.call(document.querySelectorAll('.navlinks a[href^="#"]:not(.cta)'));
  var targets = links.map(function (a) { return el(a.getAttribute("href").slice(1)); });
  var ticking = false;

  function update() {
    ticking = false;
    var h = document.documentElement;
    if (prog) prog.style.width = ((h.scrollTop / ((h.scrollHeight - h.clientHeight) || 1)) * 100) + "%";
    var mark = h.scrollTop + 120, active = -1;
    targets.forEach(function (t, i) { if (t && t.offsetTop <= mark) active = i; });
    links.forEach(function (a, i) {
      i === active ? a.setAttribute("aria-current", "true") : a.removeAttribute("aria-current");
    });
  }
  window.addEventListener("scroll", function () {
    if (!ticking) { ticking = true; requestAnimationFrame(update); }
  }, { passive: true });
  update();
})();

/* ---------- revelação ao rolar ---------- */
(function () {
  var nodes = document.querySelectorAll(".rv");
  if (!("IntersectionObserver" in window)) {
    Array.prototype.forEach.call(nodes, function (e) { e.classList.add("in"); });
    return;
  }
  var io = new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
  }, { rootMargin: "0px 0px -8% 0px" });
  Array.prototype.forEach.call(nodes, function (e) { io.observe(e); });
})();

/* ---------- ano corrente no rodapé ---------- */
var yr = el("yr");
if (yr) yr.textContent = new Date().getFullYear();

/* ================= DADOS DO PAINEL DEMONSTRATIVO ================= */
try {
  var M    = ["out", "nov", "dez", "jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set"];
  var REC  = [892, 905, 940, 968, 1002, 1031, 1058, 1090, 1124, 1168, 1205, 1242];
  var DES  = [712, 724, 748, 760, 779, 788, 795, 801, 806, 809, 808, 806];
  var ATIV = [168, 171, 180, 176, 188, 192, 186, 199, 203, 208, 210, 214];
  var CANC = [122, 131, 128, 119, 124, 116, 109, 102, 98, 94, 89, 86];

  /* --- topo: painel do provedor --- */
  on("cRec", function (h) {
    lineChart(h, {
      w: 340, h: 126, labels: M, alt: "receita e despesa nos últimos 12 meses",
      series: [{ d: REC, c: C.blue, k: "receita" }, { d: DES, c: C.orange, k: "despesa" }],
      fmt: function (v) { return "R$ " + br(v) + " mil"; }
    });
  });
  on("cBase", function (h) {
    barChart(h, { w: 340, h: 86, a: ATIV, b: CANC, ca: C.green, cb: C.red, ka: "ativações", kb: "cancelamentos", labels: M, alt: "ativações e cancelamentos por mês" });
  });
  on("cDonut", function (h) {
    donut(h, {
      center: "R$ 1,24 mi", sub: "receita do mês", alt: "composição da receita",
      data: [{ k: "Internet", v: 74, c: C.blue }, { k: "SVA", v: 14, c: C.orange },
             { k: "Instalação", v: 7, c: C.green }, { k: "Outros", v: 5, c: "#9AB4E8" }]
    });
  });
  on("cHeat", heat);

  /* --- frentes de atuação --- */
  on("v1a", function (h) {
    lineChart(h, {
      small: 1, w: 200, h: 56, alt: "evolução da base ativa",
      series: [{ d: [11380, 11460, 11520, 11610, 11690, 11810, 11920, 12040, 12160, 12280, 12352, 12480], c: C.blue }],
      fmt: function (v) { return br(v) + " assinantes"; }
    });
  });
  on("v1b", function (h) {
    funnel(h, { rh: 17, rows: [{ k: "Leads", v: 640 }, { k: "Propostas", v: 312 }, { k: "Vendas", v: 214 }, { k: "Ativados", v: 169 }] });
  });
  on("v2a", function (h) {
    steps(h, [
      { k: "COBRANÇA", v: "Régua padronizada", done: true },
      { k: "OS", v: "Ordem de serviço revisada", done: true },
      { k: "CONTRATO", v: "Modelo único", done: true },
      { k: "FISCAL", v: "Em parametrização", alert: true }
    ]);
  });
  on("v2b", function (h) {
    hBar(h, {
      rh: 16, alt: "tempo médio de ciclo por processo",
      rows: [{ k: "INSTALAÇÃO", v: 6.4, t: "6,4 d", alert: 1 }, { k: "COBRANÇA", v: 11, t: "11 d", alert: 1 },
             { k: "CANCELAM.", v: 2.1, t: "2,1 d" }, { k: "FATURAM.", v: 0.3, t: "0,3 d" }]
    });
  });
  on("v3a", function (h) {
    barChart(h, { w: 200, h: 64, a: [820, 845, 860, 875, 890, 906], b: [806, 838, 852, 881, 872, 868], ca: "#9AB4E8", cb: C.blue, ka: "orçado", kb: "realizado", labels: ["abr", "set"], alt: "orçado contra realizado" });
  });
  on("v3b", function (h) {
    donut(h, {
      h: 100, center: "35,1%", sub: "margem", alt: "composição do resultado",
      data: [{ k: "Pessoal", v: 31, c: C.blue }, { k: "Rede e link", v: 22, c: "#4D8BFF" },
             { k: "Tributos", v: 12, c: C.orange }, { k: "Resultado", v: 35, c: C.green }]
    });
  });
  on("v4a", pipeline);
  on("v4b", function (h) { gauge(h, { v: 68, k: "rotinas sem toque humano", c: C.blue }); });
  on("v5a", function (h) {
    steps(h, [
      { k: "DADO", v: "Fontes integradas", done: true }, { k: "PAINEL", v: "Painéis publicados", done: true },
      { k: "ACESSO", v: "Gestores treinados", done: true }, { k: "RITO", v: "Reunião semanal rodando" }
    ]);
  });
  on("v5b", function (h) {
    hBar(h, {
      rh: 16, alt: "cobertura de indicadores por área",
      rows: [{ k: "COMERCIAL", v: 100, t: "100%" }, { k: "FINANCEIRO", v: 100, t: "100%" },
             { k: "CAMPO", v: 85, t: "85%" }, { k: "FISCAL", v: 60, t: "60%", alert: 1 }]
    });
  });
  on("v6a", function (h) {
    steps(h, [
      { k: "ESCOPO", v: "Levantamento na operação", done: true },
      { k: "PROTÓTIPO", v: "Telas validadas", done: true },
      { k: "ENTREGA", v: "Em desenvolvimento", alert: true },
      { k: "SUPORTE", v: "Sustentação mensal" }
    ]);
  });
  on("v6b", function (h) {
    lineChart(h, {
      small: 1, w: 200, h: 56, alt: "horas manuais eliminadas",
      series: [{ d: [0, 18, 44, 72, 96, 118, 141, 160], c: C.green }],
      fmt: function (v) { return br(v) + " h/mês economizadas"; }
    });
  });

  /* --- método --- */
  on("m1", function (h) {
    hBar(h, {
      rh: 15, alt: "maturidade encontrada no diagnóstico",
      rows: [{ k: "PROCESSOS", v: 42, t: "42%", alert: 1 }, { k: "CONTROLES", v: 35, t: "35%", alert: 1 },
             { k: "INDICADORES", v: 28, t: "28%", alert: 1 }]
    });
  });
  on("m2", function (h) {
    steps(h, [{ k: "CONTAS", v: "Plano de contas", done: true },
              { k: "ROTINA", v: "Calendário de fechamento", done: true },
              { k: "CONTROLE", v: "Alçadas definidas" }]);
  });
  on("m3", pipeline);
  on("m4", function (h) {
    lineChart(h, {
      small: 1, w: 200, h: 54, alt: "avanço do plano de ação",
      series: [{ d: [28, 36, 45, 54, 63, 70, 75], c: C.blue }],
      fmt: function (v) { return v + "% do plano concluído"; }
    });
  });

  /* --- painéis --- */
  on("pAtiv", function (h) { barChart(h, { w: 240, h: 82, a: ATIV, ca: C.green, ka: "ativações", labels: M, alt: "ativações por mês" }); });
  on("pChurn", function (h) {
    lineChart(h, { w: 240, h: 82, alt: "churn nos últimos seis meses", series: [{ d: [2.02, 1.94, 1.88, 1.79, 1.71, 1.62], c: C.blue }], fmt: function (v) { return br(v, 2) + "%"; } });
  });
  on("pInad", function (h) {
    lineChart(h, { w: 240, h: 82, alt: "inadimplência nos últimos seis meses", series: [{ d: [6.9, 6.4, 6.0, 5.6, 5.2, 4.8], c: C.orange }], fmt: function (v) { return br(v, 1) + "%"; } });
  });
  on("pProd", function (h) {
    hBar(h, {
      rh: 18, alt: "produtividade por equipe de campo",
      rows: [{ k: "EQUIPE A", v: 96, t: "96%" }, { k: "EQUIPE B", v: 92, t: "92%" },
             { k: "EQUIPE C", v: 88, t: "88%" }, { k: "EQUIPE D", v: 74, t: "74%", alert: 1 }]
    });
  });
  on("pCresc", function (h) {
    lineChart(h, { w: 240, h: 82, labels: M, alt: "receita acumulada em 12 meses", series: [{ d: REC, c: C.blue }], fmt: function (v) { return "R$ " + br(v) + " mil"; } });
  });
  on("pGauge", function (h) { gauge(h, { v: 75, k: "controles no ar", c: C.green }); });

  /* --- diagnóstico --- */
  on("dRadar", function (h) {
    radar(h, {
      axes: ["Processos", "Controles", "Indicadores", "Fechamento", "Cobrança", "Sistemas"],
      now:   [.42, .35, .28, .40, .48, .52],
      after: [.88, .82, .92, .90, .85, .80]
    });
  });

  /* ---------- KPIs com variação leve ---------- */
  var K = [
    { id: "k1", v: 12480,   f: "int",   vol: .004 },
    { id: "k2", v: 1242000, f: "brl",   vol: .012 },
    { id: "k3", v: 35.1,    f: "pct",   vol: .02 },
    { id: "k4", v: 1.62,    f: "pct2",  vol: .03 },
    { id: "k5", v: 4.8,     f: "pct",   vol: .03 },
    { id: "k6", v: 99.4,    f: "money", vol: .01 }
  ];
  function fm(v, f) {
    if (f === "brl") return v >= 1e6 ? "R$ " + br(v / 1e6, 2) + " mi" : "R$ " + br(v / 1000) + " mil";
    if (f === "pct") return br(v, 1) + "%";
    if (f === "pct2") return br(v, 2) + "%";
    if (f === "money") return "R$ " + br(v, 2);
    return br(v);
  }
  K.forEach(function (k) { var e = el(k.id); if (e) e.textContent = fm(k.v, k.f); });

  if (!RM) {
    var kpiTimer = null;
    function tickKpi() {
      K.forEach(function (k) {
        var e = el(k.id);
        if (!e) return;
        var from = k.v, to = k.v * (1 + (Math.random() - .5) * k.vol), s = performance.now();
        (function step(now) {
          var p = Math.min((now - s) / 620, 1);
          e.textContent = fm(from + (to - from) * p, k.f);
          if (p < 1) requestAnimationFrame(step);
        })(s);
        k.v = to;
      });
    }
    function startKpi() { if (kpiTimer === null) kpiTimer = setInterval(tickKpi, 2900); }
    function stopKpi() { if (kpiTimer !== null) { clearInterval(kpiTimer); kpiTimer = null; } }
    startKpi();
    document.addEventListener("visibilitychange", function () { document.hidden ? stopKpi() : startKpi(); });
  }

  /* ---------- fluxo grande + redimensionamento ---------- */
  procFlow();
  var rt = null, lastW = window.innerWidth;
  window.addEventListener("resize", function () {
    if (window.innerWidth === lastW) return;   /* ignora barra de endereço em mobile */
    lastW = window.innerWidth;
    clearTimeout(rt);
    rt = setTimeout(procFlow, 220);
  });
} catch (err) {
  /* um gráfico com problema não pode derrubar o restante da página */
  if (window.console && console.error) console.error("Baishift · falha ao montar os gráficos:", err);
}

})();
