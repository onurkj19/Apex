const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const router = express.Router();

// Validation middleware for payment
const validatePaymentData = (req, res, next) => {
  const { amount, currency, description, customerEmail } = req.body;
  
  if (!amount || !currency || !description || !customerEmail) {
    return res.status(400).json({
      error: 'Missing required fields',
      message: 'Amount, currency, description, and customer email are required'
    });
  }

  if (amount <= 0) {
    return res.status(400).json({
      error: 'Invalid amount',
      message: 'Amount must be greater than 0'
    });
  }

  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(customerEmail)) {
    return res.status(400).json({
      error: 'Invalid email format',
      message: 'Please provide a valid email address'
    });
  }

  next();
};

// POST /api/stripe/create-payment-intent - Create payment intent
router.post('/create-payment-intent', validatePaymentData, async (req, res) => {
  try {
    const { amount, currency = 'chf', description, customerEmail, metadata = {} } = req.body;

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency: currency.toLowerCase(),
      description: description,
      receipt_email: customerEmail,
      metadata: {
        customer_email: customerEmail,
        ...metadata
      },
      automatic_payment_methods: {
        enabled: true,
      },
    });

    res.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id
    });

  } catch (error) {
    console.error('Stripe payment intent error:', error);
    res.status(500).json({
      error: 'Payment intent creation failed',
      message: 'Es gab ein Problem bei der Zahlungsverarbeitung. Bitte versuchen Sie es später erneut.'
    });
  }
});

// POST /api/stripe/confirm-payment - Confirm payment
router.post('/confirm-payment', async (req, res) => {
  try {
    const { paymentIntentId } = req.body;

    if (!paymentIntentId) {
      return res.status(400).json({
        error: 'Missing payment intent ID',
        message: 'Payment intent ID is required'
      });
    }

    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status === 'succeeded') {
      res.json({
        success: true,
        message: 'Zahlung erfolgreich abgeschlossen',
        paymentIntent: {
          id: paymentIntent.id,
          amount: paymentIntent.amount,
          currency: paymentIntent.currency,
          status: paymentIntent.status
        }
      });
    } else {
      res.status(400).json({
        error: 'Payment not completed',
        message: 'Die Zahlung wurde nicht erfolgreich abgeschlossen',
        status: paymentIntent.status
      });
    }

  } catch (error) {
    console.error('Stripe payment confirmation error:', error);
    res.status(500).json({
      error: 'Payment confirmation failed',
      message: 'Es gab ein Problem bei der Zahlungsbestätigung. Bitte versuchen Sie es später erneut.'
    });
  }
});

// POST /api/stripe/create-checkout-session - Create checkout session
router.post('/create-checkout-session', async (req, res) => {
  try {
    const { items, customerEmail, successUrl, cancelUrl } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        error: 'Invalid items',
        message: 'Valid items array is required'
      });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: items.map(item => ({
        price_data: {
          currency: 'chf',
          product_data: {
            name: item.name,
            description: item.description,
            images: item.images || [],
          },
          unit_amount: Math.round(item.price * 100), // Convert to cents
        },
        quantity: item.quantity || 1,
      })),
      mode: 'payment',
      success_url: successUrl || `${process.env.FRONTEND_URL}/payment-success`,
      cancel_url: cancelUrl || `${process.env.FRONTEND_URL}/products`,
      customer_email: customerEmail,
      metadata: {
        customer_email: customerEmail,
      },
    });

    res.json({
      sessionId: session.id,
      url: session.url
    });

  } catch (error) {
    console.error('Stripe checkout session error:', error);
    res.status(500).json({
      error: 'Checkout session creation failed',
      message: 'Es gab ein Problem bei der Erstellung der Zahlungssitzung. Bitte versuchen Sie es später erneut.'
    });
  }
});

// GET /api/stripe/payment-methods - Get available payment methods
router.get('/payment-methods', (req, res) => {
  res.json({
    methods: [
      {
        id: 'card',
        name: 'Kreditkarte / Debitkarte',
        description: 'Visa, Mastercard, American Express',
        icon: '💳'
      },
      {
        id: 'sepa_debit',
        name: 'SEPA-Lastschrift',
        description: 'Europäische Banküberweisung',
        icon: '🏦'
      }
    ]
  });
});

// GET /api/stripe/config - Get Stripe configuration
router.get('/config', (req, res) => {
  res.json({
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
    currency: 'chf',
    supportedCurrencies: ['chf', 'eur', 'usd']
  });
});

module.exports = router; 