import { useGameStore } from './store'
import { useEffect } from 'react'

export function UI() {
    const { status, time, actions } = useGameStore()

    useEffect(() => {
        let animationFrameId: number;

        const loop = () => {
            if (status === 'playing') {
                actions.updateTime(Date.now())
            }
            animationFrameId = requestAnimationFrame(loop)
        }
        loop()

        return () => cancelAnimationFrame(animationFrameId)
    }, [status, actions])

    const formattedTime = (time / 1000).toFixed(2)

    return (
        <div className="ui-container">
            <div className="timer">Time: {formattedTime}s</div>

            {status === 'ready' && (
                <div className="controls-help overlay-soft">
                    <h2>3D Athletic Game</h2>
                    <p>WASD / Arrow: Move</p>
                    <p>Space: Jump</p>
                    <p>Mouse Drag: Rotate Camera</p>
                </div>
            )}

            {status === 'gameover' && (
                <div className="overlay">
                    <h1>GAME OVER</h1>
                    <button onClick={actions.reset} className="restart-btn">Try Again</button>
                </div>
            )}

            {status === 'clear' && (
                <div className="overlay clear-overlay">
                    <h1>GOAL!</h1>
                    <p>Clear Time: {formattedTime}s</p>
                    <button onClick={actions.reset} className="restart-btn">Play Again</button>
                </div>
            )}
        </div>
    )
}
