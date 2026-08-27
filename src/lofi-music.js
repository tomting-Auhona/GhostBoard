"use strict";


/* =========================================================
   GHOST BOARD
   PROCEDURAL LO-FI BACKGROUND MUSIC
========================================================= */


/*
  No external audio files are used.

  Everything is generated with
  the Web Audio API.

  This means:

  - no copyrighted song
  - no MP3 hosting
  - no extra download
  - works directly in Ghost Board
*/


const STORAGE_ENABLED =
  "ghostboard-lofi-enabled";


const STORAGE_VOLUME =
  "ghostboard-lofi-volume";


const DEFAULT_VOLUME =
  24;


/* =========================================================
   MUSIC SETTINGS
========================================================= */

const BPM =
  72;


/*
  One scheduler step = eighth note.
*/

const STEP_DURATION =
  60 / BPM / 2;


/*
  Soft four-chord lo-fi progression.

  MIDI notes are used here.

  Cmaj7
  Am7
  Dm7
  G7
*/

const CHORDS = [

  {
    root: 48,

    notes: [
      60,
      64,
      67,
      71
    ]
  },


  {
    root: 45,

    notes: [
      57,
      60,
      64,
      67
    ]
  },


  {
    root: 50,

    notes: [
      62,
      65,
      69,
      72
    ]
  },


  {
    root: 43,

    notes: [
      55,
      59,
      62,
      65
    ]
  }

];


/* =========================================================
   DOM
========================================================= */

const lofiButton =
  document.querySelector(
    "#lofiBtn"
  );


const volumeSlider =
  document.querySelector(
    "#lofiVolume"
  );


const volumeNumber =
  document.querySelector(
    "#lofiVolumeNumber"
  );


/* =========================================================
   STATE
========================================================= */

let audioContext =
  null;


let masterGain =
  null;


let musicBus =
  null;


let compressor =
  null;


let vinylGain =
  null;


let vinylFilter =
  null;


let vinylSource =
  null;


let schedulerTimer =
  null;


let nextStepTime =
  0;


let stepIndex =
  0;


let isPlaying =
  false;


/*
  We remember whether the user
  wanted music enabled.

  Browsers block true autoplay,
  so on a new page session it will
  show READY rather than secretly
  starting before interaction.
*/

let wantedOn =

  localStorage.getItem(
    STORAGE_ENABLED
  )

  === "true";


let currentVolume =

  clamp(

    Number(

      localStorage.getItem(
        STORAGE_VOLUME
      )

    )

    || DEFAULT_VOLUME,

    0,

    100

  );


/* =========================================================
   STYLE
========================================================= */

const style =
  document.createElement(
    "style"
  );


style.textContent = `

  .lofi-controls {

    display:
      flex;

    align-items:
      center;

    gap:
      8px;

  }


  #lofiBtn {

    min-width:
      118px;

    border:
      1px solid
      rgba(255,255,255,.12);

    border-radius:
      10px;

    padding:
      8px 10px;

    background:
      rgba(255,255,255,.06);

    color:
      rgba(255,255,255,.82);

    font-size:
      12px;

    font-weight:
      800;

    cursor:
      pointer;

    transition:
      transform .16s ease,
      background .16s ease,
      border-color .16s ease,
      box-shadow .16s ease;

  }


  #lofiBtn:hover {

    transform:
      translateY(-1px);

    background:
      rgba(255,255,255,.10);

    border-color:
      rgba(255,255,255,.20);

  }


  #lofiBtn.lofi-on {

    background:
      rgba(150,110,255,.15);

    border-color:
      rgba(190,155,255,.38);

    box-shadow:
      0 0 18px
      rgba(140,90,255,.12);

    color:
      white;

  }


  #lofiBtn.lofi-ready {

    border-color:
      rgba(255,215,120,.28);

  }


  .lofi-volume {

    display:
      flex;

    align-items:
      center;

    gap:
      6px;

    padding:
      5px 8px;

    border:
      1px solid
      rgba(255,255,255,.08);

    border-radius:
      10px;

    background:
      rgba(255,255,255,.035);

  }


  .lofi-volume-label {

    color:
      rgba(255,255,255,.46);

    font-size:
      9px;

    font-weight:
      900;

    letter-spacing:
      .08em;

  }


  #lofiVolume {

    width:
      72px;

    cursor:
      pointer;

    accent-color:
      currentColor;

  }


  #lofiVolumeNumber {

    min-width:
      26px;

    color:
      rgba(255,255,255,.55);

    font-size:
      10px;

    font-weight:
      800;

    text-align:
      right;

  }


  @media (
    max-width: 850px
  ) {

    .lofi-volume {

      display:
        none;

    }


    #lofiBtn {

      min-width:
        auto;

      padding:
        8px;

    }

  }

`;


document.head.appendChild(
  style
);


/* =========================================================
   HELPERS
========================================================= */

function clamp(
  value,
  minimum,
  maximum
) {

  return Math.min(

    maximum,

    Math.max(
      minimum,
      value
    )

  );

}


/* =========================================================
   MIDI -> FREQUENCY
========================================================= */

function midiToFrequency(
  midi
) {

  return (

    440

    * Math.pow(

      2,

      (
        midi - 69
      )

      / 12

    )

  );

}


/* =========================================================
   MASTER VOLUME
========================================================= */

function getMasterLevel() {

  /*
    Even 100% remains reasonably quiet.

    Lo-fi should sit behind the game,
    not overpower it.
  */

  return (

    currentVolume

    / 100

    * 0.34

  );

}


/* =========================================================
   UI
========================================================= */

function updateUI() {

  if (
    volumeSlider
  ) {

    volumeSlider.value =
      String(
        currentVolume
      );

  }


  if (
    volumeNumber
  ) {

    volumeNumber.textContent =
      `${Math.round(currentVolume)}%`;

  }


  if (
    !lofiButton
  ) {

    return;

  }


  lofiButton
    .classList
    .remove(
      "lofi-on",
      "lofi-ready"
    );


  if (
    isPlaying
  ) {

    lofiButton.textContent =
      "🎧 Lo-fi ON";


    lofiButton
      .classList
      .add(
        "lofi-on"
      );


    lofiButton
      .setAttribute(
        "aria-pressed",
        "true"
      );


    return;

  }


  if (
    wantedOn
  ) {

    lofiButton.textContent =
      "🎧 Lo-fi READY";


    lofiButton
      .classList
      .add(
        "lofi-ready"
      );


    lofiButton
      .setAttribute(
        "aria-pressed",
        "false"
      );


    return;

  }


  lofiButton.textContent =
    "🎧 Lo-fi OFF";


  lofiButton
    .setAttribute(
      "aria-pressed",
      "false"
    );

}


/* =========================================================
   AUDIO GRAPH
========================================================= */

function createAudioGraph() {

  if (
    audioContext
  ) {

    return;

  }


  const AudioContextClass =

    window.AudioContext

    || window.webkitAudioContext;


  if (
    !AudioContextClass
  ) {

    console.warn(
      "Web Audio API is unavailable."
    );


    return;

  }


  audioContext =

    new AudioContextClass();


  masterGain =

    audioContext
      .createGain();


  musicBus =

    audioContext
      .createGain();


  compressor =

    audioContext
      .createDynamicsCompressor();


  vinylGain =

    audioContext
      .createGain();


  vinylFilter =

    audioContext
      .createBiquadFilter();


  /*
    Master starts silent so we
    can gently fade in.
  */

  masterGain.gain.value =
    0;


  musicBus.gain.value =
    0.82;


  vinylGain.gain.value =
    0.018;


  vinylFilter.type =
    "bandpass";


  vinylFilter.frequency.value =
    2200;


  vinylFilter.Q.value =
    0.55;


  compressor.threshold.value =
    -20;


  compressor.knee.value =
    18;


  compressor.ratio.value =
    3;


  compressor.attack.value =
    0.01;


  compressor.release.value =
    0.28;


  musicBus.connect(
    masterGain
  );


  vinylGain.connect(
    vinylFilter
  );


  vinylFilter.connect(
    masterGain
  );


  masterGain.connect(
    compressor
  );


  compressor.connect(
    audioContext.destination
  );

}


/* =========================================================
   NOISE BUFFER
========================================================= */

function createNoiseBuffer(
  seconds = 2
) {

  const sampleRate =
    audioContext.sampleRate;


  const length =

    Math.floor(

      sampleRate

      * seconds

    );


  const buffer =

    audioContext
      .createBuffer(

        1,

        length,

        sampleRate

      );


  const data =

    buffer
      .getChannelData(
        0
      );


  let last =
    0;


  for (
    let i = 0;
    i < length;
    i++
  ) {

    /*
      Slightly smoothed noise gives
      a warmer vinyl texture.
    */

    const random =

      Math.random()
      * 2
      - 1;


    last =

      last
      * 0.82

      + random
      * 0.18;


    data[i] =
      last;

  }


  return buffer;

}


/* =========================================================
   VINYL TEXTURE
========================================================= */

function startVinyl() {

  if (
    !audioContext

    || !vinylGain
  ) {

    return;

  }


  stopVinyl();


  vinylSource =

    audioContext
      .createBufferSource();


  vinylSource.buffer =

    createNoiseBuffer(
      3
    );


  vinylSource.loop =
    true;


  vinylSource.connect(
    vinylGain
  );


  vinylSource.start();

}


function stopVinyl() {

  if (
    !vinylSource
  ) {

    return;

  }


  try {

    vinylSource.stop();

  } catch {
    // already stopped
  }


  try {

    vinylSource.disconnect();

  } catch {
    // already disconnected
  }


  vinylSource =
    null;

}


/* =========================================================
   PAD CHORD
========================================================= */

function schedulePad(
  chord,
  time,
  duration
) {

  const filter =

    audioContext
      .createBiquadFilter();


  const chordGain =

    audioContext
      .createGain();


  filter.type =
    "lowpass";


  filter.frequency
    .setValueAtTime(
      1450,
      time
    );


  filter.Q.value =
    0.75;


  chordGain.gain
    .setValueAtTime(
      0.0001,
      time
    );


  chordGain.gain
    .exponentialRampToValueAtTime(
      0.055,
      time + 0.18
    );


  chordGain.gain
    .setValueAtTime(
      0.055,
      time + duration * 0.72
    );


  chordGain.gain
    .exponentialRampToValueAtTime(
      0.0001,
      time + duration
    );


  filter.connect(
    chordGain
  );


  chordGain.connect(
    musicBus
  );


  chord.notes
    .forEach(
      (
        midi,
        index
      ) => {

        const oscillator =

          audioContext
            .createOscillator();


        const voiceGain =

          audioContext
            .createGain();


        oscillator.type =

          index % 2 === 0

            ? "triangle"

            : "sine";


        oscillator.frequency.value =

          midiToFrequency(
            midi
          );


        /*
          Tiny analog-style tuning drift.
        */

        oscillator.detune.value =

          (
            Math.random()
            * 8
          )

          - 4;


        voiceGain.gain.value =

          index === 0

            ? 0.9

            : 0.65;


        oscillator.connect(
          voiceGain
        );


        voiceGain.connect(
          filter
        );


        oscillator.start(
          time
        );


        oscillator.stop(

          time

          + duration

          + 0.05

        );

      }
    );

}


/* =========================================================
   BASS
========================================================= */

function scheduleBass(
  midi,
  time
) {

  const oscillator =

    audioContext
      .createOscillator();


  const gain =

    audioContext
      .createGain();


  const filter =

    audioContext
      .createBiquadFilter();


  oscillator.type =
    "sine";


  oscillator.frequency.value =

    midiToFrequency(
      midi
    );


  filter.type =
    "lowpass";


  filter.frequency.value =
    320;


  gain.gain
    .setValueAtTime(
      0.0001,
      time
    );


  gain.gain
    .exponentialRampToValueAtTime(
      0.095,
      time + 0.025
    );


  gain.gain
    .exponentialRampToValueAtTime(
      0.0001,
      time + 0.65
    );


  oscillator.connect(
    filter
  );


  filter.connect(
    gain
  );


  gain.connect(
    musicBus
  );


  oscillator.start(
    time
  );


  oscillator.stop(
    time + 0.7
  );

}


/* =========================================================
   KICK
========================================================= */

function scheduleKick(
  time
) {

  const oscillator =

    audioContext
      .createOscillator();


  const gain =

    audioContext
      .createGain();


  oscillator.type =
    "sine";


  oscillator.frequency
    .setValueAtTime(
      105,
      time
    );


  oscillator.frequency
    .exponentialRampToValueAtTime(
      46,
      time + 0.12
    );


  gain.gain
    .setValueAtTime(
      0.12,
      time
    );


  gain.gain
    .exponentialRampToValueAtTime(
      0.0001,
      time + 0.18
    );


  oscillator.connect(
    gain
  );


  gain.connect(
    musicBus
  );


  oscillator.start(
    time
  );


  oscillator.stop(
    time + 0.2
  );

}


/* =========================================================
   SNARE
========================================================= */

function scheduleSnare(
  time
) {

  const buffer =

    audioContext
      .createBuffer(

        1,

        Math.floor(
          audioContext.sampleRate
          * 0.16
        ),

        audioContext.sampleRate

      );


  const data =

    buffer
      .getChannelData(
        0
      );


  for (
    let i = 0;
    i < data.length;
    i++
  ) {

    data[i] =

      (
        Math.random()
        * 2
        - 1
      )

      * (
        1
        - i / data.length
      );

  }


  const source =

    audioContext
      .createBufferSource();


  const filter =

    audioContext
      .createBiquadFilter();


  const gain =

    audioContext
      .createGain();


  source.buffer =
    buffer;


  filter.type =
    "bandpass";


  filter.frequency.value =
    1500;


  filter.Q.value =
    0.8;


  gain.gain
    .setValueAtTime(
      0.045,
      time
    );


  gain.gain
    .exponentialRampToValueAtTime(
      0.0001,
      time + 0.16
    );


  source.connect(
    filter
  );


  filter.connect(
    gain
  );


  gain.connect(
    musicBus
  );


  source.start(
    time
  );

}


/* =========================================================
   HI-HAT
========================================================= */

function scheduleHat(
  time,
  strength = 1
) {

  const buffer =

    audioContext
      .createBuffer(

        1,

        Math.floor(
          audioContext.sampleRate
          * 0.04
        ),

        audioContext.sampleRate

      );


  const data =

    buffer
      .getChannelData(
        0
      );


  for (
    let i = 0;
    i < data.length;
    i++
  ) {

    data[i] =

      Math.random()
      * 2
      - 1;

  }


  const source =

    audioContext
      .createBufferSource();


  const filter =

    audioContext
      .createBiquadFilter();


  const gain =

    audioContext
      .createGain();


  source.buffer =
    buffer;


  filter.type =
    "highpass";


  filter.frequency.value =
    5200;


  gain.gain
    .setValueAtTime(

      0.014
      * strength,

      time

    );


  gain.gain
    .exponentialRampToValueAtTime(
      0.0001,
      time + 0.045
    );


  source.connect(
    filter
  );


  filter.connect(
    gain
  );


  gain.connect(
    musicBus
  );


  source.start(
    time
  );

}


/* =========================================================
   LITTLE ELECTRIC-PIANO NOTE
========================================================= */

function scheduleBell(
  midi,
  time
) {

  const oscillator1 =

    audioContext
      .createOscillator();


  const oscillator2 =

    audioContext
      .createOscillator();


  const gain =

    audioContext
      .createGain();


  const filter =

    audioContext
      .createBiquadFilter();


  oscillator1.type =
    "sine";


  oscillator2.type =
    "triangle";


  oscillator1.frequency.value =

    midiToFrequency(
      midi
    );


  oscillator2.frequency.value =

    midiToFrequency(
      midi
    );


  oscillator2.detune.value =
    5;


  filter.type =
    "lowpass";


  filter.frequency.value =
    2800;


  gain.gain
    .setValueAtTime(
      0.0001,
      time
    );


  gain.gain
    .exponentialRampToValueAtTime(
      0.025,
      time + 0.015
    );


  gain.gain
    .exponentialRampToValueAtTime(
      0.0001,
      time + 0.5
    );


  oscillator1.connect(
    filter
  );


  oscillator2.connect(
    filter
  );


  filter.connect(
    gain
  );


  gain.connect(
    musicBus
  );


  oscillator1.start(
    time
  );


  oscillator2.start(
    time
  );


  oscillator1.stop(
    time + 0.55
  );


  oscillator2.stop(
    time + 0.55
  );

}


/* =========================================================
   VINYL CRACKLE
========================================================= */

function scheduleCrackle(
  time
) {

  const oscillator =

    audioContext
      .createOscillator();


  const gain =

    audioContext
      .createGain();


  oscillator.type =
    "square";


  oscillator.frequency.value =

    2200

    + Math.random()
    * 2200;


  gain.gain
    .setValueAtTime(
      0.004,
      time
    );


  gain.gain
    .exponentialRampToValueAtTime(
      0.0001,
      time + 0.012
    );


  oscillator.connect(
    gain
  );


  gain.connect(
    vinylGain
  );


  oscillator.start(
    time
  );


  oscillator.stop(
    time + 0.015
  );

}


/* =========================================================
   STEP SCHEDULER
========================================================= */

function scheduleStep(
  step,
  time
) {

  const beat =

    step
    % 8;


  const chordIndex =

    Math.floor(
      step / 8
    )

    % CHORDS.length;


  const chord =
    CHORDS[
      chordIndex
    ];


  /*
    New chord every bar.
  */

  if (
    beat === 0
  ) {

    schedulePad(

      chord,

      time,

      STEP_DURATION
      * 7.7

    );

  }


  /*
    Soft kick.
  */

  if (
    beat === 0

    || beat === 4
  ) {

    scheduleKick(
      time
    );

  }


  /*
    Lo-fi snare placement.
  */

  if (
    beat === 2

    || beat === 6
  ) {

    scheduleSnare(
      time
    );

  }


  /*
    Quiet eighth-note hats.
  */

  scheduleHat(

    time,

    beat % 2 === 0

      ? 0.75

      : 1

  );


  /*
    Bass notes.
  */

  if (
    beat === 0

    || beat === 5
  ) {

    scheduleBass(

      chord.root,

      time

    );

  }


  /*
    Sparse little melody notes.

    These are chosen from the
    current chord so the music
    stays calm rather than random.
  */

  if (
    (
      beat === 1

      || beat === 3

      || beat === 5

      || beat === 7
    )

    && Math.random() <
    0.34
  ) {

    const note =

      chord.notes[

        Math.floor(

          Math.random()

          * chord.notes.length

        )

      ]

      + 12;


    scheduleBell(

      note,

      time

      + Math.random()
      * 0.035

    );

  }


  /*
    Random tiny vinyl pops.
  */

  if (
    Math.random() <
    0.13
  ) {

    scheduleCrackle(

      time

      + Math.random()
      * STEP_DURATION

    );

  }

}


/* =========================================================
   SCHEDULER
========================================================= */

function scheduler() {

  if (
    !isPlaying

    || !audioContext
  ) {

    return;

  }


  const scheduleAhead =
    0.22;


  while (

    nextStepTime <

    audioContext.currentTime

    + scheduleAhead

  ) {

    scheduleStep(

      stepIndex,

      nextStepTime

    );


    stepIndex +=
      1;


    nextStepTime +=
      STEP_DURATION;

  }

}


/* =========================================================
   START MUSIC
========================================================= */

async function startMusic() {

  createAudioGraph();


  if (
    !audioContext
  ) {

    wantedOn =
      false;


    updateUI();


    return;

  }


  if (
    isPlaying
  ) {

    return;

  }


  try {

    await audioContext.resume();

  } catch (error) {

    console.warn(
      "Could not resume lo-fi audio.",
      error
    );


    return;

  }


  wantedOn =
    true;


  isPlaying =
    true;


  localStorage.setItem(

    STORAGE_ENABLED,

    "true"

  );


  startVinyl();


  /*
    Begin music just ahead of
    current audio time.
  */

  nextStepTime =

    audioContext.currentTime

    + 0.08;


  scheduler();


  schedulerTimer =

    window.setInterval(

      scheduler,

      50

    );


  const now =
    audioContext.currentTime;


  masterGain.gain
    .cancelScheduledValues(
      now
    );


  masterGain.gain
    .setValueAtTime(
      0.0001,
      now
    );


  masterGain.gain
    .linearRampToValueAtTime(

      getMasterLevel(),

      now + 0.55

    );


  updateUI();

}


/* =========================================================
   STOP MUSIC
========================================================= */

function stopMusic() {

  wantedOn =
    false;


  localStorage.setItem(

    STORAGE_ENABLED,

    "false"

  );


  if (
    !isPlaying
  ) {

    updateUI();


    return;

  }


  isPlaying =
    false;


  if (
    schedulerTimer
  ) {

    clearInterval(
      schedulerTimer
    );


    schedulerTimer =
      null;

  }


  if (
    audioContext

    && masterGain
  ) {

    const now =
      audioContext.currentTime;


    masterGain.gain
      .cancelScheduledValues(
        now
      );


    masterGain.gain
      .setValueAtTime(

        Math.max(
          0.0001,
          masterGain.gain.value
        ),

        now

      );


    masterGain.gain
      .linearRampToValueAtTime(

        0.0001,

        now + 0.45

      );


    window.setTimeout(
      () => {

        stopVinyl();

      },

      500
    );

  }


  updateUI();

}


/* =========================================================
   TOGGLE
========================================================= */

async function toggleMusic() {

  if (
    isPlaying
  ) {

    stopMusic();


    return;

  }


  await startMusic();

}


/* =========================================================
   VOLUME
========================================================= */

function setVolume(
  value
) {

  currentVolume =

    clamp(

      Number(
        value
      ),

      0,

      100

    );


  localStorage.setItem(

    STORAGE_VOLUME,

    String(
      currentVolume
    )

  );


  if (
    audioContext

    && masterGain

    && isPlaying
  ) {

    const now =
      audioContext.currentTime;


    masterGain.gain
      .cancelScheduledValues(
        now
      );


    masterGain.gain
      .setTargetAtTime(

        getMasterLevel(),

        now,

        0.08

      );

  }


  updateUI();

}


/* =========================================================
   BUTTON EVENT
========================================================= */

lofiButton
  ?.addEventListener(

    "click",

    toggleMusic

  );


/* =========================================================
   VOLUME EVENT
========================================================= */

volumeSlider
  ?.addEventListener(

    "input",

    (event) => {

      setVolume(
        event.target.value
      );

    }

  );


/* =========================================================
   REMEMBERED PREFERENCE
========================================================= */

/*
  Browsers do not allow us to begin
  audio before the user interacts.

  If Lo-fi was ON last session,
  we remember that preference.

  The first normal interaction with
  Ghost Board can then start it.
*/

function tryResumeRememberedMusic(
  event
) {

  if (
    !wantedOn

    || isPlaying
  ) {

    return;

  }


  /*
    If the user is pressing the Lo-fi
    button itself, let its normal click
    handler control everything.
  */

  if (
    event.target
      ?.closest
      ?.("#lofiBtn")
  ) {

    return;

  }


  startMusic();

}


/*
  Start from a genuine user gesture
  if the user had music enabled
  previously.
*/

document.addEventListener(

  "pointerdown",

  tryResumeRememberedMusic,

  {
    once:
      true
  }

);


document.addEventListener(

  "keydown",

  tryResumeRememberedMusic,

  {
    once:
      true
  }

);


/* =========================================================
   INITIAL UI
========================================================= */

updateUI();
