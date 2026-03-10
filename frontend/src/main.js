import './styles/main.css';
import './styles/pomodoro.css';
import './styles/habits.css';
import './styles/charts.css';

import { Router } from './utils/router.js';
import { renderPomodoro } from './pages/pomodoro.js';
import { renderHabits } from './pages/habits.js';
import { renderHabitDetail } from './pages/habit_detail.js';
import { renderStats } from './pages/stats.js';

// Initialize SPA router
const router = new Router({
    '/pomodoro': renderPomodoro,
    '/habits': renderHabits,
    '/habit/:id': renderHabitDetail,
    '/stats': renderStats
});
