const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const ExchangeRate = sequelize.define('ExchangeRate', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  fromCurrency: {
    type: DataTypes.STRING(3),
    allowNull: false
  },
  toCurrency: {
    type: DataTypes.STRING(3),
    allowNull: false,
    defaultValue: 'INR'
  },
  rate: {
    type: DataTypes.DECIMAL(10, 6),
    allowNull: false
  },
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  }
}, {
  indexes: [
    {
      unique: true,
      fields: ['fromCurrency', 'toCurrency', 'date']
    }
  ]
});

module.exports = ExchangeRate;
