import { useBox } from "@react-three/cannon"
import { useStore } from "./hooks/useStore"
import { useState } from "react"

// 個々のCubeコンポーネント
const Cube = ({ position, texture }) => {
    // 物理演算の設定 (Staticにしないと崩れるが、積み上げるならStaticでも質量0でも良い。
    // 今回は「建築」なので、基本は動かない壁=Static/Mass=0として扱うのが無難)
    const [ref] = useBox(() => ({
        type: "Static",
        position,
    }))

    // ホバーエフェクト用 (オプション)
    const [isHovered, setIsHovered] = useState(false)

    return (
        <mesh
            ref={ref}
            onPointerMove={(e) => {
                e.stopPropagation()
                setIsHovered(true)
            }}
            onPointerOut={() => setIsHovered(false)}
        >
            <boxGeometry />
            <meshStandardMaterial
                color={isHovered ? "orange" : "white"}
                roughness={0.5}
            />
        </mesh>
    )
}

// ストアからCubeリストを取得して並べるコンポーネント
export const Cubes = () => {
    const [cubes] = useStore((state) => [state.cubes])

    return cubes.map((cube) => (
        <Cube key={cube.key} position={cube.pos} texture={cube.texture} />
    ))
}
