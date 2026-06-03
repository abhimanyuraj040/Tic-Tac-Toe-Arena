# Supabase Setup for User Profiles

To store user match records, wins, losses, and usernames, you need to create a `user_profiles` table in Supabase.

## Step 1: Go to Supabase SQL Editor

1. Navigate to your Supabase project dashboard
2. Click on **SQL Editor** in the left sidebar
3. Click **New Query**

## Step 2: Run the SQL Migration

Copy and paste the following SQL into the editor and click **Run**:

```sql
-- Create user_profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE,
  username TEXT NOT NULL,
  auth_method TEXT NOT NULL DEFAULT 'google',
  matches_played INTEGER DEFAULT 0,
  wins INTEGER DEFAULT 0,
  losses INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on user_id for faster queries
CREATE INDEX IF NOT EXISTS user_profiles_user_id_idx ON user_profiles(user_id);

-- Create index on wins for leaderboard sorting
CREATE INDEX IF NOT EXISTS user_profiles_wins_idx ON user_profiles(wins DESC);
```

## Step 3: Enable Row Level Security (Optional but Recommended)

```sql
-- Enable RLS on user_profiles table
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to read their own profile
CREATE POLICY "Users can read their own profile" ON user_profiles
FOR SELECT USING (auth.uid() = user_id);

-- Create policy to allow users to update their own profile
CREATE POLICY "Users can update their own profile" ON user_profiles
FOR UPDATE USING (auth.uid() = user_id);

-- Create policy to allow users to insert their own profile
CREATE POLICY "Users can insert their own profile" ON user_profiles
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create policy to allow public read access for leaderboard
CREATE POLICY "Public can read all profiles" ON user_profiles
FOR SELECT USING (true);
```

## Step 4: Update Your Frontend Environment

The frontend code is already configured to use this table. When users log in with Google, their profile is automatically created with:

- `matches_played`: 0
- `wins`: 0
- `losses`: 0
- `username`: Their Google full name or User\_[ID]

## Step 5: Update Match Results

After each game, call the `updateMatchResult` function from `userService.js`:

```javascript
import { updateMatchResult } from "../services/userService";

// After a game ends
if (gameResult === "won") {
  await updateMatchResult(userId, "win");
} else if (gameResult === "lost") {
  await updateMatchResult(userId, "loss");
}
```

That's it! Your user profiles are now tracked in Supabase.
