// Data Migration Script
// Run this once to migrate existing JSON data to MongoDB
// Usage: node migrate-to-mongodb.js

const fs = require('fs').promises;
const path = require('path');
const { connectDB, getUsersCollection, getGiftsCollection } = require('./db');

async function migrateData() {
  try {
    console.log('🔄 Starting data migration to MongoDB...');
    
    // Connect to MongoDB
    await connectDB();
    const usersCollection = await getUsersCollection();
    const giftsCollection = await getGiftsCollection();
    
    // Migrate users
    const usersPath = path.join(__dirname, 'users.json');
    try {
      const usersData = await fs.readFile(usersPath, 'utf8');
      const users = JSON.parse(usersData);
      
      if (Object.keys(users).length > 0) {
        console.log(`📦 Migrating ${Object.keys(users).length} users...`);
        
        // Convert to array format
        const usersArray = Object.entries(users).map(([username, userData]) => ({
          username,
          ...userData
        }));
        
        // Insert users (skip duplicates)
        for (const user of usersArray) {
          try {
            await usersCollection.insertOne(user);
            console.log(`✅ Migrated user: ${user.username}`);
          } catch (error) {
            if (error.code === 11000) {
              console.log(`⏭️  User ${user.username} already exists, skipping...`);
            } else {
              throw error;
            }
          }
        }
        
        console.log('✅ Users migration complete!');
      } else {
        console.log('ℹ️  No users to migrate');
      }
    } catch (error) {
      if (error.code === 'ENOENT') {
        console.log('ℹ️  users.json not found, skipping users migration');
      } else {
        throw error;
      }
    }
    
    // Migrate gifts
    const giftsPath = path.join(__dirname, 'gifts.json');
    try {
      const giftsData = await fs.readFile(giftsPath, 'utf8');
      const gifts = JSON.parse(giftsData);
      
      if (Array.isArray(gifts) && gifts.length > 0) {
        console.log(`📦 Migrating ${gifts.length} gifts...`);
        
        // Insert gifts
        for (const gift of gifts) {
          try {
            await giftsCollection.insertOne(gift);
            console.log(`✅ Migrated gift: ${gift._id || gift.id}`);
          } catch (error) {
            console.error(`❌ Error migrating gift:`, error);
          }
        }
        
        console.log('✅ Gifts migration complete!');
      } else {
        console.log('ℹ️  No gifts to migrate');
      }
    } catch (error) {
      if (error.code === 'ENOENT') {
        console.log('ℹ️  gifts.json not found, skipping gifts migration');
      } else {
        throw error;
      }
    }
    
    console.log('🎉 Migration complete!');
    console.log('⚠️  Note: Avatar and interest image files remain in their directories.');
    console.log('⚠️  Messages will be migrated as users send new messages.');
    
  } catch (error) {
    console.error('❌ Migration error:', error);
    process.exit(1);
  }
}

// Run migration
if (require.main === module) {
  migrateData()
    .then(() => {
      console.log('✅ Migration script finished');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Migration failed:', error);
      process.exit(1);
    });
}

module.exports = { migrateData };

