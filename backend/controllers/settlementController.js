const { Settlement, GroupMember } = require('../models');

// Static fallback exchange rate
const DEFAULT_USD_TO_INR = 83.0;

// Helper to validate active membership for a date
async function validateMemberActive(memberId, date) {
  const member = await GroupMember.findByPk(memberId);
  if (!member) return { valid: false, error: 'Member not found.' };
  
  if (date < member.joinDate || (member.leaveDate && date > member.leaveDate)) {
    return {
      valid: false,
      error: `Member '${member.name}' is not active on ${date} (joined ${member.joinDate}, left ${member.leaveDate || 'present'}).`
    };
  }
  return { valid: true, member };
}

// Get all settlements for a group
const getGroupSettlements = async (req, res, next) => {
  try {
    const { groupId } = req.params;

    // Verify authorized access
    const memberCheck = await GroupMember.findOne({
      where: { groupId, userId: req.user.id }
    });
    if (!memberCheck) {
      res.status(403);
      throw new Error('Not authorized to access group settlements.');
    }

    const settlements = await Settlement.findAll({
      where: { groupId },
      include: [
        { model: GroupMember, as: 'Payer', attributes: ['id', 'name'] },
        { model: GroupMember, as: 'Receiver', attributes: ['id', 'name'] }
      ],
      order: [['date', 'DESC'], ['id', 'DESC']]
    });

    return res.json(settlements);
  } catch (error) {
    return next(error);
  }
};

// Create a new settlement record
const addSettlement = async (req, res, next) => {
  try {
    const { groupId } = req.params;
    const { payerId, receiverId, amount, currency, date, notes } = req.body;

    if (!payerId || !receiverId || !amount || !date) {
      res.status(400);
      throw new Error('Please enter all required fields.');
    }

    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      res.status(400);
      throw new Error('Amount must be a positive number.');
    }

    if (payerId === receiverId) {
      res.status(400);
      throw new Error('Payer and Receiver cannot be the same member.');
    }

    // Verify membership active dates
    const payerValidation = await validateMemberActive(payerId, date);
    if (!payerValidation.valid) {
      res.status(400);
      throw new Error(`Payer date error: ${payerValidation.error}`);
    }

    const receiverValidation = await validateMemberActive(receiverId, date);
    if (!receiverValidation.valid) {
      res.status(400);
      throw new Error(`Receiver date error: ${receiverValidation.error}`);
    }

    // Set exchange rates
    let rate = 1.0;
    if (currency && currency.toUpperCase() === 'USD') {
      rate = DEFAULT_USD_TO_INR;
    }
    const amountInINR = numericAmount * rate;

    const settlement = await Settlement.create({
      groupId,
      payerId,
      receiverId,
      amount: numericAmount,
      currency: currency || 'INR',
      exchangeRate: rate,
      amountInINR: amountInINR,
      date,
      notes: notes || `Settled debt from ${payerValidation.member.name} to ${receiverValidation.member.name}`
    });

    return res.status(201).json(settlement);
  } catch (error) {
    return next(error);
  }
};

// Delete a settlement record
const deleteSettlement = async (req, res, next) => {
  try {
    const { id } = req.params;

    const settlement = await Settlement.findByPk(id);
    if (!settlement) {
      res.status(404);
      throw new Error('Settlement not found.');
    }

    await settlement.destroy();
    return res.json({ message: 'Settlement deleted successfully.' });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  getGroupSettlements,
  addSettlement,
  deleteSettlement
};
