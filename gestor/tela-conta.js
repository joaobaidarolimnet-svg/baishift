/* Tela "Minha conta": trocar a senha (obrigatória no primeiro acesso) e sair. */
(function () {
  "use strict";
  const { el, api, toast, campo } = G;

  G.TELAS.conta = { titulo: "Minha conta", render(host) {
    const eu = G.estado.eu;
    host.append(el("div", { class: "tela-cab" }, el("div", {}, el("h1", { text: "Minha conta" }), el("p", { text: eu.nome + " · " + eu.email + " · " + (eu.admin ? "administrador" : "editor") }))));
    if (eu.trocarSenha) host.append(el("div", { class: "aviso", text: "Primeiro acesso: troque a senha para liberar o painel. Use pelo menos 10 caracteres." }));

    const msg = el("p", { class: "msg", role: "alert" });
    const form = el("form", { novalidate: true },
      campo("Senha atual", el("input", { name: "atual", type: "password", autocomplete: "current-password", required: true })),
      el("div", { class: "linha" },
        campo("Nova senha", el("input", { name: "nova", type: "password", autocomplete: "new-password", required: true, minlength: 10 }), "Pelo menos 10 caracteres. Vale frase com espaços."),
        campo("Repita a nova senha", el("input", { name: "confirma", type: "password", autocomplete: "new-password", required: true }))),
      msg,
      el("div", { class: "acoes" }, el("button", { class: "btn", type: "submit" }, "Trocar a senha")));
    form.addEventListener("submit", async e => {
      e.preventDefault(); msg.textContent = "";
      const d = Object.fromEntries(new FormData(form));
      if (d.nova !== d.confirma) { msg.textContent = "as duas senhas novas não são iguais"; G.marcarErro(form, "confirma"); return; }
      try {
        await api("POST", "senha", { atual: d.atual, nova: d.nova });
        G.estado.eu.trocarSenha = false; toast("Senha trocada.", "ok");
        form.reset(); if (location.hash !== "#/conta") G.navegar(); else location.hash = "#/";
      } catch (err) { msg.textContent = err.message; G.marcarErro(form, err.campo); }
    });
    host.append(el("div", { class: "card" }, el("h2", { text: "Trocar a senha" }), form));
  } };
})();
