// src/services/spotify.ts
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

interface Artist {
  id: string;
  name: string;
  image?: string;
  followers?: number;
}

interface Track {
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

interface User {
  id: string;
  display_name: string;
  email: string;
  images: { url: string }[];
}

interface Playlist {
  id: string;
  name: string;
  description: string;
  external_urls: { spotify: string };
  tracks: any;
}

interface RecommendationParams {
  seed_genres?: string[];
  seed_artists?: string[];
  limit?: number;
  target_danceability?: number;
  target_energy?: number;
  target_valence?: number;
}

class SpotifyAPIError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SpotifyAPIError';
  }
}

// Session management
let sessionId: string | null = null;

export function getSessionId(): string | null {
  if (sessionId) return sessionId;
  
  // Try to get from URL parameters (OAuth callback)
  const urlParams = new URLSearchParams(window.location.search);
  const sessionFromUrl = urlParams.get('session');
  if (sessionFromUrl) {
    sessionId = sessionFromUrl;
    // Clean up URL
    window.history.replaceState({}, document.title, window.location.pathname);
    return sessionId;
  }
  
  // Try to get from localStorage
  sessionId = localStorage.getItem('spotify_session_id');
  return sessionId;
}

export function setSessionId(id: string): void {
  sessionId = id;
  localStorage.setItem('spotify_session_id', id);
}

export function clearSessionId(): void {
  sessionId = null;
  localStorage.removeItem('spotify_session_id');
}

export function isAuthenticated(): boolean {
  return !!getSessionId();
}

// Generic API call function
async function apiCall<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const currentSessionId = getSessionId();
  
  const config: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      ...(currentSessionId && { Authorization: `Bearer ${currentSessionId}` }),
      ...options.headers,
    },
    ...options,
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
  
  if (!response.ok) {
    if (response.status === 401) {
      clearSessionId();
      throw new SpotifyAPIError('Session expired');
    }
    
    let errorMessage = 'API request failed';
    try {
      const errorData = await response.json();
      errorMessage = errorData.error || errorMessage;
    } catch {
      // Use default message if JSON parsing fails
    }
    
    throw new SpotifyAPIError(errorMessage);
  }

  return response.json();
}

// Authentication functions
export async function initiateLogin(): Promise<string> {
  try {
    const response = await apiCall<{ authUrl: string }>('/login');
    return response.authUrl;
  } catch (error) {
    console.error('Login initiation failed:', error);
    throw new SpotifyAPIError('Failed to initiate login');
  }
}

export function handleCallback(): { success: boolean; error?: string } {
  const urlParams = new URLSearchParams(window.location.search);
  const error = urlParams.get('error');
  const sessionFromUrl = urlParams.get('session');
  const success = urlParams.get('success');

  if (error) {
    clearSessionId();
    return { success: false, error };
  }

  if (sessionFromUrl && success === 'true') {
    setSessionId(sessionFromUrl);
    // Clean up URL
    window.history.replaceState({}, document.title, window.location.pathname);
    return { success: true };
  }

  return { success: false };
}

export async function logout(): Promise<void> {
  try {
    await apiCall('/logout', { method: 'POST' });
  } catch (error) {
    console.error('Logout failed:', error);
  } finally {
    clearSessionId();
  }
}

// User functions
export async function getUserProfile(): Promise<User> {
  return apiCall<User>('/user');
}

// Search functions
export async function searchArtists(query: string, limit: number = 10): Promise<Artist[]> {
  const response = await apiCall<{ artists: Artist[] }>(`/search/artists?q=${encodeURIComponent(query)}&limit=${limit}`);
  return response.artists;
}

// Recommendations
export async function getRecommendations(params: RecommendationParams): Promise<Track[]> {
  const response = await apiCall<{ tracks: Track[] }>('/recommendations', {
    method: 'POST',
    body: JSON.stringify(params),
  });
  return response.tracks;
}

// Genres
export async function getAvailableGenres(): Promise<string[]> {
  const response = await apiCall<{ genres: string[] }>('/genres');
  return response.genres;
}

// Top artists
export async function getTopArtists(timeRange: 'short_term' | 'medium_term' | 'long_term' = 'medium_term', limit: number = 20): Promise<Artist[]> {
  const response = await apiCall<{ artists: Artist[] }>(`/user/top/artists?time_range=${timeRange}&limit=${limit}`);
  return response.artists;
}

// Playlist functions
export async function createPlaylistWithTracks(name: string, trackUris: string[], description?: string): Promise<Playlist> {
  // First create the playlist
  const playlist = await apiCall<{ playlist: Playlist }>('/playlists', {
    method: 'POST',
    body: JSON.stringify({
      name,
      description,
      public: false,
    }),
  });

  // Then add tracks to it
  if (trackUris.length > 0) {
    await apiCall(`/playlists/${playlist.playlist.id}/tracks`, {
      method: 'POST',
      body: JSON.stringify({ uris: trackUris }),
    });
  }

  return playlist.playlist;
}

export { SpotifyAPIError };
