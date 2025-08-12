import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import Navbar from "@/components/ui/navbar";
import FacilityCard from "@/components/ui/facility-card";

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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Filter, MapPin, Trophy, ArrowUpDown } from "lucide-react";



type Game = {
  id: string;
  name: string;
  emoji: string;
  sportType: string;
};

export default function Facilities() {
  const [location, setLocation] = useLocation();
  const [filters, setFilters] = useState({
    city: "",
    sportType: "",
    searchTerm: "",
    sortBy: "rating",
    sortOrder: "desc",
  });

  // Parse URL parameters on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setFilters({
      city: params.get("city") || "",
      sportType: params.get("sportType") || "",
      searchTerm: params.get("searchTerm") || "",
      sortBy: params.get("sortBy") || "rating",
      sortOrder: params.get("sortOrder") || "desc",
    });
  }, [location]);

  // Fetch all games for sport filter
  const { data: allGames = [] } = useQuery<Game[]>({
    queryKey: ["/api/games"],
    queryFn: async () => {
      const res = await fetch(`/api/games`);
      if (!res.ok) throw new Error("Failed to fetch games");
      return res.json();
    },
  });

  // Fetch facilities with filters
  const { data: facilities = [], isLoading, error } = useQuery({
    queryKey: ["/api/facilities", filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.city) params.set("city", filters.city);
      if (filters.sportType) params.set("sportType", filters.sportType);
      if (filters.searchTerm) params.set("searchTerm", filters.searchTerm);
      if (filters.sortBy) params.set("sortBy", filters.sortBy);
      if (filters.sortOrder) params.set("sortOrder", filters.sortOrder);

      console.log('🔍 Searching facilities with params:', params.toString());
      const response = await fetch(`/api/facilities?${params.toString()}`);
      if (!response.ok) throw new Error("Failed to fetch facilities");
      const data = await response.json();
      console.log('📊 Found facilities:', data.length);
      return data;
    },
  });

  const handleFilterChange = (field: string, value: string) => {
    // Convert "all" back to empty string for API filtering
    const filterValue = value === "all" ? "" : value;
    // Trim whitespace for text inputs to improve search quality
    const trimmedValue = (field === 'city' || field === 'searchTerm') ? filterValue.trim() : filterValue;
    const newFilters = { ...filters, [field]: trimmedValue };
    setFilters(newFilters);
    
    // Update URL with new filters
    const params = new URLSearchParams();
    Object.entries(newFilters).forEach(([key, val]) => {
      if (val && val !== "all") {
        params.set(key, val);
      }
    });
    
    const newUrl = params.toString() ? `/facilities?${params.toString()}` : '/facilities';
    window.history.replaceState({}, '', newUrl);
  };

  const handleSearch = () => {
    // The query will automatically refetch due to the filters dependency
  };

  const handleViewFacility = (facilityId: string) => {
    setLocation(`/facilities/${facilityId}`);
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        <Navbar />
        <div className="max-w-7xl mx-auto px-6 py-12">
          <Card className="border-0 shadow-lg">
            <CardContent className="pt-6 text-center">
              <div className="text-red-500 mb-4">
                <Search className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <h3 className="text-xl font-semibold mb-2">Oops! Something went wrong</h3>
                <p className="text-red-600 mb-4">Failed to load facilities. Please try again.</p>
              </div>
              <Button onClick={() => window.location.reload()} className="bg-blue-600 hover:bg-blue-700">
                Retry
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <Navbar />

      {/* Hero Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-700 text-white">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Discover Amazing Sports Facilities
            </h1>
            <p className="text-xl text-blue-100 max-w-2xl mx-auto">
              Find and book the perfect court for your game. From badminton to basketball, we've got you covered.
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Enhanced Filters */}
        <Card className="mb-8 border-0 shadow-xl bg-white/80 backdrop-blur-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl font-semibold text-gray-800 flex items-center gap-2">
              <Filter className="w-5 h-5 text-blue-600" />
              Find Your Perfect Court
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* First Row - Search and Location */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="searchTerm" className="text-sm font-medium mb-2 block text-gray-700">
                    <Search className="w-4 h-4 inline mr-1" />
                    Search Facilities
                  </Label>
                  <Input
                    id="searchTerm"
                    placeholder="Search by name, description, or address..."
                    value={filters.searchTerm}
                    onChange={(e) => handleFilterChange("searchTerm", e.target.value)}
                    className="border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <Label htmlFor="city" className="text-sm font-medium mb-2 block text-gray-700">
                    <MapPin className="w-4 h-4 inline mr-1" />
                    Location
                  </Label>
                  <Input
                    id="city"
                    placeholder="Search by city, state, or address..."
                    value={filters.city}
                    onChange={(e) => handleFilterChange("city", e.target.value)}
                    className="border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Second Row - Filters */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <Label htmlFor="sportType" className="text-sm font-medium mb-2 block text-gray-700">
                    <Trophy className="w-4 h-4 inline mr-1" />
                    Sport Type
                  </Label>
                  <Select value={filters.sportType || "all"} onValueChange={(value) => handleFilterChange("sportType", value)}>
                    <SelectTrigger className="border-gray-200 focus:border-blue-500 focus:ring-blue-500">
                      <SelectValue placeholder="All Sports" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">🏆 All Sports</SelectItem>
                      {allGames.map((game) => (
                        <SelectItem key={game.id} value={game.sportType}>
                          {game.emoji} {game.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>



                <div>
                  <Label htmlFor="sortBy" className="text-sm font-medium mb-2 block text-gray-700">
                    <ArrowUpDown className="w-4 h-4 inline mr-1" />
                    Sort By
                  </Label>
                  <Select value={filters.sortBy} onValueChange={(value) => handleFilterChange("sortBy", value)}>
                    <SelectTrigger className="border-gray-200 focus:border-blue-500 focus:ring-blue-500">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="rating">⭐ Rating</SelectItem>
                      <SelectItem value="price">💰 Price</SelectItem>
                      <SelectItem value="name">📝 Name</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="sortOrder" className="text-sm font-medium mb-2 block text-gray-700">
                    Order
                  </Label>
                  <Select value={filters.sortOrder} onValueChange={(value) => handleFilterChange("sortOrder", value)}>
                    <SelectTrigger className="border-gray-200 focus:border-blue-500 focus:ring-blue-500">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="desc">↓ High to Low</SelectItem>
                      <SelectItem value="asc">↑ Low to High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

            </div>
          </CardContent>
        </Card>

        {/* Results Summary */}
        {!isLoading && (
          <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="text-gray-600">
              <span className="font-semibold text-gray-800">{facilities.length}</span> facilities found
              {filters.city && <span> in <span className="font-medium">{filters.city}</span></span>}
              {filters.sportType && <span> for <span className="font-medium">{allGames.find(game => game.sportType === filters.sportType)?.emoji} {allGames.find(game => game.sportType === filters.sportType)?.name}</span></span>}
            </div>
            <div className="text-sm text-gray-500">
              Sorted by {filters.sortBy === 'rating' ? '⭐ Rating' : filters.sortBy === 'price' ? '💰 Price' : '📝 Name'} 
              ({filters.sortOrder === 'desc' ? 'High to Low' : 'Low to High'})
            </div>
          </div>
        )}

        {/* Facilities Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="overflow-hidden border-0 shadow-lg bg-white/80 backdrop-blur-sm">
                <Skeleton className="h-56 w-full" />
                <CardContent className="p-6 space-y-4">
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                  <div className="flex gap-2">
                    <Skeleton className="h-6 w-16" />
                    <Skeleton className="h-6 w-16" />
                    <Skeleton className="h-6 w-16" />
                  </div>
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-10 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : facilities.length === 0 ? (
          <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
            <CardContent className="pt-6 text-center py-16">
              <div className="text-gray-500 mb-6">
                <div className="bg-gray-100 rounded-full w-24 h-24 flex items-center justify-center mx-auto mb-6">
                  <Search className="w-12 h-12 text-gray-400" />
                </div>
                <h3 className="text-2xl font-semibold mb-3 text-gray-800">No facilities found</h3>
                <div className="text-gray-600 max-w-md mx-auto mb-6">
                  <p className="mb-3">We couldn't find any facilities matching your search criteria:</p>
                  <div className="text-sm space-y-1">
                    {filters.searchTerm && <div>• Search: "{filters.searchTerm}"</div>}
                    {filters.city && <div>• Location: {filters.city}</div>}
                    {filters.sportType && <div>• Sport: {allGames.find(game => game.sportType === filters.sportType)?.emoji} {allGames.find(game => game.sportType === filters.sportType)?.name}</div>}

                  </div>
                  <p className="mt-4">Try adjusting your filters or browse all available facilities.</p>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button
                  variant="outline"
                  onClick={() => {
                    const clearedFilters = { 
                      city: "", 
                      sportType: "", 
                      searchTerm: "", 
                      sortBy: "rating", 
                      sortOrder: "desc" 
                    };
                    setFilters(clearedFilters);
                    window.history.replaceState({}, '', '/facilities');
                  }}
                  className="border-gray-300 hover:bg-gray-50"
                >
                  Clear All Filters
                </Button>
                <Button
                  onClick={() => window.location.reload()}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Refresh Results
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {facilities.map((facility: any) => (
              <FacilityCard
                key={facility.id}
                facility={facility}
                onBook={() => handleViewFacility(facility.id)}
              />
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
