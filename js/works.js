/* =========================================
   works.html 전용 스크립트
   - 한눈에 보기(분야 · 많이 쓴 도구) / 분야 필터 / 프로젝트 목록 / 상세 모달
   - 내용은 전부 js/projects.js 에서 가져와요
   ========================================= */
(function () {
  "use strict";

  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const fmtDate = (d) => d.replace("-", ".");
  let filter = "all";

  /* ---------- 1. 한눈에 보기 ---------- */
  function renderOverview(list) {
    $("#ovCount").textContent = list.length;

    const fields = {};
    list.forEach((p) => { fields[p.categoryLabel] = (fields[p.categoryLabel] || 0) + 1; });
    $("#ovFields").innerHTML = Object.entries(fields).sort((a, b) => b[1] - a[1])
      .map(([name, n]) => `<li><span>${esc(name)}</span><em>${n}</em></li>`).join("");

    const tools = {};
    list.forEach((p) => (p.tools || []).forEach((t) => { tools[t] = (tools[t] || 0) + 1; }));
    const top = Object.entries(tools).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const max = top.length ? top[0][1] : 1;
    $("#ovTools").innerHTML = top.map(([name, n]) => `<li>
        <span class="overview__tool">${esc(name)}</span>
        <span class="overview__bar"><i style="width:${Math.round((n / max) * 100)}%"></i></span>
        <span class="overview__n">${n}개 작업</span>
      </li>`).join("");
  }

  /* ---------- 2. 분야 필터 ---------- */
  function renderFilter(list) {
    const cats = [...new Set(list.map((p) => p.categoryLabel))];
    const box = $("#filter");
    if (cats.length < 2) { box.hidden = true; return; }
    box.innerHTML = [["all", "전체", list.length], ...cats.map((c) => [c, c, list.filter((p) => p.categoryLabel === c).length])]
      .map(([key, label, n]) => `<button type="button" data-f="${esc(key)}" aria-pressed="${key === filter}">${esc(label)} <sup>${n}</sup></button>`).join("");
    box.addEventListener("click", (e) => {
      const b = e.target.closest("button[data-f]");
      if (!b) return;
      filter = b.dataset.f;
      $$("button", box).forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
      $$(".work").forEach((el) => { el.hidden = filter !== "all" && el.dataset.cat !== filter; });
      layout();
    });
  }

  // 보이는 작업만 01부터 다시 번호를 매기고, 이미지 위치(왼쪽·오른쪽)도 보이는 순서대로 번갈아 둬요.
  function layout() {
    $$(".work").filter((el) => !el.hidden).forEach((el, i) => {
      $(".work__no", el).textContent = String(i + 1).padStart(2, "0");
      el.classList.toggle("is-flip", i % 2 === 1);
    });
  }

  /* 프로젝트 구분 표시 이름 */
  const KINDS = { personal: "개인 프로젝트", team: "팀 프로젝트", contest: "공모전", school: "학교 과제", client: "외주" };
  const kindLabel = (p) => KINDS[p.type] || (p.client ? "외주" : "개인 프로젝트");

  /* ---------- 3. 프로젝트 목록 ---------- */
  function renderList(list) {
    $("#worksList").innerHTML = list.map((p, i) => `
      <article class="work reveal" data-cat="${esc(p.categoryLabel)}" id="${esc(p.id)}">
        <button type="button" class="work__media" data-open="${esc(p.id)}" aria-label="${esc(p.title)} 자세히 보기">
          <img src="${esc(p.thumb)}" alt="" loading="lazy" />
          ${p.result ? `<span class="work__result"><strong>${esc(p.result.value)}</strong>${esc(p.result.label)}</span>` : ""}
        </button>
        <div class="work__body">
          <p class="work__meta"><span class="work__no">${String(i + 1).padStart(2, "0")}</span>${esc(p.categoryLabel)} · ${fmtDate(p.date)}</p>
          <h2 class="work__title">${esc(p.title)}</h2>
          <p class="work__summary">${esc(p.summary || p.desc)}</p>
          <dl class="work__facts">
            <div><dt>역할</dt><dd>${esc(p.role)}</dd></div>
            <div><dt>구분</dt><dd>${esc(kindLabel(p))}</dd></div>
          </dl>
          ${p.did && p.did.length ? `<div class="work__did"><p class="work__label">한 일</p><ul>${p.did.map((d) => `<li>${esc(d)}</li>`).join("")}</ul></div>` : ""}
          ${p.tools && p.tools.length ? `<ul class="work__tools" aria-label="사용한 도구">${p.tools.map((t) => `<li>${esc(t)}</li>`).join("")}</ul>` : ""}
          <button type="button" class="work__more" data-open="${esc(p.id)}">자세히 보기 <span aria-hidden="true">→</span></button>
        </div>
      </article>`).join("");
  }

  /* ---------- 4. 날짜별 Archive : 연도 탭 → 월별 묶음 ----------
     연도가 많아져도 한 번에 한 해만 펼쳐서 길어지지 않아요. */
  function renderTimeline(list) {
    const box = $("#timelineList");
    if (!box) return;
    const byYear = {};
    [...list].sort((a, b) => b.date.localeCompare(a.date)).forEach((p) => {
      (byYear[p.date.slice(0, 4)] = byYear[p.date.slice(0, 4)] || []).push(p);
    });
    const years = Object.keys(byYear).sort((a, b) => b - a);
    if (!years.length) { box.innerHTML = ""; return; }
    let current = years[0];

    box.innerHTML = `
      <div class="yarch__tabs" role="tablist" aria-label="연도 선택">${years.map((y) =>
        `<button type="button" role="tab" data-y="${y}" aria-selected="${y === current}">${y}<sup>${byYear[y].length}</sup></button>`).join("")}
      </div>
      <div class="yarch__panel" id="yarchPanel" role="tabpanel"></div>`;

    const panel = $("#yarchPanel");
    function show(y) {
      current = y;
      $$(".yarch__tabs button", box).forEach((b) => b.setAttribute("aria-selected", String(b.dataset.y === y)));
      const byMonth = {};
      byYear[y].forEach((p) => { (byMonth[p.date.slice(5, 7)] = byMonth[p.date.slice(5, 7)] || []).push(p); });
      panel.innerHTML = Object.keys(byMonth).sort((a, b) => b - a).map((m) => `
        <div class="yarch__month">
          <p class="yarch__mh"><em>${m}</em><span>월</span><small>${byMonth[m].length}개</small></p>
          <ol class="yarch__rows">${byMonth[m].map((p) => `
            <li><a href="#${esc(p.id)}" class="yarch__row">
              <img src="${esc(p.thumb)}" alt="" loading="lazy" />
              <span class="yarch__t">${esc(p.title)}</span>
              <span class="yarch__c">${esc(p.categoryLabel)}</span>
              <span class="yarch__go" aria-hidden="true">↗</span>
            </a></li>`).join("")}
          </ol>
        </div>`).join("");
      panel.classList.remove("is-in"); void panel.offsetWidth; panel.classList.add("is-in");
    }
    box.addEventListener("click", (e) => {
      const tab = e.target.closest(".yarch__tabs button");
      if (tab) { show(tab.dataset.y); return; }
      const a = e.target.closest("a.yarch__row");
      if (!a) return;
      const t = document.getElementById(a.getAttribute("href").slice(1));
      if (t && t.hidden) { // 필터로 숨겨져 있으면 전체 보기로
        filter = "all";
        $$("#filter button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.f === "all")));
        $$(".work").forEach((el) => { el.hidden = false; });
        layout();
      }
    });
    box.addEventListener("keydown", (e) => {
      const tab = e.target.closest(".yarch__tabs button");
      if (!tab || (e.key !== "ArrowRight" && e.key !== "ArrowLeft")) return;
      const i = years.indexOf(tab.dataset.y) + (e.key === "ArrowRight" ? 1 : -1);
      if (years[i]) { show(years[i]); $(`.yarch__tabs button[data-y="${years[i]}"]`, box).focus(); }
    });
    show(current);
  }

  /* ---------- 5. 케이스 스터디 (DB projects.detail 이 채워진 프로젝트) ----------
     detail = { sections: [ { type, label, title, body:[문단], ... } ] }
     type: text · target · cards · cast · scenario · mockup · gallery · palette(colors, fonts) · process · notes
     섹션 번호(01, 02…)는 순서대로 자동으로 붙어요. */
  const HEX = /^#[0-9a-f]{3,8}$/i;
  const paras = (b) => (Array.isArray(b) ? b : b ? [b] : []).map((t) => `<p>${esc(t)}</p>`).join("");
  const img = (src, alt) => (src ? `<img src="${esc(src)}" alt="${esc(alt || "")}" loading="lazy" />` : "");

  const SECTION = {
    text: (s) => paras(s.body),
    target: (s) => {
      const pc = s.persona || {};
      return `${paras(s.body)}<div class="cs-persona">
        <div class="cs-persona__card">
          ${pc.kicker ? `<small>${esc(pc.kicker)}</small>` : ""}
          <h4>${esc(pc.name)}</h4>
          ${pc.desc ? `<p>${esc(pc.desc)}</p>` : ""}
          ${(pc.chips || []).length ? `<div>${pc.chips.map((c) => `<span class="cs-chip">${esc(c)}</span>`).join("")}</div>` : ""}
          ${pc.note ? `<small>${esc(pc.note)}</small>` : ""}
        </div>
        <ul class="cs-decide">${(s.decisions || []).map(([a, b]) => `<li><span>${esc(a)}</span><span aria-hidden="true">→</span><span>${esc(b)}</span></li>`).join("")}</ul>
      </div>`;
    },
    cards: (s) => `${paras(s.body)}<div class="cs-cards">${(s.items || []).map((it) => `
      <div>${it.kicker ? `<b>${esc(it.kicker)}</b>` : ""}<strong>${esc(it.title)}</strong>${it.desc ? `<span>${esc(it.desc)}</span>` : ""}</div>`).join("")}</div>`,
    notes: (s) => `${paras(s.body)}<div class="cs-notes">${(s.items || []).map((it) => `
      <div><h4>${esc(it.title)}</h4><p>${esc(it.desc)}</p></div>`).join("")}</div>`,
    cast: (s) => `${paras(s.body)}<div class="cs-cast">${(s.items || []).map((it) => `
      <figure><div class="cs-cast__sw" style="background:${HEX.test(it.color) ? it.color : "var(--bg-alt)"}"><i>${esc(it.sound)}</i></div>
      <figcaption>${esc(it.name)}<small>${esc(it.note || "")}${it.color ? ` · ${esc(it.color)}` : ""}</small></figcaption></figure>`).join("")}</div>`,
    scenario: (s) => {
      const arc = s.arc || [];
      return `${paras(s.body)}
        ${arc.length ? `<div class="cs-arc" style="grid-template-columns:${arc.map((a) => `${Number(a.span) || 1}fr`).join(" ")}">${arc.map((a) => `<span${a.key ? ' class="is-key"' : ""}>${esc(a.label)}</span>`).join("")}</div>` : ""}
        <ol class="cs-scenes">${(s.scenes || []).map((sc, i) => `
          <li${sc.key ? ' class="is-key"' : ""}><div class="cs-scenes__box">${sc.image ? img(sc.image) : String(i + 1).padStart(2, "0")}</div><b>${esc(sc.title)}</b><span>${esc(sc.desc || "")}</span></li>`).join("")}</ol>
        ${(s.scenes || []).some((x) => x.key) ? `<p class="cs-hint">주황 테두리 = 연출 포인트 장면</p>` : ""}`;
    },
    mockup: (s, p) => `<div class="cs-tablet">${img(s.image || p.image, s.caption || p.title)}</div>`,
    gallery: (s) => `<div class="cs-gallery">${(s.items || []).map((it) => `
      <figure class="${it.image ? "" : "is-empty"}">${it.image ? img(it.image, it.title) : ""}<figcaption><b>${esc(it.title)}</b>${esc(it.desc || "")}</figcaption></figure>`).join("")}</div>`,
    palette: (s) => `${paras(s.body)}
      <div class="cs-pal">${(s.colors || []).filter((c) => HEX.test(c.hex)).map((c) => `
        <div><i style="background:${c.hex}"></i><span>${esc(c.name)}</span><code>${esc(c.hex.toUpperCase())}</code></div>`).join("")}</div>
      ${(s.fonts || []).length ? `<div class="cs-type">${s.fonts.map((t) => `
        <div><div class="cs-type__${t.style === "display" ? "big" : "body"}">${esc(t.sample)}</div><small>${esc(t.note || "")}</small></div>`).join("")}</div>` : ""}`,
    process: (s) => `${paras(s.body)}
      <ol class="cs-flow">${(s.steps || []).map((st) => `<li><b>${esc(st.title)}</b>${esc(st.desc || "")}</li>`).join("")}</ol>
      ${s.note ? `<p class="cs-note">${esc(s.note)}</p>` : ""}`,
  };
  const WIDE = { mockup: 1, gallery: 1 };

  function renderCase(p) {
    let n = 0;
    const secs = (p.detail.sections || []).filter((s) => SECTION[s.type]).map((s) => {
      n += 1;
      const no = String(n).padStart(2, "0");
      const inner = SECTION[s.type](s, p);
      if (WIDE[s.type]) {
        return `<section class="cs-band"><p class="cs-band__cap"><span><em>${no}</em> ${esc(s.label || "")}</span>${s.caption ? `<span>${esc(s.caption)}</span>` : ""}</p>${s.title ? `<h3 class="cs-band__title">${esc(s.title)}</h3>` : ""}${inner}</section>`;
      }
      return `<section class="cs-sec"><div class="cs-sec__label"><em>${no}</em>${esc(s.label || "")}</div>
        <div class="cs-sec__body">${s.title ? `<h3>${esc(s.title)}</h3>` : ""}${inner}</div></section>`;
    }).join("");
    const facts = [
      ["역할", p.role],
      ["기간", p.period || fmtDate(p.date)],
      ["구분", [kindLabel(p), p.client].filter(Boolean).join(" · ")],
      ["도구", (p.tools || []).join(" · ")],
    ].filter(([, v]) => v);
    return `
      <header class="cs-hero">
        <div class="cs-hero__img">${img(p.image, p.title)}</div>
        <div class="cs-hero__text">
          <p class="cs-hero__meta">${esc(p.categoryLabel)} · ${fmtDate(p.date)}</p>
          <h2 class="cs-hero__title" id="caseTitle">${esc(p.title)}</h2>
          ${p.summary ? `<p class="cs-hero__lead">${esc(p.summary)}</p>` : ""}
          <dl class="cs-facts">${facts.map(([k, v]) => `<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join("")}</dl>
        </div>
      </header>
      ${secs}
      ${p.link ? `<p class="cs-end"><a class="btn btn--primary" href="${esc(p.link)}" target="_blank" rel="noopener">작품 보러 가기 ↗</a></p>` : ""}`;
  }

  /* ---------- 6. 상세 모달 ---------- */
  const modal = $("#modal");
  let lastFocused = null;
  function openModal(id) {
    const p = PROJECTS.find((x) => x.id === id);
    if (!p || !modal) return;
    const isCase = !!(p.detail && (p.detail.sections || []).length);
    const box = $("#modalCase");
    modal.classList.toggle("is-case", isCase && !!box);
    if (box) {
      box.hidden = !isCase;
      box.innerHTML = isCase ? renderCase(p) : "";
      $("#modalImg").hidden = isCase;
      $(".modal__body", modal).hidden = isCase;
      $(".modal__panel", modal).setAttribute("aria-labelledby", isCase ? "caseTitle" : "modalTitle");
      box.scrollTop = 0;
    }
    if (isCase && box) {
      lastFocused = document.activeElement;
      modal.classList.add("is-open");
      modal.setAttribute("aria-hidden", "false");
      document.body.classList.add("is-locked");
      $(".modal__close", modal).focus();
      return;
    }
    $("#modalImg").src = p.image;
    $("#modalImg").alt = p.title;
    $("#modalMeta").textContent = `${p.categoryLabel} · ${fmtDate(p.date)} · ${kindLabel(p)}${p.client ? ` · ${p.client}` : ""}`;
    $("#modalTitle").textContent = p.title;
    $("#modalDesc").textContent = p.desc;
    $("#modalTags").innerHTML = [...(p.tools || []), ...(p.tags || [])].map((t) => `<li>${esc(t)}</li>`).join("");
    const link = $("#modalLink");
    if (p.link) { link.href = p.link; link.hidden = false; } else { link.hidden = true; }
    lastFocused = document.activeElement;
    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("is-locked");
    $(".modal__close", modal).focus();
  }
  function closeModal() {
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("is-locked");
    if (lastFocused) lastFocused.focus();
  }

  function init() {
    const list = window.PROJECTS || [];
    renderOverview(list);
    renderFilter(list);
    renderList(list);
    layout();
    renderTimeline(list);
    // 보기 전환 (works2.html 처럼 #viewToggle 이 있을 때만)
    const toggle = $("#viewToggle");
    if (toggle) {
      const show = (v) => {
        $$("button", toggle).forEach((b) => b.setAttribute("aria-selected", String(b.dataset.view === v)));
        $("#worksList").hidden = v !== "cards";
        $("#filter").hidden = v !== "cards" || $$("#filter button").length === 0;
        $("#timeline").hidden = v !== "timeline";
        $("#timeline").classList.add("is-visible");
      };
      toggle.addEventListener("click", (e) => { const b = e.target.closest("button[data-view]"); if (b) show(b.dataset.view); });
      $("#timelineList").addEventListener("click", (e) => { if (e.target.closest("a.yarch__row")) show("cards"); }, true);
    }
    // 목록은 나중에 그려지므로 등장 효과를 여기서 직접 연결해요
    const items = $$(".work.reveal");
    if ("IntersectionObserver" in window) {
      const io = new IntersectionObserver((entries) => entries.forEach((en) => {
        if (en.isIntersecting) { en.target.classList.add("is-visible"); io.unobserve(en.target); }
      }), { threshold: 0.12 });
      items.forEach((el) => io.observe(el));
    } else items.forEach((el) => el.classList.add("is-visible"));
    document.addEventListener("click", (e) => {
      const b = e.target.closest("[data-open]");
      if (b) openModal(b.dataset.open);
    });
    if (modal) {
      $$("[data-close]", modal).forEach((el) => el.addEventListener("click", closeModal));
      document.addEventListener("keydown", (e) => { if (e.key === "Escape" && modal.classList.contains("is-open")) closeModal(); });
    }
    // 메인에서 #프로젝트id 로 들어오면 그 작업으로 이동
    if (location.hash) { const t = document.getElementById(location.hash.slice(1)); if (t) setTimeout(() => t.scrollIntoView({ block: "start" }), 50); }
  }

  (window.PROJECTS_READY || Promise.resolve()).then(() => {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
  });
})();
