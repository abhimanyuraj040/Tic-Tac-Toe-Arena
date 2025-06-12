import "./App.css";

import React, { useState, useEffect } from "react";
import { io } from "socket.io-client";

const socket = io("http://localhost:4000");

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

const App = () => {
  const [playerSymbol, setPlayerSymbol] = useState(null);
  const [board, setBoard] = useState(Array(9).fill(null));
  const [currentPlayer, setCurrentPlayer] = useState("X");
  const [status, setStatus] = useState("Waiting for opponent...");
  const [name, setName] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [opponentSymbol, setOpponentSymbol] = useState("");
  const [opponentName, setOpponentName] = useState("");

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
        const opponentSymbol = playerSymbol === "X" ? "O" : "X";
        setOpponentSymbol(opponentSymbol);
        const opponentName = playerNames?.[opponentSymbol] || "Opponent";
        setOpponentName(opponentName);

        const message =
          playerSymbol === currentPlayer ? "Your Turn" : `Opponent's Turn`;

        setStatus(message);
      }
    });

    socket.on("roomFull", () => alert("Room is full!"));

    return () => {
      socket.off("playerAssignment");
      m.off("gameState");
      socket.off("roomFull");
    };
  }, [playerSymbol]);

  const handleSubmit = () => {
    if (name.trim()) {
      socket.emit("submitName", name);
      setSubmitted(true);
    }
  };

  const handleSquareClick = (index) => {
    if (
      playerSymbol === currentPlayer &&
      !board[index] &&
      !status.includes("Winner")
    ) {
      socket.emit("makeMove", { index, player: playerSymbol });
    }
  };

  if (!submitted) {
    return (
      <div className="centered-container">
        <h2>Enter Your Name</h2>
        <input value={name} onChange={(e) => setName(e.target.value)} />
        <button className="start-button" onClick={handleSubmit}>
          Start Game
        </button>
      </div>
    );
  }

  if (!playerSymbol) {
    return <div>Connecting to game...</div>;
  }

  return (
    <div>
      <div className="left left-top">
        You are: {name} - {playerSymbol}
      </div>
      <div className="right right-top">
        {" "}
        Opponent: {opponentName} - {opponentSymbol}{" "}
      </div>
      <div className="centre" style={{ marginTop: "6rem" }}>
        Opponent: {status.includes("Waiting") ? "Waiting..." : "Ready"}
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
    </div>
  );
};

export default App;
