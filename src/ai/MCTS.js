// Minimal, generic MCTS for grid mazes (classic). No external deps.
// Usage: mctsPlan({ state, maze, validActionsFn, stepFn, evaluateFn, budgetMs, maxDepth, c })

export function mctsPlan({
  state,
  maze,
  validActionsFn,
  stepFn,
  evaluateFn,
  budgetMs = 30,
  maxDepth = 25,
  c = 1.4,
}) {
  const rootKey = keyOf(state);
  const N = new Map(); // visits per state
  const Na = new Map(); // visits per (state,action)
  const Q = new Map(); // total value per (state,action)

  const deadline = performance.now() + Math.max(5, budgetMs);

  while (performance.now() < deadline) {
    simulate(state, 0);
  }

  // Pick best action at root by mean value
  const actions = validActionsFn(state, maze);
  if (actions.length === 0) return 0;
  let bestA = actions[0];
  let bestV = -Infinity;
  for (const a of actions) {
    const q = getQ(rootKey, a);
    const n = getNa(rootKey, a);
    const v = n > 0 ? q / n : -Infinity;
    if (v > bestV) {
      bestV = v;
      bestA = a;
    }
  }
  return bestA;

  // --- helpers ---
  function simulate(s, depth) {
    const sKey = keyOf(s);
    if (depth >= maxDepth) {
      return evaluateFn(s, maze);
    }

    const actions = validActionsFn(s, maze);
    if (actions.length === 0) {
      return evaluateFn(s, maze);
    }

    // If unvisited state, expand with a rollout
    if (!N.has(sKey)) {
      N.set(sKey, 0);
      // One-step expansion: pick a random action and rollout
      const a = actions[(Math.random() * actions.length) | 0];
      const { nextState, reward, terminal } = stepFn(s, a, maze);
      const leafV = terminal ? reward : rollout(nextState, depth + 1);
      // Backpropagate
      addStats(sKey, a, leafV);
      return leafV;
    }

    // Select action by UCB
    const total = N.get(sKey) + 1e-9;
    let bestA = actions[0];
    let bestScore = -Infinity;
    for (const a of actions) {
      const q = getQ(sKey, a);
      const na = getNa(sKey, a);
      const mean = na > 0 ? q / na : 0;
      const ucb = mean + c * Math.sqrt(Math.log(total + 1) / (1 + na));
      if (ucb > bestScore) {
        bestScore = ucb;
        bestA = a;
      }
    }

    // Recurse
    const { nextState, reward, terminal } = stepFn(s, bestA, maze);
    const v = terminal ? reward : simulate(nextState, depth + 1);
    addStats(sKey, bestA, v);
    return v;
  }

  function rollout(s, depth) {
    let current = s;
    let d = depth;
    while (d < maxDepth) {
      const acts = validActionsFn(current, maze);
      if (acts.length === 0) break;
      const a = acts[(Math.random() * acts.length) | 0];
      const { nextState, reward, terminal } = stepFn(current, a, maze);
      if (terminal) return reward;
      current = nextState;
      d++;
    }
    return evaluateFn(current, maze);
  }

  function addStats(sKey, a, v) {
    const naKey = saKey(sKey, a);
    Na.set(naKey, getNa(sKey, a) + 1);
    Q.set(naKey, getQ(sKey, a) + v);
    N.set(sKey, (N.get(sKey) || 0) + 1);
  }

  function getNa(sKey, a) {
    return Na.get(saKey(sKey, a)) || 0;
  }
  function getQ(sKey, a) {
    return Q.get(saKey(sKey, a)) || 0;
  }
  function saKey(sKey, a) {
    return sKey + "|" + a;
  }
}

function keyOf(state) {
  // state is [x,y]
  return state[0] + "," + state[1];
}
