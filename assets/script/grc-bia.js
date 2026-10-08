/* Registre BIA PAR PROCESSUS (spec/grc-bia-register/ BP2).

   Le BIA (bilan d'impact sur l'activité) est ici un registre à part entière,
   indépendant des plans : chaque entrée = un PROCESSUS critique avec sa
   criticité, ses objectifs de reprise (DMIA/MTPD, MAO, RTO, RPO, MBCO), ses
   impacts dans le temps et ses dépendances (marquage SPOF). Les plans s'y
   relieront (champ « BIA lié », BP4).

   Store /grc/bia/registry. On réutilise largement grc-continuity.js (chargé
   avant) : GRC_CONT_CRITICALITY, grcContCriticalityBadge, cont* (durées),
   grcContCoherence / grcContRtoGap, grkId / grkNumOrNull / grkDecimalOrNull /
   grkEscapeHtml. Le panneau détaillé (impacts dans le temps, dépendances/SPOF)
   est rendu par grc-bia-panel.js (BP3). Aucun fetch(). */

const GRC_BIA_KEY = "/grc/bia/registry";

/* ---------- store ---------------------------------------------------- */

function getGrcBia() {
  try {
    const raw = vaultGetItem(GRC_BIA_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function saveGrcBia(list) {
  vaultSetItem(GRC_BIA_KEY, JSON.stringify(list));
}

function addGrcBiaProcess(proc) {
  const list = getGrcBia();
  const shaped = grcBiaEnsureShape(proc || {});
  shaped.id = "bia-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  list.push(shaped);
  saveGrcBia(list);
  return shaped.id;
}

function updateGrcBiaProcess(id, changes) {
  const list = getGrcBia();
  const idx = list.findIndex((p) => p.id === id);
  if (idx === -1) return;
  list[idx] = Object.assign({}, list[idx], changes);
  saveGrcBia(list);
}

function removeGrcBiaProcess(id) {
  saveGrcBia(getGrcBia().filter((p) => p.id !== id));
}

function resetGrcBia() {
  vaultRemoveItem(GRC_BIA_KEY);
}

/* ---------- modèle : forme garantie ---------------------------------- */

// Copie bien formée (ne sauve pas). Mêmes sous-structures BIA que le plan de
// continuité (schema 2) pour que le panneau réutilise les helpers cont*.
function grcBiaEnsureShape(proc) {
  const src = proc && typeof proc === "object" ? proc : {};
  const bia = src.bia && typeof src.bia === "object" ? src.bia : {};
  return {
    id: typeof src.id === "string" ? src.id : "",
    schema: 1,
    label: typeof src.label === "string" ? src.label : "",
    // Lien vers la cartographie des processus (Contexte).
    processId: typeof src.processId === "string" ? src.processId : "",
    owner: typeof src.owner === "string" ? src.owner : "",
    criticality: GRC_CONT_CRITICALITY.indexOf(src.criticality) !== -1 ? src.criticality : "important",
    bia: {
      mtdMin: grkNumOrNull(bia.mtdMin),
      rtoMin: grkNumOrNull(bia.rtoMin),
      rpoMin: grkNumOrNull(bia.rpoMin),
      maoMin: grkNumOrNull(bia.maoMin),
      mbco: typeof bia.mbco === "string" ? bia.mbco : "",
      mbcoPct: grkDecimalOrNull(bia.mbcoPct, 0, 100),
      impacts: typeof bia.impacts === "string" ? bia.impacts : "",
      peakPeriods: typeof bia.peakPeriods === "string" ? bia.peakPeriods : "",
      // Justification des chiffres (pourquoi ces DMIA / RTO / RPO / MBCO).
      rationale: typeof bia.rationale === "string" ? bia.rationale : "",
      timeline: Array.isArray(bia.timeline) ? bia.timeline.filter((t) => t && typeof t === "object").map((t) => ({
        id: typeof t.id === "string" ? t.id : grkId("hz"),
        horizonMin: grkNumOrNull(t.horizonMin),
        financier: _biaLevel(t.financier), operationnel: _biaLevel(t.operationnel),
        reputation: _biaLevel(t.reputation), legal: _biaLevel(t.legal), humain: _biaLevel(t.humain),
        level: _biaLevel(t.level) || Math.max.apply(null, GRC_CONT_IMPACT_KINDS.map((k) => _biaLevel(t[k]))),
        note: typeof t.note === "string" ? t.note : "",
      })).sort((a, b) => (a.horizonMin || 0) - (b.horizonMin || 0)) : [],
      // Ressources nécessaires dans le temps (même forme que le plan).
      resources: Array.isArray(bia.resources) ? bia.resources.filter((r) => r && typeof r === "object").map((r) => ({
        id: typeof r.id === "string" ? r.id : grkId("res"),
        kind: GRC_CONT_RES_KINDS.indexOf(r.kind) !== -1 ? r.kind : "other",
        roleId: typeof r.roleId === "string" ? r.roleId : "",
        assetId: typeof r.assetId === "string" ? r.assetId : "",
        supplierId: typeof r.supplierId === "string" ? r.supplierId : "",
        label: typeof r.label === "string" ? r.label : "",
        quantity: typeof r.quantity === "string" ? r.quantity : "",
        horizonMin: grkNumOrNull(r.horizonMin),
      })) : [],
    },
    dependencies: Array.isArray(src.dependencies)
      ? src.dependencies.map((d) => Object.assign({}, d, { spof: !!(d && d.spof) }))
      : [],
  };
}

function _biaLevel(v) {
  const n = Math.round(Number(v));
  return Number.isFinite(n) && n >= 1 && n <= 5 ? n : 0;
}

// Mutation atomique (id préservé), renvoie ce que fn renvoie.
function biaMutate(id, fn) {
  const list = getGrcBia();
  const idx = list.findIndex((p) => p.id === id);
  if (idx === -1) return null;
  const ensured = grcBiaEnsureShape(list[idx]);
  ensured.id = list[idx].id;
  const out = fn(ensured);
  list[idx] = ensured;
  saveGrcBia(list);
  return out === undefined ? null : out;
}

function grcBiaSetCore(id, changes) {
  return biaMutate(id, (p) => {
    if ("label" in changes && typeof changes.label === "string") p.label = changes.label.trim();
    if ("processId" in changes && typeof changes.processId === "string") p.processId = changes.processId;
    if ("owner" in changes && typeof changes.owner === "string") p.owner = changes.owner.trim();
    if ("criticality" in changes && GRC_CONT_CRITICALITY.indexOf(changes.criticality) !== -1) p.criticality = changes.criticality;
    return true;
  });
}

function grcBiaSetBia(id, changes) {
  return biaMutate(id, (p) => {
    const b = p.bia;
    ["mtdMin", "rtoMin", "rpoMin", "maoMin"].forEach((k) => {
      if (k in changes) b[k] = grkNumOrNull(changes[k]);
    });
    if ("mbco" in changes && typeof changes.mbco === "string") b.mbco = changes.mbco;
    if ("mbcoPct" in changes) b.mbcoPct = grkDecimalOrNull(changes.mbcoPct, 0, 100);
    if ("impacts" in changes && typeof changes.impacts === "string") b.impacts = changes.impacts;
    if ("peakPeriods" in changes && typeof changes.peakPeriods === "string") b.peakPeriods = changes.peakPeriods;
    if ("rationale" in changes && typeof changes.rationale === "string") b.rationale = changes.rationale;
    return true;
  });
}

// Timeline d'impacts (panneau BP3) -- même contrat que grcContSetTimeline.
function grcBiaSetTimeline(id, rows) {
  return biaMutate(id, (p) => {
    // `level` = max des natures s'il manque : la chaîne GRC (T18/T23) lit le
    // stockage brut, sans passer par grcBiaEnsureShape.
    p.bia.timeline = (Array.isArray(rows) ? rows : []).map((t) => {
      const r = Object.assign({}, t, { id: t.id || grkId("hz") });
      r.level = _biaLevel(r.level) || Math.max.apply(null, GRC_CONT_IMPACT_KINDS.map((k) => _biaLevel(r[k])));
      return r;
    });
    return true;
  });
}

// Ressources nécessaires (panneau BP3) -- même contrat que grcContSetResources.
function grcBiaSetResources(id, rows) {
  return biaMutate(id, (p) => {
    p.bia.resources = (Array.isArray(rows) ? rows : []).map((r) => Object.assign({ id: r.id || grkId("res") }, r));
    return true;
  });
}

/* ---------- sous-liste : dépendances (avec SPOF) -------------------- */

function grcBiaAddDependency(id, dep) {
  return biaMutate(id, (p) => {
    const d = {
      id: grkId("dep"),
      type: dep && GRC_CONT_DEP_TYPES.indexOf(dep.type) !== -1 ? dep.type : "asset",
      ref: dep && typeof dep.ref === "string" ? dep.ref : "",
      targetId: dep && typeof dep.targetId === "string" ? dep.targetId : "",
      note: dep && typeof dep.note === "string" ? dep.note : "",
      spof: !!(dep && dep.spof),
    };
    p.dependencies.push(d);
    return d.id;
  });
}

function grcBiaUpdateDependency(id, depId, changes) {
  return biaMutate(id, (p) => {
    const d = p.dependencies.find((x) => x.id === depId);
    if (!d) return false;
    const n = Object.assign({}, changes);
    if ("type" in n && GRC_CONT_DEP_TYPES.indexOf(n.type) === -1) delete n.type;
    if ("spof" in n) n.spof = !!n.spof;
    Object.assign(d, n);
    return true;
  });
}

function grcBiaRemoveDependency(id, depId) {
  return biaMutate(id, (p) => {
    const before = p.dependencies.length;
    p.dependencies = p.dependencies.filter((x) => x.id !== depId);
    return p.dependencies.length < before;
  });
}

/* ---------- dérivés + synthèse -------------------------------------- */

function grcBiaSpofCount(p) {
  return (p && Array.isArray(p.dependencies) ? p.dependencies : []).filter((d) => d && d.spof).length;
}

// DMIA suggérée : premier horizon où un impact devient inacceptable (N2).
function grcBiaSuggestedMtd(p) {
  const tl = p && p.bia && Array.isArray(p.bia.timeline) ? p.bia.timeline : [];
  const hit = tl.filter((t) => t.horizonMin != null && t.level >= GRC_CONT_UNACCEPTABLE)
    .sort((a, b) => a.horizonMin - b.horizonMin)[0];
  return hit ? hit.horizonMin : null;
}

function grcBiaSummary(list) {
  const arr = Array.isArray(list) ? list : [];
  return {
    count: arr.length,
    spof: arr.reduce((acc, p) => acc + grcBiaSpofCount(p), 0),
    incoherent: arr.filter((p) => grcContCoherence(p).length > 0).length,
    worstGaps: arr
      .map((p) => ({ label: p.label || "", gap: grcContRtoGap(p) }))
      .filter((x) => x.gap != null)
      .sort((a, b) => b.gap - a.gap)
      .slice(0, 3),
  };
}

// Couverture : processus vitaux / critiques de la cartographie (Contexte)
// ayant au moins une entrée BIA. { total, covered, missing:[nom] }.
function grcBiaCoverage(list) {
  const arr = Array.isArray(list) ? list : getGrcBia();
  const procs = typeof grcLinksCtx === "function"
    ? grcLinksCtx().list("processus").filter((p) => p.criticite === "vital" || p.criticite === "critique") : [];
  const done = Object.create(null);
  arr.forEach((b) => { if (b && b.processId) done[b.processId] = 1; });
  const missing = procs.filter((p) => !done[p.id]);
  return { total: procs.length, covered: procs.length - missing.length, missing: missing.map((p) => p.nom || p.id) };
}

// Plans de continuité reliés à une entrée BIA (champ biaId).
function grcBiaLinkedPlans(biaId) {
  if (!biaId || typeof getGrcContinuity !== "function") return [];
  return getGrcContinuity().filter((p) => p && p.biaId === biaId);
}

/* ---------- import / export ----------------------------------------- */

async function exportGrcBiaJson() {
  if (typeof vaultShouldGate === "function" && vaultShouldGate()) {
    alert(grcT("grc.common.vaultLockedExport"));
    return;
  }
  const data = await vaultMaybeEncryptForExport(getGrcBia());
  exportJsonFile(data, "bia-processus-" + new Date().toISOString().slice(0, 10) + ".json");
}

async function importGrcBiaFromJson(file) {
  const raw = await readJsonFile(file);
  const decoded = await vaultMaybeDecryptImport(raw);
  if (Array.isArray(decoded)) { saveGrcBia(decoded); return; }
  const isShape = decoded && typeof decoded === "object" && typeof decoded.id === "string";
  if (!isShape) throw new Error(grcT("grc.common.invalidJsonFile"));
  const list = getGrcBia();
  const idx = list.findIndex((p) => p.id === decoded.id);
  if (idx === -1) list.push(decoded); else list[idx] = decoded;
  saveGrcBia(list);
}

/* ================================================================== *
 *  Registre BIA -- liste groupée par criticité + formulaire + synthèse.
 *  Monté dans grc/continuite.html (#grcBiaRegistry / #grcBiaSummary).
 * ================================================================== */

function _biaFillProcesses(sel, current) {
  sel.innerHTML = "";
  const opts = [{ value: "", label: "—" }].concat(typeof grcLinksKitOptions === "function" ? grcLinksKitOptions("processus") : []);
  if (current && !opts.some((o) => o.value === current)) opts.push({ value: current, label: grcT("grc.fiche.ui.refMissing") });
  opts.forEach((o) => {
    const op = document.createElement("option");
    op.value = o.value;
    op.textContent = o.label;
    sel.appendChild(op);
  });
  sel.value = current || "";
}

function renderGrcBiaSummary() {
  const el = document.getElementById("grcBiaSummary");
  if (!el) return;
  const s = grcBiaSummary(getGrcBia());
  const cov = grcBiaCoverage();
  el.innerHTML = "";
  const covLine = () => {
    if (!cov.total) return null;
    const p = document.createElement("p");
    p.className = "grc-bia-coverage" + (cov.missing.length ? " grc-cont-warn" : "");
    p.textContent = grcT("grc.bia.summary.coverage").replace("{c}", cov.covered).replace("{t}", cov.total) +
      (cov.missing.length ? " " + grcT("grc.bia.summary.missing") + " " + cov.missing.join(", ") : "");
    return p;
  };
  if (!s.count) {
    const p = document.createElement("p");
    p.className = "grc-cont-summary-empty";
    p.textContent = grcT("grc.bia.summary.none");
    el.appendChild(p);
    const c = covLine();
    if (c) el.appendChild(c);
    return;
  }
  const wrap = document.createElement("div");
  wrap.className = "grc-cont-summary";
  const chips = document.createElement("div");
  chips.className = "grc-cont-summary-chips";
  [
    grcT("grc.bia.summary.count").replace("{n}", s.count),
    grcT("grc.bia.summary.spof").replace("{n}", s.spof),
    grcT("grc.bia.summary.incoherent").replace("{n}", s.incoherent),
  ].forEach((t) => {
    const c = document.createElement("span");
    c.className = "grc-cont-chip";
    c.textContent = t;
    chips.appendChild(c);
  });
  wrap.appendChild(chips);
  if (s.worstGaps.length) {
    const g = document.createElement("p");
    g.className = "grc-cont-summary-gaps";
    g.textContent = grcT("grc.bia.summary.worstGaps") + " " +
      s.worstGaps.map((x) => x.label + " (+" + contFmtDuration(x.gap) + ")").join(" · ");
    wrap.appendChild(g);
  }
  const c = covLine();
  if (c) wrap.appendChild(c);
  el.appendChild(wrap);
}

function initGrcBiaRegistry() {
  const container = document.getElementById("grcBiaRegistry");
  if (!container) return;
  if (typeof vaultGateOr === "function" && vaultGateOr(container, initGrcBiaRegistry)) return;

  let editingId = null;
  let expandedId = null;
  let pending = {};   // valeurs pré-remplies (ruptures T22, « + Ajouter » des liens)

  const unitOpts = GRC_CONT_DURATION_UNITS
    .map((u) => `<option value="${u}">${grcT("grc.continuite.pca.unit." + u)}</option>`).join("");
  const durRow = (idBase, labelKey) => `
    <label class="grc-cont-dur">${grcT(labelKey)}
      <span class="grc-cont-dur-input">
        <input type="number" min="0" step="1" id="${idBase}Val">
        <select id="${idBase}Unit">${unitOpts}</select>
      </span>
    </label>`;

  container.innerHTML = `
    <div class="grc-registry-toolbar">
      <button type="button" class="grc-registry-add-btn" id="biaAddBtn">${grcT("grc.bia.form.addBtn")}</button>
      <button type="button" class="grc-registry-io-btn" id="biaExportBtn">${grcT("grc.common.btnExport")}</button>
      <button type="button" class="grc-registry-io-btn" id="biaImportBtn">${grcT("grc.common.btnImport")}</button>
      <button type="button" class="grc-registry-io-btn" id="biaWordBtn">${grcT("grc.bia.export.word")}</button>
      <button type="button" class="grc-registry-io-btn" id="biaPdfBtn">${grcT("grc.bia.export.pdf")}</button>
      <input type="file" accept="application/json" id="biaImportFile" style="display:none">
    </div>
    <form class="grc-registry-form" id="biaForm" style="display:none">
      <h3 id="biaFormTitle">${grcT("grc.bia.form.title")}</h3>
      <label>${grcT("grc.bia.form.label")} <input type="text" id="biaLabel" required></label>
      <label>${grcT("grc.links.f.bia.processId")} <select id="biaProcessId"></select></label>
      <div class="grc-registry-form-row">
        <label>${grcT("grc.continuite.pca.form.owner")} <input type="text" id="biaOwner"></label>
        <label>${grcT("grc.continuite.pca.form.criticality")}
          <select id="biaCriticality">
            ${GRC_CONT_CRITICALITY.map((c) => `<option value="${c}">${grcT("grc.continuite.pca.crit." + c)}</option>`).join("")}
          </select>
        </label>
      </div>
      <div class="grc-registry-form-row grc-cont-dur-row">
        ${durRow("biaMtd", "grc.continuite.pca.form.mtd")}
        ${durRow("biaRto", "grc.continuite.pca.form.rto")}
        ${durRow("biaRpo", "grc.continuite.pca.form.rpo")}
      </div>
      <p class="grc-cont-warn" id="biaFormWarn" style="display:none">${grcT("grc.continuite.pca.warn.rtoGtMtd")}</p>
      <p class="grk-hint" id="biaFormNext">${grcT("grc.bia.form.nextHint")}</p>
      <div class="grc-registry-form-actions">
        <button type="submit" class="grc-registry-add-btn">${grcT("grc.common.btnSave")}</button>
        <button type="button" class="grc-registry-io-btn" id="biaCancelBtn">${grcT("grc.common.btnCancel")}</button>
      </div>
    </form>
    <ul class="grc-registry-list" id="biaList"></ul>
  `;

  const $ = (sel) => container.querySelector(sel);

  // « + Ajouter » sous le select processus : crée le processus dans la
  // cartographie (Contexte, nouvel onglet) ; options rechargées au retour.
  if (typeof grcLinksAddButton === "function") {
    const sel = $("#biaProcessId");
    const add = grcLinksAddButton("processus", sel, (v) => _biaFillProcesses(sel, v));
    if (add) sel.parentNode.appendChild(add);
  }

  function setDur(idBase, minutes) {
    const parts = contMinutesToParts(minutes);
    $("#" + idBase + "Val").value = parts.value === "" ? "" : parts.value;
    $("#" + idBase + "Unit").value = parts.unit;
  }
  function getDur(idBase) {
    const v = $("#" + idBase + "Val").value;
    if (v === "") return null;
    return contPartsToMinutes(v, $("#" + idBase + "Unit").value);
  }
  function syncWarn() {
    const rto = getDur("biaRto");
    const mtd = getDur("biaMtd");
    $("#biaFormWarn").style.display = (rto != null && mtd != null && rto > mtd) ? "" : "none";
  }

  function showForm(proc) {
    if (typeof grcContinuiteShowTab === "function") grcContinuiteShowTab("bia");
    editingId = proc ? proc.id : null;
    $("#biaFormTitle").textContent = proc ? grcT("grc.bia.form.titleEdit") : grcT("grc.bia.form.title");
    $("#biaLabel").value = proc ? (proc.label || "") : (pending.label || "");
    _biaFillProcesses($("#biaProcessId"), proc ? proc.processId : (pending.processId || ""));
    $("#biaOwner").value = proc ? (proc.owner || "") : (typeof grcAuthorName === "function" ? grcAuthorName() : "");
    $("#biaCriticality").value = proc ? proc.criticality
      : (GRC_CONT_CRITICALITY.indexOf(pending.criticality) !== -1 ? pending.criticality : "important");
    pending = {};
    const bia = proc && proc.bia ? proc.bia : {};
    setDur("biaMtd", bia.mtdMin);
    setDur("biaRto", bia.rtoMin);
    setDur("biaRpo", bia.rpoMin);
    syncWarn();
    $("#biaForm").style.display = "";
    $("#biaAddBtn").style.display = "none";
    $("#biaFormTitle").scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function hideForm() {
    editingId = null;
    $("#biaForm").reset();
    $("#biaForm").style.display = "none";
    $("#biaFormWarn").style.display = "none";
    $("#biaAddBtn").style.display = "";
  }

  // Processus choisi : reprend son nom (libellé vide) et sa criticité (création).
  $("#biaProcessId").addEventListener("change", () => {
    const pid = $("#biaProcessId").value;
    const proc = pid && typeof grcLinksCtx === "function" ? grcLinksCtx().get("processus", pid) : null;
    if (!proc) return;
    if (!$("#biaLabel").value.trim() && proc.nom) $("#biaLabel").value = proc.nom;
    if (!editingId && GRC_CONT_CRITICALITY.indexOf(proc.criticite) !== -1) $("#biaCriticality").value = proc.criticite;
  });

  $("#biaAddBtn").addEventListener("click", () => showForm(null));
  $("#biaCancelBtn").addEventListener("click", hideForm);
  $("#biaExportBtn").addEventListener("click", exportGrcBiaJson);
  $("#biaWordBtn").addEventListener("click", () => { if (typeof exportGrcBiaReportAsWord === "function") exportGrcBiaReportAsWord(getGrcBia()); });
  $("#biaPdfBtn").addEventListener("click", () => { if (typeof exportGrcBiaReportAsPdf === "function") exportGrcBiaReportAsPdf(getGrcBia()); });
  $("#biaImportBtn").addEventListener("click", () => $("#biaImportFile").click());
  $("#biaImportFile").addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;
    importGrcBiaFromJson(file)
      .then(renderGrcBiaList)
      .catch((err) => alert(err.message || grcT("grc.common.invalidJsonFile")))
      .finally(() => { e.target.value = ""; });
  });
  ["biaMtdVal", "biaMtdUnit", "biaRtoVal", "biaRtoUnit"].forEach((id) => {
    $("#" + id).addEventListener("input", syncWarn);
    $("#" + id).addEventListener("change", syncWarn);
  });

  $("#biaForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const label = $("#biaLabel").value.trim();
    if (!label) return;
    const bia = { mtdMin: getDur("biaMtd"), rtoMin: getDur("biaRto"), rpoMin: getDur("biaRpo") };
    const common = {
      label,
      processId: $("#biaProcessId").value,
      owner: $("#biaOwner").value.trim(),
      criticality: $("#biaCriticality").value,
    };
    if (editingId) {
      const existing = getGrcBia().find((p) => p.id === editingId);
      updateGrcBiaProcess(editingId, Object.assign({}, common, { bia: Object.assign({}, existing && existing.bia, bia) }));
      if (typeof grcChainChanged === "function") {
        const saved = getGrcBia().find((p) => p.id === editingId);
        if (saved) grcChainChanged(GRC_BIA_KEY, saved);
      }
    } else {
      // Ouvre le nouveau processus : impacts, dépendances et justification se
      // saisissent dans son panneau (sinon on ne sait pas où les trouver).
      expandedId = addGrcBiaProcess(Object.assign({}, common, { bia: bia }));
    }
    hideForm();
    renderGrcBiaList();
  });

  function buildItem(proc) {
    const crit = grcContCriticalityBadge(proc.criticality);
    const li = document.createElement("li");
    li.className = "grc-registry-item" + (proc.id === expandedId ? " open" : "");
    li.dataset.biaId = proc.id;

    const header = document.createElement("div");
    header.className = "grc-registry-header";
    const spof = grcBiaSpofCount(proc);
    header.innerHTML =
      `<span>${grkEscapeHtml(proc.label || "")}</span>` +
      `<span class="grc-cont-crit ${crit.cls}">${crit.text}</span>` +
      `<span class="grc-cont-rto">${grcT("grc.continuite.pca.detail.rto").replace("{value}", contFmtDuration(proc.bia && proc.bia.rtoMin))}</span>` +
      (spof ? `<span class="grc-cont-badge-overdue">${grcT("grc.bia.spofBadge").replace("{n}", spof)}</span>` : "") +
      `<span class="chevron">▸</span>`;
    header.onclick = () => {
      expandedId = expandedId === proc.id ? null : proc.id;
      renderGrcBiaList();
    };
    li.appendChild(header);

    if (proc.id === expandedId) {
      const body = document.createElement("div");
      body.className = "grc-registry-body";
      if (typeof renderBiaPanel === "function") {
        renderBiaPanel(body, proc);
      } else {
        const d = document.createElement("p");
        d.className = "grc-ir-hint";
        d.textContent = grcT("grc.bia.panelStub");
        body.appendChild(d);
      }
      if (typeof grcLinksDepsBlock === "function") {
        const deps = grcLinksDepsBlock(GRC_BIA_KEY, proc);
        if (deps) body.appendChild(deps);
      }

      const actions = document.createElement("div");
      actions.className = "grc-ir-actions grc-cont-actions";
      const editBtn = document.createElement("button");
      editBtn.type = "button";
      editBtn.className = "grc-registry-add-btn grc-ir-toggle";
      editBtn.textContent = grcT("grc.common.btnEdit");
      editBtn.onclick = () => showForm(getGrcBia().find((p) => p.id === proc.id) || proc);
      actions.appendChild(editBtn);
      const delBtn = document.createElement("button");
      delBtn.type = "button";
      delBtn.className = "grc-registry-io-btn grc-ir-toggle";
      delBtn.textContent = grcT("grc.common.btnDelete");
      delBtn.onclick = () => {
        const guard = typeof grcLinksDeleteWarning === "function" ? grcLinksDeleteWarning(GRC_BIA_KEY, proc) : "";
        if (!confirm(grcT("grc.common.confirmDelete").replace("{name}", proc.label || "") + guard)) return;
        removeGrcBiaProcess(proc.id);
        if (expandedId === proc.id) expandedId = null;
        renderGrcBiaList();
      };
      actions.appendChild(delBtn);
      body.appendChild(actions);
      li.appendChild(body);
    }
    return li;
  }

  function appendGroupHead(list, criticality) {
    const head = document.createElement("li");
    head.className = "grc-cont-group-head grc-bia-crit-" + criticality;
    const dot = document.createElement("span");
    dot.className = "grc-cont-niv-dot grc-cont-crit " + criticality;
    head.appendChild(dot);
    const span = document.createElement("span");
    span.textContent = grcT("grc.continuite.pca.crit." + criticality);
    head.appendChild(span);
    list.appendChild(head);
  }

  window.renderGrcBiaList = function () {
    const list = $("#biaList");
    list.innerHTML = "";
    const procs = getGrcBia();
    const byCrit = Object.create(null);
    procs.forEach((p) => { (byCrit[p.criticality] = byCrit[p.criticality] || []).push(p); });
    GRC_CONT_CRITICALITY.filter((c) => byCrit[c] && byCrit[c].length).forEach((c) => {
      appendGroupHead(list, c);
      byCrit[c].forEach((p) => list.appendChild(buildItem(p)));
    });
    renderGrcBiaSummary();
  };

  // Ouverture pré-remplie depuis une autre page (grcFicheCrossOpen, rupture
  // T22) ou bouton « + Ajouter » d'un champ de lien (grcLinksAddNew).
  window.grcBiaOpenWith = { openWith: (values) => { pending = values || {}; showForm(null); } };

  // Deep-link grc/continuite.html#<biaId> : déplie + scrolle.
  function applyBiaDeepLink() {
    const raw = (location.hash || "").replace(/^#/, "");
    if (!raw) return;
    let id;
    try { id = decodeURIComponent(raw); } catch (e) { id = raw; }
    if (!getGrcBia().some((p) => p.id === id)) return;
    if (expandedId !== id) { expandedId = id; renderGrcBiaList(); }
    const li = $('#biaList li[data-bia-id="' + (window.CSS && CSS.escape ? CSS.escape(id) : id) + '"]');
    if (li && li.scrollIntoView) li.scrollIntoView({ block: "center" });
  }
  window.addEventListener("hashchange", applyBiaDeepLink);

  renderGrcBiaList();
  applyBiaDeepLink();
}
