# 🚀 Deployment Guide - Apex Gerüstbau

## 📋 **Pre-Deployment Checklist**

### ✅ **Frontend Ready**
- [x] React + Vite application
- [x] Responsive design with Tailwind CSS
- [x] Modern dark theme
- [x] E-commerce functionality
- [x] Contact form
- [x] Stripe integration

### ✅ **Backend Ready**
- [x] Express.js server
- [x] Contact API
- [x] Stripe payment API
- [x] Security middleware
- [x] CORS configuration

## 🎯 **Deployment Strategy**

### **Frontend: Vercel**
- Static hosting for React app
- Automatic deployments from GitHub
- Custom domain support
- Edge functions for API routes

### **Backend: Vercel Functions**
- Serverless API functions
- Automatic scaling
- Environment variables support
- Global CDN

## 🚀 **Step 1: GitHub Repository**

### **1. Initialize Git (if not already done)**
```bash
git init
git add .
git commit -m "Initial commit: Apex Gerüstbau website with backend"
```

### **2. Create GitHub Repository**
1. Go to [GitHub](https://github.com)
2. Click "New repository"
3. Name: `apex-geruestbau-website`
4. Make it public or private
5. Don't initialize with README (we already have one)

### **3. Push to GitHub**
```bash
git remote add origin https://github.com/YOUR_USERNAME/apex-geruestbau-website.git
git branch -M main
git push -u origin main
```

## 🚀 **Step 2: Vercel Deployment**

### **1. Deploy Frontend**
1. Go to [Vercel](https://vercel.com)
2. Sign up/Login with GitHub
3. Click "New Project"
4. Import your GitHub repository
5. Configure:
   - **Framework Preset**: Vite
   - **Root Directory**: `./` (root)
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`

### **2. Environment Variables (Frontend)**
Add these in Vercel dashboard:
```
VITE_API_URL=https://your-backend-url.vercel.app
```

### **3. Deploy Backend**
1. Create a new Vercel project for backend
2. Configure:
   - **Framework Preset**: Node.js
   - **Root Directory**: `./backend`
   - **Build Command**: `npm install`
   - **Output Directory**: `./`
   - **Install Command**: `npm install`

### **4. Environment Variables (Backend)**
Add these in Vercel dashboard:
```
NODE_ENV=production
STRIPE_SECRET_KEY=sk_live_your_live_key
STRIPE_PUBLISHABLE_KEY=pk_live_your_live_key
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
FRONTEND_URL=https://your-frontend-url.vercel.app
JWT_SECRET=your_production_secret
```

## 🔧 **Step 3: Configuration Files**

### **vercel.json (Frontend)**
```json
{
  "version": 2,
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/static-build",
      "config": {
        "distDir": "dist"
      }
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "/index.html"
    }
  ]
}
```

### **vercel.json (Backend)**
```json
{
  "version": 2,
  "builds": [
    {
      "src": "server.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "/server.js"
    }
  ]
}
```

## 🔒 **Step 4: Security & Environment**

### **Production Environment Variables**
1. **Stripe Live Keys** (not test keys)
2. **Gmail App Password** for production
3. **Strong JWT Secret**
4. **Production URLs**

### **Domain Configuration**
1. **Custom Domain** setup in Vercel
2. **SSL Certificate** (automatic with Vercel)
3. **DNS Configuration**

## 📊 **Step 5: Testing Deployment**

### **Frontend Tests**
- [ ] Homepage loads correctly
- [ ] Navigation works
- [ ] Products page displays
- [ ] Contact page works
- [ ] Responsive design

### **Backend Tests**
- [ ] Health check endpoint
- [ ] Contact form submission
- [ ] Stripe payment flow
- [ ] Email sending

### **Integration Tests**
- [ ] Frontend connects to backend
- [ ] Payment flow works end-to-end
- [ ] Contact form sends emails

## 🚨 **Common Issues & Solutions**

### **CORS Errors**
```javascript
// In backend/server.js
app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true
}));
```

### **Environment Variables Not Loading**
- Check Vercel dashboard
- Redeploy after adding variables
- Use `console.log(process.env)` to debug

### **Build Failures**
- Check Node.js version compatibility
- Verify all dependencies are in package.json
- Check for TypeScript errors

### **API 404 Errors**
- Verify API routes are correct
- Check Vercel function configuration
- Test locally first

## 📈 **Step 6: Monitoring & Analytics**

### **Vercel Analytics**
- Enable in project settings
- Track performance metrics
- Monitor user behavior

### **Error Tracking**
- Set up error logging
- Monitor API response times
- Track payment success rates

## 🔄 **Step 7: Continuous Deployment**

### **Automatic Deployments**
- Push to `main` branch triggers deployment
- Preview deployments for pull requests
- Rollback to previous versions

### **Environment Management**
- Development: `localhost`
- Staging: `staging.vercel.app`
- Production: `your-domain.com`

## 🎉 **Success Checklist**

- [ ] Frontend deployed to Vercel
- [ ] Backend deployed to Vercel
- [ ] Custom domain configured
- [ ] SSL certificate active
- [ ] Environment variables set
- [ ] Payment flow tested
- [ ] Contact form working
- [ ] Responsive design verified
- [ ] Performance optimized
- [ ] Analytics configured

## 📞 **Support**

If you encounter issues:
1. Check Vercel deployment logs
2. Verify environment variables
3. Test API endpoints
4. Review browser console errors
5. Check Vercel documentation

---

**🎉 Your Apex Gerüstbau website is ready for deployment! Follow these steps to get it live on the internet.** 