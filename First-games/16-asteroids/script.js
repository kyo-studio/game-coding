/**
 * ========================================================
 * 16 アステロイド風 (Asteroids) - JavaScript
 * ========================================================
 * このファイルでは、以下の重要プログラミング知識を学びます：
 * 1. 360度旋回と三角関数による推進力学 (Thrust & Inertia)
 * 2. 宇宙空間の慣性移動と摩擦減衰 (Damping / Friction)
 * 3. 4辺トーラス・スクリーンループ (Toroidal Wrap-around)
 * 4. 極座標を用いた不規則な小惑星ポリゴンの自動生成
 * 5. 3段階の岩石分裂システム (大 → 中2個 → 小2個)
 * 6. ハイパースペース・緊急ワープ機能
 * 7. スマホ実機操作（旋回・推進・発射・ワープ）
 */

// ==========================================
// 1. Canvasの初期化と定数設定
// ==========================================
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const CANVAS_WIDTH = canvas.width;   // 400
const CANVAS_HEIGHT = canvas.height; // 460

// ==========================================
// 2. DOM要素の取得
// ==========================================
const gameContainer = document.getElementById("game-container");
const scoreDisplay = document.getElementById("score-display");
const livesDisplay = document.getElementById("lives-display");
const waveDisplay = document.getElementById("wave-display");
const bestScoreDisplay = document.getElementById("best-score-display");
const startOverlay = document.getElementById("start-overlay");
const clearOverlay = document.getElementById("clear-overlay");
const gameoverOverlay = document.getElementById("gameover-overlay");
const gameoverReason = document.getElementById("gameover-reason");
const startBtn = document.getElementById("start-btn");
const nextWaveBtn = document.getElementById("next-wave-btn");
const restartBtn = document.getElementById("restart-btn");
const finalScoreEl = document.getElementById("final-score");
const finalWaveEl = document.getElementById("final-wave");
const newRecordBadge = document.getElementById("new-record-badge");

const btnTurnLeft = document.getElementById("btn-turn-left");
const btnTurnRight = document.getElementById("btn-turn-right");
const btnThrust = document.getElementById("btn-thrust");
const btnShoot = document.getElementById("btn-shoot");
const btnWarp = document.getElementById("btn-warp");

// ==========================================
// 3. ゲームの状態変数
// ==========================================
let isRunning = false;
let score = 0;
let lives = 3;
let wave = 1;
let bestScore = 0;

// エンティティ
let ship = null;
let asteroids = [];
let bullets = [];
let particles = [];
let floatingTexts = [];

// キーボード入力管理
const keys = {
  ArrowUp: false,
  ArrowLeft: false,
  ArrowRight: false,
  KeyW: false,
  KeyA: false,
  KeyD: false,
  Space: false
};

// ==========================================
// 4. クラス定義
// ==========================================

/**
 * 宇宙船（自機）クラス
 */
class Ship {
  constructor() {
    this.x = CANVAS_WIDTH / 2;
    this.y = CANVAS_HEIGHT / 2;
    this.radius = 12;
    this.angle = -Math.PI / 2; // 上向き (ラジアン)
    this.rotationSpeed = 0.08;
    this.vx = 0;
    this.vy = 0;
    this.thrustPower = 0.18;
    this.friction = 0.985;     // 慣性摩擦係数 (滑らかな減衰)
    this.isThrusting = false;
    this.invincibleTimer = 90; // リスポーン時無敵
    this.shootCooldown = 0;
  }

  update() {
    // 左右旋回
    if (keys.ArrowLeft || keys.KeyA) this.angle -= this.rotationSpeed;
    if (keys.ArrowRight || keys.KeyD) this.angle += this.rotationSpeed;

    // スラスター推進
    this.isThrusting = keys.ArrowUp || keys.KeyW;
    if (this.isThrusting) {
      this.vx += Math.cos(this.angle) * this.thrustPower;
      this.vy += Math.sin(this.angle) * this.thrustPower;

      // 噴射ジェットパーティクル
      const rearX = this.x - Math.cos(this.angle) * 14;
      const rearY = this.y - Math.sin(this.angle) * 14;
      createThrustParticles(rearX, rearY, this.angle);
    }

    // 速度と摩擦の適用
    this.vx *= this.friction;
    this.vy *= this.friction;
    this.x += this.vx;
    this.y += this.vy;

    // 【4辺スクリーンループ（境界ワープ）】
    wrapScreen(this);

    if (this.shootCooldown > 0) this.shootCooldown--;
    if (this.invincibleTimer > 0) this.invincibleTimer--;
  }

  shoot() {
    if (this.shootCooldown > 0 || bullets.length >= 4) return;
    const noseX = this.x + Math.cos(this.angle) * 16;
    const noseY = this.y + Math.sin(this.angle) * 16;
    const bulletSpeed = 7.5;
    const bulletVx = Math.cos(this.angle) * bulletSpeed + this.vx * 0.4;
    const bulletVy = Math.sin(this.angle) * bulletSpeed + this.vy * 0.4;

    bullets.push(new Bullet(noseX, noseY, bulletVx, bulletVy));
    this.shootCooldown = 12;
  }

  // 緊急ハイパースペースワープ
  hyperwarp() {
    createExplosionParticles(this.x, this.y, "#38bdf8", 16);
    this.x = Math.random() * (CANVAS_WIDTH - 60) + 30;
    this.y = Math.random() * (CANVAS_HEIGHT - 60) + 30;
    this.vx = 0;
    this.vy = 0;
    this.invincibleTimer = 60;
    createExplosionParticles(this.x, this.y, "#38bdf8", 16);
    floatingTexts.push(new FloatingText("🌀 HYPERWARP!", this.x, this.y - 14, "#38bdf8"));
  }

  draw() {
    if (this.invincibleTimer > 0 && Math.floor(this.invincibleTimer / 4) % 2 === 0) {
      return; // 無敵点滅
    }

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);

    ctx.strokeStyle = "#38bdf8";
    ctx.lineWidth = 2;
    ctx.shadowColor = "#38bdf8";
    ctx.shadowBlur = 8;
    ctx.fillStyle = "#0f172a";

    // 宇宙船（鋭い三角形）
    ctx.beginPath();
    ctx.moveTo(16, 0);       // 機首
    ctx.lineTo(-12, 10);     // 右後方
    ctx.lineTo(-7, 0);       // 後部中央くぼみ
    ctx.lineTo(-12, -10);    // 左後方
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // スラスター噴射炎
    if (this.isThrusting) {
      ctx.strokeStyle = "#f59e0b";
      ctx.fillStyle = "#f97316";
      ctx.beginPath();
      ctx.moveTo(-8, 5);
      ctx.lineTo(-18 - Math.random() * 6, 0);
      ctx.lineTo(-8, -5);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }

    ctx.restore();
  }
}

/**
 * 小惑星クラス（不規則多角形）
 */
class Asteroid {
  constructor(x, y, level) {
    this.x = x;
    this.y = y;
    this.level = level; // 3: 大, 2: 中, 1: 小

    if (level === 3) {
      this.radius = 36;
      this.score = 20;
      this.color = "#c084fc";
      this.speed = Math.random() * 1.0 + 0.6;
    } else if (level === 2) {
      this.radius = 22;
      this.score = 50;
      this.color = "#38bdf8";
      this.speed = Math.random() * 1.4 + 1.0;
    } else {
      this.radius = 12;
      this.score = 100;
      this.color = "#4ade80";
      this.speed = Math.random() * 2.0 + 1.4;
    }

    const moveAngle = Math.random() * Math.PI * 2;
    this.vx = Math.cos(moveAngle) * this.speed;
    this.vy = Math.sin(moveAngle) * this.speed;

    this.angle = 0;
    this.rotSpeed = (Math.random() * 0.04 - 0.02);

    // 不規則多角形の頂点生成 (極座標)
    this.vertexCount = Math.floor(Math.random() * 4) + 8; // 8〜11角形
    this.offsets = [];
    for (let i = 0; i < this.vertexCount; i++) {
      // 半径に ±25% のランダムノイズを加える
      this.offsets.push(Math.random() * 0.4 + 0.8);
    }
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.angle += this.rotSpeed;

    // スクリーンループ
    wrapScreen(this);
  }

  draw() {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);

    ctx.strokeStyle = this.color;
    ctx.lineWidth = 1.8;
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 6;
    ctx.fillStyle = "rgba(15, 23, 42, 0.6)";

    ctx.beginPath();
    for (let i = 0; i < this.vertexCount; i++) {
      const theta = (i / this.vertexCount) * Math.PI * 2;
      const r = this.radius * this.offsets[i];
      const px = Math.cos(theta) * r;
      const py = Math.sin(theta) * r;

      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.restore();
  }
}

/**
 * 弾丸クラス
 */
class Bullet {
  constructor(x, y, vx, vy) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.radius = 2.5;
    this.life = 55; // 射程タイマー
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.life--;
    // 画面外に出た場合は反対側からループさせず消滅させる
    if (this.x < 0 || this.x > CANVAS_WIDTH || this.y < 0 || this.y > CANVAS_HEIGHT) {
      this.life = 0;
    }
  }

  draw() {
    ctx.save();
    ctx.fillStyle = "#ffffff";
    ctx.shadowColor = "#f43f5e";
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

/**
 * 画面ループ（トーラス空間処理）
 */
function wrapScreen(obj) {
  const margin = obj.radius || 10;
  if (obj.x < -margin) obj.x = CANVAS_WIDTH + margin;
  if (obj.x > CANVAS_WIDTH + margin) obj.x = -margin;
  if (obj.y < -margin) obj.y = CANVAS_HEIGHT + margin;
  if (obj.y > CANVAS_HEIGHT + margin) obj.y = -margin;
}

/**
 * パーティクル
 */
class Particle {
  constructor(x, y, color, speedScale = 1.0) {
    this.x = x;
    this.y = y;
    this.color = color;
    this.radius = Math.random() * 2.5 + 1.2;
    const angle = Math.random() * Math.PI * 2;
    const speed = (Math.random() * 3.5 + 1) * speedScale;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.alpha = 1.0;
    this.decay = Math.random() * 0.04 + 0.025;
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

function createThrustParticles(x, y, angle) {
  const pAngle = angle + Math.PI + (Math.random() * 0.6 - 0.3);
  const p = new Particle(x, y, "#f59e0b", 0.8);
  p.vx = Math.cos(pAngle) * 3;
  p.vy = Math.sin(pAngle) * 3;
  particles.push(p);
}

function createExplosionParticles(x, y, color, count = 12) {
  for (let i = 0; i < count; i++) {
    particles.push(new Particle(x, y, color, 1.4));
  }
}

/**
 * 浮遊テキスト
 */
class FloatingText {
  constructor(text, x, y, color) {
    this.text = text;
    this.x = x;
    this.y = y;
    this.color = color || "#fbbf24";
    this.alpha = 1.0;
    this.vy = -1.4;
  }

  update() {
    this.y += this.vy;
    this.alpha -= 0.025;
  }

  draw() {
    ctx.save();
    ctx.globalAlpha = Math.max(0, this.alpha);
    ctx.font = "bold 12px sans-serif";
    ctx.fillStyle = this.color;
    ctx.textAlign = "center";
    ctx.fillText(this.text, this.x, this.y);
    ctx.restore();
  }
}

// ==========================================
// 5. ベスト記録の読み込みと保存 (LocalStorage)
// ==========================================
function loadBestScore() {
  const saved = localStorage.getItem("asteroids_best_score");
  if (saved !== null) {
    bestScore = parseInt(saved, 10);
    bestScoreDisplay.textContent = bestScore;
  }
}

function checkAndUpdateBestScore() {
  if (score > bestScore) {
    bestScore = score;
    localStorage.setItem("asteroids_best_score", bestScore);
    bestScoreDisplay.textContent = bestScore;
    return true;
  }
  return false;
}

// ==========================================
// 6. 小惑星のスポーン処理
// ==========================================
function spawnAsteroidField(count) {
  asteroids = [];
  for (let i = 0; i < count; i++) {
    let x, y, dist;
    // 自機から離れた位置に大岩石を生成
    do {
      x = Math.random() * CANVAS_WIDTH;
      y = Math.random() * CANVAS_HEIGHT;
      const dx = x - (ship ? ship.x : CANVAS_WIDTH / 2);
      const dy = y - (ship ? ship.y : CANVAS_HEIGHT / 2);
      dist = Math.sqrt(dx * dx + dy * dy);
    } while (dist < 100);

    asteroids.push(new Asteroid(x, y, 3)); // 大岩石
  }
}

// ==========================================
// 7. ゲーム初期化と開始
// ==========================================
function initGame() {
  ship = new Ship();
  bullets = [];
  particles = [];
  floatingTexts = [];

  score = 0;
  lives = 3;
  wave = 1;

  scoreDisplay.textContent = "0";
  waveDisplay.textContent = "1";
  updateLivesUI();

  spawnAsteroidField(3); // 初期3個の大岩石
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

function startNextWave() {
  wave++;
  waveDisplay.textContent = wave;
  bullets = [];
  ship.invincibleTimer = 60;

  spawnAsteroidField(3 + wave); // ウェーブごとに岩石増加

  clearOverlay.classList.add("hidden");
  isRunning = true;
  requestAnimationFrame(gameLoop);
}

// ==========================================
// 8. メインゲームループ (Game Loop)
// ==========================================
function gameLoop() {
  if (!isRunning) return;

  update();
  draw();

  requestAnimationFrame(gameLoop);
}

// ==========================================
// 9. 状態更新処理 (Update)
// ==========================================
function update() {
  // 1. 宇宙船の更新
  ship.update();

  // 2. 小惑星の更新
  asteroids.forEach(a => a.update());

  // 3. 弾丸の更新
  bullets.forEach(b => b.update());
  bullets = bullets.filter(b => b.life > 0);

  // 4. 【弾丸 vs 小惑星の衝突判定＆分裂処理】
  bullets.forEach(bullet => {
    asteroids.forEach(asteroid => {
      const dx = bullet.x - asteroid.x;
      const dy = bullet.y - asteroid.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < asteroid.radius) {
        bullet.life = 0; // 弾消去
        score += asteroid.score;
        scoreDisplay.textContent = score;

        floatingTexts.push(new FloatingText(`+${asteroid.score}`, asteroid.x, asteroid.y, asteroid.color));
        createExplosionParticles(asteroid.x, asteroid.y, asteroid.color, 14);

        // 【岩石分裂ロジック】
        if (asteroid.level === 3) {
          // 大 → 中2個に分裂
          asteroids.push(new Asteroid(asteroid.x, asteroid.y, 2));
          asteroids.push(new Asteroid(asteroid.x, asteroid.y, 2));
        } else if (asteroid.level === 2) {
          // 中 → 小2個に分裂
          asteroids.push(new Asteroid(asteroid.x, asteroid.y, 1));
          asteroids.push(new Asteroid(asteroid.x, asteroid.y, 1));
        }
        // 小はそのまま消滅

        // 当該岩石を削除マーク
        asteroid.destroyed = true;
      }
    });
  });
  asteroids = asteroids.filter(a => !a.destroyed);

  // 5. 【小惑星 vs 自機の衝突判定】
  if (ship.invincibleTimer <= 0) {
    asteroids.forEach(asteroid => {
      const dx = ship.x - asteroid.x;
      const dy = ship.y - asteroid.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < ship.radius + asteroid.radius * 0.85) {
        handleShipDestroyed();
      }
    });
  }

  // 6. パーティクル・浮遊テキストの更新
  particles.forEach(p => p.update());
  particles = particles.filter(p => p.alpha > 0);

  floatingTexts.forEach(t => t.update());
  floatingTexts = floatingTexts.filter(t => t.alpha > 0);

  // 7. 【全滅ウェーブクリア判定】
  if (asteroids.length === 0) {
    handleSectorClear();
  }
}

// 自機大破処理
function handleShipDestroyed() {
  lives--;
  updateLivesUI();
  triggerScreenShake();
  createExplosionParticles(ship.x, ship.y, "#f43f5e", 24);

  if (lives <= 0) {
    handleGameOver("小惑星に激突して大破しました！");
  } else {
    // 中央で安全リスポーン
    ship.x = CANVAS_WIDTH / 2;
    ship.y = CANVAS_HEIGHT / 2;
    ship.vx = 0;
    ship.vy = 0;
    ship.angle = -Math.PI / 2;
    ship.invincibleTimer = 90;
  }
}

function handleSectorClear() {
  isRunning = false;
  score += 1000 * wave; // クリアボーナス
  scoreDisplay.textContent = score;
  checkAndUpdateBestScore();
  clearOverlay.classList.remove("hidden");
}

function handleGameOver(reason) {
  isRunning = false;
  const isNewRecord = checkAndUpdateBestScore();

  gameoverReason.textContent = reason;
  finalScoreEl.textContent = score;
  finalWaveEl.textContent = wave;

  if (isNewRecord) {
    newRecordBadge.classList.remove("hidden");
  } else {
    newRecordBadge.classList.add("hidden");
  }

  gameoverOverlay.classList.remove("hidden");
}

function triggerScreenShake() {
  gameContainer.classList.remove("screen-shake");
  void gameContainer.offsetWidth;
  gameContainer.classList.add("screen-shake");
}

function updateLivesUI() {
  let ships = "";
  for (let i = 0; i < lives; i++) ships += "🚀";
  livesDisplay.textContent = ships || "💥";
}

// ==========================================
// 10. 描画処理 (Draw)
// ==========================================
function draw() {
  // 1. 画面クリア（微かな残光）
  ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  // 2. 小惑星の描画
  asteroids.forEach(a => a.draw());

  // 3. 弾丸の描画
  bullets.forEach(b => b.draw());

  // 4. パーティクル・浮遊テキスト
  particles.forEach(p => p.draw());
  floatingTexts.forEach(t => t.draw());

  // 5. 宇宙船の描画
  if (ship && lives > 0) ship.draw();
}

// ==========================================
// 11. イベントリスナー（キーボード・スマホ操作）
// ==========================================

// キーボード
window.addEventListener("keydown", (e) => {
  if (keys.hasOwnProperty(e.code)) {
    keys[e.code] = true;
    e.preventDefault();
  }
  if (e.code === "Space") {
    if (!isRunning && !startOverlay.classList.contains("hidden")) {
      startGame();
    } else if (isRunning && ship) {
      ship.shoot();
    }
  }
  if (e.code === "ShiftLeft" || e.code === "KeyH") {
    if (isRunning && ship) ship.hyperwarp();
  }
});

window.addEventListener("keyup", (e) => {
  if (keys.hasOwnProperty(e.code)) {
    keys[e.code] = false;
    e.preventDefault();
  }
});

// スマホ用ボタン操作
btnTurnLeft.addEventListener("touchstart", (e) => { e.preventDefault(); keys.ArrowLeft = true; }, { passive: false });
btnTurnLeft.addEventListener("touchend", (e) => { e.preventDefault(); keys.ArrowLeft = false; }, { passive: false });
btnTurnLeft.addEventListener("mousedown", () => { keys.ArrowLeft = true; });
btnTurnLeft.addEventListener("mouseup", () => { keys.ArrowLeft = false; });

btnTurnRight.addEventListener("touchstart", (e) => { e.preventDefault(); keys.ArrowRight = true; }, { passive: false });
btnTurnRight.addEventListener("touchend", (e) => { e.preventDefault(); keys.ArrowRight = false; }, { passive: false });
btnTurnRight.addEventListener("mousedown", () => { keys.ArrowRight = true; });
btnTurnRight.addEventListener("mouseup", () => { keys.ArrowRight = false; });

btnThrust.addEventListener("touchstart", (e) => { e.preventDefault(); keys.ArrowUp = true; }, { passive: false });
btnThrust.addEventListener("touchend", (e) => { e.preventDefault(); keys.ArrowUp = false; }, { passive: false });
btnThrust.addEventListener("mousedown", () => { keys.ArrowUp = true; });
btnThrust.addEventListener("mouseup", () => { keys.ArrowUp = false; });

btnShoot.addEventListener("touchstart", (e) => { e.preventDefault(); if (isRunning && ship) ship.shoot(); }, { passive: false });
btnShoot.addEventListener("mousedown", () => { if (isRunning && ship) ship.shoot(); });

btnWarp.addEventListener("touchstart", (e) => { e.preventDefault(); if (isRunning && ship) ship.hyperwarp(); }, { passive: false });
btnWarp.addEventListener("mousedown", () => { if (isRunning && ship) ship.hyperwarp(); });

// スタート・次セクター・リトライボタン
startBtn.addEventListener("click", startGame);
nextWaveBtn.addEventListener("click", startNextWave);
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
