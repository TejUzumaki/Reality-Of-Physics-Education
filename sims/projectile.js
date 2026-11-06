/* ============================================================
   sims/projectile.js — Projectile Motion (Premium + Cannon + Fire Button)
   NEW: 3D cannon visual (wheels, carriage, rotating barrel)
   NEW: Floating FIRE button on the right side of the canvas
   PREMIUM: gradient sky, smoke trail, dashed predicted path, landing marker
   ============================================================ */
function ProjSim(engine) {
  SimBase.call(this, engine);
  this.p = { v0: 30, angle: 45, g: 9.81, h0: 0, Cd: 0.0, mass: 1.0, area: 0.1 };
  this.state = 'ready';
  this.pos = new THREE.Vector3();
  this.vel = new THREE.Vector3();
  this.trail = [];
  this.MAXTRAIL = 500;
  this._smokeMax = 80;
  this._smokePos = new Float32Array(this._smokeMax * 3);
  this._smokeAge = new Float32Array(this._smokeMax);
  this._smokeHead = 0;
  this._fireBtn = null;
  this._fireBtnStyle = null;
  this._cannon = null;
  this._barrel = null;
}
ProjSim.prototype = Object.create(SimBase.prototype);
ProjSim.prototype.constructor = ProjSim;

ProjSim.prototype._setup = function() {
  this.scene.fog = null;

  /* Gradient sky sphere */
  var skyCanvas = document.createElement('canvas');
  skyCanvas.width = 16; skyCanvas.height = 256;
  var sctx = skyCanvas.getContext('2d');
  var sgrad = sctx.createLinearGradient(0, 0, 0, 256);
  sgrad.addColorStop(0,   '#4a8fc7');
  sgrad.addColorStop(0.4, '#87CEEB');
  sgrad.addColorStop(0.7, '#b8d8e8');
  sgrad.addColorStop(1,   '#e0e8e8');
  sctx.fillStyle = sgrad;
  sctx.fillRect(0, 0, 16, 256);
  var skyTex = new THREE.CanvasTexture(skyCanvas);
  skyTex.mapping = THREE.EquirectangularReflectionMapping;
  this.scene.background = skyTex;
  this.renderer.setClearColor(0x87CEEB, 1);

  this.engine.ambientLight.color.set(0xffffff);
  this.engine.ambientLight.intensity = 0.6;

  var sun = new THREE.DirectionalLight(0xffffff, 1.5);
  sun.position.set(30, 50, 20); sun.castShadow = true;
  sun.shadow.mapSize.width = 2048; sun.shadow.mapSize.height = 2048;
  sun.shadow.camera.left = -100; sun.shadow.camera.right = 100;
  sun.shadow.camera.top = 100; sun.shadow.camera.bottom = -100;
  sun.shadow.camera.near = 1; sun.shadow.camera.far = 200;
  sun.shadow.bias = -0.0005;
  this._add(sun);
  this._add(new THREE.HemisphereLight(0x87CEEB, 0x556B2F, 0.4));

  /* Ground (grass-green) with subtle grid */
  var groundGeo = new THREE.PlaneGeometry(1000, 1000, 1, 1);
  var groundMat = new THREE.MeshStandardMaterial({ color: 0x5a8f4a, roughness: 0.9, metalness: 0.0 });
  var ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2; ground.position.y = -0.05; ground.receiveShadow = true;
  this._add(ground);

  var gridHelper = new THREE.GridHelper(1000, 100, 0x4a7a3a, 0x4a7a3a);
  gridHelper.position.y = 0.01;
  gridHelper.material.opacity = 0.2; gridHelper.material.transparent = true;
  this._add(gridHelper);

  /* === PREMIUM: Cannon visual launcher === */
  this._buildCannon();

  /* Projectile sphere (hidden in 'ready' state, shown when fired) */
  this._proj = this._add(new THREE.Mesh(
    new THREE.SphereGeometry(0.4, ROPE.quality.sphereMid[0], ROPE.quality.sphereMid[1]),
    ROPE.materials.metalPolished(0xff4444)
  ));
  this._proj.castShadow = true;
  this._proj.visible = false;
  this._mainObject = this._proj;

  /* Trail line (additive glow) */
  this._tGeo = new THREE.BufferGeometry();
  this._tGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(this.MAXTRAIL * 3), 3));
  this._tLine = this._add(new THREE.Line(this._tGeo, new THREE.LineBasicMaterial({
    color: 0xff4444, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending
  })));

  /* Smoke particle system */
  var smokeGeo = new THREE.BufferGeometry();
  smokeGeo.setAttribute('position', new THREE.BufferAttribute(this._smokePos, 3));
  var smokeTexCanvas = document.createElement('canvas');
  smokeTexCanvas.width = 64; smokeTexCanvas.height = 64;
  var stCtx = smokeTexCanvas.getContext('2d');
  var stGrad = stCtx.createRadialGradient(32, 32, 0, 32, 32, 32);
  stGrad.addColorStop(0,   'rgba(255,255,255,0.8)');
  stGrad.addColorStop(0.5, 'rgba(200,200,200,0.4)');
  stGrad.addColorStop(1,   'rgba(200,200,200,0)');
  stCtx.fillStyle = stGrad;
  stCtx.fillRect(0, 0, 64, 64);
  var smokeTex = new THREE.CanvasTexture(smokeTexCanvas);
  var smokeMat = new THREE.PointsMaterial({
    size: 0.8, map: smokeTex, transparent: true, opacity: 0.6,
    depthWrite: false, blending: THREE.NormalBlending, color: 0xdddddd
  });
  this._smokePoints = this._add(new THREE.Points(smokeGeo, smokeMat));
  for (var i = 0; i < this._smokeMax; i++) {
    this._smokePos[i*3] = 0; this._smokePos[i*3+1] = -1000; this._smokePos[i*3+2] = 0;
    this._smokeAge[i] = -1;
  }
  this._smokePoints.geometry.setDrawRange(0, this._smokeMax);

  /* Predicted trajectory (dashed, shown in 'ready' state) */
  this._predGeo = new THREE.BufferGeometry();
  this._predGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(60 * 3), 3));
  this._predLine = this._add(new THREE.Line(this._predGeo, new THREE.LineDashedMaterial({
    color: 0xffffff, dashSize: 0.5, gapSize: 0.3, transparent: true, opacity: 0.4
  })));

  /* Velocity arrow at cannon top */
  this._vArr = this._add(new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0, 0), 2, 0xa8ff78));

  this.camera.position.set(-10, 15, 40);
  this.engine.orbit.target.set(20, 5, 0);

  /* === PREMIUM: Floating FIRE button === */
  this._buildFireButton();
};

/* === Cannon builder === */
ProjSim.prototype._buildCannon = function() {
  this._cannon = new THREE.Group();

  /* Support platform (only when h0 > 0.1) */
  if (this.p.h0 > 0.1) {
    var platform = new THREE.Mesh(
      new THREE.BoxGeometry(0.8, this.p.h0, 0.8),
      ROPE.materials.metalBrushed(0x4a4a4a)
    );
    platform.position.y = -this.p.h0 / 2;
    platform.castShadow = true;
    this._cannon.add(platform);
  }

  /* Two wheels (cylinders, axis along z) */
  var wheelGeo = new THREE.CylinderGeometry(0.4, 0.4, 0.08, 24);
  var wheelMat = ROPE.materials.metalBrushed(0x2a1a0a);
  var wheelL = new THREE.Mesh(wheelGeo, wheelMat);
  wheelL.rotation.x = PI / 2;
  wheelL.position.set(0, 0.4, 0.4);
  wheelL.castShadow = true;
  this._cannon.add(wheelL);
  var wheelR = new THREE.Mesh(wheelGeo, wheelMat);
  wheelR.rotation.x = PI / 2;
  wheelR.position.set(0, 0.4, -0.4);
  wheelR.castShadow = true;
  this._cannon.add(wheelR);

  /* Wheel spokes (visual detail) */
  var spokeMat = ROPE.materials.metalPolished(0x5a4a3a);
  for (var s = 0; s < 4; s++) {
    var spokeL = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.7, 0.05), spokeMat);
    spokeL.position.set(0, 0.4, 0.42);
    spokeL.rotation.z = s * PI / 4;
    this._cannon.add(spokeL);
    var spokeR = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.7, 0.05), spokeMat);
    spokeR.position.set(0, 0.4, -0.42);
    spokeR.rotation.z = s * PI / 4;
    this._cannon.add(spokeR);
  }

  /* Carriage (wooden box holding the barrel) */
  var carriage = new THREE.Mesh(
    this._roundedBox(1.0, 0.6, 0.8, 0.1),
    ROPE.materials.metalBrushed(0x5a3a2a)
  );
  carriage.position.y = 0.5;
  carriage.castShadow = true;
  this._cannon.add(carriage);

  /* Barrel group (rotates around its base to match launch angle) */
  this._barrel = new THREE.Group();
  var barrelMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(0.18, 0.22, 1.8, 24),
    ROPE.materials.metalPolished(0x1a1a1a)
  );
  barrelMesh.position.y = 0.9;
  barrelMesh.castShadow = true;
  this._barrel.add(barrelMesh);

  /* Barrel ring (decoration) */
  var ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.22, 0.04, 8, 24),
    ROPE.materials.metalPolished(0x4a4a4a)
  );
  ring.position.y = 1.6;
  ring.rotation.x = PI / 2;
  this._barrel.add(ring);

  /* Muzzle ring at tip */
  var muzzle = new THREE.Mesh(
    new THREE.TorusGeometry(0.2, 0.05, 8, 24),
    ROPE.materials.metalPolished(0x3a3a3a)
  );
  muzzle.position.y = 1.8;
  muzzle.rotation.x = PI / 2;
  this._barrel.add(muzzle);

  /* Position barrel group at top of carriage */
  this._barrel.position.set(0, 0.7, 0);
  this._cannon.add(this._barrel);

  /* Place cannon at launch position */
  this._cannon.position.set(0, this.p.h0, 0);
  this._add(this._cannon);
};

/* === Floating FIRE button builder === */
ProjSim.prototype._buildFireButton = function() {
  /* Inject CSS for pulse animation */
  this._fireBtnStyle = document.createElement('style');
  this._fireBtnStyle.textContent =
    '@keyframes ropeFirePulse {' +
    '  0%, 100% { box-shadow: 0 10px 40px rgba(255,68,68,0.5), 0 0 0 6px rgba(255,68,68,0.12); }' +
    '  50% { box-shadow: 0 14px 55px rgba(255,68,68,0.85), 0 0 0 10px rgba(255,68,68,0.2); }' +
    '}' +
    '.rope-fire-btn {' +
    '  position: fixed; right: 80px; top: 50%; transform: translateY(-50%); z-index: 300;' +
    '  padding: 22px 36px;' +
    '  background: linear-gradient(135deg, #ff6b6b 0%, #ee5a52 100%);' +
    '  color: white; border: 3px solid #ffaa88; border-radius: 100px;' +
    '  font-family: "Space Mono", "IBM Plex Mono", monospace;' +
    '  font-size: 20px; font-weight: 700; letter-spacing: 3px;' +
    '  cursor: pointer; text-transform: uppercase;' +
    '  user-select: none; -webkit-user-select: none;' +
    '  transition: transform 0.2s ease, background 0.3s ease, border-color 0.3s ease;' +
    '  animation: ropeFirePulse 1.6s ease-in-out infinite;' +
    '}' +
    '.rope-fire-btn:hover { transform: translateY(-50%) scale(1.06); }' +
    '.rope-fire-btn:active { transform: translateY(-50%) scale(0.96); }' +
    '.rope-fire-btn.flying {' +
    '  background: linear-gradient(135deg, #63caff 0%, #4ab8ee 100%);' +
    '  border-color: #88ddff; animation: none; cursor: default;' +
    '}' +
    '.rope-fire-btn.landed {' +
    '  background: linear-gradient(135deg, #a8ff78 0%, #78d058 100%);' +
    '  border-color: #c8ff98; animation: none;' +
    '}';
  document.head.appendChild(this._fireBtnStyle);

  this._fireBtn = document.createElement('button');
  this._fireBtn.className = 'rope-fire-btn';
  this._fireBtn.textContent = '🚀 FIRE';

  var self = this;
  this._fireBtn.addEventListener('click', function() {
    if (self.state === 'ready') self._launch();
    else if (self.state === 'landed') self.reset();
  });

  document.body.appendChild(this._fireBtn);
};

ProjSim.prototype._updateFireButton = function() {
  if (!this._fireBtn) return;
  this._fireBtn.classList.remove('flying', 'landed');
  if (this.state === 'ready') {
    this._fireBtn.textContent = '🚀 FIRE';
  } else if (this.state === 'flying') {
    this._fireBtn.textContent = '⚡ FLYING';
    this._fireBtn.classList.add('flying');
  } else if (this.state === 'landed') {
    this._fireBtn.textContent = '↺ RESET';
    this._fireBtn.classList.add('landed');
  }
};

ProjSim.prototype._buildGui = function() {
  var self = this;
  this.gui = new lil.GUI({ title: 'Projectile (w/ Drag)', container: document.getElementById('gui-container'), width: 320 });
  var fInit = this.gui.addFolder('Initial Conditions');
  fInit.add(this.p, 'v0', 1, 100, 1).name('Speed (m/s)');
  fInit.add(this.p, 'angle', 0, 90, 1).name('Launch Angle (°)');
  fInit.add(this.p, 'h0', 0, 50, 1).name('Height (m)').onChange(function() {
    if (self._cannon) self._cannon.position.y = self.p.h0;
  });
  fInit.open();
  var fEnv = this.gui.addFolder('Environment');
  fEnv.add(this.p, 'g', 1, 20, 0.1).name('Gravity (m/s²)');
  fEnv.add(this.p, 'Cd', 0, 1.0, 0.01).name('Drag Coefficient');
  fEnv.add(this.p, 'mass', 0.1, 10, 0.1).name('Mass (kg)');
  fEnv.open();
  /* Reset button still in GUI for convenience */
  this.gui.add({ reset: function() { self.reset(); } }, 'reset').name('↺ Reset');
};

ProjSim.prototype._launch = function() {
  this.state = 'flying';
  this._proj.visible = true;
  var rad = this.p.angle * PI / 180;
  this.pos.set(0, this.p.h0, 0);
  this.vel.set(this.p.v0 * Math.cos(rad), this.p.v0 * Math.sin(rad), 0);
  this.trail = [];
  this._tGeo.setDrawRange(0, 0);
  this._clearGhosts();
  if (this._landMarker) { this._landMarker.visible = false; this._landMarker = null; }
  this._updateFireButton();
};

ProjSim.prototype._spawnSmoke = function(pos) {
  var idx = this._smokeHead;
  this._smokePos[idx*3]   = pos.x + (Math.random() - 0.5) * 0.2;
  this._smokePos[idx*3+1] = pos.y + (Math.random() - 0.5) * 0.2;
  this._smokePos[idx*3+2] = pos.z + (Math.random() - 0.5) * 0.2;
  this._smokeAge[idx] = 0;
  this._smokeHead = (this._smokeHead + 1) % this._smokeMax;
};

ProjSim.prototype.update = function(t, dt) {
  /* Rotate cannon barrel to match launch angle */
  if (this._barrel) {
    var radAngle = this.p.angle * PI / 180;
    this._barrel.rotation.z = (PI / 2) - radAngle;
  }

  if (this.state === 'ready') {
    this._updateFireButton();
    var rad = this.p.angle * PI / 180;
    /* Velocity arrow positioned at cannon top, pointing in launch direction */
    this._setArr(this._vArr, new THREE.Vector3(Math.cos(rad), Math.sin(rad), 0), 2.5,
      new THREE.Vector3(0, this.p.h0 + 0.8, 0));

    /* Predicted trajectory (no drag, closed form) */
    var v0 = this.p.v0, g = this.p.g;
    var pPred = this._predGeo.attributes.position.array;
    for (var i = 0; i < 60; i++) {
      var tt = i * 0.1;
      var px = v0 * Math.cos(rad) * tt;
      var py = this.p.h0 + v0 * Math.sin(rad) * tt - 0.5 * g * tt * tt;
      if (py < 0) { pPred[i*3] = px; pPred[i*3+1] = 0; pPred[i*3+2] = 0; this._predGeo.setDrawRange(0, i + 1); break; }
      pPred[i*3] = px; pPred[i*3+1] = py; pPred[i*3+2] = 0;
    }
    this._predGeo.attributes.position.needsUpdate = true;
    this._predLine.computeLineDistances();
    this._predLine.visible = true;
    this._updateOverlay(0, 0);
    return;
  }
  this._predLine.visible = false;

  if (this.state === 'landed') {
    this._updateFireButton();
    this._updateSmoke(dt);
    return;
  }

  if (!SimBase.prototype.update.call(this, t, dt)) return;

  var rho = 1.225, vSq = this.vel.lengthSq(), vMag = Math.sqrt(vSq);
  var dragMag = 0.5 * rho * vSq * this.p.Cd * this.p.area;
  if (vMag > EPS) { var dv = this.vel.clone().normalize().multiplyScalar(-dragMag / this.p.mass); this.vel.add(dv.multiplyScalar(dt)); }
  this.vel.y -= this.p.g * dt;

  var prevY = this.pos.y;
  this.pos.add(this.vel.clone().multiplyScalar(dt));

  if (this.pos.y <= 0 && prevY > 0) {
    var t_hit = prevY / (prevY - this.pos.y);
    this.pos.x -= this.vel.x * dt * (1 - t_hit);
    this.pos.z -= this.vel.z * dt * (1 - t_hit);
    this.pos.y = 0;
    this.state = 'landed';
    /* Spawn dust burst at landing */
    for (var s = 0; s < 15; s++) {
      this._spawnSmoke(new THREE.Vector3(this.pos.x, 0.3, this.pos.z));
    }
  } else if (this.pos.y <= 0 && this.p.h0 === 0) {
    this.pos.y = 0;
    this.state = 'landed';
  }

  this._proj.position.copy(this.pos);
  this._setArr(this._vArr, this.vel.clone(), clamp(this.vel.length() / 10, 0.5, 4), this.pos);

  /* Spawn smoke at projectile position while flying */
  if (this.state === 'flying') {
    this._spawnSmoke(this.pos);
  }
  this._updateSmoke(dt);

  this.trail.push(this.pos.clone());
  if (this.trail.length > this.MAXTRAIL) this.trail.shift();
  var tp = this._tGeo.attributes.position.array;
  for (var i = 0; i < this.trail.length; i++) { tp[i*3] = this.trail[i].x; tp[i*3+1] = this.trail[i].y; tp[i*3+2] = this.trail[i].z; }
  this._tGeo.setDrawRange(0, this.trail.length);
  this._tGeo.attributes.position.needsUpdate = true;

  if (this.state === 'landed' && !this._landMarker) {
    /* Landing marker = glowing ring + small sphere */
    var markerGroup = new THREE.Group();
    var ringMesh = new THREE.Mesh(
      new THREE.TorusGeometry(0.8, 0.06, 8, 32),
      new THREE.MeshBasicMaterial({ color: 0xff4444, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending })
    );
    ringMesh.rotation.x = -PI / 2; ringMesh.position.y = 0.1;
    markerGroup.add(ringMesh);
    var dot = new THREE.Mesh(
      new THREE.SphereGeometry(0.3, ROPE.quality.sphereLow[0], ROPE.quality.sphereLow[1]),
      new THREE.MeshBasicMaterial({ color: 0xff4444, transparent: true, opacity: 0.7 })
    );
    dot.position.y = 0.3;
    markerGroup.add(dot);
    this._landMarker = this._add(markerGroup);
    this._landMarker.position.copy(this.pos);
  }

  this._updateOverlay(this.pos.x, this.pos.y);
  this._updateFireButton();
};

ProjSim.prototype._updateSmoke = function(dt) {
  var positions = this._smokePoints.geometry.attributes.position.array;
  for (var i = 0; i < this._smokeMax; i++) {
    if (this._smokeAge[i] < 0) continue;
    this._smokeAge[i] += dt;
    if (this._smokeAge[i] > 1.5) {
      this._smokeAge[i] = -1;
      positions[i*3+1] = -1000;
      continue;
    }
    positions[i*3+1] += dt * 0.5;
    positions[i*3]   += (Math.random() - 0.5) * dt * 0.3;
    positions[i*3+2] += (Math.random() - 0.5) * dt * 0.3;
  }
  this._smokePoints.geometry.attributes.position.needsUpdate = true;
};

ProjSim.prototype.reset = function() {
  SimBase.prototype.reset.call(this);
  this.state = 'ready';
  this.trail = [];
  this._tGeo.setDrawRange(0, 0);
  this._proj.visible = false;
  for (var i = 0; i < this._smokeMax; i++) { this._smokeAge[i] = -1; this._smokePos[i*3+1] = -1000; }
  if (this._landMarker) { this._landMarker.visible = false; this._landMarker = null; }
  this._updateFireButton();
};

ProjSim.prototype.dispose = function() {
  /* Clean up floating FIRE button + style */
  if (this._fireBtn && this._fireBtn.parentNode) {
    this._fireBtn.parentNode.removeChild(this._fireBtn);
    this._fireBtn = null;
  }
  if (this._fireBtnStyle && this._fireBtnStyle.parentNode) {
    this._fireBtnStyle.parentNode.removeChild(this._fireBtnStyle);
    this._fireBtnStyle = null;
  }
  SimBase.prototype.dispose.call(this);
};

ProjSim.prototype._updateOverlay = function(rx, ry) {
  var rad = this.p.angle * PI / 180;
  var vx = this.vel.x !== undefined ? this.vel.x : this.p.v0 * Math.cos(rad);
  var vy = this.vel.y !== undefined ? this.vel.y : this.p.v0 * Math.sin(rad);
  var speed = Math.sqrt(vx*vx + vy*vy);
  var R_ideal = (this.p.v0 * this.p.v0 * Math.sin(2 * rad)) / this.p.g;

  document.getElementById('overlay-text').innerHTML = 'Projectile under gravity and aerodynamic drag. Set Cd = 0 for ideal parabolic path. The dashed line shows the predicted trajectory (no drag). Use the FIRE button on the right to launch.';
  document.getElementById('formula-container').innerHTML = '<div class="formula-block"><div class="formula-label">Ideal Range (Cd = 0)</div>R = v₀²·sin(2θ)/g = ' + R_ideal.toFixed(1) + ' m</div>';

  document.getElementById('live-values').innerHTML = [
    { l: 'x', v: rx.toFixed(1) + ' m' },
    { l: 'y', v: ry.toFixed(1) + ' m' },
    { l: 'speed', v: speed.toFixed(1) + ' m/s' }
  ].map(function(c) { return '<div class="live-chip">' + c.l + ': <span>' + c.v + '</span></div>'; }).join('');
};
