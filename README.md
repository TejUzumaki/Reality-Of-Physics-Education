# R.O.P.E.
### Reality of Physics Education

**A classroom-first physics demonstration platform for making abstract concepts visible.**

R.O.P.E. is being developed to help physics teachers explain concepts through interactive, visual demonstrations that can be used directly in a classroom, coaching institute, or educational institution. It is designed with smart boards, large displays, and touch-based teaching in mind, so an educator can demonstrate a physical idea to an entire class without the interface getting in the way.

The project began as **Physim** and is being rebranded and redesigned as R.O.P.E. The goal is not simply to collect simulations on a website. The goal is to build a practical teaching tool that helps educators show what a physical system does, change its conditions in front of students, and connect the resulting behaviour to the physics behind it.

---

## Why R.O.P.E.?

Many physics concepts are difficult to teach using only equations, textbook diagrams, or static slides. Motion changes over time, waves combine, forces affect trajectories, and small changes in a system's parameters can produce visible differences.

R.O.P.E. aims to make these relationships easier to demonstrate. A teacher should be able to open an experiment, adjust its available parameters, show the behaviour on a shared screen, and guide students from observation toward understanding.

**The primary user is the educator.** Students benefit from the demonstration, but the experience is designed first around the needs of someone teaching a class: quick access, clear visuals, readable controls, and a presentation that works from different positions around a classroom.

## The Vision

R.O.P.E. is intended to grow into a browser-based physics teaching and demonstration environment with the following principles:

- **Teach with demonstrations:** use interactive experiments as part of an explanation, not merely as standalone visual toys.
- **Make invisible relationships visible:** show motion and physical behaviour that is difficult to communicate with static diagrams alone.
- **Connect observation to theory:** build toward presenting relevant equations, variable names, units, and explanations alongside a simulation.
- **Support classroom teaching:** make the interface readable on smart boards and large displays, with touch-friendly controls that a teacher can reach from different sides of the screen.
- **Encourage exploration:** let educators change parameters and compare how a system responds, helping students develop intuition before or alongside formal derivations.
- **Stay focused on physics:** use a restrained interface that gives the experiment the most space and attention.
- **Remain easy to access:** run in a modern browser rather than requiring a dedicated desktop application.

These principles describe the project's direction. Not every planned teaching feature is implemented yet.

---

## Current Simulation Set

The current project contains seven interactive physics simulations:

| Simulation | Learning area |
|---|---|
| **Wave Superposition** | Wave behaviour and superposition, with additive-blended resultant glow |
| **Spring-Mass System** | Simple harmonic motion and damped oscillation, with a properly helical spring |
| **Simple Pendulum** | Pendulum motion and angular dynamics, with high-poly bob and 3D rod |
| **Projectile Motion** | Trajectories and motion under gravity (with aerodynamic drag), launched from a 3D cannon |
| **Circular Motion** | Circular dynamics and centripetal acceleration, with a glowing orbit ring and comet trail |
| **1D Collisions** | Momentum and restitution, with rotation stripes that visualise spin and an impact particle burst |
| **Orbital Mechanics** | Gravitational interaction and orbital motion, with a glowing sun halo, planet atmospheres, and a starfield |

Each simulation is rendered with physically-based materials, ACES Filmic tone mapping, and a procedural environment map so metallic surfaces catch real reflections instead of looking flat.

---

## Visual Quality

R.O.P.E. is built on Three.js with a deliberate focus on visual fidelity suitable for projection on a large smart board:

- **Physically-based rendering:** every metallic surface (spring, pendulum bob, projectile, planets, ball bearings) uses `MeshStandardMaterial` with appropriate metalness and roughness, lit by directional + ambient + fill lights.
- **Procedural environment map:** generated once at startup so metallic surfaces show real reflections even where direct light does not reach.
- **ACES Filmic tone mapping + sRGB output:** produces warm, film-like colours that read well on a board.
- **Soft shadows:** `PCFSoftShadowMap` at 2048×2048, with the shadow frustum tightened per scene where applicable.
- **Per-sim geometry detail:** main subject meshes use 48–64 segment spheres; props use 16–32 segments. The spring tube uses 12 radial segments (was 3 in the original prototype) so the coil cross-section is properly round instead of triangular.
- **Particle systems:** smoke trail and dust-burst on landing for projectile, white spark burst at the moment of collision, comet trail behind the orbiting particle.
- **Shader-based trails:** the pendulum and circular motion sims use a custom shader material with per-vertex alpha, so the trail fades head-to-tail like a comet instead of staying a constant-opacity stripe.
- **Atmosphere shader:** planets in the orbital mechanics sim use a fresnel-based additive shader for a subtle rim glow, so each planet reads as a world rather than a coloured ball.
- **Sun glow halo:** a sprite with a radial-gradient texture gives the central star a soft corona.

A consistent material library (`ROPE.materials.metalPolished`, `metalBrushed`, `plastic`, `emissive`) keeps the look art-directed and uniform across all simulations.

---

## Smartboard Optimisation

The renderer clamps `devicePixelRatio` to a maximum of 1.5. Rendering at 2× on a 4K smartboard pushes roughly 8.2 million pixels per frame and causes GPU jitter; 1.5× looks sharp on a 75-inch board while preventing frame drops. Shadow maps are capped at 2048×2048 in 2D view and selectively tightened per scene in 3D view.

The total triangle budget per scene is approximately 30K triangles — well within any modern smartboard GPU at 60 fps, while still feeling premium.

---

## Projectile Cannon

The projectile simulation includes a visible 3D cannon at the launch position — two wheels with spokes, a wooden carriage, a rotating barrel, a reinforcement ring, and a muzzle ring. The barrel rotates live as the launch angle slider is changed, giving the teacher immediate visual feedback on where the projectile will go. A support platform appears automatically when the launch height (`h0`) is set above zero.

A large pulsing **FIRE** button is provided outside the controls panel, on the right side of the canvas, so the teacher can launch without diving into the parameter controls during a lecture. The button transitions through three states — **FIRE** (red, pulsing) → **FLYING** (blue, steady) → **RESET** (green, steady) — and is cleaned up entirely when the user switches to another simulation.

A dashed predicted trajectory line is shown in the "ready" state, computed in closed form (no drag). Once fired, the projectile leaves a smoke trail and a dust-burst spawns at the landing point.

---

## Integrators and Physics Fidelity

Each simulation uses the integrator best suited to its dynamics, with the choice documented in code comments inside the simulation files:

- **Pendulum:** Velocity Verlet — a symplectic integrator that conserves energy accurately over long runs and does not artificially gain amplitude like standard Euler.
- **Orbital Mechanics:** Velocity Verlet — same reason; keeps orbits stable indefinitely.
- **Spring-Mass SHM:** Semi-implicit Euler with a damping term — correct for the damped harmonic case.
- **Projectile Motion:** Explicit Euler with sub-frame linear interpolation at the ground-crossing frame, so the projectile never appears to hover under or inside the ground mesh.

For a teacher who wants to explain *why* the simulation is trustworthy, the integrator choice is visible in the source of each sim file alongside a comment explaining the trade-off.

---

## Designed for the Classroom

R.O.P.E.'s interface is being shaped around classroom use rather than conventional desktop-only navigation.

- **Large-screen readability:** important information and controls remain legible when projected or displayed on a smart board.
- **Touch-oriented interaction:** controls are practical to operate on touch-enabled displays.
- **Edge-accessible panels:** teaching controls are reachable from the left, right, or bottom edge, accommodating different teaching positions and screen orientations.
- **Experiment-first layout:** the simulation remains the visual focus, with interface panels available when needed.
- **Clear viewing modes:** supported 2D and 3D views help present an experiment from an appropriate perspective, with per-sim camera presets that switch atomically without a visual jump.
- **Motion trails where supported:** per-vertex-alpha trails and a global ghost-trail toggle help make trajectories and movement patterns easier to follow during a demonstration.
- **Teacher / Student mode:** a single tap on the mode badge in the top bar hides every control, so the teacher can hand the board to a student mid-class without the student accidentally changing parameters.

The intended result is a tool a teacher can use live while explaining a concept, rather than a page that requires the class to wait while the teacher navigates a complicated interface.

---

## Where the Project Is Heading

The longer-term educational direction includes capabilities such as:

- **Equations connected to the simulation:** show the relevant relationships and identify the variables involved.
- **Units and variable explanations:** help learners understand what each quantity represents and how it is measured.
- **Live measurements and analysis:** make useful values available while an experiment is running.
- **Synchronised graphs:** connect visual motion with graph-based representations where appropriate.
- **Teaching explanations:** provide context for the behaviour students are observing.
- **Suggested classroom experiments:** offer prompts for changing parameters, making predictions, and discussing results.
- **A broader library of physics topics:** expand beyond the initial set of mechanics and wave demonstrations.
- **Save and share simulation states:** deep-link a parameter set so a teacher can resume or share a tuned demo.

These are development aims, not claims that all these capabilities are available in the current version.

---

## Project Structure

The application is organised into a small set of browser-based files, with the engine separated from the individual simulation implementations.

```text
Physim/
├── index.html
├── engine.js
├── bg.js
├── sim-registry.js
├── rope-ui.css
├── rope-ui.js
└── sims/
    ├── wave.js
    ├── shm.js
    ├── projectile.js
    ├── pendulum.js
    ├── circular.js
    ├── collision.js
    └── gravity.js
```

- `index.html` — application entry point and page structure.
- `engine.js` — core simulation engine, including the `LabEngine` class, the `SimBase` lifecycle, the `ROPE.materials` library, the procedural environment map, and shared helpers (`_fatLine`, `_roundedBox`, `_sprite`).
- `bg.js` — ambient background particles for the home screen.
- `sim-registry.js` — simulation registration, ordering, and initialisation.
- `rope-ui.css` — interface styling and layout.
- `rope-ui.js` — interface interactions.
- `sims/` — individual simulation implementations.

The repository may still use the original `Physim` name in paths or repository metadata while the product is branded as R.O.P.E.

---

## Running Locally

R.O.P.E. is a browser-based project. To run a local copy, use a modern browser and a local HTTP server.

```bash
git clone https://github.com/TejUzumaki/Physim.git
cd Physim
python -m http.server 8000
```

Then open `http://localhost:8000` in the browser on the same device. If the project is moved to a repository with a different name, use that repository's clone URL instead.

---

## Technology

The current project uses browser technologies:

- **HTML** for the page structure.
- **CSS** for layout and visual presentation.
- **JavaScript** for simulation behaviour and interface interactions.
- **Three.js r128** for 3D rendering, with `OrbitControls` for camera interaction.
- **lil-gui** for parameter controls.
- **Lucide icons** for interface affordances.

The implementation is modular so the engine, interface, and individual experiments can evolve without turning the project into a single monolithic file. There is no build step, no bundler, and no backend — a teacher can clone the repository onto a USB stick and run it offline on a school network that blocks npm.

---

## Project Status

R.O.P.E. is an evolving project. The current focus is preserving the existing physics simulations while improving the visual fidelity, simulation accuracy, and classroom usability. The visual layer has been upgraded to physically-based rendering with a procedural environment map, ACES tone mapping, high-poly geometry, and per-sim polish (smoke trails, particle bursts, atmosphere shaders, glowing halos). The broader educational layer — connecting simulations to equations, measurements, graphs, and guided teaching — is part of the intended direction and should be developed incrementally.

---

## Contributing and Feedback

Ideas for useful classroom demonstrations, improvements to touch interaction, simulation accuracy, accessibility, and teaching-oriented features are valuable. When proposing a change, consider how it helps an educator explain a concept clearly to a group of students.

---

## Project Identity

**R.O.P.E. — Reality of Physics Education**

*A physics demonstration platform built around the way physics is taught and learned.*

The ambition is straightforward: help teachers turn abstract physics into something a class can observe, investigate, and understand.
