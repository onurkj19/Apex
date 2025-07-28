# Apex Gerüstbau Backend API

This is the backend API for the Apex Gerüstbau website, built with Node.js and Express.

## Features

- **Contact Form API** - Handle form submissions and send emails
- **Stripe Integration** - Process payments and checkout sessions
- **Email Service** - Send emails via Nodemailer
- **Security** - Rate limiting, CORS, Helmet security headers
- **Validation** - Input validation for forms and payments

## Setup

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Environment Configuration

Copy the example environment file and configure your settings:

```bash
cp env.example .env
```

Edit `.env` with your actual values:

```env
# Server Configuration
PORT=5000
NODE_ENV=development

# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key_here
STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key_here

# Email Configuration (Gmail)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password_here

# CORS Configuration
FRONTEND_URL=http://localhost:8081

# Security
JWT_SECRET=your_jwt_secret_here
```

### 3. Email Setup (Gmail)

1. Enable 2-factor authentication on your Gmail account
2. Generate an App Password:
   - Go to Google Account settings
   - Security → 2-Step Verification → App passwords
   - Generate a new app password for "Mail"
3. Use this app password in your `.env` file

### 4. Stripe Setup

1. Create a Stripe account at https://stripe.com
2. Get your test API keys from the Stripe Dashboard
3. Add them to your `.env` file

## Running the Server

### Development Mode
```bash
npm run dev
```

### Production Mode
```bash
npm start
```

The server will start on `http://localhost:5000`

## API Endpoints

### Contact API

- `GET /api/contact` - Get company contact information
- `POST /api/contact` - Submit contact form

**Contact Form Example:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "message": "I need scaffolding for my construction project",
  "phone": "+41 76 123 45 67",
  "subject": "Scaffolding Quote"
}
```

### Stripe API

- `GET /api/stripe/config` - Get Stripe configuration
- `GET /api/stripe/payment-methods` - Get available payment methods
- `POST /api/stripe/create-payment-intent` - Create payment intent
- `POST /api/stripe/confirm-payment` - Confirm payment
- `POST /api/stripe/create-checkout-session` - Create checkout session

**Payment Intent Example:**
```json
{
  "amount": 150.00,
  "currency": "chf",
  "description": "Construction equipment order",
  "customerEmail": "customer@example.com"
}
```

### Health Check

- `GET /api/health` - Server health status

## Security Features

- **Rate Limiting** - 100 requests per 15 minutes per IP
- **CORS Protection** - Configured for frontend domain
- **Helmet Security** - Security headers
- **Input Validation** - All inputs are validated
- **Error Handling** - Comprehensive error handling

## File Structure

```
backend/
├── server.js          # Main server file
├── package.json       # Dependencies
├── env.example        # Environment variables template
├── routes/
│   ├── contact.js     # Contact form routes
│   └── stripe.js      # Payment routes
└── README.md          # This file
```

## Troubleshooting

### Email Issues
- Check your Gmail app password is correct
- Ensure 2-factor authentication is enabled
- Verify SMTP settings in `.env`

### Stripe Issues
- Verify your Stripe API keys are correct
- Check you're using test keys for development
- Ensure the currency is supported

### CORS Issues
- Verify `FRONTEND_URL` in `.env` matches your frontend
- Check the frontend is running on the correct port

## Production Deployment

1. Set `NODE_ENV=production` in your environment
2. Use a process manager like PM2
3. Set up a reverse proxy (nginx)
4. Configure SSL certificates
5. Use environment-specific Stripe keys

## Support

For issues or questions, contact the development team. 