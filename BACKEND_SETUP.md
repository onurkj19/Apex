# 🚀 Backend Setup Guide - Apex Gerüstbau

## ✅ **Backend Successfully Created!**

Your backend is now ready with the following features:

### **🔧 Backend Features**
- ✅ **Express.js Server** with security middleware
- ✅ **Contact Form API** with email sending
- ✅ **Stripe Payment Integration** 
- ✅ **CORS Configuration** for frontend communication
- ✅ **Rate Limiting** and security headers
- ✅ **Input Validation** for all forms
- ✅ **Error Handling** and logging

### **📁 Backend Structure**
```
backend/
├── server.js              # Main server file
├── package.json           # Dependencies
├── env.example            # Environment template
├── routes/
│   ├── contact.js         # Contact form API
│   └── stripe.js          # Payment API
└── README.md              # Detailed documentation
```

## **🚀 Quick Start**

### **1. Install Backend Dependencies**
```bash
cd backend
npm install
```

### **2. Configure Environment**
```bash
# Copy the example file
cp env.example .env

# Edit .env with your settings:
PORT=5000
NODE_ENV=development
STRIPE_SECRET_KEY=sk_test_your_key_here
STRIPE_PUBLISHABLE_KEY=pk_test_your_key_here
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
FRONTEND_URL=http://localhost:8081
```

### **3. Start Backend Server**
```bash
cd backend
npm run dev
```

### **4. Start Frontend Server**
```bash
# In another terminal
npm run dev
```

### **5. Or Use the Batch Script**
```bash
# Windows - Double click or run:
start-dev.bat
```

## **🔗 API Endpoints**

### **Contact API**
- `GET /api/contact` - Get company info
- `POST /api/contact` - Submit contact form

### **Stripe API**
- `GET /api/stripe/config` - Get Stripe config
- `POST /api/stripe/create-checkout-session` - Create payment session
- `POST /api/stripe/confirm-payment` - Confirm payment

### **Health Check**
- `GET /api/health` - Server status

## **📧 Email Setup (Required)**

### **Gmail Configuration**
1. **Enable 2-Factor Authentication** on your Gmail account
2. **Generate App Password:**
   - Go to Google Account → Security → 2-Step Verification
   - Click "App passwords"
   - Generate password for "Mail"
3. **Add to .env file:**
   ```env
   EMAIL_USER=your_email@gmail.com
   EMAIL_PASS=your_16_character_app_password
   ```

## **💳 Stripe Setup (Required)**

### **Get Stripe Test Keys**
1. **Create Stripe Account** at https://stripe.com
2. **Get Test API Keys** from Stripe Dashboard
3. **Add to .env file:**
   ```env
   STRIPE_SECRET_KEY=sk_test_...
   STRIPE_PUBLISHABLE_KEY=pk_test_...
   ```

## **🔒 Security Features**

- ✅ **Rate Limiting** - 100 requests per 15 minutes
- ✅ **CORS Protection** - Configured for frontend
- ✅ **Helmet Security** - Security headers
- ✅ **Input Validation** - All inputs validated
- ✅ **Error Handling** - Comprehensive error handling

## **🌐 Frontend Integration**

The frontend is already configured to communicate with the backend:

- ✅ **API Service** created (`src/services/api.ts`)
- ✅ **Stripe Checkout** integrated
- ✅ **Contact Form** ready for backend
- ✅ **CORS** configured for localhost:8081

## **📊 Testing the Backend**

### **Test Health Check**
```bash
curl http://localhost:5000/api/health
```

### **Test Contact API**
```bash
curl -X POST http://localhost:5000/api/contact \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "message": "Test message"
  }'
```

### **Test Stripe Config**
```bash
curl http://localhost:5000/api/stripe/config
```

## **🚨 Troubleshooting**

### **Backend Won't Start**
- Check if port 5000 is available
- Verify all dependencies are installed
- Check .env file configuration

### **Email Not Sending**
- Verify Gmail app password is correct
- Check 2-factor authentication is enabled
- Test SMTP settings

### **Stripe Errors**
- Verify API keys are correct
- Check you're using test keys for development
- Ensure currency is supported (CHF)

### **CORS Errors**
- Verify FRONTEND_URL in .env matches your frontend
- Check frontend is running on correct port

## **🎯 Next Steps**

1. **Configure Email** - Set up Gmail app password
2. **Configure Stripe** - Add your test API keys
3. **Test Integration** - Try the contact form and checkout
4. **Deploy** - When ready for production

## **📞 Support**

If you encounter any issues:
1. Check the backend logs for error messages
2. Verify all environment variables are set
3. Test individual API endpoints
4. Check browser console for frontend errors

---

**🎉 Your backend is ready! Configure your email and Stripe keys, then start both servers to test the full integration.** 