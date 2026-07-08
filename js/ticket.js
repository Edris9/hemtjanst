// Ticket-vy: visar alla rapporterade problem/meddelanden för dev-teamet.

async function laddaMeddelanden() {
  const tbody = document.getElementById("meddelanden-body");
  const { data, error } = await sb
    .from("meddelanden")
    .select("*")
    .order("skapad", { ascending: false });

  if (error) {
    tbody.innerHTML = `<tr><td colspan="4" class="muted">Kunde inte hämta meddelanden.</td></tr>`;
    return;
  }

  if (!data.length) {
    tbody.innerHTML = `<tr><td colspan="4" class="muted">Inga meddelanden ännu.</td></tr>`;
    return;
  }

  tbody.innerHTML = data
    .map(
      (m) => `
    <tr>
      <td>${formatKlockslag(m.skapad)}</td>
      <td>${escapeHtml(m.regnr) || "–"}</td>
      <td>${escapeHtml(m.forare)}</td>
      <td>${escapeHtml(m.meddelande)}</td>
    </tr>`
    )
    .join("");
}

laddaMeddelanden();
