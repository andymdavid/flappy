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

// Pipe constants
const PIPE_WIDTH = 52;
const PIPE_GAP = 150;
const PIPE_COLOR = '#5DBE64';
const PIPE_BORDER_COLOR = '#2D5F2E';
const PIPE_LIP_HEIGHT = 30;
const PIPE_LIP_EXTENSION = 4; // Extra width on each side for the lip
const PIPE_SPEED = 2.5; // Pixels per frame
const PIPE_SPACING = 300; // Horizontal spacing between pipes
const GAP_MIN_Y = 125; // Minimum gap center Y position
const GAP_MAX_Y = 475; // Maximum gap center Y position

// Pipes array - each pipe is a pair (top and bottom)
let pipes = [];

// Score tracking
let score = 0;
let highScore = 0;
let newRecord = false;
let scoreAnimation = {
    active: false,
    startTime: 0,
    duration: 300 // milliseconds
};
let newRecordAnimation = {
    active: false,
    startTime: 0,
    duration: 2000 // milliseconds
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
 * Load high score from localStorage
 */
function loadHighScore() {
    const saved = localStorage.getItem('flappyBirdHighScore');
    if (saved !== null) {
        highScore = parseInt(saved, 10);
        console.log('Loaded high score:', highScore);
    }
}

/**
 * Save high score to localStorage
 */
function saveHighScore() {
    localStorage.setItem('flappyBirdHighScore', highScore.toString());
    console.log('Saved high score:', highScore);
}

/**
 * Change game state and log the transition
 */
function changeState(newState) {
    console.log(`State change: ${currentState} -> ${newState}`);

    // Check for high score when entering GAME_OVER state
    if (newState === GameState.GAME_OVER && currentState === GameState.PLAYING) {
        if (score > highScore) {
            highScore = score;
            newRecord = true;
            saveHighScore();

            // Trigger new record animation
            newRecordAnimation.active = true;
            newRecordAnimation.startTime = performance.now();

            console.log('NEW RECORD!', highScore);
        }
    }

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
 * Render score at top-center
 */
function renderScore() {
    // Calculate scale for animation effect
    let scale = 1.0;
    if (scoreAnimation.active) {
        const elapsed = performance.now() - scoreAnimation.startTime;
        if (elapsed < scoreAnimation.duration) {
            // Scale up and back down (1.0 -> 1.5 -> 1.0)
            const progress = elapsed / scoreAnimation.duration;
            if (progress < 0.5) {
                // First half: scale up
                scale = 1.0 + (progress * 2) * 0.5;
            } else {
                // Second half: scale down
                scale = 1.5 - ((progress - 0.5) * 2) * 0.5;
            }
        } else {
            scoreAnimation.active = false;
        }
    }

    ctx.save();

    // Move to center top for score
    ctx.translate(canvas.width / 2, 60);
    ctx.scale(scale, scale);

    // Draw black outline for score
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 4;
    ctx.font = 'bold 48px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.strokeText(score.toString(), 0, 0);

    // Draw white fill for score
    ctx.fillStyle = '#FFF';
    ctx.fillText(score.toString(), 0, 0);

    ctx.restore();
}

/**
 * Reset game state for a new game
 */
function resetGame() {
    // Reset bird
    bird.y = canvas.height / 2 - bird.height / 2;
    bird.velocity = 0;
    bird.rotation = 0;

    // Reset score
    score = 0;
    newRecord = false;
    scoreAnimation.active = false;
    newRecordAnimation.active = false;

    // Clear and recreate pipes
    pipes = [];
    createPipe(400);
    createPipe(400 + PIPE_SPACING);

    // Transition to PLAYING state
    changeState(GameState.PLAYING);
}

/**
 * Handle bird jump
 */
function jump() {
    // Start game if in START state
    if (currentState === GameState.START) {
        changeState(GameState.PLAYING);
    } else if (currentState === GameState.GAME_OVER) {
        // Restart game if in GAME_OVER state
        resetGame();
        return;
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

    // Check collision with pipes
    for (let pipe of pipes) {
        // Calculate gap boundaries
        const gapTop = pipe.gapCenterY - PIPE_GAP / 2;
        const gapBottom = pipe.gapCenterY + PIPE_GAP / 2;

        // Check if bird's hitbox overlaps with pipe horizontally
        const horizontalOverlap =
            hitbox.x < pipe.x + PIPE_WIDTH &&
            hitbox.x + hitbox.width > pipe.x;

        if (horizontalOverlap) {
            // Check collision with top pipe
            const hitTopPipe = hitbox.y < gapTop;

            // Check collision with bottom pipe
            const hitBottomPipe = hitbox.y + hitbox.height > gapBottom;

            if (hitTopPipe || hitBottomPipe) {
                console.log('Hit pipe');
                changeState(GameState.GAME_OVER);
                collisionFlash.active = true;
                collisionFlash.startTime = performance.now();
                bird.velocity = 0;
                return true;
            }
        }
    }

    return false;
}

/**
 * Create a new pipe at the specified x position
 */
function createPipe(x) {
    // Random gap center Y between GAP_MIN_Y and GAP_MAX_Y
    const gapCenterY = Math.random() * (GAP_MAX_Y - GAP_MIN_Y) + GAP_MIN_Y;

    pipes.push({
        x: x,
        gapCenterY: gapCenterY,
        scored: false // Track if this pipe has been scored
    });
}

/**
 * Update score when bird passes pipes
 */
function updateScore() {
    const birdCenterX = bird.x + bird.width / 2;

    pipes.forEach(pipe => {
        const pipeRightEdge = pipe.x + PIPE_WIDTH;

        // Check if bird's center has passed the pipe's right edge
        if (!pipe.scored && birdCenterX > pipeRightEdge) {
            pipe.scored = true;
            score++;

            // Trigger score animation
            scoreAnimation.active = true;
            scoreAnimation.startTime = performance.now();

            console.log('Score:', score);
        }
    });
}

/**
 * Update pipes (movement and spawning)
 */
function updatePipes() {
    // Move pipes left
    pipes.forEach(pipe => {
        pipe.x -= PIPE_SPEED;
    });

    // Remove pipes that have moved off-screen
    pipes = pipes.filter(pipe => {
        const pipeRightEdge = pipe.x + PIPE_WIDTH;
        return pipeRightEdge >= 0;
    });

    // Spawn new pipe when needed
    if (pipes.length > 0) {
        const rightmostPipe = pipes[pipes.length - 1];
        // If the rightmost pipe has moved far enough left, spawn a new one
        if (rightmostPipe.x < canvas.width - PIPE_SPACING) {
            createPipe(canvas.width);
        }
    } else {
        // If no pipes exist, create one
        createPipe(canvas.width);
    }
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
            // Update pipes
            updatePipes();

            // Update score
            updateScore();

            // Update bird physics
            updateBird();
            break;
        case GameState.GAME_OVER:
            // Game over logic - pipes and bird stop moving
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

    // Render score (in PLAYING and GAME_OVER states)
    if (currentState === GameState.PLAYING || currentState === GameState.GAME_OVER) {
        renderScore();
    }

    // Always render FPS counter
    renderFPS();
}

/**
 * Render a single pipe (top or bottom)
 */
function renderPipe(x, topY, bottomY) {
    const pipeBodyWidth = PIPE_WIDTH;
    const lipWidth = PIPE_WIDTH + (PIPE_LIP_EXTENSION * 2);

    // Draw pipe body
    ctx.fillStyle = PIPE_COLOR;
    ctx.fillRect(x, topY, pipeBodyWidth, bottomY - topY);

    // Draw pipe border
    ctx.strokeStyle = PIPE_BORDER_COLOR;
    ctx.lineWidth = 3;
    ctx.strokeRect(x, topY, pipeBodyWidth, bottomY - topY);

    // Draw lip/cap at the bottom edge of the section
    const lipY = bottomY - PIPE_LIP_HEIGHT;
    const lipX = x - PIPE_LIP_EXTENSION;

    // Lip fill
    ctx.fillStyle = PIPE_COLOR;
    ctx.fillRect(lipX, lipY, lipWidth, PIPE_LIP_HEIGHT);

    // Lip border
    ctx.strokeStyle = PIPE_BORDER_COLOR;
    ctx.lineWidth = 3;
    ctx.strokeRect(lipX, lipY, lipWidth, PIPE_LIP_HEIGHT);

    // Add 3D highlight effect on left side of lip
    ctx.strokeStyle = '#7FD87F';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(lipX + 2, lipY);
    ctx.lineTo(lipX + 2, lipY + PIPE_LIP_HEIGHT);
    ctx.stroke();
}

/**
 * Render all pipes
 */
function renderPipes() {
    pipes.forEach(pipe => {
        // Calculate gap boundaries
        const gapTop = pipe.gapCenterY - PIPE_GAP / 2;
        const gapBottom = pipe.gapCenterY + PIPE_GAP / 2;

        // Render top pipe (from top of canvas to gap top)
        renderPipe(pipe.x, 0, gapTop);

        // Render bottom pipe (from gap bottom to ground)
        renderPipe(pipe.x, gapBottom, ground.y);
    });
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
    // Render pipes
    renderPipes();

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
    // Render pipes
    renderPipes();

    // Render the ground
    renderGround();

    // Render the bird
    renderBird();
}

/**
 * Render game over screen
 */
function renderGameOver() {
    // Render pipes
    renderPipes();

    // Render the ground
    renderGround();

    // Render the bird
    renderBird();

    // Render game over text
    ctx.fillStyle = '#000';
    ctx.font = 'bold 32px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Game Over!', canvas.width / 2, canvas.height / 2 - 60);

    // Render current score label and value
    ctx.font = '20px Arial';
    ctx.fillText('Score', canvas.width / 2, canvas.height / 2 - 10);
    ctx.font = 'bold 32px Arial';
    ctx.fillText(score.toString(), canvas.width / 2, canvas.height / 2 + 25);

    // Render high score label and value
    ctx.font = '20px Arial';
    ctx.fillText('Best', canvas.width / 2, canvas.height / 2 + 60);
    ctx.font = 'bold 32px Arial';
    ctx.fillText(highScore.toString(), canvas.width / 2, canvas.height / 2 + 95);

    // Render "NEW RECORD!" message if applicable
    if (newRecord && newRecordAnimation.active) {
        const elapsed = performance.now() - newRecordAnimation.startTime;
        if (elapsed < newRecordAnimation.duration) {
            // Calculate alpha for fade out effect
            const fadeStart = newRecordAnimation.duration * 0.7; // Start fading at 70%
            let alpha = 1.0;
            if (elapsed > fadeStart) {
                alpha = 1.0 - ((elapsed - fadeStart) / (newRecordAnimation.duration - fadeStart));
            }

            // Pulsing scale effect
            const scale = 1.0 + Math.sin((elapsed / 200) * Math.PI) * 0.1;

            ctx.save();
            ctx.translate(canvas.width / 2, canvas.height / 2 + 130);
            ctx.scale(scale, scale);

            // Draw "NEW RECORD!" with outline
            ctx.strokeStyle = `rgba(0, 0, 0, ${alpha})`;
            ctx.lineWidth = 3;
            ctx.font = 'bold 24px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.strokeText('NEW RECORD!', 0, 0);

            ctx.fillStyle = `rgba(255, 215, 0, ${alpha})`; // Gold color
            ctx.fillText('NEW RECORD!', 0, 0);

            ctx.restore();
        } else {
            newRecordAnimation.active = false;
        }
    }

    // Render restart instruction
    ctx.fillStyle = '#000';
    ctx.font = '16px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Press SPACE to Restart', canvas.width / 2, canvas.height / 2 + 170);
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

    // Load high score from localStorage
    loadHighScore();

    // Position ground at bottom of canvas
    ground.y = canvas.height - ground.height;

    // Position bird at center of canvas
    bird.y = canvas.height / 2 - bird.height / 2;

    // Create initial pipes - 2 pipe pairs on screen
    createPipe(400);
    createPipe(400 + PIPE_SPACING);

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
