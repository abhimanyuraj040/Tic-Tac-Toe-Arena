const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
app.use(
  cors({
    origin: "https://tic-tac-toe-arena-xi.vercel.app",
    methods: ["GET", "POST"],
    credentials: true,
  }),
);

app.get("/health", (req, res) => {
  res.status(200).json({ message: "Server is running" });
});

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "https://tic-tac-toe-arena-xi.vercel.app",
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// Store waiting players
let waitingPlayer = null;

// Store all active games
let games = {};

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  let gameRoom = null;
  let assignedSymbol = null;

  if (!waitingPlayer) {
    // First player - add to waiting queue
    waitingPlayer = socket.id;
    socket.emit("playerAssignment", null); // Tell client to wait
    console.log("Player waiting for opponent:", socket.id);
  } else {
    // Second player - create a new game
    const gameId = `game_${Date.now()}`;
    gameRoom = gameId;
    assignedSymbol = "O";

    games[gameId] = {
      players: {
        X: waitingPlayer,
        O: socket.id,
      },
      playerNames: {
        X: null,
        O: null,
      },
      board: Array(9).fill(null),
      currentPlayer: "X",
    };

    // Notify both players to join the game room
    io.to(waitingPlayer).emit("gameAssigned", { gameId, symbol: "X" });
    socket.emit("gameAssigned", { gameId, symbol: "O" });

    // Join both players to the game room
    io.to(waitingPlayer).socketsJoin(gameId);
    socket.socketsJoin(gameId);

    console.log("New game created:", gameId);
    waitingPlayer = null;
  }

  socket.on("submitName", (name) => {
    if (!gameRoom) return;

    const game = games[gameRoom];
    if (!game) return;

    game.playerNames[assignedSymbol] = name;

    // Broadcast updated game state only to players in this game
    io.to(gameRoom).emit("gameState", {
      board: game.board,
      currentPlayer: game.currentPlayer,
      playerNames: game.playerNames,
    });

    console.log(`[${gameRoom}] ${assignedSymbol} joined as ${name}`);
  });

  socket.on("makeMove", ({ index, player }) => {
    if (!gameRoom) return;

    const game = games[gameRoom];
    if (!game || player !== game.currentPlayer || game.board[index]) return;

    game.board[index] = player;
    const winner = checkWinner(game.board);

    if (winner || game.board.every((cell) => cell !== null)) {
      io.to(gameRoom).emit("gameState", {
        board: game.board,
        currentPlayer: game.currentPlayer,
        playerNames: game.playerNames,
        winner: winner ? game.playerNames[winner] : "draw",
      });
      console.log(`[${gameRoom}] Game ended. Winner: ${winner || "draw"}`);
    } else {
      game.currentPlayer = game.currentPlayer === "X" ? "O" : "X";
      io.to(gameRoom).emit("gameState", {
        board: game.board,
        currentPlayer: game.currentPlayer,
        playerNames: game.playerNames,
      });
    }
  });

  socket.on("restartGame", () => {
    if (!gameRoom) return;

    const game = games[gameRoom];
    if (!game) return;

    game.board = Array(9).fill(null);
    game.currentPlayer = "X";

    io.to(gameRoom).emit("gameState", {
      board: game.board,
      currentPlayer: game.currentPlayer,
      playerNames: game.playerNames,
    });

    console.log(`[${gameRoom}] Game restarted`);
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);

    if (socket.id === waitingPlayer) {
      waitingPlayer = null;
      console.log("Waiting player disconnected");
    } else if (gameRoom && games[gameRoom]) {
      const game = games[gameRoom];

      // Notify the other player
      io.to(gameRoom).emit("opponentDisconnected");

      // Clean up game
      delete games[gameRoom];
      console.log("Game ended:", gameRoom);
    }
  });

  function checkWinner(board) {
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

const PORT = 3000;
server.listen(PORT, () =>
  console.log(`Server running on http://localhost:${PORT}`),
);
