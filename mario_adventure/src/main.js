import { Game } from './game.js';
import { Player } from './player.js';
import { InputHandler } from './input.js';
import { Idle, Running, Jumping, Falling } from './playerStates.js';

window.addEventListener('load', function () {
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 800;
    canvas.height = 600;

    const game = new Game(canvas.width, canvas.height);
    game.input = new InputHandler(game);

    // Player Setup with States
    const player = new Player(game);
    player.states = [new Idle(game), new Running(game), new Jumping(game), new Falling(game)];
    player.currentState = player.states[0];
    game.player = player;
    player.currentState.enter();

    // Load assets (Preload logic can be better in a real app)
    const playerImage = new Image();
    playerImage.src = 'assets/player.png';
    playerImage.id = 'player'; // Hacky way to store it for now or pass it
    // We'll attach it to the player instance
    game.player.image = playerImage;

    let lastTime = 0;
    function animate(timeStamp) {
        const deltaTime = timeStamp - lastTime;
        lastTime = timeStamp;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        game.update(deltaTime);
        game.draw(ctx);

        requestAnimationFrame(animate);
    }
    animate(0);
});
