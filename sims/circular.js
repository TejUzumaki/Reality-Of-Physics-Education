/* ============================================================
   sims/circular.js — Uniform Circular Motion
   Shows velocity (tangent) and centripetal acceleration vectors
   ============================================================ */

function CircSim(engine) {
    SimBase.call(this, engine);
    this.p = { r: 8, omega: 1.0, m: 1 };
}
CircSim.prototype = Object.create(SimBase.prototype);
CircSim.prototype.constructor = CircSim;

CircSim.prototype._setup = function () {
    this._add(new THREE.GridHelper(30, 30, 0x1a2a4a, 0x111a2e));

    /* Orbit ring */
    this._ring = this._add(this._line([new THREE.Vector3(0, 0, 0)], 0x223355));
    this._updRing();

    /* Particle */
    this._particle = this._add(new THREE.Mesh(
        new THREE.SphereGeometry(0.45),
        new THREE.MeshStandardMaterial({ color: 0x63caff, metalness: 0.4, roughness: 0.3 })
    ));
    this._particle.castShadow = true;

    /* Centre dot */
    this._add(new THREE.Mesh(
        new THREE.SphereGeometry(0.12),
        new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.5 })
    ));

    /* Velocity arrow (green) */
    this._vArr = this._add(new THREE.ArrowHelper(
        new THREE.Vector3(1, 0, 0),
        new THREE.Vector3(0, 0, 0),
        2, 0xa8ff78
    ));

    /* Centripetal acceleration arrow (orange) */
    this._aArr = this._add(new THREE.ArrowHelper(
        new THREE.Vector3(-1, 0, 0),
        new THREE.Vector3(0, 0, 0),
        2, 0xff9f45
    ));

    this.camera.position.set(0, 15, 22);
};

CircSim.prototype._updRing = function () {
    var pts = [];
    for (var i = 0; i <= 64; i++) {
        var a = (i / 64) * TAU;
        pts.push(new THREE.Vector3(this.p.r * Math.cos(a), 0, this.p.r * Math.sin(a)));
    }
    this._ring.geometry.setFromPoints(pts);
};

CircSim.prototype._buildGui = function () {
    var self = this;
    this.gui = new lil.GUI({
        title: 'Circular Motion',
        container: document.getElementById('gui-container'),
        width: 320
    });
    this.gui.add(this.p, 'r',     2,   15,  0.5).name('Radius (m)').onChange(function () { self._updRing(); });
    this.gui.add(this.p, 'omega', 0.1, 5,   0.1).name('Angular Velocity ω (rad/s)');
    this.gui.add(this.p, 'm',     0.1, 10,  0.1).name('Mass (kg)');
};

CircSim.prototype.update = function (t, dt) {
    SimBase.prototype.update.call(this, t, dt);

    var th = this.p.omega * this._st;
    var x  = this.p.r * Math.cos(th);
    var z  = this.p.r * Math.sin(th);
    this._particle.position.set(x, 0, z);

    var v   = this.p.r * this.p.omega;
    var ac  = this.p.omega * this.p.omega * this.p.r;
    var Fc  = this.p.m * ac;

    /* Tangent direction (velocity) */
    var tangent = new THREE.Vector3(-Math.sin(th), 0, Math.cos(th));
    /* Centripetal direction (inward) */
    var centDir = new THREE.Vector3(-Math.cos(th), 0, -Math.sin(th));

    this._setArr(this._vArr, tangent, clamp(v / 5, 0.5, 4),  this._particle.position);
    this._setArr(this._aArr, centDir, clamp(ac / 5, 0.5, 4), this._particle.position);

    document.getElementById('overlay-text').innerHTML =
        'Uniform circular motion. The velocity vector is always tangent to the path; ' +
        'the centripetal acceleration always points toward the centre.';
    document.getElementById('formula-container').innerHTML =
        '<div class="formula-block"><div class="formula-label">Relationships</div>' +
        'v = ωr = ' + v.toFixed(2) + ' m/s<br>' +
        'aₓ = ω²r = v²/r = ' + ac.toFixed(2) + ' m/s²<br>' +
        'Fc = maₓ = ' + Fc.toFixed(2) + ' N</div>';

    document.getElementById('live-values').innerHTML = [
        { l: 'v',   v: v.toFixed(2)  + ' m/s' },
        { l: 'aₓ',  v: ac.toFixed(2) + ' m/s²'},
        { l: 'Fc',  v: Fc.toFixed(2) + ' N'   }
    ].map(function (c) {
        return '<div class="live-chip">' + c.l + ': <span>' + c.v + '</span></div>';
    }).join('');
};
