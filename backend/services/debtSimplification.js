/**
 * Simplify debts within a group.
 * Pairs debtors and creditors using a greedy approach to minimize transactions.
 * @param {Array} memberBalances - Array of member objects with netBalance and details
 * @returns {Array} List of simplified transactions
 */
function simplifyDebts(memberBalances) {
  // 1. Separate into debtors and creditors
  let debtors = [];
  let creditors = [];

  memberBalances.forEach(member => {
    const bal = member.netBalance;
    if (bal < -0.01) {
      debtors.push({
        id: member.id,
        name: member.name,
        amount: Math.abs(bal)
      });
    } else if (bal > 0.01) {
      creditors.push({
        id: member.id,
        name: member.name,
        amount: bal
      });
    }
  });

  // Sort descending by amount to settle largest items first
  debtors.sort((a, b) => b.amount - a.amount);
  creditors.sort((a, b) => b.amount - a.amount);

  const recommendedSettlements = [];

  // Greedy matching loop
  while (debtors.length > 0 && creditors.length > 0) {
    const debtor = debtors[0];
    const creditor = creditors[0];

    const amountToSettle = Math.min(debtor.amount, creditor.amount);
    const roundedAmount = Math.round(amountToSettle * 100) / 100;

    if (roundedAmount > 0) {
      recommendedSettlements.push({
        fromId: debtor.id,
        fromName: debtor.name,
        toId: creditor.id,
        toName: creditor.name,
        amount: roundedAmount,
        currency: 'INR'
      });
    }

    // Update amounts
    debtor.amount -= amountToSettle;
    creditor.amount -= amountToSettle;

    // Shift settled members
    if (debtor.amount < 0.01) {
      debtors.shift();
    } else {
      // Re-sort debtors just in case of precision differences
      debtors.sort((a, b) => b.amount - a.amount);
    }

    if (creditor.amount < 0.01) {
      creditors.shift();
    } else {
      // Re-sort creditors
      creditors.sort((a, b) => b.amount - a.amount);
    }
  }

  return recommendedSettlements;
}

module.exports = {
  simplifyDebts
};
