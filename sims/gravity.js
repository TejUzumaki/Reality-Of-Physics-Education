/* ============================================================
   sims/gravity.js — 2-Body Orbital Mechanics (Velocity Verlet)
   Symplectic integrator: conserves energy over long runs
   ============================================================ */

function GravitySim(engine) {
    SimBase.call(this, engine);
    this.p = { G: 10, m1: 500, m2: 10, r: 12 };
    this.r1    = new THREE.Vector3();
    this.v1    = new THREE.Vector3();
    this.r2    = new THREE.Vector3();
    this.v2    = new THREE.Vector3();
    this.a1    = new THREE.Vector3();
    this.a2    = new THREE.Vector3();
    this.trail = [];
    this.MAXTRAIL = 500;
}
GravitySim.prototype = Object.create(SimBase.prototype);
GravitySim.prototype.constructor = GravitySim;

GravitySim.prototype._setup = function () {
    /* Star */
    this._sun = this._add(new THREE.Mesh(
        new THREE.SphereGeometry(1),
        new THREE.MeshStandardMaterial({ color: 0xffaa00, emissive: 0xff4400, emissiveIntensity: 0.9 })
    ));

    /* Point light at star */
    var starLight = new THREE.PointLight(0xffaa00, 1.5, 80);
    this._add(starLight);
    this._starLight = starLight;

    /* Planet */
    this._planet = this._add(new THREE.Mesh(
        new THREE.SphereGeometry(0.5),
        new THREE.MeshStandardMaterial({ color: 0x00aaff, metalness: 0.2, roughness: 0.5 })
    ));

    /* Orbital trail */
    this._trailGeo = new THREE.BufferGeometry();
    this._trailGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(this.MAXTRAIL * 3), 3));
    this._trailLine = this._add(new THREE.Line(
        this._trailGeo,
        new THREE.LineBasicMaterial({ color: 0x00aaff, transparent: true, opacity: 0.4 })
    ));

    this.camera.position.set(0, 20, 40);
    this.engine.orbit.target.set(0, 0, 0);

    this.reset();
};

GravitySim.prototype.reset = function () {
    this._st   = 0;
    this.trail = [];

    var v_circ = Math.sqrt(this.p.G * this.p.m1 / this.p.r);
    this.r1.set(0, 0, 0);
    this.r2.set(this.p.r, 0, 0);
    this.v1.set(0, 0, 0);
    this.v2.set(0, 0, v_circ);
    this._updateAccels();

    /* Scale sizes with mass */
    this._sun.scale.setScalar(Math.pow(this.p.m1, 1/3) * 0.15);
    this._planet.scale.setScalar(Math.pow(this.p.m2, 1/3) * 0.3);
    this._starLight.position.set(0, 0, 0);
};

GravitySim.prototype._updateAccels = function () {
    var d    = new THREE.Vector3().subVectors(this.r2, this.r1);
    var dist = d.length();
    if (dist < 1) dist = 1; /* prevent singularity */
    var fMag = (this.p.G * this.p.m1 * this.p.m2) / (dist * dist);
    var fDir = d.normalize();
    var F1   = fDir.clone().multiplyScalar(fMag);
    var F2   = fDir.clone().multiplyScalar(-fMag);
    this.a1.copy(F1).divideScalar(this.p.m1);
    this.a2.copy(F2).divideScalar(this.p.m2);
};

GravitySim.prototype._buildGui = function () {
    var self = this;
    this.gui = new lil.GUI({
        title: '2-Body Orbit (Verlet)',
        container: document.getElementById('gui-container'),
        width: 320
    });
    this.gui.add(this.p, 'G',  1,   50,   1 ).name('G Constant');
    this.gui.add(this.p, 'm1', 100, 1000, 10).name('Star Mass').onChange(function () { self.reset(); });
    this.gui.add(this.p, 'm2', 1,   50,   1 ).name('Planet Mass').onChange(function () { self.reset(); });
    this.gui.add(this.p, 'r',  5,   30,   1 ).name('Orbital Distance').onChange(function () { self.reset(); });
    this.gui.add({ reset: function () { self.reset(); } }, 'reset').name('↺ Reset Orbit');
};

GravitySim.prototype.update = function (t, dt) {
    SimBase.prototype.update.call(this, t, dt);

    /* Velocity Verlet integration */
    var dt2   = dt * dt;
    this.r1.add(this.v1.clone().multiplyScalar(dt)).add(this.a1.clone().multiplyScalar(0.5 * dt2));
    this.r2.add(this.v2.clone().multiplyScalar(dt)).add(this.a2.clone().multiplyScalar(0.5 * dt2));
    var a1old = this.a1.clone();
    var a2old = this.a2.clone();
    this._updateAccels();
    this.v1.add(a1old.add(this.a1).multiplyScalar(0.5 * dt));
    this.v2.add(a2old.add(this.a2).multiplyScalar(0.5 * dt));

    this._sun.position.copy(this.r1);
    this._planet.position.copy(this.r2);
    this._starLight.position.copy(this.r1);

    /* Trail */
    this.trail.push(this.r2.clone());
    if (this.trail.length > this.MAXTRAIL) this.trail.shift();
    var tp = this._trailGeo.attributes.position.array;
    for (var i = 0; i < this.trail.length; i++) {
        tp[i*3]   = this.trail[i].x;
        tp[i*3+1] = this.trail[i].y;
        tp[i*3+2] = this.trail[i].z;
    }
    this._trailGeo.setDrawRange(0, this.trail.length);
    this._trailGeo.attributes.position.needsUpdate = true;

    /* Orbital metrics */
    var r    = this.r1.distanceTo(this.r2);
    var v    = this.v2.length();
    var KE   = 0.5 * this.p.m2 * v * v;
    var PE   = -(this.p.G * this.p.m1 * this.p.m2) / r;
    var E    = KE + PE;
    var T    = TAU * Math.sqrt(Math.pow(r, 3) / (this.p.G * this.p.m1));

    document.getElementById('overlay-text').innerHTML =
        'Velocity Verlet is a symplectic integrator — it conserves the total orbital energy ' +
        'over long periods. Regular Euler integration would cause the orbit to spiral outward.';
    document.getElementById('formula-container').innerHTML =
        '<div class="formula-block"><div class="formula-label">Orbital Mechanics</div>' +
        'F = GM₁M₂/r² (Newton\'s law)<br>' +
        'v_circ = √(GM₁/r)<br>' +
        'T_orbit ≈ ' + T.toFixed(1) + ' s</div>' +
        '<div class="formula-block"><div class="formula-label">Energy</div>' +
        'KE = ' + KE.toFixed(1) + ' J &nbsp;|&nbsp; PE = ' + PE.toFixed(1) + ' J<br>' +
        'E_total = ' + E.toFixed(1) + ' J</div>';

    document.getElementById('live-values').innerHTML = [
        { l: 'Separation', v: r.toFixed(1) + ' m'   },
        { l: 'v_planet',   v: v.toFixed(2) + ' m/s' },
        { l: 'E_total',    v: E.toFixed(1) + ' J'   }
    ].map(function (c) {
        return '<div class="live-chip">' + c.l + ': <span>' + c.v + '</span></div>';
    }).join('');
};
