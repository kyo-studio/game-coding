/**
 * ========================================================
 * 03 クリック連打測定器 (CPSテスト) - JavaScript
 * ========================================================
 * このファイルでは、以下のプログラミング知識を学びます：
 * 1. 高精度タイマーの制御 (performance.now() / setInterval / clearInterval)
 * 2. リアルタイムな計算処理 (CPS = クリック数 / 秒数)
 * 3. マウス座標を用いた動的UIエフェクト (event.clientX / getBoundingClientRect)
 * 4. 状態遷移（State）の設計 (READY / RUNNING / FINISHED)
 * 5. モード別のデータ管理とLocalStorage保存
 */

// ==========================================
// 1. ゲームの状態（State）を定義
// ==========================================
const GameState = {
  READY: "ready",       // 待機中（クリック待ち）
  RUNNING: "running",   // 計測中
  FINISHED: "finished"  // 終了（結果表示中）
};

let currentState = GameState.READY;
let selectedDuration = 5;  // 選択中の測定時間（秒）：デフォルト5秒
let clickCount = 0;        // 総クリック数
let startTime = 0;         // 計測開始時刻 (ミリ秒)
let timerId = null;        // setIntervalのタイマーID

// ランク判定テーブル（CPS基準）
const RANK_TABLE = [
  { minCPS: 12, title: "🔥 神速の指 (Godlike)", color: "#dc2626" },
  { minCPS: 9,  title: "⚡ イナズマ級 (Pro)", color: "#ea580c" },
  { minCPS: 6,  title: "🐆 チーター級 (Fast)", color: "#d97706" },
  { minCPS: 4,  title: "🐇 ウサギ級 (Normal)", color: "#2563eb" },
  { minCPS: 0,  title: "🐢 カメ級 (Slow)", color: "#64748b" }
];

// ==========================================
// 2. DOM要素の取得
// ==========================================
const modeButtons = document.querySelectorAll(".mode-btn");
const bestCpsDisplay = document.getElementById("best-cps-display");
const timeDisplay = document.getElementById("time-display");
const clicksDisplay = document.getElementById("clicks-display");
const cpsDisplay = document.getElementById("cps-display");
const timerBarFill = document.getElementById("timer-bar-fill");
const clickPad = document.getElementById("click-pad");
const padIcon = document.getElementById("pad-icon");
const padMainText = document.getElementById("pad-main-text");
const padSubText = document.getElementById("pad-sub-text");
const resultCard = document.getElementById("result-card");
const finalCps = document.getElementById("final-cps");
const finalClicks = document.getElementById("final-clicks");
const finalDuration = document.getElementById("final-duration");
const rankTitle = document.getElementById("rank-title");
const retryBtn = document.getElementById("retry-btn");
const resetBtn = document.getElementById("reset-btn");

// ==========================================
// 3. 自己ベストの読み込みと保存 (LocalStorage)
// ==========================================
function getBestCPSKey(duration) {
  return `cps_best_${duration}s`;
}

function loadBestCPS() {
  const key = getBestCPSKey(selectedDuration);
  const saved = localStorage.getItem(key);
  if (saved !== null) {
    bestCpsDisplay.textContent = parseFloat(saved).toFixed(2);
  } else {
    bestCpsDisplay.textContent = "0.00";
  }
}

function saveBestCPS(cps) {
  const key = getBestCPSKey(selectedDuration);
  const currentBest = parseFloat(localStorage.getItem(key) || "0");
  if (cps > currentBest) {
    localStorage.setItem(key, cps.toFixed(2));
    bestCpsDisplay.textContent = cps.toFixed(2);
    return true; // 新記録
  }
  return false;
}

// ==========================================
// 4. ゲームの初期化・リセット
// ==========================================
function resetGame() {
  // タイマーが動いていれば停止してクリア
  if (timerId !== null) {
    clearInterval(timerId);
    timerId = null;
  }

  currentState = GameState.READY;
  clickCount = 0;
  startTime = 0;

  // UIのリセット
  timeDisplay.textContent = `${selectedDuration}.00s`;
  clicksDisplay.textContent = "0";
  cpsDisplay.textContent = "0.00";
  timerBarFill.style.width = "100%";
  timerBarFill.style.background = "linear-gradient(90deg, #0284c7, #38bdf8)";

  // パッドのリセット
  clickPad.classList.remove("running");
  padIcon.textContent = "👆";
  padMainText.textContent = "ここをクリックしてスタート！";
  padSubText.textContent = "最初のクリックでタイマーが始まります";

  // 結果カード非表示
  resultCard.classList.add("hidden");

  // 自己ベスト読み込み
  loadBestCPS();
}

// ==========================================
// 5. 計測開始処理
// ==========================================
function startTest() {
  currentState = GameState.RUNNING;
  startTime = performance.now(); // 高精度な現在時刻を取得
  clickCount = 1; // 最初のクリックをカウント

  // パッドの外観をヒートアップモードに変更
  clickPad.classList.add("running");
  padIcon.textContent = "🔥";
  padMainText.textContent = "連打せよ！！";
  padSubText.textContent = "できるだけ速くクリック！";

  clicksDisplay.textContent = clickCount;

  // 定期実行タイマーループ（約10ミリ秒ごとに画面更新）
  timerId = setInterval(updateTimer, 10);
}

// ==========================================
// 6. タイマーループとリアルタイムCPS計算
// ==========================================
function updateTimer() {
  const now = performance.now();
  const elapsedMs = now - startTime;
  const totalMs = selectedDuration * 1000;
  const remainingMs = Math.max(0, totalMs - elapsedMs);

  // 残り秒数の表示 (例: 4.82s)
  const remainingSec = (remainingMs / 1000).toFixed(2);
  timeDisplay.textContent = `${remainingSec}s`;

  // ゲージの割合更新
  const percentage = (remainingMs / totalMs) * 100;
  timerBarFill.style.width = `${percentage}%`;

  // 残り時間が少なくなったらゲージを赤くする
  if (percentage < 30) {
    timerBarFill.style.background = "linear-gradient(90deg, #e11d48, #f43f5e)";
  }

  // リアルタイムCPS計算（経過秒数で割る）
  const elapsedSec = Math.max(0.01, elapsedMs / 1000);
  const currentCPS = (clickCount / elapsedSec).toFixed(2);
  cpsDisplay.textContent = currentCPS;

  // 時間切れ判定
  if (remainingMs <= 0) {
    finishTest();
  }
}

// ==========================================
// 7. 計測終了・結果判定
// ==========================================
function finishTest() {
  clearInterval(timerId);
  timerId = null;
  currentState = GameState.FINISHED;

  timeDisplay.textContent = "0.00s";
  timerBarFill.style.width = "0%";
  clickPad.classList.remove("running");

  // 最終CPS計算
  const calculatedCPS = clickCount / selectedDuration;
  const finalCPSFixed = calculatedCPS.toFixed(2);

  // 自己ベスト更新チェック
  const isNewRecord = saveBestCPS(calculatedCPS);

  // ランク称号の取得
  const rank = getRank(calculatedCPS);

  // 結果カードの表示
  finalCps.textContent = finalCPSFixed;
  finalClicks.textContent = clickCount;
  finalDuration.textContent = selectedDuration;
  rankTitle.textContent = rank.title;
  rankTitle.style.color = rank.color;

  const resultBadge = document.getElementById("result-badge");
  if (isNewRecord) {
    resultBadge.textContent = "🎉 NEW RECORD! 自己ベスト更新！";
    resultBadge.style.background = "#fef3c7";
    resultBadge.style.color = "#d97706";
  } else {
    resultBadge.textContent = "測定完了！";
    resultBadge.style.background = "#e0f2fe";
    resultBadge.style.color = "#0369a1";
  }

  resultCard.classList.remove("hidden");
}

// CPSに応じた称号を取得する
function getRank(cps) {
  for (const rank of RANK_TABLE) {
    if (cps >= rank.minCPS) {
      return rank;
    }
  }
  return RANK_TABLE[RANK_TABLE.length - 1];
}

// ==========================================
// 8. クリックイベント＆リップル（波紋）エフェクト
// ==========================================
function handleClick(event) {
  // 結果表示中はクリック無効
  if (currentState === GameState.FINISHED) return;

  // 波紋エフェクトの生成
  createRipple(event);

  if (currentState === GameState.READY) {
    // 最初のクリックでスタート
    startTest();
  } else if (currentState === GameState.RUNNING) {
    // 計測中のクリック加算
    clickCount++;
    clicksDisplay.textContent = clickCount;
  }
}

// クリックした位置から広がる波紋エフェクトを動的に生成
function createRipple(event) {
  const rect = clickPad.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;

  const ripple = document.createElement("span");
  ripple.classList.add("ripple");
  
  const size = Math.max(rect.width, rect.height);
  ripple.style.width = ripple.style.height = `${size}px`;
  ripple.style.left = `${x - size / 2}px`;
  ripple.style.top = `${y - size / 2}px`;

  clickPad.appendChild(ripple);

  // アニメーション完了後にDOMから削除（メモリ解放）
  setTimeout(() => {
    ripple.remove();
  }, 500);
}

// ==========================================
// 9. イベントリスナーの設定
// ==========================================

// クリックパッドのクリック
clickPad.addEventListener("mousedown", handleClick);

// モード切り替えボタン（1秒/5秒/10秒）
modeButtons.forEach(button => {
  button.addEventListener("click", () => {
    // 計測中はモード変更不可
    if (currentState === GameState.RUNNING) return;

    modeButtons.forEach(btn => btn.classList.remove("active"));
    button.classList.add("active");

    selectedDuration = parseInt(button.getAttribute("data-time"), 10);
    resetGame();
  });
});

// もう一度挑戦 / リセットボタン
retryBtn.addEventListener("click", resetGame);
resetBtn.addEventListener("click", resetGame);

// ==========================================
// 10. 初期実行
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
