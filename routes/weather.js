const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const pool = require('../database/db');

const router = express.Router();

// OpenWeatherMap API configuration
const WEATHER_API_KEY = process.env.OPENWEATHER_API_KEY || 'demo_key';
const WEATHER_BASE_URL = 'https://api.openweathermap.org/data/2.5';
const WEATHER_ONECALL_URL = 'https://api.openweathermap.org/data/3.0/onecall';

// Get weather forecast for trip location
router.get('/trip/:tripId/forecast', authenticateToken, async (req, res) => {
  try {
    const { tripId } = req.params;
    const userId = req.user.id;

    // Verify user has access to this trip
    const tripAccess = await pool.query(`
      SELECT ct.*, 
             ct.latitude, 
             ct.longitude,
             ct.location,
             ct.start_date,
             ct.end_date
      FROM camping_trips ct
      LEFT JOIN trip_participants tp ON ct.id = tp.trip_id
      WHERE ct.id = $1 AND (ct.organizer_id = $2 OR tp.user_id = $2)
    `, [tripId, userId]);

    if (tripAccess.rows.length === 0) {
      return res.status(403).json({ error: 'Access denied to this trip' });
    }

    const trip = tripAccess.rows[0];
    
    if (!trip.latitude || !trip.longitude) {
      return res.status(400).json({ error: 'Trip location coordinates not available' });
    }

    // Get current weather
    const currentResponse = await fetch(
      `${WEATHER_BASE_URL}/weather?lat=${trip.latitude}&lon=${trip.longitude}&appid=${WEATHER_API_KEY}&units=imperial`
    );

    // Get 5-day forecast (free tier)
    const forecastResponse = await fetch(
      `${WEATHER_BASE_URL}/forecast?lat=${trip.latitude}&lon=${trip.longitude}&appid=${WEATHER_API_KEY}&units=imperial`
    );

    if (!currentResponse.ok || !forecastResponse.ok) {
      const errorMsg = !currentResponse.ok ? 
        `Current weather API failed: ${currentResponse.status}` : 
        `Forecast API failed: ${forecastResponse.status}`;
      throw new Error(errorMsg);
    }

    const currentData = await currentResponse.json();
    const forecastData = await forecastResponse.json();

    // Combine the data into the expected format
    const weatherData = {
      current: {
        temp: currentData.main.temp,
        feels_like: currentData.main.feels_like,
        humidity: currentData.main.humidity,
        weather: currentData.weather
      },
      daily: processForecastToDaily(forecastData.list),
      hourly: forecastData.list.slice(0, 48)
    };

    // Historical data requires paid plan, skip for now
    let historicalData = null;

    // Generate packing suggestions based on forecast
    const packingSuggestions = generatePackingSuggestions(weatherData, trip);

    // Generate weather alerts
    const weatherAlerts = generateWeatherAlerts(weatherData, trip);

    res.json({
      trip: {
        id: trip.id,
        location: trip.location,
        start_date: trip.start_date,
        end_date: trip.end_date
      },
      current: weatherData.current,
      daily: weatherData.daily.slice(0, 8), // 7-day forecast + today
      hourly: weatherData.hourly.slice(0, 48), // 48-hour detailed forecast
      historical: historicalData,
      packing_suggestions: packingSuggestions,
      weather_alerts: weatherAlerts,
      generated_at: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error getting weather forecast:', error);
    res.status(500).json({ error: 'Failed to get weather forecast' });
  }
});

// Process 5-day forecast into daily format
function processForecastToDaily(forecastList) {
  const dailyData = {};
  
  forecastList.forEach(item => {
    const date = new Date(item.dt * 1000).toDateString();
    
    if (!dailyData[date]) {
      dailyData[date] = {
        dt: item.dt,
        temp: { min: item.main.temp, max: item.main.temp },
        weather: item.weather,
        pop: item.pop || 0,
        wind_speed: item.wind?.speed || 0,
        humidity: item.main.humidity
      };
    } else {
      // Update min/max temperatures
      dailyData[date].temp.min = Math.min(dailyData[date].temp.min, item.main.temp);
      dailyData[date].temp.max = Math.max(dailyData[date].temp.max, item.main.temp);
      
      // Use highest precipitation probability
      dailyData[date].pop = Math.max(dailyData[date].pop, item.pop || 0);
      
      // Use highest wind speed
      dailyData[date].wind_speed = Math.max(dailyData[date].wind_speed, item.wind?.speed || 0);
    }
  });
  
  return Object.values(dailyData);
}

// Generate smart packing suggestions based on weather
function generatePackingSuggestions(weatherData, trip) {
  const suggestions = [];
  const daily = weatherData.daily.slice(0, 7);
  
  // Temperature analysis
  const temps = daily.map(day => ({
    high: day.temp.max,
    low: day.temp.min
  }));
  
  const maxTemp = Math.max(...temps.map(t => t.high));
  const minTemp = Math.min(...temps.map(t => t.low));
  const tempRange = maxTemp - minTemp;

  // Temperature-based suggestions
  if (minTemp < 40) {
    suggestions.push({
      category: 'warmth',
      priority: 'high',
      item: 'Cold weather gear',
      reason: `Temperatures dropping to ${Math.round(minTemp)}°F`,
      icon: 'ac_unit'
    });
  }

  if (maxTemp > 85) {
    suggestions.push({
      category: 'cooling',
      priority: 'high', 
      item: 'Sun protection & cooling gear',
      reason: `High temperatures up to ${Math.round(maxTemp)}°F`,
      icon: 'wb_sunny'
    });
  }

  if (tempRange > 30) {
    suggestions.push({
      category: 'layers',
      priority: 'medium',
      item: 'Layered clothing',
      reason: `Temperature swings of ${Math.round(tempRange)}°F`,
      icon: 'layers'
    });
  }

  // Precipitation analysis
  const rainDays = daily.filter(day => 
    day.weather[0].main === 'Rain' || day.pop > 0.3
  ).length;

  if (rainDays > 0) {
    suggestions.push({
      category: 'rain',
      priority: rainDays > 2 ? 'high' : 'medium',
      item: 'Waterproof gear',
      reason: `Rain expected on ${rainDays} day${rainDays > 1 ? 's' : ''}`,
      icon: 'umbrella'
    });
  }

  // Wind analysis
  const windyDays = daily.filter(day => day.wind_speed > 15).length;
  if (windyDays > 0) {
    suggestions.push({
      category: 'wind',
      priority: 'medium',
      item: 'Wind protection',
      reason: `Strong winds expected (${Math.round(Math.max(...daily.map(d => d.wind_speed)))} mph)`,
      icon: 'air'
    });
  }

  // Humidity analysis
  const avgHumidity = daily.reduce((sum, day) => sum + day.humidity, 0) / daily.length;
  if (avgHumidity > 70) {
    suggestions.push({
      category: 'humidity',
      priority: 'low',
      item: 'Moisture-wicking clothes',
      reason: `High humidity (${Math.round(avgHumidity)}% average)`,
      icon: 'water_drop'
    });
  }

  return suggestions;
}

// Generate weather alerts for severe conditions
function generateWeatherAlerts(weatherData, trip) {
  const alerts = [];
  const daily = weatherData.daily.slice(0, 7);

  daily.forEach((day, index) => {
    const date = new Date(day.dt * 1000);
    const dayName = index === 0 ? 'Today' : 
                   index === 1 ? 'Tomorrow' : 
                   date.toLocaleDateString('en-US', { weekday: 'long' });

    // Severe temperature alerts
    if (day.temp.min < 32) {
      alerts.push({
        type: 'freeze',
        severity: 'high',
        day: dayName,
        message: `Freezing temperatures expected (${Math.round(day.temp.min)}°F)`,
        icon: 'ac_unit',
        color: 'blue'
      });
    }

    if (day.temp.max > 95) {
      alerts.push({
        type: 'heat',
        severity: 'high', 
        day: dayName,
        message: `Extreme heat expected (${Math.round(day.temp.max)}°F)`,
        icon: 'wb_sunny',
        color: 'red'
      });
    }

    // Precipitation alerts
    if (day.pop > 0.7) {
      alerts.push({
        type: 'rain',
        severity: 'medium',
        day: dayName,
        message: `Heavy rain likely (${Math.round(day.pop * 100)}% chance)`,
        icon: 'umbrella',
        color: 'blue'
      });
    }

    // Wind alerts
    if (day.wind_speed > 20) {
      alerts.push({
        type: 'wind',
        severity: 'medium',
        day: dayName,
        message: `Strong winds expected (${Math.round(day.wind_speed)} mph)`,
        icon: 'air',
        color: 'orange'
      });
    }

    // Severe weather conditions
    const severeConditions = ['Thunderstorm', 'Snow', 'Fog'];
    if (severeConditions.includes(day.weather[0].main)) {
      alerts.push({
        type: 'severe',
        severity: 'high',
        day: dayName,
        message: `${day.weather[0].main} expected`,
        icon: 'warning',
        color: 'red'
      });
    }
  });

  return alerts;
}

module.exports = router;
