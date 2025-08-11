import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, useRoute } from "wouter";
import { useStripe, Elements, PaymentElement, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import Navbar from "@/components/ui/navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { format, addHours, parseISO } from "date-fns";
import { Calendar, Clock, MapPin, Star, CreditCard } from "lucide-react";

// Make sure to call `loadStripe` outside of a component's render to avoid
// recreating the `Stripe` object on every render.
if (!import.meta.env.VITE_STRIPE_PUBLIC_KEY) {
  throw new Error('Missing required Stripe key: VITE_STRIPE_PUBLIC_KEY');
}
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

const sportTypeLabels: Record<string, string> = {
  badminton: "Badminton",
  tennis: "Tennis",
  basketball: "Basketball",
  football: "Football",
  table_tennis: "Table Tennis",
  squash: "Squash",
};

interface BookingFormData {
  date: string;
  startTime: string;
  duration: number;
  notes: string;
}

const CheckoutForm = ({ facilityId, bookingData, totalAmount }: { 
  facilityId: string; 
  bookingData: BookingFormData; 
  totalAmount: number;
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);

    try {
      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/dashboard`,
        },
        redirect: 'if_required',
      });

      if (error) {
        toast({
          title: "Payment Failed",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Booking Confirmed!",
          description: "Your facility has been booked successfully.",
        });
        setLocation('/dashboard');
      }
    } catch (error) {
      toast({
        title: "Payment Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <h3 className="text-lg font-medium flex items-center">
          <CreditCard className="w-5 h-5 mr-2" />
          Payment Details
        </h3>
        <PaymentElement 
          options={{
            layout: "tabs"
          }}
        />
      </div>
      
      <div className="border-t pt-4">
        <div className="flex justify-between items-center text-lg font-semibold">
          <span>Total Amount:</span>
          <span>₹{totalAmount}</span>
        </div>
      </div>

      <Button 
        type="submit" 
        disabled={!stripe || isProcessing} 
        className="w-full"
        size="lg"
      >
        {isProcessing ? "Processing..." : `Pay ₹${totalAmount}`}
      </Button>
    </form>
  );
};

export default function BookFacility() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, params] = useRoute("/book/:facilityId");
  const [, setLocation] = useLocation();
  const [clientSecret, setClientSecret] = useState("");
  const [bookingData, setBookingData] = useState<BookingFormData>({
    date: format(new Date(), 'yyyy-MM-dd'),
    startTime: '09:00',
    duration: 1,
    notes: '',
  });

  const facilityId = params?.facilityId;

  // Fetch facility details
  const { data: facility, isLoading: facilityLoading } = useQuery<any>({
    queryKey: [`/api/facilities/${facilityId}`],
    enabled: !!facilityId,
  });

  // Calculate total amount
  const totalAmount = facility ? parseFloat(facility.pricePerHour) * bookingData.duration : 0;

  // Create payment intent mutation
  const createPaymentIntentMutation = useMutation({
    mutationFn: async (bookingDetails: any) => {
      const response = await apiRequest("POST", "/api/create-booking-payment", bookingDetails);
      return response.json();
    },
    onSuccess: (data) => {
      setClientSecret(data.clientSecret);
    },
    onError: (error: any) => {
      toast({
        title: "Booking Failed",
        description: error.message || "Failed to create booking. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleBookingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to book a facility.",
        variant: "destructive",
      });
      setLocation('/login');
      return;
    }

    if (!facility) {
      toast({
        title: "Error",
        description: "Facility information not available.",
        variant: "destructive",
      });
      return;
    }

    const startDateTime = new Date(`${bookingData.date}T${bookingData.startTime}`);
    const endDateTime = addHours(startDateTime, bookingData.duration);

    const bookingDetails = {
      facilityId: facility.id,
      date: startDateTime.toISOString(),
      startTime: startDateTime.toISOString(),
      endTime: endDateTime.toISOString(),
      totalAmount: totalAmount,
      notes: bookingData.notes,
    };

    createPaymentIntentMutation.mutate(bookingDetails);
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-md mx-auto pt-20">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <h2 className="text-xl font-semibold mb-4">Login Required</h2>
                <p className="text-gray-600 mb-6">Please log in to book this facility.</p>
                <Button onClick={() => setLocation('/login')} className="w-full">
                  Go to Login
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (facilityLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="space-y-4">
                <div className="h-64 bg-gray-200 rounded"></div>
                <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </div>
              <div className="h-96 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!facility) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-md mx-auto pt-20">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <h2 className="text-xl font-semibold mb-4">Facility Not Found</h2>
                <p className="text-gray-600 mb-6">The requested facility could not be found.</p>
                <Button onClick={() => setLocation('/facilities')} className="w-full">
                  Browse Facilities
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-6">
          <Button 
            variant="outline" 
            onClick={() => setLocation('/facilities')}
            className="mb-4"
          >
            ← Back to Facilities
          </Button>
          <h1 className="text-3xl font-bold text-gray-900">Book {facility.name}</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Facility Details */}
          <div className="space-y-6">
            <Card>
              <CardContent className="p-6">
                <div className="relative mb-4">
                  <img 
                    src={facility.images[0] || "https://images.unsplash.com/photo-1554068865-24cecd4e34b8"} 
                    alt={facility.name}
                    className="w-full h-48 object-cover rounded-lg"
                  />
                  <div className="absolute top-2 right-2">
                    <div className="flex flex-wrap gap-1">
                      {facility.sportTypes?.slice(0, 2).map((sportType: string) => (
                        <Badge key={sportType} variant="secondary" className="bg-white/90">
                          {sportTypeLabels[sportType] || sportType}
                        </Badge>
                      ))}
                      {facility.sportTypes?.length > 2 && (
                        <Badge variant="secondary" className="bg-white/90">
                          +{facility.sportTypes.length - 2}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                <h2 className="text-2xl font-semibold mb-2">{facility.name}</h2>
                
                <div className="flex items-center space-x-4 text-sm text-gray-600 mb-4">
                  <span className="flex items-center">
                    <MapPin className="w-4 h-4 mr-1" />
                    {facility.city}
                  </span>
                  <span className="flex items-center">
                    <Star className="w-4 h-4 mr-1 text-yellow-400 fill-current" />
                    {facility.rating} ({facility.totalReviews})
                  </span>
                </div>

                {facility.description && (
                  <p className="text-gray-600 mb-4">{facility.description}</p>
                )}

                <div className="border-t pt-4">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-semibold">Price per Hour:</span>
                    <span className="text-xl font-bold text-primary">₹{facility.pricePerHour}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Booking Form */}
          <div className="space-y-6">
            {!clientSecret ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Calendar className="w-5 h-5 mr-2" />
                    Book This Facility
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleBookingSubmit} className="space-y-4">
                    <div>
                      <Label htmlFor="date">Date</Label>
                      <Input
                        id="date"
                        type="date"
                        value={bookingData.date}
                        min={format(new Date(), 'yyyy-MM-dd')}
                        onChange={(e) => setBookingData(prev => ({ ...prev, date: e.target.value }))}
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="startTime">Start Time</Label>
                      <Input
                        id="startTime"
                        type="time"
                        value={bookingData.startTime}
                        onChange={(e) => setBookingData(prev => ({ ...prev, startTime: e.target.value }))}
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="duration">Duration (hours)</Label>
                      <Input
                        id="duration"
                        type="number"
                        min="1"
                        max="8"
                        value={bookingData.duration}
                        onChange={(e) => setBookingData(prev => ({ ...prev, duration: parseInt(e.target.value) }))}
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="notes">Notes (optional)</Label>
                      <Textarea
                        id="notes"
                        value={bookingData.notes}
                        onChange={(e) => setBookingData(prev => ({ ...prev, notes: e.target.value }))}
                        placeholder="Any special requirements or notes..."
                        rows={3}
                      />
                    </div>

                    <div className="border-t pt-4">
                      <div className="flex justify-between items-center mb-4">
                        <span className="font-medium">Total Amount:</span>
                        <span className="text-xl font-bold">₹{totalAmount}</span>
                      </div>
                      <Button 
                        type="submit" 
                        className="w-full" 
                        size="lg"
                        disabled={createPaymentIntentMutation.isPending}
                      >
                        {createPaymentIntentMutation.isPending ? "Processing..." : "Proceed to Payment"}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Complete Your Booking</CardTitle>
                </CardHeader>
                <CardContent>
                  <Elements stripe={stripePromise} options={{ clientSecret }}>
                    <CheckoutForm 
                      facilityId={facilityId!} 
                      bookingData={bookingData} 
                      totalAmount={totalAmount}
                    />
                  </Elements>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}