// Crystal Saga - ターン制コマンドバトルRPG
// Web Audio API によるサウンド生成とリッチなバトルロジック

// iPad / iOS のダブルタップズーム防止
document.addEventListener('touchend', (e) => {
  const now = Date.now();
  if (now - (window.lastTouchEnd || 0) <= 300) {
    e.preventDefault();
  }
  window.lastTouchEnd = now;
}, { passive: false });

// Web Audio SE & BGM システム
class SoundSystem {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.bgmTimer = null;
    this.bgmNote = 0;
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
    } catch (e) {
      console.error(e);
    }
  }

  playAttackSE() {
    if (!this.enabled) return;
    this.init();
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(400, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(80, this.ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.12);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.12);
    } catch(e){}
  }

  playFireSE() {
    if (!this.enabled) return;
    this.init();
    try {
      // ノイズとピッチベンドで火炎音
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(250, this.ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(700, this.ctx.currentTime + 0.2);
      osc.frequency.exponentialRampToValueAtTime(50, this.ctx.currentTime + 0.35);
      gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.35);
    } catch(e){}
  }

  playThunderSE() {
    if (!this.enabled) return;
    this.init();
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(800, this.ctx.currentTime);
      osc.frequency.setValueAtTime(120, this.ctx.currentTime + 0.05);
      osc.frequency.setValueAtTime(900, this.ctx.currentTime + 0.1);
      osc.frequency.setValueAtTime(80, this.ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.25, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.4);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.4);
    } catch(e){}
  }

  playHealSE() {
    if (!this.enabled) return;
    this.init();
    const notes = [523.25, 659.25, 783.99, 1046.50];
    notes.forEach((f, i) => {
      setTimeout(() => {
        this.playTone(f, 'sine', 0.18, 0.15);
      }, i * 70);
    });
  }

  playHitSE() {
    this.playTone(120, 'square', 0.15, 0.2);
  }

  playCriticalSE() {
    if (!this.enabled) return;
    this.init();
    this.playTone(600, 'sawtooth', 0.08, 0.25);
    setTimeout(() => this.playTone(900, 'sawtooth', 0.15, 0.3), 60);
  }

  playVictorySE() {
    if (!this.enabled) return;
    this.init();
    const melody = [
      { f: 523.25, d: 150 }, // C5
      { f: 523.25, d: 150 }, // C5
      { f: 523.25, d: 150 }, // C5
      { f: 659.25, d: 450 }, // E5
      { f: 587.33, d: 150 }, // D5
      { f: 659.25, d: 150 }, // E5
      { f: 783.99, d: 600 }, // G5
    ];
    let time = 0;
    melody.forEach((note) => {
      setTimeout(() => {
        this.playTone(note.f, 'triangle', note.d / 1000, 0.2);
      }, time);
      time += note.d;
    });
  }

  playGameOverSE() {
    if (!this.enabled) return;
    this.init();
    const notes = [392.00, 369.99, 349.23, 311.13, 261.63];
    notes.forEach((f, i) => {
      setTimeout(() => {
        this.playTone(f, 'sawtooth', 0.3, 0.2);
      }, i * 200);
    });
  }

  startBattleBGM() {
    if (this.bgmTimer) return;
    const bassline = [110, 110, 130.81, 146.83, 110, 110, 164.81, 146.83];
    this.bgmNote = 0;
    this.bgmTimer = setInterval(() => {
      if (this.enabled) {
        const f = bassline[this.bgmNote % bassline.length];
        this.playTone(f, 'triangle', 0.12, 0.04);
        this.bgmNote++;
      }
    }, 240);
  }

  stopBGM() {
    if (this.bgmTimer) {
      clearInterval(this.bgmTimer);
      this.bgmTimer = null;
    }
  }
}

const sounds = new SoundSystem();

// ゲームデータ定義
const HEROES_INIT = [
  {
    id: 0,
    name: 'アルス',
    job: '勇者',
    avatar: '⚔️',
    maxHp: 130,
    hp: 130,
    maxMp: 35,
    mp: 35,
    atk: 32,
    def: 18,
    spd: 15,
    skills: [
      { id: 'gigaslash', name: 'ギガスラッシュ', cost: 12, power: 2.2, type: 'all', elem: 'light', desc: '聖なる剣撃で敵全体を攻撃' },
      { id: 'power_strike', name: '剛力撃', cost: 6, power: 1.8, type: 'single', elem: 'phys', desc: '渾身の一撃で大ダメージ' },
      { id: 'shield_guard', name: '大盾の守り', cost: 5, type: 'buff', buff: 'guard', desc: '2ターンの間自身の防御力UP' }
    ]
  },
  {
    id: 1,
    name: 'エレナ',
    job: '魔導士',
    avatar: '🧙‍♀️',
    maxHp: 85,
    hp: 85,
    maxMp: 70,
    mp: 70,
    atk: 14,
    def: 10,
    spd: 18,
    skills: [
      { id: 'fire', name: 'ファイア', cost: 8, power: 1.9, type: 'single', elem: 'fire', desc: '炎の玉で敵単体を焼く' },
      { id: 'blizzard', name: 'ブリザド', cost: 14, power: 1.6, type: 'all', elem: 'ice', desc: '吹雪で敵全体を凍らせる' },
      { id: 'thunder', name: 'サンダー', cost: 12, power: 2.1, type: 'single', elem: 'thunder', desc: '強力な雷撃を落とす' }
    ]
  },
  {
    id: 2,
    name: 'セフィア',
    job: '聖職者',
    avatar: '🧝‍♀️',
    maxHp: 95,
    hp: 95,
    maxMp: 60,
    mp: 60,
    atk: 16,
    def: 12,
    spd: 12,
    skills: [
      { id: 'heal', name: 'ヒール', cost: 7, power: 65, type: 'heal_single', desc: '味方単体のHPを大きく回復' },
      { id: 'party_heal', name: '全体ヒール', cost: 18, power: 45, type: 'heal_all', desc: '味方全体のHPを中回復' },
      { id: 'resurrection', name: 'リバイブ', cost: 25, power: 50, type: 'revive', desc: '戦闘不能の味方を復活' }
    ]
  }
];

const STAGES = [
  {
    stage: 1,
    name: 'エメラルド平原',
    enemies: [
      { name: 'ゴブリン', sprite: '👺', maxHp: 60, hp: 60, atk: 18, def: 8, spd: 10, exp: 20, weak: 'fire' },
      { name: '森のウルフ', sprite: '🐺', maxHp: 50, hp: 50, atk: 22, def: 6, spd: 16, exp: 25, weak: 'ice' }
    ]
  },
  {
    stage: 2,
    name: '試練の洞窟',
    enemies: [
      { name: 'ゴーレム', sprite: '🗿', maxHp: 140, hp: 140, atk: 26, def: 22, spd: 6, exp: 45, weak: 'thunder' },
      { name: '闇の魔術師', sprite: '🧙‍♂️', maxHp: 80, hp: 80, atk: 28, def: 10, spd: 14, exp: 40, weak: 'light' }
    ]
  },
  {
    stage: 3,
    name: '灼熱の魔峡谷',
    enemies: [
      { name: 'ヘルハウンド', sprite: '🐕‍🦺', maxHp: 120, hp: 120, atk: 34, def: 14, spd: 20, exp: 60, weak: 'ice' },
      { name: 'デスナイト', sprite: '💀', maxHp: 160, hp: 160, atk: 36, def: 20, spd: 12, exp: 70, weak: 'light' }
    ]
  },
  {
    stage: 4,
    name: '魔王の玉座',
    enemies: [
      { name: '魔王ダークロード', sprite: '👿', maxHp: 380, hp: 380, atk: 42, def: 24, spd: 15, isBoss: true, exp: 200, weak: 'light' }
    ]
  }
];

const ITEMS_INIT = [
  { id: 'potion', name: '特製ポーション', count: 4, healHp: 60, desc: 'HPを60回復' },
  { id: 'ether', name: 'エーテル', count: 3, healMp: 30, desc: 'MPを30回復' },
  { id: 'feather', name: 'フェニックスの尾', count: 2, revive: true, healHp: 40, desc: '戦闘不能を復活' }
];

// ゲーム状態
let currentStageIndex = 0;
let heroes = [];
let items = [];
let currentEnemies = [];
let currentHeroTurn = 0; // 0, 1, 2
let selectedTargetIndex = 0;
let currentAction = null; // { type: 'attack'|'skill'|'defend'|'item', skillData?, itemData? }
let isExecuting = false;

// DOM要素
const messageEl = document.getElementById('battle-message');
const enemiesContainer = document.getElementById('enemies-container');
const effectLayer = document.getElementById('effect-layer');
const stageBadge = document.getElementById('stage-badge');
const actingHeroNameEl = document.getElementById('acting-hero-name');

const mainCommandsEl = document.getElementById('main-commands');
const skillCommandsEl = document.getElementById('skill-commands');
const itemCommandsEl = document.getElementById('item-commands');
const targetCommandsEl = document.getElementById('target-commands');
const cancelBtn = document.getElementById('cancel-btn');

const overlayModal = document.getElementById('overlay-modal');
const modalTitle = document.getElementById('modal-title');
const modalSubtitle = document.getElementById('modal-subtitle');
const modalDesc = document.getElementById('modal-desc');
const tutorialBox = document.getElementById('tutorial-box');
const startBtn = document.getElementById('start-btn');
const soundToggleBtn = document.getElementById('sound-toggle-btn');

// サウンド切替
soundToggleBtn.addEventListener('click', () => {
  sounds.enabled = !sounds.enabled;
  soundToggleBtn.textContent = sounds.enabled ? '🔊' : '🔇';
  if (!sounds.enabled) sounds.stopBGM();
  else sounds.startBattleBGM();
});

// ゲーム初期化
function initGame() {
  heroes = JSON.parse(JSON.stringify(HEROES_INIT));
  items = JSON.parse(JSON.stringify(ITEMS_INIT));
  currentStageIndex = 0;
  loadStage(currentStageIndex);
  sounds.startBattleBGM();
}

function loadStage(index) {
  const stageData = STAGES[index];
  stageBadge.textContent = `STAGE ${index + 1} / 4`;
  currentEnemies = JSON.parse(JSON.stringify(stageData.enemies));
  selectedTargetIndex = 0;
  currentHeroTurn = 0;
  isExecuting = false;

  renderEnemies();
  updateHeroStatusUI();
  setMessage(`${stageData.name}！ ${currentEnemies.map(e => e.name).join('と ')}が あらわれた！`);
  
  // 先頭の生存ヒーローのターンへ
  findNextHeroTurn(0);
}

// 敵キャラクターの描画
function renderEnemies() {
  enemiesContainer.innerHTML = '';
  currentEnemies.forEach((enemy, idx) => {
    if (enemy.hp <= 0) return; // 撃破された敵は非表示

    const card = document.createElement('div');
    card.className = `enemy-card ${idx === selectedTargetIndex ? 'selected' : ''}`;
    card.id = `enemy-${idx}`;
    card.onclick = () => {
      if (isExecuting) return;
      selectedTargetIndex = idx;
      renderEnemies();
      sounds.playTone(400, 'sine', 0.05, 0.1);
    };

    const hpPercent = Math.max(0, (enemy.hp / enemy.maxHp) * 100);

    card.innerHTML = `
      <div class="enemy-sprite ${enemy.isBoss ? 'boss-sprite' : ''}">${enemy.sprite}</div>
      <div class="enemy-name">${enemy.name}</div>
      <div class="enemy-hp-bar">
        <div class="enemy-hp-fill" style="width: ${hpPercent}%; background: ${hpPercent < 30 ? 'var(--hp-low)' : 'var(--hp-green)'}"></div>
      </div>
    `;
    enemiesContainer.appendChild(card);
  });
}

// ヒーローステータスの更新
function updateHeroStatusUI() {
  heroes.forEach((hero, idx) => {
    const card = document.getElementById(`hero-${idx}`);
    const hpBar = document.getElementById(`hero-hp-${idx}`);
    const hpText = document.getElementById(`hero-hp-text-${idx}`);
    const mpBar = document.getElementById(`hero-mp-${idx}`);
    const mpText = document.getElementById(`hero-mp-text-${idx}`);
    const statusBadge = document.getElementById(`status-${idx}`);

    if (hero.hp <= 0) {
      card.classList.add('dead');
      statusBadge.style.display = 'inline-block';
      statusBadge.textContent = '戦闘不能';
      statusBadge.style.background = '#e74c3c';
    } else {
      card.classList.remove('dead');
      if (hero.guardTurns > 0) {
        statusBadge.style.display = 'inline-block';
        statusBadge.textContent = '防御UP';
        statusBadge.style.background = '#2980b9';
      } else {
        statusBadge.style.display = 'none';
      }
    }

    if (idx === currentHeroTurn && !isExecuting && hero.hp > 0) {
      card.classList.add('active-turn');
    } else {
      card.classList.remove('active-turn');
    }

    const hpPct = Math.max(0, (hero.hp / hero.maxHp) * 100);
    const mpPct = Math.max(0, (hero.mp / hero.maxMp) * 100);

    hpBar.style.width = `${hpPct}%`;
    hpBar.style.background = hpPct < 30 ? 'var(--hp-low)' : 'var(--hp-green)';
    hpText.textContent = `${hero.hp}/${hero.maxHp}`;

    mpBar.style.width = `${mpPct}%`;
    mpText.textContent = `${hero.mp}/${hero.maxMp}`;
  });
}

function setMessage(text) {
  messageEl.textContent = text;
}

// ダメージ / 回復ポップアップ
function showPopup(text, targetEl, type = 'normal') {
  if (!targetEl) return;
  const rect = targetEl.getBoundingClientRect();
  const parentRect = effectLayer.getBoundingClientRect();

  const popup = document.createElement('div');
  popup.className = `damage-popup ${type}`;
  popup.textContent = text;
  popup.style.left = `${rect.left + rect.width / 2 - parentRect.left}px`;
  popup.style.top = `${rect.top + rect.height / 3 - parentRect.top}px`;

  effectLayer.appendChild(popup);
  setTimeout(() => popup.remove(), 850);
}

// 次の行動可能ヒーローの検索
function findNextHeroTurn(startIdx) {
  // 生存しているヒーローを検索
  for (let i = startIdx; i < heroes.length; i++) {
    if (heroes[i].hp > 0) {
      currentHeroTurn = i;
      showMainCommands();
      updateHeroStatusUI();
      return;
    }
  }

  // 全員の入力が完了したらターン終了 -> 敵の反撃ターンへ
  executeEnemyPhase();
}

// コマンドUI制御
function showMainCommands() {
  const hero = heroes[currentHeroTurn];
  actingHeroNameEl.textContent = hero.name;
  mainCommandsEl.classList.remove('hidden');
  skillCommandsEl.classList.add('hidden');
  itemCommandsEl.classList.add('hidden');
  targetCommandsEl.classList.add('hidden');
  cancelBtn.classList.add('hidden');
}

// メインコマンドのクリックリスナー
document.querySelectorAll('#main-commands .cmd-btn').forEach(btn => {
  btn.addEventListener('click', (e) => {
    if (isExecuting) return;
    const action = btn.dataset.action;
    sounds.playTone(500, 'sine', 0.05, 0.1);

    if (action === 'attack') {
      currentAction = { type: 'attack' };
      // 単体攻撃実行
      executeHeroAction();
    } else if (action === 'skill') {
      showSkillSubmenu();
    } else if (action === 'defend') {
      currentAction = { type: 'defend' };
      executeHeroAction();
    } else if (action === 'item') {
      showItemSubmenu();
    }
  });
});

// スキルサブメニュー表示
function showSkillSubmenu() {
  const hero = heroes[currentHeroTurn];
  mainCommandsEl.classList.add('hidden');
  skillCommandsEl.innerHTML = '';
  skillCommandsEl.classList.remove('hidden');
  cancelBtn.classList.remove('hidden');

  hero.skills.forEach(skill => {
    const btn = document.createElement('button');
    btn.className = 'cmd-btn skill-btn';
    btn.disabled = hero.mp < skill.cost;
    btn.innerHTML = `
      <span class="skill-name">${skill.name}</span>
      <span class="skill-cost">MP ${skill.cost}</span>
    `;
    btn.onclick = () => {
      sounds.playTone(500, 'sine', 0.05, 0.1);
      currentAction = { type: 'skill', skill };
      if (skill.type === 'heal_single' || skill.type === 'revive') {
        showTargetAllySubmenu(skill);
      } else {
        executeHeroAction();
      }
    };
    skillCommandsEl.appendChild(btn);
  });
}

// アイテムサブメニュー表示
function showItemSubmenu() {
  mainCommandsEl.classList.add('hidden');
  itemCommandsEl.innerHTML = '';
  itemCommandsEl.classList.remove('hidden');
  cancelBtn.classList.remove('hidden');

  items.forEach(item => {
    const btn = document.createElement('button');
    btn.className = 'cmd-btn item-btn';
    btn.disabled = item.count <= 0;
    btn.innerHTML = `
      <span class="item-name">${item.name}</span>
      <span class="item-count">x${item.count}</span>
    `;
    btn.onclick = () => {
      sounds.playTone(500, 'sine', 0.05, 0.1);
      currentAction = { type: 'item', item };
      showTargetAllySubmenu(item);
    };
    itemCommandsEl.appendChild(btn);
  });
}

// 味方対象選択サブメニュー
function showTargetAllySubmenu(source) {
  skillCommandsEl.classList.add('hidden');
  itemCommandsEl.classList.add('hidden');
  targetCommandsEl.innerHTML = '';
  targetCommandsEl.classList.remove('hidden');

  heroes.forEach((h, idx) => {
    const btn = document.createElement('button');
    btn.className = 'cmd-btn';
    // 蘇生魔法/アイテムなら死者のみ、回復なら生存者のみ選択可能
    const isRevive = source.type === 'revive' || source.revive;
    const isValidTarget = isRevive ? h.hp <= 0 : h.hp > 0;
    btn.disabled = !isValidTarget;
    btn.innerHTML = `${h.name} (${h.hp}/${h.maxHp})`;
    btn.onclick = () => {
      sounds.playTone(500, 'sine', 0.05, 0.1);
      currentAction.targetHeroIndex = idx;
      executeHeroAction();
    };
    targetCommandsEl.appendChild(btn);
  });
}

// キャンセルボタン
cancelBtn.addEventListener('click', () => {
  sounds.playTone(300, 'sine', 0.05, 0.1);
  showMainCommands();
});

// 生存しているターゲットのインデックスを補正
function getValidEnemyTarget() {
  if (currentEnemies[selectedTargetIndex] && currentEnemies[selectedTargetIndex].hp > 0) {
    return selectedTargetIndex;
  }
  for (let i = 0; i < currentEnemies.length; i++) {
    if (currentEnemies[i].hp > 0) {
      selectedTargetIndex = i;
      return i;
    }
  }
  return -1;
}

// ヒーローのアクション実行
async function executeHeroAction() {
  isExecuting = true;
  mainCommandsEl.classList.add('hidden');
  skillCommandsEl.classList.add('hidden');
  itemCommandsEl.classList.add('hidden');
  targetCommandsEl.classList.add('hidden');
  cancelBtn.classList.add('hidden');

  const hero = heroes[currentHeroTurn];
  const targetIdx = getValidEnemyTarget();

  if (currentAction.type === 'attack') {
    if (targetIdx === -1) return;
    const enemy = currentEnemies[targetIdx];
    const enemyEl = document.getElementById(`enemy-${targetIdx}`);

    setMessage(`${hero.name}の こうげき！`);
    sounds.playAttackSE();

    await sleep(250);

    // ダメージ計算
    const isCrit = Math.random() < 0.15;
    const baseDamage = Math.max(1, hero.atk - enemy.def * 0.4);
    const variance = (Math.random() * 0.2) + 0.9; // 90%〜110%
    let damage = Math.floor(baseDamage * variance * (isCrit ? 1.8 : 1.0));

    enemy.hp = Math.max(0, enemy.hp - damage);
    if (enemyEl) {
      enemyEl.classList.add('shake');
      setTimeout(() => enemyEl.classList.remove('shake'), 300);
    }

    if (isCrit) {
      sounds.playCriticalSE();
      showPopup(`CRITICAL! ${damage}`, enemyEl, 'critical');
      setMessage(`会心の一撃！ ${enemy.name}に ${damage} の大ダメージ！`);
    } else {
      sounds.playHitSE();
      showPopup(`-${damage}`, enemyEl, 'normal');
      setMessage(`${enemy.name}に ${damage} のダメージ！`);
    }

    renderEnemies();
    await sleep(600);

  } else if (currentAction.type === 'defend') {
    hero.isDefending = true;
    setMessage(`${hero.name}は 身をかためて ぼうぎょの姿勢をとった！`);
    sounds.playTone(350, 'sine', 0.15, 0.1);
    await sleep(600);

  } else if (currentAction.type === 'skill') {
    const skill = currentAction.skill;
    hero.mp -= skill.cost;
    updateHeroStatusUI();

    setMessage(`${hero.name}は ${skill.name}を 唱えた！`);

    if (skill.elem === 'fire') sounds.playFireSE();
    else if (skill.elem === 'thunder') sounds.playThunderSE();
    else if (skill.elem === 'light') sounds.playVictorySE();
    else sounds.playAttackSE();

    await sleep(350);

    if (skill.type === 'single') {
      if (targetIdx !== -1) {
        const enemy = currentEnemies[targetIdx];
        const enemyEl = document.getElementById(`enemy-${targetIdx}`);
        const isWeak = enemy.weak === skill.elem;
        const multiplier = isWeak ? 1.5 : 1.0;
        const damage = Math.floor(hero.atk * skill.power * multiplier * ((Math.random() * 0.15) + 0.92));

        enemy.hp = Math.max(0, enemy.hp - damage);
        if (enemyEl) enemyEl.classList.add('shake');

        if (isWeak) {
          sounds.playCriticalSE();
          showPopup(`WEAKNESS! ${damage}`, enemyEl, 'weakness');
          setMessage(`弱点を突いた！ ${enemy.name}に ${damage} の大ダメージ！`);
        } else {
          showPopup(`-${damage}`, enemyEl, 'normal');
          setMessage(`${enemy.name}に ${damage} のダメージ！`);
        }
        renderEnemies();
      }
    } else if (skill.type === 'all') {
      currentEnemies.forEach((enemy, idx) => {
        if (enemy.hp <= 0) return;
        const enemyEl = document.getElementById(`enemy-${idx}`);
        const isWeak = enemy.weak === skill.elem;
        const damage = Math.floor(hero.atk * skill.power * (isWeak ? 1.5 : 1.0) * ((Math.random() * 0.15) + 0.92));
        enemy.hp = Math.max(0, enemy.hp - damage);
        if (enemyEl) {
          enemyEl.classList.add('shake');
          showPopup(`-${damage}`, enemyEl, isWeak ? 'weakness' : 'normal');
        }
      });
      renderEnemies();
      setMessage(`敵全体に 激しい魔法の衝撃が吹き荒れた！`);
    } else if (skill.type === 'heal_single') {
      const targetHero = heroes[currentAction.targetHeroIndex];
      const targetCard = document.getElementById(`hero-${currentAction.targetHeroIndex}`);
      const healAmount = Math.min(targetHero.maxHp - targetHero.hp, skill.power);
      targetHero.hp += healAmount;
      sounds.playHealSE();
      showPopup(`+${healAmount}`, targetCard, 'heal');
      setMessage(`${targetHero.name}の HPが ${healAmount} 回復した！`);
      updateHeroStatusUI();
    } else if (skill.type === 'heal_all') {
      sounds.playHealSE();
      heroes.forEach((h, idx) => {
        if (h.hp <= 0) return;
        const targetCard = document.getElementById(`hero-${idx}`);
        const healAmount = Math.min(h.maxHp - h.hp, skill.power);
        h.hp += healAmount;
        showPopup(`+${healAmount}`, targetCard, 'heal');
      });
      setMessage(`聖なる光が パーティー全体を包み込み 回復した！`);
      updateHeroStatusUI();
    } else if (skill.type === 'revive') {
      const targetHero = heroes[currentAction.targetHeroIndex];
      const targetCard = document.getElementById(`hero-${currentAction.targetHeroIndex}`);
      targetHero.hp = Math.floor(targetHero.maxHp * (skill.power / 100));
      sounds.playVictorySE();
      showPopup(`REVIVE!`, targetCard, 'heal');
      setMessage(`${targetHero.name}は 奇跡の光によって息を吹き返した！`);
      updateHeroStatusUI();
    } else if (skill.type === 'buff') {
      hero.guardTurns = 2;
      sounds.playHealSE();
      setMessage(`${hero.name}の 守備力が 大幅にアップした！`);
      updateHeroStatusUI();
    }

    await sleep(700);

  } else if (currentAction.type === 'item') {
    const item = currentAction.item;
    item.count--;
    const targetHero = heroes[currentAction.targetHeroIndex];
    const targetCard = document.getElementById(`hero-${currentAction.targetHeroIndex}`);

    setMessage(`${hero.name}は ${item.name}を ${targetHero.name}に使った！`);
    sounds.playHealSE();

    if (item.healHp) {
      targetHero.hp = Math.min(targetHero.maxHp, targetHero.hp + item.healHp);
      showPopup(`+${item.healHp}HP`, targetCard, 'heal');
    }
    if (item.healMp) {
      targetHero.mp = Math.min(targetHero.maxMp, targetHero.mp + item.healMp);
      showPopup(`+${item.healMp}MP`, targetCard, 'heal');
    }
    updateHeroStatusUI();
    await sleep(650);
  }

  // 敵全滅チェック
  const allEnemiesDead = currentEnemies.every(e => e.hp <= 0);
  if (allEnemiesDead) {
    await handleStageVictory();
    return;
  }

  // 次のヒーローへ
  isExecuting = false;
  findNextHeroTurn(currentHeroTurn + 1);
}

// 敵の反撃フェーズ
async function executeEnemyPhase() {
  isExecuting = true;
  setMessage(`--- 敵のターン ---`);
  await sleep(600);

  for (let i = 0; i < currentEnemies.length; i++) {
    const enemy = currentEnemies[i];
    if (enemy.hp <= 0) continue;

    // 生存している味方をランダム選択
    const livingHeroes = heroes.filter(h => h.hp > 0);
    if (livingHeroes.length === 0) break;

    const targetHero = livingHeroes[Math.floor(Math.random() * livingHeroes.length)];
    const targetHeroIdx = targetHero.id;
    const heroCard = document.getElementById(`hero-${targetHeroIdx}`);

    // ボス専用技判定
    const isBossSpecial = enemy.isBoss && Math.random() < 0.4;

    if (isBossSpecial) {
      setMessage(`魔王ダークロードの「カオスフレア」！ 巨大な闇の業火が襲いかかる！`);
      sounds.playFireSE();
      await sleep(400);

      heroes.forEach((h, hIdx) => {
        if (h.hp <= 0) return;
        const card = document.getElementById(`hero-${hIdx}`);
        let defFactor = h.isDefending ? 0.5 : 1.0;
        if (h.guardTurns > 0) defFactor *= 0.7;
        const dmg = Math.floor((enemy.atk * 1.3 - h.def * 0.3) * defFactor * ((Math.random() * 0.2) + 0.9));
        const finalDmg = Math.max(8, dmg);
        h.hp = Math.max(0, h.hp - finalDmg);
        if (card) {
          card.classList.add('shake');
          setTimeout(() => card.classList.remove('shake'), 300);
          showPopup(`-${finalDmg}`, card, 'normal');
        }
      });
      sounds.playHitSE();
      updateHeroStatusUI();
    } else {
      setMessage(`${enemy.name}の こうげき！`);
      sounds.playAttackSE();
      await sleep(300);

      let defFactor = targetHero.isDefending ? 0.5 : 1.0;
      if (targetHero.guardTurns > 0) defFactor *= 0.7;
      const damage = Math.floor(Math.max(1, (enemy.atk - targetHero.def * 0.5) * defFactor * ((Math.random() * 0.2) + 0.9)));

      targetHero.hp = Math.max(0, targetHero.hp - damage);
      sounds.playHitSE();

      if (heroCard) {
        heroCard.classList.add('shake');
        setTimeout(() => heroCard.classList.remove('shake'), 300);
        showPopup(`-${damage}`, heroCard, 'normal');
      }

      setMessage(`${targetHero.name}は ${damage} のダメージを受けた！`);
      updateHeroStatusUI();
    }

    await sleep(650);

    // 全滅チェック
    if (heroes.every(h => h.hp <= 0)) {
      handleGameOver();
      return;
    }
  }

  // ターン終了処理（防御解除、バフ経過）
  heroes.forEach(h => {
    h.isDefending = false;
    if (h.guardTurns > 0) h.guardTurns--;
  });

  isExecuting = false;
  findNextHeroTurn(0);
}

// 勝利処理
async function handleStageVictory() {
  sounds.stopBGM();
  sounds.playVictorySE();
  setMessage(`魔物たちを すべて討伐した！`);
  await sleep(1500);

  if (currentStageIndex < STAGES.length - 1) {
    // 次のステージへ
    currentStageIndex++;
    // 戦闘間プチ回復（HP/MP 30%回復）
    heroes.forEach(h => {
      if (h.hp > 0) {
        h.hp = Math.min(h.maxHp, h.hp + Math.floor(h.maxHp * 0.3));
        h.mp = Math.min(h.maxMp, h.mp + Math.floor(h.maxMp * 0.3));
      }
    });
    sounds.startBattleBGM();
    loadStage(currentStageIndex);
  } else {
    // 全クリスタル解放！ ゲームクリア！
    showClearModal();
  }
}

// ゲームオーバー処理
function handleGameOver() {
  sounds.stopBGM();
  sounds.playGameOverSE();
  setMessage(`パーティーは 全滅してしまった……`);

  setTimeout(() => {
    modalTitle.textContent = '💀 GAME OVER 💀';
    modalTitle.style.color = '#e74c3c';
    modalSubtitle.textContent = '闇の力に呑まれてしまった…';
    modalDesc.innerHTML = `
      勇者たちの魂は散り散りとなった…<br>
      スキルやアイテムの配分、属性の弱点を見極めて再挑戦しよう！
    `;
    tutorialBox.style.display = 'none';
    startBtn.textContent = 'もう一度挑戦する';
    overlayModal.classList.remove('hidden');
  }, 1200);
}

// クリアモーダル
function showClearModal() {
  modalTitle.textContent = '🎉 CONGRATULATIONS! 🎉';
  modalTitle.style.color = 'var(--gold)';
  modalSubtitle.textContent = '〜 クリスタルに輝きが戻った 〜';
  modalDesc.innerHTML = `
    見事、魔王ダークロードを打ち倒し、世界に平和が訪れました！<br>
    勇者アルス、魔導士エレナ、聖職者セフィアの名は永遠に語り継がれるでしょう！<br><br>
    <strong>🏆 全30本のゲーム開発ロードマップ、堂々完結！</strong>
  `;
  tutorialBox.style.display = 'none';
  startBtn.textContent = '最初からもう一度遊ぶ';
  overlayModal.classList.remove('hidden');
}

// スタートボタン
startBtn.addEventListener('click', () => {
  overlayModal.classList.add('hidden');
  initGame();
});

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
