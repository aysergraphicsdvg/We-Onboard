import React, { useState, useEffect } from 'react';
import { 
  FolderKanban, 
  Plus, 
  CheckCircle2, 
  Clock, 
  MapPin, 
  FileText, 
  IndianRupee, 
  X, 
  AlertCircle, 
  ArrowRight,
  ShieldCheck,
  UserCheck,
  Smartphone,
  Play,
  Pause,
  Check,
  AlertTriangle,
  UploadCloud,
  FileCheck2,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  Search,
  Filter,
  Eye
} from 'lucide-react';
import { store } from '../../services/store';
import { api } from '../../services/api';
import { Project, Task, ServiceCategory, FreelancerRole, Course } from '../../types';

export const ProjectManager: React.FC = () => {
  const [activeView, setActiveView] = useState<'projects' | 'tasks' | 'qc'>('projects');
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [selectedTaskForReview, setSelectedTaskForReview] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);

  // Review states
  const [reviewDecision, setReviewDecision] = useState<'Approved' | 'Rework Required' | 'Rejected'>('Approved');
  const [reviewComment, setReviewComment] = useState('');
  const [reviewError, setReviewError] = useState<string | null>(null);

  // Create Project Form
  const [projectName, setProjectName] = useState('');
  const [clientName, setClientName] = useState('');
  const [serviceCategory, setServiceCategory] = useState<ServiceCategory>('Merchant and restaurant onboarding');
  const [description, setDescription] = useState('');
  const [targetCity, setTargetCity] = useState('Bengaluru');
  const [targetAreas, setTargetAreas] = useState('Indiranagar, Koramangala, HSR Layout');
  const [targetUnits, setTargetUnits] = useState(150);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]);
  const [budget, setBudget] = useState(150000);
  const [payoutRate, setPayoutRate] = useState(350);
  const [maxTasksPerFreelancer, setMaxTasksPerFreelancer] = useState(5);
  const [requiredCourseId, setRequiredCourseId] = useState<number | ''>('');
  const [requiresLocation, setRequiresLocation] = useState(true);

  // Create Task Form
  const [taskProjectId, setTaskProjectId] = useState('');
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [taskInstructions, setTaskInstructions] = useState('');
  const [taskFreelancerId, setTaskFreelancerId] = useState('');
  const [taskArea, setTaskArea] = useState('Indiranagar');
  const [taskDeadline, setTaskDeadline] = useState(new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]);
  const [taskPayout, setTaskPayout] = useState(350);
  const [taskRequiresLocation, setTaskRequiresLocation] = useState(true);
  const [evidenceRequirementsText, setEvidenceRequirementsText] = useState(
    'Front of Store Photo with Soundbox, Merchant Signed Slip, Terminal Serial Barcode'
  );

  // Data states
  const [projectsList, setProjectsList] = useState<Project[]>([]);
  const [tasksList, setTasksList] = useState<Task[]>([]);
  const [qcQueue, setQcQueue] = useState<any[]>([]);
  const [academyCourses, setAcademyCourses] = useState<Course[]>([]);

  // Filters
  const [projectStatusFilter, setProjectStatusFilter] = useState('All');
  const [taskStatusFilter, setTaskStatusFilter] = useState('All');
  const [selectedProjectFilter, setSelectedProjectFilter] = useState<string>('All');

  const freelancers = store.getState().freelancers.filter((f) => f.status === 'Active' || f.onboardingStatus === 'Approved');

  const loadData = async () => {
    setLoading(true);
    try {
      const [projs, tasks, qc, courses] = await Promise.all([
        api.getAdminProjects(),
        api.getAdminTasks(),
        api.getAdminQcQueue(),
        api.getCourses()
      ]);
      setProjectsList(projs || store.getState().projects);
      setTasksList(tasks || store.getState().tasks);
      setQcQueue(qc || []);
      setAcademyCourses(courses || store.getState().academyCourses || []);
    } catch {
      // Fallback to store
      setProjectsList(store.getState().projects);
      setTasksList(store.getState().tasks);
      setQcQueue(store.getState().tasks.filter(t => ['Submitted', 'Under Review'].includes(t.status)));
      setAcademyCourses(store.getState().academyCourses || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const unsub = store.subscribe(() => {
      setProjectsList(store.getState().projects);
      setTasksList(store.getState().tasks);
      setQcQueue(store.getState().tasks.filter(t => ['Submitted', 'Under Review'].includes(t.status)));
    });
    return unsub;
  }, []);

  // Handle Project Status change
  const handleUpdateProjectStatus = async (projectId: string, newStatus: any) => {
    try {
      await api.manageAdminProject({
        action: 'update_status',
        project_id: projectId,
        status: newStatus
      });
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to update project status');
    }
  };

  // Handle Create Project
  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectName.trim() || !clientName.trim()) return;

    try {
      const selectedCourse = academyCourses.find(c => Number(c.id) === Number(requiredCourseId));
      await api.manageAdminProject({
        action: 'create',
        name: projectName.trim(),
        client_name: clientName.trim(),
        service_category: serviceCategory,
        description,
        target_city: targetCity,
        target_areas: targetAreas,
        target_units: Number(targetUnits) || 100,
        start_date: startDate,
        end_date: endDate,
        payment_model: 'Per Activation',
        payout_rate: Number(payoutRate) || 0,
        budget: Number(budget) || 100000,
        status: 'Active',
        required_training_course_id: requiredCourseId ? Number(requiredCourseId) : null,
        required_course_title: selectedCourse?.title || null,
        required_kyc_level: 'Approved',
        requires_location: requiresLocation,
        max_tasks_per_freelancer: Number(maxTasksPerFreelancer) || 5
      });

      setShowCreateProject(false);
      setProjectName('');
      setClientName('');
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to create project');
    }
  };

  // Handle Create Task
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskProjectId || !taskTitle.trim()) {
      alert('Please select project and enter task title.');
      return;
    }

    try {
      const evReqs = evidenceRequirementsText.split(',').map(s => s.trim()).filter(Boolean);
      await api.manageAdminTask({
        action: 'create',
        project_id: taskProjectId,
        title: taskTitle.trim(),
        description: taskDesc || 'Execute field onboarding and document collection.',
        instructions: taskInstructions || '1. Greet merchant\n2. Verify identity\n3. Capture evidence photos',
        freelancer_id: taskFreelancerId ? Number(taskFreelancerId) : null,
        city: targetCity,
        target_area: taskArea,
        deadline: taskDeadline,
        payout_amount: Number(taskPayout) || 350,
        requires_location: taskRequiresLocation,
        evidence_requirements: evReqs
      });

      setShowCreateTask(false);
      setTaskTitle('');
      setTaskDesc('');
      setTaskInstructions('');
      setTaskFreelancerId('');
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to create task');
    }
  };

  // Handle Review Task Decision
  const handleReviewTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTaskForReview) return;

    if (['Rework Required', 'Rejected'].includes(reviewDecision) && !reviewComment.trim()) {
      setReviewError(`A detailed reason is mandatory when choosing ${reviewDecision}.`);
      return;
    }

    try {
      const res = await api.reviewAdminTask(selectedTaskForReview.id, reviewDecision, reviewComment.trim());
      if (res.success) {
        setSelectedTaskForReview(null);
        setReviewComment('');
        setReviewError(null);
        await loadData();
      } else {
        setReviewError(res.error || res.message || 'Review submission failed');
      }
    } catch (err: any) {
      setReviewError(err.message || 'Server error saving decision');
    }
  };

  const filteredProjects = projectsList.filter((p) => {
    if (projectStatusFilter !== 'All' && p.status !== projectStatusFilter) return false;
    return true;
  });

  const filteredTasks = tasksList.filter((t) => {
    if (taskStatusFilter !== 'All' && t.status !== taskStatusFilter) return false;
    if (selectedProjectFilter !== 'All' && t.projectId !== selectedProjectFilter) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* HEADER WITH VIEW TOGGLES */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs font-bold uppercase tracking-wider mb-2">
            <FolderKanban className="w-3.5 h-3.5" />
            Phase 5 Operational Architecture
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
            Projects, Task Dispatch & QC Queue
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage client field contracts, configure eligibility rules, dispatch tasks, and audit evidence.
          </p>
        </div>

        {/* View Segmented Control */}
        <div className="flex items-center gap-1 bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
          <button
            onClick={() => setActiveView('projects')}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all ${
              activeView === 'projects'
                ? 'bg-white text-indigo-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Client Projects ({projectsList.length})
          </button>

          <button
            onClick={() => setActiveView('tasks')}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all ${
              activeView === 'tasks'
                ? 'bg-white text-indigo-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Task Dispatch ({tasksList.length})
          </button>

          <button
            onClick={() => setActiveView('qc')}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all relative ${
              activeView === 'qc'
                ? 'bg-white text-indigo-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            QC Review Queue
            {qcQueue.length > 0 && (
              <span className="ml-1.5 px-2 py-0.5 rounded-full text-[10px] bg-amber-500 text-white font-black animate-pulse">
                {qcQueue.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* VIEW 1: PROJECTS LIFECYCLE */}
      {activeView === 'projects' && (
        <div className="space-y-5">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500">Status:</span>
              {(['All', 'Active', 'Paused', 'Completed', 'Draft'] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setProjectStatusFilter(st)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
                    projectStatusFilter === st
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>

            <button
              onClick={() => setShowCreateProject(true)}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-bold rounded-xl transition-colors shadow-sm inline-flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              New Project Contract
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredProjects.map((p) => (
              <div
                key={p.id}
                className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col justify-between hover:shadow-md transition-shadow"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg">
                      {p.projectRef || p.id}
                    </span>
                    <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${
                      p.status === 'Active' ? 'bg-emerald-100 text-emerald-800' :
                      p.status === 'Paused' ? 'bg-amber-100 text-amber-800' :
                      'bg-slate-100 text-slate-700'
                    }`}>
                      {p.status}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-base font-black text-slate-900 leading-snug">{p.name}</h3>
                    <p className="text-xs font-bold text-slate-500 mt-0.5">Client: {p.clientName}</p>
                    <p className="text-xs text-slate-600 line-clamp-2 mt-2">{p.description}</p>
                  </div>

                  {/* Prerequisites */}
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-1">
                    <div className="flex items-center gap-1.5 text-slate-700">
                      <ShieldCheck className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                      <span className="truncate">
                        Course Prereq: <strong>{p.requiredCourseTitle || 'None Required'}</strong>
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-700">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{p.targetCity} ({Array.isArray(p.targetAreas) ? p.targetAreas.join(', ') : p.targetAreas})</span>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div>
                    <div className="flex justify-between text-xs font-bold text-slate-600 mb-1">
                      <span>Delivery Units</span>
                      <span>{p.completedUnits} / {p.targetUnits} units</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-indigo-600 h-full rounded-full transition-all"
                        style={{ width: `${Math.min(100, (p.completedUnits / p.targetUnits) * 100)}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Status action footer */}
                <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
                  <div>
                    <div className="text-[10px] text-slate-400 font-bold uppercase">Rate Card</div>
                    <div className="text-sm font-black text-slate-900">₹{p.payoutRate || 350}/unit</div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {p.status === 'Active' ? (
                      <button
                        onClick={() => handleUpdateProjectStatus(p.id, 'Paused')}
                        className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-bold rounded-lg border border-amber-200 transition-colors inline-flex items-center gap-1"
                      >
                        <Pause className="w-3 h-3" />
                        Pause
                      </button>
                    ) : (
                      <button
                        onClick={() => handleUpdateProjectStatus(p.id, 'Active')}
                        className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold rounded-lg border border-emerald-200 transition-colors inline-flex items-center gap-1"
                      >
                        <Play className="w-3 h-3" />
                        Publish
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* VIEW 2: TASK DISPATCH */}
      {activeView === 'tasks' && (
        <div className="space-y-5">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
              <span className="text-xs font-bold text-slate-500">Status:</span>
              {(['All', 'Available', 'Assigned', 'Accepted', 'In Progress', 'Submitted', 'Approved', 'Rework Required'] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setTaskStatusFilter(st)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold whitespace-nowrap transition-colors ${
                    taskStatusFilter === st
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>

            <button
              onClick={() => setShowCreateTask(true)}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-bold rounded-xl transition-colors shadow-sm inline-flex items-center gap-1.5 shrink-0"
            >
              <Plus className="w-4 h-4" />
              Dispatch New Task
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 text-[11px] uppercase font-bold text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="p-4">Task Ref & Title</th>
                    <th className="p-4">Assigned Associate</th>
                    <th className="p-4">Location</th>
                    <th className="p-4">Deadline</th>
                    <th className="p-4">Rate</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredTasks.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-4">
                        <div className="font-extrabold text-slate-900">{t.title}</div>
                        <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                          {t.taskRef || t.id} &bull; Project: {t.projectName || t.projectId}
                        </div>
                      </td>
                      <td className="p-4">
                        {t.assignedFreelancerName ? (
                          <span className="font-bold text-slate-800">{t.assignedFreelancerName}</span>
                        ) : (
                          <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-50 text-blue-700">
                            Available Pool
                          </span>
                        )}
                      </td>
                      <td className="p-4">
                        <div>{t.targetArea}</div>
                        <div className="text-[11px] text-slate-400">{t.city}</div>
                      </td>
                      <td className="p-4 font-mono">{t.deadline}</td>
                      <td className="p-4 font-black text-slate-900">₹{t.payoutAmount}</td>
                      <td className="p-4">
                        <span className={`px-2.5 py-1 rounded-full text-[11px] font-extrabold ${
                          t.status === 'Approved' ? 'bg-emerald-100 text-emerald-800' :
                          t.status === 'Submitted' ? 'bg-amber-100 text-amber-800' :
                          t.status === 'Rework Required' ? 'bg-rose-100 text-rose-800' :
                          t.status === 'Accepted' || t.status === 'In Progress' ? 'bg-blue-100 text-blue-800' :
                          'bg-slate-100 text-slate-700'
                        }`}>
                          {t.status}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        {['Submitted', 'Under Review'].includes(t.status) && (
                          <button
                            onClick={() => {
                              setSelectedTaskForReview(t);
                              setReviewDecision('Approved');
                              setReviewComment('');
                              setReviewError(null);
                            }}
                            className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-lg transition-colors inline-flex items-center gap-1 shadow-xs"
                          >
                            <ShieldCheck className="w-3.5 h-3.5" />
                            QC Audit
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 3: QUALITY CONTROL QUEUE */}
      {activeView === 'qc' && (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-black text-slate-900">Awaiting Quality Control Inspection</h3>
              <p className="text-xs text-slate-500">
                Audited evidence establishes verified task status for milestone payout releases.
              </p>
            </div>
            <button
              onClick={loadData}
              className="text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg border border-indigo-200 transition-colors inline-flex items-center gap-1"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Refresh Queue
            </button>
          </div>

          {qcQueue.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-slate-200">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
              <h4 className="text-base font-bold text-slate-900">QC Review Queue Clear</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                All submitted field onboardings and retail audits have been audited and verified.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {qcQueue.map((item) => (
                <div key={item.id} className="bg-white rounded-2xl p-6 border border-amber-200 shadow-xs flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg">
                        {item.taskRef || item.id}
                      </span>
                      <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        Pending Audit
                      </span>
                    </div>

                    <div>
                      <h4 className="text-base font-black text-slate-900">{item.title}</h4>
                      <p className="text-xs text-slate-500">Project: <strong>{item.projectName}</strong> ({item.clientName})</p>
                    </div>

                    <div className="bg-slate-50 rounded-xl p-3 text-xs space-y-1.5 border border-slate-200">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Freelancer:</span>
                        <span className="font-bold text-slate-800">{item.freelancerName || item.assignedFreelancerName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Location:</span>
                        <span className="font-medium text-slate-700">{item.targetArea}, {item.city}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Submitted:</span>
                        <span className="font-mono text-slate-700">{item.submittedAt || 'Recently'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
                    <div>
                      <div className="text-[10px] text-slate-400 font-bold uppercase">Milestone Value</div>
                      <div className="text-lg font-black text-slate-900">₹{item.payoutAmount}</div>
                    </div>

                    <button
                      onClick={() => {
                        setSelectedTaskForReview(item);
                        setReviewDecision('Approved');
                        setReviewComment('');
                        setReviewError(null);
                      }}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-bold rounded-xl transition-colors shadow-sm inline-flex items-center gap-1.5"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      Inspect & Decide
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* CREATE PROJECT MODAL */}
      {showCreateProject && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 my-8 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-xl font-black text-slate-900">Create Field Project Contract</h3>
              <button onClick={() => setShowCreateProject(false)} className="text-slate-400 hover:text-slate-700 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateProject} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Project Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    placeholder="e.g. Tier-1 POS Merchant Rollout"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Client Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="e.g. PhonePe Merchant Services"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Service Category
                </label>
                <select
                  value={serviceCategory}
                  onChange={(e) => setServiceCategory(e.target.value as ServiceCategory)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs"
                >
                  <option value="Merchant and restaurant onboarding">Merchant and restaurant onboarding</option>
                  <option value="Rider and worker onboarding">Rider and worker onboarding</option>
                  <option value="Field audits and surveys">Field audits and surveys</option>
                  <option value="KYC and background verification">KYC and background verification</option>
                  <option value="Product sampling and brand activation">Product sampling and brand activation</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Contract Deliverables & Scope
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe scope, merchant qualification criteria, and expected proof..."
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Target City</label>
                  <input
                    type="text"
                    value={targetCity}
                    onChange={(e) => setTargetCity(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Target Units</label>
                  <input
                    type="number"
                    value={targetUnits}
                    onChange={(e) => setTargetUnits(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Rate / Unit (₹)</label>
                  <input
                    type="number"
                    value={payoutRate}
                    onChange={(e) => setPayoutRate(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
                  />
                </div>
              </div>

              {/* Eligibility Rules */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                <span className="text-xs font-bold text-slate-900 uppercase tracking-wider block">
                  Freelancer Eligibility & Prerequisite Rules:
                </span>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-slate-600 mb-1">Required Academy Certification</label>
                    <select
                      value={requiredCourseId}
                      onChange={(e) => setRequiredCourseId(e.target.value ? Number(e.target.value) : '')}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white"
                    >
                      <option value="">No Course Prerequisite Required</option>
                      {academyCourses.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.title} ({c.courseCode})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs text-slate-600 mb-1">Max Concurrent Tasks / Associate</label>
                    <input
                      type="number"
                      value={maxTasksPerFreelancer}
                      onChange={(e) => setMaxTasksPerFreelancer(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="locToggle"
                    checked={requiresLocation}
                    onChange={(e) => setRequiresLocation(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                  />
                  <label htmlFor="locToggle" className="text-xs text-slate-700 font-semibold cursor-pointer">
                    Mandatory GPS Location Verification on task submission
                  </label>
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateProject(false)}
                  className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md"
                >
                  Create & Launch Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE TASK MODAL */}
      {showCreateTask && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 my-8 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-xl font-black text-slate-900">Dispatch Field Task</h3>
              <button onClick={() => setShowCreateTask(false)} className="text-slate-400 hover:text-slate-700 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Parent Project Contract *
                </label>
                <select
                  required
                  value={taskProjectId}
                  onChange={(e) => {
                    setTaskProjectId(e.target.value);
                    const sel = projectsList.find(p => p.id === e.target.value);
                    if (sel?.payoutRate) setTaskPayout(sel.payoutRate);
                    if (sel?.requiresLocation !== undefined) setTaskRequiresLocation(sel.requiresLocation);
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs"
                >
                  <option value="">Select Project</option>
                  {projectsList.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.projectRef || p.id}) &bull; {p.clientName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Task Title *
                </label>
                <input
                  type="text"
                  required
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  placeholder="e.g. Deploy Soundbox & QR — Shri Krishna Provision Store"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Target Area</label>
                  <input
                    type="text"
                    value={taskArea}
                    onChange={(e) => setTaskArea(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Deadline Date</label>
                  <input
                    type="date"
                    value={taskDeadline}
                    onChange={(e) => setTaskDeadline(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Dispatch Allocation Mode
                </label>
                <select
                  value={taskFreelancerId}
                  onChange={(e) => setTaskFreelancerId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs bg-white"
                >
                  <option value="">Public Available Pool (Any eligible freelancer can claim)</option>
                  {freelancers.map(f => (
                    <option key={f.id} value={f.id}>
                      Direct Assign: {f.fullName} ({f.city}) &bull; {f.phone}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Rate / Milestone Payout (₹)
                </label>
                <input
                  type="number"
                  value={taskPayout}
                  onChange={(e) => setTaskPayout(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Required Proof Requirements (comma-separated)
                </label>
                <input
                  type="text"
                  value={evidenceRequirementsText}
                  onChange={(e) => setEvidenceRequirementsText(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateTask(false)}
                  className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md"
                >
                  Dispatch Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QC AUDIT & EVIDENCE INSPECTION DRAWER */}
      {selectedTaskForReview && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 my-8 space-y-5 animate-in zoom-in-95">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-3">
              <div>
                <span className="text-xs font-extrabold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg">
                  QC Audit Inspection &bull; {selectedTaskForReview.taskRef || selectedTaskForReview.id}
                </span>
                <h3 className="text-xl font-black text-slate-900 mt-1">{selectedTaskForReview.title}</h3>
                <p className="text-xs text-slate-500">{selectedTaskForReview.targetArea}, {selectedTaskForReview.city}</p>
              </div>
              <button onClick={() => setSelectedTaskForReview(null)} className="text-slate-400 hover:text-slate-700 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Associate Info */}
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-slate-400 block">Submitted By Associate:</span>
                <span className="font-bold text-slate-900">{selectedTaskForReview.freelancerName || selectedTaskForReview.assignedFreelancerName}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Contact Phone:</span>
                <span className="font-mono text-slate-800">{selectedTaskForReview.freelancerPhone || 'Registered Mobile'}</span>
              </div>
            </div>

            {/* Submitted Evidence */}
            {selectedTaskForReview.submission && (
              <div className="bg-indigo-50/40 rounded-2xl p-4 border border-indigo-100 space-y-3 text-xs">
                <strong className="block font-bold text-indigo-950 uppercase text-[10px] tracking-wider">
                  Submitted Field Evidence:
                </strong>

                {/* Form fields */}
                {selectedTaskForReview.submission.formData && (
                  <div className="grid grid-cols-2 gap-2 bg-white p-3 rounded-xl border border-indigo-50">
                    <div>
                      <span className="text-slate-400 block text-[10px]">Merchant Name:</span>
                      <span className="font-bold text-slate-900">{selectedTaskForReview.submission.formData.merchantName || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Terminal / POS Serial:</span>
                      <span className="font-mono font-bold text-slate-900">{selectedTaskForReview.submission.formData.terminalSerial || 'N/A'}</span>
                    </div>
                    <div className="col-span-2 pt-1 border-t border-slate-100">
                      <span className="text-slate-400 block text-[10px]">Field Notes:</span>
                      <p className="text-slate-700 mt-0.5">{selectedTaskForReview.submission.formData.notes || selectedTaskForReview.submission.freelancerNotes || 'No notes provided'}</p>
                    </div>
                  </div>
                )}

                {/* GeoTag */}
                {selectedTaskForReview.submission.geoTag && (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-2.5 text-emerald-900 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>
                        GPS Confirmed: <strong>{selectedTaskForReview.submission.geoTag.latitude}, {selectedTaskForReview.submission.geoTag.longitude}</strong>
                      </span>
                    </div>
                    <a
                      href={`https://www.google.com/maps?q=${selectedTaskForReview.submission.geoTag.latitude},${selectedTaskForReview.submission.geoTag.longitude}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-bold text-emerald-700 hover:text-emerald-900 underline inline-flex items-center gap-1"
                    >
                      View Map
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}

                {/* Evidence attachments */}
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1">
                    Attached Files ({selectedTaskForReview.submission.files?.length || 0})
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {selectedTaskForReview.submission.files && selectedTaskForReview.submission.files.length > 0 ? (
                      selectedTaskForReview.submission.files.map((file: any, idx: number) => (
                        <a
                          key={idx}
                          href={file.viewUrl || '#'}
                          target="_blank"
                          rel="noreferrer"
                          className="bg-white border border-slate-200 px-3 py-1.5 rounded-xl text-xs font-semibold text-indigo-700 hover:bg-indigo-50 inline-flex items-center gap-1.5 transition-colors"
                        >
                          <FileText className="w-3.5 h-3.5 text-slate-400" />
                          <span className="truncate max-w-[150px]">{file.originalFilename}</span>
                          <ExternalLink className="w-3 h-3 text-slate-400" />
                        </a>
                      ))
                    ) : (
                      <span className="text-slate-400 text-xs italic">No digital files attached</span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Review Decision Form */}
            <form onSubmit={handleReviewTask} className="space-y-4 pt-1">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Quality Audit Decision *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['Approved', 'Rework Required', 'Rejected'] as const).map((dec) => (
                    <button
                      key={dec}
                      type="button"
                      onClick={() => setReviewDecision(dec)}
                      className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition-all ${
                        reviewDecision === dec
                          ? dec === 'Approved' ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm' :
                            dec === 'Rework Required' ? 'bg-amber-500 text-slate-900 border-amber-500 shadow-sm' :
                            'bg-rose-600 text-white border-rose-600 shadow-sm'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {dec}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Audit Notes / Feedback to Freelancer {reviewDecision !== 'Approved' && '(Mandatory)'}
                </label>
                <textarea
                  rows={2}
                  required={reviewDecision !== 'Approved'}
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder={
                    reviewDecision === 'Approved'
                      ? 'Optional approval note: "All photos legible and QR test verified."'
                      : 'Specific correction instructions: e.g. "Front of store photo is blurry, retake clear photo showing soundbox."'
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-600"
                />
              </div>

              {reviewError && (
                <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-xs text-rose-800 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{reviewError}</span>
                </div>
              )}

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedTaskForReview(null)}
                  className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md"
                >
                  Confirm Decision & Notify Associate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
