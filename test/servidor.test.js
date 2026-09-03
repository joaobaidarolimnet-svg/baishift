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
  const r = await fetch(base + caminho, { method: metodo, headers: cab, body: corpo === undefined ? undefined : (typeof corpo === "string" || Buffer.isBuffer(corpo) ? corpo : JSON.stringify(corpo)), redirect: "manual" });
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
  for (const p of ["/lib/auth.js", "/gestor/index.html", "/gestor/app.js", "/conteudo/site.json", "/dados/usuarios.json", "/test/auth.test.js"]) assert.notEqual((await pede("GET", p)).status, 200, p);
  const robots = (await pede("GET", "/robots.txt")).texto;
  assert.match(robots, /Disallow: \/gestor/); assert.match(robots, /Disallow: \/api\//);
});

test("/gestor sem sessão mostra o login; API e scripts exigem sessão", async () => {
  const r = await pede("GET", "/gestor");
  assert.equal(r.status, 200); assert.match(r.texto, /id="entrar"/); assert.match(r.texto, /noindex/);
  assert.equal((await pede("GET", "/gestor/gestor.css")).status, 200);
  assert.equal((await pede("GET", "/gestor/login.js")).status, 200);
  assert.equal((await pede("GET", "/gestor/app.js")).status, 401);
  assert.equal((await pede("GET", "/gestor/index.html")).status, 404);
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

test("cinco erros bloqueiam o IP por 15 minutos", async () => {
  for (let i = 0; i < 5; i++) await pede("POST", "/gestor/api/entrar", { corpo: { email: "ninguem@baishift.com.br", senha: "x" } });
  const r = await pede("POST", "/gestor/api/entrar", { corpo: { email: "teste@baishift.com.br", senha: "senha-nova-do-dono" } });
  assert.equal(r.status, 429);
});
