/* Rythu Mitra — decision engines (pure functions, no DOM).
 * Works in the browser (window.Engine) and in Node (require) for testing.
 */
(function (root) {
  const KB = (typeof module !== "undefined" && module.exports) ? require("./data.js") : root.KB;
  const HA_PER_ACRE = 2.471;

  /* ---------- 1. Crop Doctor: weighted symptom matching ---------- */
  function diagnose(crop, selected) {
    const picked = new Set(selected);
    if (!picked.size) return [];
    const list = KB.DISEASES[crop] || [];
    return list.map(d => {
      const ids = Object.keys(d.w);
      const total = ids.reduce((s, id) => s + d.w[id], 0);
      const matched = ids.filter(id => picked.has(id));
      const matchedW = matched.reduce((s, id) => s + d.w[id], 0);
      // coverage: how much of this disease's pattern is present
      // focus: how many of the farmer's symptoms this disease explains
      const coverage = matchedW / total;
      const focus = matched.length / picked.size;
      const score = Math.round(100 * coverage * (0.75 + 0.25 * focus));
      return { disease: d, score, matched, level: score >= 70 ? "high" : score >= 40 ? "medium" : "low" };
    })
    .filter(r => r.matched.length && r.score >= 15)
    .sort((a, b) => b.score - a.score);
  }

  /* ---------- 2. Fertilizer calculator ---------- */
  function fertilizer(npkHa, acres) {
    const P = KB.PRODUCTS;
    const perAcre = { n: npkHa.n / HA_PER_ACRE, p: npkHa.p / HA_PER_ACRE, k: npkHa.k / HA_PER_ACRE };
    const need = { n: perAcre.n * acres, p: perAcre.p * acres, k: perAcre.k * acres };
    // DAP supplies all phosphorus and part of the nitrogen; urea makes up the rest of N; MOP supplies K.
    const dapKg = need.p / P.dap.p;
    const nFromDap = dapKg * P.dap.n;
    const ureaKg = Math.max(0, need.n - nFromDap) / P.urea.n;
    const mopKg = need.k / P.mop.k;
    const item = (key, kg) => {
      const bags = kg / P[key].bag;
      const buyBags = Math.ceil(bags - 1e-9);
      return { key, kg, bags, buyBags, cost: buyBags * P[key].price };
    };
    const items = [item("urea", ureaKg), item("dap", dapKg), item("mop", mopKg)].filter(i => i.kg > 0.05);
    return { perAcre, need, items, total: items.reduce((s, i) => s + i.cost, 0) };
  }

  /* ---------- 3. Weather & spray advisory ---------- */
  function hash(s) { let h = 7; for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; }

  function sampleForecast(district, start) {
    const shift = hash(district) % 3;
    const dt = (hash(district + "t") % 3) - 1;
    return KB.WEATHER_BASE.map((_, i) => {
      const b = KB.WEATHER_BASE[(i + shift) % KB.WEATHER_BASE.length];
      const d = new Date(start); d.setDate(d.getDate() + i);
      return { date: d, tmax: b.tmax + dt, tmin: b.tmin + dt, rain: b.rain, prob: b.prob, wind: b.wind, rh: b.rh };
    });
  }

  /* Rules from standard plant-protection practice:
     - no spraying when rain is likely (it washes the chemical off)
     - no spraying above 15 km/h wind (drift)
     - in heat (>= 35 °C) spray only early morning or evening */
  function sprayVerdict(day, next) {
    if (day.rain >= 5 || day.prob >= 60) return { level: "no", reason: "rain" };
    if (day.wind > 15) return { level: "no", reason: "wind" };
    if (next && (next.rain >= 10 || next.prob >= 70)) return { level: "caution", reason: "rainNext" };
    if (day.tmax >= 35) return { level: "caution", reason: "heat" };
    return { level: "ok", reason: "good" };
  }

  function fieldTips(days, crop) {
    const tips = [];
    const heavy = days.slice(0, 3).find(d => d.rain >= 15);
    if (heavy) tips.push({ key: "holdUrea", sev: "warn", day: heavy.date });
    const humidDays = days.filter(d => d.rh >= 85 && d.tmin >= 18);
    if (humidDays.length) tips.push({ key: "fungal_" + crop, sev: "warn", day: humidDays[0].date });
    const totalRain = days.reduce((s, d) => s + d.rain, 0);
    const hot = days.filter(d => d.tmax >= 33).length;
    if (totalRain < 5 && hot >= 3) tips.push({ key: "irrigate", sev: "info" });
    else if (totalRain >= 20) tips.push({ key: "drain", sev: "info" });
    if (crop === "paddy" && days.some(d => d.tmin <= 15)) tips.push({ key: "coldNursery", sev: "warn" });
    const best = days.find(d => sprayVerdict(d, days[days.indexOf(d) + 1]).level === "ok");
    if (best) tips.push({ key: "bestSpray", sev: "ok", day: best.date });
    return tips;
  }

  /* ---------- 4. Mandi: best market after transport ---------- */
  function priceSeries(crop, market) {
    const base = KB.MANDI_BASE[crop].base;
    const h = hash(market + crop);
    const factor = 1 + ((h % 7) - 3) / 100;                       // ±3% market premium/discount
    const drift = ((hash(crop) % 5) - 2) / 1000;                  // small weekly trend
    return Array.from({ length: 7 }, (_, i) =>
      Math.round(base * factor * (1 + Math.sin(i * 0.9 + (h % 10)) * 0.012 + drift * i) / 5) * 5);
  }

  function bestMarket(crop, home, qty, ratePerKm) {
    const msp = KB.MSP[crop];
    const rows = KB.MANDI_BASE[crop].markets.map(m => {
      const series = priceSeries(crop, m);
      const modal = series[series.length - 1];
      const km = KB.DIST_KM[home][m];
      const transport = km * ratePerKm;                            // ₹ per quintal
      const net = modal - transport;
      return { market: m, series, modal, km, transport, net, gross: modal * qty, netTotal: net * qty,
               belowMsp: msp ? modal < msp : false, change: modal - series[series.length - 2] };
    }).sort((a, b) => b.net - a.net);
    const best = rows[0];
    const mspAdvice = msp && best.net < msp
      ? { msp, gapPerQtl: msp - best.net, extra: (msp - best.net) * qty } : null;
    return { rows, best, msp, mspAdvice };
  }

  const Engine = { diagnose, fertilizer, sampleForecast, sprayVerdict, fieldTips, priceSeries, bestMarket, HA_PER_ACRE };
  if (typeof module !== "undefined" && module.exports) module.exports = Engine;
  else root.Engine = Engine;
})(this);
