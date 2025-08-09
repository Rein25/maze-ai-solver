import "./Maze.css";

const Maze = ({
  maze,
  agentPosition,
  agentPath,
  solution,
  showSolution,
  isTraining,
  gameStatus,
  gameMode = "classic",
  visualData = null,
}) => {
  const getCellClass = (row, col) => {
    const classes = ["cell"];

    // Wall or path
    if (maze[row][col] === 1) {
      classes.push("wall");
    } else {
      classes.push("path");
    }

    // Dynamic elements (for enhanced game modes)
    if (visualData && gameMode !== "classic") {
      // Moving walls (render all segments)
      if (visualData.movingWalls) {
        const onSegment = visualData.movingWalls.some((wall) =>
          (wall.segments || [wall.position]).some(
            (seg) => seg[0] === row && seg[1] === col
          )
        );
        if (onSegment) classes.push("moving-wall");
      }

      // Rotating sections (render occupied ring cells)
      if (visualData.rotatingSections) {
        const onRot = visualData.rotatingSections.some((sec) =>
          (sec.segments || []).some((seg) => seg[0] === row && seg[1] === col)
        );
        if (onRot) classes.push("moving-wall");
      }

      // Hazards
      if (
        visualData.hazards &&
        visualData.hazards.some(
          (hazard) => hazard.position[0] === row && hazard.position[1] === col
        )
      ) {
        classes.push("hazard");
      }

      // Collectibles
      if (
        visualData.collectibles &&
        visualData.collectibles.some(
          (item) => item.position[0] === row && item.position[1] === col
        )
      ) {
        const item = visualData.collectibles.find(
          (item) => item.position[0] === row && item.position[1] === col
        );
        classes.push("collectible", `collectible-${item.type}`);
      }

      // Other agents
      if (
        visualData.otherAgents &&
        visualData.otherAgents.some(
          (agent) => agent.position[0] === row && agent.position[1] === col
        )
      ) {
        classes.push("other-agent");
      }

      // Fog of war (unexplored areas)
      if (
        gameMode === "fog" &&
        visualData.exploredCells &&
        !visualData.exploredCells.has(`${row},${col}`)
      ) {
        classes.push("fog");
      }
    }

    // Start position
    if (row === 1 && col === 1) {
      classes.push("start");
    }

    // End position
    if (row === maze.length - 2 && col === maze[0].length - 2) {
      classes.push("end");
    }

    // Agent position
    if (agentPosition && agentPosition[0] === row && agentPosition[1] === col) {
      classes.push("agent");
      if (gameStatus === "won") classes.push("agent-won");
      if (gameStatus === "lost") classes.push("agent-lost");
    }

    // Agent path
    if (agentPath && agentPath.some(([r, c]) => r === row && c === col)) {
      classes.push("agent-path");
    }

    // Solution path
    if (
      showSolution &&
      solution &&
      solution.some(([c, r]) => r === row && c === col)
    ) {
      classes.push("solution-path");
    }

    return classes.join(" ");
  };

  return (
    <div className="maze-container">
      <div className="maze-header">
        <div className="maze-legend">
          <div className="legend-item">
            <div className="legend-color start"></div>
            <span>Start</span>
          </div>
          <div className="legend-item">
            <div className="legend-color end"></div>
            <span>End</span>
          </div>
          <div className="legend-item">
            <div className="legend-color agent"></div>
            <span>AI Agent</span>
          </div>
          <div className="legend-item">
            <div className="legend-color agent-path"></div>
            <span>AI Path</span>
          </div>
          {showSolution && (
            <div className="legend-item">
              <div className="legend-color solution-path"></div>
              <span>Solution</span>
            </div>
          )}
          {gameMode !== "classic" && (
            <>
              <div className="legend-item">
                <div className="legend-color moving-wall"></div>
                <span>Moving Wall</span>
              </div>
              <div className="legend-item">
                <div className="legend-color hazard"></div>
                <span>Hazard</span>
              </div>
              <div className="legend-item">
                <div className="legend-color collectible"></div>
                <span>Item</span>
              </div>
              {gameMode === "competitive" && (
                <div className="legend-item">
                  <div className="legend-color other-agent"></div>
                  <span>Opponent</span>
                </div>
              )}
              {gameMode === "fog" && (
                <div className="legend-item">
                  <div className="legend-color fog"></div>
                  <span>Unexplored</span>
                </div>
              )}
            </>
          )}
        </div>
        {isTraining && (
          <div className="training-indicator">
            <div className="training-spinner"></div>
            <span>Training in progress...</span>
          </div>
        )}
      </div>

      <div
        className="maze-grid"
        style={{
          gridTemplateColumns: `repeat(${maze[0]?.length || 1}, 1fr)`,
          maxWidth: maze.length > 50 ? "800px" : "auto",
          maxHeight: maze.length > 50 ? "800px" : "auto",
        }}
      >
        {maze.map((row, rowIndex) =>
          row.map((cell, colIndex) => (
            <div
              key={`${rowIndex}-${colIndex}`}
              className={getCellClass(rowIndex, colIndex)}
              style={{
                width:
                  maze.length > 100 ? "4px" : maze.length > 50 ? "8px" : "20px",
                height:
                  maze.length > 100 ? "4px" : maze.length > 50 ? "8px" : "20px",
                minWidth:
                  maze.length > 100 ? "4px" : maze.length > 50 ? "8px" : "20px",
                minHeight:
                  maze.length > 100 ? "4px" : maze.length > 50 ? "8px" : "20px",
              }}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default Maze;
