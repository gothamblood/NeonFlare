function renderAbout(config) {
  document.querySelector(".permit-header").textContent = config.permit.header;
  document.querySelector(".permit-title").textContent = config.permit.title;
  document.querySelector(".permit-text").textContent = config.permit.text;
  document.querySelector(".permit-id").textContent = config.permit.id;

  if (config.permit.qrImage) {
    document.querySelector(".qr").style.backgroundImage = `url('${config.permit.qrImage}')`;
  }
  if (config.permit.barcodeImage) {
    document.querySelector(".barcode").style.backgroundImage = `url('${config.permit.barcodeImage}')`;
  }

  const modalLinks = document.querySelector(".modal-links");
  config.links
    .filter(link => link.enabled !== false)
    .forEach(link => {
      const a = document.createElement("a");
      a.href = link.url;
      a.target = "_blank";
      a.textContent = link.label;
      modalLinks.appendChild(a);
    });
}
