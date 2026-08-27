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
   FULL MAIN.JS

   - No pinch
   - 0.10 sec hover activation
   - Magnetic square assist
   - Improved king targeting
   - Easy castling:
       King -> Rook
       Rook -> King
       King -> g/c square
   - No gameplay instruction text
========================================================= */

document.title = "Ghost Board";


/* =========================================================
   DOM
========================================================= */

const $ = (selector) =>
  document.querySelector(selector);


const app =
  $("#app");

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
   BRANDING
========================================================= */

const mainHeading =
  document.querySelector(
    ".logo h1, .brand h1, h1"
  );


if (mainHeading) {

  mainHeading.textContent =
    "Ghost Board";
}


const smallBrand =
  document.querySelector(
    ".brand-small, .mini-brand"
  );


if (smallBrand) {

  smallBrand.textContent =
    "👻 Ghost Board";
}


if (startGameBtn) {

  startGameBtn.textContent =
    "START GHOST BOARD";
}


/* =========================================================
   REMOVE ALL OLD GAMEPLAY INSTRUCTIONS
========================================================= */

/*
  Remove the instruction inside
  the camera.
*/

const oldGestureHint =
  $("#gestureHint");


if (oldGestureHint) {

  oldGestureHint.remove();
}


/*
  Remove any instruction previously
  inserted underneath the camera.
*/

const oldBelowHint =
  $("#belowCameraHint");


if (oldBelowHint) {

  oldBelowHint.remove();
}


/*
  Remove the right-side instruction
  card completely.
*/

document
  .querySelectorAll(
    ".instructions, .hand-info"
  )
  .forEach(
    (element) => {

      element.remove();
    }
  );


/* =========================================================
   VISUAL PATCH
========================================================= */

const stylePatch =
  document.createElement(
    "style"
  );


stylePatch.id =
  "ghostboard-runtime-style";


stylePatch.textContent = `

  #board.chessboard {

    position:
      absolute !important;

    left:
      50% !important;

    top:
      50% !important;

    transform:
      translate(-50%, -50%)
      !important;

    display:
      grid !important;

    grid-template-columns:
      repeat(8, 1fr)
      !important;

    grid-template-rows:
      repeat(8, 1fr)
      !important;

    overflow:
      hidden !important;

    border-radius:
      12px !important;

    border:
      4px solid
      rgba(10, 10, 15, .95)
      !important;

    outline:
      1px solid
      rgba(255, 255, 255, .25);

    box-shadow:

      0 20px 55px
      rgba(0, 0, 0, .60),

      0 0 34px
      rgba(130, 85, 230, .16)

      !important;
  }


  #board .square {

    position:
      relative;

    display:
      flex;

    align-items:
      center;

    justify-content:
      center;

    overflow:
      hidden;

    font-family:
      "Segoe UI Symbol",
      "Arial Unicode MS",
      serif !important;
  }


  #board .square.light {

    background:
      var(--light-square)
      !important;
  }


  #board .square.dark {

    background:
      var(--dark-square)
      !important;
  }


  #board .square.ghost-hover {

    box-shadow:

      inset 0 0 0 100px
      rgba(255, 255, 255, .19)

      !important;
  }


  #board .square.selected {

    box-shadow:

      inset 0 0 0 5px
      var(--selected)

      !important;
  }


  #board .square.last-move {

    box-shadow:

      inset 0 0 0 100px
      rgba(255, 220, 60, .20)

      !important;
  }


  #board .square.legal::after {

    content:
      "";

    width:
      22%;

    aspect-ratio:
      1;

    position:
      absolute;

    border-radius:
      50%;

    background:
      rgba(255, 255, 255, .74)
      !important;

    box-shadow:

      0 0 14px
      rgba(255, 255, 255, .30);
  }


  #board
  .square.legal.has-piece::after {

    width:
      73%;

    height:
      73%;

    background:
      transparent !important;

    border:

      4px solid
      rgba(255, 255, 255, .72);

    border-radius:
      50%;
  }


  #board .piece {

    position:
      relative;

    z-index:
      3;

    line-height:
      1;

    pointer-events:
      none;

    transform:
      translateY(-1px);

    filter:

      drop-shadow(
        0 3px 2px
        rgba(0, 0, 0, .48)
      );
  }


  #board .white-piece {

    color:
      #f8f8fa
      !important;

    text-shadow:

      0 1px 1px
      black,

      0 0 2px
      black

      !important;
  }


  #board .black-piece {

    color:
      #0d0d12
      !important;

    text-shadow:

      0 1px 1px
      rgba(255, 255, 255, .23)

      !important;
  }


  #handCursor {

    --ghost-progress:
      0deg;

    width:
      40px !important;

    height:
      40px !important;

    pointer-events:
      none !important;

    z-index:
      999 !important;
  }


  #handCursor .cursor-ring {

    position:
      absolute;

    inset:
      0;

    border:
      none !important;

    border-radius:
      50%;

    background:

      conic-gradient(

        var(--accent)
        var(--ghost-progress),

        rgba(255, 255, 255, .20)
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

    width:
      10px !important;

    height:
      10px !important;

    background:
      white !important;

    box-shadow:

      0 0 14px
      white !important;
  }


  #handCursor.ghost-ready
  .cursor-dot {

    background:
      var(--accent)
      !important;

    box-shadow:

      0 0 22px
      var(--accent)

      !important;
  }


  #cameraStage .camera-shade,
  #cameraStage .camera-tint {

    background:

      linear-gradient(

        to bottom,

        rgba(0, 0, 0, .03),

        rgba(0, 0, 0, .15)
      )

      !important;
  }

`;


document.head.appendChild(
  stylePatch
);


/* =========================================================
   CHESS STATE
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
   AIR CONTROL
========================================================= */

/*
  User requested 0.10 seconds.
*/

const HOVER_TIME_MS =
  100;


/*
  Fairly responsive smoothing.
*/

const SMOOTHING =
  0.62;


/*
  Magnetic assistance.
*/

const MAGNET_RADIUS =
  0.70;


/*
  Slightly stronger king assistance.
*/

const KING_MAGNET_RADIUS =
  0.92;


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
   CAMERA
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
   SETUP UI
========================================================= */

function updateModeUI() {

  const aiMode =

    gameModeInput.value
    === "ai";


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
   STICKERS
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

          player1NameInput.value =

            `${player1NameInput.value.trim()} ${button.textContent.trim()}`.trim();
        }
      );
    }
  );


/* =========================================================
   SAVED SETTINGS
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

  boardThemeInput.value =
    savedTheme;


  if (liveTheme) {

    liveTheme.value =
      savedTheme;
  }


  app.dataset.theme =
    savedTheme;
}


/* =========================================================
   COLLECT SETTINGS
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


        setupScreen
          .classList
          .add(
            "hidden"
          );


        gameScreen
          .classList
          .remove(
            "hidden"
          );


        initializeGame();


        requestAnimationFrame(
          fitBoardToCamera
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
          "Could not start Ghost Board. Allow camera access and try again.";

      } finally {

        startGameBtn.disabled =
          false;
      }
    }
  );


/* =========================================================
   FIT BOARD
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
    !rect.width
    || !rect.height
  ) {

    return;
  }


  const size =

    Math.min(

      rect.width * 0.70,

      rect.height * 0.86
    );


  boardEl.style.width =
    `${size}px`;


  boardEl.style.height =
    `${size}px`;


  const pieceSize =

    size
    / 8
    * 0.72;


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
      "Camera unavailable."
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
   MEDIAPIPE
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
          0.50
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


  try {

    handLandmarker =

      await createLandmarker(

        vision,

        "GPU"
      );

  } catch (error) {

    console.warn(
      "GPU unavailable. Using CPU.",
      error
    );


    handLandmarker =

      await createLandmarker(

        vision,

        "CPU"
      );
  }
}


/* =========================================================
   HAND LOOP
========================================================= */

function handTrackingLoop() {

  if (
    gameScreen
      .classList
      .contains(
        "hidden"
      )
  ) {

    requestAnimationFrame(
      handTrackingLoop
    );


    return;
  }


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
      "Hand tracking:",
      error
    );
  }


  requestAnimationFrame(
    handTrackingLoop
  );
}


/* =========================================================
   PROCESS HAND
========================================================= */

function processHand(
  result,
  now
) {

  if (
    !result.landmarks
    || !result.landmarks.length
  ) {

    handCursor
      .classList
      .add(
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


  const indexTip =
    hand[8];


  const stageRect =

    cameraStage
      .getBoundingClientRect();


  /*
    Mirror the X coordinate because
    the webcam is visually mirrored.
  */

  const rawX =

    (1 - indexTip.x)
    * stageRect.width;


  const rawY =

    indexTip.y
    * stageRect.height;


  /*
    Cursor smoothing.
  */

  if (
    smoothX === null
  ) {

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


  handCursor
    .classList
    .remove(
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


  if (
    !square
    || !gameActive
    || aiBusy
  ) {

    resetHoverProgress();


    return;
  }


  if (
    settings.mode === "ai"
    && game.turn() === "b"
  ) {

    resetHoverProgress();


    return;
  }


  /*
    Once user moves to another square,
    allow previous square to activate
    again later.
  */

  if (
    lastActivatedSquare
    && square
    !== lastActivatedSquare
  ) {

    lastActivatedSquare =
      null;
  }


  if (
    lastActivatedSquare
    === square
  ) {

    setCursorProgress(
      0
    );


    return;
  }


  if (
    !isActionableSquare(
      square
    )
  ) {

    resetHoverProgress();


    return;
  }


  /*
    New square.
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


    handCursor
      .classList
      .add(
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

      70
    );
  }
}


/* =========================================================
   MAGNETIC TARGETING
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


  const squareWidth =
    rect.width / 8;


  const squareHeight =
    rect.height / 8;


  const boardX =
    clientX
    - rect.left;


  const boardY =
    clientY
    - rect.top;


  const rawCol =

    Math.min(

      7,

      Math.max(

        0,

        Math.floor(
          boardX / squareWidth
        )
      )
    );


  const rawRow =

    Math.min(

      7,

      Math.max(

        0,

        Math.floor(
          boardY / squareHeight
        )
      )
    );


  const rawSquare =

    `${FILES[rawCol]}${8 - rawRow}`;


  /*
    VERY IMPORTANT:

    If the user is already physically
    inside an actionable square, use it.

    Do NOT let magnetic snapping steal
    the cursor and move it to a neighbour.

    This especially fixes the king.
  */

  if (
    isActionableSquare(
      rawSquare
    )
  ) {

    return rawSquare;
  }


  const targets =
    getMagneticTargets();


  let nearestSquare =
    null;


  let nearestDistance =
    Infinity;


  let nearestLimit =
    MAGNET_RADIUS;


  for (
    const square
    of targets
  ) {

    const fileIndex =

      FILES.indexOf(
        square[0]
      );


    const rank =

      Number(
        square[1]
      );


    const row =
      8 - rank;


    const centerX =

      (
        fileIndex + 0.5
      )

      * squareWidth;


    const centerY =

      (
        row + 0.5
      )

      * squareHeight;


    const distance =

      Math.hypot(

        (
          boardX - centerX
        )
        / squareWidth,

        (
          boardY - centerY
        )
        / squareHeight
      );


    const piece =

      game.get(
        square
      );


    const radius =

      piece?.type === "k"

        ? KING_MAGNET_RADIUS

        : MAGNET_RADIUS;


    if (
      distance <
      nearestDistance
    ) {

      nearestDistance =
        distance;


      nearestSquare =
        square;


      nearestLimit =
        radius;
    }
  }


  if (
    nearestSquare
    && nearestDistance
    <= nearestLimit
  ) {

    return nearestSquare;
  }


  return rawSquare;
}


/* =========================================================
   MAGNET TARGETS
========================================================= */

function getMagneticTargets() {

  const targets =
    new Set();


  /*
    Own pieces always count.
  */

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

      const square =

        `${FILES[col]}${8 - row}`;


      const piece =

        game.get(
          square
        );


      if (
        piece

        && piece.color
        === game.turn()
      ) {

        targets.add(
          square
        );
      }
    }
  }


  /*
    Legal moves once selected.
  */

  if (selectedSquare) {

    targets.add(
      selectedSquare
    );


    legalTargets
      .forEach(
        (square) => {

          targets.add(
            square
          );
        }
      );
  }


  return [
    ...targets
  ];
}


/* =========================================================
   EASY CASTLING
========================================================= */

/*
  Returns:

  {
    from: "e1",
    to: "g1"
  }

  etc.

  Works with:

  king -> rook
  rook -> king
  king -> g1/c1/g8/c8
*/

function getCastlingMove(
  firstSquare,
  secondSquare
) {

  if (
    !firstSquare
    || !secondSquare
  ) {

    return null;
  }


  const firstPiece =

    game.get(
      firstSquare
    );


  const secondPiece =

    game.get(
      secondSquare
    );


  /*
    Determine whether the first/second
    pair contains a king and rook.
  */

  let kingSquare =
    null;


  let rookSquare =
    null;


  let kingPiece =
    null;


  /*
    KING -> ROOK
  */

  if (
    firstPiece?.type === "k"
    && secondPiece?.type === "r"
    && firstPiece.color
    === secondPiece.color
  ) {

    kingSquare =
      firstSquare;


    rookSquare =
      secondSquare;


    kingPiece =
      firstPiece;
  }


  /*
    ROOK -> KING
  */

  if (
    firstPiece?.type === "r"
    && secondPiece?.type === "k"
    && firstPiece.color
    === secondPiece.color
  ) {

    kingSquare =
      secondSquare;


    rookSquare =
      firstSquare;


    kingPiece =
      secondPiece;
  }


  /*
    KING -> destination square
  */

  if (
    firstPiece?.type === "k"
  ) {

    kingSquare =
      firstSquare;


    kingPiece =
      firstPiece;


    if (
      firstPiece.color === "w"
      && firstSquare === "e1"
    ) {

      if (
        secondSquare === "g1"
      ) {

        rookSquare =
          "h1";
      }


      if (
        secondSquare === "c1"
      ) {

        rookSquare =
          "a1";
      }
    }


    if (
      firstPiece.color === "b"
      && firstSquare === "e8"
    ) {

      if (
        secondSquare === "g8"
      ) {

        rookSquare =
          "h8";
      }


      if (
        secondSquare === "c8"
      ) {

        rookSquare =
          "a8";
      }
    }
  }


  if (
    !kingSquare
    || !rookSquare
    || !kingPiece
  ) {

    return null;
  }


  /*
    Ask chess.js what the king
    can legally do RIGHT NOW.

    This automatically handles:
    - king already moved
    - rook already moved
    - pieces blocking
    - king in check
    - crossing attacked square
  */

  const kingMoves =

    game
      .moves({

        square:
          kingSquare,

        verbose:
          true
      })
      .map(
        (move) =>
          move.to
      );


  /*
    White.
  */

  if (
    kingPiece.color === "w"
    && kingSquare === "e1"
  ) {

    if (
      rookSquare === "h1"
      && kingMoves.includes(
        "g1"
      )
    ) {

      return {

        from:
          "e1",

        to:
          "g1"
      };
    }


    if (
      rookSquare === "a1"
      && kingMoves.includes(
        "c1"
      )
    ) {

      return {

        from:
          "e1",

        to:
          "c1"
      };
    }
  }


  /*
    Black.
  */

  if (
    kingPiece.color === "b"
    && kingSquare === "e8"
  ) {

    if (
      rookSquare === "h8"
      && kingMoves.includes(
        "g8"
      )
    ) {

      return {

        from:
          "e8",

        to:
          "g8"
      };
    }


    if (
      rookSquare === "a8"
      && kingMoves.includes(
        "c8"
      )
    ) {

      return {

        from:
          "e8",

        to:
          "c8"
      };
    }
  }


  return null;
}


/* =========================================================
   ACTIONABLE SQUARE
========================================================= */

function isActionableSquare(
  square
) {

  if (!square) {

    return false;
  }


  const piece =

    game.get(
      square
    );


  /*
    No selection:
    any own piece.
  */

  if (!selectedSquare) {

    return Boolean(

      piece

      && piece.color
      === game.turn()
    );
  }


  /*
    Same piece:
    cancel.
  */

  if (
    square ===
    selectedSquare
  ) {

    return true;
  }


  /*
    CASTLING PAIR.

    This happens before the normal
    own-piece behaviour.
  */

  if (
    getCastlingMove(

      selectedSquare,

      square
    )
  ) {

    return true;
  }


  /*
    Another own piece.
  */

  if (
    piece

    && piece.color
    === game.turn()
  ) {

    return true;
  }


  /*
    Legal destination.
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
   HOVER VISUAL
========================================================= */

function setHoveredSquare(
  square
) {

  if (
    hoveredSquare ===
    square
  ) {

    return;
  }


  hoveredSquare =
    square;


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


  aiThinking
    .classList
    .add(
      "hidden"
    );


  renderBoard();


  renderHistory();


  updateStatus();


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
        legalTargets.includes(
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


  requestAnimationFrame(
    fitBoardToCamera
  );
}


/* =========================================================
   MOUSE FALLBACK
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
   INPUT
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
    First selection.
  */

  if (!selectedSquare) {

    selectSquare(
      square
    );


    return;
  }


  /*
    CASTLING FIRST.

    Must happen BEFORE normal
    own-piece switching.
  */

  const castle =

    getCastlingMove(

      selectedSquare,

      square
    );


  if (castle) {

    tryMove(

      castle.from,

      castle.to
    );


    return;
  }


  /*
    Same piece = cancel.
  */

  if (
    square ===
    selectedSquare
  ) {

    clearSelection();


    return;
  }


  const clickedPiece =

    game.get(
      square
    );


  /*
    Another own piece =
    change selection.
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
    Normal move.
  */

  if (
    legalTargets.includes(
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
}


/* =========================================================
   CLEAR
========================================================= */

function clearSelection() {

  selectedSquare =
    null;


  legalTargets =
    [];


  renderBoard();
}


/* =========================================================
   MOVE
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


  resetHover();


  playMoveSound(
    move
  );


  renderBoard();


  renderHistory();


  updateStatus();


  if (
    checkGameEnd()
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

      : 250
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
}


function makeAiMove() {

  updateClock();


  const move =
    chooseAiMove();


  if (!move) {

    finishAiThinking();


    checkGameEnd();


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


  checkGameEnd();
}


/* =========================================================
   AI MOVE CHOICE
========================================================= */

function chooseAiMove() {

  const moves =

    game.moves({
      verbose: true
    });


  if (!moves.length) {

    return null;
  }


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

      chess.turn()
      === "w"

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


  return score;
}


/* =========================================================
   CHECK HELPER
========================================================= */

function isInCheck(
  chess
) {

  if (
    typeof chess.isCheck
    === "function"
  ) {

    return chess.isCheck();
  }


  if (
    typeof chess.inCheck
    === "function"
  ) {

    return chess.inCheck();
  }


  return false;
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
    game.turn() === "w"
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
      milliseconds / 1000
    );


  const minutes =

    Math.floor(
      totalSeconds / 60
    );


  const seconds =

    totalSeconds % 60;


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

      whiteTimeMs <=
      10000
    );


  blackClockEl
    .classList
    .toggle(

      "low-time",

      blackTimeMs <=
      10000
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

    game.turn() === "w"

      ? "White"

      : "Black";


  gameStatus.textContent =

    isInCheck(game)

      ? `⚠ ${side} is in check`

      : `${side} to move`;


  renderClocks();
}


/* =========================================================
   GAME END
========================================================= */

function checkGameEnd() {

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

      game.turn() === "w"

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


  if (!history.length) {

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

      0.04,

      "sine",

      0.022
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


function playMoveSound(
  move
) {

  if (!soundEnabled) {

    return;
  }


  const base = {

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

    base,

    0.055,

    "triangle",

    0.03
  );


  /*
    Castling gets a small
    double sound.
  */

  if (
    move.flags?.includes("k")
    || move.flags?.includes("q")
  ) {

    beep(

      360,

      0.055,

      "triangle",

      0.025,

      0.07
    );
  }


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

        game.turn() === "w"

          ? settings.whiteName

          : settings.blackName;


      const winner =

        game.turn() === "w"

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


      gameScreen
        .classList
        .add(
          "hidden"
        );


      setupScreen
        .classList
        .remove(
          "hidden"
        );


      handCursor
        .classList
        .add(
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