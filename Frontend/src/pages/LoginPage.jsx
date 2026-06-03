import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { createOrUpdateUserProfile } from "../services/userService";

const LoginPage = () => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Check for existing session or OAuth callback
  useEffect(() => {
    const checkSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session) {
        const userName =
          session.user?.user_metadata?.full_name ||
          `User_${session.user?.id.substring(0, 8)}`;

        // Create or update user profile in Supabase
        await createOrUpdateUserProfile(session.user.id, userName, "google");

        localStorage.setItem("playerName", userName);
        localStorage.setItem("authMethod", "google");
        localStorage.setItem("userId", session.user.id);
        navigate("/game");
      }
    };

    checkSession();
  }, [navigate]);

  const handleGuestLogin = () => {
    const characters =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let guestName = "Guest_";
    for (let i = 0; i < 8; i++) {
      guestName += characters.charAt(
        Math.floor(Math.random() * characters.length),
      );
    }

    localStorage.setItem("playerName", guestName);
    localStorage.setItem("authMethod", "guest");
    localStorage.setItem("userId", null); // No user ID for guests
    navigate("/game");
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
    } catch (error) {
      console.error("Error during Google login:", error);
      alert("An error occurred during login. Please try again.");
    } finally {
      setLoading(false);
    }
  };

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
};

export default LoginPage;
