import React, { useState, useEffect } from 'react';
import { store } from './services/store';
import { api } from './services/api';

// Public Components
import { Header } from './components/public/Header';
import { HeroSlider } from './components/public/HeroSlider';
import { ServicesSection } from './components/public/ServicesSection';
import { WhyChooseUs } from './components/public/WhyChooseUs';
import { ProcessSteps } from './components/public/ProcessSteps';
import { AudienceSection } from './components/public/AudienceSection';
import { ImpactSection } from './components/public/ImpactSection';
import { PilotSection } from './components/public/PilotSection';
import { AboutSection } from './components/public/AboutSection';
import { FaqSection } from './components/public/FaqSection';
import { ContactForm } from './components/public/ContactForm';
import { Footer } from './components/public/Footer';
import { FreelancerRegisterPage } from './components/public/FreelancerRegisterPage';
import { MsmeRequestModal } from './components/public/MsmeRequestModal';
import { PilotPlanModal } from './components/public/PilotPlanModal';

// Freelancer Portal Components
import { FreelancerPortal } from './components/freelancer/FreelancerPortal';
import { FreelancerUnderDevelopment } from './components/freelancer/FreelancerUnderDevelopment';

// Admin Components
import { AdminLayout } from './components/admin/AdminLayout';
import { AdminLogin } from './components/admin/AdminLogin';
import { DashboardOverview } from './components/admin/DashboardOverview';
import { EnquiryManager } from './components/admin/EnquiryManager';
import { FreelancerManager } from './components/admin/FreelancerManager';
import { ProjectManager } from './components/admin/ProjectManager';
import { MsmeManager } from './components/admin/MsmeManager';
import { ClientFranchiseManager } from './components/admin/ClientFranchiseManager';
import { CmsManager } from './components/admin/CmsManager';
import { UserManager } from './components/admin/UserManager';
import { AuditLogViewer } from './components/admin/AuditLogViewer';
import { HostingerDeployModal } from './components/admin/HostingerDeployModal';
import { InstallerModal } from './components/admin/InstallerModal';

// Icons for quick switcher
import { Globe, UserCheck, UserPlus, Download, Wrench } from 'lucide-react';

export default function App() {
  const [currentView, setCurrentView] = useState<'website' | 'admin' | 'freelancer' | 'freelancer-register'>('website');
  const [adminTab, setAdminTab] = useState<string>('dashboard');
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState<boolean>(Boolean(store.getState().currentAdmin));

  // Modals
  const [showPilotModal, setShowPilotModal] = useState<boolean>(false);
  const [showMsmeModal, setShowMsmeModal] = useState<boolean>(false);
  const [showHostingerModal, setShowHostingerModal] = useState<boolean>(false);
  const [showInstallerModal, setShowInstallerModal] = useState<boolean>(false);
  const [preselectedService, setPreselectedService] = useState<string>('');

  // Force re-render on store changes
  const [, setTick] = useState(0);
  useEffect(() => {
    api.getCurrentAdmin().catch(() => {});
    return store.subscribe(() => {
      setTick((t) => t + 1);
      setIsAdminLoggedIn(Boolean(store.getState().currentAdmin));
    });
  }, []);

  // Listen to slug / hash changes for direct linking (e.g. /#admin, /#freelancer, etc.)
  useEffect(() => {
    const handleRoute = () => {
      const hash = window.location.hash.toLowerCase();
      const path = window.location.pathname.toLowerCase();
      const search = window.location.search.toLowerCase();
      if (
        hash === '#admin' || 
        hash === '#/admin' || 
        hash === '#admin-portal' || 
        path === '/admin' || 
        path === '/admin/' || 
        path.startsWith('/admin') || 
        search.includes('admin')
      ) {
        setCurrentView('admin');
      } else if (hash === '#freelancer' || hash === '#/freelancer' || path === '/freelancer' || path.startsWith('/freelancer') || search.includes('freelancer')) {
        setCurrentView('freelancer');
      } else if (hash === '#freelancer-register' || hash === '#join' || hash === '#join-as-freelancer' || path === '/join-as-freelancer.php' || search.includes('join')) {
        setCurrentView('freelancer-register');
      }
    };
    handleRoute();
    window.addEventListener('hashchange', handleRoute);
    window.addEventListener('popstate', handleRoute);
    return () => {
      window.removeEventListener('hashchange', handleRoute);
      window.removeEventListener('popstate', handleRoute);
    };
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-[#FFD014] selection:text-[#02167F]">
      
      {/* 1. PUBLIC WEBSITE VIEW */}
      {currentView === 'website' && (
        <>
          <Header
            onNavigate={(view) => setCurrentView(view)}
            onOpenPilotModal={() => setShowPilotModal(true)}
            onOpenFreelancerModal={() => setCurrentView('freelancer-register')}
          />
          <main>
            <HeroSlider
              onNavigate={(view) => setCurrentView(view)}
              onOpenPilotModal={() => setShowPilotModal(true)}
            />
            <ServicesSection
              onSelectServiceForEnquiry={(srv) => {
                setPreselectedService(srv);
                const el = document.getElementById('contact');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
            />
            <WhyChooseUs />
            <ProcessSteps />
            <AudienceSection
              onOpenBusinessEnquiry={() => {
                const el = document.getElementById('contact');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
              onOpenFreelancerRegister={() => setCurrentView('freelancer-register')}
              onOpenMsmeModal={() => setShowMsmeModal(true)}
            />
            <ImpactSection />
            <PilotSection onOpenPilotModal={() => setShowPilotModal(true)} />
            <AboutSection />
            <FaqSection />
            <ContactForm preselectedService={preselectedService} />
          </main>
          <Footer onNavigate={(view) => setCurrentView(view)} />
        </>
      )}

      {/* 2. FREELANCER REGISTRATION PAGE ROUTE (/join-as-freelancer.php) */}
      {currentView === 'freelancer-register' && (
        <FreelancerRegisterPage
          onBack={() => setCurrentView('website')}
          onOpenPortal={() => setCurrentView('freelancer')}
        />
      )}

      {/* 3. FREELANCER SELF-SERVICE PORTAL ROUTE (UNDER DEVELOPMENT) */}
      {currentView === 'freelancer' && (
        <FreelancerUnderDevelopment
          onBackToWebsite={() => {
            setCurrentView('website');
            window.location.hash = '';
          }}
          onOpenRegister={() => {
            setCurrentView('freelancer-register');
            window.location.hash = '#join-as-freelancer';
          }}
        />
      )}

      {/* 4. ADMIN BACKEND PANEL (/admin/login.php & /admin/dashboard.php) */}
      {currentView === 'admin' && (
        <>
          {!isAdminLoggedIn ? (
            <AdminLogin
              onSuccess={() => setIsAdminLoggedIn(true)}
              onBackToWebsite={() => {
                setCurrentView('website');
                window.location.hash = '';
              }}
            />
          ) : (
            <AdminLayout
              currentTab={adminTab}
              onSelectTab={(tab) => setAdminTab(tab)}
              onViewPublicSite={() => {
                setCurrentView('website');
                window.location.hash = '';
              }}
              onOpenHostingerModal={() => setShowHostingerModal(true)}
            >
              {adminTab === 'dashboard' && (
                <DashboardOverview onSelectTab={(tab) => setAdminTab(tab)} />
              )}
              {adminTab === 'enquiries' && <EnquiryManager />}
              {adminTab === 'freelancers' && <FreelancerManager />}
              {adminTab === 'projects' && <ProjectManager />}
              {adminTab === 'msme' && <MsmeManager />}
              {adminTab === 'clients' && <ClientFranchiseManager />}
              {adminTab === 'cms' && (
                <CmsManager onViewPublicSite={() => {
                  setCurrentView('website');
                  window.location.hash = '';
                }} />
              )}
              {adminTab === 'users' && <UserManager />}
              {adminTab === 'audit' && <AuditLogViewer />}
            </AdminLayout>
          )}
        </>
      )}

      {/* GLOBAL MODALS */}
      {showPilotModal && (
        <PilotPlanModal onClose={() => setShowPilotModal(false)} />
      )}
      {showMsmeModal && (
        <MsmeRequestModal onClose={() => setShowMsmeModal(false)} />
      )}
      {showHostingerModal && (
        <HostingerDeployModal onClose={() => setShowHostingerModal(false)} />
      )}
      {showInstallerModal && (
        <InstallerModal onClose={() => setShowInstallerModal(false)} />
      )}

      {/* BOTTOM FLOATING ENVIRONMENT TESTER SWITCHER (Accessible in all views) */}
      <div className="fixed bottom-4 left-4 z-50 flex flex-wrap items-center gap-1.5 bg-[#02167F]/95 text-white p-2 rounded-2xl shadow-2xl border border-white/20 backdrop-blur-md text-[11px] font-bold">
        <span className="text-[#FFD014] px-2 py-0.5 uppercase tracking-wider text-[10px]">
          Quick Portal:
        </span>

        <button
          onClick={() => {
            setCurrentView('website');
            window.location.hash = '';
          }}
          className={`px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1 ${
            currentView === 'website' ? 'bg-[#FFD014] text-[#02167F]' : 'hover:bg-white/10 text-white'
          }`}
          title="Approved Public Website"
        >
          <Globe className="w-3 h-3" />
          <span>Public Website</span>
        </button>

        <button
          onClick={() => {
            setCurrentView('freelancer');
            window.location.hash = '#freelancer';
          }}
          className={`px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1 ${
            currentView === 'freelancer' ? 'bg-[#FFD014] text-[#02167F]' : 'hover:bg-white/10 text-white'
          }`}
          title="Freelancer Self-Service Portal (Under Development)"
        >
          <UserCheck className="w-3 h-3" />
          <span>Freelancer Portal</span>
        </button>

        <button
          onClick={() => {
            setCurrentView('freelancer-register');
            window.location.hash = '#join-as-freelancer';
          }}
          className={`px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1 ${
            currentView === 'freelancer-register' ? 'bg-[#FFD014] text-[#02167F]' : 'hover:bg-white/10 text-white'
          }`}
          title="Public Freelancer Registration Form"
        >
          <UserPlus className="w-3 h-3" />
          <span>Join as Freelancer</span>
        </button>

        <div className="w-px h-4 bg-white/20 mx-0.5"></div>

        <button
          onClick={() => setShowHostingerModal(true)}
          className="bg-amber-400 hover:bg-amber-300 text-slate-900 px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1 font-extrabold shadow-sm"
          title="Download Hostinger Business Shared Hosting Package (.zip)"
        >
          <Download className="w-3 h-3" />
          <span>Hostinger .ZIP</span>
        </button>

        <button
          onClick={() => setShowInstallerModal(true)}
          className="bg-white/10 hover:bg-white/20 text-slate-200 px-2 py-1 rounded-lg transition-colors flex items-center gap-1"
          title="Simulate /install.php one-time setup"
        >
          <Wrench className="w-3 h-3" />
          <span>Installer</span>
        </button>
      </div>

    </div>
  );
}
