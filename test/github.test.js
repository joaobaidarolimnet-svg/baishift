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
