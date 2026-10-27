/* =========================================
   포트폴리오 PDF 쪽 만들기 (portfolio-pdf.html)
   - 표지 → 프로필 → 이력 → 목차 → 대표 프로젝트(프로젝트마다 2쪽) → 마지막 쪽
   - 대표 프로젝트: 메인과 같은 규칙 (DB featured 켠 것, 없으면 최신순) 최대 4개
   - About Me · 연락처 · SNS 는 index.html 에 적힌 내용을 그대로 가져와요
   ========================================= */
(function () {
  "use strict";
  const SITE = "https://sua-apply.github.io/portfolio-creative/";
  const MAX_PROJECTS = 4;
  const esc = (s) => window.esc(s);
  const pad2 = (n) => String(n).padStart(2, "0");
  const KINDS = { personal: "개인 프로젝트", team: "팀 프로젝트", contest: "공모전", school: "학교 과제", client: "외주" };
  const HEX = /^#[0-9a-f]{3,8}$/i;
  const NOW_YM = (() => { const d = new Date(); return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}`; })();

  // index.html 에서 About Me · 기본 정보 · 연락처 읽기
  async function readIndex() {
    try {
      const html = await fetch("index.html").then((r) => r.text());
      const doc = new DOMParser().parseFromString(html, "text/html");
      const facts = [...doc.querySelectorAll(".facts--profile > div")].map((d) => [d.querySelector("dt")?.textContent.trim(), d.querySelector("dd")?.textContent.trim()]);
      const groups = [...doc.querySelectorAll(".contact__group")].map((g) => ({
        title: g.querySelector(".contact__label")?.textContent.trim() || "",
        items: [...g.querySelectorAll("a.sns__item")].map((a) => ({
          href: a.getAttribute("href"), platform: a.querySelector(".sns__platform")?.textContent.trim(), name: a.querySelector(".sns__name")?.textContent.trim(),
        })),
      }));
      return {
        about: [...doc.querySelectorAll(".profile__text .prose p")].map((p) => p.innerHTML.trim()),
        photo: doc.querySelector(".profile__photo")?.getAttribute("src") || "img/profile.svg",
        facts, mail: doc.querySelector(".contact__mail")?.textContent.trim() || "", sns: groups,
        contactTitle: doc.querySelector(".contact__title")?.textContent.trim() || "",
      };
    } catch (e) {
      return { about: [], photo: "img/profile.svg", facts: [], mail: "", sns: [], contactTitle: "" };
    }
  }

  const foot = (label) => `<div class="foot"><span><b>PARK Younghee</b> · Portfolio · ${esc(label)}</span><span class="pg"></span></div>`;
  const head = (num, title, en) => `<header class="ph"><span class="ph__num">${num}</span><h2 class="ph__title">${esc(title)}</h2>${en ? `<span class="ph__en">${esc(en)}</span>` : ""}</header>`;

  /* 1. 표지 */
  function cover(R, first, info) {
    const mail = info.mail;
    return `<section class="page page--navy">
      <div class="cover">
        <div class="cover__text">
          <p class="cover__tag"><i></i>PORTFOLIO ${new Date().getFullYear()}</p>
          <h1 class="cover__title">${R.title || "생각을 <em>형태</em>로,<br />형태를 <em>경험</em>으로."}</h1>
          ${R.eyebrow ? `<p class="cover__eyebrow">${esc(R.eyebrow)}</p>` : ""}
          <div class="cover__name"><strong>박영희</strong><span>PARK Younghee</span></div>
          <p class="cover__meta">${mail ? `<a href="mailto:${esc(mail)}">${esc(mail)}</a>` : ""}<a href="${SITE}">${SITE.replace(/^https:\/\//, "").replace(/\/$/, "")}</a></p>
        </div>
        <figure class="cover__art">${first ? `<img src="${esc(first.image || first.thumb)}" alt="" />` : ""}<span class="cover__year">SELECTED WORK</span></figure>
      </div>
    </section>`;
  }

  /* 2. 프로필 + 스킬 */
  function profile(R, info, num) {
    const skills = (R.skills || []).filter((g) => g.items.length);
    return `<section class="page">
      <div class="page__in">
        ${head(num, "Profile", "About Me · Skills")}
        <div class="profile">
          <aside class="profile__side">
            <img class="profile__photo" src="${esc(info.photo)}" alt="" />
            <div class="profile__name"><strong>박영희</strong><span>PARK Younghee</span></div>
            <dl class="facts">${info.facts.filter(([k]) => k && k !== "이름").map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join("")}</dl>
          </aside>
          <div class="profile__main">
            <div class="about"><p class="k" style="margin-bottom:3mm">About Me</p>${info.about.map((p) => `<p>${p}</p>`).join("")}</div>
            ${skills.length ? `<div><p class="k" style="margin-bottom:3mm">Skills &amp; Tools</p><div class="skills">${skills.map((g) => `
              <div class="skills__col"><h3>${esc(g.title)} <small>${g.items.length}</small></h3>
                <ul>${g.items.map(([label, icon]) => `<li>${icon ? `<img src="img/icons/${esc(icon)}.svg" alt="" />` : ""}${esc(label)}</li>`).join("")}</ul></div>`).join("")}</div></div>` : ""}
          </div>
        </div>
      </div>${foot("Profile")}
    </section>`;
  }

  /* 3. 이력 (비어 있는 칸은 빼요) */
  function resume(RS, num) {
    if (!RS) return "";
    const range = (s, e) => [s, e].filter(Boolean).join(" – ");
    const blocks = [
      ["학력", (RS.education || []).map((x) => [range(x.start, x.end), x.school, [x.major, x.status].filter(Boolean).join(" · ")])],
      ["경력", (RS.experience || []).map((x) => [range(x.start, x.end), x.company, x.role])],
      ["교육", (RS.training || []).map((x) => [range(x.start, x.end), x.title, x.org])],
      ["활동", (RS.activities || []).map((x) => [range(x.start, x.end), x.title, [x.org, x.role].filter(Boolean).join(" · ")])],
      ["수상", (RS.awards || []).map((x) => [x.date, x.title, x.org])],
      ["어학", (RS.languages || []).filter((x) => !(x.expires && x.expires < NOW_YM)).map((x) => [x.date, `${x.test}${x.score ? ` ${x.score}` : ""}`, x.org])],
      ["자격증", (RS.certificates || []).map((x) => [x.date, x.name, x.org])],
    ].filter(([, rows]) => rows.length);
    if (!blocks.length) return "";
    return `<section class="page">
      <div class="page__in">
        ${head(num, "Resume", "Education · Experience · Certificates")}
        <div class="resume resume--${Math.min(blocks.length, 3)}">${blocks.map(([t, rows]) => `
          <div class="rblock"><h3>${t} <small>${rows.length}</small></h3>
            ${rows.map(([d, a, b]) => `<div class="rrow"><time>${esc(d)}</time><div><strong>${esc(a)}</strong>${b ? `<span>${esc(b)}</span>` : ""}</div></div>`).join("")}
          </div>`).join("")}</div>
      </div>${foot("Resume")}
    </section>`;
  }

  /* 4. 목차 */
  function toc(list, startPage, num) {
    return `<section class="page">
      <div class="page__in">
        ${head(num, "Selected Work", `${list.length} Projects`)}
        <div class="toc" style="--n:${Math.max(3, list.length)}">${list.map((p, i) => `
          <a href="#pj-${i + 1}">
            <span class="toc__img"><img src="${esc(p.thumb)}" alt="" /></span>
            <span class="toc__no">${pad2(i + 1)}</span>
            <strong class="toc__title">${esc(p.title)}</strong>
            <span class="toc__meta">${esc(p.categoryLabel)}${p.date ? ` · ${esc(p.date.slice(0, 4))}` : ""}</span>
            <span class="toc__pg">p. ${pad2(startPage + i * 2)}</span>
          </a>`).join("")}</div>
        <p class="toc-note">전체 프로젝트와 작업 과정은 웹에서 볼 수 있어요 → <a href="${SITE}works.html">${SITE.replace(/^https:\/\//, "")}works.html</a></p>
      </div>${foot("Selected Work")}
    </section>`;
  }

  /* 5. 프로젝트 첫 쪽: 큰 이미지 + 정보 */
  function projectA(p, i) {
    const kind = KINDS[p.type] || (p.client ? "외주" : "개인 프로젝트");
    const teamM = /(\d+)\s*인/.exec(p.team || "");
    const pct = p.contribution != null ? Math.max(0, Math.min(100, Math.round(p.contribution))) : null;
    const facts = [
      ["기간", esc(p.period || p.date.replace("-", "."))],
      ["구분", esc(kind)],
      ["주최 · 발주", p.client && esc(p.client)],
      ["참여", esc(teamM ? `팀 ${teamM[1]}인` : p.team || "") + (pct != null ? ` <span class="pct"><i><b style="width:${pct}%"></b></i>기여도 ${pct}%</span>` : "")],
      ["역할", p.role && esc(p.role)],
    ].filter(([, v]) => v);
    return `<section class="page" id="pj-${i + 1}">
      <div class="pj">
        <figure class="pj__art"><img src="${esc(p.image || p.thumb)}" alt="" /></figure>
        <div class="pj__info">
          <p class="pj__no">PROJECT ${pad2(i + 1)}</p>
          <p class="pj__meta">${esc(p.categoryLabel)}${p.date ? ` · ${esc(p.date.slice(0, 4))}` : ""}</p>
          <h2 class="pj__title">${esc(p.title)}</h2>
          ${p.summary ? `<p class="pj__sum">${esc(p.summary)}</p>` : ""}
          <dl class="pj__facts">${facts.map(([k, v], i) => `<div${k === "참여" ? ' class="pj__gap"' : ""}><dt>${k}</dt><dd>${v}</dd></div>`).join("")}</dl>
          ${(p.tools || []).length ? `<div><p class="k" style="margin-bottom:2mm">Tools</p><div class="chips">${p.tools.map((t) => `<span class="chip">${esc(t)}</span>`).join("")}</div></div>` : ""}
          <p class="pj__link">자세한 과정 → <a href="${SITE}project.html?id=${encodeURIComponent(p.id)}">웹에서 보기</a></p>
        </div>
      </div>${foot(p.title)}
    </section>`;
  }

  /* 6. 프로젝트 둘째 쪽: 한눈에 보기 + 핵심 두 가지 */
  function highlights(p) {
    const secs = (p.detail && p.detail.sections) || [];
    const find = (t) => secs.find((s) => s.type === t);
    const boxes = [];
    if ((p.did || []).length) boxes.push(["작업 범위", "What I did", `<ol class="did">${p.did.slice(0, 6).map((d, i) => `<li><b>${pad2(i + 1)}</b>${esc(d)}</li>`).join("")}</ol>`]);
    const pal = find("palette");
    if (pal && (pal.colors || []).length) boxes.push([pal.title || "컬러", "Visual", `<ul class="sw">${pal.colors.filter((c) => HEX.test(c.hex)).slice(0, 8).map((c) => `<li><i style="background:${c.hex}"></i><strong>${esc(c.name)}</strong><code>${esc(c.hex.toUpperCase())}</code></li>`).join("")}</ul>`]);
    const cards = find("cards");
    if (cards && (cards.items || []).length) boxes.push([cards.title || "콘셉트", "Concept", `<ul class="minis">${cards.items.slice(0, 3).map((it) => `<li>${it.kicker ? `<span>${esc(it.kicker)}</span>` : ""}<strong>${esc(it.title)}</strong>${esc(it.desc || "")}</li>`).join("")}</ul>`]);
    const proc = find("process");
    if (proc && (proc.steps || []).length) boxes.push([proc.title || "과정", "Process", `<ol class="steps">${proc.steps.slice(0, 5).map((st, i) => `<li><span>${pad2(i + 1)}</span><strong>${esc(st.title)}</strong><span>${esc(st.desc || "")}</span></li>`).join("")}</ol>`]);
    const cast = find("cast");
    if (cast && (cast.items || []).length) boxes.push([cast.title || "캐릭터", "Characters", `<ul class="cast">${cast.items.slice(0, 5).map((it) => `<li><i style="background:${HEX.test(it.color) ? it.color : "#ddd"}"></i><strong>${esc(it.name)}</strong>${it.sound ? `<em>${esc(it.sound)}</em>` : ""}<small>${esc(it.note || "")}</small></li>`).join("")}</ul>`]);
    const notes = find("notes");
    if (notes && (notes.items || []).length) boxes.push([notes.title || "돌아보며", "Retrospective", `<ul class="notes">${notes.items.slice(0, 2).map((it) => `<li><strong>${esc(it.title)}</strong>${esc(it.desc || "")}</li>`).join("")}</ul>`]);
    return boxes.slice(0, 2);
  }
  function projectB(p, i) {
    const did = (p.did || []).slice(0, 3);
    const glance = [
      ["문제", p.problem ? `<p>${esc(p.problem)}</p>` : ""],
      ["내가 한 일", p.action ? `<p>${esc(p.action)}</p>` : did.length ? `<ul>${did.map((d) => `<li>${esc(d)}</li>`).join("")}</ul>` : ""],
      ["결과", `${p.result ? `<p><strong>${esc(p.result.value)}</strong> ${esc(p.result.label)}</p>` : ""}${p.resultText ? `<p>${esc(p.resultText)}</p>` : ""}`],
    ].filter(([, v]) => v);
    const boxes = highlights(p);
    if (!glance.length && !boxes.length) return "";
    return `<section class="page">
      <div class="page__in">
        ${head(pad2(i + 1), p.title, "At a glance")}
        ${glance.length ? `<ol class="glance" style="grid-template-columns:repeat(${glance.length},minmax(0,1fr))">${glance.map(([k, v], n) => `<li><span class="glance__no">${pad2(n + 1)}</span><h3>${k}</h3>${v}</li>`).join("")}</ol>` : ""}
        ${boxes.length ? `<div class="hl">${boxes.map(([t, en, body]) => `<div class="hl__box"><h4>${esc(t)}<span class="k">${en}</span></h4>${body}</div>`).join("")}</div>` : ""}
      </div>${foot(p.title)}
    </section>`;
  }

  /* 7. 마지막 쪽 */
  function closing(info) {
    const items = info.sns.flatMap((g) => g.items);
    return `<section class="page page--navy">
      <div class="end">
        <div class="end__l">
          <p class="end__k">CONTACT</p>
          <h2 class="end__title">읽어 주셔서<br /><em>감사합니다.</em></h2>
          ${info.mail ? `<a class="end__mail" href="mailto:${esc(info.mail)}">${esc(info.mail)}</a>` : ""}
        </div>
        <div class="end__r">
          <a class="end__web" href="${SITE}"><span>전체 프로젝트와 작업 과정은 웹 포트폴리오에서</span><strong>${SITE.replace(/^https:\/\//, "")}</strong></a>
          ${items.length ? `<div class="end__sns"><h3>SNS</h3>${items.map((s) => `<a href="${esc(s.href)}"><span>${esc(s.platform)}</span>${esc(s.name)}</a>`).join("")}</div>` : ""}
        </div>
      </div>
    </section>`;
  }

  async function build() {
    await window.PROJECTS_READY;
    const info = await readIndex();
    const R = window.ROLE_DATA || {};
    const sorted = [...(window.PROJECTS || [])].sort((a, b) => b.date.localeCompare(a.date));
    let pick = sorted.filter((p) => p.featured);
    if (!pick.length) pick = sorted;
    pick = pick.slice(0, MAX_PROJECTS);

    let n = 0;
    const num = () => pad2(++n);
    const pages = [cover(R, pick[0], info), profile(R, info, num())];
    const rs = resume(window.RESUME, pad2(n + 1)); if (rs) { n += 1; pages.push(rs); }
    const before = pages.length + 1;            // 목차 다음 쪽 번호
    if (pick.length) pages.push(toc(pick, before + 1, num()));
    pick.forEach((p, i) => { pages.push(projectA(p, i)); const b = projectB(p, i); if (b) pages.push(b); });
    pages.push(closing(info));
    const book = document.getElementById("book");
    book.innerHTML = pages.join("");
    // 쪽 번호
    const all = [...book.querySelectorAll(".page")];
    all.forEach((pg, i) => { const el = pg.querySelector(".pg"); if (el) el.textContent = `${pad2(i + 1)} / ${pad2(all.length)}`; });
    // 목차의 쪽 번호를 실제 위치로 다시 맞추기 (둘째 쪽이 없는 프로젝트가 있을 때)
    book.querySelectorAll(".toc a").forEach((a) => {
      const target = book.querySelector(a.getAttribute("href"));
      const pg = a.querySelector(".toc__pg");
      if (target && pg) pg.textContent = `p. ${pad2(all.indexOf(target) + 1)}`;
    });
    // 이미지를 다 불러온 뒤 '준비 완료' 표시 (PDF 만드는 스크립트가 기다려요)
    await Promise.all([...book.querySelectorAll("img")].map((im) => (im.complete ? 0 : new Promise((ok) => { im.onload = im.onerror = ok; }))));
    if (document.fonts && document.fonts.ready) await document.fonts.ready;
    document.documentElement.dataset.pdfReady = "1";
  }
  build();
})();
