// MongoDB GridFS Helper Functions for Image Storage
const { MongoClient, ObjectId } = require('mongodb');
const { getDB } = require('./db');

// GridFS bucket names
const AVATARS_BUCKET = 'avatars';
const INTERESTS_BUCKET = 'interests';
const GIFTS_BUCKET = 'gifts';

// Get GridFS bucket
async function getBucket(bucketName) {
  const db = await getDB();
  const { GridFSBucket } = require('mongodb');
  if (!db) {
    throw new Error('Database not connected');
  }
  return new GridFSBucket(db, { bucketName });
}

// Upload image to GridFS
async function uploadImage(bucketName, filename, imageBuffer, metadata = {}) {
  try {
    const bucket = await getBucket(bucketName);
    const uploadStream = bucket.openUploadStream(filename, {
      metadata: metadata
    });

    return new Promise((resolve, reject) => {
      uploadStream.end(imageBuffer);
      uploadStream.on('finish', () => {
        resolve(uploadStream.id);
      });
      uploadStream.on('error', (error) => {
        reject(error);
      });
    });
  } catch (error) {
    console.error(`Error uploading image to ${bucketName}:`, error);
    throw error;
  }
}

// Download image from GridFS
async function downloadImage(bucketName, filename) {
  try {
    const bucket = await getBucket(bucketName);
    const downloadStream = bucket.openDownloadStreamByName(filename);

    return new Promise((resolve, reject) => {
      const chunks = [];
      downloadStream.on('data', (chunk) => {
        chunks.push(chunk);
      });
      downloadStream.on('end', () => {
        resolve(Buffer.concat(chunks));
      });
      downloadStream.on('error', (error) => {
        // If file not found, return null instead of throwing error
        if (error.code === 'ENOENT' || error.codeName === 'FileNotFound') {
          resolve(null);
        } else {
          reject(error);
        }
      });
    });
  } catch (error) {
    console.error(`Error downloading image from ${bucketName}:`, error);
    // Return null if file not found
    if (error.code === 'ENOENT' || error.codeName === 'FileNotFound') {
      return null;
    }
    throw error;
  }
}

// Download image by ID
async function downloadImageById(bucketName, fileId) {
  try {
    const bucket = await getBucket(bucketName);
    const downloadStream = bucket.openDownloadStream(new ObjectId(fileId));

    return new Promise((resolve, reject) => {
      const chunks = [];
      downloadStream.on('data', (chunk) => {
        chunks.push(chunk);
      });
      downloadStream.on('end', () => {
        resolve(Buffer.concat(chunks));
      });
      downloadStream.on('error', (error) => {
        if (error.code === 'ENOENT' || error.codeName === 'FileNotFound') {
          resolve(null);
        } else {
          reject(error);
        }
      });
    });
  } catch (error) {
    console.error(`Error downloading image by ID from ${bucketName}:`, error);
    if (error.code === 'ENOENT' || error.codeName === 'FileNotFound') {
      return null;
    }
    throw error;
  }
}

// Delete image from GridFS
async function deleteImage(bucketName, filename) {
  try {
    const bucket = await getBucket(bucketName);
    const files = await bucket.find({ filename: filename }).toArray();
    
    if (files.length === 0) {
      return false;
    }

    await bucket.delete(files[0]._id);
    return true;
  } catch (error) {
    console.error(`Error deleting image from ${bucketName}:`, error);
    // Don't throw error if file doesn't exist
    if (error.code === 'ENOENT' || error.codeName === 'FileNotFound') {
      return false;
    }
    throw error;
  }
}

// Delete image by ID
async function deleteImageById(bucketName, fileId) {
  try {
    const bucket = await getBucket(bucketName);
    await bucket.delete(new ObjectId(fileId));
    return true;
  } catch (error) {
    console.error(`Error deleting image by ID from ${bucketName}:`, error);
    if (error.code === 'ENOENT' || error.codeName === 'FileNotFound') {
      return false;
    }
    throw error;
  }
}

// Check if image exists in GridFS
async function imageExists(bucketName, filename) {
  try {
    const bucket = await getBucket(bucketName);
    const files = await bucket.find({ filename: filename }).toArray();
    return files.length > 0;
  } catch (error) {
    console.error(`Error checking image existence in ${bucketName}:`, error);
    return false;
  }
}

// List all images in a bucket
async function listImages(bucketName, filter = {}) {
  try {
    const bucket = await getBucket(bucketName);
    return await bucket.find(filter).toArray();
  } catch (error) {
    console.error(`Error listing images in ${bucketName}:`, error);
    return [];
  }
}

// List all avatars
async function listAllAvatars() {
  try {
    const bucket = await getBucket(AVATARS_BUCKET);
    return await bucket.find({}).toArray();
  } catch (error) {
    console.error('Error listing avatars:', error);
    return [];
  }
}

// Avatar-specific functions
async function uploadAvatar(username, imageBuffer) {
  return await uploadImage(AVATARS_BUCKET, `${username}.png`, imageBuffer, { username });
}

async function downloadAvatar(username) {
  return await downloadImage(AVATARS_BUCKET, `${username}.png`);
}

async function deleteAvatar(username) {
  return await deleteImage(AVATARS_BUCKET, `${username}.png`);
}

async function avatarExists(username) {
  return await imageExists(AVATARS_BUCKET, `${username}.png`);
}

// Interest-specific functions
async function uploadInterest(username, category, imageBuffer) {
  const filename = `${username}_${category}.png`;
  return await uploadImage(INTERESTS_BUCKET, filename, imageBuffer, { username, category });
}

async function downloadInterest(username, category) {
  const filename = `${username}_${category}.png`;
  return await downloadImage(INTERESTS_BUCKET, filename);
}

async function deleteInterest(username, category) {
  const filename = `${username}_${category}.png`;
  return await deleteImage(INTERESTS_BUCKET, filename);
}

async function listUserInterests(username) {
  return await listImages(INTERESTS_BUCKET, { 'metadata.username': username });
}

// Gift-specific functions
async function uploadGift(giftId, imageBuffer) {
  return await uploadImage(GIFTS_BUCKET, `${giftId}.png`, imageBuffer, { giftId });
}

async function downloadGift(giftId) {
  return await downloadImage(GIFTS_BUCKET, `${giftId}.png`);
}

async function deleteGift(giftId) {
  return await deleteImage(GIFTS_BUCKET, `${giftId}.png`);
}

module.exports = {
  // General functions
  uploadImage,
  downloadImage,
  downloadImageById,
  deleteImage,
  deleteImageById,
  imageExists,
  listImages,
  
  // Avatar functions
  uploadAvatar,
  downloadAvatar,
  deleteAvatar,
  avatarExists,
  
  // Interest functions
  uploadInterest,
  downloadInterest,
  deleteInterest,
  listUserInterests,
  
  // Gift functions
  uploadGift,
  downloadGift,
  deleteGift,
  
  // List functions
  listAllAvatars,
  
  // Bucket names (for reference)
  AVATARS_BUCKET,
  INTERESTS_BUCKET,
  GIFTS_BUCKET
};

