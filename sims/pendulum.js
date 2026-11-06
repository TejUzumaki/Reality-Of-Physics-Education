/* ============================================================
   sims/pendulum.js — Simple Pendulum (Premium)
   FIX: 1px line rod → thin cylinder with proper shadow
   FIX: tiny sphere pivot → bracket + bearing assembly
   FIX: low-poly bob → 64×32 sphere + equator band
   FIX: constant-opacity trail → fading alpha head-to-tail
   ============================================================ */
function PendulumSim(engine) {
  SimBase.call(this, engine);
  this.p = { L: 5, g: 9.81, m: 1, theta0: PI / 4, damping: 0.05 };
  this.theta = 0; this.omega = 0;
  this.trail = [];
  this.MAXTRAIL = 200;
}
PendulumSim.prototype = Object.create(SimBase.prototype);
PendulumSim.prototype.constructor = PendulumSim;

PendulumSim.prototype._setup = function() {
  /* PREMIUM: pivot bracket assembly */
  var bracketMat = ROPE.materials.metalBrushed(0x445566);
  var bracket = this._add(new THREE.Mesh(this._roundedBox(1.2, 0.6, 1.0, 0.08), bracketMat));
  bracket.position.set(0, 6.5, 0); bracket.castShadow = true;

  /* Bearing: outer dark ring + inner bright ring */
  var bearingOuter = this._add(new THREE.Mesh(
    new THREE.TorusGeometry(0.28, 0.08, 16, 32),
    ROPE.materials.metalPolished(0x2a3a4a)
  ));
  bearingOuter.position.set(0, 6, 0); bearingOuter.castShadow = true;
  var bearingInner = this._add(new THREE.Mesh(
    new THREE.TorusGeometry(0.18, 0.04, 12, 24),
    ROPE.materials.metalPolished(0xaabbcc)
  ));
  bearingInner.position.set(0, 6, 0);

  /* Pivot center pin */
  var pin = this._add(new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.08, 0.3, 16),
    ROPE.materials.metalPolished(0x8899cc)
  ));
  pin.position.set(0, 6, 0); pin.castShadow = true;

  /* PREMIUM: rod as thin cylinder (was invisible 1px line) */
  this._rod = this._add(new THREE.Mesh(
    new THREE.CylinderGeometry(0.04, 0.04, 1, 12),
    ROPE.materials.metalPolished(0xaabbcc)
  ));
  this._rod.castShadow = true;

  /* PREMIUM: high-poly bob (64×32) with polished brass material */
  this._bob = this._add(new THREE.Mesh(
    new THREE.SphereGeometry(0.55, ROPE.quality.sphereHigh[0], ROPE.quality.sphereHigh[1]),
    ROPE.materials.metalPolished(0xff9f45)
  ));
  this._bob.castShadow = true;
  this._mainObject = this._bob;

  /* PREMIUM: equator band (breaks up plain sphere surface) */
  var band = this._add(new THREE.Mesh(
    new THREE.TorusGeometry(0.55, 0.04, 12, 48),
    ROPE.materials.metalPolished(0xcc7733)
  ));
  this._band = band;

  /* Trail with fading alpha */
  this._trailGeo = new THREE.BufferGeometry();
  this._trailGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(this.MAXTRAIL * 3), 3));
  /* Per-vertex alpha via custom attribute */
  this._trailGeo.setAttribute('alpha', new THREE.BufferAttribute(new Float32Array(this.MAXTRAIL), 1));
  this._trailMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: { color: { value: new THREE.Color(0xff9f45) } },
    vertexShader: [
      'attribute float alpha;',
      'varying float vAlpha;',
      'void main() { vAlpha = alpha; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }'
    ].join('\n'),
    fragmentShader: [
      'uniform vec3 color;',
      'varying float vAlpha;',
      'void main() { gl_FragColor = vec4(color, vAlpha * 0.5); }'
    ].join('\n')
  });
  this._trailLine = this._add(new THREE.Line(this._trailGeo, this._trailMat));

  this.camera.position.set(0, 4, 18);
  this.engine.orbit.target.set(0, 3, 0);
};

PendulumSim.prototype.reset = function() {
  this._st = 0;
  this.theta = this.p.theta0;
  this.omega = 0;
  this.trail = [];
  this._trailGeo.setDrawRange(0, 0);
};

PendulumSim.prototype._buildGui = function() {
  var self = this;
  this.gui = new lil.GUI({ title: 'Simple Pendulum', container: document.getElementById('gui-container'), width: 320 });
  this.gui.add(this.p, 'L', 1, 8, 0.1).name('Rod Length (m)').onChange(function() { self.reset(); });
  this.gui.add(this.p, 'theta0', 0.1, PI - 0.1, 0.05).name('Initial Angle (rad)').onChange(function() { self.reset(); });
  this.gui.add(this.p, 'g', 1, 20, 0.1).name('Gravity (m/s²)');
  this.gui.add(this.p, 'm', 0.1, 5, 0.1).name('Bob Mass (kg)');
  this.gui.add(this.p, 'damping', 0, 0.5, 0.005).name('Air Resistance');
  this.gui.add({ reset: function() { self.reset(); } }, 'reset').name('↺ Reset');
};

PendulumSim.prototype.update = function(t, dt) {
  if (this._st === 0) this.reset();
  if (!SimBase.prototype.update.call(this, t, dt)) return;

  var L = this.p.L, g = this.p.g, damp = this.p.damping;

  /* VELOCITY VERLET (preserved exactly) */
  var alpha1 = -(g / L) * Math.sin(this.theta) - (damp * this.omega);
  this.theta += this.omega * dt + 0.5 * alpha1 * dt * dt;
  var alpha2 = -(g / L) * Math.sin(this.theta) - (damp * this.omega);
  this.omega += 0.5 * (alpha1 + alpha2) * dt;

  var x = L * Math.sin(this.theta);
  var y = 6 - L * Math.cos(this.theta);
  this._bob.position.set(x, y, 0);

  /* PREMIUM: orient rod from pivot to bob, scale to length */
  var pivotPos = new THREE.Vector3(0, 6, 0);
  var bobPos = new THREE.Vector3(x, y, 0);
  var dir = new THREE.Vector3().subVectors(bobPos, pivotPos);
  var len = dir.length();
  this._rod.position.copy(pivotPos).add(dir.clone().multiplyScalar(0.5));
  this._rod.scale.y = Math.max(len, 0.001);
  this._rod.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());

  /* Band follows bob */
  this._band.position.copy(bobPos);

  /* Trail with fading alpha */
  this.trail.push(bobPos.clone());
  if (this.trail.length > this.MAXTRAIL) this.trail.shift();
  var tp = this._trailGeo.attributes.position.array;
  var ta = this._trailGeo.attributes.alpha.array;
  for (var i = 0; i < this.trail.length; i++) {
    tp[i*3] = this.trail[i].x;
    tp[i*3+1] = this.trail[i].y;
    tp[i*3+2] = this.trail[i].z;
    /* Head (most recent) bright, tail fading to 0 */
    ta[i] = i / this.trail.length;
  }
  this._trailGeo.setDrawRange(0, this.trail.length);
  this._trailGeo.attributes.position.needsUpdate = true;
  this._trailGeo.attributes.alpha.needsUpdate = true;

  var T0 = 2 * PI * Math.sqrt(L / g);
  var T_real = T0 * (1 + (this.p.theta0 * this.p.theta0) / 16);
  var KE = 0.5 * this.p.m * (L * this.omega) * (L * this.omega);
  var PE = this.p.m * g * L * (1 - Math.cos(this.theta));

  document.getElementById('overlay-text').innerHTML =
    'Non-linear pendulum using Velocity Verlet integration (exact equation, no small-angle approximation). Energy is conserved accurately over long periods.';
  document.getElementById('formula-container').innerHTML =
    '<div class="formula-block"><div class="formula-label">Period</div>' +
    'T_lin = 2π√(L/g) = ' + T0.toFixed(3) + ' s<br>' +
    'T_large ≈ T₀(1+θ₀²/16) = ' + T_real.toFixed(3) + ' s</div>' +
    '<div class="formula-block"><div class="formula-label">Energy</div>' +
    'KE = ' + KE.toFixed(3) + ' J &nbsp;|&nbsp; PE = ' + PE.toFixed(3) + ' J</div>';

  document.getElementById('live-values').innerHTML = [
    { l: 'θ (rad)', v: this.theta.toFixed(3) },
    { l: 'ω (rad/s)', v: this.omega.toFixed(3) }
  ].map(function(c) {
    return '<div class="live-chip">' + c.l + ': <span>' + c.v + '</span></div>';
  }).join('');
};
