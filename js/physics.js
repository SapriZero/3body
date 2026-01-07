// physics.js — Pure physics engine (no DOM, no graphics)

function vec3(x = 0, y = 0, z = 0) {
    return [x, y, z];
}

// Vector utilities (immutable)
const Vec3 = {
    add: (a, b) => [a[0]+b[0], a[1]+b[1], a[2]+b[2]],
    sub: (a, b) => [a[0]-b[0], a[1]-b[1], a[2]-b[2]],
    scale: (v, s) => [v[0]*s, v[1]*s, v[2]*s],
    dot: (a, b) => a[0]*b[0] + a[1]*b[1] + a[2]*b[2],
    norm: (v) => Math.sqrt(Vec3.dot(v, v)),
    copy: (v) => [v[0], v[1], v[2]]
};

class Body {
    constructor(m, r, v) {
        this.m = m;
        this.r = Vec3.copy(r);
        this.v = Vec3.copy(v);
    }
}

// State = Body[]
function masses(state) { return state.map(b => b.m); }
function positions(state) { return state.map(b => Vec3.copy(b.r)); }
function velocities(state) { return state.map(b => Vec3.copy(b.v)); }

function accelerations(state, G = 1.0, eps = 1e-12) {
    const pos = positions(state);
    const m = masses(state);
    const N = state.length;
    const acc = Array(N).fill().map(() => vec3());

    for (let i = 0; i < N; i++) {
        for (let j = 0; j < N; j++) {
            if (i === j) continue;
            const dx = Vec3.sub(pos[j], pos[i]);
            const distSq = Vec3.dot(dx, dx);
            const distCubed = Math.sqrt(distSq) * distSq + eps;
            const factor = G * m[j] / distCubed;
            acc[i] = Vec3.add(acc[i], Vec3.scale(dx, factor));
        }
    }
    return acc;
}

function kineticEnergy(state) {
    return 0.5 * state.reduce((sum, b, i) => 
        sum + b.m * Vec3.dot(velocities(state)[i], velocities(state)[i]), 0);
}

function potentialEnergy(state, G = 1.0, eps = 1e-12) {
    const pos = positions(state);
    const m = masses(state);
    const N = state.length;
    let pe = 0;
    for (let i = 0; i < N; i++) {
        for (let j = i + 1; j < N; j++) {
            const dr = Vec3.sub(pos[j], pos[i]);
            const r = Vec3.norm(dr) + eps;
            pe -= G * m[i] * m[j] / r;
        }
    }
    return pe;
}

function totalEnergy(state) {
    return kineticEnergy(state) + potentialEnergy(state);
}

// Pure relations
function addVelocity(state, dv) {
    return state.map((b, i) => new Body(b.m, b.r, Vec3.add(b.v, dv[i])));
}

function addPosition(state, dx) {
    return state.map((b, i) => new Body(b.m, Vec3.add(b.r, dx[i]), b.v));
}

function halfStepVelocityRelation(state, dt) {
    const a = accelerations(state);
    const dv = a.map(ai => Vec3.scale(ai, dt / 2));
    return addVelocity(state, dv);
}

function fullStepPositionRelation(state, dt) {
    const v = velocities(state);
    const dx = v.map(vi => Vec3.scale(vi, dt));
    return addPosition(state, dx);
}

function compose(...funcs) {
    return (state, dt) => funcs.reduce((s, f) => f(s, dt), state);
}

const leapfrogStep = compose(
    halfStepVelocityRelation,
    fullStepPositionRelation,
    halfStepVelocityRelation
);

// Initial Lagrangian state
function createLagrangianState() {
    const a = 1.0;
    const r1 = vec3( a,  0.0, 0.0);
    const r2 = vec3(-a/2,  Math.sqrt(3)*a/2, 0.0);
    const r3 = vec3(-a/2, -Math.sqrt(3)*a/2, 0.0);
    const v1 = vec3( 0.0,  1.0, 0.0);
    const v2 = vec3(-Math.sqrt(3)/2, -0.5, 0.0);
    const v3 = vec3( Math.sqrt(3)/2, -0.5, 0.0);
    return [
        new Body(1.0, r1, v1),
        new Body(1.0, r2, v2),
        new Body(1.0, r3, v3)
    ];
}

// Export for modules (or window in browser)
if (typeof window !== 'undefined') {
    window.Vec3 = Vec3;
    window.Body = Body;
    window.accelerations = accelerations;
    window.totalEnergy = totalEnergy;
    window.leapfrogStep = leapfrogStep;
    window.createLagrangianState = createLagrangianState;
}
