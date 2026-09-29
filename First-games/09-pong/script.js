/**
 * ========================================================
 * 09 ピンポン (Pong) - JavaScript
 * ========================================================
 * このファイルでは、以下のゲームプログラミング知識を学びます：
 * 1. 2D反射物理（壁の反射: vy = -vy）
 * 2. パドルの打撃位置に応じた反射角度の三角関数計算 (Angular Bounce)
 * 3. ラリーに応じたボールの加速力学と最大速度制限
 * 4. CPUの目標追従AIアルゴリズム (AI Paddle)
 * 5. 複数ゲームモード（vs CPU / エンドレスラリー / 2P対戦）の状態管理
 * 6. ボールの残像トレイル (Light Trail) と衝突パーティクル
 * 7. スマホ実機タッチ操作時のスクロール完全防止
 * 8. LocalStorageによる最高記録保存
 */

// ==========================================
// 1. Canvasの初期化とコンテキスト取得
// ==========================================
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const CANVAS_WIDTH = canvas.width;   // 640
const CANVAS_HEIGHT = canvas.height; // 400
const WINNING_SCORE = 5;             // 勝利に必要な得点

// ==========================================
// 2. DOM要素の取得
// ==========================================
const gameContainer = document.getElementById("game-container");
const p1Name = document.getElementById("p1-name");
const p2Name = document.getElementById("p2-name");
const p1ScoreEl = document.getElementById("p1-score");
const p2ScoreEl = document.getElementById("p2-score");
const rallyCountEl = document.getElementById("rally-count");
const targetPointsEl = document.getElementById("target-points");
const startOverlay = document.getElementById("start-overlay");
const gameoverOverlay = document.getElementById("gameover-overlay");
const startBtn = document.getElementById("start-btn");
const restartBtn = document.getElementById("restart-btn");
const resultIcon = document.getElementById("result-icon");
const resultTitle = document.getElementById("result-title");
const resultDesc = document.getElementById("result-desc");
const maxRallyDisplay = document.getElementById("max-rally-display");
const bestRallyDisplay = document.getElementById("best-rally-display");
const modeButtons = document.querySelectorAll(".mode-btn");
const diffButtons = document.querySelectorAll(".diff-btn");
const difficultySelector = document.getElementById("difficulty-selector");

// ==========================================
// 3. ゲーム設定・状態変数
// ==========================================
let currentMode = "vs-cpu";  // "vs-cpu" | "rally" | "2p"
let currentDiff = "normal";  // "easy" | "normal" | "hard"
let isRunning = false;
let isPaused = false;
let lastTimestamp = 0;

let p1Score = 0;
let p2Score = 0;
let currentRally = 0;
let maxRally = 0;
let bestRally = 0;

// エンティティ
let ball = null;
let p1Paddle = null;
let p2Paddle = null;
let particles = [];

// キーボード入力管理
const keys = {
  KeyW: false,
  KeyS: false,
  ArrowUp: false,
  ArrowDown: false
};

// ==========================================
// 4. クラス定義（パドル・ボール・パーティクル）
// ==========================================

/**
 * パドル（ラケット）クラス
 */
class Paddle {
  constructor(x, isPlayer2 = false) {
    this.width = 12;
    this.height = 70;
    this.x = x;
    this.y = (CANVAS_HEIGHT - this.height) / 2;
    this.speed = 6.0;
    this.isPlayer2 = isPlayer2;
    this.color = isPlayer2 ? "#f43f5e" : "#38bdf8";
  }

  update(ball) {
    if (currentMode === "vs-cpu" && this.isPlayer2) {
      // 【CPU AIによる自動追従】
      this.updateAI(ball);
    } else if (currentMode === "2p" && this.isPlayer2) {
      // 【2Pキーボード操作: 矢印キー】
      if (keys.ArrowUp) this.y -= this.speed;
      if (keys.ArrowDown) this.y += this.speed;
    } else {
      // 【1Pキーボード操作: W/S または 矢印キー】
      if (keys.KeyW || (currentMode !== "2p" && keys.ArrowUp)) this.y -= this.speed;
      if (keys.KeyS || (currentMode !== "2p" && keys.ArrowDown)) this.y += this.speed;
    }

    // 壁判定（画面外へのはみ出し防止）
    this.y = Math.max(0, Math.min(CANVAS_HEIGHT - this.height, this.y));
  }

  // CPU AIの追従ロジック
  updateAI(ball) {
    // 難易度別のAIパラメータ
    let aiSpeed = 4.2;
    let reactionError = 15; // 狙いのブレ

    if (currentDiff === "easy") {
      aiSpeed = 3.2;
      reactionError = 30;
    } else if (currentDiff === "hard") {
      aiSpeed = 5.8;
      reactionError = 5;
    }

    // ボールが自陣（右半分）に向かって飛んでいる時のみ反応
    if (ball.vx > 0) {
      const targetY = ball.y - this.height / 2;
      if (Math.abs(targetY - this.y) > reactionError) {
        if (targetY < this.y) {
          this.y -= aiSpeed;
        } else {
          this.y += aiSpeed;
        }
      }
    }
  }

  draw() {
    ctx.save();
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 10;
    ctx.fillStyle = this.color;
    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(this.x, this.y, this.width, this.height, 6);
    } else {
      ctx.rect(this.x, this.y, this.width, this.height);
    }
    ctx.fill();
    ctx.restore();
  }
}

/**
 * ボールクラス
 */
class Ball {
  constructor() {
    this.radius = 8;
    this.baseSpeed = 5.5;
    this.maxSpeed = 13.0;
    this.trail = [];
    this.reset(1); // 1Pサーブから開始
  }

  reset(servingDirection = 1) {
    this.x = CANVAS_WIDTH / 2;
    this.y = CANVAS_HEIGHT / 2;
    this.speed = this.baseSpeed;
    this.trail = [];

    // 初速の角度（±35度以内でランダム）
    const angle = (Math.random() * 0.6 - 0.3) * Math.PI;
    this.vx = Math.cos(angle) * this.speed * servingDirection;
    this.vy = Math.sin(angle) * this.speed;
  }

  update() {
    // 1. 移動
    this.x += this.vx;
    this.y += this.vy;

    // 2. 残像（トレイル）の記録
    this.trail.unshift({ x: this.x, y: this.y });
    if (this.trail.length > 8) {
      this.trail.pop();
    }

    // 3. 上下の壁での反射（完全弾性衝突）
    if (this.y - this.radius <= 0) {
      this.y = this.radius;
      this.vy = -this.vy; // Y方向速度を反転
      createHitParticles(this.x, this.y, "#94a3b8", 8);
    } else if (this.y + this.radius >= CANVAS_HEIGHT) {
      this.y = CANVAS_HEIGHT - this.radius;
      this.vy = -this.vy;
      createHitParticles(this.x, this.y, "#94a3b8", 8);
    }
  }

  draw() {
    // 残像の描画
    this.trail.forEach((pos, index) => {
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, this.radius * (1 - index * 0.1), 0, Math.PI * 2);
      ctx.fillStyle = `rgba(251, 191, 36, ${0.4 - index * 0.05})`;
      ctx.fill();
    });

    // ボール本体
    ctx.save();
    ctx.shadowColor = "#fbbf24";
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = "#ffffff";
    ctx.fill();
    ctx.restore();
  }
}

/**
 * 衝突火花パーティクル
 */
class Particle {
  constructor(x, y, color) {
    this.x = x;
    this.y = y;
    this.color = color;
    this.radius = Math.random() * 2.5 + 1.5;
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 4 + 1.5;
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

// ==========================================
// 5. ベスト記録の読み込みと保存 (LocalStorage)
// ==========================================
function loadBestRecords() {
  const saved = localStorage.getItem("pong_best_rally");
  if (saved !== null) {
    bestRally = parseInt(saved, 10);
    bestRallyDisplay.textContent = bestRally;
  }
}

function updateBestRally() {
  if (maxRally > bestRally) {
    bestRally = maxRally;
    localStorage.setItem("pong_best_rally", bestRally);
    bestRallyDisplay.textContent = bestRally;
  }
}

// ==========================================
// 6. ゲームの初期化と開始
// ==========================================
function initGame() {
  p1Paddle = new Paddle(20, false);
  p2Paddle = new Paddle(CANVAS_WIDTH - 32, true);
  ball = new Ball();
  particles = [];

  p1Score = 0;
  p2Score = 0;
  currentRally = 0;
  maxRally = 0;

  updateScoreUI();
  loadBestRecords();
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
// 7. メインゲームループ
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
// 8. 状態更新処理 (Update)
// ==========================================
function update(dt) {
  // 1. パドルの更新
  p1Paddle.update(ball);
  if (currentMode !== "rally") {
    p2Paddle.update(ball);
  }

  // 2. ボールの更新
  ball.update();

  // 3. 【パドル1（左）との衝突判定 & 打点角度計算】
  if (
    ball.vx < 0 &&
    ball.x - ball.radius <= p1Paddle.x + p1Paddle.width &&
    ball.x + ball.radius >= p1Paddle.x &&
    ball.y >= p1Paddle.y &&
    ball.y <= p1Paddle.y + p1Paddle.height
  ) {
    handlePaddleBounce(p1Paddle, 1);
  }

  // 4. 【パドル2（右）または壁（ラリーモード）との衝突判定】
  if (currentMode === "rally") {
    // ラリーモード：右の壁で跳ね返る
    if (ball.vx > 0 && ball.x + ball.radius >= CANVAS_WIDTH) {
      ball.x = CANVAS_WIDTH - ball.radius;
      ball.vx = -ball.vx;
      createHitParticles(ball.x, ball.y, "#38bdf8", 10);
    }
  } else {
    // 通常対戦：パドル2（右）との衝突判定
    if (
      ball.vx > 0 &&
      ball.x + ball.radius >= p2Paddle.x &&
      ball.x - ball.radius <= p2Paddle.x + p2Paddle.width &&
      ball.y >= p2Paddle.y &&
      ball.y <= p2Paddle.y + p2Paddle.height
    ) {
      handlePaddleBounce(p2Paddle, -1);
    }
  }

  // 5. 【ゴール判定（左右画面外への通過）】
  if (ball.x < 0) {
    // 2P（右）の得点
    p2Score++;
    handleGoal(-1);
  } else if (ball.x > CANVAS_WIDTH && currentMode !== "rally") {
    // 1P（左）の得点
    p1Score++;
    handleGoal(1);
  }

  // 6. パーティクルの更新
  particles.forEach(p => p.update());
  particles = particles.filter(p => p.alpha > 0);
}

// パドルでの跳ね返り＆角度計算ロジック
function handlePaddleBounce(paddle, direction) {
  // パドル中心からの衝突相対位置 (-1.0: 一番上 〜 +1.0: 一番下)
  const relativeIntersectY = (ball.y - (paddle.y + paddle.height / 2)) / (paddle.height / 2);
  const normalizedRelativeIntersectionY = Math.max(-1, Math.min(1, relativeIntersectY));

  // 最大反射角 60度 (PI / 3)
  const bounceAngle = normalizedRelativeIntersectionY * (Math.PI / 3);

  // ラリーごとにボール速度を 4% ずつ加速（上限まで）
  ball.speed = Math.min(ball.maxSpeed, ball.speed * 1.04);

  // 新しい速度ベクトルを計算
  ball.vx = Math.cos(bounceAngle) * ball.speed * direction;
  ball.vy = Math.sin(bounceAngle) * ball.speed;

  // ラリー加算
  currentRally++;
  if (currentRally > maxRally) maxRally = currentRally;
  updateScoreUI();

  // 打撃パーティクル
  createHitParticles(ball.x, ball.y, paddle.color, 15);
}

// ゴール時の得点処理
function handleGoal(servingDirection) {
  currentRally = 0;
  updateScoreUI();
  triggerScreenShake();

  // 決着判定（5点先取）
  if (currentMode !== "rally" && (p1Score >= WINNING_SCORE || p2Score >= WINNING_SCORE)) {
    handleGameOver();
    return;
  }

  // ラリーモードで落としたらゲームオーバー
  if (currentMode === "rally") {
    handleGameOver();
    return;
  }

  // ボールリセットして次サーブ
  ball.reset(servingDirection);
}

function updateScoreUI() {
  p1ScoreEl.textContent = p1Score;
  p2ScoreEl.textContent = p2Score;
  rallyCountEl.textContent = `RALLY: ${currentRally}`;
}

function createHitParticles(x, y, color, count = 10) {
  for (let i = 0; i < count; i++) {
    particles.push(new Particle(x, y, color));
  }
}

function triggerScreenShake() {
  gameContainer.classList.remove("screen-shake");
  void gameContainer.offsetWidth;
  gameContainer.classList.add("screen-shake");
}

// ==========================================
// 9. 描画処理 (Draw)
// ==========================================
function draw() {
  // 1. 画面クリア
  ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  // 2. センターラインとコート装飾の描画
  drawCourt();

  // 3. パーティクルの描画
  particles.forEach(p => p.draw());

  // 4. パドルの描画
  if (p1Paddle) p1Paddle.draw();
  if (p2Paddle && currentMode !== "rally") p2Paddle.draw();

  // 5. ボールの描画
  if (ball) ball.draw();
}

// コート（中央点線・外枠）の描画
function drawCourt() {
  ctx.strokeStyle = "rgba(51, 65, 85, 0.4)";
  ctx.lineWidth = 2;

  // 中央点線
  ctx.setLineDash([8, 8]);
  ctx.beginPath();
  ctx.moveTo(CANVAS_WIDTH / 2, 0);
  ctx.lineTo(CANVAS_WIDTH / 2, CANVAS_HEIGHT);
  ctx.stroke();
  ctx.setLineDash([]); // 戻す

  // ラリーモード時の右壁の描画
  if (currentMode === "rally") {
    ctx.strokeStyle = "#38bdf8";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(CANVAS_WIDTH - 2, 0);
    ctx.lineTo(CANVAS_WIDTH - 2, CANVAS_HEIGHT);
    ctx.stroke();
  }
}

// ==========================================
// 10. ゲームオーバー / 決着処理
// ==========================================
function handleGameOver() {
  isRunning = false;
  updateBestRally();

  maxRallyDisplay.textContent = maxRally;
  bestRallyDisplay.textContent = bestRally;

  if (currentMode === "rally") {
    resultIcon.textContent = "🔁";
    resultTitle.textContent = "RALLY FINISHED!";
    resultDesc.textContent = `連続ラリー記録: ${maxRally} 回！`;
  } else if (p1Score >= WINNING_SCORE) {
    resultIcon.textContent = "🏆";
    resultTitle.textContent = currentMode === "2p" ? "1P (YOU) WIN!" : "YOU WIN!";
    resultDesc.textContent = "完璧なパドルさばきで見事勝利しました！";
  } else {
    resultIcon.textContent = "💥";
    resultTitle.textContent = currentMode === "2p" ? "2P WIN!" : "CPU WIN!";
    resultDesc.textContent = "惜敗... 次こそリベンジしましょう！";
  }

  gameoverOverlay.classList.remove("hidden");
}

// ==========================================
// 11. イベントリスナーの設定（実機スクロール防止対応）
// ==========================================

// キーボード操作
window.addEventListener("keydown", (e) => {
  if (keys.hasOwnProperty(e.code)) {
    keys[e.code] = true;
    e.preventDefault();
  }

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

// マウス/タッチによる1Pパドルのダイレクト移動
function handlePointerY(clientY) {
  if (!isRunning || !p1Paddle) return;
  const rect = canvas.getBoundingClientRect();
  const scaleY = canvas.height / rect.height;
  const targetY = (clientY - rect.top) * scaleY - p1Paddle.height / 2;

  p1Paddle.y = Math.max(0, Math.min(CANVAS_HEIGHT - p1Paddle.height, targetY));
}

canvas.addEventListener("mousemove", (e) => {
  handlePointerY(e.clientY);
});

// タッチイベント（実機スクロールを完全防止）
canvas.addEventListener("touchstart", (e) => {
  e.preventDefault();
  if (e.touches.length > 0) {
    handlePointerY(e.touches[0].clientY);
  }
}, { passive: false });

canvas.addEventListener("touchmove", (e) => {
  e.preventDefault();
  if (e.touches.length > 0) {
    handlePointerY(e.touches[0].clientY);
  }
}, { passive: false });

canvas.addEventListener("touchend", (e) => {
  e.preventDefault();
}, { passive: false });

// モード切り替えボタン
modeButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    if (isRunning) return;
    modeButtons.forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    currentMode = btn.dataset.mode;

    // UIの切り替え
    if (currentMode === "vs-cpu") {
      difficultySelector.style.display = "flex";
      p2Name.textContent = "CPU (2P)";
      targetPointsEl.textContent = "5点先取";
    } else if (currentMode === "rally") {
      difficultySelector.style.display = "none";
      p2Name.textContent = "WALL (壁)";
      targetPointsEl.textContent = "エンドレス";
    } else if (currentMode === "2p") {
      difficultySelector.style.display = "none";
      p2Name.textContent = "2P (相手)";
      targetPointsEl.textContent = "5点先取";
    }

    initGame();
  });
});

// 難易度切り替えボタン
diffButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    if (isRunning) return;
    diffButtons.forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    currentDiff = btn.dataset.diff;
  });
});

// スタート / リスタートボタン
startBtn.addEventListener("click", startGame);
restartBtn.addEventListener("click", startGame);

// ==========================================
// 12. 初期実行
// ==========================================
loadBestRecords();
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
