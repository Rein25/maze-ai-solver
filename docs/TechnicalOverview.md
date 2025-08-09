# Technical Overview

This document explains how the app is structured and how the systems interact.

## Architecture

- React + Vite front end
- Components: Maze (grid render), Controls (UI), Statistics, NeuralNetworkPanel
- AI Layer (src/ai): three agents plus environment abstractions
- Game Modes: defined in EnhancedGameModes with per-mode reward shaping
- Dynamic Elements: moving walls, rotating sections, hazards/items, opponents

## Data flow

- App.jsx orchestrates the loop:
  1. Build/Reset agent when maze size, mode, or type changes (ε schedule passed from Controls or Auto-tune)
  2. On each training tick: get state → select action → execute → update env → get reward → store experience → train (neural)
  3. Invalid moves do not hard-end episodes for traditional agents; they still train on the transition.
  4. If terminal → finish episode, update stats, optionally tune ε/decay via AutoEpsilonScheduler, reset

## Agents

### QLearningAgent

- Tabular Q(s, a) with ε-greedy policy
- Good for small/static mazes

### HybridMazeAgent

- Q-learning + heuristics (distance-to-goal bias)
- Slightly more robust for larger mazes

### NeuralMazeAgent

- Function approximation RL using a simple linear Q head per action
  - Q(s, a) = w_a · s + b_a
  - Experience replay with mini-batches
  - Temporal-difference target: r + γ max_a' Q(s', a')
  - Gradient update: w*a += α * (target - Q) \_ s; b_a += α \* (target - Q)
- Why a linear head?
  - Stable, fast to train in-browser without external libs
  - Easy to visualize and reason about
  - Works well with shaped rewards and compact features for small mazes
- State vector
  - Position, resources, 5x5 local view
  - Goal direction, inventory/abilities
  - Temporal metrics (time alive, stagnation)
  - Dynamic context (moving walls/agents summarized)

## Game modes and rewards

- EnhancedAgentState.calculateReward shapes signals:
  - Movement cost, energy cost
  - Progress toward goal (generous positive shaping)
  - Stagnation penalty (escalates)
  - Mode bonuses:
    - Fog: discovery and frontier-exploration bonuses
    - Survival: items and trap effects
    - Competitive: collectibles and blocking events
    - Dynamic: adapting to changes; penalty for being caught by moving walls
  - Terminal rewards: +100 for reaching goal; -100 for death

## Dynamic environment

- DynamicMazeElements
  - Moving walls: direction, speed, length; segments computed each tick
  - Rotating sections: center, radius, 90° step rotation; ring cells computed
  - isBlocked(x, y): agent cannot move into a dynamically occupied cell
  - getVisualizationData(): exposes segments for rendering in Maze.jsx

## Action selection

- selectAction()
  - For Fog/Survival/Competitive: hybridGoalSeekingExploration() strongly biases goal progress with anti-stagnation
  - Otherwise: ε-greedy over predictBestAction()

## Training loop (neural)

- executeAction(): update env → reward → accumulate into episode score → store experience
- trainOnBatch(): sample mini-batch → compute TD targets → update linear head
- finishEpisode(): push episode-level metrics and trim histories

## Performance considerations

- Aggressive ε decay for fog/dynamic to converge faster; UI ε schedule with safe clamp in classic or optional auto-tuner per environment
- Deterministic goal-seeking in fog mode (randomness limited)
- Linear function approximator is fast and stable for the browser

## Extending the system

- Swap the linear head with TF.js MLP: replace forwardPass/updateWeights
- Add prioritized replay: sort/sampler by TD error
- Add curriculum: vary maze size/difficulty with success rate
