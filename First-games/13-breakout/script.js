/**
 * ========================================================
 * 13 ブロック崩し (Breakout) - JavaScript
 * ========================================================
 * このファイルでは、以下の重要プログラミング知識を学びます：
 * 1. 2次元配列によるブロックマップの生成・HP耐久度管理
 * 2. 精密な2D反射物理とパドル打点による角度計算
 * 3. 衝突面の特定アルゴリズム（上下反転 vs 左右反転）
 * 4. アイテムドロップ＆時限性パワーアップ状態管理 (Power-ups)
 * 5. マルチボール配列管理（すべてのボールが落ちた時にミス判定）
 * 6. 浮遊スコアテキスト (Floating Text) とコンボ倍率
 * 7. スマホ実機タッチ操作時のスクロール完全防止
 */

// ==========================================
// 1. Canvasの初期化と定数設定
// ==========================================
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const CANVAS_WIDTH = canvas.width;   // 400
const CANVAS_HEIGHT = canvas.height; // 500

const BLOCK_ROWS = 5;
const BLOCK_COLS = 8;
const BLOCK_WIDTH = 42;
const BLOCK_HEIGHT = 16;
const BLOCK_PADDING = 6;
const BLOCK_OFFSET_TOP = 40;
const BLOCK_OFFSET_LEFT = 11;

// ==========================================
// 2. DOM要素の取得
// ==========================================
const scoreDisplay = document.getElementById("score-display");
const comboDisplay = document.getElementById("combo-display");
const livesDisplay = document.getElementById("lives-display");
const bestScoreDisplay = document.getElementById("best-score-display");
const buffIndicator = document.getElementById("buff-indicator");
const buffText = document.getElementById("buff-text");
const startOverlay = document.getElementById("start-overlay");
const clearOverlay = document.getElementById("clear-overlay");
const gameoverOverlay = document.getElementById("gameover-overlay");
const startBtn = document.getElementById("start-btn");
const restartClearBtn = document.getElementById("restart-clear-btn");
const restartBtn = document.getElementById("restart-btn");
const clearScoreEl = document.getElementById("clear-score");
const clearComboEl = document.getElementById("clear-combo");
const finalScoreEl = document.getElementById("final-score");
const finalComboEl = document.getElementById("final-combo");
const newRecordBadge = document.getElementById("new-record-badge");

// ==========================================
// 3. ゲームの状態変数
// ==========================================
let isRunning = false;
let score = 0;
let lives = 3;
let combo = 0;
let maxCombo = 0;
let bestScore = 0;

// エンティティ
let paddle = null;
let balls = [];
let blocks = [];
let items = [];
let particles = [];
let floatingTexts = [];

// パワーアップ状態
let activeBuff = null;     // "wide" | "slow"
let buffTimer = 0;         // バフ残りフレーム数

// キーボード入力管理
const keys = {
  ArrowLeft: false,
  ArrowRight: false,
  KeyA: false,
  KeyD: false
};

// ==========================================
// 4. クラス定義
// ==========================================

/**
 * パドル（ラケット）クラス
 */
class Paddle {
  constructor() {
    this.baseWidth = 75;
    this.width = this.baseWidth;
    this.height = 12;
    this.x = (CANVAS_WIDTH - this.width) / 2;
    this.y = CANVAS_HEIGHT - 35;
    this.speed = 7.0;
    this.color = "#818cf8";
  }

  update() {
    // キーボード操作
    if (keys.ArrowLeft || keys.KeyA) this.x -= this.speed;
    if (keys.ArrowRight || keys.KeyD) this.x += this.speed;

    // 壁判定
    this.x = Math.max(0, Math.min(CANVAS_WIDTH - this.width, this.x));
  }

  draw() {
    ctx.save();
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 10;
    ctx.fillStyle = this.color;
    drawRoundedRect(this.x, this.y, this.width, this.height, 6);

    // パドルのハイライトライン
    ctx.fillStyle = "#ffffff";
    drawRoundedRect(this.x + 4, this.y + 2, this.width - 8, 3, 2);
    ctx.restore();
  }
}

/**
 * ボールクラス
 */
class Ball {
  constructor(x, y, vx, vy) {
    this.radius = 6;
    this.x = x || CANVAS_WIDTH / 2;
    this.y = y || CANVAS_HEIGHT - 50;
    this.baseSpeed = 5.2;
    this.speed = this.baseSpeed;
    this.trail = [];

    if (vx !== undefined && vy !== undefined) {
      this.vx = vx;
      this.vy = vy;
    } else {
      // 初期発射（斜め上45度前後）
      const angle = (Math.random() * 0.4 - 0.2 - 0.5) * Math.PI; // -70度〜-110度
      this.vx = Math.cos(angle) * this.speed;
      this.vy = Math.sin(angle) * this.speed;
    }
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;

    // 残像トレイル
    this.trail.unshift({ x: this.x, y: this.y });
    if (this.trail.length > 5) this.trail.pop();

    // 左右の壁反射
    if (this.x - this.radius <= 0) {
      this.x = this.radius;
      this.vx = Math.abs(this.vx);
    } else if (this.x + this.radius >= CANVAS_WIDTH) {
      this.x = CANVAS_WIDTH - this.radius;
      this.vx = -Math.abs(this.vx);
    }

    // 上壁反射
    if (this.y - this.radius <= 0) {
      this.y = this.radius;
      this.vy = Math.abs(this.vy);
    }
  }

  draw() {
    // 残像
    this.trail.forEach((pos, idx) => {
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, this.radius * (1 - idx * 0.15), 0, Math.PI * 2);
      ctx.fillStyle = `rgba(244, 114, 182, ${0.4 - idx * 0.08})`;
      ctx.fill();
    });

    // ボール本体
    ctx.save();
    ctx.shadowColor = "#f472b6";
    ctx.shadowBlur = 10;
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

/**
 * ブロッククラス
 */
class Block {
  constructor(x, y, row) {
    this.x = x;
    this.y = y;
    this.width = BLOCK_WIDTH;
    this.height = BLOCK_HEIGHT;
    this.alive = true;

    // 行ごとにHPと色を設定
    if (row === 0) {
      this.maxHp = 3; // 🟦 メタル（青）
      this.hp = 3;
      this.baseScore = 80;
      this.color = "#3b82f6";
    } else if (row === 1) {
      this.maxHp = 2; // 🟩 ハード（緑）
      this.hp = 2;
      this.baseScore = 50;
      this.color = "#22c55e";
    } else if (row === 2) {
      this.maxHp = 1; // 🟨 黄
      this.hp = 1;
      this.baseScore = 30;
      this.color = "#eab308";
    } else if (row === 3) {
      this.maxHp = 1; // 🟧 橙
      this.hp = 1;
      this.baseScore = 20;
      this.color = "#f97316";
    } else {
      this.maxHp = 1; // 🟥 赤
      this.hp = 1;
      this.baseScore = 10;
      this.color = "#ef4444";
    }
  }

  hit() {
    this.hp--;
    if (this.hp <= 0) {
      this.alive = false;
      return true; // 破壊された
    }
    return false; // ダメージのみ
  }

  draw() {
    if (!this.alive) return;

    ctx.save();
    ctx.fillStyle = this.color;
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 4;
    drawRoundedRect(this.x, this.y, this.width, this.height, 4);

    // HP減少時のヒビ割れ演出
    if (this.hp < this.maxHp) {
      ctx.strokeStyle = "rgba(255, 255, 255, 0.7)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(this.x + 8, this.y + 4);
      ctx.lineTo(this.x + 20, this.y + 12);
      ctx.lineTo(this.x + 32, this.y + 5);
      ctx.stroke();
    }

    // 光沢ハイライト
    ctx.fillStyle = "rgba(255, 255, 255, 0.25)";
    ctx.fillRect(this.x + 2, this.y + 2, this.width - 4, 3);
    ctx.restore();
  }
}

/**
 * アイテムカプセルクラス
 */
class Item {
  constructor(x, y, type) {
    this.x = x;
    this.y = y;
    this.width = 24;
    this.height = 14;
    this.vy = 2.2;
    this.type = type; // "wide" | "multi" | "slow" | "life"

    if (type === "wide") { this.icon = "↔️"; this.color = "#a855f7"; }
    if (type === "multi") { this.icon = "⚽"; this.color = "#38bdf8"; }
    if (type === "slow") { this.icon = "⏳"; this.color = "#f59e0b"; }
    if (type === "life") { this.icon = "❤️"; this.color = "#ef4444"; }
  }

  update() {
    this.y += this.vy;
  }

  draw() {
    ctx.save();
    ctx.fillStyle = this.color;
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 8;
    drawRoundedRect(this.x, this.y, this.width, this.height, 7);

    ctx.font = "10px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(this.icon, this.x + this.width / 2, this.y + this.height / 2);
    ctx.restore();
  }
}

/**
 * 浮遊スコアテキスト
 */
class FloatingText {
  constructor(text, x, y, color) {
    this.text = text;
    this.x = x;
    this.y = y;
    this.color = color || "#ffffff";
    this.alpha = 1.0;
    this.vy = -1.6;
  }

  update() {
    this.y += this.vy;
    this.alpha -= 0.025;
  }

  draw() {
    ctx.save();
    ctx.globalAlpha = Math.max(0, this.alpha);
    ctx.font = "bold 13px sans-serif";
    ctx.fillStyle = this.color;
    ctx.textAlign = "center";
    ctx.fillText(this.text, this.x, this.y);
    ctx.restore();
  }
}

/**
 * パーティクル
 */
class Particle {
  constructor(x, y, color) {
    this.x = x;
    this.y = y;
    this.color = color;
    this.radius = Math.random() * 2.5 + 1.5;
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 3.5 + 1;
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

function drawRoundedRect(x, y, w, h, r) {
  ctx.beginPath();
  if (ctx.roundRect) {
    ctx.roundRect(x, y, w, h, r);
  } else {
    ctx.rect(x, y, w, h);
  }
  ctx.fill();
}

// ==========================================
// 5. ベスト記録の読み込みと保存 (LocalStorage)
// ==========================================
function loadBestScore() {
  const saved = localStorage.getItem("breakout_best_score");
  if (saved !== null) {
    bestScore = parseInt(saved, 10);
    bestScoreDisplay.textContent = bestScore;
  }
}

function checkAndUpdateBestScore() {
  if (score > bestScore) {
    bestScore = score;
    localStorage.setItem("breakout_best_score", bestScore);
    bestScoreDisplay.textContent = bestScore;
    return true; // 新記録
  }
  return false;
}

// ==========================================
// 6. ゲームの初期化と開始
// ==========================================
function createBlockGrid() {
  blocks = [];
  for (let r = 0; r < BLOCK_ROWS; r++) {
    for (let c = 0; c < BLOCK_COLS; c++) {
      const x = BLOCK_OFFSET_LEFT + c * (BLOCK_WIDTH + BLOCK_PADDING);
      const y = BLOCK_OFFSET_TOP + r * (BLOCK_HEIGHT + BLOCK_PADDING);
      blocks.push(new Block(x, y, r));
    }
  }
}

function initGame() {
  paddle = new Paddle();
  balls = [new Ball()];
  items = [];
  particles = [];
  floatingTexts = [];

  score = 0;
  lives = 3;
  combo = 0;
  maxCombo = 0;
  activeBuff = null;
  buffTimer = 0;

  scoreDisplay.textContent = "0";
  comboDisplay.textContent = "0x";
  updateLivesUI();
  buffIndicator.classList.add("hidden");

  createBlockGrid();
  loadBestScore();
}

function startGame() {
  initGame();
  startOverlay.classList.add("hidden");
  clearOverlay.classList.add("hidden");
  gameoverOverlay.classList.add("hidden");

  isRunning = true;
  requestAnimationFrame(gameLoop);
}

// ==========================================
// 7. メインゲームループ (Game Loop)
// ==========================================
function gameLoop() {
  if (!isRunning) return;

  update();
  draw();

  requestAnimationFrame(gameLoop);
}

// ==========================================
// 8. 状態更新処理 (Update)
// ==========================================
function update() {
  // 1. パドルの更新
  paddle.update();

  // 2. パワーアップバフタイマー
  if (buffTimer > 0) {
    buffTimer--;
    const seconds = Math.ceil(buffTimer / 60);
    if (activeBuff === "wide") buffText.textContent = `↔️ WIDE PADDLE (${seconds}s)`;
    if (activeBuff === "slow") buffText.textContent = `⏳ SLOW BALL (${seconds}s)`;

    if (buffTimer <= 0) {
      // バフ終了
      if (activeBuff === "wide") paddle.width = paddle.baseWidth;
      if (activeBuff === "slow") balls.forEach(b => b.speed = b.baseSpeed);
      activeBuff = null;
      buffIndicator.classList.add("hidden");
    }
  }

  // 3. ボールの更新＆パドル衝突判定
  balls.forEach(ball => {
    ball.update();

    // 【パドルとの衝突判定 & 打点角度コントロール】
    if (
      ball.vy > 0 &&
      ball.y + ball.radius >= paddle.y &&
      ball.y - ball.radius <= paddle.y + paddle.height &&
      ball.x >= paddle.x - ball.radius &&
      ball.x <= paddle.x + paddle.width + ball.radius
    ) {
      // めり込み防止（パドルの直上へ強制配置）
      ball.y = paddle.y - ball.radius - 1;

      // パドル中心からの衝突位置 (-1.0: 左端 〜 +1.0: 右端)
      const hitRatio = (ball.x - (paddle.x + paddle.width / 2)) / (paddle.width / 2);
      const normalizedRatio = Math.max(-1, Math.min(1, hitRatio));

      // 最大反射角 60度 (PI / 3)
      // 0: 真上, -1: 左上60度, +1: 右上60度
      const maxBounceAngle = Math.PI / 3;
      const bounceAngle = normalizedRatio * maxBounceAngle;

      ball.vx = Math.sin(bounceAngle) * ball.speed;
      ball.vy = -Math.cos(bounceAngle) * ball.speed; // 常に確実に上向き（負）！

      // パドルに当たったらコンボリセット
      combo = 0;
      comboDisplay.textContent = "0x";

      createHitParticles(ball.x, ball.y, paddle.color, 8);
    }
  });

  // 4. 【ボール vs ブロックの精密衝突判定】
  balls.forEach(ball => {
    blocks.forEach(block => {
      if (!block.alive) return;

      // AABB円矩形判定
      const closestX = Math.max(block.x, Math.min(ball.x, block.x + block.width));
      const closestY = Math.max(block.y, Math.min(ball.y, block.y + block.height));
      const dx = ball.x - closestX;
      const dy = ball.y - closestY;

      if (dx * dx + dy * dy < ball.radius * ball.radius) {
        // 衝突！ 侵入面の特定
        const prevX = ball.x - ball.vx;
        const prevY = ball.y - ball.vy;

        if (prevY <= block.y || prevY >= block.y + block.height) {
          ball.vy = -ball.vy; // 上下から衝突
        } else {
          ball.vx = -ball.vx; // 左右から衝突
        }

        // ブロックへダメージ
        const isDestroyed = block.hit();
        combo++;
        if (combo > maxCombo) maxCombo = combo;
        comboDisplay.textContent = `${combo}x`;

        // スコア加算（コンボ倍率適用）
        const earnedScore = block.baseScore * Math.min(combo, 5);
        score += earnedScore;
        scoreDisplay.textContent = score;

        floatingTexts.push(new FloatingText(`+${earnedScore}`, block.x + block.width / 2, block.y, block.color));
        createHitParticles(closestX, closestY, block.color, isDestroyed ? 14 : 6);

        // 破壊時に確率でアイテムドロップ (22%)
        if (isDestroyed && Math.random() < 0.22) {
          spawnItem(block.x + block.width / 2, block.y + block.height / 2);
        }
      }
    });
  });

  // 5. アイテムカプセルの更新＆パドルキャッチ判定
  items.forEach(item => {
    item.update();

    if (
      item.y + item.height >= paddle.y &&
      item.y <= paddle.y + paddle.height &&
      item.x + item.width >= paddle.x &&
      item.x <= paddle.x + paddle.width
    ) {
      // キャッチ！
      applyItemEffect(item.type);
      item.y = CANVAS_HEIGHT + 100; // 削除マーク
      floatingTexts.push(new FloatingText(`${item.icon} GET!`, paddle.x + paddle.width / 2, paddle.y - 10, item.color));
    }
  });
  items = items.filter(item => item.y < CANVAS_HEIGHT + 20);

  // 6. パーティクル・浮遊テキスト更新
  particles.forEach(p => p.update());
  particles = particles.filter(p => p.alpha > 0);

  floatingTexts.forEach(t => t.update());
  floatingTexts = floatingTexts.filter(t => t.alpha > 0);

  // 7. 【画面外（底面）へ落ちたボールの判定】
  balls = balls.filter(b => b.y - b.radius < CANVAS_HEIGHT);

  if (balls.length === 0) {
    // すべてのボールを失った
    lives--;
    updateLivesUI();

    if (lives <= 0) {
      handleGameOver();
    } else {
      // 1球再サーブ
      balls.push(new Ball());
      combo = 0;
      comboDisplay.textContent = "0x";
    }
  }

  // 8. 【全ブロック破壊判定（ステージクリア）】
  const remainingBlocks = blocks.filter(b => b.alive).length;
  if (remainingBlocks === 0) {
    handleStageClear();
  }
}

// アイテムのスポーン
function spawnItem(x, y) {
  const types = ["wide", "multi", "slow", "life"];
  const randType = types[Math.floor(Math.random() * types.length)];
  items.push(new Item(x - 12, y, randType));
}

// アイテム効果の適用
function applyItemEffect(type) {
  if (type === "wide") {
    paddle.width = paddle.baseWidth * 1.45;
    activeBuff = "wide";
    buffTimer = 600; // 10秒
    buffIndicator.classList.remove("hidden");
  } else if (type === "multi") {
    // 既存のボールから2つ分裂
    const baseBall = balls[0] || new Ball();
    balls.push(new Ball(baseBall.x, baseBall.y, baseBall.vx * 0.8 + 2, baseBall.vy));
    balls.push(new Ball(baseBall.x, baseBall.y, baseBall.vx * 0.8 - 2, baseBall.vy));
  } else if (type === "slow") {
    balls.forEach(b => b.speed = b.baseSpeed * 0.7);
    activeBuff = "slow";
    buffTimer = 480; // 8秒
    buffIndicator.classList.remove("hidden");
  } else if (type === "life") {
    if (lives < 5) lives++;
    updateLivesUI();
  }
}

function updateLivesUI() {
  let hearts = "";
  for (let i = 0; i < lives; i++) hearts += "❤️";
  livesDisplay.textContent = hearts || "💀";
}

function createHitParticles(x, y, color, count = 10) {
  for (let i = 0; i < count; i++) {
    particles.push(new Particle(x, y, color));
  }
}

function handleStageClear() {
  isRunning = false;
  score += 1500; // クリアボーナス
  scoreDisplay.textContent = score;
  checkAndUpdateBestScore();

  clearScoreEl.textContent = score;
  clearComboEl.textContent = maxCombo;
  clearOverlay.classList.remove("hidden");
}

function handleGameOver() {
  isRunning = false;
  const isNewRecord = checkAndUpdateBestScore();

  finalScoreEl.textContent = score;
  finalComboEl.textContent = maxCombo;

  if (isNewRecord) {
    newRecordBadge.classList.remove("hidden");
  } else {
    newRecordBadge.classList.add("hidden");
  }

  gameoverOverlay.classList.remove("hidden");
}

// ==========================================
// 9. 描画処理 (Draw)
// ==========================================
function draw() {
  // 1. 画面クリア
  ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  // 2. ブロックの描画
  blocks.forEach(b => b.draw());

  // 3. アイテムカプセルの描画
  items.forEach(i => i.draw());

  // 4. パーティクルの描画
  particles.forEach(p => p.draw());

  // 5. 浮遊テキストの描画
  floatingTexts.forEach(t => t.draw());

  // 6. パドルの描画
  if (paddle) paddle.draw();

  // 7. ボールの描画
  balls.forEach(b => b.draw());
}

// ==========================================
// 10. イベントリスナー（マウス・タッチドラッグ・キーボード）
// ==========================================

// キーボード
window.addEventListener("keydown", (e) => {
  if (keys.hasOwnProperty(e.code)) {
    keys[e.code] = true;
    e.preventDefault();
  }
});

window.addEventListener("keyup", (e) => {
  if (keys.hasOwnProperty(e.code)) {
    keys[e.code] = false;
    e.preventDefault();
  }
});

// マウス・タッチドラッグによるパドルダイレクト操作
function handlePointerMove(clientX) {
  if (!isRunning || !paddle) return;
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const targetX = (clientX - rect.left) * scaleX - paddle.width / 2;

  paddle.x = Math.max(0, Math.min(CANVAS_WIDTH - paddle.width, targetX));
}

canvas.addEventListener("mousemove", (e) => {
  handlePointerMove(e.clientX);
});

// タッチイベント（実機スクロール完全防止）
canvas.addEventListener("touchstart", (e) => {
  e.preventDefault();
  if (e.touches.length > 0) {
    handlePointerMove(e.touches[0].clientX);
  }
}, { passive: false });

canvas.addEventListener("touchmove", (e) => {
  e.preventDefault();
  if (e.touches.length > 0) {
    handlePointerMove(e.touches[0].clientX);
  }
}, { passive: false });

canvas.addEventListener("touchend", (e) => {
  e.preventDefault();
}, { passive: false });

// スタート・リトライボタン
startBtn.addEventListener("click", startGame);
restartClearBtn.addEventListener("click", startGame);
restartBtn.addEventListener("click", startGame);

// ==========================================
// 11. 初期実行
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
