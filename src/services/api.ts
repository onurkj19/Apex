const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Generic API request function
const apiRequest = async (endpoint: string, options: RequestInit = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const defaultOptions: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
    },
    ...options,
  };

  try {
    const response = await fetch(url, defaultOptions);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('API request failed:', error);
    throw error;
  }
};

// Contact API
export const contactAPI = {
  // Submit contact form
  submitForm: async (formData: {
    name: string;
    email: string;
    message: string;
    phone?: string;
    subject?: string;
  }) => {
    return apiRequest('/contact', {
      method: 'POST',
      body: JSON.stringify(formData),
    });
  },

  // Get contact information
  getContactInfo: async () => {
    return apiRequest('/contact');
  },
};

// Stripe API
export const stripeAPI = {
  // Get Stripe configuration
  getConfig: async () => {
    return apiRequest('/stripe/config');
  },

  // Get payment methods
  getPaymentMethods: async () => {
    return apiRequest('/stripe/payment-methods');
  },

  // Create payment intent
  createPaymentIntent: async (data: {
    amount: number;
    currency: string;
    description: string;
    customerEmail: string;
    metadata?: Record<string, any>;
  }) => {
    return apiRequest('/stripe/create-payment-intent', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Confirm payment
  confirmPayment: async (paymentIntentId: string) => {
    return apiRequest('/stripe/confirm-payment', {
      method: 'POST',
      body: JSON.stringify({ paymentIntentId }),
    });
  },

  // Create checkout session
  createCheckoutSession: async (data: {
    items: Array<{
      name: string;
      description: string;
      price: number;
      quantity: number;
      images?: string[];
    }>;
    customerEmail: string;
    successUrl?: string;
    cancelUrl?: string;
  }) => {
    return apiRequest('/stripe/create-checkout-session', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};

// Health check
export const healthAPI = {
  check: async () => {
    return apiRequest('/health');
  },
};

export default {
  contact: contactAPI,
  stripe: stripeAPI,
  health: healthAPI,
}; 