/**
 * ========================================================
 * 07 ドット避けゲーム (Dodge the Dots) - JavaScript
 * ========================================================
 * このファイルでは、以下の本格ゲームプログラミング知識を学びます：
 * 1. HTML5 Canvas 2D描画APIの基礎 (clearRect, arc, fillRect, shadowBlur)
 * 2. 王道ゲームループ (requestAnimationFrame -> update -> draw)
 * 3. キーボード同時押しによる滑らかな2D移動
 * 4. オブジェクト配列の生成・更新・画面外破棄 (メモリ管理)
 * 5. 2点間の距離による円の衝突判定 (Math.hypot)
 * 6. パーティクルシステムによる爆発エフェクト
 * 7. 時間経過に応じた難易度カーブとLocalStorage保存
 */

// ==========================================
// 1. Canvasの初期化とコンテキスト取得
// ==========================================
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// ゲーム画面の仮想解像度
const CANVAS_WIDTH = canvas.width;
const CANVAS_HEIGHT = canvas.height;

// ==========================================
// 2. DOM要素の取得
// ==========================================
const scoreDisplay = document.getElementById("score-display");
const timeDisplay = document.getElementById("time-display");
const shieldDisplay = document.getElementById("shield-display");
const bestScoreDisplay = document.getElementById("best-score-display");
const startOverlay = document.getElementById("start-overlay");
const gameoverOverlay = document.getElementById("gameover-overlay");
const startBtn = document.getElementById("start-btn");
const restartBtn = document.getElementById("restart-btn");
const finalScoreEl = document.getElementById("final-score");
const finalTimeEl = document.getElementById("final-time");
const newRecordBadge = document.getElementById("new-record-badge");

// ==========================================
// 3. 入力管理（キーボード＆マウス）
// ==========================================
const keys = {
  ArrowUp: false,
  ArrowDown: false,
  ArrowLeft: false,
  ArrowRight: false,
  KeyW: false,
  KeyS: false,
  KeyA: false,
  KeyD: false
};

// マウス/タッチ操作用
let mouseTarget = null;

// ==========================================
// 4. ゲームの状態変数
// ==========================================
let isRunning = false;
let isPaused = false;
let score = 0;
let survivalTime = 0;
let lastTimestamp = 0;
let bestScore = 0;

// エンティティ（ゲーム内オブジェクト）配列
let player = null;
let enemies = [];
let items = [];
let particles = [];

// スポーンタイマー
let enemySpawnTimer = 0;
let enemySpawnInterval = 60; // フレーム単位のスポーン間隔（徐々に短くなる）
let itemSpawnTimer = 0;

// ==========================================
// 5. クラス定義（プレイヤー・敵・アイテム・パーティクル）
// ==========================================

/**
 * プレイヤー（自機）クラス
 */
class Player {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.radius = 12;
    this.speed = 4.5;
    this.color = "#38bdf8";
    this.hasShield = false;
    this.trail = []; // 残像エフェクト用
  }

  update() {
    // 1. キーボード移動入力の処理
    let dx = 0;
    let dy = 0;

    if (keys.ArrowUp || keys.KeyW) dy -= 1;
    if (keys.ArrowDown || keys.KeyS) dy += 1;
    if (keys.ArrowLeft || keys.KeyA) dx -= 1;
    if (keys.ArrowRight || keys.KeyD) dx += 1;

    // 斜め移動時の速度補正（正規化）
    if (dx !== 0 && dy !== 0) {
      dx *= 0.7071; // 1 / sqrt(2)
      dy *= 0.7071;
    }

    if (dx !== 0 || dy !== 0) {
      this.x += dx * this.speed;
      this.y += dy * this.speed;
      mouseTarget = null; // キーボード操作時はマウスターゲットを解除
    } else if (mouseTarget) {
      // マウス/タッチ追従移動
      const dist = Math.hypot(mouseTarget.x - this.x, mouseTarget.y - this.y);
      if (dist > 4) {
        const angle = Math.atan2(mouseTarget.y - this.y, mouseTarget.x - this.x);
        this.x += Math.cos(angle) * Math.min(this.speed, dist);
        this.y += Math.sin(angle) * Math.min(this.speed, dist);
      }
    }

    // 2. 画面外にはみ出さない壁判定（クランプ）
    this.x = Math.max(this.radius, Math.min(CANVAS_WIDTH - this.radius, this.x));
    this.y = Math.max(this.radius, Math.min(CANVAS_HEIGHT - this.radius, this.y));

    // 3. 残像（トレイル）の記録
    this.trail.unshift({ x: this.x, y: this.y });
    if (this.trail.length > 5) {
      this.trail.pop();
    }
  }

  draw() {
    // 残像の描画
    this.trail.forEach((pos, index) => {
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, this.radius * (1 - index * 0.15), 0, Math.PI * 2);
      ctx.fillStyle = `rgba(56, 189, 248, ${0.3 - index * 0.05})`;
      ctx.fill();
    });

    // プレイヤー本体の描画（ネオングロー）
    ctx.save();
    ctx.shadowBlur = 15;
    ctx.shadowColor = this.color;

    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = this.color;
    ctx.fill();

    // シールド発動中のバリア円
    if (this.hasShield) {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius + 6, 0, Math.PI * 2);
      ctx.strokeStyle = "#10b981";
      ctx.lineWidth = 2.5;
      ctx.shadowColor = "#10b981";
      ctx.shadowBlur = 12;
      ctx.stroke();
    }

    ctx.restore();
  }
}

/**
 * 敵（赤いドット）クラス
 */
class Enemy {
  constructor(speedMultiplier) {
    this.radius = Math.random() * 5 + 6; // 半径 6〜11px
    this.speed = (Math.random() * 2 + 2.5) * speedMultiplier;
    this.color = "#f43f5e";

    // 画面外の4辺（上・下・左・右）のいずれかからスポーン
    const side = Math.floor(Math.random() * 4);
    let targetX = Math.random() * CANVAS_WIDTH;
    let targetY = Math.random() * CANVAS_HEIGHT;

    if (side === 0) { // 上から
      this.x = Math.random() * CANVAS_WIDTH;
      this.y = -this.radius;
    } else if (side === 1) { // 右から
      this.x = CANVAS_WIDTH + this.radius;
      this.y = Math.random() * CANVAS_HEIGHT;
    } else if (side === 2) { // 下から
      this.x = Math.random() * CANVAS_WIDTH;
      this.y = CANVAS_HEIGHT + this.radius;
    } else { // 左から
      this.x = -this.radius;
      this.y = Math.random() * CANVAS_HEIGHT;
    }

    // 画面内の中央付近に向かって進む角度を計算
    const angle = Math.atan2(targetY - this.y, targetX - this.x);
    this.vx = Math.cos(angle) * this.speed;
    this.vy = Math.sin(angle) * this.speed;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
  }

  draw() {
    ctx.save();
    ctx.shadowBlur = 8;
    ctx.shadowColor = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = this.color;
    ctx.fill();
    ctx.restore();
  }

  // 画面外に出たかどうかの判定
  isOffscreen() {
    const margin = 50;
    return (
      this.x < -margin ||
      this.x > CANVAS_WIDTH + margin ||
      this.y < -margin ||
      this.y > CANVAS_HEIGHT + margin
    );
  }
}

/**
 * アイテム（星 / シールド）クラス
 */
class Item {
  constructor(type) {
    this.type = type; // "star" | "shield"
    this.radius = 10;
    this.x = Math.random() * (CANVAS_WIDTH - 60) + 30;
    this.y = Math.random() * (CANVAS_HEIGHT - 60) + 30;
    this.life = 400; // 一定時間で消滅するカウント
    this.pulse = 0;
  }

  update() {
    this.life--;
    this.pulse += 0.08;
  }

  draw() {
    const scale = 1 + Math.sin(this.pulse) * 0.15;
    ctx.save();
    ctx.font = `${18 * scale}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    if (this.type === "star") {
      ctx.shadowBlur = 12;
      ctx.shadowColor = "#fbbf24";
      ctx.fillText("🌟", this.x, this.y);
    } else {
      ctx.shadowBlur = 12;
      ctx.shadowColor = "#10b981";
      ctx.fillText("🛡️", this.x, this.y);
    }
    ctx.restore();
  }
}

/**
 * パーティクル（爆発火花）クラス
 */
class Particle {
  constructor(x, y, color) {
    this.x = x;
    this.y = y;
    this.color = color;
    this.radius = Math.random() * 3 + 2;
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 6 + 2;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.alpha = 1;
    this.decay = Math.random() * 0.03 + 0.02; // 透明化の減衰速度
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

// ==========================================
// 6. ベスト記録の読み込みと保存 (LocalStorage)
// ==========================================
function loadBestScore() {
  const saved = localStorage.getItem("dot_dodge_best_score");
  if (saved !== null) {
    bestScore = parseInt(saved, 10);
    bestScoreDisplay.textContent = bestScore;
  }
}

function checkAndUpdateBestScore() {
  if (score > bestScore) {
    bestScore = score;
    localStorage.setItem("dot_dodge_best_score", bestScore);
    bestScoreDisplay.textContent = bestScore;
    return true; // 新記録
  }
  return false;
}

// ==========================================
// 7. ゲームの初期化と開始
// ==========================================
function initGame() {
  player = new Player(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
  enemies = [];
  items = [];
  particles = [];

  score = 0;
  survivalTime = 0;
  enemySpawnTimer = 0;
  enemySpawnInterval = 60;
  itemSpawnTimer = 0;
  mouseTarget = null;

  scoreDisplay.textContent = "0";
  timeDisplay.textContent = "0.0s";
  updateShieldUI();
  loadBestScore();
}

function startGame() {
  initGame();
  startOverlay.classList.add("hidden");
  gameoverOverlay.classList.add("hidden");

  isRunning = true;
  isPaused = false;
  lastTimestamp = performance.now();
  requestAnimationFrame(gameLoop);
}

// ==========================================
// 8. メインゲームループ (Game Loop)
// ==========================================
function gameLoop(timestamp) {
  if (!isRunning) return;

  const deltaTime = (timestamp - lastTimestamp) / 1000;
  lastTimestamp = timestamp;

  if (!isPaused) {
    update(deltaTime);
  }
  draw();

  requestAnimationFrame(gameLoop);
}

// ==========================================
// 9. 状態更新処理 (Update)
// ==========================================
function update(dt) {
  // 1. 生存時間とスコアの加算（生きているだけで毎秒スコア獲得）
  survivalTime += dt;
  score += Math.round(dt * 10);

  timeDisplay.textContent = `${survivalTime.toFixed(1)}s`;
  scoreDisplay.textContent = score;

  // 2. プレイヤーの更新
  player.update();

  // 3. 難易度カーブ（時間経過で敵の速度・出現頻度アップ）
  const difficultyMultiplier = 1 + Math.min(2.5, survivalTime / 30); // 最大3.5倍
  enemySpawnInterval = Math.max(15, Math.round(60 / difficultyMultiplier));

  // 4. 敵のスポーン
  enemySpawnTimer++;
  if (enemySpawnTimer >= enemySpawnInterval) {
    enemySpawnTimer = 0;
    enemies.push(new Enemy(difficultyMultiplier));
  }

  // 5. 敵の更新と画面外削除
  enemies.forEach(enemy => enemy.update());
  enemies = enemies.filter(enemy => !enemy.isOffscreen());

  // 6. アイテムのスポーン（約10秒に1回）
  itemSpawnTimer++;
  if (itemSpawnTimer >= 600) {
    itemSpawnTimer = 0;
    const type = Math.random() < 0.6 ? "star" : "shield";
    items.push(new Item(type));
  }

  // 7. アイテムの更新と期限切れ削除
  items.forEach(item => item.update());
  items = items.filter(item => item.life > 0);

  // 8. アイテムとの接触判定（円の当たり判定）
  items.forEach((item, index) => {
    const dist = Math.hypot(player.x - item.x, player.y - item.y);
    if (dist < player.radius + item.radius + 6) {
      // アイテム取得！
      if (item.type === "star") {
        score += 150; // ボーナススコア
        createParticles(item.x, item.y, "#fbbf24", 12);
      } else if (item.type === "shield") {
        player.hasShield = true;
        updateShieldUI();
        createParticles(item.x, item.y, "#10b981", 15);
      }
      items.splice(index, 1);
    }
  });

  // 9. 敵との衝突判定 (Collision Detection)
  for (let i = enemies.length - 1; i >= 0; i--) {
    const enemy = enemies[i];
    const dist = Math.hypot(player.x - enemy.x, player.y - enemy.y);

    if (dist < player.radius + enemy.radius) {
      if (player.hasShield) {
        // シールドで防御！
        player.hasShield = false;
        updateShieldUI();
        createParticles(enemy.x, enemy.y, "#10b981", 20);
        enemies.splice(i, 1); // ぶつかった敵を消滅
      } else {
        // 【被弾・ゲームオーバー！】
        handleGameOver();
        return;
      }
    }
  }

  // 10. パーティクルの更新と減衰削除
  particles.forEach(p => p.update());
  particles = particles.filter(p => p.alpha > 0);
}

// ==========================================
// 10. 描画処理 (Draw / Render)
// ==========================================
function draw() {
  // 1. 画面のクリア
  ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  // 2. 背景グリッド線の描画（サイバー感の演出）
  drawBackgroundGrid();

  // 3. アイテムの描画
  items.forEach(item => item.draw());

  // 4. 敵の描画
  enemies.forEach(enemy => enemy.draw());

  // 5. パーティクルの描画
  particles.forEach(p => p.draw());

  // 6. プレイヤーの描画
  if (player) {
    player.draw();
  }
}

// 背景のサイバーグリッドを描画
function drawBackgroundGrid() {
  ctx.strokeStyle = "rgba(30, 41, 59, 0.4)";
  ctx.lineWidth = 1;
  const gridSize = 40;

  for (let x = 0; x < CANVAS_WIDTH; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, CANVAS_HEIGHT);
    ctx.stroke();
  }

  for (let y = 0; y < CANVAS_HEIGHT; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(CANVAS_WIDTH, y);
    ctx.stroke();
  }
}

// パーティクル（爆発）を生成
function createParticles(x, y, color, count = 20) {
  for (let i = 0; i < count; i++) {
    particles.push(new Particle(x, y, color));
  }
}

// シールドUIの更新
function updateShieldUI() {
  if (player && player.hasShield) {
    shieldDisplay.textContent = "ON 🛡️";
    shieldDisplay.className = "hud-value shield-on";
  } else {
    shieldDisplay.textContent = "OFF";
    shieldDisplay.className = "hud-value shield-off";
  }
}

// ==========================================
// 11. ゲームオーバー処理
// ==========================================
function handleGameOver() {
  isRunning = false;

  // 爆発パーティクル生成
  createParticles(player.x, player.y, "#f43f5e", 40);
  createParticles(player.x, player.y, "#38bdf8", 30);
  draw(); // 最後のフレームを描画

  const isNewRecord = checkAndUpdateBestScore();

  finalScoreEl.textContent = score;
  finalTimeEl.textContent = survivalTime.toFixed(1);

  if (isNewRecord) {
    newRecordBadge.classList.remove("hidden");
  } else {
    newRecordBadge.classList.add("hidden");
  }

  gameoverOverlay.classList.remove("hidden");
}

// ==========================================
// 12. イベントリスナーの設定
// ==========================================

// キーボード入力（押下・離脱）
window.addEventListener("keydown", (e) => {
  if (keys.hasOwnProperty(e.code)) {
    keys[e.code] = true;
    e.preventDefault();
  }

  // ポーズ切り替え (Pキー)
  if (e.code === "KeyP" && isRunning) {
    isPaused = !isPaused;
  }
});

window.addEventListener("keyup", (e) => {
  if (keys.hasOwnProperty(e.code)) {
    keys[e.code] = false;
    e.preventDefault();
  }
});

// マウス/タッチによる自機追従操作
function handlePointerMove(e) {
  if (!isRunning) return;
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;

  const clientX = e.touches ? e.touches[0].clientX : e.clientX;
  const clientY = e.touches ? e.touches[0].clientY : e.clientY;

  mouseTarget = {
    x: (clientX - rect.left) * scaleX,
    y: (clientY - rect.top) * scaleY
  };
}

// マウスイベント
canvas.addEventListener("mousemove", handlePointerMove);

// タッチイベント（実機での画面スクロールを完全に防止）
canvas.addEventListener("touchstart", (e) => {
  e.preventDefault(); // スクロール防止
  handlePointerMove(e);
}, { passive: false });

canvas.addEventListener("touchmove", (e) => {
  e.preventDefault(); // スクロール防止
  handlePointerMove(e);
}, { passive: false });

canvas.addEventListener("touchend", (e) => {
  e.preventDefault();
}, { passive: false });

// ボタン
startBtn.addEventListener("click", startGame);
restartBtn.addEventListener("click", startGame);

// ==========================================
// 13. 初期実行（初期画面の描画）
// ==========================================
loadBestScore();
player = new Player(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
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
