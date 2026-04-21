/* ============================================================
   sims/collision.js — 1D Elastic / Inelastic Collisions
   Coefficient of restitution e: 1 = elastic, 0 = perfectly inelastic
   ============================================================ */

function CollSim(engine) {
    SimBase.call(this, engine);
    this.p     = { m1: 3, v1: 5, m2: 2, v2: -3, e: 1 };
    this.state = 'idle';
    this.x1    = -10;
    this.x2    =  10;
    this._collided = false;
}
CollSim.prototype = Object.create(SimBase.prototype);
CollSim.prototype.constructor = CollSim;

CollSim.prototype._setup = function () {
    this._add(new THREE.GridHelper(40, 40, 0x1a2a4a, 0x111a2e));

    /* Ball 1 — cyan */
    this._s1 = this._add(new THREE.Mesh(
        new THREE.SphereGeometry(0.6),
        new THREE.MeshStandardMaterial({ color: 0x63caff, metalness: 0.5, roughness: 0.3 })
    ));

    /* Ball 2 — orange */
    this._s2 = this._add(new THREE.Mesh(
        new THREE.SphereGeometry(0.5),
        new THREE.MeshStandardMaterial({ color: 0xff9f45, metalness: 0.5, roughness: 0.3 })
    ));

    this.camera.position.set(0, 5, 20);
    this.engine.orbit.target.set(0, 0, 0);

    /* Momentum / KE bars */
    document.getElementById('momentum-container').style.display = 'block';
    document.getElementById('momentum-container').innerHTML =
        '<div class="energy-section-title">Conservation Metrics</div>' +
        '<div class="energy-row">' +
        '<span class="energy-label" style="color:var(--accent-cyan)">p</span>' +
        '<div class="energy-track"><div class="energy-fill" id="p-fill" style="background:var(--accent-cyan);width:50%"></div></div>' +
        '<span class="energy-val" id="p-val">—</span></div>' +
        '<div class="energy-row">' +
        '<span class="energy-label" style="color:var(--accent-lime)">KE</span>' +
        '<div class="energy-track"><div class="energy-fill" id="cke-fill" style="background:var(--accent-lime);width:50%"></div></div>' +
        '<span class="energy-val" id="cke-val">—</span></div>';
};

CollSim.prototype._buildGui = function () {
    var self = this;
    this.gui = new lil.GUI({
        title: '1D Collision',
        container: document.getElementById('gui-container'),
        width: 320
    });

    var f1 = this.gui.addFolder('Object 1 (Cyan)');
    f1.add(this.p, 'm1', 0.1, 10, 0.1).name('Mass (kg)');
    f1.add(this.p, 'v1', -10, 10, 0.5).name('Velocity (m/s)');
    f1.open();

    var f2 = this.gui.addFolder('Object 2 (Orange)');
    f2.add(this.p, 'm2', 0.1, 10, 0.1).name('Mass (kg)');
    f2.add(this.p, 'v2', -10, 10, 0.5).name('Velocity (m/s)');
    f2.open();

    this.gui.add(this.p, 'e', 0, 1, 0.01).name('Restitution (e)');

    this.gui.add({
        start: function () {
            self.state      = 'running';
            self._st        = 0;
            self._collided  = false;
            self.x1 = -10;
            self.x2 =  10;
        }
    }, 'start').name('▶ Start');

    this.gui.add({
        reset: function () {
            self.state     = 'idle';
            self._collided = false;
            self.x1 = -10;
            self.x2 =  10;
        }
    }, 'reset').name('↺ Reset');
};

CollSim.prototype.update = function (t, dt) {
    if (!SimBase.prototype.update.call(this, t, dt)) return;

    if (this.state === 'idle') {
        this._s1.position.x = this.x1;
        this._s2.position.x = this.x2;
        this._updateOverlay(false);
        return;
    }
    if (this.state === 'done') return;

    this.x1 += this.p.v1 * dt;
    this.x2 += this.p.v2 * dt;
    this._s1.position.x = this.x1;
    this._s2.position.x = this.x2;

    /* Collision detection: when balls overlap and approaching each other */
    if (!this._collided && Math.abs(this.x1 - this.x2) <= 1.1 && this.p.v1 > this.p.v2) {
        this._collided = true;
        var v1 = this.p.v1, v2 = this.p.v2;
        var m1 = this.p.m1, m2 = this.p.m2, e = this.p.e;

        /* General collision formulas (coefficient of restitution) */
        var v1f = (m1*v1 + m2*v2 - m2*e*(v1-v2)) / (m1+m2);
        var v2f = (m1*v1 + m2*v2 + m1*e*(v1-v2)) / (m1+m2);
        this.p.v1 = v1f;
        this.p.v2 = v2f;

        /* Update momentum bar */
        var pi  = m1*v1  + m2*v2;
        var pf  = m1*v1f + m2*v2f;
        var kei = 0.5*m1*v1*v1   + 0.5*m2*v2*v2;
        var kef = 0.5*m1*v1f*v1f + 0.5*m2*v2f*v2f;

        document.getElementById('p-fill').style.width   = '100%';
        document.getElementById('p-val').textContent    = pf.toFixed(2) + ' kg·m/s';
        document.getElementById('cke-fill').style.width = clamp(kef / (kei+EPS) * 100, 0, 100) + '%';
        document.getElementById('cke-val').textContent  = kef.toFixed(2) + ' J';
        this._updateOverlay(true, pi, pf, kei, kef);
        return;
    }

    /* Scale balls with mass */
    this._s1.scale.setScalar(clamp(Math.pow(this.p.m1, 1/3) * 0.8, 0.5, 2));
    this._s2.scale.setScalar(clamp(Math.pow(this.p.m2, 1/3) * 0.8, 0.5, 2));

    if (!this._collided) this._updateOverlay(false);
};

CollSim.prototype._updateOverlay = function (collided, pi, pf, kei, kef) {
    if (!collided) {
        document.getElementById('overlay-text').innerHTML =
            'Set initial masses and velocities, then press Start. ' +
            'Restitution e = 1: elastic. e = 0: perfectly inelastic.';
        document.getElementById('formula-container').innerHTML =
            '<div class="formula-block"><div class="formula-label">General Collision</div>' +
            'v₁f = (m₁v₁ + m₂v₂ − m₂·e(v₁−v₂)) / (m₁+m₂)<br>' +
            'v₂f = (m₁v₁ + m₂v₂ + m₁·e(v₁−v₂)) / (m₁+m₂)</div>';
    } else {
        var loss = (kei - kef);
        document.getElementById('overlay-text').innerHTML =
            'Collision complete! Momentum is always conserved. ' +
            'Kinetic energy loss = ' + loss.toFixed(2) + ' J (converted to heat/sound).';
        document.getElementById('formula-container').innerHTML =
            '<div class="formula-block"><div class="formula-label">Results</div>' +
            'p_initial = ' + pi.toFixed(2) + ' kg·m/s<br>' +
            'p_final   = ' + pf.toFixed(2) + ' kg·m/s<br>' +
            'KE_loss   = ' + loss.toFixed(2) + ' J</div>';
    }

    document.getElementById('live-values').innerHTML = [
        { l: 'x₁', v: this.x1.toFixed(1) + ' m' },
        { l: 'x₂', v: this.x2.toFixed(1) + ' m' },
        { l: 'v₁', v: this.p.v1.toFixed(2) + ' m/s' },
        { l: 'v₂', v: this.p.v2.toFixed(2) + ' m/s' }
    ].map(function (c) {
        return '<div class="live-chip">' + c.l + ': <span>' + c.v + '</span></div>';
    }).join('');
};
