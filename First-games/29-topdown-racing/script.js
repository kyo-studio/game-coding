/**
 * 29 2Dグランプリレース (Grand Prix Racer)
 * 車両物理・ドリフト摩擦・AIウェイポイント走行・ラップ判定・Web Audio
 */

// ==========================================
// 1. 定数・トラック定義
// ==========================================
const CANVAS_W = 340;
const CANVAS_H = 230;
const TOTAL_LAPS = 3;
const TRACK_WIDTH = 90;

const COURSES_DATA = [
  // Course 1: ビギナーズオーバル (Oval)
  {
    name: 'ビギナーズオーバル',
    theme: 'grass',
    bg: '#14532d',
    roadCol: '#1e293b',
    borderCol: '#ef4444',
    waypoints: [
      { x: 300, y: 550 },
      { x: 700, y: 550 },
      { x: 950, y: 450 },
      { x: 1050, y: 300 },
      { x: 950, y: 150 },
      { x: 700, y: 100 },
      { x: 300, y: 100 },
      { x: 100, y: 200 },
      { x: 50,  y: 350 },
      { x: 120, y: 500 }
    ],
    boostPads: [
      { x: 500, y: 550, angle: 0 },
      { x: 500, y: 100, angle: Math.PI }
    ]
  },
  // Course 2: シティサーキット (City Circuit)
  {
    name: 'シティサーキット',
    theme: 'city',
    bg: '#090d16',
    roadCol: '#334155',
    borderCol: '#38bdf8',
    waypoints: [
      { x: 250, y: 650 },
      { x: 650, y: 650 },
      { x: 800, y: 550 },
      { x: 800, y: 400 },
      { x: 650, y: 350 },
      { x: 450, y: 350 },
      { x: 450, y: 250 },
      { x: 750, y: 250 },
      { x: 900, y: 150 },
      { x: 750, y: 80 },
      { x: 250, y: 80 },
      { x: 100, y: 200 },
      { x: 100, y: 500 }
    ],
    boostPads: [
      { x: 450, y: 650, angle: 0 },
      { x: 500, y: 80, angle: Math.PI }
    ]
  },
  // Course 3: サンセットコースト (Sunset Coast)
  {
    name: 'サンセットコースト',
    theme: 'sand',
    bg: '#78350f',
    roadCol: '#1c1917',
    borderCol: '#f59e0b',
    waypoints: [
      { x: 250, y: 700 },
      { x: 700, y: 700 },
      { x: 900, y: 600 },
      { x: 950, y: 400 },
      { x: 800, y: 300 },
      { x: 600, y: 450 },
      { x: 400, y: 300 },
      { x: 600, y: 150 },
      { x: 900, y: 150 },
      { x: 950, y: 60 },
      { x: 200, y: 60 },
      { x: 80,  y: 250 },
      { x: 80,  y: 550 }
    ],
    boostPads: [
      { x: 450, y: 700, angle: 0 },
      { x: 750, y: 150, angle: 0 }
    ]
  }
];

// ==========================================
// 2. Web Audio レース音響エンジン
// ==========================================
class RacingAudioEngine {
  constructor() {
    this.ctx = null;
    this.engineOsc = null;
    this.engineGain = null;
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

  startEngine() {
    this.init();
    if (this.engineOsc) return;

    try {
      this.engineOsc = this.ctx.createOscillator();
      this.engineGain = this.ctx.createGain();

      this.engineOsc.type = 'sawtooth';
      this.engineOsc.frequency.setValueAtTime(55, this.ctx.currentTime);

      this.engineGain.gain.setValueAtTime(0.04, this.ctx.currentTime);

      this.engineOsc.connect(this.engineGain);
      this.engineGain.connect(this.ctx.destination);
      this.engineOsc.start();
    } catch (e) {}
  }

  updateEnginePitch(speedRatio) {
    if (!this.engineOsc || !this.ctx) return;
    try {
      const freq = 50 + speedRatio * 160;
      this.engineOsc.frequency.setTargetAtTime(freq, this.ctx.currentTime, 0.05);
    } catch (e) {}
  }

  stopEngine() {
    if (this.engineOsc) {
      try {
        this.engineOsc.stop();
        this.engineOsc.disconnect();
      } catch (e) {}
      this.engineOsc = null;
    }
  }

  // シグナル音
  playSignalBeep(isGo = false) {
    this.init();
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const t = this.ctx.currentTime;
      osc.type = isGo ? 'square' : 'triangle';
      osc.frequency.setValueAtTime(isGo ? 880 : 440, t);

      gain.gain.setValueAtTime(0.2, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + (isGo ? 0.4 : 0.15));

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + (isGo ? 0.4 : 0.15));
    } catch (e) {}
  }

  // ブースト音
  playBoost() {
    if (!this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const t = this.ctx.currentTime;
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(300, t);
      osc.frequency.exponentialRampToValueAtTime(800, t + 0.25);

      gain.gain.setValueAtTime(0.25, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.25);
    } catch (e) {}
  }

  // クラッシュ音
  playCrash() {
    if (!this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const t = this.ctx.currentTime;
      osc.type = 'square';
      osc.frequency.setValueAtTime(120, t);
      osc.frequency.exponentialRampToValueAtTime(30, t + 0.18);

      gain.gain.setValueAtTime(0.3, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.18);
    } catch (e) {}
  }

  // ゴールファンファーレ
  playFinish() {
    if (!this.ctx) return;
    try {
      const notes = [523.25, 659.25, 783.99, 1046.50];
      notes.forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const t = this.ctx.currentTime + idx * 0.1;
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, t);

        gain.gain.setValueAtTime(0.25, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t);
        osc.stop(t + 0.3);
      });
    } catch (e) {}
  }
}

// ==========================================
// 3. メインレースクラス (GrandPrixRacer)
// ==========================================
class GrandPrixRacer {
  constructor() {
    this.canvas = document.getElementById('gameCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.audio = new RacingAudioEngine();

    this.canvas.width = CANVAS_W;
    this.canvas.height = CANVAS_H;

    // DOM要素
    this.posDisplay = document.getElementById('pos-display');
    this.lapDisplay = document.getElementById('lap-display');
    this.timeDisplay = document.getElementById('time-display');
    this.nitroFill = document.getElementById('nitro-fill');

    this.signalOverlay = document.getElementById('signal-overlay');
    this.sig1 = document.getElementById('sig-1');
    this.sig2 = document.getElementById('sig-2');
    this.sig3 = document.getElementById('sig-3');
    this.sigGo = document.getElementById('sig-go');

    this.startOverlay = document.getElementById('start-overlay');
    this.resultOverlay = document.getElementById('result-overlay');
    this.resultTitle = document.getElementById('result-title');
    this.resultIcon = document.getElementById('result-icon');
    this.resPos = document.getElementById('res-pos');
    this.resTotalTime = document.getElementById('res-total-time');
    this.resBestLap = document.getElementById('res-best-lap');
    this.newRecordBadge = document.getElementById('new-record-badge');

    this.courseBtns = document.querySelectorAll('.course-btn');
    this.startBtn = document.getElementById('start-btn');
    this.retryBtn = document.getElementById('retry-btn');
    this.selectCourseBtn = document.getElementById('select-course-btn');

    // レース状態
    this.selectedCourse = 0;
    this.state = 'idle'; // 'idle' | 'countdown' | 'racing' | 'finished'
    this.countdownTimer = 0;
    this.raceTime = 0;
    this.curLapTime = 0;
    this.bestLapTime = 9999;

    // コントロール入力
    this.keys = { left: false, right: false, accel: false, brake: false, nitro: false };

    // 車両リスト (0: プレイヤー, 1〜3: AI)
    this.cars = [];
    this.skidmarks = []; // [{ x, y, alpha }]

    this.lastTime = performance.now();
    this.initEvents();
    requestAnimationFrame((t) => this.gameLoop(t));
  }

  loadBestTime(courseIdx) {
    try {
      return parseFloat(localStorage.getItem(`racing_best_course_${courseIdx}`)) || 9999;
    } catch (e) {
      return 9999;
    }
  }

  saveBestTime(courseIdx, time) {
    const prev = this.loadBestTime(courseIdx);
    if (time < prev) {
      try {
        localStorage.setItem(`racing_best_course_${courseIdx}`, time.toFixed(2));
      } catch (e) {}
      return true;
    }
    return false;
  }

  // レース開始シークエンス
  startRace() {
    this.audio.init();
    const course = COURSES_DATA[this.selectedCourse];
    const w0 = course.waypoints[0];
    const w1 = course.waypoints[1];
    const startAngle = Math.atan2(w1.y - w0.y, w1.x - w0.x);

    // 車両初期化 (グリッド配置)
    this.cars = [
      // プレイヤー (Red)
      {
        isPlayer: true,
        name: 'PLAYER',
        x: w0.x,
        y: w0.y + 16,
        angle: startAngle,
        speed: 0,
        maxSpeed: 280,
        color: '#ef4444',
        accent: '#fee2e2',
        nitro: 100,
        isNitro: false,
        lap: 1,
        nextWp: 1,
        finished: false,
        finishTime: 0
      },
      // AI 1 (Blue)
      {
        isPlayer: false,
        name: 'BLUE SPEED',
        x: w0.x + 35,
        y: w0.y - 16,
        angle: startAngle,
        speed: 0,
        maxSpeed: 270,
        color: '#3b82f6',
        accent: '#dbeafe',
        nitro: 100,
        lap: 1,
        nextWp: 1,
        finished: false,
        finishTime: 0,
        skill: 0.95
      },
      // AI 2 (Yellow)
      {
        isPlayer: false,
        name: 'YELLOW COMET',
        x: w0.x - 35,
        y: w0.y - 16,
        angle: startAngle,
        speed: 0,
        maxSpeed: 265,
        color: '#eab308',
        accent: '#fef9c3',
        nitro: 100,
        lap: 1,
        nextWp: 1,
        finished: false,
        finishTime: 0,
        skill: 0.90
      },
      // AI 3 (Green)
      {
        isPlayer: false,
        name: 'GREEN VIPER',
        x: w0.x - 70,
        y: w0.y + 16,
        angle: startAngle,
        speed: 0,
        maxSpeed: 260,
        color: '#10b981',
        accent: '#d1fae5',
        nitro: 100,
        lap: 1,
        nextWp: 1,
        finished: false,
        finishTime: 0,
        skill: 0.86
      }
    ];

    this.skidmarks = [];
    this.raceTime = 0;
    this.curLapTime = 0;
    this.bestLapTime = 9999;
    this.state = 'countdown';
    this.countdownTimer = 3.8;

    this.startOverlay.classList.add('hidden');
    this.resultOverlay.classList.add('hidden');
    this.signalOverlay.classList.remove('hidden');

    this.resetSignalLights();
    this.audio.startEngine();
  }

  resetSignalLights() {
    this.sig1.classList.remove('active');
    this.sig2.classList.remove('active');
    this.sig3.classList.remove('active');
    this.sigGo.classList.remove('active');
  }

  // ==========================================
  // 4. メインループ & 物理更新
  // ==========================================
  gameLoop(time) {
    const dt = Math.min((time - this.lastTime) / 1000, 0.1);
    this.lastTime = time;

    if (this.state === 'countdown') {
      this.updateCountdown(dt);
    } else if (this.state === 'racing') {
      this.updateRacing(dt);
    }

    this.render();
    requestAnimationFrame((t) => this.gameLoop(t));
  }

  // カウントダウン処理
  updateCountdown(dt) {
    const prevTimer = this.countdownTimer;
    this.countdownTimer -= dt;

    if (prevTimer >= 3.0 && this.countdownTimer < 3.0) {
      this.sig1.classList.add('active');
      this.audio.playSignalBeep(false);
    }
    if (prevTimer >= 2.0 && this.countdownTimer < 2.0) {
      this.sig2.classList.add('active');
      this.audio.playSignalBeep(false);
    }
    if (prevTimer >= 1.0 && this.countdownTimer < 1.0) {
      this.sig3.classList.add('active');
      this.audio.playSignalBeep(false);
    }
    if (prevTimer >= 0 && this.countdownTimer <= 0) {
      this.sig1.classList.remove('active');
      this.sig2.classList.remove('active');
      this.sig3.classList.remove('active');
      this.sigGo.classList.add('active');
      this.audio.playSignalBeep(true);
      this.state = 'racing';

      setTimeout(() => {
        this.signalOverlay.classList.add('hidden');
      }, 1000);
    }
  }

  // レース中更新
  updateRacing(dt) {
    this.raceTime += dt;
    this.curLapTime += dt;

    const course = COURSES_DATA[this.selectedCourse];

    // 1. プレイヤー車両物理
    const p = this.cars[0];
    if (!p.finished) {
      // ステアリング
      if (this.keys.left) p.angle -= 2.8 * Math.min(1, Math.abs(p.speed) / 70) * dt;
      if (this.keys.right) p.angle += 2.8 * Math.min(1, Math.abs(p.speed) / 70) * dt;

      // ニトロ
      p.isNitro = this.keys.nitro && p.nitro > 0;
      if (p.isNitro) {
        p.nitro = Math.max(0, p.nitro - 35 * dt);
      } else {
        p.nitro = Math.min(100, p.nitro + 5 * dt);
      }

      // アクセル / ブレーキ
      const topSpd = p.isNitro ? 370 : p.maxSpeed;
      if (this.keys.accel) {
        const accelPower = p.isNitro ? 260 : 160;
        p.speed = Math.min(topSpd, p.speed + accelPower * dt);
      } else if (this.keys.brake) {
        p.speed = Math.max(-60, p.speed - 220 * dt);
      } else {
        p.speed *= Math.pow(0.97, dt * 60); // コースト減速
      }

      // 路面判定 (アスファルト外なら大幅減速)
      const onRoad = this.isOnRoad(p.x, p.y, course);
      if (!onRoad) {
        p.speed *= Math.pow(0.92, dt * 60);
        if (p.speed > 110) p.speed = 110;
        // 芝生・砂煙スキッド
        if (Math.abs(p.speed) > 40) {
          this.addSkidmark(p.x, p.y, 0.4);
        }
      }

      // ドリフトスキッド
      if ((this.keys.left || this.keys.right) && p.speed > 180) {
        this.addSkidmark(p.x, p.y, 0.3);
      }

      // 移動
      p.x += Math.cos(p.angle) * p.speed * dt;
      p.y += Math.sin(p.angle) * p.speed * dt;

      // ブーストパッド判定
      this.checkBoostPads(p, course);

      // チェックポイント & ラップ判定
      this.updateCarProgress(p, course);
    }

    // 2. AI 車両物理 & ナビゲーション
    for (let i = 1; i < this.cars.length; i++) {
      const ai = this.cars[i];
      if (ai.finished) continue;

      const targetWp = course.waypoints[ai.nextWp];
      const targetAngle = Math.atan2(targetWp.y - ai.y, targetWp.x - ai.x);

      // 角度補間
      let angleDiff = targetAngle - ai.angle;
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;

      ai.angle += Math.sign(angleDiff) * Math.min(Math.abs(angleDiff), 2.5 * dt);

      // AI スピード制御
      const targetSpd = Math.abs(angleDiff) > 0.8 ? ai.maxSpeed * 0.6 : ai.maxSpeed * ai.skill;
      if (ai.speed < targetSpd) {
        ai.speed += 140 * dt;
      } else {
        ai.speed -= 100 * dt;
      }

      ai.x += Math.cos(ai.angle) * ai.speed * dt;
      ai.y += Math.sin(ai.angle) * ai.speed * dt;

      this.checkBoostPads(ai, course);
      this.updateCarProgress(ai, course);
    }

    // 3. 車両同士の反発衝突
    this.handleCarCollisions();

    // 4. スキッドマークフェード
    this.updateSkidmarks(dt);

    // 5. エンジン音更新
    this.audio.updateEnginePitch(Math.abs(p.speed) / p.maxSpeed);

    // 6. HUD 更新
    this.updateHUD();
  }

  // ブーストパッド
  checkBoostPads(car, course) {
    for (const b of course.boostPads) {
      if (Math.hypot(car.x - b.x, car.y - b.y) < 36) {
        car.speed = Math.min(380, car.speed + 80);
        if (car.isPlayer) this.audio.playBoost();
      }
    }
  }

  // 進行度・ラップ判定
  updateCarProgress(car, course) {
    const targetWp = course.waypoints[car.nextWp];
    const dist = Math.hypot(car.x - targetWp.x, car.y - targetWp.y);

    if (dist < 100) {
      car.nextWp = (car.nextWp + 1) % course.waypoints.length;

      // ゴールライン通過判定 (0番ウェイポイントへ戻った時)
      if (car.nextWp === 1) {
        if (car.isPlayer) {
          if (this.curLapTime < this.bestLapTime) {
            this.bestLapTime = this.curLapTime;
          }
          this.curLapTime = 0;
        }

        car.lap++;
        if (car.lap > TOTAL_LAPS) {
          car.finished = true;
          car.finishTime = this.raceTime;

          if (car.isPlayer) {
            this.handleRaceFinish();
          }
        }
      }
    }
  }

  // 路面上にいるか判定
  isOnRoad(x, y, course) {
    const wps = course.waypoints;
    for (let i = 0; i < wps.length; i++) {
      const p1 = wps[i];
      const p2 = wps[(i + 1) % wps.length];
      const dist = this.distToSegment({ x, y }, p1, p2);
      if (dist <= TRACK_WIDTH / 2 + 10) return true;
    }
    return false;
  }

  distToSegment(p, v, w) {
    const l2 = Math.hypot(v.x - w.x, v.y - w.y) ** 2;
    if (l2 === 0) return Math.hypot(p.x - v.x, p.y - v.y);
    let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(p.x - (v.x + t * (w.x - v.x)), p.y - (v.y + t * (w.y - v.y)));
  }

  // 車両間衝突
  handleCarCollisions() {
    for (let i = 0; i < this.cars.length; i++) {
      for (let j = i + 1; j < this.cars.length; j++) {
        const c1 = this.cars[i];
        const c2 = this.cars[j];
        const dx = c2.x - c1.x;
        const dy = c2.y - c1.y;
        const dist = Math.hypot(dx, dy);

        if (dist < 24 && dist > 0) {
          const pushX = (dx / dist) * (24 - dist) * 0.5;
          const pushY = (dy / dist) * (24 - dist) * 0.5;
          c1.x -= pushX;
          c1.y -= pushY;
          c2.x += pushX;
          c2.y += pushY;
          c1.speed *= 0.85;
          c2.speed *= 0.85;
          if (c1.isPlayer || c2.isPlayer) {
            this.audio.playCrash();
          }
        }
      }
    }
  }

  addSkidmark(x, y, alpha) {
    this.skidmarks.push({ x, y, alpha, life: 1.5, maxLife: 1.5 });
  }

  updateSkidmarks(dt) {
    for (let i = this.skidmarks.length - 1; i >= 0; i--) {
      const s = this.skidmarks[i];
      s.life -= dt;
      s.alpha = (s.life / s.maxLife) * 0.4;
      if (s.life <= 0) {
        this.skidmarks.splice(i, 1);
      }
    }
  }

  // レースフィニッシュ
  handleRaceFinish() {
    this.state = 'finished';
    this.audio.stopEngine();
    this.audio.playFinish();

    // 順位集計
    const sorted = [...this.cars].sort((a, b) => {
      if (a.finished && b.finished) return a.finishTime - b.finishTime;
      if (a.finished) return -1;
      if (b.finished) return 1;
      return b.lap * 1000 + b.nextWp * 50 - (a.lap * 1000 + a.nextWp * 50);
    });

    const playerPos = sorted.findIndex(c => c.isPlayer) + 1;
    const isNew = this.saveBestTime(this.selectedCourse, this.raceTime);

    this.resPos.textContent = `${playerPos}${playerPos === 1 ? 'st' : (playerPos === 2 ? 'nd' : (playerPos === 3 ? 'rd' : 'th'))} / 4`;
    this.resTotalTime.textContent = this.formatTime(this.raceTime);
    this.resBestLap.textContent = this.formatTime(this.bestLapTime === 9999 ? this.raceTime : this.bestLapTime);

    if (playerPos === 1) {
      this.resultTitle.textContent = '1st PLACE! 🏆';
      this.resultIcon.textContent = '👑✨🏁';
    } else {
      this.resultTitle.textContent = `${playerPos}th Place`;
      this.resultIcon.textContent = '🏁🏎️💨';
    }

    if (isNew) {
      this.newRecordBadge.classList.remove('hidden');
    } else {
      this.newRecordBadge.classList.add('hidden');
    }

    this.resultOverlay.classList.remove('hidden');
  }

  formatTime(sec) {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    const ms = Math.floor((sec * 100) % 100);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(ms).padStart(2, '0')}`;
  }

  updateHUD() {
    const p = this.cars[0];
    if (!p) return;

    // 順位計算
    const sorted = [...this.cars].sort((a, b) => {
      if (a.finished && b.finished) return a.finishTime - b.finishTime;
      if (a.finished) return -1;
      if (b.finished) return 1;
      return b.lap * 1000 + b.nextWp * 50 - (a.lap * 1000 + a.nextWp * 50);
    });
    const currentPos = sorted.findIndex(c => c.isPlayer) + 1;

    this.posDisplay.textContent = `${currentPos}${currentPos === 1 ? 'st' : (currentPos === 2 ? 'nd' : 'rd')}`;
    this.lapDisplay.textContent = `${Math.min(TOTAL_LAPS, p.lap)}/${TOTAL_LAPS}`;
    this.timeDisplay.textContent = this.formatTime(this.raceTime);
    this.nitroFill.style.width = `${p.nitro}%`;
  }

  // ==========================================
  // 5. Canvas レンダリング & ミニマップ
  // ==========================================
  render() {
    const { ctx, canvas } = this;
    const course = COURSES_DATA[this.selectedCourse];
    const p = this.cars[0] || { x: 400, y: 400 };

    // カメラ (プレイヤー中心)
    const camX = p.x - canvas.width / 2;
    const camY = p.y - canvas.height / 2;

    // 背景描画
    ctx.fillStyle = course.bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.translate(-Math.floor(camX), -Math.floor(camY));

    // 1. サーキット道路描画
    this.drawTrack(ctx, course);

    // 2. スキッドマーク描画
    ctx.fillStyle = '#000000';
    for (const s of this.skidmarks) {
      ctx.globalAlpha = s.alpha;
      ctx.beginPath();
      ctx.arc(s.x, s.y, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1.0;

    // 3. ブーストパッド描画
    for (const b of course.boostPads) {
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.rotate(b.angle);
      ctx.fillStyle = '#06b6d4';
      ctx.shadowColor = '#06b6d4';
      ctx.shadowBlur = 10;
      ctx.fillRect(-16, -12, 32, 24);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('⏩', 0, 0);
      ctx.restore();
    }

    // 4. スタート/ゴールライン
    const w0 = course.waypoints[0];
    const w1 = course.waypoints[1];
    const startAngle = Math.atan2(w1.y - w0.y, w1.x - w0.x);
    ctx.save();
    ctx.translate(w0.x, w0.y);
    ctx.rotate(startAngle + Math.PI / 2);
    // チェッカーフラッグ柄
    for (let i = -TRACK_WIDTH / 2; i < TRACK_WIDTH / 2; i += 10) {
      ctx.fillStyle = (Math.floor(i / 10) % 2 === 0) ? '#ffffff' : '#000000';
      ctx.fillRect(i, -6, 10, 12);
    }
    ctx.restore();

    // 5. 車両描画 (4台)
    for (const car of this.cars) {
      this.drawCar(ctx, car);
    }

    ctx.restore();

    // 6. ミニマップ (右上に全体マップ＆全車プロット)
    this.drawMiniMap(ctx, course);
  }

  // トラック道路描画
  drawTrack(ctx, course) {
    const wps = course.waypoints;

    // 外枠（縁石）
    ctx.strokeStyle = course.borderCol;
    ctx.lineWidth = TRACK_WIDTH + 8;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(wps[0].x, wps[0].y);
    for (let i = 1; i < wps.length; i++) ctx.lineTo(wps[i].x, wps[i].y);
    ctx.closePath();
    ctx.stroke();

    // アスファルト路面
    ctx.strokeStyle = course.roadCol;
    ctx.lineWidth = TRACK_WIDTH;
    ctx.stroke();

    // 白線センターライン (破線)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 2;
    ctx.setLineDash([12, 12]);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // 車両描画
  drawCar(ctx, car) {
    ctx.save();
    ctx.translate(car.x, car.y);
    ctx.rotate(car.angle);

    // ニトロ炎エフェクト
    if (car.isNitro) {
      ctx.fillStyle = '#06b6d4';
      ctx.shadowColor = '#06b6d4';
      ctx.shadowBlur = 12;
      ctx.fillRect(-18, -4, 8, 8);
      ctx.shadowBlur = 0;
    }

    // タイヤ (4本)
    ctx.fillStyle = '#020617';
    ctx.fillRect(-10, -11, 6, 4);
    ctx.fillRect(4, -11, 6, 4);
    ctx.fillRect(-10, 7, 6, 4);
    ctx.fillRect(4, 7, 6, 4);

    // 車体ボディ
    ctx.fillStyle = car.color;
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 4;
    ctx.beginPath();
    ctx.roundRect(-12, -8, 24, 16, 4);
    ctx.fill();

    // フロントガラス & ルーフ
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(-2, -6, 8, 12);
    ctx.fillStyle = car.accent;
    ctx.fillRect(-6, -4, 4, 8);

    // ヘッドライト
    ctx.fillStyle = '#fef08a';
    ctx.fillRect(10, -7, 2, 3);
    ctx.fillRect(10, 4, 2, 3);

    ctx.restore();
  }

  // ミニマップレーダー
  drawMiniMap(ctx, course) {
    const mw = 72;
    const mh = 56;
    const mx = this.canvas.width - mw - 6;
    const my = 6;

    ctx.save();
    ctx.fillStyle = 'rgba(2, 6, 23, 0.75)';
    ctx.fillRect(mx, my, mw, mh);
    ctx.strokeStyle = '#334155';
    ctx.strokeRect(mx, my, mw, mh);

    // 縮尺計算
    const scaleX = (mw - 8) / 1100;
    const scaleY = (mh - 8) / 800;

    // トラックライン
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 3;
    ctx.beginPath();
    const wps = course.waypoints;
    ctx.moveTo(mx + 4 + wps[0].x * scaleX, my + 4 + wps[0].y * scaleY);
    for (let i = 1; i < wps.length; i++) {
      ctx.lineTo(mx + 4 + wps[i].x * scaleX, my + 4 + wps[i].y * scaleY);
    }
    ctx.closePath();
    ctx.stroke();

    // 車両プロット
    for (const car of this.cars) {
      ctx.fillStyle = car.color;
      ctx.beginPath();
      ctx.arc(mx + 4 + car.x * scaleX, my + 4 + car.y * scaleY, car.isPlayer ? 3.5 : 2.5, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  // ==========================================
  // 6. イベントハンドリング
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
          this.keys.accel = true;
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          this.keys.brake = true;
          break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
          this.keys.left = true;
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          this.keys.right = true;
          break;
        case ' ':
          this.keys.nitro = true;
          break;
      }
    });

    window.addEventListener('keyup', (e) => {
      switch (e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          this.keys.accel = false;
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          this.keys.brake = false;
          break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
          this.keys.left = false;
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          this.keys.right = false;
          break;
        case ' ':
          this.keys.nitro = false;
          break;
      }
    });

    // 2. モバイルタッチコントローラー
    const padButtons = document.querySelectorAll('.pad-btn');
    padButtons.forEach(btn => {
      const act = btn.dataset.act;

      const press = (e) => {
        e.preventDefault();
        this.audio.init();
        if (act === 'left') this.keys.left = true;
        if (act === 'right') this.keys.right = true;
        if (act === 'accel') this.keys.accel = true;
        if (act === 'brake') this.keys.brake = true;
        if (act === 'nitro') this.keys.nitro = true;
      };

      const release = (e) => {
        e.preventDefault();
        if (act === 'left') this.keys.left = false;
        if (act === 'right') this.keys.right = false;
        if (act === 'accel') this.keys.accel = false;
        if (act === 'brake') this.keys.brake = false;
        if (act === 'nitro') this.keys.nitro = false;
      };

      btn.addEventListener('pointerdown', press);
      btn.addEventListener('pointerup', release);
      btn.addEventListener('pointercancel', release);
      btn.addEventListener('pointerleave', release);
    });

    // 3. コース選択ボタン
    this.courseBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        this.courseBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.selectedCourse = parseInt(btn.dataset.course, 10);
      });
    });

    // 4. スタート・リトライ・コース選択
    this.startBtn.addEventListener('click', () => this.startRace());
    this.retryBtn.addEventListener('click', () => this.startRace());
    this.selectCourseBtn.addEventListener('click', () => {
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
  new GrandPrixRacer();
});
