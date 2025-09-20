import { Button } from "@/components/ui/button";
import { Music } from "lucide-react";
import { cn } from "@/lib/utils";

interface SpotifyButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: "default" | "outline";
  className?: string;
  disabled?: boolean;
}

export const SpotifyButton = ({ 
  children, 
  onClick, 
  variant = "default", 
  className,
  disabled = false 
}: SpotifyButtonProps) => {
  return (
    <Button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "relative overflow-hidden font-semibold text-base px-8 py-6 h-auto",
        "bg-gradient-to-r from-spotify-green to-spotify-green-hover",
        "hover:from-spotify-green-hover hover:to-spotify-green",
        "transform transition-all duration-300 hover:scale-105",
        "shadow-lg hover:shadow-spotify-glow",
        variant === "outline" && "bg-transparent border-2 border-spotify-green text-spotify-green hover:bg-spotify-green hover:text-primary-foreground",
        className
      )}
    >
      <Music className="w-5 h-5 mr-2" />
      {children}
    </Button>
  );
};