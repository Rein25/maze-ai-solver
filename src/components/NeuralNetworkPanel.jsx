import { useEffect, useRef, useState } from "react";
import "./NeuralNetworkPanel.css";

const NeuralNetworkPanel = ({ stats, isNeuralAgent = false }) => {
  const canvasRef = useRef(null);
  const [networkData, setNetworkData] = useState({
    layers: [
      { name: "Input", nodes: 50, weights: [] },
      { name: "Spatial", nodes: 64, weights: [] },
      { name: "Temporal", nodes: 32, weights: [] },
      { name: "Strategic", nodes: 16, weights: [] },
      { name: "Output", nodes: 14, weights: [] },
    ],
    connections: [],
  });

  const [animationFrame, setAnimationFrame] = useState(0);

  useEffect(() => {
    if (!isNeuralAgent) return;

    // Simulate network weights updating based on stats
    const updateNetworkData = () => {
      const newNetworkData = { ...networkData };

      // Simulate weight updates based on training
      newNetworkData.layers = newNetworkData.layers.map(
        (layer, layerIndex) => ({
          ...layer,
          weights: Array.from({ length: layer.nodes }, (_, nodeIndex) => {
            // Simulate weights that change based on training progress
            const baseWeight = Math.sin(
              animationFrame * 0.1 + layerIndex * 0.5 + nodeIndex * 0.1
            );
            const trainingInfluence = stats.epsilon
              ? (1 - stats.epsilon) * 0.5
              : 0;
            const performanceInfluence = stats.avgReward
              ? Math.min(stats.avgReward / 100, 1) * 0.3
              : 0;

            return Math.max(
              -1,
              Math.min(1, baseWeight + trainingInfluence + performanceInfluence)
            );
          }),
        })
      );

      setNetworkData(newNetworkData);
    };

    updateNetworkData();

    const interval = setInterval(() => {
      setAnimationFrame((prev) => prev + 1);
    }, 100);

    return () => clearInterval(interval);
  }, [stats, isNeuralAgent, animationFrame]);

  useEffect(() => {
    if (!isNeuralAgent) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    const { width, height } = canvas;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Set up drawing parameters
    const layerSpacing = width / (networkData.layers.length + 1);
    const maxNodes = Math.max(...networkData.layers.map((l) => l.nodes));

    // Draw connections between layers
    for (let i = 0; i < networkData.layers.length - 1; i++) {
      const currentLayer = networkData.layers[i];
      const nextLayer = networkData.layers[i + 1];

      const currentX = layerSpacing * (i + 1);
      const nextX = layerSpacing * (i + 2);

      // Sample some connections to avoid visual clutter
      const connectionSample = Math.min(5, currentLayer.nodes);

      for (let j = 0; j < connectionSample; j++) {
        const currentNodeIndex = Math.floor(
          (j / connectionSample) * currentLayer.nodes
        );
        const currentY =
          (height / (currentLayer.nodes + 1)) * (currentNodeIndex + 1);

        for (let k = 0; k < Math.min(3, nextLayer.nodes); k++) {
          const nextNodeIndex = Math.floor((k / 3) * nextLayer.nodes);
          const nextY = (height / (nextLayer.nodes + 1)) * (nextNodeIndex + 1);

          // Get weight value for connection strength
          const weight = currentLayer.weights[currentNodeIndex] || 0;
          const opacity = Math.abs(weight) * 0.7 + 0.1;
          const color =
            weight > 0
              ? `rgba(74, 222, 128, ${opacity})`
              : `rgba(248, 113, 113, ${opacity})`;

          ctx.strokeStyle = color;
          ctx.lineWidth = Math.abs(weight) * 2 + 0.5;
          ctx.beginPath();
          ctx.moveTo(currentX, currentY);
          ctx.lineTo(nextX, nextY);
          ctx.stroke();
        }
      }
    }

    // Draw nodes
    networkData.layers.forEach((layer, layerIndex) => {
      const x = layerSpacing * (layerIndex + 1);
      const nodeSpacing = height / (layer.nodes + 1);

      // Sample nodes to display (max 10 per layer for visual clarity)
      const nodesToShow = Math.min(10, layer.nodes);
      const nodeStep = layer.nodes / nodesToShow;

      for (let nodeIndex = 0; nodeIndex < nodesToShow; nodeIndex++) {
        const actualNodeIndex = Math.floor(nodeIndex * nodeStep);
        const y = nodeSpacing * (nodeIndex + 1) * (10 / nodesToShow);

        const weight = layer.weights[actualNodeIndex] || 0;
        const nodeSize = 8 + Math.abs(weight) * 4;

        // Node activation color
        const activation = Math.abs(weight);
        const color =
          weight > 0
            ? `hsl(120, 70%, ${50 + activation * 30}%)`
            : `hsl(0, 70%, ${50 + activation * 30}%)`;

        // Draw node
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(x, y, nodeSize, 0, 2 * Math.PI);
        ctx.fill();

        // Add glow effect
        ctx.shadowColor = color;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(x, y, nodeSize, 0, 2 * Math.PI);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Add node border
        ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(x, y, nodeSize, 0, 2 * Math.PI);
        ctx.stroke();
      }
    });

    // Draw layer labels
    ctx.fillStyle = "white";
    ctx.font = "12px Arial";
    ctx.textAlign = "center";

    networkData.layers.forEach((layer, layerIndex) => {
      const x = layerSpacing * (layerIndex + 1);
      ctx.fillText(layer.name, x, 20);
      ctx.fillText(`${layer.nodes} nodes`, x, height - 10);
    });
  }, [networkData, isNeuralAgent]);

  if (!isNeuralAgent) {
    return (
      <div className="neural-panel-placeholder">
        <div className="placeholder-content">
          <h4>🧠 Neural Network Visualization</h4>
          <p>
            Switch to Neural Network agent to see real-time network activity
          </p>
          <div className="placeholder-stats">
            <div className="stat-item">
              <span>Algorithm:</span>
              <span>{stats.currentStrategy || "Traditional"}</span>
            </div>
            <div className="stat-item">
              <span>Performance:</span>
              <span>
                {stats.successRate ? `${stats.successRate.toFixed(1)}%` : "N/A"}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="neural-network-panel">
      <div className="panel-header">
        <h4>🧠 Neural Network Activity</h4>
        <div className="network-stats">
          <div className="stat-badge">
            <span className="stat-label">Epsilon:</span>
            <span className="stat-value">
              {stats.epsilon?.toFixed(3) || "0.000"}
            </span>
          </div>
          <div className="stat-badge">
            <span className="stat-label">Loss:</span>
            <span className="stat-value">
              {stats.avgLoss?.toFixed(4) || "0.0000"}
            </span>
          </div>
          <div className="stat-badge">
            <span className="stat-label">Memory:</span>
            <span className="stat-value">{stats.memorySize || 0}</span>
          </div>
        </div>
      </div>

      <div className="network-canvas-container">
        <canvas
          ref={canvasRef}
          width={400}
          height={300}
          className="network-canvas"
        />

        <div className="network-legend">
          <div className="legend-item">
            <div className="legend-color positive"></div>
            <span>Positive Weights</span>
          </div>
          <div className="legend-item">
            <div className="legend-color negative"></div>
            <span>Negative Weights</span>
          </div>
          <div className="legend-item">
            <div className="legend-color connection"></div>
            <span>Connections</span>
          </div>
        </div>
      </div>

      <div className="training-metrics">
        <div className="metric-row">
          <div className="metric">
            <span className="metric-label">Episode:</span>
            <span className="metric-value">{stats.episode || 0}</span>
          </div>
          <div className="metric">
            <span className="metric-label">Avg Reward:</span>
            <span className="metric-value">
              {stats.avgReward?.toFixed(2) || "0.00"}
            </span>
          </div>
          <div className="metric">
            <span className="metric-label">Training:</span>
            <span
              className={`metric-value ${
                stats.isTraining ? "training" : "idle"
              }`}
            >
              {stats.isTraining ? "Active" : "Idle"}
            </span>
          </div>
        </div>

        <div className="metric-row">
          <div className="metric">
            <span className="metric-label">Total Steps:</span>
            <span className="metric-value">{stats.totalSteps || 0}</span>
          </div>
          <div className="metric">
            <span className="metric-label">Exploration:</span>
            <span className="metric-value">
              {((stats.epsilon || 0) * 100).toFixed(1)}%
            </span>
          </div>
          <div className="metric">
            <span className="metric-label">Game Mode:</span>
            <span className="metric-value">{stats.gameMode || "classic"}</span>
          </div>
        </div>

        {/* Progress Indicators */}
        <div className="progress-section">
          <h5>🎯 Learning Progress</h5>

          {stats.gameMode === "fog" && (
            <div className="learning-info">
              <p>
                🌫️ <strong>Fog of War Mode:</strong> The agent can only see a
                limited area and must learn to explore efficiently. Initial
                exploration may seem random, but it becomes more strategic as
                learning progresses.
              </p>
              <p>
                ⏱️ <strong>Expected Timeline:</strong> ~10-20 episodes to
                develop basic exploration, ~30-50 episodes for efficient
                navigation.
              </p>
            </div>
          )}

          <div className="progress-item">
            <div className="progress-header">
              <span className="progress-label">Exploration Strategy</span>
              <span className="progress-percentage">
                {((stats.explorationProgress || 0) * 100).toFixed(0)}%
              </span>
            </div>
            <div className="progress-bar">
              <div
                className="progress-fill exploration"
                style={{ width: `${(stats.explorationProgress || 0) * 100}%` }}
              ></div>
            </div>
            <div className="progress-description">
              {stats.explorationProgress > 0.8
                ? "🎯 Focused exploration"
                : stats.explorationProgress > 0.5
                ? "🔍 Learning patterns"
                : "🌀 Random exploration"}
            </div>
          </div>

          <div className="progress-item">
            <div className="progress-header">
              <span className="progress-label">Learning Maturity</span>
              <span className="progress-percentage">
                {((stats.learningProgress || 0) * 100).toFixed(0)}%
              </span>
            </div>
            <div className="progress-bar">
              <div
                className="progress-fill learning"
                style={{ width: `${(stats.learningProgress || 0) * 100}%` }}
              ></div>
            </div>
            <div className="progress-description">
              {stats.learningProgress > 0.8
                ? "🧠 Expert level"
                : stats.learningProgress > 0.4
                ? "📚 Intermediate"
                : "🌱 Beginner"}
            </div>
          </div>

          {stats.gameMode === "fog" && (
            <div className="progress-item">
              <div className="progress-header">
                <span className="progress-label">Exploration Efficiency</span>
                <span className="progress-percentage">
                  {((stats.explorationEfficiency || 0) * 100).toFixed(1)}%
                </span>
              </div>
              <div className="progress-bar">
                <div
                  className="progress-fill efficiency"
                  style={{
                    width: `${Math.min(
                      100,
                      (stats.explorationEfficiency || 0) * 500
                    )}%`,
                  }}
                ></div>
              </div>
              <div className="progress-description">
                {stats.explorationEfficiency > 0.3
                  ? "⚡ Efficient explorer"
                  : stats.explorationEfficiency > 0.1
                  ? "🚶 Making progress"
                  : "🔄 Finding direction"}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NeuralNetworkPanel;
