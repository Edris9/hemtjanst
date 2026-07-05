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

function ärKvall(datum = new Date()) {
  return datum.getHours() >= 12;
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

function beraknaTimmar(uttagIso, inlamningIso) {
  const ms = new Date(inlamningIso) - new Date(uttagIso);
  return Math.round((ms / 3_600_000) * 100) / 100;
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
