export class CollisionAnimation {
    constructor(game, x, y) {
        this.game = game;
        this.image = document.getElementById('collisionAnimation'); // We need an asset for this or draw manual
        this.spriteWidth = 100;
        this.spriteHeight = 90;
        this.sizeModifier = Math.random() + 0.5;
        this.width = this.spriteWidth * this.sizeModifier;
        this.height = this.spriteHeight * this.sizeModifier;
        this.x = x - this.width * 0.5;
        this.y = y - this.height * 0.5;
        this.frameX = 0;
        this.maxFrame = 4;
        this.markedForDeletion = false;
        this.fps = Math.random() * 10 + 5;
        this.frameInterval = 1000 / this.fps;
        this.frameTimer = 0;
    }
    draw(context) {
        // Draw simple explosion if no image
        context.fillStyle = 'orange';
        context.beginPath();
        context.arc(this.x + this.width / 2, this.y + this.height / 2, this.width / 2 * (1 - this.frameX / this.maxFrame), 0, Math.PI * 2);
        context.fill();
    }
    update(deltaTime) {
        this.x -= this.game.speed; // Scroll with world if needed, or use cam
        // Wait, collision works in world coords, so we draw relative to cam
        // update doesn't need to change x unless it moves.

        if (this.frameTimer > this.frameInterval) {
            this.frameX++;
            this.frameTimer = 0;
        } else {
            this.frameTimer += deltaTime;
        }
        if (this.frameX > this.maxFrame) this.markedForDeletion = true;
    }
}
