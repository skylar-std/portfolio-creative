/* =========================================
   works.html 전용: 프로젝트 서가
   - 추천 도서(featured, 없으면 최신 6권) → 분류별 서가(category) → 목록 보기(검색·분류·연도)
   - 책을 누르면 상세 창이 열려요 (DB projects.detail 이 있으면 케이스 스터디)
   - 내용은 전부 DB(js/data.js 가 받은 window.PROJECTS)에서 와요
   ========================================= */
(function () {
  "use strict";

  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const fmtDate = (d) => d.replace("-", ".");
  const pad = (n, w) => String(n).padStart(w, "0");
  const c01 = (v) => Math.max(0, Math.min(1, v));

  const FEAT_MAX = 8;   // 추천 도서 최대 권수

  /* 프로젝트 구분 표시 이름 */
  const KINDS = { personal: "개인 프로젝트", team: "팀 프로젝트", contest: "공모전", school: "학교 과제", client: "외주" };
  const kindLabel = (p) => KINDS[p.type] || (p.client ? "외주" : "개인 프로젝트");

  /* 책등 모양: 프로젝트 id 로 항상 같은 색 · 두께 · 높이 */
  const SPINE_COLORS = [["#0F2A9E", "#FFFFFF"], ["#FBFAF7", "#141416"], ["#2B2B2F", "#FFFFFF"], ["#D6D4CF", "#141416"], ["#141416", "#FFFFFF"],
    ["#FFFFFF", "#141416"], ["#3A3A40", "#FFFFFF"], ["#E9E8E4", "#141416"], ["#0B2283", "#FFFFFF"], ["#BDBBB5", "#141416"]];
  const hash = (s) => { let h = 2166136261; for (const ch of String(s)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };

  /* 분류 기호: 영문이면 앞 두 글자(BR, PK…), 아니면 서가 번호(S1, S2…) */
  function shelfCode(label, no) {
    const m = String(label).match(/[A-Za-z]{2}/);
    return m ? m[0].toUpperCase() : `S${no}`;
  }

  /* ---------- 1. 데이터 정리 ---------- */
  function prepare(list) {
    const books = [...list].sort((a, b) => b.date.localeCompare(a.date));
    const cats = [];
    books.forEach((p) => { const c = p.categoryLabel || "기타"; if (!cats.includes(c)) cats.push(c); });
    // 권수 많은 분류부터, 같으면 최신 작업이 있는 분류부터
    const count = (c) => books.filter((p) => (p.categoryLabel || "기타") === c).length;
    cats.sort((a, b) => count(b) - count(a));
    const shelves = cats.map((c, i) => ({ name: c, no: i + 1, code: shelfCode(c, i + 1), id: `shelf-${i + 1}`, books: [] }));
    // 오래된 작업일수록 앞 번호 (001부터)
    const chrono = [...books].reverse();
    books.forEach((p) => {
      const sh = shelves.find((s) => s.name === (p.categoryLabel || "기타"));
      const h = hash(p.id);
      const [col, ink] = SPINE_COLORS[h % SPINE_COLORS.length];
      Object.assign(p, {
        _num: pad(chrono.indexOf(p) + 1, 3), _year: p.date.slice(0, 4), _shelf: sh,
        _col: col, _ink: ink, _w: 38 + (h >> 4) % 24, _h: 180 + (h >> 9) % 52,
      });
      p._call = `${sh.code} · ${p._num}`;
      sh.books.push(p);
    });
    let feat = books.filter((p) => p.featured);
    if (!feat.length) feat = books.slice(0, 6);
    return { books, shelves, feat: feat.slice(0, FEAT_MAX) };
  }

  /* ---------- 2. 추천 도서 (PC: 스크롤하면 한 권씩 꺼내져요) ---------- */
  const F = { list: [], sel: 0, hover: -1, sticky: false, range: 0 };
  const mqSticky = window.matchMedia("(min-width: 960px) and (min-height: 620px) and (prefers-reduced-motion: no-preference)");

  function featCard(p, i, n) {
    const rows = [["YEAR", `<span class="en">${esc(p._year)}</span>`], ["ROLE", esc(p.role)], ["TYPE", esc(kindLabel(p))]].filter(([, v]) => v);
    return `<div class="feat__card-top">
        <span><span class="wk-k">CALL NO.</span><span class="en feat__call">${esc(p._call)}</span></span>
        <span class="en">${pad(i + 1, 2)} / ${pad(n, 2)}</span>
      </div>
      <img src="${esc(p.thumb)}" alt="" />
      <p class="eb eb--blue">${esc(p.categoryLabel)}</p>
      <h3 class="feat__title">${esc(p.title)}</h3>
      ${p.summary ? `<p class="feat__line">${esc(p.summary)}</p>` : ""}
      <div class="feat__rows">${rows.map(([k, v]) => `<div class="wk-row"><span class="wk-k">${k}</span><span>${v}</span></div>`).join("")}</div>
      <button type="button" class="lib-btn lib-btn--blue feat__open" data-open="${esc(p.id)}">책 펼쳐보기
        <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M4 12h16M14 6l6 6-6 6" /></svg></button>`;
  }

  function drawFeat() {
    const n = F.list.length;
    const sel = F.hover >= 0 ? F.hover : F.sel;
    const p = F.list[sel];
    if (!p) return;
    const card = $("#featCard");
    if (card.dataset.id !== p.id) { card.dataset.id = p.id; card.innerHTML = featCard(p, sel, n); }
    $$(".feat__book", $("#featBooks")).forEach((b, i) => b.classList.toggle("is-on", i === sel));
    $("#featProg").style.width = `${Math.round(((F.sel + 1) / n) * 100)}%`;
  }

  function buildFeat(feat) {
    F.list = feat;
    const sec = $("#feat");
    if (!feat.length) { emptyFeat(); return; }
    $("#featTitle").textContent = `추천 도서 · 대표작 ${feat.length}권`;
    $("#featBooks").innerHTML = feat.map((p, i) => `
      <button type="button" class="feat__book" data-open="${esc(p.id)}" data-i="${i}" aria-label="${esc(p.title)} 펼쳐보기">
        <img src="${esc(p.thumb)}" alt="" loading="lazy" />
        <span class="feat__edge" aria-hidden="true"></span>
        <span class="en feat__tag">${esc(p._call)}</span>
      </button>`).join("");
    const enter = (e) => { const b = e.target.closest(".feat__book"); if (b) { F.hover = +b.dataset.i; drawFeat(); } };
    const leave = (e) => { const b = e.target.closest(".feat__book"); if (b && !b.contains(e.relatedTarget)) { F.hover = -1; drawFeat(); } };
    $("#featBooks").addEventListener("mouseover", enter);
    $("#featBooks").addEventListener("focusin", enter);
    $("#featBooks").addEventListener("mouseout", leave);
    $("#featBooks").addEventListener("focusout", leave);
    setFeatMode();
    mqSticky.addEventListener ? mqSticky.addEventListener("change", setFeatMode) : mqSticky.addListener(setFeatMode);
  }

  /* 아직 책이 없을 때도 서가 틀은 그대로 */
  const GHOSTS = 5;
  function emptyFeat() {
    const v = (new URLSearchParams(location.search).get("v") || "").trim();
    const home = `index.html${v ? `?v=${encodeURIComponent(v)}` : ""}`;
    $("#featTitle").textContent = "추천 도서 · 대표작 0권";
    $("#featHint").textContent = "아직 꽂힌 책이 없어요";
    $("#featCard").innerHTML = `<div class="feat__card-top">
        <span><span class="wk-k">CALL NO.</span><span class="en feat__call">— · 000</span></span>
        <span class="en">00 / 00</span>
      </div>
      <div class="wk-ghost-img" aria-hidden="true"></div>
      <p class="eb">NO VOLUME</p>
      <h3 class="feat__title">준비 중인 책</h3>
      <p class="feat__line">새 프로젝트가 정리되는 대로 이 자리에 꽂아둘게요.</p>
      <div class="feat__rows">${["YEAR", "ROLE", "TYPE"].map((k) => `<div class="wk-row"><span class="wk-k">${k}</span><span class="wk-dim">—</span></div>`).join("")}</div>
      <a class="lib-btn feat__open" href="${home}">메인으로 돌아가기
        <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M20 12H4M10 6l-6 6 6 6" /></svg></a>`;
    $("#featBooks").innerHTML = Array.from({ length: GHOSTS }, () => `<span class="feat__book feat__book--ghost" aria-hidden="true"></span>`).join("");
    $("#featProg").style.width = "0";
  }

  function setFeatMode() {
    const n = F.list.length;
    F.sticky = mqSticky.matches && n > 1;
    $("#feat").classList.toggle("is-sticky", F.sticky);
    $("#featHint").textContent = F.sticky ? "스크롤하면 한 권씩 꺼내져요 · 누르면 바로 펼쳐져요" : "책에 마우스를 올리거나 누르면 펼쳐져요";
    sizeFeat();
  }
  function sizeFeat() {
    const vh = Math.min(window.innerHeight, 1100);
    F.range = F.sticky ? (F.list.length - 1) * vh * 0.36 : 0;
    $("#feat").style.height = F.sticky ? `${Math.round(F.range + vh)}px` : "";
    scrollFeat();
  }
  function scrollFeat() {
    if (F.sticky) {
      const p = c01(-$("#feat").getBoundingClientRect().top / (F.range || 1));
      F.sel = Math.min(F.list.length - 1, Math.floor(p * F.list.length));
    } else F.sel = Math.max(0, Math.min(F.sel, F.list.length - 1));
    drawFeat();
  }

  /* ---------- 3. 분류별 서가 ---------- */
  function buildShelves(shelves) {
    if (!shelves.length) {
      $("#shelfChips").innerHTML = `<span class="wk-chip wk-chip--ghost">분류 없음<span>0</span></span>`;
      $("#shelfList").innerHTML = `
        <div class="shelf-row">
          <div class="shelf-row__side">
            <div class="shelf-row__label">
              <p class="en">SHELF 01 · —</p>
              <p class="shelf-row__name">빈 서가</p>
              <p class="shelf-row__count">0권</p>
            </div>
            <div class="shelf-row__peek"><div class="wk-ghost-img wk-ghost-img--sm" aria-hidden="true"></div><span class="shelf-row__title wk-dim">아직 꽂힌 책이 없어요</span></div>
          </div>
          <div class="shelf-row__main">
            <div class="shelf-row__track shelf-row__track--empty">
              ${[54, 40, 62, 46, 58, 42, 50].map((w, i) => `<span class="wk-spine wk-spine--ghost" style="width:${w}px;height:${190 + (i * 17) % 40}px" aria-hidden="true"></span>`).join("")}
              <p class="shelf-row__empty">새 프로젝트가 정리되는 대로 이 서가에 꽂아둘게요.</p>
            </div>
            <div class="shelf-row__plank" aria-hidden="true"></div>
            <div class="shelf-row__foot"><span>0권</span></div>
          </div>
        </div>`;
      return;
    }
    $("#shelfChips").innerHTML = shelves.map((s) => `<a class="wk-chip" href="#${s.id}">${esc(s.name)}<span>${s.books.length}</span></a>`).join("");
    $("#shelfList").innerHTML = shelves.map((s) => `
      <div class="shelf-row" id="${s.id}">
        <div class="shelf-row__side">
          <div class="shelf-row__label">
            <p class="en">SHELF ${pad(s.no, 2)} · ${esc(s.code)}</p>
            <p class="shelf-row__name">${esc(s.name)}</p>
            <p class="shelf-row__count">${s.books.length}권 · 최신순</p>
          </div>
          <div class="shelf-row__peek" data-peek></div>
        </div>
        <div class="shelf-row__main">
          <div class="shelf-row__track" data-track>
            ${s.books.map((p, i) => `
              <button type="button" class="wk-spine${i === 0 ? " is-on" : ""}" data-open="${esc(p.id)}" aria-label="${esc(p.title)} — ${esc(p._year)}, 펼쳐보기"
                style="width:${p._w}px;height:${p._h}px;background:${p._col};color:${p._ink};${p._ink === "#141416" ? "border-color:#CFCDC8;" : ""}">
                <span class="en wk-spine__year">${esc(p._year)}</span>
                <span class="wk-spine__title" style="max-height:${p._h - 74}px;font-size:${p._w > 48 ? 14 : 12}px">${esc(p.title)}</span>
                <span class="en wk-spine__num">${esc(p._num)}</span>
              </button>`).join("")}
            <span class="shelf-row__end" aria-hidden="true"></span>
          </div>
          <div class="shelf-row__plank" aria-hidden="true"></div>
          <div class="shelf-row__foot">
            <span>${s.books.length > 8 ? "옆으로 넘기면 더 있어요 · 최신순" : "최신순 정렬"}</span>
            <span class="shelf-row__arrows">
              <button type="button" class="wk-arrow" data-scroll="-1" aria-label="${esc(s.name)} 서가 왼쪽으로"><svg aria-hidden="true" viewBox="0 0 24 24"><path d="M15 6l-6 6 6 6" /></svg></button>
              <button type="button" class="wk-arrow" data-scroll="1" aria-label="${esc(s.name)} 서가 오른쪽으로"><svg aria-hidden="true" viewBox="0 0 24 24"><path d="M9 6l6 6-6 6" /></svg></button>
            </span>
          </div>
        </div>
      </div>`).join("");

    const peek = (row, p) => {
      $("[data-peek]", row).innerHTML = `<img src="${esc(p.thumb)}" alt="" loading="lazy" />
        <span class="en shelf-row__call">${esc(p._call)} · ${esc(p._year)}</span>
        <span class="shelf-row__title">${esc(p.title)}</span>`;
      $$(".wk-spine", row).forEach((b) => b.classList.toggle("is-on", b.dataset.open === p.id));
    };
    shelves.forEach((s) => {
      const row = document.getElementById(s.id);
      peek(row, s.books[0]);
      const on = (e) => { const b = e.target.closest(".wk-spine"); if (b) peek(row, s.books.find((p) => p.id === b.dataset.open)); };
      row.addEventListener("mouseover", on);
      row.addEventListener("focusin", on);
      row.addEventListener("click", (e) => {
        const a = e.target.closest("[data-scroll]");
        if (a) $("[data-track]", row).scrollBy({ left: 480 * a.dataset.scroll, behavior: "smooth" });
      });
      // 넘칠 때만 화살표
      const track = $("[data-track]", row);
      const arrows = () => { $(".shelf-row__arrows", row).hidden = track.scrollWidth <= track.clientWidth + 4; };
      arrows(); window.addEventListener("resize", arrows);
    });
  }

  /* ---------- 4. 목록으로 보기 ---------- */
  const Q = { q: "", cat: "all", year: "all" };
  function buildList(books, shelves) {
    const chips = (box, items, key) => {
      box.innerHTML = items.map(([v, label]) => `<button type="button" class="wk-chip" data-v="${esc(v)}" aria-pressed="${Q[key] === v}">${esc(label)}</button>`).join("");
      box.addEventListener("click", (e) => {
        const b = e.target.closest("button[data-v]"); if (!b) return;
        Q[key] = b.dataset.v;
        $$("button", box).forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
        drawRows(books);
      });
    };
    chips($("#catFilter"), [["all", "All"], ...shelves.map((s) => [s.name, s.name])], "cat");
    const years = [...new Set(books.map((p) => p._year))].sort((a, b) => b - a);
    chips($("#yearFilter"), [["all", "All"], ...years.map((y) => [y, y])], "year");
    $("#wkQuery").addEventListener("input", (e) => { Q.q = e.target.value; drawRows(books); });
    drawRows(books);
  }
  function drawRows(books) {
    const q = Q.q.trim().toLowerCase();
    const rows = books.filter((p) => {
      if (Q.cat !== "all" && p.categoryLabel !== Q.cat) return false;
      if (Q.year !== "all" && p._year !== Q.year) return false;
      if (q && [p.title, p.categoryLabel, p.role, p.summary, ...(p.tools || []), ...(p.tags || [])].join(" ").toLowerCase().indexOf(q) < 0) return false;
      return true;
    });
    $("#wkCount").textContent = rows.length;
    $("#wkEmpty").hidden = rows.length > 0;
    $("#wkRows").innerHTML = rows.map((p) => `
      <div class="wk-tr">
        <span class="en wk-call">${esc(p._call)}</span>
        <span><span class="wk-tt">${esc(p.title)}</span>${p.summary ? `<span class="wk-sum">${esc(p.summary)}</span>` : ""}</span>
        <span class="wk-cat">${esc(p.categoryLabel)}</span>
        <span class="en wk-yr">${esc(p._year)}</span>
        <span class="wk-role">${esc(p.role)}</span>
        <button type="button" class="wk-go" data-open="${esc(p.id)}">펼쳐보기<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M4 12h16M14 6l6 6-6 6" /></svg></button>
      </div>`).join("");
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
        ${(s.scenes || []).some((x) => x.key) ? `<p class="cs-hint">파란 테두리 = 연출 포인트 장면</p>` : ""}`;
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

  /* ---------- 6. 상세 창 ---------- */
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


  /* ---------- 7. 시작 ---------- */
  function init() {
    const { books, shelves, feat } = prepare(window.PROJECTS || []);
    $("#wkTotal").textContent = books.length;
    const y = $("#year"); if (y) y.textContent = new Date().getFullYear();

    buildFeat(feat);
    buildShelves(shelves);
    buildList(books, shelves);
    if (!books.length) $("#wkEmpty").textContent = "아직 등록된 책이 없어요.";

    // 서가 ↔ 목록
    const toggle = $("#viewToggle");
    toggle.addEventListener("click", (e) => {
      const b = e.target.closest("button[data-view]"); if (!b) return;
      $$("button", toggle).forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
      $("#shelfView").hidden = b.dataset.view !== "shelf";
      $("#listView").hidden = b.dataset.view !== "list";
      if (b.dataset.view === "shelf") sizeFeat();
    });

    // 스크롤 · 크기 변화
    let raf = 0;
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; if (F.sticky) scrollFeat(); }); };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", () => { if (F.sticky) sizeFeat(); });

    // 상세 창
    document.addEventListener("click", (e) => {
      const b = e.target.closest("[data-open]");
      if (b) openModal(b.dataset.open);
    });
    if (modal) {
      $$("[data-close]", modal).forEach((el) => el.addEventListener("click", closeModal));
      document.addEventListener("keydown", (e) => { if (e.key === "Escape" && modal.classList.contains("is-open")) closeModal(); });
    }
    // works.html#프로젝트id 로 들어오면 그 작업을 바로 열어요
    if (location.hash) {
      const id = decodeURIComponent(location.hash.slice(1));
      if (books.some((p) => p.id === id)) openModal(id);
    }
  }

  (window.PROJECTS_READY || Promise.resolve()).then(() => {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
  });
})();
