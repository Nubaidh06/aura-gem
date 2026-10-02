// 
// AURA & GEM FINE JEWELERS - APPLICATION SERVER (app.js)
// Subject: Decision Analytics (NoSQL Corporate Application)
// Technology Stack: Node.js, Express, EJS, Native MongoDB Driver (v6.x), BcryptJS
// Database: jewelry_db (MongoDB localhost:27017)
// 

const express = require('express');
const session = require('express-session');
const path = require('path');
const { ObjectId } = require('mongodb');
const bcrypt = require('bcryptjs');
const { connectDB, getDB } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

// 
// SECTION 1: SERVER CONFIGURATION & MIDDLEWARE
// 

// Body parsing middleware for URL-encoded forms and JSON payloads
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Serve static assets from the public directory (CSS, client-side images)
app.use(express.static(path.join(__dirname, 'public')));

// Session configuration with 24-hour cookie lifetime
app.use(
  session({
    secret: 'jewelry-store-secret-key',
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 1000 * 60 * 60 * 24 }
  })
);

// Configure EJS template engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Global template middleware: fetches current logged-in customer and bag item count
app.use(async (req, res, next) => {
  try {
    const db = getDB();
    let currentCustomer = null;

    if (req.session.currentCustomerId && ObjectId.isValid(req.session.currentCustomerId)) {
      currentCustomer = await db.collection('customers').findOne({
        _id: new ObjectId(req.session.currentCustomerId)
      });
      if (!currentCustomer) {
        req.session.currentCustomerId = null;
      }
    }

    res.locals.currentCustomer = currentCustomer;

    if (!req.session.cart) {
      req.session.cart = [];
    }

    const cartCount = req.session.cart.reduce((sum, item) => sum + item.quantity, 0);
    res.locals.cartCount = cartCount;

    next();
  } catch (err) {
    next(err);
  }
});

// User session logout: clears active customer session and redirects to home
app.get('/logout', (req, res) => {
  req.session.currentCustomerId = null;
  res.redirect('/');
});

// Role-based route guard: verifies active session possesses administrator role
function requireAdmin(req, res, next) {
  const currentCustomer = res.locals.currentCustomer;
  if (!currentCustomer) {
    return res.redirect('/admin/login');
  }
  if (currentCustomer.role !== 'admin') {
    return res.status(403).render('error', {
      statusCode: '403 Forbidden',
      title: 'Access Restricted',
      message: 'Administrator credentials are required to access the management portal.',
      showAdminLoginBtn: true
    });
  }
  next();
}

// 
// SECTION 2: PRODUCT CATALOG & FULL-TEXT SEARCH (FEATURE 1)
// 

// GET / - Boutique home page showcasing overview and featured items
app.get('/', async (req, res) => {
  try {
    const db = getDB();
    const products = await db.collection('products').find({}).toArray();
    const categories = await db.collection('categories').find({}).sort({ display_order: 1 }).toArray();

    res.render('home', {
      products,
      categories
    });
  } catch (err) {
    console.error('Error fetching home page:', err);
    res.status(500).send('Database error while loading home page.');
  }
});

// GET /catalog - Product catalog with full-text search ($text) and category filtering
app.get('/catalog', async (req, res) => {
  try {
    const db = getDB();
    const { search, category } = req.query;

    let filter = {};

    // MongoDB full-text search using compound text index ($text operator)
    if (search && search.trim() !== '') {
      filter.$text = { $search: search.trim() };
    }

    // Category filter matching category_id reference
    if (category && ObjectId.isValid(category)) {
      filter.category_id = new ObjectId(category);
    }

    const products = await db.collection('products').find(filter).toArray();
    const categories = await db.collection('categories').find({}).sort({ display_order: 1 }).toArray();

    res.render('index', {
      products,
      categories,
      activeCategory: category || '',
      searchQuery: search || ''
    });
  } catch (err) {
    console.error('Error fetching catalog:', err);
    res.status(500).send('Database error while loading catalog.');
  }
});

// GET /product/:id - Product detail page with dynamic review rating aggregation
app.get('/product/:id', async (req, res) => {
  try {
    const db = getDB();
    const productId = req.params.id;

    if (!ObjectId.isValid(productId)) {
      return res.status(404).send('Product not found.');
    }

    const product = await db.collection('products').findOne({ _id: new ObjectId(productId) });
    if (!product) {
      return res.status(404).send('Product not found.');
    }

    const category = await db.collection('categories').findOne({ _id: product.category_id });

    // Fetch customer reviews referencing this product
    const reviews = await db
      .collection('reviews')
      .find({ product_id: new ObjectId(productId) })
      .sort({ review_date: -1 })
      .toArray();

    // Aggregation Pipeline: computes average rating and total review count dynamically
    const ratingAggregation = await db
      .collection('reviews')
      .aggregate([
        { $match: { product_id: new ObjectId(productId) } },
        {
          $group: {
            _id: '$product_id',
            avgRating: { $avg: '$rating' },
            totalReviews: { $sum: 1 }
          }
        }
      ])
      .toArray();

    const ratingStats = ratingAggregation.length > 0
      ? {
          avgRating: parseFloat(ratingAggregation[0].avgRating.toFixed(1)),
          totalReviews: ratingAggregation[0].totalReviews
        }
      : { avgRating: 0, totalReviews: 0 };

    res.render('product', {
      product,
      category,
      reviews,
      ratingStats
    });
  } catch (err) {
    console.error('Error loading product details:', err);
    res.status(500).send('Database error while loading product.');
  }
});

// 
// SECTION 3: AUTHENTICATION & ACCESS CONTROL
// Endpoints: Customer login, Dedicated Admin portal login, Customer registration
// Security: Passwords salted & hashed with bcrypt (10 rounds); session isolation
// 

// GET /login - Customer sign-in page with quick demo account shortcuts
app.get('/login', async (req, res) => {
  if (req.session.currentCustomerId) {
    if (res.locals.currentCustomer && res.locals.currentCustomer.role === 'admin') {
      return res.redirect('/admin');
    }
    return res.redirect(`/customer/${req.session.currentCustomerId}`);
  }
  try {
    const db = getDB();
    const demoCustomers = await db.collection('customers').find({}).limit(10).toArray();
    res.render('login', { errorMessage: null, demoCustomers });
  } catch (err) {
    res.render('login', { errorMessage: null, demoCustomers: [] });
  }
});

// Handle customer sign-in via MongoDB findOne and bcrypt compare
app.post('/login', async (req, res) => {
  try {
    const db = getDB();
    const { email, password } = req.body;

    if (!email || !password) {
      const demoCustomers = await db.collection('customers').find({}).limit(10).toArray();
      return res.render('login', {
        errorMessage: 'Both email and password are required to sign in.',
        demoCustomers
      });
    }

    const customer = await db.collection('customers').findOne({
      email: email.trim().toLowerCase()
    });

    if (!customer || !customer.password_hash) {
      const demoCustomers = await db.collection('customers').find({}).limit(10).toArray();
      return res.render('login', {
        errorMessage: 'Invalid email address or password. Please try again.',
        demoCustomers
      });
    }

    const isMatch = await bcrypt.compare(password, customer.password_hash);
    if (!isMatch) {
      const demoCustomers = await db.collection('customers').find({}).limit(10).toArray();
      return res.render('login', {
        errorMessage: 'Invalid email address or password. Please try again.',
        demoCustomers
      });
    }

    req.session.currentCustomerId = customer._id.toString();

    // If an administrator signs in via the login page, direct them straight to the admin dashboard
    if (customer.role === 'admin') {
      return res.redirect('/admin');
    }

    res.redirect(`/customer/${customer._id}`);
  } catch (err) {
    console.error('Error during customer sign in:', err);
    res.status(500).render('login', {
      errorMessage: 'Database error occurred during sign in.',
      demoCustomers: []
    });
  }
});

// Render dedicated admin login page
app.get('/admin/login', (req, res) => {
  if (res.locals.currentCustomer && res.locals.currentCustomer.role === 'admin') {
    return res.redirect('/admin');
  }
  res.render('admin-login', { errorMessage: null });
});

// Handle dedicated admin authentication
app.post('/admin/login', async (req, res) => {
  try {
    const db = getDB();
    const { email, password } = req.body;

    if (!email || !password) {
      return res.render('admin-login', {
        errorMessage: 'Both administrator email and password are required.'
      });
    }

    const customer = await db.collection('customers').findOne({
      email: email.trim().toLowerCase()
    });

    if (!customer || !customer.password_hash) {
      return res.render('admin-login', {
        errorMessage: 'Invalid credentials. Administrator access denied.'
      });
    }

    const isMatch = await bcrypt.compare(password, customer.password_hash);
    if (!isMatch) {
      return res.render('admin-login', {
        errorMessage: 'Invalid credentials. Administrator access denied.'
      });
    }

    if (customer.role !== 'admin') {
      return res.render('admin-login', {
        errorMessage: 'Access restricted: This account does not possess administrator privileges.'
      });
    }

    req.session.currentCustomerId = customer._id.toString();
    res.redirect('/admin');
  } catch (err) {
    console.error('Error during admin login:', err);
    res.status(500).render('admin-login', {
      errorMessage: 'Database error occurred during administrator authentication.'
    });
  }
});

// Render registration page for creating a new customer
app.get('/register', (req, res) => {
  res.render('register', { errorMessage: null });
});

// Handle customer registration via MongoDB insertOne and bcrypt hashing
app.post('/register', async (req, res) => {
  try {
    const db = getDB();
    const { name, email, password, phone, street, city, state, zip } = req.body;

    if (!name || !email || !password) {
      return res.render('register', {
        errorMessage: 'Name, email, and a password (min 6 characters) are required.'
      });
    }

    if (password.length < 6) {
      return res.render('register', {
        errorMessage: 'Password must be at least 6 characters long.'
      });
    }

    const existing = await db.collection('customers').findOne({ email: email.trim().toLowerCase() });
    if (existing) {
      return res.render('register', {
        errorMessage: 'An account with this email already exists. Please sign in instead.'
      });
    }

    // Salt and hash the password with bcrypt (10 rounds)
    const password_hash = await bcrypt.hash(password, 10);

    const newCustomer = {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password_hash,
      role: 'customer',
      phone: phone ? phone.trim() : '',
      delivery_address: {
        street: street ? street.trim() : '',
        city: city ? city.trim() : '',
        state: state ? state.trim() : '',
        zip: zip ? zip.trim() : ''
      },
      wishlist: [],
      created_at: new Date()
    };

    const result = await db.collection('customers').insertOne(newCustomer);

    // Set the newly registered customer as active in session
    req.session.currentCustomerId = result.insertedId.toString();

    // Redirect to the newly created account page
    res.redirect(`/customer/${result.insertedId}`);
  } catch (err) {
    console.error('Error registering customer:', err);
    res.status(500).render('register', {
      errorMessage: 'Database error occurred while creating customer profile.'
    });
  }
});

// 
// SECTION 4: CUSTOMER PROFILES & WISHLIST ARRAY OPERATIONS (FEATURE 2)
// Endpoints: Account dashboard, Address updates, Wishlist additions & removals
// MongoDB Operators: $in (batch lookup), $set (field update), $addToSet & $pull
// 

// GET /customer/:id - Account profile page with IDOR protection, wishlist, and orders
app.get('/customer/:id', async (req, res) => {
  try {
    const db = getDB();
    const customerId = req.params.id;

    if (!ObjectId.isValid(customerId)) {
      return res.status(404).send('Customer not found.');
    }

    // Authentication check: Redirect unauthenticated requests to login
    if (!req.session.currentCustomerId) {
      return res.redirect('/login');
    }

    // IDOR Protection: Prevent customers from inspecting profiles belonging to others
    const isSelf = req.session.currentCustomerId === customerId;
    const isAdmin = res.locals.currentCustomer && res.locals.currentCustomer.role === 'admin';
    if (!isSelf && !isAdmin) {
      return res.redirect(`/customer/${req.session.currentCustomerId}`);
    }

    const customer = await db.collection('customers').findOne({ _id: new ObjectId(customerId) });
    if (!customer) {
      return res.status(404).send('Customer not found.');
    }

    // $in Operator: Efficiently fetch all product documents referenced in wishlist array
    const wishlistIds = customer.wishlist || [];
    const wishlistProducts = await db
      .collection('products')
      .find({ _id: { $in: wishlistIds } })
      .toArray();

    // Fetch chronological order history for this specific customer
    const orders = await db
      .collection('orders')
      .find({ customer_id: new ObjectId(customerId) })
      .sort({ order_date: -1 })
      .toArray();

    res.render('customer', {
      customer,
      wishlistProducts,
      orders
    });
  } catch (err) {
    console.error('Error loading customer profile:', err);
    res.status(500).send('Database error while loading customer.');
  }
});

// POST /customer/:id/update - Update customer contact details and delivery address
app.post('/customer/:id/update', async (req, res) => {
  try {
    const db = getDB();
    const customerId = req.params.id;

    if (!req.session.currentCustomerId) {
      return res.redirect('/login');
    }

    const isSelf = req.session.currentCustomerId === customerId;
    const isAdmin = res.locals.currentCustomer && res.locals.currentCustomer.role === 'admin';
    if (!isSelf && !isAdmin) {
      return res.redirect(`/customer/${req.session.currentCustomerId}`);
    }

    const { phone, street, city, state, zip } = req.body;

    // $set Operator: Updates embedded delivery_address and contact fields in-place
    await db.collection('customers').updateOne(
      { _id: new ObjectId(customerId) },
      {
        $set: {
          phone: (phone || '').trim(),
          'delivery_address.street': (street || '').trim(),
          'delivery_address.city': (city || '').trim(),
          'delivery_address.state': (state || '').trim(),
          'delivery_address.zip': (zip || '').trim()
        }
      }
    );

    res.redirect(`/customer/${customerId}`);
  } catch (err) {
    console.error('Error updating customer profile:', err);
    res.status(500).send('Failed to update profile.');
  }
});

// POST /customer/:id/wishlist/add - Add product to wishlist using $addToSet
app.post('/customer/:id/wishlist/add', async (req, res) => {
  try {
    const db = getDB();
    const customerId = req.params.id;
    const { productId } = req.body;

    if (!req.session.currentCustomerId) {
      return res.redirect('/login');
    }

    if (req.session.currentCustomerId !== customerId) {
      return res.status(403).send('Unauthorized wishlist modification.');
    }

    if (!ObjectId.isValid(customerId) || !ObjectId.isValid(productId)) {
      return res.status(400).send('Invalid customer or product ID.');
    }

    // $addToSet Operator: Appends product ID only if not already present (prevents duplicates)
    await db.collection('customers').updateOne(
      { _id: new ObjectId(customerId) },
      { $addToSet: { wishlist: new ObjectId(productId) } }
    );

    res.redirect('back');
  } catch (err) {
    console.error('Error adding to wishlist:', err);
    res.status(500).send('Error updating wishlist.');
  }
});

// POST /customer/:id/wishlist/remove - Remove product from wishlist using $pull
app.post('/customer/:id/wishlist/remove', async (req, res) => {
  try {
    const db = getDB();
    const customerId = req.params.id;
    const { productId } = req.body;

    if (!req.session.currentCustomerId) {
      return res.redirect('/login');
    }

    if (req.session.currentCustomerId !== customerId) {
      return res.status(403).send('Unauthorized wishlist modification.');
    }

    if (!ObjectId.isValid(customerId) || !ObjectId.isValid(productId)) {
      return res.status(400).send('Invalid customer or product ID.');
    }

    // $pull Operator: Atomically removes matching product ID from the embedded array
    await db.collection('customers').updateOne(
      { _id: new ObjectId(customerId) },
      { $pull: { wishlist: new ObjectId(productId) } }
    );

    res.redirect('back');
  } catch (err) {
    console.error('Error removing from wishlist:', err);
    res.status(500).send('Error updating wishlist.');
  }
});


// 
// SECTION 5: SHOPPING CART & ORDER PROCESSING (FEATURE 3)
// Endpoints: Add to cart, Cart view, Quantity update, Order checkout
// MongoDB Operations: Price snapshotting, Atomic inventory reduction ($inc)
// 

// POST /cart/add - Add selected jewelry item and quantity to session cart
app.post('/cart/add', async (req, res) => {
  try {
    const db = getDB();
    const { productId, quantity } = req.body;
    let qty = parseInt(quantity);
    if (isNaN(qty) || qty <= 0) qty = 1;

    if (!ObjectId.isValid(productId)) {
      return res.redirect('/catalog');
    }

    const product = await db.collection('products').findOne({ _id: new ObjectId(productId) });
    if (!product || product.stock_quantity <= 0) {
      req.session.cartError = 'The selected jewelry piece is currently out of stock.';
      return res.redirect('/cart');
    }

    if (!req.session.cart) req.session.cart = [];

    const existingItem = req.session.cart.find((item) => item.productId === productId);
    if (existingItem) {
      existingItem.quantity = Math.min(existingItem.quantity + qty, product.stock_quantity);
    } else {
      req.session.cart.push({ productId, quantity: Math.min(qty, product.stock_quantity) });
    }

    res.redirect('/cart');
  } catch (err) {
    console.error('Error adding to cart:', err);
    res.redirect('/cart');
  }
});

// GET /cart - View active shopping cart with calculated line totals, tax, and grand total
app.get('/cart', async (req, res) => {
  try {
    const db = getDB();
    const cart = req.session.cart || [];

    const productIds = cart.map((item) => new ObjectId(item.productId));
    const products = await db
      .collection('products')
      .find({ _id: { $in: productIds } })
      .toArray();

    // Map cart items with live product data
    const cartItems = cart.map((cartItem) => {
      const product = products.find((p) => p._id.toString() === cartItem.productId);
      return {
        product,
        quantity: cartItem.quantity,
        lineTotal: product ? product.price * cartItem.quantity : 0
      };
    }).filter(item => item.product);

    const subtotal = cartItems.reduce((acc, item) => acc + item.lineTotal, 0);
    const tax = parseFloat((subtotal * 0.08).toFixed(2));
    const total = parseFloat((subtotal + tax).toFixed(2));

    const cartError = req.session.cartError || null;
    req.session.cartError = null;

    res.render('cart', {
      cartItems,
      subtotal,
      tax,
      total,
      cartError
    });
  } catch (err) {
    console.error('Error loading cart:', err);
    res.status(500).send('Error loading cart.');
  }
});

// POST /cart/update - Modify item quantity or remove item if quantity is zero
app.post('/cart/update', async (req, res) => {
  try {
    const db = getDB();
    const { productId, quantity } = req.body;
    const qty = parseInt(quantity);

    if (req.session.cart) {
      if (isNaN(qty) || qty <= 0) {
        req.session.cart = req.session.cart.filter((item) => item.productId !== productId);
      } else {
        const product = await db.collection('products').findOne({ _id: new ObjectId(productId) });
        const maxStock = product ? product.stock_quantity : qty;
        const item = req.session.cart.find((item) => item.productId === productId);
        if (item) {
          item.quantity = Math.min(qty, maxStock);
        }
      }
    }

    res.redirect('/cart');
  } catch (err) {
    console.error('Error updating cart:', err);
    res.redirect('/cart');
  }
});

// POST /orders/checkout - Process order with price snapshots and atomic $inc stock reduction
app.post('/orders/checkout', async (req, res) => {
  try {
    const db = getDB();
    const cart = req.session.cart || [];

    if (cart.length === 0) {
      return res.redirect('/cart');
    }

    const customerId = req.session.currentCustomerId;
    if (!customerId) {
      return res.redirect('/login');
    }

    const productIds = cart.map((item) => new ObjectId(item.productId));
    const products = await db
      .collection('products')
      .find({ _id: { $in: productIds } })
      .toArray();

    // Pre-validation: Verify sufficient stock exists for every item before altering database
    for (const cartItem of cart) {
      const product = products.find((p) => p._id.toString() === cartItem.productId);
      if (!product) {
        req.session.cartError = 'One or more items in your shopping bag are no longer active in the catalog.';
        return res.redirect('/cart');
      }
      if (product.stock_quantity < cartItem.quantity) {
        req.session.cartError = `Insufficient stock for "${product.name}". Only ${product.stock_quantity} available in boutique inventory.`;
        return res.redirect('/cart');
      }
    }

    // Price Snapshotting: Lock in current product title and price at checkout time
    const orderItems = [];
    let subtotal = 0;

    for (const cartItem of cart) {
      const product = products.find((p) => p._id.toString() === cartItem.productId);
      if (!product) continue;

      orderItems.push({
        product_id: product._id,
        name: product.name,
        quantity: cartItem.quantity,
        price_at_purchase: product.price
      });

      subtotal += product.price * cartItem.quantity;

      // $inc Operator: Safely decrement stock while ensuring stock >= quantity (prevents negative stock)
      const stockUpdate = await db.collection('products').updateOne(
        { _id: product._id, stock_quantity: { $gte: cartItem.quantity } },
        { $inc: { stock_quantity: -cartItem.quantity } }
      );

      if (stockUpdate.modifiedCount === 0) {
        req.session.cartError = `Stock conflict for "${product.name}". Please review your cart and retry.`;
        return res.redirect('/cart');
      }
    }

    const tax = parseFloat((subtotal * 0.08).toFixed(2));
    const totalPrice = parseFloat((subtotal + tax).toFixed(2));

    // Insert completed order record into orders collection
    await db.collection('orders').insertOne({
      customer_id: new ObjectId(customerId),
      status: 'Processing',
      items: orderItems,
      subtotal,
      tax,
      total_price: totalPrice,
      order_date: new Date()
    });

    // Reset shopping bag session
    req.session.cart = [];

    res.redirect(`/customer/${customerId}`);
  } catch (err) {
    console.error('Error during checkout:', err);
    res.status(500).send('Checkout failed.');
  }
});

// 
// SECTION 6: PRODUCT REVIEWS & FEEDBACK (FEATURE 4)
// Endpoints: Customer review submission
// MongoDB Operators: insertOne into dedicated collection; dynamic rating recalculation
// 

// POST /product/:id/review - Submit verified customer rating and written feedback
app.post('/product/:id/review', async (req, res) => {
  try {
    const db = getDB();
    const productId = req.params.id;
    const { rating, comment } = req.body;
    const customer = res.locals.currentCustomer;

    if (!customer) {
      return res.redirect('/login');
    }

    const parsedRating = parseInt(rating);
    const validRating = isNaN(parsedRating) ? 5 : Math.max(1, Math.min(5, parsedRating));

    await db.collection('reviews').insertOne({
      product_id: new ObjectId(productId),
      customer_id: customer._id,
      customer_name: customer.name,
      rating: validRating,
      comment: (comment || '').trim(),
      review_date: new Date()
    });

    res.redirect(`/product/${productId}`);
  } catch (err) {
    console.error('Error saving review:', err);
    res.status(500).send('Failed to submit review.');
  }
});

// 
// SECTION 7: ADMIN DASHBOARD & ADVANCED INVENTORY AGGREGATION (FEATURE 5)
// Endpoints: Management overview dashboard
// Pipelines: Category inventory intelligence, Live orders with customer lookup
// 

// GET /admin - Management dashboard with multi-stage aggregation pipelines
app.get('/admin', requireAdmin, async (req, res) => {
  try {
    const db = getDB();

    // Aggregation Pipeline 1: Group products by category, join category name, calculate inventory statistics
    const categoryStats = await db
      .collection('products')
      .aggregate([
        {
          $group: {
            _id: '$category_id',
            totalProducts: { $sum: 1 },
            avgPrice: { $avg: '$price' },
            totalStock: { $sum: '$stock_quantity' }
          }
        },
        {
          $lookup: {
            from: 'categories',
            localField: '_id',
            foreignField: '_id',
            as: 'categoryInfo'
          }
        },
        {
          $unwind: '$categoryInfo'
        },
        {
          $sort: { 'categoryInfo.display_order': 1 }
        }
      ])
      .toArray();

    const allCategories = await db.collection('categories').find({}).sort({ display_order: 1 }).toArray();
    const totalOrdersCount = await db.collection('orders').countDocuments();
    const totalCustomersCount = await db.collection('customers').countDocuments();

    // Aggregation Pipeline 2: Fetch recent customer orders with customer details lookup
    const recentOrders = await db
      .collection('orders')
      .aggregate([
        { $sort: { order_date: -1 } },
        { $limit: 10 },
        {
          $lookup: {
            from: 'customers',
            localField: 'customer_id',
            foreignField: '_id',
            as: 'customer'
          }
        },
        {
          $unwind: {
            path: '$customer',
            preserveNullAndEmptyArrays: true
          }
        }
      ])
      .toArray();

    // Aggregation Pipeline 3: Fetch all products with their category details for inventory management
    const allProducts = await db
      .collection('products')
      .aggregate([
        {
          $lookup: {
            from: 'categories',
            localField: 'category_id',
            foreignField: '_id',
            as: 'category'
          }
        },
        {
          $unwind: {
            path: '$category',
            preserveNullAndEmptyArrays: true
          }
        },
        { $sort: { created_at: -1 } }
      ])
      .toArray();

    const adminMessage = req.session.adminMessage || null;
    const adminError = req.session.adminError || null;
    req.session.adminMessage = null;
    req.session.adminError = null;

    res.render('admin', {
      categoryStats,
      allCategories,
      totalOrdersCount,
      totalCustomersCount,
      recentOrders,
      allProducts,
      adminMessage,
      adminError
    });
  } catch (err) {
    console.error('Error loading admin dashboard:', err);
    res.status(500).send('Error loading admin dashboard.');
  }
});

// 
// SECTION 8: ADMIN CRUD OPERATIONS (CATEGORIES, ORDERS, PRODUCTS)
// Features: Referential integrity checks, Dynamic polymorphic attributes, Cascading cleanups
// 

// POST /admin/categories/add - Create a new category document
app.post('/admin/categories/add', requireAdmin, async (req, res) => {
  try {
    const db = getDB();
    const { name, description, display_order } = req.body;

    if (!name || !name.trim()) {
      req.session.adminError = 'Category name cannot be empty.';
      return res.redirect('/admin');
    }

    await db.collection('categories').insertOne({
      name: name.trim(),
      description: (description || '').trim(),
      display_order: parseInt(display_order) || 1
    });

    req.session.adminMessage = `Category "${name.trim()}" created successfully.`;
    res.redirect('/admin');
  } catch (err) {
    console.error('Error adding category:', err);
    res.status(500).send('Failed to add category.');
  }
});

// POST /admin/categories/delete/:id - Delete category with referential integrity guard
app.post('/admin/categories/delete/:id', requireAdmin, async (req, res) => {
  try {
    const db = getDB();
    const categoryId = req.params.id;

    if (!ObjectId.isValid(categoryId)) {
      return res.redirect('/admin');
    }

    // Integrity Check: Prevent deletion if products currently reference this category
    const productCount = await db.collection('products').countDocuments({ category_id: new ObjectId(categoryId) });
    if (productCount > 0) {
      req.session.adminError = `Cannot delete category: it currently contains ${productCount} active piece(s). Please reassign or remove these pieces first to prevent orphaned records.`;
      return res.redirect('/admin');
    }

    await db.collection('categories').deleteOne({ _id: new ObjectId(categoryId) });
    req.session.adminMessage = 'Category removed successfully.';
    res.redirect('/admin');
  } catch (err) {
    console.error('Error deleting category:', err);
    res.status(500).send('Failed to delete category.');
  }
});

// POST /admin/orders/status - Update order fulfillment status ($set)
app.post('/admin/orders/status', requireAdmin, async (req, res) => {
  try {
    const db = getDB();
    const { orderId, status } = req.body;

    if (ObjectId.isValid(orderId) && status) {
      await db.collection('orders').updateOne(
        { _id: new ObjectId(orderId) },
        { $set: { status: status.trim() } }
      );
      req.session.adminMessage = `Order #${orderId.substring(18)} status successfully updated to "${status.trim()}".`;
    }

    res.redirect('/admin');
  } catch (err) {
    console.error('Error updating order status:', err);
    res.status(500).send('Failed to update order status.');
  }
});

// POST /admin/products/add - Add new jewelry piece with polymorphic attributes
app.post('/admin/products/add', requireAdmin, async (req, res) => {
  try {
    const db = getDB();
    const {
      name,
      description,
      category_id,
      price,
      metal_type,
      gemstone,
      stock_quantity,
      image_url,
      specification,
      certification
    } = req.body;

    if (!name || !category_id || !price) {
      req.session.adminError = 'Product name, category, and price are required.';
      return res.redirect('/admin');
    }

    // Polymorphic Attributes: Store custom subdocument specifications without fixed SQL columns
    const attributes = {};
    if (specification && specification.trim()) {
      attributes.details = specification.trim();
    }
    if (certification && certification.trim()) {
      attributes.certification = certification.trim();
    }

    await db.collection('products').insertOne({
      name: name.trim(),
      description: (description || '').trim(),
      category_id: new ObjectId(category_id),
      price: parseFloat(price) || 0,
      metal_type: metal_type || 'Yellow Gold',
      gemstone: gemstone || 'Diamond',
      stock_quantity: parseInt(stock_quantity) || 1,
      image_url: (image_url && image_url.trim()) ? image_url.trim() : 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?auto=format&fit=crop&w=800&q=80',
      attributes: attributes,
      created_at: new Date()
    });

    req.session.adminMessage = `Artisanal piece "${name.trim()}" published to catalog.`;
    res.redirect('/admin');
  } catch (err) {
    console.error('Error adding product:', err);
    res.status(500).send('Failed to add product.');
  }
});

// POST /admin/products/update/:id - Update product listing price and stock ($set)
app.post('/admin/products/update/:id', requireAdmin, async (req, res) => {
  try {
    const db = getDB();
    const productId = req.params.id;
    const { price, stock_quantity } = req.body;

    if (!ObjectId.isValid(productId)) {
      req.session.adminError = 'Invalid product ID reference.';
      return res.redirect('/admin');
    }

    const updateFields = {};
    if (price !== undefined && !isNaN(parseFloat(price))) {
      updateFields.price = parseFloat(price);
    }
    if (stock_quantity !== undefined && !isNaN(parseInt(stock_quantity))) {
      updateFields.stock_quantity = Math.max(0, parseInt(stock_quantity));
    }

    if (Object.keys(updateFields).length > 0) {
      await db.collection('products').updateOne(
        { _id: new ObjectId(productId) },
        { $set: updateFields }
      );
      req.session.adminMessage = 'Product price and stock levels updated successfully.';
    }

    res.redirect('/admin');
  } catch (err) {
    console.error('Error updating product:', err);
    res.status(500).send('Failed to update product.');
  }
});

// POST /admin/products/delete/:id - Delete product with automated cascade cleanups
app.post('/admin/products/delete/:id', requireAdmin, async (req, res) => {
  try {
    const db = getDB();
    const productId = req.params.id;

    if (!ObjectId.isValid(productId)) {
      req.session.adminError = 'Invalid product ID reference.';
      return res.redirect('/admin');
    }

    const product = await db.collection('products').findOne({ _id: new ObjectId(productId) });
    if (!product) {
      req.session.adminError = 'Product listing not found.';
      return res.redirect('/admin');
    }

    // 1. Remove product document from catalog
    await db.collection('products').deleteOne({ _id: new ObjectId(productId) });

    // 2. Cascade cleanup: Pull removed product from all customer wishlists ($pull)
    await db.collection('customers').updateMany(
      {},
      { $pull: { wishlist: new ObjectId(productId) } }
    );

    // 3. Cascade cleanup: Delete associated customer reviews for the removed piece (deleteMany)
    await db.collection('reviews').deleteMany({ product_id: new ObjectId(productId) });

    req.session.adminMessage = `Listing "${product.name}" has been permanently removed from the catalog.`;
    res.redirect('/admin');
  } catch (err) {
    console.error('Error deleting product listing:', err);
    res.status(500).send('Failed to remove product listing.');
  }
});

// 
// SECTION 9: SERVER INITIALIZATION & MONGODB CONNECTION
// 

// Connect to MongoDB first, then start HTTP listener
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Jewelry E-Commerce server running at http://localhost:${PORT}`);
  });
});

