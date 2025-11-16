let currentWord = "";
let oscillators = [];
let audioCtx = null;
let currentInputIndex = 0;
let hasCompleted = false;

const morseLetters = {
  A: ".-", B: "-...", C: "-.-.", D: "-..", E: ".",
  F: "..-.", G: "--.", H: "....", I: "..", J: ".---",
  K: "-.-", L: ".-..", M: "--", N: "-.", O: "---",
  P: ".--.", Q: "--.-", R: ".-.", S: "...", T: "-",
  U: "..-", V: "...-", W: ".--", X: "-..-", Y: "-.--",
  Z: "--.."
};

const alphabetOrder = Object.keys(morseLetters);  // A-Z
const qwertyOrder = [
  "Q","W","E","R","T","Y","U","I","O","P",
  "A","S","D","F","G","H","J","K","L",
  "Z","X","C","V","B","N","M"
];

const qwertyRows = [
  ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
  ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
  ["Z", "X", "C", "V", "B", "N", "M"]
];

function renderMorseGrid(order = alphabetOrder) {
  const grid = document.getElementById("morse-grid");
  grid.innerHTML = "";

  // Remove layout class from previous mode
  grid.classList.remove("morse-grid");
  grid.classList.remove("morse-rows");

  if (Array.isArray(order[0])) {
    // QWERTY layout (array of rows)
    grid.classList.add("morse-rows");

    order.forEach((row, rowIndex) => {
      const rowDiv = document.createElement("div");
      rowDiv.className = "morse-row";

      // Responsive indent
      if (rowIndex === 1) rowDiv.style.paddingLeft = "3em"; // ASDF row
      if (rowIndex === 2) rowDiv.style.paddingLeft = "5em"; // ZXCV row

      row.forEach(char => {
        const div = document.createElement("div");
        div.className = "morse-play";
        div.setAttribute("data-char", char);
        div.innerHTML = `
          <span class="char">${char}</span>
          <span class="code">${morseLetters[char]}</span>
        `;
        div.addEventListener("click", () => playMorse(char));
        rowDiv.appendChild(div);
      });

      grid.appendChild(rowDiv);
    });

  } else {
    // A–Z grid layout
    grid.classList.add("morse-grid");

    order.forEach(char => {
      const div = document.createElement("div");
      div.className = "morse-play";
      div.setAttribute("data-char", char);
      div.innerHTML = `
        <span class="char">${char}</span>
        <span class="code">${morseLetters[char]}</span>
      `;
      div.addEventListener("click", () => playMorse(char));
      grid.appendChild(div);
    });
  }
}


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
  updateActiveBoxHighlight();

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

  // Initialize separate indexes
  let letterBoxIndex = 0;
  for (let i = 0; i < currentInputIndex; i++) {
    if (currentWord[i] !== " ") {
      letterBoxIndex++;
    }
  }

  // Handle Backspace
  if (event.key === "Backspace") {
    event.preventDefault();

    if (currentInputIndex > 0) {
      currentInputIndex--;

      // Skip spaces going backward
      while (currentInputIndex > 0 && currentWord[currentInputIndex] === " ") {
        currentInputIndex--;
      }

      // Update letterBoxIndex to reflect new position
      letterBoxIndex = 0;
      for (let i = 0; i < currentInputIndex; i++) {
        if (currentWord[i] !== " ") {
          letterBoxIndex++;
        }
      }

      const box = boxes[letterBoxIndex];
      box.innerText = "_";
      box.style.backgroundColor = "#1c1f26";
      updateActiveBoxHighlight();

    }

    return;
  }

  // Only handle valid letters
  if (/^[A-Z ]$/.test(key) && currentInputIndex < currentWord.length) {
    const expectedChar = currentWord[currentInputIndex];

    // If spacebar pressed on a space, just move forward over spaces
    if (event.key === " " && expectedChar === " ") {
      event.preventDefault();
      while (currentInputIndex < currentWord.length && currentWord[currentInputIndex] === " ") {
        currentInputIndex++;
      }
      return;
    }

    // If we're at a space, skip it automatically before placing letter
    while (currentInputIndex < currentWord.length && currentWord[currentInputIndex] === " ") {
      currentInputIndex++;
    }

    if (currentInputIndex >= currentWord.length) return;

    const box = boxes[letterBoxIndex];
    box.innerText = key;

    if (key === currentWord[currentInputIndex]) {
      box.style.backgroundColor = "#224422"; // green
    } else {
      box.style.backgroundColor = "#442222"; // red
    }

    currentInputIndex++;

    checkCompletion();
    updateActiveBoxHighlight();

  }
});


// ----------------------------
// CHECK COMPLETION
// ----------------------------

function checkCompletion() {
  if (hasCompleted) return;

  const boxes = document.querySelectorAll(".letter-box");
  let letterBoxIndex = 0;

  // Check each character in currentWord
  for (let i = 0; i < currentWord.length; i++) {
    const expected = currentWord[i];

    if (expected === " ") {
      // Skip over spaces in the phrase
      continue;
    }

    const typed = boxes[letterBoxIndex].innerText;

    if (typed !== expected) {
      return; // not complete yet
    }

    letterBoxIndex++;
  }

  // If we reach here — ALL letters match
  hasCompleted = true;

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

  // Clean previous
  const oldMsg = document.getElementById("success-msg");
  if (oldMsg) oldMsg.remove();
  const oldBtn = document.getElementById("next-challenge-btn");
  if (oldBtn) oldBtn.remove();

  app.appendChild(status);
  app.appendChild(nextBtn);
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

// ----------------------------
// HIGHLIGHT ACTIVE BOX
// ----------------------------

function updateActiveBoxHighlight() {
  const boxes = document.querySelectorAll(".letter-box");

  // Remove glow from all
  boxes.forEach(box => box.classList.remove("active-box"));

  // Find the correct index for the next letter
  let letterBoxIndex = 0;
  for (let i = 0; i < currentInputIndex; i++) {
    if (currentWord[i] !== " ") {
      letterBoxIndex++;
    }
  }

  // Apply glow to the next box (if not complete)
  if (letterBoxIndex < boxes.length) {
    boxes[letterBoxIndex].classList.add("active-box");
  }
}


document.addEventListener("DOMContentLoaded", () => {
  // 1. Start first challenge
  fetchAndDisplayWord();

  // 2. Mode change triggers new word
  document.getElementById("mode").addEventListener("change", fetchAndDisplayWord);

  // 3. Toggle Morse chart visibility
  const toggleChart = document.getElementById("toggle-chart");
  const chart = document.getElementById("morse-chart");

  if (chart && toggleChart) {
    chart.classList.add("collapsed");
    toggleChart.innerText = "📡 Show Morse Code Chart";
  }

  if (toggleChart && chart) {
    toggleChart.addEventListener("click", () => {
      chart.classList.toggle("collapsed");
      toggleChart.innerText = chart.classList.contains("collapsed")
        ? "📡 Show Morse Code Chart"
        : "📡 Hide Morse Code Chart";
    });
  }

  // 4. Morse chart: click-to-play for each letter
  document.querySelectorAll(".morse-play").forEach(el => {
    el.addEventListener("click", () => {
      const char = el.getAttribute("data-char");
      if (char && morseMap[char]) {
        playMorse(char);
      }
    });
  });

let usingQwerty = false;

document.getElementById("layout-toggle").addEventListener("click", () => {
  usingQwerty = !usingQwerty;
  renderMorseGrid(usingQwerty ? qwertyRows : alphabetOrder);

  const layoutBtn = document.getElementById("layout-toggle");
  layoutBtn.innerText = usingQwerty ? "QWERTY" : "A–Z";
});

renderMorseGrid();


});
