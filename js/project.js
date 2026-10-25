/* =========================================
   프로젝트 상세(project.html?id=프로젝트id)
   - 위: 분야 · 제목 · 한 줄 요약 · 역할/기간/구분/도구 · 대표 이미지
   - 가운데: DB projects.detail.sections 를 순서대로 (번호는 자동)
       type: text · target · cards · cast · scenario · mockup · gallery · palette · process · notes
     detail 이 비어 있으면 description · problem · action · did 로 대신 채워요
   - 아래: 결과 · 태그 · 작품 링크 · 이전/다음 프로젝트
   ========================================= */
(function () {
  "use strict";

  const $ = (s, c = document) => c.querySelector(s);
  const esc = window.esc;
  const pad2 = (n) => String(n).padStart(2, "0");
  const fmtDate = (d) => (d || "").replace("-", ".");
  const HEX = /^#[0-9a-f]{3,8}$/i;
  const KINDS = { personal: "개인 프로젝트", team: "팀 프로젝트", contest: "공모전", school: "학교 과제", client: "외주" };
  const kindLabel = (p) => KINDS[p.type] || (p.client ? "외주" : "개인 프로젝트");

  const paras = (b) => (Array.isArray(b) ? b : b ? [b] : []).filter(Boolean).map((t) => `<p>${esc(t)}</p>`).join("");
  const img = (src, alt) => (src ? `<img src="${esc(src)}" alt="${esc(alt || "")}" loading="lazy" />` : "");

  /* 섹션 종류별 모양 */
  const SECTION = {
    text: (s) => paras(s.body),
    target: (s) => {
      const pc = s.persona || {};
      const persona = pc.name ? `<div class="persona">
          ${pc.kicker ? `<span class="persona__k">${esc(pc.kicker)}</span>` : ""}
          <strong>${esc(pc.name)}</strong>
          ${pc.desc ? `<p>${esc(pc.desc)}</p>` : ""}
          ${(pc.chips || []).length ? `<ul class="chips">${pc.chips.map((c) => `<li class="chip">${esc(c)}</li>`).join("")}</ul>` : ""}
          ${pc.note ? `<span class="persona__note">${esc(pc.note)}</span>` : ""}
        </div>` : "";
      const dec = (s.decisions || []).length ? `<table class="dtable">
          <thead><tr><th scope="col">발견한 특성</th><th scope="col">그래서 이렇게 설계</th></tr></thead>
          <tbody>${s.decisions.map(([a, b]) => `<tr><td>${esc(a)}</td><td>${esc(b)}</td></tr>`).join("")}</tbody>
        </table>` : "";
      return paras(s.body) + persona + dec;
    },
    cards: (s) => `${paras(s.body)}<ul class="minis">${(s.items || []).map((it) => `
      <li>${it.kicker ? `<span class="minis__k">${esc(it.kicker)}</span>` : ""}<strong>${esc(it.title)}</strong>${it.desc ? `<p>${esc(it.desc)}</p>` : ""}</li>`).join("")}</ul>`,
    notes: (s) => `${paras(s.body)}<ul class="minis minis--2">${(s.items || []).map((it) => `
      <li><strong>${esc(it.title)}</strong>${it.desc ? `<p>${esc(it.desc)}</p>` : ""}</li>`).join("")}</ul>`,
    cast: (s) => `${paras(s.body)}<ul class="cast">${(s.items || []).map((it) => `
      <li><i style="background:${HEX.test(it.color) ? it.color : "var(--line)"}" aria-hidden="true"></i>
        <span><strong>${esc(it.name)}</strong>${it.sound ? ` <em>${esc(it.sound)}</em>` : ""}
        <small>${esc([it.note, it.color].filter(Boolean).join(" · "))}</small></span></li>`).join("")}</ul>`,
    scenario: (s) => {
      const arc = s.arc || [];
      const scenes = s.scenes || [];
      return `${paras(s.body)}
        ${arc.length ? `<div class="arc" style="grid-template-columns:${arc.map((a) => `${Number(a.span) || 1}fr`).join(" ")}">${arc.map((a) => `<span${a.key ? ' class="is-key"' : ""}>${esc(a.label)}</span>`).join("")}</div>` : ""}
        <ol class="scenes">${scenes.map((sc, i) => `<li${sc.key ? ' class="is-key"' : ""}>
          ${sc.image ? img(sc.image, sc.title) : ""}<span class="scenes__no">${pad2(i + 1)}</span><strong>${esc(sc.title)}</strong>${sc.desc ? `<span>${esc(sc.desc)}</span>` : ""}</li>`).join("")}</ol>
        ${scenes.some((x) => x.key) ? `<p class="hint">색 테두리 = 연출 포인트 장면</p>` : ""}`;
    },
    // 목업: 전용 이미지가 없으면 표지를 또 보여주지 않고 '준비 중' 자리만
    mockup: (s, p) => (s.image
      ? `<figure class="fig fig--mockup">${img(s.image, s.caption || p.title)}</figure>`
      : `<figure class="fig is-empty"><span class="fig__ph fig__ph--wide"><span>목업 이미지 준비 중</span></span></figure>`),
    gallery: (s) => `<div class="gallery">${(s.items || []).map((it) => `
      <figure class="fig${it.image ? "" : " is-empty"}">${it.image ? img(it.image, it.title) : `<span class="fig__ph"><span>이미지 준비 중</span></span>`}
        <figcaption><strong>${esc(it.title)}</strong>${it.desc ? ` ${esc(it.desc)}` : ""}</figcaption></figure>`).join("")}</div>`,
    palette: (s) => `${paras(s.body)}
      ${(s.fonts || []).length ? `<h3 class="psub">컬러</h3>` : ""}
      <ul class="swatches">${(s.colors || []).filter((c) => HEX.test(c.hex)).map((c) => `
        <li><i style="background:${c.hex}" aria-hidden="true"></i><strong>${esc(c.name)}</strong><code>${esc(c.hex.toUpperCase())}</code></li>`).join("")}</ul>
      ${(s.fonts || []).length ? `<h3 class="psub">서체</h3><ul class="fonts">${s.fonts.map((f) => `
        <li><span class="fonts__sample${f.style === "display" ? " is-display" : ""}">${esc(f.sample).replace(/\n/g, "<br />")}</span><small>${esc(f.note || "")}</small></li>`).join("")}</ul>` : ""}`,
    process: (s) => `${paras(s.body)}
      <ol class="steps">${(s.steps || []).map((st, i) => `<li><span class="steps__no">${pad2(i + 1)}</span><strong>${esc(st.title)}</strong>${st.desc ? `<span>${esc(st.desc)}</span>` : ""}</li>`).join("")}</ol>
      ${s.note ? `<p class="note-box">${esc(s.note)}</p>` : ""}`,
  };

  function sectionsOf(p) {
    let secs = ((p.detail && p.detail.sections) || []).filter((s) => SECTION[s.type]);
    if (!secs.length) {
      secs = [
        { type: "text", label: "Overview", title: "개요", body: [p.desc] },
        { type: "text", label: "Problem", title: "풀어야 했던 문제", body: [p.problem] },
        { type: "text", label: "Approach", title: "해결 방법", body: [p.action] },
        { type: "process", label: "What I did", title: "맡은 일", steps: (p.did || []).map((d) => ({ title: d })) },
      ].filter((s) => (s.body || []).some(Boolean) || (s.steps || []).length);
    }
    if (p.resultText || p.result) secs.push({ type: "_result", label: "Result", title: "결과" });
    return secs;
  }

  function render(p, prev, next, seq) {
    document.title = `${p.title} | 박영희 Portfolio`;
    const facts = [
      ["역할", p.role],
      ["기간", p.period || fmtDate(p.date)],
      ["구분", kindLabel(p)],
      ["주최 · 발주", p.client],
      ["참여", p.team],
      ["도구", (p.tools || []).join(", ")],
    ].filter(([, v]) => v);
    let n = 0;
    const secs = sectionsOf(p).map((s) => {
      n += 1;
      const body = s.type === "_result"
        ? `${p.result ? `<p class="result"><strong>${esc(p.result.value)}</strong>${esc(p.result.label)}</p>` : ""}${paras(p.resultText)}`
        : SECTION[s.type](s, p);
      return `<section class="psec" id="ps-${n}" aria-labelledby="pt-${n}">
          <header class="psec__head"><span class="psec__num">${pad2(n)}</span><span class="psec__label">${esc(s.label || "")}</span></header>
          <div class="psec__body">
            ${(s.title || s.caption) ? `<h2 class="psec__title" id="pt-${n}">${esc(s.title || s.caption)}</h2>` : `<h2 class="sr-only" id="pt-${n}">${esc(s.label || "")}</h2>`}
            ${body}
          </div>
        </section>`;
    }).join("");
    const link = (q, label, cls) => (q ? `<a class="pnav__a ${cls}" href="${esc(window.keepLink(`project.html?id=${encodeURIComponent(q.id)}`))}">
        <span class="pnav__img"><img src="${esc(q.thumb)}" alt="" loading="lazy" /></span>
        <span class="pnav__txt"><span>${label}</span><strong>${esc(q.title)}</strong><em>${esc(q.categoryLabel)}</em></span></a>` : `<span class="pnav__a pnav__a--none"></span>`);

    // 한눈에 보기: 문제 → 내가 한 일 → 결과 (인사담당자가 여기까지만 봐도 되게)
    const did = (p.did || []).slice(0, 3);
    const glance = [
      ["문제", p.problem ? `<p>${esc(p.problem)}</p>` : ""],
      ["내가 한 일", p.action ? `<p>${esc(p.action)}</p>` : did.length ? `<ul>${did.map((d) => `<li>${esc(d)}</li>`).join("")}</ul>` : ""],
      ["결과", p.result ? `<p class="glance__num"><strong>${esc(p.result.value)}</strong>${esc(p.result.label)}</p>${p.resultText ? `<p>${esc(p.resultText)}</p>` : ""}` : p.resultText ? `<p>${esc(p.resultText)}</p>` : ""],
    ].filter(([, v]) => v);
    const tocItems = sectionsOf(p).map((sec, i) => `<li><a href="#ps-${i + 1}"><span>${pad2(i + 1)}</span>${esc(sec.label || "")}</a></li>`).join("");

    $("#project").innerHTML = `
      <section class="phero">
        <div class="wrap">
          <a class="back back--light js-back" href="${esc(window.keepLink("works.html"))}">← 프로젝트 목록</a>
          <p class="phero__meta">${esc(p.categoryLabel)}${p.date ? ` · ${esc(fmtDate(p.date))}` : ""}</p>
          <h1 class="phero__title">${esc(p.title)}</h1>
          ${p.summary ? `<p class="phero__lead">${esc(p.summary)}</p>` : ""}
          <dl class="phero__facts">${facts.map(([k, v]) => `<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join("")}</dl>
          ${p.link ? `<a class="btn" href="${esc(p.link)}" target="_blank" rel="noopener">작품 보러 가기 ↗</a>` : ""}
        </div>
      </section>
      <div class="wrap">
        ${p.image ? `<figure class="pcover">${img(p.image, p.title)}</figure>` : ""}
        ${glance.length ? `<section class="glance" aria-labelledby="glanceTitle">
          <h2 class="glance__title" id="glanceTitle">한눈에 보기</h2>
          <ol class="glance__list">${glance.map(([k, v], i) => `<li><span class="glance__no">${pad2(i + 1)}</span><h3>${k}</h3>${v}</li>`).join("")}</ol>
        </section>` : ""}
        <div class="pbody">
          <nav class="ptoc" aria-label="이 프로젝트의 구성"><p>Contents</p><ol>${tocItems}</ol></nav>
          <div class="pbody__main">${secs}</div>
        </div>
        <nav class="pnav" id="pnav" aria-label="다른 프로젝트">${link(prev, "← 이전 프로젝트", "pnav__a--prev")}${link(next, "다음 프로젝트 →", "pnav__a--next")}</nav>
      </div>
      <nav class="qbar" id="qbar" aria-label="빠른 이동">
        <a class="qbar__back js-back" href="${esc(window.keepLink("works.html"))}"><span aria-hidden="true">←</span> 목록</a>
        <span class="qbar__sep" aria-hidden="true"></span>
        ${prev ? `<a class="qbar__btn" href="${esc(window.keepLink(`project.html?id=${encodeURIComponent(prev.id)}`))}" aria-label="이전 프로젝트: ${esc(prev.title)}" title="이전 (←)">‹</a>` : `<span class="qbar__btn is-off" aria-hidden="true">‹</span>`}
        <span class="qbar__pos"><span><b>${pad2(seq.i + 1)}</b> / ${pad2(seq.n)}</span><small>${esc(seq.label)}</small></span>
        ${next ? `<a class="qbar__btn" href="${esc(window.keepLink(`project.html?id=${encodeURIComponent(next.id)}`))}" aria-label="다음 프로젝트: ${esc(next.title)}" title="다음 (→)">›</a>` : `<span class="qbar__btn is-off" aria-hidden="true">›</span>`}
      </nav>`;
    tocSpy();
    quickNav(prev, next);
  }

  /* 빠른 이동
     - 아래 떠 있는 막대: 머리 영역을 지나면 나타나고, 맨 아래 이전 · 다음 카드가 보이면 숨어요
     - 키보드: ← 이전 · → 다음 · Esc 목록
     - '목록': 목록에서 왔으면 뒤로 가기(보던 자리 그대로), 아니면 목록 페이지로 */
  function quickNav(prev, next) {
    const bar = $("#qbar"), hero = $(".phero"), pnav = $("#pnav");
    let pastHero = false, atEnd = false;
    const show = () => bar.classList.toggle("is-on", pastHero && !atEnd);
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(([e]) => { pastHero = !e.isIntersecting; show(); }).observe(hero);
      new IntersectionObserver(([e]) => { atEnd = e.isIntersecting; show(); }).observe(pnav);
    }
    const toList = (e) => {
      try { sessionStorage.setItem("pf.back", "1"); } catch (err) { /* 무시 */ }
      let fromList = false;
      try { fromList = !!document.referrer && new URL(document.referrer).pathname.endsWith("works.html"); } catch (err) { fromList = false; }
      if (fromList && history.length > 1) { e && e.preventDefault(); history.back(); }
    };
    document.querySelectorAll(".js-back").forEach((a) => a.addEventListener("click", toList));
    const go = (q) => { if (q) location.href = window.keepLink(`project.html?id=${encodeURIComponent(q.id)}`); };
    document.addEventListener("keydown", (e) => {
      if (e.altKey || e.ctrlKey || e.metaKey || /input|textarea|select/i.test(e.target.tagName)) return;
      if (e.key === "ArrowLeft") go(prev);
      else if (e.key === "ArrowRight") go(next);
      else if (e.key === "Escape") { const a = $(".qbar__back"); toList(null); location.href = a.href; }
    });
    if (next && next.thumb) { const im = new Image(); im.src = next.thumb; }   // 다음 이미지를 미리 받아 둬요
  }

  /* 왼쪽 목차: 지금 읽는 섹션 표시
     - 화면 위쪽 30% 선을 지난 마지막 섹션이 '지금 섹션'이에요
     - 목차를 눌러 이동하면 누른 섹션을 바로 표시해요
       (페이지 끝 근처라 그 섹션이 위까지 못 올라와도 누른 걸로 유지, 직접 스크롤하면 다시 자동) */
  function tocSpy() {
    const links = [...document.querySelectorAll(".ptoc a")];
    const secs = links.map((a) => document.querySelector(a.getAttribute("href")));
    if (!secs.length || secs.some((x) => !x)) return;
    const head = document.querySelector(".head");
    let pinned = -1, ticking = false;
    const mark = (k) => links.forEach((a, i) => {
      a.classList.toggle("is-on", i === k);
      if (i === k) a.setAttribute("aria-current", "true"); else a.removeAttribute("aria-current");
    });
    function update() {
      ticking = false;
      if (pinned >= 0) { mark(pinned); return; }
      const line = (head ? head.offsetHeight : 64) + window.innerHeight * 0.3;
      let k = -1;
      secs.forEach((sec, i) => { if (sec.getBoundingClientRect().top <= line) k = i; });
      const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4;
      if (atBottom) k = secs.length - 1;
      mark(k);
    }
    const on = () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } };
    links.forEach((a, i) => a.addEventListener("click", () => { pinned = i; mark(i); }));
    // 사용자가 직접 스크롤하기 시작하면 다시 자동 표시
    const unpin = () => { if (pinned >= 0) { pinned = -1; on(); } };
    ["wheel", "touchstart", "keydown"].forEach((ev) => window.addEventListener(ev, unpin, { passive: true }));
    window.addEventListener("scroll", on, { passive: true });
    window.addEventListener("resize", on);
    update();
  }

  function notFound() {
    document.title = "프로젝트를 찾을 수 없어요 | 박영희 Portfolio";
    $("#project").innerHTML = `<div class="wrap page">
      <a class="back" href="${esc(window.keepLink("works.html"))}">← 프로젝트 목록</a>
      <div class="phead"><h1 class="phead__title">프로젝트를 찾을 수 없어요</h1>
      <p class="phead__lead">주소가 바뀌었거나 아직 공개되지 않은 프로젝트예요. 목록에서 다시 찾아주세요.</p></div></div>`;
  }

  (window.PROJECTS_READY || Promise.resolve()).then(() => {
    const y = $("#year"); if (y) y.textContent = new Date().getFullYear();
    const id = new URLSearchParams(location.search).get("id") || "";
    const all = [...(window.PROJECTS || [])].sort((a, b) => b.date.localeCompare(a.date));
    // 목록에서 보던 순서(종류별 · 그 연도)를 따라가요. 없으면 최신순 전체
    let list = all, label = "전체";
    try {
      const s = JSON.parse(sessionStorage.getItem("pf.works") || "null");
      if (s && Array.isArray(s.ids) && s.ids.includes(id)) {
        const byId = new Map(all.map((p) => [p.id, p]));
        const seq = s.ids.map((k) => byId.get(k)).filter(Boolean);
        if (seq.length) { list = seq; label = s.label || label; }
      }
    } catch (err) { /* 기본 순서 사용 */ }
    const i = list.findIndex((p) => p.id === id);
    if (i < 0) { notFound(); return; }
    render(list[i], list[i - 1] || null, list[i + 1] || null, { i, n: list.length, label });
  });
})();
