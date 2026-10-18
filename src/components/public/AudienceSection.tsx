import React from 'react';
import { ArrowRight, Building, UserPlus, Award, CheckCircle } from 'lucide-react';

interface AudienceSectionProps {
  onOpenBusinessEnquiry: () => void;
  onOpenFreelancerRegister: () => void;
  onOpenMsmeModal: () => void;
}

export const AudienceSection: React.FC<AudienceSectionProps> = ({
  onOpenBusinessEnquiry,
  onOpenFreelancerRegister,
  onOpenMsmeModal,
}) => {
  return (
    <section className="py-20 bg-white border-b border-slate-200" id="businesses">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* Card 1: For Businesses */}
          <div className="bg-[#02167F] text-white rounded-2xl p-8 flex flex-col justify-between shadow-xl relative overflow-hidden group">
            <div 
              className="absolute -right-12 -bottom-12 w-48 h-48 bg-white/5 rounded-full pointer-events-none group-hover:scale-125 transition-transform duration-500"
            />
            
            <div className="relative z-10">
              <div className="inline-flex items-center gap-1.5 text-xs font-black tracking-wider text-[#FFD014] uppercase mb-4 bg-white/10 px-3 py-1 rounded-full">
                <Building className="w-3.5 h-3.5" />
                <span>FOR BUSINESSES</span>
              </div>

              <h3 className="text-2xl sm:text-3xl font-extrabold tracking-tight mb-4 leading-tight">
                Scale your supply without extra overhead.
              </h3>

              <p className="text-slate-200 text-sm leading-relaxed mb-6">
                A dedicated project manager, verified field team, live dashboard and pay-per-activation commercial model.
              </p>

              <div className="space-y-2 mb-8 text-xs text-slate-300">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-[#FFD014]" />
                  <span>Onboard riders, merchants & franchise partners</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-[#FFD014]" />
                  <span>Transparent milestone-based invoicing</span>
                </div>
              </div>
            </div>

            <div className="relative z-10 pt-4 border-t border-white/15">
              <button
                onClick={onOpenBusinessEnquiry}
                className="w-full bg-[#FFD014] hover:bg-[#e6bb0d] text-[#02167F] font-bold py-3.5 px-4 rounded-xl text-sm transition-all flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
              >
                <span>Book a 15-Minute Call</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Card 2: Join as a Freelancer */}
          <div className="bg-amber-500/10 border-2 border-[#FFD014] rounded-2xl p-8 flex flex-col justify-between shadow-lg relative overflow-hidden group" id="freelancers">
            <div 
              className="absolute -right-12 -bottom-12 w-48 h-48 bg-[#FFD014]/20 rounded-full pointer-events-none group-hover:scale-125 transition-transform duration-500"
            />

            <div className="relative z-10">
              <div className="inline-flex items-center gap-1.5 text-xs font-black tracking-wider text-[#02167F] uppercase mb-4 bg-[#FFD014] px-3 py-1 rounded-full">
                <UserPlus className="w-3.5 h-3.5" />
                <span>JOIN AS A FREELANCER</span>
              </div>

              <h3 className="text-2xl sm:text-3xl font-extrabold text-[#02167F] tracking-tight mb-4 leading-tight">
                Earn on your terms. Grow with every project.
              </h3>

              <p className="text-slate-700 text-sm leading-relaxed mb-6 font-medium">
                Choose projects, get paid fast, free training and clear growth path from Field Executive to Team Leader. No joining fee, ever.
              </p>

              <div className="space-y-2 mb-8 text-xs text-slate-700 font-semibold">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  <span>Zero joining fees or hidden security deposit</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  <span>Direct weekly bank payout for approved tasks</span>
                </div>
              </div>
            </div>

            <div className="relative z-10 pt-4 border-t border-amber-300">
              <button
                onClick={onOpenFreelancerRegister}
                className="w-full bg-[#02167F] hover:bg-[#031d99] text-[#FFD014] font-bold py-3.5 px-4 rounded-xl text-sm transition-all flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
              >
                <span>Register Now</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Card 3: Government Departments & MSME Nodal Agencies Desk */}
          <div className="bg-slate-50 border border-slate-300 rounded-2xl p-8 flex flex-col justify-between shadow-lg relative overflow-hidden group" id="msme">
            <div 
              className="absolute -right-12 -bottom-12 w-48 h-48 bg-slate-200/50 rounded-full pointer-events-none group-hover:scale-125 transition-transform duration-500"
            />

            <div className="relative z-10">
              <div className="inline-flex items-center gap-1.5 text-xs font-black tracking-wider text-[#02167F] uppercase mb-4 bg-slate-200 px-3 py-1 rounded-full">
                <Award className="w-3.5 h-3.5 text-[#02167F]" />
                <span>GOVERNMENT & AGENCY DESK</span>
              </div>

              <h3 className="text-2xl sm:text-3xl font-extrabold text-[#02167F] tracking-tight mb-4 leading-tight">
                Field operations partner for Government Departments & Agencies.
              </h3>

              <p className="text-slate-600 text-sm leading-relaxed mb-6">
                Execution partner for State Nodal Departments, PSUs, and implementation agencies. We deliver on-ground mobilization for Udyam, PM Vishwakarma, ONDC MSME onboarding, cluster enumerations, and district compliance drives.
              </p>

              <div className="space-y-2 mb-8 text-xs text-slate-700">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>On-ground scheme rollout & merchant enumeration</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Geo-tagged evidence, audit trails & live department dashboards</span>
                </div>
              </div>
            </div>

            <div className="relative z-10 pt-4 border-t border-slate-200">
              <button
                onClick={onOpenMsmeModal}
                className="w-full bg-[#02167F] hover:bg-[#031d99] text-[#FFD014] font-bold py-3.5 px-4 rounded-xl text-sm transition-all flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
              >
                <span>Partner with Govt Operations Desk</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

        </div>

      </div>
    </section>
  );
};
