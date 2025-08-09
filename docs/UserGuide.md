# User Guide

This is a how-to for using the AI Maze Solver app.

## 1. Launching the app

- Start the dev server and open the app in your browser.
- The UI is split into: Controls (left), Maze view (center), Stats + Neural Network Panel (right).

## 2. Generating a maze

- Choose a size. Larger mazes increase difficulty.
- Click "Generate Maze". The start is at (1,1), the goal is bottom-right.

## 3. Picking a game mode

- Classic: Static maze.
- Dynamic: Moving/rotating walls, you must adapt in real time.
- Competitive: Other agents move and compete for items.
- Fog of War: Limited vision; exploration matters.
- Survival: Health/Energy with hazards and items.
- Procedural: Infinite sections; difficulty adapts with performance.

## 4. Choosing an agent type

- Q-Learning: Tabular learner, best for classic/smaller mazes.
- Hybrid: Mix of Q-learning + heuristics; good balance for larger static mazes.
- Neural: Reinforcement learning with function approximation; required for complex modes.

## 5. Training controls

- Start Training: Runs continuous training steps at chosen speed.
- Stop Training: Pauses training.
- Single Step: Steps the agent once.
- Show Solution: Toggle optimal path (if available) overlay.
- Reset Stats: Clears agent metrics; for Neural agent it resets episode history.

### Exploration (epsilon, ε) controls

- Start ε: initial exploration rate at episode 0.
- End ε: minimum exploration rate to decay toward.
- Horizon (episodes): how many episodes to reach End ε approximately.
- Effective decay: computed per-episode decay factor so that ε_t ≈ Start ε × decay^t, clamped for safety.

Auto-tune ε

- Toggle “Auto-tune ε” to let the app adapt ε and the decay rate to the current environment.
- It seeds sensible defaults per mode/size and then adjusts after each episode based on recent success rate and episode length.
- Manual Start/End/Horizon are disabled while auto-tune is on.

Guardrails

- Monotonic: End ε is forced ≤ Start ε; values clamped to 0–1.
- Decay clamped to [0.90, 0.9999] to avoid dropping too fast or not at all.
- Changes are disabled during training; stop training to edit.
- Reset Stats restores ε to Start ε for the tabular/Hybrid/Neural agents.

Notes

- In Fog of War, the Neural agent uses mode-specific ε defaults that may override the UI for better early exploration.
- For tiny classic mazes, Hybrid or Q-Learning with Start ε ≈ 0.5–0.7 and Horizon 50–150 usually works well.

## 6. Reading the maze view

- Yellow circle = agent; green = start; red = end.
- Purple cells = agent path. Cyan = solution path (if shown).
- Dynamic:
  - Brown shimmering cells = moving walls (rendered in segments)
  - Rotating rings = rotating sections (also brown)
  - Red/orange = hazards; gold = collectibles; light-red rounded = opponents
- Fog of War: Dark cells are unexplored.

## 7. Stats and neural panel

- Epsilon: current exploration rate (neural).
- Avg Reward: average reward over recent episodes (or running total early).
- Loss Trend: proxy for learning stability.
- Exploration: shows epsilon decay over time.
- Neural panel: displays activity overview and simple connectivity visuals; it’s a conceptual visualization for the linear head in this build.

## 8. Tips

- For Fog/Dynamic/Survival, use Neural.
- If the agent seems stuck, reset stats and regenerate the maze.
- Training speed can be increased for large mazes and complex modes.

## 9. Troubleshooting

- Avg reward stuck at 0: make sure you selected Neural and started training; early episodes now display running score until enough history exists.
- Dynamic walls teleport: the app now renders full wall segments and rotating rings; ensure you regenerated the maze after switching modes.
- Performance: Reduce maze size or speed up training. Fog uses aggressive goal-seeking to escape the start.
