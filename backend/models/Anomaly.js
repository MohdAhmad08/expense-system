const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Anomaly = sequelize.define('Anomaly', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  importReportId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  rowNumber: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  rawData: {
    type: DataTypes.TEXT,
    allowNull: true // Stores JSON string of the CSV row
  },
  anomalyType: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  severity: {
    type: DataTypes.ENUM('LOW', 'MEDIUM', 'HIGH'),
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('PENDING', 'APPROVED', 'IGNORED', 'RESOLVED'),
    allowNull: false,
    defaultValue: 'PENDING'
  },
  resolvedAction: {
    type: DataTypes.TEXT,
    allowNull: true
  }
});

module.exports = Anomaly;
