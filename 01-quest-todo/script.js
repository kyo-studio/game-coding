// Quest ToDo - 冒険者ギルドのタスク管理
// Web Audio SE & Canvas Confetti 搭載

// --- サウンドシステム (Web Audio API) ---
class SoundSystem {
  constructor() {
    this.ctx = null;
    this.enabled = true;
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

  playTone(freq, type = 'sine', duration = 0.1, gainVal = 0.15) {
    if (!this.enabled) return;
    this.init();
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      gain.gain.setValueAtTime(gainVal, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch(e) {}
  }

  // クエスト受注音（ファンタジーベル）
  playQuestAddSE() {
    if (!this.enabled) return;
    this.init();
    const notes = [523.25, 659.25, 783.99]; // C5, E5, G5
    notes.forEach((freq, idx) => {
      setTimeout(() => {
        this.playTone(freq, 'triangle', 0.2, 0.15);
      }, idx * 80);
    });
  }

  // クエスト達成音（剣撃＋コインチャリン音）
  playQuestCompleteSE() {
    if (!this.enabled) return;
    this.init();
    // 剣撃
    this.playTone(300, 'sawtooth', 0.1, 0.2);
    // コインチャリン音
    setTimeout(() => this.playTone(987.77, 'sine', 0.15, 0.2), 100); // B5
    setTimeout(() => this.playTone(1318.51, 'sine', 0.25, 0.25), 180); // E6
  }

  // レベルアップファンファーレ
  playLevelUpSE() {
    if (!this.enabled) return;
    this.init();
    const melody = [
      { f: 523.25, d: 120 }, // C5
      { f: 523.25, d: 120 }, // C5
      { f: 523.25, d: 120 }, // C5
      { f: 659.25, d: 350 }, // E5
      { f: 587.33, d: 120 }, // D5
      { f: 659.25, d: 120 }, // E5
      { f: 783.99, d: 120 }, // G5
      { f: 1046.50, d: 500 } // C6
    ];
    let time = 0;
    melody.forEach(m => {
      setTimeout(() => {
        this.playTone(m.f, 'triangle', m.d / 1000, 0.22);
      }, time);
      time += m.d;
    });
  }

  // 削除・キャンセル音
  playDeleteSE() {
    this.playTone(180, 'sine', 0.12, 0.1);
  }
}

const sounds = new SoundSystem();

// --- 紙吹雪 (Confetti) パーティクルシステム ---
class ConfettiSystem {
  constructor() {
    this.canvas = document.getElementById('confetti-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.particles = [];
    this.animId = null;
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  burst(x, y, count = 40) {
    const colors = ['#f1c40f', '#e74c3c', '#2ecc71', '#3498db', '#9b59b6', '#ffffff'];
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 8 + 4;
      this.particles.push({
        x: x || this.canvas.width / 2,
        y: y || this.canvas.height / 2,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 3,
        size: Math.random() * 8 + 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * 360,
        rotSpeed: (Math.random() - 0.5) * 10,
        life: 1.0,
        decay: Math.random() * 0.02 + 0.015
      });
    }

    if (!this.animId) {
      this.loop();
    }
  }

  loop() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.25; // 重力
      p.vx *= 0.98;
      p.rotation += p.rotSpeed;
      p.life -= p.decay;

      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }

      this.ctx.save();
      this.ctx.globalAlpha = p.life;
      this.ctx.translate(p.x, p.y);
      this.ctx.rotate((p.rotation * Math.PI) / 180);
      this.ctx.fillStyle = p.color;
      this.ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
      this.ctx.restore();
    }

    if (this.particles.length > 0) {
      this.animId = requestAnimationFrame(() => this.loop());
    } else {
      this.animId = null;
    }
  }
}

const confetti = new ConfettiSystem();

// --- 称号・ランク設定 ---
const TITLE_TIERS = [
  { minLv: 1, rank: 'RANK F', title: '〜 見習い冒険者 〜', avatar: '🧙‍♂️' },
  { minLv: 3, rank: 'RANK E', title: '〜 駆け出しハンター 〜', avatar: '🏹' },
  { minLv: 5, rank: 'RANK D', title: '〜 銅ランク冒険者 〜', avatar: '⚔️' },
  { minLv: 8, rank: 'RANK C', title: '〜 銀ランク戦士 〜', avatar: '🛡️' },
  { minLv: 12, rank: 'RANK B', title: '〜 金ランクの達人 〜', avatar: '👑' },
  { minLv: 16, rank: 'RANK A', title: '〜 竜殺しの英雄 〜', avatar: '🐉' },
  { minLv: 20, rank: 'RANK S', title: '〜 伝説の勇者 〜', avatar: '✨' }
];

const DIFFICULTY_CONFIG = {
  E: { exp: 20, gold: 10, label: 'Eランク', class: 'rank-E' },
  C: { exp: 50, gold: 30, label: 'Cランク', class: 'rank-C' },
  A: { exp: 120, gold: 80, label: 'Aランク', class: 'rank-A' },
  S: { exp: 300, gold: 200, label: 'Sランク', class: 'rank-S' }
};

const CATEGORY_NAMES = {
  main: '⚔️ メイン / 仕事',
  study: '📚 学習 / 勉強',
  health: '🍎 健康 / 運動',
  daily: '🧹 日常 / 家事',
  hobby: '✨ 趣味 / その他'
};

// --- アプリケーション状態 ---
let player = {
  lv: 1,
  exp: 0,
  gold: 0,
  streak: 1,
  lastActiveDate: ''
};

let quests = [];
let currentFilter = 'all'; // all | active | completed
let currentCategory = 'all'; // all | main | study | health | daily | hobby

// --- DOM要素 ---
const playerAvatarEl = document.getElementById('player-avatar');
const playerRankEl = document.getElementById('player-rank');
const playerNameEl = document.getElementById('player-name');
const playerTitleEl = document.getElementById('player-title');
const playerLvEl = document.getElementById('player-lv');
const playerGoldEl = document.getElementById('player-gold');
const playerStreakEl = document.getElementById('player-streak');
const expBarFillEl = document.getElementById('exp-bar-fill');
const expTextEl = document.getElementById('exp-text');

const toggleFormBtn = document.getElementById('toggle-form-btn');
const questForm = document.getElementById('quest-form');
const cancelFormBtn = document.getElementById('cancel-form-btn');
const questListEl = document.getElementById('quest-list');
const emptyStateEl = document.getElementById('empty-state');
const questCountTextEl = document.getElementById('quest-count-text');
const clearCompletedBtn = document.getElementById('clear-completed-btn');
const soundBtn = document.getElementById('sound-btn');

const levelupModal = document.getElementById('levelup-modal');
const modalLv = document.getElementById('modal-lv');
const modalNewTitle = document.getElementById('modal-new-title');
const modalGoldBonus = document.getElementById('modal-gold-bonus');
const closeLevelupBtn = document.getElementById('close-levelup-btn');

// --- 必要EXP計算 ---
function getExpForLevel(lv) {
  return lv * 100;
}

// --- LocalStorage 同期 ---
function loadData() {
  const savedPlayer = localStorage.getItem('quest_todo_player');
  if (savedPlayer) {
    player = JSON.parse(savedPlayer);
  }

  const savedQuests = localStorage.getItem('quest_todo_quests');
  if (savedQuests) {
    quests = JSON.parse(savedQuests);
  } else {
    // 初回初期クエストの投入
    quests = [
      {
        id: 'q_' + Date.now() + '_1',
        title: '冒険者ギルドに登録する（このタスクをタップで完了！）',
        category: 'main',
        difficulty: 'E',
        completed: false,
        createdAt: new Date().toISOString(),
        deadline: ''
      },
      {
        id: 'q_' + Date.now() + '_2',
        title: '新しいクエストを1件受注（登録）してみよう',
        category: 'study',
        difficulty: 'C',
        completed: false,
        createdAt: new Date().toISOString(),
        deadline: ''
      }
    ];
    saveData();
  }

  updateStreak();
  updatePlayerUI();
  renderQuests();
}

function saveData() {
  localStorage.setItem('quest_todo_player', JSON.stringify(player));
  localStorage.setItem('quest_todo_quests', JSON.stringify(quests));
}

// --- ストリーク（連続日数）更新 ---
function updateStreak() {
  const today = new Date().toISOString().split('T')[0];
  if (!player.lastActiveDate) {
    player.lastActiveDate = today;
    player.streak = 1;
    return;
  }

  if (player.lastActiveDate === today) {
    // 今日すでにアクセス済み
    return;
  }

  const lastDate = new Date(player.lastActiveDate);
  const currentDate = new Date(today);
  const diffDays = Math.round((currentDate - lastDate) / (1000 * 60 * 60 * 24));

  if (diffDays === 1) {
    // 連続ログイン
    player.streak += 1;
  } else if (diffDays > 1) {
    // 途切れた
    player.streak = 1;
  }
  player.lastActiveDate = today;
  saveData();
}

// --- プレイヤーUI更新 ---
function updatePlayerUI() {
  let currentTier = TITLE_TIERS[0];
  for (const tier of TITLE_TIERS) {
    if (player.lv >= tier.minLv) {
      currentTier = tier;
    }
  }

  playerAvatarEl.textContent = currentTier.avatar;
  playerRankEl.textContent = currentTier.rank;
  playerTitleEl.textContent = currentTier.title;
  playerLvEl.textContent = player.lv;
  playerGoldEl.textContent = player.gold.toLocaleString();
  playerStreakEl.textContent = player.streak;

  const neededExp = getExpForLevel(player.lv);
  const percent = Math.min(100, Math.floor((player.exp / neededExp) * 100));
  expBarFillEl.style.width = `${percent}%`;
  expTextEl.textContent = `${player.exp} / ${neededExp}`;
}

// --- EXP / Gold 獲得とレベルアップ処理 ---
function addRewards(expGain, goldGain, eventTarget) {
  player.exp += expGain;
  player.gold += goldGain;

  // 浮遊報酬ポップアップ
  if (eventTarget) {
    const rect = eventTarget.getBoundingClientRect();
    const popup = document.createElement('div');
    popup.className = 'exp-float-popup';
    popup.textContent = `+${expGain} EXP!  +${goldGain} G!`;
    popup.style.left = `${rect.left + rect.width / 2}px`;
    popup.style.top = `${rect.top}px`;
    document.body.appendChild(popup);
    setTimeout(() => popup.remove(), 1000);
  }

  // レベルアップ判定
  let leveledUp = false;
  let neededExp = getExpForLevel(player.lv);

  while (player.exp >= neededExp) {
    player.exp -= neededExp;
    player.lv += 1;
    leveledUp = true;
    neededExp = getExpForLevel(player.lv);
  }

  saveData();
  updatePlayerUI();

  if (leveledUp) {
    triggerLevelUpModal();
  }
}

// レベルアップモーダル表示
function triggerLevelUpModal() {
  sounds.playLevelUpSE();
  confetti.burst(window.innerWidth / 2, window.innerHeight / 2, 80);

  let currentTier = TITLE_TIERS[0];
  for (const tier of TITLE_TIERS) {
    if (player.lv >= tier.minLv) {
      currentTier = tier;
    }
  }

  const bonusGold = player.lv * 30;
  player.gold += bonusGold;
  saveData();
  updatePlayerUI();

  modalLv.textContent = player.lv;
  modalNewTitle.textContent = currentTier.title;
  modalGoldBonus.textContent = bonusGold;
  levelupModal.classList.remove('hidden');
}

closeLevelupBtn.addEventListener('click', () => {
  levelupModal.classList.add('hidden');
  sounds.playTone(440, 'sine', 0.1, 0.1);
});

// --- クエスト描画 ---
function renderQuests() {
  questListEl.innerHTML = '';

  let filtered = quests.filter(q => {
    // 完了フィルター
    if (currentFilter === 'active' && q.completed) return false;
    if (currentFilter === 'completed' && !q.completed) return false;

    // カテゴリーフィルター
    if (currentCategory !== 'all' && q.category !== currentCategory) return false;

    return true;
  });

  // 未完了を上に、完了済みを下にソート
  filtered.sort((a, b) => {
    if (a.completed !== b.completed) {
      return a.completed ? 1 : -1;
    }
    return new Date(b.createdAt) - new Date(a.createdAt);
  });

  const activeCount = quests.filter(q => !q.completed).length;
  questCountTextEl.textContent = `受注中のクエスト: ${activeCount} 件`;

  const completedCount = quests.filter(q => q.completed).length;
  if (completedCount > 0) {
    clearCompletedBtn.classList.remove('hidden');
  } else {
    clearCompletedBtn.classList.add('hidden');
  }

  if (filtered.length === 0) {
    emptyStateEl.classList.remove('hidden');
  } else {
    emptyStateEl.classList.add('hidden');
  }

  filtered.forEach(quest => {
    const card = document.createElement('div');
    card.className = `quest-card ${quest.completed ? 'completed' : ''}`;
    card.id = `quest-${quest.id}`;

    const diff = DIFFICULTY_CONFIG[quest.difficulty] || DIFFICULTY_CONFIG.C;
    const catName = CATEGORY_NAMES[quest.category] || quest.category;

    // 期限表示判定
    let deadlineHtml = '';
    if (quest.deadline) {
      const d = new Date(quest.deadline);
      const isOverdue = !quest.completed && new Date() > d;
      const formatted = `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
      deadlineHtml = `
        <span class="quest-deadline ${isOverdue ? 'overdue' : ''}">
          ⏰ ${formatted} ${isOverdue ? '(期限切れ!)' : ''}
        </span>
      `;
    }

    card.innerHTML = `
      <div class="quest-checkbox-wrap">
        <button class="quest-check-btn" title="クエスト完了切替">${quest.completed ? '✔' : ''}</button>
      </div>
      <div class="quest-content">
        <div class="quest-meta-top">
          <span class="quest-rank ${diff.class}">${diff.label}</span>
          <span class="quest-cat">${catName}</span>
          <span class="quest-reward-badge">+${diff.exp} EXP / +${diff.gold} G</span>
        </div>
        <div class="quest-title">${escapeHtml(quest.title)}</div>
        <div class="quest-meta-bottom">
          ${deadlineHtml}
          <div class="quest-actions">
            <button class="quest-delete-btn" title="クエスト破棄">🗑️ 破棄</button>
          </div>
        </div>
      </div>
    `;

    // 完了チェックボタントリガー
    const checkBtn = card.querySelector('.quest-check-btn');
    checkBtn.onclick = (e) => {
      toggleQuestComplete(quest.id, checkBtn);
    };

    // 削除ボタン
    const deleteBtn = card.querySelector('.quest-delete-btn');
    deleteBtn.onclick = () => {
      deleteQuest(quest.id);
    };

    questListEl.appendChild(card);
  });
}

function escapeHtml(str) {
  return str.replace(/[&<>'"]/g, 
    tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
  );
}

// --- クエスト完了トグル ---
function toggleQuestComplete(id, targetEl) {
  const quest = quests.find(q => q.id === id);
  if (!quest) return;

  quest.completed = !quest.completed;

  if (quest.completed) {
    sounds.playQuestCompleteSE();
    const diff = DIFFICULTY_CONFIG[quest.difficulty] || DIFFICULTY_CONFIG.C;
    addRewards(diff.exp, diff.gold, targetEl);

    // スタンプエフェクト描画
    const card = document.getElementById(`quest-${id}`);
    if (card) {
      const stamp = document.createElement('div');
      stamp.className = 'clear-stamp';
      stamp.textContent = '討伐完了!';
      card.appendChild(stamp);
      confetti.burst(targetEl.getBoundingClientRect().left + 20, targetEl.getBoundingClientRect().top);
    }
  } else {
    sounds.playTone(300, 'sine', 0.1, 0.1);
  }

  saveData();
  setTimeout(() => renderQuests(), 400);
}

// --- クエスト削除 ---
function deleteQuest(id) {
  sounds.playDeleteSE();
  quests = quests.filter(q => q.id !== id);
  saveData();
  renderQuests();
}

// --- 討伐済み一括削除 ---
clearCompletedBtn.addEventListener('click', () => {
  if (confirm('討伐完了済みのクエストを一覧から整理しますか？')) {
    sounds.playDeleteSE();
    quests = quests.filter(q => !q.completed);
    saveData();
    renderQuests();
  }
});

// --- 新規クエスト登録フォーム ---
toggleFormBtn.addEventListener('click', () => {
  questForm.classList.toggle('hidden');
  const isHidden = questForm.classList.contains('hidden');
  toggleFormBtn.querySelector('.toggle-icon').textContent = isHidden ? '＋' : '✕';
  if (!isHidden) {
    document.getElementById('quest-title').focus();
    sounds.playTone(400, 'triangle', 0.08, 0.1);
  }
});

cancelFormBtn.addEventListener('click', () => {
  questForm.classList.add('hidden');
  toggleFormBtn.querySelector('.toggle-icon').textContent = '＋';
  sounds.playDeleteSE();
});

questForm.addEventListener('submit', (e) => {
  e.preventDefault();

  const titleInput = document.getElementById('quest-title');
  const catInput = document.getElementById('quest-category');
  const diffInput = document.getElementById('quest-difficulty');
  const deadlineInput = document.getElementById('quest-deadline');

  const newQuest = {
    id: 'q_' + Date.now(),
    title: titleInput.value.trim(),
    category: catInput.value,
    difficulty: diffInput.value,
    completed: false,
    createdAt: new Date().toISOString(),
    deadline: deadlineInput.value
  };

  quests.unshift(newQuest);
  saveData();
  sounds.playQuestAddSE();

  // フォームリセット＆閉じる
  titleInput.value = '';
  deadlineInput.value = '';
  questForm.classList.add('hidden');
  toggleFormBtn.querySelector('.toggle-icon').textContent = '＋';

  renderQuests();
});

// --- フィルタータブ ---
document.querySelectorAll('.filter-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    currentFilter = tab.dataset.filter;
    sounds.playTone(350, 'sine', 0.05, 0.08);
    renderQuests();
  });
});

// --- カテゴリーチップ ---
document.querySelectorAll('.chip-btn').forEach(chip => {
  chip.addEventListener('click', () => {
    document.querySelectorAll('.chip-btn').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    currentCategory = chip.dataset.cat;
    sounds.playTone(380, 'sine', 0.05, 0.08);
    renderQuests();
  });
});

// --- サウンド切り替え ---
soundBtn.addEventListener('click', () => {
  sounds.enabled = !sounds.enabled;
  soundBtn.textContent = sounds.enabled ? '🔊' : '🔇';
  if (sounds.enabled) {
    sounds.playTone(523.25, 'triangle', 0.1, 0.15);
  }
});

// 初期化実行
document.addEventListener('DOMContentLoaded', () => {
  loadData();
});
