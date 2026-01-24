const WORD_LENGTH = 5;
const MAX_GUESSES = 6;

const DEFAULT_WORDS = [
  "about",
  "agent",
  "ahead",
  "angel",
  "baker",
  "basic",
  "brain",
  "brave",
  "bring",
  "cabin",
  "cable",
  "chair",
  "chart",
  "chase",
  "clean",
  "cider",
  "crane",
  "crown",
  "dance",
  "dream",
  "eager",
  "eagle",
  "earth",
  "faith",
  "flame",
  "giant",
  "globe",
  "grace",
  "great",
  "habit",
  "happy",
  "heart",
  "jelly",
  "juice",
  "light",
  "lucky",
  "magic",
  "maker",
  "match",
  "north",
  "ocean",
  "paint",
  "panel",
  "party",
  "piano",
  "quick",
  "quiet",
  "raise",
  "river",
  "robot",
  "scale",
  "shine",
  "smile",
  "solar",
  "sound",
  "stone",
  "storm",
  "story",
  "think",
  "toast",
  "trail",
  "trust",
  "uncle",
  "vivid",
  "whale",
  "world",
  "youth",
  "zebra",
];

const grid = document.getElementById("grid");
const statusMessage = document.getElementById("status-message");
const keyboard = document.getElementById("keyboard");
const newGameButton = document.getElementById("new-game");
const statsButton = document.getElementById("stats-button");
const statsPanel = document.getElementById("stats-panel");
const statsSummary = document.getElementById("stats-summary");
const statsDistribution = document.getElementById("stats-distribution");
const statsCloseButton = document.getElementById("stats-close");

const STATS_COOKIE = "wordgameStats";

let ANSWER_WORDS = [];
let GUESS_WORDS = [];
let targetWord = "";
let currentGuess = "";
let guesses = [];
let gameOver = false;
let hasRecordedResult = false;
let stats = {
  gamesPlayed: 0,
  wins: 0,
  distribution: Array(MAX_GUESSES).fill(0),
};

const keyboardRows = [
  ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p"],
  ["a", "s", "d", "f", "g", "h", "j", "k", "l"],
  ["enter", "z", "x", "c", "v", "b", "n", "m", "back"],
];

function pickWord() {
  const wordBank = ANSWER_WORDS.length > 0 ? ANSWER_WORDS : DEFAULT_WORDS;
  const randomIndex = Math.floor(Math.random() * wordBank.length);
  return wordBank[randomIndex];
}

function buildGrid() {
  grid.innerHTML = "";
  for (let row = 0; row < MAX_GUESSES; row += 1) {
    for (let col = 0; col < WORD_LENGTH; col += 1) {
      const tile = document.createElement("div");
      tile.className = "tile";
      tile.dataset.row = row;
      tile.dataset.col = col;
      grid.appendChild(tile);
    }
  }
}

function buildKeyboard() {
  keyboard.innerHTML = "";
  keyboardRows.forEach((row, rowIndex) => {
    const rowContainer = document.createElement("div");
    rowContainer.className = "keyboard-row";
    if (rowIndex === 1) {
      rowContainer.classList.add("keyboard-row--offset");
    }
    row.forEach((letter) => {
      const key = document.createElement("button");
      key.type = "button";
      key.className = "key";
      if (letter === "enter") {
        key.classList.add("key--enter");
      }
      if (letter === "back") {
        key.classList.add("wide");
      }
      key.dataset.key = letter;
      key.textContent = letter === "back" ? "⌫" : letter;
      key.addEventListener("click", () => handleKey(letter));
      rowContainer.appendChild(key);
    });
    keyboard.appendChild(rowContainer);
  });
}

function setStatus(message, tone = "neutral") {
  statusMessage.textContent = message;
  statusMessage.dataset.tone = tone;
}

function readCookie(name) {
  const cookies = document.cookie.split(";").map((cookie) => cookie.trim());
  const match = cookies.find((cookie) => cookie.startsWith(`${name}=`));
  if (!match) {
    return null;
  }
  return decodeURIComponent(match.split("=").slice(1).join("="));
}

function writeCookie(name, value, days = 365) {
  const expires = new Date(Date.now() + days * 86400000).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
}

function loadStats() {
  const stored = readCookie(STATS_COOKIE);
  if (!stored) {
    return;
  }
  try {
    const parsed = JSON.parse(stored);
    if (
      typeof parsed.gamesPlayed === "number" &&
      typeof parsed.wins === "number" &&
      Array.isArray(parsed.distribution)
    ) {
      stats = {
        gamesPlayed: parsed.gamesPlayed,
        wins: parsed.wins,
        distribution: parsed.distribution.slice(0, MAX_GUESSES),
      };
      if (stats.distribution.length < MAX_GUESSES) {
        stats.distribution = stats.distribution.concat(
          Array(MAX_GUESSES - stats.distribution.length).fill(0),
        );
      }
    }
  } catch (error) {
    stats = {
      gamesPlayed: 0,
      wins: 0,
      distribution: Array(MAX_GUESSES).fill(0),
    };
  }
}

function saveStats() {
  writeCookie(STATS_COOKIE, JSON.stringify(stats));
}

function updateStatsPanel() {
  const winRate = stats.gamesPlayed === 0 ? 0 : Math.round((stats.wins / stats.gamesPlayed) * 100);
  statsSummary.innerHTML = "";
  const summaryItems = [
    { label: "Played", value: stats.gamesPlayed },
    { label: "Wins", value: stats.wins },
    { label: "Win rate", value: `${winRate}%` },
  ];
  summaryItems.forEach((item) => {
    const card = document.createElement("div");
    card.className = "stats-card";
    const label = document.createElement("div");
    label.className = "stats-card__label";
    label.textContent = item.label;
    const value = document.createElement("div");
    value.className = "stats-card__value";
    value.textContent = item.value;
    card.append(label, value);
    statsSummary.appendChild(card);
  });

  statsDistribution.innerHTML = "";
  const maxCount = Math.max(1, ...stats.distribution);
  stats.distribution.forEach((count, index) => {
    const row = document.createElement("div");
    row.className = "stats-row";
    const label = document.createElement("span");
    label.textContent = `${index + 1}`;
    const bar = document.createElement("div");
    bar.className = "stats-bar";
    const fill = document.createElement("div");
    fill.className = "stats-bar__fill";
    fill.style.width = `${Math.round((count / maxCount) * 100)}%`;
    bar.appendChild(fill);
    const value = document.createElement("span");
    value.textContent = count;
    row.append(label, bar, value);
    statsDistribution.appendChild(row);
  });
}

function openStatsPanel() {
  updateStatsPanel();
  statsPanel.classList.add("is-open");
  statsPanel.setAttribute("aria-hidden", "false");
}

function closeStatsPanel() {
  statsPanel.classList.remove("is-open");
  statsPanel.setAttribute("aria-hidden", "true");
}

function recordGameResult(won, guessCount) {
  if (hasRecordedResult) {
    return;
  }
  stats.gamesPlayed += 1;
  if (won) {
    stats.wins += 1;
    if (guessCount >= 1 && guessCount <= MAX_GUESSES) {
      stats.distribution[guessCount - 1] += 1;
    }
  }
  saveStats();
  if (statsPanel.classList.contains("is-open")) {
    updateStatsPanel();
  }
  hasRecordedResult = true;
}

function resetGame() {
  targetWord = pickWord();
  currentGuess = "";
  guesses = [];
  gameOver = false;
  hasRecordedResult = false;
  buildGrid();
  buildKeyboard();
  setStatus("Guess the 5-letter word in six tries.");
}

async function loadWordLists() {
  try {
    const [answerResponse, guessResponse] = await Promise.all([
      fetch("ans.txt"),
      fetch("guess.txt"),
    ]);
    if (!answerResponse.ok || !guessResponse.ok) {
      throw new Error("Failed to load word lists.");
    }
    const [answerText, guessText] = await Promise.all([
      answerResponse.text(),
      guessResponse.text(),
    ]);
    ANSWER_WORDS = answerText
      .split(/\r?\n/)
      .map((word) => word.trim().toLowerCase())
      .filter((word) => word.length === WORD_LENGTH && /^[a-z]+$/.test(word));
    GUESS_WORDS = guessText
      .split(/\r?\n/)
      .map((word) => word.trim().toLowerCase())
      .filter((word) => word.length === WORD_LENGTH && /^[a-z]+$/.test(word));
    if (ANSWER_WORDS.length === 0) {
      ANSWER_WORDS = [...DEFAULT_WORDS];
    }
    if (GUESS_WORDS.length === 0) {
      GUESS_WORDS = [...ANSWER_WORDS];
    }
    return true;
  } catch (error) {
    ANSWER_WORDS = [...DEFAULT_WORDS];
    GUESS_WORDS = [...DEFAULT_WORDS];
    return false;
  }
}

function handleKey(key) {
  if (gameOver) {
    return;
  }

  if (key === "enter") {
    submitGuess();
    return;
  }

  if (key === "back") {
    currentGuess = currentGuess.slice(0, -1);
    updateBoard();
    return;
  }

  if (/^[a-z]$/i.test(key) && currentGuess.length < WORD_LENGTH) {
    currentGuess += key.toLowerCase();
    updateBoard();
  }
}

function updateBoard() {
  const rowIndex = guesses.length;
  for (let col = 0; col < WORD_LENGTH; col += 1) {
    const tile = grid.querySelector(`.tile[data-row="${rowIndex}"][data-col="${col}"]`);
    if (!tile) {
      continue;
    }
    const letter = currentGuess[col] || "";
    tile.textContent = letter;
    tile.classList.toggle("filled", Boolean(letter));
  }
}

function scoreGuess(guess, target) {
  const result = Array(WORD_LENGTH).fill("absent");
  const remaining = target.split("");

  for (let i = 0; i < WORD_LENGTH; i += 1) {
    if (guess[i] === target[i]) {
      result[i] = "correct";
      remaining[i] = null;
    }
  }

  for (let i = 0; i < WORD_LENGTH; i += 1) {
    if (result[i] !== "absent") {
      continue;
    }
    const index = remaining.indexOf(guess[i]);
    if (index !== -1) {
      result[i] = "present";
      remaining[index] = null;
    }
  }

  return result;
}

function paintGuess(guess, result, rowIndex) {
  for (let col = 0; col < WORD_LENGTH; col += 1) {
    const tile = grid.querySelector(`.tile[data-row="${rowIndex}"][data-col="${col}"]`);
    tile.textContent = guess[col];
    tile.classList.add(result[col]);
  }
}

function updateKeyboard(guess, result) {
  guess.split("").forEach((letter, index) => {
    const key = keyboard.querySelector(`.key[data-key="${letter}"]`);
    if (!key) {
      return;
    }
    const currentClass = key.classList.contains("correct")
      ? "correct"
      : key.classList.contains("present")
      ? "present"
      : key.classList.contains("absent")
      ? "absent"
      : "";

    const nextClass = result[index];
    if (currentClass === "correct") {
      return;
    }
    if (currentClass === "present" && nextClass === "absent") {
      return;
    }
    key.classList.remove("present", "absent");
    if (nextClass !== "absent" || currentClass === "") {
      key.classList.add(nextClass);
    }
  });
}

function submitGuess() {
  if (currentGuess.length < WORD_LENGTH) {
    setStatus("Not enough letters. Keep typing.", "warning");
    return;
  }

  const guessBank =
    GUESS_WORDS.length > 0 || ANSWER_WORDS.length > 0
      ? Array.from(new Set([...ANSWER_WORDS, ...GUESS_WORDS]))
      : DEFAULT_WORDS;
  if (!guessBank.includes(currentGuess)) {
    setStatus("Word not in list. Try another one.", "warning");
    return;
  }

  const result = scoreGuess(currentGuess, targetWord);
  paintGuess(currentGuess, result, guesses.length);
  updateKeyboard(currentGuess, result);
  guesses.push(currentGuess);

  if (currentGuess === targetWord) {
    setStatus("Nice! You solved it.", "success");
    gameOver = true;
    recordGameResult(true, guesses.length);
    return;
  }

  if (guesses.length >= MAX_GUESSES) {
    setStatus(`Out of guesses! The word was ${targetWord.toUpperCase()}.`, "error");
    gameOver = true;
    recordGameResult(false, 0);
    return;
  }

  currentGuess = "";
  setStatus("Keep going!", "neutral");
  updateBoard();
}

function handlePhysicalKey(event) {
  const key = event.key.toLowerCase();
  if (key === "enter") {
    if (document.activeElement === newGameButton) {
      newGameButton.blur();
    }
    handleKey("enter");
    return;
  }
  if (key === "backspace") {
    handleKey("back");
    return;
  }
  if (/^[a-z]$/.test(key)) {
    handleKey(key);
  }
}

statsButton.addEventListener("click", openStatsPanel);
statsCloseButton.addEventListener("click", closeStatsPanel);
newGameButton.addEventListener("click", () => {
  resetGame();
  newGameButton.blur();
});
document.addEventListener("keydown", handlePhysicalKey);

loadStats();
setStatus("Loading word lists...");
loadWordLists().then((loaded) => {
  resetGame();
  if (!loaded) {
    setStatus("Using the built-in word list. (Word list download failed.)", "warning");
  }
});
