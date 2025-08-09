# AI and Learning Details

This document explains how the agents learn, what the rewards mean, and how exploration/exploitation is managed.

## Learning signals (rewards)

- Base movement cost (slight negative) to encourage efficiency
- Energy cost: small penalty proportional to action cost
- Goal progress: large positive reward when moving closer; larger near the goal
- Stagnation: escalating penalty if not making progress
- Mode-specific bonuses/penalties:
  - Fog: new cells and frontier areas are rewarded
  - Survival: food/keys/items rewarded, traps penalized
  - Competitive: collectibles rewarded; being blocked penalized
  - Dynamic: adapting to maze changes rewarded; collisions penalized
- Terminal:
  - +100 for reaching the goal (plus efficiency bonus)
  - -100 if health/energy reaches 0

## State representation

- Position, resources (health, energy, oxygen)
- Local 5x5 tile view: -1 (out-of-bounds), 0/1 (path/wall), 0.5 (unknown in fog)
- Goal direction (dx, dy)
- Inventory/abilities flags
- Temporal info: time-alive normalized, stepsWithoutProgress
- Dynamic summary (moving walls, other agents)

## Exploration vs exploitation (ε-greedy)

- ε starts high in fog/dynamic to map the environment, then decays aggressively.
- UI-configurable schedule: choose Start ε, End ε, and Horizon; the app computes a monotonic per-episode decay d so that ε_t ≈ Start × d^t, with d clamped to [0.90, 0.9999].
- The current ε is shown in Controls and in the Stats panel.
- Fog mode extra safety:
  - Very strong goal-seeking bias (distance-to-goal weight increased).
  - Minimal randomness (~5%) after initial episodes to avoid dithering.
  - Anti-stagnation penalties discourage loops and rapid revisits.

Auto epsilon scheduler (optional)

- A lightweight online tuner adjusts ε/decay per-environment:
  - Seeds defaults per mode/size (e.g., fog: start 0.95/decay 0.98).
  - After each episode, if success ≥ 80%, it accelerates decay and nudges ε downward; if success ≤ 10%, it bumps ε up and relaxes decay.
  - Keeps ε_min near a mode-specific target (classic ~0.05, fog ~0.1) and clamps decay to [0.90, 0.9999].

Invalid-move learning

- Traditional agents (QLearning/Hybrid) no longer end an episode on an invalid move; they receive the penalty via reward shaping and continue. This preserves momentum and helps escape the start.

## Function approximation (Neural)

- Linear Q head per action:
  - Q(s, a) = w_a · s + b_a
  - Update: Δw = α _ (target - Q) _ s; Δb = α \* (target - Q)
- Target: r + γ max_a' Q(s', a') (if not terminal), else r
- Why linear works here:
  - Reward shaping and compact features make the mapping near-linear locally
  - It’s fast, avoids instability from deep nets without TF.js, and still learns patterns

Anti-stagnation mechanics (neural and hybrid modes)

- Revisit penalties: recent positions carry a growing penalty to prevent orbiting.
- First-visit bonuses: encourage exploring unseen cells, especially in fog.
- Goal-seeking: action scores prioritize moves that reduce Manhattan distance to the goal.
- Episode caps: tiny mazes cap max steps to prevent thrashing.

## What “learning” looks like in the app

- Avg Reward: should trend up after the first few episodes
- Epsilon: decays to favor exploitation
- Episode Lengths: typically go down over time if policies improve
- Paths: more direct trajectories with fewer loops

## Common pitfalls and mitigations

- Agent stuck near start: strong goal bias + anti-stagnation + fog bonuses
- Rewards flat at 0 early: we show running score until enough episodes exist
- Teleporting walls confusion: we render full occupied segments and block movement into them

## Tuning knobs

- EnhancedGameModes.calculateReward: tweak shaping weights
- NeuralMazeAgent: adjust ε, decay, α (learningRate), γ
- Training speed and maze size in Controls
