const { Op, fn, col, literal } = require('sequelize');
const { PomodoroSession } = require('../models');

function getLocalISODate(dateObj = new Date()) {
    const yyyy = dateObj.getFullYear();
    const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
    const dd = String(dateObj.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
}

class StatsService {
    /**
     * Get aggregated Pomodoro stats for a given period
     * @param {'day'|'week'|'month'|'year'} period
     * @param {Date} referenceDate - the reference date for the period
     */
    static async getPomodoroStats(period, referenceDate = new Date()) {
        const { startDate, endDate, groupBy, dateFormat } = this._getPeriodConfig(period, referenceDate);

        const sessions = await PomodoroSession.findAll({
            where: {
                completedAt: {
                    [Op.not]: null,
                    [Op.between]: [startDate, endDate]
                }
            },
            attributes: [
                [fn('DATE', col('completed_at')), 'date'],
                [fn('SUM', col('duration')), 'totalMinutes'],
                [fn('COUNT', col('id')), 'sessionCount']
            ],
            group: [fn('DATE', col('completed_at'))],
            order: [[fn('DATE', col('completed_at')), 'ASC']],
            raw: true
        });

        // Build the full date range with zero-filled gaps
        const dataPoints = this._fillDateGaps(sessions, startDate, endDate);

        // Calculate summary
        const totalMinutes = sessions.reduce((sum, s) => sum + parseInt(s.totalMinutes || 0), 0);
        const totalSessions = sessions.reduce((sum, s) => sum + parseInt(s.sessionCount || 0), 0);

        return {
            period,
            startDate: getLocalISODate(startDate),
            endDate: getLocalISODate(endDate),
            dataPoints,
            summary: {
                totalMinutes,
                totalSessions,
                averageMinutesPerDay: dataPoints.length > 0 ? Math.round(totalMinutes / dataPoints.length) : 0
            }
        };
    }

    static _getPeriodConfig(period, ref) {
        const d = new Date(ref);
        let startDate, endDate;

        switch (period) {
            case 'day':
                startDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());
                endDate = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
                break;
            case 'week':
                const dayOfWeek = d.getDay();
                const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
                startDate = new Date(d.getFullYear(), d.getMonth(), d.getDate() + mondayOffset);
                endDate = new Date(startDate);
                endDate.setDate(endDate.getDate() + 6);
                endDate.setHours(23, 59, 59, 999);
                break;
            case 'month':
                startDate = new Date(d.getFullYear(), d.getMonth(), 1);
                endDate = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
                break;
            case 'year':
                startDate = new Date(d.getFullYear(), 0, 1);
                endDate = new Date(d.getFullYear(), 11, 31, 23, 59, 59, 999);
                break;
            default:
                throw new Error(`Invalid period: ${period}`);
        }

        return { startDate, endDate };
    }

    static _fillDateGaps(sessions, startDate, endDate) {
        const sessionMap = {};
        sessions.forEach(s => {
            sessionMap[s.date] = {
                totalMinutes: parseInt(s.totalMinutes || 0),
                sessionCount: parseInt(s.sessionCount || 0)
            };
        });

        const dataPoints = [];
        const current = new Date(startDate);
        while (current <= endDate) {
            const dateStr = getLocalISODate(current);
            dataPoints.push({
                date: dateStr,
                totalMinutes: sessionMap[dateStr]?.totalMinutes || 0,
                sessionCount: sessionMap[dateStr]?.sessionCount || 0
            });
            current.setDate(current.getDate() + 1);
        }

        return dataPoints;
    }
}

module.exports = StatsService;
