import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Navbar from "@/components/ui/navbar";
import HeroSection from "@/components/ui/hero-section";
import MatchCard from "@/components/ui/match-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Link, useLocation } from "wouter";
import { Search, Calendar, Users, Star, MapPin, Clock, Trophy } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function Home() {
  const [, setLocation] = useLocation();

  // Fetch featured facilities
  const { data: facilities = [] } = useQuery({
    queryKey: ["/api/facilities"],
    queryFn: async () => {
      const response = await fetch("/api/facilities");
      if (!response.ok) throw new Error("Failed to fetch facilities");
      return response.json();
    },
  });

  // Fetch featured matches
  const { data: matches = [] } = useQuery({
    queryKey: ["/api/matches"],
    queryFn: async () => {
      const response = await fetch("/api/matches");
      if (!response.ok) throw new Error("Failed to fetch matches");
      return response.json();
    },
  });

  const handleBookFacility = (facility: any) => {
    setLocation(`/facilities/${facility.id}`);
  };

  const handleJoinMatch = (matchId: string) => {
    // This would typically require authentication
    console.log("Join match:", matchId);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      {/* Hero Section */}
      <HeroSection />

      {/* Featured Facilities */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Popular Sports Facilities</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Discover top-rated courts and facilities in your area, highly recommended by our community
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {facilities.slice(0, 6).map((facility: any) => (
              <EnhancedFacilityCard
                key={facility.id}
                facility={facility}
                onBook={() => handleBookFacility(facility)}
              />
            ))}
          </div>
          
          <div className="text-center mt-12">
            <Link href="/facilities">
              <Button variant="outline" size="lg">
                View All Facilities
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">How QuickCourt Works</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Get started in three simple steps and join thousands of sports enthusiasts
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="bg-primary rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <Search className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">1. Find Facilities</h3>
              <p className="text-gray-600">
                Search for sports facilities near you using our advanced filters and location-based search
              </p>
            </div>
            
            <div className="text-center">
              <div className="bg-primary rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <Calendar className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">2. Book Your Slot</h3>
              <p className="text-gray-600">
                Select your preferred time slot and confirm your booking with instant availability checking
              </p>
            </div>
            
            <div className="text-center">
              <div className="bg-primary rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">3. Play & Connect</h3>
              <p className="text-gray-600">
                Join matches, meet fellow players, and build lasting connections in your sports community
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Matches */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Find & Join Matches</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Connect with players of your skill level and join exciting matches happening near you
            </p>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {matches.slice(0, 4).map((match: any) => (
              <MatchCard
                key={match.id}
                match={match}
                onJoin={handleJoinMatch}
              />
            ))}
          </div>
          
          <div className="text-center mt-8 space-x-4">
            <Link href="/matches">
              <Button variant="outline" size="lg">
                View All Matches
              </Button>
            </Link>
            <Link href="/matches?create=true">
              <Button size="lg">
                Create Match
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* User Roles Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Built for Everyone</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Whether you're a player, facility owner, or administrator, QuickCourt has tools designed for your needs
            </p>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Player Role */}
            <Card className="text-center p-8">
              <CardContent className="pt-6">
                <img 
                  src="https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=400&h=300" 
                  alt="Happy player with badminton racket" 
                  className="w-32 h-32 object-cover rounded-full mx-auto mb-6"
                />
                <h3 className="text-xl font-semibold text-gray-900 mb-4">For Players</h3>
                <ul className="text-gray-600 space-y-2 mb-6 text-left">
                  <li>• Find and book facilities</li>
                  <li>• Join matches in your area</li>
                  <li>• Track booking history</li>
                  <li>• Connect with other players</li>
                  <li>• Rate and review facilities</li>
                </ul>
                <Link href="/signup?role=user">
                  <Button>Join as Player</Button>
                </Link>
              </CardContent>
            </Card>
            
            {/* Facility Owner Role */}
            <Card className="text-center p-8">
              <CardContent className="pt-6">
                <img 
                  src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=400&h=300" 
                  alt="Professional facility manager" 
                  className="w-32 h-32 object-cover rounded-full mx-auto mb-6"
                />
                <h3 className="text-xl font-semibold text-gray-900 mb-4">For Facility Owners</h3>
                <ul className="text-gray-600 space-y-2 mb-6 text-left">
                  <li>• List your facilities</li>
                  <li>• Manage bookings & availability</li>
                  <li>• Set pricing & policies</li>
                  <li>• View analytics & reports</li>
                  <li>• Communicate with customers</li>
                </ul>
                <Link href="/signup?role=facility_owner">
                  <Button>List Your Facility</Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="col-span-1 md:col-span-2">
              <h3 className="text-2xl font-bold mb-4">QuickCourt</h3>
              <p className="text-gray-400 mb-4 max-w-md">
                Connect with sports enthusiasts in your area. Book facilities, join matches, and build lasting friendships through sports.
              </p>
            </div>
            
            <div>
              <h4 className="text-lg font-semibold mb-4">Quick Links</h4>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="/facilities"><a className="hover:text-white transition-colors">Find Courts</a></Link></li>
                <li><Link href="/matches"><a className="hover:text-white transition-colors">Join Matches</a></Link></li>
                <li><Link href="/signup?role=facility_owner"><a className="hover:text-white transition-colors">List Facility</a></Link></li>
              </ul>
            </div>
            
            <div>
              <h4 className="text-lg font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">Help Center</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Contact Us</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Terms of Service</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2024 QuickCourt. All rights reserved.</p>
          </div>
        </div>
      </footer>

      {/* Booking Modal removed on home page */}
    </div>
  );
}

// Enhanced Facility Card Component (same as on facilities page)
function EnhancedFacilityCard({ facility, onBook }: { facility: any; onBook: () => void }) {
  const defaultImages = [
    "https://images.unsplash.com/photo-1554068865-24cecd4e34b8?auto=format&fit=crop&w=800&q=60",
    "https://images.unsplash.com/photo-1546519638-68e109498ffc?auto=format&fit=crop&w=800&q=60",
    "https://images.unsplash.com/photo-1508609349937-5ec4ae374ebf?auto=format&fit=crop&w=800&q=60",
  ];

  const image = facility.images?.[0] || defaultImages[0];

  const sportTypeLabels: Record<string, string> = {
    badminton: "Badminton",
    tennis: "Tennis",
    basketball: "Basketball",
    football: "Football",
    table_tennis: "Table Tennis",
    squash: "Squash",
  };

  const sportIcons: Record<string, string> = {
    badminton: "🏸",
    tennis: "🎾",
    basketball: "🏀",
    football: "⚽",
    table_tennis: "🏓",
    squash: "🎯",
  };

  return (
    <Card className="group overflow-hidden border-0 transition-all duration-300 bg-white/90 hover:scale-[1.02] h-full flex flex-col">
      <div className="relative">
        <img
          src={image}
          alt={facility.name}
          className="w-full h-56 object-cover group-hover:scale-105 transition-transform duration-300"
        />

        {/* Rating Badge */}
        <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm rounded-full px-3 py-1 flex items-center gap-1">
          <Star className="w-4 h-4 text-yellow-500 fill-current" />
          <span className="text-sm font-semibold text-gray-800">{facility.rating}</span>
        </div>
      </div>

      <CardContent className="p-6 flex-1 flex flex-col">
        <div className="flex-1 space-y-4">
          <div>
            <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
              {facility.name}
            </h3>
            <div className="flex items-center text-gray-600 text-sm mb-3">
              <MapPin className="w-4 h-4 mr-1" />
              <span>{facility.city}, {facility.state}</span>
            </div>
          </div>

          {/* Sports Available */}
          <div>
            <div className="text-sm font-semibold text-gray-700 mb-2">Sports Available</div>
            <div className="flex flex-wrap gap-2">
              {facility.sportTypes?.slice(0, 4).map((sport: string) => (
                <Badge
                  key={sport}
                  variant="secondary"
                  className="bg-gradient-to-r from-blue-100 to-purple-100 text-blue-800 border-0"
                >
                  {sportIcons[sport]} {sportTypeLabels[sport] || sport}
                </Badge>
              ))}
              {facility.sportTypes?.length > 4 && (
                <Badge variant="outline" className="text-gray-600">
                  +{facility.sportTypes.length - 4} more
                </Badge>
              )}
            </div>
          </div>

          {/* Operating Hours */}
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Clock className="w-4 h-4" />
            <span>Open today: 6:00 AM - 11:00 PM</span>
          </div>
        </div>

        {/* Fixed Button at Bottom */}
        <div className="mt-4 pt-4 border-t">
          <Button
            onClick={onBook}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-300"
          >
            View Details & Book
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
