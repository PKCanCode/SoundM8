// Spotify API configuration
const SPOTIFY_CLIENT_ID = "f65ac553e6794032bcacd85ae7b5dd85";
const SPOTIFY_REDIRECT_URI = "http://127.0.0.1:3000";

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

// Note: This is a client-side implementation for demo purposes
// In production, you should use the Authorization Code Flow with a backend
let accessToken: string | null = null;

export const getSpotifyAuthUrl = () => {
  const scopes = [
    'playlist-modify-public',
    'playlist-modify-private',
    'user-read-private'
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
    // Clean up the URL
    window.history.replaceState({}, document.title, window.location.pathname);
    return token;
  }
  
  return null;
};

export const setAccessToken = (token: string) => {
  accessToken = token;
};

export const getAccessToken = (): string | null => {
  return accessToken;
};

export const searchArtists = async (query: string): Promise<{ id: string; name: string; image?: string }[]> => {
  if (!accessToken) {
    console.warn("No Spotify access token available");
    // Return mock data for demo
    return [
      { id: query.toLowerCase(), name: query, image: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=64&h=64&fit=crop" }
    ];
  }

  try {
    const response = await fetch(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=artist&limit=10`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      }
    );

    if (!response.ok) {
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
      { id: query.toLowerCase(), name: query, image: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=64&h=64&fit=crop" }
    ];
  }
};

export const getUserProfile = async () => {
  if (!accessToken) {
    throw new Error("No access token available");
  }

  const response = await fetch('https://api.spotify.com/v1/me', {
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to get user profile: ${response.status}`);
  }

  return response.json();
};

export const createPlaylist = async (name: string, trackUris: string[]) => {
  if (!accessToken) {
    throw new Error("No access token available");
  }

  // Get user profile to get user ID
  const userProfile = await getUserProfile();
  
  // Create playlist
  const playlistResponse = await fetch(`https://api.spotify.com/v1/users/${userProfile.id}/playlists`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name,
      description: 'Playlist created with Lovable Spotify Generator',
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
        'Authorization': `Bearer ${accessToken}`,
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
};