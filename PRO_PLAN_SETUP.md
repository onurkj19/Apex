# Apex Gerüstbau - Pro Plan Deployment Guide

## 🚀 Pro Plan Deployment Setup

Since you're now on Vercel's Pro plan, you have access to advanced features. Here's how to properly configure your deployment:

### 1. Environment Variables Setup

In your Vercel dashboard, go to your project settings and add these environment variables:

#### Frontend Environment Variables:
```
VITE_API_URL=https://apex-backend.vercel.app
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_key_here
```

#### Backend Environment Variables (if deploying backend separately):
```
NODE_ENV=production
PORT=5000
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_key_here
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
FRONTEND_URL=https://apex-gerüste.ch
JWT_SECRET=your-jwt-secret-key
```

### 2. Custom Domain Configuration

1. **In Vercel Dashboard:**
   - Go to your project settings
   - Navigate to "Domains"
   - Add your custom domain: `apex-gerüste.ch`
   - Add the www subdomain: `www.apex-gerüste.ch`

2. **DNS Configuration:**
   - Add these DNS records to your domain provider:
   ```
   Type: A
   Name: @
   Value: 76.76.19.19
   
   Type: CNAME
   Name: www
   Value: cname.vercel-dns.com
   ```

### 3. Pro Plan Features to Enable

#### A. Edge Functions (Optional)
If you want to use Edge Functions for better performance:

```javascript
// api/hello.js
export default function handler(req, res) {
  res.status(200).json({ message: 'Hello from Edge Function!' })
}
```

#### B. Image Optimization
Your images are already optimized, but you can enable additional features:

```json
// vercel.json
{
  "images": {
    "sizes": [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    "formats": ["image/webp", "image/avif"],
    "minimumCacheTTL": 60
  }
}
```

#### C. Analytics and Monitoring
Enable Vercel Analytics in your project settings for performance monitoring.

### 4. Deployment Strategy

#### Option A: Monorepo Deployment (Recommended)
Deploy both frontend and backend from the same repository:

1. **Frontend:** Automatically deployed from the root
2. **Backend:** Deploy as serverless functions in `/api` directory

#### Option B: Separate Deployments
1. **Frontend:** Deploy from this repository
2. **Backend:** Deploy from a separate repository

### 5. Performance Optimization

#### A. Bundle Analysis
```bash
npm run build -- --analyze
```

#### B. Image Optimization
- Use WebP format for images
- Implement lazy loading
- Use responsive images

#### C. Caching Strategy
```json
// vercel.json
{
  "headers": [
    {
      "source": "/assets/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    }
  ]
}
```

### 6. Monitoring and Analytics

#### A. Vercel Analytics
- Enable in project settings
- Monitor Core Web Vitals
- Track user behavior

#### B. Error Tracking
- Set up error monitoring
- Configure alerts for build failures

### 7. Security Configuration

#### A. Security Headers
```json
// vercel.json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "Referrer-Policy",
          "value": "origin-when-cross-origin"
        }
      ]
    }
  ]
}
```

#### B. Environment Variables Security
- Never commit sensitive keys to Git
- Use Vercel's environment variable encryption
- Rotate keys regularly

### 8. Troubleshooting Pro Plan Issues

#### A. Build Failures
1. Check build logs in Vercel dashboard
2. Verify all dependencies are installed
3. Ensure TypeScript compilation passes
4. Check for merge conflicts

#### B. Domain Issues
1. Verify DNS propagation (can take up to 48 hours)
2. Check SSL certificate status
3. Ensure domain is properly configured in Vercel

#### C. Performance Issues
1. Monitor Core Web Vitals
2. Optimize bundle size
3. Implement proper caching
4. Use CDN for static assets

### 9. Pro Plan Benefits You Can Use

1. **Unlimited Bandwidth:** No limits on traffic
2. **Advanced Analytics:** Detailed performance insights
3. **Priority Support:** Faster response times
4. **Custom Domains:** Unlimited custom domains
5. **Edge Functions:** Global edge computing
6. **Advanced Security:** Enhanced security features

### 10. Next Steps

1. **Deploy your changes:**
   ```bash
   git push origin main
   ```

2. **Monitor the deployment** in Vercel dashboard

3. **Set up monitoring** and alerts

4. **Configure your custom domain** DNS settings

5. **Test all functionality** on the live site

### 11. Maintenance

- Regularly update dependencies
- Monitor performance metrics
- Keep environment variables secure
- Backup your configuration
- Monitor error rates and uptime

## 🎯 Success Checklist

- [ ] Environment variables configured
- [ ] Custom domain added to Vercel
- [ ] DNS records updated
- [ ] Build passing locally
- [ ] Deployment successful
- [ ] Custom domain working
- [ ] SSL certificate active
- [ ] All functionality tested
- [ ] Analytics enabled
- [ ] Monitoring configured

Your Apex Gerüstbau website is now ready for production deployment with Pro plan features! 