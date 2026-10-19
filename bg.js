/* ============================================================
   R.O.P.E. — Ambient Background Particles
   Monochrome, low-contrast and lightweight.
   ============================================================ */

(function () {
  "use strict";

  var canvas = document.getElementById("bg-particles");
  if (!canvas) return;

  var ctx = canvas.getContext("2d");
  if (!ctx) return;

  var pts = [];
  var particleCount = 48;

  function resize() {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(window.innerWidth * dpr);
    canvas.height = Math.round(window.innerHeight * dpr);

    canvas.style.width = window.innerWidth + "px";
    canvas.style.height = window.innerHeight + "px";

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  resize();
  window.addEventListener("resize", resize, { passive: true });

  for (var i = 0; i < particleCount; i++) {
    pts.push({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      vx: (Math.random() - 0.5) * 0.07,
      vy: (Math.random() - 0.5) * 0.07,
      r: Math.random() * 1.2 + 0.35,
      a: Math.random() * 0.055 + 0.015
    });
  }

  function draw() {
    requestAnimationFrame(draw);

    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

    for (var i = 0; i < pts.length; i++) {
      var p = pts[i];

      p.x += p.vx;
      p.y += p.vy;

      if (p.x < 0) p.x = window.innerWidth;
      if (p.x > window.innerWidth) p.x = 0;
      if (p.y < 0) p.y = window.innerHeight;
      if (p.y > window.innerHeight) p.y = 0;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(235,235,235," + p.a + ")";
      ctx.fill();
    }
  }

  draw();
})();
