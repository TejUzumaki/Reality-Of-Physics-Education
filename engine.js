/* ============================================================
   engine.js — PhySim Core Engine (Smartboard & Ghost Fixes)
   ============================================================ */
'use strict';
var PI=Math.PI, TAU=PI*2, EPS=1e-9;
function clamp(v,lo,hi){return Math.max(lo,Math.min(hi,v))}
function lerp(a,b,t){return a+(b-a)*t}

function LabEngine(containerId){
    this.el=document.getElementById(containerId);
    this.w=this.el.clientWidth; this.h=this.el.clientHeight;
    this.activeSim=null; this.viewMode='2d';
    
    this.renderer=new THREE.WebGLRenderer({antialias:true,alpha:false});
    
    /* TIER 1 FIX: Smartboard / 4K Optimization
       Cap pixel ratio at 1.5 max. Rendering at 2x on a 4K smartboard
       pushes 8.2 million pixels per frame, causing GPU bottleneck & jitter.
       1.5x looks sharp but prevents frame drops. */
    var dpr = window.devicePixelRatio > 1.5 ? 1.5 : window.devicePixelRatio;
    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(this.w,this.h);
    this.renderer.setClearColor(0x04070e,1);
    this.renderer.shadowMap.enabled=true;
    this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;
    this.el.appendChild(this.renderer.domElement);
    this.renderer.domElement.style.touchAction='none';
    this.renderer.domElement.addEventListener('touchmove',function(e){e.preventDefault()},{passive:false});
    this.renderer.domElement.addEventListener('gesturestart',function(e){e.preventDefault()});

    this.scene=new THREE.Scene();
    this.scene.fog=new THREE.FogExp2(0x04070e,0.012);

    this.perspCamera=new THREE.PerspectiveCamera(45,this.w/this.h,0.1,1000);
    this.perspCamera.position.set(0,10,30);

    var aspect=this.w/this.h, sz=30;
    this.orthoCamera=new THREE.OrthographicCamera(-sz*aspect/2,sz*aspect/2,sz/2,-sz/2,0.1,1000);
    this.orthoCamera.position.set(0,0,50);
    this.orthoCamera.lookAt(0,0,0);

    this.camera=this.orthoCamera;

    this.perspOrbit=new THREE.OrbitControls(this.perspCamera,this.renderer.domElement);
    this.perspOrbit.enableDamping=true; this.perspOrbit.dampingFactor=0.06;
    this.perspOrbit.minDistance=2; this.perspOrbit.maxDistance=200;

    this.orthoOrbit=new THREE.OrbitControls(this.orthoCamera,this.renderer.domElement);
    this.orthoOrbit.enableDamping=true; this.orthoOrbit.dampingFactor=0.06;
    this.orthoOrbit.enableRotate=false; this.orthoOrbit.enabled=false;

    var self = this;
    Object.defineProperty(this, 'orbit', {
        get: function() { return self.viewMode === '2d' ? self.orthoOrbit : self.perspOrbit; }
    });

    this.ambientLight=new THREE.AmbientLight(0x1a2a4a,1.8);
    this.scene.add(this.ambientLight);
    var dirLight=new THREE.DirectionalLight(0x63caff,0.9);
    dirLight.position.set(10,20,10); dirLight.castShadow=true;
    dirLight.shadow.mapSize.width=2048; dirLight.shadow.mapSize.height=2048;
    this.scene.add(dirLight);
    var fillLight=new THREE.DirectionalLight(0xffa07a,0.3);
    fillLight.position.set(-10,5,-10); this.scene.add(fillLight);

    window.addEventListener('resize',function(){
        self.w=self.el.clientWidth; self.h=self.el.clientHeight;
        self.perspCamera.aspect=self.w/self.h; self.perspCamera.updateProjectionMatrix();
        var a=self.w/self.h, s=30;
        self.orthoCamera.left=-s*a/2; self.orthoCamera.right=s*a/2;
        self.orthoCamera.top=s/2; self.orthoCamera.bottom=-s/2; self.orthoCamera.updateProjectionMatrix();
        self.renderer.setSize(self.w,self.h);
        if(self.activeSim) self.activeSim.onResize();
    });
}

LabEngine.prototype._matchOrthoFrustum=function(){
    var dist=this.perspCamera.position.distanceTo(this.perspOrbit.target);
    var h=2*Math.tan(this.perspCamera.fov*Math.PI/360)*dist;
    var a=this.w/this.h;
    this.orthoCamera.left=-h*a/2; this.orthoCamera.right=h*a/2;
    this.orthoCamera.top=h/2; this.orthoCamera.bottom=-h/2;
    this.orthoCamera.updateProjectionMatrix();
};

LabEngine.prototype.setViewMode=function(mode){
    this.viewMode=mode;
    var sim=this.activeSim;
    var preset=sim&&sim.cameraPresets?sim.cameraPresets[mode]:null;
    if(mode==='2d'){
        this.renderer.shadowMap.enabled=false; 
        if(preset){this.orthoCamera.position.set(...preset.pos);this.orthoOrbit.target.set(...preset.target);this.orthoOrbit.update();}
        else{this.orthoCamera.position.copy(this.perspCamera.position);this.orthoCamera.quaternion.copy(this.perspCamera.quaternion);this.orthoOrbit.target.copy(this.perspOrbit.target);}
        this._matchOrthoFrustum();
        this.perspOrbit.enabled=false; this.orthoOrbit.enabled=true;
        this.camera=this.orthoCamera;
    } else {
        this.renderer.shadowMap.enabled=true;
        if(preset){this.perspCamera.position.set(...preset.pos);this.perspOrbit.target.set(...preset.target);this.perspOrbit.update();}
        else{this.perspCamera.position.copy(this.orthoCamera.position);this.perspCamera.quaternion.copy(this.orthoCamera.quaternion);this.perspOrbit.target.copy(this.orthoOrbit.target);}
        this.orthoOrbit.enabled=false; this.perspOrbit.enabled=true;
        this.camera=this.perspCamera;
    }
};

LabEngine.prototype.loadSim=function(sim){
    if(this.activeSim) this.activeSim.dispose();
    this.activeSim=sim;
    this.activeSim.build(this.scene,this.perspCamera,this.renderer);
    this.setViewMode(this.viewMode);
};

LabEngine.prototype.start=function(){
    var clock=new THREE.Clock(), self=this;
    (function tick(){
        requestAnimationFrame(tick);
        var dt=clock.getDelta(), t=clock.getElapsedTime();
        if(dt > 0.033) dt = 0.033; 
        if(self.viewMode==='2d') self.orthoOrbit.update(); else self.perspOrbit.update();
        if(self.activeSim) self.activeSim.update(t,dt);
        self.renderer.render(self.scene,self.camera);
    })();
};

/* ─── SimBase ─── */
function SimBase(engine){
    this.engine=engine; this.scene=null; this.camera=null; this.renderer=null;
    this.gui=null; this._objs=[]; this._st=0; this._paused=false;
    this._mainObject=null; 
    this._ghosts=[]; this._ghostTimer=0; 
    
    /* TIER 1 FIX: Reduced from 50 to 5 to prevent messy fluttering */
    this._ghostMax=5; 
    this._ghostInterval=0.2; 
}
SimBase.prototype.build=function(scene,camera,renderer){
    this.scene=scene; this.camera=camera; this.renderer=renderer; this._st=0; this._paused=false;
    this._ghosts=[]; this._ghostTimer=0; this._mainObject=null;
    document.getElementById('energy-container').style.display='none';
    document.getElementById('momentum-container').style.display='none';
    document.getElementById('overlay-text').innerHTML='';
    document.getElementById('formula-container').innerHTML='';
    document.getElementById('live-values').innerHTML='';
    document.getElementById('info-overlay').classList.remove('hidden');
    this.scene.fog=new THREE.FogExp2(0x04070e,0.012);
    this.renderer.setClearColor(0x04070e,1);
    this.engine.ambientLight.color.set(0x1a2a4a);
    this.engine.ambientLight.intensity=1.8;
    this._setup(); this._buildGui();
};
SimBase.prototype._setup=function(){};
SimBase.prototype._buildGui=function(){};

/* TIER 1 FIX: Return boolean to strictly enforce Global Pause */
SimBase.prototype.update=function(t,dt){
    if(this._paused) return false; // HALT EVERYTHING
    this._st += dt;
    
    if(window._ghostEnabled && this._mainObject) {
        this._ghostTimer += dt;
        if(this._ghostTimer >= this._ghostInterval) {
            this._ghostTimer = 0;
            var ghost = this._mainObject.clone();
            ghost.material = new THREE.MeshBasicMaterial({color: 0xffffff, wireframe: true, transparent: true, opacity: 0.3});
            this._add(ghost);
            this._ghosts.push(ghost);
            if(this._ghosts.length > this._ghostMax) {
                var oldGhost = this._ghosts.shift();
                this.scene.remove(oldGhost);
                if(oldGhost.geometry) oldGhost.geometry.dispose();
                if(oldGhost.material) oldGhost.material.dispose();
                var idx = this._objs.indexOf(oldGhost);
                if (idx > -1) this._objs.splice(idx, 1);
            }
        }
    }
    return true; // ALLOW SIM TO RUN
};

SimBase.prototype.onResize=function(){};
SimBase.prototype.reset=function(){ this._st=0; this._clearGhosts(); };
SimBase.prototype.togglePause=function(){
    this._paused=!this._paused;
    document.getElementById('pause-indicator').style.display=this._paused?'block':'none';
};
SimBase.prototype.dispose=function(){
    for(var i=0;i<this._objs.length;i++){
        var o=this._objs[i]; this.scene.remove(o);
        if(o.geometry) o.geometry.dispose();
        if(o.material){if(Array.isArray(o.material)) o.material.forEach(function(m){m.dispose()}); else o.material.dispose();}
    }
    this._objs=[]; this._ghosts=[];
    if(this.gui){this.gui.destroy(); this.gui=null;}
    document.getElementById('pause-indicator').style.display='none';
};
SimBase.prototype._add=function(obj){this.scene.add(obj); this._objs.push(obj); return obj;};
SimBase.prototype._line=function(pts,color,opacity){
    return new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),new THREE.LineBasicMaterial({color:color,transparent:true,opacity:opacity!==undefined?opacity:1.0}));
};
SimBase.prototype._setArr=function(arrow,dir,len,pos){
    if(len<0.05){arrow.visible=false;return;}
    arrow.visible=true; arrow.setDirection(dir.normalize());
    arrow.setLength(len,Math.min(len*0.25,0.4),Math.min(len*0.18,0.3));
    arrow.position.copy(pos);
};
SimBase.prototype._clearGhosts=function(){
    this._ghosts.forEach(function(g){
        this.scene.remove(g); if(g.geometry) g.geometry.dispose(); if(g.material) g.material.dispose();
        var idx = this._objs.indexOf(g); if (idx > -1) this._objs.splice(idx, 1);
    }.bind(this)); 
    this._ghosts=[]; this._ghostTimer=0;
};
