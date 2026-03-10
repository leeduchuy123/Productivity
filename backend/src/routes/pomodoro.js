const express = require('express');
const router = express.Router();
const pomodoroController = require('../controllers/pomodoroController');

router.post('/sessions', pomodoroController.startSession);
router.patch('/sessions/:id/complete', pomodoroController.completeSession);
router.get('/sessions', pomodoroController.getSessions);
router.delete('/sessions/:id', pomodoroController.deleteSession);
router.get('/stats', pomodoroController.getStats);

module.exports = router;
