/* Tela "Usuários" (só administradores): lista, cria, edita, desativa e redefine senhas. */
(function () {
  "use strict";
  const { el, api, toast, campo, chave, dialogoForm, data } = G;

  function formUsuario(form, u) {
    form.append(
      campo("Nome", el("input", { name: "nome", type: "text", required: true, value: u ? u.nome : "" })),
      campo("E-mail", el("input", { name: "email", type: "email", required: true, autocomplete: "off", value: u ? u.email : "" })),
      campo(u ? "Nova senha provisória" : "Senha provisória", el("input", { name: "senha", type: "text", autocomplete: "off", minlength: 10 }),
        u ? "Deixe em branco para manter. Se preencher, a pessoa terá de trocar no próximo acesso." : "Pelo menos 10 caracteres. A pessoa troca no primeiro acesso."),
      chave("Administrador", { name: "admin", checked: u ? u.admin : false }, "também gerencia usuários"));
    if (u && !u.primeiro) form.append(chave("Ativo", { name: "ativo", checked: u.ativo }, "desligado, não entra mais"));
  }

  async function lista(host) {
    const { usuarios } = await api("GET", "usuarios");
    const linhas = usuarios.map(u => el("tr", {},
      el("td", {}, el("b", { text: u.nome }), el("br"), el("span", { class: "mono", text: u.email })),
      el("td", {}, el("span", { class: "selo" + (u.admin ? "" : " cinza"), text: u.admin ? "administrador" : "editor" })),
      el("td", {}, el("span", { class: "selo " + (u.ativo ? (u.trocarSenha ? "laranja" : "verde") : "vermelho"), text: u.ativo ? (u.trocarSenha ? "troca de senha pendente" : "ativo") : "desativado" })),
      el("td", { text: data(u.ultimoAcesso) }),
      el("td", {}, el("button", { class: "btn btn-2 btn-mini", type: "button", onclick: () => editar(u, host) }, "Editar"))));
    return el("div", { class: "card" }, el("h2", { text: "Quem tem acesso" }), el("div", { class: "tabela-scroll" }, el("table", { class: "tabela" },
      el("thead", {}, el("tr", {}, el("th", { text: "Usuário" }), el("th", { text: "Papel" }), el("th", { text: "Estado" }), el("th", { text: "Último acesso" }), el("th", {}))),
      el("tbody", {}, linhas))));
  }

  async function editar(u, host) {
    const r = await dialogoForm("Editar " + u.nome, form => formUsuario(form, u), async d => {
      const mudancas = { nome: d.nome, email: d.email, admin: "admin" in d };
      if (!u.primeiro) mudancas.ativo = "ativo" in d;
      if (d.senha) mudancas.senha = d.senha;
      await api("PATCH", "usuarios/" + u.id, mudancas);
    });
    if (r) { toast("Usuário atualizado.", "ok"); render(host); }
  }

  async function novo(host) {
    const r = await dialogoForm("Novo usuário", form => formUsuario(form, null), async d => {
      await api("POST", "usuarios", { nome: d.nome, email: d.email, senha: d.senha, admin: "admin" in d });
    }, "Criar");
    if (r) { toast("Usuário criado. Passe a senha provisória para a pessoa; ela troca no primeiro acesso.", "ok"); render(host); }
  }

  async function render(host) {
    host.innerHTML = "";
    host.append(el("div", { class: "tela-cab" }, el("div", {}, el("h1", { text: "Usuários" }), el("p", { text: "Quem entra no painel. Editores mudam o conteúdo; administradores também cuidam dos usuários." })),
      el("button", { class: "btn", type: "button", onclick: () => novo(host) }, "Novo usuário")));
    host.append(await lista(host));
  }

  G.TELAS.usuarios = { titulo: "Usuários", admin: true, render };
})();
