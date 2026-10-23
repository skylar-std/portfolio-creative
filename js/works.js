/* =========================================
   전체 프로젝트 아카이브(works.html)
   - 연도별로 묶어서 한 줄씩 (최신 연도 · 최신 날짜가 위)
   - 거르기: 검색(제목 · 요약 · 역할 · 도구 · 태그) · 분야(category) · 구분(kind)
     분야나 구분이 한 가지뿐이면 그 버튼 줄은 숨겨요
   - 왼쪽(휴대폰은 위쪽) 연도 목록을 누르면 그 해로 이동
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
  const F = { q: "", cat: "all", kind: "all" };

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

  let ALL = [];
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
    const q = F.q.trim().toLowerCase();
    const shown = ALL.filter((p) => {
      if (F.cat !== "all" && p.categoryLabel !== F.cat) return false;
      if (F.kind !== "all" && kindOf(p) !== F.kind) return false;
      if (q && ![p.title, p.summary, p.role, p.categoryLabel, ...(p.tools || []), ...(p.tags || [])].join(" ").toLowerCase().includes(q)) return false;
      return true;
    });
    const filtered = F.q || F.cat !== "all" || F.kind !== "all";
    $("#arcReset").hidden = !filtered;
    $("#arcResult").textContent = filtered ? `${shown.length}개 찾았어요` : "";

    const years = [...new Set(shown.map((p) => p.date.slice(0, 4)))].sort((a, b) => b - a);
    $("#arcYears").innerHTML = years.map((y) => `<a href="#y${y}">${y}<span>${shown.filter((p) => p.date.startsWith(y)).length}</span></a>`).join("");
    $("#arcYears").hidden = years.length < 2;
    $("#archive").innerHTML = years.length
      ? years.map((y) => {
        const items = shown.filter((p) => p.date.startsWith(y));
        return `<section class="arc-year" id="y${y}" aria-labelledby="yh${y}">
            <h2 class="arc-year__head" id="yh${y}">${y}<span>${items.length}개</span></h2>
            <ul class="arc-list">${items.map(row).join("")}</ul>
          </section>`;
      }).join("")
      : `<p class="arc-empty">${filtered ? "조건에 맞는 프로젝트가 없어요. 검색어나 필터를 바꿔보세요." : "아직 등록된 프로젝트가 없어요. 정리되는 대로 이곳에 쌓일 거예요."}</p>`;
  }

  function init() {
    ALL = [...(window.PROJECTS || [])].filter((p) => p.date).sort((a, b) => b.date.localeCompare(a.date));
    const y = $("#year"); if (y) y.textContent = new Date().getFullYear();

    // 예전 링크(#id) → 상세 페이지
    const hash = decodeURIComponent(location.hash.slice(1));
    if (hash && ALL.some((p) => p.id === hash)) {
      location.replace(window.keepLink(`project.html?id=${encodeURIComponent(hash)}`));
      return;
    }

    $("#wkCount").textContent = ALL.length;
    const yrs = ALL.map((p) => p.date.slice(0, 4));
    if (yrs.length) $("#wkLead").textContent = `${yrs[yrs.length - 1]}년부터 지금까지 한 작업을 연도별로 정리했어요. 누르면 자세히 볼 수 있어요.`;

    if (!ALL.length) { $("#arcTools").hidden = true; }
    chips($("#fCat"), "cat", [...new Set(ALL.map((p) => p.categoryLabel).filter(Boolean))]);
    chips($("#fKind"), "kind", [...new Set(ALL.map(kindOf))]);
    $("#q").addEventListener("input", (e) => { F.q = e.target.value; draw(); });
    $("#arcReset").addEventListener("click", () => {
      F.q = ""; F.cat = "all"; F.kind = "all";
      $("#q").value = "";
      $$(".arc-filter button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.v === "all")));
      draw();
    });
    draw();
  }

  (window.PROJECTS_READY || Promise.resolve()).then(() => {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
  });
})();
