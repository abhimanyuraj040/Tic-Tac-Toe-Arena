const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
const allowedOrigins = [
  "https://tic-tac-toe-arena-xi.vercel.app",
];

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.indexOf(origin) !== -1 || origin.startsWith("http://localhost:") || origin.startsWith("http://127.0.0.1:")) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  methods: ["GET", "POST"],
  credentials: true,
};

app.use(cors(corsOptions));

app.get("/health", (req, res) => {
  res.status(200).json({ message: "Server is running" });
});

const server = http.createServer(app);
const io = new Server(server, {
  cors: corsOptions,
});

// Store waiting player socket
let waitingPlayerSocket = null;

// Store all active games
let games = {};

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  // Initialize socket properties
  socket.gameRoom = null;
  socket.assignedSymbol = null;
  socket.playerName = null;

  socket.on("joinMatchmaking", () => {
    if (socket.gameRoom) return;

    if (!waitingPlayerSocket) {
      // First player - add to waiting queue
      waitingPlayerSocket = socket;
      socket.assignedSymbol = "X";
      socket.emit("playerAssignment", "X");
      console.log("Player joined matchmaking queue:", socket.id);
    } else {
      if (waitingPlayerSocket.id === socket.id) return;

      // Second player - create a new game
      const gameId = `game_${Date.now()}`;
      const firstPlayerSocket = waitingPlayerSocket;
      waitingPlayerSocket = null; // Reset waiting player

      // Setup room and symbol properties
      firstPlayerSocket.gameRoom = gameId;
      firstPlayerSocket.assignedSymbol = "X";
      
      socket.gameRoom = gameId;
      socket.assignedSymbol = "O";

      games[gameId] = {
        players: {
          X: firstPlayerSocket.id,
          O: socket.id,
        },
        playerNames: {
          X: firstPlayerSocket.playerName || null,
          O: socket.playerName || null,
        },
        board: Array(9).fill(null),
        currentPlayer: "X",
      };

      // Join both sockets to the game room
      firstPlayerSocket.join(gameId);
      socket.join(gameId);

      // Assign symbol O to the second player
      socket.emit("playerAssignment", "O");

      // Send initial game state to both players in the game room
      io.to(gameId).emit("gameState", {
        board: games[gameId].board,
        currentPlayer: games[gameId].currentPlayer,
        playerNames: games[gameId].playerNames,
      });

      console.log("New matchmaking game created:", gameId);
    }
  });

  socket.on("joinPrivateRoom", ({ roomCode }) => {
    if (!roomCode) return;
    if (socket.gameRoom) return; // already in a game

    // Check if the game room exists
    let game = games[roomCode];

    if (!game) {
      // Create a new private room
      socket.gameRoom = roomCode;
      socket.assignedSymbol = "X";

      games[roomCode] = {
        players: {
          X: socket.id,
          O: null,
        },
        playerNames: {
          X: socket.playerName || null,
          O: null,
        },
        board: Array(9).fill(null),
        currentPlayer: "X",
      };

      socket.join(roomCode);
      socket.emit("playerAssignment", "X");
      console.log(`Private room created: ${roomCode} by ${socket.id}`);
    } else {
      // Room exists. Check if it's already full
      if (game.players.O) {
        socket.emit("roomFull");
        console.log(`Private room ${roomCode} is full. Join request rejected for ${socket.id}`);
        return;
      }

      if (game.players.X === socket.id) return;

      // Join as Player O
      socket.gameRoom = roomCode;
      socket.assignedSymbol = "O";

      game.players.O = socket.id;
      game.playerNames.O = socket.playerName || null;

      socket.join(roomCode);
      socket.emit("playerAssignment", "O");

      // Send initial game state to both players
      io.to(roomCode).emit("gameState", {
        board: game.board,
        currentPlayer: game.currentPlayer,
        playerNames: game.playerNames,
      });

      console.log(`Player ${socket.id} joined private room ${roomCode}`);
    }
  });

  socket.on("submitName", (name) => {
    socket.playerName = name;
    const gameRoom = socket.gameRoom;
    const assignedSymbol = socket.assignedSymbol;

    if (assignedSymbol) {
      socket.emit("playerAssignment", assignedSymbol);
    }

    if (!gameRoom) {
      console.log(`Saved name ${name} for socket ${socket.id} (not in game yet)`);
      return;
    }

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
    const gameRoom = socket.gameRoom;
    const assignedSymbol = socket.assignedSymbol;
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
        winnerSymbol: winner ? winner : "draw",
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
    const gameRoom = socket.gameRoom;
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

    if (waitingPlayerSocket && socket.id === waitingPlayerSocket.id) {
      waitingPlayerSocket = null;
      console.log("Waiting player disconnected");
    } else {
      const gameRoom = socket.gameRoom;
      if (gameRoom && games[gameRoom]) {
        // Notify the other player
        io.to(gameRoom).emit("opponentDisconnected");

        // Clean up game
        delete games[gameRoom];
        console.log("Game ended:", gameRoom);
      }
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
