/* =========================================
   프로젝트 페이지(works.html)
   1. 요약: 총 프로젝트 수 · 카테고리별 개수 · 많이 쓴 도구(사용 비율 %)
   2. 보기: [종류별 | 연도별] 탭. 탭을 누르거나 옆으로 밀어 바꿔요
   3. 묶음마다 카드 한 줄, 옆으로 넘겨 봐요
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
  let ALL = [];

  /* 요약: 총 프로젝트 · 카테고리별 개수 · 많이 쓴 도구(전체 프로젝트 중 사용한 비율 %) */
  const TOOL_LIMIT = 5;
  const CAT_LIMIT = 4;          // 카테고리는 많은 순 4개까지, 나머지는 '기타'
  const CAT_STYLE = "donut";    // "pie" = 총 프로젝트 숫자 + 카테고리 원형 · "donut" = 도넛 가운데 총 개수 · "bars" = 막대 · "strip" = 한 줄 띠
  const STRIP_COLORS = ["#FF2E63", "#08D9D6", "#252A34", "#FF8AA8", "#7FE9E7"];
  const DONUT_COLORS = ["#FF2E63", "#08D9D6", "#252A34", "#FF8AA8"];   // 상위 4개 · 나머지는 회색 '기타'
  const OTHER_COLOR = "#D5D7DC";
  function summary() {
    const box = $("#summary");
    if (!ALL.length) { box.hidden = true; return; }
    const count = (arr) => arr.reduce((m, k) => (m[k] = (m[k] || 0) + 1, m), {});
    const cats = Object.entries(count(ALL.map((p) => p.categoryLabel).filter(Boolean))).sort((a, b) => b[1] - a[1]);
    const tools = Object.entries(count(ALL.flatMap((p) => [...new Set(p.tools || [])]))).sort((a, b) => b[1] - a[1]).slice(0, TOOL_LIMIT);
    const pct = (n) => Math.round((n / ALL.length) * 100);
    box.classList.toggle("summary--donut", CAT_STYLE === "donut");
    box.classList.toggle("summary--pie", CAT_STYLE === "pie");
    if (CAT_STYLE === "pie") {
      box.innerHTML = `
      <div class="sum sum--total">
        <span class="sum__k">총 프로젝트</span>
        <strong class="sum__v">${ALL.length}<small>개</small></strong>
      </div>
      <div class="sum sum--donut">${catDonut(cats, cats.length, "Categories", false)}</div>
      ${toolsHTML(tools, pct)}`;
      return;
    }
    if (CAT_STYLE === "donut") {
      box.innerHTML = `
      <div class="sum sum--donut">${catDonut(cats)}</div>
      ${toolsHTML(tools, pct)}`;
      return;
    }
    box.innerHTML = `
      <div class="sum sum--total">
        <span class="sum__k">총 프로젝트</span>
        <strong class="sum__v">${ALL.length}<small>개</small></strong>
      </div>
      <div class="sum">
        <span class="sum__k">카테고리 <b>${cats.length}</b> <small>전체 프로젝트 중 비율</small></span>
        ${CAT_STYLE === "strip" ? catStrip(cats) : catBars(cats)}
      </div>
      ${toolsHTML(tools, pct)}`;
  }

  const toolsHTML = (tools, pct) => (tools.length ? `<div class="sum">
        <span class="sum__k">많이 쓴 도구 <small>전체 프로젝트 중 사용 비율</small></span>
        <ul class="bars">${tools.map(([k, n]) => `
          <li><span class="bars__name">${esc(k)}</span>
            <span class="bars__track" aria-hidden="true"><span class="bars__fill${n === tools[0][1] ? " is-top" : ""}" style="width:${pct(n)}%"></span></span>
            <span class="bars__pct">${pct(n)}%</span></li>`).join("")}</ul>
      </div>` : "");

  // 도넛: 상위 3개 + 기타, 가운데에 총 프로젝트 수
  function catDonut(cats, centerNum = ALL.length, centerLabel = "Projects", showCount = true) {
    const top = cats.slice(0, DONUT_COLORS.length);
    const rest = cats.slice(DONUT_COLORS.length).reduce((n, [, c]) => n + c, 0);
    const list = rest ? [...top.map((c, i) => [...c, DONUT_COLORS[i]]), ["기타", rest, OTHER_COLOR]] : top.map((c, i) => [...c, DONUT_COLORS[i]]);
    const total = ALL.length;
    let acc = 0;
    const GAP = list.length > 1 ? 0.6 : 0;          // 조각 사이 아주 얇은 틈(%)
    const stops = list.map(([, n, col]) => {
      const from = (acc / total) * 100, to = ((acc += n) / total) * 100;
      return `${col} ${from.toFixed(2)}% ${(to - GAP).toFixed(2)}%, transparent ${(to - GAP).toFixed(2)}% ${to.toFixed(2)}%`;
    }).join(", ");
    const few = total < 5;                         // 프로젝트가 적으면 % 대신 개수
    const label = (n) => (few ? `${n}개` : `${pctOf(n)}%`);
    return `
      <div class="donut" role="img" aria-label="카테고리 비율: ${esc(list.map(([k, n]) => `${k} ${label(n)}`).join(", "))}">
        <span class="donut__ring" style="background: conic-gradient(${stops})"></span>
        <span class="donut__center"><strong>${centerNum}</strong><small>${centerLabel}</small></span>
      </div>
      <div class="donut__side">
        <span class="sum__k">카테고리${showCount ? ` <b>${cats.length}</b>` : ""}</span>
        <ul class="donut__legend">${list.map(([k, n, col]) => `<li><i style="background:${col}"></i><span>${esc(k)}</span><b>${label(n)}</b></li>`).join("")}</ul>
      </div>`;
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

  /* ===== 보기: [종류별 | 연도별] 탭 + 옆으로 넘기는 줄 =====
     - 위 탭을 누르거나, 휴대폰에서 화면을 옆으로 밀면 두 보기가 바뀌어요
     - 각 묶음(종류 · 연도)은 카드 한 줄이고, 옆으로 밀거나 화살표로 넘겨요 */
  const card = (p, meta) => `
    <li class="sw-card"><a href="${esc(window.keepLink(`project.html?id=${encodeURIComponent(p.id)}`))}">
      <span class="sw-card__img"><img src="${esc(p.thumb)}" alt="" loading="lazy" />${p.featured ? '<span class="badge badge--img">대표</span>' : ""}</span>
      <span class="sw-card__meta">${esc(meta)}</span>
      <strong class="sw-card__title">${esc(p.title)}</strong>
      ${p.role ? `<span class="sw-card__role">${esc(p.role)}</span>` : ""}
    </a></li>`;

  function groupsHTML(groups, metaOf, prefix) {
    return groups.map(([name, items], i) => `
      <section class="sw-group" aria-labelledby="${prefix}${i}">
        <header class="sw-group__head">
          <h2 id="${prefix}${i}">${esc(name)} <span>${items.length}</span></h2>
          <span class="sw-group__arrows">
            <button type="button" class="slider__btn sw-btn" data-dir="-1" aria-label="${esc(name)} 이전">←</button>
            <button type="button" class="slider__btn sw-btn" data-dir="1" aria-label="${esc(name)} 다음">→</button>
          </span>
        </header>
        <ul class="sw-track">${items.map((p) => card(p, metaOf(p))).join("")}</ul>
      </section>`).join("");
  }

  function buildViews() {
    const box = $("#views");
    if (!ALL.length) {
      box.innerHTML = `<p class="arc-empty">아직 등록된 프로젝트가 없어요. 정리되는 대로 이곳에 쌓일 거예요.</p>`;
      $("#viewTabs").hidden = true;
      return;
    }
    const by = (keyOf) => {
      const m = new Map();
      ALL.forEach((p) => { const k = keyOf(p) || "기타"; if (!m.has(k)) m.set(k, []); m.get(k).push(p); });
      return [...m.entries()];
    };
    const byCat = by((p) => p.categoryLabel).sort((a, b) => b[1].length - a[1].length);   // 많은 순
    const byYear = by(yearOf).sort((a, b) => b[0] - a[0]);                                // 최신 연도 순
    $("#panelCat").innerHTML = groupsHTML(byCat, (p) => `${yearOf(p)} · ${kindOf(p)}`, "gc");
    // 연도별: 위에서 연도를 고르고, 아래에 그 해를 월별로 정리
    const yp = $("#panelYear");
    yp.innerHTML = `
      <div class="ybar" role="tablist" aria-label="연도 선택">
        ${byYear.map(([y, items], i) => `<button type="button" role="tab" class="ybar__btn" data-y="${esc(y)}" aria-selected="${i === 0}">${esc(y)}<span>${items.length}</span></button>`).join("")}
      </div>
      <div class="ymonths" id="yMonths" role="tabpanel" aria-live="polite"></div>`;
    const showYear = (y) => {
      $$(".ybar__btn", yp).forEach((b) => b.setAttribute("aria-selected", String(b.dataset.y === y)));
      const items = (byYear.find((g) => g[0] === y) || [, []])[1];
      const months = new Map();
      [...items].sort((a, b) => b.date.localeCompare(a.date)).forEach((p) => {
        const m = Number(p.date.slice(5, 7)) || 0;
        if (!months.has(m)) months.set(m, []); months.get(m).push(p);
      });
      $("#yMonths").innerHTML = `<h3 class="yhead">${esc(y)}<sup>${items.length}</sup></h3>` + [...months].map(([m, list]) => `
        <section class="ym" aria-label="${esc(y)}년 ${m ? `${m}월` : "월 미정"}">
          <h4 class="ym__month"><b>${m || "–"}</b><strong>${m ? "월" : "월 미정"}</strong><span>${list.length}개</span></h4>
          <ul class="ym__grid">${list.map((p) => card(p, `${p.categoryLabel} · ${kindOf(p)}`)).join("")}</ul>
        </section>`).join("");
      if (typeof fit === "function") fit();
    };
    yp.addEventListener("click", (e) => { const b = e.target.closest(".ybar__btn"); if (b) showYear(b.dataset.y); });
    if (byYear.length) showYear(byYear[0][0]);

    // 넘칠 때만 화살표
    const arrows = () => $$(".sw-group").forEach((g) => {
      const t = $(".sw-track", g); $(".sw-group__arrows", g).hidden = t.scrollWidth <= t.clientWidth + 4;
    });
    box.addEventListener("click", (e) => {
      const b = e.target.closest(".sw-btn"); if (!b) return;
      const t = $(".sw-track", b.closest(".sw-group"));
      t.scrollBy({ left: Number(b.dataset.dir) * t.clientWidth * 0.8, behavior: "smooth" });
    });

    // 탭 ↔ 옆으로 밀기
    const tabs = $$("#viewTabs [role=tab]");
    const panels = [$("#panelCat"), $("#panelYear")];
    let cur = 0;
    var fit = () => { box.style.height = `${panels[cur].offsetHeight}px`; };
    const select = (i, scroll = true) => {
      cur = i;
      tabs.forEach((t, k) => { t.setAttribute("aria-selected", String(k === i)); t.tabIndex = k === i ? 0 : -1; });
      panels.forEach((p, k) => p.setAttribute("aria-hidden", String(k !== i)));
      $("#viewTabs").style.setProperty("--i", i);
      if (scroll) box.scrollTo({ left: i * box.clientWidth, behavior: "smooth" });
      fit();
    };
    tabs.forEach((t, i) => t.addEventListener("click", () => select(i)));
    $("#viewTabs").addEventListener("keydown", (e) => {
      if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
      const i = (cur + (e.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length;
      select(i); tabs[i].focus();
    });
    let st = 0;
    box.addEventListener("scroll", () => {
      clearTimeout(st);
      st = setTimeout(() => { const i = Math.round(box.scrollLeft / box.clientWidth); if (i !== cur) select(i, false); }, 80);
    }, { passive: true });
    window.addEventListener("resize", () => { box.scrollLeft = cur * box.clientWidth; fit(); arrows(); });
    select(0, false);
    arrows();
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
    buildViews();
  }

  (window.PROJECTS_READY || Promise.resolve()).then(() => {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
  });
})();
