import { Background } from './background.js';
import { Level } from './level.js';
import { GroundEnemy } from './enemy.js';

export class Game {
    constructor(width, height) {
        this.width = width;
        this.height = height;
        this.groundMargin = 50;
        this.speed = 0;
        this.maxSpeed = 3;
        this.background = new Background(this);
        this.level = new Level(this);
        this.player = null;
        this.input = null;
        this.enemies = [];
        this.particles = [];
        this.collisions = [];
        this.floatingMessages = [];
        this.debug = false;
        this.score = 0;
        this.fontColor = 'black';
        this.time = 0;
        this.maxTime = 20000;
        this.gameOver = false;
        this.gameWon = false;
        this.lives = 3;
        this.cameraX = 0;

        // Add test enemy
        const enemy = new GroundEnemy(this);
        enemy.x = 400;
        enemy.y = 13 * 40; // On the ground
        this.enemies.push(enemy);

        this.started = false;
    }

    start() {
        this.started = true;
        const startScreen = document.getElementById('start-screen');
        if (startScreen) startScreen.classList.add('hidden');
    }

    update(deltaTime) {
        this.time += deltaTime;

        // Camera logic
        if (this.player) {
            if (this.player.x - this.cameraX > this.width * 0.4) {
                this.cameraX = this.player.x - this.width * 0.4;
            }
            if (this.cameraX < 0) this.cameraX = 0;
        }

        if (this.background) this.background.update();

        // Stop updates if game hasn't started
        if (!this.started) return;

        if (this.player) this.player.update(this.input.keys, deltaTime);

        // Handle enemies
        this.enemies.forEach(enemy => {
            enemy.update(deltaTime);
        });

        // Filter out marked-for-deletion objects
        this.enemies = this.enemies.filter(enemy => !enemy.markedForDeletion);
        this.particles = this.particles.filter(particle => !particle.markedForDeletion);
        this.collisions = this.collisions.filter(collision => !collision.markedForDeletion);
        this.floatingMessages = this.floatingMessages.filter(message => !message.markedForDeletion);
    }

    draw(context) {
        if (this.background) this.background.draw(context);

        context.save();
        context.translate(-this.cameraX, 0);

        if (this.level) this.level.draw(context);
        if (this.player) this.player.draw(context);

        this.enemies.forEach(enemy => {
            enemy.draw(context);
        });

        this.particles.forEach(particle => {
            particle.draw(context);
        });

        this.collisions.forEach(collision => {
            collision.draw(context);
        });

        this.floatingMessages.forEach(message => {
            message.draw(context);
        });

        context.restore();

        // UI
        // context.font = '20px Helvetica';
        // context.fillStyle = this.fontColor;
        // context.fillText('Score: ' + this.score, 20, 50);
        // context.fillText('Time: ' + (this.time * 0.001).toFixed(1), 20, 80);

        if (this.gameOver) {
            context.textAlign = 'center';
            context.font = '30px Helvetica';
            context.fillText('ゲームオーバー', this.width * 0.5, this.height * 0.5);
        }
        if (this.gameWon) {
            context.textAlign = 'center';
            context.font = '30px Helvetica';
            context.fillStyle = 'gold';
            context.fillText('ゲームクリア！', this.width * 0.5, this.height * 0.5);
        }
    }
}
