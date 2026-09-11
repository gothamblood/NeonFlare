// Was `<script>applyI18n(getSavedLang());</script>` inline on nearly every
// page -- externalized for CSP script-src (PlanDurcissement-Securite.txt
// P1). Must load after assets/script/i18n.js (defines both functions) and
// before any page content that depends on translated text being in place.
applyI18n(getSavedLang());
