import './style.css';

const canvas = document.querySelector('#game');
const ctx = canvas.getContext('2d');

const player = {
  lane: 1,
  width: 60,
  height: 100,
  y: 0,
  x: 0
};

let potholes = [];
let gameOver = false;
let score = 0;
let speed = 5;
let spawnTimer = 0;

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  player.y = canvas.height - 140;
  player.x = getLaneX(player.lane);
}

function getRoad() {
  const width = Math.min(canvas.width * 0.7, 600);
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

function drawRoad() {
  const road = getRoad();

  ctx.fillStyle = '#555';
  ctx.fillRect(road.left, 0, road.width, canvas.height);

  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 4;
  ctx.setLineDash([30, 30]);

  for (let i = 1; i < 3; i++) {
    const x = road.left + road.laneWidth * i;

    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
  }

  ctx.setLineDash([]);
}

function drawCar() {
  ctx.fillStyle = '#e53935';

  ctx.fillRect(
    player.x,
    player.y,
    player.width,
    player.height
  );

  ctx.fillStyle = '#222';

  // Windshield
  ctx.fillRect(
    player.x + 10,
    player.y + 15,
    player.width - 20,
    30
  );

  // Wheels
  ctx.fillStyle = '#111';

  ctx.fillRect(player.x - 6, player.y + 15, 8, 25);
  ctx.fillRect(player.x + player.width - 2, player.y + 15, 8, 25);

  ctx.fillRect(player.x - 6, player.y + 65, 8, 25);
  ctx.fillRect(player.x + player.width - 2, player.y + 65, 8, 25);
}

function spawnPothole() {
  const lane = Math.floor(Math.random() * 3);
  const road = getRoad();

  potholes.push({
    lane,
    x: road.left + road.laneWidth * lane + road.laneWidth / 2,
    y: -80,
    width: 70,
    height: 45,
    speed
  });
}

function drawPotholes() {
  ctx.fillStyle = '#111';

  for (const pothole of potholes) {
    ctx.beginPath();

    ctx.ellipse(
      pothole.x,
      pothole.y,
      pothole.width / 2,
      pothole.height / 2,
      0,
      0,
      Math.PI * 2
    );

    ctx.fill();
  }
}

function updatePotholes() {
  for (const pothole of potholes) {
    pothole.y += pothole.speed;
  }

  potholes = potholes.filter(
    pothole => pothole.y < canvas.height + 100
  );
}

function checkCollision() {
  for (const pothole of potholes) {
    if (
      pothole.lane === player.lane &&
      pothole.y + pothole.height / 2 >= player.y &&
      pothole.y - pothole.height / 2 <= player.y + player.height
    ) {
      gameOver = true;
    }
  }
}

function drawUI() {
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 24px Arial';

  ctx.fillText(`Distance: ${Math.floor(score)}m`, 20, 40);

  if (gameOver) {
    ctx.textAlign = 'center';

    ctx.font = 'bold 60px Arial';
    ctx.fillText('GAME OVER', canvas.width / 2, canvas.height / 2);

    ctx.font = '24px Arial';
    ctx.fillText(
      'Press SPACE to restart',
      canvas.width / 2,
      canvas.height / 2 + 50
    );

    ctx.textAlign = 'left';
  }
}

function resetGame() {
  potholes = [];
  gameOver = false;
  score = 0;
  speed = 5;
  spawnTimer = 0;
  player.lane = 1;
  player.x = getLaneX(player.lane);
}

function update() {
  if (gameOver) return;

  score += 0.05;

  // Gradually increase speed
  speed += 0.001;

  spawnTimer--;

  if (spawnTimer <= 0) {
    spawnPothole();

    spawnTimer = Math.max(
      35,
      90 - speed * 5
    );
  }

  updatePotholes();
  checkCollision();
}

function draw() {
  ctx.fillStyle = '#7ec850';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  drawRoad();
  drawPotholes();
  drawCar();
  drawUI();
}

function gameLoop() {
  update();
  draw();

  requestAnimationFrame(gameLoop);
}

window.addEventListener('resize', resize);

window.addEventListener('keydown', event => {
  if (
    event.key === 'ArrowLeft' ||
    event.key.toLowerCase() === 'a'
  ) {
    player.lane = Math.max(0, player.lane - 1);
    player.x = getLaneX(player.lane);
  }

  if (
    event.key === 'ArrowRight' ||
    event.key.toLowerCase() === 'd'
  ) {
    player.lane = Math.min(2, player.lane + 1);
    player.x = getLaneX(player.lane);
  }

  if (event.code === 'Space' && gameOver) {
    resetGame();
  }
});

resize();
gameLoop();