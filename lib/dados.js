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
