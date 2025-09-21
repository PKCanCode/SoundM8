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
  sessionId = null;
  localStorage.removeItem('spotify_session');
};

/**
 * Make authenticated API request
 */
const apiRequest = async (endpoint: string, options: RequestInit = {}) => {
  const session = getSession();
  if (!session) {
    throw new Error('No session available');
  }

  const url = `${API_BASE}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${session}`,
    ...options.headers,
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    // Session expired
    clearSession();
    throw new Error('Session expired');
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
};

/**
 * Initiate Spotify login
 */
export const initiateLogin = async (): Promise<string> => {
  try {
    const response = await fetch(`${API_BASE}/login`);
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Failed to get auth URL');
    }

    return data.authUrl;
  } catch (error) {
    console.error('Login initiation failed:', error);
    throw error;
  }
};

/**
 * Check if user is authenticated
 */
export const isAuthenticated = (): boolean => {
  return !!getSession();
};

/**
 * Handle login callback (extract session from URL)
 */
export const handleCallback = (): { success: boolean; error?: string } => {
  const urlParams = new URLSearchParams(window.location.search);
  const session = urlParams.get('session');
  const success = urlParams.get('success');
  const error = urlParams.get('error');

  if (error) {
    return { success: false, error };
  }

  if (success && session) {
    setSession(session);
    // Clean URL
    window.history.replaceState({}, document.title, window.location.pathname);
    return { success: true };
  }

  return { success: false, error: 'Invalid callback' };
};

/**
 * Get user profile
 */
export const getUserProfile = async (): Promise<User> => {
  return apiRequest('/user');
};

/**
 * Search for artists
 */
export const searchArtists = async (query: string): Promise<SpotifyArtist[]> => {
  if (!query.trim()) return [];

  try {
    const data = await apiRequest(`/search/artists?q=${encodeURIComponent(query)}&limit=10`);
    return data.artists || [];
  } catch (error) {
    console.error('Artist search failed:', error);
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
    const data = await apiRequest('/recommendations', {
      method: 'POST',
      body: JSON.stringify(params),
    });
    return data.tracks || [];
  } catch (error) {
    console.error('Get recommendations failed:', error);
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
    const data = await apiRequest('/playlists', {
      method: 'POST',
      body: JSON.stringify({ name, description }),
    });
    return data.playlist;
  } catch (error) {
    console.error('Create playlist failed:', error);
    throw error;
  }
};

/**
 * Add tracks to playlist
 */
export const addTracksToPlaylist = async (
  playlistId: string,
  trackUris: string[]
): Promise<{ snapshot_id: string }> => {
  try {
    const data = await apiRequest(`/playlists/${playlistId}/tracks`, {
      method: 'POST',
      body: JSON.stringify({ uris: trackUris }),
    });
    return data;
  } catch (error) {
    console.error('Add tracks failed:', error);
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
    // Create playlist
    const playlist = await createPlaylist(name, description);
    
    // Add tracks if provided
    if (trackUris.length > 0) {
      await addTracksToPlaylist(playlist.id, trackUris);
    }
    
    return playlist;
  } catch (error) {
    console.error('Create playlist with tracks failed:', error);
    throw error;
  }
};

/**
 * Get available genres
 */
export const getAvailableGenres = async (): Promise<string[]> => {
  try {
    const data = await apiRequest('/genres');
    return data.genres || [];
  } catch (error) {
    console.error('Get genres failed:', error);
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
    const data = await apiRequest(`/user/top/artists?time_range=${timeRange}&limit=${limit}`);
    return data.artists || [];
  } catch (error) {
    console.error('Get top artists failed:', error);
    return [];
  }
};

/**
 * Logout user
 */
export const logout = async (): Promise<void> => {
  try {
    if (getSession()) {
      await apiRequest('/logout', { method: 'POST' });
    }
  } catch (error) {
    console.error('Logout failed:', error);
  } finally {
    clearSession();
  }
};

// Legacy functions for backward compatibility
export const getSpotifyAuthUrl = initiateLogin;
export const extractAccessTokenFromUrl = handleCallback;
export const getAccessToken = () => getSession();
export const setAccessToken = setSession;
