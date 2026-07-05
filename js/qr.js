// Tunn wrapper runt qrcode.js (davidshimjs), laddas via CDN i HTML.

function bilUrl(regnr) {
  return new URL(`index.html?bil=${encodeURIComponent(regnr)}`, window.location.href).href;
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
