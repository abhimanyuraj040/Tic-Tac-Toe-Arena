const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    // origin: "*",
    origin:"https://tic-tac-toe-arena-xi.vercel.app/",
    methods: ["GET", "POST"],
  },
});

let players = {
  X: null,
  O: null,
};

let playerNames = {
  X: null,
  O: null,
};

let board = Array(9).fill(null);
let currentPlayer = "X";

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  let assignedSymbol = null;

  if (!players.X) {
    players.X = socket.id;
    assignedSymbol = "X";
  } else if (!players.O) {
    players.O = socket.id;
    assignedSymbol = "O";
  } else {
    socket.emit("roomFull");
    return;
  }

  socket.emit("playerAssignment", assignedSymbol);

  socket.on("submitName", (name) => {
    playerNames[assignedSymbol] = name;
    io.emit("gameState", {
      board,
      currentPlayer,
      playerNames,
    });
  });

  socket.emit("playerAssignment", assignedSymbol);
  io.emit("gameState", {
    board,
    currentPlayer,
    playerNames,
  });

  socket.on("makeMove", ({ index, player }) => {
    if (player === currentPlayer && !board[index]) {
      board[index] = player;
      const winner = checkWinner();

      if (winner || board.every((cell) => cell !== null)) {
        io.emit("gameState", {
          board,
          currentPlayer,
          playerNames,
          winner: winner ? playerNames[winner] : "draw",
        });
      } else {
        currentPlayer = currentPlayer === "X" ? "O" : "X";
        io.emit("gameState", {
          board,
          currentPlayer,
          playerNames,
        });
      }
    }
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
    if (players.X === socket.id) {
      delete players.X;
      delete playerNames.X;
    }
    if (players.O === socket.id) {
      delete players.O;
      delete playerNames.O;
    }
    board = Array(9).fill(null);
    currentPlayer = "X";
    io.emit("gameState", {
      board,
      currentPlayer,
      playerNames,
    });
  });

  socket.on("restartGame", () => {
    board = Array(9).fill(null);
    currentPlayer = "X";
    io.emit("gameState", {
      board,
      currentPlayer,
      playerNames,
    });
  });

  function checkWinner() {
    const winPatterns = [
      [0, 1, 2],
      [3, 4, 5],
      [6, 7, 8],
      [0, 3, 6],
      [1, 4, 7],
      [2, 5, 8],
      [0, 4, 8],
      [2, 4, 6],
    ];

    for (const [a, b, c] of winPatterns) {
      if (board[a] && board[a] === board[b] && board[a] === board[c]) {
        return board[a];
      }
    }
    return null;
  }
});

const PORT = 4000;
server.listen(PORT, () =>
  console.log(`Server running on http://localhost:${PORT}`)
);
