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
