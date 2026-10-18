import React, { useState } from 'react';
import { ArrowRight, Bike, Store, ClipboardCheck, Building2, Briefcase, CheckCircle, X } from 'lucide-react';
import { store } from '../../services/store';
import { CmsService } from '../../types';

interface ServicesSectionProps {
  onSelectServiceForEnquiry: (serviceName: string) => void;
}

export const ServicesSection: React.FC<ServicesSectionProps> = ({ onSelectServiceForEnquiry }) => {
  const [selectedService, setSelectedService] = useState<CmsService | null>(null);
  const services = store.getState().services.filter((s) => s.isActive);

  const getServiceIcon = (iconName: string) => {
    switch (iconName) {
      case 'rider':
        return <Bike className="w-6 h-6 text-[#02167F]" />;
      case 'merchant':
        return <Store className="w-6 h-6 text-[#02167F]" />;
      case 'audit':
        return <ClipboardCheck className="w-6 h-6 text-[#02167F]" />;
      case 'msme':
        return <Building2 className="w-6 h-6 text-[#02167F]" />;
      case 'franchise':
      default:
        return <Briefcase className="w-6 h-6 text-[#02167F]" />;
    }
  };

  const getServiceDetails = (title: string) => {
    if (title.includes('Rider')) {
      return {
        tagline: 'Rapid sourcing, physical verification, app training and safety equipment handover.',
        points: [
          'Two-wheeler driving license, RC & Aadhaar background authentication',
          'Physical vehicle roadworthiness & smartphone compatibility checks',
          'Delivery partner app walkthrough and mock simulation orders',
          'Branded uniform, safety helmet and thermal delivery bag dispatch',
          'Real-time daily roster and hub activation telemetry'
        ]
      };
    }
    if (title.includes('Merchant')) {
      return {
        tagline: 'High-velocity local retailer onboarding, menu digitization and initial order enablement.',
        points: [
          'Kirana stores, supermarkets, pharmacies and quick-service restaurants',
          'Owner PAN, GST and FSSAI certificate collection and validation',
          'Storefront geotagging, opening hour verification and photos',
          'POS terminal deployment, soundbox setup and QR code paste',
          'First live transaction support and store staff onboarding'
        ]
      };
    }
    if (title.includes('Audit')) {
      return {
        tagline: 'Rigorous retail compliance, inventory stock checks, and mystery customer visits.',
        points: [
          'Geo-fenced mobile visit logs with tamper-proof timestamps',
          'Shelf display share-of-voice and promotional POSM audit',
          'Cold chain temperature compliance and product expiry inspections',
          'Mystery shopper experience evaluation with qualitative scoring',
          'Daily photo evidence bundles accessible on executive dashboard'
        ]
      };
    }
    if (title.includes('MSME')) {
      return {
        tagline: 'Field operations partner for Government Departments, PSUs, and cluster nodal agencies.',
        points: [
          'State Nodal Department & District Industries Centre (DIC) scheme rollout',
          'Udyam & PM Vishwakarma ground mobilization and artisan enumeration',
          'ONDC MSME seller cataloguing and digital marketplace onboarding',
          'GeM Portal vendor enablement & cluster compliance verification',
          'Geo-tagged merchant enumeration with live department progress dashboards'
        ]
      };
    }
    return {
      tagline: 'End-to-end franchisee discovery, financial qualification, and territory site visits.',
      points: [
        'Franchise applicant screening based on local capital and trade track-record',
        'Commercial location footfall surveys and catchment area analysis',
        'Franchise disclosure, legal agreement briefing and token facilitation',
        'Store launch coordination, distributor alignment and ground execution',
        'Regional territory exclusivity tracking'
      ]
    };
  };

  return (
    <section className="py-20 bg-slate-50 border-b border-slate-200" id="services">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Heading */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-14">
          <div>
            <div className="inline-flex items-center gap-2 mb-2">
              <span className="h-0.5 w-6 bg-[#02167F]"></span>
              <span className="text-[#02167F] text-xs font-bold tracking-widest uppercase">
                WHAT WE DO
              </span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-[#02167F] tracking-tight">
              End-to-end onboarding <br className="hidden sm:inline" />
              and field execution
            </h2>
            <p className="text-slate-600 mt-2 max-w-xl text-base">
              We help platforms, brands and MSMEs grow with verified people, partners and businesses.
            </p>
          </div>

          <a
            href="#contact"
            className="self-start md:self-auto bg-[#FFD014] hover:bg-[#e6bb0d] text-[#02167F] font-bold px-5 py-2.5 rounded-lg text-sm transition-colors flex items-center gap-2 shadow-sm"
          >
            <span>Explore All Services</span>
            <ArrowRight className="w-4 h-4" />
          </a>
        </div>

        {/* 5-Card Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
          {services.map((service, idx) => (
            <article
              key={service.id}
              className="bg-white rounded-xl border border-slate-200 hover:border-[#02167F]/40 shadow-sm hover:shadow-md transition-all flex flex-col justify-between p-6 group"
            >
              <div>
                {/* Visual Icon Badge */}
                <div className="w-12 h-12 rounded-xl bg-[#02167F]/5 border border-[#02167F]/10 flex items-center justify-center mb-5 group-hover:scale-105 transition-transform">
                  {getServiceIcon(service.icon)}
                </div>

                <h3 className="text-lg font-bold text-[#02167F] mb-2 leading-snug">
                  {service.title}
                </h3>

                <p className="text-slate-600 text-xs leading-relaxed mb-6">
                  {service.description}
                </p>
              </div>

              <div className="pt-4 border-t border-slate-100">
                <button
                  onClick={() => setSelectedService(service)}
                  className="text-xs font-bold text-[#02167F] group-hover:text-[#031d99] flex items-center gap-1.5 transition-colors"
                >
                  <span>Know More</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </article>
          ))}
        </div>

      </div>

      {/* Service Detail Modal */}
      {selectedService && (
        <div className="fixed inset-0 z-50 bg-[#02167F]/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200 relative animate-in fade-in zoom-in-95">
            <button
              onClick={() => setSelectedService(null)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-700 rounded-full"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-[#FFD014]/20 flex items-center justify-center">
                {getServiceIcon(selectedService.icon)}
              </div>
              <div>
                <h3 className="text-xl font-extrabold text-[#02167F]">
                  {selectedService.title}
                </h3>
                <span className="text-xs text-slate-500 font-medium">
                  We Onboard Field Capability
                </span>
              </div>
            </div>

            <p className="text-sm text-slate-700 mb-5 font-medium leading-relaxed">
              {getServiceDetails(selectedService.title).tagline}
            </p>

            <div className="space-y-2.5 mb-6">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Key Execution Deliverables
              </h4>
              {getServiceDetails(selectedService.title).points.map((pt, i) => (
                <div key={i} className="flex items-start gap-2 text-xs text-slate-700">
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>{pt}</span>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                onClick={() => setSelectedService(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Close
              </button>
              <button
                onClick={() => {
                  const title = selectedService.title;
                  setSelectedService(null);
                  onSelectServiceForEnquiry(title);
                  const el = document.getElementById('contact');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }}
                className="bg-[#02167F] hover:bg-[#031d99] text-[#FFD014] font-bold px-5 py-2.5 rounded-lg text-xs transition-colors flex items-center gap-1.5 shadow"
              >
                <span>Request Scope for This Service</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
