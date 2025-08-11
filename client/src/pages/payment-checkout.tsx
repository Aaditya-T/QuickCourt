import { useState, useEffect } from "react";
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { ArrowLeft, CreditCard, Clock, MapPin, Calendar } from "lucide-react";
import { format } from "date-fns";
import { apiRequest } from "@/lib/queryClient";

// Load Stripe
const stripePromise = import.meta.env.VITE_STRIPE_PUBLIC_KEY ? 
  loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY) : 
  null;

interface BookingInfo {
  bookingId: string;
  clientSecret: string;
  facility: any;
  amount: string;
  date: string;
  timeSlot: any;
}

const CheckoutForm = ({ bookingInfo }: { bookingInfo: BookingInfo }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setProcessing(true);

    const card = elements.getElement(CardElement);

    if (!card) {
      setProcessing(false);
      return;
    }

    const { error, paymentIntent } = await stripe.confirmCardPayment(bookingInfo.clientSecret, {
      payment_method: {
        card: card,
      }
    });

    if (error) {
      toast({
        title: "Payment Failed",
        description: error.message,
        variant: "destructive",
      });
      setProcessing(false);
    } else {
      // Payment successful
      try {
        await apiRequest("/api/confirm-payment", "POST", {
          paymentIntentId: paymentIntent.id
        });
        
        toast({
          title: "Payment Successful!",
          description: "Your booking has been confirmed.",
        });

        // Clear localStorage
        localStorage.removeItem('pendingBooking');
        
        // Redirect to bookings page
        setLocation('/bookings');
      } catch (confirmError) {
        toast({
          title: "Payment Processed",
          description: "Payment was successful, but there was an issue confirming your booking. Please contact support.",
          variant: "destructive",
        });
      }
      setProcessing(false);
    }
  };

  const formatTime = (timeString: string) => {
    return format(new Date(timeString), "h:mm a");
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), "EEEE, MMMM d, yyyy");
  };

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <div className="flex items-center gap-4 mb-6">
        <Button 
          variant="ghost" 
          onClick={() => setLocation('/facilities')}
          className="p-2"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold">Complete Your Booking</h1>
      </div>

      {/* Booking Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Booking Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-3">
            <MapPin className="h-5 w-5 text-muted-foreground mt-1" />
            <div>
              <p className="font-semibold">{bookingInfo.facility.name}</p>
              <p className="text-sm text-muted-foreground">{bookingInfo.facility.address}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Calendar className="h-5 w-5 text-muted-foreground" />
            <p>{formatDate(bookingInfo.date)}</p>
          </div>
          
          <div className="flex items-center gap-3">
            <Clock className="h-5 w-5 text-muted-foreground" />
            <p>
              {formatTime(bookingInfo.timeSlot.startTime)} - {formatTime(bookingInfo.timeSlot.endTime)}
            </p>
          </div>
          
          <div className="border-t pt-4">
            <div className="flex justify-between text-lg font-semibold">
              <span>Total Amount:</span>
              <span>${bookingInfo.amount}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Payment Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="p-4 border rounded-lg">
              <CardElement 
                options={{
                  style: {
                    base: {
                      fontSize: '16px',
                      color: '#424770',
                      '::placeholder': {
                        color: '#aab7c4',
                      },
                    },
                  },
                }}
              />
            </div>
            
            <Button 
              type="submit" 
              disabled={!stripe || processing} 
              className="w-full"
            >
              {processing ? "Processing..." : `Pay $${bookingInfo.amount}`}
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="text-center text-sm text-muted-foreground">
        <p>Payments are secured by Stripe</p>
      </div>
    </div>
  );
};

export default function PaymentCheckout() {
  const [bookingInfo, setBookingInfo] = useState<BookingInfo | null>(null);
  const [, setLocation] = useLocation();

  useEffect(() => {
    const stored = localStorage.getItem('pendingBooking');
    if (stored) {
      setBookingInfo(JSON.parse(stored));
    } else {
      // No booking info, redirect to facilities
      setLocation('/facilities');
    }
  }, [setLocation]);

  if (!stripePromise) {
    return (
      <div className="max-w-2xl mx-auto p-6 text-center">
        <h1 className="text-2xl font-bold mb-4">Payment Unavailable</h1>
        <p className="text-muted-foreground mb-4">
          Payment processing is currently unavailable. Please contact support to complete your booking.
        </p>
        <Button onClick={() => setLocation('/facilities')}>
          Return to Facilities
        </Button>
      </div>
    );
  }

  if (!bookingInfo) {
    return (
      <div className="max-w-2xl mx-auto p-6 text-center">
        <h1 className="text-2xl font-bold mb-4">Loading...</h1>
      </div>
    );
  }

  return (
    <Elements stripe={stripePromise} options={{ clientSecret: bookingInfo.clientSecret }}>
      <CheckoutForm bookingInfo={bookingInfo} />
    </Elements>
  );
}