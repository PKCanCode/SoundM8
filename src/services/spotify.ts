
const SPOTIFY_CLIENT_ID = import.meta.env.VITE_SPOTIFY_CLIENT_ID || "f65ac553e6794032bcacd85ae7b5dd85";
const SPOTIFY_REDIRECT_URI = import.meta.env.VITE_SPOTIFY_REDIRECT_URI || "http://localhost:3000";

interface SpotifyArtist {
  id: string;
  name: string;
  images: { url: string; width: number; height: number }[];
}

interface SpotifySearchResponse {
  artists: {
    items: SpotifyArtist[];
  };
}

interface SpotifyTrack {
  id: string;
  name: string;
  artists: { name: string }[];
  album: {
    images: { url: string }[];
  };
  uri: string;
}

interface SpotifyRecommendationsResponse {
  tracks: SpotifyTrack[];
}

// Client-side token storage (in memory for security)
let accessToken: string | null = null;

export const getSpotifyAuthUrl = () => {
  if (!SPOTIFY_CLIENT_ID) {
    throw new Error('Spotify Client ID is not configured');
  }

  const scopes = [
    'playlist-modify-public',
    'playlist-modify-private',
    'user-read-private',
    'user-read-email'
  ].join(' ');

  const params = new URLSearchParams({
    client_id: SPOTIFY_CLIENT_ID,
    response_type: 'token',
    redirect_uri: SPOTIFY_REDIRECT_URI,
    scope: scopes,
    show_dialog: 'true'
  });

  return `https://accounts.spotify.com/authorize?${params.toString()}`;
};

export const extractAccessTokenFromUrl = (): string | null => {
  const hash = window.location.hash.substring(1);
  const params = new URLSearchParams(hash);
  const token = params.get('access_token');
  
  if (token) {
    accessToken = token;
    // Store in window object as backup
    (window as any).spotifyAccessToken = token;
    // Clean up the URL
    window.history.replaceState({}, document.title, window.location.pathname);
    return token;
  }
  
  return null;
};

export const setAccessToken = (token: string) => {
  accessToken = token;
  (window as any).spotifyAccessToken = token;
};

export const getAccessToken = (): string | null => {
  return accessToken || (window as any).spotifyAccessToken || null;
};

export const searchArtists = async (query: string): Promise<{ id: string; name: string; image?: string }[]> => {
  const token = getAccessToken();
  
  if (!token) {
    console.warn("No Spotify access token available");
    // Return mock data for demo
    return [
      { id: query.toLowerCase().replace(/\s+/g, '-'), name: query, image: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=64&h=64&fit=crop" }
    ];
  }

  if (!query.trim()) {
    return [];
  }

  try {
    const response = await fetch(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=artist&limit=10`,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );

    if (!response.ok) {
      if (response.status === 401) {
        // Token expired
        accessToken = null;
        (window as any).spotifyAccessToken = null;
        throw new Error('Access token expired');
      }
      throw new Error(`Spotify API error: ${response.status}`);
    }

    const data: SpotifySearchResponse = await response.json();
    
    return data.artists.items.map(artist => ({
      id: artist.id,
      name: artist.name,
      image: artist.images[artist.images.length - 1]?.url // Get smallest image
    }));
  } catch (error) {
    console.error("Error searching artists:", error);
    // Return mock data as fallback
    return [
      { id: query.toLowerCase().replace(/\s+/g, '-'), name: query, image: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=64&h=64&fit=crop" }
    ];
  }
};

export const getRecommendations = async (
  genres: string[] = [],
  artistIds: string[] = [],
  limit: number = 20
): Promise<SpotifyTrack[]> => {
  const token = getAccessToken();
  
  if (!token) {
    throw new Error("No access token available");
  }

  // Build query parameters
  const params = new URLSearchParams({
    limit: limit.toString(),
  });

  // Add seed genres (max 5)
  if (genres.length > 0) {
    const seedGenres = genres.slice(0, 5).map(g => g.toLowerCase().replace(/\s+/g, '-'));
    params.append('seed_genres', seedGenres.join(','));
  }

  // Add seed artists (max 5)
  if (artistIds.length > 0) {
    params.append('seed_artists', artistIds.slice(0, 5).join(','));
  }

  // If no seeds provided, use popular genres
  if (genres.length === 0 && artistIds.length === 0) {
    params.set('seed_genres', 'pop,rock,electronic');
  }

  try {
    const response = await fetch(
      `https://api.spotify.com/v1/recommendations?${params.toString()}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );

    if (!response.ok) {
      if (response.status === 401) {
        accessToken = null;
        (window as any).spotifyAccessToken = null;
        throw new Error('Access token expired');
      }
      throw new Error(`Spotify API error: ${response.status}`);
    }

    const data: SpotifyRecommendationsResponse = await response.json();
    return data.tracks || [];
  } catch (error) {
    console.error("Error getting recommendations:", error);
    throw error;
  }
};

export const getUserProfile = async () => {
  const token = getAccessToken();
  
  if (!token) {
    throw new Error("No access token available");
  }

  const response = await fetch('https://api.spotify.com/v1/me', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  if (!response.ok) {
    if (response.status === 401) {
      accessToken = null;
      (window as any).spotifyAccessToken = null;
      throw new Error('Access token expired');
    }
    throw new Error(`Failed to get user profile: ${response.status}`);
  }

  return response.json();
};

export const createPlaylist = async (name: string, trackUris: string[]) => {
  const token = getAccessToken();
  
  if (!token) {
    throw new Error("No access token available");
  }

  try {
    // Get user profile to get user ID
    const userProfile = await getUserProfile();
    
    // Create playlist
    const playlistResponse = await fetch(`https://api.spotify.com/v1/users/${userProfile.id}/playlists`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name,
        description: 'Playlist created with AI Playlist Generator',
        public: false
      })
    });

    if (!playlistResponse.ok) {
      throw new Error(`Failed to create playlist: ${playlistResponse.status}`);
    }

    const playlist = await playlistResponse.json();

    // Add tracks to playlist
    if (trackUris.length > 0) {
      const addTracksResponse = await fetch(`https://api.spotify.com/v1/playlists/${playlist.id}/tracks`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          uris: trackUris
        })
      });

      if (!addTracksResponse.ok) {
        throw new Error(`Failed to add tracks to playlist: ${addTracksResponse.status}`);
      }
    }

    return playlist;
  } catch (error) {
    if (error instanceof Error && error.message === 'Access token expired') {
      throw new Error('Your Spotify session has expired. Please log in again.');
    }
    throw error;
  }
};
