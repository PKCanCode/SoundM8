import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { SpotifyButton } from "@/components/SpotifyButton";
import { TrackCard } from "@/components/TrackCard";
import { MultiSelectInput } from "@/components/MultiSelectInput";
import { useToast } from "@/hooks/use-toast";
import { Music, Sparkles, Save } from "lucide-react";
import { searchArtists, extractAccessTokenFromUrl, getAccessToken } from "@/services/spotify";

// Mock data for demonstration
const mockTracks = [
  { id: 1, name: "Anti-Hero", artist: "Taylor Swift", albumCover: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=300&h=300&fit=crop" },
  { id: 2, name: "As It Was", artist: "Harry Styles", albumCover: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=300&h=300&fit=crop" },
  { id: 3, name: "Heat Waves", artist: "Glass Animals", albumCover: "https://images.unsplash.com/photo-1567027634722-536544fd1e19?w=300&h=300&fit=crop" },
  { id: 4, name: "Blinding Lights", artist: "The Weeknd", albumCover: "https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=300&h=300&fit=crop" },
  { id: 5, name: "Levitating", artist: "Dua Lipa", albumCover: "https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=300&h=300&fit=crop" },
];

interface Track {
  id: number;
  name: string;
  artist: string;
  albumCover: string;
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
  const { toast } = useToast();

  useEffect(() => {
    // Check for access token in URL on component mount
    const token = extractAccessTokenFromUrl();
    if (token) {
      toast({
        title: "Connected to Spotify!",
        description: "You can now search for artists and save playlists.",
      });
    }
  }, [toast]);

  const handleArtistSearch = async (query: string) => {
    return await searchArtists(query);
  };

  const fetchRecommendations = async () => {
    // TODO: Implement Spotify recommendations API call
    setIsGenerating(true);
    console.log("Fetching recommendations:", { 
      genres: selectedGenres.map(g => g.name), 
      artists: selectedArtists.map(a => a.name), 
      playlistLength: playlistLength[0] 
    });
    
    // Simulate API call delay
    setTimeout(() => {
      setTracks(mockTracks.slice(0, playlistLength[0]));
      setIsGenerating(false);
      toast({
        title: "Songs generated!",
        description: `Found ${playlistLength[0]} perfect tracks for you.`,
      });
    }, 2000);
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

    try {
      // TODO: Implement actual Spotify playlist creation
      console.log("Saving playlist with tracks:", tracks);
      
      toast({
        title: "Playlist saved!",
        description: "Your playlist has been saved to Spotify.",
        duration: 3000,
      });
    } catch (error) {
      console.error("Error saving playlist:", error);
      toast({
        title: "Error saving playlist",
        description: "There was an error saving your playlist. Please try again.",
        variant: "destructive",
      });
    }
  };

  const removeTrack = (id: number) => {
    setTracks(tracks.filter(track => track.id !== id));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-card p-4">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold flex items-center justify-center gap-2">
            <Music className="w-8 h-8 text-spotify-green" />
            Playlist Builder
          </h1>
          <p className="text-muted-foreground">
            Tell us your preferences and we'll create the perfect playlist
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
              disabled={isGenerating || selectedGenres.length === 0}
              className="w-full"
            >
              {isGenerating ? "Generating..." : "Generate Songs"}
            </SpotifyButton>
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
                >
                  <Save className="w-4 h-4 mr-2" />
                  Save to Spotify
                </SpotifyButton>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {tracks.map((track) => (
                  <TrackCard
                    key={track.id}
                    track={track}
                    onRemove={removeTrack}
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