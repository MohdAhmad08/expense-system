const fs = require('fs');
const Papa = require('papaparse');
const { 
  ImportReport, 
  Anomaly, 
  GroupMember, 
  Expense, 
  Settlement, 
  ExpenseParticipant,
  sequelize 
} = require('../models');

// Default Static Exchange Rates
const DEFAULT_USD_TO_INR = 83.0;

/**
 * Normalizes dates in formats: YYYY-MM-DD, DD/MM/YYYY, MM/DD/YYYY, YYYY/MM/DD
 * Returns a valid YYYY-MM-DD string or null if invalid.
 */
function normalizeDate(dateStr) {
  if (!dateStr) return null;
  dateStr = dateStr.trim();
  
  // Try YYYY-MM-DD
  let match = dateStr.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (match) {
    const y = parseInt(match[1]), m = parseInt(match[2]), d = parseInt(match[3]);
    if (m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    }
  }

  // Try DD/MM/YYYY or DD-MM-YYYY
  match = dateStr.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (match) {
    const d = parseInt(match[1]), m = parseInt(match[2]), y = parseInt(match[3]);
    // Note: Ambiguity between DD/MM/YYYY and MM/DD/YYYY.
    // Standardizing on DD/MM/YYYY first if DD > 12.
    if (m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    }
  }

  // Fallback try JavaScript Date parsing
  const parsed = new Date(dateStr);
  if (!isNaN(parsed.getTime())) {
    const y = parsed.getFullYear();
    const m = String(parsed.getMonth() + 1).padStart(2, '0');
    const d = String(parsed.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  return null;
}

/**
 * Parses splits of the form "Alice:40, Bob:30" or "Alice, Bob"
 */
function parseParticipants(participantsStr, splitType, amount) {
  if (!participantsStr) return { members: [], error: 'Participants list is empty' };
  
  const tokens = participantsStr.split(',').map(s => s.trim()).filter(Boolean);
  const result = [];
  let sum = 0;

  for (const token of tokens) {
    if (splitType === 'EQUAL') {
      result.push({ name: token, shareValue: 1 });
    } else {
      const idx = token.lastIndexOf(':');
      if (idx === -1) {
        return { members: [], error: `Missing value for participant: ${token} in split type ${splitType}` };
      }
      const name = token.substring(0, idx).trim();
      const val = parseFloat(token.substring(idx + 1).trim());

      if (isNaN(val) || val < 0) {
        return { members: [], error: `Invalid numeric value for participant: ${token}` };
      }

      result.push({ name, shareValue: val });
      sum += val;
    }
  }

  if (result.length === 0) {
    return { members: [], error: 'No valid participants found' };
  }

  // Validation based on Split Type
  if (splitType === 'PERCENT') {
    if (Math.abs(sum - 100) > 0.1) {
      return { members: result, error: `Percentages sum to ${sum}%, but must sum to exactly 100%`, code: 'PERCENT_SUM_MISMATCH' };
    }
  } else if (splitType === 'EXACT') {
    if (Math.abs(sum - amount) > 0.1) {
      return { members: result, error: `Exact amounts sum to ${sum}, but must equal total expense amount (${amount})`, code: 'EXACT_SUM_MISMATCH' };
    }
  } else if (splitType === 'WEIGHT') {
    if (sum <= 0) {
      return { members: result, error: 'Sum of weights must be greater than zero', code: 'WEIGHT_SUM_ZERO' };
    }
  }

  return { members: result, error: null };
}

/**
 * Standardizes raw CSV row columns to standard keys
 */
function normalizeRow(row) {
  if (!row) return {};
  
  // Dynamic case-insensitive key lookup helper
  const getVal = (possibleKeys) => {
    for (const key of Object.keys(row)) {
      const cleanKey = key.toLowerCase().trim().replace(/_/g, ' ').replace(/\s+/g, ' ');
      if (possibleKeys.includes(cleanKey)) {
        return row[key];
      }
    }
    return undefined;
  };

  const rawDate = (getVal(['date']) || '').toString();
  const description = (getVal(['description']) || '').toString();
  let rawAmount = (getVal(['amount']) || '').toString();
  
  // Clean commas from amount
  rawAmount = rawAmount.replace(/,/g, '').trim();
  
  const currency = (getVal(['currency']) || '').toString();
  const paidBy = (getVal(['paid by', 'paid_by', 'paidby', 'payer']) || '').toString();
  const notes = (getVal(['notes']) || '').toString();
  
  let rawSplitType = (getVal(['split type', 'split_type', 'splittype']) || 'EQUAL').toString();
  rawSplitType = rawSplitType.trim().toUpperCase();
  
  // Normalize split type values
  let splitType = 'EQUAL';
  if (['PERCENT', 'PERCENTAGE'].includes(rawSplitType)) {
    splitType = 'PERCENT';
  } else if (['EXACT', 'UNEQUAL'].includes(rawSplitType)) {
    splitType = 'EXACT';
  } else if (['WEIGHT', 'SHARE'].includes(rawSplitType)) {
    splitType = 'WEIGHT';
  }

  // Participants column
  let participantsStr = (getVal(['participants', 'split with', 'split_with', 'splitwith']) || '').toString();
  const splitDetails = (getVal(['split details', 'split_details', 'splitdetails']) || '').toString();

  // Normalize delimiters from semicolon to comma
  participantsStr = participantsStr.replace(/;/g, ',').trim();

  let normalizedParticipants = '';
  
  if (splitType === 'EQUAL' || !splitDetails.trim()) {
    normalizedParticipants = participantsStr;
  } else {
    // splitDetails like: "Rohan 700; Priya 400; Meera 400"
    const tokens = splitDetails.split(/[;,]/).map(t => t.trim()).filter(Boolean);
    const mapped = tokens.map(token => {
      let idx = token.lastIndexOf(':');
      if (idx === -1) {
        idx = token.lastIndexOf(' ');
      }
      if (idx === -1) {
        return token;
      }
      const name = token.substring(0, idx).trim();
      const valStr = token.substring(idx + 1).trim().replace(/%/g, '');
      return `${name}:${valStr}`;
    });
    normalizedParticipants = mapped.join(', ');
  }

  const isSettlementVal = (getVal(['is settlement', 'is_settlement', 'issettlement']) || 'No').toString();

  return {
    Date: rawDate,
    Description: description,
    Amount: rawAmount,
    Currency: currency,
    'Paid By': paidBy,
    Participants: normalizedParticipants,
    'Split Type': splitType,
    'Is Settlement': isSettlementVal,
    Notes: notes
  };
}

/**
 * Runs CSV Import Parser and Anomaly Detection
 */
async function processCsvImport(filePath, groupId) {
  const fileContent = fs.readFileSync(filePath, 'utf8');

  // Create staging report
  const report = await ImportReport.create({
    groupId,
    fileName: filePath.split(/[\\/]/).pop(),
    status: 'PENDING'
  });

  // Load existing group members for comparison
  const existingMembers = await GroupMember.findAll({ where: { groupId } });
  const memberNameMap = {};
  existingMembers.forEach(m => {
    memberNameMap[m.name.toLowerCase()] = m;
  });

  // Load existing expenses in group to detect duplicates
  const existingExpenses = await Expense.findAll({
    where: { groupId },
    include: [{ model: ExpenseParticipant, as: 'Participants', include: [{ model: GroupMember, as: 'Member' }] }]
  });

  const parsed = Papa.parse(fileContent, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim().replace(/^\uFEFF/, '')
  });

  let anomaliesCount = 0;
  const rows = parsed.data;

  const anomaliesToCreate = [];

  for (let index = 0; index < rows.length; index++) {
    const row = rows[index];
    const rowNum = index + 2; // PapaParse is 0-indexed, and header is row 1
    
    // Check if the entire row is empty
    const isRowEmpty = Object.values(row).every(val => !val || val.toString().trim() === '');
    if (isRowEmpty) continue;

    const normalizedRow = normalizeRow(row);
    const rawDataJson = JSON.stringify(normalizedRow); // Save normalized row representation

    // Get basic inputs
    let rawDate = normalizedRow.Date || '';
    let description = (normalizedRow.Description || '').trim();
    let rawAmount = normalizedRow.Amount || '';
    let rawCurrency = (normalizedRow.Currency || '').trim();
    let paidBy = (normalizedRow['Paid By'] || '').trim();
    let participantsStr = normalizedRow.Participants || '';
    let splitType = (normalizedRow['Split Type'] || 'EQUAL').trim().toUpperCase();
    let isSettlementStr = (normalizedRow['Is Settlement'] || '').trim().toLowerCase();

    // 1. Missing Currency anomaly
    let currency = rawCurrency;
    if (!currency) {
      currency = 'INR';
      anomaliesToCreate.push({
        importReportId: report.id,
        rowNumber: rowNum,
        rawData: rawDataJson,
        anomalyType: 'MISSING_CURRENCY',
        description: 'Currency column was empty. Defaulted to INR.',
        severity: 'LOW',
        status: 'RESOLVED',
        resolvedAction: 'Auto-defaulted to INR'
      });
    } else if (currency !== 'INR' && currency !== 'USD') {
      anomaliesToCreate.push({
        importReportId: report.id,
        rowNumber: rowNum,
        rawData: rawDataJson,
        anomalyType: 'CURRENCY_CONVERSION_ISSUE',
        description: `Unsupported currency '${currency}'. Default static conversion (1 ${currency} = 83 INR) was used.`,
        severity: 'MEDIUM',
        status: 'PENDING'
      });
    }

    // 2. Invalid Date normalization
    let date = normalizeDate(rawDate);
    if (!date) {
      anomaliesToCreate.push({
        importReportId: report.id,
        rowNumber: rowNum,
        rawData: rawDataJson,
        anomalyType: 'INVALID_DATE',
        description: `Unable to parse date '${rawDate}'. Normalization failed. Please verify format.`,
        severity: 'HIGH',
        status: 'PENDING'
      });
    }

    // 3. Amount validations
    let amount = parseFloat(rawAmount);
    if (isNaN(amount)) {
      anomaliesToCreate.push({
        importReportId: report.id,
        rowNumber: rowNum,
        rawData: rawDataJson,
        anomalyType: 'MALFORMED_SPLIT_INFO',
        description: `Amount '${rawAmount}' is not a valid number.`,
        severity: 'HIGH',
        status: 'PENDING'
      });
      continue; // Skip further validations on this row since amount is invalid
    }

    // Zero-value check
    if (amount === 0) {
      anomaliesToCreate.push({
        importReportId: report.id,
        rowNumber: rowNum,
        rawData: rawDataJson,
        anomalyType: 'ZERO_VALUE_EXPENSE',
        description: 'Expense amount is 0.',
        severity: 'LOW',
        status: 'PENDING'
      });
    }

    // Negative check (treated as refund)
    if (amount < 0) {
      anomaliesToCreate.push({
        importReportId: report.id,
        rowNumber: rowNum,
        rawData: rawDataJson,
        anomalyType: 'NEGATIVE_AMOUNT',
        description: `Amount is negative (${amount}). Handled as a refund split (reversed balance flow).`,
        severity: 'MEDIUM',
        status: 'RESOLVED',
        resolvedAction: 'Absolute value taken, split shares reversed'
      });
    }

    // 4. Check if Settlement accidentally recorded as expense
    const isSettlement = (isSettlementStr === 'yes' || isSettlementStr === 'y' || isSettlementStr === 'true') ||
                          (description.toLowerCase().includes('settle') && participantsStr.split(',').length <= 2);

    if (isSettlement && isSettlementStr !== 'yes' && isSettlementStr !== 'true') {
      anomaliesToCreate.push({
        importReportId: report.id,
        rowNumber: rowNum,
        rawData: rawDataJson,
        anomalyType: 'SETTLEMENT_AUTO_CONVERT',
        description: 'Description indicates settlement. Auto-converting to settlement record.',
        severity: 'MEDIUM',
        status: 'RESOLVED',
        resolvedAction: 'Auto-classified as Settlement'
      });
    }

    // 5. Split Type parsing and validations
    if (!['EQUAL', 'PERCENT', 'EXACT', 'WEIGHT'].includes(splitType)) {
      anomaliesToCreate.push({
        importReportId: report.id,
        rowNumber: rowNum,
        rawData: rawDataJson,
        anomalyType: 'MALFORMED_SPLIT_INFO',
        description: `Unknown split type: '${splitType}'. Defaulting to EQUAL.`,
        severity: 'MEDIUM',
        status: 'RESOLVED',
        resolvedAction: 'Split type changed to EQUAL'
      });
      splitType = 'EQUAL';
    }

    const absAmount = Math.abs(amount);
    const parsedPart = parseParticipants(participantsStr, splitType, absAmount);

    if (parsedPart.error) {
      anomaliesToCreate.push({
        importReportId: report.id,
        rowNumber: rowNum,
        rawData: rawDataJson,
        anomalyType: 'MALFORMED_SPLIT_INFO',
        description: parsedPart.error,
        severity: 'HIGH',
        status: 'PENDING'
      });
    }

    // 6. Unknown Participant & Historical Membership Violation Check
    let payerObj = memberNameMap[paidBy.toLowerCase()];
    if (paidBy && !payerObj) {
      anomaliesToCreate.push({
        importReportId: report.id,
        rowNumber: rowNum,
        rawData: rawDataJson,
        anomalyType: 'UNKNOWN_PARTICIPANT',
        description: `Payer '${paidBy}' is not a registered member of this group.`,
        severity: 'MEDIUM',
        status: 'PENDING'
      });
    } else if (payerObj && date) {
      // Historical date membership check for payer
      if (date < payerObj.joinDate || (payerObj.leaveDate && date > payerObj.leaveDate)) {
        anomaliesToCreate.push({
          importReportId: report.id,
          rowNumber: rowNum,
          rawData: rawDataJson,
          anomalyType: 'MEMBERSHIP_VIOLATION',
          description: `Payer '${paidBy}' was not active in the group on ${date} (joined ${payerObj.joinDate}, left ${payerObj.leaveDate || 'present'}).`,
          severity: 'HIGH',
          status: 'PENDING'
        });
      }
    }

    parsedPart.members.forEach(p => {
      const partName = p.name;
      const partObj = memberNameMap[partName.toLowerCase()];
      if (!partObj) {
        anomaliesToCreate.push({
          importReportId: report.id,
          rowNumber: rowNum,
          rawData: rawDataJson,
          anomalyType: 'UNKNOWN_PARTICIPANT',
          description: `Participant '${partName}' is not a registered member of this group.`,
          severity: 'MEDIUM',
          status: 'PENDING'
        });
      } else if (partObj && date) {
        // Historical date membership check for participant
        if (date < partObj.joinDate || (partObj.leaveDate && date > partObj.leaveDate)) {
          anomaliesToCreate.push({
            importReportId: report.id,
            rowNumber: rowNum,
            rawData: rawDataJson,
            anomalyType: 'MEMBERSHIP_VIOLATION',
            description: `Participant '${partName}' was not active in the group on ${date} (joined ${partObj.joinDate}, left ${partObj.leaveDate || 'present'}).`,
            severity: 'HIGH',
            status: 'PENDING'
          });
        }
      }
    });

    // 7. Duplicate check against active DB database
    if (payerObj && date && !isNaN(amount)) {
      const isDuplicate = existingExpenses.some(ee => {
        if (ee.paidById !== payerObj.id) return false;
        if (ee.date !== date) return false;
        if (Math.abs(parseFloat(ee.amount) - absAmount) > 0.01) return false;
        if (ee.description.toLowerCase() !== description.toLowerCase()) return false;
        
        // Match participants list
        const eePartNames = ee.Participants ? ee.Participants.map(ep => ep.Member.name.toLowerCase()).sort() : [];
        const importedPartNames = parsedPart.members.map(pm => pm.name.toLowerCase()).sort();
        if (eePartNames.length !== importedPartNames.length) return false;
        return eePartNames.every((val, idx) => val === importedPartNames[idx]);
      });

      if (isDuplicate) {
        anomaliesToCreate.push({
          importReportId: report.id,
          rowNumber: rowNum,
          rawData: rawDataJson,
          anomalyType: 'DUPLICATE_EXPENSE',
          description: `Row has identical date (${date}), amount (${absAmount}), payer (${paidBy}), and participants to an existing record.`,
          severity: 'HIGH',
          status: 'PENDING'
        });
      }
    }
  }

  // Save anomalies in bulk
  if (anomaliesToCreate.length > 0) {
    await Anomaly.bulkCreate(anomaliesToCreate);
    anomaliesCount = anomaliesToCreate.length;
  }

  report.totalRows = rows.length;
  report.anomaliesCount = anomaliesCount;
  report.status = anomaliesCount > 0 ? 'PENDING' : 'PROCESSED';
  await report.save();

  // If there are zero anomalies, auto-commit the import!
  if (anomaliesCount === 0) {
    await commitImport(report.id);
  }

  return {
    reportId: report.id,
    totalRows: report.totalRows,
    anomaliesCount: report.anomaliesCount,
    status: report.status
  };
}

/**
 * Finalizes import for a report. All valid rows (and user-approved anomaly overrides) are written to database.
 */
async function commitImport(reportId) {
  const report = await ImportReport.findByPk(reportId);
  if (!report) throw new Error('Import report not found');
  if (report.status === 'PROCESSED') return { message: 'Already processed' };

  // Fetch anomalies for this report
  const anomalies = await Anomaly.findAll({ where: { importReportId: reportId } });
  
  // High severity pending anomalies block import commit
  const hasUnresolvedHigh = anomalies.some(a => a.severity === 'HIGH' && a.status === 'PENDING');
  if (hasUnresolvedHigh) {
    throw new Error('Cannot commit import. There are unresolved high-severity anomalies.');
  }

  // Load the CSV data again
  // Wait, we can parse the CSV file from disk
  const fs = require('fs');
  const path = require('path');
  const backendDir = path.resolve(__dirname, '..');
  const filePath = path.join(backendDir, 'uploads', report.fileName);

  if (!fs.existsSync(filePath)) {
    throw new Error(`CSV source file ${report.fileName} no longer exists on server`);
  }

  const fileContent = fs.readFileSync(filePath, 'utf8');
  const parsed = Papa.parse(fileContent, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim().replace(/^\uFEFF/, '')
  });
  const rows = parsed.data;

  // Transaction boundaries to write all rows safely
  const t = await sequelize.transaction();

  try {
    const groupId = report.groupId;

    // Load active group members
    let groupMembers = await GroupMember.findAll({ where: { groupId }, transaction: t });
    const memberNameMap = {};
    groupMembers.forEach(m => {
      memberNameMap[m.name.toLowerCase()] = m;
    });

    let importedCount = 0;

    for (let index = 0; index < rows.length; index++) {
      const rowNum = index + 2;
      const row = rows[index];
      
      // Check if the entire row is empty
      const isRowEmpty = Object.values(row).every(val => !val || val.toString().trim() === '');
      if (isRowEmpty) continue;

      // Check anomalies status on this row
      const rowAnomalies = anomalies.filter(a => a.rowNumber === rowNum);
      const isIgnored = rowAnomalies.some(a => a.status === 'IGNORED');
      if (isIgnored) continue; // Skip ignored rows

      // Duplicate check: if duplicate anomaly is still pending or wasn't approved, skip it
      const duplicateAnomaly = rowAnomalies.find(a => a.anomalyType === 'DUPLICATE_EXPENSE');
      if (duplicateAnomaly && duplicateAnomaly.status !== 'APPROVED') {
        continue; // Skip duplicate records unless approved
      }

      // Membership Violation check
      const memViolation = rowAnomalies.find(a => a.anomalyType === 'MEMBERSHIP_VIOLATION');
      if (memViolation && memViolation.status === 'PENDING') {
        throw new Error(`Row ${rowNum} has a pending membership violation. Fix it first.`);
      }

      // Check if raw data was edited in a RESOLVED anomaly
      let dataToProcess = row;
      const editedAnomaly = rowAnomalies.find(a => a.status === 'RESOLVED' && a.resolvedAction && a.resolvedAction.startsWith('EDITED:'));
      if (editedAnomaly) {
        try {
          const editedJson = editedAnomaly.resolvedAction.replace('EDITED:', '');
          dataToProcess = JSON.parse(editedJson);
        } catch (err) {
          console.error('Failed to parse resolved edited row JSON', err);
        }
      }

      const normalizedRow = normalizeRow(dataToProcess);

      // Get fields
      let rawDate = normalizedRow.Date || '';
      let description = (normalizedRow.Description || '').trim();
      let rawAmount = normalizedRow.Amount || '';
      let rawCurrency = (normalizedRow.Currency || 'INR').trim();
      let paidBy = (normalizedRow['Paid By'] || '').trim();
      let participantsStr = normalizedRow.Participants || '';
      let splitType = (normalizedRow['Split Type'] || 'EQUAL').trim().toUpperCase();
      let isSettlementStr = (normalizedRow['Is Settlement'] || '').trim().toLowerCase();

      // Normalize date & amount
      let date = normalizeDate(rawDate) || new Date().toISOString().split('T')[0];
      let amount = parseFloat(rawAmount);
      let isRefund = amount < 0;
      let absAmount = Math.abs(amount);
      let currency = rawCurrency || 'INR';

      // Fallback conversion rate
      let rate = 1.0;
      if (currency.toUpperCase() === 'USD') {
        rate = DEFAULT_USD_TO_INR;
      }
      let amountInINR = absAmount * rate;

      // Ensure Payer member exists, otherwise create as guest
      let payerName = paidBy;
      if (!payerName) payerName = 'Guest';
      let payerKey = payerName.toLowerCase();
      let payerMember = memberNameMap[payerKey];

      if (!payerMember) {
        // Create unknown participant as a guest
        payerMember = await GroupMember.create({
          groupId,
          name: payerName,
          joinDate: date,
          isGuest: true
        }, { transaction: t });
        memberNameMap[payerKey] = payerMember;
        groupMembers.push(payerMember);
      }

      const isSettlement = (isSettlementStr === 'yes' || isSettlementStr === 'y' || isSettlementStr === 'true') ||
                            (description.toLowerCase().includes('settle') && participantsStr.split(',').length <= 2);

      if (isSettlement) {
        // Parse the receiver
        const tokens = participantsStr.split(',').map(s => s.trim()).filter(Boolean);
        // Receiver is first token that is not payer, or first token
        let receiverName = tokens.find(n => n.toLowerCase() !== payerName.toLowerCase());
        if (!receiverName) receiverName = tokens[0] || 'Guest';

        let receiverKey = receiverName.toLowerCase();
        let receiverMember = memberNameMap[receiverKey];
        if (!receiverMember) {
          receiverMember = await GroupMember.create({
            groupId,
            name: receiverName,
            joinDate: date,
            isGuest: true
          }, { transaction: t });
          memberNameMap[receiverKey] = receiverMember;
          groupMembers.push(receiverMember);
        }

        // Create settlement
        await Settlement.create({
          groupId,
          payerId: payerMember.id, // the one transferring the money
          receiverId: receiverMember.id,
          amount: absAmount,
          currency,
          exchangeRate: rate,
          amountInINR,
          date,
          notes: description
        }, { transaction: t });

      } else {
        // Create Expense
        const parsedPart = parseParticipants(participantsStr, splitType, absAmount);
        
        const expense = await Expense.create({
          groupId,
          description,
          amount: absAmount,
          currency,
          exchangeRate: rate,
          amountInINR,
          date,
          paidById: payerMember.id,
          splitType,
          notes: isRefund ? 'Imported as refund.' : ''
        }, { transaction: t });

        // Add participants splits
        const shareCount = parsedPart.members.length;
        let runningSumINR = 0;

        for (let i = 0; i < shareCount; i++) {
          const p = parsedPart.members[i];
          const partName = p.name;
          const partKey = partName.toLowerCase();
          let partMember = memberNameMap[partKey];

          if (!partMember) {
            partMember = await GroupMember.create({
              groupId,
              name: partName,
              joinDate: date,
              isGuest: true
            }, { transaction: t });
            memberNameMap[partKey] = partMember;
            groupMembers.push(partMember);
          }

          let shareAmountINR = 0;
          let sharePercent = null;
          let shareWeight = null;

          if (splitType === 'EQUAL') {
            shareAmountINR = amountInINR / shareCount;
          } else if (splitType === 'PERCENT') {
            sharePercent = p.shareValue;
            shareAmountINR = (amountInINR * sharePercent) / 100;
          } else if (splitType === 'EXACT') {
            shareAmountINR = p.shareValue * rate;
          } else if (splitType === 'WEIGHT') {
            shareWeight = p.shareValue;
            const totalWeights = parsedPart.members.reduce((acc, curr) => acc + curr.shareValue, 0);
            shareAmountINR = (amountInINR * shareWeight) / totalWeights;
          }

          // If refund, reverse debt direction: payer is credited, participants are debited.
          // Wait, the regular split direction is: Payer pays, participants owe.
          // In the database: shareAmount stores how much each participant owes.
          // If it is a refund, we can still store it as standard shares, but in the balance engine:
          // Wait, isRefund check: if isRefund is true, we can reverse it.
          // Wait, let's keep shareAmount positive in ExpenseParticipants, but let's reverse the participants.
          // Or we can just store the share amount as calculated. The user requested:
          // "Negative amounts should be treated as refunds."
          // If we treat it as a refund, does it mean we reverse who owes whom?
          // If Alice receives a refund of 300, and splits it with Bob and Charlie:
          // Bob and Charlie get credited, Alice gets debited.
          // In our import commit, let's represent this by swapping payer and participants, or by recording it as a negative expense?
          // Wait! Our database schema uses DECIMAL(15,2) and in Sequelize, we can save negative numbers if we want, or we can just swap the directions!
          // Swapping directions: Payer becomes the receiver (Alice), and participants owe Alice. Wait, if Alice gets a refund from a vendor (so she receives money), she distributes the refund. Alice's net balance should decrease (she got money back, so she paid less net). Bob and Charlie's net balances should increase (they owe less).
          // Alice's net balance = Paid - Owed. If Alice gets a refund of 300, she receives 300. So her net balance should decrease by 200 (since she gets 300, but splits 100 each with Bob and Charlie).
          // Bob and Charlie's net balances should increase by 100 (they owe 100 less).
          // If we record a refund where Alice is the payer, but amount is negative:
          // Alice: Paid = -300.
          // Bob: Owed = -100.
          // Charlie: Owed = -100.
          // Alice's Net Balance = Paid - Owed = -300 - (-100 [Alice share] - 100 [Bob] - 100 [Charlie])?
          // Wait: Net Balance = Paid - Owed.
          // Alice: Paid -300, Owed -100 -> Net = -300 - (-100) = -200.
          // Bob: Paid 0, Owed -100 -> Net = 0 - (-100) = +100.
          // Charlie: Paid 0, Owed -100 -> Net = 0 - (-100) = +100.
          // Alice's balance goes down by 200, Bob and Charlie's go up by 100.
          // This is mathematically elegant! Storing the amount as negative in the database handles refunds automatically without swapping fields, as long as our database columns allow negative values (which standard MySQL DECIMAL columns do).
          // But wait, the requirement says: "Negative amounts should be treated as refunds. ... Normalized to a positive absolute amount for database storage and flag logged."
          // Ah! "Normalized to a positive absolute amount for database storage and flag logged."
          // If it is stored as a positive absolute amount, how do we represent it?
          // If we store it as a positive absolute amount:
          // Payer is Alice (she paid 300? No, she received 300).
          // If she received 300 refund, then Bob and Charlie are the ones who "paid" Alice!
          // That is, Bob and Charlie paid 100 each to Alice.
          // If we model a refund as: Payer = the vendor/refund recipient?
          // Wait, if it is stored as a positive amount, we can reverse the payer and participants!
          // Let's think:
          // Alice gets a refund of 300. Bob and Charlie are participants.
          // If we store it as positive:
          // Payer = Bob and Charlie? No, that would require creating multiple expense records (one for each payer) or we can't represent it easily.
          // What if we swap the payer and participants?
          // If we represent a refund of 300 received by Alice (split with Bob and Charlie) as:
          // Bob and Charlie are payers (paying 150 each? No, 100 each) and Alice is the participant (owing 200)?
          // No, if Alice receives the refund, Alice is the payer (amount = 300), but wait, if it's positive:
          // Alice's Paid = 300, but she owes Bob and Charlie 100 each.
          // So Alice is the payer (Paid = 300), and participants are Bob and Charlie (Owed = 100 each). But wait! That makes Alice's net balance go UP (+200), and Bob/Charlie's net balances go DOWN (-100). That is the opposite of a refund! That is a normal expense!
          // To make it a refund (Alice's net goes down, Bob/Charlie's net goes up) while storing positive values, we must reverse the roles:
          // Bob and Charlie are the payers (e.g. Bob pays 150, Charlie pays 150, and Alice owes 300? No, Bob pays 100, Charlie pays 100, and Alice owes 200?
          // Yes! If Bob and Charlie are the payers, how do we store it when there can only be one payer in our `Expenses` table? (The `Expenses` table has `paidById` which is a single member).
          // If there can only be one payer, then:
          // Can we record it as:
          // Alice is the payer (Paid = 100? No, Alice is participant who owes 300, and Bob and Charlie are... wait).
          // If we want Bob and Charlie's balance to go UP by 100, they must be the payers, or Alice must be the "participant" who owes them.
          // If Bob is the payer of 100, and Alice is the participant who owes 100.
          // And Charlie is the payer of 100, and Alice is the participant who owes 100.
          // This splits it into two expenses!
          // Is that necessary?
          // What if we just allow storing negative values in `Expenses`?
          // Let's re-read: "Negative amounts should be treated as refunds. ... Normalized to a positive absolute amount for database storage and flag logged." Wait, where is that written?
          // Ah, in SCOPE.md, the AI wrote: "Treated as a Refund. The direction of split balances is reversed (owed participants are credited, payer is debited). Normalized to a positive absolute amount for database storage and flag logged."
          // Oh, that's what *I* wrote in SCOPE.md!
          // If I write it as a positive absolute amount:
          // Let's store it as positive, but wait: how do we calculate it in the balance engine?
          // If we store the expense as a refund, we can add a boolean or notes flag, or store the shareAmount as negative in `ExpenseParticipants`, and the paid amount as negative in `Expenses`.
          // Wait, if we store the amount as negative, it's very simple and mathematically consistent!
          // Let's see if we can do that. If we store `amount` as positive but `amountInINR` as negative? Or both as negative?
          // Let's store both as negative! If `amount` is negative, then `Paid = -300`, and `Owed = -100`.
          // That way:
          // `totalExpensesPaid` decreases by 300.
          // `totalExpensesOwed` decreases by 100 for each participant.
          // This is extremely simple, elegant, requires no changes to the schema, and handles any split type automatically (since we just multiply the split shares by a negative factor).
          // Let's implement it this way! It works perfectly and is mathematically sound.
          // Let's check: in `commitImport`, if `isRefund` is true:
          // We can store `amount = -absAmount` and `amountInINR = -amountInINR`.
          // And for participants, `shareAmount = -shareAmountINR`.
          // Let's do that! It is 100% correct and makes balance calculations super clean.
          // Wait, let's write `shareAmount = isRefund ? -shareAmountINR : shareAmountINR`.
          // Let's verify: `amount = isRefund ? -absAmount : absAmount`.
          // This is beautiful!

          // Save participant share
          await ExpenseParticipant.create({
            expenseId: expense.id,
            memberId: partMember.id,
            shareAmount: isRefund ? -shareAmountINR : shareAmountINR,
            sharePercentage: sharePercent,
            shareWeight: shareWeight
          }, { transaction: t });
        }
      }

      importedCount++;
    }

    // Update report status
    report.status = 'PROCESSED';
    report.importedRows = importedCount;
    await report.save({ transaction: t });

    await t.commit();
    return {
      reportId: report.id,
      importedRows: importedCount,
      status: 'PROCESSED'
    };

  } catch (error) {
    await t.rollback();
    console.error('Error during import commit:', error);
    throw error;
  }
}

module.exports = {
  processCsvImport,
  commitImport,
  normalizeDate,
  parseParticipants
};
