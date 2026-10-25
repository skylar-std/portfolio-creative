/* =========================================
   프로젝트 페이지(works.html)
   1. 요약: 총 프로젝트 수 · 카테고리별 개수 · 많이 쓴 도구(사용 비율 %)
   2. 필터: 연도 · 종류(category). 한 가지뿐인 필터 줄은 숨겨요
   3. 목록: 연도별로 묶어 한 줄씩 (최신이 위)
   - 줄을 누르면 project.html?id=프로젝트id 로 이동
   - 예전 주소 works.html#프로젝트id 로 들어오면 그 상세 페이지로 보내요
   ========================================= */
(function () {
  "use strict";

  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const esc = window.esc;
  const KINDS = { personal: "개인", team: "팀", contest: "공모전", school: "학교 과제", client: "외주" };
  const kindOf = (p) => KINDS[p.type] || (p.client ? "외주" : "개인");
  const yearOf = (p) => p.date.slice(0, 4);
  const F = { year: "all", cat: "all" };
  let ALL = [];

  /* 요약: 총 프로젝트 · 카테고리별 개수 · 많이 쓴 도구(전체 프로젝트 중 사용한 비율 %) */
  const TOOL_LIMIT = 5;
  const CAT_LIMIT = 4;          // 카테고리는 많은 순 4개까지, 나머지는 '기타'
  const CAT_STYLE = "bars";     // "bars" = 막대 · "strip" = 한 줄 비율 띠
  const STRIP_COLORS = ["#FF2E63", "#08D9D6", "#252A34", "#FF8AA8", "#7FE9E7"];
  function summary() {
    const box = $("#summary");
    if (!ALL.length) { box.hidden = true; return; }
    const count = (arr) => arr.reduce((m, k) => (m[k] = (m[k] || 0) + 1, m), {});
    const cats = Object.entries(count(ALL.map((p) => p.categoryLabel).filter(Boolean))).sort((a, b) => b[1] - a[1]);
    const tools = Object.entries(count(ALL.flatMap((p) => [...new Set(p.tools || [])]))).sort((a, b) => b[1] - a[1]).slice(0, TOOL_LIMIT);
    const pct = (n) => Math.round((n / ALL.length) * 100);
    box.innerHTML = `
      <div class="sum sum--total">
        <span class="sum__k">총 프로젝트</span>
        <strong class="sum__v">${ALL.length}<small>개</small></strong>
      </div>
      <div class="sum">
        <span class="sum__k">카테고리 <b>${cats.length}</b> <small>전체 프로젝트 중 비율</small></span>
        ${CAT_STYLE === "strip" ? catStrip(cats) : catBars(cats)}
      </div>
      ${tools.length ? `<div class="sum">
        <span class="sum__k">많이 쓴 도구 <small>전체 프로젝트 중 사용 비율</small></span>
        <ul class="bars">${tools.map(([k, n]) => `
          <li><span class="bars__name">${esc(k)}</span>
            <span class="bars__track" aria-hidden="true"><span class="bars__fill${n === tools[0][1] ? " is-top" : ""}" style="width:${pct(n)}%"></span></span>
            <span class="bars__pct">${pct(n)}%</span></li>`).join("")}</ul>
      </div>` : ""}`;
  }

  // 카테고리: 많은 순 CAT_LIMIT 개 + 나머지는 '기타'
  function topCats(cats) {
    const top = cats.slice(0, CAT_LIMIT);
    const rest = cats.slice(CAT_LIMIT).reduce((n, [, c]) => n + c, 0);
    return rest ? [...top, ["기타", rest, true]] : top;
  }
  const pctOf = (n) => Math.round((n / ALL.length) * 100);
  function catBars(cats) {
    const list = topCats(cats), max = list[0][1];
    return `<ul class="bars bars--cat">${list.map(([k, n, etc]) => `
      <li><span class="bars__name">${esc(k)}</span>
        <span class="bars__track" aria-hidden="true"><span class="bars__fill${n === max && !etc ? " is-top" : ""}${etc ? " is-etc" : ""}" style="width:${pctOf(n)}%"></span></span>
        <span class="bars__pct">${pctOf(n)}%</span></li>`).join("")}</ul>`;
  }
  function catStrip(cats) {
    const list = topCats(cats);
    const color = (i, etc) => (etc ? "#D5D7DC" : STRIP_COLORS[i % STRIP_COLORS.length]);
    return `<div class="strip" role="img" aria-label="${esc(list.map(([k, n]) => `${k} ${pctOf(n)}%`).join(", "))}">
        ${list.map(([k, n, etc], i) => `<span style="flex:${n};background:${color(i, etc)}"></span>`).join("")}
      </div>
      <ul class="strip__legend">${list.map(([k, n, etc], i) => `<li><i style="background:${color(i, etc)}"></i>${esc(k)} <b>${pctOf(n)}%</b></li>`).join("")}</ul>`;
  }

  function chips(box, key, items) {
    if (items.length < 2) { box.hidden = true; return; }
    box.innerHTML = `<span class="arc-filter__k">${box.getAttribute("aria-label")}</span>` +
      [["all", "전체", ALL.length], ...items.map((v) => [v, v, ALL.filter((p) => (key === "year" ? yearOf(p) : p.categoryLabel) === v).length])]
        .map(([v, label, n]) => `<button type="button" class="chip chip--btn" data-v="${esc(v)}" aria-pressed="${F[key] === v}">${esc(label)} <span>${n}</span></button>`).join("");
    box.addEventListener("click", (e) => {
      const b = e.target.closest("button[data-v]"); if (!b) return;
      F[key] = b.dataset.v;
      $$("button", box).forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
      draw();
    });
  }

  const row = (p) => `
    <li><a class="arc-row" href="${esc(window.keepLink(`project.html?id=${encodeURIComponent(p.id)}`))}">
      <span class="arc-row__img"><img src="${esc(p.thumb)}" alt="" loading="lazy" /></span>
      <span class="arc-row__date">${esc(p.date.slice(5, 7))}월</span>
      <span class="arc-row__main">
        <strong class="arc-row__title">${esc(p.title)}${p.featured ? ' <span class="badge">대표</span>' : ""}</strong>
        ${p.summary ? `<span class="arc-row__sum">${esc(p.summary)}</span>` : ""}
      </span>
      <span class="arc-row__cat">${esc(p.categoryLabel)}</span>
      <span class="arc-row__kind">${esc(kindOf(p))}</span>
      <span class="arc-row__role">${esc(p.role)}</span>
    </a></li>`;

  function draw() {
    const shown = ALL.filter((p) => (F.year === "all" || yearOf(p) === F.year) && (F.cat === "all" || p.categoryLabel === F.cat));
    const filtered = F.year !== "all" || F.cat !== "all";
    $("#arcReset").hidden = !filtered;
    $("#arcResult").textContent = filtered ? `${shown.length}개` : "";
    const years = [...new Set(shown.map(yearOf))];
    $("#archive").innerHTML = years.length
      ? years.map((y) => {
        const items = shown.filter((p) => yearOf(p) === y);
        return `<section class="arc-year" aria-labelledby="yh${y}">
            <h2 class="arc-year__head" id="yh${y}">${y}<span>${items.length}개</span></h2>
            <ul class="arc-list">${items.map(row).join("")}</ul>
          </section>`;
      }).join("")
      : `<p class="arc-empty">${filtered ? "조건에 맞는 프로젝트가 없어요. 필터를 바꿔보세요." : "아직 등록된 프로젝트가 없어요. 정리되는 대로 이곳에 쌓일 거예요."}</p>`;
  }

  function init() {
    ALL = [...(window.PROJECTS || [])].filter((p) => p.date).sort((a, b) => b.date.localeCompare(a.date));
    const y = $("#year"); if (y) y.textContent = new Date().getFullYear();

    const hash = decodeURIComponent(location.hash.slice(1));
    if (hash && ALL.some((p) => p.id === hash)) {
      location.replace(window.keepLink(`project.html?id=${encodeURIComponent(hash)}`));
      return;
    }

    $("#wkCount").textContent = ALL.length;
    summary();
    if (!ALL.length) $("#arcTools").hidden = true;
    chips($("#fYear"), "year", [...new Set(ALL.map(yearOf))]);
    const catCount = (c) => ALL.filter((p) => p.categoryLabel === c).length;
    chips($("#fCat"), "cat", [...new Set(ALL.map((p) => p.categoryLabel).filter(Boolean))].sort((a, b) => catCount(b) - catCount(a)));
    // 거를 게 없으면(연도 · 종류가 한 가지씩뿐) 필터 줄 전체를 숨겨요
    if ($("#fYear").hidden && $("#fCat").hidden) $("#arcTools").hidden = true;
    $("#arcReset").addEventListener("click", () => {
      F.year = "all"; F.cat = "all";
      $$(".arc-filter button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.v === "all")));
      draw();
    });
    draw();
  }

  (window.PROJECTS_READY || Promise.resolve()).then(() => {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
  });
})();
