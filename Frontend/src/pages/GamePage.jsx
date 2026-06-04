import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { io } from "socket.io-client";
import { updateMatchResult } from "../services/userService";

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
  const [searchParams] = useSearchParams();
  const roomCode = searchParams.get("room");
  const matchmaking = searchParams.get("matchmaking");

  const [playerSymbol, setPlayerSymbol] = useState(null);
  const [board, setBoard] = useState(Array(9).fill(null));
  const [currentPlayer, setCurrentPlayer] = useState("X");
  const [status, setStatus] = useState("Waiting for opponent...");
  const [name, setName] = useState("");
  const [opponentSymbol, setOpponentSymbol] = useState("");
  const [opponentName, setOpponentName] = useState("");
  const [opponentConnected, setOpponentConnected] = useState(false);

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

  // Join matchmaking or private room on mount
  useEffect(() => {
    if (roomCode) {
      socket.emit("joinPrivateRoom", { roomCode });
    } else if (matchmaking) {
      socket.emit("joinMatchmaking");
    } else {
      navigate("/lobby");
    }
  }, [roomCode, matchmaking, navigate]);

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
            await updateMatchResult(userId, result);
          } else if (authMethod === "guest") {
            const stored = localStorage.getItem("guestStats");
            let current = { matches_played: 0, wins: 0, losses: 0, draws: 0 };
            if (stored) {
              try {
                current = JSON.parse(stored);
              } catch (e) {}
            }
            current.matches_played += 1;
            if (result === "win") current.wins += 1;
            else if (result === "loss") current.losses += 1;
            else if (result === "draw") current.draws += 1;
            localStorage.setItem("guestStats", JSON.stringify(current));
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

    socket.on("roomFull", () => {
      alert("Room is full or does not exist!");
      navigate("/lobby");
    });

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
  }, [playerSymbol, status, navigate]);

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
        <p style={{ color: "#a0a0b0", marginBottom: "2rem" }}>Waiting for another player to join.</p>
        {roomCode && (
          <div className="share-link-section">
            <p className="invite-desc">Share this room code with your friend:</p>
            <div className="room-code-badge">{roomCode}</div>
            <button
              className="copy-invite-btn"
              onClick={() => {
                navigator.clipboard.writeText(
                  `${window.location.origin}/game?room=${roomCode}`
                );
                alert("Invite link copied to clipboard!");
              }}
            >
              📋 Copy Invite Link
            </button>
          </div>
        )}
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
          {roomCode && (
            <div className="room-details-box" style={{ marginTop: "1.2rem" }}>
              <span className="stats-label" style={{ display: "block", marginBottom: "0.4rem" }}>Room Code:</span>
              <div className="room-code-badge small-badge">{roomCode}</div>
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
