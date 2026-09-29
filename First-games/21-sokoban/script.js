/**
 * 21 倉庫番 (Sokoban) - コアゲームスクリプト
 * グリッド移動・箱押し物理・無限UNDO・Canvasレンダラー・Web Audio
 */

// ==========================================
// 1. 定数・ステージデータ定義
// ==========================================
// 記号: '#' = 壁, ' ' = 床, '.' = ゴール, '$' = 木箱, '*' = ゴール上の箱, '@' = プレイヤー, '+' = ゴール上のプレイヤー
const STAGES = [
  // Stage 1: 入門 (箱2個・基本の押し)
  [
    "######",
    "# .  #",
    "# #$ #",
    "# @$.#",
    "#    #",
    "######"
  ],
  // Stage 2: 基礎 (箱2個・回り込みと順序)
  [
    "  ##### ",
    "###   # ",
    "#.@$  # ",
    "### $.# ",
    "  ##### "
  ],
  // Stage 3: 中級 (箱3個・スペース確保)
  [
    "######",
    "#  . #",
    "# $$ #",
    "# .$.#",
    "#  @ #",
    "######"
  ],
  // Stage 4: 難関 (箱3個・精密なルート管理)
  [
    "######",
    "# .  #",
    "# #$$#",
    "# .$.#",
    "#  @ #",
    "######"
  ],
  // Stage 5: マスター (箱4個・倉庫番クラシック)
  [
    "#######",
    "#  .  #",
    "# $#$ #",
    "# .@. #",
    "# $#$ #",
    "#  .  #",
    "#######"
  ]
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

  // プレイヤー移動音（軽い足音）
  playStep() {
    if (!this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const t = this.ctx.currentTime;
      osc.type = 'sine';
      osc.frequency.setValueAtTime(160, t);
      osc.frequency.exponentialRampToValueAtTime(70, t + 0.05);

      gain.gain.setValueAtTime(0.12, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.05);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.05);
    } catch (e) {}
  }

  // 木箱を押す音（ゴトッという重低音）
  playPush() {
    if (!this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const t = this.ctx.currentTime;
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(120, t);
      osc.frequency.exponentialRampToValueAtTime(45, t + 0.1);

      gain.gain.setValueAtTime(0.25, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.1);
    } catch (e) {}
  }

  // ゴールに木箱が格納された音（ピロリン♪）
  playGoal() {
    if (!this.ctx) return;
    try {
      const notes = [523.25, 659.25, 783.99]; // C5, E5, G5
      notes.forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const t = this.ctx.currentTime + idx * 0.06;
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

  // UNDO音（シュッ）
  playUndo() {
    if (!this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const t = this.ctx.currentTime;
      osc.type = 'sine';
      osc.frequency.setValueAtTime(350, t);
      osc.frequency.exponentialRampToValueAtTime(150, t + 0.08);

      gain.gain.setValueAtTime(0.15, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.08);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.08);
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
        { f: 1046.50, d: 0.35 } // C6
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

  addGoalSparkles(x, y, tileSize) {
    const count = 12;
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
      const speed = 1.5 + Math.random() * 2.5;
      this.particles.push({
        x: x + tileSize / 2,
        y: y + tileSize / 2,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 3 + Math.random() * 3,
        color: Math.random() > 0.4 ? '#fbbf24' : '#34d399',
        alpha: 1,
        life: 0.6,
        maxLife: 0.6
      });
    }
  }

  addConfetti(width, height) {
    const colors = ['#f59e0b', '#10b981', '#38bdf8', '#ec4899', '#a855f7', '#fbbf24'];
    for (let i = 0; i < 40; i++) {
      this.particles.push({
        x: Math.random() * width,
        y: -10 - Math.random() * 40,
        vx: (Math.random() - 0.5) * 3,
        vy: 2 + Math.random() * 3,
        size: 4 + Math.random() * 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: 1,
        life: 1.5 + Math.random() * 0.8,
        maxLife: 2.0,
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
// 4. メインゲームクラス (SokobanGame)
// ==========================================
class SokobanGame {
  constructor() {
    this.canvas = document.getElementById('gameCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.sound = new SoundManager();
    this.particles = new ParticleSystem();

    // DOM要素
    this.movesDisplay = document.getElementById('moves-display');
    this.pushesDisplay = document.getElementById('pushes-display');
    this.bestMovesDisplay = document.getElementById('best-moves-display');
    this.stageSelect = document.getElementById('stage-select');
    this.undoBtn = document.getElementById('undo-btn');
    this.resetBtn = document.getElementById('reset-btn');

    this.clearOverlay = document.getElementById('clear-overlay');
    this.clearMoves = document.getElementById('clear-moves');
    this.clearPushes = document.getElementById('clear-pushes');
    this.newRecordBadge = document.getElementById('new-record-badge');
    this.nextStageBtn = document.getElementById('next-stage-btn');
    this.retryStageBtn = document.getElementById('retry-stage-btn');

    this.allClearOverlay = document.getElementById('all-clear-overlay');
    this.allClearRestartBtn = document.getElementById('all-clear-restart-btn');

    // ゲーム状態
    this.currentStageIndex = 0;
    this.gridWidth = 0;
    this.gridHeight = 0;
    this.walls = []; // 2D boolean
    this.goals = []; // 2D boolean
    this.player = { x: 0, y: 0, dir: 'down', animX: 0, animY: 0 };
    this.boxes = []; // [{x, y, animX, animY, onGoal}]
    this.moves = 0;
    this.pushes = 0;
    this.history = [];
    this.isCleared = false;
    this.lastTime = performance.now();

    // ハイスコア（最少歩数）
    this.bestScores = this.loadBestScores();

    // 初期化
    this.initEvents();
    this.loadStage(0);
    this.updateUndoButtonState();

    // 描画ループ開始
    requestAnimationFrame((t) => this.gameLoop(t));
  }

  loadBestScores() {
    try {
      const saved = localStorage.getItem('sokoban_best_moves');
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      return {};
    }
  }

  saveBestScore(stage, moves) {
    if (!this.bestScores[stage] || moves < this.bestScores[stage]) {
      this.bestScores[stage] = moves;
      try {
        localStorage.setItem('sokoban_best_moves', JSON.stringify(this.bestScores));
      } catch (e) {}
      return true; // 新記録
    }
    return false;
  }

  // ステージの読み込みとパース
  loadStage(index) {
    this.currentStageIndex = Math.max(0, Math.min(index, STAGES.length - 1));
    this.stageSelect.value = this.currentStageIndex;

    const mapData = STAGES[this.currentStageIndex];
    this.gridHeight = mapData.length;
    this.gridWidth = Math.max(...mapData.map(row => row.length));

    this.walls = Array.from({ length: this.gridHeight }, () => Array(this.gridWidth).fill(false));
    this.goals = Array.from({ length: this.gridHeight }, () => Array(this.gridWidth).fill(false));
    this.boxes = [];
    this.history = [];
    this.moves = 0;
    this.pushes = 0;
    this.isCleared = false;

    // パース
    for (let r = 0; r < this.gridHeight; r++) {
      const line = mapData[r];
      for (let c = 0; c < this.gridWidth; c++) {
        const char = c < line.length ? line[c] : ' ';
        if (char === '#') {
          this.walls[r][c] = true;
        } else if (char === '.') {
          this.goals[r][c] = true;
        } else if (char === '$') {
          this.boxes.push({ x: c, y: r, animX: c, animY: r, onGoal: false });
        } else if (char === '*') {
          this.goals[r][c] = true;
          this.boxes.push({ x: c, y: r, animX: c, animY: r, onGoal: true });
        } else if (char === '@') {
          this.player = { x: c, y: r, dir: 'down', animX: c, animY: r };
        } else if (char === '+') {
          this.goals[r][c] = true;
          this.player = { x: c, y: r, dir: 'down', animX: c, animY: r };
        }
      }
    }

    this.updateBoxGoalStatus();
    this.updateHUD();
    this.updateUndoButtonState();
    this.clearOverlay.classList.add('hidden');
    this.allClearOverlay.classList.add('hidden');
  }

  // 各木箱がゴール上にあるか更新
  updateBoxGoalStatus() {
    this.boxes.forEach(b => {
      b.onGoal = this.goals[b.y] && this.goals[b.y][b.x];
    });
  }

  // プレイヤー移動処理
  tryMove(dx, dy) {
    if (this.isCleared) return;
    this.sound.init();

    // 向きの設定
    if (dx === 1) this.player.dir = 'right';
    else if (dx === -1) this.player.dir = 'left';
    else if (dy === 1) this.player.dir = 'down';
    else if (dy === -1) this.player.dir = 'up';

    const targetX = this.player.x + dx;
    const targetY = this.player.y + dy;

    // 盤面外または壁判定
    if (this.isWall(targetX, targetY)) return;

    // 木箱があるかチェック
    const boxIndex = this.boxes.findIndex(b => b.x === targetX && b.y === targetY);

    if (boxIndex !== -1) {
      // 木箱を押す場合
      const boxTargetX = targetX + dx;
      const boxTargetY = targetY + dy;

      // 木箱の先が壁または別の木箱なら押せない
      if (this.isWall(boxTargetX, boxTargetY) || this.isBox(boxTargetX, boxTargetY)) {
        return;
      }

      // 履歴に現在状態をプッシュ（UNDO用）
      this.pushHistory();

      // 木箱を移動
      const box = this.boxes[boxIndex];
      box.x = boxTargetX;
      box.y = boxTargetY;
      this.player.x = targetX;
      this.player.y = targetY;

      this.moves++;
      this.pushes++;

      const wasOnGoal = box.onGoal;
      this.updateBoxGoalStatus();

      // ゴール格納時の演出
      if (!wasOnGoal && box.onGoal) {
        this.sound.playGoal();
        const { tileSize, offsetX, offsetY } = this.getTileMetrics();
        this.particles.addGoalSparkles(
          offsetX + box.x * tileSize,
          offsetY + box.y * tileSize,
          tileSize
        );
      } else {
        this.sound.playPush();
      }
    } else {
      // 木箱がないマスへの歩行移動
      this.pushHistory();
      this.player.x = targetX;
      this.player.y = targetY;
      this.moves++;
      this.sound.playStep();
    }

    this.updateHUD();
    this.updateUndoButtonState();
    this.checkStageClear();
  }

  // 履歴スタックに記録
  pushHistory() {
    this.history.push({
      player: { x: this.player.x, y: this.player.y, dir: this.player.dir },
      boxes: this.boxes.map(b => ({ x: b.x, y: b.y })),
      moves: this.moves,
      pushes: this.pushes
    });
  }

  // 一手戻す (UNDO)
  undo() {
    if (this.history.length === 0 || this.isCleared) return;
    this.sound.init();
    this.sound.playUndo();

    const lastState = this.history.pop();
    this.player.x = lastState.player.x;
    this.player.y = lastState.player.y;
    this.player.dir = lastState.player.dir;

    lastState.boxes.forEach((b, idx) => {
      this.boxes[idx].x = b.x;
      this.boxes[idx].y = b.y;
    });

    this.moves = lastState.moves;
    this.pushes = lastState.pushes;

    this.updateBoxGoalStatus();
    this.updateHUD();
    this.updateUndoButtonState();
  }

  // リセット
  resetStage() {
    this.sound.init();
    this.sound.playUndo();
    this.loadStage(this.currentStageIndex);
  }

  // 壁判定
  isWall(x, y) {
    if (x < 0 || x >= this.gridWidth || y < 0 || y >= this.gridHeight) return true;
    return this.walls[y][x];
  }

  // 木箱判定
  isBox(x, y) {
    return this.boxes.some(b => b.x === x && b.y === y);
  }

  // クリア判定
  checkStageClear() {
    const allGoalsFilled = this.boxes.length > 0 && this.boxes.every(b => b.onGoal);
    if (allGoalsFilled && !this.isCleared) {
      this.isCleared = true;
      this.sound.playClear();
      this.particles.addConfetti(this.canvas.width, this.canvas.height);

      const isNewRecord = this.saveBestScore(this.currentStageIndex, this.moves);
      this.updateHUD();

      setTimeout(() => {
        if (this.currentStageIndex === STAGES.length - 1) {
          // 全ステージ制覇
          this.allClearOverlay.classList.remove('hidden');
        } else {
          // ステージクリア
          this.clearMoves.textContent = this.moves;
          this.clearPushes.textContent = this.pushes;
          if (isNewRecord) {
            this.newRecordBadge.classList.remove('hidden');
          } else {
            this.newRecordBadge.classList.add('hidden');
          }
          this.clearOverlay.classList.remove('hidden');
        }
      }, 300);
    }
  }

  // HUD更新
  updateHUD() {
    this.movesDisplay.textContent = this.moves;
    this.pushesDisplay.textContent = this.pushes;
    const best = this.bestScores[this.currentStageIndex];
    this.bestMovesDisplay.textContent = best !== undefined ? best : '-';
  }

  updateUndoButtonState() {
    this.undoBtn.disabled = this.history.length === 0 || this.isCleared;
  }

  // タイル描画メトリクス計算（キャンバス中央に美しく収まるサイズ）
  getTileMetrics() {
    const padding = 12;
    const availWidth = this.canvas.width - padding * 2;
    const availHeight = this.canvas.height - padding * 2;

    const tileSize = Math.floor(Math.min(availWidth / this.gridWidth, availHeight / this.gridHeight));
    const totalW = tileSize * this.gridWidth;
    const totalH = tileSize * this.gridHeight;

    const offsetX = Math.floor((this.canvas.width - totalW) / 2);
    const offsetY = Math.floor((this.canvas.height - totalH) / 2);

    return { tileSize, offsetX, offsetY };
  }

  // ==========================================
  // 5. 描画ループ & Canvasグラフィック
  // ==========================================
  gameLoop(time) {
    const dt = Math.min((time - this.lastTime) / 1000, 0.1);
    this.lastTime = time;

    // アニメーション補間（滑らかなスライド移動）
    const lerpSpeed = 16;
    this.player.animX += (this.player.x - this.player.animX) * lerpSpeed * dt;
    this.player.animY += (this.player.y - this.player.animY) * lerpSpeed * dt;

    this.boxes.forEach(b => {
      b.animX += (b.x - b.animX) * lerpSpeed * dt;
      b.animY += (b.y - b.animY) * lerpSpeed * dt;
    });

    this.particles.update(dt);
    this.render();

    requestAnimationFrame((t) => this.gameLoop(t));
  }

  render() {
    const { ctx, canvas } = this;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const { tileSize, offsetX, offsetY } = this.getTileMetrics();

    // 1. 床と壁の描画
    for (let r = 0; r < this.gridHeight; r++) {
      for (let c = 0; c < this.gridWidth; c++) {
        const x = offsetX + c * tileSize;
        const y = offsetY + r * tileSize;

        if (this.walls[r][c]) {
          this.drawWall(ctx, x, y, tileSize);
        } else {
          // マップ外の空白チェック（壁で囲まれていない余白）
          if (this.isWalkableOrInside(c, r)) {
            this.drawFloor(ctx, x, y, tileSize);
          }
        }
      }
    }

    // 2. ゴール地点の描画
    for (let r = 0; r < this.gridHeight; r++) {
      for (let c = 0; c < this.gridWidth; c++) {
        if (this.goals[r][c]) {
          const x = offsetX + c * tileSize;
          const y = offsetY + r * tileSize;
          this.drawGoal(ctx, x, y, tileSize);
        }
      }
    }

    // 3. 木箱の描画
    this.boxes.forEach(b => {
      const bx = offsetX + b.animX * tileSize;
      const by = offsetY + b.animY * tileSize;
      this.drawBox(ctx, bx, by, tileSize, b.onGoal);
    });

    // 4. プレイヤーの描画
    const px = offsetX + this.player.animX * tileSize;
    const py = offsetY + this.player.animY * tileSize;
    this.drawPlayer(ctx, px, py, tileSize, this.player.dir);

    // 5. パーティクルの描画
    this.particles.draw(ctx);
  }

  // ステージ内の移動可能領域判定
  isWalkableOrInside(c, r) {
    return true;
  }

  // 壁描画 (レンガ・立体ブロック調)
  drawWall(ctx, x, y, size) {
    ctx.save();
    // ベース
    ctx.fillStyle = '#334155';
    ctx.fillRect(x, y, size, size);

    // 上部・左のハイライト
    ctx.fillStyle = '#475569';
    ctx.fillRect(x, y, size, 3);
    ctx.fillRect(x, y, 3, size);

    // 下部・右のシャドウ
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(x, y + size - 3, size, 3);
    ctx.fillRect(x + size - 3, y, 3, size);

    // レンガ目地
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x + 1, y + 1, size - 2, size - 2);

    // 中心のレンガライン
    ctx.beginPath();
    ctx.moveTo(x + 2, y + size / 2);
    ctx.lineTo(x + size - 2, y + size / 2);
    ctx.moveTo(x + size / 2, y + 2);
    ctx.lineTo(x + size / 2, y + size / 2);
    ctx.stroke();

    ctx.restore();
  }

  // 床描画
  drawFloor(ctx, x, y, size) {
    ctx.save();
    ctx.fillStyle = '#111827';
    ctx.fillRect(x, y, size, size);

    // グリッド枠線
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, size, size);
    ctx.restore();
  }

  // ゴール地点描画 (ターゲットマーカー)
  drawGoal(ctx, x, y, size) {
    ctx.save();
    const cx = x + size / 2;
    const cy = y + size / 2;
    const r = size * 0.28;

    // 外側の光輪
    ctx.fillStyle = 'rgba(16, 185, 129, 0.18)';
    ctx.beginPath();
    ctx.arc(cx, cy, r * 1.3, 0, Math.PI * 2);
    ctx.fill();

    // ターゲット円
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();

    // 中心点
    ctx.fillStyle = '#34d399';
    ctx.beginPath();
    ctx.arc(cx, cy, 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  // 木箱描画 (通常木箱 / 格納済みゴールド木箱)
  drawBox(ctx, x, y, size, onGoal) {
    ctx.save();
    const margin = size * 0.08;
    const bx = x + margin;
    const by = y + margin;
    const bsize = size - margin * 2;
    const radius = 4;

    if (onGoal) {
      // ゴール格納時の黄金木箱
      ctx.shadowColor = '#fbbf24';
      ctx.shadowBlur = 10;

      // ベースグラデーション
      const grad = ctx.createLinearGradient(bx, by, bx + bsize, by + bsize);
      grad.addColorStop(0, '#fef08a');
      grad.addColorStop(0.5, '#f59e0b');
      grad.addColorStop(1, '#b45309');
      ctx.fillStyle = grad;
      this.drawRoundRect(ctx, bx, by, bsize, bsize, radius);
      ctx.fill();

      // 枠線
      ctx.strokeStyle = '#fef08a';
      ctx.lineWidth = 2;
      this.drawRoundRect(ctx, bx, by, bsize, bsize, radius);
      ctx.stroke();

      // 中央の星マーク 🌟
      ctx.fillStyle = '#ffffff';
      ctx.font = `bold ${Math.floor(bsize * 0.5)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('★', bx + bsize / 2, by + bsize / 2);
    } else {
      // 通常のウッドコンテナ
      ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
      ctx.shadowBlur = 6;
      ctx.shadowOffsetY = 3;

      // ウッドベース
      const grad = ctx.createLinearGradient(bx, by, bx, by + bsize);
      grad.addColorStop(0, '#d97706');
      grad.addColorStop(1, '#92400e');
      ctx.fillStyle = grad;
      this.drawRoundRect(ctx, bx, by, bsize, bsize, radius);
      ctx.fill();

      // 外枠
      ctx.strokeStyle = '#78350f';
      ctx.lineWidth = 2;
      this.drawRoundRect(ctx, bx, by, bsize, bsize, radius);
      ctx.stroke();

      // 木箱のX型補強バンド
      ctx.strokeStyle = '#b45309';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(bx + 4, by + 4);
      ctx.lineTo(bx + bsize - 4, by + bsize - 4);
      ctx.moveTo(bx + bsize - 4, by + 4);
      ctx.lineTo(bx + 4, by + bsize - 4);
      ctx.stroke();

      // 内枠
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 1;
      this.drawRoundRect(ctx, bx + 3, by + 3, bsize - 6, bsize - 6, 2);
      ctx.stroke();
    }

    ctx.restore();
  }

  // プレイヤーキャラクター描画
  drawPlayer(ctx, x, y, size, dir) {
    ctx.save();
    const cx = x + size / 2;
    const cy = y + size / 2;
    const r = size * 0.38;

    // 影
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.beginPath();
    ctx.ellipse(cx, y + size * 0.88, r * 0.9, r * 0.35, 0, 0, Math.PI * 2);
    ctx.fill();

    // 体・ヘルメット（鮮やかなシアンブルー）
    const bodyGrad = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.3, r * 0.1, cx, cy, r);
    bodyGrad.addColorStop(0, '#38bdf8');
    bodyGrad.addColorStop(0.7, '#0284c7');
    bodyGrad.addColorStop(1, '#0369a1');
    ctx.fillStyle = bodyGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();

    // ヘルメットつば/バイザー
    ctx.strokeStyle = '#bae6fd';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();

    // 目線（向きに応じたバイザー/瞳）
    let eyeOffsetX = 0;
    let eyeOffsetY = 0;
    if (dir === 'right') eyeOffsetX = r * 0.35;
    else if (dir === 'left') eyeOffsetX = -r * 0.35;
    else if (dir === 'up') eyeOffsetY = -r * 0.35;
    else if (dir === 'down') eyeOffsetY = r * 0.25;

    // バイザー（ゴーグル）
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.ellipse(cx + eyeOffsetX, cy + eyeOffsetY, r * 0.45, r * 0.25, 0, 0, Math.PI * 2);
    ctx.fill();

    // バイザーのハイライト
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.arc(cx + eyeOffsetX - 2, cy + eyeOffsetY - 1, 2.5, 0, Math.PI * 2);
    if (dir !== 'left') {
      ctx.arc(cx + eyeOffsetX + 3, cy + eyeOffsetY - 1, 2.5, 0, Math.PI * 2);
    }
    ctx.fill();

    ctx.restore();
  }

  // 角丸四角形ユーティリティ
  drawRoundRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }

  // ==========================================
  // 6. イベントリスナー・操作ハンドリング
  // ==========================================
  initEvents() {
    // 1. キーボード操作
    window.addEventListener('keydown', (e) => {
      // 矢印キーやスペースによる画面スクロールを防止
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
        e.preventDefault();
      }

      switch (e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          this.tryMove(0, -1);
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          this.tryMove(0, 1);
          break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
          this.tryMove(-1, 0);
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          this.tryMove(1, 0);
          break;
        case 'z':
        case 'Z':
        case 'u':
        case 'U':
        case 'Backspace':
          this.undo();
          break;
        case 'r':
        case 'R':
          this.resetStage();
          break;
      }
    });

    // 2. D-Pad ボタン操作（タッチ＆クリック対応）
    const dpadButtons = document.querySelectorAll('.dpad-btn');
    dpadButtons.forEach(btn => {
      const handleDpad = (e) => {
        e.preventDefault();
        const dir = btn.dataset.dir;
        if (dir === 'up') this.tryMove(0, -1);
        else if (dir === 'down') this.tryMove(0, 1);
        else if (dir === 'left') this.tryMove(-1, 0);
        else if (dir === 'right') this.tryMove(1, 0);
      };

      btn.addEventListener('touchstart', handleDpad, { passive: false });
      btn.addEventListener('mousedown', handleDpad);
    });

    // 3. スワイプ操作 (Canvas上)
    let touchStartX = 0;
    let touchStartY = 0;
    let touchMoved = false;

    this.canvas.addEventListener('touchstart', (e) => {
      if (e.touches.length > 0) {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
        touchMoved = false;
      }
    }, { passive: true });

    this.canvas.addEventListener('touchmove', (e) => {
      if (touchMoved) return;
      if (e.touches.length > 0) {
        const dx = e.touches[0].clientX - touchStartX;
        const dy = e.touches[0].clientY - touchStartY;
        const minSwipe = 25;

        if (Math.abs(dx) > minSwipe || Math.abs(dy) > minSwipe) {
          touchMoved = true;
          if (Math.abs(dx) > Math.abs(dy)) {
            this.tryMove(dx > 0 ? 1 : -1, 0);
          } else {
            this.tryMove(0, dy > 0 ? 1 : -1);
          }
        }
      }
    }, { passive: true });

    // 4. アクションボタン
    this.undoBtn.addEventListener('click', () => this.undo());
    this.resetBtn.addEventListener('click', () => this.resetStage());

    // 5. ステージセレクトプルダウン
    this.stageSelect.addEventListener('change', (e) => {
      this.loadStage(parseInt(e.target.value, 10));
    });

    // 6. オーバーレイボタン
    this.nextStageBtn.addEventListener('click', () => {
      this.loadStage(this.currentStageIndex + 1);
    });

    this.retryStageBtn.addEventListener('click', () => {
      this.loadStage(this.currentStageIndex);
    });

    this.allClearRestartBtn.addEventListener('click', () => {
      this.loadStage(0);
    });
  }
}

// ゲームインスタンス起動
window.addEventListener('DOMContentLoaded', () => {
  new SokobanGame();
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
