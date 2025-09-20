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
import { Music, Sparkles, Save, LogOut, Home } from "lucide-react";
import { 
  searchArtists, 
  extractAccessTokenFromUrl, 
  getAccessToken, 
  createPlaylist 
} from "@/services/spotify";

// Mock data for demonstration when no Spotify connection
const mockTracks = [
  { id: "1", name: "Anti-Hero", artist: "Taylor Swift", albumCover: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=300&h=300&fit=crop", uri: "spotify:track:mock1" },
  { id: "2", name: "As It Was", artist: "Harry Styles", albumCover: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=300&h=300&fit=crop", uri: "spotify:track:mock2" },
  { id: "3", name: "Heat Waves", artist: "Glass Animals", albumCover: "https://images.unsplash.com/photo-1567027634722-536544fd1e19?w=300&h=300&fit=crop", uri: "spotify:track:mock3" },
  { id: "4", name: "Blinding Lights", artist: "The Weeknd", albumCover: "https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=300&h=300&fit=crop", uri: "spotify:track:mock4" },
  { id: "5", name: "Levitating", artist: "Dua Lipa", albumCover: "https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=300&h=300&fit=crop", uri: "spotify:track:mock5" },
];

interface Track {
  id: string;
  name: string;
  artist: string;
  albumCover: string;
  uri: string;
}

interface Option {
  id: string;
  name: string;
  image?: string;
}

const popularGenres: Option[] = [
  { id: "pop", name: "Pop" },
  { id: "rock", name: "Rock" },
  { id: "hip-hop", name: "Hip Hop" },
  { id: "jazz", name: "Jazz" },
  { id: "electronic", name: "Electronic" },
  { id: "rnb", name: "R&B" },
  { id: "country", name: "Country" },
  { id: "classical", name: "Classical" },
  { id: "reggae", name: "Reggae" },
  { id: "blues", name: "Blues" },
  { id: "folk", name: "Folk" },
  { id: "punk", name: "Punk" },
  { id: "metal", name: "Metal" },
  { id: "alternative", name: "Alternative" },
  { id: "indie", name: "Indie" }
];

const PlaylistBuilder = () => {
  const [selectedGenres, setSelectedGenres] = useState<Option[]>([]);
  const [selectedArtists, setSelectedArtists] = useState<Option[]>([]);
  const [playlistLength, setPlaylistLength] = useState([10]);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    // Check for access token in URL on component mount
    const token = extractAccessTokenFromUrl();
    if (token || getAccessToken()) {
      setIsConnected(true);
      if (token) {
        toast({
          title: "Connected to Spotify!",
          description: "You can now search for artists and save playlists.",
        });
      }
    } else {
      // Redirect to login if no token
      navigate("/login");
    }
  }, [toast, navigate]);

  const handleArtistSearch = async (query: string) => {
    try {
      return await searchArtists(query);
    } catch (error) {
      console.error('Error searching artists:', error);
      toast({
        title: "Search failed",
        description: "Unable to search artists. Please check your connection to Spotify.",
        variant: "destructive",
      });
      return [];
    }
  };

  const generateMockRecommendations = (length: number): Track[] => {
    const shuffled = [...mockTracks].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, Math.min(length, mockTracks.length));
  };

  const fetchRecommendations = async () => {
    setIsGenerating(true);
    
    try {
      console.log("Fetching recommendations:", { 
        genres: selectedGenres.map(g => g.name), 
        artists: selectedArtists.map(a => a.name), 
        playlistLength: playlistLength[0] 
      });

      // For demo purposes, we'll use mock data
      // In a real app, you'd call Spotify's recommendations API here
      const recommendations = generateMockRecommendations(playlistLength[0]);
      
      setTracks(recommendations);
      
      toast({
        title: "Songs generated!",
        description: `Found ${recommendations.length} perfect tracks for you.`,
      });
    } catch (error) {
      console.error('Error fetching recommendations:', error);
      toast({
        title: "Generation failed",
        description: "Unable to generate recommendations. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const savePlaylist = async () => {
    if (!getAccessToken()) {
      toast({
        title: "Not connected to Spotify",
        description: "Please connect to Spotify first to save playlists.",
        variant: "destructive",
      });
      return;
    }

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
      
      const playlistName = `AI Generated Playlist - ${genreList}`;
      const trackUris = tracks.map(track => track.uri);

      await createPlaylist(playlistName, trackUris);
      
      toast({
        title: "Playlist saved!",
        description: "Your playlist has been saved to Spotify.",
        duration: 5000,
      });
    } catch (error) {
      console.error("Error saving playlist:", error);
      toast({
        title: "Error saving playlist",
        description: "There was an error saving your playlist. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const removeTrack = (id: string) => {
    setTracks(tracks.filter(track => track.id !== id));
  };

  const handleLogout = () => {
    // Clear token and redirect
    (window as any).spotifyAccessToken = null;
    navigate("/");
    toast({
      title: "Logged out",
      description: "You've been successfully logged out of Spotify.",
    });
  };

  const handleGoHome = () => {
    navigate("/");
  };

  const canGenerate = selectedGenres.length > 0 || selectedArtists.length > 0;

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

          <Button
            variant="outline"
            onClick={handleLogout}
            className="flex items-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </Button>
        </div>

        {/* Connection Status */}
        {isConnected && (
          <div className="bg-spotify-green/10 border border-spotify-green/20 rounded-lg p-3 text-center">
            <p className="text-sm text-spotify-green font-medium">
              ✅ Connected to Spotify - Ready to create playlists!
            </p>
          </div>
        )}

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
                  options={popularGenres}
                  placeholder="Type to add genres..."
                />
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
                  max={50}
                  min={5}
                  step={1}
                  className="w-full"
                />
              </div>
              <div className="flex justify-between text-xs text-muted-foreground px-2">
                <span>5 songs</span>
                <span>50 songs</span>
              </div>
            </div>
            <SpotifyButton 
              onClick={fetchRecommendations}
              disabled={isGenerating || !canGenerate}
              className="w-full"
            >
              {isGenerating ? "Generating..." : "Generate Songs"}
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
                  disabled={isSaving || !isConnected}
                >
                  <Save className="w-4 h-4 mr-2" />
                  {isSaving ? "Saving..." : "Save to Spotify"}
                </SpotifyButton>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {tracks.map((track) => (
                  <TrackCard
                    key={track.id}
                    track={{
                      id: track.id,
                      name: track.name,
                      artist: track.artist,
                      albumCover: track.albumCover
                    }}
                    onRemove={() => removeTrack(track.id)}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default PlaylistBuilder;
