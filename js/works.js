/* =========================================
   works.html 전용: 프로젝트 서가
   - 추천 도서(featured, 없으면 최신 6권) → 분류별 서가(category) → 목록 보기(검색·분류·연도)
   - 책을 누르면 그 자리에서 책이 펼쳐져요 (DB projects.detail 의 장들로 페이지를 자동으로 나눠요)
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
  const INK = "#222D35";
  const SPINE_COLORS = [["#203D50", "#FFFFFF"], ["#FDFDFB", INK], ["#1B7E8E", "#FFFFFF"], ["#BCE9E3", INK], ["#222D35", "#FFFFFF"],
    ["#FFFFFF", INK], ["#637680", "#FFFFFF"], ["#DBE5E9", INK], ["#182F3E", "#FFFFFF"], ["#B9C8CE", INK]];
  const W = { books: [] };
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
      <p class="eb eb--main">${esc(p.categoryLabel)}</p>
      <h3 class="feat__title">${esc(p.title)}</h3>
      ${p.summary ? `<p class="feat__line">${esc(p.summary)}</p>` : ""}
      <div class="feat__rows">${rows.map(([k, v]) => `<div class="wk-row"><span class="wk-k">${k}</span><span>${v}</span></div>`).join("")}</div>
      <button type="button" class="lib-btn lib-btn--main feat__open" data-open="${esc(p.id)}">책 펼쳐보기
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
                style="width:${p._w}px;height:${p._h}px;background:${p._col};color:${p._ink};${p._ink === INK ? "border-color:#DBE5E9;" : ""}">
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

  /* ---------- 5. 책 펼치기 팝업 : 프로젝트 내용 → 페이지 블록 ----------
     DB projects.detail = { sections: [ { type, label, title, body:[문단], ... } ] }
     type: text · target · cards · cast · scenario · mockup · gallery · palette · process · notes
     detail 이 비어 있으면 description · problem · action · did 로 장을 만들어요. */
  const HEX = /^#[0-9a-f]{3,8}$/i;
  const paras = (b) => (Array.isArray(b) ? b : b ? [b] : []).filter(Boolean).map((t) => `<p class="pg-p">${esc(t)}</p>`);
  const slot = (src, alt, label, h) => (src
    ? `<img class="pj-img" src="${esc(src)}" alt="${esc(alt || "")}" style="height:${h}px" />`
    : `<div class="pj-slot" style="height:${h}px" aria-hidden="true">${esc(label || "")}</div>`);

  const SECTION = {
    text: (s) => paras(s.body),
    target: (s) => {
      const pc = s.persona || {};
      const out = paras(s.body);
      if (pc.name) {
        out.push(`<div class="pj-persona">
          ${pc.kicker ? `<span class="wk-k">${esc(pc.kicker)}</span>` : ""}
          <b>${esc(pc.name)}</b>
          ${pc.desc ? `<span class="sm">${esc(pc.desc)}</span>` : ""}
          ${(pc.chips || []).length ? `<span class="pj-chips">${pc.chips.map((c) => `<i>${esc(c)}</i>`).join("")}</span>` : ""}
          ${pc.note ? `<span class="sm">${esc(pc.note)}</span>` : ""}
        </div>`);
      }
      (s.decisions || []).forEach(([a, b], i) => out.push(`${i === 0 ? '<p class="wk-k pj-sub">WHY → HOW</p>' : ""}<div class="pj-dec"><span>${esc(a)}</span><span aria-hidden="true">→</span><span>${esc(b)}</span></div>`));
      return out;
    },
    cards: (s) => paras(s.body).concat((s.items || []).map((it) => `<div class="row"><span class="d">${esc(it.kicker || "")}</span><span>${esc(it.title)}${it.desc ? `<span class="sm">${esc(it.desc)}</span>` : ""}</span></div>`)),
    notes: (s) => paras(s.body).concat((s.items || []).map((it) => `<div class="pj-note"><b>${esc(it.title)}</b><span class="sm">${esc(it.desc || "")}</span></div>`)),
    cast: (s) => paras(s.body).concat((s.items || []).map((it) => `<div class="pj-cast">
        <i style="background:${HEX.test(it.color) ? it.color : "var(--rule)"}" aria-hidden="true"></i>
        <span><b>${esc(it.name)}</b>${it.sound ? ` <span class="pj-sound">${esc(it.sound)}</span>` : ""}<span class="sm">${esc([it.note, it.color].filter(Boolean).join(" · "))}</span></span>
      </div>`)),
    scenario: (s) => {
      const out = paras(s.body);
      const arc = s.arc || [];
      if (arc.length) out.push(`<div class="pj-arc" style="grid-template-columns:${arc.map((a) => `${Number(a.span) || 1}fr`).join(" ")}">${arc.map((a) => `<span${a.key ? ' class="is-key"' : ""}>${esc(a.label)}</span>`).join("")}</div>`);
      (s.scenes || []).forEach((sc, i) => out.push(`<div class="row pj-scene${sc.key ? " is-key" : ""}"><span class="d">${pad(i + 1, 2)}</span><span>${esc(sc.title)}${sc.desc ? `<span class="sm">${esc(sc.desc)}</span>` : ""}</span></div>`));
      if ((s.scenes || []).some((x) => x.key)) out.push(`<p class="pj-hint">청록 표시 = 연출 포인트 장면</p>`);
      return out;
    },
    mockup: (s, p) => [`${slot(s.image || p.image, s.caption || p.title, "[목업]", 300)}${s.caption ? `<p class="pj-cap">${esc(s.caption)}</p>` : ""}`],
    gallery: (s) => (s.items || []).map((it, i) => `${slot(it.image, it.title, it.title, 170)}<p class="pj-cap"><span>${pad(i + 1, 2)}</span>${esc(it.title)}</p>${it.desc ? `<p class="sm pj-capd">${esc(it.desc)}</p>` : ""}`),
    palette: (s) => {
      const out = paras(s.body);
      const cols = (s.colors || []).filter((c) => HEX.test(c.hex));
      for (let i = 0; i < cols.length; i += 4) {
        out.push(`${i === 0 ? '<p class="wk-k pj-sub">COLOR PALETTE</p>' : ""}<div class="pj-pal">${cols.slice(i, i + 4).map((c) => `<span><i style="background:${c.hex}" aria-hidden="true"></i><b class="en">${esc(c.hex.toUpperCase())}</b><span class="sm">${esc(c.name)}</span></span>`).join("")}</div>`);
      }
      (s.fonts || []).forEach((f, i) => out.push(`${i === 0 ? '<p class="wk-k pj-sub">TYPOGRAPHY</p>' : ""}<div class="row pj-font"><span class="${f.style === "display" ? "pj-font--big" : "pj-font--body"}">${esc(f.sample).replace(/\n/g, "<br />")}</span><span class="sm">${esc(f.note || "")}</span></div>`));
      return out;
    },
    process: (s) => paras(s.body)
      .concat((s.steps || []).map((st, i) => `<div class="row"><span class="d">STEP ${pad(i + 1, 2)}</span><span>${esc(st.title)}${st.desc ? `<span class="sm">${esc(st.desc)}</span>` : ""}</span></div>`))
      .concat(s.note ? [`<p class="pj-hint">${esc(s.note)}</p>`] : []),
  };

  function chaptersOf(p) {
    let secs = ((p.detail && p.detail.sections) || []).filter((s) => SECTION[s.type]);
    if (!secs.length) {
      secs = [
        { type: "text", label: "Overview", title: p.summary && p.desc ? p.summary : "", body: [p.desc || p.summary] },
        { type: "text", label: "Problem", title: "", body: [p.problem] },
        { type: "text", label: "Approach", title: "", body: [p.action] },
        { type: "process", label: "What I did", title: "맡은 일", steps: (p.did || []).map((d) => ({ title: d })) },
      ].filter((s) => (s.body || []).some(Boolean) || (s.steps || []).length);
    }
    return secs.map((s, i) => ({
      no: pad(i + 1, 2), label: String(s.label || s.type).toUpperCase(), title: s.title || "",
      blocks: SECTION[s.type](s, p),
    })).filter((c) => c.blocks.length);
  }
  const pjHead = (c) => `<p class="eb eb--main">${c.no} — ${esc(c.label)}</p>${c.title ? `<h3 class="pj-ch">${esc(c.title)}</h3>` : ""}<div class="rule rule--ink"></div>`;
  const pjCont = (c) => `<p class="eb">${c.no} — ${esc(c.label)} <span class="pg-cont">(이어서)</span></p><div class="rule rule--ink rule--top"></div>`;

  /* 1쪽: 정보 + 책 주머니 속 대출카드 (기간 · 맡은 역할 · 구분) */
  function infoHTML(p) {
    const solo = !p.team || /개인|solo/i.test(p.team);
    const period = p.period || fmtDate(p.date);
    return `<p class="eb eb--main">${esc(p.categoryLabel)}</p>
      <h2 class="pj-title${p.title.length > 14 ? " is-long" : ""}">${esc(p.title)}</h2>
      ${p.summary ? `<p class="pj-lead">${esc(p.summary)}</p>` : ""}
      <div class="pj-meta">
        <span><span class="wk-k">PERIOD</span> ${esc(period)}</span>
        ${(p.tools || []).length ? `<span><span class="wk-k">TOOLS</span> ${esc(p.tools.join(", "))}</span>` : ""}
      </div>
      <div class="pocket">
        <p class="en pocket__label">BOOK POCKET — PARK. LIBRARY</p>
        <div class="loan" role="table" aria-label="대출카드 — 기간과 맡은 역할">
          <div class="loan__head"><span><span class="en">BORROWER’S CARD</span><span class="loan__ko">대출카드</span></span><span class="en loan__call">${esc(p._call)}</span></div>
          <div class="loan__row loan__row--head" role="row"><span role="columnheader" class="wk-k">PERIOD</span><span role="columnheader" class="wk-k">MEMBER</span><span role="columnheader" class="wk-k">ROLE</span></div>
          <div class="loan__row is-me" role="row"><span role="cell" class="en">${esc(period)}</span><span role="cell">본인${p.team && !solo ? ` · ${esc(p.team)}` : ""}</span><span role="cell">${esc(p.role || "—")}</span></div>
          <div class="loan__foot">
            <span>${esc([kindLabel(p), p.client].filter(Boolean).join(" · "))}</span>
            <span class="loan__stamp" aria-hidden="true"><span class="en">${solo ? "PERSONAL" : "TEAM"}</span><b class="en">${solo ? "SOLO" : esc(p.team).slice(0, 6)}</b><span class="en">${esc(p._year)}</span></span>
          </div>
        </div>
      </div>`;
  }
  function visualHTML(p) {
    return `<img class="pj-full" src="${esc(p.image)}" alt="${esc(p.title)}" />
      <div class="pj-full__cap"><p class="en">MAIN VISUAL — ${esc(p.title.toUpperCase())}</p></div>`;
  }
  function resultHTML(p, next, no) {
    const res = [p.result ? `<p class="pj-num"><b class="en">${esc(p.result.value)}</b><span>${esc(p.result.label)}</span></p>` : "", ...paras(p.resultText)].join("");
    return `<p class="eb eb--main">${no} — RESULT</p><h3 class="pj-ch">결과</h3><div class="rule rule--ink"></div>
      ${res || `<p class="pg-p pj-dim">결과 정리를 준비하고 있어요.</p>`}
      ${(p.tags || []).length ? `<div class="tags">${p.tags.map((t) => `<span class="tag">${esc(t)}</span>`).join("")}</div>` : ""}
      ${next ? `<div class="pj-next">
          <p class="eb">NEXT VOLUME</p>
          <div><img src="${esc(next.thumb)}" alt="" /><span><span class="en pj-next__call">${esc(next._call)}</span><span class="pj-next__t">${esc(next.title)}</span>${next.summary ? `<span class="sm">${esc(next.summary)}</span>` : ""}</span></div>
        </div>` : ""}
      <div class="ct-btns">
        ${next ? `<button type="button" class="lib-btn lib-btn--main lib-btn--sm" data-open="${esc(next.id)}">다음 책 펼치기<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M4 12h16M14 6l6 6-6 6" /></svg></button>` : ""}
        ${p.link ? `<a class="lib-btn lib-btn--ink lib-btn--sm" href="${esc(p.link)}" target="_blank" rel="noopener">작품 보러 가기 ↗</a>` : ""}
        <button type="button" class="lib-btn lib-btn--sm" data-pop-close>서가로 돌아가기</button>
      </div>`;
  }

  /* ---------- 6. 책 펼치기 팝업 : 조립 · 스크롤로 넘기기 ---------- */
  const P = { open: false, p: null, L: 0, starts: [], U: 1, leaves: [], tabs: [], pages: 0, last: null, u: -1 };
  const STEP = 1.6;
  const mqFlatBook = window.matchMedia("(max-width: 899px), (max-height: 559px), (prefers-reduced-motion: reduce)");
  const pvh = () => Math.min(window.innerHeight, 1100);
  const popRange = () => P.U * pvh() * 0.7;

  function paginateInto(book, chapters) {
    const meas = document.createElement("div");
    meas.className = "page page--measure";
    meas.setAttribute("aria-hidden", "true");
    book.appendChild(meas);
    const fits = (parts) => { meas.innerHTML = `<div class="page__body">${parts.join("")}</div>`; const b = meas.firstChild; return b.scrollHeight <= b.clientHeight + 1; };
    const pages = [];
    chapters.forEach((c) => {
      let parts = [pjHead(c)];
      c.blocks.forEach((blk) => {
        const next = parts.concat(blk);
        if (parts.length === 1 || fits(next)) { parts = next; return; }
        pages.push({ c, html: parts.join("") });
        parts = [pjCont(c), blk];
      });
      pages.push({ c, html: parts.join("") });
    });
    meas.remove();
    return pages;
  }
  const pgHTML = (html, side, label, no) => `<div class="page__rh">${side === "r" ? `<span>${esc(label)}</span><span>${no}</span>` : `<span>${no}</span><span>${esc(label)}</span>`}</div><div class="page__body">${html}</div><span class="page__pn page__pn--${side}">${no}</span>`;

  function buildPopBook(p, next) {
    const book = $("#popBook");
    book.innerHTML = "";
    const chapters = chaptersOf(p);
    const C = paginateInto(book, chapters);
    if (C.length % 2 === 0) C.push({ c: null, html: `<p class="eb">NOTES</p><div class="pg-lines" aria-hidden="true"></div>` });
    const L = (C.length + 1) / 2;
    const resNo = pad(chapters.length + 1, 2);
    const total = C.length + 3;
    const label = (pg) => (pg.c ? pg.c.label : "NOTES");
    const leaves = [];
    for (let k = 0; k < L; k++) {
      const front = k === 0
        ? `<div class="page pr pj-vis">${visualHTML(p)}<span class="page__pn page__pn--r pj-light">2</span></div>`
        : `<div class="page pr">${pgHTML(C[2 * k - 1].html, "r", label(C[2 * k - 1]), 2 * k + 2)}</div>`;
      const back = `<div class="page pl">${pgHTML(C[2 * k].html, "l", label(C[2 * k]), 2 * k + 3)}`;
      leaves.push(`<div class="leaf" data-i="${k}">
          <div class="face face--front">${front}</div>
          <div class="face face--back">${back}<div class="shade shade--b" aria-hidden="true"></div></div></div>
          <div class="face shade shade--f" aria-hidden="true"></div>
        </div>`);
    }
    // 장마다 처음 보이는 펼침면 (-1 = 첫 펼침면: 1쪽 정보 · 2쪽 메인 비주얼)
    const spreadOf = (i) => (i % 2 === 0 ? i / 2 : (i - 1) / 2);
    // 장이 많으면 색인 탭에는 번호만 (전체 이름은 마우스를 올리면 보여요)
    const tabs = [{ label: "INFO", short: "INFO", spread: -1 }]
      .concat(chapters.map((c) => ({ label: c.label, short: c.no, spread: spreadOf(C.findIndex((pg) => pg.c === c)) })))
      .concat([{ label: "RESULT", short: "END", spread: L - 1 }]);
    book.innerHTML = `
      <div class="book__board" aria-hidden="true"></div>
      <div class="page pl book__base-l">${pgHTML(infoHTML(p), "l", "PROJECT", 1)}</div>
      <div class="page pr book__base-r">${pgHTML(resultHTML(p, next, resNo), "r", "RESULT", total)}</div>
      ${leaves.reverse().join("")}
      <nav class="book__tabs${tabs.length > 7 ? " is-short" : ""}" aria-label="색인 탭">${tabs.map((t, i) => `<button type="button" data-tab="${i}" aria-label="${esc(t.label)}" title="${esc(t.label)}"><span>${esc(tabs.length > 7 ? t.short : t.label)}</span></button>`).join("")}</nav>`;
    Object.assign(P, {
      L, starts: Array.from({ length: L }, (_, i) => 0.6 + STEP * i), pages: total, u: -1,
      leaves: $$(".leaf", book).sort((a, b) => a.dataset.i - b.dataset.i).map((el) => ({ el, sf: $(".shade--f", el), sb: $(".shade--b", el) })),
      tabs: tabs.map((t, i) => Object.assign({ el: $(`[data-tab="${i}"]`, book) }, t)),
    });
    P.U = P.starts[L - 1] + 1.6;
  }

  function buildPopFlat(p, next) {
    const chapters = chaptersOf(p);
    $("#popFlat").innerHTML = `
      <article class="fpage">${infoHTML(p)}</article>
      <figure class="fpage fpage--img"><img src="${esc(p.image)}" alt="${esc(p.title)}" /></figure>
      ${chapters.map((c) => `<article class="fpage">${pjHead(c)}${c.blocks.join("")}</article>`).join("")}
      <article class="fpage">${resultHTML(p, next, pad(chapters.length + 1, 2))}</article>`;
  }

  function paintPop() {
    if (!P.open || P.flat) return;
    const vh = pvh(), vw = window.innerWidth;
    const pop = $("#pop");
    const u = Math.round(c01(pop.scrollTop / popRange()) * P.U * 1000) / 1000;
    if (u === P.u && vw === P.vw && vh === P.vh) return;
    P.u = u; P.vw = vw; P.vh = vh;
    const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
    const ang = P.starts.map((st) => -180 * ease(c01(u - st)));
    const flipped = ang.filter((a) => a < -90).length;
    const k = Math.max(0.4, Math.min(1.3, (vw - 200) / 1004, (vh - 64 - 100) / 660));
    $("#popBookPos").style.transform = `translate(-50%, -50%) scale(${k.toFixed(4)})`;
    P.leaves.forEach((lf, i) => {
      const a = ang[i];
      lf.el.style.transform = `perspective(2600px) rotateY(${a.toFixed(2)}deg)`;
      lf.el.style.zIndex = a < -90 ? 10 + i : 10 + (P.L - i);
      const o = Math.sin(Math.abs(a) * Math.PI / 180) * 0.28;
      lf.sf.style.background = `linear-gradient(90deg, rgba(0,0,0,${o.toFixed(3)}), rgba(0,0,0,${(o * 0.2).toFixed(3)}))`;
      lf.sb.style.background = `linear-gradient(270deg, rgba(0,0,0,${o.toFixed(3)}), rgba(0,0,0,${(o * 0.2).toFixed(3)}))`;
    });
    const cur = flipped - 1;
    let active = 0;
    P.tabs.forEach((t, i) => { if (t.spread <= cur) active = i; });
    P.tabs.forEach((t, i) => { t.el.classList.toggle("is-on", i === active); if (i === active) t.el.setAttribute("aria-current", "true"); else t.el.removeAttribute("aria-current"); });
    const a = flipped === 0 ? 1 : 2 * flipped + 1;
    $("#popPage").textContent = `p. ${a} – ${a + 1} / ${P.pages}`;
    $("#popProg").style.width = `${Math.round(c01(u / (P.U - 0.4)) * 100)}%`;
    $("#popHint").textContent = flipped < P.L ? "스크롤하면 다음 장으로 넘어가요" : "마지막 장이에요";
  }
  function popJump(spread) {
    const u = spread < 0 ? 0.2 : Math.min(P.U, P.starts[spread] + 1.3);
    $("#pop").scrollTo({ top: (u / P.U) * popRange() + 2, behavior: "smooth" });
  }

  let lastFocused = null;
  function openBook(id) {
    const books = W.books;
    const i = books.findIndex((x) => x.id === id);
    if (i < 0) return;
    const p = books[i];
    const next = books.length > 1 ? books[(i + 1) % books.length] : null;
    if (!P.open) lastFocused = document.activeElement;
    P.open = true; P.p = p;
    P.flat = mqFlatBook.matches;
    const pop = $("#pop");
    pop.hidden = false;
    pop.classList.toggle("is-flat", P.flat);
    document.body.classList.add("is-locked");
    $("#popCall").textContent = p._call;
    $("#popTitle").textContent = p.title;
    if (P.flat) {
      $("#popWrap").hidden = true;
      $("#popFlat").hidden = false;
      buildPopFlat(p, next);
    } else {
      $("#popWrap").hidden = false;
      $("#popFlat").hidden = true;
      buildPopBook(p, next);
      $("#popWrap").style.height = `${Math.round(popRange() + pvh())}px`;
    }
    pop.scrollTop = 0;
    paintPop();
    $("#popClose").focus({ preventScroll: true });
    if (history.replaceState) history.replaceState(null, "", `#${encodeURIComponent(p.id)}`);
  }
  function closeBook() {
    if (!P.open) return;
    P.open = false;
    $("#pop").hidden = true;
    document.body.classList.remove("is-locked");
    if (history.replaceState) history.replaceState(null, "", location.pathname + location.search);
    if (lastFocused && lastFocused.focus) lastFocused.focus({ preventScroll: true });
  }

  function initPop() {
    const pop = $("#pop");
    let raf = 0;
    pop.addEventListener("scroll", () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; paintPop(); }); }, { passive: true });
    pop.addEventListener("click", (e) => {
      const tab = e.target.closest("[data-tab]");
      if (tab) { popJump(P.tabs[+tab.dataset.tab].spread); return; }
      if (e.target.closest("[data-pop-close]") || e.target.closest("#popClose")) { closeBook(); return; }
      // 책 바깥(어두운 바탕)을 누르면 닫기
      if (!e.target.closest(".book, .fpage, .pop__bar, .pop__foot, a, button")) closeBook();
    });
    pop.addEventListener("keydown", (e) => {
      if (e.key === "Escape") { closeBook(); return; }
      if (e.key !== "Tab") return;
      // 팝업 안에서만 Tab 이동
      const f = $$("button, a[href]", pop).filter((el) => el.offsetParent !== null && !el.closest(".leaf.is-away"));
      if (!f.length) return;
      if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
    });
    window.addEventListener("resize", () => {
      if (!P.open) return;
      if (mqFlatBook.matches !== P.flat) { openBook(P.p.id); return; }
      $("#popWrap").style.height = `${Math.round(popRange() + pvh())}px`;
      P.u = -1; paintPop();
    });
  }

  /* ---------- 7. 시작 ---------- */
  function init() {
    const { books, shelves, feat } = prepare(window.PROJECTS || []);
    W.books = books;
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

    // 책 펼치기 팝업
    initPop();
    document.addEventListener("click", (e) => {
      const b = e.target.closest("[data-open]");
      if (b) { e.preventDefault(); openBook(b.dataset.open); }
    });
    // works.html#프로젝트id 로 들어오면 그 책을 바로 펼쳐요
    if (location.hash) {
      const id = decodeURIComponent(location.hash.slice(1));
      if (books.some((p) => p.id === id)) openBook(id);
    }
  }

  (window.PROJECTS_READY || Promise.resolve()).then(() => {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
  });
})();
