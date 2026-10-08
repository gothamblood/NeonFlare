// Compatibilité des anciennes ancres de grc/continuite.html. BIA, « Faire un
// plan » et « Tests & exercices » sont désormais des onglets de la fiche
// (éléments `register` de grc-fiches-continuite.js) : grc-fiches.js gère
// #fiche-<id>, #bia / #tests / #faire-plan (id de la section déplacée) et
// #<id de plan ou de BIA> au chargement. Restent : l'ancienne ancre
// #registre (registre de plans), les changements d'ancre en page et grcContinuiteShowTab(), appelée par
// les registres pour afficher leur onglet. Fichier externe (CSP 'self').
(function () {
  // Onglet « Tests & exercices » : la fiche Programme + Rapports d'exercice
  // (grc-fiches-continuite-sub.js), autrefois sur la sous-page supprimée.
  const testsFiche = document.getElementById("grcContTestsFiche");
  if (testsFiche && typeof grcFichesRenderEmbedded === "function") grcFichesRenderEmbedded(testsFiche, "continuite-tests-exercices");
  window.grcContinuiteShowTab = function (name) {
    if (typeof grcFichesShow === "function") grcFichesShow(name);
  };
  function legacy() {
    const h = (location.hash || "").replace(/^#/, "");
    if (h === "registre") window.grcContinuiteShowTab("faire-plan");
    // Ancres des anciens onglets : au chargement grc-fiches.js les résout
    // (section déplacée), mais pas sur simple changement d'ancre.
    else if (h === "faire-plan" || h === "bia" || h === "tests") window.grcContinuiteShowTab(h);
    // #<id d'un processus BIA> (les <li> BIA ne sont pas reconnus par
    // _grcFicheHashTarget) : onglet BIA ; grc-bia.js déplie l'entrée.
    else if (h && typeof getGrcBia === "function" && getGrcBia().some((p) => p.id === h)) window.grcContinuiteShowTab("bia");
  }
  window.addEventListener("hashchange", legacy);
  legacy();
})();
