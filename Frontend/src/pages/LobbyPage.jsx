import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getUserProfile } from "../services/userService";

const LobbyPage = () => {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [profile, setProfile] = useState(null);
  const [roomInput, setRoomInput] = useState("");
  const [guestStats, setGuestStats] = useState({
    matches_played: 0,
    wins: 0,
    losses: 0,
    draws: 0,
  });

  const authMethod = localStorage.getItem("authMethod");
  const userId = localStorage.getItem("userId");

  // Redirect to login if not logged in
  useEffect(() => {
    const playerName = localStorage.getItem("playerName");
    if (!playerName) {
      navigate("/");
      return;
    }
    setName(playerName);
  }, [navigate]);

  // Load stats from Supabase or localStorage
  useEffect(() => {
    if (authMethod === "google" && userId && userId !== "null") {
      const fetchProfile = async () => {
        const userProfile = await getUserProfile(userId);
        if (userProfile) {
          setProfile(userProfile);
        }
      };
      fetchProfile();
    } else if (authMethod === "guest") {
      const stored = localStorage.getItem("guestStats");
      if (stored) {
        try {
          setGuestStats(JSON.parse(stored));
        } catch (e) {
          console.error(e);
        }
      }
    }
  }, [authMethod, userId]);

  const handlePlayStrangers = () => {
    navigate("/game?matchmaking=true");
  };

  const handleCreatePrivate = () => {
    // Generate a unique 8-character alphanumeric room code
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let code = "";
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    navigate(`/game?room=${code}`);
  };

  const handleJoinPrivate = (e) => {
    e.preventDefault();
    if (!roomInput.trim()) return;
    navigate(`/game?room=${roomInput.trim().toUpperCase()}`);
  };

  return (
    <div className="lobby-container">
      <div className="lobby-header">
        <h1>Welcome, <span className="highlight-text">{name}</span></h1>
        <p className="subtitle-text">Choose your gameplay arena mode</p>
      </div>

      <div className="lobby-main-grid">
        {/* Left Side: Stats Details */}
        <div className="lobby-stats-section">
          <div className="stats-card lobby-card">
            <h3>Arena Statistics</h3>
            <div className="stats-row">
              <span className="stats-label">Matches Played:</span>
              <span className="stats-value">{profile ? profile.matches_played : guestStats.matches_played}</span>
            </div>
            <div className="stats-row">
              <span className="stats-label">Wins:</span>
              <span className="stats-value" style={{ color: "#2ecc71" }}>{profile ? profile.wins : guestStats.wins}</span>
            </div>
            <div className="stats-row">
              <span className="stats-label">Losses:</span>
              <span className="stats-value" style={{ color: "#e74c3c" }}>{profile ? profile.losses : guestStats.losses}</span>
            </div>
            <div className="stats-row">
              <span className="stats-label">Draws:</span>
              <span className="stats-value" style={{ color: "#f1c40f" }}>
                {profile ? (profile.matches_played - profile.wins - profile.losses) : guestStats.draws}
              </span>
            </div>
            {authMethod === "guest" && (
              <p className="guest-note-text">* Guest stats are stored locally</p>
            )}
          </div>
        </div>

        {/* Right Side: Action Cards */}
        <div className="lobby-modes-section">
          {/* Play with Strangers Card */}
          <div className="mode-card glass-panel" onClick={handlePlayStrangers}>
            <div className="mode-icon">🌎</div>
            <div className="mode-info">
              <h2>Play with Strangers</h2>
              <p>Quick match with a random online opponent</p>
              <button className="mode-action-btn public-btn">Find Match</button>
            </div>
          </div>

          {/* Play with Friends Card */}
          <div className="mode-card glass-panel private-mode-card">
            <div className="mode-icon">👥</div>
            <div className="mode-info">
              <h2>Play with a Friend</h2>
              <p>Create a room link to share, or join using a room code</p>
              
              <div className="friend-controls">
                <button className="mode-action-btn private-btn" onClick={handleCreatePrivate}>
                  Create Room Link
                </button>
                
                <div className="divider-text">or</div>
                
                <form onSubmit={handleJoinPrivate} className="join-room-form">
                  <input
                    type="text"
                    placeholder="ENTER ROOM CODE"
                    value={roomInput}
                    onChange={(e) => setRoomInput(e.target.value)}
                    maxLength={15}
                  />
                  <button type="submit" className="join-submit-btn">
                    Join Room
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LobbyPage;
