/* Um commit no GitHub pela Git Data API, sem dependências: blobs → árvore (com base na atual, remoções incluídas)
   → commit → atualização da referência. Se a referência mudou no meio (outra publicação), tenta mais uma vez. */
"use strict";

class ErroGitHub extends Error { constructor(msg, status) { super(msg); this.name = "ErroGitHub"; this.status = status; } }

async function chamada(fetchFn, token, url, metodo, corpo) {
  let r;
  try {
    r = await fetchFn(url, { method: metodo, headers: { "Authorization": "Bearer " + token, "Accept": "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28", "User-Agent": "baishift-painel", "Content-Type": "application/json" }, body: corpo ? JSON.stringify(corpo) : undefined });
  } catch (e) { throw new ErroGitHub("não consegui falar com o GitHub: " + e.message, 0); }
  if (r.status === 401) throw new ErroGitHub("token do GitHub inválido ou vencido — gere outro e atualize GITHUB_TOKEN no Railway", 401);
  if (r.status === 403) throw new ErroGitHub("o token do GitHub está sem permissão de escrita (Contents: read and write) no repositório", 403);
  if (r.status === 404) throw new ErroGitHub("não encontrei o repositório no GitHub — confira GITHUB_REPO e a permissão do token", 404);
  if (!r.ok) { let m = ""; try { m = (await r.json()).message; } catch { /* sem detalhe */ } throw new ErroGitHub("GitHub respondeu " + r.status + (m ? ": " + m : ""), r.status); }
  return r.json();
}

/* arquivos: [{ caminho, conteudo: Buffer }] ou [{ caminho, remover: true }] */
async function commit({ token, repo, branch = "main", mensagem, autor, arquivos, fetchFn = fetch }) {
  const base = "https://api.github.com/repos/" + repo;
  const api = (url, metodo, corpo) => chamada(fetchFn, token, base + url, metodo, corpo);
  for (let tentativa = 1; tentativa <= 2; tentativa++) {
    const ref = await api("/git/ref/heads/" + branch, "GET");
    const baseSha = ref.object.sha;
    const baseCommit = await api("/git/commits/" + baseSha, "GET");
    const blobs = await Promise.all(arquivos.filter(a => !a.remover).map(async a => ({ caminho: a.caminho, sha: (await api("/git/blobs", "POST", { content: a.conteudo.toString("base64"), encoding: "base64" })).sha })));
    const tree = arquivos.map(a => a.remover
      ? { path: a.caminho, mode: "100644", type: "blob", sha: null }
      : { path: a.caminho, mode: "100644", type: "blob", sha: blobs.find(b => b.caminho === a.caminho).sha });
    const arvore = await api("/git/trees", "POST", { base_tree: baseCommit.tree.sha, tree });
    const novo = await api("/git/commits", "POST", { message: mensagem, tree: arvore.sha, parents: [baseSha], author: Object.assign({ date: new Date().toISOString() }, autor) });
    try {
      await api("/git/refs/heads/" + branch, "PATCH", { sha: novo.sha, force: false });
      return { sha: novo.sha, url: "https://github.com/" + repo + "/commit/" + novo.sha };
    } catch (e) {
      if (e.status === 422 && tentativa === 1) continue;   /* alguém publicou no meio: refaz sobre a base nova */
      throw e;
    }
  }
  throw new ErroGitHub("não consegui atualizar a branch no GitHub", 409);
}

module.exports = { commit, ErroGitHub };
