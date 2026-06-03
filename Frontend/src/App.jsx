import "./App.css";

import React, { useState, useEffect } from "react";
import { io } from "socket.io-client";
import { supabase } from "./supabaseClient";

// const socket = io("http://localhost:3000");
const socket = io("https://tic-tac-toe-arena.onrender.com", {
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

const App = () => {
  const [playerSymbol, setPlayerSymbol] = useState(null);
  const [board, setBoard] = useState(Array(9).fill(null));
  const [currentPlayer, setCurrentPlayer] = useState("X");
  const [status, setStatus] = useState("Waiting for opponent...");
  const [name, setName] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [opponentSymbol, setOpponentSymbol] = useState("");
  const [opponentName, setOpponentName] = useState("");
  const [opponentConnected, setOpponentConnected] = useState(false);
  const [authMethod, setAuthMethod] = useState(null);
  const [loading, setLoading] = useState(false);

  // Check for authentication and redirect to Vercel if authenticated
  useEffect(() => {
    const checkAuthAndRedirect = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (
        session &&
        !window.location.origin.includes("localhost") &&
        window.location.origin !== "https://tic-tac-toe-arena-xi.vercel.app"
      ) {
        window.location.href = "https://tic-tac-toe-arena-xi.vercel.app";
      }
    };

    checkAuthAndRedirect();
  }, []);

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

    return () => {
      socket.off("playerAssignment");
      socket.off("gameState");
      socket.off("roomFull");
    };
  }, [playerSymbol]);

  const handleSubmit = () => {
    if (name.trim()) {
      socket.emit("submitName", name);
      setSubmitted(true);
    }
  };

  const handleGuestLogin = () => {
    const characters =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let guestName = "Guest_";
    for (let i = 0; i < 8; i++) {
      guestName += characters.charAt(
        Math.floor(Math.random() * characters.length),
      );
    }
    setName(guestName);
    setAuthMethod("guest");
    socket.emit("submitName", guestName);
    setSubmitted(true);
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: window.location.origin.includes("localhost")
            ? window.location.origin
            : "https://tic-tac-toe-arena-xi.vercel.app",
        },
      });

      if (error) {
        console.error("Google login error:", error);
        alert("Google login failed. Please try again.");
        setLoading(false);
        return;
      }

      // If successful, user will be redirected and session will be established
      // Fetch user data after authentication
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const googleName =
          user.user_metadata?.full_name ||
          `Google_User_${user.id.substring(0, 8)}`;
        setName(googleName);
        setAuthMethod("google");
        socket.emit("submitName", googleName);
        setSubmitted(true);
      }
    } catch (error) {
      console.error("Error during Google login:", error);
      alert("An error occurred during login. Please try again.");
    } finally {
      setLoading(false);
    }
  };

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

  if (!submitted) {
    return (
      <div className="centered-container">
        <h1>Tic-Tac-Toe Arena</h1>
        <p>Choose how to play:</p>
        <div className="auth-buttons">
          <button
            className="google-button"
            onClick={handleGoogleLogin}
            disabled={loading}
          >
            {loading ? "Signing in..." : "🔐 Login with Google"}
          </button>
          <button
            className="guest-button"
            onClick={handleGuestLogin}
            disabled={loading}
          >
            👤 Play as Guest
          </button>
        </div>
      </div>
    );
  }

  if (!playerSymbol) {
    return <div className="centered-container">Connecting to game...</div>;
  }

  if (!opponentConnected) {
    return (
      <div className="centered-container">
        <h2>Looking for opponent...</h2>
        <p>Waiting for another player to join.</p>
      </div>
    );
  }

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

export default App;
