// Initierar Supabase-klienten endast om config.js innehåller giltiga värden.
// Om URL eller anon-key saknas, kör appen i lokal fallback-läge för admin-login.
const sbConfig = (window.SUPABASE_CONFIG && typeof window.SUPABASE_CONFIG === "object") ? window.SUPABASE_CONFIG : {};
const hasSupabaseConfig = Boolean(
  typeof window.supabase !== "undefined" &&
  typeof window.supabase.createClient === "function" &&
  typeof sbConfig.url === "string" &&
  sbConfig.url.trim() &&
  typeof sbConfig.anonKey === "string" &&
  sbConfig.anonKey.trim()
);
const sb = hasSupabaseConfig ? window.supabase.createClient(sbConfig.url.trim(), sbConfig.anonKey.trim()) : null;

// --- Delad modal-hantering ---

const modalRoot = document.getElementById("modal-root");

function stangModal() {
  modalRoot.innerHTML = "";
}

function visaModal(html) {
  modalRoot.innerHTML = `<div class="overlay">${html}</div>`;
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text ?? "";
  return div.innerHTML;
}

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

// --- Caching för bilar (shared across all views) ---

let bilarCache = null;
let bilarCacheTime = 0;
const BILAR_CACHE_TTL = 30000; // 30 sekunder

async function getCachedBilarList() {
  const now = Date.now();
  if (bilarCache && now - bilarCacheTime < BILAR_CACHE_TTL) {
    return bilarCache;
  }

  const { data, error } = await sb.from("bilar").select("*").order("regnr");
  if (!error && data) {
    bilarCache = data;
    bilarCacheTime = now;
  }
  return data || [];
}

function invalidateBilarCache() {
  bilarCache = null;
  bilarCacheTime = 0;
}

// --- Debounce utility ---

function debounce(fn, delay) {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}
