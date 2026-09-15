/* Registre de risques -- migré sur grc-registry-kit.js (grk*) pour le
   CRUD/registre/liste (PlanDurcissement-Securite.txt P2, module 2/5).
   Le plan de traitement (risk.treatmentPlan, moitié basse de ce fichier
   + grc-risk-treatment-panel.js) était bâti sur le kit depuis
   spec/grc-registry-upgrades/70-risk-treatment.md -- devenu un registre
   PARTAGÉ (grc-treatment-plans.js, many-to-many : un plan peut être lié
   à plusieurs risques, un risque peut cumuler plusieurs plans) : un
   risque ne garde plus qu'une LIAISON (planIds[] + résiduel/acceptation
   PROPRES à lui, un seul couple par risque même avec plusieurs plans)
   vers ses plans, voir la note dédiée plus bas et grcRiskTreatmentPlans().
   Nécessite grc-treatment-plans.js chargé AVANT ce fichier (GRC_RT_*, grcTp*).

   PAS de `schema:` grkEnsure pour le risque lui-même (contrairement aux
   autres domaines kit) : risk.treatmentPlan est un sous-objet OPTIONNEL
   dont l'ABSENCE fait foi (grcRiskHasTreatment() teste juste sa
   présence) -- un schéma grkEnsure matérialiserait toujours un objet
   pour un champ déclaré de type "object", cassant cette distinction
   "jamais traité" vs "traité avec les valeurs par défaut". Les risques
   passent donc tels quels (comme avant cette migration), échappage
   grkEscapeHtml au rendu (comme avant : grcEscapeHtml -> grkEscapeHtml,
   même garantie).

   Chaque risque référence un ou plusieurs actifs du registre
   grc-assets.js (assetIds) -- déplacé du formulaire principal (un
   <select multiple> n'a pas d'équivalent dans le form déclaratif de
   grkRegistry, cf 00-shared-kit.md §2.3) vers le panneau déplié, même
   schéma "ajouter un lien à la fois + ✕" que linkedControls du plan de
   traitement (grcRiskAddAsset/RemoveAsset, nouveau). Pas de contrainte
   d'intégrité forte -- si un actif référencé est supprimé entre-temps,
   il est simplement filtré à l'affichage (voir getRiskAssetNames), pas
   de blocage.

   Tout le texte affiché passe par grcT() (assets/script/grc-i18n.js,
   déjà le cas avant cette migration) -- STATUSES/STRATEGIES restent des
   clés internes stables, la traduction vient de grc.risques.status.* et
   grc.risques.strategy.* à l'affichage.

   Compat externe -- NE PAS renommer sans mettre à jour ces appelants :
     - assets/script/inline/dashboard-upcoming-reviews.js : getGrcRisks()
       -> lit .name / .reviewDate directement.
     - assets/script/grc-controls.js : getGrcRisks() (datalist croisée).
     - assets/script/grc-registry-kit.js (_GRK_REGISTRIES.risks).
     - assets/script/inline/settings.js : getGrcRisks/saveGrcRisks/
       resetGrcRisks (Sauvegarde complète / Reset). */

const GRC_RISKS_KEY = "/grc/analyse-risques/registry";

const GRC_RISK_STATUSES = ["ouvert", "traite", "accepte"];

// Échelle qualitative 1-5 de la matrice (voir grc-i18n.js
// grc.risques.scale.probability/impact.*) -- même liste utilisée pour
// peupler les <select> du formulaire et les sous-titres d'axe de la
// matrice (_grcRiskRenderMatrix).
const GRC_RISK_LEVELS = [1, 2, 3, 4, 5];

// Les 4 stratégies ISO 27005 / NIST GV.RM (voir grc/traitement-risques.html).
// "" (Non défini) reste sélectionnable : la stratégie peut ne pas encore
// être décidée pour un risque nouvellement créé.
const GRC_RISK_TREATMENT_STRATEGIES = ["", "evitement", "mitigation", "transfert", "acceptation"];

function grcRiskStrategyI18nKey(value) {
  return value ? "grc.risques.strategy." + value : "grc.risques.strategy.none";
}

// Normalise UNIQUEMENT les valeurs soumises par le formulaire (jamais le
// risque stocké en entier -- voir la note d'en-tête) : enums + nombres.
// Champs absents du descripteur (id, assetIds, treatmentPlan...) restent
// hors de portée de grkEnsure() par construction, jamais touchés ici.
const GRC_RISK_FORM_SCHEMA = {
  name: { type: "string" },
  threat: { type: "string" },
  vulnerability: { type: "string" },
  probability: { type: "number", default: 1 },
  impact: { type: "number", default: 1 },
  treatmentStrategy: { type: "string", enum: GRC_RISK_TREATMENT_STRATEGIES, default: "" },
  treatment: { type: "string" },
  owner: { type: "string" },
  reviewDate: { type: "string" },
  status: { type: "string", enum: GRC_RISK_STATUSES, default: GRC_RISK_STATUSES[0] },
};

const _grcRiskStore = grkStore(GRC_RISKS_KEY);

function getGrcRisks() {
  return _grcRiskStore.get();
}

function saveGrcRisks(risks) {
  _grcRiskStore.save(risks);
}

function resetGrcRisks() {
  _grcRiskStore.remove();
}

function addGrcRisk(risk) {
  const risks = getGrcRisks();
  const id = grkId("risk");
  risks.push(Object.assign({ id }, risk));
  saveGrcRisks(risks);
  return id;
}

function updateGrcRisk(id, changes) {
  const risks = getGrcRisks();
  const idx = risks.findIndex((r) => r.id === id);
  if (idx === -1) return;
  risks[idx] = Object.assign({}, risks[idx], changes);
  saveGrcRisks(risks);
}

function removeGrcRisk(id) {
  saveGrcRisks(getGrcRisks().filter((r) => r.id !== id));
}

// Liens vers grc-assets.js -- un ajout/retrait à la fois depuis le
// panneau déplié (voir renderRiskDetailPanel), même schéma que
// grcSupAddLinkedIncident (grc-suppliers.js) / linkedControls du plan
// de traitement ci-dessous.
function grcRiskAddAsset(id, assetId) {
  const risks = getGrcRisks();
  const idx = risks.findIndex((r) => r.id === id);
  if (idx === -1) return false;
  const ids = Array.isArray(risks[idx].assetIds) ? risks[idx].assetIds.slice() : [];
  if (!assetId || ids.indexOf(assetId) !== -1) return false;
  ids.push(assetId);
  risks[idx] = Object.assign({}, risks[idx], { assetIds: ids });
  saveGrcRisks(risks);
  return true;
}

function grcRiskRemoveAsset(id, assetId) {
  const risks = getGrcRisks();
  const idx = risks.findIndex((r) => r.id === id);
  if (idx === -1) return false;
  const ids = (Array.isArray(risks[idx].assetIds) ? risks[idx].assetIds : []).filter((a) => a !== assetId);
  risks[idx] = Object.assign({}, risks[idx], { assetIds: ids });
  saveGrcRisks(risks);
  return true;
}

function grcRiskCriticality(risk) {
  return (risk.probability || 1) * (risk.impact || 1);
}

// Seuils pour une échelle 1-5 x 1-5 (score max 25) -- répartition
// approximative en tiers (bas ~32%, moyen ~28%, élevé ~40%, ce dernier
// délibérément plus large pour qu'un score élevé sur UN seul axe avec
// l'autre à 4-5 tombe déjà en "élevé", pas seulement les deux à 5).
function grcRiskCriticalityLabel(score) {
  if (score >= 16) return { cls: "high", text: grcT("grc.risques.crit.high") };
  if (score >= 9) return { cls: "medium", text: grcT("grc.risques.crit.medium") };
  return { cls: "low", text: grcT("grc.risques.crit.low") };
}

function grcRiskStatusLabel(value) {
  return GRC_RISK_STATUSES.includes(value) ? grcT("grc.risques.status." + value) : value;
}

function grcRiskTreatmentStrategyLabel(value) {
  return grcT(grcRiskStrategyI18nKey(value));
}

// Résout assetIds en noms d'actifs réels -- filtre silencieusement les
// ids d'actifs supprimés depuis (pas de FK réelle en localStorage).
function getRiskAssetNames(risk) {
  const assets = typeof getGrcAssets === "function" ? getGrcAssets() : [];
  return (risk.assetIds || [])
    .map((id) => assets.find((a) => a.id === id))
    .filter(Boolean)
    .map((a) => a.name);
}

function exportGrcRisksAsJson() {
  return grkExportJson(getGrcRisks(), "grc-risques-" + grkDateStamp() + ".json");
}

async function importGrcRisksFromJson(file) {
  const raw = await readJsonFile(file);
  const risks = await vaultMaybeDecryptImport(raw);
  if (!Array.isArray(risks)) throw new Error(grcT("grc.risques.pdf.invalidImport"));
  saveGrcRisks(risks);
}

/* Rapport HTML du registre des risques seul -- même mécanique que
   exportGrcAssetsAsPdf (grc-assets.js) : aucune librairie tierce, une
   page HTML autonome imprimée via window.print() dans un nouvel onglet. */
function grcRisksReportBody() {
  const risks = getGrcRisks();
  const generated = new Date().toLocaleString("fr-CA");
  let html = "<h1>" + grcT("grc.risques.pdf.title") + "</h1><p>" + grcT("grc.common.generatedOn") + " " + grkEscapeHtml(generated) + "</p>";

  if (risks.length === 0) {
    html += "<p>" + grcT("grc.risques.pdf.empty") + "</p>";
    return html;
  }

  html += "<table><thead><tr>" +
    "<th>" + grcT("grc.risques.pdf.colName") + "</th><th>" + grcT("grc.risques.pdf.colThreat") + "</th>" +
    "<th>" + grcT("grc.risques.pdf.colVulnerability") + "</th><th>" + grcT("grc.risques.pdf.colAssets") + "</th>" +
    "<th>" + grcT("grc.risques.pdf.colProbability") + "</th><th>" + grcT("grc.risques.pdf.colImpact") + "</th>" +
    "<th>" + grcT("grc.risques.pdf.colCrit") + "</th><th>" + grcT("grc.risques.pdf.colStatus") + "</th>" +
    "<th>" + grcT("grc.risques.pdf.colOwner") + "</th><th>" + grcT("grc.risques.pdf.colReviewDate") + "</th>" +
    "<th>" + grcT("grc.risques.pdf.colStrategy") + "</th><th>" + grcT("grc.risques.pdf.colTreatment") + "</th>" +
    "</tr></thead><tbody>";
  risks.forEach((risk) => {
    const crit = grcRiskCriticalityLabel(grcRiskCriticality(risk));
    html += "<tr>" +
      "<td>" + grkEscapeHtml(risk.name) + "</td>" +
      "<td>" + grkEscapeHtml(risk.threat || "") + "</td>" +
      "<td>" + grkEscapeHtml(risk.vulnerability || "") + "</td>" +
      "<td>" + grkEscapeHtml(getRiskAssetNames(risk).join(", ")) + "</td>" +
      "<td>" + grkEscapeHtml(risk.probability) + "</td><td>" + grkEscapeHtml(risk.impact) + "</td>" +
      "<td>" + grkEscapeHtml(crit.text) + "</td>" +
      "<td>" + grkEscapeHtml(grcRiskStatusLabel(risk.status)) + "</td>" +
      "<td>" + grkEscapeHtml(risk.owner || "") + "</td>" +
      "<td>" + grkEscapeHtml(risk.reviewDate || "") + "</td>" +
      "<td>" + grkEscapeHtml(grcRiskTreatmentStrategyLabel(risk.treatmentStrategy || "")) + "</td>" +
      "<td>" + grkEscapeHtml(risk.treatment || "") + "</td>" +
      "</tr>";
  });
  html += "</tbody></table>";

  // Plans de traitement STRUCTURÉS (registre partagé, grc-treatment-plans.js)
  // -- distincts des colonnes Stratégie/Traitement ci-dessus, qui ne
  // portent que les champs LEGACY en texte libre. riskTreatmentReportSection()
  // existait déjà (spec 70-risk-treatment.md, T6) mais n'était appelée par
  // aucun rapport réel -- ajoutée ici pour que le PDF/rapport du registre
  // montre effectivement le plan (stratégie/actions/résiduel/acceptation)
  // d'un risque qui en a un lié.
  const treated = risks.filter((r) => grcRiskTreatmentPlans(r).length);
  if (treated.length) {
    html += "<h2>" + grcT("grc.risques.pdf.treatmentSectionTitle") + "</h2>";
    treated.forEach((risk) => {
      html += "<h3>" + grkEscapeHtml(risk.name) + "</h3>" + riskTreatmentReportSection(risk);
    });
  }

  return html;
}

// Gate coffre ajoutée avec cette migration (absente avant -- un export
// coffre verrouillé produisait silencieusement un rapport vide plutôt
// que l'alerte standard, cf grkExportGated()). Passe par grkPrintWindow
// (même rendu table -- couleurs génériques du kit plutôt que sur-mesure).
function exportGrcRisksAsPdf() {
  grkPrintWindow(grcRisksReportBody(), grcT("grc.risques.pdf.title"));
}

/* Construit et branche la section "Registre des risques" de
   grc/analyse-risques.html : matrice 5x5 (probabilité x impact) +
   bouton/formulaire (add/edit) + liste accordéon (add/edit/delete),
   même mécanique que initGrcAssetRegistry(). Respecte le coffre-fort. */
// Matrice 5x5 probabilité x impact -- <div id="riskMatrix"> est un sibling
// STATIQUE de #grcRiskRegistry dans grc/analyse-risques.html (comme
// #grcRisksTreatmentSummary l'était déjà) : grkRegistry possède son
// conteneur en entier (toolbar/form/liste), donc plus de place pour un
// widget maison À L'INTÉRIEUR comme avant cette migration. Rafraîchie en
// side-effect de `summarise` ci-dessous (appelée à chaque renderList()
// interne du kit -- add/edit/delete/import -- donc toujours à jour sans
// écouteur séparé).
function _grcRiskRenderMatrix(risks) {
  const el = document.getElementById("riskMatrix");
  if (!el) return;
  const counts = {}; // "p-i" -> count
  risks.forEach((r) => {
    const key = (r.probability || 1) + "-" + (r.impact || 1);
    counts[key] = (counts[key] || 0) + 1;
  });

  let html = '<div class="grc-risk-matrix-grid">';
  html += '<div class="grc-risk-matrix-corner"></div>';
  for (let impact = 1; impact <= 5; impact++) {
    html += `<div class="grc-risk-matrix-axis">${grcT("grc.risques.matrix.impact").replace("{n}", impact)}`
      + `<br><span class="grc-risk-matrix-axis-desc">${grcT("grc.risques.scale.impact." + impact)}</span></div>`;
  }
  for (let prob = 5; prob >= 1; prob--) {
    html += `<div class="grc-risk-matrix-axis">${grcT("grc.risques.matrix.probability").replace("{n}", prob)}`
      + `<br><span class="grc-risk-matrix-axis-desc">${grcT("grc.risques.scale.probability." + prob)}</span></div>`;
    for (let impact = 1; impact <= 5; impact++) {
      const score = prob * impact;
      const cls = grcRiskCriticalityLabel(score).cls;
      const count = counts[prob + "-" + impact] || 0;
      html += `<div class="grc-risk-matrix-cell ${cls}">${count}</div>`;
    }
  }
  html += "</div>";
  el.innerHTML = html;
}

/* Panneau déplié d'un risque -- PAS grkPanel/onglets (comme
   grc-pentest.js avant lui) : contenu cohérent unique (détail + actifs
   liés), rien à séparer en facettes. Liens vers grc-assets.js déplacés
   ici depuis le formulaire principal (voir note d'en-tête) -- ajout un
   à la fois + ✕, même schéma que linkedControls du plan de traitement
   juste après (grkList/grkRow/grkAddForm/grkDelBtn). Le plan de
   traitement lui-même (renderRiskTreatmentPanel, déjà kit) est appelé
   tel quel à la fin, inchangé. */
function renderRiskDetailPanel(body, risk) {
  const assetNames = getRiskAssetNames(risk);
  const controllingControls = typeof getControlsForRisk === "function"
    ? getControlsForRisk(risk.id).map((c) => c.name)
    : [];

  const info = document.createElement("div");
  info.innerHTML =
    (risk.threat ? `<p>${grcT("grc.risques.detail.threat").replace("{value}", grkEscapeHtml(risk.threat))}</p>` : "") +
    (risk.vulnerability ? `<p>${grcT("grc.risques.detail.vulnerability").replace("{value}", grkEscapeHtml(risk.vulnerability))}</p>` : "") +
    `<p>${grcT("grc.risques.detail.probImpact").replace("{p}", grkEscapeHtml(risk.probability)).replace("{i}", grkEscapeHtml(risk.impact)).replace("{status}", grkEscapeHtml(grcRiskStatusLabel(risk.status)))}</p>` +
    (risk.owner ? `<p>${grcT("grc.risques.detail.owner").replace("{owner}", grkEscapeHtml(risk.owner))}</p>` : "") +
    (risk.reviewDate ? `<p>${grcT("grc.risques.detail.reviewDate").replace("{date}", grkEscapeHtml(risk.reviewDate))}</p>` : "") +
    (risk.treatmentStrategy ? `<p>${grcT("grc.risques.detail.strategy").replace("{value}", grkEscapeHtml(grcRiskTreatmentStrategyLabel(risk.treatmentStrategy)))}</p>` : "") +
    (risk.treatment ? `<p>${grcT("grc.risques.detail.treatment").replace("{value}", grkEscapeHtml(risk.treatment))}</p>` : "") +
    (controllingControls.length ? `<p>${grcT("grc.risques.detail.treatedBy").replace("{names}", grkEscapeHtml(controllingControls.join(", ")))}</p>` : "");
  body.appendChild(info);

  const assetList = grkList(body, "grc.risques.form.assets");
  assetNames.forEach((name, i) => {
    const assetId = risk.assetIds[i];
    const row = grkRow();
    const span = document.createElement("span");
    span.className = "grk-inv-grow";
    span.textContent = name;
    row.appendChild(span);
    row.appendChild(grkDelBtn(() => { grcRiskRemoveAsset(risk.id, assetId); renderGrcRiskRegistry(); }));
    assetList.appendChild(row);
  });
  if (!assetNames.length) assetList.appendChild(grkEmptyLine("grc.risques.detail.noAsset"));

  const allAssets = typeof getGrcAssets === "function" ? getGrcAssets() : [];
  const linkable = allAssets.filter((a) => (risk.assetIds || []).indexOf(a.id) === -1);
  if (linkable.length) {
    const sel = grkSelect(linkable.map((a) => a.id), linkable[0].id, (id) => {
      const a = linkable.find((x) => x.id === id);
      return a ? a.name : id;
    });
    const addForm = grkAddForm([sel], (form) => {
      grcRiskAddAsset(risk.id, sel.value);
      renderGrcRiskRegistry();
    });
    const addBtn = document.createElement("button");
    addBtn.type = "submit";
    addBtn.className = "grc-registry-add-btn";
    addBtn.textContent = grcT("grc.risques.detail.addAsset");
    addForm.appendChild(addBtn);
    body.appendChild(addForm);
  }

  const hasPlans = grcRiskTreatmentPlans(risk).length > 0;
  if (hasPlans && typeof renderRiskTreatmentPanel === "function") {
    renderRiskTreatmentPanel(body, risk);
    const dropBtn = document.createElement("button");
    dropBtn.type = "button";
    dropBtn.className = "grc-registry-io-btn grc-rt-drop";
    dropBtn.textContent = grcT("grc.risques.rt.drop");
    dropBtn.onclick = () => {
      if (!confirm(grcT("grc.risques.rt.dropConfirm"))) return;
      grcRiskDropTreatment(risk.id);
      renderGrcRiskRegistry();
    };
    body.appendChild(dropBtn);
  } else {
    // Ni traité, ni plan lié valide (jamais traité, OU le plan lié a été
    // supprimé du registre partagé depuis -- même deux affordances dans
    // les deux cas : créer un nouveau plan, ou en lier un existant.
    if (grcRiskHasTreatment(risk)) {
      const warn = document.createElement("p");
      warn.className = "grc-sup-warn";
      warn.textContent = grcT("grc.risques.rt.planMissing");
      body.appendChild(warn);
    }
    _grcRiskRenderTreatmentLinkUi(body, risk);
  }
}

// Deux affordances "ajouter un lien à la fois" (même schéma que
// assetIds plus haut) : créer un nouveau plan (nom prérempli avec celui
// du risque) OU lier un plan déjà existant du registre partagé.
function _grcRiskRenderTreatmentLinkUi(body, risk) {
  const nameInp = document.createElement("input");
  nameInp.type = "text";
  nameInp.className = "grk-inv-grow";
  nameInp.value = risk.name || "";
  const createForm = grkAddForm([nameInp], (form) => {
    grcRiskCreateAndLinkPlan(risk.id, nameInp.value);
    renderGrcRiskRegistry();
  });
  const createBtn = document.createElement("button");
  createBtn.type = "submit";
  createBtn.className = "grc-registry-add-btn grc-rt-start";
  createBtn.textContent = grcT("grc.risques.rt.createPlan");
  createForm.appendChild(createBtn);
  body.appendChild(createForm);

  const bind = grcRiskEnsureTreatment(risk);
  const allPlans = typeof getGrcTreatmentPlans === "function" ? getGrcTreatmentPlans() : [];
  const plans = allPlans.filter((p) => bind.planIds.indexOf(p.id) === -1);
  if (plans.length) {
    const sel = grkSelect(plans.map((p) => p.id), plans[0].id, (id) => {
      const p = plans.find((x) => x.id === id);
      return p ? p.name : id;
    });
    const linkForm = grkAddForm([sel], (form) => {
      grcRiskLinkTreatmentPlan(risk.id, sel.value);
      renderGrcRiskRegistry();
    });
    const linkBtn = document.createElement("button");
    linkBtn.type = "submit";
    linkBtn.className = "grc-registry-add-btn grc-rt-start";
    linkBtn.textContent = grcT("grc.risques.rt.linkPlan");
    linkForm.appendChild(linkBtn);
    body.appendChild(linkForm);
  }
}

function _grcRiskEnumOptions(values, i18nOf) {
  return values.map((v) => ({ value: v, label: i18nOf(v) }));
}

function initGrcRiskRegistry() {
  _grcMigrateLegacyTreatmentPlans();

  const init = grkRegistry({
    mount: "#grcRiskRegistry",
    summary: "#grcRisksTreatmentSummary",
    store: _grcRiskStore,
    idAttr: "data-risk-id",
    listGlobal: "renderGrcRiskRegistry",
    deepLink: true,
    i18n: {
      add: "grc.risques.form.addBtn",
      titleAdd: "grc.risques.form.title",
      titleEdit: "grc.risques.form.titleEdit",
      export: "grc.common.btnExport",
      import: "grc.common.btnImport",
    },
    form: [
      { id: "name", label: "grc.risques.form.name", type: "text", required: true },
      { id: "threat", label: "grc.risques.form.threat", type: "text" },
      { id: "vulnerability", label: "grc.risques.form.vulnerability", type: "text" },
      { id: "probability", label: "grc.risques.form.probability", type: "select",
        options: GRC_RISK_LEVELS.map((n) => ({ value: n, label: "grc.risques.scale.probability." + n })) },
      { id: "impact", label: "grc.risques.form.impact", type: "select",
        options: GRC_RISK_LEVELS.map((n) => ({ value: n, label: "grc.risques.scale.impact." + n })) },
      { id: "treatmentStrategy", label: "grc.risques.form.treatmentStrategy", type: "select",
        options: GRC_RISK_TREATMENT_STRATEGIES.map((s) => ({ value: s, label: grcRiskStrategyI18nKey(s) })) },
      { id: "treatment", label: "grc.risques.form.treatment", type: "textarea" },
      { id: "owner", label: "grc.risques.form.owner", type: "text" },
      { id: "reviewDate", label: "grc.risques.form.reviewDate", type: "text" },
      { id: "status", label: "grc.risques.form.status", type: "select",
        options: _grcRiskEnumOptions(GRC_RISK_STATUSES, (v) => "grc.risques.status." + v) },
    ],
    readForm: (r) => ({
      name: r.name, threat: r.threat, vulnerability: r.vulnerability,
      probability: r.probability, impact: r.impact,
      treatmentStrategy: r.treatmentStrategy || "", treatment: r.treatment,
      owner: r.owner, reviewDate: r.reviewDate, status: r.status,
    }),
    // grkEnsure() ici (juste sur les champs SOUMIS, jamais sur le risque
    // stocké en entier -- voir la note d'en-tête sur treatmentPlan) :
    // un <select> fraîchement affiché par grkRegistry.showForm(null) a
    // selectedIndex=-1/value="" tant que l'utilisateur ne l'a pas
    // touché (défaut du kit lui-même -- reproduit à l'identique sur un
    // module déjà "kit", grc-suppliers.js ; invisible là-bas seulement
    // parce que addGrcSupplier() route tout par grkEnsure). Sans ce
    // garde, créer un risque sans toucher aux listes déroulantes
    // Stratégie/Statut enregistrait des chaînes vides plutôt que les
    // valeurs par défaut voulues.
    submit: (v, editingId) => {
      const fields = grkEnsure(v, GRC_RISK_FORM_SCHEMA);
      fields.name = fields.name.trim();
      fields.threat = fields.threat.trim();
      fields.vulnerability = fields.vulnerability.trim();
      fields.treatment = fields.treatment.trim();
      fields.owner = fields.owner.trim();
      fields.reviewDate = fields.reviewDate.trim();
      if (editingId) updateGrcRisk(editingId, fields);
      else addGrcRisk(fields);
    },
    header: (r) => {
      const crit = grcRiskCriticalityLabel(grcRiskCriticality(r));
      const treated = grcRiskHasTreatment(r);
      const cells = [
        { text: r.name || "" },
        { badge: { cls: crit.cls, text: crit.text } },
      ];
      // Nodes directs (pas {text:...}, un <span> nu sans classe) pour
      // garder EXACTEMENT les classes CSS/hooks de test d'avant cette
      // migration (.grc-rt-badge, .grc-sup-mini-badge.grc-sup-badge-expired
      // -- voir grc.css + ProjetTest/tests/test_risk_treatment.py RT.a).
      if (treated) {
        const b = document.createElement("span");
        b.className = "grc-rt-badge";
        b.textContent = grcT("grc.risques.rt.badge");
        cells.push(b);
      }
      if (treated && grcRiskTreatmentOverdueActions(r)) {
        const b = document.createElement("span");
        b.className = "grc-sup-mini-badge grc-sup-badge-expired";
        b.textContent = grcT("grc.risques.rt.actionsOverdue");
        cells.push(b);
      }
      return cells;
    },
    panel: renderRiskDetailPanel,
    exportFn: exportGrcRisksAsJson,
    importFn: importGrcRisksFromJson,
    summarise: (list) => {
      _grcRiskRenderMatrix(list);
      const s = grcRisksTreatmentSummary(list);
      if (!s.total) return null;
      return {
        chips: [
          grcT("grc.risques.rt.summary.untreated").replace("{n}", s.untreated),
          grcT("grc.risques.rt.summary.overdueActions").replace("{n}", s.overdueActions),
          grcT("grc.risques.rt.summary.acceptanceReview").replace("{n}", s.acceptanceReview),
          grcT("grc.risques.rt.summary.avgReduction").replace("{v}", s.avgReductionPct == null ? "—" : s.avgReductionPct),
        ],
      };
    },
    confirmName: (r) => r.name || "",
  });

  init();

  // grkRegistry ne prévoit qu'UN bouton "Export" dans sa barre d'outils
  // (JSON) -- le rapport PDF du REGISTRE ENTIER (pas d'un risque) n'a
  // pas d'équivalent dans le kit (chaque domaine kit expose ses formats
  // multiples via un onglet "Export" PAR ENTITÉ, cf _rtRenderExport,
  // pas via la barre du haut). Ajouté à la main -- même bouton qu'avant
  // cette migration, juste réinséré après coup.
  const toolbar = document.querySelector("#grcRiskRegistry .grc-registry-toolbar");
  if (toolbar) {
    const pdfBtn = document.createElement("button");
    pdfBtn.type = "button";
    pdfBtn.className = "grc-registry-io-btn";
    pdfBtn.textContent = grcT("grc.common.btnExportPdf");
    pdfBtn.addEventListener("click", exportGrcRisksAsPdf);
    toolbar.appendChild(pdfBtn);
  }

  // id conservé pour compat -- ProjetTest/tests/test_risk_treatment.py
  // (déjà "kit" avant cette migration) cible #riskList directement.
  const list = document.querySelector("#grcRiskRegistry .grc-registry-list");
  if (list) list.id = "riskList";
}

/* ================================================================== *
 *  Plan de traitement des risques -- LIAISON vers un ou plusieurs plans
 *  PARTAGÉS, autonomes (grc-treatment-plans.js, grc/traitement-risques.html).
 *  Un risque garde un sous-objet OPTIONNEL `risk.treatmentPlan` (même
 *  esprit qu'avant -- absence = jamais traité, cf grcRiskHasTreatment),
 *  mais il ne contient plus QUE ce qui reste propre à CE risque : les
 *  liens (`planIds`, un risque peut cumuler plusieurs plans -- ex.
 *  MFA + segmentation réseau sur le même risque) et le résiduel/
 *  acceptation. Many-to-many au global : un plan peut aussi être lié à
 *  plusieurs risques (grcTpLinkedRiskCount). Résiduel/acceptation
 *  restent UN SEUL couple par risque (pas par plan) -- reflète l'effet
 *  combiné de tous ses plans, pas un score par plan.
 *  Stratégie/rationale/transferTo/actions/linkedControls VIVENT dans le
 *  registre des plans (grc-treatment-plans.js, grcTp*) -- lus ici via
 *  grcRiskTreatmentPlans().
 *
 *  NB : `risk.treatment` (string) et `risk.treatmentStrategy` (string)
 *  sont des champs LEGACY du formulaire -- le plan structuré utilise
 *  donc la clé `treatmentPlan` (objet) pour éviter la collision.
 *
 *  Nécessite grc-registry-kit.js (grk*) ET grc-treatment-plans.js
 *  (GRC_RT_*, grcTp*) chargés avant ce fichier. */

const GRC_RT_SCHEMA = {
  schema: { type: "number", default: 1 },
  planIds: { type: "array" },
  residual: {
    type: "object", of: {
      likelihood: { type: "number", default: null },
      impact: { type: "number", default: null },
    },
  },
  acceptance: {
    type: "object", of: {
      by: { type: "string" },
      at: { type: "iso" },
      reason: { type: "string" },
      reviewAt: { type: "iso" },
    },
  },
};

function grcRiskHasTreatment(risk) {
  return !!(risk && risk.treatmentPlan && typeof risk.treatmentPlan === "object");
}

// Renvoie une COPIE de la LIAISON bien formée (planIds + résiduel/
// acceptation propres au risque -- ne sauve pas). Tolère l'ancienne
// forme à liaison UNIQUE (`planId` string, la toute première version de
// ce chantier, déjà potentiellement en localStorage) en la convertissant
// à la volée en `planIds: [planId]`.
function grcRiskEnsureTreatment(risk) {
  const src = risk && risk.treatmentPlan && typeof risk.treatmentPlan === "object" ? risk.treatmentPlan : {};
  const patched = (!Array.isArray(src.planIds) && typeof src.planId === "string" && src.planId)
    ? Object.assign({}, src, { planIds: [src.planId] })
    : src;
  return grkEnsure(patched, GRC_RT_SCHEMA);
}

// Résout planIds en plans réels (registre partagé), dans l'ordre --
// filtre silencieusement les plans supprimés depuis (pas de FK forte,
// même philosophie que risk.assetIds). [] si aucun (jamais traité, ou
// tous les plans liés ont été supprimés -- l'appelant doit alors
// traiter le risque comme "plan manquant", pas planter).
function grcRiskTreatmentPlans(risk) {
  if (!grcRiskHasTreatment(risk)) return [];
  if (typeof getGrcTreatmentPlans !== "function") return [];
  const bind = grcRiskEnsureTreatment(risk);
  const all = getGrcTreatmentPlans();
  return bind.planIds
    .map((id) => all.find((p) => p && p.id === id))
    .filter(Boolean)
    .map(grcTpEnsureShape);
}

// Ajoute planId à la liste des liens de ce risque (no-op si déjà lié).
function _grcRiskAddPlanId(id, planId) {
  const risks = getGrcRisks();
  const idx = risks.findIndex((r) => r && r.id === id);
  if (idx === -1) return false;
  const t = grcRiskEnsureTreatment(risks[idx]);
  if (t.planIds.indexOf(planId) !== -1) return false;
  t.planIds = t.planIds.concat([planId]);
  risks[idx] = Object.assign({}, risks[idx], { treatmentPlan: t });
  saveGrcRisks(risks);
  return true;
}

// Crée un NOUVEAU plan partagé (seed stratégie depuis le legacy
// risk.treatmentStrategy la toute première fois, comme avant cette
// migration) puis l'AJOUTE aux plans liés de ce risque -- un risque peut
// cumuler plusieurs plans (ex. MFA + segmentation réseau sur le même
// risque), donc jamais de garde "déjà traité" ici : sert aussi bien à
// lier un premier plan qu'à en ajouter un de plus, ou à la récupération
// d'un risque dont tous les plans liés ont été supprimés depuis
// (grcRiskTreatmentPlans renvoie []) -- l'UI ne propose ces actions que
// quand c'est pertinent, rien d'autre à garder ici.
function grcRiskCreateAndLinkPlan(id, name) {
  const risks = getGrcRisks();
  const idx = risks.findIndex((r) => r && r.id === id);
  if (idx === -1) return false;
  const seed = _GRC_RT_LEGACY_STRATEGY[risks[idx].treatmentStrategy] || "mitigate";
  const planId = addGrcTreatmentPlan({ name: (name || risks[idx].name || "").trim(), strategy: seed });
  return _grcRiskAddPlanId(id, planId);
}

// Lie ce risque à un plan EXISTANT du registre partagé (en plus des
// plans déjà liés, le cas échéant).
function grcRiskLinkTreatmentPlan(id, planId) {
  if (!planId) return false;
  return _grcRiskAddPlanId(id, planId);
}

// Délie UN plan précis -- garde le résiduel/acceptation et les autres
// plans liés intacts. Ne supprime JAMAIS le plan partagé lui-même
// (d'autres risques peuvent encore s'y référer ; le supprimer est une
// action du registre des plans, pas de celui-ci).
function grcRiskUnlinkTreatmentPlan(id, planId) {
  const risks = getGrcRisks();
  const idx = risks.findIndex((r) => r && r.id === id);
  if (idx === -1) return false;
  const t = grcRiskEnsureTreatment(risks[idx]);
  const before = t.planIds.length;
  t.planIds = t.planIds.filter((x) => x !== planId);
  risks[idx] = Object.assign({}, risks[idx], { treatmentPlan: t });
  saveGrcRisks(risks);
  return t.planIds.length < before;
}

// Retire TOUT le traitement de ce risque (tous les plans liés + le
// résiduel + l'acceptation) -- remise à zéro complète, contrairement à
// grcRiskUnlinkTreatmentPlan qui ne délie qu'un plan à la fois.
function grcRiskDropTreatment(id) {
  const risks = getGrcRisks();
  const idx = risks.findIndex((r) => r && r.id === id);
  if (idx === -1) return false;
  const copy = Object.assign({}, risks[idx]);
  delete copy.treatmentPlan;
  risks[idx] = copy;
  saveGrcRisks(risks);
  return true;
}

// Mutation atomique de la LIAISON (résiduel/acceptation -- jamais du
// plan partagé, qui se mute via grcTpMutate dans grc-treatment-plans.js).
function grcRiskTreatmentMutate(id, fn) {
  const risks = getGrcRisks();
  const idx = risks.findIndex((r) => r && r.id === id);
  if (idx === -1) return null;
  const t = grcRiskEnsureTreatment(risks[idx]);
  const out = fn(t);
  risks[idx] = Object.assign({}, risks[idx], { treatmentPlan: t });
  saveGrcRisks(risks);
  return out === undefined ? null : out;
}

/* ---------- migration : ancien plan embarqué -> registre partagé --- */

// Idempotent : un risque déjà migré n'a plus la forme legacy
// ("strategy" dans treatmentPlan, pas de planId), donc ignoré aux
// passages suivants. Appelée une fois au boot de initGrcRiskRegistry()
// (donc dès qu'on visite grc/analyse-risques.html, où grc-treatment-
// plans.js est garanti chargé). Ne sauve que s'il y a effectivement
// quelque chose à migrer.
function _grcMigrateLegacyTreatmentPlans() {
  if (typeof addGrcTreatmentPlan !== "function") return;
  const risks = getGrcRisks();
  let changed = false;
  const migrated = risks.map((r) => {
    if (!r || !r.treatmentPlan || typeof r.treatmentPlan !== "object" || !("strategy" in r.treatmentPlan)) return r;
    const legacy = r.treatmentPlan;
    const planId = addGrcTreatmentPlan({
      name: "Plan — " + (r.name || r.id),
      strategy: legacy.strategy,
      rationale: legacy.rationale,
      transferTo: legacy.transferTo,
      actions: legacy.actions,
      linkedControls: legacy.linkedControls,
    });
    changed = true;
    return Object.assign({}, r, {
      treatmentPlan: grkEnsure({ planIds: [planId], residual: legacy.residual, acceptance: legacy.acceptance }, GRC_RT_SCHEMA),
    });
  });
  if (changed) saveGrcRisks(migrated);
}

/* ---------- résiduel / acceptation --------------------- */

function grcRiskSetResidual(id, patch) {
  return grcRiskTreatmentMutate(id, (t) => {
    const p = patch || {};
    ["likelihood", "impact"].forEach((k) => {
      if (k in p) {
        const n = Math.round(Number(p[k]));
        t.residual[k] = Number.isFinite(n) && n >= 1 && n <= 5 ? n : null;
      }
    });
    return true;
  });
}

function grcRiskSetAcceptance(id, patch) {
  return grcRiskTreatmentMutate(id, (t) => {
    const a = t.acceptance;
    const p = patch || {};
    if ("by" in p && typeof p.by === "string") a.by = p.by.trim();
    if ("reason" in p && typeof p.reason === "string") a.reason = p.reason;
    if ("at" in p) a.at = grkToIso(p.at);
    if ("reviewAt" in p) a.reviewAt = grkToIso(p.reviewAt);
    return true;
  });
}

/* ---------- dérivés ---------------------------------- */

function grcRiskInherentScore(risk) {
  return (Number(risk && risk.probability) || 1) * (Number(risk && risk.impact) || 1);
}

// Score résiduel l×i, ou null si l'un des deux manque.
function grcRiskResidualScore(risk) {
  const t = grcRiskHasTreatment(risk) ? grcRiskEnsureTreatment(risk) : null;
  const r = t && t.residual;
  if (!r || r.likelihood == null || r.impact == null) return null;
  return r.likelihood * r.impact;
}

// Réduction inhérent -> résiduel : { from, to, pct } (pct = 0..100), ou null.
function grcRiskReduction(risk) {
  const from = grcRiskInherentScore(risk);
  const to = grcRiskResidualScore(risk);
  if (to == null || !from) return null;
  return { from: from, to: to, pct: Math.max(0, Math.round((from - to) / from * 100)) };
}

function grcRiskActionOverdue(action) {
  if (!action || action.status === "done" || !action.dueAt) return false;
  const t = Date.parse(action.dueAt);
  return !isNaN(t) && t < Date.now();
}

// Somme des actions en retard sur TOUS les plans liés à ce risque.
function grcRiskTreatmentOverdueActions(risk) {
  return grcRiskTreatmentPlans(risk).reduce(
    (acc, p) => acc + p.actions.filter(grcRiskActionOverdue).length, 0);
}

// Acceptation requise ? (au moins un plan lié en stratégie "accept", OU
// résiduel non nul)
function grcRiskAcceptanceRequired(risk) {
  if (!grcRiskHasTreatment(risk)) return false;
  if (grcRiskTreatmentPlans(risk).some((p) => p.strategy === "accept")) return true;
  const rs = grcRiskResidualScore(risk);
  return rs != null && rs > 0;
}

function grcRiskAcceptanceDueForReview(risk) {
  if (!grcRiskHasTreatment(risk)) return false;
  const a = grcRiskEnsureTreatment(risk).acceptance;
  if (!a || !a.reviewAt) return false;
  const t = Date.parse(a.reviewAt);
  return !isNaN(t) && t < Date.now();
}

function grcRisksTreatmentSummary(list) {
  const arr = Array.isArray(list) ? list : [];
  const treated = arr.filter(grcRiskHasTreatment);
  const reductions = treated.map(grcRiskReduction).filter(Boolean);
  return {
    total: arr.length,
    untreated: arr.length - treated.length,
    overdueActions: treated.reduce((acc, r) => acc + grcRiskTreatmentOverdueActions(r), 0),
    acceptanceReview: treated.filter(grcRiskAcceptanceDueForReview).length,
    avgReductionPct: reductions.length
      ? Math.round(reductions.reduce((acc, x) => acc + x.pct, 0) / reductions.length)
      : null,
  };
}

/* ================================================================== *
 *  Traitement -- exports (spec 70-risk-treatment.md, T6).
 *  Le JSON du registre risques (exportGrcRisksAsJson) porte déjà
 *  `treatmentPlan`. Ci-dessous : un CSV « plan de traitement » et une
 *  section HTML réutilisable par le rapport GRC du hub.
 * ================================================================== */

// Un risque peut cumuler plusieurs plans -- une sous-section par plan
// (stratégie/rationale/transferTo/actions), puis le résiduel/acceptation
// UNE SEULE FOIS à la fin (propres au risque, pas à un plan en particulier).
function riskTreatmentReportSection(risk) {
  const plans = grcRiskTreatmentPlans(risk);
  if (!plans.length) return "";
  const L = (k) => grcT(k);
  const esc = (typeof grkEscapeHtml === "function") ? grkEscapeHtml : (s) => String(s == null ? "" : s);
  const red = grcRiskReduction(risk);
  const acceptance = grcRiskEnsureTreatment(risk).acceptance;
  let h = "<h4>" + L("grc.risques.rt.reportTitle") + "</h4>";
  plans.forEach((t) => {
    h += "<h5>" + esc(t.name) + "</h5>";
    h += "<table><tbody>" +
      "<tr><th>" + L("grc.risques.rt.strategy") + "</th><td>" + esc(L("grc.risques.rt.strat." + t.strategy)) + "</td></tr>" +
      "<tr><th>" + L("grc.risques.rt.rationale") + "</th><td>" + esc(t.rationale) + "</td></tr>" +
      (t.strategy === "transfer" ? "<tr><th>" + L("grc.risques.rt.transferTo") + "</th><td>" + esc(t.transferTo) + "</td></tr>" : "") +
      "</tbody></table>";
    if (t.actions.length) {
      h += "<ol>" + t.actions.map((a) =>
        "<li>" + (a.status === "done" ? "<s>" : "") + esc(a.text) + (a.status === "done" ? "</s>" : "") +
        (a.owner ? " — " + esc(a.owner) : "") +
        (a.dueAt ? " (" + esc(a.dueAt.slice(0, 10)) + (grcRiskActionOverdue(a) ? " ⚠" : "") + ")" : "") +
        "</li>").join("") + "</ol>";
    }
  });
  h += "<p><strong>" + L("grc.risques.rt.reduction") + " :</strong> " +
    (red ? esc(red.from + " → " + red.to + " (−" + red.pct + " %)") : "—") + "</p>";
  if (grcRiskAcceptanceRequired(risk)) {
    h += "<p><strong>" + L("grc.risques.rt.acceptance") + " :</strong> " +
      esc((acceptance.by || "—") + " — " + (acceptance.reason || "") +
      (acceptance.reviewAt ? " (" + L("grc.risques.rt.reviewAt") + " " + acceptance.reviewAt.slice(0, 10) +
        (grcRiskAcceptanceDueForReview(risk) ? " ⚠" : "") + ")" : "")) + "</p>";
  }
  return h;
}

// Une ligne par (risque, plan) -- le résiduel/réduction/revue
// d'acceptation (propres au risque) sont répétés sur chaque ligne d'un
// même risque, la stratégie/actions varient par plan.
function exportRiskTreatmentCsv(risks) {
  if (typeof grkExportGated === "function" && grkExportGated()) return;
  const arr = Array.isArray(risks) ? risks : [risks];
  const rows = [["risk", "plan", "strategy", "inherent", "residual", "reduction_pct",
    "open_actions", "acceptance_review"]];
  arr.forEach((r) => {
    const plans = grcRiskTreatmentPlans(r);
    if (!plans.length) return;
    const red = grcRiskReduction(r);
    plans.forEach((t) => {
      rows.push([
        r.name, t.name, t.strategy,
        grcRiskInherentScore(r),
        grcRiskResidualScore(r) == null ? "" : grcRiskResidualScore(r),
        red ? red.pct : "",
        t.actions.filter((a) => a.status !== "done").length,
        grcRiskAcceptanceDueForReview(r) ? "1" : "0",
      ]);
    });
  });
  const stamp = (typeof grkDateStamp === "function") ? grkDateStamp() : new Date().toISOString().slice(0, 10);
  if (typeof grkExportCsv === "function") {
    grkExportCsv(rows, "risques-plan-traitement-" + stamp + ".csv");
  }
}
