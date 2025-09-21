const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Enhanced CORS configuration
app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      process.env.CLIENT_URL || 'http://localhost:3000',
      'http://localhost:3000',
      'http://127.0.0.1:3000'
    ];
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      return callback(null, true);
    } else {
      console.log('❌ CORS blocked origin:', origin);
      return callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Enhanced middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`\n📝 ${new Date().toISOString()} - ${req.method} ${req.path}`);
  if (req.headers.authorization) {
    console.log('🔑 Auth header present:', req.headers.authorization.substring(0, 20) + '...');
  }
  if (Object.keys(req.body).length > 0) {
    console.log('📦 Request body keys:', Object.keys(req.body));
  }
  next();
});

// Spotify API configuration
const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI || 'http://localhost:5000/api/callback';
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3000';
const SPOTIFY_API_BASE = 'https://api.spotify.com/v1';
const SPOTIFY_AUTH_BASE = 'https://accounts.spotify.com';

// Enhanced environment validation
if (!SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET) {
  console.error('❌ Missing required Spotify credentials!');
  console.error('Required environment variables:');
  console.error('- SPOTIFY_CLIENT_ID:', SPOTIFY_CLIENT_ID ? '✅' : '❌');
  console.error('- SPOTIFY_CLIENT_SECRET:', SPOTIFY_CLIENT_SECRET ? '✅' : '❌');
  console.error('Please check your .env file in the backend directory');
  process.exit(1);
}

console.log('\n🔧 Server Configuration:');
console.log('- Client ID:', SPOTIFY_CLIENT_ID ? '✅ Configured' : '❌ Missing');
console.log('- Client Secret:', SPOTIFY_CLIENT_SECRET ? '✅ Configured' : '❌ Missing');
console.log('- Redirect URI:', REDIRECT_URI);
console.log('- Client URL:', CLIENT_URL);

// In-memory storage
const userSessions = new Map();

// Session cleanup
setInterval(() => {
  const now = Date.now();
  let cleaned = 0;
  for (const [sessionId, session] of userSessions.entries()) {
    if (now > session.expiresAt) {
      userSessions.delete(sessionId);
      cleaned++;
    }
  }
  if (cleaned > 0) {
    console.log(`🧹 Cleaned up ${cleaned} expired sessions`);
  }
}, 5 * 60 * 1000); // Check every 5 minutes

/**
 * Generate PKCE codes
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
    console.log('🔐 Login request received');
    const state = crypto.randomBytes(16).toString('hex');
    const { codeVerifier, codeChallenge } = generatePKCE();
    
    userSessions.set(state, { 
      codeVerifier, 
      timestamp: Date.now(),
      expiresAt: Date.now() + 10 * 60 * 1000
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

    console.log('✅ Generated auth URL for state:', state.substring(0, 8) + '...');
    res.json({ authUrl: authUrl.toString() });
  } catch (error) {
    console.error('❌ Error generating auth URL:', error);
    res.status(500).json({ error: 'Failed to generate authorization URL' });
  }
});

/**
 * Handle Spotify OAuth callback
 */
app.get('/api/callback', async (req, res) => {
  const { code, state, error } = req.query;
  
  console.log(`🔄 OAuth callback - State: ${state?.substring(0, 8)}..., Error: ${error}`);

  if (error) {
    console.error(`❌ OAuth error: ${error}`);
    return res.redirect(`${CLIENT_URL}?error=${error}`);
  }

  if (!code || !state) {
    console.error('❌ Missing required parameters');
    return res.redirect(`${CLIENT_URL}?error=missing_parameters`);
  }

  try {
    const sessionData = userSessions.get(state);
    if (!sessionData?.codeVerifier) {
      console.error(`❌ Invalid or expired state: ${state}`);
      return res.redirect(`${CLIENT_URL}?error=invalid_state`);
    }

    const { codeVerifier } = sessionData;
    userSessions.delete(state);

    console.log('🔑 Exchanging code for tokens...');

    const tokenResponse = await axios.post(`${SPOTIFY_AUTH_BASE}/api/token`, 
      new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: REDIRECT_URI,
        client_id: SPOTIFY_CLIENT_ID,
        client_secret: SPOTIFY_CLIENT_SECRET,
        code_verifier: codeVerifier
      }), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      }
    );

    const { access_token, refresh_token, expires_in } = tokenResponse.data;
    const sessionId = crypto.randomBytes(32).toString('hex');
    
    userSessions.set(sessionId, {
      accessToken: access_token,
      refreshToken: refresh_token,
      expiresAt: Date.now() + (expires_in * 1000),
      timestamp: Date.now()
    });

    console.log(`✅ User authenticated - Session: ${sessionId.substring(0, 8)}...`);
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
  if (!session?.refreshToken) {
    throw new Error('No valid refresh token');
  }

  console.log(`🔄 Refreshing token for session: ${sessionId.substring(0, 8)}...`);

  try {
    const response = await axios.post(`${SPOTIFY_AUTH_BASE}/api/token`, 
      new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: session.refreshToken,
        client_id: SPOTIFY_CLIENT_ID,
        client_secret: SPOTIFY_CLIENT_SECRET
      }), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      }
    );

    const { access_token, expires_in, refresh_token } = response.data;
    
    session.accessToken = access_token;
    session.expiresAt = Date.now() + (expires_in * 1000);
    if (refresh_token) session.refreshToken = refresh_token;
    
    userSessions.set(sessionId, session);
    console.log(`✅ Token refreshed for session: ${sessionId.substring(0, 8)}...`);
    return access_token;
  } catch (error) {
    console.error('❌ Token refresh failed:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Authentication middleware with enhanced logging
 */
async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  const sessionId = authHeader?.replace('Bearer ', '');
  
  if (!sessionId) {
    console.error('❌ No session ID provided');
    return res.status(401).json({ error: 'No session provided' });
  }

  const session = userSessions.get(sessionId);
  if (!session) {
    console.error(`❌ Invalid session: ${sessionId.substring(0, 8)}...`);
    return res.status(401).json({ error: 'Invalid session' });
  }

  console.log(`🔍 Session check: ${sessionId.substring(0, 8)}... expires in ${Math.round((session.expiresAt - Date.now()) / 1000)}s`);

  // Refresh token if needed
  if (Date.now() >= session.expiresAt - 60000) {
    try {
      await refreshAccessToken(sessionId);
    } catch (error) {
      console.error(`❌ Token refresh failed for session: ${sessionId.substring(0, 8)}...`);
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
    console.log('👤 Getting user profile...');
    const response = await axios.get(`${SPOTIFY_API_BASE}/me`, {
      headers: { 'Authorization': `Bearer ${req.accessToken}` }
    });

    console.log('✅ Got user profile:', response.data.display_name);
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
    console.log('🔍 Searching artists:', q);
    const response = await axios.get(`${SPOTIFY_API_BASE}/search`, {
      headers: { 'Authorization': `Bearer ${req.accessToken}` },
      params: { q, type: 'artist', limit: Math.min(parseInt(limit), 50) }
    });

    const artists = response.data.artists.items.map(artist => ({
      id: artist.id,
      name: artist.name,
      image: artist.images?.[artist.images.length - 1]?.url,
      followers: artist.followers.total
    }));

    console.log(`✅ Found ${artists.length} artists`);
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

  console.log('🎵 Recommendations request:', { 
    genres: seed_genres.length, 
    artists: seed_artists.length, 
    limit 
  });

  const totalSeeds = seed_genres.length + seed_artists.length;
  if (totalSeeds === 0) {
    console.error('❌ No seeds provided');
    return res.status(400).json({ error: 'At least one seed is required' });
  }
  if (totalSeeds > 5) {
    console.error('❌ Too many seeds:', totalSeeds);
    return res.status(400).json({ error: 'Maximum 5 seeds allowed' });
  }

  try {
    const params = { limit: Math.min(parseInt(limit), 100) };
    
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

    console.log('📡 Spotify API params:', params);

    const response = await axios.get(`${SPOTIFY_API_BASE}/recommendations`, {
      headers: { 'Authorization': `Bearer ${req.accessToken}` },
      params
    });

    const tracks = response.data.tracks.map(track => ({
      id: track.id,
      name: track.name,
      artist: track.artists[0]?.name || 'Unknown Artist',
      artists: track.artists.map(artist => ({ id: artist.id, name: artist.name })),
      album: {
        name: track.album.name,
        image: track.album.images?.[0]?.url
      },
      uri: track.uri,
      preview_url: track.preview_url,
      duration_ms: track.duration_ms,
      popularity: track.popularity
    }));

    console.log(`✅ Got ${tracks.length} recommendations`);
