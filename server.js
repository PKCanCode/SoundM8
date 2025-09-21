const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());

// Spotify API configuration
const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI || 'http://localhost:5000/api/callback';
const SPOTIFY_API_BASE = 'https://api.spotify.com/v1';
const SPOTIFY_AUTH_BASE = 'https://accounts.spotify.com';

// In-memory storage for demo (use Redis/Database in production)
const userSessions = new Map();

/**
 * Generate code verifier and challenge for PKCE
 */
function generatePKCE() {
  const codeVerifier = crypto.randomBytes(32).toString('base64url');
  const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');
  return { codeVerifier, codeChallenge };
}

/**
 * Generate Spotify authorization URL
 */
app.get('/api/login', (req, res) => {
  try {
    const state = crypto.randomBytes(16).toString('hex');
    const { codeVerifier, codeChallenge } = generatePKCE();
    
    // Store PKCE values temporarily (use session storage in production)
    userSessions.set(state, { codeVerifier, timestamp: Date.now() });
    
    const scopes = [
      'user-read-email',
      'playlist-modify-public',
      'playlist-modify-private',
      'user-top-read',
      'user-read-recently-played',
      'user-read-private'
    ].join(' ');

    const authUrl = new URL(`${SPOTIFY_AUTH_BASE}/authorize`);
    authUrl.searchParams.append('client_id', SPOTIFY_CLIENT_ID);
    authUrl.searchParams.append('response_type', 'code');
    authUrl.searchParams.append('redirect_uri', REDIRECT_URI);
    authUrl.searchParams.append('scope', scopes);
    authUrl.searchParams.append('state', state);
    authUrl.searchParams.append('code_challenge_method', 'S256');
    authUrl.searchParams.append('code_challenge', codeChallenge);
    authUrl.searchParams.append('show_dialog', 'true');

    res.json({ authUrl: authUrl.toString() });
  } catch (error) {
    console.error('Error generating auth URL:', error);
    res.status(500).json({ error: 'Failed to generate authorization URL' });
  }
});

/**
 * Handle Spotify OAuth callback
 */
app.get('/api/callback', async (req, res) => {
  const { code, state, error } = req.query;

  if (error) {
    return res.redirect(`${process.env.CLIENT_URL}?error=${error}`);
  }

  if (!code || !state) {
    return res.redirect(`${process.env.CLIENT_URL}?error=missing_parameters`);
  }

  try {
    // Retrieve PKCE values
    const sessionData = userSessions.get(state);
    if (!sessionData) {
      return res.redirect(`${process.env.CLIENT_URL}?error=invalid_state`);
    }

    const { codeVerifier } = sessionData;
    userSessions.delete(state); // Clean up

    // Exchange code for tokens
    const tokenResponse = await axios.post(`${SPOTIFY_AUTH_BASE}/api/token`, new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: REDIRECT_URI,
      client_id: SPOTIFY_CLIENT_ID,
      client_secret: SPOTIFY_CLIENT_SECRET,
      code_verifier: codeVerifier
    }), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    const { access_token, refresh_token, expires_in } = tokenResponse.data;
    
    // Generate session ID
    const sessionId = crypto.randomBytes(32).toString('hex');
    
    // Store tokens (use secure database in production)
    userSessions.set(sessionId, {
      accessToken: access_token,
      refreshToken: refresh_token,
      expiresAt: Date.now() + (expires_in * 1000),
      timestamp: Date.now()
    });

    // Redirect to frontend with session ID
    res.redirect(`${process.env.CLIENT_URL}?session=${sessionId}&success=true`);
  } catch (error) {
    console.error('OAuth callback error:', error.response?.data || error.message);
    res.redirect(`${process.env.CLIENT_URL}?error=auth_failed`);
  }
});

/**
 * Refresh access token
 */
async function refreshAccessToken(sessionId) {
  const session = userSessions.get(sessionId);
  if (!session || !session.refreshToken) {
    throw new Error('No valid refresh token');
  }

  try {
    const response = await axios.post(`${SPOTIFY_AUTH_BASE}/api/token`, new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: session.refreshToken,
      client_id: SPOTIFY_CLIENT_ID,
      client_secret: SPOTIFY_CLIENT_SECRET
    }), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    const { access_token, expires_in, refresh_token } = response.data;
    
    // Update session
    session.accessToken = access_token;
    session.expiresAt = Date.now() + (expires_in * 1000);
    if (refresh_token) {
      session.refreshToken = refresh_token;
    }
    
    userSessions.set(sessionId, session);
    return access_token;
  } catch (error) {
    console.error('Token refresh error:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Middleware to ensure valid access token
 */
async function requireAuth(req, res, next) {
  const sessionId = req.headers.authorization?.replace('Bearer ', '');
  
  if (!sessionId) {
    return res.status(401).json({ error: 'No session provided' });
  }

  const session = userSessions.get(sessionId);
  if (!session) {
    return res.status(401).json({ error: 'Invalid session' });
  }

  // Check if token is expired
  if (Date.now() >= session.expiresAt - 60000) { // Refresh 1 minute before expiry
    try {
      await refreshAccessToken(sessionId);
    } catch (error) {
      return res.status(401).json({ error: 'Failed to refresh token' });
    }
  }

  req.accessToken = session.accessToken;
  req.sessionId = sessionId;
  next();
}

/**
 * Get user profile
 */
app.get('/api/user', requireAuth, async (req, res) => {
  try {
    const response = await axios.get(`${SPOTIFY_API_BASE}/me`, {
      headers: {
        'Authorization': `Bearer ${req.accessToken}`
      }
    });

    res.json(response.data);
  } catch (error) {
    console.error('Get user error:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({ 
      error: 'Failed to get user profile' 
    });
  }
});

/**
 * Search for artists
 */
app.get('/api/search/artists', requireAuth, async (req, res) => {
  const { q, limit = 10 } = req.query;

  if (!q) {
    return res.status(400).json({ error: 'Query parameter is required' });
  }

  try {
    const response = await axios.get(`${SPOTIFY_API_BASE}/search`, {
      headers: {
        'Authorization': `Bearer ${req.accessToken}`
      },
      params: {
        q,
        type: 'artist',
        limit: Math.min(limit, 50)
      }
    });

    const artists = response.data.artists.items.map(artist => ({
      id: artist.id,
      name: artist.name,
      image: artist.images[artist.images.length - 1]?.url,
      followers: artist.followers.total
    }));

    res.json({ artists });
  } catch (error) {
    console.error('Search artists error:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({ 
      error: 'Failed to search artists' 
    });
  }
});

/**
 * Get recommendations
 */
app.post('/api/recommendations', requireAuth, async (req, res) => {
  const { 
    seed_genres = [], 
    seed_artists = [], 
    limit = 20,
    target_danceability,
    target_energy,
    target_valence
  } = req.body;

  // Validate seeds (Spotify requires at least 1 seed, max 5 total)
  const totalSeeds = seed_genres.length + seed_artists.length;
  if (totalSeeds === 0) {
    return res.status(400).json({ error: 'At least one seed is required' });
  }
  if (totalSeeds > 5) {
    return res.status(400).json({ error: 'Maximum 5 seeds allowed' });
  }

  try {
    const params = {
      limit: Math.min(limit, 100),
    };

    if (seed_genres.length > 0) {
      params.seed_genres = seed_genres.slice(0, 5).join(',');
    }
    if (seed_artists.length > 0) {
      params.seed_artists = seed_artists.slice(0, 5).join(',');
    }
    if (target_danceability !== undefined) {
      params.target_danceability = target_danceability;
    }
    if (target_energy !== undefined) {
      params.target_energy = target_energy;
    }
    if (target_valence !== undefined) {
      params.target_valence = target_valence;
    }

    const response = await axios.get(`${SPOTIFY_API_BASE}/recommendations`, {
      headers: {
        'Authorization': `Bearer ${req.accessToken}`
      },
      params
    });

    const tracks = response.data.tracks.map(track => ({
      id: track.id,
      name: track.name,
      artist: track.artists[0]?.name,
      artists: track.artists.map(artist => ({ id: artist.id, name: artist.name })),
      album: {
        name: track.album.name,
        image: track.album.images[0]?.url
      },
      uri: track.uri,
      preview_url: track.preview_url,
      duration_ms: track.duration_ms,
      popularity: track.popularity
    }));

    res.json({ tracks });
  } catch (error) {
    console.error('Get recommendations error:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({ 
      error: 'Failed to get recommendations' 
    });
  }
});

/**
 * Create playlist
 */
app.post('/api/playlists', requireAuth, async (req, res) => {
  const { name, description = 'Created with AI Playlist Generator', public = false } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Playlist name is required' });
  }

  try {
    // Get user ID first
    const userResponse = await axios.get(`${SPOTIFY_API_BASE}/me`, {
      headers: {
        'Authorization': `Bearer ${req.accessToken}`
      }
    });

    const userId = userResponse.data.id;

    // Create playlist
    const playlistResponse = await axios.post(
      `${SPOTIFY_API_BASE}/users/${userId}/playlists`,
      {
        name,
        description,
        public
      },
      {
        headers: {
          'Authorization': `Bearer ${req.accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const playlist = {
      id: playlistResponse.data.id,
      name: playlistResponse.data.name,
      description: playlistResponse.data.description,
      external_urls: playlistResponse.data.external_urls,
      tracks: playlistResponse.data.tracks
    };

    res.json({ playlist });
  } catch (error) {
    console.error('Create playlist error:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({ 
      error: 'Failed to create playlist' 
    });
  }
});

/**
 * Add tracks to playlist
 */
app.post('/api/playlists/:playlistId/tracks', requireAuth, async (req, res) => {
  const { playlistId } = req.params;
  const { uris } = req.body;

  if (!uris || !Array.isArray(uris) || uris.length === 0) {
    return res.status(400).json({ error: 'Track URIs are required' });
  }

  try {
    const response = await axios.post(
      `${SPOTIFY_API_BASE}/playlists/${playlistId}/tracks`,
      { uris: uris.slice(0, 100) }, // Spotify limit is 100 tracks per request
      {
        headers: {
          'Authorization': `Bearer ${req.accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    res.json({ snapshot_id: response.data.snapshot_id });
  } catch (error) {
    console.error('Add tracks error:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({ 
      error: 'Failed to add tracks to playlist' 
    });
  }
});

/**
 * Get available genres
 */
app.get('/api/genres', requireAuth, async (req, res) => {
  try {
    const response = await axios.get(`${SPOTIFY_API_BASE}/recommendations/available-genre-seeds`, {
      headers: {
        'Authorization': `Bearer ${req.accessToken}`
      }
    });

    res.json({ genres: response.data.genres });
  } catch (error) {
    console.error('Get genres error:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({ 
      error: 'Failed to get available genres' 
    });
  }
});

/**
 * Get user's top artists
 */
app.get('/api/user/top/artists', requireAuth, async (req, res) => {
  const { limit = 20, time_range = 'medium_term' } = req.query;

  try {
    const response = await axios.get(`${SPOTIFY_API_BASE}/me/top/artists`, {
      headers: {
        'Authorization': `Bearer ${req.accessToken}`
      },
      params: {
        limit: Math.min(limit, 50),
        time_range
      }
    });

    const artists = response.data.items.map(artist => ({
      id: artist.id,
      name: artist.name,
      image: artist.images[artist.images.length - 1]?.url,
      genres: artist.genres,
      popularity: artist.popularity
    }));

    res.json({ artists });
  } catch (error) {
    console.error('Get top artists error:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({ 
      error: 'Failed to get top artists' 
    });
  }
});

/**
 * Logout - clear session
 */
app.post('/api/logout', (req, res) => {
  const sessionId = req.headers.authorization?.replace('Bearer ', '');
  if (sessionId) {
    userSessions.delete(sessionId);
  }
  res.json({ message: 'Logged out successfully' });
});

/**
 * Health check
 */
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    activeSessions: userSessions.size
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🎵 Spotify Client ID: ${SPOTIFY_CLIENT_ID ? 'Configured' : 'Missing'}`);
  console.log(`🔒 Client Secret: ${SPOTIFY_CLIENT_SECRET ? 'Configured' : 'Missing'}`);
  console.log(`📍 Redirect URI: ${REDIRECT_URI}`);
});

module.exports = app;
