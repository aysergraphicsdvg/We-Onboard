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
  TaskStatus 
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
  initialNotifications
} from '../data/initialData';

const STORAGE_KEY = 'we_onboard_db_state_v1';

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
  currentAdmin: AdminUser | null;
  currentFreelancer: Freelancer | null;
}

function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
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
    currentAdmin: null,
    currentFreelancer: null
  };
}

class Store {
  private state: AppState;
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.state = loadState();
  }

  private save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
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

  // Auth Operations
  loginAdmin(email: string, password?: string): boolean {
    const user = this.state.adminUsers.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
    if (user && user.isActive) {
      if (password && password.trim() !== 'WeOnboard@2026' && password.trim() !== 'Admin@123' && password.trim() !== 'admin123') {
        this.logAudit('Failed Admin Login Attempt', 'Auth', 'SECURITY_EVENT', `Incorrect password attempt for: ${email}`);
        return false;
      }
      user.lastLogin = new Date().toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' });
      this.state.currentAdmin = user;
      this.logAudit('Admin Login Successful', 'Auth', user.id, `User ${user.name} logged in with role ${user.role}`);
      this.save();
      return true;
    }
    this.logAudit('Failed Admin Login Attempt', 'Auth', 'SECURITY_EVENT', `Failed login attempt for email: ${email}`);
    return false;
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
          verified: false
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
      }

      this.logAudit('Task Reviewed', 'Task', taskId, `Task reviewed as ${status}. Comment: ${reviewComment}`);
      this.save();
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
      currentAdmin: initialAdminUsers[0],
      currentFreelancer: initialFreelancers[0]
    };
    this.logAudit('Database Reset Executed', 'Auth', 'RESET', 'Restored complete initial factory database state');
    this.save();
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
