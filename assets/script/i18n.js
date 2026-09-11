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
  "settings.sidebarTaglineLabel": { fr: "Texte du bandeau latéral", en: "Sidebar tagline" },
  "settings.sidebarTaglineDesc": {
    fr: "Phrase affichée verticalement sur le bord de la barre latérale, une par langue. Laisse un champ vide pour garder le texte d'origine dans cette langue -- le bandeau bascule automatiquement vers celle actuellement sélectionnée ci-dessus.",
    en: "Phrase shown vertically along the sidebar's edge, one per language. Leave a field empty to keep the original text in that language -- the banner automatically follows whichever language is currently selected above."
  },
  "settings.langName.fr": { fr: "Français", en: "French" },
  "settings.langName.en": { fr: "English", en: "English" },

  "settings.background.desc": {
    fr: "Fond d'écran par défaut, appliqué à toute page qui n'a pas son propre choix dans \"Effets par page\" ci-dessous (ou, pour le Dashboard, dans Settings → Interface). Remets sur \"Aucun\" pour revenir au fond propre à chaque page.",
    en: "Default background, applied to any page that has no choice of its own in \"Page effects\" below (or, for the Dashboard, in Settings → Interface). Set back to \"None\" to return to each page's own background."
  },
  "settings.background.globalLabel": { fr: "Fond d'écran global", en: "Global background" },
  "settings.background.none": { fr: "Aucun (fond propre à chaque page)", en: "None (each page's own background)" },

  "settings.pageEffects.title": { fr: "Effets par page", en: "Page effects" },
  "settings.pageEffects.desc": {
    fr: "Fond d'écran, <strong>Vecteurs</strong> (points animés reliés par des lignes), <strong>Étoiles</strong> (particules flottantes) et, pour le Dashboard, <strong>Scintillement du fond</strong> (variation de luminosité/saturation du fond d'écran), page par page -- un fond choisi ici passe devant le fond global ci-dessus. Par défaut, Vecteurs/Étoiles restent sur \"Défaut\" (actif seulement sur les pages qui les avaient déjà) et Scintillement du fond reste sur \"Défaut\" (désactivé partout) ; force \"Activé\" ou \"Désactivé\" pour changer ça sur une page donnée.",
    en: "Background, <strong>Vectors</strong> (animated dots linked by lines), <strong>Stars</strong> (floating particles), and, for the Dashboard, <strong>Background shimmer</strong> (brightness/saturation variation on the background), page by page -- a background chosen here shows in front of the global one above. By default, Vectors/Stars stay on \"Default\" (active only on pages that already had them) and Background shimmer stays on \"Default\" (off everywhere); force \"On\" or \"Off\" to change that on a given page."
  },
  "settings.pageEffects.fieldBg": { fr: "Fond", en: "Background" },
  "settings.pageEffects.fieldVectors": { fr: "Vecteurs", en: "Vectors" },
  "settings.pageEffects.fieldStars": { fr: "Étoiles", en: "Stars" },
  "settings.pageEffects.fieldGlow": { fr: "Scintillement du fond", en: "Background shimmer" },
  "settings.pageEffects.bgDefault": { fr: "Défaut (fond global ou propre à la page)", en: "Default (global or page's own background)" },
  "settings.pageEffects.effDefault": { fr: "Défaut", en: "Default" },
  "settings.pageEffects.effOn": { fr: "Activé", en: "On" },
  "settings.pageEffects.effOff": { fr: "Désactivé", en: "Off" },
  "settings.pageEffects.resetConfirm": {
    fr: "Rétablir Effets par page par défaut ? Tous les fonds/vecteurs/étoiles/scintillements choisis page par page seront perdus.",
    en: "Restore Page effects to default? All the backgrounds/vectors/stars/shimmer settings chosen page by page will be lost."
  },
  "settings.pageEffects.groupMain": { fr: "Pages principales", en: "Main pages" },
  "settings.pageEffects.groupOther": { fr: "Autres", en: "Other" },
  "settings.pageEffects.customCategories": { fr: "Catégories personnalisées", en: "Custom categories" },
  "settings.pageEffects.dashboardLabel": {
    fr: "Dashboard (vecteurs/étoiles -- fond par dashboard, voir Interface)",
    en: "Dashboard (vectors/stars -- background is per-dashboard, see Interface)"
  },
  "settings.pageEffects.grcApi": { fr: "GRC -- Sécurité API", en: "GRC -- API Security" },
  "settings.pageEffects.grcDatabase": { fr: "GRC -- Sécurité Base de données", en: "GRC -- Database Security" },
  "settings.pageEffects.grcReseau": { fr: "GRC -- Sécurité Réseau", en: "GRC -- Network Security" },
  "settings.pageEffects.grcWebapp": { fr: "GRC -- Sécurité WebApp", en: "GRC -- WebApp Security" },

  "settings.wallpaper.forestDefault": { fr: "Kali -- Forêt (par défaut)", en: "Kali -- Forest (default)" },
  "settings.wallpaper.city": { fr: "Kali -- Ville", en: "Kali -- City" },
  "settings.wallpaper.kali": { fr: "Kali", en: "Kali" },
  "settings.wallpaper.kaliSharp": { fr: "Kali (nette)", en: "Kali (sharp)" },
  "settings.wallpaper.atlantis": { fr: "Atlantis", en: "Atlantis" },
  "settings.wallpaper.atlantisSharp": { fr: "Atlantis (nette)", en: "Atlantis (sharp)" },
  "settings.wallpaper.atlantis2Sharp": { fr: "Atlantis 2 (nette)", en: "Atlantis 2 (sharp)" },
  "settings.wallpaper.hacker": { fr: "Hacker", en: "Hacker" },
  "settings.wallpaper.cyberpunk": { fr: "Internet cyberpunk", en: "Cyberpunk internet" },
  "settings.wallpaper.neonNetwork": { fr: "Architecture réseau néon", en: "Neon network architecture" },

  "settings.vault.title": { fr: "Chiffrement", en: "Encryption" },
  "settings.vault.disabledDesc": {
    fr: "Désactivé dans la configuration (config/encryption.js). Passe \"enabled\" à true dans ce fichier pour faire apparaître ici la mise en place d'un coffre chiffré pour Network, Topology et GRC.",
    en: "Disabled in the configuration (config/encryption.js). Set \"enabled\" to true in that file to make the encrypted vault setup for Network, Topology and GRC appear here."
  },
  "settings.vault.setupDesc": {
    fr: "Chiffre les données Network, Topology et GRC (adresses, topologie, cases cochées/notes) directement dans ce navigateur avec un mot de passe que toi seul connais -- protège en cas de vol/perte de l'appareil ou d'accès physique, pas contre une session déjà compromise en direct (XSS, malware). Rien n'est jamais envoyé nulle part. Vérifié sur Chromium et Firefox (versions stables), en http:// comme en file://.",
    en: "Encrypts the Network, Topology and GRC data (addresses, topology, checked items/notes) directly in this browser with a passphrase only you know -- protects against device theft/loss or physical access, not against a session already compromised live (XSS, malware). Nothing is ever sent anywhere. Verified on Chromium and Firefox (stable releases), over http:// as well as file://."
  },
  "settings.vault.setupWarning": {
    fr: "⚠️ Mot de passe oublié = données perdues, sans recours : aucun compte, aucune récupération possible. NeonFlare ne le stocke nulle part -- mais si tu veux qu'il ne vive que dans ta tête, refuse toute proposition d'enregistrement du navigateur ou d'un gestionnaire de mots de passe.",
    en: "⚠️ Forgotten passphrase = lost data, with no recourse: no account, no recovery possible. NeonFlare never stores it anywhere -- but if you want it to live only in your head, decline any offer from your browser or a password manager to save it."
  },
  "settings.vault.fieldLevel": { fr: "Niveau", en: "Level" },
  "settings.vault.fieldPassword": { fr: "Mot de passe", en: "Password" },
  "settings.vault.fieldConfirmPassword": { fr: "Confirmer le mot de passe", en: "Confirm password" },
  "settings.vault.enableBtn": { fr: "Activer le chiffrement", en: "Enable encryption" },
  "settings.vault.errPasswordTooShort": { fr: "Le mot de passe doit faire au moins 8 caractères.", en: "The password must be at least 8 characters long." },
  "settings.vault.errPasswordMismatch": { fr: "Les deux mots de passe ne correspondent pas.", en: "The two passwords don't match." },
  "settings.vault.errQuotaExceeded": {
    fr: "Stockage plein -- impossible d'activer le chiffrement (il occupe plus de place que les données en clair). Libère de l'espace et réessaie. Rien n'a été modifié.",
    en: "Storage full -- can't enable encryption (it takes up more space than the plaintext data). Free up some space and try again. Nothing was changed."
  },
  "settings.vault.errSetupFailed": {
    fr: "Échec de l'activation du chiffrement -- rien n'a été modifié. ({msg})",
    en: "Failed to enable encryption -- nothing was changed. ({msg})"
  },
  "settings.vault.unlockedStatus": { fr: "🔓 Coffre déverrouillé -- niveau {level}.", en: "🔓 Vault unlocked -- {level} level." },
  "settings.vault.lockBtn": { fr: "Verrouiller", en: "Lock" },
  "settings.vault.disableDesc": {
    fr: "Désactiver retire le chiffrement -- Network, Topology et GRC repassent en clair dans ce navigateur.",
    en: "Disabling removes encryption -- Network, Topology and GRC go back to plaintext in this browser."
  },
  "settings.vault.disableBtn": { fr: "Désactiver le chiffrement", en: "Disable encryption" },
  "settings.vault.errWrongPassword": { fr: "Mot de passe incorrect.", en: "Incorrect password." },
  "settings.vault.levelLight": { fr: "Léger", en: "Light" },
  "settings.vault.levelStandard": { fr: "Standard", en: "Standard" },
  "settings.vault.levelStrong": { fr: "Renforcé", en: "Strong" },

  /* Settings' own left-hand nav labels (.settings-nav-item) -- were
     plain hardcoded French, missed when the rest of the page's static
     chrome was i18n'ized (reported 2026-09-11, screenshot showed every
     other Language-tab label switching to English except these). */
  "settings.nav.apparence": { fr: "Apparence", en: "Appearance" },
  "settings.nav.langue": { fr: "Langue", en: "Language" },
  "settings.nav.assistant": { fr: "Assistant & réinitialisation", en: "Assistant & reset" },
  "settings.nav.interface": { fr: "Interface", en: "Interface" },
  "settings.nav.grc": { fr: "GRC & Shells", en: "GRC & Shells" },
  "settings.nav.registres": { fr: "Registres", en: "Registries" },
  "settings.nav.generique": { fr: "Générique", en: "Generic" },
  "settings.nav.autres": { fr: "Autres", en: "Other" },
  "settings.nav.securite": { fr: "Sécurité", en: "Security" },
  "settings.nav.version": { fr: "Version", en: "Version" },

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

  /* Settings > Registres -- the 6 Config Network/Tools/Website/DevSecOps/
     Topology/About cards (assets/script/inline/settings.js), built in JS
     with grcT() rather than data-i18n (the shared config-io.js row does
     use data-i18n, since it's static markup). Were 100% hardcoded French
     until 2026-09-11 -- reported as a bug (language switch had no effect
     there), fixed by wiring every user-facing string through here.
     settings.cfgIo.* / settings.cfgCommon.* / settings.cfgField.* are
     reused across several cards on purpose -- see each card's own
     comment for which ones. Card h1 titles ("Config Network" etc.) are
     left as plain hardcoded text, identical in both languages already. */
  "settings.cfgIo.export": { fr: "⬇ Exporter JSON", en: "⬇ Export JSON" },
  "settings.cfgIo.import": { fr: "⬆ Importer JSON", en: "⬆ Import JSON" },
  "settings.cfgIo.reset": { fr: "↺ Rétablir par défaut", en: "↺ Restore default" },
  "settings.cfgIo.resetConfirmDefault": {
    fr: "Rétablir la configuration par défaut ? Cette action est irréversible.",
    en: "Restore the default configuration? This action is irreversible."
  },

  "settings.cfgCommon.rename": { fr: "Renommer", en: "Rename" },
  "settings.cfgCommon.addCategory": { fr: "+ Ajouter une catégorie", en: "+ Add a category" },
  "settings.cfgCommon.formTitleAddCategory": { fr: "Ajouter une catégorie", en: "Add a category" },
  "settings.cfgCommon.formTitleEditCategory": { fr: "Modifier la catégorie", en: "Edit category" },
  "settings.cfgCommon.deleteThisCategory": { fr: "Supprimer cette catégorie", en: "Delete this category" },
  "settings.cfgCommon.confirmDeleteCategory": {
    fr: "Supprimer la catégorie \"{name}\" ?", en: "Delete the \"{name}\" category?"
  },

  "settings.cfgField.title": { fr: "Titre", en: "Title" },
  "settings.cfgField.sub": { fr: "Sous-titre", en: "Subtitle" },
  "settings.cfgField.name": { fr: "Nom", en: "Name" },
  "settings.cfgField.url": { fr: "URL", en: "URL" },
  "settings.cfgField.description": { fr: "Description", en: "Description" },
  "settings.cfgField.icon": { fr: "Icône", en: "Icon" },

  "settings.cfgNetwork.desc": {
    fr: "Ajoute, modifie ou supprime les nœuds affichés dans la section Réseau du Dashboard. Enregistré directement dans ce navigateur, appliqué au prochain chargement du Dashboard.",
    en: "Add, edit, or remove the nodes shown in the Dashboard's Network section. Saved directly in this browser, applied the next time the Dashboard loads."
  },
  "settings.cfgNetwork.addNode": { fr: "+ Ajouter un nœud", en: "+ Add a node" },
  "settings.cfgNetwork.exportJsBtn": { fr: "⬇ Exporter en reseau.js", en: "⬇ Export as reseau.js" },
  "settings.cfgNetwork.formTitleAdd": { fr: "Ajouter un nœud", en: "Add a node" },
  "settings.cfgNetwork.formTitleEdit": { fr: "Modifier le nœud", en: "Edit node" },
  "settings.cfgNetwork.fieldCategory": { fr: "Catégorie", en: "Category" },
  "settings.cfgNetwork.fieldEnabled": { fr: "Actif", en: "Enabled" },
  "settings.cfgNetwork.inactiveSuffix": { fr: " (inactif)", en: " (inactive)" },
  "settings.cfgNetwork.resetConfirm": {
    fr: "Rétablir la liste de nœuds Network par défaut ? Tes personnalisations seront perdues.",
    en: "Restore the default Network node list? Your customizations will be lost."
  },

  /* Shared by Tools and DevSecOps -- byte-identical "categories + a
     per-category tool/command list" shape, only the registry (and
     hence the card's own desc/resetConfirm text) differs. */
  "settings.cfgToolsLike.toolsOfCategory": { fr: "Outils de cette catégorie :", en: "Tools in this category:" },
  "settings.cfgToolsLike.noToolYet": { fr: "Aucun outil pour l'instant.", en: "No tools yet." },
  "settings.cfgToolsLike.confirmDeleteTool": {
    fr: "Supprimer l'outil \"{name}\" ?", en: "Delete the \"{name}\" tool?"
  },
  "settings.cfgToolsLike.addTool": { fr: "+ Ajouter un outil", en: "+ Add a tool" },
  "settings.cfgToolsLike.formTitleAddTool": { fr: "Ajouter un outil", en: "Add a tool" },
  "settings.cfgToolsLike.formTitleEditTool": { fr: "Modifier l'outil", en: "Edit tool" },
  "settings.cfgToolsLike.fieldCommands": { fr: "Commandes (une par ligne)", en: "Commands (one per line)" },
  "settings.cfgToolsLike.builtInNotePrefix": {
    fr: "Catégorie intégrée -- ses commandes sont fixes.", en: "Built-in category -- its commands are fixed."
  },
  "settings.cfgToolsLike.seePageLink": { fr: "Voir la page", en: "View the page" },

  "settings.cfgTools.desc": {
    fr: "Ajoute, renomme ou supprime les catégories affichées dans la section Outils du Dashboard. Les catégories intégrées gardent leurs commandes existantes (fixes) -- seuls leur titre/sous-titre sont modifiables ici. Une catégorie que tu ajoutes a sa propre liste d'outils/commandes, éditable en cliquant dessus.",
    en: "Add, rename, or remove the categories shown in the Dashboard's Tools section. Built-in categories keep their existing (fixed) commands -- only their title/subtitle can be edited here. A category you add gets its own list of tools/commands, editable by clicking it."
  },
  "settings.cfgTools.resetConfirm": {
    fr: "Rétablir les catégories Tools par défaut ? Tes personnalisations (catégories et outils ajoutés) seront perdues.",
    en: "Restore the default Tools categories? Your customizations (added categories and tools) will be lost."
  },

  "settings.cfgDevSecOps.desc": {
    fr: "Ajoute, renomme ou supprime les catégories affichées dans la section DevSecOps du Dashboard. Les catégories intégrées gardent leurs commandes existantes (fixes) -- seuls leur titre/sous-titre sont modifiables ici. Une catégorie que tu ajoutes a sa propre liste d'outils/commandes, éditable en cliquant dessus.",
    en: "Add, rename, or remove the categories shown in the Dashboard's DevSecOps section. Built-in categories keep their existing (fixed) commands -- only their title/subtitle can be edited here. A category you add gets its own list of tools/commands, editable by clicking it."
  },
  "settings.cfgDevSecOps.resetConfirm": {
    fr: "Rétablir les catégories DevSecOps par défaut ? Tes personnalisations (catégories et outils ajoutés) seront perdues.",
    en: "Restore the default DevSecOps categories? Your customizations (added categories and tools) will be lost."
  },

  "settings.cfgWebsite.desc": {
    fr: "Ajoute, renomme ou supprime les catégories affichées dans la section Website du Dashboard, et les liens qu'elles contiennent.",
    en: "Add, rename, or remove the categories shown in the Dashboard's Website section, and the links they contain."
  },
  "settings.cfgWebsite.resetConfirm": {
    fr: "Rétablir les catégories Website par défaut ? Tes personnalisations seront perdues.",
    en: "Restore the default Website categories? Your customizations will be lost."
  },
  "settings.cfgWebsite.linksOfCategory": { fr: "Liens de cette catégorie :", en: "Links in this category:" },
  "settings.cfgWebsite.noLinkYet": { fr: "Aucun lien pour l'instant.", en: "No links yet." },
  "settings.cfgWebsite.confirmDeleteLink": {
    fr: "Supprimer le lien \"{name}\" ?", en: "Delete the \"{name}\" link?"
  },
  "settings.cfgWebsite.addLink": { fr: "+ Ajouter un lien", en: "+ Add a link" },
  "settings.cfgWebsite.formTitleAddLink": { fr: "Ajouter un lien", en: "Add a link" },
  "settings.cfgWebsite.formTitleEditLink": { fr: "Modifier le lien", en: "Edit link" },

  "settings.cfgTopology.desc": {
    fr: "Ajoute ou retire des nœuds sur le schéma Topology, et les liens entre eux. Un nœud ajouté ici se déplace ensuite directement sur la page Topology (glisser par sa boîte), et peut aussi être glissé À L'INTÉRIEUR d'un autre nœud (une \"boîte\", comme Proxmox) pour former un regroupement -- visible ci-dessous par son indentation, ou en le glissant hors de sa boîte pour le retirer. Les nœuds intégrés au schéma d'origine gardent leur structure -- seuls leur affichage et leur position sont modifiables.",
    en: "Add or remove nodes on the Topology diagram, and the links between them. A node added here can then be moved directly on the Topology page (drag it by its box), and can also be dragged INSIDE another node (a \"box\", like Proxmox) to form a group -- shown below by its indentation, or dragged back out of its box to remove it. Nodes built into the original diagram keep their structure -- only their display and position can be edited."
  },
  "settings.cfgTopology.isContainerLabel": {
    fr: "Ce nœud est une boîte (peut contenir d'autres nœuds)",
    en: "This node is a box (can contain other nodes)"
  },
  "settings.cfgTopology.parentBoxLabel": { fr: "Boîte parente", en: "Parent box" },
  "settings.cfgTopology.noneFreeNode": { fr: "Aucune (nœud libre)", en: "None (free node)" },
  "settings.cfgTopology.linksHeading": { fr: "Liens", en: "Links" },
  "settings.cfgTopology.nodeALabel": { fr: "Nœud A", en: "Node A" },
  "settings.cfgTopology.nodeBLabel": { fr: "Nœud B", en: "Node B" },
  "settings.cfgTopology.addLinkBtn": { fr: "+ Ajouter le lien", en: "+ Add the link" },
  "settings.cfgTopology.noCustomLink": { fr: "Aucun lien personnalisé pour l'instant.", en: "No custom links yet." },
  "settings.cfgTopology.resetConfirm": {
    fr: "Rétablir la Topology par défaut ? Les nœuds ajoutés, liens, nœuds masqués et positions déplacées seront tous perdus.",
    en: "Restore the default Topology? Added nodes, links, hidden nodes, and moved positions will all be lost."
  },
  "settings.cfgTopology.customSuffix": { fr: " (personnalisé)", en: " (custom)" },
  "settings.cfgTopology.containerSuffix": { fr: " [boîte]", en: " [box]" },
  "settings.cfgTopology.hiddenSuffix": { fr: " (masqué)", en: " (hidden)" },
  "settings.cfgTopology.seedNodeNote": {
    fr: "Nœud intégré au schéma -- structure fixe. Glisse-le directement sur la page Topology pour le repositionner.",
    en: "Node built into the diagram -- fixed structure. Drag it directly on the Topology page to reposition it."
  },
  "settings.cfgTopology.nestedNodeNote": {
    fr: "Nœud imbriqué -- structure et position fixes (fait partie de la boîte qui le contient).",
    en: "Nested node -- fixed structure and position (part of the box that contains it)."
  },
  "settings.cfgTopology.renamePrompt": { fr: "Nouveau nom affiché :", en: "New display name:" },
  "settings.cfgTopology.freeNodeInBoxNote": {
    fr: "Dans la boîte : {box}. Glisse-le hors de sa boîte sur la page Topology, ou change sa \"Boîte parente\" ci-dessous.",
    en: "In the box: {box}. Drag it out of its box on the Topology page, or change its \"Parent box\" below."
  },
  "settings.cfgTopology.freeNodeNote": {
    fr: "Nœud libre -- glisse-le sur une boîte (ex. Proxmox) sur la page Topology pour l'y ranger, ou choisis sa \"Boîte parente\" ci-dessous.",
    en: "Free node -- drag it onto a box (e.g. Proxmox) on the Topology page to place it there, or pick its \"Parent box\" below."
  },
  "settings.cfgTopology.removeFromBox": { fr: "Retirer de la boîte", en: "Remove from the box" },
  "settings.cfgTopology.showNode": { fr: "Afficher ce nœud", en: "Show this node" },
  "settings.cfgTopology.hideNode": { fr: "Masquer ce nœud", en: "Hide this node" },
  "settings.cfgTopology.removeNode": { fr: "Retirer ce nœud", en: "Remove this node" },
  "settings.cfgTopology.confirmRemoveNode": {
    fr: "Retirer \"{name}\" de la Topology ?", en: "Remove \"{name}\" from the Topology?"
  },

  "settings.cfgAbout.desc": {
    fr: "Personnalise le contenu de la page About (permis affiché, liens pro) -- remplace config/about.js dès que tu sauvegardes ici.",
    en: "Customize the About page's content (displayed permit, professional links) -- replaces config/about.js as soon as you save here."
  },
  "settings.cfgAbout.fieldHeader": { fr: "En-tête", en: "Header" },
  "settings.cfgAbout.fieldText": { fr: "Texte", en: "Text" },
  "settings.cfgAbout.fieldIdField": { fr: "ID affiché", en: "Displayed ID" },
  "settings.cfgAbout.fieldQr": { fr: "Image QR (chemin)", en: "QR image (path)" },
  "settings.cfgAbout.fieldBarcode": { fr: "Image code-barres (chemin, optionnel)", en: "Barcode image (path, optional)" },
  "settings.cfgAbout.fieldBackground": { fr: "Fond d'écran de cette page (chemin)", en: "This page's background (path)" },
  "settings.cfgAbout.fieldLabel": { fr: "Libellé", en: "Label" },
  "settings.cfgAbout.fieldVisible": { fr: "Visible", en: "Visible" },
  "settings.cfgAbout.savedAlert": { fr: "Contenu About enregistré.", en: "About content saved." },

  "settings.cfgVersion.title": { fr: "Version", en: "Version" },
  "settings.cfgVersion.desc": {
    fr: "Numéro de version courant de cette copie de NeonFlare, lu depuis config/version.js.",
    en: "Current version number of this copy of NeonFlare, read from config/version.js."
  },
  "settings.cfgAbout.resetConfirm": {
    fr: "Rétablir le contenu About par défaut (config/about.js) ? Tes personnalisations seront perdues.",
    en: "Restore the default About content (config/about.js)? Your customizations will be lost."
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
  },

  /* project/dashboard.html chrome -- this page never loaded i18n.js at
     all until now (reported 2026-09-11, screenshot: "Réseau"/"Outils"
     panel titles staying French while everything else on Settings had
     already switched). Covers the STATIC chrome only (panel titles,
     toolbar buttons/tooltips, legend, status labels) -- NOT the tool/
     category tiles rendered from the Tools/DevSecOps/Website registries
     (dashboard-tools-tiles.js etc.), which are user-entered data, not
     UI chrome, and stay in whatever language the user typed them in --
     same policy as every other registry's content site-wide. */
  "dash.legend.online": { fr: "En ligne", en: "Online" },
  "dash.legend.offline": { fr: "Injoignable", en: "Unreachable" },
  "dash.legend.checking": { fr: "Vérification", en: "Checking" },
  "dash.btn.dashboards": { fr: "☰ Dashboards", en: "☰ Dashboards" },
  "dash.btn.addShell": { fr: "+ Shell", en: "+ Shell" },
  "dash.btn.panels": { fr: "☰ Panneaux", en: "☰ Panels" },
  "dash.btn.resetLayout": { fr: "⟲ Disposition", en: "⟲ Layout" },
  "dash.btn.resetLayoutTitle": {
    fr: "Remet chaque panneau à sa position et taille d'origine",
    en: "Resets every panel back to its original position and size"
  },
  "dash.btn.link": { fr: "🔗 Link", en: "🔗 Link" },
  "dash.btn.linkTitle": {
    fr: "Link -- renvoyer les commandes « Shell » de cet onglet vers un autre onglet ouvert",
    en: "Link -- redirect this tab's \"Shell\" commands to another open tab"
  },
  "dash.btn.quickFinding": { fr: "+ Finding", en: "+ Finding" },
  "dash.btn.quickFindingTitle": {
    fr: "Ajouter un finding à une mission pentest existante, sans quitter le dashboard",
    en: "Add a finding to an existing pentest engagement, without leaving the dashboard"
  },
  "dash.grcCoverage": { fr: "Couverture GRC", en: "GRC Coverage" },
  "dash.panel.shells": { fr: "Shells", en: "Shells" },
  "dash.panel.network": { fr: "Réseau", en: "Network" },
  "dash.panel.explorer": { fr: "Explorateur", en: "Explorer" },
  "dash.panel.tools": { fr: "Outils", en: "Tools" },
  "dash.panel.devsecops": { fr: "DevSecOps", en: "DevSecOps" },
  "dash.panel.website": { fr: "Website", en: "Website" },
  "dash.panel.upcomingReviews": { fr: "Prochaines revues", en: "Upcoming reviews" },
  "dash.panel.systemLog": { fr: "System log", en: "System log" },

  /* project/neonflare-technology.html's fixed card list (config/
     GothamBlood-tech.js) -- reported untranslated 2026-09-11, same
     sweep as the Settings/Dashboard fixes above. Unlike reseau.js's
     user-added Network cards, these 5 are shipped, not something a
     self-hoster edits via a Settings UI, so translating them in place
     (rather than leaving them as "page content") is the right call. */
  "tech.docs.title": { fr: "Documentation", en: "Documentation" },
  "tech.docs.sub": { fr: "Guides et références", en: "Guides and references" },
  "tech.github.title": { fr: "GitHub", en: "GitHub" },
  "tech.github.sub": { fr: "Dépôts de code", en: "Code repositories" },
  "tech.youtube.title": { fr: "YouTube", en: "YouTube" },
  "tech.youtube.sub": { fr: "Vidéos et démos (à venir)", en: "Videos and demos (coming soon)" },
  "tech.license.title": { fr: "Licence", en: "License" },
  "tech.license.sub": {
    fr: "MIT -- libre d'usage, de modification et de redistribution",
    en: "MIT -- free to use, modify, and redistribute"
  },
  "tech.donate.title": { fr: "Faire un don", en: "Donate" },
  "tech.donate.sub": { fr: "Soutenir le projet via PayPal", en: "Support the project via PayPal" },

  /* Settings > Assistant & réinitialisation -- the "Sauvegarde complète"
     and "Réinitialiser un registre" cards were entirely missed when
     onboarding.settingsCard.* above was i18n'ized (only the top card of
     this tab had been done) -- same sweep, found by screenshot
     2026-09-11. registryName.* covers each of the 20 per-registry reset
     rows (label text only; the reset confirm/done messages themselves
     stay in settingsConfirmReset()'s own French, out of scope here --
     see its own function comment). */
  "settings.assistant.fullBackupTitle": { fr: "Sauvegarde complète", en: "Full backup" },
  "settings.assistant.fullBackupDesc": {
    fr: "Un seul fichier JSON avec tous les registres (Réseau, Outils, DevSecOps, Website, Topologie, About, Checklist GRC, Actifs, Risques, Contrôles, Incidents, Pentest), les Dashboards que tu as créés et leurs sections, plus ton nom de traçabilité GRC -- pratique pour migrer vers un autre navigateur ou faire une sauvegarde avant un \"Tout réinitialiser\". Le coffre-fort n'est pas concerné : si actif, déverrouille-le d'abord (onglet Sécurité) pour que l'export inclue les registres protégés.",
    en: "A single JSON file with every registry (Network, Tools, DevSecOps, Website, Topology, About, GRC Checklist, Assets, Risks, Controls, Incidents, Pentest), the Dashboards you've created and their sections, plus your GRC traceability name -- handy for moving to another browser or backing up before a \"Reset everything\". The vault isn't included: if active, unlock it first (Security tab) so the export includes the protected registries."
  },
  "settings.assistant.exportAllBtn": { fr: "⬇ Exporter toute la configuration", en: "⬇ Export the whole configuration" },
  "settings.assistant.importAllBtn": { fr: "⬆ Importer toute la configuration", en: "⬆ Import the whole configuration" },

  "settings.assistant.resetOneTitle": { fr: "Réinitialiser un registre", en: "Reset a registry" },
  "settings.assistant.resetOneDesc": {
    fr: "Remet un registre à son état par défaut (vide, ou les valeurs de base des fichiers de config) -- indépendant les uns des autres, chaque bouton ne touche que le registre indiqué. Le coffre-fort (chiffrement) n'est pas concerné ici, voir Sécurité pour ça.",
    en: "Restores a registry to its default state (empty, or the config files' base values) -- independent of each other, each button only touches the registry it names. The vault (encryption) isn't affected here, see Security for that."
  },
  "settings.assistant.resetBtn": { fr: "Réinitialiser", en: "Reset" },
  "settings.assistant.resetAllDanger": { fr: "Zone dangereuse.", en: "Danger zone." },
  "settings.assistant.resetAllDesc": {
    fr: "Réinitialise TOUS les registres ci-dessus d'un coup -- irréversible, aucune sauvegarde automatique. Exporte d'abord ce que tu veux garder (bouton Exporter de chaque registre) si tu n'es pas sûr.",
    en: "Resets ALL the registries above at once -- irreversible, no automatic backup. Export what you want to keep first (the Export button on each registry) if you're not sure."
  },
  "settings.assistant.resetAllBtn": { fr: "Tout réinitialiser", en: "Reset everything" },

  "settings.registryName.network": { fr: "Réseau", en: "Network" },
  "settings.registryName.tools": { fr: "Outils", en: "Tools" },
  "settings.registryName.devsecops": { fr: "DevSecOps", en: "DevSecOps" },
  "settings.registryName.website": { fr: "Website", en: "Website" },
  "settings.registryName.topology": { fr: "Topologie", en: "Topology" },
  "settings.registryName.about": { fr: "About", en: "About" },
  "settings.registryName.grcChecklist": { fr: "Checklist GRC (les 53 pages)", en: "GRC Checklist (all 53 pages)" },
  "settings.registryName.assets": { fr: "Registre d'actifs", en: "Asset registry" },
  "settings.registryName.risks": { fr: "Registre de risques", en: "Risk registry" },
  "settings.registryName.controls": { fr: "Registre de contrôles", en: "Control registry" },
  "settings.registryName.incidents": { fr: "Journal d'incidents", en: "Incident log" },
  "settings.registryName.continuity": { fr: "Registre PCA/PRA", en: "BCP/DRP registry" },
  "settings.registryName.suppliers": { fr: "Registre des fournisseurs", en: "Supplier registry" },
  "settings.registryName.vulns": { fr: "Suivi des vulnérabilités", en: "Vulnerability tracker" },
  "settings.registryName.privacy": { fr: "Registre vie privée (ROPA + demandes)", en: "Privacy registry (ROPA + requests)" },
  "settings.registryName.compliance": { fr: "Registre de conformité (obligations + audits)", en: "Compliance registry (obligations + audits)" },
  "settings.registryName.accessReviews": { fr: "Recertification des accès (campagnes + JML)", en: "Access recertification (campaigns + JML)" },
  "settings.registryName.metrics": { fr: "Registre d'indicateurs (KPI / KRI)", en: "Metrics registry (KPI / KRI)" },
  "settings.registryName.documents": { fr: "Registre documentaire (politiques / directives / procédures)", en: "Document registry (policies / directives / procedures)" },
  "settings.registryName.pentest": { fr: "Tracker Pentest (Findings)", en: "Pentest tracker (Findings)" },

  "settings.dashboards.desc": {
    fr: "Un dashboard = sa propre combinaison de sections actives. Ajoutes-en autant que tu veux, chacun garde ses propres réglages. Clique sur un dashboard pour voir ses options.",
    en: "A dashboard = its own combination of active sections. Add as many as you want, each keeps its own settings. Click a dashboard to see its options."
  },
  "settings.dashboards.deleteBtn": { fr: "Supprimer ce dashboard", en: "Delete this dashboard" },
  "settings.dashboards.confirmDelete": {
    fr: "Supprimer le dashboard \"{name}\" ?", en: "Delete the \"{name}\" dashboard?"
  },
  "settings.dashboards.renamePrompt": { fr: "Nouveau nom du dashboard :", en: "New dashboard name:" },
  "settings.dashboards.addPrompt": { fr: "Nom du nouveau dashboard :", en: "New dashboard name:" },
  "settings.dashboards.bgDefault": { fr: "Défaut (fond global ou propre au Réseau)", en: "Default (global or Network's own background)" },
  "settings.dashboards.bgLabel": { fr: "Fond d'écran", en: "Background" },
  "settings.dashboards.sectionsDesc": {
    fr: "Contrôle l'affichage de chaque section sur ce dashboard.", en: "Controls which sections show up on this dashboard."
  },

  "settings.assistant.everythingResetAlert": { fr: "Tout a été réinitialisé.", en: "Everything has been reset." },
  "settings.assistant.exportGatedAlert": {
    fr: "Le coffre-fort est verrouillé -- déverrouille-le d'abord (onglet Sécurité) pour que l'export inclue les registres protégés.",
    en: "The vault is locked -- unlock it first (Security tab) so the export includes the protected registries."
  },
  "settings.assistant.invalidBackupFormat": {
    fr: "Format invalide : une sauvegarde complète JSON est attendue.", en: "Invalid format: a full JSON backup is expected."
  },
  "settings.assistant.confirmImportBackup": {
    fr: "Importer cette sauvegarde complète ? Chaque registre qu'elle contient remplace entièrement le registre actuel correspondant.",
    en: "Import this full backup? Every registry it contains entirely replaces the matching current registry."
  },
  "settings.assistant.backupImportedAlert": { fr: "Sauvegarde importée.", en: "Backup imported." },
  "settings.assistant.confirmResetOne": {
    fr: "Réinitialiser {name} ? Cette action est irréversible.", en: "Reset {name}? This action is irreversible."
  },
  "settings.assistant.resetOneDoneAlert": { fr: "{name} réinitialisé.", en: "{name} reset." },
  "settings.assistant.confirmResetEverything": {
    fr: "Tout réinitialiser (Réseau, Outils, DevSecOps, Website, Topologie, About, Checklist GRC, Actifs, Risques, Contrôles, Incidents, Pentest) ? Cette action est irréversible et supprime toutes tes personnalisations. Le coffre-fort n'est pas touché.",
    en: "Reset everything (Network, Tools, DevSecOps, Website, Topology, About, GRC Checklist, Assets, Risks, Controls, Incidents, Pentest)? This action is irreversible and removes all your customizations. The vault isn't touched."
  },

  // DASHBOARD_SECTIONS (assets/script/dashboards.js) -- the 2 GRC widget
  // labels aren't shared with dashboard.html's own panel titles (that
  // panel is just "Couverture GRC", no "(panneau)"/"(en-tête)" split),
  // so they get their own keys instead of reusing dash.grcCoverage.
  "dash.panel.grcPanel": { fr: "Couverture GRC (panneau)", en: "GRC Coverage (panel)" },
  "dash.panel.grcHeader": { fr: "Couverture GRC (en-tête)", en: "GRC Coverage (header)" }
};

function applyI18n(lang) {
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const entry = I18N_DICT[el.getAttribute("data-i18n")];
    if (!entry || !entry[lang]) return;
    const text = entry[lang];

    // The common case (every data-i18n element until Settings' Config
    // Network/Tools/Website/DevSecOps/Topology/About cards, 2026-09-11)
    // has no element children -- a plain textContent replacement is
    // exactly right. Those cards, though, mark up plain form labels as
    // `<label data-i18n="...">Title <input ...></label>` (matches the
    // rest of the site's "Label <input>" style, no extra wrapper span
    // needed) -- a bare `el.textContent = text` there would silently
    // delete the nested <input>/<select>. So: an element WITH element
    // children only gets its own direct text node(s) rewritten (or one
    // added, with a trailing space to keep the "Label <input>" gap)
    // instead of the whole subtree replaced.
    if (!Array.from(el.childNodes).some((n) => n.nodeType === 1)) {
      el.textContent = text;
      return;
    }
    let textNode = Array.from(el.childNodes).find((n) => n.nodeType === 3);
    if (!textNode) {
      textNode = document.createTextNode("");
      el.insertBefore(textNode, el.firstChild);
    }
    textNode.data = text + " ";
  });

  // data-i18n-title: translates the `title` tooltip attribute instead
  // of visible content -- independent of data-i18n above (an element
  // can carry either, both, or neither), added for dashboard.html's
  // toolbar buttons (2026-09-11), whose tooltips are as much untranslated
  // chrome as their labels.
  document.querySelectorAll("[data-i18n-title]").forEach((el) => {
    const entry = I18N_DICT[el.getAttribute("data-i18n-title")];
    if (entry && entry[lang]) el.title = entry[lang];
  });

  // data-i18n-html: like data-i18n, but replaces innerHTML instead of a
  // text node -- for the handful of paragraphs that embed <strong>/etc.
  // (eg. "Effets par page"'s description). The dict value must already
  // be trusted, hand-written markup (never end-user data) -- same
  // expectation as NeonFlare_Vitrine's own data-i18n-html convention.
  document.querySelectorAll("[data-i18n-html]").forEach((el) => {
    const entry = I18N_DICT[el.getAttribute("data-i18n-html")];
    if (entry && entry[lang]) el.innerHTML = entry[lang];
  });
}

function getSavedLang() {
  return localStorage.getItem("/settings.html/lang") || "fr";
}

// Moved here from grc-i18n.js (2026-09-11) so pages that load only this
// base file -- project/settings.html's dynamically-built Config Network/
// Tools/Website/DevSecOps/Topology/About cards, none of which pull in
// the GRC-specific dictionary -- can use it too. Reads I18N_DICT
// directly, for any HTML built by JS (buttons, list rows, confirm()
// text) that applyI18n()'s DOM scan never reaches. Mirrors onbT() in
// onboarding-wizard.js (a third, separate page, not consolidated here).
function grcT(key) {
  const entry = I18N_DICT[key];
  return (entry && entry[getSavedLang()]) || (entry && entry.fr) || key;
}
