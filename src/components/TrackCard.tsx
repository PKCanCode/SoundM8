import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { X } from "lucide-react";

interface Track {
  id: string | number; // ← Fixed: Accept both string and number
  name: string;
  artist: string;
  albumCover: string;
}

interface TrackCardProps {
  track: Track;
  onRemove: (id: string | number) => void; // ← Fixed: Accept both types
}

export const TrackCard = ({ track, onRemove }: TrackCardProps) => {
  return (
    <Card className="group flex items-center gap-4 p-4 bg-card border-border hover:bg-track-hover transition-all duration-300">
      <img 
        src={track.albumCover} 
        alt={`${track.name} album cover`}
        className="w-16 h-16 rounded-lg object-cover shadow-md"
        onError={(e) => {
          // Fallback image if album cover fails to load
          (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=300&h=300&fit=crop';
        }}
      />
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-foreground truncate">{track.name}</h3>
        <p className="text-muted-foreground truncate">{track.artist}</p>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onRemove(track.id)}
        className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-destructive/20 hover:text-destructive"
        title="Remove track"
      >
        <X className="w-4 h-4" />
      </Button>
    </Card>
  );
};
