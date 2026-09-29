/**
 * ==========================================
 * Game #17 パックマン風 (Pac-Man)
 * 迷路探索・4種のゴーストAI・ドットイート・パワーペレット
 * ==========================================
 */

// ==========================================
// 1. 定数・マップ定義 (19列 × 21行 / タイル20px)
// ==========================================
const COLS = 19;
const ROWS = 21;
const TILE_SIZE = 20; // 380px x 420px
const CANVAS_WIDTH = COLS * TILE_SIZE;  // 380
const CANVAS_HEIGHT = ROWS * TILE_SIZE; // 420

// マップ凡例:
// 1: 壁, 2: ドット(10点), 3: パワーエサ(50点), 0: 空白通路, 4: ゴーストハウス扉, 5: ワープトンネル
const INITIAL_MAP = [
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  [1,3,2,2,2,2,2,2,2,1,2,2,2,2,2,2,2,3,1],
  [1,2,1,1,2,1,1,1,2,1,2,1,1,1,2,1,1,2,1],
  [1,2,1,1,2,1,1,1,2,1,2,1,1,1,2,1,1,2,1],
  [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
  [1,2,1,1,2,1,2,1,1,1,1,1,2,1,2,1,1,2,1],
  [1,2,2,2,2,1,2,2,2,1,2,2,2,1,2,2,2,2,1],
  [1,1,1,1,2,1,0,0,0,0,0,0,0,1,2,1,1,1,1],
  [0,0,0,1,2,1,0,0,0,0,0,0,0,1,2,1,0,0,0],
  [5,0,0,1,2,1,0,1,4,4,4,1,0,1,2,1,0,0,5],
  [1,1,1,1,2,1,0,1,0,0,0,1,0,1,2,1,1,1,1],
  [0,0,0,1,2,0,0,1,1,1,1,1,0,0,2,1,0,0,0],
  [1,1,1,1,2,1,0,0,0,0,0,0,0,1,2,1,1,1,1],
  [1,2,2,2,2,2,2,1,1,1,1,1,2,2,2,2,2,2,1],
  [1,2,1,1,2,1,2,2,2,1,2,2,2,1,2,1,1,2,1],
  [1,3,2,1,2,2,2,0,0,0,0,0,2,2,2,1,2,3,1],
  [1,1,2,1,2,1,2,1,1,1,1,1,2,1,2,1,2,1,1],
  [1,2,2,2,2,1,2,2,2,1,2,2,2,1,2,2,2,2,1],
  [1,2,1,1,1,1,1,1,2,1,2,1,1,1,1,1,1,2,1],
  [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
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

let wakaToggle = false;
function playWakaSound() {
  if (!audioCtx) return;
  try {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    const now = audioCtx.currentTime;

    osc.type = "triangle";
    const freq = wakaToggle ? 360 : 280;
    wakaToggle = !wakaToggle;

    osc.frequency.setValueAtTime(freq, now);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.7, now + 0.08);

    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);

    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(now);
    osc.stop(now + 0.08);
  } catch (e) {}
}

function playPowerPelletSound() {
  if (!audioCtx) return;
  try {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    const now = audioCtx.currentTime;

    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(200, now);
    osc.frequency.linearRampToValueAtTime(600, now + 0.25);

    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);

    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(now);
    osc.stop(now + 0.25);
  } catch (e) {}
}

function playEatGhostSound() {
  if (!audioCtx) return;
  try {
    const now = audioCtx.currentTime;
    [400, 600, 800, 1200].forEach((f, i) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(f, now + i * 0.04);
      gain.gain.setValueAtTime(0.18, now + i * 0.04);
      gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.04 + 0.06);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(now + i * 0.04);
      osc.stop(now + i * 0.04 + 0.06);
    });
  } catch (e) {}
}

function playDeathSound() {
  if (!audioCtx) return;
  try {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    const now = audioCtx.currentTime;

    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(500, now);
    osc.frequency.linearRampToValueAtTime(80, now + 0.6);

    gain.gain.setValueAtTime(0.22, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.6);

    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(now);
    osc.stop(now + 0.6);
  } catch (e) {}
}

function playClearJingle() {
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
      gain.gain.exponentialRampToValueAtTime(0.01, now + idx * 0.12 + 0.2);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(now + idx * 0.12);
      osc.stop(now + idx * 0.12 + 0.2);
    });
  } catch (e) {}
}

// ==========================================
// 3. ゲーム状態管理
// ==========================================
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const scoreDisplay = document.getElementById("score-display");
const livesDisplay = document.getElementById("lives-display");
const stageDisplay = document.getElementById("stage-display");
const bestScoreDisplay = document.getElementById("best-score-display");

const startOverlay = document.getElementById("start-overlay");
const clearOverlay = document.getElementById("clear-overlay");
const gameoverOverlay = document.getElementById("gameover-overlay");
const finalScore = document.getElementById("final-score");
const finalStage = document.getElementById("final-stage");
const newRecordBadge = document.getElementById("new-record-badge");

const startBtn = document.getElementById("start-btn");
const nextStageBtn = document.getElementById("next-stage-btn");
const restartBtn = document.getElementById("restart-btn");

let currentMap = [];
let totalDots = 0;
let remainingDots = 0;
let score = 0;
let bestScore = 0;
let lives = 3;
let stage = 1;
let isRunning = false;
let pacman = null;
let ghosts = [];
let frightenedTimer = 0;
let frightenedDuration = 420;
let ghostComboMultiplier = 1;
let floatingTexts = [];
let particles = [];
let animFrameId = null;

// キー入力状態
const activeKeys = new Set();

// ==========================================
// 4. パックマン クラス (厳密なタイル移動・壁衝突判定)
// ==========================================
class Pacman {
  constructor() {
    this.reset();
  }

  reset() {
    this.tileX = 9;
    this.tileY = 15;
    this.x = (this.tileX + 0.5) * TILE_SIZE;
    this.y = (this.tileY + 0.5) * TILE_SIZE;
    this.radius = 8.5;
    this.speed = 2.0;
    this.dirX = 0;
    this.dirY = 0;
    this.nextDirX = 0;
    this.nextDirY = 0;
    this.mouthAngle = 0.2;
    this.mouthSpeed = 0.03;
    this.dying = false;
    this.deathAngle = 0;
  }

  setNextDirection(dx, dy) {
    this.nextDirX = dx;
    this.nextDirY = dy;

    // 逆方向への方向転換は即座に行える
    if (dx === -this.dirX && dy === -this.dirY && (dx !== 0 || dy !== 0)) {
      this.dirX = dx;
      this.dirY = dy;
      return;
    }

    // 静止中の場合、進行可能なら即座に方向をセット
    if (this.dirX === 0 && this.dirY === 0) {
      const curTileX = Math.floor(this.x / TILE_SIZE);
      const curTileY = Math.floor(this.y / TILE_SIZE);
      if (canMoveTo(curTileX + dx, curTileY + dy, false)) {
        this.dirX = dx;
        this.dirY = dy;
      }
    }
  }

  stop() {
    this.nextDirX = 0;
    this.nextDirY = 0;
    this.dirX = 0;
    this.dirY = 0;
  }

  update() {
    if (this.dying) {
      this.deathAngle += 0.08;
      return;
    }

    const curTileX = Math.floor(this.x / TILE_SIZE);
    const curTileY = Math.floor(this.y / TILE_SIZE);
    const centerX = (curTileX + 0.5) * TILE_SIZE;
    const centerY = (curTileY + 0.5) * TILE_SIZE;

    // 1. 移動中にタイル中心を跨いだ（または中心にいる）か判定
    let reachedCenter = false;
    if (this.dirX > 0 && this.x <= centerX && this.x + this.speed >= centerX) reachedCenter = true;
    else if (this.dirX < 0 && this.x >= centerX && this.x - this.speed <= centerX) reachedCenter = true;
    else if (this.dirY > 0 && this.y <= centerY && this.y + this.speed >= centerY) reachedCenter = true;
    else if (this.dirY < 0 && this.y >= centerY && this.y - this.speed <= centerY) reachedCenter = true;
    else if (this.dirX === 0 && this.dirY === 0) reachedCenter = true;

    if (reachedCenter) {
      this.x = centerX;
      this.y = centerY;

      // 先行入力方向へ曲がれるか判定
      if (this.nextDirX !== 0 || this.nextDirY !== 0) {
        if (canMoveTo(curTileX + this.nextDirX, curTileY + this.nextDirY, false)) {
          this.dirX = this.nextDirX;
          this.dirY = this.nextDirY;
        }
      }

      // 現在の進行方向の前方が壁なら停止
      if (this.dirX !== 0 || this.dirY !== 0) {
        if (!canMoveTo(curTileX + this.dirX, curTileY + this.dirY, false)) {
          this.dirX = 0;
          this.dirY = 0;
        }
      }
    }

    // 2. 移動実行（前方が壁なら中心を超えて進まない）
    if (this.dirX > 0) {
      if (!canMoveTo(curTileX + 1, curTileY, false) && this.x + this.speed >= centerX) {
        this.x = centerX;
        this.dirX = 0;
      } else {
        this.x += this.speed;
      }
    } else if (this.dirX < 0) {
      if (!canMoveTo(curTileX - 1, curTileY, false) && this.x - this.speed <= centerX) {
        this.x = centerX;
        this.dirX = 0;
      } else {
        this.x -= this.speed;
      }
    } else if (this.dirY > 0) {
      if (!canMoveTo(curTileX, curTileY + 1, false) && this.y + this.speed >= centerY) {
        this.y = centerY;
        this.dirY = 0;
      } else {
        this.y += this.speed;
      }
    } else if (this.dirY < 0) {
      if (!canMoveTo(curTileX, curTileY - 1, false) && this.y - this.speed <= centerY) {
        this.y = centerY;
        this.dirY = 0;
      } else {
        this.y -= this.speed;
      }
    }

    // 左右ワープトンネル (行9)
    if (this.x < -TILE_SIZE / 2) {
      this.x = CANVAS_WIDTH + TILE_SIZE / 2;
    } else if (this.x > CANVAS_WIDTH + TILE_SIZE / 2) {
      this.x = -TILE_SIZE / 2;
    }

    this.tileX = Math.floor(this.x / TILE_SIZE);
    this.tileY = Math.floor(this.y / TILE_SIZE);

    // ドット・パワーエサ取得判定
    if (this.tileX >= 0 && this.tileX < COLS && this.tileY >= 0 && this.tileY < ROWS) {
      const tile = currentMap[this.tileY][this.tileX];
      if (tile === 2) {
        currentMap[this.tileY][this.tileX] = 0;
        score += 10;
        remainingDots--;
        scoreDisplay.textContent = score;
        playWakaSound();
      } else if (tile === 3) {
        currentMap[this.tileY][this.tileX] = 0;
        score += 50;
        remainingDots--;
        scoreDisplay.textContent = score;
        playPowerPelletSound();
        triggerFrightenedMode();
      }
    }

    // 口のパクパクアニメーション
    if (this.dirX !== 0 || this.dirY !== 0) {
      this.mouthAngle += this.mouthSpeed;
      if (this.mouthAngle > 0.35 || this.mouthAngle < 0.04) {
        this.mouthSpeed = -this.mouthSpeed;
      }
    }
  }

  draw() {
    ctx.save();
    ctx.translate(this.x, this.y);

    if (this.dying) {
      ctx.fillStyle = "#fde047";
      ctx.beginPath();
      const start = this.deathAngle;
      const end = Math.PI * 2 - this.deathAngle;
      if (start < Math.PI) {
        ctx.arc(0, 0, this.radius, start, end);
        ctx.lineTo(0, 0);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
      return;
    }

    let angle = 0;
    if (this.dirX === 1) angle = 0;
    else if (this.dirX === -1) angle = Math.PI;
    else if (this.dirY === 1) angle = Math.PI * 0.5;
    else if (this.dirY === -1) angle = Math.PI * 1.5;

    ctx.rotate(angle);

    ctx.fillStyle = "#fde047";
    ctx.shadowColor = "#fde047";
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(0, 0, this.radius, this.mouthAngle * Math.PI, (2 - this.mouthAngle) * Math.PI);
    ctx.lineTo(0, 0);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }
}

// ==========================================
// 5. ゴースト クラス (4色のAI・止まらずに巡回)
// ==========================================
const GHOST_CONFIGS = [
  { name: "blinky", color: "#ef4444", startX: 9, startY: 7, inHouse: false, scatterX: 18, scatterY: 0 },
  { name: "pinky",  color: "#f472b6", startX: 9, startY: 10, inHouse: true,  scatterX: 0,  scatterY: 0 },
  { name: "inky",   color: "#38bdf8", startX: 8, startY: 10, inHouse: true,  scatterX: 18, scatterY: 20 },
  { name: "clyde",  color: "#fb923c", startX: 10, startY: 10, inHouse: true,  scatterX: 0,  scatterY: 20 }
];

class Ghost {
  constructor(config, index) {
    this.name = config.name;
    this.color = config.color;
    this.startX = config.startX;
    this.startY = config.startY;
    this.initInHouse = config.inHouse;
    this.scatterX = config.scatterX;
    this.scatterY = config.scatterY;
    this.index = index;
    this.radius = 8.5;
    this.reset();
  }

  reset() {
    this.tileX = this.startX;
    this.tileY = this.startY;
    this.x = (this.tileX + 0.5) * TILE_SIZE;
    this.y = (this.tileY + 0.5) * TILE_SIZE;
    this.dirX = (this.index % 2 === 0 ? -1 : 1);
    this.dirY = 0;
    this.inHouse = this.initInHouse;
    this.state = "CHASE"; // CHASE, FRIGHTENED, EATEN
    this.speed = 1.5 + (stage - 1) * 0.12;
    this.houseTimer = this.index * 60; // 順次ハウスから出撃
  }

  update() {
    // 1. ハウス内待機
    if (this.houseTimer > 0) {
      this.houseTimer--;
      this.y += Math.sin(Date.now() * 0.008) * 0.3;
      return;
    }

    // 2. ハウス脱出中 (上に向かってゲートを通過)
    if (this.inHouse) {
      const exitX = 9.5 * TILE_SIZE;
      const exitY = 7.5 * TILE_SIZE;

      if (Math.abs(this.x - exitX) > 1.5) {
        this.x += (exitX > this.x ? 1 : -1) * 1.5;
      } else {
        this.x = exitX;
        this.y -= 1.5;
        if (this.y <= exitY) {
          this.y = exitY;
          this.inHouse = false;
          this.tileX = 9;
          this.tileY = 7;
          this.dirX = (this.index % 2 === 0 ? -1 : 1);
          this.dirY = 0;
          this.chooseNextDirection();
        }
      }
      return;
    }

    let currentSpeed = this.speed;
    if (this.state === "FRIGHTENED") {
      currentSpeed = this.speed * 0.6;
    } else if (this.state === "EATEN") {
      currentSpeed = 3.5;
    }

    const curTileX = Math.floor(this.x / TILE_SIZE);
    const curTileY = Math.floor(this.y / TILE_SIZE);
    const centerX = (curTileX + 0.5) * TILE_SIZE;
    const centerY = (curTileY + 0.5) * TILE_SIZE;

    // 移動中にタイル中心を跨いだ（または中心にいる）か判定
    let reachedCenter = false;
    if (this.dirX > 0 && this.x <= centerX && this.x + currentSpeed >= centerX) reachedCenter = true;
    else if (this.dirX < 0 && this.x >= centerX && this.x - currentSpeed <= centerX) reachedCenter = true;
    else if (this.dirY > 0 && this.y <= centerY && this.y + currentSpeed >= centerY) reachedCenter = true;
    else if (this.dirY < 0 && this.y >= centerY && this.y - currentSpeed <= centerY) reachedCenter = true;
    else if (this.dirX === 0 && this.dirY === 0) reachedCenter = true;

    if (reachedCenter) {
      this.x = centerX;
      this.y = centerY;
      this.tileX = curTileX;
      this.tileY = curTileY;

      // 目玉状態でハウス入口に到達したら復活
      if (this.state === "EATEN" && this.tileX === 9 && (this.tileY === 7 || this.tileY === 8)) {
        this.state = "CHASE";
        this.dirX = (this.index % 2 === 0 ? -1 : 1);
        this.dirY = 0;
      }

      this.chooseNextDirection();
    }

    // 移動実行
    this.x += this.dirX * currentSpeed;
    this.y += this.dirY * currentSpeed;

    // ワープトンネル
    if (this.x < -TILE_SIZE / 2) this.x = CANVAS_WIDTH + TILE_SIZE / 2;
    else if (this.x > CANVAS_WIDTH + TILE_SIZE / 2) this.x = -TILE_SIZE / 2;
  }

  chooseNextDirection() {
    const isEaten = (this.state === "EATEN");
    let targetX = pacman.tileX;
    let targetY = pacman.tileY;

    if (isEaten) {
      targetX = 9;
      targetY = 7;
    } else if (this.state === "FRIGHTENED") {
      const possibleDirs = [];
      const directions = [{ x: 0, y: -1 }, { x: 0, y: 1 }, { x: -1, y: 0 }, { x: 1, y: 0 }];
      directions.forEach(d => {
        if (d.x === -this.dirX && d.y === -this.dirY && (this.dirX !== 0 || this.dirY !== 0)) return;
        const ntx = this.tileX + d.x;
        const nty = this.tileY + d.y;
        if (canMoveTo(ntx, nty, false)) {
          possibleDirs.push(d);
        }
      });
      if (possibleDirs.length === 0) {
        directions.forEach(d => {
          if (canMoveTo(this.tileX + d.x, this.tileY + d.y, false)) {
            possibleDirs.push(d);
          }
        });
      }
      if (possibleDirs.length > 0) {
        const chosen = possibleDirs[Math.floor(Math.random() * possibleDirs.length)];
        this.dirX = chosen.x;
        this.dirY = chosen.y;
      }
      return;
    } else {
      switch (this.name) {
        case "blinky": // 赤: パックマン直球追尾
          targetX = pacman.tileX;
          targetY = pacman.tileY;
          break;
        case "pinky": // 桃: パックマンの4マス先
          targetX = pacman.tileX + pacman.dirX * 4;
          targetY = pacman.tileY + pacman.dirY * 4;
          break;
        case "inky": // 青: 挟み撃ち
          const blinky = ghosts[0];
          const px = pacman.tileX + pacman.dirX * 2;
          const py = pacman.tileY + pacman.dirY * 2;
          targetX = px + (px - (blinky ? blinky.tileX : 9));
          targetY = py + (py - (blinky ? blinky.tileY : 7));
          break;
        case "clyde": // 橙: 接近で逃げる気まぐれAI
          const dist = Math.hypot(this.tileX - pacman.tileX, this.tileY - pacman.tileY);
          if (dist > 8) {
            targetX = pacman.tileX;
            targetY = pacman.tileY;
          } else {
            targetX = this.scatterX;
            targetY = this.scatterY;
          }
          break;
      }
    }

    const directions = [{ x: 0, y: -1 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 0 }];
    let bestDir = { x: 0, y: 0 };
    let minDistance = Infinity;
    let validMoves = [];

    directions.forEach(d => {
      // 逆走禁止
      if (d.x === -this.dirX && d.y === -this.dirY && (this.dirX !== 0 || this.dirY !== 0)) {
        return;
      }

      const nextTileX = this.tileX + d.x;
      const nextTileY = this.tileY + d.y;

      if (canMoveTo(nextTileX, nextTileY, isEaten)) {
        validMoves.push(d);
        const dist = Math.hypot(nextTileX - targetX, nextTileY - targetY);
        if (dist < minDistance) {
          minDistance = dist;
          bestDir = d;
        }
      }
    });

    // 逆走以外の道がない場合、振り返りを許可
    if (validMoves.length === 0) {
      directions.forEach(d => {
        const nextTileX = this.tileX + d.x;
        const nextTileY = this.tileY + d.y;
        if (canMoveTo(nextTileX, nextTileY, isEaten)) {
          const dist = Math.hypot(nextTileX - targetX, nextTileY - targetY);
          if (dist < minDistance) {
            minDistance = dist;
            bestDir = d;
          }
        }
      });
    }

    if (bestDir.x !== 0 || bestDir.y !== 0) {
      this.dirX = bestDir.x;
      this.dirY = bestDir.y;
    }
  }

  draw() {
    ctx.save();
    ctx.translate(this.x, this.y);

    if (this.state === "EATEN") {
      drawEyes(this.dirX, this.dirY);
      ctx.restore();
      return;
    }

    let bodyColor = this.color;
    if (this.state === "FRIGHTENED") {
      if (frightenedTimer < 120 && Math.floor(frightenedTimer / 12) % 2 === 0) {
        bodyColor = "#ffffff";
      } else {
        bodyColor = "#2563eb";
      }
    }

    ctx.fillStyle = bodyColor;
    ctx.shadowColor = bodyColor;
    ctx.shadowBlur = 6;

    ctx.beginPath();
    ctx.arc(0, -2, this.radius, Math.PI, 0, false);
    ctx.lineTo(this.radius, 7);

    const skirtStep = (this.radius * 2) / 3;
    const waveOffset = Math.sin(Date.now() * 0.015) * 1.5;
    ctx.lineTo(this.radius - skirtStep * 0.5, 5 + waveOffset);
    ctx.lineTo(this.radius - skirtStep, 7);
    ctx.lineTo(this.radius - skirtStep * 1.5, 5 - waveOffset);
    ctx.lineTo(this.radius - skirtStep * 2, 7);
    ctx.lineTo(this.radius - skirtStep * 2.5, 5 + waveOffset);
    ctx.lineTo(-this.radius, 7);

    ctx.closePath();
    ctx.fill();

    if (this.state === "FRIGHTENED") {
      ctx.fillStyle = bodyColor === "#ffffff" ? "#ef4444" : "#f8fafc";
      ctx.beginPath();
      ctx.arc(-3, -2, 1.5, 0, Math.PI * 2);
      ctx.arc(3, -2, 1.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = bodyColor === "#ffffff" ? "#ef4444" : "#f8fafc";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(-4, 3);
      ctx.lineTo(-2, 1.5);
      ctx.lineTo(0, 3);
      ctx.lineTo(2, 1.5);
      ctx.lineTo(4, 3);
      ctx.stroke();
    } else {
      drawEyes(this.dirX, this.dirY);
    }

    ctx.restore();
  }
}

function drawEyes(dirX, dirY) {
  const eyeOffsetX = dirX * 2;
  const eyeOffsetY = dirY * 2;

  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(-3.5 + eyeOffsetX * 0.5, -2 + eyeOffsetY * 0.5, 3.2, 0, Math.PI * 2);
  ctx.arc(3.5 + eyeOffsetX * 0.5, -2 + eyeOffsetY * 0.5, 3.2, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#1e3a8a";
  ctx.beginPath();
  ctx.arc(-3.5 + eyeOffsetX, -2 + eyeOffsetY, 1.6, 0, Math.PI * 2);
  ctx.arc(3.5 + eyeOffsetX, -2 + eyeOffsetY, 1.6, 0, Math.PI * 2);
  ctx.fill();
}

// ==========================================
// 6. マップ衝突判定・補助関数
// ==========================================
function canMoveTo(tileX, tileY, isEatenGhost) {
  // 左右ワープトンネル (行9)
  if (tileY === 9 && (tileX < 0 || tileX >= COLS)) {
    return true;
  }
  if (tileX < 0 || tileX >= COLS || tileY < 0 || tileY >= ROWS) {
    return false;
  }
  const tile = currentMap[tileY][tileX];
  if (tile === 1) return false; // 壁
  if (tile === 4) {
    return isEatenGhost; // ゴーストハウス扉は目玉状態のみ通過
  }
  return true;
}

function triggerFrightenedMode() {
  frightenedTimer = Math.max(180, frightenedDuration - (stage - 1) * 30);
  ghostComboMultiplier = 1;
  ghosts.forEach(g => {
    if (g.state !== "EATEN") {
      g.state = "FRIGHTENED";
      g.dirX = -g.dirX;
      g.dirY = -g.dirY;
    }
  });
}

// ==========================================
// 7. パーティクル & フローティングテキスト
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
    this.alpha -= 0.02;
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
  constructor(x, y, color) {
    this.x = x;
    this.y = y;
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 2.5 + 0.8;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.radius = Math.random() * 2.5 + 1;
    this.color = color;
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

function createBurstParticles(x, y, color, count = 12) {
  for (let i = 0; i < count; i++) {
    particles.push(new Particle(x, y, color));
  }
}

// ==========================================
// 8. マップの初期化 & 描画
// ==========================================
function initMap() {
  currentMap = [];
  totalDots = 0;
  for (let r = 0; r < ROWS; r++) {
    const row = [];
    for (let c = 0; c < COLS; c++) {
      const val = INITIAL_MAP[r][c];
      row.push(val);
      if (val === 2 || val === 3) {
        totalDots++;
      }
    }
    currentMap.push(row);
  }
  remainingDots = totalDots;
}

function drawMap() {
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const tile = currentMap[r][c];
      const x = c * TILE_SIZE;
      const y = r * TILE_SIZE;

      if (tile === 1) {
        ctx.fillStyle = "#0c1736";
        ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
        ctx.strokeStyle = "#2563eb";
        ctx.lineWidth = 1.5;
        ctx.strokeRect(x + 1, y + 1, TILE_SIZE - 2, TILE_SIZE - 2);
      } else if (tile === 4) {
        ctx.fillStyle = "rgba(244, 114, 182, 0.5)";
        ctx.fillRect(x, y + TILE_SIZE / 2 - 2, TILE_SIZE, 4);
      } else if (tile === 2) {
        ctx.fillStyle = "#fef08a";
        ctx.shadowColor = "#fef08a";
        ctx.shadowBlur = 3;
        ctx.beginPath();
        ctx.arc(x + TILE_SIZE / 2, y + TILE_SIZE / 2, 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      } else if (tile === 3) {
        const pulse = (Math.sin(Date.now() * 0.008) + 1) * 0.5;
        ctx.fillStyle = "#fde047";
        ctx.shadowColor = "#fde047";
        ctx.shadowBlur = 8 + pulse * 6;
        ctx.beginPath();
        ctx.arc(x + TILE_SIZE / 2, y + TILE_SIZE / 2, 5 + pulse * 1.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    }
  }
}

// ==========================================
// 9. ゲーム初期化・ライフサイクル
// ==========================================
function loadBestScore() {
  const saved = localStorage.getItem("pacman_best_score");
  if (saved !== null) {
    bestScore = parseInt(saved, 10);
    bestScoreDisplay.textContent = bestScore;
  }
}

function checkAndUpdateBestScore() {
  if (score > bestScore) {
    bestScore = score;
    localStorage.setItem("pacman_best_score", bestScore);
    bestScoreDisplay.textContent = bestScore;
    return true;
  }
  return false;
}

function updateLivesUI() {
  let icons = "";
  for (let i = 0; i < lives; i++) {
    icons += "🟡";
  }
  livesDisplay.textContent = icons || "0";
}

function startNewGame() {
  score = 0;
  lives = 3;
  stage = 1;
  scoreDisplay.textContent = "0";
  stageDisplay.textContent = "1";
  updateLivesUI();

  initMap();
  pacman = new Pacman();
  ghosts = GHOST_CONFIGS.map((cfg, idx) => new Ghost(cfg, idx));
  frightenedTimer = 0;
  floatingTexts = [];
  particles = [];
  activeKeys.clear();

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
  stageDisplay.textContent = stage;
  initMap();
  pacman.reset();
  ghosts.forEach(g => g.reset());
  frightenedTimer = 0;
  floatingTexts = [];
  particles = [];
  activeKeys.clear();

  clearOverlay.classList.add("hidden");
  isRunning = true;
  playClearJingle();
}

function handlePlayerDeath() {
  lives--;
  updateLivesUI();
  playDeathSound();
  pacman.dying = true;
  createBurstParticles(pacman.x, pacman.y, "#fde047", 20);

  setTimeout(() => {
    if (lives <= 0) {
      isRunning = false;
      const isNew = checkAndUpdateBestScore();
      finalScore.textContent = score;
      finalStage.textContent = stage;
      newRecordBadge.classList.toggle("hidden", !isNew);
      gameoverOverlay.classList.remove("hidden");
    } else {
      pacman.reset();
      ghosts.forEach(g => g.reset());
      frightenedTimer = 0;
      activeKeys.clear();
    }
  }, 900);
}

// ==========================================
// 10. メインゲームループ
// ==========================================
function gameLoop() {
  if (isRunning) {
    update();
    draw();
  }
  animFrameId = requestAnimationFrame(gameLoop);
}

function update() {
  // 1. パックマン更新
  pacman.update();

  // 2. イジケタイマー更新
  if (frightenedTimer > 0) {
    frightenedTimer--;
    if (frightenedTimer === 0) {
      ghosts.forEach(g => {
        if (g.state === "FRIGHTENED") g.state = "CHASE";
      });
    }
  }

  // 3. ゴースト更新
  ghosts.forEach(ghost => {
    ghost.update();

    if (!pacman.dying) {
      const dist = Math.hypot(pacman.x - ghost.x, pacman.y - ghost.y);
      if (dist < pacman.radius + ghost.radius - 2) {
        if (ghost.state === "FRIGHTENED") {
          ghost.state = "EATEN";
          const pts = 200 * ghostComboMultiplier;
          score += pts;
          scoreDisplay.textContent = score;
          ghostComboMultiplier = Math.min(16, ghostComboMultiplier * 2);

          floatingTexts.push(new FloatingText(`+${pts}`, ghost.x, ghost.y, "#38bdf8"));
          createBurstParticles(ghost.x, ghost.y, "#38bdf8", 16);
          playEatGhostSound();
        } else if (ghost.state === "CHASE" && !ghost.inHouse && ghost.houseTimer <= 0) {
          handlePlayerDeath();
        }
      }
    }
  });

  // 4. パーティクル & フローティングテキスト更新
  particles.forEach(p => p.update());
  particles = particles.filter(p => p.alpha > 0);

  floatingTexts.forEach(t => t.update());
  floatingTexts = floatingTexts.filter(t => t.alpha > 0);

  // 5. ステージクリア判定
  if (remainingDots <= 0 && !pacman.dying) {
    isRunning = false;
    playClearJingle();
    setTimeout(() => {
      clearOverlay.classList.remove("hidden");
    }, 500);
  }
}

function draw() {
  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  drawMap();
  pacman.draw();
  ghosts.forEach(g => g.draw());
  particles.forEach(p => p.draw());
  floatingTexts.forEach(t => t.draw());
}

// ==========================================
// 11. ユーザー入力・操作ハンドリング
// ==========================================
function updatePacmanDirectionFromKeys() {
  initAudio();
  if (!isRunning || !pacman || pacman.dying) return;

  if (activeKeys.has("ArrowUp") || activeKeys.has("KeyW") || activeKeys.has("btn-up")) {
    pacman.setNextDirection(0, -1);
  } else if (activeKeys.has("ArrowDown") || activeKeys.has("KeyS") || activeKeys.has("btn-down")) {
    pacman.setNextDirection(0, 1);
  } else if (activeKeys.has("ArrowLeft") || activeKeys.has("KeyA") || activeKeys.has("btn-left")) {
    pacman.setNextDirection(-1, 0);
  } else if (activeKeys.has("ArrowRight") || activeKeys.has("KeyD") || activeKeys.has("btn-right")) {
    pacman.setNextDirection(1, 0);
  } else {
    pacman.stop();
  }
}

// キーボード Keydown / Keyup
window.addEventListener("keydown", (e) => {
  if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space", " "].includes(e.code)) {
    e.preventDefault();
  }
  activeKeys.add(e.code);
  updatePacmanDirectionFromKeys();
}, { passive: false });

window.addEventListener("keyup", (e) => {
  activeKeys.delete(e.code);
  updatePacmanDirectionFromKeys();
});

// スマホ用 D-Pad ボタン
function setupDPadButton(btnId) {
  const btn = document.getElementById(btnId);
  if (!btn) return;

  const press = (e) => {
    e.preventDefault();
    activeKeys.add(btnId);
    updatePacmanDirectionFromKeys();
  };

  const release = (e) => {
    e.preventDefault();
    activeKeys.delete(btnId);
    updatePacmanDirectionFromKeys();
  };

  btn.addEventListener("touchstart", press, { passive: false });
  btn.addEventListener("touchend", release, { passive: false });
  btn.addEventListener("touchcancel", release, { passive: false });

  btn.addEventListener("mousedown", press);
  btn.addEventListener("mouseup", release);
  btn.addEventListener("mouseleave", release);
}

setupDPadButton("btn-up");
setupDPadButton("btn-down");
setupDPadButton("btn-left");
setupDPadButton("btn-right");

// スワイプ操作 (Canvas上)
let touchStartX = 0;
let touchStartY = 0;

canvas.addEventListener("touchstart", (e) => {
  if (e.touches.length > 0) {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
  }
}, { passive: true });

canvas.addEventListener("touchmove", (e) => {
  if (!e.touches.length) return;
  const dx = e.touches[0].clientX - touchStartX;
  const dy = e.touches[0].clientY - touchStartY;
  const absX = Math.abs(dx);
  const absY = Math.abs(dy);

  if (Math.max(absX, absY) > 16) {
    activeKeys.clear();
    if (absX > absY) {
      if (dx > 0) activeKeys.add("ArrowRight");
      else activeKeys.add("ArrowLeft");
    } else {
      if (dy > 0) activeKeys.add("ArrowDown");
      else activeKeys.add("ArrowUp");
    }
    updatePacmanDirectionFromKeys();
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
  }
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
  initMap();
  pacman = new Pacman();
  ghosts = GHOST_CONFIGS.map((cfg, idx) => new Ghost(cfg, idx));
  draw();
});
