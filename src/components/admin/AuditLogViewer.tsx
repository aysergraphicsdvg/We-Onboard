import React, { useState } from 'react';
import { ShieldAlert, Search, Download, RefreshCw, CheckCircle2 } from 'lucide-react';
import { store, exportToCsv } from '../../services/store';

export const AuditLogViewer: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');

  const auditLogs = store.getState().auditLogs;

  const filteredLogs = auditLogs.filter((l) => {
    const matchesSearch = 
      l.actingUser.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.recordId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.details.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType = typeFilter === 'All' || l.recordType === typeFilter;
    return matchesSearch && matchesType;
  });

  const handleExportCsv = () => {
    const rows = filteredLogs.map((l) => ({
      'Log ID': l.id,
      'Acting User': l.actingUser,
      'Action': l.action,
      'Record Type': l.recordType,
      'Record ID': l.recordId,
      'Details': l.details,
      'IP Address': l.ipAddress || '127.0.0.1',
      'Timestamp': l.timestamp
    }));
    exportToCsv('WeOnboard_Security_Audit_Logs', rows);
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-[#02167F]">
            Immutable Security Audit Logs
          </h2>
          <p className="text-xs text-slate-500">
            Chronological audit trail of user authentications, status changes, assignments, and CMS releases.
          </p>
        </div>

        <button
          onClick={handleExportCsv}
          className="bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold px-3 py-2 rounded-lg text-xs flex items-center gap-1.5 shadow-xs self-start sm:self-auto"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export Audit CSV</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by acting user, action, record ID, or details..."
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-[#02167F]"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="font-bold text-slate-600">Category:</span>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-medium"
          >
            <option value="All">All Categories ({auditLogs.length})</option>
            <option value="Auth">Auth & Logins</option>
            <option value="Enquiry">Enquiries</option>
            <option value="Freelancer">Freelancer Operations</option>
            <option value="Project">Projects & Tasks</option>
            <option value="CMS">CMS Releases</option>
            <option value="MSME">MSME Desk</option>
            <option value="Client">Clients</option>
          </select>
        </div>
      </div>

      {/* Audit Logs Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3">Timestamp</th>
                <th className="px-4 py-3">Acting User</th>
                <th className="px-4 py-3">Action Description</th>
                <th className="px-4 py-3">Record Scope</th>
                <th className="px-4 py-3">Technical Details</th>
                <th className="px-4 py-3">IP Address</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-mono text-slate-500 text-[11px] whitespace-nowrap">
                    {log.timestamp}
                  </td>
                  <td className="px-4 py-3 font-bold text-slate-900 whitespace-nowrap">
                    {log.actingUser}
                  </td>
                  <td className="px-4 py-3 text-[#02167F] font-bold">
                    {log.action}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="font-mono text-[10px] bg-slate-100 px-2 py-0.5 rounded text-slate-700 font-bold">
                      {log.recordType}: {log.recordId}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600 max-w-xs truncate">
                    {log.details}
                  </td>
                  <td className="px-4 py-3 font-mono text-[10px] text-slate-400 whitespace-nowrap">
                    {log.ipAddress}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
