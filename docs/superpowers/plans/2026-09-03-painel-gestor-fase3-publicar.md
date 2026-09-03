# Painel do gestor · Fase 3 — publicação, imagens e telas de conteúdo

> **For agentic workers:** REQUIRED SUB-SKILL: Use subagent-driven-development (recommended) or executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Editar todo o conteúdo do site pelo painel (início com carrossel, frentes, modelos, perfil, FAQ, contato, site, produtos com blocos e imagens), pré-visualizar e publicar com um commit no GitHub aplicado na hora.

**Architecture:** `lib/imagens.js` valida e guarda uploads pendentes no disco persistente; `lib/github.js` faz um commit único pela Git Data API; `lib/publicar.js` valida o rascunho, materializa imagens, gera as páginas, commita e grava localmente; `lib/painel-conteudo.js` registra as rotas (`conteudo`, `previa`, `imagens`, `pendentes/:id`, `publicar`, `publicacoes`). No painel, `form.js` é um construtor de campos ligado ao rascunho em memória, `publicar.js` cuida do rascunho (localStorage), da barra Visualizar/Publicar e dos diálogos, e `tela-conteudo.js`/`tela-produtos.js` descrevem as telas.

**Tech Stack:** Node ≥ 20 (`fetch` nativo para o GitHub), `node:test`, HTML/CSS/JS puro.

Spec: seções 4, 5, 6, 9, 10 e 12. Os blocos de código abaixo vêm precedidos de `<!-- arquivo: caminho -->`; um extrator simples grava cada um no caminho indicado.

---

## Arquivos

| Arquivo | Responsabilidade |
|---|---|
| `lib/imagens.js` (novo) | assinatura do arquivo, limite, pendentes (`dados/pendentes/<id>.<ext>` + `<id>.json`), nome final por conteúdo, limpeza |
| `lib/github.js` (novo) | `commit()` via Git Data API com nova tentativa em conflito |
| `lib/publicar.js` (novo) | fluxo de publicar (seção 5 da spec), resumo das mudanças, histórico em `dados/publicacoes.json` |
| `lib/painel-conteudo.js` (novo) | rotas da API de conteúdo |
| `lib/painel.js` (modificar) | exporta `lerCorpo`; carrega `painel-conteudo` |
| `server.js` (modificar) | limpa pendentes antigos no boot |
| `gestor/form.js`, `gestor/publicar.js`, `gestor/tela-conteudo.js`, `gestor/tela-produtos.js` (novos), `gestor/index.html`, `gestor/gestor.css` (modificar) | interface |
| `test/imagens.test.js`, `test/github.test.js`, `test/publicar.test.js` (novos), `test/servidor.test.js` (modificar) | testes |

---

### Task 1: Imagens (`lib/imagens.js`)

- [ ] **Step 1: Teste**

<!-- arquivo: test/imagens.test.js -->
```js
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const dados = require("../lib/dados");
dados.usar(fs.mkdtempSync(path.join(os.tmpdir(), "baishift-img-")));
dados.preparar();
const imagens = require("../lib/imagens");

const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]), Buffer.alloc(40, 1)]);
const JPG = Buffer.concat([Buffer.from([0xFF, 0xD8, 0xFF, 0xE0]), Buffer.alloc(40, 2)]);
const GIF = Buffer.concat([Buffer.from("GIF89a"), Buffer.alloc(40, 3)]);
const WEBP = Buffer.concat([Buffer.from("RIFF"), Buffer.from([0, 0, 0, 0]), Buffer.from("WEBPVP8 "), Buffer.alloc(40, 4)]);
const SVG = Buffer.from("<svg xmlns='http://www.w3.org/2000/svg'></svg>");

test("tipo pela assinatura, não pela extensão", () => {
  assert.equal(imagens.tipo(PNG), "png"); assert.equal(imagens.tipo(JPG), "jpg");
  assert.equal(imagens.tipo(GIF), "gif"); assert.equal(imagens.tipo(WEBP), "webp");
  assert.equal(imagens.tipo(SVG), null); assert.equal(imagens.tipo(Buffer.alloc(2)), null);
});

test("guardarPendente recusa tipo e tamanho; aceita e lê de volta", () => {
  assert.throws(() => imagens.guardarPendente(SVG, "capa"), /formato/);
  assert.throws(() => imagens.guardarPendente(Buffer.concat([PNG, Buffer.alloc(imagens.LIMITE)]), "capa"), /4 MB/);
  const p = imagens.guardarPendente(PNG, "Severino Capa!");
  assert.match(p.id, /^[0-9a-f]{24}$/);
  assert.equal(p.ref, "pendente:" + p.id);
  assert.equal(p.ext, "png"); assert.equal(p.contexto, "severino-capa");
  const lido = imagens.lerPendente(p.id);
  assert.equal(lido.ext, "png"); assert.equal(lido.contexto, "severino-capa"); assert.ok(lido.buf.equals(PNG));
  assert.equal(imagens.lerPendente("zzz"), null);
  assert.equal(imagens.lerPendente("0".repeat(24)), null);
});

test("nomeFinal usa o contexto e o hash do conteúdo", () => {
  assert.equal(imagens.nomeFinal("severino-capa", PNG, "png"), "conteudo/imagens/severino-capa-" + imagens.hash8(PNG) + ".png");
  assert.equal(imagens.nomeFinal("", PNG, "png"), "conteudo/imagens/imagem-" + imagens.hash8(PNG) + ".png");
});

test("removerPendente e limpeza por idade", () => {
  const p = imagens.guardarPendente(JPG, "x");
  imagens.removerPendente(p.id);
  assert.equal(imagens.lerPendente(p.id), null);
  const velho = imagens.guardarPendente(GIF, "y");
  const antigo = new Date(Date.now() - 8 * 864e5);
  fs.utimesSync(dados.caminho("pendentes", velho.id + ".json"), antigo, antigo);
  const novo = imagens.guardarPendente(GIF, "z");
  assert.deepEqual(imagens.limparPendentes(7), [velho.id]);
  assert.ok(imagens.lerPendente(novo.id));
});
```

- [ ] **Step 2: Implementar**

<!-- arquivo: lib/imagens.js -->
```js
/* Imagens enviadas pelo painel: validação pela assinatura do arquivo, guarda em dados/pendentes até a
   publicação e nome final por conteúdo em conteudo/imagens/. Sem SVG (pode carregar script). */
"use strict";
const fs = require("node:fs");
const crypto = require("node:crypto");
const dados = require("./dados");

const LIMITE = 4 * 1024 * 1024;
const MIME = { jpg: "image/jpeg", png: "image/png", webp: "image/webp", gif: "image/gif" };

function tipo(buf) {
  if (!buf || buf.length < 12) return null;
  if (buf[0] === 0xFF && buf[1] === 0xD8 && buf[2] === 0xFF) return "jpg";
  if (buf.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]))) return "png";
  if (buf.slice(0, 6).toString("latin1") === "GIF87a" || buf.slice(0, 6).toString("latin1") === "GIF89a") return "gif";
  if (buf.slice(0, 4).toString("latin1") === "RIFF" && buf.slice(8, 12).toString("latin1") === "WEBP") return "webp";
  return null;
}
function hash8(buf) { return crypto.createHash("sha1").update(buf).digest("hex").slice(0, 8); }
function slugContexto(s) {
  const t = String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);
  return t || "imagem";
}
function nomeFinal(contexto, buf, ext) { return "conteudo/imagens/" + slugContexto(contexto) + "-" + hash8(buf) + "." + ext; }

const RE_ID = /^[0-9a-f]{24}$/;
function guardarPendente(buf, contexto) {
  const ext = tipo(buf);
  if (!ext) throw new Error("formato não aceito: envie JPG, PNG, WebP ou GIF");
  if (buf.length > LIMITE) throw new Error("a imagem passa de 4 MB depois do redimensionamento");
  const id = crypto.randomBytes(12).toString("hex");
  const meta = { ext, contexto: slugContexto(contexto), bytes: buf.length, criadoEm: new Date().toISOString() };
  fs.mkdirSync(dados.caminho("pendentes"), { recursive: true });
  fs.writeFileSync(dados.caminho("pendentes", id + "." + ext), buf);
  dados.gravarJson("pendentes/" + id + ".json", meta);
  return Object.assign({ id, ref: "pendente:" + id }, meta);
}
function lerPendente(id) {
  if (!RE_ID.test(String(id))) return null;
  const meta = dados.lerJson("pendentes/" + id + ".json", null);
  if (!meta) return null;
  try { return Object.assign({ buf: fs.readFileSync(dados.caminho("pendentes", id + "." + meta.ext)) }, meta); }
  catch { return null; }
}
function removerPendente(id) {
  const meta = dados.lerJson("pendentes/" + id + ".json", null);
  for (const f of [meta && id + "." + meta.ext, id + ".json"]) if (f) { try { fs.unlinkSync(dados.caminho("pendentes", f)); } catch { /* já não existe */ } }
}
/* apaga pendentes com mais de N dias; devolve os ids removidos */
function limparPendentes(dias = 7) {
  const limite = Date.now() - dias * 864e5, removidos = [];
  let nomes = []; try { nomes = fs.readdirSync(dados.caminho("pendentes")); } catch { return removidos; }
  for (const n of nomes) {
    if (!n.endsWith(".json")) continue;
    const id = n.slice(0, -5);
    let st; try { st = fs.statSync(dados.caminho("pendentes", n)); } catch { continue; }
    if (st.mtimeMs < limite) { removerPendente(id); removidos.push(id); }
  }
  return removidos;
}

module.exports = { LIMITE, MIME, tipo, hash8, slugContexto, nomeFinal, guardarPendente, lerPendente, removerPendente, limparPendentes };
```

- [ ] **Step 3: Rodar** — `node --test test/imagens.test.js` → `# pass 4`
- [ ] **Step 4: Commit** — `git add lib/imagens.js test/imagens.test.js && git commit -m "Imagens do painel: validação e pendentes"`

---

### Task 2: Commit no GitHub (`lib/github.js`)

- [ ] **Step 1: Teste** (com `fetch` simulado)

<!-- arquivo: test/github.test.js -->
```js
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const github = require("../lib/github");

/* simula a API: registra as chamadas e responde conforme o caminho */
function fetchFalso(o = {}) {
  const chamadas = []; let refSha = "base111";
  const fn = async (url, init = {}) => {
    const u = String(url).replace("https://api.github.com/repos/x/y", ""), m = init.method || "GET";
    const corpo = init.body ? JSON.parse(init.body) : null;
    chamadas.push({ m, u, corpo, auth: init.headers.Authorization });
    const ok = (status, json) => ({ ok: status < 400, status, json: async () => json, text: async () => JSON.stringify(json) });
    if (o.status401) return ok(401, { message: "Bad credentials" });
    if (o.status404) return ok(404, { message: "Not Found" });
    if (u === "/git/ref/heads/main") return ok(200, { object: { sha: refSha } });
    if (u === "/git/commits/" + refSha) return ok(200, { tree: { sha: "tree-" + refSha } });
    if (u === "/git/blobs") return ok(201, { sha: "blob-" + corpo.content.slice(0, 6) });
    if (u === "/git/trees") return ok(201, { sha: "newtree" });
    if (u === "/git/commits") return ok(201, { sha: "commit999" });
    if (u === "/git/refs/heads/main") {
      if (o.conflitoUmaVez && !o._ja) { o._ja = true; refSha = "base222"; return ok(422, { message: "Update is not a fast forward" }); }
      return ok(200, { object: { sha: corpo.sha } });
    }
    return ok(500, { message: "?" });
  };
  return { fn, chamadas };
}
const base = { token: "tok", repo: "x/y", branch: "main", mensagem: "Painel: teste", autor: { name: "Gestor", email: "g@b.c" } };

test("cria blobs, árvore com remoções, commit e atualiza a referência", async () => {
  const f = fetchFalso();
  const r = await github.commit(Object.assign({ fetchFn: f.fn, arquivos: [
    { caminho: "conteudo/site.json", conteudo: Buffer.from("{}") },
    { caminho: "conteudo/imagens/a.webp", conteudo: Buffer.from([1, 2, 3]) },
    { caminho: "outros/velho.html", remover: true }
  ] }, base));
  assert.equal(r.sha, "commit999"); assert.equal(r.url, "https://github.com/x/y/commit/commit999");
  const blobs = f.chamadas.filter(c => c.u === "/git/blobs");
  assert.equal(blobs.length, 2); assert.equal(blobs[0].corpo.encoding, "base64"); assert.equal(blobs[0].auth, "Bearer tok");
  const tree = f.chamadas.find(c => c.u === "/git/trees").corpo;
  assert.equal(tree.base_tree, "tree-base111");
  assert.deepEqual(tree.tree.map(t => [t.path, t.sha === null ? "REMOVE" : "blob"]), [["conteudo/site.json", "blob"], ["conteudo/imagens/a.webp", "blob"], ["outros/velho.html", "REMOVE"]]);
  const commit = f.chamadas.find(c => c.u === "/git/commits" && c.m === "POST").corpo;
  assert.deepEqual(commit.parents, ["base111"]); assert.equal(commit.author.name, "Gestor"); assert.equal(commit.message, "Painel: teste");
  const ref = f.chamadas.find(c => c.u === "/git/refs/heads/main");
  assert.equal(ref.m, "PATCH"); assert.equal(ref.corpo.sha, "commit999"); assert.equal(ref.corpo.force, false);
});

test("conflito na referência: tenta de novo a partir da base nova", async () => {
  const f = fetchFalso({ conflitoUmaVez: true });
  await github.commit(Object.assign({ fetchFn: f.fn, arquivos: [{ caminho: "a", conteudo: Buffer.from("a") }] }, base));
  const commits = f.chamadas.filter(c => c.u === "/git/commits" && c.m === "POST");
  assert.equal(commits.length, 2); assert.deepEqual(commits[1].corpo.parents, ["base222"]);
});

test("erros viram mensagens claras", async () => {
  await assert.rejects(github.commit(Object.assign({ fetchFn: fetchFalso({ status401: true }).fn, arquivos: [] }, base)), /token do GitHub inválido ou vencido/);
  await assert.rejects(github.commit(Object.assign({ fetchFn: fetchFalso({ status404: true }).fn, arquivos: [] }, base)), /não encontrei o repositório|sem permissão/);
  await assert.rejects(github.commit(Object.assign({ fetchFn: async () => { throw new Error("ECONNRESET"); }, arquivos: [] }, base)), /não consegui falar com o GitHub/);
});
```

- [ ] **Step 2: Implementar**

<!-- arquivo: lib/github.js -->
```js
/* Um commit no GitHub pela Git Data API, sem dependências: blobs → árvore (com base na atual, remoções incluídas)
   → commit → atualização da referência. Se a referência mudou no meio (outra publicação), tenta mais uma vez. */
"use strict";

class ErroGitHub extends Error { constructor(msg, status) { super(msg); this.name = "ErroGitHub"; this.status = status; } }

async function chamada(fetchFn, token, url, metodo, corpo) {
  let r;
  try {
    r = await fetchFn(url, { method: metodo, headers: { "Authorization": "Bearer " + token, "Accept": "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28", "User-Agent": "baishift-painel", "Content-Type": "application/json" }, body: corpo ? JSON.stringify(corpo) : undefined });
  } catch (e) { throw new ErroGitHub("não consegui falar com o GitHub: " + e.message, 0); }
  if (r.status === 401) throw new ErroGitHub("token do GitHub inválido ou vencido — gere outro e atualize GITHUB_TOKEN no Railway", 401);
  if (r.status === 403) throw new ErroGitHub("o token do GitHub está sem permissão de escrita (Contents: read and write) no repositório", 403);
  if (r.status === 404) throw new ErroGitHub("não encontrei o repositório no GitHub — confira GITHUB_REPO e a permissão do token", 404);
  if (!r.ok) { let m = ""; try { m = (await r.json()).message; } catch { /* sem detalhe */ } throw new ErroGitHub("GitHub respondeu " + r.status + (m ? ": " + m : ""), r.status); }
  return r.json();
}

/* arquivos: [{ caminho, conteudo: Buffer }] ou [{ caminho, remover: true }] */
async function commit({ token, repo, branch = "main", mensagem, autor, arquivos, fetchFn = fetch }) {
  const base = "https://api.github.com/repos/" + repo;
  const api = (url, metodo, corpo) => chamada(fetchFn, token, base + url, metodo, corpo);
  for (let tentativa = 1; tentativa <= 2; tentativa++) {
    const ref = await api("/git/ref/heads/" + branch, "GET");
    const baseSha = ref.object.sha;
    const baseCommit = await api("/git/commits/" + baseSha, "GET");
    const blobs = await Promise.all(arquivos.filter(a => !a.remover).map(async a => ({ caminho: a.caminho, sha: (await api("/git/blobs", "POST", { content: a.conteudo.toString("base64"), encoding: "base64" })).sha })));
    const tree = arquivos.map(a => a.remover
      ? { path: a.caminho, mode: "100644", type: "blob", sha: null }
      : { path: a.caminho, mode: "100644", type: "blob", sha: blobs.find(b => b.caminho === a.caminho).sha });
    const arvore = await api("/git/trees", "POST", { base_tree: baseCommit.tree.sha, tree });
    const novo = await api("/git/commits", "POST", { message: mensagem, tree: arvore.sha, parents: [baseSha], author: Object.assign({ date: new Date().toISOString() }, autor) });
    try {
      await api("/git/refs/heads/" + branch, "PATCH", { sha: novo.sha, force: false });
      return { sha: novo.sha, url: "https://github.com/" + repo + "/commit/" + novo.sha };
    } catch (e) {
      if (e.status === 422 && tentativa === 1) continue;   /* alguém publicou no meio: refaz sobre a base nova */
      throw e;
    }
  }
  throw new ErroGitHub("não consegui atualizar a branch no GitHub", 409);
}

module.exports = { commit, ErroGitHub };
```

- [ ] **Step 3: Rodar** — `node --test test/github.test.js` → `# pass 3`
- [ ] **Step 4: Commit** — `git add lib/github.js test/github.test.js && git commit -m "Commit no GitHub pela Git Data API"`

---

### Task 3: Fluxo de publicar (`lib/publicar.js`)

- [ ] **Step 1: Teste** (raiz temporária com cópia do `site.json`; GitHub simulado por substituição de `github.commit`)

<!-- arquivo: test/publicar.test.js -->
```js
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
```

- [ ] **Step 2: Implementar**

<!-- arquivo: lib/publicar.js -->
```js
/* Publicar: valida o rascunho, materializa as imagens pendentes, gera as páginas, commita no GitHub (quando há token)
   e só então grava tudo localmente. Sem token: modo local (grava nos arquivos; o gestor faz o commit) — exceto no
   Railway, onde o que fosse gravado sumiria no próximo deploy. */
"use strict";
const fs = require("node:fs");
const path = require("node:path");
const conteudo = require("./conteudo");
const render = require("./render");
const imagens = require("./imagens");
const github = require("./github");
const dados = require("./dados");

const REPO_PADRAO = "joaobaidarolimnet-svg/baishift";

class ErroPublicar extends Error {
  constructor(status, mensagem, extra) { super(mensagem); this.name = "ErroPublicar"; this.status = status; Object.assign(this, extra || {}); }
}

const NOMES = { site: "site", inicio: "início", diagnostico: "diagnóstico", processos: "processos", dashboard: "dashboard", modelos: "modelos", perfil: "serve / não serve", faq: "FAQ", contato: "contato" };
function resumo(antes, depois) {
  const partes = [];
  for (const k in NOMES) if (JSON.stringify(antes[k]) !== JSON.stringify(depois[k])) partes.push(NOMES[k]);
  const pa = new Map((antes.produtos || []).map(p => [p.slug, p])), pd = new Map((depois.produtos || []).map(p => [p.slug, p]));
  const prods = [];
  for (const [slug, p] of pd) { const a = pa.get(slug); if (!a) prods.push(slug + " (novo)"); else if (JSON.stringify(a) !== JSON.stringify(p)) prods.push(slug); }
  for (const slug of pa.keys()) if (!pd.has(slug)) prods.push(slug + " (removido)");
  if (prods.length) partes.push("produtos: " + prods.join(", "));
  return partes.length ? partes.join(" · ") : "sem mudança de conteúdo";
}

/* pedido: { conteudo, baseadoEm, forcar } · o: { usuario, raiz, env, fetchFn, agora } */
async function publicar(pedido, o) {
  const raiz = o.raiz, env = o.env || process.env, agora = o.agora || new Date();
  const atual = conteudo.carregar(path.join(raiz, "conteudo", "site.json"));
  if (!pedido.forcar && pedido.baseadoEm !== undefined && pedido.baseadoEm !== atual.atualizadoEm) {
    throw new ErroPublicar(409, "o site foi publicado depois que você começou a editar", { conflito: true, atualizadoEm: atual.atualizadoEm });
  }
  const c = conteudo.validar(pedido.conteudo);

  /* imagens: pendentes ganham nome final; publicadas precisam existir */
  const mapa = {}, novasImagens = [], usados = [];
  for (const ref of conteudo.imagensReferenciadas(c)) {
    if (ref.startsWith("pendente:")) {
      const id = ref.slice(9), p = imagens.lerPendente(id);
      if (!p) throw new ErroPublicar(400, "uma imagem ainda não publicada sumiu do servidor; envie de novo", { campo: ref });
      const nome = imagens.nomeFinal(p.contexto, p.buf, p.ext);
      mapa[ref] = nome; usados.push(id);
      if (!novasImagens.some(n => n.caminho === nome)) novasImagens.push({ caminho: nome, conteudo: p.buf });
    } else if (!fs.existsSync(path.join(raiz, ref))) {
      throw new ErroPublicar(400, "imagem não encontrada: " + ref, { campo: ref });
    }
  }
  const novo = conteudo.mapearImagens(c, ref => mapa[ref] || ref);
  novo.atualizadoEm = agora.toISOString();
  const finais = new Set(conteudo.imagensReferenciadas(novo));

  /* o que sai: imagens órfãs e páginas de produtos que não existem mais */
  const remover = [];
  const pastaImg = path.join(raiz, "conteudo", "imagens");
  if (fs.existsSync(pastaImg)) for (const f of fs.readdirSync(pastaImg)) { const rel = "conteudo/imagens/" + f; if (/\.(webp|jpe?g|png|gif)$/i.test(f) && !finais.has(rel)) remover.push(rel); }
  const paginas = render.paginas(novo);
  const pastaOutros = path.join(raiz, "outros");
  if (fs.existsSync(pastaOutros)) for (const f of fs.readdirSync(pastaOutros)) if (f.endsWith(".html") && !paginas["outros/" + f]) remover.push("outros/" + f);

  const arquivos = [{ caminho: "conteudo/site.json", conteudo: Buffer.from(JSON.stringify(novo, null, 2) + "\n") }]
    .concat(novasImagens)
    .concat(Object.keys(paginas).map(k => ({ caminho: k, conteudo: Buffer.from(paginas[k]) })))
    .concat(remover.map(caminho => ({ caminho, remover: true })));

  const texto = resumo(atual, novo);
  const mensagem = "Painel: " + texto + (novasImagens.length ? " · " + novasImagens.length + (novasImagens.length === 1 ? " imagem nova" : " imagens novas") : "");

  let commit = null, modo = "local";
  if (env.GITHUB_TOKEN) {
    commit = await github.commit({ token: env.GITHUB_TOKEN, repo: env.GITHUB_REPO || REPO_PADRAO, branch: env.GITHUB_BRANCH || "main", mensagem,
      autor: { name: o.usuario.nome, email: o.usuario.email }, arquivos, fetchFn: o.fetchFn });
    modo = "github";
  } else if (env.RAILWAY_ENVIRONMENT) {
    throw new ErroPublicar(503, "o servidor está sem GITHUB_TOKEN: configure a variável no Railway para publicar");
  }

  /* aplica localmente só depois do commit dar certo */
  for (const a of arquivos) {
    const abs = path.join(raiz, a.caminho);
    if (a.remover) { try { fs.unlinkSync(abs); } catch { /* já não existia */ } }
    else render.escreverAtomico(abs, a.conteudo);
  }
  usados.forEach(id => imagens.removerPendente(id));

  const registro = { quando: novo.atualizadoEm, quem: { nome: o.usuario.nome, email: o.usuario.email }, resumo: texto, imagens: novasImagens.length, modo, commit };
  const hist = dados.lerJson("publicacoes.json", []);
  hist.unshift(registro); dados.gravarJson("publicacoes.json", hist.slice(0, 50));
  return { ok: true, modo, commit, publicadoEm: novo.atualizadoEm, resumo: texto, mensagem };
}

module.exports = { publicar, resumo, ErroPublicar, REPO_PADRAO };
```

- [ ] **Step 3: Rodar** — `node --test test/publicar.test.js` → `# pass 6`
- [ ] **Step 4: Commit** — `git add lib/publicar.js test/publicar.test.js && git commit -m "Fluxo de publicar: imagens, páginas, GitHub e histórico"`

---

### Task 4: Rotas de conteúdo (`lib/painel-conteudo.js`) e ajustes no servidor

- [ ] **Step 1: Ajustar `lib/painel.js`**

Na função `api()`, a checagem do cabeçalho passa a respeitar a opção `semCabecalho` (a pré-visualização chega por formulário, sem cabeçalho):

```js
    if (req.method !== "GET" && req.method !== "HEAD" && !r.opcoes.semCabecalho && req.headers["x-gestor"] !== "1") throw new Erro(403, "requisição inválida");
```

`responderErro` passa a entender qualquer erro com `status` numérico (ErroPublicar, ErroGitHub):

```js
function responderErro(res, e) {
  if (e && (e.name === "ErroAuth" || e.name === "ErroConteudo")) return json(res, 400, { erro: e.message, campo: e.campo });
  if (e && typeof e.status === "number") {
    const status = e.status >= 400 && e.status < 600 ? e.status : 502;
    const corpo = { erro: e.message };
    for (const k of ["campo", "conflito", "atualizadoEm", "trocarSenha"]) if (e[k] !== undefined) corpo[k] = e[k];
    return json(res, status, corpo);
  }
  console.error("painel:", e);
  json(res, 500, { erro: "erro interno no painel" });
}
```

E, na última linha do arquivo, depois de `module.exports = ...`:

```js
require("./painel-conteudo");   /* registra as rotas de conteúdo (usa rota() daqui) */
```

- [ ] **Step 2: Implementar as rotas**

<!-- arquivo: lib/painel-conteudo.js -->
```js
/* Rotas de conteúdo do painel: ler, pré-visualizar, enviar imagem, publicar, histórico. */
"use strict";
const path = require("node:path");
const { rota, Erro, json } = require("./painel");
const conteudo = require("./conteudo");
const render = require("./render");
const imagens = require("./imagens");
const dados = require("./dados");
const { publicar } = require("./publicar");

const RAIZ = path.join(__dirname, "..");

rota("GET", "conteudo", {}, ({ res }) => {
  const c = conteudo.carregar();
  json(res, 200, { conteudo: c, atualizadoEm: c.atualizadoEm, limites: conteudo.LIMITES });
});

/* chega por <form method="post" target="_blank"> (urlencoded): conteudo=<json>&pagina=inicio|produto:<slug> */
rota("POST", "previa", { semCabecalho: true }, async ({ res, lerCorpo }) => {
  const f = new URLSearchParams((await lerCorpo(2 * 1024 * 1024)).toString("utf8"));
  let obj; try { obj = JSON.parse(f.get("conteudo") || ""); } catch { throw new Erro(400, "rascunho inválido"); }
  const c = conteudo.validar(obj);
  const pagina = f.get("pagina") || "inicio";
  let html;
  if (pagina === "inicio") html = render.paginaInicio(c, { previa: true });
  else {
    const p = c.produtos.find(x => x.slug === pagina.replace(/^produto:/, ""));
    if (!p) throw new Erro(404, "produto não encontrado no rascunho");
    html = render.paginaProduto(p, c, { previa: true });
  }
  const corpo = Buffer.from(html);
  res.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Content-Length": corpo.length, "Cache-Control": "no-store", "X-Robots-Tag": "noindex", "X-Frame-Options": "SAMEORIGIN" });
  res.end(corpo);
});

/* corpo = bytes da imagem; cabeçalho X-Contexto diz onde ela vai (vira parte do nome final) */
rota("POST", "imagens", {}, async ({ req, res, lerCorpo }) => {
  const buf = await lerCorpo(imagens.LIMITE + 512 * 1024);
  if (!buf.length) throw new Erro(400, "envie o arquivo da imagem no corpo do pedido");
  let p;
  try { p = imagens.guardarPendente(buf, String(req.headers["x-contexto"] || "imagem")); } catch (e) { throw new Erro(400, e.message); }
  json(res, 201, { ref: p.ref, id: p.id, ext: p.ext, bytes: p.bytes });
});

rota("GET", "pendentes/:id", {}, ({ res, params }) => {
  const p = imagens.lerPendente(params.id);
  if (!p) throw new Erro(404, "imagem pendente não encontrada");
  res.writeHead(200, { "Content-Type": imagens.MIME[p.ext], "Content-Length": p.buf.length, "Cache-Control": "private, max-age=3600", "X-Content-Type-Options": "nosniff" });
  res.end(p.buf);
});

rota("POST", "publicar", {}, async ({ res, usuario, lerJson }) => {
  const b = await lerJson();
  json(res, 200, await publicar({ conteudo: b.conteudo, baseadoEm: b.baseadoEm, forcar: !!b.forcar }, { usuario, raiz: RAIZ }));
});

rota("GET", "publicacoes", {}, ({ res }) => json(res, 200, { publicacoes: dados.lerJson("publicacoes.json", []).slice(0, 20) }));
```

- [ ] **Step 3: `server.js`** — logo depois de `auth.semear();`:

```js
const limpos = require("./lib/imagens").limparPendentes(7);
if (limpos.length) console.log("imagens pendentes antigas removidas: " + limpos.length);
```

- [ ] **Step 4: Testes de integração** — em `test/servidor.test.js`, o helper `pede` passa a aceitar `Buffer` no corpo:

```js
  const r = await fetch(base + caminho, { method: metodo, headers: cab, body: corpo === undefined ? undefined : (typeof corpo === "string" || Buffer.isBuffer(corpo) ? corpo : JSON.stringify(corpo)), redirect: "manual" });
```

e ganha estes testes, colocados **antes** do teste "cinco erros bloqueiam o IP" (que bloqueia o IP para o resto do arquivo):

```js
test("conteúdo, imagem pendente e pré-visualização", async () => {
  let r = await pede("GET", "/gestor/api/conteudo", { cookie: cookieDono });
  assert.equal(r.status, 200); assert.equal(r.json.conteudo.produtos.length, 3); assert.ok(r.json.atualizadoEm); assert.equal(r.json.limites.titulo, 160);
  const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]), Buffer.alloc(40, 1)]);
  r = await fetch(base + "/gestor/api/imagens", { method: "POST", headers: { cookie: cookieDono, "x-gestor": "1", "content-type": "image/png", "x-contexto": "severino-capa" }, body: png });
  assert.equal(r.status, 201); const img = await r.json(); assert.match(img.ref, /^pendente:[0-9a-f]{24}$/);
  r = await fetch(base + "/gestor/api/pendentes/" + img.id, { headers: { cookie: cookieDono } });
  assert.equal(r.status, 200); assert.equal(r.headers.get("content-type"), "image/png");
  assert.equal((await fetch(base + "/gestor/api/pendentes/" + img.id)).status, 401, "imagem pendente exige sessão");
  r = await fetch(base + "/gestor/api/imagens", { method: "POST", headers: { cookie: cookieDono, "x-gestor": "1", "content-type": "image/svg+xml" }, body: "<svg/>" });
  assert.equal(r.status, 400);
  const c = (await pede("GET", "/gestor/api/conteudo", { cookie: cookieDono })).json.conteudo;
  c.produtos[0].capa = { arquivo: img.ref, alt: "Capa" }; c.inicio.titulo = "Prévia *marcada*";
  const form = "conteudo=" + encodeURIComponent(JSON.stringify(c)) + "&pagina=inicio";
  r = await pede("POST", "/gestor/api/previa", { cookie: cookieDono, gestor: false, corpo: form, tipo: "application/x-www-form-urlencoded" });
  assert.equal(r.status, 200); assert.match(r.texto, /data-previa=""/); assert.match(r.texto, /Prévia <em>marcada<\/em>/);
  r = await pede("POST", "/gestor/api/previa", { cookie: cookieDono, gestor: false, corpo: form.replace("pagina=inicio", "pagina=produto:severino"), tipo: "application/x-www-form-urlencoded" });
  assert.equal(r.status, 200); assert.match(r.texto, /lp-capa/); assert.match(r.texto, new RegExp("/gestor/api/pendentes/" + img.id));
  assert.equal((await pede("POST", "/gestor/api/previa", { gestor: false, corpo: form, tipo: "application/x-www-form-urlencoded" })).status, 401);
});

test("publicar: conflito de versão e conteúdo inválido não gravam nada", async () => {
  const c = (await pede("GET", "/gestor/api/conteudo", { cookie: cookieDono })).json.conteudo;
  let r = await pede("POST", "/gestor/api/publicar", { cookie: cookieDono, corpo: { conteudo: c, baseadoEm: "1999-01-01T00:00:00Z" } });
  assert.equal(r.status, 409); assert.equal(r.json.conflito, true); assert.ok(r.json.atualizadoEm);
  c.inicio.titulo = "x".repeat(200);
  r = await pede("POST", "/gestor/api/publicar", { cookie: cookieDono, corpo: { conteudo: c, baseadoEm: c.atualizadoEm } });
  assert.equal(r.status, 400); assert.equal(r.json.campo, "inicio.titulo");
  r = await pede("GET", "/gestor/api/publicacoes", { cookie: cookieDono });
  assert.equal(r.status, 200); assert.deepEqual(r.json.publicacoes, []);
});
```

- [ ] **Step 5: Rodar** — `npm test` → `# fail 0` (servidor: 9 testes)
- [ ] **Step 6: Commit** — `git add lib server.js test && git commit -m "Rotas de conteúdo: ler, pré-visualizar, imagens, publicar, histórico"`

---

### Task 5: Construtor de campos (`gestor/form.js`) e rascunho/publicação (`gestor/publicar.js`)

- [ ] **Step 1: `gestor/app.js`** ganha os ganchos de inicialização. Em `G` acrescentar `aoIniciar: []` (ao lado de `aoNavegar`) e, em `iniciar()`, entre `montarMenu();` e o `addEventListener("click"...)` do menu:

```js
    for (const fn of G.aoIniciar) { try { await fn(); } catch (e) { toast(e.message, "erro"); } }
```

- [ ] **Step 2: `gestor/form.js`**

<!-- arquivo: gestor/form.js -->
```js
/* Campos de formulário ligados ao rascunho (G.conteudo.rascunho) por caminho ("inicio.titulo", "produtos.0.blocos.2.texto").
   Toda mudança grava no rascunho e chama G.conteudo.marcar(). Listas re-renderizam o próprio bloco ao mudar de forma. */
(function () {
  "use strict";
  const { el, campo: rotular, toast } = G;

  const partes = c => String(c).split(".").filter(Boolean);
  function get(obj, c) { return partes(c).reduce((o, k) => (o == null ? undefined : o[k]), obj); }
  function set(obj, c, v) {
    const p = partes(c); let o = obj;
    for (let i = 0; i < p.length - 1; i++) { if (o[p[i]] == null) o[p[i]] = /^\d+$/.test(p[i + 1]) ? [] : {}; o = o[p[i]]; }
    o[p[p.length - 1]] = v;
  }
  const R = () => G.conteudo.rascunho;
  const L = () => G.conteudo.limites || {};
  const mudou = () => G.conteudo.marcar();

  /* ---------- campos simples ---------- */
  function texto(caminho, rotulo, o = {}) {
    const i = el("input", { type: o.tipo || "text", value: get(R(), caminho) || "", maxlength: o.max || L().titulo, placeholder: o.placeholder || null });
    i.addEventListener("input", () => { set(R(), caminho, i.value); mudou(); });
    return rotular(rotulo, i, o.ajuda);
  }
  function multilinha(caminho, rotulo, o = {}) {
    const t = el("textarea", { maxlength: o.max || L().curto, rows: o.linhas || 3 });
    t.value = get(R(), caminho) || "";
    t.addEventListener("input", () => { set(R(), caminho, t.value); mudou(); });
    return rotular(rotulo, t, o.ajuda || (o.max >= 1000 ? "Linha em branco separa parágrafos. *destaque*, **negrito**, [texto](url)." : undefined));
  }
  function link(caminho, rotulo, o = {}) { return texto(caminho, rotulo, Object.assign({ max: 500, placeholder: "#secao, /outros/produto, https://… ou mailto:…" }, o)); }
  function numero(caminho, rotulo, o = {}) {
    const i = el("input", { type: "number", min: o.min, max: o.max, step: 1, value: get(R(), caminho) });
    i.addEventListener("input", () => { const n = Number(i.value); if (Number.isInteger(n)) { set(R(), caminho, n); mudou(); } });
    return rotular(rotulo, i, o.ajuda);
  }
  function chave(caminho, rotulo, ajuda) {
    const c = G.chave(rotulo, { checked: !!get(R(), caminho) }, ajuda);
    c.querySelector("input").addEventListener("change", e => { set(R(), caminho, e.target.checked); mudou(); });
    return c;
  }
  function cor(caminho, rotulo) {
    const atual = get(R(), caminho) || "#1652F0";
    const c = el("input", { type: "color", value: atual }), t = el("input", { type: "text", value: atual, maxlength: 7, pattern: "#[0-9A-Fa-f]{6}" });
    c.addEventListener("input", () => { t.value = c.value.toUpperCase(); set(R(), caminho, t.value); mudou(); });
    t.addEventListener("input", () => { if (/^#[0-9A-Fa-f]{6}$/.test(t.value)) { c.value = t.value; set(R(), caminho, t.value.toUpperCase()); mudou(); } });
    return rotular(rotulo, el("div", { class: "cor-campo" }, c, t));
  }

  /* ---------- botões de lista ---------- */
  function acoesItem(lista, i, o, rerender) {
    const b = (txt, rot, fn, off) => el("button", { class: "btn btn-2 btn-mini", type: "button", "aria-label": rot, title: rot, disabled: off || null, onclick: () => { fn(); mudou(); rerender(); } }, txt);
    const acoes = [b("↑", "Mover para cima", () => { [lista[i - 1], lista[i]] = [lista[i], lista[i - 1]]; }, i === 0),
      b("↓", "Mover para baixo", () => { [lista[i + 1], lista[i]] = [lista[i], lista[i + 1]]; }, i === lista.length - 1)];
    if (!o.fixo) {
      if (o.duplicar) acoes.push(b("⧉", "Duplicar", () => { lista.splice(i + 1, 0, JSON.parse(JSON.stringify(lista[i]))); }, o.max && lista.length >= o.max));
      acoes.push(b("×", "Remover", () => { lista.splice(i, 1); }, o.min && lista.length <= o.min));
    }
    return el("div", { class: "item-acoes" }, acoes);
  }
  function botaoAdicionar(lista, o, rerender, texto) {
    return el("button", { class: "btn btn-2 btn-mini", type: "button", disabled: o.max && lista.length >= o.max ? true : null, onclick: () => { lista.push(typeof o.novo === "function" ? o.novo() : ""); mudou(); rerender(); } }, texto || "+ Adicionar");
  }

  /* lista de textos curtos: um input por item */
  function listaTextos(caminho, rotulo, o = {}) {
    const box = el("div", { class: "lista" });
    function render() {
      box.innerHTML = "";
      if (rotulo) box.append(el("span", { class: "lista-rotulo", text: rotulo }));
      const lista = get(R(), caminho) || (set(R(), caminho, []), get(R(), caminho));
      lista.forEach((v, i) => {
        const i2 = el("input", { type: "text", value: v, maxlength: o.itemMax || L().item });
        i2.addEventListener("input", () => { lista[i] = i2.value; mudou(); });
        box.append(el("div", { class: "item item-linha" }, i2, acoesItem(lista, i, o, render)));
      });
      box.append(el("div", { class: "lista-pe" }, botaoAdicionar(lista, o, render), o.ajuda ? el("small", { class: "ajuda", text: o.ajuda }) : null));
    }
    render(); return box;
  }

  /* lista de objetos: um cartão por item; campos(caminhoDoItem, item, i) devolve os elementos */
  function listaObjetos(caminho, rotulo, o) {
    const box = el("div", { class: "lista" });
    function render() {
      box.innerHTML = "";
      if (rotulo) box.append(el("span", { class: "lista-rotulo", text: rotulo }));
      const lista = get(R(), caminho) || (set(R(), caminho, []), get(R(), caminho));
      lista.forEach((item, i) => {
        const base = caminho + "." + i;
        box.append(el("div", { class: "item" },
          el("div", { class: "item-cab" }, el("b", { text: o.titulo ? o.titulo(item, i) : "Item " + (i + 1) }), acoesItem(lista, i, o, render)),
          el("div", { class: "item-corpo" }, o.campos(base, item, i))));
      });
      if (!o.fixo) box.append(el("div", { class: "lista-pe" }, botaoAdicionar(lista, o, render, o.textoAdicionar), o.ajuda ? el("small", { class: "ajuda", text: o.ajuda }) : null));
    }
    render(); return box;
  }

  /* ---------- imagem: escolhe, redimensiona no navegador, envia e guarda "pendente:<id>" ---------- */
  function urlImagem(ref) { return !ref ? "" : ref.startsWith("pendente:") ? "/gestor/api/pendentes/" + ref.slice(9) : "/" + ref; }
  async function preparar(file) {
    if (file.type === "image/gif") return file;
    const bmp = await createImageBitmap(file);
    const MAX = 1920, k = Math.min(1, MAX / Math.max(bmp.width, bmp.height));
    const w = Math.max(1, Math.round(bmp.width * k)), h = Math.max(1, Math.round(bmp.height * k));
    const cv = document.createElement("canvas"); cv.width = w; cv.height = h;
    const ctx = cv.getContext("2d"); ctx.drawImage(bmp, 0, 0, w, h);
    let alfa = false;
    if (file.type === "image/png") { const d = ctx.getImageData(0, 0, w, h).data; for (let i = 3; i < d.length; i += 4 * 61) if (d[i] < 250) { alfa = true; break; } }
    const toBlob = (tipo, q) => new Promise(r => cv.toBlob(r, tipo, q));
    let blob = alfa ? await toBlob("image/png") : await toBlob("image/webp", 0.85);
    if (!alfa && (!blob || blob.type !== "image/webp")) blob = await toBlob("image/jpeg", 0.86);
    return blob;
  }
  async function enviar(file, contexto) {
    const blob = await preparar(file);
    const r = await fetch("/gestor/api/imagens", { method: "POST", headers: { "X-Gestor": "1", "X-Contexto": contexto, "Content-Type": blob.type || "application/octet-stream" }, body: blob });
    const d = await r.json().catch(() => ({}));
    if (r.status === 401) { location.href = "/gestor"; throw new Error("sessão encerrada"); }
    if (!r.ok) throw new Error(d.erro || "não consegui enviar a imagem");
    return d.ref;
  }
  function imagem(caminho, rotulo, o = {}) {
    const box = el("div", { class: "img-campo" });
    function render() {
      box.innerHTML = "";
      const ref = get(R(), caminho);
      const entrada = el("input", { type: "file", accept: "image/png,image/jpeg,image/webp,image/gif", hidden: true });
      entrada.addEventListener("change", async () => {
        const f = entrada.files[0]; if (!f) return;
        box.classList.add("enviando");
        try { set(R(), caminho, await enviar(f, o.contexto || "imagem")); mudou(); toast("Imagem enviada. Ela entra no site quando você publicar.", "ok"); }
        catch (e) { toast(e.message, "erro"); }
        render();
      });
      const acoes = el("div", { class: "acoes" },
        el("button", { class: "btn btn-2 btn-mini", type: "button", onclick: () => entrada.click() }, ref ? "Trocar imagem" : "Escolher imagem"),
        ref ? el("button", { class: "btn btn-2 btn-mini", type: "button", onclick: () => { set(R(), caminho, ""); if (o.alt) set(R(), caminho.replace(/[^.]+$/, "") + o.alt, ""); mudou(); render(); } }, "Remover") : null, entrada);
      box.append(el("span", { class: "lista-rotulo", text: rotulo }),
        el("div", { class: "img-linha" }, ref ? el("img", { src: urlImagem(ref), alt: "" }) : el("div", { class: "img-vazia", text: o.dica || "sem imagem" }), el("div", {}, acoes, el("small", { class: "ajuda", text: o.ajuda || "JPG, PNG, WebP ou GIF. Redimensionada para até 1920 px antes de subir." }))));
      if (ref && o.alt) box.append(texto(caminho.replace(/[^.]+$/, "") + o.alt, "Texto alternativo (acessibilidade)", { max: L().curto, ajuda: "Descreva a imagem em uma frase." }));
    }
    render(); return box;
  }

  /* ---------- blocos livres da página de produto ---------- */
  const TIPOS_BLOCO = {
    texto: { nome: "Texto", novo: () => ({ tipo: "texto", titulo: "", texto: "" }), campos: b => [texto(b + ".titulo", "Título (opcional)"), multilinha(b + ".texto", "Texto", { max: L().longo, linhas: 5 })] },
    imagem: { nome: "Imagem", novo: () => ({ tipo: "imagem", arquivo: "", alt: "", legenda: "" }), campos: (b, p) => [imagem(b + ".arquivo", "Imagem", { contexto: p + "-bloco", alt: "alt" }), texto(b + ".legenda", "Legenda (opcional)", { max: L().curto })] },
    imagemTexto: { nome: "Imagem com texto ao lado", novo: () => ({ tipo: "imagemTexto", arquivo: "", alt: "", titulo: "", texto: "", imagemDireita: false }), campos: (b, p) => [imagem(b + ".arquivo", "Imagem", { contexto: p + "-bloco", alt: "alt" }), texto(b + ".titulo", "Título (opcional)"), multilinha(b + ".texto", "Texto", { max: L().longo, linhas: 4 }), chave(b + ".imagemDireita", "Imagem à direita")] },
    lista: { nome: "Lista", novo: () => ({ tipo: "lista", titulo: "", itens: [""] }), campos: b => [texto(b + ".titulo", "Título (opcional)"), listaTextos(b + ".itens", "Itens", { min: 1, max: L().lista })] },
    destaque: { nome: "Destaque com botão", novo: () => ({ tipo: "destaque", titulo: "", texto: "", botao: { texto: "", link: "" } }), campos: b => [texto(b + ".titulo", "Título"), multilinha(b + ".texto", "Texto", { max: L().longo }), el("div", { class: "linha" }, texto(b + ".botao.texto", "Botão · texto", { max: L().item, ajuda: "Em branco, sem botão." }), link(b + ".botao.link", "Botão · link"))] }
  };
  function blocos(caminho, slug) {
    const box = el("div", { class: "lista blocos" });
    function render() {
      box.innerHTML = "";
      const lista = get(R(), caminho) || (set(R(), caminho, []), get(R(), caminho));
      lista.forEach((b, i) => {
        const T = TIPOS_BLOCO[b.tipo]; if (!T) return;
        box.append(el("div", { class: "item bloco" },
          el("div", { class: "item-cab" }, el("span", { class: "selo", text: T.nome }), acoesItem(lista, i, { duplicar: true, max: L().blocos }, render)),
          el("div", { class: "item-corpo" }, T.campos(caminho + "." + i, slug))));
      });
      const sel = el("select", {}, Object.keys(TIPOS_BLOCO).map(k => el("option", { value: k, text: TIPOS_BLOCO[k].nome })));
      box.append(el("div", { class: "lista-pe" }, sel, el("button", { class: "btn btn-2 btn-mini", type: "button", disabled: lista.length >= L().blocos ? true : null, onclick: () => { lista.push(TIPOS_BLOCO[sel.value].novo()); mudou(); render(); } }, "+ Adicionar bloco"),
        el("small", { class: "ajuda", text: "Os blocos aparecem na página do produto, nesta ordem, entre \"Como funciona\" e a lista de espera." })));
    }
    render(); return box;
  }

  G.F = { get, set, texto, multilinha, link, numero, chave, cor, listaTextos, listaObjetos, imagem, blocos, urlImagem };
})();
```

- [ ] **Step 3: `gestor/publicar.js`**

<!-- arquivo: gestor/publicar.js -->
```js
/* Rascunho e publicação: carrega o conteúdo publicado, mantém o rascunho (também no localStorage),
   e cuida da barra Visualizar / Publicar / Descartar no topo. */
(function () {
  "use strict";
  const { el, $, api, toast, confirmar } = G;
  const clonar = o => JSON.parse(JSON.stringify(o));
  const NOMES = { site: "Site", inicio: "Início", diagnostico: "Diagnóstico", processos: "Processos", dashboard: "Dashboard", modelos: "Modelos", perfil: "Serve / não serve", faq: "FAQ", contato: "Contato e rodapé" };

  const C = G.conteudo = {
    publicado: null, rascunho: null, baseadoEm: null, limites: {}, paginaAtual: "inicio", carregando: null,
    chave() { return "gestor:rascunho:" + G.estado.eu.id; },
    alterado() { return !!C.rascunho && JSON.stringify(C.rascunho) !== JSON.stringify(C.publicado); },
    /* seções que diferem entre rascunho e publicado */
    mudancas() {
      const r = C.rascunho, p = C.publicado, out = [];
      for (const k in NOMES) if (JSON.stringify(r[k]) !== JSON.stringify(p[k])) out.push(NOMES[k]);
      const pp = new Map(p.produtos.map(x => [x.slug, x]));
      r.produtos.forEach(x => { const a = pp.get(x.slug); if (!a) out.push("Produto novo: " + x.nome); else if (JSON.stringify(a) !== JSON.stringify(x)) out.push("Produto: " + x.nome); });
      p.produtos.forEach(x => { if (!r.produtos.some(y => y.slug === x.slug)) out.push("Produto removido: " + x.nome); });
      return out;
    },
    async garantir(forcarRecarga) {
      if (C.rascunho && !forcarRecarga) return;
      if (!C.carregando) C.carregando = (async () => {
        const d = await api("GET", "conteudo");
        C.publicado = d.conteudo; C.baseadoEm = d.atualizadoEm; C.limites = d.limites;
        let guardado = null; try { guardado = JSON.parse(localStorage.getItem(C.chave()) || "null"); } catch { /* sem rascunho */ }
        if (!forcarRecarga && guardado && guardado.rascunho && JSON.stringify(guardado.rascunho) !== JSON.stringify(C.publicado)) {
          C.rascunho = guardado.rascunho; C.baseadoEm = guardado.baseadoEm || C.baseadoEm;
          toast("Você tem alterações não publicadas de " + G.data(guardado.quando) + ". Continue editando ou use Descartar.");
        } else { C.rascunho = clonar(C.publicado); try { localStorage.removeItem(C.chave()); } catch { /* sem localStorage */ } }
        C.carregando = null; barra();
      })();
      await C.carregando;
    },
    marcar() {
      try { localStorage.setItem(C.chave(), JSON.stringify({ rascunho: C.rascunho, baseadoEm: C.baseadoEm, quando: new Date().toISOString() })); } catch { /* cheio ou bloqueado */ }
      barra();
    },
    async descartar() {
      if (!await confirmar("Descartar todas as alterações não publicadas?", { botao: "Descartar", perigo: true })) return;
      C.rascunho = clonar(C.publicado); try { localStorage.removeItem(C.chave()); } catch { /* ok */ }
      barra(); G.navegar(); toast("Alterações descartadas.");
    },
    visualizar() {
      const form = el("form", { method: "post", action: "/gestor/api/previa", target: "_blank", hidden: true },
        el("input", { type: "hidden", name: "conteudo", value: JSON.stringify(C.rascunho) }), el("input", { type: "hidden", name: "pagina", value: C.paginaAtual || "inicio" }));
      document.body.append(form); form.submit(); form.remove();
    },
    async publicar(forcar) {
      const lista = C.mudancas();
      if (!lista.length) return toast("Nada para publicar.");
      if (!forcar) {
        const ok = await new Promise(resolve => {
          const dlg = el("dialog", { class: "dlg" }, el("h2", { text: "Publicar no site" }),
            el("p", { text: "O que muda:" }), el("ul", { class: "publicar-resumo" }, lista.map(x => el("li", { text: x }))),
            el("p", { class: "ajuda", text: G.estado.github ? "Vai gerar um commit no GitHub e entrar no ar na hora. O Railway republica em um ou dois minutos com o mesmo conteúdo." : (G.estado.railway ? "O servidor está sem GITHUB_TOKEN: a publicação vai falhar até a variável ser configurada no Railway." : "Modo local: grava nos arquivos do projeto; faça o commit e o push para publicar.") }),
            el("div", { class: "acoes" }, el("button", { class: "btn btn-2", type: "button", onclick: () => { dlg.close(); resolve(false); } }, "Cancelar"), el("button", { class: "btn", type: "button", onclick: () => { dlg.close(); resolve(true); } }, "Publicar")));
          dlg.addEventListener("close", () => { dlg.remove(); resolve(false); }); document.body.append(dlg); dlg.showModal();
        });
        if (!ok) return;
      }
      const botao = $("#btn-publicar"); botao.disabled = true; botao.textContent = "Publicando…";
      try {
        const r = await api("POST", "publicar", { conteudo: C.rascunho, baseadoEm: C.baseadoEm, forcar: !!forcar });
        try { localStorage.removeItem(C.chave()); } catch { /* ok */ }
        await C.garantir(true); G.navegar();
        const dlg = el("dialog", { class: "dlg" }, el("h2", { text: "Publicado" }),
          el("p", { text: (r.modo === "github" ? "Commit feito e site atualizado às " : "Gravado nos arquivos do projeto às ") + new Date(r.publicadoEm).toLocaleTimeString("pt-BR", { timeStyle: "short" }) + "." }),
          r.commit ? el("p", {}, el("a", { href: r.commit.url, target: "_blank", rel: "noopener", text: "Ver o commit no GitHub" }), " · o Railway republica em um ou dois minutos.") : el("p", { class: "ajuda", text: "Faça o commit e o push para o site publicar." }),
          el("div", { class: "acoes" }, el("button", { class: "btn", type: "button", onclick: () => dlg.close() }, "Fechar")));
        dlg.addEventListener("close", () => dlg.remove()); document.body.append(dlg); dlg.showModal();
      } catch (e) {
        if (e.status === 409) {
          if (await confirmar("Outra pessoa publicou o site depois que você começou a editar. Publicar mesmo assim sobrescreve o que ela fez.", { botao: "Sobrescrever", perigo: true })) { botao.disabled = false; return C.publicar(true); }
        } else toast(e.message + (e.campo ? " (" + e.campo + ")" : ""), "erro");
      }
      botao.disabled = false; botao.textContent = "Publicar"; barra();
    }
  };

  function barra() {
    let b = $("#barra-publicar");
    if (!b) { b = el("div", { class: "barra-publicar", id: "barra-publicar" }); $("#topo-acoes").prepend(b); }
    b.innerHTML = "";
    if (!C.rascunho) return;
    const alt = C.alterado();
    b.append(el("span", { class: "selo " + (alt ? "laranja" : "verde"), text: alt ? "alterações não publicadas" : "tudo publicado" }),
      el("button", { class: "btn btn-2 btn-mini", type: "button", onclick: C.visualizar }, "Visualizar"),
      alt ? el("button", { class: "btn btn-2 btn-mini", type: "button", onclick: C.descartar }, "Descartar") : null,
      el("button", { class: "btn btn-mini", id: "btn-publicar", type: "button", disabled: alt ? null : true, onclick: () => C.publicar(false) }, "Publicar"));
  }

  G.aoIniciar.push(async () => { if (!G.estado.eu.trocarSenha) await C.garantir(); });
  G.aoNavegar.push(tela => { if (tela !== "produtos") C.paginaAtual = "inicio"; });
})();
```

- [ ] **Step 4: Estilos** — acrescentar ao fim de `gestor/gestor.css`, antes do bloco RESPONSIVO:

<!-- arquivo: gestor/gestor-fase3.css -->
```css
/* ---------------- LISTAS, IMAGENS, BLOCOS, PUBLICAR ---------------- */
.lista{display:grid;gap:8px;margin-bottom:14px}
.lista-rotulo{font-family:var(--mono);font-size:.58rem;letter-spacing:.12em;text-transform:uppercase;color:var(--muted)}
.item{border:1px solid var(--line);border-radius:10px;background:#fff}
.item-linha{display:flex;gap:8px;align-items:center;padding:6px 6px 6px 10px}
.item-linha input{flex:1;border:0;padding:6px 4px;min-width:0}
.item-linha input:focus{outline:none}
.item-cab{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:8px 10px;border-bottom:1px solid var(--line);background:var(--mist);border-radius:10px 10px 0 0}
.item-cab b{font-size:.86rem}
.item-corpo{padding:14px 12px 2px}
.item-acoes{display:flex;gap:4px;flex:none}
.item-acoes .btn-mini{padding:3px 8px;min-width:30px}
.lista-pe{display:flex;flex-wrap:wrap;gap:8px 12px;align-items:center}
.lista-pe select{border:1px solid var(--line);border-radius:7px;padding:5px 8px;background:#fff;font-size:.82rem}
.ajuda-bloco{color:var(--muted);font-size:.85rem;margin:-4px 0 14px}
.cor-campo{display:flex;gap:8px;align-items:center}
.cor-campo input[type="color"]{width:44px;height:38px;padding:2px;border:1px solid var(--line);border-radius:8px;background:#fff;cursor:pointer}
.cor-campo input[type="text"]{font-family:var(--mono);max-width:120px}
.img-campo{display:grid;gap:8px;margin-bottom:14px}
.img-linha{display:flex;gap:14px;align-items:flex-start;flex-wrap:wrap}
.img-linha img{width:160px;max-width:100%;height:auto;border-radius:10px;border:1px solid var(--line);display:block;background:var(--mist)}
.img-vazia{width:160px;height:100px;border:1px dashed var(--line);border-radius:10px;display:grid;place-items:center;color:var(--muted);font-size:.78rem;background:var(--mist)}
.img-campo.enviando{opacity:.5;pointer-events:none}
.img-campo .campo{margin-top:4px}
.bloco .item-cab .selo{background:var(--ink);color:#fff}
.barra-publicar{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
.publicar-resumo{margin:0 0 14px;padding-left:18px;color:var(--ink)}
.publicar-resumo li{margin-bottom:3px}
.produto-marca{width:30px;height:30px;border-radius:8px;color:#fff;display:grid;place-items:center;font-family:var(--display);font-weight:700;font-size:.85rem;flex:none;overflow:hidden}
.produto-marca img{width:100%;height:100%;object-fit:cover}
.produto-nome{display:flex;gap:10px;align-items:center}
.voltar{display:inline-block;margin-bottom:10px;font-size:.85rem}
```

- [ ] **Step 5: `gestor/index.html`** — depois de `<script src="/gestor/app.js"></script>` incluir, nesta ordem:

```html
<script src="/gestor/form.js"></script>
<script src="/gestor/publicar.js"></script>
<script src="/gestor/tela-conteudo.js"></script>
<script src="/gestor/tela-produtos.js"></script>
```

- [ ] **Step 6: Commit** — `git add gestor && git commit -m "Painel: construtor de campos, rascunho e barra de publicação"` (a Task 6 traz as telas que usam tudo isso)

---

### Task 6: Telas de conteúdo (`gestor/tela-conteudo.js`)

- [ ] **Step 1: Implementar**

<!-- arquivo: gestor/tela-conteudo.js -->
```js
/* Telas de conteúdo da página principal e do site. Cada tela descreve seus campos com G.F. */
(function () {
  "use strict";
  const { el, F } = G;
  const L = () => G.conteudo.limites;
  const card = (titulo, ...kids) => el("div", { class: "card" }, titulo ? el("h2", { text: titulo }) : null, kids);
  const nota = t => el("p", { class: "ajuda-bloco", text: t });

  function tela(nome, titulo, descricao, montar) {
    G.TELAS[nome] = { titulo, async render(host) {
      await G.conteudo.garantir();
      host.append(el("div", { class: "tela-cab" }, el("div", {}, el("h1", { text: titulo }), el("p", { text: descricao }))));
      montar(host);
    } };
  }
  const cab = (base, rot) => [F.texto(base + ".rotulo", rot || "Rótulo pequeno acima do título", { max: L().item }), F.texto(base + ".titulo", "Título", { ajuda: "Use *asteriscos* no trecho em destaque." }), F.multilinha(base + ".lead", "Texto de apoio", { max: L().curto })];

  tela("inicio", "Início", "O topo do site: texto, botões, tags, os três cartões e o visual ao lado (painel demonstrativo ou carrossel).", host => {
    host.append(card("Texto do topo",
      F.texto("inicio.rotulo", "Rótulo acima do título", { max: L().item }),
      F.texto("inicio.titulo", "Título", { ajuda: "Use *asteriscos* no trecho que fica em azul." }),
      F.multilinha("inicio.subtitulo", "Subtítulo", { max: L().curto }),
      el("div", { class: "linha" }, F.texto("inicio.botaoPrincipal.texto", "Botão principal · texto", { max: L().item }), F.link("inicio.botaoPrincipal.link", "Botão principal · link")),
      el("div", { class: "linha" }, F.texto("inicio.botaoSecundario.texto", "Botão secundário · texto", { max: L().item, ajuda: "Em branco, o botão some." }), F.link("inicio.botaoSecundario.link", "Botão secundário · link")),
      F.listaTextos("inicio.tags", "Tags", { max: 8, itemMax: 40 })));
    host.append(card("Visual ao lado do texto",
      nota("Com imagens no carrossel, ele aparece no lugar do painel demonstrativo. Sem imagens, o painel volta (se estiver ligado). Painel desligado e carrossel vazio deixam só o texto."),
      F.chave("inicio.painelAtivo", "Painel demonstrativo ligado"),
      F.numero("inicio.carrossel.intervalo", "Intervalo do carrossel (segundos)", { min: L().intervaloMin, max: L().intervaloMax }),
      F.listaObjetos("inicio.carrossel.imagens", "Imagens do carrossel (até 3 · recomendado 1600 × 1000)", { max: 3, novo: () => ({ arquivo: "", alt: "", link: "" }), titulo: (im, i) => "Imagem " + (i + 1), textoAdicionar: "+ Adicionar imagem",
        campos: b => [F.imagem(b + ".arquivo", "Imagem", { contexto: "carrossel", alt: "alt" }), F.link(b + ".link", "Link ao clicar (opcional)")] })));
    host.append(card("Cartões 01 · 02 · 03 (abaixo do topo)", F.listaObjetos("inicio.frentesResumo", "", { fixo: true, titulo: (f, i) => "0" + (i + 1), campos: b => [F.texto(b + ".titulo", "Título", { max: L().item }), F.texto(b + ".texto", "Texto", { max: L().curto })] })));
  });

  tela("diagnostico", "Frente 01 · Diagnóstico", "Cabeçalho, as três afirmações e o cartão \"Diagnóstico de gestão\". Os gráficos e os números da história continuam no código.", host => {
    host.append(card("Cabeçalho", cab("diagnostico")));
    host.append(card("As três afirmações", F.listaObjetos("diagnostico.afirmacoes", "", { fixo: true, titulo: (a, i) => "Afirmação " + (i + 1), campos: b => [F.texto(b + ".titulo", "Título", { ajuda: "*asteriscos* no trecho em azul." }), F.multilinha(b + ".texto", "Texto", { max: L().curto })] })));
    host.append(card("Cartão \"Diagnóstico de gestão\"",
      el("div", { class: "linha" }, F.texto("diagnostico.oferta.titulo", "Título", { max: L().item }), F.texto("diagnostico.oferta.selo", "Selo", { max: 40 })),
      F.listaObjetos("diagnostico.oferta.medidas", "Três medidas", { fixo: true, titulo: (m, i) => "Medida " + (i + 1), campos: b => [el("div", { class: "linha" }, F.texto(b + ".valor", "Valor", { max: 40 }), F.texto(b + ".texto", "Texto", { max: L().item }))] }),
      F.texto("diagnostico.oferta.tituloEntregas", "Título da lista", { max: L().item }),
      F.listaTextos("diagnostico.oferta.entregas", "Entregas", { min: 2, max: L().lista }),
      el("div", { class: "linha" }, F.texto("diagnostico.oferta.botao", "Botão do WhatsApp", { max: L().item }), F.texto("diagnostico.oferta.alternativa", "Link alternativo", { max: L().item }))));
  });

  tela("processos", "Frente 02 · Processos", "Cabeçalho, os três cartões e a linha de entrega. O fluxo animado continua no código.", host => {
    host.append(card("Cabeçalho", cab("processos")));
    host.append(card("Os três cartões", F.listaObjetos("processos.cartoes", "", { fixo: true, titulo: (k, i) => "Cartão " + (i + 1), campos: b => [el("div", { class: "linha" }, F.texto(b + ".rotulo", "Rótulo", { max: L().item }), F.texto(b + ".titulo", "Título", { max: L().item })), F.multilinha(b + ".texto", "Texto", { max: L().curto }), F.listaTextos(b + ".itens", "Itens", { min: 1, max: 6 })] })));
    host.append(card("Entrega", F.texto("processos.entrega", "Texto depois de \"Entrega ·\"", { max: L().curto })));
  });

  tela("dashboard", "Frente 03 · Dashboard", "Cabeçalho da frente e legenda do celular. Painéis e gráficos continuam no código.", host => {
    host.append(card("Cabeçalho", cab("dashboard"), F.texto("dashboard.legendaCelular", "Legenda abaixo do celular", { max: L().item })));
  });

  tela("modelos", "Modelos de contratação", "Título, texto de apoio, os cartões (de 2 a 4) e a nota final.", host => {
    host.append(card("Cabeçalho", F.texto("modelos.rotulo", "Rótulo", { max: L().item }), F.texto("modelos.titulo", "Título"), F.multilinha("modelos.apoio", "Texto de apoio", { max: L().curto })));
    host.append(card("Cartões", F.listaObjetos("modelos.cartoes", "", { min: 2, max: 4, duplicar: true, novo: () => ({ tag: "Recorrente", titulo: "Novo modelo", texto: "", itens: [""], paraQuem: "" }), titulo: k => k.titulo || "Cartão", textoAdicionar: "+ Adicionar cartão",
      campos: b => [el("div", { class: "linha" }, F.texto(b + ".tag", "Tag", { max: 40 }), F.texto(b + ".titulo", "Título", { max: L().item })), F.multilinha(b + ".texto", "Texto", { max: L().curto }), F.listaTextos(b + ".itens", "Itens", { min: 1, max: 8 }), F.texto(b + ".paraQuem", "Para quem…", { max: L().curto, ajuda: "Completa a frase \"Para quem\"." })] })));
    host.append(card("Nota", F.texto("modelos.nota", "Nota abaixo dos cartões", { max: L().curto })));
  });

  tela("perfil", "Serve / não serve", "As duas listas de perfil.", host => {
    host.append(card("Cabeçalho", F.texto("perfil.rotulo", "Rótulo", { max: L().item }), F.texto("perfil.titulo", "Título")));
    host.append(card("Serve bem", F.texto("perfil.serveTitulo", "Título da lista", { max: L().item }), F.listaTextos("perfil.serve", "Itens", { min: 1, max: 8 })));
    host.append(card("Não serve", F.texto("perfil.naoServeTitulo", "Título da lista", { max: L().item }), F.listaTextos("perfil.naoServe", "Itens", { min: 1, max: 8 })));
  });

  tela("faq", "Perguntas frequentes", "As perguntas alimentam a página e os dados estruturados do Google.", host => {
    host.append(card("Cabeçalho", F.texto("faq.rotulo", "Rótulo", { max: L().item }), F.texto("faq.titulo", "Título")));
    host.append(card("Perguntas", F.listaObjetos("faq.itens", "", { min: 1, max: 20, duplicar: true, novo: () => ({ pergunta: "", resposta: "" }), titulo: q => q.pergunta || "Nova pergunta", textoAdicionar: "+ Adicionar pergunta",
      campos: b => [F.texto(b + ".pergunta", "Pergunta"), F.multilinha(b + ".resposta", "Resposta", { max: L().longo, linhas: 4 })] })));
  });

  tela("contato", "Contato e rodapé", "A chamada final, as seis áreas e o cabeçalho do formulário. O e-mail e o WhatsApp ficam em \"Site\".", host => {
    host.append(card("Chamada", F.texto("contato.rotulo", "Rótulo", { max: L().item }), F.texto("contato.titulo", "Título", { ajuda: "*asteriscos* no trecho em laranja." }), F.multilinha("contato.texto", "Texto", { max: L().curto }), F.texto("contato.botaoWhatsapp", "Botão do WhatsApp", { max: L().item })));
    host.append(card("Áreas de atuação", F.listaObjetos("contato.areas", "", { min: 1, max: 6, novo: () => ({ titulo: "", texto: "" }), titulo: a => a.titulo || "Área", textoAdicionar: "+ Adicionar área",
      campos: b => [el("div", { class: "linha" }, F.texto(b + ".titulo", "Título", { max: L().item }), F.texto(b + ".texto", "Texto", { max: L().item }))] })));
    host.append(card("Formulário", F.texto("contato.formulario.titulo", "Título", { max: L().item }), F.texto("contato.formulario.subtitulo", "Subtítulo", { max: L().curto })));
  });

  tela("site", "Site", "Título da aba, descrições para o Google e redes, contato e a nota do rodapé.", host => {
    host.append(card("Google e redes", F.texto("site.tituloAba", "Título da aba / do Google"), F.multilinha("site.descricao", "Descrição para o Google", { max: L().curto, ajuda: "Até 160 caracteres aparecem no resultado da busca." }), F.multilinha("site.descricaoSocial", "Descrição ao compartilhar (WhatsApp, LinkedIn)", { max: L().curto })));
    host.append(card("Contato", el("div", { class: "linha" }, F.texto("site.whatsapp", "WhatsApp (só dígitos, com DDI e DDD)", { max: 20, placeholder: "5569999999999", ajuda: "Em branco, os botões de WhatsApp levam ao formulário." }), F.texto("site.email", "E-mail", { max: L().item, tipo: "email" })), F.texto("site.cidade", "Cidade, UF", { max: L().item })));
    host.append(card("Rodapé", F.multilinha("site.notaRodape", "Nota ao pé da página", { max: L().curto })));
  });
})();
```

---

### Task 7: Produtos (`gestor/tela-produtos.js`)

- [ ] **Step 1: Implementar**

<!-- arquivo: gestor/tela-produtos.js -->
```js
/* Tela "Produtos": lista (ordem, ativo, novo, remover) e edição de cada produto do menu Outros. */
(function () {
  "use strict";
  const { el, F, toast, confirmar, dialogoForm } = G;
  const L = () => G.conteudo.limites;
  const card = (titulo, ...kids) => el("div", { class: "card" }, titulo ? el("h2", { text: titulo }) : null, kids);
  const P = () => G.conteudo.rascunho.produtos;

  function slugDe(nome) {
    return String(nome || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "produto";
  }
  function slugLivre(base) { let s = base, n = 2; while (P().some(p => p.slug === s)) s = base.slice(0, 37) + "-" + n++; return s; }
  function marca(p) {
    const m = el("span", { class: "produto-marca" }); m.style.background = p.cor;
    if (p.icone && p.icone.arquivo) m.append(el("img", { src: F.urlImagem(p.icone.arquivo), alt: "" })); else m.textContent = p.letra || p.nome.charAt(0);
    return m;
  }

  async function novo() {
    const r = await dialogoForm("Novo produto", form => form.append(G.campo("Nome", el("input", { name: "nome", type: "text", required: true, maxlength: L().item }), "Você preenche o resto na página do produto.")), async d => {
      const nome = String(d.nome || "").trim(); if (!nome) throw Object.assign(new Error("informe o nome"), { campo: "nome" });
      const slug = slugLivre(slugDe(nome));
      P().push({ slug, nome, ativo: false, cor: "#1652F0", letra: nome.charAt(0).toUpperCase(), icone: { arquivo: "", alt: "" }, status: "em breve", descricaoMenu: "", descricao: "",
        publico: "", titulo: nome, lead: "", chips: [], capa: { arquivo: "", alt: "" },
        comoFunciona: { rotulo: "Como funciona", titulo: "Três coisas, feitas direito.", itens: [] }, blocos: [],
        listaEspera: { ativa: true, convite: "Entre na lista e seja avisado quando o " + nome + " *abrir*.", campo: "", placeholder: "" } });
      G.conteudo.marcar(); return slug;
    }, "Criar");
    if (r) { toast("Produto criado. Ele só aparece no menu quando estiver ativo.", "ok"); location.hash = "#/produtos/" + r; }
  }

  function lista(host) {
    host.append(el("div", { class: "tela-cab" }, el("div", {}, el("h1", { text: "Produtos" }), el("p", { text: "Os itens do menu Outros, cada um com sua página. A ordem aqui é a ordem do menu." })),
      el("button", { class: "btn", type: "button", onclick: novo }, "Novo produto")));
    const box = el("div", { class: "card" });
    function render() {
      box.innerHTML = "";
      const ps = P();
      if (!ps.length) return box.append(el("p", { class: "vazio", text: "Nenhum produto. Crie o primeiro." }));
      const linhas = ps.map((p, i) => {
        const chave = G.chave("", { checked: p.ativo }, null); chave.classList.add("sem-margem");
        chave.querySelector("input").addEventListener("change", e => { p.ativo = e.target.checked; G.conteudo.marcar(); render(); });
        const mover = (d, rot) => el("button", { class: "btn btn-2 btn-mini", type: "button", title: rot, "aria-label": rot, disabled: (d < 0 ? i === 0 : i === ps.length - 1) || null, onclick: () => { [ps[i], ps[i + d]] = [ps[i + d], ps[i]]; G.conteudo.marcar(); render(); } }, d < 0 ? "↑" : "↓");
        return el("tr", {},
          el("td", {}, el("div", { class: "produto-nome" }, marca(p), el("div", {}, el("b", { text: p.nome }), el("br"), el("span", { class: "mono", text: "/outros/" + p.slug })))),
          el("td", {}, el("span", { class: "selo cinza", text: p.status || "—" })),
          el("td", {}, chave, el("span", { class: "selo " + (p.ativo ? "verde" : "cinza"), text: p.ativo ? "no menu" : "escondido" })),
          el("td", {}, el("div", { class: "item-acoes" }, mover(-1, "Mover para cima"), mover(1, "Mover para baixo"),
            el("a", { class: "btn btn-2 btn-mini", href: "#/produtos/" + p.slug }, "Editar"),
            el("button", { class: "btn btn-2 btn-mini", type: "button", onclick: async () => { if (await confirmar("Remover \"" + p.nome + "\"? A página /outros/" + p.slug + " deixa de existir quando você publicar.", { botao: "Remover", perigo: true })) { ps.splice(i, 1); G.conteudo.marcar(); render(); } } }, "Remover"))));
      });
      box.append(el("div", { class: "tabela-scroll" }, el("table", { class: "tabela" }, el("thead", {}, el("tr", {}, el("th", { text: "Produto" }), el("th", { text: "Status" }), el("th", { text: "Menu" }), el("th", {}))), el("tbody", {}, linhas))));
    }
    render(); host.append(box);
  }

  function editar(host, slug) {
    const i = P().findIndex(p => p.slug === slug);
    if (i < 0) { location.hash = "#/produtos"; return; }
    const b = "produtos." + i, p = P()[i];
    G.conteudo.paginaAtual = "produto:" + p.slug;
    const publicado = G.conteudo.publicado.produtos.some(x => x.slug === slug);
    host.append(el("a", { class: "voltar", href: "#/produtos" }, "← Produtos"));
    host.append(el("div", { class: "tela-cab" }, el("div", {}, el("h1", { text: p.nome }), el("p", { text: "Página /outros/" + p.slug + " e item do menu Outros. Use Visualizar para ver a página com as mudanças." }))));

    const slugCampo = F.texto(b + ".slug", "Endereço (slug)", { max: L().slugMax, ajuda: "Só letras minúsculas, números e hífens." + (publicado ? " Mudar troca a URL da página já publicada." : "") });
    slugCampo.querySelector("input").addEventListener("input", e => { const v = e.target.value.trim().toLowerCase(); if (/^[a-z0-9-]{2,40}$/.test(v)) { G.conteudo.paginaAtual = "produto:" + v; history.replaceState(null, "", "#/produtos/" + v); } });
    const nomeCampo = F.texto(b + ".nome", "Nome", { max: L().item });
    nomeCampo.querySelector("input").addEventListener("input", e => { host.querySelector(".tela-cab h1").textContent = e.target.value || "Produto"; });

    host.append(card("Identidade",
      el("div", { class: "linha" }, nomeCampo, slugCampo),
      F.chave(b + ".ativo", "Ativo", "aparece no menu Outros e a página responde"),
      el("div", { class: "linha tres" }, F.cor(b + ".cor", "Cor"), F.texto(b + ".letra", "Letra ou símbolo", { max: 2, ajuda: "Usada no menu e na arte quando não há ícone." }), F.texto(b + ".status", "Status", { max: L().item, placeholder: "em desenvolvimento" })),
      F.imagem(b + ".icone.arquivo", "Ícone (opcional, quadrado)", { contexto: p.slug + "-icone", alt: "alt", ajuda: "Substitui a letra no menu e na arte. PNG com transparência funciona." }),
      F.texto(b + ".descricaoMenu", "Descrição curta no menu", { max: L().curto }),
      F.multilinha(b + ".descricao", "Descrição para o Google e redes", { max: L().curto })));
    host.append(card("Topo da página",
      F.texto(b + ".publico", "Para quem é (linha pequena acima do título)", { max: L().curto }),
      F.texto(b + ".titulo", "Título", { ajuda: "*asteriscos* no trecho na cor do produto." }),
      F.multilinha(b + ".lead", "Texto de apoio", { max: L().curto }),
      F.listaTextos(b + ".chips", "Chips flutuantes da arte (até 3)", { max: 3 }),
      F.imagem(b + ".capa.arquivo", "Capa (opcional)", { contexto: p.slug + "-capa", alt: "alt", ajuda: "Se houver capa, ela substitui a arte com a letra e os chips. Recomendado 1200 × 1200." })));
    host.append(card("Como funciona",
      el("div", { class: "linha" }, F.texto(b + ".comoFunciona.rotulo", "Rótulo", { max: L().item }), F.texto(b + ".comoFunciona.titulo", "Título")),
      F.listaObjetos(b + ".comoFunciona.itens", "Itens (numerados 01, 02…)", { max: 6, duplicar: true, novo: () => ({ titulo: "", texto: "" }), titulo: (f, k) => String(k + 1).padStart(2, "0") + " " + (f.titulo || ""), textoAdicionar: "+ Adicionar item",
        campos: bb => [F.texto(bb + ".titulo", "Título", { max: L().item }), F.multilinha(bb + ".texto", "Texto", { max: L().curto })] })));
    host.append(card("Blocos livres", F.blocos(b + ".blocos", p.slug)));
    host.append(card("Lista de espera",
      F.chave(b + ".listaEspera.ativa", "Lista de espera ligada", "desligada, o botão do topo e o formulário somem"),
      F.texto(b + ".listaEspera.convite", "Convite", { max: L().curto, ajuda: "*asteriscos* no trecho na cor do produto." }),
      el("div", { class: "linha" }, F.texto(b + ".listaEspera.campo", "Campo extra do formulário (opcional)", { max: L().item }), F.texto(b + ".listaEspera.placeholder", "Exemplo dentro do campo", { max: L().item }))));
  }

  G.TELAS.produtos = { titulo: "Produtos", async render(host, resto) {
    await G.conteudo.garantir();
    if (resto[0]) editar(host, resto[0]); else lista(host);
  } };
})();
```

- [ ] **Step 2: Conferir sintaxe** — `for f in gestor/*.js; do node --check "$f"; done`

- [ ] **Step 3: Checagem no navegador (Chrome headless ou de verdade)**

```bash
rm -rf /tmp/dados-teste && DADOS_DIR=/tmp/dados-teste GESTOR_EMAIL=joaobaidarolimnet@gmail.com GESTOR_SENHA_INICIAL=12345689 PORT=8899 node server.js &
```

Entrar, trocar a senha, e conferir: Início (editar o título → selo "alterações não publicadas"; Visualizar abre o site com o texto novo; adicionar imagem ao carrossel → miniatura aparece; Visualizar mostra o carrossel); Produtos (novo produto → tela de edição; adicionar bloco de cada tipo; Visualizar mostra a página); Publicar (modo local: confirma, grava `conteudo/site.json`, regenera páginas; selo volta para "tudo publicado"); recarregar a página com alterações pendentes restaura o rascunho; Descartar volta ao publicado. Depois, `git checkout conteudo/site.json index.html outros sitemap.xml && rm -rf conteudo/imagens` para desfazer a publicação local de teste (ou publicar de propósito, se quiser).

- [ ] **Step 4: Commit** — `git add gestor && git commit -m "Painel: telas de conteúdo e de produtos"`

---

## Verificação final da fase

- [ ] `npm test` → `# fail 0`
- [ ] Roteiro do Step 3 da Task 7 feito no navegador, sem erro no console
- [ ] `git status` limpo (sem publicação local de teste esquecida)
