// app.js — 3D visualization with Three.js

let scene, camera, renderer, controls;
let bodies = []; // Three.js meshes
let trajectories = [[], [], []];
const MAX_TRAIL = 1000;
const trailMaterials = [
    new THREE.LineBasicMaterial({ color: 0x63b3ed }),
    new THREE.LineBasicMaterial({ color: 0xf6ad55 }),
    new THREE.LineBasicMaterial({ color: 0xfc8181 })
];

// Simulation state
let state, E0, simulatedTime = 0, dt = 0.001;
let isRunning = false;
let animationId = null;

// UI elements
const dtSlider = document.getElementById('dtSlider');
const dtValue = document.getElementById('dtValue');
const timeValue = document.getElementById('timeValue');
const E0Value = document.getElementById('E0Value');
const E1Value = document.getElementById('E1Value');
const relErrorValue = document.getElementById('relErrorValue');
const statusText = document.getElementById('statusText');
const playBtn = document.getElementById('playBtn');
const pauseBtn = document.getElementById('pauseBtn');
const resetBtn = document.getElementById('resetBtn');

// Initialize Three.js
function initThreeJS() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a14);
    scene.fog = new THREE.Fog(0x0a0a14, 10, 20);

    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 0, 5);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(document.getElementById('canvas-container').clientWidth, 
                      document.getElementById('canvas-container').clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    document.getElementById('canvas-container').appendChild(renderer.domElement);

    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;

    // Lights
    const ambientLight = new THREE.AmbientLight(0x404040, 1.5);
    scene.add(ambientLight);
    const pointLight = new THREE.PointLight(0xffffff, 1);
    pointLight.position.set(5, 5, 5);
    scene.add(pointLight);

    // Create body meshes
    const geometry = new THREE.SphereGeometry(0.05, 16, 16);
    const materials = [
        new THREE.MeshPhongMaterial({ color: 0x63b3ed }),
        new THREE.MeshPhongMaterial({ color: 0xf6ad55 }),
        new THREE.MeshPhongMaterial({ color: 0xfc8181 })
    ];
    bodies = materials.map(mat => {
        const mesh = new THREE.Mesh(geometry, mat);
        scene.add(mesh);
        return mesh;
    });

    window.addEventListener('resize', onWindowResize);
}

function onWindowResize() {
    const container = document.getElementById('canvas-container');
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
}

// Initialize physics
function initSimulation() {
    state = createLagrangianState();
    E0 = totalEnergy(state);
    simulatedTime = 0;
    trajectories.forEach(t => t.length = 0);
    updateUI();
}

// Update Three.js objects
function updateVisualization() {
    // Update body positions
    state.forEach((body, i) => {
        bodies[i].position.set(body.r[0], body.r[1], body.r[2]);
    });

    // Update trails
    state.forEach((body, i) => {
        trajectories[i].push([...body.r]);
        if (trajectories[i].length > MAX_TRAIL) {
            trajectories[i].shift();
        }

        // Remove old trail line if exists
        const existing = scene.getObjectByName(`trail-${i}`);
        if (existing) scene.remove(existing);

        if (trajectories[i].length > 1) {
            const points = trajectories[i].map(p => new THREE.Vector3(p[0], p[1], p[2]));
            const geometry = new THREE.BufferGeometry().setFromPoints(points);
            const line = new THREE.Line(geometry, trailMaterials[i]);
            line.name = `trail-${i}`;
            line.renderOrder = 1;
            scene.add(line);
        }
    });
}

function step() {
    if (!isRunning) return;
    state = leapfrogStep(state, dt);
    simulatedTime += dt;
    updateVisualization();
    updateEnergyUI();
}

function updateEnergyUI() {
    const E1 = totalEnergy(state);
    const relError = Math.abs(E1 - E0) / (Math.abs(E0) + 1e-15);
    
    E1Value.textContent = E1.toFixed(6);
    relErrorValue.textContent = relError.toExponential(2);
    
    if (relError < 1e-4) relErrorValue.className = 'energy-good';
    else if (relError < 1e-2) relErrorValue.className = 'energy-warning';
    else relErrorValue.className = 'energy-bad';
    
    timeValue.textContent = simulatedTime.toFixed(3);
}

function updateUI() {
    E0Value.textContent = E0.toFixed(6);
    timeValue.textContent = "0.000";
    E1Value.textContent = E0.toFixed(6);
    relErrorValue.textContent = "0.00e+0";
    relErrorValue.className = 'energy-good';
}

function animate() {
    step();
    controls.update();
    renderer.render(scene, camera);
    if (isRunning) {
        animationId = requestAnimationFrame(animate);
    }
}

// Event handlers
playBtn.addEventListener('click', () => {
    isRunning = true;
    statusText.textContent = 'Running';
    playBtn.disabled = true;
    pauseBtn.disabled = false;
    if (!animationId) animate();
});

pauseBtn.addEventListener('click', () => {
    isRunning = false;
    statusText.textContent = 'Paused';
    playBtn.disabled = false;
    pauseBtn.disabled = true;
});

resetBtn.addEventListener('click', () => {
    isRunning = false;
    if (animationId) {
        cancelAnimationFrame(animationId);
        animationId = null;
    }
    playBtn.disabled = false;
    pauseBtn.disabled = true;
    statusText.textContent = 'Reset';
    initSimulation();
    updateVisualization();
});

dtSlider.addEventListener('input', () => {
    dt = parseFloat(dtSlider.value);
    dtValue.textContent = dt.toFixed(4);
});

// Initialize
initThreeJS();
initSimulation();
updateVisualization();
dtValue.textContent = dt.toFixed(4);

// Start paused
statusText.textContent = 'Paused';
