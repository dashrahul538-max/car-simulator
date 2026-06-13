# Car Racing Simulator

Open `index.html` in a browser to play. The game is a simple canvas-based car racing simulator with keyboard and touch controls.

Controls:
- Keyboard: Arrow keys or A/D to steer, Up/W to accelerate.
- Touch: Use on-screen buttons (left, accelerate, right).

To run locally, open the file in a browser or serve the folder with a static server:

```bash
# from project folder
python3 -m http.server 8000
# then open http://localhost:8000
```

Audio assets and music
- Place optional audio files into an `assets/` folder inside the project root:
  - `assets/engine_loop.mp3` or `assets/engine_loop.wav` — looped engine sound (recommended)
  - `assets/crash.mp3` or `assets/crash.wav` — short crash/start sample (optional)
  - `assets/music.mp3` or `assets/music.wav` — background music (optional)
  - `assets/car.svg` or `assets/car.png` — optional car sprite for more realistic visuals (included as `assets/car.svg`)

If these files are present the game will use them; otherwise it falls back to a synthesized engine and crash sound, and a drawn car shape.

Controls
- Keyboard: Arrow keys or A/D to steer, Up/W to accelerate.
- Touch: Use on-screen buttons (left, accelerate, right).
- Use the `Sound` and `Music` buttons at the top-left to toggle audio.
