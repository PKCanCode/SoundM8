import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { SpotifyButton } from "@/components/SpotifyButton";
import { TrackCard } from "@/components/TrackCard";
import { MultiSelectInput } from "@/components/MultiSelectInput";
import { useToast } from "@/hooks/use-toast";
import { Music, Sparkles, Save, LogOut, Home, User, Loader2 } from "lucide-react";
import { 
  searchArtists, 
  isAuthenticated,
  getRecommendations,
  createPlaylistWithTracks,
  getAvailableGenres,
  getTopArtists,
  getUserProfile,
  logout 
} from "@/services/spotify";

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

interface Option {
  id: string;
  name: string;
  image?: string;
}

interface User {
  id: string;
  display_name: string;
  email: string;
  images: { url: string }[];
}

const PlaylistBuilder = () => {
  const [selectedGenres, setSelectedGenres] = useState<Option[]>([]);
  const [selectedArtists, setSelectedArtists] = useState<Option[]>([]);
  const [availableGenres, setAvailableGenres] = useState<Option[]>([]);
  const [playlistLength, setPlaylistLength] = useState([20]);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    // Check authentication and load initial data
    const initializeApp = async () => {
      if (!isAuthenticated()) {
        navigate("/login");
        return;
      }

      try {
        setIsLoading(true);
        
        // Load user profile and available genres concurrently
        const [userProfile, genres, topArtists] = await Promise.all([
          getUserProfile(),
          getAvailableGenres(),
          getTopArtists('medium_term', 10)
        ]);

        setUser(userProfile);
        setAvailableGenres(
          genres.map(genre => ({ id: genre, name: genre.charAt(0).toUpperCase() + genre.slice(1) }))
        );

        // Pre-populate with some top artists if available
        if (topArtists.length > 0) {
          setSelectedArtists(topArtists.slice(0, 3).map(artist => ({
            id: artist.id,
            name: artist.name,
            image: artist.image
          })));
        }

        toast({
          title: `Welcome, ${userProfile.display_name}!`,
          description: "Ready to create some amazing playlists?",
        });
      } catch (error) {
        console.error('Initialization failed:', error);
        if (error instanceof Error && error.message === 'Session expired') {
          navigate("/login");
        } else {
          toast({
            title: "Loading Error",
            description: "Failed to load your data. Please try refreshing.",
            variant: "destructive",
          });
        }
      } finally {
        setIsLoading(false);
      }
    };

    initializeApp();
  }, [navigate, toast]);

  const handleArtistSearch = async (query: string) => {
    try {
      const results = await searchArtists(query);
      return results.map(artist => ({
        id: artist.id,
        name: artist.name,
        image: artist.image
      }));
    } catch (error) {
      console.error('Error searching artists:', error);
      toast({
        title: "Search failed",
        description: "Unable to search artists. Please try again.",
        variant: "destructive",
      });
      return [];
    }
  };

  const fetchRecommendations = async () => {
    if (!canGenerate) return;

    setIsGenerating(true);
    
    try {
      const seedGenres = selectedGenres.map(g => g.id);
      const seedArtists = selectedArtists.map(a => a.id);
      
      console.log("Fetching recommendations:", { 
        genres: seedGenres, 
        artists: seedArtists, 
        length: playlistLength[0] 
      });

      const recommendations = await getRecommendations({
        seed_genres: seedGenres,
        seed_artists: seedArtists,
        limit: playlistLength[0],
        // Add some variety with audio features
        target_energy: 0.6,
        target_valence: 0.7
      });

      const formattedTracks: Track[] = recommendations.map((track) => ({
        id: track.id,
        name: track.name,
        artist: track.artist,
        artists: track.artists,
        album: track.album,
        uri: track.uri,
        preview_url: track.preview_url,
        duration_ms: track.duration_ms,
        popularity: track.popularity
      }));

      setTracks(formattedTracks);
      
      toast({
        title: "Songs generated!",
        description: `Found ${formattedTracks.length} perfect tracks for you.`,
      });
    } catch (error) {
      console.error('Error fetching recommendations:', error);
      toast({
        title: "Generation failed",
        description: error instanceof Error ? error.message : "Unable to generate recommendations. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const savePlaylist = async () => {
    if (tracks.length === 0) {
      toast({
        title: "No tracks to save",
        description: "Generate some tracks first before saving.",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);

    try {
      const genreList = selectedGenres.length > 0 
        ? selectedGenres.map(g => g.name).join(', ')
        : 'Various';
      
      const artistList = selectedArtists.length > 0
        ? selectedArtists.map(a => a.name).join(', ')
        : '';

      const playlistName = `AI Playlist - ${genreList}`;
      const description = `Generated playlist with ${tracks.length} tracks. ` + 
                         (artistList ? `Based on: ${artistList}. ` : '') +
                         `Created with AI Playlist Generator.`;

      const trackUris = tracks.map(track => track.uri);

      const playlist = await createPlaylistWithTracks(playlistName, trackUris, description);
      
      toast({
        title: "Playlist saved!",
        description: `"${playlist.name}" has been added to your Spotify library.`,
        duration: 5000,
      });

      // Optionally open the playlist in Spotify
      setTimeout(() => {
        if (playlist.external_urls?.spotify && window.confirm('Would you like to open your playlist in Spotify?')) {
          window.open(playlist.external_urls.spotify, '_blank');
        }
      }, 2000);
    } catch (error) {
      console.error("Error saving playlist:", error);
      toast({
        title: "Error saving playlist",
        description: error instanceof Error ? error.message : "There was an error saving your playlist. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const removeTrack = (id: string) => {
    setTracks(tracks.filter(track => track.id !== id));
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/");
      toast({
        title: "Logged out",
        description: "You've been successfully logged out.",
      });
    } catch (error) {
      console.error('Logout error:', error);
      // Still navigate away even if logout request fails
      navigate("/");
    }
  };

  const handleGoHome = () => {
    navigate("/");
  };

  const canGenerate = selectedGenres.length > 0 || selectedArtists.length > 0;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-card flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 animate-spin text-spotify-green mx-auto" />
          <h2 className="text-2xl font-semibold">Loading your music profile...</h2>
          <p className="text-muted-foreground">Getting everything ready for you</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-card p-4">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header with Navigation */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={handleGoHome}
            className="flex items-center gap-2"
          >
            <Home className="w-4 h-4" />
            Home
          </Button>
          
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold flex items-center justify-center gap-2">
              <Music className="w-8 h-8 text-spotify-green" />
              Playlist Builder
            </h1>
            <p className="text-muted-foreground">
              Tell us your preferences and we'll create the perfect playlist
            </p>
          </div>

          <div className="flex items-center gap-3">
            {user && (
              <div className="flex items-center gap-2 text-sm">
                {user.images?.[0]?.url ? (
                  <img 
                    src={user.images[0].url} 
                    alt={user.display_name}
                    className="w-8 h-8 rounded-full"
                  />
                ) : (
                  <User className="w-8 h-8 p-1 bg-muted rounded-full" />
                )}
                <span className="hidden sm:inline text-muted-foreground">
                  {user.display_name}
                </span>
              </div>
            )}
            <Button
              variant="outline"
              onClick={handleLogout}
              className="flex items-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Logout</span>
            </Button>
          </div>
        </div>

        {/* Connection Status */}
        <div className="bg-spotify-green/10 border border-spotify-green/20 rounded-lg p-3 text-center">
          <p className="text-sm text-spotify-green font-medium">
            ✅ Connected to Spotify - Ready to create playlists!
          </p>
        </div>

        {/* Form */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-spotify-green" />
              Your Preferences
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="genres" className="text-sm font-medium">
                  Favorite Genres
                </Label>
                <MultiSelectInput
                  value={selectedGenres}
                  onChange={setSelectedGenres}
                  options={availableGenres}
                  placeholder="Type to add genres..."
                />
                <p className="text-xs text-muted-foreground">
                  Select genres you enjoy. We loaded {availableGenres.length} available genres from Spotify.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="artists" className="text-sm font-medium">
                  Favorite Artists
                </Label>
                <MultiSelectInput
                  value={selectedArtists}
                  onChange={setSelectedArtists}
                  onSearch={handleArtistSearch}
                  placeholder="Type to search artists..."
                />
                <p className="text-xs text-muted-foreground">
                  Search and select artists you love. We've pre-selected some based on your listening history.
                </p>
              </div>
            </div>
            <div className="space-y-3">
              <Label htmlFor="length" className="text-sm font-medium">
                Playlist Length: {playlistLength[0]} songs
              </Label>
              <div className="px-2">
                <Slider
                  value={playlistLength}
                  onValueChange={setPlaylistLength}
                  max={100}
                  min={10}
                  step={5}
                  className="w-full"
                />
              </div>
              <div className="flex justify-between text-xs text-muted-foreground px-2">
                <span>10 songs</span>
                <span>100 songs</span>
              </div>
            </div>
            <SpotifyButton 
              onClick={fetchRecommendations}
              disabled={isGenerating || !canGenerate}
              className="w-full"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                "Generate Songs"
              )}
            </SpotifyButton>
            {!canGenerate && (
              <p className="text-sm text-muted-foreground text-center">
                Select at least one genre or artist to generate recommendations
              </p>
            )}
          </CardContent>
        </Card>

        {/* Generated Tracks */}
        {tracks.length > 0 && (
          <Card className="bg-card border-border">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Music className="w-5 h-5 text-spotify-green" />
                  Your Playlist ({tracks.length} songs)
                </CardTitle>
                <SpotifyButton 
                  onClick={savePlaylist}
                  variant="outline"
                  className="px-6"
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Save to Spotify
                    </>
                  )}
                </SpotifyButton>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {tracks.map((track) => (
                  <TrackCard
                    key={track.id}
                    track={{
                      id: track.id,
                      name: track.name,
                      artist: track.artist,
                      albumCover: track.album.image || 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=300&h=300&fit=crop'
                    }}
                    onRemove={() => removeTrack(track.id)}
                  />
                ))}
              </div>
              <div className="mt-4 pt-4 border-t border-border">
                <p className="text-sm text-muted-foreground text-center">
                  Total duration: {Math.round(tracks.reduce((acc, track) => acc + track.duration_ms, 0) / 60000)} minutes
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default PlaylistBuilder;
