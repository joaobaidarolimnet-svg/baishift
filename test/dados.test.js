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
