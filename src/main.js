import Phaser from 'phaser';
import './polyfill.js';

const clamp01 = (x) => Math.max(0, Math.min(1, x));

const LERP = (a, b, t) => a + (b - a) * t;

const rand = (min, max) => min + Math.random() * (max - min);

const toFixed = (n, d=0) => Number(n.toFixed(d));

const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

const easeInOutSine = (t) => -(Math.cos(Math.PI * t) - 1) / 2;

const shake = (scene, duration=250, intensity=0.02) => {
  if (scene?.cameras?.main?.shake) scene.cameras.main.shake(duration, intensity);
};

const rgba = (r,g,b,a)=>`rgba(${r},${g},${b},${a})`;

const lerpColor = (c1, c2, t) => {
  const r1=(c1>>16)&255,g1=(c1>>8)&255,b1=c1&255;
  const r2=(c2>>16)&255,g2=(c2>>8)&255,b2=c2&255;
  const r=Math.round(lerpColor._lerp(r1,r2,t));
  const g=Math.round(lerpColor._lerp(g1,g2,t));
  const b=Math.round(lerpColor._lerp(b1,b2,t));
  return (r<<16)|(g<<8)|b;
};
lerpColor._lerp = (a,b,t)=>a+(b-a)*t;

const noise1D = (x) => {
  const s = Math.sin(x * 12.9898) * 43758.5453;
  return s - Math.floor(s);
};

const wobble = (time, speed, amp) => Math.sin(time*speed)*amp;

const flipSign = () => (Math.random() < 0.5 ? -1 : 1);

const pick = (arr) => arr[Math.floor(Math.random()*arr.length)];

import { W, H, HORIZON, PLAYER_Y, LANES, LOCATIONS, VEHICLES, BANGALORE_QUIPS } from './constants.js';
import { Storage } from './storage.js';
import { AudioFX } from './audio.js';

class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');

    this.gameState = 'menu'; // menu, garage, playing, paused, gameover
    this.saveData = Storage.load();

    this.selectedVehicle = VEHICLES.find(v => v.id === this.saveData.selectedVehicle) || VEHICLES[0];
    this.playerHealth = this.selectedVehicle.suspension;
    this.maxHealth = this.selectedVehicle.suspension;

    this.distance = 0;
    this.speed = this.selectedVehicle.speed;
    this.baseSpeed = this.selectedVehicle.speed;
    this.targetLane = 0;
    this.playerLane = 0;
    this.playerTilt = 0;

    this.potholes = [];
    this.traffic = [];
    this.coins = [];
    this.powerups = [];
    this.particles = [];
    this.floatingTexts = [];
    this.signs = [];

    this.potholeTimer = 1200;
    this.trafficTimer = 1600;
    this.coinTimer = 1800;
    this.powerupTimer = 6000;
    this.signTimer = 3500;
    this.metroTrainTimer = 8000;

    this.locationIndex = 0;
    this.locationProgress = 0;
    this.roadScroll = 0;

    this.currentCoins = 0;
    this.potholesDodged = 0;
    this.wrongWaysDodged = 0;
    this.nearMissCombo = 0;

    // Active power-up states
    this.shieldTime = 0;
    this.nitroTime = 0;

    this.weather = 'day'; // day, sunset, rain, night
    this.weatherTimer = 18000;
    this.rainDrops = [];

    // Metro viaduct & trains
    this.metroTrain = null;

    // UI containers
    this.menuUI = [];
    this.garageUI = [];
    this.hudUI = [];
    this.pauseUI = [];
    this.gameOverUI = [];
    this.touchControlUI = [];

    this.touchStartX = null;
    this.touchStartY = null;
    this.isSteeringLeft = false;
    this.isSteeringRight = false;
  }

  create() {
    AudioFX.enabled = this.saveData.settings.sound;

    this.createTextures();
    this.createSkyAndScenery();
    this.createRoad();
    this.createPlayer();
    this.createHUD();
    this.createTouchControls();
    this.createKeyControls();

    this.showMenu();
  }

  // ============================================================
  // PROCEDURAL TEXTURES
  // ============================================================

  createTextures() {
    // Asphalt road texture
    if (!this.textures.exists('road_tex')) {
      const asphalt = document.createElement('canvas');
      asphalt.width = 512;
      asphalt.height = 512;
      const ctx = asphalt.getContext('2d');
      ctx.fillStyle = '#3a3c3d';
      ctx.fillRect(0, 0, 512, 512);

      for (let i = 0; i < 15000; i++) {
        const shade = 35 + Math.random() * 40;
        ctx.fillStyle = `rgba(${shade},${shade},${shade},${Math.random() * 0.15})`;
        ctx.fillRect(Math.random() * 512, Math.random() * 512, 1 + Math.random() * 2, 1 + Math.random() * 2);
      }
      this.textures.addCanvas('road_tex', asphalt);
    }

    // Grass roadside texture
    if (!this.textures.exists('grass_tex')) {
      const grassCanvas = document.createElement('canvas');
      grassCanvas.width = 256;
      grassCanvas.height = 256;
      const grass = grassCanvas.getContext('2d');
      grass.fillStyle = '#3b5c34';
      grass.fillRect(0, 0, 256, 256);

      for (let i = 0; i < 5000; i++) {
        grass.fillStyle = `rgba(18, 50, 20, ${Math.random() * 0.2})`;
        grass.fillRect(Math.random() * 256, Math.random() * 256, 2, 3);
      }
      this.textures.addCanvas('grass_tex', grassCanvas);
    }
  }

  // ============================================================
  // SKY, METRO & CITY SCENERY
  // ============================================================

  createSkyAndScenery() {
    this.skyGraphics = this.add.graphics();
    this.skyGraphics.setDepth(0);

    this.cloudGraphics = this.add.graphics();
    this.cloudGraphics.setDepth(1);

    this.cityGraphics = this.add.graphics();
    this.cityGraphics.setDepth(2);

    this.grass = this.add.tileSprite(W / 2, 470, W, 500, 'grass_tex');
    this.grass.setDepth(3);

    // Metro Viaduct pillars & track
    this.metroTrack = this.add.graphics();
    this.metroTrack.setDepth(4);

    this.drawMetroPillars();
    this.updateSkyColors();
  }

  updateSkyColors() {
    this.skyGraphics.clear();
    let topColor = 0x5bb0dc;
    let bottomColor = 0xd5eef5;

    if (this.weather === 'sunset') {
      topColor = 0xc85a2b;
      bottomColor = 0xf9be68;
    } else if (this.weather === 'rain') {
      topColor = 0x3d4a52;
      bottomColor = 0x76838a;
    } else if (this.weather === 'night') {
      topColor = 0x07111c;
      bottomColor = 0x182c40;
    }

    this.skyGraphics.fillGradientStyle(topColor, topColor, bottomColor, bottomColor, 1);
    this.skyGraphics.fillRect(0, 0, W, H);

    // Clouds / Sun / Moon
    this.cloudGraphics.clear();
    if (this.weather === 'night') {
      // Moon & stars
      this.cloudGraphics.fillStyle(0xfff7d0, 0.9);
      this.cloudGraphics.fillCircle(1050, 80, 28);
      this.cloudGraphics.fillStyle(0x07111c, 1);
      this.cloudGraphics.fillCircle(1060, 75, 24);

      // Stars
      this.cloudGraphics.fillStyle(0xffffff, 0.7);
      for (let i = 0; i < 40; i++) {
        const sx = (i * 37) % W;
        const sy = (i * 23) % (HORIZON - 30);
        this.cloudGraphics.fillCircle(sx, sy, 1 + (i % 2));
      }
    } else {
      // Daytime / Sunset Clouds
      this.cloudGraphics.fillStyle(this.weather === 'sunset' ? 0xffd2a0 : 0xffffff, 0.55);
      [
        [150, 75, 45], [200, 60, 55], [250, 80, 40],
        [880, 70, 42], [930, 55, 52], [980, 72, 38]
      ].forEach(([x, y, r]) => {
        this.cloudGraphics.fillCircle(x, y, r);
      });
    }

    // Distant Bengaluru Skyline & Tech Parks
    this.cityGraphics.clear();
    const buildings = [
      [0, 130, 90, 'tech'], [95, 95, 75, 'flat'], [175, 145, 95, 'tech'],
      [275, 80, 65, 'tower'], [345, 125, 90, 'flat'], [440, 100, 70, 'tech'],
      [780, 110, 80, 'flat'], [865, 85, 65, 'tower'], [935, 150, 100, 'tech'],
      [1040, 95, 75, 'flat'], [1120, 130, 95, 'tech'], [1220, 105, 65, 'flat']
    ];

    buildings.forEach(([x, h, w, type]) => {
      let bColor = this.weather === 'night' ? 0x132332 : (this.weather === 'sunset' ? 0x73483b : 0x70858e);
      this.cityGraphics.fillStyle(bColor, 1);
      this.cityGraphics.fillRect(x, HORIZON - h, w, h);

      // Window lights
      let winColor = this.weather === 'night' ? 0xffdf6b : 0xd2e8ee;
      let winAlpha = this.weather === 'night' ? 0.8 : 0.35;
      this.cityGraphics.fillStyle(winColor, winAlpha);

      for (let wy = HORIZON - h + 12; wy < HORIZON - 8; wy += 20) {
        for (let wx = x + 8; wx < x + w - 8; wx += 16) {
          if (Math.random() > 0.25 || this.weather !== 'night') {
            this.cityGraphics.fillRect(wx, wy, 7, 10);
          }
        }
      }
    });
  }

  drawMetroPillars() {
    this.metroTrack.clear();
    // Concrete metro track on the right shoulder elevated
    const xs = [980, 1090, 1200];
    xs.forEach(x => {
      this.metroTrack.fillStyle(0x7c8184, 1);
      this.metroTrack.fillRect(x - 12, HORIZON - 80, 24, 120); // Pillar
      this.metroTrack.fillStyle(0x565a5d, 1);
      this.metroTrack.fillRect(x - 45, HORIZON - 90, 90, 18); // Cross girder
    });

    // Elevated track beam
    this.metroTrack.fillStyle(0x94999c, 1);
    this.metroTrack.fillRect(940, HORIZON - 105, 340, 20);

    // Green Namma Metro stripe
    this.metroTrack.fillStyle(0x27ae60, 1);
    this.metroTrack.fillRect(940, HORIZON - 98, 340, 6);
  }

  triggerMetroTrain() {
    if (this.metroTrain) return;
    const train = this.add.container(1300, HORIZON - 125);
    const g = this.add.graphics();

    // 3 metro coaches
    g.fillStyle(0xe5e7eb, 1);
    g.fillRoundedRect(-240, 0, 240, 32, 6);

    // Green livery band
    g.fillStyle(0x22c55e, 1);
    g.fillRect(-240, 18, 240, 7);

    // Dark windows
    g.fillStyle(0x1e293b, 1);
    for (let i = 0; i < 8; i++) {
      g.fillRoundedRect(-230 + i * 29, 6, 20, 12, 2);
    }

    train.add(g);
    train.setDepth(5);
    this.metroTrain = train;

    this.tweens.add({
      targets: train,
      x: 900,
      duration: 3500,
      ease: 'Linear',
      onComplete: () => {
        train.destroy();
        this.metroTrain = null;
      }
    });
  }

  // ============================================================
  // ROAD GEOMETRY & LANES
  // ============================================================

  createRoad() {
    this.road = this.add.graphics().setDepth(10);
    this.shoulders = this.add.graphics().setDepth(9);
    this.roadLines = this.add.graphics().setDepth(11);
    this.drawRoad();
  }

  roadWidth(y) {
    const t = Phaser.Math.Clamp((y - HORIZON) / (H - HORIZON), 0, 1);
    return Phaser.Math.Linear(280, 1160, t);
  }

  roadLeft(y) {
    return W / 2 - this.roadWidth(y) / 2;
  }

  roadRight(y) {
    return W / 2 + this.roadWidth(y) / 2;
  }

  laneX(lane, y) {
    const width = this.roadWidth(y);
    return W / 2 + (lane * width) / 3.1;
  }

  drawRoad() {
    this.road.clear();
    let roadColor = this.weather === 'rain' ? 0x282c2e : 0x484b4d;
    this.road.fillStyle(roadColor, 1);

    this.road.beginPath();
    this.road.moveTo(this.roadLeft(HORIZON), HORIZON);
    this.road.lineTo(this.roadRight(HORIZON), HORIZON);
    this.road.lineTo(this.roadRight(H), H);
    this.road.lineTo(this.roadLeft(H), H);
    this.road.closePath();
    this.road.fillPath();

    // Shoulders
    this.shoulders.clear();
    let shoulderColor = this.weather === 'rain' ? 0x7a6f56 : 0xb5a98a;
    this.shoulders.fillStyle(shoulderColor, 1);

    // Left shoulder
    this.shoulders.beginPath();
    this.shoulders.moveTo(this.roadLeft(HORIZON), HORIZON);
    this.shoulders.lineTo(this.roadLeft(H), H);
    this.shoulders.lineTo(this.roadLeft(H) - 30, H);
    this.shoulders.lineTo(this.roadLeft(HORIZON) - 12, HORIZON);
    this.shoulders.closePath();
    this.shoulders.fillPath();

    // Right shoulder
    this.shoulders.beginPath();
    this.shoulders.moveTo(this.roadRight(HORIZON), HORIZON);
    this.shoulders.lineTo(this.roadRight(H), H);
    this.shoulders.lineTo(this.roadRight(H) + 30, H);
    this.shoulders.lineTo(this.roadRight(HORIZON) + 12, HORIZON);
    this.shoulders.closePath();
    this.shoulders.fillPath();

    this.drawLaneLines();
  }

  drawLaneLines() {
    this.roadLines.clear();

    // Outer solid white lines
    this.roadLines.lineStyle(6, 0xf3efe0, 0.95);
    this.roadLines.beginPath();
    this.roadLines.moveTo(this.roadLeft(HORIZON), HORIZON);
    this.roadLines.lineTo(this.roadLeft(H), H);
    this.roadLines.strokePath();

    this.roadLines.beginPath();
    this.roadLines.moveTo(this.roadRight(HORIZON), HORIZON);
    this.roadLines.lineTo(this.roadRight(H), H);
    this.roadLines.strokePath();

    // Lane dashes
    for (const boundary of [-0.5, 0.5]) {
      for (let i = 0; i < 18; i++) {
        let t = (i / 18 + this.roadScroll) % 1;
        const t2 = Math.min(1, t + 0.038);
        const y1 = Phaser.Math.Linear(HORIZON, H, t);
        const y2 = Phaser.Math.Linear(HORIZON, H, t2);

        const x1 = W / 2 + (boundary * this.roadWidth(y1)) / 1.55;
        const x2 = W / 2 + (boundary * this.roadWidth(y2)) / 1.55;

        this.roadLines.fillStyle(0xf1ece0, 0.92);
        this.roadLines.fillRect(x1 - 3, y1, 6, Math.max(4, y2 - y1));
      }
    }
  }

  // ============================================================
  // PLAYER CREATION & RENDERING
  // ============================================================

  createPlayer() {
    this.playerContainer = this.add.container(W / 2, PLAYER_Y).setDepth(4000);

    this.playerGraphics = this.add.graphics();
    this.playerShieldGraphics = this.add.graphics();
    this.playerNitroGraphics = this.add.graphics();

    this.playerPlate = this.add.text(0, 48, 'KA 01 MG 2026', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '11px',
      fontStyle: 'bold',
      color: '#111111',
      backgroundColor: '#f6d83b',
      padding: { left: 4, right: 4, top: 1, bottom: 1 }
    }).setOrigin(0.5);

    this.playerContainer.add([
      this.playerNitroGraphics,
      this.playerGraphics,
      this.playerPlate,
      this.playerShieldGraphics
    ]);

    this.drawPlayerVehicle();
  }

  drawPlayerVehicle() {
    const g = this.playerGraphics;
    g.clear();
    const type = this.selectedVehicle.id;

    // Common Drop Shadow
    g.fillStyle(0x000000, 0.45);
    g.fillEllipse(0, 46, 160, 30);

    if (type === 'cab') {
      // White Bangalore Cab (Indica / Swift)
      // Wheels
      g.fillStyle(0x1a1a1a, 1);
      g.fillRoundedRect(-76, 5, 22, 48, 5);
      g.fillRoundedRect(54, 5, 22, 48, 5);

      // Body
      g.fillStyle(0xf3f4f6, 1);
      g.fillRoundedRect(-68, -12, 136, 70, 14);

      // Yellow Commercial Plate bumper strip
      g.fillStyle(0xeab308, 1);
      g.fillRoundedRect(-64, 38, 128, 12, 3);

      // Roof & Cabin
      g.fillStyle(0xe5e7eb, 1);
      g.fillRoundedRect(-52, -58, 104, 62, 16);

      // Rear Glass
      g.fillStyle(0x1f2937, 1);
      g.fillRoundedRect(-42, -50, 84, 42, 10);
      g.fillStyle(0x93c5fd, 0.35);
      g.fillRect(-32, -44, 64, 8); // Glass reflection

      // Tail lights
      g.fillStyle(0xef4444, 1);
      g.fillRoundedRect(-62, 10, 22, 24, 4);
      g.fillRoundedRect(40, 10, 22, 24, 4);
    } else if (type === 'auto') {
      // Bangalore Yellow-Green Auto Rickshaw
      // Rear Wheels
      g.fillStyle(0x111111, 1);
      g.fillRoundedRect(-62, 10, 20, 44, 5);
      g.fillRoundedRect(42, 10, 20, 44, 5);

      // Lower Green Body
      g.fillStyle(0x15803d, 1);
      g.fillRoundedRect(-54, -8, 108, 64, 12);

      // Upper Yellow Hood Canopy
      g.fillStyle(0xfacc15, 1);
      g.fillRoundedRect(-52, -64, 104, 66, 16);

      // Open back view & passenger seat
      g.fillStyle(0x27272a, 1);
      g.fillRoundedRect(-40, -48, 80, 44, 8);
      g.fillStyle(0x78350f, 1); // Rexine brown seat
      g.fillRoundedRect(-34, -20, 68, 18, 4);

      // Auto meter & stickers
      g.fillStyle(0xd97706, 1);
      g.fillRect(-18, 20, 36, 8);

      // Tail lights
      g.fillStyle(0xdc2626, 1);
      g.fillCircle(-42, 24, 8);
      g.fillCircle(42, 24, 8);
    } else if (type === 'scooter') {
      // Sleek EV Scooter
      g.fillStyle(0x111111, 1);
      g.fillRoundedRect(-12, 18, 24, 40, 6); // Single rear tire

      // Body
      g.fillStyle(0x0284c7, 1);
      g.fillRoundedRect(-22, -32, 44, 60, 12);

      // Seat
      g.fillStyle(0x1f2937, 1);
      g.fillRoundedRect(-16, -24, 32, 36, 8);

      // Rider helmet
      g.fillStyle(0x0f172a, 1);
      g.fillCircle(0, -56, 18);
      g.fillStyle(0x38bdf8, 0.7); // Visor
      g.fillRect(-12, -60, 24, 8);

      // Neon taillight
      g.fillStyle(0xef4444, 1);
      g.fillRect(-18, 12, 36, 6);
    } else if (type === 'bullet') {
      // Royal Bullet 350
      g.fillStyle(0x0f172a, 1);
      g.fillRoundedRect(-16, 15, 32, 46, 6); // Fat rear tire
      g.fillStyle(0x94a3b8, 1); // Chrome exhaust
      g.fillRect(18, 5, 8, 38);

      // Cruiser Body (Matte Black / Chrome)
      g.fillStyle(0x18181b, 1);
      g.fillRoundedRect(-26, -34, 52, 60, 10);

      // Split Leather Seats
      g.fillStyle(0x451a03, 1);
      g.fillRoundedRect(-18, -26, 36, 36, 6);

      // Rider with classic jacket
      g.fillStyle(0x3f3f46, 1);
      g.fillCircle(0, -58, 20); // Helmet

      // Round bullet taillight
      g.fillStyle(0xdc2626, 1);
      g.fillCircle(0, 16, 10);
    } else if (type === 'bus') {
      // BMTC Vajra Volvo Green Bus
      g.fillStyle(0x111111, 1);
      g.fillRoundedRect(-85, 0, 24, 56, 5);
      g.fillRoundedRect(61, 0, 24, 56, 5);

      // Huge Green Body
      g.fillStyle(0x15803d, 1);
      g.fillRoundedRect(-76, -85, 152, 138, 16);

      // Big Rear Windshield
      g.fillStyle(0x0f172a, 1);
      g.fillRoundedRect(-64, -72, 128, 60, 10);

      // BMTC White & Yellow Stripes
      g.fillStyle(0xfacc15, 1);
      g.fillRect(-76, 5, 152, 10);
      g.fillStyle(0xffffff, 1);
      g.fillRect(-76, 17, 152, 6);

      // LED destination board
      g.fillStyle(0xf59e0b, 1);
      g.fillRect(-45, -68, 90, 14);

      // Vertical Tail light clusters
      g.fillStyle(0xef4444, 1);
      g.fillRoundedRect(-70, 0, 10, 28, 3);
      g.fillRoundedRect(60, 0, 10, 28, 3);
    }
  }

  updatePlayerPosition() {
    const targetX = this.laneX(this.playerLane, PLAYER_Y);
    this.playerContainer.x = Phaser.Math.Linear(this.playerContainer.x, targetX, this.selectedVehicle.handling);
    this.playerContainer.y = PLAYER_Y;

    // Slight steering tilt
    const tilt = (this.targetLane - this.playerLane) * 0.08;
    this.playerContainer.rotation = Phaser.Math.Linear(this.playerContainer.rotation, tilt, 0.2);

    // Power-up visual overlays
    this.playerShieldGraphics.clear();
    if (this.shieldTime > 0) {
      const pulse = 1 + Math.sin(this.time.now * 0.01) * 0.06;
      this.playerShieldGraphics.lineStyle(4, 0x38bdf8, 0.85);
      this.playerShieldGraphics.strokeCircle(0, 0, 85 * pulse);
      this.playerShieldGraphics.fillStyle(0x0284c7, 0.2);
      this.playerShieldGraphics.fillCircle(0, 0, 85 * pulse);
    }

    this.playerNitroGraphics.clear();
    if (this.nitroTime > 0) {
      // Nitro Exhaust Flames
      const fLength = 30 + Math.random() * 25;
      this.playerNitroGraphics.fillStyle(0x38bdf8, 0.9);
      this.playerNitroGraphics.fillTriangle(-20, 45, 0, 45 + fLength, 20, 45);
      this.playerNitroGraphics.fillStyle(0xffffff, 0.95);
      this.playerNitroGraphics.fillTriangle(-10, 45, 0, 45 + fLength * 0.6, 10, 45);
    }
  }

  // ============================================================
  // BANGALORE ROAD HAZARDS & POTHOLES
  // ============================================================

  spawnPothole() {
    const free = LANES.filter(lane => !this.potholes.some(p => p.lane === lane && p.worldY < 420));
    if (free.length === 0) return;

    const lane = Phaser.Math.RND.pick(free);
    const p = this.add.graphics();
    const kind = Phaser.Math.RND.pick(['crater', 'puddle', 'branch']);

    p.lane = lane;
    p.worldY = HORIZON + 5;
    p.kind = kind;

    if (kind === 'puddle') {
      // Waterlogged muddy pothole
      p.fillStyle(0x382d24, 0.9);
      p.fillEllipse(0, 0, 95, 48);
      p.fillStyle(0x4a6b82, 0.85);
      p.fillEllipse(0, 0, 75, 34);
      p.fillStyle(0xa5d8f3, 0.4); // Water sheen
      p.fillEllipse(-10, -4, 25, 8);
    } else if (kind === 'branch') {
      // Classic Bengaluru tree branch sticking out of pothole!
      p.fillStyle(0x221f1d, 1);
      p.fillEllipse(0, 0, 88, 44);
      p.fillStyle(0x453018, 1); // Branch
      p.fillRect(-4, -40, 8, 42);
      p.fillStyle(0x15803d, 0.9); // Leaves
      p.fillCircle(-8, -42, 14);
      p.fillCircle(6, -46, 12);
    } else {
      // Deep crater
      p.fillStyle(0x181716, 1);
      p.fillEllipse(0, 0, 90, 44);
      p.fillStyle(0x5c5040, 1);
      p.fillEllipse(-3, 2, 70, 32);
      p.fillStyle(0x292524, 1);
      p.fillEllipse(0, 0, 48, 22);
    }

    p.setDepth(2000);
    this.potholes.push(p);
  }

  updatePotholes(delta) {
    const pxPerSec = 110 + (this.speed - 60) * 1.5;
    const move = (pxPerSec * delta) / 1000;

    for (let i = this.potholes.length - 1; i >= 0; i--) {
      const p = this.potholes[i];
      p.worldY += move;
      p.x = this.laneX(p.lane, p.worldY);
      p.y = p.worldY;

      const progress = Phaser.Math.Clamp((p.worldY - HORIZON) / (PLAYER_Y - HORIZON), 0, 1);
      p.setScale(Phaser.Math.Linear(0.2, 1.25, progress));
      p.setDepth(2000 + Math.floor(p.worldY));

      if (p.worldY > H + 80) {
        this.potholesDodged++;
        p.destroy();
        this.potholes.splice(i, 1);
      }
    }
  }

  // ============================================================
  // TRAFFIC & WRONG-WAY DRIVERS (KEY BANGALORE FEATURE!)
  // ============================================================

  spawnTraffic() {
    const lane = Phaser.Math.RND.pick(LANES);
    if (this.traffic.some(v => v.lane === lane && v.worldY < 360)) return;

    // 25% chance of Oncoming Wrong-Way Driver!
    const isWrongWay = Math.random() < 0.28;
    const type = isWrongWay
      ? Phaser.Math.RND.pick(['wrong_bike', 'wrong_auto', 'wrong_scooter'])
      : Phaser.Math.RND.pick(['auto', 'auto', 'bike', 'cab', 'bus', 'tanker']);

    const vehicle = this.createTrafficGraphic(type, isWrongWay);
    vehicle.lane = lane;
    vehicle.worldY = HORIZON + 8;
    vehicle.isWrongWay = isWrongWay;
    vehicle.type = type;
    vehicle.swerved = false;
    vehicle.targetLane = lane;

    if (isWrongWay) {
      AudioFX.playWrongWayAlert();
      this.showWrongWayWarning(lane);
    }

    vehicle.x = this.laneX(lane, vehicle.worldY);
    vehicle.y = vehicle.worldY;
    this.traffic.push(vehicle);
  }

  showWrongWayWarning(lane) {
    const banner = this.add.container(W / 2, 230);
    const bg = this.add.graphics();
    bg.fillStyle(0xdc2626, 0.92);
    bg.fillRoundedRect(-190, -22, 380, 44, 10);
    bg.lineStyle(2, 0xffffff, 1);
    bg.strokeRoundedRect(-190, -22, 380, 44, 10);

    const txt = this.add.text(0, 0, '⚠️ WRONG WAY DRIVER INCOMING!', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '18px',
      fontStyle: 'bold',
      color: '#ffffff'
    }).setOrigin(0.5);

    banner.add([bg, txt]);
    banner.setDepth(7000);

    this.tweens.add({
      targets: banner,
      scaleX: 1.1,
      scaleY: 1.1,
      yoyo: true,
      duration: 200,
      repeat: 3,
      onComplete: () => banner.destroy()
    });
  }

  createTrafficGraphic(type, isWrongWay) {
    const c = this.add.container(0, 0);
    const g = this.add.graphics();

    if (isWrongWay) {
      // Wrong-way delivery bike or auto driving head-on!
      if (type === 'wrong_bike' || type === 'wrong_scooter') {
        // Headlight glow
        g.fillStyle(0xfef08a, 0.7);
        g.fillTriangle(0, 0, -35, -70, 35, -70);

        // Front view scooter/bike
        g.fillStyle(0xd97706, 1); // Swiggy/Zomato Orange box backpack
        g.fillRoundedRect(-22, -38, 44, 38, 6);
        g.fillStyle(0x0f172a, 1); // Helmet
        g.fillCircle(0, -42, 14);

        // Handlebars & bright headlamp
        g.fillStyle(0x18181b, 1);
        g.fillRect(-28, -12, 56, 8);
        g.fillStyle(0xffffff, 1);
        g.fillCircle(0, -8, 10);
      } else {
        // Wrong-way Auto
        g.fillStyle(0xfef08a, 0.7);
        g.fillTriangle(0, 0, -50, -80, 50, -80);
        g.fillStyle(0xfacc15, 1);
        g.fillRoundedRect(-32, -45, 64, 75, 10);
        g.fillStyle(0x15803d, 1);
        g.fillRoundedRect(-32, -15, 64, 45, 6);
        g.fillStyle(0xffffff, 1); // Front single headlight
        g.fillCircle(0, 15, 12);
      }
    } else {
      // Normal rear-view traffic
      if (type === 'auto') {
        g.fillStyle(0x15803d, 1);
        g.fillRoundedRect(-28, -35, 56, 70, 8);
        g.fillStyle(0xfacc15, 1);
        g.fillRoundedRect(-28, -35, 56, 26, 8);
        g.fillStyle(0x27272a, 1);
        g.fillRect(-20, -28, 40, 14);
        g.fillStyle(0xdc2626, 1);
        g.fillCircle(-20, 22, 5);
        g.fillCircle(20, 22, 5);
      } else if (type === 'bike') {
        g.fillStyle(0x0f172a, 1);
        g.fillRoundedRect(-8, -25, 16, 50, 4);
        g.fillStyle(0xef4444, 1);
        g.fillCircle(0, 20, 6);
      } else if (type === 'bus') {
        g.fillStyle(0x1d4ed8, 1); // Blue BMTC ordinary
        g.fillRoundedRect(-42, -70, 84, 135, 10);
        g.fillStyle(0x0f172a, 1);
        g.fillRect(-34, -58, 68, 40);
        g.fillStyle(0xfacc15, 1);
        g.fillRect(-42, 18, 84, 8);
      } else if (type === 'tanker') {
        // Bangalore Water Tanker (White cylinder)
        g.fillStyle(0xe2e8f0, 1);
        g.fillRoundedRect(-38, -65, 76, 110, 20);
        g.fillStyle(0x0284c7, 1);
        g.fillRect(-38, -15, 76, 15);
        g.fillStyle(0xdc2626, 1);
        g.fillCircle(-28, 35, 7);
        g.fillCircle(28, 35, 7);
      } else {
        // Generic Car
        g.fillStyle(0x64748b, 1);
        g.fillRoundedRect(-34, -48, 68, 96, 10);
        g.fillStyle(0x1e293b, 1);
        g.fillRoundedRect(-26, -34, 52, 28, 6);
        g.fillStyle(0xef4444, 1);
        g.fillRect(-28, 36, 14, 8);
        g.fillRect(14, 36, 14, 8);
      }
    }

    c.add(g);
    c.setDepth(1200);
    return c;
  }

  updateTraffic(delta) {
    for (let i = this.traffic.length - 1; i >= 0; i--) {
      const v = this.traffic[i];

      // Wrong way vehicles move much faster towards you!
      const relativeSpeed = v.isWrongWay
        ? (this.speed + 75) * 1.8
        : (this.speed - 35) * 1.2;

      const move = (relativeSpeed * delta) / 1000;
      v.worldY += move;

      // Auto erratic swerve behavior
      if (v.type === 'auto' && !v.isWrongWay && Math.random() < 0.008 && !v.swerved) {
        v.targetLane = Phaser.Math.Clamp(v.lane + Phaser.Math.RND.pick([-1, 1]), -1, 1);
        v.swerved = true;
      }
      v.lane = Phaser.Math.Linear(v.lane, v.targetLane, 0.05);

      v.x = this.laneX(v.lane, v.worldY);
      v.y = v.worldY;

      const progress = Phaser.Math.Clamp((v.worldY - HORIZON) / (H - HORIZON), 0, 1);
      v.setScale(Phaser.Math.Linear(0.2, 1.15, progress));
      v.setDepth(1200 + Math.floor(v.worldY));

      if (v.worldY > H + 160) {
        if (v.isWrongWay) this.wrongWaysDodged++;
        v.destroy();
        this.traffic.splice(i, 1);
      }
    }
  }

  // ============================================================
  // POWERUPS & COINS
  // ============================================================

  spawnCoinRow() {
    const lane = Phaser.Math.RND.pick(LANES);
    for (let j = 0; j < 4; j++) {
      const coin = this.add.graphics();
      coin.lane = lane;
      coin.worldY = HORIZON + 10 - j * 45;

      coin.fillStyle(0xfacc15, 1);
      coin.fillCircle(0, 0, 16);
      coin.lineStyle(3, 0xd97706, 1);
      coin.strokeCircle(0, 0, 16);

      const t = this.add.text(0, 0, '₹', {
        fontFamily: 'Arial',
        fontSize: '18px',
        fontStyle: 'bold',
        color: '#78350f'
      }).setOrigin(0.5);

      const c = this.add.container(0, 0, [coin, t]);
      c.lane = lane;
      c.worldY = coin.worldY;
      c.setDepth(1500);

      this.coins.push(c);
    }
  }

  updateCoins(delta) {
    const pxPerSec = 110 + (this.speed - 60) * 1.5;
    const move = (pxPerSec * delta) / 1000;

    for (let i = this.coins.length - 1; i >= 0; i--) {
      const c = this.coins[i];
      c.worldY += move;
      c.x = this.laneX(c.lane, c.worldY);
      c.y = c.worldY;

      const progress = Phaser.Math.Clamp((c.worldY - HORIZON) / (H - HORIZON), 0, 1);
      c.setScale(Phaser.Math.Linear(0.2, 1.1, progress));
      c.setDepth(1500 + Math.floor(c.worldY));

      // Coin pickup check
      if (Math.abs(c.lane - this.playerLane) < 0.45 && Math.abs(c.worldY - PLAYER_Y) < 40) {
        AudioFX.playCoin();
        AudioFX.vibrate(20);
        this.currentCoins += 1;
        this.showFloatingText(c.x, c.y - 20, '+1 ₹', '#facc15');
        c.destroy();
        this.coins.splice(i, 1);
        continue;
      }

      if (c.worldY > H + 50) {
        c.destroy();
        this.coins.splice(i, 1);
      }
    }
  }

  spawnPowerup() {
    const lane = Phaser.Math.RND.pick(LANES);
    const type = Phaser.Math.RND.pick(['coffee', 'coconut', 'chai']); // nitro, shield, repair

    const c = this.add.container(0, 0);
    const g = this.add.graphics();

    if (type === 'coffee') {
      // Steaming Filter Coffee (Nitro)
      g.fillStyle(0x78350f, 1);
      g.fillRoundedRect(-18, -18, 36, 36, 8);
      g.fillStyle(0xfbbf24, 1);
      g.fillCircle(0, 0, 12);
      const label = this.add.text(0, -32, '☕ NITRO', {
        fontFamily: 'Arial', fontSize: '13px', fontStyle: 'bold', color: '#fbbf24', backgroundColor: '#000000aa'
      }).setOrigin(0.5);
      c.add([g, label]);
    } else if (type === 'coconut') {
      // Elaneer / Tender Coconut (Shield)
      g.fillStyle(0x15803d, 1);
      g.fillCircle(0, 0, 20);
      g.fillStyle(0x86efac, 1);
      g.fillCircle(-4, -4, 8);
      const label = this.add.text(0, -32, '🥥 SHIELD', {
        fontFamily: 'Arial', fontSize: '13px', fontStyle: 'bold', color: '#86efac', backgroundColor: '#000000aa'
      }).setOrigin(0.5);
      c.add([g, label]);
    } else {
      // Cutting Chai (Repair)
      g.fillStyle(0xd97706, 1);
      g.fillRoundedRect(-14, -20, 28, 40, 6);
      g.fillStyle(0xfef3c7, 1);
      g.fillRect(-10, -14, 20, 10);
      const label = this.add.text(0, -32, '🍵 REPAIR', {
        fontFamily: 'Arial', fontSize: '13px', fontStyle: 'bold', color: '#fed7aa', backgroundColor: '#000000aa'
      }).setOrigin(0.5);
      c.add([g, label]);
    }

    c.lane = lane;
    c.type = type;
    c.worldY = HORIZON + 10;
    c.setDepth(1600);
    this.powerups.push(c);
  }

  updatePowerups(delta) {
    const pxPerSec = 110 + (this.speed - 60) * 1.5;
    const move = (pxPerSec * delta) / 1000;

    for (let i = this.powerups.length - 1; i >= 0; i--) {
      const p = this.powerups[i];
      p.worldY += move;
      p.x = this.laneX(p.lane, p.worldY);
      p.y = p.worldY;

      const progress = Phaser.Math.Clamp((p.worldY - HORIZON) / (H - HORIZON), 0, 1);
      p.setScale(Phaser.Math.Linear(0.3, 1.2, progress));

      // Pickup
      if (Math.abs(p.lane - this.playerLane) < 0.48 && Math.abs(p.worldY - PLAYER_Y) < 45) {
        AudioFX.playPowerup();
        AudioFX.vibrate(60);

        if (p.type === 'coffee') {
          this.nitroTime = 7000;
          this.showFloatingText(p.x, p.y - 30, '⚡ FILTER COFFEE NITRO!', '#f59e0b');
        } else if (p.type === 'coconut') {
          this.shieldTime = 10000;
          this.showFloatingText(p.x, p.y - 30, '🥥 ELANEER SHIELD!', '#38bdf8');
        } else if (p.type === 'chai') {
          this.playerHealth = Math.min(this.maxHealth, this.playerHealth + 1);
          this.showFloatingText(p.x, p.y - 30, '🍵 SUSPENSION REPAIRED!', '#4ade80');
        }

        p.destroy();
        this.powerups.splice(i, 1);
        continue;
      }

      if (p.worldY > H + 60) {
        p.destroy();
        this.powerups.splice(i, 1);
      }
    }
  }

  showFloatingText(x, y, text, color = '#ffffff') {
    const txt = this.add.text(x, y, text, {
      fontFamily: 'Arial, sans-serif',
      fontSize: '22px',
      fontStyle: 'bold',
      color: color,
      stroke: '#000000',
      strokeThickness: 5
    }).setOrigin(0.5).setDepth(8000);

    this.tweens.add({
      targets: txt,
      y: y - 55,
      alpha: 0,
      duration: 1100,
      ease: 'Power2',
      onComplete: () => txt.destroy()
    });
  }

  // ============================================================
  // OVERHEAD HIGHWAY SIGNS
  // ============================================================

  spawnHighwaySign() {
    const loc = LOCATIONS[this.locationIndex];
    const nextLoc = LOCATIONS[Math.min(this.locationIndex + 1, LOCATIONS.length - 1)];

    const c = this.add.container(W / 2, HORIZON);
    const g = this.add.graphics();

    // Steel overhead gantry
    g.fillStyle(0x475569, 1);
    g.fillRect(-380, -120, 16, 160);
    g.fillRect(364, -120, 16, 160);

    // Green Signboard
    g.fillStyle(loc.color || 0x065f46, 1);
    g.fillRoundedRect(-360, -110, 720, 95, 8);
    g.lineStyle(4, 0xffffff, 1);
    g.strokeRoundedRect(-354, -104, 708, 83, 6);

    const eng = this.add.text(0, -85, loc.name, {
      fontFamily: 'Arial', fontSize: '26px', fontStyle: 'bold', color: '#ffffff'
    }).setOrigin(0.5);

    const kn = this.add.text(0, -56, loc.kannada, {
      fontFamily: 'Arial', fontSize: '20px', color: '#fef08a'
    }).setOrigin(0.5);

    const dist = this.add.text(0, -32, `NEXT: ${nextLoc.name} (${nextLoc.kannada}) ↑`, {
      fontFamily: 'Arial', fontSize: '13px', fontStyle: 'bold', color: '#e2e8f0'
    }).setOrigin(0.5);

    c.add([g, eng, kn, dist]);
    c.worldY = HORIZON;
    c.setDepth(900);
    this.signs.push(c);
  }

  updateHighwaySigns(delta) {
    const pxPerSec = 110 + (this.speed - 60) * 1.5;
    const move = (pxPerSec * delta) / 1000;

    for (let i = this.signs.length - 1; i >= 0; i--) {
      const s = this.signs[i];
      s.worldY += move;
      s.y = s.worldY;

      const progress = Phaser.Math.Clamp((s.worldY - HORIZON) / (H - HORIZON), 0, 1);
      s.setScale(Phaser.Math.Linear(0.35, 1.4, progress));
      s.setDepth(900 + Math.floor(s.worldY * 2));

      if (s.worldY > H + 180) {
        s.destroy();
        this.signs.splice(i, 1);
      }
    }
  }

  // ============================================================
  // COLLISIONS, NEAR-MISSES & DAMAGE
  // ============================================================

  checkCollisions() {
    if (this.gameState !== 'playing') return;

    // 1. Potholes Collision
    for (let i = this.potholes.length - 1; i >= 0; i--) {
      const p = this.potholes[i];
      if (Math.abs(p.lane - this.playerLane) < 0.46 && Math.abs(p.worldY - PLAYER_Y) < 36) {
        if (this.nitroTime > 0 || this.shieldTime > 0) {
          // Pothole smashed / shielded
          AudioFX.playPotholeThud();
          this.showFloatingText(p.x, p.y, 'SHIELDED!', '#38bdf8');
          p.destroy();
          this.potholes.splice(i, 1);
          continue;
        }

        // Damage suspension
        this.playerHealth--;
        AudioFX.playPotholeThud();
        AudioFX.vibrate([80, 50, 80]);
        this.cameras.main.shake(250, 0.022);

        this.showFloatingText(p.x, p.y - 20, '-1 SUSPENSION!', '#ef4444');
        p.destroy();
        this.potholes.splice(i, 1);

        if (this.playerHealth <= 0) {
          this.triggerGameOver('SUSPENSION DESTROYED BY BANGALORE POTHOLE!');
          return;
        }
      }
    }

    // 2. Traffic Collision & Near Miss
    for (let i = this.traffic.length - 1; i >= 0; i--) {
      const v = this.traffic[i];
      const laneDiff = Math.abs(v.lane - this.playerLane);
      const yDiff = Math.abs(v.worldY - PLAYER_Y);

      // Direct Crash
      if (laneDiff < 0.44 && yDiff < 42) {
        if (this.nitroTime > 0) {
          // Nitro smash
          AudioFX.playCrash();
          AudioFX.vibrate(60);
          this.showFloatingText(v.x, v.y, 'SMASHED! +50 ₹', '#f59e0b');
          this.currentCoins += 5;
          v.destroy();
          this.traffic.splice(i, 1);
          continue;
        }

        if (this.shieldTime > 0) {
          // Shield absorbs crash
          AudioFX.playCrash();
          AudioFX.vibrate(100);
          this.shieldTime = 0;
          this.showFloatingText(v.x, v.y, 'SHIELD BROKEN!', '#38bdf8');
          v.destroy();
          this.traffic.splice(i, 1);
          continue;
        }

        // Fatal crash
        AudioFX.playCrash();
        AudioFX.vibrate([150, 80, 200]);
        this.cameras.main.shake(400, 0.04);
        const reason = v.isWrongWay
          ? 'HEAD-ON COLLISION WITH WRONG-WAY DRIVER!'
          : 'CRASHED INTO BENGALURU TRAFFIC!';
        this.triggerGameOver(reason);
        return;
      }

      // Near-Miss Bonus Detection!
      if (!v.nearMissAwarded && laneDiff > 0.42 && laneDiff < 0.85 && yDiff < 30) {
        v.nearMissAwarded = true;
        this.nearMissCombo++;
        const bonus = v.isWrongWay ? 250 : 100;
        AudioFX.playNearMiss();
        this.distance += bonus / 10;
        this.showFloatingText(v.x, v.y - 40, `SWERVE! +${bonus}`, '#38bdf8');
      }
    }
  }

  // ============================================================
  // HORN MECHANIC (CLEARING PATH IN BANGALORE STYLE)
  // ============================================================

  honkHorn() {
    if (this.gameState !== 'playing') return;

    AudioFX.playHorn(this.selectedVehicle.hornType);
    AudioFX.vibrate(40);

    this.showFloatingText(this.playerContainer.x, PLAYER_Y - 60, '📢 PEE-POO!', '#facc15');

    // Scatter regular traffic ahead in your lane!
    this.traffic.forEach(v => {
      if (!v.isWrongWay && Math.abs(v.lane - this.playerLane) < 0.6 && v.worldY > 300 && v.worldY < PLAYER_Y) {
        v.targetLane = v.lane <= 0 ? 1 : -1;
        this.showFloatingText(v.x, v.worldY - 30, '⚠️ MOVING!', '#e2e8f0');
      }
    });
  }

  // ============================================================
  // HUD & SCREENS
  // ============================================================

  createHUD() {
    this.hudContainer = this.add.container(0, 0).setDepth(6000);

    // Top Stats Card
    const cardBg = this.add.graphics();
    cardBg.fillStyle(0x07111c, 0.88);
    cardBg.fillRoundedRect(20, 16, 360, 150, 14);
    cardBg.lineStyle(2, 0x1e293b, 1);
    cardBg.strokeRoundedRect(20, 16, 360, 150, 14);

    this.distanceText = this.add.text(36, 28, 'DISTANCE   0 m', {
      fontFamily: 'Arial', fontSize: '24px', fontStyle: 'bold', color: '#ffffff'
    });

    this.speedText = this.add.text(36, 62, 'SPEED   70 km/h', {
      fontFamily: 'Arial', fontSize: '20px', fontStyle: 'bold', color: '#94a3b8'
    });

    this.locationText = this.add.text(36, 94, '● KORAMANGALA', {
      fontFamily: 'Arial', fontSize: '18px', fontStyle: 'bold', color: '#facc15'
    });

    this.kannadaLocText = this.add.text(56, 120, 'ಕೊರಮಂಗಲ', {
      fontFamily: 'Arial', fontSize: '15px', color: '#e2e8f0'
    });

    // Top Right Health & Coins Card
    const rightBg = this.add.graphics();
    rightBg.fillStyle(0x07111c, 0.88);
    rightBg.fillRoundedRect(W - 270, 16, 250, 110, 14);
    rightBg.lineStyle(2, 0x1e293b, 1);
    rightBg.strokeRoundedRect(W - 270, 16, 250, 110, 14);

    this.healthText = this.add.text(W - 250, 28, 'SUSPENSION', {
      fontFamily: 'Arial', fontSize: '15px', fontStyle: 'bold', color: '#94a3b8'
    });

    this.heartsText = this.add.text(W - 250, 48, '❤️❤️❤️', {
      fontSize: '22px'
    });

    this.coinText = this.add.text(W - 250, 84, '₹ 0 COINS', {
      fontFamily: 'Arial', fontSize: '18px', fontStyle: 'bold', color: '#facc15'
    });

    // Pause Button
    const pauseBtn = this.add.container(W - 65, 145);
    const pBg = this.add.graphics();
    pBg.fillStyle(0x1e293b, 0.9);
    pBg.fillCircle(0, 0, 22);
    const pTxt = this.add.text(0, 0, '⏸️', { fontSize: '16px' }).setOrigin(0.5);
    pauseBtn.add([pBg, pTxt]);
    pauseBtn.setSize(44, 44).setInteractive({ useHandCursor: true });
    pauseBtn.on('pointerdown', () => this.togglePause());

    this.hudContainer.add([
      cardBg,
      this.distanceText,
      this.speedText,
      this.locationText,
      this.kannadaLocText,
      rightBg,
      this.healthText,
      this.heartsText,
      this.coinText,
      pauseBtn
    ]);

    this.hudContainer.setVisible(false);
  }

  updateHUD() {
    this.distanceText.setText(`DISTANCE   ${Math.floor(this.distance)} m`);
    this.speedText.setText(`SPEED   ${Math.floor(this.speed)} km/h`);
    this.coinText.setText(`₹ ${this.currentCoins} COINS`);

    const loc = LOCATIONS[this.locationIndex];
    this.locationText.setText(`● ${loc.name}`);
    this.kannadaLocText.setText(loc.kannada);

    let hearts = '';
    for (let i = 0; i < this.maxHealth; i++) {
      hearts += i < this.playerHealth ? '❤️' : '🖤';
    }
    this.heartsText.setText(hearts);
  }

  // ============================================================
  // TOUCH & MOBILE CONTROLS
  // ============================================================

  createTouchControls() {
    this.touchContainer = this.add.container(0, 0).setDepth(7500);

    // Left Steer Button
    const leftBtn = this.createButton(90, H - 90, 70, '◀', '#1e293b', () => this.changeLane(-1));

    // Right Steer Button
    const rightBtn = this.createButton(210, H - 90, 70, '▶', '#1e293b', () => this.changeLane(1));

    // Horn Button
    const hornBtn = this.createButton(W - 90, H - 90, 75, '📢 HORN', '#d97706', () => this.honkHorn());

    this.touchContainer.add([leftBtn, rightBtn, hornBtn]);
    this.touchContainer.setVisible(false);
  }

  createButton(x, y, radius, label, colorHex, callback) {
    const c = this.add.container(x, y);
    const bg = this.add.graphics();
    const parsedColor = Phaser.Display.Color.HexStringToColor(colorHex).color;

    bg.fillStyle(parsedColor, 0.85);
    bg.fillCircle(0, 0, radius / 2);
    bg.lineStyle(3, 0xffffff, 0.8);
    bg.strokeCircle(0, 0, radius / 2);

    const txt = this.add.text(0, 0, label, {
      fontFamily: 'Arial, sans-serif',
      fontSize: '18px',
      fontStyle: 'bold',
      color: '#ffffff'
    }).setOrigin(0.5);

    c.add([bg, txt]);
    c.setSize(radius, radius).setInteractive({ useHandCursor: true });

    c.on('pointerdown', () => {
      c.setScale(0.92);
      callback();
    });

    c.on('pointerup', () => c.setScale(1.0));
    c.on('pointerout', () => c.setScale(1.0));

    return c;
  }

  createKeyControls() {
    this.input.keyboard.on('keydown-A', () => this.changeLane(-1));
    this.input.keyboard.on('keydown-D', () => this.changeLane(1));
    this.input.keyboard.on('keydown-LEFT', () => this.changeLane(-1));
    this.input.keyboard.on('keydown-RIGHT', () => this.changeLane(1));
    this.input.keyboard.on('keydown-H', () => this.honkHorn());
    this.input.keyboard.on('keydown-SPACE', () => {
      if (this.gameState === 'menu' || this.gameState === 'gameover') {
        this.startGame();
      } else if (this.gameState === 'playing') {
        this.honkHorn();
      }
    });
    this.input.keyboard.on('keydown-P', () => this.togglePause());

    // Swipe & Touch Support on Game Area
    this.input.on('pointerdown', pointer => {
      this.touchStartX = pointer.x;
      this.touchStartY = pointer.y;
    });

    this.input.on('pointerup', pointer => {
      if (this.touchStartX === null || this.gameState !== 'playing') return;
      const dx = pointer.x - this.touchStartX;
      const dy = pointer.y - this.touchStartY;

      if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) {
        this.changeLane(dx > 0 ? 1 : -1);
      }
      this.touchStartX = null;
      this.touchStartY = null;
    });
  }

  changeLane(dir) {
    if (this.gameState !== 'playing') return;
    this.targetLane = Phaser.Math.Clamp(this.targetLane + dir, -1, 1);
  }

  // ============================================================
  // MENUS: TITLE, GARAGE, PAUSE, GAME OVER
  // ============================================================

  showMenu() {
    this.gameState = 'menu';
    this.clearAllUI();

    const overlay = this.add.rectangle(W / 2, H / 2, W, H, 0x050c14, 0.75).setDepth(6000);

    const title = this.add.text(W / 2, 170, 'POTHOLE DODGER', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '64px',
      fontStyle: 'bold',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 8
    }).setOrigin(0.5).setDepth(6001);

    const subtitle = this.add.text(W / 2, 235, 'ಬೆಂಗಳೂರು • BENGALURU EDITION', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '26px',
      fontStyle: 'bold',
      color: '#facc15'
    }).setOrigin(0.5).setDepth(6001);

    const high = this.add.text(W / 2, 280, `🏆 BEST: ${this.saveData.highScore} m  |  ₹ ${this.saveData.coins} COINS`, {
      fontFamily: 'Arial',
      fontSize: '20px',
      fontStyle: 'bold',
      color: '#94a3b8'
    }).setOrigin(0.5).setDepth(6001);

    // Play Button
    const playBtn = this.createMenuButton(W / 2, 370, '🚗 START DODGING', '#16a34a', () => this.startGame());

    // Garage Button
    const garageBtn = this.createMenuButton(W / 2, 455, '🛠️ GARAGE / VEHICLES', '#0284c7', () => this.showGarage());

    // Sound Toggle
    const sndLabel = this.saveData.settings.sound ? '🔊 SOUND: ON' : '🔇 SOUND: OFF';
    const soundBtn = this.createMenuButton(W / 2, 540, sndLabel, '#475569', btn => {
      const enabled = Storage.toggleSetting('sound');
      this.saveData = Storage.load();
      AudioFX.enabled = enabled;
      btn.txt.setText(enabled ? '🔊 SOUND: ON' : '🔇 SOUND: OFF');
    });

    const tip = this.add.text(W / 2, 630, 'Dodge Potholes, Autos & Wrong-Way Drivers • Press [H] or Horn to Clear Traffic!', {
      fontFamily: 'Arial',
      fontSize: '16px',
      color: '#cbd5e1'
    }).setOrigin(0.5).setDepth(6001);

    this.menuUI = [overlay, title, subtitle, high, playBtn, garageBtn, soundBtn, tip];
  }

  showGarage() {
    this.gameState = 'garage';
    this.clearAllUI();

    const overlay = this.add.rectangle(W / 2, H / 2, W, H, 0x050c14, 0.92).setDepth(6000);

    const title = this.add.text(W / 2, 70, '🛠️ NAMMA GARAGE', {
      fontFamily: 'Arial',
      fontSize: '44px',
      fontStyle: 'bold',
      color: '#facc15'
    }).setOrigin(0.5).setDepth(6001);

    const coinCount = this.add.text(W / 2, 115, `AVAILABLE BALANCE: ₹ ${this.saveData.coins} COINS`, {
      fontFamily: 'Arial',
      fontSize: '20px',
      fontStyle: 'bold',
      color: '#ffffff'
    }).setOrigin(0.5).setDepth(6001);

    const cards = [];

    // Render vehicles carousel/cards
    VEHICLES.forEach((v, idx) => {
      const x = 160 + idx * 240;
      const y = 330;

      const isUnlocked = this.saveData.unlockedVehicles.includes(v.id);
      const isSelected = this.selectedVehicle.id === v.id;

      const card = this.add.container(x, y).setDepth(6001);
      const bg = this.add.graphics();

      bg.fillStyle(isSelected ? 0x065f46 : (isUnlocked ? 0x1e293b : 0x0f172a), 0.95);
      bg.fillRoundedRect(-105, -160, 210, 320, 12);
      bg.lineStyle(3, isSelected ? 0x34d399 : (isUnlocked ? 0x38bdf8 : 0x475569), 1);
      bg.strokeRoundedRect(-105, -160, 210, 320, 12);

      const name = this.add.text(0, -135, v.name, {
        fontFamily: 'Arial', fontSize: '20px', fontStyle: 'bold', color: '#ffffff'
      }).setOrigin(0.5);

      const sub = this.add.text(0, -110, v.sub, {
        fontFamily: 'Arial', fontSize: '13px', color: '#94a3b8'
      }).setOrigin(0.5);

      const kn = this.add.text(0, -88, v.kannada, {
        fontFamily: 'Arial', fontSize: '15px', color: '#facc15'
      }).setOrigin(0.5);

      const stats = this.add.text(0, -30, `Speed: ${v.speed} km/h\nAgility: ${Math.round(v.handling * 100)}\nSuspension: ${'❤️'.repeat(v.suspension)}`, {
        fontFamily: 'Arial', fontSize: '14px', color: '#e2e8f0', lineSpacing: 6, align: 'center'
      }).setOrigin(0.5);

      // Action Button
      let btnLabel = isSelected ? 'SELECTED' : (isUnlocked ? 'SELECT' : `BUY ₹${v.price}`);
      let btnColor = isSelected ? '#059669' : (isUnlocked ? '#0284c7' : '#d97706');

      const actBtn = this.createMenuButton(0, 100, btnLabel, btnColor, () => {
        if (isUnlocked) {
          Storage.selectVehicle(v.id);
          this.saveData = Storage.load();
          this.selectedVehicle = v;
          this.showGarage();
        } else if (this.saveData.coins >= v.price) {
          Storage.unlockVehicle(v.id, v.price);
          this.saveData = Storage.load();
          this.selectedVehicle = v;
          AudioFX.playMilestone();
          this.showGarage();
        } else {
          AudioFX.playCrash();
        }
      });
      actBtn.setScale(0.85);

      card.add([bg, name, sub, kn, stats, actBtn]);
      cards.push(card);
    });

    // Back Button
    const backBtn = this.createMenuButton(W / 2, H - 75, '⬅ BACK TO MENU', '#475569', () => this.showMenu());

    this.garageUI = [overlay, title, coinCount, ...cards, backBtn];
  }

  createMenuButton(x, y, text, colorHex, onClick) {
    const c = this.add.container(x, y).setDepth(6002);
    const bg = this.add.graphics();
    const parsedColor = Phaser.Display.Color.HexStringToColor(colorHex).color;

    bg.fillStyle(parsedColor, 1);
    bg.fillRoundedRect(-140, -28, 280, 56, 12);
    bg.lineStyle(2, 0xffffff, 0.9);
    bg.strokeRoundedRect(-140, -28, 280, 56, 12);

    const txt = this.add.text(0, 0, text, {
      fontFamily: 'Arial, sans-serif',
      fontSize: '20px',
      fontStyle: 'bold',
      color: '#ffffff'
    }).setOrigin(0.5);

    c.add([bg, txt]);
    c.txt = txt;
    c.setSize(280, 56).setInteractive({ useHandCursor: true });

    c.on('pointerdown', () => {
      c.setScale(0.95);
      onClick(c);
    });
    c.on('pointerup', () => c.setScale(1.0));
    c.on('pointerout', () => c.setScale(1.0));

    return c;
  }

  togglePause() {
    if (this.gameState === 'playing') {
      this.gameState = 'paused';
      this.showPauseMenu();
    } else if (this.gameState === 'paused') {
      this.gameState = 'playing';
      this.removePauseMenu();
    }
  }

  showPauseMenu() {
    const overlay = this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.75).setDepth(8000);
    const title = this.add.text(W / 2, 230, 'PAUSED', {
      fontFamily: 'Arial', fontSize: '56px', fontStyle: 'bold', color: '#ffffff'
    }).setOrigin(0.5).setDepth(8001);

    const resumeBtn = this.createMenuButton(W / 2, 340, '▶ RESUME', '#16a34a', () => this.togglePause());
    const restartBtn = this.createMenuButton(W / 2, 425, '🔄 RESTART', '#0284c7', () => this.startGame());
    const menuBtn = this.createMenuButton(W / 2, 510, '🏠 MAIN MENU', '#475569', () => this.showMenu());

    this.pauseUI = [overlay, title, resumeBtn, restartBtn, menuBtn];
  }

  removePauseMenu() {
    this.pauseUI.forEach(obj => obj.destroy());
    this.pauseUI = [];
  }

  triggerGameOver(reason) {
    this.gameState = 'gameover';
    this.clearAllEntities();

    // Update stats and save
    this.saveData = Storage.updateStats(this.distance, this.potholesDodged, this.wrongWaysDodged, this.currentCoins);

    const overlay = this.add.rectangle(W / 2, H / 2, W, H, 0x050c14, 0.85).setDepth(8000);

    const title = this.add.text(W / 2, 140, 'GAME OVER', {
      fontFamily: 'Arial', fontSize: '64px', fontStyle: 'bold', color: '#ef4444', stroke: '#000000', strokeThickness: 7
    }).setOrigin(0.5).setDepth(8001);

    const reasonTxt = this.add.text(W / 2, 205, reason, {
      fontFamily: 'Arial', fontSize: '20px', fontStyle: 'bold', color: '#facc15'
    }).setOrigin(0.5).setDepth(8001);

    const quip = Phaser.Math.RND.pick(BANGALORE_QUIPS);
    const quipTxt = this.add.text(W / 2, 245, `"${quip}"`, {
      fontFamily: 'Arial', fontSize: '17px', fontStyle: 'italic', color: '#cbd5e1'
    }).setOrigin(0.5).setDepth(8001);

    // Score Board Panel
    const panel = this.add.graphics().setDepth(8001);
    panel.fillStyle(0x0f172a, 0.9);
    panel.fillRoundedRect(W / 2 - 250, 280, 500, 160, 14);
    panel.lineStyle(2, 0x334155, 1);
    panel.strokeRoundedRect(W / 2 - 250, 280, 500, 160, 14);

    const distInfo = this.add.text(W / 2, 310, `DISTANCE COVERED: ${Math.floor(this.distance)} m`, {
      fontFamily: 'Arial', fontSize: '24px', fontStyle: 'bold', color: '#ffffff'
    }).setOrigin(0.5).setDepth(8002);

    const coinsInfo = this.add.text(W / 2, 350, `🪙 COINS EARNED: +₹ ${this.currentCoins}  (TOTAL: ₹ ${this.saveData.coins})`, {
      fontFamily: 'Arial', fontSize: '18px', fontStyle: 'bold', color: '#facc15'
    }).setOrigin(0.5).setDepth(8002);

    const dodgedInfo = this.add.text(W / 2, 385, `🕳️ Potholes: ${this.potholesDodged}  |  ⚠️ Wrong-Ways: ${this.wrongWaysDodged}`, {
      fontFamily: 'Arial', fontSize: '17px', color: '#94a3b8'
    }).setOrigin(0.5).setDepth(8002);

    const bestInfo = this.add.text(W / 2, 415, `🏆 ALL TIME BEST: ${this.saveData.highScore} m`, {
      fontFamily: 'Arial', fontSize: '17px', fontStyle: 'bold', color: '#38bdf8'
    }).setOrigin(0.5).setDepth(8002);

    // Buttons
    const restartBtn = this.createMenuButton(W / 2 - 140, 500, '🔄 PLAY AGAIN', '#16a34a', () => this.startGame());
    const menuBtn = this.createMenuButton(W / 2 + 140, 500, '🏠 MAIN MENU', '#475569', () => this.showMenu());

    this.gameOverUI = [overlay, title, reasonTxt, quipTxt, panel, distInfo, coinsInfo, dodgedInfo, bestInfo, restartBtn, menuBtn];
  }

  clearAllUI() {
    [...this.menuUI, ...this.garageUI, ...this.pauseUI, ...this.gameOverUI].forEach(o => {
      if (o && o.active) o.destroy();
    });
    this.menuUI = [];
    this.garageUI = [];
    this.pauseUI = [];
    this.gameOverUI = [];
    if (this.hudContainer) this.hudContainer.setVisible(false);
    if (this.touchContainer) this.touchContainer.setVisible(false);
  }

  clearAllEntities() {
    this.potholes.forEach(p => p.destroy());
    this.traffic.forEach(v => v.destroy());
    this.coins.forEach(c => c.destroy());
    this.powerups.forEach(p => p.destroy());
    this.signs.forEach(s => s.destroy());

    this.potholes = [];
    this.traffic = [];
    this.coins = [];
    this.powerups = [];
    this.signs = [];
  }

  // ============================================================
  // GAME START / RESET
  // ============================================================

  startGame() {
    this.clearAllUI();
    this.clearAllEntities();

    this.saveData = Storage.load();
    this.selectedVehicle = VEHICLES.find(v => v.id === this.saveData.selectedVehicle) || VEHICLES[0];
    this.playerHealth = this.selectedVehicle.suspension;
    this.maxHealth = this.selectedVehicle.suspension;
    this.speed = this.selectedVehicle.speed;
    this.baseSpeed = this.selectedVehicle.speed;

    this.distance = 0;
    this.currentCoins = 0;
    this.potholesDodged = 0;
    this.wrongWaysDodged = 0;
    this.nearMissCombo = 0;

    this.targetLane = 0;
    this.playerLane = 0;
    this.locationIndex = 0;
    this.locationProgress = 0;
    this.shieldTime = 0;
    this.nitroTime = 0;

    this.potholeTimer = 1100;
    this.trafficTimer = 1500;
    this.coinTimer = 1600;
    this.powerupTimer = 7000;
    this.signTimer = 4000;
    this.metroTrainTimer = 6000;

    this.weather = 'day';
    this.weatherTimer = 22000;
    this.updateSkyColors();
    this.drawRoad();

    this.drawPlayerVehicle();
    this.hudContainer.setVisible(true);
    this.touchContainer.setVisible(true);

    this.gameState = 'playing';
    this.updateHUD();
  }

  // ============================================================
  // MAIN UPDATE LOOP
  // ============================================================

  update(time, delta) {
    const dt = Math.min(delta, 35);

    // Weather cycles
    this.weatherTimer -= dt;
    if (this.weatherTimer <= 0) {
      const nextWeather = { day: 'sunset', sunset: 'rain', rain: 'night', night: 'day' };
      this.weather = nextWeather[this.weather] || 'day';
      this.weatherTimer = 24000;
      this.updateSkyColors();
      this.drawRoad();
    }

    // Metro viaduct train
    this.metroTrainTimer -= dt;
    if (this.metroTrainTimer <= 0) {
      this.triggerMetroTrain();
      this.metroTrainTimer = 14000 + Math.random() * 8000;
    }

    // Road scroll
    this.roadScroll += (dt * (this.speed / 60) * 0.00018) % 1;
    this.drawLaneLines();

    if (this.grass) {
      this.grass.tilePositionY += (dt * (this.speed / 60) * 0.016);
    }

    if (this.gameState !== 'playing') return;

    // Power-up counters
    if (this.shieldTime > 0) this.shieldTime -= dt;
    if (this.nitroTime > 0) {
      this.nitroTime -= dt;
      this.speed = this.baseSpeed * 1.55;
    } else {
      this.speed = Math.min(150, this.baseSpeed + this.distance * 0.045);
    }

    // Distance & Landmark progression
    this.distance += (this.speed / 3.6) * (dt / 1000);
    this.locationProgress += (this.speed / 3.6) * (dt / 1000);

    const curLoc = LOCATIONS[this.locationIndex];
    if (this.locationProgress > (curLoc.distance || 350)) {
      this.locationProgress = 0;
      this.locationIndex = Math.min(this.locationIndex + 1, LOCATIONS.length - 1);
      AudioFX.playMilestone();
      this.spawnHighwaySign();
    }

    // Smooth lane steering
    this.playerLane = Phaser.Math.Linear(this.playerLane, this.targetLane, this.selectedVehicle.handling);
    this.updatePlayerPosition();

    // Spawning timers
    this.potholeTimer -= dt;
    if (this.potholeTimer <= 0) {
      this.spawnPothole();
      this.potholeTimer = Phaser.Math.Linear(1400, 750, Math.min(1, this.distance / 3000));
    }
    this.updatePotholes(dt);

    this.trafficTimer -= dt;
    if (this.trafficTimer <= 0) {
      this.spawnTraffic();
      const mult = curLoc.trafficMultiplier || 1.0;
      this.trafficTimer = Phaser.Math.Linear(1800, 950, Math.min(1, this.distance / 3000)) / mult;
    }
    this.updateTraffic(dt);

    this.coinTimer -= dt;
    if (this.coinTimer <= 0) {
      this.spawnCoinRow();
      this.coinTimer = 2200 + Math.random() * 1200;
    }
    this.updateCoins(dt);

    this.powerupTimer -= dt;
    if (this.powerupTimer <= 0) {
      this.spawnPowerup();
      this.powerupTimer = 8000 + Math.random() * 5000;
    }
    this.updatePowerups(dt);

    this.updateHighwaySigns(dt);

    // Collisions
    this.checkCollisions();
    this.updateHUD();
  }
}

// ============================================================
// PHASER CONFIG & RESPONSIVENESS
// ============================================================

const config = {
  type: Phaser.AUTO,
  width: W,
  height: H,
  parent: 'game',
  backgroundColor: '#07111c',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: W,
    height: H
  },
  render: {
    antialias: true,
    roundPixels: true,
    powerPreference: 'high-performance'
  },
  scene: GameScene
};

new Phaser.Game(config);
