🎵 Spotify Playlist Generator - SoundM8
A full-stack React + Node.js application that uses Spotify's Web API to create personalized playlists based on your music preferences.
✨ Features

Spotify OAuth Authentication - Secure login with PKCE flow
Real-time Artist Search - Live autocomplete using Spotify's search API
Powered Recommendations - Generate playlists based on genres, artists, and audio features
Playlist Creation - Save playlists directly to your Spotify account
User Profile Integration - Shows your top artists and listening history
Responsive UI - Works on desktop and mobile devices

🚀 Quick Start
Prerequisites

Node.js (v16 or higher)
npm or yarn
Spotify Developer Account

1. Spotify App Setup

Go to Spotify Developer Dashboard
Click "Create App"
Fill in app details:

App Name: SoundM8
App Description: Generate playlists using AI
Redirect URI: http://localhost:5000/api/callback
APIs Used: Web API

2. Backend Setup
bash# Clone/navigate to your project
cd your-project-directory

# Create backend directory
mkdir backend
cd backend

# Initialize Node.js project
npm init -y

# Install dependencies
npm install express cors axios dotenv
npm install -D nodemon

# Create .env file
cp .env.example .env
Edit backend/.env with your Spotify credentials:
envSPOTIFY_CLIENT_ID=your_client_id_here
SPOTIFY_CLIENT_SECRET=your_client_secret_here
PORT=5000
CLIENT_URL=http://localhost:3000
REDIRECT_URI=http://localhost:5000/api/callback
3. Frontend Setup
bash# Navigate back to root and setup frontend
cd ..
# (Assuming you already have your React app set up)

# Create frontend .env
cp .env.example .env
Edit frontend/.env:
envVITE_API_URL=http://localhost:5000/api
4. Install Dependencies
Backend:
bashcd backend
npm install
Frontend:
bashcd frontend  # or wherever your React app is
npm install react-router-dom @types/react-router-dom
5. Run the Application
Terminal 1 (Backend):
bashcd backend
npm run dev
# Server runs on http://localhost:5000
Terminal 2 (Frontend):
bashcd frontend
npm run dev
# React app runs on http://localhost:3000
📁 Project Structure
project/
├── backend/
│   ├── server.js              # Main backend server
│   ├── package.json           # Backend dependencies
│   ├── .env.example          # Environment template
│   └── .env                  # Your environment variables
│
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Index.tsx          # Home page
│   │   │   ├── Login.tsx          # Spotify login
│   │   │   ├── PlaylistBuilder.tsx # Main app
│   │   │   └── NotFound.tsx       # 404 page
│   │   ├── components/
│   │   │   ├── SpotifyButton.tsx  # Spotify-styled button
│   │   │   ├── TrackCard.tsx      # Individual track display
│   │   │   └── MultiSelectInput.tsx # Multi-select component
│   │   ├── services/
│   │   │   └── spotify.ts         # API service functions
│   │   └── App.tsx               # Main app component
│   ├── .env.example             # Frontend environment template
│   └── package.json            # Frontend dependencies
🔧 API Endpoints
Authentication

GET /api/login - Get Spotify authorization URL
GET /api/callback - Handle OAuth callback
POST /api/logout - Clear user session

Music Data

GET /api/user - Get current user profile
GET /api/search/artists?q=query - Search for artists
POST /api/recommendations - Get track recommendations
GET /api/genres - Get available genre seeds
GET /api/user/top/artists - Get user's top artists

Playlist Management

POST /api/playlists - Create new playlist
POST /api/playlists/:id/tracks - Add tracks to playlist

🎯 How It Works

Authentication Flow:

User clicks "Connect with Spotify"
Backend generates secure PKCE challenge
User redirects to Spotify for authorization
Spotify redirects back with authorization code
Backend exchanges code for access/refresh tokens
Frontend receives session ID for API calls


Playlist Generation:

User selects genres and artists
Frontend calls backend /recommendations endpoint
Backend calls Spotify's recommendations API with user preferences
Results are displayed with album art and artist info
User can remove/modify tracks before saving


Playlist Saving:

Backend creates new playlist in user's Spotify account
Adds selected tracks to the playlist
Returns playlist URL for user to access



🔐 Security Features

PKCE OAuth Flow - Secure authentication without exposing client secret
Session-based Auth - No tokens stored in frontend localStorage
Automatic Token Refresh - Backend handles token expiration
CORS Protection - API only accepts requests from authorized origins
Environment Variables - Sensitive data stored securely

🛠️ Customization
Adding New Audio Features
You can customize the recommendation algorithm by modifying the getRecommendations call in PlaylistBuilder.tsx:
typescriptconst recommendations = await getRecommendations({
  seed_genres: seedGenres,
  seed_artists: seedArtists,
  limit: playlistLength[0],
  target_energy: 0.8,        // High energy tracks
  target_danceability: 0.7,  // Danceable tracks
  target_valence: 0.6,       // Positive tracks
  min_popularity: 50         // Only popular tracks
});
Styling
The app uses Tailwind CSS with custom Spotify colors. Add these to your globals.css:
css:root {
  --spotify-green: #1DB954;
  --spotify-green-hover: #1ed760;
}
🚨 Troubleshooting
Common Issues

"Invalid client" error:

Check your Client ID and Secret in .env
Ensure redirect URI matches exactly in Spotify app settings


CORS errors:

Make sure backend is running on port 5000
Check CLIENT_URL in backend .env


"Session expired" errors:

Backend automatically refreshes tokens
If persistent, clear browser storage and re-login


No recommendations found:

Try different genre combinations
Reduce the number of seeds (max 5 total)
Check that genres exist in Spotify's available genres



Debug Mode
Set VITE_NODE_ENV=development in frontend .env for additional logging.
📝 License
MIT License - feel free to use this project for your hackathon or personal projects!
🤝 Contributing

Fork the repository
Create a feature branch
Make your changes
Test thoroughly
Submit a pull request

🎉 Deployment
Backend (Heroku/Railway/Render)

Set environment variables in your hosting platform
Update REDIRECT_URI to your production URL
Update Spotify app settings with new redirect URI

Frontend (Vercel/Netlify)

Set VITE_API_URL to your backend URL
Build and deploy


Happy playlist generating! 🎵✨
