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
  const kindOf = (p) => window.kindLabel(p);
  const yearOf = (p) => p.date.slice(0, 4);
  let ALL = [];

  /* 요약: 총 프로젝트 · 카테고리별 개수 · 많이 쓴 도구(전체 프로젝트 중 사용한 비율 %) */
  const TOOL_LIMIT = 5;
  const CAT_LIMIT = 4;          // 카테고리는 많은 순 4개까지, 나머지는 '기타'
  const CAT_STYLE = "donut";
  // 종류별 · 연도별 위 고르기 모양: "text"(글자 탭, 연도와 같은 모양) · "chips"(둘 다 칩)
  const CAT_FILTER = window.__CAT_FILTER || "text";    // "pie" = 총 프로젝트 숫자 + 카테고리 원형 · "donut" = 도넛 가운데 총 개수 · "bars" = 막대 · "strip" = 한 줄 띠
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

  /* 요약 등장 애니메이션: 화면에 보이면 도넛이 한 바퀴 채워지고, 막대가 차오르고, 숫자가 0부터 올라가요 */
  function animateSummary() {
    const box = $("#summary");
    if (box.hidden || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const nums = $$(".donut__center strong, .donut__legend b, .bars__pct", box).map((el) => {
      const m = /^(\d+)(.*)$/.exec(el.textContent.trim());
      return m ? { el, to: Number(m[1]), suf: m[2] } : null;
    }).filter(Boolean);
    $$(".bars__fill", box).forEach((f, i) => f.style.setProperty("--d", `${i * 90}ms`));
    $$(".donut__legend li", box).forEach((li, i) => li.style.setProperty("--d", `${300 + i * 70}ms`));
    box.classList.add("is-pre");
    nums.forEach((n) => { n.el.textContent = `0${n.suf}`; });
    const run = () => {
      void box.offsetWidth;
      box.classList.remove("is-pre"); box.classList.add("is-in");
      const t0 = performance.now(), DUR = 1100;
      const tick = (t) => {
        const k = Math.min(1, (t - t0) / DUR), e = 1 - Math.pow(1 - k, 3);
        nums.forEach((n) => { n.el.textContent = `${Math.round(n.to * e)}${n.suf}`; });
        if (k < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    };
    if (!("IntersectionObserver" in window)) { run(); return; }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { io.disconnect(); requestAnimationFrame(run); } }, { threshold: 0.3 });
    io.observe(box);
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
        <ul class="donut__legend">${list.map(([k, n, col]) => `<li${col === OTHER_COLOR ? "" : ` data-c="${esc(k)}" role="button" tabindex="0" title="${esc(k)} 프로젝트 보기"`}><i style="background:${col}"></i><span>${esc(k)}</span><b>${label(n)}</b></li>`).join("")}</ul>
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
  // 도구 이름 → img/icons 파일 이름 (없으면 글자만)
  const TOOL_ICON = { photoshop: "photoshop", illustrator: "illustrator", indesign: "indesign", figma: "figma", "after effects": "after-effects", blender: "blender", notion: "notion", "html / css": "html-css", html: "html-css" };
  const toolIcon = (t) => TOOL_ICON[String(t).toLowerCase().replace(/^adobe\s+/, "")];
  // 카드 아래 '구분 · 참여 · 기여도' 줄 (예: 공모전 · 팀 3인 ━━ 50%)
  function typeRow(p) {
    const t = window.teamInfo(p);
    const label = `${window.kindLabel(p)} · ${t.label}`;
    return `<span class="sw-type ${t.team ? "sw-type--team" : ""}">
        <span class="sw-type__label">${esc(label)}</span>
        ${t.pct != null ? `<span class="sw-type__pct" aria-label="기여도 ${t.pct}%"><span class="sw-type__k" aria-hidden="true">기여도</span><span class="sw-type__bar"><i style="width:${t.pct}%"></i></span><b>${t.pct}%</b></span>` : ""}
      </span>`;
  }
  // 카드 맨 아래 사용 도구 (3개까지 + 나머지 개수)
  function toolsRow(p) {
    const tools = p.tools || [];
    if (!tools.length) return "";
    const shown = tools.slice(0, 3);
    return `<span class="sw-tools" aria-label="사용 도구: ${esc(tools.join(", "))}">${shown.map((t) => {
      const ic = toolIcon(t);
      return `<span class="sw-tool">${ic ? `<img src="img/icons/${ic}.svg" alt="" width="14" height="14" />` : ""}${esc(t)}</span>`;
    }).join("")}${tools.length > 3 ? `<span class="sw-tool sw-tool--more">+${tools.length - 3}</span>` : ""}</span>`;
  }

  const card = (p, meta) => `
    <li class="sw-card"><a href="${esc(window.keepLink(`project.html?id=${encodeURIComponent(p.id)}`))}">
      <span class="sw-card__img"><img src="${esc(p.thumb)}" alt="" loading="lazy" />${p.featured ? '<span class="badge badge--img">대표</span>' : ""}</span>
      <span class="sw-card__meta">${esc(meta)}</span>
      <strong class="sw-card__title">${esc(p.title)}</strong>
      ${p.role ? `<span class="sw-card__role">${esc(p.role)}</span>` : ""}
      <span class="sw-card__foot">${typeRow(p)}${toolsRow(p)}</span>
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
    // 종류별: 위에서 카테고리를 고르고 아래에서 봐요
    //  - 전체: 종류별 줄(옆으로 넘기기) / 하나 고르면: 그 종류 카드만 바둑판
    const cp = $("#panelCat");
    const catMeta = (p) => `${yearOf(p)}.${p.date.slice(5, 7)}`;
    cp.innerHTML = `
      <div class="${CAT_FILTER === "chips" ? "cbar cbar--chips" : "ybar cbar"}" role="tablist" aria-label="카테고리 선택">
        <button type="button" role="tab" class="cbar__btn${CAT_FILTER === "chips" ? "" : " ybar__btn"}" data-c="" aria-selected="true">전체<sup>${ALL.length}</sup></button>
        ${byCat.map(([c, items]) => `<button type="button" role="tab" class="cbar__btn${CAT_FILTER === "chips" ? "" : " ybar__btn"}" data-c="${esc(c)}" aria-selected="false">${esc(c)}<sup>${items.length}</sup></button>`).join("")}
      </div>
      <div class="cview" id="cView" role="tabpanel" aria-live="polite"></div>`;
    const showCat = (c) => {
      $$(".cbar__btn", cp).forEach((b) => b.setAttribute("aria-selected", String(b.dataset.c === c)));
      const g = byCat.find((x) => x[0] === c);
      $("#cView").innerHTML = g
        ? `<ul class="ym__grid cgrid">${[...g[1]].sort((a, b) => b.date.localeCompare(a.date)).map((p) => card(p, catMeta(p))).join("")}</ul>`
        : groupsHTML(byCat, catMeta, "gc");
      if (typeof arrows === "function") arrows();
      if (typeof fit === "function") fit();
    };
    cp.addEventListener("click", (e) => { const b = e.target.closest(".cbar__btn"); if (b) showCat(b.dataset.c); });
    showCat("");
    // 요약 도넛의 카테고리 이름을 누르면 → 종류별 탭 + 그 카테고리
    $$("#summary .donut__legend li[data-c]").forEach((li) => {
      const go = () => { select(0); showCat(li.dataset.c); $("#viewTabs").scrollIntoView({ behavior: "smooth", block: "start" }); };
      li.addEventListener("click", go);
      li.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); go(); } });
    });
    // 연도별: 위에서 연도를 고르고, 아래에 그 해를 월별로 정리
    const yp = $("#panelYear");
    yp.innerHTML = `
      <div class="ybar ${CAT_FILTER === "chips" ? "cbar cbar--chips ybar--chips" : ""}" role="tablist" aria-label="연도 선택">
        ${byYear.map(([y, items], i) => `<button type="button" role="tab" class="ybar__btn${CAT_FILTER === "chips" ? " cbar__btn" : ""}" data-y="${esc(y)}" aria-selected="${i === 0}">${esc(y)}<sup>${items.length}</sup></button>`).join("")}
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
      $("#yMonths").innerHTML = [...months].map(([m, list]) => `
        <section class="ym" aria-label="${esc(y)}년 ${m ? `${m}월` : "월 미정"}">
          <h4 class="ym__month"><b>${m || "–"}</b><strong>${m ? "월" : "월 미정"}</strong><span>${list.length}개</span></h4>
          <ul class="ym__grid">${list.map((p) => card(p, p.categoryLabel)).join("")}</ul>
        </section>`).join("");
      if (typeof fit === "function") fit();
    };
    yp.addEventListener("click", (e) => { const b = e.target.closest(".ybar__btn"); if (b) showYear(b.dataset.y); });
    if (byYear.length) showYear(byYear[0][0]);

    // 넘칠 때만 화살표
    var arrows = () => $$(".sw-group").forEach((g) => {
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
    var select = (i, scroll = true) => {
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

    /* 상세로 갈 때: 지금 보던 목록 순서와 자리를 기억해요
       → 상세 페이지의 이전 · 다음이 이 순서를 따르고, '목록'을 누르면 이 자리로 돌아와요 */
    const KEY = "pf.works";
    const curYear = () => { const b = $("#panelYear .ybar__btn[aria-selected=true]"); return b ? b.dataset.y : ""; };
    box.addEventListener("click", (e) => {
      const a = e.target.closest(".sw-card a"); if (!a) return;
      const panel = panels[cur];
      const ids = [...new Set($$(".sw-card a", panel).map((x) => new URL(x.href, location.href).searchParams.get("id")))];
      const cb = $("#panelCat .cbar__btn[aria-selected=true]");
      const cat = cb ? cb.dataset.c : "";
      const label = cur === 0 ? (cat || "전체") : `${curYear()}년`;
      try { sessionStorage.setItem(KEY, JSON.stringify({ ids, label, tab: cur, year: curYear(), cat, y: window.scrollY })); } catch (err) { /* 저장이 안 돼도 이동은 돼요 */ }
    });
    // '목록'으로 돌아왔을 때 보던 탭 · 카테고리 · 연도 · 위치 그대로
    let saved = null;
    try { saved = JSON.parse(sessionStorage.getItem(KEY) || "null"); } catch (err) { saved = null; }
    let back = false;
    try { back = sessionStorage.getItem("pf.back") === "1"; sessionStorage.removeItem("pf.back"); } catch (err) { back = false; }
    const nav = (performance.getEntriesByType && performance.getEntriesByType("navigation")[0]) || {};
    if (saved && (back || nav.type === "back_forward")) {
      if (saved.year) { const b = $(`#panelYear .ybar__btn[data-y="${saved.year}"]`); if (b) b.click(); }
      if (saved.cat) { const b = [...$$("#panelCat .cbar__btn")].find((x) => x.dataset.c === saved.cat); if (b) b.click(); }
      if (saved.tab) { box.style.scrollBehavior = "auto"; select(saved.tab, false); box.scrollLeft = saved.tab * box.clientWidth; box.style.scrollBehavior = ""; }
      requestAnimationFrame(() => window.scrollTo({ top: saved.y || 0, behavior: "instant" }));
    }
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
    animateSummary();
    buildViews();
  }

  // 뒤로 가기로 그대로 돌아온 경우(브라우저가 페이지를 보관해 둔 경우) 표시만 지워요
  window.addEventListener("pageshow", (e) => { if (e.persisted) { try { sessionStorage.removeItem("pf.back"); } catch (err) { /* 무시 */ } } });

  (window.PROJECTS_READY || Promise.resolve()).then(() => {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
  });
})();
