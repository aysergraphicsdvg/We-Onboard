/**
 * WE ONBOARD — Safe Demonstration Data Module
 * 
 * Provides clearly marked, synthetic demonstration records for:
 * 1. Project 1 — Retail Merchant Onboarding (Indiranagar & Koramangala)
 * 2. Project 2 — Restaurant & MSME Field Audit (HSR & BTM Layout)
 * 3. Project 3 — Market Survey & Mystery Shopping (Whitefield & East Bangalore)
 * 
 * Organizational Roles:
 * - Manager (Sanjay Verma - DEMO-MGR-01)
 * - Team Leader (Rajesh Gowda - DEMO-TL-01)
 * - Team Member (Pooja Hegde - DEMO-TM-01)
 * - Team Member (Imran Khan - DEMO-TM-02)
 * 
 * Invariants:
 * - Repeatable & non-destructive: Never duplicates on multiple runs.
 * - Double-entry ledger equilibrium: Debits == Credits on every demo journal.
 * - No real PII, credentials, or live payment triggers.
 */

import { 
  Project, 
  Task, 
  Freelancer, 
  Team, 
  LedgerJournal, 
  EarningEntitlement, 
  ReserveRecord, 
  PayoutRequest, 
  FreelancerWallet 
} from '../types';

export const DEMO_PROJECTS: Project[] = [
  {
    id: 'DEMO-PRJ-01',
    name: '[DEMO] Retail Merchant Onboarding & POS Setup',
    clientName: 'RetailHub Karnataka [DEMO]',
    clientId: 'CLI-DEMO-01',
    serviceCategory: 'Merchant and restaurant onboarding',
    description: '[DEMO] Onboarding local grocery, FMCG and general merchant retail shops with storefront validation, owner KYC, and digital POS app deployment across Indiranagar and Koramangala corridors. Total Approved Contract Budget Cap: ₹60,000 (comprising 40 target units @ ₹1,200 per activation rate = ₹48,000 direct field disbursement pool + ₹12,000 merchant QR standee collateral, merchant onboarding kits and supervisor logistics buffer).',
    targetCity: 'Bengaluru',
    targetAreas: ['Indiranagar', 'Koramangala', 'Domlur'],
    targetUnits: 40,
    completedUnits: 24,
    startDate: '2026-10-01',
    endDate: '2026-11-15',
    projectManager: 'Sanjay Verma [DEMO Manager]',
    teamLeaders: ['Rajesh Gowda [DEMO Team Leader]'],
    requiredRoles: ['Team Member', 'Team Leader'],
    requiredTrainingCourseId: 'WO-CRS-POS-02',
    requiredCourseTitle: 'Merchant Digital POS Onboarding SOP',
    deliverables: '[DEMO] Front shop signage photo, owner PAN/Aadhaar verification slip, geo-tagged coordinates, 1 test catalog transaction.',
    acceptanceCriteria: '[DEMO] Legible storefront banner, GPS lat/long within 50m of shop address, completed KYC checklist.',
    paymentModel: 'Per Activation',
    budget: 60000,
    status: 'Active',
    tasksCount: 4
  },
  {
    id: 'DEMO-PRJ-02',
    name: '[DEMO] Restaurant & MSME Hygiene & License Field Audit',
    clientName: 'FoodSafety Audit Corp [DEMO]',
    clientId: 'CLI-DEMO-02',
    serviceCategory: 'Field audits and surveys',
    description: '[DEMO] In-person hygiene checklist and FSSAI display compliance audit for cloud kitchens, dine-in restaurants, and bakeries with mandatory geo-tagged photographic evidence.',
    targetCity: 'Bengaluru',
    targetAreas: ['HSR Layout', 'BTM Layout', 'Jayanagar'],
    targetUnits: 30,
    completedUnits: 16,
    startDate: '2026-10-05',
    endDate: '2026-11-20',
    projectManager: 'Sanjay Verma [DEMO Manager]',
    teamLeaders: ['Rajesh Gowda [DEMO Team Leader]'],
    requiredRoles: ['Team Member', 'Freelancer'],
    requiredTrainingCourseId: 'WO-CRS-SAFE-01',
    requiredCourseTitle: 'Field Ethics & Safety Protocols',
    deliverables: '[DEMO] 10-point checklist: refrigeration thermometer reading photo, food handling hygiene, waste disposal, FSSAI registration certificate photo.',
    acceptanceCriteria: '[DEMO] Timestamped refrigeration logs, manager sign-off timestamp, zero missing required checklist photos.',
    paymentModel: 'Per Audit',
    budget: 45000,
    status: 'Active',
    tasksCount: 4
  },
  {
    id: 'DEMO-PRJ-03',
    name: '[DEMO] Market Survey & Retail Mystery Shopping',
    clientName: 'RetailPulse Analytics [DEMO]',
    clientId: 'CLI-DEMO-03',
    serviceCategory: 'Field audits and surveys',
    description: '[DEMO] Customer service experience, pricing accuracy, and checkout speed mystery shopping across malls and electronics retail chains in Whitefield.',
    targetCity: 'Bengaluru',
    targetAreas: ['Whitefield', 'Marathahalli', 'ITPL'],
    targetUnits: 50,
    completedUnits: 20,
    startDate: '2026-10-10',
    endDate: '2026-11-25',
    projectManager: 'Sanjay Verma [DEMO Manager]',
    teamLeaders: [],
    requiredRoles: ['Freelancer', 'Team Member'],
    deliverables: '[DEMO] Mystery shopper experience rating (1-5), staff greeting time, checkout waiting time in minutes, purchase receipt photo.',
    acceptanceCriteria: '[DEMO] Completed questionnaire with receipt photo proof and valid store location verification.',
    paymentModel: 'Per Audit',
    budget: 40000,
    status: 'Active',
    tasksCount: 4
  }
];

export const DEMO_FREELANCERS: Freelancer[] = [
  {
    id: 'DEMO-TM-01',
    registrationRef: 'DEMO-TM-01',
    fullName: 'Pooja Hegde [DEMO Team Member]',
    email: 'pooja.member@weonboard-demo.in',
    phone: '+91 98888 11223',
    dob: '1999-04-12',
    gender: 'Female',
    residentialAddress: '100ft Road, Indiranagar',
    city: 'Bengaluru',
    state: 'Karnataka',
    pinCode: '560038',
    isAdult: true,
    hasSmartphone: true,
    languages: ['Kannada', 'English', 'Hindi'],
    preferredAreas: ['Indiranagar', 'Koramangala'],
    preferredWorkType: 'Full-time',
    education: 'Bachelor of Science',
    previousExperienceYears: 2,
    salesFieldExperience: true,
    skills: ['Merchant Onboarding', 'POS Activation', 'Field Verification'],
    preferredRole: 'Team Member',
    status: 'Active',
    onboardingStatus: 'Approved',
    registeredAt: '2026-10-02',
    approvedWorkingAreas: ['Indiranagar', 'Koramangala'],
    currentRank: 'Team Member',
    qualityScore: 88.5,
    rating: 4.8,
    completedTasksCount: 18,
    totalEarnings: 22680,
    pendingPayout: 1512,
    documents: [
      { id: 'd-demo-1', name: 'Aadhaar Card', type: 'Aadhaar / National ID', fileName: 'pooja_aadhaar_demo.pdf', uploadedAt: '2026-10-02', verified: true },
      { id: 'd-demo-2', name: 'PAN Card', type: 'PAN / Tax ID', fileName: 'pooja_pan_demo.pdf', uploadedAt: '2026-10-02', verified: true }
    ],
    trainings: [
      { moduleName: 'Field Ethics & Safety Protocols', completed: true, completedAt: '2026-10-03', score: 96 },
      { moduleName: 'Merchant Digital POS Onboarding SOP', completed: true, completedAt: '2026-10-04', score: 94 }
    ],
    bankAccountMasked: 'HDFC Bank - •••• 9841'
  },
  {
    id: 'DEMO-TM-02',
    registrationRef: 'DEMO-TM-02',
    fullName: 'Imran Khan [DEMO Team Member]',
    email: 'imran.member@weonboard-demo.in',
    phone: '+91 97777 22334',
    dob: '2001-08-19',
    gender: 'Male',
    residentialAddress: 'BTM 2nd Stage, Near Water Tank',
    city: 'Bengaluru',
    state: 'Karnataka',
    pinCode: '560076',
    isAdult: true,
    hasSmartphone: true,
    languages: ['Kannada', 'Hindi', 'English', 'Urdu'],
    preferredAreas: ['BTM Layout', 'HSR Layout'],
    preferredWorkType: 'Flexible',
    education: 'Pre-University / 12th',
    previousExperienceYears: 1,
    salesFieldExperience: true,
    skills: ['Field Audits', 'Surveys', 'Food Safety Inspection'],
    preferredRole: 'Team Member',
    status: 'Active',
    onboardingStatus: 'Approved',
    registeredAt: '2026-10-04',
    approvedWorkingAreas: ['BTM Layout', 'HSR Layout'],
    currentRank: 'Team Member',
    qualityScore: 78.0,
    rating: 4.2,
    completedTasksCount: 12,
    totalEarnings: 14400,
    pendingPayout: 945,
    documents: [
      { id: 'd-demo-3', name: 'Aadhaar Card', type: 'Aadhaar / National ID', fileName: 'imran_aadhaar_demo.pdf', uploadedAt: '2026-10-04', verified: true }
    ],
    trainings: [
      { moduleName: 'Field Ethics & Safety Protocols', completed: true, completedAt: '2026-10-05', score: 88 }
    ],
    bankAccountMasked: 'SBI - •••• 4512'
  },
  {
    id: 'DEMO-TL-01',
    registrationRef: 'DEMO-TL-01',
    fullName: 'Rajesh Gowda [DEMO Team Leader]',
    email: 'rajesh.leader@weonboard-demo.in',
    phone: '+91 96666 33445',
    dob: '1996-11-25',
    gender: 'Male',
    residentialAddress: 'CMH Road, Indiranagar',
    city: 'Bengaluru',
    state: 'Karnataka',
    pinCode: '560038',
    isAdult: true,
    hasSmartphone: true,
    languages: ['Kannada', 'English', 'Telugu'],
    preferredAreas: ['Indiranagar', 'Domlur', 'HAL'],
    preferredWorkType: 'Full-time',
    education: 'Bachelor of Commerce',
    previousExperienceYears: 4,
    salesFieldExperience: true,
    skills: ['Team Leadership', 'QC Auditing', 'Merchant Onboarding'],
    preferredRole: 'Team Leader',
    status: 'Active',
    onboardingStatus: 'Approved',
    registeredAt: '2026-09-28',
    approvedWorkingAreas: ['Indiranagar', 'Koramangala'],
    currentRank: 'Team Leader',
    qualityScore: 91.0,
    rating: 4.9,
    completedTasksCount: 45,
    totalEarnings: 42000,
    pendingPayout: 3200,
    documents: [
      { id: 'd-demo-4', name: 'Aadhaar Card', type: 'Aadhaar / National ID', fileName: 'rajesh_aadhaar_demo.pdf', uploadedAt: '2026-09-28', verified: true },
      { id: 'd-demo-5', name: 'PAN Card', type: 'PAN / Tax ID', fileName: 'rajesh_pan_demo.pdf', uploadedAt: '2026-09-28', verified: true }
    ],
    trainings: [
      { moduleName: 'Field Ethics & Safety Protocols', completed: true, completedAt: '2026-09-29', score: 98 },
      { moduleName: 'Merchant Digital POS Onboarding SOP', completed: true, completedAt: '2026-09-30', score: 95 }
    ],
    bankAccountMasked: 'ICICI Bank - •••• 7721'
  },
  {
    id: 'DEMO-MGR-01',
    registrationRef: 'DEMO-MGR-01',
    fullName: 'Sanjay Verma [DEMO Manager]',
    email: 'sanjay.manager@weonboard-demo.in',
    phone: '+91 95555 44556',
    dob: '1992-06-14',
    gender: 'Male',
    residentialAddress: 'Indiranagar Defence Colony',
    city: 'Bengaluru',
    state: 'Karnataka',
    pinCode: '560038',
    isAdult: true,
    hasSmartphone: true,
    languages: ['English', 'Hindi', 'Kannada'],
    preferredAreas: ['Bengaluru East', 'Bengaluru South'],
    preferredWorkType: 'Full-time',
    education: 'MBA Operations',
    previousExperienceYears: 7,
    salesFieldExperience: true,
    skills: ['Operations Management', 'QC Supervision', 'Regional Strategy'],
    preferredRole: 'Project Manager',
    status: 'Active',
    onboardingStatus: 'Approved',
    registeredAt: '2026-09-15',
    approvedWorkingAreas: ['Indiranagar', 'HSR Layout', 'Whitefield'],
    currentRank: 'Manager',
    qualityScore: 94.5,
    rating: 5.0,
    completedTasksCount: 80,
    totalEarnings: 95000,
    pendingPayout: 4500,
    documents: [],
    trainings: [],
    bankAccountMasked: 'Axis Bank - •••• 1109'
  }
];

export const DEMO_TEAMS: Team[] = [
  {
    id: 'DEMO-TEAM-01',
    teamCode: 'TM-BLR-IND-01',
    name: '[DEMO] Indiranagar Retail Execution Team',
    city: 'Bengaluru',
    operatingArea: '100ft Road, CMH Road, HAL 2nd Stage',
    status: 'Active',
    leaderId: 'DEMO-TL-01',
    managerId: 'DEMO-MGR-01',
    leader: {
      id: 'DEMO-TL-01',
      name: 'Rajesh Gowda [DEMO Team Leader]',
      email: 'rajesh.leader@weonboard-demo.in',
      phone: '+91 96666 33445',
      rank: 'Team Leader',
      qualityScore: 91.0,
      fraudFlag: false
    },
    manager: {
      id: 'DEMO-MGR-01',
      name: 'Sanjay Verma [DEMO Manager]',
      email: 'sanjay.manager@weonboard-demo.in',
      phone: '+91 95555 44556',
      rank: 'Manager',
      qualityScore: 94.5
    },
    totalMembers: 2,
    activeMembersCount: 2,
    isQualifyingTeam: true,
    members: [
      {
        membershipId: 901,
        freelancerId: 'DEMO-TM-01',
        registrationRef: 'DEMO-TM-01',
        fullName: 'Pooja Hegde [DEMO Team Member]',
        email: 'pooja.member@weonboard-demo.in',
        phone: '+91 98888 11223',
        rank: 'Team Member',
        qualityScore: 88.5,
        rating: 4.8,
        approved30d: 8,
        isActiveMember: true,
        joinedAt: '2026-10-02'
      },
      {
        membershipId: 902,
        freelancerId: 'DEMO-TM-02',
        registrationRef: 'DEMO-TM-02',
        fullName: 'Imran Khan [DEMO Team Member]',
        email: 'imran.member@weonboard-demo.in',
        phone: '+91 97777 22334',
        rank: 'Team Member',
        qualityScore: 78.0,
        rating: 4.2,
        approved30d: 5,
        isActiveMember: true,
        joinedAt: '2026-10-04'
      }
    ],
    createdAt: '2026-10-01'
  }
];

export const DEMO_TASKS: Task[] = [
  // --- PROJECT 1 TASKS (Retail Merchant Onboarding) ---
  {
    id: 'DEMO-TSK-101',
    projectId: 'DEMO-PRJ-01',
    projectTitle: '[DEMO] Retail Merchant Onboarding & POS Setup',
    title: '[DEMO] Onboard Sri Balaji Provisions — 100ft Road Indiranagar',
    description: '[DEMO] Visit Sri Balaji Provisions, collect owner KYC, snap storefront signboard photo, and activate digital merchant catalog.',
    assignedFreelancerId: 'DEMO-TM-01',
    assignedFreelancerName: 'Pooja Hegde [DEMO Team Member]',
    status: 'Approved',
    payoutAmount: 1200.00,
    evidenceRequirements: ['Storefront photo with signboard', 'Geo-tag lat/long', 'Owner consent signature', 'First test order ID'],
    evidence: {
      id: 'ev-demo-101',
      notes: '[DEMO] Owner Mr. Balaji verified. Store catalog activated. Test transaction order #TXN-901 confirmed.',
      geoTag: { latitude: 12.9784, longitude: 77.6408, address: '100ft Road, Indiranagar, Bengaluru' },
      attachments: [{ name: 'balaji_provisions_signboard.jpg' }, { name: 'balaji_catalog_test.png' }]
    },
    reviewComment: '[DEMO] Approved by QC. Clean signage and verified coordinates.',
    reviewedBy: 'Muhammad Ali Shoaib (QC Head)',
    reviewedAt: '2026-10-18 14:30',
    acceptedAt: '2026-10-18 10:15',
    completedAt: '2026-10-18 13:45'
  },
  {
    id: 'DEMO-TSK-102',
    projectId: 'DEMO-PRJ-01',
    projectTitle: '[DEMO] Retail Merchant Onboarding & POS Setup',
    title: '[DEMO] Onboard New Krishna Supermarket — Koramangala 4th Block',
    description: '[DEMO] Verify proprietor documents, take storefront banner photograph, and verify digital payment terminal setup.',
    assignedFreelancerId: 'DEMO-TM-01',
    assignedFreelancerName: 'Pooja Hegde [DEMO Team Member]',
    status: 'Submitted',
    payoutAmount: 1200.00,
    evidenceRequirements: ['Storefront photo with signboard', 'Geo-tag lat/long', 'Owner consent signature', 'First test order ID'],
    evidence: {
      id: 'ev-demo-102',
      notes: '[DEMO] Shop visit executed. Proprietor signed onboarding form. Awaiting QC audit verification.',
      geoTag: { latitude: 12.9352, longitude: 77.6245, address: '80ft Road, 4th Block, Koramangala, Bengaluru' },
      attachments: [{ name: 'krishna_supermarket_front.jpg' }, { name: 'owner_pan_card.jpg' }]
    },
    acceptedAt: '2026-10-19 11:00'
  },
  {
    id: 'DEMO-TSK-103',
    projectId: 'DEMO-PRJ-01',
    projectTitle: '[DEMO] Retail Merchant Onboarding & POS Setup',
    title: '[DEMO] Onboard Royal Mart — Domlur Layout',
    description: '[DEMO] Execute merchant registration, app installation and QR code standee handover.',
    assignedFreelancerId: 'DEMO-TM-01',
    assignedFreelancerName: 'Pooja Hegde [DEMO Team Member]',
    status: 'Accepted',
    payoutAmount: 1200.00,
    evidenceRequirements: ['Storefront photo with signboard', 'Geo-tag lat/long', 'Standee handover photo'],
    acceptedAt: '2026-10-20 09:30'
  },
  {
    id: 'DEMO-TSK-104',
    projectId: 'DEMO-PRJ-01',
    projectTitle: '[DEMO] Retail Merchant Onboarding & POS Setup',
    title: '[DEMO] Onboard Annapurna General Store — Indiranagar 12th Main',
    description: '[DEMO] Eligible for certified associates. Claim task to execute on-ground merchant onboarding.',
    status: 'Available',
    payoutAmount: 1200.00,
    evidenceRequirements: ['Storefront photo with signboard', 'Geo-tag lat/long', 'First test order ID']
  },

  // --- PROJECT 2 TASKS (Restaurant & MSME Field Audit) ---
  {
    id: 'DEMO-TSK-201',
    projectId: 'DEMO-PRJ-02',
    projectTitle: '[DEMO] Restaurant & MSME Hygiene & License Field Audit',
    title: '[DEMO] Hygiene Audit — Spice Garden Biryani, HSR Sector 2',
    description: '[DEMO] Verify kitchen hygiene standards, food refrigeration logs, and active FSSAI registration certificate.',
    assignedFreelancerId: 'DEMO-TM-02',
    assignedFreelancerName: 'Imran Khan [DEMO Team Member]',
    status: 'Rework Required',
    payoutAmount: 1500.00,
    evidenceRequirements: ['Refrigeration temperature photo', 'FSSAI certificate photo', 'Kitchen waste bin photo'],
    evidence: {
      id: 'ev-demo-201',
      notes: '[DEMO] Audit conducted. Temperature reading logged.',
      geoTag: { latitude: 12.9121, longitude: 77.6445, address: '27th Main, Sector 2, HSR Layout, Bengaluru' },
      attachments: [{ name: 'kitchen_blurry_temp.jpg' }]
    },
    reviewComment: '[DEMO] Rework Required: The refrigeration thermometer photo is blurry and illegible. Please revisit the site and upload a crisp, high-resolution photo of the temperature display gauge.',
    reviewedBy: 'Gousiya Fathima (QC Operations)',
    reviewedAt: '2026-10-19 16:45',
    acceptedAt: '2026-10-19 12:00'
  },
  {
    id: 'DEMO-TSK-202',
    projectId: 'DEMO-PRJ-02',
    projectTitle: '[DEMO] Restaurant & MSME Hygiene & License Field Audit',
    title: '[DEMO] FSSAI License Check — Cafe Aroma, BTM 2nd Stage',
    description: '[DEMO] Verify visible display of FSSAI 14-digit license number and inspect pantry hygiene checklist.',
    assignedFreelancerId: 'DEMO-TM-01',
    assignedFreelancerName: 'Pooja Hegde [DEMO Team Member]',
    status: 'Submitted',
    payoutAmount: 1500.00,
    evidenceRequirements: ['FSSAI certificate display photo', 'Pantry hygiene photo', 'Manager sign-off'],
    evidence: {
      id: 'ev-demo-202',
      notes: '[DEMO] Cafe Aroma inspection completed. Valid FSSAI license 11223344556677 verified.',
      geoTag: { latitude: 12.9165, longitude: 77.6101, address: 'Outer Ring Road, BTM 2nd Stage, Bengaluru' },
      attachments: [{ name: 'fssai_display_photo.jpg' }, { name: 'pantry_inspection.jpg' }]
    },
    acceptedAt: '2026-10-20 10:00'
  },
  {
    id: 'DEMO-TSK-203',
    projectId: 'DEMO-PRJ-02',
    projectTitle: '[DEMO] Restaurant & MSME Hygiene & License Field Audit',
    title: '[DEMO] Kitchen Cleanliness Audit — Udupi Upahar, HSR Sector 1',
    description: '[DEMO] Verify vegetarian kitchen sanitation and food storage standards.',
    assignedFreelancerId: 'DEMO-TM-02',
    assignedFreelancerName: 'Imran Khan [DEMO Team Member]',
    status: 'Approved',
    payoutAmount: 1500.00,
    evidenceRequirements: ['Food storage photo', 'FSSAI certificate photo', 'Kitchen photo'],
    evidence: {
      id: 'ev-demo-203',
      notes: '[DEMO] Kitchen adheres to sanitation norms. Clear photos attached.',
      geoTag: { latitude: 12.9150, longitude: 77.6510, address: '14th Main, Sector 1, HSR Layout, Bengaluru' },
      attachments: [{ name: 'udupi_kitchen_clean.jpg' }, { name: 'udupi_fssai.jpg' }]
    },
    reviewComment: '[DEMO] Approved by QC. Clean kitchen and verified FSSAI documentation.',
    reviewedBy: 'Muhammad Ali Shoaib (QC Head)',
    reviewedAt: '2026-10-17 11:20',
    acceptedAt: '2026-10-17 09:00',
    completedAt: '2026-10-17 11:00'
  },
  {
    id: 'DEMO-TSK-204',
    projectId: 'DEMO-PRJ-02',
    projectTitle: '[DEMO] Restaurant & MSME Hygiene & License Field Audit',
    title: '[DEMO] Storage & Pest Control Audit — Bakers Delight, Jayanagar',
    description: '[DEMO] Physical audit of bakery dry storage and pest management certificate.',
    status: 'Available',
    payoutAmount: 1500.00,
    evidenceRequirements: ['Dry storage photo', 'Pest control AMC slip', 'Storefront photo']
  },

  // --- PROJECT 3 TASKS (Market Survey & Mystery Shopping) ---
  {
    id: 'DEMO-TSK-301',
    projectId: 'DEMO-PRJ-03',
    projectTitle: '[DEMO] Market Survey & Retail Mystery Shopping',
    title: '[DEMO] Mystery Shopping — Phoenix Marketcity Apparel',
    description: '[DEMO] Act as shopper, evaluate staff response time, fitting room cleanliness, and checkout speed.',
    assignedFreelancerId: 'DEMO-TM-01',
    assignedFreelancerName: 'Pooja Hegde [DEMO Team Member]',
    status: 'Approved',
    payoutAmount: 800.00,
    evidenceRequirements: ['Questionnaire response JSON', 'Purchase receipt photo', 'Store entrance geo-tag'],
    evidence: {
      id: 'ev-demo-301',
      notes: '[DEMO] Mystery shop executed. Staff greeted within 45 seconds. Checkout wait: 2 mins 40 secs. Questionnaire filled.',
      geoTag: { latitude: 12.9959, longitude: 77.6963, address: 'Phoenix Marketcity, Whitefield Road, Mahadevapura, Bengaluru' },
      attachments: [{ name: 'apparel_receipt_proof.jpg' }]
    },
    reviewComment: '[DEMO] Approved. Questionnaire answers match receipt timing proof.',
    reviewedBy: 'Sanjay Verma [DEMO Manager]',
    reviewedAt: '2026-10-16 17:00',
    acceptedAt: '2026-10-16 14:00',
    completedAt: '2026-10-16 16:30'
  },
  {
    id: 'DEMO-TSK-302',
    projectId: 'DEMO-PRJ-03',
    projectTitle: '[DEMO] Market Survey & Retail Mystery Shopping',
    title: '[DEMO] Checkout Speed Survey — Nexus Shantiniketan Electronics',
    description: '[DEMO] Monitor electronic billing counter queues and measure billing time across 5 customers.',
    assignedFreelancerId: 'DEMO-TM-02',
    assignedFreelancerName: 'Imran Khan [DEMO Team Member]',
    status: 'In Progress',
    payoutAmount: 800.00,
    evidenceRequirements: ['Queue timing log', 'Store billing counter photo', 'Geo-tag lat/long'],
    acceptedAt: '2026-10-20 14:00'
  },
  {
    id: 'DEMO-TSK-303',
    projectId: 'DEMO-PRJ-03',
    projectTitle: '[DEMO] Market Survey & Retail Mystery Shopping',
    title: '[DEMO] Customer Greeting Audit — Forum Value Mall Whitefield',
    description: '[DEMO] Mystery audit of customer greeting and product assistance in cosmetics department.',
    assignedFreelancerId: 'DEMO-TM-02',
    assignedFreelancerName: 'Imran Khan [DEMO Team Member]',
    status: 'Submitted',
    payoutAmount: 800.00,
    evidenceRequirements: ['Questionnaire response', 'Store entrance photo', 'Geo-tag lat/long'],
    evidence: {
      id: 'ev-demo-303',
      notes: '[DEMO] Audit finished. Store greeting delayed by 4 minutes. Survey details entered.',
      geoTag: { latitude: 12.9592, longitude: 77.7478, address: 'Forum Value Mall, Whitefield, Bengaluru' },
      attachments: [{ name: 'mall_entrance_photo.jpg' }]
    },
    acceptedAt: '2026-10-20 11:30'
  },
  {
    id: 'DEMO-TSK-304',
    projectId: 'DEMO-PRJ-03',
    projectTitle: '[DEMO] Market Survey & Retail Mystery Shopping',
    title: '[DEMO] Pricing Accuracy Check — Brigade Road Retailer',
    description: '[DEMO] Verify shelf display price against POS billing scan for 10 consumer items.',
    status: 'Available',
    payoutAmount: 800.00,
    evidenceRequirements: ['Price discrepancy table', 'Shelf tag photos (3)', 'Billing receipt']
  }
];

export const DEMO_JOURNALS: LedgerJournal[] = [
  {
    id: 9101,
    journalRef: 'JRN-DEMO-20261018-01',
    transactionType: 'EARNING_RECOGNITION',
    referenceId: 'DEMO-TSK-101',
    narration: '[DEMO] QC Earning Recognition for Task DEMO-TSK-101 (Sri Balaji Provisions)',
    totalDebit: 1200.00,
    totalCredit: 1200.00,
    postedBy: 'Muhammad Ali Shoaib (QC Head)',
    postedAt: '2026-10-18T14:30:00Z',
    lines: [
      { id: 910101, journalId: 9101, accountCode: '5001', entryType: 'DEBIT', amount: 1200.00, entityType: 'Platform', entityId: 'PROJECT_DEMO-PRJ-01', lineNarration: 'Execution cost for DEMO-TSK-101', createdAt: '2026-10-18T14:30:00Z' },
      { id: 910102, journalId: 9101, accountCode: '2001', entryType: 'CREDIT', amount: 756.00, entityType: 'Freelancer', entityId: 'DEMO-TM-01', lineNarration: 'Net available earnings (63% share) for Pooja Hegde', createdAt: '2026-10-18T14:30:00Z' },
      { id: 910103, journalId: 9101, accountCode: '2004', entryType: 'CREDIT', amount: 84.00, entityType: 'Freelancer', entityId: 'DEMO-TM-01', lineNarration: '10% quality reserve held for 15 days', createdAt: '2026-10-18T14:30:00Z' },
      { id: 910104, journalId: 9101, accountCode: '2002', entryType: 'CREDIT', amount: 240.00, entityType: 'TeamLeader', entityId: 'DEMO-TL-01', lineNarration: '20% Team Leader override for Rajesh Gowda', createdAt: '2026-10-18T14:30:00Z' },
      { id: 910105, journalId: 9101, accountCode: '2003', entryType: 'CREDIT', amount: 120.00, entityType: 'Manager', entityId: 'DEMO-MGR-01', lineNarration: '10% Manager supervision override for Sanjay Verma', createdAt: '2026-10-18T14:30:00Z' }
    ]
  },
  {
    id: 9102,
    journalRef: 'JRN-DEMO-20261016-02',
    transactionType: 'EARNING_RECOGNITION',
    referenceId: 'DEMO-TSK-301',
    narration: '[DEMO] QC Earning Recognition for Task DEMO-TSK-301 (Phoenix Mystery Shopping)',
    totalDebit: 800.00,
    totalCredit: 800.00,
    postedBy: 'Sanjay Verma [DEMO Manager]',
    postedAt: '2026-10-16T17:00:00Z',
    lines: [
      { id: 910201, journalId: 9102, accountCode: '5001', entryType: 'DEBIT', amount: 800.00, entityType: 'Platform', entityId: 'PROJECT_DEMO-PRJ-03', lineNarration: 'Execution cost for DEMO-TSK-301', createdAt: '2026-10-16T17:00:00Z' },
      { id: 910202, journalId: 9102, accountCode: '2001', entryType: 'CREDIT', amount: 504.00, entityType: 'Freelancer', entityId: 'DEMO-TM-01', lineNarration: 'Net available earnings (63% share) for Pooja Hegde', createdAt: '2026-10-16T17:00:00Z' },
      { id: 910203, journalId: 9102, accountCode: '2004', entryType: 'CREDIT', amount: 56.00, entityType: 'Freelancer', entityId: 'DEMO-TM-01', lineNarration: '10% quality reserve held for 15 days', createdAt: '2026-10-16T17:00:00Z' },
      { id: 910204, journalId: 9102, accountCode: '3001', entryType: 'CREDIT', amount: 240.00, entityType: 'Platform', entityId: 'GROWTH_POOL', lineNarration: 'Unassigned TL/Manager shares routed to Growth Pool', createdAt: '2026-10-16T17:00:00Z' }
    ]
  },
  {
    id: 9103,
    journalRef: 'JRN-DEMO-20261017-03',
    transactionType: 'EARNING_RECOGNITION',
    referenceId: 'DEMO-TSK-203',
    narration: '[DEMO] QC Earning Recognition for Task DEMO-TSK-203 (Udupi Upahar Kitchen)',
    totalDebit: 1500.00,
    totalCredit: 1500.00,
    postedBy: 'Muhammad Ali Shoaib (QC Head)',
    postedAt: '2026-10-17T11:20:00Z',
    lines: [
      { id: 910301, journalId: 9103, accountCode: '5001', entryType: 'DEBIT', amount: 1500.00, entityType: 'Platform', entityId: 'PROJECT_DEMO-PRJ-02', lineNarration: 'Execution cost for DEMO-TSK-203', createdAt: '2026-10-17T11:20:00Z' },
      { id: 910302, journalId: 9103, accountCode: '2001', entryType: 'CREDIT', amount: 945.00, entityType: 'Freelancer', entityId: 'DEMO-TM-02', lineNarration: 'Net available earnings (63% share) for Imran Khan', createdAt: '2026-10-17T11:20:00Z' },
      { id: 910303, journalId: 9103, accountCode: '2004', entryType: 'CREDIT', amount: 105.00, entityType: 'Freelancer', entityId: 'DEMO-TM-02', lineNarration: '10% quality reserve held for 15 days', createdAt: '2026-10-17T11:20:00Z' },
      { id: 910304, journalId: 9103, accountCode: '2002', entryType: 'CREDIT', amount: 300.00, entityType: 'TeamLeader', entityId: 'DEMO-TL-01', lineNarration: '20% Team Leader override for Rajesh Gowda', createdAt: '2026-10-17T11:20:00Z' },
      { id: 910305, journalId: 9103, accountCode: '2003', entryType: 'CREDIT', amount: 150.00, entityType: 'Manager', entityId: 'DEMO-MGR-01', lineNarration: '10% Manager supervision override for Sanjay Verma', createdAt: '2026-10-17T11:20:00Z' }
    ]
  }
];

export const DEMO_ENTITLEMENTS: EarningEntitlement[] = [
  {
    id: 901,
    entitlementRef: 'ENT-DEMO-101',
    taskId: 'DEMO-TSK-101',
    taskRef: 'DEMO-TSK-101',
    taskTitle: '[DEMO] Onboard Sri Balaji Provisions',
    projectId: 'DEMO-PRJ-01',
    freelancerId: 'DEMO-TM-01',
    freelancerName: 'Pooja Hegde [DEMO Team Member]',
    freelancerRef: 'DEMO-TM-01',
    grossRate: 1200.00,
    freelancerShareGross: 840.00,
    freelancerReserveAmount: 84.00,
    freelancerShareNet: 756.00,
    teamLeaderId: 'DEMO-TL-01',
    teamLeaderName: 'Rajesh Gowda [DEMO Team Leader]',
    teamLeaderShare: 240.00,
    teamLeaderRoutedToGrowth: false,
    managerId: 'DEMO-MGR-01',
    managerName: 'Sanjay Verma [DEMO Manager]',
    managerShare: 120.00,
    managerRoutedToGrowth: false,
    growthPoolShare: 0.00,
    journalId: 9101,
    journalRef: 'JRN-DEMO-20261018-01',
    status: 'Recognized',
    createdAt: '2026-10-18T14:30:00Z'
  },
  {
    id: 902,
    entitlementRef: 'ENT-DEMO-301',
    taskId: 'DEMO-TSK-301',
    taskRef: 'DEMO-TSK-301',
    taskTitle: '[DEMO] Mystery Shopping — Phoenix Marketcity',
    projectId: 'DEMO-PRJ-03',
    freelancerId: 'DEMO-TM-01',
    freelancerName: 'Pooja Hegde [DEMO Team Member]',
    freelancerRef: 'DEMO-TM-01',
    grossRate: 800.00,
    freelancerShareGross: 560.00,
    freelancerReserveAmount: 56.00,
    freelancerShareNet: 504.00,
    teamLeaderId: null,
    teamLeaderShare: 0.00,
    teamLeaderRoutedToGrowth: true,
    managerId: null,
    managerShare: 0.00,
    managerRoutedToGrowth: true,
    growthPoolShare: 240.00,
    journalId: 9102,
    journalRef: 'JRN-DEMO-20261016-02',
    status: 'Recognized',
    createdAt: '2026-10-16T17:00:00Z'
  },
  {
    id: 903,
    entitlementRef: 'ENT-DEMO-203',
    taskId: 'DEMO-TSK-203',
    taskRef: 'DEMO-TSK-203',
    taskTitle: '[DEMO] Kitchen Cleanliness Audit — Udupi Upahar',
    projectId: 'DEMO-PRJ-02',
    freelancerId: 'DEMO-TM-02',
    freelancerName: 'Imran Khan [DEMO Team Member]',
    freelancerRef: 'DEMO-TM-02',
    grossRate: 1500.00,
    freelancerShareGross: 1050.00,
    freelancerReserveAmount: 105.00,
    freelancerShareNet: 945.00,
    teamLeaderId: 'DEMO-TL-01',
    teamLeaderName: 'Rajesh Gowda [DEMO Team Leader]',
    teamLeaderShare: 300.00,
    teamLeaderRoutedToGrowth: false,
    managerId: 'DEMO-MGR-01',
    managerName: 'Sanjay Verma [DEMO Manager]',
    managerShare: 150.00,
    managerRoutedToGrowth: false,
    growthPoolShare: 0.00,
    journalId: 9103,
    journalRef: 'JRN-DEMO-20261017-03',
    status: 'Recognized',
    createdAt: '2026-10-17T11:20:00Z'
  }
];

export const DEMO_RESERVES: ReserveRecord[] = [
  {
    id: 901,
    reserveRef: 'RES-DEMO-101',
    freelancerId: 'DEMO-TM-01',
    freelancerName: 'Pooja Hegde [DEMO Team Member]',
    freelancerRef: 'DEMO-TM-01',
    taskId: 'DEMO-TSK-101',
    taskRef: 'DEMO-TSK-101',
    taskTitle: '[DEMO] Onboard Sri Balaji Provisions',
    earningEntitlementId: 901,
    amount: 84.00,
    reservePct: 10,
    holdDays: 15,
    releaseDueAt: '2026-11-02T14:30:00Z',
    status: 'Held',
    secondsToRelease: 1036800,
    createdAt: '2026-10-18T14:30:00Z'
  },
  {
    id: 902,
    reserveRef: 'RES-DEMO-301',
    freelancerId: 'DEMO-TM-01',
    freelancerName: 'Pooja Hegde [DEMO Team Member]',
    freelancerRef: 'DEMO-TM-01',
    taskId: 'DEMO-TSK-301',
    taskRef: 'DEMO-TSK-301',
    taskTitle: '[DEMO] Mystery Shopping — Phoenix Marketcity',
    earningEntitlementId: 902,
    amount: 56.00,
    reservePct: 10,
    holdDays: 15,
    releaseDueAt: '2026-10-31T17:00:00Z',
    status: 'Held',
    secondsToRelease: 864000,
    createdAt: '2026-10-16T17:00:00Z'
  },
  {
    id: 903,
    reserveRef: 'RES-DEMO-203',
    freelancerId: 'DEMO-TM-02',
    freelancerName: 'Imran Khan [DEMO Team Member]',
    freelancerRef: 'DEMO-TM-02',
    taskId: 'DEMO-TSK-203',
    taskRef: 'DEMO-TSK-203',
    taskTitle: '[DEMO] Kitchen Cleanliness Audit — Udupi Upahar',
    earningEntitlementId: 903,
    amount: 105.00,
    reservePct: 10,
    holdDays: 15,
    releaseDueAt: '2026-11-01T11:20:00Z',
    status: 'Held',
    secondsToRelease: 950400,
    createdAt: '2026-10-17T11:20:00Z'
  }
];

export const DEMO_WALLETS: Record<string, FreelancerWallet> = {
  'DEMO-TM-01': {
    freelancerId: 'DEMO-TM-01',
    freelancerName: 'Pooja Hegde [DEMO Team Member]',
    registrationRef: 'DEMO-TM-01',
    currentRank: 'Team Member',
    availableBalance: 1260.00, // 756 + 504
    reservedBalance: 140.00,   // 84 + 56
    pendingEarnings: 840.00,   // 70% of 1200 for DEMO-TSK-102
    totalEarned: 1400.00,      // Gross 840 + 560
    payoutsInProgress: 0.00,
    paidPayouts: 0.00,
    currency: 'INR',
    currencySymbol: '₹',
    isKycApproved: true,
    hasFraudFlag: false,
    minPayoutAmount: 500,
    maxPayoutAmount: 50000,
    lastReconciledAt: '2026-10-18T14:30:00Z'
  },
  'DEMO-TM-02': {
    freelancerId: 'DEMO-TM-02',
    freelancerName: 'Imran Khan [DEMO Team Member]',
    registrationRef: 'DEMO-TM-02',
    currentRank: 'Team Member',
    availableBalance: 945.00,
    reservedBalance: 105.00,
    pendingEarnings: 560.00,   // 70% of 800 for DEMO-TSK-303
    totalEarned: 1050.00,
    payoutsInProgress: 0.00,
    paidPayouts: 0.00,
    currency: 'INR',
    currencySymbol: '₹',
    isKycApproved: true,
    hasFraudFlag: false,
    minPayoutAmount: 500,
    maxPayoutAmount: 50000,
    lastReconciledAt: '2026-10-17T11:20:00Z'
  },
  'DEMO-TL-01': {
    freelancerId: 'DEMO-TL-01',
    freelancerName: 'Rajesh Gowda [DEMO Team Leader]',
    registrationRef: 'DEMO-TL-01',
    currentRank: 'Team Leader',
    availableBalance: 540.00,  // 240 (from TSK-101) + 300 (from TSK-203)
    reservedBalance: 0.00,
    pendingEarnings: 240.00,   // 20% of 1200 for TSK-102
    totalEarned: 540.00,
    payoutsInProgress: 0.00,
    paidPayouts: 0.00,
    currency: 'INR',
    currencySymbol: '₹',
    isKycApproved: true,
    hasFraudFlag: false,
    minPayoutAmount: 500,
    maxPayoutAmount: 50000,
    lastReconciledAt: '2026-10-18T14:30:00Z'
  },
  'DEMO-MGR-01': {
    freelancerId: 'DEMO-MGR-01',
    freelancerName: 'Sanjay Verma [DEMO Manager]',
    registrationRef: 'DEMO-MGR-01',
    currentRank: 'Manager',
    availableBalance: 270.00,  // 120 (from TSK-101) + 150 (from TSK-203)
    reservedBalance: 0.00,
    pendingEarnings: 120.00,   // 10% of 1200 for TSK-102
    totalEarned: 270.00,
    payoutsInProgress: 0.00,
    paidPayouts: 0.00,
    currency: 'INR',
    currencySymbol: '₹',
    isKycApproved: true,
    hasFraudFlag: false,
    minPayoutAmount: 500,
    maxPayoutAmount: 50000,
    lastReconciledAt: '2026-10-18T14:30:00Z'
  }
};

/**
 * Repeatable, non-destructive demo data seeder.
 * Merges demo records into the active store without duplicating.
 */
export function seedDemoData(targetStore: any): { success: boolean; message: string; addedProjects: number; addedTasks: number } {
  const state = targetStore.getState();

  let addedProjects = 0;
  for (const p of DEMO_PROJECTS) {
    if (!state.projects.some((existing: Project) => existing.id === p.id)) {
      state.projects.push(p);
      addedProjects++;
    }
  }

  let addedFreelancers = 0;
  for (const f of DEMO_FREELANCERS) {
    if (!state.freelancers.some((existing: Freelancer) => existing.id === f.id)) {
      state.freelancers.push(f);
      addedFreelancers++;
    }
  }

  let addedTeams = 0;
  if (!state.teams) state.teams = [];
  for (const tm of DEMO_TEAMS) {
    if (!state.teams.some((existing: Team) => existing.id === tm.id)) {
      state.teams.push(tm);
      addedTeams++;
    }
  }

  let addedTasks = 0;
  for (const t of DEMO_TASKS) {
    if (!state.tasks.some((existing: Task) => existing.id === t.id)) {
      state.tasks.push(t);
      addedTasks++;
    }
  }

  if (!state.ledgerJournals) state.ledgerJournals = [];
  for (const j of DEMO_JOURNALS) {
    if (!state.ledgerJournals.some((existing: LedgerJournal) => existing.id === j.id)) {
      state.ledgerJournals.push(j);
    }
  }

  if (!state.earningEntitlements) state.earningEntitlements = [];
  for (const e of DEMO_ENTITLEMENTS) {
    if (!state.earningEntitlements.some((existing: EarningEntitlement) => existing.id === e.id)) {
      state.earningEntitlements.push(e);
    }
  }

  if (!state.reserveRecords) state.reserveRecords = [];
  for (const r of DEMO_RESERVES) {
    if (!state.reserveRecords.some((existing: ReserveRecord) => existing.id === r.id)) {
      state.reserveRecords.push(r);
    }
  }

  if (!state.wallets) state.wallets = {};
  for (const [flId, w] of Object.entries(DEMO_WALLETS)) {
    if (!state.wallets[flId]) {
      state.wallets[flId] = { ...w };
    }
  }

  targetStore.save();
  return {
    success: true,
    message: `Demonstration dataset verified: ${addedProjects} projects, ${addedTasks} tasks, ${addedFreelancers} associates, and ${addedTeams} teams seeded safely.`,
    addedProjects,
    addedTasks
  };
}

/**
 * Cleanly removes all demonstration records (matching id prefixed with DEMO-)
 * while preserving legitimate production data.
 */
export function resetDemoData(targetStore: any): { success: boolean; message: string; removedCount: number } {
  const state = targetStore.getState();

  const prevProj = state.projects.length;
  state.projects = state.projects.filter((p: Project) => !String(p.id).startsWith('DEMO-'));
  const removedProjects = prevProj - state.projects.length;

  state.tasks = state.tasks.filter((t: Task) => !String(t.id).startsWith('DEMO-'));
  state.freelancers = state.freelancers.filter((f: Freelancer) => !String(f.id).startsWith('DEMO-'));
  if (state.teams) {
    state.teams = state.teams.filter((tm: Team) => !String(tm.id).startsWith('DEMO-'));
  }
  // Safe accounting teardown: Rather than destroying immutable double-entry journal rows,
  // demo journals are retained in historical audit storage and tagged as archived to preserve mathematical checksums.
  if (state.ledgerJournals) {
    state.ledgerJournals = state.ledgerJournals.map((j: LedgerJournal) => {
      if (String(j.journalRef).includes('DEMO')) {
        return {
          ...j,
          isArchived: true,
          narration: j.narration.startsWith('[ARCHIVED]') ? j.narration : `[ARCHIVED DEMO JOURNAL] ${j.narration}`
        };
      }
      return j;
    });
  }

  if (state.earningEntitlements) {
    state.earningEntitlements = state.earningEntitlements.filter((e: EarningEntitlement) => !String(e.entitlementRef).includes('DEMO'));
  }
  if (state.reserveRecords) {
    state.reserveRecords = state.reserveRecords.filter((r: ReserveRecord) => !String(r.reserveRef).includes('DEMO'));
  }
  if (state.wallets) {
    for (const key of Object.keys(state.wallets)) {
      if (key.startsWith('DEMO-')) {
        delete state.wallets[key];
      }
    }
  }

  targetStore.save();
  return {
    success: true,
    message: `Demonstration operational records purged cleanly. Posted ledger journals archived safely to preserve double-entry audit invariants. Production entities remain 100% intact.`,
    removedCount: removedProjects
  };
}
