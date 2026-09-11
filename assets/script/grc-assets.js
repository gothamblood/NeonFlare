/* Registre d'actifs -- migré sur grc-registry-kit.js (grk*) pour le
   CRUD/registre/liste, PlanDurcissement-Securite.txt P2 (module 4/5).

   Ce registre remplace/complète la checklist d'auto-évaluation de
   grc/actifs.html (inchangée, voir assets/script/grc-checklist.js) par
   un vrai inventaire opérationnel : nom, type, classification CIA
   (1-3/axe), rôle primaire/support, propriétaire, dépendances vers
   d'autres actifs (dependsOn, self-référentiel -- un actif dépend
   d'autres actifs du MÊME registre). La clé est protégée par le coffre
   (assets/script/vault.js, VAULT_PROTECTED_EXACT_KEYS) car elle révèle
   de la vraie infrastructure, même justification que Network/Topology.

   dependsOn déplacé du formulaire principal (un <select multiple> n'a
   pas d'équivalent dans le form déclaratif du kit, text/textarea/select/
   dur seulement) vers le panneau déplié -- ajout un à la fois + ✕, même
   schéma que les liens N-à-N des autres domaines kit (assetIds du
   registre de risques, linkedControls du plan de traitement...).

   Classification CIA (c/i/a) et rôle : <input type="number">/<select>
   natifs avant cette migration -- désormais <input type="text"> déclaré
   dans le form du kit (pas de type "number" côté kit non plus),
   normalisés en nombre au submit (grkEnsure, défaut 1) -- même
   compromis que probability/impact sur grc-risks.js.

   Tout le texte affiché passe par grcT() -- les libellés de TYPE
   (GRC_ASSET_TYPES) restent en clé interne stable ("physique",
   "logiciel"...), leur traduction vient de grc.actifs.type.* au moment
   de l'affichage, pas d'un champ .label statique.

   Compat externe -- NE PAS renommer sans mettre à jour ces appelants :
     - assets/script/inline/actifs.js : initGrcAssetRegistry().
     - assets/script/inline/settings.js (Sauvegarde complète / Reset) :
       getGrcAssets, saveGrcAssets, resetGrcAssets.
     - assets/script/inline/dashboard-upcoming-reviews.js,
       assets/script/grc-risks.js, assets/script/grc-continuity-panel.js,
       assets/script/grc-incidents-ir.js (datalists croisées, lecture
       défensive typeof getGrcAssets === "function") : getGrcAssets()
       -> [{ name, ... }].
     - assets/script/grc-registry-kit.js (_GRK_REGISTRIES.assets).

   grc/actifs.html ET grc/analyse-risques.html chargeaient ce fichier
   AVANT grc-registry-kit.js (grkStore/grkId non définis à l'évaluation
   -> plantage immédiat) -- corrigé sur les deux pages par cette
   migration (vérifié systématiquement : grep de tous les chargeurs de
   grc-assets.js avant d'écrire, comme pour grc-pentest.js/grc-risks.js/
   grc-incidents.js). project/dashboard.html et project/settings.html
   avaient déjà le bon ordre. */

const GRC_ASSETS_KEY = "/grc/actifs/registry";

const GRC_ASSET_TYPES = ["physique", "logiciel", "donnee", "humain", "reseau"];

const _assetStore = grkStore(GRC_ASSETS_KEY);

function getGrcAssets() {
  return _assetStore.get();
}

function saveGrcAssets(assets) {
  _assetStore.save(assets);
}

function addGrcAsset(asset) {
  const assets = getGrcAssets();
  const id = grkId("asset");
  assets.push(Object.assign({ id }, asset));
  saveGrcAssets(assets);
  return id;
}

function updateGrcAsset(id, changes) {
  const assets = getGrcAssets();
  const idx = assets.findIndex((a) => a.id === id);
  if (idx === -1) return;
  assets[idx] = Object.assign({}, assets[idx], changes);
  saveGrcAssets(assets);
}

// Retire l'actif, et le retire aussi des dépendances des autres actifs
// (référence directe) pour ne jamais laisser un id mort dans dependsOn.
function removeGrcAsset(id) {
  const assets = getGrcAssets()
    .filter((a) => a.id !== id)
    .map((a) => (Array.isArray(a.dependsOn) && a.dependsOn.includes(id)
      ? Object.assign({}, a, { dependsOn: a.dependsOn.filter((d) => d !== id) })
      : a));
  saveGrcAssets(assets);
}

// Dépendances -- un ajout/retrait à la fois depuis le panneau déplié,
// même patron que grcRiskAddAsset/RemoveAsset (grc-risks.js). Garde
// anti-doublon + anti-auto-référence.
function grcAssetAddDependency(id, depId) {
  const assets = getGrcAssets();
  const idx = assets.findIndex((a) => a.id === id);
  if (idx === -1 || !depId || depId === id) return false;
  const deps = Array.isArray(assets[idx].dependsOn) ? assets[idx].dependsOn.slice() : [];
  if (deps.indexOf(depId) !== -1) return false;
  deps.push(depId);
  assets[idx] = Object.assign({}, assets[idx], { dependsOn: deps });
  saveGrcAssets(assets);
  return true;
}

function grcAssetRemoveDependency(id, depId) {
  const assets = getGrcAssets();
  const idx = assets.findIndex((a) => a.id === id);
  if (idx === -1) return false;
  const deps = (Array.isArray(assets[idx].dependsOn) ? assets[idx].dependsOn : []).filter((d) => d !== depId);
  assets[idx] = Object.assign({}, assets[idx], { dependsOn: deps });
  saveGrcAssets(assets);
  return true;
}

function grcAssetCriticality(asset) {
  return Math.max(asset.c || 1, asset.i || 1, asset.a || 1);
}

function grcAssetCriticalityLabel(level) {
  if (level >= 3) return { cls: "high", text: grcT("grc.actifs.crit.high") };
  if (level >= 2) return { cls: "medium", text: grcT("grc.actifs.crit.medium") };
  return { cls: "low", text: grcT("grc.actifs.crit.low") };
}

function grcAssetTypeLabel(value) {
  return GRC_ASSET_TYPES.includes(value) ? grcT("grc.actifs.type." + value) : value;
}

function exportGrcAssetsAsJson() {
  return grkExportJson(getGrcAssets(), "grc-actifs-" + grkDateStamp() + ".json");
}

async function importGrcAssetsFromJson(file) {
  const raw = await readJsonFile(file);
  const assets = await vaultMaybeDecryptImport(raw);
  if (!Array.isArray(assets)) throw new Error(grcT("grc.actifs.pdf.invalidImport"));
  saveGrcAssets(assets);
}

function resetGrcAssets() {
  _assetStore.remove();
}

/* Rapport HTML du registre des actifs seul (pas le rapport GRC complet
   de grc-checklist.js) -- même mécanique que exportGrcAsPdf : aucune
   librairie tierce, une page HTML autonome imprimée via window.print()
   dans un nouvel onglet, laissée à l'utilisateur ("Enregistrer en PDF"
   dans la boîte d'impression). */
function grcAssetsReportBody() {
  const assets = getGrcAssets();
  const generated = new Date().toLocaleString("fr-CA");
  let html = "<h1>" + grcT("grc.actifs.pdf.title") + "</h1><p>" + grcT("grc.common.generatedOn") + " " + grkEscapeHtml(generated) + "</p>";

  if (assets.length === 0) {
    html += "<p>" + grcT("grc.actifs.pdf.empty") + "</p>";
    return html;
  }

  html += "<table><thead><tr>" +
    "<th>" + grcT("grc.actifs.pdf.colName") + "</th><th>" + grcT("grc.actifs.pdf.colType") + "</th>" +
    "<th>C</th><th>I</th><th>A</th><th>" + grcT("grc.actifs.pdf.colCrit") + "</th>" +
    "<th>" + grcT("grc.actifs.pdf.colRole") + "</th><th>" + grcT("grc.actifs.pdf.colOwner") + "</th>" +
    "<th>" + grcT("grc.actifs.pdf.colNextReview") + "</th><th>" + grcT("grc.actifs.pdf.colDependsOn") + "</th>" +
    "<th>" + grcT("grc.actifs.pdf.colNotes") + "</th>" +
    "</tr></thead><tbody>";
  assets.forEach((asset) => {
    const crit = grcAssetCriticalityLabel(grcAssetCriticality(asset));
    const deps = (asset.dependsOn || [])
      .map((depId) => assets.find((a) => a.id === depId))
      .filter(Boolean)
      .map((a) => a.name)
      .join(", ");
    html += "<tr>" +
      "<td>" + grkEscapeHtml(asset.name) + "</td>" +
      "<td>" + grkEscapeHtml(grcAssetTypeLabel(asset.type)) + "</td>" +
      "<td>" + grkEscapeHtml(asset.c) + "</td><td>" + grkEscapeHtml(asset.i) + "</td><td>" + grkEscapeHtml(asset.a) + "</td>" +
      "<td>" + grkEscapeHtml(crit.text) + "</td>" +
      "<td>" + (asset.role === "support" ? grcT("grc.actifs.form.roleSupport") : grcT("grc.actifs.form.rolePrimary")) + "</td>" +
      "<td>" + grkEscapeHtml(asset.owner || "") + "</td>" +
      "<td>" + grkEscapeHtml(asset.nextReviewDate || "") + "</td>" +
      "<td>" + grkEscapeHtml(deps) + "</td>" +
      "<td>" + grkEscapeHtml(asset.notes || "") + "</td>" +
      "</tr>";
  });
  html += "</tbody></table>";
  return html;
}

// grkPrintWindow gate le coffre par construction -- ABSENTE avant cette
// migration (un export verrouillé produisait silencieusement un rapport
// vide plutôt que l'alerte standard, même trou fermé sur grc-risks.js).
function exportGrcAssetsAsPdf() {
  grkPrintWindow(grcAssetsReportBody(), grcT("grc.actifs.pdf.title"));
}

/* ================================================================== *
 *  Registre -- liste + formulaire (grkRegistry). Panneau : détail CIA
 *  + dépendances (ajout/retrait un à la fois). Monté par grc/actifs.html
 *  (#grcAssetRegistry).
 * ================================================================== */

// Champs SOUMIS par le formulaire seulement (jamais l'actif stocké en
// entier -- dependsOn n'y passe jamais, géré à part par
// grcAssetAddDependency/RemoveDependency). c/i/a : text au form du kit
// (pas de type "number" côté kit), normalisés en nombre ici, défaut 1
// -- même compromis que probability/impact sur grc-risks.js.
const GRC_ASSET_FORM_SCHEMA = {
  name: { type: "string" },
  type: { type: "string", enum: GRC_ASSET_TYPES, default: GRC_ASSET_TYPES[0] },
  c: { type: "number", default: 1 },
  i: { type: "number", default: 1 },
  a: { type: "number", default: 1 },
  role: { type: "string", enum: ["primaire", "support"], default: "primaire" },
  owner: { type: "string" },
  nextReviewDate: { type: "string" },
  notes: { type: "string" },
};

// Panneau déplié : détail CIA/rôle/propriétaire/prochaine revue/notes
// (innerHTML + grkEscapeHtml par champ, même patron que
// renderRiskDetailPanel) + dépendances (grkList/grkRow/grkAddForm/
// grkDelBtn, self-référentiel -- exclut l'actif lui-même et les
// dépendances déjà ajoutées de la liste "à ajouter"). Edit/Delete
// viennent de grkRegistry lui-même (ajoutés après cfg.panel).
function renderAssetDetailPanel(body, ent) {
  const info = document.createElement("div");
  const roleLabel = ent.role === "support" ? grcT("grc.actifs.form.roleSupport") : grcT("grc.actifs.form.rolePrimary");
  info.innerHTML =
    `<p>${grcT("grc.actifs.detail.cia")
      .replace("{c}", grkEscapeHtml(ent.c)).replace("{i}", grkEscapeHtml(ent.i))
      .replace("{a}", grkEscapeHtml(ent.a)).replace("{role}", grkEscapeHtml(roleLabel))}</p>` +
    (ent.owner ? `<p>${grcT("grc.actifs.detail.owner").replace("{owner}", grkEscapeHtml(ent.owner))}</p>` : "") +
    (ent.nextReviewDate ? `<p>${grcT("grc.actifs.detail.nextReview").replace("{date}", grkEscapeHtml(ent.nextReviewDate))}</p>` : "") +
    (ent.notes ? `<p>${grkEscapeHtml(ent.notes)}</p>` : "");
  body.appendChild(info);

  const allAssets = getGrcAssets();
  const depIds = Array.isArray(ent.dependsOn) ? ent.dependsOn : [];
  const list = grkList(body, "grc.actifs.form.dependsOn");
  depIds.forEach((depId) => {
    const dep = allAssets.find((a) => a.id === depId);
    if (!dep) return;
    const row = grkRow();
    const span = document.createElement("span");
    span.className = "grk-inv-grow";
    span.textContent = dep.name;
    row.appendChild(span);
    row.appendChild(grkDelBtn(() => { grcAssetRemoveDependency(ent.id, depId); renderGrcAssetList(); }));
    list.appendChild(row);
  });
  if (!depIds.length) list.appendChild(grkEmptyLine("grc.actifs.detail.noDependency"));

  const linkable = allAssets.filter((a) => a.id !== ent.id && depIds.indexOf(a.id) === -1);
  if (linkable.length) {
    const sel = grkSelect(linkable.map((a) => a.id), linkable[0].id, (id) => {
      const a = linkable.find((x) => x.id === id);
      return a ? a.name : id;
    });
    const addForm = grkAddForm([sel], () => {
      grcAssetAddDependency(ent.id, sel.value);
      renderGrcAssetList();
    });
    const addBtn = document.createElement("button");
    addBtn.type = "submit";
    addBtn.className = "grc-registry-add-btn";
    addBtn.textContent = grcT("grc.actifs.detail.addDependency");
    addForm.appendChild(addBtn);
    body.appendChild(addForm);
  }
}

function initGrcAssetRegistry() {
  const init = grkRegistry({
    mount: "#grcAssetRegistry",
    store: _assetStore,
    idAttr: "data-asset-id",
    listGlobal: "renderGrcAssetList",
    deepLink: true,
    i18n: {
      add: "grc.actifs.form.addBtn",
      titleAdd: "grc.actifs.form.title",
      titleEdit: "grc.actifs.form.titleEdit",
    },
    form: [
      { id: "name", label: "grc.actifs.form.name", type: "text", required: true },
      { id: "type", label: "grc.actifs.form.type", type: "select",
        options: GRC_ASSET_TYPES.map((t) => ({ value: t, label: "grc.actifs.type." + t })) },
      { id: "c", label: "grc.actifs.form.confidentiality", type: "text" },
      { id: "i", label: "grc.actifs.form.integrity", type: "text" },
      { id: "a", label: "grc.actifs.form.availability", type: "text" },
      { id: "role", label: "grc.actifs.form.role", type: "select",
        options: [
          { value: "primaire", label: "grc.actifs.form.rolePrimary" },
          { value: "support", label: "grc.actifs.form.roleSupport" },
        ] },
      { id: "owner", label: "grc.actifs.form.owner", type: "text" },
      { id: "nextReviewDate", label: "grc.actifs.form.nextReview", type: "text" },
      { id: "notes", label: "grc.actifs.form.notes", type: "textarea" },
    ],
    readForm: (ent) => ({
      name: ent.name, type: ent.type, c: ent.c, i: ent.i, a: ent.a,
      role: ent.role, owner: ent.owner, nextReviewDate: ent.nextReviewDate, notes: ent.notes,
    }),
    submit: (v, editingId) => {
      const fields = grkEnsure(v, GRC_ASSET_FORM_SCHEMA);
      fields.name = fields.name.trim();
      fields.owner = fields.owner.trim();
      fields.nextReviewDate = fields.nextReviewDate.trim();
      fields.notes = fields.notes.trim();
      if (editingId) updateGrcAsset(editingId, fields);
      else addGrcAsset(Object.assign({ dependsOn: [] }, fields));
    },
    header: (ent) => {
      const crit = grcAssetCriticalityLabel(grcAssetCriticality(ent));
      const badge = document.createElement("span");
      badge.className = "grc-crit-badge " + crit.cls;
      badge.textContent = crit.text;
      return [
        { text: (ent.name || "") + " — " + grcAssetTypeLabel(ent.type) },
        badge,
      ];
    },
    panel: renderAssetDetailPanel,
    exportFn: exportGrcAssetsAsJson,
    importFn: importGrcAssetsFromJson,
    confirmName: (ent) => ent.name || "",
  });
  init();

  // grkRegistry ne prévoit qu'UN bouton "Export" (JSON) dans sa toolbar
  // -- le rapport PDF n'a pas d'équivalent générique (même trou que
  // grc-risks.js). Ré-ajouté à la main après init(), même bouton
  // qu'avant cette migration.
  const toolbar = document.querySelector("#grcAssetRegistry .grc-registry-toolbar");
  if (toolbar) {
    const pdfBtn = document.createElement("button");
    pdfBtn.type = "button";
    pdfBtn.className = "grc-registry-io-btn";
    pdfBtn.textContent = grcT("grc.common.btnExportPdf");
    pdfBtn.addEventListener("click", exportGrcAssetsAsPdf);
    toolbar.appendChild(pdfBtn);
  }
}
