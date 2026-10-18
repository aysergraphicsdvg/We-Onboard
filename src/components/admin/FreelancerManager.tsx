import React, { useState } from 'react';
import { 
  Search, 
  Filter, 
  Download, 
  UserCheck, 
  UserX, 
  FileText, 
  Award, 
  CheckCircle2, 
  X, 
  Phone, 
  Mail, 
  MapPin, 
  ShieldAlert, 
  Briefcase 
} from 'lucide-react';
import { store, exportToCsv } from '../../services/store';
import { Freelancer, FreelancerStatus } from '../../types';

export const FreelancerManager: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [roleFilter, setRoleFilter] = useState<string>('All');
  const [selectedFreelancer, setSelectedFreelancer] = useState<Freelancer | null>(null);

  // Profile Edit States
  const [verificationNotes, setVerificationNotes] = useState('');
  const [newStatus, setNewStatus] = useState<FreelancerStatus>('Submitted');
  const [approvedAreas, setApprovedAreas] = useState('');

  const freelancers = store.getState().freelancers;

  const filteredFreelancers = freelancers.filter((f) => {
    const matchesSearch = 
      f.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.phone.includes(searchTerm) ||
      f.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.city.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'All' || f.status === statusFilter;
    const matchesRole = roleFilter === 'All' || f.preferredRole === roleFilter;

    return matchesSearch && matchesStatus && matchesRole;
  });

  const handleOpenProfile = (fl: Freelancer) => {
    setSelectedFreelancer(fl);
    setVerificationNotes(fl.verificationNotes || '');
    setNewStatus(fl.status);
    setApprovedAreas(fl.approvedWorkingAreas.join(', '));
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFreelancer) return;

    const areasArray = approvedAreas.split(',').map((s) => s.trim()).filter(Boolean);
    store.updateFreelancerStatus(selectedFreelancer.id, newStatus, verificationNotes, areasArray);

    const updated = store.getState().freelancers.find((f) => f.id === selectedFreelancer.id);
    if (updated) setSelectedFreelancer(updated);
    alert(`Freelancer ${selectedFreelancer.id} (${selectedFreelancer.fullName}) updated successfully!`);
  };

  const handleToggleDoc = (docId: string) => {
    if (!selectedFreelancer) return;
    store.toggleFreelancerDocumentVerified(selectedFreelancer.id, docId);
    const updated = store.getState().freelancers.find((f) => f.id === selectedFreelancer.id);
    if (updated) setSelectedFreelancer(updated);
  };

  const handleToggleTraining = (moduleName: string) => {
    if (!selectedFreelancer) return;
    store.toggleFreelancerTraining(selectedFreelancer.id, moduleName);
    const updated = store.getState().freelancers.find((f) => f.id === selectedFreelancer.id);
    if (updated) setSelectedFreelancer(updated);
  };

  const handleExportCsv = () => {
    const rows = filteredFreelancers.map((f) => ({
      'Freelancer ID': f.id,
      'Full Name': f.fullName,
      'Phone': f.phone,
      'Email': f.email,
      'City': f.city,
      'Role': f.preferredRole,
      'Work Type': f.preferredWorkType,
      'Status': f.status,
      'Completed Tasks': f.completedTasksCount,
      'Total Earnings (INR)': f.totalEarnings,
      'Pending Payout (INR)': f.pendingPayout,
      'Registered Date': f.registeredAt
    }));
    exportToCsv('WeOnboard_Freelancers', rows);
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-[#02167F]">
            Freelancer Registration & Verification Desk
          </h2>
          <p className="text-xs text-slate-500">
            Review KYC documents, certify training modules, and manage field associate assignments.
          </p>
        </div>

        <button
          onClick={handleExportCsv}
          className="bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold px-3 py-2 rounded-lg text-xs flex items-center gap-1.5 shadow-xs self-start sm:self-auto"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export Freelancers CSV</span>
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
            placeholder="Search by name, phone, email, ID, or Bangalore area..."
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
            <option value="All">All Statuses ({freelancers.length})</option>
            <option value="Submitted">Submitted</option>
            <option value="Under Review">Under Review</option>
            <option value="Verification Pending">Verification Pending</option>
            <option value="Approved">Approved</option>
            <option value="Training Pending">Training Pending</option>
            <option value="Ready for Assignment">Ready for Assignment</option>
            <option value="Active">Active</option>
            <option value="Suspended">Suspended</option>
            <option value="Rejected">Rejected</option>
          </select>
        </div>

        {/* Role Filter */}
        <div className="flex items-center gap-2">
          <span className="font-bold text-slate-600">Role:</span>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-medium"
          >
            <option value="All">All Roles</option>
            <option value="Team Member / Field Executive">Field Executive</option>
            <option value="Team Leader">Team Leader</option>
            <option value="Project Manager">Project Manager</option>
            <option value="Freelancer / Independent Field Associate">Field Associate</option>
          </select>
        </div>

      </div>

      {/* Freelancers Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3">Freelancer ID</th>
                <th className="px-4 py-3">Candidate</th>
                <th className="px-4 py-3">Preferred Role</th>
                <th className="px-4 py-3">Hub / Areas</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Completed Tasks</th>
                <th className="px-4 py-3">Total Earnings</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredFreelancers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400">
                    No freelancer profiles match your search criteria.
                  </td>
                </tr>
              ) : (
                filteredFreelancers.map((fl) => (
                  <tr key={fl.id} className="hover:bg-blue-50/40 transition-colors">
                    
                    <td className="px-4 py-3 font-mono font-bold text-[#02167F]">
                      <button onClick={() => handleOpenProfile(fl)} className="hover:underline text-left">
                        {fl.id}
                      </button>
                    </td>

                    <td className="px-4 py-3">
                      <strong className="text-slate-900 block font-bold">{fl.fullName}</strong>
                      <span className="text-slate-500">{fl.phone} &bull; {fl.city}</span>
                    </td>

                    <td className="px-4 py-3 text-slate-700 font-semibold">
                      {fl.preferredRole}
                    </td>

                    <td className="px-4 py-3 text-slate-600">
                      {fl.approvedWorkingAreas.length > 0 ? (
                        <span className="text-emerald-700 font-semibold">
                          {fl.approvedWorkingAreas.join(', ')}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">None Approved</span>
                      )}
                    </td>

                    <td className="px-4 py-3">
                      <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                        fl.status === 'Active' ? 'bg-emerald-100 text-emerald-800' :
                        fl.status === 'Ready for Assignment' ? 'bg-sky-100 text-sky-800' :
                        fl.status === 'Approved' ? 'bg-blue-100 text-blue-800' :
                        fl.status === 'Under Review' || fl.status === 'Submitted' ? 'bg-amber-100 text-amber-800' :
                        fl.status === 'Suspended' ? 'bg-rose-100 text-rose-800' : 'bg-slate-200 text-slate-700'
                      }`}>
                        {fl.status}
                      </span>
                    </td>

                    <td className="px-4 py-3 font-mono font-bold text-slate-800">
                      {fl.completedTasksCount}
                    </td>

                    <td className="px-4 py-3 font-mono font-bold text-emerald-700">
                      ₹{fl.totalEarnings.toLocaleString()}
                    </td>

                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleOpenProfile(fl)}
                        className="bg-[#02167F] hover:bg-[#031d99] text-[#FFD014] text-[11px] font-bold px-3 py-1 rounded transition-colors"
                      >
                        Review KYC
                      </button>
                    </td>

                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Comprehensive Freelancer Review & Verification Drawer */}
      {selectedFreelancer && (
        <div className="fixed inset-0 z-50 bg-[#02167F]/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 sm:p-8 max-h-[90vh] overflow-y-auto relative shadow-2xl border border-slate-200 animate-in zoom-in-95 space-y-6">
            
            <button
              onClick={() => setSelectedFreelancer(null)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-700 rounded-full"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Profile Header */}
            <div className="flex items-center gap-4 pb-4 border-b border-slate-100">
              <div className="w-16 h-16 rounded-2xl bg-[#02167F] text-[#FFD014] flex items-center justify-center font-black text-xl shrink-0">
                {selectedFreelancer.fullName.split(' ').map((n) => n[0]).join('')}
              </div>
              <div>
                <span className="font-mono text-xs font-bold text-slate-500 block">
                  {selectedFreelancer.id} &bull; Registered {selectedFreelancer.registeredAt}
                </span>
                <h3 className="text-2xl font-extrabold text-[#02167F]">
                  {selectedFreelancer.fullName}
                </h3>
                <span className="text-xs text-slate-600 font-semibold">
                  {selectedFreelancer.preferredRole} &bull; {selectedFreelancer.city} ({selectedFreelancer.residentialAddress})
                </span>
              </div>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div>
                <span className="text-slate-400 block font-bold">Mobile Phone</span>
                <strong className="text-slate-800">{selectedFreelancer.phone}</strong>
              </div>
              <div>
                <span className="text-slate-400 block font-bold">Email Address</span>
                <strong className="text-slate-800 truncate block">{selectedFreelancer.email}</strong>
              </div>
              <div>
                <span className="text-slate-400 block font-bold">Work Experience</span>
                <strong className="text-slate-800">{selectedFreelancer.previousExperienceYears} Years</strong>
              </div>
              <div>
                <span className="text-slate-400 block font-bold">Availability</span>
                <strong className="text-slate-800">{selectedFreelancer.preferredWorkType}</strong>
              </div>
            </div>

            {/* KYC Documents Verification Box */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Submitted Documents & Verification Status
              </h4>
              <div className="space-y-2">
                {selectedFreelancer.documents.map((doc) => (
                  <div key={doc.id} className="p-3 rounded-xl border border-slate-200 flex items-center justify-between text-xs bg-white">
                    <div className="flex items-center gap-2.5">
                      <FileText className="w-4 h-4 text-[#02167F]" />
                      <div>
                        <strong className="text-slate-800 block">{doc.name}</strong>
                        <span className="text-slate-400 font-mono text-[10px]">{doc.fileName}</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleToggleDoc(doc.id)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold border transition-colors ${
                        doc.verified 
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100' 
                          : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
                      }`}
                    >
                      {doc.verified ? '✓ Verified (Authenticated)' : 'Pending Verification (Click to Verify)'}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Training Checkpoints */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Mandatory Operational Training Modules
              </h4>
              <div className="space-y-2">
                {selectedFreelancer.trainings.map((tr, idx) => (
                  <div key={idx} className="p-3 rounded-xl border border-slate-200 flex items-center justify-between text-xs bg-white">
                    <div className="flex items-center gap-2.5">
                      <Award className="w-4 h-4 text-purple-700" />
                      <span className="font-semibold text-slate-800">{tr.moduleName}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleToggleTraining(tr.moduleName)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold border transition-colors ${
                        tr.completed
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                          : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
                      }`}
                    >
                      {tr.completed ? 'Completed ✓' : 'Mark Completed'}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Management Decision Form */}
            <form onSubmit={handleSaveProfile} className="space-y-4 pt-4 border-t border-slate-100">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Application Status Decision
                  </label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value as FreelancerStatus)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs bg-white font-bold text-[#02167F]"
                  >
                    <option value="Submitted">Submitted</option>
                    <option value="Under Review">Under Review</option>
                    <option value="Verification Pending">Verification Pending</option>
                    <option value="Approved">Approved</option>
                    <option value="Training Pending">Training Pending</option>
                    <option value="Ready for Assignment">Ready for Assignment</option>
                    <option value="Active">Active</option>
                    <option value="Suspended">Suspended</option>
                    <option value="Rejected">Rejected</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Approved Working Hubs / Zones
                  </label>
                  <input
                    type="text"
                    value={approvedAreas}
                    onChange={(e) => setApprovedAreas(e.target.value)}
                    placeholder="e.g. Indiranagar, Koramangala, HSR"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Internal Verification Audit Notes
                </label>
                <textarea
                  rows={2}
                  value={verificationNotes}
                  onChange={(e) => setVerificationNotes(e.target.value)}
                  placeholder="Record identity checks, Aadhaar authentication notes, or interview feedback..."
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs"
                ></textarea>
              </div>

              <div className="flex justify-between items-center pt-2">
                <a
                  href={`https://wa.me/${selectedFreelancer.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                    `Hello ${selectedFreelancer.fullName}, this is We Onboard regarding your freelancer application [${selectedFreelancer.id}]. Status: ${newStatus}.`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-[#25D366] text-white font-bold px-4 py-2 rounded-lg text-xs"
                >
                  Send Status via WhatsApp
                </a>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedFreelancer(null)}
                    className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg"
                  >
                    Close
                  </button>
                  <button
                    type="submit"
                    className="bg-[#02167F] hover:bg-[#031d99] text-[#FFD014] font-bold px-5 py-2 rounded-lg text-xs"
                  >
                    Save Status & Verification
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
