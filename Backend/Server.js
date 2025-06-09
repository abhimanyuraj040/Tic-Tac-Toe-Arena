// server.js
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // Or specify your frontend origin
    methods: ["GET", "POST"],
  },
});

let players = {};
let board = Array(9).fill(null);
let currentPlayer = "X";

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  // Assign player X or O
  if (!players.X) {
    players.X = socket.id;
    socket.emit("playerAssignment", "X");
  } else if (!players.O) {
    players.O = socket.id;
    socket.emit("playerAssignment", "O");
  } else {
    socket.emit("roomFull");
    return;
  }

  // Send current state to new player
  io.emit("gameState", { board, currentPlayer });

  // Handle move
  socket.on("makeMove", ({ index, player }) => {
    if (player === currentPlayer && !board[index]) {
      board[index] = player;
      currentPlayer = currentPlayer === "X" ? "O" : "X";
      io.emit("gameState", { board, currentPlayer });
    }
  });

  // Handle reset
  socket.on("resetGame", () => {
    board = Array(9).fill(null);
    currentPlayer = "X";
    io.emit("gameState", { board, currentPlayer });
  });

  // Handle disconnect
  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
    if (players.X === socket.id) delete players.X;
    if (players.O === socket.id) delete players.O;

    // Reset game on disconnect
    board = Array(9).fill(null);
    currentPlayer = "X";
    io.emit("gameState", { board, currentPlayer });
  });
});

const PORT = 4000;
server.listen(PORT, () =>
  console.log(`Server running on http://localhost:${PORT}`)
);
