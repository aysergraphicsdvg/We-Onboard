export type EnquiryType = 'Business' | 'Freelancer' | 'MSME' | 'Franchise / dealership brand' | 'General enquiry';

export type ServiceCategory = 
  | 'Rider and worker onboarding'
  | 'Merchant and restaurant onboarding'
  | 'Field audits and surveys'
  | 'MSME registration support'
  | 'Franchise and dealership development'
  | 'Freelancer opportunities'
  | 'Other services';

export type EnquiryStatus = 
  | 'New'
  | 'Contacted'
  | 'Qualified'
  | 'Proposal Sent'
  | 'Follow-up Required'
  | 'Converted'
  | 'Closed — Not Converted'
  | 'Spam';

export interface EnquiryNote {
  id: string;
  author: string;
  text: string;
  createdAt: string;
}

export interface Enquiry {
  id: string; // e.g. WO-ENQ-1001
  fullName: string;
  companyName?: string;
  phone: string;
  email: string;
  enquiryType: EnquiryType;
  city: string;
  serviceRequired: ServiceCategory | string;
  message: string;
  consent: boolean;
  submittedAt: string;
  source: string;
  assignedStaff?: string;
  status: EnquiryStatus;
  proposalValue?: number;
  followUpDate?: string;
  callOutcome?: string;
  notes: EnquiryNote[];
  convertedClientId?: string;
}

export type FreelancerRole = 
  | 'Team Member / Field Executive'
  | 'Team Leader'
  | 'Project Manager'
  | 'Freelancer / Independent Field Associate';

export type FreelancerStatus = 
  | 'Submitted'
  | 'Under Review'
  | 'Documents Required'
  | 'Verification Pending'
  | 'Approved'
  | 'Training Pending'
  | 'Ready for Assignment'
  | 'Active'
  | 'Suspended'
  | 'Rejected'
  | 'Inactive';

export interface FreelancerDocument {
  id: string;
  name: string;
  type: 'Aadhaar' | 'PAN' | 'Resume' | 'Address Proof' | 'Driving License';
  fileUrl?: string;
  fileName: string;
  uploadedAt: string;
  verified: boolean;
}

export interface FreelancerTraining {
  moduleName: string;
  completed: boolean;
  completedAt?: string;
  score?: number;
}

export interface Freelancer {
  id: string; // e.g. WO-FR-2026-0042
  fullName: string;
  email: string;
  phone: string;
  dob: string;
  gender?: string;
  residentialAddress: string;
  city: string;
  state: string;
  pinCode: string;
  isAdult: boolean;
  hasSmartphone: boolean;
  languages: string[];
  preferredAreas: string[];
  preferredWorkType: 'Full-time' | 'Part-time' | 'Flexible';
  education: string;
  previousExperienceYears: number;
  salesFieldExperience: boolean;
  skills: string[];
  preferredRole: FreelancerRole;
  previousEmployer?: string;
  status: FreelancerStatus;
  registeredAt: string;
  assignedTeamLeader?: string;
  assignedProjectManager?: string;
  approvedWorkingAreas: string[];
  documents: FreelancerDocument[];
  trainings: FreelancerTraining[];
  verificationNotes?: string;
  passwordHash?: string; // For self-service portal
  rating?: number;
  completedTasksCount: number;
  totalEarnings: number;
  pendingPayout: number;
  bankAccountMasked?: string;
}

export type ProjectStatus = 
  | 'Draft'
  | 'Approved'
  | 'Ready to Launch'
  | 'Active'
  | 'Paused'
  | 'Completed'
  | 'Cancelled';

export type TaskStatus = 
  | 'Assigned'
  | 'Accepted'
  | 'In Progress'
  | 'Submitted'
  | 'Under Review'
  | 'Approved'
  | 'Rework Required'
  | 'Rejected'
  | 'Cancelled';

export interface TaskEvidence {
  id: string;
  submittedAt: string;
  freelancerNotes: string;
  geoTag?: {
    latitude: number;
    longitude: number;
    address: string;
  };
  attachments: { name: string; url?: string }[];
}

export interface Task {
  id: string; // e.g. TSK-101
  projectId: string;
  title: string;
  description: string;
  assignedFreelancerId?: string;
  assignedFreelancerName?: string;
  city: string;
  targetArea: string;
  deadline: string;
  evidenceRequirements: string[];
  payoutAmount: number;
  status: TaskStatus;
  evidence?: TaskEvidence;
  reviewComment?: string;
  reviewedBy?: string;
  reviewedAt?: string;
}

export interface Project {
  id: string; // e.g. PRJ-2026-01
  name: string;
  clientName: string;
  clientId?: string;
  serviceCategory: ServiceCategory;
  description: string;
  targetCity: string;
  targetAreas: string[];
  targetUnits: number;
  completedUnits: number;
  startDate: string;
  endDate: string;
  projectManager: string;
  teamLeaders: string[];
  requiredRoles: FreelancerRole[];
  deliverables: string;
  acceptanceCriteria: string;
  paymentModel: 'Per Activation' | 'Per Audit' | 'Milestone Fixed' | 'Daily Rate';
  budget?: number;
  status: ProjectStatus;
  tasksCount: number;
}

export type MsmeStatus = 
  | 'New'
  | 'Contacted'
  | 'Eligibility Review'
  | 'Documents Pending'
  | 'In Progress'
  | 'Awaiting External Authority'
  | 'Completed'
  | 'On Hold'
  | 'Closed';

export interface MsmeRequest {
  id: string; // e.g. MSME-1001
  businessName: string;
  applicantName: string;
  phone: string;
  email: string;
  city: string;
  state: string;
  category: 'Micro' | 'Small' | 'Medium' | 'Startup' | 'Proprietorship';
  stage: 'Ideation' | 'Operating < 1 Year' | '1-3 Years' | '3+ Years';
  currentRegistrations: string[];
  requestedServices: string[];
  description: string;
  status: MsmeStatus;
  submittedAt: string;
  assignedStaff?: string;
  internalNotes: string[];
  disclosedAssistanceFee: number;
  requiredDocumentsChecklist: { document: string; received: boolean }[];
}

export interface Client {
  id: string;
  companyName: string;
  primaryContact: string;
  phone: string;
  email: string;
  industry: string;
  city: string;
  website?: string;
  servicesRequired: string[];
  leadSource: string;
  assignedAccountManager: string;
  clientStatus: 'Prospect' | 'Active Client' | 'On Hold' | 'Archived';
  notes: string[];
  contractValue?: number;
  createdAt: string;
}

export interface FranchiseLead {
  id: string;
  applicantName: string;
  phone: string;
  email: string;
  preferredTerritory: string;
  businessExperience: string;
  investmentCapacity?: string;
  preferredModel: string;
  status: 'New' | 'Qualified' | 'Site Assessment' | 'Proposal Sent' | 'Approved Partner' | 'Declined';
  applicationDate: string;
  assignedStaff?: string;
  notes: string[];
}

export interface HeroBanner {
  id: string;
  order: number;
  eyebrow: string;
  heading: string;
  headingHighlight?: string;
  description: string;
  ctaText: string;
  ctaLink: string;
  secondaryCtaText?: string;
  secondaryCtaLink?: string;
  trustPoints: string[];
  visualType: string;
  imageUrl?: string;
  imageAlt?: string;
  imageMaxHeight?: number;
  isActive: boolean;
}

export interface CmsService {
  id: string;
  title: string;
  description: string;
  icon: string;
  badge?: string;
  order: number;
  isActive: boolean;
}

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
  category: string;
  order: number;
}

export interface SiteSettings {
  companyName: string;
  tagline: string;
  phone: string;
  whatsapp: string;
  email: string;
  address: string;
  businessHours: string;
  seoTitle: string;
  metaDescription: string;
  primaryColor: string;
  secondaryColor: string;
  installLocked: boolean;
  headerLogoUrl?: string;
  footerLogoUrl?: string;
}

export type AdminRole = 
  | 'Super Admin'
  | 'Administrator'
  | 'Enquiry Manager'
  | 'Freelancer Coordinator'
  | 'Project Manager'
  | 'Finance Manager'
  | 'Content Manager';

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: AdminRole;
  isActive: boolean;
  lastLogin?: string;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  actingUser: string;
  action: string;
  recordType: 'Enquiry' | 'Freelancer' | 'Project' | 'Task' | 'MSME' | 'Client' | 'CMS' | 'Auth' | 'User';
  recordId: string;
  details: string;
  timestamp: string;
  ipAddress?: string;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: 'enquiry' | 'freelancer' | 'task' | 'msme' | 'system';
  timestamp: string;
  read: boolean;
  link?: string;
}
