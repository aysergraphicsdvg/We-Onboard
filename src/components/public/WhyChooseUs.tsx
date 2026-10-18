import React from 'react';
import { Target, Eye, ShieldCheck, Zap, Users, BarChart3, CheckCircle2, TrendingUp } from 'lucide-react';

export const WhyChooseUs: React.FC = () => {
  return (
    <section className="py-20 bg-white border-b border-slate-200" id="about-why">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Left Column: Value Proposition Points */}
          <div className="lg:col-span-6 space-y-8">
            <div>
              <div className="inline-flex items-center gap-2 mb-2">
                <span className="h-0.5 w-6 bg-[#02167F]"></span>
                <span className="text-[#02167F] text-xs font-bold tracking-widest uppercase">
                  WHY BUSINESSES CHOOSE US
                </span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-[#02167F] tracking-tight">
                Results you can trust.
              </h2>
              <p className="text-slate-600 mt-2 text-base">
                We remove the uncertainty from field operations with upfront milestones, real evidence and transparent operational governance.
              </p>
            </div>

            {/* 5 Points Grid */}
            <div className="space-y-4">
              <div className="flex items-start gap-4 p-3 rounded-xl hover:bg-slate-50 transition-colors">
                <div className="w-10 h-10 rounded-lg bg-[#FFD014]/20 border border-[#FFD014]/40 flex items-center justify-center shrink-0 text-[#02167F]">
                  <Target className="w-5 h-5 text-[#02167F]" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#02167F]">
                    Pay for results, not effort.
                  </h3>
                  <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                    Clear commercial models linked to activated riders, verified storefronts, and completed inspection checklists.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-3 rounded-xl hover:bg-slate-50 transition-colors">
                <div className="w-10 h-10 rounded-lg bg-sky-50 border border-sky-200 flex items-center justify-center shrink-0 text-[#02167F]">
                  <Eye className="w-5 h-5 text-[#02167F]" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#02167F]">
                    See everything live.
                  </h3>
                  <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                    Direct access to progress logs, geo-tagged photo evidence, timestamps and conversion audits in real-time.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-3 rounded-xl hover:bg-slate-50 transition-colors">
                <div className="w-10 h-10 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center shrink-0 text-emerald-800">
                  <ShieldCheck className="w-5 h-5 text-[#02167F]" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#02167F]">
                    Verified people and data.
                  </h3>
                  <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                    Every associate undergoes KYC identity validation, fraud checks and structured field protocol training.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-3 rounded-xl hover:bg-slate-50 transition-colors">
                <div className="w-10 h-10 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center shrink-0 text-amber-800">
                  <Zap className="w-5 h-5 text-[#02167F]" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#02167F]">
                    Fast start, most pilots in a few days.
                  </h3>
                  <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                    Skip lengthy recruiter cycles. We activate pre-vetted teams in targeted Bangalore zones in under 72 hours.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-3 rounded-xl hover:bg-slate-50 transition-colors">
                <div className="w-10 h-10 rounded-lg bg-indigo-50 border border-indigo-200 flex items-center justify-center shrink-0 text-indigo-800">
                  <Users className="w-5 h-5 text-[#02167F]" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#02167F]">
                    Local reach with trained field network.
                  </h3>
                  <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                    Deep corridor knowledge across Indiranagar, Whitefield, Koramangala, HSR and greater Bangalore.
                  </p>
                </div>
              </div>
            </div>

          </div>

          {/* Right Column: Illustrative Laptop Dashboard (Matching Mockup Screen) */}
          <div className="lg:col-span-6">
            <div className="relative mx-auto max-w-lg lg:max-w-none">
              
              {/* Laptop Shell Outer */}
              <div className="bg-slate-900 rounded-t-2xl p-3 sm:p-4 shadow-2xl border-4 border-slate-700">
                
                {/* Camera dot */}
                <div className="w-2 h-2 rounded-full bg-slate-600 mx-auto mb-2"></div>

                {/* Dashboard Screen */}
                <div className="bg-slate-50 rounded-lg p-4 sm:p-6 text-slate-900 border border-slate-200 font-sans">
                  
                  {/* Top Bar of Dashboard */}
                  <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                    <div className="flex items-center gap-2">
                      <div className="bg-[#FFD014] text-[#02167F] font-black text-xs px-2 py-0.5 rounded">
                        WO
                      </div>
                      <span className="text-xs font-bold text-[#02167F]">Project Dashboard</span>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-slate-500 font-mono">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                      <span>Bangalore Fleet Hub</span>
                    </div>
                  </div>

                  {/* 3 Real KPI Metric Boxes (Exact numbers from Mockup) */}
                  <div className="grid grid-cols-3 gap-3 my-4">
                    <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                      <span className="text-[11px] font-semibold text-slate-500 block">Assigned</span>
                      <strong className="text-lg sm:text-xl font-extrabold text-[#02167F] block font-mono">
                        2,458
                      </strong>
                      <span className="text-[10px] text-slate-400">Total units</span>
                    </div>

                    <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                      <span className="text-[11px] font-semibold text-slate-500 block">Completed</span>
                      <strong className="text-lg sm:text-xl font-extrabold text-emerald-600 block font-mono">
                        2,120
                      </strong>
                      <span className="text-[10px] text-emerald-600 font-semibold">✓ Verified</span>
                    </div>

                    <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                      <span className="text-[11px] font-semibold text-slate-500 block">Success Rate</span>
                      <strong className="text-lg sm:text-xl font-extrabold text-[#02167F] block font-mono">
                        85%
                      </strong>
                      <span className="text-[10px] text-sky-600 font-semibold">↑ On Target</span>
                    </div>
                  </div>

                  {/* Real-time Field Telemetry Bars */}
                  <div className="bg-white p-3 rounded-lg border border-slate-200 space-y-2 mb-3">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                      <span>Rider Onboarding Fleet — East Hub</span>
                      <span className="text-emerald-600 font-mono">88%</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div className="bg-emerald-500 h-full rounded-full" style={{ width: '88%' }}></div>
                    </div>

                    <div className="flex items-center justify-between text-xs font-bold text-slate-700 pt-1">
                      <span>Kirana POS Merchant Verification</span>
                      <span className="text-[#02167F] font-mono">76%</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div className="bg-[#02167F] h-full rounded-full" style={{ width: '76%' }}></div>
                    </div>
                  </div>

                  {/* Live Feed Item */}
                  <div className="flex items-center justify-between text-[11px] text-slate-600 bg-slate-100/70 px-3 py-1.5 rounded">
                    <span className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Task #102 verified in HSR Layout Sector 4</span>
                    </span>
                    <span className="font-mono text-slate-400">Just now</span>
                  </div>

                </div>

              </div>

              {/* Laptop Base Bottom Lip */}
              <div className="bg-slate-700 h-3 w-[106%] -ml-[3%] rounded-b-xl shadow-lg flex justify-center">
                <div className="bg-slate-500 w-16 h-1 rounded-b"></div>
              </div>

            </div>
          </div>

        </div>
      </div>
    </section>
  );
};
