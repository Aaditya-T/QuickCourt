import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import Navbar from "@/components/ui/navbar";
import MatchCard from "@/components/ui/match-card";
import CreateMatchModal from "@/components/ui/create-match-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Search, Filter, Plus, Users, MapPin } from "lucide-react";

export default function Matches() {
  const [location] = useLocation();
  const { user, token } = useAuth();
  const { toast } = useToast();
  const [createMatchModalOpen, setCreateMatchModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  const [filters, setFilters] = useState({
    city: "",
    sportType: "",
    skillLevel: "",
  });

  // Parse URL parameters on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("create") === "true") {
      setCreateMatchModalOpen(true);
    }
    setFilters({
      city: params.get("city") || "",
      sportType: params.get("sportType") || "",
      skillLevel: params.get("skillLevel") || "",
    });
  }, [location]);

  // Fetch all matches
  const { data: allMatches = [], isLoading, error } = useQuery({
    queryKey: ["/api/matches", filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.city) params.set("city", filters.city);
      if (filters.sportType) params.set("sportType", filters.sportType);
      if (filters.skillLevel) params.set("skillLevel", filters.skillLevel);
      
      const response = await fetch(`/api/matches?${params.toString()}`);
      if (!response.ok) throw new Error("Failed to fetch matches");
      return response.json();
    },
  });

  // Fetch user's created matches
  const { data: userMatches = [] } = useQuery({
    queryKey: ["/api/matches", "user", user?.id],
    enabled: !!user,
    queryFn: async () => {
      if (!user) return [];
      const response = await fetch(`/api/matches?creatorId=${user.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (!response.ok) throw new Error("Failed to fetch user matches");
      return response.json();
    },
  });

  // Join match mutation
  const joinMatchMutation = useMutation({
    mutationFn: async (matchId: string) => {
      return await apiRequest(`/api/matches/${matchId}/join`, "POST", {});
    },
    onSuccess: () => {
      toast({
        title: "Match Joined",
        description: "You have successfully joined the match!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/matches"] });
    },
    onError: (error: any) => {
      toast({
        title: "Join Failed",
        description: error.message || "Failed to join match. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleFilterChange = (field: string, value: string) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const handleJoinMatch = (matchId: string) => {
    if (!user) {
      toast({
        title: "Login Required",
        description: "Please log in to join matches.",
        variant: "destructive",
      });
      return;
    }
    joinMatchMutation.mutate(matchId);
  };

  const getDisplayMatches = () => {
    switch (activeTab) {
      case "my-matches":
        return userMatches;
      case "joined":
        // This would require additional API endpoint to get matches user has joined
        return allMatches.filter((match: any) => match.creatorId !== user?.id);
      default:
        return allMatches;
    }
  };

  const displayMatches = getDisplayMatches();

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-red-600 mb-4">Failed to load matches. Please try again.</p>
              <Button onClick={() => window.location.reload()}>Retry</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Find Matches</h1>
              <p className="text-gray-600">Join exciting matches or create your own</p>
            </div>
            {user && (
              <Button onClick={() => setCreateMatchModalOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create Match
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        <Card className="mb-8">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="city" className="text-sm font-medium mb-2 block">
                  <MapPin className="w-4 h-4 inline mr-1" />
                  Location
                </Label>
                <Input
                  id="city"
                  placeholder="Enter city..."
                  value={filters.city}
                  onChange={(e) => handleFilterChange("city", e.target.value)}
                />
              </div>
              
              <div>
                <Label htmlFor="sportType" className="text-sm font-medium mb-2 block">
                  <Filter className="w-4 h-4 inline mr-1" />
                  Sport Type
                </Label>
                <Select value={filters.sportType} onValueChange={(value) => handleFilterChange("sportType", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Sports" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sports</SelectItem>
                    <SelectItem value="badminton">Badminton</SelectItem>
                    <SelectItem value="tennis">Tennis</SelectItem>
                    <SelectItem value="basketball">Basketball</SelectItem>
                    <SelectItem value="football">Football</SelectItem>
                    <SelectItem value="table_tennis">Table Tennis</SelectItem>
                    <SelectItem value="squash">Squash</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="skillLevel" className="text-sm font-medium mb-2 block">
                  <Users className="w-4 h-4 inline mr-1" />
                  Skill Level
                </Label>
                <Select value={filters.skillLevel} onValueChange={(value) => handleFilterChange("skillLevel", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Levels" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Levels</SelectItem>
                    <SelectItem value="beginner">Beginner</SelectItem>
                    <SelectItem value="intermediate">Intermediate</SelectItem>
                    <SelectItem value="advanced">Advanced</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-end">
                <Button className="w-full">
                  <Search className="w-4 h-4 mr-2" />
                  Search
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="all">All Matches</TabsTrigger>
            {user && <TabsTrigger value="my-matches">My Matches</TabsTrigger>}
            {user && <TabsTrigger value="joined">Joined Matches</TabsTrigger>}
          </TabsList>

          <TabsContent value="all" className="space-y-6">
            <MatchesContent 
              matches={allMatches}
              isLoading={isLoading}
              onJoinMatch={handleJoinMatch}
              user={user}
              filters={filters}
            />
          </TabsContent>

          {user && (
            <TabsContent value="my-matches" className="space-y-6">
              <MatchesContent 
                matches={userMatches}
                isLoading={isLoading}
                onJoinMatch={handleJoinMatch}
                user={user}
                filters={filters}
                showOwn={true}
              />
            </TabsContent>
          )}

          {user && (
            <TabsContent value="joined" className="space-y-6">
              <MatchesContent 
                matches={displayMatches}
                isLoading={isLoading}
                onJoinMatch={handleJoinMatch}
                user={user}
                filters={filters}
                showJoined={true}
              />
            </TabsContent>
          )}
        </Tabs>
      </div>

      {/* Create Match Modal */}
      <CreateMatchModal
        open={createMatchModalOpen}
        onClose={() => setCreateMatchModalOpen(false)}
        onMatchCreated={() => {
          queryClient.invalidateQueries({ queryKey: ["/api/matches"] });
        }}
      />
    </div>
  );
}

interface MatchesContentProps {
  matches: any[];
  isLoading: boolean;
  onJoinMatch: (matchId: string) => void;
  user: any;
  filters: any;
  showOwn?: boolean;
  showJoined?: boolean;
}

function MatchesContent({ matches, isLoading, onJoinMatch, user, filters, showOwn, showJoined }: MatchesContentProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6 space-y-4">
              <div className="flex justify-between">
                <Skeleton className="h-6 w-1/2" />
                <Skeleton className="h-4 w-1/4" />
              </div>
              <Skeleton className="h-4 w-1/3" />
              <div className="flex justify-between">
                <Skeleton className="h-4 w-1/4" />
                <Skeleton className="h-4 w-1/4" />
              </div>
              <Skeleton className="h-10 w-24 ml-auto" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (matches.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6 text-center py-12">
          <div className="text-gray-500 mb-4">
            <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-medium mb-2">
              {showOwn ? "No matches created yet" : showJoined ? "No matches joined yet" : "No matches found"}
            </h3>
            <p>
              {showOwn 
                ? "Create your first match to get started!" 
                : showJoined 
                ? "Join some matches to see them here."
                : "Try adjusting your search criteria or check back later for new matches."}
            </p>
          </div>
          {(filters.city || filters.sportType || filters.skillLevel) && !showOwn && !showJoined && (
            <Button variant="outline">Clear Filters</Button>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900">
          {matches.length} matches found
        </h2>
        {(filters.city || filters.sportType || filters.skillLevel) && (
          <p className="text-gray-600 text-sm mt-1">
            Showing results for: {[filters.city, filters.sportType, filters.skillLevel].filter(Boolean).join(", ")}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {matches.map((match: any) => (
          <MatchCard
            key={match.id}
            match={match}
            onJoin={onJoinMatch}
            isOwn={showOwn || match.creatorId === user?.id}
            isJoined={showJoined}
          />
        ))}
      </div>
    </div>
  );
}
