# Flappy Bird

A browser-based clone of the classic Flappy Bird game built with HTML5 Canvas and vanilla JavaScript.

## Features

- **Retro 8-bit aesthetic** with Press Start 2P font
- **Smooth animations** including bird wing flapping and parallax scrolling background
- **Dynamic difficulty** with randomized pipe gaps and positions
- **Procedural audio** generated with Web Audio API (zero file dependencies)
- **Score tracking** with local storage for high scores
- **Responsive design** that adapts to different screen sizes
- **Touch and keyboard controls** for desktop and mobile play

## How to Play

Navigate your bird through gaps in the pipes by tapping or pressing space. Each pipe you pass increases your score. The game ends when you hit a pipe, the ground, or the ceiling.

Try to beat your high score!

## Controls

### Keyboard
- **SPACE** - Jump (flap wings)
- **M** - Toggle audio on/off
- **R** - Restart game (when game over)
- **F** - Toggle FPS counter (debug mode)

### Mouse/Touch
- **Click/Tap** - Jump (flap wings) or start/restart game

## Installation & Setup

1. Clone or download this repository
2. Open `index.html` in a modern web browser
3. No build process or dependencies required!

Alternatively, you can run a local server:
```bash
# Python 3
python -m http.server 8000

# Node.js (with http-server)
npx http-server
```

Then navigate to `http://localhost:8000` in your browser.

## Technical Details

### Technologies Used
- **HTML5 Canvas** for rendering
- **Vanilla JavaScript** (ES6+) for game logic
- **Web Audio API** for procedural sound generation
- **CSS3** for responsive layout
- **Google Fonts** (Press Start 2P) for retro typography

### Sound Effects
All sound effects are generated procedurally using Web Audio API:
- **Jump sound**: Ascending whoosh (150Hz → 300Hz)
- **Score sound**: Pleasant chime using major third interval (C5 + E5)
- **Death sound**: Deep bass thud (100Hz → 30Hz with low-pass filter)

### Performance
- Runs at 60 FPS
- Optimized rendering pipeline
- Efficient collision detection with hitbox scaling
- Smooth parallax scrolling (background, pipes, ground at different speeds)

## Game Mechanics

- **Gravity**: 0.5 pixels/frame²
- **Jump velocity**: -9 pixels/frame
- **Terminal velocity**: 10 pixels/frame
- **Pipe speed**: 2.5 pixels/frame
- **Ground speed**: 3.0 pixels/frame
- **Background speed**: 0.3 pixels/frame
- **Pipe gap**: Randomized between 115-160 pixels
- **Hitbox**: 90% of bird's visual size for fair collision detection

## Browser Compatibility

Works on all modern browsers that support:
- HTML5 Canvas
- Web Audio API
- ES6+ JavaScript

Tested on:
- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (iOS Safari, Chrome Android)

## Credits

- Original Flappy Bird game by Dong Nguyen
- Developed as a learning project
- Background artwork and game design inspired by the original

## License

This is a personal learning project. Not for commercial use.
