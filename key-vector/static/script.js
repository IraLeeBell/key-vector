let currentWord = "";
let oscillators = [];
let audioCtx = null;
let currentInputIndex = 0;
let hasCompleted = false;


// ----------------------------
// START PRACTICE
// ----------------------------

// Only fetch and show the word, no audio
async function fetchAndDisplayWord() {
  stopPractice();

  const mode = document.getElementById("mode").value;
  const res = await fetch(`/get_word/${mode}`);
  const data = await res.json();
  currentWord = data.word;

  hasCompleted = false;  // ✅ Reset the completion flag

  // Clear old success message and button
  const oldMsg = document.getElementById("success-msg");
  if (oldMsg) oldMsg.remove();
  const nextBtn = document.querySelector("#app button:last-of-type");
  if (nextBtn && nextBtn.innerText === "Next Challenge") nextBtn.remove();

  displayBoxes(currentWord);
  currentInputIndex = 0;
}



// UPDATED: Only plays audio
function startPractice() {
  if (currentWord) {
    playMorse(currentWord);
  }
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
  if (!currentWord) return;

  const boxes = document.querySelectorAll(".letter-box");
  const key = event.key.toUpperCase();

  if (/^[A-Z ]$/.test(key) && currentInputIndex < currentWord.length) {
    const expectedChar = currentWord[currentInputIndex];

    // Only skip input on spaces
    if (expectedChar === " " && key !== " ") return;

    const box = boxes[currentInputIndex];
    box.innerText = key;

    if (key === expectedChar) {
      box.style.backgroundColor = "#224422"; // green
    } else {
      box.style.backgroundColor = "#442222"; // red
    }

    currentInputIndex++;
    checkCompletion();
  }

  if (event.key === "Backspace") {
    event.preventDefault();
    if (currentInputIndex > 0) {
      currentInputIndex--;
      const box = boxes[currentInputIndex];
      box.innerText = "_";
      box.style.backgroundColor = "#1c1f26";
    }
  }
});

// ----------------------------
// CHECK COMPLETION
// ----------------------------

function checkCompletion() {
  if (hasCompleted) return; // prevent duplicate success handling

  const boxes = document.querySelectorAll(".letter-box");
  let success = true;

  for (let i = 0; i < currentWord.length; i++) {
    if (currentWord[i] === " ") continue;
    if (boxes[i].innerText !== currentWord[i]) {
      success = false;
      break;
    }
  }

  if (success) {
    hasCompleted = true; // prevent future triggers

    const status = document.createElement("div");
    status.id = "success-msg";
    status.innerText = "✅ Great job!";
    status.style.marginTop = "1em";
    status.style.fontSize = "1.5em";
    status.style.color = "#00ff88";

    const nextBtn = document.createElement("button");
    nextBtn.id = "next-challenge-btn";
    nextBtn.innerText = "Next Challenge";
    nextBtn.onclick = fetchAndDisplayWord;
    nextBtn.style.marginLeft = "1em";
    nextBtn.style.padding = "0.5em 1em";
    nextBtn.style.fontSize = "1em";

    const app = document.getElementById("app");
    const oldMsg = document.getElementById("success-msg");
    if (oldMsg) oldMsg.remove();
    const oldBtn = document.getElementById("next-challenge-btn");
    if (oldBtn) oldBtn.remove();

    app.appendChild(status);
    app.appendChild(nextBtn);
  }
}


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

// Run once when the page is fully loaded
window.addEventListener("DOMContentLoaded", () => {
  fetchAndDisplayWord();

// Now the element exists — attach listener safely
document.getElementById("mode").addEventListener("change", () => {
    fetchAndDisplayWord();
  });
});
