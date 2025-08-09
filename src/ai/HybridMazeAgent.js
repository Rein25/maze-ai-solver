// Hybrid AI Agent that combines Q-Learning with fast pathfinding
// Uses different strategies based on maze size and learning progress

import { fastSolver } from "./FastMazeSolver.js";
import { mctsPlan } from "./MCTS.js";

export class HybridMazeAgent {
  constructor(mazeWidth, mazeHeight, options = {}) {
    this.width = mazeWidth;
    this.height = mazeHeight;
    this.mazeSize = mazeWidth * mazeHeight;

    // Determine strategy based on maze size
    this.isLargeMaze = this.mazeSize > 1000; // Switch to fast pathfinding for large mazes

    // Q-Learning parameters (for small/medium mazes)
    this.epsilon = options.epsilon || (this.isLargeMaze ? 0.1 : 0.6);
    this.epsilonStart = this.epsilon; // remember configured start
    // Clamp decay to safe bounds
    const defaultDecay = this.isLargeMaze ? 0.995 : 0.98;
    const decay = options.epsilonDecay || defaultDecay;
    this.epsilonDecay = Math.min(0.9999, Math.max(0.9, decay));
    this.epsilonMin = Math.min(
      this.epsilon,
      options.epsilonMin !== undefined ? options.epsilonMin : 0.01
    );
    this.gamma = options.gamma || 0.95;
    this.learningRate = options.learningRate || 0.1;

    // Optional planning (MCTS)
    this.useMCTS = options.useMCTS || false;
    this.mctsBudgetMs = options.mctsBudgetMs || 20;
    this.mctsDepth = options.mctsDepth || 25;

    // Q-table with sparse representation for memory efficiency
    this.qTable = new Map();

    // Actions: 0=up, 1=right, 2=down, 3=left
    this.actions = [
      [-1, 0], // up
      [0, 1], // right
      [1, 0], // down
      [0, -1], // left
    ];

    // Fast pathfinding solver
    this.fastSolver = fastSolver;
    this.knownSolution = null;
    this.solutionSteps = 0;

    // Agent state
    this.position = [1, 1];
    this.path = [[1, 1]];
    this.moves = 0;
    this.visited = new Set([`1,1`]);
    this.isTraining = false;
    this.currentStrategy = this.isLargeMaze ? "pathfinding" : "qlearning";

    // Performance tracking
    this.gamesPlayed = 0;
    this.totalMoves = 0;
    this.moveHistory = [];
    this.successfulGames = 0;
    this.pathfindingTime = 0;

    this.reset();
  }

  reset() {
    this.position = [1, 1];
    this.path = [[1, 1]];
    this.moves = 0;
    this.solutionSteps = 0;
    this.knownSolution = null;
    this.visited = new Set([`1,1`]);
    this.prevPosition = null;
    this.lastAction = -1;
  }

  // Adaptive strategy selection
  selectStrategy(maze) {
    if (this.isLargeMaze) {
      return "pathfinding"; // Always use pathfinding for large mazes
    }

    // For small/medium mazes, use Q-learning initially, then pathfinding when learned
    const successRate =
      this.gamesPlayed > 0 ? this.successfulGames / this.gamesPlayed : 0;

    if (this.gamesPlayed > 20 && successRate > 0.8 && this.epsilon < 0.1) {
      return "pathfinding"; // Switch to pathfinding when well-trained
    }

    return "qlearning";
  }

  // Fast pathfinding move
  pathfindingMove(maze) {
    if (!this.knownSolution || this.solutionSteps === 0) {
      // Calculate solution once
      const start = performance.now();
      this.knownSolution = this.fastSolver.solveMazeAStar(maze, this.position);
      this.pathfindingTime += performance.now() - start;
      this.solutionSteps = 0;
    }

    if (
      this.knownSolution &&
      this.solutionSteps < this.knownSolution.length - 1
    ) {
      this.solutionSteps++;
      const nextPos = this.knownSolution[this.solutionSteps];
      this.position = [...nextPos];
      this.path.push([...nextPos]);
      this.moves++;

      return {
        position: [...nextPos],
        moves: this.moves,
        isValid: true,
        strategy: "pathfinding",
      };
    }

    return {
      position: [...this.position],
      moves: this.moves,
      isValid: false,
      strategy: "pathfinding",
    };
  }

  // Q-Learning move (original implementation)
  qLearningMove(maze) {
    const action = this.chooseAction(this.position, maze);
    const [dx, dy] = this.actions[action];
    const newPosition = [this.position[0] + dx, this.position[1] + dy];

    if (this.isValidMove(this.position, action, maze)) {
      this.prevPosition = this.position;
      this.position = newPosition;
      this.path.push([...newPosition]);
      this.moves++;
      this.visited.add(`${newPosition[0]},${newPosition[1]}`);
      this.lastAction = action;

      return {
        position: [...newPosition],
        action,
        moves: this.moves,
        isValid: true,
        strategy: "qlearning",
      };
    }

    return {
      position: [...this.position],
      action,
      moves: this.moves,
      isValid: false,
      strategy: "qlearning",
    };
  }

  // Main move function with adaptive strategy
  move(maze) {
    this.currentStrategy = this.selectStrategy(maze);

    if (this.currentStrategy === "pathfinding") {
      return this.pathfindingMove(maze);
    } else {
      return this.qLearningMove(maze);
    }
  }

  // Optimized state representation for large mazes
  getStateKey(x, y) {
    return (x << 16) | y; // Bit manipulation for faster key generation
  }

  getQValue(state, action) {
    const stateKey = this.getStateKey(state[0], state[1]);
    const qValues = this.qTable.get(stateKey);
    return qValues ? qValues[action] || 0 : 0;
  }

  setQValue(state, action, value) {
    const stateKey = this.getStateKey(state[0], state[1]);
    if (!this.qTable.has(stateKey)) {
      this.qTable.set(stateKey, {});
    }
    this.qTable.get(stateKey)[action] = value;
  }

  chooseAction(state, maze) {
    // If planner is enabled, use MCTS to pick the action (only during Q-learning strategy)
    if (this.useMCTS && this.currentStrategy === "qlearning") {
      const action = mctsPlan({
        state,
        maze,
        validActionsFn: (s, m) => this.validActionsFromState(s, m),
        stepFn: (s, a, m) => this.simStep(s, a, m),
        evaluateFn: (s, m) => -this.manhattanToGoal(s),
        budgetMs: this.mctsBudgetMs,
        maxDepth: this.mctsDepth,
        c: 1.2,
      });
      return action;
    }
    const validActions = [];
    for (let action = 0; action < 4; action++) {
      if (this.isValidMove(state, action, maze)) {
        validActions.push(action);
      }
    }

    if (validActions.length === 0) return 0;

    // Epsilon-greedy with heuristic bias for large mazes
    if (Math.random() < this.epsilon && this.isTraining) {
      if (this.isLargeMaze) {
        // Bias towards goal direction for large mazes
        return this.getBiasedAction(state, validActions);
      } else {
        // Avoid immediate reverse where possible
        const pool = validActions.filter((a) =>
          this.lastAction === -1 ? true : (a + 2) % 4 !== this.lastAction
        );
        const arr = pool.length ? pool : validActions;
        return arr[(Math.random() * arr.length) | 0];
      }
    } else {
      let bestAction = validActions[0];
      let bestScore = -Infinity;
      for (const a of validActions) {
        const q = this.getQValue(state, a);
        const [dx, dy] = this.actions[a];
        const next = [state[0] + dx, state[1] + dy];
        const key = `${next[0]},${next[1]}`;
        const unvisited = this.visited && !this.visited.has(key) ? 1 : 0;
        const manhDelta =
          this.manhattanToGoal(state) - this.manhattanToGoal(next);
        const reverse =
          this.lastAction !== -1 && (a + 2) % 4 === this.lastAction ? 1 : 0;
        const score = q + 0.05 * manhDelta + 0.1 * unvisited - 0.05 * reverse;
        if (score > bestScore) {
          bestScore = score;
          bestAction = a;
        }
      }
      return bestAction;
    }
  }

  // Heuristic-biased action selection for large mazes
  getBiasedAction(state, validActions) {
    const goalX = this.height - 2;
    const goalY = this.width - 2;
    const [x, y] = state;

    // Calculate direction towards goal
    const dx = goalX - x;
    const dy = goalY - y;

    // Prefer actions that move towards the goal
    const actionScores = validActions.map((action) => {
      const [actionDx, actionDy] = this.actions[action];
      const score =
        (dx !== 0 ? actionDx * Math.sign(dx) : 0) +
        (dy !== 0 ? actionDy * Math.sign(dy) : 0);
      return { action, score };
    });

    // Sort by score and add some randomness
    actionScores.sort((a, b) => b.score - a.score);

    // Choose from top 2 actions with some randomness
    const topActions = actionScores.slice(0, Math.min(2, actionScores.length));
    return topActions[Math.floor(Math.random() * topActions.length)].action;
  }

  isValidMove(state, action, maze) {
    const [dx, dy] = this.actions[action];
    const newX = state[0] + dx;
    const newY = state[1] + dy;

    return (
      newX >= 0 &&
      newX < this.height &&
      newY >= 0 &&
      newY < this.width &&
      maze[newX][newY] === 0
    );
  }

  getReward(oldState, newState, maze, isGameOver, isWin) {
    if (isWin) return 100;
    if (isGameOver) return -50;

    let reward = -0.5; // Slightly lighter base step cost

    // Distance-based reward
    const goalX = this.height - 2;
    const goalY = this.width - 2;

    const oldDistance =
      Math.abs(oldState[0] - goalX) + Math.abs(oldState[1] - goalY);
    const newDistance =
      Math.abs(newState[0] - goalX) + Math.abs(newState[1] - goalY);

    if (newDistance < oldDistance) {
      reward += 2; // getting closer
    } else if (newDistance > oldDistance) {
      reward -= 2; // moving away is clearly bad
    } else {
      reward -= 0.5; // sideways/no net progress
    }

    // Encourage exploration of unseen cells
    const key = `${newState[0]},${newState[1]}`;
    if (!this.visited.has(key)) {
      reward += 1.5;
    }

    return reward;
  }

  updateQValue(oldState, action, newState, reward, maze) {
    if (this.currentStrategy !== "qlearning") return; // Only update Q-values during Q-learning

    const currentQ = this.getQValue(oldState, action);
    let maxFutureQ = -Infinity;

    for (let a = 0; a < 4; a++) {
      if (this.isValidMove(newState, a, maze)) {
        maxFutureQ = Math.max(maxFutureQ, this.getQValue(newState, a));
      }
    }

    if (maxFutureQ === -Infinity) maxFutureQ = 0;

    const newQ =
      currentQ +
      this.learningRate * (reward + this.gamma * maxFutureQ - currentQ);
    this.setQValue(oldState, action, newQ);
  }

  trainStep(maze, previousState = null, action = null) {
    if (!this.isTraining) return;

    const goalX = this.height - 2;
    const goalY = this.width - 2;
    const isWin = this.position[0] === goalX && this.position[1] === goalY;
    // Cap episode length to prevent thrashing in tiny mazes
    const maxMoves = this.isLargeMaze
      ? this.mazeSize
      : this.width <= 31
      ? Math.max(100, Math.floor((this.width * this.height) / 2))
      : Math.max(this.width * this.height, 150);
    const isGameOver = this.moves > maxMoves || isWin;

    if (
      previousState !== null &&
      action !== null &&
      this.currentStrategy === "qlearning"
    ) {
      const reward = this.getReward(
        previousState,
        this.position,
        maze,
        isGameOver,
        isWin
      );
      this.updateQValue(previousState, action, this.position, reward, maze);
    }

    return { isWin, isGameOver };
  }

  startTraining() {
    this.isTraining = true;
  }

  stopTraining() {
    this.isTraining = false;
  }

  finishGame(isWin) {
    this.gamesPlayed++;
    if (isWin) this.successfulGames++;

    this.moveHistory.push(this.moves);
    this.totalMoves += this.moves;

    // Faster epsilon decay for large mazes
    if (this.epsilon > this.epsilonMin) {
      const decayRate = this.isLargeMaze ? 0.99 : this.epsilonDecay;
      this.epsilon *= decayRate;
    }

    // Reset pathfinding solution for next game
    this.knownSolution = null;
    this.solutionSteps = 0;
  }

  getStats() {
    const avgMoves =
      this.moveHistory.length > 0
        ? this.totalMoves / this.moveHistory.length
        : 0;
    const minMoves =
      this.moveHistory.length > 0 ? Math.min(...this.moveHistory) : 0;
    const maxMoves =
      this.moveHistory.length > 0 ? Math.max(...this.moveHistory) : 0;
    const successRate =
      this.gamesPlayed > 0
        ? (this.successfulGames / this.gamesPlayed) * 100
        : 0;

    return {
      gamesPlayed: this.gamesPlayed,
      epsilon: this.epsilon,
      gamma: this.gamma,
      avgMoves: Math.round(avgMoves * 100) / 100,
      minMoves,
      maxMoves,
      successRate: Math.round(successRate * 100) / 100,
      qTableSize: this.qTable.size,
      currentStrategy: this.currentStrategy,
      isLargeMaze: this.isLargeMaze,
      pathfindingTime: Math.round(this.pathfindingTime * 100) / 100,
    };
  }

  resetStats() {
    this.gamesPlayed = 0;
    this.totalMoves = 0;
    this.moveHistory = [];
    this.successfulGames = 0;
    this.qTable.clear();
    // reset epsilon to configured start
    this.epsilon = this.epsilonStart;
    this.knownSolution = null;
    this.solutionSteps = 0;
    this.pathfindingTime = 0;
  }

  // --- Helpers for planning ---
  validActionsFromState(state, maze) {
    const arr = [];
    for (let a = 0; a < 4; a++)
      if (this.isValidMove(state, a, maze)) arr.push(a);
    return arr;
  }

  simStep(state, action, maze) {
    if (!this.isValidMove(state, action, maze)) {
      // small penalty for illegal in rollout to discourage
      return { nextState: state, reward: -0.5, terminal: false };
    }
    const [dx, dy] = this.actions[action];
    const next = [state[0] + dx, state[1] + dy];
    const goalX = this.height - 2;
    const goalY = this.width - 2;
    const isWin = next[0] === goalX && next[1] === goalY;
    const r = isWin
      ? 100
      : -0.2 -
        (this.manhattanToGoal(next) - this.manhattanToGoal(state) > 0
          ? 0.5
          : 0);
    return { nextState: next, reward: r, terminal: isWin };
  }

  manhattanToGoal(s) {
    const goalX = this.height - 2;
    const goalY = this.width - 2;
    return Math.abs(s[0] - goalX) + Math.abs(s[1] - goalY);
  }

  // Get solution using best available algorithm
  getSolution(maze) {
    const start = performance.now();
    const solution = this.fastSolver.solveMazeAStar(maze);
    this.pathfindingTime += performance.now() - start;
    return solution;
  }

  // Benchmark different algorithms on current maze
  benchmarkSolution(maze) {
    return this.fastSolver.benchmarkAlgorithms(maze);
  }
}
