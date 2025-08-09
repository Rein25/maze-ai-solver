// Lightweight 2D flow simulator for grid mazes (water/electric)
// Water: gravity-driven spread; Electricity: wave propagation along paths.

export class FlowSimulator {
  constructor(width, height, maze, type = "water") {
    this.width = width;
    this.height = height;
    this.type = type; // 'water' | 'electric'
    this.maze = maze; // 0 path, 1 wall
    // grid state: 0 empty, 1 occupied
    this.occ = Array.from({ length: height }, () => new Uint8Array(width));
    // direction field per cell: [-1,0,1] components
    this.dirX = Array.from({ length: height }, () => new Int8Array(width));
    this.dirY = Array.from({ length: height }, () => new Int8Array(width));
    // moving flag
    this.moving = Array.from({ length: height }, () => new Uint8Array(width));
  }

  reset(maze) {
    this.maze = maze || this.maze;
    for (let i = 0; i < this.height; i++) {
      this.occ[i].fill(0);
      this.dirX[i].fill(0);
      this.dirY[i].fill(0);
      this.moving[i].fill(0);
    }
  }

  // Add flow across all open top cells
  pourFromTop() {
    for (let y = 0; y < this.width; y++) {
      if (this.isOpen(0, y)) {
        this.occ[0][y] = 1;
        this.dirX[0][y] = 1; // downwards
        this.dirY[0][y] = 0;
        this.moving[0][y] = 1;
      }
    }
  }

  isOpen(x, y) {
    return (
      x >= 0 &&
      x < this.height &&
      y >= 0 &&
      y < this.width &&
      this.maze[x][y] === 0
    );
  }

  step() {
    const nextOcc = Array.from(
      { length: this.height },
      () => new Uint8Array(this.width)
    );
    const nextDX = Array.from(
      { length: this.height },
      () => new Int8Array(this.width)
    );
    const nextDY = Array.from(
      { length: this.height },
      () => new Int8Array(this.width)
    );
    const nextMoving = Array.from(
      { length: this.height },
      () => new Uint8Array(this.width)
    );

    if (this.type === "water") {
      // Gravity-first spread: down, then left/right, then up (slight seep)
      for (let x = 0; x < this.height; x++) {
        for (let y = 0; y < this.width; y++) {
          if (!this.occ[x][y]) continue;
          // try down
          if (this.isOpen(x + 1, y)) {
            nextOcc[x + 1][y] = 1;
            nextDX[x + 1][y] = 1;
            nextDY[x + 1][y] = 0;
            nextMoving[x + 1][y] = 1;
          } else {
            // sideways spread
            const leftOpen =
              this.isOpen(x, y - 1) && !this.isOpen(x + 1, y - 1);
            const rightOpen =
              this.isOpen(x, y + 1) && !this.isOpen(x + 1, y + 1);
            if (leftOpen) {
              nextOcc[x][y - 1] = 1;
              nextDX[x][y - 1] = 0;
              nextDY[x][y - 1] = -1;
              nextMoving[x][y - 1] = 1;
            }
            if (rightOpen) {
              nextOcc[x][y + 1] = 1;
              nextDX[x][y + 1] = 0;
              nextDY[x][y + 1] = 1;
              nextMoving[x][y + 1] = 1;
            }
            // remain in place (pooling)
            nextOcc[x][y] = 1;
            if (!leftOpen && !rightOpen) {
              nextDX[x][y] = 0;
              nextDY[x][y] = 0;
              nextMoving[x][y] = 0;
            }
          }
        }
      }
    } else {
      // Electricity: wave propagation in all 4 directions along open paths
      for (let x = 0; x < this.height; x++) {
        for (let y = 0; y < this.width; y++) {
          if (!this.occ[x][y]) continue;
          const dirs = [
            [1, 0],
            [-1, 0],
            [0, 1],
            [0, -1],
          ];
          let branched = 0;
          for (const [dx, dy] of dirs) {
            const nx = x + dx;
            const ny = y + dy;
            if (this.isOpen(nx, ny)) {
              nextOcc[nx][ny] = 1;
              nextDX[nx][ny] = dx;
              nextDY[nx][ny] = dy;
              nextMoving[nx][ny] = 1;
              branched++;
            }
          }
          // keep current energized cell as settled
          nextOcc[x][y] = 1;
          if (!branched) {
            nextDX[x][y] = this.dirX[x][y];
            nextDY[x][y] = this.dirY[x][y];
            nextMoving[x][y] = 0;
          }
        }
      }
    }

    // Apply next state
    this.occ = nextOcc;
    this.dirX = nextDX;
    this.dirY = nextDY;
    this.moving = nextMoving;
  }

  getVisualization() {
    const cells = [];
    for (let x = 0; x < this.height; x++) {
      for (let y = 0; y < this.width; y++) {
        if (!this.occ[x][y]) continue;
        cells.push({
          position: [x, y],
          type: this.type,
          moving: !!this.moving[x][y],
          dir: [this.dirX[x][y], this.dirY[x][y]],
        });
      }
    }
    return cells;
  }
}
