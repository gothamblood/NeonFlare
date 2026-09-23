/* Documentation — Contrôles (grc/controles.html) · ISO 27001 Annexe A,
   NIST CSF 2.0, CIS v8. Sixième étape : les mesures qui traitent les
   risques. Tout repose sur le registre des contrôles existant : la DDA,
   les vues par référentiel et par type, et la matrice risques ↔ contrôles
   en sont des lectures. Moteur : grc-fiches.js ; plan :
   spec/grc-fiches/plan.md. IDs STABLES. */

(function () {
  const L = (fr, en) => ({ fr: fr, en: en });

  const controls = () => grcFicheSrc.controls();
  const statusLabel = (s) => (typeof grcControlStatusI18nKey === "function" ? grcT(grcControlStatusI18nKey(s)) : s);
  const typeLabel = (t) => (typeof grcControlTypeLabel === "function" ? grcControlTypeLabel(t) : t);
  const riskNames = (c) => {
    const all = grcFicheSrc.risks();
    return (c.riskIds || []).map((id) => all.find((r) => r.id === id)).filter(Boolean).map((r) => r.name);
  };

  function byRef(field, prefix, emptyFr, emptyEn) {
    return () => ({
      columns: [L("Référence", "Reference"), L("Contrôle", "Control"), L("Statut", "Status"), L("Propriétaire", "Owner")],
      rows: controls().filter((c) => (c[field] || "").trim()).sort((a, b) => String(a[field]).localeCompare(String(b[field]), undefined, { numeric: true }))
        .map((c) => [prefix + c[field], c.name || "", statusLabel(c.status), c.owner || ""]),
      empty: L(emptyFr, emptyEn),
    });
  }

  function byType(types, emptyFr, emptyEn) {
    return () => ({
      columns: [L("Contrôle", "Control"), L("Type", "Type"), L("Statut", "Status"), L("Preuve", "Evidence")],
      rows: controls().filter((c) => types.indexOf(c.type) !== -1).map((c) => [c.name || "", typeLabel(c.type), statusLabel(c.status), c.evidence || ""]),
      empty: L(emptyFr, emptyEn),
    });
  }

  const view = (id, fr, en, ref, descFr, descEn, table) => ({
    id: id, kind: "view", title: L(fr, en), ref: L(ref, ref), desc: L(descFr, descEn), table: table, manage: "registre",
  });

  grcFicheRegister("controles", {
    docTitle: L("Contrôles de sécurité", "Security controls"),
    docRef: "ISO/IEC 27001:2022 Annex A · NIST CSF 2.0 · CIS Controls v8",
    elements: [
      {
        id: "soa",
        kind: "view",
        essential: true,
        title: L("Déclaration d’applicabilité (DDA)", "Statement of Applicability (SoA)"),
        ref: L("ISO 27001 cl. 6.1.3 d) · Annexe A", "ISO 27001 cl. 6.1.3 d) · Annex A"),
        lead: L("Pour chacun des 93 contrôles de l’Annexe A : applicable ou exclu, pourquoi, et quels contrôles du registre le mettent en œuvre.",
          "For each of the 93 Annex A controls: applicable or excluded, why, and which register controls implement it."),
        desc: L("La DDA est un livrable obligatoire de la certification ISO 27001. Une exclusion doit être justifiée. « Proposer depuis le registre » relie les contrôles du registre qui citent déjà une référence de l’Annexe A (champ Réf. ISO). Les libellés sont reformulés : consulte la norme pour l’intitulé officiel.",
          "The SoA is a mandatory ISO 27001 certification deliverable. An exclusion must be justified. \"Suggest from the register\" links register controls that already cite an Annex A reference (ISO ref. field). Labels are reworded: see the standard for the official titles."),
        render: (host) => grcSoaRender(host, "soa"),
        count: () => grcSoaSummary().decided,
        table: () => grcSoaTable(),
      },
      {
        id: "attributs",
        kind: "view",
        title: L("Attributs des contrôles (27002)", "Control attributes (27002)"),
        ref: L("ISO/IEC 27002:2022 §4.2", "ISO/IEC 27002:2022 §4.2"),
        desc: L("Les 93 contrôles avec leurs attributs (type, propriétés, concepts, capacités, domaines) pour filtrer et repérer les manques — par exemple les contrôles détectifs, ou ceux qui protègent la disponibilité. Attributs indicatifs, à valider contre la norme.",
          "The 93 controls with their attributes (type, properties, concepts, capabilities, domains) to filter and spot gaps — e.g. detective controls, or those protecting availability. Indicative attributes, to be validated against the standard."),
        render: (host) => grcSoaRender(host, "attrs"),
        count: () => (typeof GRC_ANNEX_A !== "undefined" ? GRC_ANNEX_A.length : 0),
        table: () => grcSoaAttrTable(),
      },
      view("iso", "Contrôles ISO 27001", "ISO 27001 controls", "ISO 27001 Annexe A",
        "Contrôles du registre portant une référence ISO 27001 (Annexe A), triés par numéro.",
        "Register controls carrying an ISO 27001 (Annex A) reference, sorted by number.",
        byRef("isoRef", "ISO ", "Aucun contrôle avec une référence ISO.", "No control with an ISO reference.")),
      view("nist", "Contrôles NIST", "NIST controls", "NIST CSF 2.0",
        "Contrôles du registre portant une référence NIST CSF 2.0.",
        "Register controls carrying a NIST CSF 2.0 reference.",
        byRef("nistRef", "", "Aucun contrôle avec une référence NIST.", "No control with a NIST reference.")),
      view("cis", "Contrôles CIS", "CIS controls", "CIS Controls v8",
        "Contrôles du registre portant une référence CIS v8.",
        "Register controls carrying a CIS v8 reference.",
        byRef("cisRef", "CIS ", "Aucun contrôle avec une référence CIS.", "No control with a CIS reference.")),
      view("administratifs", "Contrôles administratifs", "Administrative controls", "ISO 27001 A.5 · A.6",
        "Politiques, gouvernance, formation, sensibilisation, responsabilités (types « organisationnel » et « humain »).",
        "Policies, governance, training, awareness, responsibilities (\"organizational\" and \"human\" types).",
        byType(["organisationnel", "humain"], "Aucun contrôle administratif.", "No administrative control.")),
      view("techniques", "Contrôles techniques", "Technical controls", "ISO 27001 A.8",
        "MFA, pare-feu, segmentation, chiffrement, journalisation (type « technique »).",
        "MFA, firewalls, segmentation, encryption, logging (\"technical\" type).",
        byType(["technique"], "Aucun contrôle technique.", "No technical control.")),
      view("physiques", "Contrôles physiques", "Physical controls", "ISO 27001 A.7",
        "Périmètres, accès physiques, protection des équipements (type « physique »).",
        "Perimeters, physical access, equipment protection (\"physical\" type).",
        byType(["physique"], "Aucun contrôle physique.", "No physical control.")),
      {
        id: "matrice",
        kind: "view",
        title: L("Matrice risques ↔ contrôles", "Risk ↔ control matrix"),
        ref: L("ISO 27001 cl. 6.1.3", "ISO 27001 cl. 6.1.3"),
        desc: L("Quels contrôles traitent quels risques, et les risques qui n’en ont encore aucun (à traiter en priorité).",
          "Which controls treat which risks, and the risks that still have none (to treat first)."),
        table: () => {
          const rows = controls().map((c) => [c.name || "", riskNames(c).join(", ") || "—"]);
          const covered = {};
          controls().forEach((c) => (c.riskIds || []).forEach((id) => { covered[id] = true; }));
          grcFicheSrc.risks().filter((r) => !covered[r.id])
            .forEach((r) => rows.push(["⚠ " + grcFicheL(L("Aucun contrôle", "No control")), r.name || ""]));
          return { columns: [L("Contrôle", "Control"), L("Risques traités", "Risks treated")], rows: rows,
            empty: L("Aucun contrôle ni risque.", "No control or risk.") };
        },
        count: () => controls().length,
        manage: "registre",
      },
      {
        id: "registre",
        essential: true,
        kind: "register",
        title: L("Registre des contrôles", "Control register"),
        ref: L("ISO 27001 Annexe A · NIST · CIS", "ISO 27001 Annex A · NIST · CIS"),
        desc: L("Un contrôle par entrée : références ISO / NIST / CIS, type, statut (dont « non applicable »), propriétaire, preuve, justification DDA, risques traités.",
          "One control per entry: ISO / NIST / CIS references, type, status (including \"not applicable\"), owner, evidence, SoA justification, risks treated."),
        block: "#grcControlRegistry",
        count: () => controls().length,
        reinit: () => initGrcControlRegistry(),
        table: () => ({
          columns: [L("Contrôle", "Control"), L("ISO", "ISO"), L("NIST", "NIST"), L("CIS", "CIS"), L("Type", "Type"), L("Statut", "Status")],
          rows: controls().map((c) => [c.name || "", c.isoRef || "", c.nistRef || "", c.cisRef || "", typeLabel(c.type), statusLabel(c.status)]),
        }),
      },
    ],
  });
})();
