/* =========================================
   프로젝트 페이지(works.html)
   1. 요약: 총 프로젝트 수 · 기간 · 구분(개인/팀/공모전…)별 개수 · 많이 쓴 도구
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

  function summary() {
    const box = $("#summary");
    if (!ALL.length) { box.hidden = true; return; }
    const years = ALL.map(yearOf);
    const first = years[years.length - 1], last = years[0];
    const count = (arr) => arr.reduce((m, k) => (m[k] = (m[k] || 0) + 1, m), {});
    const kinds = Object.entries(count(ALL.map(kindOf))).sort((a, b) => b[1] - a[1]);
    const tools = Object.entries(count(ALL.flatMap((p) => p.tools || []))).sort((a, b) => b[1] - a[1]).slice(0, 4);
    const cats = new Set(ALL.map((p) => p.categoryLabel).filter(Boolean)).size;
    box.innerHTML = `
      <div class="sum"><span class="sum__k">총 프로젝트</span><strong class="sum__v">${ALL.length}<small>개</small></strong></div>
      <div class="sum"><span class="sum__k">기간</span><strong class="sum__v">${first === last ? first : `${first}–${last}`}</strong></div>
      <div class="sum"><span class="sum__k">종류</span><strong class="sum__v">${cats}<small>가지</small></strong></div>
      <div class="sum sum--wide"><span class="sum__k">구분</span>
        <ul class="sum__list">${kinds.map(([k, n]) => `<li>${esc(k)} <b>${n}</b></li>`).join("")}</ul></div>
      ${tools.length ? `<div class="sum sum--wide"><span class="sum__k">많이 쓴 도구</span>
        <ul class="sum__list">${tools.map(([k, n]) => `<li>${esc(k)} <b>${n}</b></li>`).join("")}</ul></div>` : ""}`;
  }

  function chips(box, key, items) {
    if (items.length < 2) { box.hidden = true; return; }
    box.innerHTML = `<span class="arc-filter__k">${box.getAttribute("aria-label")}</span>` +
      [["all", "전체"], ...items.map((v) => [v, v])]
        .map(([v, label]) => `<button type="button" class="chip chip--btn" data-v="${esc(v)}" aria-pressed="${F[key] === v}">${esc(label)}</button>`).join("");
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
    chips($("#fCat"), "cat", [...new Set(ALL.map((p) => p.categoryLabel).filter(Boolean))]);
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
