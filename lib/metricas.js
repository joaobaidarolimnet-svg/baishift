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
