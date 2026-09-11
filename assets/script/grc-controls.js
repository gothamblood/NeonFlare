/* Registre de contrôles -- migré sur grc-registry-kit.js (grk*) pour le
   CRUD/registre/liste, PlanDurcissement-Securite.txt P2 (module 5/5,
   dernier des modules "pré-kit").

   Chaque contrôle référence un ou plusieurs risques du registre
   grc-risks.js (riskIds), même principe que risk.assetIds -> déplacé du
   formulaire principal (un <select multiple> n'a pas d'équivalent dans
   le form déclaratif du kit) vers le panneau déplié, ajout un à la fois
   + ✕ (grcControlAddRisk/RemoveRisk, nouveau) -- même patron que
   grcRiskAddAsset/RemoveAsset. Pas de contrainte d'intégrité forte : un
   risque supprimé entre-temps est simplement filtré à l'affichage (voir
   getControlRiskNames), pas de blocage.

   getControlsForRisk() fait le chemin inverse (risque -> contrôles qui
   le traitent) : grc-risks.js l'appelle dans sa vue détail pour
   afficher "Traité par : ..." sur chaque risque, sans que grc-risks.js
   ait besoin de connaître la forme interne d'un contrôle. Inchangée.

   Tout le texte affiché passe par grcT() -- TYPES/STATUSES restent des
   clés internes stables, la traduction vient de grc.controles.type.* et
   grc.controles.status.* à l'affichage.

   Compat externe -- NE PAS renommer sans mettre à jour ces appelants :
     - assets/script/inline/controles.js : initGrcControlRegistry().
     - assets/script/inline/settings.js (Sauvegarde complète / Reset) :
       getGrcControls, saveGrcControls, resetGrcControls.
     - assets/script/grc-risks.js (vue détail d'un risque, "Traité par
       ...", lecture défensive typeof getControlsForRisk === "function") :
       getControlsForRisk(riskId) -> [{ name, ... }].
     - assets/script/grc-registry-kit.js (_GRK_REGISTRIES.controls).

   Les 3 pages consommatrices (grc/controles.html, grc/analyse-risques.html,
   project/settings.html) chargeaient déjà toutes grc-registry-kit.js
   AVANT grc-controls.js -- vérifié (grep systématique, comme pour les 4
   modules précédents), rien à corriger côté ordre des <script> cette
   fois. */

const GRC_CONTROLS_KEY = "/grc/controles/registry";

const GRC_CONTROL_TYPES = ["organisationnel", "technique", "humain"];

// Les statuts d'une Déclaration d'Applicabilité (SoA) ISO 27001 --
// l'export PDF de ce registre EST la SoA (voir exportGrcControlsAsPdf).
// La 1ère valeur ("non-implemente") sert de défaut au formulaire ; les
// clés i18n (camelCase) ne peuvent pas reprendre les tirets des valeurs.
const GRC_CONTROL_STATUSES = [
  { value: "non-implemente", i18nKey: "nonImplemente" },
  { value: "partiel", i18nKey: "partiel" },
  { value: "implemente", i18nKey: "implemente" },
  { value: "non-applicable", i18nKey: "nonApplicable" },
];

function grcControlStatusI18nKey(value) {
  const found = GRC_CONTROL_STATUSES.find((s) => s.value === value);
  return "grc.controles.status." + (found ? found.i18nKey : "nonApplicable");
}

const _controlStore = grkStore(GRC_CONTROLS_KEY);

function getGrcControls() {
  return _controlStore.get();
}

function saveGrcControls(controls) {
  _controlStore.save(controls);
}

function addGrcControl(control) {
  const controls = getGrcControls();
  const id = grkId("control");
  controls.push(Object.assign({ id }, control));
  saveGrcControls(controls);
  return id;
}

function updateGrcControl(id, changes) {
  const controls = getGrcControls();
  const idx = controls.findIndex((c) => c.id === id);
  if (idx === -1) return;
  controls[idx] = Object.assign({}, controls[idx], changes);
  saveGrcControls(controls);
}

function removeGrcControl(id) {
  saveGrcControls(getGrcControls().filter((c) => c.id !== id));
}

function grcControlTypeLabel(value) {
  return GRC_CONTROL_TYPES.includes(value) ? grcT("grc.controles.type." + value) : value;
}

function grcControlStatusBadge(value) {
  const key = grcControlStatusI18nKey(value);
  if (value === "implemente") return { cls: "low", text: grcT(key) };
  if (value === "partiel") return { cls: "medium", text: grcT(key) };
  if (value === "non-implemente") return { cls: "high", text: grcT(key) };
  return { cls: "", text: grcT(key) };
}

// Résout riskIds en noms de risques réels -- filtre silencieusement les
// ids de risques supprimés depuis (pas de FK réelle en localStorage).
function getControlRiskNames(control) {
  const risks = typeof getGrcRisks === "function" ? getGrcRisks() : [];
  return (control.riskIds || [])
    .map((id) => risks.find((r) => r.id === id))
    .filter(Boolean)
    .map((r) => r.name);
}

// Chemin inverse : tous les contrôles qui traitent un risque donné --
// utilisé par grc-risks.js pour afficher "Traité par : ..." sur la
// fiche d'un risque sans dupliquer la donnée sur le risque lui-même.
function getControlsForRisk(riskId) {
  return getGrcControls().filter((c) => (c.riskIds || []).includes(riskId));
}

// Lien risque <-> contrôle -- un ajout/retrait à la fois depuis le
// panneau déplié, même patron que grcRiskAddAsset/RemoveAsset.
function grcControlAddRisk(id, riskId) {
  const controls = getGrcControls();
  const idx = controls.findIndex((c) => c.id === id);
  if (idx === -1 || !riskId) return false;
  const ids = Array.isArray(controls[idx].riskIds) ? controls[idx].riskIds.slice() : [];
  if (ids.indexOf(riskId) !== -1) return false;
  ids.push(riskId);
  controls[idx] = Object.assign({}, controls[idx], { riskIds: ids });
  saveGrcControls(controls);
  return true;
}

function grcControlRemoveRisk(id, riskId) {
  const controls = getGrcControls();
  const idx = controls.findIndex((c) => c.id === id);
  if (idx === -1) return false;
  const ids = (Array.isArray(controls[idx].riskIds) ? controls[idx].riskIds : []).filter((r) => r !== riskId);
  controls[idx] = Object.assign({}, controls[idx], { riskIds: ids });
  saveGrcControls(controls);
  return true;
}

function exportGrcControlsAsJson() {
  return grkExportJson(getGrcControls(), "grc-controles-" + grkDateStamp() + ".json");
}

async function importGrcControlsFromJson(file) {
  const raw = await readJsonFile(file);
  const controls = await vaultMaybeDecryptImport(raw);
  if (!Array.isArray(controls)) throw new Error(grcT("grc.controles.pdf.invalidImport"));
  saveGrcControls(controls);
}

function resetGrcControls() {
  _controlStore.remove();
}

/* Rapport HTML du registre des contrôles seul -- Déclaration
   d'Applicabilité (SoA) : mêmes colonnes que le formulaire, même
   mécanique d'export que exportGrcAssetsAsPdf/exportGrcRisksAsPdf. */
function grcControlsReportBody() {
  const controls = getGrcControls();
  const generated = new Date().toLocaleString("fr-CA");
  let html = "<h1>" + grcT("grc.controles.pdf.title") + "</h1><p>" + grcT("grc.common.generatedOn") + " " + grkEscapeHtml(generated) + "</p>";

  if (controls.length === 0) {
    html += "<p>" + grcT("grc.controles.pdf.empty") + "</p>";
    return html;
  }

  html += "<table><thead><tr>" +
    "<th>" + grcT("grc.controles.pdf.colName") + "</th><th>" + grcT("grc.controles.pdf.colIso") + "</th>" +
    "<th>" + grcT("grc.controles.pdf.colNist") + "</th><th>" + grcT("grc.controles.pdf.colCis") + "</th>" +
    "<th>" + grcT("grc.controles.pdf.colType") + "</th><th>" + grcT("grc.controles.pdf.colStatus") + "</th>" +
    "<th>" + grcT("grc.controles.pdf.colRisks") + "</th><th>" + grcT("grc.controles.pdf.colOwner") + "</th>" +
    "<th>" + grcT("grc.controles.pdf.colEvidence") + "</th>" +
    "</tr></thead><tbody>";
  controls.forEach((control) => {
    const status = grcControlStatusBadge(control.status);
    html += "<tr>" +
      "<td>" + grkEscapeHtml(control.name) + "</td>" +
      "<td>" + grkEscapeHtml(control.isoRef || "") + "</td>" +
      "<td>" + grkEscapeHtml(control.nistRef || "") + "</td>" +
      "<td>" + grkEscapeHtml(control.cisRef || "") + "</td>" +
      "<td>" + grkEscapeHtml(grcControlTypeLabel(control.type)) + "</td>" +
      "<td>" + grkEscapeHtml(status.text) + "</td>" +
      "<td>" + grkEscapeHtml(getControlRiskNames(control).join(", ")) + "</td>" +
      "<td>" + grkEscapeHtml(control.owner || "") + "</td>" +
      "<td>" + grkEscapeHtml(control.evidence || "") + "</td>" +
      "</tr>";
  });
  html += "</tbody></table>";
  return html;
}

// grkPrintWindow gate le coffre par construction -- ABSENTE avant cette
// migration (un export verrouillé produisait silencieusement un rapport
// vide plutôt que l'alerte standard, même trou fermé sur grc-risks.js/
// grc-assets.js).
function exportGrcControlsAsPdf() {
  grkPrintWindow(grcControlsReportBody(), grcT("grc.controles.registryTitle"));
}

/* ================================================================== *
 *  Registre -- liste + formulaire (grkRegistry). Panneau : détail +
 *  risques traités (ajout/retrait un à la fois). Monté par
 *  grc/controles.html (#grcControlRegistry).
 * ================================================================== */

// Champs SOUMIS par le formulaire seulement (jamais le contrôle stocké
// en entier -- riskIds n'y passe jamais, géré à part par
// grcControlAddRisk/RemoveRisk).
const GRC_CONTROL_FORM_SCHEMA = {
  name: { type: "string" },
  isoRef: { type: "string" },
  nistRef: { type: "string" },
  cisRef: { type: "string" },
  type: { type: "string", enum: GRC_CONTROL_TYPES, default: GRC_CONTROL_TYPES[0] },
  status: { type: "string", enum: GRC_CONTROL_STATUSES.map((s) => s.value), default: GRC_CONTROL_STATUSES[0].value },
  owner: { type: "string" },
  evidence: { type: "string" },
};

// Panneau déplié : détail (type/référentiels/propriétaire/preuve, même
// patron innerHTML+grkEscapeHtml que renderRiskDetailPanel/
// renderAssetDetailPanel) + risques traités (grkList/grkRow/grkAddForm/
// grkDelBtn -- cross-registre vers grc-risks.js, dégradé silencieux si
// absent). Edit/Delete viennent de grkRegistry lui-même.
function renderControlDetailPanel(body, ent) {
  const refs = [
    ent.isoRef ? "ISO " + ent.isoRef : "",
    ent.nistRef ? "NIST " + ent.nistRef : "",
    ent.cisRef ? "CIS " + ent.cisRef : "",
  ].filter(Boolean);

  const info = document.createElement("div");
  info.innerHTML =
    `<p>${grcT("grc.controles.detail.type").replace("{value}", grkEscapeHtml(grcControlTypeLabel(ent.type)))}</p>` +
    (refs.length ? `<p>${grcT("grc.controles.detail.refs").replace("{value}", grkEscapeHtml(refs.join(" · ")))}</p>` : "") +
    (ent.owner ? `<p>${grcT("grc.controles.detail.owner").replace("{owner}", grkEscapeHtml(ent.owner))}</p>` : "") +
    (ent.evidence ? `<p>${grcT("grc.controles.detail.evidence").replace("{value}", grkEscapeHtml(ent.evidence))}</p>` : "");
  body.appendChild(info);

  const allRisks = typeof getGrcRisks === "function" ? getGrcRisks() : [];
  const riskIds = Array.isArray(ent.riskIds) ? ent.riskIds : [];
  const list = grkList(body, "grc.controles.form.risks");
  riskIds.forEach((riskId) => {
    const risk = allRisks.find((r) => r.id === riskId);
    if (!risk) return;
    const row = grkRow();
    const span = document.createElement("span");
    span.className = "grk-inv-grow";
    span.textContent = risk.name;
    row.appendChild(span);
    row.appendChild(grkDelBtn(() => { grcControlRemoveRisk(ent.id, riskId); renderGrcControlList(); }));
    list.appendChild(row);
  });
  if (!riskIds.length) list.appendChild(grkEmptyLine("grc.controles.detail.noRisk"));

  const linkable = allRisks.filter((r) => riskIds.indexOf(r.id) === -1);
  if (linkable.length) {
    const sel = grkSelect(linkable.map((r) => r.id), linkable[0].id, (id) => {
      const r = linkable.find((x) => x.id === id);
      return r ? r.name : id;
    });
    const addForm = grkAddForm([sel], () => {
      grcControlAddRisk(ent.id, sel.value);
      renderGrcControlList();
    });
    const addBtn = document.createElement("button");
    addBtn.type = "submit";
    addBtn.className = "grc-registry-add-btn";
    addBtn.textContent = grcT("grc.controles.detail.addRisk");
    addForm.appendChild(addBtn);
    body.appendChild(addForm);
  }
}

function initGrcControlRegistry() {
  const init = grkRegistry({
    mount: "#grcControlRegistry",
    store: _controlStore,
    idAttr: "data-control-id",
    listGlobal: "renderGrcControlList",
    deepLink: true,
    i18n: {
      add: "grc.controles.form.addBtn",
      titleAdd: "grc.controles.form.title",
      titleEdit: "grc.controles.form.titleEdit",
    },
    form: [
      { id: "name", label: "grc.controles.form.name", type: "text", required: true },
      { id: "isoRef", label: "grc.controles.form.isoRef", type: "text" },
      { id: "nistRef", label: "grc.controles.form.nistRef", type: "text" },
      { id: "cisRef", label: "grc.controles.form.cisRef", type: "text" },
      { id: "type", label: "grc.controles.form.type", type: "select",
        options: GRC_CONTROL_TYPES.map((t) => ({ value: t, label: "grc.controles.type." + t })) },
      { id: "status", label: "grc.controles.form.status", type: "select",
        options: GRC_CONTROL_STATUSES.map((s) => ({ value: s.value, label: "grc.controles.status." + s.i18nKey })) },
      { id: "owner", label: "grc.controles.form.owner", type: "text" },
      { id: "evidence", label: "grc.controles.form.evidence", type: "textarea" },
    ],
    readForm: (ent) => ({
      name: ent.name, isoRef: ent.isoRef, nistRef: ent.nistRef, cisRef: ent.cisRef,
      type: ent.type, status: ent.status, owner: ent.owner, evidence: ent.evidence,
    }),
    submit: (v, editingId) => {
      const fields = grkEnsure(v, GRC_CONTROL_FORM_SCHEMA);
      fields.name = fields.name.trim();
      fields.isoRef = fields.isoRef.trim();
      fields.nistRef = fields.nistRef.trim();
      fields.cisRef = fields.cisRef.trim();
      fields.owner = fields.owner.trim();
      fields.evidence = fields.evidence.trim();
      if (editingId) updateGrcControl(editingId, fields);
      else addGrcControl(Object.assign({ riskIds: [] }, fields));
    },
    header: (ent) => {
      const status = grcControlStatusBadge(ent.status);
      const badge = document.createElement("span");
      badge.className = "grc-crit-badge " + status.cls;
      badge.textContent = status.text;
      return [
        { text: (ent.name || "") + (ent.isoRef ? " — " + ent.isoRef : "") },
        badge,
      ];
    },
    panel: renderControlDetailPanel,
    exportFn: exportGrcControlsAsJson,
    importFn: importGrcControlsFromJson,
    confirmName: (ent) => ent.name || "",
  });
  init();

  // grkRegistry ne prévoit qu'UN bouton "Export" (JSON) dans sa toolbar
  // -- le rapport PDF (la SoA) n'a pas d'équivalent générique (même
  // trou que grc-risks.js/grc-assets.js). Ré-ajouté à la main après
  // init(), même bouton qu'avant cette migration.
  const toolbar = document.querySelector("#grcControlRegistry .grc-registry-toolbar");
  if (toolbar) {
    const pdfBtn = document.createElement("button");
    pdfBtn.type = "button";
    pdfBtn.className = "grc-registry-io-btn";
    pdfBtn.textContent = grcT("grc.common.btnExportPdf");
    pdfBtn.addEventListener("click", exportGrcControlsAsPdf);
    toolbar.appendChild(pdfBtn);
  }
}
