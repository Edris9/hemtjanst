// Delad funktion: modal för att rapportera ett problem / skriva
// ett meddelande. Sparas i "meddelanden" och visas för dev-teamet
// på /ticket. Används både från billistan och admin-sidan.

async function visaRapporteraModal(forvaldRegnr) {
  const { data: bilar } = await sb.from("bilar").select("regnr").order("regnr");

  const bilOptions =
    `<option value="">Inget specifikt</option>` +
    (bilar || [])
      .map((b) => `<option value="${b.regnr}" ${b.regnr === forvaldRegnr ? "selected" : ""}>${b.regnr}</option>`)
      .join("");

  visaModal(`
    <div class="modal">
      <h3>Rapportera ett problem</h3>
      <label for="t-forare">Ditt namn</label>
      <input type="text" id="t-forare" autocomplete="name" placeholder="För- och efternamn">

      <label for="t-regnr">Bil (valfritt)</label>
      <select id="t-regnr">${bilOptions}</select>

      <label for="t-meddelande">Meddelande</label>
      <textarea id="t-meddelande" rows="4" placeholder="Beskriv problemet eller skriv ett meddelande..."></textarea>

      <div class="btn-row">
        <button class="btn-secondary" id="modal-avbryt">Avbryt</button>
        <button class="btn-primary" id="modal-skicka">Skicka</button>
      </div>
    </div>
  `);

  document.getElementById("modal-avbryt").onclick = stangModal;
  document.getElementById("modal-skicka").onclick = async () => {
    const forare = document.getElementById("t-forare").value.trim();
    const regnr = document.getElementById("t-regnr").value || null;
    const meddelande = document.getElementById("t-meddelande").value.trim();

    if (!forare || !meddelande) {
      alert("Fyll i namn och meddelande.");
      return;
    }

    const { error } = await sb.from("meddelanden").insert({ forare, regnr, meddelande });
    if (error) {
      alert("Kunde inte skicka meddelandet: " + error.message);
      return;
    }

    visaModal(`
      <div class="modal ok">
        <h3>Tack!</h3>
        <p>Ditt meddelande har skickats.</p>
        <button class="btn-primary" id="modal-stang">Stäng</button>
      </div>
    `);
    document.getElementById("modal-stang").onclick = stangModal;
  };
}
