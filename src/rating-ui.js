import {
  initializeApp,
  getApps,
  getApp
} from "firebase/app";

import {
  getAuth,
  signInAnonymously
} from "firebase/auth";

import {
  getDatabase,
  ref,
  onValue
} from "firebase/database";

import {
  firebaseConfig
} from "./firebase-config.js";


/* =========================================================
   GHOST BOARD
   ALWAYS-VISIBLE RATING UI
========================================================= */

const STARTING_RATING =
  1500;


/*
  These are DISPLAY ratings only.

  Playing AI does NOT change your Elo.
*/

const AI_DISPLAY_RATINGS = {

  easy:
    1200,

  medium:
    1500,

  hard:
    1800,

  expert:
    2100

};


/*
  We cache your last known online
  rating so it can still be shown
  immediately in AI/local mode.
*/

const RATING_CACHE_KEY =
  "ghostboard-rating-cache";


/* =========================================================
   DOM
========================================================= */

const gameModeInput =
  document.querySelector(
    "#gameMode"
  );


const difficultyInput =
  document.querySelector(
    "#difficulty"
  );


const gameScreen =
  document.querySelector(
    "#gameScreen"
  );


const whiteNameEl =
  document.querySelector(
    "#whiteName"
  );


const blackNameEl =
  document.querySelector(
    "#blackName"
  );


const whiteRatingEl =
  document.querySelector(
    "#whiteRating"
  );


const blackRatingEl =
  document.querySelector(
    "#blackRating"
  );


/* =========================================================
   STATE
========================================================= */

let myRating =
  loadCachedRating();


let profileUnsubscribe =
  null;


/* =========================================================
   CSS
========================================================= */

const style =
  document.createElement(
    "style"
  );


style.textContent = `

  .player-rating {

    margin-top:
      3px;

    margin-bottom:
      4px;

    display:
      flex;

    align-items:
      center;

    gap:
      4px;

    color:
      rgba(
        255,
        255,
        255,
        .76
      );

    font-size:
      12px;

    font-weight:
      800;

    letter-spacing:
      .035em;

    line-height:
      1.15;

    white-space:
      nowrap;

  }


  .player-card.my-player
  .player-rating {

    color:
      rgba(
        255,
        255,
        255,
        .96
      );

  }


  .player-card.active-player
  .player-rating {

    opacity:
      1;

  }

`;


document.head.appendChild(
  style
);


/* =========================================================
   SAFE RATING NUMBER
========================================================= */

function safeRating(
  value,
  fallback = STARTING_RATING
) {

  const number =
    Number(
      value
    );


  if (
    Number.isFinite(
      number
    )
  ) {

    return Math.round(
      number
    );

  }


  return fallback;

}


/* =========================================================
   CACHE
========================================================= */

function loadCachedRating() {

  const cached =
    localStorage.getItem(
      RATING_CACHE_KEY
    );


  return safeRating(
    cached,
    STARTING_RATING
  );

}


function saveCachedRating(
  rating
) {

  const safe =
    safeRating(
      rating
    );


  myRating =
    safe;


  localStorage.setItem(

    RATING_CACHE_KEY,

    String(
      safe
    )

  );

}


/* =========================================================
   RATING DISPLAY
========================================================= */

function showRating(
  element,
  rating
) {

  if (
    !element
  ) {

    return;

  }


  if (
    rating === null

    || rating === undefined

    || rating === "—"
  ) {

    element.textContent =
      "⭐ — ELO";


    return;

  }


  element.textContent =

    `⭐ ${safeRating(rating)} ELO`;

}


/* =========================================================
   AI RATING
========================================================= */

function getAiRating() {

  const difficulty =

    difficultyInput
      ?.value

    || "medium";


  return (

    AI_DISPLAY_RATINGS[
      difficulty
    ]

    || AI_DISPLAY_RATINGS.medium

  );

}


/* =========================================================
   LOCAL / AI DISPLAY
========================================================= */

function updateNonOnlineRatings() {

  const mode =

    gameModeInput
      ?.value

    || "ai";


  /*
    ONLINE is controlled by the
    room's frozen Elo values.
  */

  if (
    mode ===
    "online"
  ) {

    return;

  }


  /*
    Player 1 always shows their
    persistent Ghost Elo.
  */

  showRating(

    whiteRatingEl,

    myRating

  );


  /*
    VS AI
  */

  if (
    mode ===
    "ai"
  ) {

    showRating(

      blackRatingEl,

      getAiRating()

    );


    return;

  }


  /*
    LOCAL PLAYER 2

    Local mode is not rated, so
    Player 2 receives the neutral
    display value of 1500.
  */

  showRating(

    blackRatingEl,

    STARTING_RATING

  );

}


/* =========================================================
   ONLINE NAME PARSER

   Your current main.js writes:

      Name • 1500

   into the name element.

   We take that rating out and put
   it on its own line:

      Name
      ⭐ 1500 ELO
========================================================= */

function separateOnlineRating(
  nameElement,
  ratingElement
) {

  if (
    !nameElement

    || !ratingElement
  ) {

    return false;

  }


  const originalText =

    nameElement
      .textContent
      .trim();


  /*
    Current Ghost Board format:

      username • 1500
  */

  const match =

    originalText.match(

      /^(.*?)\s*•\s*(-?\d+)\s*$/

    );


  if (
    !match
  ) {

    return false;

  }


  const cleanName =

    match[1]
      .trim();


  const rating =

    safeRating(
      match[2]
    );


  /*
    While room is waiting,
    don't pretend that a second
    player already has a rating.
  */

  if (
    cleanName
      .toLowerCase()
      .startsWith(
        "waiting"
      )
  ) {

    nameElement.textContent =
      cleanName;


    showRating(

      ratingElement,

      "—"

    );


    return true;

  }


  nameElement.textContent =
    cleanName;


  showRating(

    ratingElement,

    rating

  );


  return true;

}


/* =========================================================
   ONLINE DISPLAY REFRESH
========================================================= */

function refreshOnlineRatings() {

  if (
    gameModeInput
      ?.value !==
    "online"
  ) {

    return;

  }


  separateOnlineRating(

    whiteNameEl,

    whiteRatingEl

  );


  separateOnlineRating(

    blackNameEl,

    blackRatingEl

  );

}


/* =========================================================
   NAME OBSERVERS

   main.js updates player names whenever
   Firebase room state changes.

   So we watch those elements and
   automatically extract the Elo.
========================================================= */

const onlineNameObserver =

  new MutationObserver(
    () => {

      refreshOnlineRatings();

    }
  );


if (
  whiteNameEl
) {

  onlineNameObserver.observe(

    whiteNameEl,

    {
      childList:
        true,

      characterData:
        true,

      subtree:
        true
    }

  );

}


if (
  blackNameEl
) {

  onlineNameObserver.observe(

    blackNameEl,

    {
      childList:
        true,

      characterData:
        true,

      subtree:
        true
    }

  );

}


/* =========================================================
   GAME SCREEN OBSERVER
========================================================= */

if (
  gameScreen
) {

  const gameScreenObserver =

    new MutationObserver(
      () => {

        if (
          gameScreen
            .classList
            .contains(
              "hidden"
            )
        ) {

          return;

        }


        const mode =

          gameModeInput
            ?.value;


        if (
          mode ===
          "online"
        ) {

          /*
            Give main.js a moment to
            write online names/rating.
          */

          setTimeout(
            refreshOnlineRatings,
            0
          );

        } else {

          updateNonOnlineRatings();

        }

      }
    );


  gameScreenObserver.observe(

    gameScreen,

    {
      attributes:
        true,

      attributeFilter:
        [
          "class"
        ]
    }

  );

}


/* =========================================================
   MODE CHANGE
========================================================= */

gameModeInput
  ?.addEventListener(

    "change",

    () => {

      if (
        gameModeInput.value ===
        "online"
      ) {

        /*
          No opponent yet.
        */

        showRating(

          whiteRatingEl,

          myRating

        );


        showRating(

          blackRatingEl,

          "—"

        );

      } else {

        updateNonOnlineRatings();

      }

    }

  );


/* =========================================================
   AI DIFFICULTY CHANGE
========================================================= */

difficultyInput
  ?.addEventListener(

    "change",

    () => {

      if (
        gameModeInput
          ?.value ===
        "ai"
      ) {

        showRating(

          blackRatingEl,

          getAiRating()

        );

      }

    }

  );


/* =========================================================
   FIREBASE PROFILE
========================================================= */

async function connectRatingProfile() {

  try {

    /*
      Reuse Firebase app if main.js
      already initialized one.

      Otherwise initialize the same
      default Ghost Board Firebase app.
    */

    const firebaseApp =

      getApps().length

        ? getApp()

        : initializeApp(
            firebaseConfig
          );


    const auth =

      getAuth(
        firebaseApp
      );


    /*
      main.js also uses anonymous auth.

      Firebase will reuse the existing
      anonymous user when available.
    */

    let user =
      auth.currentUser;


    if (
      !user
    ) {

      const credential =

        await signInAnonymously(
          auth
        );


      user =
        credential.user;

    }


    const db =

      getDatabase(
        firebaseApp
      );


    const profileRef =

      ref(

        db,

        `profiles/${user.uid}`

      );


    if (
      profileUnsubscribe
    ) {

      profileUnsubscribe();

    }


    /*
      Live listener.

      When an online game updates
      your Elo, this automatically
      receives the new rating.
    */

    profileUnsubscribe =

      onValue(

        profileRef,

        (snapshot) => {

          if (
            snapshot.exists()
          ) {

            const profile =
              snapshot.val();


            saveCachedRating(

              profile.rating

              ?? STARTING_RATING

            );

          } else {

            /*
              New Ghost Board player.
            */

            saveCachedRating(
              STARTING_RATING
            );

          }


          /*
            Don't overwrite online
            room ratings.

            Online ratings come from
            the frozen room data.
          */

          if (
            gameModeInput
              ?.value !==
            "online"
          ) {

            updateNonOnlineRatings();

          }

        },

        (error) => {

          console.warn(

            "Ghost Elo profile could not be loaded.",

            error

          );


          /*
            Cached rating still works.
          */

          updateNonOnlineRatings();

        }

      );

  } catch (error) {

    /*
      Firebase/auth unavailable?

      No problem — display the last
      cached rating, or 1500 for
      a new player.
    */

    console.warn(

      "Ghost Elo is using cached rating.",

      error

    );


    updateNonOnlineRatings();

  }

}


/* =========================================================
   INITIAL DISPLAY
========================================================= */

showRating(

  whiteRatingEl,

  myRating

);


if (
  gameModeInput
    ?.value ===
  "ai"
) {

  showRating(

    blackRatingEl,

    getAiRating()

  );

} else {

  showRating(

    blackRatingEl,

    STARTING_RATING

  );

}


/* =========================================================
   LOAD REAL PROFILE
========================================================= */

connectRatingProfile();
