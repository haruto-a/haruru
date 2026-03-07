export class Player {
    constructor(game) {
        this.game = game;
        this.width = 30; // 調整が必要かも
        this.height = 30; // 調整が必要かも
        this.x = 0;
        this.y = 0;
        this.vy = 0;
        this.weight = 1;
        this.image = document.getElementById('player');
        if (!this.image) {
            // Fallback if image not loaded yet or ID wrong in index.html (need to add img tag hidden)
            // We will handle image loading in main.js
        }
        this.speed = 0;
        this.maxSpeed = 5;

        // Sprite animation
        this.frameX = 0;
        this.frameY = 0; // 0: idle, 1: run
        this.maxFrame = 0;
        this.fps = 10;
        this.frameInterval = 1000 / this.fps;
        this.frameTimer = 0;

        // States
        this.states = [];
        this.currentState = null;
    }

    update(input, deltaTime) {
        this.checkCollision();
        this.currentState.handleInput(input);

        // Horizontal Movement
        this.x += this.speed;
        this.handleHorizontalCollision();

        // Boundaries
        if (this.x < 0) this.x = 0;
        if (this.x > this.game.level.width - this.width) this.x = this.game.level.width - this.width;

        // Vertical Movement
        this.y += this.vy;
        if (!this.onGround()) {
            this.vy += this.weight;
        } else {
            this.vy = 0;
        }
        this.handleVerticalCollision();

        // Sprite Animation
        if (this.frameTimer > this.frameInterval) {
            if (this.frameX < this.maxFrame) this.frameX++;
            else this.frameX = 0;
            this.frameTimer = 0;
        } else {
            this.frameTimer += deltaTime;
        }
    }

    handleHorizontalCollision() {
        const tileSize = this.game.level.tileSize;
        const gridXStart = Math.floor(this.x / tileSize);
        const gridXEnd = Math.floor((this.x + this.width) / tileSize);
        const gridYStart = Math.floor(this.y / tileSize);
        const gridYEnd = Math.floor((this.y + this.height) / tileSize);

        for (let y = gridYStart; y <= gridYEnd; y++) {
            for (let x = gridXStart; x <= gridXEnd; x++) {
                if (y >= 0 && y < this.game.level.levelMap.length && x >= 0 && x < this.game.level.levelMap[0].length) {
                    const tile = this.game.level.levelMap[y][x];
                    if (tile === 1 || tile === 2) { // Solid tile (Ground or Brick)
                        if (this.speed > 0) { // Moving Right
                            this.x = x * tileSize - this.width - 0.01;
                        } else if (this.speed < 0) { // Moving Left
                            this.x = (x + 1) * tileSize + 0.01;
                        }
                    } else if (tile === 3) {
                        this.game.gameWon = true;
                        this.game.gameOver = true;
                    }
                }
            }
        }
    }

    handleVerticalCollision() {
        const tileSize = this.game.level.tileSize;
        const gridXStart = Math.floor(this.x / tileSize);
        const gridXEnd = Math.floor((this.x + this.width) / tileSize);
        const gridYStart = Math.floor(this.y / tileSize);
        const gridYEnd = Math.floor((this.y + this.height) / tileSize);

        for (let y = gridYStart; y <= gridYEnd; y++) {
            for (let x = gridXStart; x <= gridXEnd; x++) {
                if (y >= 0 && y < this.game.level.levelMap.length && x >= 0 && x < this.game.level.levelMap[0].length) {
                    const tile = this.game.level.levelMap[y][x];
                    if (tile === 1 || tile === 2) { // Solid tile
                        if (this.vy > 0) { // Falling
                            this.y = y * tileSize - this.height - 0.01;
                            this.vy = 0;
                            // Ensure we can jump again (handled by state machine mostly, but vy=0 is key)
                        } else if (this.vy < 0) { // Jumping
                            this.y = (y + 1) * tileSize + 0.01;
                            this.vy = 0;
                        }
                    } else if (tile === 3) {
                        this.game.gameWon = true;
                        this.game.gameOver = true;
                    }
                }
            }
        }
    }

    draw(context) {
        // Debug
        if (this.game.debug) {
            context.strokeRect(this.x, this.y, this.width, this.height);
        }

        if (this.image) {
            // Assuming standard grid. 
            // Generated image seems to be:
            // Row 0: Idle (1 frame?)
            // Row 1: Run (4 frames)
            // Row 2: Jump (1 frame)
            // Let's assume 48x48 or similar per cell if it's "pixel art". 
            // We will need to fine tune this.
            const spriteWidth = this.image.width / 4; // Max 4 frames wide?
            const spriteHeight = this.image.height / 3; // 3 rows

            context.drawImage(
                this.image,
                this.frameX * spriteWidth,
                this.frameY * spriteHeight,
                spriteWidth,
                spriteHeight,
                this.x,
                this.y,
                this.width,
                this.height
            );
        } else {
            context.fillStyle = 'red';
            context.fillRect(this.x, this.y, this.width, this.height);
        }
    }

    onGround() {
        // Check if just above a solid tile
        const tileSize = this.game.level.tileSize;
        // Check pixels just below the feet
        const y = Math.floor((this.y + this.height + 1) / tileSize);
        const xStart = Math.floor((this.x) / tileSize);
        const xEnd = Math.floor((this.x + this.width) / tileSize);

        if (y >= 0 && y < this.game.level.levelMap.length) {
            for (let x = xStart; x <= xEnd; x++) {
                if (this.game.level.levelMap[y][x] !== 0) {
                    return true;
                }
            }
        }
        return false;
    }

    setState(state, speed) {
        this.currentState = this.states[state];
        this.game.speed = this.game.maxSpeed * speed;
        this.currentState.enter();
    }

    checkCollision() {
        this.game.enemies.forEach(enemy => {
            if (
                enemy.x < this.x + this.width &&
                enemy.x + enemy.width > this.x &&
                enemy.y < this.y + this.height &&
                enemy.y + enemy.height > this.y
            ) {
                // Collision detected
                // Check if stomping (coming from above)
                // Using currentState index is brittle, let's check dy or state name
                // Index 3 is Falling
                if (this.currentState === this.states[3] && (this.y + this.height) < (enemy.y + enemy.height * 0.5)) {
                    enemy.markedForDeletion = true;
                    this.game.score++;
                    this.vy = -15; // Bounce off enemy
                    // Add collision effect
                    // this.game.collisions.push(new CollisionAnimation(this.game, enemy.x + enemy.width * 0.5, enemy.y + enemy.height * 0.5));
                } else {
                    // Hit logic
                    // this.setState(4, 0); // NEW Hit state ?
                    // For now just restart or game over
                    this.game.gameOver = true;
                }
            }
        });
    }
}
