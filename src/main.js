import "./style.css";

import {
  FilesetResolver,
  HandLandmarker
} from "@mediapipe/tasks-vision";

import { Chess } from "chess.js";

import { initializeApp } from "firebase/app";

import {
  getAuth,
  signInAnonymously
} from "firebase/auth";

import {
  getDatabase,
  ref,
  get,
  set,
  update,
  onValue,
  runTransaction,
  onDisconnect
} from "firebase/database";

import { firebaseConfig } from "./firebase-config.js";


/* =========================================================
   GHOST BOARD
========================================================= */

const BUILD_VERSION =
  "GHOSTBOARD-AI-FAIR-CLOCK-8";

console.log(`Ghost Board ${BUILD_VERSION}`);

document.title = "Ghost Board";

const $ = (selector) =>
  document.querySelector(selector);


/* =========================================================
   DOM
========================================================= */

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

const onlineFields = $("#onlineFields");
const onlineAction = $("#onlineAction");

const roomCodeField = $("#roomCodeField");
const roomCodeInput = $("#roomCodeInput");

const onlineNote = $("#onlineNote");


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

const onlineRoomBar = $("#onlineRoomBar");

const roomCodeLabel = $("#roomCodeLabel");
const copyRoomBtn = $("#copyRoomBtn");

const connectionLabel = $("#connectionLabel");

const waitingOverlay = $("#waitingOverlay");
const waitingText = $("#waitingText");
const waitingCode = $("#waitingCode");

const copyWaitingCodeBtn =
  $("#copyWaitingCodeBtn");


/* =========================================================
   REMOVE OLD INSTRUCTIONS
========================================================= */

document
  .querySelectorAll(
    "#gestureHint, #belowCameraHint, .instructions, .hand-info"
  )
  .forEach((element) => {
    element.remove();
  });


/* =========================================================
   CHESS CONSTANTS
========================================================= */

const FILES = [
  "a", "b", "c", "d",
  "e", "f", "g", "h"
];


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


/* =========================================================
   AIR CONTROL SETTINGS
========================================================= */

const SELECT_DWELL_MS = 120;

const MOVE_DWELL_MS = 200;

const SWITCH_DWELL_MS = 120;


/*
  Cursor responsiveness.
*/
const SMOOTHING = 0.88;


/*
  Source-piece hit area.
*/
const SELECTION_CORE_MARGIN = 0.11;


/*
  Destination magnetism.
*/
const MAGNET_RADIUS = 0.50;

const KING_MAGNET_RADIUS = 0.66;


/*
  Fly-over protection.

  Prevents d2 → d4 becoming d3.
*/
const STABLE_MOTION_FRACTION = 0.055;

const REQUIRED_STABLE_FRAMES = 2;


/*
  Bottom-row assistance.
*/
const BOTTOM_EDGE_ASSIST = 0.42;


/* =========================================================
   AI CLOCK FAIRNESS
========================================================= */

/*
  Human air-control refund.

  IMPORTANT:
  Ghost Board never adds a free 700 ms.

  It only refunds up to 700 ms of time
  that ACTUALLY passed during your turn.

  Example:

  Turn took 4.2 seconds
  → refund 0.7 s
  → clock loses 3.5 s

  Turn took 0.4 seconds
  → refund only 0.4 s
  → clock loses ~0 s
*/
const HUMAN_AIR_REFUND_MS = 700;


/*
  Nova's minimum thinking delay.

  The AI clock keeps ticking for the
  ENTIRE delay, plus however long its
  minimax calculation actually takes.
*/
const AI_THINK_RANGES = {
  easy: {
    min: 1400,
    max: 1800
  },

  medium: {
    min: 1100,
    max: 1500
  },

  hard: {
    min: 900,
    max: 1300
  },

  expert: {
    min: 800,
    max: 1100
  }
};


/* =========================================================
   EXTRA UI
   CAPTURED PIECES + RESULT
========================================================= */

let capturedPanel = null;

let capturedByWhiteEl = null;
let capturedByBlackEl = null;

let resultOverlay = null;
let resultTitle = null;
let resultSubtitle = null;

let lastResultSignature = null;


function createExtraGameUI() {

  if (
    cameraStage &&
    !$("#capturedPanel")
  ) {

    capturedPanel =
      document.createElement("div");

    capturedPanel.id =
      "capturedPanel";

    capturedPanel.innerHTML = `
      <div class="captured-line">
        <span class="captured-label">
          White captured
        </span>

        <span
          id="capturedByWhite"
          class="captured-pieces"
        >
          —
        </span>
      </div>

      <div class="captured-line">
        <span class="captured-label">
          Black captured
        </span>

        <span
          id="capturedByBlack"
          class="captured-pieces"
        >
          —
        </span>
      </div>
    `;

    cameraStage.insertAdjacentElement(
      "afterend",
      capturedPanel
    );
  }


  capturedPanel =
    $("#capturedPanel");

  capturedByWhiteEl =
    $("#capturedByWhite");

  capturedByBlackEl =
    $("#capturedByBlack");


  if (
    cameraStage &&
    !$("#ghostResultOverlay")
  ) {

    resultOverlay =
      document.createElement("div");

    resultOverlay.id =
      "ghostResultOverlay";

    resultOverlay.className =
      "ghost-result-overlay hidden";

    const stars =
      Array.from(
        { length: 20 },
        (_, index) => {
          return `
            <span style="--i:${index}">
              ✦
            </span>
          `;
        }
      ).join("");


    resultOverlay.innerHTML = `
      <div class="result-confetti">
        ${stars}
      </div>

      <div class="ghost-result-card">
        <div
          id="ghostResultTitle"
          class="ghost-result-title"
        >
          Yayy, you won! 🎉
        </div>

        <div
          id="ghostResultSubtitle"
          class="ghost-result-subtitle"
        >
          Checkmate
        </div>
      </div>
    `;

    cameraStage.appendChild(
      resultOverlay
    );
  }


  resultOverlay =
    $("#ghostResultOverlay");

  resultTitle =
    $("#ghostResultTitle");

  resultSubtitle =
    $("#ghostResultSubtitle");
}


createExtraGameUI();


/* =========================================================
   EXTRA UI CSS
========================================================= */

const runtimeStyle =
  document.createElement("style");


runtimeStyle.textContent = `

  #capturedPanel {
    width: 100%;
    margin-top: 10px;
    padding: 10px 14px;

    border:
      1px solid
      rgba(255,255,255,.10);

    border-radius: 13px;

    background:
      rgba(12,12,18,.88);

    display: grid;
    gap: 6px;
  }


  .captured-line {
    min-height: 28px;

    display: flex;
    align-items: center;

    gap: 10px;
  }


  .captured-label {
    min-width: 105px;

    color:
      rgba(255,255,255,.58);

    font-size: 11px;
    font-weight: 700;

    text-transform: uppercase;

    letter-spacing: .08em;
  }


  .captured-pieces {
    display: flex;

    align-items: center;

    flex-wrap: wrap;

    gap: 2px;

    font-family:
      "Segoe UI Symbol",
      serif;

    font-size: 23px;

    line-height: 1;
  }


  .captured-piece-white {
    color: #f6f6fa;

    text-shadow:
      0 1px 2px #000;
  }


  .captured-piece-black {
    color: #737381;

    text-shadow:
      0 1px 1px
      rgba(255,255,255,.18);
  }


  #ghostResultOverlay {
    position: absolute;

    inset: 0;

    z-index: 500;

    display: flex;

    align-items: center;
    justify-content: center;

    overflow: hidden;

    background:
      rgba(5,5,10,.34);

    backdrop-filter:
      blur(3px);
  }


  #ghostResultOverlay.hidden {
    display: none !important;
  }


  .ghost-result-card {
    position: relative;

    z-index: 5;

    min-width:
      min(
        80%,
        430px
      );

    padding:
      25px 26px;

    text-align: center;

    border:
      1px solid
      rgba(255,255,255,.22);

    border-radius: 22px;

    background:
      rgba(15,13,24,.94);

    box-shadow:
      0 25px 80px
      rgba(0,0,0,.65);

    animation:
      ghostResultPop
      .58s
      cubic-bezier(
        .16,
        1.3,
        .3,
        1
      );
  }


  .ghost-result-title {
    font-size:
      clamp(
        24px,
        4vw,
        42px
      );

    font-weight: 900;

    letter-spacing:
      -.035em;

    color: white;

    animation:
      ghostTitlePulse
      1.1s
      ease-in-out
      infinite alternate;
  }


  .ghost-result-subtitle {
    margin-top: 7px;

    color:
      rgba(255,255,255,.60);

    font-size: 13px;

    font-weight: 600;
  }


  .result-confetti {
    position: absolute;

    inset: 0;

    overflow: hidden;

    pointer-events: none;
  }


  .result-confetti span {
    --column:
      calc(
        (
          var(--i) + 1
        ) * 4.76%
      );

    position: absolute;

    left: var(--column);

    top: -12%;

    font-size:
      calc(
        11px +
        (
          var(--i) % 4
        ) * 3px
      );

    opacity: .9;

    animation:
      ghostConfettiFall
      calc(
        1.6s +
        (
          var(--i) % 6
        ) * .17s
      )
      linear
      infinite;

    animation-delay:
      calc(
        (
          var(--i) % 8
        ) * -.21s
      );
  }


  .result-confetti span:nth-child(3n) {
    color: #ffd454;
  }


  .result-confetti span:nth-child(3n + 1) {
    color: #ba83ff;
  }


  .result-confetti span:nth-child(3n + 2) {
    color: #67dcff;
  }


  @keyframes ghostResultPop {

    from {
      opacity: 0;

      transform:
        scale(.72)
        translateY(18px);
    }

    to {
      opacity: 1;

      transform:
        scale(1)
        translateY(0);
    }
  }


  @keyframes ghostTitlePulse {

    from {
      transform:
        scale(1);
    }

    to {
      transform:
        scale(1.035);
    }
  }


  @keyframes ghostConfettiFall {

    from {
      transform:
        translateY(-10%)
        rotate(0deg);
    }

    to {
      transform:
        translateY(700px)
        rotate(520deg);
    }
  }


  #cameraStage {
    position: relative;
  }

`;


document.head.appendChild(
  runtimeStyle
);


/* =========================================================
   GAME STATE
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
   HAND STATE
========================================================= */

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

let previousPointerX =
  null;

let previousPointerY =
  null;

let stableFrames =
  0;


/* =========================================================
   CLOCK STATE
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


/*
  Used specifically for fair AI-mode
  air-control refund.

  This marks when the CURRENT local
  chess turn began.
*/
let localTurnStartedAt =
  0;


/* =========================================================
   CAMERA STATE
========================================================= */

let cameraStream =
  null;

let handLandmarker =
  null;

let handLoopStarted =
  false;


/* =========================================================
   AUDIO STATE
========================================================= */

let soundEnabled =
  true;

let audioContext =
  null;


/* =========================================================
   FIREBASE STATE
========================================================= */

let firebaseApp =
  null;

let auth =
  null;

let db =
  null;

let firebaseUser =
  null;

let serverTimeOffset =
  0;

let currentRoomCode =
  null;

let currentRoomRef =
  null;

let roomUnsubscribe =
  null;

let onlineRoomState =
  null;

let onlineColor =
  null;

let onlineMovePending =
  false;


/* =========================================================
   GENERAL HELPERS
========================================================= */

function mode() {

  return (
    settings?.mode ||
    gameModeInput?.value ||
    "ai"
  );
}


function colorKey(color) {

  return (
    color === "w"
      ? "white"
      : "black"
  );
}


function otherColor(color) {

  return (
    color === "w"
      ? "b"
      : "w"
  );
}


function serverNow() {

  return (
    Date.now() +
    serverTimeOffset
  );
}


function normalizeArray(value) {

  if (
    Array.isArray(value)
  ) {

    return value;
  }


  if (
    !value ||
    typeof value !== "object"
  ) {

    return [];
  }


  return Object
    .keys(value)
    .sort(
      (a, b) =>
        Number(a) - Number(b)
    )
    .map(
      (key) =>
        value[key]
    );
}


/* =========================================================
   PIECE SWITCH HELPERS
========================================================= */

function isOwnTurnPiece(square) {

  if (!square) {
    return false;
  }


  const piece =
    game.get(square);


  return Boolean(
    piece &&
    piece.color === game.turn()
  );
}


function isPieceSwitch(square) {

  if (
    !selectedSquare ||
    square === selectedSquare
  ) {

    return false;
  }


  if (
    getCastlingMove(
      selectedSquare,
      square
    )
  ) {

    return false;
  }


  return isOwnTurnPiece(
    square
  );
}


/* =========================================================
   FIREBASE CONFIG
========================================================= */

function isFirebaseConfigured() {

  return [
    firebaseConfig.apiKey,
    firebaseConfig.authDomain,
    firebaseConfig.databaseURL,
    firebaseConfig.projectId,
    firebaseConfig.appId
  ].every(
    (value) => {

      return (
        value &&
        !String(value)
          .includes("PASTE_")
      );
    }
  );
}


async function initOnlineBackend() {

  if (
    !isFirebaseConfigured()
  ) {

    throw new Error(
      "Firebase is not configured correctly."
    );
  }


  if (!firebaseApp) {

    firebaseApp =
      initializeApp(
        firebaseConfig
      );


    auth =
      getAuth(
        firebaseApp
      );


    db =
      getDatabase(
        firebaseApp
      );


    firebaseUser =
      (
        await signInAnonymously(
          auth
        )
      ).user;


    onValue(
      ref(
        db,
        ".info/serverTimeOffset"
      ),

      (snapshot) => {

        serverTimeOffset =
          snapshot.val() || 0;
      }
    );

  } else if (!firebaseUser) {

    firebaseUser =
      (
        await signInAnonymously(
          auth
        )
      ).user;
  }
}


/* =========================================================
   ROOM CODES
========================================================= */

function generateRoomCode() {

  const chars =
    "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";


  let suffix =
    "";


  for (
    let i = 0;
    i < 4;
    i++
  ) {

    suffix +=
      chars[
        Math.floor(
          Math.random() *
          chars.length
        )
      ];
  }


  return `GHOST-${suffix}`;
}


function normalizeRoomCode(code) {

  return String(
    code || ""
  )
    .trim()
    .toUpperCase()
    .replace(
      /\s+/g,
      ""
    );
}


/* =========================================================
   SETUP UI
========================================================= */

function updateModeUI() {

  const selectedMode =
    gameModeInput?.value;


  difficultyField
    ?.classList
    .toggle(
      "hidden",
      selectedMode !== "ai"
    );


  player2Field
    ?.classList
    .toggle(
      "hidden",
      selectedMode !== "local"
    );


  onlineFields
    ?.classList
    .toggle(
      "hidden",
      selectedMode !== "online"
    );


  if (!startGameBtn) {
    return;
  }


  if (
    selectedMode === "ai"
  ) {

    startGameBtn.textContent =
      "START VS AI";
  }


  if (
    selectedMode === "local"
  ) {

    startGameBtn.textContent =
      "START LOCAL GAME";
  }


  if (
    selectedMode === "online"
  ) {

    updateOnlineActionUI();
  }
}


function updateOnlineActionUI() {

  const joining =
    onlineAction?.value ===
    "join";


  roomCodeField
    ?.classList
    .toggle(
      "hidden",
      !joining
    );


  if (startGameBtn) {

    startGameBtn.textContent =
      joining
        ? "JOIN ONLINE GAME"
        : "CREATE ONLINE GAME";
  }


  if (onlineNote) {

    onlineNote.textContent =
      joining
        ? "Enter the room code from the other player."
        : "Create a room and share the code with another device.";
  }
}


gameModeInput
  ?.addEventListener(
    "change",
    updateModeUI
  );


onlineAction
  ?.addEventListener(
    "change",
    updateOnlineActionUI
  );


timeControlInput
  ?.addEventListener(
    "change",
    () => {

      customTime
        ?.classList
        .toggle(
          "hidden",
          timeControlInput.value !==
          "custom"
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
  .querySelectorAll(".sticker")
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


if (
  savedName &&
  player1NameInput
) {

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


updateModeUI();


/* =========================================================
   SETTINGS
========================================================= */

function collectSettings() {

  let minutes;
  let increment;


  if (
    timeControlInput.value ===
    "custom"
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
      gameModeInput.value ===
      "ai"

        ? "Nova AI 🤖"

        : (
          player2NameInput
            ?.value
            .trim()
          || "Player 2"
        ),


    difficulty:
      difficultyInput?.value
      || "medium",


    minutes,
    increment,


    theme:
      boardThemeInput.value,


    sound:
      soundToggle?.checked
      ?? true
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
        "Starting Ghost Board...";


      try {

        hideResultOverlay();


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


        if (
          settings.mode === "online"
        ) {

          await initOnlineBackend();


          if (
            onlineAction.value ===
            "create"
          ) {

            await createOnlineRoom();

          } else {

            await joinOnlineRoom(
              normalizeRoomCode(
                roomCodeInput.value
              )
            );
          }

        } else {

          await leaveOnlineState(
            false
          );


          openGameScreen();

          initializeLocalGame();
        }


        if (!handLoopStarted) {

          handLoopStarted =
            true;


          requestAnimationFrame(
            handTrackingLoop
          );
        }

      } catch (error) {

        console.error(error);


        setupMessage.textContent =
          error?.message ||
          "Could not start Ghost Board.";

      } finally {

        startGameBtn.disabled =
          false;
      }
    }
  );


function openGameScreen() {

  setupScreen
    ?.classList
    .add("hidden");


  gameScreen
    ?.classList
    .remove("hidden");


  requestAnimationFrame(
    fitBoardToCamera
  );
}


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
      "Camera unavailable. Use HTTPS or localhost."
    );
  }


  cameraStream =
    await navigator
      .mediaDevices
      .getUserMedia({

        video: {
          facingMode: "user",

          width: {
            ideal: 1280
          },

          height: {
            ideal: 720
          }
        },

        audio: false
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

        runningMode: "VIDEO",

        numHands: 1,

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
   LOCAL GAME
========================================================= */

function initializeLocalGame() {

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

  onlineColor =
    null;


  lastResultSignature =
    null;


  hideResultOverlay();

  resetHover();


  whiteTimeMs =
    settings.minutes *
    60 *
    1000;


  blackTimeMs =
    settings.minutes *
    60 *
    1000;


  incrementMs =
    settings.increment *
    1000;


  const now =
    performance.now();


  lastClockTick =
    now;


  localTurnStartedAt =
    now;


  whiteNameEl.textContent =
    settings.whiteName;


  blackNameEl.textContent =
    settings.mode === "ai"
      ? "Nova AI 🤖"
      : settings.blackName;


  onlineRoomBar
    ?.classList
    .add("hidden");


  waitingOverlay
    ?.classList
    .add("hidden");


  restartBtn
    ?.classList
    .remove("hidden");


  whitePlayer
    ?.classList
    .remove("my-player");


  blackPlayer
    ?.classList
    .remove("my-player");


  renderBoard();

  renderHistory();

  updateStatus();

  startClock();
}


/* =========================================================
   ONLINE ROOM CREATE
========================================================= */

async function createOnlineRoom() {

  const initialMs =
    settings.minutes *
    60 *
    1000;


  const incMs =
    settings.increment *
    1000;


  let code = null;

  let roomReference = null;


  for (
    let attempt = 0;
    attempt < 8;
    attempt++
  ) {

    const candidate =
      generateRoomCode();


    const candidateRef =
      ref(
        db,
        `rooms/${candidate}`
      );


    const snapshot =
      await get(
        candidateRef
      );


    if (!snapshot.exists()) {

      code =
        candidate;


      roomReference =
        candidateRef;


      break;
    }
  }


  if (!code) {

    throw new Error(
      "Could not generate a room. Try again."
    );
  }


  currentRoomCode =
    code;


  currentRoomRef =
    roomReference;


  onlineColor =
    "w";


  const initialGame =
    new Chess();


  await set(
    currentRoomRef,
    {

      version: 8,

      status: "waiting",

      createdAt:
        serverNow(),

      hostUid:
        firebaseUser.uid,

      fen:
        initialGame.fen(),

      turn: "w",

      ply: 0,

      initialTimeMs:
        initialMs,

      incrementMs:
        incMs,

      whiteTimeMs:
        initialMs,

      blackTimeMs:
        initialMs,

      turnStartedAt:
        null,

      history: [],

      moves: [],

      lastMove: null,

      players: {

        white: {

          uid:
            firebaseUser.uid,

          name:
            settings.whiteName,

          connected:
            true
        }
      }
    }
  );


  await onDisconnect(
    ref(
      db,
      `rooms/${code}/players/white/connected`
    )
  ).set(false);


  openGameScreen();

  subscribeToRoom(code);
}


/* =========================================================
   ONLINE ROOM JOIN
========================================================= */

async function joinOnlineRoom(code) {

  if (
    !/^GHOST-[A-Z0-9]{4}$/.test(
      code
    )
  ) {

    throw new Error(
      "Enter a code like GHOST-7K29."
    );
  }


  const roomReference =
    ref(
      db,
      `rooms/${code}`
    );


  const snapshot =
    await get(
      roomReference
    );


  if (!snapshot.exists()) {

    throw new Error(
      "Room not found."
    );
  }


  const room =
    snapshot.val();


  if (
    room.status !==
    "waiting"
  ) {

    throw new Error(
      "That room is no longer waiting."
    );
  }


  if (
    room.players
      ?.black
      ?.uid
  ) {

    throw new Error(
      "That room already has two players."
    );
  }


  const blackPlayerRef =
    ref(
      db,
      `rooms/${code}/players/black`
    );


  const claimResult =
    await runTransaction(
      blackPlayerRef,

      (currentBlack) => {

        if (
          currentBlack?.uid
        ) {

          return;
        }


        return {

          uid:
            firebaseUser.uid,

          name:
            settings.whiteName,

          connected:
            true
        };
      },

      {
        applyLocally:
          false
      }
    );


  if (
    !claimResult.committed
  ) {

    throw new Error(
      "That room already has a Black player."
    );
  }


  try {

    await update(
      roomReference,
      {

        status:
          "playing",

        turn:
          "w",

        turnStartedAt:
          serverNow()
      }
    );

  } catch (error) {

    try {

      await set(
        blackPlayerRef,
        null
      );

    } catch {
      // Ignore cleanup failure.
    }


    throw new Error(
      "Joined the room, but Firebase blocked the game start."
    );
  }


  currentRoomCode =
    code;


  currentRoomRef =
    roomReference;


  onlineColor =
    "b";


  await onDisconnect(
    ref(
      db,
      `rooms/${code}/players/black/connected`
    )
  ).set(false);


  openGameScreen();

  subscribeToRoom(code);
}


/* =========================================================
   ROOM LISTENER
========================================================= */

function subscribeToRoom(code) {

  if (roomUnsubscribe) {

    roomUnsubscribe();
  }


  currentRoomRef =
    ref(
      db,
      `rooms/${code}`
    );


  roomUnsubscribe =
    onValue(
      currentRoomRef,

      (snapshot) => {

        if (!snapshot.exists()) {

          gameActive =
            false;


          gameStatus.textContent =
            "Room closed.";


          return;
        }


        onlineRoomState =
          snapshot.val();


        syncOnlineRoom();
      },

      (error) => {

        console.error(error);


        gameStatus.textContent =
          "Firebase connection error.";
      }
    );
}


/* =========================================================
   ONLINE SYNC
========================================================= */

function syncOnlineRoom() {

  const room =
    onlineRoomState;


  if (!room) {
    return;
  }


  const uid =
    firebaseUser?.uid;


  if (
    room.players
      ?.white
      ?.uid === uid
  ) {

    onlineColor =
      "w";

  } else if (
    room.players
      ?.black
      ?.uid === uid
  ) {

    onlineColor =
      "b";
  }


  const moves =
    normalizeArray(
      room.moves
    );


  const rebuilt =
    new Chess();


  try {

    for (
      const move of moves
    ) {

      rebuilt.move(
        move
      );
    }


    game =
      rebuilt;

  } catch (error) {

    console.error(
      "Game reconstruction failed:",
      error
    );


    try {

      game =
        new Chess(
          room.fen
        );

    } catch {

      game =
        new Chess();
    }
  }


  selectedSquare =
    null;


  legalTargets =
    [];


  hoveredSquare =
    null;


  resetHover();


  lastMove =
    room.lastMove || null;


  incrementMs =
    room.incrementMs || 0;


  whiteNameEl.textContent =
    room.players
      ?.white
      ?.name
    || "White";


  blackNameEl.textContent =
    room.players
      ?.black
      ?.name
    || "Waiting…";


  whitePlayer
    ?.classList
    .toggle(
      "my-player",
      onlineColor === "w"
    );


  blackPlayer
    ?.classList
    .toggle(
      "my-player",
      onlineColor === "b"
    );


  onlineRoomBar
    ?.classList
    .remove("hidden");


  if (roomCodeLabel) {

    roomCodeLabel.textContent =
      currentRoomCode;
  }


  if (waitingCode) {

    waitingCode.textContent =
      currentRoomCode;
  }


  restartBtn
    ?.classList
    .add("hidden");


  const opponentKey =
    onlineColor === "w"
      ? "black"
      : "white";


  const opponent =
    room.players
      ?.[opponentKey];


  if (
    room.status ===
    "waiting"
  ) {

    gameActive =
      false;


    hideResultOverlay();


    waitingOverlay
      ?.classList
      .remove("hidden");


    if (waitingText) {

      waitingText.textContent =
        "Share this code with another player.";
    }


    if (connectionLabel) {

      connectionLabel.textContent =
        "Waiting for opponent";
    }

  } else {

    waitingOverlay
      ?.classList
      .add("hidden");


    gameActive =
      room.status ===
      "playing";


    if (connectionLabel) {

      if (
        opponent
          ?.connected ===
        false
      ) {

        connectionLabel.textContent =
          "Opponent disconnected";


        connectionLabel.className =
          "connection-label offline";

      } else {

        connectionLabel.textContent =
          "Opponent online";


        connectionLabel.className =
          "connection-label online";
      }
    }
  }


  renderBoard();


  renderHistory(
    normalizeArray(
      room.history
    )
  );


  updateStatus();


  startClock();


  if (
    room.status ===
    "ended"
  ) {

    showOnlineResult(
      room
    );
  }
}


/* =========================================================
   ONLINE MOVE
========================================================= */

async function submitOnlineMove(
  from,
  to
) {

  if (
    !currentRoomRef ||
    onlineMovePending ||
    !onlineRoomState ||
    !onlineColor
  ) {

    return;
  }


  onlineMovePending =
    true;


  try {

    const result =
      await runTransaction(
        currentRoomRef,

        (room) => {

          if (
            !room ||
            room.status !== "playing" ||
            room.turn !== onlineColor
          ) {

            return;
          }


          const player =
            room.players
              ?.[
                colorKey(
                  onlineColor
                )
              ];


          if (
            !player ||
            player.uid !==
            firebaseUser.uid
          ) {

            return;
          }


          const moves =
            normalizeArray(
              room.moves
            );


          const board =
            new Chess();


          try {

            for (
              const move of moves
            ) {

              board.move(
                move
              );
            }

          } catch {

            return;
          }


          let whiteTime =
            Number(
              room.whiteTimeMs
              ?? room.initialTimeMs
              ?? 300000
            );


          let blackTime =
            Number(
              room.blackTimeMs
              ?? room.initialTimeMs
              ?? 300000
            );


          const elapsed =
            Math.max(
              0,

              serverNow() -
              Number(
                room.turnStartedAt ||
                serverNow()
              )
            );


          if (
            onlineColor === "w"
          ) {

            whiteTime =
              Math.max(
                0,
                whiteTime - elapsed
              );

          } else {

            blackTime =
              Math.max(
                0,
                blackTime - elapsed
              );
          }


          const remaining =
            onlineColor === "w"
              ? whiteTime
              : blackTime;


          if (
            remaining <= 0
          ) {

            room.whiteTimeMs =
              whiteTime;


            room.blackTimeMs =
              blackTime;


            room.status =
              "ended";


            room.endReason =
              "time";


            room.winner =
              otherColor(
                onlineColor
              );


            room.turnStartedAt =
              null;


            return room;
          }


          let resultMove;


          try {

            resultMove =
              board.move({

                from,
                to,

                promotion:
                  "q"
              });

          } catch {

            return;
          }


          if (!resultMove) {
            return;
          }


          if (
            onlineColor === "w"
          ) {

            whiteTime +=
              Number(
                room.incrementMs || 0
              );

          } else {

            blackTime +=
              Number(
                room.incrementMs || 0
              );
          }


          room.moves = [
            ...moves,

            {
              from:
                resultMove.from,

              to:
                resultMove.to,

              promotion:
                resultMove.promotion
                || "q"
            }
          ];


          room.history = [
            ...normalizeArray(
              room.history
            ),

            resultMove.san
          ];


          room.fen =
            board.fen();


          room.turn =
            board.turn();


          room.ply =
            Number(
              room.ply || 0
            ) + 1;


          room.whiteTimeMs =
            whiteTime;


          room.blackTimeMs =
            blackTime;


          room.turnStartedAt =
            serverNow();


          room.lastMove = {

            from:
              resultMove.from,

            to:
              resultMove.to,

            piece:
              resultMove.piece,

            captured:
              resultMove.captured
              || null,

            san:
              resultMove.san,

            flags:
              resultMove.flags
              || ""
          };


          if (
            board.isGameOver()
          ) {

            const end =
              describeGameEnd(
                board
              );


            room.status =
              "ended";


            room.endReason =
              end.reason;


            room.winner =
              end.winner;


            room.turnStartedAt =
              null;
          }


          return room;
        },

        {
          applyLocally:
            false
        }
      );


    if (
      !result.committed
    ) {

      playUiTone(
        "error"
      );
    }

  } catch (error) {

    console.error(
      "Online move failed:",
      error
    );


    gameStatus.textContent =
      "Move couldn't sync.";

  } finally {

    onlineMovePending =
      false;
  }
}


/* =========================================================
   ONLINE TIMEOUT
========================================================= */

async function claimOnlineTimeout() {

  if (
    !currentRoomRef ||
    !onlineRoomState ||
    onlineRoomState.status !==
    "playing"
  ) {

    return;
  }


  try {

    await runTransaction(
      currentRoomRef,

      (room) => {

        if (
          !room ||
          room.status !== "playing" ||
          !room.turnStartedAt
        ) {

          return;
        }


        const active =
          room.turn;


        const remaining =
          Number(
            active === "w"
              ? room.whiteTimeMs
              : room.blackTimeMs
          )

          - Math.max(
              0,

              serverNow() -
              Number(
                room.turnStartedAt
              )
            );


        if (
          remaining > 0
        ) {

          return;
        }


        if (
          active === "w"
        ) {

          room.whiteTimeMs =
            0;

        } else {

          room.blackTimeMs =
            0;
        }


        room.status =
          "ended";


        room.endReason =
          "time";


        room.winner =
          otherColor(
            active
          );


        room.turnStartedAt =
          null;


        return room;
      },

      {
        applyLocally:
          false
      }
    );

  } catch (error) {

    console.error(
      "Timeout error:",
      error
    );
  }
}


/* =========================================================
   GAME END DESCRIPTION
========================================================= */

function describeGameEnd(board) {

  if (
    board.isCheckmate()
  ) {

    return {

      reason:
        "checkmate",

      winner:
        otherColor(
          board.turn()
        )
    };
  }


  if (
    board.isStalemate()
  ) {

    return {

      reason:
        "stalemate",

      winner:
        null
    };
  }


  if (
    board.isThreefoldRepetition()
  ) {

    return {

      reason:
        "repetition",

      winner:
        null
    };
  }


  if (
    board.isInsufficientMaterial()
  ) {

    return {

      reason:
        "insufficient",

      winner:
        null
    };
  }


  return {

    reason:
      "draw",

    winner:
      null
  };
}


/* =========================================================
   INPUT PERMISSION
========================================================= */

function canControlTurn() {

  if (
    !gameActive ||
    aiBusy ||
    onlineMovePending
  ) {

    return false;
  }


  if (
    mode() === "ai"
  ) {

    return (
      game.turn() === "w"
    );
  }


  if (
    mode() === "online"
  ) {

    return (
      onlineColor ===
      game.turn()
    );
  }


  return true;
}


/* =========================================================
   BOARD PERSPECTIVE
========================================================= */

function boardPerspective() {

  return (
    mode() === "online" &&
    onlineColor === "b"

      ? "b"

      : "w"
  );
}


function fileOrder() {

  return (
    boardPerspective() === "w"

      ? FILES

      : [...FILES]
        .reverse()
  );
}


function rankOrder() {

  return (
    boardPerspective() === "w"

      ? [
        8, 7, 6, 5,
        4, 3, 2, 1
      ]

      : [
        1, 2, 3, 4,
        5, 6, 7, 8
      ]
  );
}


/* =========================================================
   BOARD RENDER
========================================================= */

function renderBoard() {

  boardEl.innerHTML =
    "";


  const files =
    fileOrder();


  const ranks =
    rankOrder();


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
        `${files[col]}${ranks[row]}`;


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
        hoveredSquare ===
        squareName
      ) {

        square.classList.add(
          "ghost-hover"
        );
      }


      if (
        selectedSquare ===
        squareName
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
        lastMove &&
        (
          lastMove.from ===
          squareName
          ||
          lastMove.to ===
          squareName
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


  renderCapturedPieces();


  requestAnimationFrame(
    fitBoardToCamera
  );
}


/* =========================================================
   CAPTURED PIECES
========================================================= */

function renderCapturedPieces() {

  if (
    !capturedByWhiteEl ||
    !capturedByBlackEl
  ) {

    return;
  }


  const capturedByWhite =
    [];


  const capturedByBlack =
    [];


  let history = [];


  try {

    history =
      game.history({
        verbose: true
      });

  } catch {

    history = [];
  }


  for (
    const move of history
  ) {

    if (
      !move.captured
    ) {

      continue;
    }


    if (
      move.color === "w"
    ) {

      capturedByWhite.push(
        move.captured
      );

    } else {

      capturedByBlack.push(
        move.captured
      );
    }
  }


  const order = {

    q: 1,
    r: 2,
    b: 3,
    n: 4,
    p: 5
  };


  capturedByWhite.sort(
    (a, b) =>
      order[a] - order[b]
  );


  capturedByBlack.sort(
    (a, b) =>
      order[a] - order[b]
  );


  if (
    capturedByWhite.length === 0
  ) {

    capturedByWhiteEl.textContent =
      "—";

  } else {

    capturedByWhiteEl.innerHTML =
      capturedByWhite
        .map(
          (piece) => `
            <span class="captured-piece-black">
              ${PIECES[`b${piece}`]}
            </span>
          `
        )
        .join("");
  }


  if (
    capturedByBlack.length === 0
  ) {

    capturedByBlackEl.textContent =
      "—";

  } else {

    capturedByBlackEl.innerHTML =
      capturedByBlack
        .map(
          (piece) => `
            <span class="captured-piece-white">
              ${PIECES[`w${piece}`]}
            </span>
          `
        )
        .join("");
  }
}


/* =========================================================
   MOUSE FALLBACK
========================================================= */

boardEl
  ?.addEventListener(
    "click",
    (event) => {

      const square =
        event.target
          .closest(
            ".square"
          );


      if (
        square &&
        canControlTurn()
      ) {

        handleSquareInput(
          square.dataset.square
        );
      }
    }
  );


/* =========================================================
   HAND LOOP
========================================================= */

function handTrackingLoop() {

  if (
    gameScreen
      ?.classList
      .contains("hidden")

    ||

    !handLandmarker

    ||

    webcam.readyState < 2
  ) {

    requestAnimationFrame(
      handTrackingLoop
    );


    return;
  }


  const now =
    performance.now();


  try {

    processHand(
      handLandmarker
        .detectForVideo(
          webcam,
          now
        ),

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

  updateHandColor();


  if (
    !result.landmarks
      ?.length
  ) {

    handCursor
      ?.classList
      .add("hidden");


    resetHover();


    setHoveredSquare(
      null
    );


    smoothX =
      null;


    smoothY =
      null;


    previousPointerX =
      null;


    previousPointerY =
      null;


    return;
  }


  const indexTip =
    result.landmarks[0][8];


  const stageRect =
    cameraStage
      .getBoundingClientRect();


  const rawX =
    (1 - indexTip.x) *
    stageRect.width;


  const rawY =
    indexTip.y *
    stageRect.height;


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
        rawX - smoothX
      ) *
      SMOOTHING;


    smoothY +=
      (
        rawY - smoothY
      ) *
      SMOOTHING;
  }


  handCursor
    ?.classList
    .remove("hidden");


  handCursor.style.left =
    `${smoothX}px`;


  handCursor.style.top =
    `${smoothY}px`;


  const square =
    squareFromPoint(
      stageRect.left +
      smoothX,

      stageRect.top +
      smoothY
    );


  setHoveredSquare(
    square
  );


  const boardRect =
    boardEl
      .getBoundingClientRect();


  const squareSize =
    Math.min(
      boardRect.width / 8,
      boardRect.height / 8
    );


  let motionFraction =
    Infinity;


  if (
    previousPointerX !== null &&
    previousPointerY !== null &&
    squareSize > 0
  ) {

    motionFraction =
      Math.hypot(
        smoothX -
        previousPointerX,

        smoothY -
        previousPointerY
      )

      / squareSize;
  }


  previousPointerX =
    smoothX;


  previousPointerY =
    smoothY;


  if (
    !square ||
    !canControlTurn()
  ) {

    resetHoverProgress();


    return;
  }


  if (
    lastActivatedSquare &&
    square !==
    lastActivatedSquare
  ) {

    lastActivatedSquare =
      null;
  }


  if (
    lastActivatedSquare ===
    square
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
    Fly-over protection.
  */
  if (
    motionFraction >
    STABLE_MOTION_FRACTION
  ) {

    currentHoverSquare =
      square;


    hoverStartTime =
      0;


    stableFrames =
      0;


    setCursorProgress(
      0
    );


    return;
  }


  if (
    currentHoverSquare !==
    square
  ) {

    currentHoverSquare =
      square;


    hoverStartTime =
      0;


    stableFrames =
      0;


    setCursorProgress(
      0
    );


    return;
  }


  stableFrames +=
    1;


  if (
    stableFrames <
    REQUIRED_STABLE_FRAMES
  ) {

    setCursorProgress(
      0
    );


    return;
  }


  if (!hoverStartTime) {

    hoverStartTime =
      now;
  }


  let requiredTime;


  if (
    isPieceSwitch(
      square
    )
  ) {

    requiredTime =
      SWITCH_DWELL_MS;

  } else if (
    selectedSquare
  ) {

    requiredTime =
      MOVE_DWELL_MS;

  } else {

    requiredTime =
      SELECT_DWELL_MS;
  }


  const progress =
    Math.min(
      1,

      (
        now -
        hoverStartTime
      )

      / requiredTime
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


    stableFrames =
      0;


    setCursorProgress(
      0
    );


    handCursor
      ?.classList
      .add(
        "ghost-ready"
      );


    setTimeout(
      () => {

        handCursor
          ?.classList
          .remove(
            "ghost-ready"
          );

      },

      70
    );
  }
}


/* =========================================================
   CURSOR COLOR
========================================================= */

function updateHandColor() {

  if (!cameraStage) {
    return;
  }


  cameraStage.dataset.handColor =
    mode() === "online" &&
    onlineColor

      ? onlineColor

      : game.turn();
}


/* =========================================================
   CURSOR → BOARD
========================================================= */

function squareFromPoint(
  clientX,
  clientY
) {

  const rect =
    boardEl
      .getBoundingClientRect();


  const files =
    fileOrder();


  const ranks =
    rankOrder();


  const squareWidth =
    rect.width / 8;


  const squareHeight =
    rect.height / 8;


  const extraBottom =
    squareHeight *
    BOTTOM_EDGE_ASSIST;


  if (
    clientX < rect.left ||
    clientX > rect.right ||
    clientY < rect.top ||
    clientY > rect.bottom + extraBottom
  ) {

    return null;
  }


  const clampedClientY =
    Math.min(
      rect.bottom - 0.5,

      Math.max(
        rect.top,
        clientY
      )
    );


  const boardX =
    clientX -
    rect.left;


  const boardY =
    clampedClientY -
    rect.top;


  const col =
    Math.min(
      7,

      Math.max(
        0,

        Math.floor(
          boardX /
          squareWidth
        )
      )
    );


  const row =
    Math.min(
      7,

      Math.max(
        0,

        Math.floor(
          boardY /
          squareHeight
        )
      )
    );


  const rawSquare =
    `${files[col]}${ranks[row]}`;


  /*
    Initial selection.
    No magnetic snapping.
  */
  if (!selectedSquare) {

    const piece =
      game.get(
        rawSquare
      );


    if (
      !piece ||
      piece.color !==
      game.turn()
    ) {

      return null;
    }


    if (
      clientY >
      rect.bottom
    ) {

      return rawSquare;
    }


    const localX =
      boardX /
      squareWidth -
      col;


    const localY =
      boardY /
      squareHeight -
      row;


    const margin =
      SELECTION_CORE_MARGIN;


    if (
      localX < margin ||
      localX > 1 - margin ||
      localY < margin ||
      localY > 1 - margin
    ) {

      return null;
    }


    return rawSquare;
  }


  /*
    AUTO-SWITCH:

    If the fingertip is truly over another
    friendly piece, use that piece directly.
  */
  if (
    isOwnTurnPiece(
      rawSquare
    )
  ) {

    return rawSquare;
  }


  /*
    Exact legal destination.
  */
  if (
    isActionableSquare(
      rawSquare
    )
  ) {

    return rawSquare;
  }


  /*
    Mild magnetism to legal move targets.
  */

  let nearestSquare =
    null;


  let nearestDistance =
    Infinity;


  let nearestLimit =
    MAGNET_RADIUS;


  for (
    const square of
    getMagneticTargets()
  ) {

    const targetCol =
      files.indexOf(
        square[0]
      );


    const targetRow =
      ranks.indexOf(
        Number(
          square[1]
        )
      );


    if (
      targetCol < 0 ||
      targetRow < 0
    ) {

      continue;
    }


    const centerX =
      (
        targetCol +
        0.5
      ) *
      squareWidth;


    const centerY =
      (
        targetRow +
        0.5
      ) *
      squareHeight;


    const distance =
      Math.hypot(
        (
          boardX -
          centerX
        ) /
        squareWidth,

        (
          boardY -
          centerY
        ) /
        squareHeight
      );


    const targetPiece =
      game.get(
        square
      );


    const limit =
      targetPiece?.type === "k"
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
        limit;
    }
  }


  return (
    nearestSquare &&
    nearestDistance <=
    nearestLimit

      ? nearestSquare

      : rawSquare
  );
}


/* =========================================================
   MAGNET TARGETS
========================================================= */

function getMagneticTargets() {

  if (!selectedSquare) {
    return [];
  }


  const targets =
    new Set([
      selectedSquare,
      ...legalTargets
    ]);


  const selectedPiece =
    game.get(
      selectedSquare
    );


  /*
    Castling assistance.
  */
  if (
    selectedPiece?.type ===
    "k"
  ) {

    if (
      selectedSquare === "e1" &&
      legalTargets.includes("g1")
    ) {

      targets.add("h1");
    }


    if (
      selectedSquare === "e1" &&
      legalTargets.includes("c1")
    ) {

      targets.add("a1");
    }


    if (
      selectedSquare === "e8" &&
      legalTargets.includes("g8")
    ) {

      targets.add("h8");
    }


    if (
      selectedSquare === "e8" &&
      legalTargets.includes("c8")
    ) {

      targets.add("a8");
    }
  }


  return [
    ...targets
  ];
}


/* =========================================================
   CASTLING
========================================================= */

function getCastlingMove(
  firstSquare,
  secondSquare
) {

  if (
    !firstSquare ||
    !secondSquare
  ) {

    return null;
  }


  const first =
    game.get(
      firstSquare
    );


  const second =
    game.get(
      secondSquare
    );


  let kingSquare =
    null;


  let rookSquare =
    null;


  let color =
    null;


  /*
    King → Rook
  */
  if (
    first?.type === "k" &&
    second?.type === "r" &&
    first.color ===
    second.color
  ) {

    kingSquare =
      firstSquare;


    rookSquare =
      secondSquare;


    color =
      first.color;
  }


  /*
    Rook → King
  */
  else if (
    first?.type === "r" &&
    second?.type === "k" &&
    first.color ===
    second.color
  ) {

    kingSquare =
      secondSquare;


    rookSquare =
      firstSquare;


    color =
      second.color;
  }


  /*
    King → castling destination
  */
  else if (
    first?.type === "k"
  ) {

    kingSquare =
      firstSquare;


    color =
      first.color;


    if (
      firstSquare === "e1" &&
      secondSquare === "g1"
    ) {

      rookSquare =
        "h1";
    }


    if (
      firstSquare === "e1" &&
      secondSquare === "c1"
    ) {

      rookSquare =
        "a1";
    }


    if (
      firstSquare === "e8" &&
      secondSquare === "g8"
    ) {

      rookSquare =
        "h8";
    }


    if (
      firstSquare === "e8" &&
      secondSquare === "c8"
    ) {

      rookSquare =
        "a8";
    }
  }


  if (
    !kingSquare ||
    !rookSquare ||
    !color
  ) {

    return null;
  }


  const legalKingMoves =
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


  if (
    color === "w" &&
    kingSquare === "e1" &&
    rookSquare === "h1" &&
    legalKingMoves.includes(
      "g1"
    )
  ) {

    return {
      from: "e1",
      to: "g1"
    };
  }


  if (
    color === "w" &&
    kingSquare === "e1" &&
    rookSquare === "a1" &&
    legalKingMoves.includes(
      "c1"
    )
  ) {

    return {
      from: "e1",
      to: "c1"
    };
  }


  if (
    color === "b" &&
    kingSquare === "e8" &&
    rookSquare === "h8" &&
    legalKingMoves.includes(
      "g8"
    )
  ) {

    return {
      from: "e8",
      to: "g8"
    };
  }


  if (
    color === "b" &&
    kingSquare === "e8" &&
    rookSquare === "a8" &&
    legalKingMoves.includes(
      "c8"
    )
  ) {

    return {
      from: "e8",
      to: "c8"
    };
  }


  return null;
}


/* =========================================================
   ACTIONABLE SQUARE
========================================================= */

function isActionableSquare(
  square
) {

  if (
    !square ||
    !canControlTurn()
  ) {

    return false;
  }


  if (!selectedSquare) {

    return isOwnTurnPiece(
      square
    );
  }


  if (
    square ===
    selectedSquare
  ) {

    return true;
  }


  if (
    getCastlingMove(
      selectedSquare,
      square
    )
  ) {

    return true;
  }


  /*
    Other friendly pieces can
    automatically replace selection.
  */
  if (
    isOwnTurnPiece(
      square
    )
  ) {

    return true;
  }


  return legalTargets
    .includes(
      square
    );
}


/* =========================================================
   HANDLE INPUT
========================================================= */

function handleSquareInput(
  square
) {

  if (
    !canControlTurn()
  ) {

    return;
  }


  if (!selectedSquare) {

    selectSquare(
      square
    );


    return;
  }


  /*
    Castling before piece-switch.
  */
  const castle =
    getCastlingMove(
      selectedSquare,
      square
    );


  if (castle) {

    submitMove(
      castle.from,
      castle.to
    );


    return;
  }


  if (
    square ===
    selectedSquare
  ) {

    clearSelection();


    return;
  }


  /*
    Automatically switch to another
    friendly piece.
  */
  if (
    isOwnTurnPiece(
      square
    )
  ) {

    selectSquare(
      square
    );


    return;
  }


  if (
    legalTargets.includes(
      square
    )
  ) {

    submitMove(
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
    !piece ||
    piece.color !==
    game.turn()
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


  resetHoverProgress();


  renderBoard();


  playUiTone(
    "select"
  );
}


/* =========================================================
   CLEAR SELECTION
========================================================= */

function clearSelection() {

  selectedSquare =
    null;


  legalTargets =
    [];


  resetHover();


  renderBoard();
}


/* =========================================================
   MOVE ROUTER
========================================================= */

function submitMove(
  from,
  to
) {

  if (
    mode() === "online"
  ) {

    submitOnlineMove(
      from,
      to
    );

  } else {

    tryLocalMove(
      from,
      to
    );
  }
}


/* =========================================================
   LOCAL MOVE

   HUMAN AIR REFUND IS APPLIED HERE.
========================================================= */

function tryLocalMove(
  from,
  to
) {

  /*
    Capture time BEFORE move is made.

    localTurnStartedAt was set when
    this turn began.
  */
  const moveCompletedAt =
    performance.now();


  const turnElapsedMs =
    Math.max(
      0,

      moveCompletedAt -
      localTurnStartedAt
    );


  /*
    Bring the clock completely up to date
    before changing turns.
  */
  updateLocalClock();


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


  /*
    ======================================
    FAIR AI CLOCK — HUMAN REFUND
    ======================================

    Only applies when:

    - playing VS AI
    - human White just moved

    We refund UP TO 700 ms.

    We NEVER refund more than the time
    that actually passed during the turn.
  */
  if (
    settings.mode === "ai" &&
    move.color === "w"
  ) {

    const refundMs =
      Math.min(
        HUMAN_AIR_REFUND_MS,
        turnElapsedMs
      );


    whiteTimeMs +=
      refundMs;


    console.log(
      `Air-control refund: ${(refundMs / 1000).toFixed(2)}s`
    );
  }


  /*
    Normal chess increment.
  */
  if (
    move.color === "w"
  ) {

    whiteTimeMs +=
      incrementMs;

  } else {

    blackTimeMs +=
      incrementMs;
  }


  const newTurnTime =
    performance.now();


  lastClockTick =
    newTurnTime;


  /*
    The opponent's turn begins NOW.
  */
  localTurnStartedAt =
    newTurnTime;


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
    checkLocalGameEnd()
  ) {

    return;
  }


  if (
    settings.mode === "ai" &&
    game.turn() === "b"
  ) {

    scheduleAiMove();
  }
}


/* =========================================================
   AI THINK DELAY
========================================================= */

function getAiThinkDelay() {

  const difficulty =
    settings?.difficulty ||
    "medium";


  const range =
    AI_THINK_RANGES[
      difficulty
    ]

    ||

    AI_THINK_RANGES.medium;


  return Math.round(
    range.min +
    Math.random() *
    (
      range.max -
      range.min
    )
  );
}


/* =========================================================
   AI
========================================================= */

function scheduleAiMove() {

  aiBusy =
    true;


  aiThinking
    ?.classList
    .remove(
      "hidden"
    );


  /*
    AI clock is ALREADY RUNNING because
    game.turn() is Black.

    Therefore this delay genuinely costs
    Nova clock time.
  */
  const thinkDelay =
    getAiThinkDelay();


  console.log(
    `Nova thinking for at least ${(thinkDelay / 1000).toFixed(2)}s`
  );


  setTimeout(
    () => {

      /*
        Nova may have already lost on
        time while waiting.
      */
      if (!gameActive) {

        finishAiThinking();


        return;
      }


      makeAiMove();

    },

    thinkDelay
  );
}


function finishAiThinking() {

  aiBusy =
    false;


  aiThinking
    ?.classList
    .add(
      "hidden"
    );
}


function makeAiMove() {

  /*
    Count everything up to this exact
    point against Nova's clock:

    - intentional delay
    - minimax calculation from previous
      frames/ticks
  */
  updateLocalClock();


  if (
    blackTimeMs <= 0
  ) {

    finishAiThinking();

    endLocalOnTime();


    return;
  }


  const move =
    chooseAiMove();


  /*
    AI calculation itself also consumed
    real time.

    Update once again after calculation.
  */
  updateLocalClock();


  if (
    blackTimeMs <= 0
  ) {

    finishAiThinking();

    endLocalOnTime();


    return;
  }


  if (!move) {

    finishAiThinking();

    checkLocalGameEnd();


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


  /*
    Normal increment for AI.
  */
  blackTimeMs +=
    incrementMs;


  const newTurnTime =
    performance.now();


  lastClockTick =
    newTurnTime;


  /*
    Human's new turn begins now.

    This timestamp is later used to
    calculate the human air refund.
  */
  localTurnStartedAt =
    newTurnTime;


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

  checkLocalGameEnd();
}


/* =========================================================
   AI MOVE CHOICE
========================================================= */

function chooseAiMove() {

  const moves =
    game.moves({
      verbose:
        true
    });


  if (!moves.length) {

    return null;
  }


  if (
    settings.difficulty ===
    "easy"

    &&

    Math.random() <
    0.68
  ) {

    return moves[
      Math.floor(
        Math.random() *
        moves.length
      )
    ];
  }


  const depth = {

    easy: 1,

    medium: 2,

    hard: 2,

    expert: 3

  }[
    settings.difficulty
  ] || 2;


  let bestScore =
    -Infinity;


  let bestMoves =
    [];


  for (
    const move of moves
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
      score >
      bestScore
    ) {

      bestScore =
        score;


      bestMoves =
        [move];

    } else if (
      score ===
      bestScore
    ) {

      bestMoves.push(
        move
      );
    }
  }


  return bestMoves[
    Math.floor(
      Math.random() *
      bestMoves.length
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
    depth <= 0 ||
    chess.isGameOver()
  ) {

    return evaluate(
      chess
    );
  }


  const moves =
    chess.moves({
      verbose:
        true
    });


  if (maximizingBlack) {

    let best =
      -Infinity;


    for (
      const move of moves
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
    const move of moves
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
   AI EVALUATION
========================================================= */

function evaluate(chess) {

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

    p: 100,

    n: 320,

    b: 330,

    r: 500,

    q: 900,

    k: 0
  };


  let score =
    0;


  for (
    const row of chess.board()
  ) {

    for (
      const piece of row
    ) {

      if (!piece) {
        continue;
      }


      score +=
        piece.color === "b"

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

        if (
          mode() === "online"
        ) {

          renderClocks();


          if (
            onlineRoomState
              ?.status ===
            "playing"
          ) {

            const active =
              onlineRoomState.turn;


            if (
              getOnlineClockMs(
                active
              ) <= 0
            ) {

              claimOnlineTimeout();
            }
          }


          return;
        }


        if (!gameActive) {

          return;
        }


        updateLocalClock();


        renderClocks();


        if (
          whiteTimeMs <= 0 ||
          blackTimeMs <= 0
        ) {

          endLocalOnTime();
        }

      },

      100
    );
}


/* =========================================================
   LOCAL CLOCK
========================================================= */

function updateLocalClock() {

  if (
    !gameActive ||
    mode() === "online"
  ) {

    return;
  }


  const now =
    performance.now();


  const elapsed =
    now -
    lastClockTick;


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


/* =========================================================
   ONLINE CLOCK
========================================================= */

function getOnlineClockMs(color) {

  const room =
    onlineRoomState;


  if (!room) {

    return 0;
  }


  let remaining =
    Number(
      color === "w"
        ? room.whiteTimeMs
        : room.blackTimeMs
    ) || 0;


  if (
    room.status === "playing" &&
    room.turn === color &&
    room.turnStartedAt
  ) {

    remaining -=
      Math.max(
        0,

        serverNow() -
        Number(
          room.turnStartedAt
        )
      );
  }


  return Math.max(
    0,
    remaining
  );
}


/* =========================================================
   CLOCK FORMAT
========================================================= */

function formatClock(
  milliseconds
) {

  const totalSeconds =
    Math.ceil(
      milliseconds /
      1000
    );


  const minutes =
    Math.floor(
      totalSeconds /
      60
    );


  const seconds =
    totalSeconds %
    60;


  return (
    `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
  );
}


/* =========================================================
   RENDER CLOCKS
========================================================= */

function renderClocks() {

  const whiteTime =
    mode() === "online"

      ? getOnlineClockMs("w")

      : whiteTimeMs;


  const blackTime =
    mode() === "online"

      ? getOnlineClockMs("b")

      : blackTimeMs;


  whiteClockEl.textContent =
    formatClock(
      whiteTime
    );


  blackClockEl.textContent =
    formatClock(
      blackTime
    );


  whiteClockEl
    ?.classList
    .toggle(
      "low-time",

      whiteTime <= 10000 &&
      gameActive
    );


  blackClockEl
    ?.classList
    .toggle(
      "low-time",

      blackTime <= 10000 &&
      gameActive
    );


  whitePlayer
    ?.classList
    .toggle(
      "active-player",

      gameActive &&
      game.turn() === "w"
    );


  blackPlayer
    ?.classList
    .toggle(
      "active-player",

      gameActive &&
      game.turn() === "b"
    );
}


/* =========================================================
   LOCAL TIMEOUT
========================================================= */

function endLocalOnTime() {

  if (!gameActive) {
    return;
  }


  gameActive =
    false;


  clearInterval(
    clockTimer
  );


  /*
    If White hit zero → Black won.

    If Black hit zero → White won.
  */
  const winnerColor =
    whiteTimeMs <= 0
      ? "b"
      : "w";


  const winnerName =
    winnerColor === "w"
      ? settings.whiteName
      : settings.blackName;


  gameStatus.textContent =
    `⏱ ${winnerName} wins on time`;


  showLocalResult(
    winnerColor,
    "time"
  );


  playUiTone(
    "gameover"
  );
}


/* =========================================================
   CHECK
========================================================= */

function isInCheck(chess) {

  if (
    typeof chess.isCheck ===
    "function"
  ) {

    return chess.isCheck();
  }


  if (
    typeof chess.inCheck ===
    "function"
  ) {

    return chess.inCheck();
  }


  return false;
}


/* =========================================================
   STATUS
========================================================= */

function updateStatus() {

  renderClocks();

  updateHandColor();


  if (
    mode() === "online"
  ) {

    const room =
      onlineRoomState;


    if (!room) {
      return;
    }


    if (
      room.status ===
      "waiting"
    ) {

      gameStatus.textContent =
        `Room ${currentRoomCode} — waiting for opponent`;


      return;
    }


    if (
      room.status ===
      "ended"
    ) {

      gameStatus.textContent =
        describeOnlineStatus(
          room
        );


      return;
    }


    const side =
      game.turn() === "w"
        ? "White"
        : "Black";


    const yourTurn =
      onlineColor ===
      game.turn();


    gameStatus.textContent =
      isInCheck(game)

        ? `⚠ ${side} is in check${yourTurn ? " — your turn" : ""}`

        : yourTurn

          ? `Your turn — ${side}`

          : `${side} to move — opponent's turn`;


    return;
  }


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
}


/* =========================================================
   ONLINE STATUS
========================================================= */

function describeOnlineStatus(room) {

  const winnerName =
    room.winner === "w"

      ? room.players
        ?.white
        ?.name

      : room.winner === "b"

        ? room.players
          ?.black
          ?.name

        : null;


  if (
    room.endReason ===
    "checkmate"
  ) {

    return (
      `♛ Checkmate — ${winnerName} wins`
    );
  }


  if (
    room.endReason ===
    "time"
  ) {

    return (
      `⏱ ${winnerName} wins on time`
    );
  }


  if (
    room.endReason ===
    "resign"
  ) {

    return (
      `${winnerName} wins by resignation`
    );
  }


  if (
    room.endReason ===
    "stalemate"
  ) {

    return (
      "½–½ Stalemate"
    );
  }


  if (
    room.endReason ===
    "repetition"
  ) {

    return (
      "½–½ Draw by repetition"
    );
  }


  if (
    room.endReason ===
    "insufficient"
  ) {

    return (
      "½–½ Draw — insufficient material"
    );
  }


  return "½–½ Draw";
}


/* =========================================================
   LOCAL GAME END
========================================================= */

function checkLocalGameEnd() {

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

    const winnerColor =
      otherColor(
        game.turn()
      );


    const winner =
      winnerColor === "w"

        ? settings.whiteName

        : settings.blackName;


    gameStatus.textContent =
      `♛ Checkmate — ${winner} wins`;


    showLocalResult(
      winnerColor,
      "checkmate"
    );

  } else if (
    game.isStalemate()
  ) {

    gameStatus.textContent =
      "½–½ Stalemate";


    showLocalResult(
      null,
      "stalemate"
    );

  } else if (
    game.isThreefoldRepetition()
  ) {

    gameStatus.textContent =
      "½–½ Draw by repetition";


    showLocalResult(
      null,
      "draw"
    );

  } else if (
    game.isInsufficientMaterial()
  ) {

    gameStatus.textContent =
      "½–½ Draw — insufficient material";


    showLocalResult(
      null,
      "draw"
    );

  } else {

    gameStatus.textContent =
      "½–½ Draw";


    showLocalResult(
      null,
      "draw"
    );
  }


  playUiTone(
    "gameover"
  );


  return true;
}


/* =========================================================
   RESULT OVERLAY
========================================================= */

function hideResultOverlay() {

  lastResultSignature =
    null;


  resultOverlay
    ?.classList
    .add(
      "hidden"
    );
}


function reasonLabel(reason) {

  if (
    reason === "checkmate"
  ) {

    return "Checkmate";
  }


  if (
    reason === "time"
  ) {

    return "Win on time";
  }


  if (
    reason === "resign"
  ) {

    return "Opponent resigned";
  }


  if (
    reason === "stalemate"
  ) {

    return "Stalemate";
  }


  return "Draw";
}


function showResultOverlay(
  title,
  subtitle,
  signature
) {

  if (
    lastResultSignature ===
    signature
  ) {

    return;
  }


  lastResultSignature =
    signature;


  if (resultTitle) {

    resultTitle.textContent =
      title;
  }


  if (resultSubtitle) {

    resultSubtitle.textContent =
      subtitle;
  }


  resultOverlay
    ?.classList
    .remove(
      "hidden"
    );
}


function showLocalResult(
  winnerColor,
  reason
) {

  if (
    settings.mode === "ai"
  ) {

    if (
      winnerColor === "w"
    ) {

      showResultOverlay(
        "Yayy, you won! 🎉",

        reasonLabel(
          reason
        ),

        `ai-win-${reason}`
      );


      return;
    }


    if (
      winnerColor === "b"
    ) {

      showResultOverlay(
        "Good game! ♟️",

        "Nova AI wins",

        `ai-loss-${reason}`
      );


      return;
    }


    showResultOverlay(
      "Draw! 🤝",

      reasonLabel(
        reason
      ),

      `ai-draw-${reason}`
    );


    return;
  }


  if (winnerColor) {

    const winnerName =
      winnerColor === "w"

        ? settings.whiteName

        : settings.blackName;


    showResultOverlay(
      `${winnerName} wins! 🎉`,

      reasonLabel(
        reason
      ),

      `local-${winnerColor}-${reason}`
    );

  } else {

    showResultOverlay(
      "Draw! 🤝",

      reasonLabel(
        reason
      ),

      `local-draw-${reason}`
    );
  }
}


function showOnlineResult(room) {

  const signature =
    `online-${currentRoomCode}-${room.endReason}-${room.winner}`;


  if (
    room.winner ===
    onlineColor
  ) {

    showResultOverlay(
      "Yayy, you won! 🎉",

      reasonLabel(
        room.endReason
      ),

      signature
    );


    return;
  }


  if (!room.winner) {

    showResultOverlay(
      "Draw! 🤝",

      reasonLabel(
        room.endReason
      ),

      signature
    );


    return;
  }


  showResultOverlay(
    "Good game! ♟️",

    "Your opponent won",

    signature
  );
}


/* =========================================================
   HISTORY
========================================================= */

function renderHistory(
  override = null
) {

  const history =
    override ||
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
      "move-number";


    number.textContent =
      `${Math.floor(index / 2) + 1}.`;


    const white =
      document.createElement(
        "span"
      );


    white.textContent =
      history[index] || "";


    const black =
      document.createElement(
        "span"
      );


    black.textContent =
      history[index + 1] || "";


    row.append(
      number,
      white,
      black
    );


    moveHistoryEl.appendChild(
      row
    );
  }


  moveHistoryEl.scrollTop =
    moveHistoryEl.scrollHeight;
}


/* =========================================================
   BOARD SIZE
========================================================= */

function fitBoardToCamera() {

  if (
    !cameraStage ||
    !boardEl
  ) {

    return;
  }


  const rect =
    cameraStage
      .getBoundingClientRect();


  if (
    !rect.width ||
    !rect.height
  ) {

    return;
  }


  const size =
    Math.min(
      rect.width * 0.66,
      rect.height * 0.78
    );


  boardEl.style.width =
    `${size}px`;


  boardEl.style.height =
    `${size}px`;


  boardEl.style.top =
    "47.5%";


  const pieceSize =
    (
      size / 8
    ) *
    0.72;


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
   HOVER HELPERS
========================================================= */

function resetHover() {

  currentHoverSquare =
    null;


  hoverStartTime =
    0;


  lastActivatedSquare =
    null;


  stableFrames =
    0;


  setCursorProgress(
    0
  );
}


function resetHoverProgress() {

  currentHoverSquare =
    null;


  hoverStartTime =
    0;


  stableFrames =
    0;


  setCursorProgress(
    0
  );
}


function setCursorProgress(
  progress
) {

  handCursor
    ?.style
    .setProperty(
      "--ghost-progress",
      `${Math.round(progress * 360)}deg`
    );
}


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
            element.dataset.square ===
            square
          );
      }
    );
}


/* =========================================================
   AUDIO
========================================================= */

function ensureAudio() {

  if (!audioContext) {

    audioContext =
      new (
        window.AudioContext ||
        window.webkitAudioContext
      )();
  }


  if (
    audioContext.state ===
    "suspended"
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
    audioContext.currentTime +
    delay;


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
      start + duration
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
    start + duration
  );
}


function playUiTone(type) {

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
    type === "error"
  ) {

    beep(
      180,
      0.05,
      "square",
      0.02
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


function playMoveSound(move) {

  if (!move) {
    return;
  }


  const base = {
    p: 330,
    n: 430,
    b: 500,
    r: 280,
    q: 620,
    k: 220
  }[
    move.piece
  ] || 330;


  beep(
    base,
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
}


/* =========================================================
   COPY ROOM CODE
========================================================= */

async function copyRoomCode() {

  if (!currentRoomCode) {
    return;
  }


  try {

    await navigator
      .clipboard
      .writeText(
        currentRoomCode
      );


    if (connectionLabel) {

      connectionLabel.textContent =
        "Room code copied";
    }

  } catch {

    console.log(
      currentRoomCode
    );
  }
}


copyRoomBtn
  ?.addEventListener(
    "click",
    copyRoomCode
  );


copyWaitingCodeBtn
  ?.addEventListener(
    "click",
    copyRoomCode
  );


/* =========================================================
   MUTE
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


/* =========================================================
   RESTART
========================================================= */

restartBtn
  ?.addEventListener(
    "click",
    () => {

      if (
        settings &&
        mode() !== "online"
      ) {

        initializeLocalGame();
      }
    }
  );


/* =========================================================
   RESIGN
========================================================= */

resignBtn
  ?.addEventListener(
    "click",
    async () => {

      if (!gameActive) {
        return;
      }


      if (
        mode() === "online"
      ) {

        if (
          !currentRoomRef ||
          !onlineColor
        ) {

          return;
        }


        await runTransaction(
          currentRoomRef,

          (room) => {

            if (
              !room ||
              room.status !==
              "playing"
            ) {

              return;
            }


            room.status =
              "ended";


            room.endReason =
              "resign";


            room.winner =
              otherColor(
                onlineColor
              );


            room.turnStartedAt =
              null;


            return room;
          },

          {
            applyLocally:
              false
          }
        );


        return;
      }


      gameActive =
        false;


      clearInterval(
        clockTimer
      );


      const winnerColor =
        otherColor(
          game.turn()
        );


      const winner =
        winnerColor === "w"
          ? settings.whiteName
          : settings.blackName;


      gameStatus.textContent =
        `${winner} wins by resignation`;


      showLocalResult(
        winnerColor,
        "resign"
      );


      playUiTone(
        "gameover"
      );
    }
  );


/* =========================================================
   NEW GAME
========================================================= */

newGameBtn
  ?.addEventListener(
    "click",
    async () => {

      hideResultOverlay();


      if (
        mode() === "online"
      ) {

        await leaveOnlineState(
          true
        );
      }


      gameActive =
        false;


      clearInterval(
        clockTimer
      );


      handCursor
        ?.classList
        .add("hidden");


      gameScreen
        ?.classList
        .add("hidden");


      setupScreen
        ?.classList
        .remove("hidden");


      if (setupMessage) {

        setupMessage.textContent =
          "Ghost Board ready.";
      }
    }
  );


/* =========================================================
   LEAVE ONLINE
========================================================= */

async function leaveOnlineState(
  markDisconnected
) {

  try {

    if (
      markDisconnected &&
      db &&
      currentRoomCode &&
      onlineColor
    ) {

      await set(
        ref(
          db,
          `rooms/${currentRoomCode}/players/${colorKey(onlineColor)}/connected`
        ),

        false
      );
    }

  } catch (error) {

    console.warn(
      "Presence error:",
      error
    );
  }


  if (roomUnsubscribe) {

    roomUnsubscribe();
  }


  roomUnsubscribe =
    null;


  currentRoomCode =
    null;


  currentRoomRef =
    null;


  onlineRoomState =
    null;


  onlineColor =
    null;


  onlineMovePending =
    false;


  onlineRoomBar
    ?.classList
    .add("hidden");


  waitingOverlay
    ?.classList
    .add("hidden");


  restartBtn
    ?.classList
    .remove("hidden");
}


/* =========================================================
   CLEANUP
========================================================= */

window.addEventListener(
  "beforeunload",
  () => {

    cameraStream
      ?.getTracks()
      .forEach(
        (track) => {

          track.stop();
        }
      );
  }
);