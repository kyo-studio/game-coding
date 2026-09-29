/**
 * 23 落ちものパズル (Block Fall / Tetris-style) - コアゲームスクリプト
 * 7-Bag生成・SRSウォールキック・ゴーストブロック・HOLD・Web Audio・モバイル操作
 */

// ==========================================
// 1. 定数・テトロミノ定義
// ==========================================
const COLS = 10;
const ROWS = 20;

const TETROMINOES = {
  I: {
    shape: [
      [0, 0, 0, 0],
      [1, 1, 1, 1],
      [0, 0, 0, 0],
      [0, 0, 0, 0]
    ],
    color: '#06b6d4', // シアン
    glow: '#22d3ee'
  },
  J: {
    shape: [
      [1, 0, 0],
      [1, 1, 1],
      [0, 0, 0]
    ],
    color: '#3b82f6', // ブルー
    glow: '#60a5fa'
  },
  L: {
    shape: [
      [0, 0, 1],
      [1, 1, 1],
      [0, 0, 0]
    ],
    color: '#f97316', // オレンジ
    glow: '#fb923c'
  },
  O: {
    shape: [
      [1, 1],
      [1, 1]
    ],
    color: '#eab308', // イエロー
    glow: '#fde047'
  },
  S: {
    shape: [
      [0, 1, 1],
      [1, 1, 0],
      [0, 0, 0]
    ],
    color: '#22c55e', // グリーン
    glow: '#4ade80'
  },
  T: {
    shape: [
      [0, 1, 0],
      [1, 1, 1],
      [0, 0, 0]
    ],
    color: '#a855f7', // パープル
    glow: '#c084fc'
  },
  Z: {
    shape: [
      [1, 1, 0],
      [0, 1, 1],
      [0, 0, 0]
    ],
    color: '#ef4444', // レッド
    glow: '#f87171'
  }
};

const TETROMINO_KEYS = ['I', 'J', 'L', 'O', 'S', 'T', 'Z'];

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

  // 移動音
  playMove() {
    if (!this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const t = this.ctx.currentTime;
      osc.type = 'sine';
      osc.frequency.setValueAtTime(300, t);
      osc.frequency.exponentialRampToValueAtTime(150, t + 0.04);

      gain.gain.setValueAtTime(0.08, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.04);
    } catch (e) {}
  }

  // 回転音
  playRotate() {
    if (!this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const t = this.ctx.currentTime;
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(450, t);
      osc.frequency.exponentialRampToValueAtTime(600, t + 0.06);

      gain.gain.setValueAtTime(0.1, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.06);
    } catch (e) {}
  }

  // ハードドロップ（着地衝撃音）
  playHardDrop() {
    if (!this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const t = this.ctx.currentTime;
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(140, t);
      osc.frequency.exponentialRampToValueAtTime(40, t + 0.12);

      gain.gain.setValueAtTime(0.3, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.12);
    } catch (e) {}
  }

  // ロック音（固定）
  playLock() {
    if (!this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const t = this.ctx.currentTime;
      osc.type = 'sine';
      osc.frequency.setValueAtTime(220, t);
      osc.frequency.exponentialRampToValueAtTime(110, t + 0.05);

      gain.gain.setValueAtTime(0.12, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.05);
    } catch (e) {}
  }

  // ホールド音
  playHold() {
    if (!this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const t = this.ctx.currentTime;
      osc.type = 'sine';
      osc.frequency.setValueAtTime(500, t);
      osc.frequency.exponentialRampToValueAtTime(800, t + 0.08);

      gain.gain.setValueAtTime(0.12, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.08);
    } catch (e) {}
  }

  // ライン消去音 (1〜3列)
  playClear(lines) {
    if (!this.ctx) return;
    try {
      const freqs = [523.25, 659.25, 783.99, 1046.50];
      for (let i = 0; i < lines; i++) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const t = this.ctx.currentTime + i * 0.06;
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freqs[i] || 880, t);

        gain.gain.setValueAtTime(0.2, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t);
        osc.stop(t + 0.15);
      }
    } catch (e) {}
  }

  // テトリス（4列消去）ファンファーレ
  playTetris() {
    if (!this.ctx) return;
    try {
      const notes = [
        { f: 523.25, d: 0.08 }, // C5
        { f: 659.25, d: 0.08 }, // E5
        { f: 783.99, d: 0.08 }, // G5
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

        gain.gain.setValueAtTime(0.3, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + n.d);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t);
        osc.stop(t + n.d);
        delay += n.d * 0.85;
      });
    } catch (e) {}
  }

  // ゲームオーバー
  playGameOver() {
    if (!this.ctx) return;
    try {
      const notes = [300, 260, 220, 180];
      notes.forEach((f, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const t = this.ctx.currentTime + idx * 0.15;
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(f, t);

        gain.gain.setValueAtTime(0.2, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t);
        osc.stop(t + 0.2);
      });
    } catch (e) {}
  }
}

// ==========================================
// 3. パーティクル & エフェクト演出
// ==========================================
class EffectManager {
  constructor() {
    this.particles = [];
    this.shakeTime = 0;
    this.shakeIntensity = 0;
    this.flashAlpha = 0;
  }

  addClearParticles(rows, width, tileSize) {
    rows.forEach(r => {
      const y = r * tileSize + tileSize / 2;
      for (let i = 0; i < 25; i++) {
        const x = Math.random() * width;
        const angle = Math.random() * Math.PI * 2;
        const speed = 1.5 + Math.random() * 3.5;
        this.particles.push({
          x, y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          size: 2.5 + Math.random() * 3,
          color: Math.random() > 0.3 ? '#22d3ee' : '#ffffff',
          alpha: 1,
          life: 0.5,
          maxLife: 0.5
        });
      }
    });
  }

  triggerTetrisEffect(width, height) {
    this.shakeTime = 0.35;
    this.shakeIntensity = 6;
    this.flashAlpha = 0.6;

    // ゴールド紙吹雪
    for (let i = 0; i < 40; i++) {
      this.particles.push({
        x: Math.random() * width,
        y: height * 0.5 + (Math.random() - 0.5) * 60,
        vx: (Math.random() - 0.5) * 6,
        vy: -2 - Math.random() * 4,
        size: 3 + Math.random() * 4,
        color: Math.random() > 0.4 ? '#fbbf24' : '#f43f5e',
        alpha: 1,
        life: 0.8,
        maxLife: 0.8
      });
    }
  }

  update(dt) {
    if (this.shakeTime > 0) {
      this.shakeTime -= dt;
    }
    if (this.flashAlpha > 0) {
      this.flashAlpha = Math.max(0, this.flashAlpha - dt * 2.5);
    }

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

  draw(ctx, width, height) {
    // フラッシュ
    if (this.flashAlpha > 0) {
      ctx.save();
      ctx.fillStyle = `rgba(255, 255, 255, ${this.flashAlpha})`;
      ctx.fillRect(0, 0, width, height);
      ctx.restore();
    }

    // パーティクル
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
// 4. メインゲームクラス (BlockFallGame)
// ==========================================
class BlockFallGame {
  constructor() {
    this.canvas = document.getElementById('gameCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.holdCanvas = document.getElementById('holdCanvas');
    this.holdCtx = this.holdCanvas.getContext('2d');
    this.nextCanvas = document.getElementById('nextCanvas');
    this.nextCtx = this.nextCanvas.getContext('2d');
    this.next2Canvas = document.getElementById('next2Canvas');
    this.next2Ctx = this.next2Canvas.getContext('2d');

    this.sound = new SoundManager();
    this.effects = new EffectManager();

    // DOM要素
    this.scoreDisplay = document.getElementById('score-display');
    this.linesDisplay = document.getElementById('lines-display');
    this.levelDisplay = document.getElementById('level-display');
    this.bestScoreDisplay = document.getElementById('best-score-display');

    this.startOverlay = document.getElementById('start-overlay');
    this.pauseOverlay = document.getElementById('pause-overlay');
    this.gameoverOverlay = document.getElementById('gameover-overlay');
    this.finalScore = document.getElementById('final-score');
    this.finalLines = document.getElementById('final-lines');
    this.finalLevel = document.getElementById('final-level');
    this.newRecordBadge = document.getElementById('new-record-badge');

    this.startBtn = document.getElementById('start-btn');
    this.resumeBtn = document.getElementById('resume-btn');
    this.restartBtn = document.getElementById('restart-btn');

    // ゲーム状態
    this.board = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
    this.bag = [];
    this.currentPiece = null;
    this.holdPiece = null;
    this.canHold = true;
    this.nextQueue = [];

    this.score = 0;
    this.lines = 0;
    this.level = 1;
    this.bestScore = this.loadBestScore();

    this.isPlaying = false;
    this.isPaused = false;
    this.isGameOver = false;

    this.dropCounter = 0;
    this.dropInterval = 800;
    this.lastTime = performance.now();

    // 初期化
    this.bestScoreDisplay.textContent = this.bestScore;
    this.initEvents();

    // 描画ループ開始
    requestAnimationFrame((t) => this.gameLoop(t));
  }

  loadBestScore() {
    try {
      return parseInt(localStorage.getItem('block_fall_best_score'), 10) || 0;
    } catch (e) {
      return 0;
    }
  }

  saveBestScore(val) {
    if (val > this.bestScore) {
      this.bestScore = val;
      try {
        localStorage.setItem('block_fall_best_score', val);
      } catch (e) {}
      this.bestScoreDisplay.textContent = this.bestScore;
      return true;
    }
    return false;
  }

  // 7-Bag抽選アルゴリズム
  generateBag() {
    const bag = [...TETROMINO_KEYS];
    for (let i = bag.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [bag[i], bag[j]] = [bag[j], bag[i]];
    }
    return bag;
  }

  getNextPieceType() {
    if (this.bag.length === 0) {
      this.bag = this.generateBag();
    }
    return this.bag.pop();
  }

  // ゲームスタート
  startGame() {
    this.sound.init();
    this.board = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
    this.bag = this.generateBag();
    this.holdPiece = null;
    this.canHold = true;
    this.score = 0;
    this.lines = 0;
    this.level = 1;
    this.dropInterval = 800;
    this.dropCounter = 0;
    this.isPlaying = true;
    this.isPaused = false;
    this.isGameOver = false;

    this.nextQueue = [this.getNextPieceType(), this.getNextPieceType(), this.getNextPieceType()];
    this.spawnPiece();

    this.updateHUD();
    this.startOverlay.classList.add('hidden');
    this.pauseOverlay.classList.add('hidden');
    this.gameoverOverlay.classList.add('hidden');
  }

  spawnPiece() {
    const type = this.nextQueue.shift();
    this.nextQueue.push(this.getNextPieceType());

    const proto = TETROMINOES[type];
    const shape = proto.shape.map(r => [...r]);

    this.currentPiece = {
      type,
      shape,
      color: proto.color,
      glow: proto.glow,
      x: Math.floor((COLS - shape[0].length) / 2),
      y: 0
    };

    this.canHold = true;

    // スポーン時にすでに衝突している場合はゲームオーバー
    if (this.checkCollision(this.currentPiece.x, this.currentPiece.y, this.currentPiece.shape)) {
      this.handleGameOver();
    }

    this.renderSideCanvases();
  }

  // 衝突判定
  checkCollision(px, py, shape) {
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (shape[r][c]) {
          const boardX = px + c;
          const boardY = py + r;

          // 盤面の枠外判定
          if (boardX < 0 || boardX >= COLS || boardY >= ROWS) {
            return true;
          }

          // 盤面上の既存ブロックとの衝突 (boardY >= 0)
          if (boardY >= 0 && this.board[boardY][boardX] !== 0) {
            return true;
          }
        }
      }
    }
    return false;
  }

  // ピースの移動
  move(dx) {
    if (!this.isPlaying || this.isPaused || this.isGameOver || !this.currentPiece) return;
    if (!this.checkCollision(this.currentPiece.x + dx, this.currentPiece.y, this.currentPiece.shape)) {
      this.currentPiece.x += dx;
      this.sound.playMove();
    }
  }

  // ピースの回転 (SRS風ウォールキック付き)
  rotate() {
    if (!this.isPlaying || this.isPaused || this.isGameOver || !this.currentPiece) return;

    // 時計回りに90度回転
    const shape = this.currentPiece.shape;
    const N = shape.length;
    const rotated = Array.from({ length: N }, () => Array(N).fill(0));
    for (let r = 0; r < N; r++) {
      for (let c = 0; c < N; c++) {
        rotated[c][N - 1 - r] = shape[r][c];
      }
    }

    // ウォールキック試行オフセット
    const kickOffsets = [
      [0, 0],   // そのまま
      [-1, 0],  // 左へ1マス
      [1, 0],   // 右へ1マス
      [0, -1],  // 上へ1マス
      [-2, 0],  // 左へ2マス
      [2, 0]    // 右へ2マス
    ];

    for (const [kx, ky] of kickOffsets) {
      if (!this.checkCollision(this.currentPiece.x + kx, this.currentPiece.y + ky, rotated)) {
        this.currentPiece.shape = rotated;
        this.currentPiece.x += kx;
        this.currentPiece.y += ky;
        this.sound.playRotate();
        return;
      }
    }
  }

  // ソフトドロップ
  softDrop() {
    if (!this.isPlaying || this.isPaused || this.isGameOver || !this.currentPiece) return;
    if (!this.checkCollision(this.currentPiece.x, this.currentPiece.y + 1, this.currentPiece.shape)) {
      this.currentPiece.y += 1;
      this.score += 1;
      this.updateHUD();
      this.dropCounter = 0;
    } else {
      this.lockPiece();
    }
  }

  // ハードドロップ
  hardDrop() {
    if (!this.isPlaying || this.isPaused || this.isGameOver || !this.currentPiece) return;
    let dropDist = 0;
    while (!this.checkCollision(this.currentPiece.x, this.currentPiece.y + 1, this.currentPiece.shape)) {
      this.currentPiece.y += 1;
      dropDist++;
    }
    this.score += dropDist * 2;
    this.sound.playHardDrop();
    this.lockPiece();
  }

  // ホールド
  hold() {
    if (!this.isPlaying || this.isPaused || this.isGameOver || !this.currentPiece || !this.canHold) return;

    this.sound.playHold();
    const currentType = this.currentPiece.type;

    if (!this.holdPiece) {
      this.holdPiece = currentType;
      this.spawnPiece();
    } else {
      const temp = this.holdPiece;
      this.holdPiece = currentType;

      const proto = TETROMINOES[temp];
      const shape = proto.shape.map(r => [...r]);

      this.currentPiece = {
        type: temp,
        shape,
        color: proto.color,
        glow: proto.glow,
        x: Math.floor((COLS - shape[0].length) / 2),
        y: 0
      };
    }

    this.canHold = false;
    this.renderSideCanvases();
  }

  // ピースの固定 & ライン消去判定
  lockPiece() {
    const { shape, x, y, color } = this.currentPiece;
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (shape[r][c]) {
          const boardY = y + r;
          const boardX = x + c;
          if (boardY >= 0 && boardY < ROWS && boardX >= 0 && boardX < COLS) {
            this.board[boardY][boardX] = color;
          }
        }
      }
    }

    this.sound.playLock();
    this.clearLines();
    this.spawnPiece();
  }

  // ライン消去
  clearLines() {
    const fullRows = [];
    for (let r = 0; r < ROWS; r++) {
      if (this.board[r].every(cell => cell !== 0)) {
        fullRows.push(r);
      }
    }

    const linesCount = fullRows.length;
    if (linesCount === 0) return;

    // 演出
    const tileSize = this.canvas.width / COLS;
    this.effects.addClearParticles(fullRows, this.canvas.width, tileSize);

    if (linesCount === 4) {
      this.sound.playTetris();
      this.effects.triggerTetrisEffect(this.canvas.width, this.canvas.height);
    } else {
      this.sound.playClear(linesCount);
    }

    // 盤面のライン削除
    fullRows.forEach(r => {
      this.board.splice(r, 1);
      this.board.unshift(Array(COLS).fill(0));
    });

    // スコア加算
    const pointsMap = { 1: 100, 2: 300, 3: 500, 4: 800 };
    this.score += (pointsMap[linesCount] || 100) * this.level;
    this.lines += linesCount;

    // レベルアップ (10ライン毎)
    const newLevel = Math.floor(this.lines / 10) + 1;
    if (newLevel > this.level) {
      this.level = newLevel;
      this.dropInterval = Math.max(100, 800 - (this.level - 1) * 70);
    }

    this.updateHUD();
  }

  // ゴーストブロックのY座標計算
  getGhostY() {
    if (!this.currentPiece) return 0;
    let ghostY = this.currentPiece.y;
    while (!this.checkCollision(this.currentPiece.x, ghostY + 1, this.currentPiece.shape)) {
      ghostY++;
    }
    return ghostY;
  }

  // ゲームオーバー処理
  handleGameOver() {
    this.isPlaying = false;
    this.isGameOver = true;
    this.sound.playGameOver();

    const isNew = this.saveBestScore(this.score);
    this.finalScore.textContent = this.score;
    this.finalLines.textContent = this.lines;
    this.finalLevel.textContent = this.level;

    if (isNew) {
      this.newRecordBadge.classList.remove('hidden');
    } else {
      this.newRecordBadge.classList.add('hidden');
    }

    setTimeout(() => {
      this.gameoverOverlay.classList.remove('hidden');
    }, 400);
  }

  // ポーズ切り替え
  togglePause() {
    if (!this.isPlaying || this.isGameOver) return;
    this.isPaused = !this.isPaused;
    if (this.isPaused) {
      this.pauseOverlay.classList.remove('hidden');
    } else {
      this.pauseOverlay.classList.add('hidden');
      this.lastTime = performance.now();
    }
  }

  // HUD更新
  updateHUD() {
    this.scoreDisplay.textContent = this.score;
    this.linesDisplay.textContent = this.lines;
    this.levelDisplay.textContent = this.level;
  }

  // ==========================================
  // 5. 描画ループ & Canvasグラフィック
  // ==========================================
  gameLoop(time) {
    const dt = Math.min((time - this.lastTime) / 1000, 0.1);
    this.lastTime = time;

    if (this.isPlaying && !this.isPaused && !this.isGameOver) {
      this.dropCounter += dt * 1000;
      if (this.dropCounter >= this.dropInterval) {
        this.dropCounter = 0;
        this.softDrop();
      }
    }

    this.effects.update(dt);
    this.render();

    requestAnimationFrame((t) => this.gameLoop(t));
  }

  render() {
    const { ctx, canvas } = this;
    const width = canvas.width;
    const height = canvas.height;
    const tileSize = width / COLS;

    ctx.clearRect(0, 0, width, height);

    ctx.save();
    // 画面シェイク適用
    if (this.effects.shakeTime > 0) {
      const offsetX = (Math.random() - 0.5) * this.effects.shakeIntensity;
      const offsetY = (Math.random() - 0.5) * this.effects.shakeIntensity;
      ctx.translate(offsetX, offsetY);
    }

    // 1. グリッド背景描画
    ctx.fillStyle = '#060911';
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
    ctx.lineWidth = 1;
    for (let c = 0; c <= COLS; c++) {
      ctx.beginPath();
      ctx.moveTo(c * tileSize, 0);
      ctx.lineTo(c * tileSize, height);
      ctx.stroke();
    }
    for (let r = 0; r <= ROWS; r++) {
      ctx.beginPath();
      ctx.moveTo(0, r * tileSize);
      ctx.lineTo(width, r * tileSize);
      ctx.stroke();
    }

    // 2. 固定ブロックの描画
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (this.board[r][c]) {
          this.drawBlock(ctx, c * tileSize, r * tileSize, tileSize, this.board[r][c]);
        }
      }
    }

    // 3. ゴーストブロック描画
    if (this.isPlaying && this.currentPiece) {
      const ghostY = this.getGhostY();
      const { shape, x, color } = this.currentPiece;
      for (let r = 0; r < shape.length; r++) {
        for (let c = 0; c < shape[r].length; c++) {
          if (shape[r][c]) {
            this.drawGhostBlock(ctx, (x + c) * tileSize, (ghostY + r) * tileSize, tileSize, color);
          }
        }
      }

      // 4. 現在の落下ピース描画
      for (let r = 0; r < shape.length; r++) {
        for (let c = 0; c < shape[r].length; c++) {
          if (shape[r][c]) {
            this.drawBlock(ctx, (x + c) * tileSize, (this.currentPiece.y + r) * tileSize, tileSize, color);
          }
        }
      }
    }

    // 5. パーティクル・エフェクト描画
    this.effects.draw(ctx, width, height);

    ctx.restore();
  }

  // 立体ネオンブロック描画
  drawBlock(ctx, x, y, size, color) {
    ctx.save();
    const margin = 1;
    const bx = x + margin;
    const by = y + margin;
    const bsize = size - margin * 2;
    const bevel = Math.max(2, Math.floor(size * 0.15));

    // ベース
    ctx.fillStyle = color;
    ctx.fillRect(bx, by, bsize, bsize);

    // 上・左ハイライト
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.lineTo(bx + bsize, by);
    ctx.lineTo(bx + bsize - bevel, by + bevel);
    ctx.lineTo(bx + bevel, by + bevel);
    ctx.lineTo(bx + bevel, by + bsize - bevel);
    ctx.lineTo(bx, by + bsize);
    ctx.closePath();
    ctx.fill();

    // 下・右シャドウ
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.beginPath();
    ctx.moveTo(bx + bsize, by);
    ctx.lineTo(bx + bsize, by + bsize);
    ctx.lineTo(bx, by + bsize);
    ctx.lineTo(bx + bevel, by + bsize - bevel);
    ctx.lineTo(bx + bsize - bevel, by + bsize - bevel);
    ctx.lineTo(bx + bsize - bevel, by + bevel);
    ctx.closePath();
    ctx.fill();

    // 枠線
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.lineWidth = 1;
    ctx.strokeRect(bx, by, bsize, bsize);

    ctx.restore();
  }

  // ゴーストブロック描画（半透明フレーム）
  drawGhostBlock(ctx, x, y, size, color) {
    ctx.save();
    const margin = 2;
    const bx = x + margin;
    const by = y + margin;
    const bsize = size - margin * 2;

    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(bx, by, bsize, bsize);

    ctx.fillStyle = color;
    ctx.globalAlpha = 0.15;
    ctx.fillRect(bx, by, bsize, bsize);

    ctx.restore();
  }

  // サイドCanvas描画 (HOLD / NEXT)
  renderSideCanvases() {
    // HOLD
    this.drawPreview(this.holdCtx, this.holdPiece, this.holdCanvas.width, this.holdCanvas.height);

    // NEXT 1
    this.drawPreview(this.nextCtx, this.nextQueue[0], this.nextCanvas.width, this.nextCanvas.height);

    // NEXT 2
    this.drawPreview(this.next2Ctx, this.nextQueue[1], this.next2Canvas.width, this.next2Canvas.height);
  }

  drawPreview(ctx, type, width, height) {
    ctx.clearRect(0, 0, width, height);
    if (!type) return;

    const proto = TETROMINOES[type];
    const shape = proto.shape;
    const rows = shape.length;
    const cols = shape[0].length;
    const tileSize = Math.floor(Math.min(width / (cols + 1), height / (rows + 1)));

    const startX = Math.floor((width - cols * tileSize) / 2);
    const startY = Math.floor((height - rows * tileSize) / 2);

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (shape[r][c]) {
          this.drawBlock(ctx, startX + c * tileSize, startY + r * tileSize, tileSize, proto.color);
        }
      }
    }
  }

  // ==========================================
  // 6. イベントハンドリング
  // ==========================================
  initEvents() {
    // 1. キーボード操作
    window.addEventListener('keydown', (e) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
        e.preventDefault();
      }

      if (!this.isPlaying || this.isGameOver) return;

      switch (e.key) {
        case 'ArrowLeft':
        case 'a':
        case 'A':
          this.move(-1);
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          this.move(1);
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          this.softDrop();
          break;
        case 'ArrowUp':
        case 'w':
        case 'W':
        case 'x':
        case 'X':
          this.rotate();
          break;
        case ' ':
          this.hardDrop();
          break;
        case 'c':
        case 'C':
        case 'Shift':
          this.hold();
          break;
        case 'p':
        case 'P':
          this.togglePause();
          break;
      }
    });

    // 2. 仮想コントロールボタン
    const handleAction = (action) => {
      this.sound.init();
      switch (action) {
        case 'left': this.move(-1); break;
        case 'right': this.move(1); break;
        case 'softDrop': this.softDrop(); break;
        case 'rotate': this.rotate(); break;
        case 'hardDrop': this.hardDrop(); break;
        case 'hold': this.hold(); break;
        case 'pause': this.togglePause(); break;
      }
    };

    const ctrlButtons = document.querySelectorAll('.ctrl-btn');
    ctrlButtons.forEach(btn => {
      const action = btn.dataset.action;
      const onTrigger = (e) => {
        e.preventDefault();
        handleAction(action);
      };
      btn.addEventListener('pointerdown', onTrigger);
    });

    // 3. Canvasスワイプ・タップ操作
    let touchStartX = 0;
    let touchStartY = 0;
    let touchStartTime = 0;
    let touchMoved = false;

    this.canvas.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      touchStartX = e.clientX;
      touchStartY = e.clientY;
      touchStartTime = Date.now();
      touchMoved = false;
    });

    this.canvas.addEventListener('pointermove', (e) => {
      if (!this.isPlaying || this.isPaused || this.isGameOver) return;
      const dx = e.clientX - touchStartX;
      const dy = e.clientY - touchStartY;
      const threshold = 22;

      if (Math.abs(dx) > threshold) {
        touchMoved = true;
        this.move(dx > 0 ? 1 : -1);
        touchStartX = e.clientX;
      } else if (dy > threshold) {
        touchMoved = true;
        this.softDrop();
        touchStartY = e.clientY;
      }
    });

    this.canvas.addEventListener('pointerup', (e) => {
      e.preventDefault();
      if (!touchMoved && Date.now() - touchStartTime < 250) {
        // 短いタップは回転
        this.rotate();
      }
    });

    // 4. オーバーレイボタン
    this.startBtn.addEventListener('click', () => this.startGame());
    this.resumeBtn.addEventListener('click', () => this.togglePause());
    this.restartBtn.addEventListener('click', () => this.startGame());
  }
}

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

// ゲームインスタンス起動
window.addEventListener('DOMContentLoaded', () => {
  new BlockFallGame();
});
