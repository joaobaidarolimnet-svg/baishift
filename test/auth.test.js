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
