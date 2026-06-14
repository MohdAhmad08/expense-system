import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import API from '../services/api';
import { AuthContext } from '../context/AuthContext';

const Dashboard = () => {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');
  const [createLoading, setCreateLoading] = useState(false);

  // Summary Metrics State
  const [summaryData, setSummaryData] = useState({
    totalExpenses: 0,
    activeMembers: 0,
    pendingSettlements: 0,
    importWarnings: 0,
  });

  const { user } = useContext(AuthContext);

  useEffect(() => {
    fetchGroupsAndSummarize();
  }, []);

  const fetchGroupsAndSummarize = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await API.get('/groups');
      const groupList = response.data;
      setGroups(groupList);

      if (groupList.length === 0) {
        setLoading(false);
        return;
      }

      // Fetch details & reports for each group to aggregate metrics
      const detailsPromises = groupList.map(g => API.get(`/groups/${g.id}`));
      const reportsPromises = groupList.map(g => API.get(`/import/group/${g.id}/reports`));
      
      const detailsResults = await Promise.all(detailsPromises);
      const reportsResults = await Promise.all(reportsPromises);
      
      let totalExp = 0;
      let pendingSettlementsVal = 0;
      let totalWarns = 0;
      const uniqueMembers = new Set();
      
      detailsResults.forEach(res => {
        const data = res.data;
        totalExp += parseFloat(data.totalExpensesINR || 0);
        
        if (data.whoPaysWhom && Array.isArray(data.whoPaysWhom)) {
          data.whoPaysWhom.forEach(tx => {
            pendingSettlementsVal += parseFloat(tx.amount || 0);
          });
        }
        
        if (data.members && Array.isArray(data.members)) {
          data.members.forEach(m => {
            uniqueMembers.add(m.name.toLowerCase());
          });
        }
      });
      
      reportsResults.forEach(res => {
        const reportsList = res.data;
        if (Array.isArray(reportsList)) {
          reportsList.forEach(rep => {
            if (rep.status === 'PENDING') {
              totalWarns += rep.anomaliesCount || 0;
            }
          });
        }
      });
      
      setSummaryData({
        totalExpenses: totalExp,
        activeMembers: uniqueMembers.size,
        pendingSettlements: pendingSettlementsVal,
        importWarnings: totalWarns
      });
    } catch (err) {
      console.error('Failed to compute dashboard summaries:', err);
      setError('Failed to fetch dashboard data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    if (!newGroupName) return;

    setCreateLoading(true);
    try {
      const response = await API.post('/groups', {
        name: newGroupName,
        description: newGroupDesc
      });
      setNewGroupName('');
      setNewGroupDesc('');
      setShowCreateModal(false);
      fetchGroupsAndSummarize(); // Refresh dashboard
    } catch (err) {
      console.error(err);
      setError('Failed to create group. Please check connection.');
    } finally {
      setCreateLoading(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Banner Card - Light Mint/Green Gradient */}
      <div className="bg-gradient-to-r from-emerald-50 to-teal-50/70 border border-emerald-100 rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden shadow-sm">
        <div className="absolute -top-20 -right-20 w-48 h-48 bg-emerald-500/5 rounded-full blur-3xl"></div>
        <div className="space-y-2 relative z-10">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-800">
            Welcome back, <span className="text-[#0F8A5F]">{user?.name || 'User'}!</span> 👋
          </h2>
          <p className="text-slate-500 max-w-xl text-sm sm:text-base leading-relaxed">
            Track house expenses, settle flatmate balances, and import spreadsheets instantly. Click on a group to view detailed reports or simplify debts.
          </p>
        </div>

        {/* House Illustration */}
        <svg className="w-52 h-32 text-emerald-600 flex-shrink-0 hidden md:block relative z-10" viewBox="0 0 200 120" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Green hills background */}
          <path d="M-10 120 C 50 80, 100 110, 210 90 L 210 120 L -10 120 Z" fill="#E6F4EA" />
          <path d="M60 120 C 110 90, 150 100, 210 80 L 210 120 L 60 120 Z" fill="#D1FAE5" />
          
          {/* Trees */}
          <circle cx="45" cy="85" r="12" fill="#34D399" />
          <rect x="43" y="95" width="4" height="20" fill="#047857" />
          <circle cx="170" cy="95" r="10" fill="#10B981" />
          <rect x="168" y="103" width="4" height="15" fill="#047857" />
          <circle cx="30" cy="95" r="8" fill="#6EE7B7" />
          <rect x="28" y="101" width="3" height="15" fill="#047857" />

          {/* Modern house */}
          <rect x="85" y="65" width="60" height="45" rx="3" fill="#FFFFFF" stroke="#047857" strokeWidth="2" />
          <polygon points="80,65 115,38 150,65" fill="#0F172A" stroke="#0F172A" strokeWidth="2" strokeLinejoin="round" />
          {/* Chimney */}
          <rect x="95" y="45" width="8" height="15" fill="#0F172A" />
          
          {/* Door */}
          <rect x="108" y="85" width="14" height="25" fill="#0F8A5F" rx="1" />
          <circle cx="119" cy="97" r="1.5" fill="#FBBF24" />
          
          {/* Windows */}
          <rect x="94" y="73" width="10" height="10" fill="#ECFDF5" stroke="#047857" strokeWidth="1.5" rx="1" />
          <rect x="126" y="73" width="10" height="10" fill="#ECFDF5" stroke="#047857" strokeWidth="1.5" rx="1" />
          <line x1="99" y1="73" x2="99" y2="83" stroke="#047857" strokeWidth="1" />
          <line x1="94" y1="78" x2="104" y2="78" stroke="#047857" strokeWidth="1" />
          <line x1="131" y1="73" x2="131" y2="83" stroke="#047857" strokeWidth="1" />
          <line x1="126" y1="78" x2="136" y2="78" stroke="#047857" strokeWidth="1" />
        </svg>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 text-sm">
          {error}
        </div>
      )}

      {/* Summary Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Expenses Card */}
        <div className="glass-panel p-5 flex items-center justify-between shadow-sm">
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Expenses</span>
            <h4 className="text-2xl font-black text-slate-800">
              ₹{summaryData.totalExpenses.toLocaleString('en-IN')}
            </h4>
            <div className="flex items-center gap-1.5 text-xs text-[#0F8A5F] font-bold">
              <span>This Month</span>
              <span>▲ 12.5%</span>
            </div>
          </div>
          <div className="h-12 w-12 rounded-xl bg-[#E6F4EA] flex items-center justify-center text-[#137333] flex-shrink-0">
            {/* Wallet Icon */}
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
          </div>
        </div>

        {/* Active Members Card */}
        <div className="glass-panel p-5 flex items-center justify-between shadow-sm">
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active Members</span>
            <h4 className="text-2xl font-black text-slate-800">{summaryData.activeMembers}</h4>
            <span className="text-xs text-slate-400 font-semibold">Total Members</span>
          </div>
          <div className="h-12 w-12 rounded-xl bg-[#EBF3FE] flex items-center justify-center text-[#1A73E8] flex-shrink-0">
            {/* People Icon */}
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </div>
        </div>

        {/* Pending Settlements Card */}
        <div className="glass-panel p-5 flex items-center justify-between shadow-sm">
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Pending Settlements</span>
            <h4 className="text-2xl font-black text-slate-800">
              ₹{summaryData.pendingSettlements.toLocaleString('en-IN')}
            </h4>
            <span className="text-xs text-slate-400 font-semibold">Across Active Groups</span>
          </div>
          <div className="h-12 w-12 rounded-xl bg-[#FEEFC3] flex items-center justify-center text-[#B06000] flex-shrink-0">
            {/* Settlements Icon */}
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
        </div>

        {/* Import Warnings Card */}
        <div className="glass-panel p-5 flex items-center justify-between shadow-sm">
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Import Warnings</span>
            <h4 className="text-2xl font-black text-slate-800">{summaryData.importWarnings}</h4>
            <span className="text-xs text-slate-400 font-semibold">Review Required</span>
          </div>
          <div className="h-12 w-12 rounded-xl bg-[#F3E8FF] flex items-center justify-center text-[#7E22CE] flex-shrink-0">
            {/* Alerts Icon */}
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
        </div>
      </div>

      {/* Expense Groups Section */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Your Expense Groups</h3>
          {groups.length > 0 && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="glass-btn-primary !px-4 !py-2 text-sm flex items-center gap-1.5"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
              </svg>
              New Group
            </button>
          )}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="glass-panel p-6 h-48 animate-pulse flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="h-6 bg-slate-200 rounded w-3/4"></div>
                  <div className="h-4 bg-slate-200 rounded w-5/6"></div>
                </div>
                <div className="h-8 bg-slate-200 rounded w-1/3"></div>
              </div>
            ))}
          </div>
        ) : groups.length === 0 ? (
          /* Empty State - Dashed Border Panel */
          <div className="border border-dashed border-slate-300 rounded-3xl p-12 text-center bg-white flex flex-col items-center shadow-sm">
            <div className="h-16 w-16 bg-[#E6F4EA] text-[#0F8A5F] rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h4 className="text-xl font-bold text-slate-800 mb-2">No Groups Found</h4>
            <p className="text-slate-500 max-w-sm mb-6 text-sm">
              You are not a member of any expense group yet. Create one above to get started with flatmate sharing.
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="glass-btn-primary flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
              </svg>
              Create Group
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {groups.map(group => (
              <Link
                key={group.id}
                to={`/groups/${group.id}`}
                className="glass-panel glass-panel-hover p-6 flex flex-col justify-between h-48 cursor-pointer relative group"
              >
                <div>
                  <h4 className="text-xl font-extrabold text-slate-800 group-hover:text-[#0F8A5F] transition-colors mb-2">
                    {group.name}
                  </h4>
                  <p className="text-slate-500 text-sm line-clamp-3">
                    {group.description || 'No description provided.'}
                  </p>
                </div>
                <div className="flex items-center text-[#0F8A5F] text-sm font-semibold mt-4 gap-1">
                  View Dashboard
                  <svg className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Create Group Modal Overlay */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white border border-[#E2E8F0] shadow-xl rounded-3xl p-6 relative">
            <button
              onClick={() => setShowCreateModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-800"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <h3 className="text-2xl font-bold text-slate-800 mb-6">Create Expense Group</h3>

            <form onSubmit={handleCreateGroup} className="space-y-4">
              <div className="flex flex-col">
                <label className="text-sm font-semibold text-slate-600 mb-1">Group Name</label>
                <input
                  type="text"
                  placeholder="e.g. Flat 402, Summer Trip"
                  className="glass-input"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  required
                />
              </div>

              <div className="flex flex-col">
                <label className="text-sm font-semibold text-slate-600 mb-1">Description (Optional)</label>
                <textarea
                  placeholder="Describe your household shares or details..."
                  className="glass-input h-24 resize-none"
                  value={newGroupDesc}
                  onChange={(e) => setNewGroupDesc(e.target.value)}
                />
              </div>

              <div className="flex gap-4 mt-6">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="w-1/2 glass-btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createLoading || !newGroupName}
                  className="w-1/2 glass-btn-primary"
                >
                  {createLoading ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
