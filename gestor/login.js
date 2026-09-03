/* Tela de entrada do painel: manda e-mail e senha para /gestor/api/entrar e abre o painel. */
(function () {
  "use strict";
  var form = document.getElementById("entrar"), msg = document.getElementById("msg"), botao = document.getElementById("botao");
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    msg.textContent = ""; botao.disabled = true; botao.textContent = "Entrando…";
    var d = new FormData(form);
    fetch("/gestor/api/entrar", { method: "POST", headers: { "Content-Type": "application/json", "X-Gestor": "1" },
      body: JSON.stringify({ email: d.get("email"), senha: d.get("senha") }) })
      .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
      .then(function (r) {
        if (!r.ok) { msg.textContent = r.j.erro || "não foi possível entrar"; botao.disabled = false; botao.textContent = "Entrar"; return; }
        location.href = "/gestor" + (r.j.trocarSenha ? "#/conta" : "");
      })
      .catch(function () { msg.textContent = "sem conexão com o servidor"; botao.disabled = false; botao.textContent = "Entrar"; });
  });
})();
