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
