// Personal-vy: skanna QR, registrera förare, lämna in bil, dagens lista, export.

const modalRoot = document.getElementById("modal-root");

function stangModal() {
  modalRoot.innerHTML = "";
}

function visaModal(html) {
  modalRoot.innerHTML = `<div class="overlay">${html}</div>`;
}

function rensaBilParam() {
  const url = new URL(window.location.href);
  url.searchParams.delete("bil");
  history.replaceState(null, "", url.pathname + url.search);
}

// --- Dagens lista ---

async function laddaDagensLista() {
  const tbody = document.getElementById("dagens-lista-body");
  const { data, error } = await sb
    .from("sessioner")
    .select("*")
    .eq("datum", idagISO())
    .order("uttag_tid", { ascending: true });

  if (error) {
    tbody.innerHTML = `<tr><td colspan="6" class="muted">Kunde inte hämta listan.</td></tr>`;
    return;
  }

  if (!data.length) {
    tbody.innerHTML = `<tr><td colspan="6" class="muted">Inga bilar registrerade idag.</td></tr>`;
    return;
  }

  tbody.innerHTML = data
    .map(
      (r) => `
    <tr>
      <td>${r.regnr}</td>
      <td>${r.forare_dag || "–"}</td>
      <td>${r.forare_kvall || "–"}</td>
      <td>${formatKlockslag(r.uttag_tid)}</td>
      <td>${formatKlockslag(r.inlamning_tid)}</td>
      <td><span class="badge ${r.status}">${r.status === "i_korning" ? "I körning" : "Inlämnad"}</span></td>
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

  const { data: session } = await sb
    .from("sessioner")
    .select("*")
    .eq("regnr", regnr)
    .eq("datum", idagISO())
    .eq("status", "i_korning")
    .maybeSingle();

  if (session) {
    if (!ärKvall()) {
      visaModalUpptagen(session.forare_dag);
    } else if (!session.forare_kvall) {
      visaModalTaOver(regnr, session);
    } else {
      visaModalUpptagen(session.forare_kvall);
    }
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

function visaModalUpptagen(namn) {
  visaModal(`
    <div class="modal warn">
      <h3>Bilen används redan</h3>
      <p>Bilen används just nu av <strong>${namn}</strong>.</p>
      <button class="btn-secondary" id="modal-stang">Stäng</button>
    </div>
  `);
  document.getElementById("modal-stang").onclick = () => {
    rensaBilParam();
    stangModal();
  };
}

function visaModalTaOver(regnr, session) {
  visaModal(`
    <div class="modal">
      <h3>Ta över som kvällsförare?</h3>
      <p>Bilen kördes idag av <strong>${session.forare_dag || "okänd"}</strong> och har inte lämnats in.</p>
      <div class="btn-row">
        <button class="btn-secondary" id="modal-nej">Nej</button>
        <button class="btn-primary" id="modal-ja">Ja</button>
      </div>
    </div>
  `);
  document.getElementById("modal-nej").onclick = () => {
    rensaBilParam();
    stangModal();
  };
  document.getElementById("modal-ja").onclick = () => {
    visaFormularRegistrera(regnr, { taOverSessionId: session.id });
  };
}

function visaFormularRegistrera(regnr, { taOverSessionId = null } = {}) {
  const titel = taOverSessionId ? "Vem tar över som kvällsförare?" : "Vad heter du?";
  visaModal(`
    <div class="modal">
      <h3>${titel}</h3>
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

    const nu = new Date();

    if (taOverSessionId) {
      await sb.from("sessioner").update({ forare_kvall: namn }).eq("id", taOverSessionId);
    } else if (!ärKvall(nu)) {
      await sb.from("sessioner").insert({
        regnr,
        datum: idagISO(),
        forare_dag: namn,
        uttag_tid: nu.toISOString(),
        status: "i_korning"
      });
    } else {
      await sb.from("sessioner").insert({
        regnr,
        datum: idagISO(),
        forare_kvall: namn,
        uttag_tid: nu.toISOString(),
        status: "i_korning"
      });
    }

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

// --- Lämna in bil ---

async function visaLamnaInLista() {
  const { data, error } = await sb
    .from("sessioner")
    .select("*")
    .eq("status", "i_korning")
    .order("uttag_tid", { ascending: true });

  if (error || !data.length) {
    visaModal(`
      <div class="modal">
        <h3>Lämna in bil</h3>
        <p class="muted">Inga bilar är just nu utlämnade.</p>
        <button class="btn-secondary" id="modal-stang">Stäng</button>
      </div>
    `);
    document.getElementById("modal-stang").onclick = stangModal;
    return;
  }

  const rader = data
    .map(
      (s) => `
      <div class="list-item">
        <div>
          <strong>${s.regnr}</strong><br>
          <span class="meta">Dag: ${s.forare_dag || "–"} · Kväll: ${s.forare_kvall || "–"}</span>
        </div>
        <button class="btn-primary btn-small" data-id="${s.id}">Lämna in</button>
      </div>`
    )
    .join("");

  visaModal(`
    <div class="modal">
      <h3>Lämna in bil</h3>
      <div>${rader}</div>
      <button class="btn-secondary" id="modal-stang" style="margin-top:14px;">Avbryt</button>
    </div>
  `);

  document.getElementById("modal-stang").onclick = stangModal;

  modalRoot.querySelectorAll("button[data-id]").forEach((btn) => {
    btn.onclick = () => {
      const session = data.find((s) => s.id === btn.dataset.id);
      visaBekraftaInlamning(session);
    };
  });
}

function visaBekraftaInlamning(session) {
  visaModal(`
    <div class="modal">
      <h3>Lämna in ${session.regnr}?</h3>
      <p class="muted">Dag: ${session.forare_dag || "–"} · Kväll: ${session.forare_kvall || "–"}</p>
      <div class="btn-row">
        <button class="btn-secondary" id="modal-avbryt">Avbryt</button>
        <button class="btn-primary" id="modal-bekrafta">Bekräfta</button>
      </div>
    </div>
  `);

  document.getElementById("modal-avbryt").onclick = () => visaLamnaInLista();

  document.getElementById("modal-bekrafta").onclick = async () => {
    const nu = new Date();
    await sb
      .from("sessioner")
      .update({
        inlamning_tid: nu.toISOString(),
        anvand_timmar: beraknaTimmar(session.uttag_tid, nu.toISOString()),
        status: "inlamnad"
      })
      .eq("id", session.id);

    stangModal();
    laddaDagensLista();
  };
}

// --- Export ---

async function exporteraPeriod(startDatum, filnamn) {
  const { data, error } = await sb
    .from("sessioner")
    .select("*")
    .gte("datum", startDatum)
    .lte("datum", idagISO())
    .order("datum", { ascending: true });

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

  document.getElementById("btn-lamna-in").onclick = visaLamnaInLista;

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
