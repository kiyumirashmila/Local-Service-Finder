/** Normalize service / rate map keys for comparison. */
export function normSvcKey(s) {
  return String(s || '')
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
 * Find hourly rate for a service label against supplier.servicesRates (plain object).
 * Tries exact key, case-insensitive key, then Levenshtein distance ≤ 1 for names length ≥ 4
 * (covers common typos like "scheduled" vs "sheduled").
 */
export function resolveRateFromServicesRates(servicesRates, svcName) {
  if (!servicesRates || typeof servicesRates !== 'object' || svcName == null) return undefined;
  const label = String(svcName).trim();
  if (!label) return undefined;

  if (Object.prototype.hasOwnProperty.call(servicesRates, label)) {
    const n = Number(servicesRates[label]);
    if (Number.isFinite(n) && n >= 0) return n;
  }

  const want = normSvcKey(label);
  if (!want) return undefined;

  let bestVal;
  let bestDist = Infinity;
  for (const k of Object.keys(servicesRates)) {
    const nk = normSvcKey(k);
    if (!nk) continue;
    if (nk === want) {
      const n = Number(servicesRates[k]);
      if (Number.isFinite(n) && n >= 0) return n;
    }
    if (want.length < 4 || nk.length < 4) continue;
    const maxDist = want.length >= 12 ? 2 : 1;
    const d = levenshtein(want, nk);
    if (d <= maxDist && d < bestDist) {
      const n = Number(servicesRates[k]);
      if (Number.isFinite(n) && n >= 0) {
        bestDist = d;
        bestVal = n;
      }
    }
  }
  return bestVal;
}

/**
 * When saving, store rates under canonical names from `services` array when a draft key matches.
 */
export function alignRateKeysToServices(services, ratesDraft) {
  const out = {};
  const consumed = new Set();
  const list = Array.isArray(services) ? services.map((s) => String(s || '').trim()).filter(Boolean) : [];
  const entries = Object.entries(ratesDraft || {});

  for (const svc of list) {
    const want = normSvcKey(svc);
    let pick = entries.find(([k]) => String(k).trim() === svc);
    if (!pick) pick = entries.find(([k]) => normSvcKey(k) === want);
    if (!pick && want.length >= 4) {
      pick = entries.find(([k]) => {
        const nk = normSvcKey(k);
        return nk && nk.length >= 4 && levenshtein(want, nk) <= 1;
      });
    }
    if (pick) {
      const [k, v] = pick;
      consumed.add(k);
      const n = Number(v);
      if (Number.isFinite(n) && n > 0) out[svc] = n;
    }
  }

  for (const [k, v] of entries) {
    if (consumed.has(k)) continue;
    const key = String(k || '').trim();
    if (!key) continue;
    const n = Number(v);
    if (Number.isFinite(n) && n > 0) out[key] = n;
  }
  return out;
}
