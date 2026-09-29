/**
 * ========================================================
 * 10 スネークゲーム (Snake) - JavaScript
 * ========================================================
 * このファイルでは、以下の重要プログラミング知識を学びます：
 * 1. グリッド座標系 (Grid System: 20x20マス) の設計と変換
 * 2. キュー (Queue: unshift / pop) によるヘビの体節追従アルゴリズム
 * 3. 逆走防止 (Opposite Direction Guard) と入力バッファ
 * 4. 配列メソッド (some) による自己衝突判定
 * 5. タッチスワイプ (Swipe Detection) ジェスチャー検出
 * 6. 壁あり (Classic) / ワープ (Wrap-around) の境界処理
 * 7. スマホ実機スクロール完全防止とLocalStorage保存
 */

// ==========================================
// 1. グリッド定数とCanvas初期化
// ==========================================
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const GRID_SIZE = 24;                 // 1マスのピクセル数 (24px)
const GRID_COUNT = canvas.width / GRID_SIZE; // 480 / 24 = 20マス (20x20)

// 方向定数ベクトル
const DIRECTIONS = {
  UP:    { x: 0,  y: -1, opposite: "DOWN" },
  DOWN:  { x: 0,  y: 1,  opposite: "UP" },
  LEFT:  { x: -1, y: 0,  opposite: "RIGHT" },
  RIGHT: { x: 1,  y: 0,  opposite: "LEFT" }
};

// 速度設定（ミリ秒ごとのtick間隔）
const SPEED_CONFIG = {
  slow: 150,   // 初級 (ゆっくり)
  normal: 110, // 中級 (標準)
  fast: 75     // 上級 (高速)
};

// ==========================================
// 2. DOM要素の取得
// ==========================================
const scoreDisplay = document.getElementById("score-display");
const lengthDisplay = document.getElementById("length-display");
const bestScoreDisplay = document.getElementById("best-score-display");
const startOverlay = document.getElementById("start-overlay");
const gameoverOverlay = document.getElementById("gameover-overlay");
const gameoverReason = document.getElementById("gameover-reason");
const startBtn = document.getElementById("start-btn");
const restartBtn = document.getElementById("restart-btn");
const finalScoreEl = document.getElementById("final-score");
const finalLengthEl = document.getElementById("final-length");
const newRecordBadge = document.getElementById("new-record-badge");
const modeButtons = document.querySelectorAll(".mode-btn");
const speedButtons = document.querySelectorAll(".speed-btn");
const dpadButtons = document.querySelectorAll(".dpad-btn");

// ==========================================
// 3. ゲームの状態変数
// ==========================================
let wallMode = "classic";   // "classic" | "wrap"
let currentSpeed = "normal"; // "slow" | "normal" | "fast"
let isRunning = false;
let isPaused = false;
let score = 0;
let bestScore = 0;

// ヘビのデータ（キュー構造：インデックス0が「頭」）
let snake = [];
let currentDirection = "RIGHT";
let nextDirection = "RIGHT"; // 入力バッファ（逆走防止用）

// エサとアイテム
let food = null;
let bonusFood = null;
let bonusTimer = 0;
let particles = [];

// タイマーループ用
let lastTickTime = 0;
let animationFrameId = null;

// ==========================================
// 4. ベスト記録の読み込みと保存 (LocalStorage)
// ==========================================
function loadBestScore() {
  const saved = localStorage.getItem(`snake_best_${wallMode}`);
  if (saved !== null) {
    bestScore = parseInt(saved, 10);
    bestScoreDisplay.textContent = bestScore;
  } else {
    bestScore = 0;
    bestScoreDisplay.textContent = "0";
  }
}

function checkAndUpdateBestScore() {
  if (score > bestScore) {
    bestScore = score;
    localStorage.setItem(`snake_best_${wallMode}`, bestScore);
    bestScoreDisplay.textContent = bestScore;
    return true; // 新記録
  }
  return false;
}

// ==========================================
// 5. ゲームの初期化と開始
// ==========================================
function initGame() {
  // ヘビの初期位置（中央付近に3マスの長さで配置）
  snake = [
    { x: 8, y: 10 }, // 頭
    { x: 7, y: 10 }, // 胴体
    { x: 6, y: 10 }  // 尻尾
  ];

  currentDirection = "RIGHT";
  nextDirection = "RIGHT";
  score = 0;
  bonusFood = null;
  bonusTimer = 0;
  particles = [];

  scoreDisplay.textContent = "0";
  lengthDisplay.textContent = snake.length;

  loadBestScore();
  spawnFood();
}

function startGame() {
  initGame();
  startOverlay.classList.add("hidden");
  gameoverOverlay.classList.add("hidden");

  isRunning = true;
  isPaused = false;
  lastTickTime = performance.now();
  animationFrameId = requestAnimationFrame(gameLoop);
}

// ==========================================
// 6. メインゲームループ (Game Loop)
// ==========================================
function gameLoop(timestamp) {
  if (!isRunning) return;

  const tickInterval = SPEED_CONFIG[currentSpeed];

  // 一定時間（tickInterval）ごとに1マス前進
  if (timestamp - lastTickTime >= tickInterval) {
    lastTickTime = timestamp;
    if (!isPaused) {
      update();
    }
  }

  draw();
  animationFrameId = requestAnimationFrame(gameLoop);
}

// ==========================================
// 7. 状態更新処理 (Update)
// ==========================================
function update() {
  // 1. 入力バッファから次の進行方向を確定（逆走防止チェック）
  currentDirection = nextDirection;
  const dir = DIRECTIONS[currentDirection];

  // 2. 新しい頭のグリッド座標を計算
  let newHead = {
    x: snake[0].x + dir.x,
    y: snake[0].y + dir.y
  };

  // 3. 【壁との衝突 / ワープ判定】
  if (wallMode === "classic") {
    // 壁ありモード：外周にぶつかったら激突死
    if (
      newHead.x < 0 ||
      newHead.x >= GRID_COUNT ||
      newHead.y < 0 ||
      newHead.y >= GRID_COUNT
    ) {
      handleGameOver("壁に激突してしまいました！");
      return;
    }
  } else {
    // ワープモード：反対側の壁から出現
    if (newHead.x < 0) newHead.x = GRID_COUNT - 1;
    if (newHead.x >= GRID_COUNT) newHead.x = 0;
    if (newHead.y < 0) newHead.y = GRID_COUNT - 1;
    if (newHead.y >= GRID_COUNT) newHead.y = 0;
  }

  // 4. 【自己衝突判定（自分の体に噛みついたか）】
  // 頭以外の胴体部分に newHead が含まれているかチェック
  const isSelfHit = snake.some((segment, index) => {
    return segment.x === newHead.x && segment.y === newHead.y;
  });

  if (isSelfHit) {
    handleGameOver("自分の体に噛みついてしまいました！");
    return;
  }

  // 5. 【キュー操作：頭を配列の先頭に追加 (unshift)】
  snake.unshift(newHead);

  // 6. 【エサ（リンゴ）の捕食判定】
  let isAteFood = false;

  if (food && newHead.x === food.x && newHead.y === food.y) {
    // 通常リンゴを食べた！
    score += 10;
    isAteFood = true;
    createEatParticles(food.x, food.y, "#ef4444");
    spawnFood();

    // たまにボーナスアイテムを出現させる（15%の確率）
    if (!bonusFood && Math.random() < 0.25) {
      spawnBonusFood();
    }
  } else if (bonusFood && newHead.x === bonusFood.x && newHead.y === bonusFood.y) {
    // ボーナスアイテムを食べた！
    score += bonusFood.score;
    isAteFood = true;
    createEatParticles(bonusFood.x, bonusFood.y, bonusFood.color);
    bonusFood = null;
  }

  // 7. 【キュー操作：エサを食べていなければ末尾を削除 (pop)】
  if (!isAteFood) {
    snake.pop(); // 体を伸ばさない（前進のみ）
  }

  // 8. ボーナスタイマーの減衰
  if (bonusFood) {
    bonusTimer--;
    if (bonusTimer <= 0) {
      bonusFood = null;
    }
  }

  // 9. パーティクルの更新
  particles.forEach(p => p.update());
  particles = particles.filter(p => p.alpha > 0);

  // UI更新
  scoreDisplay.textContent = score;
  lengthDisplay.textContent = snake.length;
}

// ==========================================
// 8. エサのスポーン処理（空きマス探索）
// ==========================================
function spawnFood() {
  const emptyCells = [];

  for (let x = 0; x < GRID_COUNT; x++) {
    for (let y = 0; y < GRID_COUNT; y++) {
      // ヘビの体節が存在しないマスをリストアップ
      const isOccupied = snake.some(seg => seg.x === x && seg.y === y);
      if (!isOccupied) {
        emptyCells.push({ x, y });
      }
    }
  }

  if (emptyCells.length > 0) {
    const randomIndex = Math.floor(Math.random() * emptyCells.length);
    food = {
      ...emptyCells[randomIndex],
      icon: "🍎"
    };
  }
}

// ボーナスアイテムのスポーン
function spawnBonusFood() {
  const emptyCells = [];
  for (let x = 0; x < GRID_COUNT; x++) {
    for (let y = 0; y < GRID_COUNT; y++) {
      const isOccupied =
        snake.some(seg => seg.x === x && seg.y === y) ||
        (food && food.x === x && food.y === y);
      if (!isOccupied) emptyCells.push({ x, y });
    }
  }

  if (emptyCells.length > 0) {
    const randomIndex = Math.floor(Math.random() * emptyCells.length);
    const isGold = Math.random() < 0.4;
    bonusFood = {
      ...emptyCells[randomIndex],
      icon: isGold ? "🌟" : "🍓",
      score: isGold ? 50 : 30,
      color: isGold ? "#fbbf24" : "#f43f5e"
    };
    bonusTimer = 60; // 約6〜7秒間出現
  }
}

// ==========================================
// 9. 描画処理 (Draw)
// ==========================================
function draw() {
  // 1. 画面クリア
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // 2. グリッド背景の描画
  drawGrid();

  // 3. エサ・アイテムの描画
  if (food) drawItem(food);
  if (bonusFood) drawBonusItem(bonusFood);

  // 4. パーティクルの描画
  particles.forEach(p => p.draw());

  // 5. ヘビの描画
  drawSnake();
}

// 方眼紙風グリッドの描画
function drawGrid() {
  ctx.strokeStyle = "rgba(30, 41, 59, 0.35)";
  ctx.lineWidth = 1;

  for (let i = 0; i <= GRID_COUNT; i++) {
    ctx.beginPath();
    ctx.moveTo(i * GRID_SIZE, 0);
    ctx.lineTo(i * GRID_SIZE, canvas.height);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, i * GRID_SIZE);
    ctx.lineTo(canvas.width, i * GRID_SIZE);
    ctx.stroke();
  }

  // Classicモード時の外枠の強調
  if (wallMode === "classic") {
    ctx.strokeStyle = "#334155";
    ctx.lineWidth = 3;
    ctx.strokeRect(1.5, 1.5, canvas.width - 3, canvas.height - 3);
  }
}

// ヘビの描画（頭と滑らかなグラデーション胴体）
function drawSnake() {
  snake.forEach((segment, index) => {
    const px = segment.x * GRID_SIZE;
    const py = segment.y * GRID_SIZE;
    const isHead = index === 0;

    ctx.save();

    if (isHead) {
      // 【頭部】：鮮やかなネオングリーン
      ctx.fillStyle = "#34d399";
      ctx.shadowColor = "#34d399";
      ctx.shadowBlur = 10;
      drawRoundedCell(px + 1, py + 1, GRID_SIZE - 2, 8);

      // 目を描く
      drawSnakeEyes(px, py, currentDirection);
    } else {
      // 【胴体】：尻尾に向かって徐々に暗くなるグラデーション
      const ratio = 1 - (index / snake.length) * 0.5;
      ctx.fillStyle = `rgba(16, 185, 129, ${ratio})`;
      drawRoundedCell(px + 2, py + 2, GRID_SIZE - 4, 6);
    }

    ctx.restore();
  });
}

// ヘビの目を描くヘルパー
function drawSnakeEyes(px, py, dir) {
  ctx.fillStyle = "#022c22";
  const size = 3;
  let eye1 = { x: px + 6, y: py + 6 };
  let eye2 = { x: px + 18, y: py + 6 };

  if (dir === "RIGHT") {
    eye1 = { x: px + 17, y: py + 6 };
    eye2 = { x: px + 17, y: py + 18 };
  } else if (dir === "LEFT") {
    eye1 = { x: px + 7, y: py + 6 };
    eye2 = { x: px + 7, y: py + 18 };
  } else if (dir === "DOWN") {
    eye1 = { x: px + 6, y: py + 17 };
    eye2 = { x: px + 18, y: py + 17 };
  }

  ctx.beginPath();
  ctx.arc(eye1.x, eye1.y, size, 0, Math.PI * 2);
  ctx.arc(eye2.x, eye2.y, size, 0, Math.PI * 2);
  ctx.fill();
}

// 角丸セルの描画フォールバック
function drawRoundedCell(x, y, size, radius) {
  ctx.beginPath();
  if (ctx.roundRect) {
    ctx.roundRect(x, y, size, size, radius);
  } else {
    ctx.rect(x, y, size, size);
  }
  ctx.fill();
}

// エサの描画
function drawItem(item) {
  const cx = item.x * GRID_SIZE + GRID_SIZE / 2;
  const cy = item.y * GRID_SIZE + GRID_SIZE / 2;

  ctx.save();
  ctx.font = "18px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(item.icon, cx, cy);
  ctx.restore();
}

// ボーナスエサの描画（点滅エフェクト）
function drawBonusItem(item) {
  const cx = item.x * GRID_SIZE + GRID_SIZE / 2;
  const cy = item.y * GRID_SIZE + GRID_SIZE / 2;

  ctx.save();
  // 残り時間が少なくなったら点滅
  if (bonusTimer < 20 && Math.floor(bonusTimer / 3) % 2 === 0) {
    ctx.globalAlpha = 0.4;
  }
  ctx.shadowColor = item.color;
  ctx.shadowBlur = 12;
  ctx.font = "20px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(item.icon, cx, cy);
  ctx.restore();
}

// ==========================================
// 10. パーティクル
// ==========================================
class Particle {
  constructor(x, y, color) {
    this.x = x;
    this.y = y;
    this.color = color;
    this.radius = Math.random() * 2.5 + 1.5;
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 3 + 1;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.alpha = 1;
    this.decay = Math.random() * 0.04 + 0.03;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.alpha -= this.decay;
  }

  draw() {
    ctx.save();
    ctx.globalAlpha = Math.max(0, this.alpha);
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = this.color;
    ctx.fill();
    ctx.restore();
  }
}

function createEatParticles(gridX, gridY, color) {
  const px = gridX * GRID_SIZE + GRID_SIZE / 2;
  const py = gridY * GRID_SIZE + GRID_SIZE / 2;
  for (let i = 0; i < 14; i++) {
    particles.push(new Particle(px, py, color));
  }
}

// ==========================================
// 11. 方向転換と入力バッファ（逆走防止）
// ==========================================
function setDirection(newDir) {
  // 現在の方向の真逆（180度ターン）は入力拒否して自滅を防ぐ
  if (DIRECTIONS[currentDirection].opposite !== newDir) {
    nextDirection = newDir;
  }
}

// ==========================================
// 12. ゲームオーバー処理
// ==========================================
function handleGameOver(reason) {
  isRunning = false;

  // 自滅パーティクル生成
  snake.forEach(seg => {
    createEatParticles(seg.x, seg.y, "#34d399");
  });
  draw();

  const isNewRecord = checkAndUpdateBestScore();

  gameoverReason.textContent = reason;
  finalScoreEl.textContent = score;
  finalLengthEl.textContent = snake.length;

  if (isNewRecord) {
    newRecordBadge.classList.remove("hidden");
  } else {
    newRecordBadge.classList.add("hidden");
  }

  gameoverOverlay.classList.remove("hidden");
}

// ==========================================
// 13. イベントリスナー（キーボード・スワイプ・D-Pad・実機対策）
// ==========================================

// キーボード操作
window.addEventListener("keydown", (e) => {
  switch (e.code) {
    case "ArrowUp":
    case "KeyW":
      setDirection("UP");
      e.preventDefault();
      break;
    case "ArrowDown":
    case "KeyS":
      setDirection("DOWN");
      e.preventDefault();
      break;
    case "ArrowLeft":
    case "KeyA":
      setDirection("LEFT");
      e.preventDefault();
      break;
    case "ArrowRight":
    case "KeyD":
      setDirection("RIGHT");
      e.preventDefault();
      break;
    case "KeyP":
      if (isRunning) isPaused = !isPaused;
      break;
  }
});

// バーチャル十字キー（D-Pad）操作
dpadButtons.forEach(btn => {
  btn.addEventListener("touchstart", (e) => {
    e.preventDefault();
    const dir = btn.dataset.dir;
    if (dir) setDirection(dir);
  }, { passive: false });

  btn.addEventListener("mousedown", (e) => {
    e.preventDefault();
    const dir = btn.dataset.dir;
    if (dir) setDirection(dir);
  });
});

// タッチスワイプ（Swipe Detection）
let touchStartX = 0;
let touchStartY = 0;

canvas.addEventListener("touchstart", (e) => {
  e.preventDefault();
  if (e.touches.length > 0) {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
  }
}, { passive: false });

canvas.addEventListener("touchmove", (e) => {
  e.preventDefault(); // スクロール防止
}, { passive: false });

canvas.addEventListener("touchend", (e) => {
  e.preventDefault();
  if (e.changedTouches.length === 0) return;

  const touchEndX = e.changedTouches[0].clientX;
  const touchEndY = e.changedTouches[0].clientY;

  const dx = touchEndX - touchStartX;
  const dy = touchEndY - touchStartY;
  const minSwipeDistance = 25; // 最小スワイプ移動量

  if (Math.abs(dx) > Math.abs(dy)) {
    // 左右スワイプ
    if (Math.abs(dx) > minSwipeDistance) {
      if (dx > 0) setDirection("RIGHT");
      else setDirection("LEFT");
    }
  } else {
    // 上下スワイプ
    if (Math.abs(dy) > minSwipeDistance) {
      if (dy > 0) setDirection("DOWN");
      else setDirection("UP");
    }
  }
}, { passive: false });

// モード切り替え（Classic / Wrap）
modeButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    if (isRunning) return;
    modeButtons.forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    wallMode = btn.dataset.wall;
    loadBestScore();
    draw();
  });
});

// 速度切り替え（Slow / Normal / Fast）
speedButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    if (isRunning) return;
    speedButtons.forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    currentSpeed = btn.dataset.speed;
  });
});

// スタート / リトライボタン
startBtn.addEventListener("click", startGame);
restartBtn.addEventListener("click", startGame);

// ==========================================
// 14. 初期実行
// ==========================================
loadBestScore();
initGame();
draw();


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
