# MovieHub Backend

A robust REST API backend for a movie rating and review application built with Express.js, MongoDB, and Socket.IO for real-time updates.

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Setup Instructions](#setup-instructions)
- [Environment Variables](#environment-variables)
- [API Endpoints](#api-endpoints)
- [Authentication Flow](#authentication-flow)
- [Socket.IO Integration](#socketio-integration)

## Features

- User authentication with JWT (Access and Refresh tokens)
- Movie listing and details
- Rating/reviewing movies
- Real-time updates via Socket.IO
- MongoDB integration
- Environment validation
- Error handling middleware

## Tech Stack

- **Node.js** - JavaScript runtime
- **Express.js** - Web framework
- **MongoDB** - Database
- **Mongoose** - MongoDB ODM
- **Socket.IO** - Real-time communication
- **JWT** - Authentication and authorization
- **Joi** - Validation
- **bcryptjs** - Password hashing

## Setup Instructions

### Prerequisites

- Node.js (v18+ recommended)
- MongoDB database (local or Atlas)
- pnpm package manager

### Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/yourusername/moviehub-backend.git
   cd moviehub-backend
   ```

2. Install dependencies:

   ```bash
   pnpm install
   ```

3. Set up environment variables:
   Create a `.env` file in the root directory with the variables listed in the [Environment Variables](#environment-variables) section.

4. Start the development server:

   ```bash
   pnpm dev
   ```

5. For production:
   ```bash
   pnpm build
   pnpm start
   ```

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# Server
NODE_ENV=development
PORT=4000

# Database
DATABASE_URL=mongodb://localhost:27017/moviehub
# or for MongoDB Atlas
# DATABASE_URL=mongodb+srv://<username>:<password>@cluster0.mongodb.net/moviehub

# JWT
JWT_ACCESS_SECRET=your_access_secret_key_here
JWT_REFRESH_SECRET=your_refresh_secret_key_here
JWT_ACCESS_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=7d

# Frontend
FRONTEND_URL=http://localhost:3000
```

## API Endpoints

### Authentication

| Method | Endpoint              | Description          | Auth Required       |
| ------ | --------------------- | -------------------- | ------------------- |
| POST   | `/auth/register`      | Register a new user  | No                  |
| POST   | `/auth/login`         | Login a user         | No                  |
| POST   | `/auth/refresh-token` | Refresh access token | Yes (refresh token) |
| POST   | `/auth/logout`        | Logout a user        | Yes                 |

### Movies

| Method | Endpoint           | Description        | Auth Required |
| ------ | ------------------ | ------------------ | ------------- |
| GET    | `/movies`          | Get all movies     | No            |
| GET    | `/movies/:id`      | Get movie by ID    | No            |
| POST   | `/movies`          | Create a new movie | Yes           |
| POST   | `/movies/:id/rate` | Rate a movie       | Yes           |

## Authentication Flow

The application uses a JWT-based authentication system with access and refresh tokens:

### Registration

1. User registers with email, password, and name
2. Password is hashed using bcrypt before storing in the database
3. User is created in the database without issuing tokens yet

### Login

1. User provides email and password
2. Server validates credentials
3. If valid, server generates:
   - An **access token** (short-lived, 15 minutes by default)
   - A **refresh token** (longer-lived, 7 days by default)
4. The refresh token is:
   - Stored in the user document in the database
   - Sent to the client as an HTTP-only cookie
5. The access token is sent in the JSON response body

### Accessing Protected Routes

1. The client includes the access token in the Authorization header:
   ```
   Authorization: Bearer <access_token>
   ```
2. The `authMiddleware` validates the token and attaches the user to the request object

### Token Refresh

1. When the access token expires, the client calls `/auth/refresh-token`
2. The server validates the refresh token from the HTTP-only cookie
3. If valid, a new access token is issued
4. The client can continue using protected routes with the new access token

### Logout

1. The client calls `/auth/logout`
2. The server clears the refresh token from:
   - The user document in the database
   - The client's cookies
3. The client should discard the access token

## Socket.IO Integration

The application integrates Socket.IO for real-time updates:

- The Socket.IO server is initialized in `config/socket.js`
- It's accessible in route handlers via `req.io`
- Real-time events can be emitted for movie ratings, comments, etc.

Example of emitting a Socket.IO event from a route handler:

```javascript
// When a movie is rated
router.post("/:id/rate", authMiddleware, (req, res) => {
  // Process the rating...

  // Emit event to all connected clients
  req.io.emit("movieRated", {
    movieId: req.params.id,
    newRating: calculatedRating,
  });

  res.status(200).json({ message: "Rating saved!" });
});
```

---
