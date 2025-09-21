// backend/server.js
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
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Spotify API configuration
const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI || 'http://localhost:5000/api/callback';
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3000';
// Corrected Spotify API Base URLs
const SPOTIFY_API_BASE = 'https://api.spotify.com/v1';
const SPOTIFY_AUTH_BASE = 'https://accounts.spotify.com';

// Validate required environment variables
if (!SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET) {
  console.error('❌ Missing required Spotify credentials in environment variables');
  console.error('Please check your SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET');
  process.exit(1);
}

// In-memory storage for demo (use Redis/Database in production)
const userSessions = new Map();

// Clean up expired sessions periodically
setInterval(() => {
  const now = Date.now();
  for (const [sessionId, session] of userSessions.entries()) {
    if (now > session.expiresAt) {
      console.log(`Cleaning up expired session: ${sessionId}`);
      userSessions.delete(sessionId);
    }
  }
}, 60000); // Check every minute

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
    
    // Store PKCE values temporarily
    userSessions.set(state, { 
      codeVerifier, 
      timestamp: Date.now(),
      expiresAt: Date.now() + 10 * 60 * 1000 // 10 minutes
    });
    
    const scopes = [
      'user-read-email',
      'user-read-private',
      'playlist-modify-public',
      'playlist-modify-private',
      'user-top-read',
      'user-read-recently-played'
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

    console.log(`🔐 Generated auth URL for state: ${state}`);
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
  
  console.log(`🔄 Callback received - State: ${state}, Error: ${error}`);

  if (error) {
    console.error(`❌ OAuth error: ${error}`);
    return res.redirect(`${CLIENT_URL}?error=${error}`);
  }

  if (!code || !state) {
    console.error('❌ Missing code or state parameters');
    return res.redirect(`${CLIENT_URL}?error=missing_parameters`);
  }

  try {
    // Retrieve PKCE values
    const sessionData = userSessions.get(state);
    if (!sessionData || !sessionData.codeVerifier) {
      console.error(`❌ Invalid or expired state: ${state}`);
      return res.redirect(`${CLIENT_URL}?error=invalid_state`);
    }

    const { codeVerifier } = sessionData;
    userSessions.delete(state); // Clean up PKCE data

    console.log('🔑 Exchanging authorization code for tokens...');

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
    
    // Store tokens
    userSessions.set(sessionId, {
      accessToken: access_token,
      refreshToken: refresh_token,
      expiresAt: Date.now() + (expires_in * 1000),
      timestamp: Date.now()
    });

    console.log(`✅ Successfully authenticated user with session: ${sessionId}`);
    
    // Redirect to frontend with session ID
    res.redirect(`${CLIENT_URL}?session=${sessionId}&success=true`);
  } catch (error) {
    console.error('❌ OAuth callback error:', error.response?.data || error.message);
    res.redirect(`${CLIENT_URL}?error=auth_failed`);
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

  console.log(`🔄 Refreshing token for session: ${sessionId}`);

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
    console.log(`✅ Token refreshed successfully for session: ${sessionId}`);
    return access_token;
  } catch (error) {
    console.error('❌ Token refresh error:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Middleware to ensure valid access token
 */
async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  const sessionId = authHeader?.replace('Bearer ', '');
  
  if (!sessionId) {
    return res.status(401).json({ error: 'No session provided' });
  }

  const session = userSessions.get(sessionId);
  if (!session) {
    return res.status(401).json({ error: 'Invalid session' });
  }

  // Check if token is expired (refresh 1 minute before expiry)
  if (Date.now() >= session.expiresAt - 60000) {
    try {
      await refreshAccessToken(sessionId);
    } catch (error) {
      console.error(`❌ Failed to refresh token for session: ${sessionId}`);
      userSessions.delete(sessionId);
      return res.status(401).json({ error: 'Failed to refresh token' });
    }
  }

  req.accessToken = userSessions.get(sessionId).accessToken;
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
    console.error('❌ Get user error:', error.response?.data || error.message);
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
        limit: Math.min(parseInt(limit), 50)
      }
    });

    const artists = response.data.artists.items.map(artist => ({
      id: artist.id,
      name: artist.name,
      image: artist.images && artist.images.length > 0 ? artist.images[artist.images.length - 1].url : null,
      followers: artist.followers.total
    }));

    res.json({ artists });
  } catch (error) {
    console.error('❌ Search artists error:', error.response?.data || error.message);
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
      limit: Math.min(parseInt(limit), 100),
    };

    if (seed_genres.length > 0) {
      params.seed_genres = seed_genres.slice(0, 5).join(',');
    }
    if (seed_artists.length > 0) {
      params.seed_artists = seed_artists.slice(0, 5).join(',');
    }
    if (target_danceability !== undefined) {
      params.target_danceability = parseFloat(target_danceability);
    }
    if (target_energy !== undefined) {
      params.target_energy = parseFloat(target_energy);
    }
    if (target_valence !== undefined) {
      params.target_valence = parseFloat(target_valence);
    }

    console.log(`🎵 Getting recommendations with params:`, params);

    const response = await axios.get(`${SPOTIFY_API_BASE}/recommendations`, {
      headers: {
        'Authorization': `Bearer ${req.accessToken}`
      },
      params
    });

    const tracks = response.data.tracks.map(track => ({
      id: track.id,
      name: track.name,
      artist: track.artists[0]?.name || 'Unknown Artist',
      artists: track.artists.map(artist => ({ id: artist.id, name: artist.name })),
      album: {
        name: track.album.name,
        image: track.album.images && track.album.images.length > 0 ? track.album.images[0].url : null
      },
      uri: track.uri,
      preview_url: track.preview_url,
      duration_ms: track.duration_ms,
      popularity: track.popularity
    }));

    console.log(`✅ Found ${tracks.length} recommendations`);
    res.json({ tracks });
  } catch (error) {
    console.error('❌ Get recommendations error:', error.response?.data || error.message);
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

  if (!name || name.trim() === '') {
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

    console.log(`📝 Creating playlist "${name}" for user ${userId}`);

    // Create playlist
    const playlistResponse = await axios.post(
      `${SPOTIFY_API_BASE}/users/${userId}/playlists`,
      {
        name: name.trim(),
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

    console.log(`✅ Created playlist with ID: ${playlist.id}`);
    res.json({ playlist });
  } catch (error) {
    console.error('❌ Create playlist error:', error.response?.data || error.message);
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

  // Validate URIs
  const validUris = uris.filter(uri => uri && typeof uri === 'string' && uri.startsWith('spotify:track:'));
  if (validUris.length === 0) {
    return res.status(400).json({ error: 'No valid Spotify track URIs provided' });
  }

  try {
    console.log(`🎵 Adding ${validUris.length} tracks to playlist ${playlistId}`);

    const response = await axios.post(
      `${SPOTIFY_API_BASE}/playlists/${playlistId}/tracks`,
      { uris: validUris.slice(0, 100) }, // Spotify limit is 100 tracks per request
      {
        headers: {
          'Authorization': `Bearer ${req.accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log(`✅ Successfully added tracks to playlist`);
    res.json({ snapshot_id: response.data.snapshot_id, added_tracks: validUris.length });
  } catch (error) {
    console.error('❌ Add tracks error:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({ 
      error: 'Failed to add tracks to playlist' 
    });
  }
});

/**
 * Remove tracks from playlist
 */
app.delete('/api/playlists/:playlistId/tracks', requireAuth, async (req, res) => {
  const { playlistId } = req.params;
  const { uris } = req.body;

  if (!uris || !Array.isArray(uris) || uris.length === 0) {
    return res.status(400).json({ error: 'Track URIs are required' });
  }

  try {
    console.log(`🗑️ Removing ${uris.length} tracks from playlist ${playlistId}`);

    const tracks = uris.map(uri => ({ uri }));

    const response = await axios.delete(
      `${SPOTIFY_API_BASE}/playlists/${playlistId}/tracks`,
      {
        headers: {
          'Authorization': `Bearer ${req.accessToken}`,
          'Content-Type': 'application/json'
        },
        data: { tracks: tracks.slice(0, 100) } // Spotify limit
      }
    );

    console.log(`✅ Successfully removed tracks from playlist`);
    res.json({ snapshot_id: response.data.snapshot_id, removed_tracks: uris.length });
  } catch (error) {
    console.error('❌ Remove tracks error:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({ 
      error: 'Failed to remove tracks from playlist' 
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

    console.log(`✅ Retrieved ${response.data.genres.length} available genres`);
    res.json({ genres: response.data.genres });
  } catch (error) {
    console.error('❌ Get genres error:', error.response?.data || error.message);
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

  // Validate time_range
  const validTimeRanges = ['short_term', 'medium_term', 'long_term'];
  if (!validTimeRanges.includes(time_range)) {
    return res.status(400).json({ error: 'Invalid time_range parameter' });
  }

  try {
    const response = await axios.get(`${SPOTIFY_API_BASE}/me/top/artists`, {
      headers: {
        'Authorization': `Bearer ${req.accessToken}`
      },
      params: {
        limit: Math.min(parseInt(limit), 50),
        time_range
      }
    });

    const artists = response.data.items.map(artist => ({
      id: artist.id,
      name: artist.name,
      image: artist.images && artist.images.length > 0 ? artist.images[artist.images.length - 1].url : null,
      genres: artist.genres,
      popularity: artist.popularity
    }));

    console.log(`✅ Retrieved ${artists.length} top artists for time range: ${time_range}`);
    res.json({ artists });
  } catch (error) {
    console.error('❌ Get top artists error:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({ 
      error: 'Failed to get top artists' 
    });
  }
});

/**
 * Get user's playlists
 */
app.get('/api/user/playlists', requireAuth, async (req, res) => {
  const { limit = 20, offset = 0 } = req.query;

  try {
    const response = await axios.get(`${SPOTIFY_API_BASE}/me/playlists`, {
      headers: {
        'Authorization': `Bearer ${req.accessToken}`
      },
      params: {
        limit: Math.min(parseInt(limit), 50),
        offset: parseInt(offset)
      }
    });

    const playlists = response.data.items.map(playlist => ({
      id: playlist.id,
      name: playlist.name,
      description: playlist.description,
      tracks: playlist.tracks,
      external_urls: playlist.external_urls,
      images: playlist.images
    }));

    res.json({ playlists, total: response.data.total });
  } catch (error) {
    console.error('❌ Get playlists error:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({ 
      error: 'Failed to get user playlists' 
    });
  }
});

/**
 * Logout - clear session
 */
app.post('/api/logout', (req, res) => {
  const authHeader = req.headers.authorization;
  const sessionId = authHeader?.replace('Bearer ', '');
  
  if (sessionId && userSessions.has(sessionId)) {
    userSessions.delete(sessionId);
    console.log(`👋 User logged out, session ${sessionId} deleted`);
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
    activeSessions: userSessions.size,
    spotify: {
      clientId: SPOTIFY_CLIENT_ID ? 'Configured' : 'Missing',
      clientSecret: SPOTIFY_CLIENT_SECRET ? 'Configured' : 'Missing',
      redirectUri: REDIRECT_URI
    }
  });
});

/**
 * Get session info (for debugging)
 */
app.get('/api/session', requireAuth, (req, res) => {
  const session = userSessions.get(req.sessionId);
  res.json({
    sessionId: req.sessionId,
    expiresAt: new Date(session.expiresAt).toISOString(),
    timeUntilExpiry: Math.round((session.expiresAt - Date.now()) / 1000),
    hasRefreshToken: !!session.refreshToken
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('❌ Unhandled error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Start server
app.listen(PORT, () => {
  console.log('\n🚀 Spotify Playlist Generator Backend');
  console.log(`📍 Server running on port ${PORT}`);
  console.log(`🎵 Spotify Client ID: ${SPOTIFY_CLIENT_ID ? '✅ Configured' : '❌ Missing'}`);
  console.log(`🔒 Client Secret: ${SPOTIFY_CLIENT_SECRET ? '✅ Configured' : '❌ Missing'}`);
  console.log(`🔄 Redirect URI: ${REDIRECT_URI}`);
  console.log(`🌐 Client URL: ${CLIENT_URL}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
  console.log('\n💡 Make sure to set up your Spotify app with the correct redirect URI!');
});

module.exports = app;
