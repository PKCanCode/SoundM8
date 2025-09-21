import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Music2, Sparkles, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { isAuthenticated, handleCallback } from "@/services/spotify";

const Index = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is returning from Spotify OAuth callback
    const callbackResult = handleCallback();
    if (callbackResult.success || isAuthenticated()) {
      // Redirect to playlist builder if authenticated
      navigate("/playlist");
    }
  }, [navigate]);

  const handleGetStarted = () => {
    if (isAuthenticated()) {
      navigate("/playlist");
    } else {
      navigate("/login");
    }
  };

  const features = [
    {
      icon: <Music2 className="w-8 h-8 text-spotify-green" />,
      title: "Smart Discovery",
      description: "Find new music based on your favorite genres and artists using Spotify's recommendation engine"
    },
    {
      icon: <Sparkles className="w-8 h-8 text-spotify-green" />,
      title: "You-Powered",
      description: "Advanced algorithms analyze YOUR music taste to create personalized playlists just for YOU"
    },
    {
      icon: <ArrowRight className="w-8 h-8 text-spotify-green" />,
      title: "Instant Sync",
      description: "Save directly to your Spotify account with one click - no manual copying required"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-card">
      {/* Hero Section */}
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          {/* Logo */}
          <div className="flex justify-center mb-8">
            <div className="relative">
              <div className="w-24 h-24 bg-gradient-to-br from-spotify-green to-spotify-green-hover rounded-full flex items-center justify-center shadow-lg shadow-spotify-green/25">
                <Music2 className="w-12 h-12 text-primary-foreground" />
              </div>
              <div className="absolute -top-2 -right-2 w-8 h-8 bg-accent rounded-full flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-accent-foreground" />
              </div>
            </div>
          </div>

          {/* Main Heading */}
          <div className="space-y-4">
            <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
              AI Playlist Generator
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto">
              Discover your next favorite songs with the power of artificial intelligence and Spotify's vast music library
            </p>
          </div>

          {/* CTA Button */}
          <div className="pt-4">
            <Button 
              onClick={handleGetStarted}
              size="lg"
              className="bg-spotify-green hover:bg-spotify-green-hover text-primary-foreground px-8 py-6 text-lg rounded-full shadow-lg shadow-spotify-green/25 transition-all duration-200 hover:shadow-xl hover:shadow-spotify-green/30 hover:scale-105"
            >
              Get Started
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-3 gap-6 pt-16">
            {features.map((feature, index) => (
              <Card key={index} className="bg-card/50 backdrop-blur-sm border-border/50 hover:bg-card/80 transition-all duration-200">
                <CardContent className="p-6 text-center space-y-4">
                  <div className="flex justify-center">
                    {feature.icon}
                  </div>
                  <h3 className="text-xl font-semibold">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Bottom Text */}
          <div className="pt-8">
            <p className="text-sm text-muted-foreground">
              Powered by Spotify Web API • Real music recommendations • Secure OAuth authentication
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
