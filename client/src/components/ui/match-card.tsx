import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Users, Signal, Clock, MapPin } from "lucide-react";
import { format } from "date-fns";

interface Match {
  id: string;
  title: string;
  description?: string;
  sportType: string;
  skillLevel: string;
  maxPlayers: number;
  currentPlayers: number;
  costPerPlayer: string;
  date: string;
  startTime: string;
  endTime: string;
  status: string;
  facilityName?: string;
  facilityCity?: string;
}

interface MatchCardProps {
  match: Match;
  onJoin: (matchId: string) => void;
  isJoined?: boolean;
  isOwn?: boolean;
}

const sportTypeLabels: Record<string, string> = {
  badminton: "Badminton",
  tennis: "Tennis",
  basketball: "Basketball",
  football: "Football",
  table_tennis: "Table Tennis",
  squash: "Squash",
};

const skillLevelLabels: Record<string, string> = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
};

export default function MatchCard({ match, onJoin, isJoined, isOwn }: MatchCardProps) {
  const spotsAvailable = match.maxPlayers - match.currentPlayers;
  const isFull = match.currentPlayers >= match.maxPlayers;
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    if (date.toDateString() === today.toDateString()) {
      return "Today";
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return "Tomorrow";
    } else {
      return format(date, "MMM dd");
    }
  };
  
  const formatTime = (timeString: string) => {
    return format(new Date(timeString), "h:mm a");
  };

  const generateAvatars = (count: number) => {
    const avatars = [];
    const colors = ["bg-primary", "bg-secondary", "bg-accent"];
    
    for (let i = 0; i < Math.min(count, 3); i++) {
      avatars.push(
        <Avatar key={i} className="w-8 h-8 border-2 border-white -ml-2 first:ml-0">
          <AvatarFallback className={colors[i % colors.length]}>
            {String.fromCharCode(65 + i)}
          </AvatarFallback>
        </Avatar>
      );
    }
    return avatars;
  };

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardContent className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">
              {match.title}
            </h3>
            <div className="flex items-center text-gray-600 text-sm">
              <MapPin className="w-4 h-4 mr-1" />
              <span>{match.facilityName || "Facility"} • {match.facilityCity}</span>
            </div>
          </div>
          
          <div className="text-right">
            <div className="text-sm text-gray-500">{formatDate(match.date)}</div>
            <div className="text-sm font-medium text-gray-900">
              {formatTime(match.startTime)} - {formatTime(match.endTime)}
            </div>
          </div>
        </div>
        
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            <div className="flex items-center text-sm text-gray-600">
              <Users className="w-4 h-4 mr-1" />
              <span>{match.currentPlayers}/{match.maxPlayers} players</span>
            </div>
            <div className="flex items-center text-sm text-gray-600">
              <Signal className="w-4 h-4 mr-1" />
              <span>{skillLevelLabels[match.skillLevel]}</span>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Badge variant="outline">
              {sportTypeLabels[match.sportType]}
            </Badge>
            <div className="text-primary font-semibold">
              ₹{match.costPerPlayer}/player
            </div>
          </div>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="flex">
              {generateAvatars(match.currentPlayers)}
            </div>
            {spotsAvailable > 0 && (
              <span className="ml-3 text-sm text-gray-600">
                +{spotsAvailable} spots available
              </span>
            )}
          </div>
          
          <div className="flex space-x-2">
            {isOwn ? (
              <Badge variant="outline" className="bg-blue-50 text-blue-700">
                Your Match
              </Badge>
            ) : isJoined ? (
              <Badge variant="outline" className="bg-green-50 text-green-700">
                Joined
              </Badge>
            ) : isFull ? (
              <Badge variant="outline" className="bg-red-50 text-red-700">
                Full
              </Badge>
            ) : (
              <Button onClick={() => onJoin(match.id)} size="sm">
                Join Match
              </Button>
            )}
          </div>
        </div>
        
        {match.description && (
          <div className="mt-3 pt-3 border-t">
            <p className="text-sm text-gray-600">{match.description}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
