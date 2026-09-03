# Painel do gestor · Fase 2 — acesso, usuários e casca do painel

> **For agentic workers:** REQUIRED SUB-SKILL: Use subagent-driven-development (recommended) or executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/gestor` com login por e-mail e senha, sessão em cookie assinado, troca obrigatória de senha no primeiro acesso, cadastro de usuários (administrador/editor) e a casca do painel onde as fases 3 e 4 encaixam as telas.

**Architecture:** `lib/dados.js` cuida do disco persistente (pasta `dados/` local ou o volume do Railway); `lib/auth.js` faz senhas (scrypt), sessões (HMAC) e bloqueio por tentativas; `lib/painel.js` é o roteador de `/gestor` com uma tabela de rotas que as próximas fases estendem; a interface fica em `gestor/` (HTML/CSS/JS puro, sem inline por causa do CSP), com um arquivo por tela registrando-se em `window.G.TELAS`.

**Tech Stack:** Node ≥ 20 (`node:crypto`, `node:http`), `node:test`, HTML/CSS/JS puro.

Spec: `docs/superpowers/specs/2026-09-03-painel-gestor-design.md` (seções 7, 9, 10, 11, 12). Diferenças em relação à spec: a interface fica em vários arquivos (`app.js` + um por tela) em vez de um único `gestor.js`, e a página de login tem um `login.js` próprio, porque o CSP do painel proíbe script inline.

---

## Arquivos

| Arquivo | Responsabilidade |
|---|---|
| `lib/dados.js` (novo) | pasta persistente, `config.json` com o segredo, leitura/gravação atômica de JSON |
| `lib/auth.js` (novo) | usuários, senhas, sessões, bloqueio, semente por variáveis de ambiente |
| `lib/painel.js` (novo) | rotas de `/gestor`: páginas, assets, API (`entrar`, `sair`, `eu`, `senha`, `usuarios`) |
| `server.js` (modificar) | prepara dados e semente no boot; entrega `/gestor` ao painel; registra a porta real |
| `robots.txt` (modificar) | `Disallow: /gestor` e `/api/` |
| `gestor/login.html`, `gestor/login.js` (novos) | tela de entrada |
| `gestor/index.html`, `gestor/app.js`, `gestor/tela-conta.js`, `gestor/tela-usuarios.js`, `gestor/gestor.css` (novos) | casca, navegação, minha conta, usuários |
| `test/dados.test.js`, `test/auth.test.js`, `test/servidor.test.js` (novos) | testes |

---

### Task 1: Disco persistente (`lib/dados.js`)

**Files:**
- Create: `lib/dados.js`
- Test: `test/dados.test.js`

- [ ] **Step 1: Teste**

```js
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const dados = require("../lib/dados");

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "baishift-dados-"));
dados.usar(tmp);

test("preparar cria as pastas e o segredo", () => {
  assert.equal(dados.preparar(), tmp);
  for (const d of ["eventos", "pendentes"]) assert.ok(fs.statSync(path.join(tmp, d)).isDirectory());
  const s1 = dados.segredo();
  assert.match(s1, /^[0-9a-f]{64}$/);
  assert.equal(dados.segredo(), s1, "o segredo é estável");
});

test("lerJson devolve o padrão quando não existe; gravarJson escreve sem deixar temporário", () => {
  assert.deepEqual(dados.lerJson("nada.json", []), []);
  dados.gravarJson("x/y.json", { a: 1 });
  assert.deepEqual(dados.lerJson("x/y.json", null), { a: 1 });
  assert.equal(fs.readdirSync(path.join(tmp, "x")).filter(f => f.includes(".tmp-")).length, 0);
});

test("caminho fica dentro da pasta", () => {
  assert.equal(dados.caminho("eventos", "2026-09.jsonl"), path.join(tmp, "eventos", "2026-09.jsonl"));
});
```

- [ ] **Step 2: Rodar e ver falhar** — `node --test test/dados.test.js` → `Cannot find module '../lib/dados'`

- [ ] **Step 3: Implementar**

```js
/* Disco persistente do painel: usuários, segredo da sessão, eventos de visita, imagens pendentes.
   Local: ./dados (ignorado pelo git). Railway: o volume montado (RAILWAY_VOLUME_MOUNT_PATH).
   DADOS_DIR, se definida, ganha das duas. */
"use strict";
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const RAIZ = path.join(__dirname, "..");
let DIR = process.env.DADOS_DIR || process.env.RAILWAY_VOLUME_MOUNT_PATH || path.join(RAIZ, "dados");

function dir() { return DIR; }
function usar(novo) { DIR = novo; }             /* testes apontam para uma pasta temporária */
function caminho(...partes) { return path.join(DIR, ...partes); }

function lerJson(nome, padrao) {
  try { return JSON.parse(fs.readFileSync(caminho(nome), "utf8")); }
  catch { return padrao; }
}
/* grava num temporário e renomeia: uma queda no meio não deixa o arquivo pela metade */
function gravarJson(nome, obj) {
  const arquivo = caminho(nome), tmp = arquivo + ".tmp-" + process.pid;
  fs.mkdirSync(path.dirname(arquivo), { recursive: true });
  fs.writeFileSync(tmp, JSON.stringify(obj, null, 2));
  fs.renameSync(tmp, arquivo);
}

function preparar() {
  for (const d of ["", "eventos", "pendentes"]) fs.mkdirSync(caminho(d), { recursive: true });
  if (!lerJson("config.json", null)) gravarJson("config.json", { segredo: crypto.randomBytes(32).toString("hex"), criadoEm: new Date().toISOString() });
  return DIR;
}
function segredo() {
  let c = lerJson("config.json", null);
  if (!c || !c.segredo) { preparar(); c = lerJson("config.json", {}); }
  return c.segredo;
}

module.exports = { dir, usar, caminho, preparar, lerJson, gravarJson, segredo };
```

- [ ] **Step 4: Rodar** — `node --test test/dados.test.js` → `# pass 3`
- [ ] **Step 5: Commit** — `git add lib/dados.js test/dados.test.js && git commit -m "Disco persistente do painel"`

---

### Task 2: Usuários, senhas, sessões e bloqueio (`lib/auth.js`)

**Files:**
- Create: `lib/auth.js`
- Test: `test/auth.test.js`

- [ ] **Step 1: Teste**

```js
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const dados = require("../lib/dados");
dados.usar(fs.mkdtempSync(path.join(os.tmpdir(), "baishift-auth-")));
dados.preparar();
const auth = require("../lib/auth");

const erroEm = (fn, campo) => assert.throws(fn, e => { assert.ok(e instanceof auth.ErroAuth, String(e)); assert.equal(e.campo, campo); return true; });

test("hash e conferência de senha", () => {
  const g = auth.hashSenha("segredo-forte-1");
  assert.equal(g.sal.length, 32);
  assert.ok(auth.conferirSenha("segredo-forte-1", g));
  assert.ok(!auth.conferirSenha("segredo-forte-2", g));
  assert.ok(!auth.conferirSenha("x", null));
});

test("semente cria o primeiro usuário com troca obrigatória e não duplica", () => {
  const log = [];
  auth.semear({ GESTOR_EMAIL: "Dono@Baishift.com.br", GESTOR_SENHA_INICIAL: "12345689" }, m => log.push(m));
  auth.semear({ GESTOR_EMAIL: "dono@baishift.com.br", GESTOR_SENHA_INICIAL: "12345689" }, m => log.push(m));
  const lista = auth.listar();
  assert.equal(lista.length, 1);
  assert.equal(lista[0].email, "dono@baishift.com.br");
  assert.equal(lista[0].admin, true);
  assert.equal(lista[0].trocarSenha, true);
  assert.equal(lista[0].primeiro, true);
  assert.ok(!("senha" in lista[0]), "a lista pública não traz o hash");
  assert.ok(log[0].includes("usuário inicial criado"));
});

test("criar valida nome, e-mail, senha mínima e duplicidade", () => {
  erroEm(() => auth.criar({ nome: " ", email: "a@b.c", senha: "1234567890" }), "nome");
  erroEm(() => auth.criar({ nome: "A", email: "sem-arroba", senha: "1234567890" }), "email");
  erroEm(() => auth.criar({ nome: "A", email: "a@b.c", senha: "curta" }), "senha");
  erroEm(() => auth.criar({ nome: "A", email: "DONO@baishift.com.br", senha: "1234567890" }), "email");
  const u = auth.criar({ nome: "Editora", email: "Edit@Baishift.com.br", senha: "senha-provisoria" });
  assert.equal(u.email, "edit@baishift.com.br");
  assert.equal(u.admin, false);
  assert.equal(u.trocarSenha, true);
});

test("sessão: válida, assinatura errada, vencida, versão de senha antiga, usuário inativo", () => {
  const dono = auth.porEmail("dono@baishift.com.br");
  const agora = new Date("2026-09-03T12:00:00Z");
  const c = auth.criarSessao(dono, agora);
  assert.equal(auth.lerSessao(c, agora).id, dono.id);
  assert.equal(auth.lerSessao(c.slice(0, -2) + "xx", agora), null);
  assert.equal(auth.lerSessao("lixo", agora), null);
  assert.equal(auth.lerSessao(c, new Date(agora.getTime() + 8 * 864e5)), null, "vence em 7 dias");
  auth.trocarSenha(dono.id, "12345689", "nova-senha-forte");
  assert.equal(auth.lerSessao(c, agora), null, "trocar a senha derruba a sessão antiga");
  const dono2 = auth.porEmail("dono@baishift.com.br");
  assert.equal(dono2.trocarSenha, false);
  const c2 = auth.criarSessao(dono2, agora);
  assert.equal(auth.lerSessao(c2, agora).id, dono.id);
});

test("trocarSenha exige a atual, mínimo e diferença", () => {
  const ed = auth.porEmail("edit@baishift.com.br");
  erroEm(() => auth.trocarSenha(ed.id, "errada", "nova-senha-forte"), "atual");
  erroEm(() => auth.trocarSenha(ed.id, "senha-provisoria", "curta"), "nova");
  erroEm(() => auth.trocarSenha(ed.id, "senha-provisoria", "senha-provisoria"), "nova");
  auth.trocarSenha(ed.id, "senha-provisoria", "senha-da-editora-1");
  assert.ok(auth.conferirSenha("senha-da-editora-1", auth.porId(ed.id).senha));
});

test("atualizar: regras do primeiro usuário, autodesativação, senha provisória", () => {
  const dono = auth.porEmail("dono@baishift.com.br"), ed = auth.porEmail("edit@baishift.com.br");
  erroEm(() => auth.atualizar(dono.id, { ativo: false }, ed), "ativo");
  erroEm(() => auth.atualizar(dono.id, { admin: false }, ed), "admin");
  erroEm(() => auth.atualizar(ed.id, { ativo: false }, ed), "ativo");
  erroEm(() => auth.atualizar(ed.id, { admin: false }, ed), "admin");
  erroEm(() => auth.atualizar(ed.id, { email: "dono@baishift.com.br" }, dono), "email");
  const u = auth.atualizar(ed.id, { nome: "Editora Chefe", admin: true, senha: "provisoria-nova-1" }, dono);
  assert.equal(u.nome, "Editora Chefe");
  assert.equal(u.admin, true);
  assert.equal(u.trocarSenha, true, "senha redefinida obriga a trocar");
  const c = auth.criarSessao(auth.porId(ed.id));
  auth.atualizar(ed.id, { ativo: false }, dono);
  assert.equal(auth.lerSessao(c), null, "inativo não tem sessão");
});

test("GESTOR_RESET_SENHA redefine e obriga a trocar", () => {
  auth.semear({ GESTOR_EMAIL: "dono@baishift.com.br", GESTOR_RESET_SENHA: "resgate-12345" }, () => {});
  const dono = auth.porEmail("dono@baishift.com.br");
  assert.ok(auth.conferirSenha("resgate-12345", dono.senha));
  assert.equal(dono.trocarSenha, true);
});

test("bloqueio: cinco falhas bloqueiam por 15 minutos", () => {
  let t = 0; const b = new auth.Bloqueio(() => t);
  for (let i = 0; i < 4; i++) b.falha("ip:1");
  assert.equal(b.bloqueado("ip:1"), false);
  b.falha("ip:1");
  assert.equal(b.bloqueado("ip:1"), true);
  t += 14 * 60 * 1000; assert.equal(b.bloqueado("ip:1"), true);
  t += 2 * 60 * 1000; assert.equal(b.bloqueado("ip:1"), false);
  b.falha("ip:2"); b.limpar("ip:2"); assert.equal(b.bloqueado("ip:2"), false);
});
```

- [ ] **Step 2: Rodar e ver falhar** — `node --test test/auth.test.js` → `Cannot find module '../lib/auth'`

- [ ] **Step 3: Implementar**

```js
/* Acesso ao painel: usuários em dados/usuarios.json, senhas com scrypt, sessão em cookie assinado
   (HMAC com o segredo de dados/config.json) e bloqueio por tentativas. */
"use strict";
const crypto = require("node:crypto");
const dados = require("./dados");

const SENHA_MIN = 10, SESSAO_DIAS = 7, MAX_FALHAS = 5, BLOQUEIO_MS = 15 * 60 * 1000;
const ARQ = "usuarios.json";
const RE_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

class ErroAuth extends Error {
  constructor(mensagem, campo) { super(mensagem); this.name = "ErroAuth"; this.campo = campo; }
}

/* ---------- senha ---------- */
function hashSenha(senha, sal = crypto.randomBytes(16).toString("hex")) {
  return { sal, hash: crypto.scryptSync(String(senha), sal, 32, { N: 16384, r: 8, p: 1 }).toString("hex") };
}
function conferirSenha(senha, guardada) {
  if (!guardada || !guardada.sal || !guardada.hash) return false;
  const h = Buffer.from(hashSenha(senha, guardada.sal).hash, "hex"), g = Buffer.from(guardada.hash, "hex");
  return h.length === g.length && crypto.timingSafeEqual(h, g);
}
function validarNovaSenha(s) {
  if (typeof s !== "string" || s.length < SENHA_MIN) return "a senha precisa ter pelo menos " + SENHA_MIN + " caracteres";
  if (s.length > 200) return "senha longa demais";
  return null;
}

/* ---------- usuários ---------- */
function todos() { return dados.lerJson(ARQ, []); }
function salvar(lista) { dados.gravarJson(ARQ, lista); }
function normalizarEmail(e) { return String(e || "").trim().toLowerCase(); }
function publico(u) {
  return { id: u.id, nome: u.nome, email: u.email, admin: !!u.admin, ativo: !!u.ativo, trocarSenha: !!u.trocarSenha,
    primeiro: !!u.primeiro, criadoEm: u.criadoEm, ultimoAcesso: u.ultimoAcesso || null };
}
function listar() { return todos().map(publico); }
function porEmail(email) { const e = normalizarEmail(email); return todos().find(u => u.email === e) || null; }
function porId(id) { return todos().find(u => u.id === id) || null; }

function criar({ nome, email, senha, admin = false, trocarSenha = true, primeiro = false }, agora = new Date()) {
  const lista = todos();
  nome = String(nome || "").trim(); email = normalizarEmail(email);
  if (!nome) throw new ErroAuth("informe o nome", "nome");
  if (!RE_EMAIL.test(email)) throw new ErroAuth("e-mail inválido", "email");
  if (lista.some(u => u.email === email)) throw new ErroAuth("já existe um usuário com esse e-mail", "email");
  if (typeof senha !== "string" || !senha) throw new ErroAuth("informe a senha", "senha");
  /* o primeiro usuário nasce com a senha do ambiente, que será trocada no primeiro acesso */
  const erro = primeiro ? null : validarNovaSenha(senha);
  if (erro) throw new ErroAuth(erro, "senha");
  const u = { id: crypto.randomBytes(8).toString("hex"), nome, email, senha: hashSenha(senha), admin: !!admin, ativo: true,
    trocarSenha: !!trocarSenha, versaoSenha: 1, primeiro: !!primeiro, criadoEm: agora.toISOString(), ultimoAcesso: null };
  lista.push(u); salvar(lista);
  return publico(u);
}

/* mudanças feitas por um administrador (quem) em outro usuário */
function atualizar(id, mudancas, quem) {
  const lista = todos(), u = lista.find(x => x.id === id);
  if (!u) throw new ErroAuth("usuário não encontrado", "id");
  const proprio = quem && quem.id === id;
  if ("nome" in mudancas) { const n = String(mudancas.nome || "").trim(); if (!n) throw new ErroAuth("informe o nome", "nome"); u.nome = n; }
  if ("email" in mudancas) {
    const e = normalizarEmail(mudancas.email);
    if (!RE_EMAIL.test(e)) throw new ErroAuth("e-mail inválido", "email");
    if (lista.some(x => x.email === e && x.id !== id)) throw new ErroAuth("já existe um usuário com esse e-mail", "email");
    u.email = e;
  }
  if ("ativo" in mudancas) {
    const a = !!mudancas.ativo;
    if (!a && u.primeiro) throw new ErroAuth("o primeiro usuário não pode ser desativado", "ativo");
    if (!a && proprio) throw new ErroAuth("você não pode desativar a si mesmo", "ativo");
    u.ativo = a;
  }
  if ("admin" in mudancas) {
    const a = !!mudancas.admin;
    if (!a && u.primeiro) throw new ErroAuth("o primeiro usuário continua administrador", "admin");
    if (!a && proprio) throw new ErroAuth("você não pode tirar o seu próprio acesso de administrador", "admin");
    u.admin = a;
  }
  if ("senha" in mudancas) {
    const erro = validarNovaSenha(mudancas.senha); if (erro) throw new ErroAuth(erro, "senha");
    u.senha = hashSenha(mudancas.senha); u.versaoSenha = (u.versaoSenha || 1) + 1; u.trocarSenha = true;
  }
  salvar(lista);
  return publico(u);
}

/* o próprio usuário troca a senha; devolve o registro completo (para reemitir a sessão) */
function trocarSenha(id, atual, nova) {
  const lista = todos(), u = lista.find(x => x.id === id);
  if (!u) throw new ErroAuth("usuário não encontrado", "id");
  if (!conferirSenha(atual, u.senha)) throw new ErroAuth("a senha atual não confere", "atual");
  const erro = validarNovaSenha(nova); if (erro) throw new ErroAuth(erro, "nova");
  if (atual === nova) throw new ErroAuth("a nova senha precisa ser diferente da atual", "nova");
  u.senha = hashSenha(nova); u.versaoSenha = (u.versaoSenha || 1) + 1; u.trocarSenha = false;
  salvar(lista);
  return u;
}
function registrarAcesso(id, agora = new Date()) {
  const lista = todos(), u = lista.find(x => x.id === id);
  if (u) { u.ultimoAcesso = agora.toISOString(); salvar(lista); }
}

/* ---------- semente e escape por variáveis de ambiente ---------- */
function semear(env = process.env, log = console.log) {
  const email = normalizarEmail(env.GESTOR_EMAIL);
  if (todos().length === 0) {
    if (email && env.GESTOR_SENHA_INICIAL) { criar({ nome: "Gestor", email, senha: env.GESTOR_SENHA_INICIAL, admin: true, trocarSenha: true, primeiro: true }); log("usuário inicial criado: " + email); }
    else log("sem usuários: defina GESTOR_EMAIL e GESTOR_SENHA_INICIAL para criar o primeiro");
  }
  if (email && env.GESTOR_RESET_SENHA) {
    const lista = todos(), u = lista.find(x => x.email === email);
    if (u) {
      u.senha = hashSenha(env.GESTOR_RESET_SENHA); u.versaoSenha = (u.versaoSenha || 1) + 1; u.trocarSenha = true; u.ativo = true;
      salvar(lista); log("senha de " + email + " redefinida por GESTOR_RESET_SENHA — remova a variável depois de entrar");
    }
  }
}

/* ---------- sessão: payload.assinatura, ambos base64url ---------- */
function assinar(payload) { return crypto.createHmac("sha256", dados.segredo()).update(payload).digest("base64url"); }
function criarSessao(u, agora = new Date()) {
  const payload = Buffer.from(JSON.stringify({ uid: u.id, vs: u.versaoSenha || 1, exp: agora.getTime() + SESSAO_DIAS * 864e5 })).toString("base64url");
  return payload + "." + assinar(payload);
}
function lerSessao(valor, agora = new Date()) {
  if (typeof valor !== "string") return null;
  const i = valor.indexOf("."); if (i < 0) return null;
  const payload = valor.slice(0, i), ass = Buffer.from(valor.slice(i + 1)), esperado = Buffer.from(assinar(payload));
  if (ass.length !== esperado.length || !crypto.timingSafeEqual(ass, esperado)) return null;
  let d; try { d = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")); } catch { return null; }
  if (!d || typeof d.exp !== "number" || d.exp < agora.getTime()) return null;
  const u = porId(d.uid);
  if (!u || !u.ativo || (u.versaoSenha || 1) !== d.vs) return null;
  return u;
}

/* ---------- bloqueio por tentativas (por IP e por e-mail) ---------- */
class Bloqueio {
  constructor(relogio = () => Date.now()) { this.relogio = relogio; this.mapa = new Map(); }
  bloqueado(chave) {
    const r = this.mapa.get(chave), agora = this.relogio();
    if (!r) return false;
    if (r.ate) { if (agora < r.ate) return true; this.mapa.delete(chave); return false; }
    return false;
  }
  falha(chave) {
    const agora = this.relogio();
    let r = this.mapa.get(chave);
    if (!r || agora - r.primeira > BLOQUEIO_MS) r = { falhas: 0, primeira: agora, ate: 0 };
    r.falhas++;
    if (r.falhas >= MAX_FALHAS) r.ate = agora + BLOQUEIO_MS;
    this.mapa.set(chave, r);
  }
  limpar(chave) { this.mapa.delete(chave); }
}

module.exports = { hashSenha, conferirSenha, validarNovaSenha, listar, publico, porEmail, porId, criar, atualizar, trocarSenha,
  registrarAcesso, semear, criarSessao, lerSessao, Bloqueio, ErroAuth, SENHA_MIN, SESSAO_DIAS };
```

- [ ] **Step 4: Rodar** — `node --test test/auth.test.js` → `# pass 8`
- [ ] **Step 5: Commit** — `git add lib/auth.js test/auth.test.js && git commit -m "Usuários, senhas, sessões e bloqueio do painel"`

---

### Task 3: Roteador do painel (`lib/painel.js`), servidor e teste de integração

**Files:**
- Create: `lib/painel.js`
- Modify: `server.js`, `robots.txt`
- Test: `test/servidor.test.js`

- [ ] **Step 1: Teste de integração** (sobe o servidor de verdade numa porta livre)

```js
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const RAIZ = path.join(__dirname, "..");
let proc, base, saida = "";

function espera(fn, ms = 8000) {
  return new Promise((res, rej) => { const t0 = Date.now(); (function tick() { if (fn()) return res(); if (Date.now() - t0 > ms) return rej(new Error("tempo esgotado:\n" + saida)); setTimeout(tick, 50); })(); });
}
async function pede(metodo, caminho, { corpo, cookie, gestor = true, tipo = "application/json" } = {}) {
  const cab = {}; if (cookie) cab.cookie = cookie; if (gestor) cab["x-gestor"] = "1";
  if (corpo !== undefined) cab["content-type"] = tipo;
  const r = await fetch(base + caminho, { method: metodo, headers: cab, body: corpo === undefined ? undefined : (typeof corpo === "string" ? corpo : JSON.stringify(corpo)), redirect: "manual" });
  const texto = await r.text(); let json = null; try { json = JSON.parse(texto); } catch {}
  return { status: r.status, texto, json, cookie: (r.headers.get("set-cookie") || "").split(";")[0] };
}

test.before(async () => {
  const dadosDir = fs.mkdtempSync(path.join(os.tmpdir(), "baishift-srv-"));
  proc = spawn(process.execPath, ["server.js"], { cwd: RAIZ, env: Object.assign({}, process.env, { PORT: "0", DADOS_DIR: dadosDir, GESTOR_EMAIL: "teste@baishift.com.br", GESTOR_SENHA_INICIAL: "12345689", GITHUB_TOKEN: "", RAILWAY_ENVIRONMENT: "" }) });
  proc.stdout.on("data", d => { saida += d; }); proc.stderr.on("data", d => { saida += d; });
  await espera(() => /no ar na porta (\d+)/.test(saida));
  base = "http://127.0.0.1:" + saida.match(/no ar na porta (\d+)/)[1];
});
test.after(() => { if (proc) proc.kill(); });

test("boot: conteúdo gerado, dados preparados, usuário inicial", () => {
  assert.match(saida, /conteúdo gerado: 5 arquivos/);
  assert.match(saida, /disco persistente em /);
  assert.match(saida, /usuário inicial criado: teste@baishift.com.br/);
});

test("site continua no ar e os arquivos do projeto ficam escondidos", async () => {
  assert.equal((await pede("GET", "/")).status, 200);
  for (const p of ["/lib/auth.js", "/gestor/index.html", "/gestor/app.js", "/conteudo/site.json", "/dados/usuarios.json", "/test/auth.test.js"]) assert.equal((await pede("GET", p)).status, 404, p);
  const robots = (await pede("GET", "/robots.txt")).texto;
  assert.match(robots, /Disallow: \/gestor/); assert.match(robots, /Disallow: \/api\//);
});

test("/gestor sem sessão mostra o login; API e scripts exigem sessão", async () => {
  const r = await pede("GET", "/gestor");
  assert.equal(r.status, 200); assert.match(r.texto, /id="entrar"/); assert.match(r.texto, /noindex/);
  assert.equal((await pede("GET", "/gestor/gestor.css")).status, 200);
  assert.equal((await pede("GET", "/gestor/login.js")).status, 200);
  assert.equal((await pede("GET", "/gestor/app.js")).status, 401);
  assert.equal((await pede("GET", "/gestor/api/eu")).status, 401);
  assert.equal((await pede("GET", "/gestor/api/nada")).status, 401);
});

let cookieDono, cookieVelho, idDono, idEditora;

test("login errado, login certo, troca obrigatória de senha", async () => {
  let r = await pede("POST", "/gestor/api/entrar", { corpo: { email: "teste@baishift.com.br", senha: "errada" } });
  assert.equal(r.status, 401); assert.equal(r.json.erro, "e-mail ou senha incorretos");
  r = await pede("POST", "/gestor/api/entrar", { corpo: { email: "TESTE@baishift.com.br", senha: "12345689" } });
  assert.equal(r.status, 200); assert.equal(r.json.trocarSenha, true);
  assert.match(r.cookie, /^gestor_sessao=/); cookieVelho = r.cookie;
  r = await pede("GET", "/gestor/api/eu", { cookie: cookieVelho });
  assert.equal(r.status, 200); assert.equal(r.json.usuario.trocarSenha, true); assert.equal(r.json.github, false);
  idDono = r.json.usuario.id;
  assert.equal((await pede("GET", "/gestor", { cookie: cookieVelho })).texto.includes('id="tela"'), true, "com sessão vem a casca");
  assert.equal((await pede("GET", "/gestor/app.js", { cookie: cookieVelho })).status, 200);
  r = await pede("GET", "/gestor/api/usuarios", { cookie: cookieVelho });
  assert.equal(r.status, 403); assert.equal(r.json.trocarSenha, true);
  r = await pede("POST", "/gestor/api/senha", { cookie: cookieVelho, corpo: { atual: "12345689", nova: "curta" } });
  assert.equal(r.status, 400); assert.equal(r.json.campo, "nova");
  r = await pede("POST", "/gestor/api/senha", { cookie: cookieVelho, corpo: { atual: "12345689", nova: "senha-nova-do-dono" } });
  assert.equal(r.status, 200); cookieDono = r.cookie;
  assert.equal((await pede("GET", "/gestor/api/eu", { cookie: cookieVelho })).status, 401, "sessão antiga cai");
  r = await pede("GET", "/gestor/api/eu", { cookie: cookieDono });
  assert.equal(r.json.usuario.trocarSenha, false);
});

test("proteções da API: cabeçalho X-Gestor, JSON, corpo grande", async () => {
  assert.equal((await pede("POST", "/gestor/api/usuarios", { cookie: cookieDono, gestor: false, corpo: { nome: "x" } })).status, 403);
  assert.equal((await pede("POST", "/gestor/api/usuarios", { cookie: cookieDono, corpo: "nome=x", tipo: "text/plain" })).status, 415);
  assert.equal((await pede("POST", "/gestor/api/usuarios", { cookie: cookieDono, corpo: "{oops", tipo: "application/json" })).status, 400);
  assert.equal((await pede("POST", "/gestor/api/senha", { cookie: cookieDono, corpo: "x".repeat(3 * 1024 * 1024), tipo: "application/json" })).status, 413);
});

test("usuários: criar, regras, editora entra e precisa trocar a senha", async () => {
  let r = await pede("POST", "/gestor/api/usuarios", { cookie: cookieDono, corpo: { nome: "Editora", email: "edit@baishift.com.br", senha: "provisoria-123", admin: false } });
  assert.equal(r.status, 201); idEditora = r.json.usuario.id; assert.equal(r.json.usuario.trocarSenha, true);
  r = await pede("GET", "/gestor/api/usuarios", { cookie: cookieDono });
  assert.equal(r.json.usuarios.length, 2); assert.ok(!("senha" in r.json.usuarios[0]));
  r = await pede("PATCH", "/gestor/api/usuarios/" + idDono, { cookie: cookieDono, corpo: { ativo: false } });
  assert.equal(r.status, 400); assert.equal(r.json.campo, "ativo");
  r = await pede("PATCH", "/gestor/api/usuarios/" + idEditora, { cookie: cookieDono, corpo: { nome: "Editora Chefe" } });
  assert.equal(r.status, 200); assert.equal(r.json.usuario.nome, "Editora Chefe");
  r = await pede("POST", "/gestor/api/entrar", { corpo: { email: "edit@baishift.com.br", senha: "provisoria-123" } });
  assert.equal(r.status, 200); assert.equal(r.json.trocarSenha, true);
  const cookieEd = r.cookie;
  assert.equal((await pede("GET", "/gestor/api/usuarios", { cookie: cookieEd })).status, 403, "editora bloqueada até trocar");
  r = await pede("POST", "/gestor/api/senha", { cookie: cookieEd, corpo: { atual: "provisoria-123", nova: "senha-da-editora" } });
  assert.equal(r.status, 200);
  assert.equal((await pede("GET", "/gestor/api/usuarios", { cookie: r.cookie })).status, 403, "editora não é admin");
  assert.equal((await pede("POST", "/gestor/api/sair", { cookie: r.cookie, corpo: {} })).cookie, "gestor_sessao=");
});

test("cinco erros bloqueiam o IP por 15 minutos", async () => {
  for (let i = 0; i < 5; i++) await pede("POST", "/gestor/api/entrar", { corpo: { email: "ninguem@baishift.com.br", senha: "x" } });
  const r = await pede("POST", "/gestor/api/entrar", { corpo: { email: "teste@baishift.com.br", senha: "senha-nova-do-dono" } });
  assert.equal(r.status, 429);
});
```

- [ ] **Step 2: Rodar e ver falhar** — `node --test test/servidor.test.js` → falha no `before` (o servidor não imprime "disco persistente")

- [ ] **Step 3: Implementar `lib/painel.js`**

```js
/* Rotas de /gestor: páginas do painel, seus assets e a API (JSON).
   As fases seguintes acrescentam rotas com rota(metodo, caminho, opcoes, fn). */
"use strict";
const fs = require("node:fs");
const path = require("node:path");
const auth = require("./auth");

const RAIZ = path.join(__dirname, "..");
const PASTA = path.join(RAIZ, "gestor");
const COOKIE = "gestor_sessao";
const LIMITE_JSON = 2 * 1024 * 1024;
const bloqueio = new auth.Bloqueio();

const CSP = "default-src 'self'; script-src 'self'; style-src 'self' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data: blob:; connect-src 'self'; form-action 'self'; frame-ancestors 'none'; base-uri 'self'";
const TIPOS = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8" };
/* assets do painel que não exigem sessão (a tela de login precisa deles) */
const PUBLICOS = new Set(["gestor.css", "login.js"]);

class Erro extends Error {
  constructor(status, mensagem, campo) { super(mensagem); this.status = status; this.campo = campo; }
}

function cabecalhos(tipo, extra) {
  return Object.assign({ "Content-Type": tipo, "Cache-Control": "no-store", "X-Robots-Tag": "noindex", "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY", "Referrer-Policy": "no-referrer", "Content-Security-Policy": CSP }, extra);
}
function json(res, status, obj, extra) {
  const corpo = Buffer.from(JSON.stringify(obj));
  res.writeHead(status, cabecalhos("application/json; charset=utf-8", Object.assign({ "Content-Length": corpo.length }, extra)));
  res.end(corpo);
}
function arquivo(res, nome, status = 200) {
  const corpo = fs.readFileSync(path.join(PASTA, nome));
  res.writeHead(status, cabecalhos(TIPOS[path.extname(nome)] || "application/octet-stream", { "Content-Length": corpo.length }));
  res.end(corpo);
}

/* ---------- pedido ---------- */
function ip(req) {
  const xff = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim();
  return xff || (req.socket && req.socket.remoteAddress) || "";
}
function seguro(req) {
  const proto = String(req.headers["x-forwarded-proto"] || "").split(",")[0].trim();
  const host = String(req.headers.host || "").split(":")[0];
  return proto === "https" || !(host === "localhost" || /^127\./.test(host) || host === "");
}
function cookieSessao(req, valor, maxAge) {
  return COOKIE + "=" + valor + "; Path=/gestor; HttpOnly; SameSite=Strict; Max-Age=" + maxAge + (seguro(req) ? "; Secure" : "");
}
function lerCookies(req) {
  const out = {};
  String(req.headers.cookie || "").split(";").forEach(p => { const i = p.indexOf("="); if (i > 0) out[p.slice(0, i).trim()] = p.slice(i + 1).trim(); });
  return out;
}
function usuarioDe(req) { return auth.lerSessao(lerCookies(req)[COOKIE]); }

/* lê o corpo até o limite; o que passar é descartado e a resposta é 413 (a conexão fica saudável) */
function lerCorpo(req, limite) {
  return new Promise((resolve, reject) => {
    const partes = []; let tamanho = 0, excedeu = false;
    req.on("data", c => { tamanho += c.length; if (tamanho > limite) excedeu = true; else partes.push(c); });
    req.on("end", () => excedeu ? reject(new Erro(413, "corpo grande demais")) : resolve(Buffer.concat(partes)));
    req.on("error", reject);
  });
}
async function lerJson(req, limite = LIMITE_JSON) {
  if (!/^application\/json/.test(String(req.headers["content-type"] || ""))) throw new Erro(415, "envie JSON");
  const b = await lerCorpo(req, limite);
  try { return b.length ? JSON.parse(b.toString("utf8")) : {}; } catch { throw new Erro(400, "JSON inválido"); }
}

/* ---------- tabela de rotas ---------- */
const rotas = [];
/* opcoes: publica (sem sessão), admin (só administradores), comTrocaPendente (liberada mesmo com troca de senha pendente) */
function rota(metodo, caminho, opcoes, fn) { rotas.push({ metodo, partes: caminho.split("/").filter(Boolean), opcoes: opcoes || {}, fn }); }

function responderErro(res, e) {
  if (e instanceof Erro) return json(res, e.status, Object.assign({ erro: e.message }, e.campo ? { campo: e.campo } : {}, e.trocarSenha ? { trocarSenha: true } : {}));
  if (e && (e.name === "ErroAuth" || e.name === "ErroConteudo")) return json(res, 400, { erro: e.message, campo: e.campo });
  console.error("painel:", e);
  json(res, 500, { erro: "erro interno no painel" });
}

async function api(req, res, caminho, usuario) {
  const partes = caminho.split("/").filter(Boolean);
  const r = rotas.find(x => x.metodo === req.method && x.partes.length === partes.length && x.partes.every((p, i) => p.startsWith(":") || p === partes[i]));
  if (!r) throw usuario ? new Erro(404, "rota não encontrada") : new Erro(401, "entre no painel");
  const params = {}; r.partes.forEach((p, i) => { if (p.startsWith(":")) params[p.slice(1)] = decodeURIComponent(partes[i]); });
  if (!r.opcoes.publica) {
    if (!usuario) throw new Erro(401, "entre no painel");
    if (req.method !== "GET" && req.method !== "HEAD" && req.headers["x-gestor"] !== "1") throw new Erro(403, "requisição inválida");
    if (usuario.trocarSenha && !r.opcoes.comTrocaPendente) throw Object.assign(new Erro(403, "troque a senha para continuar"), { trocarSenha: true });
    if (r.opcoes.admin && !usuario.admin) throw new Erro(403, "só administradores");
  }
  await r.fn({ req, res, params, usuario, ip: ip(req), lerJson: limite => lerJson(req, limite), lerCorpo: limite => lerCorpo(req, limite), json: (status, obj, extra) => json(res, status, obj, extra) });
}

/* ponto de entrada: devolve true se o caminho é do painel (e já respondeu) */
async function atender(req, res) {
  const p = decodeURIComponent((req.url || "/").split("?")[0]);
  if (p !== "/gestor" && !p.startsWith("/gestor/")) return false;
  try {
    const usuario = usuarioDe(req);
    if (p === "/gestor" || p === "/gestor/") {
      if (req.method !== "GET" && req.method !== "HEAD") throw new Erro(405, "método não permitido");
      arquivo(res, usuario ? "index.html" : "login.html");
    } else if (p.startsWith("/gestor/api/")) {
      await api(req, res, p.slice("/gestor/api".length), usuario);
    } else {
      const nome = p.slice("/gestor/".length);
      if (!/^[a-z0-9-]+\.(css|js)$/.test(nome) || !fs.existsSync(path.join(PASTA, nome))) throw new Erro(404, "não encontrado");
      if (!PUBLICOS.has(nome) && !usuario) throw new Erro(401, "entre no painel");
      arquivo(res, nome);
    }
  } catch (e) { responderErro(res, e); }
  return true;
}

/* ---------- rotas de acesso ---------- */
rota("POST", "entrar", { publica: true }, async ({ req, res, ip, lerJson }) => {
  const b = await lerJson();
  const email = String(b.email || "").trim().toLowerCase(), senha = String(b.senha || "");
  const chaves = ["ip:" + ip, "email:" + email];
  if (chaves.some(k => bloqueio.bloqueado(k))) throw new Erro(429, "muitas tentativas; aguarde 15 minutos");
  const u = auth.porEmail(email);
  if (!u || !u.ativo || !auth.conferirSenha(senha, u.senha)) { chaves.forEach(k => bloqueio.falha(k)); throw new Erro(401, "e-mail ou senha incorretos"); }
  chaves.forEach(k => bloqueio.limpar(k));
  auth.registrarAcesso(u.id);
  json(res, 200, { ok: true, trocarSenha: !!u.trocarSenha }, { "Set-Cookie": cookieSessao(req, auth.criarSessao(u), auth.SESSAO_DIAS * 86400) });
});
rota("POST", "sair", { comTrocaPendente: true }, ({ req, res }) => json(res, 200, { ok: true }, { "Set-Cookie": cookieSessao(req, "", 0) }));
rota("GET", "eu", { comTrocaPendente: true }, ({ res, usuario }) =>
  json(res, 200, { usuario: auth.publico(usuario), github: !!process.env.GITHUB_TOKEN, railway: !!process.env.RAILWAY_ENVIRONMENT }));
rota("POST", "senha", { comTrocaPendente: true }, async ({ req, res, usuario, lerJson }) => {
  const b = await lerJson();
  const u = auth.trocarSenha(usuario.id, String(b.atual || ""), String(b.nova || ""));
  json(res, 200, { ok: true }, { "Set-Cookie": cookieSessao(req, auth.criarSessao(u), auth.SESSAO_DIAS * 86400) });
});
rota("GET", "usuarios", { admin: true }, ({ res }) => json(res, 200, { usuarios: auth.listar() }));
rota("POST", "usuarios", { admin: true }, async ({ res, lerJson }) => {
  const b = await lerJson();
  json(res, 201, { usuario: auth.criar({ nome: b.nome, email: b.email, senha: b.senha, admin: !!b.admin, trocarSenha: true }) });
});
rota("PATCH", "usuarios/:id", { admin: true }, async ({ res, params, usuario, lerJson }) => {
  const b = await lerJson();
  json(res, 200, { usuario: auth.atualizar(params.id, b, usuario) });
});

module.exports = { atender, rota, Erro, json };
```

- [ ] **Step 4: Ligar no `server.js`**

Depois do bloco que gera o conteúdo (Task 10 da fase 1), acrescentar:

```js
/* disco persistente (usuários, métricas) e usuário inicial */
const dados = require("./lib/dados");
const auth = require("./lib/auth");
const painel = require("./lib/painel");
console.log("disco persistente em " + dados.preparar());
auth.semear();
console.log("GitHub: " + (process.env.GITHUB_TOKEN ? "token presente" : "sem token" + (process.env.RAILWAY_ENVIRONMENT ? " — o painel não vai publicar até configurar GITHUB_TOKEN" : " (modo local)")));
```

Trocar o `http.createServer(...)` por:

```js
const servidor = http.createServer((req, res) => {
  if (redirecionar(req, res)) return;
  const caminho = (req.url || "/").split("?")[0];
  if (caminho === "/gestor" || caminho.startsWith("/gestor/")) {
    painel.atender(req, res).catch(e => { console.error("painel:", e); if (!res.headersSent) res.writeHead(500); res.end(); });
    return;
  }
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.writeHead(405, { "Allow": "GET, HEAD", "Content-Type": "text/plain; charset=utf-8" });
    return res.end("Método não permitido");
  }
  const arquivo = resolver(req.url);
  if (!arquivo) return responder404(req, res);
  enviar(req, res, arquivo, 200);
});

servidor.listen(PORTA, () => {
  console.log("Site da Baishift no ar na porta " + servidor.address().port);
});
```

`robots.txt` fica:

```
User-agent: *
Allow: /
Disallow: /gestor
Disallow: /api/

Sitemap: https://www.baishift.com.br/sitemap.xml
```

- [ ] **Step 5: Arquivos mínimos em `gestor/` para o teste passar** — a Task 4 escreve os definitivos; aqui só o que o teste exige:

```bash
mkdir -p gestor
printf '<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><meta name="robots" content="noindex, nofollow"><title>Entrar</title></head><body><form id="entrar"></form></body></html>\n' > gestor/login.html
printf '<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><meta name="robots" content="noindex, nofollow"><title>Painel</title></head><body><main id="tela"></main></body></html>\n' > gestor/index.html
printf '/* provisório */\n' > gestor/gestor.css
printf '/* provisório */\n' > gestor/login.js
printf '/* provisório */\n' > gestor/app.js
```

- [ ] **Step 6: Rodar** — `node --test test/servidor.test.js` → `# pass 7`; depois `npm test` → `# fail 0`
- [ ] **Step 7: Commit** — `git add lib/painel.js server.js robots.txt gestor test/servidor.test.js && git commit -m "Rotas de /gestor: login, sessão, troca de senha e usuários"`

---

### Task 4: Tela de entrada e folha de estilos do painel

**Files:**
- Create/overwrite: `gestor/login.html`, `gestor/login.js`, `gestor/gestor.css`

- [ ] **Step 1: `gestor/login.html`**

```html
<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>Entrar · Painel Baishift</title>
<link rel="icon" href="/assets/img/favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Sora:wght@600;700&family=Inter:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/gestor/gestor.css">
</head>
<body class="login">
<form class="login-card" id="entrar" novalidate>
  <img src="/assets/marca/01-logo/baishift-principal.svg" alt="Baishift" width="911" height="175">
  <h1>Painel do gestor</h1>
  <p>Entre com o seu e-mail e a sua senha.</p>
  <label class="campo"><span>E-mail</span><input name="email" type="email" autocomplete="username" required autofocus></label>
  <label class="campo"><span>Senha</span><input name="senha" type="password" autocomplete="current-password" required></label>
  <p class="msg" id="msg" role="alert"></p>
  <button class="btn btn-largo" type="submit" id="botao">Entrar</button>
</form>
<script src="/gestor/login.js"></script>
</body>
</html>
```

- [ ] **Step 2: `gestor/login.js`**

```js
/* Tela de entrada do painel: manda e-mail e senha para /gestor/api/entrar e abre o painel. */
(function () {
  "use strict";
  var form = document.getElementById("entrar"), msg = document.getElementById("msg"), botao = document.getElementById("botao");
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    msg.textContent = ""; botao.disabled = true; botao.textContent = "Entrando…";
    var d = new FormData(form);
    fetch("/gestor/api/entrar", { method: "POST", headers: { "Content-Type": "application/json", "X-Gestor": "1" },
      body: JSON.stringify({ email: d.get("email"), senha: d.get("senha") }) })
      .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
      .then(function (r) {
        if (!r.ok) { msg.textContent = r.j.erro || "não foi possível entrar"; botao.disabled = false; botao.textContent = "Entrar"; return; }
        location.href = "/gestor" + (r.j.trocarSenha ? "#/conta" : "");
      })
      .catch(function () { msg.textContent = "sem conexão com o servidor"; botao.disabled = false; botao.textContent = "Entrar"; });
  });
})();
```

- [ ] **Step 3: `gestor/gestor.css`**

```css
/* =========================================================
   Painel do gestor — folha de estilo (ferramenta, densa, mesma marca do site)
   ========================================================= */
:root{
  --ink:#0A1B3D;--navy:#0C2149;--deep:#071433;--mist:#F4F7FC;--line:#DDE5F3;--muted:#5B6E93;
  --blue:#1652F0;--blue-soft:#E8EFFE;--blue-light:#7FA6FF;--orange:#FF7A1A;--orange-soft:#FFF0E2;
  --green:#12855A;--green-soft:#E3F5EC;--red:#D8402F;--red-soft:#FBE7E4;
  --mono:"IBM Plex Mono",ui-monospace,SFMono-Regular,Menlo,monospace;
  --sans:"Inter",system-ui,-apple-system,"Segoe UI",sans-serif;
  --display:"Sora","Inter",system-ui,sans-serif;
}
*{box-sizing:border-box}
html{-webkit-text-size-adjust:100%}
body{margin:0;background:var(--mist);color:var(--ink);font:14px/1.5 var(--sans);-webkit-font-smoothing:antialiased}
h1,h2,h3{font-family:var(--display);font-weight:600;letter-spacing:-.02em;margin:0;line-height:1.15}
p{margin:0 0 1em}
a{color:var(--blue)}
button,input,select,textarea{font:inherit;color:inherit}
:focus-visible{outline:2px solid var(--blue);outline-offset:2px;border-radius:6px}
[hidden]{display:none!important}
.mono{font-family:var(--mono);font-size:.6rem;letter-spacing:.12em;text-transform:uppercase;color:var(--muted)}

/* ---------------- LOGIN ---------------- */
body.login{min-height:100dvh;display:grid;place-items:center;padding:24px;background:var(--ink);
  background-image:radial-gradient(rgba(255,255,255,.08) 1px,transparent 1.3px);background-size:24px 24px}
.login-card{width:100%;max-width:380px;background:#fff;border-radius:16px;padding:28px;box-shadow:0 50px 100px -40px rgba(22,82,240,.6)}
.login-card img{height:32px;width:auto;display:block;margin-bottom:22px}
.login-card h1{font-size:1.2rem;margin-bottom:4px}
.login-card>p{color:var(--muted);margin:0 0 18px}
.login-card .msg{min-height:1.2em;margin:0 0 12px}

/* ---------------- APP ---------------- */
body.app{display:grid;grid-template-columns:236px minmax(0,1fr);grid-template-rows:56px minmax(0,1fr);min-height:100dvh}
.topo{grid-column:1/-1;display:flex;align-items:center;gap:12px;padding:0 16px;background:#fff;border-bottom:1px solid var(--line);position:sticky;top:0;z-index:20}
.marca{display:flex;align-items:center;gap:10px;text-decoration:none;color:var(--ink)}
.marca img{height:26px;width:auto;display:block}
.marca span{font-family:var(--mono);font-size:.58rem;letter-spacing:.14em;text-transform:uppercase;color:var(--muted);border:1px solid var(--line);border-radius:99px;padding:3px 8px}
.topo-acoes{margin-left:auto;display:flex;gap:8px;align-items:center;flex-wrap:wrap;justify-content:flex-end}
.menu-btn{display:none;width:38px;height:38px;border:1px solid var(--line);border-radius:9px;background:#fff;cursor:pointer;place-items:center;font-size:1.1rem}
.lateral{background:var(--navy);color:#fff;padding:14px 12px;display:flex;flex-direction:column;gap:2px;position:sticky;top:56px;height:calc(100dvh - 56px);overflow:auto}
.lateral .grupo{font-family:var(--mono);font-size:.56rem;letter-spacing:.14em;text-transform:uppercase;color:rgba(255,255,255,.42);padding:14px 10px 5px}
.lateral a{display:flex;align-items:center;gap:9px;color:rgba(255,255,255,.8);text-decoration:none;padding:8px 10px;border-radius:8px;font-size:.88rem;transition:.15s}
.lateral a:hover{background:rgba(255,255,255,.07);color:#fff}
.lateral a.ativo{background:var(--blue);color:#fff}
.lateral a.breve{opacity:.4;pointer-events:none}
.lateral a.breve::after{content:"em breve";margin-left:auto;font-family:var(--mono);font-size:.52rem;letter-spacing:.1em;text-transform:uppercase}
.lateral-pe{margin-top:auto;padding:12px 10px 4px;font-size:.76rem;color:rgba(255,255,255,.55);border-top:1px solid rgba(255,255,255,.12)}
.lateral-pe b{display:block;color:#fff;font-weight:600;font-size:.84rem}
.tela{padding:24px;max-width:1140px;width:100%;min-width:0}
.tela-cab{display:flex;flex-wrap:wrap;gap:12px;align-items:flex-end;justify-content:space-between;margin-bottom:20px}
.tela-cab h1{font-size:1.45rem}
.tela-cab p{margin:4px 0 0;color:var(--muted);max-width:60ch}

/* ---------------- CARTÕES E FORMULÁRIOS ---------------- */
.card{background:#fff;border:1px solid var(--line);border-radius:14px;padding:20px;margin-bottom:16px}
.card h2{font-size:1rem;margin-bottom:14px}
.card h2 small{font-family:var(--sans);font-weight:400;color:var(--muted);font-size:.85rem;margin-left:8px}
.campo{display:grid;gap:5px;margin-bottom:14px;min-width:0}
.campo>span{font-family:var(--mono);font-size:.58rem;letter-spacing:.12em;text-transform:uppercase;color:var(--muted)}
.campo input,.campo select,.campo textarea{width:100%;border:1px solid var(--line);border-radius:9px;padding:10px 12px;background:#fff;transition:border-color .15s;min-width:0}
.campo input:focus,.campo select:focus,.campo textarea:focus{border-color:var(--blue);outline:none}
.campo textarea{min-height:96px;resize:vertical;line-height:1.5}
.campo .ajuda{font-size:.76rem;color:var(--muted)}
.campo.erro input,.campo.erro select,.campo.erro textarea{border-color:var(--red)}
.msg{color:var(--red);font-size:.82rem;margin:0}
.linha{display:grid;gap:0 14px}
@media(min-width:700px){.linha{grid-template-columns:1fr 1fr}.linha.tres{grid-template-columns:1fr 1fr 1fr}}
.chave{display:inline-flex;align-items:center;gap:10px;cursor:pointer;font-size:.9rem;margin-bottom:14px}
.chave input{appearance:none;-webkit-appearance:none;width:38px;height:22px;border-radius:99px;background:var(--line);position:relative;transition:.2s;margin:0;cursor:pointer;flex:none}
.chave input::after{content:"";position:absolute;top:3px;left:3px;width:16px;height:16px;border-radius:50%;background:#fff;transition:.2s;box-shadow:0 1px 2px rgba(0,0,0,.25)}
.chave input:checked{background:var(--green)}
.chave input:checked::after{left:19px}
.chave small{color:var(--muted)}

/* ---------------- BOTÕES ---------------- */
.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;border:1px solid transparent;border-radius:9px;padding:9px 14px;font-weight:600;font-size:.88rem;cursor:pointer;background:var(--blue);color:#fff;transition:.15s;text-decoration:none;line-height:1.2;white-space:nowrap}
.btn:hover{background:#3D6FFF}
.btn:disabled{opacity:.55;cursor:default}
.btn-2{background:#fff;border-color:var(--line);color:var(--ink)}
.btn-2:hover{border-color:var(--blue);color:var(--blue);background:#fff}
.btn-perigo{background:var(--red)}
.btn-perigo:hover{background:#B8321F}
.btn-laranja{background:var(--orange)}
.btn-laranja:hover{background:#FF9A4D}
.btn-mini{padding:5px 9px;font-size:.78rem;border-radius:7px}
.btn-largo{width:100%}
.acoes{display:flex;flex-wrap:wrap;gap:8px;align-items:center}

/* ---------------- TABELAS, SELOS, AVISOS ---------------- */
.tabela-scroll{overflow-x:auto}
.tabela{width:100%;border-collapse:collapse;font-size:.88rem}
.tabela th{text-align:left;font-family:var(--mono);font-size:.56rem;letter-spacing:.12em;text-transform:uppercase;color:var(--muted);padding:8px 10px;border-bottom:1px solid var(--line);white-space:nowrap}
.tabela td{padding:10px;border-bottom:1px solid var(--line);vertical-align:middle}
.tabela tr:last-child td{border-bottom:0}
.tabela td.num{text-align:right;font-variant-numeric:tabular-nums}
.selo{display:inline-block;font-family:var(--mono);font-size:.56rem;letter-spacing:.1em;text-transform:uppercase;border-radius:99px;padding:3px 8px;background:var(--blue-soft);color:var(--blue);white-space:nowrap}
.selo.verde{background:var(--green-soft);color:var(--green)}
.selo.laranja{background:var(--orange-soft);color:#B45309}
.selo.cinza{background:var(--mist);color:var(--muted)}
.selo.vermelho{background:var(--red-soft);color:var(--red)}
.aviso{background:var(--orange-soft);border:1px solid #F9C89B;color:#7C3A00;padding:12px 14px;border-radius:10px;margin-bottom:16px;font-size:.88rem}
.aviso.azul{background:var(--blue-soft);border-color:#C5D6FF;color:#0B2E8A}
.vazio{color:var(--muted);text-align:center;padding:30px 10px}
.toasts{position:fixed;right:16px;bottom:16px;z-index:100;display:grid;gap:8px;max-width:min(420px,calc(100% - 32px))}
.toast{background:var(--ink);color:#fff;padding:11px 14px;border-radius:10px;font-size:.88rem;box-shadow:0 14px 30px -12px rgba(0,0,0,.5);animation:toastin .25s ease}
.toast.erro{background:var(--red)}
.toast.ok{background:var(--green)}
@keyframes toastin{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
dialog.dlg{border:0;border-radius:14px;padding:22px;max-width:460px;width:calc(100% - 32px);box-shadow:0 40px 80px -30px rgba(10,27,61,.6);color:var(--ink)}
dialog.dlg::backdrop{background:rgba(10,27,61,.5)}
dialog.dlg h2{font-size:1.05rem;margin-bottom:14px}
dialog.dlg p{margin:0 0 16px}
dialog.dlg .acoes{justify-content:flex-end}

/* ---------------- RESPONSIVO ---------------- */
@media(max-width:900px){
  body.app{grid-template-columns:minmax(0,1fr)}
  .lateral{position:fixed;left:0;top:56px;bottom:0;width:264px;transform:translateX(-100%);transition:transform .2s;z-index:30;height:auto;box-shadow:0 0 0 100vw rgba(10,27,61,0)}
  .lateral.aberta{transform:none;box-shadow:0 0 0 100vw rgba(10,27,61,.45)}
  .menu-btn{display:grid}
  .tela{padding:16px}
}
```

- [ ] **Step 4: Conferir** — `node --test test/servidor.test.js` continua `# pass 7` (o login ainda tem `id="entrar"`)
- [ ] **Step 5: Commit** — `git add gestor && git commit -m "Painel: tela de entrada e folha de estilos"`

---

### Task 5: Casca do painel, navegação, Minha conta e Usuários

**Files:**
- Create/overwrite: `gestor/index.html`, `gestor/app.js`
- Create: `gestor/tela-conta.js`, `gestor/tela-usuarios.js`

- [ ] **Step 1: `gestor/index.html`**

```html
<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>Painel · Baishift</title>
<link rel="icon" href="/assets/img/favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Sora:wght@600;700&family=Inter:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/gestor/gestor.css">
</head>
<body class="app">
<header class="topo">
  <button class="menu-btn" id="menu-btn" type="button" aria-label="Abrir menu" aria-controls="lateral" aria-expanded="false">☰</button>
  <a class="marca" href="/gestor"><img src="/assets/marca/01-logo/baishift-principal.svg" alt="Baishift" width="911" height="175"><span>Painel</span></a>
  <div class="topo-acoes" id="topo-acoes"></div>
</header>
<aside class="lateral" id="lateral">
  <nav id="nav" aria-label="Seções do painel"></nav>
  <div class="lateral-pe" id="eu"></div>
</aside>
<main class="tela" id="tela"></main>
<div class="toasts" id="toasts" aria-live="polite"></div>
<script src="/gestor/app.js"></script>
<script src="/gestor/tela-conta.js"></script>
<script src="/gestor/tela-usuarios.js"></script>
</body>
</html>
```

- [ ] **Step 2: `gestor/app.js`** (núcleo: DOM, API, avisos, navegação)

```js
/* Painel do gestor — núcleo da aplicação de página única (sem framework, sem inline por causa do CSP).
   Cada tela fica num arquivo próprio e se registra em G.TELAS[nome] = { titulo, admin?, render(host, resto) }.
   O menu lateral vem de G.MENU; item sem tela registrada aparece como "em breve". */
(function () {
  "use strict";

  /* ---------- DOM ---------- */
  function el(tag, attrs) {
    const e = document.createElement(tag);
    if (attrs) for (const k in attrs) {
      const v = attrs[k];
      if (k === "class") e.className = v;
      else if (k === "text") e.textContent = v;
      else if (k.startsWith("on")) e.addEventListener(k.slice(2), v);
      else if (v != null && v !== false) e.setAttribute(k, v === true ? "" : v);
    }
    for (let i = 2; i < arguments.length; i++) {
      const k = arguments[i];
      if (k == null || k === false) continue;
      if (Array.isArray(k)) k.forEach(x => x != null && e.append(x.nodeType ? x : document.createTextNode(String(x))));
      else e.append(k.nodeType ? k : document.createTextNode(String(k)));
    }
    return e;
  }
  const $ = (s, r) => (r || document).querySelector(s);

  /* ---------- API ---------- */
  async function api(metodo, rota, corpo) {
    const cab = { "X-Gestor": "1" };
    if (corpo !== undefined) cab["Content-Type"] = "application/json";
    let r;
    try { r = await fetch("/gestor/api/" + rota, { method: metodo, headers: cab, body: corpo === undefined ? undefined : JSON.stringify(corpo) }); }
    catch { throw new Error("sem conexão com o servidor"); }
    let d = {}; try { d = await r.json(); } catch { /* sem corpo */ }
    if (r.status === 401) { location.href = "/gestor"; throw new Error("sessão encerrada"); }
    if (!r.ok) {
      const e = new Error(d.erro || ("erro " + r.status)); e.campo = d.campo; e.status = r.status;
      if (d.trocarSenha) { G.estado.eu.trocarSenha = true; location.hash = "#/conta"; }
      throw e;
    }
    return d;
  }

  /* ---------- avisos ---------- */
  function toast(msg, tipo) {
    const t = el("div", { class: "toast" + (tipo ? " " + tipo : ""), text: msg });
    $("#toasts").append(t); setTimeout(() => t.remove(), 4500);
  }
  function confirmar(msg, o) {
    o = o || {};
    return new Promise(resolve => {
      let feito = false; const fim = v => { if (!feito) { feito = true; resolve(v); } };
      const dlg = el("dialog", { class: "dlg" }, o.titulo ? el("h2", { text: o.titulo }) : null, el("p", { text: msg }),
        el("div", { class: "acoes" },
          el("button", { class: "btn btn-2", type: "button", onclick: () => { fim(false); dlg.close(); } }, "Cancelar"),
          el("button", { class: "btn" + (o.perigo ? " btn-perigo" : ""), type: "button", onclick: () => { fim(true); dlg.close(); } }, o.botao || "Confirmar")));
      dlg.addEventListener("close", () => { fim(false); dlg.remove(); });
      document.body.append(dlg); dlg.showModal();
    });
  }
  /* diálogo com formulário: montar(form) preenche; aoSalvar(dados) pode lançar erro (fica na tela) */
  function dialogoForm(titulo, montar, aoSalvar, textoBotao) {
    return new Promise(resolve => {
      const msg = el("p", { class: "msg", role: "alert" });
      const form = el("form", { class: "dlg-form", novalidate: true });
      montar(form);
      const salvar = el("button", { class: "btn", type: "submit" }, textoBotao || "Salvar");
      const dlg = el("dialog", { class: "dlg" }, el("h2", { text: titulo }), form, msg,
        el("div", { class: "acoes" }, el("button", { class: "btn btn-2", type: "button", onclick: () => dlg.close() }, "Cancelar"), salvar));
      form.addEventListener("submit", async e => {
        e.preventDefault(); msg.textContent = ""; salvar.disabled = true;
        try { const r = await aoSalvar(Object.fromEntries(new FormData(form)), form); dlg.close(); resolve(r === undefined ? true : r); }
        catch (err) { msg.textContent = err.message; marcarErro(form, err.campo); }
        salvar.disabled = false;
      });
      dlg.addEventListener("close", () => { dlg.remove(); resolve(null); });
      document.body.append(dlg); dlg.showModal();
      const primeiro = form.querySelector("input,select,textarea"); if (primeiro) primeiro.focus();
    });
  }
  function marcarErro(form, campo) {
    form.querySelectorAll(".campo.erro").forEach(c => c.classList.remove("erro"));
    if (!campo) return;
    const i = form.querySelector('[name="' + campo + '"]'); if (i) { i.closest(".campo").classList.add("erro"); i.focus(); }
  }

  /* ---------- campos ---------- */
  function campo(rotulo, input, ajuda) {
    const c = el("label", { class: "campo" }, el("span", { text: rotulo }), input);
    if (ajuda) c.append(el("small", { class: "ajuda", text: ajuda }));
    return c;
  }
  function chave(rotulo, attrs, ajuda) {
    return el("label", { class: "chave" }, el("input", Object.assign({ type: "checkbox" }, attrs)), el("span", {}, rotulo, ajuda ? el("small", {}, " · " + ajuda) : null));
  }
  const data = iso => iso ? new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : "—";

  /* ---------- estado, menu, navegação ---------- */
  const G = window.G = {
    el, $, api, toast, confirmar, dialogoForm, marcarErro, campo, chave, data,
    estado: { eu: null, github: false, railway: false },
    TELAS: {},
    MENU: [
      { grupo: "Painel" }, { tela: "visao-geral", nome: "Visão geral" },
      { grupo: "Conteúdo" }, { tela: "inicio", nome: "Início" }, { tela: "diagnostico", nome: "Diagnóstico" }, { tela: "processos", nome: "Processos" },
      { tela: "dashboard", nome: "Dashboard" }, { tela: "modelos", nome: "Modelos" }, { tela: "perfil", nome: "Serve / não serve" }, { tela: "faq", nome: "FAQ" },
      { tela: "contato", nome: "Contato e rodapé" }, { tela: "produtos", nome: "Produtos" }, { tela: "site", nome: "Site" },
      { grupo: "Acesso" }, { tela: "usuarios", nome: "Usuários", admin: true }, { tela: "conta", nome: "Minha conta" }
    ],
    aoNavegar: []           /* funções chamadas a cada troca de tela (a barra de publicar usa) */
  };

  function padrao() { return ["visao-geral", "inicio", "conta"].find(t => G.TELAS[t]); }
  function montarMenu() {
    const nav = $("#nav"); nav.innerHTML = "";
    G.MENU.forEach(item => {
      if (item.grupo) return nav.append(el("div", { class: "grupo", text: item.grupo }));
      if (item.admin && !G.estado.eu.admin) return;
      const pronta = !!G.TELAS[item.tela];
      nav.append(el("a", { href: "#/" + item.tela, class: pronta ? "" : "breve", "data-tela": item.tela, "aria-disabled": pronta ? null : "true" }, item.nome));
    });
    const eu = G.estado.eu;
    $("#eu").innerHTML = ""; $("#eu").append(el("b", { text: eu.nome }), el("span", { text: eu.email }), el("br"), el("span", { class: "mono", text: eu.admin ? "administrador" : "editor" }));
  }
  function navegar() {
    const partes = location.hash.replace(/^#\/?/, "").split("/").filter(Boolean);
    let tela = partes[0] || padrao();
    if (G.estado.eu.trocarSenha) tela = "conta";
    const T = G.TELAS[tela];
    if (!T || (T.admin && !G.estado.eu.admin)) { location.hash = "#/" + padrao(); return; }
    document.querySelectorAll("#nav a").forEach(a => a.classList.toggle("ativo", a.dataset.tela === tela));
    $("#lateral").classList.remove("aberta"); $("#menu-btn").setAttribute("aria-expanded", "false");
    document.title = T.titulo + " · Painel Baishift";
    const host = $("#tela"); host.innerHTML = "";
    G.aoNavegar.forEach(fn => fn(tela));
    Promise.resolve().then(() => T.render(host, partes.slice(1))).catch(e => { host.append(el("p", { class: "vazio", text: e.message })); });
    window.scrollTo(0, 0);
  }
  G.navegar = navegar;

  async function iniciar() {
    const d = await api("GET", "eu");
    G.estado.eu = d.usuario; G.estado.github = d.github; G.estado.railway = d.railway;
    montarMenu();
    $("#menu-btn").addEventListener("click", () => { const ab = $("#lateral").classList.toggle("aberta"); $("#menu-btn").setAttribute("aria-expanded", ab ? "true" : "false"); });
    $("#topo-acoes").append(el("button", { class: "btn btn-2 btn-mini", type: "button", onclick: async () => { await api("POST", "sair", {}); location.href = "/gestor"; } }, "Sair"));
    if (G.estado.eu.trocarSenha && location.hash !== "#/conta") location.hash = "#/conta";
    window.addEventListener("hashchange", navegar);
    navegar();
  }
  document.addEventListener("DOMContentLoaded", () => { iniciar().catch(e => { $("#tela").append(el("p", { class: "vazio", text: e.message })); }); });
})();
```

- [ ] **Step 3: `gestor/tela-conta.js`**

```js
/* Tela "Minha conta": trocar a senha (obrigatória no primeiro acesso) e sair. */
(function () {
  "use strict";
  const { el, api, toast, campo } = G;

  G.TELAS.conta = { titulo: "Minha conta", render(host) {
    const eu = G.estado.eu;
    host.append(el("div", { class: "tela-cab" }, el("div", {}, el("h1", { text: "Minha conta" }), el("p", { text: eu.nome + " · " + eu.email + " · " + (eu.admin ? "administrador" : "editor") }))));
    if (eu.trocarSenha) host.append(el("div", { class: "aviso", text: "Primeiro acesso: troque a senha para liberar o painel. Use pelo menos 10 caracteres." }));

    const msg = el("p", { class: "msg", role: "alert" });
    const form = el("form", { novalidate: true },
      campo("Senha atual", el("input", { name: "atual", type: "password", autocomplete: "current-password", required: true })),
      el("div", { class: "linha" },
        campo("Nova senha", el("input", { name: "nova", type: "password", autocomplete: "new-password", required: true, minlength: 10 }), "Pelo menos 10 caracteres. Vale frase com espaços."),
        campo("Repita a nova senha", el("input", { name: "confirma", type: "password", autocomplete: "new-password", required: true }))),
      msg,
      el("div", { class: "acoes" }, el("button", { class: "btn", type: "submit" }, "Trocar a senha")));
    form.addEventListener("submit", async e => {
      e.preventDefault(); msg.textContent = "";
      const d = Object.fromEntries(new FormData(form));
      if (d.nova !== d.confirma) { msg.textContent = "as duas senhas novas não são iguais"; G.marcarErro(form, "confirma"); return; }
      try {
        await api("POST", "senha", { atual: d.atual, nova: d.nova });
        G.estado.eu.trocarSenha = false; toast("Senha trocada.", "ok");
        form.reset(); if (location.hash !== "#/conta") G.navegar(); else location.hash = "#/";
      } catch (err) { msg.textContent = err.message; G.marcarErro(form, err.campo); }
    });
    host.append(el("div", { class: "card" }, el("h2", { text: "Trocar a senha" }), form));
  } };
})();
```

- [ ] **Step 4: `gestor/tela-usuarios.js`**

```js
/* Tela "Usuários" (só administradores): lista, cria, edita, desativa e redefine senhas. */
(function () {
  "use strict";
  const { el, api, toast, campo, chave, dialogoForm, data } = G;

  function formUsuario(form, u) {
    form.append(
      campo("Nome", el("input", { name: "nome", type: "text", required: true, value: u ? u.nome : "" })),
      campo("E-mail", el("input", { name: "email", type: "email", required: true, autocomplete: "off", value: u ? u.email : "" })),
      campo(u ? "Nova senha provisória" : "Senha provisória", el("input", { name: "senha", type: "text", autocomplete: "off", minlength: 10 }),
        u ? "Deixe em branco para manter. Se preencher, a pessoa terá de trocar no próximo acesso." : "Pelo menos 10 caracteres. A pessoa troca no primeiro acesso."),
      chave("Administrador", { name: "admin", checked: u ? u.admin : false }, "também gerencia usuários"));
    if (u && !u.primeiro) form.append(chave("Ativo", { name: "ativo", checked: u.ativo }, "desligado, não entra mais"));
  }

  async function lista(host) {
    const { usuarios } = await api("GET", "usuarios");
    const linhas = usuarios.map(u => el("tr", {},
      el("td", {}, el("b", { text: u.nome }), el("br"), el("span", { class: "mono", text: u.email })),
      el("td", {}, el("span", { class: "selo" + (u.admin ? "" : " cinza"), text: u.admin ? "administrador" : "editor" })),
      el("td", {}, el("span", { class: "selo " + (u.ativo ? (u.trocarSenha ? "laranja" : "verde") : "vermelho"), text: u.ativo ? (u.trocarSenha ? "troca de senha pendente" : "ativo") : "desativado" })),
      el("td", { text: data(u.ultimoAcesso) }),
      el("td", {}, el("button", { class: "btn btn-2 btn-mini", type: "button", onclick: () => editar(u, host) }, "Editar"))));
    return el("div", { class: "card" }, el("h2", { text: "Quem tem acesso" }), el("div", { class: "tabela-scroll" }, el("table", { class: "tabela" },
      el("thead", {}, el("tr", {}, el("th", { text: "Usuário" }), el("th", { text: "Papel" }), el("th", { text: "Estado" }), el("th", { text: "Último acesso" }), el("th", {}))),
      el("tbody", {}, linhas))));
  }

  async function editar(u, host) {
    const r = await dialogoForm("Editar " + u.nome, form => formUsuario(form, u), async d => {
      const mudancas = { nome: d.nome, email: d.email, admin: "admin" in d };
      if (!u.primeiro) mudancas.ativo = "ativo" in d;
      if (d.senha) mudancas.senha = d.senha;
      await api("PATCH", "usuarios/" + u.id, mudancas);
    });
    if (r) { toast("Usuário atualizado.", "ok"); render(host); }
  }

  async function novo(host) {
    const r = await dialogoForm("Novo usuário", form => formUsuario(form, null), async d => {
      await api("POST", "usuarios", { nome: d.nome, email: d.email, senha: d.senha, admin: "admin" in d });
    }, "Criar");
    if (r) { toast("Usuário criado. Passe a senha provisória para a pessoa; ela troca no primeiro acesso.", "ok"); render(host); }
  }

  async function render(host) {
    host.innerHTML = "";
    host.append(el("div", { class: "tela-cab" }, el("div", {}, el("h1", { text: "Usuários" }), el("p", { text: "Quem entra no painel. Editores mudam o conteúdo; administradores também cuidam dos usuários." })),
      el("button", { class: "btn", type: "button", onclick: () => novo(host) }, "Novo usuário")));
    host.append(await lista(host));
  }

  G.TELAS.usuarios = { titulo: "Usuários", admin: true, render };
})();
```

- [ ] **Step 5: Servir os arquivos novos** — `lib/painel.js` já aceita qualquer `/gestor/<nome>.js` com sessão; conferir: `node --test test/servidor.test.js` → `# pass 7`

- [ ] **Step 6: Checagem no navegador (Chrome headless)**

```bash
rm -rf /tmp/dados-teste && DADOS_DIR=/tmp/dados-teste GESTOR_EMAIL=joaobaidarolimnet@gmail.com GESTOR_SENHA_INICIAL=12345689 PORT=8899 node server.js &
```

Abrir `http://localhost:8899/gestor`, entrar com o e-mail e `12345689`, ver a tela "Minha conta" com o aviso de primeiro acesso, trocar para uma senha de 10+ caracteres, ver o menu com "Usuários" e "Minha conta" ativos e os demais "em breve", criar um usuário editor, entrar com ele em outra janela anônima, ser obrigado a trocar a senha, ver que "Usuários" não aparece para ele.

- [ ] **Step 7: Commit** — `git add gestor && git commit -m "Painel: casca, navegação, minha conta e usuários"`

---

## Verificação final da fase

- [ ] `npm test` → `# fail 0`
- [ ] `git status` limpo depois de `npm run build`
- [ ] Fluxo do Step 6 da Task 5 feito no navegador, sem erro no console
