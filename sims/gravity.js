/* ============================================================
   sims/gravity.js — Multi-Planet Orbital Mechanics
   FIX: Sun locked to static [0,0,0].
   FIX: Array-based architecture to support infinite planets.
   ============================================================ */

function GravitySim(engine) {
    SimBase.call(this, engine);
    this.p = { G: 10, sunMass: 500 };
    this.bodies = []; // Array of { r, v, a, mass, mesh }
    this.trails = []; // Array of { points, line, geo }
    this.MAXTRAIL = 500;
}
GravitySim.prototype = Object.create(SimBase.prototype);
GravitySim.prototype.constructor = GravitySim;

GravitySim.prototype._setup = function () {
    /* STRICTLY STATIC STAR */
    this._sun = this._add(new THREE.Mesh(
        new THREE.SphereGeometry(1),
        new THREE.MeshStandardMaterial({ color: 0xffaa00, emissive: 0xff4400, emissiveIntensity: 0.9 })
    ));
    this._sun.position.set(0, 0, 0); // Locked permanently

    var starLight = new THREE.PointLight(0xffaa00, 1.5, 80);
    starLight.position.set(0, 0, 0); // Locked permanently
    this._add(starLight);

    // Presets handle camera target, do not set it here to prevent fighting
    this._addPlanet(12, 10);
};

GravitySim.prototype._addPlanet = function (dist, mass) {
    var v_circ = Math.sqrt(this.p.G * this.p.sunMass / dist);
    var angle = Math.random() * TAU;
    
    var r = new THREE.Vector3(dist * Math.cos(angle), 0, dist * Math.sin(angle));
    var v = new THREE.Vector3(-v_circ * Math.sin(angle), 0, v_circ * Math.cos(angle));
    var a = new THREE.Vector3();

    var color = new THREE.Color().setHSL(Math.random(), 0.8, 0.6);
    var planet = new THREE.Mesh(
        new THREE.SphereGeometry(clamp(Math.pow(mass, 1/3) * 0.3, 0.2, 1.0)),
        new THREE.MeshStandardMaterial({ color: color, metalness: 0.2, roughness: 0.5 })
    );
    this._add(planet);
    planet.position.copy(r);

    var tGeo = new THREE.BufferGeometry();
    tGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(this.MAXTRAIL * 3), 3));
    var tLine = new THREE.Line(tGeo, new THREE.LineBasicMaterial({ color: color, transparent: true, opacity: 0.4 }));
    this._add(tLine);

    this.bodies.push({ r: r, v: v, a: a, mass: mass, mesh: planet });
    this.trails.push({ points: [], line: tLine, geo: tGeo });
};

GravitySim.prototype._updateAccels = function () {
    var sunPos = new THREE.Vector3(0, 0, 0);
    for (var i = 0; i < this.bodies.length; i++) {
        var body = this.bodies[i];
        var d = new THREE.Vector3().subVectors(sunPos, body.r);
        var dist = Math.max(d.length(), 1); 
        var fMag = (this.p.G * this.p.sunMass * body.mass) / (dist * dist);
        body.a.copy(d.normalize()).multiplyScalar(fMag / body.mass);
    }
};

GravitySim.prototype._buildGui = function () {
    var self = this;
    this.gui = new lil.GUI({ title: 'Orbital Mechanics', container: document.getElementById('gui-container'), width: 320 });
    this.gui.add(this.p, 'G', 1, 50, 1).name('G Constant');
    this.gui.add(this.p, 'sunMass', 100, 1000, 10).name('Sun Mass').onChange(function(){ self._sun.scale.setScalar(Math.pow(self.p.sunMass, 1/3) * 0.15); });
    this.gui.add({ addPlanet: function () { self._addPlanet(5 + Math.random() * 25, 1 + Math.random() * 20); } }, 'addPlanet').name('🪐 Add Planet');
    this.gui.add({ reset: function () { self.reset(); } }, 'reset').name('↺ Reset Orbit');
};

GravitySim.prototype.reset = function () {
    this._st = 0;
    for(var i=0; i<this.bodies.length; i++){
        this.scene.remove(this.bodies[i].mesh); this.bodies[i].mesh.geometry.dispose(); this.bodies[i].mesh.material.dispose();
        this.scene.remove(this.trails[i].line); this.trails[i].geo.dispose(); this.trails[i].line.material.dispose();
    }
    this.bodies = []; this.trails = []; this._clearGhosts();
    this._addPlanet(12, 10);
    this._sun.scale.setScalar(Math.pow(this.p.sunMass, 1/3) * 0.15);
};

GravitySim.prototype.update = function (t, dt) {
    if (!SimBase.prototype.update.call(this, t, dt)) return;

    var dt2 = dt * dt;
    for (var i = 0; i < this.bodies.length; i++) {
        var b = this.bodies[i];
        b.r.add(b.v.clone().multiplyScalar(dt)).add(b.a.clone().multiplyScalar(0.5 * dt2));
    }
    var aOld = [];
    for (var i = 0; i < this.bodies.length; i++) aOld.push(this.bodies[i].a.clone());
    this._updateAccels();
    for (var i = 0; i < this.bodies.length; i++) {
        var b = this.bodies[i];
        b.v.add(aOld[i].add(b.a).multiplyScalar(0.5 * dt));
        b.mesh.position.copy(b.r);
    }

    for (var i = 0; i < this.bodies.length; i++) {
        var trail = this.trails[i];
        trail.points.push(this.bodies[i].r.clone());
        if (trail.points.length > this.MAXTRAIL) trail.points.shift();
        var tp = trail.geo.attributes.position.array;
        for (var j = 0; j < trail.points.length; j++) { tp[j*3] = trail.points[j].x; tp[j*3+1] = trail.points[j].y; tp[j*3+2] = trail.points[j].z; }
        trail.geo.setDrawRange(0, trail.points.length);
        trail.geo.attributes.position.needsUpdate = true;
    }

    if (this.bodies.length > 0) {
        var p = this.bodies[0], r = p.r.length(), v = p.v.length();
        var KE = 0.5 * p.mass * v * v, PE = -(this.p.G * this.p.sunMass * p.mass) / Math.max(r, 1), E = KE + PE;
        var T = TAU * Math.sqrt(Math.pow(Math.max(r, 1), 3) / (this.p.G * this.p.sunMass));
        document.getElementById('overlay-text').innerHTML = 'Static Sun gravity simulation. Velocity Verlet ensures stable orbits. Add planets to see how distance affects velocity and period.';
        document.getElementById('formula-container').innerHTML = '<div class="formula-block"><div class="formula-label">Orbital Mechanics</div>F = GM<sub>sun</sub>M/r²<br>v_circ = √(GM<sub>sun</sub>/r)<br>T_orbit ≈ ' + T.toFixed(1) + ' s</div><div class="formula-block"><div class="formula-label">Energy (Planet 1)</div>KE = ' + KE.toFixed(1) + ' J | PE = ' + PE.toFixed(1) + ' J<br>E_total = ' + E.toFixed(1) + ' J</div>';
        document.getElementById('live-values').innerHTML = [{l:'Planets',v:this.bodies.length.toString()},{l:'R (p1)',v:r.toFixed(1)+' m'},{l:'v (p1)',v:v.toFixed(2)+' m/s'}].map(function(c){return '<div class="live-chip">'+c.l+': <span>'+c.v+'</span></div>'}).join('');
    }
};
