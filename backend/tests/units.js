const { normalizeDate, parseParticipants } = require('../services/csvImportEngine');
const { simplifyDebts } = require('../services/debtSimplification');

let passedTests = 0;
let failedTests = 0;

function assert(condition, message) {
  if (condition) {
    passedTests++;
    console.log(`[PASS] ${message}`);
  } else {
    failedTests++;
    console.error(`[FAIL] ${message}`);
  }
}

// -------------------------------------------------------------
// Test Suite 1: Date Normalization
// -------------------------------------------------------------
function testDateNormalization() {
  console.log('\n--- Running Date Normalization Tests ---');
  
  assert(normalizeDate('2026-06-13') === '2026-06-13', 'Should accept standard YYYY-MM-DD format');
  assert(normalizeDate('13/06/2026') === '2026-06-13', 'Should normalize DD/MM/YYYY format');
  assert(normalizeDate('13-06-2026') === '2026-06-13', 'Should normalize DD-MM-YYYY format');
  assert(normalizeDate('June 13, 2026') === '2026-06-13', 'Should normalize JS word format');
  assert(normalizeDate('invalid-date') === null, 'Should return null for completely invalid dates');
}

// -------------------------------------------------------------
// Test Suite 2: CSV Split Parsing
// -------------------------------------------------------------
function testCsvSplitParsing() {
  console.log('\n--- Running CSV Split Parsing Tests ---');

  // Test EQUAL
  const eq = parseParticipants('Alice, Bob, Charlie', 'EQUAL', 1200);
  assert(eq.error === null, 'EQUAL: Should parse without errors');
  assert(eq.members.length === 3, 'EQUAL: Should parse 3 members');
  assert(eq.members[0].name === 'Alice' && eq.members[0].shareValue === 1, 'EQUAL: Members should default to weight 1');

  // Test PERCENT
  const pctValid = parseParticipants('Alice:40, Bob:60', 'PERCENT', 1000);
  assert(pctValid.error === null, 'PERCENT: Should validate if sum is exactly 100%');
  assert(pctValid.members[0].name === 'Alice' && pctValid.members[0].shareValue === 40, 'PERCENT: Alice percent parsed');

  const pctInvalid = parseParticipants('Alice:40, Bob:50', 'PERCENT', 1000);
  assert(pctInvalid.error !== null && pctInvalid.code === 'PERCENT_SUM_MISMATCH', 'PERCENT: Should fail if sum is 90% (mismatch)');

  // Test EXACT
  const exactValid = parseParticipants('Alice:400, Bob:600', 'EXACT', 1000);
  assert(exactValid.error === null, 'EXACT: Should validate if sum matches total amount (1000)');

  const exactInvalid = parseParticipants('Alice:400, Bob:500', 'EXACT', 1000);
  assert(exactInvalid.error !== null && exactInvalid.code === 'EXACT_SUM_MISMATCH', 'EXACT: Should fail if sum is 900 but amount is 1000');

  // Test WEIGHT
  const weightValid = parseParticipants('Alice:2, Bob:3', 'WEIGHT', 1000);
  assert(weightValid.error === null, 'WEIGHT: Should parse weights without error');
  assert(weightValid.members[0].shareValue === 2 && weightValid.members[1].shareValue === 3, 'WEIGHT: Correct weights parsed');

  const weightInvalid = parseParticipants('Alice:0, Bob:0', 'WEIGHT', 1000);
  assert(weightInvalid.error !== null && weightInvalid.code === 'WEIGHT_SUM_ZERO', 'WEIGHT: Should fail if sum of weights is 0');
}

// -------------------------------------------------------------
// Test Suite 3: Debt Simplification Algorithm
// -------------------------------------------------------------
function testDebtSimplification() {
  console.log('\n--- Running Debt Simplification Tests ---');

  // Case 1: Simple 3-person split
  // Alice: +100 (Creditor)
  // Bob: -50 (Debtor)
  // Charlie: -50 (Debtor)
  const balances1 = [
    { id: 1, name: 'Alice', netBalance: 100.0 },
    { id: 2, name: 'Bob', netBalance: -50.0 },
    { id: 3, name: 'Charlie', netBalance: -50.0 }
  ];
  const txs1 = simplifyDebts(balances1);
  assert(txs1.length === 2, 'Should recommend exactly 2 settlement transfers');
  assert(txs1.some(t => t.fromName === 'Bob' && t.toName === 'Alice' && t.amount === 50), 'Bob should pay Alice 50');
  assert(txs1.some(t => t.fromName === 'Charlie' && t.toName === 'Alice' && t.amount === 50), 'Charlie should pay Alice 50');

  // Case 2: Chain Debt Elimination
  // Alice: -100
  // Bob: +200
  // Charlie: -100
  const balances2 = [
    { id: 1, name: 'Alice', netBalance: -100.0 },
    { id: 2, name: 'Bob', netBalance: 200.0 },
    { id: 3, name: 'Charlie', netBalance: -100.0 }
  ];
  const txs2 = simplifyDebts(balances2);
  assert(txs2.length === 2, 'Should collapse chain from 2 payments');
  assert(txs2.some(t => t.fromName === 'Alice' && t.toName === 'Bob' && t.amount === 100), 'Alice pays Bob 100 directly');
  assert(txs2.some(t => t.fromName === 'Charlie' && t.toName === 'Bob' && t.amount === 100), 'Charlie pays Bob 100 directly');
}

// -------------------------------------------------------------
// Main Runner
// -------------------------------------------------------------
function runAllTests() {
  console.log('====================================================');
  console.log('STARTING CORE UNIT TESTS');
  console.log('====================================================');
  
  testDateNormalization();
  testCsvSplitParsing();
  testDebtSimplification();

  console.log('\n====================================================');
  console.log(`TEST SUMMARY: Passed: ${passedTests} | Failed: ${failedTests}`);
  console.log('====================================================');

  if (failedTests > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runAllTests();
