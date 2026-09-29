/**
 * ========================================================
 * 08 フルーツキャッチ (Fruit Catch) - JavaScript
 * ========================================================
 * このファイルでは、以下のゲームプログラミング知識を学びます：
 * 1. 落下物理（重力加速度: vy += gravity, y += vy）
 * 2. AABB（Axis-Aligned Bounding Box）矩形衝突判定アルゴリズム
 * 3. 浮遊スコアテキスト（Floating Text）システムの実装
 * 4. コンボ倍率とライフ制ゲームループの設計
 * 5. カゴの弾力アニメーション（Squash & Stretch）
 * 6. スマホ実機タッチ操作時のスクロール完全防止
 * 7. LocalStorageによるハイスコア・最大コンボ記録保存
 */

// ==========================================
// 1. Canvasの初期化とコンテキスト取得
// ==========================================
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const CANVAS_WIDTH = canvas.width;   // 500
const CANVAS_HEIGHT = canvas.height; // 600

// ==========================================
// 2. フルーツ・アイテムの種類定義
// ==========================================
const ITEM_TYPES = [
  { type: "apple",     icon: "🍎", score: 10,  weight: 35, speed: 3.0, size: 24 },
  { type: "banana",    icon: "🍌", score: 20,  weight: 25, speed: 3.4, size: 24 },
  { type: "strawberry",icon: "🍓", score: 30,  weight: 20, speed: 3.8, size: 22 },
  { type: "watermelon",icon: "🍉", score: 50,  weight: 10, speed: 2.6, size: 30 },
  { type: "pineapple", icon: "🍍", score: 100, weight: 5,  speed: 4.5, size: 26 },
  { type: "bomb",      icon: "💣", score: -50, weight: 15, speed: 3.2, size: 24, isBomb: true }
];

// ==========================================
// 3. DOM要素の取得
// ==========================================
const scoreDisplay = document.getElementById("score-display");
const comboDisplay = document.getElementById("combo-display");
const livesContainer = document.getElementById("lives-container");
const bestScoreDisplay = document.getElementById("best-score-display");
const startOverlay = document.getElementById("start-overlay");
const gameoverOverlay = document.getElementById("gameover-overlay");
const startBtn = document.getElementById("start-btn");
const restartBtn = document.getElementById("restart-btn");
const finalScoreEl = document.getElementById("final-score");
const finalComboEl = document.getElementById("final-combo");
const newRecordBadge = document.getElementById("new-record-badge");

// ==========================================
// 4. ゲームの状態変数
// ==========================================
let isRunning = false;
let isPaused = false;
let score = 0;
let combo = 0;
let maxCombo = 0;
let lives = 3;
let bestScore = 0;
let lastTimestamp = 0;

// エンティティ配列
let basket = null;
let fallingItems = [];
let particles = [];
let floatingTexts = [];

// スポーンタイマー
let spawnTimer = 0;
let spawnInterval = 50; // フレーム単位の出現間隔（徐々に短くなる）
let gameTime = 0;

// キーボード入力管理
const keys = {
  ArrowLeft: false,
  ArrowRight: false,
  KeyA: false,
  KeyD: false
};

// ==========================================
// 5. クラス定義（カゴ・落下物・テキスト・パーティクル）
// ==========================================

/**
 * カゴ（バスケット）クラス
 */
class Basket {
  constructor() {
    this.width = 80;
    this.height = 36;
    this.x = (CANVAS_WIDTH - this.width) / 2;
    this.y = CANVAS_HEIGHT - 60;
    this.speed = 7.5;
    this.scaleX = 1;
    this.scaleY = 1;
  }

  update() {
    // キーボード左右移動
    if (keys.ArrowLeft || keys.KeyA) {
      this.x -= this.speed;
    }
    if (keys.ArrowRight || keys.KeyD) {
      this.x += this.speed;
    }

    // 画面端の壁判定（はみ出し防止）
    this.x = Math.max(0, Math.min(CANVAS_WIDTH - this.width, this.x));

    // キャッチ時の弾力アニメーション減衰（元の比率へ戻す）
    this.scaleX += (1 - this.scaleX) * 0.15;
    this.scaleY += (1 - this.scaleY) * 0.15;
  }

  // キャッチした時のポヨンとした伸縮効果
  squash() {
    this.scaleX = 1.25;
    this.scaleY = 0.75;
  }

  draw() {
    ctx.save();
    // カゴの中心を原点にして伸縮
    const centerX = this.x + this.width / 2;
    const centerY = this.y + this.height / 2;
    ctx.translate(centerX, centerY);
    ctx.scale(this.scaleX, this.scaleY);
    ctx.translate(-centerX, -centerY);

    // カゴ本体（編み目風の茶色いグラデーション）
    const grad = ctx.createLinearGradient(this.x, this.y, this.x, this.y + this.height);
    grad.addColorStop(0, "#d97706");
    grad.addColorStop(1, "#92400e");

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.roundRect(this.x, this.y, this.width, this.height, [0, 0, 16, 16]);
    ctx.fill();

    // カゴの縁（フチ）
    ctx.fillStyle = "#b45309";
    ctx.beginPath();
    ctx.roundRect(this.x - 4, this.y - 4, this.width + 8, 8, 4);
    ctx.fill();

    // 編み目模様
    ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
    ctx.lineWidth = 2;
    for (let i = 12; i < this.width; i += 14) {
      ctx.beginPath();
      ctx.moveTo(this.x + i, this.y);
      ctx.lineTo(this.x + i, this.y + this.height);
      ctx.stroke();
    }

    ctx.restore();
  }

  // AABB判定用のバウンディングボックスを取得
  getBounds() {
    return {
      left: this.x,
      right: this.x + this.width,
      top: this.y,
      bottom: this.y + this.height
    };
  }
}

/**
 * 落下物（フルーツ・爆弾）クラス
 */
class FallingItem {
  constructor(data, speedMultiplier) {
    this.type = data.type;
    this.icon = data.icon;
    this.score = data.score;
    this.size = data.size;
    this.isBomb = data.isBomb || false;

    // 画面上部のランダムなX座標からスポーン
    this.x = Math.random() * (CANVAS_WIDTH - this.size * 2) + this.size;
    this.y = -this.size;
    this.vy = data.speed * speedMultiplier;
    this.gravity = 0.05; // わずかな重力加速度
    this.rotation = (Math.random() - 0.5) * 0.5; // 回転角
    this.rotSpeed = (Math.random() - 0.5) * 0.04;
  }

  update() {
    this.vy += this.gravity;
    this.y += this.vy;
    this.rotation += this.rotSpeed;
  }

  draw() {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);
    ctx.font = `${this.size * 1.5}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    if (this.isBomb) {
      ctx.shadowColor = "#ef4444";
      ctx.shadowBlur = 10;
    }

    ctx.fillText(this.icon, 0, 0);
    ctx.restore();
  }

  // AABB判定用のバウンディングボックスを取得
  getBounds() {
    const half = this.size * 0.75;
    return {
      left: this.x - half,
      right: this.x + half,
      top: this.y - half,
      bottom: this.y + half
    };
  }
}

/**
 * 浮遊スコアテキスト（Floating Text）クラス
 */
class FloatingText {
  constructor(text, x, y, color) {
    this.text = text;
    this.x = x;
    this.y = y;
    this.color = color;
    this.alpha = 1;
    this.vy = -1.8; // 上に登る速度
  }

  update() {
    this.y += this.vy;
    this.alpha -= 0.025; // 徐々にフェードアウト
  }

  draw() {
    ctx.save();
    ctx.globalAlpha = Math.max(0, this.alpha);
    ctx.font = "bold 18px -apple-system, sans-serif";
    ctx.fillStyle = this.color;
    ctx.textAlign = "center";
    ctx.shadowColor = "rgba(0, 0, 0, 0.6)";
    ctx.shadowBlur = 4;
    ctx.fillText(this.text, this.x, this.y);
    ctx.restore();
  }
}

/**
 * フルーツ果汁パーティクルクラス
 */
class Particle {
  constructor(x, y, color) {
    this.x = x;
    this.y = y;
    this.color = color;
    this.radius = Math.random() * 3 + 2;
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 5 + 2;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed - 1.5; // やや上方向に飛び散る
    this.alpha = 1;
    this.decay = Math.random() * 0.04 + 0.03;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.vy += 0.1; // 重力で落ちる
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

// ==========================================
// 6. AABB（矩形同士）衝突判定関数
// ==========================================
/**
 * 2つの矩形バウンディングボックスが交差しているか判定
 */
function checkAABBCollision(boxA, boxB) {
  return (
    boxA.left < boxB.right &&
    boxA.right > boxB.left &&
    boxA.top < boxB.bottom &&
    boxA.bottom > boxB.top
  );
}

// ==========================================
// 7. ベスト記録の読み込みと保存 (LocalStorage)
// ==========================================
function loadBestScore() {
  const saved = localStorage.getItem("fruit_catch_best_score");
  if (saved !== null) {
    bestScore = parseInt(saved, 10);
    bestScoreDisplay.textContent = bestScore;
  }
}

function checkAndUpdateBestScore() {
  if (score > bestScore) {
    bestScore = score;
    localStorage.setItem("fruit_catch_best_score", bestScore);
    bestScoreDisplay.textContent = bestScore;
    return true; // 新記録
  }
  return false;
}

// ==========================================
// 8. ゲームの初期化と開始
// ==========================================
function initGame() {
  basket = new Basket();
  fallingItems = [];
  particles = [];
  floatingTexts = [];

  score = 0;
  combo = 0;
  maxCombo = 0;
  lives = 3;
  gameTime = 0;
  spawnTimer = 0;
  spawnInterval = 50;

  scoreDisplay.textContent = "0";
  comboDisplay.textContent = "0 COMBO";
  updateLivesUI();
  loadBestScore();
}

function startGame() {
  initGame();
  startOverlay.classList.add("hidden");
  gameoverOverlay.classList.add("hidden");

  isRunning = true;
  isPaused = false;
  lastTimestamp = performance.now();
  requestAnimationFrame(gameLoop);
}

// ==========================================
// 9. メインゲームループ (Game Loop)
// ==========================================
function gameLoop(timestamp) {
  if (!isRunning) return;

  const deltaTime = (timestamp - lastTimestamp) / 1000;
  lastTimestamp = timestamp;

  if (!isPaused) {
    update(deltaTime);
  }
  draw();

  requestAnimationFrame(gameLoop);
}

// ==========================================
// 10. 状態更新処理 (Update)
// ==========================================
function update(dt) {
  gameTime += dt;

  // 1. カゴの更新
  basket.update();

  // 2. 難易度の上昇（時間経過で落下速度とスポーン頻度アップ）
  const difficultyMultiplier = 1 + Math.min(2.0, gameTime / 40); // 最大3倍
  spawnInterval = Math.max(18, Math.round(50 / difficultyMultiplier));

  // 3. フルーツ・アイテムのスポーン
  spawnTimer++;
  if (spawnTimer >= spawnInterval) {
    spawnTimer = 0;
    spawnRandomItem(difficultyMultiplier);
  }

  // 4. 落下物の更新と衝突判定
  const basketBounds = basket.getBounds();

  for (let i = fallingItems.length - 1; i >= 0; i--) {
    const item = fallingItems[i];
    item.update();

    const itemBounds = item.getBounds();

    // 【カゴとのAABB衝突判定】
    if (checkAABBCollision(basketBounds, itemBounds)) {
      if (item.isBomb) {
        // 【爆弾キャッチ！ ライフ減少 & コンボリセット】
        handleBombHit(item);
      } else {
        // 【フルーツキャッチ成功！】
        handleFruitCatch(item);
      }
      fallingItems.splice(i, 1);
      continue;
    }

    // 【地面への落下判定（取り逃がし）】
    if (item.y > CANVAS_HEIGHT - 20) {
      if (!item.isBomb) {
        // フルーツを取り逃がした時はライフ -1 & コンボリセット
        handleFruitMiss(item);
      }
      fallingItems.splice(i, 1);
    }
  }

  // 5. 浮遊テキストとパーティクルの更新
  floatingTexts.forEach(t => t.update());
  floatingTexts = floatingTexts.filter(t => t.alpha > 0);

  particles.forEach(p => p.update());
  particles = particles.filter(p => p.alpha > 0);

  // 6. ライフ0でゲームオーバー判定
  if (lives <= 0) {
    handleGameOver();
  }
}

// ランダムなアイテムを重み付け抽選してスポーン
function spawnRandomItem(speedMultiplier) {
  const totalWeight = ITEM_TYPES.reduce((acc, cur) => acc + cur.weight, 0);
  let randomVal = Math.random() * totalWeight;

  for (const itemData of ITEM_TYPES) {
    if (randomVal < itemData.weight) {
      fallingItems.push(new FallingItem(itemData, speedMultiplier));
      return;
    }
    randomVal -= itemData.weight;
  }
}

// フルーツキャッチ成功処理
function handleFruitCatch(item) {
  combo++;
  if (combo > maxCombo) maxCombo = combo;

  // コンボ倍率の計算 (10コンボごとに倍率UP)
  const multiplier = 1 + Math.floor(combo / 5) * 0.5; // 1.0x, 1.5x, 2.0x...
  const earnedScore = Math.round(item.score * multiplier);
  score += earnedScore;

  // UI更新
  scoreDisplay.textContent = score;
  comboDisplay.textContent = `${combo} COMBO! (${multiplier.toFixed(1)}x)`;

  // カゴの弾力アニメーション
  basket.squash();

  // 浮遊スコアテキスト
  const comboText = multiplier > 1 ? ` (+${earnedScore} x${multiplier.toFixed(1)})` : ` +${earnedScore}`;
  floatingTexts.push(new FloatingText(`${item.icon}${comboText}`, item.x, basket.y - 10, "#fbbf24"));

  // 果汁パーティクル
  createParticles(item.x, basket.y, getFruitColor(item.type), 14);
}

// フルーツ取り逃がし（ミス）処理
function handleFruitMiss(item) {
  combo = 0; // コンボリセット
  comboDisplay.textContent = "0 COMBO";
  lives--;
  updateLivesUI();

  floatingTexts.push(new FloatingText("MISS ❌", item.x, CANVAS_HEIGHT - 40, "#f87171"));
}

// 爆弾ヒット処理
function handleBombHit(item) {
  combo = 0; // コンボリセット
  comboDisplay.textContent = "0 COMBO";
  lives--;
  updateLivesUI();

  // 爆発エフェクト
  createParticles(item.x, basket.y, "#ef4444", 25);
  createParticles(item.x, basket.y, "#f59e0b", 15);
  floatingTexts.push(new FloatingText("💥 BOOM! -1❤️", item.x, basket.y - 20, "#ef4444"));
}

// ライフアイコン（ハート）の表示更新
function updateLivesUI() {
  const hearts = livesContainer.querySelectorAll(".heart");
  hearts.forEach((heart, index) => {
    if (index < lives) {
      heart.classList.remove("lost");
    } else {
      heart.classList.add("lost");
    }
  });
}

// フルーツの種類に応じたパーティクル色
function getFruitColor(type) {
  switch (type) {
    case "apple": return "#ef4444";
    case "banana": return "#facc15";
    case "strawberry": return "#f43f5e";
    case "watermelon": return "#22c55e";
    case "pineapple": return "#eab308";
    default: return "#38bdf8";
  }
}

function createParticles(x, y, color, count = 15) {
  for (let i = 0; i < count; i++) {
    particles.push(new Particle(x, y, color));
  }
}

// ==========================================
// 11. 描画処理 (Draw)
// ==========================================
function draw() {
  // 画面クリア
  ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  // 芝生・地面の描画
  drawGround();

  // 落下物の描画
  fallingItems.forEach(item => item.draw());

  // パーティクルの描画
  particles.forEach(p => p.draw());

  // カゴの描画
  if (basket) {
    basket.draw();
  }

  // 浮遊テキストの描画
  floatingTexts.forEach(t => t.draw());
}

// 地面（芝生）の描画
function drawGround() {
  ctx.fillStyle = "#15803d";
  ctx.fillRect(0, CANVAS_HEIGHT - 24, CANVAS_WIDTH, 24);

  ctx.fillStyle = "#166534";
  ctx.fillRect(0, CANVAS_HEIGHT - 8, CANVAS_WIDTH, 8);
}

// ==========================================
// 12. ゲームオーバー処理
// ==========================================
function handleGameOver() {
  isRunning = false;

  const isNewRecord = checkAndUpdateBestScore();

  finalScoreEl.textContent = score;
  finalComboEl.textContent = maxCombo;

  if (isNewRecord) {
    newRecordBadge.classList.remove("hidden");
  } else {
    newRecordBadge.classList.add("hidden");
  }

  gameoverOverlay.classList.remove("hidden");
}

// ==========================================
// 13. イベントリスナーの設定（実機スクロール防止対応）
// ==========================================

// キーボード操作
window.addEventListener("keydown", (e) => {
  if (keys.hasOwnProperty(e.code)) {
    keys[e.code] = true;
    e.preventDefault(); // スクロール防止
  }

  if (e.code === "KeyP" && isRunning) {
    isPaused = !isPaused;
  }
});

window.addEventListener("keyup", (e) => {
  if (keys.hasOwnProperty(e.code)) {
    keys[e.code] = false;
    e.preventDefault();
  }
});

// マウス/タッチによるカゴのダイレクト移動
function handlePointerX(clientX) {
  if (!isRunning || !basket) return;
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const targetX = (clientX - rect.left) * scaleX - basket.width / 2;

  // 滑らかに追従
  basket.x = Math.max(0, Math.min(CANVAS_WIDTH - basket.width, targetX));
}

canvas.addEventListener("mousemove", (e) => {
  handlePointerX(e.clientX);
});

// タッチイベント（実機スクロールを完全防止）
canvas.addEventListener("touchstart", (e) => {
  e.preventDefault();
  if (e.touches.length > 0) {
    handlePointerX(e.touches[0].clientX);
  }
}, { passive: false });

canvas.addEventListener("touchmove", (e) => {
  e.preventDefault();
  if (e.touches.length > 0) {
    handlePointerX(e.touches[0].clientX);
  }
}, { passive: false });

canvas.addEventListener("touchend", (e) => {
  e.preventDefault();
}, { passive: false });

// スタート / リトライボタン
startBtn.addEventListener("click", startGame);
restartBtn.addEventListener("click", startGame);

// ==========================================
// 14. 初期実行
// ==========================================
loadBestScore();
basket = new Basket();
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
