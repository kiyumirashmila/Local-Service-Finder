/**
 * Mongo User.servicesRates is a Map<string, number>. It may also appear as a plain object after load.
 * These helpers keep JSON serialization and writes consistent.
 */
function servicesRatesToPlain(rates) {
  if (rates == null) return {};
  if (rates instanceof Map) return Object.fromEntries(rates);
  if (typeof rates === "object") {
    const out = {};
    for (const [k, v] of Object.entries(rates)) {
      const nk = String(k || "").trim();
      if (!nk) continue;
      const n = Number(v);
      if (Number.isFinite(n)) out[nk] = n;
    }
    return out;
  }
  return {};
}

function plainToServicesRatesMap(obj) {
  const m = new Map();
  if (!obj || typeof obj !== "object") return m;
  for (const [k, v] of Object.entries(obj)) {
    const key = String(k || "").trim();
    if (!key) continue;
    const n = Number(v);
    if (Number.isFinite(n) && n >= 0) m.set(key, n);
  }
  return m;
}

module.exports = { servicesRatesToPlain, plainToServicesRatesMap };
