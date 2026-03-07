export class Enemy {
    constructor(game) {
        this.game = game;
        this.markedForDeletion = false;
    }
    update(deltaTime) {
        this.x -= this.speedX + this.game.speed;
        this.y += this.speedY;
        if (this.frameTimer > this.frameInterval) {
            if (this.frameX < this.maxFrame) this.frameX++;
            else this.frameX = 0;
            this.frameTimer = 0;
        } else {
            this.frameTimer += deltaTime;
        }

        if (this.x + this.width < 0) this.markedForDeletion = true;
    }
    draw(context) {
        if (this.image) {
            context.drawImage(this.image, this.frameX * this.width, 0, this.width, this.height, this.x, this.y, this.width, this.height);
        } else {
            context.fillStyle = 'red';
            context.fillRect(this.x, this.y, this.width, this.height);
        }
    }
}

export class GroundEnemy extends Enemy {
    constructor(game) {
        super(game);
        this.width = 40;
        this.height = 40;
        this.x = this.game.width;
        this.y = this.game.height - this.height - this.game.groundMargin;
        this.image = document.getElementById('enemy_mushroom'); // Need to add to index or load
        this.speedX = 2;
        this.speedY = 0;
        this.maxFrame = 1;
        this.image = null; // Placeholder
        this.fps = 20;
        this.frameInterval = 1000 / this.fps;
        this.frameTimer = 0;
        this.frameX = 0;
    }

    update(deltaTime) {
        super.update(deltaTime);
        // Simple ground patrol logic could be added here
        // For now it just moves left
    }

    draw(context) {
        context.fillStyle = 'brown';
        context.fillRect(this.x, this.y, this.width, this.height);
    }
}
