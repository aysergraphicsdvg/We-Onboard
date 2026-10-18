import React, { useState } from 'react';
import { 
  Building2, 
  Search, 
  Download, 
  CheckSquare, 
  Square, 
  Clock, 
  CheckCircle2, 
  Phone, 
  Mail, 
  X,
  FileCheck
} from 'lucide-react';
import { store, exportToCsv } from '../../services/store';
import { MsmeRequest, MsmeStatus } from '../../types';

export const MsmeManager: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [selectedReq, setSelectedReq] = useState<MsmeRequest | null>(null);

  const [noteText, setNoteText] = useState('');
  const [newStatus, setNewStatus] = useState<MsmeStatus>('New');

  const msmeRequests = store.getState().msmeRequests;

  const filtered = msmeRequests.filter((m) => {
    const matchesSearch = 
      m.businessName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.applicantName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.phone.includes(searchTerm) ||
      m.id.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'All' || m.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleToggleDoc = (reqId: string, idx: number) => {
    store.toggleMsmeDocument(reqId, idx);
    const updated = store.getState().msmeRequests.find((r) => r.id === reqId);
    if (updated) setSelectedReq(updated);
  };

  const handleUpdateStatus = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReq) return;
    store.updateMsmeStatus(selectedReq.id, newStatus, noteText.trim() || undefined);
    setNoteText('');
    const updated = store.getState().msmeRequests.find((r) => r.id === selectedReq.id);
    if (updated) setSelectedReq(updated);
    alert(`MSME request ${selectedReq.id} updated!`);
  };

  const handleExportCsv = () => {
    const rows = filtered.map((m) => ({
      'Request ID': m.id,
      'Business Name': m.businessName,
      'Applicant': m.applicantName,
      'Phone': m.phone,
      'Email': m.email,
      'City': m.city,
      'Category': m.category,
      'Services': m.requestedServices.join(', '),
      'Status': m.status,
      'Fee Disclosed (INR)': m.disclosedAssistanceFee,
      'Submitted Date': m.submittedAt
    }));
    exportToCsv('WeOnboard_MSME_Requests', rows);
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-[#02167F]">
            MSME Support Desk Management
          </h2>
          <p className="text-xs text-slate-500">
            Process Udyam, GST, FSSAI, GeM and ONDC registration assistance requests.
          </p>
        </div>

        <button
          onClick={handleExportCsv}
          className="bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold px-3 py-2 rounded-lg text-xs flex items-center gap-1.5 shadow-xs self-start sm:self-auto"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export MSME CSV</span>
        </button>
      </div>

      {/* Filter and Search */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search business name, applicant, or phone..."
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-[#02167F]"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="font-bold text-slate-600">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-medium"
          >
            <option value="All">All Statuses ({msmeRequests.length})</option>
            <option value="New">New</option>
            <option value="Contacted">Contacted</option>
            <option value="Eligibility Review">Eligibility Review</option>
            <option value="Documents Pending">Documents Pending</option>
            <option value="In Progress">In Progress</option>
            <option value="Awaiting External Authority">Awaiting External Authority</option>
            <option value="Completed">Completed</option>
          </select>
        </div>
      </div>

      {/* MSME Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3">Tracking ID</th>
                <th className="px-4 py-3">Business & Owner</th>
                <th className="px-4 py-3">Category & City</th>
                <th className="px-4 py-3">Requested Services</th>
                <th className="px-4 py-3">Assistance Fee</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filtered.map((req) => (
                <tr key={req.id} className="hover:bg-blue-50/40 transition-colors">
                  <td className="px-4 py-3 font-mono font-bold text-[#02167F]">
                    {req.id}
                  </td>
                  <td className="px-4 py-3">
                    <strong className="text-slate-900 block font-bold">{req.businessName}</strong>
                    <span className="text-slate-500">{req.applicantName} &bull; {req.phone}</span>
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    <span className="font-semibold">{req.category}</span>
                    <span className="text-slate-400 block text-[11px]">{req.city}, {req.state}</span>
                  </td>
                  <td className="px-4 py-3 text-slate-600 text-[11px]">
                    {req.requestedServices.join(', ')}
                  </td>
                  <td className="px-4 py-3 font-mono font-bold text-slate-800">
                    ₹{req.disclosedAssistanceFee.toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      req.status === 'Completed' ? 'bg-emerald-100 text-emerald-800' :
                      req.status === 'In Progress' ? 'bg-blue-100 text-blue-800' :
                      req.status === 'New' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'
                    }`}>
                      {req.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => {
                        setSelectedReq(req);
                        setNewStatus(req.status);
                      }}
                      className="bg-[#02167F] hover:bg-[#031d99] text-white text-[11px] font-bold px-3 py-1 rounded transition-colors"
                    >
                      Process & Checklist
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MSME Detail Drawer */}
      {selectedReq && (
        <div className="fixed inset-0 z-50 bg-[#02167F]/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 sm:p-8 max-h-[90vh] overflow-y-auto relative shadow-2xl border border-slate-200 animate-in zoom-in-95 space-y-4">
            <button onClick={() => setSelectedReq(null)} className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-700">
              <X className="w-5 h-5" />
            </button>

            <div>
              <span className="font-mono text-xs font-bold text-slate-500 block">
                MSME Ref: {selectedReq.id}
              </span>
              <h3 className="text-xl font-extrabold text-[#02167F]">
                {selectedReq.businessName}
              </h3>
              <span className="text-xs text-slate-600 font-semibold">
                {selectedReq.applicantName} &bull; {selectedReq.phone} &bull; {selectedReq.city}
              </span>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-1">
              <strong className="text-slate-700 block">Requirements Description:</strong>
              <p className="text-slate-800">{selectedReq.description}</p>
            </div>

            {/* Statutory Documents Checklist */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Required Statutory Document Checklist
              </h4>
              <div className="space-y-1.5">
                {selectedReq.requiredDocumentsChecklist.map((doc, idx) => (
                  <div
                    key={idx}
                    onClick={() => handleToggleDoc(selectedReq.id, idx)}
                    className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer text-xs"
                  >
                    <span className="font-medium text-slate-800">{doc.document}</span>
                    <span className={`flex items-center gap-1 font-bold ${doc.received ? 'text-emerald-700' : 'text-slate-400'}`}>
                      {doc.received ? <CheckSquare className="w-4 h-4 text-emerald-600" /> : <Square className="w-4 h-4" />}
                      <span>{doc.received ? 'Received' : 'Pending'}</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Status Update Form */}
            <form onSubmit={handleUpdateStatus} className="space-y-3 pt-2 border-t border-slate-100">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Update Status</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as MsmeStatus)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs bg-white font-bold"
                >
                  <option value="New">New</option>
                  <option value="Contacted">Contacted</option>
                  <option value="Eligibility Review">Eligibility Review</option>
                  <option value="Documents Pending">Documents Pending</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Awaiting External Authority">Awaiting External Authority</option>
                  <option value="Completed">Completed</option>
                  <option value="On Hold">On Hold</option>
                  <option value="Closed">Closed</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Add Desk Note</label>
                <input
                  type="text"
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder="e.g. Sent Udyam verification OTP to applicant..."
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button type="button" onClick={() => setSelectedReq(null)} className="px-4 py-2 text-xs font-bold text-slate-600">
                  Close
                </button>
                <button type="submit" className="bg-[#02167F] text-[#FFD014] font-bold px-5 py-2 rounded-lg text-xs">
                  Save MSME Status
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
