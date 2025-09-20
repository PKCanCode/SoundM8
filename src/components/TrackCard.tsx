import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { X } from "lucide-react";

interface Track {
  id: number;
  name: string;
  artist: string;
  albumCover: string;
}

interface TrackCardProps {
  track: Track;
  onRemove: (id: number) => void;
}

export const TrackCard = ({ track, onRemove }: TrackCardProps) => {
  return (
    <Card className="group flex items-center gap-4 p-4 bg-card border-border hover:bg-track-hover transition-all duration-300">
      <img 
        src={track.albumCover} 
        alt={`${track.name} album cover`}
        className="w-16 h-16 rounded-lg object-cover shadow-md"
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
      >
        <X className="w-4 h-4" />
      </Button>
    </Card>
  );
};