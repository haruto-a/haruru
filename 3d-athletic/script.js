import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';

// --- 設定 ---
const SPEED = 15;
const JUMP_FORCE = 10;
const GRAVITY = -20;

// --- 状態管理 ---
let status = 'ready'; // ready, playing, gameover, clear
let startTime = 0;
let time = 0;

// --- DOM要素 ---
const timerEl = document.getElementById('timer');
const readyOverlay = document.getElementById('ready-overlay');
const gameoverOverlay = document.getElementById('gameover-overlay');
const clearOverlay = document.getElementById('clear-overlay');
const clearTimeText = document.getElementById('clear-time-text');
const retryBtn = document.getElementById('retry-btn');
const resetBtn = document.getElementById('reset-btn');

// --- Three.js セットアップ ---
const scene = new THREE.Scene();
scene.background = new THREE.Color('#87ceeb'); // Sky blue

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
document.body.appendChild(renderer.domElement);

// コントロール
const controls = new PointerLockControls(camera, document.body);

// 照明
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);

const sun = new THREE.DirectionalLight(0xffffff, 1);
sun.position.set(5, 10, 5);
sun.castShadow = true;
sun.shadow.camera.left = -20;
sun.shadow.camera.right = 20;
sun.shadow.camera.top = 20;
sun.shadow.camera.bottom = -20;
sun.shadow.mapSize.width = 2048;
sun.shadow.mapSize.height = 2048;
scene.add(sun);

// --- Cannon-es セットアップ ---
const world = new CANNON.World();
world.gravity.set(0, GRAVITY, 0);

// --- プレイヤー ---
const playerRadius = 0.5;
const playerShape = new CANNON.Sphere(playerRadius);
const playerBody = new CANNON.Body({
    mass: 1,
    shape: playerShape,
    material: new CANNON.Material({ friction: 0.1, restitution: 0.2 })
});
playerBody.position.set(0, 3, 0);
playerBody.linearDamping = 0.9; // 滑り止め
world.addBody(playerBody);

const playerMesh = new THREE.Mesh(
    new THREE.SphereGeometry(playerRadius),
    new THREE.MeshStandardMaterial({ color: '#ff69b4', visible: false }) // 非表示（カメラ追従用）
);
scene.add(playerMesh);

// --- レベル構築 ---
const blockMaterial = new THREE.MeshStandardMaterial({ color: '#2b2d31', roughness: 0.8 });
const obstacleMaterial = new THREE.MeshStandardMaterial({ color: '#e74c3c', roughness: 0.5 });
const goalMaterial = new THREE.MeshStandardMaterial({ color: '#2ecc71', roughness: 0.2, emissive: '#2ecc71', emissiveIntensity: 0.5 });

function createBox(width, height, depth, x, y, z, material, isGoal = false) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
    mesh.position.set(x, y, z);
    mesh.receiveShadow = true;
    mesh.castShadow = true;
    scene.add(mesh);

    const shape = new CANNON.Box(new CANNON.Vec3(width / 2, height / 2, depth / 2));
    const body = new CANNON.Body({ mass: 0, shape: shape });
    body.position.set(x, y, z);
    world.addBody(body);

    if (isGoal) {
        body.addEventListener('collide', (e) => {
            if (status === 'playing') setStatus('clear');
        });
    }
    return { mesh, body };
}

// ステージ配置
createBox(10, 1, 10, 0, -0.5, 0, blockMaterial); // スタート
createBox(4, 1, 20, 0, -0.5, -15, blockMaterial); // 道1

const obstacle = createBox(6, 1, 1, 0, 0.5, -15, obstacleMaterial); // 障害物
createBox(4, 1, 10, 0, 1, -30, blockMaterial); // 道2
createBox(12, 1, 4, -8, 1, -30, blockMaterial); // 曲がり角
const goal = createBox(8, 1, 8, -18, 1, -30, goalMaterial, true); // ゴール

// ゴールの目印
const goalSign = new THREE.Mesh(
    new THREE.CylinderGeometry(1, 1, 0.5, 32),
    new THREE.MeshStandardMaterial({ color: 'yellow', emissive: 'yellow', emissiveIntensity: 0.8 })
);
goalSign.position.set(-18, 3, -30);
scene.add(goalSign);

// --- 入力処理 ---
const keys = {};
window.addEventListener('keydown', (e) => keys[e.code] = true);
window.addEventListener('keyup', (e) => keys[e.code] = false);

// --- ゲームサイクル ---
function setStatus(s) {
    status = s;
    readyOverlay.classList.add('hidden');
    gameoverOverlay.classList.add('hidden');
    clearOverlay.classList.add('hidden');

    if (s === 'ready') {
        readyOverlay.classList.remove('hidden');
        playerBody.position.set(0, 3, 0);
        playerBody.velocity.set(0, 0, 0);
        playerBody.angularVelocity.set(0, 0, 0);
        time = 0;
    } else if (s === 'playing') {
        startTime = Date.now();
        controls.lock();
    } else if (s === 'gameover') {
        gameoverOverlay.classList.remove('hidden');
        controls.unlock();
    } else if (s === 'clear') {
        clearOverlay.classList.remove('hidden');
        clearTimeText.innerText = `Clear Time: ${(time / 1000).toFixed(2)}s`;
        controls.unlock();
    }
}

// クリックでスタート
document.addEventListener('click', () => {
    if (status === 'ready' || status === 'gameover' || status === 'clear') {
        setStatus('playing');
    }
});

retryBtn.addEventListener('click', (e) => { e.stopPropagation(); setStatus('ready'); });
resetBtn.addEventListener('click', (e) => { e.stopPropagation(); setStatus('ready'); });

const clock = new THREE.Clock();
function animate() {
    requestAnimationFrame(animate);
    const delta = Math.min(clock.getDelta(), 0.1);

    if (status === 'playing') {
        time = Date.now() - startTime;
        timerEl.innerText = `Time: ${(time / 1000).toFixed(2)}s`;

        // 物理演算更新
        world.step(1 / 60, delta);

        // キー入力移動
        const forward = new THREE.Vector3();
        camera.getWorldDirection(forward);
        forward.y = 0;
        forward.normalize();

        const right = new THREE.Vector3();
        right.crossVectors(camera.up, forward).normalize();

        let moveX = 0;
        let moveZ = 0;

        if (keys['KeyW'] || keys['ArrowUp']) { moveZ += 1; }
        if (keys['KeyS'] || keys['ArrowDown']) { moveZ -= 1; }
        if (keys['KeyA'] || keys['ArrowLeft']) { moveX += 1; }
        if (keys['KeyD'] || keys['ArrowRight']) { moveX -= 1; }

        const moveDir = new THREE.Vector3()
            .addScaledVector(forward, moveZ)
            .addScaledVector(right, moveX)
            .normalize();

        if (moveDir.length() > 0) {
            playerBody.velocity.x = moveDir.x * SPEED;
            playerBody.velocity.z = moveDir.z * SPEED;
        } else {
            // 入力がないときは水平速度を即座に減衰（操作感向上）
            playerBody.velocity.x *= 0.9;
            playerBody.velocity.z *= 0.9;
        }

        // ジャンプ
        if (keys['Space']) {
            // 接地判定（簡易版: Y速度がほぼ0）
            if (Math.abs(playerBody.velocity.y) < 0.2) {
                playerBody.velocity.y = JUMP_FORCE;
            }
        }

        // 落下判定
        if (playerBody.position.y < -5) {
            setStatus('gameover');
        }
    }

    // メッシュ同期
    playerMesh.position.copy(playerBody.position);

    // カメラ追従
    camera.position.set(playerBody.position.x, playerBody.position.y + 0.5, playerBody.position.z);

    // 障害物の回転アニメーション
    obstacle.mesh.rotation.y += 0.02;
    // 物理ボディも同期（Kinematic的扱い）
    obstacle.body.quaternion.copy(obstacle.mesh.quaternion);

    renderer.render(scene, camera);
}

// リサイズ対応
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

animate();
setStatus('ready');
