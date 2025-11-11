# 🏕️ GoTogether - Camping Trip Management Platform

**Live Site**: [https://gotogether-m2g9.onrender.com](https://gotogether-m2g9.onrender.com)

A comprehensive camping trip management platform that connects outdoor enthusiasts, enabling them to plan, organize, and share camping adventures with friends and the community.

## 🌟 Key Features

### 🔐 **Authentication & User Management**
- ✅ Secure user registration and login system
- ✅ JWT authentication with HTTP-only cookies
- ✅ Comprehensive user profiles with camping preferences
- ✅ Password hashing with bcrypt (12 rounds)
- ✅ Input validation and sanitization

### 🏕️ **Trip Management**
- ✅ Create public and private camping trips
- ✅ Trip details: location, dates, type, difficulty, participants
- ✅ Trip code system for private trip invitations
- ✅ Trip participant management and organizer controls
- ✅ Trip statistics and analytics dashboard

### 📋 **Task Management System**
- ✅ Shared task lists for trip coordination
- ✅ Task assignment options: Everyone, Anyone, Specific person
- ✅ Task completion tracking with user attribution
- ✅ Due dates and priority levels
- ✅ Real-time task updates and notifications

### 🛒 **Shopping List Coordination**
- ✅ Collaborative shopping lists for trips
- ✅ Item categorization (Food, Gear, Safety, etc.)
- ✅ Quantity tracking and cost estimation
- ✅ Purchase status and assignment tracking
- ✅ Shopping categories with icons and colors

### 🌤️ **Weather Integration**
- ✅ Real-time weather forecasts for trip locations
- ✅ 7-day weather outlook with detailed metrics
- ✅ Camping-specific weather insights
- ✅ Weather alerts and packing suggestions
- ✅ Temperature, humidity, wind, and UV data

### 👤 **User Profiles**
- ✅ Comprehensive camping profiles
- ✅ Bio, camper type, group size preferences
- ✅ Dietary restrictions and contact information
- ✅ Trip statistics and history
- ✅ Profile editing and customization

### 📱 **Mobile-First Design**
- ✅ iOS-native design language and components
- ✅ Touch-optimized interface with proper touch targets
- ✅ iOS-style switches replacing checkboxes
- ✅ Responsive design for all screen sizes
- ✅ Mobile-optimized modals and forms

### 🛠️ **System Health & Diagnostics**
- ✅ Comprehensive database health monitoring
- ✅ Auto-fix system for database schema issues
- ✅ System diagnostics dashboard
- ✅ Migration tools for production deployment

## 🚀 Live Demo

**Website**: [https://gotogether-m2g9.onrender.com](https://gotogether-m2g9.onrender.com)

### Test Account
- **Email**: demo@demo.com
- **Password**: password123

*Or create your own account to explore all features!*

## 🛡️ Security Features

- **HTTP-only cookies** prevent XSS attacks
- **CSRF protection** with SameSite cookies
- **Password hashing** with bcrypt (12 rounds)
- **JWT token validation** for secure authentication
- **Input validation** and sanitization on all endpoints
- **Parameterized queries** prevent SQL injection
- **Environment variable** protection for sensitive data

## 🏗️ Architecture

### Backend Stack
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **PostgreSQL** - Primary database
- **JWT** - Authentication tokens
- **bcrypt** - Password hashing
- **express-validator** - Input validation

### Frontend Stack
- **Vanilla JavaScript** - No framework dependencies
- **iOS Design System** - Native Apple design language
- **Material Design Icons** - Consistent iconography
- **Responsive CSS** - Mobile-first approach
- **Leaflet Maps** - Interactive mapping

### Deployment
- **Render** - Cloud hosting platform
- **GitHub** - Version control and CI/CD
- **Environment Variables** - Secure configuration

## 📊 Database Schema

### Core Tables

#### Users
```sql
- id (SERIAL PRIMARY KEY)
- email (VARCHAR UNIQUE)
- password_hash (VARCHAR)
- first_name (VARCHAR)
- last_name (VARCHAR)
- bio (TEXT)
- camper_type (VARCHAR)
- group_size (INTEGER)
- dietary_restrictions (VARCHAR)
- phone (VARCHAR)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
- is_active (BOOLEAN)
```

#### Camping Trips
```sql
- id (SERIAL PRIMARY KEY)
- title (VARCHAR)
- description (TEXT)
- location (VARCHAR)
- latitude (DECIMAL)
- longitude (DECIMAL)
- start_date (DATE)
- end_date (DATE)
- trip_type (VARCHAR)
- organizer_id (INTEGER REFERENCES users)
- is_public (BOOLEAN)
- trip_code (VARCHAR)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
- is_active (BOOLEAN)
```

#### Trip Tasks
```sql
- id (SERIAL PRIMARY KEY)
- trip_id (INTEGER REFERENCES camping_trips)
- title (VARCHAR)
- description (TEXT)
- assigned_to (VARCHAR)
- due_date (DATE)
- is_completed (BOOLEAN)
- completed_by (INTEGER REFERENCES users)
- created_by (INTEGER REFERENCES users)
- priority (VARCHAR)
- created_at (TIMESTAMP)
```

#### Shopping Items
```sql
- id (SERIAL PRIMARY KEY)
- trip_id (INTEGER REFERENCES camping_trips)
- item_name (VARCHAR)
- category (VARCHAR)
- quantity (INTEGER)
- estimated_cost (DECIMAL)
- assigned_to (VARCHAR)
- is_purchased (BOOLEAN)
- purchased_by (INTEGER REFERENCES users)
- created_by (INTEGER REFERENCES users)
```

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user

### Trips
- `GET /api/trips` - Get all trips
- `POST /api/trips` - Create new trip
- `GET /api/trips/:id` - Get trip details
- `PUT /api/trips/:id` - Update trip
- `DELETE /api/trips/:id` - Delete trip
- `POST /api/trips/:id/join` - Join trip
- `GET /api/trips/my-stats` - User trip statistics

### Tasks
- `GET /api/tasks/trip/:tripId` - Get trip tasks
- `POST /api/tasks/trip/:tripId` - Create task
- `PUT /api/tasks/:taskId` - Update task
- `DELETE /api/tasks/:taskId` - Delete task
- `PATCH /api/tasks/:taskId/complete` - Toggle completion
- `GET /api/tasks/my-tasks` - Get user tasks

### Shopping
- `GET /api/shopping/trip/:tripId` - Get shopping items
- `POST /api/shopping/trip/:tripId` - Create item
- `PUT /api/shopping/:itemId` - Update item
- `DELETE /api/shopping/:itemId` - Delete item
- `PATCH /api/shopping/:itemId/purchase` - Toggle purchase

### Weather
- `GET /api/weather/trip/:tripId/forecast` - Get weather forecast

### System Health
- `GET /api/test-system` - System health dashboard
- `GET /api/weather-test` - Weather diagnostics
- `GET /api/fix-all` - Database repair tools

## 🚀 Setup & Installation

### Prerequisites
- Node.js (v16 or higher)
- PostgreSQL (v12 or higher)
- Git

### Local Development

1. **Clone Repository**
```bash
git clone https://github.com/aeveland/goTogetherApp.git
cd goTogetherApp
```

2. **Install Dependencies**
```bash
npm install
```

3. **Environment Variables**
Create `.env` file:
```env
DATABASE_URL=postgresql://username:password@localhost:5432/gotogether
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
OPENWEATHER_API_KEY=your-openweathermap-api-key
NODE_ENV=development
```

4. **Database Setup**
```bash
# Create database
createdb gotogether

# Run migrations
npm run migrate
```

5. **Start Development Server**
```bash
npm run dev
# or
node app.js
```

Visit `http://localhost:3000`

### Production Deployment (Render)

1. **Push to GitHub**
```bash
git push origin main
```

2. **Configure Render**
- Connect GitHub repository
- Set environment variables
- Deploy automatically

3. **Environment Variables (Render)**
```
DATABASE_URL=<provided-by-render-postgresql>
JWT_SECRET=<generate-secure-secret>
OPENWEATHER_API_KEY=<your-api-key>
NODE_ENV=production
```

## 🧪 System Health & Diagnostics

The application includes comprehensive health monitoring:

- **Database Health**: `/api/test-system` - Complete system diagnostics
- **Weather Status**: `/api/weather-test` - Weather API configuration
- **Auto-Fix Tools**: `/api/fix-all` - Database schema repair

## 🔧 Development Tools

### Database Migrations
- `GET /api/migrate/fix-coordinates` - Add coordinate columns
- `POST /api/migrate/add-profile-fields` - Add user profile fields
- `POST /api/migrate/add-shopping-tables` - Create shopping system

### Debugging
- Comprehensive error logging
- Request validation and sanitization
- Database connection monitoring
- Performance metrics

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **OpenWeatherMap** - Weather data API
- **Material Design** - Icon system
- **Leaflet** - Interactive maps
- **Render** - Hosting platform
- **PostgreSQL** - Database system

---

**Built with ❤️ for the camping community**

*Last Updated: November 7, 2025*
