/* R.O.P.E. — Interface refinement
   Formula strip, KaTeX, draggable/resizable controls, adaptive sliders.
   The physics engine and simulation implementations remain untouched.
*/
(function () {
  "use strict";

  if (window.__ROPE_REFINEMENT_V3__) return;
  window.__ROPE_REFINEMENT_V3__ = true;

  const STYLE_ID = "rope-refinement-v3-style";
  const EQUATION_ID = "rope-equation-strip";

  const FORMULAS = {
    wave: String.raw`y(x,t)=A_1\sin(k_1x-\omega_1t)+A_2\sin(k_2x-\omega_2t)`,
    shm: String.raw`m\ddot{x}+kx=0,\qquad \omega_0=\sqrt{\frac{k}{m}}`,
    pendulum: String.raw`T_0=2\pi\sqrt{\frac{L}{g}}`,
    proj: String.raw`x(t)=v_0\cos\theta\,t,\qquad y(t)=v_0\sin\theta\,t-\frac{1}{2}gt^2`,
    circular: String.raw`a_c=\frac{v^2}{r}=r\omega^2`,
    collision: String.raw`m_1u_1+m_2u_2=m_1v_1+m_2v_2`,
    gravity: String.raw`F=\frac{GMm}{r^2},\qquad v_{\mathrm{orb}}=\sqrt{\frac{GM}{r}}`
  };

  const SIM_NAMES = {
    wave: "Wave Superposition",
    shm: "Spring-Mass System",
    pendulum: "Simple Pendulum",
    proj: "Projectile Motion",
    circular: "Circular Motion",
    collision: "1D Collisions",
    gravity: "Orbital Mechanics"
  };

  const STYLE = `
    :root {
      --rope-ref-bg: #101010;
      --rope-ref-panel: #151515;
      --rope-ref-line: #363636;
      --rope-ref-text: #ededed;
      --rope-ref-muted: #929292;
      --rope-ref-accent: #dedede;
    }

    /* Header branding stays; equations have their own row below it. */
    #top-bar .tb-logo {
      font-size: 19px !important;
      font-weight: 800 !important;
      letter-spacing: .045em !important;
    }

    #top-bar .tb-dot {
      display: none !important;
    }

    #top-bar .tb-logo::first-letter {
      letter-spacing: .02em;
    }

    #${EQUATION_ID} {
      position: fixed;
      z-index: 105;
      top: calc(var(--topbar-h, 64px) + 7px);
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      align-items: center;
      justify-content: center;
      box-sizing: border-box;
      width: max-content;
      max-width: min(94vw, 900px);
      min-height: 34px;
      padding: 5px 15px;
      overflow: hidden;
      color: #e8e8e8;
      background: rgba(12,12,12,.88);
      border: 1px solid rgba(255,255,255,.12);
      border-radius: 7px;
      font-size: 15px;
      line-height: 1.5;
      text-align: center;
      pointer-events: none;
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
    }

    #${EQUATION_ID} .katex {
      font-size: 1em;
      color: inherit;
    }

    #${EQUATION_ID} .katex-display {
      margin: 0;
    }

    #${EQUATION_ID}:empty {
      display: none;
    }

    @media (max-width: 600px) {
      #${EQUATION_ID} {
        top: calc(var(--topbar-h, 64px) + 5px);
        max-width: 96vw;
        min-height: 29px;
        padding: 4px 8px;
        font-size: 12px;
      }
    }

    /* Keep the equation strip separate from the header badges. */
    #view-badge,
    #mode-badge {
      flex-shrink: 0;
    }

    /* Main edge control panel: restrained monochrome styling. */
    #rope-control-panel {
      box-sizing: border-box !important;
      gap: 4px !important;
      padding: 8px 6px !important;
      color: var(--rope-ref-text) !important;
      background: rgba(15,15,15,.97) !important;
      border-color: var(--rope-ref-line) !important;
      box-shadow: 0 10px 30px rgba(0,0,0,.35) !important;
      backdrop-filter: blur(16px) !important;
      -webkit-backdrop-filter: blur(16px) !important;
      transition:
        opacity .18s ease,
        visibility .18s ease,
        box-shadow .18s ease !important;
    }

    #rope-control-panel .rope-panel-header {
      cursor: grab;
      user-select: none;
      -webkit-user-select: none;
      touch-action: pan-y;
    }

    #rope-control-panel .rope-panel-header:active {
      cursor: grabbing;
    }

    #rope-control-panel .rope-panel-title {
      color: #ededed !important;
      font-size: 9px !important;
      letter-spacing: .12em !important;
    }

    #rope-control-panel .rope-panel-close {
      color: #bcbcbc !important;
      background: transparent !important;
      border: 1px solid #363636 !important;
      border-radius: 6px !important;
    }

    #rope-control-panel .fab-row {
      box-sizing: border-box;
      min-width: 0;
      margin: 0 !important;
      padding: 2px !important;
      border-radius: 7px !important;
    }

    #rope-control-panel .fab {
      box-sizing: border-box !important;
      width: 100% !important;
      min-width: 0 !important;
      min-height: 35px !important;
      padding: 7px !important;
      color: #cfcfcf !important;
      background: transparent !important;
      border: 1px solid transparent !important;
      border-radius: 6px !important;
      box-shadow: none !important;
    }

    #rope-control-panel .fab svg {
      width: 17px !important;
      height: 17px !important;
      stroke: currentColor !important;
      stroke-width: 1.7 !important;
    }

    #rope-control-panel .fab-lbl {
      color: #a8a8a8 !important;
      font-size: 9px !important;
      letter-spacing: .01em !important;
    }

    #rope-control-panel .fab:hover,
    #rope-control-panel .fab.on,
    #rope-control-panel .fab.ghost-on,
    #rope-control-panel .fab.paused {
      color: #fff !important;
      background: #252525 !important;
      border-color: #454545 !important;
    }

    #rope-control-panel .fab:hover .fab-lbl,
    #rope-control-panel .fab.on .fab-lbl {
      color: #f4f4f4 !important;
    }

    /* Native resize handles for the left and right edge panels. */
    #rope-control-panel.from-left,
    #rope-control-panel.from-right {
      width: 112px;
      min-width: 64px;
      max-width: min(42vw, 300px);
      height: auto;
      min-height: 190px;
      max-height: calc(100dvh - 24px);
      overflow: auto;
      resize: horizontal;
      scrollbar-width: thin;
      scrollbar-color: #454545 transparent;
      flex-direction: column;
      justify-content: flex-start;
    }

    #rope-control-panel.from-left {
      border-left: 0 !important;
      border-radius: 0 10px 10px 0 !important;
    }

    #rope-control-panel.from-right {
      border-right: 0 !important;
      border-radius: 10px 0 0 10px !important;
    }

    #rope-control-panel.from-left .rope-panel-header,
    #rope-control-panel.from-right .rope-panel-header {
      flex-direction: row;
      align-items: center;
      justify-content: space-between;
      padding: 0 0 7px;
      border-bottom: 1px solid var(--rope-ref-line);
    }

    #rope-control-panel.from-left .fab-row,
    #rope-control-panel.from-right .fab-row {
      width: 100% !important;
    }

    /* Bottom panel can be resized vertically. */
    #rope-control-panel.from-bottom {
      width: min(620px, calc(100vw - 24px));
      min-width: 250px;
      max-width: calc(100vw - 12px);
      height: 104px;
      min-height: 68px;
      max-height: 45dvh;
      overflow: auto;
      resize: vertical;
      scrollbar-width: thin;
      scrollbar-color: #454545 transparent;
      border-radius: 10px 10px 0 0 !important;
      align-items: stretch;
      justify-content: flex-start;
      padding: 7px 9px !important;
    }

    #rope-control-panel.from-bottom .rope-panel-header {
      min-width: 54px;
      flex-direction: column;
      justify-content: center;
      padding: 0 8px 0 0;
      border-right: 1px solid var(--rope-ref-line);
      border-bottom: 0;
    }

    #rope-control-panel.from-bottom .fab-row {
      flex: 0 0 54px;
      width: 54px !important;
      align-self: stretch;
    }

    #rope-control-panel.from-bottom .fab {
      height: 100% !important;
    }

    /* Adaptive compact mode: labels yield space to useful controls. */
    #rope-control-panel.rope-compact .rope-panel-title {
      display: none !important;
    }

    #rope-control-panel.rope-compact .rope-panel-header {
      justify-content: center !important;
      padding-bottom: 5px !important;
    }

    #rope-control-panel.rope-compact .fab-lbl {
      display: none !important;
    }

    #rope-control-panel.rope-compact .fab {
      min-height: 32px !important;
      padding: 6px !important;
    }

    #rope-control-panel.from-bottom.rope-compact .fab-row {
      flex-basis: 42px;
      width: 42px !important;
    }

    /* The simulation-control drawer is independently resizable. */
    #ctrl-drawer {
      box-sizing: border-box !important;
      min-width: 210px !important;
      min-height: 130px !important;
      width: min(340px, 86vw) !important;
      max-width: 94vw !important;
      max-height: 86dvh !important;
      overflow: auto !important;
      resize: both;
      background: #111 !important;
      border: 1px solid #363636 !important;
      border-radius: 10px !important;
      box-shadow: 0 14px 38px rgba(0,0,0,.45) !important;
      scrollbar-width: thin;
      scrollbar-color: #454545 transparent;
    }

    #ctrl-drawer .drawer-hdr {
      min-height: 43px !important;
      height: 43px !important;
      padding: 0 12px !important;
      background: #151515 !important;
      border-bottom: 1px solid #333 !important;
      cursor: grab;
      user-select: none;
      -webkit-user-select: none;
      touch-action: none;
    }

    #ctrl-drawer .drawer-hdr:active {
      cursor: grabbing;
    }

    #ctrl-drawer .drawer-ttl {
      color: #ededed !important;
      font-size: 11px !important;
      letter-spacing: .09em !important;
    }

    #ctrl-drawer .drawer-body {
      box-sizing: border-box !important;
      padding: 9px !important;
      overflow: auto !important;
    }

    /* lil-gui controls: compact labels and track-with-ball sliders. */
    #ctrl-drawer .lil-gui,
    #ctrl-drawer .lil-gui.root {
      width: 100% !important;
      max-width: 100% !important;
      background: transparent !important;
      color: #dedede !important;
      border: 0 !important;
      box-shadow: none !important;
      font-size: 11px !important;
    }

    #ctrl-drawer .lil-gui .title {
      min-height: 27px !important;
      line-height: 27px !important;
      padding-left: 7px !important;
      color: #eee !important;
      background: #1c1c1c !important;
      border-bottom: 1px solid #333 !important;
      font-size: 10px !important;
      letter-spacing: .04em !important;
    }

    #ctrl-drawer .lil-gui .controller {
      min-height: 31px !important;
      padding: 4px 6px !important;
      border-bottom: 1px solid rgba(255,255,255,.055) !important;
    }

    #ctrl-drawer .lil-gui .controller .name {
      color: #bdbdbd !important;
      font-size: 10px !important;
      line-height: 1.3 !important;
    }

    #ctrl-drawer .lil-gui .widget {
      min-width: 0 !important;
    }

    #ctrl-drawer .lil-gui input,
    #ctrl-drawer .lil-gui select {
      color: #f0f0f0 !important;
      background: #202020 !important;
      border: 1px solid #3b3b3b !important;
      border-radius: 4px !important;
      font-size: 10px !important;
    }

    #ctrl-drawer .lil-gui input[type="range"] {
      accent-color: #dedede !important;
      cursor: ew-resize;
    }

    #ctrl-drawer .lil-gui .slider {
      position: relative !important;
      min-height: 17px !important;
      overflow: visible !important;
      background: #3a3a3a !important;
      border-radius: 999px !important;
      cursor: ew-resize !important;
    }

    #ctrl-drawer .lil-gui .slider .slider-fg {
      background: #c9c9c9 !important;
      border-radius: 999px !important;
    }

    #ctrl-drawer .lil-gui .slider::after {
      content: "";
      position: absolute;
      z-index: 2;
      top: 50%;
      left: var(--rope-slider-position, 50%);
      width: 12px;
      height: 12px;
      transform: translate(-50%, -50%);
      background: #f1f1f1;
      border: 2px solid #151515;
      border-radius: 50%;
      box-shadow: 0 0 0 1px rgba(255,255,255,.3);
      pointer-events: none;
    }

    #ctrl-drawer .lil-gui .slider:hover::after {
      box-shadow: 0 0 0 3px rgba(255,255,255,.12);
    }

    #ctrl-drawer .lil-gui .controller:hover {
      background: rgba(255,255,255,.025) !important;
    }

    #ctrl-drawer.rope-drawer-compact .lil-gui .controller {
      min-height: 27px !important;
      padding: 3px 5px !important;
    }

    #ctrl-drawer.rope-drawer-compact .lil-gui .controller .name {
      font-size: 9px !important;
    }

    @media (max-width: 520px) {
      #ctrl-drawer {
        min-width: 190px !important;
        width: min(300px, 90vw) !important;
      }

      #ctrl-drawer .drawer-body {
        padding: 6px !important;
      }

      #rope-control-panel.from-left,
      #rope-control-panel.from-right {
        width: 92px;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      #rope-control-panel,
      #ctrl-drawer,
      #${EQUATION_ID} {
        transition: none !important;
      }
    }
  `;

  function addStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = STYLE;
    document.head.appendChild(style);
  }

  function loadKatex(callback) {
    if (window.katex) {
      callback();
      return;
    }

    if (window.__ropeKatexLoading) {
      window.__ropeKatexCallbacks = window.__ropeKatexCallbacks || [];
      window.__ropeKatexCallbacks.push(callback);
      return;
    }

    window.__ropeKatexLoading = true;
    window.__ropeKatexCallbacks = [callback];

    const css = document.createElement("link");
    css.rel = "stylesheet";
    css.href = "https://cdn.jsdelivr.net/npm/katex@0.16.22/dist/katex.min.css";
    document.head.appendChild(css);

    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/katex@0.16.22/dist/katex.min.js";
    script.onload = function () {
      window.__ropeKatexLoading = false;
      (window.__ropeKatexCallbacks || []).forEach(function (fn) {
        try { fn(); } catch (error) { console.error("ROPE KaTeX:", error); }
      });
      window.__ropeKatexCallbacks = [];
      renderAllMath();
    };
    script.onerror = function () {
      window.__ropeKatexLoading = false;
      console.warn("ROPE: KaTeX could not load. Check your internet connection.");
    };
    document.head.appendChild(script);
  }

  function activeSimulationKey() {
    if (typeof window._curKey === "string" && FORMULAS[window._curKey]) {
      return window._curKey;
    }

    const title = (document.getElementById("sim-title")?.textContent || "").toLowerCase();

    if (title.includes("wave")) return "wave";
    if (title.includes("spring") || title.includes("shm")) return "shm";
    if (title.includes("pendulum")) return "pendulum";
    if (title.includes("projectile")) return "proj";
    if (title.includes("circular")) return "circular";
    if (title.includes("collision")) return "collision";
    if (title.includes("orbital") || title.includes("gravity")) return "gravity";

    return "wave";
  }

  function ensureEquationStrip() {
    let strip = document.getElementById(EQUATION_ID);
    if (strip) return strip;

    strip = document.createElement("div");
    strip.id = EQUATION_ID;
    strip.setAttribute("role", "status");
    strip.setAttribute("aria-label", "Active simulation equation");

    const topbar = document.getElementById("top-bar");
    if (topbar && topbar.parentNode) {
      topbar.parentNode.insertBefore(strip, topbar.nextSibling);
    } else {
      document.body.appendChild(strip);
    }

    return strip;
  }

  function renderTex(element, tex, displayMode) {
    if (!element || !window.katex || !tex) return;

    try {
      window.katex.render(tex, element, {
        throwOnError: false,
        strict: "ignore",
        displayMode: !!displayMode,
        output: "html"
      });
    } catch (error) {
      element.textContent = tex;
    }
  }

  function renderHeaderEquation() {
    const strip = ensureEquationStrip();
    const key = activeSimulationKey();
    const formula = FORMULAS[key];

    if (!formula) {
      strip.textContent = "";
      return;
    }

    if (strip.dataset.formula === formula && strip.dataset.key === key) return;

    strip.dataset.formula = formula;
    strip.dataset.key = key;

    if (window.katex) renderTex(strip, formula, false);
    else strip.textContent = formula;
  }

  function renderAllMath() {
    if (!window.katex) return;

    renderHeaderEquation();

    /* Render the canonical equation on every simulation-library tile. */
    document.querySelectorAll(".sim-tile, .sim-card, [data-sim-key]").forEach(function (tile) {
      const key =
        tile.dataset.simKey ||
        tile.dataset.key ||
        tile.getAttribute("data-sim") ||
        "";

      const formula = FORMULAS[key];
      const target = tile.querySelector(".st-formula, .sim-formula, .formula");

      if (formula && target && target.dataset.ropeTex !== formula) {
        target.dataset.ropeTex = formula;
        renderTex(target, formula, false);
      }
    });

    /* Existing formula blocks are typeset when they contain TeX delimiters. */
    document.querySelectorAll(
      ".formula-block, #formula-container, .analysis-formula, [data-katex]"
    ).forEach(function (element) {
      if (element.dataset.ropeMathRendered === "1") return;

      let source = element.getAttribute("data-katex");
      if (!source) source = element.textContent.trim();

      const match = source.match(/^\$\$([\s\S]+)\$\$$|^\$([\s\S]+)\$$|^\\\\\(([\s\S]+)\\\\\)$/);
      if (!match) return;

      const tex = match[1] || match[2] || match[3];
      if (!tex) return;

      element.dataset.ropeMathRendered = "1";
      renderTex(element, tex, !!match[1]);
    });
  }

  function installAdaptivePanel(panel) {
    if (!panel || panel.dataset.ropeAdaptiveInstalled === "1") return;
    panel.dataset.ropeAdaptiveInstalled = "1";

    const update = function () {
      const width = panel.getBoundingClientRect().width;
      panel.classList.toggle("rope-compact", width < 88);
    };

    if ("ResizeObserver" in window) {
      new ResizeObserver(update).observe(panel);
    }
    update();
  }

  function installDraggable(panel, handle, mode) {
    if (!panel || !handle || handle.dataset.ropeDragInstalled === "1") return;
    handle.dataset.ropeDragInstalled = "1";

    let active = false;
    let startX = 0;
    let startY = 0;
    let baseLeft = 0;
    let baseTop = 0;
    let pointerId = null;

    handle.addEventListener("pointerdown", function (event) {
      if (event.target.closest("button")) return;
      if (event.pointerType === "mouse" && event.button !== 0) return;

      const rect = panel.getBoundingClientRect();
      active = true;
      pointerId = event.pointerId;
      startX = event.clientX;
      startY = event.clientY;
      baseLeft = rect.left;
      baseTop = rect.top;

      panel.classList.add("rope-is-dragging");
      handle.style.cursor = "grabbing";

      try { handle.setPointerCapture(pointerId); } catch (_) {}
      event.preventDefault();
    });

    handle.addEventListener("pointermove", function (event) {
      if (!active || event.pointerId !== pointerId) return;

      const dx = event.clientX - startX;
      const dy = event.clientY - startY;
      const rect = panel.getBoundingClientRect();

      const left = Math.max(0, Math.min(
        window.innerWidth - Math.min(rect.width, window.innerWidth),
        baseLeft + dx
      ));

      const top = Math.max(0, Math.min(
        window.innerHeight - Math.min(rect.height, window.innerHeight),
        baseTop + dy
      ));

      panel.style.left = left + "px";
      panel.style.top = top + "px";
      panel.style.right = "auto";
      panel.style.bottom = "auto";
      panel.style.transform = "none";
      panel.dataset.ropeManuallyPositioned = "1";
    });

    function finish(event) {
      if (!active) return;
      if (event && pointerId !== null && event.pointerId !== pointerId) return;
      active = false;
      pointerId = null;
      panel.classList.remove("rope-is-dragging");
      handle.style.cursor = "";
    }

    handle.addEventListener("pointerup", finish);
    handle.addEventListener("pointercancel", finish);
    window.addEventListener("blur", finish);
  }

  function installDrawerDragging() {
    const drawer = document.getElementById("ctrl-drawer");
    const header = drawer?.querySelector(".drawer-hdr");

    if (!drawer || !header) return;

    installDraggable(drawer, header, "drawer");

    if ("ResizeObserver" in window) {
      new ResizeObserver(function () {
        const width = drawer.getBoundingClientRect().width;
        drawer.classList.toggle("rope-drawer-compact", width < 270);
      }).observe(drawer);
    }
  }

  function installEdgePanelDragging() {
    const panel = document.getElementById("rope-control-panel");
    const header = panel?.querySelector(".rope-panel-header");

    if (!panel || !header) return;

    installAdaptivePanel(panel);
    installDraggable(panel, header, "edge-panel");
  }

  function updateSliderKnobs() {
    document.querySelectorAll("#ctrl-drawer .lil-gui .slider").forEach(function (slider) {
      const fg = slider.querySelector(".slider-fg");
      if (!fg) return;

      const width = fg.getBoundingClientRect().width;
      const total = slider.getBoundingClientRect().width;
      if (!total) return;

      const percent = Math.max(0, Math.min(100, (width / total) * 100));
      slider.style.setProperty("--rope-slider-position", percent + "%");
    });
  }

  function keepEquationBelowHeader() {
    const strip = document.getElementById(EQUATION_ID);
    const topbar = document.getElementById("top-bar");
    if (!strip || !topbar) return;

    const rect = topbar.getBoundingClientRect();
    strip.style.top = Math.max(0, rect.bottom + 6) + "px";
  }

  function update() {
    renderHeaderEquation();
    installEdgePanelDragging();
    installDrawerDragging();
    updateSliderKnobs();
    keepEquationBelowHeader();
  }

  function start() {
    addStyles();
    ensureEquationStrip();

    const logo = document.querySelector("#top-bar .tb-logo");
    if (logo) {
      logo.textContent = "R.O.P.E.";
      logo.setAttribute("aria-label", "R.O.P.E.");
    }

    loadKatex(function () {
      renderAllMath();
      renderHeaderEquation();
    });

    update();

    const observer = new MutationObserver(function () {
      renderHeaderEquation();
      renderAllMath();
      installEdgePanelDragging();
      installDrawerDragging();
    });

    observer.observe(document.body, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ["class", "data-sim-key"]
    });

    window.addEventListener("resize", keepEquationBelowHeader, { passive: true });

    /* Poll for simulation switches and newly created lil-gui controls. */
    window.setInterval(update, 500);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
})();
