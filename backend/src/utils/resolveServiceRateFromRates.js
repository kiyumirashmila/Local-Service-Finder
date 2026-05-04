function normSvcKey(s) {
  return String(s || "")
    .trim()
    .toLowerCase();
}

function levenshtein(a, b) {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const row = new Array(n + 1);
  for (let j = 0; j <= n; j += 1) row[j] = j;
  for (let i = 1; i <= m; i += 1) {
    let prev = row[0];
    row[0] = i;
    for (let j = 1; j <= n; j += 1) {
      const cur = row[j];
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + cost);
      prev = cur;
    }
  }
  return row[n];
}

/**
 * @param {Map|object|null|undefined} rates
 * @param {string} part - single service name
 */
function resolveOne(rates, part) {
  if (rates == null) return null;
  const label = String(part || "").trim();
  if (!label) return null;

  const get = (key) => {
    if (typeof rates.get === "function") return rates.get(key);
    return rates[key];
  };

  const setKeys = typeof rates.keys === "function" ? Array.from(rates.keys()) : Object.keys(rates);

  let raw = get(label);
  if (raw !== undefined && raw !== null) {
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? n : null;
  }

  const want = normSvcKey(label);
  if (!want) return null;

  let best = null;
  let bestDist = Infinity;
  for (const k of setKeys) {
    const nk = normSvcKey(k);
    if (!nk) continue;
    if (nk === want) {
      const n = Number(get(k));
      if (Number.isFinite(n) && n > 0) return n;
    }
    if (want.length < 4 || nk.length < 4) continue;
    const maxDist = want.length >= 12 ? 2 : 1;
    const d = levenshtein(want, nk);
    if (d <= maxDist && d < bestDist) {
      const n = Number(get(k));
      if (Number.isFinite(n) && n > 0) {
        bestDist = d;
        best = n;
      }
    }
  }
  return best;
}

function resolveServiceRateFromRates(rates, serviceName) {
  if (!rates || typeof rates !== "object") return null;
  const parts = Array.isArray(serviceName)
    ? serviceName
    : String(serviceName || "")
        .split(",")
        .map((s) => String(s).trim())
        .filter(Boolean);
  if (!parts.length) return null;
  let total = 0;
  let foundAny = false;
  for (const part of parts) {
    const n = resolveOne(rates, part);
    if (n != null) {
      total += n;
      foundAny = true;
    }
  }
  return foundAny ? total : null;
}

module.exports = { resolveServiceRateFromRates, normSvcKey };
