// Dynamic maze elements for enhanced game modes
// These create environments that require neural networks and continuous learning

export class DynamicMazeElements {
  constructor(width, height, gameMode) {
    this.width = width;
    this.height = height;
    this.gameMode = gameMode;
    this.time = 0;

    // Moving walls for dynamic mode
    this.movingWalls = [];
    this.rotatingSections = [];
    this.temporaryWalls = new Map();

    // Hazards and items for survival mode
    this.hazards = new Map();
    this.collectibles = new Map();
    this.food = new Map();
    this.keys = new Map();
    this.traps = new Map();

    // Other agents for competitive mode
    this.otherAgents = [];

    // Fog of war data
    this.fogDensity = 0.3;
    this.visionRadius = 3;

    // Procedural generation state
    this.generatedSections = new Set();
    this.difficultyModifier = 1.0;

    this.initialize();
  }

  initialize() {
    switch (this.gameMode) {
      case "dynamic":
        this.initializeDynamicElements();
        break;
      case "survival":
        this.initializeSurvivalElements();
        break;
      case "competitive":
        this.initializeCompetitiveElements();
        break;
      case "fog":
        this.initializeFogElements();
        break;
      case "procedural":
        this.initializeProceduralElements();
        break;
    }
  }

  initializeDynamicElements() {
    // Create moving walls
    const numMovingWalls = Math.floor(this.width / 8);
    for (let i = 0; i < numMovingWalls; i++) {
      this.movingWalls.push({
        id: i,
        position: [
          Math.floor(Math.random() * (this.height - 4)) + 2,
          Math.floor(Math.random() * (this.width - 4)) + 2,
        ],
        direction: Math.floor(Math.random() * 4),
        speed: 3 + Math.floor(Math.random() * 3), // Move every 3-5 steps
        lastMove: 0,
        length: 2 + Math.floor(Math.random() * 3),
      });
    }

    // Create rotating sections
    const numRotatingSections = Math.floor(
      Math.min(this.width, this.height) / 15
    );
    for (let i = 0; i < numRotatingSections; i++) {
      const centerX = Math.floor(Math.random() * (this.height - 8)) + 4;
      const centerY = Math.floor(Math.random() * (this.width - 8)) + 4;

      this.rotatingSections.push({
        id: i,
        center: [centerX, centerY],
        radius: 2 + Math.floor(Math.random() * 2),
        rotationSpeed: 8 + Math.floor(Math.random() * 4), // Rotate every 8-11 steps
        lastRotation: 0,
        angle: 0,
      });
    }
  }

  initializeSurvivalElements() {
    const numElements = Math.floor((this.width * this.height) / 100);

    // Hazards (spike traps, fire, etc.)
    for (let i = 0; i < numElements; i++) {
      const pos = this.getRandomOpenPosition();
      if (pos) {
        this.hazards.set(`${pos[0]},${pos[1]}`, {
          type: this.getRandomHazardType(),
          damage: 15 + Math.floor(Math.random() * 15),
          activePattern: Math.floor(Math.random() * 3), // Different activation patterns
          lastActivation: 0,
          isActive: false,
        });
      }
    }

    // Food sources
    for (let i = 0; i < numElements * 2; i++) {
      const pos = this.getRandomOpenPosition();
      if (pos) {
        this.food.set(`${pos[0]},${pos[1]}`, {
          healing: 20 + Math.floor(Math.random() * 20),
          energy: 15 + Math.floor(Math.random() * 15),
          respawnTime: 50 + Math.floor(Math.random() * 50),
          lastTaken: -1000,
        });
      }
    }

    // Keys for locked doors
    for (let i = 0; i < Math.max(2, numElements / 2); i++) {
      const pos = this.getRandomOpenPosition();
      if (pos) {
        this.keys.set(`${pos[0]},${pos[1]}`, {
          keyType: `key_${i}`,
          collected: false,
        });
      }
    }

    // Collectibles with varying values
    for (let i = 0; i < numElements * 3; i++) {
      const pos = this.getRandomOpenPosition();
      if (pos) {
        this.collectibles.set(`${pos[0]},${pos[1]}`, {
          value: 5 + Math.floor(Math.random() * 15),
          type: this.getRandomCollectibleType(),
          collected: false,
        });
      }
    }
  }

  initializeCompetitiveElements() {
    // Create other AI agents
    const numAgents = 2 + Math.floor(Math.random() * 3);
    for (let i = 0; i < numAgents; i++) {
      const pos = this.getRandomOpenPosition();
      if (pos) {
        this.otherAgents.push({
          id: i,
          position: pos,
          health: 100,
          score: 0,
          strategy: this.getRandomStrategy(),
          lastMove: 0,
          target: null,
        });
      }
    }

    // Shared collectibles
    const numSharedItems = Math.floor((this.width * this.height) / 80);
    for (let i = 0; i < numSharedItems; i++) {
      const pos = this.getRandomOpenPosition();
      if (pos) {
        this.collectibles.set(`${pos[0]},${pos[1]}`, {
          value: 10 + Math.floor(Math.random() * 20),
          collected: false,
          respawnTime: 30 + Math.floor(Math.random() * 30),
          lastTaken: -1000,
        });
      }
    }
  }

  initializeFogElements() {
    // No special initialization needed - fog is handled by agent state
    this.visionRadius = 2 + Math.floor(Math.random() * 2); // Variable vision

    // But add some hidden treasures to encourage exploration
    const numTreasures = Math.floor((this.width * this.height) / 150);
    for (let i = 0; i < numTreasures; i++) {
      const pos = this.getRandomOpenPosition();
      if (pos) {
        this.collectibles.set(`${pos[0]},${pos[1]}`, {
          value: 25 + Math.floor(Math.random() * 25),
          type: "treasure",
          hidden: true,
          collected: false,
        });
      }
    }
  }

  initializeProceduralElements() {
    this.difficultyModifier = 1.0;
    // Procedural elements are generated on-demand
  }

  // Update dynamic elements each step
  update(maze, agentPosition, agentStats) {
    this.time++;
    const events = {
      adaptedToChange: false,
      caughtByMovingWall: false,
      foundFood: false,
      foundKey: false,
      hitTrap: false,
      collectibleTaken: false,
      blockedOtherAgent: false,
      wasBlocked: false,
    };

    switch (this.gameMode) {
      case "dynamic":
        this.updateDynamicElements(maze, agentPosition, events);
        break;
      case "survival":
        this.updateSurvivalElements(maze, agentPosition, agentStats, events);
        break;
      case "competitive":
        this.updateCompetitiveElements(maze, agentPosition, agentStats, events);
        break;
      case "procedural":
        this.updateProceduralElements(maze, agentPosition, agentStats, events);
        break;
    }

    return events;
  }

  updateDynamicElements(maze, agentPosition, events) {
    // Update moving walls
    this.movingWalls.forEach((wall) => {
      if (this.time - wall.lastMove >= wall.speed) {
        const [dx, dy] = [
          [0, 1],
          [1, 0],
          [0, -1],
          [-1, 0],
        ][wall.direction];
        const newPos = [wall.position[0] + dx, wall.position[1] + dy];

        // Check bounds and change direction if needed
        if (
          newPos[0] <= 1 ||
          newPos[0] >= this.height - 2 ||
          newPos[1] <= 1 ||
          newPos[1] >= this.width - 2
        ) {
          wall.direction = (wall.direction + 2) % 4; // Reverse direction
        } else {
          wall.position = newPos;
          events.adaptedToChange = true;

          // Check if agent was caught
          if (
            newPos[0] === agentPosition[0] &&
            newPos[1] === agentPosition[1]
          ) {
            events.caughtByMovingWall = true;
          }
        }

        wall.lastMove = this.time;
      }
    });

    // Update rotating sections
    this.rotatingSections.forEach((section) => {
      if (this.time - section.lastRotation >= section.rotationSpeed) {
        section.angle = (section.angle + 90) % 360;
        section.lastRotation = this.time;
        events.adaptedToChange = true;
      }
    });
  }

  // Return true if a dynamic element occupies the cell
  isBlocked(x, y) {
    // Moving wall segments occupy multiple cells along direction
    for (const wall of this.movingWalls) {
      const parts = this.getMovingWallCells(wall);
      if (parts.some(([wx, wy]) => wx === x && wy === y)) return true;
    }
    // Rotating sections occupy a ring around the center
    for (const section of this.rotatingSections) {
      const parts = this.getRotatingSectionCells(section);
      if (parts.some(([sx, sy]) => sx === x && sy === y)) return true;
    }
    // Temporary walls
    if (this.temporaryWalls.has(`${x},${y}`)) return true;
    return false;
  }

  getMovingWallCells(wall) {
    const cells = [];
    const [x, y] = wall.position;
    const len = wall.length || 2;
    const dir = wall.direction % 2; // 0 horizontal, 1 vertical
    for (let i = 0; i < len; i++) {
      const cx = dir === 1 ? x + i : x;
      const cy = dir === 0 ? y + i : y;
      if (cx > 0 && cx < this.height - 1 && cy > 0 && cy < this.width - 1) {
        cells.push([cx, cy]);
      }
    }
    return cells;
  }

  getRotatingSectionCells(section) {
    const { center, radius, angle } = section;
    const [cx, cy] = center;
    const cells = [];
    // Occupy a plus-shape ring that rotates by 90 degrees steps
    const orientations = [
      [
        [-radius, 0],
        [radius, 0],
        [0, -radius],
        [0, radius],
      ],
      [
        [-radius, -radius],
        [-radius, radius],
        [radius, -radius],
        [radius, radius],
      ],
      [
        [-radius, 0],
        [radius, 0],
        [0, -radius],
        [0, radius],
      ],
      [
        [-radius, -radius],
        [-radius, radius],
        [radius, -radius],
        [radius, radius],
      ],
    ];
    const idx = Math.floor((angle % 360) / 90) % 4;
    orientations[idx].forEach(([dx, dy]) => {
      const x = cx + dx;
      const y = cy + dy;
      if (x > 0 && x < this.height - 1 && y > 0 && y < this.width - 1) {
        cells.push([x, y]);
      }
    });
    return cells;
  }

  updateSurvivalElements(maze, agentPosition, agentStats, events) {
    const agentKey = `${agentPosition[0]},${agentPosition[1]}`;

    // Check hazards
    if (this.hazards.has(agentKey)) {
      const hazard = this.hazards.get(agentKey);
      if (this.shouldHazardActivate(hazard)) {
        events.hitTrap = true;
        hazard.lastActivation = this.time;
        hazard.isActive = true;
      }
    }

    // Check food
    if (this.food.has(agentKey)) {
      const food = this.food.get(agentKey);
      if (this.time - food.lastTaken > food.respawnTime) {
        events.foundFood = true;
        food.lastTaken = this.time;
      }
    }

    // Check keys
    if (this.keys.has(agentKey)) {
      const key = this.keys.get(agentKey);
      if (!key.collected) {
        events.foundKey = true;
        key.collected = true;
      }
    }

    // Check collectibles
    if (this.collectibles.has(agentKey)) {
      const collectible = this.collectibles.get(agentKey);
      if (!collectible.collected) {
        events.collectibleTaken = true;
        collectible.collected = true;
      }
    }

    // Update hazard states
    this.hazards.forEach((hazard) => {
      if (hazard.isActive && this.time - hazard.lastActivation > 3) {
        hazard.isActive = false;
      }
    });
  }

  updateCompetitiveElements(maze, agentPosition, agentStats, events) {
    // Move other agents
    this.otherAgents.forEach((agent) => {
      if (this.time - agent.lastMove >= 2) {
        // Agents move every 2 steps
        const newPos = this.moveAgentTowardsGoal(agent, maze);

        // Check if agents block each other
        if (newPos[0] === agentPosition[0] && newPos[1] === agentPosition[1]) {
          events.wasBlocked = true;
        }

        agent.position = newPos;
        agent.lastMove = this.time;
      }
    });

    // Check shared collectibles
    const agentKey = `${agentPosition[0]},${agentPosition[1]}`;
    if (this.collectibles.has(agentKey)) {
      const collectible = this.collectibles.get(agentKey);
      if (
        !collectible.collected &&
        this.time - collectible.lastTaken > collectible.respawnTime
      ) {
        events.collectibleTaken = true;
        collectible.collected = true;
        collectible.lastTaken = this.time;
      }
    }
  }

  updateProceduralElements(maze, agentPosition, agentStats, events) {
    // Adjust difficulty based on performance
    const performanceRatio = agentStats.score / Math.max(1, agentStats.moves);
    if (performanceRatio > 0.8) {
      this.difficultyModifier += 0.1;
    } else if (performanceRatio < 0.3) {
      this.difficultyModifier = Math.max(0.5, this.difficultyModifier - 0.05);
    }

    // Generate new sections if agent explores far enough
    const sectionKey = `${Math.floor(agentPosition[0] / 10)},${Math.floor(
      agentPosition[1] / 10
    )}`;
    if (!this.generatedSections.has(sectionKey)) {
      this.generateNewSection(sectionKey, agentPosition);
      this.generatedSections.add(sectionKey);
    }
  }

  // Helper methods
  getRandomOpenPosition() {
    for (let attempts = 0; attempts < 50; attempts++) {
      const x = Math.floor(Math.random() * (this.height - 4)) + 2;
      const y = Math.floor(Math.random() * (this.width - 4)) + 2;

      // Check if position is not blocked by other elements
      const key = `${x},${y}`;
      if (
        !this.hazards.has(key) &&
        !this.food.has(key) &&
        !this.keys.has(key) &&
        !this.collectibles.has(key)
      ) {
        return [x, y];
      }
    }
    return null;
  }

  getRandomHazardType() {
    const types = ["spikes", "fire", "poison", "electricity", "ice"];
    return types[Math.floor(Math.random() * types.length)];
  }

  getRandomCollectibleType() {
    const types = ["gem", "coin", "powerup", "energy", "tool"];
    return types[Math.floor(Math.random() * types.length)];
  }

  getRandomStrategy() {
    const strategies = ["aggressive", "defensive", "greedy", "explorer"];
    return strategies[Math.floor(Math.random() * strategies.length)];
  }

  shouldHazardActivate(hazard) {
    switch (hazard.activePattern) {
      case 0:
        return true; // Always active
      case 1:
        return this.time % 10 < 3; // Periodic
      case 2:
        return Math.random() < 0.3; // Random
      default:
        return false;
    }
  }

  moveAgentTowardsGoal(agent, maze) {
    const goal = [this.height - 2, this.width - 2];
    const [x, y] = agent.position;
    const [gx, gy] = goal;

    const directions = [];
    if (gx > x) directions.push([1, 0]);
    if (gx < x) directions.push([-1, 0]);
    if (gy > y) directions.push([0, 1]);
    if (gy < y) directions.push([0, -1]);

    if (directions.length === 0) return agent.position;

    const [dx, dy] = directions[Math.floor(Math.random() * directions.length)];
    const newX = x + dx;
    const newY = y + dy;

    if (
      newX >= 0 &&
      newX < this.height &&
      newY >= 0 &&
      newY < this.width &&
      maze[newX][newY] === 0
    ) {
      return [newX, newY];
    }

    return agent.position;
  }

  generateNewSection(sectionKey, agentPosition) {
    // Add new challenges based on current difficulty
    const numNewElements = Math.floor(this.difficultyModifier * 3);

    for (let i = 0; i < numNewElements; i++) {
      const pos = this.getRandomOpenPosition();
      if (pos) {
        if (Math.random() < 0.4) {
          // Add hazard
          this.hazards.set(`${pos[0]},${pos[1]}`, {
            type: this.getRandomHazardType(),
            damage: Math.floor(15 * this.difficultyModifier),
            activePattern: Math.floor(Math.random() * 3),
            lastActivation: 0,
            isActive: false,
          });
        } else {
          // Add collectible
          this.collectibles.set(`${pos[0]},${pos[1]}`, {
            value: Math.floor(10 * this.difficultyModifier),
            type: this.getRandomCollectibleType(),
            collected: false,
          });
        }
      }
    }
  }

  // Get visual representation for rendering
  getVisualizationData(agentPosition, exploredCells = null) {
    const visualization = {
      movingWalls: this.movingWalls.map((w) => ({
        ...w,
        segments: this.getMovingWallCells(w),
      })),
      hazards: Array.from(this.hazards.entries()).map(([key, hazard]) => ({
        position: key.split(",").map(Number),
        ...hazard,
      })),
      collectibles: Array.from(this.collectibles.entries())
        .filter(([key, item]) => !item.collected)
        .map(([key, item]) => ({
          position: key.split(",").map(Number),
          ...item,
        })),
      rotatingSections: this.rotatingSections.map((s) => ({
        ...s,
        segments: this.getRotatingSectionCells(s),
      })),
      food: Array.from(this.food.entries())
        .filter(([key, food]) => this.time - food.lastTaken > food.respawnTime)
        .map(([key, food]) => ({
          position: key.split(",").map(Number),
          ...food,
        })),
      keys: Array.from(this.keys.entries())
        .filter(([key, keyItem]) => !keyItem.collected)
        .map(([key, keyItem]) => ({
          position: key.split(",").map(Number),
          ...keyItem,
        })),
      otherAgents: this.otherAgents,
    };

    // Filter based on fog of war
    if (this.gameMode === "fog" && exploredCells) {
      Object.keys(visualization).forEach((key) => {
        if (Array.isArray(visualization[key])) {
          visualization[key] = visualization[key].filter((item) => {
            const [x, y] = item.position;
            const distance =
              Math.abs(x - agentPosition[0]) + Math.abs(y - agentPosition[1]);
            return (
              distance <= this.visionRadius || exploredCells.has(`${x},${y}`)
            );
          });
        }
      });
    }

    return visualization;
  }
}
