import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { SpotifyButton } from "@/components/SpotifyButton";
import { TrackCard } from "@/components/TrackCard";
import { useToast } from "@/hooks/use-toast";
import { Music, Sparkles, Save } from "lucide-react";

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

const popularGenres = [
  "pop", "rock", "hip hop", "jazz", "electronic", "r&b", "country", "classical", 
  "reggae", "blues", "folk", "punk", "metal", "alternative", "indie"
];

const popularArtists = [
  "Drake", "Taylor Swift", "The Weeknd", "Ariana Grande", "Ed Sheeran", 
  "Billie Eilish", "Post Malone", "Dua Lipa", "Harry Styles", "Olivia Rodrigo",
  "Bad Bunny", "The Beatles", "Beyoncé", "Kanye West", "Adele"
];

const PlaylistBuilder = () => {
  const [genre, setGenre] = useState("");
  const [artist, setArtist] = useState("");
  const [playlistLength, setPlaylistLength] = useState([10]);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  const fetchRecommendations = async () => {
    // TODO: Implement Spotify API call
    setIsGenerating(true);
    console.log("Fetching recommendations:", { genre, artist, playlistLength: playlistLength[0] });
    
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

  const savePlaylist = () => {
    // TODO: Save playlist to Spotify
    console.log("Saving playlist with tracks:", tracks);
    toast({
      title: "Playlist saved!",
      description: "Your playlist has been saved to Spotify.",
      duration: 3000,
    });
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="genre" className="text-sm font-medium">
                  Favorite Genre
                </Label>
                <Select value={genre} onValueChange={setGenre}>
                  <SelectTrigger className="bg-input border-border">
                    <SelectValue placeholder="Select a genre" />
                  </SelectTrigger>
                  <SelectContent>
                    {popularGenres.map((genreOption) => (
                      <SelectItem key={genreOption} value={genreOption}>
                        {genreOption}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="artist" className="text-sm font-medium">
                  Favorite Artist
                </Label>
                <Select value={artist} onValueChange={setArtist}>
                  <SelectTrigger className="bg-input border-border">
                    <SelectValue placeholder="Select an artist" />
                  </SelectTrigger>
                  <SelectContent>
                    {popularArtists.map((artistOption) => (
                      <SelectItem key={artistOption} value={artistOption}>
                        {artistOption}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
              disabled={isGenerating || !genre}
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