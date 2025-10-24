# GoTogether App - Authentication System

A secure login system built with Node.js, Express, PostgreSQL, and vanilla JavaScript.

## Features

- ✅ User registration and login
- ✅ JWT authentication with HTTP-only cookies (no localStorage)
- ✅ Password hashing with bcrypt
- ✅ Input validation and sanitization
- ✅ Modern, responsive UI with Tailwind CSS
- ✅ PostgreSQL database integration
- ✅ Ready for Render deployment

## Security Features

- HTTP-only cookies prevent XSS attacks
- CSRF protection with SameSite cookies
- Password hashing with bcrypt (12 rounds)
- JWT token validation
- Input validation and sanitization
- Secure database queries (parameterized)

## Setup Instructions

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Variables
Update `.env` with your production JWT secret:
```
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
```

### 3. Initialize Database
```bash
node scripts/init-db.js
```

### 4. Run Locally
```bash
npm run dev
```

### 5. Deploy to Render
- Push code to GitHub
- Connect your Render web service to the repository
- Set environment variables in Render dashboard
- Deploy!

## API Endpoints

- `POST /api/auth/register` - Create new user account
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user info (protected)

## Database Schema

### Users Table
- `id` - Primary key
- `email` - Unique email address
- `password_hash` - Hashed password
- `first_name` - User's first name
- `last_name` - User's last name
- `created_at` - Account creation timestamp
- `updated_at` - Last update timestamp
- `is_active` - Account status

## Tech Stack

- **Backend**: Node.js, Express.js
- **Database**: PostgreSQL
- **Authentication**: JWT with HTTP-only cookies
- **Frontend**: Vanilla JavaScript, Tailwind CSS
- **Deployment**: Render
- **Security**: bcrypt, express-validator
