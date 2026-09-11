// Was an inline <script> on project/neonflare-technology.html --
// externalized for CSP script-src (PlanDurcissement-Securite.txt P1).
// Must load after config/GothamBlood-tech.js, wallpaper-loader.js and
// config-loader.js.
// Guard each step on its own -- a failure in one (eg. config/GothamBlood-tech.js
// not loading) must not stop the other from running.
var cfg = (typeof neonflareTechnologyConfig === "object" && neonflareTechnologyConfig) || { background: null, cards: [] };
try { applyWallpaper(cfg.background, "neonflare-technology"); } catch (e) { console.error("[GothamBlood Tech] wallpaper:", e); }
try { renderCardGrid(cfg.cards || [], "#neonflare-grid"); } catch (e) { console.error("[GothamBlood Tech] cards:", e); }
