import React, { useState } from 'react';
import { Phone, Mail, MapPin, ArrowRight, Menu, X, Shield, UserCheck } from 'lucide-react';
import { store } from '../../services/store';

interface HeaderProps {
  onNavigate: (view: 'website' | 'admin' | 'freelancer' | 'freelancer-register') => void;
  onOpenPilotModal: () => void;
  onOpenFreelancerModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({ 
  onNavigate, 
  onOpenPilotModal, 
  onOpenFreelancerModal 
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [settings, setSettings] = useState(() => store.getState().settings);

  React.useEffect(() => {
    return store.subscribe(() => {
      setSettings(store.getState().settings);
    });
  }, []);

  return (
    <>
      {/* Top Details Bar */}
      <div className="bg-[#02167F] text-white text-xs py-2 px-4 border-b border-white/10">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-slate-200">
            <a href={`tel:${settings.phone.replace(/\s+/g, '')}`} className="flex items-center gap-1.5 hover:text-[#FFD014] transition-colors">
              <Phone className="w-3.5 h-3.5 text-[#FFD014]" />
              <span className="font-medium">{settings.phone}</span>
            </a>
            <a href={`mailto:${settings.email}`} className="flex items-center gap-1.5 hover:text-[#FFD014] transition-colors">
              <Mail className="w-3.5 h-3.5 text-[#FFD014]" />
              <span>{settings.email}</span>
            </a>
            <span className="flex items-center gap-1.5 text-slate-300 hidden md:flex">
              <MapPin className="w-3.5 h-3.5 text-[#FFD014]" />
              <span>Indiranagar, Bangalore</span>
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button 
              onClick={onOpenPilotModal}
              className="bg-[#FFD014] hover:bg-[#e6bb0d] text-[#02167F] font-bold px-3 py-1 rounded text-xs transition-colors flex items-center gap-1 shadow-sm"
            >
              <span>Request a Free Pilot Plan</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Navigation Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md shadow-sm border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
          
          {/* Brand Logo: Uploaded Logo or Styled Brand Preset */}
          <a 
            href="#home" 
            onClick={(e) => { e.preventDefault(); onNavigate('website'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
            className="flex items-center gap-0.5 group focus:outline-none"
            aria-label="We Onboard Home"
          >
            {settings.headerLogoUrl ? (
              <img 
                src={settings.headerLogoUrl} 
                alt={settings.companyName || 'We Onboard'} 
                className="h-10 sm:h-12 w-auto max-w-[200px] sm:max-w-[240px] object-contain"
              />
            ) : (
              <div className="flex items-center gap-0.5">
                <div className="bg-[#FFD014] text-[#02167F] font-black text-xl px-2.5 py-1 rounded-md tracking-tighter shadow-sm group-hover:scale-105 transition-transform">
                  we
                </div>
                <span className="text-[#02167F] font-extrabold text-2xl tracking-tight ml-0.5">
                  nboard
                </span>
              </div>
            )}
          </a>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-6 text-[14px] font-semibold text-slate-700">
            <a href="#home" className="hover:text-[#02167F] transition-colors py-2">Home</a>
            <a href="#services" className="hover:text-[#02167F] transition-colors py-2">Services</a>
            <a href="#businesses" className="hover:text-[#02167F] transition-colors py-2">For Businesses</a>
            <button 
              onClick={() => onNavigate('freelancer-register')} 
              className="hover:text-[#02167F] transition-colors py-2 font-semibold text-left cursor-pointer"
            >
              Join as Freelancer
            </button>
            <a href="#msme" className="hover:text-[#02167F] transition-colors py-2">MSME Agency Desk</a>
            <a href="#about" className="hover:text-[#02167F] transition-colors py-2">About</a>
            <a href="#faq" className="hover:text-[#02167F] transition-colors py-2">FAQ</a>
            <a href="#contact" className="hover:text-[#02167F] transition-colors py-2">Contact</a>
          </nav>

          {/* Action CTAs */}
          <div className="hidden sm:flex items-center gap-3">
            <button
              onClick={() => onNavigate('freelancer')}
              className="border border-[#02167F]/20 text-[#02167F] hover:bg-slate-50 font-semibold px-3.5 py-2 rounded-lg text-xs transition-colors flex items-center gap-1.5"
              title="Freelancer Self-Service Portal"
            >
              <UserCheck className="w-3.5 h-3.5 text-[#02167F]" />
              <span>Freelancer Portal</span>
            </button>
          </div>

          {/* Mobile Menu Toggle Button */}
          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)} 
            className="lg:hidden p-2 text-slate-700 hover:text-[#02167F] rounded-md focus:outline-none"
            aria-label="Toggle navigation"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden bg-white border-b border-slate-200 px-4 pt-3 pb-6 space-y-3 shadow-xl animate-in slide-in-from-top">
            <div className="flex flex-col space-y-2 text-sm font-semibold text-slate-700">
              <a 
                href="#home" 
                onClick={() => setMobileMenuOpen(false)} 
                className="py-2 px-3 rounded hover:bg-slate-50 text-[#02167F]"
              >
                Home
              </a>
              <a 
                href="#services" 
                onClick={() => setMobileMenuOpen(false)} 
                className="py-2 px-3 rounded hover:bg-slate-50"
              >
                Services
              </a>
              <a 
                href="#businesses" 
                onClick={() => setMobileMenuOpen(false)} 
                className="py-2 px-3 rounded hover:bg-slate-50"
              >
                For Businesses
              </a>
              <button 
                onClick={() => { setMobileMenuOpen(false); onNavigate('freelancer-register'); }} 
                className="text-left py-2 px-3 rounded hover:bg-slate-50 font-semibold text-[#02167F]"
              >
                Join as Freelancer
              </button>
              <a 
                href="#msme" 
                onClick={() => setMobileMenuOpen(false)} 
                className="py-2 px-3 rounded hover:bg-slate-50"
              >
                MSME Corner
              </a>
              <a 
                href="#about" 
                onClick={() => setMobileMenuOpen(false)} 
                className="py-2 px-3 rounded hover:bg-slate-50"
              >
                About
              </a>
              <a 
                href="#faq" 
                onClick={() => setMobileMenuOpen(false)} 
                className="py-2 px-3 rounded hover:bg-slate-50"
              >
                FAQ
              </a>
              <a 
                href="#contact" 
                onClick={() => setMobileMenuOpen(false)} 
                className="py-2 px-3 rounded hover:bg-slate-50"
              >
                Contact
              </a>
            </div>

            <div className="pt-3 border-t border-slate-100 flex flex-col gap-2">
              <button
                onClick={() => { setMobileMenuOpen(false); onNavigate('freelancer'); }}
                className="w-full text-center py-2.5 text-xs font-bold text-[#02167F] border border-[#02167F]/20 rounded-md bg-blue-50/50"
              >
                Freelancer Self-Service Portal
              </button>
            </div>
          </div>
        )}
      </header>
    </>
  );
};
