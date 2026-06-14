import React, { useState, useEffect, useContext } from 'react';
import { useParams, Link } from 'react-router-dom';
import API from '../services/api';
import { AuthContext } from '../context/AuthContext';

const GroupDetails = () => {
  const { id: groupId } = useParams();
  const { user } = useContext(AuthContext);

  // Core Data States
  const [groupData, setGroupData] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [settlements, setSettlements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // UI States
  const [activeTab, setActiveTab] = useState('expenses'); // 'expenses' | 'settlements' | 'members' | 'traceability'
  const [expandedTraceMember, setExpandedTraceMember] = useState(null);

  // Modals
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showSettlementModal, setShowSettlementModal] = useState(false);
  const [showEditMemberModal, setShowEditMemberModal] = useState(false);

  // Form States - Add Member
  const [memberName, setMemberName] = useState('');
  const [memberEmail, setMemberEmail] = useState('');
  const [memberJoinDate, setMemberJoinDate] = useState(new Date().toISOString().split('T')[0]);
  const [memberLeaveDate, setMemberLeaveDate] = useState('');
  const [memberIsGuest, setMemberIsGuest] = useState(true);

  // Form States - Edit Member
  const [editMemberObj, setEditMemberObj] = useState(null);
  const [editMemberJoinDate, setEditMemberJoinDate] = useState('');
  const [editMemberLeaveDate, setEditMemberLeaveDate] = useState('');

  // Form States - Add Expense
  const [expDesc, setExpDesc] = useState('');
  const [expAmount, setExpAmount] = useState('');
  const [expCurrency, setExpCurrency] = useState('INR');
  const [expDate, setExpDate] = useState(new Date().toISOString().split('T')[0]);
  const [expPaidBy, setExpPaidBy] = useState('');
  const [expSplitType, setExpSplitType] = useState('EQUAL');
  const [expNotes, setExpNotes] = useState('');
  const [expParticipants, setExpParticipants] = useState([]); // array of { memberId, selected, shareValue }

  // Form States - Add Settlement
  const [setPayId, setSetPayId] = useState('');
  const [setRecId, setSetRecId] = useState('');
  const [setAmount, setSetAmount] = useState('');
  const [setCurrency, setSetCurrency] = useState('INR');
  const [setDate, setSetDate] = useState(new Date().toISOString().split('T')[0]);
  const [setNotes, setSetNotes] = useState('');

  useEffect(() => {
    fetchData();
  }, [groupId]);

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const [detailsRes, expensesRes, settlementsRes] = await Promise.all([
        API.get(`/groups/${groupId}`),
        API.get(`/expenses/group/${groupId}`),
        API.get(`/settlements/group/${groupId}`)
      ]);

      setGroupData(detailsRes.data);
      setExpenses(expensesRes.data);
      setSettlements(settlementsRes.data);

      // Default the payer/recipient fields if members are available
      const members = detailsRes.data.members || [];
      if (members.length > 0) {
        setExpPaidBy(members[0].id);
        setSetPayId(members[0].id);
        setSetRecId(members[1]?.id || '');
        
        // Initialize expense participants selection list
        setExpParticipants(
          members.map(m => ({
            memberId: m.id,
            name: m.name,
            selected: true,
            shareValue: ''
          }))
        );
      }
    } catch (err) {
      console.error(err);
      setError('Failed to load group details.');
    } finally {
      setLoading(false);
    }
  };

  // Triggered when opening expense modal to reset checkboxes
  const handleOpenExpenseModal = () => {
    if (groupData?.members) {
      setExpParticipants(
        groupData.members.map(m => ({
          memberId: m.id,
          name: m.name,
          selected: true,
          shareValue: ''
        }))
      );
    }
    setExpDesc('');
    setExpAmount('');
    setExpCurrency('INR');
    setExpDate(new Date().toISOString().split('T')[0]);
    setExpNotes('');
    setExpSplitType('EQUAL');
    setShowExpenseModal(true);
  };

  // Add Member submit
  const handleAddMember = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      await API.post(`/groups/${groupId}/members`, {
        name: memberName,
        email: memberEmail || null,
        joinDate: memberJoinDate,
        leaveDate: memberLeaveDate || null,
        isGuest: memberIsGuest
      });

      setMemberName('');
      setMemberEmail('');
      setMemberJoinDate(new Date().toISOString().split('T')[0]);
      setMemberLeaveDate('');
      setMemberIsGuest(true);
      setShowMemberModal(false);
      setSuccess('Member added successfully.');
      fetchData();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to add member.');
    }
  };

  // Open Edit Member
  const handleOpenEditMember = (member) => {
    setEditMemberObj(member);
    setEditMemberJoinDate(member.joinDate);
    setEditMemberLeaveDate(member.leaveDate || '');
    setShowEditMemberModal(true);
  };

  // Save Edit Member
  const handleEditMember = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      await API.put(`/groups/${groupId}/members/${editMemberObj.id}`, {
        joinDate: editMemberJoinDate,
        leaveDate: editMemberLeaveDate || null
      });
      setShowEditMemberModal(false);
      setSuccess('Member updated successfully.');
      fetchData();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to update member.');
    }
  };

  // Expense split details validator
  const validateSplits = () => {
    const activeParts = expParticipants.filter(p => p.selected);
    if (activeParts.length === 0) {
      return { valid: false, error: 'Must select at least one split participant.' };
    }

    const total = parseFloat(expAmount);

    if (expSplitType === 'PERCENT') {
      const sum = activeParts.reduce((acc, curr) => acc + parseFloat(curr.shareValue || 0), 0);
      if (Math.abs(sum - 100) > 0.1) {
        return { valid: false, error: `Percentages sum to ${sum}%, but must sum to exactly 100%.` };
      }
    } else if (expSplitType === 'EXACT') {
      const sum = activeParts.reduce((acc, curr) => acc + parseFloat(curr.shareValue || 0), 0);
      if (Math.abs(sum - total) > 0.1) {
        return { valid: false, error: `Exact amounts sum to ${sum} ${expCurrency}, but must match total amount (${total} ${expCurrency}).` };
      }
    } else if (expSplitType === 'WEIGHT') {
      const sum = activeParts.reduce((acc, curr) => acc + parseFloat(curr.shareValue || 0), 0);
      if (sum <= 0) {
        return { valid: false, error: 'Sum of weights must be greater than zero.' };
      }
    }
    return { valid: true };
  };

  // Add Expense submit
  const handleAddExpense = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const validation = validateSplits();
    if (!validation.valid) {
      setError(validation.error);
      return;
    }

    try {
      const formattedParticipants = expParticipants
        .filter(p => p.selected)
        .map(p => ({
          memberId: p.memberId,
          shareValue: expSplitType === 'EQUAL' ? 1 : parseFloat(p.shareValue || 0)
        }));

      await API.post(`/expenses/group/${groupId}`, {
        description: expDesc,
        amount: parseFloat(expAmount),
        currency: expCurrency,
        date: expDate,
        paidById: parseInt(expPaidBy),
        splitType: expSplitType,
        participants: formattedParticipants,
        notes: expNotes
      });

      setShowExpenseModal(false);
      setSuccess('Expense added successfully.');
      fetchData();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to add expense.');
    }
  };

  // Add Settlement submit
  const handleAddSettlement = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      await API.post(`/settlements/group/${groupId}`, {
        payerId: parseInt(setPayId),
        receiverId: parseInt(setRecId),
        amount: parseFloat(setAmount),
        currency: setCurrency,
        date: setDate,
        notes: setNotes
      });

      setSetAmount('');
      setSetNotes('');
      setShowSettlementModal(false);
      setSuccess('Settlement logged successfully.');
      fetchData();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to register settlement.');
    }
  };

  // Delete Expense
  const handleDeleteExpense = async (id) => {
    if (!window.confirm('Are you sure you want to delete this expense?')) return;
    setError('');
    setSuccess('');
    try {
      await API.delete(`/expenses/${id}`);
      setSuccess('Expense deleted.');
      fetchData();
    } catch (err) {
      console.error(err);
      setError('Failed to delete expense.');
    }
  };

  // Delete Settlement
  const handleDeleteSettlement = async (id) => {
    if (!window.confirm('Are you sure you want to delete this settlement?')) return;
    setError('');
    setSuccess('');
    try {
      await API.delete(`/settlements/${id}`);
      setSuccess('Settlement deleted.');
      fetchData();
    } catch (err) {
      console.error(err);
      setError('Failed to delete settlement.');
    }
  };

  const handleToggleParticipant = (index) => {
    const copy = [...expParticipants];
    copy[index].selected = !copy[index].selected;
    setExpParticipants(copy);
  };

  const handleParticipantShareChange = (index, val) => {
    const copy = [...expParticipants];
    copy[index].shareValue = val;
    setExpParticipants(copy);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brandAccent"></div>
        <p className="text-gray-400 mt-4">Loading details...</p>
      </div>
    );
  }

  const balances = groupData?.balances || [];
  const whoPaysWhom = groupData?.whoPaysWhom || [];
  const members = groupData?.members || [];

  return (
    <div className="min-h-screen pb-16">
      {/* Header bar */}
      <header className="border-b border-darkBorder/60 bg-darkCard/50 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/dashboard" className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <span className="h-8 w-8 bg-brandAccent rounded-lg flex items-center justify-center text-darkBg font-black">S</span>
            Shared Expenses <span className="text-brandAccent">Manager</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link to="/dashboard" className="glass-btn-secondary text-sm !px-4 !py-2">
              Back to Dashboard
            </Link>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        {/* Banner with group details */}
        <div className="glass-panel p-6 mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative overflow-hidden">
          <div className="absolute -top-16 -right-16 w-36 h-36 bg-blue-500/5 rounded-full blur-2xl"></div>
          <div>
            <h2 className="text-3xl font-extrabold text-white mb-1">{groupData?.group?.name}</h2>
            <p className="text-gray-400 text-sm max-w-xl">{groupData?.group?.description || 'No description provided.'}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              to={`/groups/${groupId}/import`}
              className="glass-btn-secondary flex items-center gap-2"
            >
              <svg className="w-5 h-5 text-brandAccent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              Import CSV
            </Link>
            <button
              onClick={handleOpenExpenseModal}
              className="glass-btn-primary flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
              </svg>
              Add Expense
            </button>
          </div>
        </div>

        {error && (
          <div className="p-4 mb-6 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-sm">
            {error}
          </div>
        )}
        {success && (
          <div className="p-4 mb-6 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-sm">
            {success}
          </div>
        )}

        {/* Dashboard Grid (Balances & Settlements Suggestions) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          {/* Member Balance summaries */}
          <div className="lg:col-span-2 glass-panel p-6 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-white">Net Balances</h3>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-darkBorder text-gray-400">INR Equivalents</span>
              </div>

              <div className="space-y-4">
                {balances.map(b => {
                  const isPositive = b.netBalance >= 0;
                  return (
                    <div 
                      key={b.id} 
                      className="flex items-center justify-between p-3 rounded-xl bg-darkBg/40 border border-darkBorder/40 hover:border-darkBorder transition-colors cursor-pointer"
                      onClick={() => {
                        setExpandedTraceMember(b);
                        setActiveTab('traceability');
                      }}
                    >
                      <div>
                        <div className="font-bold text-white flex items-center gap-2">
                          {b.name}
                          {b.isGuest && <span className="text-[10px] bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded">GUEST</span>}
                        </div>
                        <div className="text-xs text-gray-500">
                          Active: {b.joinDate} to {b.leaveDate || 'Present'}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`font-mono font-bold text-lg ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {isPositive ? '+' : ''}{b.netBalance}
                        </div>
                        <div className="text-xs text-gray-500">
                          Paid: {b.totalExpensesPaid} | Owed: {b.totalExpensesOwed}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-darkBorder/40 flex justify-between items-center text-sm text-gray-400">
              <span>Total Group Expenses:</span>
              <span className="font-mono font-bold text-white text-lg">INR {groupData?.totalExpensesINR}</span>
            </div>
          </div>

          {/* Settlements suggestions ("Who Pays Whom") */}
          <div className="glass-panel p-6 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-white">Who Pays Whom</h3>
                <button
                  onClick={() => setShowSettlementModal(true)}
                  className="text-xs text-brandAccent font-bold hover:underline"
                >
                  Record Payment
                </button>
              </div>

              {whoPaysWhom.length === 0 ? (
                <div className="h-44 flex flex-col items-center justify-center text-center">
                  <svg className="w-10 h-10 text-gray-600 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-gray-500 text-sm">Everyone is fully settled!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {whoPaysWhom.map((tx, idx) => (
                    <div key={idx} className="p-3 rounded-xl bg-darkBg/60 border border-darkBorder/40 flex flex-col gap-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-rose-300 font-semibold">{tx.fromName}</span>
                        <span className="text-gray-500 text-xs">pays</span>
                        <span className="text-emerald-300 font-semibold">{tx.toName}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-white text-lg">INR {tx.amount}</span>
                        <button
                          onClick={() => {
                            setSetPayId(tx.fromId);
                            setSetRecId(tx.toId);
                            setSetAmount(tx.amount);
                            setShowSettlementModal(true);
                          }}
                          className="text-xs bg-brandAccent/10 border border-brandAccent/30 hover:bg-brandAccent text-brandAccent hover:text-darkBg transition-all px-2.5 py-1 rounded-lg font-semibold"
                        >
                          Settle
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="text-xs text-gray-500 leading-relaxed border-t border-darkBorder/40 pt-4 mt-6">
              * Recommended transactions minimize peer payments. Always record settlements when cash changes hands.
            </div>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="border-b border-darkBorder/60 mb-6 flex gap-6">
          <button
            onClick={() => setActiveTab('expenses')}
            className={`pb-3 font-bold text-sm uppercase tracking-wider transition-colors relative ${activeTab === 'expenses' ? 'text-brandAccent' : 'text-gray-400 hover:text-white'}`}
          >
            Expenses Ledger
            {activeTab === 'expenses' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-brandAccent"></span>}
          </button>
          <button
            onClick={() => setActiveTab('settlements')}
            className={`pb-3 font-bold text-sm uppercase tracking-wider transition-colors relative ${activeTab === 'settlements' ? 'text-brandAccent' : 'text-gray-400 hover:text-white'}`}
          >
            Settlement Ledger
            {activeTab === 'settlements' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-brandAccent"></span>}
          </button>
          <button
            onClick={() => setActiveTab('members')}
            className={`pb-3 font-bold text-sm uppercase tracking-wider transition-colors relative ${activeTab === 'members' ? 'text-brandAccent' : 'text-gray-400 hover:text-white'}`}
          >
            Group Members ({members.length})
            {activeTab === 'members' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-brandAccent"></span>}
          </button>
          <button
            onClick={() => setActiveTab('traceability')}
            className={`pb-3 font-bold text-sm uppercase tracking-wider transition-colors relative ${activeTab === 'traceability' ? 'text-brandAccent' : 'text-gray-400 hover:text-white'}`}
          >
            Audit Traceability
            {activeTab === 'traceability' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-brandAccent"></span>}
          </button>
        </div>

        {/* TAB CONTENTS */}

        {/* Tab 1: Expenses Ledger */}
        {activeTab === 'expenses' && (
          <div className="glass-panel overflow-hidden">
            {expenses.length === 0 ? (
              <div className="p-12 text-center text-gray-500">No expenses recorded in this group.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-darkBorder/60 bg-darkCard/40 text-gray-400 text-xs font-semibold uppercase">
                      <th className="p-4">Date</th>
                      <th className="p-4">Description</th>
                      <th className="p-4">Amount</th>
                      <th className="p-4">Paid By</th>
                      <th className="p-4">Split Participants</th>
                      <th className="p-4 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-darkBorder/40">
                    {expenses.map(exp => {
                      const amountVal = parseFloat(exp.amount);
                      const inrVal = parseFloat(exp.amountInINR);
                      const showConversion = exp.currency !== 'INR';

                      return (
                        <tr key={exp.id} className="hover:bg-darkCard/30 transition-colors text-sm">
                          <td className="p-4 whitespace-nowrap text-gray-300">{exp.date}</td>
                          <td className="p-4 font-semibold text-white">
                            <div>{exp.description}</div>
                            {exp.notes && <div className="text-xs text-gray-500 font-normal">{exp.notes}</div>}
                          </td>
                          <td className="p-4 font-mono font-semibold">
                            <span className="text-white">{exp.currency} {amountVal}</span>
                            {showConversion && (
                              <div className="text-xs text-gray-500">
                                (≈ INR {inrVal} @ {exp.exchangeRate})
                              </div>
                            )}
                          </td>
                          <td className="p-4 text-gray-300">{exp.Payer?.name}</td>
                          <td className="p-4 max-w-xs truncate text-gray-400">
                            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-darkBorder mr-1.5 text-gray-300">
                              {exp.splitType}
                            </span>
                            {exp.Participants?.map(p => p.Member?.name).join(', ')}
                          </td>
                          <td className="p-4 text-center">
                            <button
                              onClick={() => handleDeleteExpense(exp.id)}
                              className="text-rose-500 hover:text-rose-400 font-semibold text-xs"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Settlements Ledger */}
        {activeTab === 'settlements' && (
          <div className="glass-panel overflow-hidden">
            {settlements.length === 0 ? (
              <div className="p-12 text-center text-gray-500">No settlements logged yet.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-darkBorder/60 bg-darkCard/40 text-gray-400 text-xs font-semibold uppercase">
                      <th className="p-4">Date</th>
                      <th className="p-4">From</th>
                      <th className="p-4">To</th>
                      <th className="p-4">Amount</th>
                      <th className="p-4">Notes</th>
                      <th className="p-4 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-darkBorder/40">
                    {settlements.map(sett => {
                      const showConversion = sett.currency !== 'INR';
                      return (
                        <tr key={sett.id} className="hover:bg-darkCard/30 transition-colors text-sm">
                          <td className="p-4 whitespace-nowrap text-gray-300">{sett.date}</td>
                          <td className="p-4 font-bold text-rose-300">{sett.Payer?.name}</td>
                          <td className="p-4 font-bold text-emerald-300">{sett.Receiver?.name}</td>
                          <td className="p-4 font-mono font-semibold">
                            <span className="text-white">{sett.currency} {sett.amount}</span>
                            {showConversion && (
                              <div className="text-xs text-gray-500">
                                (≈ INR {sett.amountInINR} @ {sett.exchangeRate})
                              </div>
                            )}
                          </td>
                          <td className="p-4 text-gray-400">{sett.notes}</td>
                          <td className="p-4 text-center">
                            <button
                              onClick={() => handleDeleteSettlement(sett.id)}
                              className="text-rose-500 hover:text-rose-400 font-semibold text-xs"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Group Members */}
        {activeTab === 'members' && (
          <div className="glass-panel p-6">
            <div className="flex justify-between items-center mb-6">
              <h4 className="text-lg font-bold text-white">Group Membership History</h4>
              <button
                onClick={() => setShowMemberModal(true)}
                className="glass-btn-primary !py-2 text-sm"
              >
                Add Member
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-darkBorder/60 bg-darkCard/40 text-gray-400 text-xs font-semibold uppercase">
                    <th className="p-4">Name</th>
                    <th className="p-4">Type</th>
                    <th className="p-4">Join Date</th>
                    <th className="p-4">Leave Date</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-darkBorder/40">
                  {members.map(member => (
                    <tr key={member.id} className="hover:bg-darkCard/30 transition-colors text-sm">
                      <td className="p-4 font-semibold text-white">{member.name}</td>
                      <td className="p-4">
                        {member.isGuest ? (
                          <span className="text-xs px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">
                            Guest
                          </span>
                        ) : (
                          <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                            Registered
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-gray-300">{member.joinDate}</td>
                      <td className="p-4 text-gray-300">{member.leaveDate || <span className="text-gray-500 italic">Active</span>}</td>
                      <td className="p-4 text-right">
                        <button
                          onClick={() => handleOpenEditMember(member)}
                          className="text-brandAccent hover:text-brandAccent/80 font-bold text-xs"
                        >
                          Modify Dates
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 4: Audit Traceability */}
        {activeTab === 'traceability' && (
          <div className="glass-panel p-6">
            <h4 className="text-lg font-bold text-white mb-2">Mathematical Balance Traceability</h4>
            <p className="text-gray-400 text-sm mb-6 leading-relaxed">
              Verify how net balances are calculated. Every transaction in which a member participated is listed chronologically, showing how we audit their net position. Select a member to review their breakdown:
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
              {balances.map(b => (
                <button
                  key={b.id}
                  onClick={() => setExpandedTraceMember(b)}
                  className={`p-3 rounded-xl border text-left transition-all ${expandedTraceMember?.id === b.id ? 'bg-brandAccent/15 border-brandAccent text-brandAccent' : 'bg-darkBg/60 border-darkBorder text-gray-400 hover:border-gray-600'}`}
                >
                  <div className="font-bold truncate">{b.name}</div>
                  <div className="text-xs font-mono mt-1 font-semibold">INR {b.netBalance}</div>
                </button>
              ))}
            </div>

            {expandedTraceMember ? (
              <div className="mt-8 border-t border-darkBorder pt-6">
                <div className="flex justify-between items-center mb-4">
                  <h5 className="text-md font-bold text-white uppercase tracking-wider">
                    Trace log for <span className="text-brandAccent">{expandedTraceMember.name}</span>
                  </h5>
                  <div className="text-xs bg-darkCard border border-darkBorder px-3 py-1.5 rounded-lg">
                    Current Net: <span className="font-mono text-white font-bold">{expandedTraceMember.netBalance} INR</span>
                  </div>
                </div>

                {expandedTraceMember.traceability.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">No transactions recorded for this member.</div>
                ) : (
                  <div className="space-y-3">
                    {expandedTraceMember.traceability.map((log, idx) => {
                      const isAddition = log.type === 'EXPENSE_PAID' || log.type === 'SETTLEMENT_PAID';
                      const color = isAddition ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' : 'text-rose-400 bg-rose-500/10 border-rose-500/20';
                      
                      return (
                        <div key={idx} className={`p-3 rounded-xl border ${color} flex flex-col sm:flex-row justify-between sm:items-center gap-2`}>
                          <div>
                            <span className="text-xs font-black px-2 py-0.5 rounded bg-darkBg/60 border border-darkBorder mr-2 inline-block">
                              {log.type}
                            </span>
                            <span className="font-bold text-white text-sm">{log.description}</span>
                            <span className="text-gray-500 text-xs ml-2">({log.date})</span>
                            {!log.isActiveOnDate && (
                              <span className="text-[10px] bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded ml-2 border border-amber-500/30">
                                Membership Violation Date
                              </span>
                            )}
                          </div>
                          <div className="text-right">
                            <span className="font-mono font-bold">{isAddition ? '+' : '-'}{log.amountInINR} INR</span>
                            {log.originalCurrency !== 'INR' && (
                              <div className="text-[10px] text-gray-500">
                                ({log.originalCurrency} {log.originalAmount} @ {log.rate})
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              <div className="p-12 text-center text-gray-500 border border-dashed border-darkBorder rounded-xl">
                Please click on a member above to view their calculation trace log.
              </div>
            )}
          </div>
        )}
      </main>

      {/* MODAL 1: ADD MEMBER */}
      {showMemberModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-darkBg/80 backdrop-blur-sm">
          <div className="w-full max-w-md glass-panel p-6 relative">
            <button
              onClick={() => setShowMemberModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <h3 className="text-2xl font-bold text-white mb-6">Add Group Member</h3>

            <form onSubmit={handleAddMember} className="space-y-4">
              <div className="flex gap-4 mb-2">
                <button
                  type="button"
                  onClick={() => setMemberIsGuest(true)}
                  className={`w-1/2 p-2 rounded-xl border text-center font-bold text-sm ${memberIsGuest ? 'bg-brandAccent/15 border-brandAccent text-brandAccent' : 'bg-darkBg border-darkBorder text-gray-400'}`}
                >
                  Add as Guest
                </button>
                <button
                  type="button"
                  onClick={() => setMemberIsGuest(false)}
                  className={`w-1/2 p-2 rounded-xl border text-center font-bold text-sm ${!memberIsGuest ? 'bg-brandAccent/15 border-brandAccent text-brandAccent' : 'bg-darkBg border-darkBorder text-gray-400'}`}
                >
                  Link User Email
                </button>
              </div>

              <div className="flex flex-col">
                <label className="text-sm font-semibold text-gray-300 mb-1">Name</label>
                <input
                  type="text"
                  placeholder="e.g. Alice, Roommate A"
                  className="glass-input"
                  value={memberName}
                  onChange={(e) => setMemberName(e.target.value)}
                  required
                />
              </div>

              {!memberIsGuest && (
                <div className="flex flex-col animate-pulse">
                  <label className="text-sm font-semibold text-gray-300 mb-1">User Email</label>
                  <input
                    type="email"
                    placeholder="registered.user@gmail.com"
                    className="glass-input"
                    value={memberEmail}
                    onChange={(e) => setMemberEmail(e.target.value)}
                    required={!memberIsGuest}
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col">
                  <label className="text-sm font-semibold text-gray-300 mb-1">Join Date</label>
                  <input
                    type="date"
                    className="glass-input"
                    value={memberJoinDate}
                    onChange={(e) => setMemberJoinDate(e.target.value)}
                    required
                  />
                </div>
                <div className="flex flex-col">
                  <label className="text-sm font-semibold text-gray-300 mb-1">Leave Date (Optional)</label>
                  <input
                    type="date"
                    className="glass-input"
                    value={memberLeaveDate}
                    onChange={(e) => setMemberLeaveDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex gap-4 mt-6">
                <button
                  type="button"
                  onClick={() => setShowMemberModal(false)}
                  className="w-1/2 glass-btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-1/2 glass-btn-primary"
                >
                  Add Member
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: EDIT MEMBER DATES */}
      {showEditMemberModal && editMemberObj && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-darkBg/80 backdrop-blur-sm">
          <div className="w-full max-w-md glass-panel p-6 relative">
            <button
              onClick={() => setShowEditMemberModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <h3 className="text-2xl font-bold text-white mb-2">Modify Membership Dates</h3>
            <p className="text-gray-400 text-xs mb-6">Editing membership periods for {editMemberObj.name}</p>

            <form onSubmit={handleEditMember} className="space-y-4">
              <div className="flex flex-col">
                <label className="text-sm font-semibold text-gray-300 mb-1">Join Date</label>
                <input
                  type="date"
                  className="glass-input"
                  value={editMemberJoinDate}
                  onChange={(e) => setEditMemberJoinDate(e.target.value)}
                  required
                />
              </div>

              <div className="flex flex-col">
                <label className="text-sm font-semibold text-gray-300 mb-1">Leave Date (Optional)</label>
                <input
                  type="date"
                  className="glass-input"
                  value={editMemberLeaveDate}
                  onChange={(e) => setEditMemberLeaveDate(e.target.value)}
                />
              </div>

              <div className="flex gap-4 mt-6">
                <button
                  type="button"
                  onClick={() => setShowEditMemberModal(false)}
                  className="w-1/2 glass-btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-1/2 glass-btn-primary"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: ADD EXPENSE */}
      {showExpenseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-darkBg/80 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-xl glass-panel p-6 relative my-8">
            <button
              onClick={() => setShowExpenseModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <h3 className="text-2xl font-bold text-white mb-6">Add Expense</h3>

            <form onSubmit={handleAddExpense} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col col-span-2 sm:col-span-1">
                  <label className="text-sm font-semibold text-gray-300 mb-1">Description</label>
                  <input
                    type="text"
                    placeholder="e.g. Dinner, Groceries"
                    className="glass-input"
                    value={expDesc}
                    onChange={(e) => setExpDesc(e.target.value)}
                    required
                  />
                </div>
                <div className="flex flex-col col-span-2 sm:col-span-1">
                  <label className="text-sm font-semibold text-gray-300 mb-1">Amount</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      step="any"
                      placeholder="e.g. 500, -100"
                      className="glass-input w-full"
                      value={expAmount}
                      onChange={(e) => setExpAmount(e.target.value)}
                      required
                    />
                    <select
                      className="glass-input w-24"
                      value={expCurrency}
                      onChange={(e) => setExpCurrency(e.target.value)}
                    >
                      <option value="INR">INR</option>
                      <option value="USD">USD</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col col-span-2 sm:col-span-1">
                  <label className="text-sm font-semibold text-gray-300 mb-1">Date</label>
                  <input
                    type="date"
                    className="glass-input"
                    value={expDate}
                    onChange={(e) => setExpDate(e.target.value)}
                    required
                  />
                </div>
                <div className="flex flex-col col-span-2 sm:col-span-1">
                  <label className="text-sm font-semibold text-gray-300 mb-1">Paid By</label>
                  <select
                    className="glass-input w-full"
                    value={expPaidBy}
                    onChange={(e) => setExpPaidBy(e.target.value)}
                    required
                  >
                    {members.map(m => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Split options */}
              <div className="flex flex-col border-t border-darkBorder pt-4 mt-4">
                <label className="text-sm font-bold text-gray-300 mb-2">Split Type</label>
                <div className="flex flex-wrap gap-2 mb-4">
                  {['EQUAL', 'PERCENT', 'EXACT', 'WEIGHT'].map(type => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setExpSplitType(type)}
                      className={`px-3 py-1.5 rounded-lg border text-xs font-semibold ${expSplitType === type ? 'bg-brandAccent/15 border-brandAccent text-brandAccent' : 'bg-darkBg border-darkBorder text-gray-400'}`}
                    >
                      {type} Split
                    </button>
                  ))}
                </div>

                <label className="text-sm font-semibold text-gray-300 mb-2">Select Participants & Shares</label>
                <div className="space-y-3.5 max-h-48 overflow-y-auto pr-2 bg-darkBg/30 p-3 rounded-xl border border-darkBorder/40">
                  {expParticipants.map((p, index) => (
                    <div key={p.memberId} className="flex items-center justify-between gap-4">
                      <label className="flex items-center gap-2 text-sm text-gray-300 font-medium cursor-pointer">
                        <input
                          type="checkbox"
                          checked={p.selected}
                          onChange={() => handleToggleParticipant(index)}
                          className="rounded border-darkBorder text-brandAccent focus:ring-0 w-4 h-4 bg-darkBg"
                        />
                        {p.name}
                      </label>

                      {p.selected && expSplitType !== 'EQUAL' && (
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            step="any"
                            placeholder={expSplitType === 'PERCENT' ? '%' : expSplitType === 'EXACT' ? expCurrency : 'Weight'}
                            className="glass-input !py-1 !px-2.5 w-24 text-right text-xs"
                            value={p.shareValue}
                            onChange={(e) => handleParticipantShareChange(index, e.target.value)}
                            required
                          />
                          <span className="text-xs text-gray-500 font-bold">
                            {expSplitType === 'PERCENT' ? '%' : expSplitType === 'EXACT' ? expCurrency : 'w'}
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-col mt-4">
                <label className="text-sm font-semibold text-gray-300 mb-1">Notes (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. split details, extra context"
                  className="glass-input text-sm"
                  value={expNotes}
                  onChange={(e) => setExpNotes(e.target.value)}
                />
              </div>

              <div className="flex gap-4 mt-8">
                <button
                  type="button"
                  onClick={() => setShowExpenseModal(false)}
                  className="w-1/2 glass-btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-1/2 glass-btn-primary"
                >
                  Save Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: RECORD SETTLEMENT */}
      {showSettlementModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-darkBg/80 backdrop-blur-sm">
          <div className="w-full max-w-md glass-panel p-6 relative">
            <button
              onClick={() => setShowSettlementModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <h3 className="text-2xl font-bold text-white mb-6">Log Settlement</h3>

            <form onSubmit={handleAddSettlement} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col">
                  <label className="text-sm font-semibold text-gray-300 mb-1">Payer (Who Pays)</label>
                  <select
                    className="glass-input w-full"
                    value={setPayId}
                    onChange={(e) => setSetPayId(e.target.value)}
                    required
                  >
                    {members.map(m => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col">
                  <label className="text-sm font-semibold text-gray-300 mb-1">Receiver (Who Gets paid)</label>
                  <select
                    className="glass-input w-full"
                    value={setRecId}
                    onChange={(e) => setSetRecId(e.target.value)}
                    required
                  >
                    {members.map(m => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col">
                  <label className="text-sm font-semibold text-gray-300 mb-1">Amount</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      step="any"
                      placeholder="Amount"
                      className="glass-input w-full font-mono"
                      value={setAmount}
                      onChange={(e) => setSetAmount(e.target.value)}
                      required
                    />
                    <select
                      className="glass-input w-20"
                      value={setCurrency}
                      onChange={(e) => setSetCurrency(e.target.value)}
                    >
                      <option value="INR">INR</option>
                      <option value="USD">USD</option>
                    </select>
                  </div>
                </div>
                <div className="flex flex-col">
                  <label className="text-sm font-semibold text-gray-300 mb-1">Date</label>
                  <input
                    type="date"
                    className="glass-input"
                    value={setDate}
                    onChange={(e) => setSetDate(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="flex flex-col">
                <label className="text-sm font-semibold text-gray-300 mb-1">Notes</label>
                <input
                  type="text"
                  placeholder="e.g. Cash transfer, UPI payment, Venmo"
                  className="glass-input"
                  value={setNotes}
                  onChange={(e) => setSetNotes(e.target.value)}
                />
              </div>

              <div className="flex gap-4 mt-6">
                <button
                  type="button"
                  onClick={() => setShowSettlementModal(false)}
                  className="w-1/2 glass-btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-1/2 glass-btn-primary"
                >
                  Log Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default GroupDetails;
