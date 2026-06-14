const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const GroupMember = sequelize.define('GroupMember', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  groupId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: true // Nullable for guest users
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  joinDate: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  leaveDate: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  isGuest: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  }
}, {
  indexes: [
    {
      fields: ['groupId', 'userId']
    }
  ]
});

module.exports = GroupMember;
