// Admin-vy: bilar (CRUD), sessioner (CRUD), export, rensning.

const modalRoot = document.getElementById("modal-root");

function stangModal() {
  modalRoot.innerHTML = "";
}

function visaModal(html) {
  modalRoot.innerHTML = `<div class="overlay">${html}</div>`;
}

function visaBekraftaModal(text, knappText, onOk) {
  visaModal(`
    <div class="modal warn">
      <h3>Bekräfta</h3>
      <p>${text}</p>
      <div class="btn-row">
        <button class="btn-secondary" id="modal-avbryt">Avbryt</button>
        <button class="btn-danger" id="modal-ok">${knappText}</button>
      </div>
    </div>
  `);
  document.getElementById("modal-avbryt").onclick = stangModal;
  document.getElementById("modal-ok").onclick = () => onOk();
}

function toDatetimeLocal(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const tz = d.getTimezoneOffset() * 60000;
  return new Date(d - tz).toISOString().slice(0, 16);
}

function fraDatetimeLocal(val) {
  if (!val) return null;
  return new Date(val).toISOString();
}

function ärFkFel(error) {
  return error && (error.code === "23503" || /foreign key/i.test(error.message || ""));
}

// =====================================================
// Bilar
// =====================================================

async function laddaBilar() {
  const wrap = document.getElementById("bilar-lista");
  const { data, error } = await sb.from("bilar").select("*").order("regnr");

  if (error) {
    wrap.innerHTML = `<p class="muted">Kunde inte hämta bilar.</p>`;
    return;
  }
  if (!data.length) {
    wrap.innerHTML = `<p class="muted">Inga bilar tillagda ännu.</p>`;
    return;
  }

  wrap.innerHTML = data
    .map(
      (b) => `
    <div class="list-item" data-regnr="${b.regnr}">
      <div>
        <strong>${b.regnr}</strong><br>
        <span class="meta">Tillagd ${new Date(b.skapad).toLocaleDateString("sv-SE")}</span>
      </div>
      <div class="btn-row" style="width:auto;">
        <button class="btn-secondary btn-small" data-action="qr">QR</button>
        <button class="btn-secondary btn-small" data-action="redigera">Redigera</button>
        <button class="btn-danger btn-small" data-action="ta-bort">Ta bort</button>
      </div>
    </div>`
    )
    .join("");

  wrap.querySelectorAll(".list-item").forEach((row) => {
    const regnr = row.dataset.regnr;
    row.querySelector('[data-action="qr"]').onclick = () => visaQRModal(regnr);
    row.querySelector('[data-action="redigera"]').onclick = () => visaRedigeraBilModal(regnr);
    row.querySelector('[data-action="ta-bort"]').onclick = () =>
      visaBekraftaModal(`Ta bort bilen <strong>${regnr}</strong>?`, "Ta bort", async () => {
        const { error } = await sb.from("bilar").delete().eq("regnr", regnr);
        if (ärFkFel(error)) {
          alert("Kan inte ta bort bilen — den har sessioner kopplade till sig. Ta bort eller flytta dem i sektionen Sessioner först.");
        }
        stangModal();
        laddaBilar();
      });
  });
}

function visaQRModal(regnr) {
  visaModal(`
    <div class="modal ok">
      <h3>QR-kod</h3>
      <div class="qr-box">
        <div id="qr-onscreen"></div>
        <div class="regnr-label">${regnr}</div>
      </div>
      <div class="btn-row" style="margin-top:14px;">
        <button class="btn-secondary" id="modal-stang">Stäng</button>
        <button class="btn-primary" id="btn-skriv-ut">Skriv ut QR</button>
      </div>
    </div>
  `);
  renderQR(document.getElementById("qr-onscreen"), regnr);
  document.getElementById("modal-stang").onclick = stangModal;
  document.getElementById("btn-skriv-ut").onclick = () => {
    const printArea = document.getElementById("print-area");
    printArea.classList.remove("hidden");
    printArea.innerHTML = `<div class="qr-box"><div id="qr-print"></div><div class="regnr-label">${regnr}</div></div>`;
    renderQR(document.getElementById("qr-print"), regnr);
    window.print();
  };
}

function visaRedigeraBilModal(gammaltRegnr) {
  visaModal(`
    <div class="modal">
      <h3>Redigera regnr</h3>
      <label for="regnr-input">Regnr</label>
      <input type="text" id="regnr-input" value="${gammaltRegnr}">
      <div class="btn-row">
        <button class="btn-secondary" id="modal-avbryt">Avbryt</button>
        <button class="btn-primary" id="modal-spara">Spara</button>
      </div>
    </div>
  `);
  document.getElementById("modal-avbryt").onclick = stangModal;
  document.getElementById("modal-spara").onclick = async () => {
    const nyttRegnr = document.getElementById("regnr-input").value.trim();
    if (!nyttRegnr || nyttRegnr === gammaltRegnr) {
      stangModal();
      return;
    }
    const { error } = await sb.from("bilar").update({ regnr: nyttRegnr }).eq("regnr", gammaltRegnr);
    if (ärFkFel(error)) {
      alert("Kan inte byta regnr — bilen har sessioner kopplade till sig. Ta bort eller flytta dem i sektionen Sessioner först.");
    } else if (error) {
      alert("Kunde inte spara: " + error.message);
    }
    stangModal();
    laddaBilar();
  };
}

document.getElementById("btn-lagg-till-bil").addEventListener("click", async () => {
  const input = document.getElementById("ny-regnr");
  const regnr = input.value.trim();
  if (!regnr) return;

  const { error } = await sb.from("bilar").insert({ regnr });
  if (error) {
    alert("Kunde inte lägga till bilen (finns den redan?): " + error.message);
    return;
  }
  input.value = "";
  await laddaBilar();
  visaQRModal(regnr);
});

// =====================================================
// Sessioner
// =====================================================

let sessionerFilter = "dag";

function periodFilter(query, filter) {
  if (filter === "dag") return query.eq("datum", idagISO());
  if (filter === "vecka") return query.gte("datum", tillISODatum(veckoStart())).lte("datum", idagISO());
  if (filter === "manad") return query.gte("datum", tillISODatum(manadStart())).lte("datum", idagISO());
  return query;
}

async function laddaSessioner() {
  const tbody = document.getElementById("sessioner-body");
  let query = sb.from("sessioner").select("*").order("datum", { ascending: false }).order("tid", { ascending: false });
  query = periodFilter(query, sessionerFilter);

  const { data, error } = await query;
  if (error) {
    tbody.innerHTML = `<tr><td colspan="6" class="muted">Kunde inte hämta sessioner.</td></tr>`;
    return;
  }
  if (!data.length) {
    tbody.innerHTML = `<tr><td colspan="6" class="muted">Inga sessioner i vald period.</td></tr>`;
    return;
  }

  tbody.innerHTML = data
    .map(
      (s) => `
    <tr data-id="${s.id}">
      <td>${s.datum}</td>
      <td>${s.regnr}</td>
      <td>${s.forare}</td>
      <td>${formatKlockslag(s.tid)}</td>
      <td>${skift(s.tid)}</td>
      <td>
        <div class="btn-row" style="width:auto;">
          <button class="btn-secondary btn-small" data-action="redigera">Redigera</button>
          <button class="btn-danger btn-small" data-action="ta-bort">Ta bort</button>
        </div>
      </td>
    </tr>`
    )
    .join("");

  tbody.querySelectorAll("tr").forEach((row) => {
    const id = row.dataset.id;
    const session = data.find((s) => s.id === id);
    row.querySelector('[data-action="redigera"]').onclick = () => visaSessionModal(session);
    row.querySelector('[data-action="ta-bort"]').onclick = () =>
      visaBekraftaModal(`Ta bort sessionen för <strong>${session.regnr}</strong> (${session.datum})?`, "Ta bort", async () => {
        await sb.from("sessioner").delete().eq("id", id);
        stangModal();
        laddaSessioner();
      });
  });
}

async function visaSessionModal(session) {
  const { data: bilar } = await sb.from("bilar").select("regnr").order("regnr");
  const ar = !!session;

  const bilOptions = (bilar || [])
    .map((b) => `<option value="${b.regnr}" ${session && session.regnr === b.regnr ? "selected" : ""}>${b.regnr}</option>`)
    .join("");

  visaModal(`
    <div class="modal">
      <h3>${ar ? "Redigera session" : "Ny session"}</h3>
      <label for="s-regnr">Bil</label>
      <select id="s-regnr">${bilOptions}</select>

      <label for="s-datum">Datum</label>
      <input type="date" id="s-datum" value="${session ? session.datum : idagISO()}">

      <label for="s-forare">Förare</label>
      <input type="text" id="s-forare" value="${session ? session.forare : ""}">

      <label for="s-tid">Tid</label>
      <input type="datetime-local" id="s-tid" value="${session ? toDatetimeLocal(session.tid) : toDatetimeLocal(new Date().toISOString())}">

      <div class="btn-row">
        <button class="btn-secondary" id="modal-avbryt">Avbryt</button>
        <button class="btn-primary" id="modal-spara">Spara</button>
      </div>
    </div>
  `);

  document.getElementById("modal-avbryt").onclick = stangModal;
  document.getElementById("modal-spara").onclick = async () => {
    const rad = {
      regnr: document.getElementById("s-regnr").value,
      datum: document.getElementById("s-datum").value,
      forare: document.getElementById("s-forare").value.trim(),
      tid: fraDatetimeLocal(document.getElementById("s-tid").value)
    };

    if (ar) {
      await sb.from("sessioner").update(rad).eq("id", session.id);
    } else {
      await sb.from("sessioner").insert(rad);
    }

    stangModal();
    laddaSessioner();
  };
}

document.getElementById("sessioner-filter").addEventListener("click", (e) => {
  const chip = e.target.closest(".chip");
  if (!chip) return;
  document.querySelectorAll("#sessioner-filter .chip").forEach((c) => c.classList.remove("active"));
  chip.classList.add("active");
  sessionerFilter = chip.dataset.filter;
  laddaSessioner();
});

document.getElementById("btn-ny-session").addEventListener("click", () => visaSessionModal(null));

// =====================================================
// Export & rensning
// =====================================================

async function exporteraIntervall(fran, till, filnamn) {
  const { data, error } = await sb.from("sessioner").select("*").gte("datum", fran).lte("datum", till).order("datum");
  if (error || !data.length) {
    alert("Ingen data att exportera för vald period.");
    return;
  }
  exportSessionerTillExcel(data, filnamn);
}

document.getElementById("export-dag").onclick = () =>
  exporteraIntervall(idagISO(), idagISO(), `billista-dag-${idagISO()}.xlsx`);
document.getElementById("export-vecka").onclick = () =>
  exporteraIntervall(tillISODatum(veckoStart()), idagISO(), `billista-vecka-${idagISO()}.xlsx`);
document.getElementById("export-manad").onclick = () =>
  exporteraIntervall(tillISODatum(manadStart()), idagISO(), `billista-manad-${idagISO()}.xlsx`);

document.getElementById("export-period").onclick = () => {
  const fran = document.getElementById("export-fran").value;
  const till = document.getElementById("export-till").value;
  if (!fran || !till) {
    alert("Ange både från- och till-datum.");
    return;
  }
  exporteraIntervall(fran, till, `billista-${fran}-till-${till}.xlsx`);
};

document.getElementById("btn-rensa").addEventListener("click", () => {
  visaBekraftaModal(
    "Detta tar bort <strong>all körhistorik permanent</strong>. Bilarna behålls. Vill du fortsätta?",
    "Fortsätt",
    async () => {
      visaBekraftaModal(
        "Är du helt säker? Detta går <strong>inte</strong> att ångra.",
        "Ja, rensa allt",
        async () => {
          await sb.from("sessioner").delete().not("id", "is", null);
          stangModal();
          laddaSessioner();
        }
      );
    }
  );
});

// =====================================================
// Init
// =====================================================

laddaBilar();
laddaSessioner();
