import axios from 'axios';

interface PaymentVerificationResponse {
  success: boolean;
  status: string;
  amount: number;
  currency: string;
  metadata: any;
  message?: string;
}

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  [key: string]: any;
}

interface Hamper {
  id: string;
  name: string;
  price: number;
  items: CartItem[];
  [key: string]: any;
}

interface PendingCartData {
  total: number;
  phone: string;
  cart: {
    items: CartItem[];
  };
  hampers: Hamper[];
}

interface OrderData {
  payment_intent_id: string;
  payment_mode: string;
  total?: number;
  phone?: string;
  cart_items?: CartItem[];
  hampers?: Hamper[];
}

interface CheckoutResponse {
  success: boolean;
  message?: string;
  data?: any;
  order?: any;
}

export const handleStripePaymentSuccess = async (paymentIntentId: string): Promise<boolean> => {
  try {
    if (!paymentIntentId) {
      console.error('No payment intent ID provided');
      return false;
    }

    console.log('Processing Stripe payment success for payment intent:', paymentIntentId);

    // Step 1: Verify payment status with the backend
    const verifyResponse = await axios.get<PaymentVerificationResponse>(
      `/api/payment-status/${paymentIntentId}`
    );

    if (!verifyResponse.data.success || verifyResponse.data.status !== 'succeeded') {
      console.error('Payment verification failed:', verifyResponse.data);
      return false;
    }

    // Step 2: Retrieve pending cart data from localStorage
    const pendingCartKey = `pendingCartData_${paymentIntentId}`;
    const pendingCartData = localStorage.getItem(pendingCartKey);
    let orderData: OrderData = {
      payment_intent_id: paymentIntentId,
      payment_mode: 'stripe',
    };

    if (pendingCartData) {
      try {
        const cartData: PendingCartData = JSON.parse(pendingCartData);
        orderData = {
          ...orderData,
          total: cartData.total,
          phone: cartData.phone,
          cart_items: cartData.cart.items,
          hampers: cartData.hampers,
        };
      } catch (parseError) {
        console.error('Error parsing cart data:', parseError);
        return false;
      }
    } else {
      console.warn('No pending cart data found for payment intent:', paymentIntentId);
    }

    // Step 3: Complete the checkout process
    const checkoutResponse = await axios.post<CheckoutResponse>(
      '/api/cart/checkout',
      orderData,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      }
    );

    if (!checkoutResponse.data.success) {
      console.error('Checkout failed:', checkoutResponse.data);
      return false;
    }

    // Step 4: Clean up localStorage
    localStorage.removeItem(pendingCartKey);

    // Step 5: Log success message
    console.log('Order processed successfully:', checkoutResponse.data);
    return true;
  } catch (error: any) {
    console.error('Error processing Stripe payment success:', error.message || error);
    return false;
  }
};

// Legacy function for backward compatibility
export const handlePaymentSuccess = async (): Promise<boolean> => {
  try {
    // Extract payment intent ID from URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const paymentIntentId = urlParams.get('payment_intent');

    if (!paymentIntentId) {
      console.error('No payment intent ID found in URL');
      return false;
    }

    // For now, just verify the payment with our server
    try {
      const response = await axios.post<PaymentVerificationResponse>(
        '/api/confirm-payment',
        { paymentIntentId },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
        }
      );

      if (response.data.success && response.data.status === 'succeeded') {
        console.log('Payment verification successful:', response.data);
        
        // Clean up any pending cart data
        const pendingCartKey = `pendingCartData_${paymentIntentId}`;
        localStorage.removeItem(pendingCartKey);
        
        return true;
      } else {
        console.error('Payment verification failed:', response.data);
        return false;
      }
    } catch (verificationError: any) {
      console.error('Payment verification error:', verificationError);
      return false;
    }
  } catch (error: any) {
    console.error('Error processing payment success:', error.message || error);
    return false;
  }
};

// Additional utility functions for payment handling
export const storePendingCartData = (paymentIntentId: string, cartData: PendingCartData): void => {
  const pendingCartKey = `pendingCartData_${paymentIntentId}`;
  localStorage.setItem(pendingCartKey, JSON.stringify(cartData));
};

export const getPendingCartData = (paymentIntentId: string): PendingCartData | null => {
  const pendingCartKey = `pendingCartData_${paymentIntentId}`;
  const data = localStorage.getItem(pendingCartKey);
  
  if (!data) return null;
  
  try {
    return JSON.parse(data) as PendingCartData;
  } catch (error) {
    console.error('Error parsing pending cart data:', error);
    return null;
  }
};

export const clearPendingCartData = (paymentIntentId: string): void => {
  const pendingCartKey = `pendingCartData_${paymentIntentId}`;
  localStorage.removeItem(pendingCartKey);
};
