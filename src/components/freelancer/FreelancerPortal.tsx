import React, { useState } from 'react';
import { 
  ArrowLeft, 
  LogOut, 
  CheckCircle2, 
  Clock, 
  MapPin, 
  Upload, 
  AlertCircle, 
  Briefcase, 
  Award, 
  IndianRupee, 
  User, 
  Phone, 
  FileText, 
  HelpCircle,
  Camera
} from 'lucide-react';
import { store } from '../../services/store';
import { Freelancer, Task } from '../../types';

interface FreelancerPortalProps {
  onBack: () => void;
}

export const FreelancerPortal: React.FC<FreelancerPortalProps> = ({ onBack }) => {
  const [currentUser, setCurrentUser] = useState<Freelancer | null>(store.getState().currentFreelancer);
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [activeTab, setActiveTab] = useState<'tasks' | 'earnings' | 'training' | 'profile' | 'support'>('tasks');

  // Evidence submission modal state
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [evidenceNotes, setEvidenceNotes] = useState('');
  const [evidenceAddress, setEvidenceAddress] = useState('14th Main Rd, HSR Layout Sector 4, Bengaluru');
  const [evidenceLat, setEvidenceLat] = useState(12.9121);
  const [evidenceLng, setEvidenceLng] = useState(77.6446);
  const [attachedFiles, setAttachedFiles] = useState<string[]>(['storefront_proof.jpg', 'merchant_pos_slip.jpg']);

  // Support ticket state
  const [supportSubject, setSupportSubject] = useState('');
  const [supportMessage, setSupportMessage] = useState('');
  const [ticketSent, setTicketSent] = useState(false);

  const freelancers = store.getState().freelancers;
  const allTasks = store.getState().tasks;

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginIdentifier) return;
    const ok = store.loginFreelancer(loginIdentifier);
    if (ok) {
      setCurrentUser(store.getState().currentFreelancer);
    } else {
      alert('Could not find freelancer with this ID or Email. Try WO-FR-2026-001 or syed.imran@outlook.com');
    }
  };

  const handleLogout = () => {
    store.logoutFreelancer();
    setCurrentUser(null);
  };

  const handleSelectDemoUser = (fl: Freelancer) => {
    store.loginFreelancer(fl.id);
    setCurrentUser(store.getState().currentFreelancer);
  };

  const myTasks = currentUser ? allTasks.filter((t) => t.assignedFreelancerId === currentUser.id) : [];

  const handleEvidenceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask) return;

    store.submitTaskEvidence(
      selectedTask.id,
      evidenceNotes || 'Ground execution completed with geo-tagged verification photo.',
      evidenceAddress,
      evidenceLat,
      evidenceLng,
      attachedFiles
    );

    alert(`Task evidence for ${selectedTask.title} submitted! Our project manager will review.`);
    setSelectedTask(null);
    setEvidenceNotes('');
  };

  const handleSendSupport = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supportSubject || !supportMessage) return;
    store.addNotification(
      `Freelancer Help Desk: ${currentUser?.fullName}`,
      `Subject: ${supportSubject}. Query: ${supportMessage.slice(0, 80)}...`,
      'system',
      'freelancers'
    );
    setTicketSent(true);
    setSupportSubject('');
    setSupportMessage('');
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full mx-auto space-y-6">
          
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-xs font-bold text-[#02167F] hover:text-[#031d99] bg-white border border-slate-200 px-3.5 py-2 rounded-lg shadow-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to We Onboard Website</span>
          </button>

          <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-xl space-y-6">
            <div className="text-center space-y-2">
              <div className="bg-[#FFD014] text-[#02167F] font-black text-xl px-3 py-1 rounded-md inline-block">
                we<span className="font-extrabold">nboard</span>
              </div>
              <h2 className="text-2xl font-extrabold text-[#02167F]">
                Freelancer Portal Login
              </h2>
              <p className="text-xs text-slate-500">
                Access your assigned field tasks, submit proof, and track verified payouts.
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Freelancer ID or Registered Email
                </label>
                <input
                  type="text"
                  required
                  value={loginIdentifier}
                  onChange={(e) => setLoginIdentifier(e.target.value)}
                  placeholder="e.g. WO-FR-2026-001 or karthik.raman@gmail.com"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-[#02167F]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Security Passcode / Password
                </label>
                <input
                  type="password"
                  defaultValue="weonboard2026"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-[#02167F]"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  (Demo environment: any password is valid for registered IDs)
                </span>
              </div>

              <button
                type="submit"
                className="w-full bg-[#02167F] hover:bg-[#031d99] text-[#FFD014] font-extrabold py-3 rounded-lg text-sm transition-colors shadow-md"
              >
                Sign In to Portal &rarr;
              </button>
            </form>

            {/* Quick Demo Login Switcher */}
            <div className="pt-4 border-t border-slate-100">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-2 text-center">
                Quick Test Accounts (Click to Log In)
              </span>
              <div className="space-y-2">
                {freelancers.slice(0, 3).map((fl) => (
                  <button
                    key={fl.id}
                    onClick={() => handleSelectDemoUser(fl)}
                    className="w-full text-left p-2.5 rounded-lg border border-slate-200 hover:border-[#02167F] hover:bg-blue-50/50 transition-colors flex items-center justify-between text-xs"
                  >
                    <div>
                      <strong className="text-slate-900 block font-bold">{fl.fullName}</strong>
                      <span className="text-slate-500">{fl.preferredRole} &bull; {fl.city}</span>
                    </div>
                    <span className="font-mono text-[10px] bg-slate-100 px-2 py-0.5 rounded text-slate-700 font-bold">
                      {fl.id}
                    </span>
                  </button>
                ))}
              </div>
            </div>

          </div>

        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100">
      
      {/* Top Header */}
      <header className="bg-[#02167F] text-white sticky top-0 z-30 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white"
              title="Return to public site"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-1.5">
              <div className="bg-[#FFD014] text-[#02167F] font-black text-sm px-2 py-0.5 rounded">
                we
              </div>
              <span className="font-bold text-base tracking-tight">Freelancer Portal</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <strong className="text-xs font-bold block text-white">{currentUser.fullName}</strong>
              <span className="text-[11px] text-[#FFD014] font-mono">{currentUser.id}</span>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-200 text-xs font-bold px-3 py-1.5 rounded-md transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Log Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Workspace */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        
        {/* Profile Status Banner */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start sm:items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-[#02167F] text-[#FFD014] flex items-center justify-center font-black text-xl shadow-md shrink-0">
              {currentUser.fullName.split(' ').map((n) => n[0]).join('')}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-extrabold text-[#02167F]">{currentUser.fullName}</h1>
                <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                  currentUser.status === 'Active' ? 'bg-emerald-100 text-emerald-800' :
                  currentUser.status === 'Ready for Assignment' ? 'bg-sky-100 text-sky-800' :
                  currentUser.status === 'Approved' ? 'bg-blue-100 text-blue-800' :
                  'bg-amber-100 text-amber-800'
                }`}>
                  {currentUser.status}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {currentUser.preferredRole} &bull; {currentUser.city} ({currentUser.preferredAreas.join(', ') || 'Bengaluru'})
              </p>
              <div className="flex flex-wrap gap-4 text-xs text-slate-600 mt-2 font-medium">
                <span className="flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  ID: <code className="font-mono">{currentUser.id}</code>
                </span>
                <span className="flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  {currentUser.phone}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="flex items-center gap-4 pt-4 md:pt-0 border-t md:border-t-0 border-slate-100">
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-center min-w-[110px]">
              <span className="text-[11px] font-bold text-slate-500 uppercase block">Tasks Done</span>
              <strong className="text-xl font-extrabold text-[#02167F] font-mono">
                {currentUser.completedTasksCount}
              </strong>
            </div>

            <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-200 text-center min-w-[120px]">
              <span className="text-[11px] font-bold text-emerald-700 uppercase block">Total Earned</span>
              <strong className="text-xl font-extrabold text-emerald-700 font-mono">
                ₹{currentUser.totalEarnings.toLocaleString()}
              </strong>
            </div>

            <div className="bg-amber-50 p-3 rounded-xl border border-amber-200 text-center min-w-[120px]">
              <span className="text-[11px] font-bold text-amber-800 uppercase block">Pending Payout</span>
              <strong className="text-xl font-extrabold text-amber-800 font-mono">
                ₹{currentUser.pendingPayout.toLocaleString()}
              </strong>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto text-xs font-bold">
          <button
            onClick={() => setActiveTab('tasks')}
            className={`px-4 py-2 rounded-lg transition-colors whitespace-nowrap ${
              activeTab === 'tasks' ? 'bg-[#02167F] text-white shadow-sm' : 'text-slate-600 hover:bg-white'
            }`}
          >
            My Assigned Tasks ({myTasks.length})
          </button>
          <button
            onClick={() => setActiveTab('earnings')}
            className={`px-4 py-2 rounded-lg transition-colors whitespace-nowrap ${
              activeTab === 'earnings' ? 'bg-[#02167F] text-white shadow-sm' : 'text-slate-600 hover:bg-white'
            }`}
          >
            Payouts & Approved Work
          </button>
          <button
            onClick={() => setActiveTab('training')}
            className={`px-4 py-2 rounded-lg transition-colors whitespace-nowrap ${
              activeTab === 'training' ? 'bg-[#02167F] text-white shadow-sm' : 'text-slate-600 hover:bg-white'
            }`}
          >
            Training & Certifications
          </button>
          <button
            onClick={() => setActiveTab('profile')}
            className={`px-4 py-2 rounded-lg transition-colors whitespace-nowrap ${
              activeTab === 'profile' ? 'bg-[#02167F] text-white shadow-sm' : 'text-slate-600 hover:bg-white'
            }`}
          >
            Profile & Documents
          </button>
          <button
            onClick={() => setActiveTab('support')}
            className={`px-4 py-2 rounded-lg transition-colors whitespace-nowrap ${
              activeTab === 'support' ? 'bg-[#02167F] text-white shadow-sm' : 'text-slate-600 hover:bg-white'
            }`}
          >
            Support Request
          </button>
        </div>

        {/* TAB 1: Assigned Tasks */}
        {activeTab === 'tasks' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-extrabold text-[#02167F]">
                Field Assignments Requiring Action
              </h2>
              <span className="text-xs text-slate-500">
                Submit evidence with geo-tag before task deadline
              </span>
            </div>

            {myTasks.length === 0 ? (
              <div className="bg-white rounded-2xl p-12 text-center border border-slate-200">
                <Briefcase className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h3 className="text-base font-bold text-slate-800">No active tasks assigned yet</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                  Once your verification is approved and training modules are completed, new tasks in {currentUser.city} will appear here.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {myTasks.map((task) => (
                  <div
                    key={task.id}
                    className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between space-y-4"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-mono text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                          {task.id} &bull; {task.projectId}
                        </span>
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                          task.status === 'Approved' ? 'bg-emerald-100 text-emerald-800' :
                          task.status === 'Submitted' ? 'bg-amber-100 text-amber-800' :
                          task.status === 'In Progress' ? 'bg-blue-100 text-blue-800' :
                          'bg-slate-100 text-slate-700'
                        }`}>
                          {task.status}
                        </span>
                      </div>

                      <h3 className="text-base font-bold text-[#02167F] mb-1">
                        {task.title}
                      </h3>
                      <p className="text-xs text-slate-600 leading-relaxed mb-3">
                        {task.description}
                      </p>

                      <div className="text-xs space-y-1 text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100">
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-[#02167F]" />
                          <span><strong>Area:</strong> {task.targetArea}, {task.city}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-amber-600" />
                          <span><strong>Deadline:</strong> {task.deadline}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-emerald-700 font-bold">
                          <IndianRupee className="w-3.5 h-3.5" />
                          <span>Payout on Approval: ₹{task.payoutAmount.toLocaleString()}</span>
                        </div>
                      </div>

                      {task.reviewComment && (
                        <div className="mt-3 p-2.5 bg-blue-50 border border-blue-200 rounded text-xs text-blue-900">
                          <strong>Manager Feedback:</strong> {task.reviewComment}
                        </div>
                      )}
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                      {task.status === 'Submitted' ? (
                        <span className="text-xs text-amber-700 font-bold flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" /> Evidence Submitted &bull; Under Review
                        </span>
                      ) : task.status === 'Approved' ? (
                        <span className="text-xs text-emerald-700 font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Task Approved & Billed
                        </span>
                      ) : (
                        <button
                          onClick={() => setSelectedTask(task)}
                          className="bg-[#02167F] hover:bg-[#031d99] text-[#FFD014] font-bold px-4 py-2 rounded-lg text-xs transition-colors flex items-center gap-1.5 shadow"
                        >
                          <Camera className="w-3.5 h-3.5" />
                          <span>Submit Field Evidence & Proof</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: Earnings & Payout Status */}
        {activeTab === 'earnings' && (
          <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
            <h2 className="text-lg font-extrabold text-[#02167F]">
              Earnings & Bank Payout Summary
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-xs text-slate-500 font-bold uppercase block">Total Approved Work</span>
                <strong className="text-2xl font-black text-slate-900 font-mono mt-1 block">
                  ₹{currentUser.totalEarnings.toLocaleString()}
                </strong>
                <span className="text-[11px] text-slate-500">Across {currentUser.completedTasksCount} verified tasks</span>
              </div>

              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200">
                <span className="text-xs text-amber-800 font-bold uppercase block">Pending Settlement</span>
                <strong className="text-2xl font-black text-amber-800 font-mono mt-1 block">
                  ₹{currentUser.pendingPayout.toLocaleString()}
                </strong>
                <span className="text-[11px] text-amber-700">Scheduled for Friday payout cycle</span>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-xs text-slate-500 font-bold uppercase block">Bank Account on File</span>
                <strong className="text-sm font-bold text-slate-800 block mt-1">
                  {currentUser.bankAccountMasked || 'HDFC Bank - •••• 4128'}
                </strong>
                <span className="text-[10px] text-emerald-600 font-semibold">✓ Verified for NEFT/IMPS</span>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100">
              <h3 className="text-xs font-bold text-slate-700 uppercase mb-3">
                Approved Work Records
              </h3>
              <div className="space-y-2">
                {myTasks.filter((t) => t.status === 'Approved').length === 0 ? (
                  <p className="text-xs text-slate-500">No approved tasks recorded yet.</p>
                ) : (
                  myTasks.filter((t) => t.status === 'Approved').map((t) => (
                    <div key={t.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs">
                      <div>
                        <strong className="text-slate-800 block">{t.title}</strong>
                        <span className="text-slate-500 font-mono">{t.id} &bull; Reviewed by {t.reviewedBy}</span>
                      </div>
                      <span className="font-mono font-bold text-emerald-700 text-sm">
                        +₹{t.payoutAmount.toLocaleString()}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: Training & Certifications */}
        {activeTab === 'training' && (
          <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
            <div>
              <h2 className="text-lg font-extrabold text-[#02167F]">
                Field Training Modules & Certifications
              </h2>
              <p className="text-xs text-slate-500">
                Complete modules to unlock high-payout enterprise audits and team leader assignments.
              </p>
            </div>

            <div className="space-y-3">
              {currentUser.trainings.map((tr, idx) => (
                <div key={idx} className="p-4 rounded-xl border border-slate-200 flex items-center justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                      tr.completed ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'
                    }`}>
                      <Award className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-800">{tr.moduleName}</h4>
                      <span className="text-xs text-slate-500">
                        {tr.completed ? `Completed on ${tr.completedAt || '2026-10-04'}` : 'Pending review'}
                      </span>
                    </div>
                  </div>

                  <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                    tr.completed ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {tr.completed ? 'Certified ✓' : 'Incomplete'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: Profile Details */}
        {activeTab === 'profile' && (
          <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
            <h2 className="text-lg font-extrabold text-[#02167F]">
              Freelancer Profile & KYC Documents
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                <span className="text-slate-500 block font-semibold">Residential Address</span>
                <strong className="text-slate-800">{currentUser.residentialAddress}, {currentUser.city} - {currentUser.pinCode}</strong>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                <span className="text-slate-500 block font-semibold">Languages</span>
                <strong className="text-slate-800">{currentUser.languages.join(', ')}</strong>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                <span className="text-slate-500 block font-semibold">Education</span>
                <strong className="text-slate-800">{currentUser.education}</strong>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                <span className="text-slate-500 block font-semibold">Approved Working Hubs</span>
                <strong className="text-slate-800">{currentUser.approvedWorkingAreas.join(', ') || 'Under verification'}</strong>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-bold text-slate-700 uppercase mb-2">Submitted Verification Documents</h4>
              <div className="space-y-2">
                {currentUser.documents.map((doc) => (
                  <div key={doc.id} className="flex items-center justify-between p-3 rounded-lg border border-slate-200 text-xs">
                    <span className="font-medium text-slate-800">{doc.name} ({doc.fileName})</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                      doc.verified ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {doc.verified ? 'Verified ✓' : 'Awaiting Coordinator Check'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: Support Request */}
        {activeTab === 'support' && (
          <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm max-w-xl space-y-4">
            <h2 className="text-lg font-extrabold text-[#02167F]">
              Submit a Support Ticket
            </h2>
            <p className="text-xs text-slate-500">
              Questions regarding task instructions, app logins, or payout delays go directly to the Freelancer Coordinator.
            </p>

            {ticketSent ? (
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 space-y-2">
                <strong>Ticket Submitted!</strong>
                <p>Your support ticket has been forwarded to the We Onboard Indiranagar operations desk.</p>
                <button
                  onClick={() => setTicketSent(false)}
                  className="bg-emerald-700 text-white px-3 py-1.5 rounded font-bold"
                >
                  Submit Another
                </button>
              </div>
            ) : (
              <form onSubmit={handleSendSupport} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Subject</label>
                  <input
                    type="text"
                    required
                    value={supportSubject}
                    onChange={(e) => setSupportSubject(e.target.value)}
                    placeholder="e.g. Question on HSR Kirana Task payout"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Details</label>
                  <textarea
                    rows={4}
                    required
                    value={supportMessage}
                    onChange={(e) => setSupportMessage(e.target.value)}
                    placeholder="Describe your issue or question..."
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                  ></textarea>
                </div>

                <button
                  type="submit"
                  className="bg-[#02167F] text-[#FFD014] font-bold px-6 py-2.5 rounded-lg text-xs"
                >
                  Send Support Request &rarr;
                </button>
              </form>
            )}
          </div>
        )}

      </div>

      {/* Task Evidence Submission Modal */}
      {selectedTask && (
        <div className="fixed inset-0 z-50 bg-[#02167F]/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 sm:p-8 relative shadow-2xl border border-slate-200 animate-in zoom-in-95">
            <h3 className="text-xl font-extrabold text-[#02167F] mb-1">
              Submit Task Evidence
            </h3>
            <p className="text-xs text-slate-500 mb-4 font-mono">
              Task ID: {selectedTask.id} &bull; {selectedTask.title}
            </p>

            <form onSubmit={handleEvidenceSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Field Execution Notes / Summary <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  value={evidenceNotes}
                  onChange={(e) => setEvidenceNotes(e.target.value)}
                  placeholder="e.g. Visited 5 stores, verified GST documents and demonstrated app..."
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs"
                ></textarea>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Geo-Tagged Location Address
                </label>
                <input
                  type="text"
                  value={evidenceAddress}
                  onChange={(e) => setEvidenceAddress(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Latitude</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={evidenceLat}
                    onChange={(e) => setEvidenceLat(Number(e.target.value))}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Longitude</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={evidenceLng}
                    onChange={(e) => setEvidenceLng(Number(e.target.value))}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 font-mono text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Attached Photo Evidence
                </label>
                <div className="space-y-1">
                  {attachedFiles.map((f, i) => (
                    <div key={i} className="text-xs bg-slate-50 p-2 rounded border border-slate-200 flex items-center justify-between">
                      <span className="font-mono text-slate-700">📸 {f}</span>
                      <span className="text-emerald-600 font-bold text-[10px]">Ready</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedTask(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-[#02167F] text-[#FFD014] font-bold px-5 py-2 rounded-lg text-xs"
                >
                  Submit for Approval &rarr;
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
