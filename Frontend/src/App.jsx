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
    socket.on("gameState", ({ board, currentPlayer, winner }) => {
      setBoard(board);
      setCurrentPlayer(currentPlayer);
      if (winner)
        setStatus(winner === "draw" ? "It's a draw!" : `Winner: ${winner}`);
      else setStatus(`Next player: ${currentPlayer}`);
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
      <div>
        <h2>Enter Your Name</h2>
        <input value={name} onChange={(e) => setName(e.target.value)} />
        <button onClick={handleSubmit}>Start Game</button>
      </div>
    );
  }

  if (!playerSymbol) {
    return <div>Connecting to game...</div>;
  }

  return (
    <div>
      <div>You are: {playerSymbol}</div>
      <div>{status}</div>
      <Board board={board} onSquareClick={handleSquareClick} />
    </div>
  );
};

export default App;

// import React, { useState, useEffect } from "react";
// import { io } from "socket.io-client";
// const socket = io("http://localhost:4000");

// const Square = ({ value, onClick }) => {
//   return (
//     <button className="square" onClick={onClick}>
//       {value}
//     </button>
//   );
// };

// const Board = () => {
//   const [squares, setSquares] = useState(Array(9).fill(null));
//   const [isXNext, setIsXNext] = useState(true);

//   const winner = calculateWinner(squares);
//   const status = winner
//     ? `Winner: ${winner}`
//     : squares.every(Boolean)
//     ? "It's a Draw!"
//     : `Next player: ${isXNext ? "X" : "O"}`;

//   const handleClick = (i) => {
//     if (squares[i] || winner) return;
//     const newSquares = squares.slice();
//     newSquares[i] = isXNext ? "X" : "O";
//     setSquares(newSquares);
//     setIsXNext(!isXNext);
//   };

//   const renderSquare = (i) => {
//     return <Square value={squares[i]} onClick={() => handleClick(i)} />;
//   };

//   const resetGame = () => {
//     setSquares(Array(9).fill(null));
//     setIsXNext(true);
//   };

//   return (
//     <div className="board-container">
//       <div className="status">{status}</div>
//       <div className="board">
//         {Array(9)
//           .fill(null)
//           .map((_, i) => (
//             <React.Fragment key={i}>{renderSquare(i)}</React.Fragment>
//           ))}
//       </div>
//       <button className="reset-button" onClick={resetGame}>
//         Reset Game
//       </button>
//     </div>
//   );
// };

// function calculateWinner(squares) {
//   const lines = [
//     [0, 1, 2],
//     [3, 4, 5],
//     [6, 7, 8],
//     [0, 3, 6],
//     [1, 4, 7],
//     [2, 5, 8],
//     [0, 4, 8],
//     [2, 4, 6],
//   ];
//   for (let [a, b, c] of lines) {
//     if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
//       return squares[a];
//     }
//   }
//   return null;
// }

// const App = () => {
//   const [playerSymbol, setPlayerSymbol] = useState(null);
//   const [name, setName] = useState("");
//   const [submitted, setSubmitted] = useState(false);
//   const [opponentName, setOpponentName] = useState("Waiting...");

//   useEffect(() => {
//     socket.on("playerAssignment", (symbol) => {
//       setPlayerSymbol(symbol);
//     });

//     socket.on("roomFull", () => {
//       alert("Room is full!");
//     });

//     socket.on("opponentName", (opponent) => {
//       setOpponentName(opponent);
//     });

//     return () => {
//       socket.off("playerAssignment");
//       socket.off("roomFull");
//       socket.off("opponentName");
//     };
//   }, []);

//   const handleSubmit = () => {
//     if (name.trim()) {
//       socket.emit("submitName", name);
//       setSubmitted(true);
//     }
//   };

//   return (
//     <div className="game-wrapper">
//       {!submitted ? (
//         <div className="name-form">
//           <h2>Enter Your Name</h2>
//           <input
//             type="text"
//             value={name}
//             onChange={(e) => setName(e.target.value)}
//             placeholder="Your name"
//           />
//           <button onClick={handleSubmit}>Start Game</button>
//         </div>
//       ) : playerSymbol ? (
//         <Board
//           playerSymbol={playerSymbol}
//           playerName={name}
//           opponentName={opponentName}
//         />
//       ) : (
//         <div className="status">Connecting to game...</div>
//       )}
//     </div>
//   );
// };

// export default App;
