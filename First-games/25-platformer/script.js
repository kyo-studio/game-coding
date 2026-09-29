/**
 * 25 ジャンプアクション (Platformer) - コアゲームスクリプト
 * 2Dプラットフォーマー物理・カメラ追従・踏みつけ・頭突きブロック・3ステージ・Web Audio
 */

// ==========================================
// 1. 定数・タイル定義
// ==========================================
const TILE_SIZE = 24; // 迫力ある24pxタイル

const STAGES_DATA = [
  // Stage 1: 草原 (Grassland)
  {
    name: '1-1',
    bg: '#5c94fc', // 青空
    theme: 'grass',
    time: 300,
    map: [
      "                                                                                          ",
      "                                                                                          ",
      "                                                                                          ",
      "                   ??M?                                   ???                             ",
      "                                                                                          ",
      "                                 PP                                      PP             F ",
      "             E       E           PP         E       E                    PP             F ",
      "##########################################################################################",
      "##########################################################################################",
      "##########################################################################################"
    ]
  },
  // Stage 2: 地下洞窟 (Underground Cave)
  {
    name: '1-2',
    bg: '#0f172a', // 暗闇
    theme: 'cave',
    time: 250,
    map: [
      "##########################################################################################",
      "#                                                                                        #",
      "#                  ????                                 ???                              #",
      "#                                                                                        #",
      "#           ###             ###                  ###             ###                     #",
      "#                                                                                        #",
      "#      E           SS             E       K             SS                       PP    F #",
      "#    #####        ####          #####   #####          ####                      PP    F #",
      "##########################################################################################",
      "##########################################################################################"
    ]
  },
  // Stage 3: 城アスレチック (Castle Athletic)
  {
    name: '1-3',
    bg: '#1c1917', // 溶岩城
    theme: 'castle',
    time: 200,
    map: [
      "##########################################################################################",
      "#                                                                                        #",
      "#                 M???M                                 ????                             #",
      "#                                                                                        #",
      "#          ###             ###                   ###             ###                     #",
      "#                                                                                        #",
      "#      K          SSSS           K         K            SSSS                     PP    F #",
      "#    #####       ######        #####     #####         ######                    PP    F #",
      "##########################################################################################",
      "##########################################################################################"
    ]
  }
];

// ==========================================
// 2. 音響効果 (Web Audio API)
// ==========================================
class SoundManager {
  constructor() {
    this.ctx = null;
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

  // ジャンプ音
  playJump() {
    if (!this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const t = this.ctx.currentTime;
      osc.type = 'square';
      osc.frequency.setValueAtTime(160, t);
      osc.frequency.exponentialRampToValueAtTime(650, t + 0.12);

      gain.gain.setValueAtTime(0.12, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.12);
    } catch (e) {}
  }

  // コイン取得音
  playCoin() {
    if (!this.ctx) return;
    try {
      const notes = [987.77, 1318.51]; // B5, E6
      notes.forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const t = this.ctx.currentTime + idx * 0.07;
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, t);

        gain.gain.setValueAtTime(0.18, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t);
        osc.stop(t + 0.18);
      });
    } catch (e) {}
  }

  // ブロック頭突き音 (ポコッ)
  playBump() {
    if (!this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const t = this.ctx.currentTime;
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(280, t);
      osc.frequency.exponentialRampToValueAtTime(90, t + 0.08);

      gain.gain.setValueAtTime(0.18, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.08);
    } catch (e) {}
  }

  // 敵踏みつけ音 (プチュッ)
  playStomp() {
    if (!this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const t = this.ctx.currentTime;
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(380, t);
      osc.frequency.exponentialRampToValueAtTime(90, t + 0.1);

      gain.gain.setValueAtTime(0.25, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.1);
    } catch (e) {}
  }

  // パワーアップキノコ取得音
  playPowerup() {
    if (!this.ctx) return;
    try {
      const notes = [330, 392, 659, 523, 587, 784];
      notes.forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const t = this.ctx.currentTime + idx * 0.05;
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, t);

        gain.gain.setValueAtTime(0.15, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t);
        osc.stop(t + 0.1);
      });
    } catch (e) {}
  }

  // ステージクリアファンファーレ
  playClear() {
    if (!this.ctx) return;
    try {
      const notes = [
        { f: 523.25, d: 0.1 },  // C5
        { f: 659.25, d: 0.1 },  // E5
        { f: 783.99, d: 0.1 },  // G5
        { f: 1046.50, d: 0.12 }, // C6
        { f: 1318.51, d: 0.3 }  // E6
      ];
      let delay = 0;
      notes.forEach((n) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const t = this.ctx.currentTime + delay;
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(n.f, t);

        gain.gain.setValueAtTime(0.25, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + n.d);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t);
        osc.stop(t + n.d);
        delay += n.d * 0.85;
      });
    } catch (e) {}
  }

  // ミス・死亡音
  playDie() {
    if (!this.ctx) return;
    try {
      const notes = [500, 450, 400, 300, 200];
      notes.forEach((f, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const t = this.ctx.currentTime + idx * 0.09;
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(f, t);

        gain.gain.setValueAtTime(0.2, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t);
        osc.stop(t + 0.12);
      });
    } catch (e) {}
  }

  // 被弾・縮小音 (パワーダウン)
  playShrink() {
    if (!this.ctx) return;
    try {
      const notes = [784, 587, 523, 392, 261];
      notes.forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const t = this.ctx.currentTime + idx * 0.06;
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, t);

        gain.gain.setValueAtTime(0.2, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t);
        osc.stop(t + 0.08);
      });
    } catch (e) {}
  }
}

// ==========================================
// 3. パーティクル & エフェクト
// ==========================================
class ParticleManager {
  constructor() {
    this.particles = [];
    this.bumpingBlocks = []; // [{ x, y, origY, vy }]
    this.floatingCoins = []; // [{ x, y, vy, life }]
  }

  addSparkles(x, y, color) {
    for (let i = 0; i < 10; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.5 + Math.random() * 3.5;
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 3 + Math.random() * 3,
        color,
        alpha: 1,
        life: 0.4,
        maxLife: 0.4
      });
    }
  }

  addFloatingCoin(x, y) {
    this.floatingCoins.push({
      x, y,
      vy: -5.5,
      life: 0.45
    });
  }

  addBumpingBlock(x, y) {
    this.bumpingBlocks.push({
      x, y,
      offsetY: 0,
      vy: -4
    });
  }

  update(dt) {
    // 浮遊コイン
    for (let i = this.floatingCoins.length - 1; i >= 0; i--) {
      const c = this.floatingCoins[i];
      c.y += c.vy;
      c.vy += 15 * dt;
      c.life -= dt;
      if (c.life <= 0) {
        this.floatingCoins.splice(i, 1);
      }
    }

    // バウンドブロック
    for (let i = this.bumpingBlocks.length - 1; i >= 0; i--) {
      const b = this.bumpingBlocks[i];
      b.offsetY += b.vy;
      b.vy += 22 * dt;
      if (b.offsetY >= 0) {
        this.bumpingBlocks.splice(i, 1);
      }
    }

    // パーティクル
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

  draw(ctx, cameraX) {
    // 浮遊コイン
    ctx.save();
    for (const c of this.floatingCoins) {
      const screenX = c.x - cameraX;
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.arc(screenX, c.y, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#d97706';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    ctx.restore();

    // パーティクル
    ctx.save();
    for (const p of this.particles) {
      const screenX = p.x - cameraX;
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(screenX, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}

// ==========================================
// 4. メインゲームクラス (PlatformerGame)
// ==========================================
class PlatformerGame {
  constructor() {
    this.canvas = document.getElementById('gameCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.sound = new SoundManager();
    this.effects = new ParticleManager();

    // Canvas内部解像度を 360x240 (15x10タイル) に設定
    this.canvas.width = 360;
    this.canvas.height = 240;

    // DOM要素
    this.livesDisplay = document.getElementById('lives-display');
    this.coinsDisplay = document.getElementById('coins-display');
    this.scoreDisplay = document.getElementById('score-display');
    this.timeDisplay = document.getElementById('time-display');
    this.stageDisplay = document.getElementById('stage-display');

    this.startOverlay = document.getElementById('start-overlay');
    this.clearOverlay = document.getElementById('clear-overlay');
    this.clearTimeBonus = document.getElementById('clear-time-bonus');
    this.clearScore = document.getElementById('clear-score');
    this.nextStageBtn = document.getElementById('next-stage-btn');

    this.gameoverOverlay = document.getElementById('gameover-overlay');
    this.finalScore = document.getElementById('final-score');
    this.finalStage = document.getElementById('final-stage');
    this.newRecordBadge = document.getElementById('new-record-badge');
    this.restartBtn = document.getElementById('restart-btn');
    this.startBtn = document.getElementById('start-btn');

    // ゲーム状態
    this.currentStageIdx = 0;
    this.score = 0;
    this.coins = 0;
    this.lives = 3;
    this.timeLeft = 300;
    this.bestScore = this.loadBestScore();

    this.isPlaying = false;
    this.isCleared = false;
    this.isGameOver = false;

    // プレイヤーオブジェクト (見やすく拡大: 幅16, 通常高22, 巨大高34)
    this.player = {
      x: 48,
      y: 168,
      vx: 0,
      vy: 0,
      width: 16,
      height: 22,
      grounded: false,
      facingLeft: false,
      isBig: false,
      invincibleTimer: 0,
      isDying: false,
      animFrame: 0
    };

    // マップ・敵・アイテム
    this.mapData = [];
    this.mapRows = 10;
    this.mapCols = 90;
    this.enemies = []; // [{ x, y, vx, vy, type: 'walker'|'jumper', isDead, deadTimer }]
    this.items = [];   // [{ x, y, vx, vy, type: 'mushroom' }]
    this.flagPole = { x: 0, y: 0 };

    this.cameraX = 0;
    this.keys = { left: false, right: false, jump: false, run: false };
    this.lastTime = performance.now();

    // 初期化
    this.initEvents();
    this.loadStage(0);
    requestAnimationFrame((t) => this.gameLoop(t));
  }

  loadBestScore() {
    try {
      return parseInt(localStorage.getItem('platformer_best_score'), 10) || 0;
    } catch (e) {
      return 0;
    }
  }

  saveBestScore(val) {
    if (val > this.bestScore) {
      this.bestScore = val;
      try {
        localStorage.setItem('platformer_best_score', val);
      } catch (e) {}
      return true;
    }
    return false;
  }

  // 新規ゲーム開始
  startGame() {
    this.sound.init();
    this.score = 0;
    this.coins = 0;
    this.lives = 3;
    this.currentStageIdx = 0;
    this.player.isBig = false;
    this.player.invincibleTimer = 0;
    this.loadStage(0);

    this.isPlaying = true;
    this.isGameOver = false;
    this.isCleared = false;

    this.startOverlay.classList.add('hidden');
    this.clearOverlay.classList.add('hidden');
    this.gameoverOverlay.classList.add('gameoverOverlay' in this ? 'hidden' : 'hidden');
    this.gameoverOverlay.classList.add('hidden');
  }

  // ステージ読み込み
  loadStage(idx) {
    this.currentStageIdx = idx;
    const stage = STAGES_DATA[this.currentStageIdx];
    this.mapRows = stage.map.length;
    this.mapCols = stage.map[0].length;
    this.timeLeft = stage.time;

    // マップパース
    this.mapData = Array.from({ length: this.mapRows }, () => Array(this.mapCols).fill(' '));
    this.enemies = [];
    this.items = [];

    for (let r = 0; r < this.mapRows; r++) {
      const rowStr = stage.map[r];
      for (let c = 0; c < this.mapCols; c++) {
        const ch = c < rowStr.length ? rowStr[c] : ' ';
        if (ch === 'E') {
          // クリボー歩行敵
          this.enemies.push({
            x: c * TILE_SIZE,
            y: r * TILE_SIZE + 4,
            vx: -1.0,
            vy: 0,
            width: 18,
            height: 18,
            type: 'walker',
            isDead: false,
            deadTimer: 0
          });
        } else if (ch === 'K') {
          // パタパタジャンプ敵
          this.enemies.push({
            x: c * TILE_SIZE,
            y: r * TILE_SIZE,
            vx: -0.8,
            vy: -4.5,
            width: 18,
            height: 20,
            type: 'jumper',
            jumpTimer: 0,
            isDead: false,
            deadTimer: 0
          });
        } else if (ch === 'F') {
          this.flagPole = { x: c * TILE_SIZE, y: r * TILE_SIZE };
          this.mapData[r][c] = 'F';
        } else {
          this.mapData[r][c] = ch;
        }
      }
    }

    // プレイヤー初期位置
    this.player.x = 48;
    this.player.y = (this.mapRows - 3) * TILE_SIZE;
    this.player.vx = 0;
    this.player.vy = 0;
    this.player.grounded = false;
    this.player.isDying = false;
    this.player.invincibleTimer = 0;
    this.cameraX = 0;

    this.updateHUD();
    this.clearOverlay.classList.add('hidden');
  }

  // ==========================================
  // 5. 物理演算 & ゲームループ
  // ==========================================
  gameLoop(time) {
    const dt = Math.min((time - this.lastTime) / 1000, 0.1);
    this.lastTime = time;

    if (this.isPlaying && !this.isCleared && !this.isGameOver) {
      this.update(dt);
    }

    this.effects.update(dt);
    this.render();

    requestAnimationFrame((t) => this.gameLoop(t));
  }

  update(dt) {
    // タイムカウントダウン
    this.timeLeft -= dt;
    if (this.timeLeft <= 0) {
      this.handlePlayerDie();
      return;
    }
    this.timeDisplay.textContent = Math.ceil(this.timeLeft);

    // 無敵タイマー更新
    if (this.player.invincibleTimer > 0) {
      this.player.invincibleTimer -= dt;
    }

    if (this.player.isDying) {
      this.player.y += this.player.vy;
      this.player.vy += 22 * dt;
      if (this.player.y > this.canvas.height + 40) {
        this.respawnOrGameOver();
      }
      return;
    }

    // 1. プレイヤー左右移動物理
    const maxSpd = this.keys.run ? 4.2 : 2.8;
    const accel = 15 * dt;

    if (this.keys.left) {
      this.player.vx = Math.max(-maxSpd, this.player.vx - accel);
      this.player.facingLeft = true;
    } else if (this.keys.right) {
      this.player.vx = Math.min(maxSpd, this.player.vx + accel);
      this.player.facingLeft = false;
    } else {
      this.player.vx *= 0.82; // 摩擦
      if (Math.abs(this.player.vx) < 0.05) this.player.vx = 0;
    }

    // 2. ジャンプ物理
    if (this.keys.jump && this.player.grounded) {
      this.player.vy = -7.5;
      this.player.grounded = false;
      this.sound.playJump();
    }

    // 重力
    const gravity = this.player.vy < 0 && this.keys.jump ? 16 * dt : 25 * dt;
    this.player.vy += gravity;

    // 3. 衝突判定 (X軸)
    this.player.x += this.player.vx;
    this.resolveMapCollision(true);

    // 4. 衝突判定 (Y軸)
    this.player.y += this.player.vy;
    this.player.grounded = false;
    this.resolveMapCollision(false);

    // 5. 穴落下判定
    if (this.player.y > this.canvas.height + 20) {
      this.handlePlayerDie();
      return;
    }

    // 6. 敵の更新 & 当たり判定
    this.updateEnemies(dt);

    // 7. アイテム（キノコ）の更新
    this.updateItems(dt);

    // 8. カメラ追従
    this.cameraX = Math.max(0, Math.min(this.player.x - 120, this.mapCols * TILE_SIZE - this.canvas.width));

    // 9. ゴール到達判定
    if (this.player.x >= this.flagPole.x - 6) {
      this.handleStageClear();
    }
  }

  // タイルマップとの衝突判定
  resolveMapCollision(isX) {
    const p = this.player;
    const pHeight = p.isBig ? 34 : 22;

    if (isX) {
      // X軸判定: 足元 (p.y - 0.01) までを判定し、立っている地面タイルとの誤衝突を防止
      const leftTile = Math.floor(p.x / TILE_SIZE);
      const rightTile = Math.floor((p.x + p.width - 0.01) / TILE_SIZE);
      const topTile = Math.floor((p.y - pHeight) / TILE_SIZE);
      const bottomTile = Math.floor((p.y - 0.01) / TILE_SIZE);

      for (let r = topTile; r <= bottomTile; r++) {
        for (let c = leftTile; c <= rightTile; c++) {
          if (r < 0 || r >= this.mapRows || c < 0 || c >= this.mapCols) continue;
          const tile = this.mapData[r][c];

          if (tile === '#' || tile === 'P' || tile === 'B' || tile === '?' || tile === 'M') {
            const tileX = c * TILE_SIZE;
            if (p.vx > 0) {
              p.x = tileX - p.width;
              p.vx = 0;
            } else if (p.vx < 0) {
              p.x = tileX + TILE_SIZE;
              p.vx = 0;
            }
          } else if (tile === 'S') {
            this.takeDamage();
          }
        }
      }

      // マップ左端の制限
      if (p.x < 0) {
        p.x = 0;
        p.vx = 0;
      }
    } else {
      // Y軸判定: 左右の端に余裕を持たせ、壁際ジャンプの引っ掛かりを防止
      const leftTile = Math.floor((p.x + 2) / TILE_SIZE);
      const rightTile = Math.floor((p.x + p.width - 2.01) / TILE_SIZE);
      const topTile = Math.floor((p.y - pHeight) / TILE_SIZE);
      const bottomTile = Math.floor(p.y / TILE_SIZE);

      for (let r = topTile; r <= bottomTile; r++) {
        for (let c = leftTile; c <= rightTile; c++) {
          if (r < 0 || r >= this.mapRows || c < 0 || c >= this.mapCols) continue;
          const tile = this.mapData[r][c];

          if (tile === '#' || tile === 'P' || tile === 'B' || tile === '?' || tile === 'M') {
            const tileY = r * TILE_SIZE;
            if (p.vy > 0 && p.y >= tileY) {
              // 着地
              p.y = tileY;
              p.vy = 0;
              p.grounded = true;
            } else if (p.vy < 0 && (p.y - pHeight) <= tileY + TILE_SIZE) {
              // 頭突き！
              p.y = tileY + TILE_SIZE + pHeight;
              p.vy = 0;
              this.handleBlockBump(r, c, tile);
            }
          } else if (tile === 'S') {
            // トゲ接触
            this.takeDamage();
          }
        }
      }
    }
  }

  // はてなブロック頭突き処理
  handleBlockBump(r, c, tile) {
    if (tile === '?' || tile === 'M') {
      this.sound.playBump();
      this.mapData[r][c] = 'B'; // 叩かれ済みブロックへ変化
      this.effects.addBumpingBlock(c * TILE_SIZE, r * TILE_SIZE);

      if (tile === '?') {
        // コイン出現
        this.coins++;
        this.score += 200;
        this.sound.playCoin();
        this.effects.addFloatingCoin(c * TILE_SIZE + TILE_SIZE / 2, r * TILE_SIZE);
        this.updateHUD();
      } else if (tile === 'M') {
        // キノコ出現
        this.items.push({
          x: c * TILE_SIZE,
          y: (r - 1) * TILE_SIZE,
          vx: 1.2,
          vy: -2.5,
          width: 16,
          height: 16,
          type: 'mushroom'
        });
      }
    } else {
      this.sound.playBump();
    }
  }

  // 敵の更新 & プレイヤーとの踏みつけ判定
  updateEnemies(dt) {
    const p = this.player;
    const pHeight = p.isBig ? 34 : 22;

    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];

      if (e.isDead) {
        e.deadTimer -= dt;
        if (e.deadTimer <= 0) {
          this.enemies.splice(i, 1);
        }
        continue;
      }

      // 敵の移動
      if (e.type === 'walker') {
        e.x += e.vx;
        const nextTileX = Math.floor((e.vx > 0 ? e.x + e.width : e.x) / TILE_SIZE);
        const tileY = Math.floor((e.y + e.height / 2) / TILE_SIZE);
        if (this.isSolidTile(nextTileX, tileY)) {
          e.vx *= -1;
        }
      } else if (e.type === 'jumper') {
        e.x += e.vx;
        e.vy += 15 * dt;
        e.y += e.vy;

        const tileX = Math.floor((e.x + e.width / 2) / TILE_SIZE);
        const bottomTileY = Math.floor((e.y + e.height) / TILE_SIZE);
        if (this.isSolidTile(tileX, bottomTileY)) {
          e.y = bottomTileY * TILE_SIZE - e.height;
          e.vy = -4.8; // 再ジャンプ
        }
      }

      // プレイヤーとの当たり判定 (AABB)
      const pLeft = p.x;
      const pRight = p.x + p.width;
      const pTop = p.y - pHeight;
      const pBottom = p.y;

      const eLeft = e.x;
      const eRight = e.x + e.width;
      const eTop = e.y;
      const eBottom = e.y + e.height;

      if (pRight > eLeft && pLeft < eRight && pBottom > eTop && pTop < eBottom) {
        // 踏みつけ判定 (プレイヤーが上から落下中に接触)
        if (p.vy > 0 && pBottom - p.vy <= eTop + 8) {
          // 踏みつけ判定 (プレイヤーが上から落下中に接触)
          e.isDead = true;
          e.deadTimer = 0.4;
          p.vy = -6.5; // バウンド大ジャンプ！
          this.score += 200;
          this.sound.playStomp();
          this.effects.addSparkles(e.x + e.width / 2, e.y + e.height / 2, '#ef4444');
          this.updateHUD();
        } else {
          // 敵接触ダメージ (無敵時間中ならスルー、巨大なら縮小＆無敵化、通常ならミス)
          this.takeDamage();
        }
      }
    }
  }

  isSolidTile(c, r) {
    if (r < 0 || r >= this.mapRows || c < 0 || c >= this.mapCols) return true;
    const t = this.mapData[r][c];
    return t === '#' || t === 'P' || t === 'B' || t === '?' || t === 'M';
  }

  // アイテム更新
  updateItems(dt) {
    const p = this.player;
    const pHeight = p.isBig ? 34 : 22;

    for (let i = this.items.length - 1; i >= 0; i--) {
      const item = this.items[i];
      item.vy += 18 * dt;
      item.x += item.vx;
      item.y += item.vy;

      // 床判定
      const tileX = Math.floor((item.x + item.width / 2) / TILE_SIZE);
      const bottomTileY = Math.floor((item.y + item.height) / TILE_SIZE);
      if (this.isSolidTile(tileX, bottomTileY)) {
        item.y = bottomTileY * TILE_SIZE - item.height;
        item.vy = 0;
      }

      // 壁反射
      const nextTileX = Math.floor((item.vx > 0 ? item.x + item.width : item.x) / TILE_SIZE);
      const midTileY = Math.floor((item.y + item.height / 2) / TILE_SIZE);
      if (this.isSolidTile(nextTileX, midTileY)) {
        item.vx *= -1;
      }

      // プレイヤー取得判定
      if (p.x + p.width > item.x && p.x < item.x + item.width &&
          p.y > item.y && p.y - pHeight < item.y + item.height) {
        p.isBig = true;
        this.score += 1000;
        this.sound.playPowerup();
        this.effects.addSparkles(item.x + 8, item.y + 8, '#10b981');
        this.updateHUD();
        this.items.splice(i, 1);
      }
    }
  }

  // プレイヤー被弾処理 (キノコ巨大化時: 縮小 & 無敵時間付与 / 通常時: ミス)
  takeDamage() {
    if (this.player.isDying) return;
    if (this.player.invincibleTimer > 0) return; // 無敵時間中は被弾無効

    if (this.player.isBig) {
      this.player.isBig = false;
      this.player.invincibleTimer = 2.0; // 2秒間の点滅無敵時間
      this.player.vy = -4.5; // 小さく上にノックバック
      this.sound.playShrink();
      this.effects.addSparkles(this.player.x + this.player.width / 2, this.player.y - 12, '#f97316');
    } else {
      this.handlePlayerDie();
    }
  }

  // プレイヤーミス
  handlePlayerDie() {
    if (this.player.isDying) return;
    this.player.isDying = true;
    this.player.vy = -7.0;
    this.sound.playDie();
  }

  respawnOrGameOver() {
    this.lives--;
    this.updateHUD();

    if (this.lives <= 0) {
      this.isPlaying = false;
      this.isGameOver = true;
      const isNew = this.saveBestScore(this.score);
      this.finalScore.textContent = this.score;
      this.finalStage.textContent = STAGES_DATA[this.currentStageIdx].name;

      if (isNew) {
        this.newRecordBadge.classList.remove('hidden');
      } else {
        this.newRecordBadge.classList.add('hidden');
      }

      this.gameoverOverlay.classList.remove('hidden');
    } else {
      this.loadStage(this.currentStageIdx);
    }
  }

  // ステージクリア
  handleStageClear() {
    this.isPlaying = false;
    this.isCleared = true;
    this.sound.playClear();

    const timeBonus = Math.floor(Math.max(0, this.timeLeft)) * 50;
    this.score += timeBonus;
    this.updateHUD();

    this.clearTimeBonus.textContent = timeBonus;
    this.clearScore.textContent = this.score;

    setTimeout(() => {
      this.clearOverlay.classList.remove('hidden');
    }, 800);
  }

  // HUD更新
  updateHUD() {
    this.livesDisplay.textContent = this.lives;
    this.coinsDisplay.textContent = String(this.coins).padStart(2, '0');
    this.scoreDisplay.textContent = String(this.score).padStart(6, '0');
    this.stageDisplay.textContent = STAGES_DATA[this.currentStageIdx].name;
  }

  // ==========================================
  // 6. Canvas レンダリング
  // ==========================================
  render() {
    const { ctx, canvas } = this;
    const stage = STAGES_DATA[this.currentStageIdx];

    // 1. 背景描画 (空・洞窟・城)
    ctx.fillStyle = stage.bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.translate(-Math.floor(this.cameraX), 0);

    // 背景の雲・山（草原ステージ）
    if (stage.theme === 'grass') {
      this.drawGrasslandBackdrop(ctx);
    }

    // 2. タイルマップ描画
    for (let r = 0; r < this.mapRows; r++) {
      for (let c = 0; c < this.mapCols; c++) {
        const tile = this.mapData[r][c];
        const x = c * TILE_SIZE;
        const y = r * TILE_SIZE;

        if (tile === '#') {
          this.drawGroundTile(ctx, x, y, stage.theme);
        } else if (tile === '?') {
          this.drawQuestionBlock(ctx, x, y);
        } else if (tile === 'M') {
          this.drawQuestionBlock(ctx, x, y);
        } else if (tile === 'B') {
          this.drawEmptyBlock(ctx, x, y);
        } else if (tile === 'P') {
          this.drawPipe(ctx, x, y);
        } else if (tile === 'S') {
          this.drawSpike(ctx, x, y);
        } else if (tile === 'F') {
          this.drawFlagPole(ctx, x, y);
        }
      }
    }

    // 3. アイテム描画 (キノコ)
    this.items.forEach(item => {
      this.drawMushroom(ctx, item.x, item.y);
    });

    // 4. 敵描画
    this.enemies.forEach(e => {
      this.drawEnemy(ctx, e);
    });

    // 5. プレイヤー描画
    this.drawPlayer(ctx);

    // 6. パーティクル・エフェクト
    this.effects.draw(ctx, 0);

    ctx.restore();
  }

  // 背景の山・雲描画 (草原用)
  drawGrasslandBackdrop(ctx) {
    ctx.save();
    // 遠景の緑の丘
    for (let i = 0; i < 15; i++) {
      const hx = i * 160 + 20;
      ctx.fillStyle = '#4ade80';
      ctx.beginPath();
      ctx.arc(hx, 180, 50, Math.PI, 0);
      ctx.fill();
    }

    // 白い雲
    for (let i = 0; i < 12; i++) {
      const cx = i * 200 + 40;
      const cy = 35 + (i % 3) * 15;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(cx, cy, 14, 0, Math.PI * 2);
      ctx.arc(cx + 12, cy - 6, 16, 0, Math.PI * 2);
      ctx.arc(cx + 26, cy, 14, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // 地面ブロック
  drawGroundTile(ctx, x, y, theme) {
    if (theme === 'grass') {
      ctx.fillStyle = '#84cc16'; // 草原グリーン
      ctx.fillRect(x, y, TILE_SIZE, 5);
      ctx.fillStyle = '#854d0e'; // 土ブラウン
      ctx.fillRect(x, y + 5, TILE_SIZE, TILE_SIZE - 5);
      ctx.strokeStyle = '#3f6212';
      ctx.lineWidth = 1;
      ctx.strokeRect(x, y, TILE_SIZE, TILE_SIZE);
    } else if (theme === 'cave') {
      ctx.fillStyle = '#334155';
      ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1;
      ctx.strokeRect(x, y, TILE_SIZE, TILE_SIZE);
    } else {
      ctx.fillStyle = '#44403c';
      ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
      ctx.strokeStyle = '#292524';
      ctx.lineWidth = 1;
      ctx.strokeRect(x, y, TILE_SIZE, TILE_SIZE);
    }
  }

  // はてなブロック
  drawQuestionBlock(ctx, x, y) {
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
    ctx.strokeStyle = '#b45309';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x, y, TILE_SIZE, TILE_SIZE);

    // リベット鋲
    ctx.fillStyle = '#b45309';
    ctx.fillRect(x + 2, y + 2, 2, 2);
    ctx.fillRect(x + TILE_SIZE - 4, y + 2, 2, 2);
    ctx.fillRect(x + 2, y + TILE_SIZE - 4, 2, 2);
    ctx.fillRect(x + TILE_SIZE - 4, y + TILE_SIZE - 4, 2, 2);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 15px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('?', x + TILE_SIZE / 2, y + TILE_SIZE / 2 + 1);
  }

  // 叩かれ済み空ブロック
  drawEmptyBlock(ctx, x, y) {
    ctx.fillStyle = '#78350f';
    ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
    ctx.strokeStyle = '#451a03';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x, y, TILE_SIZE, TILE_SIZE);
  }

  // 土管
  drawPipe(ctx, x, y) {
    ctx.fillStyle = '#22c55e';
    ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
    ctx.strokeStyle = '#15803d';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x, y, TILE_SIZE, TILE_SIZE);
  }

  // トゲ
  drawSpike(ctx, x, y) {
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.moveTo(x + 2, y + TILE_SIZE);
    ctx.lineTo(x + TILE_SIZE / 2, y + 4);
    ctx.lineTo(x + TILE_SIZE - 2, y + TILE_SIZE);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#b91c1c';
    ctx.stroke();
  }

  // ゴールフラッグ
  drawFlagPole(ctx, x, y) {
    ctx.fillStyle = '#cbd5e1';
    ctx.fillRect(x + 10, y, 5, TILE_SIZE);

    // 旗（上部）
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.moveTo(x + 15, y + 2);
    ctx.lineTo(x + 36, y + 10);
    ctx.lineTo(x + 15, y + 18);
    ctx.closePath();
    ctx.fill();
  }

  // キノコ
  drawMushroom(ctx, x, y) {
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(x + 8, y + 7, 7, Math.PI, 0);
    ctx.fill();
    ctx.fillStyle = '#fde047';
    ctx.fillRect(x + 4, y + 7, 8, 8);
  }

  // 敵描画
  drawEnemy(ctx, e) {
    if (e.isDead) {
      // 踏まれペチャンコ
      ctx.fillStyle = '#b45309';
      ctx.fillRect(e.x, e.y + 12, e.width, 6);
      return;
    }

    if (e.type === 'walker') {
      ctx.fillStyle = '#b45309'; // クリボーブラウン
      ctx.beginPath();
      ctx.arc(e.x + e.width / 2, e.y + 8, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(e.x + 2, e.y + 8, e.width - 4, 10);

      // 目
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(e.x + 4, e.y + 6, 3, 4);
      ctx.fillRect(e.x + e.width - 7, e.y + 6, 3, 4);
    } else {
      ctx.fillStyle = '#22c55e'; // パタパタグリーン
      ctx.fillRect(e.x, e.y, e.width, e.height);
      // 羽
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(e.x - 3, e.y + 3, 5, 8);
    }
  }

  // プレイヤー描画
  drawPlayer(ctx) {
    const p = this.player;
    const pHeight = p.isBig ? 34 : 22;
    const px = p.x;
    const py = p.y - pHeight;

    ctx.save();
    if (p.facingLeft) {
      ctx.translate(px + p.width / 2, 0);
      ctx.scale(-1, 1);
      ctx.translate(-(px + p.width / 2), 0);
    }

    // 被弾後の点滅（無敵時間演出）
    if (p.invincibleTimer > 0) {
      const blink = Math.floor(p.invincibleTimer * 14) % 2 === 0;
      if (blink) {
        ctx.globalAlpha = 0.35;
      }
    }

    // 帽子 & シャツ（レッド）
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(px + 2, py, p.width - 4, 6);
    ctx.fillRect(px + 3, py + 6, p.width - 6, pHeight * 0.38);

    // オーバーオール（ブルー）
    ctx.fillStyle = '#2563eb';
    ctx.fillRect(px + 2, py + pHeight * 0.4, p.width - 4, pHeight * 0.45);

    // 靴
    ctx.fillStyle = '#78350f';
    ctx.fillRect(px + 1, py + pHeight * 0.85, 6, pHeight * 0.15);
    ctx.fillRect(px + p.width - 7, py + pHeight * 0.85, 6, pHeight * 0.15);

    // 顔・目
    ctx.fillStyle = '#fed7aa';
    ctx.fillRect(px + 4, py + 3, 9, 6);
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(px + 9, py + 4, 3, 3);

    ctx.restore();
  }

  // ==========================================
  // 7. イベントハンドリング
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
          this.keys.left = true;
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          this.keys.right = true;
          break;
        case 'ArrowUp':
        case 'w':
        case 'W':
        case ' ':
        case 'z':
        case 'Z':
          this.keys.jump = true;
          break;
        case 'Shift':
        case 'x':
        case 'X':
          this.keys.run = true;
          break;
      }
    });

    window.addEventListener('keyup', (e) => {
      switch (e.key) {
        case 'ArrowLeft':
        case 'a':
        case 'A':
          this.keys.left = false;
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          this.keys.right = false;
          break;
        case 'ArrowUp':
        case 'w':
        case 'W':
        case ' ':
        case 'z':
        case 'Z':
          this.keys.jump = false;
          break;
        case 'Shift':
        case 'x':
        case 'X':
          this.keys.run = false;
          break;
      }
    });

    // 2. モバイル仮想ゲームパッド
    const padButtons = document.querySelectorAll('.pad-btn');
    padButtons.forEach(btn => {
      const type = btn.dataset.btn;

      const press = (e) => {
        e.preventDefault();
        this.sound.init();
        if (type === 'left') this.keys.left = true;
        if (type === 'right') this.keys.right = true;
        if (type === 'jump') this.keys.jump = true;
        if (type === 'run') this.keys.run = true;
      };

      const release = (e) => {
        e.preventDefault();
        if (type === 'left') this.keys.left = false;
        if (type === 'right') this.keys.right = false;
        if (type === 'jump') this.keys.jump = false;
        if (type === 'run') this.keys.run = false;
      };

      btn.addEventListener('pointerdown', press);
      btn.addEventListener('pointerup', release);
      btn.addEventListener('pointercancel', release);
      btn.addEventListener('pointerleave', release);
    });

    // 3. オーバーレイボタン
    this.startBtn.addEventListener('click', () => this.startGame());
    this.nextStageBtn.addEventListener('click', () => {
      const nextIdx = (this.currentStageIdx + 1) % STAGES_DATA.length;
      this.isPlaying = true;
      this.isCleared = false;
      this.loadStage(nextIdx);
    });
    this.restartBtn.addEventListener('click', () => this.startGame());
  }
}

// ==========================================
// iOS / iPadOS Safari ダブルタップズーム & ピンチズーム抑止
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

// ゲームインスタンス起動
window.addEventListener('DOMContentLoaded', () => {
  new PlatformerGame();
});
