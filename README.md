
# Advanced Task Management System - Backend

This is the backend server for the Advanced Task Management System, built with Node.js, Express, and MongoDB. It provides a robust API for task management, user authentication, real-time updates, and file handling.

## Features

- **Authentication & Authorization**: Secure user registration and login using JWT and bcryptjs.
- **Task Management**: CRUD operations for tasks, including assignment, status updates, and priority handling.
- **Real-time Updates**: `Socket.io` integration for real-time notifications and task updates.
- **File Uploads**: Integration with Cloudinary (via Multer) for attaching files to tasks.
- **Email Notifications**: Automated email notifications using Nodemailer.
- **Rate Limiting**: Protection against abuse using `express-rate-limit`.
- **Scheduled Jobs**: CRON jobs setup with `node-cron` for automated background tasks.
- **Database**: efficient data modeling with Mongoose and MongoDB.
- **CORS Support**: Configured to allow requests from the frontend application.

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB (with Mongoose ODM)
- **Authentication**: JSON Web Tokens (JWT)
- **Real-time**: Socket.io
- **File Storage**: Cloudinary
- **Email Service**: Nodemailer

## Project Structure

```
task-management-site-backend/
├── controllers/    # Request handlers for API endpoints
├── middleware/     # Custom middleware (auth, uploads, etc.)
├── models/         # Mongoose schema definitions
├── routes/         # API route definitions
├── seed/           # Database seeding scripts
├── utils/          # Helper utilities and error handling
├── app.js / server.js # Entry point
└── ...
```

## Installation & Setup

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/Sahil-1827/task-management-system-backend.git
    cd task-management-system-backend
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Environment Configuration:**
    Create a `.env` file in the root directory and configure the following variables:

    ```env
    PORT=5000
    MONGO_URI=your_mongodb_connection_string
    JWT_SECRET=your_jwt_secret_key
    CLIENT_URL=http://localhost:5173 
    
    # Cloudinary Configuration
    CLOUDINARY_CLOUD_NAME=your_cloud_name
    CLOUDINARY_API_KEY=your_api_key
    CLOUDINARY_API_SECRET=your_api_secret
    ```

4.  **Run the Server:**
    
    *   **Development Mode** (with nodemon):
        ```bash
        npm run dev
        ```
    *   **Production Start**:
        ```bash
        npm start
        ```

## API Endpoints

The API is structured around the following main resources:

### Auth
- **Swagger Documentation**: `http://localhost:5000/api-docs`

- `POST /api/auth/register`: Register a new user.
- `POST /api/auth/login`: Login an existing user and receive a JWT.
- `GET /api/auth/me`: Get current authenticated user details.

### Tasks
- `POST /api/tasks`: Create a new task.
- `GET /api/tasks`: Get all tasks (supports filtering by project, status, priority, assignee).
- `GET /api/tasks/stats/priority`: Get task statistics by priority.
- `GET /api/tasks/:id`: Get specific task details.
- `PUT /api/tasks/:id`: Update a task.
- `DELETE /api/tasks/:id`: Delete a task.
- `POST /api/tasks/:id/links`: Add a link/attachment to a task.
- `DELETE /api/tasks/:id/links/:linkId`: Remove a link from a task.

### Teams
- `POST /api/teams`: Create a new team.
- `GET /api/teams`: Get all teams the user belongs to.
- `GET /api/teams/:id`: Get specific team details.
- `PUT /api/teams/:id`: Update team details.
- `DELETE /api/teams/:id`: Delete a team.

### Users
- `GET /api/users`: Get all users (admin or team members).
- `PUT /api/users/profile`: Update current user's profile.
- `POST /api/users`: Create a sub-user (Admin only).
- `PUT /api/users/:id`: Update a sub-user (Admin only).
- `PATCH /api/users/:id/status`: Toggle user active status.

### Comments
- `POST /api/comments`: Add a comment to a task.
- `GET /api/comments/task/:taskId`: Get all comments for a specific task.
- `PUT /api/comments/:id/pin`: Pin/unpin a comment.
- `DELETE /api/comments/:id`: Delete a comment.

### Activity Logs
- `GET /api/activity-logs`: Get activity logs (Admin sees all, Users see relevant logs).

### Dashboard
- `GET /api/dashboard/stats`: Get aggregated dashboard statistics.

## Testing

Run endpoints tests using Jest:
```bash
npm test
```

## TMS app password = aegd tyvw pvqn axwm