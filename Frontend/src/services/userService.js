import { supabase } from "../supabaseClient";

// Create or update user profile
export const createOrUpdateUserProfile = async (
  userId,
  username,
  authMethod,
) => {
  try {
    // Check if user profile already exists
    const { data: existingUser, error: fetchError } = await supabase
      .from("user_profiles")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (fetchError && fetchError.code !== "PGRST116") {
      // PGRST116 means no rows found, which is expected for new users
      console.error("Error fetching user profile:", fetchError);
      return null;
    }

    if (existingUser) {
      // User already exists, return existing profile
      return existingUser;
    }

    // Create new user profile
    const { data: newUser, error: createError } = await supabase
      .from("user_profiles")
      .insert({
        user_id: userId,
        username: username,
        auth_method: authMethod,
        matches_played: 0,
        wins: 0,
        losses: 0,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (createError) {
      console.error("Error creating user profile:", createError);
      return null;
    }

    return newUser;
  } catch (error) {
    console.error("Error in createOrUpdateUserProfile:", error);
    return null;
  }
};

// Get user profile by user ID
export const getUserProfile = async (userId) => {
  try {
    const { data, error } = await supabase
      .from("user_profiles")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (error) {
      console.error("Error fetching user profile:", error);
      return null;
    }

    return data;
  } catch (error) {
    console.error("Error in getUserProfile:", error);
    return null;
  }
};

// Update match result (win/loss)
export const updateMatchResult = async (userId, result) => {
  try {
    const { data: profile, error: fetchError } = await supabase
      .from("user_profiles")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (fetchError) {
      console.error("Error fetching profile:", fetchError);
      return null;
    }

    const updates = {
      matches_played: profile.matches_played + 1,
      wins: result === "win" ? profile.wins + 1 : profile.wins,
      losses: result === "loss" ? profile.losses + 1 : profile.losses,
      updated_at: new Date().toISOString(),
    };

    const { data, error: updateError } = await supabase
      .from("user_profiles")
      .update(updates)
      .eq("user_id", userId)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating match result:", updateError);
      return null;
    }

    return data;
  } catch (error) {
    console.error("Error in updateMatchResult:", error);
    return null;
  }
};

// Get all user profiles (for leaderboard)
export const getAllUserProfiles = async () => {
  try {
    const { data, error } = await supabase
      .from("user_profiles")
      .select("*")
      .order("wins", { ascending: false });

    if (error) {
      console.error("Error fetching user profiles:", error);
      return [];
    }

    return data;
  } catch (error) {
    console.error("Error in getAllUserProfiles:", error);
    return [];
  }
};
