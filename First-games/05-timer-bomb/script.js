/**
 * ========================================================
 * 05 時限爆弾解除システム - JavaScript
 * ========================================================
 * このファイルでは、以下のプログラミング知識を学びます：
 * 1. requestAnimationFrame による高精度な滑らかタイマーループ
 * 2. 誤差の絶対値計算 (Math.abs) と判定ロジック
 * 3. 条件に応じた表示マスキング（ブラインドモード）
 * 4. CSSアニメーション（画面揺れ・点滅）の動的制御
 * 5. LocalStorageを使った最小誤差記録と連勝記録の保存
 */

// ==========================================
// 1. 定数と判定テーブル
// ==========================================
// 誤差判定の基準（ミリ秒: ms）
const JUDGEMENT_THRESHOLDS = {
  PERFECT: 50,  // ±50ms以内: 神業
  SUCCESS: 150, // ±150ms以内: 解除成功
  NEARLY: 300   // ±300ms以内: ギリギリ
  // それ以上: 爆発 (BOOM)
};

// ==========================================
// 2. ゲームの状態変数
// ==========================================
let targetDuration = 5;      // 目標秒数（デフォルト 5秒）
let currentMode = "normal";   // "normal" | "blind"
let isRunning = false;       // 作動中フラグ
let startTime = 0;           // 開始時刻 (performance.now)
let animationFrameId = null; // requestAnimationFrameのID
let streakCount = 0;         // 連続解除成功数

// ==========================================
// 3. HTML要素（DOM）の取得
// ==========================================
const gameContainer = document.getElementById("game-container");
const bestDiffDisplay = document.getElementById("best-diff-display");
const streakDisplay = document.getElementById("streak-display");
const targetLabel = document.getElementById("target-label");
const displayModeBadge = document.getElementById("display-mode-badge");
const timerDisplay = document.getElementById("timer-display");
const blindWarning = document.getElementById("blind-warning");
const fuseProgress = document.getElementById("fuse-progress");
const actionBtn = document.getElementById("action-btn");
const actionIcon = document.getElementById("action-icon");
const actionText = document.getElementById("action-text");
const resultCard = document.getElementById("result-card");
const resultTitle = document.getElementById("result-title");
const finalStopTime = document.getElementById("final-stop-time");
const finalDiffTime = document.getElementById("final-diff-time");
const resultMessage = document.getElementById("result-message");
const retryBtn = document.getElementById("retry-btn");
const lightBulbs = document.querySelectorAll(".light-bulb");
const modeToggleButtons = document.querySelectorAll(".mode-toggle-btn");
const targetButtons = document.querySelectorAll(".target-btn");

// ==========================================
// 4. ベスト記録の読み込みと保存 (LocalStorage)
// ==========================================
function getBestDiffKey() {
  return `bomb_best_${currentMode}_${targetDuration}s`;
}

function loadBestDiff() {
  const key = getBestDiffKey();
  const saved = localStorage.getItem(key);
  if (saved !== null) {
    bestDiffDisplay.textContent = `±${saved} ms`;
  } else {
    bestDiffDisplay.textContent = "-- ms";
  }
}

function updateBestDiff(diffMs) {
  const key = getBestDiffKey();
  const saved = localStorage.getItem(key);
  if (saved === null || diffMs < parseInt(saved, 10)) {
    localStorage.setItem(key, diffMs);
    bestDiffDisplay.textContent = `±${diffMs} ms`;
  }
}

// ==========================================
// 5. ゲームの初期化・リセット
// ==========================================
function resetGame() {
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }

  isRunning = false;
  targetLabel.textContent = targetDuration.toFixed(3);
  displayModeBadge.textContent = currentMode.toUpperCase();

  // 表示リセット
  timerDisplay.textContent = "0.000";
  timerDisplay.className = "timer-digits";
  blindWarning.classList.add("hidden");
  fuseProgress.style.width = "0%";
  resultCard.classList.add("hidden");

  // 警告ランプ消灯
  lightBulbs.forEach(bulb => bulb.classList.remove("blinking"));

  // アクションボタンを「START」状態へ
  actionBtn.className = "big-defuse-btn state-ready";
  actionIcon.textContent = "⚡";
  actionText.textContent = "START (作動開始)";

  loadBestDiff();
}

// ==========================================
// 6. タイマー作動（カウントアップ開始）
// ==========================================
function startDefusal() {
  isRunning = true;
  startTime = performance.now();
  resultCard.classList.add("hidden");

  // 警告ランプ点滅
  lightBulbs.forEach(bulb => bulb.classList.add("blinking"));

  // ボタンを「DEFUSE (解除)」状態へ
  actionBtn.className = "big-defuse-btn state-running";
  actionIcon.textContent = "✂️";
  actionText.textContent = "DEFUSE (停止せよ！)";

  // requestAnimationFrame でタイマーループ開始
  animationFrameId = requestAnimationFrame(updateTimerLoop);
}

// ==========================================
// 7. 高精度タイマーループ (requestAnimationFrame)
// ==========================================
function updateTimerLoop() {
  if (!isRunning) return;

  const now = performance.now();
  const elapsedSec = (now - startTime) / 1000;

  // 導火線プログレスバーの更新
  const progressRatio = Math.min(100, (elapsedSec / targetDuration) * 100);
  fuseProgress.style.width = `${progressRatio}%`;

  // ブラインドモード時のマスキング処理
  // 1.8秒以上経過したら数字を隠す
  if (currentMode === "blind" && elapsedSec >= 1.8) {
    timerDisplay.textContent = "?.???";
    timerDisplay.className = "timer-digits masked";
    blindWarning.classList.remove("hidden");
  } else {
    timerDisplay.textContent = elapsedSec.toFixed(3);
    // 目標秒数に近づいたら赤文字にする
    if (elapsedSec >= targetDuration * 0.8) {
      timerDisplay.classList.add("warning");
    }
  }

  // 目標の2倍以上放置されたら自動自爆
  if (elapsedSec >= targetDuration * 2) {
    stopDefusal(elapsedSec);
    return;
  }

  animationFrameId = requestAnimationFrame(updateTimerLoop);
}

// ==========================================
// 8. 解除試行（停止処理と判定）
// ==========================================
function stopDefusal(forcedElapsedSec = null) {
  if (!isRunning) return;
  isRunning = false;

  cancelAnimationFrame(animationFrameId);
  animationFrameId = null;

  // 停止時刻の確定
  const stopSec = forcedElapsedSec !== null ? forcedElapsedSec : (performance.now() - startTime) / 1000;
  const diffSec = stopSec - targetDuration;
  const diffMs = Math.round(Math.abs(diffSec) * 1000); // 誤差の絶対値(ミリ秒)

  // 警告ランプ消灯
  lightBulbs.forEach(bulb => bulb.classList.remove("blinking"));
  blindWarning.classList.add("hidden");

  // デジタル数字を確定値で再表示
  timerDisplay.textContent = stopSec.toFixed(3);
  timerDisplay.className = "timer-digits";

  // ボタンを待機状態へ
  actionBtn.className = "big-defuse-btn state-ready";
  actionIcon.textContent = "⚡";
  actionText.textContent = "NEXT MISSION";

  // 判定処理
  evaluateResult(stopSec, diffSec, diffMs);
}

// ==========================================
// 9. 判定・評価とエフェクト
// ==========================================
function evaluateResult(stopSec, diffSec, diffMs) {
  let grade = "";
  let title = "";
  let message = "";

  const sign = diffSec >= 0 ? "+" : "-";
  const diffFormatted = `${sign}${diffMs}ms (${diffSec >= 0 ? "遅い" : "早い"})`;

  if (diffMs <= JUDGEMENT_THRESHOLDS.PERFECT) {
    // 🌟 PERFECT (完全解除)
    grade = "perfect";
    title = "🌟 PERFECT DEFUSAL! (神技解除)";
    message = "驚異的な体内時計です！寸分の狂いもなく爆弾を完全無力化しました！";
    streakCount++;
    updateBestDiff(diffMs);
  } else if (diffMs <= JUDGEMENT_THRESHOLDS.SUCCESS) {
    // 🟢 SUCCESS (解除成功)
    grade = "success";
    title = "🟢 MISSION SUCCESS! (解除成功)";
    message = "ナイスストップ！安全圏内で信管の切断に成功しました。";
    streakCount++;
    updateBestDiff(diffMs);
  } else if (diffMs <= JUDGEMENT_THRESHOLDS.NEARLY) {
    // 🟡 NEARLY (ギリギリセーフ)
    grade = "nearly";
    title = "🟡 NEARLY! (ギリギリセーフ)";
    message = "危ないところでした！わずかな猶予で爆発を免れました。";
    streakCount++;
    updateBestDiff(diffMs);
  } else {
    // 💥 BOOM! (爆発)
    grade = "boom";
    title = "💥 BOOM!! (爆発・解除失敗)";
    message = "誤差が大きすぎました！タイマーが起爆装置を作動させてしまいました。";
    streakCount = 0; // 連勝リセット

    // 画面揺れエフェクトを発火
    triggerScreenShake();
  }

  // 連勝表示更新
  streakDisplay.textContent = `${streakCount} 回`;

  // 結果カード表示
  resultCard.className = `result-card ${grade}`;
  resultTitle.textContent = title;
  finalStopTime.textContent = `${stopSec.toFixed(3)}s`;
  finalDiffTime.textContent = diffFormatted;
  resultMessage.textContent = message;
  resultCard.classList.remove("hidden");
}

// 画面揺れ（Screen Shake）を発火する
function triggerScreenShake() {
  gameContainer.classList.remove("screen-shake");
  // リフローを起こしてアニメーションを再トリガー
  void gameContainer.offsetWidth;
  gameContainer.classList.add("screen-shake");
}

// ==========================================
// 10. イベントリスナーの設定
// ==========================================

// メインアクションボタン
actionBtn.addEventListener("click", () => {
  if (!isRunning) {
    startDefusal();
  } else {
    stopDefusal();
  }
});

// キーボードのスペースキーでも操作可能にする
window.addEventListener("keydown", (event) => {
  if (event.code === "Space" && !event.repeat) {
    event.preventDefault();
    if (!isRunning) {
      startDefusal();
    } else {
      stopDefusal();
    }
  }
});

// リトライボタン
retryBtn.addEventListener("click", resetGame);

// モード切り替え（通常 / ブラインド）
modeToggleButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    if (isRunning) return;
    modeToggleButtons.forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    currentMode = btn.getAttribute("data-mode");
    resetGame();
  });
});

// 目標秒数切り替え（3s / 5s / 10s）
targetButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    if (isRunning) return;
    targetButtons.forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    targetDuration = parseInt(btn.getAttribute("data-target"), 10);
    resetGame();
  });
});

// ==========================================
// 11. 初期実行
// ==========================================
resetGame();


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
