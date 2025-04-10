const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener("resize", resizeCanvas);
resizeCanvas();

const ROAD_WIDTH = 4000;
const SEGMENT_LENGTH = 35; // Vertical length of each road segment
const CAMERA_DEPTH = 40;
const CAMERA_HEIGHT = 800;
const NUM_SEGMENTS = 300; // How many segments are rendered in each cycle
const SPEED = 200; // Units per second

let position = 0;
let carX = canvas.width / 2;
const carSpeed = 5;

const road = Array.from({ length: NUM_SEGMENTS }, (_, i) => ({
  index: i,
  z: i * SEGMENT_LENGTH,
  color: i % 2 === 0 ? "#707070" : "#606060",
}));

const carImage = new Image();
carImage.src = "image/car_am.png";

// Project function to project road segments
function project(z) {
  const dz = z - position;

  if (dz <= 0.01) return null; // avoid dividing by zero or negative distances

  const scale = CAMERA_DEPTH / dz;

  const x = canvas.width / 2;
  const y = canvas.height / 2 + scale * CAMERA_HEIGHT;

  // Clamp minimum scale so road doesn't flicker at bottom
  const clampedScale = Math.max(scale, 0.0005);
  const width = clampedScale * ROAD_WIDTH;

  // Calculate how far the road reaches down the screen
  const roadY = y - 8;

  // Ensure the road doesn't disappear above the horizon, just stretches to the bottom
  return { x, y: roadY, width };
}

// Draw each segment of the road
function drawSegment(p1, p2, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(p1.x - p1.width / 2, p1.y);
  ctx.lineTo(p1.x + p1.width / 2, p1.y);
  ctx.lineTo(p2.x + p2.width / 2, p2.y);
  ctx.lineTo(p2.x - p2.width / 2, p2.y);
  ctx.closePath();
  ctx.fill();
}

// Draw the background (sky and grass)
function drawBackground() {
  ctx.fillStyle = "#87CEEB";
  ctx.fillRect(0, 0, canvas.width, canvas.height / 2);

  ctx.fillStyle = "#228B22";
  ctx.fillRect(0, canvas.height / 2, canvas.width, canvas.height / 2);
}

// Draw the road based on the current position
function drawRoad() {
  const baseIndex = Math.floor(position / SEGMENT_LENGTH);

  for (let n = NUM_SEGMENTS + 70; n > 0; n--) {
    const curr = road[(baseIndex + n) % NUM_SEGMENTS];
    const next = road[(baseIndex + n + 1) % NUM_SEGMENTS];

    const p1 = project(curr.z);
    const p2 = project(next.z);

    if (p1 && p2) {
      drawSegment(p1, p2, curr.color);
    }
  }
}

// Draw the car on the road
function drawCar() {
  const carWidth = 350;
  const carHeight = 188;
  const y = canvas.height - carHeight - 20;

  if (carImage.complete) {
    ctx.drawImage(carImage, carX - carWidth / 2, y, carWidth, carHeight); // Draw the car
  }
}

function handleInput() {
  document.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft" || e.key === "a") {
      carX -= carSpeed;
    } else if (e.key === "ArrowRight" || e.key === "d") {
      carX += carSpeed;
    }
  });

  if (carX < 0) carX = 0;
  if (carX > canvas.width) carX = canvas.width;
}

let lastTime = null;

// Main animation loop
function frame(time) {
  if (!lastTime) lastTime = time;
  const dt = (time - lastTime) / 1000;
  lastTime = time;

  position += SPEED * dt;
  position %= NUM_SEGMENTS * SEGMENT_LENGTH;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawBackground();
  drawRoad();
  drawCar();

  requestAnimationFrame(frame);
}

handleInput();
requestAnimationFrame(frame);
