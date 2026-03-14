import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';

// --- 設定 ---
const SPEED = 15;
const JUMP_FORCE = 10;
const GRAVITY = -20;

// --- 状態管理 ---
let status = 'ready'; // ready, playing, gameover, clear, allclear
let startTime = 0;
let time = 0;
let currentStage = 1;
const MAX_STAGE = 50;

let jumpCount = 0;
let prevSpace = false;
let isSliding = false;
let slideTimer = 0;
const MAX_SLIDE_TIME = 0.8; // スライディングの最大持続時間（秒）

// --- DOM要素 ---
const timerEl = document.getElementById('timer');
const stageInfoEl = document.getElementById('stage-info');
const readyOverlay = document.getElementById('ready-overlay');
const gameoverOverlay = document.getElementById('gameover-overlay');
const clearOverlay = document.getElementById('clear-overlay');
const clearTitle = document.getElementById('clear-title');
const clearTimeText = document.getElementById('clear-time-text');
const retryBtn = document.getElementById('retry-btn');
const resetBtn = document.getElementById('reset-btn');
const nextStageBtn = document.getElementById('next-stage-btn');

// --- Three.js セットアップ ---
const scene = new THREE.Scene();
scene.background = new THREE.Color('#FF8C00'); // 深い夕暮れのオレンジ
// Fogの開始距離を遠くし、ゲームエリア全体を見渡せるようにする
scene.fog = new THREE.Fog('#FF8C00', 30, 150);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight); // 先ほどのバグを修正
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

// コントロール
const controls = new PointerLockControls(camera, document.body);

// --- ライティング ---
const ambientLight = new THREE.AmbientLight('#ffeedd', 0.5); // 夕暮れ風の環境光
scene.add(ambientLight);

const sun = new THREE.DirectionalLight('#FFDAB9', 1.2); // 夕日のようなオレンジがかった光
sun.position.set(10, 20, 5); // 光の角度を斜めにする
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
const playerMaterial = new CANNON.Material('playerMaterial');
const playerShape = new CANNON.Sphere(playerRadius);
const playerBody = new CANNON.Body({
    mass: 1,
    shape: playerShape,
    material: playerMaterial
});
playerBody.position.set(0, 3, 0);
playerBody.linearDamping = 0.9; // 滑り止め
world.addBody(playerBody);

const playerMesh = new THREE.Mesh(
    new THREE.SphereGeometry(playerRadius),
    new THREE.MeshStandardMaterial({ color: '#ff69b4', visible: false }) // 非表示（カメラ追従用）
);
scene.add(playerMesh);

// --- レベル構築と管理 ---
const blockMaterial = new THREE.MeshStandardMaterial({ color: '#555555', roughness: 0.9, metalness: 0.1 }); // コンクリート風のグレー
const obstacleMaterial = new THREE.MeshStandardMaterial({ color: '#e74c3c', roughness: 0.5 });
const goalMaterial = new THREE.MeshStandardMaterial({ color: '#2ecc71', roughness: 0.2, emissive: '#2ecc71', emissiveIntensity: 0.5 });
const trampolineMaterial = new THREE.MeshStandardMaterial({ color: '#e67e22', roughness: 0.4 }); // オレンジ色のトランポリン
const movingPlatformMaterial = new THREE.MeshStandardMaterial({ color: '#3498db', roughness: 0.7 }); // 水色の動く足場
const wallRunMaterial = new THREE.MeshStandardMaterial({ color: '#2ecc71', roughness: 0.6, transparent: true, opacity: 0.8 }); // 緑色の壁（ウォールラン用）

// 物理マテリアルの定義と接触設定
const defaultPhysicsMaterial = new CANNON.Material('default');
const trampolinePhysicsMaterial = new CANNON.Material('trampoline');

// プレイヤーと通常の壁/床の摩擦・反発
const defaultContactMaterial = new CANNON.ContactMaterial(playerMaterial, defaultPhysicsMaterial, { friction: 0.1, restitution: 0.2 });
world.addContactMaterial(defaultContactMaterial);

// プレイヤーとトランポリンの反発（大ジャンプ用）
const trampolineContactMaterial = new CANNON.ContactMaterial(playerMaterial, trampolinePhysicsMaterial, { friction: 0.1, restitution: 1.5 });
world.addContactMaterial(trampolineContactMaterial);

let stageObjects = []; // Three.jsのMeshとCannon-esのBodyのペアを保持
let chaserEnemy = null; // 追跡してくる敵オブジェクトの保持

// オプション: isObstacle, isTrampoline, moveProps(動く足場用), isWallrun
function createBox(width, height, depth, x, y, z, material, isGoal = false, isObstacle = false, isTrampoline = false, moveProps = null, isWallrun = false) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
    mesh.position.set(x, y, z);
    mesh.receiveShadow = true;
    mesh.castShadow = true;
    scene.add(mesh);

    // Obstacle または Moving Platform の場合はkinematicにする（スクリプトから動かすため）
    const type = (isObstacle || moveProps) ? CANNON.Body.KINEMATIC : CANNON.Body.STATIC;

    // トランポリンなら専用のマテリアルを設定
    const physicsMaterial = isTrampoline ? trampolinePhysicsMaterial : defaultPhysicsMaterial;

    const shape = new CANNON.Box(new CANNON.Vec3(width / 2, height / 2, depth / 2));
    const body = new CANNON.Body({ mass: 0, type: type, shape: shape, material: physicsMaterial });
    body.position.set(x, y, z);
    world.addBody(body);

    if (isGoal) {
        body.addEventListener('collide', (e) => {
            if (status === 'playing') {
                if (currentStage >= MAX_STAGE) {
                    setStatus('allclear');
                } else {
                    setStatus('clear');
                }
            }
        });
    }

    // アニメーション用や管理用のメタデータを含めて保存
    const obj = {
        mesh,
        body,
        isObstacle,
        isWallrun,
        moveProps: moveProps ? { ...moveProps, time: 0, startPos: { x, y, z } } : null
    };
    stageObjects.push(obj);
    return obj;
}

function clearStage() {
    stageObjects.forEach(obj => {
        scene.remove(obj.mesh);
        obj.mesh.geometry.dispose();
        Array.isArray(obj.mesh.material) ? obj.mesh.material.forEach(m => m.dispose()) : obj.mesh.material.dispose();
        if (obj.body) {
            world.removeBody(obj.body);
        }
    });
    stageObjects = [];

    // エネミーの破棄
    if (chaserEnemy) {
        scene.remove(chaserEnemy.mesh);
        chaserEnemy.mesh.geometry.dispose();
        chaserEnemy.mesh.material.dispose();
        world.removeBody(chaserEnemy.body);
        chaserEnemy = null;
    }
}

// チェイサー（追跡エネミー）の生成
function spawnChaser() {
    // 既に存在する場合は作成しない（一応の防御）
    if (chaserEnemy) return;

    const radius = 1.0; // プレイヤーより一回り大きい

    // 赤黒く発光するマテリアル
    const material = new THREE.MeshStandardMaterial({
        color: '#8b0000', // DarkRed
        emissive: '#ff0000',
        emissiveIntensity: 0.4,
        roughness: 0.2
    });

    const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 32, 32), material);

    // スポーン位置: プレイヤーの少し背後（Z軸の+方向）で高い位置
    const spawnZ = 8;
    const spawnY = 5;
    mesh.position.set(0, spawnY, spawnZ);
    mesh.castShadow = true;
    scene.add(mesh);

    const shape = new CANNON.Sphere(radius);
    // Kinematicにしてスクリプトから直接速度を操作できるようにする
    const body = new CANNON.Body({ mass: 0, type: CANNON.Body.KINEMATIC, shape: shape });
    body.position.set(0, spawnY, spawnZ);
    world.addBody(body);

    // 衝突時の処理（ゲームオーバー）はanimate関数内の距離判定で行う

    chaserEnemy = { mesh, body, radius };
}

// レベルに応じたステージ自動生成
function loadStage(level) {
    clearStage();

    // UI更新
    stageInfoEl.innerText = `Stage: ${level} / ${MAX_STAGE}`;

    // ゴールの位置を追跡するための変数
    let currentZ = 0;

    // 難易度調整パラメータ (1〜50)
    // V2: ステージを大幅に長くする (以前の2.5倍程度)
    const platformCount = 8 + Math.floor(level * 1.5);
    const baseGap = 2 + (level * 0.05);
    const widthFactor = Math.max(0.4, 1 - (level * 0.015));

    // 1. スタート地点 (安全地帯)
    const buildingHeight = 100;
    const platYBase = 0;
    const platYCenter = platYBase - (buildingHeight / 2);

    createBox(10 * widthFactor, buildingHeight, 10, 0, platYCenter, currentZ, blockMaterial);
    currentZ -= 10;

    // 2. 道中の生成
    for (let i = 0; i < platformCount; i++) {
        // --- 隙間の計算 ---
        const gap = baseGap + Math.random() * 2;
        currentZ -= gap;

        // --- 次の足場のサイズ計算 ---
        const platLength = 8 + Math.random() * 12;
        const platWidth = (4 + Math.random() * 4) * widthFactor;

        const platZ = currentZ - platLength / 2;

        // --- ギミックの抽選 ---
        const canWallrun = level >= 4 && Math.random() < Math.min(0.25, level * 0.015);
        const canMovingPlatform = !canWallrun && level >= 5 && Math.random() < Math.min(0.4, level * 0.02);
        const canTrampoline = !canWallrun && !canMovingPlatform && level >= 3 && Math.random() < Math.min(0.3, level * 0.015);

        if (canWallrun) {
            // --- 壁走りセクション（床がなく左右に壁がある） ---
            const wallLength = 15 + Math.random() * 10;
            const wallHeight = 6;
            const wallDist = 4; // 中心からの距離

            // 下の床は配置しない（落ちる）
            // 左の壁
            createBox(1, wallHeight, wallLength, -wallDist, platYBase + wallHeight / 2, currentZ - wallLength / 2, wallRunMaterial, false, false, false, null, true);
            // 右の壁
            createBox(1, wallHeight, wallLength, wallDist, platYBase + wallHeight / 2, currentZ - wallLength / 2, wallRunMaterial, false, false, false, null, true);

            // 壁の長さを超えたところに安全な着地用足場（ビル）を生成
            currentZ -= wallLength;
            const landLength = 10;
            createBox(platWidth, buildingHeight, landLength, 0, platYCenter, currentZ - landLength / 2, blockMaterial);
            currentZ -= landLength;

        } else if (canTrampoline) {
            // トランポリンビル（少し低め または 高め）
            const trampSize = 3 * widthFactor;
            // 落ちないように少し下に配置
            createBox(trampSize, 1, trampSize, 0, platYBase - 0.5, currentZ - 2, trampolineMaterial, false, false, true);
            currentZ -= trampSize + 2;

            // トランポリンの先にある着地用ビル
            const landLength = 10;
            createBox(platWidth, buildingHeight, landLength, 0, platYCenter, currentZ - landLength / 2, blockMaterial);
            currentZ -= landLength;

        } else if (canMovingPlatform) {
            // 動く足場（作業用リフト風）
            const isHorizontal = Math.random() > 0.5;
            const moveRange = isHorizontal ? 4 : 3;
            const moveSpeed = 1.0 + Math.random() * 1.5;
            const moveType = isHorizontal ? 'horizontal' : 'vertical';

            createBox(3, 1, 3, 0, platYBase - 0.5, currentZ - 3, movingPlatformMaterial, false, false, false, { range: moveRange, speed: moveSpeed, type: moveType });
            currentZ -= 6;

            // 渡った先のビル
            const landLength = 10;
            createBox(platWidth, buildingHeight, landLength, 0, platYCenter, currentZ - landLength / 2, blockMaterial);
            currentZ -= landLength;

        } else {
            // 通常のビル足場
            createBox(platWidth, buildingHeight, platLength, 0, platYCenter, platZ, blockMaterial);

            // 障害物生成
            if (i > 0 && Math.random() < Math.min(0.6, level * 0.05)) {
                // ... (障害物はそのままの高さ基準で配置)
                const obsX = (Math.random() - 0.5) * (platWidth - 2);
                const obsY = platYBase + 0.5; // ビルの屋上（Y=0付近）に乗せる
                const obsZ = currentZ - Math.random() * platLength;
                createBox(1.5, 1.5, 1.5, obsX, obsY, obsZ, obstacleMaterial, false, true);
            }
            currentZ -= platLength;
        }

        currentZ -= gap;
    }

    // --- ゴールの生成（最後のビル） ---
    createBox(10, 100, 10, 0, -50, currentZ - 5, blockMaterial); // ゴール用の広い屋上
    createBox(3, 4, 1, 0, 2, currentZ - 5, goalMaterial, true);

    // Y座標の初期位置を屋上（0）より少し上に
    playerBody.position.set(0, 3, 0);

    // ゴールの目印（物理判定なしの単純なMesh）
    const goalSign = new THREE.Mesh(
        new THREE.CylinderGeometry(1, 1, 0.5, 32),
        new THREE.MeshStandardMaterial({ color: 'yellow', emissive: 'yellow', emissiveIntensity: 0.8 })
    );
    goalSign.position.set(0, 3, currentZ - 4);
    scene.add(goalSign);

    // goalSignもクリーンアップ対象に追加
    stageObjects.push({ mesh: goalSign, body: null, isObstacle: false });
}

// 初回ステージ読み込み
loadStage(currentStage);

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
    nextStageBtn.style.display = 'block';

    if (s === 'ready') {
        stageInfoEl.innerText = `Stage: ${currentStage} / ${MAX_STAGE}`;
        readyOverlay.classList.remove('hidden');
        playerBody.position.set(0, 3, 0);
        playerBody.velocity.set(0, 0, 0);
        playerBody.angularVelocity.set(0, 0, 0);
        time = 0;

        // チェイサーをスポーン（いればリセットされる）
        spawnChaser();

    } else if (s === 'playing') {
        startTime = Date.now();
        controls.lock();
    } else if (s === 'gameover') {
        gameoverOverlay.classList.remove('hidden');
        controls.unlock();
    } else if (s === 'clear') {
        clearTitle.innerText = `STAGE ${currentStage} CLEARED!`;
        clearOverlay.classList.remove('hidden');
        clearTimeText.innerText = `Clear Time: ${(time / 1000).toFixed(2)}s`;
        controls.unlock();
        // クリアしたら敵を破棄してプレッシャーを消す
        if (chaserEnemy) {
            scene.remove(chaserEnemy.mesh);
            world.removeBody(chaserEnemy.body);
            chaserEnemy.mesh.geometry.dispose();
            chaserEnemy.mesh.material.dispose();
            chaserEnemy = null;
        }
    } else if (s === 'allclear') {
        clearTitle.innerText = "ALL STAGE CLEARED!!";
        clearOverlay.classList.remove('hidden');
        clearTimeText.innerText = `Congratulations!`;
        nextStageBtn.style.display = 'none'; // 全クリア時は非表示
        controls.unlock();
    }
}

// クリックでスタート
document.addEventListener('click', (e) => {
    // UIボタンクリック時は反応させない
    if (e.target.tagName === 'BUTTON') return;

    if (status === 'ready' || status === 'gameover' || status === 'clear' || status === 'allclear') {
        setStatus('playing');
    }
});

retryBtn.addEventListener('click', (e) => { e.stopPropagation(); setStatus('ready'); });
resetBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    currentStage = 1;
    loadStage(currentStage);
    setStatus('ready');
});
nextStageBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (currentStage < MAX_STAGE) {
        currentStage++;
        loadStage(currentStage);
    }
    setStatus('ready');
});

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

        // ジャンプ判定用の接地確認
        const isGrounded = Math.abs(playerBody.velocity.y) < 0.2;
        if (isGrounded) {
            jumpCount = 0;
        }

        // --- スライディングの処理 ---
        let currentSpeed = SPEED;
        // 接地中かつ前進キー(W,↑)を押していて、Shiftキーが押されている場合
        if (isGrounded && moveZ > 0 && (keys['ShiftLeft'] || keys['ShiftRight'])) {
            if (slideTimer < MAX_SLIDE_TIME) {
                isSliding = true;
                slideTimer += delta;
                currentSpeed = SPEED * 1.8; // スライディング中は1.8倍速
            } else {
                // 最大時間を超えたらスライディング強制解除
                isSliding = false;
            }
        } else {
            isSliding = false;
            // クールダウン（キーを離すと徐々に回復）
            if (slideTimer > 0) {
                slideTimer -= delta * 0.5; // 少しゆっくり回復させる
            }
        }

        if (moveDir.length() > 0) {
            playerBody.velocity.x = moveDir.x * currentSpeed;
            playerBody.velocity.z = moveDir.z * currentSpeed;
        } else {
            // 入力がないときは水平速度を即座に減衰（操作感向上）
            playerBody.velocity.x *= 0.9;
            playerBody.velocity.z *= 0.9;
        }



        // --- 壁走り（ウォールラン）の判定 ---
        let isWallRunning = false;
        let wallNormal = null;

        // 空中で、かつ前進キーが押されている間のみ判定
        if (!isGrounded && moveZ > 0) {
            const raycaster = new THREE.Raycaster();
            raycaster.far = playerRadius + 0.3; // プレイヤー半径＋少しのゆとり

            // 左右方向のベクトル
            const leftDir = new THREE.Vector3().crossVectors(camera.up, forward).negate().normalize();
            const rightDir = new THREE.Vector3().crossVectors(camera.up, forward).normalize();

            // 判定用に対象のMesh配列を生成（isWallrunフラグが立っているもののみ）
            const wallMeshes = stageObjects.filter(obj => obj.isWallrun).map(obj => obj.mesh);

            if (wallMeshes.length > 0) {
                // 左方向へのRaycast
                raycaster.set(playerMesh.position, leftDir);
                let intersects = raycaster.intersectObjects(wallMeshes);

                if (intersects.length > 0) {
                    isWallRunning = true;
                    wallNormal = intersects[0].face.normal.clone().transformDirection(intersects[0].object.matrixWorld);
                } else {
                    // 右方向へのRaycast
                    raycaster.set(playerMesh.position, rightDir);
                    intersects = raycaster.intersectObjects(wallMeshes);
                    if (intersects.length > 0) {
                        isWallRunning = true;
                        wallNormal = intersects[0].face.normal.clone().transformDirection(intersects[0].object.matrixWorld);
                    }
                }
            }
        }

        if (isWallRunning) {
            // 壁走り中: 重力による落下を大幅に抑える
            if (playerBody.velocity.y < -2) {
                playerBody.velocity.y = -2; // ゆっくり落ちる
            }
            // 壁走り開始時にジャンプの権利をリセットする
            jumpCount = 1;
        }

        // ジャンプ（スペースキーが新たに押された瞬間のみ反応）
        if (keys['Space'] && !prevSpace) {
            if (isWallRunning && wallNormal) {
                // 壁ジャンプ（ウォールキック）
                // 壁の法線方向（壁から離れる方向）に強い力をかけつつ、上にも飛ぶ
                playerBody.velocity.x += wallNormal.x * JUMP_FORCE * 1.5;
                playerBody.velocity.z += wallNormal.z * JUMP_FORCE * 1.5;
                playerBody.velocity.y = JUMP_FORCE;
                jumpCount = 1; // 飛んだ後は1回だけ追加ジャンプ可能にする
            } else if (jumpCount < 2) {
                // 通常ジャンプ / 2段ジャンプ
                playerBody.velocity.y = JUMP_FORCE;
                jumpCount++;
            }
        }
        prevSpace = keys['Space'];

        // 落下判定
        if (playerBody.position.y < -5) {
            setStatus('gameover');
        }

        // --- チェイサーの処理 ---
        if (chaserEnemy) {
            // プレイヤーへの方向ベクトルを計算
            const dir = new THREE.Vector3();
            dir.subVectors(playerBody.position, chaserEnemy.body.position).normalize();

            // 敵の追跡速度を高速化 (ベース速度を上げ、レベルによる上昇幅も少し増加)
            const chaserSpeed = 10 + (currentStage * 0.3);

            // XとZのみ追跡させ、Yは一定高さかプレイヤーの少し上を飛ばす
            chaserEnemy.body.position.x += dir.x * chaserSpeed * delta;
            chaserEnemy.body.position.z += dir.z * chaserSpeed * delta;

            // Y軸はプレイヤーのY座標にある程度追従（ふんわり）
            const targetY = playerBody.position.y + 1.0;
            chaserEnemy.body.position.y += (targetY - chaserEnemy.body.position.y) * 2 * delta;

            // 回転演出
            chaserEnemy.mesh.rotation.x += 0.05;
            chaserEnemy.mesh.rotation.y += 0.05;

            // 衝突（捕獲）判定
            const dist = playerBody.position.distanceTo(chaserEnemy.body.position);
            // プレイヤー半径(0.5) + エネミー半径(1.0) = 1.5。 少しだけ猶予を持たせる
            if (dist < (playerRadius + chaserEnemy.radius - 0.2)) {
                setStatus('gameover');
            }
        }
    }

    // メッシュ同期
    playerMesh.position.copy(playerBody.position);
    if (chaserEnemy) {
        chaserEnemy.mesh.position.copy(chaserEnemy.body.position);
    }

    // カメラ追従（スライディング中は視点を下げる）
    let camHeightOffset = 0.5;
    if (isSliding) {
        // 通常の0.5から下げることで地面スレスレを滑っているように見せる
        camHeightOffset = 0.0;
    }

    camera.position.set(playerBody.position.x, playerBody.position.y + camHeightOffset, playerBody.position.z);

    // 障害物・ギミックのアニメーション
    stageObjects.forEach(obj => {
        if (obj.isObstacle) {
            // 回転速度をレベルに応じて少し早くする
            const rotSpeed = 0.02 + (currentStage * 0.0005);
            obj.mesh.rotation.y += rotSpeed;
            // KINEMATICボディにも回転を同期させることで物理衝突も正しく回転する
            obj.body.quaternion.copy(obj.mesh.quaternion);
        } else if (obj.moveProps) {
            // 動く足場のアニメーション
            obj.moveProps.time += delta * obj.moveProps.speed;

            // サイン波で往復運動を計算 (-1 〜 1)
            const offset = Math.sin(obj.moveProps.time) * obj.moveProps.range;

            if (obj.moveProps.type === 'horizontal') {
                obj.mesh.position.x = obj.moveProps.startPos.x + offset;
            } else if (obj.moveProps.type === 'vertical') {
                obj.mesh.position.y = obj.moveProps.startPos.y + offset;
            }

            // 物理ボディの位置も同期（Kinematic）
            // Kinematicなボディは velocity ではなく position で動かすことができる
            // ※より厳密には velocity を計算して与えるべきですが、簡易のアクションゲームとしては position 強制書き換えも許容されます。
            // プレイヤーが上に乗った摩擦で運ばれるよう、位置を直接更新します
            obj.body.position.copy(obj.mesh.position);
        }
    });

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
