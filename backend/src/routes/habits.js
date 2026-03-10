const express = require('express');
const router = express.Router();
const habitController = require('../controllers/habitController');

router.post('/', habitController.createHabit);
router.get('/', habitController.getHabits);
router.get('/:id', habitController.getHabitById);
router.put('/:id', habitController.updateHabit);
router.delete('/:id', habitController.deleteHabit);
router.post('/:habitId/log', habitController.logHabit);
router.get('/:habitId/logs', habitController.getHabitLogs);

module.exports = router;
