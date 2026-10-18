import React, { useState } from 'react';
import { Phone, Mail, MapPin, Clock, ArrowRight, CheckCircle2, MessageSquare } from 'lucide-react';
import { store } from '../../services/store';
import { EnquiryType, ServiceCategory } from '../../types';

interface ContactFormProps {
  preselectedService?: string;
}

export const ContactForm: React.FC<ContactFormProps> = ({ preselectedService }) => {
  const settings = store.getState().settings;

  const [fullName, setFullName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [enquiryType, setEnquiryType] = useState<EnquiryType>('Business');
  const [city, setCity] = useState('Bengaluru');
  const [serviceRequired, setServiceRequired] = useState<string>(
    preselectedService || 'Rider and worker onboarding'
  );
  const [message, setMessage] = useState('');
  const [consent, setConsent] = useState(true);

  const [submittedRef, setSubmittedRef] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !phone || !consent) {
      alert('Please complete all required fields and accept the contact consent.');
      return;
    }

    setIsSubmitting(true);

    try {
      const created = store.addEnquiry({
        fullName,
        companyName: companyName || undefined,
        phone,
        email: email || 'contact@client.in',
        enquiryType,
        city: city || 'Bengaluru',
        serviceRequired,
        message: message || `Enquiry for ${serviceRequired}`,
        consent: true,
        source: 'Website Contact Section'
      });

      setSubmittedRef(created.id);
      setIsSubmitting(false);
    } catch (err) {
      console.error(err);
      setIsSubmitting(false);
      alert('Error submitting enquiry. Please try again.');
    }
  };

  const getWhatsAppLink = (refId: string) => {
    const text = encodeURIComponent(
      `Hi We Onboard, I have submitted an enquiry [${refId}].\n\n` +
      `Name: ${fullName}\n` +
      `Company: ${companyName || 'N/A'}\n` +
      `Phone: ${phone}\n` +
      `Service: ${serviceRequired}\n` +
      `City: ${city}\n` +
      `Message: ${message || 'Please review my request.'}`
    );
    return `https://wa.me/${settings.whatsapp}?text=${text}`;
  };

  return (
    <section className="py-20 bg-slate-50 border-b border-slate-200" id="contact">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          
          {/* Left Column: Contact Information */}
          <div className="lg:col-span-5 space-y-6">
            <div>
              <div className="inline-flex items-center gap-2 mb-2">
                <span className="h-0.5 w-6 bg-[#02167F]"></span>
                <span className="text-[#02167F] text-xs font-bold tracking-widest uppercase">
                  LET'S TALK
                </span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-[#02167F] tracking-tight">
                Tell us what you want to achieve.
              </h2>
              <p className="text-slate-600 mt-2 text-base">
                Share your requirements and we'll help you structure a pilot plan and ground execution timeline.
              </p>
            </div>

            {/* Address & Contact Cards */}
            <div className="bg-white rounded-xl p-6 border border-slate-200 space-y-4 shadow-sm">
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-[#FFD014] shrink-0 mt-0.5" />
                <div className="text-xs text-slate-600">
                  <strong className="text-slate-900 block text-sm mb-0.5 font-bold">Office Address</strong>
                  {settings.address}
                </div>
              </div>

              <div className="flex items-start gap-3 pt-3 border-t border-slate-100">
                <Phone className="w-5 h-5 text-[#FFD014] shrink-0 mt-0.5" />
                <div className="text-xs text-slate-600">
                  <strong className="text-slate-900 block text-sm mb-0.5 font-bold">Phone & WhatsApp</strong>
                  <a href={`tel:${settings.phone.replace(/\s+/g, '')}`} className="hover:text-[#02167F] font-semibold text-slate-800">
                    {settings.phone}
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-3 pt-3 border-t border-slate-100">
                <Mail className="w-5 h-5 text-[#FFD014] shrink-0 mt-0.5" />
                <div className="text-xs text-slate-600">
                  <strong className="text-slate-900 block text-sm mb-0.5 font-bold">Official Email</strong>
                  <a href={`mailto:${settings.email}`} className="hover:text-[#02167F] font-semibold text-slate-800">
                    {settings.email}
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-3 pt-3 border-t border-slate-100">
                <Clock className="w-5 h-5 text-[#FFD014] shrink-0 mt-0.5" />
                <div className="text-xs text-slate-600">
                  <strong className="text-slate-900 block text-sm mb-0.5 font-bold">Business Hours</strong>
                  <span>{settings.businessHours}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Database-Connected Contact Form */}
          <div className="lg:col-span-7">
            <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-md">
              
              {submittedRef ? (
                <div className="text-center py-8 space-y-4 animate-in fade-in zoom-in-95">
                  <div className="w-16 h-16 mx-auto rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                    <CheckCircle2 className="w-10 h-10" />
                  </div>
                  <h3 className="text-2xl font-extrabold text-[#02167F]">
                    Enquiry Recorded Successfully!
                  </h3>
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 max-w-md mx-auto text-sm text-slate-700">
                    <span className="text-xs text-slate-500 block uppercase font-bold tracking-wider">
                      Database Reference ID
                    </span>
                    <strong className="text-xl font-mono text-[#02167F] font-black">
                      {submittedRef}
                    </strong>
                    <p className="text-xs text-slate-600 mt-2">
                      Our Indiranagar operations team has been notified and assigned to review your requirements.
                    </p>
                  </div>

                  <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
                    <a
                      href={getWhatsAppLink(submittedRef)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full sm:w-auto bg-[#25D366] hover:bg-[#20ba59] text-white font-bold px-6 py-3 rounded-lg text-sm transition-colors flex items-center justify-center gap-2 shadow"
                    >
                      <MessageSquare className="w-4 h-4" />
                      <span>Continue to WhatsApp</span>
                    </a>

                    <button
                      onClick={() => {
                        setSubmittedRef(null);
                        setFullName('');
                        setCompanyName('');
                        setPhone('');
                        setEmail('');
                        setMessage('');
                      }}
                      className="w-full sm:w-auto border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold px-5 py-3 rounded-lg text-sm transition-colors"
                    >
                      Submit Another Enquiry
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="border-b border-slate-100 pb-3 mb-2">
                    <h3 className="text-xl font-bold text-[#02167F]">
                      Send an enquiry
                    </h3>
                    <p className="text-xs text-slate-500">
                      Submissions are immediately saved in our secure business database.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Full Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Your full name"
                        className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-[#02167F] focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Company or Business Name
                      </label>
                      <input
                        type="text"
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        placeholder="Company name (optional)"
                        className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-[#02167F] focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Phone Number <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="tel"
                        required
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+91 98450 XXXXX"
                        className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-[#02167F] focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Email Address
                      </label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@company.in"
                        className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-[#02167F] focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        I am enquiring as <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={enquiryType}
                        onChange={(e) => setEnquiryType(e.target.value as EnquiryType)}
                        className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-[#02167F] focus:outline-none bg-white"
                      >
                        <option value="Business">Business / Platform Client</option>
                        <option value="Freelancer">Freelancer / Field Candidate</option>
                        <option value="MSME">MSME Business Owner</option>
                        <option value="Franchise / dealership brand">Franchise / Dealership Brand</option>
                        <option value="General enquiry">General Enquiry</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Target City / Region
                      </label>
                      <input
                        type="text"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        placeholder="Bengaluru"
                        className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-[#02167F] focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Service Required
                    </label>
                    <select
                      value={serviceRequired}
                      onChange={(e) => setServiceRequired(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-[#02167F] focus:outline-none bg-white"
                    >
                      <option value="Rider and worker onboarding">Rider and worker onboarding</option>
                      <option value="Merchant and restaurant onboarding">Merchant and restaurant onboarding</option>
                      <option value="Field audits and surveys">Field audits and surveys</option>
                      <option value="MSME registration support">MSME registration support</option>
                      <option value="Franchise and dealership development">Franchise and dealership development</option>
                      <option value="Freelancer opportunities">Freelancer opportunities</option>
                      <option value="Other services">Other customized field operations</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Brief Message or Scope Details
                    </label>
                    <textarea
                      rows={3}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Share your requirements (e.g. number of riders, locations, deadlines)..."
                      className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-[#02167F] focus:outline-none"
                    ></textarea>
                  </div>

                  <div className="flex items-start gap-2 pt-1">
                    <input
                      type="checkbox"
                      id="consent-check"
                      checked={consent}
                      onChange={(e) => setConsent(e.target.checked)}
                      className="mt-1 h-4 w-4 rounded border-slate-300 text-[#02167F] focus:ring-[#02167F]"
                    />
                    <label htmlFor="consent-check" className="text-xs text-slate-600">
                      I agree to be contacted by We Onboard regarding this business enquiry in accordance with the Privacy Policy.
                    </label>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-[#FFD014] hover:bg-[#e6bb0d] text-[#02167F] font-extrabold py-3.5 rounded-xl text-base transition-colors flex items-center justify-center gap-2 shadow-md hover:shadow-lg disabled:opacity-50"
                  >
                    <span>{isSubmitting ? 'Recording Enquiry...' : 'Submit Enquiry to Database'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>

                  <p className="text-[11px] text-center text-slate-500">
                    Your submission creates an authentic database record with an audit trail. WhatsApp option available immediately after recording.
                  </p>
                </form>
              )}

            </div>
          </div>

        </div>

      </div>
    </section>
  );
};
