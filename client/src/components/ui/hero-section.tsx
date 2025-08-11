import { useState } from "react";
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
import { Search } from "lucide-react";
import { useLocation } from "wouter";

interface HeroSectionProps {
  onSearch?: (filters: {
    sportType: string;
    location: string;
    date: string;
  }) => void;
}

export default function HeroSection({ onSearch }: HeroSectionProps) {
  const [, setLocation] = useLocation();
  const [searchFilters, setSearchFilters] = useState({
    sportType: "",
    location: "",
    date: "",
  });

  const handleSearch = () => {
    if (onSearch) {
      onSearch(searchFilters);
    } else {
      // Navigate to facilities page with search params
      const params = new URLSearchParams();
      if (searchFilters.sportType) params.set("sportType", searchFilters.sportType);
      if (searchFilters.location) params.set("city", searchFilters.location);
      if (searchFilters.date) params.set("date", searchFilters.date);
      
      setLocation(`/facilities?${params.toString()}`);
    }
  };

  return (
    <section 
      className="relative bg-gradient-to-r from-primary to-secondary h-96 flex items-center bg-cover bg-center"
      style={{
        backgroundImage: `linear-gradient(rgba(16, 185, 129, 0.8), rgba(5, 150, 105, 0.8)), url('https://images.unsplash.com/photo-1546519638-68e109498ffc?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1920&h=600')`
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center w-full">
        <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
          Book Local Sports Facilities
        </h1>
        <p className="text-xl text-white mb-8 max-w-2xl mx-auto">
          Find and book courts, join matches, and connect with sports enthusiasts in your area
        </p>
        
        {/* Search Bar */}
        <div className="bg-white rounded-xl shadow-lg p-6 max-w-4xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-1">
              <Label htmlFor="sport" className="block text-sm font-medium text-gray-700 mb-2">
                Sport
              </Label>
              <Select 
                value={searchFilters.sportType} 
                onValueChange={(value) => setSearchFilters(prev => ({...prev, sportType: value}))}
              >
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
                </SelectContent>
              </Select>
            </div>
            
            <div className="md:col-span-1">
              <Label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-2">
                Location
              </Label>
              <Input
                id="location"
                type="text"
                placeholder="Enter city or area"
                value={searchFilters.location}
                onChange={(e) => setSearchFilters(prev => ({...prev, location: e.target.value}))}
                className="w-full"
              />
            </div>
            
            <div className="md:col-span-1">
              <Label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-2">
                Date
              </Label>
              <Input
                id="date"
                type="date"
                value={searchFilters.date}
                onChange={(e) => setSearchFilters(prev => ({...prev, date: e.target.value}))}
                className="w-full"
              />
            </div>
            
            <div className="md:col-span-1 flex items-end">
              <Button onClick={handleSearch} className="w-full">
                <Search className="w-4 h-4 mr-2" />
                Search Courts
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
