const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const VIRTUAL_WIDTH = 1280;
const VIRTUAL_HEIGHT = 720;

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
const SPEED = 250; // Units per second

// Car
const carSpeed = 8;
const carWidth = 350;
const carHeight = 188;
let carX = VIRTUAL_WIDTH / 2; // Car's position

const carImages = {
  straight: new Image(),
  left: new Image(),
  right: new Image(),
};

carImages.straight.src = "image/car_am.png";
carImages.left.src = "image/car_am_left.png";
carImages.right.src = "image/car_am_right.png";

let currentCarImage = carImages.straight;

let position = 0;

// Project function to project road segments
function project(z) {
  const dz = Math.max(z - position, 0.01);

  if (dz <= 0.01) return null; // avoid dividing by zero or negative distances

  const scale = CAMERA_DEPTH / dz;

  const x = canvas.width / 2;
  const y = canvas.height / 2 + scale * CAMERA_HEIGHT;

  // Clamp minimum scale so road doesn't flicker at bottom
  const clampedScale = Math.max(scale, 0.0005);
  const width = clampedScale * ROAD_WIDTH;

  // Calculate how far the road reaches down the screen
  const roadY = y - 18;

  // Ensure the road doesn't disappear above the horizon, just stretches to the bottom
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

// Draw the car on the road
function drawCar() {
  const y = canvas.height - carHeight - 20;

  if (currentCarImage.complete) {
    ctx.drawImage(currentCarImage, carX - carWidth / 2, y, carWidth, carHeight); // Draw the car
  }
}

const keys = {};

document.addEventListener("keydown", (e) => (keys[e.key] = true));
document.addEventListener("keyup", (e) => (keys[e.key] = false));

// Controls
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

  position += SPEED * dt;
  position %= NUM_SEGMENTS * SEGMENT_LENGTH;

  clampCarPosition();

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawBackground();
  drawRoad();
  drawCar();
  handleInput(dt);

  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);

// original code
