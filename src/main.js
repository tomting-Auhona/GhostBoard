import "./style.css";
import { FilesetResolver, HandLandmarker } from "@mediapipe/tasks-vision";
import { Chess } from "chess.js";

const $ = (s) => document.querySelector(s);

const app = $("#app");
const setupScreen = $("#setupScreen");
const gameScreen = $("#gameScreen");
const startGameBtn = $("#startGameBtn");
const gameModeInput = $("#gameMode");
const player1NameInput = $("#player1Name");
const player2NameInput = $("#player2Name");
const player2Field = $("#player2Field");
const difficultyField = $("#difficultyField");
const difficultyInput = $("#difficulty");
const timeControlInput = $("#timeControl");
const customTime = $("#customTime");
const customMinutes = $("#customMinutes");
const customIncrement = $("#customIncrement");
const boardThemeInput = $("#boardTheme");
const liveTheme = $("#liveTheme");
const soundToggle = $("#soundToggle");
const setupMessage = $("#setupMessage");

const webcam = $("#webcam");
const cameraStage = $("#cameraStage");
const boardEl = $("#board");
const handCursor = $("#handCursor");
const gameStatus = $("#gameStatus");
const moveHistoryEl = $("#moveHistory");
const whiteNameEl = $("#whiteName");
const blackNameEl = $("#blackName");
const whiteClockEl = $("#whiteClock");
const blackClockEl = $("#blackClock");
const whitePlayer = $("#whitePlayer");
const blackPlayer = $("#blackPlayer");
const aiThinking = $("#aiThinking");
const muteBtn = $("#muteBtn");
const restartBtn = $("#restartBtn");
const resignBtn = $("#resignBtn");
const newGameBtn = $("#newGameBtn");

let game = new Chess();
let settings = null;
let selectedSquare = null;
let legalTargets = [];
let lastMove = null;
let gameActive = false;
let aiBusy = false;

let whiteTimeMs = 180000;
let blackTimeMs = 180000;
let incrementMs = 2000;
let lastClockTick = 0;
let clockTimer = null;

let cameraStream = null;
let handLandmarker = null;
let handLoopStarted = false;
let previousPinch = false;
let lastPinchAt = 0;

let soundEnabled = true;
let audioContext = null;

const FILES = ["a","b","c","d","e","f","g","h"];
const PIECES = {
  wp:"♙", wn:"♘", wb:"♗", wr:"♖", wq:"♕", wk:"♔",
  bp:"♟", bn:"♞", bb:"♝", br:"♜", bq:"♛", bk:"♚"
};

const PINCH_THRESHOLD = 0.055;
const PINCH_COOLDOWN_MS = 280;

function updateModeUI() {
  const aiMode = gameModeInput.value === "ai";
  difficultyField.classList.toggle("hidden", !aiMode);
  player2Field.classList.toggle("hidden", aiMode);
}
gameModeInput.addEventListener("change", updateModeUI);
updateModeUI();

timeControlInput.addEventListener("change", () => {
  customTime.classList.toggle("hidden", timeControlInput.value !== "custom");
});

boardThemeInput.addEventListener("change", () => {
  app.dataset.theme = boardThemeInput.value;
  liveTheme.value = boardThemeInput.value;
});

liveTheme.addEventListener("change", () => {
  app.dataset.theme = liveTheme.value;
  localStorage.setItem("airchess-theme", liveTheme.value);
});

document.querySelectorAll(".sticker").forEach((button) => {
  button.addEventListener("click", () => {
    player1NameInput.value =
      `${player1NameInput.value.trim()} ${button.textContent.trim()}`.trim();
  });
});

const savedName = localStorage.getItem("airchess-name");
const savedTheme = localStorage.getItem("airchess-theme");
if (savedName) player1NameInput.value = savedName;
if (savedTheme) {
  boardThemeInput.value = savedTheme;
  liveTheme.value = savedTheme;
  app.dataset.theme = savedTheme;
}

function collectSettings() {
  let minutes;
  let increment;

  if (timeControlInput.value === "custom") {
    minutes = Math.max(1, Number(customMinutes.value) || 1);
    increment = Math.max(0, Number(customIncrement.value) || 0);
  } else {
    [minutes, increment] = timeControlInput.value.split(",").map(Number);
  }

  return {
    mode: gameModeInput.value,
    whiteName: player1NameInput.value.trim() || "Player",
    blackName:
      gameModeInput.value === "ai"
        ? "Nova AI 🤖"
        : (player2NameInput.value.trim() || "Player 2"),
    difficulty: difficultyInput.value,
    minutes,
    increment,
    theme: boardThemeInput.value,
    sound: soundToggle.checked
  };
}

startGameBtn.addEventListener("click", async () => {
  startGameBtn.disabled = true;
  setupMessage.textContent = "Starting camera and hand tracking...";

  try {
    settings = collectSettings();
    soundEnabled = settings.sound;

    app.dataset.theme = settings.theme;
    liveTheme.value = settings.theme;

    localStorage.setItem("airchess-name", settings.whiteName);
    localStorage.setItem("airchess-theme", settings.theme);

    await startCamera();
    await initHandTracking();

    setupScreen.classList.add("hidden");
    gameScreen.classList.remove("hidden");

    initializeGame();

    if (!handLoopStarted) {
      handLoopStarted = true;
      requestAnimationFrame(handLoop);
    }
  } catch (error) {
    console.error(error);
    setupMessage.textContent =
      "Could not start AirChess. Allow camera permission and try again.";
  } finally {
    startGameBtn.disabled = false;
  }
});

async function startCamera() {
  if (cameraStream) return;

  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error("Camera API unavailable. Use HTTPS or localhost.");
  }

  cameraStream = await navigator.mediaDevices.getUserMedia({
    video: {
      facingMode: "user",
      width: { ideal: 1280 },
      height: { ideal: 720 }
    },
    audio: false
  });

  webcam.srcObject = cameraStream;
  await webcam.play();
}

async function createLandmarker(vision, delegate) {
  return HandLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath:
        "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
      delegate
    },
    runningMode: "VIDEO",
    numHands: 1,
    minHandDetectionConfidence: 0.55,
    minHandPresenceConfidence: 0.55,
    minTrackingConfidence: 0.5
  });
}

async function initHandTracking() {
  if (handLandmarker) return;

  const vision = await FilesetResolver.forVisionTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm"
  );

  try {
    handLandmarker = await createLandmarker(vision, "GPU");
  } catch (error) {
    console.warn("GPU hand tracking unavailable; trying CPU.", error);
    handLandmarker = await createLandmarker(vision, "CPU");
  }
}

function handLoop() {
  if (!handLandmarker || webcam.readyState < 2) {
    requestAnimationFrame(handLoop);
    return;
  }

  const now = performance.now();

  try {
    const result = handLandmarker.detectForVideo(webcam, now);
    processHand(result, now);
  } catch (error) {
    console.error("Hand tracking error:", error);
  }

  requestAnimationFrame(handLoop);
}

function processHand(result, now) {
  if (!result.landmarks?.length) {
    handCursor.classList.add("hidden");
    previousPinch = false;
    return;
  }

  const hand = result.landmarks[0];
  const indexTip = hand[8];
  const thumbTip = hand[4];
  const rect = cameraStage.getBoundingClientRect();

  const x = (1 - indexTip.x) * rect.width;
  const y = indexTip.y * rect.height;

  handCursor.classList.remove("hidden");
  handCursor.style.left = `${x}px`;
  handCursor.style.top = `${y}px`;

  const pinchDistance = Math.hypot(
    indexTip.x - thumbTip.x,
    indexTip.y - thumbTip.y
  );

  const pinching = pinchDistance < PINCH_THRESHOLD;
  handCursor.classList.toggle("pinching", pinching);

  if (
    pinching &&
    !previousPinch &&
    now - lastPinchAt > PINCH_COOLDOWN_MS
  ) {
    lastPinchAt = now;

    const square = squareFromPoint(
      rect.left + x,
      rect.top + y
    );

    if (square) handleSquareInput(square);
  }

  previousPinch = pinching;
}

function squareFromPoint(clientX, clientY) {
  const rect = boardEl.getBoundingClientRect();

  if (
    clientX < rect.left ||
    clientX > rect.right ||
    clientY < rect.top ||
    clientY > rect.bottom
  ) {
    return null;
  }

  const col = Math.min(
    7,
    Math.max(0, Math.floor(((clientX - rect.left) / rect.width) * 8))
  );

  const row = Math.min(
    7,
    Math.max(0, Math.floor(((clientY - rect.top) / rect.height) * 8))
  );

  return `${FILES[col]}${8 - row}`;
}

function initializeGame() {
  game = new Chess();
  selectedSquare = null;
  legalTargets = [];
  lastMove = null;
  gameActive = true;
  aiBusy = false;

  whiteTimeMs = settings.minutes * 60 * 1000;
  blackTimeMs = settings.minutes * 60 * 1000;
  incrementMs = settings.increment * 1000;

  whiteNameEl.textContent = settings.whiteName;
  blackNameEl.textContent = settings.blackName;

  aiThinking.classList.add("hidden");

  renderBoard();
  renderHistory();
  updateStatus();
  startClock();
}

function renderBoard() {
  boardEl.innerHTML = "";

  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const squareName = `${FILES[col]}${8 - row}`;
      const square = document.createElement("div");

      square.className = "square";
      square.dataset.square = squareName;
      square.classList.add((row + col) % 2 === 0 ? "light" : "dark");

      if (selectedSquare === squareName) square.classList.add("selected");
      if (legalTargets.includes(squareName)) square.classList.add("legal");

      if (
        lastMove &&
        (lastMove.from === squareName || lastMove.to === squareName)
      ) {
        square.classList.add("last-move");
      }

      const piece = game.get(squareName);

      if (piece) {
        square.classList.add("has-piece");

        const pieceEl = document.createElement("span");
        pieceEl.className =
          `piece ${piece.color === "w" ? "white-piece" : "black-piece"}`;
        pieceEl.textContent = PIECES[`${piece.color}${piece.type}`];

        square.appendChild(pieceEl);
      }

      boardEl.appendChild(square);
    }
  }
}

boardEl.addEventListener("click", (event) => {
  const square = event.target.closest(".square");
  if (square) handleSquareInput(square.dataset.square);
});

function handleSquareInput(square) {
  if (!gameActive || aiBusy) return;
  if (settings.mode === "ai" && game.turn() === "b") return;

  if (!selectedSquare) {
    selectSquare(square);
    return;
  }

  if (square === selectedSquare) {
    clearSelection();
    return;
  }

  const clickedPiece = game.get(square);

  if (clickedPiece && clickedPiece.color === game.turn()) {
    selectSquare(square);
    return;
  }

  tryMove(selectedSquare, square);
}

function selectSquare(square) {
  const piece = game.get(square);

  if (!piece || piece.color !== game.turn()) {
    playUiTone("error");
    return;
  }

  selectedSquare = square;
  legalTargets = game
    .moves({ square, verbose: true })
    .map((move) => move.to);

  renderBoard();
  playUiTone("select");
}

function clearSelection() {
  selectedSquare = null;
  legalTargets = [];
  renderBoard();
}

function tryMove(from, to) {
  updateClock();

  let move = null;

  try {
    move = game.move({
      from,
      to,
      promotion: "q"
    });
  } catch {
    move = null;
  }

  if (!move) {
    lastClockTick = performance.now();
    clearSelection();
    playUiTone("error");
    return;
  }

  addIncrement(move.color);
  lastClockTick = performance.now();

  lastMove = {
    from: move.from,
    to: move.to
  };

  selectedSquare = null;
  legalTargets = [];

  playMoveSound(move);
  renderBoard();
  renderHistory();
  updateStatus();

  if (checkEnd()) return;

  if (settings.mode === "ai" && game.turn() === "b") {
    scheduleAiMove();
  }
}

function scheduleAiMove() {
  aiBusy = true;
  aiThinking.classList.remove("hidden");

  setTimeout(() => {
    if (!gameActive) {
      finishAiThinking();
      return;
    }

    makeAiMove();
  }, settings.difficulty === "expert" ? 420 : 280);
}

function finishAiThinking() {
  aiBusy = false;
  aiThinking.classList.add("hidden");
}

function makeAiMove() {
  updateClock();

  const move = chooseAiMove();

  if (!move) {
    finishAiThinking();
    checkEnd();
    return;
  }

  const result = game.move({
    from: move.from,
    to: move.to,
    promotion: move.promotion || "q"
  });

  addIncrement(result.color);
  lastClockTick = performance.now();

  lastMove = {
    from: result.from,
    to: result.to
  };

  playMoveSound(result);
  finishAiThinking();

  renderBoard();
  renderHistory();
  updateStatus();
  checkEnd();
}

function chooseAiMove() {
  const moves = game.moves({ verbose: true });
  if (!moves.length) return null;

  if (settings.difficulty === "easy" && Math.random() < 0.68) {
    return moves[Math.floor(Math.random() * moves.length)];
  }

  const depth = {
    easy: 1,
    medium: 2,
    hard: 2,
    expert: 3
  }[settings.difficulty] || 2;

  let bestScore = -Infinity;
  let bestMoves = [];

  for (const move of moves) {
    const clone = new Chess(game.fen());

    clone.move({
      from: move.from,
      to: move.to,
      promotion: move.promotion || "q"
    });

    const score = minimax(
      clone,
      depth - 1,
      -Infinity,
      Infinity,
      false
    );

    if (score > bestScore) {
      bestScore = score;
      bestMoves = [move];
    } else if (score === bestScore) {
      bestMoves.push(move);
    }
  }

  return bestMoves[
    Math.floor(Math.random() * bestMoves.length)
  ];
}

function minimax(chess, depth, alpha, beta, maximizingBlack) {
  if (depth <= 0 || chess.isGameOver()) {
    return evaluate(chess);
  }

  const moves = chess.moves({ verbose: true });

  if (maximizingBlack) {
    let best = -Infinity;

    for (const move of moves) {
      const child = new Chess(chess.fen());

      child.move({
        from: move.from,
        to: move.to,
        promotion: move.promotion || "q"
      });

      best = Math.max(
        best,
        minimax(child, depth - 1, alpha, beta, false)
      );

      alpha = Math.max(alpha, best);
      if (beta <= alpha) break;
    }

    return best;
  }

  let best = Infinity;

  for (const move of moves) {
    const child = new Chess(chess.fen());

    child.move({
      from: move.from,
      to: move.to,
      promotion: move.promotion || "q"
    });

    best = Math.min(
      best,
      minimax(child, depth - 1, alpha, beta, true)
    );

    beta = Math.min(beta, best);
    if (beta <= alpha) break;
  }

  return best;
}

function evaluate(chess) {
  if (chess.isCheckmate()) {
    return chess.turn() === "w" ? 100000 : -100000;
  }

  const values = {
    p: 100,
    n: 320,
    b: 330,
    r: 500,
    q: 900,
    k: 0
  };

  let score = 0;

  for (const row of chess.board()) {
    for (const piece of row) {
      if (!piece) continue;

      score +=
        piece.color === "b"
          ? values[piece.type]
          : -values[piece.type];
    }
  }

  return score;
}

function startClock() {
  clearInterval(clockTimer);

  lastClockTick = performance.now();
  renderClocks();

  clockTimer = setInterval(() => {
    if (!gameActive) return;

    updateClock();
    renderClocks();

    if (whiteTimeMs <= 0 || blackTimeMs <= 0) {
      endOnTime();
    }
  }, 100);
}

function updateClock() {
  if (!gameActive) return;

  const now = performance.now();
  const elapsed = now - lastClockTick;

  lastClockTick = now;

  if (game.turn() === "w") {
    whiteTimeMs -= elapsed;
  } else {
    blackTimeMs -= elapsed;
  }

  whiteTimeMs = Math.max(0, whiteTimeMs);
  blackTimeMs = Math.max(0, blackTimeMs);
}

function addIncrement(color) {
  if (color === "w") {
    whiteTimeMs += incrementMs;
  } else {
    blackTimeMs += incrementMs;
  }
}

function formatClock(ms) {
  const total = Math.ceil(ms / 1000);
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function renderClocks() {
  whiteClockEl.textContent = formatClock(whiteTimeMs);
  blackClockEl.textContent = formatClock(blackTimeMs);

  whiteClockEl.classList.toggle("low-time", whiteTimeMs <= 10000);
  blackClockEl.classList.toggle("low-time", blackTimeMs <= 10000);

  whitePlayer.classList.toggle(
    "active-player",
    gameActive && game.turn() === "w"
  );

  blackPlayer.classList.toggle(
    "active-player",
    gameActive && game.turn() === "b"
  );
}

function endOnTime() {
  if (!gameActive) return;

  gameActive = false;
  clearInterval(clockTimer);

  const winner =
    whiteTimeMs <= 0
      ? settings.blackName
      : settings.whiteName;

  gameStatus.textContent =
    `⏱ ${winner} wins on time`;

  playUiTone("gameover");
}

function updateStatus() {
  if (!gameActive) return;

  const side =
    game.turn() === "w"
      ? "White"
      : "Black";

  gameStatus.textContent =
    game.inCheck()
      ? `⚠ ${side} is in check`
      : `${side} to move`;

  renderClocks();
}

function checkEnd() {
  if (!game.isGameOver()) return false;

  gameActive = false;
  clearInterval(clockTimer);

  if (game.isCheckmate()) {
    const winner =
      game.turn() === "w"
        ? settings.blackName
        : settings.whiteName;

    gameStatus.textContent =
      `♛ Checkmate — ${winner} wins`;
  } else if (game.isStalemate()) {
    gameStatus.textContent =
      "½–½ Stalemate";
  } else if (game.isThreefoldRepetition()) {
    gameStatus.textContent =
      "½–½ Draw by repetition";
  } else if (game.isInsufficientMaterial()) {
    gameStatus.textContent =
      "½–½ Draw — insufficient material";
  } else if (game.isDraw()) {
    gameStatus.textContent =
      "½–½ Draw";
  } else {
    gameStatus.textContent =
      "Game over";
  }

  playUiTone("gameover");
  return true;
}

function renderHistory() {
  const history = game.history();

  if (!history.length) {
    moveHistoryEl.innerHTML =
      '<div class="empty-history">Moves will appear here.</div>';
    return;
  }

  moveHistoryEl.innerHTML = "";

  for (let i = 0; i < history.length; i += 2) {
    const row = document.createElement("div");
    row.className = "move-row";

    const number = document.createElement("span");
    number.className = "move-number";
    number.textContent =
      `${Math.floor(i / 2) + 1}.`;

    const white = document.createElement("span");
    white.textContent = history[i] || "";

    const black = document.createElement("span");
    black.textContent = history[i + 1] || "";

    row.append(number, white, black);
    moveHistoryEl.appendChild(row);
  }

  moveHistoryEl.scrollTop =
    moveHistoryEl.scrollHeight;
}

function ensureAudio() {
  if (!audioContext) {
    audioContext =
      new (
        window.AudioContext ||
        window.webkitAudioContext
      )();
  }

  if (audioContext.state === "suspended") {
    audioContext.resume();
  }
}

function beep(
  frequency,
  duration = 0.07,
  type = "sine",
  gain = 0.04,
  delay = 0
) {
  if (!soundEnabled) return;

  ensureAudio();

  const start =
    audioContext.currentTime + delay;

  const oscillator =
    audioContext.createOscillator();

  const amplifier =
    audioContext.createGain();

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, start);

  amplifier.gain.setValueAtTime(gain, start);
  amplifier.gain.exponentialRampToValueAtTime(
    0.0001,
    start + duration
  );

  oscillator.connect(amplifier);
  amplifier.connect(audioContext.destination);

  oscillator.start(start);
  oscillator.stop(start + duration);
}

function playUiTone(type) {
  if (!soundEnabled) return;

  if (type === "select") {
    beep(700, 0.05, "sine", 0.025);
  }

  if (type === "error") {
    beep(180, 0.06, "square", 0.025);
    beep(135, 0.08, "square", 0.02, 0.065);
  }

  if (type === "gameover") {
    beep(440, 0.09, "sine", 0.035);
    beep(554, 0.09, "sine", 0.035, 0.11);
    beep(659, 0.18, "sine", 0.04, 0.22);
  }
}

function playMoveSound(move) {
  if (!soundEnabled) return;

  const base = {
    p: 330,
    n: 430,
    b: 500,
    r: 280,
    q: 620,
    k: 220
  }[move.piece] || 330;

  beep(base, 0.055, "triangle", 0.03);

  if (move.captured) {
    beep(120, 0.09, "square", 0.022, 0.055);
  }

  if (
    move.san?.includes("+") ||
    move.san?.includes("#")
  ) {
    beep(820, 0.08, "sine", 0.025, 0.11);
  }
}

muteBtn.addEventListener("click", () => {
  soundEnabled = !soundEnabled;
  muteBtn.textContent =
    soundEnabled ? "🔊" : "🔇";
});

restartBtn.addEventListener("click", () => {
  if (settings) initializeGame();
});

resignBtn.addEventListener("click", () => {
  if (!gameActive) return;

  gameActive = false;
  clearInterval(clockTimer);

  const loser =
    game.turn() === "w"
      ? settings.whiteName
      : settings.blackName;

  const winner =
    game.turn() === "w"
      ? settings.blackName
      : settings.whiteName;

  gameStatus.textContent =
    `${loser} resigned — ${winner} wins`;

  playUiTone("gameover");
});

newGameBtn.addEventListener("click", () => {
  gameActive = false;
  clearInterval(clockTimer);

  gameScreen.classList.add("hidden");
  setupScreen.classList.remove("hidden");

  setupMessage.textContent =
    "Camera frames are processed locally in your browser for hand tracking.";
});

window.addEventListener("beforeunload", () => {
  if (cameraStream) {
    cameraStream
      .getTracks()
      .forEach((track) => track.stop());
  }
});
