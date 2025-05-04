const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const levelDisplay = document.getElementById('level');
const scoreDisplay = document.getElementById('score');
const progressBar = document.getElementById('progressBar');
const restartButton = document.getElementById('restartButton');

// Game constants
const PADDLE_WIDTH = 15;
const PADDLE_HEIGHT = 100;
const BALL_SIZE = 10;
const PADDLE_SPEED = 8;
const INITIAL_BALL_SPEED = 5;
const MAX_LEVEL = 10;

// Game state
let level = 1;
let score = 0;
let gameOver = false;

// Paddle objects
const playerPaddle = {
    x: 20,
    y: canvas.height / 2 - PADDLE_HEIGHT / 2,
    width: PADDLE_WIDTH,
    height: PADDLE_HEIGHT,
    dy: 0
};

const aiPaddle = {
    x: canvas.width - 20 - PADDLE_WIDTH,
    y: canvas.height / 2 - PADDLE_HEIGHT / 2,
    width: PADDLE_WIDTH,
    height: PADDLE_HEIGHT,
    dy: 0
};

// Ball object
const ball = {
    x: canvas.width / 2,
    y: canvas.height / 2,
    size: BALL_SIZE,
    dx: INITIAL_BALL_SPEED,
    dy: INITIAL_BALL_SPEED
};

// Key states
const keys = {
    w: false,
    s: false,
    ArrowUp: false,
    ArrowDown: false
};

// Event listeners
document.addEventListener('keydown', (e) => {
    if (e.key in keys) {
        keys[e.key] = true;
    }
});

document.addEventListener('keyup', (e) => {
    if (e.key in keys) {
        keys[e.key] = false;
    }
});

// Restart button event listener
restartButton.addEventListener('click', () => {
    resetGame();
});

// Reset game state
function resetGame() {
    level = 1;
    score = 0;
    gameOver = false;
    levelDisplay.textContent = level;
    scoreDisplay.textContent = score;
    updateProgressBar();
    resetBall();
    resetPaddles();
}

// Reset paddles to initial positions
function resetPaddles() {
    playerPaddle.y = canvas.height / 2 - PADDLE_HEIGHT / 2;
    aiPaddle.y = canvas.height / 2 - PADDLE_HEIGHT / 2;
}

// Update progress bar
function updateProgressBar() {
    const progress = ((level - 1) / (MAX_LEVEL - 1)) * 100;
    progressBar.style.width = `${progress}%`;
}

// AI difficulty based on level
function getAIDifficulty() {
    return 0.3 + (level - 1) * 0.07; // Increases from 0.3 to 0.93
}

// Update game state
function update() {
    if (gameOver) return;

    // Move player paddle
    if ((keys.w || keys.ArrowUp) && playerPaddle.y > 0) {
        playerPaddle.y -= PADDLE_SPEED;
    }
    if ((keys.s || keys.ArrowDown) && playerPaddle.y < canvas.height - playerPaddle.height) {
        playerPaddle.y += PADDLE_SPEED;
    }

    // AI paddle movement
    const aiDifficulty = getAIDifficulty();
    const aiCenter = aiPaddle.y + aiPaddle.height / 2;
    const ballCenter = ball.y + ball.size / 2;
    
    if (aiCenter < ballCenter - 10) {
        aiPaddle.y += PADDLE_SPEED * aiDifficulty;
    } else if (aiCenter > ballCenter + 10) {
        aiPaddle.y -= PADDLE_SPEED * aiDifficulty;
    }

    // Keep AI paddle in bounds
    if (aiPaddle.y < 0) aiPaddle.y = 0;
    if (aiPaddle.y > canvas.height - aiPaddle.height) {
        aiPaddle.y = canvas.height - aiPaddle.height;
    }

    // Move ball
    ball.x += ball.dx;
    ball.y += ball.dy;

    // Ball collision with top and bottom
    if (ball.y <= 0 || ball.y + ball.size >= canvas.height) {
        ball.dy = -ball.dy;
    }

    // Ball collision with paddles
    if (ball.dx < 0) {
        if (ball.x <= playerPaddle.x + playerPaddle.width &&
            ball.y + ball.size >= playerPaddle.y &&
            ball.y <= playerPaddle.y + playerPaddle.height) {
            ball.dx = -ball.dx;
            ball.dx += 0.5; // Increase speed slightly
            ball.dy += (ball.y - (playerPaddle.y + playerPaddle.height/2)) * 0.1;
            score++;
            scoreDisplay.textContent = score;
        }
    } else {
        if (ball.x + ball.size >= aiPaddle.x &&
            ball.y + ball.size >= aiPaddle.y &&
            ball.y <= aiPaddle.y + aiPaddle.height) {
            ball.dx = -ball.dx;
            ball.dx -= 0.5; // Increase speed slightly
            ball.dy += (ball.y - (aiPaddle.y + aiPaddle.height/2)) * 0.1;
        }
    }

    // Check for scoring
    if (ball.x <= 0) {
        resetBall();
        gameOver = true;
        alert(`Game Over! Final Score: ${score}`);
    } else if (ball.x + ball.size >= canvas.width) {
        resetBall();
        level++;
        if (level > MAX_LEVEL) {
            gameOver = true;
            alert(`Congratulations! You've completed all levels! Final Score: ${score}`);
        } else {
            levelDisplay.textContent = level;
            updateProgressBar();
        }
    }
}

// Reset ball position
function resetBall() {
    ball.x = canvas.width / 2;
    ball.y = canvas.height / 2;
    ball.dx = INITIAL_BALL_SPEED + (level - 1) * 0.5;
    ball.dy = INITIAL_BALL_SPEED + (level - 1) * 0.5;
    if (Math.random() < 0.5) ball.dx = -ball.dx;
    if (Math.random() < 0.5) ball.dy = -ball.dy;
}

// Draw game objects
function draw() {
    // Clear canvas
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw paddles
    ctx.fillStyle = '#fff';
    ctx.fillRect(playerPaddle.x, playerPaddle.y, playerPaddle.width, playerPaddle.height);
    ctx.fillRect(aiPaddle.x, aiPaddle.y, aiPaddle.width, aiPaddle.height);

    // Draw ball
    ctx.beginPath();
    ctx.arc(ball.x + ball.size/2, ball.y + ball.size/2, ball.size/2, 0, Math.PI * 2);
    ctx.fillStyle = '#fff';
    ctx.fill();
    ctx.closePath();

    // Draw center line
    ctx.setLineDash([10, 10]);
    ctx.beginPath();
    ctx.moveTo(canvas.width/2, 0);
    ctx.lineTo(canvas.width/2, canvas.height);
    ctx.strokeStyle = '#fff';
    ctx.stroke();
    ctx.setLineDash([]);
}

// Game loop
function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

// Start the game
resetGame();
gameLoop(); 