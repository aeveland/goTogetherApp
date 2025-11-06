# 🗺️ Google Places API Quick Setup

## Step 1: Get Your API Key (5 minutes)

1. **Go to Google Cloud Console**: https://console.cloud.google.com/
2. **Create/Select Project**: Create new or use existing project
3. **Enable Places API**: 
   - Go to "APIs & Services" → "Library"
   - Search for "Places API" 
   - Click "Enable"
4. **Create API Key**:
   - Go to "APIs & Services" → "Credentials"
   - Click "Create Credentials" → "API Key"
   - Copy your API key

## Step 2: Add API Key to Your App

**Replace the placeholder in `/public/index.html` line 16:**

```html
<!-- BEFORE (line 16) -->
src="https://maps.googleapis.com/maps/api/js?key=YOUR_GOOGLE_PLACES_API_KEY&libraries=places&callback=initGooglePlaces">

<!-- AFTER -->
src="https://maps.googleapis.com/maps/api/js?key=AIzaSyC_YOUR_ACTUAL_API_KEY_HERE&libraries=places&callback=initGooglePlaces">
```

## Step 3: Test Address Lookup

1. **Restart your server**: `npm start`
2. **Open the app**: http://localhost:3000
3. **Create a trip**: Click "Create Trip" button
4. **Type in Location field**: Start typing "Yosemite" or "Yellowstone"
5. **See autocomplete**: You should see location suggestions appear

## ✅ What You'll Get

**Address Autocomplete Features:**
- 🔍 **Real-time suggestions** as you type
- 🏕️ **Camping-focused results** (parks, campgrounds, outdoor areas)
- 📍 **Automatic coordinates** for weather integration
- 🇺🇸 **US & Canada locations** (can be expanded)
- ⚡ **Instant geocoding** (no delays)

**Example Experience:**
```
Type: "Yosem..."
See: 
  📍 Yosemite National Park, CA
  📍 Yosemite Valley, CA  
  📍 Yosemite Village, CA
```

## 🔒 Security (Recommended)

**Restrict your API key:**
1. In Google Cloud Console → Credentials
2. Click your API key
3. Under "Application restrictions" → "HTTP referrers"
4. Add:
   - `localhost:3000/*` (development)
   - `yourdomain.com/*` (production)

## 💰 Cost

**Free tier includes:**
- 1,000 requests/day for Places Autocomplete
- More than enough for development and small apps

## 🔧 Fallback Behavior

**Without API key:**
- Location field works as regular text input
- Uses free geocoding service (Nominatim)
- Weather integration still works
- No autocomplete suggestions

**The address lookup will work perfectly once you add your Google Places API key!**
