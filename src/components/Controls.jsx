import "./Controls.css";

const Controls = ({
  onGenerateMaze,
  onStartTraining,
  onStopTraining,
  onResetStats,
  onSingleStep,
  onToggleSolution,
  onSolveMazeInstantly,
  onBenchmarkAlgorithms,
  onAgentTypeChange,
  onGameModeChange,
  isTraining,
  showSolution,
  gameStatus,
  mazeSize,
  onMazeSizeChange,
  trainingSpeed,
  onTrainingSpeedChange,
  agentType,
  gameMode,
  gameModes,
  stats,
  // Epsilon configuration props
  epsilonStart,
  epsilonEnd,
  epsilonHorizon,
  epsilonDecay,
  onEpsilonConfigChange,
  autoTuneEpsilon,
  onToggleAutoTune,
  useMCTS,
  onToggleMCTS,
}) => {
  return (
    <div className="controls-container">
      <div className="controls-header">
        <h3>🎮 Game Controls</h3>
      </div>

      <div className="controls-grid">
        {/* Maze Controls Section */}
        <div className="control-section">
          <h4>🏗️ Game Configuration</h4>

          <div className="control-group">
            <label htmlFor="game-mode">Game Mode:</label>
            <select
              id="game-mode"
              value={gameMode}
              onChange={(e) => onGameModeChange(e.target.value)}
              className="control-select"
              disabled={isTraining}
            >
              {Object.entries(gameModes || {}).map(([key, mode]) => (
                <option key={key} value={key}>
                  {mode.emoji} {mode.name} ({mode.difficulty})
                </option>
              ))}
            </select>
            {gameMode && gameModes && gameModes[gameMode] && (
              <div className="mode-description">
                <p>{gameModes[gameMode].description}</p>
                <div className="mode-features">
                  <strong>Features:</strong>
                  <ul>
                    {gameModes[gameMode].features.map((feature, index) => (
                      <li key={index}>{feature}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>

          <div className="control-group">
            <label htmlFor="agent-type">AI Agent Type:</label>
            <select
              id="agent-type"
              value={agentType}
              onChange={(e) => onAgentTypeChange(e.target.value)}
              className="control-select"
              disabled={isTraining}
            >
              <option value="qlearning">Q-Learning (Small Mazes)</option>
              <option value="hybrid">Hybrid AI (Recommended)</option>
              <option value="neural">Neural Network (Complex Modes)</option>
            </select>
          </div>

          <div className="control-group">
            <label htmlFor="maze-size">Maze Size:</label>
            <select
              id="maze-size"
              value={mazeSize}
              onChange={(e) => onMazeSizeChange(parseInt(e.target.value))}
              className="control-select"
            >
              <option value={15}>Tiny (15x15)</option>
              <option value={21}>Small (21x21)</option>
              <option value={31}>Medium (31x31)</option>
              <option value={41}>Large (41x41)</option>
              <option value={51}>Very Large (51x51)</option>
              <option value={71}>Huge (71x71)</option>
              <option value={101}>Massive (101x101)</option>
              <option value={151}>Extreme (151x151)</option>
            </select>
          </div>

          <button
            className="control-button primary"
            onClick={onGenerateMaze}
          >
            🎲 Generate New Maze
          </button>

          <button
            className={`control-button ${showSolution ? "danger" : "info"}`}
            onClick={onToggleSolution}
          >
            {showSolution ? "🙈 Hide Solution" : "💡 Show Solution"}
          </button>

          {onSolveMazeInstantly && (
            <button
              className="control-button success"
              onClick={onSolveMazeInstantly}
              disabled={isTraining || gameStatus === "won"}
            >
              ⚡ Solve Instantly
            </button>
          )}

          {onBenchmarkAlgorithms && (
            <button
              className="control-button neutral"
              onClick={onBenchmarkAlgorithms}
              disabled={isTraining}
            >
              📊 Benchmark Algorithms
            </button>
          )}
        </div>

        {/* AI Training Controls Section */}
        <div className="control-section">
          <h4>🤖 AI Training</h4>
          <div className="control-group">
            <label htmlFor="training-speed">Training Speed:</label>
            <select
              id="training-speed"
              value={trainingSpeed}
              onChange={(e) => onTrainingSpeedChange(parseInt(e.target.value))}
              className="control-select"
            >
              <option value={1000}>Slow (1s per move)</option>
              <option value={500}>Normal (0.5s per move)</option>
              <option value={200}>Fast (0.2s per move)</option>
              <option value={50}>Very Fast (0.05s per move)</option>
              <option value={1}>Ultra Fast (No delay)</option>
            </select>
          </div>

          {/* Exploration settings with safe guardrails */}
          <div className="control-group">
            <label>Exploration (ε) Schedule:</label>
            <div className="epsilon-grid">
              <div
                className="epsilon-row"
                style={{ gridTemplateColumns: "1fr auto" }}
              >
                <span>Auto-tune ε</span>
                <label className="switch">
                  <input
                    type="checkbox"
                    checked={!!autoTuneEpsilon}
                    onChange={(e) => onToggleAutoTune(e.target.checked)}
                  />
                  <span className="slider" />
                </label>
              </div>
              <div
                className="epsilon-row"
                style={{ gridTemplateColumns: "1fr auto" }}
              >
                <span>Use MCTS planning</span>
                <label className="switch">
                  <input
                    type="checkbox"
                    checked={!!useMCTS}
                    onChange={(e) => onToggleMCTS(e.target.checked)}
                  />
                  <span className="slider" />
                </label>
              </div>
              <div className="epsilon-row">
                <span>Start ε:</span>
                <input
                  type="range"
                  min={0.05}
                  max={1}
                  step={0.01}
                  value={epsilonStart}
                  disabled={isTraining || autoTuneEpsilon}
                  onChange={(e) =>
                    onEpsilonConfigChange({
                      epsilonStart: parseFloat(e.target.value),
                    })
                  }
                />
                <span>{epsilonStart.toFixed(2)}</span>
              </div>
              <div className="epsilon-row">
                <span>End ε:</span>
                <input
                  type="range"
                  min={0}
                  max={0.5}
                  step={0.01}
                  value={epsilonEnd}
                  disabled={isTraining || autoTuneEpsilon}
                  onChange={(e) =>
                    onEpsilonConfigChange({
                      epsilonEnd: parseFloat(e.target.value),
                    })
                  }
                />
                <span>{epsilonEnd.toFixed(2)}</span>
              </div>
              <div className="epsilon-row">
                <span>Horizon (episodes):</span>
                <input
                  type="number"
                  min={1}
                  max={1000}
                  step={1}
                  value={epsilonHorizon}
                  disabled={isTraining || autoTuneEpsilon}
                  onChange={(e) =>
                    onEpsilonConfigChange({
                      epsilonHorizon: Math.max(
                        1,
                        parseInt(e.target.value) || 1
                      ),
                    })
                  }
                  className="number-input"
                />
              </div>
              <div className="epsilon-row small-text">
                <span>Effective decay per episode:</span>
                <span className="mono">{epsilonDecay.toFixed(4)}</span>
              </div>
              <div className="epsilon-note small-text">
                Monotonic decay is enforced. End ε ≤ Start ε and 0 ≤ ε ≤ 1.
              </div>
            </div>
          </div>

          <div className="button-group">
            {!isTraining ? (
              <button
                className="control-button success"
                onClick={onStartTraining}
                disabled={gameStatus === "won"}
              >
                🚀 Start Training
              </button>
            ) : (
              <button
                className="control-button warning"
                onClick={onStopTraining}
              >
                ⏹️ Stop Training
              </button>
            )}

            <button
              className="control-button neutral"
              onClick={onSingleStep}
              disabled={
                isTraining || gameStatus === "won" || gameStatus === "lost"
              }
            >
              👣 Single Step
            </button>
          </div>
        </div>

        {/* Game Status Section */}
        <div className="control-section">
          <h4>📊 Game Management</h4>
          <div className="status-display">
            <div className="status-item">
              <span className="status-label">Current Status:</span>
              <span className={`status-value ${gameStatus}`}>
                {gameStatus === "won" && "🏆 Victory!"}
                {gameStatus === "lost" && "💀 Game Over"}
                {gameStatus === "playing" && "🎯 Playing..."}
                {gameStatus === "idle" && "⏸️ Ready"}
              </span>
            </div>
            {stats.gameMode && (
              <div className="status-item">
                <span className="status-label">Game Mode:</span>
                <span className="status-value info">
                  {gameModes && gameModes[stats.gameMode]
                    ? `${gameModes[stats.gameMode].emoji} ${
                        gameModes[stats.gameMode].name
                      }`
                    : "Classic"}
                </span>
              </div>
            )}
            {stats.health !== undefined && (
              <div className="status-item">
                <span className="status-label">Health:</span>
                <span
                  className={`status-value ${
                    stats.health > 50
                      ? "success"
                      : stats.health > 20
                      ? "warning"
                      : "danger"
                  }`}
                >
                  ❤️ {stats.health}/100
                </span>
              </div>
            )}
            {stats.energy !== undefined && (
              <div className="status-item">
                <span className="status-label">Energy:</span>
                <span
                  className={`status-value ${
                    stats.energy > 50
                      ? "success"
                      : stats.energy > 20
                      ? "warning"
                      : "danger"
                  }`}
                >
                  ⚡ {stats.energy}/100
                </span>
              </div>
            )}
            {stats.score !== undefined && (
              <div className="status-item">
                <span className="status-label">Score:</span>
                <span className="status-value neutral">🏆 {stats.score}</span>
              </div>
            )}
            {stats.exploredCells !== undefined && (
              <div className="status-item">
                <span className="status-label">Explored:</span>
                <span className="status-value info">
                  🗺️ {stats.exploredCells} cells
                </span>
              </div>
            )}
          </div>

          <button className="control-button danger" onClick={onResetStats}>
            🔄 Reset All Stats
          </button>
        </div>
      </div>

      {/* Training Tips */}
      <div className="tips-section">
        <h4>💡 AI Performance Tips</h4>
        <ul className="tips-list">
          <li>
            🤖 Hybrid AI automatically switches between Q-Learning and A*
            pathfinding
          </li>
          <li>
            � Large mazes (50x50+) use fast pathfinding algorithms for instant
            solving
          </li>
          <li>
            🧠 Small mazes use Q-Learning to demonstrate machine learning
            concepts
          </li>
          <li>
            ⚡ Click "Solve Instantly" to see optimal pathfinding in action
          </li>
          <li>
            📊 Use "Benchmark Algorithms" to compare different solving methods
          </li>
          <li>
            🎯 Training speed auto-adjusts based on maze size for optimal
            performance
          </li>
        </ul>
      </div>
    </div>
  );
};

export default Controls;
