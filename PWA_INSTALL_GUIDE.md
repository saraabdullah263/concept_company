# PWA Installation Guide

Your app is now a Progressive Web App (PWA) and can be installed on any device!

## Installation Instructions

### On Desktop (Chrome/Edge)
1. Visit your app URL
2. Look for the install icon (⊕) in the address bar
3. Click "Install" when prompted
4. The app will open in its own window

### On Android
1. Open the app in Chrome
2. Tap the menu (⋮) in the top right
3. Select "Add to Home screen" or "Install app"
4. Confirm the installation
5. Find the app icon on your home screen

### On iOS (iPhone/iPad)
1. Open the app in Safari
2. Tap the Share button (□↑)
3. Scroll down and tap "Add to Home Screen"
4. Name the app and tap "Add"
5. Find the app icon on your home screen

## Features
- Works offline after first visit
- Fast loading with cached assets
- Native app-like experience
- Automatic updates when online
- Supabase data caching for better performance

## Testing Locally
```bash
npm run build
npm run preview
```

Then visit http://localhost:4173 and test the PWA features.

## Deployment
The PWA works on both:
- **Localhost**: http://localhost:5173 (dev) or http://localhost:4173 (preview)
- **Netlify**: Your deployed URL

Just build and deploy as normal - the service worker and manifest are automatically generated!
