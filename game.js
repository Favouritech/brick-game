const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const COLS = 12;
const ROWS = 20;
const blockSize = 30;
const grid = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
let score = 0;

let shooter = {
  x: Math.floor(COLS / 2) * blockSize + blockSize / 2,
  y: canvas.height - blockSize,
  angle: Math.PI / 2,
  block: createBlock(),
};

let movingBlocks = [];

// Create a block (normal, numbered, or bomb)
function createBlock() {
  const types = ["normal", "number", "bomb"];
  const type = types[Math.floor(Math.random() * types.length)];

  return {
    color: randomColor(),
    type,
    value: type === "number" ? 2 : null,
  };
}

function toGrid(x, y) {
  return {
    col: Math.floor(x / blockSize),
    row: Math.floor(y / blockSize),
  };
}

function drawShooter() {
  drawBlock(shooter.block, shooter.x - blockSize / 2, shooter.y - blockSize / 2);

  ctx.beginPath();
  ctx.moveTo(shooter.x, shooter.y);
  const aimX = shooter.x + 100 * Math.cos(shooter.angle);
  const aimY = shooter.y - 100 * Math.sin(shooter.angle);
  ctx.lineTo(aimX, aimY);
  ctx.strokeStyle = "#333";
  ctx.stroke();
}

function drawBlock(block, x, y) {
  ctx.fillStyle = block.color;
  ctx.fillRect(x, y, blockSize, blockSize);
  ctx.strokeStyle = "#000";
  ctx.strokeRect(x, y, blockSize, blockSize);

  if (block.type === "number") {
    ctx.fillStyle = "#000";
    ctx.font = "bold 16px Arial";
    ctx.fillText(block.value, x + 10, y + 20);
  } else if (block.type === "bomb") {
    ctx.fillStyle = "#000";
    ctx.beginPath();
    ctx.arc(x + 15, y + 15, 6, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawBlocks() {
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const block = grid[row][col];
      if (block) {
        drawBlock(block, col * blockSize, row * blockSize);
      }
    }
  }

  for (const b of movingBlocks) {
    drawBlock(b.block, b.x - blockSize / 2, b.y - blockSize / 2);
  }
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawBlocks();
  drawShooter();

  ctx.fillStyle = "#000";
  ctx.font = "16px Arial";
  ctx.fillText(`Score: ${score}`, 10, 20);

  requestAnimationFrame(draw);
}
draw();

// Touch and mouse aim
function setAngle(x, y) {
  const rect = canvas.getBoundingClientRect();
  const dx = x - rect.left - shooter.x;
  const dy = shooter.y - (y - rect.top);
  shooter.angle = Math.atan2(dy, dx);
}
canvas.addEventListener("mousemove", e => setAngle(e.clientX, e.clientY));
canvas.addEventListener("touchmove", e => {
  if (e.touches[0]) setAngle(e.touches[0].clientX, e.touches[0].clientY);
});

// Shoot
function shoot() {
  const speed = 6;
  const dx = speed * Math.cos(shooter.angle);
  const dy = -speed * Math.sin(shooter.angle);
  movingBlocks.push({
    x: shooter.x,
    y: shooter.y,
    dx,
    dy,
    block: shooter.block,
  });
  shooter.block = createBlock();
}
canvas.addEventListener("click", shoot);
canvas.addEventListener("touchend", shoot);

function update() {
  for (let i = movingBlocks.length - 1; i >= 0; i--) {
    const b = movingBlocks[i];
    b.x += b.dx;
    b.y += b.dy;

    // Bounce walls
    if (b.x < blockSize / 2 || b.x > canvas.width - blockSize / 2) {
      b.dx = -b.dx;
    }

    const { col, row } = toGrid(b.x, b.y);
    if (row <= 0 || (grid[row] && grid[row][col])) {
      const snapRow = Math.max(0, row - 1);
      const cell = grid[snapRow][col];

      if (cell && cell.type === "number" && b.block.type === "number") {
        // Merge numbers
        cell.value += b.block.value;
        score += cell.value;
      } else if (b.block.type === "bomb") {
        explode(snapRow, col);
      } else {
        grid[snapRow][col] = b.block;
        if (b.block.type === "number") score += b.block.value;
        checkMatch(snapRow, col);
      }

      movingBlocks.splice(i, 1);
      checkGameOver();
    }
  }

  setTimeout(update, 20);
}
update();

function explode(r, c) {
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      const rr = r + dr, cc = c + dc;
      if (grid[rr] && grid[rr][cc]) {
        grid[rr][cc] = null;
        score += 5;
      }
    }
  }
}

function checkMatch(startRow, startCol) {
  const visited = new Set();
  const base = grid[startRow][startCol];
  const stack = [[startRow, startCol]];
  const connected = [];

  while (stack.length) {
    const [r, c] = stack.pop();
    const key = `${r},${c}`;
    if (visited.has(key) || !grid[r] || !grid[r][c]) continue;
    const cur = grid[r][c];
    if (cur.color !== base.color || cur.type !== base.type) continue;

    visited.add(key);
    connected.push([r, c]);

    [[1,0], [-1,0], [0,1], [0,-1]].forEach(([dr, dc]) => {
      stack.push([r + dr, c + dc]);
    });
  }

  if (connected.length >= 3) {
    for (let [r, c] of connected) {
      grid[r][c] = null;
      score += 10;
    }
  }
}

function checkGameOver() {
  for (let col = 0; col < COLS; col++) {
    if (grid[ROWS - 1][col]) {
      alert("Game Over! Score: " + score);
      location.reload();
    }
  }
}

function randomColor() {
  const colors = ["#FF6B6B", "#6BCB77", "#4D96FF", "#FFC300"];
  return colors[Math.floor(Math.random() * colors.length)];
}