/* ============================================================
   sims/shm.js — Damped Spring-Mass Oscillator (SHM)
   ============================================================ */

function SHMSim(engine) {
    SimBase.call(this, engine);
    this.p = { m: 2, k: 10, A: 3, gamma: 0.2 };
    this.y = 0;
    this.v = 0;
    this._springMesh       = null;
    this._springBasePos    = null;
}
SHMSim.prototype = Object.create(SimBase.prototype);
SHMSim.prototype.constructor = SHMSim;

SHMSim.prototype._setup = function () {
    /* Ceiling anchor */
    var ceil = this._add(new THREE.Mesh(
        new THREE.BoxGeometry(4, 0.5, 2),
        new THREE.MeshStandardMaterial({ color: 0x1e2e50 })
    ));
    ceil.position.y = 6;

    /* Mass block */
    this._mass = this._add(new THREE.Mesh(
        new THREE.BoxGeometry(1.5, 1.5, 1.5),
        new THREE.MeshStandardMaterial({ color: 0x63caff, metalness: 0.3, roughness: 0.5 })
    ));
    this._mass.castShadow = true;

    /* Velocity arrow */
    this._vArr = this._add(new THREE.ArrowHelper(
        new THREE.Vector3(0, 1, 0),
        new THREE.Vector3(0, 0, 0),
        1, 0xa8ff78
    ));

    this.camera.position.set(0, 2, 15);

    /* High-quality spring (TubeGeometry helix) */
    this._createSpringMesh();

    /* Show energy bars */
    document.getElementById('energy-container').style.display = 'block';
    this._buildEnergyUI();
};

SHMSim.prototype._createSpringMesh = function () {
    var pathPoints = [];
    var height = 6, turns = 8, radius = 0.6;
    for (var i = 0; i <= 100; i++) {
        var t     = i / 100;
        var angle = t * TAU * turns;
        pathPoints.push(new THREE.Vector3(
            radius * Math.cos(angle),
            6 - (t * height),
            radius * Math.sin(angle)
        ));
    }
    var curve    = new THREE.CatmullRomCurve3(pathPoints);
    var geometry = new THREE.TubeGeometry(curve, 100, 0.15, 3, false);
    var material = new THREE.MeshStandardMaterial({ color: 0x8899cc, metalness: 0.8, roughness: 0.2 });
    this._springMesh = new THREE.Mesh(geometry, material);
    this._add(this._springMesh);
    this._springBasePos = geometry.attributes.position.array.slice();
};

SHMSim.prototype._buildEnergyUI = function () {
    document.getElementById('energy-container').innerHTML =
        '<div class="energy-section-title">Energy Conservation</div>' +
        '<div class="energy-row"><span class="energy-label" style="color:var(--accent-lime)">KE</span>' +
        '<div class="energy-track"><div class="energy-fill" id="ke-fill" style="background:var(--accent-lime)"></div></div>' +
        '<span class="energy-val" id="ke-val">—</span></div>' +
        '<div class="energy-row"><span class="energy-label" style="color:var(--accent-orange)">PE</span>' +
        '<div class="energy-track"><div class="energy-fill" id="pe-fill" style="background:var(--accent-orange)"></div></div>' +
        '<span class="energy-val" id="pe-val">—</span></div>' +
        '<div class="energy-row"><span class="energy-label" style="color:var(--accent-cyan)">Tot</span>' +
        '<div class="energy-track"><div class="energy-fill" id="et-fill" style="background:var(--accent-cyan)"></div></div>' +
        '<span class="energy-val" id="et-val">—</span></div>';
};

SHMSim.prototype.reset = function () {
    this._st = 0;
    this.y   = this.p.A;
    this.v   = 0;
};

SHMSim.prototype._buildGui = function () {
    var self = this;
    this.gui = new lil.GUI({
        title: 'Damped Oscillator',
        container: document.getElementById('gui-container'),
        width: 320
    });
    this.gui.add(this.p, 'm',     0.5, 10,  0.5 ).name('Mass (kg)');
    this.gui.add(this.p, 'k',     1,   50,  1   ).name('Spring Constant k (N/m)');
    this.gui.add(this.p, 'A',     0.5, 5,   0.1 ).name('Amplitude (m)').onChange(function () { self.reset(); });
    this.gui.add(this.p, 'gamma', 0,   1,   0.01).name('Damping Coeff');
    this.gui.add({ reset: function () { self.reset(); } }, 'reset').name('↺ Reset');
};

SHMSim.prototype.update = function (t, dt) {
    if (this._st === 0) this.reset();
    if (!SimBase.prototype.update.call(this, t, dt)) return;

    /* Damped SHM: F = -kx - 2mγv */
    var F_spring = -this.p.k * this.y;
    var F_damp   = -2 * this.p.m * this.p.gamma * this.v;
    var a        = (F_spring + F_damp) / this.p.m;
    this.v += a  * dt;
    this.y += this.v * dt;

    this._mass.position.set(0, this.y, 0);
    this._setArr(
        this._vArr,
        new THREE.Vector3(0, Math.sign(this.v), 0),
        clamp(Math.abs(this.v) / 5, 0.2, 3),
        this._mass.position
    );

    /* Deform spring geometry by scaling Y from pivot */
    if (this._springMesh && this._springBasePos) {
        var posAttr   = this._springMesh.geometry.attributes.position;
        var arr       = posAttr.array;
        var topY      = 6;
        var botY      = this.y + 0.75;
        var scale     = (topY - botY) / 6;
        for (var i = 0; i < arr.length; i += 3) {
            arr[i]   = this._springBasePos[i];
            arr[i+2] = this._springBasePos[i+2];
            arr[i+1] = 6 - ((6 - this._springBasePos[i+1]) * scale);
        }
        posAttr.needsUpdate = true;
    }

    /* Energy calculations */
    var ke   = 0.5 * this.p.m * this.v * this.v;
    var pe   = 0.5 * this.p.k * this.y * this.y;
    var et   = ke + pe;
    var maxE = 0.5 * this.p.k * this.p.A * this.p.A;
    document.getElementById('ke-fill').style.width = clamp(ke / maxE * 100, 0, 100) + '%';
    document.getElementById('pe-fill').style.width = clamp(pe / maxE * 100, 0, 100) + '%';
    document.getElementById('et-fill').style.width = clamp(et / maxE * 100, 0, 100) + '%';
    document.getElementById('ke-val').textContent  = ke.toFixed(2) + ' J';
    document.getElementById('pe-val').textContent  = pe.toFixed(2) + ' J';
    document.getElementById('et-val').textContent  = et.toFixed(2) + ' J';

    var omega0 = Math.sqrt(this.p.k / this.p.m);
    document.getElementById('overlay-text').innerHTML =
        'Damped harmonic oscillator. Energy dissipates through the damping term. ' +
        'When γ > ω₀, the system is overdamped and does not oscillate.';
    document.getElementById('formula-container').innerHTML =
        '<div class="formula-block"><div class="formula-label">Dynamics</div>' +
        'ω₀ = √(k/m) = ' + omega0.toFixed(3) + ' rad/s<br>' +
        'T₀ = 2π/ω₀ = ' + (TAU / omega0).toFixed(3) + ' s<br>' +
        'Critical damping: γ_c = ω₀ = ' + omega0.toFixed(3) + '</div>';

    document.getElementById('live-values').innerHTML = [
        { l: 'x',    v: this.y.toFixed(3) + ' m'   },
        { l: 'v',    v: this.v.toFixed(3) + ' m/s' },
        { l: 'E_tot',v: et.toFixed(2)     + ' J'   }
    ].map(function (c) {
        return '<div class="live-chip">' + c.l + ': <span>' + c.v + '</span></div>';
    }).join('');
};
