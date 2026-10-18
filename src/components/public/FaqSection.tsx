import React, { useState } from 'react';
import { ChevronDown, ArrowRight, HelpCircle } from 'lucide-react';
import { store } from '../../services/store';

export const FaqSection: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const faqs = store.getState().faqs.sort((a, b) => a.order - b.order);

  return (
    <section className="py-20 bg-white border-b border-slate-200" id="faq">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          
          {/* Left Column: Heading and Ask a question CTA */}
          <div className="lg:col-span-5 space-y-4">
            <div className="inline-flex items-center gap-2">
              <span className="h-0.5 w-6 bg-[#02167F]"></span>
              <span className="text-[#02167F] text-xs font-bold tracking-widest uppercase">
                GOOD TO KNOW
              </span>
            </div>

            <h2 className="text-3xl sm:text-4xl font-extrabold text-[#02167F] tracking-tight">
              Frequently asked questions
            </h2>

            <p className="text-slate-600 text-base">
              Need a detail that isn't covered here? Our operational team in Indiranagar is ready to assist.
            </p>

            <div className="pt-2">
              <a
                href="#contact"
                className="bg-[#FFD014] hover:bg-[#e6bb0d] text-[#02167F] font-bold px-5 py-2.5 rounded-lg text-sm transition-colors inline-flex items-center gap-2 shadow-sm"
              >
                <span>Ask a Question</span>
                <ArrowRight className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Right Column: FAQ Accordion */}
          <div className="lg:col-span-7 space-y-3">
            {faqs.map((faq, idx) => {
              const isOpen = openIndex === idx;
              return (
                <div
                  key={faq.id}
                  className="border border-slate-200 rounded-xl overflow-hidden transition-colors"
                >
                  <button
                    onClick={() => setOpenIndex(isOpen ? null : idx)}
                    className="w-full text-left p-5 flex items-center justify-between gap-4 font-bold text-slate-800 hover:text-[#02167F] hover:bg-slate-50 transition-colors"
                  >
                    <span className="text-base">{faq.question}</span>
                    <ChevronDown
                      className={`w-5 h-5 text-slate-400 shrink-0 transition-transform duration-200 ${
                        isOpen ? 'rotate-180 text-[#02167F]' : ''
                      }`}
                    />
                  </button>

                  {isOpen && (
                    <div className="px-5 pb-5 text-sm text-slate-600 leading-relaxed border-t border-slate-100 bg-slate-50/50">
                      <p className="pt-3">{faq.answer}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

        </div>

      </div>
    </section>
  );
};
