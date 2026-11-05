/* Tests for the Rythu Mitra decision engines and knowledge base.
 * Run from the repository root with Node 18 or newer (no packages needed):
 *     node --test tests/rythu-mitra.test.js
 */
const test = require("node:test");
const assert = require("node:assert/strict");

const E = require("../src/engine.js");
const KB = require("../src/data.js");
const I18N = require("../src/i18n.js");

const close = (actual, expected, tol, msg) =>
  assert.ok(Math.abs(actual - expected) <= tol, `${msg}: expected ${expected} ± ${tol}, got ${actual}`);

/* ---------------- Crop Doctor ---------------- */

test("diagnose: no symptoms selected gives no result", () => {
  assert.deepEqual(E.diagnose("paddy", []), []);
});

test("diagnose: unknown crop gives no result", () => {
  assert.deepEqual(E.diagnose("wheat", ["p_spindle"]), []);
});

test("diagnose: classic blast symptoms rank blast first", () => {
  const r = E.diagnose("paddy", ["p_spindle", "p_neck"]);
  assert.equal(r[0].disease.id, "blast");
});

test("diagnose: all of a disease's signs give a 100% high match", () => {
  const blast = KB.DISEASES.paddy.find(d => d.id === "blast");
  const r = E.diagnose("paddy", Object.keys(blast.w));
  assert.equal(r[0].disease.id, "blast");
  assert.equal(r[0].score, 100);
  assert.equal(r[0].level, "high");
});

test("diagnose: results are sorted by score and every score is 15-100", () => {
  for (const crop of Object.keys(KB.DISEASES)) {
    const all = KB.SYMPTOMS[crop].map(s => s.id);
    const r = E.diagnose(crop, all);
    for (let i = 1; i < r.length; i++) assert.ok(r[i - 1].score >= r[i].score, `${crop} not sorted`);
    for (const x of r) assert.ok(x.score >= 15 && x.score <= 100, `${crop}/${x.disease.id} score ${x.score}`);
  }
});

test("diagnose: unrelated extra symptoms lower the score (focus term)", () => {
  const focused = E.diagnose("paddy", ["p_deadheart", "p_whiteear"])[0];
  const noisy = E.diagnose("paddy", ["p_deadheart", "p_whiteear", "p_ooze", "p_sheathspot"])
    .find(x => x.disease.id === "stemborer");
  assert.equal(focused.disease.id, "stemborer");
  assert.ok(noisy.score < focused.score);
});

/* ---------------- Fertilizer ---------------- */

test("fertilizer: paddy 120:60:40 kg/ha on 1 acre matches hand calculation", () => {
  // per acre: N 48.56, P2O5 24.28, K2O 16.19 kg
  // DAP = 24.28 / 0.46 = 52.8 kg; N from DAP = 9.50; urea = (48.56 - 9.50) / 0.46 = 84.9 kg; MOP = 16.19 / 0.60 = 27.0 kg
  const r = E.fertilizer({ n: 120, p: 60, k: 40 }, 1);
  const kg = Object.fromEntries(r.items.map(i => [i.key, i.kg]));
  close(kg.dap, 52.8, 0.05, "DAP kg");
  close(kg.urea, 84.9, 0.05, "urea kg");
  close(kg.mop, 27.0, 0.05, "MOP kg");
});

test("fertilizer: products supply exactly the nutrients needed", () => {
  const need = { n: 150, p: 75, k: 60 };
  const r = E.fertilizer(need, 2.5);
  const P = KB.PRODUCTS;
  const got = { n: 0, p: 0, k: 0 };
  for (const i of r.items) for (const x of ["n", "p", "k"]) got[x] += i.kg * P[i.key][x];
  for (const x of ["n", "p", "k"]) close(got[x], (need[x] / E.HA_PER_ACRE) * 2.5, 1e-6, `${x} supplied`);
});

test("fertilizer: bags are rounded up and cost is bags x price", () => {
  const r = E.fertilizer({ n: 120, p: 60, k: 40 }, 2);
  for (const i of r.items) {
    assert.equal(i.buyBags, Math.ceil(i.kg / KB.PRODUCTS[i.key].bag - 1e-9));
    assert.ok(i.buyBags * KB.PRODUCTS[i.key].bag >= i.kg);
    assert.equal(i.cost, i.buyBags * KB.PRODUCTS[i.key].price);
  }
  assert.equal(r.total, r.items.reduce((s, i) => s + i.cost, 0));
});

test("fertilizer: no potash need means no MOP line", () => {
  const r = E.fertilizer({ n: 100, p: 50, k: 0 }, 1);
  assert.ok(!r.items.some(i => i.key === "mop"));
});

test("fertilizer: DAP nitrogen above the need never gives negative urea", () => {
  const r = E.fertilizer({ n: 5, p: 60, k: 0 }, 1);
  assert.ok(!r.items.some(i => i.key === "urea"));
});

/* ---------------- Weather and spray ---------------- */

const day = (o = {}) => ({ date: new Date("2026-11-05"), tmax: 30, tmin: 20, rain: 0, prob: 10, wind: 8, rh: 60, ...o });

test("sprayVerdict: rain, rain probability and wind block spraying", () => {
  assert.equal(E.sprayVerdict(day({ rain: 5 })).level, "no");
  assert.equal(E.sprayVerdict(day({ prob: 60 })).level, "no");
  assert.equal(E.sprayVerdict(day({ wind: 16 })).reason, "wind");
});

test("sprayVerdict: rain tomorrow or heat today means caution", () => {
  assert.equal(E.sprayVerdict(day(), day({ rain: 10 })).reason, "rainNext");
  assert.equal(E.sprayVerdict(day({ tmax: 35 })).reason, "heat");
});

test("sprayVerdict: calm dry day is OK, thresholds are exclusive", () => {
  assert.equal(E.sprayVerdict(day()).level, "ok");
  assert.equal(E.sprayVerdict(day({ rain: 4.9, prob: 59, wind: 15, tmax: 34 })).level, "ok");
});

test("fieldTips: heavy rain in the next 3 days says hold urea", () => {
  const days = [day({ rain: 20 }), day(), day(), day(), day(), day(), day()];
  assert.ok(E.fieldTips(days, "paddy").some(t => t.key === "holdUrea"));
});

test("fieldTips: dry hot week says irrigate; cold nights warn paddy nurseries", () => {
  const hot = Array.from({ length: 7 }, () => day({ tmax: 36 }));
  assert.ok(E.fieldTips(hot, "maize").some(t => t.key === "irrigate"));
  const cold = Array.from({ length: 7 }, () => day({ tmin: 14 }));
  assert.ok(E.fieldTips(cold, "paddy").some(t => t.key === "coldNursery"));
  assert.ok(!E.fieldTips(cold, "cotton").some(t => t.key === "coldNursery"));
});

test("sampleForecast: 7 consecutive days, same district gives the same forecast", () => {
  const a = E.sampleForecast("warangal", new Date("2026-11-05"));
  const b = E.sampleForecast("warangal", new Date("2026-11-05"));
  assert.equal(a.length, 7);
  assert.deepEqual(a, b);
  assert.equal((a[1].date - a[0].date) / 86400000, 1);
});

/* ---------------- Mandi ---------------- */

test("bestMarket: markets sorted by net price, net = modal - km x rate", () => {
  const r = E.bestMarket("paddy", "warangal", 20, 0.8);
  for (let i = 1; i < r.rows.length; i++) assert.ok(r.rows[i - 1].net >= r.rows[i].net);
  for (const row of r.rows) {
    close(row.net, row.modal - KB.DIST_KM.warangal[row.market] * 0.8, 1e-9, "net");
    close(row.netTotal, row.net * 20, 1e-9, "net total");
  }
  assert.equal(r.best, r.rows[0]);
});

test("bestMarket: higher transport cost favours the nearest market", () => {
  const r = E.bestMarket("paddy", "warangal", 20, 10);
  assert.equal(r.best.market, "warangal");
});

test("bestMarket: MSP advice appears only when the best net price is below MSP", () => {
  const r = E.bestMarket("paddy", "warangal", 20, 0.8);
  if (r.best.net < KB.MSP.paddy) {
    assert.ok(r.mspAdvice);
    close(r.mspAdvice.extra, (KB.MSP.paddy - r.best.net) * 20, 1e-9, "extra");
  } else {
    assert.equal(r.mspAdvice, null);
  }
  assert.equal(E.bestMarket("chilli", "warangal", 10, 0.8).mspAdvice, null); // chilli has no MSP
});

test("priceSeries: 7 prices, rounded to Rs 5, within 10% of the base", () => {
  for (const crop of Object.keys(KB.MANDI_BASE)) {
    for (const m of KB.MANDI_BASE[crop].markets) {
      const s = E.priceSeries(crop, m);
      assert.equal(s.length, 7);
      for (const v of s) {
        assert.equal(v % 5, 0);
        assert.ok(Math.abs(v / KB.MANDI_BASE[crop].base - 1) < 0.1);
      }
    }
  }
});

/* ---------------- Knowledge base integrity ---------------- */

test("data: 5 crops, 6 districts, 20 diseases", () => {
  assert.equal(Object.keys(KB.CROPS).length, 5);
  assert.equal(Object.keys(KB.DISTRICTS).length, 6);
  assert.equal(Object.values(KB.DISEASES).reduce((s, l) => s + l.length, 0), 20);
});

test("data: every disease uses only symptoms listed for its own crop", () => {
  for (const crop of Object.keys(KB.DISEASES)) {
    const ids = new Set(KB.SYMPTOMS[crop].map(s => s.id));
    for (const d of KB.DISEASES[crop]) {
      for (const s of Object.keys(d.w)) assert.ok(ids.has(s), `${crop}/${d.id} uses unknown symptom ${s}`);
      for (const f of ["en", "te", "act", "organic", "prevent"]) assert.ok(d[f], `${crop}/${d.id} missing ${f}`);
    }
  }
});

test("data: every district has a distance to every market", () => {
  for (const home of Object.keys(KB.DISTRICTS)) {
    for (const m of Object.keys(KB.DISTRICTS)) {
      assert.ok(Number.isFinite(KB.DIST_KM[home][m]), `no distance ${home} -> ${m}`);
      assert.equal(KB.DIST_KM[home][m], KB.DIST_KM[m][home], `distance ${home} <-> ${m} not symmetric`);
    }
  }
});

test("data: MSP matches the CCEA decision for Kharif Marketing Season 2026-27", () => {
  // Cabinet Committee on Economic Affairs, 13 May 2026 (Rs per quintal)
  assert.deepEqual(
    { paddy: KB.MSP.paddy, maize: KB.MSP.maize, redgram: KB.MSP.redgram, cotton: KB.MSP.cotton, chilli: KB.MSP.chilli },
    { paddy: 2441, maize: 2410, redgram: 8450, cotton: 8267, chilli: null }
  );
});

test("i18n: English and Telugu have exactly the same keys, none empty", () => {
  const en = Object.keys(I18N.en).sort();
  const te = Object.keys(I18N.te).sort();
  assert.deepEqual(te, en);
  for (const lang of ["en", "te"]) {
    for (const k of en) assert.ok(String(I18N[lang][k]).trim().length > 0, `${lang}.${k} empty`);
  }
});
