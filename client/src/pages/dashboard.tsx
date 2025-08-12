import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { useState, useMemo } from "react";
import Navbar from "@/components/ui/navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/lib/auth";
import { format } from "date-fns";
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Activity,
  BookOpen,
  User,
  Search
} from "lucide-react";
import BookingReceipt from "@/components/ui/booking-receipt";

export default function Dashboard() {
  const { user, token } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [amountFilter, setAmountFilter] = useState("");
  const [amountValue, setAmountValue] = useState("");

  // Fetch user's bookings
  const { data: bookings = [], isLoading: bookingsLoading } = useQuery({
    queryKey: ["/api/bookings"],
    enabled: !!user && !!token,
    queryFn: async () => {
      const response = await fetch("/api/bookings", {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (!response.ok) throw new Error("Failed to fetch bookings");
      return response.json();
    },
  });

  // Fetch user's joined matches (would need separate endpoint)
  const { data: matches = [], isLoading: matchesLoading } = useQuery({
    queryKey: ["/api/matches", "joined"],
    enabled: !!user && !!token,
    queryFn: async () => {
      // This would require a separate endpoint for user's joined matches
      // For now, fetch all matches and filter client-side (not ideal for production)
      const response = await fetch("/api/matches");
      if (!response.ok) throw new Error("Failed to fetch matches");
      return response.json();
    },
  });

  // Filter bookings based on search query and amount filter
  const filteredBookings = useMemo(() => {
    let filtered = bookings;
    
    // Apply text search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((booking: any) => {
        const facilityName = booking.facility?.name?.toLowerCase() || "";
        const gameName = booking.game?.name?.toLowerCase() || "";
        const sportType = booking.game?.sportType?.toLowerCase() || "";
        const notes = booking.notes?.toLowerCase() || "";
        const date = format(new Date(booking.startTime), "MMM dd, yyyy").toLowerCase();
        const time = format(new Date(booking.startTime), "h:mm a").toLowerCase();
        const status = booking.status?.toLowerCase() || "";
        
        return (
          facilityName.includes(query) ||
          gameName.includes(query) ||
          sportType.includes(query) ||
          notes.includes(query) ||
          date.includes(query) ||
          time.includes(query) ||
          status.includes(query)
        );
      });
    }
    
    // Apply amount filter
    if (amountFilter && amountValue && !isNaN(Number(amountValue))) {
      const amount = Number(amountValue);
      
      filtered = filtered.filter((booking: any) => {
        const bookingAmount = Number(booking.totalAmount);
        
        switch (amountFilter) {
          case "greater":
            return bookingAmount > amount;
          case "less":
            return bookingAmount < amount;
          case "equal":
            return bookingAmount === amount;
          case "greaterEqual":
            return bookingAmount >= amount;
          case "lessEqual":
            return bookingAmount <= amount;
          default:
            return true;
        }
      });
    }
    
    return filtered;
  }, [bookings, searchQuery, amountFilter, amountValue]);

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-gray-600 mb-4">Please log in to view your dashboard.</p>
              <Link href="/login">
                <Button>Login</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const upcomingBookings = filteredBookings.filter((booking: any) => 
    new Date(booking.startTime) > new Date() && booking.status !== "cancelled"
  );

  const pastBookings = filteredBookings.filter((booking: any) => 
    new Date(booking.startTime) < new Date() || booking.status === "completed"
  );

  const upcomingMatches = matches.filter((match: any) => 
    new Date(match.startTime) > new Date() && match.status === "open"
  ).slice(0, 3);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center space-y-6 lg:space-y-0">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                Welcome back, {user.firstName}!
              </h1>
              <p className="text-gray-600 mt-2">
                Manage your bookings and discover new matches
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-3">
              <Link href="/profile">
                <Button variant="outline" className="w-full sm:w-auto">
                  <User className="w-4 h-4 mr-2" />
                  My Profile
                </Button>
              </Link>
              <Link href="/facilities">
                <Button variant="outline" className="w-full sm:w-auto">
                  <BookOpen className="w-4 h-4 mr-2" />
                  Book Court
                </Button>
              </Link>

            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Calendar className="w-6 h-6 text-primary" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Bookings</p>
                  <p className="text-2xl font-bold text-gray-900">{bookings.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Clock className="w-6 h-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Upcoming</p>
                  <p className="text-2xl font-bold text-gray-900">{upcomingBookings.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Activity className="w-6 h-6 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Skill Level</p>
                  <p className="text-2xl font-bold text-gray-900 capitalize">
                    {user.skillLevel || "Beginner"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Bookings */}
        <Card>
          <CardHeader>
            <CardTitle>My Bookings</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Search and Filter Bar */}
            <div className="mb-6 space-y-4">
              {/* Text Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Search bookings by facility, sport, date, or status..."
                  className="pl-10 pr-20 bg-gray-50 border-gray-200 focus:bg-white"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 px-2 text-xs hover:bg-gray-200"
                    onClick={() => setSearchQuery("")}
                  >
                    Clear
                  </Button>
                )}
              </div>
              
              {/* Amount Filter */}
              <div className="flex flex-col sm:flex-row gap-3">
                <Select value={amountFilter || "none"} onValueChange={(value) => setAmountFilter(value === "none" ? "" : value)}>
                  <SelectTrigger className="w-full sm:w-32 bg-gray-50 border-gray-200">
                    <SelectValue placeholder="Amount" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No filter</SelectItem>
                    <SelectItem value="greater">Greater than</SelectItem>
                    <SelectItem value="less">Less than</SelectItem>
                    <SelectItem value="equal">Equal to</SelectItem>
                    <SelectItem value="greaterEqual">Greater or equal</SelectItem>
                    <SelectItem value="lessEqual">Less or equal</SelectItem>
                  </SelectContent>
                </Select>
                
                <Input
                  type="number"
                  placeholder="Enter amount"
                  className="flex-1 bg-gray-50 border-gray-200 focus:bg-white"
                  value={amountValue}
                  onChange={(e) => setAmountValue(e.target.value)}
                  disabled={!amountFilter}
                />
                
                {(amountFilter && amountFilter !== "none" || amountValue) && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setAmountFilter("");
                      setAmountValue("");
                    }}
                    className="w-full sm:w-auto"
                  >
                    Clear Filters
                  </Button>
                )}
              </div>
              
              {/* Results Summary */}
              {(searchQuery || (amountFilter && amountFilter !== "none" && amountValue)) && (
                <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                  <p className="text-sm text-gray-500">
                    Found {filteredBookings.length} booking{filteredBookings.length !== 1 ? 's' : ''}
                  </p>
                  <p className="text-xs text-gray-400">
                    {searchQuery && "Search in: facility name, sport type, date, time, status, notes"}
                    {amountFilter && amountFilter !== "none" && amountValue && searchQuery && " • "}
                    {amountFilter && amountFilter !== "none" && amountValue && `Amount: ${amountFilter} ₹${amountValue}`}
                  </p>
                </div>
              )}
            </div>
            
            <Tabs defaultValue="upcoming" className="space-y-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
                <TabsTrigger value="past">Past</TabsTrigger>
              </TabsList>
              
              <TabsContent value="upcoming" className="space-y-4">
                {upcomingBookings.length === 0 ? (
                  <div className="text-center py-12">
                    <Calendar className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      {(searchQuery || (amountFilter && amountFilter !== "none" && amountValue)) ? "No upcoming bookings match your filters" : "No upcoming bookings"}
                    </h3>
                    <p className="text-gray-500 mb-6">
                      {(searchQuery || (amountFilter && amountFilter !== "none" && amountValue))
                        ? "Try adjusting your search terms or filters."
                        : "Book a court to get started with your next game."
                      }
                    </p>
                    {!(searchQuery || (amountFilter && amountFilter !== "none" && amountValue)) && (
                      <Link href="/facilities">
                        <Button>Browse Facilities</Button>
                      </Link>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {upcomingBookings.map((booking: any) => (
                      <BookingCard key={booking.id} booking={booking} />
                    ))}
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="past" className="space-y-4">
                {pastBookings.length === 0 ? (
                  <div className="text-center py-12">
                    <Clock className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      {(searchQuery || (amountFilter && amountFilter !== "none" && amountValue)) ? "No past bookings match your filters" : "No past bookings"}
                    </h3>
                    <p className="text-gray-500">
                      {(searchQuery || (amountFilter && amountFilter !== "none" && amountValue))
                        ? "Try adjusting your search terms or filters."
                        : "Your booking history will appear here."
                      }
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {pastBookings.map((booking: any) => (
                      <BookingCard key={booking.id} booking={booking} />
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

interface BookingCardProps {
  booking: any;
}

function BookingCard({ booking }: BookingCardProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 border rounded-lg hover:shadow-sm transition-shadow space-y-4 sm:space-y-0">
      <div className="flex items-center space-x-4">
        <div className="p-3 bg-primary/10 rounded-lg">
          <MapPin className="w-6 h-6 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-medium">
            {booking.facility?.name || "Court Booking"}
          </h4>
          <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 space-y-1 sm:space-y-0 text-sm text-gray-600 mt-1">
            <span className="flex items-center">
              <Calendar className="w-4 h-4 mr-1" />
              {format(new Date(booking.startTime), "MMM dd, yyyy")}
            </span>
            <span className="flex items-center">
              <Clock className="w-4 h-4 mr-1" />
              {format(new Date(booking.startTime), "h:mm a")} - {format(new Date(booking.endTime), "h:mm a")}
            </span>
          </div>
          {booking.game?.name && (
            <p className="text-sm text-blue-600 mt-1 font-medium">
              {booking.game.name} • {booking.game.sportType}
            </p>
          )}
          {booking.notes && (
            <p className="text-sm text-gray-500 mt-1">{booking.notes}</p>
          )}
        </div>
      </div>
      
      <div className="flex flex-col sm:flex-col-reverse sm:text-right space-y-2 sm:space-y-2">
        <div className="flex items-center justify-between sm:justify-end gap-2">
          <Badge 
            variant={
              booking.status === "confirmed" ? "default" :
              booking.status === "cancelled" ? "destructive" :
              "secondary"
            }
          >
            {booking.status}
          </Badge>
          <BookingReceipt booking={booking} />
        </div>
        <p className="text-sm font-medium text-center sm:text-right">₹{booking.totalAmount}</p>
      </div>
    </div>
  );
}
