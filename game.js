// Canvas setup
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Audio setup
let audioContext;
let audioEnabled = true; // Can be toggled by user

/**
 * Initialize audio context (lazy initialization to avoid autoplay restrictions)
 */
function initAudio() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    return audioContext;
}

/**
 * Play jump sound - short ascending "whoosh" effect
 */
function playJumpSound() {
    if (!audioEnabled) return;

    try {
        const ctx = initAudio();
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);

        // Short ascending tone (150Hz -> 300Hz)
        oscillator.frequency.setValueAtTime(150, ctx.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.1);

        // Quick fade out
        gainNode.gain.setValueAtTime(0.15, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);

        oscillator.type = 'sine';
        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + 0.1);
    } catch (e) {
        console.log('Audio playback failed:', e);
    }
}

/**
 * Play score sound - pleasant "coin" chime
 */
function playScoreSound() {
    if (!audioEnabled) return;

    try {
        const ctx = initAudio();

        // Create two oscillators for a pleasant chime effect
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gainNode = ctx.createGain();

        osc1.connect(gainNode);
        osc2.connect(gainNode);
        gainNode.connect(ctx.destination);

        // Pleasant major third interval (C and E notes)
        osc1.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
        osc2.frequency.setValueAtTime(659.25, ctx.currentTime); // E5

        // Bell-like envelope
        gainNode.gain.setValueAtTime(0.2, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);

        osc1.type = 'sine';
        osc2.type = 'sine';

        osc1.start(ctx.currentTime);
        osc2.start(ctx.currentTime);
        osc1.stop(ctx.currentTime + 0.3);
        osc2.stop(ctx.currentTime + 0.3);
    } catch (e) {
        console.log('Audio playback failed:', e);
    }
}

/**
 * Play death sound - deep thud with impact
 */
function playDeathSound() {
    if (!audioEnabled) return;

    try {
        const ctx = initAudio();

        // Create a deep bass thud
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();
        const filter = ctx.createBiquadFilter();

        oscillator.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(ctx.destination);

        // Very low frequency for deep thud (100Hz -> 30Hz)
        oscillator.frequency.setValueAtTime(100, ctx.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(30, ctx.currentTime + 0.15);

        // Low-pass filter for muffled thud sound
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(200, ctx.currentTime);
        filter.Q.setValueAtTime(1, ctx.currentTime);

        // Sharp attack, very quick decay for impact
        gainNode.gain.setValueAtTime(0.4, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);

        oscillator.type = 'sine'; // Smooth sine wave for clean thud
        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + 0.15);
    } catch (e) {
        console.log('Audio playback failed:', e);
    }
}

// Background image
const backgroundImage = new Image();
let backgroundLoaded = false;
let backgroundX = 0; // Current scroll position
const BACKGROUND_SPEED = 0.3; // Very slow parallax scroll (distant background)

// Load background image
backgroundImage.onload = () => {
    backgroundLoaded = true;
    console.log('Background image loaded successfully');
    console.log(`Background dimensions: ${backgroundImage.width}x${backgroundImage.height}`);
};
backgroundImage.onerror = () => {
    console.log('Background image failed to load - using default background');
    backgroundLoaded = false;
};
// Set the background image source
backgroundImage.src = 'images/background.png';

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
    beakColor: '#FF8C00', // Orange beak
    // Animation properties
    animationFrame: 0, // Current frame (0, 1, or 2)
    animationCounter: 0, // Counter for frame timing
    animationSpeed: 6 // Change frame every 6 game frames (10 FPS at 60 FPS)
};

// Ground object
const ground = {
    height: 100,
    grassHeight: 20,
    dirtHeight: 80,
    // Enhanced colors
    grassColorBase: '#6DBE45',      // Rich grass green
    grassColorDark: '#5AA03A',      // Darker green for depth
    grassColorLight: '#8FD66E',     // Light green highlights
    dirtColorTop: '#B8936B',        // Lighter brown at top
    dirtColorBottom: '#8B6F47',     // Darker brown at bottom
    dirtColorRock: '#7A6A5A',       // Gray-brown for rocks
    y: 0, // Will be set in init()
    scrollX: 0, // Scroll position for ground texture
    stripeWidth: 8 // Width of grass stripes for texture pattern
};

// Pipe constants
const PIPE_WIDTH = 52;
const PIPE_GAP_MIN = 115; // Minimum gap size (tight but fair)
const PIPE_GAP_MAX = 160; // Maximum gap size (more forgiving)
const PIPE_COLOR = '#5DBE64';
const PIPE_BORDER_COLOR = '#2D5F2E';
const PIPE_LIP_HEIGHT = 30;
const PIPE_LIP_EXTENSION = 4; // Extra width on each side for the lip
const PIPE_SPEED = 2.5; // Pixels per frame (middle speed)
const PIPE_SPACING = 300; // Horizontal spacing between pipes
const GAP_MIN_Y = 120; // Minimum gap center Y position
const GAP_MAX_Y = 420; // Maximum gap center Y position

// Ground constants
const GROUND_SPEED = 3.0; // Pixels per frame (fastest, foreground)

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

// Start screen animation
let startScreenAnimation = {
    birdBobOffset: 0,
    birdBobSpeed: 0.003, // Radians per millisecond
    birdBobAmplitude: 8, // Pixels up and down
    birdBaseY: 0 // Will be set in init
};

// FPS tracking (debug mode)
let lastTime = 0;
let fps = 0;
let frameCount = 0;
let fpsUpdateTime = 0;
let showFPS = false; // Toggle with 'F' key

// State transition fade effect
let stateTransition = {
    active: false,
    alpha: 0,
    duration: 300,
    startTime: 0,
    fromState: null,
    toState: null
};

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

    // Trigger state transition fade effect
    stateTransition.active = true;
    stateTransition.alpha = 0;
    stateTransition.startTime = performance.now();
    stateTransition.fromState = currentState;
    stateTransition.toState = newState;

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
 * Render FPS counter in top-left corner (debug mode)
 */
function renderFPS() {
    if (!showFPS) return;

    ctx.save();

    // Semi-transparent background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(5, 5, 70, 25);

    // FPS text with shadow
    ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
    ctx.shadowBlur = 2;
    ctx.fillStyle = '#0F0';
    ctx.font = 'bold 14px monospace';
    ctx.fillText(`FPS: ${fps}`, 10, 22);

    ctx.restore();
}

/**
 * Render game info text in bottom-left corner
 */
function renderGameInfo() {
    ctx.save();

    // Info text with shadow for legibility
    ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
    ctx.shadowBlur = 3;
    ctx.shadowOffsetX = 1;
    ctx.shadowOffsetY = 1;

    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.font = '12px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('Press R to restart', 10, canvas.height - 10);

    ctx.restore();
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
    // Reset bird to start position
    bird.y = canvas.height / 2 - bird.height / 2;
    bird.velocity = 0;
    bird.rotation = 0;

    // Reset score and animations
    score = 0;
    newRecord = false;
    scoreAnimation.active = false;
    newRecordAnimation.active = false;
    collisionFlash.active = false;

    // Reset background and ground positions
    backgroundX = 0;
    ground.scrollX = 0;

    // Clear all pipes and regenerate initial pipes
    pipes = [];
    createPipe(400);
    createPipe(400 + PIPE_SPACING);

    // Transition to PLAYING state (this enables bird physics and pipe movement)
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
        playJumpSound(); // Play jump sound only during gameplay
    }
}

/**
 * Get bird's hitbox for collision detection (90% of visual size for more challenge)
 */
function getBirdHitbox() {
    const hitboxScale = 0.90;
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
        playDeathSound(); // Play death sound on collision
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
        playDeathSound(); // Play death sound on collision
        // Position bird at top
        bird.y = -(bird.height - hitbox.height) / 2;
        bird.velocity = 0;
        return true;
    }

    // Check collision with pipes
    for (let pipe of pipes) {
        // Calculate gap boundaries using this pipe's specific gap size
        const gapTop = pipe.gapCenterY - pipe.gapSize / 2;
        const gapBottom = pipe.gapCenterY + pipe.gapSize / 2;

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
                playDeathSound(); // Play death sound on collision
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
    // Random gap size between MIN and MAX for variety
    const gapSize = Math.random() * (PIPE_GAP_MAX - PIPE_GAP_MIN) + PIPE_GAP_MIN;

    // Calculate safe range for gap center based on gap size
    // Ensure gap doesn't go off-screen top or into ground
    const halfGap = gapSize / 2;
    const minCenterY = GAP_MIN_Y + halfGap;
    const maxCenterY = GAP_MAX_Y - halfGap;

    // Random gap center Y within safe range
    const gapCenterY = Math.random() * (maxCenterY - minCenterY) + minCenterY;

    pipes.push({
        x: x,
        gapCenterY: gapCenterY,
        gapSize: gapSize, // Store the gap size for this pipe
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

            // Play score sound
            playScoreSound();

            console.log('Score:', score);
        }
    });
}

/**
 * Update background scrolling
 */
function updateBackground() {
    if (!backgroundLoaded) return;

    // Calculate the maximum scroll distance
    const scale = canvas.height / backgroundImage.height;
    const scaledWidth = backgroundImage.width * scale;
    const maxScroll = -(scaledWidth - canvas.width);

    // Scroll background very slowly (0.3 px/frame) for distant parallax effect
    // Background should drift almost imperceptibly - creates depth
    backgroundX -= BACKGROUND_SPEED;

    // Stop scrolling when we reach the end of the background
    // (don't loop - just let it stay at the final position)
    if (backgroundX < maxScroll) {
        backgroundX = maxScroll;
    }
}

/**
 * Update ground scrolling
 */
function updateGround() {
    // Scroll ground at 3.0 px/frame (fastest, foreground element)
    ground.scrollX -= GROUND_SPEED;

    // Reset for seamless looping (loop every stripe width)
    if (ground.scrollX <= -ground.stripeWidth) {
        ground.scrollX = 0;
    }
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
 * Update bird wing flap animation
 */
function updateBirdAnimation() {
    // Increment animation counter
    bird.animationCounter++;

    // Change frame every animationSpeed frames (10 FPS at 60 FPS game)
    if (bird.animationCounter >= bird.animationSpeed) {
        bird.animationCounter = 0;
        bird.animationFrame = (bird.animationFrame + 1) % 3; // Cycle through 0, 1, 2
    }
}

/**
 * Update game logic
 */
function update(deltaTime) {
    // Update bird wing animation continuously in all states
    updateBirdAnimation();

    // Game logic will go here based on currentState
    switch (currentState) {
        case GameState.START:
            // Animate bird bobbing up and down
            startScreenAnimation.birdBobOffset += startScreenAnimation.birdBobSpeed * (deltaTime * 1000);
            bird.y = startScreenAnimation.birdBaseY + Math.sin(startScreenAnimation.birdBobOffset) * startScreenAnimation.birdBobAmplitude;
            break;
        case GameState.PLAYING:
            // Update background scrolling
            updateBackground();

            // Update ground scrolling
            updateGround();

            // Update pipes
            updatePipes();

            // Update score
            updateScore();

            // Update bird physics
            updateBird();
            break;
        case GameState.GAME_OVER:
            // Game over logic - pipes, bird, background, and ground stop moving
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

    // Render state transition fade effect
    if (stateTransition.active) {
        const elapsed = performance.now() - stateTransition.startTime;
        if (elapsed < stateTransition.duration) {
            // Fade in effect (from transparent to opaque and back)
            const progress = elapsed / stateTransition.duration;
            let alpha;
            if (progress < 0.5) {
                // Fade to white
                alpha = progress * 2 * 0.3;
            } else {
                // Fade from white
                alpha = (1 - progress) * 2 * 0.3;
            }
            ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        } else {
            stateTransition.active = false;
        }
    }

    // Render score (in PLAYING and GAME_OVER states)
    if (currentState === GameState.PLAYING || currentState === GameState.GAME_OVER) {
        renderScore();
    }

    // Render game info (always visible)
    renderGameInfo();

    // Render FPS counter (debug mode only)
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
        // Calculate gap boundaries using this pipe's specific gap size
        const gapTop = pipe.gapCenterY - pipe.gapSize / 2;
        const gapBottom = pipe.gapCenterY + pipe.gapSize / 2;

        // Render top pipe (from top of canvas to gap top)
        renderPipe(pipe.x, 0, gapTop);

        // Render bottom pipe (from gap bottom to ground)
        renderPipe(pipe.x, gapBottom, ground.y);
    });
}

/**
 * Render the scrolling background
 */
function renderBackground() {
    if (!backgroundLoaded) {
        // If background image isn't loaded, use the default light blue
        return;
    }

    // Calculate scale to fit canvas height while maintaining aspect ratio
    const scale = canvas.height / backgroundImage.height;
    const scaledWidth = backgroundImage.width * scale;
    const scaledHeight = canvas.height;

    // Draw single wide background image (no looping)
    ctx.drawImage(
        backgroundImage,
        backgroundX,
        0,
        scaledWidth,
        scaledHeight
    );

    // If background has scrolled and left empty space on the right,
    // fill with the light blue sky color
    if (backgroundX + scaledWidth < canvas.width) {
        ctx.fillStyle = '#87CEEB';
        ctx.fillRect(backgroundX + scaledWidth, 0, canvas.width - (backgroundX + scaledWidth), canvas.height);
    }
}

/**
 * Render the ground with enhanced scrolling texture
 */
function renderGround() {
    // === DIRT LAYER WITH GRADIENT ===
    // Create vertical gradient for dirt (lighter at top, darker at bottom)
    const dirtGradient = ctx.createLinearGradient(
        0, ground.y + ground.grassHeight,
        0, ground.y + ground.height
    );
    dirtGradient.addColorStop(0, ground.dirtColorTop);
    dirtGradient.addColorStop(1, ground.dirtColorBottom);

    ctx.fillStyle = dirtGradient;
    ctx.fillRect(0, ground.y + ground.grassHeight, canvas.width, ground.dirtHeight);

    // Add horizontal stratification lines (soil layers) - static, no scrolling
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
    ctx.lineWidth = 1;
    const layerCount = 5;
    for (let i = 1; i <= layerCount; i++) {
        const layerY = ground.y + ground.grassHeight + (ground.dirtHeight / layerCount) * i;
        ctx.beginPath();
        ctx.moveTo(0, layerY);
        ctx.lineTo(canvas.width, layerY);
        ctx.stroke();
    }

    // === GRASS LAYER WITH GRADIENT ===
    // Base grass layer with subtle gradient
    const grassGradient = ctx.createLinearGradient(
        0, ground.y,
        0, ground.y + ground.grassHeight
    );
    grassGradient.addColorStop(0, ground.grassColorLight);
    grassGradient.addColorStop(0.5, ground.grassColorBase);
    grassGradient.addColorStop(1, ground.grassColorDark);

    ctx.fillStyle = grassGradient;
    ctx.fillRect(0, ground.y, canvas.width, ground.grassHeight);

    // Dark shadow/lip at grass-dirt border for 3D effect
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fillRect(0, ground.y + ground.grassHeight - 2, canvas.width, 2);

    // === SIMPLE SCROLLING GRASS TEXTURE ===
    // Use a simple repeating pattern that tiles perfectly
    ctx.strokeStyle = ground.grassColorDark;
    ctx.lineWidth = 2;

    // Draw grass blades with simple scrolling offset
    const startX = ground.scrollX % ground.stripeWidth;
    for (let x = startX; x < canvas.width + ground.stripeWidth; x += ground.stripeWidth) {
        ctx.beginPath();
        ctx.moveTo(x, ground.y + ground.grassHeight);
        ctx.lineTo(x, ground.y);
        ctx.stroke();
    }

    // Add lighter stripes in between for depth
    ctx.strokeStyle = ground.grassColorLight;
    ctx.lineWidth = 1;
    for (let x = startX + 4; x < canvas.width + ground.stripeWidth; x += ground.stripeWidth) {
        ctx.beginPath();
        ctx.moveTo(x, ground.y + ground.grassHeight);
        ctx.lineTo(x, ground.y + 5);
        ctx.stroke();
    }

    // Add subtle horizontal highlight on top of grass
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, ground.y + 1);
    ctx.lineTo(canvas.width, ground.y + 1);
    ctx.stroke();
}

/**
 * Render the bird with wing animation
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

    // Draw wings based on animation frame
    ctx.fillStyle = '#FFB347'; // Slightly darker orange/gold for wings

    // Wing positions based on animation frame
    let wingYOffset = 0;
    if (bird.animationFrame === 0) {
        // Frame 0: Wings up
        wingYOffset = -8;
    } else if (bird.animationFrame === 1) {
        // Frame 1: Wings middle (neutral)
        wingYOffset = 0;
    } else {
        // Frame 2: Wings down
        wingYOffset = 8;
    }

    // Left wing
    ctx.beginPath();
    ctx.ellipse(-bird.width / 3, wingYOffset, 8, 12, 0, 0, Math.PI * 2);
    ctx.fill();

    // Right wing
    ctx.beginPath();
    ctx.ellipse(bird.width / 3, wingYOffset, 8, 12, 0, 0, Math.PI * 2);
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
    // Render scrolling background
    renderBackground();

    // Render pipes (decorative, static)
    renderPipes();

    // Render the ground
    renderGround();

    // Render the bird (with bobbing animation)
    renderBird();

    // Render game title "Flappy Bird" with 8-bit font
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Simple drop shadow for depth (no complex effects)
    ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 3;
    ctx.shadowOffsetY = 3;

    // Title stroke (clean black outline)
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 4;
    ctx.font = '28px "Press Start 2P"';
    ctx.strokeText('Flappy Bird', canvas.width / 2, 120);

    // Title fill - gradient from yellow to orange
    const gradient = ctx.createLinearGradient(canvas.width / 2, 105, canvas.width / 2, 135);
    gradient.addColorStop(0, '#FFD700');
    gradient.addColorStop(0.5, '#FFA500');
    gradient.addColorStop(1, '#FF8C00');
    ctx.fillStyle = gradient;
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    ctx.fillText('Flappy Bird', canvas.width / 2, 120);

    ctx.restore();

    // Render keyboard instructions
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Simple shadow for instruction text
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;

    // Keyboard instruction
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 3;
    ctx.font = '16px "Press Start 2P"';
    ctx.strokeText('SPACE to Jump', canvas.width / 2, canvas.height / 2 + 60);

    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    ctx.fillStyle = '#FFF';
    ctx.fillText('SPACE to Jump', canvas.width / 2, canvas.height / 2 + 60);

    ctx.restore();

    // Render audio toggle instruction
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Shadow for audio text
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;

    // Audio status text
    const audioText = audioEnabled ? 'M to Mute' : 'M to Unmute';
    const audioColor = audioEnabled ? '#FFF' : '#AAA';

    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.font = '12px "Press Start 2P"';
    ctx.strokeText(audioText, canvas.width / 2, canvas.height - 30);

    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    ctx.fillStyle = audioColor;
    ctx.fillText(audioText, canvas.width / 2, canvas.height - 30);

    ctx.restore();

    // Render "Tap to Start" with pulsing animation
    const pulseTime = performance.now();
    const pulseAlpha = 0.6 + Math.sin(pulseTime * 0.003) * 0.4; // Oscillates between 0.2 and 1
    const pulseScale = 1.0 + Math.sin(pulseTime * 0.003) * 0.08; // Oscillates between 0.92 and 1.08

    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2 + 100);
    ctx.scale(pulseScale, pulseScale);

    // Instruction text with outline and shadow
    ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;

    // Black outline
    ctx.strokeStyle = `rgba(0, 0, 0, ${pulseAlpha})`;
    ctx.lineWidth = 4;
    ctx.font = 'bold 26px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.strokeText('Tap to Start', 0, 0);

    // White fill
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    ctx.fillStyle = `rgba(255, 255, 255, ${pulseAlpha})`;
    ctx.fillText('Tap to Start', 0, 0);

    ctx.restore();
}

/**
 * Render game
 */
function renderGame() {
    // Render scrolling background
    renderBackground();

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
    // Render scrolling background (frozen)
    renderBackground();

    // Render pipes (frozen at death position)
    renderPipes();

    // Render the ground
    renderGround();

    // Render the bird (frozen at death position)
    renderBird();

    // Semi-transparent black overlay to darken the screen
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Create a score panel background
    const panelWidth = 280;
    const panelHeight = 240;
    const panelX = (canvas.width - panelWidth) / 2;
    const panelY = (canvas.height - panelHeight) / 2 - 20;

    // Draw panel background (light beige)
    ctx.fillStyle = '#F5E6D3';
    ctx.fillRect(panelX, panelY, panelWidth, panelHeight);

    // Draw panel border
    ctx.strokeStyle = '#8B6914';
    ctx.lineWidth = 4;
    ctx.strokeRect(panelX, panelY, panelWidth, panelHeight);

    // Draw inner shadow for depth
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.lineWidth = 2;
    ctx.strokeRect(panelX + 4, panelY + 4, panelWidth - 8, panelHeight - 8);

    ctx.save();
    ctx.textAlign = 'center';

    // Render "Game Over" title
    ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
    ctx.shadowBlur = 3;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;

    ctx.strokeStyle = '#8B0000';
    ctx.lineWidth = 4;
    ctx.font = 'bold 40px Arial';
    ctx.strokeText('Game Over', canvas.width / 2, panelY + 45);

    ctx.fillStyle = '#DC143C'; // Crimson red
    ctx.fillText('Game Over', canvas.width / 2, panelY + 45);

    ctx.shadowColor = 'transparent';

    // Divider line
    ctx.strokeStyle = '#8B6914';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(panelX + 30, panelY + 70);
    ctx.lineTo(panelX + panelWidth - 30, panelY + 70);
    ctx.stroke();

    // Render current score
    ctx.fillStyle = '#555';
    ctx.font = '18px Arial';
    ctx.fillText('Score', canvas.width / 2, panelY + 100);

    ctx.fillStyle = '#000';
    ctx.font = 'bold 36px Arial';
    ctx.fillText(score.toString(), canvas.width / 2, panelY + 135);

    // Render high score
    ctx.fillStyle = '#555';
    ctx.font = '18px Arial';
    ctx.fillText('Best', canvas.width / 2, panelY + 165);

    ctx.fillStyle = '#DAA520'; // Goldenrod for best score
    ctx.font = 'bold 36px Arial';
    ctx.fillText(highScore.toString(), canvas.width / 2, panelY + 200);

    ctx.restore();

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
            const scale = 1.0 + Math.sin((elapsed / 200) * Math.PI) * 0.15;

            ctx.save();
            ctx.translate(canvas.width / 2, panelY - 30);
            ctx.scale(scale, scale);

            // Draw "NEW RECORD!" with outline
            ctx.strokeStyle = `rgba(139, 0, 0, ${alpha})`; // Dark red
            ctx.lineWidth = 4;
            ctx.font = 'bold 28px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.strokeText('NEW RECORD!', 0, 0);

            ctx.fillStyle = `rgba(255, 215, 0, ${alpha})`; // Gold color
            ctx.fillText('NEW RECORD!', 0, 0);

            // Add sparkle effect
            ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.8})`;
            ctx.font = 'bold 20px Arial';
            ctx.fillText('★', -80, -5);
            ctx.fillText('★', 80, -5);

            ctx.restore();
        } else {
            newRecordAnimation.active = false;
        }
    }

    // Render restart instruction with pulsing animation
    const pulseTime = performance.now();
    const pulseAlpha = 0.7 + Math.sin(pulseTime * 0.004) * 0.3;

    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;

    // Outline for better legibility
    ctx.strokeStyle = `rgba(0, 0, 0, ${pulseAlpha})`;
    ctx.lineWidth = 3;
    ctx.font = 'bold 22px Arial';
    ctx.textAlign = 'center';
    ctx.strokeText('Tap to Restart', canvas.width / 2, panelY + panelHeight + 40);

    ctx.shadowBlur = 0;
    ctx.fillStyle = `rgba(255, 255, 255, ${pulseAlpha})`;
    ctx.fillText('Tap to Restart', canvas.width / 2, panelY + panelHeight + 40);

    ctx.restore();
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
    // Keyboard handlers
    document.addEventListener('keydown', (e) => {
        if (e.code === 'Space') {
            e.preventDefault(); // Prevent page scroll
            jump();
        } else if (e.code === 'KeyR') {
            // R key to restart
            if (currentState === GameState.GAME_OVER) {
                resetGame();
            }
        } else if (e.code === 'KeyF') {
            // F key to toggle FPS counter
            showFPS = !showFPS;
            console.log('FPS counter:', showFPS ? 'ON' : 'OFF');
        } else if (e.code === 'KeyM') {
            // M key to toggle audio
            audioEnabled = !audioEnabled;
            console.log('Audio:', audioEnabled ? 'ON' : 'OFF');
        }
    });

    // Mouse click handler
    canvas.addEventListener('click', () => {
        jump();
    });

    // Touch event handlers for mobile
    canvas.addEventListener('touchstart', (e) => {
        e.preventDefault(); // Prevent default touch behavior (scrolling, zooming)
        jump();
    }, { passive: false });

    canvas.addEventListener('touchend', (e) => {
        e.preventDefault();
    }, { passive: false });

    canvas.addEventListener('touchmove', (e) => {
        e.preventDefault(); // Prevent scrolling while touching the canvas
    }, { passive: false });

    // Prevent context menu on long press
    canvas.addEventListener('contextmenu', (e) => {
        e.preventDefault();
    });
}

/**
 * Resize canvas to fit screen while maintaining aspect ratio
 */
function resizeCanvas() {
    const targetWidth = 400;
    const targetHeight = 600;
    const targetAspectRatio = targetWidth / targetHeight;

    // Get available space
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    const windowAspectRatio = windowWidth / windowHeight;

    let scale;
    if (windowAspectRatio > targetAspectRatio) {
        // Window is wider - fit to height
        scale = windowHeight / targetHeight;
    } else {
        // Window is taller - fit to width
        scale = windowWidth / targetWidth;
    }

    // Apply some padding (95% of available space)
    scale *= 0.95;

    // Set canvas display size (CSS)
    canvas.style.width = `${targetWidth * scale}px`;
    canvas.style.height = `${targetHeight * scale}px`;

    // Canvas internal resolution stays at 400x600
    // This maintains sharp graphics without blurriness

    console.log(`Canvas scaled to ${Math.round(scale * 100)}% (${Math.round(targetWidth * scale)}x${Math.round(targetHeight * scale)})`);
}

/**
 * Initialize the game
 */
function init() {
    console.log('Game starting...');

    // Load high score from localStorage
    loadHighScore();

    // Setup responsive canvas sizing
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    window.addEventListener('orientationchange', () => {
        // Delay resize slightly for orientation change
        setTimeout(resizeCanvas, 100);
    });

    // Position ground at bottom of canvas
    ground.y = canvas.height - ground.height;

    // Position bird at center of canvas
    bird.y = canvas.height / 2 - bird.height / 2;
    startScreenAnimation.birdBaseY = bird.y;

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
