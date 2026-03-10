const { PomodoroSession } = require('../models');
const StatsService = require('../services/statsService');

// Start a new Pomodoro session
exports.startSession = async (req, res) => {
    try {
        const { duration, focusLabel } = req.body;
        const session = await PomodoroSession.create({
            duration,
            focusLabel: focusLabel || null,
            startedAt: new Date()
        });
        res.status(201).json(session);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Complete a Pomodoro session
exports.completeSession = async (req, res) => {
    try {
        const session = await PomodoroSession.findByPk(req.params.id);
        if (!session) return res.status(404).json({ error: 'Session not found' });

        session.completedAt = new Date();
        await session.save();
        res.json(session);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Get all sessions (with optional date filter)
exports.getSessions = async (req, res) => {
    try {
        const { limit = 20, offset = 0 } = req.query;
        const sessions = await PomodoroSession.findAndCountAll({
            order: [['started_at', 'DESC']],
            limit: parseInt(limit),
            offset: parseInt(offset)
        });
        res.json(sessions);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Get Pomodoro statistics
exports.getStats = async (req, res) => {
    try {
        const { period = 'week', date } = req.query;
        const referenceDate = date ? new Date(date) : new Date();
        const stats = await StatsService.getPomodoroStats(period, referenceDate);
        res.json(stats);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Delete a session
exports.deleteSession = async (req, res) => {
    try {
        const deleted = await PomodoroSession.destroy({ where: { id: req.params.id } });
        if (!deleted) return res.status(404).json({ error: 'Session not found' });
        res.json({ message: 'Session deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
