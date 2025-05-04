const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const distanceElement = document.getElementById('distance');
const levelElement = document.getElementById('level');
const specialAttackElement = document.getElementById('specialAttack');

// Game constants
const BALL_RADIUS = 20;
const GRAVITY = 0.5;
const JUMP_FORCE = -12;
const DOUBLE_JUMP_FORCE = -10;
const SLIDE_DURATION = 800; // Reduced from 1000
const OBSTACLE_SPEED = 7; // Increased from 5
const OBSTACLE_SPAWN_RATE = 1500; // Reduced from 2000
const BOUNCE_PAD_FORCE = -15;
const SPECIAL_ATTACK_COOLDOWN = 5000;
const SPECIAL_ATTACK_DISTANCE = 5000;
const RAMP_BOOST = -18; // Force for ramp jumps
const WALL_JUMP_FORCE = -10; // Force for wall jumps

// Game state
let ball = {
    x: 100,
    y: canvas.height - BALL_RADIUS,
    velocityY: 0,
    velocityX: 0,
    isJumping: false,
    canDoubleJump: false,
    isSliding: false,
    slideStartTime: 0,
    hasSpecialAttack: false,
    isWallSliding: false,
    wallJumpDirection: 0
};

let obstacles = [];
let ramps = [];
let walls = [];
let bouncePads = [];
let distance = 0;
let level = 1;
let lastObstacleTime = 0;
let gameSpeed = 1.2; // Increased base speed
let lastSpecialAttackTime = 0;

// Input handling
let keys = {
    up: false,
    down: false,
    space: false,
    left: false,
    right: false
};

document.addEventListener('keydown', (e) => {
    if ((e.key === 'ArrowUp' || e.key.toLowerCase() === 'w') && !ball.isSliding) {
        if (!ball.isJumping) {
            ball.isJumping = true;
            ball.canDoubleJump = true;
            ball.velocityY = JUMP_FORCE;
        } else if (ball.canDoubleJump) {
            ball.canDoubleJump = false;
            ball.velocityY = DOUBLE_JUMP_FORCE;
        } else if (ball.isWallSliding) {
            ball.isWallSliding = false;
            ball.velocityY = WALL_JUMP_FORCE;
            ball.velocityX = ball.wallJumpDirection * 5;
        }
    }
    if ((e.key === 'ArrowDown' || e.key.toLowerCase() === 's') && !ball.isJumping && !ball.isSliding) {
        ball.isSliding = true;
        ball.slideStartTime = Date.now();
    }
    if (e.key === ' ' && ball.hasSpecialAttack) {
        useSpecialAttack();
    }
    if (e.key === 'ArrowLeft' || e.key.toLowerCase() === 'a') {
        keys.left = true;
    }
    if (e.key === 'ArrowRight' || e.key.toLowerCase() === 'd') {
        keys.right = true;
    }
});

document.addEventListener('keyup', (e) => {
    if (e.key === 'ArrowLeft' || e.key.toLowerCase() === 'a') {
        keys.left = false;
    }
    if (e.key === 'ArrowRight' || e.key.toLowerCase() === 'd') {
        keys.right = false;
    }
});

// Ramp class
class Ramp {
    constructor(type) {
        this.type = type; // 'up' or 'down'
        this.x = canvas.width;
        this.width = 60;
        this.height = 30;
        this.y = canvas.height - this.height;
        this.angle = type === 'up' ? -Math.PI / 4 : Math.PI / 4;
    }

    update() {
        this.x -= OBSTACLE_SPEED * gameSpeed;
    }

    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);
        ctx.fillStyle = '#f39c12';
        ctx.fillRect(0, 0, this.width, this.height);
        ctx.restore();
    }
}

// Wall class
class Wall {
    constructor() {
        this.x = canvas.width;
        this.width = 20;
        this.height = 100;
        this.y = canvas.height - this.height;
    }

    update() {
        this.x -= OBSTACLE_SPEED * gameSpeed;
    }

    draw() {
        ctx.fillStyle = '#34495e';
        ctx.fillRect(this.x, this.y, this.width, this.height);
    }
}

// Bounce Pad class
class BouncePad {
    constructor() {
        this.x = canvas.width;
        this.width = 40;
        this.height = 10;
        this.y = canvas.height - this.height;
    }

    update() {
        this.x -= OBSTACLE_SPEED * gameSpeed;
    }

    draw() {
        ctx.fillStyle = '#2ecc71';
        ctx.fillRect(this.x, this.y, this.width, this.height);
    }
}

// Obstacle class
class Obstacle {
    constructor(type) {
        this.type = type; // 'jump', 'slide', 'breakable', or 'moving'
        this.x = canvas.width;
        this.width = 30;
        this.height = type === 'jump' ? 50 : (type === 'breakable' ? 40 : 20);
        this.y = canvas.height - this.height;
        this.isBreakable = type === 'breakable';
        this.isBroken = false;
        this.isMoving = type === 'moving';
        this.moveDirection = 1;
        this.moveDistance = 0;
        this.maxMoveDistance = 100;
    }

    update() {
        this.x -= OBSTACLE_SPEED * gameSpeed;
        if (this.isMoving) {
            this.y += this.moveDirection * 2;
            this.moveDistance += 2;
            if (this.moveDistance >= this.maxMoveDistance) {
                this.moveDirection *= -1;
                this.moveDistance = 0;
            }
        }
    }

    draw() {
        if (!this.isBroken) {
            ctx.fillStyle = this.isBreakable ? '#e74c3c' : (this.isMoving ? '#9b59b6' : '#333');
            ctx.fillRect(this.x, this.y, this.width, this.height);
        }
    }
}

function spawnObstacle() {
    const currentTime = Date.now();
    if (currentTime - lastObstacleTime > OBSTACLE_SPAWN_RATE / gameSpeed) {
        let type;
        const random = Math.random();
        if (random < 0.3) type = 'jump';
        else if (random < 0.6) type = 'slide';
        else if (random < 0.8) type = 'breakable';
        else type = 'moving';
        
        obstacles.push(new Obstacle(type));
        lastObstacleTime = currentTime;
    }
}

function spawnRamp() {
    const currentTime = Date.now();
    if (currentTime - lastObstacleTime > OBSTACLE_SPAWN_RATE * 2 / gameSpeed) {
        const type = Math.random() < 0.5 ? 'up' : 'down';
        ramps.push(new Ramp(type));
    }
}

function spawnWall() {
    const currentTime = Date.now();
    if (currentTime - lastObstacleTime > OBSTACLE_SPAWN_RATE * 3 / gameSpeed) {
        walls.push(new Wall());
    }
}

function useSpecialAttack() {
    const currentTime = Date.now();
    if (currentTime - lastSpecialAttackTime > SPECIAL_ATTACK_COOLDOWN) {
        obstacles.forEach(obstacle => {
            if (obstacle.isBreakable && !obstacle.isBroken) {
                obstacle.isBroken = true;
            }
        });
        ball.hasSpecialAttack = false;
        specialAttackElement.textContent = 'Ready in: 5s';
        lastSpecialAttackTime = currentTime;
    }
}

function update() {
    // Update ball position
    if (ball.isJumping) {
        ball.velocityY += GRAVITY;
        ball.y += ball.velocityY;
        ball.x += ball.velocityX;

        if (ball.y > canvas.height - BALL_RADIUS) {
            ball.y = canvas.height - BALL_RADIUS;
            ball.isJumping = false;
            ball.velocityY = 0;
            ball.velocityX = 0;
            ball.canDoubleJump = false;
        }
    }

    // Update slide state
    if (ball.isSliding && Date.now() - ball.slideStartTime > SLIDE_DURATION) {
        ball.isSliding = false;
    }

    // Update obstacles
    obstacles.forEach((obstacle, index) => {
        obstacle.update();
        if (obstacle.x + obstacle.width < 0) {
            obstacles.splice(index, 1);
        }
    });

    // Update ramps
    ramps.forEach((ramp, index) => {
        ramp.update();
        if (ramp.x + ramp.width < 0) {
            ramps.splice(index, 1);
        }
    });

    // Update walls
    walls.forEach((wall, index) => {
        wall.update();
        if (wall.x + wall.width < 0) {
            walls.splice(index, 1);
        }
    });

    // Spawn new elements
    spawnObstacle();
    spawnRamp();
    spawnWall();

    // Update distance and level
    distance += gameSpeed;
    distanceElement.textContent = Math.floor(distance);
    
    const newLevel = Math.floor(distance / 1000) + 1;
    if (newLevel > level) {
        level = newLevel;
        levelElement.textContent = level;
        gameSpeed = 1.2 + (level - 1) * 0.3; // Increased speed progression
    }

    // Update special attack
    if (Math.floor(distance) % SPECIAL_ATTACK_DISTANCE === 0) {
        ball.hasSpecialAttack = true;
        specialAttackElement.textContent = 'Special Attack Ready! (Press Space)';
    }

    // Update special attack cooldown
    if (!ball.hasSpecialAttack) {
        const cooldownLeft = Math.ceil((SPECIAL_ATTACK_COOLDOWN - (Date.now() - lastSpecialAttackTime)) / 1000);
        if (cooldownLeft > 0) {
            specialAttackElement.textContent = `Ready in: ${cooldownLeft}s`;
        }
    }

    // Check collisions
    checkCollisions();
}

function checkCollisions() {
    const ballBottom = ball.y + BALL_RADIUS;
    const ballTop = ball.y - BALL_RADIUS;
    const ballLeft = ball.x - BALL_RADIUS;
    const ballRight = ball.x + BALL_RADIUS;

    // Check ramp collisions
    for (const ramp of ramps) {
        if (ballBottom > ramp.y && ballTop < ramp.y + ramp.height &&
            ballRight > ramp.x && ballLeft < ramp.x + ramp.width) {
            if (ramp.type === 'up') {
                ball.velocityY = RAMP_BOOST;
                ball.isJumping = true;
                ball.canDoubleJump = true;
            }
        }
    }

    // Check wall collisions
    ball.isWallSliding = false;
    for (const wall of walls) {
        if (ballRight > wall.x && ballLeft < wall.x + wall.width &&
            ballBottom > wall.y && ballTop < wall.y + wall.height) {
            ball.isWallSliding = true;
            ball.wallJumpDirection = ball.x < wall.x ? 1 : -1;
            ball.velocityY = 0;
            ball.velocityX = 0;
        }
    }

    // Check obstacle collisions
    for (const obstacle of obstacles) {
        if (ballRight > obstacle.x && ballLeft < obstacle.x + obstacle.width) {
            if (obstacle.type === 'jump' && ballBottom > obstacle.y) {
                if (!ball.isJumping || ballBottom - ball.velocityY > obstacle.y) {
                    gameOver();
                }
            } else if (obstacle.type === 'slide' && ballBottom > obstacle.y && !ball.isSliding) {
                gameOver();
            } else if (obstacle.isBreakable && !obstacle.isBroken && ballBottom > obstacle.y) {
                gameOver();
            } else if (obstacle.isMoving && ballBottom > obstacle.y) {
                gameOver();
            }
        }
    }
}

function gameOver() {
    alert(`Game Over! You ran ${Math.floor(distance)} meters and reached level ${level}!`);
    resetGame();
}

function resetGame() {
    ball = {
        x: 100,
        y: canvas.height - BALL_RADIUS,
        velocityY: 0,
        velocityX: 0,
        isJumping: false,
        canDoubleJump: false,
        isSliding: false,
        slideStartTime: 0,
        hasSpecialAttack: false,
        isWallSliding: false,
        wallJumpDirection: 0
    };
    obstacles = [];
    ramps = [];
    walls = [];
    distance = 0;
    level = 1;
    gameSpeed = 1.2;
    distanceElement.textContent = '0';
    levelElement.textContent = '1';
    specialAttackElement.textContent = 'Special Attack: Not Ready';
}

function draw() {
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw ball
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, BALL_RADIUS, 0, Math.PI * 2);
    ctx.fillStyle = '#3498db';
    ctx.fill();
    ctx.closePath();

    // Draw obstacles
    obstacles.forEach(obstacle => obstacle.draw());

    // Draw ramps
    ramps.forEach(ramp => ramp.draw());

    // Draw walls
    walls.forEach(wall => wall.draw());
}

function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

// Start the game
gameLoop(); 