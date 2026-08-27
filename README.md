# GhostBoard ♞

GhostBoard is a browser-based chess game where a 2D chessboard floats over your live camera feed and you control it with your hand.

## V1

- Webcam background
- MediaPipe hand tracking
- Index fingertip air cursor
- Pinch once to select, pinch again to move
- Mouse fallback
- Legal chess rules with chess.js
- Play vs built-in AI
- Two-player mode
- Bullet, Blitz, Rapid, Classical and Custom time controls
- Increment support
- Usernames + emoji/stickers
- Multiple board themes
- Different generated sounds for chess events
- Mute toggle
- Move history
- Check/checkmate/draw handling
- GitHub Pages workflow

## Run locally

```bash
npm install
npm run dev
```

Allow camera access.

## GitHub Pages

Upload all files to a GitHub repository named `GhostBoard`.

Then:

1. Settings
2. Pages
3. Source → GitHub Actions

The included workflow will build and deploy the site.

## Note about AI

V1 uses a lightweight minimax AI. Later, this can be replaced with Stockfish WebAssembly for much stronger play.
