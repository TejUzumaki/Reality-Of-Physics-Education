/* ============================================================
   sims/circular.js — Uniform Circular Motion (Premium)
   PREMIUM: glowing torus orbit ring, high-poly particle with
            comet trail, tapered custom arrows.
   ============================================================ */
function CircSim(engine) {
  SimBase.call(this, engine);
  this.p = { r: 8, omega: 1.0, m: 1 };
  this._cometTrail = [];
  this._cometMax = 60;
}
CircSim.prototype = Object.create(SimBase.prototype);
CircSim.prototype.constructor = CircSim;

CircSim.prototype._setup = function() {
  this._add(new THREE.GridHelper(30, 30, 0x1a2a4a, 0x111a2e));

  /* PREMIUM: glowing torus orbit ring (was thin 1px line) */
  this._ring = this._add(new THREE.Mesh(
    new THREE.TorusGeometry(this.p.r, 0.04, 12, 96),
    new THREE.MeshBasicMaterial({
      color: 0x63caff, transparent: true, opacity: 0.4,
      blending: THREE.AdditiveBlending, depthWrite: false
    })
  ));
  this._ring.rotation.x = PI / 2;
  this._ringGeo = this._ring.geometry; /* for radius updates */

  /* PREMIUM: high-poly particle with polished metal */
  this._particle = this._add(new THREE.Mesh(
    new THREE.SphereGeometry(0.5, ROPE.quality.sphereMid[0], ROPE.quality.sphereMid[1]),
    ROPE.materials.metalPolished(0x63caff)
  ));
  this._particle.castShadow = true;
  this._mainObject = this._particle;

  /* Centre pivot — small bevelled cylinder base + vertical peg */
  var pivotBase = this._add(new THREE.Mesh(
    new THREE.CylinderGeometry(0.4, 0.5, 0.2, 24),
    ROPE.materials.metalBrushed(0x445566)
  ));
  pivotBase.position.y = 0.1; pivotBase.castShadow = true; pivotBase.receiveShadow = true;
  var pivotPeg = this._add(new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.1, 0.4, 16),
    ROPE.materials.metalPolished(0xaabbcc)
  ));
  pivotPeg.position.y = 0.3; pivotPeg.castShadow = true;

  /* Velocity arrow (green) — tapered cylinder + cone */
  this._vArr = this._add(new THREE.ArrowHelper(
    new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0, 0),
    2, 0xa8ff78
  ));

  /* Centripetal acceleration arrow (orange) */
  this._aArr = this._add(new THREE.ArrowHelper(
    new THREE.Vector3(-1, 0, 0), new THREE.Vector3(0, 0, 0),
    2, 0xff9f45
  ));

  /* PREMIUM: comet trail (fading line behind particle) */
  this._cometGeo = new THREE.BufferGeometry();
  this._cometGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(this._cometMax * 3), 3));
  this._cometGeo.setAttribute('alpha', new THREE.BufferAttribute(new Float32Array(this._cometMax), 1));
  this._cometMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: { color: { value: new THREE.Color(0x63caff) } },
    vertexShader: 'attribute float alpha; varying float vAlpha; void main() { vAlpha = alpha; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'uniform vec3 color; varying float vAlpha; void main() { gl_FragColor = vec4(color, vAlpha * 0.6); }'
  });
  this._cometLine = this._add(new THREE.Line(this._cometGeo, this._cometMat));

  this.camera.position.set(0, 15, 22);
};

CircSim.prototype._buildGui = function() {
  var self = this;
  this.gui = new lil.GUI({ title: 'Circular Motion', container: document.getElementById('gui-container'), width: 320 });
  this.gui.add(this.p, 'r', 2, 15, 0.5).name('Radius (m)').onChange(function() { self._updRing(); });
  this.gui.add(this.p, 'omega', 0.1, 5, 0.1).name('Angular Velocity ω (rad/s)');
  this.gui.add(this.p, 'm', 0.1, 10, 0.1).name('Mass (kg)');
};

CircSim.prototype._updRing = function() {
  /* Rebuild torus geometry with new radius */
  var newGeo = new THREE.TorusGeometry(this.p.r, 0.04, 12, 96);
  this._ring.geometry.dispose();
  this._ring.geometry = newGeo;
  this._ringGeo = newGeo;
};

CircSim.prototype.update = function(t, dt) {
  if (!SimBase.prototype.update.call(this, t, dt)) return;

  var th = this.p.omega * this._st;
  var x = this.p.r * Math.cos(th);
  var z = this.p.r * Math.sin(th);
  this._particle.position.set(x, 0.5, z);

  /* Comet trail */
  this._cometTrail.push(new THREE.Vector3(x, 0.5, z));
  if (this._cometTrail.length > this._cometMax) this._cometTrail.shift();
  var cp = this._cometGeo.attributes.position.array;
  var ca = this._cometGeo.attributes.alpha.array;
  for (var i = 0; i < this._cometTrail.length; i++) {
    cp[i*3] = this._cometTrail[i].x;
    cp[i*3+1] = this._cometTrail[i].y;
    cp[i*3+2] = this._cometTrail[i].z;
    ca[i] = i / this._cometTrail.length;
  }
  this._cometGeo.setDrawRange(0, this._cometTrail.length);
  this._cometGeo.attributes.position.needsUpdate = true;
  this._cometGeo.attributes.alpha.needsUpdate = true;

  var v = this.p.r * this.p.omega;
  var ac = this.p.omega * this.p.omega * this.p.r;
  var Fc = this.p.m * ac;

  var tangent = new THREE.Vector3(-Math.sin(th), 0, Math.cos(th));
  var centDir = new THREE.Vector3(-Math.cos(th), 0, -Math.sin(th));

  this._setArr(this._vArr, tangent, clamp(v / 5, 0.5, 4), this._particle.position);
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
    { l: 'v',  v: v.toFixed(2) + ' m/s' },
    { l: 'aₓ', v: ac.toFixed(2) + ' m/s²' },
    { l: 'Fc', v: Fc.toFixed(2) + ' N' }
  ].map(function(c) {
    return '<div class="live-chip">' + c.l + ': <span>' + c.v + '</span></div>';
  }).join('');
};
