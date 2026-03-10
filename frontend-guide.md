# Frontend Guide & Architecture

## Introduction
Welcome to the frontend of the Productivity App. This document provides an overview of the architecture, structure, and operational flow of the web client. The frontend provides a simple, dynamic, and minified Vanilla JS interface that interacts with the backend REST APIs to track study goals through a Pomodoro timer and Habit tracker. 

## Technology Stack
- **Vite**: Ultra-fast frontend build tool and development server.
- **Vanilla JavaScript**: Pure JS (ES6 modules) without framework overhead (React, Vue) for lightweight and rapid performance.
- **Vanilla CSS**: Standard CSS for styling elements. Provides distinct styles for different modules keeping the app maintainable.
- **Chart.js**: Graphing library utilized to display habit completeness and pomodoro focus statistics.

---

## Architecture Overview
The frontend strictly adopts a **Single Page Application (SPA)** flow while adhering to a **Modular Architecture**. Using Vite, JavaScript is broken down into native ES modules instead of a monolith file, making the logic much easier to manage.

### Data Flow (How It Works)
1. **Initial Load**: The browser loads the `index.html` file, which includes the `main.js` script and global CSS. 
2. **Routing (Client-Side)**: Interacting with the navigation triggers the `utils/router.js`. Instead of reloading the webpage, the router dynamically swaps the HTML content within a centralized container (often `<main id="app">`) and initializes the newly required script.
3. **API Integration (`api.js`)**: Views/Pages executing actions (like finishing a Pomodoro timer, toggling a habit log) call methods from `utils/api.js`. This module uses the native `fetch` API to reach the Backend server.
4. **Rendering Content (`pages/`)**: Once API data is fetched successfully, specific logic in the pages directory manipulates the DOM elements to showcase data, graphs, or timers immediately.

---

## Directory Structure Breakdown
All the core application logic belongs inside the `src/` directory, while standard web entry lives parallel to `package.json`.

```text
frontend/
├── index.html            # Main HTML wrapper (Shell application)
├── package.json          # Vite and Chart.js dependencies
├── public/               # Static assets (Favicons, direct icons, static images)
└── src/
    ├── main.js           # Entry script, connects router and starts up app logic.
    ├── pages/            # Core logic divided by application context features.
    ├── styles/           # CSS compartmentalized for organization.
    └── utils/            # Shared helper functions (API wrappers, Formatting).
```

### 1. Pages (`src/pages`)
The "Controllers/Views" of the frontend application. These files contain logic specific to an application feature. They manipulate the DOM and orchestrate changes.
- `pomodoro.js`: Manages the timer interval logic, focus/break transitions, media settings, and sending completed sessions to the backend.
- `habits.js`: Renders the habit lists, handles creating new habits, checking off history (Yes/No or numerical inputs), and managing the UI updates.
- `stats.js`: Retrieves data using API wrappers and generates visual representations (diagrams/charts) utilizing Chart.js integration.

### 2. Utils (`src/utils`)
Code that is shared across multiple pages. Keeping logic DRY (Don't Repeat Yourself).
- `api.js`: Holds all asynchronous `fetch()` tasks. It acts as an abstraction layer to communicate with the Node.js backend (`/api/habits`, `/api/pomodoro`, etc.). Centralizes error handling.
- `router.js`: Custom hash-based or history-based routing engine allowing navigation between different features (Pomodoro <-> Habits <-> Stats) instantaneously while unmounting/mounting the respective scripts in `pages/`.
- `formatters.js`: Contains common helper methods to format dates (e.g., `YYYY-MM-DD` standard), format timer strings (`MM:SS`), and other conversion tools.

### 3. Styles (`src/styles`)
Separation of concerns is applied directly to styling as well.
- `main.css`: Global variables, CSS resets, fonts, layouts, and general button styling.
- `pomodoro.css`: Styling specifically allocated to the timer dial, media selection interfaces, and settings.
- `habits.css`: Styling for habit grids, progression indicators, and cards.
- `charts.css`: Specific positioning for canvas components utilized by Stats module.

---

## How It Works in Practice: The Pomodoro Module
1. User clicks "Start" inside the Pomodoro interface. 
2. `pomodoro.js` initializes `setInterval`, reducing the timer state. It constantly updates the text content (`<div class="timer">`).
3. If an audio/media was selected, the `HTMLAudioElement` triggers natively.
4. Upon timer hitting `00:00`, `pomodoro.js` invokes `api.js` (e.g., `api.savePomodoroSession()`). 
5. The API module sends a `POST` request to the backend.

```markdown
## Running the Frontend
1. **Mở Terminal**: Khởi động ứng dụng Terminal (macOS/Linux) hoặc Command Prompt/PowerShell (Windows).
2. **Di chuyển vào thư mục frontend**: Sử dụng lệnh `cd` để trỏ terminal vào đúng thư mục chứa mã nguồn frontend của dự án:
   ```bash
   cd frontend
   ```
3. **Cài đặt dependencies**: Chạy lệnh cài đặt các thư viện cần thiết từ `package.json`:
   ```bash
   npm install
   ```
4. **Khởi chạy Server phát triển**: Chạy lệnh sau để bắt đầu môi trường phát triển với Vite:
   ```bash
   npm run dev
   ```
   Sau khi chạy thành công, terminal sẽ hiển thị địa chỉ Local (thường là `http://localhost:5173`). Hãy mở trình duyệt và truy cập vào địa chỉ này.
5. **Đóng gói dự án (Build)**: Để tạo ra các tệp tin tĩnh đã được tối ưu hóa cho môi trường thực tế, hãy chạy:
   ```bash
   npm run build
   ```
   Các file kết quả sẽ nằm trong thư mục `dist/`.
```

---
