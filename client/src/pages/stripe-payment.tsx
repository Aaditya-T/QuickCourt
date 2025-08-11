import React, { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  CardElement,
  useStripe,
  useElements
} from '@stripe/react-stripe-js';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, CreditCard } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import axios from 'axios';

// Initialize Stripe
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY!);

interface PaymentFormProps {
  amount: number;
  customerName: string;
  customerPhone: string;
  onSuccess: (paymentIntent: any) => void;
  onError: (error: string) => void;
}

const PaymentForm: React.FC<PaymentFormProps> = ({ 
  amount, 
  customerName, 
  customerPhone, 
  onSuccess, 
  onError 
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsLoading(true);

    try {
      // Get booking IDs from URL parameters  
      const urlParams = new URLSearchParams(window.location.search);
      const bookingIds = urlParams.get('bookingIds') || '';
      
      // Create payment intent
      const response = await axios.post('/api/create-payment-intent', {
        amount: amount,
        currency: 'inr',
        name: customerName,
        number: customerPhone,
        transactionId: `txn_${Date.now()}`,
        bookingIds: bookingIds
      });

      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to create payment intent');
      }

      const { clientSecret } = response.data;

      // Confirm payment with Stripe
      const cardElement = elements.getElement(CardElement)!;
      
      const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: cardElement,
          billing_details: {
            name: customerName,
            phone: customerPhone,
          },
        },
      });

      if (error) {
        console.error('Payment failed:', error);
        onError(error.message || 'Payment failed');
        toast({
          title: "Payment Failed",
          description: error.message || 'Payment failed. Please try again.',
          variant: "destructive",
        });
      } else if (paymentIntent.status === 'succeeded') {
        console.log('Payment succeeded:', paymentIntent);
        onSuccess(paymentIntent);
        toast({
          title: "Payment Successful!",
          description: "Your payment has been processed successfully.",
        });
      }
    } catch (error: any) {
      console.error('Payment error:', error);
      onError(error.message || 'Payment failed');
      toast({
        title: "Payment Failed",
        description: error.message || 'An error occurred while processing your payment.',
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <div className="p-4 border rounded-md">
          <label className="block text-sm font-medium mb-2">Card Details</label>
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
                invalid: {
                  color: '#9e2146',
                },
              },
            }}
          />
        </div>
        
        <div className="flex justify-between py-2 border-b border-gray-100">
          <span className="font-medium text-gray-700">Customer:</span>
          <span className="text-gray-900">{customerName}</span>
        </div>
        <div className="flex justify-between py-2 border-b border-gray-100">
          <span className="font-medium text-gray-700">Phone:</span>
          <span className="text-gray-900">{customerPhone}</span>
        </div>
        <div className="flex justify-between py-2 border-b border-gray-100">
          <span className="font-medium text-gray-700">Amount:</span>
          <span className="text-gray-900 font-semibold">₹{amount}</span>
        </div>
      </div>
      
      <Button
        type="submit"
        className="w-full"
        disabled={!stripe || isLoading}
        size="lg"
      >
        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {isLoading ? 'Processing...' : `Pay ₹${amount}`}
      </Button>
    </form>
  );
};

const StripePayment: React.FC = () => {
  const { user } = useAuth();
  
  // Get amount and booking IDs from URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  const amount = parseFloat(urlParams.get('amount') || '0');
  const bookingIds = urlParams.get('bookingIds') || '';
  
  const [paymentData] = useState({
    name: user ? `${user.firstName} ${user.lastName}` : 'Guest User',
    amount: amount,
    number: user?.phone || '9999999999',
  });

  const handlePaymentSuccess = (paymentIntent: any) => {
    console.log('Payment successful:', paymentIntent);
    // Redirect to success page or update UI
    window.location.href = `/payment-success?payment_intent=${paymentIntent.id}`;
  };

  const handlePaymentError = (error: string) => {
    console.error('Payment error:', error);
    // Handle error - maybe show error state
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-primary">QuickCourt</h1>
          <p className="mt-2 text-gray-600">Complete your payment</p>
        </div>

        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CreditCard className="w-6 h-6 text-green-600" />
            </div>
            <CardTitle>Payment Details</CardTitle>
            <CardDescription>
              Enter your card details to complete the payment
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Elements stripe={stripePromise}>
              <PaymentForm
                amount={paymentData.amount}
                customerName={paymentData.name}
                customerPhone={paymentData.number}
                onSuccess={handlePaymentSuccess}
                onError={handlePaymentError}
              />
            </Elements>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default StripePayment;
