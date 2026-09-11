// Was an inline <script> on project/dashboard.html, project/neonflare-
// technology.html (identical on both) -- externalized for CSP script-src
// (PlanDurcissement-Securite.txt P1). Applies the saved theme and, when
// embedded in the app shell (encapsulation.html), tells the parent so its
// sidebar can follow -- the parent doesn't read storage directly, see
// settings.html.
const theme = localStorage.getItem("/settings.html") || "standard";
document.body.classList.add("theme-" + theme);

if (window.self !== window.top) {
  window.top.postMessage({ type: "theme-change", theme: theme }, "*");
}
