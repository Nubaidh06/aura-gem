// FILE: db.js - MongoDB Database Connection Module
// Purpose: Manages the connection pool and exposes database access functions
// Database: jewelry_db running on MongoDB (localhost:27017)

const { MongoClient } = require('mongodb');
require('dotenv').config();

// Default connection URI with fallback to local MongoDB instance
const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/jewelry_db';
const client = new MongoClient(uri);

// Cached database reference (Singleton pattern)
let db;

// Connect to MongoDB and cache the database reference
async function connectDB() {
  if (db) return db;
  try {
    await client.connect();
    db = client.db();
    console.log('Connected to MongoDB database:', db.databaseName);
    return db;
  } catch (err) {
    console.error('Failed to connect to MongoDB:', err.message);
    process.exit(1);
  }
}

// Access the active database reference from any route handler
function getDB() {
  if (!db) {
    throw new Error('Database not connected. Call connectDB first.');
  }
  return db;
}

module.exports = { connectDB, getDB, client };

