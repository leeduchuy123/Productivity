const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Habit = require('./Habit');

const HabitLog = sequelize.define('HabitLog', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    habitId: {
        type: DataTypes.INTEGER,
        field: 'habit_id',
        allowNull: false,
        references: {
            model: Habit,
            key: 'id'
        }
    },
    logDate: {
        type: DataTypes.DATEONLY,
        field: 'log_date',
        allowNull: false
    },
    completed: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    value: {
        type: DataTypes.DECIMAL,
        allowNull: true
    }
}, {
    tableName: 'habit_logs',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false,
    indexes: [
        {
            unique: true,
            fields: ['habit_id', 'log_date']
        }
    ]
});

// Associations
Habit.hasMany(HabitLog, { foreignKey: 'habit_id', as: 'logs' });
HabitLog.belongsTo(Habit, { foreignKey: 'habit_id', as: 'habit' });

module.exports = HabitLog;
