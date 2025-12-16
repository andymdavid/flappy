// Canvas setup
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Game states
const GameState = {
    START: 'START',
    PLAYING: 'PLAYING',
    GAME_OVER: 'GAME_OVER'
};

// Current game state
let currentState = GameState.START;
console.log('Game initialized with state:', currentState);

// Physics constants
const GRAVITY = 0.5;
const JUMP_VELOCITY = -9;
const TERMINAL_VELOCITY = 10;

// Bird object
const bird = {
    x: 100,
    y: 0, // Will be set to center in init()
    velocity: 0,
    width: 34,
    height: 24,
    rotation: 0, // Current rotation in degrees
    color: '#FFD700', // Yellow/gold color
    beakColor: '#FF8C00' // Orange beak
};

// Ground object
const ground = {
    height: 100,
    grassHeight: 20,
    dirtHeight: 80,
    grassColor: '#90EE90',
    dirtColor: '#DEB887',
    y: 0 // Will be set in init()
};

// Collision flash effect
let collisionFlash = {
    active: false,
    duration: 200, // milliseconds
    startTime: 0
};

// FPS tracking
let lastTime = 0;
let fps = 0;
let frameCount = 0;
let fpsUpdateTime = 0;

/**
 * Change game state and log the transition
 */
function changeState(newState) {
    console.log(`State change: ${currentState} -> ${newState}`);
    currentState = newState;
}

/**
 * Update FPS counter
 */
function updateFPS(currentTime) {
    frameCount++;

    // Update FPS every 500ms
    if (currentTime - fpsUpdateTime >= 500) {
        fps = Math.round((frameCount * 1000) / (currentTime - fpsUpdateTime));
        frameCount = 0;
        fpsUpdateTime = currentTime;
    }
}

/**
 * Render FPS counter in top-left corner
 */
function renderFPS() {
    ctx.fillStyle = '#000';
    ctx.font = '16px Arial';
    ctx.fillText(`FPS: ${fps}`, 10, 20);
}

/**
 * Handle bird jump
 */
function jump() {
    // Start game if in START state
    if (currentState === GameState.START) {
        changeState(GameState.PLAYING);
    }

    // Apply jump velocity when in PLAYING state
    if (currentState === GameState.PLAYING) {
        bird.velocity = JUMP_VELOCITY;
    }
}

/**
 * Get bird's hitbox for collision detection (85% of visual size)
 */
function getBirdHitbox() {
    const hitboxScale = 0.85;
    const hitboxWidth = bird.width * hitboxScale;
    const hitboxHeight = bird.height * hitboxScale;
    const offsetX = (bird.width - hitboxWidth) / 2;
    const offsetY = (bird.height - hitboxHeight) / 2;

    return {
        x: bird.x + offsetX,
        y: bird.y + offsetY,
        width: hitboxWidth,
        height: hitboxHeight
    };
}

/**
 * Check for collisions
 */
function checkCollisions() {
    const hitbox = getBirdHitbox();

    // Check collision with ground
    if (hitbox.y + hitbox.height >= ground.y) {
        console.log('Hit ground');
        changeState(GameState.GAME_OVER);
        collisionFlash.active = true;
        collisionFlash.startTime = performance.now();
        // Position bird exactly on ground
        bird.y = ground.y - hitbox.height - (bird.height - hitbox.height) / 2;
        bird.velocity = 0;
        return true;
    }

    // Check collision with ceiling (top of screen)
    if (hitbox.y <= 0) {
        console.log('Hit ceiling');
        changeState(GameState.GAME_OVER);
        collisionFlash.active = true;
        collisionFlash.startTime = performance.now();
        // Position bird at top
        bird.y = -(bird.height - hitbox.height) / 2;
        bird.velocity = 0;
        return true;
    }

    return false;
}

/**
 * Update bird physics
 */
function updateBird() {
    // Only apply physics when playing
    if (currentState === GameState.PLAYING) {
        // Apply gravity
        bird.velocity += GRAVITY;

        // Apply terminal velocity
        if (bird.velocity > TERMINAL_VELOCITY) {
            bird.velocity = TERMINAL_VELOCITY;
        }

        // Update position
        bird.y += bird.velocity;

        // Update rotation based on velocity
        // Map velocity to rotation: negative velocity (going up) = tilt up, positive = tilt down
        // Velocity ranges roughly from -9 (jump) to +10 (terminal)
        // Rotation ranges from -30° to +90°
        if (bird.velocity < 0) {
            // Going up - tilt upward
            bird.rotation = Math.max(-30, bird.velocity * 3);
        } else {
            // Falling - tilt downward
            bird.rotation = Math.min(90, bird.velocity * 6);
        }

        // Check for collisions
        checkCollisions();
    } else if (currentState === GameState.START) {
        // Reset rotation in start state
        bird.rotation = 0;
    }
}

/**
 * Update game logic
 */
function update(deltaTime) {
    // Game logic will go here based on currentState
    switch (currentState) {
        case GameState.START:
            // Start screen logic - bird stays at center
            break;
        case GameState.PLAYING:
            // Update bird physics
            updateBird();
            break;
        case GameState.GAME_OVER:
            // Game over logic
            break;
    }
}

/**
 * Render game graphics
 */
function render() {
    // Clear canvas (background is already light blue via CSS)
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Render based on current state
    switch (currentState) {
        case GameState.START:
            renderStartScreen();
            break;
        case GameState.PLAYING:
            renderGame();
            break;
        case GameState.GAME_OVER:
            renderGameOver();
            break;
    }

    // Render collision flash effect
    if (collisionFlash.active) {
        const elapsed = performance.now() - collisionFlash.startTime;
        if (elapsed < collisionFlash.duration) {
            // Calculate alpha based on elapsed time (fade out)
            const alpha = 0.5 * (1 - elapsed / collisionFlash.duration);
            ctx.fillStyle = `rgba(255, 0, 0, ${alpha})`;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        } else {
            collisionFlash.active = false;
        }
    }

    // Always render FPS counter
    renderFPS();
}

/**
 * Render the ground
 */
function renderGround() {
    // Draw dirt layer
    ctx.fillStyle = ground.dirtColor;
    ctx.fillRect(0, ground.y + ground.grassHeight, canvas.width, ground.dirtHeight);

    // Draw grass layer
    ctx.fillStyle = ground.grassColor;
    ctx.fillRect(0, ground.y, canvas.width, ground.grassHeight);

    // Add grass texture with simple vertical stripes
    ctx.strokeStyle = '#7FD87F'; // Darker green for stripes
    ctx.lineWidth = 2;
    for (let x = 0; x < canvas.width; x += 8) {
        ctx.beginPath();
        ctx.moveTo(x, ground.y);
        ctx.lineTo(x, ground.y + ground.grassHeight);
        ctx.stroke();
    }
}

/**
 * Render the bird
 */
function renderBird() {
    ctx.save();

    // Move to bird's center for rotation
    const centerX = bird.x + bird.width / 2;
    const centerY = bird.y + bird.height / 2;
    ctx.translate(centerX, centerY);

    // Apply rotation (convert degrees to radians)
    ctx.rotate((bird.rotation * Math.PI) / 180);

    // Draw bird body (circle)
    ctx.fillStyle = bird.color;
    ctx.beginPath();
    ctx.arc(0, 0, bird.width / 2, 0, Math.PI * 2);
    ctx.fill();

    // Draw beak (triangle pointing right)
    ctx.fillStyle = bird.beakColor;
    ctx.beginPath();
    ctx.moveTo(bird.width / 2, 0);           // Tip of beak
    ctx.lineTo(bird.width / 4, -6);          // Top of beak
    ctx.lineTo(bird.width / 4, 6);           // Bottom of beak
    ctx.closePath();
    ctx.fill();

    // Draw eye (small white circle with black pupil)
    ctx.fillStyle = '#FFF';
    ctx.beginPath();
    ctx.arc(bird.width / 6, -4, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(bird.width / 6 + 1, -4, 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
}

/**
 * Render start screen
 */
function renderStartScreen() {
    // Render the ground
    renderGround();

    // Render the bird
    renderBird();

    // Render instructions
    ctx.fillStyle = '#000';
    ctx.font = '24px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Press SPACE to Start', canvas.width / 2, canvas.height / 2);
    ctx.textAlign = 'left';
}

/**
 * Render game
 */
function renderGame() {
    // Render the ground
    renderGround();

    // Render the bird
    renderBird();
}

/**
 * Render game over screen
 */
function renderGameOver() {
    // Render the ground
    renderGround();

    // Render the bird
    renderBird();

    // Render game over text
    ctx.fillStyle = '#000';
    ctx.font = '24px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Game Over!', canvas.width / 2, canvas.height / 2);
    ctx.font = '16px Arial';
    ctx.fillText('Press SPACE to Restart', canvas.width / 2, canvas.height / 2 + 30);
    ctx.textAlign = 'left';
}

/**
 * Main game loop - runs at 60 FPS
 */
function gameLoop(currentTime) {
    // Calculate delta time in seconds
    const deltaTime = (currentTime - lastTime) / 1000;
    lastTime = currentTime;

    // Update FPS counter
    updateFPS(currentTime);

    // Update and render
    update(deltaTime);
    render();

    // Request next frame
    requestAnimationFrame(gameLoop);
}

/**
 * Setup input event listeners
 */
function setupInput() {
    // Spacebar key handler
    document.addEventListener('keydown', (e) => {
        if (e.code === 'Space') {
            e.preventDefault(); // Prevent page scroll
            jump();
        }
    });

    // Mouse click handler
    canvas.addEventListener('click', () => {
        jump();
    });
}

/**
 * Initialize the game
 */
function init() {
    console.log('Game starting...');

    // Position ground at bottom of canvas
    ground.y = canvas.height - ground.height;

    // Position bird at center of canvas
    bird.y = canvas.height / 2 - bird.height / 2;

    // Setup input handlers
    setupInput();

    // Start the game loop
    requestAnimationFrame((time) => {
        lastTime = time;
        fpsUpdateTime = time;
        gameLoop(time);
    });
}

// Start the game when the page loads
init();
