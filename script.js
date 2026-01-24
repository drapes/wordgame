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
const statsModeDailyButton = document.getElementById("stats-mode-daily");
const statsModeInfiniteButton = document.getElementById("stats-mode-infinite");
const statsModeAllButton = document.getElementById("stats-mode-all");
const modeDailyButton = document.getElementById("mode-daily");
const modeInfiniteButton = document.getElementById("mode-infinite");
const modeDuoButton = document.getElementById("mode-duo");

const STATS_COOKIE = "wordgameStats";
const DAILY_COOKIE = "wordgameDaily";
const INFINITE_COOKIE = "wordgameInfinite";

let ANSWER_WORDS = [];
let GUESS_WORDS = [];
let targetWords = [];
let currentGuess = "";
let guesses = [];
let gameOver = false;
let hasRecordedResult = false;
let currentMode = "infinite";
let statsMode = "all";
let currentDailyKey = null;
let gridBoards = [];
let solvedBoards = [];
let stats = {
  modes: {
    daily: {
      gamesPlayed: 0,
      wins: 0,
      distribution: Array(MAX_GUESSES).fill(0),
      currentStreak: 0,
      maxStreak: 0,
      lastResultDate: null,
      lastResultWin: false,
    },
    infinite: {
      gamesPlayed: 0,
      wins: 0,
      distribution: Array(MAX_GUESSES).fill(0),
      currentStreak: 0,
      maxStreak: 0,
    },
  },
};

const keyboardRows = [
  ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p"],
  ["a", "s", "d", "f", "g", "h", "j", "k", "l"],
  ["enter", "z", "x", "c", "v", "b", "n", "m", "back"],
];

function pickWord(wordBank, seed) {
  if (wordBank.length === 0) {
    return "";
  }
  if (typeof seed === "number") {
    const index = Math.abs(seed) % wordBank.length;
    return wordBank[index];
  }
  const randomIndex = Math.floor(Math.random() * wordBank.length);
  return wordBank[randomIndex];
}

function buildGrid() {
  grid.innerHTML = "";
  gridBoards = [];
  const boardCount = currentMode === "duo" ? 2 : 1;
  for (let boardIndex = 0; boardIndex < boardCount; boardIndex += 1) {
    const board = document.createElement("div");
    board.className = "grid";
    board.dataset.board = boardIndex;
    for (let row = 0; row < MAX_GUESSES; row += 1) {
      for (let col = 0; col < WORD_LENGTH; col += 1) {
        const tile = document.createElement("div");
        tile.className = "tile";
        tile.dataset.row = row;
        tile.dataset.col = col;
        board.appendChild(tile);
      }
    }
    grid.appendChild(board);
    gridBoards.push(board);
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

function createEmptyStats() {
  return {
    gamesPlayed: 0,
    wins: 0,
    distribution: Array(MAX_GUESSES).fill(0),
  };
}

function createStatsStore() {
  return {
    modes: {
      daily: {
        ...createEmptyStats(),
        currentStreak: 0,
        maxStreak: 0,
        lastResultDate: null,
        lastResultWin: false,
      },
      infinite: {
        ...createEmptyStats(),
        currentStreak: 0,
        maxStreak: 0,
      },
    },
  };
}

function getCombinedStats() {
  const combined = createEmptyStats();
  Object.values(stats.modes).forEach((modeStats) => {
    combined.gamesPlayed += modeStats.gamesPlayed;
    combined.wins += modeStats.wins;
    combined.distribution = combined.distribution.map(
      (value, index) => value + (modeStats.distribution[index] || 0),
    );
  });
  return combined;
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

function saveInfiniteState(payload) {
  writeCookie(INFINITE_COOKIE, JSON.stringify(payload), 7);
}

function loadInfiniteState() {
  const stored = readCookie(INFINITE_COOKIE);
  if (!stored) {
    return null;
  }
  try {
    return JSON.parse(stored);
  } catch (error) {
    return null;
  }
}

function saveDailyState(payload) {
  writeCookie(DAILY_COOKIE, JSON.stringify(payload), 7);
}

function loadDailyState() {
  const stored = readCookie(DAILY_COOKIE);
  if (!stored) {
    return null;
  }
  try {
    return JSON.parse(stored);
  } catch (error) {
    return null;
  }
}

function loadStats() {
  const stored = readCookie(STATS_COOKIE);
  if (!stored) {
    return;
  }
  try {
    const parsed = JSON.parse(stored);
    if (parsed?.modes?.daily && parsed?.modes?.infinite) {
      stats = {
        modes: {
          daily: {
            gamesPlayed: parsed.modes.daily.gamesPlayed || 0,
            wins: parsed.modes.daily.wins || 0,
            distribution: Array.isArray(parsed.modes.daily.distribution)
              ? parsed.modes.daily.distribution.slice(0, MAX_GUESSES)
              : Array(MAX_GUESSES).fill(0),
            currentStreak: parsed.modes.daily.currentStreak || 0,
            maxStreak: parsed.modes.daily.maxStreak || 0,
            lastResultDate: parsed.modes.daily.lastResultDate || null,
            lastResultWin: parsed.modes.daily.lastResultWin || false,
          },
          infinite: {
            gamesPlayed: parsed.modes.infinite.gamesPlayed || 0,
            wins: parsed.modes.infinite.wins || 0,
            distribution: Array.isArray(parsed.modes.infinite.distribution)
              ? parsed.modes.infinite.distribution.slice(0, MAX_GUESSES)
              : Array(MAX_GUESSES).fill(0),
            currentStreak: parsed.modes.infinite.currentStreak || 0,
            maxStreak: parsed.modes.infinite.maxStreak || 0,
          },
        },
      };
    } else if (
      typeof parsed.gamesPlayed === "number" &&
      typeof parsed.wins === "number" &&
      Array.isArray(parsed.distribution)
    ) {
      stats = createStatsStore();
      stats.modes.infinite = {
        gamesPlayed: parsed.gamesPlayed,
        wins: parsed.wins,
        distribution: parsed.distribution.slice(0, MAX_GUESSES),
        currentStreak: 0,
        maxStreak: 0,
      };
    }

    Object.values(stats.modes).forEach((modeStats) => {
      if (modeStats.distribution.length < MAX_GUESSES) {
        modeStats.distribution = modeStats.distribution.concat(
          Array(MAX_GUESSES - modeStats.distribution.length).fill(0),
        );
      }
    });
  } catch (error) {
    stats = createStatsStore();
  }
}

function saveStats() {
  writeCookie(STATS_COOKIE, JSON.stringify(stats));
}

function setStatsMode(mode) {
  statsMode = mode;
  statsModeDailyButton.classList.toggle("is-active", mode === "daily");
  statsModeInfiniteButton.classList.toggle("is-active", mode === "infinite");
  statsModeAllButton.classList.toggle("is-active", mode === "all");
  updateStatsPanel();
}

function updateStatsPanel() {
  const combinedStats = getCombinedStats();
  const selectedStats =
    statsMode === "daily"
      ? stats.modes.daily
      : statsMode === "infinite"
      ? stats.modes.infinite
      : combinedStats;
  statsSummary.innerHTML = "";
  statsDistribution.innerHTML = "";

  const winRate =
    selectedStats.gamesPlayed === 0
      ? 0
      : Math.round((selectedStats.wins / selectedStats.gamesPlayed) * 100);
  const summaryItems = [
    { label: "Played", value: selectedStats.gamesPlayed },
    { label: "Wins", value: selectedStats.wins },
    { label: "Win rate", value: `${winRate}%` },
  ];
  if (statsMode !== "all") {
    summaryItems.push(
      { label: "Streak", value: selectedStats.currentStreak },
      { label: "Max streak", value: selectedStats.maxStreak },
    );
  }
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

  const maxCount = Math.max(1, ...selectedStats.distribution);
  selectedStats.distribution.forEach((count, index) => {
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

function updateNextWordButton() {
  if (currentMode !== "infinite" && currentMode !== "duo") {
    newGameButton.style.display = "none";
    return;
  }
  newGameButton.textContent = "Next word";
  newGameButton.style.display = gameOver ? "inline-flex" : "none";
}

function setMode(mode) {
  currentMode = mode;
  modeDailyButton.classList.toggle("is-active", mode === "daily");
  modeInfiniteButton.classList.toggle("is-active", mode === "infinite");
  modeDuoButton.classList.toggle("is-active", mode === "duo");
  updateNextWordButton();
  void resetGame();
}

function hashString(value) {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) % 2147483647;
  }
  return hash;
}

function daysBetween(a, b) {
  const start = new Date(`${a}T00:00:00Z`);
  const end = new Date(`${b}T00:00:00Z`);
  const diffMs = end - start;
  return Math.floor(diffMs / 86400000);
}

function updateDailyStreaks(dateKey, won) {
  const dailyStats = stats.modes.daily;
  if (dailyStats.lastResultDate) {
    const gap = daysBetween(dailyStats.lastResultDate, dateKey);
    if (gap > 1) {
      dailyStats.currentStreak = 0;
    }
  }
  if (won) {
    if (dailyStats.lastResultDate) {
      const gap = daysBetween(dailyStats.lastResultDate, dateKey);
      dailyStats.currentStreak = gap === 1 ? dailyStats.currentStreak + 1 : 1;
    } else {
      dailyStats.currentStreak = 1;
    }
    dailyStats.maxStreak = Math.max(dailyStats.maxStreak, dailyStats.currentStreak);
  } else {
    dailyStats.currentStreak = 0;
  }
  dailyStats.lastResultDate = dateKey;
  dailyStats.lastResultWin = won;
}

async function getServerDateKey() {
  try {
    const response = await fetch(window.location.href, { method: "HEAD", cache: "no-store" });
    const serverDate = response.headers.get("date");
    if (serverDate) {
      return new Date(serverDate).toISOString().slice(0, 10);
    }
  } catch (error) {
    // fall back to local time
  }
  return new Date().toISOString().slice(0, 10);
}

async function getDailyWord() {
  const wordBank = ANSWER_WORDS.length > 0 ? ANSWER_WORDS : DEFAULT_WORDS;
  const dateKey = await getServerDateKey();
  const seed = hashString(dateKey);
  return { word: pickWord(wordBank, seed), dateKey };
}

function renderSavedBoard(savedGuesses) {
  buildGrid();
  buildKeyboard();
  guesses = [];
  solvedBoards = targetWords.map(() => false);
  savedGuesses.forEach((guess, index) => {
    targetWords.forEach((target, boardIndex) => {
      const result = scoreGuess(guess, target);
      paintGuess(guess, result, index, boardIndex);
      if (currentMode === "duo") {
        updateKeyboardDuo(guess, result, boardIndex);
      } else {
        updateKeyboardSingle(guess, result);
      }
      if (guess === target) {
        solvedBoards[boardIndex] = true;
      }
    });
    guesses.push(guess);
  });
}

function openStatsPanel() {
  updateStatsPanel();
  statsPanel.classList.add("is-open");
  statsPanel.setAttribute("aria-hidden", "false");
  statsPanel.scrollIntoView({ behavior: "smooth", block: "start" });
}

function closeStatsPanel() {
  statsPanel.classList.remove("is-open");
  statsPanel.setAttribute("aria-hidden", "true");
}

function recordGameResult(won, guessCount) {
  if (hasRecordedResult) {
    return;
  }
  const modeStats = stats.modes[currentMode] || stats.modes.infinite;
  modeStats.gamesPlayed += 1;
  if (won) {
    modeStats.wins += 1;
    if (guessCount >= 1 && guessCount <= MAX_GUESSES) {
      modeStats.distribution[guessCount - 1] += 1;
    }
  }
  if (currentMode === "daily" && currentDailyKey) {
    updateDailyStreaks(currentDailyKey, won);
  } else if (currentMode === "infinite" || currentMode === "duo") {
    modeStats.currentStreak = won ? modeStats.currentStreak + 1 : 0;
    modeStats.maxStreak = Math.max(modeStats.maxStreak, modeStats.currentStreak);
  }
  saveStats();
  if (currentMode === "daily" && currentDailyKey) {
    saveDailyState({
      dateKey: currentDailyKey,
      completed: true,
      guesses: [...guesses],
    });
  } else if (currentMode === "infinite" || currentMode === "duo") {
    saveInfiniteState({
      mode: currentMode,
      targetWords,
      guesses: [...guesses],
      completed: true,
    });
  }
  updateStatsPanel();
  updateNextWordButton();
  hasRecordedResult = true;
}

async function resetGame() {
  if (currentMode === "daily") {
    const dailyInfo = await getDailyWord();
    targetWords = [dailyInfo.word];
    currentDailyKey = dailyInfo.dateKey;
    const dailyStats = stats.modes.daily;
    if (dailyStats.lastResultDate) {
      const gap = daysBetween(dailyStats.lastResultDate, currentDailyKey);
      if (gap > 1) {
        dailyStats.currentStreak = 0;
        dailyStats.lastResultDate = currentDailyKey;
        dailyStats.lastResultWin = false;
        saveStats();
      }
    }
  } else {
    const saved = loadInfiniteState();
    if (saved && Array.isArray(saved.guesses) && !saved.completed) {
      const savedMode = saved.mode || "infinite";
      if (savedMode !== currentMode) {
        // ignore saved state from another mode
      } else if (Array.isArray(saved.targetWords) && saved.targetWords.length > 0) {
        targetWords = saved.targetWords;
      } else if (saved.targetWord) {
        targetWords = [saved.targetWord];
      }
    }
    if (targetWords.length > 0 && Array.isArray(saved?.guesses) && !saved.completed) {
      guesses = [];
      currentGuess = "";
      gameOver = false;
      hasRecordedResult = false;
      solvedBoards = targetWords.map(() => false);
      buildGrid();
      buildKeyboard();
      renderSavedBoard(saved.guesses);
      updateNextWordButton();
      setStatus("Keep going!", "neutral");
      return;
    }
    const wordBank = ANSWER_WORDS.length > 0 ? ANSWER_WORDS : DEFAULT_WORDS;
    if (currentMode === "duo") {
      const first = pickWord(wordBank);
      let second = pickWord(wordBank);
      while (second === first && wordBank.length > 1) {
        second = pickWord(wordBank);
      }
      targetWords = [first, second];
    } else {
      targetWords = [pickWord(wordBank)];
    }
    currentDailyKey = null;
  }
  currentGuess = "";
  guesses = [];
  gameOver = false;
  hasRecordedResult = false;
  solvedBoards = targetWords.map(() => false);
  updateNextWordButton();

  if (currentMode === "daily") {
    const saved = loadDailyState();
    if (saved?.dateKey === currentDailyKey && saved?.completed && Array.isArray(saved.guesses)) {
      renderSavedBoard(saved.guesses);
      gameOver = true;
      hasRecordedResult = true;
      setStatus("Daily complete. Try infinite mode or come back tomorrow.", "warning");
      return;
    }
    if (saved?.dateKey === currentDailyKey && Array.isArray(saved.guesses) && !saved.completed) {
      renderSavedBoard(saved.guesses);
      setStatus("Keep going!", "neutral");
      return;
    }
  }

  buildGrid();
  buildKeyboard();
  const introMessage =
    currentMode === "duo"
      ? "Guess both 5-letter words in six tries."
      : "Guess the 5-letter word in six tries.";
  setStatus(introMessage);
  updateNextWordButton();
  if (currentMode === "infinite" || currentMode === "duo") {
    saveInfiniteState({
      mode: currentMode,
      targetWords,
      guesses: [],
      completed: false,
    });
  }
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
  gridBoards.forEach((board) => {
    for (let col = 0; col < WORD_LENGTH; col += 1) {
      const tile = board.querySelector(`.tile[data-row="${rowIndex}"][data-col="${col}"]`);
      if (!tile) {
        continue;
      }
      const letter = currentGuess[col] || "";
      tile.textContent = letter;
      tile.classList.toggle("filled", Boolean(letter));
    }
  });
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

function paintGuess(guess, result, rowIndex, boardIndex = 0) {
  const board = gridBoards[boardIndex];
  if (!board) {
    return;
  }
  for (let col = 0; col < WORD_LENGTH; col += 1) {
    const tile = board.querySelector(`.tile[data-row="${rowIndex}"][data-col="${col}"]`);
    tile.textContent = guess[col];
    tile.classList.add(result[col]);
  }
}

function getKeyStatus(key, side) {
  return side === "left" ? key.dataset.leftStatus || "" : key.dataset.rightStatus || "";
}

function setKeyStatus(key, side, status) {
  if (side === "left") {
    key.dataset.leftStatus = status;
  } else {
    key.dataset.rightStatus = status;
  }
}

function getStatusRank(status) {
  if (status === "correct") {
    return 3;
  }
  if (status === "present") {
    return 2;
  }
  if (status === "absent") {
    return 1;
  }
  return 0;
}

function statusColor(status) {
  if (status === "correct") {
    return "var(--green)";
  }
  if (status === "present") {
    return "var(--yellow)";
  }
  if (status === "absent") {
    return "var(--gray)";
  }
  return "var(--border)";
}

function updateKeyboardSingle(guess, result) {
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

function updateKeyboardDuo(guess, result, boardIndex) {
  const side = boardIndex === 0 ? "left" : "right";
  guess.split("").forEach((letter, index) => {
    const key = keyboard.querySelector(`.key[data-key="${letter}"]`);
    if (!key) {
      return;
    }
    key.classList.remove("correct", "present", "absent");
    key.classList.add("split");
    const currentStatus = getKeyStatus(key, side);
    const nextStatus = result[index];
    if (getStatusRank(nextStatus) < getStatusRank(currentStatus)) {
      return;
    }
    setKeyStatus(key, side, nextStatus);
    const left = statusColor(getKeyStatus(key, "left"));
    const right = statusColor(getKeyStatus(key, "right"));
    key.style.setProperty("--left-color", left);
    key.style.setProperty("--right-color", right);
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

  targetWords.forEach((target, boardIndex) => {
    const result = scoreGuess(currentGuess, target);
    paintGuess(currentGuess, result, guesses.length, boardIndex);
    if (currentMode === "duo") {
      updateKeyboardDuo(currentGuess, result, boardIndex);
    } else {
      updateKeyboardSingle(currentGuess, result);
    }
    if (currentGuess === target) {
      solvedBoards[boardIndex] = true;
    }
  });
  guesses.push(currentGuess);
  if (currentMode === "daily" && currentDailyKey) {
    saveDailyState({
      dateKey: currentDailyKey,
      completed: false,
      guesses: [...guesses],
    });
  } else if (currentMode === "infinite" || currentMode === "duo") {
    saveInfiniteState({
      mode: currentMode,
      targetWords,
      guesses: [...guesses],
      completed: false,
    });
  }

  const allSolved = solvedBoards.length > 0 && solvedBoards.every(Boolean);
  if (allSolved) {
    setStatus("Nice! You solved it.", "success");
    gameOver = true;
    recordGameResult(true, guesses.length);
    return;
  }

  if (guesses.length >= MAX_GUESSES) {
    const reveal = targetWords.map((word) => word.toUpperCase()).join(" / ");
    setStatus(`Out of guesses! The word was ${reveal}.`, "error");
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
statsModeDailyButton.addEventListener("click", () => {
  setStatsMode("daily");
  statsModeDailyButton.blur();
});
statsModeInfiniteButton.addEventListener("click", () => {
  setStatsMode("infinite");
  statsModeInfiniteButton.blur();
});
statsModeAllButton.addEventListener("click", () => {
  setStatsMode("all");
  statsModeAllButton.blur();
});
modeDailyButton.addEventListener("click", () => {
  setMode("daily");
  modeDailyButton.blur();
});
modeInfiniteButton.addEventListener("click", () => {
  setMode("infinite");
  modeInfiniteButton.blur();
});
modeDuoButton.addEventListener("click", () => {
  setMode("duo");
  modeDuoButton.blur();
});
newGameButton.addEventListener("click", () => {
  void resetGame();
  window.scrollTo({ top: 0, behavior: "smooth" });
  newGameButton.blur();
});
document.addEventListener("keydown", handlePhysicalKey);

loadStats();
setStatsMode(statsMode);
setStatus("Loading word lists...");
loadWordLists().then((loaded) => {
  setMode(currentMode);
  if (!loaded) {
    if (!(currentMode === "daily" && gameOver)) {
      setStatus("Using the built-in word list. (Word list download failed.)", "warning");
    }
  }
});
