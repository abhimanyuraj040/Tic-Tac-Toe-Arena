import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { io } from "socket.io-client";

const Navigation = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const playerName = localStorage.getItem("playerName");

  // Don't show navigation on login page
  if (location.pathname === "/" || !playerName) {
    return null;
  }

  const handleBackHome = () => {
    navigate("/");
  };

  const handleLogout = async () => {
    localStorage.removeItem("playerName");
    localStorage.removeItem("authMethod");
    localStorage.removeItem("userId");
    await supabase.auth.signOut();
    navigate("/");
  };

  return (
    <div className="navigation">
      <div className="nav-buttons">
        <button className="nav-back-button" onClick={handleBackHome}>
          🏠 Home
        </button>
        <button className="nav-logout-button" onClick={handleLogout}>
          🚪 Logout
        </button>
      </div>
    </div>
  );
};

export default Navigation;
