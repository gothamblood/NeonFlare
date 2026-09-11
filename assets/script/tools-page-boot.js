// Boilerplate identical across tools/*.html pages (was 2 inline <script>
// blocks -- boot/theme + tool-row toggle -- before PlanDurcissement-
// Securite.txt P1). Deliberately NOT wrapped in an IIFE: toggleCmd/
// reportHeight/embedded stay top-level, same as when this was a sibling
// inline <script> block (classic scripts sharing one global scope) --
// nothing outside this file currently reads them, but no reason to
// narrow that on the way out.
const embedded = window.self !== window.top;

// Tell the hub's modal our real content height. Called synchronously on
// the one interaction that changes it (toggling a command row) so there's
// no dependency on observer/timer scheduling; ResizeObserver below is
// just a fallback for anything else (initial layout, font swaps, etc).
function reportHeight() {
  if (embedded) {
    window.parent.postMessage({ type: "tool-frame-height", height: document.body.scrollHeight }, "*");
  }
}

function toggleCmd(id) {
  const row = document.getElementById(id);
  row.style.display = (row.style.display === "table-row") ? "none" : "table-row";
  reportHeight();
}

(function () {
  const savedTheme = localStorage.getItem("/settings.html") || "standard";
  document.body.classList.add("theme-" + savedTheme);
  if (embedded) document.body.classList.add("embedded");
})();

if (embedded) {
  new ResizeObserver(reportHeight).observe(document.body);
  window.addEventListener("load", reportHeight);
}

// Was onclick="toggleCmd('cmd-x')" on each .tool-row -- converted to
// data-toggle="cmd-x" + one delegated listener (PlanDurcissement-
// Securite.txt P1.2). Registering the listener here works regardless of
// load order: delegation only needs the rows to exist at CLICK time, not
// at listener-registration time.
document.addEventListener("click", function (e) {
  const row = e.target.closest(".tool-row[data-toggle]");
  if (row) toggleCmd(row.dataset.toggle);
});
