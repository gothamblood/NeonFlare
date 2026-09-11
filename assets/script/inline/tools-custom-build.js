// Was an inline <script> on tools/custom.html -- externalized for CSP
// script-src (PlanDurcissement-Securite.txt P1). Must load after
// assets/script/tools-config.js (getToolsCategory/getToolsCommands) and
// assets/script/tools-page-boot.js (toggleCmd/reportHeight).
const catId = new URLSearchParams(window.location.search).get("catId");
const category = catId ? getToolsCategory(catId) : null;
document.getElementById("customCategoryTitle").textContent = category ? category.title : "Outils personnalisés";

const tools = catId ? getToolsCommands(catId) : [];
const table = document.getElementById("customTable");

if (!tools.length) {
  document.getElementById("customEmptyState").style.display = "block";
} else {
  table.style.display = "";
  tools.forEach((tool, i) => {
    const rowId = "cmd-custom-" + i;
    const toolRow = document.createElement("tr");
    toolRow.className = "tool-row";
    toolRow.onclick = () => toggleCmd(rowId);
    toolRow.innerHTML = `<td></td><td></td>`;
    toolRow.children[0].textContent = tool.name;
    toolRow.children[1].textContent = tool.description || "";
    table.appendChild(toolRow);

    const cmdRow = document.createElement("tr");
    cmdRow.id = rowId;
    cmdRow.className = "command-row";
    const cell = document.createElement("td");
    cell.colSpan = 2;
    cell.className = "command-cell";
    (tool.commands || []).forEach((cmd) => {
      const div = document.createElement("div");
      div.textContent = "— " + cmd;
      cell.appendChild(div);
    });
    cmdRow.appendChild(cell);
    table.appendChild(cmdRow);
  });
}
