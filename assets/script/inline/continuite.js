// Was an inline <script> on grc/continuite.html -- externalized for CSP
// script-src (PlanDurcissement-Securite.txt P1). Must load after
// its registry's own script(s).
initGrcContinuityRegistry();
// Aide « Choisir le bon plan en quatre questions » (note de cours).
if (typeof renderGrcContPlanChooser === "function") renderGrcContPlanChooser();
// Registre BIA par processus (spec/grc-bia-register/ BP2).
if (typeof initGrcBiaRegistry === "function") initGrcBiaRegistry();
