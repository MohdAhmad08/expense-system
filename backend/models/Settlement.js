const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Settlement = sequelize.define('Settlement', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  groupId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  payerId: {
    type: DataTypes.INTEGER,
    allowNull: false // Member who transfers the money
  },
  receiverId: {
    type: DataTypes.INTEGER,
    allowNull: false // Member who receives the money
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
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  }
});

module.exports = Settlement;
