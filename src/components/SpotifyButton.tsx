// src/components/SpotifyButton.tsx
import React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SpotifyButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: "default" | "outline" | "secondary" | "ghost" | "link" | "destructive";
  size?: "default" | "sm" | "lg" | "icon";
}

export const SpotifyButton = React.forwardRef<HTMLButtonElement, SpotifyButtonProps>(
  ({ className, variant = "default", size = "default", children, ...props }, ref) => {
    const spotifyVariant = variant === "default" ? 
      "bg-spotify-green hover:bg-spotify-green-hover text-primary-foreground" : 
      variant;

    return (
      <Button
        className={cn(
          variant === "default" && "bg-[#1DB954] hover:bg-[#1ed760] text-white",
          className
        )}
        variant={variant === "default" ? undefined : variant}
        size={size}
        ref={ref}
        {...props}
      >
        {children}
      </Button>
    );
  }
);

SpotifyButton.displayName = "SpotifyButton";
