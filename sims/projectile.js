/* ============================================================
   sims/projectile.js — Projectile Motion 
   TIER 1 FIX: Ground Clipping (Linear Interpolation to y=0)
   ============================================================ */

function ProjSim(engine) {
    SimBase.call(this, engine);
    this.p = { v0: 30, angle: 45, g: 9.81, h0: 0, Cd: 0.0, mass: 1.0, area: 0.1 };
    this.state = 'ready';
    this.pos   = new THREE.Vector3();
    this.vel   = new THREE.Vector3();
    this.trail = [];
    this.MAXTRAIL = 500;
}
ProjSim.prototype = Object.create(SimBase.prototype);
ProjSim.prototype.constructor = ProjSim;

ProjSim.prototype._setup = function () {
    this.scene.fog = null;
    this.renderer.setClearColor(0x87CEEB, 1);
    this.engine.ambientLight.color.set(0xffffff);
    this.engine.ambientLight.intensity = 0.6;
    
    var sun = new THREE.DirectionalLight(0xffffff, 1.5);
    sun.position.set(30, 50, 20); sun.castShadow = true;
    sun.shadow.mapSize.width = 2048; sun.shadow.mapSize.height = 2048;
    sun.shadow.camera.left = -100; sun.shadow.camera.right = 100;
    sun.shadow.camera.top = 100; sun.shadow.camera.bottom = -100;
    this._add(sun);
    this._add(new THREE.HemisphereLight(0x87CEEB, 0x556B2F, 0.4));

    var groundGeo = new THREE.PlaneGeometry(1000, 1000);
    var groundMat = new THREE.MeshStandardMaterial({ color: 0x5a8f4a, roughness: 0.9, metalness: 0.0 });
    var ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2; ground.position.y = -0.05; ground.receiveShadow = true;
    this._add(ground);

    var gridHelper = new THREE.GridHelper(1000, 100, 0x4a7a3a, 0x4a7a3a);
    gridHelper.position.y = 0.01;
    gridHelper.material.opacity = 0.2; gridHelper.material.transparent = true;
    this._add(gridHelper);

    this._proj = this._add(new THREE.Mesh(
        new THREE.SphereGeometry(0.35),
        new THREE.MeshStandardMaterial({color: 0xff4444, metalness: 0.3, roughness: 0.4})
    ));
    this._proj.castShadow = true;

    this._mainObject = this._proj;

    this._tGeo = new THREE.BufferGeometry();
    this._tGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(this.MAXTRAIL * 3), 3));
    this._tLine = this._add(new THREE.Line(this._tGeo, new THREE.LineBasicMaterial({color: 0xff4444, transparent: true, opacity: 0.5})));

    this._vArr = this._add(new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0, 0), 2, 0xa8ff78));

    this.camera.position.set(-10, 15, 40);
    this.engine.orbit.target.set(20, 5, 0);
};

ProjSim.prototype._buildGui = function () {
    var self = this;
    this.gui = new lil.GUI({title: 'Projectile (w/ Drag)', container: document.getElementById('gui-container'), width: 320});
    var fInit = this.gui.addFolder('Initial Conditions');
    fInit.add(this.p, 'v0', 1, 100, 1).name('Speed (m/s)');
    fInit.add(this.p, 'angle', 0, 90, 1).name('Launch Angle (°)');
    fInit.add(this.p, 'h0', 0, 50, 1).name('Height (m)');
    fInit.open();
    var fEnv = this.gui.addFolder('Environment');
    fEnv.add(this.p, 'g', 1, 20, 0.1).name('Gravity (m/s²)');
    fEnv.add(this.p, 'Cd', 0, 1.0, 0.01).name('Drag Coefficient');
    fEnv.add(this.p, 'mass', 0.1, 10, 0.1).name('Mass (kg)');
    fEnv.open();
    var o = {
        Launch: function () { self._launch(); },
        Reset:  function () { 
            self.state = 'ready'; self.trail = []; self._tGeo.setDrawRange(0, 0); 
            self._clearGhosts(); 
            if(self._landMarker){self._landMarker.visible=false; self._landMarker=null;} 
        }
    };
    this.gui.add(o, 'Launch').name('🚀 FIRE');
    this.gui.add(o, 'Reset').name('↺ Reset');
};

ProjSim.prototype._launch = function () {
    this.state = 'flying';
    var rad = this.p.angle * PI / 180;
    this.pos.set(0, this.p.h0, 0);
    this.vel.set(this.p.v0 * Math.cos(rad), this.p.v0 * Math.sin(rad), 0);
    this.trail = []; 
    this._tGeo.setDrawRange(0, 0); 
    this._clearGhosts();
    if(this._landMarker){this._landMarker.visible=false; this._landMarker=null;}
};

ProjSim.prototype.update = function (t, dt) {
    if (this.state === 'ready') {
        var rad = this.p.angle * PI / 180;
        this._proj.position.set(0, this.p.h0, 0);
        this._setArr(this._vArr, new THREE.Vector3(Math.cos(rad), Math.sin(rad), 0), 2.5, this._proj.position);
        this._updateOverlay(0, 0); return;
    }
    if (this.state === 'landed') return;

    if (!SimBase.prototype.update.call(this, t, dt)) return;

    var rho = 1.225, vSq = this.vel.lengthSq(), vMag = Math.sqrt(vSq);
    var dragMag = 0.5 * rho * vSq * this.p.Cd * this.p.area;
    if (vMag > EPS) { var dv = this.vel.clone().normalize().multiplyScalar(-dragMag / this.p.mass); this.vel.add(dv.multiplyScalar(dt)); }
    this.vel.y -= this.p.g * dt;

    /* TIER 1 FIX: Ground Clipping Prevention
       Instead of just snapping to y=0 after it dips under, we use linear 
       interpolation to find the EXACT frame the projectile hit y=0. 
       This rewinds the X/Z position perfectly to the landing spot, 
       ensuring it never visually hovers under or inside the ground mesh. */
    var prevY = this.pos.y;
    this.pos.add(this.vel.clone().multiplyScalar(dt));

    if (this.pos.y <= 0 && prevY > 0) {
        // Calculate exact fraction of dt where y crossed 0
        var t_hit = prevY / (prevY - this.pos.y);
        
        // Rewind position to the exact mathematical landing point
        this.pos.x -= this.vel.x * dt * (1 - t_hit);
        this.pos.z -= this.vel.z * dt * (1 - t_hit);
        this.pos.y = 0;
        this.state = 'landed';
    } else if (this.pos.y <= 0 && this.p.h0 === 0) {
        // Edge case fallback for pure ground launches
        this.pos.y = 0;
        this.state = 'landed';
    }

    this._proj.position.copy(this.pos);
    this._setArr(this._vArr, this.vel.clone(), clamp(this.vel.length() / 10, 0.5, 4), this.pos);

    this.trail.push(this.pos.clone());
    if (this.trail.length > this.MAXTRAIL) this.trail.shift();
    var tp = this._tGeo.attributes.position.array;
    for (var i = 0; i < this.trail.length; i++) { tp[i*3] = this.trail[i].x; tp[i*3+1] = this.trail[i].y; tp[i*3+2] = this.trail[i].z; }
    this._tGeo.setDrawRange(0, this.trail.length);
    this._tGeo.attributes.position.needsUpdate = true;

    if (this.state === 'landed' && !this._landMarker) {
        this._landMarker = this._add(new THREE.Mesh(new THREE.SphereGeometry(0.5), new THREE.MeshBasicMaterial({color: 0xff0000, transparent: true, opacity: 0.5})));
        this._landMarker.position.copy(this.pos); this._landMarker.position.y = 0.5;
    }

    this._updateOverlay(this.pos.x, this.pos.y);
};

ProjSim.prototype.reset = function () {
    SimBase.prototype.reset.call(this);
    this.state = 'ready'; this.trail = []; this._tGeo.setDrawRange(0, 0);
    if(this._landMarker){this._landMarker.visible=false; this._landMarker=null;}
};

ProjSim.prototype._updateOverlay = function (rx, ry) {
    var rad = this.p.angle * PI / 180;
    var vx = this.vel.x !== undefined ? this.vel.x : this.p.v0 * Math.cos(rad);
    var vy = this.vel.y !== undefined ? this.vel.y : this.p.v0 * Math.sin(rad);
    var speed = Math.sqrt(vx*vx + vy*vy);
    var R_ideal = (this.p.v0 * this.p.v0 * Math.sin(2 * rad)) / this.p.g;

    document.getElementById('overlay-text').innerHTML = 'Projectile under gravity and aerodynamic drag. Set Cd = 0 for ideal parabolic path. The flat ground allows accurate measurement of Range (R).';
    document.getElementById('formula-container').innerHTML = '<div class="formula-block"><div class="formula-label">Ideal Range (Cd = 0)</div>R = v₀²·sin(2θ)/g = ' + R_ideal.toFixed(1) + ' m</div>';

    document.getElementById('live-values').innerHTML = [
        { l: 'x', v: rx.toFixed(1) + ' m' },
        { l: 'y', v: ry.toFixed(1) + ' m' },
        { l: 'speed', v: speed.toFixed(1) + ' m/s' }
    ].map(function (c) { return '<div class="live-chip">' + c.l + ': <span>' + c.v + '</span></div>'; }).join('');
};
