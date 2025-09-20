// Spotify API configuration
// Note: You should use environment variables for these values
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

// Note: This is a client-side implementation for demo purposes
// In production, you should use the Authorization Code Flow with a backend
let accessToken: string | null = null;

export const getSpotifyAuthUrl = () => {
  const scopes = [
    'playlist-modify-public',
    'playlist-modify-private',
    'user-read-private',
    'user-read-email'
  ].join('
