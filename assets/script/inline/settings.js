
  // Two-pane settings shell: which .settings-section (there can be more
  // than one div sharing the same data-section -- cards for a section
  // aren't always contiguous in the file, eg. "apparence" is Theme near
  // the top and Langue further down) is shown, and which nav <li> reads
  // as active. Remembered per browser (not critical data, just a UI
  // convenience) so reopening Settings lands back where you left it
  // instead of always resetting to the first tab.
  const SETTINGS_SECTION_KEY = "/settings.html/lastSection";

  // activeEl: which single <li> to highlight -- needed because Registres
  // now has 3 nav items sharing data-section="registres" (Registres
  // itself, plus the Générique/Autres sub-items), so matching by name
  // alone would light up all 3 at once instead of just the one clicked.
  // Falls back to matching by name for callers that don't have a click
  // to hand it a specific element (the restore-on-load call below).
  function showSettingsSection(name, activeEl) {
    document.querySelectorAll(".settings-nav-item").forEach((li) => {
      li.classList.toggle("active", activeEl ? li === activeEl : li.dataset.section === name);
    });
    document.querySelectorAll(".settings-section").forEach((section) => {
      section.style.display = section.dataset.section === name ? "contents" : "none";
    });
    localStorage.setItem(SETTINGS_SECTION_KEY, name);
  }

  // On restore, "registres" alone would otherwise match all 3 of its
  // nav items too -- pick the plain "Registres" one (not a .settings-
  // nav-subitem) as the single highlighted default.
  (function () {
    const name = localStorage.getItem(SETTINGS_SECTION_KEY) || "apparence";
    const activeEl = document.querySelector(`.settings-nav-item[data-section="${name}"]:not(.settings-nav-subitem)`);
    showSettingsSection(name, activeEl);
  })();

  // "Générique" / "Autres" nav sub-items -- show only that group's
  // cards (plain "Registres" clears the filter back to both). Walks
  // the Registres section's own direct children in document order,
  // toggling each one's display based on which group title came before
  // it -- title and cards are flat siblings there (see the "registres"
  // <div>), not nested under their own group wrapper. Matched via each
  // title's own data-registry-group (a stable internal id, same values
  // "Générique"/"Autres" the nav sub-items already carry), NOT its
  // rendered textContent -- that text is now translated (settings.nav.*,
  // 2026-09-11), so comparing against it would silently break this
  // filter as soon as the language switches to English.
  function filterRegistryGroup(groupName) {
    const section = document.querySelector('.settings-section[data-section="registres"]');
    let currentGroup = null;
    Array.from(section.children).forEach((el) => {
      if (el.classList.contains("netcfg-registry-group-title")) currentGroup = el.dataset.registryGroup;
      el.style.display = !groupName || currentGroup === groupName ? "" : "none";
    });
  }

  // Assistant de configuration > Réinitialiser un registre -- each button
  // calls one already-existing resetX() (network-config.js, tools-
  // config.js, website-config.js, topology-config.js, grc-checklist.js,
  // grc-assets.js, grc-risks.js, grc-incidents.js, grc-pentest.js), the
  // exact same functions each registry's own "Rétablir par défaut"
  // button already calls elsewhere -- this page just centralizes them in
  // one place instead of hunting through Settings/every GRC page for the
  // matching reset. A plain confirm() first, same pattern used
  // everywhere else in this codebase for a destructive default-restore.
  function settingsConfirmReset(label, fn) {
    if (!confirm(grcT("settings.assistant.confirmResetOne").replace("{name}", label))) return;
    fn();
    alert(grcT("settings.assistant.resetOneDoneAlert").replace("{name}", label));
  }

  // "Tout réinitialiser" -- every registry above, one after another,
  // behind a single stronger confirmation instead of nine separate ones.
  // Deliberately does NOT touch the vault/encryption (Sécurité tab has
  // its own dedicated disable flow requiring the passphrase -- wiping
  // protected keys without it would either throw, per vaultSetItem's own
  // "vault is locked" guard, or silently fail) or the dashboards/layout
  // registry (deleting dashboards someone created is a different kind of
  // destructive than clearing config data back to defaults).
  function settingsResetEverything() {
    if (!confirm(grcT("settings.assistant.confirmResetEverything"))) return;
    resetNetworkNodes();
    resetToolsConfig();
    resetDevSecOpsConfig();
    resetWebsiteConfig();
    resetTopologyConfig();
    resetAboutConfig();
    resetGrcData(null, () => {});
    resetGrcAssets();
    resetGrcRisks();
    resetGrcControls();
    resetGrcIncidents();
    resetGrcContinuity();
    resetGrcSuppliers();
    resetGrcVulns();
    resetGrcPrivacy();
    resetGrcCompliance();
    resetGrcAccessReviews();
    resetGrcMetrics();
    resetGrcDocuments();
    resetPentestEngagements();
    alert(grcT("settings.assistant.everythingResetAlert"));
  }

  // Assistant de configuration > Sauvegarde complète -- one JSON file
  // covering every registry a user can add to or edit. It is a superset
  // of "Tout réinitialiser" above: that flow deliberately spares the
  // dashboards registry (see settingsResetEverything's comment), but a
  // BACKUP has no reason to drop it, so dashboards, the GRC controls
  // registry and the GRC change-log name are all included here too.
  // Assembled from each registry's own existing getters (the same ones
  // that registry's own exportXAsJson() already reads) rather than
  // reading raw localStorage directly, so this stays correct if a
  // registry's own storage shape ever changes -- except the GRC
  // checklist and the dashboards section-visibility keys, which have no
  // single "get everything" getter of their own (grc-checklist.js's
  // exportGrcAsJson() needs the full 5-hub domain config just to attach
  // human-readable titles; dashboards spreads hidden sections across one
  // key per dashboard) -- a raw key/value snapshot of every matching
  // prefix is simpler for those two and round-trips perfectly since
  // restoring just writes the same keys back.
  function settingsCollectAllConfigData() {
    const grcChecklist = {};
    const dashboards = {};
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k) continue;
      if (k.indexOf(GRC_CHECKLIST_PREFIX) === 0) grcChecklist[k] = vaultGetItem(k);
      if (k === DASHBOARDS_KEY || k.indexOf("/settings.html/hiddenDashboardSections") === 0) dashboards[k] = localStorage.getItem(k);
    }
    const toolsCommands = {};
    getToolsCategories().forEach((cat) => {
      if ((cat.page || "").startsWith("custom.html")) toolsCommands[cat.id] = getToolsCommands(cat.id);
    });
    const devsecopsCommands = {};
    getDevSecOpsCategories().forEach((cat) => {
      if ((cat.page || "").startsWith("devsecops-custom.html")) devsecopsCommands[cat.id] = getDevSecOpsCommands(cat.id);
    });
    return {
      network: getNetworkNodes(),
      tools: { categories: getToolsCategories(), commands: toolsCommands },
      devsecops: { categories: getDevSecOpsCategories(), commands: devsecopsCommands },
      website: getWebsiteCategories(),
      about: getRawAboutConfigOverride(),
      topology: {
        customNodes: getTopologyCustomNodes(),
        customLinks: getTopologyCustomLinks(),
        hiddenSeed: getHiddenSeedTopologyIds(),
        layout: getTopologyLayout(),
        titleOverrides: getTopologyTitleOverrides(),
      },
      grcChecklist,
      grcAssets: getGrcAssets(),
      grcRisks: getGrcRisks(),
      grcControls: getGrcControls(),
      grcIncidents: getGrcIncidents(),
      grcContinuity: getGrcContinuity(),
      grcSuppliers: getGrcSuppliers(),
      grcVulns: getGrcVulns(),
      grcPrivacy: getGrcPrivacy(),
      grcCompliance: getGrcCompliance(),
      grcAccessReviews: getGrcAccessReviews(),
      grcMetrics: getGrcMetrics(),
      grcDocuments: getGrcDocuments(),
      pentest: getPentestEngagements(),
      grcAuthor: localStorage.getItem(GRC_AUTHOR_KEY),
      dashboards,
    };
  }

  async function settingsExportAllAsJson() {
    if (typeof vaultShouldGate === "function" && vaultShouldGate()) {
      alert(grcT("settings.assistant.exportGatedAlert"));
      return;
    }
    const data = await vaultMaybeEncryptForExport(settingsCollectAllConfigData());
    exportJsonFile(data, "neonflare-config-" + new Date().toISOString().slice(0, 10) + ".json");
  }

  async function settingsImportAllFromJson(file) {
    const raw = await readJsonFile(file);
    const data = await vaultMaybeDecryptImport(raw);
    if (!data || typeof data !== "object") throw new Error(grcT("settings.assistant.invalidBackupFormat"));

    if (Array.isArray(data.network)) saveNetworkNodes(data.network);
    if (data.tools) {
      if (Array.isArray(data.tools.categories)) saveToolsCategories(data.tools.categories);
      Object.keys(data.tools.commands || {}).forEach((catId) => saveToolsCommands(catId, data.tools.commands[catId]));
    }
    if (data.devsecops) {
      if (Array.isArray(data.devsecops.categories)) saveDevSecOpsCategories(data.devsecops.categories);
      Object.keys(data.devsecops.commands || {}).forEach((catId) => saveDevSecOpsCommands(catId, data.devsecops.commands[catId]));
    }
    if (Array.isArray(data.website)) saveWebsiteCategories(data.website);
    if (data.about && typeof data.about === "object") saveAboutConfig(data.about);
    if (data.topology) {
      // Only overwrite a sub-key that is actually present in the file. A
      // partial or older backup (one predating layout / titleOverrides)
      // must not wipe the current values back to empty -- absent means
      // "leave as-is", not "reset".
      const t = data.topology;
      if ("customNodes" in t) saveTopologyCustomNodes(Array.isArray(t.customNodes) ? t.customNodes : []);
      if ("customLinks" in t) saveTopologyCustomLinks(Array.isArray(t.customLinks) ? t.customLinks : []);
      if ("hiddenSeed" in t) vaultSetItem(TOPOLOGY_HIDDEN_SEED_KEY, JSON.stringify(Array.isArray(t.hiddenSeed) ? t.hiddenSeed : []));
      if ("layout" in t) saveTopologyLayout(t.layout && typeof t.layout === "object" ? t.layout : {});
      if ("titleOverrides" in t) vaultSetItem(TOPOLOGY_TITLE_OVERRIDES_KEY, JSON.stringify(t.titleOverrides && typeof t.titleOverrides === "object" ? t.titleOverrides : {}));
    }
    if (data.grcChecklist && typeof data.grcChecklist === "object") {
      // Only restore keys under the checklist prefix -- an imported file
      // must not be able to write arbitrary localStorage keys through
      // this block (Sweep3 §2.1), same guard as the dashboards block below.
      Object.keys(data.grcChecklist).forEach((k) => {
        if (typeof k === "string" && k.indexOf(GRC_CHECKLIST_PREFIX) === 0) {
          vaultSetItem(k, data.grcChecklist[k]);
        }
      });
    }
    if (Array.isArray(data.grcAssets)) saveGrcAssets(data.grcAssets);
    if (Array.isArray(data.grcRisks)) saveGrcRisks(data.grcRisks);
    if (Array.isArray(data.grcControls)) saveGrcControls(data.grcControls);
    if (Array.isArray(data.grcIncidents)) saveGrcIncidents(data.grcIncidents);
    if (Array.isArray(data.grcContinuity)) saveGrcContinuity(data.grcContinuity);
    if (Array.isArray(data.grcSuppliers)) saveGrcSuppliers(data.grcSuppliers);
    if (Array.isArray(data.grcVulns)) saveGrcVulns(data.grcVulns);
    if (Array.isArray(data.grcPrivacy)) saveGrcPrivacy(data.grcPrivacy);
    if (Array.isArray(data.grcCompliance)) saveGrcCompliance(data.grcCompliance);
    if (Array.isArray(data.grcAccessReviews)) saveGrcAccessReviews(data.grcAccessReviews);
    if (Array.isArray(data.grcMetrics)) saveGrcMetrics(data.grcMetrics);
    if (Array.isArray(data.grcDocuments)) saveGrcDocuments(data.grcDocuments);
    if (Array.isArray(data.pentest)) savePentestEngagements(data.pentest);
    // Change-log name: an empty string is a legitimate saved value
    // ("cleared on purpose"), so restore any string, not just truthy.
    if (typeof data.grcAuthor === "string") localStorage.setItem(GRC_AUTHOR_KEY, data.grcAuthor);
    // Dashboards registry + one hidden-sections key per dashboard, keyed
    // by their real localStorage names -- guarded to those two shapes so
    // a hand-edited file can't write arbitrary keys. notifyDashboardsChanged()
    // tells index.html's sidebar to re-read the list if we're embedded.
    if (data.dashboards && typeof data.dashboards === "object") {
      Object.keys(data.dashboards).forEach((k) => {
        if (k === DASHBOARDS_KEY || k.indexOf("/settings.html/hiddenDashboardSections") === 0) {
          localStorage.setItem(k, data.dashboards[k]);
        }
      });
      if (typeof notifyDashboardsChanged === "function") notifyDashboardsChanged();
    }
  }

  function settingsHandleImportAllFile(input) {
    const file = input.files[0];
    if (!file) return;
    if (!confirm(grcT("settings.assistant.confirmImportBackup"))) {
      input.value = "";
      return;
    }
    settingsImportAllFromJson(file)
      .then(() => alert(grcT("settings.assistant.backupImportedAlert")))
      .catch((err) => alert(err.message || grcT("grc.common.invalidJsonFile")))
      .finally(() => { input.value = ""; });
  }

  applyWallpaper(settingsConfig.background, "settings");

  // ============================================================
  // BACKGROUND -- global wallpaper override, applied on top of every
  // page's own default by applyWallpaper() itself (assets/script/
  // wallpaper-loader.js) so nothing else needs touching per-page.
  // ============================================================
  function renderWallpaperOverrideSelect() {
    const select = document.getElementById("wallpaperOverrideSelect");
    const previous = select.value;
    select.innerHTML = "";
    const noneOpt = document.createElement("option");
    noneOpt.value = "";
    noneOpt.textContent = grcT("settings.background.none");
    select.appendChild(noneOpt);
    WALLPAPER_OVERRIDE_OPTIONS.forEach(({ file, label, i18nKey }) => {
      const opt = document.createElement("option");
      opt.value = file;
      opt.textContent = i18nKey ? grcT(i18nKey) : label;
      select.appendChild(opt);
    });
    select.value = previous || getWallpaperOverride();
  }
  renderWallpaperOverrideSelect();
  document.getElementById("wallpaperOverrideSelect").addEventListener("change", (e) => {
    setWallpaperOverride(e.target.value);
    applyWallpaper(settingsConfig.background, "settings");
  });

  // ============================================================
  // SIDEBAR TAGLINE -- the vertical "The enemy's gate is down" strip on
  // the sidebar's edge (index.html's own .sidebar-edge, data-i18n
  // "sidebar.tagline"). One override per language (fr/en, matching
  // I18N_DICT's own "sidebar.tagline" entry -- not langLabels below,
  // which is declared further down this same script and would be a
  // temporal-dead-zone error to read this early): empty for a given
  // language (the default) means index.html keeps showing that
  // language's built-in phrase; typing something in one field only
  // replaces it for THAT language -- switching the active language
  // (Langue, below) shows whichever of these two is set, independently.
  // index.html doesn't read this storage key itself for a LIVE update
  // (same reasoning as theme/lang -- see notifyParentTheme), only on its
  // own next load, so this also broadcasts the whole map while Settings
  // is open.
  // ============================================================
  const SIDEBAR_TAGLINE_KEY = "/settings.html/sidebarTagline";
  const SIDEBAR_TAGLINE_LANGS = Object.keys(I18N_DICT["sidebar.tagline"]);

  function getSidebarTaglineOverrides() {
    try {
      const parsed = JSON.parse(localStorage.getItem(SIDEBAR_TAGLINE_KEY) || "{}");
      return (parsed && typeof parsed === "object") ? parsed : {};
    } catch (e) {
      return {};
    }
  }

  function notifyParentSidebarTagline(overrides) {
    if (embedded) window.top.postMessage({ type: "sidebar-tagline-change", overrides: overrides }, "*");
  }

  (function initSidebarTaglineInputs() {
    const overrides = getSidebarTaglineOverrides();
    SIDEBAR_TAGLINE_LANGS.forEach((lang) => {
      const input = document.getElementById("sidebarTaglineInput_" + lang);
      if (!input) return;
      input.value = overrides[lang] || "";
      input.placeholder = I18N_DICT["sidebar.tagline"][lang] || "";
    });
  })();

  function setSidebarTagline(lang, text) {
    const overrides = getSidebarTaglineOverrides();
    if (text) overrides[lang] = text;
    else delete overrides[lang];
    localStorage.setItem(SIDEBAR_TAGLINE_KEY, JSON.stringify(overrides));
    notifyParentSidebarTagline(overrides);
  }

  // ============================================================
  // EFFETS PAR PAGE -- background/vectors/stars, one row per entry in
  // assets/script/page-effects.js's PAGE_EFFECTS_REGISTRY. Built once
  // (the registry is static); only the controls' own values change.
  // ============================================================
  (function () {
    const list = document.getElementById("pageEffectsList");

    function buildBackgroundSelect(pageKey) {
      const select = document.createElement("select");
      select.className = "page-effects-select";
      const noneOpt = document.createElement("option");
      noneOpt.value = "";
      noneOpt.textContent = grcT("settings.pageEffects.bgDefault");
      select.appendChild(noneOpt);
      WALLPAPER_OVERRIDE_OPTIONS.forEach(({ file, label, i18nKey }) => {
        const opt = document.createElement("option");
        opt.value = file;
        opt.textContent = i18nKey ? grcT(i18nKey) : label;
        select.appendChild(opt);
      });
      select.value = getPageWallpaperOverride(pageKey);
      select.addEventListener("change", () => setPageWallpaperOverride(pageKey, select.value));
      return select;
    }

    function buildEffectSelect(pageKey, kind) {
      const select = document.createElement("select");
      select.className = "page-effects-select";
      [["", grcT("settings.pageEffects.effDefault")], ["on", grcT("settings.pageEffects.effOn")], ["off", grcT("settings.pageEffects.effOff")]].forEach(([value, label]) => {
        const opt = document.createElement("option");
        opt.value = value;
        opt.textContent = label;
        select.appendChild(opt);
      });
      const all = getRawPageEffects();
      const stored = all[pageKey] && all[pageKey][kind];
      select.value = typeof stored === "boolean" ? (stored ? "on" : "off") : "";
      select.addEventListener("change", () => {
        setPageEffect(pageKey, kind, select.value === "" ? undefined : select.value === "on");
      });
      return select;
    }

    // Collapsed by default -- 27 entries fully expanded at once (each
    // with 3 selects) made this card several screens long. Same
    // dash-accordion-item pattern as every other registry list here:
    // one open at a time, tracked across re-renders the same way
    // expandedCategoryId etc. do in the other Config cards.
    let expandedKey = null;

    function buildRow(entry) {
      const li = document.createElement("li");
      li.className = "dash-accordion-item" + (entry.key === expandedKey ? " open" : "");

      const header = document.createElement("div");
      header.className = "dash-accordion-header";
      header.innerHTML = `<span></span><span class="chevron">▸</span>`;
      header.querySelector("span").textContent = entry.labelI18nKey ? grcT(entry.labelI18nKey) : entry.label;
      header.onclick = () => {
        expandedKey = expandedKey === entry.key ? null : entry.key;
        renderPageEffectsList();
      };
      li.appendChild(header);

      if (entry.key === expandedKey) {
        const body = document.createElement("div");
        body.className = "dash-accordion-body page-effects-row-controls";
        body.style.display = "flex";

        if (entry.bg) {
          const wrap = document.createElement("label");
          wrap.className = "page-effects-control";
          wrap.append(grcT("settings.pageEffects.fieldBg") + " ", buildBackgroundSelect(entry.key));
          body.appendChild(wrap);
        }

        const vecWrap = document.createElement("label");
        vecWrap.className = "page-effects-control";
        vecWrap.append(grcT("settings.pageEffects.fieldVectors") + " ", buildEffectSelect(entry.key, "vectors"));
        body.appendChild(vecWrap);

        const starWrap = document.createElement("label");
        starWrap.className = "page-effects-control";
        starWrap.append(grcT("settings.pageEffects.fieldStars") + " ", buildEffectSelect(entry.key, "stars"));
        body.appendChild(starWrap);

        if (entry.glow) {
          const glowWrap = document.createElement("label");
          glowWrap.className = "page-effects-control";
          glowWrap.append(grcT("settings.pageEffects.fieldGlow") + " ", buildEffectSelect(entry.key, "glow"));
          body.appendChild(glowWrap);
        }

        li.appendChild(body);
      }

      return li;
    }

    // Groups collapsed by default too, same reasoning and same pattern
    // as Config Network's category dividers -- 4 groups (Pages
    // principales/GRC/Outils/DevSecOps) is still a lot of scrolling
    // even with every individual row already collapsed.
    const openGroups = new Set();

    function renderPageEffectsList() {
      list.innerHTML = "";
      const groups = new Map();
      PAGE_EFFECTS_REGISTRY.forEach((entry) => {
        if (!groups.has(entry.group)) groups.set(entry.group, { i18nKey: entry.groupI18nKey, entries: [] });
        groups.get(entry.group).entries.push(entry);
      });
      groups.forEach(({ i18nKey, entries }, group) => {
        const isOpen = openGroups.has(group);
        const groupLabel = i18nKey ? grcT(i18nKey) : group;
        const divider = document.createElement("div");
        divider.className = "netcfg-registry-group-title page-effects-group-title" + (isOpen ? " open" : "");
        divider.innerHTML = `<span></span><span class="chevron">▸</span>`;
        divider.querySelector("span").textContent = groupLabel + ` (${entries.length})`;
        divider.onclick = () => {
          if (isOpen) openGroups.delete(group);
          else openGroups.add(group);
          renderPageEffectsList();
        };
        list.appendChild(divider);
        if (isOpen) {
          const ul = document.createElement("ul");
          ul.className = "dash-accordion-list";
          entries.forEach((entry) => ul.appendChild(buildRow(entry)));
          list.appendChild(ul);
        }
      });
    }

    window.renderPageEffectsList = renderPageEffectsList;
    renderPageEffectsList();

    document.getElementById("pageEffectsResetBtn").addEventListener("click", () => {
      if (!confirm(grcT("settings.pageEffects.resetConfirm"))) return;
      resetPageEffects();
      localStorage.removeItem(PAGE_WALLPAPER_OVERRIDES_KEY);
      location.reload();
    });
  })();

  const embedded = window.self !== window.top;

  // Theme and language are persisted in localStorage, but the parent
  // shell (index.html) doesn't read that storage itself -- it only
  // paints its sidebar from what gets broadcast here via postMessage.
  const CUSTOM_ACCENT_KEY = "/settings.html/customAccent";
  const DEFAULT_CUSTOM_ACCENT = "#48dbfb";

  function notifyParentTheme(themeName) {
    if (embedded) {
      window.top.postMessage({
        type: "theme-change",
        theme: themeName,
        accent: localStorage.getItem(CUSTOM_ACCENT_KEY) || DEFAULT_CUSTOM_ACCENT,
      }, "*");
    }
  }

  function notifyParentLang(lang) {
    if (embedded) {
      window.top.postMessage({ type: "lang-change", lang: lang }, "*");
    }
  }

  const savedTheme = localStorage.getItem("/settings.html") || "standard";
  document.body.classList.add("theme-" + savedTheme);

  document.getElementById("themeName").textContent = savedTheme;

  // Restore the saved custom colour into the picker and paint it (via
  // theme-accent.js, loaded on this page too) before broadcasting, so
  // the shell gets the accent alongside the theme name.
  document.getElementById("customAccentPicker").value =
    localStorage.getItem(CUSTOM_ACCENT_KEY) || DEFAULT_CUSTOM_ACCENT;
  if (typeof window.applyCustomAccent === "function") window.applyCustomAccent();

  notifyParentTheme(savedTheme);

  function relaunchOnboardingWizard() {
    if (embedded) {
      window.top.postMessage({ type: "open-onboarding-wizard" }, "*");
    }
  }

  function setTheme(themeName) {
    localStorage.setItem("/settings.html", themeName);

    // Retire les anciens thèmes
    document.body.classList.remove("theme-standard", "theme-terminal", "theme-blade", "theme-tron", "theme-custom");

    // Ajoute le nouveau thème
    document.body.classList.add("theme-" + themeName);

    // "custom" n'a pas de règles CSS propres : theme-accent.js peint
    // --accent (et ses dérivés) en inline sur <body> d'après la couleur
    // choisie, et les efface pour les autres thèmes.
    if (typeof window.applyCustomAccent === "function") window.applyCustomAccent();

    // Met à jour le texte
    document.getElementById("themeName").textContent = themeName;

    notifyParentTheme(themeName);
  }

  // Color picker de l'option "Personnalisé" -- enregistre la couleur,
  // bascule sur le thème custom si besoin, la repeint immédiatement et
  // la diffuse au shell.
  function setCustomAccent(color) {
    localStorage.setItem(CUSTOM_ACCENT_KEY, color);
    if (localStorage.getItem("/settings.html") !== "custom") {
      setTheme("custom");
      return;
    }
    if (typeof window.applyCustomAccent === "function") window.applyCustomAccent();
    notifyParentTheme("custom");
  }

  const langLabels = { fr: "Français", en: "English" };
  const savedLang = getSavedLang();
  applyI18n(savedLang);
  document.getElementById("langName").textContent = langLabels[savedLang];
  notifyParentLang(savedLang);

  function setLang(lang) {
    localStorage.setItem("/settings.html/lang", lang);
    document.getElementById("langName").textContent = langLabels[lang];
    notifyParentLang(lang);

    // Re-run every card that rebuilds its own innerHTML (with grcT()
    // calls for its dynamic parts, e.g. list rows, AND fresh data-i18n
    // markup for its static parts) BEFORE the applyI18n() sweep below --
    // not after. grcT() reads the new language immediately either way,
    // but a data-i18n attribute freshly created by one of these re-
    // renders doesn't get translated until some applyI18n() call finds
    // it; running that sweep first would translate the OLD markup and
    // then get silently overwritten the moment innerHTML is replaced.
    // (Guarded: a vault-gated card that's still locked never set its
    // window.render*/setup* global.)
    ["renderNetworkConfigCard", "renderToolsConfigCard", "renderDevSecOpsConfigCard",
     "renderWebsiteConfigCard", "renderTopologyConfigCard", "renderAboutConfigCard",
     "renderWallpaperOverrideSelect", "renderPageEffectsList", "renderDashboardSectionsCards",
     "setupVaultConfigCard"]
      .forEach((fn) => { if (typeof window[fn] === "function") window[fn](); });

    applyI18n(lang);
  }

  // Shell opacity: stored in localStorage (not sessionStorage) so it
  // persists across tabs/sessions -- dashboard.html reads it directly
  // when opening each new shell window.
  const savedShellOpacity = localStorage.getItem("/settings.html/shellOpacity") || "100";
  document.getElementById("shellOpacitySlider").value = savedShellOpacity;
  document.getElementById("shellOpacityValue").textContent = savedShellOpacity + "%";

  function setShellOpacity(value) {
    localStorage.setItem("/settings.html/shellOpacity", value);
    document.getElementById("shellOpacityValue").textContent = value + "%";
  }

  // Sidebar page visibility: which links show up in index.html's menu.
  // The parent shell reads this itself directly on load (see index.html),
  // this just persists the choice and broadcasts live updates while
  // Settings is open.
  const HIDDEN_PAGES_KEY = "/settings.html/hiddenPages";

  function getHiddenPages() {
    try {
      return JSON.parse(localStorage.getItem(HIDDEN_PAGES_KEY) || "[]");
    } catch (e) {
      return [];
    }
  }

  function notifyParentVisibility(hidden) {
    if (embedded) {
      window.top.postMessage({ type: "visibility-change", hidden: hidden }, "*");
    }
  }

  (function initVisibilityToggles() {
    const hidden = getHiddenPages();
    document.querySelectorAll("input[data-page]").forEach((input) => {
      input.checked = !hidden.includes(input.getAttribute("data-page"));
    });
  })();

  function setPageVisible(key, visible) {
    let hidden = getHiddenPages();
    hidden = hidden.filter((k) => k !== key);
    if (!visible) hidden.push(key);
    localStorage.setItem(HIDDEN_PAGES_KEY, JSON.stringify(hidden));
    notifyParentVisibility(hidden);
  }

  // Dashboard section visibility -- one card per dashboard in the registry.
  // DASHBOARD_SECTIONS itself now lives in assets/script/dashboards.js
  // (shared with dashboard.html's own "☰ Panneaux" picker -- both need
  // the exact same list, so it has one source of truth). dashboard.html
  // and settings.html are never shown at once in the same iframe, so
  // this just needs to persist -- dashboard.html reads it fresh on its
  // own next load, no live postMessage needed here.

  // Which dashboard's <li> is expanded -- module-level so it survives the
  // full re-render every add/rename/delete/toggle triggers below.
  let expandedDashboardId = null;

  function buildDashboardListItem(dashboard) {
    const li = document.createElement("li");
    li.className = "dash-accordion-item" + (dashboard.id === expandedDashboardId ? " open" : "");

    const header = document.createElement("div");
    header.className = "dash-accordion-header";
    header.innerHTML = `<span></span><span class="chevron">▸</span>`;
    header.querySelector("span").textContent = dashboard.name;
    header.onclick = () => {
      expandedDashboardId = expandedDashboardId === dashboard.id ? null : dashboard.id;
      renderDashboardSectionsCards();
    };
    li.appendChild(header);

    if (dashboard.id === expandedDashboardId) {
      const body = document.createElement("div");
      body.className = "dash-accordion-body";

      const renameBtn = document.createElement("div");
      renameBtn.className = "dash-btn dash-btn-block";
      renameBtn.textContent = grcT("settings.cfgCommon.rename");
      renameBtn.onclick = (e) => {
        e.stopPropagation();
        const name = prompt(grcT("settings.dashboards.renamePrompt"), dashboard.name);
        if (!name || !name.trim() || name.trim() === dashboard.name) return;
        renameDashboard(dashboard.id, name.trim());
        renderDashboardSectionsCards();
      };
      body.appendChild(renameBtn);

      const bgLabel = document.createElement("label");
      bgLabel.className = "page-effects-control";
      bgLabel.style.cssText = "display:flex; gap:0.5rem; align-items:center; margin-top:0.8rem; font-size:0.8rem; color:#a7b0c7;";
      const bgSelect = document.createElement("select");
      bgSelect.className = "page-effects-select";
      bgSelect.style.flex = "1";
      const bgNoneOpt = document.createElement("option");
      bgNoneOpt.value = "";
      bgNoneOpt.textContent = grcT("settings.dashboards.bgDefault");
      bgSelect.appendChild(bgNoneOpt);
      WALLPAPER_OVERRIDE_OPTIONS.forEach(({ file, label, i18nKey }) => {
        const opt = document.createElement("option");
        opt.value = file;
        opt.textContent = i18nKey ? grcT(i18nKey) : label;
        bgSelect.appendChild(opt);
      });
      bgSelect.value = getPageWallpaperOverride("dashboard:" + dashboard.id);
      bgSelect.onclick = (e) => e.stopPropagation();
      bgSelect.onchange = () => setPageWallpaperOverride("dashboard:" + dashboard.id, bgSelect.value);
      bgLabel.append(grcT("settings.dashboards.bgLabel") + " ", bgSelect);
      body.appendChild(bgLabel);

      const desc = document.createElement("p");
      desc.style.cssText = "font-size: 0.8rem; color: #a7b0c7; margin: 1rem 0; line-height: 1.5;";
      desc.textContent = grcT("settings.dashboards.sectionsDesc");
      body.appendChild(desc);

      const hidden = getHiddenDashboardSections(dashboard.id);
      DASHBOARD_SECTIONS.forEach((section) => {
        const key = section.key;
        const row = document.createElement("div");
        row.className = "toggle-row";
        row.innerHTML = `
          <span class="toggle-row-label"></span>
          <label class="toggle-switch">
            <input type="checkbox">
            <span class="slider"></span>
          </label>
        `;
        row.querySelector(".toggle-row-label").textContent = dashSectionLabel(section);
        const input = row.querySelector("input");
        input.checked = !hidden.includes(key);
        input.onclick = (e) => e.stopPropagation();
        input.onchange = () => setDashboardSectionVisible(dashboard.id, key, input.checked);
        body.appendChild(row);
      });

      if (dashboard.id !== "default") {
        const deleteBtn = document.createElement("div");
        deleteBtn.className = "dash-btn dash-btn-block";
        deleteBtn.style.marginTop = "1rem";
        deleteBtn.textContent = grcT("settings.dashboards.deleteBtn");
        deleteBtn.onclick = (e) => {
          e.stopPropagation();
          if (!confirm(grcT("settings.dashboards.confirmDelete").replace("{name}", dashboard.name))) return;
          expandedDashboardId = null;
          removeDashboard(dashboard.id);
          renderDashboardSectionsCards();
        };
        body.appendChild(deleteBtn);
      }

      li.appendChild(body);
    }

    return li;
  }

  function renderDashboardSectionsCards() {
    const container = document.getElementById("dashboardSectionsCards");
    container.innerHTML = "";

    const card = document.createElement("div");
    card.className = "mat-card";
    card.innerHTML = `
      <h1>Dashboards</h1>
      <p style="font-size: 0.8rem; color: #a7b0c7; margin-bottom: 1rem; line-height: 1.5;" data-i18n="settings.dashboards.desc">
        Un dashboard = sa propre combinaison de sections actives. Ajoutes-en
        autant que tu veux, chacun garde ses propres réglages. Clique sur un
        dashboard pour voir ses options.
      </p>
    `;

    const addBtn = document.createElement("div");
    addBtn.className = "dash-btn dash-btn-block";
    addBtn.textContent = "+ Add Dashboard";
    addBtn.onclick = () => {
      const name = prompt(grcT("settings.dashboards.addPrompt"));
      if (!name || !name.trim()) return;
      expandedDashboardId = addDashboard(name.trim());
      renderDashboardSectionsCards();
    };
    card.appendChild(addBtn);

    const list = document.createElement("ul");
    list.className = "dash-accordion-list";
    getDashboards().forEach((dashboard) => {
      list.appendChild(buildDashboardListItem(dashboard));
    });
    card.appendChild(list);

    container.appendChild(card);
  }

  renderDashboardSectionsCards();

  // ============================================================
  // CONFIG NETWORK -- add/edit/remove the nodes shown in the
  // Dashboard's Réseau panel (assets/script/network-config.js).
  // ============================================================
  function setupNetworkConfigCard() {
    const card = document.getElementById("networkConfigCard");
    if (vaultGateOr(card, setupNetworkConfigCard)) return;
    let editingId = null;
    let pendingIcon = null;
    let expandedId = null;
    // Collapsed by default, same reasoning as Effets par page below --
    // one Set entry per category currently open (not per node; each
    // node keeps its own separate expandedId above).
    const openCategories = new Set();

    card.innerHTML = `
      <h1>Config Network</h1>
      <p class="netcfg-desc" data-i18n="settings.cfgNetwork.desc">
        Ajoute, modifie ou supprime les nœuds affichés dans la section
        Réseau du Dashboard. Enregistré directement dans ce navigateur,
        appliqué au prochain chargement du Dashboard.
      </p>
      <div class="dash-btn dash-btn-block" id="netcfgAddBtn" data-i18n="settings.cfgNetwork.addNode">+ Ajouter un nœud</div>
      <div class="dash-btn dash-btn-block" id="netcfgExportBtn" data-i18n="settings.cfgNetwork.exportJsBtn">⬇ Exporter en reseau.js</div>
      <form id="netcfgForm" style="display:none">
        <h2 id="netcfgFormTitle" data-i18n="settings.cfgNetwork.formTitleAdd">Ajouter un nœud</h2>
        <label data-i18n="settings.cfgField.title">Titre <input type="text" id="netcfgTitle" required></label>
        <label data-i18n="settings.cfgField.sub">Sous-titre <input type="text" id="netcfgSub"></label>
        <label>
          <span data-i18n="settings.cfgNetwork.fieldCategory">Catégorie</span>
          <input type="text" id="netcfgCategory" list="netcfgCategoryList" required>
          <datalist id="netcfgCategoryList"></datalist>
        </label>
        <label data-i18n="settings.cfgField.url">URL <input type="url" id="netcfgUrl" placeholder="https://..."></label>
        <label data-i18n="settings.cfgField.icon">Icône <input type="file" accept="image/*" id="netcfgIcon"></label>
        <div id="netcfgIconPreviewWrap"><img id="netcfgIconPreview" style="display:none"></div>
        <label class="netcfg-enabled-row">
          <span data-i18n="settings.cfgNetwork.fieldEnabled">Actif</span>
          <label class="toggle-switch"><input type="checkbox" id="netcfgEnabled" checked><span class="slider"></span></label>
        </label>
        <div class="netcfg-form-actions">
          <button type="submit" class="dash-btn" data-i18n="grc.common.btnSave">Enregistrer</button>
          <button type="button" class="dash-btn" id="netcfgCancelBtn" data-i18n="grc.common.btnCancel">Annuler</button>
        </div>
      </form>
      <ul class="dash-accordion-list" id="netcfgList"></ul>
      ${configIoControlsHtml()}
    `;

    wireConfigIoControls(card, {
      exportFn: exportNetworkNodesAsJson,
      importFn: importNetworkNodesFromJson,
      resetFn: resetNetworkNodes,
      onDone: () => renderNetworkConfigCard(),
      resetConfirm: grcT("settings.cfgNetwork.resetConfirm"),
    });

    function showForm(node) {
      editingId = node ? node.id : null;
      pendingIcon = node ? (node.img || null) : null;
      card.querySelector("#netcfgFormTitle").textContent = node ? grcT("settings.cfgNetwork.formTitleEdit") : grcT("settings.cfgNetwork.formTitleAdd");
      card.querySelector("#netcfgTitle").value = node ? node.title : "";
      card.querySelector("#netcfgSub").value = node ? (node.sub || "") : "";
      card.querySelector("#netcfgCategory").value = node ? (node.category || "") : "";
      card.querySelector("#netcfgUrl").value = node ? (node.url || "") : "";
      card.querySelector("#netcfgEnabled").checked = node ? node.enabled !== false : true;
      const preview = card.querySelector("#netcfgIconPreview");
      if (pendingIcon) { preview.src = pendingIcon; preview.style.display = ""; }
      else preview.style.display = "none";
      card.querySelector("#netcfgForm").style.display = "";
      card.querySelector("#netcfgAddBtn").style.display = "none";
      card.querySelector("#netcfgFormTitle").scrollIntoView({ behavior: "smooth", block: "center" });
    }

    function hideForm() {
      editingId = null;
      pendingIcon = null;
      card.querySelector("#netcfgForm").reset();
      card.querySelector("#netcfgForm").style.display = "none";
      card.querySelector("#netcfgAddBtn").style.display = "";
    }

    card.querySelector("#netcfgAddBtn").addEventListener("click", () => showForm(null));
    card.querySelector("#netcfgCancelBtn").addEventListener("click", hideForm);
    card.querySelector("#netcfgExportBtn").addEventListener("click", exportNetworkConfigAsJs);

    card.querySelector("#netcfgIcon").addEventListener("change", async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      pendingIcon = await resizeIconFile(file);
      const preview = card.querySelector("#netcfgIconPreview");
      preview.src = pendingIcon;
      preview.style.display = "";
    });

    card.querySelector("#netcfgForm").addEventListener("submit", (e) => {
      e.preventDefault();
      const title = card.querySelector("#netcfgTitle").value.trim();
      if (!title) return;
      const data = {
        title,
        sub: card.querySelector("#netcfgSub").value.trim(),
        category: card.querySelector("#netcfgCategory").value.trim() || "Autres",
        url: card.querySelector("#netcfgUrl").value.trim(),
        enabled: card.querySelector("#netcfgEnabled").checked,
      };
      if (pendingIcon) data.img = pendingIcon;
      if (editingId) updateNetworkNode(editingId, data);
      else addNetworkNode(data);
      hideForm();
      renderNetworkConfigCard();
    });

    function buildNodeItem(node) {
      const li = document.createElement("li");
      li.className = "dash-accordion-item" + (node.id === expandedId ? " open" : "");

      const header = document.createElement("div");
      header.className = "dash-accordion-header";
      header.innerHTML = `<span></span><span class="chevron">▸</span>`;
      header.querySelector("span").textContent = node.title + " — " + (node.category || "Autres");
      header.onclick = () => {
        expandedId = expandedId === node.id ? null : node.id;
        renderNetworkConfigCard();
      };
      li.appendChild(header);

      if (node.id === expandedId) {
        const body = document.createElement("div");
        body.className = "dash-accordion-body netcfg-node-row";
        body.style.display = "block";

        if (node.img) {
          const icon = document.createElement("img");
          icon.className = "netcfg-node-icon";
          icon.src = node.img;
          icon.style.marginTop = "0.9rem";
          body.appendChild(icon);
        }

        const desc = document.createElement("p");
        desc.className = "netcfg-desc";
        desc.style.marginTop = "0.9rem";
        desc.textContent = (node.sub || "") + (node.url ? " — " + node.url : "") + (node.enabled === false ? grcT("settings.cfgNetwork.inactiveSuffix") : "");
        body.appendChild(desc);

        const editBtn = document.createElement("div");
        editBtn.className = "dash-btn dash-btn-block";
        editBtn.textContent = grcT("grc.common.btnEdit");
        editBtn.onclick = () => showForm(node);
        body.appendChild(editBtn);

        const deleteBtn = document.createElement("div");
        deleteBtn.className = "dash-btn dash-btn-block";
        deleteBtn.textContent = grcT("grc.common.btnDelete");
        deleteBtn.onclick = () => {
          if (!confirm(grcT("grc.common.confirmDelete").replace("{name}", node.title))) return;
          removeNetworkNode(node.id);
          if (expandedId === node.id) expandedId = null;
          renderNetworkConfigCard();
        };
        body.appendChild(deleteBtn);

        li.appendChild(body);
      }

      return li;
    }

    window.renderNetworkConfigCard = function () {
      const dl = card.querySelector("#netcfgCategoryList");
      dl.innerHTML = "";
      getNetworkCategories().forEach((cat) => {
        const opt = document.createElement("option");
        opt.value = cat;
        dl.appendChild(opt);
      });

      // Grouped by category with a divider <li> ahead of each group --
      // a flat list mixing Réseau/Serveurs/Kubernetes/etc. nodes one
      // after another with no visual break got hard to scan once there
      // were more than a handful. Groups keep the nodes' own relative
      // order within them; only their first appearance decides where
      // each category's divider lands.
      const list = card.querySelector("#netcfgList");
      list.innerHTML = "";
      const groups = new Map();
      getNetworkNodes().forEach((node) => {
        const cat = node.category || "Autres";
        if (!groups.has(cat)) groups.set(cat, []);
        groups.get(cat).push(node);
      });
      groups.forEach((nodes, cat) => {
        const isOpen = openCategories.has(cat);
        const divider = document.createElement("li");
        divider.className = "netcfg-category-divider" + (isOpen ? " open" : "");
        divider.innerHTML = `<span></span><span class="chevron">▸</span>`;
        divider.querySelector("span").textContent = cat + ` (${nodes.length})`;
        divider.onclick = () => {
          if (isOpen) openCategories.delete(cat);
          else openCategories.add(cat);
          renderNetworkConfigCard();
        };
        list.appendChild(divider);
        if (isOpen) nodes.forEach((node) => list.appendChild(buildNodeItem(node)));
      });
    };

    renderNetworkConfigCard();
  }
  setupNetworkConfigCard();

  // ============================================================
  // CONFIG TOOLS -- add/rename/remove the categories shown in the
  // Dashboard's Outils panel, and (for categories added here) their
  // own tool/command list (assets/script/tools-config.js).
  // ============================================================
  (function () {
    const card = document.getElementById("toolsConfigCard");
    let editingCategoryId = null;
    let expandedCategoryId = null;
    let toolFormCategoryId = null;
    let editingToolId = null;

    card.innerHTML = `
      <h1>Config Tools</h1>
      <p class="netcfg-desc" data-i18n="settings.cfgTools.desc">
        Ajoute, renomme ou supprime les catégories affichées dans la
        section Outils du Dashboard. Les catégories intégrées gardent
        leurs commandes existantes (fixes) -- seuls leur titre/sous-titre
        sont modifiables ici. Une catégorie que tu ajoutes a sa propre
        liste d'outils/commandes, éditable en cliquant dessus.
      </p>
      <div class="dash-btn dash-btn-block" id="toolscfgAddBtn" data-i18n="settings.cfgCommon.addCategory">+ Ajouter une catégorie</div>
      <form id="toolscfgCategoryForm" style="display:none">
        <h2 id="toolscfgFormTitle" data-i18n="settings.cfgCommon.formTitleAddCategory">Ajouter une catégorie</h2>
        <label data-i18n="settings.cfgField.title">Titre <input type="text" id="toolscfgTitle" required></label>
        <label data-i18n="settings.cfgField.sub">Sous-titre <input type="text" id="toolscfgSub"></label>
        <div class="netcfg-form-actions">
          <button type="submit" class="dash-btn" data-i18n="grc.common.btnSave">Enregistrer</button>
          <button type="button" class="dash-btn" id="toolscfgCancelBtn" data-i18n="grc.common.btnCancel">Annuler</button>
        </div>
      </form>
      <ul class="dash-accordion-list" id="toolscfgList"></ul>
      ${configIoControlsHtml()}
    `;

    wireConfigIoControls(card, {
      exportFn: exportToolsConfigAsJson,
      importFn: importToolsConfigFromJson,
      resetFn: resetToolsConfig,
      onDone: () => renderToolsConfigCard(),
      resetConfirm: grcT("settings.cfgTools.resetConfirm"),
    });

    function isCustomCategory(cat) {
      return (cat.page || "").startsWith("custom.html");
    }

    function showCategoryForm(cat) {
      editingCategoryId = cat ? cat.id : null;
      card.querySelector("#toolscfgFormTitle").textContent = cat ? grcT("settings.cfgCommon.formTitleEditCategory") : grcT("settings.cfgCommon.formTitleAddCategory");
      card.querySelector("#toolscfgTitle").value = cat ? cat.title : "";
      card.querySelector("#toolscfgSub").value = cat ? (cat.sub || "") : "";
      card.querySelector("#toolscfgCategoryForm").style.display = "";
      card.querySelector("#toolscfgAddBtn").style.display = "none";
      card.querySelector("#toolscfgFormTitle").scrollIntoView({ behavior: "smooth", block: "center" });
    }

    function hideCategoryForm() {
      editingCategoryId = null;
      card.querySelector("#toolscfgCategoryForm").reset();
      card.querySelector("#toolscfgCategoryForm").style.display = "none";
      card.querySelector("#toolscfgAddBtn").style.display = "";
    }

    card.querySelector("#toolscfgAddBtn").addEventListener("click", () => showCategoryForm(null));
    card.querySelector("#toolscfgCancelBtn").addEventListener("click", hideCategoryForm);

    card.querySelector("#toolscfgCategoryForm").addEventListener("submit", (e) => {
      e.preventDefault();
      const title = card.querySelector("#toolscfgTitle").value.trim();
      if (!title) return;
      const data = { title, sub: card.querySelector("#toolscfgSub").value.trim() };
      if (editingCategoryId) updateToolsCategory(editingCategoryId, data);
      else expandedCategoryId = addToolsCategory(data);
      hideCategoryForm();
      renderToolsConfigCard();
    });

    function buildToolRow(catId, tool) {
      const row = document.createElement("div");
      row.className = "netcfg-node-row";
      const info = document.createElement("div");
      info.className = "netcfg-node-info";
      const title = document.createElement("div");
      title.className = "netcfg-node-title";
      title.textContent = tool.name;
      info.appendChild(title);
      const sub = document.createElement("div");
      sub.className = "netcfg-node-sub";
      sub.textContent = tool.description || "";
      info.appendChild(sub);
      row.appendChild(info);

      const actions = document.createElement("div");
      actions.className = "netcfg-node-actions";
      const editBtn = document.createElement("button");
      editBtn.type = "button";
      editBtn.className = "dash-btn dash-btn-block";
      editBtn.textContent = grcT("grc.common.btnEdit");
      editBtn.onclick = () => { toolFormCategoryId = catId; editingToolId = tool.id; renderToolsConfigCard(); };
      actions.appendChild(editBtn);
      const deleteBtn = document.createElement("button");
      deleteBtn.type = "button";
      deleteBtn.className = "dash-btn dash-btn-block";
      deleteBtn.textContent = grcT("grc.common.btnDelete");
      deleteBtn.onclick = () => {
        if (!confirm(grcT("settings.cfgToolsLike.confirmDeleteTool").replace("{name}", tool.name))) return;
        removeToolEntry(catId, tool.id);
        if (editingToolId === tool.id) { toolFormCategoryId = null; editingToolId = null; }
        renderToolsConfigCard();
      };
      actions.appendChild(deleteBtn);
      row.appendChild(actions);
      return row;
    }

    function buildToolFormCard(catId) {
      const tool = editingToolId ? getToolsCommands(catId).find((t) => t.id === editingToolId) : null;
      const wrap = document.createElement("div");
      wrap.className = "netcfg-form-card";
      wrap.innerHTML = `
        <h2>${tool ? grcT("settings.cfgToolsLike.formTitleEditTool") : grcT("settings.cfgToolsLike.formTitleAddTool")}</h2>
        <label data-i18n="settings.cfgField.name">Nom <input type="text" class="t-name"></label>
        <label data-i18n="settings.cfgField.description">Description <input type="text" class="t-desc"></label>
        <label data-i18n="settings.cfgToolsLike.fieldCommands">Commandes (une par ligne) <textarea class="t-cmds" rows="4" style="width:100%; background:#1e1e1e; border:1px solid #444; border-radius:8px; color:#f5f5f5; font-family:inherit; font-size:0.8rem; padding:0.5rem; box-sizing:border-box;"></textarea></label>
        <div class="netcfg-form-actions">
          <button type="button" class="dash-btn" data-action="save" data-i18n="grc.common.btnSave">Enregistrer</button>
          <button type="button" class="dash-btn" data-action="cancel" data-i18n="grc.common.btnCancel">Annuler</button>
        </div>
      `;
      wrap.querySelector(".t-name").value = tool ? tool.name : "";
      wrap.querySelector(".t-desc").value = tool ? (tool.description || "") : "";
      wrap.querySelector(".t-cmds").value = tool && tool.commands ? tool.commands.join("\n") : "";
      wrap.querySelector("[data-action='cancel']").onclick = () => {
        toolFormCategoryId = null;
        editingToolId = null;
        renderToolsConfigCard();
      };
      wrap.querySelector("[data-action='save']").onclick = () => {
        const name = wrap.querySelector(".t-name").value.trim();
        if (!name) return;
        const data = {
          name,
          description: wrap.querySelector(".t-desc").value.trim(),
          commands: wrap.querySelector(".t-cmds").value.split("\n").map((l) => l.trim()).filter(Boolean),
        };
        if (editingToolId) updateToolEntry(catId, editingToolId, data);
        else addToolEntry(catId, data);
        toolFormCategoryId = null;
        editingToolId = null;
        renderToolsConfigCard();
      };
      return wrap;
    }

    function buildCategoryBody(cat) {
      const body = document.createElement("div");
      body.className = "dash-accordion-body";

      const editBtn = document.createElement("div");
      editBtn.className = "dash-btn dash-btn-block";
      editBtn.style.marginTop = "0.9rem";
      editBtn.textContent = grcT("settings.cfgCommon.rename");
      editBtn.onclick = () => showCategoryForm(cat);
      body.appendChild(editBtn);

      const deleteBtn = document.createElement("div");
      deleteBtn.className = "dash-btn dash-btn-block";
      deleteBtn.textContent = grcT("settings.cfgCommon.deleteThisCategory");
      deleteBtn.onclick = () => {
        if (!confirm(grcT("settings.cfgCommon.confirmDeleteCategory").replace("{name}", cat.title))) return;
        removeToolsCategory(cat.id);
        if (expandedCategoryId === cat.id) expandedCategoryId = null;
        renderToolsConfigCard();
      };
      body.appendChild(deleteBtn);

      if (isCustomCategory(cat)) {
        const desc = document.createElement("p");
        desc.className = "netcfg-desc";
        desc.style.marginTop = "1rem";
        desc.textContent = grcT("settings.cfgToolsLike.toolsOfCategory");
        body.appendChild(desc);

        const addToolBtn = document.createElement("div");
        addToolBtn.className = "dash-btn dash-btn-block";
        addToolBtn.textContent = grcT("settings.cfgToolsLike.addTool");
        addToolBtn.onclick = () => { toolFormCategoryId = cat.id; editingToolId = null; renderToolsConfigCard(); };
        body.appendChild(addToolBtn);

        if (toolFormCategoryId === cat.id) body.appendChild(buildToolFormCard(cat.id));

        const tools = getToolsCommands(cat.id);
        if (!tools.length) {
          const empty = document.createElement("p");
          empty.className = "netcfg-desc";
          empty.textContent = grcT("settings.cfgToolsLike.noToolYet");
          body.appendChild(empty);
        } else {
          tools.forEach((t) => body.appendChild(buildToolRow(cat.id, t)));
        }
      } else {
        const note = document.createElement("p");
        note.className = "netcfg-desc";
        note.style.marginTop = "1rem";
        note.textContent = grcT("settings.cfgToolsLike.builtInNotePrefix") + " ";
        const link = document.createElement("a");
        link.href = "../tools/" + cat.page;
        link.target = "_blank";
        link.style.color = "var(--accent)";
        link.textContent = grcT("settings.cfgToolsLike.seePageLink");
        note.appendChild(link);
        body.appendChild(note);
      }

      return body;
    }

    function buildCategoryItem(cat) {
      const li = document.createElement("li");
      li.className = "dash-accordion-item" + (cat.id === expandedCategoryId ? " open" : "");
      const header = document.createElement("div");
      header.className = "dash-accordion-header";
      header.innerHTML = `<span></span><span class="chevron">▸</span>`;
      header.querySelector("span").textContent = cat.title;
      header.onclick = () => {
        expandedCategoryId = expandedCategoryId === cat.id ? null : cat.id;
        toolFormCategoryId = null;
        editingToolId = null;
        renderToolsConfigCard();
      };
      li.appendChild(header);
      if (cat.id === expandedCategoryId) li.appendChild(buildCategoryBody(cat));
      return li;
    }

    window.renderToolsConfigCard = function () {
      const list = card.querySelector("#toolscfgList");
      list.innerHTML = "";
      getToolsCategories().forEach((cat) => list.appendChild(buildCategoryItem(cat)));
    };

    renderToolsConfigCard();
  })();

  // ============================================================
  // CONFIG DEVSECOPS -- same shape as CONFIG TOOLS above (add/rename/
  // remove the categories shown in the Dashboard's DevSecOps panel, and
  // for categories added here, their own tool/command list), just
  // pointed at the separate assets/script/devsecops-config.js registry.
  // ============================================================
  (function () {
    const card = document.getElementById("devsecopsConfigCard");
    let editingCategoryId = null;
    let expandedCategoryId = null;
    let toolFormCategoryId = null;
    let editingToolId = null;

    card.innerHTML = `
      <h1>Config DevSecOps</h1>
      <p class="netcfg-desc" data-i18n="settings.cfgDevSecOps.desc">
        Ajoute, renomme ou supprime les catégories affichées dans la
        section DevSecOps du Dashboard. Les catégories intégrées gardent
        leurs commandes existantes (fixes) -- seuls leur titre/sous-titre
        sont modifiables ici. Une catégorie que tu ajoutes a sa propre
        liste d'outils/commandes, éditable en cliquant dessus.
      </p>
      <div class="dash-btn dash-btn-block" id="devsecopscfgAddBtn" data-i18n="settings.cfgCommon.addCategory">+ Ajouter une catégorie</div>
      <form id="devsecopscfgCategoryForm" style="display:none">
        <h2 id="devsecopscfgFormTitle" data-i18n="settings.cfgCommon.formTitleAddCategory">Ajouter une catégorie</h2>
        <label data-i18n="settings.cfgField.title">Titre <input type="text" id="devsecopscfgTitle" required></label>
        <label data-i18n="settings.cfgField.sub">Sous-titre <input type="text" id="devsecopscfgSub"></label>
        <div class="netcfg-form-actions">
          <button type="submit" class="dash-btn" data-i18n="grc.common.btnSave">Enregistrer</button>
          <button type="button" class="dash-btn" id="devsecopscfgCancelBtn" data-i18n="grc.common.btnCancel">Annuler</button>
        </div>
      </form>
      <ul class="dash-accordion-list" id="devsecopscfgList"></ul>
      ${configIoControlsHtml()}
    `;

    wireConfigIoControls(card, {
      exportFn: exportDevSecOpsConfigAsJson,
      importFn: importDevSecOpsConfigFromJson,
      resetFn: resetDevSecOpsConfig,
      onDone: () => renderDevSecOpsConfigCard(),
      resetConfirm: grcT("settings.cfgDevSecOps.resetConfirm"),
    });

    function isCustomCategory(cat) {
      return (cat.page || "").startsWith("devsecops-custom.html");
    }

    function showCategoryForm(cat) {
      editingCategoryId = cat ? cat.id : null;
      card.querySelector("#devsecopscfgFormTitle").textContent = cat ? grcT("settings.cfgCommon.formTitleEditCategory") : grcT("settings.cfgCommon.formTitleAddCategory");
      card.querySelector("#devsecopscfgTitle").value = cat ? cat.title : "";
      card.querySelector("#devsecopscfgSub").value = cat ? (cat.sub || "") : "";
      card.querySelector("#devsecopscfgCategoryForm").style.display = "";
      card.querySelector("#devsecopscfgAddBtn").style.display = "none";
      card.querySelector("#devsecopscfgFormTitle").scrollIntoView({ behavior: "smooth", block: "center" });
    }

    function hideCategoryForm() {
      editingCategoryId = null;
      card.querySelector("#devsecopscfgCategoryForm").reset();
      card.querySelector("#devsecopscfgCategoryForm").style.display = "none";
      card.querySelector("#devsecopscfgAddBtn").style.display = "";
    }

    card.querySelector("#devsecopscfgAddBtn").addEventListener("click", () => showCategoryForm(null));
    card.querySelector("#devsecopscfgCancelBtn").addEventListener("click", hideCategoryForm);

    card.querySelector("#devsecopscfgCategoryForm").addEventListener("submit", (e) => {
      e.preventDefault();
      const title = card.querySelector("#devsecopscfgTitle").value.trim();
      if (!title) return;
      const data = { title, sub: card.querySelector("#devsecopscfgSub").value.trim() };
      if (editingCategoryId) updateDevSecOpsCategory(editingCategoryId, data);
      else expandedCategoryId = addDevSecOpsCategory(data);
      hideCategoryForm();
      renderDevSecOpsConfigCard();
    });

    function buildToolRow(catId, tool) {
      const row = document.createElement("div");
      row.className = "netcfg-node-row";
      const info = document.createElement("div");
      info.className = "netcfg-node-info";
      const title = document.createElement("div");
      title.className = "netcfg-node-title";
      title.textContent = tool.name;
      info.appendChild(title);
      const sub = document.createElement("div");
      sub.className = "netcfg-node-sub";
      sub.textContent = tool.description || "";
      info.appendChild(sub);
      row.appendChild(info);

      const actions = document.createElement("div");
      actions.className = "netcfg-node-actions";
      const editBtn = document.createElement("button");
      editBtn.type = "button";
      editBtn.className = "dash-btn dash-btn-block";
      editBtn.textContent = grcT("grc.common.btnEdit");
      editBtn.onclick = () => { toolFormCategoryId = catId; editingToolId = tool.id; renderDevSecOpsConfigCard(); };
      actions.appendChild(editBtn);
      const deleteBtn = document.createElement("button");
      deleteBtn.type = "button";
      deleteBtn.className = "dash-btn dash-btn-block";
      deleteBtn.textContent = grcT("grc.common.btnDelete");
      deleteBtn.onclick = () => {
        if (!confirm(grcT("settings.cfgToolsLike.confirmDeleteTool").replace("{name}", tool.name))) return;
        removeDevSecOpsEntry(catId, tool.id);
        if (editingToolId === tool.id) { toolFormCategoryId = null; editingToolId = null; }
        renderDevSecOpsConfigCard();
      };
      actions.appendChild(deleteBtn);
      row.appendChild(actions);
      return row;
    }

    function buildToolFormCard(catId) {
      const tool = editingToolId ? getDevSecOpsCommands(catId).find((t) => t.id === editingToolId) : null;
      const wrap = document.createElement("div");
      wrap.className = "netcfg-form-card";
      wrap.innerHTML = `
        <h2>${tool ? grcT("settings.cfgToolsLike.formTitleEditTool") : grcT("settings.cfgToolsLike.formTitleAddTool")}</h2>
        <label data-i18n="settings.cfgField.name">Nom <input type="text" class="t-name"></label>
        <label data-i18n="settings.cfgField.description">Description <input type="text" class="t-desc"></label>
        <label data-i18n="settings.cfgToolsLike.fieldCommands">Commandes (une par ligne) <textarea class="t-cmds" rows="4" style="width:100%; background:#1e1e1e; border:1px solid #444; border-radius:8px; color:#f5f5f5; font-family:inherit; font-size:0.8rem; padding:0.5rem; box-sizing:border-box;"></textarea></label>
        <div class="netcfg-form-actions">
          <button type="button" class="dash-btn" data-action="save" data-i18n="grc.common.btnSave">Enregistrer</button>
          <button type="button" class="dash-btn" data-action="cancel" data-i18n="grc.common.btnCancel">Annuler</button>
        </div>
      `;
      wrap.querySelector(".t-name").value = tool ? tool.name : "";
      wrap.querySelector(".t-desc").value = tool ? (tool.description || "") : "";
      wrap.querySelector(".t-cmds").value = tool && tool.commands ? tool.commands.join("\n") : "";
      wrap.querySelector("[data-action='cancel']").onclick = () => {
        toolFormCategoryId = null;
        editingToolId = null;
        renderDevSecOpsConfigCard();
      };
      wrap.querySelector("[data-action='save']").onclick = () => {
        const name = wrap.querySelector(".t-name").value.trim();
        if (!name) return;
        const data = {
          name,
          description: wrap.querySelector(".t-desc").value.trim(),
          commands: wrap.querySelector(".t-cmds").value.split("\n").map((l) => l.trim()).filter(Boolean),
        };
        if (editingToolId) updateDevSecOpsEntry(catId, editingToolId, data);
        else addDevSecOpsEntry(catId, data);
        toolFormCategoryId = null;
        editingToolId = null;
        renderDevSecOpsConfigCard();
      };
      return wrap;
    }

    function buildCategoryBody(cat) {
      const body = document.createElement("div");
      body.className = "dash-accordion-body";

      const editBtn = document.createElement("div");
      editBtn.className = "dash-btn dash-btn-block";
      editBtn.style.marginTop = "0.9rem";
      editBtn.textContent = grcT("settings.cfgCommon.rename");
      editBtn.onclick = () => showCategoryForm(cat);
      body.appendChild(editBtn);

      const deleteBtn = document.createElement("div");
      deleteBtn.className = "dash-btn dash-btn-block";
      deleteBtn.textContent = grcT("settings.cfgCommon.deleteThisCategory");
      deleteBtn.onclick = () => {
        if (!confirm(grcT("settings.cfgCommon.confirmDeleteCategory").replace("{name}", cat.title))) return;
        removeDevSecOpsCategory(cat.id);
        if (expandedCategoryId === cat.id) expandedCategoryId = null;
        renderDevSecOpsConfigCard();
      };
      body.appendChild(deleteBtn);

      if (isCustomCategory(cat)) {
        const desc = document.createElement("p");
        desc.className = "netcfg-desc";
        desc.style.marginTop = "1rem";
        desc.textContent = grcT("settings.cfgToolsLike.toolsOfCategory");
        body.appendChild(desc);

        const addToolBtn = document.createElement("div");
        addToolBtn.className = "dash-btn dash-btn-block";
        addToolBtn.textContent = grcT("settings.cfgToolsLike.addTool");
        addToolBtn.onclick = () => { toolFormCategoryId = cat.id; editingToolId = null; renderDevSecOpsConfigCard(); };
        body.appendChild(addToolBtn);

        if (toolFormCategoryId === cat.id) body.appendChild(buildToolFormCard(cat.id));

        const tools = getDevSecOpsCommands(cat.id);
        if (!tools.length) {
          const empty = document.createElement("p");
          empty.className = "netcfg-desc";
          empty.textContent = grcT("settings.cfgToolsLike.noToolYet");
          body.appendChild(empty);
        } else {
          tools.forEach((t) => body.appendChild(buildToolRow(cat.id, t)));
        }
      } else {
        const note = document.createElement("p");
        note.className = "netcfg-desc";
        note.style.marginTop = "1rem";
        note.textContent = grcT("settings.cfgToolsLike.builtInNotePrefix") + " ";
        const link = document.createElement("a");
        link.href = "../tools/" + cat.page;
        link.target = "_blank";
        link.style.color = "var(--accent)";
        link.textContent = grcT("settings.cfgToolsLike.seePageLink");
        note.appendChild(link);
        body.appendChild(note);
      }

      return body;
    }

    function buildCategoryItem(cat) {
      const li = document.createElement("li");
      li.className = "dash-accordion-item" + (cat.id === expandedCategoryId ? " open" : "");
      const header = document.createElement("div");
      header.className = "dash-accordion-header";
      header.innerHTML = `<span></span><span class="chevron">▸</span>`;
      header.querySelector("span").textContent = cat.title;
      header.onclick = () => {
        expandedCategoryId = expandedCategoryId === cat.id ? null : cat.id;
        toolFormCategoryId = null;
        editingToolId = null;
        renderDevSecOpsConfigCard();
      };
      li.appendChild(header);
      if (cat.id === expandedCategoryId) li.appendChild(buildCategoryBody(cat));
      return li;
    }

    window.renderDevSecOpsConfigCard = function () {
      const list = card.querySelector("#devsecopscfgList");
      list.innerHTML = "";
      getDevSecOpsCategories().forEach((cat) => list.appendChild(buildCategoryItem(cat)));
    };

    renderDevSecOpsConfigCard();
  })();

  // ============================================================
  // CONFIG WEBSITE -- add/rename/remove the categories shown in the
  // Dashboard's Website panel, and each category's list of links
  // (assets/script/website-config.js).
  // ============================================================
  (function () {
    const card = document.getElementById("websiteConfigCard");
    let editingCategoryId = null;
    let expandedCategoryId = null;
    let linkFormCategoryId = null;
    let editingLinkId = null;

    card.innerHTML = `
      <h1>Config Website</h1>
      <p class="netcfg-desc" data-i18n="settings.cfgWebsite.desc">
        Ajoute, renomme ou supprime les catégories affichées dans la
        section Website du Dashboard, et les liens qu'elles contiennent.
      </p>
      <div class="dash-btn dash-btn-block" id="webcfgAddBtn" data-i18n="settings.cfgCommon.addCategory">+ Ajouter une catégorie</div>
      <form id="webcfgCategoryForm" style="display:none">
        <h2 id="webcfgFormTitle" data-i18n="settings.cfgCommon.formTitleAddCategory">Ajouter une catégorie</h2>
        <label data-i18n="settings.cfgField.title">Titre <input type="text" id="webcfgTitle" required></label>
        <label data-i18n="settings.cfgField.sub">Sous-titre <input type="text" id="webcfgSub"></label>
        <div class="netcfg-form-actions">
          <button type="submit" class="dash-btn" data-i18n="grc.common.btnSave">Enregistrer</button>
          <button type="button" class="dash-btn" id="webcfgCancelBtn" data-i18n="grc.common.btnCancel">Annuler</button>
        </div>
      </form>
      <ul class="dash-accordion-list" id="webcfgList"></ul>
      ${configIoControlsHtml()}
    `;

    wireConfigIoControls(card, {
      exportFn: exportWebsiteConfigAsJson,
      importFn: importWebsiteConfigFromJson,
      resetFn: resetWebsiteConfig,
      onDone: () => renderWebsiteConfigCard(),
      resetConfirm: grcT("settings.cfgWebsite.resetConfirm"),
    });

    function showCategoryForm(cat) {
      editingCategoryId = cat ? cat.id : null;
      card.querySelector("#webcfgFormTitle").textContent = cat ? grcT("settings.cfgCommon.formTitleEditCategory") : grcT("settings.cfgCommon.formTitleAddCategory");
      card.querySelector("#webcfgTitle").value = cat ? cat.title : "";
      card.querySelector("#webcfgSub").value = cat ? (cat.sub || "") : "";
      card.querySelector("#webcfgCategoryForm").style.display = "";
      card.querySelector("#webcfgAddBtn").style.display = "none";
      card.querySelector("#webcfgFormTitle").scrollIntoView({ behavior: "smooth", block: "center" });
    }

    function hideCategoryForm() {
      editingCategoryId = null;
      card.querySelector("#webcfgCategoryForm").reset();
      card.querySelector("#webcfgCategoryForm").style.display = "none";
      card.querySelector("#webcfgAddBtn").style.display = "";
    }

    card.querySelector("#webcfgAddBtn").addEventListener("click", () => showCategoryForm(null));
    card.querySelector("#webcfgCancelBtn").addEventListener("click", hideCategoryForm);

    card.querySelector("#webcfgCategoryForm").addEventListener("submit", (e) => {
      e.preventDefault();
      const title = card.querySelector("#webcfgTitle").value.trim();
      if (!title) return;
      const data = { title, sub: card.querySelector("#webcfgSub").value.trim() };
      if (editingCategoryId) updateWebsiteCategory(editingCategoryId, data);
      else expandedCategoryId = addWebsiteCategory(data);
      hideCategoryForm();
      renderWebsiteConfigCard();
    });

    function buildLinkRow(catId, link) {
      const row = document.createElement("div");
      row.className = "netcfg-node-row";
      const info = document.createElement("div");
      info.className = "netcfg-node-info";
      const title = document.createElement("div");
      title.className = "netcfg-node-title";
      title.textContent = link.name;
      info.appendChild(title);
      const sub = document.createElement("div");
      sub.className = "netcfg-node-sub";
      sub.textContent = link.url || "";
      info.appendChild(sub);
      row.appendChild(info);

      const actions = document.createElement("div");
      actions.className = "netcfg-node-actions";
      const editBtn = document.createElement("button");
      editBtn.type = "button";
      editBtn.className = "dash-btn dash-btn-block";
      editBtn.textContent = grcT("grc.common.btnEdit");
      editBtn.onclick = () => { linkFormCategoryId = catId; editingLinkId = link.id; renderWebsiteConfigCard(); };
      actions.appendChild(editBtn);
      const deleteBtn = document.createElement("button");
      deleteBtn.type = "button";
      deleteBtn.className = "dash-btn dash-btn-block";
      deleteBtn.textContent = grcT("grc.common.btnDelete");
      deleteBtn.onclick = () => {
        if (!confirm(grcT("settings.cfgWebsite.confirmDeleteLink").replace("{name}", link.name))) return;
        removeWebsiteLink(catId, link.id);
        if (editingLinkId === link.id) { linkFormCategoryId = null; editingLinkId = null; }
        renderWebsiteConfigCard();
      };
      actions.appendChild(deleteBtn);
      row.appendChild(actions);
      return row;
    }

    function buildLinkFormCard(catId) {
      const cat = getWebsiteCategory(catId);
      const link = editingLinkId ? (cat.links || []).find((l) => l.id === editingLinkId) : null;
      const wrap = document.createElement("div");
      wrap.className = "netcfg-form-card";
      wrap.innerHTML = `
        <h2>${link ? grcT("settings.cfgWebsite.formTitleEditLink") : grcT("settings.cfgWebsite.formTitleAddLink")}</h2>
        <label data-i18n="settings.cfgField.name">Nom <input type="text" class="l-name"></label>
        <label data-i18n="settings.cfgField.url">URL <input type="url" class="l-url" placeholder="https://..."></label>
        <div class="netcfg-form-actions">
          <button type="button" class="dash-btn" data-action="save" data-i18n="grc.common.btnSave">Enregistrer</button>
          <button type="button" class="dash-btn" data-action="cancel" data-i18n="grc.common.btnCancel">Annuler</button>
        </div>
      `;
      wrap.querySelector(".l-name").value = link ? link.name : "";
      wrap.querySelector(".l-url").value = link ? link.url : "";
      wrap.querySelector("[data-action='cancel']").onclick = () => {
        linkFormCategoryId = null;
        editingLinkId = null;
        renderWebsiteConfigCard();
      };
      wrap.querySelector("[data-action='save']").onclick = () => {
        const name = wrap.querySelector(".l-name").value.trim();
        const url = wrap.querySelector(".l-url").value.trim();
        if (!name || !url) return;
        if (editingLinkId) updateWebsiteLink(catId, editingLinkId, { name, url });
        else addWebsiteLink(catId, { name, url });
        linkFormCategoryId = null;
        editingLinkId = null;
        renderWebsiteConfigCard();
      };
      return wrap;
    }

    function buildCategoryBody(cat) {
      const body = document.createElement("div");
      body.className = "dash-accordion-body";

      const editBtn = document.createElement("div");
      editBtn.className = "dash-btn dash-btn-block";
      editBtn.style.marginTop = "0.9rem";
      editBtn.textContent = grcT("settings.cfgCommon.rename");
      editBtn.onclick = () => showCategoryForm(cat);
      body.appendChild(editBtn);

      const deleteBtn = document.createElement("div");
      deleteBtn.className = "dash-btn dash-btn-block";
      deleteBtn.textContent = grcT("settings.cfgCommon.deleteThisCategory");
      deleteBtn.onclick = () => {
        if (!confirm(grcT("settings.cfgCommon.confirmDeleteCategory").replace("{name}", cat.title))) return;
        removeWebsiteCategory(cat.id);
        if (expandedCategoryId === cat.id) expandedCategoryId = null;
        renderWebsiteConfigCard();
      };
      body.appendChild(deleteBtn);

      const desc = document.createElement("p");
      desc.className = "netcfg-desc";
      desc.style.marginTop = "1rem";
      desc.textContent = grcT("settings.cfgWebsite.linksOfCategory");
      body.appendChild(desc);

      const addLinkBtn = document.createElement("div");
      addLinkBtn.className = "dash-btn dash-btn-block";
      addLinkBtn.textContent = grcT("settings.cfgWebsite.addLink");
      addLinkBtn.onclick = () => { linkFormCategoryId = cat.id; editingLinkId = null; renderWebsiteConfigCard(); };
      body.appendChild(addLinkBtn);

      if (linkFormCategoryId === cat.id) body.appendChild(buildLinkFormCard(cat.id));

      const links = cat.links || [];
      if (!links.length) {
        const empty = document.createElement("p");
        empty.className = "netcfg-desc";
        empty.textContent = grcT("settings.cfgWebsite.noLinkYet");
        body.appendChild(empty);
      } else {
        links.forEach((l) => body.appendChild(buildLinkRow(cat.id, l)));
      }

      return body;
    }

    function buildCategoryItem(cat) {
      const li = document.createElement("li");
      li.className = "dash-accordion-item" + (cat.id === expandedCategoryId ? " open" : "");
      const header = document.createElement("div");
      header.className = "dash-accordion-header";
      header.innerHTML = `<span></span><span class="chevron">▸</span>`;
      header.querySelector("span").textContent = cat.title;
      header.onclick = () => {
        expandedCategoryId = expandedCategoryId === cat.id ? null : cat.id;
        linkFormCategoryId = null;
        editingLinkId = null;
        renderWebsiteConfigCard();
      };
      li.appendChild(header);
      if (cat.id === expandedCategoryId) li.appendChild(buildCategoryBody(cat));
      return li;
    }

    window.renderWebsiteConfigCard = function () {
      const list = card.querySelector("#webcfgList");
      list.innerHTML = "";
      getWebsiteCategories().forEach((cat) => list.appendChild(buildCategoryItem(cat)));
    };

    renderWebsiteConfigCard();
  })();

  // ============================================================
  // CONFIG TOPOLOGY -- add/remove nodes and links on the Topology page
  // (assets/script/topology-config.js). The existing diagram
  // (config/topology.js) is a hand-tuned nested tree, not a flat list
  // like Network/Tools/Website -- a seed node's own structure isn't
  // editable here, only whether it's shown, and its position (dragged
  // directly on the Topology page, not from this card). A node/link
  // added here is fully editable.
  // ============================================================
  function setupTopologyConfigCard() {
    const card = document.getElementById("topologyConfigCard");
    if (vaultGateOr(card, setupTopologyConfigCard)) return;
    let editingNodeId = null;
    let pendingIcon = null;
    let expandedId = null;
    // {id: ref} for every node currently on the schema (seed + custom,
    // any depth) -- refreshed at the top of every renderTopologyConfigCard()
    // so buildNodeItem() can look up a parent's display title.
    let allRefsCache = {};

    card.innerHTML = `
      <h1>Config Topology</h1>
      <p class="netcfg-desc" data-i18n="settings.cfgTopology.desc">
        Ajoute ou retire des nœuds sur le schéma Topology, et les liens
        entre eux. Un nœud ajouté ici se déplace ensuite directement sur
        la page Topology (glisser par sa boîte), et peut aussi être
        glissé À L'INTÉRIEUR d'un autre nœud (une "boîte", comme
        Proxmox) pour former un regroupement -- visible ci-dessous par
        son indentation, ou en le glissant hors de sa boîte pour le
        retirer. Les nœuds intégrés au schéma d'origine gardent leur
        structure -- seuls leur affichage et leur position sont
        modifiables.
      </p>
      <div class="theme-option" id="topocfgAddBtn" data-i18n="settings.cfgNetwork.addNode">+ Ajouter un nœud</div>
      <form id="topocfgNodeForm" style="display:none">
        <h2 id="topocfgFormTitle" data-i18n="settings.cfgNetwork.formTitleAdd">Ajouter un nœud</h2>
        <label data-i18n="settings.cfgField.title">Titre <input type="text" id="topocfgTitle" required></label>
        <label data-i18n="settings.cfgField.sub">Sous-titre <input type="text" id="topocfgMeta"></label>
        <label data-i18n="settings.cfgField.url">URL <input type="url" id="topocfgUrl" placeholder="https://..."></label>
        <label data-i18n="settings.cfgField.icon">Icône <input type="file" accept="image/*" id="topocfgIcon"></label>
        <div id="topocfgIconPreviewWrap"><img id="topocfgIconPreview" style="display:none"></div>
        <label class="netcfg-checkbox-row" data-i18n="settings.cfgTopology.isContainerLabel">
          <input type="checkbox" id="topocfgIsContainer">
          Ce nœud est une boîte (peut contenir d'autres nœuds)
        </label>
        <label>
          <span data-i18n="settings.cfgTopology.parentBoxLabel">Boîte parente</span>
          <select id="topocfgParent">
            <option value="" data-i18n="settings.cfgTopology.noneFreeNode">Aucune (nœud libre)</option>
          </select>
        </label>
        <div class="netcfg-form-actions">
          <button type="submit" class="dash-btn" data-i18n="grc.common.btnSave">Enregistrer</button>
          <button type="button" class="dash-btn" id="topocfgCancelBtn" data-i18n="grc.common.btnCancel">Annuler</button>
        </div>
      </form>
      <ul class="dash-accordion-list" id="topocfgNodeList"></ul>

      <h2 style="font-size:1rem; margin: 1.4rem 0 0.8rem;" data-i18n="settings.cfgTopology.linksHeading">Liens</h2>
      <form id="topocfgLinkForm">
        <label>
          <span data-i18n="settings.cfgTopology.nodeALabel">Nœud A</span>
          <select id="topocfgLinkA"></select>
        </label>
        <label>
          <span data-i18n="settings.cfgTopology.nodeBLabel">Nœud B</span>
          <select id="topocfgLinkB"></select>
        </label>
        <div class="netcfg-form-actions">
          <button type="submit" class="dash-btn" data-i18n="settings.cfgTopology.addLinkBtn">+ Ajouter le lien</button>
        </div>
      </form>
      <div id="topocfgLinkList"></div>
      ${configIoControlsHtml()}
    `;

    wireConfigIoControls(card, {
      exportFn: exportTopologyConfigAsJson,
      importFn: importTopologyConfigFromJson,
      resetFn: resetTopologyConfig,
      onDone: () => renderTopologyConfigCard(),
      resetConfirm: grcT("settings.cfgTopology.resetConfirm"),
    });

    // Options for "Boîte parente": every container-capable node (seed
    // or custom) except, while editing, the node itself and anything
    // already nested inside it -- picking one of those would nest a
    // box inside its own child (setTopologyNodeParent refuses it too,
    // this just keeps the dropdown from offering it in the first
    // place).
    function populateParentSelect(node) {
      const select = card.querySelector("#topocfgParent");
      const allRefs = getAllTopologyNodeRefs(false);
      const excluded = node ? new Set([node.id, ...getTopologyDescendantIds(node.id, allRefs)]) : new Set();
      select.innerHTML = "";
      const noneOpt = document.createElement("option");
      noneOpt.value = "";
      noneOpt.textContent = grcT("settings.cfgTopology.noneFreeNode");
      select.appendChild(noneOpt);
      allRefs.filter((r) => r.isContainer && !excluded.has(r.id)).forEach((r) => {
        const opt = document.createElement("option");
        opt.value = r.id;
        opt.textContent = (r.depth > 0 ? "— " : "") + r.title;
        select.appendChild(opt);
      });
      select.value = node && node.parentId ? node.parentId : "";
    }

    function showNodeForm(node) {
      editingNodeId = node ? node.id : null;
      pendingIcon = node ? (node.img || null) : null;
      card.querySelector("#topocfgFormTitle").textContent = node ? grcT("settings.cfgNetwork.formTitleEdit") : grcT("settings.cfgNetwork.formTitleAdd");
      card.querySelector("#topocfgTitle").value = node ? node.title : "";
      card.querySelector("#topocfgMeta").value = node ? (node.meta || "") : "";
      card.querySelector("#topocfgUrl").value = node ? (node.url || "") : "";
      card.querySelector("#topocfgIsContainer").checked = node ? !!node.container : false;
      populateParentSelect(node);
      const preview = card.querySelector("#topocfgIconPreview");
      if (pendingIcon) { preview.src = pendingIcon; preview.style.display = ""; }
      else preview.style.display = "none";
      card.querySelector("#topocfgNodeForm").style.display = "";
      card.querySelector("#topocfgAddBtn").style.display = "none";
      card.querySelector("#topocfgFormTitle").scrollIntoView({ behavior: "smooth", block: "center" });
    }

    function hideNodeForm() {
      editingNodeId = null;
      pendingIcon = null;
      card.querySelector("#topocfgNodeForm").reset();
      card.querySelector("#topocfgNodeForm").style.display = "none";
      card.querySelector("#topocfgAddBtn").style.display = "";
    }

    card.querySelector("#topocfgAddBtn").addEventListener("click", () => showNodeForm(null));
    card.querySelector("#topocfgCancelBtn").addEventListener("click", hideNodeForm);

    card.querySelector("#topocfgIcon").addEventListener("change", async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      pendingIcon = await resizeIconFile(file);
      const preview = card.querySelector("#topocfgIconPreview");
      preview.src = pendingIcon;
      preview.style.display = "";
    });

    card.querySelector("#topocfgNodeForm").addEventListener("submit", (e) => {
      e.preventDefault();
      const title = card.querySelector("#topocfgTitle").value.trim();
      if (!title) return;
      const data = {
        title,
        meta: card.querySelector("#topocfgMeta").value.trim(),
        url: card.querySelector("#topocfgUrl").value.trim(),
        container: card.querySelector("#topocfgIsContainer").checked,
      };
      if (pendingIcon) data.img = pendingIcon;
      // parentId goes through setTopologyNodeParent, not the plain
      // merge above -- it's the only path that guards against a cycle
      // (nesting a box inside its own descendant).
      const parentId = card.querySelector("#topocfgParent").value || null;
      const id = editingNodeId || addTopologyCustomNode(data);
      if (editingNodeId) updateTopologyCustomNode(editingNodeId, data);
      setTopologyNodeParent(id, parentId);
      hideNodeForm();
      renderTopologyConfigCard();
    });

    card.querySelector("#topocfgLinkForm").addEventListener("submit", (e) => {
      e.preventDefault();
      const a = card.querySelector("#topocfgLinkA").value;
      const b = card.querySelector("#topocfgLinkB").value;
      addTopologyCustomLink(a, b);
      renderTopologyConfigCard();
    });

    function buildNodeItem(ref) {
      const hidden = ref.seed && getHiddenSeedTopologyIds().includes(ref.id);
      const li = document.createElement("li");
      li.className = "dash-accordion-item" + (ref.id === expandedId ? " open" : "");
      const header = document.createElement("div");
      header.className = "dash-accordion-header";
      // Indented per nesting depth (eg. WinServer IIS sits inside
      // Proxmox inside Switch Nicgiga) so the list reads as a tree
      // instead of a flat, ambiguous list of every box in the schema.
      header.style.paddingLeft = 0.9 + ref.depth * 1.1 + "rem";
      header.innerHTML = `<span></span><span class="chevron">▸</span>`;
      let label = (ref.depth > 0 ? "— " : "") + ref.title;
      if (!ref.seed) label += grcT("settings.cfgTopology.customSuffix");
      if (ref.isContainer) label += grcT("settings.cfgTopology.containerSuffix");
      if (hidden) label += grcT("settings.cfgTopology.hiddenSuffix");
      header.querySelector("span").textContent = label;
      if (hidden) header.style.opacity = "0.5";
      header.onclick = () => {
        expandedId = expandedId === ref.id ? null : ref.id;
        renderTopologyConfigCard();
      };
      li.appendChild(header);

      if (ref.id === expandedId) {
        const body = document.createElement("div");
        body.className = "dash-accordion-body";

        if (ref.seed) {
          const note = document.createElement("p");
          note.className = "netcfg-desc";
          note.style.marginTop = "0.9rem";
          note.textContent = ref.depth === 0
            ? grcT("settings.cfgTopology.seedNodeNote")
            : grcT("settings.cfgTopology.nestedNodeNote");
          body.appendChild(note);

          const renameBtn = document.createElement("div");
          renameBtn.className = "dash-btn dash-btn-block";
          renameBtn.textContent = grcT("settings.cfgCommon.rename");
          renameBtn.onclick = () => {
            const name = prompt(grcT("settings.cfgTopology.renamePrompt"), ref.title);
            if (name === null) return;
            setTopologyTitleOverride(ref.id, name.trim());
            renderTopologyConfigCard();
          };
          body.appendChild(renameBtn);
        } else {
          const note = document.createElement("p");
          note.className = "netcfg-desc";
          note.style.marginTop = "0.9rem";
          note.textContent = ref.parentId
            ? grcT("settings.cfgTopology.freeNodeInBoxNote").replace("{box}", allRefsCache[ref.parentId] ? allRefsCache[ref.parentId].title : ref.parentId)
            : grcT("settings.cfgTopology.freeNodeNote");
          body.appendChild(note);

          const editBtn = document.createElement("div");
          editBtn.className = "dash-btn dash-btn-block";
          editBtn.textContent = grcT("grc.common.btnEdit");
          editBtn.onclick = () => showNodeForm(getTopologyCustomNodes().find((n) => n.id === ref.id));
          body.appendChild(editBtn);

          if (ref.parentId) {
            const removeFromBoxBtn = document.createElement("div");
            removeFromBoxBtn.className = "dash-btn dash-btn-block";
            removeFromBoxBtn.textContent = grcT("settings.cfgTopology.removeFromBox");
            removeFromBoxBtn.onclick = () => {
              setTopologyNodeParent(ref.id, null);
              renderTopologyConfigCard();
            };
            body.appendChild(removeFromBoxBtn);
          }
        }

        const toggleBtn = document.createElement("div");
        toggleBtn.className = "dash-btn dash-btn-block";
        toggleBtn.textContent = ref.seed
          ? (hidden ? grcT("settings.cfgTopology.showNode") : grcT("settings.cfgTopology.hideNode"))
          : grcT("settings.cfgTopology.removeNode");
        toggleBtn.onclick = () => {
          if (ref.seed) {
            setSeedTopologyHidden(ref.id, !hidden);
          } else {
            if (!confirm(grcT("settings.cfgTopology.confirmRemoveNode").replace("{name}", ref.title))) return;
            removeTopologyCustomNode(ref.id);
          }
          if (expandedId === ref.id && !ref.seed) expandedId = null;
          renderTopologyConfigCard();
        };
        body.appendChild(toggleBtn);

        li.appendChild(body);
      }

      return li;
    }

    function buildLinkRow(link, refsById) {
      const row = document.createElement("div");
      row.className = "netcfg-node-row";
      const info = document.createElement("div");
      info.className = "netcfg-node-info";
      const title = document.createElement("div");
      title.className = "netcfg-node-title";
      const titleA = refsById[link.a] ? refsById[link.a].title : "?";
      const titleB = refsById[link.b] ? refsById[link.b].title : "?";
      title.textContent = titleA + " — " + titleB;
      info.appendChild(title);
      row.appendChild(info);

      const actions = document.createElement("div");
      actions.className = "netcfg-node-actions";
      const deleteBtn = document.createElement("button");
      deleteBtn.type = "button";
      deleteBtn.className = "dash-btn dash-btn-block";
      deleteBtn.textContent = grcT("grc.common.btnDelete");
      deleteBtn.onclick = () => {
        removeTopologyCustomLink(link.id);
        renderTopologyConfigCard();
      };
      actions.appendChild(deleteBtn);
      row.appendChild(actions);
      return row;
    }

    window.renderTopologyConfigCard = function () {
      const allRefs = getAllTopologyNodeRefs(true);
      const linkableRefs = getAllTopologyNodeRefs(false);
      allRefsCache = {};
      allRefs.forEach((r) => { allRefsCache[r.id] = r; });

      const nodeList = card.querySelector("#topocfgNodeList");
      nodeList.innerHTML = "";
      allRefs.forEach((ref) => nodeList.appendChild(buildNodeItem(ref)));

      [card.querySelector("#topocfgLinkA"), card.querySelector("#topocfgLinkB")].forEach((select) => {
        const previous = select.value;
        select.innerHTML = "";
        linkableRefs.forEach((ref) => {
          const opt = document.createElement("option");
          opt.value = ref.id;
          opt.textContent = (ref.depth > 0 ? "— " : "") + ref.title;
          select.appendChild(opt);
        });
        if (linkableRefs.some((r) => r.id === previous)) select.value = previous;
      });

      const linkList = card.querySelector("#topocfgLinkList");
      linkList.innerHTML = "";
      const links = getTopologyCustomLinks();
      if (!links.length) {
        const empty = document.createElement("p");
        empty.className = "netcfg-desc";
        empty.textContent = grcT("settings.cfgTopology.noCustomLink");
        linkList.appendChild(empty);
      } else {
        links.forEach((link) => linkList.appendChild(buildLinkRow(link, allRefsCache)));
      }
    };

    renderTopologyConfigCard();
  }
  setupTopologyConfigCard();

  // ============================================================
  // CONFIG ABOUT -- edit the About page's permit content and link list
  // (assets/script/about-config.js). config/about.js stays the default
  // until the first Save here, exactly like the other *-config.js
  // registries above -- see getAboutConfig()'s own comment for why a
  // save replaces the whole object rather than merging.
  // ============================================================
  (function () {
    const card = document.getElementById("aboutConfigCard");
    let editingLinkId = null;

    card.innerHTML = `
      <h1>Config About</h1>
      <p class="netcfg-desc" data-i18n="settings.cfgAbout.desc">
        Personnalise le contenu de la page About (permis affiché, liens
        pro) -- remplace config/about.js dès que tu sauvegardes ici.
      </p>
      <form id="aboutcfgPermitForm">
        <label data-i18n="settings.cfgAbout.fieldHeader">En-tête <input type="text" id="aboutcfgHeader"></label>
        <label data-i18n="settings.cfgField.title">Titre <input type="text" id="aboutcfgTitle"></label>
        <label data-i18n="settings.cfgAbout.fieldText">Texte <textarea id="aboutcfgText" rows="3" style="width:100%; background:#1e1e1e; border:1px solid #444; border-radius:8px; color:#f5f5f5; font-family:inherit; font-size:0.85rem; padding:0.5rem 0.7rem; box-sizing:border-box;"></textarea></label>
        <label data-i18n="settings.cfgAbout.fieldIdField">ID affiché <input type="text" id="aboutcfgIdField"></label>
        <label data-i18n="settings.cfgAbout.fieldQr">Image QR (chemin) <input type="text" id="aboutcfgQr"></label>
        <label data-i18n="settings.cfgAbout.fieldBarcode">Image code-barres (chemin, optionnel) <input type="text" id="aboutcfgBarcode"></label>
        <label data-i18n="settings.cfgAbout.fieldBackground">Fond d'écran de cette page (chemin) <input type="text" id="aboutcfgBackground"></label>
        <div class="netcfg-form-actions">
          <button type="submit" class="dash-btn" data-i18n="grc.common.btnSave">Enregistrer</button>
        </div>
      </form>

      <h2 style="margin-top:1.2rem;" data-i18n="settings.cfgTopology.linksHeading">Liens</h2>
      <div class="dash-btn dash-btn-block" id="aboutcfgAddLinkBtn" data-i18n="settings.cfgWebsite.addLink">+ Ajouter un lien</div>
      <form id="aboutcfgLinkForm" style="display:none">
        <h2 id="aboutcfgLinkFormTitle" data-i18n="settings.cfgWebsite.formTitleAddLink">Ajouter un lien</h2>
        <label data-i18n="settings.cfgAbout.fieldLabel">Libellé <input type="text" id="aboutcfgLinkLabel" required></label>
        <label data-i18n="settings.cfgField.url">URL <input type="text" id="aboutcfgLinkUrl" required></label>
        <label class="toggle-row"><span data-i18n="settings.cfgAbout.fieldVisible">Visible</span> <input type="checkbox" id="aboutcfgLinkEnabled" checked></label>
        <div class="netcfg-form-actions">
          <button type="submit" class="dash-btn" data-i18n="grc.common.btnSave">Enregistrer</button>
          <button type="button" class="dash-btn" id="aboutcfgLinkCancelBtn" data-i18n="grc.common.btnCancel">Annuler</button>
        </div>
      </form>
      <div id="aboutcfgLinksList"></div>
      ${configIoControlsHtml()}
    `;

    wireConfigIoControls(card, {
      exportFn: exportAboutConfigAsJson,
      importFn: importAboutConfigFromJson,
      resetFn: resetAboutConfig,
      onDone: () => renderAboutConfigCard(),
      resetConfirm: grcT("settings.cfgAbout.resetConfirm"),
    });

    function fillPermitForm() {
      const cfg = getAboutConfig();
      card.querySelector("#aboutcfgHeader").value = cfg.permit.header || "";
      card.querySelector("#aboutcfgTitle").value = cfg.permit.title || "";
      card.querySelector("#aboutcfgText").value = cfg.permit.text || "";
      card.querySelector("#aboutcfgIdField").value = cfg.permit.id || "";
      card.querySelector("#aboutcfgQr").value = cfg.permit.qrImage || "";
      card.querySelector("#aboutcfgBarcode").value = cfg.permit.barcodeImage || "";
      card.querySelector("#aboutcfgBackground").value = cfg.background || "";
    }

    card.querySelector("#aboutcfgPermitForm").addEventListener("submit", (e) => {
      e.preventDefault();
      updateAboutPermit({
        header: card.querySelector("#aboutcfgHeader").value.trim(),
        title: card.querySelector("#aboutcfgTitle").value.trim(),
        text: card.querySelector("#aboutcfgText").value.trim(),
        id: card.querySelector("#aboutcfgIdField").value.trim(),
        qrImage: card.querySelector("#aboutcfgQr").value.trim() || null,
        barcodeImage: card.querySelector("#aboutcfgBarcode").value.trim() || null,
      });
      updateAboutBackground(card.querySelector("#aboutcfgBackground").value.trim());
      alert(grcT("settings.cfgAbout.savedAlert"));
    });

    function showLinkForm(link) {
      editingLinkId = link ? link.id : null;
      card.querySelector("#aboutcfgLinkFormTitle").textContent = link ? grcT("settings.cfgWebsite.formTitleEditLink") : grcT("settings.cfgWebsite.formTitleAddLink");
      card.querySelector("#aboutcfgLinkLabel").value = link ? link.label : "";
      card.querySelector("#aboutcfgLinkUrl").value = link ? link.url : "";
      card.querySelector("#aboutcfgLinkEnabled").checked = link ? link.enabled !== false : true;
      card.querySelector("#aboutcfgLinkForm").style.display = "";
      card.querySelector("#aboutcfgAddLinkBtn").style.display = "none";
    }

    function hideLinkForm() {
      editingLinkId = null;
      card.querySelector("#aboutcfgLinkForm").reset();
      card.querySelector("#aboutcfgLinkForm").style.display = "none";
      card.querySelector("#aboutcfgAddLinkBtn").style.display = "";
    }

    card.querySelector("#aboutcfgAddLinkBtn").addEventListener("click", () => showLinkForm(null));
    card.querySelector("#aboutcfgLinkCancelBtn").addEventListener("click", hideLinkForm);

    card.querySelector("#aboutcfgLinkForm").addEventListener("submit", (e) => {
      e.preventDefault();
      const label = card.querySelector("#aboutcfgLinkLabel").value.trim();
      const url = card.querySelector("#aboutcfgLinkUrl").value.trim();
      if (!label || !url) return;
      const data = { label, url, enabled: card.querySelector("#aboutcfgLinkEnabled").checked };
      if (editingLinkId) updateAboutLink(editingLinkId, data);
      else addAboutLink(data);
      hideLinkForm();
      renderAboutConfigCard();
    });

    function buildLinkRow(link) {
      const row = document.createElement("div");
      row.className = "netcfg-node-row";
      const info = document.createElement("div");
      info.className = "netcfg-node-info";
      const title = document.createElement("div");
      title.className = "netcfg-node-title";
      title.textContent = link.label + (link.enabled === false ? grcT("settings.cfgTopology.hiddenSuffix") : "");
      info.appendChild(title);
      const sub = document.createElement("div");
      sub.className = "netcfg-node-sub";
      sub.textContent = link.url;
      info.appendChild(sub);
      row.appendChild(info);

      const actions = document.createElement("div");
      actions.className = "netcfg-node-actions";
      const editBtn = document.createElement("button");
      editBtn.type = "button";
      editBtn.className = "dash-btn dash-btn-block";
      editBtn.textContent = grcT("grc.common.btnEdit");
      editBtn.onclick = () => showLinkForm(link);
      actions.appendChild(editBtn);
      const deleteBtn = document.createElement("button");
      deleteBtn.type = "button";
      deleteBtn.className = "dash-btn dash-btn-block";
      deleteBtn.textContent = grcT("grc.common.btnDelete");
      deleteBtn.onclick = () => {
        if (!confirm(grcT("settings.cfgWebsite.confirmDeleteLink").replace("{name}", link.label))) return;
        removeAboutLink(link.id);
        if (editingLinkId === link.id) hideLinkForm();
        renderAboutConfigCard();
      };
      actions.appendChild(deleteBtn);
      row.appendChild(actions);
      return row;
    }

    window.renderAboutConfigCard = function () {
      fillPermitForm();
      const list = card.querySelector("#aboutcfgLinksList");
      list.innerHTML = "";
      getAboutConfig().links.forEach((link) => list.appendChild(buildLinkRow(link)));
    };

    renderAboutConfigCard();
  })();

  // ============================================================
  // CHIFFREMENT -- optional at-rest encryption for Network/Topology/GRC
  // data (TODOSecurityStandpoint.txt #3). config/encryption.js's
  // "enabled" flag only decides whether this card offers to set one up;
  // the vault itself only exists once vaultSetup() below actually runs.
  // Mechanics live in assets/script/vault-crypto.js / vault.js -- this
  // is presentation only, same vaultGateOr() pattern as the two cards
  // above when a vault is set up but this tab hasn't unlocked it yet.
  // ============================================================
  function setupVaultConfigCard() {
    const card = document.getElementById("vaultConfigCard");

    if (!vaultIsFeatureEnabled()) {
      card.innerHTML = `
        <h1 data-i18n="settings.vault.title">Chiffrement</h1>
        <p class="netcfg-desc" data-i18n="settings.vault.disabledDesc">
          Désactivé dans la configuration (config/encryption.js). Passe
          "enabled" à true dans ce fichier pour faire apparaître ici la
          mise en place d'un coffre chiffré pour Network, Topology et GRC.
        </p>
      `;
      return;
    }

    if (vaultGateOr(card, setupVaultConfigCard)) return;

    if (!vaultIsSetUp()) {
      renderVaultSetupForm();
    } else {
      renderVaultUnlockedStatus();
    }

    function renderVaultSetupForm() {
      const levelOptions = Object.keys(VAULT_LEVELS)
        .map((key) => `<option value="${key}"${key === "standard" ? " selected" : ""}>${grcT(VAULT_LEVELS[key].i18nKey)}</option>`)
        .join("");
      card.innerHTML = `
        <h1 data-i18n="settings.vault.title">Chiffrement</h1>
        <p class="netcfg-desc" data-i18n="settings.vault.setupDesc">
          Chiffre les données Network, Topology et GRC (adresses,
          topologie, cases cochées/notes) directement dans ce navigateur
          avec un mot de passe que toi seul connais -- protège en cas de
          vol/perte de l'appareil ou d'accès physique, pas contre une
          session déjà compromise en direct (XSS, malware). Rien n'est
          jamais envoyé nulle part. Vérifié sur Chromium et Firefox
          (versions stables), en http:// comme en file://.
        </p>
        <p class="netcfg-desc" style="color:#ffd76a;" data-i18n="settings.vault.setupWarning">
          ⚠️ Mot de passe oublié = données perdues, sans recours : aucun
          compte, aucune récupération possible. NeonFlare ne le stocke
          nulle part -- mais si tu veux qu'il ne vive que dans ta tête,
          refuse toute proposition d'enregistrement du navigateur ou d'un
          gestionnaire de mots de passe.
        </p>
        <form id="vaultSetupForm">
          <label data-i18n="settings.vault.fieldLevel">Niveau
            <select id="vaultSetupLevel">${levelOptions}</select>
          </label>
          <label data-i18n="settings.vault.fieldPassword">Mot de passe
            <input type="password" id="vaultSetupPass" class="vault-unlock-pass" autocomplete="new-password" required>
          </label>
          <label data-i18n="settings.vault.fieldConfirmPassword">Confirmer le mot de passe
            <input type="password" id="vaultSetupPassConfirm" class="vault-unlock-pass" autocomplete="new-password" required>
          </label>
          <p class="vault-unlock-error" id="vaultSetupError" style="display:none"></p>
          <div class="netcfg-form-actions">
            <button type="submit" class="dash-btn" data-i18n="settings.vault.enableBtn">Activer le chiffrement</button>
          </div>
        </form>
      `;

      card.querySelector("#vaultSetupForm").addEventListener("submit", async (e) => {
        e.preventDefault();
        const pass = card.querySelector("#vaultSetupPass").value;
        const confirmPass = card.querySelector("#vaultSetupPassConfirm").value;
        const errorEl = card.querySelector("#vaultSetupError");
        if (pass.length < 8) {
          errorEl.textContent = grcT("settings.vault.errPasswordTooShort");
          errorEl.style.display = "";
          return;
        }
        if (pass !== confirmPass) {
          errorEl.textContent = grcT("settings.vault.errPasswordMismatch");
          errorEl.style.display = "";
          return;
        }
        const level = card.querySelector("#vaultSetupLevel").value;
        const submitBtn = card.querySelector("#vaultSetupForm button[type=submit]");
        submitBtn.disabled = true;
        try {
          await vaultSetup(pass, level);
        } catch (err) {
          // vaultSetup() is atomic and rolls back on failure (typically a
          // localStorage QuotaExceededError -- encrypting inflates the
          // stored size), so the data is untouched. Just tell the user
          // instead of leaving the form silently stuck.
          errorEl.textContent = (err && err.name === "QuotaExceededError")
            ? grcT("settings.vault.errQuotaExceeded")
            : grcT("settings.vault.errSetupFailed").replace("{msg}", (err && err.message) || err);
          errorEl.style.display = "";
          submitBtn.disabled = false;
          return;
        }
        setupVaultConfigCard();
      });
    }

    function renderVaultUnlockedStatus() {
      const meta = vaultGetMeta();
      const level = VAULT_LEVELS[meta && meta.level] || VAULT_LEVELS.standard;
      card.innerHTML = `
        <h1 data-i18n="settings.vault.title">Chiffrement</h1>
        <p class="netcfg-desc">${grcT("settings.vault.unlockedStatus").replace("{level}", grcT(level.i18nKey))}</p>
        <div class="dash-btn dash-btn-block" id="vaultLockBtn" data-i18n="settings.vault.lockBtn">Verrouiller</div>
        <hr>
        <p class="netcfg-desc" data-i18n="settings.vault.disableDesc">
          Désactiver retire le chiffrement -- Network, Topology et GRC
          repassent en clair dans ce navigateur.
        </p>
        <form id="vaultDisableForm" autocomplete="off">
          <label data-i18n="settings.vault.fieldPassword">Mot de passe
            <input type="password" id="vaultDisablePass" class="vault-unlock-pass" name="nf-vault-passphrase" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" data-lpignore="true" data-1p-ignore="true" data-bwignore="true" data-form-type="other" required>
          </label>
          <p class="vault-unlock-error" id="vaultDisableError" style="display:none"></p>
          <div class="netcfg-form-actions">
            <button type="submit" class="dash-btn" data-i18n="settings.vault.disableBtn">Désactiver le chiffrement</button>
          </div>
        </form>
      `;

      card.querySelector("#vaultLockBtn").addEventListener("click", () => {
        vaultLock();
        setupVaultConfigCard();
        setupNetworkConfigCard();
        setupTopologyConfigCard();
      });

      card.querySelector("#vaultDisableForm").addEventListener("submit", async (e) => {
        e.preventDefault();
        const pass = card.querySelector("#vaultDisablePass").value;
        const errorEl = card.querySelector("#vaultDisableError");
        const ok = await vaultDisable(pass);
        if (!ok) {
          errorEl.textContent = grcT("settings.vault.errWrongPassword");
          errorEl.style.display = "";
          return;
        }
        setupVaultConfigCard();
        setupNetworkConfigCard();
        setupTopologyConfigCard();
      });
    }
  }
  setupVaultConfigCard();

  // ============================================================
  // VERSION -- config/version.js (TODOFinition.txt #4) is the single
  // source of truth (window.NEONFLARE_VERSION, bumped by hand at each
  // release) ; own nav section (below Sécurité), not tucked next to an
  // unrelated card, so it's actually findable.
  // ============================================================
  function setupVersionConfigCard() {
    const card = document.getElementById("versionConfigCard");
    card.innerHTML = `
      <h1 data-i18n="settings.cfgVersion.title">Version</h1>
      <p class="netcfg-version-current">NeonFlare v${grkEscapeHtml(window.NEONFLARE_VERSION || "?")}</p>
      <p class="netcfg-desc" data-i18n="settings.cfgVersion.desc">
        Numéro de version courant de cette copie de NeonFlare, lu depuis
        config/version.js.
      </p>
    `;
  }
  setupVersionConfigCard();

  // GRC checklist percentages (progress bars + card badges on grc/*.html
  // and grc/securite/* pages) -- read directly there via
  // applyGrcPercentageSetting() in grc-checklist.js, same reasoning as
  // every other setting on this page: those pages don't share a frame
  // with settings.html, so this just needs to persist.
  const GRC_SHOW_PERCENTAGE_KEY = "/settings.html/grcShowPercentage";

  (function initGrcPercentageToggle() {
    const saved = localStorage.getItem(GRC_SHOW_PERCENTAGE_KEY);
    document.getElementById("grcShowPercentageToggle").checked = saved !== "false";
  })();

  function setGrcShowPercentage(visible) {
    localStorage.setItem(GRC_SHOW_PERCENTAGE_KEY, visible ? "true" : "false");
  }

  // "Ton nom" for the GRC change-log (TODOSecurityStandpoint.txt #2) --
  // read directly by grc-checklist.js's grcAuthorName() on every GRC
  // page, same reasoning as every other setting here: no shared frame,
  // so this just needs to persist.
  const GRC_AUTHOR_KEY = "/settings.html/grcAuthor";

  (function initGrcAuthorInput() {
    const saved = localStorage.getItem(GRC_AUTHOR_KEY);
    // Shows config/grc-author.js's default when nothing's been saved yet
    // -- same seed-vs-localStorage split as every other config-backed
    // field on this page. Left as a placeholder rather than the input's
    // value: leaving it untouched means localStorage never gets a key
    // written, so grcAuthorName() in grc-checklist.js keeps reading the
    // config default too -- typing anything here overrides it for good.
    const input = document.getElementById("grcAuthorInput");
    if (saved !== null) {
      input.value = saved;
    } else if (typeof grcAuthorConfig !== "undefined" && grcAuthorConfig.defaultName) {
      input.placeholder = grcAuthorConfig.defaultName;
    }
  })();

  function setGrcAuthor(name) {
    localStorage.setItem(GRC_AUTHOR_KEY, name);
  }


  // ============================================================
  // EVENT WIRING -- converted from inline on*="" attributes for CSP
  // script-src 'self' (PlanDurcissement-Securite.txt P1.2). Grouped here
  // rather than inline at each element's definition above, since this
  // whole file used to be the page's single inline <script> and the
  // functions/ids below are defined throughout it.
  // ============================================================

  // Nav sidebar: 10 <li>, 3 of them sharing data-section="registres"
  // (delegated on the shared <ul> rather than 10 individual listeners).
  document.querySelector(".settings-nav-list").addEventListener("click", (e) => {
    const li = e.target.closest(".settings-nav-item");
    if (!li) return;
    showSettingsSection(li.dataset.section, li);
    if (li.dataset.section === "registres") filterRegistryGroup(li.dataset.registryGroup || null);
  });

  // Theme picker: 5 .theme-option[data-theme] cards.
  document.querySelectorAll(".theme-option[data-theme]").forEach((el) => {
    el.addEventListener("click", () => setTheme(el.dataset.theme));
  });

  // Custom accent color picker (inside the "custom" theme card): stop the
  // click from also triggering the card's own setTheme('custom'), and
  // apply the color live as it's dragged.
  document.getElementById("customAccentPicker").addEventListener("click", (e) => e.stopPropagation());
  document.getElementById("customAccentPicker").addEventListener("input", (e) => setCustomAccent(e.target.value));

  // Sidebar tagline overrides, one input per language.
  document.getElementById("sidebarTaglineInput_fr").addEventListener("input", (e) => setSidebarTagline("fr", e.target.value));
  document.getElementById("sidebarTaglineInput_en").addEventListener("input", (e) => setSidebarTagline("en", e.target.value));

  // Assistant de configuration.
  document.getElementById("relaunchOnboardingBtn").addEventListener("click", relaunchOnboardingWizard);
  document.getElementById("settingsExportAllBtn").addEventListener("click", settingsExportAllAsJson);
  document.getElementById("settingsImportAllBtn").addEventListener("click", () => document.getElementById("settingsImportAllFile").click());
  document.getElementById("settingsImportAllFile").addEventListener("change", (e) => settingsHandleImportAllFile(e.target));

  // Réinitialiser un registre -- 20 registries + "Tout réinitialiser".
  // Reuses settings.registryName.* (the same plain name shown on each
  // row) rather than a separate "le/la ..." phrase per registry --
  // settings.assistant.confirmResetOne/resetOneDoneAlert supply the
  // surrounding sentence once instead of needing 20 more paired keys.
  document.getElementById("resetNetworkBtn").addEventListener("click", () => settingsConfirmReset(grcT("settings.registryName.network"), resetNetworkNodes));
  document.getElementById("resetToolsBtn").addEventListener("click", () => settingsConfirmReset(grcT("settings.registryName.tools"), resetToolsConfig));
  document.getElementById("resetDevSecOpsBtn").addEventListener("click", () => settingsConfirmReset(grcT("settings.registryName.devsecops"), resetDevSecOpsConfig));
  document.getElementById("resetWebsiteBtn").addEventListener("click", () => settingsConfirmReset(grcT("settings.registryName.website"), resetWebsiteConfig));
  document.getElementById("resetTopologyBtn").addEventListener("click", () => settingsConfirmReset(grcT("settings.registryName.topology"), resetTopologyConfig));
  document.getElementById("resetAboutBtn").addEventListener("click", () => settingsConfirmReset(grcT("settings.registryName.about"), resetAboutConfig));
  document.getElementById("resetGrcChecklistBtn").addEventListener("click", () => settingsConfirmReset(grcT("settings.registryName.grcChecklist"), () => resetGrcData(null, () => {})));
  document.getElementById("resetGrcAssetsBtn").addEventListener("click", () => settingsConfirmReset(grcT("settings.registryName.assets"), resetGrcAssets));
  document.getElementById("resetGrcRisksBtn").addEventListener("click", () => settingsConfirmReset(grcT("settings.registryName.risks"), resetGrcRisks));
  document.getElementById("resetGrcControlsBtn").addEventListener("click", () => settingsConfirmReset(grcT("settings.registryName.controls"), resetGrcControls));
  document.getElementById("resetGrcIncidentsBtn").addEventListener("click", () => settingsConfirmReset(grcT("settings.registryName.incidents"), resetGrcIncidents));
  document.getElementById("resetGrcContinuityBtn").addEventListener("click", () => settingsConfirmReset(grcT("settings.registryName.continuity"), resetGrcContinuity));
  document.getElementById("resetGrcSuppliersBtn").addEventListener("click", () => settingsConfirmReset(grcT("settings.registryName.suppliers"), resetGrcSuppliers));
  document.getElementById("resetGrcVulnsBtn").addEventListener("click", () => settingsConfirmReset(grcT("settings.registryName.vulns"), resetGrcVulns));
  document.getElementById("resetGrcPrivacyBtn").addEventListener("click", () => settingsConfirmReset(grcT("settings.registryName.privacy"), resetGrcPrivacy));
  document.getElementById("resetGrcComplianceBtn").addEventListener("click", () => settingsConfirmReset(grcT("settings.registryName.compliance"), resetGrcCompliance));
  document.getElementById("resetGrcAccessReviewsBtn").addEventListener("click", () => settingsConfirmReset(grcT("settings.registryName.accessReviews"), resetGrcAccessReviews));
  document.getElementById("resetGrcMetricsBtn").addEventListener("click", () => settingsConfirmReset(grcT("settings.registryName.metrics"), resetGrcMetrics));
  document.getElementById("resetGrcDocumentsBtn").addEventListener("click", () => settingsConfirmReset(grcT("settings.registryName.documents"), resetGrcDocuments));
  document.getElementById("resetPentestBtn").addEventListener("click", () => settingsConfirmReset(grcT("settings.registryName.pentest"), resetPentestEngagements));
  document.getElementById("resetEverythingBtn").addEventListener("click", settingsResetEverything);

  // Interface > Pages visibles -- 6 checkboxes, all data-page[...] already.
  document.querySelectorAll("input[data-page]").forEach((input) => {
    input.addEventListener("change", () => setPageVisible(input.dataset.page, input.checked));
  });

  // GRC & Shells tab.
  document.getElementById("grcShowPercentageToggle").addEventListener("change", (e) => setGrcShowPercentage(e.target.checked));
  document.getElementById("grcAuthorInput").addEventListener("input", (e) => setGrcAuthor(e.target.value));
  document.getElementById("shellOpacitySlider").addEventListener("input", (e) => setShellOpacity(e.target.value));

  // Langue: 2 .theme-option[data-lang] cards.
  document.querySelectorAll(".theme-option[data-lang]").forEach((el) => {
    el.addEventListener("click", () => setLang(el.dataset.lang));
  });

  // Fresh load with a saved language already != fr (not a live switch --
  // reported 2026-09-11, screenshots showed the Registres cards still in
  // French while the nav around them was already English): the early
  // applyI18n(savedLang) call near the top of this file runs before any
  // of the cards above exist yet, so it can only translate what's
  // already static HTML at that point. One more pass here, now that
  // every card/list in the page has actually been built, catches them
  // -- same data-i18n scan, just re-run after the fact instead of
  // relying on the user toggling the language once to trigger it.
  applyI18n(getSavedLang());
