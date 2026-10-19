/* ============================================================
   sim-registry.js — Textbook-Perfect Camera Presets
   ============================================================ */
var SIMS = {
    wave:      { Cls: WaveSim,      title: 'Wave Superposition', sub: 'v = fλ  |  Non-dispersive medium', icon: '≈', subtext: 'v = fλ', section: 'Waves & Oscillation' },
    shm:       { Cls: SHMSim,       title: 'Spring-Mass System', sub: 'Damped Harmonic Oscillator',      icon: '⟳', subtext: 'F = −kx', section: 'Waves & Oscillation' },
    pendulum:  { Cls: PendulumSim,  title: 'Simple Pendulum',    sub: 'Large-Angle Physics (Exact)',     icon: '◡', subtext: 'T = 2π√(L/g)', section: 'Waves & Oscillation' },
    proj:      { Cls: ProjSim,      title: 'Projectile Motion',  sub: 'With Aerodynamic Drag',          icon: '⌒', subtext: 'Quadratic drag', section: 'Kinematics & Dynamics' },
    circular:  { Cls: CircSim,      title: 'Circular Motion',    sub: 'Centripetal Force & Acceleration',icon: '◎', subtext: 'aₓ = ω²r', section: 'Kinematics & Dynamics' },
    collision: { Cls: CollSim,      title: '1D Collisions',      sub: 'Momentum & Restitution',          icon: '⇄', subtext: 'p = mv', section: 'Kinematics & Dynamics' },
    gravity:   { Cls: GravitySim,   title: 'Orbital Mechanics',  sub: 'Static Sun (Velocity Verlet)',    icon: '🪐', subtext: 'F = GM₁M₂/r²', section: 'Gravity & Orbits' }
};

var PRESETS = {
    wave:      { '2d': { pos: [0, 0, 28], target: [0, 0, 0] }, '3d': { pos: [0, 10, 28], target: [0, 0, 0] } },
    shm:       { '2d': { pos: [0, 2, 20], target: [0, 2, 0] }, '3d': { pos: [0, 2, 15], target: [0, 2, 0] } },
    pendulum:  { '2d': { pos: [0, 3, 25], target: [0, 3, 0] }, '3d': { pos: [0, 4, 18], target: [0, 3, 0] } },
    proj:      { '2d': { pos: [-10, 15, 60], target: [20, 5, 0] }, '3d': { pos: [-10, 15, 40], target: [20, 5, 0] } },
    
    /* FIX: Top-down Y-axis view for 2D to show true circles */
    circular:  { '2d': { pos: [0, 50, 0.1], target: [0, 0, 0] }, '3d': { pos: [0, 15, 22], target: [0, 0, 0] } },
    gravity:   { '2d': { pos: [0, 50, 0.1], target: [0, 0, 0] }, '3d': { pos: [0, 20, 40], target: [0, 0, 0] } },
    
    collision: { '2d': { pos: [0, 0, 30], target: [0, 0, 0] }, '3d': { pos: [0, 5, 20], target: [0, 0, 0] } },
    default:   { '2d': { pos: [0, 0, 40], target: [0, 0, 0] }, '3d': { pos: [0, 10, 30], target: [0, 0, 0] } }
};

(function buildSimGrid(){
    var grid=document.getElementById('sim-grid'), keys=Object.keys(SIMS), lastSec=null;
    keys.forEach(function(key){
        var meta=SIMS[key];
        if(meta.section&&meta.section!==lastSec){lastSec=meta.section; var l=document.createElement('div');l.className='grid-sec-label';l.textContent=meta.section;grid.appendChild(l);}
        var tile=document.createElement('button'); tile.className='sim-tile rh'; tile.id='btn-'+key;
        tile.onclick=function(){switchSim(key);closeSheet()};
        tile.innerHTML='<div class="st-icon">'+(meta.icon||'●')+'</div><div class="st-text"><span class="st-name">'+meta.title+'</span><span class="st-formula">'+(meta.subtext||'')+'</span></div><div class="st-check">✓</div>';
        grid.appendChild(tile);
    });
})();

var _engine=null, _curKey=null;
window.switchSim=function(key){
    if(!SIMS[key]||key===_curKey) return;
    var overlay=document.getElementById('transition-overlay'); overlay.classList.add('active');
    setTimeout(function(){
        var meta=SIMS[key]; 
        var simInstance = new meta.Cls(_engine);
        simInstance.cameraPresets = PRESETS[key] || PRESETS.default;
        _engine.loadSim(simInstance); _curKey=key;
        document.getElementById('sim-title').textContent=meta.title;
        document.getElementById('sim-subtitle').textContent=meta.sub;
        document.getElementById('overlay-sim-badge').textContent=meta.title;
        Object.keys(SIMS).forEach(function(k){var el=document.getElementById('btn-'+k);if(el)el.classList.remove('active')});
        var a=document.getElementById('btn-'+key); if(a) a.classList.add('active');
        overlay.classList.remove('active');
    },380);
};

window.addEventListener('DOMContentLoaded',function(){
    window._ghostEnabled=false;
    _engine=new LabEngine('canvas-container'); _engine.start();
    _curKey=null; switchSim(Object.keys(SIMS)[0]);
    updateViewModeUI();
    setTimeout(function(){var ls=document.getElementById('loading-screen');if(ls){ls.classList.add('fade-out');setTimeout(function(){ls.style.display='none'},600)}},4000);
});
