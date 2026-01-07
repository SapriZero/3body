// app.js — Three-Body 3D Simulator (CORRECTED & COMPLETE)
document.addEventListener('DOMContentLoaded', () => {

let scene, camera, renderer, controls;
let bodies = [];
let trajectories = [[], [], []];
const MAX_TRAIL = 1000;
const trailMaterials = [
    new THREE.LineBasicMaterial({ color: 0x63b3ed }),
    new THREE.LineBasicMaterial({ color: 0xf6ad55 }),
    new THREE.LineBasicMaterial({ color: 0xfc8181 })
];

// Gravitational field visualization
let fieldLines = [];
const FIELD_RESOLUTION = 5;
const FIELD_SCALE = 0.2;

// Simulation state
let state, E0, simulatedTime = 0, dt = 0.001;
let isRunning = false;
let animationId = null;
let currentConfig = 'lagrange';

// Recording
let mediaRecorder = null;
let recordedChunks = [];
let isRecording = false;

// UI elements (now safe — DOM is loaded)
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
const recordBtn = document.getElementById('recordBtn');
const configSelect = document.getElementById('configSelect');
const showFieldCheckbox = document.getElementById('showField');

// Initialize Three.js
function initThreeJS() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a14);
    scene.fog = new THREE.Fog(0x0a0a14, 10, 20);

    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 0, 5);

    renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    renderer.setSize(document.getElementById('canvas-container').clientWidth, 
                      document.getElementById('canvas-container').clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    document.getElementById('canvas-container').appendChild(renderer.domElement);

    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;

    const ambientLight = new THREE.AmbientLight(0x404040, 1.5);
    scene.add(ambientLight);
    const pointLight = new THREE.PointLight(0xffffff, 1);
    pointLight.position.set(5, 5, 5);
    scene.add(pointLight);

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

// Create gravitational field visualization
function createGravitationalField() {
    fieldLines.forEach(line => scene.remove(line));
    fieldLines = [];

    if (!showFieldCheckbox || !showFieldCheckbox.checked) return;

    const size = 2.0;
    const step = (2 * size) / (FIELD_RESOLUTION - 1);
    const half = size;

    for (let i = 0; i < FIELD_RESOLUTION; i++) {
        for (let j = 0; j < FIELD_RESOLUTION; j++) {
            for (let k = 0; k < FIELD_RESOLUTION; k++) {
                const x = -half + i * step;
                const y = -half + j * step;
                const z = -half + k * step;
                const testPoint = [x, y, z];

                let ax = 0, ay = 0, az = 0;
                const G = 1.0, eps = 1e-3;
                for (const body of state) {
                    const dx = body.r[0] - x;
                    const dy = body.r[1] - y;
                    const dz = body.r[2] - z;
                    const distSq = dx*dx + dy*dy + dz*dz;
                    const dist = Math.sqrt(distSq) + eps;
                    const distCubed = dist * distSq;
                    const factor = G * body.m / distCubed;
                    ax += factor * dx;
                    ay += factor * dy;
                    az += factor * dz;
                }

                const accMag = Math.sqrt(ax*ax + ay*ay + az*az);
                if (accMag < 0.1) continue;

                const scale = Math.min(accMag, 1.0) * FIELD_SCALE;
                const dirX = ax / accMag * scale;
                const dirY = ay / accMag * scale;
                const dirZ = az / accMag * scale;

                const origin = new THREE.Vector3(x, y, z);
                const direction = new THREE.Vector3(dirX, dirY, dirZ);
                const arrow = new THREE.ArrowHelper(
                    direction.clone().normalize(),
                    origin,
                    direction.length(),
                    0x5555ff,
                    0.1,
                    0.05
                );
                scene.add(arrow);
                fieldLines.push(arrow);
            }
        }
    }
}

// Initialize physics using window.InitialConfigurations
function initSimulation(configKey = currentConfig) {
    currentConfig = configKey;
    const config = window.InitialConfigurations[configKey];
    if (!config) {
        console.error("Configurazione sconosciuta:", configKey);
        return;
    }
    state = config.fn();
    E0 = window.totalEnergy(state);
    simulatedTime = 0;
    trajectories.forEach(t => t.length = 0);
    updateUI();
    createGravitationalField();
}

// Update Three.js objects
function updateVisualization() {
    state.forEach((body, i) => {
        bodies[i].position.set(body.r[0], body.r[1], body.r[2]);
    });

    state.forEach((body, i) => {
        trajectories[i].push([...body.r]);
        if (trajectories[i].length > MAX_TRAIL) {
            trajectories[i].shift();
        }

        const existing = scene.getObjectByName(`trail-${i}`);
        if (existing) scene.remove(existing);

        if (trajectories[i].length > 1) {
            const points = trajectories[i].map(p => new THREE.Vector3(p[0], p[1], p[2]));
            const geometry = new THREE.BufferGeometry().setFromPoints(points);
            const line = new THREE.Line(geometry, trailMaterials[i]);
            line.name = `trail-${i}`;
            scene.add(line);
        }
    });

    if (Math.floor(simulatedTime / dt) % 10 === 0) {
        createGravitationalField();
    }
}

function step() {
    if (!isRunning) return;
    state = window.leapfrogStep(state, dt);
    simulatedTime += dt;
    updateVisualization();
    updateEnergyUI();
}

function updateEnergyUI() {
    const E1 = window.totalEnergy(state);
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

// Recording functions
function startRecording() {
    if (isRecording) return;
    recordedChunks = [];
    
    const stream = renderer.domElement.captureStream(30);
    mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp9' });
    
    mediaRecorder.ondataavailable = event => {
        if (event.data.size > 0) {
            recordedChunks.push(event.data);
        }
    };
    
    mediaRecorder.onstop = () => {
        const blob = new Blob(recordedChunks, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `three-body-${currentConfig}-${new Date().toISOString().slice(0,19).replace(/:/g,'-')}.webm`;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 100);
        isRecording = false;
        recordBtn.textContent = '⏺️ Record Video';
    };
    
    mediaRecorder.start();
    isRecording = true;
    recordBtn.textContent = '⏹️ Stop Recording';
}

function stopRecording() {
    if (mediaRecorder && isRecording) {
        mediaRecorder.stop();
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

recordBtn.addEventListener('click', () => {
    if (isRecording) {
        stopRecording();
    } else {
        if (!isRunning) {
            alert("Please start the simulation first.");
            return;
        }
        startRecording();
    }
});

configSelect.addEventListener('change', (e) => {
    if (isRunning) {
        alert("Pause the simulation before changing configuration.");
        return;
    }
    initSimulation(e.target.value);
    updateVisualization();
});

if (showFieldCheckbox) {
    showFieldCheckbox.addEventListener('change', () => {
        createGravitationalField();
    });
}

dtSlider.addEventListener('input', () => {
    dt = parseFloat(dtSlider.value);
    dtValue.textContent = dt.toFixed(4);
});

// Initialize
initThreeJS();
initSimulation();
updateVisualization();
dtValue.textContent = dt.toFixed(4);
statusText.textContent = 'Paused';

// Animation loop
function animate() {
    step();
    controls.update();
    renderer.render(scene, camera);
    if (isRunning) {
        animationId = requestAnimationFrame(animate);
    }
}

}); // <-- fine di DOMContentLoaded
