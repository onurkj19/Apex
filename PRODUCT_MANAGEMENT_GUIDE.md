# 🛍️ Product Management Guide

## 📋 **How to Add/Edit Products**

### **Option 1: Frontend Management (Easiest)**

#### **Step 1: Add Product Images**
1. **Place your product images** in the `public/` folder
2. **Recommended structure:**
   ```
   public/
   ├── products/
   │   ├── work-clothes/
   │   ├── helmets/
   │   ├── work-shoes/
   │   ├── tools/
   │   └── accessories/
   ```

#### **Step 2: Edit Products in Code**
Open `src/pages/Products.tsx` and find the `products` array (around line 55):

```typescript
const products: Product[] = [
  {
    id: '1',
    name: 'Professionelle Arbeitshose',
    category: 'work-clothes',
    price: 89.99,
    originalPrice: 119.99,
    description: 'Robuste Arbeitshose mit verstärkten Knien und mehreren Taschen für Werkzeuge.',
    image: '/products/work-clothes/arbeitshose.jpg', // ← Update this path
    rating: 4.8,
    reviews: 124,
    inStock: true,
    features: ['Verstärkte Knien', 'Mehrere Taschen', 'Atmungsaktiv', 'Reißfest']
  },
  // Add more products here...
]
```

#### **Step 3: Product Structure**
Each product needs these fields:
```typescript
{
  id: 'unique-id',           // Unique identifier
  name: 'Product Name',       // Product title
  category: 'category-name',  // work-clothes, helmets, work-shoes, tools, accessories
  price: 89.99,              // Current price
  originalPrice: 119.99,      // Original price (optional, for discounts)
  description: 'Description', // Product description
  image: '/path/to/image.jpg', // Image path
  rating: 4.8,               // Rating (1-5)
  reviews: 124,               // Number of reviews
  inStock: true,              // Availability
  features: ['Feature 1', 'Feature 2'] // Product features
}
```

### **Option 2: Backend Management (Advanced)**

#### **Step 1: Create Product API**
Add to `backend/routes/products.js`:

```javascript
const express = require('express');
const router = express.Router();

// Get all products
router.get('/products', (req, res) => {
  // Return products from database
});

// Add new product
router.post('/products', (req, res) => {
  // Add product to database
});

// Update product
router.put('/products/:id', (req, res) => {
  // Update product in database
});

// Delete product
router.delete('/products/:id', (req, res) => {
  // Delete product from database
});
```

#### **Step 2: Create Admin Panel**
Create `src/pages/Admin.tsx` for managing products through a web interface.

### **Option 3: Headless CMS (Recommended for Non-Technical Users)**

#### **Step 1: Use Strapi CMS**
1. **Install Strapi:**
   ```bash
   npx create-strapi-app@latest apex-cms --quickstart
   ```

2. **Create Product Content Type:**
   - Go to Content-Type Builder
   - Create "Product" with fields: name, category, price, description, image, etc.

3. **Connect to Frontend:**
   ```typescript
   // Fetch products from Strapi API
   const fetchProducts = async () => {
     const response = await fetch('http://localhost:1337/api/products');
     const data = await response.json();
     return data.data;
   };
   ```

## 🖼️ **Image Management**

### **Image Requirements:**
- **Format:** JPG, PNG, WebP
- **Size:** 300x300px minimum (recommended: 600x600px)
- **File size:** Under 500KB per image
- **Naming:** Use descriptive names like `arbeitshose-premium.jpg`

### **Image Optimization:**
```bash
# Install image optimization tools
npm install sharp imagemin

# Optimize images before uploading
npx imagemin public/products/* --out-dir=public/products/optimized
```

## 📊 **Category Management**

### **Available Categories:**
- `work-clothes` - Arbeitskleidung
- `helmets` - Helme
- `work-shoes` - Arbeitsschuhe
- `tools` - Werkzeuge
- `accessories` - Zubehör

### **Add New Category:**
1. **Add category to the list** in the filter component
2. **Update category mapping** if needed
3. **Add category-specific styling** if desired

## 🔧 **Quick Commands**

### **Add New Product:**
```bash
# 1. Add image to public/products/
# 2. Edit src/pages/Products.tsx
# 3. Add product to products array
# 4. Test locally
npm run dev
```

### **Deploy Changes:**
```bash
git add .
git commit -m "Add new product: [Product Name]"
git push origin main
```

## 📱 **Mobile-Friendly Tips**

### **Image Optimization for Mobile:**
- Use responsive images with `srcset`
- Optimize for different screen sizes
- Consider lazy loading for better performance

### **Product Card Responsiveness:**
- Test on different screen sizes
- Ensure text is readable on mobile
- Optimize button sizes for touch

## 🎨 **Customization Options**

### **Product Card Styling:**
Edit the product card component in `src/pages/Products.tsx`:

```typescript
// Customize card appearance
<Card className="card-elegant hover:shadow-hover transition-all duration-300">
  {/* Product content */}
</Card>
```

### **Category Colors:**
Add category-specific colors:
```css
.category-work-clothes { @apply border-blue-500; }
.category-helmets { @apply border-yellow-500; }
.category-tools { @apply border-green-500; }
```

## 🚀 **Next Steps**

1. **Start with Option 1** (Frontend Management) - it's the easiest
2. **Add real product images** to replace placeholders
3. **Test the shopping cart** functionality
4. **Consider Option 3** (Strapi CMS) for easier management later

## 📞 **Need Help?**

- **For image optimization:** Use tools like TinyPNG or Squoosh
- **For product data:** Use Excel/Google Sheets to organize, then copy to code
- **For bulk updates:** Consider creating a simple admin interface

---

**💡 Pro Tip:** Start with 5-10 products to test everything works, then add more gradually! 