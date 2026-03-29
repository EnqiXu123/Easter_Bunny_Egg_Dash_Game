const GAME_CONFIG = {
  roundDurationSeconds: 60,
  startingLives: 3,
  playerWidth: 90,
  playerHeight: 90,
  playerSpeed: 520,
  playerMarginBottom: 24,
  initialSpawnIntervalMs: 850,
  minimumSpawnIntervalMs: 430,
  difficultyRampSeconds: [20, 40],
  fallSpeedStages: {
    early: [180, 235],
    mid: [270, 350],
    late: [390, 500],
  },
  itemWidth: 44,
  itemHeight: 58,
  storageKeys: {
    bestScore: "bunnyEggDash_bestScore",
    soundEnabled: "bunnyEggDash_soundEnabled",
  },
  countdownSequence: ["Ready?", "3", "2", "1", "Hop!"],
};

const ITEM_TYPES = {
  normalEgg: {
    label: "Normal Egg",
    className: "item-egg",
    points: 1,
    damage: 0,
    isGood: true,
    spawnWeight: 60,
    width: 44,
    height: 58,
  },
  goldenEgg: {
    label: "Golden Egg",
    className: "item-egg item-golden-egg",
    points: 5,
    damage: 0,
    isGood: true,
    spawnWeight: 15,
    width: 46,
    height: 60,
  },
  rottenEgg: {
    label: "Rotten Egg",
    className: "item-rotten-egg",
    points: 0,
    damage: 1,
    isGood: false,
    spawnWeight: 15,
    width: 44,
    height: 58,
  },
  rock: {
    label: "Rock",
    className: "item-rock",
    points: 0,
    damage: 1,
    isGood: false,
    spawnWeight: 10,
    width: 48,
    height: 44,
  },
};

const RANKS = [
  { minScore: 0, maxScore: 9, title: "Little Hopper", message: "Nice try, little bunny!" },
  { minScore: 10, maxScore: 24, title: "Egg Explorer", message: "You are getting faster!" },
  { minScore: 25, maxScore: 39, title: "Super Bunny", message: "Great hopping skills!" },
  { minScore: 40, maxScore: Infinity, title: "Easter Legend", message: "Amazing egg-catching power!" },
];

const elements = {
  screens: {
    home: document.getElementById("home-screen"),
    instructions: document.getElementById("instructions-screen"),
    countdown: document.getElementById("countdown-screen"),
    game: document.getElementById("game-screen"),
    results: document.getElementById("results-screen"),
  },
  backgroundMusic: document.getElementById("background-music"),
  homeBestScore: document.getElementById("home-best-score"),
  soundToggleBtn: document.getElementById("sound-toggle-btn"),
  soundToggleLabel: document.getElementById("sound-toggle-label"),
  playBtn: document.getElementById("play-btn"),
  howToPlayBtn: document.getElementById("how-to-play-btn"),
  startFromInstructionsBtn: document.getElementById("start-from-instructions-btn"),
  backToHomeBtn: document.getElementById("back-to-home-btn"),
  countdownText: document.getElementById("countdown-text"),
  scoreDisplay: document.getElementById("score-display"),
  timerDisplay: document.getElementById("timer-display"),
  livesDisplay: document.getElementById("lives-display"),
  pauseBtn: document.getElementById("pause-btn"),
  gameArea: document.getElementById("game-area"),
  itemsLayer: document.getElementById("falling-items-layer"),
  feedbackLayer: document.getElementById("feedback-layer"),
  playerBunny: document.getElementById("player-bunny"),
  mobileControls: document.getElementById("mobile-controls"),
  moveLeftBtn: document.getElementById("move-left-btn"),
  moveRightBtn: document.getElementById("move-right-btn"),
  pauseOverlay: document.getElementById("pause-overlay"),
  resumeBtn: document.getElementById("resume-btn"),
  restartBtn: document.getElementById("restart-btn"),
  pauseHomeBtn: document.getElementById("pause-home-btn"),
  resultsHeading: document.getElementById("results-heading"),
  finalScore: document.getElementById("final-score"),
  bestScore: document.getElementById("best-score"),
  rankTitle: document.getElementById("rank-title"),
  resultsMessage: document.getElementById("results-message"),
  playAgainBtn: document.getElementById("play-again-btn"),
  resultsHomeBtn: document.getElementById("results-home-btn"),
};

const gameState = {
  currentScreen: "home",
  isPlaying: false,
  isPaused: false,
  isGameOver: false,
  score: 0,
  bestScore: 0,
  lives: GAME_CONFIG.startingLives,
  timerRemaining: GAME_CONFIG.roundDurationSeconds,
  activeItems: [],
  pressedKeys: {
    left: false,
    right: false,
  },
  soundEnabled: true,
};

const player = {
  x: 0,
  y: 0,
  width: GAME_CONFIG.playerWidth,
  height: GAME_CONFIG.playerHeight,
  speed: GAME_CONFIG.playerSpeed,
  direction: "idle",
};

let animationFrameId = 0;
let lastFrameTime = 0;
let timerIntervalId = 0;
let spawnIntervalId = 0;
let countdownIntervalId = 0;
let countdownTimeoutId = 0;
let itemIdCounter = 0;

function configureBackgroundMusic() {
  elements.backgroundMusic.volume = 0.45;
  elements.backgroundMusic.loop = true;
}

function pauseBackgroundMusic() {
  elements.backgroundMusic.pause();
}

function attemptBackgroundMusicPlayback() {
  if (!gameState.soundEnabled) {
    pauseBackgroundMusic();
    return;
  }

  const playPromise = elements.backgroundMusic.play();
  if (playPromise && typeof playPromise.catch === "function") {
    playPromise.catch(() => {
      // Ignore autoplay rejections until the user interacts again.
    });
  }
}

function safeLocalStorageGet(key, fallback) {
  try {
    const value = window.localStorage.getItem(key);
    return value === null ? fallback : value;
  } catch (error) {
    return fallback;
  }
}

function safeLocalStorageSet(key, value) {
  try {
    window.localStorage.setItem(key, value);
  } catch (error) {
    // Ignore storage failures so the game still works in private browsing modes.
  }
}

function loadPreferences() {
  const bestScore = Number.parseInt(
    safeLocalStorageGet(GAME_CONFIG.storageKeys.bestScore, "0"),
    10,
  );
  const soundEnabled = safeLocalStorageGet(GAME_CONFIG.storageKeys.soundEnabled, "true") !== "false";

  gameState.bestScore = Number.isNaN(bestScore) ? 0 : bestScore;
  gameState.soundEnabled = soundEnabled;
}

function updateBestScoreDisplays() {
  const bestScoreText = String(gameState.bestScore);
  elements.homeBestScore.textContent = bestScoreText;
  elements.bestScore.textContent = bestScoreText;
}

function updateSoundToggleUI() {
  elements.soundToggleLabel.textContent = gameState.soundEnabled ? "On" : "Off";
  elements.soundToggleBtn.setAttribute("aria-pressed", String(gameState.soundEnabled));
}

function syncBackgroundMusic() {
  if (gameState.soundEnabled) {
    attemptBackgroundMusicPlayback();
  } else {
    pauseBackgroundMusic();
  }
}

function setScreen(screenName) {
  Object.entries(elements.screens).forEach(([name, element]) => {
    const isTarget = name === screenName;
    element.classList.toggle("hidden", !isTarget);
    element.setAttribute("aria-hidden", String(!isTarget));
  });

  gameState.currentScreen = screenName;
}

function setPauseOverlayVisible(isVisible) {
  elements.pauseOverlay.classList.toggle("hidden", !isVisible);
  elements.pauseOverlay.setAttribute("aria-hidden", String(!isVisible));
}

function updateScoreDisplay() {
  elements.scoreDisplay.textContent = String(gameState.score);
}

function updateTimerDisplay() {
  elements.timerDisplay.textContent = `${gameState.timerRemaining}s`;
}

function updateLivesDisplay() {
  const hearts = "❤️".repeat(Math.max(gameState.lives, 0));
  const empty = "🤍".repeat(Math.max(GAME_CONFIG.startingLives - gameState.lives, 0));
  const display = hearts + empty;
  elements.livesDisplay.textContent = display || "🤍";
  elements.livesDisplay.setAttribute(
    "aria-label",
    `${Math.max(gameState.lives, 0)} lives remaining`,
  );
}

function updateHud() {
  updateScoreDisplay();
  updateTimerDisplay();
  updateLivesDisplay();
}

function getDifficultyProgress() {
  const elapsedSeconds = GAME_CONFIG.roundDurationSeconds - gameState.timerRemaining;
  const maxElapsed = GAME_CONFIG.roundDurationSeconds;
  return Math.min(Math.max(elapsedSeconds / maxElapsed, 0), 1);
}

function getElapsedSeconds() {
  return GAME_CONFIG.roundDurationSeconds - gameState.timerRemaining;
}

function interpolateValue(start, end, progress) {
  return start + (end - start) * progress;
}

function getCurrentStageIndex() {
  const elapsedSeconds = getElapsedSeconds();
  if (elapsedSeconds >= GAME_CONFIG.difficultyRampSeconds[1]) {
    return 2;
  }
  if (elapsedSeconds >= GAME_CONFIG.difficultyRampSeconds[0]) {
    return 1;
  }
  return 0;
}

function getSpawnIntervalMs() {
  const progress = getDifficultyProgress();
  return Math.max(
    GAME_CONFIG.minimumSpawnIntervalMs,
    GAME_CONFIG.initialSpawnIntervalMs - progress * 420,
  );
}

function getFallSpeed() {
  const elapsedSeconds = getElapsedSeconds();
  const [midStart, lateStart] = GAME_CONFIG.difficultyRampSeconds;
  const { early, mid, late } = GAME_CONFIG.fallSpeedStages;

  if (elapsedSeconds < midStart) {
    return interpolateValue(early[0], early[1], elapsedSeconds / midStart);
  }

  if (elapsedSeconds < lateStart) {
    return interpolateValue(mid[0], mid[1], (elapsedSeconds - midStart) / (lateStart - midStart));
  }

  return interpolateValue(
    late[0],
    late[1],
    (elapsedSeconds - lateStart) / (GAME_CONFIG.roundDurationSeconds - lateStart),
  );
}

function getWeightedItemPool() {
  const stageIndex = getCurrentStageIndex();
  const modifiers = [
    { normalEgg: 1, goldenEgg: 1, rottenEgg: 0.8, rock: 0.7 },
    { normalEgg: 0.92, goldenEgg: 1, rottenEgg: 1.05, rock: 1.1 },
    { normalEgg: 0.86, goldenEgg: 0.95, rottenEgg: 1.2, rock: 1.25 },
  ];
  const stageModifiers = modifiers[stageIndex];

  return Object.entries(ITEM_TYPES).map(([type, config]) => ({
    type,
    weight: config.spawnWeight * stageModifiers[type],
  }));
}

function chooseItemType() {
  const weightedPool = getWeightedItemPool();
  const totalWeight = weightedPool.reduce((sum, item) => sum + item.weight, 0);
  let randomValue = Math.random() * totalWeight;

  for (const option of weightedPool) {
    randomValue -= option.weight;
    if (randomValue <= 0) {
      return option.type;
    }
  }

  return "normalEgg";
}

function clearElementChildren(element) {
  while (element.firstChild) {
    element.removeChild(element.firstChild);
  }
}

function clearActiveItems() {
  gameState.activeItems.forEach((item) => item.elementRef.remove());
  gameState.activeItems = [];
}

function resetPlayerPosition() {
  const areaWidth = elements.gameArea.clientWidth;
  const areaHeight = elements.gameArea.clientHeight;

  player.x = Math.max((areaWidth - player.width) / 2, 0);
  player.y = areaHeight - player.height - GAME_CONFIG.playerMarginBottom;
  player.direction = "idle";
  renderPlayer();
}

function renderPlayer() {
  elements.playerBunny.style.left = `${player.x}px`;
  elements.playerBunny.style.top = `${player.y}px`;
}

function clearMovementState() {
  gameState.pressedKeys.left = false;
  gameState.pressedKeys.right = false;
  updateMobileButtons();
}

function resetGameState() {
  clearTimers();
  cancelAnimationFrame(animationFrameId);
  animationFrameId = 0;
  lastFrameTime = 0;

  gameState.isPlaying = false;
  gameState.isPaused = false;
  gameState.isGameOver = false;
  gameState.score = 0;
  gameState.lives = GAME_CONFIG.startingLives;
  gameState.timerRemaining = GAME_CONFIG.roundDurationSeconds;

  updateHud();
  clearActiveItems();
  clearElementChildren(elements.feedbackLayer);
  setPauseOverlayVisible(false);
  resetPlayerPosition();
  clearMovementState();
}

function showFeedback({ x, y, text, positive }) {
  const popup = document.createElement("div");
  popup.className = `feedback-popup ${positive ? "feedback-positive" : "feedback-negative"}`;
  popup.textContent = text;
  popup.style.left = `${x}px`;
  popup.style.top = `${y}px`;
  elements.feedbackLayer.appendChild(popup);

  window.setTimeout(() => {
    popup.remove();
  }, 780);
}

function pulsePlayer(className) {
  elements.playerBunny.classList.remove("hit", "catch");
  void elements.playerBunny.offsetWidth;
  elements.playerBunny.classList.add(className);
}

function spawnItem() {
  if (!gameState.isPlaying || gameState.isPaused) {
    return;
  }

  const type = chooseItemType();
  const config = ITEM_TYPES[type];
  const areaWidth = elements.gameArea.clientWidth;
  const x = Math.random() * Math.max(areaWidth - config.width, 0);

  const itemElement = document.createElement("div");
  itemElement.className = `falling-item ${config.className}`;
  itemElement.style.width = `${config.width}px`;
  itemElement.style.height = `${config.height}px`;

  itemIdCounter += 1;
  const item = {
    id: `item_${itemIdCounter}`,
    type,
    x,
    y: -config.height,
    width: config.width,
    height: config.height,
    speed: getFallSpeed() + Math.random() * 28,
    points: config.points,
    damage: config.damage,
    isGood: config.isGood,
    elementRef: itemElement,
  };

  itemElement.style.left = `${item.x}px`;
  itemElement.style.top = `${item.y}px`;

  gameState.activeItems.push(item);
  elements.itemsLayer.appendChild(itemElement);
}

function restartSpawnLoop() {
  if (spawnIntervalId) {
    clearInterval(spawnIntervalId);
  }

  spawnIntervalId = window.setInterval(() => {
    spawnItem();
    restartSpawnLoop();
  }, getSpawnIntervalMs());
}

function startTimerLoop() {
  timerIntervalId = window.setInterval(() => {
    if (!gameState.isPlaying || gameState.isPaused) {
      return;
    }

    gameState.timerRemaining = Math.max(gameState.timerRemaining - 1, 0);
    updateTimerDisplay();

    if (gameState.timerRemaining <= 0) {
      endRound("timer");
    }
  }, 1000);
}

function clearTimers() {
  clearInterval(timerIntervalId);
  clearInterval(spawnIntervalId);
  clearInterval(countdownIntervalId);
  clearTimeout(countdownTimeoutId);
  timerIntervalId = 0;
  spawnIntervalId = 0;
  countdownIntervalId = 0;
  countdownTimeoutId = 0;
}

function startGameplay() {
  setScreen("game");
  setPauseOverlayVisible(false);
  gameState.isPlaying = true;
  gameState.isPaused = false;
  gameState.isGameOver = false;
  clearMovementState();
  resetPlayerPosition();
  updateHud();
  restartSpawnLoop();
  startTimerLoop();
  lastFrameTime = performance.now();
  animationFrameId = requestAnimationFrame(gameLoop);
}

function beginCountdown() {
  resetGameState();
  setScreen("countdown");

  let stepIndex = 0;
  elements.countdownText.textContent = GAME_CONFIG.countdownSequence[stepIndex];

  countdownIntervalId = window.setInterval(() => {
    stepIndex += 1;
    if (stepIndex >= GAME_CONFIG.countdownSequence.length) {
      clearInterval(countdownIntervalId);
      countdownIntervalId = 0;
      startGameplay();
      return;
    }

    elements.countdownText.textContent = GAME_CONFIG.countdownSequence[stepIndex];
  }, 700);
}

function getPlayerBounds() {
  return {
    left: player.x + 10,
    right: player.x + player.width - 10,
    top: player.y + 16,
    bottom: player.y + player.height - 6,
  };
}

function hasCollision(item) {
  const playerBounds = getPlayerBounds();
  const itemBounds = {
    left: item.x + 4,
    right: item.x + item.width - 4,
    top: item.y + 4,
    bottom: item.y + item.height - 4,
  };

  return !(
    itemBounds.right < playerBounds.left ||
    itemBounds.left > playerBounds.right ||
    itemBounds.bottom < playerBounds.top ||
    itemBounds.top > playerBounds.bottom
  );
}

function removeItemById(itemId) {
  const itemIndex = gameState.activeItems.findIndex((item) => item.id === itemId);
  if (itemIndex === -1) {
    return;
  }

  const [item] = gameState.activeItems.splice(itemIndex, 1);
  item.elementRef.remove();
}

function applyItemEffect(item) {
  const centerX = item.x + item.width / 2;
  const y = Math.max(item.y, 80);

  if (item.isGood) {
    gameState.score += item.points;
    updateScoreDisplay();
    showFeedback({
      x: centerX,
      y,
      text: `+${item.points}`,
      positive: true,
    });
    pulsePlayer("catch");
  } else {
    gameState.lives -= item.damage;
    updateLivesDisplay();
    showFeedback({
      x: centerX,
      y,
      text: "-1 life",
      positive: false,
    });
    pulsePlayer("hit");

    if (gameState.lives <= 0) {
      endRound("lives");
    }
  }
}

function updateItems(deltaSeconds) {
  const areaHeight = elements.gameArea.clientHeight;
  const idsToRemove = [];

  for (const item of gameState.activeItems) {
    item.speed = Math.max(item.speed, getFallSpeed());
    item.y += item.speed * deltaSeconds;

    if (hasCollision(item)) {
      applyItemEffect(item);
      idsToRemove.push(item.id);
      if (gameState.isGameOver) {
        break;
      }
      continue;
    }

    if (item.y > areaHeight + item.height) {
      idsToRemove.push(item.id);
      continue;
    }

    item.elementRef.style.top = `${item.y}px`;
    item.elementRef.style.left = `${item.x}px`;
  }

  idsToRemove.forEach(removeItemById);
}

function updatePlayer(deltaSeconds) {
  if (!gameState.isPlaying || gameState.isPaused) {
    return;
  }

  let movementDirection = 0;
  if (gameState.pressedKeys.left) {
    movementDirection -= 1;
  }
  if (gameState.pressedKeys.right) {
    movementDirection += 1;
  }

  player.direction =
    movementDirection < 0 ? "left" : movementDirection > 0 ? "right" : "idle";

  if (movementDirection === 0) {
    return;
  }

  const areaWidth = elements.gameArea.clientWidth;
  player.x += movementDirection * player.speed * deltaSeconds;
  player.x = Math.max(0, Math.min(player.x, areaWidth - player.width));

  elements.playerBunny.style.left = `${player.x}px`;
}

function gameLoop(timestamp) {
  if (!gameState.isPlaying) {
    return;
  }

  const deltaSeconds = Math.min((timestamp - lastFrameTime) / 1000, 0.033);
  lastFrameTime = timestamp;

  if (!gameState.isPaused && !gameState.isGameOver) {
    updatePlayer(deltaSeconds);
    updateItems(deltaSeconds);
  }

  animationFrameId = requestAnimationFrame(gameLoop);
}

function getRankForScore(score) {
  return RANKS.find((rank) => score >= rank.minScore && score <= rank.maxScore) || RANKS[0];
}

function showResults(reason) {
  const rank = getRankForScore(gameState.score);
  const isNewBest = gameState.score > gameState.bestScore;

  if (isNewBest) {
    gameState.bestScore = gameState.score;
    safeLocalStorageSet(GAME_CONFIG.storageKeys.bestScore, String(gameState.bestScore));
    updateBestScoreDisplays();
  }

  elements.resultsHeading.textContent = reason === "lives" ? "Game Over!" : "Great Dash!";
  elements.finalScore.textContent = String(gameState.score);
  elements.bestScore.textContent = String(gameState.bestScore);
  elements.rankTitle.textContent = rank.title;
  elements.resultsMessage.textContent = isNewBest
    ? `New best score! ${rank.message}`
    : rank.message;

  setScreen("results");
}

function endRound(reason) {
  if (gameState.isGameOver) {
    return;
  }

  gameState.isGameOver = true;
  gameState.isPlaying = false;
  gameState.isPaused = false;
  clearTimers();
  cancelAnimationFrame(animationFrameId);
  animationFrameId = 0;
  setPauseOverlayVisible(false);
  showResults(reason);
}

function pauseGame() {
  if (!gameState.isPlaying || gameState.isPaused || gameState.isGameOver) {
    return;
  }

  gameState.isPaused = true;
  clearMovementState();
  setPauseOverlayVisible(true);
}

function resumeGame() {
  if (!gameState.isPlaying || !gameState.isPaused || gameState.isGameOver) {
    return;
  }

  gameState.isPaused = false;
  setPauseOverlayVisible(false);
  lastFrameTime = performance.now();
}

function goHome() {
  resetGameState();
  setScreen("home");
}

function toggleSoundPreference() {
  gameState.soundEnabled = !gameState.soundEnabled;
  safeLocalStorageSet(GAME_CONFIG.storageKeys.soundEnabled, String(gameState.soundEnabled));
  updateSoundToggleUI();
  syncBackgroundMusic();
}

function handleKeyChange(event, isPressed) {
  const key = event.key.toLowerCase();

  if (isPressed) {
    attemptBackgroundMusicPlayback();
  }

  if (key === "escape" && isPressed && gameState.currentScreen === "game") {
    if (gameState.isPaused) {
      resumeGame();
    } else {
      pauseGame();
    }
    return;
  }

  if (gameState.currentScreen !== "game") {
    return;
  }

  if (gameState.isPaused && isPressed) {
    return;
  }

  if (["arrowleft", "a"].includes(key)) {
    gameState.pressedKeys.left = isPressed;
    updateMobileButtons();
    event.preventDefault();
  } else if (["arrowright", "d"].includes(key)) {
    gameState.pressedKeys.right = isPressed;
    updateMobileButtons();
    event.preventDefault();
  }
}

function setMobileDirection(direction, isPressed) {
  if (gameState.currentScreen !== "game" || gameState.isPaused || gameState.isGameOver) {
    return;
  }

  if (direction === "left") {
    gameState.pressedKeys.left = isPressed;
  }
  if (direction === "right") {
    gameState.pressedKeys.right = isPressed;
  }
  updateMobileButtons();
}

function updateMobileButtons() {
  elements.moveLeftBtn.classList.toggle("active", gameState.pressedKeys.left);
  elements.moveRightBtn.classList.toggle("active", gameState.pressedKeys.right);
}

function bindHoldButton(button, direction) {
  const start = (event) => {
    event.preventDefault();
    attemptBackgroundMusicPlayback();
    setMobileDirection(direction, true);
  };
  const stop = (event) => {
    event.preventDefault();
    setMobileDirection(direction, false);
  };

  button.addEventListener("pointerdown", start);
  button.addEventListener("pointerup", stop);
  button.addEventListener("pointerleave", stop);
  button.addEventListener("pointercancel", stop);
  button.addEventListener("dblclick", (event) => {
    event.preventDefault();
  });
}

function handleResize() {
  if (gameState.currentScreen === "countdown") {
    resetPlayerPosition();
  } else if (gameState.currentScreen === "game") {
    const areaWidth = elements.gameArea.clientWidth;
    const areaHeight = elements.gameArea.clientHeight;
    player.x = Math.max(0, Math.min(player.x, areaWidth - player.width));
    player.y = areaHeight - player.height - GAME_CONFIG.playerMarginBottom;
    renderPlayer();
  }

  const areaWidth = elements.gameArea.clientWidth;
  gameState.activeItems.forEach((item) => {
    item.x = Math.min(item.x, Math.max(areaWidth - item.width, 0));
    item.elementRef.style.left = `${item.x}px`;
  });
}

function bindEvents() {
  elements.playBtn.addEventListener("click", () => {
    attemptBackgroundMusicPlayback();
    beginCountdown();
  });
  elements.howToPlayBtn.addEventListener("click", () => {
    attemptBackgroundMusicPlayback();
    setScreen("instructions");
  });
  elements.startFromInstructionsBtn.addEventListener("click", () => {
    attemptBackgroundMusicPlayback();
    beginCountdown();
  });
  elements.backToHomeBtn.addEventListener("click", () => {
    attemptBackgroundMusicPlayback();
    setScreen("home");
  });
  elements.soundToggleBtn.addEventListener("click", toggleSoundPreference);

  elements.pauseBtn.addEventListener("click", () => {
    attemptBackgroundMusicPlayback();
    pauseGame();
  });
  elements.resumeBtn.addEventListener("click", () => {
    attemptBackgroundMusicPlayback();
    resumeGame();
  });
  elements.restartBtn.addEventListener("click", () => {
    attemptBackgroundMusicPlayback();
    beginCountdown();
  });
  elements.pauseHomeBtn.addEventListener("click", () => {
    attemptBackgroundMusicPlayback();
    goHome();
  });
  elements.playAgainBtn.addEventListener("click", () => {
    attemptBackgroundMusicPlayback();
    beginCountdown();
  });
  elements.resultsHomeBtn.addEventListener("click", () => {
    attemptBackgroundMusicPlayback();
    goHome();
  });

  window.addEventListener("keydown", (event) => handleKeyChange(event, true));
  window.addEventListener("keyup", (event) => handleKeyChange(event, false));
  window.addEventListener("resize", handleResize);

  bindHoldButton(elements.moveLeftBtn, "left");
  bindHoldButton(elements.moveRightBtn, "right");

  document.addEventListener("visibilitychange", () => {
    if (document.hidden && gameState.isPlaying && !gameState.isPaused) {
      pauseGame();
    }
  });
}

function initialize() {
  loadPreferences();
  configureBackgroundMusic();
  updateBestScoreDisplays();
  updateSoundToggleUI();
  syncBackgroundMusic();
  updateHud();
  resetPlayerPosition();
  bindEvents();
}

initialize();
