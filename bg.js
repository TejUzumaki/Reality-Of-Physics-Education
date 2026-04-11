/* ============================================================
   bg.js — Ambient Background Particles
   Draws slow-drifting particles on a 2D canvas behind the app.
   ============================================================ */

(function () {
    var canvas = document.getElementById('bg-particles');
    var ctx    = canvas.getContext('2d');
    var pts    = [];

    function resize() {
        canvas.width  = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    /* Create particles */
    for (var i = 0; i < 55; i++) {
        pts.push({
            x:  Math.random() * 3000,
            y:  Math.random() * 2000,
            vx: (Math.random() - 0.5) * 0.08,
            vy: (Math.random() - 0.5) * 0.08,
            r:  Math.random() * 1.5 + 0.3,
            a:  Math.random() * 0.07 + 0.02
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
            if (p.x > canvas.width)  p.x = 0;
            if (p.y < 0) p.y = canvas.height;
            if (p.y > canvas.height) p.y = 0;

            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(99, 202, 255, ' + p.a + ')';
            ctx.fill();
        }
    })();
})();
