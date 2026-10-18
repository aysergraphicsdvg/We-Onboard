import React from 'react';
import { 
  ArrowRight, 
  Utensils, 
  Zap, 
  ShoppingBag, 
  CreditCard, 
  Network, 
  Bike, 
  Store, 
  ShieldCheck 
} from 'lucide-react';

interface PilotSectionProps {
  onOpenPilotModal: () => void;
}

export const PilotSection: React.FC<PilotSectionProps> = ({ onOpenPilotModal }) => {
  const sectors = [
    { key: 'food', label: 'Food Delivery', icon: <Utensils className="w-4 h-4 text-[#02167F]" /> },
    { key: 'qcommerce', label: 'Quick Commerce', icon: <Zap className="w-4 h-4 text-[#02167F]" /> },
    { key: 'ecommerce', label: 'E-Commerce Logistics', icon: <ShoppingBag className="w-4 h-4 text-[#02167F]" /> },
    { key: 'fintech', label: 'Fintech & Soundbox', icon: <CreditCard className="w-4 h-4 text-[#02167F]" /> },
    { key: 'ondc', label: 'ONDC Network', icon: <Network className="w-4 h-4 text-[#02167F]" /> },
    { key: 'mobility', label: 'Mobility & EV Fleets', icon: <Bike className="w-4 h-4 text-[#02167F]" /> },
    { key: 'retail', label: 'Retail & FMCG', icon: <Store className="w-4 h-4 text-[#02167F]" /> },
    { key: 'kyc', label: 'Banking & Field KYC', icon: <ShieldCheck className="w-4 h-4 text-[#02167F]" /> },
  ];

  return (
    <section className="py-16 bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        
        {/* Pilot CTA Box */}
        <div className="bg-gradient-to-r from-blue-50 to-amber-50/50 border border-blue-200 rounded-2xl p-8 sm:p-10 flex flex-col md:flex-row items-center justify-between gap-8 shadow-sm">
          <div className="space-y-2 text-center md:text-left">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#02167F] tracking-tight">
              Need 100 riders, 500 shops or 50 dealers?
            </h2>
            <p className="text-slate-600 text-base max-w-xl">
              Start with a small pilot. See the verified ground results. Then scale with full confidence.
            </p>
          </div>

          <button
            onClick={onOpenPilotModal}
            className="shrink-0 bg-[#FFD014] hover:bg-[#e6bb0d] text-[#02167F] font-bold px-7 py-4 rounded-xl text-sm transition-all shadow-md hover:shadow-lg flex items-center gap-2 group"
          >
            <span>Request a Free Pilot Plan</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        {/* Platform Types Ecosystem Bar */}
        <div className="pt-4 text-center">
          <div className="inline-flex items-center gap-2 mb-6">
            <span className="h-0.5 w-6 bg-[#02167F]"></span>
            <span className="text-[#02167F] text-xs font-bold tracking-widest uppercase">
              BUILT TO SUPPORT PLATFORMS & BRANDS
            </span>
            <span className="h-0.5 w-6 bg-[#02167F]"></span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 items-center">
            {sectors.map((s) => (
              <div 
                key={s.key}
                className="bg-slate-50 border border-slate-200/90 hover:border-[#02167F]/40 hover:bg-blue-50/40 rounded-xl py-3 px-2 flex flex-col items-center justify-center gap-1.5 transition-all text-center group shadow-2xs"
              >
                <div className="p-1 rounded-md bg-white border border-slate-200 group-hover:border-blue-300 transition-colors">
                  {s.icon}
                </div>
                <span className="font-bold text-xs tracking-tight text-slate-800 leading-tight">
                  {s.label}
                </span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </section>
  );
};
