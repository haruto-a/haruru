export class InputHandler {
    constructor(game) {
        this.game = game;
        this.keys = [];
        window.addEventListener('keydown', e => {
            if (!this.game.started && e.key === ' ') {
                this.game.start();
                return;
            }

            const key = (['w', 'a', 's', 'd'].includes(e.key.toLowerCase())) ? e.key.toLowerCase() : e.key;

            if ((key === 'ArrowDown' ||
                key === 'ArrowUp' ||
                key === 'ArrowLeft' ||
                key === 'ArrowRight' ||
                key === 'w' ||
                key === 'a' ||
                key === 's' ||
                key === 'd' ||
                key === ' ' // Space
            ) && this.keys.indexOf(key) === -1) {
                this.keys.push(key);
            } else if (e.key === 'Control') {
                this.game.debug = !this.game.debug;
            }
        });
        window.addEventListener('keyup', e => {
            const key = (['w', 'a', 's', 'd'].includes(e.key.toLowerCase())) ? e.key.toLowerCase() : e.key;
            if (key === 'ArrowDown' ||
                key === 'ArrowUp' ||
                key === 'ArrowLeft' ||
                key === 'ArrowRight' ||
                key === 'w' ||
                key === 'a' ||
                key === 's' ||
                key === 'd' ||
                key === ' ') {
                this.keys.splice(this.keys.indexOf(key), 1);
            }
        });
    }
}
