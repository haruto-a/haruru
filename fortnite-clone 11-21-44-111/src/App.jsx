import { Canvas } from "@react-three/fiber"
import { Scene } from "./Scene"
import "./App.css"

function App() {
    return (
        <>
            <div className="aim-point" />
            <Canvas shadows camera={{ fov: 45 }}>
                <Scene />
            </Canvas>
        </>
    )
}

export default App
