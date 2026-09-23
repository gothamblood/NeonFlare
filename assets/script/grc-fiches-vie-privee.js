/* Documentation — Protection des renseignements personnels
   (grc/vie-privee.html) · Loi 25 · ISO 27001 A.5.34. Quatorzième étape :
   protéger les renseignements personnels. Le registre vie privée
   (traitements, demandes, violations) est réutilisé ; consentements, EFVP,
   conservation… en sont des vues filtrées. Les obligations Loi 25 restent
   dans le registre de conformité (vue « Loi 25 » ci-dessous).
   Séparée de grc-fiches-conformite.js par spec/grc-hub-iso/ §2.
   Moteur : grc-fiches.js ; plan : spec/grc-fiches/plan.md. IDs STABLES. */

(function () {
  const L = (fr, en) => ({ fr: fr, en: en });

  const obligations = () => grcFicheSrc.compliance().filter((e) => e.kind !== "audit");
  const priv = () => grcFicheSrc.privacy();
  const processings = () => priv().filter((e) => e.kind !== "dsr" && e.kind !== "breach");
  const text = (o) => [o.ref, o.title, o.sourceRef, o.notes].join(" ").toLowerCase();

  const oblCols = [L("Réf.", "Ref."), L("Obligation", "Obligation"), L("Applicabilité", "Applicability"), L("Statut", "Status"), L("Propriétaire", "Owner")];
  const oblRow = (o) => [o.ref || "", o.title || "", o.applicability || "", o.status || "", o.owner || ""];

  // Les obligations vivent dans le registre de conformité (autre page).
  function oblView(id, fr, en, ref, descFr, descEn, filter, emptyFr, emptyEn) {
    return {
      id: id, kind: "view", title: L(fr, en), ref: L(ref, ref), desc: L(descFr, descEn),
      table: () => ({ columns: oblCols, rows: obligations().filter(filter).map(oblRow), empty: L(emptyFr, emptyEn) }),
      manage: "conformite.html#fiche-registre-conformite",
    };
  }

  function procView(id, fr, en, ref, descFr, descEn, columns, rowsOf, emptyFr, emptyEn) {
    return {
      id: id, kind: "view", title: L(fr, en), ref: L(ref, ref), desc: L(descFr, descEn),
      table: () => ({ columns: columns, rows: rowsOf(), empty: L(emptyFr, emptyEn) }),
      manage: "registre-vie-privee",
    };
  }

  grcFicheRegister("vie-privee", {
    docTitle: L("Protection des renseignements personnels", "Personal information protection"),
    docRef: "Loi 25 (Québec) · ISO/IEC 27001:2022 A.5.34",
    elements: [
      oblView("loi25", "Loi 25", "Bill 25 (Quebec)", "Loi 25 · ISO 27001 A.5.34",
        "Les obligations de la Loi 25 sur la protection des renseignements personnels (responsable désigné, politique, EFVP, incidents, droits…).",
        "Obligations of Quebec’s Bill 25 on personal information protection (designated officer, policy, PIA, incidents, rights…).",
        (o) => /loi\s*25|bill\s*25|law\s*25/.test(text(o)), "Aucune obligation Loi 25 — ajoute-les dans Gestion de la conformité › Registre de conformité.", "No Bill 25 obligation — add them in Compliance management › Compliance register."),
      {
        id: "registre-vie-privee",
        essential: true,
        kind: "register",
        title: L("Registre vie privée", "Privacy register"),
        ref: L("Loi 25 · ISO 27001 A.5.34", "Bill 25 · ISO 27001 A.5.34"),
        desc: L("Le registre des traitements (ROPA), le journal des demandes des personnes et le registre des violations de confidentialité (bascule en haut du registre).",
          "The record of processing (ROPA), the data-subject request log and the confidentiality breach register (switch at the top of the register)."),
        block: "#grcPrivacyRegistry",
        count: () => priv().length,
        reinit: () => initGrcPrivacyRegistry(),
        table: () => ({
          columns: [L("Élément", "Item"), L("Type", "Type"), L("Propriétaire / demandeur", "Owner / requester"), L("Statut", "Status")],
          rows: priv().map((e) => [e.name || e.description || e.requester || "", e.kind || "processing", e.owner || e.requester || "", e.status || ""]),
        }),
      },
      procView("registre-traitements", "Registre des traitements", "Record of processing", "Loi 25 · ISO 27001 A.5.34",
        "Chaque traitement de renseignements personnels : finalité, base légale, personnes concernées, destinataires.",
        "Each personal information processing activity: purpose, legal basis, data subjects, recipients.",
        [L("Traitement", "Processing"), L("Finalité", "Purpose"), L("Base légale", "Legal basis"), L("Personnes concernées", "Data subjects"), L("Propriétaire", "Owner")],
        () => processings().map((p) => [p.name || "", p.purpose || "", p.legalBasis || "", p.dataSubjects || "", p.owner || ""]),
        "Aucun traitement.", "No processing activity."),
      procView("consentement", "Consentement", "Consent", "Loi 25 art. 14",
        "Les consentements recueillis par traitement : type, dates d’obtention, d’expiration, de retrait, et preuve.",
        "Consents collected per processing: type, obtained, expiry and withdrawal dates, and proof.",
        [L("Traitement", "Processing"), L("Type", "Type"), L("Obtenu", "Obtained"), L("Expiration", "Expiry"), L("Retrait", "Withdrawn"), L("Preuve", "Proof")],
        () => {
          const rows = [];
          processings().forEach((p) => (p.consents || []).forEach((c) => rows.push([p.name || "", c.type || "",
            grcFicheFmtDate(c.obtainedAt), grcFicheFmtDate(c.expiresAt), grcFicheFmtDate(c.withdrawnAt), c.proof || ""])));
          return rows;
        }, "Aucun consentement enregistré.", "No consent recorded."),
      procView("efvp", "EFVP / PIA", "PIA", "Loi 25 art. 3.3 · ISO 27001 A.5.34",
        "Les évaluations des facteurs relatifs à la vie privée : requises ou non, statut, approbation. Une EFVP requise non approuvée est signalée.",
        "Privacy impact assessments: required or not, status, approval. A required PIA that is not approved is flagged.",
        [L("Traitement", "Processing"), L("Requise", "Required"), L("Statut", "Status"), L("Approuvée le", "Approved on"), L("Par", "By")],
        () => processings().map((p) => {
          const d = p.dpia || {};
          return [p.name || "", d.required ? grcFicheL(L("Oui", "Yes")) : grcFicheL(L("Non", "No")),
            (d.status || "") + (d.required && d.status !== "approved" ? " ⚠" : ""), grcFicheFmtDate(d.approvedAt), d.approvedBy || ""];
        }), "Aucun traitement.", "No processing activity."),
      procView("renseignements", "Renseignements personnels", "Personal information", "Loi 25 · ISO 27001 A.5.12",
        "Les catégories de renseignements par traitement, leur sensibilité et leur source.",
        "Information categories per processing, their sensitivity and source.",
        [L("Traitement", "Processing"), L("Catégorie", "Category"), L("Sensibilité", "Sensitivity"), L("Source", "Source")],
        () => {
          const rows = [];
          processings().forEach((p) => {
            const list = Array.isArray(p.dataCategoryList) ? p.dataCategoryList : [];
            if (!list.length && p.dataCategories) rows.push([p.name || "", p.dataCategories, "", ""]);
            list.forEach((c) => rows.push([p.name || "", c.name || c.label || "", c.sensitivity || "", c.source || ""]));
          });
          return rows;
        }, "Aucune catégorie de renseignements.", "No information category."),
      procView("conservation", "Conservation", "Retention", "Loi 25 art. 23 · ISO 27001 A.5.33",
        "Durée de conservation et base de chaque traitement, avec la date de suppression prévue.",
        "Retention period and basis for each processing, with the planned deletion date.",
        [L("Traitement", "Processing"), L("Durée (mois)", "Period (months)"), L("Base", "Basis"), L("Suppression prévue", "Planned deletion")],
        () => processings().map((p) => {
          const r = p.retention || {};
          return [p.name || "", r.months == null ? "" : String(r.months), r.basis || r.policy || "", grcFicheFmtDate(r.plannedDeletionAt)];
        }), "Aucun traitement.", "No processing activity."),
      procView("destruction", "Destruction", "Destruction", "Loi 25 art. 23 · ISO 27001 A.8.10",
        "Le mode de destruction ou d’anonymisation prévu à la fin de la conservation.",
        "The destruction or anonymization method planned at the end of retention.",
        [L("Traitement", "Processing"), L("Méthode", "Method"), L("Date prévue", "Planned date")],
        () => processings().map((p) => {
          const r = p.retention || {};
          return [p.name || "", r.destructionMethod || "", grcFicheFmtDate(r.plannedDeletionAt)];
        }), "Aucun traitement.", "No processing activity."),
      procView("violations", "Violations de confidentialité", "Privacy breaches", "Loi 25 art. 3.5 – 3.8",
        "Les incidents de confidentialité : personnes touchées, gravité, avis à la CAI et aux personnes.",
        "Confidentiality incidents: individuals affected, severity, notice to the CAI and to individuals.",
        [L("Violation", "Breach"), L("Gravité", "Severity"), L("Personnes touchées", "Individuals affected"), L("Statut", "Status")],
        () => priv().filter((e) => e.kind === "breach").map((b) => [b.description || b.name || "", b.severity || "",
          b.affectedCount == null ? "" : String(b.affectedCount), b.status || ""]),
        "Aucune violation enregistrée.", "No breach recorded."),
      procView("droits", "Droits des personnes concernées", "Data subject rights", "Loi 25 art. 27 – 30",
        "Les demandes d’accès, de rectification, de retrait… et leur échéance légale de 30 jours.",
        "Access, rectification, withdrawal… requests and their 30-day legal deadline.",
        [L("Demande", "Request"), L("Type", "Type"), L("Demandeur", "Requester"), L("Échéance", "Due"), L("Statut", "Status")],
        () => priv().filter((e) => e.kind === "dsr").map((d) => [d.id || "", d.type || "", d.requester || "", grcFicheFmtDate(d.dueAt), d.status || ""]),
        "Aucune demande enregistrée.", "No request recorded."),
    ],
  });
})();
