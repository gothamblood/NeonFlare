// Hub GRC : démarche, À faire, chaîne, recherche (grc-hub.js) -- fichier
// externe pour la CSP script-src 'self'. Charge après grc-hub.js et
// inline/grc-index.js (les cartes doivent exister).
grcHubInit();
document.addEventListener("hub-modal-closed", grcHubInit);
