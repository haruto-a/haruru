import { Canvas } from '@react-three/fiber'
import { Physics } from '@react-three/rapier'
import { KeyboardControls, Sky, PointerLockControls } from '@react-three/drei'
import { Level } from './Level'
import { Player } from './Player'
import { UI } from './UI'
import './index.css'

export default function App() {
  return (
    <KeyboardControls
      map={[
        { name: 'forward', keys: ['ArrowUp', 'KeyW', 'w', 'W'] },
        { name: 'backward', keys: ['ArrowDown', 'KeyS', 's', 'S'] },
        { name: 'left', keys: ['ArrowLeft', 'KeyA', 'a', 'A'] },
        { name: 'right', keys: ['ArrowRight', 'KeyD', 'd', 'D'] },
        { name: 'jump', keys: ['Space', ' '] },
      ]}
    >
      <div style={{ width: '100vw', height: '100vh', touchAction: 'none' }}>
        <UI />
        <Canvas shadows camera={{ position: [0, 5, 10], fov: 60 }}>
          <Sky sunPosition={[100, 20, 100]} turbidity={0.1} rayleigh={0.5} />

          <PointerLockControls />

          <Physics debug={false} gravity={[0, -20, 0]}>
            <Level />
            <Player />
          </Physics>

        </Canvas>
      </div>
    </KeyboardControls>
  )
}
