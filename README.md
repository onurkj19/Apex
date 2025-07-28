# Apex Gerüstbau - Modern Construction Website

A modern, responsive website for Apex Gerüstbau, a Swiss scaffolding company. Built with React, TypeScript, Tailwind CSS, and Vite.

## 🚀 Features

### ✅ Completed Features

1. **Modern Dark Theme**
   - Black/dark theme with yellow and light gray accents
   - Construction-tech aesthetic with diagonal patterns and metal textures
   - Responsive design for all screen sizes (mobile, tablet, laptop, desktop)

2. **E-commerce Store**
   - Complete online store for construction products
   - Product categories: Work clothes, Helmets, Work shoes, Tools, Accessories
   - Shopping cart functionality with add/remove items
   - Product search and filtering
   - Responsive product grid

3. **Stripe Checkout Integration**
   - Complete checkout flow with Stripe
   - Order summary and billing form
   - Form validation and error handling
   - Secure payment processing simulation

4. **Contact Form**
   - Fully functional contact form with validation
   - Email format validation
   - Success/error message handling
   - Ready for EmailJS or backend integration

5. **Responsive Design**
   - Mobile-first approach
   - Tailwind CSS responsive utilities
   - Optimized for all screen sizes
   - Touch-friendly interface

6. **Modern UI/UX**
   - Smooth animations and transitions
   - Hover effects and micro-interactions
   - Professional construction aesthetic
   - Accessibility features

## 🛠️ Tech Stack

- **Frontend**: React 18 + TypeScript
- **Styling**: Tailwind CSS + shadcn/ui
- **Build Tool**: Vite
- **Routing**: React Router DOM
- **State Management**: React Hooks
- **Payment**: Stripe (simulated)
- **Forms**: React Hook Form
- **Icons**: Lucide React

## 📦 Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd apex-geruestbau-meister-main
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start development server**
   ```bash
   npm run dev
   ```

4. **Open in browser**
   ```
   http://localhost:5173
   ```

## 🏗️ Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── ui/            # shadcn/ui components
│   ├── Header.tsx     # Navigation header
│   ├── Footer.tsx     # Site footer
│   ├── HeroSection.tsx # Landing hero
│   ├── ContactSection.tsx # Contact form
│   └── StripeCheckout.tsx # Payment component
├── pages/              # Page components
│   ├── Index.tsx      # Home page
│   ├── Products.tsx   # E-commerce store
│   ├── Services.tsx   # Services page
│   ├── About.tsx      # About page
│   ├── Projects.tsx   # Projects page
│   └── NotFound.tsx   # 404 page
├── hooks/              # Custom React hooks
├── lib/                # Utility functions
└── assets/             # Static assets
```

## 🎨 Design System

### Colors
- **Primary**: Yellow (#F59E0B)
- **Background**: Dark (#0F0F0F)
- **Card**: Dark gray (#1F1F1F)
- **Text**: Light gray (#F3F4F6)
- **Accent**: Light gray (#D1D5DB)

### Typography
- **Font**: Montserrat (Google Fonts)
- **Weights**: 300, 400, 500, 600, 700, 800

### Components
- **Cards**: Elegant cards with hover effects
- **Buttons**: Gradient buttons with animations
- **Forms**: Validated forms with error states
- **Navigation**: Responsive header with mobile menu

## 🔧 Configuration

### Environment Variables
Create a `.env` file for production settings:

```env
VITE_STRIPE_PUBLISHABLE_KEY=your_stripe_key
VITE_EMAILJS_SERVICE_ID=your_emailjs_service
VITE_EMAILJS_TEMPLATE_ID=your_emailjs_template
VITE_EMAILJS_USER_ID=your_emailjs_user
```

### Tailwind Configuration
The project uses a custom Tailwind configuration with:
- Dark theme as default
- Custom color palette
- Responsive breakpoints
- Animation utilities

## 🚀 Deployment

### Build for Production
```bash
npm run build
```

### Deploy to Vercel/Netlify
1. Connect your repository
2. Set build command: `npm run build`
3. Set output directory: `dist`
4. Deploy!

## 📱 Responsive Breakpoints

- **Mobile**: < 640px
- **Tablet**: 640px - 1024px
- **Desktop**: > 1024px

## 🛡️ Security Features

- Form validation
- XSS protection
- Secure payment flow
- Input sanitization

## 🔄 Future Enhancements

- [ ] Real Stripe integration
- [ ] EmailJS integration
- [ ] Backend API
- [ ] User authentication
- [ ] Order management
- [ ] Product reviews
- [ ] Multi-language support

## 📄 License

This project is licensed under the MIT License.

## 👥 Team

- **Onur Kajmakci** - Geschäftsführer
- **Arlind Morina** - Projektleiter
- **Flamur Shala** - Technischer Leiter

## 📞 Contact

- **Email**: info@apex-gerüste.ch
- **Phone**: +41 76 368 10 11
- **Website**: https://apex-geruestbau.ch

---

Built with ❤️ for Apex Gerüstbau
