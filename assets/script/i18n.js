/* Site-wide chrome translations (menu, buttons, titles). Page content
   itself stays untranslated for now -- see settings.html's language
   card and TODO.txt for the scoping decision behind that. */
const I18N_DICT = {
  "nav.dashboard": { fr: "Tableau de bord", en: "Dashboard" },
  "nav.network": { fr: "Réseau", en: "Network" },
  "nav.tools": { fr: "Outils", en: "Tools" },
  "nav.website": { fr: "Site web", en: "Website" },
  "nav.grc": { fr: "GRC", en: "GRC" },
  "nav.grcFull": { fr: "Gouvernance, Risques et Conformité", en: "Governance, Risk and Compliance" },
  "nav.networkSecurity": { fr: "Sécurité réseau", en: "Network Security" },
  "nav.apiSecurity": { fr: "Sécurité API", en: "API Security" },
  "nav.webappSecurity": { fr: "Sécurité WebApp", en: "WebApp Security" },
  "nav.databaseSecurity": { fr: "Sécurité base de données", en: "Database Security" },
  "nav.more": { fr: "Plus", en: "More" },
  "nav.topology": { fr: "Topologie", en: "Topology" },
  "nav.settings": { fr: "Paramètres", en: "Settings" },
  "nav.about": { fr: "À propos", en: "About" },
  "sidebar.tagline": { fr: "La porte de l'ennemi est en bas", en: "The enemy's gate is down" },

  "settings.themeTitle": { fr: "Thème", en: "Theme Settings" },
  "settings.currentTheme": { fr: "Thème actuel :", en: "Current Theme:" },
  "settings.themeCustom": { fr: "Personnalisé", en: "Custom" },
  "settings.themeCustomHint": {
    fr: "Choisis ta propre couleur d'accent (boutons, bordures, liens actifs).",
    en: "Pick your own accent colour (buttons, borders, active links).",
  },
  "settings.visibilityTitle": { fr: "Pages visibles", en: "Visible Pages" },
  "settings.visibilityDesc": {
    fr: "Contrôle l'affichage des liens dans le menu latéral. Attention : ceci cache seulement le lien dans l'interface — ça ne bloque pas l'accès direct à la page.",
    en: "Controls which links show up in the sidebar menu. Note: this only hides the link in the UI — it doesn't block direct access to the page."
  },
  "settings.grcChecklistTitle": { fr: "Checklist GRC", en: "GRC Checklist" },
  "settings.grcChecklistDesc": {
    fr: "Contrôle l'affichage des pourcentages de couverture sur les pages GRC (barres de progression, badges sur les cartes).",
    en: "Controls whether coverage percentages show up on the GRC pages (progress bars, card badges)."
  },
  "settings.grcShowPercentage": { fr: "Afficher les pourcentages", en: "Show percentages" },
  "settings.grcAuthorLabel": { fr: "Ton nom (traçabilité GRC)", en: "Your name (GRC change-log)" },
  "settings.grcAuthorDesc": {
    fr: "Attaché à chaque case cochée et note GRC (horodatage + ce nom) -- un texte libre, pas un compte vérifié : utile pour un journal de modifications entre toi et une petite équipe qui s'échange des exports, pas une piste d'audit inviolable. Vide par défaut ici ? Renseigne config/grc-author.js pour que ton nom soit déjà rempli sur un nouveau navigateur, sans repasser par Settings.",
    en: "Attached to every checked GRC item and note (timestamp + this name) -- free text, not a verified account: useful as a change-log between you and a small team exchanging exports, not a tamper-proof audit trail. Empty here by default? Fill in config/grc-author.js so your name is already set on a fresh browser, without going through Settings first."
  },
  "settings.langTitle": { fr: "Langue", en: "Language" },
  "settings.currentLang": { fr: "Langue actuelle :", en: "Current Language:" },
  "settings.langDesc": {
    fr: "Traduit l'interface commune du site (menu, boutons, titres). Le contenu détaillé de chaque page reste pour l'instant dans sa langue d'origine.",
    en: "Translates the site's shared interface (menu, buttons, titles). Each page's detailed content currently stays in its original language."
  },
  "settings.dashboardSectionsTitle": { fr: "Sections du Dashboard", en: "Dashboard Sections" },
  "settings.dashboardSectionsDesc": {
    fr: "Contrôle l'affichage de chaque section sur la page Dashboard.",
    en: "Controls which sections show up on the Dashboard page."
  },
  "settings.shellsTitle": { fr: "Shells", en: "Shells" },
  "settings.shellOpacity": { fr: "Opacité :", en: "Opacity:" },
  "settings.shellOpacityDesc": {
    fr: "Contrôle la transparence des fenêtres de terminal dans le Dashboard, pour laisser transparaître le fond derrière elles.",
    en: "Controls the transparency of terminal windows in the Dashboard, letting the background show through behind them."
  },

  "onboarding.settingsCard.title": { fr: "Assistant de configuration", en: "Configuration assistant" },
  "onboarding.settingsCard.desc": {
    fr: "Revoir le tour rapide des sections Réseau, Outils et GRC, avec des liens directs vers leur configuration.",
    en: "Replay the quick tour of the Network, Tools and GRC sections, with direct links to their configuration."
  },
  "onboarding.settingsCard.relaunch": { fr: "Relancer l'assistant de configuration", en: "Relaunch the configuration assistant" },

  "onboarding.close": { fr: "Fermer", en: "Close" },
  "onboarding.skip": { fr: "Passer la visite", en: "Skip the tour" },
  "onboarding.prev": { fr: "← Précédent", en: "← Previous" },
  "onboarding.next": { fr: "Suivant →", en: "Next →" },
  "onboarding.finish": { fr: "Terminer", en: "Finish" },

  "onboarding.welcome.title": { fr: "Bienvenue sur NeonFlare", en: "Welcome to NeonFlare" },
  "onboarding.welcome.text": {
    fr: "Ce dashboard réunit surveillance réseau, référence d'outils pentest (terminaux embarqués, copier-coller de commande) et suivi GRC. Cette visite pointe rapidement les sections clés -- passable à tout moment, relançable depuis Settings.",
    en: "This dashboard brings together network monitoring, a pentest tool reference (embedded terminals, copy-to-shell), and GRC tracking. This tour quickly points out the key sections -- skippable anytime, relaunchable from Settings."
  },
  "onboarding.network.text": {
    fr: "Les nœuds de ton infrastructure. Vide par défaut -- ajoute les tiens depuis Settings.",
    en: "Your infrastructure's nodes. Empty by default -- add your own from Settings."
  },
  "onboarding.tools.text": {
    fr: "Référence de commandes pentest par catégorie, avec copier-coller direct vers un terminal embarqué.",
    en: "A categorized pentest command reference, with direct copy-to-shell into an embedded terminal."
  },
  "onboarding.grcPanel.title": { fr: "Couverture GRC", en: "GRC coverage" },
  "onboarding.grcPanel.text": {
    fr: "Suivi Gouvernance, Risques & Conformité, déjà pré-rempli avec une checklist ISO 27001 / NIST CSF par défaut.",
    en: "Governance, Risk & Compliance tracking, already pre-filled with a default ISO 27001 / NIST CSF checklist."
  },
  "onboarding.grcHub.text": {
    fr: "20 domaines détaillés (gouvernance, risques, IAM, cloud, DevSecOps...), chacun avec sa propre checklist exportable.",
    en: "20 detailed domains (governance, risk, IAM, cloud, DevSecOps...), each with its own exportable checklist."
  },
  "onboarding.pentest.title": { fr: "Findings de pentest", en: "Pentest findings" },
  "onboarding.pentest.text": {
    fr: "Tracker de findings par engagement -- score CVSS, statut, preuves, et génération de rapport Word/PDF. Distinct du panneau Outils du Dashboard.",
    en: "A findings tracker per engagement -- CVSS score, status, evidence, and Word/PDF report generation. Distinct from the Dashboard's Tools panel."
  },
  "onboarding.settingsStep.title": { fr: "Tout se configure depuis Settings", en: "Everything is configured from Settings" },
  "onboarding.settingsStep.text": {
    fr: "Thème, langue, pages visibles, plusieurs dashboards indépendants, et les 4 registres Network / Tools / Website / Topology -- ajout, édition, export JSON, réinitialisation. Rien à éditer à la main.",
    en: "Theme, language, visible pages, several independent dashboards, and the 4 Network / Tools / Website / Topology registries -- add, edit, export JSON, reset. Nothing to hand-edit."
  },
  "onboarding.done.title": { fr: "C'est parti", en: "You're all set" },
  "onboarding.done.text": {
    fr: "Cette visite reste accessible à tout moment depuis Settings (\"Relancer l'assistant de configuration\").",
    en: "This tour stays available anytime from Settings (\"Relaunch the configuration assistant\")."
  }
};

function applyI18n(lang) {
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const entry = I18N_DICT[el.getAttribute("data-i18n")];
    if (entry && entry[lang]) {
      el.textContent = entry[lang];
    }
  });
}

function getSavedLang() {
  return localStorage.getItem("/settings.html/lang") || "fr";
}
