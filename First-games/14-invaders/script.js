/**
 * ========================================================
 * 14 インベーダー風シューティング (Space Invaders) - JavaScript
 * ========================================================
 * このファイルでは、以下の重要プログラミング知識を学びます：
 * 1. エイリアン編隊（Swarm）の同期移動と境界反転下降アルゴリズム
 * 2. 生存数に応じたゲームテンポの動的加速 (Dynamic Pacing)
 * 3. 自機弾・敵迎撃弾・ボーナスUFOの配列管理 (Multi-Entity Lifecycle)
 * 4. 破壊可能防壁（Bunkers / 4基のシールド）のダメージ処理
 * 5. 最下段侵略とウェーブ制のステート管理
 * 6. スマホ実機操作（左右移動ボタン ＆ 発射ボタン）
 */

// ==========================================
// 1. Canvasの初期化と定数設定
// ==========================================
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const CANVAS_WIDTH = canvas.width;   // 380
const CANVAS_HEIGHT = canvas.height; // 460

const ALIEN_ROWS = 4;
const ALIEN_COLS = 8;
const ALIEN_WIDTH = 24;
const ALIEN_HEIGHT = 18;
const ALIEN_PADDING_X = 14;
const ALIEN_PADDING_Y = 12;

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

const btnLeft = document.getElementById("btn-left");
const btnRight = document.getElementById("btn-right");
const btnShoot = document.getElementById("btn-shoot");

// ==========================================
// 3. ゲームの状態変数
// ==========================================
let isRunning = false;
let score = 0;
let lives = 3;
let wave = 1;
let bestScore = 0;

// エンティティ
let player = null;
let aliens = [];
let playerBullets = [];
let enemyBullets = [];
let bunkers = [];
let ufo = null;
let particles = [];
let floatingTexts = [];

// 編隊の移動管理
let alienDirX = 1;        // 1: 右, -1: 左
let alienMoveTimer = 0;   // 移動タイマー
let alienStepX = 8;       // 1歩の移動ピクセル
let alienStepY = 14;      // 画面端到達時の下降ピクセル

// UFOスポーンタイマー
let ufoTimer = 0;

// キーボード入力管理
const keys = {
  ArrowLeft: false,
  ArrowRight: false,
  KeyA: false,
  KeyD: false,
  Space: false
};

// ==========================================
// 4. クラス定義
// ==========================================

/**
 * 自機（砲台）クラス
 */
class Player {
  constructor() {
    this.width = 28;
    this.height = 18;
    this.x = (CANVAS_WIDTH - this.width) / 2;
    this.y = CANVAS_HEIGHT - 32;
    this.speed = 4.5;
    this.shootCooldown = 0;
  }

  update() {
    // キーボード / ボタン入力による移動
    if (keys.ArrowLeft || keys.KeyA) this.x -= this.speed;
    if (keys.ArrowRight || keys.KeyD) this.x += this.speed;

    // 壁判定
    this.x = Math.max(8, Math.min(CANVAS_WIDTH - this.width - 8, this.x));

    if (this.shootCooldown > 0) this.shootCooldown--;
  }

  shoot() {
    if (this.shootCooldown > 0 || playerBullets.length >= 3) return;
    // 自機弾の発射
    playerBullets.push(new Bullet(this.x + this.width / 2, this.y, -7.0, "#22c55e", true));
    this.shootCooldown = 15; // 連射制限
  }

  draw() {
    ctx.save();
    ctx.fillStyle = "#22c55e";
    ctx.shadowColor = "#22c55e";
    ctx.shadowBlur = 8;

    // 砲台ベース（台形）
    ctx.beginPath();
    ctx.moveTo(this.x, this.y + this.height);
    ctx.lineTo(this.x + this.width, this.y + this.height);
    ctx.lineTo(this.x + this.width - 4, this.y + 6);
    ctx.lineTo(this.x + 4, this.y + 6);
    ctx.closePath();
    ctx.fill();

    // 砲身
    ctx.fillRect(this.x + this.width / 2 - 2, this.y, 4, 8);
    ctx.restore();
  }
}

/**
 * エイリアンクラス
 */
class Alien {
  constructor(x, y, row) {
    this.x = x;
    this.y = y;
    this.width = ALIEN_WIDTH;
    this.height = ALIEN_HEIGHT;
    this.row = row; // 0: タコ, 1-2: カニ, 3: イカ
    this.alive = true;
    this.animFrame = 0;

    if (row === 0) {
      this.icon = "🐙";
      this.score = 30;
      this.color = "#f43f5e";
    } else if (row <= 2) {
      this.icon = "👾";
      this.score = 20;
      this.color = "#38bdf8";
    } else {
      this.icon = "👽";
      this.score = 10;
      this.color = "#a855f7";
    }
  }

  draw() {
    if (!this.alive) return;

    ctx.save();
    ctx.font = "16px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 4;
    ctx.fillText(this.icon, this.x + this.width / 2, this.y + this.height / 2);
    ctx.restore();
  }
}

/**
 * 弾丸クラス（自機弾 / 敵弾）
 */
class Bullet {
  constructor(x, y, vy, color, isPlayer = false) {
    this.x = x;
    this.y = y;
    this.width = 3;
    this.height = 9;
    this.vy = vy;
    this.color = color;
    this.isPlayer = isPlayer;
  }

  update() {
    this.y += this.vy;
  }

  draw() {
    ctx.save();
    ctx.fillStyle = this.color;
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 6;
    ctx.fillRect(this.x - this.width / 2, this.y, this.width, this.height);
    ctx.restore();
  }
}

/**
 * ボーナスUFOクラス
 */
class UFO {
  constructor() {
    this.width = 32;
    this.height = 16;
    this.y = 12;
    this.direction = Math.random() < 0.5 ? 1 : -1;
    this.x = this.direction === 1 ? -this.width : CANVAS_WIDTH;
    this.speed = 2.4 * this.direction;
    this.alive = true;
    this.score = [100, 150, 200, 300][Math.floor(Math.random() * 4)];
  }

  update() {
    this.x += this.speed;
    if ((this.direction === 1 && this.x > CANVAS_WIDTH + 20) ||
        (this.direction === -1 && this.x < -this.width - 20)) {
      this.alive = false;
    }
  }

  draw() {
    if (!this.alive) return;
    ctx.save();
    ctx.font = "18px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.shadowColor = "#ef4444";
    ctx.shadowBlur = 10;
    ctx.fillText("🛸", this.x + this.width / 2, this.y + this.height / 2);
    ctx.restore();
  }
}

/**
 * 防壁シールド（Bunker）クラス
 */
class Bunker {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.width = 36;
    this.height = 24;
    this.maxHp = 12; // 12発まで耐える
    this.hp = 12;
  }

  hit() {
    this.hp--;
    return this.hp <= 0;
  }

  draw() {
    if (this.hp <= 0) return;

    ctx.save();
    const alpha = this.hp / this.maxHp;
    ctx.fillStyle = `rgba(34, 197, 94, ${Math.max(0.2, alpha)})`;
    ctx.strokeStyle = "#15803d";
    ctx.lineWidth = 1.5;

    // アーチ型の防壁を描画
    ctx.beginPath();
    ctx.moveTo(this.x, this.y + this.height);
    ctx.lineTo(this.x, this.y + 6);
    ctx.quadraticCurveTo(this.x, this.y, this.x + 6, this.y);
    ctx.lineTo(this.x + this.width - 6, this.y);
    ctx.quadraticCurveTo(this.x + this.width, this.y, this.x + this.width, this.y + 6);
    ctx.lineTo(this.x + this.width, this.y + this.height);
    ctx.lineTo(this.x + this.width - 8, this.y + this.height);
    ctx.lineTo(this.x + this.width - 8, this.y + 12);
    ctx.lineTo(this.x + 8, this.y + 12);
    ctx.lineTo(this.x + 8, this.y + this.height);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.restore();
  }
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
  const saved = localStorage.getItem("invaders_best_score");
  if (saved !== null) {
    bestScore = parseInt(saved, 10);
    bestScoreDisplay.textContent = bestScore;
  }
}

function checkAndUpdateBestScore() {
  if (score > bestScore) {
    bestScore = score;
    localStorage.setItem("invaders_best_score", bestScore);
    bestScoreDisplay.textContent = bestScore;
    return true;
  }
  return false;
}

// ==========================================
// 6. ゲームの初期化と編隊構築
// ==========================================
function createAlienSwarm() {
  aliens = [];
  const startX = 24;
  const startY = 44;

  for (let r = 0; r < ALIEN_ROWS; r++) {
    for (let c = 0; c < ALIEN_COLS; c++) {
      const x = startX + c * (ALIEN_WIDTH + ALIEN_PADDING_X);
      const y = startY + r * (ALIEN_HEIGHT + ALIEN_PADDING_Y);
      aliens.push(new Alien(x, y, r));
    }
  }

  alienDirX = 1;
  alienMoveTimer = 0;
}

function createBunkers() {
  bunkers = [];
  const bunkerSpacing = (CANVAS_WIDTH - 36 * 4) / 5;
  const y = CANVAS_HEIGHT - 80;

  for (let i = 0; i < 4; i++) {
    const x = bunkerSpacing + i * (36 + bunkerSpacing);
    bunkers.push(new Bunker(x, y));
  }
}

function initGame() {
  player = new Player();
  playerBullets = [];
  enemyBullets = [];
  ufo = null;
  particles = [];
  floatingTexts = [];

  score = 0;
  lives = 3;
  wave = 1;
  ufoTimer = 600;

  scoreDisplay.textContent = "0";
  waveDisplay.textContent = "1";
  updateLivesUI();

  createAlienSwarm();
  createBunkers();
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
  playerBullets = [];
  enemyBullets = [];
  ufo = null;

  createAlienSwarm();
  createBunkers();

  clearOverlay.classList.add("hidden");
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
  // 1. 自機の更新
  player.update();

  // 2. 【エイリアン編隊の同期移動（テンポ加速＆境界反転）】
  const livingAliens = aliens.filter(a => a.alive);
  if (livingAliens.length === 0) {
    handleWaveClear();
    return;
  }

  // 生存数に応じたインターバル（32体: 35フレーム 〜 1体: 3フレーム）
  const moveInterval = Math.max(3, Math.floor((livingAliens.length / 32) * 35));
  alienMoveTimer++;

  if (alienMoveTimer >= moveInterval) {
    alienMoveTimer = 0;

    // 画面端に到達したエイリアンがいるか確認
    let hitEdge = false;
    livingAliens.forEach(alien => {
      if (alienDirX === 1 && alien.x + alien.width >= CANVAS_WIDTH - 12) hitEdge = true;
      if (alienDirX === -1 && alien.x <= 12) hitEdge = true;
    });

    if (hitEdge) {
      // 進行方向反転＆1段下降
      alienDirX = -alienDirX;
      livingAliens.forEach(alien => alien.y += alienStepY);
    } else {
      // 横移動
      livingAliens.forEach(alien => alien.x += alienStepX * alienDirX);
    }

    // 最下段侵略判定（防衛ライン到達でゲームオーバー）
    const lowestAlienY = Math.max(...livingAliens.map(a => a.y + a.height));
    if (lowestAlienY >= player.y - 4) {
      handleGameOver("エイリアンに侵略されてしまいました！");
      return;
    }
  }

  // 3. 【最前列エイリアンからの敵迎撃弾の投下】
  if (Math.random() < 0.035 + wave * 0.005 && enemyBullets.length < 4) {
    // 列ごとに一番下のエイリアンを抽出
    const bottomAliens = [];
    for (let c = 0; c < ALIEN_COLS; c++) {
      const colAliens = livingAliens.filter(a => Math.round((a.x - 24) / (ALIEN_WIDTH + ALIEN_PADDING_X)) === c);
      if (colAliens.length > 0) {
        colAliens.sort((a, b) => b.y - a.y);
        bottomAliens.push(colAliens[0]);
      }
    }
    if (bottomAliens.length > 0) {
      const shooter = bottomAliens[Math.floor(Math.random() * bottomAliens.length)];
      enemyBullets.push(new Bullet(shooter.x + shooter.width / 2, shooter.y + shooter.height, 3.8 + wave * 0.3, "#f43f5e", false));
    }
  }

  // 4. 【ボーナスUFOの管理】
  ufoTimer--;
  if (ufoTimer <= 0 && !ufo) {
    ufo = new UFO();
    ufoTimer = 700 + Math.floor(Math.random() * 400);
  }
  if (ufo) {
    ufo.update();
    if (!ufo.alive) ufo = null;
  }

  // 5. 【自機弾の移動と当たり判定】
  playerBullets.forEach(bullet => {
    bullet.update();

    // エイリアンとの判定
    livingAliens.forEach(alien => {
      if (
        alien.alive &&
        bullet.x >= alien.x &&
        bullet.x <= alien.x + alien.width &&
        bullet.y >= alien.y &&
        bullet.y <= alien.y + alien.height
      ) {
        alien.alive = false;
        bullet.y = -100; // 弾削除
        score += alien.score;
        scoreDisplay.textContent = score;

        floatingTexts.push(new FloatingText(`+${alien.score}`, alien.x + alien.width / 2, alien.y, alien.color));
        createExplosionParticles(alien.x + alien.width / 2, alien.y + alien.height / 2, alien.color, 14);
      }
    });

    // UFOとの判定
    if (
      ufo && ufo.alive &&
      bullet.x >= ufo.x &&
      bullet.x <= ufo.x + ufo.width &&
      bullet.y >= ufo.y &&
      bullet.y <= ufo.y + ufo.height
    ) {
      ufo.alive = false;
      bullet.y = -100;
      score += ufo.score;
      scoreDisplay.textContent = score;

      floatingTexts.push(new FloatingText(`+${ufo.score} UFO!`, ufo.x + ufo.width / 2, ufo.y, "#ef4444"));
      createExplosionParticles(ufo.x + ufo.width / 2, ufo.y + ufo.height / 2, "#ef4444", 20);
      ufo = null;
    }

    // 防壁シールドとの判定（自機弾でもシールドが削れる）
    bunkers.forEach(bunker => {
      if (
        bunker.hp > 0 &&
        bullet.x >= bunker.x &&
        bullet.x <= bunker.x + bunker.width &&
        bullet.y >= bunker.y &&
        bullet.y <= bunker.y + bunker.height
      ) {
        bunker.hit();
        bullet.y = -100;
        createExplosionParticles(bullet.x, bullet.y, "#22c55e", 4);
      }
    });
  });
  playerBullets = playerBullets.filter(b => b.y > 0);

  // 6. 【敵弾の移動と自機/シールド当たり判定】
  enemyBullets.forEach(bullet => {
    bullet.update();

    // 防壁シールドとの判定
    bunkers.forEach(bunker => {
      if (
        bunker.hp > 0 &&
        bullet.x >= bunker.x &&
        bullet.x <= bunker.x + bunker.width &&
        bullet.y >= bunker.y &&
        bullet.y <= bunker.y + bunker.height
      ) {
        bunker.hit();
        bullet.y = CANVAS_HEIGHT + 100;
        createExplosionParticles(bullet.x, bullet.y, "#f43f5e", 4);
      }
    });

    // 自機との判定
    if (
      bullet.x >= player.x &&
      bullet.x <= player.x + player.width &&
      bullet.y >= player.y &&
      bullet.y <= player.y + player.height
    ) {
      bullet.y = CANVAS_HEIGHT + 100;
      handlePlayerHit();
    }
  });
  enemyBullets = enemyBullets.filter(b => b.y < CANVAS_HEIGHT);

  // 7. パーティクル・浮遊テキストの更新
  particles.forEach(p => p.update());
  particles = particles.filter(p => p.alpha > 0);

  floatingTexts.forEach(t => t.update());
  floatingTexts = floatingTexts.filter(t => t.alpha > 0);
}

// 被弾処理
function handlePlayerHit() {
  lives--;
  updateLivesUI();
  triggerScreenShake();
  createExplosionParticles(player.x + player.width / 2, player.y + player.height / 2, "#f43f5e", 20);

  if (lives <= 0) {
    handleGameOver("自機が大破してしまいました！");
  } else {
    // 自機位置リセット
    player.x = (CANVAS_WIDTH - player.width) / 2;
  }
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

function createExplosionParticles(x, y, color, count = 10) {
  for (let i = 0; i < count; i++) {
    particles.push(new Particle(x, y, color));
  }
}

function handleWaveClear() {
  isRunning = false;
  score += 500 * wave; // ウェーブクリアボーナス
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

// ==========================================
// 9. 描画処理 (Draw)
// ==========================================
function draw() {
  // 1. 画面クリア
  ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  // 2. 防衛ライン（下部点線）
  ctx.strokeStyle = "rgba(34, 197, 94, 0.25)";
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(0, CANVAS_HEIGHT - 38);
  ctx.lineTo(CANVAS_WIDTH, CANVAS_HEIGHT - 38);
  ctx.stroke();
  ctx.setLineDash([]);

  // 3. 防壁シールドの描画
  bunkers.forEach(b => b.draw());

  // 4. UFOの描画
  if (ufo) ufo.draw();

  // 5. エイリアンの描画
  aliens.forEach(a => a.draw());

  // 6. 弾丸の描画
  playerBullets.forEach(b => b.draw());
  enemyBullets.forEach(b => b.draw());

  // 7. パーティクル・浮遊テキストの描画
  particles.forEach(p => p.draw());
  floatingTexts.forEach(t => t.draw());

  // 8. 自機の描画
  if (player && lives > 0) player.draw();
}

// ==========================================
// 10. イベントリスナー（キーボード・スマホ操作）
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
    } else if (isRunning) {
      player.shoot();
    }
  }
});

window.addEventListener("keyup", (e) => {
  if (keys.hasOwnProperty(e.code)) {
    keys[e.code] = false;
    e.preventDefault();
  }
});

// スマホ用ボタン操作
btnLeft.addEventListener("touchstart", (e) => { e.preventDefault(); keys.ArrowLeft = true; }, { passive: false });
btnLeft.addEventListener("touchend", (e) => { e.preventDefault(); keys.ArrowLeft = false; }, { passive: false });
btnLeft.addEventListener("mousedown", () => { keys.ArrowLeft = true; });
btnLeft.addEventListener("mouseup", () => { keys.ArrowLeft = false; });

btnRight.addEventListener("touchstart", (e) => { e.preventDefault(); keys.ArrowRight = true; }, { passive: false });
btnRight.addEventListener("touchend", (e) => { e.preventDefault(); keys.ArrowRight = false; }, { passive: false });
btnRight.addEventListener("mousedown", () => { keys.ArrowRight = true; });
btnRight.addEventListener("mouseup", () => { keys.ArrowRight = false; });

btnShoot.addEventListener("touchstart", (e) => { e.preventDefault(); if (isRunning) player.shoot(); }, { passive: false });
btnShoot.addEventListener("mousedown", () => { if (isRunning) player.shoot(); });

// Canvasタッチドラッグ＆タップ発射
canvas.addEventListener("touchstart", (e) => {
  e.preventDefault();
  if (e.touches.length > 0) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    player.x = (e.touches[0].clientX - rect.left) * scaleX - player.width / 2;
    if (isRunning) player.shoot();
  }
}, { passive: false });

canvas.addEventListener("touchmove", (e) => {
  e.preventDefault();
  if (e.touches.length > 0) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    player.x = (e.touches[0].clientX - rect.left) * scaleX - player.width / 2;
  }
}, { passive: false });

// スタート・次ウェーブ・リトライボタン
startBtn.addEventListener("click", startGame);
nextWaveBtn.addEventListener("click", startNextWave);
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
