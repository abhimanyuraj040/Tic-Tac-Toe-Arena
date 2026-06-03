# Supabase Google Authentication Setup

## Prerequisites

You need a Supabase account and project. If you don't have one, create it at [supabase.com](https://supabase.com)

## Step 1: Get Supabase Credentials

1. Go to your Supabase project dashboard
2. Click **Settings** → **API** in the left sidebar
3. Copy the following:
   - **Project URL** (your_supabase_url)
   - **anon public** key (your_supabase_anon_key)

## Step 2: Configure Environment Variables

Update the `.env` file in the Frontend folder:

```
VITE_SUPABASE_URL=your_project_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```

Replace `your_project_url` and `your_anon_key` with actual values from Step 1.

## Step 3: Enable Google OAuth in Supabase

1. Go to **Authentication** → **Providers** in your Supabase dashboard
2. Find **Google** and click the toggle to enable it
3. Click **Configure** to set up:
   - Go to [Google Cloud Console](https://console.cloud.google.com)
   - Create a new project or select existing one
   - Enable **Google+ API**
   - Create OAuth 2.0 credentials (Web Application):
     - Add authorized redirect URIs: `https://your-project.supabase.co/auth/v1/callback`
     - Copy the **Client ID** and **Client Secret**
4. Paste these credentials in the Supabase Google provider settings
5. Click **Save**

## Step 4: Add Redirect URL

Add your application URL to authorized redirect URIs in both:

- Google Cloud Console (OAuth app settings)
- Supabase provider settings

Examples:

- Development: `http://localhost:5173/auth/v1/callback`
- Production: `https://yourdomain.com/auth/v1/callback`

## Step 5: Test

1. Start your frontend: `npm run dev`
2. Click "🔐 Login with Google"
3. Complete the Google authentication flow
4. You'll be logged in and directed back to the game

## Troubleshooting

**Issue**: "Supabase credentials not configured"

- Make sure `.env` file has correct values
- Restart dev server after changing `.env`

**Issue**: Redirect URL mismatch error

- Ensure redirect URLs match in both Google Cloud and Supabase settings
- Check for trailing slashes and protocol (http vs https)

**Issue**: Blank page or infinite redirect

- Check browser console for errors
- Verify VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are correct
