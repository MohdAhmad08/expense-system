const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Expense = sequelize.define('Expense', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  groupId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  description: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  amount: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false
  },
  currency: {
    type: DataTypes.STRING(3),
    allowNull: false,
    defaultValue: 'INR'
  },
  exchangeRate: {
    type: DataTypes.DECIMAL(10, 6),
    allowNull: false,
    defaultValue: 1.0
  },
  amountInINR: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false
  },
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  paidById: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  splitType: {
    type: DataTypes.ENUM('EQUAL', 'PERCENT', 'EXACT', 'WEIGHT'),
    allowNull: false,
    defaultValue: 'EQUAL'
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  }
});

module.exports = Expense;
