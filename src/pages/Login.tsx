import { Button } from "@/components/ui/button";
import { SpotifyButton } from "@/components/SpotifyButton";
import { ArrowLeft, Music2, Shuffle, Radio } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Login = () => {
  const navigate = useNavigate();

  const handleLogin = () => {
    // Mock login - just navigate to playlist builder
    navigate("/playlist-builder");
  };

  const handleGoBack = () => {
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-card flex items-center justify-center p-4">
      <div className="w-full max-w-md text-center space-y-8">
        {/* Back Button */}
        <div className="flex justify-start">
          <Button
            variant="ghost"
            onClick={handleGoBack}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
        </div>

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
              Connect to Spotify
            </h1>
            <p className="text-lg text-muted-foreground">
              Link your Spotify account to start creating amazing playlists
            </p>
          </div>
        </div>

        {/* Features Preview */}
        <div className="grid grid-cols-3 gap-4 py-6">
          <div className="text-center space-y-2">
            <Radio className="w-8 h-8 text-spotify-green mx-auto" />
            <p className="text-sm text-muted-foreground">Discover</p>
            <p className="text-xs text-muted-foreground/80">Find new music</p>
          </div>
          <div className="text-center space-y-2">
            <Shuffle className="w-8 h-8 text-spotify-green mx-auto" />
            <p className="text-sm text-muted-foreground">Generate</p>
            <p className="text-xs text-muted-foreground/80">AI-powered lists</p>
          </div>
          <div className="text-center space-y-2">
            <Music2 className="w-8 h-8 text-spotify-green mx-auto" />
            <p className="text-sm text-muted-foreground">Save</p>
            <p className="text-xs text-muted-foreground/80">Direct to Spotify</p>
          </div>
        </div>

        {/* Login Button */}
        <div className="space-y-4">
          <SpotifyButton onClick={handleLogin} className="w-full">
            Connect with Spotify
          </SpotifyButton>
          
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Demo Mode - No actual Spotify connection required
            </p>
            
            {/* Privacy Notice */}
            <div className="bg-card/50 border border-border/50 rounded-lg p-4 text-left">
              <h4 className="text-sm font-medium mb-2">Demo features:</h4>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>• Browse mock playlist generation</li>
                <li>• Test UI with sample data</li>
                <li>• Experience the full interface</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-border/50">
          <p className="text-xs text-muted-foreground">
            Front-end demo version
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;