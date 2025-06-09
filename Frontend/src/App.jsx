import "./App.css";
import React, { useState } from "react";

const Square = ({ value, onClick }) => {
  return (
    <button className="square" onClick={onClick}>
      {value}
    </button>
  );
};

const Board = () => {
  const [squares, setSquares] = useState(Array(9).fill(null));
  const [isXNext, setIsXNext] = useState(true);

  const winner = calculateWinner(squares);
  const status = winner
    ? `Winner: ${winner}`
    : squares.every(Boolean)
    ? "It's a Draw!"
    : `Next player: ${isXNext ? "X" : "O"}`;

  const handleClick = (i) => {
    if (squares[i] || winner) return;
    const newSquares = squares.slice();
    newSquares[i] = isXNext ? "X" : "O";
    setSquares(newSquares);
    setIsXNext(!isXNext);
  };

  const renderSquare = (i) => {
    return <Square value={squares[i]} onClick={() => handleClick(i)} />;
  };

  const resetGame = () => {
    setSquares(Array(9).fill(null));
    setIsXNext(true);
  };

  return (
    <div className="board-container">
      <div className="status">{status}</div>
      <div className="board">
        {Array(9)
          .fill(null)
          .map((_, i) => (
            <React.Fragment key={i}>{renderSquare(i)}</React.Fragment>
          ))}
      </div>
      <button className="reset-button" onClick={resetGame}>
        Reset Game
      </button>
    </div>
  );
};

function calculateWinner(squares) {
  const lines = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6],
  ];
  for (let [a, b, c] of lines) {
    if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
      return squares[a];
    }
  }
  return null;
}

function App() {
  const [playerX, setPlayerX] = useState("");
  const [playerO, setPlayerO] = useState("");
  const [isStarted, setIsStarted] = useState(false);

  const handleStart = () => {
    if (playerX && playerO) {
      setIsStarted(true);
    } else {
      alert("Please enter both player names.");
    }
  };
  return (
    <div className="game-wrapper">
      {isStarted ? (
        <Board playerX={playerX} playerO={playerO} />
      ) : (
        <div className="name-form">
          <input
            type="text"
            placeholder="Enter Player X Name"
            value={playerX}
            onChange={(e) => setPlayerX(e.target.value)}
          />
          <input
            type="text"
            placeholder="Enter Player O Name"
            value={playerO}
            onChange={(e) => setPlayerO(e.target.value)}
          />
          <button onClick={handleStart}>Start Game</button>
        </div>
      )}
    </div>
  );
}

export default App;
