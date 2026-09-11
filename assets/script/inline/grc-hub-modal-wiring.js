// Was 3 onclick="" attributes on the GRC hub pages (grc/index.html +
// the 4 grc/securite/*/index.html sub-hubs), identical on all 5 --
// externalized/converted to addEventListener for CSP script-src
// (PlanDurcissement-Securite.txt P1.2). closeModal() is defined in
// assets/script/hub-modal.js, loaded before this file on every hub page.
document.getElementById("overlay").addEventListener("click", closeModal);
document.getElementById("modal-grc").addEventListener("click", closeModal);
document.querySelector("#modal-grc .modal-box").addEventListener("click", (e) => e.stopPropagation());
