/* Scheme allowlist for the "About" modal's link URLs. link.url comes from
   the editable About config (Settings) and from an imported backup, so a
   "javascript:" / "data:" URL must not survive onto an <a href> and run
   on click. Relative / fragment / query URLs carry no scheme of their own
   and stay as-is; an absolute URL is only kept for a short benign set. */
function aboutSafeUrl(raw) {
  const s = String(raw == null ? "" : raw).trim();
  if (s === "" || /^(#|\?|\/|\.\.?\/)/.test(s)) return s;
  return /^(https?|mailto|tel):/i.test(s) ? s : "#";
}

/* Strip anything that could break out of the url('...') in an inline
   style (quotes, parens, backslash, newlines). A real image path / data:
   URI has none of these. */
function aboutCssUrl(raw) {
  return String(raw == null ? "" : raw).replace(/['"()\\\r\n]/g, "");
}

function renderAbout(config) {
  document.querySelector(".permit-header").textContent = config.permit.header;
  document.querySelector(".permit-title").textContent = config.permit.title;
  document.querySelector(".permit-text").textContent = config.permit.text;
  document.querySelector(".permit-id").textContent = config.permit.id;

  if (config.permit.qrImage) {
    document.querySelector(".qr").style.backgroundImage = `url('${aboutCssUrl(config.permit.qrImage)}')`;
  }
  if (config.permit.barcodeImage) {
    document.querySelector(".barcode").style.backgroundImage = `url('${aboutCssUrl(config.permit.barcodeImage)}')`;
  }

  const modalLinks = document.querySelector(".modal-links");
  config.links
    .filter(link => link.enabled !== false)
    .forEach(link => {
      const a = document.createElement("a");
      a.href = aboutSafeUrl(link.url);
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.textContent = link.label;
      modalLinks.appendChild(a);
    });
}
