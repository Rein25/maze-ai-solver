// Advanced Neural Network Agent for complex maze environments
// Uses deep reinforcement learning to handle dynamic, multi-objective scenarios

import { EnhancedAgentState } from "./EnhancedGameModes.js";
import { DynamicMazeElements } from "./DynamicMazeElements.js";

export class NeuralMazeAgent {
  constructor(mazeWidth, mazeHeight, gameMode, options = {}) {
    this.width = mazeWidth;
    this.height = mazeHeight;
    this.gameMode = gameMode;

    // Enhanced agent state
    this.agentState = new EnhancedAgentState(gameMode, mazeWidth, mazeHeight);

    // Dynamic environment
    this.dynamicElements = new DynamicMazeElements(
      mazeWidth,
      mazeHeight,
      gameMode
    );

    // Neural network parameters with mode-specific defaults
    this.learningRate =
      options.learningRate || this.getLearningRateForMode(gameMode) || 0.001;
    const defaultEps = this.getInitialEpsilonForMode(gameMode) || 0.9;
    this.epsilon = options.epsilon !== undefined ? options.epsilon : defaultEps;
    this.epsilonStart = this.epsilon;
    const decayDefault = this.getEpsilonDecayForMode(gameMode, 0.995);
    const decay = options.epsilonDecay || decayDefault;
    this.epsilonDecay = Math.min(0.9999, Math.max(0.9, decay));
    this.epsilonMin = Math.min(
      this.epsilon,
      options.epsilonMin !== undefined ? options.epsilonMin : 0.01
    );
    this.gamma = options.gamma || 0.99; // Higher gamma for long-term planning
    this.batchSize = options.batchSize || 32;

    // Fog of war specific optimizations
    if (gameMode === "fog") {
      this.epsilon = 0.95; // Start with very high exploration
      this.epsilonDecay = 0.98; // Very aggressive decay
      this.learningRate = 0.2; // Much higher learning rate
      this.explorationBonus = 10; // High reward for new cells
      this.goalSeekingWeight = 0.8; // Strong bias toward goal
    }

    // Experience replay buffer
    this.memory = [];
    this.memorySize = options.memorySize || 10000;

    // Multi-head network architecture (simulated)
    this.networkLayers = {
      spatial: { weights: new Map(), biases: new Map() }, // For spatial reasoning
      temporal: { weights: new Map(), biases: new Map() }, // For temporal patterns
      strategic: { weights: new Map(), biases: new Map() }, // For high-level planning
      value: { weights: new Map(), biases: new Map() }, // Value estimation
      policy: { weights: new Map(), biases: new Map() }, // Action probabilities
    };

    // Action space (expanded for complex modes)
    this.actions = [
      "move_up",
      "move_right",
      "move_down",
      "move_left",
      "wait",
      "dash_up",
      "dash_right",
      "dash_down",
      "dash_left",
      "jump_up",
      "jump_right",
      "jump_down",
      "jump_left",
      "use_item",
      "rest", // Energy recovery
    ];

    // Performance tracking
    this.episodeRewards = [];
    this.episodeLengths = [];
    this.lossHistory = [];
    this.explorationHistory = [];

    // Training state
    this.isTraining = false;
    this.episode = 0;
    this.totalSteps = 0;

    this.initializeNetwork();

    console.log(`🧠 Neural agent initialized for ${gameMode} mode:`, {
      epsilon: this.epsilon,
      learningRate: this.learningRate,
      epsilonDecay: this.epsilonDecay,
      goalSeekingWeight: this.goalSeekingWeight || 0.5,
    });
  }

  getEpsilonDecayForMode(gameMode, defaultDecay = 0.995) {
    // Much faster decay for modes where exploration needs to be more focused
    switch (gameMode) {
      case "fog":
        return 0.98; // Very aggressive decay - transition to exploitation quickly
      case "survival":
        return 0.99; // Fast decay - learn danger avoidance quickly
      case "competitive":
        return 0.995; // Moderate decay - need sustained exploration to compete
      case "dynamic":
        return 0.992; // Fast decay for dynamic environments
      case "procedural":
        return 0.994; // Moderate decay for adaptive learning
      default:
        return defaultDecay;
    }
  }

  getInitialEpsilonForMode(gameMode) {
    switch (gameMode) {
      case "fog":
        return 0.95; // High initial exploration for fog mode
      case "survival":
        return 0.8; // Moderate exploration for survival
      case "competitive":
        return 0.9; // High exploration for competition
      case "dynamic":
        return 0.85; // Moderate-high for dynamic environments
      case "procedural":
        return 0.9; // High for procedural learning
      default:
        return 0.7; // Conservative default
    }
  }

  getLearningRateForMode(gameMode) {
    switch (gameMode) {
      case "fog":
        return 0.2; // High learning rate for fast adaptation
      case "survival":
        return 0.1; // Moderate rate for careful learning
      case "competitive":
        return 0.05; // Lower rate for stable competition
      case "dynamic":
        return 0.15; // High rate for dynamic adaptation
      case "procedural":
        return 0.1; // Moderate for procedural learning
      default:
        return 0.001; // Conservative default
    }
  }

  initializeNetwork() {
    // Simple, learnable linear Q head per action for stability
    this.stateSize = this.getStateSize();
    this.linearHead = {
      weights: Array.from({ length: this.actions.length }, () => {
        const arr = new Float64Array(this.stateSize);
        for (let i = 0; i < this.stateSize; i++) {
          arr[i] = this.randomWeight(this.stateSize);
        }
        return arr;
      }),
      biases: new Float64Array(this.actions.length).fill(0),
    };
  }

  randomWeight(fanIn) {
    // Xavier initialization
    const limit = Math.sqrt(6 / fanIn);
    return (Math.random() * 2 - 1) * limit;
  }

  getStateSize() {
    // Calculate state vector size based on game mode
    let baseSize = 50; // Position, resources, local view, goals, etc.

    switch (this.gameMode) {
      case "fog":
        baseSize += 25; // Exploration memory
        break;
      case "competitive":
        baseSize += 30; // Other agents information
        break;
      case "survival":
        baseSize += 20; // Health, inventory, hazards
        break;
      case "dynamic":
        baseSize += 35; // Moving elements tracking
        break;
      case "procedural":
        baseSize += 40; // Adaptive difficulty, generation state
        break;
    }

    return baseSize;
  }

  reset() {
    this.agentState.reset();
    this.dynamicElements = new DynamicMazeElements(
      this.width,
      this.height,
      this.gameMode
    );
    this.episode++;
  }

  getState(maze) {
    // Get comprehensive state representation
    const baseState = this.agentState.getStateVector(
      maze,
      this.dynamicElements
    );
    const dynamicState = this.getDynamicState();
    const temporalState = this.getTemporalState();

    return [...baseState, ...dynamicState, ...temporalState];
  }

  getDynamicState() {
    const state = [];

    // Moving walls information (relative positions and velocities)
    this.dynamicElements.movingWalls.forEach((wall) => {
      const relativeX =
        (wall.position[0] - this.agentState.position[0]) / this.height;
      const relativeY =
        (wall.position[1] - this.agentState.position[1]) / this.width;
      state.push(relativeX, relativeY, wall.direction / 4, wall.speed / 10);
    });

    // Pad to fixed size
    while (state.length < 20) state.push(0);

    // Other agents (for competitive mode)
    if (this.gameMode === "competitive") {
      this.dynamicElements.otherAgents.forEach((agent) => {
        const relativeX =
          (agent.position[0] - this.agentState.position[0]) / this.height;
        const relativeY =
          (agent.position[1] - this.agentState.position[1]) / this.width;
        state.push(relativeX, relativeY, agent.health / 100, agent.score / 100);
      });

      while (state.length < 30) state.push(0);
    }

    return state.slice(0, 35); // Fixed size for consistency
  }

  getTemporalState() {
    const state = [];

    // Recent action history (for temporal learning)
    const historyLength = 5;
    const recentActions = this.agentState.path
      .slice(-historyLength)
      .map((pos) => [
        (pos[0] - this.agentState.position[0]) / this.height,
        (pos[1] - this.agentState.position[1]) / this.width,
      ]);

    recentActions.forEach((action) => state.push(...action));
    while (state.length < historyLength * 2) state.push(0);

    // Temporal patterns
    state.push(
      this.dynamicElements.time / 1000, // Normalized time
      this.agentState.stepsWithoutProgress / 50, // Stagnation
      (this.dynamicElements.time - this.agentState.lastDamageTime) / 100 // Time since damage
    );

    return state.slice(0, 15); // Fixed size
  }

  selectAction(state, maze) {
    // For fog of war and complex modes, use a hybrid approach that actually works
    if (
      this.gameMode === "fog" ||
      this.gameMode === "survival" ||
      this.gameMode === "competitive"
    ) {
      return this.hybridGoalSeekingExploration(maze);
    }

    if (this.isTraining && Math.random() < this.epsilon) {
      // Use intelligent exploration based on game mode
      return this.intelligentExploration(maze);
    } else {
      // Exploitation: use neural network
      return this.predictBestAction(state, maze);
    }
  }

  hybridGoalSeekingExploration(maze) {
    const validActions = this.getValidActions(maze);
    const [x, y] = this.agentState.position;
    const [goalX, goalY] = this.agentState.primaryGoal;

    // Calculate progress toward goal - much more aggressive goal-seeking for fog mode
    const currentDistance = Math.abs(x - goalX) + Math.abs(y - goalY);
    const totalDistance = Math.abs(1 - goalX) + Math.abs(1 - goalY); // Distance from start to goal
    const progressRatio = Math.max(
      0,
      (totalDistance - currentDistance) / totalDistance
    );

    // VERY aggressive goal-seeking for fog of war mode
    let explorationWeight = this.gameMode === "fog" ? 0.1 : 0.3; // Only 10% exploration for fog

    // For fog mode, only increase exploration if REALLY stuck
    if (this.gameMode === "fog") {
      if (this.episode > 100 && progressRatio < 0.05) {
        explorationWeight = 0.25; // Still mostly goal-focused even when stuck
      } else if (this.episode > 200 && progressRatio < 0.02) {
        explorationWeight = 0.4; // More exploration only if completely stuck
      }
    } else {
      // Original logic for other modes
      if (this.episode > 50 && progressRatio < 0.1) {
        explorationWeight = 0.8; // High exploration when stuck
      } else if (this.episode > 20 && progressRatio < 0.3) {
        explorationWeight = 0.6; // Medium exploration
      } else if (progressRatio > 0.7) {
        explorationWeight = 0.1; // Low exploration when close to goal
      }
    }

    // Score actions
    const actionScores = validActions.map((action) => {
      const [dx, dy] = this.getActionDirection(action);
      const newX = x + dx;
      const newY = y + dy;

      let score = 0;

      // Goal-seeking component (Manhattan distance) - MUCH stronger for fog mode
      const newDistance = Math.abs(newX - goalX) + Math.abs(newY - goalY);
      const goalScore =
        (currentDistance - newDistance) * (this.gameMode === "fog" ? 50 : 10); // 5x stronger for fog

      // Exploration component
      let explorationScore = 0;
      if (this.gameMode === "fog") {
        // Simple but effective exploration: prefer unvisited cells
        if (!this.agentState.exploredCells.has(`${newX},${newY}`)) {
          explorationScore = 20; // Good reward for new cells
        }

        // Small bonus for exploring areas near unexplored regions
        let nearUnexplored = 0;
        for (let i = -1; i <= 1; i++) {
          for (let j = -1; j <= 1; j++) {
            const checkX = newX + i;
            const checkY = newY + j;
            if (
              checkX >= 0 &&
              checkX < this.height &&
              checkY >= 0 &&
              checkY < this.width &&
              !this.agentState.exploredCells.has(`${checkX},${checkY}`)
            ) {
              nearUnexplored++;
            }
          }
        }
        explorationScore += nearUnexplored * 1; // Small bonus
      }

      // Strong anti-stagnation: heavily penalize revisiting recent positions
      const recentPositions = this.agentState.path.slice(-5); // Check last 5 positions
      const visitPenalty =
        recentPositions.filter((pos) => pos[0] === newX && pos[1] === newY)
          .length * (this.gameMode === "fog" ? -20 : -5);

      // Combine scores with adaptive weighting
      score =
        goalScore * (1 - explorationWeight) +
        explorationScore * explorationWeight +
        visitPenalty;

      return { action, score, goalScore, explorationScore, newDistance };
    });

    // Choose best action with minimal randomness for fog mode
    actionScores.sort((a, b) => b.score - a.score);

    // Much less randomness for fog mode - be deterministic about goal-seeking
    const randomChance = this.gameMode === "fog" ? 0.05 : 0.2; // Only 5% random for fog
    if (Math.random() < randomChance) {
      return validActions[Math.floor(Math.random() * validActions.length)];
    }

    // Debug logging for fog mode
    if (this.gameMode === "fog" && this.episode % 25 === 0) {
      const bestAction = actionScores[0];
      console.log(
        `🎯 Fog strategy (Episode ${this.episode}, Progress: ${(
          progressRatio * 100
        ).toFixed(1)}%):`,
        {
          action: bestAction.action,
          goalScore: bestAction.goalScore.toFixed(1),
          explorationScore: bestAction.explorationScore.toFixed(1),
          totalScore: bestAction.score.toFixed(1),
          distanceToGoal: bestAction.newDistance,
          explorationWeight: explorationWeight.toFixed(2),
        }
      );
    }

    return actionScores[0].action;
  }

  intelligentExploration(maze) {
    const validActions = this.getValidActions(maze);

    // For fog of war mode, prioritize exploration of unknown areas
    if (this.gameMode === "fog") {
      return this.fogOfWarExploration(maze, validActions);
    }

    // For survival mode, balance exploration with safety
    if (this.gameMode === "survival") {
      return this.survivalExploration(maze, validActions);
    }

    // For competitive mode, be more aggressive
    if (this.gameMode === "competitive") {
      return this.competitiveExploration(maze, validActions);
    }

    // Default random exploration for other modes
    return validActions[Math.floor(Math.random() * validActions.length)];
  }

  fogOfWarExploration(maze, validActions) {
    const [x, y] = this.agentState.position;
    const exploredCells = this.agentState.exploredCells;

    // Score each action based on how much new area it would explore
    const actionScores = validActions.map((action) => {
      const [dx, dy] = this.getActionDirection(action);
      const newX = x + dx;
      const newY = y + dy;

      let explorationScore = 0;

      // Check 3x3 area around potential new position for unexplored cells
      for (let i = -1; i <= 1; i++) {
        for (let j = -1; j <= 1; j++) {
          const checkX = newX + i;
          const checkY = newY + j;

          if (
            checkX >= 0 &&
            checkX < this.height &&
            checkY >= 0 &&
            checkY < this.width &&
            !exploredCells.has(`${checkX},${checkY}`)
          ) {
            explorationScore += 1;
          }
        }
      }

      // Bonus for moving towards unexplored areas
      if (!exploredCells.has(`${newX},${newY}`)) {
        explorationScore += 5;
      }

      // Small bias toward goal direction to prevent endless wandering
      const [goalX, goalY] = this.agentState.primaryGoal;
      const distanceToGoal = Math.abs(newX - goalX) + Math.abs(newY - goalY);
      const currentDistance = Math.abs(x - goalX) + Math.abs(y - goalY);

      if (distanceToGoal < currentDistance) {
        explorationScore += 2; // Smaller bonus to not override exploration
      }

      return { action, score: explorationScore };
    });

    // Choose action with highest exploration score (with some randomness)
    actionScores.sort((a, b) => b.score - a.score);

    // Use weighted random selection favoring higher scores
    const topActions = actionScores.slice(0, Math.min(3, actionScores.length));
    if (topActions.length > 0 && topActions[0].score > 0) {
      const weights = topActions.map((_, i) => Math.pow(0.7, i)); // Exponential decay
      const totalWeight = weights.reduce((sum, w) => sum + w, 0);
      const random = Math.random() * totalWeight;

      let weightSum = 0;
      for (let i = 0; i < topActions.length; i++) {
        weightSum += weights[i];
        if (random <= weightSum) {
          return topActions[i].action;
        }
      }
    }

    // Fallback to random if no good exploration options
    return validActions[Math.floor(Math.random() * validActions.length)];
  }

  survivalExploration(maze, validActions) {
    // In survival mode, avoid hazards and seek items when health/energy is low
    const [x, y] = this.agentState.position;

    return (
      validActions.reduce((best, action) => {
        const [dx, dy] = this.getActionDirection(action);
        const newX = x + dx;
        const newY = y + dy;

        // Avoid hazards
        const nearHazard = this.dynamicElements.hazards.some(
          (hazard) =>
            Math.abs(hazard.position[0] - newX) <= 1 &&
            Math.abs(hazard.position[1] - newY) <= 1
        );

        if (nearHazard) return best;

        // Prefer actions that move toward collectibles when health/energy is low
        if (this.agentState.health < 50 || this.agentState.energy < 30) {
          const nearestItem = this.findNearestItem(newX, newY);
          if (nearestItem) {
            const currentBest = best ? this.getActionDirection(best) : [0, 0];
            const currentBestPos = [x + currentBest[0], y + currentBest[1]];

            const distanceToItem =
              Math.abs(newX - nearestItem[0]) + Math.abs(newY - nearestItem[1]);
            const bestDistanceToItem =
              Math.abs(currentBestPos[0] - nearestItem[0]) +
              Math.abs(currentBestPos[1] - nearestItem[1]);

            if (distanceToItem < bestDistanceToItem) {
              return action;
            }
          }
        }

        return best || action;
      }, null) || validActions[Math.floor(Math.random() * validActions.length)]
    );
  }

  competitiveExploration(maze, validActions) {
    // In competitive mode, be more aggressive and goal-oriented
    const [x, y] = this.agentState.position;
    const [goalX, goalY] = this.agentState.primaryGoal;

    // Strongly bias toward goal
    return (
      validActions.reduce((best, action) => {
        const [dx, dy] = this.getActionDirection(action);
        const newX = x + dx;
        const newY = y + dy;

        const distanceToGoal = Math.abs(newX - goalX) + Math.abs(newY - goalY);

        if (!best) return action;

        const [bestDx, bestDy] = this.getActionDirection(best);
        const bestDistance =
          Math.abs(x + bestDx - goalX) + Math.abs(y + bestDy - goalY);

        return distanceToGoal < bestDistance ? action : best;
      }, null) || validActions[Math.floor(Math.random() * validActions.length)]
    );
  }

  getActionDirection(action) {
    const [actionType, direction] = action.split("_");

    if (direction) {
      const directions = {
        up: [-1, 0],
        right: [0, 1],
        down: [1, 0],
        left: [0, -1],
      };

      const [dx, dy] = directions[direction] || [0, 0];

      // Account for dash and jump distances
      const multiplier = actionType === "dash" ? 2 : 1;
      return [dx * multiplier, dy * multiplier];
    }

    return [0, 0]; // For wait, rest, use_item actions
  }

  findNearestItem(x, y) {
    let nearest = null;
    let minDistance = Infinity;

    this.dynamicElements.collectibles.forEach((item) => {
      const distance =
        Math.abs(item.position[0] - x) + Math.abs(item.position[1] - y);
      if (distance < minDistance) {
        minDistance = distance;
        nearest = item.position;
      }
    });

    return nearest;
  }

  predictBestAction(state, maze) {
    // Simplified neural network forward pass
    const validActions = this.getValidActions(maze);
    let bestAction = validActions[0];
    let bestValue = -Infinity;

    validActions.forEach((action) => {
      const actionIndex = this.actions.indexOf(action);
      const qValue = this.forwardPass(state, actionIndex);

      if (qValue > bestValue) {
        bestValue = qValue;
        bestAction = action;
      }
    });

    return bestAction;
  }

  forwardPass(state, actionIndex) {
    // Linear approximator: Q(s, a) = w_a · s + b_a
    const w = this.linearHead?.weights?.[actionIndex];
    let q = this.linearHead?.biases?.[actionIndex] || 0;
    if (w) {
      const len = Math.min(state.length, w.length);
      for (let i = 0; i < len; i++) q += w[i] * state[i];
    }
    if (this.isTraining) q += (Math.random() - 0.5) * this.epsilon * 0.05;
    return q;
  }

  processLayer(input, layer) {
    const output = [];
    const weights = layer.weights;
    const biases = layer.biases;

    // Simple linear transformation (simplified)
    for (let i = 0; i < Math.min(10, weights.size / 2); i++) {
      let activation = biases.get(`hidden_${i}`) || 0;

      for (let j = 0; j < input.length; j++) {
        const weight = weights.get(`input_${i}`) || 0;
        activation += input[j] * weight * 0.01; // Scaled down for stability
      }

      // ReLU activation
      output.push(Math.max(0, activation));
    }

    return output;
  }

  getValidActions(maze) {
    const validActions = [];
    const [x, y] = this.agentState.position;

    // Basic movement actions
    const directions = [
      { action: "move_up", dx: -1, dy: 0 },
      { action: "move_right", dx: 0, dy: 1 },
      { action: "move_down", dx: 1, dy: 0 },
      { action: "move_left", dx: 0, dy: -1 },
    ];

    directions.forEach(({ action, dx, dy }) => {
      const newX = x + dx;
      const newY = y + dy;

      const blockedByDynamic =
        this.dynamicElements &&
        typeof this.dynamicElements.isBlocked === "function" &&
        this.dynamicElements.isBlocked(newX, newY);

      if (
        newX >= 0 &&
        newX < this.height &&
        newY >= 0 &&
        newY < this.width &&
        maze[newX][newY] === 0 &&
        !blockedByDynamic
      ) {
        validActions.push(action);

        // Add enhanced actions if agent has abilities
        if (
          this.agentState.abilities.has("dash") &&
          this.agentState.energy >= 3
        ) {
          validActions.push(action.replace("move", "dash"));
        }
        if (
          this.agentState.abilities.has("jump") &&
          this.agentState.energy >= 2
        ) {
          validActions.push(action.replace("move", "jump"));
        }
      }
    });

    // Always allow waiting and resting
    validActions.push("wait", "rest");

    // Item usage
    if (this.agentState.inventory.length > 0) {
      validActions.push("use_item");
    }

    return validActions;
  }

  executeAction(action, maze) {
    const oldPosition = [...this.agentState.position];
    const oldState = this.getState(maze);

    // Execute the action
    const moveResult = this.performAction(action, maze);

    // Update dynamic environment
    const gameEvents = this.dynamicElements.update(
      maze,
      this.agentState.position,
      this.agentState
    );

    // Update agent exploration (for fog of war)
    this.agentState.updateExploration();

    // Calculate reward
    const reward = this.agentState.calculateReward(
      action,
      this.agentState.position,
      maze,
      this.dynamicElements,
      gameEvents
    );

    // Accumulate into episode score so avgReward isn't stuck at 0
    this.agentState.score += reward;

    // Update temporal state
    this.agentState.timeAlive++;
    this.agentState.moves++;
    this.totalSteps++;

    // Check terminal conditions
    const isTerminal = this.checkTerminalConditions();

    // Store experience for training
    if (this.isTraining) {
      const newState = this.getState(maze);
      this.storeExperience(oldState, action, reward, newState, isTerminal);

      // Periodic training
      if (this.memory.length >= this.batchSize && this.totalSteps % 4 === 0) {
        this.trainOnBatch();
      }
    }

    return {
      position: [...this.agentState.position],
      reward: reward,
      isTerminal: isTerminal,
      gameEvents: gameEvents,
      stats: this.getDetailedStats(),
      visualData: this.dynamicElements.getVisualizationData(
        this.agentState.position,
        this.agentState.exploredCells
      ),
    };
  }

  performAction(action, maze) {
    const [x, y] = this.agentState.position;
    let newX = x,
      newY = y;
    let energyCost = 1;

    // Parse action
    const [actionType, direction] = action.split("_");

    if (direction) {
      const directions = {
        up: [-1, 0],
        right: [0, 1],
        down: [1, 0],
        left: [0, -1],
      };

      const [dx, dy] = directions[direction] || [0, 0];

      switch (actionType) {
        case "move":
          newX = x + dx;
          newY = y + dy;
          energyCost = 1;
          break;
        case "dash":
          newX = x + dx * 2;
          newY = y + dy * 2;
          energyCost = 3;
          break;
        case "jump":
          newX = x + dx;
          newY = y + dy;
          energyCost = 2;
          // Jump can go over some obstacles
          break;
      }
    }

    // Validate movement
    const blockedByDynamic =
      this.dynamicElements &&
      typeof this.dynamicElements.isBlocked === "function" &&
      this.dynamicElements.isBlocked(newX, newY);

    if (
      newX >= 0 &&
      newX < this.height &&
      newY >= 0 &&
      newY < this.width &&
      maze[newX][newY] === 0 &&
      !blockedByDynamic &&
      this.agentState.energy >= energyCost
    ) {
      this.agentState.position = [newX, newY];
      this.agentState.path.push([newX, newY]);
      this.agentState.energy = Math.max(0, this.agentState.energy - energyCost);

      return { success: true, position: [newX, newY] };
    }

    // Handle special actions
    switch (action) {
      case "wait":
        // Do nothing, small energy recovery
        this.agentState.energy = Math.min(
          this.agentState.maxEnergy,
          this.agentState.energy + 0.5
        );
        break;
      case "rest":
        // Significant energy recovery, but takes time
        this.agentState.energy = Math.min(
          this.agentState.maxEnergy,
          this.agentState.energy + 5
        );
        break;
      case "use_item":
        this.useItem();
        break;
    }

    return { success: false, position: [x, y] };
  }

  useItem() {
    if (this.agentState.inventory.length > 0) {
      const item = this.agentState.inventory.pop();

      switch (item.type) {
        case "health_potion":
          this.agentState.health = Math.min(
            this.agentState.maxHealth,
            this.agentState.health + item.value
          );
          break;
        case "energy_potion":
          this.agentState.energy = Math.min(
            this.agentState.maxEnergy,
            this.agentState.energy + item.value
          );
          break;
        case "key":
          this.agentState.keys.add(item.keyType);
          break;
      }
    }
  }

  checkTerminalConditions() {
    // Win condition
    const [gx, gy] = this.agentState.primaryGoal;
    if (
      this.agentState.position[0] === gx &&
      this.agentState.position[1] === gy
    ) {
      return "win";
    }

    // Loss conditions
    if (this.agentState.health <= 0) return "death";
    if (this.agentState.energy <= 0) return "exhaustion";
    if (this.agentState.moves > this.width * this.height * 2) return "timeout";

    return false;
  }

  storeExperience(state, action, reward, nextState, terminal) {
    const experience = {
      state: state,
      action: this.actions.indexOf(action),
      reward: reward,
      nextState: nextState,
      terminal: terminal,
    };

    this.memory.push(experience);

    // Limit memory size
    if (this.memory.length > this.memorySize) {
      this.memory.shift();
    }
  }

  trainOnBatch() {
    if (this.memory.length < this.batchSize) return;

    // Sample random batch
    const batch = [];
    for (let i = 0; i < this.batchSize; i++) {
      const randomIndex = Math.floor(Math.random() * this.memory.length);
      batch.push(this.memory[randomIndex]);
    }

    // Simplified training (in real implementation, use proper backpropagation)
    let totalLoss = 0;

    batch.forEach((experience) => {
      const { state, action, reward, nextState, terminal } = experience;

      const currentQ = this.forwardPass(state, action);
      let targetQ = reward;

      if (!terminal) {
        // Find max Q-value for next state
        let maxNextQ = -Infinity;
        for (let a = 0; a < this.actions.length; a++) {
          const nextQ = this.forwardPass(nextState, a);
          maxNextQ = Math.max(maxNextQ, nextQ);
        }
        targetQ += this.gamma * maxNextQ;
      }

      const loss = Math.pow(targetQ - currentQ, 2);
      totalLoss += loss;

      // Simplified weight update (gradient descent)
      this.updateWeights(state, action, targetQ - currentQ);
    });

    this.lossHistory.push(totalLoss / this.batchSize);

    // Decay epsilon
    if (this.epsilon > this.epsilonMin) {
      this.epsilon *= this.epsilonDecay;
    }

    this.explorationHistory.push(this.epsilon);
  }

  updateWeights(state, actionIndex, error) {
    // Gradient descent for linear head
    const lr = this.learningRate;
    const w = this.linearHead.weights[actionIndex];
    const len = Math.min(state.length, w.length);
    for (let i = 0; i < len; i++) {
      w[i] += lr * error * state[i];
    }
    this.linearHead.biases[actionIndex] += lr * error;
  }

  startTraining() {
    this.isTraining = true;
  }

  stopTraining() {
    this.isTraining = false;
  }

  resetStats() {
    this.episodeRewards = [];
    this.episodeLengths = [];
    this.lossHistory = [];
    this.explorationHistory = [];
    this.totalSteps = 0;
    this.episode = 0;
    this.agentState.score = 0;
  }

  finishEpisode(outcome) {
    const episodeReward = this.agentState.score;
    const episodeLength = this.agentState.moves;

    this.episodeRewards.push(episodeReward);
    this.episodeLengths.push(episodeLength);

    // Limit history size
    if (this.episodeRewards.length > 1000) {
      this.episodeRewards.shift();
      this.episodeLengths.shift();
    }

    if (this.lossHistory.length > 1000) {
      this.lossHistory.shift();
      this.explorationHistory.shift();
    }
  }

  getDetailedStats() {
    const recentRewards = this.episodeRewards.slice(-100);
    const recentLengths = this.episodeLengths.slice(-100);
    const recentLoss = this.lossHistory.slice(-10);

    // Calculate progress indicators
    const explorationProgress = Math.max(
      0,
      Math.min(1, (0.9 - this.epsilon) / 0.85)
    ); // 0-1 scale
    const learningProgress =
      this.episode > 0 ? Math.min(1, this.episode / 50) : 0; // First 50 episodes

    // Calculate exploration efficiency for fog of war
    const explorationEfficiency =
      this.gameMode === "fog"
        ? this.agentState.exploredCells.size /
          Math.max(1, this.agentState.moves)
        : 0;

    return {
      // Basic stats
      episode: this.episode,
      totalSteps: this.totalSteps,
      epsilon: this.epsilon,
      gamma: this.gamma,

      // Agent state
      health: this.agentState.health,
      energy: this.agentState.energy,
      score: this.agentState.score,
      moves: this.agentState.moves,
      position: [...this.agentState.position],

      // Performance metrics
      avgReward:
        recentRewards.length > 0
          ? recentRewards.reduce((a, b) => a + b, 0) / recentRewards.length
          : this.agentState.score, // show current running reward during first episodes
      avgEpisodeLength:
        recentLengths.length > 0
          ? recentLengths.reduce((a, b) => a + b, 0) / recentLengths.length
          : 0,
      avgLoss:
        recentLoss.length > 0
          ? recentLoss.reduce((a, b) => a + b, 0) / recentLoss.length
          : 0,

      // Progress indicators
      explorationProgress: explorationProgress,
      learningProgress: learningProgress,
      explorationEfficiency: explorationEfficiency,

      // Game mode specific
      gameMode: this.gameMode,
      exploredCells: this.agentState.exploredCells.size,
      keysCollected: this.agentState.keys.size,
      inventorySize: this.agentState.inventory.length,

      // Network info
      memorySize: this.memory.length,
      isTraining: this.isTraining,
    };
  }

  resetStats() {
    this.episode = 0;
    this.totalSteps = 0;
    this.episodeRewards = [];
    this.episodeLengths = [];
    this.lossHistory = [];
    this.explorationHistory = [];
    this.memory = [];
    this.epsilon = 0.9;
    this.initializeNetwork();
  }
}
