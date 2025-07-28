# 🌐 Custom Domain Setup - Apex Gerüstbau

## 🎯 **Domain Configuration**

Your custom domain: `xn--apex-gerste-0hb.ch` (Punycode for `apex-gerüste.ch`)

## ✅ **Files Created**

### **CNAME File**
```
xn--apex-gerste-0hb.ch
```

### **Vercel Configuration**
```json
{
  "domains": [
    "xn--apex-gerste-0hb.ch",
    "www.xn--apex-gerste-0hb.ch"
  ]
}
```

## 🚀 **Vercel Deployment Steps**

### **1. Frontend Deployment**
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Import your GitHub repository: `https://github.com/onurkj19/Apex`
3. Configure settings:
   - **Framework Preset**: Vite
   - **Root Directory**: `./` (root)
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`

### **2. Environment Variables (Frontend)**
Add these in Vercel project settings:
```
VITE_API_URL=https://your-backend-url.vercel.app
```

### **3. Custom Domain Setup**
1. In your Vercel project dashboard
2. Go to **Settings** → **Domains**
3. Add your domain: `xn--apex-gerste-0hb.ch`
4. Vercel will provide DNS records to configure

### **4. DNS Configuration**
Configure these DNS records with your domain provider:

**A Records:**
```
@ → 76.76.19.19
www → 76.76.19.19
```

**CNAME Records:**
```
@ → cname.vercel-dns.com
www → cname.vercel-dns.com
```

## 🔧 **Backend Deployment**

### **1. Create Separate Backend Project**
1. Create new Vercel project
2. Point to `backend/` directory
3. Configure as Node.js project

### **2. Backend Environment Variables**
```
NODE_ENV=production
STRIPE_SECRET_KEY=sk_live_your_live_key
STRIPE_PUBLISHABLE_KEY=pk_live_your_live_key
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
FRONTEND_URL=https://xn--apex-gerste-0hb.ch
JWT_SECRET=your_production_secret
```

## 🌐 **Domain Verification**

### **SSL Certificate**
- Vercel automatically provides SSL certificates
- HTTPS will be enabled automatically
- Certificate renewal is automatic

### **Domain Verification**
1. Wait for DNS propagation (up to 48 hours)
2. Check domain status in Vercel dashboard
3. Test both `http://` and `https://` versions

## 📊 **Testing Checklist**

### **Frontend Tests**
- [ ] Homepage loads at `https://xn--apex-gerste-0hb.ch`
- [ ] All pages work correctly
- [ ] Responsive design works
- [ ] Navigation functions properly

### **Backend Tests**
- [ ] API endpoints accessible
- [ ] Contact form sends emails
- [ ] Stripe payments work
- [ ] CORS configured correctly

### **Integration Tests**
- [ ] Frontend connects to backend
- [ ] Payment flow works end-to-end
- [ ] Contact form integration works

## 🔒 **Security Considerations**

### **HTTPS Enforcement**
- Vercel automatically redirects HTTP to HTTPS
- SSL certificates are managed automatically
- Security headers are configured

### **Environment Variables**
- Keep sensitive data in Vercel environment variables
- Never commit API keys to GitHub
- Use production keys for live domain

## 🚨 **Troubleshooting**

### **Domain Not Working**
1. Check DNS propagation: [whatsmydns.net](https://whatsmydns.net)
2. Verify DNS records are correct
3. Wait up to 48 hours for full propagation

### **Build Failures**
1. Check Vercel build logs
2. Verify all dependencies are in package.json
3. Test build locally: `npm run build`

### **API Errors**
1. Verify backend URL in environment variables
2. Check CORS configuration
3. Test API endpoints directly

## 📈 **Performance Optimization**

### **Vercel Edge Functions**
- Automatic global CDN
- Edge caching for static assets
- Automatic image optimization

### **Monitoring**
- Enable Vercel Analytics
- Monitor performance metrics
- Set up error tracking

## 🎉 **Success Indicators**

✅ **Domain resolves correctly**  
✅ **HTTPS works**  
✅ **All pages load**  
✅ **Backend API responds**  
✅ **Payments process**  
✅ **Contact form sends emails**  

---

**Your Apex Gerüstbau website will be live at: `https://xn--apex-gerste-0hb.ch`** 