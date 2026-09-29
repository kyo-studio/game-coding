/**
 * ==========================================
 * Game #18 タワーディフェンス (Tower Defense)
 * 経路追従・防衛タワー建設・属性攻撃・ウェーブ戦略
 * ==========================================
 */

// ==========================================
// 1. 定数・経路・建設スポット定義
// ==========================================
const CANVAS_WIDTH = 380;
const CANVAS_HEIGHT = 440;

// ウェイポイント（Start -> Base）
const WAYPOINTS = [
  { x: 0, y: 70 },
  { x: 290, y: 70 },
  { x: 290, y: 170 },
  { x: 90, y: 170 },
  { x: 90, y: 280 },
  { x: 290, y: 280 },
  { x: 290, y: 380 },
  { x: 380, y: 380 }
];

// タワー建設スポット (Buildable Spots)
const BUILD_SPOTS = [
  { id: 1, x: 70, y: 25 },
  { id: 2, x: 150, y: 25 },
  { id: 3, x: 230, y: 25 },
  { id: 4, x: 345, y: 120 },
  { id: 5, x: 220, y: 120 },
  { id: 6, x: 140, y: 120 },
  { id: 7, x: 35, y: 120 },
  { id: 8, x: 35, y: 225 },
  { id: 9, x: 160, y: 225 },
  { id: 10, x: 240, y: 225 },
  { id: 11, x: 345, y: 225 },
  { id: 12, x: 220, y: 330 },
  { id: 13, x: 140, y: 330 },
  { id: 14, x: 35, y: 330 },
  { id: 15, x: 190, y: 415 },
  { id: 16, x: 100, y: 415 }
];

// タワー基本データ
const TOWER_TYPES = {
  gatling: {
    name: "ガトリング",
    icon: "🏹",
    cost: 100,
    color: "#38bdf8",
    levels: [
      { damage: 12, range: 85, fireRate: 14, upgradeCost: 80, sellValue: 70 },
      { damage: 20, range: 95, fireRate: 12, upgradeCost: 140, sellValue: 120 },
      { damage: 32, range: 110, fireRate: 10, upgradeCost: 0, sellValue: 210 }
    ]
  },
  frost: {
    name: "フロスト",
    icon: "❄️",
    cost: 150,
    color: "#818cf8",
    levels: [
      { damage: 8, range: 75, fireRate: 35, slowRate: 0.5, upgradeCost: 120, sellValue: 100 },
      { damage: 16, range: 88, fireRate: 30, slowRate: 0.6, upgradeCost: 180, sellValue: 180 },
      { damage: 28, range: 100, fireRate: 25, slowRate: 0.7, upgradeCost: 0, sellValue: 300 }
    ]
  },
  cannon: {
    name: "キャノン",
    icon: "💣",
    cost: 200,
    color: "#fb923c",
    levels: [
      { damage: 45, range: 115, fireRate: 65, splashRadius: 36, upgradeCost: 160, sellValue: 140 },
      { damage: 80, range: 130, fireRate: 55, splashRadius: 44, upgradeCost: 240, sellValue: 240 },
      { damage: 135, range: 145, fireRate: 48, splashRadius: 52, upgradeCost: 0, sellValue: 400 }
    ]
  }
};

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

function playGatlingSound() {
  if (!audioCtx) return;
  try {
    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = "square";
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.exponentialRampToValueAtTime(150, now + 0.05);
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(now);
    osc.stop(now + 0.05);
  } catch (e) {}
}

function playFrostSound() {
  if (!audioCtx) return;
  try {
    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(1200, now + 0.15);
    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(now);
    osc.stop(now + 0.15);
  } catch (e) {}
}

function playCannonSound() {
  if (!audioCtx) return;
  try {
    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(120, now);
    osc.frequency.exponentialRampToValueAtTime(30, now + 0.35);
    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(now);
    osc.stop(now + 0.35);
  } catch (e) {}
}

function playGoldSound() {
  if (!audioCtx) return;
  try {
    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(987.77, now); // B5
    osc.frequency.setValueAtTime(1318.51, now + 0.05); // E6
    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(now);
    osc.stop(now + 0.12);
  } catch (e) {}
}

function playBuildSound() {
  if (!audioCtx) return;
  try {
    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(300, now);
    osc.frequency.setValueAtTime(500, now + 0.06);
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(now);
    osc.stop(now + 0.12);
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
      gain.gain.setValueAtTime(0.2, now + idx * 0.12);
      gain.gain.exponentialRampToValueAtTime(0.01, now + idx * 0.12 + 0.25);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(now + idx * 0.12);
      osc.stop(now + idx * 0.12 + 0.25);
    });
  } catch (e) {}
}

// ==========================================
// 3. ゲーム状態変数
// ==========================================
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const goldDisplay = document.getElementById("gold-display");
const livesDisplay = document.getElementById("lives-display");
const waveDisplay = document.getElementById("wave-display");
const scoreDisplay = document.getElementById("score-display");
const speedBtn = document.getElementById("speed-btn");

const startOverlay = document.getElementById("start-overlay");
const clearOverlay = document.getElementById("clear-overlay");
const gameoverOverlay = document.getElementById("gameover-overlay");
const finalScore = document.getElementById("final-score");
const finalWave = document.getElementById("final-wave");
const clearFinalScore = document.getElementById("clear-final-score");
const newRecordBadge = document.getElementById("new-record-badge");

const startBtn = document.getElementById("start-btn");
const restartBtn = document.getElementById("restart-btn");
const clearRestartBtn = document.getElementById("clear-restart-btn");
const nextWaveBtn = document.getElementById("next-wave-btn");

const towerModal = document.getElementById("tower-modal");
const modalTowerName = document.getElementById("modal-tower-name");
const modalTowerStats = document.getElementById("modal-tower-stats");
const modalCloseBtn = document.getElementById("modal-close-btn");
const upgradeBtn = document.getElementById("upgrade-btn");
const sellBtn = document.getElementById("sell-btn");

let gold = 250;
let lives = 20;
let wave = 0;
const MAX_WAVES = 20;
let score = 0;
let bestScore = 0;
let gameSpeed = 1; // 1 or 2
let isRunning = false;
let waveActive = false;

let selectedTowerType = "gatling"; // gatling, frost, cannon
let selectedPlacedTower = null;

let placedTowers = [];
let enemies = [];
let projectiles = [];
let particles = [];
let floatingTexts = [];
let spawnQueue = [];
let spawnTimer = 0;
let animFrameId = null;

// ==========================================
// 4. クラス定義
// ==========================================

/**
 * 防衛タワークラス
 */
class Tower {
  constructor(spot, typeKey) {
    this.spot = spot;
    this.typeKey = typeKey;
    this.config = TOWER_TYPES[typeKey];
    this.level = 1; // 1, 2, 3
    this.x = spot.x;
    this.y = spot.y;
    this.cooldown = 0;
    this.target = null;
    this.angle = 0;
  }

  getCurrentStats() {
    return this.config.levels[this.level - 1];
  }

  update() {
    const stats = this.getCurrentStats();
    if (this.cooldown > 0) {
      this.cooldown--;
    }

    // 索敵: 射程内で最も進行度が高い（ウェイポイントが進んでいる）敵を優先
    this.target = this.findBestTarget(stats.range);

    if (this.target) {
      this.angle = Math.atan2(this.target.y - this.y, this.target.x - this.x);

      if (this.cooldown <= 0) {
        this.attack(this.target, stats);
        this.cooldown = stats.fireRate;
      }
    }
  }

  findBestTarget(range) {
    let best = null;
    let maxProgress = -1;

    for (const enemy of enemies) {
      const dist = Math.hypot(enemy.x - this.x, enemy.y - this.y);
      if (dist <= range + enemy.radius) {
        const progress = enemy.getOverallProgress();
        if (progress > maxProgress) {
          maxProgress = progress;
          best = enemy;
        }
      }
    }
    return best;
  }

  attack(target, stats) {
    if (this.typeKey === "gatling") {
      playGatlingSound();
      projectiles.push(new Projectile(this.x, this.y, target, "gatling", stats.damage, 8.5));
    } else if (this.typeKey === "frost") {
      playFrostSound();
      // 射程内の全敵に冷気ダメージ＆スロー付与
      for (const enemy of enemies) {
        const dist = Math.hypot(enemy.x - this.x, enemy.y - this.y);
        if (dist <= stats.range + enemy.radius) {
          enemy.takeDamage(stats.damage);
          enemy.applySlow(stats.slowRate, 75);
          createFrostParticles(enemy.x, enemy.y, 4);
        }
      }
      createFrostRing(this.x, this.y, stats.range);
    } else if (this.typeKey === "cannon") {
      playCannonSound();
      projectiles.push(new Projectile(this.x, this.y, target, "cannon", stats.damage, 5.0, stats.splashRadius));
    }
  }

  draw() {
    const stats = this.getCurrentStats();

    // 選択中の場合、射程サークルを描画
    if (selectedPlacedTower === this) {
      ctx.save();
      ctx.strokeStyle = this.config.color;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.arc(this.x, this.y, stats.range, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = `${this.config.color}15`;
      ctx.fill();
      ctx.restore();
    }

    // 台座
    ctx.save();
    ctx.translate(this.x, this.y);

    ctx.fillStyle = "#1e293b";
    ctx.strokeStyle = this.config.color;
    ctx.lineWidth = 2;
    ctx.shadowColor = this.config.color;
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(0, 0, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // 砲頭（ターゲット方向へ回転）
    ctx.rotate(this.angle);

    if (this.typeKey === "gatling") {
      ctx.fillStyle = "#38bdf8";
      ctx.fillRect(0, -3, 14, 6);
    } else if (this.typeKey === "frost") {
      ctx.fillStyle = "#818cf8";
      ctx.beginPath();
      ctx.moveTo(12, 0);
      ctx.lineTo(-4, -6);
      ctx.lineTo(-4, 6);
      ctx.closePath();
      ctx.fill();
    } else if (this.typeKey === "cannon") {
      ctx.fillStyle = "#fb923c";
      ctx.fillRect(0, -5, 16, 10);
    }

    ctx.restore();

    // レベルバッジ (Lv.2, Lv.3)
    if (this.level > 1) {
      ctx.save();
      ctx.fillStyle = "#fbbf24";
      ctx.font = "bold 9px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(`★${this.level}`, this.x, this.y + 19);
      ctx.restore();
    }
  }
}

/**
 * 弾丸・砲弾クラス
 */
class Projectile {
  constructor(x, y, target, type, damage, speed, splashRadius = 0) {
    this.x = x;
    this.y = y;
    this.target = target;
    this.targetX = target.x;
    this.targetY = target.y;
    this.type = type;
    this.damage = damage;
    this.speed = speed;
    this.splashRadius = splashRadius;
    this.active = true;
  }

  update() {
    if (this.target && this.target.hp > 0) {
      this.targetX = this.target.x;
      this.targetY = this.target.y;
    }

    const dx = this.targetX - this.x;
    const dy = this.targetY - this.y;
    const dist = Math.hypot(dx, dy);

    if (dist <= this.speed) {
      this.hit();
    } else {
      this.x += (dx / dist) * this.speed;
      this.y += (dy / dist) * this.speed;
    }
  }

  hit() {
    this.active = false;
    if (this.type === "gatling") {
      if (this.target && this.target.hp > 0) {
        this.target.takeDamage(this.damage);
      }
      createSparks(this.x, this.y, "#38bdf8", 5);
    } else if (this.type === "cannon") {
      // 範囲スプラッシュ爆発
      createExplosion(this.x, this.y, this.splashRadius);
      for (const enemy of enemies) {
        const dist = Math.hypot(enemy.x - this.x, enemy.y - this.y);
        if (dist <= this.splashRadius + enemy.radius) {
          const falloff = 1 - (dist / (this.splashRadius + enemy.radius)) * 0.4;
          enemy.takeDamage(Math.floor(this.damage * falloff));
        }
      }
    }
  }

  draw() {
    ctx.save();
    if (this.type === "gatling") {
      ctx.fillStyle = "#38bdf8";
      ctx.shadowColor = "#38bdf8";
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.arc(this.x, this.y, 2.5, 0, Math.PI * 2);
      ctx.fill();
    } else if (this.type === "cannon") {
      ctx.fillStyle = "#fb923c";
      ctx.shadowColor = "#ea580c";
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(this.x, this.y, 4.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}

/**
 * 敵モンスタークラス
 */
class Enemy {
  constructor(config) {
    this.type = config.type; // normal, runner, tank, boss
    this.hp = config.hp;
    this.maxHp = config.hp;
    this.baseSpeed = config.speed;
    this.speed = config.speed;
    this.rewardGold = config.rewardGold;
    this.rewardScore = config.rewardScore;
    this.radius = config.radius;
    this.color = config.color;

    this.waypointIndex = 0;
    this.x = WAYPOINTS[0].x;
    this.y = WAYPOINTS[0].y;
    this.distanceTraveled = 0;

    this.slowTimer = 0;
    this.slowFactor = 1.0;
  }

  getOverallProgress() {
    return this.waypointIndex * 1000 + this.distanceTraveled;
  }

  applySlow(factor, duration) {
    this.slowTimer = duration;
    this.slowFactor = Math.min(this.slowFactor, 1 - factor);
  }

  takeDamage(amount) {
    this.hp -= amount;
    floatingTexts.push(new FloatingText(`-${amount}`, this.x, this.y - 10, "#f87171"));
    if (this.hp <= 0) {
      this.die();
    }
  }

  die() {
    gold += this.rewardGold;
    score += this.rewardScore;
    goldDisplay.textContent = gold;
    scoreDisplay.textContent = score;
    floatingTexts.push(new FloatingText(`+${this.rewardGold}G`, this.x, this.y - 20, "#fbbf24"));
    createSparks(this.x, this.y, this.color, 12);
    playGoldSound();
  }

  update() {
    // スロー効果の減衰
    if (this.slowTimer > 0) {
      this.slowTimer--;
      this.speed = this.baseSpeed * this.slowFactor;
    } else {
      this.slowFactor = 1.0;
      this.speed = this.baseSpeed;
    }

    const targetWp = WAYPOINTS[this.waypointIndex + 1];
    if (!targetWp) {
      // 拠点に到達！
      this.reachBase();
      return;
    }

    const dx = targetWp.x - this.x;
    const dy = targetWp.y - this.y;
    const dist = Math.hypot(dx, dy);

    if (dist <= this.speed) {
      this.x = targetWp.x;
      this.y = targetWp.y;
      this.waypointIndex++;
      this.distanceTraveled = 0;
    } else {
      this.x += (dx / dist) * this.speed;
      this.y += (dy / dist) * this.speed;
      this.distanceTraveled += this.speed;
    }
  }

  reachBase() {
    this.hp = 0; // 削除
    lives = Math.max(0, lives - (this.type === "boss" ? 5 : 1));
    livesDisplay.textContent = lives;
    createExplosion(this.x, this.y, 25);

    if (lives <= 0) {
      handleGameOver();
    }
  }

  draw() {
    ctx.save();
    ctx.translate(this.x, this.y);

    // 凍結エフェクト
    if (this.slowTimer > 0) {
      ctx.strokeStyle = "#67e8f9";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, this.radius + 3, 0, Math.PI * 2);
      ctx.stroke();
    }

    // 本体
    ctx.fillStyle = this.color;
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
    ctx.fill();

    // ボス冠
    if (this.type === "boss") {
      ctx.fillStyle = "#fbbf24";
      ctx.font = "bold 12px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("👑", 0, -this.radius - 4);
    }

    ctx.restore();

    // HPバー
    const barWidth = Math.max(20, this.radius * 2);
    const barHeight = 3.5;
    const barX = this.x - barWidth / 2;
    const barY = this.y - this.radius - 8;
    const hpRatio = Math.max(0, this.hp / this.maxHp);

    ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
    ctx.fillRect(barX, barY, barWidth, barHeight);
    ctx.fillStyle = hpRatio > 0.5 ? "#22c55e" : hpRatio > 0.25 ? "#eab308" : "#ef4444";
    ctx.fillRect(barX, barY, barWidth * hpRatio, barHeight);
  }
}

// ==========================================
// 5. エフェクト・パーティクル
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
    this.y -= 0.6;
    this.alpha -= 0.025;
  }
  draw() {
    ctx.save();
    ctx.globalAlpha = Math.max(0, this.alpha);
    ctx.font = "bold 11px sans-serif";
    ctx.fillStyle = this.color;
    ctx.textAlign = "center";
    ctx.fillText(this.text, this.x, this.y);
    ctx.restore();
  }
}

class Particle {
  constructor(x, y, color, speed, size, life) {
    this.x = x;
    this.y = y;
    this.color = color;
    const angle = Math.random() * Math.PI * 2;
    const s = Math.random() * speed + 0.5;
    this.vx = Math.cos(angle) * s;
    this.vy = Math.sin(angle) * s;
    this.size = size;
    this.alpha = 1.0;
    this.decay = 1 / life;
  }
  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.alpha -= this.decay;
  }
  draw() {
    ctx.save();
    ctx.globalAlpha = Math.max(0, this.alpha);
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function createSparks(x, y, color, count = 8) {
  for (let i = 0; i < count; i++) {
    particles.push(new Particle(x, y, color, 2.5, 2, 20));
  }
}

function createFrostParticles(x, y, count = 4) {
  for (let i = 0; i < count; i++) {
    particles.push(new Particle(x, y, "#67e8f9", 1.5, 2.5, 25));
  }
}

function createFrostRing(x, y, radius) {
  particles.push({
    x, y, radius: 10, maxRadius: radius, alpha: 0.8,
    update() {
      this.radius += (this.maxRadius - this.radius) * 0.25;
      this.alpha -= 0.06;
    },
    draw() {
      ctx.save();
      ctx.globalAlpha = Math.max(0, this.alpha);
      ctx.strokeStyle = "#818cf8";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  });
}

function createExplosion(x, y, radius) {
  for (let i = 0; i < 16; i++) {
    particles.push(new Particle(x, y, "#f97316", 4.0, 3.5, 25));
  }
  particles.push({
    x, y, radius: 5, maxRadius: radius, alpha: 0.9,
    update() {
      this.radius += (this.maxRadius - this.radius) * 0.3;
      this.alpha -= 0.08;
    },
    draw() {
      ctx.save();
      ctx.globalAlpha = Math.max(0, this.alpha);
      ctx.fillStyle = "rgba(251, 146, 60, 0.4)";
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  });
}

// ==========================================
// 6. ウェーブ生成ロジック
// ==========================================
function generateWave(waveNum) {
  spawnQueue = [];
  const count = 6 + waveNum * 2;
  const isBossWave = (waveNum % 5 === 0);

  for (let i = 0; i < count; i++) {
    let type = "normal";
    let hp = 40 + waveNum * 18;
    let speed = 1.1 + (waveNum * 0.04);
    let rewardGold = 12 + Math.floor(waveNum * 1.5);
    let rewardScore = 50;
    let radius = 7.5;
    let color = "#4ade80";

    if (i % 4 === 1 && waveNum >= 2) {
      type = "runner";
      hp = Math.floor(hp * 0.55);
      speed = speed * 1.6;
      rewardGold = Math.floor(rewardGold * 0.9);
      color = "#fde047";
      radius = 6.0;
    } else if (i % 5 === 3 && waveNum >= 3) {
      type = "tank";
      hp = Math.floor(hp * 2.4);
      speed = speed * 0.65;
      rewardGold = Math.floor(rewardGold * 2.0);
      color = "#c084fc";
      radius = 10.5;
    }

    spawnQueue.push({ type, hp, speed, rewardGold, rewardScore, radius, color, delay: i * 35 });
  }

  // ボス追加
  if (isBossWave) {
    spawnQueue.push({
      type: "boss",
      hp: 350 + waveNum * 150,
      speed: 0.75 + waveNum * 0.02,
      rewardGold: 100 + waveNum * 10,
      rewardScore: 500,
      radius: 14.0,
      color: "#ef4444",
      delay: count * 35 + 30
    });
  }
}

function startNextWave() {
  if (wave >= MAX_WAVES && enemies.length === 0 && spawnQueue.length === 0) {
    handleGameClear();
    return;
  }

  wave++;
  waveDisplay.textContent = `${wave}/${MAX_WAVES}`;
  generateWave(wave);
  waveActive = true;
  nextWaveBtn.disabled = true;
  nextWaveBtn.style.opacity = "0.5";
}

// ==========================================
// 7. タワー建設・選択・アップグレード
// ==========================================
function getSpotAtPosition(px, py) {
  for (const spot of BUILD_SPOTS) {
    const dist = Math.hypot(spot.x - px, spot.y - py);
    if (dist <= 20) {
      return spot;
    }
  }
  return null;
}

function getTowerAtSpot(spot) {
  return placedTowers.find(t => t.spot.id === spot.id) || null;
}

function handleCanvasClick(e) {
  initAudio();
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;

  const clickX = ((e.clientX || (e.touches && e.touches[0].clientX)) - rect.left) * scaleX;
  const clickY = ((e.clientY || (e.touches && e.touches[0].clientY)) - rect.top) * scaleY;

  const spot = getSpotAtPosition(clickX, clickY);

  if (spot) {
    const existingTower = getTowerAtSpot(spot);
    if (existingTower) {
      // 既存タワーを選択 -> 強化/売却モーダルを開く
      selectTower(existingTower);
    } else {
      // 空き地 -> 選択中タワーを建設
      buildTower(spot, selectedTowerType);
    }
  } else {
    // 画面外タップ -> モーダルを閉じる
    deselectTower();
  }
}

function buildTower(spot, typeKey) {
  const config = TOWER_TYPES[typeKey];
  if (gold >= config.cost) {
    gold -= config.cost;
    goldDisplay.textContent = gold;
    const newTower = new Tower(spot, typeKey);
    placedTowers.push(newTower);
    playBuildSound();
    createSparks(spot.x, spot.y, config.color, 12);
    selectTower(newTower);
  } else {
    floatingTexts.push(new FloatingText("GOLD 不足!", spot.x, spot.y - 12, "#ef4444"));
  }
}

function selectTower(tower) {
  selectedPlacedTower = tower;
  updateTowerModal();
  towerModal.classList.remove("hidden");
}

function deselectTower() {
  selectedPlacedTower = null;
  towerModal.classList.add("hidden");
}

function updateTowerModal() {
  if (!selectedPlacedTower) return;
  const t = selectedPlacedTower;
  const stats = t.getCurrentStats();

  modalTowerName.textContent = `${t.config.icon} ${t.config.name} Lv.${t.level}`;
  modalTowerStats.textContent = `威力: ${stats.damage} | 射程: ${stats.range} | 速度: ${Math.round(60 / stats.fireRate)}回/s`;

  if (t.level < 3) {
    const nextStats = t.config.levels[t.level];
    upgradeBtn.textContent = `強化 Lv.${t.level + 1} (💰 ${stats.upgradeCost}G)`;
    upgradeBtn.disabled = gold < stats.upgradeCost;
    upgradeBtn.style.opacity = gold < stats.upgradeCost ? "0.5" : "1";
    upgradeBtn.style.display = "block";
  } else {
    upgradeBtn.style.display = "none";
  }

  sellBtn.textContent = `売却 (💰 ${stats.sellValue}G)`;
}

function upgradeSelectedTower() {
  if (!selectedPlacedTower) return;
  const t = selectedPlacedTower;
  const stats = t.getCurrentStats();

  if (t.level < 3 && gold >= stats.upgradeCost) {
    gold -= stats.upgradeCost;
    goldDisplay.textContent = gold;
    t.level++;
    playBuildSound();
    createSparks(t.x, t.y, "#fbbf24", 16);
    floatingTexts.push(new FloatingText("LEVEL UP! ★", t.x, t.y - 16, "#fbbf24"));
    updateTowerModal();
  }
}

function sellSelectedTower() {
  if (!selectedPlacedTower) return;
  const t = selectedPlacedTower;
  const stats = t.getCurrentStats();

  gold += stats.sellValue;
  goldDisplay.textContent = gold;
  placedTowers = placedTowers.filter(item => item !== t);
  playGoldSound();
  floatingTexts.push(new FloatingText(`+${stats.sellValue}G`, t.x, t.y - 16, "#fbbf24"));
  deselectTower();
}

// ==========================================
// 8. メインゲームループ (Game Loop)
// ==========================================
function gameLoop() {
  if (isRunning) {
    for (let step = 0; step < gameSpeed; step++) {
      update();
    }
    draw();
  }
  animFrameId = requestAnimationFrame(gameLoop);
}

function update() {
  // 1. スポーン処理
  if (spawnQueue.length > 0) {
    spawnTimer++;
    if (spawnTimer >= spawnQueue[0].delay) {
      const enemyData = spawnQueue.shift();
      enemies.push(new Enemy(enemyData));
    }
  } else if (enemies.length === 0 && waveActive) {
    // ウェーブクリア！
    waveActive = false;
    nextWaveBtn.disabled = false;
    nextWaveBtn.style.opacity = "1";

    if (wave >= MAX_WAVES) {
      handleGameClear();
    }
  }

  // 2. 敵の更新
  enemies.forEach(e => e.update());
  enemies = enemies.filter(e => e.hp > 0);

  // 3. タワーの更新
  placedTowers.forEach(t => t.update());

  // 4. 弾丸の更新
  projectiles.forEach(p => p.update());
  projectiles = projectiles.filter(p => p.active);

  // 5. パーティクル・フローティングテキスト更新
  particles.forEach(p => p.update());
  particles = particles.filter(p => p.alpha > 0);

  floatingTexts.forEach(t => t.update());
  floatingTexts = floatingTexts.filter(t => t.alpha > 0);
}

// ==========================================
// 9. 描画処理 (Draw)
// ==========================================
function draw() {
  // 背景
  ctx.fillStyle = "#081026";
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  // 経路（道）の描画
  drawPath();

  // 建設スポットの描画
  drawBuildSpots();

  // タワー描画
  placedTowers.forEach(t => t.draw());

  // 敵描画
  enemies.forEach(e => e.draw());

  // 弾丸描画
  projectiles.forEach(p => p.draw());

  // パーティクル・エフェクト描画
  particles.forEach(p => p.draw());
  floatingTexts.forEach(t => t.draw());

  // Start & Base アイコン描画
  drawStartAndBase();
}

function drawPath() {
  ctx.save();
  ctx.strokeStyle = "#1e293b";
  ctx.lineWidth = 28;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(WAYPOINTS[0].x, WAYPOINTS[0].y);
  for (let i = 1; i < WAYPOINTS.length; i++) {
    ctx.lineTo(WAYPOINTS[i].x, WAYPOINTS[i].y);
  }
  ctx.stroke();

  // 道の中央線（ネオンライン）
  ctx.strokeStyle = "rgba(59, 130, 246, 0.25)";
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 6]);
  ctx.stroke();
  ctx.restore();
}

function drawBuildSpots() {
  for (const spot of BUILD_SPOTS) {
    const hasTower = getTowerAtSpot(spot);
    if (!hasTower) {
      ctx.save();
      ctx.fillStyle = "rgba(30, 41, 59, 0.6)";
      ctx.strokeStyle = "rgba(56, 189, 248, 0.4)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(spot.x, spot.y, 13, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "rgba(56, 189, 248, 0.7)";
      ctx.font = "bold 12px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("+", spot.x, spot.y);
      ctx.restore();
    }
  }
}

function drawStartAndBase() {
  ctx.save();
  // Start
  ctx.fillStyle = "#ef4444";
  ctx.font = "bold 11px sans-serif";
  ctx.fillText("⚔️ START", 4, 60);

  // Base
  ctx.fillStyle = "#38bdf8";
  ctx.font = "bold 11px sans-serif";
  ctx.fillText("🏰 BASE", 325, 415);
  ctx.restore();
}

// ==========================================
// 10. ゲーム進行・ライフサイクル
// ==========================================
function loadBestScore() {
  const saved = localStorage.getItem("tower_defense_best_score");
  if (saved !== null) {
    bestScore = parseInt(saved, 10);
  }
}

function checkAndUpdateBestScore() {
  if (score > bestScore) {
    bestScore = score;
    localStorage.setItem("tower_defense_best_score", bestScore);
    return true;
  }
  return false;
}

function startNewGame() {
  gold = 250;
  lives = 20;
  wave = 0;
  score = 0;
  gameSpeed = 1;
  speedBtn.textContent = "1x ⏩";
  speedBtn.classList.remove("active");

  goldDisplay.textContent = gold;
  livesDisplay.textContent = lives;
  waveDisplay.textContent = `0/${MAX_WAVES}`;
  scoreDisplay.textContent = "0";

  placedTowers = [];
  enemies = [];
  projectiles = [];
  particles = [];
  floatingTexts = [];
  spawnQueue = [];
  spawnTimer = 0;
  waveActive = false;

  deselectTower();
  startOverlay.classList.add("hidden");
  clearOverlay.classList.add("hidden");
  gameoverOverlay.classList.add("hidden");

  isRunning = true;
  if (!animFrameId) {
    animFrameId = requestAnimationFrame(gameLoop);
  }

  // Wave 1 を開始
  startNextWave();
}

function handleGameOver() {
  isRunning = false;
  const isNew = checkAndUpdateBestScore();
  finalScore.textContent = score;
  finalWave.textContent = wave;
  newRecordBadge.classList.toggle("hidden", !isNew);
  gameoverOverlay.classList.remove("hidden");
}

function handleGameClear() {
  isRunning = false;
  playClearFanfare();
  checkAndUpdateBestScore();
  clearFinalScore.textContent = score;
  clearOverlay.classList.remove("hidden");
}

// ==========================================
// 11. イベントリスナー・操作バインド
// ==========================================
canvas.addEventListener("click", handleCanvasClick);
canvas.addEventListener("touchstart", (e) => {
  e.preventDefault();
  handleCanvasClick(e);
}, { passive: false });

// タワー選択パレット
const paletteBtns = document.querySelectorAll(".palette-btn");
paletteBtns.forEach(btn => {
  btn.addEventListener("click", () => {
    paletteBtns.forEach(b => b.classList.remove("selected"));
    btn.classList.add("selected");
    selectedTowerType = btn.dataset.type;
  });
});

// 倍速切り替え
speedBtn.addEventListener("click", () => {
  gameSpeed = gameSpeed === 1 ? 2 : 1;
  speedBtn.textContent = `${gameSpeed}x ⏩`;
  speedBtn.classList.toggle("active", gameSpeed === 2);
});

// Next Wave ボタン
nextWaveBtn.addEventListener("click", () => {
  initAudio();
  startNextWave();
});

// モーダルボタン
modalCloseBtn.addEventListener("click", deselectTower);
upgradeBtn.addEventListener("click", upgradeSelectedTower);
sellBtn.addEventListener("click", sellSelectedTower);

// UIボタン
startBtn.addEventListener("click", () => {
  initAudio();
  startNewGame();
});

restartBtn.addEventListener("click", () => {
  initAudio();
  startNewGame();
});

clearRestartBtn.addEventListener("click", () => {
  initAudio();
  startNewGame();
});

// 初期ロード
window.addEventListener("DOMContentLoaded", () => {
  loadBestScore();
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
