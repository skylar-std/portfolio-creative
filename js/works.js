/* =========================================
   프로젝트 목록(works.html): 분야 필터 + 카드
   - 카드를 누르면 project.html?id=프로젝트id 로 이동해요
   - 예전 주소 works.html#프로젝트id 로 들어오면 그 상세 페이지로 보내요
   ========================================= */
(function () {
  "use strict";

  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const esc = window.esc;

  function init() {
    const list = [...(window.PROJECTS || [])].sort((a, b) => b.date.localeCompare(a.date));
    const y = $("#year"); if (y) y.textContent = new Date().getFullYear();

    // 예전 링크(#id) → 상세 페이지
    const hash = decodeURIComponent(location.hash.slice(1));
    if (hash && list.some((p) => p.id === hash)) {
      location.replace(window.keepLink(`project.html?id=${encodeURIComponent(hash)}`));
      return;
    }

    $("#wkCount").textContent = list.length;
    const box = $("#worksList");
    if (!list.length) { box.innerHTML = window.emptyCard(); $("#filter").hidden = true; return; }

    // 분야 필터 (분야가 2개 이상일 때만)
    const cats = [...new Set(list.map((p) => p.categoryLabel).filter(Boolean))];
    const filter = $("#filter");
    let cur = "all";
    const draw = () => {
      const shown = cur === "all" ? list : list.filter((p) => p.categoryLabel === cur);
      box.innerHTML = shown.map(window.projectCard).join("");
    };
    if (cats.length < 2) filter.hidden = true;
    else {
      filter.innerHTML = [["all", "전체", list.length], ...cats.map((c) => [c, c, list.filter((p) => p.categoryLabel === c).length])]
        .map(([v, label, n]) => `<button type="button" class="chip chip--btn" data-v="${esc(v)}" aria-pressed="${v === cur}">${esc(label)} <span>${n}</span></button>`).join("");
      filter.addEventListener("click", (e) => {
        const b = e.target.closest("button[data-v]"); if (!b) return;
        cur = b.dataset.v;
        $$("button", filter).forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
        draw();
      });
    }
    draw();
  }

  (window.PROJECTS_READY || Promise.resolve()).then(() => {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
  });
})();
