import { useRef, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { RigidBody, RapierRigidBody } from '@react-three/rapier'
import { useKeyboardControls } from '@react-three/drei'
import { useGameStore } from './store'
import * as THREE from 'three'


const SPEED = 1.0;
const JUMP_FORCE = 15.0;

export function Player() {
    const rb = useRef<RapierRigidBody>(null)
    const { status, actions } = useGameStore()
    const { camera } = useThree()
    const [subscribeKeys, getKeys] = useKeyboardControls()

    useEffect(() => {
        // スタート判定
        const unsubscribe = subscribeKeys(
            (state) => state.forward || state.backward || state.left || state.right,
            (pressed) => {
                if (pressed && status === 'ready') {
                    actions.start()
                }
            }
        )

        // ジャンプ判定
        const unsubscribeJump = subscribeKeys(
            (state) => state.jump,
            (pressed) => {
                if (pressed && rb.current && status === 'playing') {
                    const vel = rb.current.linvel()
                    // 簡易的な接地判定（y方向の速度がほぼ0のときのみジャンプ可能とする）
                    if (Math.abs(vel.y) < 0.1) {
                        rb.current.setLinvel({ x: vel.x, y: JUMP_FORCE, z: vel.z }, true)
                    }
                }
            }
        )
        return () => {
            unsubscribe()
            unsubscribeJump()
        }
    }, [status, subscribeKeys, actions])

    useEffect(() => {
        if (status === 'ready' && rb.current) {
            rb.current.setTranslation({ x: 0, y: 3, z: 0 }, true)
            rb.current.setLinvel({ x: 0, y: 0, z: 0 }, true)
            rb.current.setAngvel({ x: 0, y: 0, z: 0 }, true)
        }
    }, [status])

    useFrame(() => {
        if (!rb.current || status === 'gameover' || status === 'clear') return

        const pos = rb.current.translation()

        // カメラをプレイヤーの位置に追従させる（目に相当する高さに少しオフセット）
        camera.position.set(pos.x, pos.y + 0.2, pos.z)

        const { forward, backward, left, right } = getKeys()

        // カメラの向いている方向（前）を取得
        const forwardVector = new THREE.Vector3()
        camera.getWorldDirection(forwardVector)
        forwardVector.y = 0 // Y軸方向（上下）の移動は無視
        forwardVector.normalize()

        // カメラの右方向を取得
        const rightVector = new THREE.Vector3()
        rightVector.crossVectors(camera.up, forwardVector).normalize()

        const impulseScale = SPEED * 0.1
        let impulse = new THREE.Vector3()

        if (forward) {
            impulse.add(forwardVector.clone().multiplyScalar(impulseScale))
        }
        if (backward) {
            impulse.sub(forwardVector.clone().multiplyScalar(impulseScale))
        }
        if (left) {
            impulse.add(rightVector.clone().multiplyScalar(impulseScale))
        }
        if (right) {
            impulse.sub(rightVector.clone().multiplyScalar(impulseScale))
        }

        rb.current.applyImpulse(impulse, true)

        // y座標が-5未満になったらゲームオーバー
        if (pos.y < -5) {
            actions.gameover()
        }
    })

    return (
        <RigidBody
            ref={rb}
            type="dynamic"
            colliders="ball"
            position={[0, 3, 0]}
            mass={1}
            restitution={0.2}
            friction={2}
            linearDamping={2.0}
            angularDamping={2.0}
        >
            <mesh castShadow visible={false}>
                <sphereGeometry args={[0.5, 32, 32]} />
                <meshStandardMaterial color="hotpink" />
            </mesh>
        </RigidBody>
    )
}
