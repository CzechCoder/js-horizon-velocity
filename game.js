const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const VIRTUAL_WIDTH = 1280;
const VIRTUAL_HEIGHT = 720;

// Make sure the canvas remains 16:9 on all screens
function resizeCanvas() {
  const aspect = 16 / 9;
  let width = window.innerWidth;
  let height = window.innerHeight;

  if (width / height > aspect) {
    width = height * aspect;
  } else {
    height = width / aspect;
  }

  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;

  canvas.width = VIRTUAL_WIDTH;
  canvas.height = VIRTUAL_HEIGHT;
}
window.addEventListener("resize", resizeCanvas);
resizeCanvas();

// Rendering
const SEGMENT_LENGTH = 35; // Vertical length of each road segment
const NUM_SEGMENTS = Math.ceil(canvas.height / SEGMENT_LENGTH) + 10; // How many segments are rendered in each cycle
const ROAD_WIDTH = 4000;
const CAMERA_DEPTH = 40;
const CAMERA_HEIGHT = 800;
const SPEED = 800; // Units per second

// Game variables
let position = 0;
let elapsedTime = 0; // Seconds
let score = 0;
let paused = false;

// Car
const carSpeed = 10;
const carWidth = 350;
const carHeight = 188;
let carX = VIRTUAL_WIDTH / 2;

// Bitmap graphics
const carImages = {
  straight: new Image(),
  left: new Image(),
  right: new Image(),
};

carImages.straight.src = "image/car_am.png";
carImages.left.src = "image/car_am_left.png";
carImages.right.src = "image/car_am_right.png";

let currentCarImage = carImages.straight;

const logoImage = new Image();
logoImage.src = "image/shvt_logo.png";

const treeImage = new Image();
treeImage.src = "image/tree.png";

const trees = [];

for (let i = 0; i < 100; i++) {
  trees.push({
    z: i * 200,
    x: i % 2 === 0 ? -3000 : 3000,
  });
}

const trafficCarImage = new Image();
trafficCarImage.src = "image/traffic_car_am.png";

const trafficCars = [];

for (let i = 0; i < 10; i++) {
  trafficCars.push({
    z: i * 800 + 1000,
    lane: Math.floor(Math.random() * 3),
  });
}

// Project function to project road segments
function project(z) {
  const dz = Math.max(z - position, 0.01);

  if (dz <= 0.01) return null;

  const scale = CAMERA_DEPTH / dz;

  // Camera's horizontal and vertical position
  const x = canvas.width / 2;
  const y = canvas.height / 2 + scale * CAMERA_HEIGHT;

  const clampedScale = Math.max(scale, 0.0005);
  const width = clampedScale * ROAD_WIDTH;

  const roadY = y - 18;

  return { x, y: roadY, width };
}

// Draw each segment of the road
function drawSegment(p1, p2, color, index) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(p1.x - p1.width / 2, p1.y);
  ctx.lineTo(p1.x + p1.width / 2, p1.y);
  ctx.lineTo(p2.x + p2.width / 2, p2.y);
  ctx.lineTo(p2.x - p2.width / 2, p2.y);
  ctx.closePath();
  ctx.fill();

  const rumbleWidth1 = p1.width * 0.1;
  const laneWidth1 = (p1.width - 2 * rumbleWidth1) / 3;

  const rumbleWidth2 = p2.width * 0.1;
  const laneWidth2 = (p2.width - 2 * rumbleWidth2) / 3;

  // Left rumble strip
  ctx.fillStyle = index % 2 === 0 ? "#ff0000" : "#ffffff";
  ctx.beginPath();
  ctx.moveTo(p1.x - p1.width / 2, p1.y);
  ctx.lineTo(p1.x - p1.width / 2 + rumbleWidth1, p1.y);
  ctx.lineTo(p2.x - p2.width / 2 + rumbleWidth2, p2.y);
  ctx.lineTo(p2.x - p2.width / 2, p2.y);
  ctx.closePath();
  ctx.fill();

  // Right rumble strip
  ctx.beginPath();
  ctx.moveTo(p1.x + p1.width / 2 - rumbleWidth1, p1.y);
  ctx.lineTo(p1.x + p1.width / 2, p1.y);
  ctx.lineTo(p2.x + p2.width / 2, p2.y);
  ctx.lineTo(p2.x + p2.width / 2 - rumbleWidth2, p2.y);
  ctx.closePath();
  ctx.fill();

  // Lane markers (dashed white lines)
  ctx.fillStyle = "#ffffff";

  const dashWidth1 = Math.max(4, p1.width * 0.01);
  const dashWidth2 = Math.max(4, p2.width * 0.01);

  const dashEveryN = 3;
  if (index % dashEveryN === 0) {
    for (let i = 1; i < 3; i++) {
      const x1a =
        p1.x - p1.width / 2 + rumbleWidth1 + laneWidth1 * i - dashWidth1 / 2;
      const x1b =
        p1.x - p1.width / 2 + rumbleWidth1 + laneWidth1 * i + dashWidth1 / 2;
      const x2a =
        p2.x - p2.width / 2 + rumbleWidth2 + laneWidth2 * i - dashWidth2 / 2;
      const x2b =
        p2.x - p2.width / 2 + rumbleWidth2 + laneWidth2 * i + dashWidth2 / 2;

      ctx.beginPath();
      ctx.moveTo(x1a, p1.y);
      ctx.lineTo(x1b, p1.y);
      ctx.lineTo(x2b, p2.y);
      ctx.lineTo(x2a, p2.y);
      ctx.closePath();
      ctx.fill();
    }
  }

  ctx.setLineDash([]); // Reset dash
}

// Draw the background (sky and grass)
function drawBackground() {
  ctx.fillStyle = "#87CEEB";
  ctx.fillRect(0, 0, canvas.width, canvas.height / 2);

  ctx.fillStyle = "#228B22";
  ctx.fillRect(0, canvas.height / 2, canvas.width, canvas.height / 2);
}

function getSegmentColor(index) {
  return index % 2 === 0 ? "#707070" : "#606060";
}

// Draw the road based on the current position
function drawRoad() {
  const baseZ = Math.floor(position / SEGMENT_LENGTH) * SEGMENT_LENGTH;

  for (let n = NUM_SEGMENTS + 20; n > 0; n--) {
    const z1 = baseZ + n * SEGMENT_LENGTH;
    const z2 = baseZ + (n + 1) * SEGMENT_LENGTH;

    const p1 = project(z1);
    const p2 = project(z2);

    if (p1 && p2) {
      const segmentIndex = Math.floor(
        (position + n * SEGMENT_LENGTH) / SEGMENT_LENGTH
      );
      drawSegment(p1, p2, getSegmentColor(segmentIndex), segmentIndex);
    }
  }
}

// Draw trees
function drawTrees() {
  const sortedTrees = [...trees].sort((a, b) => {
    const dzA = a.z - position;
    const dzB = b.z - position;

    if (dzA <= 0 || dzB <= 0) return 0;

    const scaleA = CAMERA_DEPTH / dzA;
    const scaleB = CAMERA_DEPTH / dzB;

    const screenYA = canvas.height / 2 + scaleA * CAMERA_HEIGHT;
    const screenYB = canvas.height / 2 + scaleB * CAMERA_HEIGHT;

    return screenYA - screenYB;
  });

  // Draw trees after sorting
  for (const tree of sortedTrees) {
    const dz = tree.z - position;
    if (dz < 0) continue;

    const scale = CAMERA_DEPTH / dz;
    const screenX = canvas.width / 2 + scale * tree.x * 1.5;
    const screenY = canvas.height / 2 + scale * CAMERA_HEIGHT;

    const treeHeight = scale * 3000;
    const treeWidth = treeHeight * (treeImage.width / treeImage.height);

    ctx.drawImage(
      treeImage,
      screenX - treeWidth / 2,
      screenY - treeHeight,
      treeWidth,
      treeHeight
    );
  }
}

function getLaneWorldX(laneIndex) {
  const totalLanes = 3;
  const rumbleFraction = 0.1;
  const pavedWidth = ROAD_WIDTH * (1 - rumbleFraction * 2);
  const laneWidth = pavedWidth / totalLanes;

  const startX = -ROAD_WIDTH / 2 + ROAD_WIDTH * rumbleFraction;

  return startX + laneWidth * (laneIndex + 0.5);
}

function drawTrafficCars() {
  const sortedTraffic = [...trafficCars].sort((a, b) => b.z - a.z);

  for (let car of sortedTraffic) {
    const projected = project(car.z);
    if (!projected) continue;

    const worldX = getLaneWorldX(car.lane);
    const scale = CAMERA_DEPTH / (car.z - position);
    const screenX = canvas.width / 2 + scale * worldX;

    const carHeight = scale * 450;
    const carWidth =
      carHeight * (trafficCarImage.width / trafficCarImage.height);

    const screenY = projected.y;

    // Only render the car if it's on or below the horizon
    if (screenY >= canvas.height / 2) {
      ctx.drawImage(
        trafficCarImage,
        screenX - carWidth / 2,
        screenY - carHeight,
        carWidth,
        carHeight
      );
    }
  }
}

// Draw the car on the road
function drawCar() {
  const y = canvas.height - carHeight - 20;

  if (currentCarImage.complete) {
    ctx.drawImage(currentCarImage, carX - carWidth / 2, y, carWidth, carHeight); // Draw the car
  }
}

// Draw the pause menu
function drawPauseMenu() {
  ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#ffffff";
  ctx.font = "48px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("Paused", canvas.width / 2, canvas.height / 2 - 20);
  ctx.font = "24px sans-serif";
  ctx.fillText(
    "Press 'P' or 'Escape' to resume",
    canvas.width / 2,
    canvas.height / 2 + 30
  );
}

function drawHUD() {
  ctx.font = "28px sans-serif";
  ctx.textAlign = "left";

  ctx.fillStyle = "black";
  ctx.fillText("Time:", 40, 50);
  ctx.fillStyle = "white";
  ctx.fillText(formatTime(elapsedTime), 120, 50);

  ctx.fillStyle = "black";
  ctx.fillText("Score:", 220, 50);
  ctx.fillStyle = "white";
  ctx.fillText(score.toString(), 310, 50);

  ctx.fillStyle = "#bcbcbc";
  ctx.font = "15px arial";
  ctx.fillText("Made by Tomas Burian, 2025", 40, canvas.height - 20);

  const logoHeight = 80;
  const logoWidth = logoHeight * (logoImage.width / logoImage.height);
  ctx.drawImage(
    logoImage,
    canvas.width / 2 - logoWidth / 2,
    10,
    logoWidth,
    logoHeight
  );
}

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
}

const keys = {};

document.addEventListener("keydown", (e) => {
  keys[e.key] = true;
  if (e.key === "Escape" || e.key === "p") {
    paused = !paused;
  }
});
document.addEventListener("keyup", (e) => (keys[e.key] = false));

function handleInput(dt) {
  const turningLeft = keys["ArrowLeft"] || keys["a"];
  const turningRight = keys["ArrowRight"] || keys["d"];

  if (turningLeft) {
    carX -= carSpeed * dt * 60;
    currentCarImage = carImages.left;
  } else if (turningRight) {
    carX += carSpeed * dt * 60;
    currentCarImage = carImages.right;
  } else {
    currentCarImage = carImages.straight;
  }
}

// Limit the car's boundaries
function clampCarPosition() {
  const minX = carWidth / 2;
  const maxX = VIRTUAL_WIDTH - carWidth / 2;

  carX = Math.max(minX, Math.min(carX, maxX));
}

let lastTime = null;

// Main animation loop
function frame(time) {
  if (!lastTime) lastTime = time;
  const dt = (time - lastTime) / 1000;
  lastTime = time;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  drawBackground();
  drawTrees();
  drawRoad();
  drawTrafficCars();
  drawCar();
  drawHUD();

  if (paused) {
    drawPauseMenu();
    requestAnimationFrame(frame);
    return;
  }

  elapsedTime += dt;
  score += Math.floor(SPEED * dt * 0.1);
  position += SPEED * dt;

  for (let tree of trees) {
    if (tree.z < position) {
      tree.z += 20000;
    }
  }

  for (let car of trafficCars) {
    if (car.z < position) {
      car.z += 10000 + Math.random() * 5000;
      car.lane = Math.floor(Math.random() * 3);
    }
  }

  handleInput(dt);
  clampCarPosition();

  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
