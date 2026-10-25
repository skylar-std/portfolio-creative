/* =========================================
   메인(index.html): 표지 슬라이드(대표 프로젝트) · 이력 · 스킬을 DB 내용으로 채우기
   - 내용이 없는 칸은 제목까지 숨기고, 섹션 번호 · 메뉴도 남은 것만으로 다시 매겨요.
   - 처음에 보여줄 개수는 아래 LIMITS 에서 바꿔요. 넘치면 '더보기'로 접혀요.
   ========================================= */
(function () {
  "use strict";

  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const esc = window.esc;
  const pad2 = (n) => String(n).padStart(2, "0");

  const LIMITS = { experience: 4, training: 4, activities: 4, certificates: 6, slides: 5, featured: 4, autoplay: 4500 };

  const NOW = (() => { const d = new Date(); return `${d.getFullYear()}.${pad2(d.getMonth() + 1)}`; })();
  const latestFirst = (k) => (a, b) => (b[k] || NOW).localeCompare(a[k] || NOW);
  const period = (s, e) => (!s ? "" : !e ? `${s} – 현재` : s === e ? s : `${s} – ${e}`);
  function duration(s, e) {
    if (!s) return "";
    const [sy, sm] = s.split(".").map(Number);
    const [ey, em] = (e || NOW).split(".").map(Number);
    const total = (ey - sy) * 12 + (em - sm) + 1;
    const y = Math.floor(total / 12), m = total % 12;
    return [y ? `${y}년` : "", m ? `${m}개월` : ""].filter(Boolean).join(" ") || "1개월";
  }

  /* 한 줄: 날짜 | 이름 · 부제 · 설명 | 오른쪽 꼬리표 */
  const row = ({ date, title, sub, desc, tag, now }) => `
    <li class="row${now ? " is-now" : ""}">
      <span class="row__date">${esc(date)}</span>
      <div class="row__main">
        <strong class="row__title">${esc(title)}</strong>
        ${sub ? `<span class="row__sub">${esc(sub)}</span>` : ""}
        ${desc ? `<p class="row__desc">${esc(desc)}</p>` : ""}
      </div>
      ${tag ? `<span class="row__tag">${esc(tag)}</span>` : ""}
    </li>`;

  function fill(listId, countId, items, limit, label) {
    const list = $(listId);
    if (!list) return;
    list.innerHTML = items.join("");
    if (countId) { const c = $(countId); if (c) c.textContent = items.length || ""; }
    // 많으면 접기
    const extra = limit ? items.length - limit : 0;
    if (extra > 0) {
      const lis = [...list.children];
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "more-btn";
      let open = false;
      const set = () => {
        lis.forEach((li, i) => { li.hidden = !open && i >= limit; });
        btn.textContent = open ? "접기 ↑" : `${label} ${extra}개 더보기 ↓`;
        btn.setAttribute("aria-expanded", String(open));
      };
      btn.addEventListener("click", () => { open = !open; set(); });
      list.after(btn);
      set();
    }
  }

  function renderResume(R) {
    if (!R) return;
    fill("#eduList", null, [...(R.education || [])].sort(latestFirst("start")).map((e) =>
      row({ date: e.end || e.start, title: e.school, sub: [e.major, e.status].filter(Boolean).join(" · ") })));

    fill("#expList", null, [...(R.experience || [])].sort(latestFirst("start")).map((x) =>
      row({ date: period(x.start, x.end), title: x.company, sub: x.role, desc: x.desc, tag: x.end ? duration(x.start, x.end) : "재직 중", now: !x.end })),
      LIMITS.experience, "경력");

    fill("#trainList", "#trainCount", [...(R.training || [])].sort(latestFirst("start")).map((x) =>
      row({ date: period(x.start, x.end), title: x.title, sub: x.org, desc: x.desc, tag: x.end ? "" : "수강 중", now: !x.end })),
      LIMITS.training, "교육");

    const acts = [...(R.activities || [])].sort(latestFirst("start"));
    const act = (a) => row({ date: period(a.start, a.end), title: a.title, sub: a.org, desc: a.desc, tag: a.role });
    fill("#extList", "#extCount", acts.filter((a) => a.type === "external").map(act), LIMITS.activities, "대외활동");
    fill("#campList", "#campCount", acts.filter((a) => a.type === "campus").map(act), LIMITS.activities, "교내활동");

    fill("#awardList", "#awardCount", [...(R.awards || [])].sort(latestFirst("date")).map((a) =>
      row({ date: a.date, title: a.title, sub: a.org, desc: a.desc })));

    const langs = [...(R.languages || [])].sort(latestFirst("date"));
    fill("#langList", "#langCount", langs.map((l) => {
      const expired = l.expires && l.expires < NOW;
      const state = !l.expires ? "평생 유효" : expired ? `만료 · ${l.expires}` : `유효 ~${l.expires}`;
      return `<li class="lang${expired ? " is-expired" : ""}">
        <span class="lang__test">${esc(l.test)}</span>
        <strong class="lang__score">${esc(l.score)}</strong>
        <span class="lang__meta">${esc(l.date)} 취득${l.org ? ` · ${esc(l.org)}` : ""}<br />${esc(state)}</span>
      </li>`;
    }));

    fill("#certList", "#certCount", [...(R.certificates || [])].sort(latestFirst("date")).map((c) =>
      `<li class="trow"><span class="row__date">${esc(c.date)}</span><strong>${esc(c.name)}</strong><span class="trow__org">${esc(c.org)}</span></li>`),
      LIMITS.certificates, "자격증");
  }

  function renderRole(role) {
    if (!role) return;
    if (role.eyebrow) $("#heroEyebrow").textContent = role.eyebrow;
    if (role.title) $("#heroTitle").innerHTML = role.title;      // DB 문장 (<em>, <br> 사용)
    if (role.desc) $("#heroDesc").innerHTML = role.desc.replace(/<br class="pc-only"\s*\/?>/g, " ");
    $("#skillsList").innerHTML = (role.skills || []).filter((g) => g.items.length).map((g) => `
      <div class="skills__col">
        <dt>${esc(g.title)} <span class="count">${g.items.length}</span></dt>
        <dd><ul class="skills__list">${g.items.map(([label, icon]) => `<li>${icon ? `<img src="img/icons/${esc(icon)}.svg" alt="" width="20" height="20" />` : `<span class="skills__dot" aria-hidden="true"></span>`}${esc(label)}</li>`).join("")}</ul></dd>
      </div>`).join("");
  }

  /* 표지 슬라이드: featured 켠 작업(없으면 최신순), 최대 LIMITS.slides 장
     LIMITS.autoplay(ms)마다 자동으로 넘어가요. 마우스를 올리거나 만지는 동안, 화면을 보지 않을 때는 멈춰요. */
  function renderSlider(list) {
    const track = $("#slideTrack");
    if (!track) return;
    const sorted = [...list].sort((a, b) => b.date.localeCompare(a.date));
    let pick = sorted.filter((p) => p.featured);
    if (!pick.length) pick = sorted;
    pick = pick.slice(0, LIMITS.slides);
    const KINDS = { personal: "개인 프로젝트", team: "팀 프로젝트", contest: "공모전", school: "학교 과제", client: "외주" };
    track.innerHTML = pick.length ? pick.map((p, i) => `
      <article class="slide" aria-roledescription="slide" aria-label="${i + 1} / ${pick.length}">
        <a class="slide__link" href="${esc(window.keepLink(`project.html?id=${encodeURIComponent(p.id)}`))}">
          <span class="slide__img"><img src="${esc(p.image || p.thumb)}" alt="" ${i ? 'loading="lazy"' : ""} /></span>
          <span class="slide__info">
            <span class="slide__meta">${esc(p.categoryLabel)}${p.date ? ` · ${esc(p.date.slice(0, 4))}` : ""}${KINDS[p.type] ? ` · ${KINDS[p.type]}` : ""}</span>
            <strong class="slide__title">${esc(p.title)}</strong>
            ${p.role ? `<span class="slide__role"><b>역할</b>${esc(p.role)}</span>` : ""}
            <span class="slide__go">자세히 보기 <span aria-hidden="true">→</span></span>
          </span>
        </a>
      </article>`).join("")
      : `<article class="slide slide--empty"><span class="slide__img" aria-hidden="true"></span><span class="slide__info"><strong class="slide__title">준비 중인 프로젝트</strong><span class="slide__role">새 프로젝트가 정리되는 대로 이곳에 올라와요.</span></span></article>`;

    const n = Math.max(1, pick.length);
    const dots = $("#slideDots");
    dots.innerHTML = pick.length > 1 ? pick.map((p, i) => `<button type="button" class="slider__dot" data-i="${i}" aria-label="${i + 1}번째 슬라이드: ${esc(p.title)}"></button>`).join("") : "";
    $(".slider__arrows").hidden = pick.length < 2;
    let cur = 0;
    const go = (i) => { cur = (i + n) % n; track.scrollTo({ left: cur * track.clientWidth, behavior: "smooth" }); };
    const mark = () => {
      cur = Math.round(track.scrollLeft / Math.max(1, track.clientWidth));
      $("#slideCount").textContent = pick.length ? `${String(cur + 1).padStart(2, "0")} / ${String(n).padStart(2, "0")}` : "";
      $$(".slider__dot", dots).forEach((d, i) => d.setAttribute("aria-current", String(i === cur)));
    };
    let t = 0;
    track.addEventListener("scroll", () => { clearTimeout(t); t = setTimeout(mark, 60); }, { passive: true });
    $("#slidePrev").addEventListener("click", () => go(cur - 1));
    $("#slideNext").addEventListener("click", () => go(cur + 1));
    dots.addEventListener("click", (e) => { const d = e.target.closest("[data-i]"); if (d) go(+d.dataset.i); });
    $("#slider").addEventListener("keydown", (e) => {
      if (e.key === "ArrowLeft") { e.preventDefault(); go(cur - 1); }
      if (e.key === "ArrowRight") { e.preventDefault(); go(cur + 1); }
    });
    mark();

    // 자동 넘김: 점(막대)이 차오르는 동안 기다렸다가 다음 장으로
    const slider = $("#slider");
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (pick.length < 2 || still || !LIMITS.autoplay) return;
    slider.style.setProperty("--auto", `${LIMITS.autoplay}ms`);
    slider.classList.add("is-auto");
    let timer = 0, paused = false;
    const restart = () => {
      clearTimeout(timer);
      slider.classList.remove("is-run"); void slider.offsetWidth;
      if (paused || document.hidden) return;
      slider.classList.add("is-run");
      timer = setTimeout(() => go(cur + 1), LIMITS.autoplay);
    };
    const pause = () => { paused = true; restart(); };
    const resume = () => { paused = false; restart(); };
    track.addEventListener("scroll", () => { clearTimeout(timer); clearTimeout(t2); t2 = setTimeout(restart, 120); }, { passive: true });
    let t2 = 0;
    slider.addEventListener("mouseenter", pause);
    slider.addEventListener("mouseleave", resume);
    slider.addEventListener("focusin", pause);
    slider.addEventListener("focusout", resume);
    track.addEventListener("touchstart", pause, { passive: true });
    track.addEventListener("touchend", () => setTimeout(resume, 1500), { passive: true });
    document.addEventListener("visibilitychange", restart);
    restart();
  }

  /* 대표 프로젝트 카드 4개 + 맨 아래 '모든 프로젝트 보러가기' */
  function renderFeatured(list) {
    const sorted = [...list].sort((a, b) => b.date.localeCompare(a.date));
    let pick = sorted.filter((p) => p.featured);
    if (!pick.length) pick = sorted;
    pick = pick.slice(0, LIMITS.featured);
    $("#featList").innerHTML = pick.length ? pick.map(window.projectCard).join("") : window.emptyCard();
    const years = sorted.map((p) => p.date.slice(0, 4)).filter(Boolean);
    $("#allMeta").textContent = list.length
      ? `${list.length}개 프로젝트 · ${years[years.length - 1] === years[0] ? years[0] : `${years[years.length - 1]}–${years[0]}`} · 연도 · 종류별로 정리`
      : "프로젝트가 정리되는 대로 이곳에 쌓여요";
    $("#allThumbs").innerHTML = sorted.slice(0, 4).map((p) => `<img src="${esc(p.thumb)}" alt="" loading="lazy" />`).join("");
  }

  /* 내용이 없는 칸 숨기기 → 섹션 번호 · 메뉴 다시 매기기 */
  function hideEmpty() {
    $$("[data-block]").forEach((b) => { const l = $("ul, ol, dl", b); b.hidden = !l || !l.children.length; });
    $$(".sec").forEach((sec) => {
      if (sec.id === "profile" || sec.id === "featured") return;          // 프로필 · 대표 프로젝트는 항상 보여요
      const blocks = $$("[data-block]", sec);
      const sk = $(".skills", sec);
      const empty = blocks.length ? blocks.every((b) => b.hidden) : !(sk && sk.children.length);
      sec.hidden = empty;
    });
    $$(".sec").filter((s) => !s.hidden).forEach((s, i) => { $(".sec__num", s).textContent = pad2(i + 1); });
    // 오른쪽 구역 이동 바에서도 숨긴 구역은 빼기
    $$(".side__list li").forEach((li) => { const t = $($("a", li).getAttribute("href")); if (!t || t.hidden) li.remove(); });
  }

  /* 위 메뉴(Home · Profile)와 오른쪽 구역 이동 바에 지금 위치 표시 */
  function trackPosition() {
    const side = $("#side");
    const items = $$(".side__list a", side).map((a) => ({ a, sec: $(a.getAttribute("href")) })).filter((x) => x.sec);
    const home = $(".nav a[href='#top']"), prof = $(".nav a[href='#profile']");
    const cover = $("#top"), profile = $("#profile");
    const fill = $("#sideFill");
    const set = (a, on) => { if (!a) return; a.classList.toggle("is-on", on); if (on) a.setAttribute("aria-current", "true"); else a.removeAttribute("aria-current"); };
    let ticking = false;
    function update() {
      ticking = false;
      const probe = window.scrollY + window.innerHeight * 0.4;
      // 위 메뉴: 표지에서는 Home, 그 아래는 Profile
      const inHome = probe < profile.offsetTop;
      set(home, inHome); set(prof, !inHome);
      // 오른쪽 바: 표지가 지나면 보이기
      side.classList.toggle("is-visible", window.scrollY > cover.offsetHeight * 0.6 && items.length > 0);
      let active = -1;
      items.forEach((x, i) => { if (x.sec.offsetTop <= probe) active = i; });
      items.forEach((x, i) => { set(x.a, i === active); x.a.classList.toggle("is-passed", i < active); });
      if (fill && items.length > 1) fill.style.height = `${Math.max(0, active) / (items.length - 1) * 100}%`;
    }
    const on = () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } };
    window.addEventListener("scroll", on, { passive: true });
    window.addEventListener("resize", on);
    update();
  }

  function headerShadow() {
    const h = $("#header");
    const on = () => h.classList.toggle("is-scrolled", window.scrollY > 8);
    on(); window.addEventListener("scroll", on, { passive: true });
  }

  const y = $("#year"); if (y) y.textContent = new Date().getFullYear();
  headerShadow();
  (window.PROJECTS_READY || Promise.resolve()).then(() => {
    renderRole(window.ROLE_DATA);
    renderResume(window.RESUME);
    renderSlider(window.PROJECTS || []);
    renderFeatured(window.PROJECTS || []);
    hideEmpty();
    trackPosition();
  });
})();
