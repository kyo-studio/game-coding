/**
 * 28 ダンジョン探索ローグライク (Rogue Explorer)
 * 自動生成ダンジョン・視野探索 (Fog of War)・ターン制バトル・装備成長・Web Audio
 */

// ==========================================
// 1. 定数・タイル定義
// ==========================================
const MAP_W = 34;
const MAP_H = 24;
const TILE_SIZE = 22;
const VIEW_RADIUS = 6.5;

const TILE_WALL = 0;
const TILE_FLOOR = 1;
const TILE_STAIRS = 2;

// ==========================================
// 2. Web Audio サウンドエンジン
// ==========================================
class DungeonAudio {
  constructor() {
    this.ctx = null;
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

  // 足音
  playStep() {
    if (!this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const t = this.ctx.currentTime;
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(80, t);
      osc.frequency.exponentialRampToValueAtTime(30, t + 0.05);

      gain.gain.setValueAtTime(0.08, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.05);
    } catch (e) {}
  }

  // 攻撃・斬撃音
  playSlash(isCrit = false) {
    if (!this.ctx) return;
    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(isCrit ? 600 : 350, t);
      osc.frequency.exponentialRampToValueAtTime(80, t + 0.12);

      gain.gain.setValueAtTime(isCrit ? 0.3 : 0.18, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.12);
    } catch (e) {}
  }

  // 被弾音
  playHurt() {
    if (!this.ctx) return;
    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(160, t);
      osc.frequency.exponentialRampToValueAtTime(50, t + 0.1);

      gain.gain.setValueAtTime(0.2, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.1);
    } catch (e) {}
  }

  // ポーション回復音
  playHeal() {
    if (!this.ctx) return;
    try {
      const notes = [440, 554.37, 659.25, 880];
      notes.forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const t = this.ctx.currentTime + idx * 0.06;
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, t);

        gain.gain.setValueAtTime(0.18, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t);
        osc.stop(t + 0.15);
      });
    } catch (e) {}
  }

  // アイテム・装備拾得音
  playPickup() {
    if (!this.ctx) return;
    try {
      const notes = [523.25, 659.25, 783.99];
      notes.forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const t = this.ctx.currentTime + idx * 0.05;
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, t);

        gain.gain.setValueAtTime(0.15, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t);
        osc.stop(t + 0.1);
      });
    } catch (e) {}
  }

  // 魔法（サンダー）発動音
  playMagic() {
    if (!this.ctx) return;
    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(800, t);
      osc.frequency.exponentialRampToValueAtTime(100, t + 0.35);

      gain.gain.setValueAtTime(0.3, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.35);
    } catch (e) {}
  }

  // レベルアップファンファーレ
  playLevelUp() {
    if (!this.ctx) return;
    try {
      const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51];
      notes.forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const t = this.ctx.currentTime + idx * 0.08;
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, t);

        gain.gain.setValueAtTime(0.25, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t);
        osc.stop(t + 0.2);
      });
    } catch (e) {}
  }

  // 階段・フロアクリア音
  playStairs() {
    if (!this.ctx) return;
    try {
      const notes = [440, 554.37, 659.25, 880];
      notes.forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const t = this.ctx.currentTime + idx * 0.08;
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, t);

        gain.gain.setValueAtTime(0.2, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t);
        osc.stop(t + 0.18);
      });
    } catch (e) {}
  }
}

// ==========================================
// 3. ダンジョン生成エンジン
// ==========================================
class DungeonGenerator {
  static generate(floor) {
    const map = Array.from({ length: MAP_H }, () => Array(MAP_W).fill(TILE_WALL));
    const rooms = [];
    const numRooms = 6 + Math.floor(Math.random() * 3); // 6〜8部屋

    for (let i = 0; i < 25 && rooms.length < numRooms; i++) {
      const w = 4 + Math.floor(Math.random() * 5); // 4〜8
      const h = 4 + Math.floor(Math.random() * 4); // 4〜7
      const x = 1 + Math.floor(Math.random() * (MAP_W - w - 2));
      const y = 1 + Math.floor(Math.random() * (MAP_H - h - 2));

      const newRoom = { x, y, w, h, cx: Math.floor(x + w / 2), cy: Math.floor(y + h / 2) };

      // 重なり判定
      const overlaps = rooms.some(r =>
        x < r.x + r.w + 1 && x + w + 1 > r.x &&
        y < r.y + r.h + 1 && y + h + 1 > r.y
      );

      if (!overlaps) {
        rooms.push(newRoom);
        // 部屋を床で掘る
        for (let ry = y; ry < y + h; ry++) {
          for (let rx = x; rx < x + w; rx++) {
            map[ry][rx] = TILE_FLOOR;
          }
        }
      }
    }

    // 通路接続 (前後の部屋同士をL字通路で繋ぐ)
    for (let i = 0; i < rooms.length - 1; i++) {
      const r1 = rooms[i];
      const r2 = rooms[i + 1];

      let cx = r1.cx;
      let cy = r1.cy;

      while (cx !== r2.cx) {
        map[cy][cx] = TILE_FLOOR;
        cx += (r2.cx > cx) ? 1 : -1;
      }
      while (cy !== r2.cy) {
        map[cy][cx] = TILE_FLOOR;
        cy += (r2.cy > cy) ? 1 : -1;
      }
    }

    // プレイヤー開始位置 (部屋0)
    const playerStart = { x: rooms[0].cx, y: rooms[0].cy };

    // 階段位置 (最後の部屋)
    const lastRoom = rooms[rooms.length - 1];
    let stairs = { x: lastRoom.cx, y: lastRoom.cy };
    if (floor < 5) {
      map[stairs.y][stairs.x] = TILE_STAIRS;
    }

    // 敵・アイテムの配置
    const enemies = [];
    const items = [];

    rooms.forEach((room, idx) => {
      if (idx === 0) return; // 開始部屋には敵を置かない

      // ボスフロア (B5F) の最後の部屋にはボスのみ配置
      if (floor === 5 && idx === rooms.length - 1) {
        enemies.push({
          type: 'boss',
          name: 'ヘル・ドラゴン',
          x: room.cx,
          y: room.cy,
          hp: 90,
          maxHp: 90,
          atk: 18,
          def: 6,
          exp: 250,
          icon: '🐉'
        });
        return;
      }

      // 通常モンスター配置 (部屋ごとに1〜3体)
      const numEnemies = 1 + Math.floor(Math.random() * 2);
      for (let e = 0; e < numEnemies; e++) {
        const ex = room.x + 1 + Math.floor(Math.random() * (room.w - 2));
        const ey = room.y + 1 + Math.floor(Math.random() * (room.h - 2));

        const roll = Math.random();
        if (floor <= 2) {
          if (roll < 0.6) {
            enemies.push({ type: 'slime', name: 'スライム', x: ex, y: ey, hp: 12, maxHp: 12, atk: 5, def: 1, exp: 10, icon: '🟢', slow: true, turnCount: 0 });
          } else {
            enemies.push({ type: 'bat', name: 'ダークバット', x: ex, y: ey, hp: 14, maxHp: 14, atk: 7, def: 2, exp: 15, icon: '🦇' });
          }
        } else {
          if (roll < 0.35) {
            enemies.push({ type: 'bat', name: 'ダークバット', x: ex, y: ey, hp: 18, maxHp: 18, atk: 9, def: 2, exp: 20, icon: '🦇' });
          } else if (roll < 0.75) {
            enemies.push({ type: 'skeleton', name: 'スケルトン', x: ex, y: ey, hp: 28, maxHp: 28, atk: 12, def: 4, exp: 35, icon: '💀' });
          } else {
            enemies.push({ type: 'ogre', name: 'オーガ戦士', x: ex, y: ey, hp: 42, maxHp: 42, atk: 15, def: 5, exp: 60, icon: '👹' });
          }
        }
      }

      // アイテム配置 (70%の確率で部屋に1個)
      if (Math.random() < 0.7) {
        const ix = room.x + Math.floor(Math.random() * room.w);
        const iy = room.y + Math.floor(Math.random() * room.h);
        const itemRoll = Math.random();

        if (itemRoll < 0.45) {
          items.push({ type: 'potion', name: '回復薬', x: ix, y: iy, icon: '🧪', heal: 25 });
        } else if (itemRoll < 0.70) {
          items.push({ type: 'sword', name: 'ルーンソード', x: ix, y: iy, icon: '⚔️', atkBonus: 3 });
        } else if (itemRoll < 0.88) {
          items.push({ type: 'shield', name: 'ミスリル盾', x: ix, y: iy, icon: '🛡️', defBonus: 2 });
        } else {
          items.push({ type: 'scroll', name: 'サンダーの巻物', x: ix, y: iy, icon: '📜' });
        }
      }
    });

    return { map, rooms, playerStart, stairs, enemies, items };
  }
}

// ==========================================
// 4. メインゲームクラス (RogueExplorer)
// ==========================================
class RogueExplorer {
  constructor() {
    this.canvas = document.getElementById('gameCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.audio = new DungeonAudio();

    this.canvas.width = 340;
    this.canvas.height = 220;

    // DOM要素
    this.floorDisplay = document.getElementById('floor-display');
    this.levelDisplay = document.getElementById('level-display');
    this.hpText = document.getElementById('hp-text');
    this.hpBarFill = document.getElementById('hp-bar-fill');
    this.atkDisplay = document.getElementById('atk-display');
    this.defDisplay = document.getElementById('def-display');
    this.scrollDisplay = document.getElementById('scroll-display');
    this.logText = document.getElementById('log-text');

    this.startOverlay = document.getElementById('start-overlay');
    this.stairsOverlay = document.getElementById('stairs-overlay');
    this.gameclearOverlay = document.getElementById('gameclear-overlay');
    this.gameoverOverlay = document.getElementById('gameover-overlay');

    this.stairsDesc = document.getElementById('stairs-desc');
    this.clearLevel = document.getElementById('clear-level');
    this.clearKills = document.getElementById('clear-kills');
    this.clearScore = document.getElementById('clear-score');
    this.finalFloor = document.getElementById('final-floor');
    this.finalKills = document.getElementById('final-kills');
    this.finalScore = document.getElementById('final-score');

    this.startBtn = document.getElementById('start-btn');
    this.nextFloorBtn = document.getElementById('next-floor-btn');
    this.clearRestartBtn = document.getElementById('clear-restart-btn');
    this.restartBtn = document.getElementById('restart-btn');

    // プレイヤーパラメータ
    this.player = {
      x: 0,
      y: 0,
      hp: 30,
      maxHp: 30,
      atk: 8,
      def: 3,
      level: 1,
      exp: 0,
      nextExp: 20,
      scrolls: 1,
      floor: 1,
      kills: 0,
      score: 0,
      turns: 0
    };

    // ダンジョンデータ
    this.map = [];
    this.rooms = [];
    this.enemies = [];
    this.items = [];
    this.stairs = { x: 0, y: 0 };
    this.explored = Array.from({ length: MAP_H }, () => Array(MAP_W).fill(false));
    this.visible = Array.from({ length: MAP_H }, () => Array(MAP_W).fill(false));

    // エフェクト & ポップアップ
    this.popups = []; // [{ text, x, y, color, life }]
    this.slashAnim = null; // { x, y, life }
    this.thunderAnim = 0;

    this.isPlaying = false;
    this.initEvents();
  }

  startGame() {
    this.audio.init();
    this.player = {
      x: 0,
      y: 0,
      hp: 30,
      maxHp: 30,
      atk: 8,
      def: 3,
      level: 1,
      exp: 0,
      nextExp: 20,
      scrolls: 1,
      floor: 1,
      kills: 0,
      score: 0,
      turns: 0
    };

    this.loadFloor(1);
    this.isPlaying = true;

    this.startOverlay.classList.add('hidden');
    this.stairsOverlay.classList.add('hidden');
    this.gameclearOverlay.classList.add('hidden');
    this.gameoverOverlay.classList.add('hidden');

    this.setLog('迷宮B1Fの探索を開始した。最深部B5Fを目指せ！');
    this.render();
  }

  loadFloor(floorNum) {
    this.player.floor = floorNum;
    const data = DungeonGenerator.generate(floorNum);
    this.map = data.map;
    this.rooms = data.rooms;
    this.player.x = data.playerStart.x;
    this.player.y = data.playerStart.y;
    this.stairs = data.stairs;
    this.enemies = data.enemies;
    this.items = data.items;

    this.explored = Array.from({ length: MAP_H }, () => Array(MAP_W).fill(false));
    this.visible = Array.from({ length: MAP_H }, () => Array(MAP_W).fill(false));

    this.updateFOV();
    this.updateHUD();
  }

  // ==========================================
  // 5. 視野計算 (Fog of War)
  // ==========================================
  updateFOV() {
    for (let y = 0; y < MAP_H; y++) {
      for (let x = 0; x < MAP_W; x++) {
        this.visible[y][x] = false;
      }
    }

    const px = this.player.x;
    const py = this.player.y;

    // 半径内の光線投射
    for (let r = 0; r < 360; r += 3) {
      const rad = (r * Math.PI) / 180;
      const cos = Math.cos(rad);
      const sin = Math.sin(rad);

      for (let d = 0; d <= VIEW_RADIUS; d += 0.5) {
        const tx = Math.round(px + cos * d);
        const ty = Math.round(py + sin * d);

        if (tx < 0 || tx >= MAP_W || ty < 0 || ty >= MAP_H) break;

        this.visible[ty][tx] = true;
        this.explored[ty][tx] = true;

        if (this.map[ty][tx] === TILE_WALL) {
          break; // 壁で視線遮断
        }
      }
    }
  }

  // ==========================================
  // 6. プレイヤー行動 & ターン処理
  // ==========================================
  movePlayer(dx, dy) {
    if (!this.isPlaying) return;

    const nx = this.player.x + dx;
    const ny = this.player.y + dy;

    if (nx < 0 || nx >= MAP_W || ny < 0 || ny >= MAP_H) return;

    // 1. 移動先に敵がいるか？ -> 攻撃
    const targetEnemy = this.enemies.find(e => e.x === nx && e.y === ny);
    if (targetEnemy) {
      this.attackEnemy(targetEnemy);
      this.endPlayerTurn();
      return;
    }

    // 2. 壁でなければ移動
    if (this.map[ny][nx] !== TILE_WALL) {
      this.player.x = nx;
      this.player.y = ny;
      this.audio.playStep();

      // アイテム取得判定
      this.checkItemPickup(nx, ny);

      // 階段判定
      if (this.map[ny][nx] === TILE_STAIRS) {
        this.handleStairs();
        return;
      }

      this.endPlayerTurn();
    }
  }

  // 足踏み待機 (WAIT)
  waitTurn() {
    if (!this.isPlaying) return;
    this.setLog('その場で待機し、周囲の様子を伺った。');
    this.endPlayerTurn();
  }

  // 全体魔法（サンダーの巻物）
  castMagic() {
    if (!this.isPlaying) return;
    if (this.player.scrolls <= 0) {
      this.setLog('巻物を持っていません！');
      return;
    }

    this.player.scrolls--;
    this.thunderAnim = 0.35;
    this.audio.playMagic();
    this.setLog('サンダーの巻物を詠唱！ 部屋全体の敵を電撃が貫く！');

    let hitCount = 0;
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      if (this.visible[e.y][e.x]) {
        e.hp -= 35;
        this.addPopup('35⚡', e.x, e.y, '#c084fc');
        hitCount++;

        if (e.hp <= 0) {
          this.handleEnemyDefeat(e, i);
        }
      }
    }

    if (hitCount === 0) {
      this.setLog('視界に敵はいなかったが、雷鳴が轟いた。');
    }

    this.endPlayerTurn();
  }

  // プレイヤーの通常攻撃
  attackEnemy(enemy) {
    const isCrit = Math.random() < 0.18;
    const baseDmg = Math.max(1, this.player.atk - enemy.def + Math.floor(Math.random() * 3) - 1);
    const dmg = isCrit ? Math.floor(baseDmg * 1.8) : baseDmg;

    enemy.hp -= dmg;
    this.slashAnim = { x: enemy.x, y: enemy.y, life: 0.2 };
    this.audio.playSlash(isCrit);

    if (isCrit) {
      this.addPopup(`CRIT ${dmg}!`, enemy.x, enemy.y, '#fbbf24');
      this.setLog(`会心の一撃！ ${enemy.name} に ${dmg} の大ダメージ！`);
    } else {
      this.addPopup(`${dmg}`, enemy.x, enemy.y, '#ffffff');
      this.setLog(`${enemy.name} に ${dmg} のダメージを与えた！`);
    }

    if (enemy.hp <= 0) {
      const idx = this.enemies.indexOf(enemy);
      if (idx !== -1) {
        this.handleEnemyDefeat(enemy, idx);
      }
    }
  }

  // 敵撃破処理
  handleEnemyDefeat(enemy, idx) {
    this.enemies.splice(idx, 1);
    this.player.kills++;
    this.player.score += enemy.exp * 10;
    this.player.exp += enemy.exp;
    this.setLog(`${enemy.name} を倒した！（+${enemy.exp} EXP）`);

    // ボス撃破判定
    if (enemy.type === 'boss') {
      this.handleGameClear();
      return;
    }

    // レベルアップ判定
    if (this.player.exp >= this.player.nextExp) {
      this.levelUp();
    }
  }

  // レベルアップ
  levelUp() {
    this.player.level++;
    this.player.exp -= this.player.nextExp;
    this.player.nextExp = Math.floor(this.player.nextExp * 1.5);

    this.player.maxHp += 8;
    this.player.hp = this.player.maxHp; // 全快
    this.player.atk += 3;
    this.player.def += 1;

    this.audio.playLevelUp();
    this.addPopup('LEVEL UP!', this.player.x, this.player.y, '#fbbf24');
    this.setLog(`✨ レベルアップ！ LV ${this.player.level} に到達！ HPが全回復した！`);
  }

  // アイテム取得
  checkItemPickup(x, y) {
    const itemIdx = this.items.findIndex(it => it.x === x && it.y === y);
    if (itemIdx === -1) return;

    const item = this.items[itemIdx];
    this.items.splice(itemIdx, 1);

    if (item.type === 'potion') {
      this.player.hp = Math.min(this.player.maxHp, this.player.hp + item.heal);
      this.audio.playHeal();
      this.addPopup(`+${item.heal} HP`, x, y, '#34d399');
      this.setLog(`🧪 ${item.name} を使用した！ HPが ${item.heal} 回復！`);
    } else if (item.type === 'sword') {
      this.player.atk += item.atkBonus;
      this.audio.playPickup();
      this.addPopup(`ATK +${item.atkBonus}`, x, y, '#f87171');
      this.setLog(`⚔️ ${item.name} を手に入れた！ 攻撃力が ${item.atkBonus} 上昇！`);
    } else if (item.type === 'shield') {
      this.player.def += item.defBonus;
      this.audio.playPickup();
      this.addPopup(`DEF +${item.defBonus}`, x, y, '#38bdf8');
      this.setLog(`🛡️ ${item.name} を手に入れた！ 防御力が ${item.defBonus} 上昇！`);
    } else if (item.type === 'scroll') {
      this.player.scrolls++;
      this.audio.playPickup();
      this.addPopup(`巻物+1`, x, y, '#c084fc');
      this.setLog(`📜 ${item.name} を拾った！ 魔法ボタンで部屋全体攻撃が可能！`);
    }
  }

  // 階段到達
  handleStairs() {
    this.audio.playStairs();
    if (this.player.floor < 5) {
      this.stairsDesc.textContent = `B${this.player.floor + 1}F へ進みます...`;
      this.stairsOverlay.classList.remove('hidden');
    }
  }

  // プレイヤーターン終了 -> 自然回復 ＆ 敵AIターン
  endPlayerTurn() {
    this.player.turns++;

    // 自然回復 (8ターンに1 HP)
    if (this.player.turns % 8 === 0 && this.player.hp < this.player.maxHp) {
      this.player.hp++;
    }

    // 敵ターン実行
    this.processEnemyTurns();

    this.updateFOV();
    this.updateHUD();
    this.render();
  }

  // 敵の行動AI
  processEnemyTurns() {
    const px = this.player.x;
    const py = this.player.y;

    for (const e of this.enemies) {
      // スライムは2ターンに1回行動
      if (e.slow) {
        e.turnCount = (e.turnCount || 0) + 1;
        if (e.turnCount % 2 === 1) continue;
      }

      const dist = Math.hypot(px - e.x, py - e.y);

      // 隣接しているならプレイヤーへ攻撃！
      if (Math.abs(px - e.x) + Math.abs(py - e.y) === 1) {
        const dmg = Math.max(1, e.atk - this.player.def + Math.floor(Math.random() * 2));
        this.player.hp -= dmg;
        this.audio.playHurt();
        this.addPopup(`-${dmg}`, px, py, '#ef4444');
        this.setLog(`💥 ${e.name} の攻撃！ ${dmg} のダメージを受けた！`);

        if (this.player.hp <= 0) {
          this.handleGameOver();
          return;
        }
        continue;
      }

      // 視界内・または近距離 (dist <= 7) ならプレイヤーへ追従移動
      if (dist <= 7 && this.visible[e.y][e.x]) {
        const dx = Math.sign(px - e.x);
        const dy = Math.sign(py - e.y);

        // X軸またはY軸に1歩近づく
        let nx = e.x;
        let ny = e.y;

        if (Math.abs(px - e.x) > Math.abs(py - e.y)) {
          nx += dx;
          if (this.isWalkableForEnemy(nx, ny)) {
            e.x = nx;
            continue;
          }
        }

        ny += dy;
        if (this.isWalkableForEnemy(e.x, ny)) {
          e.y = ny;
        } else if (this.isWalkableForEnemy(e.x + dx, e.y)) {
          e.x += dx;
        }
      }
    }
  }

  isWalkableForEnemy(x, y) {
    if (x < 0 || x >= MAP_W || y < 0 || y >= MAP_H) return false;
    if (this.map[y][x] === TILE_WALL) return false;
    if (this.player.x === x && this.player.y === y) return false;
    if (this.enemies.some(e => e.x === x && e.y === y)) return false;
    return true;
  }

  // ゲームオーバー
  handleGameOver() {
    this.isPlaying = false;
    this.finalFloor.textContent = `B${this.player.floor}F`;
    this.finalKills.textContent = this.player.kills;
    this.finalScore.textContent = this.player.score;
    this.gameoverOverlay.classList.remove('hidden');
  }

  // ゲームクリア
  handleGameClear() {
    this.isPlaying = false;
    this.clearLevel.textContent = `LV ${this.player.level}`;
    this.clearKills.textContent = this.player.kills;
    this.clearScore.textContent = this.player.score + 2000; // クリアボーナス
    this.gameclearOverlay.classList.remove('hidden');
  }

  // ==========================================
  // 7. レンダリング & ミニマップ
  // ==========================================
  addPopup(text, tx, ty, color) {
    this.popups.push({ text, tx, ty, color, life: 0.6, maxLife: 0.6 });
  }

  setLog(msg) {
    this.logText.textContent = msg;
  }

  updateHUD() {
    this.floorDisplay.textContent = `B${this.player.floor}F`;
    this.levelDisplay.textContent = `LV ${this.player.level}`;
    this.hpText.textContent = `${Math.max(0, this.player.hp)}/${this.player.maxHp}`;
    this.hpBarFill.style.width = `${Math.max(0, (this.player.hp / this.player.maxHp) * 100)}%`;
    this.atkDisplay.textContent = this.player.atk;
    this.defDisplay.textContent = this.player.def;
    this.scrollDisplay.textContent = this.player.scrolls;
  }

  render() {
    const { ctx, canvas } = this;

    // カメラ位置計算 (プレイヤー中心)
    const camX = Math.max(0, Math.min(this.player.x * TILE_SIZE - canvas.width / 2 + TILE_SIZE / 2, MAP_W * TILE_SIZE - canvas.width));
    const camY = Math.max(0, Math.min(this.player.y * TILE_SIZE - canvas.height / 2 + TILE_SIZE / 2, MAP_H * TILE_SIZE - canvas.height));

    // 背景クリア
    ctx.fillStyle = '#020617';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.translate(-Math.floor(camX), -Math.floor(camY));

    // 1. ダンジョンタイル描画
    for (let y = 0; y < MAP_H; y++) {
      for (let x = 0; x < MAP_W; x++) {
        const isExplored = this.explored[y][x];
        const isVisible = this.visible[y][x];

        if (!isExplored) continue; // 未探索は暗闇

        const px = x * TILE_SIZE;
        const py = y * TILE_SIZE;
        const tile = this.map[y][x];

        if (tile === TILE_WALL) {
          // 壁
          ctx.fillStyle = isVisible ? '#334155' : '#1e293b';
          ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
          ctx.strokeStyle = isVisible ? '#475569' : '#0f172a';
          ctx.strokeRect(px + 1, py + 1, TILE_SIZE - 2, TILE_SIZE - 2);
        } else {
          // 床
          ctx.fillStyle = isVisible ? '#0f172a' : '#090d16';
          ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
          ctx.strokeStyle = isVisible ? '#1e293b' : '#020617';
          ctx.strokeRect(px, py, TILE_SIZE, TILE_SIZE);

          if (tile === TILE_STAIRS) {
            // 階段 (視界外でも探索済みなら表示)
            ctx.font = '14px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('🪜', px + TILE_SIZE / 2, py + TILE_SIZE / 2);
          }
        }
      }
    }

    // 2. アイテム描画 (視界内のみ)
    for (const item of this.items) {
      if (this.visible[item.y][item.x]) {
        const ix = item.x * TILE_SIZE + TILE_SIZE / 2;
        const iy = item.y * TILE_SIZE + TILE_SIZE / 2;
        ctx.font = '14px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(item.icon, ix, iy);
      }
    }

    // 3. 敵キャラクター描画 (視界内のみ)
    for (const e of this.enemies) {
      if (this.visible[e.y][e.x]) {
        const ex = e.x * TILE_SIZE + TILE_SIZE / 2;
        const ey = e.y * TILE_SIZE + TILE_SIZE / 2;

        ctx.font = e.type === 'boss' ? '20px sans-serif' : '15px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(e.icon, ex, ey);

        // HPバー
        const hpRatio = Math.max(0, e.hp / e.maxHp);
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(ex - 8, ey - 12, 16, 3);
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(ex - 8, ey - 12, 16 * hpRatio, 3);
      }
    }

    // 4. プレイヤー描画
    const px = this.player.x * TILE_SIZE + TILE_SIZE / 2;
    const py = this.player.y * TILE_SIZE + TILE_SIZE / 2;

    ctx.font = '16px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🧙‍♂️', px, py);

    // 5. 斬撃エフェクト
    if (this.slashAnim && this.slashAnim.life > 0) {
      const sx = this.slashAnim.x * TILE_SIZE + TILE_SIZE / 2;
      const sy = this.slashAnim.y * TILE_SIZE + TILE_SIZE / 2;
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(sx, sy, 10, 0, Math.PI * 1.5);
      ctx.stroke();
      this.slashAnim.life -= 0.05;
    }

    // 6. 全体魔法サンダーエフェクト
    if (this.thunderAnim > 0) {
      ctx.fillStyle = `rgba(192, 132, 252, ${this.thunderAnim})`;
      ctx.fillRect(0, 0, MAP_W * TILE_SIZE, MAP_H * TILE_SIZE);
      this.thunderAnim -= 0.05;
    }

    // 7. ポップアップテキスト
    for (let i = this.popups.length - 1; i >= 0; i--) {
      const pop = this.popups[i];
      const tx = pop.tx * TILE_SIZE + TILE_SIZE / 2;
      const ty = pop.ty * TILE_SIZE - (1.0 - pop.life / pop.maxLife) * 12;

      ctx.fillStyle = pop.color;
      ctx.shadowColor = pop.color;
      ctx.shadowBlur = 6;
      ctx.font = 'bold 12px sans-serif';
      ctx.fillText(pop.text, tx, ty);
      ctx.shadowBlur = 0;

      pop.life -= 0.05;
      if (pop.life <= 0) this.popups.splice(i, 1);
    }

    ctx.restore();

    // 8. ミニマップ描画 (右上に透過表示)
    this.drawMiniMap(ctx);
  }

  // ミニマップ (右上に全体マップの探索状況を俯瞰表示)
  drawMiniMap(ctx) {
    const mw = 68;
    const mh = 48;
    const mx = this.canvas.width - mw - 6;
    const my = 6;

    ctx.save();
    ctx.fillStyle = 'rgba(2, 6, 23, 0.75)';
    ctx.fillRect(mx, my, mw, mh);
    ctx.strokeStyle = '#334155';
    ctx.strokeRect(mx, my, mw, mh);

    const scaleX = mw / MAP_W;
    const scaleY = mh / MAP_H;

    for (let y = 0; y < MAP_H; y++) {
      for (let x = 0; x < MAP_W; x++) {
        if (!this.explored[y][x]) continue;

        if (this.map[y][x] === TILE_FLOOR) {
          ctx.fillStyle = this.visible[y][x] ? '#64748b' : '#334155';
          ctx.fillRect(mx + x * scaleX, my + y * scaleY, scaleX, scaleY);
        } else if (this.map[y][x] === TILE_STAIRS) {
          ctx.fillStyle = '#fbbf24';
          ctx.fillRect(mx + x * scaleX, my + y * scaleY, scaleX + 1, scaleY + 1);
        }
      }
    }

    // プレイヤー位置 (グリーン点滅点)
    ctx.fillStyle = '#10b981';
    ctx.fillRect(mx + this.player.x * scaleX, my + this.player.y * scaleY, 2.5, 2.5);

    ctx.restore();
  }

  // ==========================================
  // 8. イベントハンドリング
  // ==========================================
  initEvents() {
    // 1. キーボード操作
    window.addEventListener('keydown', (e) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
        e.preventDefault();
      }

      switch (e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          this.movePlayer(0, -1);
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          this.movePlayer(0, 1);
          break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
          this.movePlayer(-1, 0);
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          this.movePlayer(1, 0);
          break;
        case ' ':
          this.waitTurn();
          break;
        case 'm':
        case 'M':
          this.castMagic();
          break;
      }
    });

    // 2. モバイル十字キー & アクションボタン
    const padButtons = document.querySelectorAll('.pad-btn');
    padButtons.forEach(btn => {
      const act = btn.dataset.act;

      btn.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        this.audio.init();

        if (act === 'up') this.movePlayer(0, -1);
        else if (act === 'down') this.movePlayer(0, 1);
        else if (act === 'left') this.movePlayer(-1, 0);
        else if (act === 'right') this.movePlayer(1, 0);
        else if (act === 'wait') this.waitTurn();
        else if (act === 'magic') this.castMagic();
      });
    });

    // 3. オーバーレイボタン
    this.startBtn.addEventListener('click', () => this.startGame());
    this.nextFloorBtn.addEventListener('click', () => {
      this.stairsOverlay.classList.add('hidden');
      this.loadFloor(this.player.floor + 1);
      this.setLog(`B${this.player.floor}F へ降りた。周囲を警戒せよ！`);
      this.render();
    });
    this.clearRestartBtn.addEventListener('click', () => this.startGame());
    this.restartBtn.addEventListener('click', () => this.startGame());
  }
}

// ==========================================
// iOS / iPadOS Safari ズーム抑止
// ==========================================
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

// ゲーム起動
window.addEventListener('DOMContentLoaded', () => {
  new RogueExplorer();
});
