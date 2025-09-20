import { useNavigate } from "react-router-dom";
import { SpotifyButton } from "@/components/SpotifyButton";
import { Music2, Shuffle, Radio } from "lucide-react";

const Login = () => {
  const navigate = useNavigate();

  const handleLogin = () => {
    // TODO: OAuth implementation
    console.log("Login with Spotify clicked");
    // Simulate successful login
    navigate("/playlist-builder");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-card flex items-center justify-center p-4">
      <div className="w-full max-w-md text-center space-y-8">
        {/* Logo and Brand */}
        <div className="space-y-4">
          <div className="flex justify-center">
            <div className="relative">
              <div className="w-20 h-20 bg-gradient-to-br from-spotify-green to-spotify-green-hover rounded-full flex items-center justify-center shadow-lg shadow-spotify-green/25">
                <Music2 className="w-10 h-10 text-primary-foreground" />
              </div>
              <div className="absolute -top-1 -right-1 w-6 h-6 bg-accent rounded-full flex items-center justify-center">
                <Shuffle className="w-3 h-3 text-accent-foreground" />
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
              Playlist Generator
            </h1>
            <p className="text-lg text-muted-foreground">
              Create the perfect playlist with AI
            </p>
          </div>
        </div>

        {/* Features */}
        <div className="grid grid-cols-3 gap-4 py-6">
          <div className="text-center space-y-2">
            <Radio className="w-8 h-8 text-spotify-green mx-auto" />
            <p className="text-sm text-muted-foreground">Discover</p>
          </div>
          <div className="text-center space-y-2">
            <Shuffle className="w-8 h-8 text-spotify-green mx-auto" />
            <p className="text-sm text-muted-foreground">Generate</p>
          </div>
          <div className="text-center space-y-2">
            <Music2 className="w-8 h-8 text-spotify-green mx-auto" />
            <p className="text-sm text-muted-foreground">Save</p>
          </div>
        </div>

        {/* Login Button */}
        <SpotifyButton onClick={handleLogin} className="w-full">
          Login with Spotify
        </SpotifyButton>

        <p className="text-sm text-muted-foreground">
          Connect your Spotify account to start creating amazing playlists
        </p>
      </div>
    </div>
  );
};

export default Login;