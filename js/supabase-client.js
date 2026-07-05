// Initierar Supabase-klienten. Kräver att config.js och
// supabase-js (CDN) är inladdade före denna fil.
const sb = supabase.createClient(
  window.SUPABASE_CONFIG.url,
  window.SUPABASE_CONFIG.anonKey
);

// --- Delade hjälpfunktioner (dag/tid/formatering) ---

function idagISO() {
  const d = new Date();
  const tz = d.getTimezoneOffset() * 60000;
  return new Date(d - tz).toISOString().slice(0, 10);
}

function inomArbetstid(datum = new Date()) {
  const minuter = datum.getHours() * 60 + datum.getMinutes();
  return minuter >= 7 * 60 && minuter < 22 * 60;
}

function skift(iso) {
  return new Date(iso).getHours() < 12 ? "Dagtid" : "Kvällstid";
}

function formatKlockslag(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleString("sv-SE", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function veckoStart(datum = new Date()) {
  const d = new Date(datum);
  const dag = (d.getDay() + 6) % 7; // måndag = 0
  d.setDate(d.getDate() - dag);
  d.setHours(0, 0, 0, 0);
  return d;
}

function manadStart(datum = new Date()) {
  const d = new Date(datum.getFullYear(), datum.getMonth(), 1);
  return d;
}

function tillISODatum(d) {
  const tz = d.getTimezoneOffset() * 60000;
  return new Date(d - tz).toISOString().slice(0, 10);
}
