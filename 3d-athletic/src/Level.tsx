import { RigidBody } from '@react-three/rapier'
import * as THREE from 'three'
import { useGameStore } from './store'
import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'

const blockMaterial = new THREE.MeshStandardMaterial({ color: '#2b2d31', roughness: 0.8 })
const obstacleMaterial = new THREE.MeshStandardMaterial({ color: '#e74c3c', roughness: 0.5 })
const goalMaterial = new THREE.MeshStandardMaterial({ color: '#2ecc71', roughness: 0.2, emissive: '#2ecc71', emissiveIntensity: 0.5 })

export function Level() {
    const { actions } = useGameStore()
    const obstacleRef = useRef<THREE.Mesh>(null)

    useFrame((state) => {
        // 障害物を少し動かす（回転など）
        const time = state.clock.getElapsedTime()
        if (obstacleRef.current) {
            obstacleRef.current.rotation.y = time * 0.5
        }
    })

    return (
        <group>
            {/* スタート地点 */}
            <RigidBody type="fixed" colliders="cuboid" position={[0, -0.5, 0]}>
                <mesh receiveShadow material={blockMaterial}>
                    <boxGeometry args={[10, 1, 10]} />
                </mesh>
            </RigidBody>

            {/* 道のり 1 */}
            <RigidBody type="fixed" colliders="cuboid" position={[0, -0.5, -15]}>
                <mesh receiveShadow material={blockMaterial}>
                    <boxGeometry args={[4, 1, 20]} />
                </mesh>
            </RigidBody>

            {/* 動く・回転する障害物 (物理的な実体と同期させるにはRapierのKinematicBody等を使うが、今回は固定配置のシンプルなもの) */}
            <RigidBody type="kinematicPosition" colliders="cuboid" position={[0, 0.5, -15]}>
                <mesh ref={obstacleRef} castShadow receiveShadow material={obstacleMaterial}>
                    <boxGeometry args={[6, 1, 1]} />
                </mesh>
            </RigidBody>

            {/* 道のり 2 (少し高さを変える) */}
            <RigidBody type="fixed" colliders="cuboid" position={[0, 1, -30]}>
                <mesh receiveShadow material={blockMaterial}>
                    <boxGeometry args={[4, 1, 10]} />
                </mesh>
            </RigidBody>

            <RigidBody type="fixed" colliders="cuboid" position={[-8, 1, -30]}>
                <mesh receiveShadow material={blockMaterial}>
                    <boxGeometry args={[12, 1, 4]} />
                </mesh>
            </RigidBody>

            {/* ゴール地点 */}
            <RigidBody
                type="fixed"
                colliders="cuboid"
                position={[-18, 1, -30]}
                onCollisionEnter={() => {
                    // ゴールに触れたらクリア
                    actions.clear()
                }}
            >
                <mesh receiveShadow material={goalMaterial}>
                    <boxGeometry args={[8, 1, 8]} />
                </mesh>
                {/* ゴールの目印 */}
                <mesh position={[0, 2, 0]}>
                    <cylinderGeometry args={[1, 1, 0.5, 32]} />
                    <meshStandardMaterial color="yellow" emissive="yellow" emissiveIntensity={0.8} />
                </mesh>
            </RigidBody>

            {/* 照明 */}
            <ambientLight intensity={0.5} />
            <directionalLight
                position={[5, 10, 5]}
                intensity={1}
                castShadow
                shadow-mapSize-width={2048}
                shadow-mapSize-height={2048}
                shadow-camera-near={0.5}
                shadow-camera-far={100}
                shadow-camera-left={-20}
                shadow-camera-right={20}
                shadow-camera-top={20}
                shadow-camera-bottom={-20}
            />
        </group>
    )
}
