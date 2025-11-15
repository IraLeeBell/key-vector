let currentWord = "";
let oscillators = [];
let audioCtx = null;
let currentInputIndex = 0;

// ----------------------------
// START PRACTICE
// ----------------------------
async function startPractice() {
  stopPractice();

  const mode = document.getElementById("mode").value;
  const res = await fetch(`/get_word/${mode}`);
  const data = await res.json();
  currentWord = data.word;

  displayBoxes(currentWord);
  currentInputIndex = 0;

  playMorse(currentWord);
}

// ----------------------------
// STOP AUDIO
// ----------------------------
function stopPractice() {
  if (oscillators.length && audioCtx) {
    for (let osc of oscillators) {
      try { osc.stop(); } catch {}
    }
    oscillators = [];
    audioCtx.close();
    audioCtx = null;
  }
}

// ----------------------------
// DISPLAY LETTER BOXES
// ----------------------------
function displayBoxes(text) {
  const boxContainer = document.getElementById("boxes");
  boxContainer.innerHTML = "";
  currentInputIndex = 0;

  const words = text.split(" ");

  for (let word of words) {
    const wordSpan = document.createElement("span");
    wordSpan.className = "word-span";

    for (let char of word) {
      const box = document.createElement("span");
      box.className = "letter-box";
      box.innerHTML = "_";
      wordSpan.appendChild(box);
    }

    boxContainer.appendChild(wordSpan);

    // Add space between words visually
    const gap = document.createElement("span");
    gap.className = "word-gap";
    boxContainer.appendChild(gap);
  }
}

// ----------------------------
// GLOBAL KEYBOARD TYPING
// ----------------------------
document.addEventListener("keydown", (event) => {
  if (!currentWord) return; // Nothing to type yet

  const boxes = document.querySelectorAll(".letter-box");
  const key = event.key.toUpperCase();

  if (/^[A-Z ]$/.test(key) && currentInputIndex < boxes.length) {
    boxes[currentInputIndex].innerText = key;
    currentInputIndex++;
  }

  if (event.key === "Backspace") {
    event.preventDefault(); // prevent browser navigation
    if (currentInputIndex > 0) {
      currentInputIndex--;
      boxes[currentInputIndex].innerText = "_";
    }
  }
});

// ----------------------------
// PLAY MORSE
// ----------------------------
const morseMap = {
  A: ".-", B: "-...", C: "-.-.", D: "-..", E: ".",
  F: "..-.", G: "--.", H: "....", I: "..", J: ".---",
  K: "-.-", L: ".-..", M: "--", N: "-.", O: "---",
  P: ".--.", Q: "--.-", R: ".-.", S: "...", T: "-",
  U: "..-", V: "...-", W: ".--", X: "-..-", Y: "-.--",
  Z: "--..", " ": " "
};

function playMorse(text) {
  const unit = 0.1;
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  let t = audioCtx.currentTime;
  oscillators = [];

  for (let char of text) {
    const pattern = morseMap[char] || "";

    for (let sym of pattern) {
      const osc = audioCtx.createOscillator();
      osc.frequency.value = 600;
      osc.connect(audioCtx.destination);
      oscillators.push(osc);

      if (sym === ".") {
        osc.start(t);
        osc.stop(t + unit);
        t += unit * 2;
      } else if (sym === "-") {
        osc.start(t);
        osc.stop(t + unit * 3);
        t += unit * 4;
      } else if (sym === " ") {
        t += unit * 4;
      }
    }

    t += unit * 2;
  }
}
