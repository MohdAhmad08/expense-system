const sequelize = require('../config/db');
const User = require('./User');
const Group = require('./Group');
const GroupMember = require('./GroupMember');
const Expense = require('./Expense');
const ExpenseParticipant = require('./ExpenseParticipant');
const Settlement = require('./Settlement');
const ExchangeRate = require('./ExchangeRate');
const ImportReport = require('./ImportReport');
const Anomaly = require('./Anomaly');
const AuditLog = require('./AuditLog');

// Define Relationships

// User <-> GroupMember
User.hasMany(GroupMember, { foreignKey: 'userId', onDelete: 'SET NULL' });
GroupMember.belongsTo(User, { foreignKey: 'userId' });

// Group <-> GroupMember
Group.hasMany(GroupMember, { foreignKey: 'groupId', onDelete: 'CASCADE' });
GroupMember.belongsTo(Group, { foreignKey: 'groupId' });

// Group <-> Expense
Group.hasMany(Expense, { foreignKey: 'groupId', onDelete: 'CASCADE' });
Expense.belongsTo(Group, { foreignKey: 'groupId' });

// GroupMember <-> Expense (Payer)
GroupMember.hasMany(Expense, { foreignKey: 'paidById', as: 'PaidExpenses', onDelete: 'RESTRICT' });
Expense.belongsTo(GroupMember, { foreignKey: 'paidById', as: 'Payer' });

// Expense <-> ExpenseParticipant
Expense.hasMany(ExpenseParticipant, { foreignKey: 'expenseId', onDelete: 'CASCADE', as: 'Participants' });
ExpenseParticipant.belongsTo(Expense, { foreignKey: 'expenseId' });

// GroupMember <-> ExpenseParticipant
GroupMember.hasMany(ExpenseParticipant, { foreignKey: 'memberId', as: 'ExpenseShares', onDelete: 'CASCADE' });
ExpenseParticipant.belongsTo(GroupMember, { foreignKey: 'memberId', as: 'Member' });

// Group <-> Settlement
Group.hasMany(Settlement, { foreignKey: 'groupId', onDelete: 'CASCADE' });
Settlement.belongsTo(Group, { foreignKey: 'groupId' });

// GroupMember <-> Settlement (Payer / Receiver)
GroupMember.hasMany(Settlement, { foreignKey: 'payerId', as: 'SentSettlements', onDelete: 'RESTRICT' });
Settlement.belongsTo(GroupMember, { foreignKey: 'payerId', as: 'Payer' });

GroupMember.hasMany(Settlement, { foreignKey: 'receiverId', as: 'ReceivedSettlements', onDelete: 'RESTRICT' });
Settlement.belongsTo(GroupMember, { foreignKey: 'receiverId', as: 'Receiver' });

// Group <-> ImportReport
Group.hasMany(ImportReport, { foreignKey: 'groupId', onDelete: 'CASCADE' });
ImportReport.belongsTo(Group, { foreignKey: 'groupId' });

// ImportReport <-> Anomaly
ImportReport.hasMany(Anomaly, { foreignKey: 'importReportId', onDelete: 'CASCADE', as: 'Anomalies' });
Anomaly.belongsTo(ImportReport, { foreignKey: 'importReportId' });

// User <-> AuditLog
User.hasMany(AuditLog, { foreignKey: 'userId', onDelete: 'SET NULL' });
AuditLog.belongsTo(User, { foreignKey: 'userId' });

module.exports = {
  sequelize,
  User,
  Group,
  GroupMember,
  Expense,
  ExpenseParticipant,
  Settlement,
  ExchangeRate,
  ImportReport,
  Anomaly,
  AuditLog
};
