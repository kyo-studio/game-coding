/**
 * ==========================================
 * Game #20 マッチ3パズル (Match-3 Puzzle)
 * 8×8グリッド・スワップ3連消し・重力落下＆補充・連鎖コンボ・氷ブロックミッション
 * ==========================================
 */

// ==========================================
// 1. 定数・設定
// ==========================================
const GRID_SIZE = 8;
const CANVAS_SIZE = 360;
const CELL_SIZE = CANVAS_SIZE / GRID_SIZE; // 45px

// 宝石の定義 (6色)
const GEM_TYPES = [
  { name: "Ruby",     color: "#ef4444", shape: "diamond" },
  { name: "Sapphire", color: "#3b82f6", shape: "hexagon" },
  { name: "Emerald",  color: "#10b981", shape: "square" },
  { name: "Topaz",    color: "#f59e0b", shape: "triangle" },
  { name: "Amethyst", color: "#a855f7", shape: "octagon" },
  { name: "Diamond",  color: "#38bdf8", shape: "star" }
];

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

function playSelectSound() {
  if (!audioCtx) return;
  try {
    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(520, now);
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(now);
    osc.stop(now + 0.05);
  } catch (e) {}
}

function playSwapSound() {
  if (!audioCtx) return;
  try {
    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(280, now);
    osc.frequency.linearRampToValueAtTime(420, now + 0.08);
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(now);
    osc.stop(now + 0.08);
  } catch (e) {}
}

function playMatchSound(combo = 1) {
  if (!audioCtx) return;
  try {
    const now = audioCtx.currentTime;
    const notes = [261.63, 293.66, 329.63, 349.23, 392.00, 440.00, 493.88, 523.25, 587.33, 659.25, 783.99];
    const baseIndex = Math.min(notes.length - 1, (combo - 1) * 2);
    const freq = notes[baseIndex];

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, now);
    osc.frequency.setValueAtTime(freq * 1.5, now + 0.05);

    gain.gain.setValueAtTime(0.14, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(now);
    osc.stop(now + 0.18);
  } catch (e) {}
}

function playIceBreakSound() {
  if (!audioCtx) return;
  try {
    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(1200, now);
    osc.frequency.exponentialRampToValueAtTime(3200, now + 0.08);
    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(now);
    osc.stop(now + 0.1);
  } catch (e) {}
}

function playBombSound() {
  if (!audioCtx) return;
  try {
    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.exponentialRampToValueAtTime(30, now + 0.3);

    gain.gain.setValueAtTime(0.22, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(now);
    osc.stop(now + 0.3);
  } catch (e) {}
}

function playClearFanfare() {
  if (!audioCtx) return;
  try {
    const now = audioCtx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.50];
    notes.forEach((freq, idx) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now + idx * 0.12);
      gain.gain.setValueAtTime(0.18, now + idx * 0.12);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.12 + 0.25);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(now + idx * 0.12);
      osc.stop(now + idx * 0.12 + 0.25);
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
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.linearRampToValueAtTime(100, now + 0.4);
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(now);
    osc.stop(now + 0.4);
  } catch (e) {}
}

// ==========================================
// 3. ゲーム状態管理
// ==========================================
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const scoreDisplay = document.getElementById("score-display");
const iceDisplay = document.getElementById("ice-display");
const movesDisplay = document.getElementById("moves-display");
const stageDisplay = document.getElementById("stage-display");
const bestScoreDisplay = document.getElementById("best-score-display");

const startOverlay = document.getElementById("start-overlay");
const clearOverlay = document.getElementById("clear-overlay");
const gameoverOverlay = document.getElementById("gameover-overlay");
const clearScore = document.getElementById("clear-score");
const clearBonus = document.getElementById("clear-bonus");
const finalScore = document.getElementById("final-score");
const finalStage = document.getElementById("final-stage");
const newRecordBadge = document.getElementById("new-record-badge");

const startBtn = document.getElementById("start-btn");
const nextStageBtn = document.getElementById("next-stage-btn");
const restartBtn = document.getElementById("restart-btn");

let grid = [];
let iceGrid = [];
let remainingIce = 0;
let score = 0;
let moves = 18; // 手数タイト化
let stage = 1;
let bestScore = 0;
let isRunning = false;

// アニメーション & ステートマシン
let gameState = "IDLE";
let selectedGem = null;
let swapGem1 = null;
let swapGem2 = null;
let combo = 0;

let particles = [];
let floatingTexts = [];
let animFrameId = null;

// ==========================================
// 4. ジェム クラス (Gem)
// ==========================================
class Gem {
  constructor(r, c, type = -1) {
    this.r = r;
    this.c = c;
    this.type = type === -1 ? Math.floor(Math.random() * GEM_TYPES.length) : type;
    this.special = "none"; // "none", "line_h", "line_v", "bomb"

    this.x = c * CELL_SIZE + CELL_SIZE / 2;
    this.y = r * CELL_SIZE + CELL_SIZE / 2;
    this.targetX = this.x;
    this.targetY = this.y;

    this.scale = 1.0;
    this.alpha = 1.0;
    this.toEliminate = false;
  }

  update() {
    const dx = this.targetX - this.x;
    const dy = this.targetY - this.y;
    this.x += dx * 0.25;
    this.y += dy * 0.25;

    if (this.toEliminate) {
      this.scale = Math.max(0, this.scale - 0.15);
      this.alpha = Math.max(0, this.alpha - 0.15);
    }
  }

  isAtTarget() {
    return Math.abs(this.targetX - this.x) < 0.5 && Math.abs(this.targetY - this.y) < 0.5;
  }

  draw() {
    if (this.alpha <= 0 || this.scale <= 0) return;

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.scale(this.scale, this.scale);
    ctx.globalAlpha = this.alpha;

    const gemData = GEM_TYPES[this.type];
    const radius = CELL_SIZE * 0.38;

    // 選択ハイライト
    if (selectedGem === this) {
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2.5;
      ctx.shadowColor = "#ffffff";
      ctx.shadowBlur = 10;
      ctx.strokeRect(-CELL_SIZE / 2 + 2, -CELL_SIZE / 2 + 2, CELL_SIZE - 4, CELL_SIZE - 4);
    }

    // 宝石描画
    ctx.fillStyle = gemData.color;
    ctx.shadowColor = gemData.color;
    ctx.shadowBlur = 8;
    ctx.beginPath();

    switch (gemData.shape) {
      case "diamond":
        ctx.moveTo(0, -radius);
        ctx.lineTo(radius, 0);
        ctx.lineTo(0, radius);
        ctx.lineTo(-radius, 0);
        break;
      case "hexagon":
        for (let i = 0; i < 6; i++) {
          const angle = (i * Math.PI) / 3;
          const px = Math.cos(angle) * radius;
          const py = Math.sin(angle) * radius;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        break;
      case "square":
        ctx.rect(-radius * 0.85, -radius * 0.85, radius * 1.7, radius * 1.7);
        break;
      case "triangle":
        ctx.moveTo(0, -radius);
        ctx.lineTo(radius * 0.9, radius * 0.8);
        ctx.lineTo(-radius * 0.9, radius * 0.8);
        break;
      case "octagon":
        for (let i = 0; i < 8; i++) {
          const angle = (i * Math.PI) / 4 + Math.PI / 8;
          const px = Math.cos(angle) * radius;
          const py = Math.sin(angle) * radius;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        break;
      case "star":
        ctx.arc(0, 0, radius * 0.85, 0, Math.PI * 2);
        break;
    }

    ctx.closePath();
    ctx.fill();

    // 宝石の光沢ハイライト
    ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
    ctx.beginPath();
    ctx.arc(-radius * 0.25, -radius * 0.25, radius * 0.35, 0, Math.PI * 2);
    ctx.fill();

    // 特殊ジェムアイコン
    if (this.special === "line_h") {
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 13px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("↔", 0, 0);
    } else if (this.special === "line_v") {
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 13px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("↕", 0, 0);
    } else if (this.special === "bomb") {
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 14px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("💥", 0, 0);
    }

    ctx.restore();
  }
}

// ==========================================
// 5. パーティクル & エフェクト
// ==========================================
class FloatingText {
  constructor(text, x, y, color) {
    this.text = text;
    this.x = x;
    this.y = y;
    this.color = color;
    this.alpha = 1.0;
  }
  update() {
    this.y -= 0.7;
    this.alpha -= 0.025;
  }
  draw() {
    ctx.save();
    ctx.globalAlpha = Math.max(0, this.alpha);
    ctx.font = "bold 13px sans-serif";
    ctx.fillStyle = this.color;
    ctx.textAlign = "center";
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 6;
    ctx.fillText(this.text, this.x, this.y);
    ctx.restore();
  }
}

class Particle {
  constructor(x, y, color, size = 2) {
    this.x = x;
    this.y = y;
    this.color = color;
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 3.0 + 1.0;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.radius = Math.random() * size + 1.5;
    this.alpha = 1.0;
  }
  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.alpha -= 0.035;
  }
  draw() {
    ctx.save();
    ctx.globalAlpha = Math.max(0, this.alpha);
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function createGemBurst(x, y, color, count = 10) {
  for (let i = 0; i < count; i++) {
    particles.push(new Particle(x, y, color));
  }
}

function createIceShatter(x, y) {
  for (let i = 0; i < 14; i++) {
    particles.push(new Particle(x, y, "#67e8f9", 3.0));
  }
}

// ==========================================
// 6. 盤面 & 氷ブロック初期化
// ==========================================
function initBoard() {
  grid = [];
  iceGrid = [];
  remainingIce = 0;

  // 1. 氷パターンの生成
  for (let r = 0; r < GRID_SIZE; r++) {
    const iceRow = [];
    for (let c = 0; c < GRID_SIZE; c++) {
      let hasIce = false;
      if (stage === 1) {
        // 中央 4x4 + 4点 = 16マス
        if (r >= 2 && r <= 5 && c >= 2 && c <= 5) {
          hasIce = true;
        }
      } else if (stage === 2) {
        // 十字型パターン (20マス)
        if (r === 2 || r === 5 || c === 2 || c === 5) {
          hasIce = true;
        }
      } else {
        // ステージ3+: 外周フレームまたはランダム24マス
        if (r >= 1 && r <= 6 && c >= 1 && c <= 6 && (r === 1 || r === 6 || c === 1 || c === 6 || (r >= 3 && r <= 4 && c >= 3 && c <= 4))) {
          hasIce = true;
        }
      }
      iceRow.push(hasIce ? 1 : 0);
      if (hasIce) remainingIce++;
    }
    iceGrid.push(iceRow);
  }

  iceDisplay.textContent = remainingIce;

  // 2. 初期ジェム生成（初期マッチなし）
  for (let r = 0; r < GRID_SIZE; r++) {
    const row = [];
    for (let c = 0; c < GRID_SIZE; c++) {
      let gem;
      do {
        gem = new Gem(r, c);
      } while (
        (c >= 2 && row[c - 1].type === gem.type && row[c - 2].type === gem.type) ||
        (r >= 2 && grid[r - 1][c].type === gem.type && grid[r - 2][c].type === gem.type)
      );
      row.push(gem);
    }
    grid.push(row);
  }
}

function findMatches() {
  const matchedGems = new Set();
  const specialSpawns = [];

  // 横方向
  for (let r = 0; r < GRID_SIZE; r++) {
    let matchLength = 1;
    for (let c = 0; c < GRID_SIZE; c++) {
      const checkNext = (c < GRID_SIZE - 1 && grid[r][c] && grid[r][c + 1] && grid[r][c].type === grid[r][c + 1].type);
      if (checkNext) {
        matchLength++;
      } else {
        if (matchLength >= 3) {
          for (let k = c - matchLength + 1; k <= c; k++) {
            matchedGems.add(grid[r][k]);
          }
          if (matchLength === 4) {
            specialSpawns.push({ gem: grid[r][c - 1], type: "line_h" });
          } else if (matchLength >= 5) {
            specialSpawns.push({ gem: grid[r][c - 2], type: "bomb" });
          }
        }
        matchLength = 1;
      }
    }
  }

  // 縦方向
  for (let c = 0; c < GRID_SIZE; c++) {
    let matchLength = 1;
    for (let r = 0; r < GRID_SIZE; r++) {
      const checkNext = (r < GRID_SIZE - 1 && grid[r][c] && grid[r + 1][c] && grid[r][c].type === grid[r + 1][c].type);
      if (checkNext) {
        matchLength++;
      } else {
        if (matchLength >= 3) {
          for (let k = r - matchLength + 1; k <= r; k++) {
            matchedGems.add(grid[k][c]);
          }
          if (matchLength === 4) {
            specialSpawns.push({ gem: grid[r - 1][c], type: "line_v" });
          } else if (matchLength >= 5) {
            specialSpawns.push({ gem: grid[r - 2][c], type: "bomb" });
          }
        }
        matchLength = 1;
      }
    }
  }

  return { matchedList: Array.from(matchedGems), specialSpawns };
}

function swapGems(g1, g2) {
  const tempR = g1.r;
  const tempC = g1.c;

  g1.r = g2.r;
  g1.c = g2.c;
  g1.targetX = g1.c * CELL_SIZE + CELL_SIZE / 2;
  g1.targetY = g1.r * CELL_SIZE + CELL_SIZE / 2;

  g2.r = tempR;
  g2.c = tempC;
  g2.targetX = g2.c * CELL_SIZE + CELL_SIZE / 2;
  g2.targetY = g2.r * CELL_SIZE + CELL_SIZE / 2;

  grid[g1.r][g1.c] = g1;
  grid[g2.r][g2.c] = g2;
}

// ==========================================
// 7. ゲーム進行・ライフサイクル
// ==========================================
function loadBestScore() {
  const saved = localStorage.getItem("match3_best_score");
  if (saved !== null) {
    bestScore = parseInt(saved, 10);
    bestScoreDisplay.textContent = bestScore.toLocaleString();
  }
}

function checkAndUpdateBestScore() {
  if (score > bestScore) {
    bestScore = score;
    localStorage.setItem("match3_best_score", bestScore);
    bestScoreDisplay.textContent = bestScore.toLocaleString();
    return true;
  }
  return false;
}

function startNewGame() {
  score = 0;
  moves = 18;
  stage = 1;

  scoreDisplay.textContent = "0";
  movesDisplay.textContent = moves;
  stageDisplay.textContent = stage;

  selectedGem = null;
  gameState = "IDLE";
  particles = [];
  floatingTexts = [];

  initBoard();

  startOverlay.classList.add("hidden");
  clearOverlay.classList.add("hidden");
  gameoverOverlay.classList.add("hidden");

  isRunning = true;
  if (!animFrameId) {
    animFrameId = requestAnimationFrame(gameLoop);
  }
}

function nextStage() {
  stage++;
  moves = Math.max(15, 18 - Math.floor((stage - 1) / 2));

  movesDisplay.textContent = moves;
  stageDisplay.textContent = stage;

  selectedGem = null;
  gameState = "IDLE";
  particles = [];
  floatingTexts = [];

  initBoard();
  clearOverlay.classList.add("hidden");
  isRunning = true;
}

function handleStageClear() {
  isRunning = false;
  playClearFanfare();
  const bonus = moves * 150;
  score += bonus;
  scoreDisplay.textContent = score.toLocaleString();
  checkAndUpdateBestScore();

  clearScore.textContent = score.toLocaleString();
  clearBonus.textContent = bonus.toLocaleString();
  clearOverlay.classList.remove("hidden");
}

function handleGameOver() {
  isRunning = false;
  playGameOverSound();
  const isNew = checkAndUpdateBestScore();
  finalScore.textContent = score.toLocaleString();
  finalStage.textContent = stage;
  newRecordBadge.classList.toggle("hidden", !isNew);
  gameoverOverlay.classList.remove("hidden");
}

// ==========================================
// 8. メインループ & ステート更新
// ==========================================
function gameLoop() {
  update();
  draw();
  animFrameId = requestAnimationFrame(gameLoop);
}

function update() {
  let allAtTarget = true;
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      if (grid[r][c]) {
        grid[r][c].update();
        if (!grid[r][c].isAtTarget()) allAtTarget = false;
      }
    }
  }

  particles.forEach(p => p.update());
  particles = particles.filter(p => p.alpha > 0);

  floatingTexts.forEach(t => t.update());
  floatingTexts = floatingTexts.filter(t => t.alpha > 0);

  if (gameState === "SWAPPING" && allAtTarget) {
    const { matchedList, specialSpawns } = findMatches();
    if (matchedList.length > 0) {
      moves--;
      movesDisplay.textContent = moves;
      combo = 1;
      processElimination(matchedList, specialSpawns);
    } else {
      playSwapSound();
      swapGems(swapGem1, swapGem2);
      gameState = "REVERTING";
    }
  } else if (gameState === "REVERTING" && allAtTarget) {
    gameState = "IDLE";
    swapGem1 = null;
    swapGem2 = null;
  } else if (gameState === "ELIMINATING") {
    let eliminationFinished = true;
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        if (grid[r][c] && grid[r][c].toEliminate && grid[r][c].scale > 0) {
          eliminationFinished = false;
        }
      }
    }

    if (eliminationFinished) {
      for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
          if (grid[r][c] && grid[r][c].toEliminate) {
            grid[r][c] = null;
          }
        }
      }
      startDropping();
    }
  } else if (gameState === "DROPPING" && allAtTarget) {
    const { matchedList, specialSpawns } = findMatches();
    if (matchedList.length > 0) {
      combo++;
      processElimination(matchedList, specialSpawns);
    } else {
      gameState = "IDLE";
      selectedGem = null;

      // 氷全破壊でクリア判定
      if (remainingIce <= 0) {
        handleStageClear();
      } else if (moves <= 0) {
        handleGameOver();
      }
    }
  }
}

function processElimination(matchedList, specialSpawns) {
  gameState = "ELIMINATING";
  playMatchSound(combo);

  const toDestroy = new Set(matchedList);

  // 特殊ボムの誘爆判定
  matchedList.forEach(gem => {
    if (gem.special === "line_h") {
      playBombSound();
      for (let c = 0; c < GRID_SIZE; c++) {
        if (grid[gem.r][c]) toDestroy.add(grid[gem.r][c]);
      }
    } else if (gem.special === "line_v") {
      playBombSound();
      for (let r = 0; r < GRID_SIZE; r++) {
        if (grid[r][gem.c]) toDestroy.add(grid[r][gem.c]);
      }
    } else if (gem.special === "bomb") {
      playBombSound();
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          const nr = gem.r + dr;
          const nc = gem.c + dc;
          if (nr >= 0 && nr < GRID_SIZE && nc >= 0 && nc < GRID_SIZE && grid[nr][nc]) {
            toDestroy.add(grid[nr][nc]);
          }
        }
      }
    }
  });

  // 氷ブロック破壊処理
  let brokenIceCount = 0;
  toDestroy.forEach(gem => {
    if (iceGrid[gem.r][gem.c] > 0) {
      iceGrid[gem.r][gem.c] = 0;
      brokenIceCount++;
      remainingIce = Math.max(0, remainingIce - 1);
      createIceShatter(gem.x, gem.y);
    }
  });

  if (brokenIceCount > 0) {
    playIceBreakSound();
    iceDisplay.textContent = remainingIce;
  }

  // スコア加算
  const basePoints = toDestroy.size * 60 * combo + brokenIceCount * 150;
  score += basePoints;
  scoreDisplay.textContent = score.toLocaleString();
  checkAndUpdateBestScore();

  const centerGem = matchedList[0] || Array.from(toDestroy)[0];
  if (centerGem) {
    const text = combo > 1 ? `+${basePoints} (${combo} COMBO!)` : `+${basePoints}`;
    floatingTexts.push(new FloatingText(text, centerGem.x, centerGem.y - 10, combo > 1 ? "#fbbf24" : "#f472b6"));
  }

  toDestroy.forEach(gem => {
    gem.toEliminate = true;
    createGemBurst(gem.x, gem.y, GEM_TYPES[gem.type].color, 6);
  });

  specialSpawns.forEach(s => {
    if (s.gem) {
      s.gem.toEliminate = false;
      s.gem.scale = 1.0;
      s.gem.alpha = 1.0;
      s.gem.special = s.type;
    }
  });
}

function startDropping() {
  gameState = "DROPPING";

  for (let c = 0; c < GRID_SIZE; c++) {
    let emptyRow = GRID_SIZE - 1;
    for (let r = GRID_SIZE - 1; r >= 0; r--) {
      if (grid[r][c] !== null) {
        if (r !== emptyRow) {
          const gem = grid[r][c];
          grid[emptyRow][c] = gem;
          grid[r][c] = null;
          gem.r = emptyRow;
          gem.targetY = emptyRow * CELL_SIZE + CELL_SIZE / 2;
        }
        emptyRow--;
      }
    }

    let spawnOffset = 1;
    for (let r = emptyRow; r >= 0; r--) {
      const newGem = new Gem(r, c);
      newGem.y = -spawnOffset * CELL_SIZE + CELL_SIZE / 2;
      newGem.targetY = r * CELL_SIZE + CELL_SIZE / 2;
      grid[r][c] = newGem;
      spawnOffset++;
    }
  }
}

// ==========================================
// 9. 描画処理 (Draw - 氷ブロックの描画)
// ==========================================
function draw() {
  ctx.fillStyle = "#0f172a";
  ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

  // 1. グリッド背景
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      ctx.fillStyle = (r + c) % 2 === 0 ? "rgba(30, 41, 59, 0.45)" : "rgba(15, 23, 42, 0.45)";
      ctx.fillRect(c * CELL_SIZE, r * CELL_SIZE, CELL_SIZE, CELL_SIZE);
    }
  }

  // 2. 氷ブロック描画 (ジェムの背面レイヤー)
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      if (iceGrid[r][c] > 0) {
        const x = c * CELL_SIZE;
        const y = r * CELL_SIZE;

        // 半透明氷テクスチャ
        ctx.fillStyle = "rgba(103, 232, 249, 0.28)";
        ctx.fillRect(x + 2, y + 2, CELL_SIZE - 4, CELL_SIZE - 4);

        ctx.strokeStyle = "rgba(165, 243, 252, 0.75)";
        ctx.lineWidth = 1.5;
        ctx.strokeRect(x + 2, y + 2, CELL_SIZE - 4, CELL_SIZE - 4);

        // 氷のひび割れライン
        ctx.strokeStyle = "rgba(255, 255, 255, 0.45)";
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(x + 6, y + 6);
        ctx.lineTo(x + CELL_SIZE * 0.4, y + CELL_SIZE * 0.45);
        ctx.lineTo(x + CELL_SIZE - 8, y + 10);
        ctx.moveTo(x + CELL_SIZE * 0.4, y + CELL_SIZE * 0.45);
        ctx.lineTo(x + CELL_SIZE * 0.6, y + CELL_SIZE - 6);
        ctx.stroke();
      }
    }
  }

  // 3. ジェム描画
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      if (grid[r][c]) {
        grid[r][c].draw();
      }
    }
  }

  // 4. パーティクル & フローティングテキスト描画
  particles.forEach(p => p.draw());
  floatingTexts.forEach(t => t.draw());
}

// ==========================================
// 10. ユーザー入力・操作ハンドリング
// ==========================================
function handleCellSelection(r, c) {
  if (gameState !== "IDLE" || !isRunning) return;
  initAudio();

  const clickedGem = grid[r][c];
  if (!clickedGem) return;

  if (!selectedGem) {
    selectedGem = clickedGem;
    playSelectSound();
  } else {
    const dr = Math.abs(selectedGem.r - clickedGem.r);
    const dc = Math.abs(selectedGem.c - clickedGem.c);

    if (dr + dc === 1) {
      playSwapSound();
      swapGem1 = selectedGem;
      swapGem2 = clickedGem;
      swapGems(swapGem1, swapGem2);
      selectedGem = null;
      gameState = "SWAPPING";
    } else {
      selectedGem = clickedGem;
      playSelectSound();
    }
  }
}

function handleSwipe(fromR, fromC, toR, toC) {
  if (gameState !== "IDLE" || !isRunning) return;
  if (toR < 0 || toR >= GRID_SIZE || toC < 0 || toC >= GRID_SIZE) return;

  const g1 = grid[fromR][fromC];
  const g2 = grid[toR][toC];
  if (!g1 || !g2) return;

  initAudio();
  playSwapSound();
  swapGem1 = g1;
  swapGem2 = g2;
  swapGems(swapGem1, swapGem2);
  selectedGem = null;
  gameState = "SWAPPING";
}

let touchStartR = -1;
let touchStartC = -1;
let touchStartX = 0;
let touchStartY = 0;

function getGridPosFromCoords(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  const scale = CANVAS_SIZE / rect.width;
  const x = (clientX - rect.left) * scale;
  const y = (clientY - rect.top) * scale;
  const c = Math.floor(x / CELL_SIZE);
  const r = Math.floor(y / CELL_SIZE);
  if (r >= 0 && r < GRID_SIZE && c >= 0 && c < GRID_SIZE) {
    return { r, c };
  }
  return null;
}

canvas.addEventListener("mousedown", (e) => {
  const pos = getGridPosFromCoords(e.clientX, e.clientY);
  if (pos) {
    touchStartR = pos.r;
    touchStartC = pos.c;
    touchStartX = e.clientX;
    touchStartY = e.clientY;
  }
});

canvas.addEventListener("mouseup", (e) => {
  if (touchStartR === -1) return;
  const dx = e.clientX - touchStartX;
  const dy = e.clientY - touchStartY;
  const dist = Math.hypot(dx, dy);

  if (dist > 15) {
    if (Math.abs(dx) > Math.abs(dy)) {
      handleSwipe(touchStartR, touchStartC, touchStartR, touchStartC + (dx > 0 ? 1 : -1));
    } else {
      handleSwipe(touchStartR, touchStartC, touchStartR + (dy > 0 ? 1 : -1), touchStartC);
    }
  } else {
    handleCellSelection(touchStartR, touchStartC);
  }
  touchStartR = -1;
});

canvas.addEventListener("touchstart", (e) => {
  if (e.touches.length > 0) {
    const pos = getGridPosFromCoords(e.touches[0].clientX, e.touches[0].clientY);
    if (pos) {
      touchStartR = pos.r;
      touchStartC = pos.c;
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
    }
  }
}, { passive: true });

canvas.addEventListener("touchend", (e) => {
  if (touchStartR === -1 || !e.changedTouches.length) return;
  const dx = e.changedTouches[0].clientX - touchStartX;
  const dy = e.changedTouches[0].clientY - touchStartY;
  const dist = Math.hypot(dx, dy);

  if (dist > 15) {
    if (Math.abs(dx) > Math.abs(dy)) {
      handleSwipe(touchStartR, touchStartC, touchStartR, touchStartC + (dx > 0 ? 1 : -1));
    } else {
      handleSwipe(touchStartR, touchStartC, touchStartR + (dy > 0 ? 1 : -1), touchStartC);
    }
  } else {
    handleCellSelection(touchStartR, touchStartC);
  }
  touchStartR = -1;
}, { passive: true });

// UIボタン
startBtn.addEventListener("click", () => {
  initAudio();
  startNewGame();
});

nextStageBtn.addEventListener("click", () => {
  initAudio();
  nextStage();
});

restartBtn.addEventListener("click", () => {
  initAudio();
  startNewGame();
});

// 初期ロード
window.addEventListener("DOMContentLoaded", () => {
  loadBestScore();
  initBoard();
  draw();
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
