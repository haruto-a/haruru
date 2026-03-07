import { create } from 'zustand'

interface GameState {
    status: 'ready' | 'playing' | 'gameover' | 'clear';
    time: number;
    startTime: number;
    actions: {
        start: () => void;
        gameover: () => void;
        clear: () => void;
        reset: () => void;
        updateTime: (now: number) => void;
    }
}

export const useGameStore = create<GameState>((set) => ({
    status: 'ready',
    time: 0,
    startTime: 0,
    actions: {
        start: () => set({ status: 'playing', startTime: Date.now() }),
        gameover: () => set({ status: 'gameover' }),
        clear: () => set({ status: 'clear' }),
        reset: () => set({ status: 'ready', time: 0 }),
        updateTime: (now) => set((state) => {
            if (state.status !== 'playing') return state;
            return { time: now - state.startTime }
        })
    }
}))
