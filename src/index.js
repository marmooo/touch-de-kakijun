import { JKAT } from "https://cdn.jsdelivr.net/npm/@marmooo/kanji@0.1.1/esm/jkat.js";

const dirNames = [
  "小1",
  "小1",
  "小2",
  "小3",
  "小4",
  "小5",
  "小6",
  "中1",
  "中2",
  "中3",
  "高校",
  "常用",
];
const playPanel = document.getElementById("playPanel");
const infoPanel = document.getElementById("infoPanel");
const countPanel = document.getElementById("countPanel");
const scorePanel = document.getElementById("scorePanel");
const gameTime = 180;
const yomis = {};
let problems = [];
let gameTimer;
let totalCount = 0;
let correctCount = 0;
const kanjivgDir = "/kanjivg";
let audioContext;
const audioBufferCache = {};
let japaneseVoices = [];
loadConfig();
loadVoices();

// function toKanji(kanjiId) {
//   return String.fromCodePoint(parseInt("0x" + kanjiId));
// }

function loadConfig() {
  if (localStorage.getItem("darkMode") == 1) {
    document.documentElement.setAttribute("data-bs-theme", "dark");
    [...document.getElementsByTagName("object")].forEach((object) => {
      if (isLoaded(object)) {
        const svg = object.contentDocument.documentElement;
        svg.style.background = "#212529";
        svg.firstElementChild.style.stroke = "#fff";
      } else {
        object.onload = () => {
          const svg = object.contentDocument.documentElement;
          svg.style.background = "#212529";
          svg.firstElementChild.style.stroke = "#fff";
        };
      }
    });
  }
}

// TODO: :host-context() is not supportted by Safari/Firefox now
// TODO: contentDocument() need visually-hidden (d-none does not work)
function toggleDarkMode() {
  if (localStorage.getItem("darkMode") == 1) {
    localStorage.setItem("darkMode", 0);
    document.documentElement.setAttribute("data-bs-theme", "light");
    [...document.getElementsByTagName("object")].forEach((object) => {
      const svg = object.contentDocument.documentElement;
      svg.style.background = "#fff";
      svg.firstElementChild.style.stroke = "#000";
    });
  } else {
    localStorage.setItem("darkMode", 1);
    document.documentElement.setAttribute("data-bs-theme", "dark");
    [...document.getElementsByTagName("object")].forEach((object) => {
      const svg = object.contentDocument.documentElement;
      svg.style.background = "#212529";
      svg.firstElementChild.style.stroke = "#fff";
    });
  }
}

function createAudioContext() {
  if (globalThis.AudioContext) {
    return new globalThis.AudioContext();
  } else {
    console.error("Web Audio API is not supported in this browser");
    return null;
  }
}

function unlockAudio() {
  if (audioContext) {
    audioContext.resume();
  } else {
    audioContext = createAudioContext();
    loadAudio("end", "mp3/end.mp3");
    loadAudio("correct", "mp3/correct3.mp3");
    loadAudio("correctAll", "mp3/correct1.mp3");
    loadAudio("incorrect", "mp3/incorrect1.mp3");
  }
  document.removeEventListener("click", unlockAudio);
  document.removeEventListener("keydown", unlockAudio);
}

async function loadAudio(name, url) {
  if (!audioContext) return;
  if (audioBufferCache[name]) return audioBufferCache[name];
  try {
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    audioBufferCache[name] = audioBuffer;
    return audioBuffer;
  } catch (error) {
    console.error(`Loading audio ${name} error:`, error);
    throw error;
  }
}

function playAudio(name, volume) {
  if (!audioContext) return;
  const audioBuffer = audioBufferCache[name];
  if (!audioBuffer) {
    console.error(`Audio ${name} is not found in cache`);
    return;
  }
  const sourceNode = audioContext.createBufferSource();
  sourceNode.buffer = audioBuffer;
  const gainNode = audioContext.createGain();
  if (volume) gainNode.gain.value = volume;
  gainNode.connect(audioContext.destination);
  sourceNode.connect(gainNode);
  sourceNode.start();
}

function loadVoices() {
  // https://stackoverflow.com/questions/21513706/
  const allVoicesObtained = new Promise((resolve) => {
    let voices = speechSynthesis.getVoices();
    if (voices.length !== 0) {
      resolve(voices);
    } else {
      let supported = false;
      speechSynthesis.addEventListener("voiceschanged", () => {
        supported = true;
        voices = speechSynthesis.getVoices();
        resolve(voices);
      });
      setTimeout(() => {
        if (!supported) {
          document.getElementById("noTTS").classList.remove("d-none");
        }
      }, 1000);
    }
  });
  allVoicesObtained.then((voices) => {
    japaneseVoices = voices.filter((voice) => voice.lang == "ja-JP");
  });
}

function speak(text) {
  speechSynthesis.cancel();
  const msg = new globalThis.SpeechSynthesisUtterance(text);
  msg.voice = japaneseVoices[Math.floor(Math.random() * japaneseVoices.length)];
  msg.lang = "ja-JP";
  speechSynthesis.speak(msg);
  return msg;
}

function toKanjiId(str) {
  const hex = str.codePointAt(0).toString(16);
  return ("00000" + hex).slice(-5);
}

function loadSVG(kanjiId, object) {
  object.setAttribute("data", kanjivgDir + "/" + kanjiId + ".svg");
  object.setAttribute("data-id", kanjiId);
  object.style.visibility = "hidden";
  object.onload = initSVG;
  return object;
}

function loadProblem(kanji) {
  const svg = document.getElementById("svg");
  const kanjiId = toKanjiId(kanji);
  loadSVG(kanjiId, svg);
}

function setStrokeWidth(object, kanjiId, width) {
  const id = "kvg:StrokePaths_" + kanjiId;
  const paths = object.contentDocument.querySelector('[id="' + id + '"]');
  paths.style.strokeWidth = width;
}

function removeNumbers(object, kanjiId) {
  const id = "kvg:StrokeNumbers_" + kanjiId;
  const numbers = object.contentDocument.querySelector('[id="' + id + '"]');
  numbers.remove();
}

function getKakus(object, kanjiId) {
  const result = [];
  let max = 1;
  while (true) {
    const path = object.contentDocument.getElementById(
      "kvg:" + kanjiId + "-s" + max,
    );
    if (path) {
      result.push(path);
      max += 1;
    } else {
      break;
    }
  }
  return result;
}

function addSVGEvents(object, kanjiId) {
  let counter = 0;
  let mistaked = false;
  const kakus = getKakus(object, kanjiId);
  const badge = document.getElementById(kanjiId);
  kakus.forEach((kaku, i) => {
    kaku.onclick = () => {
      if (counter == i) {
        if (counter == kakus.length - 1) {
          playAudio("correctAll");
          kaku.setAttribute("stroke", "#0d6efd"); // bs-primary
          const solved = problems.shift();
          badge.classList.remove("btn-outline-secondary");
          if (!mistaked) {
            badge.classList.add("btn-success");
            badge.classList.remove("btn-warning");
            correctCount += 1;
            if (problems.length == 0) initProblems();
          } else {
            badge.classList.add("btn-warning");
            badge.classList.remove("btn-success");
            problems.push(solved);
          }
          mistaked = false;
          counter = 0;
          nextProblem();
        } else {
          playAudio("correct", 0.3);
          kaku.setAttribute("stroke", "#0d6efd"); // bs-primary
          counter += 1;
        }
      } else if (counter < i) {
        playAudio("incorrect", 0.3);
        object.style.pointerEvents = "none";
        kakus[counter].setAttribute("stroke", "#dc3545"); // bs-danger
        badge.classList.remove("btn-secondary");
        badge.classList.add("btn-outline-secondary");
        mistaked = true;
        setTimeout(() => {
          kakus.forEach((k) => {
            k.removeAttribute("stroke");
          });
          object.style.pointerEvents = "auto";
        }, 1000);
        counter = 0;
      }
    };
  });
}

function initSVG(event) {
  const object = event.target;
  const theme = document.documentElement.getAttribute("data-bs-theme");
  if (theme == "dark") {
    const svg = object.contentDocument.documentElement;
    svg.style.background = "#212529";
    svg.firstElementChild.style.stroke = "#fff";
    [...svg.querySelectorAll("[fill]")].forEach((node) => {
      node.removeAttribute("fill");
    });
  }
  object.style.visibility = "initial";
  const kanjiId = object.dataset.id;
  const yomiStr = yomis[kanjiId];
  speak(yomiStr.replace("-", ""));
  document.getElementById("yomis").textContent = yomiStr;
  removeNumbers(object, kanjiId);
  setStrokeWidth(object, kanjiId, 5);
  addSVGEvents(object, kanjiId);
}

function nextProblem() {
  totalCount += 1;
  const kanji = problems[0];
  loadProblem(kanji);
}

function countdown() {
  speak("Ready"); // unlock
  correctCount = totalCount = 0;
  countPanel.classList.remove("visually-hidden");
  infoPanel.classList.add("d-none");
  playPanel.classList.add("d-none");
  scorePanel.classList.add("d-none");
  const counter = document.getElementById("counter");
  counter.textContent = 3;
  const timer = setInterval(() => {
    const colors = ["skyblue", "greenyellow", "violet", "tomato"];
    if (parseInt(counter.textContent) > 1) {
      const t = parseInt(counter.textContent) - 1;
      counter.style.backgroundColor = colors[t];
      counter.textContent = t;
    } else {
      clearInterval(timer);
      countPanel.classList.add("visually-hidden");
      infoPanel.classList.remove("d-none");
      playPanel.classList.remove("d-none");
      problems = shuffle(problems);
      nextProblem();
      startGameTimer();
    }
  }, 1000);
}

function startGame() {
  clearInterval(gameTimer);
  initTime();
  countdown();
}

function startGameTimer() {
  const timeNode = document.getElementById("time");
  initTime();
  gameTimer = setInterval(() => {
    const t = parseInt(timeNode.textContent);
    if (t > 0) {
      timeNode.textContent = t - 1;
    } else {
      clearInterval(gameTimer);
      playAudio("end");
      playPanel.classList.add("d-none");
      scorePanel.classList.remove("d-none");
      scoring();
    }
  }, 1000);
}

function initTime() {
  document.getElementById("time").textContent = gameTime;
}

function scoring() {
  document.getElementById("score").textContent = correctCount;
  document.getElementById("total").textContent = totalCount;
}

function initProblems() {
  const grade = document.getElementById("gradeOption").selectedIndex;
  problems = shuffle(JKAT[grade].slice());
}

function changeProblems() {
  setBadges();
  initProblems();
}

function shuffle(array) {
  for (let i = array.length; 1 < i; i--) {
    const k = Math.floor(Math.random() * i);
    [array[k], array[i - 1]] = [array[i - 1], array[k]];
  }
  return array;
}

function setBadgeTemplate() {
  const a = document.createElement("a");
  a.className = "me-1 mb-1 btn btn-sm btn-outline-secondary";
  a.target = "_blank";
  return a;
}

function setBadges() {
  const baseUrl = "https://marmooo.github.io/kanji-dict";
  const badgeTemplate = setBadgeTemplate();
  const badges = document.getElementById("badges");
  while (badges.lastElementChild) {
    badges.removeChild(badges.lastChild);
  }
  const grade = document.getElementById("gradeOption").selectedIndex;
  for (let i = 0; i < JKAT[grade].length; i++) {
    const kanji = JKAT[grade][i];
    const badge = badgeTemplate.cloneNode();
    badge.textContent = kanji;
    badge.id = toKanjiId(kanji);
    badge.href = `${baseUrl}/${dirNames[grade]}/${kanji}/`;
    badges.appendChild(badge);
  }
}

function loadYomis() {
  fetch("yomi.tsv")
    .then((response) => response.text())
    .then((tsv) => {
      tsv.trimEnd().split("\n").forEach((line) => {
        const [kanji, yomiStr] = line.split("\t");
        yomis[toKanjiId(kanji)] = yomiStr;
      });
    });
}

function isLoaded(object) {
  const doc = object.contentDocument;
  if (!doc) return false;
  const svg = doc.querySelector("svg");
  if (!svg) return false;
  if (svg.getCurrentTime() < 0) return false;
  return true;
}

loadYomis();
initProblems();
setBadges();
document.getElementById("toggleDarkMode").onclick = toggleDarkMode;
document.getElementById("restartButton").onclick = startGame;
document.getElementById("startButton").onclick = startGame;
document.getElementById("gradeOption").onchange = changeProblems;
document.addEventListener("click", unlockAudio, { once: true });
document.addEventListener("keydown", unlockAudio, { once: true });
