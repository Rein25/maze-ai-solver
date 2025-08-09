# Troubleshooting

## Auto-tune ε

- If you don’t want to set ε manually, enable “Auto-tune ε” in Controls.
- The app adapts ε and its decay based on recent success rate and episode length, with safe clamps.

## Agent stagnates near the start

- Ensure exploration (ε) is decaying: set Start ε ~0.5–0.7, End ε ~0.05–0.1, Horizon 50–150.
- Stop training and Reset Stats to reapply Start ε.
- For tiny classic mazes, prefer Hybrid or Q-Learning over Neural for fastest convergence.
- In Fog mode, let the default fog-specific ε/decay take effect for the first runs.

## Average reward flat or zero

- Early episodes show running score until enough history is collected; keep training.
- Increase End ε slightly (e.g., 0.08) if policy collapses into deterministic loops too soon.

## Dynamic walls seem to teleport

- Regenerate the maze after switching to Dynamic mode; the renderer shows full segments and rings.
- Movement into dynamically occupied cells is blocked by physics.

## Performance issues

- Use Ultra Fast training speed for large mazes/complex modes.
- Reduce maze size or switch to Hybrid for static large mazes (fast pathfinding).

## Reset behavior

- Reset Stats restores ε to Start ε for the current agent.
- Changing ε in Controls applies to the current agent immediately for ongoing episodes and on next reset.
