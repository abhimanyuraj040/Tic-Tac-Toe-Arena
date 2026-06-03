import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { io } from "socket.io-client";

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

  // Socket event handlers
  useEffect(() => {
    socket.on("playerAssignment", (symbol) => setPlayerSymbol(symbol));

    socket.on("gameState", ({ board, currentPlayer, playerNames, winner }) => {
      setBoard(board);
      setCurrentPlayer(currentPlayer);

      if (winner) {
        if (winner === "draw") {
          setStatus("It's a draw!");
        } else if (playerNames) {
          const winnerSymbol = playerNames.X === winner ? "X" : "O";
          if (playerSymbol === winnerSymbol) {
            setStatus("You won!");
          } else {
            setStatus("You lost!");
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
    <div>
      <div className="left left-top">
        You are: {name} - {playerSymbol}
      </div>
      <div className="right right-top">
        Opponent: {opponentName} - {opponentSymbol}
      </div>
      <div
        className={`status-message centre ${
          playerSymbol === currentPlayer ? "your-turn" : "opponent-turn"
        }`}
      >
        {status}
      </div>

      <div
        className={`game-container ${
          playerSymbol === currentPlayer ? "your-turn" : "opponent-turn"
        }`}
      >
        <Board board={board} onSquareClick={handleSquareClick} />
      </div>
      <div className="centre-bottom">
        <button
          className="reset-button"
          onClick={() => socket.emit("restartGame")}
        >
          Restart Game
        </button>
      </div>
    </div>
  );
};

export default GamePage;
