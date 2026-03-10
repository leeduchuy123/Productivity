const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Habit = sequelize.define('Habit', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    name: {
        type: DataTypes.STRING(200),
        allowNull: false
    },
    type: {
        type: DataTypes.ENUM('boolean', 'numeric'),
        allowNull: false
    },
    targetValue: {
        type: DataTypes.DECIMAL,
        field: 'target_value',
        allowNull: true
    },
    targetMode: {
        type: DataTypes.ENUM('at_least', 'at_most'),
        field: 'target_mode',
        allowNull: true
    },
    unit: {
        type: DataTypes.STRING(50),
        allowNull: true
    },
    icon: {
        type: DataTypes.STRING(50),
        allowNull: true,
        defaultValue: '✅'
    },
    color: {
        type: DataTypes.STRING(7),
        allowNull: true,
        defaultValue: '#ff6b6b'
    },
    isActive: {
        type: DataTypes.BOOLEAN,
        field: 'is_active',
        defaultValue: true
    }
}, {
    tableName: 'habits',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false
});

module.exports = Habit;
