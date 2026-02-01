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
const statsModeGrowthButton = document.getElementById("stats-mode-growth");
const statsModeInfiniteButton = document.getElementById("stats-mode-infinite");
const statsModeAllButton = document.getElementById("stats-mode-all");
const modeDailyButton = document.getElementById("mode-daily");
const modeInfiniteButton = document.getElementById("mode-infinite");
const modeGrowthButton = document.getElementById("mode-growth");
const growthScoreboard = document.getElementById("growth-scoreboard");
const growthScoreboardList = document.getElementById("growth-scoreboard-list");
const growthScoreboardSubtitle = document.getElementById("growth-scoreboard-subtitle");

const STATS_COOKIE = "wordgameStats";
const DAILY_COOKIE = "wordgameDaily";
const INFINITE_COOKIE = "wordgameInfinite";
const GROWTH_COOKIE = "wordgameGrowth";
const LEGACY_DUO_COOKIE = "wordgameDuo";
const GROWTH_STAGES = [1, 2, 4, 8];

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
let growthStageIndex = 0;
let growthScoreboardRounds = [];
let growthGuessLimit = MAX_GUESSES;
let growthCarryover = 0;
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
    growth: {
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

function pickUniqueWords(wordBank, count) {
  const pool = [...wordBank];
  const picks = [];
  while (picks.length < count && pool.length > 0) {
    const choice = pickWord(pool);
    picks.push(choice);
    const index = pool.indexOf(choice);
    if (index !== -1) {
      pool.splice(index, 1);
    }
  }
  while (picks.length < count) {
    picks.push(pickWord(wordBank));
  }
  return picks;
}

function getGrowthRoundWordCount() {
  return GROWTH_STAGES[growthStageIndex] || GROWTH_STAGES[0];
}

function getGrowthRoundBonusGuesses() {
  return Math.max(0, growthStageIndex);
}

function getRoundGuessLimit() {
  return currentMode === "growth" ? growthGuessLimit : MAX_GUESSES;
}

function getGrowthStageIndexForCount(count) {
  const index = GROWTH_STAGES.indexOf(count);
  return index === -1 ? 0 : index;
}

function buildGrid() {
  grid.innerHTML = "";
  gridBoards = [];
  const boardCount = currentMode === "growth" ? getGrowthRoundWordCount() : 1;
  const guessLimit = getRoundGuessLimit();
  grid.classList.remove(
    "grid-wrapper--growth-row",
    "grid-wrapper--growth-8",
  );
  if (currentMode === "growth") {
    if (boardCount === 8) {
      grid.classList.add("grid-wrapper--growth-8");
    } else if (boardCount === 2 || boardCount === 4) {
      grid.classList.add("grid-wrapper--growth-row");
    }
  }
  for (let boardIndex = 0; boardIndex < boardCount; boardIndex += 1) {
    const board = document.createElement("div");
    board.className = "grid";
    board.dataset.board = boardIndex;
    for (let row = 0; row < guessLimit; row += 1) {
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
  const segmentCount = getKeyboardSegmentCount();
  keyboard.classList.toggle("keyboard--segmented", segmentCount > 1);
  if (segmentCount > 1) {
    keyboard.dataset.segments = String(segmentCount);
  } else {
    keyboard.removeAttribute("data-segments");
  }
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
      if (segmentCount > 1) {
        key.classList.add("key--segmented");
        key.style.setProperty("--segment-count", segmentCount);
        updateKeySegmentBackground(key, segmentCount);
      } else {
        key.classList.remove("key--segmented");
        key.style.removeProperty("--segment-count");
        key.style.removeProperty("background");
        key.style.removeProperty("background-image");
        key.style.removeProperty("background-size");
        key.style.removeProperty("background-position");
        key.style.removeProperty("background-repeat");
        key.style.removeProperty("color");
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
      growth: {
        ...createEmptyStats(),
        currentStreak: 0,
        maxStreak: 0,
      },
    },
  };
}

function getCombinedStats() {
  const combined = createEmptyStats();
  const included = ["daily", "infinite", "growth"];
  included.forEach((mode) => {
    const modeStats = stats.modes[mode];
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

function saveGrowthState(payload) {
  writeCookie(GROWTH_COOKIE, JSON.stringify(payload), 7);
}

function loadGrowthState() {
  const stored = readCookie(GROWTH_COOKIE) || readCookie(LEGACY_DUO_COOKIE);
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
      const legacyGrowth = parsed.modes.growth || parsed.modes.duo || {};
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
          growth: {
            gamesPlayed: legacyGrowth.gamesPlayed || 0,
            wins: legacyGrowth.wins || 0,
            distribution: Array.isArray(legacyGrowth.distribution)
              ? legacyGrowth.distribution.slice(0, MAX_GUESSES)
              : Array(MAX_GUESSES).fill(0),
            currentStreak: legacyGrowth.currentStreak || 0,
            maxStreak: legacyGrowth.maxStreak || 0,
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
  if (window.matchMedia("(max-width: 480px)").matches && mode === "growth") {
    mode = "daily";
  }
  statsMode = mode;
  statsPanel.dataset.statsMode = mode;
  statsModeDailyButton.classList.toggle("is-active", mode === "daily");
  statsModeGrowthButton.classList.toggle("is-active", mode === "growth");
  statsModeInfiniteButton.classList.toggle("is-active", mode === "infinite");
  statsModeAllButton.classList.toggle("is-active", mode === "all");
  updateStatsPanel();
}

function updateStatsPanel() {
  const combinedStats = getCombinedStats();
  const selectedStats =
    statsMode === "daily"
      ? stats.modes.daily
      : statsMode === "growth"
      ? stats.modes.growth
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
  if (currentMode !== "infinite" && currentMode !== "growth") {
    newGameButton.style.display = "none";
    return;
  }
  newGameButton.textContent = currentMode === "growth" ? "Start over" : "Next word";
  newGameButton.style.display = gameOver ? "inline-flex" : "none";
}

function setMode(mode) {
  currentMode = mode;
  modeDailyButton.classList.toggle("is-active", mode === "daily");
  modeInfiniteButton.classList.toggle("is-active", mode === "infinite");
  modeGrowthButton.classList.toggle("is-active", mode === "growth");
  updateNextWordButton();
  updateGrowthScoreboard();
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
    const results = [];
    targetWords.forEach((target, boardIndex) => {
      const result = scoreGuess(guess, target);
      paintGuess(guess, result, index, boardIndex);
      results.push(result);
      if (guess === target) {
        solvedBoards[boardIndex] = true;
      }
    });
    if (currentMode === "growth") {
      const segmentCount = getKeyboardSegmentCount();
      if (segmentCount > 1) {
        results.forEach((result, boardIndex) => {
          if (result) {
            updateKeyboardSegmented(guess, result, boardIndex, segmentCount);
          }
        });
      } else {
        updateKeyboardSingle(guess, results[0]);
      }
    } else {
      updateKeyboardSingle(guess, results[0]);
    }
    guesses.push(guess);
  });
}

function getGrowthIntroMessage() {
  const roundNumber = growthStageIndex + 1;
  const totalRounds = GROWTH_STAGES.length;
  const wordCount = getGrowthRoundWordCount();
  const wordLabel = wordCount === 1 ? "word" : "words";
  const guessLabel = growthGuessLimit === 1 ? "try" : "tries";
  return `Growth mode: Round ${roundNumber} of ${totalRounds}. Guess ${wordCount} ${wordLabel} in ${growthGuessLimit} ${guessLabel}.`;
}

function updateGrowthScoreboard() {
  if (!growthScoreboard) {
    return;
  }
  const isGrowth = currentMode === "growth";
  const shouldShow =
    isGrowth && (growthStageIndex > 0 || growthScoreboardRounds.length > 0);
  growthScoreboard.classList.toggle("is-visible", shouldShow);
  if (!shouldShow) {
    return;
  }
  growthScoreboardList.innerHTML = "";
  if (growthScoreboardRounds.length === 0) {
    growthScoreboardSubtitle.textContent = "Round progress will appear here.";
    return;
  }
  growthScoreboardSubtitle.textContent = `Completed ${growthScoreboardRounds.length} of ${GROWTH_STAGES.length} rounds.`;
  growthScoreboardRounds.forEach((round) => {
    const item = document.createElement("li");
    const guessLabel = round.guesses === 1 ? "guess" : "guesses";
    item.textContent = `Round ${round.round}: ${round.guesses} ${guessLabel}.`;
    growthScoreboardList.appendChild(item);
  });
}

function startGrowthRound() {
  const wordBank = ANSWER_WORDS.length > 0 ? ANSWER_WORDS : DEFAULT_WORDS;
  targetWords = pickUniqueWords(wordBank, getGrowthRoundWordCount());
  growthGuessLimit =
    MAX_GUESSES + growthCarryover + getGrowthRoundBonusGuesses();
  currentGuess = "";
  guesses = [];
  gameOver = false;
  hasRecordedResult = false;
  solvedBoards = targetWords.map(() => false);
  buildGrid();
  buildKeyboard();
  updateGrowthScoreboard();
  setStatus(getGrowthIntroMessage(), "neutral");
  updateNextWordButton();
  saveGrowthState({
    mode: currentMode,
    targetWords,
    guesses: [],
    completed: false,
    growthStageIndex,
    growthGuessLimit,
    growthCarryover,
    scoreboard: [...growthScoreboardRounds],
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
  } else if (currentMode === "infinite" || currentMode === "growth") {
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
  } else if (currentMode === "growth") {
    saveGrowthState({
      mode: currentMode,
      targetWords,
      guesses: [...guesses],
      completed: true,
      growthStageIndex,
      growthGuessLimit,
      growthCarryover,
      scoreboard: [...growthScoreboardRounds],
    });
  } else if (currentMode === "infinite") {
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
  } else if (currentMode === "growth") {
    const saved = loadGrowthState();
    if (saved?.mode === "growth" || saved?.mode === "duo") {
      if (Number.isInteger(saved.growthStageIndex)) {
        growthStageIndex = Math.min(
          Math.max(saved.growthStageIndex, 0),
          GROWTH_STAGES.length - 1,
        );
      }
      if (Array.isArray(saved.scoreboard)) {
        growthScoreboardRounds = saved.scoreboard;
      }
      if (Number.isInteger(saved.growthGuessLimit)) {
        growthGuessLimit = saved.growthGuessLimit;
      }
      if (Number.isInteger(saved.growthCarryover)) {
        growthCarryover = saved.growthCarryover;
      }
    }
    if (saved && Array.isArray(saved.guesses) && !saved.completed) {
      if (Array.isArray(saved.targetWords) && saved.targetWords.length > 0) {
        const inferredStage = getGrowthStageIndexForCount(saved.targetWords.length);
        if (!Number.isInteger(saved.growthStageIndex)) {
          growthStageIndex = inferredStage;
        }
        targetWords = saved.targetWords;
      }
      if (!Number.isInteger(saved.growthGuessLimit)) {
        growthGuessLimit =
          MAX_GUESSES + growthCarryover + getGrowthRoundBonusGuesses();
      }
    }
    if (targetWords.length > 0) {
      if (GROWTH_STAGES.includes(targetWords.length)) {
        growthStageIndex = getGrowthStageIndexForCount(targetWords.length);
      } else {
        targetWords = pickUniqueWords(
          ANSWER_WORDS.length > 0 ? ANSWER_WORDS : DEFAULT_WORDS,
          getGrowthRoundWordCount(),
        );
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
      updateGrowthScoreboard();
      updateNextWordButton();
      setStatus(getGrowthIntroMessage(), "neutral");
      return;
    }
    growthStageIndex = 0;
    growthScoreboardRounds = [];
    growthCarryover = 0;
    growthGuessLimit = MAX_GUESSES;
    currentDailyKey = null;
    targetWords = pickUniqueWords(
      ANSWER_WORDS.length > 0 ? ANSWER_WORDS : DEFAULT_WORDS,
      getGrowthRoundWordCount(),
    );
  } else {
    const saved = loadInfiniteState();
    if (saved && Array.isArray(saved.guesses) && !saved.completed) {
      if (Array.isArray(saved.targetWords) && saved.targetWords.length > 0) {
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
    targetWords = [pickWord(wordBank)];
    currentDailyKey = null;
  }
  if (currentMode === "growth") {
    growthGuessLimit =
      MAX_GUESSES + growthCarryover + getGrowthRoundBonusGuesses();
    currentGuess = "";
    guesses = [];
    gameOver = false;
    hasRecordedResult = false;
    solvedBoards = targetWords.map(() => false);
    buildGrid();
    buildKeyboard();
    updateGrowthScoreboard();
    setStatus(getGrowthIntroMessage(), "neutral");
    updateNextWordButton();
    saveGrowthState({
      mode: currentMode,
      targetWords,
      guesses: [],
      completed: false,
      growthStageIndex,
      growthGuessLimit,
      growthCarryover,
      scoreboard: [...growthScoreboardRounds],
    });
    return;
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
  const introMessage = "Guess the 5-letter word in six tries.";
  setStatus(introMessage);
  updateNextWordButton();
  if (currentMode === "infinite") {
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
    if (currentMode === "growth") {
      const boardIndex = Number(board.dataset.board);
      if (solvedBoards[boardIndex]) {
        return;
      }
    }
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
  if (currentMode === "growth" && solvedBoards[boardIndex]) {
    return;
  }
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

function getKeyboardSegmentCount() {
  if (currentMode !== "growth") {
    return 1;
  }
  return Math.max(1, targetWords.length);
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

function getSegmentStatus(key, index) {
  return key.dataset[`segmentStatus${index}`] || "";
}

function setSegmentStatus(key, index, status) {
  key.dataset[`segmentStatus${index}`] = status;
}

function updateKeySegmentBackground(key, segmentCount) {
  const stops = [];
  let hasStatus = false;
  const colors = [];
  for (let i = 0; i < segmentCount; i += 1) {
    const status = getSegmentStatus(key, i);
    if (status) {
      hasStatus = true;
    }
    const color = statusColor(status);
    colors.push(color);
    const start = (i / segmentCount) * 100;
    const end = ((i + 1) / segmentCount) * 100;
    stops.push(`${color} ${start}% ${end}%`);
  }
  if (segmentCount === 4) {
    const layers = colors
      .map((color) => `linear-gradient(${color}, ${color})`)
      .join(", ");
    key.style.backgroundImage = layers;
    key.style.backgroundSize = "50% 50%";
    key.style.backgroundPosition = "0 0, 0 100%, 100% 0, 100% 100%";
    key.style.backgroundRepeat = "no-repeat";
  } else if (segmentCount === 8) {
    const layers = colors
      .map((color) => `linear-gradient(${color}, ${color})`)
      .join(", ");
    key.style.backgroundImage = layers;
    key.style.backgroundSize = "50% 25%";
    key.style.backgroundPosition =
      "0 0, 0 25%, 0 50%, 0 75%, 100% 0, 100% 25%, 100% 50%, 100% 75%";
    key.style.backgroundRepeat = "no-repeat";
  } else if (segmentCount > 1) {
    key.style.backgroundImage = `linear-gradient(90deg, ${stops.join(", ")})`;
    key.style.removeProperty("background-size");
    key.style.removeProperty("background-position");
    key.style.removeProperty("background-repeat");
  } else {
    key.style.removeProperty("background-image");
    key.style.removeProperty("background-size");
    key.style.removeProperty("background-position");
    key.style.removeProperty("background-repeat");
  }
  key.style.color = hasStatus ? "#fff" : "var(--text)";
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

function updateKeyboardSegmented(guess, result, boardIndex, segmentCount) {
  guess.split("").forEach((letter, index) => {
    const key = keyboard.querySelector(`.key[data-key="${letter}"]`);
    if (!key) {
      return;
    }
    const currentStatus = getSegmentStatus(key, boardIndex);
    const nextStatus = result[index];
    if (getStatusRank(nextStatus) < getStatusRank(currentStatus)) {
      return;
    }
    setSegmentStatus(key, boardIndex, nextStatus);
    key.classList.remove("present", "absent", "correct", "split");
    updateKeySegmentBackground(key, segmentCount);
  });
}

function updateKeyboardMulti(guess, results) {
  const bestStatuses = {};
  results.forEach((result) => {
    result.forEach((status, index) => {
      const letter = guess[index];
      if (!letter) {
        return;
      }
      if (!bestStatuses[letter] || getStatusRank(status) > getStatusRank(bestStatuses[letter])) {
        bestStatuses[letter] = status;
      }
    });
  });
  Object.entries(bestStatuses).forEach(([letter, status]) => {
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
    if (getStatusRank(currentClass) > getStatusRank(status)) {
      return;
    }
    key.classList.remove("present", "absent", "correct", "split");
    key.style.removeProperty("--left-color");
    key.style.removeProperty("--right-color");
    if (status) {
      key.classList.add(status);
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

  const roundResults = [];
  targetWords.forEach((target, boardIndex) => {
    if (currentMode === "growth" && solvedBoards[boardIndex]) {
      return;
    }
    const result = scoreGuess(currentGuess, target);
    paintGuess(currentGuess, result, guesses.length, boardIndex);
    roundResults.push(result);
    if (currentGuess === target) {
      solvedBoards[boardIndex] = true;
    }
  });
  if (currentMode === "growth") {
    const segmentCount = getKeyboardSegmentCount();
    if (segmentCount > 1) {
      roundResults.forEach((result, boardIndex) => {
        if (result) {
          updateKeyboardSegmented(currentGuess, result, boardIndex, segmentCount);
        }
      });
    } else {
      updateKeyboardSingle(currentGuess, roundResults[0]);
    }
  } else {
    updateKeyboardSingle(currentGuess, roundResults[0]);
  }
  guesses.push(currentGuess);
  if (currentMode === "daily" && currentDailyKey) {
    saveDailyState({
      dateKey: currentDailyKey,
      completed: false,
      guesses: [...guesses],
    });
  } else if (currentMode === "growth") {
    saveGrowthState({
      mode: currentMode,
      targetWords,
      guesses: [...guesses],
      completed: false,
      growthStageIndex,
      growthGuessLimit,
      growthCarryover,
      scoreboard: [...growthScoreboardRounds],
    });
  } else if (currentMode === "infinite") {
    saveInfiniteState({
      mode: currentMode,
      targetWords,
      guesses: [...guesses],
      completed: false,
    });
  }

  const allSolved = solvedBoards.length > 0 && solvedBoards.every(Boolean);
  if (allSolved) {
    if (currentMode === "growth") {
      const currentRound = getGrowthRoundWordCount();
      growthScoreboardRounds = [
        ...growthScoreboardRounds,
        { round: growthStageIndex + 1, words: currentRound, guesses: guesses.length },
      ];
      updateGrowthScoreboard();
      const isFinalRound = growthStageIndex >= GROWTH_STAGES.length - 1;
      if (isFinalRound) {
        setStatus("Growth complete! You conquered all 8 words.", "success");
        gameOver = true;
        recordGameResult(true, guesses.length);
        return;
      }
      growthCarryover = Math.max(0, growthGuessLimit - guesses.length);
      growthStageIndex += 1;
      startGrowthRound();
      return;
    }
    setStatus("Nice! You solved it.", "success");
    gameOver = true;
    recordGameResult(true, guesses.length);
    return;
  }

  if (guesses.length >= getRoundGuessLimit()) {
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
statsModeGrowthButton.addEventListener("click", () => {
  setStatsMode("growth");
  statsModeGrowthButton.blur();
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
modeGrowthButton.addEventListener("click", () => {
  setMode("growth");
  modeGrowthButton.blur();
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
