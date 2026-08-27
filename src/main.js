import "./style.css";

import {
  FilesetResolver,
  HandLandmarker
} from "@mediapipe/tasks-vision";

import {
  Chess
} from "chess.js";


/* =========================================================
   GHOST BOARD
   Hover controls — NO PINCH
========================================================= */

document.title = "Ghost Board";


/* =========================================================
   DOM
========================================================= */

const $ = (selector) =>
  document.querySelector(selector);

const app = $("#app");

const setupScreen =
  $("#setupScreen");

const gameScreen =
  $("#gameScreen");

const startGameBtn =
  $("#startGameBtn");

const gameModeInput =
  $("#gameMode");

const player1NameInput =
  $("#player1Name");

const player2NameInput =
  $("#player2Name");

const player2Field =
  $("#player2Field");

const difficultyField =
  $("#difficultyField");

const difficultyInput =
  $("#difficulty");

const timeControlInput =
  $("#timeControl");

const customTime =
  $("#customTime");

const customMinutes =
  $("#customMinutes");

const customIncrement =
  $("#customIncrement");

const boardThemeInput =
  $("#boardTheme");

const liveTheme =
  $("#liveTheme");

const soundToggle =
  $("#soundToggle");

const setupMessage =
  $("#setupMessage");

const webcam =
  $("#webcam");

const cameraStage =
  $("#cameraStage");

const boardEl =
  $("#board");

const handCursor =
  $("#handCursor");

const gestureHint =
  $("#gestureHint");

const gameStatus =
  $("#gameStatus");

const moveHistoryEl =
  $("#moveHistory");

const whiteNameEl =
  $("#whiteName");

const blackNameEl =
  $("#blackName");

const whiteClockEl =
  $("#whiteClock");

const blackClockEl =
  $("#blackClock");

const whitePlayer =
  $("#whitePlayer");

const blackPlayer =
  $("#blackPlayer");

const aiThinking =
  $("#aiThinking");

const muteBtn =
  $("#muteBtn");

const restartBtn =
  $("#restartBtn");

const resignBtn =
  $("#resignBtn");

const newGameBtn =
  $("#newGameBtn");


/* =========================================================
   UPDATE OLD AIRCHESS TEXT AUTOMATICALLY
========================================================= */

const mainHeading =
  document.querySelector(".logo h1")
  || document.querySelector(".brand h1")
  || document.querySelector("h1");

if (mainHeading) {
  mainHeading.textContent =
    "Ghost Board";
}

const smallBrand =
  document.querySelector(".brand-small")
  || document.querySelector(".mini-brand");

if (smallBrand) {
  smallBrand.textContent =
    "👻 Ghost Board";
}

if (startGameBtn) {
  startGameBtn.textContent =
    "START GHOST BOARD";
}


/* =========================================================
   VISUAL PATCH

   This fixes:
   - board being too large/cropped
   - transparency making pieces hard to see
   - inconsistent white/black piece appearance
   - hover feedback
   - circular hover timer
========================================================= */

const stylePatch =
  document.createElement("style");

stylePatch.id =
  "ghostboard-hover-patch";

stylePatch.textContent = `

  /* Board is positioned/sized by JavaScript */
  #board.chessboard {
    position: absolute !important;

    left: 50% !important;
    top: 50% !important;

    transform:
      translate(-50%, -50%) !important;

    display: grid !important;

    grid-template-columns:
      repeat(8, 1fr) !important;

    grid-template-rows:
      repeat(8, 1fr) !important;

    border-radius: 12px !important;

    overflow: hidden !important;

    border:
      4px solid rgba(12, 12, 18, 0.92) !important;

    outline:
      1px solid rgba(255, 255, 255, 0.28);

    box-shadow:
      0 20px 55px rgba(0, 0, 0, 0.58),
      0 0 35px rgba(120, 80, 220, 0.14) !important;
  }


  /* Remove transparent-looking board squares */
  #board .square.light {
    background:
      var(--light-square) !important;
  }

  #board .square.dark {
    background:
      var(--dark-square) !important;
  }


  #board .square {
    position: relative;

    display: flex;

    align-items: center;
    justify-content: center;

    overflow: hidden;

    font-family:
      "Segoe UI Symbol",
      "Arial Unicode MS",
      serif !important;
  }


  /* Finger currently above this square */
  #board .square.ghost-hover {
    box-shadow:
      inset 0 0 0 100px
      rgba(255, 255, 255, 0.17);
  }


  /* Currently selected piece */
  #board .square.selected {
    box-shadow:
      inset 0 0 0 5px
      var(--selected) !important;
  }


  /* Last move */
  #board .square.last-move {
    box-shadow:
      inset 0 0 0 100px
      rgba(255, 220, 60, 0.19) !important;
  }


  /* Legal empty destination */
  #board .square.legal::after {
    content: "";

    width: 22%;
    aspect-ratio: 1;

    position: absolute;

    border-radius: 50%;

    background:
      rgba(255, 255, 255, 0.72) !important;

    box-shadow:
      0 0 12px
      rgba(255, 255, 255, 0.30);
  }


  /* Legal capture */
  #board .square.legal.has-piece::after {
    width: 72%;
    height: 72%;

    background:
      transparent !important;

    border:
      4px solid
      rgba(255, 255, 255, 0.70);

    border-radius: 50%;
  }


  /* Filled pieces for BOTH sides */
  #board .piece {
    z-index: 2;

    line-height: 1;

    pointer-events: none;

    transform:
      translateY(-1px);

    filter:
      drop-shadow(
        0 3px 2px
        rgba(0, 0, 0, 0.50)
      ) !important;
  }


  #board .white-piece {
    color:
      #f7f7fa !important;

    text-shadow:
      0 1px 1px black,
      0 0 2px black !important;
  }


  #board .black-piece {
    color:
      #0d0d12 !important;

    text-shadow:
      0 1px 1px
      rgba(255, 255, 255, 0.22) !important;
  }


  /* Cursor */
  #handCursor {
    --ghost-progress: 0deg;

    width: 48px !important;
    height: 48px !important;

    pointer-events:
      none !important;

    z-index:
      999 !important;
  }


  #handCursor .cursor-ring {
    position: absolute;

    inset: 0;

    border:
      none !important;

    border-radius:
      50%;

    background:
      conic-gradient(
        var(--accent)
        var(--ghost-progress),

        rgba(255,255,255,0.20)
        0deg
      );

    -webkit-mask:
      radial-gradient(
        farthest-side,
        transparent
        calc(100% - 4px),

        #000 0
      );

    mask:
      radial-gradient(
        farthest-side,
        transparent
        calc(100% - 4px),

        #000 0
      );
  }


  #handCursor .cursor-dot {
    width: 11px !important;
    height: 11px !important;

    background:
      white !important;

    box-shadow:
      0 0 14px white !important;
  }


  #handCursor.ghost-ready
  .cursor-dot {
    background:
      var(--accent) !important;

    box-shadow:
      0 0 22px
      var(--accent) !important;
  }


  /* Slightly clearer camera */
  #cameraStage .camera-shade,
  #cameraStage .camera-tint {
    background:
      linear-gradient(
        to bottom,
        rgba(0, 0, 0, 0.04),
        rgba(0, 0, 0, 0.17)
      ) !important;
  }

`;

document.head.appendChild(
  stylePatch
);


/* =========================================================
   CHESS
========================================================= */

let game =
  new Chess();

let settings =
  null;

let selectedSquare =
  null;

let legalTargets =
  [];

let lastMove =
  null;

let hoveredSquare =
  null;

let gameActive =
  false;

let aiBusy =
  false;


/* =========================================================
   PIECES

   Using the FILLED symbols for both sides.
   CSS changes the color.
========================================================= */

const PIECES = {

  wp: "♟",
  wn: "♞",
  wb: "♝",
  wr: "♜",
  wq: "♛",
  wk: "♚",

  bp: "♟",
  bn: "♞",
  bb: "♝",
  br: "♜",
  bq: "♛",
  bk: "♚"
};


const FILES = [
  "a",
  "b",
  "c",
  "d",
  "e",
  "f",
  "g",
  "h"
];


/* =========================================================
   HOVER CONTROL

   No pinch.

   Hold over a square for this long
   to activate it.
========================================================= */

const HOVER_TIME_MS =
  520;


/*
  Hand smoothing.

  Higher = faster but shakier.
  Lower = smoother but slower.
*/

const SMOOTHING =
  0.34;


let currentHoverSquare =
  null;

let hoverStartTime =
  0;

let lastActivatedSquare =
  null;

let smoothX =
  null;

let smoothY =
  null;


/* =========================================================
   CLOCK
========================================================= */

let whiteTimeMs =
  300000;

let blackTimeMs =
  300000;

let incrementMs =
  0;

let lastClockTick =
  0;

let clockTimer =
  null;


/* =========================================================
   CAMERA / HAND TRACKING
========================================================= */

let cameraStream =
  null;

let handLandmarker =
  null;

let handLoopStarted =
  false;


/* =========================================================
   SOUND
========================================================= */

let soundEnabled =
  true;

let audioContext =
  null;


/* =========================================================
   SETUP SCREEN
========================================================= */

function updateModeUI() {

  const aiMode =
    gameModeInput.value === "ai";

  difficultyField
    ?.classList
    .toggle(
      "hidden",
      !aiMode
    );

  player2Field
    ?.classList
    .toggle(
      "hidden",
      aiMode
    );
}


gameModeInput
  ?.addEventListener(
    "change",
    updateModeUI
  );


updateModeUI();


timeControlInput
  ?.addEventListener(
    "change",
    () => {

      customTime
        ?.classList
        .toggle(
          "hidden",
          timeControlInput.value
          !== "custom"
        );
    }
  );


boardThemeInput
  ?.addEventListener(
    "change",
    () => {

      app.dataset.theme =
        boardThemeInput.value;

      if (liveTheme) {

        liveTheme.value =
          boardThemeInput.value;
      }
    }
  );


liveTheme
  ?.addEventListener(
    "change",
    () => {

      app.dataset.theme =
        liveTheme.value;

      localStorage.setItem(
        "ghostboard-theme",
        liveTheme.value
      );
    }
  );


/* =========================================================
   EMOJI / STICKERS
========================================================= */

document
  .querySelectorAll(
    ".emoji-btn, .sticker"
  )
  .forEach(
    (button) => {

      button.addEventListener(
        "click",
        () => {

          const emoji =
            button.textContent.trim();

          player1NameInput.value =
            `${player1NameInput.value.trim()} ${emoji}`.trim();
        }
      );
    }
  );


/* =========================================================
   LOAD SAVED USER
========================================================= */

const savedName =
  localStorage.getItem(
    "ghostboard-name"
  );

const savedTheme =
  localStorage.getItem(
    "ghostboard-theme"
  );


if (savedName) {

  player1NameInput.value =
    savedName;
}


if (savedTheme) {

  if (boardThemeInput) {

    boardThemeInput.value =
      savedTheme;
  }

  if (liveTheme) {

    liveTheme.value =
      savedTheme;
  }

  app.dataset.theme =
    savedTheme;
}


/* =========================================================
   SETTINGS
========================================================= */

function collectSettings() {

  let minutes;
  let increment;


  if (
    timeControlInput.value
    === "custom"
  ) {

    minutes =
      Math.max(
        1,
        Number(
          customMinutes.value
        ) || 1
      );

    increment =
      Math.max(
        0,
        Number(
          customIncrement.value
        ) || 0
      );

  } else {

    [
      minutes,
      increment
    ] =
      timeControlInput
        .value
        .split(",")
        .map(Number);
  }


  return {

    mode:
      gameModeInput.value,

    whiteName:
      player1NameInput
        .value
        .trim()
      || "Player",

    blackName:
      gameModeInput.value
      === "ai"

        ? "Nova AI 🤖"

        : (
          player2NameInput
            ?.value
            .trim()
          || "Player 2"
        ),

    difficulty:
      difficultyInput.value,

    minutes,

    increment,

    theme:
      boardThemeInput.value,

    sound:
      soundToggle.checked
  };
}


/* =========================================================
   START GAME
========================================================= */

startGameBtn
  ?.addEventListener(
    "click",
    async () => {

      startGameBtn.disabled =
        true;

      setupMessage.textContent =
        "Starting camera and hand tracking...";


      try {

        settings =
          collectSettings();

        soundEnabled =
          settings.sound;

        app.dataset.theme =
          settings.theme;


        if (liveTheme) {

          liveTheme.value =
            settings.theme;
        }


        localStorage.setItem(
          "ghostboard-name",
          settings.whiteName
        );

        localStorage.setItem(
          "ghostboard-theme",
          settings.theme
        );


        await startCamera();

        await initHandTracking();


        setupScreen.classList.add(
          "hidden"
        );

        gameScreen.classList.remove(
          "hidden"
        );


        initializeGame();


        /*
          Wait for layout,
          then correctly fit board.
        */

        requestAnimationFrame(
          () => {

            fitBoardToCamera();
          }
        );


        if (!handLoopStarted) {

          handLoopStarted =
            true;

          requestAnimationFrame(
            handTrackingLoop
          );
        }

      } catch (error) {

        console.error(
          error
        );

        setupMessage.textContent =
          "Could not start Ghost Board. Allow camera permission and try again.";

      } finally {

        startGameBtn.disabled =
          false;
      }
    }
  );


/* =========================================================
   BOARD SIZE FIX

   Board size is calculated from BOTH camera width
   and camera height.

   This prevents the board from being cut off.
========================================================= */

function fitBoardToCamera() {

  if (
    !cameraStage
    || !boardEl
  ) {
    return;
  }


  const rect =
    cameraStage
      .getBoundingClientRect();


  if (
    rect.width === 0
    || rect.height === 0
  ) {
    return;
  }


  const size =
    Math.min(

      rect.width * 0.70,

      rect.height * 0.88
    );


  boardEl.style.width =
    `${size}px`;

  boardEl.style.height =
    `${size}px`;


  /*
    Piece size based on square size.
  */

  const pieceSize =
    size / 8 * 0.72;

  boardEl.style.fontSize =
    `${pieceSize}px`;


  boardEl
    .querySelectorAll(
      ".square"
    )
    .forEach(
      (square) => {

        square.style.fontSize =
          `${pieceSize}px`;
      }
    );
}


window.addEventListener(
  "resize",
  fitBoardToCamera
);


/* =========================================================
   CAMERA
========================================================= */

async function startCamera() {

  if (cameraStream) {
    return;
  }


  if (
    !navigator
      .mediaDevices
      ?.getUserMedia
  ) {

    throw new Error(
      "Camera API unavailable."
    );
  }


  cameraStream =
    await navigator
      .mediaDevices
      .getUserMedia({

        video: {

          facingMode:
            "user",

          width: {
            ideal: 1280
          },

          height: {
            ideal: 720
          }
        },

        audio:
          false
      });


  webcam.srcObject =
    cameraStream;


  await webcam.play();
}


/* =========================================================
   MEDIAPIPE HAND TRACKER
========================================================= */

async function createLandmarker(
  vision,
  delegate
) {

  return HandLandmarker
    .createFromOptions(
      vision,
      {

        baseOptions: {

          modelAssetPath:
            "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",

          delegate
        },

        runningMode:
          "VIDEO",

        numHands:
          1,

        minHandDetectionConfidence:
          0.55,

        minHandPresenceConfidence:
          0.55,

        minTrackingConfidence:
          0.5
      }
    );
}


async function initHandTracking() {

  if (handLandmarker) {
    return;
  }


  const vision =
    await FilesetResolver
      .forVisionTasks(

        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm"
      );


  /*
    Try GPU first.
    Fall back to CPU.
  */

  try {

    handLandmarker =
      await createLandmarker(
        vision,
        "GPU"
      );

  } catch (gpuError) {

    console.warn(
      "GPU tracking failed. Using CPU.",
      gpuError
    );


    handLandmarker =
      await createLandmarker(
        vision,
        "CPU"
      );
  }
}


/* =========================================================
   HAND TRACKING LOOP
========================================================= */

function handTrackingLoop() {

  if (
    !handLandmarker
    || webcam.readyState < 2
  ) {

    requestAnimationFrame(
      handTrackingLoop
    );

    return;
  }


  const now =
    performance.now();


  try {

    const result =
      handLandmarker
        .detectForVideo(
          webcam,
          now
        );


    processHand(
      result,
      now
    );

  } catch (error) {

    console.error(
      "Hand tracking error:",
      error
    );
  }


  requestAnimationFrame(
    handTrackingLoop
  );
}


/* =========================================================
   PROCESS HAND

   NO PINCH.

   INDEX TIP = CURSOR
========================================================= */

function processHand(
  result,
  now
) {

  if (
    !result.landmarks
    || result.landmarks.length === 0
  ) {

    handCursor.classList.add(
      "hidden"
    );

    resetHover();

    setHoveredSquare(
      null
    );

    smoothX =
      null;

    smoothY =
      null;

    return;
  }


  const hand =
    result.landmarks[0];


  /*
    Landmark 8 =
    index fingertip.
  */

  const indexTip =
    hand[8];


  const stageRect =
    cameraStage
      .getBoundingClientRect();


  /*
    Camera is mirrored,
    so X is mirrored too.
  */

  const rawX =
    (1 - indexTip.x)
    * stageRect.width;

  const rawY =
    indexTip.y
    * stageRect.height;


  /*
    Smooth cursor.

    Makes the hand pointer much
    less shaky.
  */

  if (smoothX === null) {

    smoothX =
      rawX;

    smoothY =
      rawY;

  } else {

    smoothX +=
      (
        rawX
        - smoothX
      )
      * SMOOTHING;

    smoothY +=
      (
        rawY
        - smoothY
      )
      * SMOOTHING;
  }


  handCursor.classList.remove(
    "hidden"
  );


  handCursor.style.left =
    `${smoothX}px`;

  handCursor.style.top =
    `${smoothY}px`;


  const square =
    squareFromPoint(

      stageRect.left
      + smoothX,

      stageRect.top
      + smoothY
    );


  setHoveredSquare(
    square
  );


  /*
    Nothing to activate.
  */

  if (
    !square
    || !gameActive
    || aiBusy
  ) {

    resetHoverProgress();

    return;
  }


  /*
    Human only controls White
    in AI mode.
  */

  if (
    settings.mode === "ai"
    && game.turn() === "b"
  ) {

    resetHoverProgress();

    return;
  }


  /*
    User moved away from the square
    that was previously activated.

    It may now be activated again later.
  */

  if (
    lastActivatedSquare
    && square !== lastActivatedSquare
  ) {

    lastActivatedSquare =
      null;
  }


  /*
    Don't keep activating a square
    while the finger stays there.
  */

  if (
    lastActivatedSquare === square
  ) {

    setCursorProgress(
      0
    );

    return;
  }


  /*
    IMPORTANT UX improvement:

    Only fill the hover timer if the
    square actually has a useful action.

    This prevents random accidental
    illegal-move sounds.
  */

  if (
    !isActionableSquare(
      square
    )
  ) {

    resetHoverProgress();

    return;
  }


  /*
    Finger arrived on a new square.
  */

  if (
    currentHoverSquare
    !== square
  ) {

    currentHoverSquare =
      square;

    hoverStartTime =
      now;

    setCursorProgress(
      0
    );

    return;
  }


  /*
    Finger stayed over same square.
  */

  const elapsed =
    now
    - hoverStartTime;


  const progress =
    Math.min(
      1,
      elapsed
      / HOVER_TIME_MS
    );


  setCursorProgress(
    progress
  );


  /*
    Hover complete.
  */

  if (
    progress >= 1
  ) {

    handleSquareInput(
      square
    );


    lastActivatedSquare =
      square;


    currentHoverSquare =
      null;

    hoverStartTime =
      0;


    setCursorProgress(
      0
    );


    handCursor.classList.add(
      "ghost-ready"
    );


    setTimeout(
      () => {

        handCursor
          .classList
          .remove(
            "ghost-ready"
          );
      },

      150
    );
  }
}


/* =========================================================
   ACTIONABLE SQUARE

   This is what makes hover controls
   much easier than simply activating
   every square.
========================================================= */

function isActionableSquare(
  square
) {

  const piece =
    game.get(
      square
    );


  /*
    Nothing selected yet:

    Only allow your own pieces.
  */

  if (!selectedSquare) {

    return (
      piece
      && piece.color
      === game.turn()
    );
  }


  /*
    Hover selected piece again:
    allow cancellation.
  */

  if (
    square
    === selectedSquare
  ) {

    return true;
  }


  /*
    Another piece belonging
    to the current player:

    allow switching selection.
  */

  if (
    piece
    && piece.color
    === game.turn()
  ) {

    return true;
  }


  /*
    Otherwise only allow
    legal destinations.
  */

  return legalTargets
    .includes(
      square
    );
}


/* =========================================================
   HOVER HELPERS
========================================================= */

function resetHover() {

  currentHoverSquare =
    null;

  hoverStartTime =
    0;

  lastActivatedSquare =
    null;

  setCursorProgress(
    0
  );
}


function resetHoverProgress() {

  currentHoverSquare =
    null;

  hoverStartTime =
    0;

  setCursorProgress(
    0
  );
}


function setCursorProgress(
  progress
) {

  const degrees =
    Math.round(
      progress * 360
    );


  handCursor.style
    .setProperty(
      "--ghost-progress",
      `${degrees}deg`
    );
}


/* =========================================================
   HOVERED BOARD SQUARE
========================================================= */

function setHoveredSquare(
  square
) {

  if (
    hoveredSquare
    === square
  ) {

    return;
  }


  hoveredSquare =
    square;


  /*
    Avoid rebuilding entire board
    every camera frame.

    Just toggle hover classes.
  */

  boardEl
    .querySelectorAll(
      ".square"
    )
    .forEach(
      (element) => {

        element
          .classList
          .toggle(

            "ghost-hover",

            element.dataset.square
            === square
          );
      }
    );
}


/* =========================================================
   CURSOR → CHESS SQUARE
========================================================= */

function squareFromPoint(
  clientX,
  clientY
) {

  const rect =
    boardEl
      .getBoundingClientRect();


  if (
    clientX < rect.left
    || clientX > rect.right
    || clientY < rect.top
    || clientY > rect.bottom
  ) {

    return null;
  }


  const relativeX =
    (
      clientX
      - rect.left
    )
    / rect.width;


  const relativeY =
    (
      clientY
      - rect.top
    )
    / rect.height;


  const col =
    Math.min(
      7,
      Math.max(
        0,
        Math.floor(
          relativeX * 8
        )
      )
    );


  const row =
    Math.min(
      7,
      Math.max(
        0,
        Math.floor(
          relativeY * 8
        )
      )
    );


  return (
    `${FILES[col]}${8 - row}`
  );
}


/* =========================================================
   INITIALIZE GAME
========================================================= */

function initializeGame() {

  game =
    new Chess();


  selectedSquare =
    null;

  legalTargets =
    [];

  lastMove =
    null;

  hoveredSquare =
    null;

  gameActive =
    true;

  aiBusy =
    false;


  resetHover();


  whiteTimeMs =
    settings.minutes
    * 60
    * 1000;


  blackTimeMs =
    settings.minutes
    * 60
    * 1000;


  incrementMs =
    settings.increment
    * 1000;


  whiteNameEl.textContent =
    settings.whiteName;


  blackNameEl.textContent =
    settings.blackName;


  aiThinking.classList.add(
    "hidden"
  );


  renderBoard();

  renderHistory();

  updateStatus();

  updateGestureHint();

  startClock();


  requestAnimationFrame(
    fitBoardToCamera
  );
}


/* =========================================================
   RENDER BOARD
========================================================= */

function renderBoard() {

  boardEl.innerHTML =
    "";


  for (
    let row = 0;
    row < 8;
    row++
  ) {

    for (
      let col = 0;
      col < 8;
      col++
    ) {

      const squareName =
        `${FILES[col]}${8 - row}`;


      const square =
        document.createElement(
          "div"
        );


      square.className =
        "square";


      square.dataset.square =
        squareName;


      square.classList.add(

        (row + col) % 2 === 0

          ? "light"

          : "dark"
      );


      if (
        hoveredSquare
        === squareName
      ) {

        square.classList.add(
          "ghost-hover"
        );
      }


      if (
        selectedSquare
        === squareName
      ) {

        square.classList.add(
          "selected"
        );
      }


      if (
        legalTargets
          .includes(
            squareName
          )
      ) {

        square.classList.add(
          "legal"
        );
      }


      if (
        lastMove
        && (
          lastMove.from
          === squareName

          ||

          lastMove.to
          === squareName
        )
      ) {

        square.classList.add(
          "last-move"
        );
      }


      const piece =
        game.get(
          squareName
        );


      if (piece) {

        square.classList.add(
          "has-piece"
        );


        const pieceElement =
          document.createElement(
            "span"
          );


        pieceElement.className =
          `piece ${
            piece.color === "w"

              ? "white-piece"

              : "black-piece"
          }`;


        pieceElement.textContent =
          PIECES[
            `${piece.color}${piece.type}`
          ];


        square.appendChild(
          pieceElement
        );
      }


      boardEl.appendChild(
        square
      );
    }
  }


  /*
    Recalculate piece size after
    rendering.
  */

  requestAnimationFrame(
    fitBoardToCamera
  );
}


/* =========================================================
   MOUSE FALLBACK

   Keep this for debugging.
========================================================= */

boardEl.addEventListener(
  "click",
  (event) => {

    const square =
      event.target
        .closest(
          ".square"
        );


    if (square) {

      handleSquareInput(
        square.dataset.square
      );
    }
  }
);


/* =========================================================
   HANDLE SQUARE
========================================================= */

function handleSquareInput(
  square
) {

  if (
    !gameActive
    || aiBusy
  ) {

    return;
  }


  if (
    settings.mode === "ai"
    && game.turn() === "b"
  ) {

    return;
  }


  /*
    No piece selected.
  */

  if (!selectedSquare) {

    selectSquare(
      square
    );

    return;
  }


  /*
    Hover selected piece again =
    cancel.
  */

  if (
    square
    === selectedSquare
  ) {

    clearSelection();

    return;
  }


  const clickedPiece =
    game.get(
      square
    );


  /*
    Hover another own piece =
    switch selection.
  */

  if (
    clickedPiece
    && clickedPiece.color
    === game.turn()
  ) {

    selectSquare(
      square
    );

    return;
  }


  /*
    Only attempt legal destination.
  */

  if (
    legalTargets
      .includes(
        square
      )
  ) {

    tryMove(
      selectedSquare,
      square
    );
  }
}


/* =========================================================
   SELECT PIECE
========================================================= */

function selectSquare(
  square
) {

  const piece =
    game.get(
      square
    );


  if (
    !piece
    || piece.color
    !== game.turn()
  ) {

    return;
  }


  selectedSquare =
    square;


  legalTargets =
    game
      .moves({

        square,

        verbose:
          true
      })
      .map(
        (move) =>
          move.to
      );


  renderBoard();

  playUiTone(
    "select"
  );

  updateGestureHint();
}


/* =========================================================
   CLEAR SELECTION
========================================================= */

function clearSelection() {

  selectedSquare =
    null;

  legalTargets =
    [];

  renderBoard();

  updateGestureHint();
}


/* =========================================================
   HINT
========================================================= */

function updateGestureHint() {

  if (!gestureHint) {
    return;
  }


  if (aiBusy) {

    gestureHint.textContent =
      "🤖 AI is thinking...";

    return;
  }


  if (!selectedSquare) {

    gestureHint.textContent =
      "☝ Hover over one of your pieces to select it";

  } else {

    gestureHint.textContent =
      `☝ ${selectedSquare} selected • hover over a highlighted square to move`;
  }
}


/* =========================================================
   MAKE MOVE
========================================================= */

function tryMove(
  from,
  to
) {

  updateClock();


  let move =
    null;


  try {

    move =
      game.move({

        from,

        to,

        promotion:
          "q"
      });

  } catch {

    move =
      null;
  }


  if (!move) {

    lastClockTick =
      performance.now();

    return;
  }


  addIncrement(
    move.color
  );


  lastClockTick =
    performance.now();


  lastMove = {

    from:
      move.from,

    to:
      move.to
  };


  selectedSquare =
    null;

  legalTargets =
    [];


  playMoveSound(
    move
  );


  renderBoard();

  renderHistory();

  updateStatus();

  updateGestureHint();


  if (
    checkEnd()
  ) {

    return;
  }


  if (
    settings.mode === "ai"
    && game.turn() === "b"
  ) {

    scheduleAiMove();
  }
}


/* =========================================================
   AI
========================================================= */

function scheduleAiMove() {

  aiBusy =
    true;


  aiThinking
    .classList
    .remove(
      "hidden"
    );


  updateGestureHint();


  setTimeout(
    () => {

      if (!gameActive) {

        finishAiThinking();

        return;
      }


      makeAiMove();
    },

    settings.difficulty
    === "expert"

      ? 420

      : 280
  );
}


function finishAiThinking() {

  aiBusy =
    false;


  aiThinking
    .classList
    .add(
      "hidden"
    );


  updateGestureHint();
}


function makeAiMove() {

  updateClock();


  const move =
    chooseAiMove();


  if (!move) {

    finishAiThinking();

    checkEnd();

    return;
  }


  const result =
    game.move({

      from:
        move.from,

      to:
        move.to,

      promotion:
        move.promotion
        || "q"
    });


  addIncrement(
    result.color
  );


  lastClockTick =
    performance.now();


  lastMove = {

    from:
      result.from,

    to:
      result.to
  };


  playMoveSound(
    result
  );


  finishAiThinking();


  renderBoard();

  renderHistory();

  updateStatus();

  checkEnd();
}


/* =========================================================
   SIMPLE BUILT-IN AI
========================================================= */

function chooseAiMove() {

  const moves =
    game.moves({
      verbose: true
    });


  if (!moves.length) {

    return null;
  }


  /*
    Easy:
    often random.
  */

  if (
    settings.difficulty
    === "easy"

    && Math.random()
    < 0.68
  ) {

    return moves[
      Math.floor(
        Math.random()
        * moves.length
      )
    ];
  }


  const depth = {

    easy:
      1,

    medium:
      2,

    hard:
      2,

    expert:
      3

  }[
    settings.difficulty
  ] || 2;


  let bestScore =
    -Infinity;


  let bestMoves =
    [];


  for (
    const move
    of moves
  ) {

    const clone =
      new Chess(
        game.fen()
      );


    clone.move({

      from:
        move.from,

      to:
        move.to,

      promotion:
        move.promotion
        || "q"
    });


    const score =
      minimax(

        clone,

        depth - 1,

        -Infinity,

        Infinity,

        false
      );


    if (
      score > bestScore
    ) {

      bestScore =
        score;

      bestMoves =
        [move];

    } else if (
      score === bestScore
    ) {

      bestMoves.push(
        move
      );
    }
  }


  return bestMoves[
    Math.floor(
      Math.random()
      * bestMoves.length
    )
  ];
}


/* =========================================================
   MINIMAX
========================================================= */

function minimax(
  chess,
  depth,
  alpha,
  beta,
  maximizingBlack
) {

  if (
    depth <= 0
    || chess.isGameOver()
  ) {

    return evaluate(
      chess
    );
  }


  const moves =
    chess.moves({
      verbose: true
    });


  if (maximizingBlack) {

    let best =
      -Infinity;


    for (
      const move
      of moves
    ) {

      const child =
        new Chess(
          chess.fen()
        );


      child.move({

        from:
          move.from,

        to:
          move.to,

        promotion:
          move.promotion
          || "q"
      });


      best =
        Math.max(

          best,

          minimax(

            child,

            depth - 1,

            alpha,

            beta,

            false
          )
        );


      alpha =
        Math.max(
          alpha,
          best
        );


      if (
        beta <= alpha
      ) {

        break;
      }
    }


    return best;
  }


  let best =
    Infinity;


  for (
    const move
    of moves
  ) {

    const child =
      new Chess(
        chess.fen()
      );


    child.move({

      from:
        move.from,

      to:
        move.to,

      promotion:
        move.promotion
        || "q"
    });


    best =
      Math.min(

        best,

        minimax(

          child,

          depth - 1,

          alpha,

          beta,

          true
        )
      );


    beta =
      Math.min(
        beta,
        best
      );


    if (
      beta <= alpha
    ) {

      break;
    }
  }


  return best;
}


/* =========================================================
   EVALUATION
========================================================= */

function evaluate(
  chess
) {

  if (
    chess.isCheckmate()
  ) {

    return (
      chess.turn() === "w"

        ? 100000

        : -100000
    );
  }


  const values = {

    p:
      100,

    n:
      320,

    b:
      330,

    r:
      500,

    q:
      900,

    k:
      0
  };


  let score =
    0;


  for (
    const row
    of chess.board()
  ) {

    for (
      const piece
      of row
    ) {

      if (!piece) {
        continue;
      }


      score +=

        piece.color
        === "b"

          ? values[
              piece.type
            ]

          : -values[
              piece.type
            ];
    }
  }


  /*
    Tiny center bonus.
  */

  for (
    const square
    of [
      "d4",
      "e4",
      "d5",
      "e5"
    ]
  ) {

    const piece =
      chess.get(
        square
      );


    if (!piece) {
      continue;
    }


    score +=

      piece.color
      === "b"

        ? 12

        : -12;
  }


  return score;
}


/* =========================================================
   CLOCK
========================================================= */

function startClock() {

  clearInterval(
    clockTimer
  );


  lastClockTick =
    performance.now();


  renderClocks();


  clockTimer =
    setInterval(
      () => {

        if (!gameActive) {

          return;
        }


        updateClock();

        renderClocks();


        if (
          whiteTimeMs <= 0
          || blackTimeMs <= 0
        ) {

          endOnTime();
        }

      },

      100
    );
}


function updateClock() {

  if (!gameActive) {
    return;
  }


  const now =
    performance.now();


  const elapsed =
    now
    - lastClockTick;


  lastClockTick =
    now;


  if (
    game.turn()
    === "w"
  ) {

    whiteTimeMs -=
      elapsed;

  } else {

    blackTimeMs -=
      elapsed;
  }


  whiteTimeMs =
    Math.max(
      0,
      whiteTimeMs
    );


  blackTimeMs =
    Math.max(
      0,
      blackTimeMs
    );
}


function addIncrement(
  color
) {

  if (
    color === "w"
  ) {

    whiteTimeMs +=
      incrementMs;

  } else {

    blackTimeMs +=
      incrementMs;
  }
}


function formatClock(
  milliseconds
) {

  const totalSeconds =
    Math.ceil(
      milliseconds
      / 1000
    );


  const minutes =
    Math.floor(
      totalSeconds
      / 60
    );


  const seconds =
    totalSeconds
    % 60;


  return (
    `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
  );
}


function renderClocks() {

  whiteClockEl.textContent =
    formatClock(
      whiteTimeMs
    );


  blackClockEl.textContent =
    formatClock(
      blackTimeMs
    );


  whiteClockEl
    .classList
    .toggle(

      "low-time",

      whiteTimeMs
      <= 10000
    );


  blackClockEl
    .classList
    .toggle(

      "low-time",

      blackTimeMs
      <= 10000
    );


  whitePlayer
    .classList
    .toggle(

      "active-player",

      gameActive
      && game.turn()
      === "w"
    );


  blackPlayer
    .classList
    .toggle(

      "active-player",

      gameActive
      && game.turn()
      === "b"
    );
}


function endOnTime() {

  if (!gameActive) {

    return;
  }


  gameActive =
    false;


  clearInterval(
    clockTimer
  );


  const winner =

    whiteTimeMs <= 0

      ? settings.blackName

      : settings.whiteName;


  gameStatus.textContent =
    `⏱ ${winner} wins on time`;


  playUiTone(
    "gameover"
  );
}


/* =========================================================
   STATUS
========================================================= */

function updateStatus() {

  if (!gameActive) {

    return;
  }


  const side =

    game.turn()
    === "w"

      ? "White"

      : "Black";


  if (
    game.inCheck()
  ) {

    gameStatus.textContent =
      `⚠ ${side} is in check`;

  } else {

    gameStatus.textContent =
      `${side} to move`;
  }


  renderClocks();
}


/* =========================================================
   GAME END
========================================================= */

function checkEnd() {

  if (
    !game.isGameOver()
  ) {

    return false;
  }


  gameActive =
    false;


  clearInterval(
    clockTimer
  );


  if (
    game.isCheckmate()
  ) {

    const winner =

      game.turn()
      === "w"

        ? settings.blackName

        : settings.whiteName;


    gameStatus.textContent =
      `♛ Checkmate — ${winner} wins`;

  } else if (
    game.isStalemate()
  ) {

    gameStatus.textContent =
      "½–½ Stalemate";

  } else if (
    game.isThreefoldRepetition()
  ) {

    gameStatus.textContent =
      "½–½ Draw by repetition";

  } else if (
    game.isInsufficientMaterial()
  ) {

    gameStatus.textContent =
      "½–½ Draw — insufficient material";

  } else if (
    game.isDraw()
  ) {

    gameStatus.textContent =
      "½–½ Draw";

  } else {

    gameStatus.textContent =
      "Game over";
  }


  playUiTone(
    "gameover"
  );


  return true;
}


/* =========================================================
   MOVE HISTORY
========================================================= */

function renderHistory() {

  const history =
    game.history();


  if (
    history.length === 0
  ) {

    moveHistoryEl.innerHTML =
      '<div class="empty-history">Moves will appear here.</div>';

    return;
  }


  moveHistoryEl.innerHTML =
    "";


  for (
    let index = 0;
    index < history.length;
    index += 2
  ) {

    const row =
      document.createElement(
        "div"
      );


    row.className =
      "move-row";


    const number =
      document.createElement(
        "span"
      );


    number.className =
      "move-num move-number";


    number.textContent =
      `${Math.floor(index / 2) + 1}.`;


    const white =
      document.createElement(
        "span"
      );


    white.textContent =
      history[index]
      || "";


    const black =
      document.createElement(
        "span"
      );


    black.textContent =
      history[index + 1]
      || "";


    row.append(
      number,
      white,
      black
    );


    moveHistoryEl
      .appendChild(
        row
      );
  }


  moveHistoryEl.scrollTop =
    moveHistoryEl.scrollHeight;
}


/* =========================================================
   AUDIO
========================================================= */

function ensureAudio() {

  if (!audioContext) {

    audioContext =
      new (
        window.AudioContext
        || window.webkitAudioContext
      )();
  }


  if (
    audioContext.state
    === "suspended"
  ) {

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

  if (!soundEnabled) {

    return;
  }


  ensureAudio();


  const start =
    audioContext.currentTime
    + delay;


  const oscillator =
    audioContext
      .createOscillator();


  const amplifier =
    audioContext
      .createGain();


  oscillator.type =
    type;


  oscillator.frequency
    .setValueAtTime(
      frequency,
      start
    );


  amplifier.gain
    .setValueAtTime(
      gain,
      start
    );


  amplifier.gain
    .exponentialRampToValueAtTime(

      0.0001,

      start
      + duration
    );


  oscillator.connect(
    amplifier
  );


  amplifier.connect(
    audioContext.destination
  );


  oscillator.start(
    start
  );


  oscillator.stop(
    start
    + duration
  );
}


function playUiTone(
  type
) {

  if (!soundEnabled) {

    return;
  }


  if (
    type === "select"
  ) {

    beep(
      700,
      0.05,
      "sine",
      0.025
    );
  }


  if (
    type === "error"
  ) {

    beep(
      180,
      0.06,
      "square",
      0.025
    );


    beep(
      135,
      0.08,
      "square",
      0.02,
      0.065
    );
  }


  if (
    type === "gameover"
  ) {

    beep(
      440,
      0.09,
      "sine",
      0.035
    );


    beep(
      554,
      0.09,
      "sine",
      0.035,
      0.11
    );


    beep(
      659,
      0.18,
      "sine",
      0.04,
      0.22
    );
  }
}


/* =========================================================
   PIECE MOVE SOUNDS
========================================================= */

function playMoveSound(
  move
) {

  if (!soundEnabled) {

    return;
  }


  const baseFrequency = {

    p:
      330,

    n:
      430,

    b:
      500,

    r:
      280,

    q:
      620,

    k:
      220

  }[
    move.piece
  ] || 330;


  beep(
    baseFrequency,
    0.055,
    "triangle",
    0.03
  );


  if (
    move.captured
  ) {

    beep(
      120,
      0.09,
      "square",
      0.022,
      0.055
    );
  }


  if (
    move.san?.includes("+")
    || move.san?.includes("#")
  ) {

    beep(
      820,
      0.08,
      "sine",
      0.025,
      0.11
    );
  }
}


/* =========================================================
   BUTTONS
========================================================= */

muteBtn
  ?.addEventListener(
    "click",
    () => {

      soundEnabled =
        !soundEnabled;


      muteBtn.textContent =

        soundEnabled

          ? "🔊"

          : "🔇";
    }
  );


restartBtn
  ?.addEventListener(
    "click",
    () => {

      if (settings) {

        initializeGame();
      }
    }
  );


resignBtn
  ?.addEventListener(
    "click",
    () => {

      if (!gameActive) {

        return;
      }


      gameActive =
        false;


      clearInterval(
        clockTimer
      );


      const loser =

        game.turn()
        === "w"

          ? settings.whiteName

          : settings.blackName;


      const winner =

        game.turn()
        === "w"

          ? settings.blackName

          : settings.whiteName;


      gameStatus.textContent =
        `${loser} resigned — ${winner} wins`;


      playUiTone(
        "gameover"
      );
    }
  );


newGameBtn
  ?.addEventListener(
    "click",
    () => {

      gameActive =
        false;


      clearInterval(
        clockTimer
      );


      gameScreen.classList.add(
        "hidden"
      );


      setupScreen.classList.remove(
        "hidden"
      );


      setupMessage.textContent =
        "Camera frames are processed locally in your browser for hand tracking.";
    }
  );


/* =========================================================
   CLEANUP
========================================================= */

window.addEventListener(
  "beforeunload",
  () => {

    if (cameraStream) {

      cameraStream
        .getTracks()
        .forEach(
          (track) => {

            track.stop();
          }
        );
    }
  }
);