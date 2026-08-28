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
   la vraie infrastructure, même justification que Network/Topology. */

const GRC_ASSETS_KEY = "/grc/actifs/registry";

const GRC_ASSET_TYPES = [
  { value: "physique", label: "Physique" },
  { value: "logiciel", label: "Logiciel" },
  { value: "donnee", label: "Donnée" },
  { value: "humain", label: "Humain" },
  { value: "reseau", label: "Réseau" },
];

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
  if (level >= 3) return { cls: "high", text: "Élevée" };
  if (level >= 2) return { cls: "medium", text: "Moyenne" };
  return { cls: "low", text: "Faible" };
}

function grcAssetTypeLabel(value) {
  const found = GRC_ASSET_TYPES.find((t) => t.value === value);
  return found ? found.label : value;
}

async function exportGrcAssetsAsJson() {
  const data = await vaultMaybeEncryptForExport(getGrcAssets());
  exportJsonFile(data, "grc-actifs.json");
}

async function importGrcAssetsFromJson(file) {
  const raw = await readJsonFile(file);
  const assets = await vaultMaybeDecryptImport(raw);
  if (!Array.isArray(assets)) throw new Error("Format invalide : un tableau d'actifs est attendu.");
  saveGrcAssets(assets);
}

function resetGrcAssets() {
  vaultRemoveItem(GRC_ASSETS_KEY);
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
      <button type="button" class="grc-registry-add-btn" id="assetAddBtn">+ Ajouter un actif</button>
      <button type="button" class="grc-registry-io-btn" id="assetExportBtn">⬇ Exporter</button>
      <button type="button" class="grc-registry-io-btn" id="assetImportBtn">⬆ Importer</button>
      <input type="file" accept="application/json" id="assetImportFile" style="display:none">
    </div>
    <form class="grc-registry-form" id="assetForm" style="display:none">
      <h3 id="assetFormTitle">Ajouter un actif</h3>
      <label>Nom <input type="text" id="assetName" required></label>
      <label>Type
        <select id="assetType">
          ${GRC_ASSET_TYPES.map((t) => `<option value="${t.value}">${t.label}</option>`).join("")}
        </select>
      </label>
      <div class="grc-registry-form-row">
        <label>Confidentialité (1-3) <input type="number" id="assetC" min="1" max="3" value="1" required></label>
        <label>Intégrité (1-3) <input type="number" id="assetI" min="1" max="3" value="1" required></label>
        <label>Disponibilité (1-3) <input type="number" id="assetA" min="1" max="3" value="1" required></label>
      </div>
      <label>Rôle
        <select id="assetRole">
          <option value="primaire">Primaire</option>
          <option value="support">Support</option>
        </select>
      </label>
      <label>Propriétaire <input type="text" id="assetOwner"></label>
      <label>Prochaine revue <input type="date" id="assetNextReviewDate"></label>
      <label>Dépendances (autres actifs)
        <select id="assetDependsOn" multiple size="4"></select>
      </label>
      <label>Notes <textarea id="assetNotes" rows="2"></textarea></label>
      <div class="grc-registry-form-actions">
        <button type="submit" class="grc-registry-add-btn">Enregistrer</button>
        <button type="button" class="grc-registry-io-btn" id="assetCancelBtn">Annuler</button>
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
    container.querySelector("#assetFormTitle").textContent = asset ? "Modifier l'actif" : "Ajouter un actif";
    container.querySelector("#assetName").value = asset ? asset.name : "";
    container.querySelector("#assetType").value = asset ? asset.type : GRC_ASSET_TYPES[0].value;
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
  container.querySelector("#assetImportBtn").addEventListener("click", () => container.querySelector("#assetImportFile").click());
  container.querySelector("#assetImportFile").addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;
    importGrcAssetsFromJson(file)
      .then(renderGrcAssetList)
      .catch((err) => alert(err.message || "Fichier JSON invalide."))
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
      `<span>${asset.name} — ${grcAssetTypeLabel(asset.type)}</span>` +
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

      body.innerHTML =
        `<p>CIA : C${asset.c} / I${asset.i} / A${asset.a} — Rôle : ${asset.role === "support" ? "Support" : "Primaire"}</p>` +
        (asset.owner ? `<p>Propriétaire : ${asset.owner}</p>` : "") +
        (asset.nextReviewDate ? `<p>Prochaine revue : ${asset.nextReviewDate}</p>` : "") +
        (deps.length ? `<p>Dépend de : ${deps.join(", ")}</p>` : "") +
        (asset.notes ? `<p>${asset.notes}</p>` : "");

      const editBtn = document.createElement("button");
      editBtn.type = "button";
      editBtn.className = "grc-registry-add-btn";
      editBtn.textContent = "Modifier";
      editBtn.onclick = () => showForm(asset);
      body.appendChild(editBtn);

      const deleteBtn = document.createElement("button");
      deleteBtn.type = "button";
      deleteBtn.className = "grc-registry-io-btn";
      deleteBtn.textContent = "Supprimer";
      deleteBtn.onclick = () => {
        if (!confirm(`Supprimer "${asset.name}" ?`)) return;
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
