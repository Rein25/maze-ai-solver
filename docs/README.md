# AI Maze Solver — Documentation

This repository contains a React + Vite web app that generates mazes and trains AI agents to solve them using reinforcement learning. It supports multiple game modes (classic, dynamic, competitive, fog-of-war, survival, procedural) and three agent types: Q-Learning, Hybrid, and Neural.

Use this README for quick start. See the other docs for user details, technical deep-dives, and troubleshooting.

## Quick start

1. Install and run

   - Node 18+ recommended
   - Install dependencies and start the dev server
   - The app opens in your browser; use the controls panel to generate mazes, pick a mode, and start training

2. Basic flow

- Pick Game Mode and Agent Type
- Generate Maze
  - Optionally tune Exploration (ε): set Start, End, Horizon in Controls, or toggle Auto-tune ε
- Start Training or step manually
- Observe stats and neural activity panel

3. Where to next
   - User guide: docs/UserGuide.md
   - Technical overview: docs/TechnicalOverview.md
   - Learning and AI details: docs/AI_and_Learning.md
   - Game modes: docs/GameModes.md

- Troubleshooting: docs/Troubleshooting.md (common stagnation fixes, epsilon tips)

## Project layout

- src/
  - App.jsx — app shell, training loop, wiring
  - components/
    - Maze.jsx, Maze.css — rendering the maze and dynamic elements
    - Controls.jsx — UI controls
    - Statistics.jsx — stats display
    - NeuralNetworkPanel.jsx — neural activity panel
  - ai/
    - QLearningAgent.js — tabular Q-learning agent
    - HybridMazeAgent.js — Q-learning + heuristics
    - NeuralMazeAgent.js — function-approximation RL (linear Q head)
    - EnhancedGameModes.js — game mode definitions, rewards, agent state
    - DynamicMazeElements.js — moving/rotating elements, hazards, items
    - FastMazeSolver.js — fast pathfinding utilities
  - utils/mazeGenerator.js — maze generation + A\* solution

---

For details on how each piece works and how to operate the app, see the dedicated docs in this folder.
