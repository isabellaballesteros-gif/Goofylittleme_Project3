// Load environment variables (for MongoDB Atlas connection)
require('dotenv').config();

const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');

// MongoDB connection
const { connectDB, getUsersCollection, getGiftsCollection, getMessagesCollection, generateUserId } = require('./db');

// GridFS for image storage
const {
  uploadAvatar,
  downloadAvatar,
  deleteAvatar,
  uploadInterest,
  downloadInterest,
  deleteInterest,
  listUserInterests,
  uploadGift,
  downloadGift,
  deleteGift,
  listAllAvatars
} = require('./gridfs');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));
// Note: Static files served after API routes to avoid conflicts

// Create necessary directories
const avatarsDir = path.join(__dirname, 'avatars');
const usersDir = path.join(__dirname, 'users');
const interestsDir = path.join(__dirname, 'interests');
const giftsDir = path.join(__dirname, 'gifts');
const usersDbPath = path.join(__dirname, 'users.json');
const giftsDbPath = path.join(__dirname, 'gifts.json');

// Simple session storage (in production, use Redis or database)
const sessions = {};

// Cookie parser middleware
app.use((req, res, next) => {
  req.cookies = {};
  if (req.headers.cookie) {
    req.headers.cookie.split(';').forEach(cookie => {
      const parts = cookie.trim().split('=');
      req.cookies[parts[0]] = parts[1];
    });
  }
  next();
});

// Get current user from session
function getCurrentUser(req) {
  const sessionId = req.cookies?.sessionId;
  if (!sessionId || !sessions[sessionId]) {
    return null;
  }
  const username = sessions[sessionId];
  // Debug logging (can be removed in production)
  if (process.env.DEBUG) {
    console.log(`Session lookup: ${sessionId} -> ${username}`);
  }
  return username;
}

// Set session cookie
function setSession(res, username, req = null) {
  // Clear any existing sessions for this username to prevent conflicts
  if (req) {
    const oldSessionId = req.cookies?.sessionId;
    if (oldSessionId && sessions[oldSessionId]) {
      delete sessions[oldSessionId];
    }
  }
  
  // Also clear any other sessions for this username (in case of multiple sessions)
  for (const [sessionId, sessionUsername] of Object.entries(sessions)) {
    if (sessionUsername === username) {
      delete sessions[sessionId];
    }
  }
  
  const sessionId = uuidv4();
  sessions[sessionId] = username;
  // Add SameSite=None; Secure for cross-origin support, but use Lax for same-site
  res.setHeader('Set-Cookie', `sessionId=${sessionId}; Path=/; Max-Age=31536000; HttpOnly; SameSite=Lax`);
  console.log(`Session created for ${username} with ID ${sessionId}`);
  return sessionId;
}

// Clear session
function clearSession(res) {
  res.setHeader('Set-Cookie', 'sessionId=; Path=/; Max-Age=0');
}

// MongoDB: Load users database (for backward compatibility, returns object format)
async function loadUsers() {
  try {
    const usersCollection = await getUsersCollection();
    const usersArray = await usersCollection.find({}).toArray();
    
    // Convert array to object format (for backward compatibility)
    const users = {};
    usersArray.forEach(user => {
      users[user.username] = user;
    });
    
    return users;
  } catch (error) {
    console.error('Error loading users from MongoDB:', error);
    return {};
  }
}

// MongoDB: Save user (individual user operation)
async function saveUser(user) {
  try {
    const usersCollection = await getUsersCollection();
    await usersCollection.updateOne(
      { username: user.username },
      { $set: user },
      { upsert: true }
    );
  } catch (error) {
    console.error('Error saving user to MongoDB:', error);
    throw error;
  }
}

// MongoDB: Update user field(s)
async function updateUser(username, updates) {
  try {
    const usersCollection = await getUsersCollection();
    await usersCollection.updateOne(
      { username: username },
      { $set: updates }
    );
  } catch (error) {
    console.error('Error updating user:', error);
    throw error;
  }
}

// MongoDB: Find user by username
async function findUser(username) {
  try {
    const usersCollection = await getUsersCollection();
    return await usersCollection.findOne({ username: username });
  } catch (error) {
    console.error('Error finding user:', error);
    return null;
  }
}

// MongoDB: Find user by email
async function findUserByEmail(email) {
  try {
    const usersCollection = await getUsersCollection();
    return await usersCollection.findOne({ email: email });
  } catch (error) {
    console.error('Error finding user by email:', error);
    return null;
  }
}

// MongoDB: Find user by userId
async function findUserByUserId(userId) {
  try {
    const usersCollection = await getUsersCollection();
    return await usersCollection.findOne({ userId: userId });
  } catch (error) {
    console.error('Error finding user by userId:', error);
    return null;
  }
}

// MongoDB: Save users (for backward compatibility - saves all users)
async function saveUsers(users) {
  try {
    const usersCollection = await getUsersCollection();
    // Convert object to array and upsert each user
    const usersArray = Object.entries(users).map(([username, userData]) => ({
      username,
      ...userData
    }));
    
    for (const user of usersArray) {
      await usersCollection.updateOne(
        { username: user.username },
        { $set: user },
        { upsert: true }
      );
    }
  } catch (error) {
    console.error('Error saving users to MongoDB:', error);
    throw error;
  }
}

// MongoDB: Load gifts database
async function loadGifts() {
  try {
    const giftsCollection = await getGiftsCollection();
    return await giftsCollection.find({}).toArray();
  } catch (error) {
    console.error('Error loading gifts from MongoDB:', error);
    return [];
  }
}

// MongoDB: Save gift
async function saveGift(gift) {
  try {
    const giftsCollection = await getGiftsCollection();
    const result = await giftsCollection.insertOne(gift);
    return result.insertedId;
  } catch (error) {
    console.error('Error saving gift to MongoDB:', error);
    throw error;
  }
}

// MongoDB: Update gift (tries both MongoDB _id and custom id field)
async function updateGift(giftId, updates) {
  try {
    const giftsCollection = await getGiftsCollection();
    const { ObjectId } = require('mongodb');
    
    // Try MongoDB _id first
    try {
      const result = await giftsCollection.updateOne(
        { _id: new ObjectId(giftId) },
        { $set: updates }
      );
      if (result.matchedCount > 0) return;
    } catch (e) {
      // Not a valid ObjectId, try id field instead
    }
    
    // Try custom id field
    await giftsCollection.updateOne(
      { id: giftId },
      { $set: updates }
    );
  } catch (error) {
    console.error('Error updating gift:', error);
    throw error;
  }
}

// MongoDB: Find gift by ID (tries both MongoDB _id and custom id field)
async function findGiftById(giftId) {
  try {
    const giftsCollection = await getGiftsCollection();
    const { ObjectId } = require('mongodb');
    
    // Try MongoDB _id first
    try {
      const gift = await giftsCollection.findOne({ _id: new ObjectId(giftId) });
      if (gift) return gift;
    } catch (e) {
      // Not a valid ObjectId, try id field instead
    }
    
    // Try custom id field
    return await giftsCollection.findOne({ id: giftId });
  } catch (error) {
    console.error('Error finding gift:', error);
    return null;
  }
}

// MongoDB: Save gifts (for backward compatibility - saves all gifts)
async function saveGifts(gifts) {
  try {
    const giftsCollection = await getGiftsCollection();
    // If gifts array is empty, nothing to do
    if (!gifts || gifts.length === 0) {
      return;
    }
    
    // Delete all existing gifts and insert new ones (simple approach)
    // For production, you'd want to do upserts instead
    await giftsCollection.deleteMany({});
    if (gifts.length > 0) {
      await giftsCollection.insertMany(gifts);
    }
  } catch (error) {
    console.error('Error saving gifts to MongoDB:', error);
    throw error;
  }
}

// Initialize users database
async function ensureDirectories() {
  try {
    await fs.mkdir(avatarsDir, { recursive: true });
    await fs.mkdir(usersDir, { recursive: true });
    await fs.mkdir(interestsDir, { recursive: true });
    await fs.mkdir(giftsDir, { recursive: true });
    // Initialize users.json if it doesn't exist
    try {
      await fs.access(usersDbPath);
    } catch {
      await fs.writeFile(usersDbPath, '{}');
    }
    // Initialize gifts.json if it doesn't exist
    try {
      await fs.access(giftsDbPath);
    } catch {
      await fs.writeFile(giftsDbPath, '[]');
    }
  } catch (error) {
    console.error('Error creating directories:', error);
  }
}

// Interest categories
const INTEREST_CATEGORIES = [
  'dream-house', 'pets', 'food', 'car', 'drink', 
  'season', 'character', 'hobby', 'sport', 
  'music', 'job', 'time-of-day'
];

// Generate a unique 6-digit user ID (now uses MongoDB)
async function generateUserIdMongoDB() {
  return await generateUserId();
}

// Legacy function for backward compatibility (now uses MongoDB)
async function generateUserIdLegacy(users) {
  // Use MongoDB-based generation instead
  return await generateUserId();
}

// Hash password
function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

// API: Register new user
app.post('/api/register', async (req, res) => {
  try {
    const { username, password, email } = req.body;
    
    if (!username || !password || !email) {
      return res.status(400).json({ error: 'Username, password, and email are required' });
    }

    // Validate password length
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Check if username already exists
    const existingUser = await findUser(username);
    if (existingUser) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    // Check if email already exists
    const existingEmail = await findUserByEmail(email);
    if (existingEmail) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Generate unique 6-digit user ID using MongoDB
    let userId;
    try {
      userId = await generateUserIdMongoDB();
      console.log(`Generated userId for ${username}: ${userId}`);
    } catch (error) {
      console.error('Error generating userId:', error);
      return res.status(500).json({ error: 'Failed to generate user ID. Please try again.' });
    }

    // Verify userId is a 6-digit number
    if (!userId || !/^\d{6}$/.test(userId.toString())) {
      console.error(`Invalid userId generated: ${userId}`);
      return res.status(500).json({ error: 'Invalid user ID generated. Please try again.' });
    }

    // Create new user
    const newUser = {
      username,
      email,
      password: hashPassword(password), // Store hashed password
      createdAt: new Date().toISOString(),
      userId: userId.toString(), // Ensure it's a string
      userIdString: userId.toString(), // Keep as string for easy searching
      friends: [],
      pendingFriendRequests: [],
      biography: '',
      previewInterest: null
    };

    await saveUser(newUser);
    setSession(res, username, req);

    console.log(`Registration response for ${username}:`, { success: true, username, userId });
    res.json({ success: true, username, userId: userId.toString() });
  } catch (error) {
    console.error('Error registering user:', error);
    res.status(500).json({ error: 'Failed to register user' });
  }
});

// API: Login
app.post('/api/login', async (req, res) => {
  try {
    const { username, password, email } = req.body;
    
    if (!username || !password || !email) {
      return res.status(400).json({ error: 'Username, password, and email are required' });
    }

    const user = await findUser(username);

    if (!user) {
      return res.status(401).json({ error: 'Invalid username, password, or email' });
    }

    // Check password (handle both old users without passwords and new users with hashed passwords)
    const passwordMatch = user.password 
      ? user.password === hashPassword(password)
      : false; // Old users need to re-register or we can allow email-only for backward compatibility
    
    // For backward compatibility, also check email if no password stored
    if (!user.password && user.email === email) {
      // Old user without password - allow email login for now
      setSession(res, username, req);
      return res.json({ success: true, username });
    }

    if (!passwordMatch || user.email !== email) {
      return res.status(401).json({ error: 'Invalid username, password, or email' });
    }

    setSession(res, username, req);
    res.json({ success: true, username });
  } catch (error) {
    console.error('Error logging in:', error);
    res.status(500).json({ error: 'Failed to login' });
  }
});

// API: Logout
app.post('/api/logout', (req, res) => {
  const sessionId = req.cookies?.sessionId;
  if (sessionId) {
    delete sessions[sessionId];
  }
  clearSession(res);
  res.json({ success: true });
});

// API: Get current user
app.get('/api/user', async (req, res) => {
  const username = getCurrentUser(req);
  if (!username) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  
  try {
    const user = await findUser(username);
    if (user) {
      res.json({ username, userId: user.userId || null });
    } else {
      res.json({ username, userId: null });
    }
  } catch (error) {
    console.error('Error getting user info:', error);
    res.json({ username, userId: null });
  }
});

// API: Save avatar
app.post('/api/avatar', async (req, res) => {
  try {
    const username = getCurrentUser(req);
    if (!username) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { imageData, biography } = req.body;
    if (!imageData) {
      return res.status(400).json({ error: 'No image data provided' });
    }

    // Find user
    const user = await findUser(username);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Save avatar image to GridFS
    console.log(`Saving avatar to GridFS for user: ${username}`);
    const base64Data = imageData.replace(/^data:image\/png;base64,/, '');
    const imageBuffer = Buffer.from(base64Data, 'base64');
    
    // Upload to GridFS (also save to file system as backup)
    try {
      await uploadAvatar(username, imageBuffer);
      console.log(`Avatar saved to GridFS for user: ${username}`);
    } catch (error) {
      console.error('Error saving avatar to GridFS:', error);
      // Fallback to file system
      const avatarPath = path.join(avatarsDir, `${username}.png`);
      await fs.writeFile(avatarPath, base64Data, 'base64');
      console.log(`Avatar saved to file system as fallback for user: ${username}`);
    }

    // Update user info in MongoDB
    const updates = {
      avatarUpdatedAt: new Date().toISOString()
    };
    if (!user.createdAt) {
      updates.createdAt = new Date().toISOString();
    }
    // Save biography if provided
    if (biography !== undefined) {
      updates.biography = biography;
    }
    await updateUser(username, updates);

    res.json({ success: true, username });
  } catch (error) {
    console.error('Error saving avatar:', error);
    res.status(500).json({ error: 'Failed to save avatar' });
  }
});

// API: Get user's avatar
app.get('/api/avatar', async (req, res) => {
  try {
    const username = getCurrentUser(req);
    if (!username) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    // Log for debugging
    console.log(`Getting avatar for user: ${username}`);

    const user = await findUser(username) || {};
    
    // Try GridFS first, then fall back to file system
    let imageBuffer = null;
    try {
      imageBuffer = await downloadAvatar(username);
      if (!imageBuffer) {
        // Fallback to file system
        const avatarPath = path.join(avatarsDir, `${username}.png`);
        try {
          imageBuffer = await fs.readFile(avatarPath);
        } catch (e) {
          // File doesn't exist
        }
      }
    } catch (error) {
      console.error('Error loading avatar from GridFS:', error);
      // Fallback to file system
      try {
        const avatarPath = path.join(avatarsDir, `${username}.png`);
        imageBuffer = await fs.readFile(avatarPath);
      } catch (e) {
        // File doesn't exist
      }
    }
    
    if (imageBuffer) {
      const base64Image = imageBuffer.toString('base64');
      res.json({ 
        hasAvatar: true, 
        imageData: `data:image/png;base64,${base64Image}`,
        biography: user.biography || ''
      });
    } else {
      res.json({ 
        hasAvatar: false,
        biography: user.biography || ''
      });
    }
  } catch (error) {
    console.error('Error getting avatar:', error);
    res.status(500).json({ error: 'Failed to get avatar' });
  }
});

// API: Get all avatars
app.get('/api/avatars', async (req, res) => {
  try {
    // Get all users from MongoDB
    const usersCollection = await getUsersCollection();
    const allUsers = await usersCollection.find({}).toArray();
    
    const avatars = [];
    
    // For each user, try to get their avatar from GridFS or file system
    for (const user of allUsers) {
      const username = user.username;
      let imageBuffer = null;
      
      // Try GridFS first
      try {
        imageBuffer = await downloadAvatar(username);
      } catch (error) {
        // GridFS failed, try file system
      }
      
      // Fallback to file system
      if (!imageBuffer) {
        try {
          const avatarPath = path.join(avatarsDir, `${username}.png`);
          imageBuffer = await fs.readFile(avatarPath);
        } catch (e) {
          // No avatar found, skip this user
          continue;
        }
      }
      
      if (imageBuffer) {
        const base64Image = imageBuffer.toString('base64');
        avatars.push({
          username: username,
          email: user.email || null,
          userId: user.userId || null,
          imageData: `data:image/png;base64,${base64Image}`,
          createdAt: user.createdAt || user.avatarUpdatedAt || null
        });
      }
    }

    // Sort by creation date (newest first)
    avatars.sort((a, b) => {
      if (!a.createdAt) return 1;
      if (!b.createdAt) return -1;
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    res.json(avatars);
  } catch (error) {
    console.error('Error getting avatars:', error);
    res.status(500).json({ error: 'Failed to get avatars' });
  }
});

// API: Find user by ID or username
app.get('/api/user/search/:query', async (req, res) => {
  try {
    const query = req.params.query;
    if (!query) {
      return res.status(400).json({ error: 'Search query required' });
    }
    
    const usersCollection = await getUsersCollection();
    const regex = new RegExp(query, 'i'); // Case-insensitive search
    
    const results = await usersCollection.find({
      $or: [
        { username: regex },
        { userId: query }
      ]
    }).limit(20).toArray();
    
    const users = results.map(user => ({
      username: user.username,
      userId: user.userId || null,
      email: user.email || null
    }));
    
    res.json(users);
  } catch (error) {
    console.error('Error searching users:', error);
    res.status(500).json({ error: 'Failed to search users' });
  }
});

// API: Public profile by username
app.get('/api/profile/:username', async (req, res) => {
  try {
    const username = req.params.username;
    if (!username) {
      return res.status(400).json({ error: 'Username required' });
    }
    const user = await findUser(username);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Try GridFS first, then fall back to file system
    let imageData = null;
    try {
      let imageBuffer = await downloadAvatar(username);
      if (!imageBuffer) {
        // Fallback to file system
        const avatarPath = path.join(avatarsDir, `${username}.png`);
        try {
          imageBuffer = await fs.readFile(avatarPath);
        } catch (e) {
          // File doesn't exist
        }
      }
      if (imageBuffer) {
        imageData = `data:image/png;base64,${imageBuffer.toString('base64')}`;
      }
    } catch (error) {
      console.error('Error loading avatar:', error);
      // Try file system fallback
      try {
        const avatarPath = path.join(avatarsDir, `${username}.png`);
        const imageBuffer = await fs.readFile(avatarPath);
        imageData = `data:image/png;base64,${imageBuffer.toString('base64')}`;
      } catch (_) {
        imageData = null;
      }
    }
    
    // Get preview interest if set
    let previewInterestData = null;
    if (user.previewInterest) {
      try {
        // Try GridFS first
        let interestBuffer = await downloadInterest(username, user.previewInterest);
        if (!interestBuffer) {
          // Fallback to file system
          const interestPath = path.join(interestsDir, `${username}_${user.previewInterest}.png`);
          try {
            interestBuffer = await fs.readFile(interestPath);
          } catch (e) {
            // File doesn't exist
          }
        }
        if (interestBuffer) {
          previewInterestData = `data:image/png;base64,${interestBuffer.toString('base64')}`;
        }
      } catch (error) {
        console.error('Error loading preview interest:', error);
        // Try file system fallback
        try {
          const interestPath = path.join(interestsDir, `${username}_${user.previewInterest}.png`);
          const interestBuffer = await fs.readFile(interestPath);
          previewInterestData = `data:image/png;base64,${interestBuffer.toString('base64')}`;
        } catch (_) {
          previewInterestData = null;
        }
      }
    }
    
    res.json({ 
      username, 
      userId: user.userId || null,
      biography: user.biography || '', 
      imageData,
      previewInterest: user.previewInterest || null,
      previewInterestData: previewInterestData
    });
  } catch (error) {
    console.error('Error getting profile:', error);
    res.status(500).json({ error: 'Failed to get profile' });
  }
});

// API: Delete own avatar
app.delete('/api/avatar', async (req, res) => {
  try {
    const username = getCurrentUser(req);
    if (!username) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // Delete from GridFS and file system
    let deleted = false;
    try {
      deleted = await deleteAvatar(username);
      if (deleted) {
        console.log(`Avatar deleted from GridFS for user: ${username}`);
      }
    } catch (error) {
      console.error('Error deleting avatar from GridFS:', error);
    }
    
    // Also try to delete from file system (may not exist)
    try {
      const avatarPath = path.join(avatarsDir, `${username}.png`);
      await fs.unlink(avatarPath);
      deleted = true;
    } catch (e) {
      // File doesn't exist, that's okay
    }

    if (!deleted) {
      return res.status(404).json({ error: 'Avatar not found' });
    }

    // Update user info (remove avatarUpdatedAt field)
    const usersCollection = await getUsersCollection();
    await usersCollection.updateOne(
      { username: username },
      { $unset: { avatarUpdatedAt: '' } }
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting avatar:', error);
    res.status(500).json({ error: 'Failed to delete avatar' });
  }
});

// Routes
app.get('/', (req, res) => {
  const username = getCurrentUser(req);
  if (!username) {
    return res.redirect('/login.html');
  }
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/login.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/gallery.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'gallery.html'));
});

// Interests API: Save interest drawing
app.post('/api/interests/:category', async (req, res) => {
  try {
    const username = getCurrentUser(req);
    if (!username) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const category = req.params.category;
    if (!INTEREST_CATEGORIES.includes(category)) {
      return res.status(400).json({ error: 'Invalid category' });
    }

    const { imageData } = req.body;
    if (!imageData) {
      return res.status(400).json({ error: 'No image data provided' });
    }

    // Validate image data format
    if (!imageData.startsWith('data:image/png;base64,')) {
      return res.status(400).json({ error: 'Invalid image data format' });
    }

    // Save interest image to GridFS
    const base64Data = imageData.replace(/^data:image\/png;base64,/, '');
    
    if (!base64Data || base64Data.length === 0) {
      return res.status(400).json({ error: 'Empty image data' });
    }

    const imageBuffer = Buffer.from(base64Data, 'base64');
    
    // Upload to GridFS (also save to file system as backup)
    try {
      await uploadInterest(username, category, imageBuffer);
      console.log(`Interest saved to GridFS for user: ${username}, category: ${category}`);
    } catch (error) {
      console.error('Error saving interest to GridFS:', error);
      // Fallback to file system
      await fs.mkdir(interestsDir, { recursive: true });
      const interestPath = path.join(interestsDir, `${username}_${category}.png`);
      await fs.writeFile(interestPath, base64Data, 'base64');
      console.log(`Interest saved to file system as fallback for user: ${username}, category: ${category}`);
    }

    res.json({ success: true, category });
  } catch (error) {
    console.error('Error saving interest:', error);
    res.status(500).json({ error: `Failed to save interest: ${error.message}` });
  }
});

// Interests API: Get all interests for a user
app.get('/api/interests/:username', async (req, res) => {
  try {
    const targetUsername = req.params.username;
    const interests = {};

    // Try GridFS first - get all interests for this user
    try {
      const interestFiles = await listUserInterests(targetUsername);
      for (const file of interestFiles) {
        const category = file.metadata?.category || file.filename.replace(`${targetUsername}_`, '').replace('.png', '');
        if (INTEREST_CATEGORIES.includes(category)) {
          const imageBuffer = await downloadInterest(targetUsername, category);
          if (imageBuffer) {
            const base64Image = imageBuffer.toString('base64');
            interests[category] = `data:image/png;base64,${base64Image}`;
          }
        }
      }
    } catch (error) {
      console.error('Error loading interests from GridFS:', error);
    }

    // Fallback to file system for any missing interests
    try {
      const files = await fs.readdir(interestsDir);
      for (const file of files) {
        if (file.startsWith(`${targetUsername}_`) && file.endsWith('.png')) {
          const category = file.replace(`${targetUsername}_`, '').replace('.png', '');
          if (INTEREST_CATEGORIES.includes(category) && !interests[category]) {
            try {
              const interestPath = path.join(interestsDir, file);
              const imageBuffer = await fs.readFile(interestPath);
              const base64Image = imageBuffer.toString('base64');
              interests[category] = `data:image/png;base64,${base64Image}`;
            } catch (e) {
              // File doesn't exist, skip
            }
          }
        }
      }
    } catch (error) {
      // Directory doesn't exist or can't read, that's okay
    }

    res.json(interests);
  } catch (error) {
    console.error('Error getting interests:', error);
    res.status(500).json({ error: 'Failed to get interests' });
  }
});

// Interests API: Delete interest
app.delete('/api/interests/:category', async (req, res) => {
  try {
    const username = getCurrentUser(req);
    if (!username) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const category = req.params.category;
    
    // Delete from GridFS and file system
    let deleted = false;
    try {
      deleted = await deleteInterest(username, category);
      if (deleted) {
        console.log(`Interest deleted from GridFS for user: ${username}, category: ${category}`);
      }
    } catch (error) {
      console.error('Error deleting interest from GridFS:', error);
    }
    
    // Also try to delete from file system (may not exist)
    try {
      const interestPath = path.join(interestsDir, `${username}_${category}.png`);
      await fs.unlink(interestPath);
      deleted = true;
    } catch (e) {
      // File doesn't exist, that's okay
    }

    if (deleted) {
      res.json({ success: true });
    } else {
      res.status(404).json({ error: 'Interest not found' });
    }
  } catch (error) {
    console.error('Error deleting interest:', error);
    res.status(500).json({ error: 'Failed to delete interest' });
  }
});

// Interests routes
app.get('/interests.html', (req, res) => {
  const username = getCurrentUser(req);
  if (!username) {
    return res.redirect('/login.html');
  }
  res.sendFile(path.join(__dirname, 'public', 'interests.html'));
});

app.get('/view-interests.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'view-interests.html'));
});

app.get('/messages.html', (req, res) => {
  const username = getCurrentUser(req);
  if (!username) {
    return res.redirect('/login.html');
  }
  res.sendFile(path.join(__dirname, 'public', 'messages.html'));
});

// API: Update biography
app.put('/api/biography', async (req, res) => {
  console.log('PUT /api/biography route hit');
  try {
    const username = getCurrentUser(req);
    console.log('Current user:', username);
    if (!username) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { biography } = req.body;
    console.log('Biography received:', biography);
    const user = await findUser(username);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    await updateUser(username, { biography: biography || '' });

    const updatedUser = await findUser(username);
    console.log('Biography saved successfully for user:', username);
    res.json({ success: true, biography: updatedUser.biography });
  } catch (error) {
    console.error('Error updating biography:', error);
    res.status(500).json({ error: 'Failed to update biography' });
  }
});

// API: Add friend (send friend request)
app.post('/api/friends/:username', async (req, res) => {
  try {
    const currentUsername = getCurrentUser(req);
    if (!currentUsername) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const targetUsername = req.params.username;
    if (currentUsername === targetUsername) {
      return res.status(400).json({ error: 'Cannot friend yourself' });
    }

    const targetUser = await findUser(targetUsername);
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    const currentUser = await findUser(currentUsername);
    if (!currentUser) {
      return res.status(404).json({ error: 'Current user not found' });
    }

    // Initialize friends arrays if they don't exist
    if (!currentUser.friends) {
      await updateUser(currentUsername, { friends: [] });
      currentUser.friends = [];
    }
    if (!targetUser.friends) {
      await updateUser(targetUsername, { friends: [] });
      targetUser.friends = [];
    }

    // Initialize pending friend requests if they don't exist
    if (!targetUser.pendingFriendRequests) {
      await updateUser(targetUsername, { pendingFriendRequests: [] });
      targetUser.pendingFriendRequests = [];
    }

    // Check if already friends
    const isAlreadyFriend = currentUser.friends.includes(targetUsername);
    if (isAlreadyFriend) {
      return res.json({ success: true, isFriend: true, message: 'Already friends' });
    }

    // Add to current user's friends list
    if (!currentUser.friends.includes(targetUsername)) {
      const updatedFriends = [...currentUser.friends, targetUsername];
      await updateUser(currentUsername, { friends: updatedFriends });
    }

    // Add friend request notification for target user (if not already there)
    const hasPendingRequest = targetUser.pendingFriendRequests.some(
      req => req.username === currentUsername
    );
    if (!hasPendingRequest) {
      const updatedRequests = [...targetUser.pendingFriendRequests, {
        username: currentUsername,
        timestamp: new Date().toISOString()
      }];
      await updateUser(targetUsername, { pendingFriendRequests: updatedRequests });
    }

    // Check if mutual friendship (both have each other)
    const updatedTargetUser = await findUser(targetUsername);
    const isMutual = updatedTargetUser.friends && updatedTargetUser.friends.includes(currentUsername);

    res.json({ success: true, isFriend: isMutual, isMutual });
  } catch (error) {
    console.error('Error adding friend:', error);
    res.status(500).json({ error: 'Failed to add friend' });
  }
});

// API: Remove friend
app.delete('/api/friends/:username', async (req, res) => {
  try {
    const currentUsername = getCurrentUser(req);
    if (!currentUsername) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const targetUsername = req.params.username;
    const currentUser = await findUser(currentUsername);
    
    if (currentUser && currentUser.friends) {
      const updatedFriends = currentUser.friends.filter(u => u !== targetUsername);
      await updateUser(currentUsername, { friends: updatedFriends });
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Error removing friend:', error);
    res.status(500).json({ error: 'Failed to remove friend' });
  }
});

// API: Delete account (delete all user data)
app.delete('/api/account', async (req, res) => {
  try {
    const username = getCurrentUser(req);
    if (!username) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const user = await findUser(username);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Delete avatar file
    try {
      const avatarPath = path.join(avatarsDir, `${username}.png`);
      await fs.unlink(avatarPath);
    } catch (e) {
      // Avatar might not exist, that's okay
      console.log('Avatar file not found or already deleted');
    }

    // Delete all interest files
    try {
      const interestFiles = await fs.readdir(interestsDir);
      for (const file of interestFiles) {
        if (file.startsWith(`${username}_`)) {
          await fs.unlink(path.join(interestsDir, file));
        }
      }
    } catch (e) {
      console.log('Error deleting interest files:', e);
    }

    // Remove user from all other users' friends lists and pending requests
    const usersCollection = await getUsersCollection();
    await usersCollection.updateMany(
      {},
      {
        $pull: {
          friends: username,
          pendingFriendRequests: { username: username }
        }
      }
    );

    // Delete user from MongoDB
    await usersCollection.deleteOne({ username: username });

    // Delete messages involving this user
    try {
      const messagesFile = path.join(messagesDir, 'messages.json');
      let messages = {};
      try {
        const data = await fs.readFile(messagesFile, 'utf8');
        messages = JSON.parse(data);
      } catch (e) {
        messages = {};
      }

      // Remove all conversations involving this user
      const conversationsToDelete = [];
      for (const [key, msgs] of Object.entries(messages)) {
        const usernames = key.split('_');
        if (usernames.includes(username)) {
          conversationsToDelete.push(key);
        }
      }
      for (const key of conversationsToDelete) {
        delete messages[key];
      }
      await fs.writeFile(messagesFile, JSON.stringify(messages, null, 2));
    } catch (e) {
      console.log('Error deleting messages:', e);
    }

    // Clear session
    const sessionId = req.cookies?.sessionId;
    if (sessionId) {
      delete sessions[sessionId];
    }
    clearSession(res);

    res.json({ success: true, message: 'Account deleted successfully' });
  } catch (error) {
    console.error('Error deleting account:', error);
    res.status(500).json({ error: 'Failed to delete account' });
  }
});

// API: Check friendship status
app.get('/api/friends/:username', async (req, res) => {
  try {
    const currentUsername = getCurrentUser(req);
    if (!currentUsername) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const targetUsername = req.params.username;
    const currentUser = await findUser(currentUsername);
    const targetUser = await findUser(targetUsername);
    
    const currentUserFriends = currentUser?.friends || [];
    const targetUserFriends = targetUser?.friends || [];
    
    const isCurrentUserFriend = currentUserFriends.includes(targetUsername);
    const isTargetUserFriend = targetUserFriends.includes(currentUsername);
    const isMutual = isCurrentUserFriend && isTargetUserFriend;

    res.json({ 
      isFriend: isCurrentUserFriend, 
      isMutual,
      canMessage: isMutual,
      requestSent: isCurrentUserFriend // If current user has added target, request is sent
    });
  } catch (error) {
    console.error('Error checking friendship:', error);
    res.status(500).json({ error: 'Failed to check friendship' });
  }
});

// API: Get user's friends list (public - anyone can view)
app.get('/api/friends/list/:username', async (req, res) => {
  try {
    const targetUsername = req.params.username;
    const targetUser = await findUser(targetUsername);
    
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const friends = targetUser.friends || [];
    
    // Get friend details (username, userId, avatar)
    const friendsList = await Promise.all(friends.map(async (friendUsername) => {
      const friendUser = await findUser(friendUsername);
      if (!friendUser) return null;
      
      // Get avatar
      let avatarData = null;
      try {
        const avatarPath = path.join(avatarsDir, `${friendUsername}.json`);
        const avatarExists = await fs.access(avatarPath).then(() => true).catch(() => false);
        if (avatarExists) {
          const avatarContent = await fs.readFile(avatarPath, 'utf8');
          const avatar = JSON.parse(avatarContent);
          avatarData = avatar.imageData;
        }
      } catch (error) {
        console.error(`Error loading avatar for ${friendUsername}:`, error);
      }
      
      return {
        username: friendUsername,
        userId: friendUser.userId || null,
        avatar: avatarData
      };
    }));
    
    // Filter out null values (users that no longer exist)
    const validFriends = friendsList.filter(friend => friend !== null);
    
    res.json(validFriends);
  } catch (error) {
    console.error('Error getting friends list:', error);
    res.status(500).json({ error: 'Failed to get friends list' });
  }
});

// API: Set interest preview (users can only set their own preview)
app.put('/api/profile/preview-interest', async (req, res) => {
  try {
    const username = getCurrentUser(req);
    if (!username) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { category } = req.body;
    if (category && !INTEREST_CATEGORIES.includes(category)) {
      return res.status(400).json({ error: 'Invalid category' });
    }

    const user = await findUser(username);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // User can only set their own preview interest (already enforced by getCurrentUser)
    await updateUser(username, { previewInterest: category || null });
    const updatedUser = await findUser(username);

    res.json({ success: true, previewInterest: updatedUser.previewInterest });
  } catch (error) {
    console.error('Error setting preview interest:', error);
    res.status(500).json({ error: 'Failed to set preview interest' });
  }
});

// Create messages directory
const messagesDir = path.join(__dirname, 'messages');

// API: Send message
app.post('/api/messages', async (req, res) => {
  try {
    const currentUsername = getCurrentUser(req);
    if (!currentUsername) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { recipient, message } = req.body;
    if (!recipient || !message || !message.trim()) {
      return res.status(400).json({ error: 'Recipient and message are required' });
    }

    // Check if users are mutual friends
    const currentUser = await findUser(currentUsername);
    const recipientUser = await findUser(recipient);
    const currentUserFriends = currentUser?.friends || [];
    const recipientFriends = recipientUser?.friends || [];
    
    const isMutual = currentUserFriends.includes(recipient) && 
                     recipientFriends.includes(currentUsername);
    
    if (!isMutual) {
      return res.status(403).json({ error: 'You can only message mutual friends' });
    }

    // Ensure messages directory exists
    await fs.mkdir(messagesDir, { recursive: true });

    // Load or create messages file
    const messagesFile = path.join(messagesDir, 'messages.json');
    let messages = {};
    try {
      const data = await fs.readFile(messagesFile, 'utf8');
      messages = JSON.parse(data);
    } catch (e) {
      messages = {};
    }

    // Create conversation key (sorted usernames)
    const conversationKey = [currentUsername, recipient].sort().join('_');
    if (!messages[conversationKey]) {
      messages[conversationKey] = [];
    }

    // Add message
    const messageObj = {
      id: uuidv4(),
      sender: currentUsername,
      recipient: recipient,
      message: message.trim(),
      timestamp: new Date().toISOString()
    };

    messages[conversationKey].push(messageObj);
    await fs.writeFile(messagesFile, JSON.stringify(messages, null, 2));

    res.json({ success: true, message: messageObj });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// API: Get messages with a user
app.get('/api/messages/:username', async (req, res) => {
  try {
    const currentUsername = getCurrentUser(req);
    if (!currentUsername) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const targetUsername = req.params.username;
    
    // Check if users are mutual friends
    const currentUser = await findUser(currentUsername);
    const targetUser = await findUser(targetUsername);
    const currentUserFriends = currentUser?.friends || [];
    const recipientFriends = targetUser?.friends || [];
    
    const isMutual = currentUserFriends.includes(targetUsername) && 
                     recipientFriends.includes(currentUsername);
    
    if (!isMutual) {
      return res.status(403).json({ error: 'You can only view messages with mutual friends' });
    }

    // Load messages
    const messagesFile = path.join(messagesDir, 'messages.json');
    let messages = {};
    try {
      const data = await fs.readFile(messagesFile, 'utf8');
      messages = JSON.parse(data);
    } catch (e) {
      return res.json([]);
    }

    // Get conversation
    const conversationKey = [currentUsername, targetUsername].sort().join('_');
    const conversation = messages[conversationKey] || [];

    res.json(conversation);
  } catch (error) {
    console.error('Error getting messages:', error);
    res.status(500).json({ error: 'Failed to get messages' });
  }
});

// API: Get friend request notifications
app.get('/api/notifications/friend-requests', async (req, res) => {
  try {
    const currentUsername = getCurrentUser(req);
    if (!currentUsername) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const user = await findUser(currentUsername);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const pendingRequests = user.pendingFriendRequests || [];
    
    // Get user info and avatar for each request
    const requestsWithInfo = await Promise.all(pendingRequests.map(async (req) => {
      const requester = await findUser(req.username);
      let avatarData = null;
      
      // Try to get avatar
      try {
        const avatarPath = path.join(avatarsDir, `${req.username}.png`);
        const avatarBuffer = await fs.readFile(avatarPath);
        avatarData = `data:image/png;base64,${avatarBuffer.toString('base64')}`;
      } catch (e) {
        // Avatar doesn't exist, that's okay
      }
      
      return {
        username: req.username,
        timestamp: req.timestamp,
        email: requester?.email || null,
        avatar: avatarData
      };
    }));

    res.json(requestsWithInfo);
  } catch (error) {
    console.error('Error getting friend requests:', error);
    res.status(500).json({ error: 'Failed to get friend requests' });
  }
});

// API: Accept friend request (remove from pending and make mutual)
app.post('/api/notifications/friend-requests/:username/accept', async (req, res) => {
  try {
    const currentUsername = getCurrentUser(req);
    if (!currentUsername) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const requesterUsername = req.params.username;
    const currentUser = await findUser(currentUsername);
    const requesterUser = await findUser(requesterUsername);
    
    if (!currentUser || !requesterUser) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Remove from pending requests
    if (currentUser.pendingFriendRequests) {
      const updatedRequests = currentUser.pendingFriendRequests.filter(
        req => req.username !== requesterUsername
      );
      await updateUser(currentUsername, { pendingFriendRequests: updatedRequests });
    }

    // Make it mutual by adding current user to requester's friends list
    const requesterFriends = requesterUser.friends || [];
    if (!requesterFriends.includes(currentUsername)) {
      await updateUser(requesterUsername, { friends: [...requesterFriends, currentUsername] });
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Error accepting friend request:', error);
    res.status(500).json({ error: 'Failed to accept friend request' });
  }
});

// API: Reject friend request (remove from pending)
app.post('/api/notifications/friend-requests/:username/reject', async (req, res) => {
  try {
    const currentUsername = getCurrentUser(req);
    if (!currentUsername) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const requesterUsername = req.params.username;
    const currentUser = await findUser(currentUsername);
    
    if (!currentUser) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Remove from pending requests
    if (currentUser.pendingFriendRequests) {
      const updatedRequests = currentUser.pendingFriendRequests.filter(
        req => req.username !== requesterUsername
      );
      await updateUser(currentUsername, { pendingFriendRequests: updatedRequests });
    }

    // Also remove the requester from current user's friends list (if they added them)
    if (currentUser.friends) {
      const updatedFriends = currentUser.friends.filter(
        friend => friend !== requesterUsername
      );
      await updateUser(currentUsername, { friends: updatedFriends });
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Error rejecting friend request:', error);
    res.status(500).json({ error: 'Failed to reject friend request' });
  }
});

// API: Get all conversations
app.get('/api/conversations', async (req, res) => {
  try {
    const currentUsername = getCurrentUser(req);
    if (!currentUsername) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // Load messages
    const messagesFile = path.join(messagesDir, 'messages.json');
    let messages = {};
    try {
      const data = await fs.readFile(messagesFile, 'utf8');
      messages = JSON.parse(data);
    } catch (e) {
      return res.json([]);
    }

    // Get all conversations involving current user
    const conversations = [];
    for (const [key, msgs] of Object.entries(messages)) {
      const usernames = key.split('_');
      const otherUser = usernames[0] === currentUsername ? usernames[1] : usernames[0];
      
      if (usernames.includes(currentUsername) && msgs.length > 0) {
        const lastMessage = msgs[msgs.length - 1];
        conversations.push({
          username: otherUser,
          lastMessage: lastMessage.message,
          timestamp: lastMessage.timestamp,
          unread: 0 // Could implement unread count later
        });
      }
    }

    // Sort by timestamp (newest first)
    conversations.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    res.json(conversations);
  } catch (error) {
    console.error('Error getting conversations:', error);
    res.status(500).json({ error: 'Failed to get conversations' });
  }
});

// API: Send gift
app.post('/api/gifts', async (req, res) => {
  try {
    const sender = getCurrentUser(req);
    if (!sender) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { recipient, imageData } = req.body;
    if (!recipient || !imageData) {
      return res.status(400).json({ error: 'Recipient and image data required' });
    }

    // Check if users are mutual friends
    const senderUser = await findUser(sender);
    const recipientUser = await findUser(recipient);
    
    if (!senderUser || !recipientUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    const senderFriends = senderUser.friends || [];
    const recipientFriends = recipientUser.friends || [];
    
    if (!senderFriends.includes(recipient) || !recipientFriends.includes(sender)) {
      return res.status(403).json({ error: 'You can only send gifts to mutual friends' });
    }

    // Save gift image to GridFS
    const giftId = uuidv4();
    const base64Data = imageData.replace(/^data:image\/png;base64,/, '');
    const imageBuffer = Buffer.from(base64Data, 'base64');
    
    // Upload to GridFS (also save to file system as backup)
    try {
      await uploadGift(giftId, imageBuffer);
      console.log(`Gift saved to GridFS: ${giftId}`);
    } catch (error) {
      console.error('Error saving gift to GridFS:', error);
      // Fallback to file system
      const giftPath = path.join(giftsDir, `${giftId}.png`);
      await fs.writeFile(giftPath, base64Data, 'base64');
      console.log(`Gift saved to file system as fallback: ${giftId}`);
    }

    // Save gift record to MongoDB
    const gift = {
      id: giftId,
      sender,
      recipient,
      imagePath: `gridfs:${giftId}.png`, // Store reference to GridFS
      status: 'pending', // pending, accepted, declined
      displayed: false,
      createdAt: new Date().toISOString()
    };
    await saveGift(gift);

    res.json({ success: true, giftId });
  } catch (error) {
    console.error('Error sending gift:', error);
    res.status(500).json({ error: 'Failed to send gift' });
  }
});

// API: Get received gifts
app.get('/api/gifts/received', async (req, res) => {
  try {
    const recipient = getCurrentUser(req);
    if (!recipient) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const gifts = await loadGifts();
    const receivedGifts = gifts.filter(g => g.recipient === recipient && g.status !== 'declined');
    
    // Load gift images from GridFS or file system
    const giftsWithImages = await Promise.all(receivedGifts.map(async (gift) => {
      try {
        let imageBuffer = null;
        const giftId = gift.id;
        
        // Try GridFS first
        try {
          imageBuffer = await downloadGift(giftId);
        } catch (error) {
          // GridFS failed, try file system
        }
        
        // Fallback to file system
        if (!imageBuffer && gift.imagePath && !gift.imagePath.startsWith('gridfs:')) {
          try {
            imageBuffer = await fs.readFile(gift.imagePath);
          } catch (e) {
            // File doesn't exist
          }
        }
        
        if (imageBuffer) {
          const base64Image = imageBuffer.toString('base64');
          return {
            ...gift,
            imageData: `data:image/png;base64,${base64Image}`
          };
        } else {
          return { ...gift, imageData: null };
        }
      } catch (e) {
        return { ...gift, imageData: null };
      }
    }));

    // Sort by creation date (newest first)
    giftsWithImages.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json(giftsWithImages);
  } catch (error) {
    console.error('Error getting received gifts:', error);
    res.status(500).json({ error: 'Failed to get gifts' });
  }
});

// API: Accept gift
app.post('/api/gifts/:id/accept', async (req, res) => {
  try {
    const recipient = getCurrentUser(req);
    if (!recipient) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const giftId = req.params.id;
    const gift = await findGiftById(giftId);

    if (!gift) {
      return res.status(404).json({ error: 'Gift not found' });
    }

    if (gift.recipient !== recipient) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    await updateGift(giftId, { status: 'accepted' });

    res.json({ success: true });
  } catch (error) {
    console.error('Error accepting gift:', error);
    res.status(500).json({ error: 'Failed to accept gift' });
  }
});

// API: Decline gift
app.post('/api/gifts/:id/decline', async (req, res) => {
  try {
    const recipient = getCurrentUser(req);
    if (!recipient) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const giftId = req.params.id;
    const gift = await findGiftById(giftId);

    if (!gift) {
      return res.status(404).json({ error: 'Gift not found' });
    }

    if (gift.recipient !== recipient) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    await updateGift(giftId, { status: 'declined' });

    res.json({ success: true });
  } catch (error) {
    console.error('Error declining gift:', error);
    res.status(500).json({ error: 'Failed to decline gift' });
  }
});

// API: Delete gift (by sender)
app.delete('/api/gifts/:id', async (req, res) => {
  try {
    const sender = getCurrentUser(req);
    if (!sender) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const giftId = req.params.id;
    const gift = await findGiftById(giftId);

    if (!gift) {
      return res.status(404).json({ error: 'Gift not found' });
    }

    if (gift.sender !== sender) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Delete gift image from GridFS and file system
    try {
      await deleteGift(giftId);
      console.log(`Gift deleted from GridFS: ${giftId}`);
    } catch (error) {
      console.error('Error deleting gift from GridFS:', error);
    }
    
    // Also try to delete from file system (may not exist)
    if (gift.imagePath && !gift.imagePath.startsWith('gridfs:')) {
      try {
        await fs.unlink(gift.imagePath);
      } catch (e) {
        // File doesn't exist, that's okay
      }
    }

    // Delete from MongoDB
    const giftsCollection = await getGiftsCollection();
    const { ObjectId } = require('mongodb');
    try {
      await giftsCollection.deleteOne({ _id: new ObjectId(giftId) });
    } catch (e) {
      // Try deleting by id field instead
      await giftsCollection.deleteOne({ id: giftId });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting gift:', error);
    res.status(500).json({ error: 'Failed to delete gift' });
  }
});

// API: Toggle gift display on profile
app.put('/api/gifts/:id/display', async (req, res) => {
  try {
    const recipient = getCurrentUser(req);
    if (!recipient) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const giftId = req.params.id;
    const { displayed } = req.body;
    const gift = await findGiftById(giftId);

    if (!gift) {
      return res.status(404).json({ error: 'Gift not found' });
    }

    if (gift.recipient !== recipient || gift.status !== 'accepted') {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Check if user already has 3 displayed gifts
    if (displayed) {
      const gifts = await loadGifts();
      const displayedCount = gifts.filter(g => 
        g.recipient === recipient && g.status === 'accepted' && g.displayed
      ).length;
      
      if (displayedCount >= 3 && !gift.displayed) {
        return res.status(400).json({ error: 'Maximum of 3 gifts can be displayed on profile' });
      }
    }

    await updateGift(giftId, { displayed: displayed === true });
    const updatedGift = await findGiftById(giftId);

    res.json({ success: true, displayed: updatedGift.displayed });
  } catch (error) {
    console.error('Error updating gift display:', error);
    res.status(500).json({ error: 'Failed to update gift display' });
  }
});

// API: Get displayed gifts for a user's profile
app.get('/api/gifts/displayed/:username', async (req, res) => {
  try {
    const username = req.params.username;
    const gifts = await loadGifts();
    const displayedGifts = gifts.filter(g => 
      g.recipient === username && g.status === 'accepted' && g.displayed === true
    );

    // Load gift images from GridFS or file system
    const giftsWithImages = await Promise.all(displayedGifts.map(async (gift) => {
      try {
        let imageBuffer = null;
        const giftId = gift.id;
        
        // Try GridFS first
        try {
          imageBuffer = await downloadGift(giftId);
        } catch (error) {
          // GridFS failed, try file system
        }
        
        // Fallback to file system
        if (!imageBuffer && gift.imagePath && !gift.imagePath.startsWith('gridfs:')) {
          try {
            imageBuffer = await fs.readFile(gift.imagePath);
          } catch (e) {
            // File doesn't exist
          }
        }
        
        if (imageBuffer) {
          const base64Image = imageBuffer.toString('base64');
          return {
            id: gift.id,
            sender: gift.sender,
            imageData: `data:image/png;base64,${base64Image}`,
            createdAt: gift.createdAt
          };
        } else {
          return null;
        }
      } catch (e) {
        return null;
      }
    }));

    // Filter out nulls and sort by creation date
    const validGifts = giftsWithImages.filter(g => g !== null);
    validGifts.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

    res.json(validGifts);
  } catch (error) {
    console.error('Error getting displayed gifts:', error);
    res.status(500).json({ error: 'Failed to get displayed gifts' });
  }
});

// API: Get sent gifts (for sender to view/delete)
app.get('/api/gifts/sent', async (req, res) => {
  try {
    const sender = getCurrentUser(req);
    if (!sender) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const gifts = await loadGifts();
    const sentGifts = gifts.filter(g => g.sender === sender);
    
    // Load gift images from GridFS or file system
    const giftsWithImages = await Promise.all(sentGifts.map(async (gift) => {
      try {
        let imageBuffer = null;
        const giftId = gift.id;
        
        // Try GridFS first
        try {
          imageBuffer = await downloadGift(giftId);
        } catch (error) {
          // GridFS failed, try file system
        }
        
        // Fallback to file system
        if (!imageBuffer && gift.imagePath && !gift.imagePath.startsWith('gridfs:')) {
          try {
            imageBuffer = await fs.readFile(gift.imagePath);
          } catch (e) {
            // File doesn't exist
          }
        }
        
        if (imageBuffer) {
          const base64Image = imageBuffer.toString('base64');
          return {
            ...gift,
            imageData: `data:image/png;base64,${base64Image}`
          };
        } else {
          return { ...gift, imageData: null };
        }
      } catch (e) {
        return { ...gift, imageData: null };
      }
    }));

    // Sort by creation date (newest first)
    giftsWithImages.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json(giftsWithImages);
  } catch (error) {
    console.error('Error getting sent gifts:', error);
    res.status(500).json({ error: 'Failed to get sent gifts' });
  }
});

// Serve static files AFTER API routes (important!)
app.use(express.static('public'));

// Start server
async function startServer() {
  try {
    // Connect to MongoDB Atlas
    await connectDB();
    console.log('✅ Connected to MongoDB Atlas!');
    
    await ensureDirectories();
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
      console.log(`Login page: http://localhost:${PORT}/login.html`);
      console.log(`Drawing page: http://localhost:${PORT}/`);
      console.log(`Gallery page: http://localhost:${PORT}/gallery.html`);
    });
  } catch (error) {
    console.error('Error starting server:', error);
    process.exit(1);
  }
}

startServer();
