# Weather Integration Setup

## OpenWeatherMap API Key
Your current API key: 13ea58a29928911a6a4a54995eea01dd
Previous key: d664eb292b34c4d52b045b2eb4b27408

## Setup Instructions

1. Create a `.env` file in the project root with:
```
OPENWEATHER_API_KEY=13ea58a29928911a6a4a54995eea01dd
```

2. Restart the server to load the environment variable

3. The weather integration will now work for all trips with location coordinates

## Features Included
- 7-day weather forecast
- Current conditions with "feels like" temperature
- Smart packing suggestions based on weather
- Weather alerts for severe conditions
- Historical weather comparison (last year same dates)
- Refresh button to update forecast

## API Usage
- Free plan: 1,000 calls/day
- Each trip weather load uses 2 API calls (current + historical)
- Refresh button makes additional calls
