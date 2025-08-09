// Q-Learning AI Agent for maze solving
import { mctsPlan } from "./MCTS.js";

export class QLearningAgent {
  constructor(mazeWidth, mazeHeight, options = {}) {
    this.width = mazeWidth;
    this.height = mazeHeight;

    // Q-Learning parameters
    this.epsilon = options.epsilon || 0.9; // Exploration rate
    this.epsilonStart = this.epsilon;
    const decay = options.epsilonDecay || 0.995;
    this.epsilonDecay = Math.min(0.9999, Math.max(0.9, decay));
    this.epsilonMin = Math.min(
      this.epsilon,
      options.epsilonMin !== undefined ? options.epsilonMin : 0.01
    );
    this.gamma = options.gamma || 0.95; // Discount factor
    this.learningRate = options.learningRate || 0.1;

    // Optional planners
    this.useMCTS = options.useMCTS || false;
    this.mctsBudgetMs = options.mctsBudgetMs || 20;
    this.mctsDepth = options.mctsDepth || 25;

    // Q-table: state -> action -> value
    this.qTable = new Map();

    // Actions: 0=up, 1=right, 2=down, 3=left
    this.actions = [
      [-1, 0], // up
      [0, 1], // right
      [1, 0], // down
      [0, -1], // left
    ];

    // Training statistics
    this.gamesPlayed = 0;
    this.totalMoves = 0;
    this.moveHistory = [];
    this.successfulGames = 0;

    this.reset();
  }

  reset() {
    this.position = [1, 1]; // Start position
    this.path = [[1, 1]];
    this.moves = 0;
    this.isTraining = false;
  }

  getStateKey(x, y) {
    return `${x},${y}`;
  }

  getQValue(state, action) {
    const stateKey = this.getStateKey(state[0], state[1]);
    if (!this.qTable.has(stateKey)) {
      this.qTable.set(stateKey, new Array(4).fill(0));
    }
    return this.qTable.get(stateKey)[action];
  }

  setQValue(state, action, value) {
    const stateKey = this.getStateKey(state[0], state[1]);
    if (!this.qTable.has(stateKey)) {
      this.qTable.set(stateKey, new Array(4).fill(0));
    }
    this.qTable.get(stateKey)[action] = value;
  }

  getBestAction(state, maze) {
    let bestAction = 0;
    let bestValue = -Infinity;

    for (let action = 0; action < 4; action++) {
      if (this.isValidMove(state, action, maze)) {
        const qValue = this.getQValue(state, action);
        if (qValue > bestValue) {
          bestValue = qValue;
          bestAction = action;
        }
      }
    }

    return bestAction;
  }

  chooseAction(state, maze) {
    // If planner enabled, use it to pick the action
    if (this.useMCTS) {
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
    // Get valid actions
    const validActions = [];
    for (let action = 0; action < 4; action++) {
      if (this.isValidMove(state, action, maze)) {
        validActions.push(action);
      }
    }

    if (validActions.length === 0) return 0; // No valid moves

    // Epsilon-greedy action selection
    if (Math.random() < this.epsilon && this.isTraining) {
      // Explore: choose random valid action
      return validActions[Math.floor(Math.random() * validActions.length)];
    } else {
      // Exploit: choose best action among valid ones
      let bestAction = validActions[0];
      let bestValue = -Infinity;

      for (const action of validActions) {
        const qValue = this.getQValue(state, action);
        if (qValue > bestValue) {
          bestValue = qValue;
          bestAction = action;
        }
      }

      return bestAction;
    }
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

  move(maze) {
    const action = this.chooseAction(this.position, maze);
    const [dx, dy] = this.actions[action];
    const newPosition = [this.position[0] + dx, this.position[1] + dy];

    if (this.isValidMove(this.position, action, maze)) {
      this.position = newPosition;
      this.path.push([...newPosition]);
      this.moves++;

      return {
        position: [...newPosition],
        action,
        moves: this.moves,
        isValid: true,
      };
    }

    return {
      position: [...this.position],
      action,
      moves: this.moves,
      isValid: false,
    };
  }

  getReward(oldState, newState, maze, isGameOver, isWin) {
    if (isWin) return 100; // Large positive reward for winning
    if (isGameOver) return -50; // Negative reward for hitting dead end or timeout

    // Small negative reward for each move to encourage efficiency
    let reward = -1;

    // Bonus for getting closer to the goal
    const goalX = this.height - 2;
    const goalY = this.width - 2;

    const oldDistance =
      Math.abs(oldState[0] - goalX) + Math.abs(oldState[1] - goalY);
    const newDistance =
      Math.abs(newState[0] - goalX) + Math.abs(newState[1] - goalY);

    if (newDistance < oldDistance) {
      reward += 2; // Bonus for getting closer
    } else if (newDistance > oldDistance) {
      reward -= 1; // Penalty for moving away
    }

    return reward;
  }

  updateQValue(oldState, action, newState, reward, maze) {
    const currentQ = this.getQValue(oldState, action);
    const maxFutureQ = Math.max(
      ...Array(4)
        .fill(0)
        .map((_, a) =>
          this.isValidMove(newState, a, maze)
            ? this.getQValue(newState, a)
            : -Infinity
        )
    );

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
    const isGameOver = this.moves > this.width * this.height || isWin;

    if (previousState && action !== null) {
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

    // Decay epsilon
    if (this.epsilon > this.epsilonMin) {
      this.epsilon *= this.epsilonDecay;
    }
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
    };
  }

  resetStats() {
    this.gamesPlayed = 0;
    this.totalMoves = 0;
    this.moveHistory = [];
    this.successfulGames = 0;
    this.qTable.clear();
    this.epsilon = this.epsilonStart;
  }

  validActionsFromState(state, maze) {
    const arr = [];
    for (let a = 0; a < 4; a++)
      if (this.isValidMove(state, a, maze)) arr.push(a);
    return arr;
  }

  simStep(state, action, maze) {
    if (!this.isValidMove(state, action, maze)) {
      return { nextState: state, reward: -1, terminal: false };
    }
    const [dx, dy] = this.actions[action];
    const next = [state[0] + dx, state[1] + dy];
    const goalX = this.height - 2;
    const goalY = this.width - 2;
    const isWin = next[0] === goalX && next[1] === goalY;
    const r = isWin
      ? 100
      : -0.1 -
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
}
