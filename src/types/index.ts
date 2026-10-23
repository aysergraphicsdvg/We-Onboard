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
  | 'Freelancer / Independent Field Associate'
  | 'Team Member'
  | 'Freelancer';

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

export type DocumentWorkflowStatus = 'Pending' | 'Approved' | 'Rejected' | 'Resubmission Required';

export type OnboardingStatus = 
  | 'Registered'
  | 'Profile Incomplete'
  | 'KYC Pending'
  | 'Under Review'
  | 'Action Required'
  | 'Approved'
  | 'Rejected';

export interface FreelancerDocument {
  id: string;
  documentRef?: string;
  name: string;
  type: 'Aadhaar' | 'PAN' | 'Resume' | 'Address Proof' | 'Driving License' | 'Bank Details' | 'Other' | 'Aadhaar / National ID' | 'PAN / Tax ID';
  fileUrl?: string;
  fileName: string;
  fileSize?: number;
  uploadedAt: string;
  verified: boolean;
  status?: DocumentWorkflowStatus;
  rejectionReason?: string;
  reviewedBy?: string;
  reviewedAt?: string;
}

export interface FreelancerTraining {
  moduleName: string;
  completed: boolean;
  completedAt?: string;
  score?: number;
}

export interface FreelancerNotificationItem {
  id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
}

export interface Freelancer {
  id: string; // e.g. WO-FR-2026-0042
  registrationRef?: string;
  fullName: string;
  email: string;
  phone: string;
  dob: string;
  gender?: string;
  residentialAddress: string;
  city: string;
  state: string;
  pinCode: string;
  isAdult?: boolean;
  hasSmartphone?: boolean;
  languages: string[];
  preferredAreas: string[];
  preferredWorkType: 'Full-time' | 'Part-time' | 'Flexible';
  education: string;
  previousExperienceYears: number;
  salesFieldExperience: boolean;
  skills: string[];
  preferredRole: FreelancerRole | string;
  previousEmployer?: string;
  status: FreelancerStatus | string;
  onboardingStatus?: OnboardingStatus | string;
  languagePreference?: string;
  profileCompletedPercent?: number;
  registeredAt: string;
  assignedTeamLeader?: string;
  assignedProjectManager?: string;
  approvedWorkingAreas: string[];
  documents: FreelancerDocument[];
  trainings: FreelancerTraining[];
  notifications?: FreelancerNotificationItem[];
  verificationNotes?: string;
  passwordHash?: string; // For self-service portal
  rating?: number;
  completedTasksCount: number;
  totalEarnings: number;
  pendingPayout: number;
  bankAccountMasked?: string;
  currentRank?: FreelancerRank;
  teamId?: number | string | null;
  teamName?: string;
  teamCode?: string;
  qualityScore?: number | null;
  qsSampleSize?: number;
  qsStatus?: 'Insufficient Data' | 'Active' | 'Under Observation' | 'Suspended';
  qsLastCalculatedAt?: string;
  fraudFlag?: boolean;
  fraudReason?: string;
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
  | 'Available'
  | 'Assigned'
  | 'Accepted'
  | 'In Progress'
  | 'Submitted'
  | 'Under Review'
  | 'Approved'
  | 'Rework Required'
  | 'Rejected'
  | 'Cancelled';

export interface TaskEvidenceFile {
  id: string | number;
  fieldName: string;
  originalFilename: string;
  fileSize: number;
  mimeType: string;
  uploadedAt: string;
  viewUrl?: string;
}

export interface TaskEvidence {
  id?: string | number;
  taskId?: string | number;
  submittedAt?: string;
  freelancerNotes?: string;
  notes?: string;
  formData?: Record<string, any>;
  geoTag?: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  attachments: { name: string; url?: string; fieldName?: string; size?: number }[];
  files?: TaskEvidenceFile[];
  idempotencyKey?: string;
  isLocalDraft?: boolean;
}

export interface Task {
  id: string; // e.g. TSK-101
  taskRef?: string;
  projectId: string;
  projectName?: string;
  projectTitle?: string;
  title: string;
  description?: string;
  instructions?: string;
  assignedFreelancerId?: string;
  assignedFreelancerName?: string;
  city?: string;
  targetArea?: string;
  deadline?: string;
  evidenceRequirements?: string[];
  requiresLocation?: boolean;
  payoutAmount: number;
  status: TaskStatus;
  priority?: string;
  evidence?: TaskEvidence;
  reviewComment?: string;
  reviewedBy?: string;
  reviewedByName?: string;
  reviewedAt?: string;
  acceptedAt?: string;
  submittedAt?: string;
  completedAt?: string;
  reworkCount?: number;
  requiredTrainingCourseId?: number | string | null;
  requiredCourseTitle?: string;
  isEligible?: boolean;
  ineligibilityReason?: string;
}

export interface Project {
  id: string; // e.g. PRJ-2026-01
  projectRef?: string;
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
  requiredTrainingCourseId?: number | string | null;
  requiredCourseTitle?: string;
  requiredKycLevel?: string;
  evidenceSchema?: {
    fields?: { name: string; label: string; type: string; required: boolean }[];
    evidence?: string[];
  };
  requiresLocation?: boolean;
  payoutRate?: number;
  maxTasksPerFreelancer?: number;
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
  recordType: 'Enquiry' | 'Freelancer' | 'Project' | 'Task' | 'MSME' | 'Client' | 'CMS' | 'Auth' | 'User' | 'Academy' | 'Certificate' | 'Team' | 'Rank' | 'System' | 'Payout' | 'Ledger';
  recordId: string;
  details: string;
  timestamp: string;
  ipAddress?: string;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: 'enquiry' | 'freelancer' | 'task' | 'msme' | 'system' | 'academy' | 'rank' | 'payout' | 'ledger';
  timestamp: string;
  read: boolean;
  link?: string;
}

// ==========================================
// PHASE 4: ACADEMY & CERTIFICATION TYPES
// ==========================================

export type CourseCategory = 
  | 'Field Operations'
  | 'KYC & Verification'
  | 'Merchant Acquisition'
  | 'Safety & Ethics'
  | 'Compliance';

export type CourseStatus = 'Draft' | 'Published' | 'Archived';
export type LessonContentType = 'text' | 'video_ref' | 'interactive';
export type EnrollmentStatus = 'Enrolled' | 'In Progress' | 'Completed' | 'Dropped';

export interface CourseLesson {
  id: string | number;
  moduleId: string | number;
  courseId: string | number;
  title: string;
  contentType: LessonContentType;
  content: string;
  mediaUrl?: string;
  durationMinutes: number;
  sortOrder: number;
  isCompleted?: boolean;
}

export interface CourseModule {
  id: string | number;
  courseId: string | number;
  title: string;
  description?: string;
  sortOrder: number;
  lessons: CourseLesson[];
}

export interface AssessmentQuestionOption {
  id: string;
  text: string;
}

export interface AssessmentQuestion {
  id: string | number;
  assessmentId: string | number;
  questionText: string;
  questionType: 'single_choice' | 'multi_choice' | 'true_false';
  options: AssessmentQuestionOption[];
  points: number;
  sortOrder: number;
  // Note: correctAnswers is only present in admin views, NEVER in client assessment taking
  correctAnswers?: string[];
  explanation?: string;
}

export interface CourseAssessment {
  id: string | number;
  courseId: string | number;
  title: string;
  description?: string;
  passingScore: number; // e.g. 80
  timeLimitMinutes: number; // e.g. 15
  maxAttempts: number; // e.g. 3
  questionsCount?: number;
  questions?: AssessmentQuestion[];
}

export interface Course {
  id: string | number;
  courseCode: string; // e.g. 'WO-CRS-SAFE-01'
  title: string;
  slug: string;
  description: string;
  learningObjectives?: string[];
  category: CourseCategory;
  language: string;
  estimatedMinutes: number;
  thumbnailUrl?: string;
  status: CourseStatus;
  passingScore: number;
  maxAssessmentAttempts: number;
  isMandatory: boolean;
  modulesCount?: number;
  lessonsCount?: number;
  enrollmentsCount?: number;
  certificatesCount?: number;
  resumeLessonId?: string | number | null;
  modules?: CourseModule[];
  assessment?: CourseAssessment;
  enrollment?: CourseEnrollment;
  certificate?: FreelancerCertificate;
  createdAt?: string;
  updatedAt?: string;
}

export interface CourseEnrollment {
  id: string | number;
  freelancerId: string | number;
  courseId: string | number;
  status: EnrollmentStatus;
  progressPercent: number;
  lastLessonId?: string | number | null;
  enrolledAt: string;
  completedAt?: string | null;
  completedLessons?: Array<string | number>;
  latestScorePercent?: number;
}

export interface AssessmentAttempt {
  id: string | number;
  assessmentId: string | number;
  courseId: string | number;
  freelancerId: string | number;
  attemptNumber: number;
  scorePercent: number;
  passed: boolean;
  submittedAt: string;
  freelancerName?: string;
  courseTitle?: string;
}

export interface FreelancerCertificate {
  id: string | number;
  certificateRef: string; // e.g. 'WO-CERT-2026-B8123C'
  freelancerId: string | number;
  freelancerName?: string;
  courseId: string | number;
  courseTitle?: string;
  courseCode?: string;
  issueDate?: string;
  issuedAt?: string;
  scorePercent?: number;
  score?: number;
  passingScore?: number;
  verificationCode: string; // e.g. 'V-987214'
  metadata?: Record<string, any>;
  createdAt?: string;
}

// ==========================================
// PHASE 6: PERFORMANCE, TEAMS & RANK ENGINE
// ==========================================

export type FreelancerRank = 
  | 'Trainee'
  | 'Team Member'
  | 'Team Leader'
  | 'Manager'
  | 'City/Regional Head';

export interface TeamMemberItem {
  membershipId: number;
  freelancerId: number | string;
  registrationRef: string;
  fullName: string;
  email: string;
  phone: string;
  currentRank?: FreelancerRank;
  rank?: FreelancerRank | string;
  roleInTeam?: 'Member' | 'Deputy Leader';
  qualityScore: number | null;
  rating?: number;
  fraudFlag?: boolean;
  approved30d: number;
  isActiveMember: boolean;
  joinedAt: string;
}

export interface Team {
  id: number | string;
  teamCode: string;
  name: string;
  city: string;
  operatingArea?: string;
  status: 'Active' | 'Inactive' | 'Archived';
  leaderId?: string | number;
  managerId?: string | number;
  leader?: {
    id: number | string;
    name: string;
    email: string;
    phone: string;
    rank: FreelancerRank;
    qualityScore: number | null;
    fraudFlag: boolean;
  } | null;
  manager?: {
    id: number | string;
    name: string;
    email: string;
    phone: string;
    rank: FreelancerRank;
    qualityScore: number | null;
  } | null;
  totalMembers: number;
  activeMembersCount: number;
  isQualifyingTeam: boolean;
  members?: TeamMemberItem[];
  createdAt?: string;
}

export interface RankEligibilityCandidate {
  freelancerId: number | string;
  registrationRef: string;
  fullName: string;
  email: string;
  phone: string;
  city: string;
  currentRank: FreelancerRank;
  targetRank: FreelancerRank | null;
  qualityScore: number | null;
  qsStatus: string;
  teamName?: string;
  activeMembersInLedTeam: number;
  qualifyingTeamsCount: number;
  isEligible: boolean;
  ineligibilityReasons: string[];
  latestPromotionStatus: string;
  thresholds: {
    requiredQs: number;
    requiredActiveMembers: number;
    requiredQualifyingTeams: number;
  };
}

export interface RankPromotionRecord {
  id: number | string;
  freelancer_id: number | string;
  full_name?: string;
  registration_ref?: string;
  from_rank: FreelancerRank;
  to_rank: FreelancerRank;
  status: 'Eligible' | 'Nominated' | 'Approved' | 'Rejected';
  eligibility_snapshot_json?: string;
  reviewed_by?: number;
  reviewed_by_name?: string;
  decision_reason?: string;
  reviewed_at?: string;
  created_at: string;
}

// ==========================================
// PHASE 7: FINANCIAL SUBSYSTEM & LEDGER
// ==========================================

export type LedgerAccountType = 'Asset' | 'Liability' | 'Equity' | 'Revenue' | 'Expense';

export interface LedgerAccount {
  id: number | string;
  accountCode: string;
  accountName: string;
  accountType: LedgerAccountType;
  description?: string;
  isActive: boolean;
  totalDebit?: number;
  totalCredit?: number;
  netBalance?: number;
}

export type JournalTransactionType = 
  | 'EARNING_RECOGNITION'
  | 'RESERVE_RELEASE'
  | 'PAYOUT_REQUESTED'
  | 'PAYOUT_SETTLED'
  | 'PAYOUT_REVERSED'
  | 'MANUAL_ADJUSTMENT';

export interface LedgerEntry {
  id: number | string;
  journalId: number | string;
  accountCode: string;
  accountName?: string;
  accountType?: LedgerAccountType;
  entryType: 'DEBIT' | 'CREDIT';
  amount: number;
  entityType: 'Freelancer' | 'TeamLeader' | 'Manager' | 'Platform' | 'System';
  entityId?: string | null;
  lineNarration?: string;
  createdAt: string;
}

export interface LedgerJournal {
  id: number | string;
  journalRef: string;
  transactionType: JournalTransactionType;
  referenceId?: string | null;
  narration: string;
  totalDebit: number;
  totalCredit: number;
  postedBy: string;
  isReversed?: boolean;
  reversedByJournalId?: number | null;
  reversalOfJournalId?: number | null;
  postedAt: string;
  lines?: LedgerEntry[];
}

export interface EarningEntitlement {
  id: number | string;
  entitlementRef: string;
  taskId: string | number;
  taskRef?: string;
  taskTitle?: string;
  projectId: string | number;
  projectName?: string;
  freelancerId: string | number;
  freelancerName?: string;
  freelancerRef?: string;
  grossRate: number;
  freelancerShareGross: number; // 70%
  freelancerReserveAmount: number; // 10% of 70% = 7%
  freelancerShareNet: number; // 90% of 70% = 63%
  teamLeaderId?: string | number | null;
  teamLeaderName?: string;
  teamLeaderShare: number; // 20%
  teamLeaderRoutedToGrowth: boolean;
  managerId?: string | number | null;
  managerName?: string;
  managerShare: number; // 10%
  managerRoutedToGrowth: boolean;
  growthPoolShare: number;
  hierarchySnapshotJson?: string;
  journalId: number | string;
  journalRef?: string;
  status: 'Recognized' | 'Reversed';
  createdAt: string;
}

export interface ReserveRecord {
  id: number | string;
  reserveRef: string;
  freelancerId: string | number;
  freelancerName?: string;
  freelancerRef?: string;
  taskId: string | number;
  taskRef?: string;
  taskTitle?: string;
  earningEntitlementId: number | string;
  amount: number;
  reservePct: number;
  holdDays: number;
  releaseDueAt: string;
  releasedAt?: string | null;
  secondsToRelease?: number;
  status: 'Held' | 'Released' | 'Extended' | 'Reversed';
  releaseJournalId?: number | string | null;
  releaseJournalRef?: string;
  createdAt: string;
}

export type PayoutStatus = 
  | 'Requested'
  | 'Under Review'
  | 'Approved'
  | 'Processing'
  | 'Paid'
  | 'Failed'
  | 'Cancelled';

export interface PayoutRequest {
  id: number | string;
  payoutRef: string;
  idempotencyKey?: string;
  freelancerId: string | number;
  freelancerName?: string;
  freelancerRef?: string;
  amount: number;
  paymentMethod: 'UPI' | 'Bank Transfer' | 'NEFT';
  beneficiaryName: string;
  beneficiaryDetails: string;
  status: PayoutStatus;
  requestJournalId?: number | string | null;
  requestJournalRef?: string;
  settlementJournalId?: number | string | null;
  settlementJournalRef?: string;
  reversalJournalId?: number | string | null;
  reversalJournalRef?: string;
  providerName?: string;
  providerTransferId?: string | null;
  failureReason?: string | null;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  createdAt: string;
  updatedAt?: string;
}

export interface FreelancerWallet {
  freelancerId: string | number;
  freelancerName: string;
  registrationRef: string;
  currentRank: FreelancerRank;
  availableBalance: number;
  reservedBalance: number;
  pendingEarnings: number;
  totalEarned: number;
  payoutsInProgress: number;
  paidPayouts: number;
  currency: string;
  currencySymbol: string;
  isKycApproved: boolean;
  hasFraudFlag: boolean;
  minPayoutAmount: number;
  maxPayoutAmount: number;
  lastReconciledAt?: string;
}

export interface TrialBalanceAccount {
  account_code: string;
  account_name: string;
  account_type: LedgerAccountType;
  total_debit: number;
  total_credit: number;
  net_balance: number;
}

export interface TrialBalanceReport {
  accounts: TrialBalanceAccount[];
  grand_total_debit: number;
  grand_total_credit: number;
  discrepancy: number;
  is_balanced: boolean;
}


