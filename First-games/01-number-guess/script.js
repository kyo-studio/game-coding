/**
 * ========================================================
 * 01 数当てゲーム (High & Low) - JavaScript
 * ========================================================
 * このファイルでは、以下のプログラミング基礎を学びます：
 * 1. 変数と定数の定義 (const / let)
 * 2. 乱数の生成 (Math.random())
 * 3. DOM要素の取得と操作 (document.getElementById)
 * 4. 条件分岐 (if / else if / else)
 * 5. イベント処理 (addEventListener)
 */

// ==========================================
// 1. 定数の設定
// ==========================================
const MIN_NUM = 1;        // 予想する数字の最小値
const MAX_NUM = 100;      // 予想する数字の最大値
const MAX_ATTEMPTS = 7;   // 最大挑戦回数

// ==========================================
// 2. ゲームの状態（State）を管理する変数
// ==========================================
let targetNumber = 0;     // コンピュータが決めた秘密の数字
let remainingAttempts = 0;// 残りの挑戦回数
let isGameOver = false;   // ゲームが終了したかどうかのフラグ
let guessHistory = [];    // 予想した数字と結果の履歴

// ==========================================
// 3. HTMLの要素（DOM）を取得
// ==========================================
const guessInput = document.getElementById("guess-input");
const guessBtn = document.getElementById("guess-btn");
const resetBtn = document.getElementById("reset-btn");
const errorMessage = document.getElementById("error-message");
const remainingAttemptsEl = document.getElementById("remaining-attempts");
const attemptsBar = document.getElementById("attempts-bar");
const resultSection = document.getElementById("result-section");
const resultBox = document.getElementById("result-box");
const resultIcon = document.getElementById("result-icon");
const resultMessage = document.getElementById("result-message");
const historyList = document.getElementById("history-list");

// ==========================================
// 4. ゲームの初期化関数
// ==========================================
function initGame() {
  // 1〜100のランダムな整数を生成
  // Math.random() は 0以上1未満 の小数を返す
  // Math.floor() は 小数点以下を切り捨てる
  targetNumber = Math.floor(Math.random() * (MAX_NUM - MIN_NUM + 1)) + MIN_NUM;
  
  // 状態のリセット
  remainingAttempts = MAX_ATTEMPTS;
  isGameOver = false;
  guessHistory = [];

  // 入力欄とボタンの初期化
  guessInput.value = "";
  guessInput.disabled = false;
  guessBtn.disabled = false;
  errorMessage.textContent = "";
  
  // メッセージ・履歴・プログレスバーのリセット
  resultSection.classList.add("hidden");
  historyList.innerHTML = '<p class="empty-history">まだ予想していません</p>';
  resetBtn.textContent = "ゲームをやり直す";
  resetBtn.classList.remove("btn-highlight");

  // 残り回数表示を更新
  updateAttemptsUI();

  // 入力欄にフォーカスを当てる
  guessInput.focus();

  // (デバッグ用) コンソールに正解を出力（開発時に確認したい場合）
  console.log(`[DEBUG] 今回の正解は: ${targetNumber} です`);
}

// ==========================================
// 5. 残り回数・ゲージのUI更新
// ==========================================
function updateAttemptsUI() {
  remainingAttemptsEl.textContent = remainingAttempts;
  const percentage = (remainingAttempts / MAX_ATTEMPTS) * 100;
  attemptsBar.style.width = `${percentage}%`;

  // 残り回数に応じてバーの色を変える
  if (remainingAttempts <= 2) {
    attemptsBar.style.background = "linear-gradient(90deg, #ef4444, #f87171)"; // 赤
  } else if (remainingAttempts <= 4) {
    attemptsBar.style.background = "linear-gradient(90deg, #f59e0b, #fbbf24)"; // 黄
  } else {
    attemptsBar.style.background = "linear-gradient(90deg, #3b82f6, #60a5fa)"; // 青
  }
}

// ==========================================
// 6. 入力値のバリデーション（チェック処理）
// ==========================================
function validateInput(value) {
  if (value === "" || isNaN(value)) {
    return "1〜100の数字を入力してください。";
  }

  const num = parseInt(value, 10);

  if (num < MIN_NUM || num > MAX_NUM) {
    return `${MIN_NUM}〜${MAX_NUM} の範囲内の数字を入力してください。`;
  }

  if (guessHistory.some(item => item.guess === num)) {
    return `「${num}」はすでに入力した数字です。`;
  }

  return null; // エラーなし
}

// ==========================================
// 7. 予想を実行するメイン処理
// ==========================================
function handleGuess() {
  // ゲームオーバーなら何もしない
  if (isGameOver) return;

  const rawValue = guessInput.value.trim();
  const error = validateInput(rawValue);

  // エラーがあれば表示して中断
  if (error) {
    errorMessage.textContent = error;
    guessInput.focus();
    return;
  }

  // エラーをクリア
  errorMessage.textContent = "";
  const userGuess = parseInt(rawValue, 10);

  // 残り回数を1減らす
  remainingAttempts--;
  updateAttemptsUI();

  // 判定処理
  if (userGuess === targetNumber) {
    // 【正解！】
    endGame(true, userGuess);
    addHistory(userGuess, "win", "正解!");
  } else if (remainingAttempts === 0) {
    // 【回数切れでゲームオーバー】
    endGame(false, userGuess);
    const hint = userGuess < targetNumber ? "HIGH" : "LOW";
    addHistory(userGuess, hint.toLowerCase(), hint);
  } else if (userGuess < targetNumber) {
    // 【もっと大きい（HIGH）】
    showResult("high", "⬆️", `もっと大きい数字です！（${userGuess} より上）`);
    addHistory(userGuess, "high", "HIGH ⬆️");
  } else {
    // 【もっと小さい（LOW）】
    showResult("low", "⬇️", `もっと小さい数字です！（${userGuess} より下）`);
    addHistory(userGuess, "low", "LOW ⬇️");
  }

  // 入力欄をクリアしてフォーカス
  guessInput.value = "";
  if (!isGameOver) {
    guessInput.focus();
  }
}

// ==========================================
// 8. ヒント・メッセージの表示
// ==========================================
function showResult(type, icon, message) {
  resultSection.classList.remove("hidden");
  resultBox.className = `result-box ${type}`;
  resultIcon.textContent = icon;
  resultMessage.textContent = message;
}

// ==========================================
// 9. 履歴バッジの追加
// ==========================================
function addHistory(guess, type, label) {
  // 初回は「まだ予想していません」を消去
  if (guessHistory.length === 0) {
    historyList.innerHTML = "";
  }

  guessHistory.push({ guess, type });

  const badge = document.createElement("span");
  badge.className = `history-badge badge-${type}`;
  badge.textContent = `${guess} (${label})`;
  historyList.appendChild(badge);
}

// ==========================================
// 10. ゲーム終了処理
// ==========================================
function endGame(isWin, lastGuess) {
  isGameOver = true;
  guessInput.disabled = true;
  guessBtn.disabled = true;
  resetBtn.textContent = "もう一度遊ぶ 🎉";
  resetBtn.classList.add("btn-highlight");

  if (isWin) {
    const attemptsUsed = MAX_ATTEMPTS - remainingAttempts;
    showResult("win", "🎉", `正解です！ ${attemptsUsed}回で当てました！`);
  } else {
    showResult("gameover", "💥", `ゲームオーバー！ 正解は「${targetNumber}」でした。`);
  }
}

// ==========================================
// 11. イベントリスナー（操作の監視）
// ==========================================

// 「予想する」ボタンをクリックした時
guessBtn.addEventListener("click", handleGuess);

// 入力欄で Enter キーを押した時
guessInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    handleGuess();
  }
});

// 「リセット / もう一度遊ぶ」ボタンをクリックした時
resetBtn.addEventListener("click", initGame);

// ==========================================
// 12. ゲーム開始（初回読み込み時）
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
