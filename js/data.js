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
  const icon = (name, label) => (name
    ? `<img src="img/icons/${name}.svg" alt="" width="20" height="20" />`
    : `<b aria-hidden="true">${label.charAt(0)}</b>`);

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

  /* 표지 · 흐르는 띠 · 스킬 채우기 */
  function apply(R) {
    document.documentElement.dataset.role = R.id;
    document.title = `박영희 | ${R.label} Portfolio`;
    const put = (sel, html) => { const el = $(sel); if (el) el.innerHTML = html; };
    put("#heroEyebrow", R.eyebrow);
    put("#heroTitle", R.title);
    put("#heroDesc", R.desc);
    const words = R.marquee.map((w) => `<span>${w}</span><span>✦</span>`).join("");
    put("#marqueeTrack", words + words);
    put("#skillsGrid", R.skills.map((c) => `
      <div class="skill-card reveal is-visible">
        <h3>${c.title}</h3>
        <ul>${c.items.map(([label, ico]) => `<li><span class="skill-icon">${icon(ico, label)}</span>${label}</li>`).join("")}</ul>
      </div>`).join(""));
    // 다른 페이지로 가는 링크에도 같은 코드를 붙여요
    document.querySelectorAll("a[data-keep]").forEach((a) => {
      const [path, hash] = a.getAttribute("data-keep").split("#");
      a.href = `${path}${code ? `?v=${encodeURIComponent(code)}` : ""}${hash ? `#${hash}` : ""}`;
    });
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
