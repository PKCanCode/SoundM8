// src/components/TrackCard.tsx
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X, Music } from "lucide-react";

interface Track {
  id: string;
  name: string;
  artist: string;
  albumCover: string;
}

interface TrackCardProps {
  track: Track;
  onRemove: () => void;
}

export const TrackCard: React.FC<TrackCardProps> = ({ track, onRemove }) => {
  return (
    <Card className="bg-card border-border hover:bg-accent/50 transition-colors">
      <CardContent className="p-4">
        <div className="flex items-center space-x-4">
          {/* Album Cover */}
          <div className="flex-shrink-0">
            {track.albumCover ? (
              <img
                src={track.albumCover}
                alt={`${track.name} album cover`}
                className="w-12 h-12 rounded object-cover"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  const fallback = target.parentElement?.querySelector('.fallback-icon');
                  if (fallback) {
                    (fallback as HTMLElement).style.display = 'flex';
                  }
                }}
              />
            ) : (
              <div className="w-12 h-12 bg-muted rounded flex items-center justify-center">
                <Music className="w-6 h-6 text-muted-foreground" />
              </div>
            )}
            {/* Fallback icon (hidden by default) */}
            <div 
              className="fallback-icon w-12 h-12 bg-muted rounded items-center justify-center absolute hidden"
              style={{ display: 'none' }}
            >
              <Music className="w-6 h-6 text-muted-foreground" />
            </div>
          </div>

          {/* Track Info */}
          <div className="flex-grow min-w-0">
            <h4 className="font-medium text-foreground truncate" title={track.name}>
              {track.name}
            </h4>
            <p className="text-sm text-muted-foreground truncate" title={track.artist}>
              {track.artist}
            </p>
          </div>

          {/* Remove Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onRemove}
            className="flex-shrink-0 h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive"
            title="Remove track"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
