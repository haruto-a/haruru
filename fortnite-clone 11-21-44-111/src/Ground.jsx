import { usePlane } from "@react-three/cannon"
import { useTexture } from "@react-three/drei"
import { useEffect } from "react"
import * as THREE from "three"

export const Ground = (props) => {
    const [ref] = usePlane(() => ({ rotation: [-Math.PI / 2, 0, 0], ...props }))

    return (
        <group>
            <mesh ref={ref} receiveShadow>
                <planeGeometry args={[1000, 1000]} />
                <meshStandardMaterial color="#458745" />
            </mesh>
            <gridHelper args={[1000, 100]} position={[0, 0.1, 0]} />
        </group>
    )
}
