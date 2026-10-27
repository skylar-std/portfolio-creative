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

    // 어학: 유효기간이 지난 성적은 보여주지 않아요 (DB에는 그대로 남아 있어요)
    const langs = [...(R.languages || [])].filter((l) => !(l.expires && l.expires < NOW)).sort(latestFirst("date"));
    fill("#langList", "#langCount", langs.map((l) => {
      const state = !l.expires ? "평생 유효" : `유효 ~${l.expires}`;
      return `<li class="lang">
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
    let cur = 0;
    // 넘김: 천천히 시작해서 천천히 멈추는 0.8초 움직임. 마지막 → 처음은 거꾸로 훑지 않고 살짝 사라졌다 나타나요
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const ease = (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
    let anim = 0;
    const setActive = (k) => {
      $$(".slide", track).forEach((sl, i) => sl.classList.toggle("is-active", i === k));
      $("#slideCount").textContent = pick.length ? `${String(k + 1).padStart(2, "0")} / ${String(n).padStart(2, "0")}` : "";
      $$(".slider__dot", dots).forEach((d, i) => d.setAttribute("aria-current", String(i === k)));
    };
    const slideTo = (to, dur) => {
      cancelAnimationFrame(anim);
      const from = track.scrollLeft, t0 = performance.now();
      track.style.scrollSnapType = "none";
      const step = (t) => {
        const k = Math.min(1, (t - t0) / dur);
        track.scrollLeft = from + (to - from) * ease(k);
        if (k < 1) anim = requestAnimationFrame(step);
        else { anim = 0; track.style.scrollSnapType = ""; }
      };
      anim = requestAnimationFrame(step);
    };
    const go = (i) => {
      const prev = cur;
      cur = (i + n) % n;
      setActive(cur);
      const to = cur * track.clientWidth;
      if (still) { track.scrollLeft = to; return; }
      const wrap = Math.abs(cur - prev) > 1 && (prev === n - 1 || prev === 0) && Math.abs(i - prev) === 1;
      if (wrap) {
        track.classList.add("is-fade");
        setTimeout(() => { cancelAnimationFrame(anim); track.scrollLeft = to; track.classList.remove("is-fade"); }, 280);
      } else slideTo(to, 800);
    };
    const mark = () => {
      if (anim) return;   // 움직이는 중에는 표시를 바꾸지 않아요
      cur = Math.round(track.scrollLeft / Math.max(1, track.clientWidth));
      $$(".slide", track).forEach((sl, i) => sl.classList.toggle("is-active", i === cur));
      $("#slideCount").textContent = pick.length ? `${String(cur + 1).padStart(2, "0")} / ${String(n).padStart(2, "0")}` : "";
      $$(".slider__dot", dots).forEach((d, i) => d.setAttribute("aria-current", String(i === cur)));
    };
    let t = 0;
    track.addEventListener("scroll", () => { clearTimeout(t); t = setTimeout(mark, 60); }, { passive: true });
    // 마우스로도 끌어서 넘기기 (손가락은 기본으로 밀려요)
    let dragX = null, dragLeft = 0, moved = false;
    track.addEventListener("pointerdown", (e) => {
      if (e.pointerType !== "mouse" || e.button !== 0) return;
      dragX = e.clientX; dragLeft = track.scrollLeft; moved = false;
      track.style.scrollSnapType = "none"; track.classList.add("is-drag");
    });
    window.addEventListener("pointermove", (e) => {
      if (dragX === null) return;
      const dx = e.clientX - dragX; if (Math.abs(dx) > 4) moved = true;
      track.scrollLeft = dragLeft - dx;
    });
    window.addEventListener("pointerup", (e) => {
      if (dragX === null) return;
      const dx = e.clientX - dragX; dragX = null;
      track.style.scrollSnapType = ""; track.classList.remove("is-drag");
      const step = Math.abs(dx) > track.clientWidth * 0.15 ? (dx < 0 ? 1 : -1) : 0;
      go(Math.max(0, Math.min(n - 1, Math.round(dragLeft / Math.max(1, track.clientWidth)) + step)));
    });
    // 끈 뒤에는 링크가 눌리지 않게
    track.addEventListener("click", (e) => { if (moved) { e.preventDefault(); moved = false; } }, true);
    track.addEventListener("dragstart", (e) => e.preventDefault());
    dots.addEventListener("click", (e) => { const d = e.target.closest("[data-i]"); if (d) go(+d.dataset.i); });
    $("#slider").addEventListener("keydown", (e) => {
      if (e.key === "ArrowLeft") { e.preventDefault(); go(cur - 1); }
      if (e.key === "ArrowRight") { e.preventDefault(); go(cur + 1); }
    });
    mark();

    // 자동 넘김: 점(막대)이 차오르는 동안 기다렸다가 다음 장으로
    const slider = $("#slider");
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
    renderAllPeek(sorted);
  }

  /* '모든 프로젝트 보러가기' 오른쪽 미리보기
     ALL_STYLE: "stats"(숫자 3개) · "cats"(카테고리 칩) · "years"(연도별 막대) · "donut"(작은 도넛) · "thumbs"(이미지) */
  const ALL_STYLE = "icon3";
  // 아이콘 시안 (브랜드 색 4개만 사용)
  const P = "#FF2E63", CY = "#08D9D6", N = "#252A34", G = "#EAEAEA";
  const ICONS = {
    // 1. 겹쳐 쌓인 카드 → 올리면 부채꼴로 펼쳐져요
    icon1: `<svg class="ai ai--stack" viewBox="0 0 120 96" width="120" height="96" aria-hidden="true">
      <rect class="ai-c3" x="34" y="8" width="62" height="46" rx="8" fill="${G}"/>
      <rect class="ai-c2" x="26" y="18" width="62" height="46" rx="8" fill="${CY}"/>
      <g class="ai-c1"><rect x="22" y="32" width="66" height="50" rx="8" fill="${N}"/>
      <rect x="30" y="40" width="50" height="24" rx="4" fill="${P}"/>
      <rect x="30" y="70" width="30" height="4" rx="2" fill="#fff" opacity=".7"/></g></svg>`,
    // 2. 4칸 갤러리 → 올리면 칸이 시계 방향으로 자리를 바꿔요
    icon2: `<svg class="ai ai--grid" viewBox="0 0 96 96" width="96" height="96" aria-hidden="true">
      <rect class="ai-t1" x="8" y="8" width="38" height="38" rx="10" fill="${P}"/>
      <rect class="ai-t2" x="50" y="8" width="38" height="38" rx="19" fill="${CY}"/>
      <rect class="ai-t3" x="50" y="50" width="38" height="38" rx="10" fill="${G}"/>
      <rect class="ai-t4" x="8" y="50" width="38" height="38" rx="10" fill="${N}"/></svg>`,
    // 3. 파일 폴더 → 올리면 안의 종이가 위로 올라와요
    icon3: `<svg class="ai ai--folder" viewBox="0 0 120 96" width="120" height="96" aria-hidden="true">
      <path d="M14 22 a8 8 0 0 1 8-8 h24 l8 9 h44 a8 8 0 0 1 8 8 v49 a8 8 0 0 1-8 8 H22 a8 8 0 0 1-8-8z" fill="${N}"/>
      <rect class="ai-s1" x="28" y="20" width="56" height="40" rx="5" fill="${G}"/>
      <rect class="ai-s2" x="36" y="24" width="56" height="40" rx="5" fill="${CY}"/>
      <g class="ai-front"><path d="M10 44 a6 6 0 0 1 6-6 h88 a6 6 0 0 1 6 6 l-5 36 a8 8 0 0 1-8 7 H23 a8 8 0 0 1-8-7z" fill="${P}"/>
      <rect x="48" y="56" width="24" height="5" rx="2.5" fill="#fff"/></g></svg>`,
    // 4. 펜 툴 → 올리면 곡선이 다시 그려지고 손잡이가 움직여요
    icon4: `<svg class="ai ai--pen" viewBox="0 0 120 96" width="120" height="96" aria-hidden="true">
      <path class="ai-curve" d="M14 76 C 34 20, 70 20, 100 50" fill="none" stroke="${N}" stroke-width="4" stroke-linecap="round" pathLength="100"/>
      <g class="ai-handle"><line x1="34" y1="34" x2="72" y2="20" stroke="${CY}" stroke-width="2.5"/>
      <circle cx="34" cy="34" r="5" fill="${CY}"/><circle cx="72" cy="20" r="5" fill="${CY}"/></g>
      <rect x="8" y="70" width="12" height="12" rx="2" fill="#fff" stroke="${N}" stroke-width="3"/>
      <rect x="94" y="44" width="12" height="12" rx="2" fill="#fff" stroke="${N}" stroke-width="3"/>
      <g class="ai-nib"><circle cx="54" cy="25" r="11" fill="${P}"/><path d="M50 25 l4-7 l4 7 l-4 4z" fill="#fff"/></g></svg>`,
  };

  function renderAllPeek(sorted) {
    const box = $("#allThumbs");
    const style = window.__ALL_STYLE || ALL_STYLE;
    box.className = `allwork__peek allwork__peek--${style}`;
    if (!sorted.length) { box.innerHTML = ""; return; }
    const count = (key) => { const m = new Map(); sorted.forEach((p) => { const k = key(p); if (k) m.set(k, (m.get(k) || 0) + 1); }); return [...m]; };
    const cats = count((p) => p.categoryLabel).sort((a, b) => b[1] - a[1]);
    const years = count((p) => p.date.slice(0, 4)).sort((a, b) => a[0].localeCompare(b[0]));
    const tools = new Set(sorted.flatMap((p) => p.tools || []));
    if (style.startsWith("icon")) { box.innerHTML = ICONS[style] || ICONS.icon1; return; }
    if (style === "stats") {
      box.innerHTML = [[sorted.length, "Projects"], [cats.length, "Categories"], [tools.size, "Tools"]]
        .map(([n, l]) => `<span class="peek-stat"><b>${n}</b><span>${l}</span></span>`).join("");
    } else if (style === "cats") {
      box.innerHTML = cats.slice(0, 5).map(([c, n]) => `<span class="peek-chip">${esc(c)}<b>${n}</b></span>`).join("")
        + (cats.length > 5 ? `<span class="peek-chip peek-chip--more">+${cats.length - 5}</span>` : "");
    } else if (style === "years") {
      const max = Math.max(...years.map((y) => y[1]));
      box.innerHTML = years.slice(-4).map(([y, n]) => `<span class="peek-year"><span class="peek-year__bar" style="height:${Math.round((n / max) * 100)}%"><b>${n}</b></span><span class="peek-year__label">${y}</span></span>`).join("");
    } else if (style === "donut") {
      const C = ["#FF2E63", "#08D9D6", "#252A34", "#FF8AA8"];
      let acc = 0; const total = sorted.length;
      const top = cats.slice(0, 4), rest = total - top.reduce((a, c) => a + c[1], 0);
      const stops = [...top.map((c, i) => [C[i], c[1]]), ...(rest ? [["#D5D7DC", rest]] : [])]
        .map(([col, n]) => { const a = acc; acc += n; return `${col} ${(a / total) * 360}deg ${(acc / total) * 360}deg`; }).join(",");
      box.innerHTML = `<span class="peek-donut" style="background:conic-gradient(${stops})"><span><b>${total}</b>Projects</span></span>`;
    } else {
      box.innerHTML = sorted.slice(0, 4).map((p) => `<img src="${esc(p.thumb)}" alt="" loading="lazy" />`).join("");
    }
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
    const home = $(".nav a[href='#top']"), prof = $(".nav a[href='#profile']"), cont = $(".nav a[href='#contact']");
    const cover = $("#top"), profile = $("#profile"), contact = $("#contact");
    // 휴대폰 · 태블릿 구역 이동: 프로필 + 오른쪽 바와 같은 목록
    const jump = $("#jump"), jBtn = $("#jumpBtn"), jPanel = $("#jumpPanel"), jNow = $("#jumpNow");
    const jItems = [{ href: "#profile", label: "Profile" }, ...items.map((x) => ({ href: x.a.getAttribute("href"), label: $(".side__label", x.a).textContent }))];
    $("#jumpList").innerHTML = jItems.map((x) => `<li><a href="${x.href}">${esc(x.label)}</a></li>`).join("");
    const jLinks = $$("#jumpList a");
    const openJ = (open) => { jPanel.hidden = !open; jBtn.setAttribute("aria-expanded", String(open)); jump.classList.toggle("is-open", open); if (open) jLinks.find((a) => a.classList.contains("is-on"))?.focus(); };
    jBtn.addEventListener("click", () => openJ(jPanel.hidden));
    jPanel.addEventListener("click", (e) => { if (e.target.closest("a")) openJ(false); });
    document.addEventListener("click", (e) => { if (!jPanel.hidden && !jump.contains(e.target)) openJ(false); });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !jPanel.hidden) { openJ(false); jBtn.focus(); } });
    const fill = $("#sideFill");
    const set = (a, on) => { if (!a) return; a.classList.toggle("is-on", on); if (on) a.setAttribute("aria-current", "true"); else a.removeAttribute("aria-current"); };
    let ticking = false;
    function update() {
      ticking = false;
      const probe = window.scrollY + window.innerHeight * 0.4;
      // 위 메뉴: 표지에서는 Home, 그 아래는 Profile
      const inHome = probe < profile.offsetTop;
      const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4;
      const inContact = !!contact && (probe >= contact.offsetTop || atBottom);
      set(home, inHome); set(prof, !inHome && !inContact); set(cont, inContact);
      // 구역 이동 버튼: 표지가 지나면 보이고, 지금 구역 이름을 보여줘요
      const jIdx = jItems.reduce((k, x, i) => { const t = $(x.href); return t && !t.hidden && t.offsetTop <= probe ? i : k; }, 0);
      const jLast = atBottom ? jItems.length - 1 : jIdx;
      jLinks.forEach((a, i) => { a.classList.toggle("is-on", i === jLast); if (i === jLast) a.setAttribute("aria-current", "true"); else a.removeAttribute("aria-current"); });
      jNow.textContent = jItems[jLast] ? jItems[jLast].label : "";
      jump.classList.toggle("is-visible", window.scrollY > cover.offsetHeight * 0.6);
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
