import { create } from "zustand"
import { nanoid } from "nanoid"

export const useStore = create((set) => ({
    texture: "dirt", // 今回は特に使いませんが拡張用
    cubes: [], // 配置されたオブジェクトのリスト: { key, pos, texture }

    addCube: (x, y, z) => {
        set((prev) => ({
            cubes: [
                ...prev.cubes,
                {
                    key: nanoid(),
                    pos: [x, y, z],
                    texture: prev.texture
                }
            ]
        }))
    },

    removeCube: (x, y, z) => {
        set((prev) => ({
            cubes: prev.cubes.filter(cube => {
                const [cx, cy, cz] = cube.pos
                return cx !== x || cy !== y || cz !== z
            })
        }))
    },

    saveWorld: () => { }, // TODO
    resetWorld: () => {
        set(() => ({ cubes: [] }))
    }
}))
