const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Media = sequelize.define('Media', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    type: {
        type: DataTypes.ENUM('image', 'sound', 'music'),
        allowNull: false
    },
    filename: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    originalName: {
        type: DataTypes.STRING(255),
        field: 'original_name',
        allowNull: false
    },
    mimeType: {
        type: DataTypes.STRING(100),
        field: 'mime_type',
        allowNull: true
    },
    sizeBytes: {
        type: DataTypes.INTEGER,
        field: 'size_bytes',
        allowNull: true
    }
}, {
    tableName: 'media',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false
});

module.exports = Media;
