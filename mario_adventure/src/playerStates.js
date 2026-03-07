const states = {
    IDLE: 0,
    RUNNING: 1,
    JUMPING: 2,
    FALLING: 3,
};

class State {
    constructor(state, game) {
        this.state = state;
        this.game = game;
    }
}

export class Idle extends State {
    constructor(game) {
        super('IDLE', game);
    }
    enter() {
        this.game.player.frameX = 0;
        this.game.player.maxFrame = 0; // Idle animation frames
        this.game.player.frameY = 0;
    }
    handleInput(input) {
        if (input.includes('ArrowLeft') || input.includes('ArrowRight') || input.includes('a') || input.includes('d')) {
            this.game.player.setState(states.RUNNING, 1);
        } else if (input.includes(' ')) {
            this.game.player.setState(states.JUMPING, 1);
        }
    }
}

export class Running extends State {
    constructor(game) {
        super('RUNNING', game);
    }
    enter() {
        this.game.player.frameX = 0;
        this.game.player.maxFrame = 3; // Run animation frames
        this.game.player.frameY = 1; // Assuming row 1 is running
    }
    handleInput(input) {
        if (input.includes('ArrowDown') || input.includes('s')) {
            this.game.player.setState(states.IDLE, 0); // Duck?
        } else if (input.includes(' ')) {
            this.game.player.setState(states.JUMPING, 1);
        } else if (!input.includes('ArrowLeft') && !input.includes('ArrowRight') && !input.includes('a') && !input.includes('d')) {
            this.game.player.setState(states.IDLE, 0);
        }

        if (input.includes('ArrowLeft') || input.includes('a')) {
            this.game.player.speed = -this.game.player.maxSpeed;
        } else if (input.includes('ArrowRight') || input.includes('d')) {
            this.game.player.speed = this.game.player.maxSpeed;
        }
    }
}

export class Jumping extends State {
    constructor(game) {
        super('JUMPING', game);
    }
    enter() {
        if (this.game.player.onGround()) this.game.player.vy -= 20; // Jump force
        this.game.player.frameX = 0;
        this.game.player.maxFrame = 0;
        this.game.player.frameY = 2; // Jump sprite
    }
    handleInput(input) {
        if (this.game.player.vy > this.game.player.weight) {
            this.game.player.setState(states.FALLING, 1);
        } else if (input.includes(' ')) {
            // Variable jump height? 
        }

        if (input.includes('ArrowLeft') || input.includes('a')) {
            this.game.player.speed = -this.game.player.maxSpeed * 0.5; // Air control
        } else if (input.includes('ArrowRight') || input.includes('d')) {
            this.game.player.speed = this.game.player.maxSpeed * 0.5;
        }
    }
}

export class Falling extends State {
    constructor(game) {
        super('FALLING', game);
    }
    enter() {
        this.game.player.frameX = 0;
        this.game.player.maxFrame = 0;
        this.game.player.frameY = 2; // Same as jump or separate fall sprite
    }
    handleInput(input) {
        if (this.game.player.onGround()) {
            this.game.player.setState(states.RUNNING, 1);
        }

        if (input.includes('ArrowLeft') || input.includes('a')) {
            this.game.player.speed = -this.game.player.maxSpeed * 0.5;
        } else if (input.includes('ArrowRight') || input.includes('d')) {
            this.game.player.speed = this.game.player.maxSpeed * 0.5;
        }
    }
}
