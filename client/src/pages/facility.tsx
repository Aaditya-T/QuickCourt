import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useRoute, useLocation, Link } from "wouter";
import Navbar from "@/components/ui/navbar";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { MapPin, Phone, Star, Clock, ShieldCheck, ChevronRight, Check } from "lucide-react";
import { addHours, format, isAfter, isBefore, parse } from "date-fns";
import { useAuth } from "@/lib/auth";
import { apiRequest } from "@/lib/queryClient";

type Facility = {
  id: string;
  ownerId: string;
  name: string;
  description?: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
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
};

const sportTypeLabels: Record<string, string> = {
  badminton: "Badminton",
  tennis: "Tennis",
  basketball: "Basketball",
  football: "Football",
  table_tennis: "Table Tennis",
  squash: "Squash",
};

export default function Facility() {
  const [, setLocation] = useLocation();
  const [match, params] = useRoute("/facilities/:id");
  const facilityId = params?.id || "";
  const { token, user } = useAuth();

  const [selectedSport, setSelectedSport] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [durationHours, setDurationHours] = useState<number>(1);
  const minBookingHours = 1;
  const [selectedSlots, setSelectedSlots] = useState<TimeSlot[]>([]);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

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
    if (!facility || !selectedDate) return [];
    const slots: TimeSlot[] = [];
    const pricePerHour = parseFloat(facility.pricePerHour);

    const dayOpen = parse(openLabel, "HH:mm", selectedDate);
    const dayClose = parse(closeLabel, "HH:mm", selectedDate);

    // generate in 1-hour increments, but the window length equals durationHours
    let current = dayOpen;
    while (isBefore(current, dayClose)) {
      const endWindow = addHours(current, durationHours);
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

      slots.push({
        startTimeLabel: format(current, "HH:mm"),
        startDate: current,
        endDate: endWindow,
        available: !isBooked,
        totalPrice: pricePerHour * durationHours,
      });

      current = addHours(current, 1);
    }
    return slots;
  }, [facility, selectedDate, existingBookings, durationHours, openLabel, closeLabel]);

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

  const defaultImages = [
    "https://images.unsplash.com/photo-1554068865-24cecd4e34b8?auto=format&fit=crop&w=1200&q=60",
    "https://images.unsplash.com/photo-1546519638-68e109498ffc?auto=format&fit=crop&w=1200&q=60",
    "https://images.unsplash.com/photo-1508609349937-5ec4ae374ebf?auto=format&fit=crop&w=1200&q=60",
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      {isFacilityLoading || !facility ? (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Skeleton className="h-72 w-full mb-6" />
          <Card>
            <CardContent className="pt-6"><Skeleton className="h-6 w-1/2 mb-4" /><Skeleton className="h-4 w-1/3" /></CardContent>
          </Card>
        </div>
      ) : (
        <>
          {/* Hero carousel */}
          <div className="bg-white border-b">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  <Carousel className="w-full">
                    <CarouselContent>
                      {(facility.images?.length ? facility.images : defaultImages).map((img, idx) => (
                        <CarouselItem key={idx}>
                          <img src={img} alt={`Image ${idx + 1}`} className="w-full h-72 object-cover rounded-lg" />
                        </CarouselItem>
                      ))}
                    </CarouselContent>
                    <CarouselPrevious />
                    <CarouselNext />
                  </Carousel>
                </div>
                <div className="space-y-4">
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900">{facility.name}</h1>
                    <div className="flex items-center text-gray-600 mt-1">
                      <Star className="w-4 h-4 text-yellow-400 fill-current" />
                      <span className="ml-1 text-sm">{facility.rating} ({facility.totalReviews} reviews)</span>
                    </div>
                  </div>
                  <Button className="w-full bg-emerald-600 hover:bg-emerald-700">Book This Venue</Button>
                  <div className="text-sm text-gray-700 space-y-2">
                    <div className="flex items-start">
                      <MapPin className="w-4 h-4 mr-2 mt-0.5" />
                      <div>
                        <div>{facility.address}</div>
                        <div>{facility.city}, {facility.state} {facility.zipCode}</div>
                        <a
                          className="text-primary inline-flex items-center mt-1"
                          target="_blank"
                          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${facility.address}, ${facility.city}, ${facility.state} ${facility.zipCode}`)}`}
                          rel="noreferrer"
                        >
                          View on map <ChevronRight className="w-4 h-4 ml-1" />
                        </a>
                      </div>
                    </div>
                    <div className="flex items-center">
                      <Phone className="w-4 h-4 mr-2" />
                      <span>Contact: Not provided</span>
                    </div>
                    <div className="flex items-center text-gray-600">
                      <Clock className="w-4 h-4 mr-2" />
                      <span>Today: {openLabel} - {closeLabel}</span>
                    </div>
                    <div className="flex items-center text-gray-600">
                      <ShieldCheck className="w-4 h-4 mr-2" />
                      <span>Minimum booking time: {minBookingHours} hour</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Booking section */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <Card>
                  <CardContent className="pt-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div>
                        <Label className="mb-2 block">Sports Available</Label>
                        <div className="flex flex-wrap gap-2">
                          {facility.sportTypes.map((sport) => (
                            <Badge
                              key={sport}
                              variant={selectedSport === sport ? "default" : "outline"}
                              className={`cursor-pointer px-3 py-1 ${selectedSport === sport ? "bg-primary text-white" : ""}`}
                              onClick={() => setSelectedSport(sport)}
                            >
                              {sportTypeLabels[sport] || sport}
                            </Badge>
                          ))}
                        </div>
                        <div className="mt-3 text-xs text-gray-500">Click a sport to view pricing.</div>
                      </div>
                      <div>
                        <Label className="mb-2 block">Date</Label>
                        <Calendar
                          mode="single"
                          selected={selectedDate}
                          onSelect={setSelectedDate}
                          disabled={(date) => date < new Date() || date > addHours(new Date(), 24 * 30)}
                          className="rounded-md border"
                        />
                      </div>
                      <div>
                        <Label className="mb-2 block">Duration</Label>
                        <Select
                          value={String(durationHours)}
                          onValueChange={(v) => setDurationHours(parseInt(v, 10))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select duration" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1">1 hour</SelectItem>
                            <SelectItem value="2">2 hours</SelectItem>
                            <SelectItem value="3">3 hours</SelectItem>
                          </SelectContent>
                        </Select>
                        <div className="text-sm text-gray-500 mt-2 flex flex-col gap-1">
                          <div className="font-medium">Pricing</div>
                          <div className="text-xs">Base: ₹{parseFloat(facility.pricePerHour)}/hr</div>
                          <div className="text-xs">Weekend: +20% | Peak (6–9 PM): +30%</div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold">Available Time Slots</h3>
                      {selectedDate && (
                        <div className="text-sm text-gray-500">for {format(selectedDate, "MMM dd, yyyy")}</div>
                      )}
                    </div>
                    {isBookingsLoading ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {Array.from({ length: 6 }).map((_, i) => (
                          <Skeleton key={i} className="h-12 w-full" />
                        ))}
                      </div>
                    ) : timeSlots.length === 0 ? (
                      <div className="text-center text-gray-500 py-10">No slots available for this date</div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {timeSlots.map((slot, idx) => {
                          // Apply dynamic pricing multipliers: weekend + peak hours
                          const day = (selectedDate ?? new Date()).getDay();
                          const isWeekend = day === 0 || day === 6;
                          const startHour = slot.startDate.getHours();
                          const isPeak = startHour >= 18 && startHour < 21;
                          let price = slot.totalPrice;
                          if (isWeekend) price *= 1.2;
                          if (isPeak) price *= 1.3;
                          price = Math.round(price);
                          const formattedPrice = `₹${price}`;
                          return (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => slot.available && toggleSlot(slot)}
                            className={`flex items-center justify-between p-3 border rounded-lg text-left transition ${
                              !slot.available
                                ? "bg-gray-50 opacity-60 cursor-not-allowed"
                                : selectedSlots.some((s) => s.startDate.getTime() === slot.startDate.getTime())
                                ? "border-primary bg-primary/5"
                                : "hover:border-primary"
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`h-5 w-5 rounded border flex items-center justify-center ${
                                selectedSlots.some((s) => s.startDate.getTime() === slot.startDate.getTime())
                                  ? "bg-primary text-white border-primary"
                                  : "bg-white"
                              }`}>
                                {selectedSlots.some((s) => s.startDate.getTime() === slot.startDate.getTime()) && (
                                  <Check className="h-4 w-4" />
                                )}
                              </div>
                              <div>
                                <div className="text-sm font-medium">
                                  {slot.startTimeLabel} - {format(slot.endDate, "HH:mm")}
                                </div>
                                <div className="text-xs text-gray-500">{slot.available ? "Available" : "Booked"}</div>
                              </div>
                            </div>
                            <div className="text-sm font-semibold">{formattedPrice}</div>
                          </button>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Sidebar: summary */}
              <div className="space-y-6">
                <Card>
                  <CardContent className="pt-6 space-y-4">
                    <h3 className="text-lg font-semibold">Booking Summary</h3>
                    <div className="text-sm text-gray-700 space-y-2">
                      <div className="flex justify-between"><span>Sport</span><span>{selectedSport ? (sportTypeLabels[selectedSport] || selectedSport) : "-"}</span></div>
                      <div className="flex justify-between"><span>Date</span><span>{selectedDate ? format(selectedDate, "MMM dd, yyyy") : "-"}</span></div>
                      <div className="flex justify-between"><span>Per-slot duration</span><span>{durationHours} hr</span></div>
                      <div className="flex justify-between"><span>Selected slots</span><span>{selectedSlots.length}</span></div>
                      <div className="flex justify-between font-semibold border-t pt-2"><span>Rate</span><span>₹{parseFloat(facility.pricePerHour)}/hr</span></div>
                      <div className="flex justify-between font-semibold"><span>Minimum</span><span>{minBookingHours} hour</span></div>
                      <div className="flex justify-between text-base font-semibold"><span>Total</span><span>₹{totalSelectedAmount}</span></div>
                      <div className="text-xs text-gray-500">Dynamic pricing is applied per slot (weekends/peak). Final total recalculates at checkout.</div>
                    </div>
                    <div className="text-xs text-gray-500">Select multiple slots, then proceed to checkout.</div>
                    <Button className="w-full" disabled={selectedSlots.length === 0 || isProcessing} onClick={proceedToCheckout}>
                      {isProcessing ? "Processing..." : `Proceed to Checkout (${selectedSlots.length} slot${selectedSlots.length === 1 ? "" : "s"})`}
                    </Button>
                  </CardContent>
                </Card>

                {facility.amenities?.length ? (
                  <Card>
                    <CardContent className="pt-6">
                      <h3 className="text-lg font-semibold mb-3">Amenities</h3>
                      <div className="flex flex-wrap gap-2">
                        {facility.amenities.map((a) => (
                          <Badge key={a} variant="outline">{a}</Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ) : null}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}


