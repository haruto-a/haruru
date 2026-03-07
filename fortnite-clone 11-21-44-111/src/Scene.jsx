import { Physics } from "@react-three/cannon"
import { Sky, Stars } from "@react-three/drei"
import { Ground } from "./Ground"
import { Player } from "./Player"
import { Cubes } from "./Cubes"

export const Scene = () => {
    return (
        <>
            <Sky sunPosition={[100, 20, 100]} />
            <Stars />
            <ambientLight intensity={0.3} />
            <pointLight position={[100, 100, 100]} intensity={1} castShadow />

            <Physics gravity={[0, -9.8, 0]}>
                <Player position={[0, 5, 0]} />
                <Ground />
                <Cubes />
            </Physics>
        </>
    )
}
