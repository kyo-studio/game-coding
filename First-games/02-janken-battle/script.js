/**
 * ========================================================
 * 02 じゃんけんバトル - JavaScript
 * ========================================================
 * このファイルでは、以下のプログラミング知識を学びます：
 * 1. オブジェクトと配列を使ったデータ管理 (Object & Array)
 * 2. 複数のボタンに対する一括イベント登録 (querySelectorAll & forEach)
 * 3. じゃんけんの勝敗判定アルゴリズム (条件分岐 / 剰余演算)
 * 4. 非同期タイマーによるアニメーション演出 (setTimeout)
 * 5. ブラウザへのデータ保存 (localStorage)
 */

// ==========================================
// 1. じゃんけんの手のデータ定義（オブジェクトの配列）
// ==========================================
// 各手に「id」「名前」「アイコン」「勝てる相手のid」を持たせます
const HANDS = [
  { id: "rock", name: "グー", icon: "✊", beats: "scissors" },
  { id: "scissors", name: "チョキ", icon: "✌️", beats: "paper" },
  { id: "paper", name: "パー", icon: "🖐️", beats: "rock" }
];

// ==========================================
// 2. ゲームの状態（State）を管理する変数
// ==========================================
let stats = {
  total: 0,      // 対戦数
  wins: 0,       // 勝利数
  losses: 0,     // 敗北数
  draws: 0,      // あいこ数
  streak: 0,     // 現在の連勝数
  bestStreak: 0  // 最高連勝記録
};

let isPlaying = false; // 対戦アニメーション中かどうかのフラグ

// ==========================================
// 3. HTML要素（DOM）の取得
// ==========================================
const playerHandDisplay = document.getElementById("player-hand-display");
const playerHandName = document.getElementById("player-hand-name");
const cpuHandDisplay = document.getElementById("cpu-hand-display");
const cpuHandName = document.getElementById("cpu-hand-name");
const vsText = document.getElementById("vs-text");
const phaseMessage = document.getElementById("phase-message");
const resultBanner = document.getElementById("result-banner");
const resultText = document.getElementById("result-text");
const resultDetail = document.getElementById("result-detail");
const handButtons = document.querySelectorAll(".hand-btn");
const resetStatsBtn = document.getElementById("reset-stats-btn");

// スコア表示要素
const currentStreakEl = document.getElementById("current-streak");
const bestStreakEl = document.getElementById("best-streak");
const totalMatchesEl = document.getElementById("total-matches");
const winCountEl = document.getElementById("win-count");
const loseCountEl = document.getElementById("lose-count");
const drawCountEl = document.getElementById("draw-count");
const winRateEl = document.getElementById("win-rate");

// ==========================================
// 4. LocalStorageから最高記録を読み込む
// ==========================================
function loadSavedStats() {
  const savedBest = localStorage.getItem("janken_best_streak");
  if (savedBest !== null) {
    stats.bestStreak = parseInt(savedBest, 10) || 0;
    bestStreakEl.textContent = stats.bestStreak;
  }
}

// 最高記録をLocalStorageに保存する
function saveBestStreak() {
  localStorage.setItem("janken_best_streak", stats.bestStreak);
}

// ==========================================
// 5. 勝敗判定ロジック
// ==========================================
/**
 * プレイヤーの手とCPUの手を比較して結果を判定する
 * @param {Object} playerHand プレイヤーの手オブジェクト
 * @param {Object} cpuHand CPUの手オブジェクト
 * @returns {"win" | "lose" | "draw"} 判定結果
 */
function judgeMatch(playerHand, cpuHand) {
  // 1. あいこ（同じ手）
  if (playerHand.id === cpuHand.id) {
    return "draw";
  }

  // 2. 勝ち（playerHand.beats が cpuHand.id と一致）
  if (playerHand.beats === cpuHand.id) {
    return "win";
  }

  // 3. それ以外は負け
  return "lose";
}

// ==========================================
// 6. メインの対戦処理（じゃん・けん・ぽん！）
// ==========================================
function playMatch(playerHandId) {
  // アニメーション中は連打を防止
  if (isPlaying) return;
  isPlaying = true;

  // ボタンを一時的に無効化
  setButtonsDisabled(true);

  // プレイヤーが選んだ手を取得
  const playerHand = HANDS.find(h => h.id === playerHandId);

  // CPUの手をランダムに決定
  const randomIndex = Math.floor(Math.random() * HANDS.length);
  const cpuHand = HANDS[randomIndex];

  // 結果バナーを非表示にしてリセット
  resultBanner.classList.add("hidden");

  // 【演出ステップ1: 最初は✊（グー）を構えて揺らす】
  playerHandDisplay.textContent = "✊";
  playerHandName.textContent = "構え中...";
  cpuHandDisplay.textContent = "✊";
  cpuHandName.textContent = "考え中...";

  playerHandDisplay.classList.add("shaking-player");
  cpuHandDisplay.classList.add("shaking-cpu");

  // 「じゃん...」
  phaseMessage.textContent = "じゃん...";

  // 【演出ステップ2: 「けん...」】
  setTimeout(() => {
    phaseMessage.textContent = "けん...";
  }, 400);

  // 【演出ステップ3: 「ぽん！」で手を開示して判定】
  setTimeout(() => {
    // 揺れアニメーションを停止
    playerHandDisplay.classList.remove("shaking-player");
    cpuHandDisplay.classList.remove("shaking-cpu");

    phaseMessage.textContent = "ぽん！";

    // 実際の手を表示
    playerHandDisplay.textContent = playerHand.icon;
    playerHandName.textContent = playerHand.name;
    cpuHandDisplay.textContent = cpuHand.icon;
    cpuHandName.textContent = cpuHand.name;

    // 勝敗判定
    const result = judgeMatch(playerHand, cpuHand);

    // スコアと結果メッセージを更新
    processResult(result, playerHand, cpuHand);

    // 対戦終了、ボタンを再度有効化
    isPlaying = false;
    setButtonsDisabled(false);
  }, 900);
}

// ==========================================
// 7. 勝敗結果の反映・UI更新
// ==========================================
function processResult(result, playerHand, cpuHand) {
  stats.total++;

  resultBanner.className = `result-banner ${result}`;
  resultBanner.classList.remove("hidden");

  if (result === "win") {
    stats.wins++;
    stats.streak++;

    // 最高連勝記録の更新
    if (stats.streak > stats.bestStreak) {
      stats.bestStreak = stats.streak;
      saveBestStreak();
    }

    resultText.textContent = "🎉 あなたの勝ち！";
    resultDetail.textContent = `${playerHand.name} は ${cpuHand.name} に勝ちます！`;
  } else if (result === "lose") {
    stats.losses++;
    stats.streak = 0; // 連勝リセット

    resultText.textContent = "💥 CPUの勝ち...";
    resultDetail.textContent = `${cpuHand.name} は ${playerHand.name} に勝ちます！`;
  } else {
    stats.draws++;
    // あいこ時は連勝数は維持

    resultText.textContent = "🤝 あいこでしょ！";
    resultDetail.textContent = `お互いに ${playerHand.name} を出しました。`;
  }

  // スコアボードの数値を更新
  updateScoreboardUI();
}

// スコアボード画面を更新
function updateScoreboardUI() {
  currentStreakEl.textContent = stats.streak;
  bestStreakEl.textContent = stats.bestStreak;
  totalMatchesEl.textContent = stats.total;
  winCountEl.textContent = stats.wins;
  loseCountEl.textContent = stats.losses;
  drawCountEl.textContent = stats.draws;

  // 勝率の計算（対戦数 > 0 の場合）
  const rate = stats.total > 0 ? Math.round((stats.wins / stats.total) * 100) : 0;
  winRateEl.textContent = `${rate}%`;
}

// ボタンの有効/無効の切り替え
function setButtonsDisabled(disabled) {
  handButtons.forEach(btn => {
    btn.disabled = disabled;
  });
}

// ==========================================
// 8. 戦績のリセット
// ==========================================
function resetStats() {
  if (confirm("これまでの対戦成績と最高連勝記録をリセットしますか？")) {
    stats = {
      total: 0,
      wins: 0,
      losses: 0,
      draws: 0,
      streak: 0,
      bestStreak: 0
    };
    localStorage.removeItem("janken_best_streak");
    updateScoreboardUI();

    // 画面初期化
    playerHandDisplay.textContent = "❓";
    playerHandName.textContent = "選択待ち";
    cpuHandDisplay.textContent = "🤖";
    cpuHandName.textContent = "待機中";
    phaseMessage.textContent = "手を選んでね！";
    resultBanner.classList.add("hidden");
  }
}

// ==========================================
// 9. イベントリスナーの登録
// ==========================================

// 3つの手ボタンにそれぞれクリックイベントを登録
handButtons.forEach(button => {
  button.addEventListener("click", () => {
    const selectedHand = button.getAttribute("data-hand");
    playMatch(selectedHand);
  });
});

// 戦績リセットボタン
resetStatsBtn.addEventListener("click", resetStats);

// ==========================================
// 10. 初期実行
// ==========================================
loadSavedStats();
updateScoreboardUI();


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
