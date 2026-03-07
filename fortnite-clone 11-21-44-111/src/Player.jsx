import { useSphere } from "@react-three/cannon"
import { useThree, useFrame } from "@react-three/fiber"
import { useEffect, useRef, useState } from "react"
import { Vector3, Quaternion, Euler } from "three"
import { PointerLockControls } from "@react-three/drei"
import { useStore } from "./hooks/useStore"

const WALK_SPEED = 5
const RUN_SPEED = 10
const JUMP_FORCE = 5

// 簡易的な人型モデル
const CharacterModel = () => {
    return (
        <group position={[0, -0.9, 0]}>
            {/* 胴体 */}
            <mesh position={[0, 0.75, 0]}>
                <boxGeometry args={[0.6, 0.7, 0.3]} />
                <meshStandardMaterial color="#2d7eff" />
            </mesh>
            {/* 頭 */}
            <mesh position={[0, 1.3, 0]}>
                <boxGeometry args={[0.3, 0.3, 0.3]} />
                <meshStandardMaterial color="#f0c0a0" />
            </mesh>
            {/* 右腕 */}
            <mesh position={[0.45, 0.75, 0]}>
                <boxGeometry args={[0.2, 0.7, 0.2]} />
                <meshStandardMaterial color="#1a5ebd" />
            </mesh>
            {/* 左腕 */}
            <mesh position={[-0.45, 0.75, 0]}>
                <boxGeometry args={[0.2, 0.7, 0.2]} />
                <meshStandardMaterial color="#1a5ebd" />
            </mesh>
            {/* 右足 */}
            <mesh position={[0.2, 0.15, 0]}>
                <boxGeometry args={[0.25, 0.6, 0.25]} />
                <meshStandardMaterial color="#1a1a1a" />
            </mesh>
            {/* 左足 */}
            <mesh position={[-0.2, 0.15, 0]}>
                <boxGeometry args={[0.25, 0.6, 0.25]} />
                <meshStandardMaterial color="#1a1a1a" />
            </mesh>
        </group>
    )
}

export const Player = (props) => {
    const { camera } = useThree()
    // fixedRotation: true で転倒を防ぐ
    const [ref, api] = useSphere(() => ({
        mass: 1,
        type: "Dynamic",
        position: [0, 5, 0],
        fixedRotation: true,
        ...props
    }))

    const modelRef = useRef()

    const velocity = useRef([0, 0, 0])
    useEffect(() => api.velocity.subscribe((v) => (velocity.current = v)), [api.velocity])

    const pos = useRef([0, 0, 0])
    useEffect(() => api.position.subscribe((p) => (pos.current = p)), [api.position])

    const [actions, setActions] = useState({
        forward: false,
        backward: false,
        left: false,
        right: false,
        jump: false,
        sprint: false,
    })

    useEffect(() => {
        const handleKeyDown = (e) => {
            switch (e.code) {
                case 'KeyW': setActions(prev => ({ ...prev, forward: true })); break;
                case 'KeyS': setActions(prev => ({ ...prev, backward: true })); break;
                case 'KeyA': setActions(prev => ({ ...prev, left: true })); break;
                case 'KeyD': setActions(prev => ({ ...prev, right: true })); break;
                case 'ShiftLeft':
                case 'ShiftRight': setActions(prev => ({ ...prev, sprint: true })); break;
                case 'Space':
                    if (Math.abs(velocity.current[1]) < 0.05) {
                        api.velocity.set(velocity.current[0], JUMP_FORCE, velocity.current[2])
                    }
                    break;
            }
        }

        const handleKeyUp = (e) => {
            switch (e.code) {
                case 'KeyW': setActions(prev => ({ ...prev, forward: false })); break;
                case 'KeyS': setActions(prev => ({ ...prev, backward: false })); break;
                case 'KeyA': setActions(prev => ({ ...prev, left: false })); break;
                case 'KeyD': setActions(prev => ({ ...prev, right: false })); break;
                case 'ShiftLeft':
                case 'ShiftRight': setActions(prev => ({ ...prev, sprint: false })); break;
            }
        }

        document.addEventListener("keydown", handleKeyDown)
        document.addEventListener("keyup", handleKeyUp)

        // クリックで建築
        const handleClick = (e) => {
            // そもそもPointerLockがかかっていないと操作できないので、Lock状態チェックが必要だが
            // 今回はシンプルに実装

            // プレイヤーの位置とカメラの向きを取得
            if (!pos.current) return

            // 本当はRaycasterを使って「見ている地点」を取得するのがベストだが
            // 単純に「目の前2メートル」の位置に置く簡易実装にする

            const p = new Vector3(...pos.current)
            const camDir = new Vector3()
            camera.getWorldDirection(camDir)

            // 目の前の位置 (+3mくらい)
            const target = p.add(camDir.multiplyScalar(3))

            // グリッドスナップ (整数座標に丸める)
            const x = Math.round(target.x)
            const y = Math.round(target.y)
            const z = Math.round(target.z)

            // 追加 (地面より下には置かないように修正)
            if (y >= 0) {
                addCube(x, y, z)
            }
        }

        document.addEventListener("mousedown", handleClick)

        return () => {
            document.removeEventListener("keydown", handleKeyDown)
            document.removeEventListener("keyup", handleKeyUp)
            document.removeEventListener("mousedown", handleClick)
        }
    }, [])

    useFrame((state) => {
        if (!pos.current) return;

        // 1. 移動方向の計算 (カメラの向き基準)
        const frontVector = new Vector3(
            0,
            0,
            (actions.backward ? 1 : 0) - (actions.forward ? 1 : 0)
        )
        const sideVector = new Vector3(
            (actions.left ? 1 : 0) - (actions.right ? 1 : 0),
            0,
            0
        )

        const direction = new Vector3()
        const currentSpeed = actions.sprint ? RUN_SPEED : WALK_SPEED

        // カメラの水平回転成分だけを取り出す
        const cameraEuler = new Euler().setFromQuaternion(camera.quaternion, 'YXZ');
        cameraEuler.x = 0;
        cameraEuler.z = 0;

        direction
            .subVectors(frontVector, sideVector)
            .normalize()
            .multiplyScalar(currentSpeed)
            .applyEuler(cameraEuler)

        api.velocity.set(direction.x, velocity.current[1], direction.z)

        // 2. キャラクターモデルの回転
        if (modelRef.current) {
            modelRef.current.rotation.y = cameraEuler.y + Math.PI;
        }

        // 3. TPSカメラ位置の更新
        const offsetDistance = 4;
        const offsetHeight = 2;

        const camDir = new Vector3();
        camera.getWorldDirection(camDir);
        camDir.normalize();

        const targetPos = new Vector3(pos.current[0], pos.current[1] + offsetHeight, pos.current[2]);

        const newCamPos = targetPos.clone().add(camDir.multiplyScalar(-offsetDistance));

        camera.position.copy(newCamPos);
    })

    return (
        <>
            <PointerLockControls />
            <mesh ref={ref}>
                <sphereGeometry args={[1, 32, 32]} />
                <meshStandardMaterial transparent opacity={0} />
                <group ref={modelRef}>
                    <CharacterModel />
                </group>
            </mesh>
        </>
    )
}
