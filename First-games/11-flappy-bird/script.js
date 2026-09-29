/**
 * ========================================================
 * 11 フロッピーバード風 (Flappy Bird) - JavaScript
 * ========================================================
 * このファイルでは、以下の重要プログラミング知識を学びます：
 * 1. 擬似重力 (Gravity) とワンタップ羽ばたきジャンプ力学
 * 2. 速度連動の回転アニメーション (Matrix Transform: translate / rotate)
 * 3. 上下の障害物（土管ペア）の自動生成・スクロール・画面外削除
 * 4. 円（鳥）と矩形（土管）の精密な衝突判定 (Circle vs Rect)
 * 5. パララックス（視差）背景の無限ループスクロール
 * 6. スコアに応じたメダル授与システム
 * 7. スマホ実機スクロール完全防止とLocalStorage保存
 */

// ==========================================
// 1. Canvasの初期化とコンテキスト取得
// ==========================================
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const CANVAS_WIDTH = canvas.width;   // 360
const CANVAS_HEIGHT = canvas.height; // 540
const GROUND_HEIGHT = 80;            // 地面の高さ (px)

// ==========================================
// 2. DOM要素の取得
// ==========================================
const scoreDisplay = document.getElementById("score-display");
const bestScoreDisplay = document.getElementById("best-score-display");
const startOverlay = document.getElementById("start-overlay");
const gameoverOverlay = document.getElementById("gameover-overlay");
const startBtn = document.getElementById("start-btn");
const restartBtn = document.getElementById("restart-btn");
const finalScoreEl = document.getElementById("final-score");
const finalBestEl = document.getElementById("final-best");
const resultMedal = document.getElementById("result-medal");
const newRecordBadge = document.getElementById("new-record-badge");

// ==========================================
// 3. ゲームの状態変数
// ==========================================
let isRunning = false;
let isDead = false;
let score = 0;
let bestScore = 0;
let frameCount = 0;

// エンティティ
let bird = null;
let pipes = [];
let particles = [];

// 背景スクロール用オフセット
let bgOffset = 0;
let groundOffset = 0;

// ==========================================
// 4. クラス定義（鳥・土管・パーティクル）
// ==========================================

/**
 * プレイヤークラス（鳥）
 */
class Bird {
  constructor() {
    this.x = 80;
    this.y = CANVAS_HEIGHT / 2 - 40;
    this.radius = 16;
    this.vy = 0;
    this.gravity = 0.35;       // 毎フレーム加算される下向きの加速度
    this.jumpForce = -6.5;     // タップ時の瞬間的な上向き速度
    this.maxFallSpeed = 9.0;   // 終端落下速度リミッター
    this.rotation = 0;         // 傾き角度（ラジアン）
    this.wingAnim = 0;         // 羽ばたきアニメーション用タイマー
  }

  // 羽ばたきジャンプ
  flap() {
    if (isDead) return;
    this.vy = this.jumpForce;
    createFlapParticles(this.x - 10, this.y + 10);
  }

  update() {
    // 1. 重力の適用
    this.vy += this.gravity;
    if (this.vy > this.maxFallSpeed) this.vy = this.maxFallSpeed;
    this.y += this.vy;

    // 2. 速度に応じた回転角の計算（上昇時は上向き、急降下時は下向き）
    if (this.vy < 0) {
      // 上昇中: 最大 -25度 (約 -0.44 rad)
      this.rotation = Math.max(-0.44, this.vy * 0.08);
    } else {
      // 落下中: 最大 +80度 (約 +1.4 rad) へ徐々に傾く
      this.rotation += 0.05;
      if (this.rotation > 1.4) this.rotation = 1.4;
    }

    // 3. 天井の制限
    if (this.y - this.radius < 0) {
      this.y = this.radius;
      this.vy = 0;
    }

    // 4. 地面との衝突判定
    const groundY = CANVAS_HEIGHT - GROUND_HEIGHT;
    if (this.y + this.radius >= groundY) {
      this.y = groundY - this.radius;
      handleGameOver();
    }

    this.wingAnim += 0.2;
  }

  draw() {
    ctx.save();
    // 鳥の中心座標を基準にキャンバスを移動・回転 (Matrix Transform)
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);

    // 体（黄色い丸）
    ctx.fillStyle = "#facc15";
    ctx.shadowColor = "rgba(0, 0, 0, 0.2)";
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
    ctx.fill();

    // お腹（白いハイライト）
    ctx.fillStyle = "#fef08a";
    ctx.beginPath();
    ctx.arc(-2, 4, this.radius * 0.55, 0, Math.PI * 2);
    ctx.fill();

    // 目（白目と黒目）
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(7, -5, 6, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#0f172a";
    ctx.beginPath();
    ctx.arc(9, -5, 3, 0, Math.PI * 2);
    ctx.fill();

    // くちばし（オレンジの三角形）
    ctx.fillStyle = "#f97316";
    ctx.beginPath();
    ctx.moveTo(10, 0);
    ctx.lineTo(22, 3);
    ctx.lineTo(10, 7);
    ctx.closePath();
    ctx.fill();

    // 羽（パタパタ上下アニメーション）
    const wingY = Math.sin(this.wingAnim) * 4;
    ctx.fillStyle = "#eab308";
    ctx.beginPath();
    ctx.ellipse(-7, wingY, 8, 5, -0.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}

/**
 * 上下の土管ペアクラス
 */
class PipePair {
  constructor(x) {
    this.x = x;
    this.width = 54;
    this.gap = 125; // 上下土管の間の隙間 (px)
    this.speed = 2.4;
    this.passed = false; // スコア加算済みフラグ

    // 隙間のY座標をランダム決定（画面上下端から最低限の余白を確保）
    const minY = 70;
    const maxY = CANVAS_HEIGHT - GROUND_HEIGHT - this.gap - 70;
    this.topHeight = Math.floor(Math.random() * (maxY - minY + 1)) + minY;
    this.bottomY = this.topHeight + this.gap;
    this.bottomHeight = CANVAS_HEIGHT - GROUND_HEIGHT - this.bottomY;
  }

  update() {
    this.x -= this.speed;

    // 鳥が土管を通過した瞬間のスコア判定
    if (!this.passed && this.x + this.width < bird.x) {
      this.passed = true;
      score++;
      scoreDisplay.textContent = score;
      createScoreParticles(bird.x, bird.y);
    }
  }

  draw() {
    const pipeColor = "#22c55e";
    const pipeBorder = "#15803d";
    const capHeight = 24;
    const capExtra = 4;

    ctx.save();
    ctx.fillStyle = pipeColor;
    ctx.strokeStyle = pipeBorder;
    ctx.lineWidth = 2.5;

    // 【上土管の胴体】
    ctx.fillRect(this.x, 0, this.width, this.topHeight - capHeight);
    ctx.strokeRect(this.x, 0, this.width, this.topHeight - capHeight);

    // 【上土管のフチ（Cap）】
    ctx.fillRect(this.x - capExtra, this.topHeight - capHeight, this.width + capExtra * 2, capHeight);
    ctx.strokeRect(this.x - capExtra, this.topHeight - capHeight, this.width + capExtra * 2, capHeight);

    // 【下土管のフチ（Cap）】
    ctx.fillRect(this.x - capExtra, this.bottomY, this.width + capExtra * 2, capHeight);
    ctx.strokeRect(this.x - capExtra, this.bottomY, this.width + capExtra * 2, capHeight);

    // 【下土管の胴体】
    ctx.fillRect(this.x, this.bottomY + capHeight, this.width, this.bottomHeight - capHeight);
    ctx.strokeRect(this.x, this.bottomY + capHeight, this.width, this.bottomHeight - capHeight);

    ctx.restore();
  }

  // 円（鳥）との当たり判定
  checkCollision(bird) {
    // 1. 上土管との判定
    if (checkCircleRectCollision(bird.x, bird.y, bird.radius * 0.85, this.x, 0, this.width, this.topHeight)) {
      return true;
    }
    // 2. 下土管との判定
    if (checkCircleRectCollision(bird.x, bird.y, bird.radius * 0.85, this.x, this.bottomY, this.width, this.bottomHeight)) {
      return true;
    }
    return false;
  }
}

/**
 * 円と矩形の衝突判定ヘルパー関数
 */
function checkCircleRectCollision(cx, cy, radius, rx, ry, rw, rh) {
  // 矩形上で円の中心に最も近い点 (Closest Point) を算出
  const closestX = Math.max(rx, Math.min(cx, rx + rw));
  const closestY = Math.max(ry, Math.min(cy, ry + rh));

  // 最も近い点と円の中心の距離の2乗
  const dx = cx - closestX;
  const dy = cy - closestY;
  return (dx * dx + dy * dy) < (radius * radius);
}

/**
 * パーティクルクラス
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

function createFlapParticles(x, y) {
  for (let i = 0; i < 4; i++) {
    particles.push(new Particle(x, y, "#ffffff"));
  }
}

function createScoreParticles(x, y) {
  for (let i = 0; i < 12; i++) {
    particles.push(new Particle(x, y, "#fbbf24"));
  }
}

// ==========================================
// 5. ベスト記録の読み込みと保存 (LocalStorage)
// ==========================================
function loadBestScore() {
  const saved = localStorage.getItem("flappy_best_score");
  if (saved !== null) {
    bestScore = parseInt(saved, 10);
    bestScoreDisplay.textContent = bestScore;
  }
}

function checkAndUpdateBestScore() {
  if (score > bestScore) {
    bestScore = score;
    localStorage.setItem("flappy_best_score", bestScore);
    bestScoreDisplay.textContent = bestScore;
    return true; // 新記録
  }
  return false;
}

// ==========================================
// 6. ゲームの初期化と開始
// ==========================================
function initGame() {
  bird = new Bird();
  pipes = [];
  particles = [];
  score = 0;
  frameCount = 0;
  isDead = false;

  scoreDisplay.textContent = "0";
  loadBestScore();
}

function startGame() {
  initGame();
  startOverlay.classList.add("hidden");
  gameoverOverlay.classList.add("hidden");

  isRunning = true;
  bird.flap(); // 開始と同時に1回羽ばたく
  requestAnimationFrame(gameLoop);
}

// ==========================================
// 7. メインゲームループ (Game Loop)
// ==========================================
function gameLoop() {
  if (!isRunning) return;

  update();
  draw();

  frameCount++;
  requestAnimationFrame(gameLoop);
}

// ==========================================
// 8. 状態更新処理 (Update)
// ==========================================
function update() {
  // 1. 鳥の更新
  bird.update();

  // 2. 土管の定期スポーン（約110フレームごと）
  if (frameCount % 110 === 0) {
    pipes.push(new PipePair(CANVAS_WIDTH + 20));
  }

  // 3. 土管の移動と当たり判定
  for (let i = 0; i < pipes.length; i++) {
    const pipe = pipes[i];
    pipe.update();

    if (pipe.checkCollision(bird)) {
      handleGameOver();
      return;
    }
  }

  // 4. 画面外に出た土管の削除
  pipes = pipes.filter(pipe => pipe.x + pipe.width > -20);

  // 5. パーティクルの更新
  particles.forEach(p => p.update());
  particles = particles.filter(p => p.alpha > 0);

  // 6. 背景オフセットのスクロール
  bgOffset = (bgOffset + 0.5) % CANVAS_WIDTH;
  groundOffset = (groundOffset + 2.4) % 24;
}

// ==========================================
// 9. 描画処理 (Draw)
// ==========================================
function draw() {
  // 1. 画面クリア
  ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  // 2. 背景（青空と雲と遠景のビル）
  drawBackground();

  // 3. 土管の描画
  pipes.forEach(pipe => pipe.draw());

  // 4. 地面の描画
  drawGround();

  // 5. パーティクルの描画
  particles.forEach(p => p.draw());

  // 6. 鳥の描画
  bird.draw();
}

// パララックス背景の描画
function drawBackground() {
  // 青空グラデーション
  const skyGrad = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT - GROUND_HEIGHT);
  skyGrad.addColorStop(0, "#38bdf8");
  skyGrad.addColorStop(1, "#bae6fd");
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT - GROUND_HEIGHT);

  // 遠景の雲
  ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
  ctx.beginPath();
  ctx.arc(100 - bgOffset * 0.3, 120, 24, 0, Math.PI * 2);
  ctx.arc(130 - bgOffset * 0.3, 110, 30, 0, Math.PI * 2);
  ctx.arc(160 - bgOffset * 0.3, 120, 24, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.arc(320 - bgOffset * 0.3, 180, 20, 0, Math.PI * 2);
  ctx.arc(345 - bgOffset * 0.3, 175, 26, 0, Math.PI * 2);
  ctx.arc(370 - bgOffset * 0.3, 180, 20, 0, Math.PI * 2);
  ctx.fill();
}

// 流れる地面の描画
function drawGround() {
  const groundY = CANVAS_HEIGHT - GROUND_HEIGHT;

  // 地面ベース（土）
  ctx.fillStyle = "#ded895";
  ctx.fillRect(0, groundY, CANVAS_WIDTH, GROUND_HEIGHT);

  // 地面トップ（草の帯）
  ctx.fillStyle = "#73bf2e";
  ctx.fillRect(0, groundY, CANVAS_WIDTH, 14);

  // 斜めストライプ模様（スクロール感を演出）
  ctx.fillStyle = "#5ea620";
  for (let x = -groundOffset; x < CANVAS_WIDTH + 24; x += 16) {
    ctx.beginPath();
    ctx.moveTo(x, groundY);
    ctx.lineTo(x + 8, groundY);
    ctx.lineTo(x, groundY + 14);
    ctx.closePath();
    ctx.fill();
  }

  // 境界線
  ctx.strokeStyle = "#554422";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, groundY);
  ctx.lineTo(CANVAS_WIDTH, groundY);
  ctx.stroke();
}

// ==========================================
// 10. ゲームオーバー処理とメダル判定
// ==========================================
function handleGameOver() {
  if (isDead) return;
  isDead = true;
  isRunning = false;

  const isNewRecord = checkAndUpdateBestScore();

  finalScoreEl.textContent = score;
  finalBestEl.textContent = bestScore;

  // メダル判定
  if (score >= 50) {
    resultMedal.textContent = "💎"; // プラチナ
  } else if (score >= 35) {
    resultMedal.textContent = "🥇"; // ゴールド
  } else if (score >= 20) {
    resultMedal.textContent = "🥈"; // シルバー
  } else if (score >= 10) {
    resultMedal.textContent = "🥉"; // ブロンズ
  } else {
    resultMedal.textContent = "🐣"; // ひよこ
  }

  if (isNewRecord) {
    newRecordBadge.classList.remove("hidden");
  } else {
    newRecordBadge.classList.add("hidden");
  }

  gameoverOverlay.classList.remove("hidden");
}

// ==========================================
// 11. イベントリスナー（タップ・クリック・キーボード）
// ==========================================

function handlePlayerAction() {
  if (!isRunning && startOverlay.classList.contains("hidden") && !gameoverOverlay.classList.contains("hidden")) {
    // ゲームオーバー画面ならリスタート
    startGame();
  } else if (isRunning) {
    // プレイ中なら羽ばたく
    bird.flap();
  }
}

// キーボード（スペースキー または 上矢印）
window.addEventListener("keydown", (e) => {
  if (e.code === "Space" || e.code === "ArrowUp") {
    e.preventDefault();
    if (!isRunning && !startOverlay.classList.contains("hidden")) {
      startGame();
    } else {
      handlePlayerAction();
    }
  }
});

// 画面タップ・クリック操作（スマホ実機スクロール防止対応）
canvas.addEventListener("touchstart", (e) => {
  e.preventDefault();
  handlePlayerAction();
}, { passive: false });

canvas.addEventListener("mousedown", (e) => {
  handlePlayerAction();
});

// スタート・リスタートボタン
startBtn.addEventListener("click", startGame);
restartBtn.addEventListener("click", startGame);

// ==========================================
// 12. 初期実行
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
