import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const container = document.querySelector('#webgl-container');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x080911);
scene.fog = new THREE.FogExp2(0x080911, 0.12);

// 1. Cámara y Renderizador
const camera = new THREE.PerspectiveCamera(
  40,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
const baseCameraPos = new THREE.Vector3(0, 1.2, 3.8);
camera.position.copy(baseCameraPos);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.4;
container.appendChild(renderer.domElement);

// 2. Iluminación de Concierto Cyberpunk (Cian / Magenta)
scene.add(new THREE.AmbientLight(0xffffff, 0.8));

const mainLight = new THREE.DirectionalLight(0x00f3ff, 2.5); // Luz Principal Cian
mainLight.position.set(3, 5, 4);
mainLight.castShadow = true;
mainLight.shadow.mapSize.set(2048, 2048);
scene.add(mainLight);

const rimLight = new THREE.DirectionalLight(0xff007f, 3.5); // Luz Trasera Magenta
rimLight.position.set(-4, 3, -2);
scene.add(rimLight);

const fillLight = new THREE.PointLight(0x00f3ff, 2, 10);
fillLight.position.set(0, 1, 2.5);
scene.add(fillLight);

// Floor Grid Estilo Escenario Digital
const gridHelper = new THREE.GridHelper(20, 30, 0x00f3ff, 0xff007f);
gridHelper.position.y = 0;
scene.add(gridHelper);

const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(20, 20),
  new THREE.ShadowMaterial({ opacity: 0.4 })
);
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);

// 3. Partículas Cyber-Dust en el Fondo
const particleCount = 200;
const particleGeometry = new THREE.BufferGeometry();
const particlePositions = new Float32Array(particleCount * 3);

for (let i = 0; i < particleCount * 3; i += 3) {
  particlePositions[i] = (Math.random() - 0.5) * 10;
  particlePositions[i + 1] = Math.random() * 5;
  particlePositions[i + 2] = (Math.random() - 0.5) * 10;
}

particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
const particleMaterial = new THREE.PointsMaterial({
  color: 0x00f3ff,
  size: 0.03,
  transparent: true,
  opacity: 0.7
});
const particleSystem = new THREE.Points(particleGeometry, particleMaterial);
scene.add(particleSystem);

// 4. Variables de Control y Eventos
let lastMousePos = { x: 0, y: 0 };
let lastMouseMoveTime = performance.now();
let targetDanceSpeed = 0;
let currentDanceSpeed = 0;

let isDragging = false;
let previousDragPos = { x: 0, y: 0 };
let targetRotationY = 0;
let targetRotationX = 0;
let jumpProgress = 1;

function triggerJump() {
  if (jumpProgress < 1) return;
  jumpProgress = 0;
}

window.addEventListener('keydown', (event) => {
  if (event.code !== 'Space' || event.repeat) return;

  event.preventDefault();
  triggerJump();
});

window.addEventListener('mousedown', (e) => {
  isDragging = true;
  previousDragPos = { x: e.clientX, y: e.clientY };
  document.body.style.cursor = 'grabbing';
});

window.addEventListener('mouseup', () => {
  isDragging = false;
  document.body.style.cursor = 'default';
});

window.addEventListener('mousemove', (e) => {
  const now = performance.now();
  const dt = (now - lastMouseMoveTime) / 1000;
  lastMouseMoveTime = now;

  const dx = e.clientX - lastMousePos.x;
  const dy = e.clientY - lastMousePos.y;
  const distance = Math.sqrt(dx * dx + dy * dy);

  if (dt > 0) {
    const rawSpeed = distance / (dt * 1000);
    targetDanceSpeed = Math.min(rawSpeed * 1.8, 4.0);
  }
  lastMousePos = { x: e.clientX, y: e.clientY };

  if (isDragging) {
    const deltaX = e.clientX - previousDragPos.x;
    const deltaY = e.clientY - previousDragPos.y;

    targetRotationY += deltaX * 0.008;
    targetRotationX += deltaY * 0.005;
    targetRotationX = Math.max(-0.3, Math.min(0.4, targetRotationX));

    previousDragPos = { x: e.clientX, y: e.clientY };
  }
});

// Touch Support
window.addEventListener('touchstart', (e) => {
  if (e.touches.length === 1) {
    isDragging = true;
    previousDragPos = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    lastMousePos = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    lastMouseMoveTime = performance.now();
  }
});

window.addEventListener('touchend', () => { isDragging = false; });
window.addEventListener('touchmove', (e) => {
  if (e.touches.length !== 1) return;
  const touchX = e.touches[0].clientX;
  const touchY = e.touches[0].clientY;

  const now = performance.now();
  const dt = (now - lastMouseMoveTime) / 1000;
  lastMouseMoveTime = now;

  const dx = touchX - lastMousePos.x;
  const dy = touchY - lastMousePos.y;
  const distance = Math.sqrt(dx * dx + dy * dy);

  if (dt > 0) {
    targetDanceSpeed = Math.min((distance / (dt * 1000)) * 1.8, 4.0);
  }
  lastMousePos = { x: touchX, y: touchY };

  if (isDragging) {
    const deltaX = touchX - previousDragPos.x;
    const deltaY = touchY - previousDragPos.y;

    targetRotationY += deltaX * 0.008;
    targetRotationX += deltaY * 0.005;
    targetRotationX = Math.max(-0.3, Math.min(0.4, targetRotationX));

    previousDragPos = { x: touchX, y: touchY };
  }
});

// 5. Carga de Modelo GLTF
let characterModel;
let mixer;
const modelBasePosition = new THREE.Vector3(0.5, 0, 0); // Desplazado al tercio derecho

const loader = new GLTFLoader();
const modelUrl = `${import.meta.env.BASE_URL}modelos/personaje.glb`;

function frameModel(model) {
  const initialBounds = new THREE.Box3();
  model.updateMatrixWorld(true);
  model.traverse((child) => {
    if (child.isMesh) initialBounds.expandByObject(child);
  });
  const initialSize = initialBounds.getSize(new THREE.Vector3());

  const targetHeight = 1.95;
  if (initialSize.y > 0) {
    model.scale.setScalar(targetHeight / initialSize.y);
  }

  model.updateMatrixWorld(true);
  const bounds = new THREE.Box3();
  model.traverse((child) => {
    if (child.isMesh) bounds.expandByObject(child);
  });
  const center = bounds.getCenter(new THREE.Vector3());

  model.userData.frameOffset = new THREE.Vector3(
    -center.x,
    -bounds.min.y,
    -center.z
  );
  model.position.copy(modelBasePosition).add(model.userData.frameOffset);
}

loader.load(
  modelUrl,
  (gltf) => {
    characterModel = gltf.scene;
    characterModel.position.copy(modelBasePosition);

    characterModel.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    frameModel(characterModel);
    characterModel.userData.basePosition = characterModel.position.clone();
    scene.add(characterModel);

    if (gltf.animations && gltf.animations.length > 0) {
      mixer = new THREE.AnimationMixer(characterModel);
      mixer.clipAction(gltf.animations[0]).play();
    }
  },
  undefined,
  (err) => console.error('Error al cargar personaje:', err)
);

const clock = new THREE.Clock();

// 6. Bucle Animado 3D
function animate() {
  requestAnimationFrame(animate);

  const delta = clock.getDelta();
  jumpProgress = Math.min(jumpProgress + delta / 0.8, 1);
  const timeSinceLastMove = performance.now() - lastMouseMoveTime;

  if (timeSinceLastMove > 60) {
    targetDanceSpeed = 0;
  }

  currentDanceSpeed += (targetDanceSpeed - currentDanceSpeed) * 0.15;
  if (currentDanceSpeed < 0.01) currentDanceSpeed = 0;

  if (mixer) {
    mixer.update(delta * currentDanceSpeed);
  }

  if (characterModel) {
    const basePosition =
      characterModel.userData.basePosition ?? characterModel.position;
    const jumpOffset = Math.sin(jumpProgress * Math.PI) * 0.45;
    characterModel.position.y = basePosition.y + jumpOffset;
    characterModel.rotation.y += (targetRotationY - characterModel.rotation.y) * 0.08;
    characterModel.rotation.x += (targetRotationX - characterModel.rotation.x) * 0.08;

    camera.lookAt(characterModel.position.x, 1.0, characterModel.position.z);
  }

  // Rotar sutilmente las partículas de fondo
  particleSystem.rotation.y += 0.0005;

  renderer.render(scene, camera);
}

animate();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});