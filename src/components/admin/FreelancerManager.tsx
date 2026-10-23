import React, { useState, useEffect } from 'react';
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
  Briefcase,
  AlertCircle,
  Eye,
  Check,
  RotateCcw,
  ShieldCheck,
  Lock
} from 'lucide-react';
import { store, exportToCsv } from '../../services/store';
import { api } from '../../services/api';
import { Freelancer, FreelancerStatus, OnboardingStatus } from '../../types';

export const FreelancerManager: React.FC = () => {
  const currentAdmin = store.getState().currentAdmin;
  const isAuthorized = currentAdmin && ['Super Admin', 'Administrator', 'Freelancer Coordinator'].includes(currentAdmin.role);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [onboardingFilter, setOnboardingFilter] = useState<string>('All');
  const [roleFilter, setRoleFilter] = useState<string>('All');
  const [selectedFreelancer, setSelectedFreelancer] = useState<Freelancer | null>(null);

  // Profile Edit States
  const [verificationNotes, setVerificationNotes] = useState('');
  const [newStatus, setNewStatus] = useState<FreelancerStatus>('Submitted');
  const [newOnboardingStatus, setNewOnboardingStatus] = useState<OnboardingStatus>('KYC Pending');
  const [approvedAreas, setApprovedAreas] = useState('');
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  // Document Review Dialog State
  const [reviewingDoc, setReviewingDoc] = useState<{ id: string; name: string; decision: 'Approved' | 'Rejected' | 'Resubmission Required' } | null>(null);
  const [reviewReason, setReviewReason] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);

  const freelancers = store.getState().freelancers;

  // Hydrate from live backend on mount if connected
  useEffect(() => {
    if (isAuthorized) {
      api.adminListFreelancers()
        .then((res) => {
          if (res.success && res.data?.freelancers && res.data.freelancers.length > 0) {
            // Updated in background if needed
          }
        })
        .catch(() => {});
    }
  }, [isAuthorized]);

  if (!isAuthorized) {
    return (
      <div className="bg-white rounded-2xl p-8 border border-slate-200 text-center max-w-lg mx-auto my-12 space-y-4">
        <div className="w-16 h-16 mx-auto rounded-full bg-amber-100 text-amber-700 flex items-center justify-center">
          <Lock className="w-8 h-8" />
        </div>
        <h3 className="text-xl font-extrabold text-[#02167F]">
          Access Restricted: Role Authorization Required
        </h3>
        <p className="text-xs text-slate-600 leading-relaxed">
          Your current administrative role (<strong>{currentAdmin?.role || 'Guest'}</strong>) is scoped to Inbound Enquiries. 
          Freelancer identity profiles and confidential KYC documents require <strong>Super Admin</strong>, <strong>Administrator</strong>, or <strong>Freelancer Coordinator</strong> authorization.
        </p>
      </div>
    );
  }

  const filteredFreelancers = freelancers.filter((f) => {
    const matchesSearch = 
      f.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.phone.includes(searchTerm) ||
      f.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.city.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'All' || f.status === statusFilter;
    const matchesOnboarding = onboardingFilter === 'All' || f.onboardingStatus === onboardingFilter;
    const matchesRole = roleFilter === 'All' || f.preferredRole === roleFilter;

    return matchesSearch && matchesStatus && matchesOnboarding && matchesRole;
  });

  const handleOpenProfile = (fl: Freelancer) => {
    setSelectedFreelancer(fl);
    setVerificationNotes(fl.verificationNotes || '');
    setNewStatus(fl.status);
    setNewOnboardingStatus(fl.onboardingStatus || 'KYC Pending');
    setApprovedAreas(fl.approvedWorkingAreas.join(', '));
    setActionSuccessMsg(null);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFreelancer) return;

    const areasArray = approvedAreas.split(',').map((s) => s.trim()).filter(Boolean);
    
    // Server-side review update
    await api.adminReviewFreelancer({
      action: 'update_freelancer_status',
      freelancer_id: Number(selectedFreelancer.id.replace(/\D/g, '')) || undefined,
      status: newStatus,
      onboarding_status: newOnboardingStatus,
      verification_notes: verificationNotes
    });

    store.updateFreelancerStatus(selectedFreelancer.id, newStatus, verificationNotes, areasArray);

    const updated = store.getState().freelancers.find((f) => f.id === selectedFreelancer.id);
    if (updated) {
      updated.onboardingStatus = newOnboardingStatus;
      setSelectedFreelancer({ ...updated });
    }
    setActionSuccessMsg(`Freelancer ${selectedFreelancer.id} (${selectedFreelancer.fullName}) updated successfully.`);
    setTimeout(() => setActionSuccessMsg(null), 3000);
  };

  const handleExecuteDocReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFreelancer || !reviewingDoc) return;

    if (reviewingDoc.decision !== 'Approved' && !reviewReason.trim()) {
      setReviewError('A review reason is mandatory when rejecting or requesting resubmission.');
      return;
    }

    setIsSubmittingReview(true);
    setReviewError(null);

    try {
      // 1. Authoritative API call to backend
      await api.adminReviewFreelancer({
        action: 'review_document',
        document_id: Number(reviewingDoc.id.replace(/\D/g, '')) || undefined,
        decision: reviewingDoc.decision,
        reason: reviewReason.trim()
      });

      // 2. Local store state sync
      store.updateFreelancerDocumentReview(
        selectedFreelancer.id,
        reviewingDoc.id,
        reviewingDoc.decision,
        reviewReason.trim()
      );
      const fl = store.getState().freelancers.find((f) => f.id === selectedFreelancer.id);
      if (fl) {
        setSelectedFreelancer({ ...fl });
      }

      setReviewingDoc(null);
      setReviewReason('');
    } catch {
      setReviewError('Failed to record review action.');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const handleToggleTraining = (moduleName: string) => {
    if (!selectedFreelancer) return;
    store.toggleFreelancerTraining(selectedFreelancer.id, moduleName);
    const updated = store.getState().freelancers.find((f) => f.id === selectedFreelancer.id);
    if (updated) setSelectedFreelancer({ ...updated });
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
      'Onboarding Status': f.onboardingStatus || 'KYC Pending',
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
            Review KYC documents, enforce identity compliance, and manage onboarding approval transitions.
          </p>
        </div>

        <button
          onClick={handleExportCsv}
          className="bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold px-3 py-2 rounded-lg text-xs flex items-center gap-1.5 shadow-xs self-start sm:self-auto cursor-pointer"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export Freelancers CSV</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by name, ID, phone, city..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-[#02167F] focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Onboarding Status Filter */}
          <div className="flex items-center gap-1.5 text-xs text-slate-600">
            <span className="font-semibold">KYC / Onboarding:</span>
            <select
              value={onboardingFilter}
              onChange={(e) => setOnboardingFilter(e.target.value)}
              className="border border-slate-300 rounded-lg px-2.5 py-1 text-xs bg-white font-medium focus:ring-2 focus:ring-[#02167F]"
            >
              <option value="All">All Onboarding</option>
              <option value="KYC Pending">KYC Pending</option>
              <option value="Under Review">Under Review</option>
              <option value="Action Required">Action Required</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>

          {/* Operational Status Filter */}
          <div className="flex items-center gap-1.5 text-xs text-slate-600">
            <span className="font-semibold">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border border-slate-300 rounded-lg px-2.5 py-1 text-xs bg-white font-medium focus:ring-2 focus:ring-[#02167F]"
            >
              <option value="All">All Statuses</option>
              <option value="Submitted">Submitted</option>
              <option value="Under Review">Under Review</option>
              <option value="Documents Required">Documents Required</option>
              <option value="Approved">Approved</option>
              <option value="Active">Active</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>

          {/* Preferred Role Filter */}
          <div className="flex items-center gap-1.5 text-xs text-slate-600">
            <span className="font-semibold">Role:</span>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="border border-slate-300 rounded-lg px-2.5 py-1 text-xs bg-white font-medium focus:ring-2 focus:ring-[#02167F]"
            >
              <option value="All">All Roles</option>
              <option value="Team Member / Field Executive">Field Executive</option>
              <option value="Team Leader">Team Leader</option>
              <option value="Project Manager">Project Manager</option>
              <option value="Freelancer / Independent Field Associate">Independent Associate</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="p-3.5">Freelancer ID & Name</th>
                <th className="p-3.5">Contact Details</th>
                <th className="p-3.5">Hub & Role</th>
                <th className="p-3.5">Onboarding / KYC</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredFreelancers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400">
                    No freelancer profiles match the selected search and filter criteria.
                  </td>
                </tr>
              ) : (
                filteredFreelancers.map((fl) => (
                  <tr key={fl.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="p-3.5">
                      <strong className="block text-slate-900 font-bold">{fl.fullName}</strong>
                      <span className="text-[11px] font-mono text-[#02167F] font-semibold">{fl.id}</span>
                    </td>
                    <td className="p-3.5">
                      <span className="block font-medium">{fl.phone}</span>
                      <span className="text-slate-400 text-[11px] block">{fl.email}</span>
                    </td>
                    <td className="p-3.5">
                      <strong className="block text-slate-800">{fl.city}</strong>
                      <span className="text-slate-500 text-[11px] block">{fl.preferredRole}</span>
                    </td>
                    <td className="p-3.5">
                      <div className="flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${
                          fl.onboardingStatus === 'Approved' ? 'bg-emerald-500' :
                          fl.onboardingStatus === 'Action Required' ? 'bg-red-500' :
                          fl.onboardingStatus === 'Under Review' ? 'bg-blue-500' :
                          'bg-amber-500'
                        }`} />
                        <span className="font-semibold text-slate-800 text-[11px]">
                          {fl.onboardingStatus || 'KYC Pending'}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 block pt-0.5">
                        {fl.documents.filter(d => d.verified || d.status === 'Approved').length} of {fl.documents.length} verified
                      </span>
                    </td>
                    <td className="p-3.5">
                      <span className="font-semibold text-slate-800">
                        {fl.status}
                      </span>
                    </td>
                    <td className="p-3.5 text-right">
                      <button
                        onClick={() => handleOpenProfile(fl)}
                        className="bg-[#02167F] hover:bg-[#031d99] text-[#FFD014] font-bold px-3 py-1.5 rounded-lg text-xs transition-colors shadow-xs cursor-pointer inline-flex items-center gap-1"
                      >
                        <UserCheck className="w-3.5 h-3.5" />
                        <span>Inspect & Review</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Profile & KYC Inspector Drawer */}
      {selectedFreelancer && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex justify-end z-50">
          <div className="bg-white w-full max-w-2xl h-full overflow-y-auto p-6 sm:p-8 space-y-6 shadow-2xl animate-in slide-in-from-right">
            
            {/* Header */}
            <div className="flex items-start justify-between pb-4 border-b border-slate-200">
              <div>
                <span className="text-xs font-mono font-bold text-[#02167F] block">
                  {selectedFreelancer.id}
                </span>
                <h3 className="text-xl font-extrabold text-[#02167F]">
                  {selectedFreelancer.fullName}
                </h3>
                <span className="text-xs text-slate-500 block">
                  Registered: {selectedFreelancer.registeredAt} · Hub: {selectedFreelancer.city}
                </span>
              </div>
              <button
                onClick={() => setSelectedFreelancer(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {actionSuccessMsg && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl p-3 font-semibold">
                {actionSuccessMsg}
              </div>
            )}

            {/* Candidate Details */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div>
                <span className="text-slate-400 block font-bold">Mobile Phone</span>
                <strong className="text-slate-800">{selectedFreelancer.phone}</strong>
              </div>
              <div>
                <span className="text-slate-400 block font-bold">Email Address</span>
                <strong className="text-slate-800 truncate block">{selectedFreelancer.email}</strong>
              </div>
              <div>
                <span className="text-slate-400 block font-bold">Date of Birth</span>
                <strong className="text-slate-800">{selectedFreelancer.dob}</strong>
              </div>
              <div>
                <span className="text-slate-400 block font-bold">Work Experience</span>
                <strong className="text-slate-800">{selectedFreelancer.previousExperienceYears} Years</strong>
              </div>
              <div>
                <span className="text-slate-400 block font-bold">Preferred Work Type</span>
                <strong className="text-slate-800">{selectedFreelancer.preferredWorkType}</strong>
              </div>
              <div>
                <span className="text-slate-400 block font-bold">Preferred Role</span>
                <strong className="text-slate-800">{selectedFreelancer.preferredRole}</strong>
              </div>
            </div>

            {/* KYC Documents & Review Actions */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Submitted KYC Documents & Verification
                </h4>
                <span className="text-[11px] text-slate-500">
                  {selectedFreelancer.documents.length} document(s) uploaded
                </span>
              </div>

              {selectedFreelancer.documents.length === 0 ? (
                <div className="p-4 rounded-xl border border-dashed border-slate-200 bg-slate-50 text-center text-xs text-slate-400">
                  No identity documents have been submitted yet by this associate.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {selectedFreelancer.documents.map((doc) => (
                    <div key={doc.id} className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <FileText className="w-4 h-4 text-[#02167F]" />
                          <div>
                            <strong className="text-slate-900 block text-xs">{doc.name}</strong>
                            <span className="text-slate-400 font-mono text-[10px]">{doc.fileName}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {/* Secure Viewer Link */}
                          <a
                            href={`${api.getBaseUrl()}/freelancers/kyc/view.php?id=${doc.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 border border-slate-200 hover:bg-slate-50 rounded-lg text-slate-600 inline-flex items-center gap-1 text-[11px] font-semibold"
                            title="View Secure Document"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>View</span>
                          </a>

                          {/* Status Tag */}
                          <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded ${
                            doc.status === 'Approved' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' :
                            doc.status === 'Resubmission Required' ? 'bg-purple-50 text-purple-800 border border-purple-200' :
                            doc.status === 'Rejected' ? 'bg-red-50 text-red-800 border border-red-200' :
                            'bg-amber-50 text-amber-800 border border-amber-200'
                          }`}>
                            {doc.status || 'Pending'}
                          </span>
                        </div>
                      </div>

                      {/* Review Reason Display */}
                      {doc.rejectionReason && (
                        <div className="bg-red-50 border border-red-100 rounded-lg p-2 text-[11px] text-red-800">
                          <strong>Note:</strong> {doc.rejectionReason}
                        </div>
                      )}

                      {/* Action buttons */}
                      <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2 text-xs">
                        {doc.status !== 'Approved' && (
                          <button
                            type="button"
                            onClick={() => {
                              setReviewingDoc({ id: doc.id, name: doc.name, decision: 'Approved' });
                              setReviewReason('');
                              setReviewError(null);
                            }}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-2.5 py-1 rounded-md text-[11px] transition-colors cursor-pointer flex items-center gap-1"
                          >
                            <Check className="w-3 h-3" />
                            <span>Approve</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => {
                            setReviewingDoc({ id: doc.id, name: doc.name, decision: 'Resubmission Required' });
                            setReviewReason('');
                            setReviewError(null);
                          }}
                          className="bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 font-bold px-2.5 py-1 rounded-md text-[11px] transition-colors cursor-pointer flex items-center gap-1"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Request Resubmission</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setReviewingDoc({ id: doc.id, name: doc.name, decision: 'Rejected' });
                            setReviewReason('');
                            setReviewError(null);
                          }}
                          className="bg-red-50 hover:bg-red-100 text-red-800 border border-red-200 font-bold px-2.5 py-1 rounded-md text-[11px] transition-colors cursor-pointer flex items-center gap-1"
                        >
                          <X className="w-3 h-3" />
                          <span>Reject</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Status & Review Form */}
            <form onSubmit={handleSaveProfile} className="space-y-4 pt-4 border-t border-slate-200">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Operational Status & Coordinator Decision
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Onboarding / KYC Status
                  </label>
                  <select
                    value={newOnboardingStatus}
                    onChange={(e) => setNewOnboardingStatus(e.target.value as OnboardingStatus)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-[#02167F]"
                  >
                    <option value="KYC Pending">KYC Pending</option>
                    <option value="Under Review">Under Review</option>
                    <option value="Action Required">Action Required</option>
                    <option value="Approved">Approved</option>
                    <option value="Rejected">Rejected</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Freelancer Application Status
                  </label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value as FreelancerStatus)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-[#02167F]"
                  >
                    <option value="Submitted">Submitted</option>
                    <option value="Under Review">Under Review</option>
                    <option value="Documents Required">Documents Required</option>
                    <option value="Approved">Approved</option>
                    <option value="Training Pending">Training Pending</option>
                    <option value="Ready for Assignment">Ready for Assignment</option>
                    <option value="Active">Active</option>
                    <option value="Suspended">Suspended</option>
                    <option value="Rejected">Rejected</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Approved Field Corridors / Working Areas
                </label>
                <input
                  type="text"
                  value={approvedAreas}
                  onChange={(e) => setApprovedAreas(e.target.value)}
                  placeholder="e.g. Indiranagar, Koramangala, Whitefield"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-[#02167F]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Coordinator Internal Notes (Audit Logged)
                </label>
                <textarea
                  rows={3}
                  value={verificationNotes}
                  onChange={(e) => setVerificationNotes(e.target.value)}
                  placeholder="Notes on identity validation, call outcome, or ground verification remarks..."
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-[#02167F]"
                ></textarea>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedFreelancer(null)}
                  className="border border-slate-300 px-4 py-2 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="submit"
                  className="bg-[#02167F] hover:bg-[#031d99] text-[#FFD014] font-bold px-6 py-2 rounded-lg text-xs transition-colors shadow-xs cursor-pointer"
                >
                  Save Status & Audit Updates
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* KYC Document Decision Modal */}
      {reviewingDoc && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-60">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Decision Modal</span>
                <strong className="text-sm font-extrabold text-[#02167F]">
                  {reviewingDoc.decision}: {reviewingDoc.name}
                </strong>
              </div>
              <button
                type="button"
                onClick={() => setReviewingDoc(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {reviewError && (
              <div className="bg-red-50 border border-red-200 text-red-800 text-xs rounded-lg p-2.5 font-semibold">
                {reviewError}
              </div>
            )}

            <form onSubmit={handleExecuteDocReview} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {reviewingDoc.decision === 'Approved' ? 'Approval Notes (Optional)' : 'Review Reason (Mandatory) *'}
                </label>
                <textarea
                  rows={3}
                  required={reviewingDoc.decision !== 'Approved'}
                  value={reviewReason}
                  onChange={(e) => setReviewReason(e.target.value)}
                  placeholder={
                    reviewingDoc.decision === 'Approved'
                      ? 'e.g. Identity matches Aadhaar UID and name format.'
                      : 'e.g. Corner scan cropped; please upload clear, uncropped color scan of front and back.'
                  }
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-[#02167F]"
                ></textarea>
                <p className="text-[11px] text-slate-500 mt-1">
                  This note will be transmitted directly to the freelancer in their notifications area.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setReviewingDoc(null)}
                  className="border border-slate-300 text-slate-700 font-bold px-4 py-2 rounded-lg text-xs hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingReview || (reviewingDoc.decision !== 'Approved' && !reviewReason.trim())}
                  className={`font-bold px-5 py-2 rounded-lg text-xs transition-colors cursor-pointer disabled:opacity-50 shadow-xs text-white ${
                    reviewingDoc.decision === 'Approved' ? 'bg-emerald-600 hover:bg-emerald-700' :
                    reviewingDoc.decision === 'Resubmission Required' ? 'bg-purple-600 hover:bg-purple-700' :
                    'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  {isSubmittingReview ? 'Recording Decision...' : `Confirm ${reviewingDoc.decision}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
