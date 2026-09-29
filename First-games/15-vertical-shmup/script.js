/**
 * ========================================================
 * 15 縦スクロール空中戦 (Vertical SHMUP) - JavaScript
 * ========================================================
 * このファイルでは、以下の重要プログラミング知識を学びます：
 * 1. 2重の星空パララックス背景（無限縦スクロール）
 * 2. 三角関数（Math.sin）を用いた敵機の滑らかな曲線飛行
 * 3. 自機狙い弾の角度計算（Math.atan2）と扇状放射弾幕 (Fan Spread)
 * 4. 自機ショットの多段強化（シングル / ツイン / 3WAY）
 * 5. シールドバリアとメガボム（全画面攻撃）の状態管理
 * 6. 巨大ボス戦艦のステートマシン（登場・多段攻撃・破壊演出）
 * 7. スマホタッチ追従操作（指先へのスムーズな移動とオート連射）
 */

// ==========================================
// 1. Canvasの初期化と定数設定
// ==========================================
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const CANVAS_WIDTH = canvas.width;   // 380
const CANVAS_HEIGHT = canvas.height; // 480

// ==========================================
// 2. DOM要素の取得
// ==========================================
const gameContainer = document.getElementById("game-container");
const scoreDisplay = document.getElementById("score-display");
const livesDisplay = document.getElementById("lives-display");
const bombsDisplay = document.getElementById("bombs-display");
const bestScoreDisplay = document.getElementById("best-score-display");
const bossHud = document.getElementById("boss-hud");
const bossHpFill = document.getElementById("boss-hp-fill");
const bossHpText = document.getElementById("boss-hp-text");
const startOverlay = document.getElementById("start-overlay");
const clearOverlay = document.getElementById("clear-overlay");
const gameoverOverlay = document.getElementById("gameover-overlay");
const gameoverReason = document.getElementById("gameover-reason");
const startBtn = document.getElementById("start-btn");
const restartClearBtn = document.getElementById("restart-clear-btn");
const restartBtn = document.getElementById("restart-btn");
const clearScoreEl = document.getElementById("clear-score");
const finalScoreEl = document.getElementById("final-score");
const newRecordBadge = document.getElementById("new-record-badge");
const btnBomb = document.getElementById("btn-bomb");

// ==========================================
// 3. ゲームの状態変数
// ==========================================
let isRunning = false;
let score = 0;
let lives = 3;
let bombs = 2;
let bestScore = 0;
let frameCount = 0;

// エンティティ
let player = null;
let enemies = [];
let playerBullets = [];
let enemyBullets = [];
let items = [];
let particles = [];
let floatingTexts = [];
let stars = [];
let boss = null;

// ボス戦フラグ
let bossAppeared = false;

// キーボード入力管理
const keys = {
  ArrowUp: false,
  ArrowDown: false,
  ArrowLeft: false,
  ArrowRight: false,
  KeyW: false,
  KeyS: false,
  KeyA: false,
  KeyD: false,
  Space: false
};

// ==========================================
// 4. クラス定義
// ==========================================

/**
 * プレイヤークラス（戦闘機）
 */
class Player {
  constructor() {
    this.width = 28;
    this.height = 32;
    this.x = (CANVAS_WIDTH - this.width) / 2;
    this.y = CANVAS_HEIGHT - 60;
    this.speed = 5.2;
    this.powerLevel = 1; // 1: シングル, 2: ツイン, 3: 3WAY
    this.hasShield = false;
    this.shootCooldown = 0;
    this.invincibleTimer = 0;
  }

  update() {
    // キーボード操作
    if (keys.ArrowUp || keys.KeyW) this.y -= this.speed;
    if (keys.ArrowDown || keys.KeyS) this.y += this.speed;
    if (keys.ArrowLeft || keys.KeyA) this.x -= this.speed;
    if (keys.ArrowRight || keys.KeyD) this.x += this.speed;

    // 画面外制限
    this.x = Math.max(4, Math.min(CANVAS_WIDTH - this.width - 4, this.x));
    this.y = Math.max(10, Math.min(CANVAS_HEIGHT - this.height - 10, this.y));

    // オート連射
    if (this.shootCooldown > 0) this.shootCooldown--;
    if (isRunning && this.shootCooldown <= 0) {
      this.shoot();
    }

    if (this.invincibleTimer > 0) this.invincibleTimer--;
  }

  shoot() {
    const cx = this.x + this.width / 2;
    const cy = this.y;

    if (this.powerLevel === 1) {
      // シングルショット
      playerBullets.push(new PlayerBullet(cx, cy, 0, -9.0));
    } else if (this.powerLevel === 2) {
      // 2連装ショット
      playerBullets.push(new PlayerBullet(cx - 6, cy, 0, -9.0));
      playerBullets.push(new PlayerBullet(cx + 6, cy, 0, -9.0));
    } else {
      // 3WAYワイドショット
      playerBullets.push(new PlayerBullet(cx, cy, 0, -9.5));
      playerBullets.push(new PlayerBullet(cx - 6, cy, -1.8, -9.0));
      playerBullets.push(new PlayerBullet(cx + 6, cy, 1.8, -9.0));
    }

    this.shootCooldown = 8; // 発射間隔
  }

  draw() {
    if (this.invincibleTimer > 0 && Math.floor(this.invincibleTimer / 4) % 2 === 0) {
      return; // 無敵点滅
    }

    ctx.save();
    // シールドバリアのオーラ
    if (this.hasShield) {
      ctx.strokeStyle = "#38bdf8";
      ctx.lineWidth = 2.5;
      ctx.shadowColor = "#38bdf8";
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(this.x + this.width / 2, this.y + this.height / 2, 22, 0, Math.PI * 2);
      ctx.stroke();
    }

    // 戦闘機本体（ジェット機デザイン）
    ctx.fillStyle = "#38bdf8";
    ctx.shadowColor = "#38bdf8";
    ctx.shadowBlur = 8;

    // 胴体
    ctx.beginPath();
    ctx.moveTo(this.x + this.width / 2, this.y);
    ctx.lineTo(this.x + this.width, this.y + this.height);
    ctx.lineTo(this.x + this.width / 2, this.y + this.height - 6);
    ctx.lineTo(this.x, this.y + this.height);
    ctx.closePath();
    ctx.fill();

    // コックピット（白）
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.ellipse(this.x + this.width / 2, this.y + 12, 3, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // バーニアの噴射火花
    ctx.fillStyle = "#f59e0b";
    ctx.beginPath();
    ctx.moveTo(this.x + this.width / 2 - 4, this.y + this.height - 4);
    ctx.lineTo(this.x + this.width / 2 + 4, this.y + this.height - 4);
    ctx.lineTo(this.x + this.width / 2, this.y + this.height + 6 + Math.random() * 4);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }
}

/**
 * 敵機クラス（ドローン・戦闘機・重爆撃機）
 */
class Enemy {
  constructor(type, startX) {
    this.type = type; // "drone" | "fighter" | "bomber"
    this.x = startX;
    this.y = -30;
    this.alive = true;
    this.time = 0;
    this.startX = startX;

    if (type === "drone") {
      this.width = 24;
      this.height = 24;
      this.hp = 2;
      this.score = 50;
      this.color = "#a855f7";
      this.vy = 3.0;
    } else if (type === "fighter") {
      this.width = 28;
      this.height = 28;
      this.hp = 4;
      this.score = 100;
      this.color = "#f43f5e";
      this.vy = 2.4;
      this.shootTimer = 40;
    } else if (type === "bomber") {
      this.width = 44;
      this.height = 36;
      this.hp = 14;
      this.score = 300;
      this.color = "#eab308";
      this.vy = 1.2;
      this.shootTimer = 50;
    }
  }

  update() {
    this.time += 0.05;
    this.y += this.vy;

    // サインカーブ飛行（戦闘機）
    if (this.type === "fighter") {
      this.x = this.startX + Math.sin(this.time * 2) * 50;

      // 自機狙い弾の発射
      this.shootTimer--;
      if (this.shootTimer <= 0 && this.y > 20 && this.y < CANVAS_HEIGHT - 100) {
        this.shootAimingBullet();
        this.shootTimer = 90;
      }
    }

    // 扇状弾幕（重爆撃機）
    if (this.type === "bomber") {
      this.shootTimer--;
      if (this.shootTimer <= 0 && this.y > 30 && this.y < CANVAS_HEIGHT - 120) {
        this.shootSpreadBullets();
        this.shootTimer = 100;
      }
    }

    // 画面外で削除
    if (this.y > CANVAS_HEIGHT + 40) this.alive = false;
  }

  // 自機狙い弾（Math.atan2）
  shootAimingBullet() {
    if (!player) return;
    const angle = Math.atan2(
      player.y + player.height / 2 - (this.y + this.height),
      player.x + player.width / 2 - (this.x + this.width / 2)
    );
    const speed = 4.0;
    enemyBullets.push(new EnemyBullet(
      this.x + this.width / 2,
      this.y + this.height,
      Math.cos(angle) * speed,
      Math.sin(angle) * speed,
      "#f43f5e"
    ));
  }

  // 3WAY扇状弾幕
  shootSpreadBullets() {
    const cx = this.x + this.width / 2;
    const cy = this.y + this.height;
    const speed = 3.6;

    enemyBullets.push(new EnemyBullet(cx, cy, 0, speed, "#eab308"));
    enemyBullets.push(new EnemyBullet(cx, cy, -1.2, speed * 0.95, "#eab308"));
    enemyBullets.push(new EnemyBullet(cx, cy, 1.2, speed * 0.95, "#eab308"));
  }

  draw() {
    if (!this.alive) return;

    ctx.save();
    ctx.fillStyle = this.color;
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 6;

    if (this.type === "drone") {
      // 逆三角形ドローン
      ctx.beginPath();
      ctx.moveTo(this.x + this.width / 2, this.y + this.height);
      ctx.lineTo(this.x + this.width, this.y);
      ctx.lineTo(this.x, this.y);
      ctx.closePath();
      ctx.fill();
    } else if (this.type === "fighter") {
      // 赤い戦闘機
      ctx.beginPath();
      ctx.moveTo(this.x + this.width / 2, this.y + this.height);
      ctx.lineTo(this.x + this.width, this.y + 4);
      ctx.lineTo(this.x + this.width / 2, this.y);
      ctx.lineTo(this.x, this.y + 4);
      ctx.closePath();
      ctx.fill();
    } else if (this.type === "bomber") {
      // 重爆撃機
      drawRoundedRect(this.x, this.y, this.width, this.height, 6);
      ctx.fillStyle = "#ef4444";
      ctx.fillRect(this.x + 8, this.y + this.height - 6, this.width - 16, 6);
    }
    ctx.restore();
  }
}

/**
 * 巨大ボス戦艦クラス
 */
class Boss {
  constructor() {
    this.width = 140;
    this.height = 70;
    this.x = (CANVAS_WIDTH - this.width) / 2;
    this.y = -80;
    this.targetY = 40;
    this.maxHp = 180;
    this.hp = this.maxHp;
    this.alive = true;
    this.state = "entering"; // "entering" | "fight" | "dying"
    this.time = 0;
    this.attackTimer = 0;
  }

  update() {
    this.time += 0.04;

    if (this.state === "entering") {
      // 上空から降下入場
      this.y += 1.2;
      if (this.y >= this.targetY) {
        this.y = this.targetY;
        this.state = "fight";
      }
    } else if (this.state === "fight") {
      // 左右にゆったり旋回
      this.x = (CANVAS_WIDTH - this.width) / 2 + Math.sin(this.time) * 80;

      // 多彩な弾幕攻撃
      this.attackTimer++;

      // パターン1: 5WAY扇状弾幕 (1.5秒ごと)
      if (this.attackTimer % 90 === 0) {
        this.shoot5Way();
      }

      // パターン2: 高速自機狙い連射 (3秒ごと)
      if (this.attackTimer % 180 === 40 || this.attackTimer % 180 === 55 || this.attackTimer % 180 === 70) {
        this.shootAimingBeam();
      }
    }

    // ボスHPバー更新
    const pct = Math.max(0, (this.hp / this.maxHp) * 100);
    bossHpFill.style.width = `${pct}%`;
    bossHpText.textContent = `${Math.ceil(pct)}%`;
  }

  shoot5Way() {
    const cx = this.x + this.width / 2;
    const cy = this.y + this.height - 10;
    const angles = [-0.6, -0.3, 0, 0.3, 0.6];
    angles.forEach(ang => {
      const speed = 3.6;
      enemyBullets.push(new EnemyBullet(cx, cy, Math.sin(ang) * speed, Math.cos(ang) * speed, "#ef4444"));
    });
  }

  shootAimingBeam() {
    if (!player) return;
    const cx = this.x + this.width / 2;
    const cy = this.y + this.height - 10;
    const angle = Math.atan2(player.y - cy, player.x + player.width / 2 - cx);
    const speed = 5.5;
    enemyBullets.push(new EnemyBullet(cx, cy, Math.cos(angle) * speed, Math.sin(angle) * speed, "#38bdf8"));
  }

  hit(damage = 1) {
    this.hp -= damage;
    if (this.hp <= 0 && this.alive) {
      this.alive = false;
      handleBossDefeated();
    }
  }

  draw() {
    if (!this.alive) return;

    ctx.save();
    ctx.fillStyle = "#1e293b";
    ctx.strokeStyle = "#ef4444";
    ctx.lineWidth = 2.5;
    ctx.shadowColor = "#ef4444";
    ctx.shadowBlur = 12;

    // 巨大戦艦の外殻
    ctx.beginPath();
    ctx.moveTo(this.x + this.width / 2, this.y + this.height);
    ctx.lineTo(this.x + this.width, this.y + this.height - 20);
    ctx.lineTo(this.x + this.width - 20, this.y);
    ctx.lineTo(this.x + 20, this.y);
    ctx.lineTo(this.x, this.y + this.height - 20);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 中央コア（赤く発光）
    ctx.fillStyle = "#ef4444";
    ctx.beginPath();
    ctx.arc(this.x + this.width / 2, this.y + this.height / 2, 14, 0, Math.PI * 2);
    ctx.fill();

    // 主砲
    ctx.fillStyle = "#f59e0b";
    ctx.fillRect(this.x + this.width / 2 - 4, this.y + this.height - 6, 8, 12);
    ctx.restore();
  }
}

/**
 * 自機弾クラス
 */
class PlayerBullet {
  constructor(x, y, vx, vy) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.width = 4;
    this.height = 12;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
  }

  draw() {
    ctx.save();
    ctx.fillStyle = "#38bdf8";
    ctx.shadowColor = "#38bdf8";
    ctx.shadowBlur = 8;
    ctx.fillRect(this.x - this.width / 2, this.y, this.width, this.height);
    ctx.restore();
  }
}

/**
 * 敵弾クラス
 */
class EnemyBullet {
  constructor(x, y, vx, vy, color) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.radius = 4;
    this.color = color || "#f43f5e";
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
  }

  draw() {
    ctx.save();
    ctx.fillStyle = this.color;
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

/**
 * アイテムカプセル（P / S / B）
 */
class Item {
  constructor(x, y, type) {
    this.x = x;
    this.y = y;
    this.type = type; // "P" (Power) | "S" (Shield) | "B" (Bomb)
    this.vy = 1.8;
    this.radius = 12;

    if (type === "P") this.color = "#f43f5e";
    if (type === "S") this.color = "#38bdf8";
    if (type === "B") this.color = "#f59e0b";
  }

  update() {
    this.y += this.vy;
  }

  draw() {
    ctx.save();
    ctx.fillStyle = this.color;
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 11px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(this.type, this.x, this.y);
    ctx.restore();
  }
}

/**
 * パーティクル
 */
class Particle {
  constructor(x, y, color, speedScale = 1.0) {
    this.x = x;
    this.y = y;
    this.color = color;
    this.radius = Math.random() * 3 + 1.5;
    const angle = Math.random() * Math.PI * 2;
    const speed = (Math.random() * 4 + 1.5) * speedScale;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.alpha = 1.0;
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
    this.vy = -1.5;
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
  const saved = localStorage.getItem("shmup_best_score");
  if (saved !== null) {
    bestScore = parseInt(saved, 10);
    bestScoreDisplay.textContent = bestScore;
  }
}

function checkAndUpdateBestScore() {
  if (score > bestScore) {
    bestScore = score;
    localStorage.setItem("shmup_best_score", bestScore);
    bestScoreDisplay.textContent = bestScore;
    return true;
  }
  return false;
}

// ==========================================
// 6. 星空背景の初期化
// ==========================================
function initStars() {
  stars = [];
  for (let i = 0; i < 60; i++) {
    stars.push({
      x: Math.random() * CANVAS_WIDTH,
      y: Math.random() * CANVAS_HEIGHT,
      size: Math.random() * 2 + 0.8,
      speed: Math.random() * 2 + 1,
      color: Math.random() < 0.3 ? "#7dd3fc" : "#ffffff"
    });
  }
}

// ==========================================
// 7. ゲーム初期化と開始
// ==========================================
function initGame() {
  player = new Player();
  enemies = [];
  playerBullets = [];
  enemyBullets = [];
  items = [];
  particles = [];
  floatingTexts = [];
  boss = null;
  bossAppeared = false;

  score = 0;
  lives = 3;
  bombs = 2;
  frameCount = 0;

  scoreDisplay.textContent = "0";
  bombsDisplay.textContent = `💣x${bombs}`;
  updateLivesUI();
  bossHud.classList.add("hidden");

  initStars();
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
// 8. メインゲームループ (Game Loop)
// ==========================================
function gameLoop() {
  if (!isRunning) return;

  update();
  draw();

  frameCount++;
  requestAnimationFrame(gameLoop);
}

// ==========================================
// 9. 状態更新処理 (Update)
// ==========================================
function update() {
  // 1. 星空スクロール
  stars.forEach(s => {
    s.y += s.speed;
    if (s.y > CANVAS_HEIGHT) {
      s.y = -5;
      s.x = Math.random() * CANVAS_WIDTH;
    }
  });

  // 2. 自機の更新
  player.update();

  // 3. 【敵機のスポーン管理】
  if (!bossAppeared) {
    // 雑魚ウェーブ
    if (frameCount % 45 === 0) {
      const randX = Math.random() * (CANVAS_WIDTH - 60) + 30;
      enemies.push(new Enemy("drone", randX));
    }
    if (frameCount % 120 === 0) {
      const randX = Math.random() * (CANVAS_WIDTH - 80) + 40;
      enemies.push(new Enemy("fighter", randX));
    }
    if (frameCount % 300 === 0) {
      const randX = Math.random() * (CANVAS_WIDTH - 100) + 50;
      enemies.push(new Enemy("bomber", randX));
    }

    // スコアが2,500点に達したらボス出現！
    if (score >= 2500 && !bossAppeared) {
      triggerBossBattle();
    }
  }

  // 4. ボスの更新
  if (boss) {
    boss.update();
  }

  // 5. 敵機の更新
  enemies.forEach(e => e.update());
  enemies = enemies.filter(e => e.alive);

  // 6. 弾丸の更新
  playerBullets.forEach(b => b.update());
  playerBullets = playerBullets.filter(b => b.y > -20 && b.x > 0 && b.x < CANVAS_WIDTH);

  enemyBullets.forEach(b => b.update());
  enemyBullets = enemyBullets.filter(b => b.y < CANVAS_HEIGHT + 20 && b.x > 0 && b.x < CANVAS_WIDTH);

  // 7. アイテムの更新
  items.forEach(item => {
    item.update();
    // 自機とのキャッチ判定
    const dx = item.x - (player.x + player.width / 2);
    const dy = item.y - (player.y + player.height / 2);
    if (dx * dx + dy * dy < (item.radius + 14) * (item.radius + 14)) {
      applyItem(item.type);
      item.y = CANVAS_HEIGHT + 100;
      floatingTexts.push(new FloatingText(`${item.type} GET!`, player.x + player.width / 2, player.y - 10, item.color));
    }
  });
  items = items.filter(i => i.y < CANVAS_HEIGHT + 30);

  // 8. 【自機弾 vs 敵機 / ボスの当たり判定】
  playerBullets.forEach(bullet => {
    // 雑魚敵との判定
    enemies.forEach(enemy => {
      if (
        enemy.alive &&
        bullet.x >= enemy.x &&
        bullet.x <= enemy.x + enemy.width &&
        bullet.y >= enemy.y &&
        bullet.y <= enemy.y + enemy.height
      ) {
        bullet.y = -100; // 弾消去
        enemy.hp--;
        createExplosionParticles(bullet.x, bullet.y, enemy.color, 4);

        if (enemy.hp <= 0) {
          enemy.alive = false;
          score += enemy.score;
          scoreDisplay.textContent = score;

          floatingTexts.push(new FloatingText(`+${enemy.score}`, enemy.x + enemy.width / 2, enemy.y, enemy.color));
          createExplosionParticles(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, enemy.color, 14);

          // アイテムドロップ (25%)
          if (Math.random() < 0.25) {
            spawnRandomItem(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2);
          }
        }
      }
    });

    // ボスとの判定
    if (
      boss && boss.alive && boss.state === "fight" &&
      bullet.x >= boss.x &&
      bullet.x <= boss.x + boss.width &&
      bullet.y >= boss.y &&
      bullet.y <= boss.y + boss.height
    ) {
      bullet.y = -100;
      boss.hit(1);
      createExplosionParticles(bullet.x, bullet.y, "#ef4444", 4);
    }
  });

  // 9. 【敵弾 / 敵機 vs 自機の被弾判定】
  if (player.invincibleTimer <= 0) {
    // 敵弾との判定
    enemyBullets.forEach(bullet => {
      const dx = bullet.x - (player.x + player.width / 2);
      const dy = bullet.y - (player.y + player.height / 2);
      if (dx * dx + dy * dy < (bullet.radius + 8) * (bullet.radius + 8)) {
        bullet.y = CANVAS_HEIGHT + 100;
        handlePlayerDamage();
      }
    });

    // 敵機本体との体当たり判定
    enemies.forEach(enemy => {
      if (
        enemy.alive &&
        player.x < enemy.x + enemy.width &&
        player.x + player.width > enemy.x &&
        player.y < enemy.y + enemy.height &&
        player.y + player.height > enemy.y
      ) {
        enemy.alive = false;
        createExplosionParticles(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, enemy.color, 16);
        handlePlayerDamage();
      }
    });
  }

  // 10. パーティクル・浮遊テキストの更新
  particles.forEach(p => p.update());
  particles = particles.filter(p => p.alpha > 0);

  floatingTexts.forEach(t => t.update());
  floatingTexts = floatingTexts.filter(t => t.alpha > 0);
}

// アイテム生成
function spawnRandomItem(x, y) {
  const rand = Math.random();
  let type = "P";
  if (rand < 0.5) type = "P";
  else if (rand < 0.8) type = "S";
  else type = "B";

  items.push(new Item(x, y, type));
}

// アイテム効果
function applyItem(type) {
  if (type === "P") {
    if (player.powerLevel < 3) player.powerLevel++;
  } else if (type === "S") {
    player.hasShield = true;
  } else if (type === "B") {
    bombs++;
    bombsDisplay.textContent = `💣x${bombs}`;
  }
}

// 自機被弾処理
function handlePlayerDamage() {
  if (player.hasShield) {
    // シールドで無効化
    player.hasShield = false;
    player.invincibleTimer = 40;
    createExplosionParticles(player.x + player.width / 2, player.y + player.height / 2, "#38bdf8", 12);
    floatingTexts.push(new FloatingText("SHIELD BREAK!", player.x + player.width / 2, player.y, "#38bdf8"));
    return;
  }

  lives--;
  updateLivesUI();
  triggerScreenShake();
  createExplosionParticles(player.x + player.width / 2, player.y + player.height / 2, "#ef4444", 24);

  if (lives <= 0) {
    handleGameOver();
  } else {
    // パワーダウン＆無敵時間リスポーン
    player.powerLevel = Math.max(1, player.powerLevel - 1);
    player.invincibleTimer = 90;
    player.x = (CANVAS_WIDTH - player.width) / 2;
    player.y = CANVAS_HEIGHT - 60;
  }
}

// メガボム発動
function useMegaBomb() {
  if (!isRunning || bombs <= 0) return;
  bombs--;
  bombsDisplay.textContent = `💣x${bombs}`;

  triggerScreenShake();

  // 画面内の全敵弾を一掃
  enemyBullets.forEach(b => createExplosionParticles(b.x, b.y, "#fbbf24", 6));
  enemyBullets = [];

  // 全雑魚敵に大ダメージ
  enemies.forEach(e => {
    e.alive = false;
    score += e.score;
    createExplosionParticles(e.x + e.width / 2, e.y + e.height / 2, e.color, 16);
  });
  scoreDisplay.textContent = score;

  // ボスに特大ダメージ (30)
  if (boss && boss.alive) {
    boss.hit(30);
    createExplosionParticles(boss.x + boss.width / 2, boss.y + boss.height / 2, "#f59e0b", 30);
  }

  floatingTexts.push(new FloatingText("💥 MEGA BOMB!!", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, "#fbbf24"));
}

// ボス戦突入
function triggerBossBattle() {
  bossAppeared = true;
  bossHud.classList.remove("hidden");
  triggerScreenShake();

  // 雑魚を一掃してボス登場
  enemies = [];
  boss = new Boss();
  floatingTexts.push(new FloatingText("🚨 WARNING! BOSS APPROACHING 🚨", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 40, "#ef4444"));
}

// ボス撃破
function handleBossDefeated() {
  score += 5000;
  scoreDisplay.textContent = score;
  checkAndUpdateBestScore();

  // 大爆発パーティクル
  for (let i = 0; i < 40; i++) {
    particles.push(new Particle(boss.x + Math.random() * boss.width, boss.y + Math.random() * boss.height, "#ef4444", 2.0));
  }

  boss = null;
  bossHud.classList.add("hidden");

  setTimeout(() => {
    isRunning = false;
    clearScoreEl.textContent = score;
    clearOverlay.classList.remove("hidden");
  }, 1000);
}

function triggerScreenShake() {
  gameContainer.classList.remove("screen-shake");
  void gameContainer.offsetWidth;
  gameContainer.classList.add("screen-shake");
}

function updateLivesUI() {
  let ships = "";
  for (let i = 0; i < lives; i++) ships += "🚀";
  livesDisplay.textContent = ships || "💀";
}

function createExplosionParticles(x, y, color, count = 10) {
  for (let i = 0; i < count; i++) {
    particles.push(new Particle(x, y, color));
  }
}

function handleGameOver() {
  isRunning = false;
  const isNewRecord = checkAndUpdateBestScore();

  finalScoreEl.textContent = score;
  if (isNewRecord) {
    newRecordBadge.classList.remove("hidden");
  } else {
    newRecordBadge.classList.add("hidden");
  }

  gameoverOverlay.classList.remove("hidden");
}

// ==========================================
// 10. 描画処理 (Draw)
// ==========================================
function draw() {
  // 1. 画面クリア
  ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  // 2. 星空背景の描画
  stars.forEach(s => {
    ctx.fillStyle = s.color;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
    ctx.fill();
  });

  // 3. アイテムの描画
  items.forEach(i => i.draw());

  // 4. 弾丸の描画
  playerBullets.forEach(b => b.draw());
  enemyBullets.forEach(b => b.draw());

  // 5. 敵機の描画
  enemies.forEach(e => e.draw());

  // 6. ボスの描画
  if (boss) boss.draw();

  // 7. パーティクル・浮遊テキスト
  particles.forEach(p => p.draw());
  floatingTexts.forEach(t => t.draw());

  // 8. 自機の描画
  if (player && lives > 0) player.draw();
}

// ==========================================
// 11. イベントリスナー（キーボード・タッチ追従・ボム）
// ==========================================

// キーボード
window.addEventListener("keydown", (e) => {
  if (keys.hasOwnProperty(e.code)) {
    keys[e.code] = true;
    e.preventDefault();
  }
  if (e.code === "KeyB") {
    useMegaBomb();
  }
  if (e.code === "Space" && !isRunning) {
    if (!startOverlay.classList.contains("hidden")) startGame();
  }
});

window.addEventListener("keyup", (e) => {
  if (keys.hasOwnProperty(e.code)) {
    keys[e.code] = false;
    e.preventDefault();
  }
});

// スマホタッチドラッグ操作（指先に自機がダイレクト追従）
function handleTouchMove(clientX, clientY) {
  if (!isRunning || !player) return;
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;

  player.x = (clientX - rect.left) * scaleX - player.width / 2;
  player.y = (clientY - rect.top) * scaleY - player.height / 2 - 20; // 少し指の上に配置
}

canvas.addEventListener("touchstart", (e) => {
  e.preventDefault();
  if (e.touches.length > 0) {
    handleTouchMove(e.touches[0].clientX, e.touches[0].clientY);
  }
}, { passive: false });

canvas.addEventListener("touchmove", (e) => {
  e.preventDefault();
  if (e.touches.length > 0) {
    handleTouchMove(e.touches[0].clientX, e.touches[0].clientY);
  }
}, { passive: false });

canvas.addEventListener("mousemove", (e) => {
  if (!isRunning || !player || e.buttons !== 1) return;
  handleTouchMove(e.clientX, e.clientY);
});

// ボムボタン
btnBomb.addEventListener("click", useMegaBomb);
btnBomb.addEventListener("touchstart", (e) => { e.preventDefault(); useMegaBomb(); }, { passive: false });

// スタート・リトライボタン
startBtn.addEventListener("click", startGame);
restartClearBtn.addEventListener("click", startGame);
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
