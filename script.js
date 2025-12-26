// Simple Pong game
// Left paddle: player (mouse + arrow keys)
// Right paddle: simple AI

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const scoreboardPlayer = document.getElementById('playerScore');
const scoreboardComputer = document.getElementById('computerScore');

const WIDTH = canvas.width;
const HEIGHT = canvas.height;

function clamp(v, a, b){ return Math.max(a, Math.min(b, v)); }

// Game objects
const paddleWidth = 12;
const paddleHeight = 100;
const paddleSpeed = 6.5;

const leftPaddle = {
  x: 20,
  y: (HEIGHT - paddleHeight) / 2,
  w: paddleWidth,
  h: paddleHeight,
  color: '#ffffff'
};

const rightPaddle = {
  x: WIDTH - 20 - paddleWidth,
  y: (HEIGHT - paddleHeight) / 2,
  w: paddleWidth,
  h: paddleHeight,
  color: '#ffffff'
};

const ballRadius = 8;
const ball = {
  x: WIDTH / 2,
  y: HEIGHT / 2,
  r: ballRadius,
  speed: 5,
  vx: 0,
  vy: 0,
  color: '#22c55e'
};

let playerScore = 0;
let computerScore = 0;

let keys = { ArrowUp: false, ArrowDown: false };

let lastMouseY = null;
let paused = false;
let lastTime = null;
let serveTimeout = null;

// Initializes ball with random angle toward direction (1 = right, -1 = left)
function resetBall(direction = (Math.random() < 0.5 ? 1 : -1), preserveScores=false){
  ball.x = WIDTH / 2;
  ball.y = HEIGHT / 2;
  ball.speed = 5;
  const maxAngle = Math.PI / 4; // 45 degrees
  const angle = (Math.random() * (maxAngle*2)) - maxAngle; // -max..+max
  ball.vx = direction * ball.speed * Math.cos(angle);
  ball.vy = ball.speed * Math.sin(angle);
}

// Update scoreboard display
function updateScoreboard(){
  scoreboardPlayer.textContent = playerScore;
  scoreboardComputer.textContent = computerScore;
}

// Collision check between ball (circle) and paddle (rect)
function rectCircleCollision(rect, circ){
  // Approximate using bounding check (works well for Pong)
  return (
    circ.x - circ.r <= rect.x + rect.w &&
    circ.x + circ.r >= rect.x &&
    circ.y + circ.r >= rect.y &&
    circ.y - circ.r <= rect.y + rect.h
  );
}

// When ball hits a paddle, bounce with angle depending on where it hit
function handlePaddleCollision(paddle){
  // Center offset from paddle center in range [-1 .. 1]
  const relativeIntersectY = (ball.y - (paddle.y + paddle.h / 2));
  const normalizedRelative = relativeIntersectY / (paddle.h / 2);
  const maxBounceAngle = Math.PI / 3; // up to 60 degrees
  const bounceAngle = normalizedRelative * maxBounceAngle;

  // Increase speed slightly on paddle hit
  ball.speed = Math.min(12, ball.speed * 1.05);

  const direction = (paddle === leftPaddle) ? 1 : -1;
  ball.vx = direction * ball.speed * Math.cos(bounceAngle);
  ball.vy = ball.speed * Math.sin(bounceAngle);

  // Move ball out of the paddle so it doesn't get stuck
  if (paddle === leftPaddle){
    ball.x = paddle.x + paddle.w + ball.r + 0.1;
  } else {
    ball.x = paddle.x - ball.r - 0.1;
  }
}

// Game loop
function update(delta){
  if (paused) return;

  // Player input (keyboard)
  if (keys.ArrowUp) leftPaddle.y -= paddleSpeed * delta;
  if (keys.ArrowDown) leftPaddle.y += paddleSpeed * delta;

  // Mouse input: if mouse moved recently, snap paddle to mouse Y
  if (lastMouseY !== null) {
    // Smooth the motion a bit: we can directly set to follow mouse.
    leftPaddle.y = lastMouseY - leftPaddle.h / 2;
  }

  // Clamp paddles
  leftPaddle.y = clamp(leftPaddle.y, 0, HEIGHT - leftPaddle.h);

  // Simple AI for right paddle: follow ball but with max speed
  const aiSpeed = 4.5 * delta; // reduced speed to keep it beatable
  const targetY = ball.y - rightPaddle.h / 2;
  if (rightPaddle.y + rightPaddle.h/2 < ball.y - 3) {
    rightPaddle.y += aiSpeed;
  } else if (rightPaddle.y + rightPaddle.h/2 > ball.y + 3) {
    rightPaddle.y -= aiSpeed;
  }
  rightPaddle.y = clamp(rightPaddle.y, 0, HEIGHT - rightPaddle.h);

  // Move ball
  ball.x += ball.vx * delta;
  ball.y += ball.vy * delta;

  // Top / bottom collision
  if (ball.y - ball.r <= 0) {
    ball.y = ball.r;
    ball.vy = -ball.vy;
  } else if (ball.y + ball.r >= HEIGHT) {
    ball.y = HEIGHT - ball.r;
    ball.vy = -ball.vy;
  }

  // Paddle collisions
  if (rectCircleCollision(leftPaddle, ball) && ball.vx < 0){
    handlePaddleCollision(leftPaddle);
  }
  if (rectCircleCollision(rightPaddle, ball) && ball.vx > 0){
    handlePaddleCollision(rightPaddle);
  }

  // Score conditions
  if (ball.x + ball.r < 0) {
    // Computer scored
    computerScore++;
    updateScoreboard();
    scheduleServe(1); // serve toward player (1 => right)
  } else if (ball.x - ball.r > WIDTH) {
    // Player scored
    playerScore++;
    updateScoreboard();
    scheduleServe(-1); // serve toward computer (left)
  }
}

function drawNet(){
  ctx.fillStyle = 'rgba(255,255,255,0.06)';
  const dash = 14;
  const gap = 10;
  const centerX = WIDTH / 2 - 1;
  for (let y = 0; y < HEIGHT; y += dash + gap) {
    ctx.fillRect(centerX, y, 2, dash);
  }
}

function draw(){
  // background
  ctx.clearRect(0,0,WIDTH,HEIGHT);

  // center net
  drawNet();

  // paddles
  ctx.fillStyle = leftPaddle.color;
  roundRect(ctx, leftPaddle.x, leftPaddle.y, leftPaddle.w, leftPaddle.h, 4, true, false);
  ctx.fillStyle = rightPaddle.color;
  roundRect(ctx, rightPaddle.x, rightPaddle.y, rightPaddle.w, rightPaddle.h, 4, true, false);

  // ball
  ctx.beginPath();
  ctx.fillStyle = ball.color;
  ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
  ctx.fill();

  // Debug / optional: nothing else; scoreboard is DOM-based
}

// Utility to draw rounded rect
function roundRect(ctx, x, y, w, h, r, fill, stroke) {
  if (r === undefined) r = 5;
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
  if (fill) ctx.fill();
  if (stroke) ctx.stroke();
}

// Game loop wrapper with requestAnimationFrame to use consistent delta
function gameLoop(ts){
  if (!lastTime) lastTime = ts;
  const deltaRaw = (ts - lastTime) / (1000 / 60); // normalize to 60fps units
  lastTime = ts;
  update(deltaRaw);
  draw();
  requestAnimationFrame(gameLoop);
}

function scheduleServe(direction){
  // Pause briefly then serve
  paused = true;
  clearTimeout(serveTimeout);
  serveTimeout = setTimeout(() => {
    resetBall(direction);
    paused = false;
  }, 900);
}

// Input handlers
canvas.addEventListener('mousemove', (e) => {
  const rect = canvas.getBoundingClientRect();
  const y = (e.clientY - rect.top) * (canvas.height / rect.height);
  lastMouseY = y;
});

canvas.addEventListener('mouseleave', () => {
  lastMouseY = null; // stop mouse control
});

window.addEventListener('keydown', (e) => {
  if (e.key === ' '){ // Space toggles pause
    paused = !paused;
    if (!paused) {
      // resume loop timestamps
      lastTime = null;
    }
    e.preventDefault();
    return;
  }
  if (e.key === 'r' || e.key === 'R'){
    // Reset scores and restart
    playerScore = 0;
    computerScore = 0;
    updateScoreboard();
    resetBall();
    paused = false;
    lastTime = null;
    return;
  }

  if (e.key in keys) {
    keys[e.key] = true;
  }
});

window.addEventListener('keyup', (e) => {
  if (e.key in keys) keys[e.key] = false;
});

// Start game
function start(){
  updateScoreboard();
  resetBall((Math.random() < 0.5) ? 1 : -1);
  requestAnimationFrame(gameLoop);
}

start();

/* End of script.js */
