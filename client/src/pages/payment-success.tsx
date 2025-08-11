import React, { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { handlePaymentSuccess } from '@/lib/paymentHandler';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

type PaymentStatus = 'processing' | 'success' | 'failed';

const PaymentSuccess: React.FC = () => {
  const [, setLocation] = useLocation();
  const [status, setStatus] = useState<PaymentStatus>('processing');
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const processPayment = async () => {
      setIsLoading(true);
      
      try {
        const success = await handlePaymentSuccess();
        
        if (success) {
          setStatus('success');
          toast({
            title: "Payment Successful!",
            description: "Your order has been processed successfully.",
          });
        } else {
          setStatus('failed');
          toast({
            title: "Payment Processing Failed",
            description: "There was an issue processing your payment. Please contact support.",
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error('Payment processing error:', error);
        setStatus('failed');
        toast({
          title: "Payment Error",
          description: "An unexpected error occurred while processing your payment.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    processPayment();
  }, [toast]);

  const handleContinue = () => {
    if (status === 'success') {
      setLocation('/dashboard');
    } else {
      setLocation('/stripe-payment');
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'processing':
        return <Loader2 className="w-16 h-16 text-blue-600 animate-spin" />;
      case 'success':
        return <CheckCircle className="w-16 h-16 text-green-600" />;
      case 'failed':
        return <XCircle className="w-16 h-16 text-red-600" />;
      default:
        return <Loader2 className="w-16 h-16 text-blue-600 animate-spin" />;
    }
  };

  const getStatusMessage = () => {
    switch (status) {
      case 'processing':
        return {
          title: 'Processing Payment...',
          description: 'Please wait while we verify your payment and process your order.',
        };
      case 'success':
        return {
          title: 'Payment Successful!',
          description: 'Your payment has been processed and your order is confirmed.',
        };
      case 'failed':
        return {
          title: 'Payment Failed',
          description: 'There was an issue processing your payment. Please try again or contact support.',
        };
      default:
        return {
          title: 'Processing Payment...',
          description: 'Please wait while we verify your payment and process your order.',
        };
    }
  };

  const statusMessage = getStatusMessage();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-primary">QuickCourt</h1>
          <p className="mt-2 text-gray-600">Payment Status</p>
        </div>

        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto mb-4">
              {getStatusIcon()}
            </div>
            <CardTitle>{statusMessage.title}</CardTitle>
            <CardDescription>
              {statusMessage.description}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            {status !== 'processing' && (
              <Button
                onClick={handleContinue}
                className="w-full"
                variant={status === 'success' ? 'default' : 'outline'}
                disabled={isLoading}
              >
                {status === 'success' ? 'Continue to Dashboard' : 'Try Again'}
              </Button>
            )}
            
            {status === 'processing' && (
              <p className="text-sm text-gray-500">
                This may take a few moments...
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PaymentSuccess;
