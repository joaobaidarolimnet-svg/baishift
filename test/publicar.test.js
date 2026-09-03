"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const dados = require("../lib/dados");
dados.usar(fs.mkdtempSync(path.join(os.tmpdir(), "baishift-pub-dados-")));
dados.preparar();
const imagens = require("../lib/imagens");
const github = require("../lib/github");
const { publicar, resumo, ErroPublicar } = require("../lib/publicar");

const REPO = path.join(__dirname, "..");
const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]), Buffer.alloc(40, 7)]);
const usuario = { nome: "Gestor", email: "g@baishift.com.br" };

function raizNova() {
  const raiz = fs.mkdtempSync(path.join(os.tmpdir(), "baishift-pub-raiz-"));
  fs.mkdirSync(path.join(raiz, "conteudo", "imagens"), { recursive: true });
  fs.mkdirSync(path.join(raiz, "outros"), { recursive: true });
  fs.copyFileSync(path.join(REPO, "conteudo", "site.json"), path.join(raiz, "conteudo", "site.json"));
  fs.writeFileSync(path.join(raiz, "outros", "velho.html"), "x");
  fs.writeFileSync(path.join(raiz, "conteudo", "imagens", "orfa-00000000.png"), PNG);
  return raiz;
}
const lerJson = raiz => JSON.parse(fs.readFileSync(path.join(raiz, "conteudo", "site.json"), "utf8"));
function rascunhoCom(raiz, mudanca) { const c = lerJson(raiz); mudanca(c); return { conteudo: c, baseadoEm: c.atualizadoEm }; }

test("resumo aponta as seções e os produtos que mudaram", () => {
  const a = lerJson(raizNova()), b = JSON.parse(JSON.stringify(a));
  assert.equal(resumo(a, b), "sem mudança de conteúdo");
  b.inicio.titulo = "x"; b.faq.itens.pop(); b.produtos[0].nome = "Sev"; b.produtos.pop(); b.produtos.push(Object.assign({}, a.produtos[1], { slug: "novo" }));
  assert.equal(resumo(a, b), "início · FAQ · produtos: severino, novo (novo), aprova-suficiencia (removido)");
});

test("modo local: materializa a imagem pendente, gera as páginas, remove órfãs e registra", async () => {
  const raiz = raizNova();
  const p = imagens.guardarPendente(PNG, "severino-capa");
  const r = await publicar(rascunhoCom(raiz, c => { c.produtos[0].capa = { arquivo: p.ref, alt: "Capa" }; c.produtos[2].ativo = false; }), { usuario, raiz, env: {}, agora: new Date("2026-09-03T15:00:00Z") });
  assert.equal(r.modo, "local"); assert.equal(r.commit, null); assert.equal(r.publicadoEm, "2026-09-03T15:00:00.000Z");
  assert.match(r.mensagem, /^Painel: produtos: severino, aprova-suficiencia · 1 imagem nova$/);
  const c = lerJson(raiz);
  const capa = c.produtos[0].capa.arquivo;
  assert.equal(capa, "conteudo/imagens/severino-capa-" + imagens.hash8(PNG) + ".png");
  assert.ok(fs.existsSync(path.join(raiz, capa)), "imagem final gravada");
  assert.ok(!fs.existsSync(path.join(raiz, "conteudo", "imagens", "orfa-00000000.png")), "órfã removida");
  assert.ok(!fs.existsSync(path.join(raiz, "outros", "velho.html")), "página velha removida");
  assert.ok(!fs.existsSync(path.join(raiz, "outros", "aprova-suficiencia.html")), "produto inativo sem página");
  assert.ok(fs.readFileSync(path.join(raiz, "outros", "severino.html"), "utf8").includes(capa));
  assert.ok(fs.existsSync(path.join(raiz, "index.html")) && fs.existsSync(path.join(raiz, "sitemap.xml")));
  assert.equal(imagens.lerPendente(p.id), null, "pendente consumida");
  const hist = dados.lerJson("publicacoes.json", []);
  assert.equal(hist.length, 1); assert.equal(hist[0].modo, "local"); assert.equal(hist[0].quem.email, usuario.email);
});

test("conflito de versão: 409 sem forçar, publica com forcar", async () => {
  const raiz = raizNova();
  const rasc = rascunhoCom(raiz, c => { c.inicio.rotulo = "novo rótulo"; });
  rasc.baseadoEm = "1999-01-01T00:00:00Z";
  await assert.rejects(publicar(rasc, { usuario, raiz, env: {} }), e => e instanceof ErroPublicar && e.status === 409 && e.conflito === true);
  assert.equal(lerJson(raiz).inicio.rotulo, "Diagnóstico · Processos · Dashboard", "nada gravado");
  rasc.forcar = true;
  await publicar(rasc, { usuario, raiz, env: {} });
  assert.equal(lerJson(raiz).inicio.rotulo, "novo rótulo");
});

test("no Railway sem token não publica", async () => {
  const raiz = raizNova();
  await assert.rejects(publicar(rascunhoCom(raiz, c => { c.inicio.rotulo = "x"; }), { usuario, raiz, env: { RAILWAY_ENVIRONMENT: "production" } }), e => e.status === 503 && /GITHUB_TOKEN/.test(e.message));
  assert.equal(lerJson(raiz).inicio.rotulo, "Diagnóstico · Processos · Dashboard");
});

test("imagem pendente inexistente é recusada antes de gravar", async () => {
  const raiz = raizNova();
  await assert.rejects(publicar(rascunhoCom(raiz, c => { c.inicio.carrossel.imagens = [{ arquivo: "pendente:" + "a".repeat(24), alt: "x", link: "" }]; }), { usuario, raiz, env: {} }), e => e.status === 400);
});

test("modo GitHub: commit com os arquivos certos; falha no GitHub não grava nada", async () => {
  const raiz = raizNova();
  const original = github.commit; const chamadas = [];
  github.commit = async args => { chamadas.push(args); return { sha: "abc123", url: "https://github.com/x/y/commit/abc123" }; };
  try {
    const p = imagens.guardarPendente(PNG, "promo");
    const r = await publicar(rascunhoCom(raiz, c => { c.inicio.carrossel.imagens = [{ arquivo: p.ref, alt: "Promo", link: "" }]; }), { usuario, raiz, env: { GITHUB_TOKEN: "t", GITHUB_REPO: "x/y" } });
    assert.equal(r.modo, "github"); assert.equal(r.commit.sha, "abc123");
    const a = chamadas[0];
    assert.equal(a.token, "t"); assert.equal(a.repo, "x/y"); assert.equal(a.branch, "main"); assert.equal(a.autor.email, usuario.email);
    const caminhos = a.arquivos.map(x => x.caminho + (x.remover ? " (remover)" : ""));
    assert.ok(caminhos.includes("conteudo/site.json") && caminhos.includes("index.html") && caminhos.includes("sitemap.xml") && caminhos.includes("outros/severino.html"));
    assert.ok(caminhos.includes("conteudo/imagens/promo-" + imagens.hash8(PNG) + ".png"));
    assert.ok(caminhos.includes("outros/velho.html (remover)") && caminhos.includes("conteudo/imagens/orfa-00000000.png (remover)"));
    assert.ok(fs.existsSync(path.join(raiz, "conteudo", "imagens", "promo-" + imagens.hash8(PNG) + ".png")));
    assert.equal(dados.lerJson("publicacoes.json", [])[0].commit.sha, "abc123");

    github.commit = async () => { throw new github.ErroGitHub("token do GitHub inválido ou vencido", 401); };
    const p2 = imagens.guardarPendente(Buffer.concat([PNG, Buffer.from([9])]), "outra");
    await assert.rejects(publicar(rascunhoCom(raiz, c => { c.inicio.rotulo = "falhou"; c.produtos[0].capa = { arquivo: p2.ref, alt: "x" }; }), { usuario, raiz, env: { GITHUB_TOKEN: "t" } }), /token do GitHub/);
    assert.notEqual(lerJson(raiz).inicio.rotulo, "falhou", "site.json intacto");
    assert.ok(imagens.lerPendente(p2.id), "pendente continua lá");
  } finally { github.commit = original; }
});
