import React, { useState } from 'react';
import { X, CheckCircle2, Building2, ArrowRight } from 'lucide-react';
import { store } from '../../services/store';
import { api } from '../../services/api';

interface MsmeRequestModalProps {
  onClose: () => void;
}

export const MsmeRequestModal: React.FC<MsmeRequestModalProps> = ({ onClose }) => {
  const [businessName, setBusinessName] = useState('');
  const [applicantName, setApplicantName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [city, setCity] = useState('Bengaluru');
  const [state, setState] = useState('Karnataka');
  const [category, setCategory] = useState<'Micro' | 'Small' | 'Medium' | 'Startup' | 'Proprietorship'>('Micro');
  const [stage, setStage] = useState<'Ideation' | 'Operating < 1 Year' | '1-3 Years' | '3+ Years'>('1-3 Years');
  const [selectedServices, setSelectedServices] = useState<string[]>(['Udyam registration assistance']);
  const [description, setDescription] = useState('');
  const [submittedId, setSubmittedId] = useState<string | null>(null);

  const availableServices = [
    'Udyam registration assistance',
    'GST assistance',
    'FSSAI assistance',
    'Shop and trade licence guidance',
    'GeM seller onboarding',
    'ONDC seller onboarding',
    'Startup India / DPIIT guidance',
    'ISO / ZED / BIS certification support',
    'Compliance reminders'
  ];

  const toggleService = (srv: string) => {
    if (selectedServices.includes(srv)) {
      setSelectedServices(selectedServices.filter((s) => s !== srv));
    } else {
      setSelectedServices([...selectedServices, srv]);
    }
  };

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessName || !applicantName || !phone) {
      alert('Please fill business name, applicant name, and phone number.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.submitMsmeRequest({
        business_name: businessName,
        applicant_name: applicantName,
        phone,
        email: email || 'contact@msme.in',
        city,
        state,
        category,
        stage,
        requested_services: selectedServices.length ? selectedServices : ['Udyam registration assistance'],
        description: description || 'Guidance requested for business expansion registrations.'
      });

      if (res.success && res.reference_id) {
        setSubmittedId(res.reference_id);
      } else {
        alert(res.error || 'Failed to submit proposal request. Please try again.');
      }
    } catch (err) {
      console.error(err);
      alert('Error submitting request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#02167F]/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-6 sm:p-8 max-h-[90vh] overflow-y-auto relative shadow-2xl border border-slate-200 animate-in zoom-in-95">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-700 rounded-full"
        >
          <X className="w-5 h-5" />
        </button>

        {submittedId ? (
          <div className="text-center py-6 space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h3 className="text-2xl font-extrabold text-[#02167F]">
              Government Operations Proposal Logged!
            </h3>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 max-w-sm mx-auto text-center">
              <span className="text-xs text-slate-500 font-bold uppercase tracking-wider block">
                Official Department Reference ID
              </span>
              <strong className="text-2xl font-mono text-[#02167F] font-black block mt-1">
                {submittedId}
              </strong>
              <p className="text-xs text-slate-600 mt-2">
                Our State Operations Director will connect directly with your nodal office to discuss scope, timeline, and deployment schedules.
              </p>
            </div>
            <button
              onClick={onClose}
              className="bg-[#02167F] text-[#FFD014] font-bold px-6 py-2.5 rounded-lg text-xs"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
              <div className="w-10 h-10 rounded-xl bg-[#02167F] text-[#FFD014] flex items-center justify-center font-bold">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xl font-extrabold text-[#02167F]">
                  Government & Implementing Agency Desk
                </h3>
                <p className="text-xs text-slate-500">
                  Dedicated operations partner for State Nodal Departments, PSUs, and ground implementation agencies.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Department / Agency / Organization Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="e.g. Karnataka MSME Directorate / Cluster Agency"
                  className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nodal Officer / Representative Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={applicantName}
                  onChange={(e) => setApplicantName(e.target.value)}
                  placeholder="Official name and designation"
                  className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Official Contact Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98450 XXXXX"
                  className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Official Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="officer@department.gov.in or agency@domain.org"
                  className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Entity Type</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs bg-white font-medium"
                >
                  <option value="Micro">State Nodal Department</option>
                  <option value="Small">District Industries Centre (DIC)</option>
                  <option value="Medium">PSU / Development Authority</option>
                  <option value="Startup">Implementing Partner / NGO</option>
                  <option value="Proprietorship">Trade Association / Chamber</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Target District(s)</label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="e.g. Bangalore Urban & Rural"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Timeline</label>
                <select
                  value={stage}
                  onChange={(e) => setStage(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs bg-white"
                >
                  <option value="Ideation">Immediate (Within 15 Days)</option>
                  <option value="Operating < 1 Year">Next 30-60 Days</option>
                  <option value="1-3 Years">Upcoming Fiscal Quarter</option>
                  <option value="3+ Years">Annual RFP / Tender</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">
                Scope of Field Operations Needed (Select all that apply)
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {[
                  'Udyam & PM Vishwakarma Field Mobilization',
                  'ONDC MSME / Artisan Seller Onboarding',
                  'GeM Portal Merchant Enablement',
                  'District Cluster Survey & Geo-Tagged Enumeration',
                  'Retail Trade & FSSAI Licensing Drives',
                  'Field KYC & Document Verification Audits',
                  'Digital POS & Soundbox Merchant Training',
                  'State Scheme Awareness Campaign Execution'
                ].map((srv) => (
                  <button
                    key={srv}
                    type="button"
                    onClick={() => toggleService(srv)}
                    className={`text-left p-2 rounded-lg border transition-colors ${
                      selectedServices.includes(srv)
                        ? 'bg-[#02167F] text-[#FFD014] border-[#02167F] font-bold shadow-2xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {selectedServices.includes(srv) ? '✓ ' : '+ '} {srv}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Project Scope / Scheme Details
              </label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Target count of merchants/enterprises, specific taluks/districts, or tender details..."
                className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm"
              ></textarea>
            </div>

            <div className="bg-blue-50 p-3 rounded-lg text-[11px] text-[#02167F] leading-normal border border-blue-200 font-medium">
              <strong>Official Assurance:</strong> We Onboard operates with audited geo-tagged verification, dedicated project managers, and weekly milestone dashboards for department oversight.
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
                className="bg-[#02167F] hover:bg-[#031d99] text-[#FFD014] font-extrabold px-6 py-2.5 rounded-lg text-xs flex items-center gap-1.5 shadow-md"
              >
                <span>Submit Department & Agency Proposal</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
