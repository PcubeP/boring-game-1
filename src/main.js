import './style.css';

const canvas = document.querySelector('#game');
const ctx = canvas.getContext('2d');

const player = {
  lane: 1,
  width: 64,
  height: 105,
  x: 0,
  y: 0
};

let potholes = [];
let scenery = [];

let gameState = 'start';
let score = 0;
let speed = 5;
let spawnTimer = 0;
let roadOffset = 0;
let flashTimer = 0;

const keys = {
  left: false,
  right: false
};

// --------------------------------------------------
// Canvas / Road
// --------------------------------------------------

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  player.y = canvas.height - 150;
  player.x = getLaneX(player.lane);

  createScenery();
}

function getRoad() {
  const width = Math.min(canvas.width * 0.72, 680);
  const left = (canvas.width - width) / 2;

  return {
    left,
    width,
    laneWidth: width / 3
  };
}

function getLaneX(lane) {
  const road = getRoad();

  return (
    road.left +
    road.laneWidth * lane +
    road.laneWidth / 2 -
    player.width / 2
  );
}

// --------------------------------------------------
// Start / Reset
// --------------------------------------------------

function startGame() {
  potholes = [];
  score = 0;
  speed = 5;
  spawnTimer = 50;
  roadOffset = 0;
  flashTimer = 0;
  player.lane = 1;
  player.x = getLaneX(player.lane);

  gameState = 'playing';
}

function gameOver() {
  gameState = 'gameover';
  flashTimer = 15;
}

// --------------------------------------------------
// Scenery
// --------------------------------------------------

function createScenery() {
  scenery = [];

  for (let i = 0; i < 18; i++) {
    scenery.push({
      side: Math.random() < 0.5 ? 'left' : 'right',
      y: Math.random() * canvas.height,
      type: Math.floor(Math.random() * 3),
      speed: 0.7 + Math.random() * 0.5
    });
  }
}

function updateScenery() {
  for (const object of scenery) {
    object.y += speed * object.speed;

    if (object.y > canvas.height + 100) {
      object.y = -100;
      object.side = Math.random() < 0.5 ? 'left' : 'right';
      object.type = Math.floor(Math.random() * 3);
    }
  }
}

function drawScenery() {
  const road = getRoad();

  for (const object of scenery) {
    const distanceFromRoad = 50 + Math.sin(object.y * 0.01) * 15;

    const x =
      object.side === 'left'
        ? road.left - distanceFromRoad
        : road.left + road.width + distanceFromRoad;

    if (object.type === 0) {
      drawTree(x, object.y);
    } else if (object.type === 1) {
      drawStreetLight(x, object.y);
    } else {
      drawBuilding(x, object.y);
    }
  }
}

function drawTree(x, y) {
  ctx.fillStyle = '#654321';
  ctx.fillRect(x - 5, y + 20, 10, 35);

  ctx.fillStyle = '#237a35';

  ctx.beginPath();
  ctx.arc(x, y + 5, 25, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.arc(x - 18, y + 15, 18, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.arc(x + 18, y + 15, 18, 0, Math.PI * 2);
  ctx.fill();
}

function drawStreetLight(x, y) {
  ctx.strokeStyle = '#333';
  ctx.lineWidth = 5;

  ctx.beginPath();
  ctx.moveTo(x, y + 60);
  ctx.lineTo(x, y - 10);
  ctx.lineTo(x + (x < canvas.width / 2 ? 25 : -25), y - 10);
  ctx.stroke();

  ctx.fillStyle = '#fff8b0';

  ctx.beginPath();
  ctx.arc(
    x + (x < canvas.width / 2 ? 28 : -28),
    y - 10,
    7,
    0,
    Math.PI * 2
  );

  ctx.fill();
}

function drawBuilding(x, y) {
  const width = 55;
  const height = 90;

  ctx.fillStyle = '#9b8065';
  ctx.fillRect(x - width / 2, y - height, width, height);

  ctx.fillStyle = '#4d6875';

  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 2; col++) {
      ctx.fillRect(
        x - 18 + col * 22,
        y - 72 + row * 23,
        12,
        12
      );
    }
  }
}

// --------------------------------------------------
// Road
// --------------------------------------------------

function drawBackground() {
  ctx.fillStyle = '#86c95a';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function drawRoad() {
  const road = getRoad();

  // Road
  ctx.fillStyle = '#464646';
  ctx.fillRect(
    road.left,
    0,
    road.width,
    canvas.height
  );

  // Road edges
  ctx.fillStyle = '#d6d6d6';

  ctx.fillRect(
    road.left,
    0,
    8,
    canvas.height
  );

  ctx.fillRect(
    road.left + road.width - 8,
    0,
    8,
    canvas.height
  );

  // Lane markings
  ctx.strokeStyle = '#f4f4f4';
  ctx.lineWidth = 5;
  ctx.setLineDash([45, 35]);

  roadOffset += speed;

  ctx.lineDashOffset = roadOffset;

  for (let i = 1; i < 3; i++) {
    const x =
      road.left +
      road.laneWidth * i;

    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
  }

  ctx.setLineDash([]);
  ctx.lineDashOffset = 0;
}

// --------------------------------------------------
// Potholes
// --------------------------------------------------

function spawnPothole() {
  const road = getRoad();
  const lane = Math.floor(Math.random() * 3);

  potholes.push({
    lane,
    x:
      road.left +
      road.laneWidth * lane +
      road.laneWidth / 2,
    y: -70,
    width: 75 + Math.random() * 25,
    height: 40 + Math.random() * 15,
    rotation: Math.random() * 0.2 - 0.1
  });
}

function updatePotholes() {
  for (const pothole of potholes) {
    pothole.y += speed;
  }

  potholes = potholes.filter(
    pothole => pothole.y < canvas.height + 100
  );
}

function drawPotholes() {
  for (const pothole of potholes) {
    ctx.save();

    ctx.translate(
      pothole.x,
      pothole.y
    );

    ctx.rotate(pothole.rotation);

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.35)';

    ctx.beginPath();
    ctx.ellipse(
      0,
      5,
      pothole.width / 2 + 8,
      pothole.height / 2 + 6,
      0,
      0,
      Math.PI * 2
    );

    ctx.fill();

    // Pothole
    ctx.fillStyle = '#171717';

    ctx.beginPath();
    ctx.ellipse(
      0,
      0,
      pothole.width / 2,
      pothole.height / 2,
      0,
      0,
      Math.PI * 2
    );

    ctx.fill();

    // Inner depth
    ctx.fillStyle = '#080808';

    ctx.beginPath();
    ctx.ellipse(
      -4,
      -3,
      pothole.width / 2 - 10,
      pothole.height / 2 - 8,
      0,
      0,
      Math.PI * 2
    );

    ctx.fill();

    // Cracks
    ctx.strokeStyle = '#222';
    ctx.lineWidth = 3;

    for (let i = 0; i < 5; i++) {
      ctx.beginPath();
      ctx.moveTo(
        Math.cos(i) * 25,
        Math.sin(i) * 15
      );
      ctx.lineTo(
        Math.cos(i) * 45,
        Math.sin(i) * 25
      );
      ctx.stroke();
    }

    ctx.restore();
  }
}

// --------------------------------------------------
// Car
// --------------------------------------------------

function drawCar() {
  const x = player.x;
  const y = player.y;

  ctx.save();

  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.35)';

  ctx.beginPath();
  ctx.ellipse(
    x + player.width / 2,
    y + player.height + 5,
    42,
    10,
    0,
    0,
    Math.PI * 2
  );

  ctx.fill();

  // Wheels
  ctx.fillStyle = '#111';

  ctx.fillRect(x - 7, y + 20, 10, 28);
  ctx.fillRect(x + player.width - 3, y + 20, 10, 28);

  ctx.fillRect(x - 7, y + 68, 10, 28);
  ctx.fillRect(x + player.width - 3, y + 68, 10, 28);

  // Body
  ctx.fillStyle = '#d62828';

  ctx.beginPath();

  ctx.roundRect(
    x,
    y,
    player.width,
    player.height,
    12
  );

  ctx.fill();

  // Hood
  ctx.fillStyle = '#ef3b3b';

  ctx.fillRect(
    x + 7,
    y + 58,
    player.width - 14,
    35
  );

  // Roof
  ctx.fillStyle = '#b91f1f';

  ctx.beginPath();

  ctx.roundRect(
    x + 9,
    y + 10,
    player.width - 18,
    45,
    10
  );

  ctx.fill();

  // Windows
  ctx.fillStyle = '#182a35';

  ctx.beginPath();

  ctx.roundRect(
    x + 14,
    y + 15,
    player.width - 28,
    25,
    6
  );

  ctx.fill();

  // Rear windshield
  ctx.fillStyle = '#243b48';

  ctx.fillRect(
    x + 13,
    y + 42,
    player.width - 26,
    10
  );

  // Tail lights
  ctx.fillStyle = '#ff4d4d';

  ctx.fillRect(
    x + 7,
    y + 83,
    12,
    7
  );

  ctx.fillRect(
    x + player.width - 19,
    y + 83,
    12,
    7
  );

  ctx.restore();
}

// --------------------------------------------------
// Collision
// --------------------------------------------------

function checkCollision() {
  for (const pothole of potholes) {
    if (
      pothole.lane === player.lane &&
      pothole.y + pothole.height / 2 >= player.y + 20 &&
      pothole.y - pothole.height / 2 <=
        player.y + player.height
    ) {
      gameOver();
      return;
    }
  }
}

// --------------------------------------------------
// HUD
// --------------------------------------------------

function drawHUD() {
  ctx.fillStyle = 'rgba(0,0,0,0.45)';

  ctx.fillRect(
    15,
    15,
    230,
    75
  );

  ctx.fillStyle = '#fff';
  ctx.font = 'bold 22px Arial';

  ctx.fillText(
    `DISTANCE ${Math.floor(score)}m`,
    30,
    45
  );

  ctx.font = '16px Arial';

  ctx.fillText(
    `SPEED ${Math.floor(speed * 20)} km/h`,
    30,
    72
  );
}

// --------------------------------------------------
// Screens
// --------------------------------------------------

function drawStartScreen() {
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(
    0,
    0,
    canvas.width,
    canvas.height
  );

  ctx.textAlign = 'center';

  ctx.fillStyle = '#fff';

  ctx.font = 'bold 70px Arial';
  ctx.fillText(
    'POTHOLE RUN',
    canvas.width / 2,
    canvas.height / 2 - 80
  );

  ctx.font = '28px Arial';

  ctx.fillText(
    'Bangalore roads. Infinite suffering.',
    canvas.width / 2,
    canvas.height / 2 - 25
  );

  ctx.font = 'bold 24px Arial';

  ctx.fillText(
    'PRESS SPACE TO START',
    canvas.width / 2,
    canvas.height / 2 + 55
  );

  ctx.font = '18px Arial';

  ctx.fillText(
    'A / D or ← / → to change lanes',
    canvas.width / 2,
    canvas.height / 2 + 95
  );

  ctx.textAlign = 'left';
}

function drawGameOverScreen() {
  ctx.fillStyle = 'rgba(0,0,0,0.65)';

  ctx.fillRect(
    0,
    0,
    canvas.width,
    canvas.height
  );

  ctx.textAlign = 'center';

  ctx.fillStyle = '#fff';

  ctx.font = 'bold 65px Arial';

  ctx.fillText(
    'GAME OVER',
    canvas.width / 2,
    canvas.height / 2 - 60
  );

  ctx.font = '28px Arial';

  ctx.fillText(
    `Distance: ${Math.floor(score)}m`,
    canvas.width / 2,
    canvas.height / 2
  );

  ctx.font = 'bold 22px Arial';

  ctx.fillText(
    'PRESS SPACE TO TRY AGAIN',
    canvas.width / 2,
    canvas.height / 2 + 60
  );

  ctx.textAlign = 'left';
}

// --------------------------------------------------
// Game Update
// --------------------------------------------------

function update() {
  if (gameState !== 'playing') {
    return;
  }

  score += 0.05;

  speed += 0.0015;

  roadOffset += speed;

  spawnTimer--;

  if (spawnTimer <= 0) {
    spawnPothole();

    spawnTimer = Math.max(
      38,
      85 - speed * 4
    );
  }

  updatePotholes();
  updateScenery();

  checkCollision();

  if (flashTimer > 0) {
    flashTimer--;
  }
}

// --------------------------------------------------
// Draw
// --------------------------------------------------

function draw() {
  drawBackground();
  drawScenery();
  drawRoad();
  drawPotholes();
  drawCar();

  if (gameState === 'playing') {
    drawHUD();
  }

  if (gameState === 'start') {
    drawStartScreen();
  }

  if (gameState === 'gameover') {
    drawGameOverScreen();
  }

  if (flashTimer > 0) {
    ctx.fillStyle = `rgba(255,255,255,${
      flashTimer / 20
    })`;

    ctx.fillRect(
      0,
      0,
      canvas.width,
      canvas.height
    );
  }
}

// --------------------------------------------------
// Input
// --------------------------------------------------

window.addEventListener(
  'keydown',
  event => {
    if (
      event.key === 'ArrowLeft' ||
      event.key.toLowerCase() === 'a'
    ) {
      if (gameState === 'playing') {
        player.lane = Math.max(
          0,
          player.lane - 1
        );

        player.x = getLaneX(player.lane);
      }
    }

    if (
      event.key === 'ArrowRight' ||
      event.key.toLowerCase() === 'd'
    ) {
      if (gameState === 'playing') {
        player.lane = Math.min(
          2,
          player.lane + 1
        );

        player.x = getLaneX(player.lane);
      }
    }

    if (
      event.code === 'Space' &&
      (gameState === 'start' ||
        gameState === 'gameover')
    ) {
      startGame();
    }
  }
);

// --------------------------------------------------
// Loop
// --------------------------------------------------

function gameLoop() {
  update();
  draw();

  requestAnimationFrame(gameLoop);
}

window.addEventListener(
  'resize',
  resize
);

resize();
gameLoop();