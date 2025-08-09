# Game Modes

## Classic

- Static maze navigation from start to goal
- Best with Q-Learning or Hybrid agents

## Dynamic Shifting Maze

- Moving walls (segment-based) and rotating sections (ring segments)
- Rewards:
  - +adaptation when environment changes
  - -penalty if caught by moving wall
- Recommended: Neural

## Competitive

- Other agents race and block for items
- Rewards for collectibles and tactical blocking
- Recommended: Neural

## Fog of War

- Limited vision; exploration memory required
- Rewards:
  - New cell discovery
  - Frontier exploration (unknown neighbors)
  - Strong goal progress bonuses with anti-stagnation
- Agent policy is heavily goal-seeking after initial episodes
- Exploration (ε): starts very high and decays aggressively; UI settings may be overridden by fog-specific defaults for stability

## Survival

- Manage health and energy; hazards and consumables present
- Rewards for food/keys; penalties for traps and low resources
- Recommended: Neural

## Procedural (Infinite)

- Generates new sections as you explore; adjusts difficulty
- Recommended: Neural
