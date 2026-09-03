"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { carregar, validar } = require("../lib/conteudo");
const paginaInicio = require("../templates/index");

const base = () => JSON.parse(JSON.stringify(carregar()));
const conta = (s, re) => (s.match(re) || []).length;
const IMG = n => ({ arquivo: "conteudo/imagens/promo-" + String(n).repeat(8) + ".webp", alt: "Promo " + n, link: "" });

test("início com painel demonstrativo", () => {
  const html = paginaInicio(validar(base()));
  assert.ok(html.includes('id="cRec"'));
  assert.ok(!html.includes('id="carrossel"'));
  assert.ok(html.includes('class="wrap hero-grid"'));
  assert.ok(html.startsWith("<!DOCTYPE html>\n<!-- GERADO"));
});

test("início com carrossel de uma imagem: sem setas, sem pontos, sem painel", () => {
  const o = base(); o.inicio.carrossel.imagens = [IMG(1)];
  const html = paginaInicio(validar(o));
  assert.ok(html.includes('id="carrossel"'));
  assert.ok(!html.includes('id="cRec"'));
  assert.equal(conta(html, /class="cs-slide/g), 1);
  assert.ok(!html.includes("cs-dots"));
  assert.ok(html.includes('src="/conteudo/imagens/promo-11111111.webp"'));
});

test("início com três imagens e link: setas, pontos e link no slide", () => {
  const o = base(); o.inicio.carrossel.imagens = [Object.assign(IMG(1), { link: "https://x.y" }), IMG(2), IMG(3)]; o.inicio.carrossel.intervalo = 9;
  const html = paginaInicio(validar(o));
  assert.equal(conta(html, /class="cs-slide/g), 3);
  assert.equal(conta(html, /class="cs-slide on"/g), 1);
  assert.equal(conta(html, /role="tab"/g), 3);
  assert.ok(html.includes('data-intervalo="9"'));
  assert.ok(html.includes('<a class="cs-slide on" href="https://x.y"'));
  assert.ok(html.includes('data-ev="carrossel:1"'));
});

test("início sem painel e sem imagens: só o texto", () => {
  const o = base(); o.inicio.painelAtivo = false;
  const html = paginaInicio(validar(o));
  assert.ok(!html.includes('id="cRec"'));
  assert.ok(!html.includes('id="carrossel"'));
  assert.ok(html.includes('class="wrap hero-grid solo"'));
});

test("escapa e marca", () => {
  const o = base(); o.inicio.titulo = "<script>x</script> *azul* **forte**";
  const html = paginaInicio(validar(o));
  assert.ok(!html.includes("<script>x</script>"));
  assert.ok(html.includes("&lt;script&gt;x&lt;/script&gt; <em>azul</em> <strong>forte</strong>"));
});

test("menu Outros só com produtos ativos", () => {
  const o = base(); o.produtos[1].ativo = false;
  let html = paginaInicio(validar(o));
  assert.equal(conta(html, /data-ev="menu:outros:/g), 2);
  assert.ok(!html.includes("aprova-ordem"));
  o.produtos.forEach(p => { p.ativo = false; });
  html = paginaInicio(validar(o));
  assert.ok(!html.includes('id="dd"'));
});

test("FAQ vai para o HTML e para o JSON-LD sem marcações", () => {
  const o = base(); o.faq.itens = [{ pergunta: "Só uma?", resposta: "Sim, *só* uma.\n\nSegundo parágrafo." }];
  const html = paginaInicio(validar(o));
  assert.equal(conta(html, /<details>/g), 1);
  assert.ok(html.includes("<p>Sim, <em>só</em> uma.</p>\n<p>Segundo parágrafo.</p>"));
  const ld = JSON.parse(html.match(/<script type="application\/ld\+json">\n([\s\S]*?)\n<\/script>/)[1]);
  const faq = ld["@graph"].find(x => x["@type"] === "FAQPage");
  assert.equal(faq.mainEntity[0].name, "Só uma?");
  assert.equal(faq.mainEntity[0].acceptedAnswer.text, "Sim, só uma.\n\nSegundo parágrafo.");
});

test("contato e rodapé usam site.email e site.cidade", () => {
  const o = base(); o.site.email = "oi@baishift.com.br"; o.site.cidade = "Cacoal, RO";
  const html = paginaInicio(validar(o));
  assert.ok(html.includes('href="mailto:oi@baishift.com.br"'));
  assert.ok(html.includes("· Cacoal, RO</span>"));
  assert.ok(html.includes('window.BAISHIFT = {"whatsapp":"","email":"oi@baishift.com.br"}'));
});

test("botão secundário vazio some", () => {
  const o = base(); o.inicio.botaoSecundario.texto = "";
  const html = paginaInicio(validar(o));
  assert.ok(!html.includes("btn-ghost"));
  assert.ok(html.includes('data-ev="cta:principal"'));
});

test("pré-visualização marca o html", () => {
  const html = paginaInicio(validar(base()), { previa: true });
  assert.ok(html.includes('<html lang="pt-BR" data-previa="">'));
  assert.ok(html.includes('content="noindex, nofollow"'));
});

const paginaProduto = require("../templates/produto");

const produtoCom = mudanca => { const o = base(); Object.assign(o.produtos[0], mudanca); const c = validar(o); return [c.produtos[0], c]; };

test("produto padrão: arte com letra e chips, como funciona, lista de espera", () => {
  const html = paginaProduto(...produtoCom({}));
  assert.ok(html.includes('<span class="glyph">S</span>'));
  assert.equal(conta(html, /class="chip c/g), 3);
  assert.equal(conta(html, /class="feat rv"/g), 3);
  assert.ok(html.includes('<div class="ic">01</div>'));
  assert.ok(html.includes('id="lista"'));
  assert.ok(html.includes('data-ev="lista:severino"'));
  assert.ok(html.includes('<body style="--ac:#F5A300">'));
  assert.ok(html.includes('<a href="/outros/aprova-ordem" data-ev="menu:outros:aprova-ordem">Aprova · Ordem</a>'));
  assert.ok(!html.includes("lp-blocos"));
});

test("produto com capa troca a arte", () => {
  const html = paginaProduto(...produtoCom({ capa: { arquivo: "conteudo/imagens/severino-capa-aaaaaaaa.webp", alt: "Tela do Severino" } }));
  assert.ok(html.includes('class="lp-art lp-capa"'));
  assert.ok(html.includes('alt="Tela do Severino"'));
  assert.ok(!html.includes('class="glyph"'));
});

test("produto com ícone usa a imagem no lugar da letra", () => {
  const [p, c] = produtoCom({ icone: { arquivo: "conteudo/imagens/severino-icone-bbbbbbbb.png", alt: "" } });
  assert.ok(paginaProduto(p, c).includes('<span class="glyph"><img src="/conteudo/imagens/severino-icone-bbbbbbbb.png" alt=""></span>'));
  assert.ok(paginaInicio(c).includes('<span class="mk" aria-hidden="true"><img src="/conteudo/imagens/severino-icone-bbbbbbbb.png" alt=""></span>'));
});

test("produto sem lista de espera: sem faixa, sem botão do topo, CTA vira contato", () => {
  const html = paginaProduto(...produtoCom({ listaEspera: { ativa: false, convite: "", campo: "", placeholder: "" } }));
  assert.ok(!html.includes('id="lista"'));
  assert.ok(!html.includes("Entrar na lista"));
  assert.ok(html.includes('<a class="cta" href="/#contato">Falar com a Baishift</a>'));
});

test("blocos de cada tipo, na ordem", () => {
  const blocos = [
    { tipo: "texto", titulo: "Título *azul*", texto: "p1\n\np2" },
    { tipo: "imagem", arquivo: "conteudo/imagens/severino-foto-cccccccc.webp", alt: "Foto", legenda: "Legenda" },
    { tipo: "imagemTexto", arquivo: "conteudo/imagens/severino-foto-cccccccc.webp", alt: "Foto", titulo: "Lado", texto: "t", imagemDireita: true },
    { tipo: "lista", titulo: "Lista", itens: ["um", "dois"] },
    { tipo: "destaque", titulo: "Chamada", texto: "x", botao: { texto: "Quero", link: "https://a.b" } }
  ];
  const html = paginaProduto(...produtoCom({ blocos }));
  const ordem = ["bl-texto", "bl-imagem rv", "bl-imagem-texto dir", "bl-lista", "bl-destaque"].map(k => html.indexOf(k));
  assert.deepEqual(ordem.map(i => i > 0), [true, true, true, true, true]);
  assert.deepEqual([...ordem].sort((a, b) => a - b), ordem, "blocos fora de ordem");
  assert.ok(html.includes("<h2>Título <em>azul</em></h2><p>p1</p>\n<p>p2</p>"));
  assert.ok(html.includes("<figcaption>Legenda</figcaption>"));
  assert.ok(html.includes('data-ev="bloco:severino:5"'));
  assert.ok(html.includes('href="https://a.b" style="background:#F5A300"'));
});

test("imagem pendente vira URL do painel", () => {
  const html = paginaProduto(...produtoCom({ capa: { arquivo: "pendente:0123456789abcdef01234567", alt: "x" } }), { previa: true });
  assert.ok(html.includes('src="/gestor/api/pendentes/0123456789abcdef01234567"'));
  assert.ok(html.includes('data-previa=""'));
});

test("produto sem 'como funciona' não gera a seção", () => {
  const html = paginaProduto(...produtoCom({ comoFunciona: { rotulo: "", titulo: "", itens: [] } }));
  assert.ok(!html.includes("lp-feats"));
});

const { paginas, sitemap, gerarTudo } = require("../lib/render");

test("sitemap só com produtos ativos e data do conteúdo", () => {
  const o = base(); o.produtos[2].ativo = false; o.atualizadoEm = "2026-09-03T10:00:00Z";
  const xml = sitemap(validar(o));
  assert.ok(xml.includes("<loc>https://www.baishift.com.br/</loc><lastmod>2026-09-03</lastmod>"));
  assert.ok(xml.includes("/outros/severino</loc>"));
  assert.ok(!xml.includes("aprova-suficiencia"));
});

test("paginas devolve um arquivo por página ativa", () => {
  const o = base(); o.produtos[1].ativo = false;
  const arq = paginas(validar(o));
  assert.deepEqual(Object.keys(arq).sort(), ["index.html", "outros/aprova-suficiencia.html", "outros/severino.html", "sitemap.xml"]);
});

test("gerarTudo grava, remove páginas de produtos que saíram e devolve o relatório", () => {
  const raiz = fs.mkdtempSync(path.join(os.tmpdir(), "baishift-"));
  fs.mkdirSync(path.join(raiz, "outros"));
  fs.writeFileSync(path.join(raiz, "outros", "velho.html"), "x");
  const o = base(); o.produtos[2].ativo = false;
  const r = gerarTudo(validar(o), raiz);
  assert.deepEqual(r.escritos.sort(), ["index.html", "outros/aprova-ordem.html", "outros/severino.html", "sitemap.xml"]);
  assert.deepEqual(r.removidos, ["outros/velho.html"]);
  assert.ok(fs.existsSync(path.join(raiz, "index.html")));
  assert.ok(!fs.existsSync(path.join(raiz, "outros", "velho.html")));
  assert.ok(!fs.existsSync(path.join(raiz, "outros", "aprova-suficiencia.html")));
  assert.equal(fs.readdirSync(raiz).filter(f => f.includes(".tmp-")).length, 0, "não sobra arquivo temporário");
  fs.rmSync(raiz, { recursive: true, force: true });
});
