const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const PomodoroSession = sequelize.define('PomodoroSession', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    duration: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: 'Duration in minutes'
    },
    focusLabel: {
        type: DataTypes.STRING(100),
        field: 'focus_label',
        allowNull: true
    },
    startedAt: {
        type: DataTypes.DATE,
        field: 'started_at',
        allowNull: false
    },
    completedAt: {
        type: DataTypes.DATE,
        field: 'completed_at',
        allowNull: true
    }
}, {
    tableName: 'pomodoro_sessions',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false
});

module.exports = PomodoroSession;
