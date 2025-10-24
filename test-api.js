const axios = require('axios');

// Test configuration
const BASE_URL = 'http://localhost:3000';
let authToken = '';
let testEmail = '';

async function testAPI() {
  console.log('🧪 Testing GoTogether Camping API\n');

  try {
    // Test 1: Register a test user
    console.log('1. Testing user registration...');
    testEmail = `test${Date.now()}@camping.com`;
    const registerResponse = await axios.post(`${BASE_URL}/api/auth/register`, {
      firstName: 'Test',
      lastName: 'Camper',
      email: testEmail,
      password: 'password123'
    });
    console.log('✅ Registration successful');

    // Test 2: Login with new user
    console.log('\n2. Testing user login...');
    const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
      email: testEmail,
      password: 'password123'
    }, {
      withCredentials: true
    });
    
    // Extract cookie for future requests
    const cookies = loginResponse.headers['set-cookie'];
    authToken = cookies ? cookies[0] : '';
    console.log('✅ Login successful');

    // Test 3: Create a camping trip
    console.log('\n3. Testing trip creation...');
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dayAfterTomorrow = new Date();
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 3);
    
    const tripData = {
      title: 'Yosemite Backpacking Adventure',
      description: 'A 3-day backpacking trip through Yosemite Valley',
      location: 'Yosemite National Park, CA',
      campground: 'Backpacker Campground',
      startDate: tomorrow.toISOString().split('T')[0],
      endDate: dayAfterTomorrow.toISOString().split('T')[0],
      maxParticipants: 6,
      difficultyLevel: 'moderate',
      tripType: 'backpacking'
    };

    const createTripResponse = await axios.post(`${BASE_URL}/api/trips`, tripData, {
      headers: {
        'Cookie': authToken
      },
      withCredentials: true
    });
    
    const tripId = createTripResponse.data.trip.id;
    console.log(`✅ Trip created with ID: ${tripId}`);

    // Test 4: Get all trips
    console.log('\n4. Testing trip listing...');
    const tripsResponse = await axios.get(`${BASE_URL}/api/trips`);
    console.log(`✅ Found ${tripsResponse.data.trips.length} trips`);
    console.log(`   - ${tripsResponse.data.trips[0].title}`);

    // Test 5: Get trip details
    console.log('\n5. Testing trip details...');
    const tripDetailsResponse = await axios.get(`${BASE_URL}/api/trips/${tripId}`);
    const trip = tripDetailsResponse.data.trip;
    console.log(`✅ Trip details: ${trip.title}`);
    console.log(`   - Participants: ${trip.current_participants}/${trip.max_participants}`);
    console.log(`   - Organizer: ${trip.organizer_name}`);

    console.log('\n🎉 All API tests passed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    process.exit(1);
  }
}

testAPI();
