import { 
  Enquiry, 
  Freelancer, 
  Project, 
  Task, 
  MsmeRequest, 
  Client, 
  FranchiseLead, 
  HeroBanner, 
  CmsService, 
  FaqItem, 
  SiteSettings, 
  AdminUser, 
  AuditLog, 
  AppNotification, 
  AdminRole, 
  FreelancerStatus, 
  EnquiryStatus, 
  TaskStatus,
  ProjectStatus,
  Course,
  FreelancerCertificate,
  AssessmentAttempt,
  Team,
  RankPromotionRecord,
  RankEligibilityCandidate,
  FreelancerRank,
  LedgerAccount,
  LedgerEntry,
  LedgerJournal,
  EarningEntitlement,
  ReserveRecord,
  PayoutRequest,
  FreelancerWallet,
  TrialBalanceReport
} from '../types';

import {
  initialSiteSettings,
  initialHeroBanners,
  initialServices,
  initialFaqs,
  initialEnquiries,
  initialFreelancers,
  initialProjects,
  initialTasks,
  initialMsmeRequests,
  initialClients,
  initialFranchiseLeads,
  initialAdminUsers,
  initialAuditLogs,
  initialNotifications,
  initialAcademyCourses,
  initialCertificates,
  initialTeams,
  initialRankPromotions,
  initialLedgerAccounts,
  initialLedgerJournals,
  initialEarningEntitlements,
  initialReserveRecords,
  initialPayoutRequests,
  initialWallets
} from '../data/initialData';
import { seedDemoData, resetDemoData } from './demoData';

const STORAGE_KEY = 'we_onboard_db_state_v1';

export const DEFAULT_QUALITY_SCORE_CONFIG: Record<string, number> = {
  min_sample_size: 3,
  weight_approval: 40,
  weight_rework: 25,
  weight_timeliness: 20,
  weight_evidence: 15,
  penalty_fraud: 50,
  active_member_min_qs: 70,
  leader_min_qs: 85,
  manager_min_qs: 85,
  leader_min_active_members: 10,
  manager_min_qualifying_teams: 3
};

export interface AppState {
  settings: SiteSettings;
  heroBanners: HeroBanner[];
  services: CmsService[];
  faqs: FaqItem[];
  enquiries: Enquiry[];
  freelancers: Freelancer[];
  projects: Project[];
  tasks: Task[];
  msmeRequests: MsmeRequest[];
  clients: Client[];
  franchiseLeads: FranchiseLead[];
  adminUsers: AdminUser[];
  auditLogs: AuditLog[];
  notifications: AppNotification[];
  academyCourses: Course[];
  certificates: FreelancerCertificate[];
  assessmentAttempts: AssessmentAttempt[];
  teams: Team[];
  rankPromotions: RankPromotionRecord[];
  qualityScoreConfig: Record<string, number>;
  ledgerAccounts: LedgerAccount[];
  ledgerJournals: LedgerJournal[];
  earningEntitlements: EarningEntitlement[];
  reserveRecords: ReserveRecord[];
  payoutRequests: PayoutRequest[];
  wallets: Record<string, FreelancerWallet>;
  currentAdmin: AdminUser | null;
  currentFreelancer: Freelancer | null;
}

function loadState(): AppState {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
    if (raw) {
      const parsed = JSON.parse(raw);
      const loadedBanners = (parsed.heroBanners || initialHeroBanners).map((b: HeroBanner) => {
        if (b.id === 'banner-5' && (b.ctaText?.includes('Eligibility') || b.eyebrow?.includes('MSME SUPPORT'))) {
          return {
            ...b,
            eyebrow: 'GOVERNMENT DEPARTMENTS & IMPLEMENTING AGENCIES',
            heading: 'On-ground execution for',
            headingHighlight: 'government schemes & PSUs.',
            description: 'Partner with We Onboard for field mobilization, Udyam, PM Vishwakarma, ONDC seller drives, and cluster compliance audits with live geo-tagged dashboards.',
            ctaText: 'Partner with Govt Desk',
            ctaLink: '#msme',
            secondaryCtaText: 'Speak to Nodal Director',
            trustPoints: ['Geo-tagged verification', 'Live department dashboards', 'Transparent audit trails']
          };
        }
        return b;
      });

      return {
        settings: parsed.settings || initialSiteSettings,
        heroBanners: loadedBanners,
        services: parsed.services || initialServices,
        faqs: parsed.faqs || initialFaqs,
        enquiries: parsed.enquiries || initialEnquiries,
        freelancers: parsed.freelancers || initialFreelancers,
        projects: parsed.projects || initialProjects,
        tasks: parsed.tasks || initialTasks,
        msmeRequests: parsed.msmeRequests || initialMsmeRequests,
        clients: parsed.clients || initialClients,
        franchiseLeads: parsed.franchiseLeads || initialFranchiseLeads,
        adminUsers: parsed.adminUsers || initialAdminUsers,
        auditLogs: parsed.auditLogs || initialAuditLogs,
        notifications: parsed.notifications || initialNotifications,
        academyCourses: parsed.academyCourses || initialAcademyCourses,
        certificates: parsed.certificates || initialCertificates,
        assessmentAttempts: parsed.assessmentAttempts || [],
        teams: parsed.teams || initialTeams,
        rankPromotions: parsed.rankPromotions || initialRankPromotions,
        qualityScoreConfig: parsed.qualityScoreConfig || DEFAULT_QUALITY_SCORE_CONFIG,
        ledgerAccounts: parsed.ledgerAccounts || initialLedgerAccounts,
        ledgerJournals: parsed.ledgerJournals || initialLedgerJournals,
        earningEntitlements: parsed.earningEntitlements || initialEarningEntitlements,
        reserveRecords: parsed.reserveRecords || initialReserveRecords,
        payoutRequests: parsed.payoutRequests || initialPayoutRequests,
        wallets: parsed.wallets || initialWallets,
        currentAdmin: parsed.currentAdmin || null,
        currentFreelancer: parsed.currentFreelancer || null
      };
    }
  } catch (e) {
    console.error('Error loading state from localStorage:', e);
  }

  return {
    settings: initialSiteSettings,
    heroBanners: initialHeroBanners,
    services: initialServices,
    faqs: initialFaqs,
    enquiries: initialEnquiries,
    freelancers: initialFreelancers,
    projects: initialProjects,
    tasks: initialTasks,
    msmeRequests: initialMsmeRequests,
    clients: initialClients,
    franchiseLeads: initialFranchiseLeads,
    adminUsers: initialAdminUsers,
    auditLogs: initialAuditLogs,
    notifications: initialNotifications,
    academyCourses: initialAcademyCourses,
    certificates: initialCertificates,
    assessmentAttempts: [],
    teams: initialTeams,
    rankPromotions: initialRankPromotions,
    qualityScoreConfig: DEFAULT_QUALITY_SCORE_CONFIG,
    ledgerAccounts: initialLedgerAccounts,
    ledgerJournals: initialLedgerJournals,
    earningEntitlements: initialEarningEntitlements,
    reserveRecords: initialReserveRecords,
    payoutRequests: initialPayoutRequests,
    wallets: initialWallets,
    currentAdmin: null,
    currentFreelancer: null
  };
}

class Store {
  private state: AppState;
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.state = loadState();
    if (!this.state.projects.some((p) => p.id === 'DEMO-PRJ-01')) {
      seedDemoData(this);
    }
  }

  private save() {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
      }
    } catch (e) {
      console.error('Failed to save state to localStorage:', e);
    }
    this.notify();
  }

  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.listeners.forEach((l) => l());
  }

  getState(): AppState {
    return this.state;
  }

  logAudit(action: string, recordType: AuditLog['recordType'], recordId: string, details: string) {
    const log: AuditLog = {
      id: `aud-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      actingUser: this.state.currentAdmin?.name || 'Public Guest',
      action,
      recordType,
      recordId,
      details,
      timestamp: new Date().toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' }),
      ipAddress: '127.0.0.1 (Internal/Secure Session)'
    };
    this.state.auditLogs = [log, ...this.state.auditLogs];
  }

  addNotification(title: string, message: string, type: AppNotification['type'], link?: string) {
    const notif: AppNotification = {
      id: `notif-${Date.now()}`,
      title,
      message,
      type,
      timestamp: 'Just now',
      read: false,
      link
    };
    this.state.notifications = [notif, ...this.state.notifications];
  }

  setAuthenticatedAdmin(user: AdminUser | null) {
    this.state.currentAdmin = user;
    this.save();
  }

  // Auth Operations (Local sandbox fallback for offline preview testing only)
  loginAdminPreview(email: string): boolean {
    const user = this.state.adminUsers.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
    if (user && user.isActive) {
      user.lastLogin = new Date().toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' });
      this.state.currentAdmin = user;
      this.logAudit('Sandbox Admin Session', 'Auth', user.id, `User ${user.name} entered preview sandbox with role ${user.role}`);
      this.save();
      return true;
    }
    this.logAudit('Failed Sandbox Login', 'Auth', 'SECURITY_EVENT', `Failed login attempt for email: ${email}`);
    return false;
  }

  loginAdmin(email: string): boolean {
    return this.loginAdminPreview(email);
  }

  logoutAdmin() {
    if (this.state.currentAdmin) {
      this.logAudit('Admin Logged Out', 'Auth', this.state.currentAdmin.id, `User ${this.state.currentAdmin.name} logged out`);
    }
    this.state.currentAdmin = null;
    this.save();
  }

  switchAdminRole(role: AdminRole) {
    if (this.state.currentAdmin) {
      this.state.currentAdmin = {
        ...this.state.currentAdmin,
        role
      };
      this.logAudit('Role Switched (Testing)', 'User', this.state.currentAdmin.id, `Simulated role switch to ${role}`);
      this.save();
    }
  }

  loginFreelancer(identifier: string): boolean {
    const match = this.state.freelancers.find(
      (f) => f.id.toLowerCase() === identifier.toLowerCase() || f.email.toLowerCase() === identifier.toLowerCase() || f.phone.includes(identifier)
    );
    if (match) {
      this.state.currentFreelancer = match;
      this.save();
      return true;
    }
    return false;
  }

  setAuthenticatedFreelancer(fl: Freelancer | null) {
    this.state.currentFreelancer = fl;
    this.save();
  }

  logoutFreelancer() {
    this.state.currentFreelancer = null;
    this.save();
  }

  // Enquiry Operations
  addEnquiry(data: Omit<Enquiry, 'id' | 'submittedAt' | 'status' | 'notes'>): Enquiry {
    const nextSeq = 1000 + this.state.enquiries.length + 1;
    const newEnquiry: Enquiry = {
      ...data,
      id: `WO-ENQ-${nextSeq}`,
      submittedAt: new Date().toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' }),
      status: 'New',
      notes: []
    };
    this.state.enquiries = [newEnquiry, ...this.state.enquiries];
    this.logAudit('Public Enquiry Submitted', 'Enquiry', newEnquiry.id, `New ${newEnquiry.enquiryType} enquiry from ${newEnquiry.fullName} (${newEnquiry.city})`);
    this.addNotification('New Enquiry Received', `${newEnquiry.fullName} submitted an enquiry for ${newEnquiry.serviceRequired}.`, 'enquiry', 'enquiries');
    this.save();
    return newEnquiry;
  }

  updateEnquiryStatus(id: string, status: EnquiryStatus, followUpDate?: string, proposalValue?: number) {
    const item = this.state.enquiries.find((e) => e.id === id);
    if (item) {
      const old = item.status;
      item.status = status;
      if (followUpDate !== undefined) item.followUpDate = followUpDate;
      if (proposalValue !== undefined) item.proposalValue = proposalValue;
      this.logAudit('Enquiry Status Changed', 'Enquiry', id, `Status updated from ${old} to ${status}`);
      this.save();
    }
  }

  assignEnquiry(id: string, staffName: string) {
    const item = this.state.enquiries.find((e) => e.id === id);
    if (item) {
      item.assignedStaff = staffName;
      this.logAudit('Enquiry Assigned', 'Enquiry', id, `Assigned to ${staffName}`);
      this.save();
    }
  }

  addEnquiryNote(id: string, text: string) {
    const item = this.state.enquiries.find((e) => e.id === id);
    if (item) {
      const note = {
        id: `note-${Date.now()}`,
        author: this.state.currentAdmin?.name || 'Administrator',
        text,
        createdAt: new Date().toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })
      };
      item.notes.push(note);
      this.logAudit('Enquiry Note Added', 'Enquiry', id, `Added internal note: ${text.slice(0, 40)}...`);
      this.save();
    }
  }

  convertEnquiryToClient(enquiryId: string): Client | null {
    const enquiry = this.state.enquiries.find((e) => e.id === enquiryId);
    if (!enquiry) return null;

    const clientId = `CLI-2026-${String(this.state.clients.length + 1).padStart(3, '0')}`;
    const newClient: Client = {
      id: clientId,
      companyName: enquiry.companyName || enquiry.fullName,
      primaryContact: enquiry.fullName,
      phone: enquiry.phone,
      email: enquiry.email,
      industry: enquiry.serviceRequired.toString(),
      city: enquiry.city,
      servicesRequired: [enquiry.serviceRequired.toString()],
      leadSource: `Enquiry ${enquiry.id}`,
      assignedAccountManager: enquiry.assignedStaff || this.state.currentAdmin?.name || 'Muhammad Ali Shoaib',
      clientStatus: 'Active Client',
      notes: [`Converted from enquiry ${enquiry.id}. Original note: ${enquiry.message}`],
      contractValue: enquiry.proposalValue || 50000,
      createdAt: new Date().toISOString().split('T')[0]
    };

    enquiry.status = 'Converted';
    enquiry.convertedClientId = clientId;

    this.state.clients = [newClient, ...this.state.clients];
    this.logAudit('Converted Enquiry to Client', 'Client', clientId, `Enquiry ${enquiryId} converted to client ${newClient.companyName}`);
    this.save();
    return newClient;
  }

  // Freelancer Operations
  registerFreelancer(data: Omit<Freelancer, 'id' | 'registeredAt' | 'status' | 'approvedWorkingAreas' | 'completedTasksCount' | 'totalEarnings' | 'pendingPayout' | 'documents' | 'trainings'>): Freelancer {
    const nextSeq = String(this.state.freelancers.length + 1).padStart(3, '0');
    const newFreelancer: Freelancer = {
      ...data,
      id: `WO-FR-2026-${nextSeq}`,
      registeredAt: new Date().toISOString().split('T')[0],
      status: 'Submitted',
      approvedWorkingAreas: [],
      completedTasksCount: 0,
      totalEarnings: 0,
      pendingPayout: 0,
      documents: [
        {
          id: `doc-${Date.now()}-1`,
          name: 'ID Proof Document',
          type: 'Aadhaar',
          fileName: `${data.fullName.toLowerCase().replace(/\s+/g, '_')}_id.pdf`,
          uploadedAt: new Date().toISOString().split('T')[0],
          verified: false,
          status: 'Pending'
        }
      ],
      trainings: [
        { moduleName: 'Field Ethics & Safety Protocols', completed: false },
        { moduleName: 'Digital Onboarding & App Verification SOP', completed: false }
      ]
    };

    this.state.freelancers = [newFreelancer, ...this.state.freelancers];
    this.logAudit('New Freelancer Registration', 'Freelancer', newFreelancer.id, `${newFreelancer.fullName} registered for ${newFreelancer.preferredRole}`);
    this.addNotification('New Freelancer Registered', `${newFreelancer.fullName} submitted registration for ${newFreelancer.city}.`, 'freelancer', 'freelancers');
    this.save();
    return newFreelancer;
  }

  updateFreelancerStatus(id: string, status: FreelancerStatus, verificationNotes?: string, approvedAreas?: string[]) {
    const fl = this.state.freelancers.find((f) => f.id === id);
    if (fl) {
      const old = fl.status;
      fl.status = status;
      if (verificationNotes !== undefined) fl.verificationNotes = verificationNotes;
      if (approvedAreas) fl.approvedWorkingAreas = approvedAreas;
      this.logAudit('Freelancer Status Updated', 'Freelancer', id, `Status changed from ${old} to ${status}`);
      this.save();
    }
  }

  updateFreelancerDocumentReview(freelancerId: string, docId: string, status: any, reason?: string) {
    const fl = this.state.freelancers.find((f) => f.id === freelancerId);
    if (fl) {
      const doc = fl.documents.find((d) => d.id === docId);
      if (doc) {
        doc.status = status;
        doc.verified = status === 'Approved';
        doc.rejectionReason = reason;
        doc.reviewedAt = new Date().toISOString().split('T')[0];
        this.logAudit('Document Reviewed', 'Freelancer', freelancerId, `Document ${doc.name} marked ${status}${reason ? ': ' + reason : ''}`);
        this.save();
      }
    }
  }

  toggleFreelancerDocumentVerified(freelancerId: string, docId: string) {
    const fl = this.state.freelancers.find((f) => f.id === freelancerId);
    if (fl) {
      const doc = fl.documents.find((d) => d.id === docId);
      if (doc) {
        doc.verified = !doc.verified;
        this.logAudit('Document Verification Toggled', 'Freelancer', freelancerId, `Document ${doc.name} marked ${doc.verified ? 'VERIFIED' : 'UNVERIFIED'}`);
        this.save();
      }
    }
  }

  toggleFreelancerTraining(freelancerId: string, moduleName: string) {
    const fl = this.state.freelancers.find((f) => f.id === freelancerId);
    if (fl) {
      const tr = fl.trainings.find((t) => t.moduleName === moduleName);
      if (tr) {
        tr.completed = !tr.completed;
        tr.completedAt = tr.completed ? new Date().toISOString().split('T')[0] : undefined;
        this.logAudit('Training Module Status Updated', 'Freelancer', freelancerId, `Module "${moduleName}" marked ${tr.completed ? 'COMPLETED' : 'PENDING'}`);
        this.save();
      }
    }
  }

  // Project & Task Operations
  addProject(data: Omit<Project, 'id' | 'completedUnits' | 'tasksCount'>): Project {
    const id = `PRJ-2026-${String(this.state.projects.length + 1).padStart(2, '0')}`;
    const newProj: Project = {
      ...data,
      id,
      completedUnits: 0,
      tasksCount: 0
    };
    this.state.projects = [newProj, ...this.state.projects];
    this.logAudit('New Project Created', 'Project', id, `Project "${newProj.name}" created for ${newProj.clientName}`);
    this.save();
    return newProj;
  }

  addTask(data: Omit<Task, 'id' | 'status'>): Task {
    const id = `TSK-${100 + this.state.tasks.length + 1}`;
    const newTask: Task = {
      ...data,
      id,
      status: 'Assigned'
    };
    this.state.tasks = [newTask, ...this.state.tasks];
    
    // Increment project task count
    const proj = this.state.projects.find((p) => p.id === data.projectId);
    if (proj) {
      proj.tasksCount = (proj.tasksCount || 0) + 1;
    }

    this.logAudit('New Task Assigned', 'Task', id, `Task "${newTask.title}" assigned to ${newTask.assignedFreelancerName || 'Freelancer'}`);
    this.save();
    return newTask;
  }

  submitTaskEvidence(taskId: string, notes: string, address: string, lat: number, lng: number, attachmentNames: string[]) {
    const task = this.state.tasks.find((t) => t.id === taskId);
    if (task) {
      task.status = 'Submitted';
      task.evidence = {
        id: `ev-${Date.now()}`,
        submittedAt: new Date().toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' }),
        freelancerNotes: notes,
        geoTag: {
          latitude: lat,
          longitude: lng,
          address
        },
        attachments: attachmentNames.map((name) => ({ name }))
      };
      this.logAudit('Task Evidence Submitted', 'Task', taskId, `Freelancer submitted evidence for task ${task.title}`);
      this.addNotification('Task Awaiting Review', `Evidence submitted for ${task.title}. Review required.`, 'task', 'projects');
      this.save();
    }
  }

  reviewTask(taskId: string, status: 'Approved' | 'Rework Required' | 'Rejected', reviewComment: string) {
    const task = this.state.tasks.find((t) => t.id === taskId);
    if (task) {
      task.status = status;
      task.reviewComment = reviewComment;
      task.reviewedBy = this.state.currentAdmin?.name || 'Project Manager';
      task.reviewedAt = new Date().toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' });

      // If approved, update freelancer payout & project completed units
      if (status === 'Approved' && task.assignedFreelancerId) {
        const fl = this.state.freelancers.find((f) => f.id === task.assignedFreelancerId);
        if (fl) {
          fl.completedTasksCount = (fl.completedTasksCount || 0) + 1;
          fl.totalEarnings = (fl.totalEarnings || 0) + task.payoutAmount;
          fl.pendingPayout = (fl.pendingPayout || 0) + task.payoutAmount;
        }

        const proj = this.state.projects.find((p) => p.id === task.projectId);
        if (proj) {
          proj.completedUnits = Math.min(proj.targetUnits, (proj.completedUnits || 0) + 1);
        }

        // Phase 7: Financial Subsystem - Double-entry recognition & 70/20/10 split
        this.recognizeTaskEarnings(taskId);
      }

      this.logAudit('Task Reviewed', 'Task', taskId, `Task reviewed as ${status}. Comment: ${reviewComment}`);
      this.save();
    }
  }

  acceptTask(taskId: string, freelancerId: string): { success: boolean; error?: string } {
    const task = this.state.tasks.find((t) => t.id === taskId);
    if (!task) return { success: false, error: 'Task not found.' };

    if (!['Available', 'Assigned'].includes(task.status)) {
      return { success: false, error: `Conflict: This task cannot be claimed because its status is '${task.status}'.` };
    }
    if (task.assignedFreelancerId && task.assignedFreelancerId !== freelancerId) {
      return { success: false, error: 'Conflict: This task has already been claimed by another field associate.' };
    }

    const fl = this.state.freelancers.find((f) => f.id === freelancerId);
    if (!fl) return { success: false, error: 'Freelancer account not found.' };

    const isKycApproved = (fl.status === 'Active' || fl.onboardingStatus === 'Approved');
    if (!isKycApproved) {
      return { success: false, error: 'KYC Verification Required: You must be KYC approved before claiming field tasks.' };
    }

    const proj = this.state.projects.find((p) => p.id === task.projectId);
    if (proj?.requiredTrainingCourseId) {
      const hasCert = (this.state.certificates || []).some(
        (c: FreelancerCertificate) => c.freelancerId === freelancerId && String(c.courseId) === String(proj.requiredTrainingCourseId)
      );
      if (!hasCert) {
        return { 
          success: false, 
          error: `Training Prerequisite Required: You must complete and earn a certificate for '${proj.requiredCourseTitle || 'Mandatory Academy Course'}' before accepting this task.` 
        };
      }
    }

    const activeCount = this.state.tasks.filter(
      (t) => t.assignedFreelancerId === freelancerId && ['Assigned', 'Accepted', 'In Progress', 'Rework Required'].includes(t.status)
    ).length;
    const maxCapacity = proj?.maxTasksPerFreelancer || 5;
    if (activeCount >= maxCapacity) {
      return { success: false, error: `Maximum active workload reached (${maxCapacity} tasks). Submit or complete pending tasks first.` };
    }

    task.assignedFreelancerId = freelancerId;
    task.assignedFreelancerName = fl.fullName;
    task.status = 'Accepted';
    task.acceptedAt = new Date().toISOString();

    this.logAudit('Task Accepted by Freelancer', 'Task', taskId, `Freelancer ${fl.fullName} claimed task ${task.title}`);
    this.addNotification('Task Claimed', `You accepted ${task.title}. Deadline: ${task.deadline}`, 'task', 'freelancer');
    this.save();
    return { success: true };
  }

  declineTask(taskId: string, freelancerId: string, reason?: string) {
    const task = this.state.tasks.find((t) => t.id === taskId && t.assignedFreelancerId === freelancerId);
    if (task && ['Assigned', 'Accepted'].includes(task.status)) {
      task.assignedFreelancerId = undefined;
      task.assignedFreelancerName = undefined;
      task.status = 'Available';
      task.acceptedAt = undefined;
      this.logAudit('Task Declined by Freelancer', 'Task', taskId, `Task released back to pool. Reason: ${reason || 'None'}`);
      this.save();
    }
  }

  updateProjectStatus(projectId: string, status: ProjectStatus) {
    const proj = this.state.projects.find((p) => p.id === projectId);
    if (proj) {
      const oldStatus = proj.status;
      proj.status = status;
      this.logAudit('Project Status Updated', 'Project', projectId, `Status changed from ${oldStatus} to ${status}`);
      this.save();
    }
  }

  updateProject(projectId: string, data: Partial<Project>) {
    const proj = this.state.projects.find((p) => p.id === projectId);
    if (proj) {
      Object.assign(proj, data);
      this.logAudit('Project Updated', 'Project', projectId, `Project ${proj.name} modified`);
      this.save();
    }
  }

  getTaskHub(freelancerId: string) {
    const fl = this.state.freelancers.find((f) => f.id === freelancerId);
    const isKycApproved = (fl?.status === 'Active' || fl?.onboardingStatus === 'Approved');
    const certifiedCourseIds = (this.state.certificates || [])
      .filter((c: FreelancerCertificate) => c.freelancerId === freelancerId)
      .map((c: FreelancerCertificate) => Number(c.courseId));

    const allTasks = this.state.tasks;
    const assigned = allTasks.filter((t) => t.assignedFreelancerId === freelancerId && ['Assigned', 'Accepted', 'In Progress', 'Rework Required'].includes(t.status));
    const submitted = allTasks.filter((t) => t.assignedFreelancerId === freelancerId && ['Submitted', 'Under Review'].includes(t.status));
    const completed = allTasks.filter((t) => t.assignedFreelancerId === freelancerId && t.status === 'Approved');

    const available = allTasks.filter((t) => (!t.assignedFreelancerId || t.assignedFreelancerId === '') && t.status === 'Available').map((t) => {
      const proj = this.state.projects.find((p) => p.id === t.projectId);
      let isEligible = true;
      let ineligibilityReason = '';

      if (!isKycApproved) {
        isEligible = false;
        ineligibilityReason = 'Identity KYC verification must be approved before accepting tasks.';
      } else if (proj?.requiredTrainingCourseId && !certifiedCourseIds.includes(Number(proj.requiredTrainingCourseId))) {
        isEligible = false;
        ineligibilityReason = `Completion and certification of '${proj.requiredCourseTitle || 'Required Academy Course'}' required.`;
      } else if (assigned.length >= (proj?.maxTasksPerFreelancer || 5)) {
        isEligible = false;
        ineligibilityReason = `Maximum concurrent active tasks limit (${proj?.maxTasksPerFreelancer || 5}) reached.`;
      }

      return {
        ...t,
        projectName: proj?.name || 'Field Project',
        clientName: proj?.clientName || 'We Onboard Partner',
        isEligible,
        ineligibilityReason
      };
    });

    return {
      isKycApproved,
      counts: {
        assigned: assigned.length,
        submitted: submitted.length,
        completed: completed.length,
        available: available.length
      },
      assigned,
      submitted,
      completed,
      available
    };
  }

  saveTaskDraft(taskId: string, draft: any) {
    try {
      localStorage.setItem(`weonboard_task_draft_${taskId}`, JSON.stringify({
        ...draft,
        savedAt: new Date().toISOString()
      }));
    } catch {
      // LocalStorage error or disabled
    }
  }

  getTaskDraft(taskId: string): any | null {
    try {
      const raw = localStorage.getItem(`weonboard_task_draft_${taskId}`);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  clearTaskDraft(taskId: string) {
    try {
      localStorage.removeItem(`weonboard_task_draft_${taskId}`);
    } catch {
      // LocalStorage error
    }
  }

  // MSME Operations
  addMsmeRequest(data: Omit<MsmeRequest, 'id' | 'submittedAt' | 'status' | 'internalNotes' | 'requiredDocumentsChecklist'>): MsmeRequest {
    const id = `MSME-${1000 + this.state.msmeRequests.length + 1}`;
    const newReq: MsmeRequest = {
      ...data,
      id,
      status: 'New',
      submittedAt: new Date().toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' }),
      internalNotes: [],
      requiredDocumentsChecklist: [
        { document: 'Aadhaar Card of Applicant', received: false },
        { document: 'PAN Card of Entity/Proprietor', received: false },
        { document: 'Bank Statement / Cancelled Cheque', received: false },
        { document: 'Business Premise Electricity Bill / Rent Agreement', received: false }
      ]
    };
    this.state.msmeRequests = [newReq, ...this.state.msmeRequests];
    this.logAudit('MSME Request Created', 'MSME', id, `New MSME request from ${newReq.businessName} (${newReq.category})`);
    this.addNotification('New MSME Request', `${newReq.businessName} requested support for ${newReq.requestedServices.join(', ')}.`, 'msme', 'msme');
    this.save();
    return newReq;
  }

  updateMsmeStatus(id: string, status: MsmeRequest['status'], note?: string) {
    const req = this.state.msmeRequests.find((m) => m.id === id);
    if (req) {
      req.status = status;
      if (note) req.internalNotes.push(note);
      this.logAudit('MSME Status Updated', 'MSME', id, `Status updated to ${status}`);
      this.save();
    }
  }

  toggleMsmeDocument(reqId: string, docIndex: number) {
    const req = this.state.msmeRequests.find((m) => m.id === reqId);
    if (req && req.requiredDocumentsChecklist[docIndex]) {
      req.requiredDocumentsChecklist[docIndex].received = !req.requiredDocumentsChecklist[docIndex].received;
      this.save();
    }
  }

  // Franchise Leads
  addFranchiseLead(data: Omit<FranchiseLead, 'id' | 'applicationDate' | 'status' | 'notes'>): FranchiseLead {
    const id = `FRAN-${100 + this.state.franchiseLeads.length + 1}`;
    const newLead: FranchiseLead = {
      ...data,
      id,
      applicationDate: new Date().toISOString().split('T')[0],
      status: 'New',
      notes: []
    };
    this.state.franchiseLeads = [newLead, ...this.state.franchiseLeads];
    this.logAudit('Franchise Lead Created', 'Client', id, `Franchise lead from ${newLead.applicantName} for ${newLead.preferredTerritory}`);
    this.save();
    return newLead;
  }

  updateFranchiseStatus(id: string, status: FranchiseLead['status'], note?: string) {
    const lead = this.state.franchiseLeads.find((f) => f.id === id);
    if (lead) {
      lead.status = status;
      if (note) lead.notes.push(note);
      this.logAudit('Franchise Lead Status Updated', 'Client', id, `Status changed to ${status}`);
      this.save();
    }
  }

  // CMS Operations
  updateHeroBanner(banner: HeroBanner) {
    const idx = this.state.heroBanners.findIndex((b) => b.id === banner.id);
    if (idx !== -1) {
      this.state.heroBanners[idx] = banner;
      this.logAudit('CMS Hero Banner Updated', 'CMS', banner.id, `Updated banner: ${banner.heading} ${banner.headingHighlight}`);
      this.save();
    }
  }

  updateService(service: CmsService) {
    const idx = this.state.services.findIndex((s) => s.id === service.id);
    if (idx !== -1) {
      this.state.services[idx] = service;
      this.logAudit('CMS Service Card Updated', 'CMS', service.id, `Updated service: ${service.title}`);
      this.save();
    }
  }

  updateFaq(faq: FaqItem) {
    const idx = this.state.faqs.findIndex((f) => f.id === faq.id);
    if (idx !== -1) {
      this.state.faqs[idx] = faq;
      this.logAudit('CMS FAQ Updated', 'CMS', faq.id, `Updated FAQ: ${faq.question}`);
      this.save();
    }
  }

  addFaq(faq: Omit<FaqItem, 'id' | 'order'>) {
    const id = `faq-${Date.now()}`;
    const newItem: FaqItem = {
      ...faq,
      id,
      order: this.state.faqs.length + 1
    };
    this.state.faqs.push(newItem);
    this.logAudit('CMS FAQ Added', 'CMS', id, `Added FAQ: ${newItem.question}`);
    this.save();
  }

  updateSettings(settings: Partial<SiteSettings>) {
    this.state.settings = { ...this.state.settings, ...settings };
    this.logAudit('CMS Global Settings Updated', 'CMS', 'SETTINGS', 'Updated company address, contact and SEO meta');
    this.save();
  }

  // User Management
  addAdminUser(name: string, email: string, role: AdminRole): AdminUser {
    const id = `usr-${Date.now()}`;
    const user: AdminUser = {
      id,
      name,
      email,
      role,
      isActive: true,
      createdAt: new Date().toISOString().split('T')[0]
    };
    this.state.adminUsers.push(user);
    this.logAudit('New Staff User Created', 'User', id, `Created admin user ${name} with role ${role}`);
    this.save();
    return user;
  }

  toggleAdminUserActive(id: string) {
    const user = this.state.adminUsers.find((u) => u.id === id);
    if (user && user.role !== 'Super Admin') {
      user.isActive = !user.isActive;
      this.logAudit('Admin User Status Toggled', 'User', id, `User ${user.name} active state: ${user.isActive}`);
      this.save();
    }
  }

  // Notifications
  markAllNotificationsRead() {
    this.state.notifications.forEach((n) => (n.read = true));
    this.save();
  }

  // System Reset
  resetToDefault() {
    this.state = {
      settings: initialSiteSettings,
      heroBanners: initialHeroBanners,
      services: initialServices,
      faqs: initialFaqs,
      enquiries: initialEnquiries,
      freelancers: initialFreelancers,
      projects: initialProjects,
      tasks: initialTasks,
      msmeRequests: initialMsmeRequests,
      clients: initialClients,
      franchiseLeads: initialFranchiseLeads,
      adminUsers: initialAdminUsers,
      auditLogs: initialAuditLogs,
      notifications: initialNotifications,
      academyCourses: initialAcademyCourses,
      certificates: initialCertificates,
      assessmentAttempts: [],
      teams: initialTeams,
      rankPromotions: initialRankPromotions,
      qualityScoreConfig: DEFAULT_QUALITY_SCORE_CONFIG,
      currentAdmin: initialAdminUsers[0],
      currentFreelancer: initialFreelancers[0]
    };
    this.logAudit('Database Reset Executed', 'Auth', 'RESET', 'Restored complete initial factory database state');
    this.save();
  }

  // ==========================================
  // PHASE 4 ACADEMY STORE OPERATIONS
  // ==========================================

  enrollFreelancerCourse(courseId: number): any {
    const course = this.state.academyCourses.find(c => Number(c.id) === Number(courseId));
    if (course) {
      if (!course.enrollment) {
        course.enrollment = {
          id: Date.now(),
          freelancerId: this.state.currentFreelancer?.id || 'WO-FR-2026-001',
          courseId,
          status: 'Enrolled',
          progressPercent: 0,
          enrolledAt: new Date().toISOString().split('T')[0],
          completedLessons: []
        };
        this.addNotification('Enrolled in Course', `Enrolled in ${course.title}. Start lessons now.`, 'system', 'freelancers');
        this.save();
      }
      return course.enrollment;
    }
    return null;
  }

  completeFreelancerLesson(courseId: number, lessonId: number): { progressPercent: number; completedLessonIds: number[]; isReadyForAssessment: boolean } {
    const course = this.state.academyCourses.find(c => Number(c.id) === Number(courseId));
    if (!course) return { progressPercent: 0, completedLessonIds: [], isReadyForAssessment: false };

    if (!course.enrollment) {
      course.enrollment = {
        id: Date.now(),
        freelancerId: this.state.currentFreelancer?.id || 'WO-FR-2026-001',
        courseId,
        status: 'In Progress',
        progressPercent: 0,
        enrolledAt: new Date().toISOString().split('T')[0],
        completedLessons: []
      };
    }

    const completed = new Set(course.enrollment.completedLessons?.map(Number) || []);
    completed.add(Number(lessonId));
    course.enrollment.completedLessons = Array.from(completed);
    course.enrollment.lastLessonId = lessonId;

    let totalLessons = 0;
    course.modules?.forEach(m => {
      totalLessons += m.lessons.length;
      const l = m.lessons.find(les => Number(les.id) === Number(lessonId));
      if (l) l.isCompleted = true;
    });

    const pct = totalLessons > 0 ? Math.min(100, Math.round((completed.size / totalLessons) * 100)) : 100;
    course.enrollment.progressPercent = pct;
    course.enrollment.status = pct >= 100 ? (course.certificate ? 'Completed' : 'In Progress') : 'In Progress';

    this.save();
    return {
      progressPercent: pct,
      completedLessonIds: Array.from(completed),
      isReadyForAssessment: pct >= 100
    };
  }

  getSandboxAssessment(courseId: number): any {
    const course = this.state.academyCourses.find(c => Number(c.id) === Number(courseId));
    if (!course?.assessment) {
      return { success: false, error: 'No assessment found' };
    }
    const safeQuestions = course.assessment.questions?.map(q => ({
      id: q.id,
      questionText: q.questionText,
      questionType: q.questionType,
      options: q.options,
      points: q.points,
      sortOrder: q.sortOrder
    })) || [];

    return {
      success: true,
      status: 'READY',
      assessment: {
        id: course.assessment.id,
        courseId,
        courseTitle: course.title,
        title: course.assessment.title,
        description: course.assessment.description,
        passingScore: course.assessment.passingScore,
        timeLimitMinutes: course.assessment.timeLimitMinutes,
        maxAttempts: course.assessment.maxAttempts,
        attemptNumber: 1,
        questionsCount: safeQuestions.length,
        questions: safeQuestions
      }
    };
  }

  submitSandboxAssessment(courseId: number, assessmentId: number, answers: Record<string | number, string | string[]>): any {
    const course = this.state.academyCourses.find(c => Number(c.id) === Number(courseId));
    if (!course?.assessment) return { success: false, error: 'Assessment not found' };

    const questions = course.assessment.questions || [];
    let totalPoints = 0;
    let earnedPoints = 0;
    const questionResults: any[] = [];

    questions.forEach(q => {
      totalPoints += q.points;
      const correct = q.correctAnswers || [];
      const sub = answers[q.id] || answers[String(q.id)];
      const subArr = Array.isArray(sub) ? sub : [String(sub)];
      const isCorrect = correct.sort().join(',') === subArr.sort().join(',');
      if (isCorrect) earnedPoints += q.points;
      questionResults.push({ questionId: q.id, isCorrect, explanation: q.explanation });
    });

    const score = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0;
    const passed = score >= course.assessment.passingScore;

    let cert = null;
    if (passed) {
      const ref = `WO-CERT-2026-${Math.random().toString(16).substring(2, 8).toUpperCase()}`;
      const code = `V-${Math.floor(100000 + Math.random() * 900000)}`;
      cert = {
        id: Date.now(),
        certificateRef: ref,
        freelancerId: this.state.currentFreelancer?.id || 'WO-FR-2026-001',
        freelancerName: this.state.currentFreelancer?.fullName || 'Active Associate',
        courseId,
        courseTitle: course.title,
        courseCode: course.courseCode,
        issueDate: new Date().toISOString().split('T')[0],
        scorePercent: score,
        verificationCode: code,
        createdAt: new Date().toISOString()
      };
      course.certificate = cert;
      if (course.enrollment) {
        course.enrollment.status = 'Completed';
        course.enrollment.progressPercent = 100;
        course.enrollment.completedAt = new Date().toISOString().split('T')[0];
      }
      this.state.certificates = [cert, ...this.state.certificates];
      this.logAudit('Certificate Issued', 'Certificate', ref, `Earned certificate for ${course.title} with score ${score}%`);
      this.addNotification('Official Certificate Issued', `Congratulations on earning certificate ${ref} for ${course.title}!`, 'system', 'freelancers');
    }

    const attempt: AssessmentAttempt = {
      id: Date.now(),
      assessmentId,
      courseId,
      freelancerId: this.state.currentFreelancer?.id || 'WO-FR-2026-001',
      attemptNumber: 1,
      scorePercent: score,
      passed,
      submittedAt: new Date().toISOString()
    };
    this.state.assessmentAttempts = [attempt, ...this.state.assessmentAttempts];
    this.save();

    return {
      success: true,
      passed,
      scorePercent: score,
      passingScore: course.assessment.passingScore,
      earnedPoints,
      totalPoints,
      attemptNumber: 1,
      maxAttempts: course.assessment.maxAttempts,
      attemptsRemaining: 2,
      questionResults,
      certificate: cert
    };
  }

  adminSaveCourse(payload: any) {
    if (payload.id) {
      const idx = this.state.academyCourses.findIndex(c => Number(c.id) === Number(payload.id));
      if (idx !== -1) {
        this.state.academyCourses[idx] = { ...this.state.academyCourses[idx], ...payload };
      }
    } else {
      const newCourse: Course = {
        id: Date.now(),
        courseCode: payload.course_code || `WO-CRS-NEW-${Math.floor(10 + Math.random() * 89)}`,
        title: payload.title,
        slug: payload.title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        description: payload.description,
        learningObjectives: typeof payload.learning_objectives === 'string' ? payload.learning_objectives.split(';') : payload.learning_objectives,
        category: payload.category || 'Field Operations',
        language: payload.language || 'en',
        estimatedMinutes: payload.estimated_minutes || 45,
        status: payload.status || 'Published',
        passingScore: payload.passing_score || 80,
        maxAssessmentAttempts: payload.max_assessment_attempts || 3,
        isMandatory: Boolean(payload.is_mandatory),
        modules: []
      };
      this.state.academyCourses = [newCourse, ...this.state.academyCourses];
    }
    this.save();
  }

  adminSetCourseStatus(courseId: number, status: any) {
    const c = this.state.academyCourses.find(x => Number(x.id) === Number(courseId));
    if (c) {
      c.status = status;
      this.save();
    }
  }

  adminCreateModule(payload: any) {
    const c = this.state.academyCourses.find(x => Number(x.id) === Number(payload.course_id));
    if (c) {
      if (!c.modules) c.modules = [];
      c.modules.push({
        id: Date.now(),
        courseId: payload.course_id,
        title: payload.title,
        description: payload.description,
        sortOrder: payload.sort_order || c.modules.length + 1,
        lessons: []
      });
      this.save();
    }
  }

  adminCreateLesson(payload: any) {
    const c = this.state.academyCourses.find(x => Number(x.id) === Number(payload.course_id));
    if (c) {
      const m = c.modules?.find(mod => Number(mod.id) === Number(payload.module_id));
      if (m) {
        m.lessons.push({
          id: Date.now(),
          moduleId: payload.module_id,
          courseId: payload.course_id,
          title: payload.title,
          contentType: payload.content_type || 'text',
          content: payload.content,
          mediaUrl: payload.media_url,
          durationMinutes: payload.duration_minutes || 10,
          sortOrder: payload.sort_order || m.lessons.length + 1
        });
        this.save();
      }
    }
  }

  adminDeleteLesson(lessonId: number) {
    this.state.academyCourses.forEach(c => {
      c.modules?.forEach(m => {
        m.lessons = m.lessons.filter(l => Number(l.id) !== Number(lessonId));
      });
    });
    this.save();
  }

  adminSaveQuestion(payload: any) {
    this.state.academyCourses.forEach(c => {
      if (c.assessment) {
        if (!c.assessment.questions) c.assessment.questions = [];
        if (payload.id) {
          const idx = c.assessment.questions.findIndex(q => Number(q.id) === Number(payload.id));
          if (idx !== -1) {
            c.assessment.questions[idx] = { ...c.assessment.questions[idx], ...payload };
          }
        } else {
          c.assessment.questions.push({
            id: Date.now(),
            assessmentId: payload.assessment_id,
            questionText: payload.question_text,
            questionType: payload.question_type || 'single_choice',
            options: payload.options || [],
            correctAnswers: payload.correct_answers || [],
            explanation: payload.explanation,
            points: payload.points || 1,
            sortOrder: payload.sort_order || c.assessment.questions.length + 1
          });
        }
      }
    });
    this.save();
  }

  adminDeleteQuestion(questionId: number) {
    this.state.academyCourses.forEach(c => {
      if (c.assessment && c.assessment.questions) {
        c.assessment.questions = c.assessment.questions.filter(q => Number(q.id) !== Number(questionId));
      }
    });
    this.save();
  }

  getAdminAcademyData(view: string) {
    if (view === 'attempts') {
      return { success: true, attempts: this.state.assessmentAttempts };
    }
    if (view === 'certificates') {
      return { success: true, certificates: this.state.certificates };
    }
    // Enrollments
    const enrollments = this.state.academyCourses.filter(c => c.enrollment).map(c => ({
      id: c.enrollment!.id,
      freelancerId: c.enrollment!.freelancerId,
      freelancerName: 'Karthik Raman',
      freelancerEmail: 'karthik.raman@gmail.com',
      freelancerPhone: '+91 98450 12345',
      freelancerCity: 'Bengaluru',
      courseId: c.id,
      courseTitle: c.title,
      courseCode: c.courseCode,
      status: c.enrollment!.status,
      progressPercent: c.enrollment!.progressPercent,
      enrolledAt: c.enrollment!.enrolledAt,
      completedAt: c.enrollment!.completedAt,
      certificateRef: c.certificate?.certificateRef,
      certifiedScore: c.certificate?.scorePercent
    }));
    return { success: true, enrollments };
  }

  adminResetAttempts(freelancerId: number, courseId: number) {
    this.state.assessmentAttempts = this.state.assessmentAttempts.filter(a => Number(a.courseId) !== Number(courseId));
    this.save();
  }

  // ==========================================
  // PHASE 6: PERFORMANCE, TEAMS & RANK ENGINE
  // ==========================================

  getTeams(): Team[] {
    const config = this.state.qualityScoreConfig || DEFAULT_QUALITY_SCORE_CONFIG;
    const minQs = config.active_member_min_qs || 70;

    return this.state.teams.map((t) => {
      // Re-evaluate active members dynamically based on the 4 criteria
      const members = (t.members || []).map((m) => {
        const fl = this.state.freelancers.find((f) => String(f.id) === String(m.freelancerId));
        const isKyc = fl ? (fl.status === 'Active' || fl.onboardingStatus === 'Approved') : true;
        const qs = fl?.qualityScore !== undefined ? fl.qualityScore : m.qualityScore;
        const fraud = fl ? Boolean(fl.fraudFlag) : m.fraudFlag;
        const app30d = m.approved30d || (fl?.completedTasksCount ? 1 : 0);
        const isActive = isKyc && qs !== null && qs >= minQs && !fraud && app30d >= 1;

        return {
          ...m,
          qualityScore: qs,
          fraudFlag: fraud,
          isActiveMember: isActive
        };
      });

      const activeCount = members.filter((m) => m.isActiveMember).length;
      const isQualifying = activeCount >= (config.leader_min_active_members || 10);

      return {
        ...t,
        members,
        totalMembers: members.length,
        activeMembersCount: activeCount,
        isQualifyingTeam: isQualifying
      };
    });
  }

  addTeam(data: { name: string; city: string; operatingArea?: string; teamCode?: string }): Team {
    const id = String(this.state.teams.length + 1);
    const cityPrefix = (data.city.replace(/[^A-Za-z]/g, '').slice(0, 3) || 'BLR').toUpperCase();
    const teamCode = data.teamCode || `TM-${cityPrefix}-${String(this.state.teams.length + 1).padStart(2, '0')}`;

    const newTeam: Team = {
      id,
      teamCode,
      name: data.name,
      city: data.city,
      operatingArea: data.operatingArea || '',
      status: 'Active',
      leader: null,
      manager: null,
      totalMembers: 0,
      activeMembersCount: 0,
      isQualifyingTeam: false,
      members: [],
      createdAt: new Date().toISOString().split('T')[0]
    };

    this.state.teams.push(newTeam);
    this.logAudit('Team Created', 'Team', id, `Created team ${newTeam.name} (${teamCode}) in ${data.city}`);
    this.save();
    return newTeam;
  }

  updateTeam(teamId: string | number, data: Partial<Team>) {
    const team = this.state.teams.find((t) => String(t.id) === String(teamId));
    if (team) {
      Object.assign(team, data);
      this.logAudit('Team Updated', 'Team', String(teamId), `Updated team ${team.name}`);
      this.save();
    }
  }

  addTeamMember(teamId: string | number, freelancerId: string | number, roleInTeam: 'Member' | 'Deputy Leader' = 'Member'): { success: boolean; error?: string } {
    const team = this.state.teams.find((t) => String(t.id) === String(teamId));
    if (!team) return { success: false, error: 'Team not found.' };

    const fl = this.state.freelancers.find((f) => String(f.id) === String(freelancerId));
    if (!fl) return { success: false, error: 'Freelancer not found.' };

    // Check duplicate membership across all teams
    for (const otherTeam of this.state.teams) {
      const isMember = (otherTeam.members || []).some((m) => String(m.freelancerId) === String(freelancerId));
      if (isMember) {
        return {
          success: false,
          error: `Duplicate Membership Prohibited: Freelancer is already an active member of ${otherTeam.name} (${otherTeam.teamCode}). A freelancer can only belong to one team.`
        };
      }
    }

    // Circular reporting check: manager cannot be member
    if (team.manager && String(team.manager.id) === String(freelancerId)) {
      return {
        success: false,
        error: 'Circular Reporting Conflict: A manager cannot be added as a subordinate team member of a team they oversee.'
      };
    }

    if (!team.members) team.members = [];
    const membershipId = team.members.length + 1;

    const isKyc = (fl.status === 'Active' || fl.onboardingStatus === 'Approved');
    const qs = fl.qualityScore !== undefined ? fl.qualityScore : null;
    const fraud = Boolean(fl.fraudFlag);
    const app30d = (fl.completedTasksCount || 0) >= 1 ? 1 : 0;
    const isActive = isKyc && qs !== null && qs >= 70 && !fraud && app30d >= 1;

    team.members.push({
      membershipId,
      freelancerId: fl.id,
      registrationRef: fl.registrationRef || fl.id,
      fullName: fl.fullName,
      email: fl.email,
      phone: fl.phone,
      currentRank: fl.currentRank || 'Team Member',
      roleInTeam,
      qualityScore: qs,
      fraudFlag: fraud,
      approved30d: app30d,
      isActiveMember: isActive,
      joinedAt: new Date().toISOString().split('T')[0]
    });

    fl.teamId = team.id;
    fl.teamName = team.name;
    fl.teamCode = team.teamCode;

    team.totalMembers = team.members.length;
    team.activeMembersCount = team.members.filter((m) => m.isActiveMember).length;
    team.isQualifyingTeam = team.activeMembersCount >= 10;

    this.logAudit('Team Member Assigned', 'Team', String(teamId), `Added ${fl.fullName} to ${team.name}`);
    this.save();
    return { success: true };
  }

  removeTeamMember(teamId: string | number, freelancerId: string | number) {
    const team = this.state.teams.find((t) => String(t.id) === String(teamId));
    if (team && team.members) {
      team.members = team.members.filter((m) => String(m.freelancerId) !== String(freelancerId));
      team.totalMembers = team.members.length;
      team.activeMembersCount = team.members.filter((m) => m.isActiveMember).length;
      team.isQualifyingTeam = team.activeMembersCount >= 10;

      const fl = this.state.freelancers.find((f) => String(f.id) === String(freelancerId));
      if (fl) {
        fl.teamId = null;
        fl.teamName = undefined;
        fl.teamCode = undefined;
      }

      this.logAudit('Team Member Removed', 'Team', String(teamId), `Removed freelancer #${freelancerId} from ${team.name}`);
      this.save();
    }
  }

  setTeamLeader(teamId: string | number, leaderId: string | number | null): { success: boolean; error?: string } {
    const team = this.state.teams.find((t) => String(t.id) === String(teamId));
    if (!team) return { success: false, error: 'Team not found.' };

    if (!leaderId) {
      team.leader = null;
      this.save();
      return { success: true };
    }

    const fl = this.state.freelancers.find((f) => String(f.id) === String(leaderId));
    if (!fl) return { success: false, error: 'Freelancer not found.' };

    // Circular check: leader cannot be manager
    if (team.manager && String(team.manager.id) === String(leaderId)) {
      return {
        success: false,
        error: 'Conflict: The designated manager cannot also serve as the immediate team leader of the same team.'
      };
    }

    team.leader = {
      id: fl.id,
      name: fl.fullName,
      email: fl.email,
      phone: fl.phone,
      rank: fl.currentRank || 'Team Leader',
      qualityScore: fl.qualityScore !== undefined ? fl.qualityScore : null,
      fraudFlag: Boolean(fl.fraudFlag)
    };

    this.logAudit('Team Leader Assigned', 'Team', String(teamId), `Assigned ${fl.fullName} as leader of ${team.name}`);
    this.save();
    return { success: true };
  }

  setTeamManager(teamId: string | number, managerId: string | number | null): { success: boolean; error?: string } {
    const team = this.state.teams.find((t) => String(t.id) === String(teamId));
    if (!team) return { success: false, error: 'Team not found.' };

    if (!managerId) {
      team.manager = null;
      this.save();
      return { success: true };
    }

    const fl = this.state.freelancers.find((f) => String(f.id) === String(managerId));
    if (!fl) return { success: false, error: 'Freelancer not found.' };

    if (team.leader && String(team.leader.id) === String(managerId)) {
      return {
        success: false,
        error: 'Conflict: A leader of this team cannot be assigned as its oversight manager simultaneously.'
      };
    }

    team.manager = {
      id: fl.id,
      name: fl.fullName,
      email: fl.email,
      phone: fl.phone,
      rank: fl.currentRank || 'Manager',
      qualityScore: fl.qualityScore !== undefined ? fl.qualityScore : null
    };

    this.logAudit('Team Manager Assigned', 'Team', String(teamId), `Assigned ${fl.fullName} as manager of ${team.name}`);
    this.save();
    return { success: true };
  }

  calculateFreelancerScore(freelancerId: string | number): any {
    const fl = this.state.freelancers.find((f) => String(f.id) === String(freelancerId));
    if (!fl) return null;

    const config = this.state.qualityScoreConfig || DEFAULT_QUALITY_SCORE_CONFIG;
    const minSample = config.min_sample_size || 3;

    const flTasks = this.state.tasks.filter((t) => String(t.assignedFreelancerId) === String(freelancerId));
    const reviewedTasks = flTasks.filter((t) => ['Approved', 'Rejected', 'Rework Required'].includes(t.status));
    const approvedTasks = flTasks.filter((t) => t.status === 'Approved');
    const firstTimeRight = approvedTasks.filter((t) => !t.reworkCount || t.reworkCount === 0);
    const onTime = flTasks.filter((t) => t.status === 'Approved' || t.status === 'Submitted');
    const completeEvidence = flTasks.filter((t) => t.evidence !== undefined || t.status === 'Approved');

    const sampleSize = reviewedTasks.length;

    if (sampleSize < minSample) {
      fl.qualityScore = null;
      fl.qsSampleSize = sampleSize;
      fl.qsStatus = 'Insufficient Data';
      fl.qsLastCalculatedAt = new Date().toISOString().replace('T', ' ').slice(0, 19);
      this.save();

      return {
        freelancer_id: fl.id,
        full_name: fl.fullName,
        current_rank: fl.currentRank || 'Trainee',
        quality_score: null,
        qs_status: 'Insufficient Data',
        qs_sample_size: sampleSize,
        min_sample_size: minSample,
        has_sufficient_data: false,
        breakdown: {
          approval_rate: 0,
          approval_points: 0,
          first_time_right_rate: 0,
          first_time_right_points: 0,
          timeliness_rate: 0,
          timeliness_points: 0,
          evidence_completeness_rate: 0,
          evidence_completeness_points: 0,
          fraud_penalty: 0
        },
        task_metrics: {
          total_assigned: flTasks.length,
          submitted: flTasks.filter((t) => t.status !== 'Assigned' && t.status !== 'Available').length,
          reviewed: sampleSize,
          approved: approvedTasks.length,
          rework: flTasks.filter((t) => t.status === 'Rework Required').length,
          rejected: flTasks.filter((t) => t.status === 'Rejected').length
        },
        calculated_at: fl.qsLastCalculatedAt
      };
    }

    const appRate = sampleSize > 0 ? (approvedTasks.length / sampleSize) : 0;
    const ftrRate = approvedTasks.length > 0 ? (firstTimeRight.length / approvedTasks.length) : 0;
    const timeRate = flTasks.length > 0 ? (onTime.length / flTasks.length) : 0;
    const evidRate = flTasks.length > 0 ? (completeEvidence.length / flTasks.length) : 0;

    const appPts = Math.round(appRate * (config.weight_approval || 40) * 100) / 100;
    const ftrPts = Math.round(ftrRate * (config.weight_rework || 25) * 100) / 100;
    const timePts = Math.round(timeRate * (config.weight_timeliness || 20) * 100) / 100;
    const evidPts = Math.round(evidRate * (config.weight_evidence || 15) * 100) / 100;

    const fraudPenalty = fl.fraudFlag ? (config.penalty_fraud || 50) : 0;
    const subtotal = appPts + ftrPts + timePts + evidPts;
    const finalScore = Math.max(0, Math.min(100, Math.round((subtotal - fraudPenalty) * 100) / 100));

    let qsStatus: 'Active' | 'Under Observation' | 'Suspended' = 'Active';
    if (fl.fraudFlag) {
      qsStatus = 'Suspended';
    } else if (finalScore < 50) {
      qsStatus = 'Under Observation';
    }

    fl.qualityScore = finalScore;
    fl.qsSampleSize = sampleSize;
    fl.qsStatus = qsStatus;
    fl.qsLastCalculatedAt = new Date().toISOString().replace('T', ' ').slice(0, 19);
    this.save();

    return {
      freelancer_id: fl.id,
      full_name: fl.fullName,
      current_rank: fl.currentRank || 'Trainee',
      quality_score: finalScore,
      qs_status: qsStatus,
      qs_sample_size: sampleSize,
      min_sample_size: minSample,
      has_sufficient_data: true,
      breakdown: {
        approval_rate: Math.round(appRate * 100),
        approval_points: appPts,
        first_time_right_rate: Math.round(ftrRate * 100),
        first_time_right_points: ftrPts,
        timeliness_rate: Math.round(timeRate * 100),
        timeliness_points: timePts,
        evidence_completeness_rate: Math.round(evidRate * 100),
        evidence_completeness_points: evidPts,
        fraud_penalty: fraudPenalty
      },
      task_metrics: {
        total_assigned: flTasks.length,
        submitted: flTasks.filter((t) => t.status !== 'Assigned' && t.status !== 'Available').length,
        reviewed: sampleSize,
        approved: approvedTasks.length,
        rework: flTasks.filter((t) => t.status === 'Rework Required').length,
        rejected: flTasks.filter((t) => t.status === 'Rejected').length
      },
      calculated_at: fl.qsLastCalculatedAt
    };
  }

  recalculateAllScores() {
    for (const fl of this.state.freelancers) {
      this.calculateFreelancerScore(fl.id);
    }
    this.logAudit('Bulk Quality Score Recalculation', 'System', 'ALL', 'Recalculated Quality Scores for all freelancers');
  }

  setFreelancerFraudFlag(freelancerId: string | number, reason: string) {
    const fl = this.state.freelancers.find((f) => String(f.id) === String(freelancerId));
    if (fl) {
      fl.fraudFlag = true;
      fl.fraudReason = reason;
      this.calculateFreelancerScore(freelancerId);
      this.logAudit('Freelancer Flagged for Policy Violation', 'Freelancer', String(freelancerId), `Policy violation flagged: ${reason}`);
      this.save();
    }
  }

  clearFreelancerFraudFlag(freelancerId: string | number, reason: string) {
    const fl = this.state.freelancers.find((f) => String(f.id) === String(freelancerId));
    if (fl) {
      fl.fraudFlag = false;
      fl.fraudReason = undefined;
      this.calculateFreelancerScore(freelancerId);
      this.logAudit('Freelancer Policy Violation Flag Cleared', 'Freelancer', String(freelancerId), `Flag cleared: ${reason}`);
      this.save();
    }
  }

  getRankEligibility(): RankEligibilityCandidate[] {
    const config = this.state.qualityScoreConfig || DEFAULT_QUALITY_SCORE_CONFIG;
    const leaderMinQs = config.leader_min_qs || 85;
    const managerMinQs = config.manager_min_qs || 85;
    const leaderMinActive = config.leader_min_active_members || 10;
    const managerMinTeams = config.manager_min_qualifying_teams || 3;

    // Calculate qualifying teams per manager
    const teams = this.getTeams();

    return this.state.freelancers
      .filter((f) => (f.status === 'Active' || f.onboardingStatus === 'Approved') && !f.fraudFlag)
      .map((fl) => {
        const currentRank = fl.currentRank || 'Trainee';
        let targetRank: FreelancerRank | null = null;
        let isEligible = false;
        const reasons: string[] = [];

        // Teams led by this freelancer
        const ledTeams = teams.filter((t) => t.leader && String(t.leader.id) === String(fl.id));
        const maxActiveInLed = ledTeams.reduce((max, t) => Math.max(max, t.activeMembersCount), 0);

        // Qualifying teams managed by this freelancer
        const managedTeams = teams.filter((t) => t.manager && String(t.manager.id) === String(fl.id));
        const qualifyingTeamsCount = managedTeams.filter((t) => t.isQualifyingTeam).length;

        const qs = fl.qualityScore !== undefined ? fl.qualityScore : null;
        const hasQsData = qs !== null;

        if (currentRank === 'Trainee') {
          targetRank = 'Team Member';
          const hasTask = (fl.completedTasksCount || 0) >= 1;
          if (hasTask) {
            isEligible = true;
          } else {
            reasons.push('Requires at least 1 QC-approved field task (currently: 0)');
          }
        } else if (currentRank === 'Team Member') {
          targetRank = 'Team Leader';
          const qsPass = hasQsData && qs >= leaderMinQs;
          const membersPass = maxActiveInLed >= leaderMinActive;

          if (!hasQsData) {
            reasons.push(`Insufficient task data. Must complete minimum 3 tasks for verified Quality Score.`);
          } else if (qs < leaderMinQs) {
            reasons.push(`Quality Score is ${qs} (Requires minimum ${leaderMinQs})`);
          }

          if (ledTeams.length === 0) {
            reasons.push(`Must lead a team with at least ${leaderMinActive} verified active members.`);
          } else if (!membersPass) {
            reasons.push(`Team has ${maxActiveInLed} active members (Requires minimum ${leaderMinActive})`);
          }

          isEligible = qsPass && membersPass;
        } else if (currentRank === 'Team Leader') {
          targetRank = 'Manager';
          const qsPass = hasQsData && qs >= managerMinQs;
          const teamsPass = qualifyingTeamsCount >= managerMinTeams;

          if (!hasQsData || qs < managerMinQs) {
            reasons.push(`Quality Score is ${qs ?? 'N/A'} (Requires minimum ${managerMinQs})`);
          }

          if (qualifyingTeamsCount < managerMinTeams) {
            reasons.push(`Oversees ${qualifyingTeamsCount} qualifying teams with >=10 active members (Requires ${managerMinTeams})`);
          }

          isEligible = qsPass && teamsPass;
        } else if (currentRank === 'Manager') {
          targetRank = 'City/Regional Head';
          if (!hasQsData || qs < 90) {
            reasons.push(`Quality Score is ${qs ?? 'N/A'} (Requires verified score >= 90)`);
          }
          if (qualifyingTeamsCount < 5) {
            reasons.push(`Requires at least 5 qualifying teams across metropolitan territory (current: ${qualifyingTeamsCount})`);
          }
          isEligible = hasQsData && qs >= 90 && qualifyingTeamsCount >= 5;
        }

        const latestPromo = (this.state.rankPromotions || [])
          .filter((rp) => String(rp.freelancer_id) === String(fl.id))
          .slice(-1)[0]?.status || 'None';

        return {
          freelancerId: fl.id,
          registrationRef: fl.registrationRef || fl.id,
          fullName: fl.fullName,
          email: fl.email,
          phone: fl.phone,
          city: fl.city,
          currentRank,
          targetRank,
          qualityScore: qs,
          qsStatus: fl.qsStatus || (qs !== null ? 'Active' : 'Insufficient Data'),
          teamName: fl.teamName || (ledTeams[0]?.name),
          activeMembersInLedTeam: maxActiveInLed,
          qualifyingTeamsCount,
          isEligible,
          ineligibilityReasons: reasons,
          latestPromotionStatus: latestPromo,
          thresholds: {
            requiredQs: targetRank === 'Manager' ? managerMinQs : leaderMinQs,
            requiredActiveMembers: leaderMinActive,
            requiredQualifyingTeams: managerMinTeams
          }
        };
      });
  }

  promoteFreelancer(payload: {
    freelancer_id: string | number;
    target_rank: FreelancerRank;
    action: 'nominate' | 'approve' | 'reject';
    reason: string;
    adminName?: string;
  }): { success: boolean; error?: string; message?: string } {
    const fl = this.state.freelancers.find((f) => String(f.id) === String(payload.freelancer_id));
    if (!fl) return { success: false, error: 'Freelancer not found.' };

    if (!payload.reason || !payload.reason.trim()) {
      return { success: false, error: 'A specific review justification reason is mandatory.' };
    }

    if (fl.fraudFlag) {
      return { success: false, error: 'Promotion Disallowed: Freelancer has an active disciplinary flag.' };
    }

    const currentRank = fl.currentRank || 'Trainee';
    const adminName = payload.adminName || this.state.currentAdmin?.name || 'Administrator';

    const record: RankPromotionRecord = {
      id: String((this.state.rankPromotions?.length || 0) + 1),
      freelancer_id: fl.id,
      full_name: fl.fullName,
      registration_ref: fl.registrationRef || fl.id,
      from_rank: currentRank,
      to_rank: payload.target_rank,
      status: payload.action === 'approve' ? 'Approved' : (payload.action === 'reject' ? 'Rejected' : 'Nominated'),
      decision_reason: payload.reason,
      reviewed_by_name: adminName,
      reviewed_at: new Date().toISOString().replace('T', ' ').slice(0, 19),
      created_at: new Date().toISOString().replace('T', ' ').slice(0, 19)
    };

    if (!this.state.rankPromotions) this.state.rankPromotions = [];
    this.state.rankPromotions.unshift(record);

    if (payload.action === 'approve') {
      fl.currentRank = payload.target_rank;
      this.logAudit('Rank Promotion Approved', 'Rank', String(fl.id), `Promoted ${fl.fullName} from ${currentRank} to ${payload.target_rank}. Reason: ${payload.reason}`);
      this.addNotification('Rank Promotion Approved', `Congratulations! You have been promoted to ${payload.target_rank}.`, 'rank', 'freelancer');
    } else if (payload.action === 'reject') {
      this.logAudit('Rank Promotion Rejected', 'Rank', String(fl.id), `Rejected promotion to ${payload.target_rank} for ${fl.fullName}. Reason: ${payload.reason}`);
    } else {
      this.logAudit('Rank Promotion Nominated', 'Rank', String(fl.id), `Nominated ${fl.fullName} for promotion to ${payload.target_rank}`);
    }

    this.save();
    return {
      success: true,
      message: payload.action === 'approve'
        ? `Successfully promoted ${fl.fullName} to ${payload.target_rank}.`
        : `Promotion status updated to ${record.status}.`
    };
  }

  // ==========================================
  // PHASE 7: FINANCIAL SUBSYSTEM & LEDGER METHODS
  // ==========================================

  getWallet(freelancerId: string): FreelancerWallet {
    if (!this.state.wallets) this.state.wallets = {};
    if (!this.state.wallets[freelancerId]) {
      const fl = this.state.freelancers.find((f) => f.id === freelancerId);
      this.state.wallets[freelancerId] = {
        freelancerId,
        freelancerName: fl?.fullName || 'Field Associate',
        registrationRef: fl?.registrationRef || freelancerId,
        currentRank: fl?.currentRank || 'Trainee',
        availableBalance: 0,
        reservedBalance: 0,
        pendingEarnings: 0,
        totalEarned: 0,
        payoutsInProgress: 0,
        paidPayouts: 0,
        currency: 'INR',
        currencySymbol: '₹',
        isKycApproved: fl ? (fl.status === 'Active' || fl.onboardingStatus === 'Approved') : false,
        hasFraudFlag: !!fl?.fraudFlag,
        minPayoutAmount: 500,
        maxPayoutAmount: 50000,
        lastReconciledAt: new Date().toISOString()
      };
      this.save();
    }
    
    // dynamically compute pending earnings from tasks in Submitted or Under Review status
    const pendingTasks = this.state.tasks.filter(
      (t) => t.assignedFreelancerId === freelancerId && ['Submitted', 'Under Review'].includes(t.status)
    );
    const dynamicPending = pendingTasks.reduce((sum, t) => sum + (t.payoutAmount * 0.70), 0);
    this.state.wallets[freelancerId].pendingEarnings = dynamicPending;

    return this.state.wallets[freelancerId];
  }

  postBalancedJournal(
    transactionType: JournalTransactionType,
    referenceId: string | null,
    narration: string,
    entries: { accountCode: string; type: 'DEBIT' | 'CREDIT'; amount: number; entityType: any; entityId?: string | null; lineNarration?: string }[],
    postedBy: string = 'SYSTEM',
    reversalOfJournalId?: number | null
  ): { journal: LedgerJournal } {
    let totalDebit = 0;
    let totalCredit = 0;
    for (const e of entries) {
      const amt = Math.round(e.amount * 100) / 100;
      if (e.type === 'DEBIT') totalDebit += amt;
      else totalCredit += amt;
    }
    totalDebit = Math.round(totalDebit * 100) / 100;
    totalCredit = Math.round(totalCredit * 100) / 100;

    if (Math.abs(totalDebit - totalCredit) >= 0.005) {
      throw new Error(`Unbalanced Double-Entry Journal: Debits (₹${totalDebit}) != Credits (₹${totalCredit})`);
    }

    const journalRef = `JRN-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    const nextJournalId = (this.state.ledgerJournals?.length || 0) + 1;

    const journalLines: LedgerEntry[] = entries.map((e, idx) => ({
      id: nextJournalId * 100 + idx + 1,
      journalId: nextJournalId,
      accountCode: e.accountCode,
      entryType: e.type,
      amount: Math.round(e.amount * 100) / 100,
      entityType: e.entityType,
      entityId: e.entityId || null,
      lineNarration: e.lineNarration || narration,
      createdAt: new Date().toISOString()
    }));

    const journal: LedgerJournal = {
      id: nextJournalId,
      journalRef,
      transactionType,
      referenceId,
      narration,
      totalDebit,
      totalCredit,
      postedBy,
      reversalOfJournalId: reversalOfJournalId || null,
      postedAt: new Date().toISOString(),
      lines: journalLines
    };

    if (!this.state.ledgerJournals) this.state.ledgerJournals = [];
    this.state.ledgerJournals.unshift(journal);
    this.save();

    return { journal };
  }

  recognizeTaskEarnings(taskId: string): { success: boolean; error?: string; entitlement?: EarningEntitlement } {
    if (!this.state.earningEntitlements) this.state.earningEntitlements = [];
    const existing = this.state.earningEntitlements.find((e) => e.taskId === taskId);
    if (existing) {
      return { success: true, entitlement: existing };
    }

    const task = this.state.tasks.find((t) => t.id === taskId);
    if (!task) return { success: false, error: 'Task not found.' };
    if (task.status !== 'Approved') return { success: false, error: 'Task is not Approved.' };

    const grossRate = Math.round(task.payoutAmount * 100) / 100;
    const freelancerId = task.assignedFreelancerId;
    if (!freelancerId) return { success: false, error: 'No freelancer assigned to task.' };

    const fl = this.state.freelancers.find((f) => f.id === freelancerId);
    const flTeam = (this.state.teams || []).find((tm) => 
      (tm.members || []).some((m) => m.freelancerId === freelancerId)
    );

    // 70% Freelancer Gross
    const flShareGross = Math.round(grossRate * 0.70 * 100) / 100;
    // 10% Reserve
    const flReserve = Math.round(flShareGross * 0.10 * 100) / 100;
    // 90% Net Available
    const flShareNet = Math.round((flShareGross - flReserve) * 100) / 100;

    // Evaluate Team Leader (20%)
    let teamLeaderId: string | null = null;
    let tlQualified = false;
    let tlShare = 0;
    const tlCandidate = flTeam?.leader ? this.state.freelancers.find((f) => f.id === flTeam.leader?.id) : null;
    if (tlCandidate && !tlCandidate.fraudFlag && (tlCandidate.qualityScore === null || tlCandidate.qualityScore >= 70)) {
      teamLeaderId = String(tlCandidate.id);
      tlQualified = true;
      tlShare = Math.round(grossRate * 0.20 * 100) / 100;
    }

    // Evaluate Manager (10%)
    let managerId: string | null = null;
    let mgrQualified = false;
    let mgrShare = 0;
    const mgrCandidate = flTeam?.manager ? this.state.freelancers.find((f) => f.id === flTeam.manager?.id) : null;
    if (mgrCandidate && !mgrCandidate.fraudFlag && (mgrCandidate.qualityScore === null || mgrCandidate.qualityScore >= 70)) {
      managerId = String(mgrCandidate.id);
      mgrQualified = true;
      mgrShare = Math.round(grossRate * 0.10 * 100) / 100;
    }

    // Growth Pool absorbs unallocated shares
    const tlPool = !tlQualified ? Math.round(grossRate * 0.20 * 100) / 100 : 0;
    const mgrPool = !mgrQualified ? Math.round(grossRate * 0.10 * 100) / 100 : 0;
    let growthPoolShare = Math.round((tlPool + mgrPool) * 100) / 100;

    // Check rounding
    const sumCredits = Math.round((flShareNet + flReserve + tlShare + mgrShare + growthPoolShare) * 100) / 100;
    if (Math.abs(sumCredits - grossRate) >= 0.005) {
      growthPoolShare = Math.round((growthPoolShare + (grossRate - sumCredits)) * 100) / 100;
    }

    // Post double entry journal
    const entries: any[] = [
      { accountCode: '5001', type: 'DEBIT', amount: grossRate, entityType: 'Platform', entityId: `PROJECT_${task.projectId}`, lineNarration: `Execution cost for ${task.title}` },
      { accountCode: '2001', type: 'CREDIT', amount: flShareNet, entityType: 'Freelancer', entityId: freelancerId, lineNarration: `Net earnings (63% share) for ${fl?.fullName}` },
      { accountCode: '2004', type: 'CREDIT', amount: flReserve, entityType: 'Freelancer', entityId: freelancerId, lineNarration: `10% reserve held for 15 days` }
    ];

    if (tlQualified && tlShare > 0) {
      entries.push({ accountCode: '2002', type: 'CREDIT', amount: tlShare, entityType: 'TeamLeader', entityId: teamLeaderId, lineNarration: `20% Team Leader override` });
    }
    if (mgrQualified && mgrShare > 0) {
      entries.push({ accountCode: '2003', type: 'CREDIT', amount: mgrShare, entityType: 'Manager', entityId: managerId, lineNarration: `10% Manager supervision share` });
    }
    if (growthPoolShare > 0) {
      entries.push({ accountCode: '3001', type: 'CREDIT', amount: growthPoolShare, entityType: 'Platform', entityId: 'GROWTH_POOL', lineNarration: `Unallocated supervisor share routed to Growth Pool` });
    }

    const { journal } = this.postBalancedJournal(
      'EARNING_RECOGNITION',
      task.id,
      `QC Earning Recognition for Task ${task.id} (${task.title})`,
      entries,
      this.state.currentAdmin?.name || 'QC Reviewer'
    );

    // Create Earning Entitlement
    const entitlementRef = `ENT-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    const entitlement: EarningEntitlement = {
      id: (this.state.earningEntitlements.length || 0) + 1,
      entitlementRef,
      taskId: task.id,
      taskRef: task.id,
      taskTitle: task.title,
      projectId: task.projectId,
      freelancerId,
      freelancerName: fl?.fullName,
      freelancerRef: fl?.registrationRef || freelancerId,
      grossRate,
      freelancerShareGross: flShareGross,
      freelancerReserveAmount: flReserve,
      freelancerShareNet: flShareNet,
      teamLeaderId,
      teamLeaderName: tlCandidate?.fullName,
      teamLeaderShare: tlShare,
      teamLeaderRoutedToGrowth: !tlQualified,
      managerId,
      managerName: mgrCandidate?.fullName,
      managerShare: mgrShare,
      managerRoutedToGrowth: !mgrQualified,
      growthPoolShare,
      journalId: journal.id,
      journalRef: journal.journalRef,
      status: 'Recognized',
      createdAt: new Date().toISOString()
    };
    this.state.earningEntitlements.unshift(entitlement);

    // Create Reserve Record (15 days)
    if (!this.state.reserveRecords) this.state.reserveRecords = [];
    const dueAt = new Date(Date.now() + 15 * 86400 * 1000).toISOString();
    const reserve: ReserveRecord = {
      id: (this.state.reserveRecords.length || 0) + 1,
      reserveRef: `RES-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.random().toString(36).substring(2, 5).toUpperCase()}`,
      freelancerId,
      freelancerName: fl?.fullName,
      freelancerRef: fl?.registrationRef || freelancerId,
      taskId: task.id,
      taskRef: task.id,
      taskTitle: task.title,
      earningEntitlementId: entitlement.id,
      amount: flReserve,
      reservePct: 10,
      holdDays: 15,
      releaseDueAt: dueAt,
      status: 'Held',
      createdAt: new Date().toISOString()
    };
    this.state.reserveRecords.unshift(reserve);

    // Update Wallets
    const w = this.getWallet(freelancerId);
    w.totalEarned += flShareGross;
    w.availableBalance += flShareNet;
    w.reservedBalance += flReserve;
    w.lastReconciledAt = new Date().toISOString();

    if (tlQualified && teamLeaderId) {
      const tlw = this.getWallet(teamLeaderId);
      tlw.totalEarned += tlShare;
      tlw.availableBalance += tlShare;
      tlw.lastReconciledAt = new Date().toISOString();
    }
    if (mgrQualified && managerId) {
      const mgrw = this.getWallet(managerId);
      mgrw.totalEarned += mgrShare;
      mgrw.availableBalance += mgrShare;
      mgrw.lastReconciledAt = new Date().toISOString();
    }

    this.save();
    return { success: true, entitlement };
  }

  releaseMaturedReserves(specificReserveId?: number | string): { success: boolean; releasedCount: number; totalAmount: number } {
    if (!this.state.reserveRecords) this.state.reserveRecords = [];
    const now = new Date().toISOString();

    const toRelease = this.state.reserveRecords.filter((r) => {
      if (r.status !== 'Held') return false;
      if (specificReserveId) return String(r.id) === String(specificReserveId);
      return r.releaseDueAt <= now;
    });

    let releasedCount = 0;
    let totalAmount = 0;

    for (const res of toRelease) {
      const amt = res.amount;
      const flId = String(res.freelancerId);

      const { journal } = this.postBalancedJournal(
        'RESERVE_RELEASE',
        res.reserveRef,
        `Matured 15-day reserve release for ${res.reserveRef} to available balance`,
        [
          { accountCode: '2004', type: 'DEBIT', amount: amt, entityType: 'Freelancer', entityId: flId, lineNarration: `Release from reserve hold` },
          { accountCode: '2001', type: 'CREDIT', amount: amt, entityType: 'Freelancer', entityId: flId, lineNarration: `Credit to available balance` }
        ],
        this.state.currentAdmin?.name || 'CRON'
      );

      res.status = 'Released';
      res.releasedAt = now;
      res.releaseJournalId = journal.id;
      res.releaseJournalRef = journal.journalRef;

      const w = this.getWallet(flId);
      w.reservedBalance = Math.max(0, w.reservedBalance - amt);
      w.availableBalance += amt;
      w.lastReconciledAt = now;

      releasedCount++;
      totalAmount += amt;
    }

    this.save();
    return { success: true, releasedCount, totalAmount: Math.round(totalAmount * 100) / 100 };
  }

  requestPayout(
    freelancerId: string,
    amount: number,
    paymentMethod: 'UPI' | 'Bank Transfer' | 'NEFT',
    beneficiaryName: string,
    beneficiaryDetails: string,
    idempotencyKey?: string
  ): { success: boolean; error?: string; payout?: PayoutRequest } {
    const w = this.getWallet(freelancerId);
    if (!w.isKycApproved) {
      return { success: false, error: 'KYC Verification Required: You must be KYC approved before requesting payouts.' };
    }
    if (w.hasFraudFlag) {
      return { success: false, error: 'Payout Blocked: Account has an active disciplinary or policy flag.' };
    }
    if (amount < (w.minPayoutAmount || 500)) {
      return { success: false, error: `Minimum payout threshold is ₹${w.minPayoutAmount || 500}.` };
    }
    if (amount > w.availableBalance) {
      return { success: false, error: `Insufficient available balance. You requested ₹${amount}, but only ₹${w.availableBalance.toFixed(2)} is available.` };
    }

    const key = idempotencyKey || `IDEM-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    if (!this.state.payoutRequests) this.state.payoutRequests = [];

    const existing = this.state.payoutRequests.find((p) => p.idempotencyKey === key);
    if (existing) {
      return { success: true, payout: existing };
    }

    const payoutRef = `PO-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    // Post double entry journal (Move from Freelancer Available to Payout Clearing)
    const { journal } = this.postBalancedJournal(
      'PAYOUT_REQUESTED',
      payoutRef,
      `Payout request ${payoutRef} for ₹${amount} to ${beneficiaryName}`,
      [
        { accountCode: '2001', type: 'DEBIT', amount, entityType: 'Freelancer', entityId: freelancerId, lineNarration: `Deduct from available balance for payout` },
        { accountCode: '2005', type: 'CREDIT', amount, entityType: 'Freelancer', entityId: freelancerId, lineNarration: `Hold in Payout In-Transit Clearing` }
      ],
      beneficiaryName
    );

    const fl = this.state.freelancers.find((f) => f.id === freelancerId);
    const payout: PayoutRequest = {
      id: (this.state.payoutRequests.length || 0) + 1,
      payoutRef,
      idempotencyKey: key,
      freelancerId,
      freelancerName: fl?.fullName || beneficiaryName,
      freelancerRef: fl?.registrationRef || freelancerId,
      amount,
      paymentMethod,
      beneficiaryName,
      beneficiaryDetails,
      status: 'Requested',
      requestJournalId: journal.id,
      requestJournalRef: journal.journalRef,
      createdAt: new Date().toISOString()
    };
    this.state.payoutRequests.unshift(payout);

    // Atomically deduct from available balance and add to in-progress
    w.availableBalance = Math.round((w.availableBalance - amount) * 100) / 100;
    w.payoutsInProgress = Math.round((w.payoutsInProgress + amount) * 100) / 100;
    w.lastReconciledAt = new Date().toISOString();

    this.logAudit('Payout Requested', 'Payout', payoutRef, `Freelancer requested payout of ₹${amount} via ${paymentMethod}`);
    this.save();

    return { success: true, payout };
  }

  settlePayout(payoutId: number | string, providerTransferId?: string): { success: boolean; error?: string } {
    if (!this.state.payoutRequests) return { success: false, error: 'No payout requests.' };
    const p = this.state.payoutRequests.find((x) => String(x.id) === String(payoutId) || x.payoutRef === String(payoutId));
    if (!p) return { success: false, error: 'Payout request not found.' };

    if (p.status === 'Paid') return { success: true };
    if (!['Requested', 'Under Review', 'Approved', 'Processing'].includes(p.status)) {
      return { success: false, error: `Cannot settle payout in '${p.status}' state.` };
    }

    const trfId = providerTransferId || `SIM-TRF-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    // Post double entry journal (Move from Payout Clearing to Cash & Bank)
    const { journal } = this.postBalancedJournal(
      'PAYOUT_SETTLED',
      p.payoutRef,
      `Disbursement settled for ${p.payoutRef}. Provider Ref: ${trfId}`,
      [
        { accountCode: '2005', type: 'DEBIT', amount: p.amount, entityType: 'Freelancer', entityId: String(p.freelancerId), lineNarration: `Clear in-transit payout` },
        { accountCode: '1001', type: 'CREDIT', amount: p.amount, entityType: 'Platform', entityId: 'BANK_DISBURSEMENT', lineNarration: `Disbursement via bank transfer (${trfId})` }
      ],
      this.state.currentAdmin?.name || 'Payment Adapter'
    );

    p.status = 'Paid';
    p.settlementJournalId = journal.id;
    p.settlementJournalRef = journal.journalRef;
    p.providerTransferId = trfId;
    p.reviewedBy = this.state.currentAdmin?.name || 'Payment Adapter';
    p.reviewedAt = new Date().toISOString();

    const w = this.getWallet(String(p.freelancerId));
    w.payoutsInProgress = Math.max(0, Math.round((w.payoutsInProgress - p.amount) * 100) / 100);
    w.paidPayouts = Math.round((w.paidPayouts + p.amount) * 100) / 100;
    w.lastReconciledAt = new Date().toISOString();

    this.logAudit('Payout Settled', 'Payout', p.payoutRef, `Confirmed payout of ₹${p.amount} to ${p.beneficiaryName}. Provider Ref: ${trfId}`);
    this.addNotification('Payout Disbursed', `Your payout of ₹${p.amount.toFixed(2)} (${p.payoutRef}) has been successfully processed.`, 'payout', 'freelancer');
    this.save();

    return { success: true };
  }

  reversePayout(payoutId: number | string, reason: string): { success: boolean; error?: string } {
    if (!this.state.payoutRequests) return { success: false, error: 'No payout requests.' };
    const p = this.state.payoutRequests.find((x) => String(x.id) === String(payoutId) || x.payoutRef === String(payoutId));
    if (!p) return { success: false, error: 'Payout request not found.' };

    if (['Failed', 'Cancelled'].includes(p.status)) return { success: true };
    if (p.status === 'Paid') {
      return { success: false, error: 'Cannot reverse an already Paid payout.' };
    }

    // Post double entry journal (Move from Payout Clearing BACK to Freelancer Available)
    const { journal } = this.postBalancedJournal(
      'PAYOUT_REVERSED',
      p.payoutRef,
      `Reversal and refund for ${p.payoutRef}. Reason: ${reason}`,
      [
        { accountCode: '2005', type: 'DEBIT', amount: p.amount, entityType: 'Freelancer', entityId: String(p.freelancerId), lineNarration: `Release clearing for rejected payout` },
        { accountCode: '2001', type: 'CREDIT', amount: p.amount, entityType: 'Freelancer', entityId: String(p.freelancerId), lineNarration: `Refund to available balance: ${reason}` }
      ],
      this.state.currentAdmin?.name || 'Payment Ops'
    );

    p.status = 'Failed';
    p.reversalJournalId = journal.id;
    p.reversalJournalRef = journal.journalRef;
    p.failureReason = reason;
    p.reviewedBy = this.state.currentAdmin?.name || 'Payment Ops';
    p.reviewedAt = new Date().toISOString();

    const w = this.getWallet(String(p.freelancerId));
    w.payoutsInProgress = Math.max(0, Math.round((w.payoutsInProgress - p.amount) * 100) / 100);
    w.availableBalance = Math.round((w.availableBalance + p.amount) * 100) / 100;
    w.lastReconciledAt = new Date().toISOString();

    this.logAudit('Payout Rejected & Refunded', 'Payout', p.payoutRef, `Rejected payout of ₹${p.amount}. Restored to available balance. Reason: ${reason}`);
    this.addNotification('Payout Update', `Your payout request ${p.payoutRef} could not be processed: ${reason}. Funds have been restored to your available balance.`, 'payout', 'freelancer');
    this.save();

    return { success: true };
  }

  getTrialBalance(): TrialBalanceReport {
    const accountMap: Record<string, { code: string; name: string; type: any; debit: number; credit: number }> = {};
    for (const acc of (this.state.ledgerAccounts || initialLedgerAccounts)) {
      accountMap[acc.accountCode] = {
        code: acc.accountCode,
        name: acc.accountName,
        type: acc.accountType,
        debit: 0,
        credit: 0
      };
    }

    for (const j of (this.state.ledgerJournals || [])) {
      for (const line of (j.lines || [])) {
        if (!accountMap[line.accountCode]) {
          accountMap[line.accountCode] = {
            code: line.accountCode,
            name: `Account ${line.accountCode}`,
            type: 'Liability',
            debit: 0,
            credit: 0
          };
        }
        if (line.entryType === 'DEBIT') {
          accountMap[line.accountCode].debit += line.amount;
        } else {
          accountMap[line.accountCode].credit += line.amount;
        }
      }
    }

    let grandDebit = 0;
    let grandCredit = 0;
    const accounts = Object.values(accountMap).map((a) => {
      const d = Math.round(a.debit * 100) / 100;
      const c = Math.round(a.credit * 100) / 100;
      grandDebit += d;
      grandCredit += c;
      const isDebitNormal = ['Asset', 'Expense'].includes(a.type);
      return {
        account_code: a.code,
        account_name: a.name,
        account_type: a.type,
        total_debit: d,
        total_credit: c,
        net_balance: isDebitNormal ? Math.round((d - c) * 100) / 100 : Math.round((c - d) * 100) / 100
      };
    });

    grandDebit = Math.round(grandDebit * 100) / 100;
    grandCredit = Math.round(grandCredit * 100) / 100;
    const discrepancy = Math.round(Math.abs(grandDebit - grandCredit) * 100) / 100;

    return {
      accounts,
      grand_total_debit: grandDebit,
      grand_total_credit: grandCredit,
      discrepancy,
      is_balanced: discrepancy < 0.005
    };
  }

  postManualAdjustment(
    narration: string,
    supervisorReason: string,
    entries: any[],
    reversalOfJournalId?: number | string
  ): { success: boolean; error?: string } {
    try {
      this.postBalancedJournal(
        'MANUAL_ADJUSTMENT',
        `ADJ-${Date.now()}`,
        `${narration} (Reason: ${supervisorReason})`,
        entries,
        this.state.currentAdmin?.name || 'Finance Supervisor',
        reversalOfJournalId ? Number(reversalOfJournalId) : null
      );
      this.logAudit('Manual Adjustment Posted', 'Ledger', 'ADJ', `Narration: ${narration}. Justification: ${supervisorReason}`);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  seedDemoData(): { success: boolean; message: string; addedProjects: number; addedTasks: number } {
    const res = seedDemoData(this);
    this.logAudit('Demo Data Seeded', 'Project', 'DEMO', res.message);
    this.notify();
    return res;
  }

  resetDemoData(): { success: boolean; message: string; removedCount: number } {
    const res = resetDemoData(this);
    this.logAudit('Demo Data Purged', 'Project', 'DEMO', res.message);
    this.notify();
    return res;
  }
}

export const store = new Store();

// Helper to export CSV
export function exportToCsv(filename: string, rows: Record<string, any>[]) {
  if (!rows || !rows.length) {
    alert('No data available to export.');
    return;
  }
  const headers = Object.keys(rows[0]);
  const csvContent = [
    headers.join(','),
    ...rows.map((row) =>
      headers
        .map((header) => {
          let val = row[header] ?? '';
          if (typeof val === 'object') val = JSON.stringify(val);
          val = String(val).replace(/"/g, '""');
          return `"${val}"`;
        })
        .join(',')
    )
  ].join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
