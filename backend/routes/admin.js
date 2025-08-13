const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const router = express.Router();

// Admin credentials (in production, store in database)
const ADMIN_USERNAME = 'Apex';
const ADMIN_PASSWORD_HASH = bcrypt.hashSync('apex12345', 10);
const JWT_SECRET = process.env.JWT_SECRET || 'apex-admin-secret-key-2024';

// Multer configuration for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: function (req, file, cb) {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

// Middleware to verify admin token
const verifyAdmin = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.username === ADMIN_USERNAME) {
      req.admin = decoded;
      next();
    } else {
      res.status(403).json({ error: 'Invalid admin token' });
    }
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Admin login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (username === ADMIN_USERNAME && bcrypt.compareSync(password, ADMIN_PASSWORD_HASH)) {
      const token = jwt.sign(
        { username: ADMIN_USERNAME },
        JWT_SECRET,
        { expiresIn: '24h' }
      );
      
      res.json({ 
        success: true, 
        token,
        message: 'Login successful' 
      });
    } else {
      res.status(401).json({ error: 'Invalid credentials' });
    }
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error during login' });
  }
});

// Verify admin token
router.get('/verify', verifyAdmin, (req, res) => {
  res.json({ success: true, admin: req.admin });
});

// Get all products
router.get('/products', verifyAdmin, (req, res) => {
  try {
    const productsPath = path.join(__dirname, '../data/products.json');
    
    if (fs.existsSync(productsPath)) {
      const products = JSON.parse(fs.readFileSync(productsPath, 'utf8'));
      res.json(products);
    } else {
      res.json([]);
    }
  } catch (error) {
    console.error('Error loading products:', error);
    res.status(500).json({ error: 'Failed to load products' });
  }
});

// Add new product
router.post('/products', verifyAdmin, upload.single('image'), (req, res) => {
  try {
    const { title, description, price, discount } = req.body;
    const productsPath = path.join(__dirname, '../data/products.json');
    
    // Load existing products
    let products = [];
    if (fs.existsSync(productsPath)) {
      products = JSON.parse(fs.readFileSync(productsPath, 'utf8'));
    }
    
    // Create new product
    const newProduct = {
      id: Date.now().toString(),
      title,
      description,
      price: parseFloat(price),
      discount: discount ? parseFloat(discount) : 0,
      image: req.file ? `/uploads/${req.file.filename}` : null,
      createdAt: new Date().toISOString()
    };
    
    products.push(newProduct);
    
    // Save products
    fs.writeFileSync(productsPath, JSON.stringify(products, null, 2));
    
    res.json({ success: true, product: newProduct });
  } catch (error) {
    console.error('Error adding product:', error);
    res.status(500).json({ error: 'Failed to add product' });
  }
});

// Update product
router.put('/products/:id', verifyAdmin, upload.single('image'), (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, price, discount } = req.body;
    const productsPath = path.join(__dirname, '../data/products.json');
    
    if (!fs.existsSync(productsPath)) {
      return res.status(404).json({ error: 'Products not found' });
    }
    
    let products = JSON.parse(fs.readFileSync(productsPath, 'utf8'));
    const productIndex = products.findIndex(p => p.id === id);
    
    if (productIndex === -1) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    // Update product
    products[productIndex] = {
      ...products[productIndex],
      title,
      description,
      price: parseFloat(price),
      discount: discount ? parseFloat(discount) : 0,
      image: req.file ? `/uploads/${req.file.filename}` : products[productIndex].image,
      updatedAt: new Date().toISOString()
    };
    
    fs.writeFileSync(productsPath, JSON.stringify(products, null, 2));
    
    res.json({ success: true, product: products[productIndex] });
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({ error: 'Failed to update product' });
  }
});

// Delete product
router.delete('/products/:id', verifyAdmin, (req, res) => {
  try {
    const { id } = req.params;
    const productsPath = path.join(__dirname, '../data/products.json');
    
    if (!fs.existsSync(productsPath)) {
      return res.status(404).json({ error: 'Products not found' });
    }
    
    let products = JSON.parse(fs.readFileSync(productsPath, 'utf8'));
    const productIndex = products.findIndex(p => p.id === id);
    
    if (productIndex === -1) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    // Remove product image file if exists
    const product = products[productIndex];
    if (product.image) {
      const imagePath = path.join(__dirname, '..', product.image);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }
    
    products.splice(productIndex, 1);
    fs.writeFileSync(productsPath, JSON.stringify(products, null, 2));
    
    res.json({ success: true, message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

// Get all projects
router.get('/projects', verifyAdmin, (req, res) => {
  try {
    const projectsPath = path.join(__dirname, '../data/projects.json');
    
    if (fs.existsSync(projectsPath)) {
      const projects = JSON.parse(fs.readFileSync(projectsPath, 'utf8'));
      res.json(projects);
    } else {
      res.json([]);
    }
  } catch (error) {
    console.error('Error loading projects:', error);
    res.status(500).json({ error: 'Failed to load projects' });
  }
});

// Add new project
router.post('/projects', verifyAdmin, upload.array('images', 10), (req, res) => {
  try {
    const { title, description, location, completedDate, client, category, duration } = req.body;
    const projectsPath = path.join(__dirname, '../data/projects.json');
    
    // Load existing projects
    let projects = [];
    if (fs.existsSync(projectsPath)) {
      projects = JSON.parse(fs.readFileSync(projectsPath, 'utf8'));
    }
    
    // Create new project
    const newProject = {
      id: Date.now().toString(),
      title,
      description,
      location,
      completedDate,
      client: client || '',
      category: category || '',
      duration: duration || '',
      images: req.files ? req.files.map(file => `/uploads/${file.filename}`) : [],
      createdAt: new Date().toISOString()
    };
    
    projects.push(newProject);
    
    // Save projects
    fs.writeFileSync(projectsPath, JSON.stringify(projects, null, 2));
    
    res.json({ success: true, project: newProject });
  } catch (error) {
    console.error('Error adding project:', error);
    res.status(500).json({ error: 'Failed to add project' });
  }
});

// Delete project
router.delete('/projects/:id', verifyAdmin, (req, res) => {
  try {
    const { id } = req.params;
    const projectsPath = path.join(__dirname, '../data/projects.json');
    
    if (!fs.existsSync(projectsPath)) {
      return res.status(404).json({ error: 'Projects not found' });
    }
    
    let projects = JSON.parse(fs.readFileSync(projectsPath, 'utf8'));
    const projectIndex = projects.findIndex(p => p.id === id);
    
    if (projectIndex === -1) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    // Remove project image files if exist
    const project = projects[projectIndex];
    if (project.images && project.images.length > 0) {
      project.images.forEach(imagePath => {
        const fullPath = path.join(__dirname, '..', imagePath);
        if (fs.existsSync(fullPath)) {
          fs.unlinkSync(fullPath);
        }
      });
    }
    
    projects.splice(projectIndex, 1);
    fs.writeFileSync(projectsPath, JSON.stringify(projects, null, 2));
    
    res.json({ success: true, message: 'Project deleted successfully' });
  } catch (error) {
    console.error('Error deleting project:', error);
    res.status(500).json({ error: 'Failed to delete project' });
  }
});

module.exports = router;
