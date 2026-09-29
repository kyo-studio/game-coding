/**
 * ========================================================
 * 12 フロッガー風 (Frogger) - JavaScript
 * ========================================================
 * このファイルでは、以下の重要プログラミング知識を学びます：
 * 1. グリッドジャンプ（1マス跳躍）とアニメーション補間
 * 2. 多層レーン（Multi-Lane Traffic）のデータ駆動設計
 * 3. 移動床（丸太）への相対速度追従力学 (Riding Physics: player.x += speed)
 * 4. 水域と安全オブジェクトの排他衝突判定（水没ロジック）
 * 5. 複数ゴール（5箇所）の配列管理とステージクリア遷移
 * 6. スマホ実機スクロール完全防止とLocalStorage保存
 */

// ==========================================
// 1. Canvasの初期化とグリッド定数
// ==========================================
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const GRID_SIZE = 36; // 1マスのサイズ (36px)
const COLS = 11;      // 横11マス (11 * 36 = 396px)
const ROWS = 13;      // 縦13マス (13 * 36 = 468px)

const CANVAS_WIDTH = canvas.width;   // 396
const CANVAS_HEIGHT = canvas.height; // 468
const MAX_TIME = 600; // 制限時間（フレーム数: 約20秒）

// ==========================================
// 2. DOM要素の取得
// ==========================================
const scoreDisplay = document.getElementById("score-display");
const livesDisplay = document.getElementById("lives-display");
const levelDisplay = document.getElementById("level-display");
const bestScoreDisplay = document.getElementById("best-score-display");
const timeBar = document.getElementById("time-bar");
const startOverlay = document.getElementById("start-overlay");
const clearOverlay = document.getElementById("clear-overlay");
const gameoverOverlay = document.getElementById("gameover-overlay");
const startBtn = document.getElementById("start-btn");
const nextLevelBtn = document.getElementById("next-level-btn");
const restartBtn = document.getElementById("restart-btn");
const finalScoreEl = document.getElementById("final-score");
const finalLevelEl = document.getElementById("final-level");
const newRecordBadge = document.getElementById("new-record-badge");
const dpadButtons = document.querySelectorAll(".dpad-btn");

// ==========================================
// 3. ゲームの状態変数
// ==========================================
let isRunning = false;
let score = 0;
let lives = 3;
let level = 1;
let bestScore = 0;
let timeRemaining = MAX_TIME;

// ゴール穴の管理（5箇所: [2, 4, 6, 8, 10]列目）
const GOAL_COLUMNS = [1, 3, 5, 7, 9];
let goalsFilled = [false, false, false, false, false];

// エンティティ
let player = null;
let lanes = [];
let particles = [];

// ==========================================
// 4. クラス定義（プレイヤー・レーン・障害物）
// ==========================================

/**
 * プレイヤークラス（カエル）
 */
class Frog {
  constructor() {
    this.resetPosition();
    this.width = 28;
    this.height = 28;
    this.scale = 1.0;
  }

  resetPosition() {
    this.gridX = 5;  // 中央の列
    this.gridY = 12; // 最下段（スタート地点）
    this.x = this.gridX * GRID_SIZE + (GRID_SIZE - 28) / 2;
    this.y = this.gridY * GRID_SIZE + (GRID_SIZE - 28) / 2;
    this.facing = "UP";
    this.isHopping = false;
  }

  // 1マスジャンプ移動
  move(dir) {
    if (!isRunning || this.isHopping) return;

    this.facing = dir;
    let nextGridX = this.gridX;
    let nextGridY = this.gridY;

    if (dir === "UP" && nextGridY > 0) nextGridY--;
    if (dir === "DOWN" && nextGridY < ROWS - 1) nextGridY++;
    if (dir === "LEFT" && nextGridX > 0) nextGridX--;
    if (dir === "RIGHT" && nextGridX < COLS - 1) nextGridX++;

    // 前進した場合はスコア加算 (+10点)
    if (dir === "UP" && nextGridY < this.gridY) {
      score += 10;
      scoreDisplay.textContent = score;
    }

    this.gridX = nextGridX;
    this.gridY = nextGridY;
    this.x = this.gridX * GRID_SIZE + (GRID_SIZE - this.width) / 2;
    this.y = this.gridY * GRID_SIZE + (GRID_SIZE - this.height) / 2;

    // ジャンプ時のピョンという伸縮演出
    this.scale = 1.3;
    createJumpParticles(this.x + 14, this.y + 14);
  }

  update() {
    // 伸縮スケールを徐々に 1.0 に戻す
    this.scale += (1.0 - this.scale) * 0.2;
  }

  draw() {
    ctx.save();
    ctx.translate(this.x + 14, this.y + 14);
    ctx.scale(this.scale, this.scale);

    // 向きに応じた回転
    if (this.facing === "DOWN") ctx.rotate(Math.PI);
    if (this.facing === "LEFT") ctx.rotate(-Math.PI / 2);
    if (this.facing === "RIGHT") ctx.rotate(Math.PI / 2);

    // カエルの体（緑色）
    ctx.fillStyle = "#22c55e";
    ctx.beginPath();
    ctx.ellipse(0, 0, 11, 10, 0, 0, Math.PI * 2);
    ctx.fill();

    // 目（左右の丸）
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(-7, -7, 4, 0, Math.PI * 2);
    ctx.arc(7, -7, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#0f172a";
    ctx.beginPath();
    ctx.arc(-7, -8, 2, 0, Math.PI * 2);
    ctx.arc(7, -8, 2, 0, Math.PI * 2);
    ctx.fill();

    // 手足（4つの小さな丸）
    ctx.fillStyle = "#16a34a";
    ctx.beginPath();
    ctx.arc(-11, -5, 3.5, 0, Math.PI * 2); // 左手
    ctx.arc(11, -5, 3.5, 0, Math.PI * 2);  // 右手
    ctx.arc(-11, 8, 4, 0, Math.PI * 2);    // 左足
    ctx.arc(11, 8, 4, 0, Math.PI * 2);     // 右足
    ctx.fill();

    ctx.restore();
  }
}

/**
 * 障害物 / 移動床クラス（車・トラック・丸太・カメ）
 */
class Obstacle {
  constructor(x, y, width, height, speed, type) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.speed = speed;
    this.type = type; // "car" | "truck" | "log" | "turtle"
  }

  update() {
    this.x += this.speed;

    // 画面外に出たら反対側からループ出現
    if (this.speed > 0 && this.x > CANVAS_WIDTH + 20) {
      this.x = -this.width - 20;
    } else if (this.speed < 0 && this.x + this.width < -20) {
      this.x = CANVAS_WIDTH + 20;
    }
  }

  draw() {
    ctx.save();
    if (this.type === "car") {
      // 普通車（赤）
      ctx.fillStyle = "#ef4444";
      drawRoundedRect(this.x, this.y + 4, this.width, this.height - 8, 5);
      // 窓
      ctx.fillStyle = "#38bdf8";
      ctx.fillRect(this.speed > 0 ? this.x + this.width - 12 : this.x + 4, this.y + 7, 8, this.height - 14);
    } else if (this.type === "racecar") {
      // スポーツカー（黄）
      ctx.fillStyle = "#f59e0b";
      drawRoundedRect(this.x, this.y + 5, this.width, this.height - 10, 6);
    } else if (this.type === "truck") {
      // トラック（青）
      ctx.fillStyle = "#3b82f6";
      drawRoundedRect(this.x, this.y + 3, this.width, this.height - 6, 4);
    } else if (this.type === "log") {
      // 丸太（茶色）
      ctx.fillStyle = "#92400e";
      ctx.strokeStyle = "#78350f";
      ctx.lineWidth = 2;
      drawRoundedRect(this.x, this.y + 4, this.width, this.height - 8, 8);
      ctx.stroke();
    } else if (this.type === "turtle") {
      // カメ（緑の甲羅が2〜3連）
      const count = Math.floor(this.width / 26);
      ctx.fillStyle = "#059669";
      for (let i = 0; i < count; i++) {
        ctx.beginPath();
        ctx.arc(this.x + 13 + i * 26, this.y + this.height / 2, 10, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }
}

/**
 * レーン（行）管理クラス
 */
class Lane {
  constructor(row, type, speed, count, obsWidth, obsType) {
    this.row = row;
    this.y = row * GRID_SIZE;
    this.type = type; // "road" | "water" | "safe" | "goal"
    this.speed = speed;
    this.obstacles = [];

    if (count > 0) {
      const spacing = (CANVAS_WIDTH + 80) / count;
      for (let i = 0; i < count; i++) {
        const x = i * spacing + (Math.random() * 20);
        this.obstacles.push(new Obstacle(x, this.y, obsWidth, GRID_SIZE, speed, obsType));
      }
    }
  }

  update() {
    this.obstacles.forEach(obs => obs.update());
  }

  draw() {
    this.obstacles.forEach(obs => obs.draw());
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

/**
 * パーティクルクラス
 */
class Particle {
  constructor(x, y, color) {
    this.x = x;
    this.y = y;
    this.color = color;
    this.radius = Math.random() * 3 + 1.5;
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 3 + 1;
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

function createJumpParticles(x, y) {
  for (let i = 0; i < 4; i++) {
    particles.push(new Particle(x, y, "#86efac"));
  }
}

function createSplashParticles(x, y) {
  for (let i = 0; i < 16; i++) {
    particles.push(new Particle(x, y, "#38bdf8"));
  }
}

function createCrashParticles(x, y) {
  for (let i = 0; i < 16; i++) {
    particles.push(new Particle(x, y, "#ef4444"));
  }
}

// ==========================================
// 5. ベスト記録の読み込みと保存 (LocalStorage)
// ==========================================
function loadBestScore() {
  const saved = localStorage.getItem("frogger_best_score");
  if (saved !== null) {
    bestScore = parseInt(saved, 10);
    bestScoreDisplay.textContent = bestScore;
  }
}

function checkAndUpdateBestScore() {
  if (score > bestScore) {
    bestScore = score;
    localStorage.setItem("frogger_best_score", bestScore);
    bestScoreDisplay.textContent = bestScore;
    return true; // 新記録
  }
  return false;
}

// ==========================================
// 6. ゲームの初期化とレーン構築
// ==========================================
function setupLanes() {
  const speedMult = ( 1 + (level - 1) * 0.2 ) * 0.5; // レベルアップで速度上昇
  lanes = [];

  // 行 0: ゴールエリア
  lanes.push(new Lane(0, "goal", 0, 0, 0, null));

  // 行 1〜5: 川エリア（水域 & 丸太/カメ）
  lanes.push(new Lane(1, "water", -1.4 * speedMult, 3, 90, "log"));     // 上段丸太（左）
  lanes.push(new Lane(2, "water", 1.8 * speedMult, 2, 120, "log"));     // 中段大丸太（右）
  lanes.push(new Lane(3, "water", -1.6 * speedMult, 3, 52, "turtle"));  // カメ（左）
  lanes.push(new Lane(4, "water", 1.2 * speedMult, 3, 75, "log"));      // 丸太（右）
  lanes.push(new Lane(5, "water", -2.0 * speedMult, 3, 52, "turtle"));  // 高速カメ（左）

  // 行 6: 中間セーフゾーン（草地）
  lanes.push(new Lane(6, "safe", 0, 0, 0, null));

  // 行 7〜11: 道路エリア（車道 & 各種車両）
  lanes.push(new Lane(7, "road", -2.2 * speedMult, 2, 44, "racecar"));  // 高速スポーツカー（左）
  lanes.push(new Lane(8, "road", 1.5 * speedMult, 3, 40, "car"));       // 普通車（右）
  lanes.push(new Lane(9, "road", -1.8 * speedMult, 3, 40, "car"));      // 普通車（左）
  lanes.push(new Lane(10, "road", 2.4 * speedMult, 1, 40, "racecar"));  // 超高速車（右）
  lanes.push(new Lane(11, "road", -1.2 * speedMult, 2, 60, "truck"));   // トラック（左）

  // 行 12: スタートエリア（草地）
  lanes.push(new Lane(12, "safe", 0, 0, 0, null));
}

function initGame() {
  player = new Frog();
  score = 0;
  lives = 3;
  level = 1;
  goalsFilled = [false, false, false, false, false];
  timeRemaining = MAX_TIME;
  particles = [];

  scoreDisplay.textContent = "0";
  levelDisplay.textContent = "1";
  updateLivesUI();
  setupLanes();
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

function startNextLevel() {
  level++;
  levelDisplay.textContent = level;
  goalsFilled = [false, false, false, false, false];
  timeRemaining = MAX_TIME;
  player.resetPosition();
  setupLanes();

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
  // 1. タイマーの減衰
  timeRemaining -= 0.5;
  timeBar.style.width = `${Math.max(0, (timeRemaining / MAX_TIME) * 100)}%`;
  if (timeRemaining <= 0) {
    handleDeath("時間切れ！");
    return;
  }

  // 2. レーン・障害物の更新
  lanes.forEach(lane => lane.update());
  player.update();

  // 3. パーティクルの更新
  particles.forEach(p => p.update());
  particles = particles.filter(p => p.alpha > 0);

  // 4. 【現在の行（レーン）に応じた当たり判定・力学】
  const currentLane = lanes[player.gridY];

  if (currentLane.type === "road") {
    // 【車道エリア】: 車とのAABB衝突判定
    const isHit = currentLane.obstacles.some(car => {
      return (
        player.x < car.x + car.width &&
        player.x + player.width > car.x &&
        player.y < car.y + car.height &&
        player.y + player.height > car.y
      );
    });

    if (isHit) {
      createCrashParticles(player.x + 14, player.y + 14);
      handleDeath("車に激突しました！");
      return;
    }
  } else if (currentLane.type === "water") {
    // 【川エリア】: 丸太・カメに乗っているか判定
    let ridingPlatform = null;

    currentLane.obstacles.forEach(plat => {
      if (
        player.x + player.width * 0.5 > plat.x &&
        player.x + player.width * 0.5 < plat.x + plat.width
      ) {
        ridingPlatform = plat;
      }
    });

    if (ridingPlatform) {
      // 【移動床への追従力学】: 丸太と同じ速度でカエルを運ぶ
      player.x += ridingPlatform.speed;
      player.gridX = Math.round(player.x / GRID_SIZE);

      // 画面外（左右の壁）に流されたら死亡
      if (player.x < -10 || player.x + player.width > CANVAS_WIDTH + 10) {
        createSplashParticles(player.x + 14, player.y + 14);
        handleDeath("画面外に流されました！");
        return;
      }
    } else {
      // 水の上に落ちた（水没死）
      createSplashParticles(player.x + 14, player.y + 14);
      handleDeath("川に水没しました！");
      return;
    }
  } else if (currentLane.type === "goal") {
    // 【ゴールエリア】: 5箇所のゴール穴の判定
    let landedInGoal = false;

    GOAL_COLUMNS.forEach((colIndex, goalIdx) => {
      const goalX = colIndex * GRID_SIZE;
      if (
        Math.abs(player.x - goalX) < 18 &&
        !goalsFilled[goalIdx]
      ) {
        // ゴール成功！
        goalsFilled[goalIdx] = true;
        score += 200 + Math.floor(timeRemaining); // 残り時間ボーナス
        scoreDisplay.textContent = score;
        landedInGoal = true;
        createJumpParticles(player.x + 14, player.y + 14);
      }
    });

    if (landedInGoal) {
      // すべてのゴールが埋まったか判定
      const isAllFilled = goalsFilled.every(f => f === true);
      if (isAllFilled) {
        handleStageClear();
      } else {
        // 次のカエルを発進
        player.resetPosition();
        timeRemaining = MAX_TIME;
      }
    } else {
      // ゴール穴以外の壁に激突
      handleDeath("ゴール以外の壁に激突！");
    }
  }
}

// 死亡時の処理（残機減少またはゲームオーバー）
function handleDeath(reason) {
  lives--;
  updateLivesUI();

  if (lives <= 0) {
    handleGameOver();
  } else {
    // 残機がある場合は初期位置からリスポーン
    player.resetPosition();
    timeRemaining = MAX_TIME;
  }
}

function handleStageClear() {
  isRunning = false;
  score += 1000; // ステージクリアボーナス
  scoreDisplay.textContent = score;
  checkAndUpdateBestScore();
  clearOverlay.classList.remove("hidden");
}

function handleGameOver() {
  isRunning = false;
  const isNewRecord = checkAndUpdateBestScore();

  finalScoreEl.textContent = score;
  finalLevelEl.textContent = level;

  if (isNewRecord) {
    newRecordBadge.classList.remove("hidden");
  } else {
    newRecordBadge.classList.add("hidden");
  }

  gameoverOverlay.classList.remove("hidden");
}

function updateLivesUI() {
  let hearts = "";
  for (let i = 0; i < lives; i++) hearts += "❤️";
  livesDisplay.textContent = hearts || "💀";
}

// ==========================================
// 9. 描画処理 (Draw)
// ==========================================
function draw() {
  // 1. 画面クリア
  ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  // 2. 背景エリア（川・道路・草地）の描画
  drawBackgroundAreas();

  // 3. レーン障害物（車・丸太）の描画
  lanes.forEach(lane => lane.draw());

  // 4. ゴール穴＆達成フラグの描画
  drawGoals();

  // 5. パーティクルの描画
  particles.forEach(p => p.draw());

  // 6. プレイヤー（カエル）の描画
  if (player && lives > 0) {
    player.draw();
  }
}

// 背景マップの描画
function drawBackgroundAreas() {
  // 1. ゴールヘッダー草地 (Row 0)
  ctx.fillStyle = "#15803d";
  ctx.fillRect(0, 0, CANVAS_WIDTH, GRID_SIZE);

  // 2. 川エリア (Row 1〜5)
  ctx.fillStyle = "#0369a1";
  ctx.fillRect(0, 1 * GRID_SIZE, CANVAS_WIDTH, 5 * GRID_SIZE);

  // 3. 中間セーフゾーン草地 (Row 6)
  ctx.fillStyle = "#15803d";
  ctx.fillRect(0, 6 * GRID_SIZE, CANVAS_WIDTH, GRID_SIZE);

  // 4. 車道エリア (Row 7〜11)
  ctx.fillStyle = "#1e293b";
  ctx.fillRect(0, 7 * GRID_SIZE, CANVAS_WIDTH, 5 * GRID_SIZE);

  // 車道の白破線
  ctx.strokeStyle = "rgba(255, 255, 255, 0.35)";
  ctx.lineWidth = 1.5;
  ctx.setLineDash([8, 8]);
  for (let r = 8; r <= 11; r++) {
    ctx.beginPath();
    ctx.moveTo(0, r * GRID_SIZE);
    ctx.lineTo(CANVAS_WIDTH, r * GRID_SIZE);
    ctx.stroke();
  }
  ctx.setLineDash([]); // 戻す

  // 5. スタートエリア草地 (Row 12)
  ctx.fillStyle = "#15803d";
  ctx.fillRect(0, 12 * GRID_SIZE, CANVAS_WIDTH, GRID_SIZE);
}

// ゴール穴と救出済みカエルの描画
function drawGoals() {
  GOAL_COLUMNS.forEach((colIndex, idx) => {
    const x = colIndex * GRID_SIZE;
    const y = 4;
    const size = GRID_SIZE - 8;

    // ゴール穴（暗い水場）
    ctx.fillStyle = "#0284c7";
    drawRoundedRect(x + 2, y, size + 4, size, 4);

    if (goalsFilled[idx]) {
      // 救出済みカエルのアイコン
      ctx.font = "18px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("🐸", x + GRID_SIZE / 2, y + size / 2);
    } else {
      // 空きゴールの旗マーク
      ctx.font = "14px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("🏆", x + GRID_SIZE / 2, y + size / 2);
    }
  });
}

// ==========================================
// 10. イベントリスナー（キーボード・スワイプ・D-Pad）
// ==========================================

// キーボード操作
window.addEventListener("keydown", (e) => {
  if (!isRunning) {
    if (e.code === "Space" || e.code === "Enter") {
      if (!startOverlay.classList.contains("hidden")) startGame();
    }
    return;
  }

  switch (e.code) {
    case "ArrowUp":
    case "KeyW":
      player.move("UP");
      e.preventDefault();
      break;
    case "ArrowDown":
    case "KeyS":
      player.move("DOWN");
      e.preventDefault();
      break;
    case "ArrowLeft":
    case "KeyA":
      player.move("LEFT");
      e.preventDefault();
      break;
    case "ArrowRight":
    case "KeyD":
      player.move("RIGHT");
      e.preventDefault();
      break;
  }
});

// バーチャル十字キー（D-Pad）操作
dpadButtons.forEach(btn => {
  btn.addEventListener("touchstart", (e) => {
    e.preventDefault();
    const dir = btn.dataset.dir;
    if (dir && player) player.move(dir);
  }, { passive: false });

  btn.addEventListener("mousedown", (e) => {
    e.preventDefault();
    const dir = btn.dataset.dir;
    if (dir && player) player.move(dir);
  });
});

// タッチスワイプ検出
let touchStartX = 0;
let touchStartY = 0;

canvas.addEventListener("touchstart", (e) => {
  e.preventDefault();
  if (e.touches.length > 0) {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
  }
}, { passive: false });

canvas.addEventListener("touchmove", (e) => {
  e.preventDefault();
}, { passive: false });

canvas.addEventListener("touchend", (e) => {
  e.preventDefault();
  if (e.changedTouches.length === 0 || !player) return;

  const dx = e.changedTouches[0].clientX - touchStartX;
  const dy = e.changedTouches[0].clientY - touchStartY;
  const minSwipeDistance = 20;

  if (Math.abs(dx) > Math.abs(dy)) {
    if (Math.abs(dx) > minSwipeDistance) {
      player.move(dx > 0 ? "RIGHT" : "LEFT");
    }
  } else {
    if (Math.abs(dy) > minSwipeDistance) {
      player.move(dy > 0 ? "DOWN" : "UP");
    }
  }
}, { passive: false });

// スタート・次レベル・リトライボタン
startBtn.addEventListener("click", startGame);
nextLevelBtn.addEventListener("click", startNextLevel);
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
