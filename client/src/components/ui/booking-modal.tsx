import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format, addHours, parse, isBefore, isAfter } from "date-fns";
import { Clock, MapPin, Star } from "lucide-react";

interface Facility {
  id: string;
  name: string;
  address: string;
  city: string;
  pricePerHour: string;
  rating: string;
  totalReviews: number;
  operatingHours: string;
}

interface Booking {
  startTime: string;
  endTime: string;
}

interface TimeSlot {
  startTime: string;
  endTime: string;
  available: boolean;
  price: number;
}

interface BookingModalProps {
  facility: Facility | null;
  open: boolean;
  onClose: () => void;
  onBookingComplete?: () => void;
}

export default function BookingModal({ facility, open, onClose, onBookingComplete }: BookingModalProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<TimeSlot | null>(null);
  const [notes, setNotes] = useState("");
  const { user, token } = useAuth();
  const { toast } = useToast();

  // Reset state when modal opens/closes
  useEffect(() => {
    if (open) {
      setSelectedDate(new Date());
      setSelectedTimeSlot(null);
      setNotes("");
    }
  }, [open]);

  // Fetch existing bookings for the facility and selected date
  const { data: existingBookings = [] } = useQuery({
    queryKey: ["/api/facilities", facility?.id, "bookings", selectedDate?.toISOString().split('T')[0]],
    enabled: !!facility && !!selectedDate,
    queryFn: async () => {
      if (!facility || !selectedDate) return [];
      const response = await fetch(
        `/api/facilities/${facility.id}/bookings?date=${selectedDate.toISOString().split('T')[0]}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );
      if (!response.ok) throw new Error('Failed to fetch bookings');
      return response.json();
    },
  });

  const createBookingMutation = useMutation({
    mutationFn: async (bookingData: any) => {
      return await apiRequest("POST", "/api/bookings", bookingData);
    },
    onSuccess: () => {
      toast({
        title: "Booking Confirmed",
        description: "Your booking has been successfully created.",
      });
      onBookingComplete?.();
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Booking Failed",
        description: error.message || "Failed to create booking. Please try again.",
        variant: "destructive",
      });
    },
  });

  if (!facility) return null;

  const generateTimeSlots = (): TimeSlot[] => {
    if (!selectedDate) return [];

    const slots: TimeSlot[] = [];
    const price = parseFloat(facility.pricePerHour);
    
    // Parse operating hours (simplified - assumes same hours every day)
    let openTime = "06:00";
    let closeTime = "23:00";
    
    try {
      const hours = JSON.parse(facility.operatingHours);
      const today = new Date(selectedDate).toLocaleDateString('en', { weekday: 'long' }).toLowerCase().slice(0, 3);
      const todayHours = hours[today] || hours.monday;
      if (todayHours) {
        openTime = todayHours.open;
        closeTime = todayHours.close;
      }
    } catch {
      // Use default hours
    }

    const startTime = parse(openTime, "HH:mm", selectedDate);
    const endTime = parse(closeTime, "HH:mm", selectedDate);
    
    let current = startTime;
    while (isBefore(current, endTime)) {
      const slotEnd = addHours(current, 1);
      if (isAfter(slotEnd, endTime)) break;
      
      // Check if slot is available
      const slotStartISO = current.toISOString();
      const slotEndISO = slotEnd.toISOString();
      
      const isBooked = existingBookings.some((booking: Booking) => {
        const bookingStart = new Date(booking.startTime);
        const bookingEnd = new Date(booking.endTime);
        return (
          (current >= bookingStart && current < bookingEnd) ||
          (slotEnd > bookingStart && slotEnd <= bookingEnd) ||
          (current <= bookingStart && slotEnd >= bookingEnd)
        );
      });
      
      slots.push({
        startTime: format(current, "HH:mm"),
        endTime: format(slotEnd, "HH:mm"),
        available: !isBooked,
        price,
      });
      
      current = slotEnd;
    }
    
    return slots;
  };

  const timeSlots = generateTimeSlots();

  const handleBooking = () => {
    if (!user) {
      toast({
        title: "Login Required",
        description: "Please log in to make a booking.",
        variant: "destructive",
      });
      return;
    }

    if (!selectedDate || !selectedTimeSlot) {
      toast({
        title: "Incomplete Selection",
        description: "Please select a date and time slot.",
        variant: "destructive",
      });
      return;
    }

    const startDateTime = parse(selectedTimeSlot.startTime, "HH:mm", selectedDate);
    const endDateTime = parse(selectedTimeSlot.endTime, "HH:mm", selectedDate);

    const bookingData = {
      facilityId: facility.id,
      date: selectedDate.toISOString(),
      startTime: startDateTime.toISOString(),
      endTime: endDateTime.toISOString(),
      totalAmount: selectedTimeSlot.price,
      notes: notes || undefined,
    };

    createBookingMutation.mutate(bookingData);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Book {facility.name}</DialogTitle>
        </DialogHeader>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Facility Info */}
          <div>
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-2">Facility Details</h3>
              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex items-center">
                  <MapPin className="w-4 h-4 mr-2" />
                  <span>{facility.address}, {facility.city}</span>
                </div>
                <div className="flex items-center">
                  <Star className="w-4 h-4 mr-2 text-yellow-400 fill-current" />
                  <span>{facility.rating} ({facility.totalReviews} reviews)</span>
                </div>
                <div className="flex items-center">
                  <Clock className="w-4 h-4 mr-2" />
                  <span>₹{facility.pricePerHour}/hour</span>
                </div>
              </div>
            </div>

            {/* Calendar */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Select Date</h3>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                disabled={(date) => date < new Date() || date > addHours(new Date(), 24 * 30)} // 30 days advance booking
                className="rounded-md border"
              />
            </div>
          </div>
          
          {/* Time Slots */}
          <div>
            <h3 className="text-lg font-semibold mb-4">
              Available Time Slots
              {selectedDate && (
                <span className="text-sm font-normal text-gray-500 ml-2">
                  for {format(selectedDate, "MMM dd, yyyy")}
                </span>
              )}
            </h3>
            
            <div className="space-y-2 max-h-64 overflow-y-auto mb-6">
              {timeSlots.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No time slots available for this date
                </div>
              ) : (
                timeSlots.map((slot, index) => (
                  <div
                    key={index}
                    className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-colors ${
                      !slot.available
                        ? "bg-gray-50 cursor-not-allowed opacity-50"
                        : selectedTimeSlot === slot
                        ? "border-primary bg-primary/5"
                        : "hover:border-primary"
                    }`}
                    onClick={() => slot.available && setSelectedTimeSlot(slot)}
                  >
                    <div className="flex items-center">
                      <input
                        type="radio"
                        checked={selectedTimeSlot === slot}
                        disabled={!slot.available}
                        readOnly
                        className="text-primary focus:ring-primary mr-3"
                      />
                      <div>
                        <div className="text-sm font-medium">
                          {slot.startTime} - {slot.endTime}
                        </div>
                        <div className="text-xs text-gray-500">
                          {slot.available ? "Available" : "Booked"}
                        </div>
                      </div>
                    </div>
                    <div className="text-sm font-medium">
                      ₹{slot.price}
                    </div>
                  </div>
                ))
              )}
            </div>
            
            {/* Notes */}
            <div className="mb-6">
              <Label htmlFor="notes" className="text-sm font-medium mb-2 block">
                Additional Notes (Optional)
              </Label>
              <Textarea
                id="notes"
                placeholder="Any special requirements or notes..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>
            
            {/* Booking Summary */}
            {selectedTimeSlot && (
              <div className="bg-gray-50 p-4 rounded-lg mb-6">
                <h4 className="font-medium mb-2">Booking Summary</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Date:</span>
                    <span>{selectedDate && format(selectedDate, "MMM dd, yyyy")}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Time:</span>
                    <span>{selectedTimeSlot.startTime} - {selectedTimeSlot.endTime}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Duration:</span>
                    <span>1 hour</span>
                  </div>
                  <div className="flex justify-between font-medium">
                    <span>Total:</span>
                    <span>₹{selectedTimeSlot.price}</span>
                  </div>
                </div>
              </div>
            )}
            
            <Button 
              onClick={handleBooking}
              disabled={!selectedTimeSlot || createBookingMutation.isPending}
              className="w-full"
              size="lg"
            >
              {createBookingMutation.isPending ? "Confirming..." : "Confirm Booking"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
