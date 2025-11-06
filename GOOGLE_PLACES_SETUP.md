# Google Places API Setup Instructions

## Quick Setup (5 minutes)

### 1. Get Google Places API Key
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing project
3. Enable the **Places API** 
4. Go to **Credentials** → **Create Credentials** → **API Key**
5. Copy your API key

### 2. Add API Key to Code
1. Open `/public/index.html`
2. Find this line (around line 11):
   ```html
   <script async defer src="https://maps.googleapis.com/maps/api/js?key=AIzaSyBXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX&libraries=places&callback=initGooglePlaces"></script>
   ```
3. Replace `AIzaSyBXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX` with your actual API key

### 3. Secure Your API Key (Recommended)
1. In Google Cloud Console, click on your API key
2. Under **Application restrictions**, select **HTTP referrers**
3. Add your domains:
   - `localhost:3000/*` (for development)
   - `yourdomain.com/*` (for production)

### 4. Test the Integration
1. Start the server: `npm start`
2. Go to the app and log in
3. Click **Create Trip**
4. Start typing in the **Location** field
5. You should see autocomplete suggestions from Google Places

## Features
- **Autocomplete**: Type to get location suggestions
- **Camping-focused**: Results biased toward outdoor/recreational places
- **Geographic restriction**: Limited to US and Canada
- **Detailed info**: Gets formatted address, coordinates, and place details

## Troubleshooting
- **No autocomplete**: Check browser console for API key errors
- **"API key not configured"**: Ensure `GOOGLE_PLACES_API_KEY` is in your `.env` file
- **Quota exceeded**: Check your Google Cloud Console usage limits
- **Network errors**: Verify API key restrictions allow your domain

## Fallback Behavior
If Google Places API is not configured or fails to load, the location field will work as a regular text input without autocomplete functionality.
