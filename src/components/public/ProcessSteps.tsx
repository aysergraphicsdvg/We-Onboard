import React from 'react';
import { PhoneCall, FileText, Users, LineChart, IndianRupee } from 'lucide-react';

export const ProcessSteps: React.FC = () => {
  const steps = [
    {
      num: '01',
      title: 'Tell us your goal',
      desc: 'A short call to understand volumes, cities and timelines.',
      icon: <PhoneCall className="w-5 h-5 text-[#02167F]" />
    },
    {
      num: '02',
      title: 'Get a clear plan',
      desc: 'Scope, price per activated unit and delivery timeline.',
      icon: <FileText className="w-5 h-5 text-[#02167F]" />
    },
    {
      num: '03',
      title: 'We deploy the team',
      desc: 'Verified managers, team leaders and field members start work.',
      icon: <Users className="w-5 h-5 text-[#02167F]" />
    },
    {
      num: '04',
      title: 'Track progress live',
      desc: 'Real-time dashboard, geo-proof and periodic audit reports.',
      icon: <LineChart className="w-5 h-5 text-[#02167F]" />
    },
    {
      num: '05',
      title: 'Pay for approved results',
      desc: 'You are billed strictly for activated, verified partners.',
      icon: <IndianRupee className="w-5 h-5 text-[#02167F]" />
    }
  ];

  return (
    <section className="py-20 bg-slate-50 border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="text-center max-w-2xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 mb-2">
            <span className="h-0.5 w-6 bg-[#02167F]"></span>
            <span className="text-[#02167F] text-xs font-bold tracking-widest uppercase">
              HOW IT WORKS
            </span>
            <span className="h-0.5 w-6 bg-[#02167F]"></span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-[#02167F] tracking-tight">
            A simple and transparent process
          </h2>
          <p className="text-slate-600 mt-2 text-base">
            From first scoping to field activation, every milestone is structured for accountability.
          </p>
        </div>

        {/* 5-Step Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6 relative">
          {steps.map((step, idx) => (
            <div
              key={idx}
              className="bg-white rounded-xl p-6 border border-slate-200 hover:border-[#02167F]/40 shadow-sm hover:shadow-md transition-all flex flex-col justify-between relative group"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 rounded-lg bg-[#FFD014]/20 border border-[#FFD014]/40 flex items-center justify-center">
                    {step.icon}
                  </div>
                  <span className="text-2xl font-black text-[#02167F]/20 group-hover:text-[#02167F]/40 transition-colors font-mono">
                    {step.num}
                  </span>
                </div>

                <h3 className="text-base font-bold text-[#02167F] mb-2">
                  {step.title}
                </h3>

                <p className="text-xs text-slate-600 leading-relaxed">
                  {step.desc}
                </p>
              </div>

              <div className="w-full h-1 bg-slate-100 rounded-full mt-6 overflow-hidden">
                <div 
                  className="bg-[#02167F] h-full rounded-full transition-all duration-300 group-hover:bg-[#FFD014]" 
                  style={{ width: `${(idx + 1) * 20}%` }}
                ></div>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
};
