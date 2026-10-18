import React, { useState } from 'react';
import { 
  Search, 
  Filter, 
  Download, 
  Phone, 
  Mail, 
  MessageSquare, 
  UserCheck, 
  Calendar, 
  FileText, 
  CheckCircle2, 
  X, 
  ArrowRight,
  Plus,
  ArrowUpRight
} from 'lucide-react';
import { store, exportToCsv } from '../../services/store';
import { Enquiry, EnquiryStatus } from '../../types';

export const EnquiryManager: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [serviceFilter, setServiceFilter] = useState<string>('All');
  const [selectedEnquiry, setSelectedEnquiry] = useState<Enquiry | null>(null);

  // Detail Modal Actions
  const [noteText, setNoteText] = useState('');
  const [newStatus, setNewStatus] = useState<EnquiryStatus>('New');
  const [assignedStaff, setAssignedStaff] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  const [proposalValue, setProposalValue] = useState<number>(0);
  const [callOutcome, setCallOutcome] = useState('');

  const enquiries = store.getState().enquiries;
  const adminUsers = store.getState().adminUsers;

  const filteredEnquiries = enquiries.filter((e) => {
    const matchesSearch = 
      e.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (e.companyName && e.companyName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      e.phone.includes(searchTerm) ||
      e.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.id.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'All' || e.status === statusFilter;
    const matchesService = serviceFilter === 'All' || e.serviceRequired.includes(serviceFilter);

    return matchesSearch && matchesStatus && matchesService;
  });

  const handleOpenDetail = (enq: Enquiry) => {
    setSelectedEnquiry(enq);
    setNewStatus(enq.status);
    setAssignedStaff(enq.assignedStaff || '');
    setFollowUpDate(enq.followUpDate || '');
    setProposalValue(enq.proposalValue || 0);
    setCallOutcome(enq.callOutcome || '');
  };

  const handleSaveDetail = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEnquiry) return;

    store.updateEnquiryStatus(selectedEnquiry.id, newStatus, followUpDate, proposalValue);
    if (assignedStaff) {
      store.assignEnquiry(selectedEnquiry.id, assignedStaff);
    }
    if (noteText.trim()) {
      store.addEnquiryNote(selectedEnquiry.id, noteText.trim());
      setNoteText('');
    }

    // Refresh selected record
    const updated = store.getState().enquiries.find((enq) => enq.id === selectedEnquiry.id);
    if (updated) setSelectedEnquiry(updated);
    alert(`Enquiry ${selectedEnquiry.id} updated successfully!`);
  };

  const handleConvertToClient = () => {
    if (!selectedEnquiry) return;
    const client = store.convertEnquiryToClient(selectedEnquiry.id);
    if (client) {
      alert(`Enquiry ${selectedEnquiry.id} converted into Client: ${client.companyName} (${client.id})`);
      const updated = store.getState().enquiries.find((enq) => enq.id === selectedEnquiry.id);
      if (updated) setSelectedEnquiry(updated);
    }
  };

  const handleExportCsv = () => {
    const rows = filteredEnquiries.map((e) => ({
      'Enquiry ID': e.id,
      'Full Name': e.fullName,
      'Company Name': e.companyName || 'N/A',
      'Phone': e.phone,
      'Email': e.email,
      'Type': e.enquiryType,
      'City': e.city,
      'Service Required': e.serviceRequired,
      'Status': e.status,
      'Assigned Staff': e.assignedStaff || 'Unassigned',
      'Proposal Value (INR)': e.proposalValue || 0,
      'Follow Up Date': e.followUpDate || 'None',
      'Submitted At': e.submittedAt
    }));
    exportToCsv('WeOnboard_Enquiries', rows);
  };

  const getWhatsAppLink = (enq: Enquiry) => {
    const text = encodeURIComponent(
      `Hello ${enq.fullName}, this is ${store.getState().currentAdmin?.name || 'We Onboard'} following up on your enquiry for ${enq.serviceRequired} [${enq.id}]. How can we assist you?`
    );
    return `https://wa.me/${enq.phone.replace(/[^0-9]/g, '')}?text=${text}`;
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-[#02167F]">
            Enquiry Management System
          </h2>
          <p className="text-xs text-slate-500">
            Track, assign and convert business and freelancer inbound enquiries.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCsv}
            className="bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold px-3 py-2 rounded-lg text-xs flex items-center gap-1.5 shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        
        {/* Search Input */}
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name, company, phone, email, or ID..."
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-[#02167F] focus:outline-none"
          />
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-2">
          <span className="font-bold text-slate-600">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-medium"
          >
            <option value="All">All Statuses ({enquiries.length})</option>
            <option value="New">New</option>
            <option value="Contacted">Contacted</option>
            <option value="Qualified">Qualified</option>
            <option value="Proposal Sent">Proposal Sent</option>
            <option value="Follow-up Required">Follow-up Required</option>
            <option value="Converted">Converted</option>
            <option value="Closed — Not Converted">Closed — Not Converted</option>
            <option value="Spam">Spam</option>
          </select>
        </div>

        {/* Service Filter */}
        <div className="flex items-center gap-2">
          <span className="font-bold text-slate-600">Service:</span>
          <select
            value={serviceFilter}
            onChange={(e) => setServiceFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-medium"
          >
            <option value="All">All Services</option>
            <option value="Rider">Rider Onboarding</option>
            <option value="Merchant">Merchant Onboarding</option>
            <option value="Audits">Field Audits</option>
            <option value="MSME">MSME Support</option>
            <option value="Franchise">Franchise & Dealership</option>
          </select>
        </div>

      </div>

      {/* Enquiries Data Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3">Ref ID</th>
                <th className="px-4 py-3">Prospect & Contact</th>
                <th className="px-4 py-3">Service Required</th>
                <th className="px-4 py-3">City</th>
                <th className="px-4 py-3">Assigned Staff</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3 text-right">Quick Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredEnquiries.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400">
                    No enquiries match your search and filter criteria.
                  </td>
                </tr>
              ) : (
                filteredEnquiries.map((enq) => (
                  <tr key={enq.id} className="hover:bg-blue-50/40 transition-colors">
                    
                    {/* ID */}
                    <td className="px-4 py-3 font-mono font-bold text-[#02167F]">
                      <button
                        onClick={() => handleOpenDetail(enq)}
                        className="hover:underline text-left cursor-pointer"
                      >
                        {enq.id}
                      </button>
                    </td>

                    {/* Prospect Info */}
                    <td className="px-4 py-3">
                      <strong className="text-slate-900 block font-bold">{enq.fullName}</strong>
                      <span className="text-slate-500">{enq.companyName ? `${enq.companyName} • ` : ''}{enq.phone}</span>
                    </td>

                    {/* Service */}
                    <td className="px-4 py-3 text-slate-700">
                      <span className="font-semibold">{enq.serviceRequired}</span>
                      <span className="text-[10px] text-slate-400 block">{enq.enquiryType}</span>
                    </td>

                    {/* City */}
                    <td className="px-4 py-3 text-slate-600">
                      {enq.city}
                    </td>

                    {/* Assigned */}
                    <td className="px-4 py-3">
                      {enq.assignedStaff ? (
                        <span className="bg-slate-100 text-slate-800 px-2 py-0.5 rounded font-semibold text-[11px]">
                          {enq.assignedStaff}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">Unassigned</span>
                      )}
                    </td>

                    {/* Status Badge */}
                    <td className="px-4 py-3">
                      <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                        enq.status === 'New' ? 'bg-amber-100 text-amber-800' :
                        enq.status === 'Contacted' ? 'bg-sky-100 text-sky-800' :
                        enq.status === 'Qualified' ? 'bg-blue-100 text-blue-800' :
                        enq.status === 'Proposal Sent' ? 'bg-purple-100 text-purple-800' :
                        enq.status === 'Converted' ? 'bg-emerald-100 text-emerald-800' :
                        'bg-slate-100 text-slate-700'
                      }`}>
                        {enq.status}
                      </span>
                    </td>

                    {/* Date */}
                    <td className="px-4 py-3 font-mono text-slate-500 text-[11px]">
                      {enq.submittedAt}
                    </td>

                    {/* Quick Action Buttons */}
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <a
                          href={`tel:${enq.phone.replace(/\s+/g, '')}`}
                          className="p-1.5 text-slate-600 hover:text-[#02167F] hover:bg-slate-100 rounded"
                          title="Call Prospect"
                        >
                          <Phone className="w-3.5 h-3.5" />
                        </a>
                        <a
                          href={getWhatsAppLink(enq)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded"
                          title="Open WhatsApp"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                        </a>
                        <button
                          onClick={() => handleOpenDetail(enq)}
                          className="bg-[#02167F] hover:bg-[#031d99] text-white text-[11px] font-bold px-2.5 py-1 rounded transition-colors"
                        >
                          Manage
                        </button>
                      </div>
                    </td>

                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detailed Enquiry Management Drawer / Modal */}
      {selectedEnquiry && (
        <div className="fixed inset-0 z-50 bg-[#02167F]/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 sm:p-8 max-h-[90vh] overflow-y-auto relative shadow-2xl border border-slate-200 animate-in zoom-in-95 space-y-6">
            
            <button
              onClick={() => setSelectedEnquiry(null)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-700 rounded-full"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Modal Header */}
            <div className="flex items-start justify-between pr-8 border-b border-slate-100 pb-4">
              <div>
                <span className="font-mono text-xs font-bold text-slate-500 block">
                  Enquiry Reference: {selectedEnquiry.id}
                </span>
                <h3 className="text-xl font-extrabold text-[#02167F]">
                  {selectedEnquiry.fullName}
                </h3>
                <span className="text-xs text-slate-600 font-semibold">
                  {selectedEnquiry.companyName || 'Individual / Freelance Inbound'} &bull; {selectedEnquiry.city}
                </span>
              </div>

              {selectedEnquiry.status !== 'Converted' && (
                <button
                  onClick={handleConvertToClient}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 shadow-sm"
                >
                  <ArrowUpRight className="w-3.5 h-3.5" />
                  <span>Convert to Active Client</span>
                </button>
              )}
            </div>

            {/* Message Body */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs space-y-1">
              <span className="text-slate-500 font-bold uppercase tracking-wider block">Submitted Requirement</span>
              <p className="text-slate-800 text-sm leading-relaxed">{selectedEnquiry.message}</p>
            </div>

            {/* Action Form */}
            <form onSubmit={handleSaveDetail} className="space-y-4">
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Update Status</label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value as EnquiryStatus)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs bg-white font-semibold"
                  >
                    <option value="New">New</option>
                    <option value="Contacted">Contacted</option>
                    <option value="Qualified">Qualified</option>
                    <option value="Proposal Sent">Proposal Sent</option>
                    <option value="Follow-up Required">Follow-up Required</option>
                    <option value="Converted">Converted</option>
                    <option value="Closed — Not Converted">Closed — Not Converted</option>
                    <option value="Spam">Spam</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Assign to Staff</label>
                  <select
                    value={assignedStaff}
                    onChange={(e) => setAssignedStaff(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs bg-white"
                  >
                    <option value="">Choose Staff...</option>
                    {adminUsers.map((u) => (
                      <option key={u.id} value={u.name}>{u.name} ({u.role})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Follow-up Date</label>
                  <input
                    type="date"
                    value={followUpDate}
                    onChange={(e) => setFollowUpDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Proposal Value (INR)
                  </label>
                  <input
                    type="number"
                    value={proposalValue}
                    onChange={(e) => setProposalValue(Number(e.target.value))}
                    placeholder="e.g. 150000"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Call Outcome / Qualification
                  </label>
                  <input
                    type="text"
                    value={callOutcome}
                    onChange={(e) => setCallOutcome(e.target.value)}
                    placeholder="e.g. Needs 100 riders in Indiranagar by Oct 20"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs"
                  />
                </div>
              </div>

              {/* Internal Notes History */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Add Internal Note (Audit Tracked)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    placeholder="Add operational notes or client instructions..."
                    className="flex-1 px-3 py-2 rounded-lg border border-slate-300 text-xs"
                  />
                </div>
              </div>

              {/* Note Timeline */}
              {selectedEnquiry.notes.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <span className="text-[11px] font-bold text-slate-500 uppercase">Internal Activity Trail</span>
                  <div className="space-y-1.5 max-h-36 overflow-y-auto">
                    {selectedEnquiry.notes.map((n) => (
                      <div key={n.id} className="p-2.5 rounded-lg bg-slate-100 text-xs">
                        <div className="flex justify-between text-[10px] text-slate-500 mb-0.5">
                          <strong>{n.author}</strong>
                          <span className="font-mono">{n.createdAt}</span>
                        </div>
                        <p className="text-slate-700">{n.text}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                <a
                  href={getWhatsAppLink(selectedEnquiry)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-[#25D366] text-white font-bold px-4 py-2 rounded-lg text-xs flex items-center gap-1.5"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Open WhatsApp</span>
                </a>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedEnquiry(null)}
                    className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg"
                  >
                    Close
                  </button>
                  <button
                    type="submit"
                    className="bg-[#02167F] hover:bg-[#031d99] text-[#FFD014] font-bold px-5 py-2 rounded-lg text-xs"
                  >
                    Save Changes & Record Audit
                  </button>
                </div>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
};
