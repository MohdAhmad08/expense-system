const { Group, GroupMember, User, sequelize } = require('../models');
const { calculateGroupBalances } = require('../services/balanceEngine');
const { simplifyDebts } = require('../services/debtSimplification');

// Create a new expense group
const createGroup = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const { name, description } = req.body;

    if (!name) {
      res.status(400);
      throw new Error('Group name is required.');
    }

    const group = await Group.create({ name, description }, { transaction: t });

    // Automatically add the creator as a group member
    await GroupMember.create({
      groupId: group.id,
      userId: req.user.id,
      name: req.user.name,
      joinDate: new Date().toISOString().split('T')[0],
      isGuest: false
    }, { transaction: t });

    await t.commit();
    return res.status(201).json(group);
  } catch (error) {
    await t.rollback();
    return next(error);
  }
};

// Get all groups the logged-in user belongs to
const getGroups = async (req, res, next) => {
  try {
    const memberships = await GroupMember.findAll({
      where: { userId: req.user.id },
      include: [{
        model: Group,
        required: true
      }]
    });

    const groups = memberships.map(m => m.Group);
    return res.json(groups);
  } catch (error) {
    return next(error);
  }
};

// Get detailed group parameters: members, ledger, balances, and debt simplification
const getGroupDetails = async (req, res, next) => {
  try {
    const groupId = req.params.id;

    const group = await Group.findByPk(groupId);
    if (!group) {
      res.status(404);
      throw new Error('Group not found.');
    }

    // Verify requesting user is member
    const memberCheck = await GroupMember.findOne({
      where: { groupId, userId: req.user.id }
    });
    if (!memberCheck) {
      res.status(403);
      throw new Error('Not authorized to view this group.');
    }

    const members = await GroupMember.findAll({ where: { groupId } });

    // Fetch balances and detailed traceability using balanceEngine
    const balanceData = await calculateGroupBalances(groupId);

    // Run debt simplification on net balances
    const simplifiedDebts = simplifyDebts(balanceData.balances);

    return res.json({
      group,
      members,
      balances: balanceData.balances,
      totalExpensesINR: balanceData.totalExpensesINR,
      whoPaysWhom: simplifiedDebts
    });
  } catch (error) {
    return next(error);
  }
};

// Add a member (registered or guest) to the group
const addGroupMember = async (req, res, next) => {
  try {
    const groupId = req.params.id;
    const { name, email, joinDate, leaveDate, isGuest } = req.body;

    if (!name) {
      res.status(400);
      throw new Error('Member name is required.');
    }

    // Verify requesting user is member of this group
    const authorCheck = await GroupMember.findOne({
      where: { groupId, userId: req.user.id }
    });
    if (!authorCheck) {
      res.status(403);
      throw new Error('Not authorized to add members to this group.');
    }

    // Check if name is duplicate in the group
    const nameCheck = await GroupMember.findOne({
      where: { groupId, name }
    });
    if (nameCheck) {
      res.status(400);
      throw new Error(`A member named '${name}' is already in this group.`);
    }

    let linkedUserId = null;
    let finalName = name;
    let finalIsGuest = isGuest === undefined ? true : isGuest;

    // If email is provided, try to find the registered user
    if (email && email.trim() !== '') {
      const user = await User.findOne({ where: { email } });
      if (user) {
        linkedUserId = user.id;
        finalName = user.name;
        finalIsGuest = false;

        // Check if user is already added
        const userCheck = await GroupMember.findOne({
          where: { groupId, userId: linkedUserId }
        });
        if (userCheck) {
          res.status(400);
          throw new Error(`User with email ${email} is already a member of this group.`);
        }
      } else {
        res.status(404);
        throw new Error(`User with email ${email} not found. You can add them as a guest instead.`);
      }
    }

    const member = await GroupMember.create({
      groupId,
      userId: linkedUserId,
      name: finalName,
      joinDate: joinDate || new Date().toISOString().split('T')[0],
      leaveDate: leaveDate || null,
      isGuest: finalIsGuest
    });

    return res.status(201).json(member);
  } catch (error) {
    return next(error);
  }
};

// Update group member details (join/leave dates)
const updateGroupMember = async (req, res, next) => {
  try {
    const { id: groupId, memberId } = req.params;
    const { name, joinDate, leaveDate } = req.body;

    // Verify authorized member edit
    const authorCheck = await GroupMember.findOne({
      where: { groupId, userId: req.user.id }
    });
    if (!authorCheck) {
      res.status(403);
      throw new Error('Not authorized.');
    }

    const member = await GroupMember.findOne({
      where: { id: memberId, groupId }
    });

    if (!member) {
      res.status(404);
      throw new Error('Member not found in this group.');
    }

    if (name) member.name = name;
    if (joinDate) member.joinDate = joinDate;
    if (leaveDate !== undefined) member.leaveDate = leaveDate || null;

    await member.save();
    return res.json(member);
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  createGroup,
  getGroups,
  getGroupDetails,
  addGroupMember,
  updateGroupMember
};
