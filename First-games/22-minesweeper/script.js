/**
 * 22 マインスイーパー (Minesweeper) - コアゲームスクリプト
 * 初手安全保証・Flood Fill連鎖・Chord Open・Web Audio・モバイル最適化
 */

// ==========================================
// 1. 難易度設定
// ==========================================
const DIFFICULTY_PRESETS = {
  easy: { rows: 9, cols: 9, mines: 10, name: '初級' },
  medium: { rows: 12, cols: 12, mines: 24, name: '中級' },
  hard: { rows: 16, cols: 16, mines: 40, name: '上級' }
};

const NUMBER_COLORS = {
  1: '#38bdf8', // シアンブルー
  2: '#34d399', // エメラルド
  3: '#f87171', // レッド
  4: '#a855f7', // パープル
  5: '#f59e0b', // アンバー
  6: '#2dd4bf', // ティール
  7: '#f43f5e', // ローズ
  8: '#94a3b8'  // スレートシルバー
};

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

  // タイルを開く音
  playClick() {
    if (!this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const t = this.ctx.currentTime;
      osc.type = 'sine';
      osc.frequency.setValueAtTime(400, t);
      osc.frequency.exponentialRampToValueAtTime(200, t + 0.04);

      gain.gain.setValueAtTime(0.12, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.04);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.04);
    } catch (e) {}
  }

  // 旗を立てる音
  playFlag() {
    if (!this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const t = this.ctx.currentTime;
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(600, t);
      osc.frequency.exponentialRampToValueAtTime(900, t + 0.06);

      gain.gain.setValueAtTime(0.15, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.06);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.06);
    } catch (e) {}
  }

  // 旗を外す音
  playUnflag() {
    if (!this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const t = this.ctx.currentTime;
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(800, t);
      osc.frequency.exponentialRampToValueAtTime(400, t + 0.05);

      gain.gain.setValueAtTime(0.12, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.05);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.05);
    } catch (e) {}
  }

  // 連鎖オープン音
  playCascade(step) {
    if (!this.ctx) return;
    try {
      const baseFreq = 300;
      const freq = baseFreq + Math.min(step, 12) * 50;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const t = this.ctx.currentTime;
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.3, t + 0.05);

      gain.gain.setValueAtTime(0.08, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.05);
    } catch (e) {}
  }

  // 爆発音（地雷）
  playExplode() {
    if (!this.ctx) return;
    try {
      // ノイズ生成
      const bufferSize = this.ctx.sampleRate * 0.4;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(800, this.ctx.currentTime);
      filter.frequency.exponentialRampToValueAtTime(80, this.ctx.currentTime + 0.4);

      const gain = this.ctx.createGain();
      const t = this.ctx.currentTime;
      gain.gain.setValueAtTime(0.4, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.4);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      noise.start(t);
      noise.stop(t + 0.4);
    } catch (e) {}
  }

  // 勝利ファンファーレ
  playWin() {
    if (!this.ctx) return;
    try {
      const notes = [
        { f: 523.25, d: 0.1 },  // C5
        { f: 659.25, d: 0.1 },  // E5
        { f: 783.99, d: 0.1 },  // G5
        { f: 1046.50, d: 0.4 }  // C6
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
}

// ==========================================
// 3. パーティクル演出システム
// ==========================================
class ParticleSystem {
  constructor() {
    this.particles = [];
  }

  addConfetti(width, height) {
    const colors = ['#f59e0b', '#10b981', '#38bdf8', '#ec4899', '#a855f7', '#fbbf24'];
    for (let i = 0; i < 45; i++) {
      this.particles.push({
        x: Math.random() * width,
        y: -10 - Math.random() * 40,
        vx: (Math.random() - 0.5) * 3,
        vy: 2 + Math.random() * 3,
        size: 4 + Math.random() * 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: 1,
        life: 1.6 + Math.random() * 0.8,
        maxLife: 2.2,
        rotation: Math.random() * Math.PI * 2,
        vRot: (Math.random() - 0.5) * 0.2
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
      if (p.rotation !== undefined) {
        p.rotation += p.vRot;
      }
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
      if (p.rotation !== undefined) {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 1.5);
        ctx.restore();
      } else {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }
}

// ==========================================
// 4. メインゲームクラス (MinesweeperGame)
// ==========================================
class MinesweeperGame {
  constructor() {
    this.canvas = document.getElementById('gameCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.sound = new SoundManager();
    this.particles = new ParticleSystem();

    // DOM要素
    this.minesCountDisplay = document.getElementById('mines-count');
    this.timerDisplay = document.getElementById('timer-display');
    this.bestDisplay = document.getElementById('best-display');
    this.faceBtn = document.getElementById('face-btn');
    this.faceIcon = document.getElementById('face-icon');
    this.diffTabs = document.querySelectorAll('.diff-tab');
    this.modeDigBtn = document.getElementById('mode-dig-btn');
    this.modeFlagBtn = document.getElementById('mode-flag-btn');

    this.winOverlay = document.getElementById('win-overlay');
    this.winTime = document.getElementById('win-time');
    this.winDiff = document.getElementById('win-diff');
    this.newRecordBadge = document.getElementById('new-record-badge');
    this.winRestartBtn = document.getElementById('win-restart-btn');

    this.gameoverOverlay = document.getElementById('gameover-overlay');
    this.gameoverRestartBtn = document.getElementById('gameover-restart-btn');

    // 状態管理
    this.currentDiff = 'easy';
    this.currentMode = 'dig'; // 'dig' または 'flag'
    this.rows = 9;
    this.cols = 9;
    this.totalMines = 10;
    this.grid = []; // 2Dセル配列
    this.isFirstClick = true;
    this.isGameOver = false;
    this.isWin = false;
    this.startTime = null;
    this.elapsedSeconds = 0;
    this.timerInterval = null;
    this.lastFrameTime = performance.now();

    // タッチ・長押し管理
    this.touchStartTime = 0;
    this.touchTimer = null;
    this.isLongPressHandled = false;
    this.touchStartPos = { x: 0, y: 0 };

    // ベストタイム (LocalStorage)
    this.bestTimes = this.loadBestTimes();

    // 初期化
    this.initEvents();
    this.startNewGame(this.currentDiff);

    // 描画ループ開始
    requestAnimationFrame((t) => this.gameLoop(t));
  }

  loadBestTimes() {
    try {
      const saved = localStorage.getItem('minesweeper_best_times');
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      return {};
    }
  }

  saveBestTime(diff, seconds) {
    if (!this.bestTimes[diff] || seconds < this.bestTimes[diff]) {
      this.bestTimes[diff] = seconds;
      try {
        localStorage.setItem('minesweeper_best_times', JSON.stringify(this.bestTimes));
      } catch (e) {}
      return true; // 新記録
    }
    return false;
  }

  // 新規ゲーム開始
  startNewGame(diffKey) {
    this.currentDiff = diffKey;
    const preset = DIFFICULTY_PRESETS[diffKey];
    this.rows = preset.rows;
    this.cols = preset.cols;
    this.totalMines = preset.mines;

    this.isFirstClick = true;
    this.isGameOver = false;
    this.isWin = false;
    if (this.gameOverTimeout) {
      clearTimeout(this.gameOverTimeout);
      this.gameOverTimeout = null;
    }
    this.stopTimer();
    this.elapsedSeconds = 0;
    this.updateTimerDisplay();

    // フェイスアイコン通常
    this.faceIcon.textContent = '🙂';

    // グリッド初期化
    this.grid = Array.from({ length: this.rows }, (_, r) =>
      Array.from({ length: this.cols }, (_, c) => ({
        r, c,
        isMine: false,
        isOpen: false,
        isFlagged: false,
        count: 0,
        exploded: false,
        wrongFlag: false
      }))
    );

    this.updateHUD();
    this.winOverlay.classList.add('hidden');
    this.gameoverOverlay.classList.add('hidden');

    // タブのアクティブ更新
    this.diffTabs.forEach(tab => {
      tab.classList.toggle('active', tab.dataset.diff === diffKey);
    });
  }

  // 初回クリック時の地雷生成（初手安全保証）
  placeMines(firstR, firstC) {
    // 最初のマスとその周囲8マスを禁止ゾーンとする
    const forbidden = new Set();
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        const nr = firstR + dr;
        const nc = firstC + dc;
        if (nr >= 0 && nr < this.rows && nc >= 0 && nc < this.cols) {
          forbidden.add(`${nr},${nc}`);
        }
      }
    }

    // 全候補リスト
    const candidates = [];
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        if (!forbidden.has(`${r},${c}`)) {
          candidates.push({ r, c });
        }
      }
    }

    // シャッフルして地雷を配置
    for (let i = candidates.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
    }

    const mineCount = Math.min(this.totalMines, candidates.length);
    for (let i = 0; i < mineCount; i++) {
      const { r, c } = candidates[i];
      this.grid[r][c].isMine = true;
    }

    // 周囲の地雷数を計算
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        if (!this.grid[r][c].isMine) {
          this.grid[r][c].count = this.countAdjacentMines(r, c);
        }
      }
    }
  }

  countAdjacentMines(r, c) {
    let count = 0;
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const nr = r + dr;
        const nc = c + dc;
        if (nr >= 0 && nr < this.rows && nc >= 0 && nc < this.cols) {
          if (this.grid[nr][nc].isMine) count++;
        }
      }
    }
    return count;
  }

  // タイマー管理
  startTimer() {
    this.startTime = Date.now();
    this.timerInterval = setInterval(() => {
      this.elapsedSeconds = Math.min(999, Math.floor((Date.now() - this.startTime) / 1000));
      this.updateTimerDisplay();
    }, 1000);
  }

  stopTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  updateTimerDisplay() {
    const formatted = String(this.elapsedSeconds).padStart(3, '0');
    this.timerDisplay.textContent = formatted;
  }

  // HUD更新
  updateHUD() {
    let flagCount = 0;
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        if (this.grid[r][c].isFlagged) flagCount++;
      }
    }
    const remainingMines = Math.max(-99, this.totalMines - flagCount);
    const sign = remainingMines < 0 ? '-' : '';
    const numStr = String(Math.abs(remainingMines)).padStart(sign ? 2 : 3, '0');
    this.minesCountDisplay.textContent = sign + numStr;

    const best = this.bestTimes[this.currentDiff];
    this.bestDisplay.textContent = best !== undefined ? String(best).padStart(3, '0') : '---';
  }

  // ==========================================
  // 5. ゲームロジック (掘る / 旗 / 連鎖 / コード)
  // ==========================================

  // セルを掘る (Dig)
  digCell(r, c) {
    if (this.isGameOver || this.isWin) return;
    const cell = this.grid[r][c];

    // 既に開いていて旗がないマスをタップした場合は Chord Open
    if (cell.isOpen) {
      this.chordOpen(r, c);
      return;
    }

    if (cell.isFlagged) return;

    this.sound.init();

    // 初回タップ時の処理
    if (this.isFirstClick) {
      this.isFirstClick = false;
      this.placeMines(r, c);
      this.startTimer();
    }

    // 地雷を踏んだ場合
    if (cell.isMine) {
      cell.isOpen = true;
      cell.exploded = true;
      this.handleGameOver();
      return;
    }

    // 安全なセルを開く
    this.sound.playClick();
    this.openCell(r, c);
    this.checkWinCondition();
  }

  // 単一セルのオープン & Flood Fill
  openCell(r, c) {
    const cell = this.grid[r][c];
    if (cell.isOpen || cell.isFlagged || cell.isMine) return;

    cell.isOpen = true;

    // 空白マス (count === 0) の場合、Flood Fill連鎖
    if (cell.count === 0) {
      const queue = [{ r, c }];
      let cascadeStep = 1;

      while (queue.length > 0) {
        const curr = queue.shift();

        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            if (dr === 0 && dc === 0) continue;
            const nr = curr.r + dr;
            const nc = curr.c + dc;
            if (nr >= 0 && nr < this.rows && nc >= 0 && nc < this.cols) {
              const neighbor = this.grid[nr][nc];
              if (!neighbor.isOpen && !neighbor.isFlagged && !neighbor.isMine) {
                neighbor.isOpen = true;
                if (neighbor.count === 0) {
                  queue.push({ r: nr, c: nc });
                }
              }
            }
          }
        }
        cascadeStep++;
      }
      this.sound.playCascade(cascadeStep);
    }
  }

  // 旗の設置 / 解除 (Flag)
  toggleFlag(r, c) {
    if (this.isGameOver || this.isWin) return;
    const cell = this.grid[r][c];
    if (cell.isOpen) return;

    this.sound.init();

    cell.isFlagged = !cell.isFlagged;
    if (cell.isFlagged) {
      this.sound.playFlag();
    } else {
      this.sound.playUnflag();
    }

    this.updateHUD();
  }

  // コードオープン (Chord Open: 数字マスの周囲旗数が一致していれば残りを一括オープン)
  chordOpen(r, c) {
    const cell = this.grid[r][c];
    if (!cell.isOpen || cell.count === 0) return;

    // 周囲の旗の数を数える
    let flagCount = 0;
    const neighbors = [];
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const nr = r + dr;
        const nc = c + dc;
        if (nr >= 0 && nr < this.rows && nc >= 0 && nc < this.cols) {
          const nb = this.grid[nr][nc];
          neighbors.push(nb);
          if (nb.isFlagged) flagCount++;
        }
      }
    }

    // 旗の数が周囲地雷数と一致していればオープン
    if (flagCount === cell.count) {
      let hitMine = false;
      neighbors.forEach(nb => {
        if (!nb.isOpen && !nb.isFlagged) {
          if (nb.isMine) {
            nb.isOpen = true;
            nb.exploded = true;
            hitMine = true;
          } else {
            this.openCell(nb.r, nb.c);
          }
        }
      });

      if (hitMine) {
        this.handleGameOver();
      } else {
        this.sound.playClick();
        this.checkWinCondition();
      }
    }
  }

  // 勝利判定
  checkWinCondition() {
    let unopendSafeCount = 0;
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const cell = this.grid[r][c];
        if (!cell.isMine && !cell.isOpen) {
          unopendSafeCount++;
        }
      }
    }

    if (unopendSafeCount === 0 && !this.isGameOver && !this.isWin) {
      this.isWin = true;
      this.stopTimer();
      this.faceIcon.textContent = '😎';
      this.sound.playWin();
      this.particles.addConfetti(this.canvas.width, this.canvas.height);

      // 未フラグの地雷に旗を立てて残り000にする
      for (let r = 0; r < this.rows; r++) {
        for (let c = 0; c < this.cols; c++) {
          if (this.grid[r][c].isMine) {
            this.grid[r][c].isFlagged = true;
          }
        }
      }
      this.updateHUD();

      const isNewRecord = this.saveBestTime(this.currentDiff, this.elapsedSeconds);
      this.updateHUD();

      setTimeout(() => {
        this.winTime.textContent = this.elapsedSeconds;
        this.winDiff.textContent = DIFFICULTY_PRESETS[this.currentDiff].name;
        if (isNewRecord) {
          this.newRecordBadge.classList.remove('hidden');
        } else {
          this.newRecordBadge.classList.add('hidden');
        }
        this.winOverlay.classList.remove('hidden');
      }, 500);
    }
  }

  // ゲームオーバー
  handleGameOver() {
    this.isGameOver = true;
    this.stopTimer();
    this.faceIcon.textContent = '😵';
    this.sound.playExplode();

    // 未発見地雷の露出 & 誤フラグの判定
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const cell = this.grid[r][c];
        if (cell.isMine && !cell.isFlagged) {
          cell.isOpen = true;
        } else if (!cell.isMine && cell.isFlagged) {
          cell.wrongFlag = true;
        }
      }
    }

    if (this.gameOverTimeout) {
      clearTimeout(this.gameOverTimeout);
    }
    this.gameOverTimeout = setTimeout(() => {
      if (this.isGameOver) {
        this.gameoverOverlay.classList.remove('hidden');
      }
    }, 5000);
  }

  // ==========================================
  // 6. Canvas 描画ループ
  // ==========================================
  gameLoop(time) {
    const dt = Math.min((time - this.lastFrameTime) / 1000, 0.1);
    this.lastFrameTime = time;

    this.particles.update(dt);
    this.render();

    requestAnimationFrame((t) => this.gameLoop(t));
  }

  getTileMetrics() {
    const padding = 6;
    const availWidth = this.canvas.width - padding * 2;
    const availHeight = this.canvas.height - padding * 2;

    const tileSize = Math.floor(Math.min(availWidth / this.cols, availHeight / this.rows));
    const totalW = tileSize * this.cols;
    const totalH = tileSize * this.rows;

    const offsetX = Math.floor((this.canvas.width - totalW) / 2);
    const offsetY = Math.floor((this.canvas.height - totalH) / 2);

    return { tileSize, offsetX, offsetY };
  }

  render() {
    const { ctx, canvas } = this;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const { tileSize, offsetX, offsetY } = this.getTileMetrics();

    // グリッド全体の枠
    ctx.save();
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const x = offsetX + c * tileSize;
        const y = offsetY + r * tileSize;
        const cell = this.grid[r][c];

        this.drawCell(ctx, cell, x, y, tileSize);
      }
    }
    ctx.restore();

    // パーティクル
    this.particles.draw(ctx);
  }

  drawCell(ctx, cell, x, y, size) {
    ctx.save();
    const bevel = Math.max(2, Math.floor(size * 0.1));

    if (!cell.isOpen) {
      // 未開封セル (くっきりと浮き出た3Dタイル)
      // 1. タイルベース面
      ctx.fillStyle = '#475569';
      ctx.fillRect(x, y, size, size);

      // 2. 上面ハイライト (明るい光)
      ctx.fillStyle = '#94a3b8';
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + size, y);
      ctx.lineTo(x + size - bevel, y + bevel);
      ctx.lineTo(x + bevel, y + bevel);
      ctx.closePath();
      ctx.fill();

      // 3. 左面ハイライト
      ctx.fillStyle = '#cbd5e1';
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + bevel, y + bevel);
      ctx.lineTo(x + bevel, y + size - bevel);
      ctx.lineTo(x, y + size);
      ctx.closePath();
      ctx.fill();

      // 4. 右面シャドウ
      ctx.fillStyle = '#334155';
      ctx.beginPath();
      ctx.moveTo(x + size, y);
      ctx.lineTo(x + size, y + size);
      ctx.lineTo(x + size - bevel, y + size - bevel);
      ctx.lineTo(x + size - bevel, y + bevel);
      ctx.closePath();
      ctx.fill();

      // 5. 下面シャドウ (濃い影)
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.moveTo(x, y + size);
      ctx.lineTo(x + bevel, y + size - bevel);
      ctx.lineTo(x + size - bevel, y + size - bevel);
      ctx.lineTo(x + size, y + size);
      ctx.closePath();
      ctx.fill();

      // 6. グリッドの黒枠線
      ctx.strokeStyle = '#090d16';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(x, y, size, size);

      // 旗の描画
      if (cell.isFlagged) {
        this.drawFlagIcon(ctx, x, y, size);
      }
    } else {
      // 開封済みセル (凹んだダークフラット面)
      if (cell.exploded) {
        ctx.fillStyle = '#b91c1c';
        ctx.fillRect(x, y, size, size);
      } else {
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(x, y, size, size);
      }

      // 凹みグリッド枠線
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 1;
      ctx.strokeRect(x, y, size, size);

      if (cell.isMine) {
        this.drawMineIcon(ctx, x, y, size, cell.exploded);
      } else if (cell.wrongFlag) {
        this.drawWrongFlagIcon(ctx, x, y, size);
      } else if (cell.count > 0) {
        // 数字の描画
        ctx.fillStyle = NUMBER_COLORS[cell.count] || '#f8fafc';
        ctx.font = `bold ${Math.floor(size * 0.65)}px "Segoe UI", Roboto, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(cell.count, x + size / 2, y + size / 2 + 1);
      }
    }

    ctx.restore();
  }

  // 旗アイコン描画
  drawFlagIcon(ctx, x, y, size) {
    const cx = x + size / 2;
    const cy = y + size / 2;
    const s = size * 0.6;

    // ポール
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = Math.max(1.5, size * 0.08);
    ctx.beginPath();
    ctx.moveTo(cx - s * 0.2, cy + s * 0.45);
    ctx.lineTo(cx - s * 0.2, cy - s * 0.4);
    ctx.stroke();

    // 赤い旗
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.moveTo(cx - s * 0.2, cy - s * 0.4);
    ctx.lineTo(cx + s * 0.4, cy - s * 0.15);
    ctx.lineTo(cx - s * 0.2, cy + s * 0.1);
    ctx.closePath();
    ctx.fill();

    // 台座
    ctx.fillStyle = '#64748b';
    ctx.fillRect(cx - s * 0.4, cy + s * 0.35, s * 0.5, s * 0.15);
  }

  // 地雷アイコン描画
  drawMineIcon(ctx, x, y, size, exploded) {
    const cx = x + size / 2;
    const cy = y + size / 2;
    const r = size * 0.25;

    // 地雷本体
    ctx.fillStyle = exploded ? '#fef08a' : '#1e293b';
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = exploded ? '#ef4444' : '#64748b';
    ctx.lineWidth = Math.max(1.5, size * 0.07);
    ctx.stroke();

    // トゲ
    const spikes = 8;
    for (let i = 0; i < spikes; i++) {
      const angle = (Math.PI * 2 * i) / spikes;
      const x1 = cx + Math.cos(angle) * (r * 0.7);
      const y1 = cy + Math.sin(angle) * (r * 0.7);
      const x2 = cx + Math.cos(angle) * (r * 1.4);
      const y2 = cy + Math.sin(angle) * (r * 1.4);

      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }

    // ハイライト
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(cx - r * 0.3, cy - r * 0.3, r * 0.25, 0, Math.PI * 2);
    ctx.fill();
  }

  // 誤フラグ ❌
  drawWrongFlagIcon(ctx, x, y, size) {
    this.drawFlagIcon(ctx, x, y, size);
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = Math.max(2, size * 0.1);
    ctx.beginPath();
    ctx.moveTo(x + 4, y + 4);
    ctx.lineTo(x + size - 4, y + size - 4);
    ctx.moveTo(x + size - 4, y + 4);
    ctx.lineTo(x + 4, y + size - 4);
    ctx.stroke();
  }

  // ==========================================
  // 7. イベントハンドリング & 入力処理
  // ==========================================
  initEvents() {
    // 1. 難易度タブ切り替え
    this.diffTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        this.sound.init();
        this.startNewGame(tab.dataset.diff);
      });
    });

    // 2. フェイスボタン (リセット)
    this.faceBtn.addEventListener('click', () => {
      this.sound.init();
      this.startNewGame(this.currentDiff);
    });

    // 3. 操作モードトグル (DIG / FLAG)
    this.modeDigBtn.addEventListener('click', () => {
      this.currentMode = 'dig';
      this.modeDigBtn.classList.add('active');
      this.modeFlagBtn.classList.remove('active');
    });

    this.modeFlagBtn.addEventListener('click', () => {
      this.currentMode = 'flag';
      this.modeFlagBtn.classList.add('active');
      this.modeDigBtn.classList.remove('active');
    });

    // 4. キャンバス操作（Pointer Events で PC/スマホ/iPad を完全一元化）
    const getGridPos = (clientX, clientY) => {
      const rect = this.canvas.getBoundingClientRect();
      const scaleX = this.canvas.width / rect.width;
      const scaleY = this.canvas.height / rect.height;

      const canvasX = (clientX - rect.left) * scaleX;
      const canvasY = (clientY - rect.top) * scaleY;

      const { tileSize, offsetX, offsetY } = this.getTileMetrics();

      const rawC = Math.floor((canvasX - offsetX) / tileSize);
      const rawR = Math.floor((canvasY - offsetY) / tileSize);

      const c = Math.max(0, Math.min(this.cols - 1, rawC));
      const r = Math.max(0, Math.min(this.rows - 1, rawR));

      // 盤面エリア内かチェック
      if (canvasX >= offsetX - 4 && canvasX <= offsetX + tileSize * this.cols + 4 &&
          canvasY >= offsetY - 4 && canvasY <= offsetY + tileSize * this.rows + 4) {
        return { r, c };
      }
      return null;
    };

    let pointerStartTime = 0;
    let pointerStartPos = { x: 0, y: 0 };
    let longPressTimer = null;
    let isLongPress = false;

    this.canvas.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      pointerStartTime = Date.now();
      pointerStartPos = { x: e.clientX, y: e.clientY };
      isLongPress = false;

      if (!this.isGameOver && !this.isWin) {
        this.faceIcon.textContent = '😮';
      }

      const pos = getGridPos(e.clientX, e.clientY);
      if (pos && e.button !== 2) {
        // 350ms長押しで旗立て
        longPressTimer = setTimeout(() => {
          isLongPress = true;
          this.toggleFlag(pos.r, pos.c);
          if (!this.isGameOver && !this.isWin) {
            this.faceIcon.textContent = '🙂';
          }
        }, 350);
      }
    });

    this.canvas.addEventListener('pointermove', (e) => {
      const dx = e.clientX - pointerStartPos.x;
      const dy = e.clientY - pointerStartPos.y;
      if (Math.hypot(dx, dy) > 10) {
        clearTimeout(longPressTimer);
      }
    });

    this.canvas.addEventListener('pointerup', (e) => {
      e.preventDefault();
      clearTimeout(longPressTimer);

      if (!this.isGameOver && !this.isWin) {
        this.faceIcon.textContent = '🙂';
      }

      if (isLongPress) return;

      const pos = getGridPos(e.clientX, e.clientY);
      if (!pos) return;

      // 右クリック（button === 2）の場合は旗立て
      if (e.button === 2) {
        this.toggleFlag(pos.r, pos.c);
      } else {
        if (this.currentMode === 'dig') {
          this.digCell(pos.r, pos.c);
        } else {
          this.toggleFlag(pos.r, pos.c);
        }
      }
    });

    this.canvas.addEventListener('pointercancel', () => {
      clearTimeout(longPressTimer);
      if (!this.isGameOver && !this.isWin) {
        this.faceIcon.textContent = '🙂';
      }
    });

    this.canvas.addEventListener('contextmenu', (e) => {
      e.preventDefault();
    });

    // 5. オーバーレイボタン
    this.winRestartBtn.addEventListener('click', () => {
      this.sound.init();
      this.startNewGame(this.currentDiff);
    });

    this.gameoverRestartBtn.addEventListener('click', () => {
      this.sound.init();
      this.startNewGame(this.currentDiff);
    });
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
  new MinesweeperGame();
});
