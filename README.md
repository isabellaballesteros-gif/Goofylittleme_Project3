# Gingerbread Avatar Drawing Server

A Node.js server where users can draw their avatar within gingerbread man boundaries and view all user avatars.

## Features

- 🎨 Draw your avatar within gingerbread man boundaries
- 💾 Save avatars to the server
- 👀 View gallery of all user avatars
- 🗑️ Delete your own avatar

## Setup

1. Install dependencies:
```bash
npm install
```

2. Start the server:
```bash
npm start
```

3. Open your browser and navigate to:
```
http://localhost:3000
```

## Usage

1. Draw your avatar using the canvas tool
2. Adjust colors and brush size as needed
3. Click "Save Avatar" when finished
4. View all avatars in the gallery
5. Delete your own avatar if needed

## Project Structure

- `server.js` - Express server with API endpoints
- `public/index.html` - Drawing interface
- `public/gallery.html` - Avatar gallery
- `public/drawing.js` - Canvas drawing functionality
- `public/gallery.js` - Gallery display and management
- `public/styles.css` - Styling
- `avatars/` - Directory where avatar images are stored
- `users/` - Directory where user metadata is stored

