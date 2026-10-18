/* ============================================================
   bg.js — ROPE ambient background
   Decorative canvas only. No simulation logic is changed.
   ============================================================ */
(function () {
    var canvas = document.getElementById('bg-particles');
    if (!canvas) return;

    var ctx = canvas.getContext('2d');
    if (!ctx) return;

    var pts = [];

    function resize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }

    resize();
    window.addEventListener('resize', resize);

    for (var i = 0; i < 55; i++) {
        pts.push({
            x: Math.random() * window.innerWidth,
            y: Math.random() * window.innerHeight,
            vx: (Math.random() - 0.5) * 0.08,
            vy: (Math.random() - 0.5) * 0.08,
            r: Math.random() * 1.3 + 0.3,
            a: Math.random() * 0.055 + 0.015
        });
    }

    (function draw() {
        requestAnimationFrame(draw);
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        for (var i = 0; i < pts.length; i++) {
            var p = pts[i];

            p.x += p.vx;
            p.y += p.vy;

            if (p.x < 0) p.x = canvas.width;
            if (p.x > canvas.width) p.x = 0;
            if (p.y < 0) p.y = canvas.height;
            if (p.y > canvas.height) p.y = 0;

            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(180, 165, 245, ' + p.a + ')';
            ctx.fill();
        }
    })();
})();
