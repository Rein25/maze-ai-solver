import { useState, useEffect, useCallback, useRef } from "react";
import Maze from "./components/Maze";
import Statistics from "./components/Statistics";
import Controls from "./components/Controls";
import NeuralNetworkPanel from "./components/NeuralNetworkPanel";
import { generateMaze, findMazeSolution } from "./utils/mazeGenerator";
import { QLearningAgent } from "./ai/QLearningAgent";
import { HybridMazeAgent } from "./ai/HybridMazeAgent";
import { NeuralMazeAgent } from "./ai/NeuralMazeAgent";
import { GameModes } from "./ai/EnhancedGameModes";
import { AutoEpsilonScheduler } from "./ai/AutoEpsilonScheduler";
import "./App.css";

function App() {
  // Maze state
  const [maze, setMaze] = useState([]);
  const [mazeSize, setMazeSize] = useState(21);
  const [solution, setSolution] = useState([]);
  const [showSolution, setShowSolution] = useState(false);
  const [gameMode, setGameMode] = useState("classic"); // New game mode state
  const [agentType, setAgentType] = useState("hybrid"); // qlearning, hybrid, or neural

  // Agent state
  const agentRef = useRef(null);
  const [agentPosition, setAgentPosition] = useState([1, 1]);
  const [agentPath, setAgentPath] = useState([[1, 1]]);
  const [gameStatus, setGameStatus] = useState("idle"); // idle, playing, won, lost
  const [visualData, setVisualData] = useState(null); // For dynamic elements

  // Training state
  const [isTraining, setIsTraining] = useState(false);
  const [trainingSpeed, setTrainingSpeed] = useState(50); // Faster default for large mazes
  const [stats, setStats] = useState({
    gamesPlayed: 0,
    epsilon: 0.9,
    gamma: 0.95,
    avgMoves: 0,
    minMoves: 0,
    maxMoves: 0,
    successRate: 0,
    qTableSize: 0,
    currentStrategy: "qlearning",
    isLargeMaze: false,
    pathfindingTime: 0,
    gameMode: "classic",
    health: 100,
    energy: 100,
    score: 0,
    exploredCells: 0,
  });

  // Epsilon schedule state with safe defaults
  const [epsilonStart, setEpsilonStart] = useState(0.6);
  const [epsilonEnd, setEpsilonEnd] = useState(0.05);
  const [epsilonHorizon, setEpsilonHorizon] = useState(100);

  // Derived epsilonDecay for monotonic schedule: eps_t = max(end, start*decay^t)
  const epsilonDecay = (() => {
    const start = Math.min(1, Math.max(0, epsilonStart));
    const end = Math.min(start, Math.max(0, epsilonEnd));
    const horizon = Math.max(1, epsilonHorizon | 0);
    // Solve decay = (end/start)^(1/horizon) when end>0 else cap by 0.01 min
    const ratio =
      end > 0 && start > 0 ? end / start : 0.01 / Math.max(start, 0.01);
    const d = Math.pow(ratio, 1 / horizon);
    // Clamp to sane range [0.90, 0.9999] to avoid freezing or too abrupt decay
    return Math.min(0.9999, Math.max(0.9, d));
  })();

  // Auto-tune ε
  const [autoTuneEpsilon, setAutoTuneEpsilon] = useState(false);
  const schedulerRef = useRef(null);
  const [useMCTS, setUseMCTS] = useState(false);

  // Training interval ref
  const trainingIntervalRef = useRef(null);

  // Initialize maze and agent
  useEffect(() => {
    handleGenerateMaze();
  }, [mazeSize, gameMode, agentType]);

  // Training loop
  const trainingStep = useCallback(() => {
    if (!agentRef.current || !isTraining) return;

    const agent = agentRef.current;

    // Handle different agent types
    if (agent instanceof NeuralMazeAgent) {
      // Neural agent training step
      const currentState = agent.getState(maze);
      const action = agent.selectAction(currentState, maze);
      const result = agent.executeAction(action, maze);

      setAgentPosition([...result.position]);
      setAgentPath([...agent.agentState.path]);
      setVisualData(result.visualData);

      if (result.isTerminal) {
        if (result.isTerminal === "win") {
          setGameStatus("won");
        } else {
          setGameStatus("lost");
        }
        // Auto-tune epsilon based on episode summary
        if (autoTuneEpsilon && schedulerRef.current) {
          try {
            schedulerRef.current.onEpisodeEnd(agent, {
              win: result.isTerminal === "win",
              moves:
                agent.agentState?.steps ?? agent.agentState?.path?.length ?? 0,
              totalReward: agent.agentState?.score ?? 0,
            });
          } catch (_) {}
        }
        agent.finishEpisode(result.isTerminal);
        setStats(agent.getDetailedStats());

        setTimeout(() => {
          resetGame();
        }, 500);
      } else {
        setStats(agent.getDetailedStats());
      }
    } else {
      // Traditional agent training step
      const previousState = [...agent.position];
      const moveResult = agent.move(maze);

      if (moveResult.isValid) {
        setAgentPosition([...agent.position]);
        setAgentPath([...agent.path]);

        const trainingResult = agent.trainStep(
          maze,
          previousState,
          moveResult.action
        );

        if (trainingResult.isWin) {
          setGameStatus("won");
          if (autoTuneEpsilon && schedulerRef.current) {
            try {
              schedulerRef.current.onEpisodeEnd(agent, {
                win: true,
                moves: agent.moves,
                totalReward: 100,
              });
            } catch (_) {}
          }
          agent.finishGame(true);
          setStats(agent.getStats());

          setTimeout(() => {
            resetGame();
          }, 500);
        } else if (trainingResult.isGameOver) {
          setGameStatus("lost");
          if (autoTuneEpsilon && schedulerRef.current) {
            try {
              schedulerRef.current.onEpisodeEnd(agent, {
                win: false,
                moves: agent.moves,
                totalReward: -50,
              });
            } catch (_) {}
          }
          agent.finishGame(false);
          setStats(agent.getStats());

          setTimeout(() => {
            resetGame();
          }, 500);
        }
      } else {
        // Invalid move: train (penalize internally) and continue episode
        agent.trainStep(maze, previousState, moveResult.action);
        setStats(agent.getStats());
        // Keep status as playing; do not finishGame or reset here
      }
    }
  }, [maze, isTraining, gameMode]);

  // Start training interval
  useEffect(() => {
    if (isTraining && maze.length > 0) {
      trainingIntervalRef.current = setInterval(trainingStep, trainingSpeed);
    } else {
      if (trainingIntervalRef.current) {
        clearInterval(trainingIntervalRef.current);
      }
    }

    return () => {
      if (trainingIntervalRef.current) {
        clearInterval(trainingIntervalRef.current);
      }
    };
  }, [isTraining, trainingStep, trainingSpeed]);

  // Apply MCTS toggle to current agent without recreation
  useEffect(() => {
    const agent = agentRef.current;
    if (!agent) return;
    // Only relevant for traditional agents
    if (agent instanceof QLearningAgent || agent instanceof HybridMazeAgent) {
      agent.useMCTS = useMCTS;
    }
  }, [useMCTS]);

  const createAgent = (width, height, mode, type) => {
    // (Re)create scheduler on env changes
    schedulerRef.current = new AutoEpsilonScheduler({
      gameMode: mode,
      mazeSize: width,
      agentType: type,
    });
    // If auto-tune enabled, seed UI with defaults
    let tunedDecay = undefined;
    if (autoTuneEpsilon && schedulerRef.current) {
      const { start, end, decay } = schedulerRef.current.applyInitialDefaults();
      if (start !== undefined) setEpsilonStart(start);
      if (end !== undefined) setEpsilonEnd(end);
      tunedDecay = Math.min(0.9999, Math.max(0.9, decay));
    }
    if (mode !== "classic" || type === "neural") {
      // Use neural network agent for complex game modes
      agentRef.current = new NeuralMazeAgent(width, height, mode, {
        // Let agent pick sensible per-mode defaults; only pass gamma if needed
        gamma: 0.99,
        // Respect UI or auto-tuned ε (agent may override for fog)
        epsilon: epsilonStart,
        epsilonDecay: tunedDecay ?? epsilonDecay,
        epsilonMin: Math.min(epsilonEnd, 0.1),
      });
    } else if (type === "hybrid" || width > 31) {
      agentRef.current = new HybridMazeAgent(width, height, {
        epsilon: epsilonStart,
        epsilonDecay: tunedDecay ?? epsilonDecay,
        epsilonMin: epsilonEnd,
        useMCTS,
        mctsBudgetMs: 20,
        mctsDepth: 25,
      });
    } else {
      agentRef.current = new QLearningAgent(width, height, {
        epsilon: epsilonStart,
        epsilonDecay: tunedDecay ?? epsilonDecay,
        epsilonMin: epsilonEnd,
        useMCTS,
        mctsBudgetMs: 20,
        mctsDepth: 25,
      });
    }
  };

  const handleGenerateMaze = () => {
    // If training, pause safely, regenerate, then resume
    const wasTraining = isTraining;
    if (wasTraining) {
      if (agentRef.current) agentRef.current.stopTraining?.();
      setIsTraining(false);
    }

    const newMaze = generateMaze(mazeSize, mazeSize);
    const newSolution = findMazeSolution(newMaze);

    setMaze(newMaze);
    setSolution(newSolution || []);

    // Create appropriate agent based on game mode and agent type
    createAgent(mazeSize, mazeSize, gameMode, agentType);

    resetGame();

    // Update training speed based on maze size and game mode
    if (gameMode !== "classic" || agentType === "neural" || mazeSize > 51) {
      setTrainingSpeed(1); // Ultra fast for complex modes and very large mazes
    } else if (mazeSize > 31) {
      setTrainingSpeed(10); // Very fast for large mazes
    }

    // Auto-resume if it was training
    if (wasTraining) {
      // Next tick: start training again
      setTimeout(() => {
        if (agentRef.current) agentRef.current.startTraining?.();
        setIsTraining(true);
        setGameStatus("playing");
      }, 0);
    }
  };
  const resetGame = () => {
    if (agentRef.current) {
      agentRef.current.reset();
      if (agentRef.current instanceof NeuralMazeAgent) {
        setAgentPosition([...agentRef.current.agentState.position]);
        setAgentPath([agentRef.current.agentState.position]);
      } else {
        setAgentPosition([1, 1]);
        setAgentPath([[1, 1]]);
      }
      setGameStatus("idle");
      setVisualData(null);
    }
  };

  const handleStartTraining = () => {
    if (agentRef.current) {
      agentRef.current.startTraining();
      setIsTraining(true);
      setGameStatus("playing");
    }
  };

  const handleStopTraining = () => {
    setIsTraining(false);
    if (agentRef.current) {
      agentRef.current.stopTraining();
    }
    setGameStatus("idle");
  };

  const handleSingleStep = () => {
    if (
      agentRef.current &&
      !isTraining &&
      gameStatus !== "won" &&
      gameStatus !== "lost"
    ) {
      setGameStatus("playing");

      const agent = agentRef.current;

      if (agent instanceof NeuralMazeAgent) {
        // Neural agent single step
        const currentState = agent.getState(maze);
        const action = agent.selectAction(currentState, maze);
        const result = agent.executeAction(action, maze);

        setAgentPosition([...result.position]);
        setAgentPath([...agent.agentState.path]);
        setVisualData(result.visualData);

        if (result.isTerminal) {
          if (result.isTerminal === "win") {
            setGameStatus("won");
          } else {
            setGameStatus("lost");
          }
        }
      } else {
        // Traditional agent single step
        const previousState = [...agent.position];
        const moveResult = agent.move(maze);

        if (moveResult.isValid) {
          setAgentPosition([...agent.position]);
          setAgentPath([...agent.path]);

          // Check win condition
          const goalX = maze.length - 2;
          const goalY = maze[0].length - 2;
          if (agent.position[0] === goalX && agent.position[1] === goalY) {
            setGameStatus("won");
          }
        } else {
          setGameStatus("lost");
        }
      }
    }
  };

  const handleResetStats = () => {
    if (agentRef.current) {
      if (agentRef.current.resetStats) {
        agentRef.current.resetStats();
      }
      if (agentRef.current instanceof NeuralMazeAgent) {
        setStats(agentRef.current.getDetailedStats());
      } else {
        setStats(agentRef.current.getStats());
      }
    }
    setIsTraining(false);
    resetGame();
  };

  const handleGameModeChange = (newMode) => {
    setGameMode(newMode);
    setIsTraining(false);
    // Regenerate maze with new game mode
    handleGenerateMaze();
  };

  const handleAgentTypeChange = (newType) => {
    setAgentType(newType);
    setIsTraining(false);
    // Regenerate maze with new agent type
    handleGenerateMaze();
  };

  const handleToggleSolution = () => {
    setShowSolution(!showSolution);
  };

  const handleMazeSizeChange = (newSize) => {
    setMazeSize(newSize);
    setIsTraining(false);
  };

  const handleTrainingSpeedChange = (newSpeed) => {
    setTrainingSpeed(newSpeed);
  };

  const handleToggleAutoTune = (checked) => {
    setAutoTuneEpsilon(checked);
    // Recreate agent to apply new schedule policy
    createAgent(mazeSize, mazeSize, gameMode, agentType);
  };

  // Handle epsilon configuration changes with guardrails and live application on next episode
  const handleEpsilonConfigChange = (partial) => {
    if (partial.epsilonStart !== undefined) {
      const v = Math.min(1, Math.max(0.05, partial.epsilonStart));
      setEpsilonStart(v);
    }
    if (partial.epsilonEnd !== undefined) {
      // End must be <= start; enforce after state updates by using current tentative start
      const start =
        partial.epsilonStart !== undefined
          ? Math.min(1, Math.max(0.05, partial.epsilonStart))
          : epsilonStart;
      const v = Math.min(start, Math.max(0, partial.epsilonEnd));
      setEpsilonEnd(v);
    }
    if (partial.epsilonHorizon !== undefined) {
      setEpsilonHorizon(Math.max(1, partial.epsilonHorizon | 0));
    }

    // If an agent exists, update its epsilon schedule immediately for current and future episodes
    if (agentRef.current) {
      const agent = agentRef.current;
      if (agent instanceof NeuralMazeAgent) {
        agent.epsilon = partial.epsilonStart ?? epsilonStart;
        agent.epsilonDecay = epsilonDecay;
        agent.epsilonMin = partial.epsilonEnd ?? epsilonEnd;
      } else {
        agent.epsilon = partial.epsilonStart ?? epsilonStart;
        agent.epsilonDecay = epsilonDecay;
        agent.epsilonMin = partial.epsilonEnd ?? epsilonEnd;
      }
    }
  };

  const handleSolveMazeInstantly = () => {
    if (agentRef.current && agentRef.current.getSolution) {
      const start = performance.now();
      const solution = agentRef.current.getSolution(maze);
      const end = performance.now();

      if (solution) {
        // Show the solution path
        setAgentPath(solution);
        setAgentPosition(solution[solution.length - 1]);
        setGameStatus("won");

        // Update stats
        agentRef.current.moves = solution.length - 1;
        agentRef.current.finishGame(true);
        setStats(agentRef.current.getStats());

        console.log(
          `Solved in ${(end - start).toFixed(2)}ms with ${
            solution.length - 1
          } moves`
        );
      }
    }
  };

  const handleBenchmarkAlgorithms = () => {
    if (agentRef.current && agentRef.current.benchmarkSolution) {
      const results = agentRef.current.benchmarkSolution(maze);
      console.log("Algorithm Benchmark Results:", results);

      // Show results in an alert for now (could be a modal in production)
      const resultText = results
        .map(
          (r) =>
            `${r.algorithm}: ${r.time.toFixed(2)}ms, ${r.pathLength} steps, ${
              r.found ? "Success" : "Failed"
            }`
        )
        .join("\n");

      alert(`Benchmark Results:\n\n${resultText}`);
    }
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>🧠 AI Maze Solver</h1>
        <p>
          Watch a Q-Learning agent learn to solve mazes through trial and error!
        </p>
      </header>

      <main className="app-main">
        <div className="app-layout">
          <div className="left-panel">
            <Maze
              maze={maze}
              agentPosition={agentPosition}
              agentPath={agentPath}
              solution={solution}
              showSolution={showSolution}
              isTraining={isTraining}
              gameStatus={gameStatus}
              gameMode={gameMode}
              visualData={visualData}
            />
          </div>

          <div className="right-panel">
            <Statistics stats={stats} gameStatus={gameStatus} />

            <NeuralNetworkPanel
              stats={stats}
              isNeuralAgent={agentType === "neural" || gameMode !== "classic"}
            />

            <Controls
              onGenerateMaze={handleGenerateMaze}
              onStartTraining={handleStartTraining}
              onStopTraining={handleStopTraining}
              onResetStats={handleResetStats}
              onSingleStep={handleSingleStep}
              onToggleSolution={handleToggleSolution}
              onSolveMazeInstantly={handleSolveMazeInstantly}
              onBenchmarkAlgorithms={handleBenchmarkAlgorithms}
              onAgentTypeChange={handleAgentTypeChange}
              onGameModeChange={handleGameModeChange}
              isTraining={isTraining}
              showSolution={showSolution}
              gameStatus={gameStatus}
              mazeSize={mazeSize}
              onMazeSizeChange={handleMazeSizeChange}
              trainingSpeed={trainingSpeed}
              onTrainingSpeedChange={handleTrainingSpeedChange}
              agentType={agentType}
              gameMode={gameMode}
              gameModes={GameModes}
              stats={stats}
              epsilonStart={epsilonStart}
              epsilonEnd={epsilonEnd}
              epsilonHorizon={epsilonHorizon}
              epsilonDecay={epsilonDecay}
              onEpsilonConfigChange={handleEpsilonConfigChange}
              autoTuneEpsilon={autoTuneEpsilon}
              onToggleAutoTune={handleToggleAutoTune}
              useMCTS={useMCTS}
              onToggleMCTS={setUseMCTS}
            />
          </div>
        </div>
      </main>

      {/* TODO: redirect this to the github repo */}
      <footer className="app-footer">
        <p>
          Built with ❤️ by Reinout.
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
          >
            {" "}
            View Source
          </a>
        </p>
      </footer>
    </div>
  );
}

export default App;
