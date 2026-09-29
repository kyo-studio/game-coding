/**
 * ========================================================
 * 06 神経衰弱 (Memory Match) - JavaScript
 * ========================================================
 * このファイルでは、以下のプログラミング知識を学びます：
 * 1. Fisher-Yates アルゴリズムによる配列の完全ランダムシャッフル
 * 2. JavaScriptによる動的なカード要素（DOM）の生成
 * 3. 2枚めくり判定とクリックのロック制御 (Mutex / lockBoard フラグ)
 * 4. CSS 3D Transforms (rotateY) と連動したクラス操作
 * 5. 手数・タイムの測定と3つ星クリア評価アルゴリズム
 * 6. 難易度別のLocalStorageベスト記録管理
 */

// ==========================================
// 1. 絵柄データプールと難易度設定
// ==========================================
// カードに使用する絵文字の候補リスト
const EMOJI_POOL = [
  "🐶", "🐱", "🐭", "🐹", "🐰", "🦊", "🐻", "🐼",
  "🐨", "🐯", "🦁", "🐮", "🐷", "🐸", "🐵", "🐔"
];

// 難易度ごとの設定
const DIFFICULTY_CONFIG = {
  easy:   { pairs: 3, gridClass: "easy",   starsMoves: 5,  starsTime: 15 },
  normal: { pairs: 6, gridClass: "normal", starsMoves: 10, starsTime: 30 },
  hard:   { pairs: 8, gridClass: "hard",   starsMoves: 14, starsTime: 45 }
};

// ==========================================
// 2. ゲームの状態変数
// ==========================================
let currentDifficulty = "normal"; // "easy" | "normal" | "hard"
let cards = [];                   // カードデータの配列
let firstCard = null;             // 1枚目にめくったカード要素
let secondCard = null;            // 2枚目にめくったカード要素
let lockBoard = false;            // 判定中の連打防止ロックフラグ
let matchedPairs = 0;             // 揃ったペア数
let moves = 0;                    // 手数（2枚めくって1手）
let isGameStarted = false;        // タイマー開始フラグ
let timerInterval = null;         // タイマーのインターバルID
let elapsedSeconds = 0;           // 経過秒数

// ==========================================
// 3. HTML要素（DOM）の取得
// ==========================================
const diffButtons = document.querySelectorAll(".diff-btn");
const movesCountEl = document.getElementById("moves-count");
const timeDisplayEl = document.getElementById("time-display");
const pairsDisplayEl = document.getElementById("pairs-display");
const bestMovesEl = document.getElementById("best-moves");
const bestTimeEl = document.getElementById("best-time");
const cardGrid = document.getElementById("card-grid");
const restartBtn = document.getElementById("restart-btn");
const clearModal = document.getElementById("clear-modal");
const modalRestartBtn = document.getElementById("modal-restart-btn");
const starRatingEl = document.getElementById("star-rating");
const finalMovesEl = document.getElementById("final-moves");
const finalTimeEl = document.getElementById("final-time");
const newRecordMsg = document.getElementById("new-record-msg");

// ==========================================
// 4. Fisher-Yates（フィッシャー・イェーツ）シャッフル
// ==========================================
/**
 * 配列の要素を完全にランダムに並び替える関数
 * 末尾から順にランダムな位置の要素と入れ替えていく
 */
function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const randomIndex = Math.floor(Math.random() * (i + 1));
    // 要素の入れ替え（分割代入）
    [shuffled[i], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[i]];
  }
  return shuffled;
}

// ==========================================
// 5. ベスト記録の読み込みと保存 (LocalStorage)
// ==========================================
function getBestKey(keyName) {
  return `memory_${currentDifficulty}_${keyName}`;
}

function loadBestRecords() {
  const savedMoves = localStorage.getItem(getBestKey("moves"));
  const savedTime = localStorage.getItem(getBestKey("time"));

  bestMovesEl.textContent = savedMoves !== null ? `${savedMoves} 手` : "-- 手";
  bestTimeEl.textContent = savedTime !== null ? formatTime(parseInt(savedTime, 10)) : "--:--";
}

function checkAndUpdateBest(currentMoves, currentTimeSec) {
  let isNew = false;
  const savedMoves = localStorage.getItem(getBestKey("moves"));
  const savedTime = localStorage.getItem(getBestKey("time"));

  if (savedMoves === null || currentMoves < parseInt(savedMoves, 10)) {
    localStorage.setItem(getBestKey("moves"), currentMoves);
    isNew = true;
  }

  if (savedTime === null || currentTimeSec < parseInt(savedTime, 10)) {
    localStorage.setItem(getBestKey("time"), currentTimeSec);
    isNew = true;
  }

  return isNew;
}

// ==========================================
// 6. ゲームの初期化・再構築
// ==========================================
function initGame() {
  // タイマー停止とリセット
  stopTimer();
  elapsedSeconds = 0;
  isGameStarted = false;
  timeDisplayEl.textContent = "00:00";

  // 状態のリセット
  firstCard = null;
  secondCard = null;
  lockBoard = false;
  matchedPairs = 0;
  moves = 0;

  movesCountEl.textContent = "0";
  const config = DIFFICULTY_CONFIG[currentDifficulty];
  pairsDisplayEl.textContent = `0 / ${config.pairs}`;

  // モーダルを隠す
  clearModal.classList.add("hidden");

  // 自己ベスト読み込み
  loadBestRecords();

  // カードデッキの準備
  // 1. 必要なペア数だけ絵文字を切り出し
  const selectedEmojis = EMOJI_POOL.slice(0, config.pairs);
  // 2. ペア（各2枚）にするため配列を複製結合
  const deck = [...selectedEmojis, ...selectedEmojis];
  // 3. シャッフル
  cards = shuffleArray(deck);

  // グリッドクラスの更新
  cardGrid.className = `card-grid ${config.gridClass}`;
  cardGrid.innerHTML = "";

  // カード要素を動的に作成してDOMに追加
  cards.forEach((emoji, index) => {
    const cardEl = createCardElement(emoji, index);
    cardGrid.appendChild(cardEl);
  });
}

// ==========================================
// 7. カード要素の動的DOM生成
// ==========================================
function createCardElement(emoji, index) {
  const card = document.createElement("div");
  card.classList.add("card");
  card.dataset.emoji = emoji;
  card.dataset.index = index;

  // 表側（めくった時の絵柄）
  const cardFront = document.createElement("div");
  cardFront.classList.add("card-face", "card-front");
  cardFront.textContent = emoji;

  // 裏側（伏せられている時）
  const cardBack = document.createElement("div");
  cardBack.classList.add("card-face", "card-back");
  cardBack.textContent = "?";

  card.appendChild(cardFront);
  card.appendChild(cardBack);

  // クリックイベントリスナー登録
  card.addEventListener("click", () => handleCardClick(card));

  return card;
}

// ==========================================
// 8. カードクリック処理（めくりと判定）
// ==========================================
function handleCardClick(clickedCard) {
  // 【クリック防止ガード】
  // 1. ボードがロックされている時
  // 2. 既にめくられているカードをクリックした時
  // 3. 既にマッチ済みのカードをクリックした時
  if (lockBoard) return;
  if (clickedCard === firstCard) return;
  if (clickedCard.classList.contains("matched")) return;

  // 初回クリック時にタイマースタート
  if (!isGameStarted) {
    startTimer();
  }

  // カードをめくる（クラス追加で3D回転）
  clickedCard.classList.add("flipped");

  if (!firstCard) {
    // 【1枚目をめくった時】
    firstCard = clickedCard;
    return;
  }

  // 【2枚目をめくった時】
  secondCard = clickedCard;
  moves++;
  movesCountEl.textContent = moves;

  // 2枚の一致判定
  checkMatch();
}

// ==========================================
// 9. ペアの一致判定
// ==========================================
function checkMatch() {
  const isMatch = firstCard.dataset.emoji === secondCard.dataset.emoji;

  if (isMatch) {
    // 【ペア成立！】
    handleMatchSuccess();
  } else {
    // 【ペア不成立... 裏返しに戻す】
    handleMatchFailure();
  }
}

// ペア一致時の処理
function handleMatchSuccess() {
  firstCard.classList.add("matched");
  secondCard.classList.add("matched");

  matchedPairs++;
  const config = DIFFICULTY_CONFIG[currentDifficulty];
  pairsDisplayEl.textContent = `${matchedPairs} / ${config.pairs}`;

  // 選択状態をリセット
  resetCardsSelection();

  // 全ペア成立でゲームクリア！
  if (matchedPairs === config.pairs) {
    setTimeout(handleGameClear, 500);
  }
}

// ペア不一致時の処理
function handleMatchFailure() {
  lockBoard = true; // 他のカードのクリックをロック

  // 0.8秒待ってからカードを裏返す
  setTimeout(() => {
    if (firstCard) firstCard.classList.remove("flipped");
    if (secondCard) secondCard.classList.remove("flipped");

    resetCardsSelection();
    lockBoard = false; // ロック解除
  }, 800);
}

// カード選択状態の初期化
function resetCardsSelection() {
  firstCard = null;
  secondCard = null;
}

// ==========================================
// 10. ゲームクリア処理
// ==========================================
function handleGameClear() {
  stopTimer();

  const config = DIFFICULTY_CONFIG[currentDifficulty];
  const finalTimeFormatted = formatTime(elapsedSeconds);

  // 星評価の計算 (★★★)
  const stars = calculateStars(moves, elapsedSeconds, config);

  // 自己ベスト更新チェック
  const isNewRecord = checkAndUpdateBest(moves, elapsedSeconds);

  // モーダル表示
  finalMovesEl.textContent = moves;
  finalTimeEl.textContent = finalTimeFormatted;

  // 星アイコンの点灯
  const starSpans = starRatingEl.querySelectorAll(".star");
  starSpans.forEach((span, index) => {
    if (index < stars) {
      span.classList.add("active");
    } else {
      span.classList.remove("active");
    }
  });

  if (isNewRecord) {
    newRecordMsg.classList.remove("hidden");
  } else {
    newRecordMsg.classList.add("hidden");
  }

  clearModal.classList.remove("hidden");
}

// 星評価（1〜3）を決定する
function calculateStars(totalMoves, totalTimeSec, config) {
  if (totalMoves <= config.starsMoves && totalTimeSec <= config.starsTime) {
    return 3; // 完璧！
  } else if (totalMoves <= config.starsMoves * 1.5) {
    return 2; // 優秀！
  }
  return 1;   // クリア！
}

// ==========================================
// 11. タイマー関連関数
// ==========================================
function startTimer() {
  isGameStarted = true;
  timerInterval = setInterval(() => {
    elapsedSeconds++;
    timeDisplayEl.textContent = formatTime(elapsedSeconds);
  }, 1000);
}

function stopTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

function formatTime(seconds) {
  const min = Math.floor(seconds / 60).toString().padStart(2, "0");
  const sec = (seconds % 60).toString().padStart(2, "0");
  return `${min}:${sec}`;
}

// ==========================================
// 12. イベントリスナーの設定
// ==========================================

// 難易度切り替えタブ
diffButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    diffButtons.forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    currentDifficulty = btn.dataset.diff;
    initGame();
  });
});

// リスタートボタン
restartBtn.addEventListener("click", initGame);
modalRestartBtn.addEventListener("click", initGame);

// ==========================================
// 13. 初期実行
// ==========================================
initGame();


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
