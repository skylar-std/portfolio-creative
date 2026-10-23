/* =========================================
   공통 스크립트 (index.html, works.html 모두 사용)
   - 헤더, 모바일 메뉴, 스크롤 등장 효과, 메뉴 하이라이트, 푸터 연도
   - 메인의 '작업물 보러가기' 썸네일 미리보기
   ========================================= */
(function () {
  "use strict";

  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

  /* 처음에 보여줄 개수 (넘으면 '더보기'로 접힘) */
  const LIMITS = { experience: 4, training: 4, certYears: 3 };

  /* ---------- 0. 이력 렌더링 (js/resume.js) ---------- */
  const NOW = (() => { const d = new Date(); return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}`; })();
  const latestFirst = (k) => (a, b) => (b[k] || NOW).localeCompare(a[k] || NOW);
  const period = (s, e) => `${s} — ${e || "현재"}`;

  // 기간 계산: "2022.03" ~ "2024.02" → "2년"
  function duration(s, e) {
    const [sy, sm] = s.split(".").map(Number);
    const [ey, em] = (e || NOW).split(".").map(Number);
    const total = (ey - sy) * 12 + (em - sm) + 1;
    const y = Math.floor(total / 12), m = total % 12;
    return [y ? `${y}년` : "", m ? `${m}개월` : ""].filter(Boolean).join(" ") || "1개월";
  }

  // 일정 개수 이상이면 접고 '더보기' 버튼 연결
  function collapse(listEl, btnEl, limit, label) {
    if (!listEl || !btnEl) return;
    const items = [...listEl.children];
    const hidden = items.slice(limit);
    if (!hidden.length) { btnEl.hidden = true; return; }
    const count = hidden.reduce((n, el) => n + Number(el.dataset.count || 1), 0);
    let open = false;
    const set = () => {
      hidden.forEach((el) => { el.hidden = !open; });
      btnEl.textContent = open ? "접기 ↑" : `${label} ${count}개 더보기 ↓`;
      btnEl.setAttribute("aria-expanded", String(open));
    };
    btnEl.hidden = false;
    btnEl.addEventListener("click", () => { open = !open; set(); });
    set();
  }

  /* 대외활동 · 교내활동: 요약 숫자 + 종류 버튼 + 목록(4개 넘으면 더보기) */
  const ACT_TYPES = { external: "대외활동", campus: "교내활동" };
  function renderActivities(all) {
    const box = $("#activities");
    const acts = all.filter((a) => ACT_TYPES[a.type]).sort(latestFirst("start"));
    if (!box) return;
    if (!acts.length) { box.hidden = true; return; }
    const count = (t) => acts.filter((a) => a.type === t).length;
    $("#actStats").innerHTML = [[count("external"), "개", "대외활동"], [count("campus"), "개", "교내활동"]]
      .map(([v, u, l]) => `<div class="act-stat"><strong>${v}<small>${u}</small></strong><span>${l}</span></div>`).join("");

    let filter = "all", open = false;
    const LIMIT = 4;
    const period = (s, e) => (!e ? `${s} — 현재` : s === e ? s : `${s} — ${e}`);
    const drawFilter = () => {
      $("#actFilter").innerHTML = [["all", "전체", acts.length], ...Object.entries(ACT_TYPES).map(([k, l]) => [k, l, count(k)])]
        .filter((o) => o[2]).map(([k, l, n]) => `<button type="button" data-f="${k}" aria-pressed="${k === filter}">${l}<sup>${n}</sup></button>`).join("");
    };
    const drawList = () => {
      const shown = acts.filter((a) => filter === "all" || a.type === filter);
      $("#actList").innerHTML = shown.map((a, i) => `
        <li class="act act--${a.type}"${!open && i >= LIMIT ? " hidden" : ""}>
          <span class="act__date">${period(a.start, a.end)}</span>
          <div class="act__body">
            <span class="act__type">${ACT_TYPES[a.type]}</span>
            <strong class="act__title">${a.title}</strong>
            ${a.org ? `<span class="act__org">${a.org}</span>` : ""}
            ${a.desc ? `<p class="act__desc">${a.desc}</p>` : ""}
          </div>
          <div class="act__side">${a.role ? `<b>${a.role}</b><span>역할</span>` : ""}</div>
        </li>`).join("");
      const more = $("#actMore"), extra = shown.length - LIMIT;
      more.hidden = extra <= 0;
      more.textContent = open ? "접기 ↑" : `활동 ${extra}개 더보기 ↓`;
      more.setAttribute("aria-expanded", String(open));
    };
    $("#actFilter").addEventListener("click", (e) => {
      const b = e.target.closest("button[data-f]"); if (!b) return;
      filter = b.dataset.f; open = false; drawFilter(); drawList();
    });
    $("#actMore").addEventListener("click", () => { open = !open; drawList(); });
    drawFilter(); drawList();
  }

  function renderResume() {
    if (!window.RESUME) return;
    const R = window.RESUME;
    const put = (id, html) => { const el = $(id); if (el) el.innerHTML = html; };
    const text = (id, t) => { const el = $(id); if (el) el.textContent = t; };

    // 학력
    put("#eduList", [...(R.education || [])].sort(latestFirst("start")).map((e) => `
      <li class="edu__row">
        <span class="edu__date">${e.end || e.start}</span>
        <span class="edu__what"><strong>${e.school}</strong> ${e.major}${e.status ? ` · ${e.status}` : ""}</span>
      </li>`).join(""));

    // 경력
    const exp = [...(R.experience || [])].sort(latestFirst("start"));
    text("#expCount", exp.length);
    put("#expList", exp.map((x) => `
      <li class="career__item${x.end ? "" : " is-now"}">
        <div class="career__meta">
          <span class="career__date">${period(x.start, x.end)}</span>
          <span class="career__dur">${x.end ? duration(x.start, x.end) : "재직 중"}</span>
        </div>
        <strong class="career__name">${x.company}</strong>
        <span class="career__sub">${x.role}</span>
        ${x.desc ? `<p class="career__desc">${x.desc}</p>` : ""}
      </li>`).join(""));
    collapse($("#expList"), $("#expMore"), LIMITS.experience, "경력");

    // 교육
    const tr = [...(R.training || [])].sort(latestFirst("start"));
    text("#trainCount", tr.length);
    put("#trainList", tr.map((x) => `
      <li class="career__item${x.end ? "" : " is-now"}">
        <div class="career__meta">
          <span class="career__date">${period(x.start, x.end)}</span>
          ${x.end ? "" : `<span class="career__dur">수강 중</span>`}
        </div>
        <strong class="career__name">${x.title}</strong>
        <span class="career__sub">${x.org}</span>
        ${x.desc ? `<p class="career__desc">${x.desc}</p>` : ""}
      </li>`).join(""));
    collapse($("#trainList"), $("#trainMore"), LIMITS.training, "교육");

    // 수상
    const aw = [...(R.awards || [])].sort(latestFirst("date"));
    const awardEl = $("#awardList");
    if (awardEl) awardEl.classList.toggle("is-multi", aw.length > 1);
    put("#awardList", aw.map((a) => `
      <article class="award reveal">
        <div>
          <p class="award__label">Award</p>
          <h3 class="award__name">${a.title}</h3>
          ${a.desc ? `<p class="award__desc">${a.desc}</p>` : ""}
        </div>
        <div class="award__side">
          <span class="award__year">${a.date.slice(0, 4)}</span>
          <span class="award__org">${a.org}</span>
        </div>
      </article>`).join(""));

    // 대외활동 · 교내활동
    renderActivities(R.activities || []);

    // 어학: 최신순, 유효기간 지나면 흐리게
    const langs = [...(R.languages || [])].sort(latestFirst("date"));
    text("#langCount", langs.length);
    put("#langList", langs.map((l) => {
      const expired = l.expires && l.expires < NOW;
      const state = !l.expires ? "평생 유효" : expired ? `만료 · ${l.expires}` : `유효 ~${l.expires}`;
      return `
      <div class="lang${expired ? " is-expired" : ""}">
        <span class="lang__test">${l.test}</span>
        <strong class="lang__score">${l.score}</strong>
        <div class="lang__meta">
          <span>${l.date} 취득${l.org ? ` · ${l.org}` : ""}</span>
          <span class="lang__state">${state}</span>
        </div>
      </div>`;
    }).join(""));
    const langBox = $(".langs"); if (langBox && !langs.length) langBox.hidden = true;

    // 자격증: 연도별 묶음
    const certs = [...(R.certificates || [])].sort(latestFirst("date"));
    text("#certCount", certs.length);
    const byYear = [];
    certs.forEach((c) => {
      const y = c.date.slice(0, 4);
      const last = byYear[byYear.length - 1];
      if (last && last.y === y) last.items.push(c); else byYear.push({ y, items: [c] });
    });
    put("#certList", byYear.map((g) => `
      <div class="cert-year" data-count="${g.items.length}">
        <p class="cert-year__label"><em>${g.y}</em><span>${g.items.length}</span></p>
        <ul class="cert-year__list">
          ${g.items.map((c) => `
            <li class="cert-row">
              <strong class="cert-row__name">${c.name}</strong>
              <span class="cert-row__org">${c.org}</span>
              <span class="cert-row__month">${c.date.slice(5)}월</span>
            </li>`).join("")}
        </ul>
      </div>`).join(""));
    collapse($("#certList"), $("#certMore"), LIMITS.certYears, "이전 자격증");
  }

  /* ---------- 0-1. 내용이 없는 칸은 통째로 숨기기 ----------
     DB(지금은 resume.js · roles.js · projects.js)에 내용이 없으면
     제목까지 안 보이게 하고, 섹션 번호와 오른쪽 점 메뉴도 남은 것만으로 다시 매겨요. */
  function hideEmpty() {
    const empty = (sel) => { const el = $(sel); return !el || !el.children.length; };
    const hide = (el, yes) => { if (el) el.hidden = yes; };

    // Profile: 학력 · 경력 · 교육
    hide($(".edu"), empty("#eduList"));
    const expCol = $("#expList") && $("#expList").closest(".career__col");
    const trainCol = $("#trainList") && $("#trainList").closest(".career__col");
    hide(expCol, empty("#expList"));
    hide(trainCol, empty("#trainList"));
    const career = $(".career");
    if (career) {
      const shown = [expCol, trainCol].filter((c) => c && !c.hidden).length;
      career.hidden = shown === 0;
      career.classList.toggle("is-single", shown === 1);
    }

    // Credentials: 수상 · 어학 · 자격증 → 셋 다 없으면 섹션째로
    hide($("#awardList"), empty("#awardList"));
    hide($(".langs"), empty("#langList"));
    hide($(".certs"), empty("#certList"));
    const cred = $("#credentials");
    if (cred) {
      const blocks = [$("#awardList"), $(".langs"), $(".certs")].filter((b) => b && !b.hidden);
      cred.hidden = blocks.length === 0;
      blocks.forEach((b, i) => b.classList.toggle("is-first", i === 0));
      // 제목도 있는 것만: 수상·자격증이 다 있으면 그대로, 아니면 남은 이름으로
      const has = { Awards: !$("#awardList").hidden, Languages: !$(".langs").hidden, Certificates: !$(".certs").hidden };
      const names = Object.keys(has).filter((k) => has[k]);
      const title = $("#credTitle");
      if (title && !(has.Awards && has.Certificates) && names.length) {
        const last = names.pop();
        title.innerHTML = names.length ? `${names.join(", ")} &amp; <em>${last}</em>` : `My <em>${last}</em>`;
      }
    }

    // Skills · 작업물 보러가기
    hide($("#skills"), empty("#skillsGrid"));
    hide($("#projects"), typeof PROJECTS !== "undefined" && !PROJECTS.length);

    // 섹션 번호 01, 02 … 다시 매기기
    $$(".section__num").filter((n) => !n.closest("section").hidden).forEach((n, i) => {
      n.textContent = n.textContent.replace(/^\d+/, String(i + 1).padStart(2, "0"));
    });
    // 숨긴 섹션은 오른쪽 점 메뉴에서도 빼기
    $$(".dots__item").forEach((a) => { const t = $(a.getAttribute("href")); if (!t || t.hidden) a.remove(); });
  }

  /* ---------- 1. 메인: 작업물 보러가기 미리보기 ---------- */
  function renderPreview() {
    const stack = $("#projectPreview");
    if (!stack || typeof PROJECTS === "undefined") return;

    const featured = PROJECTS
      .filter((p) => p.featured !== false)
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 3);
    stack.innerHTML = featured.map((p) => `<img src="${p.thumb}" alt="" />`).join("");

    const count = $("#projectCount");
    if (count && PROJECTS.length) {
      const years = PROJECTS.map((p) => +p.date.slice(0, 4));
      count.textContent = `${PROJECTS.length} Projects · ${Math.min(...years)} — ${Math.max(...years)}`;
    }
  }

  /* ---------- 2. 헤더 스크롤 상태 ---------- */
  function initHeader() {
    const header = $("#header");
    if (!header) return;
    const onScroll = () => header.classList.toggle("is-scrolled", window.scrollY > 20);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  /* ---------- 3. 모바일 메뉴 ---------- */
  function initMenu() {
    const btn = $("#menuBtn");
    const nav = $("#nav");
    if (!btn || !nav) return;

    const setOpen = (open) => {
      nav.classList.toggle("is-open", open);
      btn.setAttribute("aria-expanded", String(open));
      btn.setAttribute("aria-label", open ? "메뉴 닫기" : "메뉴 열기");
      document.body.classList.toggle("is-locked", open);
    };

    btn.addEventListener("click", () => setOpen(!nav.classList.contains("is-open")));
    $$(".nav__link", nav).forEach((a) => a.addEventListener("click", () => setOpen(false)));
  }

  /* ---------- 4. 스크롤 등장 애니메이션 ---------- */
  function initReveal() {
    const targets = $$(".reveal");
    if (!("IntersectionObserver" in window)) {
      targets.forEach((el) => el.classList.add("is-visible"));
      return;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
    targets.forEach((el) => io.observe(el));
  }

  /* ---------- 5. 현재 섹션 메뉴 하이라이트 (같은 페이지 #링크만) ---------- */
  function initActiveNav() {
    const links = $$(".nav__link").filter((l) => l.getAttribute("href").startsWith("#"));
    const sections = links.map((l) => $(l.getAttribute("href"))).filter(Boolean);
    if (!sections.length || !("IntersectionObserver" in window)) return;

    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          links.forEach((l) => l.classList.toggle("is-current", l.getAttribute("href") === `#${entry.target.id}`));
        }
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    sections.forEach((s) => io.observe(s));
  }

  /* ---------- 6. 오른쪽 섹션 이동 바 ---------- */
  function initDots() {
    const dots = $("#dots");
    if (!dots) return;
    const items = $$(".dots__item", dots);
    const fill = $("#dotsFill");
    const sections = items.map((a) => $(a.getAttribute("href")));
    if (sections.some((s) => !s)) return;

    let ticking = false;
    function update() {
      ticking = false;
      const vh = window.innerHeight;
      const probe = window.scrollY + vh * 0.4;          // 화면 위쪽 40% 지점 기준
      const first = sections[0];
      const last = sections[sections.length - 1];
      const start = first.offsetTop - vh * 0.5;
      const end = last.offsetTop + last.offsetHeight - vh * 0.4;

      // Profile ~ Projects 구간에서만 보이기 (표지·Contact에서는 숨김)
      dots.classList.toggle("is-visible", window.scrollY > start && window.scrollY < end);

      let active = 0;
      sections.forEach((s, i) => { if (s.offsetTop <= probe) active = i; });
      items.forEach((a, i) => {
        a.classList.toggle("is-active", i === active);
        a.classList.toggle("is-passed", i < active);
        if (i === active) a.setAttribute("aria-current", "true");
        else a.removeAttribute("aria-current");
      });

      // 진행 막대: 첫 원 중심 → 현재 원 중심
      if (fill) {
        const c = (el) => el.offsetTop + el.offsetHeight / 2;
        fill.style.height = `${c(items[active]) - c(items[0])}px`;
      }
    }

    const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    update();
  }

  /* ---------- 8. 푸터 연도 ---------- */
  function initYear() {
    const y = $("#year");
    if (y) y.textContent = new Date().getFullYear();
  }

  /* ---------- Init ---------- */
  initHeader();
  initMenu();
  initYear();
  // 내용은 DB(js/data.js)에서 불러오므로, 도착한 뒤에 그리고 → 빈 칸 정리 → 등장 효과 · 메뉴 연결
  (window.PROJECTS_READY || Promise.resolve()).then(() => {
    renderResume();
    renderPreview();
    hideEmpty();
    initReveal();
    initActiveNav();
    initDots();
  });
})();
