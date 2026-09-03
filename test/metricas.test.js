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
