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

type Review = {
  id: string;
  userId: string;
  rating: number;
  comment: string;
  createdAt: string;
  user?: {
    firstName: string;
    lastName: string;
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
    enabled: !!facilityId && !!selectedDate && !!token,
    queryFn: async () => {
      const res = await fetch(
        `/api/facilities/${facilityId}/bookings?date=${selectedDate?.toISOString().split("T")[0]}`,
        {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        }
      );
      if (!res.ok) throw new Error("Failed to fetch bookings");
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

  useEffect(() => {
    if (facility && facility.sportTypes?.length > 0 && !selectedSport) {
      setSelectedSport(facility.sportTypes[0]);
    }
  }, [facility, selectedSport]);

  const { openLabel, closeLabel } = useMemo(() => {
    let openTime = "06:00";
    let closeTime = "23:00";
    if (facility?.operatingHours) {
      try {
        const hours = JSON.parse(facility.operatingHours);
        const today = new Date(selectedDate || new Date())
          .toLocaleDateString("en", { weekday: "long" })
          .toLowerCase()
          .slice(0, 3);
        const todayHours = hours[today] || hours.monday;
        if (todayHours) {
          openTime = todayHours.open;
          closeTime = todayHours.close;
        }
      } catch {}
    }
    return { openLabel: openTime, closeLabel: closeTime };
  }, [facility?.operatingHours, selectedDate]);

  const timeSlots: TimeSlot[] = useMemo(() => {
    if (!facility || !selectedDate || !selectedSport) return [];
    const slots: TimeSlot[] = [];
    const pricePerHour = parseFloat(facility.pricePerHour); // This will be sport-specific in the future

    const dayOpen = parse(openLabel, "HH:mm", selectedDate);
    const dayClose = parse(closeLabel, "HH:mm", selectedDate);
    const now = new Date();

    // generate in 1-hour increments
    let current = dayOpen;
    while (isBefore(current, dayClose)) {
      const endWindow = addHours(current, 1); // Fixed 1-hour slots
      if (isAfter(endWindow, dayClose)) break;

      const isBooked = existingBookings.some((booking) => {
        const bookingStart = new Date(booking.startTime);
        const bookingEnd = new Date(booking.endTime);
        return (
          (current >= bookingStart && current < bookingEnd) ||
          (endWindow > bookingStart && endWindow <= bookingEnd) ||
          (current <= bookingStart && endWindow >= bookingEnd)
        );
      });

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
  }, [facility, selectedDate, existingBookings, selectedSport, openLabel, closeLabel]);

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
      for (const r of mergedSelections) {
        const body = {
          facilityId: facilityId,
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
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">{facility.name}</h1>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="flex items-center bg-yellow-100 px-2 py-1 rounded-full">
                        <Star className="w-4 h-4 text-yellow-500 fill-current mr-1" />
                        <span className="text-sm font-semibold text-yellow-700">{facility.rating}</span>
                      </div>
                      <span className="text-sm text-gray-600">({facility.totalReviews} reviews)</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg">
                      <MapPin className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <div className="font-medium text-gray-900">{facility.address}</div>
                        <div className="text-gray-600">{facility.city}, {facility.state}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg">
                      <Clock className="w-4 h-4 text-green-600" />
                      <div>
                        <div className="font-medium text-gray-900">Open Today</div>
                        <div className="text-gray-600">{openLabel} - {closeLabel}</div>
                      </div>
                    </div>
                  </div>

                  {/* Amenities */}
                  {facility.amenities?.length > 0 && (
                    <div>
                      <div className="text-sm font-semibold text-gray-700 mb-2">Amenities</div>
                      <div className="flex flex-wrap gap-2">
                        {facility.amenities.slice(0, 6).map((amenity) => {
                          const IconComponent = amenityIcons[amenity] || Zap;
                          return (
                            <div key={amenity} className="flex items-center gap-1 text-xs text-gray-600 bg-gray-100 rounded-full px-2 py-1">
                              <IconComponent className="w-3 h-3" />
                              <span>{amenity}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Facility Description with Map */}
          {facility.description ? (
            <div className="max-w-7xl mx-auto px-6 py-4">
              <Card className="border-0 shadow-lg bg-white/95 backdrop-blur-sm">
                <CardContent className="p-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Description Section */}
                    <div className="lg:col-span-1">
                      <h2 className="text-xl font-bold text-gray-900 mb-3">About This Facility</h2>
                      <p className="text-gray-700 leading-relaxed">{facility.description}</p>
                    </div>
                    
                    {/* Map Section - Bigger */}
                    <div className="lg:col-span-1">
                      <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                        <MapPin className="w-5 h-5 text-red-500" />
                        Facility Location
                      </h3>
                      <div className="bg-gray-100 rounded-lg overflow-hidden border-2 border-gray-200 shadow-inner">
                        <iframe
                          src={
                            facility.latitude && facility.longitude
                              ? `https://maps.google.com/maps?q=${facility.latitude},${facility.longitude}&t=&z=16&ie=UTF8&iwloc=&output=embed`
                              : `https://maps.google.com/maps?q=${encodeURIComponent(`${facility.address}, ${facility.city}, ${facility.state}`)}&t=&z=15&ie=UTF8&iwloc=&output=embed`
                          }
                          width="100%"
                          height="350"
                          frameBorder="0"
                          style={{ border: 0 }}
                          allowFullScreen={false}
                          loading="lazy"
                          title="Facility Location"
                          className="w-full h-80"
                        />
                      </div>
                      <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <div className="flex items-start gap-3">
                          <MapPin className="w-5 h-5 text-blue-600 mt-1 flex-shrink-0" />
                          <div className="flex-1">
                            <div className="text-sm font-semibold text-gray-900 mb-1">{facility.name}</div>
                            <div className="text-sm font-medium text-gray-900">{facility.address}</div>
                            <div className="text-sm text-gray-600 mb-3">{facility.city}, {facility.state} {facility.zipCode}</div>
                            {facility.latitude && facility.longitude && (
                              <div className="text-xs text-gray-500 mb-3">
                                📍 {parseFloat(facility.latitude).toFixed(6)}, {parseFloat(facility.longitude).toFixed(6)}
                              </div>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            const query = facility.latitude && facility.longitude
                              ? `${facility.latitude},${facility.longitude}`
                              : `${facility.address}, ${facility.city}, ${facility.state}`;
                            const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
                            window.open(googleMapsUrl, '_blank');
                          }}
                          className="w-full text-sm bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors duration-200 flex items-center justify-center gap-2 shadow-sm hover:shadow-md font-medium"
                        >
                          <MapPin className="w-4 h-4" />
                          Get Directions on Google Maps
                        </button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            /* Map only section for facilities without description */
            <div className="max-w-7xl mx-auto px-6 py-4">
              <Card className="border-0 shadow-lg bg-white/95 backdrop-blur-sm">
                <CardContent className="p-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div>
                      <h2 className="text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
                        <MapPin className="w-5 h-5 text-red-500" />
                        Facility Location
                      </h2>
                      <div className="bg-gray-100 rounded-lg overflow-hidden border-2 border-gray-200 shadow-inner">
                        <iframe
                          src={
                            facility.latitude && facility.longitude
                              ? `https://maps.google.com/maps?q=${facility.latitude},${facility.longitude}&t=&z=16&ie=UTF8&iwloc=&output=embed`
                              : `https://maps.google.com/maps?q=${encodeURIComponent(`${facility.address}, ${facility.city}, ${facility.state}`)}&t=&z=15&ie=UTF8&iwloc=&output=embed`
                          }
                          width="100%"
                          height="350"
                          frameBorder="0"
                          style={{ border: 0 }}
                          allowFullScreen={false}
                          loading="lazy"
                          title="Facility Location"
                          className="w-full h-80"
                        />
                      </div>
                    </div>
                    <div className="flex flex-col justify-center">
                      <div className="p-6 bg-blue-50 rounded-lg border border-blue-200">
                        <div className="flex items-start gap-3 mb-4">
                          <MapPin className="w-6 h-6 text-blue-600 mt-1 flex-shrink-0" />
                          <div className="flex-1">
                            <div className="text-lg font-semibold text-gray-900 mb-2">{facility.name}</div>
                            <div className="text-sm font-medium text-gray-900">{facility.address}</div>
                            <div className="text-sm text-gray-600 mb-3">{facility.city}, {facility.state} {facility.zipCode}</div>
                            {facility.latitude && facility.longitude && (
                              <div className="text-xs text-gray-500 mb-3">
                                📍 Coordinates: {parseFloat(facility.latitude).toFixed(6)}, {parseFloat(facility.longitude).toFixed(6)}
                              </div>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            const query = facility.latitude && facility.longitude
                              ? `${facility.latitude},${facility.longitude}`
                              : `${facility.address}, ${facility.city}, ${facility.state}`;
                            const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
                            window.open(googleMapsUrl, '_blank');
                          }}
                          className="w-full text-sm bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors duration-200 flex items-center justify-center gap-2 shadow-sm hover:shadow-md font-medium"
                        >
                          <MapPin className="w-5 h-5" />
                          Get Directions on Google Maps
                        </button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Main Booking Interface - Compact Layout */}
          <div className="max-w-7xl mx-auto px-6 py-6">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              
              {/* Left Panel - Booking Controls */}
              <div className="lg:col-span-3">
                <Card className="border-0 shadow-lg bg-white/95 backdrop-blur-sm">
                  <CardContent className="p-6">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      
                      {/* Sports Selection */}
                      <div>
                        <Label className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
                          <Trophy className="w-4 h-4 text-blue-600" />
                          Choose Sport
                        </Label>
                        <div className="space-y-2">
                          {facility.sportTypes.map((sport) => {
                            const isSelected = selectedSport === sport;
                            const basePrice = parseFloat(facility.pricePerHour);
                            
                            return (
                              <div
                                key={sport}
                                onClick={() => setSelectedSport(sport)}
                                className={`cursor-pointer p-3 rounded-lg border-2 transition-all duration-200 ${
                                  isSelected 
                                    ? "border-blue-500 bg-blue-50 shadow-md" 
                                    : "border-gray-200 hover:border-blue-300 hover:bg-blue-50/50"
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xl">{sportIcons[sport]}</span>
                                    <span className="font-medium text-gray-900 text-sm">
                                      {sportTypeLabels[sport] || sport}
                                    </span>
                                  </div>
                                  <span className="text-sm font-bold text-blue-600">₹{basePrice}/hr</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Date Selection */}
                      <div>
                        <Label className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
                          <CalendarIcon className="w-4 h-4 text-green-600" />
                          Select Date
                        </Label>
                        <div className="bg-white rounded-lg border-2 border-gray-200 p-3 flex justify-center">
                          <Calendar
                            mode="single"
                            selected={selectedDate}
                            onSelect={setSelectedDate}
                            disabled={(date) => {
                              const today = new Date();
                              today.setHours(0, 0, 0, 0);
                              const dateToCheck = new Date(date);
                              dateToCheck.setHours(0, 0, 0, 0);
                              return dateToCheck < today || date > addHours(new Date(), 24 * 30);
                            }}
                            className="mx-auto"
                          />
                        </div>
                        {selectedDate && (
                          <div className="mt-2 text-center text-sm text-blue-600 font-medium">
                            📅 {format(selectedDate, "EEEE, MMM dd, yyyy")}
                          </div>
                        )}
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
                            <p className="text-sm">No slots available</p>
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
                                  className={`w-full flex items-center justify-between p-3 border-2 rounded-lg text-left transition-all duration-200 ${
                                    isSelected
                                      ? "border-blue-500 bg-blue-50 shadow-md"
                                      : "border-gray-200 hover:border-blue-300 hover:bg-blue-50/50"
                                  }`}
                                >
                                  <div className="flex items-center gap-2">
                                    <div className={`h-4 w-4 rounded-full border-2 flex items-center justify-center ${
                                      isSelected
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

                {/* Reviews Section - Compact */}
                <Card className="border-0 shadow-lg bg-white/90 backdrop-blur-sm mt-6">
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
                                      className={`text-2xl ${
                                        star <= reviewRating ? "text-yellow-400" : "text-gray-300"
                                      }`}
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
                                  onChange={(e) => setReviewComment(e.target.value)}
                                  rows={4}
                                />
                              </div>
                              <div className="flex gap-2 justify-end">
                                <Button
                                  variant="outline"
                                  onClick={() => setShowReviewDialog(false)}
                                >
                                  Cancel
                                </Button>
                                <Button
                                  onClick={handleSubmitReview}
                                  disabled={isSubmittingReview || !reviewComment.trim()}
                                  className="bg-blue-600 hover:bg-blue-700"
                                >
                                  {isSubmittingReview ? "Submitting..." : "Submit Review"}
                                </Button>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    {reviews.length === 0 ? (
                      <div className="text-center py-6 text-gray-500">
                        <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-30" />
                        <p className="text-sm">No reviews yet. Be the first to review!</p>
                      </div>
                    ) : (
                      <div className="space-y-3 max-h-60 overflow-y-auto">
                        {reviews.slice(0, 3).map((review) => (
                          <div key={review.id} className="p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-start gap-2">
                              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                <User className="w-4 h-4 text-blue-600" />
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-medium text-gray-900 text-sm">
                                    {review.user ? `${review.user.firstName} ${review.user.lastName}` : "Anonymous"}
                                  </span>
                                  <div className="flex">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                      <Star
                                        key={star}
                                        className={`w-3 h-3 ${
                                          star <= review.rating ? "text-yellow-400 fill-current" : "text-gray-300"
                                        }`}
                                      />
                                    ))}
                                  </div>
                                </div>
                                <p className="text-gray-700 text-sm">{review.comment}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                        {reviews.length > 3 && (
                          <div className="text-center">
                            <Button variant="outline" size="sm">
                              View All Reviews
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Right Sidebar - Booking Summary (Static) */}
              <div className="lg:col-span-1">
                <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-blue-50">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg font-bold text-gray-900">Booking Summary</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="text-sm space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Sport:</span>
                        <span className="font-semibold">
                          {selectedSport ? `${sportIcons[selectedSport]} ${sportTypeLabels[selectedSport]}` : "-"}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Date:</span>
                        <span className="font-semibold">
                          {selectedDate ? format(selectedDate, "MMM dd") : "-"}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Selected slots:</span>
                        <span className="font-semibold text-blue-600">{selectedSlots.length}</span>
                      </div>
                      
                      {selectedSlots.length > 0 && (
                        <div className="border-t pt-3 space-y-2">
                          <div className="text-xs text-gray-500 mb-2">Time slots:</div>
                          <div className="max-h-32 overflow-y-auto space-y-1">
                            {selectedSlots.map((slot, idx) => (
                              <div key={idx} className="flex justify-between text-xs bg-blue-50 p-2 rounded">
                                <span>{slot.startTimeLabel} - {format(slot.endDate, "HH:mm")}</span>
                                <span className="font-semibold">₹{slot.totalPrice}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      <div className="border-t pt-3">
                        <div className="flex justify-between items-center text-base">
                          <span className="font-semibold text-gray-900">Total:</span>
                          <span className="font-bold text-xl text-blue-600">₹{totalSelectedAmount}</span>
                        </div>
                      </div>
                    </div>
                    
                    <Button 
                      className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg" 
                      disabled={selectedSlots.length === 0 || isProcessing} 
                      onClick={proceedToCheckout}
                    >
                      {isProcessing ? (
                        <div className="flex items-center gap-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          Processing...
                        </div>
                      ) : selectedSlots.length === 0 ? (
                        "Select Time Slots"
                      ) : (
                        `Book Now - ₹${totalSelectedAmount}`
                      )}
                    </Button>
                    
                    {selectedSlots.length === 0 && (
                      <p className="text-xs text-gray-500 text-center">
                        Select time slots to proceed
                      </p>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}