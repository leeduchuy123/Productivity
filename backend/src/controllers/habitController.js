const { Op } = require('sequelize');
const { Habit, HabitLog } = require('../models');

function getLocalISODate(dateObj = new Date()) {
    const yyyy = dateObj.getFullYear();
    const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
    const dd = String(dateObj.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
}

// Create a new habit
exports.createHabit = async (req, res) => {
    try {
        const { name, type, targetValue, targetMode, unit, icon, color } = req.body;
        const habit = await Habit.create({
            name,
            type,
            targetValue: type === 'numeric' ? targetValue : null,
            targetMode: type === 'numeric' ? targetMode : null,
            unit: type === 'numeric' ? unit : null,
            icon: icon || '✅',
            color: color || '#ff6b6b'
        });
        res.status(201).json(habit);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Get all active habits with today's log status
exports.getHabits = async (req, res) => {
    try {
        const { date } = req.query;
        const targetDate = date || getLocalISODate();

        const habits = await Habit.findAll({
            where: { isActive: true },
            include: [{
                model: HabitLog,
                as: 'logs',
                where: { logDate: targetDate },
                required: false
            }],
            order: [['created_at', 'ASC']]
        });

        // Calculate progress for each habit
        const habitsWithProgress = await Promise.all(habits.map(async (habit) => {
            const h = habit.toJSON();
            const todayLog = h.logs && h.logs[0];

            // Calculate weekly progress (last 7 days)
            const weekAgo = new Date();
            weekAgo.setDate(weekAgo.getDate() - 6);
            const weekLogs = await HabitLog.findAll({
                where: {
                    habitId: h.id,
                    logDate: {
                        [Op.between]: [getLocalISODate(weekAgo), targetDate]
                    }
                }
            });

            let progress = 0;
            if (h.type === 'boolean') {
                const completedDays = weekLogs.filter(l => l.completed).length;
                progress = Math.round((completedDays / 7) * 100);
            } else {
                const daysWithTarget = weekLogs.filter(l => {
                    if (h.targetMode === 'at_least') return parseFloat(l.value) >= parseFloat(h.targetValue);
                    if (h.targetMode === 'at_most') return parseFloat(l.value) <= parseFloat(h.targetValue);
                    return false;
                }).length;
                progress = Math.round((daysWithTarget / 7) * 100);
            }

            return {
                ...h,
                todayLog,
                progress
            };
        }));

        res.json(habitsWithProgress);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Get a single habit by ID
exports.getHabitById = async (req, res) => {
    try {
        const habit = await Habit.findByPk(req.params.id, {
            include: [{
                model: HabitLog,
                as: 'logs'
            }],
            order: [[{ model: HabitLog, as: 'logs' }, 'log_date', 'ASC']]
        });

        if (!habit) return res.status(404).json({ error: 'Habit not found' });

        res.json(habit);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Update a habit
exports.updateHabit = async (req, res) => {
    try {
        const habit = await Habit.findByPk(req.params.id);
        if (!habit) return res.status(404).json({ error: 'Habit not found' });

        const { name, type, targetValue, targetMode, unit, icon, color, isActive } = req.body;
        await habit.update({
            name: name ?? habit.name,
            type: type ?? habit.type,
            targetValue: targetValue ?? habit.targetValue,
            targetMode: targetMode ?? habit.targetMode,
            unit: unit ?? habit.unit,
            icon: icon ?? habit.icon,
            color: color ?? habit.color,
            isActive: isActive ?? habit.isActive
        });

        res.json(habit);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Delete a habit
exports.deleteHabit = async (req, res) => {
    try {
        const deleted = await Habit.destroy({ where: { id: req.params.id } });
        if (!deleted) return res.status(404).json({ error: 'Habit not found' });
        res.json({ message: 'Habit deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Log a habit entry for a specific date
exports.logHabit = async (req, res) => {
    try {
        const { habitId } = req.params;
        const { date, completed, value } = req.body;
        const logDate = date || getLocalISODate();

        const [log, created] = await HabitLog.findOrCreate({
            where: { habitId, logDate },
            defaults: { completed, value }
        });

        if (!created) {
            await log.update({ completed, value });
        }

        res.json(log);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Get habit logs for a date range
exports.getHabitLogs = async (req, res) => {
    try {
        const { habitId } = req.params;
        const { startDate, endDate } = req.query;

        const where = { habitId };
        if (startDate && endDate) {
            where.logDate = { [Op.between]: [startDate, endDate] };
        }

        const logs = await HabitLog.findAll({
            where,
            order: [['log_date', 'ASC']]
        });
        res.json(logs);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
