/**
 * 27 リズムゲーム (Rhythm Beat / ビートマスター)
 * Web Audioリアルタイムシンセ・音ズレゼロ同期・4レーン・ロングノーツ・ミリ秒判定
 */

// ==========================================
// 1. 定数・設定
// ==========================================
const CANVAS_W = 340;
const CANVAS_H = 260;
const JUDGE_Y = 215;
const SCROLL_SPEED = 320; // 落下速度 (px/sec)
const NOTE_TRAVEL_TIME = JUDGE_Y / SCROLL_SPEED; // 画面上部から判定ラインまでの到達時間 (約0.67秒)

const LANE_COLORS = ['#06b6d4', '#ec4899', '#fbbf24', '#10b981'];
const LANE_NAMES = ['D', 'F', 'J', 'K'];

// 判定閾値 (秒)
const JUDGE_PERFECT = 0.050; // ±50ms
const JUDGE_GREAT   = 0.095; // ±95ms
const JUDGE_GOOD    = 0.145; // ±145ms
const LEAD_IN_TIME  = 2.2;   // 2.2秒の準備＆カウントイン時間 (最初のノーツが落ち着いて見える)

// ==========================================
// 2. Web Audio シンセサイザー & BGMシーケンサー
// ==========================================
class RhythmAudioEngine {
  constructor() {
    this.ctx = null;
    this.isPlaying = false;
    this.startTime = 0;
    this.currentTrack = 0;
    this.bpm = 120;
    this.scheduledEvents = [];
    this.scheduleTimer = null;
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

  // キックドラム
  playKick(time) {
    if (!this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.frequency.setValueAtTime(140, time);
      osc.frequency.exponentialRampToValueAtTime(35, time + 0.12);

      gain.gain.setValueAtTime(0.35, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.12);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(time);
      osc.stop(time + 0.12);
    } catch (e) {}
  }

  // スネアドラム
  playSnare(time) {
    if (!this.ctx) return;
    try {
      // ノイズ
      const bufferSize = this.ctx.sampleRate * 0.1;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.18, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.1);

      noise.connect(gain);
      gain.connect(this.ctx.destination);
      noise.start(time);
      noise.stop(time + 0.1);
    } catch (e) {}
  }

  // ハイハット
  playHiHat(time) {
    if (!this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'highpass';
      osc.frequency.setValueAtTime(7000, time);

      gain.gain.setValueAtTime(0.06, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.04);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(time);
      osc.stop(time + 0.04);
    } catch (e) {}
  }

  // シンセリード音
  playSynth(freq, time, dur = 0.12) {
    if (!this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, time);

      gain.gain.setValueAtTime(0.12, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + dur);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(time);
      osc.stop(time + dur);
    } catch (e) {}
  }

  // ヒットサウンド (PERFECT / GREAT 叩き音)
  playHitSound(type = 'perfect') {
    if (!this.ctx) return;
    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';

      const freq = type === 'perfect' ? 1200 : (type === 'great' ? 900 : 600);
      osc.frequency.setValueAtTime(freq, t);
      osc.frequency.exponentialRampToValueAtTime(300, t + 0.06);

      gain.gain.setValueAtTime(0.25, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.06);
    } catch (e) {}
  }

  // 楽曲シーケンススケジュール開始
  startSong(trackIdx) {
    this.init();
    this.currentTrack = trackIdx;
    this.isPlaying = true;
    this.bpm = trackIdx === 0 ? 120 : 142;
    this.startTime = this.ctx.currentTime + 0.25;

    const beatSec = 60 / this.bpm;
    const totalMeasures = 24; // 24小節 (約48〜40秒)

    // カウントインクリック (3, 2, 1, GO!)
    const countInterval = LEAD_IN_TIME / 4;
    for (let c = 0; c < 4; c++) {
      const ct = this.startTime + c * countInterval;
      this.playHiHat(ct);
      this.playSynth(c === 3 ? 880 : 523.25, ct, 0.07);
    }

    const melody1 = [
      440, 523.25, 659.25, 587.33,
      440, 523.25, 783.99, 659.25,
      392, 493.88, 587.33, 523.25,
      349.23, 440, 523.25, 392
    ];

    const melody2 = [
      587.33, 659.25, 783.99, 880,
      1046.5, 880, 783.99, 659.25,
      523.25, 659.25, 783.99, 659.25,
      440, 523.25, 659.25, 587.33
    ];

    const melody = trackIdx === 0 ? melody1 : melody2;

    // 全小節のBGMをAudioContextスケジュール (LEAD_IN_TIME 後から楽曲スタート)
    for (let m = 0; m < totalMeasures; m++) {
      const measureTime = this.startTime + LEAD_IN_TIME + m * 4 * beatSec;

      // 4拍ドラム
      for (let b = 0; b < 4; b++) {
        const beatTime = measureTime + b * beatSec;
        if (b === 0 || b === 2) {
          this.playKick(beatTime);
        } else {
          this.playSnare(beatTime);
        }
        this.playHiHat(beatTime);
        this.playHiHat(beatTime + beatSec * 0.5);

        // メロディ音
        const noteIdx = (m * 4 + b) % melody.length;
        this.playSynth(melody[noteIdx], beatTime, beatSec * 0.8);
      }
    }

    return {
      startTime: this.startTime,
      duration: LEAD_IN_TIME + totalMeasures * 4 * beatSec
    };
  }

  stopSong() {
    this.isPlaying = false;
  }

  getCurrentTime() {
    if (!this.ctx || !this.isPlaying) return 0;
    return this.ctx.currentTime - this.startTime;
  }
}

// ==========================================
// 3. パーティクル & エフェクト管理
// ==========================================
class ParticleManager {
  constructor() {
    this.particles = [];
    this.popups = []; // 判定テキスト [{ text, x, y, color, life, scale }]
  }

  addHitEffect(x, y, color, count = 12) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.5 + Math.random() * 4.5;
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1,
        size: 3 + Math.random() * 3.5,
        color,
        alpha: 1,
        life: 0.35,
        maxLife: 0.35
      });
    }
  }

  addJudgement(text, color) {
    this.popups.push({
      text,
      x: CANVAS_W / 2,
      y: JUDGE_Y - 45,
      color,
      life: 0.45,
      maxLife: 0.45,
      scale: 1.4
    });
  }

  update(dt) {
    // パーティクル
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life -= dt;
      p.alpha = Math.max(0, p.life / p.maxLife);
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }

    // 判定ポップアップ
    for (let i = this.popups.length - 1; i >= 0; i--) {
      const pop = this.popups[i];
      pop.life -= dt;
      pop.scale = 1.0 + (pop.life / pop.maxLife) * 0.4;
      if (pop.life <= 0) {
        this.popups.splice(i, 1);
      }
    }
  }

  draw(ctx) {
    ctx.save();

    // パーティクル
    for (const p of this.particles) {
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }

    // 判定テキスト
    for (const pop of this.popups) {
      const alpha = Math.min(1, pop.life / 0.15);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = pop.color;
      ctx.shadowColor = pop.color;
      ctx.shadowBlur = 10;
      ctx.font = `900 ${Math.floor(20 * pop.scale)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(pop.text, pop.x, pop.y);
    }

    ctx.restore();
  }
}

// ==========================================
// 4. メインゲームクラス (RhythmBeat)
// ==========================================
class RhythmBeat {
  constructor() {
    this.canvas = document.getElementById('gameCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.audio = new RhythmAudioEngine();
    this.effects = new ParticleManager();

    this.canvas.width = CANVAS_W;
    this.canvas.height = CANVAS_H;

    // DOM要素
    this.trackNameDisplay = document.getElementById('track-name');
    this.scoreDisplay = document.getElementById('score-display');
    this.comboDisplay = document.getElementById('combo-display');
    this.gaugeFill = document.getElementById('gauge-fill');

    this.startOverlay = document.getElementById('start-overlay');
    this.resultOverlay = document.getElementById('result-overlay');
    this.gameoverOverlay = document.getElementById('gameover-overlay');
    this.startBtn = document.getElementById('start-btn');
    this.retryBtn = document.getElementById('retry-btn');
    this.selectSongBtn = document.getElementById('select-song-btn');
    this.gameoverRetryBtn = document.getElementById('gameover-retry-btn');

    this.resultRank = document.getElementById('result-rank');
    this.resultScore = document.getElementById('result-score');
    this.resultMaxCombo = document.getElementById('result-max-combo');
    this.countPerfect = document.getElementById('count-perfect');
    this.countGreat = document.getElementById('count-great');
    this.countGood = document.getElementById('count-good');
    this.countMiss = document.getElementById('count-miss');
    this.newRecordBadge = document.getElementById('new-record-badge');
    this.trackBtns = document.querySelectorAll('.track-btn');
    this.laneBtns = document.querySelectorAll('.lane-btn');

    // ゲーム状態
    this.selectedTrack = 0;
    this.isPlaying = false;
    this.isFinished = false;
    this.score = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.gauge = 100; // 0〜100
    this.songDuration = 0;

    this.stats = { perfect: 0, great: 0, good: 0, miss: 0 };
    this.notes = []; // [{ lane, time, duration, hit, holding, holdProgress, missed }]
    this.lanePressed = [false, false, false, false];
    this.laneHitAnim = [0, 0, 0, 0]; // レーン発光タイマー

    this.lastTime = performance.now();

    this.initEvents();
    requestAnimationFrame((t) => this.gameLoop(t));
  }

  loadBestScore(trackIdx) {
    try {
      return parseInt(localStorage.getItem(`rhythm_beat_best_${trackIdx}`), 10) || 0;
    } catch (e) {
      return 0;
    }
  }

  saveBestScore(trackIdx, val) {
    const prev = this.loadBestScore(trackIdx);
    if (val > prev) {
      try {
        localStorage.setItem(`rhythm_beat_best_${trackIdx}`, val);
      } catch (e) {}
      return true;
    }
    return false;
  }

  // 譜面自動生成 (BPMベース)
  generateChart(trackIdx) {
    const bpm = trackIdx === 0 ? 120 : 142;
    const beatSec = 60 / bpm;
    const totalMeasures = 24;
    const notes = [];

    // パターン生成 (LEAD_IN_TIME 後からノーツ開始)
    for (let m = 0; m < totalMeasures; m++) {
      const measureTime = LEAD_IN_TIME + m * 4 * beatSec;

      if (trackIdx === 0) {
        // Track 1 (EASY): 4つ打ち + 8分音符
        for (let b = 0; b < 4; b++) {
          const t = measureTime + b * beatSec;
          const lane = (m + b) % 4;
          notes.push({ lane, time: t, duration: 0, hit: false, holding: false, holdProgress: 0, missed: false });

          // 2小節に1回、8分裏打ち
          if (m % 2 === 1 && b % 2 === 0) {
            notes.push({ lane: (lane + 2) % 4, time: t + beatSec * 0.5, duration: 0, hit: false, holding: false, holdProgress: 0, missed: false });
          }

          // 4小節に1回、ロングノーツ
          if (b === 3 && m % 4 === 3) {
            notes.push({ lane: (lane + 1) % 4, time: t, duration: beatSec * 1.5, hit: false, holding: false, holdProgress: 0, missed: false });
          }
        }
      } else {
        // Track 2 (HARD): 8分音符連打 + 16分音符 + ロングノーツ複合
        for (let b = 0; b < 4; b++) {
          const t = measureTime + b * beatSec;
          const lane = (m * 2 + b) % 4;

          notes.push({ lane, time: t, duration: 0, hit: false, holding: false, holdProgress: 0, missed: false });
          notes.push({ lane: (lane + 1) % 4, time: t + beatSec * 0.5, duration: 0, hit: false, holding: false, holdProgress: 0, missed: false });

          // サビ（m >= 8 && m < 20）での16分高速タップ
          if (m >= 8 && m < 20 && b === 2) {
            notes.push({ lane: (lane + 2) % 4, time: t + beatSec * 0.25, duration: 0, hit: false, holding: false, holdProgress: 0, missed: false });
            notes.push({ lane: (lane + 3) % 4, time: t + beatSec * 0.75, duration: 0, hit: false, holding: false, holdProgress: 0, missed: false });
          }

          // ロングノーツ
          if (b === 0 && m % 3 === 0) {
            notes.push({ lane: (lane + 2) % 4, time: t, duration: beatSec * 1.8, hit: false, holding: false, holdProgress: 0, missed: false });
          }
        }
      }
    }

    // 時間順ソート
    notes.sort((a, b) => a.time - b.time);
    return notes;
  }

  // ゲーム開始
  startGame() {
    this.score = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.gauge = 100;
    this.stats = { perfect: 0, great: 0, good: 0, miss: 0 };
    this.isFinished = false;

    this.notes = this.generateChart(this.selectedTrack);
    const songData = this.audio.startSong(this.selectedTrack);
    this.songDuration = songData.duration;
    this.isPlaying = true;

    this.trackNameDisplay.textContent = this.selectedTrack === 0 ? 'Cyber Pulse' : 'Neon Voltage';
    this.startOverlay.classList.add('hidden');
    this.resultOverlay.classList.add('hidden');
    this.gameoverOverlay.classList.add('hidden');

    this.updateHUD();
  }

  // ==========================================
  // 5. ノーツ判定 & 入力処理
  // ==========================================
  handleLanePress(lane) {
    if (!this.isPlaying || this.isFinished) return;
    this.lanePressed[lane] = true;
    this.laneHitAnim[lane] = 0.15;
    this.audio.init();

    const curTime = this.audio.getCurrentTime();

    // 最も近い未判定ノーツを探索
    let bestNote = null;
    let minDiff = 999;

    for (const note of this.notes) {
      if (note.lane === lane && !note.hit && !note.missed) {
        const diff = Math.abs(curTime - note.time);
        if (diff < minDiff && diff <= JUDGE_GOOD) {
          minDiff = diff;
          bestNote = note;
        }
      }
    }

    if (bestNote) {
      if (bestNote.duration > 0) {
        // ロングノーツ開始
        bestNote.holding = true;
        bestNote.hit = true;
      } else {
        // 通常タップノーツ
        bestNote.hit = true;
      }

      const laneX = 10 + lane * 80 + 38;
      if (minDiff <= JUDGE_PERFECT) {
        this.registerJudgement('PERFECT', 1000, '#38bdf8', laneX);
        this.stats.perfect++;
        this.audio.playHitSound('perfect');
      } else if (minDiff <= JUDGE_GREAT) {
        this.registerJudgement('GREAT', 700, '#fbbf24', laneX);
        this.stats.great++;
        this.audio.playHitSound('great');
      } else {
        this.registerJudgement('GOOD', 300, '#34d399', laneX);
        this.stats.good++;
        this.audio.playHitSound('good');
      }
    }
  }

  handleLaneRelease(lane) {
    this.lanePressed[lane] = false;

    // ホールド中のノーツ解放判定
    const curTime = this.audio.getCurrentTime();
    for (const note of this.notes) {
      if (note.lane === lane && note.holding) {
        note.holding = false;
        const endTime = note.time + note.duration;
        if (curTime < endTime - 0.12) {
          // 早期リリース -> MISS
          note.missed = true;
          this.registerJudgement('MISS', 0, '#f43f5e', 10 + lane * 80 + 38);
          this.stats.miss++;
        }
      }
    }
  }

  registerJudgement(type, baseScore, color, hitX) {
    this.effects.addJudgement(type, color);
    this.effects.addHitEffect(hitX, JUDGE_Y, color, type === 'PERFECT' ? 14 : 8);

    if (type === 'MISS') {
      this.combo = 0;
      this.gauge = Math.max(0, this.gauge - 6);
      if (this.gauge <= 0) {
        this.handleGameOver();
      }
    } else {
      this.combo++;
      if (this.combo > this.maxCombo) this.maxCombo = this.combo;

      const comboBonus = Math.min(1.5, 1.0 + Math.floor(this.combo / 20) * 0.1);
      this.score += Math.floor(baseScore * comboBonus);
      this.gauge = Math.min(100, this.gauge + (type === 'PERFECT' ? 3 : 1.5));
    }

    this.updateHUD();
  }

  // ==========================================
  // 6. メインゲームループ
  // ==========================================
  gameLoop(time) {
    const dt = Math.min((time - this.lastTime) / 1000, 0.1);
    this.lastTime = time;

    if (this.isPlaying && !this.isFinished) {
      this.update(dt);
    }

    this.effects.update(dt);
    this.render();

    requestAnimationFrame((t) => this.gameLoop(t));
  }

  update(dt) {
    const curTime = this.audio.getCurrentTime();

    // レーン発光減衰
    for (let i = 0; i < 4; i++) {
      if (this.laneHitAnim[i] > 0) this.laneHitAnim[i] -= dt;
    }

    // ノーツ自動MISS判定 & ホールドノーツ更新
    for (const note of this.notes) {
      // 1. スルー見逃しMISS判定
      if (!note.hit && !note.missed && curTime > note.time + JUDGE_GOOD) {
        note.missed = true;
        const laneX = 10 + note.lane * 80 + 38;
        this.registerJudgement('MISS', 0, '#f43f5e', laneX);
        this.stats.miss++;
      }

      // 2. ホールドノーツの長押し中処理
      if (note.holding) {
        const laneX = 10 + note.lane * 80 + 38;
        this.effects.addHitEffect(laneX, JUDGE_Y, LANE_COLORS[note.lane], 2);
        this.score += Math.floor(200 * dt);

        if (curTime >= note.time + note.duration) {
          // ホールド完走！
          note.holding = false;
          this.registerJudgement('PERFECT', 500, '#38bdf8', laneX);
        }
      }
    }

    // 楽曲終了判定
    if (curTime >= this.songDuration + 1.2) {
      this.handleSongComplete();
    }
  }

  // 楽曲クリアリザルト
  handleSongComplete() {
    this.isPlaying = false;
    this.isFinished = true;
    this.audio.stopSong();

    // ランク計算
    const totalPossible = this.notes.length * 1000;
    const ratio = totalPossible > 0 ? (this.score / totalPossible) : 0;
    let rank = 'C';
    let rankColor = '#a855f7';

    if (ratio >= 0.92) {
      rank = 'S';
      rankColor = '#fbbf24';
    } else if (ratio >= 0.80) {
      rank = 'A';
      rankColor = '#38bdf8';
    } else if (ratio >= 0.65) {
      rank = 'B';
      rankColor = '#34d399';
    }

    const isNew = this.saveBestScore(this.selectedTrack, this.score);

    this.resultRank.textContent = rank;
    this.resultRank.style.color = rankColor;
    this.resultRank.style.textShadow = `0 0 24px ${rankColor}`;
    this.resultScore.textContent = this.score;
    this.resultMaxCombo.textContent = this.maxCombo;
    this.countPerfect.textContent = this.stats.perfect;
    this.countGreat.textContent = this.stats.great;
    this.countGood.textContent = this.stats.good;
    this.countMiss.textContent = this.stats.miss;

    if (isNew) {
      this.newRecordBadge.classList.remove('hidden');
    } else {
      this.newRecordBadge.classList.add('hidden');
    }

    this.resultOverlay.classList.remove('hidden');
  }

  handleGameOver() {
    this.isPlaying = false;
    this.isFinished = true;
    this.audio.stopSong();
    this.gameoverOverlay.classList.remove('hidden');
  }

  updateHUD() {
    this.scoreDisplay.textContent = String(this.score).padStart(6, '0');
    this.comboDisplay.textContent = this.combo;
    this.gaugeFill.style.width = `${Math.max(0, Math.min(100, this.gauge))}%`;

    // ゲージ色変更
    if (this.gauge > 60) {
      this.gaugeFill.style.background = 'linear-gradient(90deg, #06b6d4, #10b981)';
    } else if (this.gauge > 25) {
      this.gaugeFill.style.background = 'linear-gradient(90deg, #fbbf24, #06b6d4)';
    } else {
      this.gaugeFill.style.background = 'linear-gradient(90deg, #f43f5e, #ef4444)';
    }
  }

  // ==========================================
  // 7. Canvas レンダリング
  // ==========================================
  render() {
    const { ctx, canvas } = this;
    const curTime = this.audio.getCurrentTime();

    // 1. 背景
    ctx.fillStyle = '#030712';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 2. 4レーン背景 & 発光
    for (let l = 0; l < 4; l++) {
      const lx = 10 + l * 80;
      const lw = 76;

      // レーン枠
      ctx.fillStyle = 'rgba(15, 23, 42, 0.7)';
      ctx.fillRect(lx, 0, lw, canvas.height);

      ctx.strokeStyle = 'rgba(51, 65, 85, 0.4)';
      ctx.lineWidth = 1;
      ctx.strokeRect(lx, 0, lw, canvas.height);

      // レーン押下・発光
      if (this.lanePressed[l] || this.laneHitAnim[l] > 0) {
        const alpha = this.lanePressed[l] ? 0.35 : (this.laneHitAnim[l] / 0.15) * 0.25;
        const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
        grad.addColorStop(0, 'rgba(0,0,0,0)');
        grad.addColorStop(0.7, LANE_COLORS[l]);
        grad.addColorStop(1, LANE_COLORS[l]);

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = grad;
        ctx.fillRect(lx, 0, lw, canvas.height);
        ctx.restore();
      }
    }

    // 3. 判定ライン (JUDGE_Y)
    ctx.save();
    ctx.strokeStyle = '#f8fafc';
    ctx.shadowColor = '#38bdf8';
    ctx.shadowBlur = 8;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(8, JUDGE_Y);
    ctx.lineTo(CANVAS_W - 8, JUDGE_Y);
    ctx.stroke();

    // 各レーンのターゲットマーカー
    for (let l = 0; l < 4; l++) {
      const lx = 10 + l * 80 + 38;
      ctx.fillStyle = LANE_COLORS[l];
      ctx.beginPath();
      ctx.arc(lx, JUDGE_Y, 7, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // 4. ノーツ描画 (ロングノーツは下層、タップノーツは上層)
    for (const note of this.notes) {
      if (note.hit && !note.holding) continue;
      if (note.missed) continue;

      const lx = 10 + note.lane * 80;
      const lw = 76;
      const col = LANE_COLORS[note.lane];

      // Y座標計算: (note.time - curTime) * SCROLL_SPEED + JUDGE_Y
      const noteY = JUDGE_Y - (note.time - curTime) * SCROLL_SPEED;

      // 画面外（上すぎる / 下すぎる）は描画スキップ
      if (note.duration === 0) {
        // 通常タップノーツ
        if (noteY < -20 || noteY > canvas.height + 20) continue;

        ctx.save();
        ctx.fillStyle = col;
        ctx.shadowColor = col;
        ctx.shadowBlur = 8;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;

        // ノーツピル描画
        const pillW = lw - 12;
        const pillH = 14;
        const pillX = lx + 6;
        const pillY = noteY - pillH / 2;

        ctx.beginPath();
        ctx.roundRect(pillX, pillY, pillW, pillH, 7);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      } else {
        // ロングノーツ (ホールド)
        const endY = JUDGE_Y - (note.time + note.duration - curTime) * SCROLL_SPEED;
        const renderStartY = Math.min(JUDGE_Y, noteY);
        const renderEndY = endY;

        if (renderStartY < -50 && renderEndY < -50) continue;
        if (renderStartY > canvas.height + 50 && renderEndY > canvas.height + 50) continue;

        ctx.save();
        // ロング帯
        const barW = lw - 24;
        const barX = lx + 12;
        const barH = renderStartY - renderEndY;

        ctx.fillStyle = col;
        ctx.globalAlpha = 0.55;
        ctx.fillRect(barX, renderEndY, barW, Math.max(4, barH));

        // 始点ノーツ
        ctx.globalAlpha = 1.0;
        ctx.fillStyle = col;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(lx + 6, renderStartY - 7, lw - 12, 14, 7);
        ctx.fill();
        ctx.stroke();

        // 終点ノーツ
        ctx.beginPath();
        ctx.roundRect(lx + 8, renderEndY - 5, lw - 16, 10, 5);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }
    }

    // 5. カウントダウン演出 (スタート後 2.2秒間)
    if (curTime < LEAD_IN_TIME && curTime >= 0) {
      const secLeft = LEAD_IN_TIME - curTime;
      let countText = 'READY';
      let countColor = '#38bdf8';

      if (secLeft > 1.6) {
        countText = '3';
        countColor = '#ec4899';
      } else if (secLeft > 1.1) {
        countText = '2';
        countColor = '#fbbf24';
      } else if (secLeft > 0.5) {
        countText = '1';
        countColor = '#10b981';
      } else {
        countText = 'START!';
        countColor = '#38bdf8';
      }

      ctx.save();
      ctx.fillStyle = countColor;
      ctx.shadowColor = countColor;
      ctx.shadowBlur = 16;
      ctx.font = '900 32px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(countText, CANVAS_W / 2, JUDGE_Y - 70);
      ctx.restore();
    }

    // 6. パーティクル & 判定文字
    this.effects.draw(ctx);
  }

  // ==========================================
  // 8. イベントハンドリング
  // ==========================================
  initEvents() {
    // 1. キーボード操作 (D, F, J, K / Arrow keys)
    const keyMap = {
      'd': 0, 'D': 0, 'ArrowLeft': 0, '1': 0,
      'f': 1, 'F': 1, 'ArrowDown': 1, '2': 1,
      'j': 2, 'J': 2, 'ArrowUp': 2, '3': 2,
      'k': 3, 'K': 3, 'ArrowRight': 3, '4': 3
    };

    window.addEventListener('keydown', (e) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
        e.preventDefault();
      }
      if (keyMap[e.key] !== undefined) {
        const lane = keyMap[e.key];
        if (!this.lanePressed[lane]) {
          this.laneBtns[lane].classList.add('pressed');
          this.handleLanePress(lane);
        }
      }
    });

    window.addEventListener('keyup', (e) => {
      if (keyMap[e.key] !== undefined) {
        const lane = keyMap[e.key];
        this.laneBtns[lane].classList.remove('pressed');
        this.handleLaneRelease(lane);
      }
    });

    // 2. モバイル4レーン大型タッチパッド
    this.laneBtns.forEach((btn) => {
      const lane = parseInt(btn.dataset.lane, 10);

      const press = (e) => {
        e.preventDefault();
        btn.classList.add('pressed');
        this.handleLanePress(lane);
      };

      const release = (e) => {
        e.preventDefault();
        btn.classList.remove('pressed');
        this.handleLaneRelease(lane);
      };

      btn.addEventListener('pointerdown', press);
      btn.addEventListener('pointerup', release);
      btn.addEventListener('pointercancel', release);
      btn.addEventListener('pointerleave', release);
    });

    // 3. 楽曲選択ボタン
    this.trackBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        this.trackBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.selectedTrack = parseInt(btn.dataset.track, 10);
      });
    });

    // 4. スタート・リトライ・曲選択ボタン
    this.startBtn.addEventListener('click', () => this.startGame());
    this.retryBtn.addEventListener('click', () => this.startGame());
    this.gameoverRetryBtn.addEventListener('click', () => this.startGame());
    this.selectSongBtn.addEventListener('click', () => {
      this.resultOverlay.classList.add('hidden');
      this.startOverlay.classList.remove('hidden');
    });
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
  new RhythmBeat();
});
