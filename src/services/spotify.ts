// Frontend Spotify Service - Communicates with Backend API

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

interface SpotifyArtist {
  id: string;
  name: string;
  image?: string;
  followers?: number;
}

interface SpotifyTrack {
  id: string;
  name: string;
  artist: string;
  artists: { id: string; name: string }[];
  album: {
    name: string;
    image: string;
  };
  uri: string;
  preview_url?: string;
  duration_ms: number;
  popularity: number;
}

interface SpotifyPlaylist {
  id: string;
  name: string;
  description: string;
  external_urls: {
    spotify: string;
  };
}

interface User {
  id: string;
  display_name: string;
  email: string;
  images: { url: string }[];
}

// Session management
let sessionId: string | null = null;

/**
 * Set session ID (called after successful login)
 */
export const setSession = (id: string) => {
  sessionId = id;
  localStorage.setItem('spotify_session', id);
  console.log('✅ Session set:', id.substring(0, 8) + '...');
};

/**
 * Get current session ID
 */
export const getSession = (): string | null => {
  if (!sessionId) {
    sessionId = localStorage.getItem('spotify_session');
  }
  return sessionId;
};

/**
 * Clear session (logout)
 */
export const clearSession = () => {
  console.log('🗑️ Clearing session');
  sessionId = null;
  localStorage.removeItem('spotify_session');
};

/**
 * Make authenticated API request with better error handling
 */
const apiRequest = async (endpoint: string, options: RequestInit = {}) => {
  const session = getSession();
  if (!session) {
    throw new Error('No session available. Please log in again.');
  }

  const url = `${API_BASE}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${session}`,
    ...options.headers,
  };

  console.log(`🔄 API Request: ${options.method || 'GET'} ${endpoint}`);

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    console.log(`📡 API Response: ${response.status} ${response.statusText}`);

    if (response.status === 401) {
      console.error('❌ Session expired, clearing session');
      clearSession();
      throw new Error('Session expired. Please log in again.');
    }

    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorMessage;
      } catch (e) {
        console.warn('Could not parse error response as JSON');
      }
      throw new Error(errorMessage);
    }

    const data = await response.json();
    console.log('✅ API Success:', Object.keys(data));
    return data;
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error('Cannot connect to server. Make sure the backend is running on port 5000.');
    }
    throw error;
  }
};

/**
 * Initiate Spotify login
 */
export const initiateLogin = async (): Promise<string> => {
  try {
    console.log('🔐 Initiating Spotify login...');
    const response = await fetch(`${API_BASE}/login`);
    
    if (!response.ok) {
      throw new Error(`Login request failed: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data.authUrl) {
      throw new Error('No authorization URL received from server');
    }

    console.log('✅ Got auth URL from server');
    return data.authUrl;
  } catch (error) {
    console.error('❌ Login initiation failed:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to initiate login');
  }
};

/**
 * Check if user is authenticated
 */
export const isAuthenticated = (): boolean => {
  const session = getSession();
  const authenticated = !!session;
  console.log('🔍 Authentication check:', authenticated ? 'Authenticated' : 'Not authenticated');
  return authenticated;
};

/**
 * Handle login callback (extract session from URL)
 */
export const handleCallback = (): { success: boolean; error?: string } => {
  const urlParams = new URLSearchParams(window.location.search);
  const session = urlParams.get('session');
  const success = urlParams.get('success');
  const error = urlParams.get('error');

  console.log('🔄 Handling callback:', { session: session?.substring(0, 8) + '...', success, error });

  if (error) {
    console.error('❌ Callback error:', error);
    return { success: false, error };
  }

  if (success && session) {
    setSession(session);
    // Clean URL
    window.history.replaceState({}, document.title, window.location.pathname);
    return { success: true };
  }

  return { success: false, error: 'Invalid callback parameters' };
};

/**
 * Get user profile
 */
export const getUserProfile = async (): Promise<User> => {
  console.log('👤 Getting user profile...');
  return apiRequest('/user');
};

/**
 * Search for artists
 */
export const searchArtists = async (query: string): Promise<SpotifyArtist[]> => {
  if (!query.trim()) return [];

  try {
    console.log('🔍 Searching artists:', query);
    const data = await apiRequest(`/search/artists?q=${encodeURIComponent(query)}&limit=10`);
    return data.artists || [];
  } catch (error) {
    console.error('❌ Artist search failed:', error);
    return [];
  }
};

/**
 * Get recommendations
 */
export const getRecommendations = async (params: {
  seed_genres?: string[];
  seed_artists?: string[];
  limit?: number;
  target_danceability?: number;
  target_energy?: number;
  target_valence?: number;
}): Promise<SpotifyTrack[]> => {
  try {
    console.log('🎵 Getting recommendations with params:', params);
    const data = await apiRequest('/recommendations', {
      method: 'POST',
      body: JSON.stringify(params),
    });
    console.log(`✅ Got ${data.tracks?.length || 0} recommendations`);
    return data.tracks || [];
  } catch (error) {
    console.error('❌ Get recommendations failed:', error);
    throw error;
  }
};

/**
 * Create a new playlist
 */
export const createPlaylist = async (
  name: string,
  description?: string
): Promise<SpotifyPlaylist> => {
  try {
    console.log('📝 Creating playlist:', name);
    const data = await apiRequest('/playlists', {
      method: 'POST',
      body: JSON.stringify({ name, description }),
    });
    console.log('✅ Playlist created:', data.playlist.id);
    return data.playlist;
  } catch (error) {
    console.error('❌ Create playlist failed:', error);
    throw error;
  }
};

/**
 * Add tracks to playlist
 */
export const addTracksToPlaylist = async (
  playlistId: string,
  trackUris: string[]
): Promise<{ snapshot_id: string; added_tracks: number }> => {
  try {
    console.log(`🎵 Adding ${trackUris.length} tracks to playlist ${playlistId}`);
    const data = await apiRequest(`/playlists/${playlistId}/tracks`, {
      method: 'POST',
      body: JSON.stringify({ uris: trackUris }),
    });
    console.log(`✅ Added ${data.added_tracks || trackUris.length} tracks to playlist`);
    return data;
  } catch (error) {
    console.error('❌ Add tracks failed:', error);
    throw error;
  }
};

/**
 * Create playlist with tracks in one go
 */
export const createPlaylistWithTracks = async (
  name: string,
  trackUris: string[],
  description?: string
): Promise<SpotifyPlaylist> => {
  try {
    console.log(`📝 Creating playlist "${name}" with ${trackUris.length} tracks`);
    
    // Validate track URIs
    const validUris = trackUris.filter(uri => 
      uri && typeof uri === 'string' && uri.startsWith('spotify:track:')
    );
    
    if (validUris.length === 0) {
      throw new Error('No valid Spotify track URIs provided');
    }

    if (validUris.length !== trackUris.length) {
      console.warn(`⚠️ Filtered out ${trackUris.length - validUris.length} invalid URIs`);
    }

    // Create playlist
    const playlist = await createPlaylist(name, description);
    
    // Add tracks if provided
    if (validUris.length > 0) {
      await addTracksToPlaylist(playlist.id, validUris);
    }
    
    console.log('✅ Playlist with tracks created successfully');
    return playlist;
  } catch (error) {
    console.error('❌ Create playlist with tracks failed:', error);
    throw error;
  }
};

/**
 * Get available genres
 */
export const getAvailableGenres = async (): Promise<string[]> => {
  try {
    console.log('🎭 Getting available genres...');
    const data = await apiRequest('/genres');
    console.log(`✅ Got ${data.genres?.length || 0} genres`);
    return data.genres || [];
  } catch (error) {
    console.error('❌ Get genres failed:', error);
    return [];
  }
};

/**
 * Get user's top artists
 */
export const getTopArtists = async (
  timeRange: 'short_term' | 'medium_term' | 'long_term' = 'medium_term',
  limit = 20
): Promise<SpotifyArtist[]> => {
  try {
    console.log(`👥 Getting top artists (${timeRange}, limit: ${limit})...`);
    const data = await apiRequest(`/user/top/artists?time_range=${timeRange}&limit=${limit}`);
    console.log(`✅ Got ${data.artists?.length || 0} top artists`);
    return data.artists || [];
  } catch (error) {
    console.error('❌ Get top artists failed:', error);
    return [];
  }
};

/**
 * Logout user
 */
export const logout = async (): Promise<void> => {
  try {
    console.log('👋 Logging out...');
    if (getSession()) {
      await apiRequest('/logout', { method: 'POST' });
    }
    console.log('✅ Logout successful');
  } catch (error) {
    console.error('❌ Logout failed:', error);
  } finally {
    clearSession();
  }
};

// Legacy functions for backward compatibility
export const getSpotifyAuthUrl = initiateLogin;
export const extractAccessTokenFromUrl = handleCallback;
export const getAccessToken = () => getSession();
export const setAccessToken = setSession;
