// Enhanced game modes that require neural networks and reinforcement learning
// Each mode presents unique challenges that can't be solved with simple pathfinding

export const GAME_MODES = {
  CLASSIC: {
    id: "classic",
    name: "Classic Pathfinding",
    description: "Simple maze solving - good for learning basic concepts",
    icon: "🎯",
    difficulty: "Beginner",
    requiresRL: false,
    features: ["Static maze", "Single goal", "Perfect information"],
  },

  DYNAMIC_MAZE: {
    id: "dynamic",
    name: "Dynamic Shifting Maze",
    description:
      "Walls move and rotate while you navigate - adapt in real-time!",
    icon: "🌀",
    difficulty: "Intermediate",
    requiresRL: true,
    features: ["Moving walls", "Rotating sections", "Temporal planning"],
  },

  COMPETITIVE: {
    id: "competitive",
    name: "Multi-Agent Competition",
    description:
      "Race against other AI agents for limited collectibles and exits",
    icon: "⚔️",
    difficulty: "Advanced",
    requiresRL: true,
    features: ["Multiple agents", "Resource competition", "Strategic planning"],
  },

  FOG_OF_WAR: {
    id: "fog",
    name: "Fog of War Explorer",
    description: "Limited vision - must explore and remember the environment",
    icon: "🌫️",
    difficulty: "Intermediate",
    requiresRL: true,
    features: [
      "Partial observability",
      "Memory requirements",
      "Exploration rewards",
    ],
  },

  SURVIVAL: {
    id: "survival",
    name: "Survival Maze Runner",
    description:
      "Manage health, energy, and resources while avoiding deadly traps",
    icon: "💀",
    difficulty: "Expert",
    requiresRL: true,
    features: ["Resource management", "Health system", "Risk vs reward"],
  },

  PROCEDURAL: {
    id: "procedural",
    name: "Infinite Procedural Maze",
    description:
      "Endless maze that generates and adapts based on your performance",
    icon: "♾️",
    difficulty: "Master",
    requiresRL: true,
    features: [
      "Infinite generation",
      "Adaptive difficulty",
      "Continuous learning",
    ],
  },
};

export const DIFFICULTY_COLORS = {
  Beginner: "#10b981", // Green
  Intermediate: "#f59e0b", // Orange
  Advanced: "#ef4444", // Red
  Expert: "#8b5cf6", // Purple
  Master: "#1f2937", // Dark
};

// Enhanced agent state for complex game modes
export class EnhancedAgentState {
  constructor(gameMode, mazeWidth, mazeHeight) {
    this.gameMode = gameMode;
    this.width = mazeWidth;
    this.height = mazeHeight;

    // Basic state
    this.position = [1, 1];
    this.path = [[1, 1]];
    this.moves = 0;

    // Enhanced state for complex modes
    this.health = 100;
    this.maxHealth = 100;
    this.energy = 100;
    this.maxEnergy = 100;
    this.oxygen = 100; // For underwater sections
    this.score = 0;
    this.multiplier = 1.0;

    // Inventory and abilities
    this.inventory = [];
    this.keys = new Set();
    this.abilities = new Set(["move"]);
    this.powerups = new Set();

    // Memory and exploration (for fog of war)
    this.exploredCells = new Set();
    this.rememberedWalls = new Set();
    this.rememberedItems = new Map();

    // Temporal state
    this.timeAlive = 0;
    this.stepsWithoutProgress = 0;
    this.lastDamageTime = 0;

    // Goals and objectives
    this.primaryGoal = [mazeHeight - 2, mazeWidth - 2];
    this.subGoals = [];
    this.completedGoals = new Set();

    this.reset();
  }

  reset() {
    this.position = [1, 1];
    this.path = [[1, 1]];
    this.moves = 0;
    this.health = this.maxHealth;
    this.energy = this.maxEnergy;
    this.oxygen = 100;
    this.score = 0;
    this.multiplier = 1.0;
    this.inventory = [];
    this.keys.clear();
    this.powerups.clear();
    this.exploredCells.clear();
    this.rememberedWalls.clear();
    this.rememberedItems.clear();
    this.timeAlive = 0;
    this.stepsWithoutProgress = 0;
    this.lastDamageTime = 0;
    this.completedGoals.clear();
    this.subGoals = [];
  }

  // Get current state vector for neural network
  getStateVector(maze, dynamicElements = {}) {
    const state = [];

    // Position (normalized)
    state.push(this.position[0] / this.height);
    state.push(this.position[1] / this.width);

    // Resources (normalized)
    state.push(this.health / this.maxHealth);
    state.push(this.energy / this.maxEnergy);
    state.push(this.oxygen / 100);

    // Local maze view (5x5 around agent)
    const viewRadius = 2;
    for (let dx = -viewRadius; dx <= viewRadius; dx++) {
      for (let dy = -viewRadius; dy <= viewRadius; dy++) {
        const x = this.position[0] + dx;
        const y = this.position[1] + dy;

        if (x < 0 || x >= this.height || y < 0 || y >= this.width) {
          state.push(-1); // Out of bounds
        } else if (
          this.gameMode === "fog" &&
          !this.exploredCells.has(`${x},${y}`)
        ) {
          state.push(0.5); // Unknown cell
        } else {
          state.push(maze[x][y]); // Known cell (0 or 1)
        }
      }
    }

    // Goal direction (normalized)
    const goalDx = (this.primaryGoal[0] - this.position[0]) / this.height;
    const goalDy = (this.primaryGoal[1] - this.position[1]) / this.width;
    state.push(goalDx);
    state.push(goalDy);

    // Inventory and abilities
    state.push(this.keys.size / 10); // Normalize key count
    state.push(this.inventory.length / 20); // Normalize inventory size
    state.push(this.abilities.has("jump") ? 1 : 0);
    state.push(this.abilities.has("dash") ? 1 : 0);

    // Temporal information
    state.push(Math.min(this.timeAlive / 1000, 1)); // Normalize time
    state.push(Math.min(this.stepsWithoutProgress / 50, 1)); // Stagnation indicator

    return state;
  }

  // Update exploration for fog of war mode
  updateExploration() {
    if (this.gameMode !== "fog") return;

    const visionRadius = 3;
    for (let dx = -visionRadius; dx <= visionRadius; dx++) {
      for (let dy = -visionRadius; dy <= visionRadius; dy++) {
        const x = this.position[0] + dx;
        const y = this.position[1] + dy;

        if (x >= 0 && x < this.height && y >= 0 && y < this.width) {
          const distance = Math.abs(dx) + Math.abs(dy);
          if (distance <= visionRadius) {
            this.exploredCells.add(`${x},${y}`);
          }
        }
      }
    }
  }

  // Calculate complex reward for enhanced modes
  calculateReward(action, newPosition, maze, dynamicElements, gameEvents) {
    let reward = 0;

    // Base movement cost (reduced to encourage movement)
    reward -= 0.5;

    // Energy cost
    const energyCost = this.getEnergyCost(action);
    this.energy = Math.max(0, this.energy - energyCost);
    reward -= energyCost * 0.05; // Reduced energy penalty

    // Health management
    if (this.health <= 20) reward -= 3; // Reduced low health penalty
    if (this.energy <= 10) reward -= 2; // Reduced low energy penalty

    // Goal progress - much more generous rewards for progress
    const oldDistance =
      Math.abs(this.position[0] - this.primaryGoal[0]) +
      Math.abs(this.position[1] - this.primaryGoal[1]);
    const newDistance =
      Math.abs(newPosition[0] - this.primaryGoal[0]) +
      Math.abs(newPosition[1] - this.primaryGoal[1]);

    if (newDistance < oldDistance) {
      // Progressive bonus - bigger reward when closer to goal
      const progressBonus = Math.max(3, 15 - newDistance * 0.5);
      reward += progressBonus;
      this.stepsWithoutProgress = 0;
    } else if (newDistance === oldDistance) {
      // Neutral movement (sideways)
      reward -= 0.1;
    } else {
      // Moving away from goal
      reward -= 1;
      this.stepsWithoutProgress++;
    }

    // Escalating stagnation penalty
    if (this.stepsWithoutProgress > 15) {
      reward -= this.stepsWithoutProgress * 0.5; // Escalating penalty
    }

    // Game mode specific rewards
    switch (this.gameMode) {
      case "fog":
        // Exploration bonus - very generous to encourage exploration
        const newKey = `${newPosition[0]},${newPosition[1]}`;
        if (!this.exploredCells.has(newKey)) {
          reward += 8; // Increased discovery bonus
        }

        // Bonus for exploring areas with more unknown neighbors
        let unknownNeighbors = 0;
        for (let i = -1; i <= 1; i++) {
          for (let j = -1; j <= 1; j++) {
            const checkX = newPosition[0] + i;
            const checkY = newPosition[1] + j;
            if (
              checkX >= 0 &&
              checkX < maze.length &&
              checkY >= 0 &&
              checkY < maze[0].length &&
              !this.exploredCells.has(`${checkX},${checkY}`)
            ) {
              unknownNeighbors++;
            }
          }
        }
        reward += unknownNeighbors * 1.5; // Bonus for exploring frontier areas
        break;

      case "survival":
        // Survival bonuses
        if (gameEvents.foundFood) {
          reward += 20;
          this.health = Math.min(this.maxHealth, this.health + 25);
        }
        if (gameEvents.foundKey) {
          reward += 15;
        }
        if (gameEvents.hitTrap) {
          reward -= 30;
          this.health -= 20;
        }
        break;

      case "competitive":
        // Competition rewards
        if (gameEvents.collectibleTaken) reward += 25;
        if (gameEvents.blockedOtherAgent) reward += 10;
        if (gameEvents.wasBlocked) reward -= 5;
        break;

      case "dynamic":
        // Adaptation rewards
        if (gameEvents.adaptedToChange) reward += 8;
        if (gameEvents.caughtByMovingWall) reward -= 15;
        break;
    }

    // Win condition
    if (
      newPosition[0] === this.primaryGoal[0] &&
      newPosition[1] === this.primaryGoal[1]
    ) {
      reward += 100;
      // Bonus for efficiency
      const efficiency = Math.max(0, 1000 - this.moves) / 10;
      reward += efficiency;
    }

    // Death conditions
    if (this.health <= 0 || this.energy <= 0) {
      reward -= 100;
    }

    return reward;
  }

  getEnergyCost(action) {
    let cost = 1; // Base cost

    if (this.abilities.has("dash") && action === "dash") cost = 3;
    if (this.abilities.has("jump") && action === "jump") cost = 2;

    // Terrain modifiers
    if (this.powerups.has("efficiency")) cost *= 0.5;

    return cost;
  }

  // Check if agent can perform action
  canPerformAction(action, maze, dynamicElements) {
    switch (action) {
      case "jump":
        return this.abilities.has("jump") && this.energy >= 2;
      case "dash":
        return this.abilities.has("dash") && this.energy >= 3;
      default:
        return this.energy >= 1;
    }
  }
}

// Export the game modes for use in the UI
export const GameModes = {
  classic: {
    ...GAME_MODES.CLASSIC,
    emoji: GAME_MODES.CLASSIC.icon,
  },
  dynamic: {
    ...GAME_MODES.DYNAMIC_MAZE,
    emoji: GAME_MODES.DYNAMIC_MAZE.icon,
  },
  competitive: {
    ...GAME_MODES.COMPETITIVE,
    emoji: GAME_MODES.COMPETITIVE.icon,
  },
  fog: {
    ...GAME_MODES.FOG_OF_WAR,
    emoji: GAME_MODES.FOG_OF_WAR.icon,
  },
  survival: {
    ...GAME_MODES.SURVIVAL,
    emoji: GAME_MODES.SURVIVAL.icon,
  },
  procedural: {
    ...GAME_MODES.PROCEDURAL,
    emoji: GAME_MODES.PROCEDURAL.icon,
  },
};
