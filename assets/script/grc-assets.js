/* Registre d'actifs -- CRUD + localStorage, calqué sur le pattern de
   assets/script/network-config.js (voir getNetworkNodes/addNetworkNode/
   updateNetworkNode/removeNetworkNode). Pas de seed statique : tant que
   rien n'a été ajouté, getGrcAssets() renvoie simplement [].

   Ce registre remplace/complète la checklist d'auto-évaluation de
   grc/actifs.html (inchangée, voir assets/script/grc-checklist.js) par
   un vrai inventaire opérationnel : nom, type, classification CIA
   (1-3/axe), rôle primaire/support, propriétaire, dépendances vers
   d'autres actifs. La clé est protégée par le coffre (voir
   assets/script/vault.js, VAULT_PROTECTED_EXACT_KEYS) car elle révèle de
   la vraie infrastructure, même justification que Network/Topology.

   Tout le texte affiché passe par grcT() (assets/script/grc-i18n.js) --
   les libellés de TYPE (GRC_ASSET_TYPES) restent en clé interne stable
   ("physique", "logiciel"...), leur traduction vient de
   grc.actifs.type.* au moment de l'affichage, pas d'un champ .label
   statique. */

const GRC_ASSETS_KEY = "/grc/actifs/registry";

const GRC_ASSET_TYPES = ["physique", "logiciel", "donnee", "humain", "reseau"];

function getGrcAssets() {
  try {
    const raw = vaultGetItem(GRC_ASSETS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function saveGrcAssets(assets) {
  vaultSetItem(GRC_ASSETS_KEY, JSON.stringify(assets));
}

function addGrcAsset(asset) {
  const assets = getGrcAssets();
  const id = "asset-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
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

async function exportGrcAssetsAsJson() {
  const data = await vaultMaybeEncryptForExport(getGrcAssets());
  exportJsonFile(data, "grc-actifs.json");
}

async function importGrcAssetsFromJson(file) {
  const raw = await readJsonFile(file);
  const assets = await vaultMaybeDecryptImport(raw);
  if (!Array.isArray(assets)) throw new Error(grcT("grc.actifs.pdf.invalidImport"));
  saveGrcAssets(assets);
}

function resetGrcAssets() {
  vaultRemoveItem(GRC_ASSETS_KEY);
}

/* Rapport HTML du registre des actifs seul (pas le rapport GRC complet
   de grc-checklist.js) -- même mécanique que exportGrcAsPdf : aucune
   librairie tierce, une page HTML autonome imprimée via window.print()
   dans un nouvel onglet, laissée à l'utilisateur ("Enregistrer en PDF"
   dans la boîte d'impression). */
function grcAssetsReportBody() {
  const assets = getGrcAssets();
  const generated = new Date().toLocaleString("fr-CA");
  let html = "<h1>" + grcT("grc.actifs.pdf.title") + "</h1><p>" + grcT("grc.common.generatedOn") + " " + grcEscapeHtml(generated) + "</p>";

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
      "<td>" + grcEscapeHtml(asset.name) + "</td>" +
      "<td>" + grcEscapeHtml(grcAssetTypeLabel(asset.type)) + "</td>" +
      "<td>" + grcEscapeHtml(asset.c) + "</td><td>" + grcEscapeHtml(asset.i) + "</td><td>" + grcEscapeHtml(asset.a) + "</td>" +
      "<td>" + grcEscapeHtml(crit.text) + "</td>" +
      "<td>" + (asset.role === "support" ? grcT("grc.actifs.form.roleSupport") : grcT("grc.actifs.form.rolePrimary")) + "</td>" +
      "<td>" + grcEscapeHtml(asset.owner || "") + "</td>" +
      "<td>" + grcEscapeHtml(asset.nextReviewDate || "") + "</td>" +
      "<td>" + grcEscapeHtml(deps) + "</td>" +
      "<td>" + grcEscapeHtml(asset.notes || "") + "</td>" +
      "</tr>";
  });
  html += "</tbody></table>";
  return html;
}

function exportGrcAssetsAsPdf() {
  const body = grcAssetsReportBody();
  const html =
    "<!doctype html><html><head><meta charset='utf-8'><title>" + grcT("grc.actifs.pdf.title") + "</title><style>" +
    "body{font-family:system-ui,Arial,sans-serif;color:#111;max-width:1100px;margin:2rem auto;line-height:1.5;}" +
    "h1{margin-bottom:0;}" +
    "table{border-collapse:collapse;width:100%;font-size:0.85em;}" +
    "th,td{border:1px solid #ccc;padding:0.4em 0.6em;text-align:left;vertical-align:top;}" +
    "th{background:#f0f0f0;}" +
    "@media print{body{margin:0;}}" +
    "</style></head><body>" + body +
    "<script>window.onload=()=>setTimeout(()=>window.print(),200);<\/script>" +
    "</body></html>";
  const win = window.open("", "_blank");
  if (!win) {
    alert(grcT("grc.common.popupBlocked"));
    return;
  }
  win.document.open();
  win.document.write(html);
  win.document.close();
}

/* Construit et branche la section "Registre des actifs" de
   grc/actifs.html : bouton + formulaire (add/edit) + liste accordéon
   (add/edit/delete), même mécanique que setupNetworkConfigCard() dans
   project/settings.html. Respecte le coffre-fort via vaultGateOr(). */
function initGrcAssetRegistry() {
  const container = document.getElementById("grcAssetRegistry");
  if (!container) return;
  if (vaultGateOr(container, initGrcAssetRegistry)) return;

  let editingId = null;
  let expandedId = null;

  container.innerHTML = `
    <div class="grc-registry-toolbar">
      <button type="button" class="grc-registry-add-btn" id="assetAddBtn">${grcT("grc.actifs.form.addBtn")}</button>
      <button type="button" class="grc-registry-io-btn" id="assetExportBtn">${grcT("grc.common.btnExport")}</button>
      <button type="button" class="grc-registry-io-btn" id="assetExportPdfBtn">${grcT("grc.common.btnExportPdf")}</button>
      <button type="button" class="grc-registry-io-btn" id="assetImportBtn">${grcT("grc.common.btnImport")}</button>
      <input type="file" accept="application/json" id="assetImportFile" style="display:none">
    </div>
    <form class="grc-registry-form" id="assetForm" style="display:none">
      <h3 id="assetFormTitle">${grcT("grc.actifs.form.title")}</h3>
      <label>${grcT("grc.actifs.form.name")} <input type="text" id="assetName" required></label>
      <label>${grcT("grc.actifs.form.type")}
        <select id="assetType">
          ${GRC_ASSET_TYPES.map((t) => `<option value="${t}">${grcT("grc.actifs.type." + t)}</option>`).join("")}
        </select>
      </label>
      <div class="grc-registry-form-row">
        <label>${grcT("grc.actifs.form.confidentiality")} <input type="number" id="assetC" min="1" max="3" value="1" required></label>
        <label>${grcT("grc.actifs.form.integrity")} <input type="number" id="assetI" min="1" max="3" value="1" required></label>
        <label>${grcT("grc.actifs.form.availability")} <input type="number" id="assetA" min="1" max="3" value="1" required></label>
      </div>
      <label>${grcT("grc.actifs.form.role")}
        <select id="assetRole">
          <option value="primaire">${grcT("grc.actifs.form.rolePrimary")}</option>
          <option value="support">${grcT("grc.actifs.form.roleSupport")}</option>
        </select>
      </label>
      <label>${grcT("grc.actifs.form.owner")} <input type="text" id="assetOwner"></label>
      <label>${grcT("grc.actifs.form.nextReview")} <input type="date" id="assetNextReviewDate"></label>
      <label>${grcT("grc.actifs.form.dependsOn")}
        <select id="assetDependsOn" multiple size="4"></select>
      </label>
      <label>${grcT("grc.actifs.form.notes")} <textarea id="assetNotes" rows="2"></textarea></label>
      <div class="grc-registry-form-actions">
        <button type="submit" class="grc-registry-add-btn">${grcT("grc.common.btnSave")}</button>
        <button type="button" class="grc-registry-io-btn" id="assetCancelBtn">${grcT("grc.common.btnCancel")}</button>
      </div>
    </form>
    <ul class="grc-registry-list" id="assetList"></ul>
  `;

  function populateDependsOn(currentId) {
    const select = container.querySelector("#assetDependsOn");
    select.innerHTML = "";
    getGrcAssets()
      .filter((a) => a.id !== currentId)
      .forEach((a) => {
        const opt = document.createElement("option");
        opt.value = a.id;
        opt.textContent = a.name;
        select.appendChild(opt);
      });
  }

  function showForm(asset) {
    editingId = asset ? asset.id : null;
    container.querySelector("#assetFormTitle").textContent = asset ? grcT("grc.actifs.form.titleEdit") : grcT("grc.actifs.form.title");
    container.querySelector("#assetName").value = asset ? asset.name : "";
    container.querySelector("#assetType").value = asset ? asset.type : GRC_ASSET_TYPES[0];
    container.querySelector("#assetC").value = asset ? asset.c : 1;
    container.querySelector("#assetI").value = asset ? asset.i : 1;
    container.querySelector("#assetA").value = asset ? asset.a : 1;
    container.querySelector("#assetRole").value = asset ? asset.role : "primaire";
    container.querySelector("#assetOwner").value = asset ? (asset.owner || "") : "";
    container.querySelector("#assetNextReviewDate").value = asset ? (asset.nextReviewDate || "") : "";
    container.querySelector("#assetNotes").value = asset ? (asset.notes || "") : "";
    populateDependsOn(editingId);
    const dependsOn = asset && Array.isArray(asset.dependsOn) ? asset.dependsOn : [];
    Array.from(container.querySelector("#assetDependsOn").options).forEach((opt) => {
      opt.selected = dependsOn.includes(opt.value);
    });
    container.querySelector("#assetForm").style.display = "";
    container.querySelector("#assetAddBtn").style.display = "none";
    container.querySelector("#assetFormTitle").scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function hideForm() {
    editingId = null;
    container.querySelector("#assetForm").reset();
    container.querySelector("#assetForm").style.display = "none";
    container.querySelector("#assetAddBtn").style.display = "";
  }

  container.querySelector("#assetAddBtn").addEventListener("click", () => showForm(null));
  container.querySelector("#assetCancelBtn").addEventListener("click", hideForm);
  container.querySelector("#assetExportBtn").addEventListener("click", exportGrcAssetsAsJson);
  container.querySelector("#assetExportPdfBtn").addEventListener("click", exportGrcAssetsAsPdf);
  container.querySelector("#assetImportBtn").addEventListener("click", () => container.querySelector("#assetImportFile").click());
  container.querySelector("#assetImportFile").addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;
    importGrcAssetsFromJson(file)
      .then(renderGrcAssetList)
      .catch((err) => alert(err.message || grcT("grc.common.invalidJsonFile")))
      .finally(() => { e.target.value = ""; });
  });

  container.querySelector("#assetForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const name = container.querySelector("#assetName").value.trim();
    if (!name) return;
    const dependsOn = Array.from(container.querySelector("#assetDependsOn").selectedOptions).map((o) => o.value);
    const data = {
      name,
      type: container.querySelector("#assetType").value,
      c: Number(container.querySelector("#assetC").value) || 1,
      i: Number(container.querySelector("#assetI").value) || 1,
      a: Number(container.querySelector("#assetA").value) || 1,
      role: container.querySelector("#assetRole").value,
      owner: container.querySelector("#assetOwner").value.trim(),
      nextReviewDate: container.querySelector("#assetNextReviewDate").value,
      notes: container.querySelector("#assetNotes").value.trim(),
      dependsOn,
    };
    if (editingId) updateGrcAsset(editingId, data);
    else addGrcAsset(data);
    hideForm();
    renderGrcAssetList();
  });

  function buildAssetItem(asset) {
    const crit = grcAssetCriticalityLabel(grcAssetCriticality(asset));
    const li = document.createElement("li");
    li.className = "grc-registry-item" + (asset.id === expandedId ? " open" : "");

    const header = document.createElement("div");
    header.className = "grc-registry-header";
    header.innerHTML =
      `<span>${grkEscapeHtml(asset.name)} — ${grcAssetTypeLabel(asset.type)}</span>` +
      `<span class="grc-crit-badge ${crit.cls}">${crit.text}</span>` +
      `<span class="chevron">▸</span>`;
    header.onclick = () => {
      expandedId = expandedId === asset.id ? null : asset.id;
      renderGrcAssetList();
    };
    li.appendChild(header);

    if (asset.id === expandedId) {
      const body = document.createElement("div");
      body.className = "grc-registry-body";

      const deps = (asset.dependsOn || [])
        .map((depId) => getGrcAssets().find((a) => a.id === depId))
        .filter(Boolean)
        .map((a) => a.name);

      const roleLabel = asset.role === "support" ? grcT("grc.actifs.form.roleSupport") : grcT("grc.actifs.form.rolePrimary");

      body.innerHTML =
        `<p>${grcT("grc.actifs.detail.cia").replace("{c}", grkEscapeHtml(asset.c)).replace("{i}", grkEscapeHtml(asset.i)).replace("{a}", grkEscapeHtml(asset.a)).replace("{role}", roleLabel)}</p>` +
        (asset.owner ? `<p>${grcT("grc.actifs.detail.owner").replace("{owner}", grkEscapeHtml(asset.owner))}</p>` : "") +
        (asset.nextReviewDate ? `<p>${grcT("grc.actifs.detail.nextReview").replace("{date}", grkEscapeHtml(asset.nextReviewDate))}</p>` : "") +
        (deps.length ? `<p>${grcT("grc.actifs.detail.dependsOn").replace("{names}", grkEscapeHtml(deps.join(", ")))}</p>` : "") +
        (asset.notes ? `<p>${grkEscapeHtml(asset.notes)}</p>` : "");

      const editBtn = document.createElement("button");
      editBtn.type = "button";
      editBtn.className = "grc-registry-add-btn";
      editBtn.textContent = grcT("grc.common.btnEdit");
      editBtn.onclick = () => showForm(asset);
      body.appendChild(editBtn);

      const deleteBtn = document.createElement("button");
      deleteBtn.type = "button";
      deleteBtn.className = "grc-registry-io-btn";
      deleteBtn.textContent = grcT("grc.common.btnDelete");
      deleteBtn.onclick = () => {
        if (!confirm(grcT("grc.common.confirmDelete").replace("{name}", asset.name))) return;
        removeGrcAsset(asset.id);
        if (expandedId === asset.id) expandedId = null;
        renderGrcAssetList();
      };
      body.appendChild(deleteBtn);

      li.appendChild(body);
    }

    return li;
  }

  window.renderGrcAssetList = function () {
    const list = container.querySelector("#assetList");
    list.innerHTML = "";
    getGrcAssets().forEach((asset) => list.appendChild(buildAssetItem(asset)));
  };

  renderGrcAssetList();
}
