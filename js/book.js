/* =========================================
   메인(index.html) 전용: 서가 → 회원카드 → 꺼내서 펼치는 책
   - 이력·스킬은 DB(js/data.js)에서, 이름·소개·연락처는 index.html 의 #bookSource 에서 가져와요.
   - 페이지는 내용 양에 맞춰 자동으로 나눠요. 비어 있는 장(章)은 통째로 빠지고 번호도 다시 매겨져요.
   - PC: 스크롤하면 한 장씩 넘어가요. 휴대폰 · '움직임 줄이기' 설정: 같은 내용을 세로로 쌓아요.
   ========================================= */
(function () {
  "use strict";

  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const c01 = (v) => Math.max(0, Math.min(1, v));
  const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
  const pad2 = (n) => String(n).padStart(2, "0");

  const MAIN = "#1B7E8E";
  const HEADER = 64;
  const PW = 480, PH = 660;          // 한 쪽 크기 (책은 화면에 맞춰 통째로 확대·축소)
  const SPREAD_STEP = 1.7;           // 한 장 넘기는 데 쓰는 스크롤 양 (클수록 천천히)

  const NOW = (() => { const d = new Date(); return `${d.getFullYear()}.${pad2(d.getMonth() + 1)}`; })();
  const latestFirst = (k) => (a, b) => (b[k] || NOW).localeCompare(a[k] || NOW);
  const period = (s, e) => (!s ? "" : !e ? `${s} – 현재` : s === e ? s : `${s} – ${e}`);
  const code = (new URLSearchParams(location.search).get("v") || "").trim();
  const keep = (path) => `${path}${code ? `?v=${encodeURIComponent(code)}` : ""}`;

  /* ---------- 1. 직접 고치는 내용 (index.html #bookSource) ---------- */
  function readSource() {
    const box = $("#bookSource");
    const get = (k) => (box ? box.querySelector(`[data-src="${k}"]`) : null);
    const txt = (k) => ((get(k) || {}).textContent || "").trim();
    const facts = [];
    const dl = get("facts");
    if (dl) $$("dt", dl).forEach((dt) => { const dd = dt.nextElementSibling; facts.push([dt.textContent.trim(), dd ? dd.innerHTML : ""]); });
    const photo = get("photo"), email = get("email"), resume = get("resume");
    return {
      name: txt("name"), nameEn: txt("name-en"), sign: txt("sign") || "Park",
      photo: photo ? photo.getAttribute("src") : "", photoAlt: photo ? photo.getAttribute("alt") || "" : "",
      about: get("about") ? get("about").innerHTML : "",
      facts,
      email: email ? email.textContent.trim() : "", emailHref: email ? email.getAttribute("href") : "",
      lead: get("contact-lead") ? get("contact-lead").innerHTML : "",
      links: get("links") ? $$("a", get("links")).map((a) => ({ label: a.textContent.trim(), href: a.getAttribute("href") })) : [],
      resume: resume ? { label: resume.textContent.trim(), href: resume.getAttribute("href") } : null,
    };
  }

  /* ---------- 2. 장(章) 만들기 : 블록 하나 = 페이지가 나뉠 수 있는 단위 ---------- */
  const row = (d, t, s) => `<div class="row"><span class="d">${esc(d)}</span><span>${esc(t)}${s ? `<span class="sm">${esc(s)}</span>` : ""}</span></div>`;
  const sub = (en, ko) => `<p class="eb pg-sub">${esc(en)}</p><h3 class="pg-h3">${esc(ko)}</h3><div class="rule rule--sm"></div>`;
  // 소제목은 첫 줄과 한 덩어리로 (소제목만 페이지 끝에 홀로 남지 않게)
  const group = (en, ko, rows) => (rows.length ? [sub(en, ko) + rows[0], ...rows.slice(1)] : []);
  const join = (...xs) => xs.filter(Boolean).join(" · ");

  function buildChapters(src, R, role) {
    const chapters = [];
    R = R || {};

    // 01 PROFILE
    const intro = `<div class="pf">
        <div class="pf__photo">${src.photo ? `<img src="${esc(src.photo)}" alt="${esc(src.photoAlt)}" />` : ""}</div>
        <div class="pf__text">
          <p class="pf__name">${esc(src.name)}</p>
          <p class="en pf__role">${esc(role.eyebrow || src.nameEn)}</p>
        </div>
      </div>`;
    const about = [];
    const tmp = document.createElement("div");
    tmp.innerHTML = src.about;
    $$("p", tmp).forEach((p) => about.push(`<p class="pg-p">${p.innerHTML}</p>`));
    const facts = src.facts.map(([k, v], i) => `${i === 0 ? '<div class="rule rule--ink"></div>' : ""}<div class="row"><span class="sm">${esc(k)}</span><span>${v}</span></div>`);
    chapters.push({ id: "profile", en: "PROFILE", ko: "저자 소개", eyebrow: "ABOUT THE AUTHOR", blocks: [intro, ...about, ...facts] });

    // 02 BACKGROUND : 학력 · 경력 · 교육
    const edu = [...(R.education || [])].sort(latestFirst("start")).map((e) => row(e.end || e.start, e.school, join(e.major, e.status)));
    const exp = [...(R.experience || [])].sort(latestFirst("start")).map((x) => row(period(x.start, x.end), x.company, join(x.role, x.desc)));
    const tr = [...(R.training || [])].sort(latestFirst("start")).map((x) => row(period(x.start, x.end), x.title, join(x.org, x.desc)));
    const bgNames = [edu.length && "학력", exp.length && "경력", tr.length && "교육"].filter(Boolean);
    const bg = [...group("EDUCATION", "학력", edu), ...group("CAREER", "경력", exp), ...group("TRAINING", "교육 · 수료", tr)];
    if (bg.length) chapters.push({ id: "background", en: "BACKGROUND", ko: bgNames.join(" · "), blocks: bg });

    // 03 ACTIVITIES : 대외 · 교내
    const act = (a) => `<div class="act">
        <div class="act__top"><span class="act__t">${esc(a.title)}</span><span class="d">${esc(period(a.start, a.end))}</span></div>
        ${a.org ? `<span class="sm">${esc(a.org)}</span>` : ""}
        ${a.role ? `<span class="act__role">${esc(a.role)}</span>` : ""}
        ${a.desc ? `<span class="sm">${esc(a.desc)}</span>` : ""}
      </div>`;
    const acts = [...(R.activities || [])].sort(latestFirst("start"));
    const ext = acts.filter((a) => a.type === "external").map(act);
    const cam = acts.filter((a) => a.type === "campus").map(act);
    const actNames = [ext.length && "대외활동", cam.length && "교내활동"].filter(Boolean);
    const actBlocks = [...group("EXTERNAL", "대외활동", ext), ...group("ON CAMPUS", "교내활동", cam)];
    if (actBlocks.length) chapters.push({ id: "activities", en: "ACTIVITIES", ko: actNames.join(" · "), blocks: actBlocks });

    // 04 CREDENTIALS : 수상 · 어학 · 자격증
    const aw = [...(R.awards || [])].sort(latestFirst("date")).map((a) => row(a.date, a.title, join(a.org, a.desc)));
    const lg = [...(R.languages || [])].sort(latestFirst("date")).map((l) => {
      const state = !l.expires ? "평생 유효" : l.expires < NOW ? `만료 · ${l.expires}` : `유효 ~${l.expires}`;
      return row(l.test, l.score, join(`${l.date} 취득`, l.org, state));
    });
    const ce = [...(R.certificates || [])].sort(latestFirst("date")).map((c) => row(c.date, c.name, c.org));
    const crNames = [aw.length && "수상", lg.length && "어학", ce.length && "자격증"].filter(Boolean);
    const cr = [...group("AWARDS", "수상 경력", aw), ...group("LANGUAGE", "어학", lg), ...group("CERTIFICATES", "자격증", ce)];
    if (cr.length) chapters.push({ id: "credentials", en: "CREDENTIALS", ko: crNames.join(" · "), blocks: cr });

    // 05 SKILLS & TOOLS
    const sk = (role.skills || []).filter((g) => g.items.length).map((g) =>
      `<p class="eb pg-sub">${esc(String(g.title).toUpperCase())}</p><div class="tags">${g.items.map(([label]) => `<span class="tag">${esc(label)}</span>`).join("")}</div>`);
    if (sk.length) chapters.push({ id: "skills", en: "SKILLS & TOOLS", ko: "스킬 · 도구", blocks: sk });

    chapters.forEach((ch, i) => { ch.no = pad2(i + 1); });
    return chapters;
  }

  const chHead = (ch) => `<p class="eb eb--main">CHAPTER ${ch.no}${ch.eyebrow ? ` — ${esc(ch.eyebrow)}` : ""}</p>
    <h2 class="ch">${esc(ch.en)}</h2><p class="ck">${esc(ch.ko)}</p><div class="rule rule--ink"></div>`;
  const contHead = (ch) => `<p class="eb">CHAPTER ${ch.no} — ${esc(ch.en)} <span class="pg-cont">(이어서)</span></p><div class="rule rule--ink rule--top"></div>`;

  function contactHTML(src, no) {
    const mail = src.email ? `<div class="ct-mail">
        <div><span class="eb">EMAIL</span><a class="en ct-big" href="${esc(src.emailHref || `mailto:${src.email}`)}">${esc(src.email)}</a></div>
        <button type="button" class="ct-copy" data-copy="${esc(src.email)}">복사</button>
      </div>` : "";
    const links = src.links.map((l) => `<a class="ct-link" href="${esc(l.href)}" target="_blank" rel="noopener"><span class="eb">${esc(l.label.toUpperCase())}</span><span aria-hidden="true">↗</span></a>`).join("");
    return `<p class="eb eb--main">CHAPTER ${no}</p>
      <h2 class="ch">CONTACT</h2><p class="ck">연락처</p><div class="rule rule--ink"></div>
      ${src.lead ? `<p class="pg-p">${src.lead}</p>` : ""}
      ${mail}
      ${links ? `<div class="ct-links">${links}</div>` : ""}
      <div class="ct-btns">
        ${src.resume ? `<a class="lib-btn lib-btn--ink lib-btn--sm" href="${esc(src.resume.href)}" target="_blank" rel="noopener">${esc(src.resume.label)}<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M12 4v12M6 11l6 6 6-6M5 20h14" /></svg></a>` : ""}
        <a class="lib-btn lib-btn--main lib-btn--sm" href="${keep("works.html")}">프로젝트 서가로<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M4 12h16M14 6l6 6-6 6" /></svg></a>
      </div>`;
  }
  const colophon = (src, role) => `<div class="colophon">
      <span>지은이</span><span>${esc(src.name)}</span>
      <span>분야</span><span class="en">${esc(role.label || "Design")} Portfolio</span>
      <span>발행</span><span class="en">${NOW.replace(".", ". ")} · First Edition</span>
    </div>`;

  /* ---------- 3. 쪽 나누기 (PC 책) ---------- */
  function paginate(chapters) {
    const meas = document.createElement("div");
    meas.className = "page page--measure";
    meas.setAttribute("aria-hidden", "true");
    $("#book").appendChild(meas);
    const fits = (parts) => {
      meas.innerHTML = `<div class="page__body">${parts.join("")}</div>`;
      const b = meas.firstChild;
      return b.scrollHeight <= b.clientHeight + 1;
    };
    const pages = [];
    chapters.forEach((ch) => {
      let parts = [chHead(ch)];
      let first = true;
      ch.blocks.forEach((blk) => {
        const next = parts.concat(blk);
        if (parts.length === 1 || fits(next)) { parts = next; return; }
        pages.push({ ch, first, html: parts.join("") });
        first = false;
        parts = [contHead(ch), blk];
      });
      pages.push({ ch, first, html: parts.join("") });
    });
    meas.remove();
    return pages;
  }

  /* ---------- 4. 책 조립 ---------- */
  const S = { mode: "", u: -1, vh: 0, vw: 0, L: 0, U: 1, leaves: [], tabs: [], chapterSpread: [], built: null };

  function coverHTML(src, role) {
    return `<div class="cover">
        <div class="cover__grain" aria-hidden="true"></div>
        <div class="cover__in">
          <p class="en cover__eb">PORTFOLIO — VOL. 01</p>
          <div class="cover__line"></div>
          <h1 class="cover__title">${role.title || esc(src.name)}</h1>
          ${role.desc ? `<p class="cover__desc">${role.desc}</p>` : ""}
          <div class="cover__foot"><span>${esc(src.name)}</span><span class="en">PARK.</span></div>
        </div>
      </div>`;
  }

  function pageHTML(p, side, label) {
    const rh = side === "r" ? `<span>${esc(label)}</span><span>${esc(p.no)}</span>` : `<span>${esc(p.no)}</span><span>${esc(label)}</span>`;
    return `<div class="page__rh">${rh}</div><div class="page__body">${p.html}</div>${p.no ? `<span class="page__pn page__pn--${side}">${esc(p.no)}</span>` : ""}`;
  }

  function buildBook(data) {
    const { src, role, chapters } = data;
    const book = $("#book");
    book.innerHTML = "";
    const pages = paginate(chapters);
    // 마지막 오른쪽 쪽은 연락처. 그 사이 쪽 수가 홀수면 빈 '메모' 쪽을 하나 끼워요.
    if (pages.length % 2 === 1) pages.push({ ch: null, blank: true, html: `<p class="eb">NOTES</p><div class="pg-lines" aria-hidden="true"></div>` });
    pages.forEach((p, i) => { p.no = String(i + 1); });
    const contactNo = pad2(chapters.length + 1);
    const contact = { ch: { id: "contact", en: "CONTACT", no: contactNo }, no: String(pages.length + 1), html: contactHTML(src, contactNo) + colophon(src, role) };

    // 목차 (표지 뒷면)
    const toc = chapters.map((ch) => ({ ch, page: pages.find((p) => p.ch === ch).no })).concat([{ ch: contact.ch, ko: "연락처", page: contact.no }]);
    const tocHTML = `<div class="page__rh"><span>CONTENTS</span><span></span></div><div class="page__body">
        <p class="eb eb--main">CONTENTS</p><h2 class="ch">목차</h2><div class="rule rule--ink"></div>
        ${toc.map((t) => `<button type="button" class="toc" data-go="${t.ch.id}"><span class="en toc__no">${t.ch.no}</span><span class="toc__ko">${esc(t.ko || t.ch.ko)}</span><span class="en toc__en">${esc(t.ch.en)}</span><span class="toc__dots" aria-hidden="true"></span><span class="en">${t.page}</span></button>`).join("")}
        <p class="pg-note">스크롤하면 한 장씩 넘어가요.<br />목차나 오른쪽 색인 탭을 누르면 해당 장으로 바로 이동해요.</p>
      </div>`;

    // 장: 0 = (표지, 목차), k = (pages[2k-2] 앞, pages[2k-1] 뒤)
    const L = 1 + pages.length / 2;
    const label = (p) => (p.ch ? p.ch.en : "NOTES");
    const leaves = [];
    for (let k = 0; k < L; k++) {
      const front = k === 0 ? coverHTML(src, role) : `<div class="page pr">${pageHTML(pages[2 * k - 2], "r", label(pages[2 * k - 2]))}</div>`;
      const back = k === 0 ? `<div class="page pl">${tocHTML}` : `<div class="page pl">${pageHTML(pages[2 * k - 1], "l", label(pages[2 * k - 1]))}`;
      leaves.push(`<div class="leaf" data-i="${k}">
          <div class="face face--front">${front}</div>
          <div class="face face--back">${back}<div class="shade shade--b" aria-hidden="true"></div></div></div>
          <div class="face shade shade--f" aria-hidden="true"></div>
        </div>`);
    }

    // 장(章)마다 처음 보이는 펼침면 번호
    const spreadOf = (i) => (i % 2 === 0 ? i / 2 : (i + 1) / 2); // pages[i]
    const chapterSpread = {};
    chapters.forEach((ch) => { chapterSpread[ch.id] = spreadOf(pages.findIndex((p) => p.ch === ch)); });
    chapterSpread.contact = L - 1;
    chapterSpread.toc = 0;

    const tabs = chapters.map((ch) => ch).concat([contact.ch]);
    book.innerHTML = `
      <div class="book__board" aria-hidden="true"></div>
      <div class="page pl book__base-l" aria-hidden="true"><div class="endpaper"></div></div>
      <div class="page pr book__base-r">${pageHTML(contact, "r", "CONTACT")}</div>
      ${leaves.reverse().join("")}
      <nav class="book__tabs" aria-label="색인 탭">
        ${tabs.map((ch) => `<button type="button" data-go="${ch.id}"><span>${esc(ch.en)}</span></button>`).join("")}
      </nav>`;

    S.L = L;
    S.starts = Array.from({ length: L }, (_, i) => 1 + SPREAD_STEP * i);
    S.U = S.starts[L - 1] + 1.6;
    S.leaves = $$(".leaf", book).sort((a, b) => a.dataset.i - b.dataset.i).map((el) => ({
      el, sf: $(".shade--f", el), sb: $(".shade--b", el),
    }));
    S.tabs = $$(".book__tabs button", book).map((b) => ({ el: b, spread: chapterSpread[b.dataset.go] }));
    S.chapterSpread = chapterSpread;
  }

  /* ---------- 5. 세로 모드 (휴대폰) ---------- */
  function buildFlat(data) {
    const { src, role, chapters } = data;
    const flat = $("#flat");
    const cards = chapters.map((ch) => `<article class="fpage" id="ch-${ch.id}">${chHead(ch)}${ch.blocks.join("")}</article>`);
    cards.push(`<article class="fpage" id="ch-contact">${contactHTML(src, pad2(chapters.length + 1))}${colophon(src, role)}</article>`);
    flat.innerHTML = `<nav class="flat__toc" aria-label="목차">${chapters.concat([{ id: "contact", en: "CONTACT", no: pad2(chapters.length + 1) }])
      .map((ch) => `<a href="#ch-${ch.id}"><span class="en">${ch.no}</span>${esc(ch.en)}</a>`).join("")}</nav>${cards.join("")}`;
  }

  /* ---------- 6. 서가 배경 ---------- */
  function buildShelf() {
    const vw = window.innerWidth, vh = Math.min(window.innerHeight, 1100);
    const flatMode = S.mode === "flat";
    const nRows = flatMode ? 2 : 3;
    const rowH = flatMode ? 170 : Math.round((vh - HEADER - 60) / 3);
    let x = 7;
    const rnd = () => { x = (x * 9301 + 49297) % 233280; return x / 233280; };
    const palette = ["#203D50", "#FFFFFF", "#DBE5E9", "#BCE9E3", "#222D35", "#FDFDFB", "#B9C8CE", "#203D50", "#FFFFFF", "#637680"];
    let html = "";
    for (let r = 0; r < nRows; r++) {
      let spines = "", sx = 0;
      while (sx < vw + 60) {
        const w = 16 + Math.round(rnd() * 26);
        const h = Math.round(rowH * (0.58 + rnd() * 0.3));
        const col = rnd() < 0.07 ? MAIN : palette[Math.floor(rnd() * palette.length)];
        const dark = ["#203D50", "#222D35", "#637680", MAIN].includes(col);
        const lean = rnd() < 0.04 ? "rotate(-6deg)" : "none";
        const bandTop = Math.round(h * (0.12 + rnd() * 0.1)), bandH = 2 + Math.round(rnd() * 8);
        spines += `<span class="spine${dark ? " is-dark" : ""}" style="width:${w}px;height:${h}px;background:${col};transform:${lean}"><i style="top:${bandTop}px;height:${bandH}px"></i></span>`;
        sx += w + 2;
      }
      html += `<div class="shelf__row" style="height:${rowH}px;padding-left:${Math.round(rnd() * 30)}px">${spines}</div>`;
    }
    $("#shelf").innerHTML = html;
  }

  /* ---------- 7. 스크롤에 따라 움직이기 (PC 책) ---------- */
  const range = (vh) => S.U * vh * 0.7;

  function measure() {
    if (S.mode !== "book") return;
    const vh = Math.min(window.innerHeight, 1100), vw = window.innerWidth;
    const r = $("#lib").getBoundingClientRect();
    let u = Math.round(c01(-r.top / range(vh)) * S.U * 1000) / 1000;
    if (u === S.u && vh === S.vh && vw === S.vw) return;
    const sized = vh !== S.vh || vw !== S.vw;
    S.u = u; S.vh = vh; S.vw = vw;
    if (sized) $("#lib").style.height = `${Math.round(range(vh) + vh)}px`;
    paint(u, vh, vw);
  }

  function paint(u, vh, vw) {
    const cu = Math.min(1, u);
    const pull = ease(c01(u));
    const ang = S.starts.map((st) => -180 * ease(c01(u - st)));
    const open = c01(u - 1);
    const flipped = ang.filter((a) => a < -90).length;

    // 서가 · 안내 · 회원카드 · 헤더
    const shelf = $("#shelf");
    shelf.style.transform = `scale(${(1 + pull * 0.06).toFixed(4)})`;
    shelf.style.opacity = (1 - pull * 0.86).toFixed(3);
    shelf.style.filter = `blur(${(pull * 5).toFixed(2)}px)`;
    $("#intro").style.opacity = (1 - c01(u / 0.3)).toFixed(3);
    $("#veil").style.opacity = (0.72 * (1 - ease(c01((cu - 0.1) / 0.7)))).toFixed(3);

    const cardK = Math.max(0.45, Math.min(1, (vw - 40) / 640, (vh - 150) / 380));
    const cardOut = ease(c01(cu));
    const card = $("#cardPos");
    card.style.transform = `translate(-50%, -50%) translateY(${Math.round(cardOut * vh * 0.55)}px) rotate(${(cardOut * -7).toFixed(2)}deg) scale(${(cardK * (1 - cardOut * 0.12)).toFixed(4)})`;
    card.style.opacity = (1 - c01((cu - 0.35) / 0.55)).toFixed(3);
    card.style.visibility = cu >= 0.9 ? "hidden" : "visible";
    $("#header").classList.toggle("is-hidden", cu <= 0.55);

    // 책
    const k = Math.max(0.4, Math.min(1.1, (vw - 64) / 1040, (vh - HEADER - 56) / 690));
    const bookIn = 0.55 + 0.45 * ease(c01(u / 0.8));
    const pos = $("#bookPos");
    pos.style.top = `${Math.round(HEADER + (vh - HEADER) / 2)}px`;
    pos.style.transform = `translate(-50%, -50%) scale(${k.toFixed(4)})`;
    pos.style.opacity = bookIn.toFixed(3);
    pos.style.visibility = u < 0.02 ? "hidden" : "visible";
    pos.style.pointerEvents = bookIn > 0.6 ? "auto" : "none";
    $("#book").style.transform = `translateX(${Math.round(-PW / 2 * (1 - ease(open)))}px) perspective(2400px) rotateY(${(-28 * (1 - bookIn)).toFixed(2)}deg) scale(${(0.86 + 0.14 * bookIn).toFixed(4)})`;
    const board = c01(open * 3).toFixed(3);
    $(".book__board").style.opacity = board;
    $(".book__base-l").style.opacity = board;
    $(".book__base-r").style.visibility = u > 1.02 ? "visible" : "hidden";

    S.leaves.forEach((lf, i) => {
      const a = ang[i];
      lf.el.style.transform = `perspective(2600px) rotateY(${a.toFixed(2)}deg)`;
      lf.el.style.zIndex = a < -90 ? 10 + i : 10 + (S.L - i);
      if (i > 0) lf.el.style.visibility = u > 1.02 ? "visible" : "hidden";
      const o = Math.sin(Math.abs(a) * Math.PI / 180) * 0.28;
      lf.sf.style.background = `linear-gradient(90deg, rgba(0,0,0,${o.toFixed(3)}), rgba(0,0,0,${(o * 0.2).toFixed(3)}))`;
      lf.sb.style.background = `linear-gradient(270deg, rgba(0,0,0,${o.toFixed(3)}), rgba(0,0,0,${(o * 0.2).toFixed(3)}))`;
      // 다 넘어간 쪽 · 아직 안 넘긴 쪽의 버튼은 키보드 이동에서 빼기
      lf.el.classList.toggle("is-flipped", a < -90);
    });

    // 색인 탭 · 진행 막대
    const tabs = $(".book__tabs");
    tabs.style.opacity = c01((u - 1.6) * 2).toFixed(3);
    tabs.style.pointerEvents = u > 1.6 ? "auto" : "none";
    const cur = flipped - 1;
    let active = -1;
    S.tabs.forEach((t, i) => { if (t.spread <= cur) active = i; });
    S.tabs.forEach((t, i) => {
      t.el.classList.toggle("is-on", i === active);
      if (i === active) t.el.setAttribute("aria-current", "true"); else t.el.removeAttribute("aria-current");
    });
    const prog = $("#progress");
    prog.style.opacity = c01(u - 1).toFixed(3);
    prog.firstElementChild.style.width = `${Math.round(c01((u - 1) / (S.U - 1.5)) * 100)}%`;
  }

  function jumpSpread(s) {
    const vh = Math.min(window.innerHeight, 1100);
    const target = Math.min(S.U, (S.starts[s] || 1) + 1.35);
    const top = $("#lib").getBoundingClientRect().top + window.scrollY;
    window.scrollTo({ top: top + (target / S.U) * range(vh) + 2, behavior: "smooth" });
  }
  function go(id) {
    if (S.mode === "book") { jumpSpread(S.chapterSpread[id] ?? 0); return; }
    const el = document.getElementById(`ch-${id}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  /* ---------- 8. 모드 정하기 · 시작 ---------- */
  const mqFlat = window.matchMedia("(max-width: 899px), (max-height: 559px), (prefers-reduced-motion: reduce)");

  function setMode() {
    const mode = mqFlat.matches ? "flat" : "book";
    if (mode === S.mode) return;
    S.mode = mode;
    document.documentElement.classList.toggle("is-flat", mode === "flat");
    $("#flat").hidden = mode !== "flat";
    $("#bookPos").hidden = mode !== "book";
    const lib = $("#lib");
    if (mode === "flat") {
      lib.style.height = "";
      ["#shelf", "#intro", "#veil", "#cardPos", "#progress"].forEach((s) => $(s).removeAttribute("style"));
      $("#header").classList.remove("is-hidden");
      if (!$("#flat").children.length) buildFlat(S.built);
    } else {
      if (!$("#book").children.length) buildBook(S.built);
      S.u = -1; S.vh = 0;
      measure();
    }
    buildShelf();
  }

  function fillCard(src, role) {
    $("#cardName").textContent = src.name;
    $("#cardRole").textContent = role.eyebrow || "";
    $("#cardMail").textContent = src.email;
    $("#cardSign").textContent = src.sign;
    $("#cardPhoto").src = src.photo || "img/profile.svg";
    $("#cardPhoto").alt = src.photoAlt;
    $("#cardIssued").textContent = `발급일 ${NOW.replace(".", ". ")} · 서명`;
    $("#cardCode").textContent = `${NOW.replace(".", " ")} ${(src.nameEn.split(" ")[0] || "PARK").toUpperCase()}`;
  }

  function init() {
    const src = readSource();
    const role = window.ROLE_DATA || { eyebrow: "", title: "", desc: "", skills: [], label: "Design" };
    S.built = { src, role, chapters: buildChapters(src, window.RESUME, role) };
    fillCard(src, role);
    const y = $("#year"); if (y) y.textContent = new Date().getFullYear();

    setMode();
    mqFlat.addEventListener ? mqFlat.addEventListener("change", setMode) : mqFlat.addListener(setMode);

    let raf = 0, lastW = window.innerWidth;
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; measure(); }); };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", () => {
      onScroll();
      if (Math.abs(window.innerWidth - lastW) > 40) { lastW = window.innerWidth; buildShelf(); }
    });

    document.addEventListener("click", (e) => {
      const g = e.target.closest("[data-go]");
      if (g) { go(g.dataset.go); return; }
      const c = e.target.closest("[data-copy]");
      if (c) {
        try { if (navigator.clipboard) navigator.clipboard.writeText(c.dataset.copy); } catch (err) { /* 무시 */ }
        c.textContent = "복사됨 ✓"; c.classList.add("is-done");
        clearTimeout(c._t); c._t = setTimeout(() => { c.textContent = "복사"; c.classList.remove("is-done"); }, 1800);
      }
    });
    $("#goInfo").addEventListener("click", () => go("profile"));
  }

  const ready = window.PROJECTS_READY || Promise.resolve();
  ready.then(() => (document.fonts && document.fonts.ready ? document.fonts.ready : null)).then(init, init);
})();
