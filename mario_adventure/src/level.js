export class Level {
    constructor(game) {
        this.game = game;
        this.tiles = [];
        this.tileImage = new Image();
        this.tileImage.src = 'assets/tiles.png';
        this.brickImage = new Image();
        this.brickImage.src = 'assets/brick.png';

        this.tileSize = 40; // Size of our tiles

        // Simple level data: 1 = ground, 2 = brick
        // Extend to 60 columns (3 screens wide)
        const cols = 60;
        const rows = 15;
        this.levelMap = [];
        for (let y = 0; y < rows; y++) {
            this.levelMap.push(new Array(cols).fill(0));
        }

        // Generate floor
        for (let x = 0; x < cols; x++) {
            this.levelMap[rows - 1][x] = 1;
            this.levelMap[rows - 2][x] = 1;
        }

        // Add some platforms
        // Platform 1
        for (let x = 10; x < 15; x++) this.levelMap[10][x] = 2;
        // Platform 2
        for (let x = 20; x < 26; x++) this.levelMap[8][x] = 2;
        // Platform 3 (Higher)
        for (let x = 30; x < 35; x++) this.levelMap[6][x] = 2;
        // Wall
        for (let y = 10; y < 13; y++) this.levelMap[y][40] = 2;

        // Calculate level width in pixels
        this.width = this.levelMap[0].length * this.tileSize;
    }

    update() {
        // Scroll level based on player position or game speed
    }

    draw(context) {
        for (let y = 0; y < this.levelMap.length; y++) {
            for (let x = 0; x < this.levelMap[y].length; x++) {
                let tile = this.levelMap[y][x];
                let posX = x * this.tileSize;
                let posY = y * this.tileSize;

                if (tile === 1) {
                    // Draw ground
                    // clipping slightly to avoid seams if needed, but standard draw is fine
                    // Assuming the generated tile is 16x16 or similar, we scale it
                    // The prompt asked for top grass/bottom dirt. Let's assume the image is 40x40 equivalent
                    context.drawImage(this.tileImage, posX, posY, this.tileSize, this.tileSize);
                } else if (tile === 2) {
                    // Draw brick
                    context.drawImage(this.brickImage, posX, posY, this.tileSize, this.tileSize);
                } else if (tile === 3) {
                    // Draw Goal
                    context.fillStyle = 'gold';
                    context.fillRect(posX, posY, this.tileSize, this.tileSize);
                    context.strokeStyle = 'orange';
                    context.strokeRect(posX, posY, this.tileSize, this.tileSize);
                }
            }
        }
    }
}
