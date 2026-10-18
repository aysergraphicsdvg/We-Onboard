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
  AppNotification 
} from '../types';

export const initialSiteSettings: SiteSettings = {
  companyName: 'We Onboard',
  tagline: 'Your ground engine for growth',
  phone: '+91 96111 09490',
  whatsapp: '919611109490',
  email: 'mail@weonboard.in',
  address: 'No. 235, 2nd Floor, 13th Cross Road, Binnamangala (Hoysala Nagar), 2nd Stage, Indiranagar, Bangalore, Karnataka 560038',
  businessHours: 'Monday to Saturday, 10:00 AM – 7:00 PM',
  seoTitle: 'We Onboard | Rider & Merchant Onboarding, Field Operations in Bangalore',
  metaDescription: 'Scale your business with We Onboard: rider and gig worker onboarding, merchant acquisition, field audits, franchise development and MSME registration support in Bangalore and beyond.',
  primaryColor: '#02167F',
  secondaryColor: '#FFD014',
  installLocked: true,
};

export const initialHeroBanners: HeroBanner[] = [
  {
    id: 'banner-1',
    order: 0,
    eyebrow: 'FIELD EXECUTION THAT MOVES BUSINESS',
    heading: 'Your ground',
    headingHighlight: 'engine for growth.',
    description: 'We onboard the riders, workers, shops, restaurants and partners your business needs, verified, trained and ready to go.',
    ctaText: 'Talk to Our Team',
    ctaLink: '#contact',
    secondaryCtaText: 'Join as a Freelancer',
    secondaryCtaLink: '#freelancers',
    trustPoints: ['Verified partners', 'Geo-tagged proof', 'Pay for results', 'Progress reporting'],
    visualType: 'rider',
    isActive: true,
  },
  {
    id: 'banner-2',
    order: 1,
    eyebrow: 'WORKFORCE & RIDER ACTIVATION',
    heading: 'More riders.',
    headingHighlight: 'More reach.',
    description: 'Source, verify, train and activate the people your delivery, mobility and service operations need to grow.',
    ctaText: 'Build Your Workforce',
    ctaLink: '#contact',
    secondaryCtaText: 'Explore Services',
    secondaryCtaLink: '#services',
    trustPoints: ['Structured onboarding', 'Local field network', 'Clear milestones'],
    visualType: 'rider-2',
    isActive: true,
  },
  {
    id: 'banner-3',
    order: 2,
    eyebrow: 'MERCHANT & RESTAURANT ACQUISITION',
    heading: 'Every neighbourhood',
    headingHighlight: 'is an opportunity.',
    description: 'Bring shops, restaurants, sellers and local businesses onto your platform with a clear path from prospect to activation.',
    ctaText: 'Expand My Network',
    ctaLink: '#contact',
    secondaryCtaText: 'See How It Works',
    secondaryCtaLink: '#services',
    trustPoints: ['Local reach', 'Verified details', 'Activation support'],
    visualType: 'merchant',
    isActive: true,
  },
  {
    id: 'banner-4',
    order: 3,
    eyebrow: 'FIELD AUDITS & MARKET INTELLIGENCE',
    heading: 'Real-world execution.',
    headingHighlight: 'Evidence you can trust.',
    description: 'Run field visits, retail audits, mystery shopping and surveys with documented proof and transparent reporting.',
    ctaText: 'Plan a Field Project',
    ctaLink: '#contact',
    secondaryCtaText: 'Our Capabilities',
    secondaryCtaLink: '#services',
    trustPoints: ['Structured visits', 'Quality checks', 'Clear reports'],
    visualType: 'audit',
    isActive: true,
  },
  {
    id: 'banner-5',
    order: 4,
    eyebrow: 'GOVERNMENT DEPARTMENTS & IMPLEMENTING AGENCIES',
    heading: 'On-ground execution for',
    headingHighlight: "government schemes & PSUs.",
    description: 'Partner with We Onboard for field mobilization, Udyam, PM Vishwakarma, ONDC seller drives, and cluster compliance audits with live geo-tagged dashboards.',
    ctaText: 'Partner with Govt Desk',
    ctaLink: '#msme',
    secondaryCtaText: 'Speak to Nodal Director',
    secondaryCtaLink: '#contact',
    trustPoints: ['Geo-tagged verification', 'Live department dashboards', 'Transparent audit trails'],
    visualType: 'msme',
    isActive: true,
  },
];

export const initialServices: CmsService[] = [
  {
    id: 'srv-1',
    title: 'Rider & Gig Worker Onboarding',
    description: 'Recruit, verify, train and activate riders, drivers and skilled workers with speed and compliance.',
    icon: 'rider',
    order: 1,
    isActive: true,
  },
  {
    id: 'srv-2',
    title: 'Merchant & Restaurant Onboarding',
    description: 'Get shops, kirana stores and restaurants listed, set up with digital POS, and actively transacting.',
    icon: 'merchant',
    order: 2,
    isActive: true,
  },
  {
    id: 'srv-3',
    title: 'Field Audits & Surveys',
    description: 'Geo-tagged visits, mystery shopping, physical inventory checks and business authenticity verification.',
    icon: 'audit',
    order: 3,
    isActive: true,
  },
  {
    id: 'srv-4',
    title: 'MSME Government Desk',
    description: 'Dedicated guidance for Udyam, GST, FSSAI, GeM, ONDC and ISO/ZED certification workflows.',
    icon: 'msme',
    order: 4,
    isActive: true,
  },
  {
    id: 'srv-5',
    title: 'Franchise & Dealership Building',
    description: 'Find, screen and onboard qualified franchisees and regional commercial dealers for your brand.',
    icon: 'franchise',
    order: 5,
    isActive: true,
  },
];

export const initialFaqs: FaqItem[] = [
  {
    id: 'faq-1',
    question: 'What does We Onboard do?',
    answer: 'We support rider and worker onboarding, merchant acquisition, field audits, market surveys, franchise development and MSME registration assistance across major business corridors.',
    category: 'General',
    order: 1,
  },
  {
    id: 'faq-2',
    question: 'Which cities do you serve?',
    answer: 'We are headquartered in Indiranagar, Bangalore, with field networks active across Bangalore Urban, Mysore, and extending into Tier-1 and Tier-2 hubs upon project scope agreement.',
    category: 'Coverage',
    order: 2,
  },
  {
    id: 'faq-3',
    question: 'How is pricing decided?',
    answer: 'Pricing depends on scope, locations, volume, deliverables and verification criteria. Commercial terms are shared and locked in a formal pilot agreement before work begins.',
    category: 'Commercial',
    order: 3,
  },
  {
    id: 'faq-4',
    question: 'Do freelancers pay a joining fee?',
    answer: 'Never. We Onboard never charges job seekers or independent associates a joining fee, registration fee, or security deposit to access work opportunities.',
    category: 'Freelancers',
    order: 4,
  },
  {
    id: 'faq-5',
    question: 'Is Udyam registration free?',
    answer: 'Yes, government registration through the official government portal is free. Any optional professional consultation or documentation assistance fee charged by We Onboard is clearly disclosed upfront.',
    category: 'MSME',
    order: 5,
  },
  {
    id: 'faq-6',
    question: 'Can you guarantee government approvals?',
    answer: 'No. Final approvals and statutory certifications rest entirely with the competent government authority or certification registrar. We provide structured procedural assistance.',
    category: 'MSME',
    order: 6,
  },
];

export const initialEnquiries: Enquiry[] = [
  {
    id: 'WO-ENQ-1001',
    fullName: 'Rajesh Kumar',
    companyName: 'SpeedDash Mobility',
    phone: '+91 98450 12345',
    email: 'rajesh@speeddash.in',
    enquiryType: 'Business',
    city: 'Bengaluru',
    serviceRequired: 'Rider and worker onboarding',
    message: 'Need 150 delivery riders onboarded and verified in Indiranagar and Koramangala for our quick delivery launch.',
    consent: true,
    submittedAt: '2026-10-12 10:30 AM',
    source: 'Website Contact Form',
    assignedStaff: 'Muhammad Ali Shoaib',
    status: 'Qualified',
    proposalValue: 185000,
    followUpDate: '2026-10-15',
    callOutcome: 'Spoke with operations head. Scope confirmed for 150 riders.',
    notes: [
      { id: 'n1', author: 'Muhammad Ali Shoaib', text: 'Initial scoping call completed. Client requested pilot proposal.', createdAt: '2026-10-12 11:15 AM' }
    ]
  },
  {
    id: 'WO-ENQ-1002',
    fullName: 'Ananya Deshmukh',
    companyName: 'FreshBite Cloud Kitchens',
    phone: '+91 97412 88990',
    email: 'ananya@freshbite.co',
    enquiryType: 'Business',
    city: 'Bengaluru',
    serviceRequired: 'Merchant and restaurant onboarding',
    message: 'Looking to acquire 60 merchant partners across HSR Layout and BTM Layout with POS training.',
    consent: true,
    submittedAt: '2026-10-13 02:15 PM',
    source: 'Hero Banner Pilot CTA',
    assignedStaff: 'Gousiya Fathima',
    status: 'Proposal Sent',
    proposalValue: 90000,
    followUpDate: '2026-10-16',
    callOutcome: 'Proposal emailed. Awaiting feedback from finance.',
    notes: [
      { id: 'n2', author: 'Gousiya Fathima', text: 'Drafted commercial pilot for 60 merchants at Rs 1,500/activation.', createdAt: '2026-10-13 04:00 PM' }
    ]
  },
  {
    id: 'WO-ENQ-1003',
    fullName: 'Kiran Gowda',
    companyName: 'Gowda Enterprises',
    phone: '+91 99001 55432',
    email: 'kiran.gowda@gmail.com',
    enquiryType: 'MSME',
    city: 'Bengaluru',
    serviceRequired: 'MSME registration support',
    message: 'Need urgent guidance on Udyam registration and GeM seller onboarding for our electrical supply business.',
    consent: true,
    submittedAt: '2026-10-14 09:10 AM',
    source: 'MSME Corner Form',
    assignedStaff: 'Suresh Patil',
    status: 'New',
    notes: []
  },
  {
    id: 'WO-ENQ-1004',
    fullName: 'Venkatesh Rao',
    companyName: 'South Express Retail',
    phone: '+91 98860 33441',
    email: 'venkat@southexpress.in',
    enquiryType: 'Franchise / dealership brand',
    city: 'Bengaluru',
    serviceRequired: 'Franchise and dealership development',
    message: 'We are expanding our retail supermarket format to 10 new franchise locations in Karnataka.',
    consent: true,
    submittedAt: '2026-10-11 04:45 PM',
    source: 'Franchise Modal',
    assignedStaff: 'Muhammad Ali Shoaib',
    status: 'Converted',
    proposalValue: 350000,
    convertedClientId: 'CLI-2026-001',
    notes: [
      { id: 'n3', author: 'Muhammad Ali Shoaib', text: 'Pilot contract signed! Converted to active client.', createdAt: '2026-10-13 05:30 PM' }
    ]
  },
  {
    id: 'WO-ENQ-1005',
    fullName: 'Pooja Hegde',
    phone: '+91 96200 44112',
    email: 'pooja.hegde99@gmail.com',
    enquiryType: 'Freelancer',
    city: 'Bengaluru',
    serviceRequired: 'Freelancer opportunities',
    message: 'Completed MBA marketing, 2 years field experience. Interested in Team Leader role.',
    consent: true,
    submittedAt: '2026-10-14 08:30 AM',
    source: 'Website Contact Form',
    assignedStaff: 'Gousiya Fathima',
    status: 'Contacted',
    notes: [
      { id: 'n4', author: 'Gousiya Fathima', text: 'Shared public freelancer registration link.', createdAt: '2026-10-14 09:00 AM' }
    ]
  }
];

export const initialFreelancers: Freelancer[] = [
  {
    id: 'WO-FR-2026-001',
    fullName: 'Karthik Raman',
    email: 'karthik.raman@gmail.com',
    phone: '+91 98451 90812',
    dob: '1998-05-14',
    gender: 'Male',
    residentialAddress: '12th Main, HAL 2nd Stage, Indiranagar',
    city: 'Bengaluru',
    state: 'Karnataka',
    pinCode: '560038',
    isAdult: true,
    hasSmartphone: true,
    languages: ['Kannada', 'English', 'Hindi', 'Tamil'],
    preferredAreas: ['Indiranagar', 'Koramangala', 'Domlur'],
    preferredWorkType: 'Full-time',
    education: 'Bachelor of Commerce',
    previousExperienceYears: 3,
    salesFieldExperience: true,
    skills: ['Merchant Onboarding', 'Field Surveys', 'KYC Verification', 'Team Leadership'],
    preferredRole: 'Team Leader',
    previousEmployer: 'Zomato Merchant Ops',
    status: 'Active',
    registeredAt: '2026-10-01',
    approvedWorkingAreas: ['Indiranagar', 'Koramangala'],
    documents: [
      { id: 'd1', name: 'Aadhaar Card', type: 'Aadhaar', fileName: 'karthik_aadhaar_masked.pdf', uploadedAt: '2026-10-01', verified: true },
      { id: 'd2', name: 'PAN Card', type: 'PAN', fileName: 'karthik_pan.pdf', uploadedAt: '2026-10-01', verified: true },
      { id: 'd3', name: 'Resume', type: 'Resume', fileName: 'karthik_resume_2026.pdf', uploadedAt: '2026-10-01', verified: true }
    ],
    trainings: [
      { moduleName: 'Field Ethics & Safety Protocols', completed: true, completedAt: '2026-10-03', score: 95 },
      { moduleName: 'Merchant Digital POS Onboarding SOP', completed: true, completedAt: '2026-10-04', score: 92 }
    ],
    verificationNotes: 'Documents verified by Gousiya Fathima. Prior operations experience confirmed.',
    rating: 4.8,
    completedTasksCount: 42,
    totalEarnings: 31500,
    pendingPayout: 4200,
    bankAccountMasked: 'HDFC Bank - •••• 4128'
  },
  {
    id: 'WO-FR-2026-002',
    fullName: 'Syed Imran',
    email: 'syed.imran@outlook.com',
    phone: '+91 97314 22001',
    dob: '2001-09-20',
    gender: 'Male',
    residentialAddress: 'BTM 2nd Stage, Near Water Tank',
    city: 'Bengaluru',
    state: 'Karnataka',
    pinCode: '560076',
    isAdult: true,
    hasSmartphone: true,
    languages: ['Kannada', 'Hindi', 'Urdu', 'English'],
    preferredAreas: ['BTM Layout', 'HSR Layout', 'Jayanagar'],
    preferredWorkType: 'Flexible',
    education: 'Pre-University / 12th',
    previousExperienceYears: 1,
    salesFieldExperience: true,
    skills: ['Rider Sourcing', 'Document Verification', 'Local Navigation'],
    preferredRole: 'Team Member / Field Executive',
    status: 'Ready for Assignment',
    registeredAt: '2026-10-08',
    approvedWorkingAreas: ['BTM Layout', 'HSR Layout'],
    documents: [
      { id: 'd4', name: 'Aadhaar Card', type: 'Aadhaar', fileName: 'syed_aadhaar.pdf', uploadedAt: '2026-10-08', verified: true },
      { id: 'd5', name: 'Driving License', type: 'Driving License', fileName: 'syed_dl.pdf', uploadedAt: '2026-10-08', verified: true }
    ],
    trainings: [
      { moduleName: 'Field Ethics & Safety Protocols', completed: true, completedAt: '2026-10-10', score: 88 }
    ],
    verificationNotes: 'Aadhaar and DL authenticated.',
    rating: 4.6,
    completedTasksCount: 15,
    totalEarnings: 11250,
    pendingPayout: 1500,
    bankAccountMasked: 'SBI - •••• 9014'
  },
  {
    id: 'WO-FR-2026-003',
    fullName: 'Meenakshi Sundaram',
    email: 'meenakshi.s@gmail.com',
    phone: '+91 96321 77412',
    dob: '1999-12-05',
    gender: 'Female',
    residentialAddress: 'Whitefield Main Road, Hope Farm',
    city: 'Bengaluru',
    state: 'Karnataka',
    pinCode: '560066',
    isAdult: true,
    hasSmartphone: true,
    languages: ['Tamil', 'Kannada', 'English'],
    preferredAreas: ['Whitefield', 'Marathahalli', 'ITPL'],
    preferredWorkType: 'Full-time',
    education: 'Bachelor of Science (Computer Applications)',
    previousExperienceYears: 2,
    salesFieldExperience: true,
    skills: ['Field Audits', 'Retail Stock Verification', 'Mystery Shopping'],
    preferredRole: 'Project Manager',
    previousEmployer: 'RetailPulse Audits',
    status: 'Under Review',
    registeredAt: '2026-10-13',
    approvedWorkingAreas: [],
    documents: [
      { id: 'd6', name: 'Resume', type: 'Resume', fileName: 'meenakshi_audit_cv.pdf', uploadedAt: '2026-10-13', verified: false }
    ],
    trainings: [],
    completedTasksCount: 0,
    totalEarnings: 0,
    pendingPayout: 0
  },
  {
    id: 'WO-FR-2026-004',
    fullName: 'Arun Prakash',
    email: 'arun.prakash95@gmail.com',
    phone: '+91 98440 66123',
    dob: '1995-07-22',
    gender: 'Male',
    residentialAddress: 'Jayanagar 4th Block, Bengaluru',
    city: 'Bengaluru',
    state: 'Karnataka',
    pinCode: '560011',
    isAdult: true,
    hasSmartphone: true,
    languages: ['Kannada', 'Telugu', 'English'],
    preferredAreas: ['Jayanagar', 'JP Nagar', 'Banashankari'],
    preferredWorkType: 'Part-time',
    education: 'Bachelor of Arts',
    previousExperienceYears: 4,
    salesFieldExperience: true,
    skills: ['Merchant Onboarding', 'Field Surveys', 'Retail Verification'],
    preferredRole: 'Freelancer / Independent Field Associate',
    status: 'Submitted',
    registeredAt: '2026-10-14',
    approvedWorkingAreas: [],
    documents: [],
    trainings: [],
    completedTasksCount: 0,
    totalEarnings: 0,
    pendingPayout: 0
  }
];

export const initialProjects: Project[] = [
  {
    id: 'PRJ-2026-01',
    name: 'SpeedDash Indiranagar Quick Delivery Fleet Pilot',
    clientName: 'SpeedDash Mobility',
    clientId: 'CLI-2026-002',
    serviceCategory: 'Rider and worker onboarding',
    description: 'Recruit, screen, inspect two-wheelers, and activate 150 delivery riders with safety kit handover.',
    targetCity: 'Bengaluru',
    targetAreas: ['Indiranagar', 'Koramangala', 'Domlur'],
    targetUnits: 150,
    completedUnits: 124,
    startDate: '2026-10-01',
    endDate: '2026-10-25',
    projectManager: 'Muhammad Ali Shoaib',
    teamLeaders: ['Karthik Raman'],
    requiredRoles: ['Team Member / Field Executive', 'Team Leader'],
    deliverables: 'Verified rider KYC, active app install, safety helmet handover with photo proof.',
    acceptanceCriteria: 'Clean background validation, driving license, test ride completion.',
    paymentModel: 'Per Activation',
    budget: 185000,
    status: 'Active',
    tasksCount: 18
  },
  {
    id: 'PRJ-2026-02',
    name: 'South Express Retail Kirana POS Acquisition',
    clientName: 'South Express Retail',
    clientId: 'CLI-2026-001',
    serviceCategory: 'Merchant and restaurant onboarding',
    description: 'Onboard 50 mom-and-pop grocery stores onto digital procurement catalog with storefront photo and owner KYC.',
    targetCity: 'Bengaluru',
    targetAreas: ['HSR Layout', 'BTM Layout'],
    targetUnits: 50,
    completedUnits: 38,
    startDate: '2026-10-05',
    endDate: '2026-10-30',
    projectManager: 'Gousiya Fathima',
    teamLeaders: ['Karthik Raman'],
    requiredRoles: ['Team Member / Field Executive'],
    deliverables: 'Store front picture, geo-tag coordinates, owner PAN/GST, 1 test catalog transaction.',
    acceptanceCriteria: 'Validated store location with geo-tag and first test order executed.',
    paymentModel: 'Per Activation',
    budget: 75000,
    status: 'Active',
    tasksCount: 12
  },
  {
    id: 'PRJ-2026-03',
    name: 'Metro Q-Commerce Shelf Audit Bangalore East',
    clientName: 'SpeedDash Mobility',
    serviceCategory: 'Field audits and surveys',
    description: 'Audit 100 partner dark stores and retail partners for shelf expiration, hygiene checklist and price tagging.',
    targetCity: 'Bengaluru',
    targetAreas: ['Whitefield', 'Marathahalli', 'Indiranagar'],
    targetUnits: 100,
    completedUnits: 15,
    startDate: '2026-10-12',
    endDate: '2026-11-10',
    projectManager: 'Muhammad Ali Shoaib',
    teamLeaders: [],
    requiredRoles: ['Freelancer / Independent Field Associate'],
    deliverables: '12-point audit checklist submitted with high-res photos and manager sign-off timestamp.',
    acceptanceCriteria: 'Complete audit checklist with zero missing mandatory photos.',
    paymentModel: 'Per Audit',
    budget: 95000,
    status: 'Active',
    tasksCount: 8
  }
];

export const initialTasks: Task[] = [
  {
    id: 'TSK-101',
    projectId: 'PRJ-2026-01',
    title: 'Onboard 10 Delivery Riders — HAL 2nd Stage Hub',
    description: 'Execute physical document collection, vehicle inspection, app setup and briefing for 10 delivery candidates.',
    assignedFreelancerId: 'WO-FR-2026-001',
    assignedFreelancerName: 'Karthik Raman',
    city: 'Bengaluru',
    targetArea: 'Indiranagar',
    deadline: '2026-10-18',
    evidenceRequirements: ['Rider DL photo', 'Vehicle RC copy', 'App Activation Screenshot', 'Geo-tagged handover photo'],
    payoutAmount: 3500,
    status: 'In Progress'
  },
  {
    id: 'TSK-102',
    projectId: 'PRJ-2026-02',
    title: 'Acquire 5 Kirana Stores on 14th Main HSR Layout',
    description: 'Visit local provisioning and grocery stores, demonstrate digital inventory ordering, collect GST/FSSAI copies.',
    assignedFreelancerId: 'WO-FR-2026-002',
    assignedFreelancerName: 'Syed Imran',
    city: 'Bengaluru',
    targetArea: 'HSR Layout',
    deadline: '2026-10-16',
    evidenceRequirements: ['Storefront photo with signboard', 'Geo-tag lat/long', 'Owner consent signature', 'First test order ID'],
    payoutAmount: 2500,
    status: 'Submitted',
    evidence: {
      id: 'ev-1',
      submittedAt: '2026-10-14 02:45 PM',
      freelancerNotes: 'Completed 5 stores on 14th Main HSR Sector 4: Sri Balaji Traders, Lakshmi Provision, Daily Fresh, etc. Collected GST and test order.',
      geoTag: {
        latitude: 12.9121,
        longitude: 77.6446,
        address: '14th Main Rd, Sector 4, HSR Layout, Bengaluru 560102'
      },
      attachments: [
        { name: 'sri_balaji_storefront.jpg' },
        { name: 'lakshmi_provision_pos.jpg' }
      ]
    }
  },
  {
    id: 'TSK-103',
    projectId: 'PRJ-2026-03',
    title: 'Shelf Hygiene Audit — Indiranagar Dark Store #04',
    description: 'Conduct comprehensive 12-point quality and cold-storage temperature audit with photo evidence.',
    assignedFreelancerId: 'WO-FR-2026-001',
    assignedFreelancerName: 'Karthik Raman',
    city: 'Bengaluru',
    targetArea: 'Indiranagar',
    deadline: '2026-10-15',
    evidenceRequirements: ['Temperature log photo', 'Chilled dairy section photo', 'Store manager confirmation'],
    payoutAmount: 1200,
    status: 'Approved',
    reviewComment: 'Audit thoroughly executed. Temperature logs clear and timestamped.',
    reviewedBy: 'Muhammad Ali Shoaib',
    reviewedAt: '2026-10-13 06:10 PM',
    evidence: {
      id: 'ev-2',
      submittedAt: '2026-10-13 04:30 PM',
      freelancerNotes: 'Inspected store #04 on 100ft road. Temp at 3.8C. Passed all hygiene criteria.',
      geoTag: {
        latitude: 12.9784,
        longitude: 77.6408,
        address: '100 Feet Rd, Indiranagar, Bengaluru'
      },
      attachments: [
        { name: 'temp_log_verified.jpg' }
      ]
    }
  }
];

export const initialMsmeRequests: MsmeRequest[] = [
  {
    id: 'MSME-1001',
    businessName: 'Gowda Electricals & Automation',
    applicantName: 'Kiran Gowda',
    phone: '+91 99001 55432',
    email: 'kiran.gowda@gmail.com',
    city: 'Bengaluru',
    state: 'Karnataka',
    category: 'Micro',
    stage: '1-3 Years',
    currentRegistrations: ['GST'],
    requestedServices: ['Udyam registration assistance', 'GeM seller onboarding'],
    description: 'Supplying industrial switchgear. Looking to participate in government tenders on Government e-Marketplace (GeM).',
    status: 'New',
    submittedAt: '2026-10-14 09:10 AM',
    assignedStaff: 'Suresh Patil',
    internalNotes: ['Assigned to Suresh. Initial eligibility check scheduled.'],
    disclosedAssistanceFee: 3500,
    requiredDocumentsChecklist: [
      { document: 'Aadhaar of Proprietor', received: true },
      { document: 'PAN of Business', received: true },
      { document: 'GST Certificate', received: true },
      { document: 'Bank Statement / Cancelled Cheque', received: false }
    ]
  },
  {
    id: 'MSME-1002',
    businessName: 'Cauvery Pure Artisanal Spices',
    applicantName: 'Shalini Narayanan',
    phone: '+91 98455 12099',
    email: 'shalini@cauveryspices.in',
    city: 'Mysuru',
    state: 'Karnataka',
    category: 'Small',
    stage: '3+ Years',
    currentRegistrations: ['Udyam', 'GST'],
    requestedServices: ['FSSAI assistance', 'ONDC seller onboarding'],
    description: 'Manufacturer of packaged spice blends. Need FSSAI manufacturing license renewal and onboarding on ONDC network.',
    status: 'In Progress',
    submittedAt: '2026-10-09 11:20 AM',
    assignedStaff: 'Gousiya Fathima',
    internalNotes: ['FSSAI application draft uploaded. Awaiting inspection appointment.'],
    disclosedAssistanceFee: 4500,
    requiredDocumentsChecklist: [
      { document: 'FSSAI Form B Draft', received: true },
      { document: 'Premises Blueprint / Layout', received: true },
      { document: 'Water Test Analysis Report', received: true },
      { document: 'List of Food Categories', received: true }
    ]
  }
];

export const initialClients: Client[] = [
  {
    id: 'CLI-2026-001',
    companyName: 'South Express Retail Pvt Ltd',
    primaryContact: 'Venkatesh Rao',
    phone: '+91 98860 33441',
    email: 'venkat@southexpress.in',
    industry: 'Retail & Supermarket Chain',
    city: 'Bengaluru',
    website: 'https://southexpress.in',
    servicesRequired: ['Franchise and dealership development', 'Merchant and restaurant onboarding'],
    leadSource: 'Franchise Modal Enquiry',
    assignedAccountManager: 'Muhammad Ali Shoaib',
    clientStatus: 'Active Client',
    notes: ['Signed 6-month contract for 10 franchise territory evaluations and merchant POS integration.'],
    contractValue: 350000,
    createdAt: '2026-10-13'
  },
  {
    id: 'CLI-2026-002',
    companyName: 'SpeedDash Mobility',
    primaryContact: 'Rajesh Kumar',
    phone: '+91 98450 12345',
    email: 'rajesh@speeddash.in',
    industry: 'Quick Commerce & Logistics',
    city: 'Bengaluru',
    website: 'https://speeddash.in',
    servicesRequired: ['Rider and worker onboarding', 'Field audits and surveys'],
    leadSource: 'Direct Business Inbound',
    assignedAccountManager: 'Muhammad Ali Shoaib',
    clientStatus: 'Active Client',
    notes: ['Expanding quick commerce fleet across East & South Bangalore.'],
    contractValue: 280000,
    createdAt: '2026-10-12'
  }
];

export const initialFranchiseLeads: FranchiseLead[] = [
  {
    id: 'FRAN-101',
    applicantName: 'Manojkumar Patel',
    phone: '+91 98250 88123',
    email: 'manoj.patel@patelventures.com',
    preferredTerritory: 'Whitefield / Hoodi, Bangalore',
    businessExperience: '12 years running pharmaceutical retail stores',
    investmentCapacity: '₹25 Lakhs – ₹50 Lakhs',
    preferredModel: 'FOFO (Franchise Owned Franchise Operated)',
    status: 'Site Assessment',
    applicationDate: '2026-10-10',
    assignedStaff: 'Muhammad Ali Shoaib',
    notes: ['Commercial property shortlisted near ITPL. Site inspection scheduled for Thursday.']
  },
  {
    id: 'FRAN-102',
    applicantName: 'Deepak Varma',
    phone: '+91 97400 31221',
    email: 'deepak.varma@gmail.com',
    preferredTerritory: 'Yelahanka / New Town, Bangalore North',
    businessExperience: '5 years automobile service dealership',
    investmentCapacity: '₹15 Lakhs – ₹25 Lakhs',
    preferredModel: 'Regional Dealership',
    status: 'Qualified',
    applicationDate: '2026-10-13',
    assignedStaff: 'Gousiya Fathima',
    notes: ['Financial capacity verified. Preparing territory commercial terms.']
  }
];

export const initialAdminUsers: AdminUser[] = [
  {
    id: 'usr-1',
    name: 'Muhammad Ali Shoaib',
    email: 'admin@weonboard.in',
    role: 'Super Admin',
    isActive: true,
    lastLogin: '2026-10-14 05:20 AM',
    createdAt: '2026-09-01'
  },
  {
    id: 'usr-2',
    name: 'Umme Morsi',
    email: 'umme@weonboard.in',
    role: 'Administrator',
    isActive: true,
    lastLogin: '2026-10-14 04:45 AM',
    createdAt: '2026-09-01'
  },
  {
    id: 'usr-3',
    name: 'Suresh Patil',
    email: 'suresh@weonboard.in',
    role: 'Enquiry Manager',
    isActive: true,
    lastLogin: '2026-10-13 06:15 PM',
    createdAt: '2026-09-15'
  },
  {
    id: 'usr-4',
    name: 'Priya Sharma',
    email: 'priya@weonboard.in',
    role: 'Freelancer Coordinator',
    isActive: true,
    lastLogin: '2026-10-13 05:00 PM',
    createdAt: '2026-09-20'
  }
];

export const initialAuditLogs: AuditLog[] = [
  {
    id: 'aud-1',
    actingUser: 'Muhammad Ali Shoaib',
    action: 'System Installation & Table Verification',
    recordType: 'Auth',
    recordId: 'SYS-INIT',
    details: 'Initial database schema created and Super Admin provisioned.',
    timestamp: '2026-10-14 04:00 AM'
  },
  {
    id: 'aud-2',
    actingUser: 'Gousiya Fathima',
    action: 'Approved Freelancer Application',
    recordType: 'Freelancer',
    recordId: 'WO-FR-2026-001',
    details: 'Approved Karthik Raman application and assigned Team Leader role.',
    timestamp: '2026-10-14 04:30 AM'
  },
  {
    id: 'aud-3',
    actingUser: 'Muhammad Ali Shoaib',
    action: 'Converted Enquiry to Active Client',
    recordType: 'Client',
    recordId: 'CLI-2026-001',
    details: 'Converted enquiry WO-ENQ-1004 (South Express Retail) into client CLI-2026-001.',
    timestamp: '2026-10-14 05:00 AM'
  }
];

export const initialNotifications: AppNotification[] = [
  {
    id: 'notif-1',
    title: 'New Business Enquiry',
    message: 'SpeedDash Mobility requested 150 rider onboarding pilot in Bangalore.',
    type: 'enquiry',
    timestamp: '15 mins ago',
    read: false,
    link: 'enquiries'
  },
  {
    id: 'notif-2',
    title: 'Field Task Evidence Submitted',
    message: 'Syed Imran submitted photo evidence for Task TSK-102 (Kirana Acquisition).',
    type: 'task',
    timestamp: '1 hour ago',
    read: false,
    link: 'projects'
  },
  {
    id: 'notif-3',
    title: 'New Freelancer Application',
    message: 'Arun Prakash submitted registration for Field Associate in Jayanagar.',
    type: 'freelancer',
    timestamp: '3 hours ago',
    read: true,
    link: 'freelancers'
  }
];
