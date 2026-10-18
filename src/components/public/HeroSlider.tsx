import React, { useState, useEffect } from 'react';
import { ArrowRight, ChevronLeft, ChevronRight, CheckCircle2, ShieldCheck, MapPin, TrendingUp } from 'lucide-react';
import { store } from '../../services/store';
import { getHeroBannerImage } from '../../assets/heroImages';

interface HeroSliderProps {
  onNavigate: (view: 'website' | 'admin' | 'freelancer' | 'freelancer-register') => void;
  onOpenPilotModal: () => void;
}

export const HeroSlider: React.FC<HeroSliderProps> = ({ onNavigate, onOpenPilotModal }) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [banners, setBanners] = useState(() => store.getState().heroBanners.filter((b) => b.isActive));

  // Keep banners reactive to admin CMS edits
  useEffect(() => {
    const unsubscribe = store.subscribe(() => {
      setBanners(store.getState().heroBanners.filter((b) => b.isActive));
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (banners.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % banners.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [banners.length]);

  if (!banners.length) return null;

  const slide = banners[currentSlide] || banners[0];

  return (
    <section className="relative bg-[#02167F] text-white overflow-hidden" id="home">
      {/* Background Decorative Grid */}
      <div 
        className="absolute inset-0 opacity-10 pointer-events-none" 
        style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, #ffffff 1px, transparent 0)',
          backgroundSize: '32px 32px'
        }}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 sm:pt-16 lg:pt-20 pb-8 sm:pb-12 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8 items-end">
          
          {/* Left Column: Hero Copy */}
          <div className="lg:col-span-7 space-y-6 pb-6 lg:pb-12">
            
            {/* Eyebrow */}
            <div className="inline-flex items-center gap-2">
              <span className="h-0.5 w-6 bg-[#FFD014]"></span>
              <span className="text-[#FFD014] text-xs font-bold tracking-widest uppercase">
                {slide.eyebrow}
              </span>
            </div>

            {/* Main Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.12]">
              {slide.heading} <br />
              <em className="text-[#FFD014] not-italic font-black underline decoration-white/20 underline-offset-8">
                {slide.headingHighlight}
              </em>
            </h1>

            {/* Sub-description */}
            <p className="text-slate-200 text-lg sm:text-xl max-w-2xl font-normal leading-relaxed">
              {slide.description}
            </p>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-4 pt-2">
              <a
                href={slide.ctaLink}
                onClick={(e) => {
                  if (slide.ctaLink === '#contact') {
                    // smooth scroll
                  } else {
                    onOpenPilotModal();
                  }
                }}
                className="bg-[#FFD014] hover:bg-[#e6bb0d] text-[#02167F] font-bold px-7 py-3.5 rounded-lg text-base transition-all shadow-lg hover:shadow-xl flex items-center gap-2 group"
              >
                <span>{slide.ctaText}</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </a>

              <button
                onClick={() => onNavigate('freelancer-register')}
                className="border-2 border-white/80 hover:border-white text-white hover:bg-white/10 font-bold px-6 py-3.5 rounded-lg text-base transition-colors"
              >
                {slide.secondaryCtaText || 'Join as a Freelancer'}
              </button>
            </div>

            {/* Trust Mini Strip */}
            <div className="pt-6 border-t border-white/15 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-slate-300 font-medium">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-[#FFD014] shrink-0" />
                <span>Verified partners</span>
              </div>
              <div className="flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-[#FFD014] shrink-0" />
                <span>Geo-tagged proof</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-[#FFD014] shrink-0" />
                <span>Pay only for results</span>
              </div>
              <div className="flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-[#FFD014] shrink-0" />
                <span>Live progress reporting</span>
              </div>
            </div>

          </div>

          {/* Right Column: Uploaded PNG Hero Image (Anchor directly from bottom, height as per image ratio) */}
          <div className="lg:col-span-5 relative flex flex-col justify-end items-center lg:items-end self-end w-full">
            <div className="relative w-full flex flex-col items-center lg:items-end justify-end">
              
              {/* Selected container section removed — replaced with clean, bottom-anchored PNG image */}
              <div className="relative flex items-end justify-center lg:justify-end w-full overflow-visible">
                <img
                  src={getHeroBannerImage(slide.visualType, slide.imageUrl)}
                  alt={slide.imageAlt || `${slide.heading} ${slide.headingHighlight || ''} visual representation`}
                  className="w-auto max-w-full h-auto max-h-[500px] sm:max-h-[560px] lg:max-h-[620px] object-contain object-bottom drop-shadow-2xl transition-all duration-300 pointer-events-auto select-none"
                  style={{
                    height: 'auto',
                    maxHeight: slide.imageMaxHeight ? `${slide.imageMaxHeight}px` : undefined,
                  }}
                />
              </div>

              {/* Slider Navigation Arrows & Indicators */}
              <div className="w-full flex items-center justify-between mt-3 pt-2">
                <div className="flex items-center gap-2">
                  {banners.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentSlide(idx)}
                      className={`h-2.5 rounded-full transition-all ${
                        currentSlide === idx ? 'w-8 bg-[#FFD014]' : 'w-2.5 bg-white/30 hover:bg-white/50'
                      }`}
                      aria-label={`Go to slide ${idx + 1}`}
                    />
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentSlide((prev) => (prev === 0 ? banners.length - 1 : prev - 1))}
                    className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                    aria-label="Previous slide"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setCurrentSlide((prev) => (prev + 1) % banners.length)}
                    className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                    aria-label="Next slide"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

            </div>
          </div>

        </div>
      </div>
    </section>
  );
};
