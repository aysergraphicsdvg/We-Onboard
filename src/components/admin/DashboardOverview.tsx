import React from 'react';
import { 
  MessageSquareText, 
  Users, 
  UserCheck, 
  FolderKanban, 
  Building2, 
  Handshake, 
  Clock, 
  CheckCircle2, 
  TrendingUp, 
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  Sparkles
} from 'lucide-react';
import { store } from '../../services/store';

interface DashboardOverviewProps {
  onSelectTab: (tab: string) => void;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({ onSelectTab }) => {
  const state = store.getState();
  
  // 10 Real Metric Calculations from Database
  const totalEnquiries = state.enquiries.length;
  const newEnquiries = state.enquiries.filter((e) => e.status === 'New').length;
  const convertedEnquiries = state.enquiries.filter((e) => e.status === 'Converted').length;
  
  const totalFreelancers = state.freelancers.length;
  const pendingFreelancerVerification = state.freelancers.filter((f) => 
    f.status === 'Submitted' || f.status === 'Under Review' || f.status === 'Verification Pending'
  ).length;
  const approvedFreelancers = state.freelancers.filter((f) => 
    f.status === 'Approved' || f.status === 'Active' || f.status === 'Ready for Assignment'
  ).length;

  const activeProjects = state.projects.filter((p) => p.status === 'Active').length;
  const msmeRequests = state.msmeRequests.length;
  const franchiseLeads = state.franchiseLeads.length;
  const tasksAwaitingReview = state.tasks.filter((t) => t.status === 'Submitted').length;

  const conversionRate = totalEnquiries > 0 ? Math.round((convertedEnquiries / totalEnquiries) * 100) : 0;

  const summaryCards = [
    { title: 'Total Enquiries', count: totalEnquiries, sub: 'All inbound prospect leads', color: 'bg-blue-50 border-blue-200 text-[#02167F]', icon: <MessageSquareText className="w-5 h-5 text-[#02167F]" />, tab: 'enquiries' },
    { title: 'New Enquiries', count: newEnquiries, sub: 'Awaiting initial staff contact', color: 'bg-amber-50 border-amber-200 text-amber-900 font-bold', icon: <Clock className="w-5 h-5 text-amber-700" />, tab: 'enquiries' },
    { title: 'Converted Clients', count: convertedEnquiries, sub: `${conversionRate}% conversion rate`, color: 'bg-emerald-50 border-emerald-200 text-emerald-900', icon: <CheckCircle2 className="w-5 h-5 text-emerald-700" />, tab: 'clients' },
    { title: 'Freelancer Registrations', count: totalFreelancers, sub: 'Total candidate pool', color: 'bg-purple-50 border-purple-200 text-purple-900', icon: <Users className="w-5 h-5 text-purple-700" />, tab: 'freelancers' },
    { title: 'Pending Verification', count: pendingFreelancerVerification, sub: 'KYC & Aadhaar checks', color: 'bg-orange-50 border-orange-200 text-orange-900', icon: <AlertCircle className="w-5 h-5 text-orange-700" />, tab: 'freelancers' },
    { title: 'Approved Freelancers', count: approvedFreelancers, sub: 'Active & ready for deploy', color: 'bg-teal-50 border-teal-200 text-teal-900', icon: <UserCheck className="w-5 h-5 text-teal-700" />, tab: 'freelancers' },
    { title: 'Active Field Projects', count: activeProjects, sub: 'Bangalore hubs in execution', color: 'bg-indigo-50 border-indigo-200 text-indigo-900', icon: <FolderKanban className="w-5 h-5 text-indigo-700" />, tab: 'projects' },
    { title: 'MSME Support Desk', count: msmeRequests, sub: 'Udyam, GST & FSSAI cases', color: 'bg-sky-50 border-sky-200 text-sky-900', icon: <Building2 className="w-5 h-5 text-sky-700" />, tab: 'msme' },
    { title: 'Franchise Leads', count: franchiseLeads, sub: 'Territory partner prospects', color: 'bg-yellow-50 border-yellow-200 text-yellow-900', icon: <Handshake className="w-5 h-5 text-yellow-800" />, tab: 'clients' },
    { title: 'Tasks Awaiting Review', count: tasksAwaitingReview, sub: 'Evidence submitted by field', color: 'bg-rose-50 border-rose-200 text-rose-900 font-bold', icon: <ShieldCheck className="w-5 h-5 text-rose-700" />, tab: 'projects' },
  ];

  return (
    <div className="space-y-8 animate-in fade-in">
      
      {/* Demonstration Dataset & Multi-Role Governance Banner */}
      <div className="bg-slate-900 text-white rounded-2xl p-5 border border-slate-800 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="bg-[#FFD014] text-[#02167F] font-black text-[10px] px-2 py-0.5 rounded uppercase tracking-wider">
              DEMO DATASET ACTIVE
            </span>
            <span className="text-xs font-bold text-slate-200">
              3 Field Projects &bull; 4 Test Associates &bull; 12 Realistic Tasks
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Retail Merchant Onboarding, Restaurant Hygiene Audit, and Market Mystery Shopping workflows active with verified 70/20/10 double-entry ledger journals.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={() => {
              const res = store.seedDemoData();
              alert(res.message);
            }}
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer"
          >
            Re-seed Demo Data
          </button>
          <button
            onClick={() => {
              if (confirm('Are you sure you want to purge synthetic demo records? Legitimate production data will remain preserved.')) {
                const res = store.resetDemoData();
                alert(res.message);
              }
            }}
            className="bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/40 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer"
          >
            Purge Demo Data
          </button>
        </div>
      </div>

      {/* 10 Summary Cards Grid */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-extrabold text-[#02167F] tracking-tight">
            Real-Time Operations Counter
          </h2>
          <span className="text-xs text-slate-500 font-medium">
            Click any metric card to jump to that module
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
          {summaryCards.map((card, idx) => (
            <div
              key={idx}
              onClick={() => onSelectTab(card.tab)}
              className={`p-4 rounded-xl border shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between ${card.color} group`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold truncate pr-1">{card.title}</span>
                <div className="p-1.5 rounded-lg bg-white/70 group-hover:scale-110 transition-transform">
                  {card.icon}
                </div>
              </div>

              <div>
                <strong className="text-2xl sm:text-3xl font-black font-mono block">
                  {card.count}
                </strong>
                <span className="text-[10px] text-slate-600 block mt-1 truncate">
                  {card.sub}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Analytics & Distribution Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Service Category Demand & Enquiries Pipeline */}
        <div className="lg:col-span-7 bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-[#02167F]">
              Enquiries by Service Category
            </h3>
            <span className="text-xs font-mono bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-bold">
              Database Distribution
            </span>
          </div>

          <div className="space-y-3">
            {[
              { label: 'Rider & Gig Worker Onboarding', count: state.enquiries.filter(e => e.serviceRequired.includes('Rider')).length, color: 'bg-[#02167F]' },
              { label: 'Merchant & Restaurant Onboarding', count: state.enquiries.filter(e => e.serviceRequired.includes('Merchant')).length, color: 'bg-sky-600' },
              { label: 'MSME Registration Support', count: state.enquiries.filter(e => e.serviceRequired.includes('MSME')).length, color: 'bg-[#FFD014]' },
              { label: 'Franchise & Dealership Development', count: state.enquiries.filter(e => e.serviceRequired.includes('Franchise')).length, color: 'bg-emerald-600' },
              { label: 'Field Audits & Other', count: state.enquiries.filter(e => !e.serviceRequired.includes('Rider') && !e.serviceRequired.includes('Merchant') && !e.serviceRequired.includes('MSME') && !e.serviceRequired.includes('Franchise')).length, color: 'bg-purple-600' },
            ].map((item, idx) => {
              const pct = totalEnquiries > 0 ? Math.round((item.count / totalEnquiries) * 100) : 0;
              return (
                <div key={idx} className="space-y-1 text-xs">
                  <div className="flex justify-between font-semibold text-slate-700">
                    <span>{item.label}</span>
                    <span className="font-mono text-slate-900">{item.count} leads ({pct}%)</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                    <div className={`${item.color} h-full rounded-full transition-all duration-500`} style={{ width: `${Math.max(pct, 5)}%` }}></div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Recent Inbound Leads */}
          <div className="pt-4 border-t border-slate-100">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Recent Inbound Enquiries
              </h4>
              <button onClick={() => onSelectTab('enquiries')} className="text-xs text-[#02167F] font-bold hover:underline flex items-center gap-1">
                <span>View All</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            <div className="space-y-2">
              {state.enquiries.slice(0, 3).map((e) => (
                <div key={e.id} className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                  <div>
                    <strong className="text-slate-900 block font-bold">{e.fullName} &bull; {e.companyName || 'Individual'}</strong>
                    <span className="text-slate-500">{e.serviceRequired} &bull; {e.city}</span>
                  </div>
                  <div className="text-right">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      e.status === 'New' ? 'bg-amber-100 text-amber-800' :
                      e.status === 'Qualified' ? 'bg-blue-100 text-blue-800' :
                      e.status === 'Converted' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'
                    }`}>
                      {e.status}
                    </span>
                    <span className="font-mono text-[9px] text-slate-400 block mt-0.5">{e.submittedAt}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Active Projects & Field Action Queue */}
        <div className="lg:col-span-5 bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-extrabold text-[#02167F]">
                Active Project Milestones
              </h3>
              <button onClick={() => onSelectTab('projects')} className="text-xs text-[#02167F] font-bold hover:underline">
                Manage Projects &rarr;
              </button>
            </div>

            <div className="space-y-4">
              {state.projects.map((proj) => {
                const pct = Math.round((proj.completedUnits / proj.targetUnits) * 100);
                return (
                  <div key={proj.id} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <strong className="text-slate-900 font-bold text-xs truncate max-w-[200px]">
                        {proj.name}
                      </strong>
                      <span className="font-mono text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        {pct}% Complete
                      </span>
                    </div>

                    <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                      <div className="bg-emerald-500 h-full rounded-full transition-all" style={{ width: `${pct}%` }}></div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono">
                      <span>{proj.completedUnits} / {proj.targetUnits} units</span>
                      <span>Target: {proj.endDate}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Pending Tasks Evidence Review Callout */}
          <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 text-xs space-y-2">
            <div className="flex items-center gap-2 text-rose-900 font-bold">
              <AlertCircle className="w-4 h-4 text-rose-600" />
              <span>{tasksAwaitingReview} Field Task Evidences Awaiting Review</span>
            </div>
            <p className="text-rose-800 leading-relaxed text-[11px]">
              Freelancers have submitted geo-tagged storefront photos and onboarded rider documents for review.
            </p>
            <button
              onClick={() => onSelectTab('projects')}
              className="bg-rose-700 hover:bg-rose-800 text-white font-bold px-3 py-1.5 rounded-lg text-xs transition-colors"
            >
              Open Task Review Queue &rarr;
            </button>
          </div>

          {/* Quick Hero Banner PNG Customizer Card */}
          <div className="bg-[#02167F] text-white rounded-xl p-4 text-xs space-y-2 border border-blue-900 shadow-xs">
            <div className="flex items-center gap-2 font-bold text-[#FFD014]">
              <Sparkles className="w-4 h-4 text-[#FFD014]" />
              <span>Homepage Hero Banner Graphic</span>
            </div>
            <p className="text-slate-200 leading-relaxed text-[11px]">
              Upload transparent PNG illustrations (rider, merchant, field surveyor) anchored directly to the bottom with natural aspect ratio scaling.
            </p>
            <button
              onClick={() => onSelectTab('cms')}
              className="bg-[#FFD014] hover:bg-[#e6bb0d] text-[#02167F] font-bold px-3 py-1.5 rounded-lg text-xs transition-colors inline-flex items-center gap-1"
            >
              <span>Manage Hero Graphics &rarr;</span>
            </button>
          </div>

        </div>

      </div>

    </div>
  );
};
