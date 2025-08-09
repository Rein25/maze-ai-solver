// AutoEpsilonScheduler: adapts epsilon and decay per-environment online
// Lightweight, in-browser heuristic tuner

export class AutoEpsilonScheduler {
  constructor({
    gameMode = "classic",
    mazeSize = 21,
    agentType = "hybrid",
  } = {}) {
    this.gameMode = gameMode;
    this.mazeSize = mazeSize;
    this.agentType = agentType;

    // Rolling metrics
    this.window = 20;
    this.history = []; // { win, moves, reward }

    // Mode targets
    this.targetEnd = this.getTargetEnd(gameMode);
    this.minDecay = 0.9;
    this.maxDecay = 0.9999;
  }

  getTargetEnd(mode) {
    switch (mode) {
      case "fog":
        return 0.1;
      case "dynamic":
      case "competitive":
      case "survival":
        return 0.08;
      default:
        return 0.05;
    }
  }

  applyInitialDefaults() {
    const isTiny = this.mazeSize <= 21;
    if (this.gameMode === "fog") {
      return { start: 0.95, end: 0.1, decay: 0.98 };
    }
    if (this.gameMode !== "classic") {
      return { start: 0.85, end: 0.08, decay: 0.992 };
    }
    if (isTiny) {
      return { start: 0.6, end: 0.05, decay: 0.97 };
    }
    return { start: 0.8, end: 0.05, decay: 0.99 };
  }

  recordEpisode(ep) {
    this.history.push({
      win: !!ep.win,
      moves: ep.moves ?? 0,
      reward: ep.reward ?? 0,
    });
    if (this.history.length > this.window) this.history.shift();
  }

  stats() {
    const h = this.history;
    const n = h.length || 1;
    const wins = h.filter((x) => x.win).length;
    const success = wins / n;
    const movesArr = h.map((x) => x.moves).filter((m) => m > 0);
    const medianMoves = movesArr.length
      ? movesArr.sort((a, b) => a - b)[Math.floor(movesArr.length / 2)]
      : 0;
    const avgReward = h.reduce((a, x) => a + (x.reward || 0), 0) / n;
    return { success, medianMoves, avgReward, n };
  }

  clampDecay(d) {
    return Math.min(this.maxDecay, Math.max(this.minDecay, d));
  }

  onEpisodeEnd(agent, epSummary) {
    this.recordEpisode({
      win: epSummary.win,
      moves: epSummary.moves,
      reward: epSummary.totalReward,
    });

    const { success, medianMoves } = this.stats();

    const eps = typeof agent.epsilon === "number" ? agent.epsilon : 0.8;
    const epsMin =
      typeof agent.epsilonMin === "number" ? agent.epsilonMin : this.targetEnd;
    let decay =
      typeof agent.epsilonDecay === "number" ? agent.epsilonDecay : 0.99;

    // 1) High success -> accelerate exploitation
    if (success >= 0.8 && this.history.length >= this.window / 2) {
      decay = this.clampDecay(decay * 0.97);
      agent.epsilon = Math.max(epsMin, eps * 0.9);
    }

    // 2) Low success & long episodes -> increase exploration
    if (success <= 0.1 && this.history.length >= this.window / 2) {
      const bump = this.gameMode === "fog" ? 0.05 : 0.1;
      agent.epsilon = Math.min(0.95, eps + bump);
      decay = this.clampDecay((decay + 1) / 2);
    }

    // 3) Keep epsilonMin near mode target
    agent.epsilonMin = Math.min(agent.epsilon, Math.max(0.01, this.targetEnd));

    // 4) Apply decay clamp and store
    agent.epsilonDecay = this.clampDecay(decay);

    return {
      epsilon: agent.epsilon,
      epsilonMin: agent.epsilonMin,
      epsilonDecay: agent.epsilonDecay,
      success,
      medianMoves,
    };
  }
}
