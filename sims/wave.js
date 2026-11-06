/* ============================================================
   sims/wave.js — Wave Superposition (Premium Visual Upgrade)
   ============================================================ */
function WaveSim(engine) {
  SimBase.call(this, engine);
  this.p = {
    mode: 'Free',
    v: 5.0,
    f1: 2.0, A1: 1.5, phi1: 0, dir1: 1,
    f2: 2.0, A2: 1.0, phi2: 0, dir2: 1
  };
  this.N = 400;
  this.XR = 24;
}
WaveSim.prototype = Object.create(SimBase.prototype);
WaveSim.prototype.constructor = WaveSim;

WaveSim.prototype._setup = function() {
  var grid = new THREE.GridHelper(32, 32, 0x1a2a4a, 0x111a2e);
  grid.position.y = -4;
  this._add(grid);

  var zs = [3.5, 0, -3.5];
  for (var i = 0; i < 3; i++) {
    this._add(this._line(
      [new THREE.Vector3(-this.XR / 2, 0, zs[i]),
       new THREE.Vector3(this.XR / 2, 0, zs[i])],
      0x1e2e48, 0.5
    ));
  }

  var mkG = function() {
    var g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(this.N * 3), 3));
    return g;
  }.bind(this);

  this._geoA = mkG(); this._geoB = mkG(); this._geoR = mkG();

  /* PREMIUM: additive-blended lines for glow effect */
  this._lineA = this._add(new THREE.Line(this._geoA, new THREE.LineBasicMaterial({ color: 0x63caff, transparent: true, opacity: 0.95 })));
  this._lineA.position.z = 3.5;
  this._lineB = this._add(new THREE.Line(this._geoB, new THREE.LineBasicMaterial({ color: 0xff9f45, transparent: true, opacity: 0.95 })));
  this._lineB.position.z = -3.5;
  this._lineR = this._add(new THREE.Line(this._geoR, new THREE.LineBasicMaterial({ color: 0xa8ff78, transparent: true, opacity: 1.0, blending: THREE.AdditiveBlending })));

  this._areaA = this._mkArea(0x63caff, 0.10, 3.5);
  this._areaB = this._mkArea(0xff9f45, 0.10, -3.5);
  this._areaR = this._mkArea(0xa8ff78, 0.18, 0.0);

  this._envGeo  = mkG();
  this._envLine = this._add(new THREE.Line(this._envGeo, new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.4 })));

  this._envMaxGeo = mkG(); this._envMinGeo = mkG();
  this._envMaxLine = this._add(new THREE.Line(this._envMaxGeo, new THREE.LineBasicMaterial({ color: 0xa8ff78, transparent: true, opacity: 0.5 })));
  this._envMinLine = this._add(new THREE.Line(this._envMinGeo, new THREE.LineBasicMaterial({ color: 0xa8ff78, transparent: true, opacity: 0.5 })));
  this._envMaxLine.visible = false;
  this._envMinLine.visible = false;

  this.camera.position.set(0, 10, 28);

  this._add(this._sprite('Wave 1 (Cyan)', -10, 2.5, 3.5, '#63caff'));
  this._add(this._sprite('Wave 2 (Orange)', -10, 2.5, -3.5, '#ff9f45'));
  this._add(this._sprite('Resultant', -10, 2.5, 0.0, '#a8ff78'));
};

WaveSim.prototype._mkArea = function(col, op, z) {
  var N = this.N;
  var pos = new Float32Array(N * 2 * 3);
  var idx = [];
  for (var i = 0; i < N - 1; i++) idx.push(i, i+1, i+N, i+1, i+N+1, i+N);
  var g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setIndex(idx);
  /* PREMIUM: depthWrite false + DoubleSide for proper layering */
  var m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({
    color: col, transparent: true, opacity: op,
    side: THREE.DoubleSide, depthWrite: false,
    blending: THREE.AdditiveBlending
  }));
  m.position.z = z;
  return this._add(m);
};

WaveSim.prototype._fillArea = function(mesh, fn) {
  var N = this.N, XR = this.XR;
  var pos = mesh.geometry.attributes.position.array;
  for (var i = 0; i < N; i++) {
    var x = (i / (this.N - 1)) * XR - XR / 2;
    var y = fn(x);
    var t = i * 3, b = (i + N) * 3;
    pos[t] = x; pos[t+1] = y; pos[t+2] = 0;
    pos[b] = x; pos[b+1] = 0; pos[b+2] = 0;
  }
  mesh.geometry.attributes.position.needsUpdate = true;
};

WaveSim.prototype._buildGui = function() {
  this.gui = new lil.GUI({ title: 'Wave Physics', container: document.getElementById('gui-container'), width: 320 });
  this.gui.add(this.p, 'mode', ['Free', 'Constructive', 'Destructive', 'Standing', 'Beats']).name('Scenario');
  var fEnv = this.gui.addFolder('Environment');
  fEnv.add(this.p, 'v', 1, 15, 0.1).name('Wave Speed (v)');
  fEnv.open();
  var fA = this.gui.addFolder('Wave 1 (Cyan)');
  fA.add(this.p, 'A1', 0, 3, 0.1).name('Amplitude');
  fA.add(this.p, 'f1', 0.1, 5, 0.1).name('Freq (Hz)');
  fA.add(this.p, 'phi1', 0, TAU, 0.1).name('Phase (rad)');
  fA.add(this.p, 'dir1', { 'Right →': 1, '← Left': -1 }).name('Direction');
  fA.open();
  var fB = this.gui.addFolder('Wave 2 (Orange)');
  fB.add(this.p, 'A2', 0, 3, 0.1).name('Amplitude');
  fB.add(this.p, 'f2', 0.1, 5, 0.1).name('Freq (Hz)');
  fB.add(this.p, 'phi2', 0, TAU, 0.1).name('Phase (rad)');
  fB.add(this.p, 'dir2', { 'Right →': 1, '← Left': -1 }).name('Direction');
  fB.open();
};

WaveSim.prototype.update = function(t, dt) {
  if (!SimBase.prototype.update.call(this, t, dt)) return;

  var p = this.p, tm = this._st, mode = p.mode;

  if (mode === 'Constructive') { p.f2 = p.f1; p.phi2 = p.phi1; p.dir2 = p.dir1; }
  else if (mode === 'Destructive') { p.f2 = p.f1; p.phi2 = p.phi1 + PI; p.dir2 = p.dir1; }
  else if (mode === 'Standing') { p.f2 = p.f1; p.dir1 = 1; p.dir2 = -1; p.A2 = p.A1; p.phi2 = 0; }
  else if (mode === 'Beats') { p.dir2 = p.dir1; if (Math.abs(p.f1 - p.f2) < 0.1) p.f2 = p.f1 + 0.2; }

  var k1 = TAU * p.f1 / p.v, w1 = TAU * p.f1;
  var k2 = TAU * p.f2 / p.v, w2 = TAU * p.f2;

  var fnA = function(x) { return p.A1 * Math.sin(k1 * x - w1 * tm * p.dir1 + p.phi1); };
  var fnB = function(x) { return p.A2 * Math.sin(k2 * x - w2 * tm * p.dir2 + p.phi2); };
  var fnR = function(x) { return fnA(x) + fnB(x); };

  var pA = this._geoA.attributes.position.array;
  var pB = this._geoB.attributes.position.array;
  var pR = this._geoR.attributes.position.array;
  for (var i = 0; i < this.N; i++) {
    var x = (i / (this.N - 1)) * this.XR - this.XR / 2, j = i * 3;
    pA[j] = x; pA[j+1] = fnA(x); pA[j+2] = 0;
    pB[j] = x; pB[j+1] = fnB(x); pB[j+2] = 0;
    pR[j] = x; pR[j+1] = fnR(x); pR[j+2] = 0;
  }
  this._geoA.attributes.position.needsUpdate = true;
  this._geoB.attributes.position.needsUpdate = true;
  this._geoR.attributes.position.needsUpdate = true;

  this._fillArea(this._areaA, fnA);
  this._fillArea(this._areaB, fnB);
  this._fillArea(this._areaR, fnR);

  if (mode === 'Standing') {
    var ampEnv = 2 * p.A1;
    var pMax = this._envMaxGeo.attributes.position.array;
    var pMin = this._envMinGeo.attributes.position.array;
    for (var i = 0; i < this.N; i++) {
      var x = (i / (this.N - 1)) * this.XR - this.XR / 2, j = i * 3;
      var env = ampEnv * Math.sin(k1 * x);
      pMax[j] = x; pMax[j+1] = env; pMax[j+2] = 0;
      pMin[j] = x; pMin[j+1] = -env; pMin[j+2] = 0;
    }
    this._envMaxGeo.attributes.position.needsUpdate = true;
    this._envMinGeo.attributes.position.needsUpdate = true;
    this._envMaxLine.visible = true;
    this._envMinLine.visible = true;
    this._envLine.visible = false;
  } else if (mode === 'Beats') {
    var eP = this._envGeo.attributes.position.array;
    for (var i = 0; i < this.N; i++) {
      var x = (i / (this.N - 1)) * this.XR - this.XR / 2, j = i * 3;
      eP[j] = x; eP[j+1] = 2 * p.A1 * Math.abs(Math.cos(PI * (p.f1 - p.f2) * tm)); eP[j+2] = 0;
    }
    this._envGeo.attributes.position.needsUpdate = true;
    this._envLine.visible = true;
    this._envMaxLine.visible = false;
    this._envMinLine.visible = false;
  } else {
    this._envLine.visible = false;
    this._envMaxLine.visible = false;
    this._envMinLine.visible = false;
  }

  document.getElementById('overlay-text').innerHTML =
    mode === 'Standing' ?
    'Standing Wave: Two identical waves traveling in opposite directions interfere. The envelope shows Nodes (zero displacement) and Antinodes (max displacement).' :
    'Superposition principle: the resultant displacement equals the algebraic sum of individual wave displacements. Medium is non-dispersive (v = constant).';

  document.getElementById('formula-container').innerHTML =
    '<div class="formula-block"><div class="formula-label">Wave Relations</div>' +
    'v = fλ &nbsp;|&nbsp; λ = v/f<br>' +
    'k = 2π/λ = ' + k1.toFixed(2) + ' rad/m<br>' +
    'ω = 2πf = ' + w1.toFixed(2) + ' rad/s</div>';

  document.getElementById('live-values').innerHTML = [
    { l: 'v',  v: p.v.toFixed(1) + ' m/s' },
    { l: 'f₁', v: p.f1.toFixed(2) + ' Hz' },
    { l: 'f₂', v: p.f2.toFixed(2) + ' Hz' }
  ].map(function(c) {
    return '<div class="live-chip">' + c.l + ': <span>' + c.v + '</span></div>';
  }).join('');
};
