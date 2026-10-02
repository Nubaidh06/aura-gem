// FILE: seed.js - Database Initialization & Seed Script
// Purpose: Resets and populates MongoDB with realistic fine jewelry data
// Collections Seeded: categories, products, customers, reviews, orders


const { connectDB, client } = require('./db');
const { ObjectId } = require('mongodb');
const bcrypt = require('bcryptjs');

async function seedData() {
  const db = await connectDB();

  // SECTION 1: RESET / CLEAR EXISTING COLLECTIONS
  // Purpose: Uses deleteMany({}) to wipe old records before seeding fresh data

  console.log('Clearing existing collections...');
  await db.collection('categories').deleteMany({});
  await db.collection('products').deleteMany({});
  await db.collection('customers').deleteMany({});
  await db.collection('reviews').deleteMany({});
  await db.collection('orders').deleteMany({});

 
  // SECTION 2: SEED CATEGORIES COLLECTION
  // Purpose: Inserts top-level jewelry categories with display ordering
  
  console.log('Inserting categories...');
  const catRingsId = new ObjectId();
  const catNecklacesId = new ObjectId();
  const catBraceletsId = new ObjectId();
  const catEarringsId = new ObjectId();

  await db.collection('categories').insertMany([
    {
      _id: catRingsId,
      name: 'Rings',
      description: 'Handcrafted engagement, wedding, and fashion rings.',
      display_order: 1
    },
    {
      _id: catNecklacesId,
      name: 'Necklaces',
      description: 'Gold, silver, and gemstone pendant chains.',
      display_order: 2
    },
    {
      _id: catBraceletsId,
      name: 'Bracelets',
      description: 'Elegant bangles and tennis bracelets.',
      display_order: 3
    },
    {
      _id: catEarringsId,
      name: 'Earrings',
      description: 'Studs, hoops, and diamond drop earrings.',
      display_order: 4
    }
  ]);

  // 
  // SECTION 3: SEED PRODUCTS WITH POLYMORPHIC ATTRIBUTES
  // Purpose: Demonstrates NoSQL schema flexibility: each product embeds unique
  // attributes (sizes, chain length, clasp type, diamond certificates) without
  // requiring empty NULL columns or complex SQL join tables.
  // 
  console.log('Inserting products...');
  const prod1Id = new ObjectId();
  const prod2Id = new ObjectId();
  const prod3Id = new ObjectId();
  const prod4Id = new ObjectId();
  const prod5Id = new ObjectId();
  const prod6Id = new ObjectId();

  await db.collection('products').insertMany([
    {
      _id: prod1Id,
      name: '18K Gold Solitaire Diamond Ring',
      description: 'Classic engagement ring featuring a round brilliant 1-carat diamond set in pure 18k yellow gold.',
      category_id: catRingsId,
      price: 1250.00,
      metal_type: 'Yellow Gold',
      gemstone: 'Diamond',
      stock_quantity: 12,
      image_url: 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?auto=format&fit=crop&w=800&q=80',
      attributes: {
        sizes_available: [5, 6, 7, 8, 9],
        weight_grams: 3.8,
        certification: 'GIA Certified'
      },
      created_at: new Date('2024-01-15')
    },
    {
      _id: prod2Id,
      name: 'Platinum Emerald Halo Ring',
      description: 'Vibrant natural Colombian emerald surrounded by a sparkling diamond halo.',
      category_id: catRingsId,
      price: 1850.00,
      metal_type: 'Platinum',
      gemstone: 'Emerald',
      stock_quantity: 5,
      image_url: 'https://images.unsplash.com/photo-1603561591411-07134e71a2a9?auto=format&fit=crop&w=800&q=80',
      attributes: {
        sizes_available: [6, 7, 8],
        weight_grams: 4.2,
        certification: 'AGS Certified'
      },
      created_at: new Date('2024-02-10')
    },
    {
      _id: prod3Id,
      name: 'Diamond Tennis Bracelet',
      description: 'Continuous strand of prong-set round brilliant diamonds in 14k white gold.',
      category_id: catBraceletsId,
      price: 2100.00,
      metal_type: 'White Gold',
      gemstone: 'Diamond',
      stock_quantity: 7,
      image_url: 'https://images.unsplash.com/photo-1611591475152-4777595f99d1?auto=format&fit=crop&w=800&q=80',
      attributes: {
        length_inches: 7.0,
        total_carats: 3.0,
        clasp_type: 'Box clasp with safety latch'
      },
      created_at: new Date('2024-02-20')
    },
    {
      _id: prod4Id,
      name: 'Sapphire Royal Pendant Necklace',
      description: 'Deep royal blue oval sapphire accented by pavé diamonds on a delicate platinum chain.',
      category_id: catNecklacesId,
      price: 980.00,
      metal_type: 'Platinum',
      gemstone: 'Sapphire',
      stock_quantity: 10,
      image_url: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=800&q=80',
      attributes: {
        chain_length_inches: 18,
        weight_grams: 5.1
      },
      created_at: new Date('2024-03-01')
    },
    {
      _id: prod5Id,
      name: 'Rose Gold Pearl Drop Pendant',
      description: 'Lustrous freshwater pearl suspended from a polished 14k rose gold chain.',
      category_id: catNecklacesId,
      price: 450.00,
      metal_type: 'Rose Gold',
      gemstone: 'Pearl',
      stock_quantity: 18,
      image_url: 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&w=800&q=80',
      attributes: {
        chain_length_inches: 16,
        pearl_diameter_mm: 9.0
      },
      created_at: new Date('2024-03-12')
    },
    {
      _id: prod6Id,
      name: 'Diamond Stud Earrings',
      description: 'Timeless round cut diamond studs with four-prong 18k white gold basket settings.',
      category_id: catEarringsId,
      price: 750.00,
      metal_type: 'White Gold',
      gemstone: 'Diamond',
      stock_quantity: 20,
      image_url: 'https://images.unsplash.com/photo-1630019852942-f89202989a59?auto=format&fit=crop&w=800&q=80',
      attributes: {
        backing_type: 'Screw back',
        total_carats: 0.8
      },
      created_at: new Date('2024-03-25')
    }
  ]);

  // 
  // SECTION 4: COMPOUND TEXT INDEX FOR FULL-TEXT SEARCH
  // Purpose: Builds a text index spanning name, description, metal, and gemstone.
  // Enables fast keyword searches across the entire catalog with score ranking.
  // 
  console.log('Creating text index on products for search...');
  await db.collection('products').createIndex({ 
    name: 'text', 
    description: 'text', 
    metal_type: 'text', 
    gemstone: 'text' 
  });

  // 
  // SECTION 5: SEED CUSTOMER & ADMINISTRATOR ACCOUNTS
  // Purpose: Creates accounts with 10-round bcrypt password hashing.
  // Demonstrates embedded delivery_address and embedded wishlist array of ObjectIds.
  // 
  console.log('Inserting customers...');
  const adminId = new ObjectId();
  const cust1Id = new ObjectId();
  const cust2Id = new ObjectId();
  const defaultPasswordHash = bcrypt.hashSync('password123', 10);
  const adminPasswordHash = bcrypt.hashSync('admin123', 10);

  await db.collection('customers').insertMany([
    {
      _id: adminId,
      name: 'Store Administrator',
      email: 'admin@auragem.com',
      password_hash: adminPasswordHash,
      role: 'admin',
      phone: '+1-555-0100',
      delivery_address: {
        street: '100 Haute Joaillerie Way',
        city: 'New York',
        state: 'NY',
        zip: '10001'
      },
      wishlist: [],
      created_at: new Date('2024-01-01')
    },
    {
      _id: cust1Id,
      name: 'Sarah Jenkins',
      email: 'sarah.j@example.com',
      password_hash: defaultPasswordHash,
      role: 'customer',
      phone: '+1-555-0143',
      delivery_address: {
        street: '742 Evergreen Terrace',
        city: 'Springfield',
        state: 'OR',
        zip: '97477'
      },
      wishlist: [prod1Id, prod4Id],
      created_at: new Date('2024-01-10')
    },
    {
      _id: cust2Id,
      name: 'Michael Chen',
      email: 'm.chen@example.com',
      password_hash: defaultPasswordHash,
      role: 'customer',
      phone: '+1-555-0189',
      delivery_address: {
        street: '128 Pine Ridge Lane',
        city: 'Seattle',
        state: 'WA',
        zip: '98101'
      },
      wishlist: [prod3Id],
      created_at: new Date('2024-02-05')
    }
  ]);

  // 
  // SECTION 6: SEED CUSTOMER REVIEWS
  // Purpose: Reviews are kept in a dedicated collection referenced by product_id
  // and customer_id to prevent hitting the 16MB document cap on popular products.
  // 
  console.log('Inserting reviews...');
  await db.collection('reviews').insertMany([
    {
      _id: new ObjectId(),
      product_id: prod1Id,
      customer_id: cust1Id,
      customer_name: 'Sarah Jenkins',
      rating: 5,
      comment: 'Proposed with this ring and she said yes! The gold finish is immaculate.',
      review_date: new Date('2024-02-18')
    },
    {
      _id: new ObjectId(),
      product_id: prod1Id,
      customer_id: cust2Id,
      customer_name: 'Michael Chen',
      rating: 4,
      comment: 'Great sparkle and size. Packaging was also very secure.',
      review_date: new Date('2024-03-02')
    },
    {
      _id: new ObjectId(),
      product_id: prod3Id,
      customer_id: cust1Id,
      customer_name: 'Sarah Jenkins',
      rating: 5,
      comment: 'Very solid clasp and the diamonds shine bright even in low lighting.',
      review_date: new Date('2024-03-15')
    },
    {
      _id: new ObjectId(),
      product_id: prod4Id,
      customer_id: cust2Id,
      customer_name: 'Michael Chen',
      rating: 5,
      comment: 'Color is a rich royal blue. Delivered right on time.',
      review_date: new Date('2024-03-20')
    }
  ]);

  // 
  // SECTION 7: SEED ORDERS WITH PRICE SNAPSHOTS
  // Purpose: Orders embed product details and price_at_purchase to preserve
  // exact historical receipts even if catalog prices change in the future.
  // 
  console.log('Inserting sample orders...');
  await db.collection('orders').insertMany([
    {
      _id: new ObjectId(),
      customer_id: cust1Id,
      status: 'Delivered',
      items: [
        {
          product_id: prod1Id,
          name: '18K Gold Solitaire Diamond Ring',
          quantity: 1,
          price_at_purchase: 1250.00
        }
      ],
      subtotal: 1250.00,
      tax: 100.00,
      total_price: 1350.00,
      order_date: new Date('2024-02-14')
    },
    {
      _id: new ObjectId(),
      customer_id: cust2Id,
      status: 'Shipped',
      items: [
        {
          product_id: prod4Id,
          name: 'Sapphire Royal Pendant Necklace',
          quantity: 1,
          price_at_purchase: 980.00
        },
        {
          product_id: prod6Id,
          name: 'Diamond Stud Earrings',
          quantity: 1,
          price_at_purchase: 750.00
        }
      ],
      subtotal: 1730.00,
      tax: 138.40,
      total_price: 1868.40,
      order_date: new Date('2024-03-18')
    }
  ]);

  // 
  // SECTION 8: COMPLETE SEEDING & CLOSE CONNECTION
  // 
  console.log('Seeding completed successfully!');
  await client.close();
}

// Execute seed function with error catching
seedData().catch((err) => {
  console.error('Seeding error:', err);
  process.exit(1);
});

