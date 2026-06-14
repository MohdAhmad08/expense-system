const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const AuditLog = sequelize.define('AuditLog', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: true // Null if system action
  },
  action: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  details: {
    type: DataTypes.TEXT,
    allowNull: true
  }
});

module.exports = AuditLog;
