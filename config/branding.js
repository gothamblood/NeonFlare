/* Identité affichée par l'interface -- pour s'approprier NeonFlare sans
   toucher au code. Plain <script src>, fonctionne en file:// comme partout.

   Chaque champ est optionnel : un champ absent ou vide garde le texte
   d'origine (GothamBlood). Les données elles-mêmes (nœuds réseau,
   topologie, liens About) restent dans reseau.js / topology.js / about.js.

   - name              : signature en bas à droite de toutes les pages
   - icon              : petit symbole devant la signature (emoji ou 1-2 caractères)
   - logo              : icône de l'onglet du navigateur, chemin depuis la racine du site
   - pageTitle         : titre de l'onglet du navigateur
   - networkStatusTitle: en-tête du compteur de nœuds (Dashboard)
   - topologySubtitle  : sous-titre de la page Topologie
   - linksTitle        : titre de la fenêtre de liens (About)
   - techMenuLabel     : libellé du menu « … Tech » (sous-menu Plus) */
const brandingConfig = {
  "name": "GothamBlood",
  "icon": "🐉",
  "logo": "assets/images/dragon4_logo.png",
  "pageTitle": "NeonFlare: Rise of GothamBlood",
  "networkStatusTitle": "Gotham Network — Status",
  "topologySubtitle": "GothamBlood environment",
  "linksTitle": "Professional Links - GothamBlood",
  "techMenuLabel": "GothamBlood Tech"
};
