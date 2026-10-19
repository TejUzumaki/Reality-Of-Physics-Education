/* R.O.P.E. — Ordered simulation registry */

var SIM_ORDER = [
    "wave",
    "shm",
    "pendulum",
    "proj",
    "circular",
    "collision",
    "gravity"
];

var SIMS = {
    wave: {
        Cls: WaveSim,
        title: "Wave Superposition",
        sub: "v = fλ | Non-dispersive medium",
        icon: "≈",
        subtext: "v = fλ",
        section: "Waves & Oscillation"
    },
    shm: {
        Cls: SHMSim,
        title: "Spring-Mass System",
        sub: "Damped Harmonic Oscillator",
        icon: "⟳",
        subtext: "F = −kx",
        section: "Waves & Oscillation"
    },
    pendulum: {
        Cls: PendulumSim,
        title: "Simple Pendulum",
        sub: "Large-Angle Physics (Exact)",
        icon: "◡",
        subtext: "T = 2π√(L/g)",
        section: "Waves & Oscillation"
    },
    proj: {
        Cls: ProjSim,
        title: "Projectile Motion",
        sub: "With Aerodynamic Drag",
        icon: "⌒",
        subtext: "Quadratic drag",
        section: "Kinematics & Dynamics"
    },
    circular: {
        Cls: CircSim,
        title: "Circular Motion",
        sub: "Centripetal Force & Acceleration",
        icon: "◎",
        subtext: "aₓ = ω²r",
        section: "Kinematics & Dynamics"
    },
    collision: {
        Cls: CollSim,
        title: "1D Collisions",
        sub: "Momentum & Restitution",
        icon: "⇄",
        subtext: "p = mv",
        section: "Kinematics & Dynamics"
    },
    gravity: {
        Cls: GravitySim,
        title: "Orbital Mechanics",
        sub: "Static Sun (Velocity Verlet)",
        icon: "🪐",
        subtext: "F = GM₁M₂/r²",
        section: "Gravity & Orbits"
    }
};

var PRESETS = {
    wave: {
        "2d": { pos: [0, 0, 28], target: [0, 0, 0] },
        "3d": { pos: [0, 10, 28], target: [0, 0, 0] }
    },
    shm: {
        "2d": { pos: [0, 2, 20], target: [0, 2, 0] },
        "3d": { pos: [0, 2, 15], target: [0, 2, 0] }
    },
    pendulum: {
        "2d": { pos: [0, 3, 25], target: [0, 3, 0] },
        "3d": { pos: [0, 4, 18], target: [0, 3, 0] }
    },
    proj: {
        "2d": { pos: [-10, 15, 60], target: [20, 5, 0] },
        "3d": { pos: [-10, 15, 40], target: [20, 5, 0] }
    },
    circular: {
        "2d": { pos: [0, 50, 0.1], target: [0, 0, 0] },
        "3d": { pos: [0, 15, 22], target: [0, 0, 0] }
    },
    gravity: {
        "2d": { pos: [0, 50, 0.1], target: [0, 0, 0] },
        "3d": { pos: [0, 20, 40], target: [0, 0, 0] }
    },
    collision: {
        "2d": { pos: [0, 0, 30], target: [0, 0, 0] },
        "3d": { pos: [0, 5, 20], target: [0, 0, 0] }
    },
    default: {
        "2d": { pos: [0, 0, 40], target: [0, 0, 0] },
        "3d": { pos: [0, 10, 30], target: [0, 0, 0] }
    }
};

(function buildSimGrid() {
    var grid = document.getElementById("sim-grid");
    if (!grid) {
        console.error("ROPE: #sim-grid was not found.");
        return;
    }

    grid.replaceChildren();

    var lastSection = null;

    SIM_ORDER.forEach(function (key) {
        var meta = SIMS[key];
        if (!meta) return;

        if (meta.section !== lastSection) {
            lastSection = meta.section;

            var heading = document.createElement("div");
            heading.className = "grid-sec-label";
            heading.textContent = meta.section;
            heading.dataset.section = meta.section;
            grid.appendChild(heading);
        }

        var tile = document.createElement("button");
        tile.type = "button";
        tile.className = "sim-tile rh";
        tile.id = "btn-" + key;
        tile.dataset.key = key;
        tile.setAttribute("aria-label", "Open " + meta.title);

        var icon = document.createElement("div");
        icon.className = "st-icon";
        icon.textContent = meta.icon || "●";

        var text = document.createElement("div");
        text.className = "st-text";

        var name = document.createElement("span");
        name.className = "st-name";
        name.textContent = meta.title;

        var formula = document.createElement("span");
        formula.className = "st-formula";
        formula.textContent = meta.subtext || "";

        var check = document.createElement("div");
        check.className = "st-check";
        check.textContent = "✓";
        check.setAttribute("aria-hidden", "true");

        text.appendChild(name);
        text.appendChild(formula);
        tile.appendChild(icon);
        tile.appendChild(text);
        tile.appendChild(check);

        tile.addEventListener("click", function () {
            switchSim(key);
            closeSheet();
        });

        grid.appendChild(tile);
    });
})();

var _engine = null;
var _curKey = null;

window.switchSim = function (key) {
    if (!SIMS[key] || key === _curKey) return;

    var overlay = document.getElementById("transition-overlay");
    if (overlay) overlay.classList.add("active");

    setTimeout(function () {
        var meta = SIMS[key];
        var simInstance = new meta.Cls(_engine);

        simInstance.cameraPresets = PRESETS[key] || PRESETS.default;
        _engine.loadSim(simInstance);
        _curKey = key;

        var title = document.getElementById("sim-title");
        var subtitle = document.getElementById("sim-subtitle");
        var badge = document.getElementById("overlay-sim-badge");

        if (title) title.textContent = meta.title;
        if (subtitle) subtitle.textContent = meta.sub;
        if (badge) badge.textContent = meta.title;

        SIM_ORDER.forEach(function (simKey) {
            var item = document.getElementById("btn-" + simKey);
            if (item) {
                var active = simKey === key;
                item.classList.toggle("active", active);
                item.setAttribute("aria-pressed", String(active));
            }
        });

        if (overlay) overlay.classList.remove("active");
    }, 380);
};

window.addEventListener("DOMContentLoaded", function () {
    window._ghostEnabled = false;

    _engine = new LabEngine("canvas-container");
    _engine.start();

    _curKey = null;
    window.switchSim(SIM_ORDER[0]);

    if (typeof updateViewModeUI === "function") {
        updateViewModeUI();
    }

    setTimeout(function () {
        var loading = document.getElementById("loading-screen");
        if (loading) {
            loading.classList.add("fade-out");
            setTimeout(function () {
                loading.style.display = "none";
            }, 600);
        }
    }, 4000);
});
