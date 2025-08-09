// Maze generation using recursive backtracking algorithm
// This guarantees there's always a path from start to end

export class MazeGenerator {
  constructor(width, height) {
    this.width = width;
    this.height = height;
    this.maze = [];
    this.visited = [];
  }

  generateMaze() {
    // Initialize maze with all walls
    this.maze = Array(this.height)
      .fill()
      .map(() => Array(this.width).fill(1));
    this.visited = Array(this.height)
      .fill()
      .map(() => Array(this.width).fill(false));

    // Start from top-left corner
    this.recursiveBacktrack(1, 1);

    // Ensure start and end points are open
    this.maze[1][1] = 0; // Start
    this.maze[this.height - 2][this.width - 2] = 0; // End

    return this.maze;
  }

  recursiveBacktrack(x, y) {
    this.visited[y][x] = true;
    this.maze[y][x] = 0; // Mark as path

    // Get random directions
    const directions = this.getShuffledDirections();

    for (const [dx, dy] of directions) {
      const newX = x + dx * 2;
      const newY = y + dy * 2;

      if (this.isValidCell(newX, newY) && !this.visited[newY][newX]) {
        // Remove wall between current cell and new cell
        this.maze[y + dy][x + dx] = 0;
        this.recursiveBacktrack(newX, newY);
      }
    }
  }

  getShuffledDirections() {
    const directions = [
      [0, 1],
      [1, 0],
      [0, -1],
      [-1, 0],
    ];
    // Fisher-Yates shuffle
    for (let i = directions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [directions[i], directions[j]] = [directions[j], directions[i]];
    }
    return directions;
  }

  isValidCell(x, y) {
    return x > 0 && x < this.width - 1 && y > 0 && y < this.height - 1;
  }

  // Find the solution path using BFS for validation
  findSolution() {
    const queue = [[1, 1, []]];
    const visited = new Set();
    const endX = this.width - 2;
    const endY = this.height - 2;

    while (queue.length > 0) {
      const [x, y, path] = queue.shift();
      const key = `${x},${y}`;

      if (visited.has(key)) continue;
      visited.add(key);

      const newPath = [...path, [x, y]];

      if (x === endX && y === endY) {
        return newPath;
      }

      const directions = [
        [0, 1],
        [1, 0],
        [0, -1],
        [-1, 0],
      ];
      for (const [dx, dy] of directions) {
        const newX = x + dx;
        const newY = y + dy;

        if (
          newX >= 0 &&
          newX < this.width &&
          newY >= 0 &&
          newY < this.height &&
          this.maze[newY][newX] === 0 &&
          !visited.has(`${newX},${newY}`)
        ) {
          queue.push([newX, newY, newPath]);
        }
      }
    }

    return null; // No solution found
  }
}

export const generateMaze = (width, height) => {
  const generator = new MazeGenerator(width, height);
  return generator.generateMaze();
};

export const findMazeSolution = (maze) => {
  const generator = new MazeGenerator(maze[0].length, maze.length);
  generator.maze = maze;
  return generator.findSolution();
};
