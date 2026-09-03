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
