const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const ImportReport = sequelize.define('ImportReport', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  groupId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  fileName: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('PENDING', 'PROCESSED', 'FAILED'),
    allowNull: false,
    defaultValue: 'PENDING'
  },
  totalRows: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  importedRows: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  anomaliesCount: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  }
});

module.exports = ImportReport;
