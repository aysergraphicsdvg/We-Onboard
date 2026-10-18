import React, { useState } from 'react';
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
  UserCheck
} from 'lucide-react';
import { store } from '../../services/store';
import { Project, Task, ServiceCategory, FreelancerRole } from '../../types';

export const ProjectManager: React.FC = () => {
  const [activeView, setActiveView] = useState<'projects' | 'tasks'>('projects');
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [selectedTaskForReview, setSelectedTaskForReview] = useState<Task | null>(null);

  // Review states
  const [reviewDecision, setReviewDecision] = useState<'Approved' | 'Rework Required' | 'Rejected'>('Approved');
  const [reviewComment, setReviewComment] = useState('');

  // Create Project Form
  const [projectName, setProjectName] = useState('');
  const [clientName, setClientName] = useState('');
  const [serviceCategory, setServiceCategory] = useState<ServiceCategory>('Rider and worker onboarding');
  const [description, setDescription] = useState('');
  const [targetCity, setTargetCity] = useState('Bengaluru');
  const [targetAreas, setTargetAreas] = useState('Indiranagar, Koramangala');
  const [targetUnits, setTargetUnits] = useState(100);
  const [startDate, setStartDate] = useState('2026-10-15');
  const [endDate, setEndDate] = useState('2026-11-15');
  const [budget, setBudget] = useState(150000);

  // Create Task Form
  const [taskProjectId, setTaskProjectId] = useState('');
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [taskFreelancerId, setTaskFreelancerId] = useState('');
  const [taskArea, setTaskArea] = useState('Indiranagar');
  const [taskDeadline, setTaskDeadline] = useState('2026-10-22');
  const [taskPayout, setTaskPayout] = useState(2500);

  const state = store.getState();
  const projects = state.projects;
  const tasks = state.tasks;
  const freelancers = state.freelancers.filter((f) => f.status === 'Active' || f.status === 'Ready for Assignment');

  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectName || !clientName) return;

    store.addProject({
      name: projectName,
      clientName,
      serviceCategory,
      description,
      targetCity,
      targetAreas: targetAreas.split(',').map((s) => s.trim()),
      targetUnits: Number(targetUnits) || 100,
      startDate,
      endDate,
      projectManager: state.currentAdmin?.name || 'Muhammad Ali Shoaib',
      teamLeaders: ['Karthik Raman'],
      requiredRoles: ['Team Member / Field Executive'],
      deliverables: 'Verified units with geo-tag evidence and client sign-off',
      acceptanceCriteria: 'Complete audit checklist and authentic identity validation',
      paymentModel: 'Per Activation',
      budget: Number(budget) || 100000,
      status: 'Active'
    });

    setShowCreateProject(false);
    setProjectName('');
    alert('Field Project created and launched successfully!');
  };

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskProjectId || !taskTitle || !taskFreelancerId) {
      alert('Please select project, enter task title, and assign a freelancer.');
      return;
    }

    const assignedFl = freelancers.find((f) => f.id === taskFreelancerId);

    store.addTask({
      projectId: taskProjectId,
      title: taskTitle,
      description: taskDesc || 'Execute field onboarding and document collection.',
      assignedFreelancerId: taskFreelancerId,
      assignedFreelancerName: assignedFl?.fullName || 'Field Associate',
      city: 'Bengaluru',
      targetArea: taskArea,
      deadline: taskDeadline,
      evidenceRequirements: ['Storefront photo', 'Geo-tag coordinates', 'Owner/Rider KYC'],
      payoutAmount: Number(taskPayout) || 1500
    });

    setShowCreateTask(false);
    setTaskTitle('');
    alert('Task successfully created and assigned to freelancer!');
  };

  const handleReviewTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTaskForReview) return;

    store.reviewTask(
      selectedTaskForReview.id,
      reviewDecision,
      reviewComment || (reviewDecision === 'Approved' ? 'Evidence verified against criteria.' : 'Please rework missing fields.')
    );

    setSelectedTaskForReview(null);
    setReviewComment('');
    alert(`Task ${selectedTaskForReview.id} marked as ${reviewDecision}!`);
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      
      {/* Header and Switches */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-[#02167F]">
            Field Operations & Project Management
          </h2>
          <p className="text-xs text-slate-500">
            Create multi-hub client projects, assign field tasks to freelancers, and audit submitted evidence.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="bg-slate-200 p-1 rounded-xl flex items-center text-xs font-bold">
            <button
              onClick={() => setActiveView('projects')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                activeView === 'projects' ? 'bg-white text-[#02167F] shadow-xs' : 'text-slate-600'
              }`}
            >
              Projects ({projects.length})
            </button>
            <button
              onClick={() => setActiveView('tasks')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                activeView === 'tasks' ? 'bg-white text-[#02167F] shadow-xs' : 'text-slate-600'
              }`}
            >
              Task Board ({tasks.length})
            </button>
          </div>

          {activeView === 'projects' ? (
            <button
              onClick={() => setShowCreateProject(true)}
              className="bg-[#02167F] hover:bg-[#031d99] text-[#FFD014] font-bold px-3.5 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Project</span>
            </button>
          ) : (
            <button
              onClick={() => setShowCreateTask(true)}
              className="bg-[#02167F] hover:bg-[#031d99] text-[#FFD014] font-bold px-3.5 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Assign New Task</span>
            </button>
          )}
        </div>
      </div>

      {/* VIEW 1: Projects List */}
      {activeView === 'projects' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((proj) => {
            const pct = Math.round((proj.completedUnits / proj.targetUnits) * 100);
            return (
              <div
                key={proj.id}
                className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between space-y-4 hover:border-[#02167F]/40 transition-all"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-[10px] font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                      {proj.id}
                    </span>
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                      proj.status === 'Active' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'
                    }`}>
                      {proj.status}
                    </span>
                  </div>

                  <h3 className="text-base font-extrabold text-[#02167F] mb-1 leading-snug">
                    {proj.name}
                  </h3>
                  <p className="text-xs text-slate-600 font-semibold mb-3">
                    Client: {proj.clientName} &bull; {proj.serviceCategory}
                  </p>

                  <div className="space-y-1.5 text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Target Progress:</span>
                      <strong className="font-mono text-slate-900">{proj.completedUnits} / {proj.targetUnits} units ({pct}%)</strong>
                    </div>
                    <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                      <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${pct}%` }}></div>
                    </div>
                    <div className="flex justify-between pt-1 text-[11px] text-slate-500">
                      <span>Timeline: {proj.startDate} to {proj.endDate}</span>
                      <span>Budget: ₹{proj.budget?.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-medium">
                    Manager: {proj.projectManager}
                  </span>
                  <button
                    onClick={() => {
                      setTaskProjectId(proj.id);
                      setActiveView('tasks');
                    }}
                    className="text-[#02167F] font-bold hover:underline flex items-center gap-1"
                  >
                    <span>View Tasks ({tasks.filter(t => t.projectId === proj.id).length})</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* VIEW 2: Tasks Board */}
      {activeView === 'tasks' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Task ID</th>
                    <th className="px-4 py-3">Title & Area</th>
                    <th className="px-4 py-3">Assigned Freelancer</th>
                    <th className="px-4 py-3">Deadline</th>
                    <th className="px-4 py-3">Payout</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Evidence & Audit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {tasks.map((task) => (
                    <tr key={task.id} className="hover:bg-blue-50/40 transition-colors">
                      <td className="px-4 py-3 font-mono font-bold text-[#02167F]">
                        {task.id}
                      </td>
                      <td className="px-4 py-3">
                        <strong className="text-slate-900 block font-bold">{task.title}</strong>
                        <span className="text-slate-500 font-mono text-[10px]">{task.projectId} &bull; {task.targetArea}</span>
                      </td>
                      <td className="px-4 py-3 text-slate-800">
                        {task.assignedFreelancerName}
                      </td>
                      <td className="px-4 py-3 text-slate-600 font-mono">
                        {task.deadline}
                      </td>
                      <td className="px-4 py-3 font-mono font-bold text-slate-800">
                        ₹{task.payoutAmount.toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          task.status === 'Approved' ? 'bg-emerald-100 text-emerald-800' :
                          task.status === 'Submitted' ? 'bg-amber-100 text-amber-800' :
                          task.status === 'In Progress' ? 'bg-blue-100 text-blue-800' :
                          'bg-slate-100 text-slate-700'
                        }`}>
                          {task.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {task.evidence ? (
                          <button
                            onClick={() => {
                              setSelectedTaskForReview(task);
                              setReviewDecision('Approved');
                              setReviewComment(task.reviewComment || '');
                            }}
                            className="bg-amber-500 hover:bg-amber-600 text-slate-900 font-extrabold text-[11px] px-3 py-1 rounded transition-colors shadow-xs"
                          >
                            Review Evidence
                          </button>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">No Evidence Yet</span>
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

      {/* Create Project Modal */}
      {showCreateProject && (
        <div className="fixed inset-0 z-50 bg-[#02167F]/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 sm:p-8 max-h-[90vh] overflow-y-auto relative shadow-2xl border border-slate-200 animate-in zoom-in-95 space-y-4">
            <button onClick={() => setShowCreateProject(false)} className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-700">
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-xl font-extrabold text-[#02167F]">
              Launch New Field Project
            </h3>

            <form onSubmit={handleCreateProject} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Project Name</label>
                <input
                  type="text"
                  required
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="e.g. Koramangala Q-Commerce Dark Store Fleet"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Client / Brand</label>
                  <input
                    type="text"
                    required
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="e.g. SpeedDash Mobility"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Service</label>
                  <select
                    value={serviceCategory}
                    onChange={(e) => setServiceCategory(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs bg-white"
                  >
                    <option value="Rider and worker onboarding">Rider Onboarding</option>
                    <option value="Merchant and restaurant onboarding">Merchant Onboarding</option>
                    <option value="Field audits and surveys">Field Audits</option>
                    <option value="Franchise and dealership development">Franchise Building</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Target Units</label>
                  <input
                    type="number"
                    value={targetUnits}
                    onChange={(e) => setTargetUnits(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">End Date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Target Bangalore Hubs</label>
                <input
                  type="text"
                  value={targetAreas}
                  onChange={(e) => setTargetAreas(e.target.value)}
                  placeholder="e.g. Indiranagar, Koramangala, HSR"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button type="button" onClick={() => setShowCreateProject(false)} className="px-4 py-2 text-xs font-bold text-slate-600">
                  Cancel
                </button>
                <button type="submit" className="bg-[#02167F] text-[#FFD014] font-bold px-5 py-2 rounded-lg text-xs">
                  Create Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Task Modal */}
      {showCreateTask && (
        <div className="fixed inset-0 z-50 bg-[#02167F]/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 sm:p-8 max-h-[90vh] overflow-y-auto relative shadow-2xl border border-slate-200 animate-in zoom-in-95 space-y-4">
            <button onClick={() => setShowCreateTask(false)} className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-700">
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-xl font-extrabold text-[#02167F]">
              Assign Field Task
            </h3>

            <form onSubmit={handleCreateTask} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Belongs to Project</label>
                <select
                  required
                  value={taskProjectId}
                  onChange={(e) => setTaskProjectId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs bg-white"
                >
                  <option value="">Select Project...</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>{p.id} - {p.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Task Title</label>
                <input
                  type="text"
                  required
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  placeholder="e.g. Collect 5 Kirana merchant onboarding forms"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Assign to Active Freelancer</label>
                <select
                  required
                  value={taskFreelancerId}
                  onChange={(e) => setTaskFreelancerId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs bg-white"
                >
                  <option value="">Choose Freelancer...</option>
                  {freelancers.map((f) => (
                    <option key={f.id} value={f.id}>{f.fullName} ({f.id} &bull; {f.city})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Target Area</label>
                  <input
                    type="text"
                    value={taskArea}
                    onChange={(e) => setTaskArea(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Deadline Date</label>
                  <input
                    type="date"
                    value={taskDeadline}
                    onChange={(e) => setTaskDeadline(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Freelancer Payout on Approval (INR)</label>
                <input
                  type="number"
                  value={taskPayout}
                  onChange={(e) => setTaskPayout(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-mono"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button type="button" onClick={() => setShowCreateTask(false)} className="px-4 py-2 text-xs font-bold text-slate-600">
                  Cancel
                </button>
                <button type="submit" className="bg-[#02167F] text-[#FFD014] font-bold px-5 py-2 rounded-lg text-xs">
                  Assign Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Task Evidence Audit Modal */}
      {selectedTaskForReview && (
        <div className="fixed inset-0 z-50 bg-[#02167F]/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 sm:p-8 max-h-[90vh] overflow-y-auto relative shadow-2xl border border-slate-200 animate-in zoom-in-95 space-y-4">
            <button onClick={() => setSelectedTaskForReview(null)} className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-700">
              <X className="w-5 h-5" />
            </button>
            
            <h3 className="text-xl font-extrabold text-[#02167F]">
              Review Task Evidence
            </h3>
            <span className="text-xs text-slate-500 font-mono block">
              {selectedTaskForReview.id} &bull; {selectedTaskForReview.title}
            </span>

            {/* Submitted Evidence Details */}
            {selectedTaskForReview.evidence && (
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs space-y-2">
                <div className="flex justify-between text-slate-500">
                  <span>Submitted by <strong>{selectedTaskForReview.assignedFreelancerName}</strong></span>
                  <span className="font-mono">{selectedTaskForReview.evidence.submittedAt}</span>
                </div>
                <div>
                  <strong className="text-slate-700 block">Execution Notes:</strong>
                  <p className="text-slate-800 text-sm mt-0.5">{selectedTaskForReview.evidence.freelancerNotes}</p>
                </div>
                {selectedTaskForReview.evidence.geoTag && (
                  <div className="p-2 bg-blue-50 border border-blue-200 rounded text-blue-900 text-[11px] space-y-0.5 font-mono">
                    <span className="font-bold block">⌖ Geo-Tag Authentication:</span>
                    <span>Lat: {selectedTaskForReview.evidence.geoTag.latitude}, Lng: {selectedTaskForReview.evidence.geoTag.longitude}</span>
                    <span className="block font-sans text-slate-700">{selectedTaskForReview.evidence.geoTag.address}</span>
                  </div>
                )}
                <div>
                  <strong className="text-slate-700 block mb-1">Attached Files:</strong>
                  <div className="flex flex-wrap gap-2">
                    {selectedTaskForReview.evidence.attachments.map((a, i) => (
                      <span key={i} className="bg-white px-2.5 py-1 rounded border border-slate-200 font-mono text-[11px]">
                        📸 {a.name}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Review Decision Form */}
            <form onSubmit={handleReviewTask} className="space-y-3 pt-2">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Audit Decision</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['Approved', 'Rework Required', 'Rejected'] as const).map((dec) => (
                    <button
                      key={dec}
                      type="button"
                      onClick={() => setReviewDecision(dec)}
                      className={`py-2 text-xs font-bold rounded-lg border transition-colors ${
                        reviewDecision === dec
                          ? dec === 'Approved' ? 'bg-emerald-600 text-white border-emerald-600' :
                            dec === 'Rework Required' ? 'bg-amber-500 text-slate-900 border-amber-500' :
                            'bg-red-600 text-white border-red-600'
                          : 'bg-white text-slate-700 border-slate-200'
                      }`}
                    >
                      {dec}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Review Comment / Feedback to Freelancer
                </label>
                <textarea
                  rows={2}
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder="Feedback on photos, KYC validation, or next steps..."
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs"
                ></textarea>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button type="button" onClick={() => setSelectedTaskForReview(null)} className="px-4 py-2 text-xs font-bold text-slate-600">
                  Cancel
                </button>
                <button type="submit" className="bg-[#02167F] text-[#FFD014] font-bold px-5 py-2 rounded-lg text-xs">
                  Save Decision & Release Payout
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
};
