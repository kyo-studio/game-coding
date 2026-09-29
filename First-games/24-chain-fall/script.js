/**
 * 24 連鎖パズル (Chain Fall / Puyo-style) - コアゲームスクリプト
 * 4色ぷにぷにゼリーぷよ・ペア回転・ちぎり重力落下・4連結消滅・大連鎖システム・Web Audio
 */

// ==========================================
// 1. 定数・ぷよ定義
// ==========================================
const COLS = 6;
const ROWS = 12;

const PUYO_COLORS = {
  1: { name: 'red', base: '#ef4444', light: '#f87171', dark: '#b91c1c', eye: '#ffffff' },
  2: { name: 'blue', base: '#3b82f6', light: '#60a5fa', dark: '#1d4ed8', eye: '#ffffff' },
  3: { name: 'green', base: '#22c55e', light: '#4ade80', dark: '#15803d', eye: '#ffffff' },
  4: { name: 'yellow', base: '#eab308', light: '#fde047', dark: '#a16207', eye: '#ffffff' }
};

const COLOR_IDS = [1, 2, 3, 4];

// 連鎖倍率テーブル (ぷよぷよ準拠)
const CHAIN_BONUS = [0, 0, 8, 16, 32, 64, 96, 128, 160, 192, 224, 256, 288, 320, 352, 384];

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
      osc.frequency.setValueAtTime(320, t);
      osc.frequency.exponentialRampToValueAtTime(180, t + 0.04);

      gain.gain.setValueAtTime(0.08, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.04);
    } catch (e) {}
  }

  // 回転音（ぷにっ）
  playRotate() {
    if (!this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const t = this.ctx.currentTime;
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(400, t);
      osc.frequency.exponentialRampToValueAtTime(650, t + 0.05);

      gain.gain.setValueAtTime(0.1, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.05);
    } catch (e) {}
  }

  // 着地音（ぼよん）
  playLand() {
    if (!this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const t = this.ctx.currentTime;
      osc.type = 'sine';
      osc.frequency.setValueAtTime(180, t);
      osc.frequency.exponentialRampToValueAtTime(80, t + 0.06);

      gain.gain.setValueAtTime(0.12, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.06);
    } catch (e) {}
  }

  // 連鎖消去音（連鎖数ごとに音階上昇）
  playChain(chainCount) {
    if (!this.ctx) return;
    try {
      // ド、レ、ミ、ファ、ソ、ラ、シ、高ド...
      const scale = [261.63, 293.66, 329.63, 349.23, 392.00, 440.00, 493.88, 523.25, 587.33, 659.25, 783.99, 1046.50];
      const baseFreq = scale[Math.min(chainCount - 1, scale.length - 1)];

      const osc = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const t = this.ctx.currentTime;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(baseFreq, t);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.5, t + 0.15);

      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(baseFreq * 2, t);

      gain.gain.setValueAtTime(0.25, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);

      osc.connect(gain);
      osc2.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t);
      osc2.start(t);
      osc.stop(t + 0.2);
      osc2.stop(t + 0.2);
    } catch (e) {}
  }

  // ゲームオーバー
  playGameOver() {
    if (!this.ctx) return;
    try {
      const notes = [330, 293, 261, 220];
      notes.forEach((f, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const t = this.ctx.currentTime + idx * 0.14;
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(f, t);

        gain.gain.setValueAtTime(0.2, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t);
        osc.stop(t + 0.18);
      });
    } catch (e) {}
  }
}

// ==========================================
// 3. パーティクル & 連鎖バナー演出
// ==========================================
class EffectManager {
  constructor() {
    this.particles = [];
    this.banner = null; // { text, x, y, alpha, life, scale }
    this.shakeTime = 0;
    this.shakeIntensity = 0;
  }

  addPuyoPopParticles(x, y, color) {
    for (let i = 0; i < 12; i++) {
      const angle = (Math.PI * 2 * i) / 12 + (Math.random() - 0.5) * 0.5;
      const speed = 2 + Math.random() * 3.5;
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 3 + Math.random() * 3,
        color: color,
        alpha: 1,
        life: 0.45,
        maxLife: 0.45
      });
    }
  }

  showChainBanner(chainCount, width, height) {
    let text = `${chainCount} CHAIN!`;
    if (chainCount >= 5) text = `🔥 ${chainCount} GREAT CHAIN!! 🔥`;
    else if (chainCount >= 3) text = `✨ ${chainCount} CHAIN!! ✨`;

    this.banner = {
      text,
      x: width / 2,
      y: height * 0.4,
      alpha: 1,
      life: 1.0,
      scale: 0.5
    };

    if (chainCount >= 2) {
      this.shakeTime = 0.25;
      this.shakeIntensity = Math.min(8, 2 + chainCount * 1.5);
    }
  }

  update(dt) {
    if (this.shakeTime > 0) {
      this.shakeTime -= dt;
    }

    if (this.banner) {
      this.banner.life -= dt;
      this.banner.scale = Math.min(1.2, this.banner.scale + dt * 4);
      if (this.banner.life < 0.3) {
        this.banner.alpha = Math.max(0, this.banner.life / 0.3);
      }
      if (this.banner.life <= 0) {
        this.banner = null;
      }
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

    // 連鎖バナー
    if (this.banner) {
      ctx.save();
      ctx.globalAlpha = this.banner.alpha;
      ctx.translate(this.banner.x, this.banner.y);
      ctx.scale(this.banner.scale, this.banner.scale);

      ctx.font = '900 18px "Segoe UI", Roboto, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // 縁取り
      ctx.strokeStyle = '#090d16';
      ctx.lineWidth = 5;
      ctx.strokeText(this.banner.text, 0, 0);

      // グラデーションテキスト
      ctx.fillStyle = '#fef08a';
      ctx.fillText(this.banner.text, 0, 0);

      ctx.restore();
    }
  }
}

// ==========================================
// 4. メインゲームクラス (ChainFallGame)
// ==========================================
class ChainFallGame {
  constructor() {
    this.canvas = document.getElementById('gameCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.nextCanvas = document.getElementById('nextCanvas');
    this.nextCtx = this.nextCanvas.getContext('2d');
    this.next2Canvas = document.getElementById('next2Canvas');
    this.next2Ctx = this.next2Canvas.getContext('2d');

    this.sound = new SoundManager();
    this.effects = new EffectManager();

    // DOM要素
    this.scoreDisplay = document.getElementById('score-display');
    this.maxChainDisplay = document.getElementById('max-chain-display');
    this.popsDisplay = document.getElementById('pops-display');
    this.bestScoreDisplay = document.getElementById('best-score-display');

    this.startOverlay = document.getElementById('start-overlay');
    this.pauseOverlay = document.getElementById('pause-overlay');
    this.gameoverOverlay = document.getElementById('gameover-overlay');
    this.finalScore = document.getElementById('final-score');
    this.finalMaxChain = document.getElementById('final-max-chain');
    this.finalPops = document.getElementById('final-pops');
    this.newRecordBadge = document.getElementById('new-record-badge');

    this.startBtn = document.getElementById('start-btn');
    this.resumeBtn = document.getElementById('resume-btn');
    this.restartBtn = document.getElementById('restart-btn');

    // 盤面データ (0: 空, 1〜4: 色ID)
    this.board = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
    this.currentPair = null; // { axisX, axisY, subRot (0:上,1:右,2:下,3:左), c1, c2 }
    this.nextPairs = [];

    this.score = 0;
    this.maxChain = 0;
    this.totalPops = 0;
    this.bestScore = this.loadBestScore();

    this.isPlaying = false;
    this.isPaused = false;
    this.isGameOver = false;
    this.isResolvingChain = false; // 連鎖処理中フラグ

    this.dropCounter = 0;
    this.dropInterval = 750; // ms
    this.lastTime = performance.now();

    // 初期化
    this.bestScoreDisplay.textContent = this.bestScore;
    this.initEvents();

    // 描画ループ開始
    requestAnimationFrame((t) => this.gameLoop(t));
  }

  loadBestScore() {
    try {
      return parseInt(localStorage.getItem('chain_fall_best_score'), 10) || 0;
    } catch (e) {
      return 0;
    }
  }

  saveBestScore(val) {
    if (val > this.bestScore) {
      this.bestScore = val;
      try {
        localStorage.setItem('chain_fall_best_score', val);
      } catch (e) {}
      this.bestScoreDisplay.textContent = this.bestScore;
      return true;
    }
    return false;
  }

  // ランダムペア生成
  getRandomPair() {
    const c1 = COLOR_IDS[Math.floor(Math.random() * COLOR_IDS.length)];
    const c2 = COLOR_IDS[Math.floor(Math.random() * COLOR_IDS.length)];
    return { c1, c2 };
  }

  // ゲームスタート
  startGame() {
    this.sound.init();
    this.board = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
    this.score = 0;
    this.maxChain = 0;
    this.totalPops = 0;
    this.isPlaying = true;
    this.isPaused = false;
    this.isGameOver = false;
    this.isResolvingChain = false;
    this.dropCounter = 0;

    this.nextPairs = [this.getRandomPair(), this.getRandomPair()];
    this.spawnPair();

    this.updateHUD();
    this.startOverlay.classList.add('hidden');
    this.pauseOverlay.classList.add('hidden');
    this.gameoverOverlay.classList.add('hidden');
  }

  // ペアぷよのスポーン
  spawnPair() {
    const next = this.nextPairs.shift();
    this.nextPairs.push(this.getRandomPair());

    this.currentPair = {
      axisX: 2, // 3列目（0-indexed で 2）
      axisY: 0,
      subRot: 0, // 0: 上, 1: 右, 2: 下, 3: 左
      c1: next.c1, // 軸ぷよの色
      c2: next.c2  // 子ぷよの色
    };

    // 窒息判定（スポーン位置がすでに埋まっている場合）
    if (this.board[0][2] !== 0) {
      this.handleGameOver();
      return;
    }

    this.renderNextCanvases();
  }

  // 子ぷよの相対座標オフセット取得
  getSubOffset(rot) {
    switch (rot) {
      case 0: return { dx: 0, dy: -1 }; // 上
      case 1: return { dx: 1, dy: 0 };  // 右
      case 2: return { dx: 0, dy: 1 };  // 下
      case 3: return { dx: -1, dy: 0 }; // 左
    }
    return { dx: 0, dy: -1 };
  }

  // 衝突判定
  isValidPos(axisX, axisY, rot) {
    // 軸ぷよの判定
    if (axisX < 0 || axisX >= COLS || axisY >= ROWS) return false;
    if (axisY >= 0 && this.board[axisY][axisX] !== 0) return false;

    // 子ぷよの判定
    const { dx, dy } = this.getSubOffset(rot);
    const subX = axisX + dx;
    const subY = axisY + dy;

    if (subX < 0 || subX >= COLS || subY >= ROWS) return false;
    if (subY >= 0 && this.board[subY][subX] !== 0) return false;

    return true;
  }

  // 左右移動
  move(dx) {
    if (!this.isPlaying || this.isPaused || this.isGameOver || this.isResolvingChain || !this.currentPair) return;
    const { axisX, axisY, subRot } = this.currentPair;
    if (this.isValidPos(axisX + dx, axisY, subRot)) {
      this.currentPair.axisX += dx;
      this.sound.playMove();
    }
  }

  // 回転 (dir: 1 = 右回転/時計回り, -1 = 左回転/反時計回り)
  rotate(dir) {
    if (!this.isPlaying || this.isPaused || this.isGameOver || this.isResolvingChain || !this.currentPair) return;
    const { axisX, axisY, subRot } = this.currentPair;
    const newRot = (subRot + dir + 4) % 4;

    // 1. そのまま回転できるか
    if (this.isValidPos(axisX, axisY, newRot)) {
      this.currentPair.subRot = newRot;
      this.sound.playRotate();
      return;
    }

    // 2. ウォールキック（左押し・右押し・上押し）
    const kickOffsets = [[-1, 0], [1, 0], [0, -1]];
    for (const [kx, ky] of kickOffsets) {
      if (this.isValidPos(axisX + kx, axisY + ky, newRot)) {
        this.currentPair.axisX += kx;
        this.currentPair.axisY += ky;
        this.currentPair.subRot = newRot;
        this.sound.playRotate();
        return;
      }
    }
  }

  // ソフトドロップ（高速落下）
  softDrop() {
    if (!this.isPlaying || this.isPaused || this.isGameOver || this.isResolvingChain || !this.currentPair) return;
    const { axisX, axisY, subRot } = this.currentPair;

    if (this.isValidPos(axisX, axisY + 1, subRot)) {
      this.currentPair.axisY += 1;
      this.score += 1;
      this.updateHUD();
      this.dropCounter = 0;
    } else {
      this.lockPair();
    }
  }

  // ペアぷよの固定 ＆ ちぎり自由落下
  lockPair() {
    const { axisX, axisY, subRot, c1, c2 } = this.currentPair;
    const { dx, dy } = this.getSubOffset(subRot);
    const subX = axisX + dx;
    const subY = axisY + dy;

    this.currentPair = null;
    this.sound.playLand();

    // 盤面に配置
    if (axisY >= 0 && axisY < ROWS && axisX >= 0 && axisX < COLS) {
      this.board[axisY][axisX] = c1;
    }
    if (subY >= 0 && subY < ROWS && subX >= 0 && subX < COLS) {
      this.board[subY][subX] = c2;
    }

    // 重力ちぎり落下 ＆ 連鎖判定ループ開始
    this.isResolvingChain = true;
    this.applyGravity();

    setTimeout(() => {
      this.processChain(1);
    }, 180);
  }

  // 重力ちぎり落下（各列の下から空きマスを詰める）
  applyGravity() {
    let moved = false;
    for (let c = 0; c < COLS; c++) {
      let emptyRow = ROWS - 1;
      for (let r = ROWS - 1; r >= 0; r--) {
        if (this.board[r][c] !== 0) {
          if (r !== emptyRow) {
            this.board[emptyRow][c] = this.board[r][c];
            this.board[r][c] = 0;
            moved = true;
          }
          emptyRow--;
        }
      }
    }
    return moved;
  }

  // 4個以上連結消去 ＆ 連鎖ループ (Chain Combo)
  processChain(chainCount) {
    const toPop = this.findConnectedPuyos();

    if (toPop.length > 0) {
      // 消去演出
      const tileSize = this.canvas.width / COLS;
      toPop.forEach(({ r, c }) => {
        const colorId = this.board[r][c];
        const color = (PUYO_COLORS[colorId] && PUYO_COLORS[colorId].base) || '#ec4899';
        this.effects.addPuyoPopParticles(c * tileSize + tileSize / 2, r * tileSize + tileSize / 2, color);
        this.board[r][c] = 0;
      });

      this.totalPops += toPop.length;
      this.maxChain = Math.max(this.maxChain, chainCount);

      // スコア計算
      const bonus = CHAIN_BONUS[Math.min(chainCount, CHAIN_BONUS.length - 1)] || (chainCount * 32);
      this.score += toPop.length * 10 * Math.max(1, bonus);

      this.sound.playChain(chainCount);
      this.effects.showChainBanner(chainCount, this.canvas.width, this.canvas.height);
      this.updateHUD();

      // 落下して次の連鎖判定へ
      setTimeout(() => {
        this.applyGravity();
        setTimeout(() => {
          this.processChain(chainCount + 1);
        }, 220);
      }, 200);
    } else {
      // 連鎖終了
      this.isResolvingChain = false;

      // 窒息判定（中央3列目頂点が埋まったらゲームオーバー）
      if (this.board[0][2] !== 0) {
        this.handleGameOver();
      } else {
        this.spawnPair();
      }
    }
  }

  // 4個以上連結しているぷよの探索 (Flood Fill / DFS)
  findConnectedPuyos() {
    const visited = Array.from({ length: ROWS }, () => Array(COLS).fill(false));
    const allPoppable = [];

    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const color = this.board[r][c];
        if (color !== 0 && !visited[r][c]) {
          const group = [];
          this.dfsGroup(r, c, color, visited, group);
          if (group.length >= 4) {
            allPoppable.push(...group);
          }
        }
      }
    }
    return allPoppable;
  }

  dfsGroup(r, c, color, visited, group) {
    visited[r][c] = true;
    group.push({ r, c });

    const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    for (const [dr, dc] of dirs) {
      const nr = r + dr;
      const nc = c + dc;
      if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS) {
        if (!visited[nr][nc] && this.board[nr][nc] === color) {
          this.dfsGroup(nr, nc, color, visited, group);
        }
      }
    }
  }

  // ゲームオーバー
  handleGameOver() {
    this.isPlaying = false;
    this.isGameOver = true;
    this.sound.playGameOver();

    const isNew = this.saveBestScore(this.score);
    this.finalScore.textContent = this.score;
    this.finalMaxChain.textContent = this.maxChain;
    this.finalPops.textContent = this.totalPops;

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
    this.maxChainDisplay.textContent = this.maxChain;
    this.popsDisplay.textContent = this.totalPops;
  }

  // ==========================================
  // 5. 描画ループ & Canvasグラフィック
  // ==========================================
  gameLoop(time) {
    const dt = Math.min((time - this.lastTime) / 1000, 0.1);
    this.lastTime = time;

    if (this.isPlaying && !this.isPaused && !this.isGameOver && !this.isResolvingChain) {
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
    // 画面シェイク
    if (this.effects.shakeTime > 0) {
      const offsetX = (Math.random() - 0.5) * this.effects.shakeIntensity;
      const offsetY = (Math.random() - 0.5) * this.effects.shakeIntensity;
      ctx.translate(offsetX, offsetY);
    }

    // 1. グリッド背景
    ctx.fillStyle = '#070a14';
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

    // 窒息マーク（3列目最上部 × 印）
    ctx.fillStyle = 'rgba(239, 68, 68, 0.25)';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('✖', 2.5 * tileSize, 0.5 * tileSize);

    // 2. 盤面のぷよ描画（連結描画）
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const colorId = this.board[r][c];
        if (colorId !== 0) {
          const connects = this.getConnections(r, c, colorId);
          this.drawPuyo(ctx, c * tileSize + tileSize / 2, r * tileSize + tileSize / 2, tileSize * 0.44, colorId, connects);
        }
      }
    }

    // 3. 落下中ペアぷよ描画
    if (this.isPlaying && this.currentPair && !this.isResolvingChain) {
      const { axisX, axisY, subRot, c1, c2 } = this.currentPair;
      const { dx, dy } = this.getSubOffset(subRot);

      // 軸ぷよ
      this.drawPuyo(ctx, (axisX + 0.5) * tileSize, (axisY + 0.5) * tileSize, tileSize * 0.44, c1, { up: false, down: false, left: false, right: false });

      // 子ぷよ
      this.drawPuyo(ctx, (axisX + dx + 0.5) * tileSize, (axisY + dy + 0.5) * tileSize, tileSize * 0.44, c2, { up: false, down: false, left: false, right: false });
    }

    // 4. パーティクル・バナー描画
    this.effects.draw(ctx, width, height);

    ctx.restore();
  }

  // 同色隣接結合フラグの取得
  getConnections(r, c, colorId) {
    return {
      up: r > 0 && this.board[r - 1][c] === colorId,
      down: r < ROWS - 1 && this.board[r + 1][c] === colorId,
      left: c > 0 && this.board[r][c - 1] === colorId,
      right: c < COLS - 1 && this.board[r][c + 1] === colorId
    };
  }

  // ぷにぷにゼリーぷよ描画 (目玉付き & 連結結合)
  drawPuyo(ctx, cx, cy, radius, colorId, conn) {
    const proto = PUYO_COLORS[colorId];
    if (!proto) return;

    ctx.save();

    // 1. 連結結合ブリッジの描画
    ctx.fillStyle = proto.base;
    const bridgeW = radius * 0.85;
    if (conn.up) ctx.fillRect(cx - bridgeW / 2, cy - radius * 1.2, bridgeW, radius * 1.2);
    if (conn.down) ctx.fillRect(cx - bridgeW / 2, cy, bridgeW, radius * 1.2);
    if (conn.left) ctx.fillRect(cx - radius * 1.2, cy - bridgeW / 2, radius * 1.2, bridgeW);
    if (conn.right) ctx.fillRect(cx, cy - bridgeW / 2, radius * 1.2, bridgeW);

    // 2. ぷよ本体（ぷにぷに円形グラデーション）
    const grad = ctx.createRadialGradient(cx - radius * 0.3, cy - radius * 0.3, radius * 0.1, cx, cy, radius);
    grad.addColorStop(0, proto.light);
    grad.addColorStop(0.7, proto.base);
    grad.addColorStop(1, proto.dark);

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fill();

    // 3. ぷるぷるハイライト光
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.beginPath();
    ctx.arc(cx - radius * 0.35, cy - radius * 0.35, radius * 0.28, 0, Math.PI * 2);
    ctx.fill();

    // 4. キュートな目玉の描画（2つの白目と黒目）
    const eyeOffsetX = radius * 0.32;
    const eyeOffsetY = -radius * 0.05;
    const eyeR = radius * 0.25;
    const pupilR = radius * 0.12;

    // 左目
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(cx - eyeOffsetX, cy + eyeOffsetY, eyeR, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(cx - eyeOffsetX + 1, cy + eyeOffsetY, pupilR, 0, Math.PI * 2);
    ctx.fill();

    // 右目
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(cx + eyeOffsetX, cy + eyeOffsetY, eyeR, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(cx + eyeOffsetX - 1, cy + eyeOffsetY, pupilR, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  // NEXTぷよプレビュー描画
  renderNextCanvases() {
    // NEXT 1
    this.drawPairPreview(this.nextCtx, this.nextPairs[0], this.nextCanvas.width, this.nextCanvas.height, 14);

    // NEXT 2
    this.drawPairPreview(this.next2Ctx, this.nextPairs[1], this.next2Canvas.width, this.next2Canvas.height, 11);
  }

  drawPairPreview(ctx, pair, width, height, radius) {
    ctx.clearRect(0, 0, width, height);
    if (!pair) return;

    const cx = width / 2;
    const cy1 = height * 0.32;
    const cy2 = height * 0.68;

    this.drawPuyo(ctx, cx, cy1, radius, pair.c2, { up: false, down: false, left: false, right: false });
    this.drawPuyo(ctx, cx, cy2, radius, pair.c1, { up: false, down: false, left: false, right: false });
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
        case 'z':
        case 'Z':
        case 'ArrowUp':
        case 'w':
        case 'W':
          this.rotate(-1); // 左回転
          break;
        case 'x':
        case 'X':
        case ' ':
          this.rotate(1); // 右回転
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
        case 'rotLeft': this.rotate(-1); break;
        case 'rotRight': this.rotate(1); break;
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
      if (!this.isPlaying || this.isPaused || this.isGameOver || this.isResolvingChain) return;
      const dx = e.clientX - touchStartX;
      const dy = e.clientY - touchStartY;
      const threshold = 20;

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
        // 短いタップは右回転
        this.rotate(1);
      }
    });

    // 4. オーバーレイボタン
    this.startBtn.addEventListener('click', () => this.startGame());
    this.resumeBtn.addEventListener('click', () => this.togglePause());
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
  new ChainFallGame();
});
