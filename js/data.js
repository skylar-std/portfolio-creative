/* =========================================
   내용 불러오기 (Supabase)
   - 사이트의 모든 내용은 Supabase DB에 있어요. 고치는 곳: Supabase → Table Editor → schema 'portfolio'
   - 주소 뒤 ?v=코드 로 직무를 고르면, DB가 그 직무 내용만 돌려줘요.
     코드가 없거나 틀리면 기본 직무(Design)가 보여요.
   - DB 주소와 공개 키는 js/db.js 에 있어요.
   ========================================= */
(function () {
  "use strict";

  const TRACK = "creative";
  const ADMIN_KEY = "pf-admin-mode";
  const LINKS_KEY = "pf-admin-links";

  const code = (new URLSearchParams(location.search).get("v") || "").trim();
  const $ = (s) => document.querySelector(s);
  const ym = (d, sep) => (d ? d.slice(0, 4) + sep + d.slice(5, 7) : "");
  const domReady = new Promise((ok) => (document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", ok) : ok()));

  /* DB 모양 → 화면 코드가 쓰는 모양 */
  function toRole(d) {
    const groups = [];
    (d.skills || []).forEach((s) => {
      let g = groups.find((x) => x.title === s.group);
      if (!g) groups.push((g = { title: s.group, items: [] }));
      g.items.push([s.name, s.icon]);
    });
    return {
      id: d.role.id, label: d.role.label, eyebrow: d.role.eyebrow || "",
      title: d.role.hero_title || "", desc: d.role.hero_desc || "",
      marquee: d.role.marquee || [], skills: groups,
    };
  }
  function toProject(p) {
    return {
      id: p.id, title: p.title, summary: p.summary, desc: p.description || "",
      category: (p.category || "").toLowerCase(), categoryLabel: p.category || "",
      date: ym(p.date, "-"), featured: p.featured, type: p.kind, client: p.client || "", role: p.my_role || "",
      did: p.did || [], tools: p.tools || [], tags: p.tags || [],
      result: p.result_value ? { value: p.result_value, label: p.result_label || "" } : null,
      thumb: p.thumb, image: p.image || p.thumb,
      link: (p.links && (p.links.detail || p.links.behance || p.links.demo)) || "",
      period: p.period_label || "",
      detail: p.detail || {},
      problem: p.problem || "", action: p.action || "", resultText: p.result || "", team: p.team || "",
    };
  }
  function toResume(rows) {
    const k = (kind) => rows.filter((r) => r.kind === kind);
    const d = (x) => ym(x, ".");
    return {
      education: k("education").map((r) => ({ school: r.title, major: r.detail || "", status: r.status || "", start: d(r.start_date), end: d(r.end_date) })),
      experience: k("experience").map((r) => ({ company: r.title, role: r.detail || "", desc: r.description || "", start: d(r.start_date), end: d(r.end_date) })),
      training: k("training").map((r) => ({ title: r.title, org: r.org || "", desc: r.description || "", start: d(r.start_date), end: d(r.end_date) })),
      activities: k("activity").map((r) => ({ type: r.activity_type, title: r.title, org: r.org || "", role: r.my_role || "", desc: r.description || "", start: d(r.start_date), end: d(r.end_date) })),
      awards: k("award").map((r) => ({ title: r.title, org: r.org || "", desc: r.description || "", date: d(r.start_date) })),
      languages: k("language").map((r) => ({ test: r.title, score: r.score, org: r.org || "", date: d(r.start_date), expires: d(r.expires_date) })),
      certificates: k("certificate").map((r) => ({ name: r.title, org: r.org || "", date: d(r.start_date) })),
    };
  }

  /* 공통: 페이지 제목, 다른 페이지로 가는 링크에 같은 직무 코드 붙이기 */
  window.keepLink = (path) => {
    const [p, hash] = path.split("#");
    const sep = p.includes("?") ? "&" : "?";
    return `${p}${code ? `${sep}v=${encodeURIComponent(code)}` : ""}${hash ? `#${hash}` : ""}`;
  };
  window.esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  /* 프로젝트 카드: 메인 미리보기 · 프로젝트 목록에서 같이 써요 */
  window.projectCard = (p) => `
    <a class="card" href="${window.esc(window.keepLink(`project.html?id=${encodeURIComponent(p.id)}`))}">
      <span class="card__img"><img src="${window.esc(p.thumb)}" alt="" loading="lazy" /></span>
      <span class="card__meta">${window.esc(p.categoryLabel)}${p.date ? ` · ${window.esc(p.date.replace("-", "."))}` : ""}</span>
      <strong class="card__title">${window.esc(p.title)}</strong>
      ${p.summary ? `<span class="card__sum">${window.esc(p.summary)}</span>` : ""}
      ${p.role ? `<span class="card__role"><b>역할</b>${window.esc(p.role)}</span>` : ""}
    </a>`;
  window.emptyCard = () => `
    <div class="card card--empty" role="note">
      <span class="card__img" aria-hidden="true"></span>
      <strong class="card__title">준비 중인 프로젝트</strong>
      <span class="card__sum">새 프로젝트가 정리되는 대로 이곳에 올라와요.</span>
    </div>`;

  function apply(R) {
    document.documentElement.dataset.role = R.id;
    if (!document.body.dataset.keepTitle) document.title = `박영희 | ${R.label} Portfolio`;
    document.querySelectorAll("a[data-keep]").forEach((a) => { a.href = window.keepLink(a.getAttribute("data-keep")); });
  }

  /* 관리자 막대: 관리 페이지에서 로그인하고 '관리자 모드'를 켠 브라우저에만 보여요 */
  function adminBar(currentId) {
    let links = null;
    try {
      if (localStorage.getItem(ADMIN_KEY) !== "1") return;
      links = JSON.parse(localStorage.getItem(LINKS_KEY) || "null");
    } catch (e) { return; }
    const mine = (links || []).filter((l) => l.track === TRACK);
    const bar = document.createElement("div");
    bar.className = "admin-bar";
    bar.setAttribute("role", "toolbar");
    bar.setAttribute("aria-label", "관리자 직무 전환");
    bar.innerHTML = `<span>admin</span>${mine.map((l) =>
      `<button type="button" data-c="${l.code}" aria-pressed="${l.id === currentId}">${l.label}</button>`).join("")}<a href="manage.html">관리</a>`;
    bar.addEventListener("click", (e) => {
      const b = e.target.closest("button[data-c]");
      if (!b) return;
      const url = new URL(location.href);
      url.searchParams.set("v", b.dataset.c);
      location.href = url.toString();
    });
    document.body.appendChild(bar);
  }

  document.documentElement.classList.add("is-loading");
  window.PROJECTS = [];
  window.RESUME = null;
  window.PROJECTS_READY = Promise.all([window.rpc("get_portfolio", { p_track: TRACK, p_code: code || null }), domReady])
    .then(([d]) => {
      if (!d || !d.role) throw new Error("empty");
      const R = toRole(d);
      window.ROLE = R.id;
      window.ROLE_DATA = R;
      window.PROJECTS = (d.projects || []).map(toProject).sort((a, b) => b.date.localeCompare(a.date));
      window.RESUME = toResume(d.resume || []);
      apply(R);
      adminBar(R.id);
    })
    .catch(() => {
      domReady.then(() => {
        const m = document.createElement("p");
        m.className = "load-error";
        m.textContent = "내용을 불러오지 못했어요. 잠시 후 새로고침해 주세요.";
        document.body.prepend(m);
      });
    })
    .finally(() => document.documentElement.classList.remove("is-loading"));
})();
