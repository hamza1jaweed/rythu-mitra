/* Rythu Mitra — user interface */
(function () {
  const { CROPS, DISTRICTS, SYMPTOMS, DISEASES, NPK_HA, PRODUCTS, MSP, PROCURER, MANDI_BASE } = KB;
  const $ = s => document.querySelector(s);
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const inr = n => Math.round(n).toLocaleString("en-IN");

  /* ---------- state (remembered on this phone) ---------- */
  const saved = (() => { try { return JSON.parse(localStorage.getItem("rythu-mitra") || "{}"); } catch (e) { return {}; } })();
  const S = {
    lang: saved.lang || "en", crop: saved.crop || "paddy", district: saved.district || "warangal",
    acres: saved.acres || 2, tab: "doctor", picked: {}, npk: {}, qty: 20, rate: 0.8, forecast: null
  };
  function save() { try { localStorage.setItem("rythu-mitra", JSON.stringify({ lang: S.lang, crop: S.crop, district: S.district, acres: S.acres })); } catch (e) {} }

  const t = (k, vars) => { let s = (I18N[S.lang][k] ?? I18N.en[k] ?? k); if (vars) for (const v in vars) s = s.replaceAll("{" + v + "}", vars[v]); return s; };
  const nm = o => o[S.lang] || o.en;
  const fmtDay = d => d.toLocaleDateString(S.lang === "te" ? "te-IN" : "en-IN", { weekday: "short", day: "numeric", month: "short" });

  /* ---------- tabs ---------- */
  const ICON = {
    doctor: '<path d="M12 21c-4-3-7-6-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 4-3 7-7 10z"/><path d="M9 12h6M12 9v6"/>',
    weather: '<path d="M7 18h10a4 4 0 0 0 0-8 6 6 0 0 0-11.6 1.5A3.3 3.3 0 0 0 7 18z"/><path d="M9 21l1-2M14 21l1-2"/>',
    fert: '<path d="M6 8h12l-1 13H7z"/><path d="M9 8V5h6v3"/><path d="M10 13h4"/>',
    mandi: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>'
  };
  const TABS = [["doctor", "tabDoctor"], ["weather", "tabWeather"], ["fert", "tabFert"], ["mandi", "tabMandi"]];
  function renderTabs() {
    $("#tabs").innerHTML = TABS.map(([id, k]) =>
      `<button class="tab" role="tab" type="button" data-tab="${id}" aria-selected="${S.tab === id}">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON[id]}</svg>
        <span>${t(k)}</span></button>`).join("");
    TABS.forEach(([id]) => { $("#p-" + id).hidden = S.tab !== id; });
  }

  function renderStatic() {
    document.documentElement.lang = S.lang === "te" ? "te" : "en";
    document.querySelectorAll("[data-t]").forEach(el => { el.textContent = t(el.dataset.t); });
    $("#lang").textContent = t("langBtn");
    $("#crop").innerHTML = Object.keys(CROPS).map(c => `<option value="${c}" ${c === S.crop ? "selected" : ""}>${esc(nm(CROPS[c]))}</option>`).join("");
    $("#district").innerHTML = Object.keys(DISTRICTS).map(d => `<option value="${d}" ${d === S.district ? "selected" : ""}>${esc(nm(DISTRICTS[d]))}</option>`).join("");
    $("#acres").value = S.acres;
  }

  /* ---------- 1. Crop Doctor ---------- */
  function picked() { return S.picked[S.crop] || (S.picked[S.crop] = new Set()); }

  function renderDoctor() {
    const syms = SYMPTOMS[S.crop];
    const p = picked();
    $("#p-doctor").innerHTML = `
      <h2>${t("docTitle")}</h2>
      <p class="hint">${t("docHint")} <b>${esc(nm(CROPS[S.crop]))}</b>.</p>
      <div class="cols">
        <div>
          <div class="symhead"><span class="muted num">${p.size} / ${syms.length}</span><button class="link" id="clearSym" type="button">${t("clear")}</button></div>
          <div class="sym" id="symList">${syms.map(s =>
            `<button type="button" data-sym="${s.id}" aria-pressed="${p.has(s.id)}"><span class="box"></span><span>${esc(nm(s))}</span></button>`).join("")}</div>
        </div>
        <div id="dxOut"></div>
      </div>`;
    renderDiagnosis();
  }

  function renderDiagnosis() {
    const p = picked();
    const out = $("#dxOut");
    if (!p.size) { out.innerHTML = `<div class="empty">${t("docEmpty")}</div>`; return; }
    const res = Engine.diagnose(S.crop, [...p]);
    if (!res.length) { out.innerHTML = `<div class="empty">${t("docNoMatch")}</div>`; return; }
    const symName = id => nm(SYMPTOMS[S.crop].find(s => s.id === id));
    const [top, ...rest] = res;
    const d = top.disease;
    out.innerHTML = `<div class="dx">
      <div class="card dx-main">
        <div class="dx-top">
          <div><div class="dx-sub">${t("likely")} · ${t("type_" + d.type)}</div>
            <div class="dx-name">${esc(nm(d))}</div>
            <div class="dx-sub">${S.lang === "te" ? esc(d.en) : esc(d.te)}</div></div>
          <div class="meter"><b class="lvl-${top.level}">${top.score}%</b><span class="dx-sub">${t("lvl_" + top.level)}</span></div>
        </div>
        <div class="bar"><i style="width:${top.score}%"></i></div>
        <h4>${t("signsMatched")}</h4><p>${top.matched.map(id => esc(symName(id))).join(" · ")}</p>
        <h4>${t("whatToDo")}</h4><ol>${d.act.map(a => `<li>${esc(a)}</li>`).join("")}</ol>
        <h4>${t("organic")}</h4><p>${esc(d.organic)}</p>
        <h4>${t("prevent")}</h4><p>${esc(d.prevent)}</p>
      </div>
      ${rest.length ? `<div class="card"><h4 style="margin-top:0">${t("alsoCheck")}</h4>${rest.map(r =>
        `<div class="alt"><div><div class="dx-name">${esc(nm(r.disease))}</div><div class="dx-sub">${t("type_" + r.disease.type)}</div></div>
         <div class="num lvl-${r.level}">${r.score}%</div></div>`).join('<hr style="border:0;border-top:1px solid var(--line);margin:10px 0">')}</div>` : ""}
      <div class="safety">${t("safety")}</div>
    </div>`;
  }

  /* ---------- 2. Weather & spray ---------- */
  function ensureForecast() {
    if (!S.forecast || S.forecast.district !== S.district) {
      const today = new Date(); today.setHours(0, 0, 0, 0);
      S.forecast = { district: S.district, days: Engine.sampleForecast(S.district, today) };
    }
    return S.forecast.days;
  }

  function renderWeather() {
    const days = ensureForecast();
    const fields = ["rain", "prob", "wind", "rh", "tmax"];
    $("#p-weather").innerHTML = `
      <h2>${t("wxTitle")} · ${esc(nm(DISTRICTS[S.district]))}</h2>
      <p class="hint"><span class="chip sample">${t("sample")}</span> ${t("wxHint")}</p>
      <div class="days" id="dayCards"></div>
      <div class="wxgrid">
        <div><h3>${t("tipsTitle")}</h3><ul class="tips" id="tips"></ul></div>
        <div><h3>${t("wxEdit")}</h3>
          <div class="card scroll" style="padding:6px 10px"><table>
            <thead><tr><th></th>${fields.map(f => `<th>${t(f)}</th>`).join("")}</tr></thead>
            <tbody>${days.map((d, i) => `<tr><td>${esc(fmtDay(d.date))}</td>${fields.map(f =>
              `<td><input type="number" id="wx-${i}-${f}" data-i="${i}" data-f="${f}" value="${d[f]}" min="0" max="${f === "prob" || f === "rh" ? 100 : 60}" aria-label="${t(f)} ${esc(fmtDay(d.date))}"></td>`).join("")}</tr>`).join("")}</tbody>
          </table></div></div>
      </div>`;
    renderWeatherResults();
  }

  function renderWeatherResults() {
    const days = S.forecast.days;
    $("#dayCards").innerHTML = days.map((d, i) => {
      const v = Engine.sprayVerdict(d, days[i + 1]);
      return `<div class="day ${v.level}">
        <div><div class="d">${esc(fmtDay(d.date))}</div><div class="t">${d.tmax}°/${d.tmin}° · ${d.rain} mm · ${d.wind} km/h</div></div>
        <div class="v ${v.level}">${t("v_" + v.level)}</div>
        <div class="why">${t("r_" + v.reason)}</div></div>`;
    }).join("");
    const tips = Engine.fieldTips(days, S.crop);
    $("#tips").innerHTML = tips.map(tp => `<li><span class="dot ${tp.sev}"></span><span>${esc(t("t_" + tp.key, { day: tp.day ? fmtDay(tp.day) : "" }))}</span></li>`).join("");
  }

  /* ---------- 3. Fertilizer ---------- */
  function npk() { return S.npk[S.crop] || { ...NPK_HA[S.crop] }; }

  function renderFert() {
    const v = npk();
    $("#p-fert").innerHTML = `
      <h2>${t("fTitle")} · ${esc(nm(CROPS[S.crop]))}, <span class="num">${S.acres}</span> ${S.lang === "te" ? "ఎకరాలు" : "acres"}</h2>
      <p class="hint">${t("fHint")}</p>
      <div class="cols">
        <div class="card">
          <h3>${t("perHa")}</h3>
          <div class="npk">${["n", "p", "k"].map(x =>
            `<label class="f"><span>${t(x)}</span><input type="number" id="npk-${x}" data-x="${x}" min="0" max="400" value="${v[x]}"></label>`).join("")}</div>
          <button class="link" id="npkReset" type="button">${t("reset")}</button>
          <div class="splits"><b>${t("when")}:</b> ${esc(NPK_HA[S.crop].splits)}</div>
        </div>
        <div class="card" id="fertOut"></div>
      </div>`;
    renderFertResults();
  }

  function renderFertResults() {
    const r = Engine.fertilizer(npk(), S.acres);
    $("#fertOut").innerHTML = `
      <div class="scroll"><table>
        <thead><tr><th>${t("product")}</th><th class="r">${t("kg")}</th><th class="r">${t("bags")}</th><th class="r">${t("cost")}</th></tr></thead>
        <tbody>${r.items.map(i => `<tr><td>${t(i.key)}</td><td class="r num">${i.kg.toFixed(1)}</td>
          <td class="r num"><b>${i.buyBags}</b> <span class="muted">(${i.bags.toFixed(2)} × ${PRODUCTS[i.key].bag} kg)</span></td><td class="r num">₹${inr(i.cost)}</td></tr>`).join("")}
          <tr class="total"><td>${t("total")}</td><td></td><td></td><td class="r num">₹${inr(r.total)}</td></tr></tbody>
      </table></div>
      <p class="muted" style="font-size:.8rem;margin:12px 0 0">${t("fNote")}</p>`;
  }

  /* ---------- 4. Mandi ---------- */
  function spark(series) {
    const w = 84, h = 26, min = Math.min(...series), max = Math.max(...series), span = max - min || 1;
    const pts = series.map((v, i) => [2 + i * (w - 4) / (series.length - 1), h - 3 - (v - min) / span * (h - 6)]);
    const last = pts[pts.length - 1];
    return `<svg class="spark" viewBox="0 0 ${w} ${h}" aria-hidden="true"><polyline points="${pts.map(p => p.map(n => n.toFixed(1)).join(",")).join(" ")}" fill="none" stroke="var(--leaf)" stroke-width="1.6"/><circle cx="${last[0]}" cy="${last[1]}" r="2.6" fill="var(--turmeric)"/></svg>`;
  }

  function renderMandi() {
    $("#p-mandi").innerHTML = `
      <h2>${t("mTitle")} · ${esc(nm(CROPS[S.crop]))}</h2>
      <p class="hint"><span class="chip sample">${t("sample")}</span> ${t("mHint")}</p>
      <div class="cols">
        <div class="card">
          <div class="inputs">
            <label class="f"><span>${t("qty")}</span><input type="number" id="qty" min="1" max="5000" value="${S.qty}"></label>
            <label class="f"><span>${t("rate")}</span><input type="number" id="rate" min="0" max="10" step="0.1" value="${S.rate}"></label>
          </div>
          <div id="bestBox" style="margin-top:16px"></div>
        </div>
        <div class="card scroll" id="mandiTable" style="padding:6px 10px"></div>
      </div>`;
    renderMandiResults();
  }

  function renderMandiResults() {
    const r = Engine.bestMarket(S.crop, S.district, S.qty, S.rate);
    const mk = m => esc(nm(DISTRICTS[m]) === DISTRICTS[m].en ? DISTRICTS[m].market : nm(DISTRICTS[m]));
    $("#bestBox").innerHTML = `
      <div class="best"><span class="chip sample" style="justify-self:start">${t("best")}</span>
        <div class="dx-name">${mk(r.best.market)}</div>
        <div class="big num">₹${inr(r.best.net)}<span class="muted" style="font-size:.9rem"> / qtl</span></div>
        <p style="margin:4px 0 0">${t("bestLine", { qty: S.qty, market: mk(r.best.market), total: inr(r.best.netTotal) })}</p></div>
      <div class="mspbox"><span class="muted">${t("msp")}</span><span class="num"><b>${r.msp ? "₹" + inr(r.msp) : t("noMsp")}</b></span></div>
      ${r.mspAdvice ? `<div class="alert">${t("mspAlert", { gap: inr(r.mspAdvice.gapPerQtl), qty: S.qty, where: nm(PROCURER[S.crop]), extra: inr(r.mspAdvice.extra) })}</div>` : ""}`;
    $("#mandiTable").innerHTML = `<table>
      <thead><tr><th>${t("market")}</th><th class="r">${t("modal")}</th><th>${t("trend")}</th><th class="r">${t("km")}</th><th class="r">${t("net")}</th></tr></thead>
      <tbody>${r.rows.map((row, i) => `<tr class="${i === 0 ? "top" : ""}">
        <td>${mk(row.market)}${r.msp ? `<br><span class="tag ${row.belowMsp ? "below" : "above"}">${t(row.belowMsp ? "belowMsp" : "aboveMsp")}</span>` : ""}</td>
        <td class="r num">₹${inr(row.modal)}<br><span class="${row.change >= 0 ? "up" : "down"}" style="font-size:.75rem">${row.change >= 0 ? "▲" : "▼"} ${inr(Math.abs(row.change))}</span></td>
        <td>${spark(row.series)}</td>
        <td class="r num">${row.km} km</td>
        <td class="r num"><b>₹${inr(row.net)}</b></td></tr>`).join("")}</tbody></table>`;
  }

  /* ---------- wiring ---------- */
  const PANELS = { doctor: renderDoctor, weather: renderWeather, fert: renderFert, mandi: renderMandi };
  function renderAll() { renderStatic(); renderTabs(); Object.values(PANELS).forEach(f => f()); }

  document.addEventListener("click", e => {
    const tab = e.target.closest("[data-tab]");
    if (tab) { S.tab = tab.dataset.tab; renderTabs(); window.scrollTo({ top: 0 }); return; }
    const sym = e.target.closest("[data-sym]");
    if (sym) { const p = picked(), id = sym.dataset.sym; p.has(id) ? p.delete(id) : p.add(id);
      sym.setAttribute("aria-pressed", p.has(id)); $(".symhead .num").textContent = `${p.size} / ${SYMPTOMS[S.crop].length}`; renderDiagnosis(); return; }
    if (e.target.id === "clearSym") { picked().clear(); renderDoctor(); return; }
    if (e.target.id === "npkReset") { delete S.npk[S.crop]; renderFert(); return; }
    if (e.target.id === "lang") { S.lang = S.lang === "en" ? "te" : "en"; save(); renderAll(); }
  });

  document.addEventListener("input", e => {
    const el = e.target;
    if (el.dataset.f !== undefined && el.dataset.i !== undefined) {
      const v = parseFloat(el.value); if (isNaN(v)) return;
      S.forecast.days[+el.dataset.i][el.dataset.f] = v; renderWeatherResults(); return;
    }
    if (el.dataset.x) { const v = parseFloat(el.value); if (isNaN(v) || v < 0) return;
      S.npk[S.crop] = { ...npk(), [el.dataset.x]: v }; renderFertResults(); return; }
    if (el.id === "qty" || el.id === "rate") { const v = parseFloat(el.value); if (isNaN(v) || v < 0) return;
      S[el.id] = v; renderMandiResults(); return; }
    if (el.id === "acres") { const v = parseFloat(el.value); if (isNaN(v) || v <= 0) return; S.acres = v; save(); renderFert(); }
  });

  document.addEventListener("change", e => {
    if (e.target.id === "crop") { S.crop = e.target.value; save(); Object.values(PANELS).forEach(f => f()); }
    if (e.target.id === "district") { S.district = e.target.value; save(); renderWeather(); renderMandi(); }
  });

  /* Demo starts with two signs picked so the Crop Doctor shows a result straight away */
  if (S.crop === "paddy") S.picked.paddy = new Set(["p_spindle", "humid"]);
  renderAll();
})();
