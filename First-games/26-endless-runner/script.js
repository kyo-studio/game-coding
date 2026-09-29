/**
 * 26 エンドレスランナー (Cyber Rush)
 * 擬似3Dパースペクティブ・3レーン移動・ジャンプ・スライド・パワーアップ・Web Audio
 */

// ==========================================
// 1. 定数・設定
// ==========================================
const CANVAS_W = 360;
const CANVAS_H = 240;
const VP_X = 180;
const VP_Y = 75;
const LANE_WIDTH_BASE = 90;
const MAX_Z = 1200;

// ==========================================
// 2. 音響効果 (Web Audio API)
// ==========================================
class SoundManager {
  constructor() {
    this.ctx = null;
    this.bgmTimer = null;
    this.bgmStep = 0;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  // BGM 開始 (シンセウェーブ調アルペジオ)
  startBGM() {
    this.init();
    if (this.bgmTimer) return;

    const scale = [220, 261.63, 293.66, 329.63, 392.00, 440, 523.25]; // Aマイナー
    const bassline = [110, 110, 130.81, 146.83, 110, 110, 164.81, 146.83];

    this.bgmStep = 0;
    this.bgmTimer = setInterval(() => {
      if (!this.ctx) return;
      try {
        const t = this.ctx.currentTime;
        const step = this.bgmStep % 16;
        const bassNote = bassline[Math.floor(step / 2) % bassline.length];
        const leadNote = scale[(step * 3) % scale.length];

        // ベース音
        if (step % 2 === 0) {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(bassNote, t);

          gain.gain.setValueAtTime(0.08, t);
          gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);

          osc.connect(gain);
          gain.connect(this.ctx.destination);
          osc.start(t);
          osc.stop(t + 0.18);
        }

        // リードアルペジオ
        const leadOsc = this.ctx.createOscillator();
        const leadGain = this.ctx.createGain();
        leadOsc.type = 'triangle';
        leadOsc.frequency.setValueAtTime(leadNote, t);

        leadGain.gain.setValueAtTime(0.04, t);
        leadGain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

        leadOsc.connect(leadGain);
        leadGain.connect(this.ctx.destination);
        leadOsc.start(t);
        leadOsc.stop(t + 0.12);

        this.bgmStep++;
      } catch (e) {}
    }, 125);
  }

  stopBGM() {
    if (this.bgmTimer) {
      clearInterval(this.bgmTimer);
      this.bgmTimer = null;
    }
  }

  // レーン移動音
  playLaneChange() {
    if (!this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const t = this.ctx.currentTime;
      osc.type = 'sine';
      osc.frequency.setValueAtTime(300, t);
      osc.frequency.exponentialRampToValueAtTime(600, t + 0.08);

      gain.gain.setValueAtTime(0.1, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.08);
    } catch (e) {}
  }

  // ジャンプ音
  playJump() {
    if (!this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const t = this.ctx.currentTime;
      osc.type = 'square';
      osc.frequency.setValueAtTime(220, t);
      osc.frequency.exponentialRampToValueAtTime(880, t + 0.16);

      gain.gain.setValueAtTime(0.12, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.16);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.16);
    } catch (e) {}
  }

  // スライド音
  playSlide() {
    if (!this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const t = this.ctx.currentTime;
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(440, t);
      osc.frequency.exponentialRampToValueAtTime(150, t + 0.18);

      gain.gain.setValueAtTime(0.12, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.18);
    } catch (e) {}
  }

  // コイン取得音
  playCoin() {
    if (!this.ctx) return;
    try {
      const notes = [987.77, 1318.51];
      notes.forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const t = this.ctx.currentTime + idx * 0.06;
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, t);

        gain.gain.setValueAtTime(0.15, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t);
        osc.stop(t + 0.12);
      });
    } catch (e) {}
  }

  // パワーアップ音
  playPowerup() {
    if (!this.ctx) return;
    try {
      const notes = [440, 554.37, 659.25, 880];
      notes.forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const t = this.ctx.currentTime + idx * 0.07;
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, t);

        gain.gain.setValueAtTime(0.18, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t);
        osc.stop(t + 0.14);
      });
    } catch (e) {}
  }

  // シールド破壊音
  playShieldBreak() {
    if (!this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const t = this.ctx.currentTime;
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(600, t);
      osc.frequency.exponentialRampToValueAtTime(100, t + 0.25);

      gain.gain.setValueAtTime(0.25, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.25);
    } catch (e) {}
  }

  // クラッシュ音
  playCrash() {
    if (!this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const t = this.ctx.currentTime;
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(180, t);
      osc.frequency.exponentialRampToValueAtTime(40, t + 0.4);

      gain.gain.setValueAtTime(0.3, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.4);
    } catch (e) {}
  }
}

// ==========================================
// 3. パーティクル & エフェクト管理
// ==========================================
class ParticleManager {
  constructor() {
    this.particles = [];
  }

  addExplosion(x, y, color, count = 12) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 5;
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 3 + Math.random() * 4,
        color,
        alpha: 1,
        life: 0.35,
        maxLife: 0.35
      });
    }
  }

  update(dt) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life -= dt;
      p.alpha = Math.max(0, p.life / p.maxLife);
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  draw(ctx) {
    ctx.save();
    for (const p of this.particles) {
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}

// ==========================================
// 4. メインゲームクラス (CyberRunner)
// ==========================================
class CyberRunner {
  constructor() {
    this.canvas = document.getElementById('gameCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.sound = new SoundManager();
    this.effects = new ParticleManager();

    this.canvas.width = CANVAS_W;
    this.canvas.height = CANVAS_H;

    // DOM要素
    this.distDisplay = document.getElementById('dist-display');
    this.coinDisplay = document.getElementById('coin-display');
    this.scoreDisplay = document.getElementById('score-display');
    this.buffShield = document.getElementById('buff-shield');
    this.buffMagnet = document.getElementById('buff-magnet');
    this.buffBoost = document.getElementById('buff-boost');

    this.startOverlay = document.getElementById('start-overlay');
    this.gameoverOverlay = document.getElementById('gameover-overlay');
    this.finalDist = document.getElementById('final-dist');
    this.finalCoins = document.getElementById('final-coins');
    this.finalScore = document.getElementById('final-score');
    this.bestScoreDisplay = document.getElementById('best-score');
    this.newRecordBadge = document.getElementById('new-record-badge');
    this.startBtn = document.getElementById('start-btn');
    this.restartBtn = document.getElementById('restart-btn');

    // ゲーム状態
    this.isPlaying = false;
    this.isGameOver = false;
    this.distance = 0; // 走行距離 (m)
    this.coins = 0;
    this.score = 0;
    this.speed = 360; // 走行速度
    this.bestScore = this.loadBestScore();

    // プレイヤーオブジェクト
    this.player = {
      lane: 0,        // 目標レーン (-1: 左, 0: 中央, 1: 右)
      laneX: 0,       // 現在の描画レーンX (-1.0 〜 1.0)
      y: 0,           // ジャンプ高さ (0: 地面)
      vy: 0,          // 垂直速度
      isSliding: false,
      slideTimer: 0,
      shield: false,
      magnetTimer: 0,
      boostTimer: 0,
      invincibleTimer: 0,
      animTimer: 0
    };

    // オブジェクト配列
    this.obstacles = []; // [{ type, lane, z }]
    this.items = [];     // [{ type, lane, z, y }]
    this.spawnTimer = 0;
    this.gridOffset = 0;

    // スピードライン
    this.speedLines = [];
    for (let i = 0; i < 20; i++) {
      this.speedLines.push({
        x: Math.random() * CANVAS_W,
        y: Math.random() * CANVAS_H,
        length: 15 + Math.random() * 30,
        speed: 1.5 + Math.random() * 2
      });
    }

    this.lastTime = performance.now();

    this.initEvents();
    requestAnimationFrame((t) => this.gameLoop(t));
  }

  loadBestScore() {
    try {
      return parseInt(localStorage.getItem('cyber_runner_best'), 10) || 0;
    } catch (e) {
      return 0;
    }
  }

  saveBestScore(val) {
    if (val > this.bestScore) {
      this.bestScore = val;
      try {
        localStorage.setItem('cyber_runner_best', val);
      } catch (e) {}
      return true;
    }
    return false;
  }

  startGame() {
    this.sound.startBGM();
    this.isPlaying = true;
    this.isGameOver = false;
    this.distance = 0;
    this.coins = 0;
    this.score = 0;
    this.speed = 360;

    this.player.lane = 0;
    this.player.laneX = 0;
    this.player.y = 0;
    this.player.vy = 0;
    this.player.isSliding = false;
    this.player.slideTimer = 0;
    this.player.shield = false;
    this.player.magnetTimer = 0;
    this.player.boostTimer = 0;
    this.player.invincibleTimer = 0;

    this.obstacles = [];
    this.items = [];
    this.spawnTimer = 0.5;

    this.startOverlay.classList.add('hidden');
    this.gameoverOverlay.classList.add('hidden');
    this.updateHUD();
  }

  // ==========================================
  // 5. 操作入力アクション
  // ==========================================
  moveLeft() {
    if (!this.isPlaying || this.isGameOver) return;
    if (this.player.lane > -1) {
      this.player.lane--;
      this.sound.playLaneChange();
    }
  }

  moveRight() {
    if (!this.isPlaying || this.isGameOver) return;
    if (this.player.lane < 1) {
      this.player.lane++;
      this.sound.playLaneChange();
    }
  }

  jump() {
    if (!this.isPlaying || this.isGameOver) return;
    if (this.player.y === 0 && !this.player.isSliding) {
      this.player.vy = 18;
      this.sound.playJump();
    }
  }

  slide() {
    if (!this.isPlaying || this.isGameOver) return;
    if (this.player.y > 0) {
      // 空中なら急降下
      this.player.vy = -20;
    }
    this.player.isSliding = true;
    this.player.slideTimer = 0.7;
    this.sound.playSlide();
  }

  // ==========================================
  // 6. メインゲームループ
  // ==========================================
  gameLoop(time) {
    const dt = Math.min((time - this.lastTime) / 1000, 0.1);
    this.lastTime = time;

    if (this.isPlaying && !this.isGameOver) {
      this.update(dt);
    }

    this.effects.update(dt);
    this.render();

    requestAnimationFrame((t) => this.gameLoop(t));
  }

  update(dt) {
    const p = this.player;

    // 1. スピード・距離更新 (ブースト中は超加速)
    const currentSpeed = p.boostTimer > 0 ? this.speed * 1.8 : this.speed;
    this.distance += (currentSpeed * dt) / 10;
    this.score = Math.floor(this.distance) + this.coins * 50;

    // 徐々に最高速度アップ (最大 680)
    if (this.speed < 680) {
      this.speed += 3.5 * dt;
    }

    // 2. プレイヤーのX軸補間 (素早く滑らかにレーン移動)
    p.laneX += (p.lane - p.laneX) * Math.min(1, 16 * dt);

    // 3. ジャンプ物理演算
    if (p.y > 0 || p.vy > 0) {
      p.y += p.vy * 60 * dt;
      p.vy -= 48 * dt; // 重力
      if (p.y <= 0) {
        p.y = 0;
        p.vy = 0;
      }
    }

    // 4. スライディングタイマー
    if (p.isSliding) {
      p.slideTimer -= dt;
      if (p.slideTimer <= 0) {
        p.isSliding = false;
      }
    }

    // 5. バフタイマー更新
    if (p.invincibleTimer > 0) p.invincibleTimer -= dt;
    if (p.magnetTimer > 0) p.magnetTimer -= dt;
    if (p.boostTimer > 0) p.boostTimer -= dt;

    p.animTimer += dt * (currentSpeed / 200);
    this.gridOffset = (this.gridOffset + currentSpeed * dt * 0.8) % 60;

    // 6. 障害物・アイテム生成
    this.updateSpawning(dt);

    // 7. 障害物更新 & 衝突判定
    this.updateObstacles(dt, currentSpeed);

    // 8. アイテム更新 & 取得判定 (マグネット吸引含む)
    this.updateItems(dt, currentSpeed);

    this.updateHUD();
  }

  // 障害物・アイテムの定期生成
  updateSpawning(dt) {
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) {
      this.spawnTimer = Math.max(0.65, 1.4 - (this.speed - 360) / 400);

      const rand = Math.random();
      const lane = Math.floor(Math.random() * 3) - 1; // -1, 0, 1

      if (rand < 0.38) {
        // 低空バリケード (ジャンプ必須)
        this.obstacles.push({ type: 'hurdle', lane, z: MAX_Z });
      } else if (rand < 0.65) {
        // 高空レーザーバリア (スライディング必須)
        this.obstacles.push({ type: 'laser', lane, z: MAX_Z });
      } else if (rand < 0.82) {
        // 大型ウォール (レーン回避必須)
        this.obstacles.push({ type: 'wall', lane, z: MAX_Z });
      } else {
        // 2レーン同時バリケード (難易度上昇時)
        const otherLane = (lane === 0) ? (Math.random() < 0.5 ? -1 : 1) : 0;
        this.obstacles.push({ type: 'hurdle', lane, z: MAX_Z });
        this.obstacles.push({ type: 'hurdle', lane: otherLane, z: MAX_Z });
      }

      // アイテム生成 (障害物のないレーン or ジャンプ上空)
      if (Math.random() < 0.75) {
        const itemLane = Math.floor(Math.random() * 3) - 1;
        const itemTypeRoll = Math.random();

        if (itemTypeRoll < 0.65) {
          // コイン連続配置 (3〜4枚)
          for (let k = 0; k < 4; k++) {
            this.items.push({
              type: 'coin',
              lane: itemLane,
              z: MAX_Z + k * 80,
              y: 0
            });
          }
        } else if (itemTypeRoll < 0.80) {
          // マグネット
          this.items.push({ type: 'magnet', lane: itemLane, z: MAX_Z + 50, y: 15 });
        } else if (itemTypeRoll < 0.92) {
          // シールド
          this.items.push({ type: 'shield', lane: itemLane, z: MAX_Z + 50, y: 15 });
        } else {
          // ハイパーブースト
          this.items.push({ type: 'boost', lane: itemLane, z: MAX_Z + 50, y: 15 });
        }
      }
    }
  }

  // 障害物の更新と当たり判定
  updateObstacles(dt, currentSpeed) {
    const p = this.player;

    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const obs = this.obstacles[i];
      obs.z -= currentSpeed * dt;

      // 衝突判定 (Z深度がプレイヤー位置 -10 〜 30 に来た時)
      if (obs.z <= 30 && obs.z >= -20) {
        const laneDist = Math.abs(p.laneX - obs.lane);

        if (laneDist < 0.58) {
          let collided = false;

          if (obs.type === 'hurdle') {
            // ジャンプで飛び越えていないなら激突
            if (p.y < 22) collided = true;
          } else if (obs.type === 'laser') {
            // スライディングしていないなら激突
            if (!p.isSliding) collided = true;
          } else if (obs.type === 'wall') {
            // 壁はジャンプ・スライド問わず激突
            collided = true;
          }

          if (collided) {
            if (p.boostTimer > 0) {
              // ブースト中は障害物を粉砕！
              this.effects.addExplosion(this.projectX(obs.lane, obs.z), this.projectY(0, obs.z), '#38bdf8', 15);
              this.sound.playShieldBreak();
              this.score += 200;
              this.obstacles.splice(i, 1);
              continue;
            } else if (p.invincibleTimer > 0) {
              // 無敵時間中はすり抜け
            } else if (p.shield) {
              // シールド消費で救済
              p.shield = false;
              p.invincibleTimer = 1.8;
              this.effects.addExplosion(this.projectX(p.laneX, 0), this.projectY(p.y, 0), '#10b981', 18);
              this.sound.playShieldBreak();
            } else {
              // クラッシュ・ゲームオーバー
              this.handleGameOver();
              return;
            }
          }
        }
      }

      // 画面手前に通り過ぎたら削除
      if (obs.z < -60) {
        this.obstacles.splice(i, 1);
      }
    }
  }

  // アイテム更新 & 取得判定
  updateItems(dt, currentSpeed) {
    const p = this.player;

    for (let i = this.items.length - 1; i >= 0; i--) {
      const item = this.items[i];
      item.z -= currentSpeed * dt;

      // マグネット吸引処理
      if (p.magnetTimer > 0 && item.type === 'coin' && item.z < 600 && item.z > -10) {
        item.lane += (p.laneX - item.lane) * Math.min(1, 12 * dt);
        item.z -= currentSpeed * 0.5 * dt;
      }

      // 取得判定
      if (item.z <= 35 && item.z >= -20) {
        const laneDist = Math.abs(p.laneX - item.lane);
        const yDist = Math.abs(p.y - item.y);

        if (laneDist < 0.65 && yDist < 35) {
          // アイテムゲット！
          const screenX = this.projectX(item.lane, item.z);
          const screenY = this.projectY(item.y, item.z);

          if (item.type === 'coin') {
            this.coins++;
            this.score += 50;
            this.sound.playCoin();
            this.effects.addExplosion(screenX, screenY, '#fbbf24', 6);
          } else if (item.type === 'shield') {
            p.shield = true;
            this.sound.playPowerup();
            this.effects.addExplosion(screenX, screenY, '#10b981', 14);
          } else if (item.type === 'magnet') {
            p.magnetTimer = 8.0;
            this.sound.playPowerup();
            this.effects.addExplosion(screenX, screenY, '#ec4899', 14);
          } else if (item.type === 'boost') {
            p.boostTimer = 5.0;
            p.invincibleTimer = 5.0;
            this.sound.playPowerup();
            this.effects.addExplosion(screenX, screenY, '#06b6d4', 20);
          }

          this.items.splice(i, 1);
          continue;
        }
      }

      if (item.z < -60) {
        this.items.splice(i, 1);
      }
    }
  }

  // ゲームオーバー処理
  handleGameOver() {
    this.isPlaying = false;
    this.isGameOver = true;
    this.sound.stopBGM();
    this.sound.playCrash();

    const isNew = this.saveBestScore(this.score);
    this.finalDist.textContent = `${Math.floor(this.distance)}m`;
    this.finalCoins.textContent = this.coins;
    this.finalScore.textContent = this.score;
    this.bestScoreDisplay.textContent = this.bestScore;

    if (isNew) {
      this.newRecordBadge.classList.remove('hidden');
    } else {
      this.newRecordBadge.classList.add('hidden');
    }

    this.effects.addExplosion(this.projectX(this.player.laneX, 0), this.projectY(this.player.y, 0), '#f43f5e', 30);
    this.gameoverOverlay.classList.remove('hidden');
  }

  // HUD表示更新
  updateHUD() {
    this.distDisplay.textContent = `${Math.floor(this.distance)}m`;
    this.coinDisplay.textContent = this.coins;
    this.scoreDisplay.textContent = String(this.score).padStart(6, '0');

    // バフアイコン表示切替
    const p = this.player;
    if (p.shield) {
      this.buffShield.classList.remove('hidden');
    } else {
      this.buffShield.classList.add('hidden');
    }

    if (p.magnetTimer > 0) {
      this.buffMagnet.classList.remove('hidden');
    } else {
      this.buffMagnet.classList.add('hidden');
    }

    if (p.boostTimer > 0) {
      this.buffBoost.classList.remove('hidden');
    } else {
      this.buffBoost.classList.add('hidden');
    }
  }

  // ==========================================
  // 7. 3Dパースペクティブ投影 & レンダリング
  // ==========================================
  getScale(z) {
    return 1 / (1 + z * 0.0032);
  }

  projectX(laneX, z) {
    const scale = this.getScale(z);
    return VP_X + laneX * LANE_WIDTH_BASE * scale;
  }

  projectY(yOffset, z) {
    const scale = this.getScale(z);
    return VP_Y + (224 - VP_Y) * scale - yOffset * scale;
  }

  render() {
    const { ctx, canvas } = this;

    // 1. 背景 (サイバーシティ夜景 & グリッド空)
    ctx.fillStyle = '#050814';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    this.drawSkyline(ctx);

    // 2. ネオンハイウェイ (3レーン道路 & グリッド線)
    this.drawHighway(ctx);

    // 3. 障害物・アイテム描画 (奥のオブジェクトから順にソート描画)
    const renderList = [];

    this.obstacles.forEach(obs => {
      renderList.push({ type: 'obs', obj: obs, z: obs.z });
    });

    this.items.forEach(item => {
      renderList.push({ type: 'item', obj: item, z: item.z });
    });

    // プレイヤーも深度リストに投入 (Z=0)
    renderList.push({ type: 'player', obj: this.player, z: 0 });

    renderList.sort((a, b) => b.z - a.z);

    renderList.forEach(item => {
      if (item.type === 'obs') {
        this.drawObstacle(ctx, item.obj);
      } else if (item.type === 'item') {
        this.drawItem(ctx, item.obj);
      } else if (item.type === 'player') {
        this.drawPlayer(ctx);
      }
    });

    // 4. スピードライン (疾走感演出)
    this.drawSpeedLines(ctx);

    // 5. パーティクル
    this.effects.draw(ctx);
  }

  // 近未来ビル群のシルエット背景
  drawSkyline(ctx) {
    ctx.save();
    // 遠景ビル群
    ctx.fillStyle = '#0f172a';
    for (let i = 0; i < 9; i++) {
      const bx = i * 42 - 10;
      const bw = 36;
      const bh = 25 + (i * 17) % 35;
      ctx.fillRect(bx, VP_Y - bh, bw, bh);

      // ビルの小窓ネオン
      ctx.fillStyle = (i % 2 === 0) ? '#06b6d4' : '#ec4899';
      ctx.globalAlpha = 0.3;
      for (let w = 4; w < bw - 4; w += 8) {
        for (let h = 4; h < bh - 4; h += 7) {
          ctx.fillRect(bx + w, VP_Y - bh + h, 3, 3);
        }
      }
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#0f172a';
    }

    // 地平線ネオンライン
    ctx.strokeStyle = '#06b6d4';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, VP_Y);
    ctx.lineTo(CANVAS_W, VP_Y);
    ctx.stroke();

    ctx.restore();
  }

  // ネオンハイウェイ道路
  drawHighway(ctx) {
    ctx.save();

    // 道路本体（手前に広がる台形）
    const p1 = { x: VP_X - 18, y: VP_Y };
    const p2 = { x: VP_X + 18, y: VP_Y };
    const p3 = { x: CANVAS_W + 20, y: CANVAS_H };
    const p4 = { x: -20, y: CANVAS_H };

    const grad = ctx.createLinearGradient(0, VP_Y, 0, CANVAS_H);
    grad.addColorStop(0, '#090d16');
    grad.addColorStop(1, '#020617');
    ctx.fillStyle = grad;

    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.lineTo(p3.x, p3.y);
    ctx.lineTo(p4.x, p4.y);
    ctx.closePath();
    ctx.fill();

    // 外側ネオン枠線 (マゼンタ & シアン)
    ctx.strokeStyle = '#ec4899';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p4.x, p4.y);
    ctx.moveTo(p2.x, p2.y);
    ctx.lineTo(p3.x, p3.y);
    ctx.stroke();

    // レーン境界線 (2本)
    ctx.strokeStyle = 'rgba(6, 182, 212, 0.45)';
    ctx.lineWidth = 1.5;
    [-0.5, 0.5].forEach(l => {
      ctx.beginPath();
      ctx.moveTo(this.projectX(l, MAX_Z), VP_Y);
      ctx.lineTo(this.projectX(l, 0), 224);
      ctx.stroke();
    });

    // 水平スクロールグリッド線 (奥行き感)
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.25)';
    ctx.lineWidth = 1;
    for (let z = this.gridOffset; z < MAX_Z; z += 50) {
      const y = this.projectY(0, z);
      const leftX = this.projectX(-1.5, z);
      const rightX = this.projectX(1.5, z);
      ctx.beginPath();
      ctx.moveTo(leftX, y);
      ctx.lineTo(rightX, y);
      ctx.stroke();
    }

    ctx.restore();
  }

  // 障害物描画
  drawObstacle(ctx, obs) {
    const scale = this.getScale(obs.z);
    const x = this.projectX(obs.lane, obs.z);
    const y = this.projectY(0, obs.z);

    ctx.save();
    if (obs.type === 'hurdle') {
      // 低空バリケード (ネオンイエロー / トゲ付き)
      const w = 48 * scale;
      const h = 18 * scale;
      ctx.fillStyle = '#eab308';
      ctx.fillRect(x - w / 2, y - h, w, h);
      ctx.strokeStyle = '#fef08a';
      ctx.lineWidth = 2 * scale;
      ctx.strokeRect(x - w / 2, y - h, w, h);

      // 警告ストライプ
      ctx.fillStyle = '#090d16';
      for (let sx = -w / 2 + 4 * scale; sx < w / 2 - 4 * scale; sx += 8 * scale) {
        ctx.fillRect(x + sx, y - h + 2 * scale, 3 * scale, h - 4 * scale);
      }
    } else if (obs.type === 'laser') {
      // 高空レーザーバリア (ネオンマゼンタ)
      const w = 56 * scale;
      const barH = 14 * scale;
      const barY = y - 36 * scale;

      // 支柱
      ctx.fillStyle = '#475569';
      ctx.fillRect(x - w / 2, y - 40 * scale, 4 * scale, 40 * scale);
      ctx.fillRect(x + w / 2 - 4 * scale, y - 40 * scale, 4 * scale, 40 * scale);

      // レーザー発光部
      ctx.fillStyle = '#f43f5e';
      ctx.shadowColor = '#f43f5e';
      ctx.shadowBlur = 10 * scale;
      ctx.fillRect(x - w / 2, barY, w, barH);
    } else if (obs.type === 'wall') {
      // 大型ウォールブロック (重厚シアンブロック)
      const w = 46 * scale;
      const h = 54 * scale;
      ctx.fillStyle = '#0284c7';
      ctx.fillRect(x - w / 2, y - h, w, h);
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2 * scale;
      ctx.strokeRect(x - w / 2, y - h, w, h);

      // バツ印警告
      ctx.beginPath();
      ctx.moveTo(x - w / 2 + 4 * scale, y - h + 4 * scale);
      ctx.lineTo(x + w / 2 - 4 * scale, y - 4 * scale);
      ctx.moveTo(x + w / 2 - 4 * scale, y - h + 4 * scale);
      ctx.lineTo(x - w / 2 + 4 * scale, y - 4 * scale);
      ctx.stroke();
    }
    ctx.restore();
  }

  // アイテム描画
  drawItem(ctx, item) {
    const scale = this.getScale(item.z);
    const x = this.projectX(item.lane, item.z);
    const y = this.projectY(item.y, item.z);

    ctx.save();
    if (item.type === 'coin') {
      // 回転ゴールドコイン
      const r = 10 * scale;
      const bounce = Math.sin(this.player.animTimer * 6 + item.z) * 3 * scale;
      ctx.fillStyle = '#fbbf24';
      ctx.strokeStyle = '#d97706';
      ctx.lineWidth = 2 * scale;
      ctx.beginPath();
      ctx.arc(x, y - 12 * scale + bounce, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = `bold ${8 * scale}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('$', x, y - 12 * scale + bounce);
    } else {
      // パワーアップカプセル (シールド / マグネット / ブースト)
      const size = 16 * scale;
      const bounce = Math.sin(this.player.animTimer * 5) * 4 * scale;
      let icon = '🛡️';
      let col = '#10b981';
      if (item.type === 'magnet') { icon = '🧲'; col = '#ec4899'; }
      if (item.type === 'boost') { icon = '🚀'; col = '#06b6d4'; }

      ctx.shadowColor = col;
      ctx.shadowBlur = 8 * scale;
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.arc(x, y - 16 * scale + bounce, size, 0, Math.PI * 2);
      ctx.fill();

      ctx.font = `${14 * scale}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(icon, x, y - 15 * scale + bounce);
    }
    ctx.restore();
  }

  // プレイヤー描画
  drawPlayer(ctx) {
    const p = this.player;
    const x = this.projectX(p.laneX, 0);
    const y = this.projectY(p.y, 0);

    ctx.save();

    // 無敵点滅
    if (p.invincibleTimer > 0 && p.boostTimer <= 0) {
      if (Math.floor(p.invincibleTimer * 14) % 2 === 0) {
        ctx.globalAlpha = 0.35;
      }
    }

    // ハイパーブースト時のオーラ
    if (p.boostTimer > 0) {
      ctx.shadowColor = '#06b6d4';
      ctx.shadowBlur = 20;
      ctx.fillStyle = 'rgba(6, 182, 212, 0.4)';
      ctx.beginPath();
      ctx.arc(x, y - 24, 32, 0, Math.PI * 2);
      ctx.fill();
    }

    // シールドオーラ
    if (p.shield) {
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(x, y - 22, 26, 0, Math.PI * 2);
      ctx.stroke();
    }

    // プレイヤー本体描画 (サイバーランナーの背面)
    if (p.isSliding) {
      // スライディング姿勢 (横たわって滑走)
      ctx.fillStyle = '#06b6d4';
      ctx.fillRect(x - 20, y - 12, 40, 10);
      // 頭部
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(x + 16, y - 10, 6, 0, Math.PI * 2);
      ctx.fill();
      // スパーク
      ctx.fillStyle = '#fbbf24';
      ctx.fillRect(x - 24, y - 4, 8, 3);
    } else {
      // ランニング / ジャンプ姿勢
      const runCycle = Math.sin(p.animTimer * 12);

      // 脚
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(x - 10, y - 14 + runCycle * 4, 6, 14);
      ctx.fillRect(x + 4, y - 14 - runCycle * 4, 6, 14);

      // 靴（ネオンブルー）
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(x - 12, y - 4 + runCycle * 4, 8, 4);
      ctx.fillRect(x + 2, y - 4 - runCycle * 4, 8, 4);

      // 胴体 (サイバースーツ)
      ctx.fillStyle = '#0284c7';
      ctx.fillRect(x - 12, y - 34, 24, 22);

      // 背中のサイバーパック (ネオン発光)
      ctx.fillStyle = '#ec4899';
      ctx.shadowColor = '#ec4899';
      ctx.shadowBlur = 8;
      ctx.fillRect(x - 6, y - 30, 12, 12);
      ctx.shadowBlur = 0;

      // 頭部・ヘルメット
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(x, y - 42, 10, 0, Math.PI * 2);
      ctx.fill();

      // バイザー（シアン）
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(x - 6, y - 44, 12, 4);
    }

    ctx.restore();
  }

  // スピードライン描画
  drawSpeedLines(ctx) {
    ctx.save();
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.3)';
    ctx.lineWidth = 1.2;

    const currentSpeed = this.player.boostTimer > 0 ? 2.5 : 1.0;

    for (const l of this.speedLines) {
      l.y += l.speed * currentSpeed * 2.5;
      if (l.y > CANVAS_H) {
        l.y = VP_Y;
        l.x = Math.random() * CANVAS_W;
      }

      ctx.beginPath();
      ctx.moveTo(l.x, l.y);
      ctx.lineTo(l.x, l.y + l.length);
      ctx.stroke();
    }
    ctx.restore();
  }

  // ==========================================
  // 8. イベントハンドリング & スワイプ検出
  // ==========================================
  initEvents() {
    // 1. キーボード操作
    window.addEventListener('keydown', (e) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
        e.preventDefault();
      }

      switch (e.key) {
        case 'ArrowLeft':
        case 'a':
        case 'A':
          this.moveLeft();
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          this.moveRight();
          break;
        case 'ArrowUp':
        case 'w':
        case 'W':
        case ' ':
          this.jump();
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          this.slide();
          break;
      }
    });

    // 2. モバイル仮想ゲームパッド
    const padButtons = document.querySelectorAll('.pad-btn');
    padButtons.forEach(btn => {
      const act = btn.dataset.act;
      const trigger = (e) => {
        e.preventDefault();
        this.sound.init();
        if (act === 'left') this.moveLeft();
        if (act === 'right') this.moveRight();
        if (act === 'jump') this.jump();
        if (act === 'slide') this.slide();
      };
      btn.addEventListener('pointerdown', trigger);
    });

    // 3. Canvasスワイプジェスチャー検出
    let touchStartX = 0;
    let touchStartY = 0;

    this.canvas.addEventListener('touchstart', (e) => {
      const touch = e.touches[0];
      touchStartX = touch.clientX;
      touchStartY = touch.clientY;
      this.sound.init();
    }, { passive: true });

    this.canvas.addEventListener('touchend', (e) => {
      const touch = e.changedTouches[0];
      const dx = touch.clientX - touchStartX;
      const dy = touch.clientY - touchStartY;
      const absX = Math.abs(dx);
      const absY = Math.abs(dy);

      if (Math.max(absX, absY) > 24) {
        if (absX > absY) {
          // 左右スワイプ
          if (dx < 0) this.moveLeft();
          else this.moveRight();
        } else {
          // 上下スワイプ
          if (dy < 0) this.jump();
          else this.slide();
        }
      }
    }, { passive: true });

    // 4. スタート・リスタートボタン
    this.startBtn.addEventListener('click', () => this.startGame());
    this.restartBtn.addEventListener('click', () => this.startGame());
  }
}

// ==========================================
// iOS / iPadOS Safari ズーム抑止
// ==========================================
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

// ゲーム起動
window.addEventListener('DOMContentLoaded', () => {
  new CyberRunner();
});
