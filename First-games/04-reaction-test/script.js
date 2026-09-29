/**
 * ========================================================
 * 04 反射神経テスト (カラーリアクション) - JavaScript
 * ========================================================
 * このファイルでは、以下のプログラミング知識を学びます：
 * 1. ランダム遅延タイマーの生成とキャンセル (setTimeout / clearTimeout)
 * 2. 高精度な経過時間測定 (performance.now())
 * 3. 状態遷移（State）によるゲーム進行管理
 * 4. 配列を使ったデータの蓄積と集計 (reduce / Math.min / Math.max)
 * 5. LocalStorageを用いたベスト記録の保存・更新
 */

// ==========================================
// 1. 定数と状態（State）の定義
// ==========================================
const TOTAL_ROUNDS = 5; // 測定する総ラウンド数

// ゲームの取り得る状態
const State = {
  IDLE: "idle",       // 待機中（スタート前）
  WAITING: "waiting", // 赤色（緑になるのを待つ時間）
  READY: "ready",     // 緑色（今すぐクリック！）
  EARLY: "early",     // お手つき（フライング）
  RESULT: "result",   // 1回の結果表示中（次へのクリック待ち）
  FINISHED: "finished"// 5回完了（最終サマリー表示中）
};

// ランク判定テーブル
const RANK_TABLE = [
  { maxTime: 180, title: "⚡ 神速・超人級 (Godlike)", color: "#dc2626" },
  { maxTime: 230, title: "🎮 プロゲーマー級 (Pro)", color: "#ea580c" },
  { maxTime: 280, title: "👍 一般平均的 (Average)", color: "#16a34a" },
  { maxTime: 350, title: "☕ やや遅め (Relaxed)", color: "#2563eb" },
  { maxTime: Infinity, title: "🐢 お疲れ気味 (Sleepy)", color: "#64748b" }
];

// ==========================================
// 2. ゲームの状態変数
// ==========================================
let currentState = State.IDLE;
let currentRound = 0;      // 現在のラウンド (0〜5)
let roundTimes = [];       // 各ラウンドのタイム (ms) を格納する配列
let timerId = null;        // setTimeoutのタイマーID
let startTime = 0;         // 緑に変わった時刻 (performance.now)

// ==========================================
// 3. HTML要素（DOM）の取得
// ==========================================
const bestSingleDisplay = document.getElementById("best-single-display");
const bestAvgDisplay = document.getElementById("best-avg-display");
const roundText = document.getElementById("round-text");
const progressDots = document.querySelectorAll(".dot");
const reactionPad = document.getElementById("reaction-pad");
const padIcon = document.getElementById("pad-icon");
const padTitle = document.getElementById("pad-title");
const padDesc = document.getElementById("pad-desc");
const historyPills = document.getElementById("history-pills");
const summaryCard = document.getElementById("summary-card");
const finalAvgTime = document.getElementById("final-avg-time");
const summaryFastest = document.getElementById("summary-fastest");
const summarySlowest = document.getElementById("summary-slowest");
const summaryRank = document.getElementById("summary-rank");
const restartBtn = document.getElementById("restart-btn");
const resetAllBtn = document.getElementById("reset-all-btn");

// ==========================================
// 4. ベスト記録の読み込みと保存 (LocalStorage)
// ==========================================
function loadBestRecords() {
  const savedSingle = localStorage.getItem("reaction_best_single");
  if (savedSingle !== null) {
    bestSingleDisplay.textContent = `${savedSingle} ms`;
  }

  const savedAvg = localStorage.getItem("reaction_best_avg");
  if (savedAvg !== null) {
    bestAvgDisplay.textContent = `${savedAvg} ms`;
  }
}

function updateBestSingle(time) {
  const saved = localStorage.getItem("reaction_best_single");
  if (saved === null || time < parseInt(saved, 10)) {
    localStorage.setItem("reaction_best_single", time);
    bestSingleDisplay.textContent = `${time} ms`;
  }
}

function updateBestAvg(avg) {
  const saved = localStorage.getItem("reaction_best_avg");
  if (saved === null || avg < parseInt(saved, 10)) {
    localStorage.setItem("reaction_best_avg", avg);
    bestAvgDisplay.textContent = `${avg} ms`;
  }
}

// ==========================================
// 5. ゲームの初期化・リセット
// ==========================================
function resetGame() {
  // 動いているタイマーを停止
  if (timerId !== null) {
    clearTimeout(timerId);
    timerId = null;
  }

  currentState = State.IDLE;
  currentRound = 0;
  roundTimes = [];

  // UIのリセット
  updateProgressUI();
  updateHistoryUI();
  summaryCard.classList.add("hidden");

  // パッドを初期（待機）状態に戻す
  setPadState(
    State.IDLE,
    "⚡",
    "クリックしてスタート",
    "画面が「緑」に変わったら、できるだけ速くクリック！"
  );
}

// ==========================================
// 6. パッドの見た目・状態を切り替えるヘルパー
// ==========================================
function setPadState(state, icon, title, desc) {
  currentState = state;
  reactionPad.className = `reaction-pad state-${state}`;
  padIcon.textContent = icon;
  padTitle.textContent = title;
  padDesc.textContent = desc;
}

// ==========================================
// 7. ラウンド開始（赤画面：待機タイマースタート）
// ==========================================
function startWaiting() {
  setPadState(
    State.WAITING,
    "⏳",
    "待ってください...",
    "緑色に変わるまでクリックしないでね"
  );

  // 2000ms 〜 5000ms のランダムな待ち時間を設定
  // Math.random() は 0以上1未満
  const randomDelay = Math.floor(Math.random() * 3000) + 2000;

  timerId = setTimeout(() => {
    // 時間が来たら「緑色（READY）」に切り替え
    triggerReady();
  }, randomDelay);
}

// ==========================================
// 8. 緑色に切り替わり（測定開始！）
// ==========================================
function triggerReady() {
  setPadState(
    State.READY,
    "🟢",
    "今すぐクリック！",
    "すばやくタップ！"
  );
  startTime = performance.now(); // タイムスタンプを記録
}

// ==========================================
// 9. クリック時のメインハンドラー
// ==========================================
function handlePadClick() {
  switch (currentState) {
    case State.IDLE:
      // スタート
      currentRound = 1;
      updateProgressUI();
      startWaiting();
      break;

    case State.WAITING:
      // 【フライング（お手つき）！】
      clearTimeout(timerId); // タイマーを破棄
      timerId = null;
      setPadState(
        State.EARLY,
        "⚠️",
        "早すぎます！",
        "緑になる前にクリックしました。クリックしてやり直し"
      );
      break;

    case State.EARLY:
      // お手つきからの再試行
      startWaiting();
      break;

    case State.READY:
      // 【成功！ 反応時間を計算】
      const reactionTime = Math.round(performance.now() - startTime);
      roundTimes.push(reactionTime);
      updateBestSingle(reactionTime);
      updateHistoryUI();
      updateProgressUI();

      if (currentRound < TOTAL_ROUNDS) {
        // 次のラウンドへ
        setPadState(
          State.RESULT,
          "⏱️",
          `${reactionTime} ms`,
          `第${currentRound}ラウンド完了！ クリックして次へ`
        );
      } else {
        // 全5ラウンド終了
        finishGame();
      }
      break;

    case State.RESULT:
      // 次のラウンドを開始
      currentRound++;
      updateProgressUI();
      startWaiting();
      break;

    case State.FINISHED:
      // 終了時は何もしない（モーダルのリスタートボタンを使う）
      break;
  }
}

// ==========================================
// 10. 全ラウンド終了・最終集計処理
// ==========================================
function finishGame() {
  currentState = State.FINISHED;

  // 集計計算
  // 1. 合計と平均値 (reduce を使用)
  const totalSum = roundTimes.reduce((acc, cur) => acc + cur, 0);
  const avgTime = Math.round(totalSum / roundTimes.length);

  // 2. 最速と最遅 (Math.min, Math.max を使用)
  const fastest = Math.min(...roundTimes);
  const slowest = Math.max(...roundTimes);

  // 3. ランク判定
  const rank = getRank(avgTime);

  // 平均自己ベストの更新
  updateBestAvg(avgTime);

  // パッドの表示
  setPadState(
    State.FINISHED,
    "🏆",
    `平均: ${avgTime} ms`,
    "5回の測定が完了しました！下の結果をチェック"
  );

  // サマリーカードの数値を反映して表示
  finalAvgTime.textContent = `${avgTime} ms`;
  summaryFastest.textContent = `${fastest} ms`;
  summarySlowest.textContent = `${slowest} ms`;
  summaryRank.textContent = rank.title;
  summaryRank.style.color = rank.color;

  summaryCard.classList.remove("hidden");
}

// タイムに応じたランクを取得
function getRank(time) {
  for (const rank of RANK_TABLE) {
    if (time <= rank.maxTime) {
      return rank;
    }
  }
  return RANK_TABLE[RANK_TABLE.length - 1];
}

// ==========================================
// 11. UI更新関数群
// ==========================================
function updateProgressUI() {
  roundText.textContent = `${roundTimes.length} / ${TOTAL_ROUNDS}`;

  progressDots.forEach((dot, index) => {
    dot.className = "dot";
    if (index < roundTimes.length) {
      dot.classList.add("completed");
    } else if (index === roundTimes.length && currentRound > 0) {
      dot.classList.add("active");
    }
  });
}

function updateHistoryUI() {
  if (roundTimes.length === 0) {
    historyPills.innerHTML = '<span class="empty-text">まだ測定していません</span>';
    return;
  }

  historyPills.innerHTML = "";
  roundTimes.forEach((time, index) => {
    const pill = document.createElement("span");
    pill.className = "history-item";
    pill.textContent = `#${index + 1}: ${time}ms`;
    historyPills.appendChild(pill);
  });
}

// ==========================================
// 12. イベントリスナーの設定
// ==========================================
reactionPad.addEventListener("mousedown", handlePadClick);
restartBtn.addEventListener("click", resetGame);
resetAllBtn.addEventListener("click", resetGame);

// ==========================================
// 13. 初期実行
// ==========================================
loadBestRecords();
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
