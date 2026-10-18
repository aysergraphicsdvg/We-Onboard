import React, { useState } from 'react';
import { X, CheckCircle2, ArrowRight, Zap, MessageSquare } from 'lucide-react';
import { store } from '../../services/store';

interface PilotPlanModalProps {
  onClose: () => void;
}

export const PilotPlanModal: React.FC<PilotPlanModalProps> = ({ onClose }) => {
  const [fullName, setFullName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [phone, setPhone] = useState('');
  const [targetService, setTargetService] = useState('Rider and worker onboarding');
  const [targetVolume, setTargetVolume] = useState('100 Riders / Workers');
  const [cityCorridors, setCityCorridors] = useState('Indiranagar & Koramangala');
  const [timeline, setTimeline] = useState('Within 1-2 weeks');

  const [submittedRef, setSubmittedRef] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !phone || !companyName) {
      alert('Please fill your name, company, and phone number.');
      return;
    }

    const created = store.addEnquiry({
      fullName,
      companyName,
      phone,
      email: `${fullName.toLowerCase().replace(/\s+/g, '')}@${companyName.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`,
      enquiryType: 'Business',
      city: 'Bengaluru',
      serviceRequired: targetService,
      message: `FREE PILOT PLAN REQUEST: Target volume of ${targetVolume} in ${cityCorridors}. Timeline: ${timeline}.`,
      consent: true,
      source: 'Free Pilot Plan Modal CTA'
    });

    setSubmittedRef(created.id);
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#02167F]/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 sm:p-8 relative shadow-2xl border border-slate-200 animate-in zoom-in-95">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-700 rounded-full"
        >
          <X className="w-5 h-5" />
        </button>

        {submittedRef ? (
          <div className="text-center py-6 space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h3 className="text-2xl font-extrabold text-[#02167F]">
              Pilot Plan Requested!
            </h3>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 max-w-sm mx-auto text-center">
              <span className="text-xs text-slate-500 font-bold uppercase tracking-wider block">
                Pilot Dossier Reference
              </span>
              <strong className="text-2xl font-mono text-[#02167F] font-black block mt-1">
                {submittedRef}
              </strong>
              <p className="text-xs text-slate-600 mt-2">
                Our Bangalore field leadership will structure a customized pilot milestone proposal for {companyName}.
              </p>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row gap-2 justify-center">
              <a
                href={`https://wa.me/919611109490?text=${encodeURIComponent(
                  `Hi We Onboard, I requested a Pilot Plan [${submittedRef}] for ${companyName} (${targetVolume}).`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-[#25D366] hover:bg-[#20ba59] text-white font-bold px-5 py-2.5 rounded-lg text-xs flex items-center justify-center gap-1.5"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Discuss on WhatsApp</span>
              </a>

              <button
                onClick={onClose}
                className="bg-[#02167F] text-white font-bold px-5 py-2.5 rounded-lg text-xs"
              >
                Close
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100">
              <div className="w-9 h-9 rounded-lg bg-[#FFD014] text-[#02167F] flex items-center justify-center">
                <Zap className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xl font-extrabold text-[#02167F]">
                  Request a Free Pilot Plan
                </h3>
                <p className="text-xs text-slate-500">
                  Test We Onboard's field execution with zero upfront retainer.
                </p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Your Company or Brand Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="e.g. SpeedDash Logistics"
                className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Contact Person <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Full name"
                  className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Mobile / WhatsApp <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98450 XXXXX"
                  className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Service Type</label>
                <select
                  value={targetService}
                  onChange={(e) => setTargetService(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs bg-white"
                >
                  <option value="Rider and worker onboarding">Rider & Worker Onboarding</option>
                  <option value="Merchant and restaurant onboarding">Merchant & POS Acquisition</option>
                  <option value="Field audits and surveys">Field Audits & Quality Surveys</option>
                  <option value="Franchise and dealership development">Franchise & Dealer Development</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Target Volume</label>
                <select
                  value={targetVolume}
                  onChange={(e) => setTargetVolume(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs bg-white"
                >
                  <option value="50–100 Units (Micro Pilot)">50–100 Units (Micro Pilot)</option>
                  <option value="100–250 Units (Standard Pilot)">100–250 Units (Standard Pilot)</option>
                  <option value="500+ Units (Corridor Expansion)">500+ Units (Corridor Expansion)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Target Bangalore Zones</label>
                <input
                  type="text"
                  value={cityCorridors}
                  onChange={(e) => setCityCorridors(e.target.value)}
                  placeholder="e.g. Indiranagar, Whitefield"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Desired Launch</label>
                <select
                  value={timeline}
                  onChange={(e) => setTimeline(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs bg-white"
                >
                  <option value="Immediate (< 7 Days)">Immediate (&lt; 7 Days)</option>
                  <option value="Within 1-2 weeks">Within 1-2 weeks</option>
                  <option value="Next Month">Next Month</option>
                </select>
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="bg-[#FFD014] hover:bg-[#e6bb0d] text-[#02167F] font-extrabold px-6 py-2.5 rounded-lg text-xs flex items-center gap-1.5 shadow"
              >
                <span>Request Custom Pilot Scope</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
