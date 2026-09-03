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
