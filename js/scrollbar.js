/* =========================================
   페이지 스크롤바 (모든 페이지 공통)
   - 기본 스크롤바는 위 메뉴 · 아래 풋터 옆까지 길게 지나가서 숨기고,
     메뉴 아래부터 풋터 위까지만 얇은 막대를 직접 그려요.
     (풋터가 화면에 올라오면 그만큼 막대 끝이 위로 올라가요)
   - 끌어서 움직이거나, 빈 곳을 눌러 그 위치로 이동할 수 있어요.
   ========================================= */
(function () {
  "use strict";
  const bar = document.createElement("div");
  bar.className = "sbar";
  bar.setAttribute("aria-hidden", "true");
  bar.innerHTML = '<span class="sbar__thumb"></span>';
  const thumb = bar.firstChild;
  const doc = document.documentElement;
  let thumbH = 0, trackH = 0, ticking = false;

  function update() {
    ticking = false;
    const max = doc.scrollHeight - window.innerHeight;
    const foot = document.querySelector(".foot");
    const footIn = foot ? Math.max(0, window.innerHeight - foot.getBoundingClientRect().top) : 0;
    bar.style.bottom = `${footIn}px`;
    trackH = bar.clientHeight;
    bar.classList.toggle("is-on", max > 4);
    if (max <= 4) return;
    thumbH = Math.max(36, trackH * (window.innerHeight / doc.scrollHeight));
    thumb.style.height = `${thumbH}px`;
    thumb.style.transform = `translateY(${(window.scrollY / max) * (trackH - thumbH)}px)`;
  }
  const on = () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } };

  // 끌기
  let startY = 0, startScroll = 0;
  thumb.addEventListener("pointerdown", (e) => {
    e.preventDefault(); e.stopPropagation();
    startY = e.clientY; startScroll = window.scrollY;
    thumb.setPointerCapture(e.pointerId); bar.classList.add("is-drag");
  });
  thumb.addEventListener("pointermove", (e) => {
    if (!bar.classList.contains("is-drag")) return;
    const max = doc.scrollHeight - window.innerHeight;
    window.scrollTo({ top: startScroll + ((e.clientY - startY) / Math.max(1, trackH - thumbH)) * max, behavior: "instant" });
  });
  const end = () => bar.classList.remove("is-drag");
  thumb.addEventListener("pointerup", end);
  thumb.addEventListener("pointercancel", end);
  // 빈 곳 누르기 → 그 위치로
  bar.addEventListener("pointerdown", (e) => {
    if (e.target === thumb) return;
    const r = bar.getBoundingClientRect();
    const k = (e.clientY - r.top - thumbH / 2) / Math.max(1, trackH - thumbH);
    window.scrollTo({ top: Math.max(0, Math.min(1, k)) * (doc.scrollHeight - window.innerHeight) });
  });

  function start() {
    document.body.appendChild(bar);
    window.addEventListener("scroll", on, { passive: true });
    window.addEventListener("resize", on);
    // 내용이 나중에 채워져(DB) 길이가 바뀌어도 따라가요
    if ("ResizeObserver" in window) new ResizeObserver(on).observe(document.body);
    update();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})();
