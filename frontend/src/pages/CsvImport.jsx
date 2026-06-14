import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import API from '../services/api';

const CsvImport = () => {
  const { id: groupId } = useParams();
  const navigate = useNavigate();

  // Core Data States
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Active Import Session States
  const [currentReport, setCurrentReport] = useState(null);
  const [anomalies, setAnomalies] = useState([]);
  const [allResolved, setAllResolved] = useState(false);

  // Edit Modal States
  const [editingAnomaly, setEditingAnomaly] = useState(null); // anomaly object being edited
  const [editRowData, setEditRowData] = useState(null); // parsed JSON of rawData

  // Historical Reports List
  const [historicalReports, setHistoricalReports] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  useEffect(() => {
    fetchHistory();
  }, [groupId]);

  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      const res = await API.get(`/import/group/${groupId}/reports`);
      setHistoricalReports(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const checkAllResolved = (anomList) => {
    const pending = anomList.filter(a => a.status === 'PENDING');
    setAllResolved(pending.length === 0);
  };

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setError('');
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) return;

    setUploading(true);
    setError('');
    setSuccess('');
    setCurrentReport(null);
    setAnomalies([]);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await API.post(`/import/group/${groupId}/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      setCurrentReport(res.data);
      const sortedAnom = (res.data.Anomalies || []).sort((a, b) => a.rowNumber - b.rowNumber);
      setAnomalies(sortedAnom);
      checkAllResolved(sortedAnom);
      setSuccess('CSV file uploaded and analyzed.');
      fetchHistory();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to parse CSV. Please verify columns.');
    } finally {
      setUploading(false);
    }
  };

  const handleResolveAnomalyStatus = async (anomalyId, status, resolvedAction = null) => {
    setError('');
    try {
      const res = await API.post(`/import/anomalies/${anomalyId}/resolve`, {
        status,
        resolvedAction
      });

      // Update local state
      const updatedAnomalies = anomalies.map(a => {
        if (a.id === parseInt(anomalyId)) {
          return res.data.anomaly;
        }
        return a;
      });

      setAnomalies(updatedAnomalies);
      checkAllResolved(updatedAnomalies);

      if (res.data.allResolved) {
        setSuccess('All anomalies resolved. Ready to commit import.');
      }
    } catch (err) {
      console.error(err);
      setError('Failed to resolve anomaly.');
    }
  };

  // Open Edit Row Modal
  const handleOpenEditModal = (anomaly) => {
    setEditingAnomaly(anomaly);
    try {
      // Parse rawData string
      let rawJson = JSON.parse(anomaly.rawData || '{}');
      
      // If already resolved by edit, load editedData
      if (anomaly.status === 'RESOLVED' && anomaly.resolvedAction?.startsWith('EDITED:')) {
        rawJson = JSON.parse(anomaly.resolvedAction.replace('EDITED:', ''));
      }
      
      setEditRowData({
        Date: rawJson.Date || '',
        Description: rawJson.Description || '',
        Amount: rawJson.Amount || '',
        Currency: rawJson.Currency || 'INR',
        'Paid By': rawJson['Paid By'] || '',
        Participants: rawJson.Participants || '',
        'Split Type': rawJson['Split Type'] || 'EQUAL',
        'Is Settlement': rawJson['Is Settlement'] || 'No'
      });
    } catch (err) {
      console.error('Failed to parse raw data JSON', err);
      setEditRowData({
        Date: '', Description: '', Amount: '', Currency: 'INR',
        'Paid By': '', Participants: '', 'Split Type': 'EQUAL', 'Is Settlement': 'No'
      });
    }
  };

  const handleSaveEditRow = (e) => {
    e.preventDefault();
    if (!editingAnomaly) return;
    
    // Save as resolvedAction with prefix 'EDITED:'
    const stringified = JSON.stringify(editRowData);
    handleResolveAnomalyStatus(editingAnomaly.id, 'RESOLVED', `EDITED:${stringified}`);
    setEditingAnomaly(null);
    setEditRowData(null);
  };

  const handleCommitImport = async () => {
    if (!currentReport) return;
    setError('');
    setSuccess('');
    try {
      const res = await API.post(`/import/reports/${currentReport.id}/commit`);
      setSuccess(`Import finalized: ${res.data.importedRows} records successfully written to ledger.`);
      
      // Clear session after 2 seconds and redirect
      setTimeout(() => {
        navigate(`/groups/${groupId}`);
      }, 2000);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to commit import. Make sure high-severity alerts are resolved.');
    }
  };

  const handleSelectReportFromHistory = async (report) => {
    setError('');
    setSuccess('');
    setCurrentReport(report);
    try {
      const res = await API.get(`/import/reports/${report.id}/anomalies`);
      const sortedAnom = res.data.sort((a, b) => a.rowNumber - b.rowNumber);
      setAnomalies(sortedAnom);
      checkAllResolved(sortedAnom);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch anomalies.');
    }
  };

  return (
    <div className="min-h-screen pb-16">
      {/* Navigation Header */}
      <header className="border-b border-darkBorder/60 bg-darkCard/50 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/dashboard" className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <span className="h-8 w-8 bg-brandAccent rounded-lg flex items-center justify-center text-darkBg font-black">S</span>
            Shared Expenses <span className="text-brandAccent">Manager</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link to={`/groups/${groupId}`} className="glass-btn-secondary text-sm !px-4 !py-2">
              Back to Group details
            </Link>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        <div className="text-center md:text-left mb-8">
          <h2 className="text-3xl font-extrabold text-white mb-2">CSV Import Engine</h2>
          <p className="text-gray-400 text-sm max-w-2xl">
            Upload your `expenses_export.csv` spreadsheet directly. The system validates split amounts, membership dates, currency rates, and flags anomalies for review before committing to your ledger.
          </p>
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Panel: Upload Zone & History */}
          <div className="space-y-8 lg:col-span-1">
            {/* Upload form */}
            <div className="glass-panel p-6">
              <h3 className="text-lg font-bold text-white mb-4">Upload Spreadsheet</h3>
              <form onSubmit={handleUpload} className="space-y-4">
                <div className="border border-dashed border-darkBorder hover:border-gray-500 rounded-xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-colors relative">
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleFileChange}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                  <svg className="w-10 h-10 text-gray-500 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <span className="text-sm font-semibold text-gray-300">
                    {file ? file.name : 'Select CSV file'}
                  </span>
                  <span className="text-xs text-gray-500 mt-1">Maximum size: 5MB</span>
                </div>

                <button
                  type="submit"
                  disabled={uploading || !file}
                  className="w-full glass-btn-primary"
                >
                  {uploading ? 'Processing & Validating...' : 'Analyze CSV'}
                </button>
              </form>
            </div>

            {/* History of imports */}
            <div className="glass-panel p-6">
              <h3 className="text-lg font-bold text-white mb-4">Historical Imports</h3>

              {loadingHistory ? (
                <div className="space-y-3">
                  {[1, 2].map(i => (
                    <div key={i} className="h-10 bg-darkBorder/40 animate-pulse rounded-lg"></div>
                  ))}
                </div>
              ) : historicalReports.length === 0 ? (
                <div className="text-center text-gray-500 text-sm py-4">No imports registered yet.</div>
              ) : (
                <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                  {historicalReports.map(rep => {
                    const statusColor = rep.status === 'PROCESSED' ? 'text-emerald-400 bg-emerald-500/10' : 'text-amber-400 bg-amber-500/10';
                    return (
                      <div
                        key={rep.id}
                        onClick={() => handleSelectReportFromHistory(rep)}
                        className={`p-3 rounded-lg border text-left cursor-pointer transition-all hover:bg-darkCard/50 ${currentReport?.id === rep.id ? 'border-brandAccent bg-brandAccent/5' : 'border-darkBorder/40'}`}
                      >
                        <div className="font-semibold text-xs text-white truncate">{rep.fileName}</div>
                        <div className="flex justify-between items-center mt-2 text-[10px] text-gray-500">
                          <span>Rows: {rep.totalRows} | Errors: {rep.anomaliesCount}</span>
                          <span className={`px-1.5 py-0.5 rounded font-black uppercase ${statusColor}`}>{rep.status}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right Panel: Anomalies Review */}
          <div className="lg:col-span-2 space-y-6">
            {currentReport ? (
              <div className="glass-panel p-6">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center border-b border-darkBorder/60 pb-4 mb-6 gap-4">
                  <div>
                    <h3 className="text-xl font-bold text-white">Review Import Anomalies</h3>
                    <p className="text-xs text-gray-400 mt-1">File: {currentReport.fileName} | Rows: {currentReport.totalRows}</p>
                  </div>
                  <button
                    onClick={handleCommitImport}
                    disabled={!allResolved}
                    className="glass-btn-primary self-start sm:self-center disabled:opacity-50"
                  >
                    Commit Import Ledger
                  </button>
                </div>

                {anomalies.length === 0 ? (
                  <div className="p-8 text-center text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 rounded-xl">
                    <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <h4 className="font-bold">No anomalies detected!</h4>
                    <p className="text-xs text-emerald-300/80 mt-1">This file is fully sanitized. Your expenses are already committed.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {anomalies.map(anom => {
                      // Severity badge color
                      let badgeColor = 'bg-blue-500/20 text-blue-400';
                      if (anom.severity === 'HIGH') badgeColor = 'bg-rose-500/20 text-rose-400';
                      if (anom.severity === 'MEDIUM') badgeColor = 'bg-amber-500/20 text-amber-400';

                      // Status check
                      const isPending = anom.status === 'PENDING';
                      
                      return (
                        <div key={anom.id} className={`p-4 rounded-xl border transition-all ${isPending ? 'bg-darkBg/60 border-darkBorder' : 'bg-darkCard/30 border-darkBorder/30 opacity-70'}`}>
                          <div className="flex justify-between items-start mb-2 gap-4">
                            <div>
                              <span className="font-mono text-xs font-bold text-gray-500 mr-2">Row {anom.rowNumber}</span>
                              <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border border-current ${badgeColor}`}>
                                {anom.severity} Alert
                              </span>
                              <span className="text-xs font-black bg-darkCard px-2 py-0.5 rounded ml-2 text-gray-300">
                                {anom.anomalyType}
                              </span>
                            </div>
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                              Status: {anom.status}
                            </span>
                          </div>

                          <p className="text-sm text-gray-300 mb-4">{anom.description}</p>
                          {anom.resolvedAction && (
                            <div className="text-xs text-emerald-400 bg-emerald-500/10 p-2 rounded-lg mb-4 truncate">
                              Action: {anom.resolvedAction}
                            </div>
                          )}

                          {isPending && (
                            <div className="flex flex-wrap gap-2 justify-end">
                              <button
                                onClick={() => handleResolveAnomalyStatus(anom.id, 'IGNORED', 'Skipped row from database write')}
                                className="text-xs text-gray-400 hover:text-white font-semibold bg-darkBg border border-darkBorder px-2.5 py-1.5 rounded-lg"
                              >
                                Ignore Row
                              </button>

                              {anom.anomalyType === 'DUPLICATE_EXPENSE' && (
                                <button
                                  onClick={() => handleResolveAnomalyStatus(anom.id, 'APPROVED', 'Forced duplicate import')}
                                  className="text-xs text-emerald-400 hover:bg-emerald-500 hover:text-darkBg border border-emerald-500/30 transition-colors px-2.5 py-1.5 rounded-lg font-semibold"
                                >
                                  Approve Duplicate
                                </button>
                              )}

                              {['INVALID_DATE', 'MALFORMED_SPLIT_INFO', 'UNKNOWN_PARTICIPANT', 'MEMBERSHIP_VIOLATION'].includes(anom.anomalyType) && (
                                <button
                                  onClick={() => handleOpenEditModal(anom)}
                                  className="text-xs text-brandAccent hover:bg-brandAccent hover:text-darkBg border border-brandAccent/30 transition-colors px-2.5 py-1.5 rounded-lg font-semibold"
                                >
                                  Edit Row Details
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              <div className="glass-panel p-12 text-center text-gray-500 flex flex-col items-center border border-dashed border-darkBorder">
                <svg className="w-16 h-16 text-gray-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <h4 className="text-lg font-bold text-white mb-2">No Active File Selected</h4>
                <p className="text-sm text-gray-400 max-w-sm">
                  Upload a new CSV spreadsheet on the left or select a historical pending import to review its errors.
                </p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* EDIT ROW DETAIL MODAL OVERLAY */}
      {editingAnomaly && editRowData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-darkBg/80 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-lg glass-panel p-6 relative my-8">
            <button
              onClick={() => { setEditingAnomaly(null); setEditRowData(null); }}
              className="absolute top-4 right-4 text-gray-400 hover:text-white"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <h3 className="text-2xl font-bold text-white mb-1">Correct Row Data</h3>
            <p className="text-xs text-gray-400 mb-6 font-mono">Anomaly on row {editingAnomaly.rowNumber}</p>

            <form onSubmit={handleSaveEditRow} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col">
                  <label className="text-xs text-gray-400 mb-1">Date (YYYY-MM-DD)</label>
                  <input
                    type="text"
                    className="glass-input text-sm"
                    value={editRowData.Date}
                    onChange={(e) => setEditRowData({ ...editRowData, Date: e.target.value })}
                    required
                  />
                </div>
                <div className="flex flex-col">
                  <label className="text-xs text-gray-400 mb-1">Description</label>
                  <input
                    type="text"
                    className="glass-input text-sm"
                    value={editRowData.Description}
                    onChange={(e) => setEditRowData({ ...editRowData, Description: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="flex flex-col col-span-2">
                  <label className="text-xs text-gray-400 mb-1">Amount</label>
                  <input
                    type="number"
                    step="any"
                    className="glass-input text-sm"
                    value={editRowData.Amount}
                    onChange={(e) => setEditRowData({ ...editRowData, Amount: e.target.value })}
                    required
                  />
                </div>
                <div className="flex flex-col">
                  <label className="text-xs text-gray-400 mb-1">Currency</label>
                  <input
                    type="text"
                    className="glass-input text-sm"
                    value={editRowData.Currency}
                    onChange={(e) => setEditRowData({ ...editRowData, Currency: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col">
                  <label className="text-xs text-gray-400 mb-1">Paid By (Payer Name)</label>
                  <input
                    type="text"
                    className="glass-input text-sm"
                    value={editRowData['Paid By']}
                    onChange={(e) => setEditRowData({ ...editRowData, 'Paid By': e.target.value })}
                    required
                  />
                </div>
                <div className="flex flex-col">
                  <label className="text-xs text-gray-400 mb-1">Split Type (EQUAL/PERCENT/EXACT/WEIGHT)</label>
                  <input
                    type="text"
                    className="glass-input text-sm"
                    value={editRowData['Split Type']}
                    onChange={(e) => setEditRowData({ ...editRowData, 'Split Type': e.target.value.toUpperCase() })}
                    required
                  />
                </div>
              </div>

              <div className="flex flex-col">
                <label className="text-xs text-gray-400 mb-1">Participants Splits (e.g. Alice:30, Bob:70)</label>
                <input
                  type="text"
                  className="glass-input text-sm"
                  value={editRowData.Participants}
                  onChange={(e) => setEditRowData({ ...editRowData, Participants: e.target.value })}
                  required
                />
              </div>

              <div className="flex flex-col">
                <label className="text-xs text-gray-400 mb-1">Is Settlement (Yes/No)</label>
                <input
                  type="text"
                  className="glass-input text-sm"
                  value={editRowData['Is Settlement']}
                  onChange={(e) => setEditRowData({ ...editRowData, 'Is Settlement': e.target.value })}
                />
              </div>

              <div className="flex gap-4 mt-6">
                <button
                  type="button"
                  onClick={() => { setEditingAnomaly(null); setEditRowData(null); }}
                  className="w-1/2 glass-btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-1/2 glass-btn-primary"
                >
                  Validate & Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CsvImport;
