import { useState } from "react";
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

// Mock data for demonstration
const mockTracks = [
  { id: "1", name: "Anti-Hero", artist: "Taylor Swift", albumCover: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=300&h=300&fit=crop", uri: "spotify:track:mock1" },
  { id: "2", name: "As It Was", artist: "Harry Styles", albumCover: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=300&h=300&fit=crop", uri: "spotify:track:mock2" },
  { id: "3", name: "Heat Waves", artist: "Glass Animals", albumCover: "https://images.unsplash.com/photo-1567027634722-536544fd1e19?w=300&h=300&fit=crop", uri: "spotify:track:mock3" },
  { id: "4", name: "Blinding Lights", artist: "The Weeknd", albumCover: "https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=300&h=300&fit=crop", uri: "spotify:track:mock4" },
  { id: "5", name: "Levitating", artist: "Dua Lipa", albumCover: "https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=300&h=300&fit=crop", uri: "spotify:track:mock5" },
  { id: "6", name: "Good 4 U", artist: "Olivia Rodrigo", albumCover: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=300&h=300&fit=crop", uri: "spotify:track:mock6" },
  { id: "7", name: "Stay", artist: "The Kid LAROI & Justin Bieber", albumCover: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=300&h=300&fit=crop", uri: "spotify:track:mock7" },
  { id: "8", name: "Watermelon Sugar", artist: "Harry Styles", albumCover: "https://images.unsplash.com/photo-1567027634722-536544fd1e19?w=300&h=300&fit=crop", uri: "spotify:track:mock8" },
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
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleArtistSearch = async (query: string) => {
    // Mock artist search with popular artists
    const mockArtists = [
      { id: "drake", name: "Drake", image: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=64&h=64&fit=crop" },
      { id: "taylor-swift", name: "Taylor Swift", image: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=64&h=64&fit=crop" },
      { id: "the-weeknd", name: "The Weeknd", image: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=64&h=64&fit=crop" },
      { id: "billie-eilish", name: "Billie Eilish", image: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=64&h=64&fit=crop" },
      { id: "bad-bunny", name: "Bad Bunny", image: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=64&h=64&fit=crop" },
      { id: "ariana-grande", name: "Ariana Grande", image: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=64&h=64&fit=crop" },
      { id: "post-malone", name: "Post Malone", image: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=64&h=64&fit=crop" },
      { id: "dua-lipa", name: "Dua Lipa", image: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=64&h=64&fit=crop" },
      { id: "harry-styles", name: "Harry Styles", image: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=64&h=64&fit=crop" },
      { id: "olivia-rodrigo", name: "Olivia Rodrigo", image: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=64&h=64&fit=crop" }
    ];

    return mockArtists.filter(artist => 
      artist.name.toLowerCase().includes(query.toLowerCase())
    );
  };

  const generateMockRecommendations = (length: number): Track[] => {
    const shuffled = [...mockTracks].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, Math.min(length, mockTracks.length));
  };

  const fetchRecommendations = async () => {
    setIsGenerating(true);
    
    // Simulate API delay
    setTimeout(() => {
      const recommendations = generateMockRecommendations(playlistLength[0]);
      setTracks(recommendations);
      setIsGenerating(false);
      
      toast({
        title: "Songs generated!",
        description: `Generated ${recommendations.length} tracks based on your preferences.`,
      });
    }, 1500);
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

    // Mock save functionality
    setTimeout(() => {
      setIsSaving(false);
      toast({
        title: "Playlist saved!",
        description: "Your playlist would be saved to Spotify (demo mode)",
        duration: 5000,
      });
    }, 1000);
  };

  const removeTrack = (id: string) => {
    setTracks(tracks.filter(track => track.id !== id));
  };

  const handleLogout = () => {
    navigate("/");
    toast({
      title: "Logged out",
      description: "Returned to home page.",
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

        {/* Demo Notice */}
        <div className="bg-spotify-green/10 border border-spotify-green/20 rounded-lg p-3 text-center">
          <p className="text-sm text-spotify-green font-medium">
            🎵 Demo Mode - Using mock data for playlist generation
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
                  disabled={isSaving}
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