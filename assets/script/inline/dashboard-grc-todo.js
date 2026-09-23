// Panneau « À faire » GRC du tableau de bord (grc-todo.js, UX U6) --
// fichier externe pour la CSP script-src 'self'.
(function () {
  const host = document.getElementById("grc-dashboard-todo");
  if (host && typeof grcTodoRender === "function") grcTodoRender(host, { max: 8 });
})();
