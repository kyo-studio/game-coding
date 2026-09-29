/**
 * ==========================================
 * Game #19 2048パズル (2048 Puzzle)
 * 4×4スワイプ合体・タイルアニメーション・UNDO機能
 * ==========================================
 */

// ==========================================
// 1. 定数・初期設定
// ==========================================
const SIZE = 4;
const WIN_TARGET = 2048;

const boardWrapper = document.getElementById("board-wrapper");
const tileContainer = document.getElementById("tile-container");
const scoreDisplay = document.getElementById("score-display");
const bestScoreDisplay = document.getElementById("best-score-display");

const undoBtn = document.getElementById("undo-btn");
const resetBtn = document.getElementById("reset-btn");

const winOverlay = document.getElementById("win-overlay");
const gameoverOverlay = document.getElementById("gameover-overlay");
const finalScore = document.getElementById("final-score");
const newRecordBadge = document.getElementById("new-record-badge");

const keepGoingBtn = document.getElementById("keep-going-btn");
const winRestartBtn = document.getElementById("win-restart-btn");
const restartBtn = document.getElementById("restart-btn");
const gameoverUndoBtn = document.getElementById("gameover-undo-btn");

let grid = [];
let score = 0;
let bestScore = 0;
let undoStack = [];
let hasWon = false;
let keepGoing = false;
let isGameOver = false;

// ==========================================
// 2. 音響合成 (Web Audio API)
// ==========================================
let audioCtx = null;
function initAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === "suspended") {
    audioCtx.resume();
  }
}

function playSlideSound() {
  if (!audioCtx) return;
  try {
    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(120, now + 0.06);
    gain.gain.setValueAtTime(0.06, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(now);
    osc.stop(now + 0.06);
  } catch (e) {}
}

function playMergeSound(value) {
  if (!audioCtx) return;
  try {
    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = "triangle";

    // 数字が大きいほど高音（2->261Hz, 4->293Hz, 8->329Hz, 16->392Hz...）
    const noteStep = Math.min(12, Math.log2(value));
    const baseFreq = 261.63 * Math.pow(1.08, noteStep);

    osc.frequency.setValueAtTime(baseFreq, now);
    osc.frequency.setValueAtTime(baseFreq * 1.25, now + 0.04);

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(now);
    osc.stop(now + 0.12);
  } catch (e) {}
}

function playWinSound() {
  if (!audioCtx) return;
  try {
    const now = audioCtx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51];
    notes.forEach((freq, idx) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now + idx * 0.1);
      gain.gain.setValueAtTime(0.15, now + idx * 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.1 + 0.25);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(now + idx * 0.1);
      osc.stop(now + idx * 0.1 + 0.25);
    });
  } catch (e) {}
}

function playGameOverSound() {
  if (!audioCtx) return;
  try {
    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(260, now);
    osc.frequency.linearRampToValueAtTime(100, now + 0.4);
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(now);
    osc.stop(now + 0.4);
  } catch (e) {}
}

// ==========================================
// 3. ゲーム盤面 & スライドアナライザー
// ==========================================

function initGrid() {
  grid = [];
  for (let r = 0; r < SIZE; r++) {
    const row = [];
    for (let c = 0; c < SIZE; c++) {
      row.push(0);
    }
    grid.push(row);
  }
}

function loadBestScore() {
  const saved = localStorage.getItem("2048_best_score");
  if (saved !== null) {
    bestScore = parseInt(saved, 10);
    bestScoreDisplay.textContent = bestScore;
  }
}

function checkAndUpdateBestScore() {
  if (score > bestScore) {
    bestScore = score;
    localStorage.setItem("2048_best_score", bestScore);
    bestScoreDisplay.textContent = bestScore;
    return true;
  }
  return false;
}

function getEmptyCells() {
  const empty = [];
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (grid[r][c] === 0) {
        empty.push({ r, c });
      }
    }
  }
  return empty;
}

function spawnRandomTile() {
  const empty = getEmptyCells();
  if (empty.length === 0) return null;
  const spot = empty[Math.floor(Math.random() * empty.length)];
  const value = Math.random() < 0.9 ? 2 : 4;
  grid[spot.r][spot.c] = value;
  return { r: spot.r, c: spot.c, value };
}

// 1行に対するスライド＆合体処理
function slideAndMergeRow(row) {
  // 1. 0を除外
  const nonZero = row.filter(v => v !== 0);
  const result = [];
  let scoreGained = 0;
  let maxMergedValue = 0;

  for (let i = 0; i < nonZero.length; i++) {
    if (i < nonZero.length - 1 && nonZero[i] === nonZero[i + 1]) {
      const mergedVal = nonZero[i] * 2;
      result.push(mergedVal);
      scoreGained += mergedVal;
      if (mergedVal > maxMergedValue) maxMergedValue = mergedVal;
      i++; // 合体した隣の要素をスキップ
    } else {
      result.push(nonZero[i]);
    }
  }

  // 2. 0埋め
  while (result.length < SIZE) {
    result.push(0);
  }

  return { result, scoreGained, maxMergedValue };
}

// 盤面回転ユーティリティ
function rotateGrid(g) {
  const newGrid = [];
  for (let c = 0; c < SIZE; c++) {
    const newRow = [];
    for (let r = SIZE - 1; r >= 0; r--) {
      newRow.push(g[r][c]);
    }
    newGrid.push(newRow);
  }
  return newGrid;
}

function cloneGrid(g) {
  return g.map(row => [...row]);
}

// 4方向への移動実行
function move(direction) {
  if (isGameOver) return;

  // 履歴保存用
  const prevGrid = cloneGrid(grid);
  const prevScore = score;

  let rotations = 0;
  if (direction === "left") rotations = 0;
  else if (direction === "down") rotations = 1;
  else if (direction === "right") rotations = 2;
  else if (direction === "up") rotations = 3;

  // 移動方向が「左」になるよう回転
  let workingGrid = cloneGrid(grid);
  for (let i = 0; i < rotations; i++) {
    workingGrid = rotateGrid(workingGrid);
  }

  let totalScoreGained = 0;
  let highestMerged = 0;
  let hasChanged = false;

  for (let r = 0; r < SIZE; r++) {
    const { result, scoreGained, maxMergedValue } = slideAndMergeRow(workingGrid[r]);
    totalScoreGained += scoreGained;
    if (maxMergedValue > highestMerged) highestMerged = maxMergedValue;

    for (let c = 0; c < SIZE; c++) {
      if (workingGrid[r][c] !== result[c]) {
        hasChanged = true;
      }
      workingGrid[r][c] = result[c];
    }
  }

  // 元の向きに戻す
  const reverseRotations = (4 - rotations) % 4;
  for (let i = 0; i < reverseRotations; i++) {
    workingGrid = rotateGrid(workingGrid);
  }

  // 盤面に変化があった場合のみ更新
  if (hasChanged) {
    undoStack.push({ grid: prevGrid, score: prevScore });
    if (undoStack.length > 20) undoStack.shift();
    updateUndoButton();

    grid = workingGrid;
    score += totalScoreGained;
    scoreDisplay.textContent = score;
    checkAndUpdateBestScore();

    // 新規タイルの生成
    const newTile = spawnRandomTile();

    // サウンド再生
    if (highestMerged > 0) {
      playMergeSound(highestMerged);
    } else {
      playSlideSound();
    }

    renderTiles(newTile);

    // 2048達成チェック (初回のみ)
    if (!hasWon && !keepGoing && checkWin()) {
      hasWon = true;
      playWinSound();
      setTimeout(() => {
        winOverlay.classList.remove("hidden");
      }, 300);
    }

    // ゲームオーバーチェック
    if (checkGameOver()) {
      isGameOver = true;
      playGameOverSound();
      const isNew = checkAndUpdateBestScore();
      finalScore.textContent = score;
      newRecordBadge.classList.toggle("hidden", !isNew);
      setTimeout(() => {
        gameoverOverlay.classList.remove("hidden");
      }, 400);
    }
  }
}

function checkWin() {
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (grid[r][c] >= WIN_TARGET) return true;
    }
  }
  return false;
}

function checkGameOver() {
  // 空きマスがあればゲームオーバーではない
  if (getEmptyCells().length > 0) return false;

  // 隣接マスに合体可能なペアがあるか
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      const val = grid[r][c];
      if (r < SIZE - 1 && grid[r + 1][c] === val) return false;
      if (c < SIZE - 1 && grid[r][c + 1] === val) return false;
    }
  }
  return true;
}

// ==========================================
// 4. タイル描画 & DOM レンダリング
// ==========================================
function renderTiles(newTilePos = null) {
  tileContainer.innerHTML = "";

  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      const val = grid[r][c];
      if (val !== 0) {
        const tile = document.createElement("div");
        tile.className = `tile tile-${val <= 4096 ? val : "super"}`;

        if (newTilePos && newTilePos.r === r && newTilePos.c === c) {
          tile.classList.add("tile-new");
        }

        tile.textContent = val;

        // グリッド位置算出 (gap 8px)
        const leftPercent = c * 25;
        const topPercent = r * 25;
        tile.style.left = `calc(${leftPercent}% + ${c * 2}px - ${c * 2}px)`; // CSS calc
        tile.style.top = `calc(${topPercent}% + ${r * 2}px - ${r * 2}px)`;

        // CSS Gridパーセント配置
        tile.style.left = `calc(${c} * ((100% - 24px) / 4 + 8px))`;
        tile.style.top = `calc(${r} * ((100% - 24px) / 4 + 8px))`;

        tileContainer.appendChild(tile);
      }
    }
  }
}

function updateUndoButton() {
  undoBtn.disabled = undoStack.length === 0;
}

function undo() {
  if (undoStack.length === 0) return;
  const lastState = undoStack.pop();
  grid = cloneGrid(lastState.grid);
  score = lastState.score;
  scoreDisplay.textContent = score;
  isGameOver = false;

  gameoverOverlay.classList.add("hidden");
  updateUndoButton();
  renderTiles();
  playSlideSound();
}

// ==========================================
// 5. ゲーム初期化 & ライフサイクル
// ==========================================
function startNewGame() {
  initGrid();
  score = 0;
  scoreDisplay.textContent = "0";
  undoStack = [];
  hasWon = false;
  keepGoing = false;
  isGameOver = false;

  updateUndoButton();
  winOverlay.classList.add("hidden");
  gameoverOverlay.classList.add("hidden");

  // 初期タイル2個スポーン
  spawnRandomTile();
  spawnRandomTile();
  renderTiles();
}

// ==========================================
// 6. ユーザー入力・操作ハンドリング
// ==========================================
function handleInput(dir) {
  initAudio();
  move(dir);
}

// キーボード
window.addEventListener("keydown", (e) => {
  if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space", " "].includes(e.code)) {
    e.preventDefault();
  }

  switch (e.code) {
    case "ArrowUp":
    case "KeyW":
      handleInput("up");
      break;
    case "ArrowDown":
    case "KeyS":
      handleInput("down");
      break;
    case "ArrowLeft":
    case "KeyA":
      handleInput("left");
      break;
    case "ArrowRight":
    case "KeyD":
      handleInput("right");
      break;
  }
}, { passive: false });

// スマホ用 D-Pad ボタン
document.getElementById("btn-up").addEventListener("click", () => handleInput("up"));
document.getElementById("btn-down").addEventListener("click", () => handleInput("down"));
document.getElementById("btn-left").addEventListener("click", () => handleInput("left"));
document.getElementById("btn-right").addEventListener("click", () => handleInput("right"));

// スワイプ操作 (boardWrapper上)
let touchStartX = 0;
let touchStartY = 0;

boardWrapper.addEventListener("touchstart", (e) => {
  if (e.touches.length > 0) {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
  }
}, { passive: true });

boardWrapper.addEventListener("touchend", (e) => {
  if (!e.changedTouches.length) return;
  const dx = e.changedTouches[0].clientX - touchStartX;
  const dy = e.changedTouches[0].clientY - touchStartY;
  const absX = Math.abs(dx);
  const absY = Math.abs(dy);

  if (Math.max(absX, absY) > 24) {
    if (absX > absY) {
      handleInput(dx > 0 ? "right" : "left");
    } else {
      handleInput(dy > 0 ? "down" : "up");
    }
  }
}, { passive: true });

function setupTestBoard() {
  initAudio();
  initGrid();
  grid[0][0] = 1024;
  grid[0][1] = 1024;
  grid[1][0] = 512;
  grid[1][1] = 512;
  score = 2048;
  scoreDisplay.textContent = score;
  undoStack = [];
  hasWon = false;
  keepGoing = false;
  isGameOver = false;

  updateUndoButton();
  winOverlay.classList.add("hidden");
  gameoverOverlay.classList.add("hidden");

  renderTiles();
}

// UIボタン
undoBtn.addEventListener("click", undo);
gameoverUndoBtn.addEventListener("click", undo);

resetBtn.addEventListener("click", () => {
  initAudio();
  startNewGame();
});

restartBtn.addEventListener("click", () => {
  initAudio();
  startNewGame();
});

winRestartBtn.addEventListener("click", () => {
  initAudio();
  startNewGame();
});

keepGoingBtn.addEventListener("click", () => {
  keepGoing = true;
  winOverlay.classList.add("hidden");
});

// 初期ロード
window.addEventListener("DOMContentLoaded", () => {
  loadBestScore();
  startNewGame();
});


// ==========================================================================
// iOS / iPadOS Safari ダブルタップズーム & ピンチズーム抑止
// ==========================================================================
(function() {
  let lastTouchEnd = 0;
  document.addEventListener('touchend', function(e) {
    const now = Date.now();
    if (now - lastTouchEnd <= 350) {
      if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA' && e.target.tagName !== 'SELECT') {
        e.preventDefault();
      }
    }
    lastTouchEnd = now;
  }, { passive: false });

  document.addEventListener('gesturestart', function(e) {
    e.preventDefault();
  }, { passive: false });

  document.addEventListener('dblclick', function(e) {
    if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA' && e.target.tagName !== 'SELECT') {
      e.preventDefault();
    }
  });
})();
