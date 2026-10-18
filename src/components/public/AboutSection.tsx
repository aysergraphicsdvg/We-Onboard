import React from 'react';
import { ArrowRight, MapPin, Building, Users } from 'lucide-react';

export const AboutSection: React.FC = () => {
  return (
    <section className="py-20 bg-slate-50 border-b border-slate-200" id="about">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          <div className="lg:col-span-5 space-y-4">
            <div className="inline-flex items-center gap-2">
              <span className="h-0.5 w-6 bg-[#02167F]"></span>
              <span className="text-[#02167F] text-xs font-bold tracking-widest uppercase">
                ABOUT WE ONBOARD
              </span>
            </div>
            
            <h2 className="text-3xl sm:text-4xl font-extrabold text-[#02167F] tracking-tight">
              Growth happens <br />
              <em>on the ground.</em>
            </h2>

            <div className="pt-2">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-700 bg-white border border-slate-200 px-3 py-2 rounded-lg inline-flex">
                <MapPin className="w-4 h-4 text-[#FFD014]" />
                <span>Headquartered in Indiranagar, Bangalore</span>
              </div>
            </div>
          </div>

          <div className="lg:col-span-7 space-y-6 text-slate-700 text-base leading-relaxed">
            <p>
              Founded by <strong>Muhammd Ali Shoaib</strong> and <strong>Umme Morsi</strong>, 
              <strong> We Onboard</strong> bridges high-growth consumer technology platforms, fast-moving retail chains, 
              and expanding enterprises with the physical ground capabilities they need to scale across South India.
            </p>

            <p>
              We combine deep local corridor understanding, rigorous KYC identity authentication, structured standard operating procedures (SOPs), 
              and transparent digital reporting to transform ambitious expansion blueprints into verified, live field execution.
            </p>

            <p className="text-sm text-slate-600 bg-white p-4 rounded-xl border border-slate-200">
              <strong className="text-[#02167F] block mb-1">Our Core Commitment:</strong>
              Our mission is to make business onboarding predictable, accountable and outcome-oriented, 
              while creating dignified, transparent and flexible earning pathways for thousands of independent professionals. 
              We strictly enforce a zero-joining-fee policy for all job seekers and freelancers.
            </p>

            <div className="pt-2">
              <a
                href="#contact"
                className="text-[#02167F] font-bold text-sm inline-flex items-center gap-1.5 hover:gap-2.5 transition-all group"
              >
                <span>Let's work together</span>
                <ArrowRight className="w-4 h-4 text-[#FFD014] group-hover:translate-x-1 transition-transform" />
              </a>
            </div>
          </div>

        </div>

      </div>
    </section>
  );
};
