const { GroupMember, Expense, ExpenseParticipant, Settlement } = require('../models');

/**
 * Calculate the net balances, expenses summary, and audit trace for all members in a group.
 * @param {number} groupId 
 */
async function calculateGroupBalances(groupId) {
  // 1. Fetch all members
  const members = await GroupMember.findAll({
    where: { groupId }
  });

  // 2. Fetch all expenses with participants
  const expenses = await Expense.findAll({
    where: { groupId },
    include: [{
      model: ExpenseParticipant,
      as: 'Participants'
    }]
  });

  // 3. Fetch all settlements
  const settlements = await Settlement.findAll({
    where: { groupId }
  });

  // Create a mapping of member ID to details
  const memberMap = {};
  members.forEach(m => {
    memberMap[m.id] = {
      id: m.id,
      name: m.name,
      userId: m.userId,
      isGuest: m.isGuest,
      joinDate: m.joinDate,
      leaveDate: m.leaveDate,
      totalExpensesPaid: 0.0,
      totalExpensesOwed: 0.0,
      totalSettlementsPaid: 0.0,
      totalSettlementsReceived: 0.0,
      netBalance: 0.0,
      traceability: []
    };
  });

  // 4. Process Expenses
  expenses.forEach(exp => {
    const amountInINR = parseFloat(exp.amountInINR);
    const date = exp.date;

    // Check if payer is in the group member list
    if (memberMap[exp.paidById]) {
      // Check membership dates for warning log (audit integrity)
      const payer = memberMap[exp.paidById];
      const isPayerActive = date >= payer.joinDate && (!payer.leaveDate || date <= payer.leaveDate);

      memberMap[exp.paidById].totalExpensesPaid += amountInINR;
      memberMap[exp.paidById].traceability.push({
        type: 'EXPENSE_PAID',
        id: exp.id,
        date: exp.date,
        description: exp.description,
        originalAmount: parseFloat(exp.amount),
        originalCurrency: exp.currency,
        amountInINR: amountInINR,
        rate: parseFloat(exp.exchangeRate),
        isActiveOnDate: isPayerActive
      });
    }

    // Process splits
    if (exp.Participants) {
      exp.Participants.forEach(part => {
        if (memberMap[part.memberId]) {
          const shareInINR = parseFloat(part.shareAmount);
          const participant = memberMap[part.memberId];
          const isPartActive = date >= participant.joinDate && (!participant.leaveDate || date <= participant.leaveDate);

          memberMap[part.memberId].totalExpensesOwed += shareInINR;
          memberMap[part.memberId].traceability.push({
            type: 'EXPENSE_OWED',
            id: exp.id,
            date: exp.date,
            description: exp.description,
            originalAmount: shareInINR / parseFloat(exp.exchangeRate), // Estimated back
            originalCurrency: exp.currency,
            amountInINR: shareInINR,
            rate: parseFloat(exp.exchangeRate),
            isActiveOnDate: isPartActive
          });
        }
      });
    }
  });

  // 5. Process Settlements
  settlements.forEach(sett => {
    const amountInINR = parseFloat(sett.amountInINR);

    // Payer of settlement (person paying off debt)
    if (memberMap[sett.payerId]) {
      const receiverName = memberMap[sett.receiverId] ? memberMap[sett.receiverId].name : 'Unknown';
      memberMap[sett.payerId].totalSettlementsPaid += amountInINR;
      memberMap[sett.payerId].traceability.push({
        type: 'SETTLEMENT_PAID',
        id: sett.id,
        date: sett.date,
        description: sett.notes || `Settlement paid to ${receiverName}`,
        originalAmount: parseFloat(sett.amount),
        originalCurrency: sett.currency,
        amountInINR: amountInINR,
        rate: parseFloat(sett.exchangeRate),
        isActiveOnDate: true
      });
    }

    // Receiver of settlement (person receiving the money)
    if (memberMap[sett.receiverId]) {
      const payerName = memberMap[sett.payerId] ? memberMap[sett.payerId].name : 'Unknown';
      memberMap[sett.receiverId].totalSettlementsReceived += amountInINR;
      memberMap[sett.receiverId].traceability.push({
        type: 'SETTLEMENT_RECEIVED',
        id: sett.id,
        date: sett.date,
        description: sett.notes || `Settlement received from ${payerName}`,
        originalAmount: parseFloat(sett.amount),
        originalCurrency: sett.currency,
        amountInINR: amountInINR,
        rate: parseFloat(sett.exchangeRate),
        isActiveOnDate: true
      });
    }
  });

  // 6. Calculate Net Balance and Round Values
  const result = [];
  let totalGroupExpensesINR = 0;

  expenses.forEach(e => {
    totalGroupExpensesINR += parseFloat(e.amountInINR);
  });

  for (const id in memberMap) {
    const mem = memberMap[id];
    mem.totalExpensesPaid = Math.round(mem.totalExpensesPaid * 100) / 100;
    mem.totalExpensesOwed = Math.round(mem.totalExpensesOwed * 100) / 100;
    mem.totalSettlementsPaid = Math.round(mem.totalSettlementsPaid * 100) / 100;
    mem.totalSettlementsReceived = Math.round(mem.totalSettlementsReceived * 100) / 100;

    // Net Balance = (Paid Expenses + Paid Settlements) - (Owed Expenses + Received Settlements)
    const net = (mem.totalExpensesPaid + mem.totalSettlementsPaid) - (mem.totalExpensesOwed + mem.totalSettlementsReceived);
    mem.netBalance = Math.round(net * 100) / 100;

    // Sort traceability by date
    mem.traceability.sort((a, b) => new Date(a.date) - new Date(b.date));

    result.push(mem);
  }

  return {
    groupId,
    totalExpensesINR: Math.round(totalGroupExpensesINR * 100) / 100,
    balances: result
  };
}

module.exports = {
  calculateGroupBalances
};
