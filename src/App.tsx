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
import { AcademyManager } from './components/admin/AcademyManager';
import { ProjectManager } from './components/admin/ProjectManager';
import { TeamRankManager } from './components/admin/TeamRankManager';
import { FinancialConsole } from './components/admin/FinancialConsole';
import { MsmeManager } from './components/admin/MsmeManager';
import { ClientFranchiseManager } from './components/admin/ClientFranchiseManager';
import { CmsManager } from './components/admin/CmsManager';
import { UserManager } from './components/admin/UserManager';
import { AuditLogViewer } from './components/admin/AuditLogViewer';
import { HostingerDeployModal } from './components/admin/HostingerDeployModal';
import { InstallerModal } from './components/admin/InstallerModal';

// Icons
// (Quick Portal bottom bar removed per user requirement)

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

      {/* 3. FREELANCER SELF-SERVICE PORTAL */}
      {currentView === 'freelancer' && (
        <FreelancerPortal
          onBack={() => {
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
              {adminTab === 'academy' && <AcademyManager />}
              {adminTab === 'projects' && <ProjectManager />}
              {adminTab === 'teams' && <TeamRankManager />}
              {adminTab === 'financial' && <FinancialConsole />}
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

    </div>
  );
}
