# Painel do gestor · Fase 4 — métricas

> **For agentic workers:** REQUIRED SUB-SKILL: Use subagent-driven-development (recommended) or executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** O site registra visitas, seções alcançadas, cliques, slides do carrossel e formulários sem cookies; o servidor guarda os eventos no disco persistente com cidade/UF por IP (IP nunca gravado); o painel mostra a "Visão geral" com filtro de 7, 30 ou 90 dias.

**Architecture:** um módulo pequeno no fim de `assets/js/site.js` manda eventos por `sendBeacon` para `POST /api/evento`; `lib/metricas.js` valida, enriquece (origem, dispositivo, hash diário do visitante, geolocalização com cache) e grava uma linha JSON por evento em `dados/eventos/AAAA-MM.jsonl`; a mesma lib agrega sob demanda com cache de 60 s; `lib/painel-conteudo.js` ganha `GET metricas?periodo=`; `gestor/tela-metricas.js` desenha cartões, um gráfico SVG e tabelas.

**Tech Stack:** Node ≥ 20 (`fetch` + `AbortController` para a geolocalização), `node:test`, JS puro no site e no painel.

Spec: seção 8 (e 12). Blocos de código marcados com `<!-- arquivo: caminho -->`.

---

### Task 1: Registro e agregação (`lib/metricas.js`)

- [ ] **Step 1: Teste**

<!-- arquivo: test/metricas.test.js -->
```js
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const dados = require("../lib/dados");
dados.usar(fs.mkdtempSync(path.join(os.tmpdir(), "baishift-met-")));
dados.preparar();
const M = require("../lib/metricas");

test("validar: aceita os cinco tipos, corta tamanhos, recusa lixo", () => {
  const e = M.validar({ tipo: "pagina", pagina: "/outros/severino", ref: "https://www.google.com/search?q=x", utm: { source: "ig", medium: "x".repeat(200), lixo: 1 }, largura: 390 });
  assert.equal(e.pagina, "/outros/severino"); assert.equal(e.utm.medium.length, 80); assert.equal("lixo" in e.utm, false);
  assert.equal(M.validar({ tipo: "video", pagina: "/" }), null);
  assert.equal(M.validar({ tipo: "pagina", pagina: "http://x" }), null);
  assert.equal(M.validar("x"), null);
  assert.equal(M.validar({ tipo: "clique", pagina: "/", alvo: "a".repeat(500) }).alvo.length, 120);
});

test("origem e dispositivo", () => {
  assert.equal(M.origem("https://www.google.com/search?q=x", {}), "google");
  assert.equal(M.origem("https://l.instagram.com/?u=x", {}), "instagram");
  assert.equal(M.origem("", { source: "WhatsApp" }), "whatsapp");
  assert.equal(M.origem("https://lm.facebook.com/", {}), "facebook");
  assert.equal(M.origem("https://www.linkedin.com/feed/", {}), "linkedin");
  assert.equal(M.origem("https://outrosite.com.br/blog", {}), "outrosite.com.br");
  assert.equal(M.origem("https://www.baishift.com.br/outros/severino", {}), "direto");
  assert.equal(M.origem("", {}), "direto");
  assert.equal(M.dispositivo(390, "Mozilla/5.0 (Macintosh)"), "celular");
  assert.equal(M.dispositivo(1440, "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)"), "celular");
  assert.equal(M.dispositivo(1440, "Mozilla/5.0 (Macintosh)"), "computador");
});

test("robôs são ignorados; hash do visitante muda por dia e não expõe o IP", () => {
  assert.equal(M.robo("Mozilla/5.0 (compatible; Googlebot/2.1)"), true);
  assert.equal(M.robo("HeadlessChrome/120"), true);
  assert.equal(M.robo("Mozilla/5.0 (iPhone) Safari/604.1"), false);
  const a = M.visitante("1.2.3.4", "ua", "2026-09-03"), b = M.visitante("1.2.3.4", "ua", "2026-09-04"), c = M.visitante("1.2.3.5", "ua", "2026-09-03");
  assert.match(a, /^[0-9a-f]{16}$/); assert.notEqual(a, b); assert.notEqual(a, c);
  assert.equal(M.visitante("1.2.3.4", "ua", "2026-09-03"), a);
});

test("geolocalização: cache por IP, tempo limite, IP privado", async () => {
  let chamadas = 0;
  const fetchOk = async url => { chamadas++; assert.match(String(url), /ipwho\.is\/8\.8\.8\.8/); return { ok: true, json: async () => ({ success: true, city: "Rolim de Moura", region_code: "RO", country_code: "BR" }) }; };
  const g1 = await M.localizar("8.8.8.8", { fetchFn: fetchOk });
  assert.deepEqual(g1, { cidade: "Rolim de Moura", uf: "RO", pais: "BR" });
  await M.localizar("8.8.8.8", { fetchFn: fetchOk });
  assert.equal(chamadas, 1, "segunda consulta vem do cache");
  assert.deepEqual(await M.localizar("192.168.0.10", { fetchFn: fetchOk }), { cidade: "", uf: "", pais: "" });
  assert.deepEqual(await M.localizar("127.0.0.1", { fetchFn: fetchOk }), { cidade: "", uf: "", pais: "" });
  const lento = (url, o) => new Promise((res, rej) => { o.signal.addEventListener("abort", () => rej(new Error("abort"))); });
  assert.deepEqual(await M.localizar("9.9.9.9", { fetchFn: lento, timeoutMs: 30 }), { cidade: "", uf: "", pais: "" });
  const reserva = async url => String(url).includes("ipwho") ? { ok: false, status: 429, json: async () => ({}) } : { ok: true, json: async () => ({ city: "Cacoal", region_code: "RO", country_code: "BR" }) };
  assert.deepEqual(await M.localizar("7.7.7.7", { fetchFn: reserva }), { cidade: "Cacoal", uf: "RO", pais: "BR" });
});

test("registrar grava uma linha por evento e respeita o limite por IP", async () => {
  const agora = new Date("2026-09-03T12:00:00Z");
  const geo = async () => ({ cidade: "Ji-Paraná", uf: "RO", pais: "BR" });
  const ok = await M.registrar({ tipo: "pagina", pagina: "/", ref: "https://www.google.com/", utm: {}, largura: 1440 }, { ip: "1.2.3.4", ua: "Mozilla/5.0 (Macintosh)", agora, geo });
  assert.equal(ok, true);
  assert.equal(await M.registrar({ tipo: "pagina", pagina: "/" }, { ip: "1.2.3.4", ua: "Googlebot", agora, geo }), false, "robô ignorado");
  const linhas = fs.readFileSync(dados.caminho("eventos", "2026-09.jsonl"), "utf8").trim().split("\n");
  assert.equal(linhas.length, 1);
  const e = JSON.parse(linhas[0]);
  assert.equal(e.t, "2026-09-03T12:00:00.000Z"); assert.equal(e.origem, "google"); assert.equal(e.disp, "computador"); assert.equal(e.cidade, "Ji-Paraná"); assert.equal(e.uf, "RO");
  assert.match(e.vis, /^[0-9a-f]{16}$/); assert.equal("ip" in e, false);
  const lim = new M.Limite(3, () => agora.getTime());
  assert.deepEqual([lim.permite("x"), lim.permite("x"), lim.permite("x"), lim.permite("x")], [true, true, true, false]);
});

test("resumo agrega o período e compara com o anterior", async () => {
  const dir = dados.caminho("eventos");
  fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
  const agora = new Date("2026-09-10T12:00:00Z");
  const ev = (dia, tipo, extra) => JSON.stringify(Object.assign({ t: "2026-09-" + String(dia).padStart(2, "0") + "T10:00:00.000Z", tipo, pagina: "/", alvo: "", origem: "direto", utm: {}, disp: "computador", cidade: "Rolim de Moura", uf: "RO", pais: "BR", vis: "v" + dia }, extra));
  const linhas = [
    ev(9, "pagina", { origem: "google", cidade: "Cacoal" }), ev(9, "pagina", { vis: "v9b", disp: "celular" }), ev(9, "secao", { alvo: "diagnostico" }), ev(9, "secao", { alvo: "contato" }),
    ev(9, "clique", { alvo: "carrossel:1" }), ev(9, "slide", { alvo: "1" }), ev(9, "slide", { alvo: "2" }), ev(9, "formulario", { alvo: "diagnostico" }),
    ev(10, "pagina", { pagina: "/outros/severino" }), ev(10, "clique", { alvo: "menu:outros:severino" }), ev(10, "formulario", { alvo: "lista:severino", pagina: "/outros/severino" }),
    ev(10, "clique", { alvo: "whatsapp:rodape" }),
    ev(2, "pagina", { vis: "antes1" }), ev(2, "pagina", { vis: "antes1" }), ev(3, "pagina", { vis: "antes2" })
  ];
  fs.writeFileSync(path.join(dir, "2026-09.jsonl"), linhas.join("\n") + "\n");
  const r = M.resumo(7, { agora, produtos: [{ slug: "severino", nome: "Severino" }, { slug: "aprova-ordem", nome: "Aprova · Ordem" }], semCache: true });
  assert.equal(r.periodo, 7);
  assert.equal(r.totais.visitas.valor, 3); assert.equal(r.totais.visitas.anterior, 3);
  assert.equal(r.totais.visitantes.valor, 3); assert.equal(r.totais.visitantes.anterior, 2);
  assert.equal(r.totais.formularios.valor, 2); assert.equal(r.totais.cliquesAnuncio.valor, 1);
  assert.equal(r.porDia.length, 7); assert.equal(r.porDia[6].dia, "2026-09-10"); assert.equal(r.porDia[5].visitas, 2);
  assert.deepEqual(r.paginas[0], { pagina: "/", visitas: 2 });
  assert.deepEqual(r.origens, [{ origem: "direto", visitas: 2 }, { origem: "google", visitas: 1 }]);
  assert.deepEqual(r.cidades[0], { cidade: "Rolim de Moura", uf: "RO", visitas: 2 });
  assert.deepEqual(r.estados[0], { uf: "RO", visitas: 3 });
  assert.deepEqual(r.dispositivos, { celular: 1, computador: 2 });
  assert.equal(r.secoes.find(s => s.secao === "diagnostico").visitas, 1); assert.equal(r.secoes.find(s => s.secao === "faq").visitas, 0);
  assert.equal(r.secoes[0].base, 2, "base = visitas da página principal");
  assert.deepEqual(r.cliques[0], { alvo: "carrossel:1", cliques: 1 });
  assert.deepEqual(r.carrossel, [{ imagem: 1, exibicoes: 1, cliques: 1 }, { imagem: 2, exibicoes: 1, cliques: 0 }]);
  assert.deepEqual(r.produtos[0], { slug: "severino", nome: "Severino", visitas: 1, cliquesMenu: 1, cliquesBlocos: 0, inscricoes: 1 });
  assert.deepEqual(r.formularios, { diagnostico: 1, listas: { severino: 1 } });
});

test("retenção: apaga meses com mais de 13 meses", () => {
  const dir = dados.caminho("eventos");
  fs.writeFileSync(path.join(dir, "2025-01.jsonl"), ""); fs.writeFileSync(path.join(dir, "2025-09.jsonl"), "");
  assert.deepEqual(M.limparAntigos(new Date("2026-09-10T00:00:00Z")), ["2025-01.jsonl"]);
});
```

- [ ] **Step 2: Implementar**

<!-- arquivo: lib/metricas.js -->
```js
/* Métricas próprias do site: sem cookies, sem IP gravado.
   Cada evento vira uma linha JSON em dados/eventos/AAAA-MM.jsonl; o resumo lê o período pedido e agrega. */
"use strict";
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const dados = require("./dados");

const TIPOS = new Set(["pagina", "secao", "clique", "slide", "formulario"]);
const SECOES = ["diagnostico", "processos", "dashboard", "modelos", "faq", "contato"];
const RE_ROBO = /bot|crawler|spider|headless|lighthouse|curl|wget|python|slurp|facebookexternalhit|preview|monitor/i;
const RE_MOVEL = /Mobi|Android|iPhone|iPad|iPod/i;
const RE_PRIVADO = /^(10\.|127\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|::1$|fc|fd|fe80|0\.0\.0\.0|localhost)/i;

/* ---------- validação e classificação ---------- */
const corta = (s, n) => String(s == null ? "" : s).slice(0, n);
function validar(e) {
  if (!e || typeof e !== "object" || !TIPOS.has(e.tipo)) return null;
  const pagina = corta(e.pagina, 200);
  if (!pagina.startsWith("/")) return null;
  const utm = {};
  if (e.utm && typeof e.utm === "object") for (const k of ["source", "medium", "campaign"]) if (e.utm[k]) utm[k] = corta(e.utm[k], 80);
  return { tipo: e.tipo, pagina, alvo: corta(e.alvo, 120), ref: corta(e.ref, 300), utm, largura: Number(e.largura) || 0 };
}
function origem(ref, utm) {
  const fonte = String((utm && utm.source) || "").toLowerCase();
  let host = "";
  try { host = new URL(ref).hostname.toLowerCase(); } catch { host = ""; }
  const texto = fonte + " " + host;
  if (/google/.test(texto)) return "google";
  if (/instagram|^ig\b|\big\b/.test(texto)) return "instagram";
  if (/facebook|fb\.|\bfb\b/.test(texto)) return "facebook";
  if (/whatsapp|\bwa\b/.test(texto)) return "whatsapp";
  if (/linkedin/.test(texto)) return "linkedin";
  if (/youtube|youtu\.be/.test(texto)) return "youtube";
  if (fonte) return fonte.slice(0, 40);
  if (!host || /baishift\.com\.br$/.test(host)) return "direto";
  return host.replace(/^www\./, "");
}
function dispositivo(largura, ua) { return (largura && largura < 760) || RE_MOVEL.test(ua || "") ? "celular" : "computador"; }
function robo(ua) { return !ua || RE_ROBO.test(ua); }
function visitante(ip, ua, dia) { return crypto.createHash("sha256").update(dados.segredo() + "|" + dia + "|" + ip + "|" + ua).digest("hex").slice(0, 16); }

/* ---------- limite por IP (janela de um minuto) ---------- */
class Limite {
  constructor(max = 120, relogio = () => Date.now()) { this.max = max; this.relogio = relogio; this.mapa = new Map(); }
  permite(chave) {
    const agora = this.relogio(), r = this.mapa.get(chave);
    if (!r || agora - r.inicio > 60000) { this.mapa.set(chave, { inicio: agora, n: 1 }); if (this.mapa.size > 10000) this.mapa.clear(); return true; }
    r.n++; return r.n <= this.max;
  }
}

/* ---------- geolocalização por IP, com cache ---------- */
const VAZIO = { cidade: "", uf: "", pais: "" };
const cacheGeo = new Map(), emCurso = new Map();
async function consultar(url, fetchFn, timeoutMs, ler) {
  const ac = new AbortController(), t = setTimeout(() => ac.abort(), timeoutMs);
  try {
    const r = await fetchFn(url, { signal: ac.signal, headers: { "User-Agent": "baishift-site" } });
    if (!r.ok) return null;
    return ler(await r.json());
  } catch { return null; } finally { clearTimeout(t); }
}
const normalizarIp = ip => String(ip || "").replace(/^::ffff:/i, "");
async function localizar(ip, o = {}) {
  ip = normalizarIp(ip);
  if (!ip || RE_PRIVADO.test(ip)) return VAZIO;
  const agora = Date.now(), c = cacheGeo.get(ip);
  if (c && c.ate > agora) return c.geo;
  if (emCurso.has(ip)) return emCurso.get(ip);
  const fetchFn = o.fetchFn || fetch, timeoutMs = o.timeoutMs || 1500;
  const p = (async () => {
    const limpa = j => j && (j.city || j.region_code || j.country_code) ? { cidade: corta(j.city, 60), uf: corta(j.region_code, 8), pais: corta(j.country_code, 4) } : null;
    const geo = await consultar("https://ipwho.is/" + encodeURIComponent(ip) + "?fields=success,city,region_code,country_code", fetchFn, timeoutMs, j => j.success === false ? null : limpa(j))
      || await consultar("https://ipapi.co/" + encodeURIComponent(ip) + "/json/", fetchFn, timeoutMs, limpa) || VAZIO;
    if (cacheGeo.size > 5000) cacheGeo.delete(cacheGeo.keys().next().value);
    cacheGeo.set(ip, { geo, ate: agora + 24 * 3600 * 1000 });
    emCurso.delete(ip);
    return geo;
  })();
  emCurso.set(ip, p);
  return p;
}

/* ---------- registro ---------- */
async function registrar(bruto, o) {
  const e = validar(bruto);
  if (!e || robo(o.ua)) return false;
  const agora = o.agora || new Date(), dia = agora.toISOString().slice(0, 10), ip = normalizarIp(o.ip);
  const geo = await (o.geo ? o.geo(ip) : localizar(ip));
  const linha = { t: agora.toISOString(), tipo: e.tipo, pagina: e.pagina, alvo: e.alvo, origem: origem(e.ref, e.utm), utm: e.utm,
    disp: dispositivo(e.largura, o.ua), cidade: geo.cidade, uf: geo.uf, pais: geo.pais, vis: visitante(ip, o.ua || "", dia) };
  fs.mkdirSync(dados.caminho("eventos"), { recursive: true });
  fs.appendFileSync(dados.caminho("eventos", agora.toISOString().slice(0, 7) + ".jsonl"), JSON.stringify(linha) + "\n");
  return true;
}

/* ---------- leitura e agregação ---------- */
function lerEventos(de, ate) {
  const saida = [], meses = new Set();
  for (let d = new Date(de); d <= ate; d.setUTCMonth(d.getUTCMonth() + 1, 1)) meses.add(d.toISOString().slice(0, 7));
  meses.add(ate.toISOString().slice(0, 7));
  for (const m of meses) {
    let texto; try { texto = fs.readFileSync(dados.caminho("eventos", m + ".jsonl"), "utf8"); } catch { continue; }
    for (const l of texto.split("\n")) {
      if (!l) continue;
      let e; try { e = JSON.parse(l); } catch { continue; }
      const t = new Date(e.t); if (t >= de && t <= ate) saida.push(e);
    }
  }
  return saida;
}
const contar = (lista, chave) => { const m = new Map(); for (const x of lista) { const k = chave(x); if (k == null) continue; m.set(k, (m.get(k) || 0) + 1); } return m; };
const topo = (m, n, nome, valor = "visitas") => [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, n).map(([k, v]) => Object.assign(typeof nome === "function" ? nome(k) : { [nome]: k }, { [valor]: v }));
function totais(evs) {
  const paginas = evs.filter(e => e.tipo === "pagina");
  const unicos = contar(paginas, e => e.t.slice(0, 10) + "|" + e.vis).size;
  return { visitas: paginas.length, visitantes: unicos, formularios: evs.filter(e => e.tipo === "formulario").length, cliquesAnuncio: evs.filter(e => e.tipo === "clique" && e.alvo.startsWith("carrossel:")).length };
}
const cache = new Map();
function resumo(periodo, o = {}) {
  periodo = [7, 30, 90].includes(Number(periodo)) ? Number(periodo) : 30;
  const agora = o.agora || new Date(), chave = periodo + "|" + agora.toISOString().slice(0, 13);
  if (!o.semCache && cache.has(chave) && cache.get(chave).ate > Date.now()) return cache.get(chave).valor;
  const fim = new Date(Date.UTC(agora.getUTCFullYear(), agora.getUTCMonth(), agora.getUTCDate(), 23, 59, 59, 999));
  const inicio = new Date(fim.getTime() - periodo * 864e5 + 1);
  const antesInicio = new Date(inicio.getTime() - periodo * 864e5), antesFim = new Date(inicio.getTime() - 1);
  const evs = lerEventos(inicio, fim), antes = lerEventos(antesInicio, antesFim);
  const paginas = evs.filter(e => e.tipo === "pagina"), cliques = evs.filter(e => e.tipo === "clique");
  const tAtual = totais(evs), tAntes = totais(antes);
  const porDia = [];
  for (let i = periodo - 1; i >= 0; i--) {
    const dia = new Date(fim.getTime() - i * 864e5).toISOString().slice(0, 10);
    const doDia = paginas.filter(e => e.t.slice(0, 10) === dia);
    porDia.push({ dia, visitas: doDia.length, visitantes: new Set(doDia.map(e => e.vis)).size });
  }
  const home = paginas.filter(e => e.pagina === "/").length;
  const secoes = SECOES.map(s => ({ secao: s, visitas: evs.filter(e => e.tipo === "secao" && e.alvo === s).length, base: home }));
  const slides = new Set(evs.filter(e => e.tipo === "slide").map(e => e.alvo).concat(cliques.filter(e => e.alvo.startsWith("carrossel:")).map(e => e.alvo.slice(10))));
  const carrossel = [...slides].map(Number).filter(n => n > 0).sort((a, b) => a - b).map(n => ({ imagem: n, exibicoes: evs.filter(e => e.tipo === "slide" && e.alvo === String(n)).length, cliques: cliques.filter(e => e.alvo === "carrossel:" + n).length }));
  const produtos = (o.produtos || []).map(p => ({ slug: p.slug, nome: p.nome,
    visitas: paginas.filter(e => e.pagina === "/outros/" + p.slug).length,
    cliquesMenu: cliques.filter(e => e.alvo === "menu:outros:" + p.slug).length,
    cliquesBlocos: cliques.filter(e => e.alvo.startsWith("bloco:" + p.slug + ":")).length,
    inscricoes: evs.filter(e => e.tipo === "formulario" && e.alvo === "lista:" + p.slug).length }));
  const listas = {};
  for (const e of evs) if (e.tipo === "formulario" && e.alvo.startsWith("lista:")) listas[e.alvo.slice(6)] = (listas[e.alvo.slice(6)] || 0) + 1;
  const valor = {
    periodo, de: inicio.toISOString().slice(0, 10), ate: fim.toISOString().slice(0, 10),
    totais: Object.fromEntries(Object.keys(tAtual).map(k => [k, { valor: tAtual[k], anterior: tAntes[k] }])),
    porDia,
    paginas: topo(contar(paginas, e => e.pagina), 10, "pagina"),
    origens: topo(contar(paginas, e => e.origem), 10, "origem"),
    cidades: topo(contar(paginas, e => e.cidade ? e.cidade + "|" + e.uf : null), 10, k => ({ cidade: k.split("|")[0], uf: k.split("|")[1] })),
    estados: topo(contar(paginas, e => e.uf || null), 10, "uf"),
    dispositivos: { celular: paginas.filter(e => e.disp === "celular").length, computador: paginas.filter(e => e.disp !== "celular").length },
    secoes, cliques: topo(contar(cliques, e => e.alvo), 15, "alvo", "cliques"), carrossel, produtos,
    formularios: { diagnostico: evs.filter(e => e.tipo === "formulario" && e.alvo === "diagnostico").length, listas },
    semLocalizacao: paginas.filter(e => !e.cidade).length
  };
  cache.set(chave, { valor, ate: Date.now() + 60000 });
  return valor;
}

/* apaga arquivos de meses com mais de 13 meses; devolve os nomes removidos */
function limparAntigos(agora = new Date()) {
  const limite = new Date(Date.UTC(agora.getUTCFullYear(), agora.getUTCMonth() - 13, 1)).toISOString().slice(0, 7), removidos = [];
  let nomes = []; try { nomes = fs.readdirSync(dados.caminho("eventos")); } catch { return removidos; }
  for (const n of nomes) if (/^\d{4}-\d{2}\.jsonl$/.test(n) && n.slice(0, 7) < limite) { fs.unlinkSync(dados.caminho("eventos", n)); removidos.push(n); }
  return removidos;
}

module.exports = { validar, origem, dispositivo, robo, visitante, Limite, localizar, registrar, resumo, limparAntigos, SECOES };
```

- [ ] **Step 3: Rodar** — `node --test test/metricas.test.js` → `# pass 7`
- [ ] **Step 4: Commit** — `git add lib/metricas.js test/metricas.test.js && git commit -m "Métricas: registro, geolocalização com cache e agregação"`

---

### Task 2: Rota pública `POST /api/evento`, rota do painel e coleta no site

- [ ] **Step 1: `server.js`** — depois do bloco de limpeza de pendentes:

```js
const metricas = require("./lib/metricas");
const antigos = metricas.limparAntigos();
if (antigos.length) console.log("eventos antigos removidos: " + antigos.join(", "));
const limiteEventos = new metricas.Limite(120);

/* POST /api/evento: sinal do site (sem cookies). Responde 204 na hora e registra depois. */
function receberEvento(req, res) {
  const xff = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim();
  const ip = xff || (req.socket && req.socket.remoteAddress) || "";
  const partes = []; let tamanho = 0;
  req.on("data", c => { tamanho += c.length; if (tamanho <= 2048) partes.push(c); });
  req.on("end", () => {
    res.writeHead(204, { "Cache-Control": "no-store" }); res.end();
    if (tamanho > 2048 || !limiteEventos.permite(ip)) return;
    let e; try { e = JSON.parse(Buffer.concat(partes).toString("utf8")); } catch { return; }
    metricas.registrar(e, { ip, ua: String(req.headers["user-agent"] || "") }).catch(err => console.error("métricas:", err.message));
  });
}
```

e, no `createServer`, logo depois do bloco do `/gestor`:

```js
  if (caminho === "/api/evento" && req.method === "POST") return receberEvento(req, res);
```

- [ ] **Step 2: `lib/painel-conteudo.js`** — acrescentar (com `const metricas = require("./metricas");` no topo):

```js
rota("GET", "metricas", {}, ({ req, res }) => {
  const periodo = new URL(req.url, "http://x").searchParams.get("periodo");
  const c = conteudo.carregar();
  json(res, 200, metricas.resumo(periodo, { produtos: c.produtos.map(p => ({ slug: p.slug, nome: p.nome })) }));
});
```

- [ ] **Step 3: `assets/js/site.js`** — inserir antes do `})();` final do arquivo:

<!-- arquivo: assets/js/metricas-trecho.js -->
```js
/* ================= MÉTRICAS PRÓPRIAS (sem cookies, sem terceiros) =================
   Manda eventos pequenos para /api/evento. Não manda em pré-visualização, com "não rastrear"
   ligado, nem em localhost (salvo localStorage "baishift:metricas" = "1", para testar). */
(function () {
  if (document.documentElement.hasAttribute("data-previa")) return;
  if (navigator.doNotTrack === "1" || window.doNotTrack === "1") return;
  var host = location.hostname, local = host === "localhost" || /^127\./.test(host), ligado = false;
  try { ligado = localStorage.getItem("baishift:metricas") === "1"; } catch (e) { /* sem localStorage */ }
  if (local && !ligado) return;
  var pagina = location.pathname, ref = document.referrer || "", utm = {};
  try { var q = new URLSearchParams(location.search); ["source", "medium", "campaign"].forEach(function (k) { var v = q.get("utm_" + k); if (v) utm[k] = v.slice(0, 80); }); } catch (e) { /* sem URLSearchParams */ }
  function enviar(tipo, alvo) {
    var corpo = JSON.stringify({ tipo: tipo, pagina: pagina, alvo: alvo || "", ref: ref.slice(0, 300), utm: utm, largura: window.innerWidth });
    try { if (navigator.sendBeacon && navigator.sendBeacon("/api/evento", new Blob([corpo], { type: "text/plain" }))) return; } catch (e) { /* cai no fetch */ }
    try { fetch("/api/evento", { method: "POST", headers: { "Content-Type": "text/plain" }, body: corpo, keepalive: true }).catch(function () {}); } catch (e) { /* sem fetch */ }
  }
  enviar("pagina");
  var vistas = {};
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (es) { es.forEach(function (e) { var id = e.target.id; if (e.isIntersecting && !vistas[id]) { vistas[id] = 1; enviar("secao", id); io.unobserve(e.target); } }); }, { threshold: 0.2 });
    ["diagnostico", "processos", "dashboard", "modelos", "faq", "contato"].forEach(function (id) { var s = el(id); if (s) io.observe(s); });
  }
  document.addEventListener("click", function (e) { var a = e.target.closest ? e.target.closest("[data-ev]") : null; if (a && a.tagName !== "FORM") enviar("clique", a.getAttribute("data-ev")); });
  document.addEventListener("submit", function (e) {
    var f = e.target; if (!f.checkValidity || !f.checkValidity()) return;
    if (f.id === "lead") enviar("formulario", "diagnostico"); else if (f.getAttribute("data-ev")) enviar("formulario", f.getAttribute("data-ev"));
  }, true);
  var cs = el("carrossel");
  if (cs) { var slides = {}; var slide = function (i) { if (!slides[i]) { slides[i] = 1; enviar("slide", String(i + 1)); } }; slide(0); cs.addEventListener("slide", function (e) { slide(e.detail); }); }
})();
```

- [ ] **Step 4: Teste de integração** — em `test/servidor.test.js`, antes do teste "cinco erros bloqueiam o IP":

```js
test("métricas: evento público grava e o painel lê o resumo", async () => {
  let r = await fetch(base + "/api/evento", { method: "POST", headers: { "content-type": "text/plain", "user-agent": "Mozilla/5.0 (Macintosh)" }, body: JSON.stringify({ tipo: "pagina", pagina: "/", largura: 1440 }) });
  assert.equal(r.status, 204);
  r = await fetch(base + "/api/evento", { method: "POST", body: "lixo" }); assert.equal(r.status, 204);
  await new Promise(res => setTimeout(res, 300));
  r = await pede("GET", "/gestor/api/metricas?periodo=7", { cookie: cookieDono });
  assert.equal(r.status, 200); assert.equal(r.json.periodo, 7); assert.ok(r.json.totais.visitas.valor >= 1); assert.equal(r.json.produtos.length, 3);
  assert.equal((await pede("GET", "/gestor/api/metricas")).status, 401);
});
```

- [ ] **Step 5: Rodar** — `node --check assets/js/site.js && npm test` → `# fail 0`
- [ ] **Step 6: Commit** — `git add server.js lib/painel-conteudo.js assets/js/site.js test/servidor.test.js && git commit -m "Métricas: rota pública, resumo no painel e coleta no site"`

---

### Task 3: Tela "Visão geral" (`gestor/tela-metricas.js`)

- [ ] **Step 1: Implementar**

<!-- arquivo: gestor/tela-metricas.js -->
```js
/* Tela "Visão geral": cartões, gráfico de visitas por dia (SVG) e tabelas do período. */
(function () {
  "use strict";
  const { el, api } = G;
  const fmt = n => Number(n || 0).toLocaleString("pt-BR");
  const dataBR = d => d.split("-").reverse().join("/");
  const NOME_SECAO = { diagnostico: "Diagnóstico", processos: "Processos", dashboard: "Dashboard", modelos: "Modelos", faq: "FAQ", contato: "Contato" };
  const NOME_ORIGEM = { google: "Google", instagram: "Instagram", facebook: "Facebook", whatsapp: "WhatsApp", linkedin: "LinkedIn", youtube: "YouTube", direto: "Direto / link" };
  function nomeAlvo(a) {
    const i = a.indexOf(":"), k = i < 0 ? a : a.slice(0, i), resto = i < 0 ? "" : a.slice(i + 1);
    return ({ whatsapp: "WhatsApp · " + resto, cta: "Botão · " + resto, menu: "Menu · " + resto.replace("outros:", ""), carrossel: "Anúncio " + resto, lista: "Lista de espera · " + resto, bloco: "Bloco · " + resto })[k] || a;
  }
  function delta(v, a) {
    if (!a) return el("span", { class: "delta", text: v ? "sem base anterior" : "—" });
    const p = Math.round((v - a) / a * 100);
    return el("span", { class: "delta " + (p >= 0 ? "sobe" : "desce"), text: (p >= 0 ? "+" : "") + p + "% vs. período anterior" });
  }
  const cartao = (rotulo, t) => el("div", { class: "kpi" }, el("span", { class: "mono", text: rotulo }), el("b", { text: fmt(t.valor) }), delta(t.valor, t.anterior));
  function grafico(porDia) {
    const W = 720, H = 170, P = 26, n = porDia.length, max = Math.max(1, ...porDia.map(d => d.visitas)), bw = (W - P * 2) / n;
    const ns = (t, a) => { const e = document.createElementNS("http://www.w3.org/2000/svg", t); for (const k in a) e.setAttribute(k, a[k]); return e; };
    const svg = ns("svg", { viewBox: "0 0 " + W + " " + H, class: "grafico", role: "img", "aria-label": "visitas por dia" });
    porDia.forEach((d, i) => {
      const h = (H - P * 2) * d.visitas / max, x = P + i * bw;
      const r = ns("rect", { x: x + bw * 0.15, y: H - P - h, width: bw * 0.7, height: h, rx: 3, class: "barra" });
      const t = ns("title", {}); t.textContent = dataBR(d.dia) + ": " + d.visitas + " visitas, " + d.visitantes + " visitantes"; r.append(t); svg.append(r);
    });
    [0, Math.floor(n / 2), n - 1].forEach(i => { const t = ns("text", { x: P + i * bw + bw / 2, y: H - 7, "text-anchor": "middle", class: "rotulo" }); t.textContent = porDia[i].dia.slice(5).split("-").reverse().join("/"); svg.append(t); });
    return svg;
  }
  function tabela(colunas, linhas, vazio) {
    if (!linhas.length) return el("p", { class: "vazio", text: vazio || "Sem dados no período." });
    return el("div", { class: "tabela-scroll" }, el("table", { class: "tabela" },
      el("thead", {}, el("tr", {}, colunas.map(c => el("th", { text: c.t, class: c.num ? "num" : null })))),
      el("tbody", {}, linhas.map(l => el("tr", {}, colunas.map(c => el("td", { class: c.num ? "num" : null }, c.v(l))))))));
  }
  const card = (titulo, ...kids) => el("div", { class: "card" }, el("h2", { text: titulo }), kids);
  const n = (t, v) => ({ t, v, num: true });

  async function render(host, periodo) {
    periodo = [7, 30, 90].includes(Number(periodo)) ? Number(periodo) : 30;
    host.innerHTML = "";
    const seg = el("div", { class: "seg" }, [7, 30, 90].map(p => el("button", { type: "button", class: p === periodo ? "ativo" : "", onclick: () => render(host, p) }, p + " dias")));
    host.append(el("div", { class: "tela-cab" }, el("div", {}, el("h1", { text: "Visão geral" }), el("p", { text: "Como as pessoas chegam ao site e o que fazem nele." })), seg));
    let r;
    try { r = await api("GET", "metricas?periodo=" + periodo); } catch (e) { host.append(el("p", { class: "vazio", text: e.message })); return; }
    host.append(el("div", { class: "kpis" }, cartao("Visitas", r.totais.visitas), cartao("Visitantes · únicos por dia", r.totais.visitantes), cartao("Formulários enviados", r.totais.formularios), cartao("Cliques em anúncios", r.totais.cliquesAnuncio)));
    host.append(card("Visitas por dia · " + dataBR(r.de) + " a " + dataBR(r.ate), grafico(r.porDia)));
    host.append(el("div", { class: "duas" },
      card("Páginas mais vistas", tabela([{ t: "Página", v: l => l.pagina }, n("Visitas", l => fmt(l.visitas))], r.paginas)),
      card("De onde vieram", tabela([{ t: "Origem", v: l => NOME_ORIGEM[l.origem] || l.origem }, n("Visitas", l => fmt(l.visitas))], r.origens)),
      card("Cidades", tabela([{ t: "Cidade", v: l => l.cidade + (l.uf ? " · " + l.uf : "") }, n("Visitas", l => fmt(l.visitas))], r.cidades, "Sem localização no período" + (r.semLocalizacao ? " (" + r.semLocalizacao + " visitas sem cidade)." : "."))),
      card("Estados", tabela([{ t: "UF", v: l => l.uf }, n("Visitas", l => fmt(l.visitas))], r.estados)),
      card("Dispositivos", tabela([{ t: "Tipo", v: l => l.k }, n("Visitas", l => fmt(l.v))], [{ k: "Celular", v: r.dispositivos.celular }, { k: "Computador", v: r.dispositivos.computador }])),
      card("Até onde rolaram na página principal", tabela([{ t: "Seção", v: l => NOME_SECAO[l.secao] || l.secao }, n("Visitas", l => fmt(l.visitas)), n("% de quem abriu", l => l.base ? Math.round(l.visitas / l.base * 100) + "%" : "—")], r.secoes)),
      card("Cliques", tabela([{ t: "Alvo", v: l => nomeAlvo(l.alvo) }, n("Cliques", l => fmt(l.cliques))], r.cliques)),
      card("Anúncios do carrossel", tabela([{ t: "Imagem", v: l => "Imagem " + l.imagem }, n("Exibições", l => fmt(l.exibicoes)), n("Cliques", l => fmt(l.cliques))], r.carrossel, "O carrossel não foi exibido no período.")),
      card("Produtos", tabela([{ t: "Produto", v: l => l.nome }, n("Visitas", l => fmt(l.visitas)), n("Menu", l => fmt(l.cliquesMenu)), n("Blocos", l => fmt(l.cliquesBlocos)), n("Inscrições", l => fmt(l.inscricoes))], r.produtos)),
      card("Formulários", tabela([{ t: "Formulário", v: l => l.k }, n("Envios", l => fmt(l.v))], [{ k: "Diagnóstico", v: r.formularios.diagnostico }].concat(Object.keys(r.formularios.listas).map(s => ({ k: "Lista de espera · " + s, v: r.formularios.listas[s] })))))));
    host.append(el("p", { class: "ajuda-bloco", text: "Métricas próprias, sem cookies. Localização por IP feita no servidor; o IP não é armazenado. Visitantes com \"não rastrear\" ligado não entram na conta." }));
  }
  G.TELAS["visao-geral"] = { titulo: "Visão geral", render: host => render(host, 30) };
})();
```

- [ ] **Step 2: Estilos** — acrescentar a `gestor/gestor.css` antes do bloco RESPONSIVO:

<!-- arquivo: gestor/gestor-fase4.css -->
```css
/* ---------------- VISÃO GERAL ---------------- */
.kpis{display:grid;gap:12px;margin-bottom:16px}
@media(min-width:640px){.kpis{grid-template-columns:repeat(2,1fr)}}
@media(min-width:1000px){.kpis{grid-template-columns:repeat(4,1fr)}}
.kpi{background:#fff;border:1px solid var(--line);border-radius:14px;padding:16px 18px;display:grid;gap:4px}
.kpi b{font-family:var(--display);font-size:1.7rem;letter-spacing:-.02em;line-height:1.1}
.delta{font-size:.76rem;color:var(--muted)}
.delta.sobe{color:var(--green)}
.delta.desce{color:var(--red)}
.seg{display:inline-flex;border:1px solid var(--line);border-radius:10px;padding:3px;background:#fff}
.seg button{border:0;background:none;font-family:var(--mono);font-size:.62rem;letter-spacing:.12em;text-transform:uppercase;padding:7px 12px;border-radius:7px;cursor:pointer;color:var(--muted)}
.seg button.ativo{background:var(--blue);color:#fff}
.grafico{width:100%;height:auto;display:block}
.grafico .barra{fill:var(--blue)}
.grafico .barra:hover{fill:var(--orange)}
.grafico .rotulo{font-family:var(--mono);font-size:10px;fill:var(--muted)}
.duas{display:grid;gap:16px}
@media(min-width:900px){.duas{grid-template-columns:1fr 1fr}.duas .card{margin-bottom:0}}
```

- [ ] **Step 3: `gestor/index.html`** — incluir `<script src="/gestor/tela-metricas.js"></script>` depois de `tela-produtos.js`.

- [ ] **Step 4: Checagem no navegador** — servidor local com `localStorage.setItem("baishift:metricas","1")` no site, navegar pela página (rolar, clicar num botão, trocar slide) e abrir `/gestor` → Visão geral mostra as visitas.

- [ ] **Step 5: Commit** — `git add gestor && git commit -m "Painel: tela Visão geral"`

---

### Task 4: README

- [ ] **Step 1: Acrescentar ao `README.md`, antes de "## Manutenção", a seção do painel:**

```markdown
## Painel do gestor

Em **https://www.baishift.com.br/gestor** (não há link no site). Entra-se com e-mail e senha;
no primeiro acesso o painel obriga a trocar a senha. Administradores cadastram outros
usuários (editores ou administradores) em "Usuários".

**O que dá para editar:** todos os textos da página principal, o visual do início (painel
demonstrativo ligado/desligado ou um carrossel de até 3 imagens com temporizador), os
produtos do menu Outros (com página própria, capa, ícone e blocos livres) e os dados do
site (título, descrições, WhatsApp, e-mail, cidade). Os gráficos animados e os números da
história continuam no código.

**Como funciona por baixo.** O conteúdo é o `conteudo/site.json`. "Visualizar" mostra a
página com o rascunho sem gravar nada. "Publicar" faz um commit no GitHub com o JSON, as
imagens e o HTML gerado, e aplica na hora no servidor; o Railway republica em um ou dois
minutos com o mesmo conteúdo. O rascunho fica no navegador até ser publicado ou descartado.
Sem `GITHUB_TOKEN` e rodando na sua máquina, "Publicar" grava nos arquivos e você faz o commit.

**Imagens** são redimensionadas no navegador (até 1920 px, WebP), conferidas pela assinatura
do arquivo no servidor e nomeadas por conteúdo em `conteudo/imagens/`. SVG não é aceito.

**Métricas ("Visão geral").** O site manda sinais pequenos para `POST /api/evento`
(página, seção alcançada, clique, slide do carrossel, formulário), sem cookies e sem
serviço de terceiros no navegador. O servidor descobre cidade e estado por IP (ipwho.is,
com ipapi.co de reserva), com cache; o IP não é gravado — só um código diário irreversível
para contar visitantes únicos por dia. Os eventos ficam em `dados/eventos/AAAA-MM.jsonl`
por 13 meses. Visitantes com "não rastrear" ligado não são contados. Em `localhost` a coleta
fica desligada, salvo `localStorage.setItem("baishift:metricas", "1")`.

**Disco persistente.** Usuários, sessões, imagens pendentes e eventos ficam fora do
repositório: em `dados/` na sua máquina (ignorado pelo git) e no volume do Railway montado em
`/data` (`railway volume add --mount-path /data`).

**Variáveis de ambiente (Railway → serviço `app` → Variables):**

| Variável | Uso |
|---|---|
| `GESTOR_EMAIL`, `GESTOR_SENHA_INICIAL` | criam o primeiro usuário (administrador) quando ainda não há nenhum; a senha é trocada no primeiro acesso |
| `GESTOR_RESET_SENHA` | escape: no próximo boot redefine a senha de `GESTOR_EMAIL` para esse valor (troca obrigatória). Remova depois de entrar |
| `GITHUB_TOKEN` | token fine-grained só deste repositório, com *Contents: Read and write*. Quando vencer, o painel avisa ao publicar; gere outro e troque aqui |
| `GITHUB_REPO`, `GITHUB_BRANCH` | padrão `joaobaidarolimnet-svg/baishift` e `main` |
| `DADOS_DIR` | pasta do disco persistente (padrão: o volume do Railway ou `./dados`) |

Rodar o painel localmente: `GESTOR_EMAIL=voce@exemplo.com GESTOR_SENHA_INICIAL=12345689 PORT=8900 npm start`
e abra `http://localhost:8900/gestor`.
```

- [ ] **Step 2: Na seção "Estrutura"**, acrescentar as linhas `gestor/  painel do gestor (login, telas, estilos)`, `lib/  … acesso, publicação, imagens, métricas` (ajustar a linha existente de `lib/`) e `dados/  (ignorado) disco persistente local`. Trocar, no topo do README, a frase "As únicas requisições a terceiros são as fontes do Google Fonts." por "No navegador, as únicas requisições a terceiros são as fontes do Google Fonts; o servidor consulta um serviço de localização por IP para as métricas do painel."

- [ ] **Step 3: Commit** — `git add README.md && git commit -m "README: painel do gestor, métricas e variáveis"`

---

## Verificação final da fase

- [ ] `npm test` → `# fail 0`
- [ ] Visão geral no navegador com dados de teste, sem erro no console
