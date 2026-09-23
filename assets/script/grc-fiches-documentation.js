/* Documentation — Documentation (grc/documentation.html) · ISO 27001 cl. 7.5.
   Onzième étape : maîtriser les documents et les preuves. Le registre
   documentaire existant est réutilisé ; versions, approbations et
   historique en sont des vues ; archivage, conservation et preuves
   d'audit ont leurs fiches. Moteur : grc-fiches.js ; plan :
   spec/grc-fiches/plan.md. IDs STABLES. */

(function () {
  const O = (v, fr, en) => ({ v: v, label: { fr: fr, en: en } });
  const L = (fr, en) => ({ fr: fr, en: en });

  const docs = () => grcFicheSrc.documents();
  const history = () => {
    const rows = [];
    docs().forEach((d) => (Array.isArray(d.history) ? d.history : []).forEach((h) =>
      rows.push({ ts: h.ts || "", doc: d.title || "", version: h.version || "", change: h.change || "", by: h.by || "" })));
    return rows.sort((a, b) => String(b.ts).localeCompare(String(a.ts)));
  };

  grcFicheRegister("documentation", {
    docTitle: L("Maîtrise de l’information documentée", "Control of documented information"),
    docRef: "ISO/IEC 27001:2022 clause 7.5 · Annex A 5.33",
    elements: [
      {
        id: "registre",
        essential: true,
        kind: "register",
        title: L("Registre documentaire", "Document register"),
        ref: L("ISO 27001 cl. 7.5", "ISO 27001 cl. 7.5"),
        desc: L("Tous les documents du SGSI (politiques, normes, formulaires…) avec leur cycle de vie : brouillon → approuvé → publié → révisé → retiré.",
          "All ISMS documents (policies, standards, forms…) with their lifecycle: draft → approved → published → revised → retired."),
        block: "#grcDocumentsRegistry",
        count: () => docs().filter((d) => ["policy", "standard", "form", "other"].indexOf(d.docType) !== -1).length,
        reinit: () => initGrcDocumentsRegistry({ docTypes: ["policy", "standard", "form", "other"], primaryType: "policy" }),
        table: () => ({
          columns: [L("Document", "Document"), L("Type", "Type"), L("Version", "Version"), L("Statut", "Status"), L("Propriétaire", "Owner")],
          rows: docs().map((d) => [d.title || "", d.docType || "", d.version || "", d.status || "", d.owner || ""]),
        }),
      },
      {
        id: "versions",
        kind: "view",
        title: L("Contrôle des versions", "Version control"),
        ref: L("ISO 27001 cl. 7.5.2", "ISO 27001 cl. 7.5.2"),
        desc: L("La version en vigueur de chaque document (tous types) et sa prochaine revue.",
          "The current version of every document (all types) and its next review."),
        table: () => ({
          columns: [L("Document", "Document"), L("Version en vigueur", "Current version"), L("Statut", "Status"), L("Prochaine revue", "Next review")],
          rows: docs().map((d) => [d.title || "", d.version || "", d.status || "", grcFicheFmtDate(d.review && d.review.nextDueAt)]),
          empty: L("Aucun document.", "No document."),
        }),
        manage: "registre",
      },
      {
        id: "approbations",
        kind: "view",
        title: L("Approbations", "Approvals"),
        ref: L("ISO 27001 cl. 7.5.2", "ISO 27001 cl. 7.5.2"),
        desc: L("Qui approuve quel document, et quand il l’a été. Un document publié sans approbateur est signalé.",
          "Who approves which document, and when it was approved. A published document without an approver is flagged."),
        table: () => ({
          columns: [L("Document", "Document"), L("Approbateur", "Approver"), L("Approuvé le", "Approved on"), L("Statut", "Status")],
          rows: docs().map((d) => [d.title || "", d.approver || (d.status === "published" ? "⚠ " + grcFicheL(L("aucun", "none")) : ""),
            grcFicheFmtDate(d.approvedAt), d.status || ""]),
          empty: L("Aucun document.", "No document."),
        }),
        manage: "registre",
      },
      {
        id: "archivage",
        example: { type: L("Politiques approuvées", "Approved policies"), lieu: L("Gestion documentaire", "Document management"), format: "PDF", duree: L("7 ans", "7 years") },
        title: L("Archivage", "Archiving"),
        ref: L("ISO 27001 cl. 7.5.3 · A.5.33", "ISO 27001 cl. 7.5.3 · A.5.33"),
        desc: L("Où et comment les versions retirées et les enregistrements sont archivés, pour combien de temps et sous la responsabilité de qui. Exemple : politiques retirées — archive SharePoint en lecture seule, PDF, 7 ans, responsable GRC.",
          "Where and how retired versions and records are archived, for how long and under whose responsibility. Example: retired policies — read-only SharePoint archive, PDF, 7 years, GRC lead."),
        header: ["type", "lieu"],
        fields: [
          { id: "type", type: "text", required: true, suggest: "type-doc", label: L("Type de document ou d’enregistrement", "Document or record type") },
          { id: "lieu", type: "text", label: L("Lieu d’archivage", "Archive location") },
          { id: "format", type: "text", suggest: "format", label: L("Format", "Format") },
          { id: "duree", type: "text", suggest: "duree", label: L("Durée", "Duration") },
          { id: "responsable", type: "text", suggest: { vocab: "roles", from: ["role"] }, label: L("Responsable", "Owner") },
        ],
      },
      {
        id: "conservation",
        example: { categorie: L("Journaux de sécurité", "Security logs"), duree: L("1 an", "1 year"), base: L("Exigence contractuelle", "Contractual requirement") },
        title: L("Conservation", "Retention"),
        ref: L("ISO 27001 A.5.33", "ISO 27001 A.5.33"),
        desc: L("Le calendrier de conservation : durée par catégorie de document, base légale, et mode de destruction à l’échéance. Les règles propres aux renseignements personnels sont dans Protection des renseignements personnels.",
          "The retention schedule: period per document category, legal basis, and disposal method at the end. Rules specific to personal information are in Personal information protection."),
        header: ["categorie", "duree"],
        fields: [
          { id: "categorie", type: "text", required: true, suggest: "type-doc", label: L("Catégorie", "Category") },
          { id: "duree", type: "text", suggest: "duree", label: L("Durée de conservation", "Retention period") },
          { id: "base", type: "text", suggest: "base-conservation", label: L("Base légale ou d’affaires", "Legal or business basis") },
          { id: "destruction", type: "select", label: L("Mode de destruction", "Disposal method"), options: [
            O("suppression", "Suppression sécurisée", "Secure deletion"), O("dechiquetage", "Déchiquetage", "Shredding"),
            O("anonymisation", "Anonymisation", "Anonymization"), O("archivage", "Archivage permanent", "Permanent archive"),
          ] },
        ],
        links: [{ href: "vie-privee.html#fiche-conservation", label: L("Conservation des renseignements personnels", "Personal information retention") }],
      },
      {
        id: "preuves-audit",
        example: { preuve: L("Rapport de revue des accès du T1", "Q1 access review report"), emplacement: L("SharePoint › Conformité › Preuves", "SharePoint › Compliance › Evidence"), responsable: L("RSSI", "CISO") },
        essential: true,
        title: L("Preuves d’audit", "Audit evidence"),
        ref: L("ISO 27001 cl. 7.5 · 9.2 · A.5.33", "ISO 27001 cl. 7.5 · 9.2 · A.5.33"),
        desc: L("Les enregistrements qui prouvent qu’un contrôle ou une clause est appliqué, et où les trouver le jour de l’audit. Exemple : revue des accès T1 — rapport signé, dossier Audit/2026/IAM, responsable TI.",
          "The records proving a control or clause is applied, and where to find them on audit day. Example: Q1 access review — signed report, Audit/2026/IAM folder, IT lead."),
        header: ["preuve", "controle"],
        fields: [
          { id: "preuve", type: "text", required: true, label: L("Preuve", "Evidence") },
          { id: "controle", type: "ref", label: L("Contrôle ou clause", "Control or clause"),
            source: () => grcFicheRefFrom(grcFicheSrc.controls(), (c) => (c.isoRef ? c.isoRef + " — " : "") + (c.name || "")) },
          { id: "emplacement", type: "text", label: L("Emplacement", "Location") },
          { id: "responsable", type: "text", suggest: { vocab: "roles", from: ["role"] }, label: L("Responsable", "Owner") },
          { id: "date", type: "text", label: L("Date (AAAA-MM-JJ)", "Date (YYYY-MM-DD)") },
        ],
      },
      {
        id: "historique",
        kind: "view",
        title: L("Historique des modifications", "Change history"),
        ref: L("ISO 27001 cl. 7.5.3", "ISO 27001 cl. 7.5.3"),
        desc: L("Qui a modifié quel document, quand et pourquoi — tiré du journal de versions du registre.",
          "Who changed which document, when and why — taken from the register’s version log."),
        table: () => ({
          columns: [L("Date", "Date"), L("Document", "Document"), L("Version", "Version"), L("Modification", "Change"), L("Par", "By")],
          rows: history().map((h) => [grcFicheFmtDate(h.ts), h.doc, h.version, h.change, h.by]),
          empty: L("Aucune modification enregistrée.", "No change recorded."),
        }),
        manage: "registre",
      },
    ],
  });
})();
