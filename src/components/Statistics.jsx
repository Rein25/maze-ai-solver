import "./Statistics.css";

const Statistics = ({ stats, gameStatus }) => {
  const formatNumber = (num) => {
    if (typeof num !== "number") return "0";
    return num.toLocaleString();
  };

  const getStatusColor = () => {
    switch (gameStatus) {
      case "won":
        return "#10b981";
      case "lost":
        return "#ef4444";
      case "playing":
        return "#fbbf24";
      default:
        return "#6b7280";
    }
  };

  const getStatusText = () => {
    switch (gameStatus) {
      case "won":
        return "Victory!";
      case "lost":
        return "Game Over";
      case "playing":
        return "Playing...";
      default:
        return "Ready";
    }
  };

  return (
    <div className="statistics-container">
      <div className="stats-header">
        <h2>AI Training Statistics</h2>
        <div
          className="game-status"
          style={{ backgroundColor: getStatusColor() }}
        >
          {getStatusText()}
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card primary">
          <div className="stat-icon">🎮</div>
          <div className="stat-content">
            <div className="stat-value">{formatNumber(stats.gamesPlayed)}</div>
            <div className="stat-label">Games Played</div>
          </div>
        </div>

        <div className="stat-card success">
          <div className="stat-icon">🏆</div>
          <div className="stat-content">
            <div className="stat-value">{stats.successRate}%</div>
            <div className="stat-label">Success Rate</div>
          </div>
        </div>

        <div className="stat-card info">
          <div className="stat-icon">🎯</div>
          <div className="stat-content">
            <div className="stat-value">{stats.epsilon.toFixed(3)}</div>
            <div className="stat-label">Epsilon (Exploration)</div>
            <div className="stat-description">
              Higher = more exploration, Lower = more exploitation
            </div>
          </div>
        </div>

        <div className="stat-card info">
          <div className="stat-icon">⚡</div>
          <div className="stat-content">
            <div className="stat-value">{stats.gamma.toFixed(2)}</div>
            <div className="stat-label">Gamma (Discount)</div>
            <div className="stat-description">
              How much the AI values future rewards
            </div>
          </div>
        </div>

        {stats.currentStrategy && (
          <div className="stat-card primary">
            <div className="stat-icon">
              {stats.currentStrategy === "pathfinding" ? "🚀" : "🧠"}
            </div>
            <div className="stat-content">
              <div className="stat-value">
                {stats.currentStrategy === "pathfinding"
                  ? "Pathfinding"
                  : "Q-Learning"}
              </div>
              <div className="stat-label">Current Strategy</div>
              <div className="stat-description">
                {stats.currentStrategy === "pathfinding"
                  ? "Using optimal pathfinding algorithms"
                  : "Learning through reinforcement"}
              </div>
            </div>
          </div>
        )}

        {stats.pathfindingTime !== undefined && stats.pathfindingTime > 0 && (
          <div className="stat-card success">
            <div className="stat-icon">⏱️</div>
            <div className="stat-content">
              <div className="stat-value">
                {stats.pathfindingTime.toFixed(2)}ms
              </div>
              <div className="stat-label">Pathfinding Time</div>
              <div className="stat-description">
                Time spent calculating optimal paths
              </div>
            </div>
          </div>
        )}

        <div className="stat-card neutral">
          <div className="stat-icon">📊</div>
          <div className="stat-content">
            <div className="stat-value">{stats.avgMoves}</div>
            <div className="stat-label">Average Moves</div>
          </div>
        </div>

        <div className="stat-card neutral">
          <div className="stat-icon">🔧</div>
          <div className="stat-content">
            <div className="stat-value">{formatNumber(stats.qTableSize)}</div>
            <div className="stat-label">Q-Table Size</div>
            <div className="stat-description">
              Number of learned state-action pairs
            </div>
          </div>
        </div>

        <div className="stat-card warning">
          <div className="stat-icon">⬇️</div>
          <div className="stat-content">
            <div className="stat-value">{formatNumber(stats.minMoves)}</div>
            <div className="stat-label">Best (Fewest Moves)</div>
          </div>
        </div>

        <div className="stat-card danger">
          <div className="stat-icon">⬆️</div>
          <div className="stat-content">
            <div className="stat-value">{formatNumber(stats.maxMoves)}</div>
            <div className="stat-label">Worst (Most Moves)</div>
          </div>
        </div>
      </div>

      <div className="progress-section">
        <div className="progress-item">
          <div className="progress-header">
            <span>Exploration vs Exploitation</span>
            <span>{(stats.epsilon * 100).toFixed(1)}% exploring</span>
          </div>
          <div className="progress-bar">
            <div
              className="progress-fill exploration"
              style={{ width: `${stats.epsilon * 100}%` }}
            ></div>
          </div>
        </div>

        {stats.gamesPlayed > 0 && (
          <div className="progress-item">
            <div className="progress-header">
              <span>Success Rate Progress</span>
              <span>{stats.successRate}%</span>
            </div>
            <div className="progress-bar">
              <div
                className="progress-fill success"
                style={{ width: `${Math.min(stats.successRate, 100)}%` }}
              ></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Statistics;
