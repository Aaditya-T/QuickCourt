import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import Navbar from "@/components/ui/navbar";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { MapPin, Star, Clock, ShieldCheck, ChevronRight, Check, MessageSquare, User, Calendar as CalendarIcon, Trophy, Zap, Wifi, Car, Coffee, Users } from "lucide-react";
import { addHours, format, isAfter, isBefore, parse, isToday, isBefore as isBeforeTime } from "date-fns";
import { useAuth } from "@/lib/auth";
import { apiRequest } from "@/lib/queryClient";
import { toast } from "@/hooks/use-toast";

type Facility = {
  id: string;
  ownerId: string;
  name: string;
  description?: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  latitude?: string;
  longitude?: string;
  sportTypes: string[];
  pricePerHour: string; // decimal as string from backend
  images: string[];
  amenities: string[];
  operatingHours: string; // JSON string
  rating: string;
  totalReviews: number;
  createdAt: string;
  isActive: boolean;
};

type Booking = {
  startTime: string;
  endTime: string;
};

type TimeSlot = {
  startTimeLabel: string;
  startDate: Date;
  endDate: Date;
  available: boolean;
  totalPrice: number;
  isPastSlot: boolean;
};

type Game = {
  id: string;
  name: string;
  emoji: string;
  sportType: string;
};

type FacilityCourt = {
  id: string;
  facilityId: string;
  gameId: string;
  courtCount: number;
  pricePerHour: string;
  game?: Game;
};

type Review = {
  id: string;
  userId: string;
  rating: number;
  comment: string;
  createdAt: string;
  user?: {
    firstName: string;
    lastName: string;
    profileImage?: string;
  };
};

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

const amenityIcons: Record<string, any> = {
  "WiFi": Wifi,
  "Parking": Car,
  "Cafeteria": Coffee,
  "Changing Room": Users,
  "Equipment Rental": Trophy,
  "Air Conditioning": Zap,
};

export default function Facility() {
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/facilities/:id");
  const facilityId = params?.id || "";
  const { token, user } = useAuth();

  const [selectedSport, setSelectedSport] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedSlots, setSelectedSlots] = useState<TimeSlot[]>([]);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  // Review states
const [reviewRating, setReviewRating] = useState<number>(5);
const [reviewComment, setReviewComment] = useState<string>("");
const [isSubmittingReview, setIsSubmittingReview] = useState<boolean>(false);
const [showReviewDialog, setShowReviewDialog] = useState<boolean>(false);

// Review comment character limit
const MAX_REVIEW_COMMENT_LENGTH = 100;

  // Facility details
  const { data: facility, isLoading: isFacilityLoading } = useQuery<Facility | null>({
    queryKey: ["/api/facilities", facilityId],
    queryFn: async () => {
      const res = await fetch(`/api/facilities/${facilityId}`);
      if (!res.ok) throw new Error("Failed to fetch facility");
      return res.json();
    },
  });

  // Existing bookings for selected date
  const { data: existingBookings = [], isLoading: isBookingsLoading } = useQuery<Booking[]>({
    queryKey: ["/api/facilities", facilityId, "bookings", selectedDate?.toISOString().split("T")[0] ?? ""],
    enabled: !!facilityId && !!selectedDate,
    queryFn: async () => {
      const headers: HeadersInit = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const res = await fetch(
        `/api/facilities/${facilityId}/bookings?date=${selectedDate?.toISOString().split("T")[0]}`,
        { headers }
      );
      
      // Don't throw error for 401, just return empty array (public view)
      if (res.status === 401) {
        return [];
      }
      if (!res.ok) throw new Error("Failed to fetch bookings");
      return res.json();
    },
  });

  // Games available at this facility
  const { data: facilityCourts = [], isLoading: isCourtsLoading } = useQuery<FacilityCourt[]>({
    queryKey: ["/api/facilities", facilityId, "courts"],
    enabled: !!facilityId,
    queryFn: async () => {
      const res = await fetch(`/api/facilities/${facilityId}/courts`);
      if (!res.ok) throw new Error("Failed to fetch facility courts");
      return res.json();
    },
  });

  // All games (to get game details for the facility courts)
  const { data: allGames = [] } = useQuery<Game[]>({
    queryKey: ["/api/games"],
    queryFn: async () => {
      const res = await fetch(`/api/games`);
      if (!res.ok) throw new Error("Failed to fetch games");
      return res.json();
    },
  });

  // Reviews
  const { data: reviews = [], refetch: refetchReviews } = useQuery<Review[]>({
    queryKey: ["/api/facilities", facilityId, "reviews"],
    enabled: !!facilityId,
    queryFn: async () => {
      const res = await fetch(`/api/facilities/${facilityId}/reviews`);
      if (!res.ok) throw new Error("Failed to fetch reviews");
      return res.json();
    },
  });

  // Submit review mutation
  const submitReviewMutation = useMutation({
    mutationFn: async (reviewData: { rating: number; comment: string }) => {
      const res = await apiRequest(`/api/facilities/${facilityId}/reviews`, "POST", reviewData);
      if (!res.ok) throw new Error("Failed to submit review");
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Review submitted",
        description: "Thank you for your feedback!",
      });
      setReviewRating(5);
      setReviewComment("");
      setShowReviewDialog(false);
      refetchReviews();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to submit review. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Create a mapping of facility courts with their game details
  const facilityCourtsWithGames = useMemo(() => {
    return facilityCourts.map(court => ({
      ...court,
      game: allGames.find(game => game.id === court.gameId)
    })).filter(court => court.game);
  }, [facilityCourts, allGames]);

  useEffect(() => {
    if (facilityCourtsWithGames.length > 0 && !selectedSport) {
      setSelectedSport(facilityCourtsWithGames[0].game?.sportType || null);
    }
  }, [facilityCourtsWithGames, selectedSport]);

  // Clear selected slots when date or sport changes
  useEffect(() => {
    setSelectedSlots([]);
  }, [selectedDate, selectedSport]);

  const { openLabel, closeLabel, isOpen } = useMemo(() => {
    let openTime = "06:00";
    let closeTime = "23:00";
    let isOpen = true;

    if (facility?.operatingHours && selectedDate) {
      try {
        const hours = JSON.parse(facility.operatingHours);
        const dayOfWeek = selectedDate.toLocaleDateString("en", { weekday: "long" }).toLowerCase();
        const todayHours = hours[dayOfWeek];

        console.log("Operating hours check:", {
          dayOfWeek,
          todayHours,
          rawHours: facility.operatingHours
        });

        if (todayHours) {
          if (todayHours.closed === true) {
            isOpen = false;
            openTime = "00:00";
            closeTime = "00:00";
          } else if (todayHours.open && todayHours.close) {
            openTime = todayHours.open;
            closeTime = todayHours.close;
            isOpen = true;
          }
        }
      } catch (error) {
        console.error("Error parsing operating hours:", error);
        isOpen = false;
      }
    }
    
    console.log("Final hours result:", { openLabel: openTime, closeLabel: closeTime, isOpen, selectedDate });
    return { openLabel: openTime, closeLabel: closeTime, isOpen };
  }, [facility?.operatingHours, selectedDate]);

  // Helper function to check if a specific date is closed
  const isDateClosed = (date: Date) => {
    if (!facility?.operatingHours) return false;

    try {
      const hours = JSON.parse(facility.operatingHours);
      const dayOfWeek = date.toLocaleDateString("en", { weekday: "long" }).toLowerCase();
      const dayHours = hours[dayOfWeek] || hours.monday;
      return dayHours?.closed === true;
    } catch (error) {
      console.error("Error checking if date is closed:", error);
      return false;
    }
  };

  const timeSlots: TimeSlot[] = useMemo(() => {
    if (!facility || !selectedDate || !selectedSport || !isOpen) return [];
    
    // Find the selected facility court
    const selectedFacilityCourt = facilityCourtsWithGames.find(
      court => court.game?.sportType === selectedSport
    );
    
    if (!selectedFacilityCourt) return [];
    
    const slots: TimeSlot[] = [];
    const pricePerHour = parseFloat(selectedFacilityCourt.pricePerHour);

    const dayOpen = parse(openLabel, "HH:mm", selectedDate);
    const dayClose = parse(closeLabel, "HH:mm", selectedDate);
    const now = new Date();

    // generate in 1-hour increments
    let current = dayOpen;
    while (isBefore(current, dayClose)) {
      const endWindow = addHours(current, 1); // Fixed 1-hour slots
      if (isAfter(endWindow, dayClose)) break;

      // Count how many courts are booked for this game during this time slot
      const bookedCourtsCount = existingBookings.filter((booking) => {
        const bookingStart = new Date(booking.startTime);
        const bookingEnd = new Date(booking.endTime);
        const hasTimeOverlap = (
          (current >= bookingStart && current < bookingEnd) ||
          (endWindow > bookingStart && endWindow <= bookingEnd) ||
          (current <= bookingStart && endWindow >= bookingEnd)
        );
        // Only count bookings for the same game/sport
        return hasTimeOverlap; // Note: In a full implementation, we'd also check booking.gameId === selectedFacilityCourt.gameId
      }).length;
      
      // Check if all courts for this game are booked
      const isBooked = bookedCourtsCount >= selectedFacilityCourt.courtCount;

      // Check if slot is in the past (for today only)
      const isPastSlot = isToday(selectedDate) && isBeforeTime(current, now);

      slots.push({
        startTimeLabel: format(current, "HH:mm"),
        startDate: current,
        endDate: endWindow,
        available: !isBooked && !isPastSlot,
        totalPrice: pricePerHour, // Fixed price per hour
        isPastSlot,
      });

      current = addHours(current, 1);
    }
    return slots;
  }, [facility, selectedDate, existingBookings, selectedSport, openLabel, closeLabel, isOpen, facilityCourtsWithGames]);

  const toggleSlot = (slot: TimeSlot) => {
    setSelectedSlots((prev) => {
      const exists = prev.find((s) => s.startDate.getTime() === slot.startDate.getTime());
      if (exists) return prev.filter((s) => s.startDate.getTime() !== slot.startDate.getTime());
      return [...prev, slot].sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
    });
  };

  // Merge contiguous selections into ranges (to minimize separate bookings)
  const mergedSelections = useMemo(() => {
    if (selectedSlots.length === 0) return [] as { start: Date; end: Date; amount: number }[];
    const sorted = [...selectedSlots].sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
    const merged: { start: Date; end: Date; amount: number }[] = [];
    let current = { start: sorted[0].startDate, end: sorted[0].endDate, amount: sorted[0].totalPrice };
    for (let i = 1; i < sorted.length; i++) {
      const s = sorted[i];
      if (s.startDate.getTime() === current.end.getTime()) {
        current.end = s.endDate;
        current.amount += s.totalPrice;
      } else {
        merged.push(current);
        current = { start: s.startDate, end: s.endDate, amount: s.totalPrice };
      }
    }
    merged.push(current);
    return merged;
  }, [selectedSlots]);

  const totalSelectedAmount = useMemo(
    () => mergedSelections.reduce((sum, r) => sum + r.amount, 0),
    [mergedSelections]
  );

  const proceedToCheckout = async () => {
    if (!user) {
      setLocation("/login");
      return;
    }
    if (!selectedDate || mergedSelections.length === 0) return;
    try {
      setIsProcessing(true);
      const createdIds: string[] = [];
      
      // Find the selected facility court to get gameId
      const selectedFacilityCourt = facilityCourtsWithGames.find(
        court => court.game?.sportType === selectedSport
      );
      
      if (!selectedFacilityCourt) {
        throw new Error("Selected sport not available at this facility");
      }
      
      for (const r of mergedSelections) {
        const body = {
          facilityId: facilityId,
          gameId: selectedFacilityCourt.gameId,
          date: selectedDate.toISOString(),
          startTime: r.start.toISOString(),
          endTime: r.end.toISOString(),
          totalAmount: r.amount,
          notes: selectedSport ? `Sport: ${selectedSport}` : undefined,
        };
        const res = await apiRequest("/api/bookings", "POST", body);
        const json = await res.json();
        createdIds.push(json.id);
      }
      const ids = encodeURIComponent(createdIds.join(","));
      const amt = encodeURIComponent(String(totalSelectedAmount));
      window.location.href = `/payment?bookingIds=${ids}&amount=${amt}`;
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSubmitReview = async () => {
    if (!user) {
      setLocation("/login");
      return;
    }
    if (!reviewComment.trim()) {
      toast({
        title: "Error",
        description: "Please write a comment for your review.",
        variant: "destructive",
      });
      return;
    }
    if (reviewComment.length > MAX_REVIEW_COMMENT_LENGTH) {
      toast({
        title: "Error",
        description: `Review comment cannot exceed ${MAX_REVIEW_COMMENT_LENGTH} characters.`,
        variant: "destructive",
      });
      return;
    }
    setIsSubmittingReview(true);
    try {
      await submitReviewMutation.mutateAsync({
        rating: reviewRating,
        comment: reviewComment.trim(),
      });
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const defaultImages = [
    "https://images.unsplash.com/photo-1554068865-24cecd4e34b8?auto=format&fit=crop&w=1200&q=60",
    "https://images.unsplash.com/photo-1546519638-68e109498ffc?auto=format&fit=crop&w=1200&q=60",
    "https://images.unsplash.com/photo-1508609349937-5ec4ae374ebf?auto=format&fit=crop&w=1200&q=60",
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <Navbar />

      {isFacilityLoading || !facility ? (
        <div className="max-w-7xl mx-auto px-6 py-8">
          <Skeleton className="h-64 w-full mb-6 rounded-2xl" />
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="lg:col-span-3">
              <Skeleton className="h-96 w-full rounded-xl" />
            </div>
            <div>
              <Skeleton className="h-96 w-full rounded-xl" />
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Compact Hero Section */}
          <div className="bg-white shadow-sm border-b">
            <div className="max-w-7xl mx-auto px-6 py-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <Carousel className="w-full">
                    <CarouselContent>
                      {(facility.images?.length ? facility.images : defaultImages).map((img, idx) => (
                        <CarouselItem key={idx}>
                          <div className="relative">
                            <img
                              src={img}
                              alt={`${facility.name} - Image ${idx + 1}`}
                              className="w-full h-64 object-cover rounded-xl shadow-lg"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent rounded-xl" />
                          </div>
                        </CarouselItem>
                      ))}
                    </CarouselContent>
                    <CarouselPrevious className="left-2" />
                    <CarouselNext className="right-2" />
                  </Carousel>
                </div>

                <div className="space-y-4">
                  <div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">{facility.name}</h1>
                    <div className="flex items-center gap-4 mb-3">
                      <div className="flex items-center bg-yellow-100 px-3 py-1 rounded-full">
                        <Star className="w-4 h-4 text-yellow-500 fill-current mr-1" />
                        <span className="text-sm font-semibold text-yellow-700">{facility.rating}</span>
                      </div>
                      <span className="text-sm text-gray-600">({facility.totalReviews} reviews)</span>
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${isOpen ? 'bg-green-500' : 'bg-red-500'}`}></div>
                        <span className={`text-sm font-medium ${isOpen ? 'text-green-600' : 'text-red-600'}`}>
                          {isOpen ? 'Open' : 'Closed'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Quick Info Row */}
                  <div className="flex flex-wrap gap-4 text-sm">
                    <div className="flex items-center gap-2 text-gray-600">
                      <MapPin className="w-4 h-4" />
                      <span>{facility.city}, {facility.state}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600">
                      <Trophy className="w-4 h-4" />
                      <span>{facility.sportTypes?.length || 0} sports</span>
                    </div>
                  </div>

                  {/* Facility Info Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Basic Info */}
                    <Card className="border-0 shadow-lg bg-white/90 backdrop-blur-sm">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="p-2 bg-blue-100 rounded-lg">
                            <MapPin className="w-5 h-5 text-blue-600" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900">Location</h3>
                            <p className="text-sm text-gray-600">{facility.city}, {facility.state}</p>
                          </div>
                        </div>
                        <p className="text-sm text-gray-700">{facility.address}</p>
                        <p className="text-sm text-gray-500 mt-1">{facility.zipCode}</p>
                      </CardContent>
                    </Card>

                    {/* Operating Status */}
                    <Card className="border-0 shadow-lg bg-white/90 backdrop-blur-sm">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3 mb-3">
                          <div className={`p-2 rounded-lg ${isOpen ? 'bg-green-100' : 'bg-red-100'}`}>
                            <Clock className={`w-5 h-5 ${isOpen ? 'text-green-600' : 'text-red-600'}`} />
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900">Status</h3>
                            <p className={`text-sm font-medium ${isOpen ? 'text-green-600' : 'text-red-600'}`}>
                              {isOpen ? 'Open Today' : 'Closed Today'}
                            </p>
                          </div>
                        </div>
                        {isOpen && (
                          <p className="text-sm text-gray-600">{openLabel} - {closeLabel}</p>
                        )}
                        <p className="text-sm text-gray-500 mt-1">
                          {isOpen ? 'Available for booking' : 'Not operating today'}
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Facility Details - Compact Layout */}
          <div className="max-w-7xl mx-auto px-6 py-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column - Main Info & Description */}
              <div className="lg:col-span-2 space-y-6">

                {/* Sports & Pricing */}
                <Card className="border-0 shadow-lg bg-white/90 backdrop-blur-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg font-bold text-gray-900 flex items-center gap-2">
                      <Trophy className="w-5 h-5 text-purple-600" />
                      Sports & Pricing
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Available Amenities */}
                    <div>
                      <h4 className="text-sm font-semibold text-gray-700 mb-2">Available Amenities</h4>
                      <div className="flex flex-wrap gap-2">
                        {facility.amenities && facility.amenities.length > 0 ? (
                          facility.amenities.map((amenity: string) => (
                            <Badge
                              key={amenity}
                              variant="outline"
                              className="bg-green-50 text-green-700 border-green-200 hover:bg-green-100 text-xs px-3 py-1"
                            >
                              {amenity}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-gray-500 text-sm italic">No amenities listed</span>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Description */}
                {facility.description && (
                  <Card className="border-0 shadow-lg bg-white/90 backdrop-blur-sm">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg font-bold text-gray-900 flex items-center gap-2">
                        <MessageSquare className="w-5 h-5 text-green-600" />
                        About This Facility
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-gray-700 leading-relaxed">{facility.description}</p>
                    </CardContent>
                  </Card>
                )}


              </div>

              {/* Right Column - Map & Quick Actions */}
              <div className="lg:col-span-1 space-y-6">
                {/* Map Card */}
                <Card className="border-0 shadow-lg bg-white/90 backdrop-blur-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg font-bold text-gray-900 flex items-center gap-2">
                      <MapPin className="w-5 h-5 text-red-500" />
                      Location
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="bg-gray-100 rounded-lg overflow-hidden border-2 border-gray-200">
                      <iframe
                        src={
                          facility.latitude && facility.longitude
                            ? `https://maps.google.com/maps?q=${facility.latitude},${facility.longitude}&t=&z=16&ie=UTF8&iwloc=&output=embed`
                            : `https://maps.google.com/maps?q=${encodeURIComponent(`${facility.address}, ${facility.city}, ${facility.state}`)}&t=&z=15&ie=UTF8&iwloc=&output=embed`
                        }
                        width="100%"
                        height="250"
                        frameBorder="0"
                        style={{ border: 0 }}
                        allowFullScreen={false}
                        loading="lazy"
                        title="Facility Location"
                      />
                    </div>
                    <div className="p-4 space-y-3">
                      <div className="text-sm">
                        <div className="font-semibold text-gray-900 mb-1">{facility.name}</div>
                        <div className="text-gray-600">{facility.address}</div>
                        <div className="text-gray-500">{facility.city}, {facility.state} {facility.zipCode}</div>
                      </div>
                      {facility.latitude && facility.longitude && (
                        <div className="text-xs text-gray-500">
                          Coordinates: {facility.latitude}, {facility.longitude}
                        </div>
                      )}
                      <Button
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                        onClick={() => {
                          const url = facility.latitude && facility.longitude
                            ? `https://maps.google.com/maps?q=${facility.latitude},${facility.longitude}`
                            : `https://maps.google.com/maps?q=${encodeURIComponent(`${facility.address}, ${facility.city}, ${facility.state}`)}`;
                          window.open(url, '_blank');
                        }}
                      >
                        <MapPin className="w-4 h-4 mr-2" />
                        Get Directions
                      </Button>
                    </div>
                  </CardContent>
                </Card>

              </div>
            </div>
          </div>

          {/* Main Booking Interface - Compact Layout */}
          <div className="max-w-7xl mx-auto px-3 py-3">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Book Your Court</h2>
              <p className="text-gray-600">Select your preferred sport, date, and time slots to make a reservation</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-2">

              {/* Left Panel - Booking Controls */}
              <div className="lg:col-span-2">
                <Card className="border-0 shadow-lg bg-white/95 backdrop-blur-sm">
                  <CardContent className="p-6">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-2">

                      {/* Sports Selection */}
                      <div>
                        <Label className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
                          <Trophy className="w-4 h-4 text-blue-600" />
                          Choose Sport
                        </Label>
                        <div className="space-y-2">
                          {isCourtsLoading ? (
                            <div className="space-y-2">
                              {[1, 2, 3].map(i => (
                                <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse"></div>
                              ))}
                            </div>
                          ) : (
                            facilityCourtsWithGames.map((facilityCourt) => {
                              if (!facilityCourt.game) return null;
                              
                              const isSelected = selectedSport === facilityCourt.game.sportType;
                              const basePrice = parseFloat(facilityCourt.pricePerHour);

                              return (
                                <div
                                  key={facilityCourt.id}
                                  onClick={() => setSelectedSport(facilityCourt.game?.sportType || '')}
                                  className={`cursor-pointer p-3 rounded-lg border-2 transition-all duration-200 ${isSelected
                                    ? "border-blue-500 bg-blue-50 shadow-md"
                                    : "border-gray-200 hover:border-blue-300 hover:bg-blue-50/50"
                                    }`}
                                >
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <span className="text-xl">{facilityCourt.game.emoji}</span>
                                      <div className="flex flex-col">
                                        <span className="font-medium text-gray-900 text-sm">
                                          {facilityCourt.game.name}
                                        </span>
                                        <span className="text-xs text-gray-500">
                                          {facilityCourt.courtCount} court{facilityCourt.courtCount > 1 ? 's' : ''} available
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>

                      {/* Date Selection */}
                      {!isOpen && (
                        <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-2">
                          <div className="flex items-center gap-2 text-red-800">
                            <Clock className="w-4 h-4" />
                            <span className="text-sm font-medium">
                              ⚠️ Facility is closed on the selected date
                            </span>
                          </div>
                          <p className="text-sm text-red-600 mt-1">
                            Please select a different date when the facility is open.
                          </p>
                        </div>
                      )}

                      <div>
                        <Label className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
                          <CalendarIcon className="w-4 h-4 text-green-600" />
                          Select Date
                        </Label>
                        <div className="bg-white rounded-lg border-2 border-gray-200 flex justify-center">
                          <Calendar
                            mode="single"
                            selected={selectedDate}
                            onSelect={setSelectedDate}
                            disabled={(date) => {
                              const today = new Date();
                              today.setHours(0, 0, 0, 0);
                              const dateToCheck = new Date(date);
                              dateToCheck.setHours(0, 0, 0, 0);
                              const isPastDate = dateToCheck < today;
                              const isTooFarInFuture = date > addHours(new Date(), 24 * 30);
                              const isClosed = isDateClosed(date);
                              
                              console.log("Calendar date check:", {
                                date: date.toDateString(),
                                dayOfWeek: date.toLocaleDateString("en", { weekday: "long" }).toLowerCase(),
                                isPastDate,
                                isTooFarInFuture,
                                isClosed,
                                shouldDisable: isPastDate || isTooFarInFuture || isClosed
                              });
                              
                              return isPastDate || isTooFarInFuture || isClosed;
                            }}
                            className="mx-auto"
                            modifiers={{
                              closed: (date) => isDateClosed(date)
                            }}
                            modifiersStyles={{
                              closed: {
                                backgroundColor: '#fef2f2',
                                color: '#dc2626',
                                textDecoration: 'line-through'
                              }
                            }}
                          />
                        </div>

                        {/* Calendar Legend */}
                        <div className="mt-3 text-xs text-gray-600 space-y-1">
                          <div className="flex items-center justify-center gap-4">
                            <div className="flex items-center gap-1">
                              <div className="w-3 h-3 bg-blue-100 border border-blue-300 rounded"></div>
                              <span>Available</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <div className="w-3 h-3 bg-red-100 border border-red-300 rounded text-red-600 line-through">15</div>
                              <span>Closed</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <div className="w-3 h-3 bg-gray-100 border border-gray-300 rounded"></div>
                              <span>Past</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Time Slots */}
                      <div>
                        <Label className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
                          <Clock className="w-4 h-4 text-purple-600" />
                          Available Slots
                        </Label>
                        {!selectedSport ? (
                          <div className="text-center py-8 text-gray-500">
                            <Trophy className="w-8 h-8 mx-auto mb-2 opacity-30" />
                            <p className="text-sm">Select a sport first</p>
                          </div>
                        ) : isBookingsLoading ? (
                          <div className="space-y-2">
                            {Array.from({ length: 4 }).map((_, i) => (
                              <Skeleton key={i} className="h-10 w-full rounded-lg" />
                            ))}
                          </div>
                        ) : timeSlots.length === 0 ? (
                          <div className="text-center py-8 text-gray-500">
                            <Clock className="w-8 h-8 mx-auto mb-2 opacity-30" />
                            <p className="text-sm">
                              {!isOpen ? "Facility is closed on this date" : "No slots available"}
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-2 max-h-80 overflow-y-auto">
                            {timeSlots.filter(slot => slot.available).map((slot, idx) => {
                              const isSelected = selectedSlots.some((s) => s.startDate.getTime() === slot.startDate.getTime());

                              return (
                                <button
                                  key={idx}
                                  type="button"
                                  onClick={() => toggleSlot(slot)}
                                  className={`w-full flex items-center justify-between p-3 border-2 rounded-lg text-left transition-all duration-200 ${isSelected
                                    ? "border-blue-500 bg-blue-50 shadow-md"
                                    : "border-gray-200 hover:border-blue-300 hover:bg-blue-50/50"
                                    }`}
                                >
                                  <div className="flex items-center gap-2">
                                    <div className={`h-4 w-4 rounded-full border-2 flex items-center justify-center ${isSelected
                                      ? "bg-blue-500 border-blue-500"
                                      : "border-gray-300 bg-white"
                                      }`}>
                                      {isSelected && <Check className="h-3 w-3 text-white" />}
                                    </div>
                                    <div>
                                      <div className="text-sm font-medium text-gray-900">
                                        {slot.startTimeLabel} - {format(slot.endDate, "HH:mm")}
                                      </div>
                                    </div>
                                  </div>
                                  <div className="text-sm font-bold text-gray-900">₹{slot.totalPrice}</div>
                                </button>
                              );
                            })}
                            {timeSlots.filter(slot => slot.available).length === 0 && (
                              <div className="text-center py-8 text-gray-500">
                                <Clock className="w-8 h-8 mx-auto mb-2 opacity-30" />
                                <p className="text-sm">No available slots for this date</p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Right Sidebar - Booking Summary */}
              <div className="lg:col-span-1">
                <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-blue-50 sticky top-6">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg font-bold text-gray-900 flex items-center gap-2">
                      <CalendarIcon className="w-5 h-5 text-blue-600" />
                      Booking Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                      {/* Quick Info */}
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className="bg-blue-50 p-3 rounded-lg">
                          <div className="text-gray-600 mb-1">Sport</div>
                          <div className="font-semibold text-gray-900">
                            {selectedSport ? `${sportIcons[selectedSport]} ${sportTypeLabels[selectedSport]}` : "Select"}
                          </div>
                        </div>
                        <div className="bg-green-50 p-3 rounded-lg">
                          <div className="text-gray-600 mb-1">Date</div>
                          <div className="font-semibold text-gray-900">
                            {selectedDate ? format(selectedDate, "MMM dd") : "Pick"}
                          </div>
                        </div>
                      </div>

                      {/* Selected Slots */}
                      {selectedSlots.length > 0 && (
                        <div className="bg-white p-3 rounded-lg border border-gray-200">
                          <div className="text-sm font-medium text-gray-700 mb-2">Selected Slots ({selectedSlots.length})</div>
                          <div className="space-y-2 max-h-32 overflow-y-auto">
                            {selectedSlots.map((slot, idx) => (
                              <div key={idx} className="flex justify-between items-center text-xs bg-blue-50 p-2 rounded">
                                <span>{slot.startTimeLabel} - {format(slot.endDate, "HH:mm")}</span>
                                <span className="font-semibold">₹{slot.totalPrice}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Total */}
                      <div className="bg-gradient-to-r from-blue-100 to-purple-100 p-4 rounded-lg border border-blue-200">
                        <div className="flex justify-between items-center text-lg">
                          <span className="font-semibold text-gray-900">Total:</span>
                          <span className="font-bold text-2xl text-blue-600">₹{totalSelectedAmount}</span>
                        </div>
                        <div className="text-xs text-gray-600 mt-1">
                          {selectedSlots.length > 0 ? `${selectedSlots.length} slot${selectedSlots.length > 1 ? 's' : ''}` : 'No slots selected'}
                        </div>
                      </div>

                      {/* Action Button */}
                      <Button
                        className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg h-12 text-base font-semibold"
                        disabled={selectedSlots.length === 0 || isProcessing || !isOpen}
                        onClick={proceedToCheckout}
                      >
                        {isProcessing ? (
                          <div className="flex items-center gap-2">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            Processing...
                          </div>
                        ) : !isOpen ? (
                          "Facility Closed"
                        ) : selectedSlots.length === 0 ? (
                          "Select Time Slots"
                        ) : (
                          `Book Now - ₹${totalSelectedAmount}`
                        )}
                      </Button>

                      {/* Status Messages */}
                      {!isOpen && (
                        <div className="text-center p-3 bg-red-50 border border-red-200 rounded-lg">
                          <p className="text-xs text-red-600 font-medium">
                            ⚠️ Facility is closed on this date
                          </p>
                        </div>
                      )}

                      {selectedSlots.length === 0 && isOpen && (
                        <div className="text-center p-3 bg-gray-50 border border-gray-200 rounded-lg">
                          <p className="text-xs text-gray-600">
                            Select time slots to proceed with booking
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
            </div>
          </div>

          {/* Reviews Section - Bottom */}
          <div className="max-w-7xl mx-auto px-6 py-6">
            <Card className="border-0 shadow-lg bg-white/90 backdrop-blur-sm">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-bold text-gray-900 flex items-center gap-2">
                      <MessageSquare className="w-5 h-5 text-green-600" />
                      Reviews ({reviews.length})
                    </CardTitle>
                    {user && (
                      <Dialog open={showReviewDialog} onOpenChange={setShowReviewDialog}>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm" className="border-blue-300 text-blue-600 hover:bg-blue-50">
                            Write Review
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Write a Review</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div>
                              <Label className="text-sm font-medium mb-2 block">Rating</Label>
                              <div className="flex gap-1">
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <button
                                    key={star}
                                    type="button"
                                    onClick={() => setReviewRating(star)}
                                    disabled={isSubmittingReview}
                                    className={`text-2xl ${star <= reviewRating ? "text-yellow-400" : "text-gray-300"
                                      } ${isSubmittingReview ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                                  >
                                    ★
                                  </button>
                                ))}
                              </div>
                            </div>
                            <div>
                              <Label className="text-sm font-medium mb-2 block">Comment</Label>
                              <Textarea
                                placeholder="Share your experience..."
                                value={reviewComment}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  if (value.length <= MAX_REVIEW_COMMENT_LENGTH) {
                                    setReviewComment(value);
                                  }
                                }}
                                rows={4}
                                maxLength={MAX_REVIEW_COMMENT_LENGTH}
                                disabled={isSubmittingReview}
                                className={`${reviewComment.length > MAX_REVIEW_COMMENT_LENGTH ? "border-red-500" : ""} ${isSubmittingReview ? "opacity-50 cursor-not-allowed" : ""}`}
                              />
                              <div className="flex justify-between items-center mt-1">
                                <span className={`text-xs ${
                                  reviewComment.length > MAX_REVIEW_COMMENT_LENGTH 
                                    ? "text-red-500" 
                                    : reviewComment.length > MAX_REVIEW_COMMENT_LENGTH * 0.8 
                                    ? "text-orange-500" 
                                    : "text-gray-500"
                                }`}>
                                  {reviewComment.length}/{MAX_REVIEW_COMMENT_LENGTH} characters
                                </span>
                                {reviewComment.length > MAX_REVIEW_COMMENT_LENGTH && (
                                  <span className="text-xs text-red-500 font-medium">
                                    Character limit exceeded!
                                  </span>
                                )}
                              </div>
                            </div>
                            <Button
                              onClick={handleSubmitReview}
                              disabled={reviewRating === 0 || reviewComment.trim() === "" || reviewComment.length > MAX_REVIEW_COMMENT_LENGTH || isSubmittingReview}
                              className="w-full"
                            >
                              {isSubmittingReview ? (
                                <>
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                  Submitting...
                                </>
                              ) : (
                                "Submit Review"
                              )}
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {reviews.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-30" />
                      <p className="text-lg font-medium text-gray-600 mb-2">No reviews yet</p>
                      <p className="text-sm text-gray-500">Be the first to share your experience!</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Reviews List */}
                      <div className="space-y-3 max-h-96 overflow-y-auto">
                        {reviews.slice(0, 6).map((review) => (
                          <div key={review.id} className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex items-center gap-2">
                                {review.user?.profileImage ? (
                                  <img
                                    src={review.user.profileImage}
                                    alt={`${review.user.firstName} ${review.user.lastName}`}
                                    className="w-8 h-8 rounded-full object-cover border border-gray-200"
                                  />
                                ) : (
                                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                    <User className="w-4 h-4 text-blue-600" />
                                  </div>
                                )}
                                <div>
                                  <div className="font-medium text-gray-900">
                                    {review.user?.firstName} {review.user?.lastName}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    {format(new Date(review.createdAt), "MMM dd, yyyy")}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-1">
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <Star
                                    key={star}
                                    className={`w-4 h-4 ${star <= review.rating ? "text-yellow-400 fill-current" : "text-gray-300"
                                      }`}
                                  />
                                ))}
                              </div>
                            </div>
                            <p className="text-gray-700 text-sm">{review.comment}</p>
                          </div>
                        ))}
                      </div>

                      {reviews.length > 6 && (
                        <div className="text-center pt-2">
                          <Button variant="outline" size="sm">
                            View All {reviews.length} Reviews
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    );
  }