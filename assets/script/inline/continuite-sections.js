// Rend les sections BIA et Tests & exercices remontées sur grc/continuite.html
// (spec/grc-continuity-plans-register/ décision C) + rafraîchit le cache de
// toutes les checklists de continuité dans la langue courante (export).
// Fichier externe pour la CSP script-src 'self'. Doit charger après
// grc-continuite-checklists.js et grc-checklist.js.
grcContRenderSectionChecklist(document.getElementById("grcContBiaChecklist"), "bia");
grcContRenderSectionChecklist(document.getElementById("grcContTestsChecklist"), "tests-exercices");
grcContRepersistAll();
