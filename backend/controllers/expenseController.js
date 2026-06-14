const { Expense, ExpenseParticipant, GroupMember, sequelize } = require('../models');

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

// Get all expenses of a group
const getGroupExpenses = async (req, res, next) => {
  try {
    const { groupId } = req.params;

    // Verify authorized access
    const memberCheck = await GroupMember.findOne({
      where: { groupId, userId: req.user.id }
    });
    if (!memberCheck) {
      res.status(403);
      throw new Error('Not authorized to access group expenses.');
    }

    const expenses = await Expense.findAll({
      where: { groupId },
      include: [
        { model: GroupMember, as: 'Payer', attributes: ['id', 'name'] },
        { 
          model: ExpenseParticipant, 
          as: 'Participants',
          include: [{ model: GroupMember, as: 'Member', attributes: ['id', 'name'] }]
        }
      ],
      order: [['date', 'DESC'], ['id', 'DESC']]
    });

    return res.json(expenses);
  } catch (error) {
    return next(error);
  }
};

// Add a new expense
const addExpense = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const { groupId } = req.params;
    const { description, amount, currency, date, paidById, splitType, participants, notes } = req.body;

    if (!description || !amount || !date || !paidById || !splitType || !participants || participants.length === 0) {
      res.status(400);
      throw new Error('Please enter all required fields.');
    }

    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount === 0) {
      res.status(400);
      throw new Error('Amount must be a non-zero number.');
    }

    const isRefund = numericAmount < 0;
    const absAmount = Math.abs(numericAmount);

    // 1. Verify membership active dates
    const payerValidation = await validateMemberActive(paidById, date);
    if (!payerValidation.valid) {
      res.status(400);
      throw new Error(`Payer date error: ${payerValidation.error}`);
    }

    for (const part of participants) {
      const partValidation = await validateMemberActive(part.memberId, date);
      if (!partValidation.valid) {
        res.status(400);
        throw new Error(`Participant date error: ${partValidation.error}`);
      }
    }

    // 2. Set Exchange Rates
    let rate = 1.0;
    if (currency && currency.toUpperCase() === 'USD') {
      rate = DEFAULT_USD_TO_INR;
    }
    const amountInINR = absAmount * rate;

    // 3. Create expense
    const expense = await Expense.create({
      groupId,
      description,
      amount: absAmount,
      currency: currency || 'INR',
      exchangeRate: rate,
      amountInINR: amountInINR,
      date,
      paidById,
      splitType,
      notes: notes || (isRefund ? 'Created as refund' : '')
    }, { transaction: t });

    // 4. Create splits
    const shareCount = participants.length;
    let runningSumINR = 0;

    for (let i = 0; i < shareCount; i++) {
      const p = participants[i];
      let shareAmountINR = 0;
      let sharePercent = null;
      let shareWeight = null;

      if (splitType === 'EQUAL') {
        shareAmountINR = amountInINR / shareCount;
      } else if (splitType === 'PERCENT') {
        sharePercent = parseFloat(p.shareValue);
        shareAmountINR = (amountInINR * sharePercent) / 100;
      } else if (splitType === 'EXACT') {
        shareAmountINR = parseFloat(p.shareValue) * rate;
      } else if (splitType === 'WEIGHT') {
        shareWeight = parseFloat(p.shareValue);
        const totalWeights = participants.reduce((acc, curr) => acc + parseFloat(curr.shareValue), 0);
        shareAmountINR = (amountInINR * shareWeight) / totalWeights;
      }

      await ExpenseParticipant.create({
        expenseId: expense.id,
        memberId: p.memberId,
        shareAmount: isRefund ? -shareAmountINR : shareAmountINR,
        sharePercentage: sharePercent,
        shareWeight: shareWeight
      }, { transaction: t });
    }

    await t.commit();
    return res.status(201).json(expense);
  } catch (error) {
    await t.rollback();
    return next(error);
  }
};

// Update an existing expense
const updateExpense = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const { id } = req.params;
    const { description, amount, currency, date, paidById, splitType, participants, notes } = req.body;

    const expense = await Expense.findByPk(id);
    if (!expense) {
      res.status(404);
      throw new Error('Expense not found.');
    }

    const numericAmount = parseFloat(amount);
    const isRefund = numericAmount < 0;
    const absAmount = Math.abs(numericAmount);

    // 1. Verify membership active dates
    const payerValidation = await validateMemberActive(paidById, date);
    if (!payerValidation.valid) {
      res.status(400);
      throw new Error(`Payer date error: ${payerValidation.error}`);
    }

    for (const part of participants) {
      const partValidation = await validateMemberActive(part.memberId, date);
      if (!partValidation.valid) {
        res.status(400);
        throw new Error(`Participant date error: ${partValidation.error}`);
      }
    }

    // 2. Set Exchange Rates
    let rate = 1.0;
    if (currency && currency.toUpperCase() === 'USD') {
      rate = DEFAULT_USD_TO_INR;
    }
    const amountInINR = absAmount * rate;

    // 3. Update expense fields
    expense.description = description;
    expense.amount = absAmount;
    expense.currency = currency || 'INR';
    expense.exchangeRate = rate;
    expense.amountInINR = amountInINR;
    expense.date = date;
    expense.paidById = paidById;
    expense.splitType = splitType;
    expense.notes = notes || (isRefund ? 'Updated as refund' : '');

    await expense.save({ transaction: t });

    // 4. Delete old splits
    await ExpenseParticipant.destroy({ where: { expenseId: id }, transaction: t });

    // 5. Create new splits
    const shareCount = participants.length;
    for (let i = 0; i < shareCount; i++) {
      const p = participants[i];
      let shareAmountINR = 0;
      let sharePercent = null;
      let shareWeight = null;

      if (splitType === 'EQUAL') {
        shareAmountINR = amountInINR / shareCount;
      } else if (splitType === 'PERCENT') {
        sharePercent = parseFloat(p.shareValue);
        shareAmountINR = (amountInINR * sharePercent) / 100;
      } else if (splitType === 'EXACT') {
        shareAmountINR = parseFloat(p.shareValue) * rate;
      } else if (splitType === 'WEIGHT') {
        shareWeight = parseFloat(p.shareValue);
        const totalWeights = participants.reduce((acc, curr) => acc + parseFloat(curr.shareValue), 0);
        shareAmountINR = (amountInINR * shareWeight) / totalWeights;
      }

      await ExpenseParticipant.create({
        expenseId: id,
        memberId: p.memberId,
        shareAmount: isRefund ? -shareAmountINR : shareAmountINR,
        sharePercentage: sharePercent,
        shareWeight: shareWeight
      }, { transaction: t });
    }

    await t.commit();
    return res.json(expense);
  } catch (error) {
    await t.rollback();
    return next(error);
  }
};

// Delete an expense
const deleteExpense = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const { id } = req.params;

    const expense = await Expense.findByPk(id);
    if (!expense) {
      res.status(404);
      throw new Error('Expense not found.');
    }

    // Delete participants first, then the expense (cascaded by models, but done explicitly for safety)
    await ExpenseParticipant.destroy({ where: { expenseId: id }, transaction: t });
    await expense.destroy({ transaction: t });

    await t.commit();
    return res.json({ message: 'Expense deleted successfully.' });
  } catch (error) {
    await t.rollback();
    return next(error);
  }
};

module.exports = {
  getGroupExpenses,
  addExpense,
  updateExpense,
  deleteExpense
};
