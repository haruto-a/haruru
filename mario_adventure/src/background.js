export class Background {
    constructor(game) {
        this.game = game;
        this.width = 1667;
        this.height = 500;
        this.layer1image = document.getElementById('layer1'); // if we had one
        this.x = 0;
        this.y = 0;
        this.width = this.game.width;
        this.height = this.game.height;
        this.speed = 0;
    }

    update() {
        this.speed = this.game.speed * -0.5; // Parallax factor
        // Simple scrolling logic
        // this.x += this.speed;
        // if (this.x < -this.width) this.x = 0;
    }

    draw(context) {
        // Draw Sky
        context.fillStyle = '#5c94fc';
        context.fillRect(0, 0, this.width, this.height);

        // Parallax Clouds (Procedural)
        const cloudSpeed = 0.5;
        const relativeX = -(this.game.cameraX * cloudSpeed); // Relative scroll

        context.fillStyle = 'rgba(255, 255, 255, 0.8)';

        // Draw a few clouds looping
        for (let i = 0; i < 5; i++) {
            let x = (i * 300 + relativeX) % (this.game.width + 200);
            if (x < -200) x += this.game.width + 200;
            let y = 100 + (i % 3) * 50;

            context.beginPath();
            context.arc(x, y, 50, 0, Math.PI * 2);
            context.arc(x + 40, y + 10, 60, 0, Math.PI * 2);
            context.arc(x + 90, y, 50, 0, Math.PI * 2);
            context.fill();
        }

        // Distant mountains or hills (Static or slower parallax)
        context.fillStyle = '#6ab04c';
        context.beginPath();
        context.moveTo(0, this.height);
        context.lineTo(200, this.height - 150);
        context.lineTo(500, this.height);
        context.lineTo(800, this.height - 100);
        context.lineTo(this.width, this.height);
        context.fill();
    }
}
