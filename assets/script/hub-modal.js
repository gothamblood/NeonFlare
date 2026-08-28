function openModal(file, title) {
  const frame = document.getElementById("modal-grc-frame");
  frame.style.height = "100px";
  document.getElementById("modal-grc-title").textContent = title;
  frame.src = "./" + file;
  document.getElementById("overlay").style.display = "block";
  document.getElementById("modal-grc").style.display = "flex";
  document.documentElement.style.overflow = "hidden";
  document.body.style.overflow = "hidden";
}

function closeModal() {
  document.getElementById("overlay").style.display = "none";
  document.getElementById("modal-grc").style.display = "none";
  document.getElementById("modal-grc-frame").src = "about:blank";
  document.documentElement.style.overflow = "";
  document.body.style.overflow = "";
}

// Embedded */*.html pages report their real content height so the
// iframe can be sized exactly to it -- no dead space, no inner scrollbar.
window.addEventListener("message", (e) => {
  if (e.data && e.data.type === "hub-frame-height") {
    const frame = document.getElementById("modal-grc-frame");
    if (frame.contentWindow === e.source) {
      frame.style.height = e.data.height + "px";
    }
  }
});