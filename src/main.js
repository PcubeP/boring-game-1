import Phaser from 'phaser';
import './style.css';

const W = 1280;
const H = 720;

const HORIZON = 190;
const PLAYER_Y = 610;

const LANES = [-1, 0, 1];

const LOCATIONS = [
  ['KORAMANGALA', 'ಕೊರಮಂಗಲ'],
  ['INDIRANAGAR', 'ಇಂದಿರಾನಗರ'],
  ['SILK BOARD', 'ಸಿಲ್ಕ್ ಬೋರ್ಡ್'],
  ['M.G. ROAD', 'ಎಂ.ಜಿ. ರಸ್ತೆ'],
  ['KR PURAM', 'ಕೆ.ಆರ್. ಪುರಂ'],
  ['WHITEFIELD', 'ವೈಟ್‌ಫೀಲ್ಡ್'],
  ['HEBBAL', 'ಹೆಬ್ಬಾಳ'],
  ['ELECTRONIC CITY', 'ಎಲೆಕ್ಟ್ರಾನಿಕ್ ಸಿಟಿ']
];

class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');

    this.state = 'start';

    this.distance = 0;
    this.speed = 62;

    this.playerLane = 0;
    this.targetLane = 0;

    this.potholes = [];
    this.traffic = [];
    this.worldObjects = [];

    this.potholeTimer = 1400;
    this.trafficTimer = 1800;

    this.locationIndex = 0;
    this.locationProgress = 0;

    this.roadScroll = 0;

    this.startUI = [];
    this.gameOverUI = [];

    this.touchStartX = null;
  }

  create() {
    this.createTextures();
    this.createSky();
    this.createRoad();
    this.createWorld();
    this.createPlayer();
    this.createHUD();
    this.createControls();

    this.showStart();
  }

  // ============================================================
  // TEXTURES
  // ============================================================

  createTextures() {
    const asphaltCanvas =
      document.createElement('canvas');

    asphaltCanvas.width = 512;
    asphaltCanvas.height = 512;

    const ctx =
      asphaltCanvas.getContext('2d');

    ctx.fillStyle = '#505355';
    ctx.fillRect(0, 0, 512, 512);

    for (let i = 0; i < 18000; i++) {
      const shade =
        45 + Math.random() * 35;

      ctx.fillStyle =
        `rgba(${shade},${shade},${shade},${Math.random() * 0.12})`;

      ctx.fillRect(
        Math.random() * 512,
        Math.random() * 512,
        1 + Math.random() * 2,
        1 + Math.random() * 2
      );
    }

    this.textures.addCanvas(
      'road',
      asphaltCanvas
    );

    const grassCanvas =
      document.createElement('canvas');

    grassCanvas.width = 256;
    grassCanvas.height = 256;

    const grass =
      grassCanvas.getContext('2d');

    grass.fillStyle = '#537b4b';
    grass.fillRect(
      0,
      0,
      256,
      256
    );

    for (let i = 0; i < 7000; i++) {
      grass.fillStyle =
        `rgba(20,60,25,${Math.random() * 0.16})`;

      grass.fillRect(
        Math.random() * 256,
        Math.random() * 256,
        1,
        2
      );
    }

    this.textures.addCanvas(
      'grass',
      grassCanvas
    );
  }

  // ============================================================
  // SKY / CITY
  // ============================================================

  createSky() {
    const sky =
      this.add.graphics();

    sky.fillGradientStyle(
      0x72bfe4,
      0x72bfe4,
      0xd4e7e8,
      0xd4e7e8,
      1
    );

    sky.fillRect(
      0,
      0,
      W,
      H
    );

    sky.setDepth(0);

    // clouds
    const clouds =
      this.add.graphics();

    clouds.fillStyle(
      0xffffff,
      0.5
    );

    [
      [140, 80, 42],
      [185, 65, 52],
      [230, 82, 35],
      [920, 75, 40],
      [965, 60, 52],
      [1010, 78, 34]
    ].forEach(([x, y, r]) => {
      clouds.fillCircle(
        x,
        y,
        r
      );
    });

    clouds.setDepth(1);

    // distant skyline
    const city =
      this.add.graphics();

    const buildings = [
      [0, 145, 95],
      [100, 105, 75],
      [180, 130, 95],
      [280, 92, 65],
      [350, 135, 90],
      [445, 105, 65],
      [815, 120, 85],
      [905, 90, 70],
      [980, 140, 95],
      [1080, 105, 75],
      [1160, 135, 100]
    ];

    buildings.forEach(
      ([x, height, width]) => {
        city.fillStyle(
          Phaser.Math.RND.pick([
            0x8e999a,
            0xa8a9a0,
            0xb6afa5,
            0x929fa2
          ])
        );

        city.fillRect(
          x,
          HORIZON - height,
          width,
          height
        );

        city.fillStyle(
          0x455e69,
          0.45
        );

        for (
          let y = HORIZON - height + 15;
          y < HORIZON - 8;
          y += 22
        ) {
          for (
            let xx = x + 10;
            xx < x + width - 8;
            xx += 20
          ) {
            city.fillRect(
              xx,
              y,
              8,
              10
            );
          }
        }
      }
    );

    city.setDepth(2);

    this.grass =
      this.add.tileSprite(
        W / 2,
        470,
        W,
        500,
        'grass'
      );

    this.grass.setDepth(3);
  }

  // ============================================================
  // ROAD
  // ============================================================

  createRoad() {
    this.road =
      this.add.graphics();

    this.road.setDepth(10);

    this.roadLines =
      this.add.graphics();

    this.roadLines.setDepth(20);

    this.shoulders =
      this.add.graphics();

    this.shoulders.setDepth(9);

    this.drawRoad();
  }

  roadWidth(y) {
    const t =
      Phaser.Math.Clamp(
        (y - HORIZON) /
        (H - HORIZON),
        0,
        1
      );

    return Phaser.Math.Linear(
      300,
      1120,
      t
    );
  }

  roadLeft(y) {
    return (
      W / 2 -
      this.roadWidth(y) / 2
    );
  }

  roadRight(y) {
    return (
      W / 2 +
      this.roadWidth(y) / 2
    );
  }

  laneX(lane, y) {
    const width =
      this.roadWidth(y);

    return (
      W / 2 +
      lane *
      width /
      3
    );
  }

  drawRoad() {
    this.road.clear();

    this.road.fillStyle(
      0x4d5051,
      1
    );

    this.road.beginPath();

    this.road.moveTo(
      this.roadLeft(HORIZON),
      HORIZON
    );

    this.road.lineTo(
      this.roadRight(HORIZON),
      HORIZON
    );

    this.road.lineTo(
      this.roadRight(H),
      H
    );

    this.road.lineTo(
      this.roadLeft(H),
      H
    );

    this.road.closePath();

    this.road.fillPath();

    // shoulders
    this.shoulders.clear();

    this.shoulders.fillStyle(
      0xc0b497,
      1
    );

    this.shoulders.beginPath();

    this.shoulders.moveTo(
      this.roadLeft(HORIZON),
      HORIZON
    );

    this.shoulders.lineTo(
      this.roadLeft(H),
      H
    );

    this.shoulders.lineTo(
      this.roadLeft(H) - 20,
      H
    );

    this.shoulders.lineTo(
      this.roadLeft(HORIZON) - 10,
      HORIZON
    );

    this.shoulders.closePath();

    this.shoulders.fillPath();

    this.shoulders.beginPath();

    this.shoulders.moveTo(
      this.roadRight(HORIZON),
      HORIZON
    );

    this.shoulders.lineTo(
      this.roadRight(H),
      H
    );

    this.shoulders.lineTo(
      this.roadRight(H) + 20,
      H
    );

    this.shoulders.lineTo(
      this.roadRight(HORIZON) + 10,
      HORIZON
    );

    this.shoulders.closePath();

    this.shoulders.fillPath();

    this.drawLaneLines();
  }

  drawLaneLines() {
    this.roadLines.clear();

    // white edge lines
    this.roadLines.lineStyle(
      7,
      0xf4f0dc,
      0.95
    );

    this.roadLines.beginPath();

    this.roadLines.moveTo(
      this.roadLeft(HORIZON),
      HORIZON
    );

    this.roadLines.lineTo(
      this.roadLeft(H),
      H
    );

    this.roadLines.strokePath();

    this.roadLines.beginPath();

    this.roadLines.moveTo(
      this.roadRight(HORIZON),
      HORIZON
    );

    this.roadLines.lineTo(
      this.roadRight(H),
      H
    );

    this.roadLines.strokePath();

    // lane dashes
    for (
      const boundary of [-1, 1]
    ) {
      for (
        let i = 0;
        i < 20;
        i++
      ) {
        let t =
          (i / 20 +
            this.roadScroll) %
          1;

        const t2 =
          Math.min(
            1,
            t + 0.035
          );

        const y1 =
          Phaser.Math.Linear(
            HORIZON,
            H,
            t
          );

        const y2 =
          Phaser.Math.Linear(
            HORIZON,
            H,
            t2
          );

        const x1 =
          this.laneX(
            boundary,
            y1
          );

        const x2 =
          this.laneX(
            boundary,
            y2
          );

        this.roadLines.fillStyle(
          0xf1eee2,
          0.9
        );

        this.roadLines.fillRect(
          x1 - 3,
          y1,
          6,
          Math.max(
            3,
            y2 - y1
          )
        );
      }
    }
  }

  // ============================================================
  // WORLD OBJECTS
  // ============================================================

  createWorld() {
    this.createTrees();
    this.createBuildings();
    this.createMetro();
    this.createSigns();
    this.createShops();
  }

  createTrees() {
    const positions = [
      [-1, 215],
      [1, 220],
      [-1, 270],
      [1, 285],
      [-1, 335],
      [1, 350],
      [-1, 405],
      [1, 420],
      [-1, 480],
      [1, 495]
    ];

    positions.forEach(
      ([side, y]) => {
        const depth =
          (y - HORIZON) /
          400;

        const x =
          W / 2 +
          side *
          Phaser.Math.Linear(
            210,
            620,
            depth
          );

        this.createTree(
          x,
          y,
          Phaser.Math.Linear(
            0.35,
            1.15,
            depth
          )
        );
      }
    );
  }

  createTree(x, y, scale) {
    const g =
      this.add.graphics();

    g.fillStyle(
      0x62462f,
      1
    );

    g.fillRect(
      -8,
      -65,
      16,
      65
    );

    g.fillStyle(
      0x2f6839,
      1
    );

    g.fillCircle(
      -28,
      -70,
      32
    );

    g.fillCircle(
      5,
      -90,
      40
    );

    g.fillCircle(
      35,
      -70,
      31
    );

    g.fillCircle(
      0,
      -55,
      34
    );

    g.fillStyle(
      0x65954e,
      0.6
    );

    g.fillCircle(
      -12,
      -95,
      13
    );

    g.fillCircle(
      23,
      -78,
      12
    );

    g.setPosition(
      x,
      y
    );

    g.setScale(
      scale
    );

    g.setDepth(
      100 + y
    );
  }

  createBuildings() {
    const positions = [
      [-1, 250],
      [1, 265],
      [-1, 315],
      [1, 340],
      [-1, 390],
      [1, 420]
    ];

    positions.forEach(
      ([side, y]) => {
        const depth =
          (y - HORIZON) /
          400;

        const x =
          W / 2 +
          side *
          Phaser.Math.Linear(
            300,
            650,
            depth
          );

        this.createBuilding(
          x,
          y,
          Phaser.Math.Linear(
            0.35,
            1,
            depth
          )
        );
      }
    );
  }

  createBuilding(x, y, scale) {
    const g =
      this.add.graphics();

    const width =
      Phaser.Math.Between(
        70,
        120
      );

    const height =
      Phaser.Math.Between(
        100,
        180
      );

    g.fillStyle(
      Phaser.Math.RND.pick([
        0xc0b5a8,
        0xb1aaa1,
        0x9fa8a8,
        0xc9c0ae
      ])
    );

    g.fillRect(
      -width / 2,
      -height,
      width,
      height
    );

    g.fillStyle(
      0x405864,
      0.65
    );

    for (
      let yy = -height + 15;
      yy < -15;
      yy += 25
    ) {
      for (
        let xx = -width / 2 + 10;
        xx < width / 2 - 8;
        xx += 21
      ) {
        g.fillRect(
          xx,
          yy,
          9,
          12
        );
      }
    }

    g.setPosition(
      x,
      y
    );

    g.setScale(
      scale
    );

    g.setDepth(
      100 + y
    );
  }

  createMetro() {
    const xs = [
      1040,
      1055,
      1070
    ];

    xs.forEach(
      (x, index) => {
        const g =
          this.add.graphics();

        g.fillStyle(
          0x85888a,
          1
        );

        g.fillRect(
          -11,
          -210,
          22,
          210
        );

        g.fillStyle(
          0x666a6c,
          1
        );

        g.fillRect(
          -42,
          -220,
          84,
          17
        );

        g.setPosition(
          x + index * 20,
          390
        );

        g.setDepth(
          500
        );
      }
    );
  }

  createSigns() {
    this.createRoadSign(
      240,
      330,
      'INDIRANAGAR',
      'ಇಂದಿರಾನಗರ'
    );

    this.createRoadSign(
      1030,
      360,
      'SILK BOARD',
      'ಸಿಲ್ಕ್ ಬೋರ್ಡ್'
    );

    this.createOverheadSign();
  }

  createRoadSign(
    x,
    y,
    english,
    kannada
  ) {
    const c =
      this.add.container(
        x,
        y
      );

    const g =
      this.add.graphics();

    g.fillStyle(
      0x08775f,
      1
    );

    g.fillRoundedRect(
      -90,
      -42,
      180,
      84,
      4
    );

    g.lineStyle(
      3,
      0xffffff,
      1
    );

    g.strokeRoundedRect(
      -86,
      -38,
      172,
      76,
      3
    );

    const e =
      this.add.text(
        0,
        -10,
        english,
        {
          fontFamily: 'Arial',
          fontSize: '17px',
          fontStyle: 'bold',
          color: '#ffffff'
        }
      );

    e.setOrigin(0.5);

    const k =
      this.add.text(
        0,
        17,
        kannada,
        {
          fontFamily: 'Arial',
          fontSize: '13px',
          color: '#ffffff'
        }
      );

    k.setOrigin(0.5);

    c.add([
      g,
      e,
      k
    ]);

    c.setScale(
      0.8
    );

    c.setDepth(
      900
    );
  }

  createOverheadSign() {
    const g =
      this.add.graphics();

    g.fillStyle(
      0x515251,
      1
    );

    g.fillRect(
      385,
      90,
      10,
      170
    );

    g.fillRect(
      895,
      90,
      10,
      170
    );

    g.fillStyle(
      0x08755c,
      1
    );

    g.fillRoundedRect(
      395,
      100,
      500,
      125,
      4
    );

    g.lineStyle(
      4,
      0xffffff,
      1
    );

    g.strokeRoundedRect(
      402,
      107,
      486,
      111,
      3
    );

    const labels = [
      ['KORAMANGALA', 'ಕೊರಮಂಗಲ', 470],
      ['M.G. ROAD', 'ಎಂ.ಜಿ. ರಸ್ತೆ', 640],
      ['WHITEFIELD', 'ವೈಟ್‌ಫೀಲ್ಡ್', 785]
    ];

    labels.forEach(
      ([en, kn, x]) => {
        const a =
          this.add.text(
            x,
            130,
            en,
            {
              fontFamily: 'Arial',
              fontSize: '17px',
              fontStyle: 'bold',
              color: '#ffffff'
            }
          );

        a.setOrigin(0.5);

        const b =
          this.add.text(
            x,
            158,
            kn,
            {
              fontFamily: 'Arial',
              fontSize: '13px',
              color: '#ffffff'
            }
          );

        b.setOrigin(0.5);

        this.add.text(
          x,
          190,
          '↑',
          {
            fontFamily: 'Arial',
            fontSize: '27px',
            fontStyle: 'bold',
            color: '#ffffff'
          }
        ).setOrigin(0.5);
      }
    );

    g.setDepth(
      850
    );
  }

  createShops() {
    this.createShop(
      95,
      470,
      'MASALA DOSA',
      'ಮಸಾಲೆ ದೋಸೆ'
    );

    this.createShop(
      1180,
      475,
      'FILTER COFFEE',
      'ಫಿಲ್ಟರ್ ಕಾಫಿ'
    );
  }

  createShop(
    x,
    y,
    title,
    subtitle
  ) {
    const c =
      this.add.container(
        x,
        y
      );

    const body =
      this.add.graphics();

    body.fillStyle(
      0x73503b,
      1
    );

    body.fillRect(
      -65,
      -75,
      130,
      75
    );

    body.fillStyle(
      0xf0bd2b,
      1
    );

    body.fillRect(
      -72,
      -115,
      144,
      40
    );

    body.lineStyle(
      2,
      0x5b3d2d,
      1
    );

    body.strokeRect(
      -72,
      -115,
      144,
      40
    );

    const t =
      this.add.text(
        0,
        -104,
        title,
        {
          fontFamily: 'Arial',
          fontSize: '12px',
          fontStyle: 'bold',
          color: '#3b281d'
        }
      );

    t.setOrigin(0.5);

    const s =
      this.add.text(
        0,
        -88,
        subtitle,
        {
          fontFamily: 'Arial',
          fontSize: '9px',
          color: '#3b281d'
        }
      );

    s.setOrigin(0.5);

    c.add([
      body,
      t,
      s
    ]);

    c.setDepth(
      700
    );
  }

  // ============================================================
  // PLAYER
  // ============================================================

  createPlayer() {
    this.player =
      this.add.graphics();

    this.player.setDepth(
      4000
    );

    this.drawPlayer();

    this.playerPlate =
      this.add.text(
        0,
        0,
        'KA 05',
        {
          fontFamily: 'Arial',
          fontSize: '13px',
          fontStyle: 'bold',
          color: '#222222',
          backgroundColor: '#eee9d8'
        }
      );

    this.playerPlate.setOrigin(
      0.5
    );

    this.playerPlate.setDepth(
      4001
    );

    this.updatePlayerPosition();
  }

  drawPlayer() {
    const g =
      this.player;

    g.clear();

    // shadow
    g.fillStyle(
      0x111111,
      0.45
    );

    g.fillEllipse(
      0,
      55,
      190,
      34
    );

    // wheels
    g.fillStyle(
      0x151515,
      1
    );

    g.fillRoundedRect(
      -82,
      -5,
      23,
      58,
      6
    );

    g.fillRoundedRect(
      59,
      -5,
      23,
      58,
      6
    );

    // body
    g.fillStyle(
      0xc92727,
      1
    );

    g.fillRoundedRect(
      -72,
      -12,
      144,
      80,
      17
    );

    // body highlight
    g.fillStyle(
      0xe13b35,
      1
    );

    g.fillRoundedRect(
      -61,
      -6,
      122,
      22,
      10
    );

    // roof
    g.fillStyle(
      0xd93430,
      1
    );

    g.fillRoundedRect(
      -54,
      -65,
      108,
      73,
      20
    );

    // rear window
    g.fillStyle(
      0x263d4a,
      1
    );

    g.fillRoundedRect(
      -43,
      -54,
      86,
      51,
      12
    );

    // reflection
    g.fillStyle(
      0xb8d2dc,
      0.25
    );

    g.fillRect(
      -33,
      -46,
      66,
      8
    );

    // tail lights
    g.fillStyle(
      0xff594d,
      1
    );

    g.fillRoundedRect(
      -65,
      14,
      25,
      29,
      6
    );

    g.fillRoundedRect(
      40,
      14,
      25,
      29,
      6
    );

    // bumper
    g.fillStyle(
      0xa91f20,
      1
    );

    g.fillRoundedRect(
      -61,
      48,
      122,
      18,
      5
    );

    // plate
    g.fillStyle(
      0xf0ead7,
      1
    );

    g.fillRoundedRect(
      -28,
      48,
      56,
      17,
      3
    );
  }

  updatePlayerPosition() {
    this.player.x =
      this.laneX(
        this.playerLane,
        PLAYER_Y
      );

    this.player.y =
      PLAYER_Y;

    this.playerPlate.x =
      this.player.x;

    this.playerPlate.y =
      PLAYER_Y + 47;
  }

  // ============================================================
  // POTHOLES
  // ============================================================

  spawnPothole() {
    const free =
      LANES.filter(
        lane =>
          !this.potholes.some(
            p =>
              p.lane === lane &&
              p.worldY < 470
          )
      );

    if (
      free.length === 0
    ) {
      return;
    }

    const lane =
      Phaser.Math.RND.pick(
        free
      );

    const p =
      this.add.graphics();

    p.lane = lane;
    p.worldY = HORIZON + 10;

    p.fillStyle(
      0x242424,
      1
    );

    p.fillEllipse(
      0,
      0,
      85,
      42
    );

    p.fillStyle(
      0x655b4d,
      1
    );

    p.fillEllipse(
      -3,
      2,
      67,
      31
    );

    p.fillStyle(
      0x3c5968,
      1
    );

    p.fillEllipse(
      0,
      0,
      45,
      22
    );

    p.fillStyle(
      0xa8c0c8,
      0.35
    );

    p.fillEllipse(
      -10,
      -4,
      17,
      5
    );

    p.setDepth(
      2000
    );

    this.potholes.push(p);
  }

  updatePotholes(delta) {
    const pxPerSecond =
      92 +
      (this.speed - 62) *
      1.2;

    const movement =
      pxPerSecond *
      delta /
      1000;

    for (
      let i = this.potholes.length - 1;
      i >= 0;
      i--
    ) {
      const p =
        this.potholes[i];

      p.worldY +=
        movement;

      p.x =
        this.laneX(
          p.lane,
          p.worldY
        );

      p.y =
        p.worldY;

      const depth =
        Phaser.Math.Clamp(
          (p.worldY - HORIZON) /
          (PLAYER_Y - HORIZON),
          0,
          1
        );

      p.setScale(
        Phaser.Math.Linear(
          0.25,
          1.18,
          depth
        )
      );

      p.setDepth(
        2000 +
        Math.floor(
          p.worldY
        )
      );

      if (
        p.worldY >
        H + 120
      ) {
        p.destroy();

        this.potholes.splice(
          i,
          1
        );
      }
    }
  }

  // ============================================================
  // TRAFFIC
  // ============================================================

  spawnTraffic() {
    const lane =
      Phaser.Math.RND.pick(
        LANES
      );

    /*
      Don't spawn traffic immediately
      behind another vehicle.
    */

    if (
      this.traffic.some(
        v =>
          v.lane === lane &&
          v.worldY < 360
      )
    ) {
      return;
    }

    const type =
      Phaser.Math.RND.pick([
        'auto',
        'auto',
        'bike',
        'car',
        'bus'
      ]);

    const vehicle =
      this.makeVehicle(
        type
      );

    vehicle.lane = lane;
    vehicle.worldY =
      HORIZON + 10;

    vehicle.x =
      this.laneX(
        lane,
        vehicle.worldY
      );

    vehicle.y =
      vehicle.worldY;

    this.traffic.push(
      vehicle
    );
  }

  makeVehicle(type) {
    const g =
      this.add.graphics();

    if (
      type === 'auto'
    ) {
      g.fillStyle(
        0x087346,
        1
      );

      g.fillRoundedRect(
        -25,
        -43,
        50,
        86,
        8
      );

      g.fillStyle(
        0xeebd24,
        1
      );

      g.fillRoundedRect(
        -25,
        -43,
        50,
        28,
        8
      );

      g.fillStyle(
        0x253c43,
        1
      );

      g.fillRect(
        -17,
        -34,
        34,
        17
      );
    }

    if (
      type === 'bike'
    ) {
      g.fillStyle(
        0x151515,
        1
      );

      g.fillCircle(
        0,
        -25,
        10
      );

      g.fillCircle(
        0,
        25,
        10
      );

      g.fillStyle(
        0x354b50,
        1
      );

      g.fillRoundedRect(
        -7,
        -20,
        14,
        40,
        5
      );
    }

    if (
      type === 'car'
    ) {
      g.fillStyle(
        Phaser.Math.RND.pick([
          0xd9d9d4,
          0xbfc7c9,
          0xd0c5b5,
          0x9eaeb2
        ])
      );

      g.fillRoundedRect(
        -30,
        -52,
        60,
        104,
        12
      );

      g.fillStyle(
        0x2c414d,
        1
      );

      g.fillRoundedRect(
        -21,
        -38,
        42,
        31,
        7
      );
    }

    if (
      type === 'bus'
    ) {
      g.fillStyle(
        0x1973b5,
        1
      );

      g.fillRoundedRect(
        -38,
        -70,
        76,
        140,
        10
      );

      g.fillStyle(
        0x263b46,
        1
      );

      g.fillRect(
        -27,
        -55,
        54,
        42
      );

      g.fillStyle(
        0xf0c328,
        1
      );

      g.fillRect(
        -28,
        17,
        56,
        7
      );
    }

    g.setDepth(
      1200
    );

    return g;
  }

  updateTraffic(delta) {
    const pxPerSecond =
      78 +
      (this.speed - 62);

    const movement =
      pxPerSecond *
      delta /
      1000;

    for (
      let i = this.traffic.length - 1;
      i >= 0;
      i--
    ) {
      const v =
        this.traffic[i];

      v.worldY +=
        movement;

      v.x =
        this.laneX(
          v.lane,
          v.worldY
        );

      v.y =
        v.worldY;

      const depth =
        Phaser.Math.Clamp(
          (v.worldY - HORIZON) /
          (H - HORIZON),
          0,
          1
        );

      v.setScale(
        Phaser.Math.Linear(
          0.25,
          1,
          depth
        )
      );

      v.setDepth(
        1200 +
        Math.floor(
          v.worldY
        )
      );

      if (
        v.worldY >
        H + 150
      ) {
        v.destroy();

        this.traffic.splice(
          i,
          1
        );
      }
    }
  }

  // ============================================================
  // HUD
  // ============================================================

  createHUD() {
    const panel =
      this.add.graphics();

    panel.fillStyle(
      0x07171d,
      0.88
    );

    panel.fillRoundedRect(
      22,
      20,
      350,
      175,
      16
    );

    panel.setDepth(
      5000
    );

    this.distanceText =
      this.add.text(
        43,
        38,
        'DISTANCE   0m',
        {
          fontFamily: 'Arial',
          fontSize: '27px',
          fontStyle: 'bold',
          color: '#ffffff'
        }
      );

    this.distanceText.setDepth(
      5001
    );

    this.speedText =
      this.add.text(
        43,
        82,
        'SPEED   62 km/h',
        {
          fontFamily: 'Arial',
          fontSize: '25px',
          fontStyle: 'bold',
          color: '#ffffff'
        }
      );

    this.speedText.setDepth(
      5001
    );

    this.locationText =
      this.add.text(
        43,
        127,
        '● KORAMANGALA',
        {
          fontFamily: 'Arial',
          fontSize: '22px',
          fontStyle: 'bold',
          color: '#ffd028'
        }
      );

    this.locationText.setDepth(
      5001
    );

    this.kannadaText =
      this.add.text(
        67,
        157,
        'ಕೊರಮಂಗಲ',
        {
          fontFamily: 'Arial',
          fontSize: '16px',
          color: '#ffffff'
        }
      );

    this.kannadaText.setDepth(
      5001
    );
  }

  updateHUD() {
    this.distanceText.setText(
      `DISTANCE   ${Math.floor(
        this.distance
      )}m`
    );

    this.speedText.setText(
      `SPEED   ${Math.floor(
        this.speed
      )} km/h`
    );

    const location =
      LOCATIONS[
        this.locationIndex
      ];

    this.locationText.setText(
      `● ${location[0]}`
    );

    this.kannadaText.setText(
      location[1]
    );
  }

  // ============================================================
  // CONTROLS
  // ============================================================

  createControls() {
    this.input.keyboard.on(
      'keydown-A',
      () => this.changeLane(-1)
    );

    this.input.keyboard.on(
      'keydown-D',
      () => this.changeLane(1)
    );

    this.input.keyboard.on(
      'keydown-LEFT',
      () => this.changeLane(-1)
    );

    this.input.keyboard.on(
      'keydown-RIGHT',
      () => this.changeLane(1)
    );

    this.input.keyboard.on(
      'keydown-SPACE',
      () => {
        if (
          this.state === 'start' ||
          this.state === 'gameover'
        ) {
          this.startGame();
        }
      }
    );

    this.input.on(
      'pointerdown',
      pointer => {
        this.touchStartX =
          pointer.x;
      }
    );

    this.input.on(
      'pointerup',
      pointer => {
        if (
          this.touchStartX === null
        ) {
          return;
        }

        const dx =
          pointer.x -
          this.touchStartX;

        if (
          Math.abs(dx) > 45 &&
          this.state === 'playing'
        ) {
          this.changeLane(
            dx > 0 ? 1 : -1
          );
        }

        this.touchStartX = null;
      }
    );
  }

  changeLane(direction) {
    if (
      this.state !== 'playing'
    ) {
      return;
    }

    this.targetLane =
      Phaser.Math.Clamp(
        this.targetLane +
        direction,
        -1,
        1
      );
  }

  // ============================================================
  // START
  // ============================================================

  showStart() {
    const overlay =
      this.add.rectangle(
        W / 2,
        H / 2,
        W,
        H,
        0x06151c,
        0.42
      );

    overlay.setDepth(
      6000
    );

    const title =
      this.add.text(
        W / 2,
        250,
        'POTHOLE RUN',
        {
          fontFamily: 'Arial',
          fontSize: '70px',
          fontStyle: 'bold',
          color: '#ffffff',
          stroke: '#161616',
          strokeThickness: 7
        }
      );

    title.setOrigin(0.5);
    title.setDepth(6001);

    const subtitle =
      this.add.text(
        W / 2,
        330,
        'BENGALURU EDITION',
        {
          fontFamily: 'Arial',
          fontSize: '30px',
          fontStyle: 'bold',
          color: '#ffd028'
        }
      );

    subtitle.setOrigin(0.5);
    subtitle.setDepth(6001);

    const instruction =
      this.add.text(
        W / 2,
        430,
        'A / D or ← → TO CHANGE LANES\n\nSWIPE LEFT / RIGHT ON MOBILE\n\nPRESS SPACE TO START',
        {
          fontFamily: 'Arial',
          fontSize: '21px',
          fontStyle: 'bold',
          color: '#ffffff',
          align: 'center',
          lineSpacing: 9
        }
      );

    instruction.setOrigin(0.5);
    instruction.setDepth(6001);

    this.startUI = [
      overlay,
      title,
      subtitle,
      instruction
    ];
  }

  removeStart() {
    this.startUI.forEach(
      object => {
        if (
          object &&
          object.active
        ) {
          object.destroy();
        }
      }
    );

    this.startUI = [];
  }

  // ============================================================
  // GAME OVER
  // ============================================================

  showGameOver() {
    this.removeGameOver();

    const overlay =
      this.add.rectangle(
        W / 2,
        H / 2,
        W,
        H,
        0x050505,
        0.6
      );

    overlay.setDepth(
      6000
    );

    const title =
      this.add.text(
        W / 2,
        275,
        'GAME OVER',
        {
          fontFamily: 'Arial',
          fontSize: '70px',
          fontStyle: 'bold',
          color: '#ff4035',
          stroke: '#111111',
          strokeThickness: 7
        }
      );

    title.setOrigin(0.5);
    title.setDepth(6001);

    const info =
      this.add.text(
        W / 2,
        390,
        `DISTANCE: ${Math.floor(
          this.distance
        )}m\n\nPRESS SPACE TO RESTART`,
        {
          fontFamily: 'Arial',
          fontSize: '25px',
          fontStyle: 'bold',
          color: '#ffffff',
          align: 'center',
          lineSpacing: 10
        }
      );

    info.setOrigin(0.5);
    info.setDepth(6001);

    this.gameOverUI = [
      overlay,
      title,
      info
    ];
  }

  removeGameOver() {
    this.gameOverUI.forEach(
      object => {
        if (
          object &&
          object.active
        ) {
          object.destroy();
        }
      }
    );

    this.gameOverUI = [];
  }

  // ============================================================
  // START / RESTART
  // ============================================================

  startGame() {
    this.removeStart();
    this.removeGameOver();

    this.potholes.forEach(
      p => p.destroy()
    );

    this.traffic.forEach(
      v => v.destroy()
    );

    this.potholes = [];
    this.traffic = [];

    this.state = 'playing';

    this.distance = 0;
    this.speed = 62;

    this.playerLane = 0;
    this.targetLane = 0;

    this.locationIndex = 0;
    this.locationProgress = 0;

    this.potholeTimer = 1500;
    this.trafficTimer = 1800;

    this.updatePlayerPosition();
    this.updateHUD();
  }

  // ============================================================
  // COLLISION
  // ============================================================

  checkCollision() {
    for (
      const p of this.potholes
    ) {
      if (
        p.lane !==
        Math.round(
          this.playerLane
        )
      ) {
        continue;
      }

      if (
        Math.abs(
          p.worldY -
          PLAYER_Y
        ) < 43
      ) {
        return true;
      }
    }

    return false;
  }

  gameOver() {
    if (
      this.state !== 'playing'
    ) {
      return;
    }

    this.state =
      'gameover';

    this.potholeTimer =
      Infinity;

    this.trafficTimer =
      Infinity;

    this.showGameOver();
  }

  // ============================================================
  // UPDATE
  // ============================================================

  update(time, delta) {
    const dt =
      Math.min(
        delta,
        40
      );

    // road movement
    this.roadScroll +=
      dt * 0.00013;

    this.roadScroll %= 1;

    this.drawLaneLines();

    if (
      this.grass
    ) {
      this.grass.tilePositionY +=
        dt * 0.012;
    }

    if (
      this.state !== 'playing'
    ) {
      return;
    }

    // distance
    this.distance +=
      this.speed /
      3.6 *
      dt /
      1000;

    // speed progression
    this.speed =
      Math.min(
        145,
        62 +
        this.distance *
        0.055
      );

    // location
    this.locationProgress +=
      this.speed /
      3.6 *
      dt /
      1000;

    if (
      this.locationProgress >
      120
    ) {
      this.locationProgress = 0;

      this.locationIndex =
        Math.min(
          this.locationIndex + 1,
          LOCATIONS.length - 1
        );
    }

    // smooth lane change
    this.playerLane =
      Phaser.Math.Linear(
        this.playerLane,
        this.targetLane,
        0.16
      );

    this.updatePlayerPosition();

    // potholes
    this.potholeTimer -=
      dt;

    if (
      this.potholeTimer <= 0
    ) {
      this.spawnPothole();

      const difficulty =
        Phaser.Math.Clamp(
          (this.speed - 62) /
          83,
          0,
          1
        );

      this.potholeTimer =
        Phaser.Math.Linear(
          1650,
          1100,
          difficulty
        );
    }

    this.updatePotholes(
      dt
    );

    // traffic
    this.trafficTimer -=
      dt;

    if (
      this.trafficTimer <= 0
    ) {
      this.spawnTraffic();

      const difficulty =
        Phaser.Math.Clamp(
          (this.speed - 62) /
          83,
          0,
          1
        );

      this.trafficTimer =
        Phaser.Math.Linear(
          2200,
          1450,
          difficulty
        );
    }

    this.updateTraffic(
      dt
    );

    // collision
    if (
      this.checkCollision()
    ) {
      this.gameOver();
      return;
    }

    this.updateHUD();
  }
}

// ============================================================
// PHASER
// ============================================================

const config = {
  type: Phaser.AUTO,

  width: W,
  height: H,

  parent: 'game',

  backgroundColor:
    '#72bfe4',

  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter:
      Phaser.Scale.CENTER_BOTH,

    width: W,
    height: H
  },

  render: {
    antialias: true,
    pixelArt: false,
    roundPixels: true
  },

  scene: GameScene
};

new Phaser.Game(config);