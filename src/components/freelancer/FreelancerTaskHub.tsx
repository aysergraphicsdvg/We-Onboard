import React, { useState, useEffect } from 'react';
import { 
  ClipboardList, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  MapPin, 
  UploadCloud, 
  FileText, 
  IndianRupee, 
  Send, 
  Save, 
  X, 
  ShieldCheck, 
  Info, 
  Smartphone, 
  RefreshCw, 
  ChevronRight, 
  Check, 
  AlertTriangle,
  FileCheck2,
  Trash2,
  Eye
} from 'lucide-react';
import { api } from '../../services/api';
import { store } from '../../services/store';
import { Task, TaskEvidence } from '../../types';

interface FreelancerTaskHubProps {
  freelancerId: string | number;
}

export const FreelancerTaskHub: React.FC<FreelancerTaskHubProps> = ({ freelancerId }) => {
  const [activeTab, setActiveTab] = useState<'assigned' | 'available' | 'submitted' | 'completed'>('assigned');
  const [loading, setLoading] = useState(true);
  const [tasksData, setTasksData] = useState<{
    counts: { assigned: number; submitted: number; completed: number; available: number };
    isKycApproved: boolean;
    assigned: Task[];
    submitted: Task[];
    completed: Task[];
    available: Task[];
  }>({
    counts: { assigned: 0, submitted: 0, completed: 0, available: 0 },
    isKycApproved: false,
    assigned: [],
    submitted: [],
    completed: [],
    available: []
  });

  // Task Detail & Execution Modal
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showSubmitModal, setShowSubmitModal] = useState(false);

  // Submission Form State
  const [freelancerNotes, setFreelancerNotes] = useState('');
  const [merchantName, setMerchantName] = useState('');
  const [merchantPhone, setMerchantPhone] = useState('');
  const [terminalSerial, setTerminalSerial] = useState('');
  const [testTransactionConfirmed, setTestTransactionConfirmed] = useState(false);
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [address, setAddress] = useState('');
  const [geoLocating, setGeoLocating] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [fileError, setFileError] = useState<string | null>(null);

  // Offline Draft & Sync state
  const [hasLocalDraft, setHasLocalDraft] = useState(false);
  const [draftSavedAt, setDraftSavedAt] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [submissionSuccess, setSubmissionSuccess] = useState<string | null>(null);

  // Decline Modal
  const [declineReason, setDeclineReason] = useState('');
  const [showDeclineConfirm, setShowDeclineConfirm] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const loadHub = async () => {
    setLoading(true);
    try {
      const data = await api.getTaskHub();
      if (data) {
        setTasksData({
          counts: data.counts || { assigned: 0, submitted: 0, completed: 0, available: 0 },
          isKycApproved: Boolean(data.isKycApproved),
          assigned: data.assigned || [],
          submitted: data.submitted || [],
          completed: data.completed || [],
          available: data.available || []
        });
      }
    } catch {
      // Fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHub();
  }, [freelancerId]);

  // Load draft when task is opened
  useEffect(() => {
    if (selectedTask) {
      const draft = store.getTaskDraft(String(selectedTask.id));
      if (draft) {
        setFreelancerNotes(draft.notes || '');
        setMerchantName(draft.merchantName || '');
        setMerchantPhone(draft.merchantPhone || '');
        setTerminalSerial(draft.terminalSerial || '');
        setTestTransactionConfirmed(Boolean(draft.testTransactionConfirmed));
        setLatitude(draft.latitude || null);
        setLongitude(draft.longitude || null);
        setAddress(draft.address || '');
        setHasLocalDraft(true);
        setDraftSavedAt(draft.savedAt ? new Date(draft.savedAt).toLocaleTimeString() : 'Recently');
      } else {
        setFreelancerNotes('');
        setMerchantName('');
        setMerchantPhone('');
        setTerminalSerial('');
        setTestTransactionConfirmed(false);
        setLatitude(null);
        setLongitude(null);
        setAddress('');
        setHasLocalDraft(false);
        setDraftSavedAt(null);
      }
      setSelectedFiles([]);
      setFileError(null);
      setSubmissionError(null);
      setSubmissionSuccess(null);
    }
  }, [selectedTask]);

  // Save local draft
  const handleSaveDraft = () => {
    if (!selectedTask) return;
    store.saveTaskDraft(String(selectedTask.id), {
      notes: freelancerNotes,
      merchantName,
      merchantPhone,
      terminalSerial,
      testTransactionConfirmed,
      latitude,
      longitude,
      address
    });
    setHasLocalDraft(true);
    setDraftSavedAt(new Date().toLocaleTimeString());
  };

  // Capture GPS
  const handleCaptureLocation = () => {
    setGeoLocating(true);
    setGeoError(null);
    if (!navigator.geolocation) {
      setGeoError('Geolocation is not supported by your browser.');
      setGeoLocating(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(Number(pos.coords.latitude.toFixed(6)));
        setLongitude(Number(pos.coords.longitude.toFixed(6)));
        setAddress(`GPS Accuracy: ±${Math.round(pos.coords.accuracy)}m`);
        setGeoLocating(false);
      },
      (err) => {
        setGeoError(`Location access denied or unavailable (${err.message}).`);
        setGeoLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  // Handle file select
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFileError(null);
    if (!e.target.files) return;
    const files = Array.from(e.target.files);
    
    // Check sizes
    for (const f of files) {
      if (f.size > 5 * 1024 * 1024) {
        setFileError(`File "${f.name}" exceeds 5MB limit.`);
        return;
      }
      const ext = f.name.toLowerCase().split('.').pop();
      if (!['jpg', 'jpeg', 'png', 'webp', 'pdf'].includes(ext || '')) {
        setFileError(`Disallowed format for "${f.name}". Only JPG, PNG, WEBP, and PDF are permitted.`);
        return;
      }
    }

    setSelectedFiles((prev) => [...prev, ...files]);
  };

  const removeFile = (idx: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  // Accept Task
  const handleAcceptTask = async (task: Task) => {
    setActionLoading(true);
    try {
      const res = await api.acceptTask(task.id);
      if (res.success) {
        await loadHub();
        setActiveTab('assigned');
      } else {
        alert(res.error || res.message || 'Could not accept task.');
      }
    } finally {
      setActionLoading(false);
    }
  };

  // Decline Task
  const handleDeclineTask = async () => {
    if (!selectedTask) return;
    setActionLoading(true);
    try {
      const res = await api.declineTask(selectedTask.id, declineReason);
      if (res.success) {
        setShowDeclineConfirm(false);
        setSelectedTask(null);
        await loadHub();
      } else {
        alert(res.error || 'Could not decline task.');
      }
    } finally {
      setActionLoading(false);
    }
  };

  // Submit Evidence
  const handleSubmitEvidence = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask) return;

    setSubmissionError(null);

    // Validate location if required
    if (selectedTask.requiresLocation && (latitude === null || longitude === null)) {
      setSubmissionError('GPS Location is required for this project. Please click "Detect GPS Location".');
      return;
    }

    // Require notes or minimum 1 file
    if (!freelancerNotes.trim() && selectedFiles.length === 0) {
      setSubmissionError('Please provide field notes or upload at least one evidence photograph.');
      return;
    }

    setIsSubmitting(true);
    try {
      const idempotencyKey = `sub_${selectedTask.id}_${Date.now()}`;
      const res = await api.submitTaskEvidence(selectedTask.id, {
        notes: freelancerNotes,
        formData: {
          merchantName,
          merchantPhone,
          terminalSerial,
          testTransactionConfirmed
        },
        latitude: latitude || undefined,
        longitude: longitude || undefined,
        address: address || undefined,
        idempotencyKey,
        files: selectedFiles
      });

      if (res.success) {
        setSubmissionSuccess('Evidence submitted successfully! The task is now under Quality Control review.');
        store.clearTaskDraft(String(selectedTask.id));
        setHasLocalDraft(false);
        setTimeout(async () => {
          setShowSubmitModal(false);
          setSelectedTask(null);
          await loadHub();
          setActiveTab('submitted');
        }, 1500);
      } else {
        setSubmissionError(res.error || res.message || 'Failed to submit evidence.');
      }
    } catch (err: any) {
      setSubmissionError(err.message || 'Network error submitting evidence.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* HEADER & PREREQUISITE BANNER */}
      <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-8 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-500/20 text-indigo-300 rounded-full text-xs font-semibold uppercase tracking-wider mb-3">
              <ClipboardList className="w-3.5 h-3.5" />
              Field Dispatch & Execution Hub
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Operational Task Engine
            </h2>
            <p className="text-slate-300 text-sm mt-1 max-w-xl">
              Claim on-field retail onboardings, execute merchant setups, upload geo-tagged photo evidence, and track Quality Control verification.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={loadHub}
              disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 active:bg-white/30 text-white text-xs font-semibold rounded-xl border border-white/10 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh Workload
            </button>
          </div>
        </div>

        {/* KYC & Readiness Status Banner */}
        <div className="mt-6 pt-5 border-t border-white/10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white/5 rounded-2xl p-4 border border-white/10 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${tasksData.isKycApproved ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] uppercase font-bold text-slate-400 tracking-wider">Account KYC Status</div>
              <div className="text-sm font-bold text-white">
                {tasksData.isKycApproved ? 'Approved & Ready' : 'Pending Review'}
              </div>
            </div>
          </div>

          <div className="bg-white/5 rounded-2xl p-4 border border-white/10 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] uppercase font-bold text-slate-400 tracking-wider">Active Tasks</div>
              <div className="text-sm font-bold text-white">{tasksData.counts.assigned} in progress</div>
            </div>
          </div>

          <div className="bg-white/5 rounded-2xl p-4 border border-white/10 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <UploadCloud className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] uppercase font-bold text-slate-400 tracking-wider">Under QC Review</div>
              <div className="text-sm font-bold text-white">{tasksData.counts.submitted} submitted</div>
            </div>
          </div>

          <div className="bg-white/5 rounded-2xl p-4 border border-white/10 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center">
              <IndianRupee className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] uppercase font-bold text-slate-400 tracking-wider">QC Verified Tasks</div>
              <div className="text-sm font-bold text-white">{tasksData.counts.completed} completed</div>
            </div>
          </div>
        </div>
      </div>

      {/* NAVIGATION TABS */}
      <div className="flex border-b border-slate-200 gap-2 sm:gap-4 overflow-x-auto pb-px">
        <button
          onClick={() => setActiveTab('assigned')}
          className={`flex items-center gap-2 py-3 px-4 border-b-2 font-bold text-sm whitespace-nowrap transition-colors ${
            activeTab === 'assigned'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Clock className="w-4 h-4" />
          Active Workload
          <span className="ml-1 px-2 py-0.5 rounded-full text-xs bg-indigo-50 text-indigo-700 font-extrabold">
            {tasksData.counts.assigned}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('available')}
          className={`flex items-center gap-2 py-3 px-4 border-b-2 font-bold text-sm whitespace-nowrap transition-colors ${
            activeTab === 'available'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Smartphone className="w-4 h-4" />
          Available Task Pool
          <span className="ml-1 px-2 py-0.5 rounded-full text-xs bg-slate-100 text-slate-700 font-extrabold">
            {tasksData.counts.available}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('submitted')}
          className={`flex items-center gap-2 py-3 px-4 border-b-2 font-bold text-sm whitespace-nowrap transition-colors ${
            activeTab === 'submitted'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileCheck2 className="w-4 h-4" />
          Under QC Review
          <span className="ml-1 px-2 py-0.5 rounded-full text-xs bg-amber-50 text-amber-700 font-extrabold">
            {tasksData.counts.submitted}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('completed')}
          className={`flex items-center gap-2 py-3 px-4 border-b-2 font-bold text-sm whitespace-nowrap transition-colors ${
            activeTab === 'completed'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <CheckCircle2 className="w-4 h-4" />
          Completed & Verified
          <span className="ml-1 px-2 py-0.5 rounded-full text-xs bg-emerald-50 text-emerald-700 font-extrabold">
            {tasksData.counts.completed}
          </span>
        </button>
      </div>

      {/* TAB CONTENT: 1. ACTIVE TASKS */}
      {activeTab === 'assigned' && (
        <div className="space-y-4">
          {tasksData.assigned.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-slate-200">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400 mb-4">
                <Clock className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-slate-800">No Active Tasks Claimed</h3>
              <p className="text-slate-500 text-sm max-w-md mx-auto mt-1">
                You do not currently have any active tasks in execution. Check the Available Pool to claim new onboardings.
              </p>
              <button
                onClick={() => setActiveTab('available')}
                className="mt-5 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-colors inline-flex items-center gap-2 shadow-sm"
              >
                Browse Available Pool
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {tasksData.assigned.map((task) => (
                <div
                  key={task.id}
                  className={`bg-white rounded-2xl p-6 border transition-all hover:shadow-md flex flex-col justify-between ${
                    task.status === 'Rework Required' ? 'border-amber-300 ring-2 ring-amber-100' : 'border-slate-200'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-extrabold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg">
                        {task.taskRef || task.id}
                      </span>
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                        task.status === 'Rework Required' 
                          ? 'bg-amber-100 text-amber-800' 
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {task.status === 'Rework Required' ? 'Action: Rework Requested' : task.status}
                      </span>
                    </div>

                    <div>
                      <h4 className="text-base font-bold text-slate-900">{task.title}</h4>
                      <p className="text-xs text-slate-500 line-clamp-2 mt-1">{task.description}</p>
                    </div>

                    {task.status === 'Rework Required' && task.reviewComment && (
                      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-900 flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                        <div>
                          <strong className="block font-bold">Reviewer Feedback:</strong>
                          {task.reviewComment}
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 pt-2 border-t border-slate-100">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{task.targetArea}, {task.city}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>Deadline: {task.deadline}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
                    <div>
                      <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Milestone Payout</div>
                      <div className="text-lg font-black text-slate-900">₹{task.payoutAmount}</div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setSelectedTask(task);
                          setShowSubmitModal(true);
                        }}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-bold rounded-xl transition-colors shadow-sm inline-flex items-center gap-1.5"
                      >
                        <UploadCloud className="w-3.5 h-3.5" />
                        {task.status === 'Rework Required' ? 'Resubmit Evidence' : 'Execute & Submit'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT: 2. AVAILABLE TASK POOL */}
      {activeTab === 'available' && (
        <div className="space-y-4">
          {!tasksData.isKycApproved && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 sm:p-5 flex items-start gap-3 text-amber-900">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-xs space-y-1">
                <strong className="block text-sm font-bold text-amber-900">KYC Verification Required</strong>
                <p>
                  You can browse available tasks below, but you cannot claim them until your identity documents (Aadhaar/PAN) are reviewed and approved in Tab 1 (Identity & KYC).
                </p>
              </div>
            </div>
          )}

          {tasksData.available.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-slate-200">
              <Smartphone className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-800">No Available Tasks In Pool</h3>
              <p className="text-slate-500 text-xs max-w-sm mx-auto mt-1">
                All field tasks in your operating regions are currently claimed or scheduled. New client projects are published regularly.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {tasksData.available.map((task) => (
                <div
                  key={task.id}
                  className="bg-white rounded-2xl p-6 border border-slate-200 transition-all hover:border-slate-300 hover:shadow-sm flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-extrabold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg">
                        {task.taskRef || task.id}
                      </span>
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700">
                        Open for Claim
                      </span>
                    </div>

                    <div>
                      <h4 className="text-base font-bold text-slate-900">{task.title}</h4>
                      <p className="text-xs text-slate-500 line-clamp-2 mt-1">{task.description}</p>
                    </div>

                    {/* Eligibility details */}
                    {!task.isEligible && (
                      <div className="bg-rose-50 border border-rose-200 rounded-xl p-2.5 text-xs text-rose-800 flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                        <div>
                          <strong className="block font-bold">Eligibility Notice:</strong>
                          {task.ineligibilityReason}
                        </div>
                      </div>
                    )}

                    {task.isEligible && task.requiredCourseTitle && (
                      <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-2.5 text-xs text-indigo-900 flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0" />
                        <span>Prerequisite verified: <strong>{task.requiredCourseTitle}</strong></span>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 pt-2 border-t border-slate-100">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{task.targetArea}, {task.city}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>Deadline: {task.deadline}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
                    <div>
                      <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Milestone Payout</div>
                      <div className="text-lg font-black text-slate-900">₹{task.payoutAmount}</div>
                    </div>

                    <button
                      onClick={() => handleAcceptTask(task)}
                      disabled={!task.isEligible || actionLoading}
                      className={`px-4 py-2 text-xs font-bold rounded-xl transition-colors shadow-sm inline-flex items-center gap-1.5 ${
                        task.isEligible
                          ? 'bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white'
                          : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                      }`}
                    >
                      <Check className="w-3.5 h-3.5" />
                      Claim Task
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT: 3. UNDER QC REVIEW */}
      {activeTab === 'submitted' && (
        <div className="space-y-4">
          {tasksData.submitted.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-slate-200">
              <FileCheck2 className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-800">No Submissions Under Review</h3>
              <p className="text-slate-500 text-xs max-w-sm mx-auto mt-1">
                When you execute a task and submit photo evidence, it appears here while our Quality Control team reviews merchant validation.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {tasksData.submitted.map((task) => (
                <div key={task.id} className="bg-white rounded-2xl p-6 border border-slate-200 flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-extrabold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg">
                        {task.taskRef || task.id}
                      </span>
                      <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        Awaiting QC Inspection
                      </span>
                    </div>

                    <div>
                      <h4 className="text-base font-bold text-slate-900">{task.title}</h4>
                      <p className="text-xs text-slate-500 line-clamp-2 mt-1">{task.description}</p>
                    </div>

                    <div className="bg-slate-50 rounded-xl p-3 text-xs text-slate-600 space-y-1">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Submitted At:</span>
                        <span className="font-medium text-slate-800">{task.submittedAt || 'Recently'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Target Area:</span>
                        <span className="font-medium text-slate-800">{task.targetArea}, {task.city}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
                    <div>
                      <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Estimated Payout</div>
                      <div className="text-lg font-black text-slate-900">₹{task.payoutAmount}</div>
                    </div>

                    <div className="text-xs font-semibold text-slate-500 flex items-center gap-1">
                      <ShieldCheck className="w-4 h-4 text-indigo-500" />
                      Audit Queue #QC-{task.id}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT: 4. COMPLETED & VERIFIED */}
      {activeTab === 'completed' && (
        <div className="space-y-4">
          {tasksData.completed.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-slate-200">
              <CheckCircle2 className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-800">No Completed Tasks Yet</h3>
              <p className="text-slate-500 text-xs max-w-sm mx-auto mt-1">
                Completed and verified tasks establish milestone credentials and payout eligibility.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {tasksData.completed.map((task) => (
                <div key={task.id} className="bg-white rounded-2xl p-6 border border-emerald-200 bg-emerald-50/20 flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-extrabold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-lg">
                        {task.taskRef || task.id}
                      </span>
                      <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        QC Verified
                      </span>
                    </div>

                    <div>
                      <h4 className="text-base font-bold text-slate-900">{task.title}</h4>
                      <p className="text-xs text-slate-500 line-clamp-2 mt-1">{task.description}</p>
                    </div>

                    <div className="bg-white rounded-xl p-3 border border-emerald-100 text-xs text-slate-600 space-y-1">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Approved By:</span>
                        <span className="font-semibold text-emerald-800">{task.reviewedBy || 'Quality Inspector'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Approval Date:</span>
                        <span className="font-medium text-slate-800">{task.reviewedAt || 'Recorded'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 pt-4 border-t border-emerald-100 flex items-center justify-between">
                    <div>
                      <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Settled Milestone</div>
                      <div className="text-lg font-black text-emerald-700">₹{task.payoutAmount}</div>
                    </div>

                    <span className="text-xs font-bold text-emerald-700 bg-emerald-100/60 px-3 py-1 rounded-lg">
                      Ready for Disbursement
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SUBMISSION & EVIDENCE MODAL */}
      {showSubmitModal && selectedTask && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 my-8 space-y-6">
            
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <span className="text-xs font-extrabold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg">
                  {selectedTask.taskRef || selectedTask.id}
                </span>
                <h3 className="text-xl font-bold text-slate-900 mt-1">{selectedTask.title}</h3>
                <p className="text-xs text-slate-500">{selectedTask.targetArea}, {selectedTask.city}</p>
              </div>
              <button
                onClick={() => {
                  setShowSubmitModal(false);
                  setSelectedTask(null);
                }}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-xl hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Offline Draft Status Banner */}
            {hasLocalDraft && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-900 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Save className="w-4 h-4 text-blue-600" />
                  <span>
                    <strong>Local Draft Restored:</strong> Last saved at {draftSavedAt}. Pending changes are not yet on the server.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    store.clearTaskDraft(String(selectedTask.id));
                    setHasLocalDraft(false);
                    setFreelancerNotes('');
                  }}
                  className="text-blue-700 underline font-semibold text-[11px]"
                >
                  Clear Draft
                </button>
              </div>
            )}

            {/* Task Instructions */}
            {selectedTask.instructions && (
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 text-xs text-slate-700 space-y-1.5">
                <strong className="block font-bold text-slate-900 uppercase text-[10px] tracking-wider">
                  Field Execution SOP Instructions:
                </strong>
                <pre className="whitespace-pre-wrap font-sans text-xs leading-relaxed text-slate-600">
                  {selectedTask.instructions}
                </pre>
              </div>
            )}

            {/* Mandatory Evidence Checklist */}
            {selectedTask.evidenceRequirements && selectedTask.evidenceRequirements.length > 0 && (
              <div className="bg-indigo-50/50 rounded-2xl p-4 border border-indigo-100 text-xs">
                <strong className="block font-bold text-indigo-950 uppercase text-[10px] tracking-wider mb-2">
                  Required Deliverable Proof Checklist:
                </strong>
                <ul className="space-y-1 text-indigo-900">
                  {selectedTask.evidenceRequirements.map((req, idx) => (
                    <li key={idx} className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                      <span>{req}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <form onSubmit={handleSubmitEvidence} className="space-y-5">
              {/* Structured Form Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Merchant / Store Name
                  </label>
                  <input
                    type="text"
                    value={merchantName}
                    onChange={(e) => setMerchantName(e.target.value)}
                    placeholder="e.g. Sri Krishna Provision Store"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Merchant Mobile
                  </label>
                  <input
                    type="tel"
                    value={merchantPhone}
                    onChange={(e) => setMerchantPhone(e.target.value)}
                    placeholder="e.g. 9876543210"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Terminal / Soundbox Serial
                  </label>
                  <input
                    type="text"
                    value={terminalSerial}
                    onChange={(e) => setTerminalSerial(e.target.value)}
                    placeholder="e.g. SBX-9981-BLR"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-600 focus:outline-none"
                  />
                </div>

                <div className="flex items-center pt-6">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700">
                    <input
                      type="checkbox"
                      checked={testTransactionConfirmed}
                      onChange={(e) => setTestTransactionConfirmed(e.target.checked)}
                      className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                    />
                    <span>1 INR test audio confirmation broadcast verified</span>
                  </label>
                </div>
              </div>

              {/* Geolocation Section */}
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-indigo-600" />
                    GPS Location Capture {selectedTask.requiresLocation ? '(Mandatory)' : '(Optional)'}
                  </span>
                  <button
                    type="button"
                    onClick={handleCaptureLocation}
                    disabled={geoLocating}
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-white border border-slate-200 px-3 py-1.5 rounded-lg shadow-2xl transition-colors"
                  >
                    {geoLocating ? 'Detecting...' : 'Detect GPS Coordinates'}
                  </button>
                </div>

                {latitude && longitude ? (
                  <div className="text-xs text-emerald-700 font-semibold flex items-center gap-2 bg-emerald-50 p-2 rounded-lg">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>Coordinates: {latitude}, {longitude} ({address})</span>
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-500">
                    {selectedTask.requiresLocation 
                      ? 'GPS coordinates are mandatory to confirm on-site physical merchant presence.'
                      : 'Optional on-site coordinate verification.'}
                  </p>
                )}
                {geoError && <p className="text-xs text-rose-600">{geoError}</p>}
              </div>

              {/* File / Photo Uploads */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Photo & Document Evidence (Max 5MB each, JPG/PNG/PDF)
                </label>
                <div className="border-2 border-dashed border-slate-300 rounded-2xl p-6 text-center hover:border-indigo-400 transition-colors">
                  <UploadCloud className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-xs text-slate-600 font-medium">
                    Upload storefront photos, QR mounting shots, or signed handover slips
                  </p>
                  <label className="mt-3 inline-block px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer transition-colors">
                    <span>Select Files</span>
                    <input
                      type="file"
                      multiple
                      accept="image/jpeg,image/png,image/webp,application/pdf"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>
                </div>
                {fileError && <p className="text-xs text-rose-600 font-medium">{fileError}</p>}

                {/* Selected Files List */}
                {selectedFiles.length > 0 && (
                  <div className="space-y-1.5 pt-2">
                    {selectedFiles.map((f, i) => (
                      <div key={i} className="flex items-center justify-between bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-xs">
                        <div className="flex items-center gap-2 truncate">
                          <FileText className="w-4 h-4 text-slate-500 shrink-0" />
                          <span className="truncate font-medium text-slate-800">{f.name}</span>
                          <span className="text-[10px] text-slate-400">({(f.size / 1024).toFixed(0)} KB)</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeFile(i)}
                          className="text-slate-400 hover:text-rose-600 p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Field Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Field Notes & Observations
                </label>
                <textarea
                  rows={3}
                  value={freelancerNotes}
                  onChange={(e) => setFreelancerNotes(e.target.value)}
                  placeholder="Detail merchant interactions, store timings, or any specific installation notes..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-600 focus:outline-none"
                />
              </div>

              {/* Feedback messages */}
              {submissionError && (
                <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-xs text-rose-800 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{submissionError}</span>
                </div>
              )}
              {submissionSuccess && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-800 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                  <span>{submissionSuccess}</span>
                </div>
              )}

              {/* Form Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-100">
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={handleSaveDraft}
                    className="w-full sm:w-auto px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors inline-flex items-center justify-center gap-1.5"
                  >
                    <Save className="w-3.5 h-3.5" />
                    Save Local Draft
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowDeclineConfirm(true)}
                    className="text-rose-600 hover:text-rose-700 text-xs font-bold px-3 py-2"
                  >
                    Release / Decline
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full sm:w-auto px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-bold rounded-xl transition-colors shadow-md inline-flex items-center justify-center gap-2"
                >
                  <Send className="w-3.5 h-3.5" />
                  {isSubmitting ? 'Submitting to Quality Control...' : 'Submit Evidence'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DECLINE CONFIRMATION MODAL */}
      {showDeclineConfirm && selectedTask && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <AlertTriangle className="w-6 h-6" />
              <h4 className="text-base font-bold text-slate-900">Decline and Release Task?</h4>
            </div>
            <p className="text-xs text-slate-600">
              This task will be returned to the open project pool for other freelancers to claim. Your account will not be penalized.
            </p>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Reason for declining (optional)</label>
              <input
                type="text"
                value={declineReason}
                onChange={(e) => setDeclineReason(e.target.value)}
                placeholder="e.g. Outside my daily operating area, merchant unavailable"
                className="w-full px-3 py-2 border rounded-xl text-xs"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowDeclineConfirm(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeclineTask}
                disabled={actionLoading}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl"
              >
                {actionLoading ? 'Releasing...' : 'Confirm Release'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
