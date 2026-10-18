import React, { useState } from 'react';
import { 
  Building, 
  Handshake, 
  Download, 
  Search, 
  MapPin, 
  Phone, 
  Mail, 
  Calendar, 
  Plus, 
  X,
  FileCheck
} from 'lucide-react';
import { store, exportToCsv } from '../../services/store';
import { Client, FranchiseLead } from '../../types';

export const ClientFranchiseManager: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'clients' | 'franchise'>('clients');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Create Client Modal
  const [showCreateClient, setShowCreateClient] = useState(false);
  const [companyName, setCompanyName] = useState('');
  const [contactName, setContactName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [industry, setIndustry] = useState('Logistics & Delivery');
  const [city, setCity] = useState('Bengaluru');
  const [contractValue, setContractValue] = useState(250000);

  // Franchise status update
  const [selectedLead, setSelectedLead] = useState<FranchiseLead | null>(null);
  const [newLeadStatus, setNewLeadStatus] = useState<FranchiseLead['status']>('New');
  const [leadNote, setLeadNote] = useState('');

  const state = store.getState();
  const clients = state.clients;
  const franchiseLeads = state.franchiseLeads;

  const filteredClients = clients.filter((c) =>
    c.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.primaryContact.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.phone.includes(searchTerm) ||
    c.city.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredLeads = franchiseLeads.filter((l) =>
    l.applicantName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.preferredTerritory.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.phone.includes(searchTerm)
  );

  const handleCreateClient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName || !contactName || !phone) return;

    const id = `CLI-2026-${String(clients.length + 1).padStart(3, '0')}`;
    const newClient: Client = {
      id,
      companyName,
      primaryContact: contactName,
      phone,
      email: email || 'contact@client.in',
      industry,
      city,
      servicesRequired: ['Rider and worker onboarding'],
      leadSource: 'Direct Client Onboarding',
      assignedAccountManager: state.currentAdmin?.name || 'Muhammad Ali Shoaib',
      clientStatus: 'Active Client',
      notes: ['Direct enterprise agreement registered.'],
      contractValue: Number(contractValue) || 100000,
      createdAt: new Date().toISOString().split('T')[0]
    };

    state.clients = [newClient, ...state.clients];
    store.logAudit('Client Account Created', 'Client', id, `Created client ${companyName}`);
    setShowCreateClient(false);
    setCompanyName('');
    alert(`Client ${companyName} created!`);
  };

  const handleUpdateFranchiseLead = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLead) return;

    store.updateFranchiseStatus(selectedLead.id, newLeadStatus, leadNote.trim() || undefined);
    const updated = store.getState().franchiseLeads.find((f) => f.id === selectedLead.id);
    if (updated) setSelectedLead(updated);
    alert(`Franchise lead ${selectedLead.id} updated!`);
  };

  const handleExportClients = () => {
    const rows = filteredClients.map((c) => ({
      'Client ID': c.id,
      'Company Name': c.companyName,
      'Primary Contact': c.primaryContact,
      'Phone': c.phone,
      'Email': c.email,
      'Industry': c.industry,
      'City': c.city,
      'Status': c.clientStatus,
      'Contract Value (INR)': c.contractValue || 0,
      'Account Manager': c.assignedAccountManager
    }));
    exportToCsv('WeOnboard_Clients', rows);
  };

  const handleExportLeads = () => {
    const rows = filteredLeads.map((l) => ({
      'Lead ID': l.id,
      'Applicant': l.applicantName,
      'Phone': l.phone,
      'Preferred Territory': l.preferredTerritory,
      'Investment Capacity': l.investmentCapacity || 'N/A',
      'Preferred Model': l.preferredModel,
      'Status': l.status,
      'Application Date': l.applicationDate
    }));
    exportToCsv('WeOnboard_Franchise_Leads', rows);
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-[#02167F]">
            Client Accounts & Franchise Territory Leads
          </h2>
          <p className="text-xs text-slate-500">
            Manage long-term corporate enterprise contracts and regional dealership expansion.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="bg-slate-200 p-1 rounded-xl flex items-center text-xs font-bold">
            <button
              onClick={() => setActiveTab('clients')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                activeTab === 'clients' ? 'bg-white text-[#02167F] shadow-xs' : 'text-slate-600'
              }`}
            >
              Active Clients ({clients.length})
            </button>
            <button
              onClick={() => setActiveTab('franchise')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                activeTab === 'franchise' ? 'bg-white text-[#02167F] shadow-xs' : 'text-slate-600'
              }`}
            >
              Franchise Leads ({franchiseLeads.length})
            </button>
          </div>

          {activeTab === 'clients' ? (
            <button
              onClick={() => setShowCreateClient(true)}
              className="bg-[#02167F] hover:bg-[#031d99] text-[#FFD014] font-bold px-3 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Client</span>
            </button>
          ) : (
            <button
              onClick={handleExportLeads}
              className="bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold px-3 py-2 rounded-xl text-xs flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Leads</span>
            </button>
          )}
        </div>
      </div>

      {/* Search Input */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between gap-3 text-xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={`Search ${activeTab === 'clients' ? 'clients by company, contact, or city' : 'franchise leads by name or territory'}...`}
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-[#02167F]"
          />
        </div>

        {activeTab === 'clients' && (
          <button
            onClick={handleExportClients}
            className="bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold px-3 py-2 rounded-lg border border-slate-300 flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        )}
      </div>

      {/* TAB 1: Clients */}
      {activeTab === 'clients' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">Client ID</th>
                  <th className="px-4 py-3">Company & Contact</th>
                  <th className="px-4 py-3">Industry</th>
                  <th className="px-4 py-3">City</th>
                  <th className="px-4 py-3">Contract Value</th>
                  <th className="px-4 py-3">Account Manager</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredClients.map((c) => (
                  <tr key={c.id} className="hover:bg-blue-50/40 transition-colors">
                    <td className="px-4 py-3 font-mono font-bold text-[#02167F]">
                      {c.id}
                    </td>
                    <td className="px-4 py-3">
                      <strong className="text-slate-900 block font-bold">{c.companyName}</strong>
                      <span className="text-slate-500">{c.primaryContact} &bull; {c.phone}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-700 font-medium">
                      {c.industry}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {c.city}
                    </td>
                    <td className="px-4 py-3 font-mono font-bold text-slate-900">
                      ₹{c.contractValue?.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {c.assignedAccountManager}
                    </td>
                    <td className="px-4 py-3">
                      <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full text-[10px] font-bold">
                        {c.clientStatus}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: Franchise Leads */}
      {activeTab === 'franchise' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">Lead ID</th>
                  <th className="px-4 py-3">Applicant & Phone</th>
                  <th className="px-4 py-3">Preferred Territory</th>
                  <th className="px-4 py-3">Investment Capacity</th>
                  <th className="px-4 py-3">Preferred Model</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredLeads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-blue-50/40 transition-colors">
                    <td className="px-4 py-3 font-mono font-bold text-[#02167F]">
                      {lead.id}
                    </td>
                    <td className="px-4 py-3">
                      <strong className="text-slate-900 block font-bold">{lead.applicantName}</strong>
                      <span className="text-slate-500">{lead.phone}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-700 font-semibold">
                      {lead.preferredTerritory}
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-800">
                      {lead.investmentCapacity}
                    </td>
                    <td className="px-4 py-3 text-slate-600 text-[11px]">
                      {lead.preferredModel}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        lead.status === 'Approved Partner' ? 'bg-emerald-100 text-emerald-800' :
                        lead.status === 'Site Assessment' ? 'bg-purple-100 text-purple-800' :
                        lead.status === 'Qualified' ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {lead.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => {
                          setSelectedLead(lead);
                          setNewLeadStatus(lead.status);
                        }}
                        className="bg-[#02167F] hover:bg-[#031d99] text-white text-[11px] font-bold px-3 py-1 rounded transition-colors"
                      >
                        Territory Review
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create Client Modal */}
      {showCreateClient && (
        <div className="fixed inset-0 z-50 bg-[#02167F]/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 sm:p-8 max-h-[90vh] overflow-y-auto relative shadow-2xl border border-slate-200 animate-in zoom-in-95 space-y-4">
            <button onClick={() => setShowCreateClient(false)} className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-700">
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-xl font-extrabold text-[#02167F]">
              Register Corporate Client Account
            </h3>

            <form onSubmit={handleCreateClient} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Company / Brand Name</label>
                <input
                  type="text"
                  required
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="e.g. FreshBite Cloud Kitchens"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Primary Contact</label>
                  <input
                    type="text"
                    required
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    placeholder="Full name"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Phone</label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98450 XXXXX"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Industry</label>
                  <input
                    type="text"
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">City</label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Contract / Retainer Value (INR)</label>
                <input
                  type="number"
                  value={contractValue}
                  onChange={(e) => setContractValue(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-mono"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button type="button" onClick={() => setShowCreateClient(false)} className="px-4 py-2 text-xs font-bold text-slate-600">
                  Cancel
                </button>
                <button type="submit" className="bg-[#02167F] text-[#FFD014] font-bold px-5 py-2 rounded-lg text-xs">
                  Save Client
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Franchise Lead Review Modal */}
      {selectedLead && (
        <div className="fixed inset-0 z-50 bg-[#02167F]/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 sm:p-8 max-h-[90vh] overflow-y-auto relative shadow-2xl border border-slate-200 animate-in zoom-in-95 space-y-4">
            <button onClick={() => setSelectedLead(null)} className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-700">
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-xl font-extrabold text-[#02167F]">
              Review Franchise Territory Lead
            </h3>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs space-y-2">
              <div>
                <strong className="text-slate-900 block text-sm">{selectedLead.applicantName}</strong>
                <span className="text-slate-500 font-mono">{selectedLead.phone} &bull; {selectedLead.email}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200">
                <div>
                  <span className="text-slate-400 block font-semibold">Territory:</span>
                  <strong className="text-slate-800">{selectedLead.preferredTerritory}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block font-semibold">Capital:</span>
                  <strong className="text-slate-800">{selectedLead.investmentCapacity}</strong>
                </div>
              </div>
              <p className="text-slate-700 pt-1"><strong>Experience:</strong> {selectedLead.businessExperience}</p>
            </div>

            <form onSubmit={handleUpdateFranchiseLead} className="space-y-3 pt-2">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Territory Status</label>
                <select
                  value={newLeadStatus}
                  onChange={(e) => setNewLeadStatus(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs bg-white font-bold"
                >
                  <option value="New">New</option>
                  <option value="Qualified">Qualified</option>
                  <option value="Site Assessment">Site Assessment</option>
                  <option value="Proposal Sent">Proposal Sent</option>
                  <option value="Approved Partner">Approved Partner</option>
                  <option value="Declined">Declined</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Add Territory Note</label>
                <input
                  type="text"
                  value={leadNote}
                  onChange={(e) => setLeadNote(e.target.value)}
                  placeholder="Record commercial site visit outcome..."
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button type="button" onClick={() => setSelectedLead(null)} className="px-4 py-2 text-xs font-bold text-slate-600">
                  Close
                </button>
                <button type="submit" className="bg-[#02167F] text-[#FFD014] font-bold px-5 py-2 rounded-lg text-xs">
                  Save Lead Status
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
