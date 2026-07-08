// Personal-vy: skanna QR, registrera förare, dagens lista, export.
// Ny modell: varje skanning loggar bara förare + tid. Skannar
// någon en bil som redan används idag innebär det automatiskt
// att den nya föraren tar över (ingen separat "lämna in").

function rensaBilParam() {
  const url = new URL(window.location.href);
  url.searchParams.delete("bil");
  history.replaceState(null, "", url.pathname + url.search);
}

// --- Dagens lista ---

async function laddaDagensLista() {
  const tbody = document.getElementById("dagens-lista-body");
  const { data, error } = await sb
    .from("sessioner_med_sluttid")
    .select("*")
    .eq("datum", idagISO())
    .order("tid", { ascending: true });

  if (error) {
    tbody.innerHTML = `<tr><td colspan="5" class="muted">Kunde inte hämta listan.</td></tr>`;
    return;
  }

  if (!data.length) {
    tbody.innerHTML = `<tr><td colspan="5" class="muted">Inga bilar registrerade idag.</td></tr>`;
    return;
  }

  tbody.innerHTML = data
    .map(
      (r) => `
    <tr>
      <td>${escapeHtml(r.regnr)}</td>
      <td>${escapeHtml(r.forare)}</td>
      <td>${formatKlockslag(r.tid)}</td>
      <td>${formatKlockslag(r.slut)}</td>
      <td>${skift(r.tid)}</td>
    </tr>`
    )
    .join("");
}

// --- QR-flöde ---

async function hanteraBilParam(regnr) {
  const { data: bil } = await sb.from("bilar").select("*").eq("regnr", regnr).maybeSingle();

  if (!bil) {
    visaModalBilFinnsInte();
    return;
  }

  if (!inomArbetstid()) {
    visaModalUtanforArbetstid();
    return;
  }

  const { data: senaste } = await sb
    .from("sessioner")
    .select("*")
    .eq("regnr", regnr)
    .eq("datum", idagISO())
    .order("tid", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (senaste) {
    visaModalTaOver(regnr, senaste);
  } else {
    visaFormularRegistrera(regnr);
  }
}

function visaModalBilFinnsInte() {
  visaModal(`
    <div class="modal warn">
      <h3>Bilen finns inte i systemet</h3>
      <p>Regnr hittades inte bland registrerade bilar. Kontakta admin om det här är fel.</p>
      <button class="btn-secondary" id="modal-tillbaka">Tillbaka</button>
    </div>
  `);
  document.getElementById("modal-tillbaka").onclick = () => {
    rensaBilParam();
    stangModal();
  };
}

function visaModalUtanforArbetstid() {
  visaModal(`
    <div class="modal warn">
      <h3>Utanför arbetstid</h3>
      <p>Registrering går bara mellan <strong>07:00</strong> och <strong>22:00</strong>.</p>
      <button class="btn-secondary" id="modal-stang">Stäng</button>
    </div>
  `);
  document.getElementById("modal-stang").onclick = () => {
    rensaBilParam();
    stangModal();
  };
}

function visaModalTaOver(regnr, senaste) {
  visaModal(`
    <div class="modal">
      <h3>Bilen används just nu</h3>
      <p>Bilen körs av <strong>${senaste.forare}</strong> sedan ${formatKlockslag(senaste.tid)}.</p>
      <p>Vill du ta över bilen?</p>
      <div class="btn-row">
        <button class="btn-secondary" id="modal-nej">Nej</button>
        <button class="btn-primary" id="modal-ja">Ja, ta över</button>
      </div>
    </div>
  `);
  document.getElementById("modal-nej").onclick = () => {
    rensaBilParam();
    stangModal();
  };
  document.getElementById("modal-ja").onclick = () => {
    visaFormularRegistrera(regnr);
  };
}

function visaFormularRegistrera(regnr) {
  visaModal(`
    <div class="modal">
      <h3>Vad heter du?</h3>
      <p class="muted">Bil: <strong>${regnr}</strong></p>
      <label for="namn-input">Namn</label>
      <input type="text" id="namn-input" autocomplete="name" placeholder="För- och efternamn">
      <div class="btn-row">
        <button class="btn-secondary" id="modal-avbryt">Avbryt</button>
        <button class="btn-primary" id="modal-registrera">Registrera</button>
      </div>
    </div>
  `);

  const input = document.getElementById("namn-input");
  input.focus();

  document.getElementById("modal-avbryt").onclick = () => {
    rensaBilParam();
    stangModal();
  };

  document.getElementById("modal-registrera").onclick = async () => {
    const namn = input.value.trim();
    if (!namn) {
      input.focus();
      return;
    }

    await sb.from("sessioner").insert({
      regnr,
      datum: idagISO(),
      forare: namn,
      tid: new Date().toISOString()
    });

    visaModalKorForsiktigt();
  };
}

function visaModalKorForsiktigt() {
  visaModal(`
    <div class="modal ok">
      <h3>Kör försiktigt!</h3>
      <button class="btn-primary" id="modal-stang">Stäng</button>
    </div>
  `);
  document.getElementById("modal-stang").onclick = () => {
    rensaBilParam();
    stangModal();
    laddaDagensLista();
  };
}

// --- Export ---

async function exporteraPeriod(startDatum, filnamn) {
  const { data, error } = await sb
    .from("sessioner_med_sluttid")
    .select("*")
    .gte("datum", startDatum)
    .lte("datum", idagISO())
    .order("datum", { ascending: true })
    .order("tid", { ascending: true });

  if (error || !data.length) {
    alert("Ingen data att exportera för vald period.");
    return;
  }

  exportSessionerTillExcel(data, filnamn);
}

// --- Init ---

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("datum-visning").textContent = new Date().toLocaleDateString("sv-SE", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric"
  });

  laddaDagensLista();

  document.getElementById("btn-rapportera").onclick = () => visaRapporteraModal();

  document.getElementById("export-dag").onclick = () =>
    exporteraPeriod(idagISO(), `billista-dag-${idagISO()}.xlsx`);
  document.getElementById("export-vecka").onclick = () =>
    exporteraPeriod(tillISODatum(veckoStart()), `billista-vecka-${idagISO()}.xlsx`);
  document.getElementById("export-manad").onclick = () =>
    exporteraPeriod(tillISODatum(manadStart()), `billista-manad-${idagISO()}.xlsx`);

  const params = new URLSearchParams(window.location.search);
  const bil = params.get("bil");
  if (bil) {
    hanteraBilParam(bil.trim());
  }
});
