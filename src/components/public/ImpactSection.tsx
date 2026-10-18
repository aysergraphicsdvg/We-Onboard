import React from 'react';
import { Users, Store, ClipboardCheck, Building2 } from 'lucide-react';

export const ImpactSection: React.FC = () => {
  return (
    <section className="py-16 bg-[#02167F] text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 mb-2">
            <span className="h-0.5 w-6 bg-[#FFD014]"></span>
            <span className="text-[#FFD014] text-xs font-bold tracking-widest uppercase">
              OUR IMPACT
            </span>
            <span className="h-0.5 w-6 bg-[#FFD014]"></span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Real numbers. Real businesses.
          </h2>
        </div>

        {/* 4 Impact Counters */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
          
          <div className="bg-white/5 border border-white/10 rounded-xl p-6 text-center hover:bg-white/10 transition-colors">
            <div className="w-12 h-12 mx-auto rounded-xl bg-[#FFD014]/20 text-[#FFD014] flex items-center justify-center mb-4">
              <Users className="w-6 h-6" />
            </div>
            <strong className="text-3xl sm:text-4xl font-black text-white font-mono block">
              10,000+
            </strong>
            <span className="text-xs sm:text-sm text-slate-300 font-semibold mt-1 block">
              Riders & Workers
            </span>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-xl p-6 text-center hover:bg-white/10 transition-colors">
            <div className="w-12 h-12 mx-auto rounded-xl bg-[#FFD014]/20 text-[#FFD014] flex items-center justify-center mb-4">
              <Store className="w-6 h-6" />
            </div>
            <strong className="text-3xl sm:text-4xl font-black text-white font-mono block">
              5,000+
            </strong>
            <span className="text-xs sm:text-sm text-slate-300 font-semibold mt-1 block">
              Shops & Restaurants
            </span>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-xl p-6 text-center hover:bg-white/10 transition-colors">
            <div className="w-12 h-12 mx-auto rounded-xl bg-[#FFD014]/20 text-[#FFD014] flex items-center justify-center mb-4">
              <ClipboardCheck className="w-6 h-6" />
            </div>
            <strong className="text-3xl sm:text-4xl font-black text-white font-mono block">
              1,000+
            </strong>
            <span className="text-xs sm:text-sm text-slate-300 font-semibold mt-1 block">
              Field Audits & Surveys
            </span>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-xl p-6 text-center hover:bg-white/10 transition-colors">
            <div className="w-12 h-12 mx-auto rounded-xl bg-[#FFD014]/20 text-[#FFD014] flex items-center justify-center mb-4">
              <Building2 className="w-6 h-6" />
            </div>
            <strong className="text-3xl sm:text-4xl font-black text-white font-mono block">
              500+
            </strong>
            <span className="text-xs sm:text-sm text-slate-300 font-semibold mt-1 block">
              MSME & Franchise Support
            </span>
          </div>

        </div>

      </div>
    </section>
  );
};
