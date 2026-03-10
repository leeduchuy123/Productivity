# Backend Guide & Architecture

## Introduction
Welcome to the backend of the Productivity App. This document provides a comprehensive guide to understanding the architecture, directory structure, and instructions on how the backend application works. The backend is responsible for handling all business logic, data persistence, file uploads (media), and providing RESTful APIs for the frontend client.

## Technology Stack
- **Node.js**: JavaScript runtime environment.
- **Express.js**: Web framework for building REST APIs.
- **Sequelize**: Object-Relational Mapping (ORM) for PostgreSQL.
- **PostgreSQL**: Relational database for data persistence.
- **Multer**: Middleware for handling `multipart/form-data`, primarily used for uploading background images and audio files.
- **Dotenv**: Module to load environment variables.
- **CORS**: Middleware for handling Cross-Origin Resource Sharing.

---

## Architecture Overview
The backend application follows a standard **Model-View-Controller (MVC)**-inspired architecture (without the "View", as views are handled by the frontend). Additionally, it integrates a **Service Layer** to keep the controllers thin and promote reusability of complex business logic. 

### Data Flow (How It Works)
When a request comes from the client:
1. **Route (`src/routes`)**: The Express router intercepts the request (e.g., `GET /api/habits`) and maps it to the appropriate controller method.
2. **Controller (`src/controllers`)**: Retrieves the necessary parameters from the request, invokes the required service or model operations, and sends the final HTTP response (JSON string) back to the client.
3. **Service (`src/services`)**: Contains reusable, complex business logic (e.g., calculating statistics or handling file operations). It separates business rules from HTTP-specific request/response objects.
4. **Model (`src/models`)**: Sequelize defines the schema and acts as the interface to the PostgreSQL database. It executes database queries based on the controller or service requests.

---

## Directory Structure Breakdown
The backend logic is entirely contained within the `src/` directory.

```text
backend/
├── .env                  # Environment configurations (Port, DB connection string)
├── package.json          # Project metadata and dependencies
├── src/
│   ├── config/           # Database setup and Sequilize connection configuration.
│   ├── controllers/      # Functions handling incoming HTTP requests (Logic handlers).
│   ├── models/           # Sequelize ORM definitions and DB associations.
│   ├── routes/           # API endpoint declarations and controller mapping.
│   ├── services/         # Complex business logic and reusable helpers.
│   └── index.js          # Main entry point and Express application setup.
└── uploads/              # Local storage for uploaded media (backgrounds/sounds).
```

### 1. Models (`src/models`)
Defines the database entities and their relationships.
- `Habit.js`: Represents a daily habit (either Yes/No or measurable).
- `HabitLog.js`: Represents a record of habit completion for a specific date.
- `PomodoroSession.js`: Records finished focus sessions.
- `Setting.js`: User's configuration configurations (timers, auto-start, etc.).
- `Media.js`: Metadata referencing uploaded audio files and background images.
- `index.js`: Centralize the initialization of models and establishes relationships.

### 2. Controllers (`src/controllers`)
Express route handlers that manage inputs and outputs.
- `habitController.js`: Handles creating, updating, toggling, and retrieving habits.
- `pomodoroController.js`: Manages saving Pomodoro sessions.
- `mediaController.js`: Manages media uploads (images and audio).

### 3. Services (`src/services`)
Extracts heavy business functionality for reusability.
- `statsService.js`: Contains complex algorithms for calculating statistics (e.g., total focus time, habit streaks, progress tracking).
- `fileService.js`: Utility for handling media file operations cleanly.

### 4. Routes (`src/routes`)
Registers endpoints and attaches them to corresponding controllers.
- `habits.js` -> `/api/habits`
- `pomodoro.js` -> `/api/pomodoro`
- `media.js` -> `/api/media`
- `settings.js` -> `/api/settings`

### 5. `index.js` (Entry Point)
The entry point initializes the Express server, applies middleware (CORS, JSON body parser), mounts the routes, serves the `uploads/` folder statically, and connects to PostgreSQL using Sequelize.

---

## How to Handle Data
- **Synchronizing DB**: Usually, Sequelize handles table sync upon running depending on the `sync()` usage in `models/index.js` or `index.js`.
- **File Uploads**: Administered by `multer`. Ensure the `/uploads` directory is created and has write access. Files are served statically so the frontend can retrieve them via a URL (e.g., `http://localhost:<PORT>/uploads/<filename>`).


## Running the Backend
1. **Database Setup**: Ensure **PostgreSQL** is installed and the service is currently running on your system.
2. **Environment Configuration**: 
   - Open the `.env` file located in the `backend/` root directory.
   - Update the database credentials (e.g., `DB_USER`, `DB_PASSWORD`, `DB_NAME`) to match your local PostgreSQL setup.
3. **Terminal Operations**:
   - **Navigate to the backend folder**: Open your terminal and change the directory to the backend project folder:
     ```bash
     cd backend
     ```
   - **Install dependencies**: Run the following command to install all necessary Node.js packages:
     ```bash
     npm install
     ```
   - **Start the server**:
     - **Development Mode** (uses `nodemon` for automatic restarts on code changes):
       ```bash
       npm run dev
       ```
     - **Production Mode**:
       ```bash
       npm start
       ```
```