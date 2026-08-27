import "./style.css";

import { FilesetResolver, HandLandmarker } from "@mediapipe/tasks-vision";
import { Chess } from "chess.js";
import { initializeApp } from "firebase/app";
import { getAuth, signInAnonymously } from "firebase/auth";
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

const BUILD_VERSION = "ONLINE-STABLE-HOVER-5";

console.log(`Ghost Board ${BUILD_VERSION}`);

document.title = "Ghost Board";

const $ = (s) => document.querySelector(s);


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

const copyWaitingCodeBtn = $("#copyWaitingCodeBtn");


/* =========================================================
   REMOVE OLD INSTRUCTIONS
========================================================= */

document
  .querySelectorAll(
    "#gestureHint, #belowCameraHint, .instructions, .hand-info"
  )
  .forEach(
    (element) => {

      element.remove();

    }
  );


/* =========================================================
   CHESS
========================================================= */

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
   AIR MOVEMENT SETTINGS
========================================================= */

/*
  Selecting the source piece
  stays quick.
*/

const SELECT_DWELL_MS = 120;


/*
  Destination requires slightly
  more intention.

  0.20 seconds.
*/

const MOVE_DWELL_MS = 200;


/*
  High responsiveness.

  Less lag between real finger
  and cursor.
*/

const SMOOTHING = 0.88;


/*
  Initial piece selection must be
  reasonably inside its square.
*/

const SELECTION_CORE_MARGIN = 0.13;


/*
  Mild destination magnetism.
*/

const MAGNET_RADIUS = 0.50;

const KING_MAGNET_RADIUS = 0.64;


/*
  IMPORTANT:

  A hover timer is NOT allowed
  to run while the finger is
  moving quickly.

  Value is measured as fraction
  of one square per frame.

  Example:
  if square ≈ 50 px,
  0.055 ≈ 2.75 px.
*/

const STABLE_MOTION_FRACTION = 0.055;


/*
  Require multiple stable frames
  before starting hover timer.
*/

const REQUIRED_STABLE_FRAMES = 2;


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
   FIREBASE
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
   HELPERS
========================================================= */

const mode = () => {

  return (
    settings?.mode
    || gameModeInput?.value
    || "ai"
  );

};


const colorKey = (color) => {

  return (
    color === "w"
      ? "white"
      : "black"
  );

};


const otherColor = (color) => {

  return (
    color === "w"
      ? "b"
      : "w"
  );

};


const serverNow = () => {

  return (
    Date.now()
    + serverTimeOffset
  );

};


function normalizeArray(value) {

  if (
    Array.isArray(value)
  ) {

    return value;

  }


  if (
    !value
    || typeof value !== "object"
  ) {

    return [];

  }


  return Object
    .keys(value)
    .sort(
      (a, b) => {

        return (
          Number(a)
          - Number(b)
        );

      }
    )
    .map(
      (key) => {

        return value[key];

      }
    );

}


/* =========================================================
   FIREBASE SETUP
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
        value
        && !String(value)
          .includes(
            "PASTE_"
          )
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


  if (
    !firebaseApp
  ) {

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
          snapshot.val()
          || 0;

      }

    );

  } else if (
    !firebaseUser
  ) {

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


  let result =
    "";


  for (
    let index = 0;
    index < 4;
    index++
  ) {

    result +=
      chars[
        Math.floor(
          Math.random()
          * chars.length
        )
      ];

  }


  return (
    `GHOST-${result}`
  );

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


  if (
    !startGameBtn
  ) {

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


  if (
    startGameBtn
  ) {

    startGameBtn.textContent =
      joining
        ? "JOIN ONLINE GAME"
        : "CREATE ONLINE GAME";

  }


  if (
    onlineNote
  ) {

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
          timeControlInput.value !== "custom"
        );

    }
  );


boardThemeInput
  ?.addEventListener(
    "change",
    () => {

      app.dataset.theme =
        boardThemeInput.value;


      if (
        liveTheme
      ) {

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
    ".sticker"
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
   SAVED VALUES
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
  savedName
  && player1NameInput
) {

  player1NameInput.value =
    savedName;

}


if (
  savedTheme
) {

  if (
    boardThemeInput
  ) {

    boardThemeInput.value =
      savedTheme;

  }


  if (
    liveTheme
  ) {

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
        )
        || 1
      );


    increment =
      Math.max(
        0,
        Number(
          customIncrement.value
        )
        || 0
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

      difficultyInput
        ?.value

      || "medium",


    minutes,


    increment,


    theme:
      boardThemeInput.value,


    sound:

      soundToggle
        ?.checked

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

        settings =
          collectSettings();


        soundEnabled =
          settings.sound;


        app.dataset.theme =
          settings.theme;


        if (
          liveTheme
        ) {

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
          settings.mode ===
          "online"
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


        if (
          !handLoopStarted
        ) {

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

          error?.message

          || "Could not start Ghost Board.";

      } finally {

        startGameBtn.disabled =
          false;

      }

    }
  );


function openGameScreen() {

  setupScreen
    ?.classList
    .add(
      "hidden"
    );


  gameScreen
    ?.classList
    .remove(
      "hidden"
    );


  requestAnimationFrame(
    fitBoardToCamera
  );

}


/* =========================================================
   CAMERA
========================================================= */

async function startCamera() {

  if (
    cameraStream
  ) {

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

          facingMode:
            "user",

          width: {
            ideal:
              1280
          },

          height: {
            ideal:
              720
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
          0.5

      }

    );

}


async function initHandTracking() {

  if (
    handLandmarker
  ) {

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
      "GPU unavailable, using CPU.",
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

    settings.mode ===
    "ai"

      ? "Nova AI 🤖"

      : settings.blackName;


  onlineRoomBar
    ?.classList
    .add(
      "hidden"
    );


  waitingOverlay
    ?.classList
    .add(
      "hidden"
    );


  restartBtn
    ?.classList
    .remove(
      "hidden"
    );


  whitePlayer
    ?.classList
    .remove(
      "my-player"
    );


  blackPlayer
    ?.classList
    .remove(
      "my-player"
    );


  renderBoard();


  renderHistory();


  updateStatus();


  startClock();

}


/* =========================================================
   ONLINE CREATE
========================================================= */

async function createOnlineRoom() {

  const initialMs =

    settings.minutes
    * 60
    * 1000;


  const incMs =

    settings.increment
    * 1000;


  let code =
    null;


  let roomReference =
    null;


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


    if (
      !snapshot.exists()
    ) {

      code =
        candidate;


      roomReference =
        candidateRef;


      break;

    }

  }


  if (
    !code
  ) {

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

      version:
        5,


      status:
        "waiting",


      createdAt:
        serverNow(),


      hostUid:
        firebaseUser.uid,


      fen:
        initialGame.fen(),


      turn:
        "w",


      ply:
        0,


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


      history:
        [],


      moves:
        [],


      lastMove:
        null,


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

  ).set(
    false
  );


  openGameScreen();


  subscribeToRoom(
    code
  );

}


/* =========================================================
   ONLINE JOIN
========================================================= */

async function joinOnlineRoom(
  code
) {

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


  if (
    !snapshot.exists()
  ) {

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
          currentBlack
            ?.uid
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

  ).set(
    false
  );


  openGameScreen();


  subscribeToRoom(
    code
  );

}


/* =========================================================
   ONLINE LISTENER
========================================================= */

function subscribeToRoom(
  code
) {

  if (
    roomUnsubscribe
  ) {

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

        if (
          !snapshot.exists()
        ) {

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

        console.error(
          error
        );


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


  if (
    !room
  ) {

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
      const move
      of moves
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
    room.lastMove
    || null;


  incrementMs =
    room.incrementMs
    || 0;


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
    .remove(
      "hidden"
    );


  if (
    roomCodeLabel
  ) {

    roomCodeLabel.textContent =
      currentRoomCode;

  }


  if (
    waitingCode
  ) {

    waitingCode.textContent =
      currentRoomCode;

  }


  restartBtn
    ?.classList
    .add(
      "hidden"
    );


  const opponentKey =

    onlineColor ===
    "w"

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


    waitingOverlay
      ?.classList
      .remove(
        "hidden"
      );


    if (
      waitingText
    ) {

      waitingText.textContent =
        "Share this code with another player.";

    }


    if (
      connectionLabel
    ) {

      connectionLabel.textContent =
        "Waiting for opponent";

    }

  } else {

    waitingOverlay
      ?.classList
      .add(
        "hidden"
      );


    gameActive =
      room.status ===
      "playing";


    if (
      connectionLabel
    ) {

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

}


/* =========================================================
   ONLINE MOVE
========================================================= */

async function submitOnlineMove(
  from,
  to
) {

  if (
    !currentRoomRef
    || onlineMovePending
    || !onlineRoomState
    || !onlineColor
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
            !room
            || room.status !== "playing"
            || room.turn !== onlineColor
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
            !player
            || player.uid !== firebaseUser.uid
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
              const move
              of moves
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

              serverNow()

              - Number(

                room.turnStartedAt

                || serverNow()

              )

            );


          if (
            onlineColor ===
            "w"
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

            onlineColor ===
            "w"

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


          let moveResult;


          try {

            moveResult =

              board.move({

                from,

                to,

                promotion:
                  "q"

              });

          } catch {

            return;

          }


          if (
            !moveResult
          ) {

            return;

          }


          if (
            onlineColor ===
            "w"
          ) {

            whiteTime +=

              Number(
                room.incrementMs
                || 0
              );

          } else {

            blackTime +=

              Number(
                room.incrementMs
                || 0
              );

          }


          room.moves = [

            ...moves,

            {

              from:
                moveResult.from,

              to:
                moveResult.to,

              promotion:
                moveResult.promotion
                || "q"

            }

          ];


          room.history = [

            ...normalizeArray(
              room.history
            ),

            moveResult.san

          ];


          room.fen =
            board.fen();


          room.turn =
            board.turn();


          room.ply =

            Number(
              room.ply
              || 0
            )

            + 1;


          room.whiteTimeMs =
            whiteTime;


          room.blackTimeMs =
            blackTime;


          room.turnStartedAt =
            serverNow();


          room.lastMove = {

            from:
              moveResult.from,

            to:
              moveResult.to,

            piece:
              moveResult.piece,

            captured:
              moveResult.captured
              || null,

            san:
              moveResult.san,

            flags:
              moveResult.flags
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
    !currentRoomRef
    || !onlineRoomState
    || onlineRoomState.status !== "playing"
  ) {

    return;

  }


  try {

    await runTransaction(

      currentRoomRef,

      (room) => {

        if (
          !room
          || room.status !== "playing"
          || !room.turnStartedAt
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

            serverNow()

            - Number(
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
   GAME END
========================================================= */

function describeGameEnd(
  board
) {

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
   INPUT PERMISSIONS
========================================================= */

function canControlTurn() {

  if (
    !gameActive
    || aiBusy
    || onlineMovePending
  ) {

    return false;

  }


  if (
    mode() ===
    "ai"
  ) {

    return (
      game.turn() ===
      "w"
    );

  }


  if (
    mode() ===
    "online"
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

    mode() === "online"

    && onlineColor === "b"

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
        8,
        7,
        6,
        5,
        4,
        3,
        2,
        1
      ]

      : [
        1,
        2,
        3,
        4,
        5,
        6,
        7,
        8
      ]

  );

}


/* =========================================================
   BOARD
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

        (row + col) % 2 ===
        0

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
        lastMove

        && (
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


      if (
        piece
      ) {

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
        square
        && canControlTurn()
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
      .contains(
        "hidden"
      )

    || !handLandmarker

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

   THIS IS THE MAIN MOVEMENT FIX
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

    (1 - indexTip.x)

    * stageRect.width;


  const rawY =

    indexTip.y

    * stageRect.height;


  /*
    Responsive smoothing.
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
    ?.classList
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


  /*
    Determine how much the finger moved
    compared with the previous camera
    frame.
  */

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
    previousPointerX !== null
    && previousPointerY !== null
    && squareSize > 0
  ) {

    motionFraction =

      Math.hypot(

        smoothX
        - previousPointerX,

        smoothY
        - previousPointerY

      )

      / squareSize;

  }


  previousPointerX =
    smoothX;


  previousPointerY =
    smoothY;


  if (
    !square
    || !canControlTurn()
  ) {

    resetHoverProgress();


    return;

  }


  if (
    lastActivatedSquare
    && square !==
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
    ==============================================
    IMPORTANT FLY-OVER PROTECTION
    ==============================================

    If your hand is moving through d3
    toward d4, motionFraction is high.

    Therefore:

    - timer is reset
    - d3 cannot activate
    - ring stays at 0

    Only once your finger settles on
    d4 can the timer start.
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


  /*
    Arrived on a new square.
  */

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


  /*
    Count stable frames.
  */

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


  /*
    Finger is actually settled now.

    Start timer.
  */

  if (
    !hoverStartTime
  ) {

    hoverStartTime =
      now;

  }


  const requiredTime =

    selectedSquare

      ? MOVE_DWELL_MS

      : SELECT_DWELL_MS;


  const progress =

    Math.min(

      1,

      (
        now
        - hoverStartTime
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

  if (
    !cameraStage
  ) {

    return;

  }


  cameraStage.dataset.handColor =

    mode() === "online"
    && onlineColor

      ? onlineColor

      : game.turn();

}


/* =========================================================
   CURSOR -> SQUARE
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


  const files =
    fileOrder();


  const ranks =
    rankOrder();


  const squareWidth =
    rect.width / 8;


  const squareHeight =
    rect.height / 8;


  const boardX =
    clientX - rect.left;


  const boardY =
    clientY - rect.top;


  const col =

    Math.min(

      7,

      Math.max(

        0,

        Math.floor(
          boardX
          / squareWidth
        )

      )

    );


  const row =

    Math.min(

      7,

      Math.max(

        0,

        Math.floor(
          boardY
          / squareHeight
        )

      )

    );


  const rawSquare =

    `${files[col]}${ranks[row]}`;


  /*
    SELECTING SOURCE PIECE

    No magnetism at all.
  */

  if (
    !selectedSquare
  ) {

    const piece =
      game.get(
        rawSquare
      );


    if (
      !piece
      || piece.color !==
      game.turn()
    ) {

      return null;

    }


    const localX =

      boardX
      / squareWidth

      - col;


    const localY =

      boardY
      / squareHeight

      - row;


    const margin =
      SELECTION_CORE_MARGIN;


    if (
      localX < margin

      || localX >
      1 - margin

      || localY < margin

      || localY >
      1 - margin
    ) {

      return null;

    }


    return rawSquare;

  }


  /*
    If the finger is genuinely inside
    a legal square, use that exact square.

    This means when you actually reach d4,
    d4 wins over any magnetic target.
  */

  if (
    isActionableSquare(
      rawSquare
    )
  ) {

    return rawSquare;

  }


  /*
    Mild magnetic help for destinations.
  */

  let nearestSquare =
    null;


  let nearestDistance =
    Infinity;


  let nearestLimit =
    MAGNET_RADIUS;


  for (
    const square
    of getMagneticTargets()
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
      targetCol < 0
      || targetRow < 0
    ) {

      continue;

    }


    const centerX =

      (
        targetCol + 0.5
      )

      * squareWidth;


    const centerY =

      (
        targetRow + 0.5
      )

      * squareHeight;


    const distance =

      Math.hypot(

        (
          boardX
          - centerX
        )

        / squareWidth,


        (
          boardY
          - centerY
        )

        / squareHeight

      );


    const targetPiece =
      game.get(
        square
      );


    const limit =

      targetPiece
        ?.type === "k"

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

    nearestSquare

    && nearestDistance <=
    nearestLimit

      ? nearestSquare

      : rawSquare

  );

}


/* =========================================================
   MAGNETIC TARGETS
========================================================= */

function getMagneticTargets() {

  if (
    !selectedSquare
  ) {

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
    Add rook as castling target.
  */

  if (
    selectedPiece
      ?.type === "k"
  ) {

    if (
      selectedSquare === "e1"
      && legalTargets.includes(
        "g1"
      )
    ) {

      targets.add(
        "h1"
      );

    }


    if (
      selectedSquare === "e1"
      && legalTargets.includes(
        "c1"
      )
    ) {

      targets.add(
        "a1"
      );

    }


    if (
      selectedSquare === "e8"
      && legalTargets.includes(
        "g8"
      )
    ) {

      targets.add(
        "h8"
      );

    }


    if (
      selectedSquare === "e8"
      && legalTargets.includes(
        "c8"
      )
    ) {

      targets.add(
        "a8"
      );

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
    !firstSquare
    || !secondSquare
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
    King -> rook.
  */

  if (
    first?.type === "k"

    && second?.type === "r"

    && first.color ===
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
    Rook -> king.
  */

  else if (
    first?.type === "r"

    && second?.type === "k"

    && first.color ===
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
    King -> normal destination.
  */

  else if (
    first?.type ===
    "k"
  ) {

    kingSquare =
      firstSquare;


    color =
      first.color;


    if (
      firstSquare ===
      "e1"

      && secondSquare ===
      "g1"
    ) {

      rookSquare =
        "h1";

    }


    if (
      firstSquare ===
      "e1"

      && secondSquare ===
      "c1"
    ) {

      rookSquare =
        "a1";

    }


    if (
      firstSquare ===
      "e8"

      && secondSquare ===
      "g8"
    ) {

      rookSquare =
        "h8";

    }


    if (
      firstSquare ===
      "e8"

      && secondSquare ===
      "c8"
    ) {

      rookSquare =
        "a8";

    }

  }


  if (
    !kingSquare
    || !rookSquare
    || !color
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
        (move) => {

          return move.to;

        }
      );


  if (
    color === "w"

    && kingSquare === "e1"

    && rookSquare === "h1"

    && legalKingMoves.includes(
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
    color === "w"

    && kingSquare === "e1"

    && rookSquare === "a1"

    && legalKingMoves.includes(
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


  if (
    color === "b"

    && kingSquare === "e8"

    && rookSquare === "h8"

    && legalKingMoves.includes(
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
    color === "b"

    && kingSquare === "e8"

    && rookSquare === "a8"

    && legalKingMoves.includes(
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


  return null;

}


/* =========================================================
   ACTIONABLE SQUARE
========================================================= */

function isActionableSquare(
  square
) {

  if (
    !square
    || !canControlTurn()
  ) {

    return false;

  }


  const piece =
    game.get(
      square
    );


  if (
    !selectedSquare
  ) {

    return Boolean(

      piece

      && piece.color ===
      game.turn()

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


  return legalTargets
    .includes(
      square
    );

}


/* =========================================================
   INPUT
========================================================= */

function handleSquareInput(
  square
) {

  if (
    !canControlTurn()
  ) {

    return;

  }


  if (
    !selectedSquare
  ) {

    selectSquare(
      square
    );


    return;

  }


  const castle =

    getCastlingMove(

      selectedSquare,

      square

    );


  if (
    castle
  ) {

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


  if (
    legalTargets.includes(
      square
    )
  ) {

    submitMove(

      selectedSquare,

      square

    );


    return;

  }


  /*
    Mouse fallback.
  */

  const clickedPiece =
    game.get(
      square
    );


  if (
    clickedPiece

    && clickedPiece.color ===
    game.turn()
  ) {

    selectSquare(
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
    || piece.color !==
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
        (move) => {

          return move.to;

        }
      );


  resetHoverProgress();


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
    mode() ===
    "online"
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
========================================================= */

function tryLocalMove(
  from,
  to
) {

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


  if (
    !move
  ) {

    lastClockTick =
      performance.now();


    return;

  }


  if (
    move.color ===
    "w"
  ) {

    whiteTimeMs +=
      incrementMs;

  } else {

    blackTimeMs +=
      incrementMs;

  }


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
    checkLocalGameEnd()
  ) {

    return;

  }


  if (
    settings.mode ===
    "ai"

    && game.turn() ===
    "b"
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
    ?.classList
    .remove(
      "hidden"
    );


  setTimeout(
    () => {

      if (
        !gameActive
      ) {

        finishAiThinking();


        return;

      }


      makeAiMove();

    },

    settings.difficulty ===
    "expert"

      ? 420

      : 250

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

  updateLocalClock();


  const move =
    chooseAiMove();


  if (
    !move
  ) {

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


  blackTimeMs +=
    incrementMs;


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


  checkLocalGameEnd();

}


/* =========================================================
   AI CHOICE
========================================================= */

function chooseAiMove() {

  const moves =
    game.moves({
      verbose:
        true
    });


  if (
    !moves.length
  ) {

    return null;

  }


  if (
    settings.difficulty ===
    "easy"

    && Math.random() <
    0.68
  ) {

    return moves[

      Math.floor(

        Math.random()
        * moves.length

      )

    ];

  }


  const depth =

    {

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
    ]

    || 2;


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
      verbose:
        true
    });


  if (
    maximizingBlack
  ) {

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
        beta <=
        alpha
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
      beta <=
      alpha
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

      chess.turn() ===
      "w"

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

      if (
        !piece
      ) {

        continue;

      }


      score +=

        piece.color ===
        "b"

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
          mode() ===
          "online"
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


        if (
          !gameActive
        ) {

          return;

        }


        updateLocalClock();


        renderClocks();


        if (
          whiteTimeMs <= 0
          || blackTimeMs <= 0
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
    !gameActive
    || mode() ===
    "online"
  ) {

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
    game.turn() ===
    "w"
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

function getOnlineClockMs(
  color
) {

  const room =
    onlineRoomState;


  if (
    !room
  ) {

    return 0;

  }


  let remaining =

    Number(

      color === "w"

        ? room.whiteTimeMs

        : room.blackTimeMs

    )

    || 0;


  if (
    room.status ===
    "playing"

    && room.turn ===
    color

    && room.turnStartedAt
  ) {

    remaining -=

      Math.max(

        0,

        serverNow()

        - Number(
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


/* =========================================================
   RENDER CLOCKS
========================================================= */

function renderClocks() {

  const whiteTime =

    mode() === "online"

      ? getOnlineClockMs(
        "w"
      )

      : whiteTimeMs;


  const blackTime =

    mode() === "online"

      ? getOnlineClockMs(
        "b"
      )

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

      whiteTime <=
      10000

      && gameActive

    );


  blackClockEl
    ?.classList
    .toggle(

      "low-time",

      blackTime <=
      10000

      && gameActive

    );


  whitePlayer
    ?.classList
    .toggle(

      "active-player",

      gameActive

      && game.turn() ===
      "w"

    );


  blackPlayer
    ?.classList
    .toggle(

      "active-player",

      gameActive

      && game.turn() ===
      "b"

    );

}


/* =========================================================
   TIMEOUT
========================================================= */

function endLocalOnTime() {

  if (
    !gameActive
  ) {

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
   CHECK
========================================================= */

function isInCheck(
  chess
) {

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
    mode() ===
    "online"
  ) {

    const room =
      onlineRoomState;


    if (
      !room
    ) {

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

      game.turn() ===
      "w"

        ? "White"

        : "Black";


    const yourTurn =

      onlineColor ===
      game.turn();


    gameStatus.textContent =

      isInCheck(
        game
      )

        ? `⚠ ${side} is in check${yourTurn ? " — your turn" : ""}`

        : yourTurn

          ? `Your turn — ${side}`

          : `${side} to move — opponent's turn`;


    return;

  }


  if (
    !gameActive
  ) {

    return;

  }


  const side =

    game.turn() ===
    "w"

      ? "White"

      : "Black";


  gameStatus.textContent =

    isInCheck(
      game
    )

      ? `⚠ ${side} is in check`

      : `${side} to move`;

}


/* =========================================================
   ONLINE STATUS
========================================================= */

function describeOnlineStatus(
  room
) {

  const winnerName =

    room.winner ===
    "w"

      ? room.players
        ?.white
        ?.name

      : room.winner ===
      "b"

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


  return (
    "½–½ Draw"
  );

}


/* =========================================================
   LOCAL END
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

    const winner =

      game.turn() ===
      "w"

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

  } else {

    gameStatus.textContent =
      "½–½ Draw";

  }


  playUiTone(
    "gameover"
  );


  return true;

}


/* =========================================================
   HISTORY
========================================================= */

function renderHistory(
  override = null
) {

  const history =

    override

    || game.history();


  if (
    !history.length
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
      "move-number";


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

    (
      size / 8
    )

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
   HOVER RESET
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

  if (
    !audioContext
  ) {

    audioContext =

      new (

        window.AudioContext

        || window.webkitAudioContext

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

  if (
    !soundEnabled
  ) {

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


function playUiTone(
  type
) {

  if (
    type ===
    "select"
  ) {

    beep(
      700,
      0.04,
      "sine",
      0.022
    );

  }


  if (
    type ===
    "error"
  ) {

    beep(
      180,
      0.05,
      "square",
      0.02
    );

  }


  if (
    type ===
    "gameover"
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

  if (
    !move
  ) {

    return;

  }


  const base =

    {

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
    ]

    || 330;


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
   COPY ROOM
========================================================= */

async function copyRoomCode() {

  if (
    !currentRoomCode
  ) {

    return;

  }


  try {

    await navigator
      .clipboard
      .writeText(
        currentRoomCode
      );


    if (
      connectionLabel
    ) {

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
        settings
        && mode() !==
        "online"
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

      if (
        !gameActive
      ) {

        return;

      }


      if (
        mode() ===
        "online"
      ) {

        if (
          !currentRoomRef
          || !onlineColor
        ) {

          return;

        }


        await runTransaction(

          currentRoomRef,

          (room) => {

            if (
              !room
              || room.status !== "playing"
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


      const winner =

        game.turn() ===
        "w"

          ? settings.blackName

          : settings.whiteName;


      gameStatus.textContent =

        `${winner} wins by resignation`;


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

      if (
        mode() ===
        "online"
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
        .add(
          "hidden"
        );


      gameScreen
        ?.classList
        .add(
          "hidden"
        );


      setupScreen
        ?.classList
        .remove(
          "hidden"
        );


      if (
        setupMessage
      ) {

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
      markDisconnected

      && db

      && currentRoomCode

      && onlineColor
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


  if (
    roomUnsubscribe
  ) {

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
    .add(
      "hidden"
    );


  waitingOverlay
    ?.classList
    .add(
      "hidden"
    );


  restartBtn
    ?.classList
    .remove(
      "hidden"
    );

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