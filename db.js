// MongoDB Database Connection Module
const { MongoClient } = require('mongodb');

// Connection URL - Update this with your MongoDB connection string
// Local: mongodb://localhost:27017/goofylittleme
// Atlas: mongodb+srv://username:password@cluster.mongodb.net/goofylittleme?retryWrites=true&w=majority
// 
// IMPORTANT: For MongoDB Atlas, the connection string should include:
// - Your username and password (replace <username> and <password>)
// - Your cluster address (replace cluster.mongodb.net with your actual cluster)
// - Database name: goofylittleme (add before the ?)
// - Example: mongodb+srv://myuser:mypass@cluster0.abc123.mongodb.net/goofylittleme?retryWrites=true&w=majority
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/goofylittleme';
const DB_NAME = 'goofylittleme';

let client = null;
let db = null;

// Connect to MongoDB
async function connectDB() {
  try {
    if (client && db) {
      return { client, db };
    }

    client = new MongoClient(MONGODB_URI);
    await client.connect();
    db = client.db(DB_NAME);
    
    console.log('✅ Connected to MongoDB');
    
    // Create indexes for better performance
    await createIndexes();
    
    return { client, db };
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    throw error;
  }
}

// Create database indexes for faster queries
async function createIndexes() {
  try {
    // Users collection indexes
    await db.collection('users').createIndex({ username: 1 }, { unique: true });
    await db.collection('users').createIndex({ email: 1 }, { unique: true });
    await db.collection('users').createIndex({ userId: 1 }, { unique: true });
    
    // Gifts collection indexes
    await db.collection('gifts').createIndex({ sender: 1 });
    await db.collection('gifts').createIndex({ recipient: 1 });
    await db.collection('gifts').createIndex({ status: 1 });
    
    // Messages collection indexes
    await db.collection('messages').createIndex({ participants: 1 });
    await db.collection('messages').createIndex({ 'messages.timestamp': -1 });
    
    console.log('✅ Database indexes created');
  } catch (error) {
    console.error('Error creating indexes:', error);
  }
}

// Generate unique user ID (6-digit, but can be extended)
async function generateUserId() {
  const usersCollection = await getUsersCollection();
  let userId;
  let exists = true;
  let attempts = 0;
  
  // Generate 6-digit ID (100000-999999)
  while (exists && attempts < 1000) {
    userId = Math.floor(100000 + Math.random() * 900000).toString();
    const existing = await usersCollection.findOne({ userId: userId });
    exists = !!existing;
    attempts++;
  }
  
  if (attempts >= 1000) {
    // Fallback: Use timestamp-based ID if we run out of 6-digit IDs
    userId = Date.now().toString().slice(-8); // Last 8 digits of timestamp
  }
  
  return userId;
}

// Get database instance
async function getDB() {
  if (!db) {
    await connectDB();
  }
  return db;
}

// Close database connection
async function closeDB() {
  if (client) {
    await client.close();
    client = null;
    db = null;
    console.log('MongoDB connection closed');
  }
}

// Collections
async function getUsersCollection() {
  const database = await getDB();
  return database.collection('users');
}

async function getGiftsCollection() {
  const database = await getDB();
  return database.collection('gifts');
}

async function getMessagesCollection() {
  const database = await getDB();
  return database.collection('messages');
}

module.exports = {
  connectDB,
  getDB,
  closeDB,
  getUsersCollection,
  getGiftsCollection,
  getMessagesCollection,
  generateUserId
};

