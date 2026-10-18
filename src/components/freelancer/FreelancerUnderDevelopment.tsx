import React from 'react';
import { 
  Construction, 
  ArrowLeft, 
  ArrowRight, 
  CheckCircle2, 
  Clock, 
  ShieldCheck, 
  UserPlus, 
  Sparkles, 
  MapPin, 
  IndianRupee, 
  Award,
  Smartphone,
  CalendarCheck
} from 'lucide-react';

interface FreelancerUnderDevelopmentProps {
  onBackToWebsite: () => void;
  onOpenRegister: () => void;
}

export const FreelancerUnderDevelopment: React.FC<FreelancerUnderDevelopmentProps> = ({
  onBackToWebsite,
  onOpenRegister,
}) => {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto w-full space-y-8">
        
        {/* Navigation Bar */}
        <div className="flex items-center justify-between">
          <button
            onClick={onBackToWebsite}
            className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-[#02167F] bg-white border border-slate-200 px-4 py-2 rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 text-[#02167F]" />
            <span>Back to We Onboard Website</span>
          </button>

          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-amber-100 text-amber-900 border border-amber-300">
            <Clock className="w-3.5 h-3.5 text-amber-700 animate-pulse" />
            <span>COMING SOON</span>
          </span>
        </div>

        {/* Main Hero Card */}
        <div className="bg-white rounded-3xl p-8 sm:p-12 border border-slate-200 shadow-xl text-center space-y-6 relative overflow-hidden">
          <div className="w-20 h-20 mx-auto rounded-3xl bg-blue-50 text-[#02167F] flex items-center justify-center border-2 border-blue-100 shadow-inner">
            <Construction className="w-10 h-10 text-[#02167F]" />
          </div>

          <div className="space-y-3 max-w-xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-[#FFD014]/30 text-[#02167F]">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Portal Upgrade in Progress</span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-extrabold text-[#02167F] tracking-tight">
              Freelancer Portal is Under Development
            </h1>

            <p className="text-slate-600 text-base sm:text-lg leading-relaxed">
              We are currently engineering powerful new self-service capabilities for our ground workforce. It will be available soon!
            </p>
          </div>

          {/* Registration Notice Box */}
          <div className="bg-gradient-to-r from-blue-50 to-amber-50/70 border border-blue-200 rounded-2xl p-6 text-left max-w-xl mx-auto space-y-3">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <strong className="text-sm font-bold text-slate-900 block">
                  Freelancer Registration is Open & Active!
                </strong>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  You can register your profile right now. Our operations coordinators will review your documents, conduct verification, and allocate your priority login credentials before regional assignments launch.
                </p>
              </div>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
              <button
                onClick={onOpenRegister}
                className="w-full sm:w-auto bg-[#FFD014] hover:bg-[#e6bb0d] text-[#02167F] font-extrabold px-6 py-3 rounded-xl text-xs flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all cursor-pointer"
              >
                <UserPlus className="w-4 h-4" />
                <span>Register as Freelancer Now</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                onClick={onBackToWebsite}
                className="w-full sm:w-auto bg-white hover:bg-slate-50 text-slate-700 font-bold px-5 py-3 rounded-xl text-xs border border-slate-200 transition-colors cursor-pointer"
              >
                Explore Services & Roles
              </button>
            </div>
          </div>

          {/* Feature Teasers */}
          <div className="pt-6 border-t border-slate-100 text-left">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-4 text-center">
              What We Are Building for Freelancers:
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-2">
                <div className="w-8 h-8 rounded-lg bg-[#02167F] text-[#FFD014] flex items-center justify-center">
                  <MapPin className="w-4 h-4" />
                </div>
                <strong className="text-xs font-bold text-slate-800 block">Hyperlocal Task Dispatch</strong>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Accept onboarding and audit tasks near your pin code with clear target units.
                </p>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-2">
                <div className="w-8 h-8 rounded-lg bg-[#02167F] text-[#FFD014] flex items-center justify-center">
                  <IndianRupee className="w-4 h-4" />
                </div>
                <strong className="text-xs font-bold text-slate-800 block">Transparent Payout Ledger</strong>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Track approved verification units and weekly bank disbursements with zero deductions.
                </p>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-2">
                <div className="w-8 h-8 rounded-lg bg-[#02167F] text-[#FFD014] flex items-center justify-center">
                  <Award className="w-4 h-4" />
                </div>
                <strong className="text-xs font-bold text-slate-800 block">Digital ID & Certifications</strong>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Download official field auditor badge and complete quick digital brand training modules.
                </p>
              </div>
            </div>
          </div>

          {/* Trust Banner */}
          <div className="pt-4 flex items-center justify-center gap-2 text-xs text-slate-500 font-medium">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Zero Joining Fee Policy — We Onboard never charges candidates any fee.</span>
          </div>

        </div>

        {/* Footer */}
        <div className="text-center text-xs text-slate-400">
          <p>© 2026 We Onboard. Operations Headquarters: Indiranagar, Bangalore.</p>
          <p className="mt-1">For urgent queries, reach out at <span className="text-[#02167F] font-bold">mail@weonboard.in</span> or +91 98450 12345</p>
        </div>

      </div>
    </div>
  );
};
