import React, { useState } from 'react';
import { 
  Globe, 
  Layers, 
  HelpCircle, 
  Settings, 
  Save, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  Eye, 
  ArrowRight,
  ExternalLink,
  Upload,
  Image as ImageIcon,
  Sparkles,
  RefreshCw,
  Info
} from 'lucide-react';
import { store } from '../../services/store';
import { HeroBanner, CmsService, FaqItem, SiteSettings } from '../../types';
import { getHeroBannerImage, defaultHeroImages } from '../../assets/heroImages';

interface CmsManagerProps {
  onViewPublicSite: () => void;
}

export const CmsManager: React.FC<CmsManagerProps> = ({ onViewPublicSite }) => {
  const [activeTab, setActiveTab] = useState<'banners' | 'services' | 'faqs' | 'settings'>('banners');

  // Local copy of CMS state
  const state = store.getState();
  const [banners, setBanners] = useState<HeroBanner[]>([...state.heroBanners]);
  const [services, setServices] = useState<CmsService[]>([...state.services]);
  const [faqs, setFaqs] = useState<FaqItem[]>([...state.faqs]);
  const [settings, setSettings] = useState<SiteSettings>({ ...state.settings });

  // Banner editing
  const [selectedBanner, setSelectedBanner] = useState<HeroBanner>(banners[0] || state.heroBanners[0]);
  const [isDragging, setIsDragging] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [previewBg, setPreviewBg] = useState<'navy' | 'checker'>('navy');

  // New FAQ form
  const [newFaqQ, setNewFaqQ] = useState('');
  const [newFaqA, setNewFaqA] = useState('');

  const handleSaveBanner = (e: React.FormEvent) => {
    e.preventDefault();
    store.updateHeroBanner(selectedBanner);
    setBanners([...store.getState().heroBanners]);
    setSaveSuccessMsg(`Banner "${selectedBanner.heading}" saved! It is live on the public hero slider.`);
    setTimeout(() => setSaveSuccessMsg(null), 4000);
  };

  const processUploadedFile = (file: File) => {
    if (!file) return;
    if (!file.type.includes('png') && !file.type.includes('image')) {
      alert('Please upload a PNG image file.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      if (typeof event.target?.result === 'string') {
        const dataUrl = event.target.result;
        const img = new Image();
        img.onload = () => {
          setSelectedBanner((prev) => ({
            ...prev,
            imageUrl: dataUrl,
            imageAlt: file.name.replace(/\.[^/.]+$/, ''),
          }));
        };
        img.src = dataUrl;
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveService = (service: CmsService) => {
    store.updateService(service);
    setServices([...store.getState().services]);
    alert(`Service "${service.title}" updated and published!`);
  };

  const handleAddFaq = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFaqQ || !newFaqA) return;
    store.addFaq({
      question: newFaqQ,
      answer: newFaqA,
      category: 'General'
    });
    setFaqs([...store.getState().faqs]);
    setNewFaqQ('');
    setNewFaqA('');
    alert('New FAQ question added and published!');
  };

  const handleUploadLogo = (type: 'header' | 'footer', file: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      if (typeof e.target?.result === 'string') {
        const url = e.target.result;
        const updated = {
          ...settings,
          [type === 'header' ? 'headerLogoUrl' : 'footerLogoUrl']: url
        };
        setSettings(updated);
        store.updateSettings(updated);
        setSaveSuccessMsg(`${type === 'header' ? 'Top bar (header)' : 'Footer'} logo uploaded and updated live!`);
        setTimeout(() => setSaveSuccessMsg(null), 4000);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    store.updateSettings(settings);
    setSaveSuccessMsg('Global website settings, contact info, and SEO meta tags saved!');
    setTimeout(() => setSaveSuccessMsg(null), 4000);
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-[#02167F]">
            Website Content Management System (CMS)
          </h2>
          <p className="text-xs text-slate-500">
            Publish and edit homepage hero banners, services, FAQs, and global Indiranagar business settings.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="bg-slate-200 p-1 rounded-xl flex items-center text-xs font-bold">
            <button
              onClick={() => setActiveTab('banners')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                activeTab === 'banners' ? 'bg-white text-[#02167F] shadow-xs' : 'text-slate-600'
              }`}
            >
              Hero Banners ({banners.length})
            </button>
            <button
              onClick={() => setActiveTab('services')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                activeTab === 'services' ? 'bg-white text-[#02167F] shadow-xs' : 'text-slate-600'
              }`}
            >
              Services ({services.length})
            </button>
            <button
              onClick={() => setActiveTab('faqs')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                activeTab === 'faqs' ? 'bg-white text-[#02167F] shadow-xs' : 'text-slate-600'
              }`}
            >
              FAQs ({faqs.length})
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                activeTab === 'settings' ? 'bg-white text-[#02167F] shadow-xs' : 'text-slate-600'
              }`}
            >
              Logos & Brand Settings
            </button>
          </div>

          <button
            onClick={onViewPublicSite}
            className="bg-[#FFD014] hover:bg-[#e6bb0d] text-[#02167F] font-bold px-3.5 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-xs"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>View Live Site</span>
          </button>
        </div>
      </div>

      {/* TAB 1: Hero Banners Management */}
      {activeTab === 'banners' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Column: Banners List */}
          <div className="lg:col-span-4 bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-2">
            <span className="text-xs font-bold text-slate-500 uppercase px-2 block mb-2">
              Carousel Slides (5 Banners)
            </span>
            {banners.map((b, idx) => (
              <div
                key={b.id}
                onClick={() => setSelectedBanner(b)}
                className={`p-3 rounded-xl border transition-all cursor-pointer text-xs ${
                  selectedBanner.id === b.id
                    ? 'border-[#02167F] bg-blue-50/50 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono font-bold text-[#02167F]">Slide #{idx + 1}</span>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                    b.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                  }`}>
                    {b.isActive ? 'Active' : 'Draft'}
                  </span>
                </div>
                <strong className="text-slate-900 block truncate">{b.heading} {b.headingHighlight}</strong>
                <span className="text-slate-400 text-[10px] truncate block">{b.eyebrow}</span>
              </div>
            ))}
          </div>

          {/* Right Column: Banner Live Editor */}
          <div className="lg:col-span-8 bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <h3 className="text-base font-extrabold text-[#02167F]">
                Edit Hero Banner: {selectedBanner.heading} {selectedBanner.headingHighlight}
              </h3>
              <label className="flex items-center gap-2 text-xs font-bold cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedBanner.isActive}
                  onChange={(e) => setSelectedBanner({ ...selectedBanner, isActive: e.target.checked })}
                  className="rounded text-[#02167F]"
                />
                <span>Active on Public Carousel</span>
              </label>
            </div>

            <form onSubmit={handleSaveBanner} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Eyebrow Kicker Text</label>
                <input
                  type="text"
                  value={selectedBanner.eyebrow}
                  onChange={(e) => setSelectedBanner({ ...selectedBanner, eyebrow: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-lg border border-slate-300 uppercase tracking-wider font-bold"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Primary Headline</label>
                  <input
                    type="text"
                    value={selectedBanner.heading}
                    onChange={(e) => setSelectedBanner({ ...selectedBanner, heading: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-lg border border-slate-300 font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Highlight Word (Italic Yellow)</label>
                  <input
                    type="text"
                    value={selectedBanner.headingHighlight || ''}
                    onChange={(e) => setSelectedBanner({ ...selectedBanner, headingHighlight: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-lg border border-slate-300 font-bold text-[#02167F]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Description Paragraph</label>
                <textarea
                  rows={3}
                  value={selectedBanner.description}
                  onChange={(e) => setSelectedBanner({ ...selectedBanner, description: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-lg border border-slate-300 leading-relaxed"
                ></textarea>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Primary CTA Button Label</label>
                  <input
                    type="text"
                    value={selectedBanner.ctaText}
                    onChange={(e) => setSelectedBanner({ ...selectedBanner, ctaText: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-lg border border-slate-300"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Secondary CTA Label</label>
                  <input
                    type="text"
                    value={selectedBanner.secondaryCtaText || ''}
                    onChange={(e) => setSelectedBanner({ ...selectedBanner, secondaryCtaText: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-lg border border-slate-300"
                  />
                </div>
              </div>

              {/* Enhanced PNG Hero Image Upload Section */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <label className="block font-bold text-slate-800 text-xs flex items-center gap-1.5">
                      <ImageIcon className="w-4 h-4 text-[#02167F]" />
                      <span>Hero PNG Graphic (Replaces Container on Banner)</span>
                    </label>
                    <span className="text-[11px] text-slate-500">
                      Upload transparent PNG. Image will sit directly in the container spot, anchored from bottom with height scaling as per image aspect ratio.
                    </span>
                  </div>
                  {selectedBanner.imageUrl && (
                    <button
                      type="button"
                      onClick={() => setSelectedBanner({ ...selectedBanner, imageUrl: undefined })}
                      className="text-[11px] text-red-600 font-bold hover:underline inline-flex items-center gap-1"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>Reset to Default Preset</span>
                    </button>
                  )}
                </div>

                {/* Drag and Drop Zone & Upload Options */}
                <div 
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragging(false);
                    const file = e.dataTransfer.files?.[0];
                    if (file) processUploadedFile(file);
                  }}
                  className={`border-2 border-dashed rounded-xl p-4 text-center transition-all ${
                    isDragging ? 'border-[#02167F] bg-blue-50/80 scale-[1.01]' : 'border-slate-300 hover:border-slate-400 bg-white'
                  }`}
                >
                  <input
                    type="file"
                    id="banner-png-upload"
                    accept="image/png,image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) processUploadedFile(file);
                    }}
                  />
                  
                  <div className="flex flex-col items-center justify-center gap-2">
                    <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-[#02167F]">
                      <Upload className="w-5 h-5" />
                    </div>

                    <div>
                      <label
                        htmlFor="banner-png-upload"
                        className="cursor-pointer bg-[#02167F] hover:bg-[#031d99] text-[#FFD014] font-bold px-4 py-2 rounded-lg text-xs inline-flex items-center gap-1.5 shadow-sm transition-colors"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>Browse / Upload PNG Image</span>
                      </label>
                      <p className="text-[11px] text-slate-400 mt-1.5">
                        Drag & drop transparent PNG here (e.g. delivery rider, merchant, field agent cutout)
                      </p>
                    </div>

                    <div className="inline-flex items-center gap-2 text-[11px] font-medium text-slate-600 bg-slate-100 px-3 py-1 rounded-full">
                      <Info className="w-3 h-3 text-[#02167F]" />
                      <span>Height automatically scales to match aspect ratio &bull; Anchored to bottom</span>
                    </div>
                  </div>
                </div>

                {/* Presets and Preview controls */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center pt-1">
                  <div className="sm:col-span-8 space-y-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Or Choose Instant Graphic Preset:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        { label: 'Rider & Bike', key: 'rider' },
                        { label: 'Merchant & Store', key: 'merchant' },
                        { label: 'Field Audit', key: 'audit' },
                        { label: 'MSME Partner', key: 'msme' },
                        { label: 'Franchise Partner', key: 'franchise' },
                      ].map((preset) => (
                        <button
                          key={preset.key}
                          type="button"
                          onClick={() => setSelectedBanner({
                            ...selectedBanner,
                            visualType: preset.key,
                            imageUrl: defaultHeroImages[preset.key]
                          })}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-colors ${
                            selectedBanner.visualType === preset.key && (!selectedBanner.imageUrl || selectedBanner.imageUrl === defaultHeroImages[preset.key])
                              ? 'bg-[#02167F] text-[#FFD014] border-[#02167F]'
                              : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                          }`}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>

                    <div className="pt-2 flex items-center gap-3 text-[11px] text-slate-500">
                      <span>Preview stage background:</span>
                      <button
                        type="button"
                        onClick={() => setPreviewBg('navy')}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          previewBg === 'navy' ? 'bg-[#02167F] text-white' : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        Live Hero Navy
                      </button>
                      <button
                        type="button"
                        onClick={() => setPreviewBg('checker')}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          previewBg === 'checker' ? 'bg-slate-800 text-white' : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        Transparency Grid
                      </button>
                    </div>
                  </div>

                  {/* Thumbnail Preview Stage */}
                  <div className="sm:col-span-4">
                    <div 
                      className={`rounded-xl p-2 flex items-end justify-center min-h-[140px] max-h-[160px] overflow-hidden border ${
                        previewBg === 'navy' 
                          ? 'bg-[#02167F] border-blue-900' 
                          : 'bg-slate-100 border-slate-300'
                      }`}
                      style={previewBg === 'checker' ? {
                        backgroundImage: 'linear-gradient(45deg, #e2e8f0 25%, transparent 25%), linear-gradient(-45deg, #e2e8f0 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #e2e8f0 75%), linear-gradient(-45deg, transparent 75%, #e2e8f0 75%)',
                        backgroundSize: '12px 12px',
                        backgroundPosition: '0 0, 0 6px, 6px -6px, -6px 0px'
                      } : undefined}
                    >
                      <img
                        src={getHeroBannerImage(selectedBanner.visualType, selectedBanner.imageUrl)}
                        alt="Banner Preview"
                        className="max-h-[135px] w-auto h-auto object-contain object-bottom drop-shadow-md select-none"
                      />
                    </div>
                    <span className="text-[10px] text-center text-slate-400 block mt-1">
                      {selectedBanner.imageUrl?.startsWith('data:') ? 'Custom PNG loaded (bottom anchored)' : 'Preset vector graphic'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Live Preview Box */}
              <div className="bg-[#02167F] text-white p-5 rounded-xl border border-blue-900 space-y-4 mt-4">
                <div className="flex items-center justify-between border-b border-white/10 pb-2">
                  <span className="text-[11px] font-bold text-[#FFD014] uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#FFD014]" />
                    <span>Live Carousel Slide Preview (Bottom-Anchored Image)</span>
                  </span>
                  <span className="text-[10px] text-slate-300">
                    Aspect Ratio: Auto &bull; Alignment: Bottom
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-end">
                  <div className="sm:col-span-7 space-y-2">
                    <span className="text-[10px] text-[#FFD014] font-bold tracking-widest uppercase block">
                      {selectedBanner.eyebrow}
                    </span>
                    <strong className="text-lg font-black block">
                      {selectedBanner.heading} <em className="text-[#FFD014] not-italic">{selectedBanner.headingHighlight}</em>
                    </strong>
                    <p className="text-slate-300 text-xs leading-relaxed">{selectedBanner.description}</p>
                    <div className="flex gap-2 pt-2">
                      <span className="bg-[#FFD014] text-[#02167F] font-bold px-3 py-1 rounded text-[11px]">
                        {selectedBanner.ctaText} &rarr;
                      </span>
                      {selectedBanner.secondaryCtaText && (
                        <span className="border border-white/60 text-white font-bold px-3 py-1 rounded text-[11px]">
                          {selectedBanner.secondaryCtaText}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Hero Image in place of container, coming from bottom */}
                  <div className="sm:col-span-5 flex items-end justify-center sm:justify-end min-h-[150px] overflow-visible">
                    <img
                      src={getHeroBannerImage(selectedBanner.visualType, selectedBanner.imageUrl)}
                      alt="Banner Preview"
                      className="max-h-[170px] w-auto h-auto object-contain object-bottom drop-shadow-xl"
                    />
                  </div>
                </div>
              </div>

              {/* Feedback Alert if saved */}
              {saveSuccessMsg && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-bold flex items-center gap-2 animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{saveSuccessMsg}</span>
                </div>
              )}

              <div className="pt-2 text-right">
                <button
                  type="submit"
                  className="bg-[#02167F] hover:bg-[#031d99] text-[#FFD014] font-bold px-6 py-2.5 rounded-lg text-xs shadow-md transition-all hover:shadow-lg"
                >
                  Save & Publish Banner
                </button>
              </div>
            </form>
          </div>

        </div>
      )}

      {/* TAB 2: Services Management */}
      {activeTab === 'services' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((srv) => (
            <div key={srv.id} className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-3 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="font-mono text-slate-400 font-bold">{srv.id}</span>
                <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded">
                  Live on Services Grid
                </span>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Service Title</label>
                <input
                  type="text"
                  value={srv.title}
                  onChange={(e) => {
                    srv.title = e.target.value;
                    setServices([...services]);
                  }}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Description</label>
                <textarea
                  rows={3}
                  value={srv.description}
                  onChange={(e) => {
                    srv.description = e.target.value;
                    setServices([...services]);
                  }}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300"
                ></textarea>
              </div>

              <div className="pt-2 text-right">
                <button
                  type="button"
                  onClick={() => handleSaveService(srv)}
                  className="bg-[#02167F] text-[#FFD014] font-bold px-4 py-1.5 rounded-lg text-[11px]"
                >
                  Save Changes
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 3: FAQs Management */}
      {activeTab === 'faqs' && (
        <div className="space-y-6">
          {/* Add New FAQ Card */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-base font-extrabold text-[#02167F]">
              Add New Frequently Asked Question
            </h3>
            <form onSubmit={handleAddFaq} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Question</label>
                <input
                  type="text"
                  required
                  value={newFaqQ}
                  onChange={(e) => setNewFaqQ(e.target.value)}
                  placeholder="e.g. Do you support operations in Mysore or Hubli?"
                  className="w-full px-3.5 py-2 rounded-lg border border-slate-300 font-semibold"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Answer</label>
                <textarea
                  rows={2}
                  required
                  value={newFaqA}
                  onChange={(e) => setNewFaqA(e.target.value)}
                  placeholder="Provide clear, concise answer..."
                  className="w-full px-3.5 py-2 rounded-lg border border-slate-300"
                ></textarea>
              </div>
              <div className="text-right">
                <button
                  type="submit"
                  className="bg-[#02167F] text-[#FFD014] font-bold px-5 py-2 rounded-lg text-xs"
                >
                  Publish New Question
                </button>
              </div>
            </form>
          </div>

          {/* Existing FAQs List */}
          <div className="space-y-3">
            {faqs.map((f, idx) => (
              <div key={f.id} className="bg-white p-4 rounded-xl border border-slate-200 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <strong className="text-slate-900 font-bold">{idx + 1}. {f.question}</strong>
                  <span className="font-mono text-slate-400">{f.category}</span>
                </div>
                <p className="text-slate-600 leading-relaxed">{f.answer}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: Brand & Global SEO Settings */}
      {activeTab === 'settings' && (
        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm max-w-4xl space-y-6">
          <div>
            <h3 className="text-lg font-extrabold text-[#02167F]">
              Global Brand, Website Logos & Corporate Settings
            </h3>
            <p className="text-xs text-slate-500">
              Upload top bar header logo and footer logo, and configure contact details and search engine metadata.
            </p>
          </div>

          {/* Website Logos Management Section */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
            <div>
              <h4 className="text-sm font-extrabold text-[#02167F] flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-[#02167F]" />
                <span>Website Brand Logos (Header & Footer)</span>
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">
                Upload custom transparent PNG or SVG logos. Both logos update instantly across the entire public website.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* 1. Top Bar Header Logo */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <strong className="text-xs font-bold text-slate-800">Top Bar Logo (Sticky Header)</strong>
                  {settings.headerLogoUrl && (
                    <button
                      type="button"
                      onClick={() => {
                        const updated = { ...settings, headerLogoUrl: undefined };
                        setSettings(updated);
                        store.updateSettings(updated);
                      }}
                      className="text-[11px] text-red-600 hover:underline font-bold inline-flex items-center gap-1"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>Reset Default</span>
                    </button>
                  )}
                </div>

                <p className="text-[11px] text-slate-500">
                  Rendered on the white sticky header. Recommended: PNG or SVG with transparent background (height 40px–50px).
                </p>

                {/* Preview Box on White Background */}
                <div className="h-16 bg-white border border-slate-200 rounded-lg p-2 flex items-center justify-center overflow-hidden shadow-2xs">
                  {settings.headerLogoUrl ? (
                    <img 
                      src={settings.headerLogoUrl} 
                      alt="Header Logo Preview" 
                      className="max-h-12 w-auto max-w-full object-contain"
                    />
                  ) : (
                    <div className="flex items-center gap-0.5">
                      <div className="bg-[#FFD014] text-[#02167F] font-black text-xl px-2.5 py-1 rounded-md tracking-tighter shadow-sm">
                        we
                      </div>
                      <span className="text-[#02167F] font-extrabold text-2xl tracking-tight ml-0.5">
                        nboard
                      </span>
                    </div>
                  )}
                </div>

                <div>
                  <input
                    type="file"
                    id="header-logo-upload"
                    accept="image/png,image/svg+xml,image/webp,image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleUploadLogo('header', file);
                    }}
                  />
                  <label
                    htmlFor="header-logo-upload"
                    className="cursor-pointer w-full bg-[#02167F] hover:bg-[#031d99] text-[#FFD014] font-bold py-2 px-3 rounded-lg text-xs flex items-center justify-center gap-1.5 transition-colors shadow-2xs"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload Top Bar Logo (PNG/SVG)</span>
                  </label>
                </div>
              </div>

              {/* 2. Footer Logo */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <strong className="text-xs font-bold text-slate-800">Footer Logo (Dark Section)</strong>
                  {settings.footerLogoUrl && (
                    <button
                      type="button"
                      onClick={() => {
                        const updated = { ...settings, footerLogoUrl: undefined };
                        setSettings(updated);
                        store.updateSettings(updated);
                      }}
                      className="text-[11px] text-red-600 hover:underline font-bold inline-flex items-center gap-1"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>Reset Default</span>
                    </button>
                  )}
                </div>

                <p className="text-[11px] text-slate-500">
                  Rendered on the deep navy footer (#010e54). Recommended: White or light PNG/SVG logo.
                </p>

                {/* Preview Box on Dark Navy */}
                <div className="h-16 bg-[#010e54] border border-blue-900 rounded-lg p-2 flex items-center justify-center overflow-hidden shadow-2xs">
                  {settings.footerLogoUrl ? (
                    <img 
                      src={settings.footerLogoUrl} 
                      alt="Footer Logo Preview" 
                      className="max-h-12 w-auto max-w-full object-contain"
                    />
                  ) : settings.headerLogoUrl ? (
                    <img 
                      src={settings.headerLogoUrl} 
                      alt="Footer Logo Preview" 
                      className="max-h-12 w-auto max-w-full object-contain"
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
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    id="footer-logo-upload"
                    accept="image/png,image/svg+xml,image/webp,image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleUploadLogo('footer', file);
                    }}
                  />
                  <label
                    htmlFor="footer-logo-upload"
                    className="cursor-pointer flex-1 bg-[#02167F] hover:bg-[#031d99] text-[#FFD014] font-bold py-2 px-3 rounded-lg text-xs flex items-center justify-center gap-1.5 transition-colors shadow-2xs"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload Footer Logo</span>
                  </label>
                  {settings.headerLogoUrl && !settings.footerLogoUrl && (
                    <button
                      type="button"
                      onClick={() => {
                        const updated = { ...settings, footerLogoUrl: settings.headerLogoUrl };
                        setSettings(updated);
                        store.updateSettings(updated);
                        setSaveSuccessMsg('Header logo applied to footer!');
                        setTimeout(() => setSaveSuccessMsg(null), 3000);
                      }}
                      className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2 px-2.5 rounded-lg text-xs transition-colors shrink-0"
                      title="Use same logo as top bar"
                    >
                      Sync with Header
                    </button>
                  )}
                </div>
              </div>

            </div>
          </div>

          <form onSubmit={handleSaveSettings} className="space-y-4 text-xs pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Brand Name</label>
                <input
                  type="text"
                  value={settings.companyName}
                  onChange={(e) => setSettings({ ...settings, companyName: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-lg border border-slate-300 font-bold"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Tagline</label>
                <input
                  type="text"
                  value={settings.tagline}
                  onChange={(e) => setSettings({ ...settings, tagline: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-lg border border-slate-300"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Phone Number</label>
                <input
                  type="text"
                  value={settings.phone}
                  onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-lg border border-slate-300 font-mono"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Official Email</label>
                <input
                  type="email"
                  value={settings.email}
                  onChange={(e) => setSettings({ ...settings, email: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-lg border border-slate-300"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Office Address (Indiranagar, Bangalore)</label>
              <textarea
                rows={2}
                value={settings.address}
                onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                className="w-full px-3.5 py-2 rounded-lg border border-slate-300"
              ></textarea>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Business Operating Hours</label>
              <input
                type="text"
                value={settings.businessHours}
                onChange={(e) => setSettings({ ...settings, businessHours: e.target.value })}
                className="w-full px-3.5 py-2 rounded-lg border border-slate-300"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">SEO Meta Description</label>
              <textarea
                rows={2}
                value={settings.metaDescription}
                onChange={(e) => setSettings({ ...settings, metaDescription: e.target.value })}
                className="w-full px-3.5 py-2 rounded-lg border border-slate-300 leading-normal"
              ></textarea>
            </div>

            <div className="pt-2 text-right">
              <button
                type="submit"
                className="bg-[#02167F] hover:bg-[#031d99] text-[#FFD014] font-bold px-6 py-2.5 rounded-lg text-xs shadow-md"
              >
                Save Global Settings & Meta
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
};
