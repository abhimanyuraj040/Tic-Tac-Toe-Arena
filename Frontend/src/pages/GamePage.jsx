import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { io } from "socket.io-client";
import { updateMatchResult, getUserProfile } from "../services/userService";

const SOCKET_URL = typeof window !== "undefined" && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")
  ? "http://localhost:3000"
  : (import.meta.env.VITE_SOCKET_URL || "https://tic-tac-toe-arena.onrender.com");

const socket = io(SOCKET_URL, {
  withCredentials: true,
});

const Square = ({ value, onClick }) => (
  <button className="square" onClick={onClick}>
    {value}
  </button>
);

const Board = ({ board, onSquareClick }) => (
  <div className="board">
    {board.map((val, idx) => (
      <Square key={idx} value={val} onClick={() => onSquareClick(idx)} />
    ))}
  </div>
);

const GamePage = () => {
  const navigate = useNavigate();
  const [playerSymbol, setPlayerSymbol] = useState(null);
  const [board, setBoard] = useState(Array(9).fill(null));
  const [currentPlayer, setCurrentPlayer] = useState("X");
  const [status, setStatus] = useState("Waiting for opponent...");
  const [name, setName] = useState("");
  const [opponentSymbol, setOpponentSymbol] = useState("");
  const [opponentName, setOpponentName] = useState("");
  const [opponentConnected, setOpponentConnected] = useState(false);
  const [profile, setProfile] = useState(null);
  const [guestStats, setGuestStats] = useState({
    matches_played: 0,
    wins: 0,
    losses: 0,
    draws: 0,
  });

  // Check if user is authenticated, if not redirect to login
  useEffect(() => {
    const playerName = localStorage.getItem("playerName");
    if (!playerName) {
      navigate("/");
      return;
    }
    setName(playerName);
    socket.emit("submitName", playerName);
  }, [navigate]);

  // Fetch user profile or load guest stats from localStorage
  useEffect(() => {
    const userId = localStorage.getItem("userId");
    const authMethod = localStorage.getItem("authMethod");

    if (authMethod === "google" && userId && userId !== "null") {
      const fetchProfile = async () => {
        const userProfile = await getUserProfile(userId);
        if (userProfile) {
          setProfile(userProfile);
        }
      };
      fetchProfile();
    } else if (authMethod === "guest") {
      const stored = localStorage.getItem("guestStats");
      if (stored) {
        try {
          setGuestStats(JSON.parse(stored));
        } catch (e) {
          console.error(e);
        }
      }
    }
  }, []);

  // Socket event handlers
  useEffect(() => {
    socket.on("playerAssignment", (symbol) => setPlayerSymbol(symbol));

    socket.on("gameState", ({ board, currentPlayer, playerNames, winner }) => {
      setBoard(board);
      setCurrentPlayer(currentPlayer);

      if (winner) {
        const userId = localStorage.getItem("userId");
        const authMethod = localStorage.getItem("authMethod");
        const isGameAlreadyEnded = status.includes("won") || status.includes("lost") || status.includes("draw");

        const updateStats = async (result) => {
          if (isGameAlreadyEnded) return;

          if (authMethod === "google" && userId && userId !== "null") {
            const updatedProfile = await updateMatchResult(userId, result);
            if (updatedProfile) {
              setProfile(updatedProfile);
            }
          } else if (authMethod === "guest") {
            setGuestStats((prev) => {
              const current = {
                matches_played: prev.matches_played + 1,
                wins: result === "win" ? prev.wins + 1 : prev.wins,
                losses: result === "loss" ? prev.losses + 1 : prev.losses,
                draws: result === "draw" ? prev.draws + 1 : prev.draws,
              };
              localStorage.setItem("guestStats", JSON.stringify(current));
              return current;
            });
          }
        };

        if (winner === "draw") {
          setStatus("It's a draw!");
          updateStats("draw");
        } else if (playerNames) {
          const winnerSymbol = playerNames.X === winner ? "X" : "O";
          if (playerSymbol === winnerSymbol) {
            setStatus("You won!");
            updateStats("win");
          } else {
            setStatus("You lost!");
            updateStats("loss");
          }
        }
      } else {
        if (playerNames) {
          const opponentSym = playerSymbol === "X" ? "O" : "X";
          setOpponentSymbol(opponentSym);

          const opponent = playerNames[opponentSym];
          if (opponent) {
            setOpponentConnected(true);
            setOpponentName(opponent);
          } else {
            setOpponentConnected(false);
            setOpponentName("Opponent");
          }

          const message =
            playerSymbol === currentPlayer ? "Your Turn" : `Opponent's Turn`;

          setStatus(message);
        }
      }
    });

    socket.on("roomFull", () => alert("Room is full!"));

    socket.on("opponentDisconnected", () => {
      alert("Opponent disconnected. Refresh or restart to play again.");
      setOpponentConnected(false);
      setOpponentName("");
      setStatus("Opponent disconnected.");
    });

    return () => {
      socket.off("playerAssignment");
      socket.off("gameState");
      socket.off("roomFull");
      socket.off("opponentDisconnected");
    };
  }, [playerSymbol]);

  const handleSquareClick = (index) => {
    if (
      playerSymbol === currentPlayer &&
      !board[index] &&
      !status.includes("won") &&
      !status.includes("lost") &&
      !status.includes("draw")
    ) {
      socket.emit("makeMove", { index, player: playerSymbol });
    }
  };

  // Connecting state
  if (!playerSymbol) {
    return <div className="centered-container">Connecting to game...</div>;
  }

  // Waiting for opponent state
  if (!opponentConnected) {
    return (
      <div className="centered-container">
        <h2>Looking for opponent...</h2>
        <p>Waiting for another player to join.</p>
      </div>
    );
  }

  // Game state
  return (
    <div className="game-page-container">
      <div className="players-container">
        <div className="player-box player-self">
          <div className="player-details">
            You are: <strong>{name}</strong> - <span className="symbol-highlight" style={{ color: playerSymbol === "X" ? "#2ecc71" : "#e74c3c" }}>{playerSymbol}</span>
          </div>
          {(profile || localStorage.getItem("authMethod") === "guest") && (
            <div className="stats-card">
              <h3>Your Stats</h3>
              <div className="stats-row">
                <span className="stats-label">Played:</span>
                <span className="stats-value">{profile ? profile.matches_played : guestStats.matches_played}</span>
              </div>
              <div className="stats-row">
                <span className="stats-label">Won:</span>
                <span className="stats-value" style={{ color: "#2ecc71" }}>{profile ? profile.wins : guestStats.wins}</span>
              </div>
              <div className="stats-row">
                <span className="stats-label">Lost:</span>
                <span className="stats-value" style={{ color: "#e74c3c" }}>{profile ? profile.losses : guestStats.losses}</span>
              </div>
              <div className="stats-row">
                <span className="stats-label">Drawn:</span>
                <span className="stats-value" style={{ color: "#f1c40f" }}>
                  {profile ? (profile.matches_played - profile.wins - profile.losses) : guestStats.draws}
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="player-box player-opponent">
          <div className="opponent-details">
            Opponent: <strong>{opponentName}</strong> - <span className="symbol-highlight" style={{ color: opponentSymbol === "X" ? "#2ecc71" : "#e74c3c" }}>{opponentSymbol}</span>
          </div>
        </div>
      </div>

      <div className="game-main-content">
        <div
          className={`status-message ${
            playerSymbol === currentPlayer ? "your-turn" : "opponent-turn"
          }`}
        >
          {status}
        </div>

        <div
          className={`game-board-wrapper ${
            playerSymbol === currentPlayer ? "your-turn" : "opponent-turn"
          }`}
        >
          <Board board={board} onSquareClick={handleSquareClick} />
        </div>

        <div className="game-controls">
          <button
            className="reset-button"
            onClick={() => socket.emit("restartGame")}
          >
            Restart Game
          </button>
        </div>
      </div>
    </div>
  );
};

export default GamePage;
