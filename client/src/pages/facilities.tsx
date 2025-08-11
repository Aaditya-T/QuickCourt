import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import Navbar from "@/components/ui/navbar";
import FacilityCard from "@/components/ui/facility-card";
// Removed inline BookingModal usage for a cleaner redirect flow
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
import { Search, Filter, MapPin } from "lucide-react";

export default function Facilities() {
  const [location, setLocation] = useLocation();
  const [filters, setFilters] = useState({
    city: "",
    sportType: "",
    searchTerm: "",
  });

  // Parse URL parameters on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setFilters({
      city: params.get("city") || "",
      sportType: params.get("sportType") || "",
      searchTerm: params.get("searchTerm") || "",
    });
  }, [location]);

  // Fetch facilities with filters
  const { data: facilities = [], isLoading, error } = useQuery({
    queryKey: ["/api/facilities", filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.city) params.set("city", filters.city);
      if (filters.sportType) params.set("sportType", filters.sportType);
      if (filters.searchTerm) params.set("searchTerm", filters.searchTerm);
      
      const response = await fetch(`/api/facilities?${params.toString()}`);
      if (!response.ok) throw new Error("Failed to fetch facilities");
      return response.json();
    },
  });

  const handleFilterChange = (field: string, value: string) => {
    // Convert "all" back to empty string for API filtering
    const filterValue = value === "all" ? "" : value;
    setFilters(prev => ({ ...prev, [field]: filterValue }));
  };

  const handleSearch = () => {
    // The query will automatically refetch due to the filters dependency
  };

  const handleBookFacility = (facility: any) => {
    setLocation(`/facilities/${facility.id}`);
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-red-600 mb-4">Failed to load facilities. Please try again.</p>
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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Sports Facilities</h1>
          <p className="text-gray-600">Find and book the perfect court for your game</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        <Card className="mb-8">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="searchTerm" className="text-sm font-medium mb-2 block">
                  Search Facilities
                </Label>
                <Input
                  id="searchTerm"
                  placeholder="Search by name or description..."
                  value={filters.searchTerm}
                  onChange={(e) => handleFilterChange("searchTerm", e.target.value)}
                />
              </div>
              
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
                <Select value={filters.sportType || "all"} onValueChange={(value) => handleFilterChange("sportType", value)}>
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
              
              <div className="flex items-end">
                <Button onClick={handleSearch} className="w-full">
                  <Search className="w-4 h-4 mr-2" />
                  Search
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              {isLoading ? "Loading..." : `${facilities.length} facilities found`}
            </h2>
            {(filters.city || filters.sportType || filters.searchTerm) && (
              <p className="text-gray-600 text-sm mt-1">
                Showing results for: {[filters.city, filters.sportType, filters.searchTerm].filter(Boolean).join(", ")}
              </p>
            )}
          </div>
        </div>

        {/* Facilities Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="overflow-hidden">
                <Skeleton className="h-48 w-full" />
                <CardContent className="p-6 space-y-4">
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-10 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : facilities.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center py-12">
              <div className="text-gray-500 mb-4">
                <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-medium mb-2">No facilities found</h3>
                <p>Try adjusting your search criteria or browse all facilities.</p>
              </div>
              <Button 
                variant="outline" 
                onClick={() => setFilters({ city: "", sportType: "", searchTerm: "" })}
              >
                Clear Filters
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {facilities.map((facility: any) => (
              <FacilityCard
                key={facility.id}
                facility={facility}
                onBook={() => handleBookFacility(facility)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Booking Modal removed on Facilities page */}
    </div>
  );
}
