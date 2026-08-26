// Tunn wrapper runt qrcode.js (davidshimjs), laddas via CDN i HTML.

function bilUrl(regnr) {
  // Skapas från admin-sidan, använd relativ path upp en nivå
  const parentDir = new URL('..', window.location.href).href;
  return `${parentDir}index.html?bil=${encodeURIComponent(regnr)}`;
}

function renderQR(containerEl, regnr) {
  containerEl.innerHTML = "";
  new QRCode(containerEl, {
    text: bilUrl(regnr),
    width: 220,
    height: 220,
    correctLevel: QRCode.CorrectLevel.M
  });
}

// Genererar en QR-kod per regnr i en dold container och packar alla
// PNG-bilder i en enda ZIP-fil som laddas ner direkt i webbläsaren.
async function laddaNerAllaQRSomZip(regnrLista, onProgress) {
  const zip = new JSZip();
  const offscreen = document.createElement("div");
  offscreen.style.position = "fixed";
  offscreen.style.left = "-9999px";
  document.body.appendChild(offscreen);

  try {
    for (let i = 0; i < regnrLista.length; i++) {
      const regnr = regnrLista[i];
      renderQR(offscreen, regnr);
      const canvas = offscreen.querySelector("canvas");
      if (canvas) {
        const base64 = canvas.toDataURL("image/png").split(",")[1];
        zip.file(`${regnr}.png`, base64, { base64: true });
      }
      if (onProgress) onProgress(i + 1, regnrLista.length);
    }
  } finally {
    document.body.removeChild(offscreen);
  }

  const blob = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `qr-koder-${idagISO()}.zip`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
