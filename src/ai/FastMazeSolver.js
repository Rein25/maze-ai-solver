// Fast pathfinding algorithms for maze solving
// These algorithms can solve large mazes in milliseconds

export class FastMazeSolver {
  constructor() {
    this.directions = [
      [-1, 0], // up
      [0, 1], // right
      [1, 0], // down
      [0, -1], // left
    ];
  }

  // A* Algorithm - Optimal pathfinding with heuristic
  solveMazeAStar(maze, start = [1, 1], end = null) {
    if (!end) {
      end = [maze.length - 2, maze[0].length - 2];
    }

    const openSet = [
      {
        pos: start,
        g: 0,
        h: this.heuristic(start, end),
        f: this.heuristic(start, end),
        parent: null,
      },
    ];
    const closedSet = new Set();
    const visited = new Map();

    while (openSet.length > 0) {
      // Get node with lowest f score
      openSet.sort((a, b) => a.f - b.f);
      const current = openSet.shift();
      const [x, y] = current.pos;
      const key = `${x},${y}`;

      if (closedSet.has(key)) continue;
      closedSet.add(key);

      // Check if we reached the goal
      if (x === end[0] && y === end[1]) {
        return this.reconstructPath(current);
      }

      // Explore neighbors
      for (const [dx, dy] of this.directions) {
        const newX = x + dx;
        const newY = y + dy;
        const newKey = `${newX},${newY}`;

        if (
          newX >= 0 &&
          newX < maze.length &&
          newY >= 0 &&
          newY < maze[0].length &&
          maze[newX][newY] === 0 &&
          !closedSet.has(newKey)
        ) {
          const g = current.g + 1;
          const h = this.heuristic([newX, newY], end);
          const f = g + h;

          const existing = visited.get(newKey);
          if (!existing || g < existing.g) {
            const node = { pos: [newX, newY], g, h, f, parent: current };
            visited.set(newKey, node);
            openSet.push(node);
          }
        }
      }
    }

    return null; // No solution found
  }

  // Breadth-First Search - Guaranteed shortest path
  solveMazeBFS(maze, start = [1, 1], end = null) {
    if (!end) {
      end = [maze.length - 2, maze[0].length - 2];
    }

    const queue = [{ pos: start, path: [start] }];
    const visited = new Set();
    const startKey = `${start[0]},${start[1]}`;
    visited.add(startKey);

    while (queue.length > 0) {
      const {
        pos: [x, y],
        path,
      } = queue.shift();

      if (x === end[0] && y === end[1]) {
        return path;
      }

      for (const [dx, dy] of this.directions) {
        const newX = x + dx;
        const newY = y + dy;
        const key = `${newX},${newY}`;

        if (
          newX >= 0 &&
          newX < maze.length &&
          newY >= 0 &&
          newY < maze[0].length &&
          maze[newX][newY] === 0 &&
          !visited.has(key)
        ) {
          visited.add(key);
          queue.push({
            pos: [newX, newY],
            path: [...path, [newX, newY]],
          });
        }
      }
    }

    return null;
  }

  // Depth-First Search - Fast but not optimal
  solveMazeDFS(maze, start = [1, 1], end = null) {
    if (!end) {
      end = [maze.length - 2, maze[0].length - 2];
    }

    const stack = [{ pos: start, path: [start] }];
    const visited = new Set();

    while (stack.length > 0) {
      const {
        pos: [x, y],
        path,
      } = stack.pop();
      const key = `${x},${y}`;

      if (visited.has(key)) continue;
      visited.add(key);

      if (x === end[0] && y === end[1]) {
        return path;
      }

      for (const [dx, dy] of this.directions) {
        const newX = x + dx;
        const newY = y + dy;
        const newKey = `${newX},${newY}`;

        if (
          newX >= 0 &&
          newX < maze.length &&
          newY >= 0 &&
          newY < maze[0].length &&
          maze[newX][newY] === 0 &&
          !visited.has(newKey)
        ) {
          stack.push({
            pos: [newX, newY],
            path: [...path, [newX, newY]],
          });
        }
      }
    }

    return null;
  }

  // Wall Follower Algorithm - Always finds exit in simply connected mazes
  solveMazeWallFollower(maze, start = [1, 1]) {
    const [startX, startY] = start;
    let x = startX;
    let y = startY;
    let direction = 1; // Start facing right
    const path = [[x, y]];
    const visited = new Set();
    const maxSteps = maze.length * maze[0].length * 2;
    let steps = 0;

    while (steps < maxSteps) {
      const key = `${x},${y}`;
      if (visited.has(key) && steps > 10) {
        // Avoid infinite loops
        break;
      }
      visited.add(key);

      // Check if we reached a potential end
      if (
        (x === maze.length - 2 && y === maze[0].length - 2) ||
        x === 0 ||
        x === maze.length - 1 ||
        y === 0 ||
        y === maze[0].length - 1
      ) {
        if (maze[x][y] === 0) {
          return path;
        }
      }

      // Wall following logic (right-hand rule)
      const rightDir = (direction + 1) % 4;
      const [rightDx, rightDy] = this.directions[rightDir];
      const rightX = x + rightDx;
      const rightY = y + rightDy;

      if (this.isValidMove(maze, rightX, rightY)) {
        // Turn right and move
        direction = rightDir;
        x = rightX;
        y = rightY;
        path.push([x, y]);
      } else {
        // Try to go forward
        const [dx, dy] = this.directions[direction];
        const newX = x + dx;
        const newY = y + dy;

        if (this.isValidMove(maze, newX, newY)) {
          x = newX;
          y = newY;
          path.push([x, y]);
        } else {
          // Turn left
          direction = (direction + 3) % 4;
        }
      }

      steps++;
    }

    return path;
  }

  // Dijkstra's Algorithm - Optimal for weighted graphs
  solveMazeDijkstra(maze, start = [1, 1], end = null) {
    if (!end) {
      end = [maze.length - 2, maze[0].length - 2];
    }

    const distances = new Map();
    const previous = new Map();
    const unvisited = [];

    // Initialize distances
    for (let i = 0; i < maze.length; i++) {
      for (let j = 0; j < maze[0].length; j++) {
        if (maze[i][j] === 0) {
          const key = `${i},${j}`;
          distances.set(key, Infinity);
          unvisited.push([i, j]);
        }
      }
    }

    const startKey = `${start[0]},${start[1]}`;
    distances.set(startKey, 0);

    while (unvisited.length > 0) {
      // Find unvisited node with minimum distance
      let current = unvisited[0];
      let minDist = distances.get(`${current[0]},${current[1]}`);
      let minIndex = 0;

      for (let i = 1; i < unvisited.length; i++) {
        const dist = distances.get(`${unvisited[i][0]},${unvisited[i][1]}`);
        if (dist < minDist) {
          minDist = dist;
          current = unvisited[i];
          minIndex = i;
        }
      }

      unvisited.splice(minIndex, 1);
      const [x, y] = current;
      const currentKey = `${x},${y}`;

      if (x === end[0] && y === end[1]) {
        return this.reconstructDijkstraPath(previous, start, end);
      }

      if (distances.get(currentKey) === Infinity) break;

      for (const [dx, dy] of this.directions) {
        const newX = x + dx;
        const newY = y + dy;
        const newKey = `${newX},${newY}`;

        if (this.isValidMove(maze, newX, newY) && distances.has(newKey)) {
          const alt = distances.get(currentKey) + 1;
          if (alt < distances.get(newKey)) {
            distances.set(newKey, alt);
            previous.set(newKey, currentKey);
          }
        }
      }
    }

    return null;
  }

  // Heuristic function for A* (Manhattan distance)
  heuristic(pos1, pos2) {
    return Math.abs(pos1[0] - pos2[0]) + Math.abs(pos1[1] - pos2[1]);
  }

  // Helper function to check if a move is valid
  isValidMove(maze, x, y) {
    return (
      x >= 0 &&
      x < maze.length &&
      y >= 0 &&
      y < maze[0].length &&
      maze[x][y] === 0
    );
  }

  // Reconstruct path for A*
  reconstructPath(node) {
    const path = [];
    let current = node;
    while (current) {
      path.unshift(current.pos);
      current = current.parent;
    }
    return path;
  }

  // Reconstruct path for Dijkstra
  reconstructDijkstraPath(previous, start, end) {
    const path = [];
    let currentKey = `${end[0]},${end[1]}`;

    while (currentKey) {
      const [x, y] = currentKey.split(",").map(Number);
      path.unshift([x, y]);
      currentKey = previous.get(currentKey);
    }

    return path;
  }

  // Benchmark all algorithms
  benchmarkAlgorithms(maze) {
    const algorithms = [
      { name: "A*", func: this.solveMazeAStar.bind(this) },
      { name: "BFS", func: this.solveMazeBFS.bind(this) },
      { name: "DFS", func: this.solveMazeDFS.bind(this) },
      { name: "Dijkstra", func: this.solveMazeDijkstra.bind(this) },
    ];

    const results = [];

    for (const { name, func } of algorithms) {
      const start = performance.now();
      const path = func(maze);
      const end = performance.now();

      results.push({
        algorithm: name,
        time: end - start,
        pathLength: path ? path.length : 0,
        found: !!path,
      });
    }

    return results;
  }
}

export const fastSolver = new FastMazeSolver();
