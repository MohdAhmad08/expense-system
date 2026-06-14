const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const ExpenseParticipant = sequelize.define('ExpenseParticipant', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  expenseId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  memberId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  shareAmount: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false // share in INR
  },
  sharePercentage: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true
  },
  shareWeight: {
    type: DataTypes.DECIMAL(10, 4),
    allowNull: true
  }
});

module.exports = ExpenseParticipant;
