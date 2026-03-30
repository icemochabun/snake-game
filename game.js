const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const overlay = document.getElementById('overlay');
const startBtn = document.getElementById('start-btn');
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');
const levelEl = document.getElementById('level');

const COLS = 24;
const ROWS = 24;
const CELL = canvas.width / COLS; // 20px

const COLORS = {
  bg: '#0d0d1a',
  grid: '#12122a',
  snakeHead: '#4ecca3',
  snakeBody: '#2a9d8f',
  snakeBorder: '#1a6b60',
  food: '#e76f51',
  foodGlow: 'rgba(231, 111, 81, 0.4)',
  bonus: '#e9c46a',
  bonusGlow: 'rgba(233, 196, 106, 0.4)',
};

const DIRS = {
  ArrowUp:    { x: 0, y: -1 },
  ArrowDown:  { x: 0, y:  1 },
  ArrowLeft:  { x: -1, y: 0 },
  ArrowRight: { x:  1, y: 0 },
  w: { x: 0, y: -1 },
  s: { x: 0, y:  1 },
  a: { x: -1, y: 0 },
  d: { x:  1, y: 0 },
};

let snake, dir, nextDir, food, bonusFood, score, best, level, speed, gameLoop, paused, running;

best = parseInt(localStorage.getItem('snakeBest') || '0');
bestEl.textContent = best;

function init() {
  snake = [
    { x: 12, y: 12 },
    { x: 11, y: 12 },
    { x: 10, y: 12 },
  ];
  dir = { x: 1, y: 0 };
  nextDir = { x: 1, y: 0 };
  score = 0;
  level = 1;
  speed = 150;
  paused = false;
  bonusFood = null;
  scoreEl.textContent = 0;
  levelEl.textContent = 1;
  placeFood();
}

function placeFood() {
  food = randomCell(snake);
}

function placeBonusFood() {
  bonusFood = { ...randomCell([...snake, food]), timer: 100 };
}

function randomCell(occupied) {
  let cell;
  do {
    cell = { x: Math.floor(Math.random() * COLS), y: Math.floor(Math.random() * ROWS) };
  } while (occupied.some(o => o.x === cell.x && o.y === cell.y));
  return cell;
}

function update() {
  if (paused) return;

  dir = nextDir;

  const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };

  // Wall collision
  if (head.x < 0 || head.x >= COLS || head.y < 0 || head.y >= ROWS) {
    return endGame();
  }

  // Self collision
  if (snake.some(s => s.x === head.x && s.y === head.y)) {
    return endGame();
  }

  snake.unshift(head);

  let ate = false;

  if (head.x === food.x && head.y === food.y) {
    score += 10 * level;
    ate = true;
    placeFood();

    // Spawn bonus food every 5 regular foods eaten
    if (score % (50 * level) === 0 && !bonusFood) {
      placeBonusFood();
    }

    // Level up every 5 foods
    if (snake.length % 5 === 0) {
      level++;
      speed = Math.max(60, speed - 15);
      levelEl.textContent = level;
      restartLoop();
    }
  }

  if (bonusFood) {
    if (head.x === bonusFood.x && head.y === bonusFood.y) {
      score += 50 * level;
      bonusFood = null;
      ate = true;
    } else {
      bonusFood.timer--;
      if (bonusFood.timer <= 0) bonusFood = null;
    }
  }

  if (!ate) snake.pop();

  if (score > best) {
    best = score;
    localStorage.setItem('snakeBest', best);
    bestEl.textContent = best;
  }

  scoreEl.textContent = score;
  draw();
}

function draw() {
  // Background
  ctx.fillStyle = COLORS.bg;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Grid lines
  ctx.strokeStyle = COLORS.grid;
  ctx.lineWidth = 0.5;
  for (let i = 0; i <= COLS; i++) {
    ctx.beginPath();
    ctx.moveTo(i * CELL, 0);
    ctx.lineTo(i * CELL, canvas.height);
    ctx.stroke();
  }
  for (let i = 0; i <= ROWS; i++) {
    ctx.beginPath();
    ctx.moveTo(0, i * CELL);
    ctx.lineTo(canvas.width, i * CELL);
    ctx.stroke();
  }

  // Food glow
  ctx.save();
  ctx.shadowColor = COLORS.foodGlow;
  ctx.shadowBlur = 12;
  ctx.fillStyle = COLORS.food;
  drawRoundedRect(food.x * CELL + 2, food.y * CELL + 2, CELL - 4, CELL - 4, 4);
  ctx.fill();
  ctx.restore();

  // Bonus food
  if (bonusFood) {
    const pulse = 0.6 + 0.4 * Math.sin(Date.now() / 150);
    ctx.save();
    ctx.shadowColor = COLORS.bonusGlow;
    ctx.shadowBlur = 16 * pulse;
    ctx.fillStyle = COLORS.bonus;
    ctx.globalAlpha = pulse;
    drawRoundedRect(bonusFood.x * CELL + 1, bonusFood.y * CELL + 1, CELL - 2, CELL - 2, 5);
    ctx.fill();
    ctx.restore();
  }

  // Snake body
  for (let i = snake.length - 1; i >= 0; i--) {
    const s = snake[i];
    const isHead = i === 0;
    const t = 1 - i / snake.length;

    ctx.fillStyle = isHead ? COLORS.snakeHead : lerpColor(COLORS.snakeBody, COLORS.snakeBorder, 1 - t);

    if (isHead) {
      ctx.save();
      ctx.shadowColor = 'rgba(78, 204, 163, 0.5)';
      ctx.shadowBlur = 8;
    }

    drawRoundedRect(s.x * CELL + 1, s.y * CELL + 1, CELL - 2, CELL - 2, isHead ? 5 : 3);
    ctx.fill();

    if (isHead) ctx.restore();
  }

  // Eyes on head
  drawEyes(snake[0], dir);
}

function drawEyes(head, dir) {
  const cx = head.x * CELL + CELL / 2;
  const cy = head.y * CELL + CELL / 2;
  const r = CELL * 0.12;
  const offset = CELL * 0.22;

  // Eye positions relative to direction
  let e1, e2;
  if (dir.x === 1)       { e1 = { x: cx + offset * 0.6, y: cy - offset }; e2 = { x: cx + offset * 0.6, y: cy + offset }; }
  else if (dir.x === -1) { e1 = { x: cx - offset * 0.6, y: cy - offset }; e2 = { x: cx - offset * 0.6, y: cy + offset }; }
  else if (dir.y === -1) { e1 = { x: cx - offset, y: cy - offset * 0.6 }; e2 = { x: cx + offset, y: cy - offset * 0.6 }; }
  else                   { e1 = { x: cx - offset, y: cy + offset * 0.6 }; e2 = { x: cx + offset, y: cy + offset * 0.6 }; }

  ctx.fillStyle = '#1a1a2e';
  ctx.beginPath(); ctx.arc(e1.x, e1.y, r, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(e2.x, e2.y, r, 0, Math.PI * 2); ctx.fill();
}

function drawRoundedRect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

function lerpColor(a, b, t) {
  const ah = parseInt(a.slice(1), 16);
  const bh = parseInt(b.slice(1), 16);
  const ar = (ah >> 16) & 0xff, ag = (ah >> 8) & 0xff, ab = ah & 0xff;
  const br = (bh >> 16) & 0xff, bg = (bh >> 8) & 0xff, bb = bh & 0xff;
  const rr = Math.round(ar + (br - ar) * t);
  const rg = Math.round(ag + (bg - ag) * t);
  const rb = Math.round(ab + (bb - ab) * t);
  return `rgb(${rr},${rg},${rb})`;
}

function endGame() {
  running = false;
  clearInterval(gameLoop);
  flashDeath(() => showOverlay('GAME OVER', `Score: ${score}`, 'Play Again'));
}

function flashDeath(cb) {
  let flashes = 0;
  const flash = setInterval(() => {
    ctx.fillStyle = flashes % 2 === 0 ? 'rgba(231,111,81,0.3)' : 'transparent';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    if (++flashes >= 6) { clearInterval(flash); draw(); cb(); }
  }, 80);
}

function showOverlay(title, info, btnText) {
  overlay.innerHTML = `
    <h2>${title}</h2>
    ${info ? `<p class="final-score">${info}</p>` : ''}
    <p>Use arrow keys or WASD to move</p>
    <button id="start-btn">${btnText}</button>
  `;
  overlay.style.display = 'flex';
  document.getElementById('start-btn').addEventListener('click', startGame);
}

function startGame() {
  overlay.style.display = 'none';
  init();
  running = true;
  draw();
  gameLoop = setInterval(update, speed);
}

function restartLoop() {
  clearInterval(gameLoop);
  gameLoop = setInterval(update, speed);
}

document.addEventListener('keydown', e => {
  if ((e.key === 'p' || e.key === 'P') && running) {
    paused = !paused;
    if (paused) {
      ctx.fillStyle = 'rgba(10,10,30,0.6)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#4ecca3';
      ctx.font = 'bold 2rem Courier New';
      ctx.textAlign = 'center';
      ctx.fillText('PAUSED', canvas.width / 2, canvas.height / 2);
    } else {
      draw();
    }
    return;
  }

  if (!running || paused) return;

  const newDir = DIRS[e.key];
  if (!newDir) return;

  // Prevent reversing
  if (newDir.x === -dir.x && newDir.y === -dir.y) return;

  nextDir = newDir;
  e.preventDefault();
});

startBtn.addEventListener('click', startGame);

// Initial draw
draw();
