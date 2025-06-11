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

  useEffect(() => {
    socket.on("playerAssignment", (symbol) => setPlayerSymbol(symbol));

    socket.on("gameState", ({ board, currentPlayer, playerNames, winner }) => {
      setBoard(board);
      setCurrentPlayer(currentPlayer);
      if (winner) {
        setStatus(winner === "draw" ? "It's a draw!" : `Winner: ${winner}`);
      } else {
        setStatus(
          `Next player: ${playerNames?.[currentPlayer] || currentPlayer}`
        );
      }
    });

    socket.on("roomFull", () => alert("Room is full!"));

    return () => {
      socket.off("playerAssignment");
      socket.off("gameState");
      socket.off("roomFull");
    };
  }, []);

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
      {/* <div>You are: {playerSymbol}</div> */}
      <div>
        You are: {playerSymbol} ({name})
      </div>
      <div>Opponent: {status.includes("Waiting") ? "Waiting..." : "Ready"}</div>
      <div>Current Player: {currentPlayer}</div>
      {/* <div> {name === (playerNames?.[currentPlayer] || currentPlayer) ? (
        <div className="current-player">It's your turn!</div>
      ) : currentPlayer + ' Turn'} </div> */}
      <div>{status}</div>
      <div className="game-container">
        <Board board={board} onSquareClick={handleSquareClick} />
      </div>
    </div>
  );
};

export default App;
