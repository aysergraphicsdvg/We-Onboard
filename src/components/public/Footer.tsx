import React, { useState } from 'react';
import { Phone, Mail, MapPin, ShieldCheck, MessageCircle, X } from 'lucide-react';
import { store } from '../../services/store';

interface FooterProps {
  onNavigate: (view: 'website' | 'admin' | 'freelancer' | 'freelancer-register') => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  const [settings, setSettings] = useState(() => store.getState().settings);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showTerms, setShowTerms] = useState(false);

  React.useEffect(() => {
    return store.subscribe(() => {
      setSettings(store.getState().settings);
    });
  }, []);

  return (
    <>
      <footer className="bg-[#010e54] text-white pt-16 pb-12 border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-10 pb-12 border-b border-white/10">
            
            {/* Brand & Address Column */}
            <div className="lg:col-span-5 space-y-4">
              <a 
                href="#home"
                onClick={(e) => { e.preventDefault(); onNavigate('website'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                className="flex items-center gap-0.5 group focus:outline-none"
              >
                {settings.footerLogoUrl ? (
                  <img
                    src={settings.footerLogoUrl}
                    alt={settings.companyName || 'We Onboard'}
                    className="h-10 sm:h-12 w-auto max-w-[200px] sm:max-w-[240px] object-contain"
                  />
                ) : (
                  <div className="flex items-center gap-0.5">
                    <div className="bg-[#FFD014] text-[#02167F] font-black text-xl px-2.5 py-1 rounded-md tracking-tighter">
                      we
                    </div>
                    <span className="text-white font-extrabold text-2xl tracking-tight ml-0.5">
                      nboard
                    </span>
                  </div>
                )}
              </a>

              <p className="text-slate-300 text-sm max-w-sm">
                Your ground engine for growth. Connecting businesses with verified people, merchants, and field operations across Bangalore.
              </p>

              <div className="text-xs text-slate-300 space-y-2 pt-2">
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-[#FFD014] shrink-0 mt-0.5" />
                  <span>{settings.address}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-[#FFD014] shrink-0" />
                  <a href={`tel:${settings.phone.replace(/\s+/g, '')}`} className="hover:text-[#FFD014]">
                    {settings.phone}
                  </a>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-[#FFD014] shrink-0" />
                  <a href={`mailto:${settings.email}`} className="hover:text-[#FFD014]">
                    {settings.email}
                  </a>
                </div>
              </div>
            </div>

            {/* Quick Links Column */}
            <div className="lg:col-span-4 space-y-3">
              <h4 className="text-xs font-black tracking-widest text-[#FFD014] uppercase">
                Quick Links
              </h4>
              <div className="grid grid-cols-2 gap-2 text-xs text-slate-300 font-medium">
                <a href="#home" className="hover:text-white transition-colors py-1">Home</a>
                <a href="#services" className="hover:text-white transition-colors py-1">Services</a>
                <a href="#businesses" className="hover:text-white transition-colors py-1">For Businesses</a>
                <button onClick={() => onNavigate('freelancer-register')} className="text-left hover:text-white transition-colors py-1">
                  Join as Freelancer
                </button>
                <a href="#msme" className="hover:text-white transition-colors py-1">MSME Agency Desk</a>
                <a href="#about" className="hover:text-white transition-colors py-1">About Us</a>
                <a href="#faq" className="hover:text-white transition-colors py-1">FAQ</a>
                <a href="#contact" className="hover:text-white transition-colors py-1">Contact</a>
                <button onClick={() => onNavigate('freelancer')} className="text-left text-[#FFD014] hover:underline py-1 font-bold">
                  Freelancer Portal
                </button>
              </div>
            </div>

            {/* Our Commitment Column */}
            <div className="lg:col-span-3 space-y-3">
              <h4 className="text-xs font-black tracking-widest text-[#FFD014] uppercase">
                Our Commitment
              </h4>
              <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-xs text-slate-300 space-y-2">
                <div className="flex items-center gap-2 text-white font-bold">
                  <ShieldCheck className="w-4 h-4 text-[#FFD014]" />
                  <span>Zero Candidate Fees</span>
                </div>
                <p className="leading-relaxed">
                  We never charge job seekers or independent associates a joining fee. Report any suspicious requests using our official Indiranagar contact details.
                </p>
              </div>

              {/* Social Channels */}
              <div className="flex items-center gap-3 pt-2">
                <a
                  href={`https://wa.me/${settings.whatsapp}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-[#25D366] text-white flex items-center justify-center text-xs font-bold transition-colors"
                  aria-label="WhatsApp"
                >
                  WA
                </a>
                <a
                  href={`mailto:${settings.email}`}
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-[#FFD014] hover:text-[#02167F] text-white flex items-center justify-center text-xs font-bold transition-colors"
                  aria-label="Email"
                >
                  @
                </a>
                <a
                  href="#contact"
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-[#FFD014] hover:text-[#02167F] text-white flex items-center justify-center text-xs font-bold transition-colors"
                  aria-label="Contact"
                >
                  ↗
                </a>
              </div>
            </div>

          </div>

          {/* Bottom Bar */}
          <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
            <div className="flex items-center gap-4">
              <button onClick={() => setShowPrivacy(true)} className="hover:text-white transition-colors">
                Privacy Policy
              </button>
              <span>|</span>
              <button onClick={() => setShowTerms(true)} className="hover:text-white transition-colors">
                Terms and Conditions
              </button>
            </div>

            <p>© 2026 We Onboard. Founded by Muhammd Ali Shoaib and Umme Morsi. All rights reserved.</p>
          </div>

        </div>
      </footer>

      {/* Floating WhatsApp Quick Action Button */}
      <a
        href={`https://wa.me/${settings.whatsapp}?text=Hi%20We%20Onboard%2C%20I%20would%20like%20to%20know%20more`}
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 z-50 bg-[#25D366] hover:bg-[#20ba59] text-white p-3.5 rounded-full shadow-2xl hover:scale-110 transition-all flex items-center justify-center group"
        aria-label="Chat with We Onboard on WhatsApp"
      >
        <MessageCircle className="w-6 h-6" />
        <span className="max-w-0 overflow-hidden whitespace-nowrap group-hover:max-w-xs transition-all duration-300 font-bold text-xs pl-0 group-hover:pl-2">
          Chat on WhatsApp
        </span>
      </a>

      {/* Privacy Policy Modal */}
      {showPrivacy && (
        <div className="fixed inset-0 z-50 bg-[#02167F]/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white text-slate-900 rounded-2xl max-w-xl w-full p-6 sm:p-8 max-h-[85vh] overflow-y-auto relative shadow-2xl">
            <button onClick={() => setShowPrivacy(false)} className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-700">
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-xl font-extrabold text-[#02167F] mb-4">
              We Onboard Privacy Policy
            </h3>
            <div className="text-xs text-slate-600 space-y-3 leading-relaxed">
              <p><strong>1. Information Collection:</strong> We collect contact details, professional experience and verification documents solely to process enquiries, freelancer onboarding and project assignments.</p>
              <p><strong>2. Data Protection:</strong> Personal data is processed in accordance with Indian information technology regulations. Private documents (Aadhaar, PAN, resumes) are protected and restricted to authorized personnel.</p>
              <p><strong>3. Zero Commercial Resale:</strong> We never sell candidate, merchant or client contact information to third-party telemarketers.</p>
              <p><strong>4. Inquiries:</strong> Contact <em>mail@weonboard.in</em> or visit our Indiranagar Bangalore office for data retention inquiries.</p>
            </div>
            <div className="mt-6 text-right">
              <button onClick={() => setShowPrivacy(false)} className="bg-[#02167F] text-white font-bold px-4 py-2 rounded-lg text-xs">
                Understood
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Terms Modal */}
      {showTerms && (
        <div className="fixed inset-0 z-50 bg-[#02167F]/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white text-slate-900 rounded-2xl max-w-xl w-full p-6 sm:p-8 max-h-[85vh] overflow-y-auto relative shadow-2xl">
            <button onClick={() => setShowTerms(false)} className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-700">
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-xl font-extrabold text-[#02167F] mb-4">
              Terms & Operating Conditions
            </h3>
            <div className="text-xs text-slate-600 space-y-3 leading-relaxed">
              <p><strong>1. General Engagements:</strong> Pilot scopes, delivery timelines and pricing criteria are documented in dedicated operational agreements before physical mobilization.</p>
              <p><strong>2. No Joining Fee Guarantee:</strong> We Onboard will never charge candidates or freelancers any fee for application, registration or training.</p>
              <p><strong>3. Government Approvals:</strong> We provide administrative guidance for MSME programs (Udyam, GST, FSSAI). Final issuance rests exclusively with statutory authorities.</p>
            </div>
            <div className="mt-6 text-right">
              <button onClick={() => setShowTerms(false)} className="bg-[#02167F] text-white font-bold px-4 py-2 rounded-lg text-xs">
                Understood
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
