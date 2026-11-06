/* ============================================================
   sims/gravity.js — Orbital Mechanics (Premium)
   PREMIUM: sun with emissive material + sprite glow halo,
            planet atmospheres (fresnel rim),
            starfield background, fading orbit trails.
   ============================================================ */
function GravitySim(engine) {
  SimBase.call(this, engine);
  this.p = { G: 10, sunMass: 500 };
  this.bodies = [];
  this.trails = [];
  this.MAXTRAIL = 500;
}
GravitySim.prototype = Object.create(SimBase.prototype);
GravitySim.prototype.constructor = GravitySim;

GravitySim.prototype._setup = function() {
  /* Starfield background — 3000 points on a large sphere */
  var starGeo = new THREE.BufferGeometry();
  var starCount = 3000;
  var starPos = new Float32Array(starCount * 3);
  var starSize = new Float32Array(starCount);
  for (var i = 0; i < starCount; i++) {
    var theta = Math.random() * TAU;
    var phi = Math.acos(2 * Math.random() - 1);
    var r = 400;
    starPos[i*3]   = r * Math.sin(phi) * Math.cos(theta);
    starPos[i*3+1] = r * Math.sin(phi) * Math.sin(theta);
    starPos[i*3+2] = r * Math.cos(phi);
    starSize[i] = Math.random() * 0.7 + 0.3;
  }
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
  var starMat = new THREE.PointsMaterial({
    color: 0xffffff, size: 0.8, sizeAttenuation: true,
    transparent: true, opacity: 0.8, depthWrite: false
  });
  this._stars = this._add(new THREE.Points(starGeo, starMat));

  /* Sun — emissive material (no noise shader for simplicity, just bright emissive) */
  this._sun = this._add(new THREE.Mesh(
    new THREE.SphereGeometry(1, ROPE.quality.sphereMid[0], ROPE.quality.sphereMid[1]),
    new THREE.MeshStandardMaterial({
      color: 0xffaa00, emissive: 0xff6600, emissiveIntensity: 1.5, roughness: 0.4
    })
  ));
  this._sun.position.set(0, 0, 0);

  /* Sun glow halo — sprite with radial gradient texture */
  var haloCanvas = document.createElement('canvas');
  haloCanvas.width = 256; haloCanvas.height = 256;
  var hCtx = haloCanvas.getContext('2d');
  var hGrad = hCtx.createRadialGradient(128, 128, 0, 128, 128, 128);
  hGrad.addColorStop(0,   'rgba(255,200,100,0.8)');
  hGrad.addColorStop(0.2, 'rgba(255,150,50,0.4)');
  hGrad.addColorStop(0.5, 'rgba(255,100,0,0.15)');
  hGrad.addColorStop(1,   'rgba(255,100,0,0)');
  hCtx.fillStyle = hGrad;
  hCtx.fillRect(0, 0, 256, 256);
  var haloTex = new THREE.CanvasTexture(haloCanvas);
  this._halo = this._add(new THREE.Sprite(new THREE.SpriteMaterial({
    map: haloTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false
  })));
  this._halo.scale.set(6, 6, 1);

  var starLight = new THREE.PointLight(0xffaa00, 1.5, 80);
  starLight.position.set(0, 0, 0);
  this._add(starLight);

  this._addPlanet(12, 10);
};

GravitySim.prototype._addPlanet = function(dist, mass) {
  var v_circ = Math.sqrt(this.p.G * this.p.sunMass / dist);
  var angle = Math.random() * TAU;
  var r = new THREE.Vector3(dist * Math.cos(angle), 0, dist * Math.sin(angle));
  var v = new THREE.Vector3(-v_circ * Math.sin(angle), 0, v_circ * Math.cos(angle));
  var a = new THREE.Vector3();

  /* PREMIUM: deterministic colours based on mass (rocky vs gas giant) */
  var color;
  if (mass < 5) color = new THREE.Color().setHSL(0.05 + Math.random() * 0.05, 0.4, 0.5);  /* rocky reddish */
  else if (mass < 15) color = new THREE.Color().setHSL(0.6 + Math.random() * 0.1, 0.6, 0.55); /* bluish */
  else color = new THREE.Color().setHSL(0.08 + Math.random() * 0.04, 0.7, 0.6);              /* orange giant */

  var planet = new THREE.Mesh(
    new THREE.SphereGeometry(clamp(Math.pow(mass, 1/3) * 0.3, 0.2, 1.0), ROPE.quality.sphereMid[0], ROPE.quality.sphereMid[1]),
    ROPE.materials.metalBrushed(color.getHex())
  );
  this._add(planet);
  planet.position.copy(r);
  planet.castShadow = true;

  /* PREMIUM: atmosphere — slightly larger sphere with fresnel additive shader */
  var atmoGeo = new THREE.SphereGeometry(clamp(Math.pow(mass, 1/3) * 0.3, 0.2, 1.0) * 1.15, ROPE.quality.sphereLow[0], ROPE.quality.sphereLow[1]);
  var atmoMat = new THREE.ShaderMaterial({
    transparent: true,
    side: THREE.BackSide,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      glowColor: { value: color.clone().multiplyScalar(1.4) }
    },
    vertexShader: [
      'varying vec3 vNormal;',
      'void main() {',
      '  vNormal = normalize(normalMatrix * normal);',
      '  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);',
      '}'
    ].join('\n'),
    fragmentShader: [
      'uniform vec3 glowColor;',
      'varying vec3 vNormal;',
      'void main() {',
      '  float intensity = pow(1.0 - abs(dot(vNormal, vec3(0,0,1))), 2.5);',
      '  gl_FragColor = vec4(glowColor, intensity * 0.7);',
      '}'
    ].join('\n')
  });
  var atmo = new THREE.Mesh(atmoGeo, atmoMat);
  planet.add(atmo);

  var tGeo = new THREE.BufferGeometry();
  tGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(this.MAXTRAIL * 3), 3));
  var tLine = new THREE.Line(tGeo, new THREE.LineBasicMaterial({
    color: color, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending
  }));
  this._add(tLine);

  this.bodies.push({ r: r, v: v, a: a, mass: mass, mesh: planet });
  this.trails.push({ points: [], line: tLine, geo: tGeo });
};

GravitySim.prototype._updateAccels = function() {
  var sunPos = new THREE.Vector3(0, 0, 0);
  for (var i = 0; i < this.bodies.length; i++) {
    var body = this.bodies[i];
    var d = new THREE.Vector3().subVectors(sunPos, body.r);
    var dist = Math.max(d.length(), 1);
    var fMag = (this.p.G * this.p.sunMass * body.mass) / (dist * dist);
    body.a.copy(d.normalize()).multiplyScalar(fMag / body.mass);
  }
};

GravitySim.prototype._buildGui = function() {
  var self = this;
  this.gui = new lil.GUI({ title: 'Orbital Mechanics', container: document.getElementById('gui-container'), width: 320 });
  this.gui.add(this.p, 'G', 1, 50, 1).name('G Constant');
  this.gui.add(this.p, 'sunMass', 100, 1000, 10).name('Sun Mass').onChange(function() {
    self._sun.scale.setScalar(Math.pow(self.p.sunMass, 1/3) * 0.15);
    self._halo.scale.set(6 * Math.pow(self.p.sunMass / 500, 1/3), 6 * Math.pow(self.p.sunMass / 500, 1/3), 1);
  });
  this.gui.add({ addPlanet: function() { self._addPlanet(5 + Math.random() * 25, 1 + Math.random() * 20); } }, 'addPlanet').name('🪐 Add Planet');
  this.gui.add({ reset: function() { self.reset(); } }, 'reset').name('↺ Reset Orbit');
};

GravitySim.prototype.reset = function() {
  this._st = 0;
  for (var i = 0; i < this.bodies.length; i++) {
    this.scene.remove(this.bodies[i].mesh);
    this.bodies[i].mesh.geometry.dispose();
    this.bodies[i].mesh.material.dispose();
    this.scene.remove(this.trails[i].line);
    this.trails[i].geo.dispose();
    this.trails[i].line.material.dispose();
  }
  this.bodies = []; this.trails = []; this._clearGhosts();
  this._addPlanet(12, 10);
  this._sun.scale.setScalar(Math.pow(this.p.sunMass, 1/3) * 0.15);
};

GravitySim.prototype.update = function(t, dt) {
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
    for (var j = 0; j < trail.points.length; j++) {
      tp[j*3] = trail.points[j].x;
      tp[j*3+1] = trail.points[j].y;
      tp[j*3+2] = trail.points[j].z;
    }
    trail.geo.setDrawRange(0, trail.points.length);
    trail.geo.attributes.position.needsUpdate = true;
    /* Fade trail opacity based on length (longer = more visible) */
    trail.line.material.opacity = clamp(0.1 + trail.points.length / this.MAXTRAIL * 0.5, 0.1, 0.6);
  }

  if (this.bodies.length > 0) {
    var p = this.bodies[0], r = p.r.length(), v = p.v.length();
    var KE = 0.5 * p.mass * v * v;
    var PE = -(this.p.G * this.p.sunMass * p.mass) / Math.max(r, 1);
    var E = KE + PE;
    var T = TAU * Math.sqrt(Math.pow(Math.max(r, 1), 3) / (this.p.G * this.p.sunMass));
    document.getElementById('overlay-text').innerHTML = 'Static Sun gravity simulation. Velocity Verlet ensures stable orbits. Add planets to see how distance affects velocity and period.';
    document.getElementById('formula-container').innerHTML = '<div class="formula-block"><div class="formula-label">Orbital Mechanics</div>F = GM<sub>sun</sub>M/r²<br>v_circ = √(GM<sub>sun</sub>/r)<br>T_orbit ≈ ' + T.toFixed(1) + ' s</div><div class="formula-block"><div class="formula-label">Energy (Planet 1)</div>KE = ' + KE.toFixed(1) + ' J | PE = ' + PE.toFixed(1) + ' J<br>E_total = ' + E.toFixed(1) + ' J</div>';
    document.getElementById('live-values').innerHTML = [
      { l: 'Planets', v: this.bodies.length.toString() },
      { l: 'R (p1)', v: r.toFixed(1) + ' m' },
      { l: 'v (p1)', v: v.toFixed(2) + ' m/s' }
    ].map(function(c) { return '<div class="live-chip">' + c.l + ': <span>' + c.v + '</span></div>'; }).join('');
  }
};
