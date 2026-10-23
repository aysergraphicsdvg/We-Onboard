/**
 * WE ONBOARD — Automated Verification Suite
 * UI Cleanup, Demonstration Data, Multi-Role Boundaries, and Ledger Accounting
 */

import { store } from '../src/services/store';
import { DEMO_PROJECTS, DEMO_FREELANCERS, DEMO_TASKS, DEMO_TEAMS, DEMO_JOURNALS, seedDemoData, resetDemoData } from '../src/services/demoData';

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    passed++;
    console.log(`  [PASS] ${testName}`);
  } else {
    failed++;
    console.error(`  [FAIL] ${testName}${detail ? ` — ${detail}` : ''}`);
  }
}

async function runTests() {
  console.log('========================================================');
  console.log('WE ONBOARD: DEMO DATA, ROLES & FINANCIAL AUDIT SUITE');
  console.log('========================================================\n');

  // --- SUITE 1: REPEATABLE & NON-DESTRUCTIVE SEEDER INVARIANTS ---
  console.log('--- SUITE 1: Seeder Repeatability & Idempotency ---');
  
  // Seed first time
  const seed1 = store.seedDemoData();
  assert(seed1.success, 'First seeding executes successfully');

  const countProjects1 = store.getState().projects.filter(p => String(p.id).startsWith('DEMO-')).length;
  const countTasks1 = store.getState().tasks.filter(t => String(t.id).startsWith('DEMO-')).length;
  const countFreelancers1 = store.getState().freelancers.filter(f => String(f.id).startsWith('DEMO-')).length;

  assert(countProjects1 === 3, 'Demo dataset provisions exactly 3 projects', `Found ${countProjects1}`);
  assert(countTasks1 === 12, 'Demo dataset provisions exactly 12 tasks', `Found ${countTasks1}`);
  assert(countFreelancers1 === 4, 'Demo dataset provisions exactly 4 associates', `Found ${countFreelancers1}`);

  // Seed second time (Idempotency test)
  const seed2 = store.seedDemoData();
  assert(seed2.success, 'Second seeding executes without error');

  const countProjects2 = store.getState().projects.filter(p => String(p.id).startsWith('DEMO-')).length;
  const countTasks2 = store.getState().tasks.filter(t => String(t.id).startsWith('DEMO-')).length;
  const countFreelancers2 = store.getState().freelancers.filter(f => String(f.id).startsWith('DEMO-')).length;

  assert(countProjects2 === countProjects1, 'Seeding is idempotent: zero duplicate projects added', `${countProjects2} vs ${countProjects1}`);
  assert(countTasks2 === countTasks1, 'Seeding is idempotent: zero duplicate tasks added', `${countTasks2} vs ${countTasks1}`);
  assert(countFreelancers2 === countFreelancers1, 'Seeding is idempotent: zero duplicate associates added', `${countFreelancers2} vs ${countFreelancers1}`);

  // --- SUITE 2: THE 3 DISTINCT DEMO PROJECTS ---
  console.log('\n--- SUITE 2: Demo Projects Verification ---');
  const p1 = store.getState().projects.find(p => p.id === 'DEMO-PRJ-01');
  const p2 = store.getState().projects.find(p => p.id === 'DEMO-PRJ-02');
  const p3 = store.getState().projects.find(p => p.id === 'DEMO-PRJ-03');

  assert(Boolean(p1), 'Project 1 exists: Retail Merchant Onboarding');
  assert(p1?.targetCity === 'Bengaluru' && p1?.targetAreas?.includes('Indiranagar'), 'Project 1 targets Bengaluru Indiranagar corridor');
  assert(p1?.targetUnits === 40 && p1?.paymentModel === 'Per Activation', 'Project 1 targets 40 units on Per Activation model');

  assert(Boolean(p2), 'Project 2 exists: Restaurant & MSME Field Audit');
  assert(Boolean(p2?.targetAreas?.includes('HSR Layout') && p2?.serviceCategory === 'Field audits and surveys'), 'Project 2 targets HSR/BTM corridors for audits');
  assert(p2?.targetUnits === 30 && p2?.paymentModel === 'Per Audit', 'Project 2 targets 30 units on Per Audit model');

  assert(Boolean(p3), 'Project 3 exists: Market Survey & Mystery Shopping');
  assert(Boolean(p3?.targetAreas?.includes('Whitefield')), 'Project 3 targets Whitefield corridor');
  assert(p3?.targetUnits === 50 && p3?.budget === 40000, 'Project 3 targets 50 units with ₹40,000 budget');

  // --- SUITE 3: WORKFLOW STATE MACHINE COVERAGE ---
  console.log('\n--- SUITE 3: Task Workflow States ---');
  const demoTasks = store.getState().tasks.filter(t => String(t.id).startsWith('DEMO-'));
  
  const statuses = new Set(demoTasks.map(t => t.status));
  assert(statuses.has('Available'), 'Available state demonstrated', Array.from(statuses).join(', '));
  assert(statuses.has('Accepted') || statuses.has('Assigned'), 'Accepted / Assigned state demonstrated');
  assert(statuses.has('In Progress'), 'In Progress state demonstrated');
  assert(statuses.has('Submitted'), 'Submitted state demonstrated');
  assert(statuses.has('Approved'), 'Approved state demonstrated');
  assert(statuses.has('Rework Required'), 'Rework Required state demonstrated');

  const reworkTask = demoTasks.find(t => t.status === 'Rework Required');
  assert(Boolean(reworkTask?.reviewComment && reworkTask.reviewComment.includes('blurry')), 'Rework task has actionable QC review comment');

  // --- SUITE 4: ORGANIZATIONAL ROLES & ACCESS BOUNDARIES ---
  console.log('\n--- SUITE 4: Organizational Roles & Scoped Boundaries ---');

  // 1. Team Member (Pooja Hegde: DEMO-TM-01)
  store.loginFreelancer('DEMO-TM-01');
  const currentMember = store.getState().currentFreelancer;
  assert(currentMember?.id === 'DEMO-TM-01', 'Team Member authenticated: Pooja Hegde');
  
  const memberHub = store.getTaskHub('DEMO-TM-01');
  const memberAssigned = memberHub.assigned.every(t => t.assignedFreelancerId === 'DEMO-TM-01');
  const memberSubmitted = memberHub.submitted.every(t => t.assignedFreelancerId === 'DEMO-TM-01');
  const memberCompleted = memberHub.completed.every(t => t.assignedFreelancerId === 'DEMO-TM-01');
  assert(memberAssigned && memberSubmitted && memberCompleted, 'Team Member can only view their own assigned/submitted/completed tasks');

  // Confirm Pooja cannot view Imran Khan's tasks in her personal hub
  const hasImranTask = memberHub.assigned.some(t => t.assignedFreelancerId === 'DEMO-TM-02') ||
                       memberHub.submitted.some(t => t.assignedFreelancerId === 'DEMO-TM-02');
  assert(!hasImranTask, 'Team Member cannot access tasks assigned to other associates');

  // Confirm Pooja's wallet isolation
  const poojaWallet = store.getWallet('DEMO-TM-01');
  assert(poojaWallet?.freelancerId === 'DEMO-TM-01' && poojaWallet.availableBalance === 1260.00, 'Pooja wallet balance verified: ₹1,260.00');

  // 2. Team Leader (Rajesh Gowda: DEMO-TL-01)
  store.loginFreelancer('DEMO-TL-01');
  const currentLeader = store.getState().currentFreelancer;
  assert(currentLeader?.currentRank === 'Team Leader', 'Team Leader authenticated: Rajesh Gowda');
  
  const leaderTeam = store.getState().teams.find(t => (t as any).leaderId === 'DEMO-TL-01' || t.leader?.id === 'DEMO-TL-01');
  assert(Boolean(leaderTeam), 'Team Leader has an authorized team (Team Alpha)');
  assert(Boolean(leaderTeam?.members?.some(m => m.freelancerId === 'DEMO-TM-01')), 'Team Alpha includes Pooja Hegde');
  assert(Boolean(leaderTeam?.members?.some(m => m.freelancerId === 'DEMO-TM-02')), 'Team Alpha includes Imran Khan');

  // 3. Area Operations Manager (Sanjay Verma: DEMO-MGR-01)
  store.loginFreelancer('DEMO-MGR-01');
  const currentManager = store.getState().currentFreelancer;
  assert(currentManager?.currentRank === 'Manager', 'Area Manager authenticated: Sanjay Verma');
  
  const managedProjects = store.getState().projects.filter(p => p.projectManager?.includes('Sanjay Verma'));
  assert(managedProjects.length >= 3, 'Area Manager governs all 3 demonstration projects', `Found ${managedProjects.length}`);

  // --- SUITE 5: DOUBLE-ENTRY LEDGER RECONCILIATION ---
  console.log('\n--- SUITE 5: Double-Entry Ledger Equilibrium ---');
  const demoJournals = store.getState().ledgerJournals.filter(j => String(j.journalRef).includes('DEMO'));
  assert(demoJournals.length >= 2, 'Demonstration ledger journals exist', `Found ${demoJournals.length}`);

  let allJournalsBalanced = true;
  let totalDebits = 0;
  let totalCredits = 0;

  for (const j of demoJournals) {
    const journalDebits = (j.lines || []).filter(l => l.entryType === 'DEBIT').reduce((sum, l) => sum + Number(l.amount), 0);
    const journalCredits = (j.lines || []).filter(l => l.entryType === 'CREDIT').reduce((sum, l) => sum + Number(l.amount), 0);
    
    totalDebits += journalDebits;
    totalCredits += journalCredits;

    if (Math.abs(journalDebits - journalCredits) > 0.001) {
      allJournalsBalanced = false;
      console.error(`Unbalanced demo journal ${j.journalRef}: Debits ${journalDebits} != Credits ${journalCredits}`);
    }
  }

  assert(allJournalsBalanced, 'Every demonstration journal balances perfectly (Debits == Credits)');
  assert(Math.abs(totalDebits - totalCredits) < 0.001, `Global trial balance reconciles: Total Debits (₹${totalDebits.toFixed(2)}) == Total Credits (₹${totalCredits.toFixed(2)})`);

  // Verify 70/20/10 split on JRN-DEMO-20261018-01 (Task DEMO-TSK-101, ₹1200)
  const jrn101 = demoJournals.find(j => j.referenceId === 'DEMO-TSK-101');
  assert(Boolean(jrn101), 'Earning journal for Task DEMO-TSK-101 exists');
  
  const debitExpense = jrn101?.lines?.find(l => l.accountCode === '5001')?.amount;
  const creditAssociateNet = jrn101?.lines?.find(l => l.accountCode === '2001')?.amount;
  const creditAssociateReserve = jrn101?.lines?.find(l => l.accountCode === '2004')?.amount;
  const creditLeaderOverride = jrn101?.lines?.find(l => l.accountCode === '2002')?.amount;
  const creditManagerOverride = jrn101?.lines?.find(l => l.accountCode === '2003')?.amount;

  assert(debitExpense === 1200.00, 'Project execution expense debited: ₹1,200.00');
  assert(creditAssociateNet === 756.00, 'Associate net (63% = 70% × 90%): ₹756.00');
  assert(creditAssociateReserve === 84.00, 'Associate quality reserve (7% = 70% × 10%): ₹84.00');
  assert(creditLeaderOverride === 240.00, 'Team leader override (20% of ₹1,200): ₹240.00');
  assert(creditManagerOverride === 120.00, 'Manager supervision override (10% of ₹1,200): ₹120.00');

  // Verify Growth Pool routing on Project 3 (unassigned TL/manager shares)
  const jrn301 = demoJournals.find(j => j.referenceId === 'DEMO-TSK-301');
  const creditGrowthPool = jrn301?.lines?.find(l => l.accountCode === '3001')?.amount;
  assert(creditGrowthPool === 240.00, 'Unassigned 30% share correctly routed to Growth Pool: ₹240.00');

  // --- SUITE 6: NON-DESTRUCTIVE PURGE TEST ---
  console.log('\n--- SUITE 6: Clean Purge & Production Isolation ---');
  const prodFreelancersBefore = store.getState().freelancers.filter(f => !String(f.id).startsWith('DEMO-')).length;
  const prodProjectsBefore = store.getState().projects.filter(p => !String(p.id).startsWith('DEMO-')).length;

  // Purge demo records
  const purgeRes = store.resetDemoData();
  assert(purgeRes.success, 'Demo data reset executed successfully');

  const demoProjectsAfter = store.getState().projects.filter(p => String(p.id).startsWith('DEMO-')).length;
  const demoTasksAfter = store.getState().tasks.filter(t => String(t.id).startsWith('DEMO-')).length;
  const demoFreelancersAfter = store.getState().freelancers.filter(f => String(f.id).startsWith('DEMO-')).length;

  assert(demoProjectsAfter === 0, 'All demo projects purged cleanly');
  assert(demoTasksAfter === 0, 'All demo tasks purged cleanly');
  assert(demoFreelancersAfter === 0, 'All demo associates purged cleanly');

  const prodFreelancersAfter = store.getState().freelancers.filter(f => !String(f.id).startsWith('DEMO-')).length;
  const prodProjectsAfter = store.getState().projects.filter(p => !String(p.id).startsWith('DEMO-')).length;

  assert(prodFreelancersAfter === prodFreelancersBefore, 'Production freelancers preserved intact', `${prodFreelancersAfter} vs ${prodFreelancersBefore}`);
  assert(prodProjectsAfter === prodProjectsBefore, 'Production projects preserved intact', `${prodProjectsAfter} vs ${prodProjectsBefore}`);

  // Re-seed to leave workspace with rich demonstration data ready for interactive user exploration
  store.seedDemoData();
  const finalDemoProjects = store.getState().projects.filter(p => String(p.id).startsWith('DEMO-')).length;
  assert(finalDemoProjects === 3, 'Workspace restored with 3 active demo projects for user testing');

  console.log('\n========================================================');
  console.log(`TOTAL TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log('========================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Test execution error:', err);
  process.exit(1);
});
