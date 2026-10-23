import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  LogOut, 
  CheckCircle2, 
  Clock, 
  Upload, 
  AlertCircle, 
  Briefcase, 
  Award, 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  FileText, 
  ShieldCheck, 
  Bell, 
  Globe, 
  Lock, 
  RefreshCw, 
  ExternalLink,
  ChevronRight,
  X,
  Eye,
  AlertTriangle,
  Info,
  Crown,
  Network,
  TrendingUp,
  Check,
  Wallet,
  FolderKanban,
  Sparkles,
  Shield
} from 'lucide-react';
import { store } from '../../services/store';
import { api } from '../../services/api';
import { Freelancer, FreelancerDocument } from '../../types';
import { FreelancerAcademyView } from '../academy/FreelancerAcademyView';
import { FreelancerTaskHub } from './FreelancerTaskHub';
import { FreelancerWalletView } from './FreelancerWalletView';

interface FreelancerPortalProps {
  onBack: () => void;
  onOpenRegister?: () => void;
}

const DOCUMENT_TYPES = [
  { id: 'Aadhaar / National ID', label: 'Aadhaar Card / National ID', desc: 'Front and back scan with legible UID and photo', required: true },
  { id: 'PAN / Tax ID', label: 'PAN Card / Tax ID', desc: 'Permanent Account Number card for payout taxation', required: true },
  { id: 'Driving License / Address Proof', label: 'Driving License / Address Proof', desc: 'Valid DL, voter card or utility bill for field corridor verification', required: true },
  { id: 'Bank Details / Cancelled Cheque', label: 'Bank Details / Cancelled Cheque', desc: 'Bank passbook front page or cancelled cheque for direct NEFT/IMPS payouts', required: true },
  { id: 'Educational Certificate', label: 'Educational Certificate', desc: '10th, 12th or degree certificate (optional)', required: false }
];

export const FreelancerPortal: React.FC<FreelancerPortalProps> = ({ onBack, onOpenRegister }) => {
  const [currentUser, setCurrentUser] = useState<Freelancer | null>(store.getState().currentFreelancer);
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const [activeTab, setActiveTab] = useState<'kyc' | 'profile' | 'academy' | 'tasks' | 'performance' | 'wallet' | 'team-leader' | 'manager-ops'>('kyc');
  const [showNotifications, setShowNotifications] = useState(false);
  const [performanceData, setPerformanceData] = useState<any | null>(null);
  const [loadingPerformance, setLoadingPerformance] = useState(false);

  // KYC Upload Modal State
  const [uploadDocType, setUploadDocType] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccessMsg, setUploadSuccessMsg] = useState<string | null>(null);

  // Settings / Password State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [passwordMsg, setPasswordMsg] = useState<{ text: string; isError: boolean } | null>(null);
  const [isChangingPass, setIsChangingPass] = useState(false);

  // Language preference
  const [selectedLang, setSelectedLang] = useState<string>('en');

  // Hydrate session from server on mount
  useEffect(() => {
    let isMounted = true;
    api.getCurrentFreelancer()
      .then((fl) => {
        if (isMounted && fl) {
          setCurrentUser(fl);
          if (fl.languagePreference) setSelectedLang(fl.languagePreference);
        }
      })
      .catch(() => {});

    const unsubscribe = store.subscribe(() => {
      if (isMounted) {
        const fl = store.getState().currentFreelancer;
        setCurrentUser(fl);
        if (fl?.languagePreference) setSelectedLang(fl.languagePreference);
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  // Hydrate Phase 6 performance data
  useEffect(() => {
    if (currentUser) {
      setLoadingPerformance(true);
      api.getFreelancerPerformance()
        .then((res) => {
          if (res?.success) setPerformanceData(res);
        })
        .catch(() => {})
        .finally(() => setLoadingPerformance(false));
    }
  }, [currentUser, activeTab]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    if (!loginIdentifier.trim() || !loginPassword) {
      setLoginError('Please enter your registered email/phone and password.');
      return;
    }

    setIsLoggingIn(true);
    try {
      const res = await api.loginFreelancer(loginIdentifier.trim(), loginPassword);
      if (res.success && res.data?.user) {
        setCurrentUser(res.data.user);
        if (res.data.user.languagePreference) {
          setSelectedLang(res.data.user.languagePreference);
        }
      } else {
        setLoginError(res.error || 'Invalid credentials. Please verify your details.');
      }
    } catch {
      setLoginError('Authentication failed. Please check your network connection.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    await api.logoutFreelancer();
    setCurrentUser(null);
  };

  const handleDemoQuickLogin = (demoId: string) => {
    setLoginError(null);
    let success = store.loginFreelancer(demoId);
    if (!success) {
      store.seedDemoData();
      success = store.loginFreelancer(demoId);
    }
    if (success) {
      const user = store.getState().currentFreelancer;
      if (user) {
        setCurrentUser(user);
        if (user.currentRank === 'Team Leader') {
          setActiveTab('team-leader');
        } else if (user.currentRank === 'Manager') {
          setActiveTab('manager-ops');
        } else {
          setActiveTab('tasks');
        }
      }
    }
  };

  const handleLanguageChange = async (lang: string) => {
    setSelectedLang(lang);
    if (currentUser) {
      await api.updateFreelancerProfile({ language_preference: lang });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError(null);
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 5 * 1024 * 1024) {
        setUploadError('File exceeds 5MB size limit.');
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleKycSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadDocType || !selectedFile) {
      setUploadError('Please select a valid document file.');
      return;
    }

    setIsUploading(true);
    setUploadError(null);
    setUploadSuccessMsg(null);

    const formData = new FormData();
    formData.append('document_type', uploadDocType);
    formData.append('document', selectedFile);

    try {
      const res = await api.uploadKycDocument(formData);
      if (res.success) {
        setUploadSuccessMsg(res.message);
        setTimeout(() => {
          setUploadDocType(null);
          setSelectedFile(null);
          setUploadSuccessMsg(null);
        }, 1500);
      } else {
        setUploadError(res.error || 'Upload was rejected by server.');
      }
    } catch {
      setUploadError('Network error uploading document.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMsg(null);

    if (!currentPassword || !newPassword) {
      setPasswordMsg({ text: 'All password fields are required.', isError: true });
      return;
    }

    if (newPassword.length < 8) {
      setPasswordMsg({ text: 'New password must be at least 8 characters long.', isError: true });
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setPasswordMsg({ text: 'New passwords do not match.', isError: true });
      return;
    }

    setIsChangingPass(true);
    try {
      const res = await api.changeFreelancerPassword(currentPassword, newPassword);
      if (res.success) {
        setPasswordMsg({ text: 'Password changed successfully.', isError: false });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmNewPassword('');
      } else {
        setPasswordMsg({ text: res.error || 'Password update failed.', isError: true });
      }
    } catch {
      setPasswordMsg({ text: 'Network error updating password.', isError: true });
    } finally {
      setIsChangingPass(false);
    }
  };

  // 1. UNAUTHENTICATED STATE: LOGIN SCREEN
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-auto mx-auto space-y-6">
          
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-xs font-bold text-[#02167F] hover:text-[#031d99] bg-white border border-slate-200 px-3.5 py-2 rounded-lg shadow-xs cursor-pointer transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to We Onboard Website</span>
          </button>

          <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-xl space-y-6">
            <div className="text-center space-y-2">
              <div className="bg-[#FFD014] text-[#02167F] font-black text-xl px-3 py-1 rounded-md inline-block">
                we<span className="font-extrabold">onboard</span>
              </div>
              <h2 className="text-2xl font-extrabold text-[#02167F]">
                Freelancer Portal Login
              </h2>
              <p className="text-xs text-slate-500">
                Log in to submit KYC documents, check verification status, and manage your field associate profile.
              </p>
            </div>

            {loginError && (
              <div className="bg-red-50 border border-red-200 text-red-800 text-xs rounded-xl p-3 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <span className="font-semibold">{loginError}</span>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Registered Email, Phone, or Reference ID
                </label>
                <input
                  type="text"
                  required
                  value={loginIdentifier}
                  onChange={(e) => setLoginIdentifier(e.target.value)}
                  placeholder="e.g. WO-FR-2026-0042 or 9845012345"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-[#02167F] focus:outline-none bg-white"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700">
                    Password
                  </label>
                </div>
                <input
                  type="password"
                  required
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="Enter your account password"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-[#02167F] focus:outline-none bg-white"
                />
              </div>

              <button
                type="submit"
                disabled={isLoggingIn}
                className="w-full bg-[#02167F] hover:bg-[#031d99] text-[#FFD014] font-extrabold py-3 px-4 rounded-xl text-sm transition-colors shadow-md disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
              >
                <Lock className="w-4 h-4" />
                <span>{isLoggingIn ? 'Verifying Credentials...' : 'Sign In to Portal'}</span>
              </button>
            </form>

            {/* Zero fee reminder & Register link */}
            <div className="pt-4 border-t border-slate-200 text-center space-y-2">
              <p className="text-xs text-slate-600">
                Don't have an associate account yet?
              </p>
              {onOpenRegister && (
                <button
                  type="button"
                  onClick={onOpenRegister}
                  className="text-xs font-bold text-[#02167F] hover:underline cursor-pointer"
                >
                  Register as Freelancer &rarr; Zero Joining Fee
                </button>
              )}
            </div>
          </div>

          {/* DEMONSTRATION & ROLE TESTING ACCOUNTS */}
          <div className="bg-slate-900 text-white rounded-2xl p-6 border border-slate-800 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="bg-[#FFD014] text-[#02167F] font-black text-[10px] px-2 py-0.5 rounded uppercase tracking-wider">
                  DEMO DATASET
                </span>
                <span className="text-xs font-bold text-slate-200">Test Organizational Roles</span>
              </div>
              <Sparkles className="w-4 h-4 text-[#FFD014]" />
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Click any verified test profile below to instantly log in and test role-scoped workflows, task dispatch, QC reviews, and ledger-backed wallets:
            </p>

            <div className="space-y-2.5">
              {/* Role 1: Team Member - Pooja */}
              <button
                type="button"
                onClick={() => handleDemoQuickLogin('DEMO-TM-01')}
                className="w-full text-left p-3 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 hover:border-[#FFD014]/50 transition-all cursor-pointer group flex items-center justify-between"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white group-hover:text-[#FFD014] transition-colors">
                      Pooja Hegde
                    </span>
                    <span className="text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-1.5 py-0.5 rounded">
                      Team Member
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    Retail Merchant Onboarding &bull; Indiranagar &bull; ₹1,512 Wallet
                  </span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-[#FFD014] transition-colors" />
              </button>

              {/* Role 2: Team Member - Imran */}
              <button
                type="button"
                onClick={() => handleDemoQuickLogin('DEMO-TM-02')}
                className="w-full text-left p-3 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 hover:border-[#FFD014]/50 transition-all cursor-pointer group flex items-center justify-between"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white group-hover:text-[#FFD014] transition-colors">
                      Imran Khan
                    </span>
                    <span className="text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-1.5 py-0.5 rounded">
                      Team Member
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    Restaurant & MSME Audit &bull; BTM/HSR &bull; 1 Rework Task Demo
                  </span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-[#FFD014] transition-colors" />
              </button>

              {/* Role 3: Team Leader - Rajesh */}
              <button
                type="button"
                onClick={() => handleDemoQuickLogin('DEMO-TL-01')}
                className="w-full text-left p-3 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 hover:border-[#FFD014]/50 transition-all cursor-pointer group flex items-center justify-between"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white group-hover:text-[#FFD014] transition-colors">
                      Rajesh Gowda
                    </span>
                    <span className="text-[10px] font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/30 px-1.5 py-0.5 rounded">
                      Team Leader
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    Team Alpha Leader &bull; 20% Overrides &bull; QS: 91.0 &bull; 2 Field Associates
                  </span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-[#FFD014] transition-colors" />
              </button>

              {/* Role 4: Area Operations Manager - Sanjay */}
              <button
                type="button"
                onClick={() => handleDemoQuickLogin('DEMO-MGR-01')}
                className="w-full text-left p-3 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 hover:border-[#FFD014]/50 transition-all cursor-pointer group flex items-center justify-between"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white group-hover:text-[#FFD014] transition-colors">
                      Sanjay Verma
                    </span>
                    <span className="text-[10px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1.5 py-0.5 rounded">
                      Area Operations Manager
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    Projects 1, 2 & 3 Governance &bull; 10% Supervision Overrides &bull; QS: 94.5
                  </span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-[#FFD014] transition-colors" />
              </button>
            </div>
          </div>

        </div>
      </div>
    );
  }

  // 2. AUTHENTICATED STATE: FREELANCER DASHBOARD
  const docs = currentUser.documents || [];
  const notifications = currentUser.notifications || [];
  const unreadNotifCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col selection:bg-[#FFD014] selection:text-[#02167F]">
      
      {/* Top Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              title="Return to website"
              className="text-slate-500 hover:text-[#02167F] p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2">
              <span className="bg-[#FFD014] text-[#02167F] font-black text-sm px-2.5 py-0.5 rounded">
                we<span className="font-extrabold">onboard</span>
              </span>
              <span className="text-xs font-bold text-slate-700 hidden sm:inline">
                Freelancer Portal
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Quick Demo Role Switcher (Testing Mode) */}
            {currentUser.id.startsWith('DEMO-') && (
              <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-300 text-amber-900 rounded-lg px-2.5 py-1 text-xs shadow-xs">
                <span className="font-bold text-[10px] uppercase tracking-wider text-amber-800 hidden md:inline">
                  Demo Role:
                </span>
                <select
                  value={currentUser.id}
                  onChange={(e) => handleDemoQuickLogin(e.target.value)}
                  className="bg-transparent font-bold text-xs text-[#02167F] focus:outline-none cursor-pointer"
                  title="Switch between demonstration roles"
                >
                  <option value="DEMO-TM-01">Pooja (Team Member)</option>
                  <option value="DEMO-TM-02">Imran (Team Member)</option>
                  <option value="DEMO-TL-01">Rajesh (Team Leader)</option>
                  <option value="DEMO-MGR-01">Sanjay (Area Manager)</option>
                </select>
              </div>
            )}

            {/* Language Selector */}
            <div className="flex items-center gap-1 text-xs text-slate-600 bg-slate-100 rounded-lg p-1">
              <Globe className="w-3.5 h-3.5 text-slate-500 ml-1" />
              <select
                value={selectedLang}
                onChange={(e) => handleLanguageChange(e.target.value)}
                className="bg-transparent text-xs font-semibold focus:outline-none cursor-pointer pr-1"
              >
                <option value="en">English</option>
                <option value="kn">ಕನ್ನಡ (Kannada)</option>
                <option value="hi">हिंदी (Hindi)</option>
                <option value="ta">தமிழ் (Tamil)</option>
                <option value="te">తెలుగు (Telugu)</option>
              </select>
            </div>

            {/* Notifications Dropdown Toggle */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 relative cursor-pointer"
                title="Notifications"
              >
                <Bell className="w-4 h-4" />
                {unreadNotifCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-600 text-white text-[10px] font-black rounded-full flex items-center justify-center">
                    {unreadNotifCount}
                  </span>
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-slate-200 p-4 z-40 space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <strong className="text-xs font-bold text-slate-800">Operational Notifications</strong>
                    <button
                      onClick={() => setShowNotifications(false)}
                      className="text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="max-h-64 overflow-y-auto space-y-2 text-xs">
                    {notifications.length === 0 ? (
                      <p className="text-slate-400 text-center py-4">No notifications yet.</p>
                    ) : (
                      notifications.map((n) => (
                        <div key={n.id} className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 space-y-1">
                          <strong className="block text-slate-800 font-semibold">{n.title}</strong>
                          <p className="text-slate-600 text-[11px] leading-relaxed">{n.message}</p>
                          <span className="text-[10px] text-slate-400 block">{n.createdAt}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 text-xs font-bold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>

        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-6 flex-1">
        
        {/* Associate Identity & Status Card */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                <span className="font-mono font-bold text-[#02167F]">{currentUser.registrationRef || currentUser.id}</span>
                <span>·</span>
                <span>{currentUser.preferredRole}</span>
                <span>·</span>
                <span>{currentUser.city}, {currentUser.state}</span>
              </div>
              <h1 className="text-2xl font-extrabold text-[#02167F]">
                Welcome, {currentUser.fullName}
              </h1>
            </div>

            {/* Onboarding Status Badge (Quiet unboxed typography with dot) */}
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3.5 py-2 rounded-xl self-start sm:self-auto">
              <span className={`w-2 h-2 rounded-full ${
                currentUser.onboardingStatus === 'Approved' ? 'bg-emerald-500' :
                currentUser.onboardingStatus === 'Action Required' ? 'bg-red-500' :
                currentUser.onboardingStatus === 'Under Review' ? 'bg-blue-500' :
                'bg-amber-500'
              }`} />
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Onboarding Status</span>
                <strong className="text-xs text-slate-800 block">
                  {currentUser.onboardingStatus || 'KYC Pending'}
                </strong>
              </div>
            </div>
          </div>

          {/* Profile Completion Bar */}
          <div className="pt-2 border-t border-slate-100 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-700">Profile & Verification Completion</span>
              <span className="font-mono font-bold text-[#02167F]">{currentUser.profileCompletedPercent || 60}%</span>
            </div>
            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-[#02167F] transition-all duration-500 rounded-full"
                style={{ width: `${currentUser.profileCompletedPercent || 60}%` }}
              />
            </div>
            <p className="text-[11px] text-slate-500">
              Complete your KYC document upload to reach 100% and unlock field corridor assignments.
            </p>
          </div>
        </div>

        {/* Navigation Tabs (Functional buttons per design guidelines) */}
        <div className="flex items-center gap-1 p-1 bg-slate-200/70 rounded-xl overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('kyc')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer shrink-0 ${
              activeTab === 'kyc' ? 'bg-white text-[#02167F] shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            KYC & Document Verification
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer shrink-0 ${
              activeTab === 'profile' ? 'bg-white text-[#02167F] shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Profile & Settings
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('academy')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer shrink-0 ${
              activeTab === 'academy' ? 'bg-white text-[#02167F] shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Operational Academy & Certifications
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('tasks')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer shrink-0 ${
              activeTab === 'tasks' ? 'bg-white text-[#02167F] shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Field Tasks & Payouts (Phase 5)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('performance')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer shrink-0 flex items-center gap-1.5 ${
              activeTab === 'performance' ? 'bg-white text-[#02167F] shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Award className="w-3.5 h-3.5" />
            <span>Performance & Rank Engine (Phase 6)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('wallet')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer shrink-0 flex items-center gap-1.5 ${
              activeTab === 'wallet' ? 'bg-white text-[#02167F] shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Wallet className="w-3.5 h-3.5" />
            <span>Earnings & Wallet (Phase 7)</span>
          </button>

          {/* TAB: TEAM LEADER VIEW */}
          {(currentUser.currentRank === 'Team Leader' || currentUser.id === 'DEMO-TL-01') && (
            <button
              type="button"
              onClick={() => setActiveTab('team-leader')}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer shrink-0 flex items-center gap-1.5 ${
                activeTab === 'team-leader' ? 'bg-[#02167F] text-[#FFD014] shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Network className="w-3.5 h-3.5 text-[#FFD014]" />
              <span>Team Leadership (Team Alpha)</span>
            </button>
          )}

          {/* TAB: MANAGER VIEW */}
          {(currentUser.currentRank === 'Manager' || currentUser.id === 'DEMO-MGR-01') && (
            <button
              type="button"
              onClick={() => setActiveTab('manager-ops')}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer shrink-0 flex items-center gap-1.5 ${
                activeTab === 'manager-ops' ? 'bg-[#02167F] text-[#FFD014] shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Briefcase className="w-3.5 h-3.5 text-[#FFD014]" />
              <span>Area Operations & Projects</span>
            </button>
          )}
        </div>

        {/* TAB 1: KYC WORKFLOW */}
        {activeTab === 'kyc' && (
          <div className="space-y-6">
            
            {/* Info Notice */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-xs text-blue-900 space-y-1">
              <strong className="block text-sm font-bold text-[#02167F] flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-[#02167F]" />
                <span>Zero Fee Identity Verification Protocol</span>
              </strong>
              <p>
                All documents are stored in private encrypted storage and reviewed exclusively by verified We Onboard operations coordinators. 
                We never charge verification fees. Please upload clear scans in PDF, JPG, PNG or WEBP format (max 5MB each).
              </p>
            </div>

            {/* Document Checklist Grid */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden divide-y divide-slate-100">
              <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <strong className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Required Identity Documents
                </strong>
                <span className="text-xs text-slate-500">
                  {docs.filter((d) => d.status === 'Approved').length} of {DOCUMENT_TYPES.filter(t => t.required).length} Required Approved
                </span>
              </div>

              {DOCUMENT_TYPES.map((type) => {
                const existing = docs.find((d) => d.name === type.id || d.type === type.id);
                const isApproved = existing?.status === 'Approved';
                const isPending = existing?.status === 'Pending';
                const isRejected = existing?.status === 'Rejected';
                const isResubmission = existing?.status === 'Resubmission Required';

                return (
                  <div key={type.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1 max-w-lg">
                      <div className="flex items-center gap-2">
                        <strong className="text-sm font-bold text-slate-900">{type.label}</strong>
                        {type.required ? (
                          <span className="text-[10px] font-bold text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded">Required</span>
                        ) : (
                          <span className="text-[10px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded">Optional</span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500">{type.desc}</p>
                      
                      {existing && (
                        <div className="text-xs pt-1 flex items-center gap-2 text-slate-600">
                          <FileText className="w-3.5 h-3.5 text-slate-400" />
                          <span className="font-mono text-[11px]">{existing.fileName}</span>
                          <span className="text-slate-300">·</span>
                          <span className="text-slate-400 text-[10px]">Uploaded: {existing.uploadedAt}</span>
                        </div>
                      )}

                      {/* Display reviewer reason for rejection or resubmission */}
                      {(isRejected || isResubmission) && existing?.rejectionReason && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-2.5 text-xs text-red-800 mt-2 space-y-0.5">
                          <strong className="block font-bold">Coordinator Review Note:</strong>
                          <p>{existing.rejectionReason}</p>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      {/* Status indicator */}
                      <div>
                        {isApproved && (
                          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            <span>Approved</span>
                          </span>
                        )}
                        {isPending && (
                          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-lg">
                            <Clock className="w-4 h-4 text-amber-600" />
                            <span>Pending Review</span>
                          </span>
                        )}
                        {isResubmission && (
                          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-purple-700 bg-purple-50 border border-purple-200 px-3 py-1.5 rounded-lg">
                            <AlertTriangle className="w-4 h-4 text-purple-600" />
                            <span>Resubmission Required</span>
                          </span>
                        )}
                        {isRejected && (
                          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-red-700 bg-red-50 border border-red-200 px-3 py-1.5 rounded-lg">
                            <AlertCircle className="w-4 h-4 text-red-600" />
                            <span>Rejected</span>
                          </span>
                        )}
                        {!existing && (
                          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-lg">
                            <span>Not Submitted</span>
                          </span>
                        )}
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-2">
                        {existing && (
                          <a
                            href={`${api.getBaseUrl()}/freelancers/kyc/view.php?id=${existing.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 border border-slate-200 hover:bg-slate-50 rounded-lg text-slate-600"
                            title="View Secure Document"
                          >
                            <Eye className="w-4 h-4" />
                          </a>
                        )}

                        <button
                          type="button"
                          onClick={() => {
                            setUploadDocType(type.id);
                            setSelectedFile(null);
                            setUploadError(null);
                            setUploadSuccessMsg(null);
                          }}
                          className="bg-[#02167F] hover:bg-[#031d99] text-[#FFD014] font-bold text-xs px-3.5 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
                        >
                          <Upload className="w-3.5 h-3.5" />
                          <span>{existing ? 'Replace Document' : 'Upload File'}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

          </div>
        )}

        {/* TAB 2: PROFILE & SETTINGS */}
        {activeTab === 'profile' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Profile Overview Box */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 space-y-4">
              <h3 className="text-base font-extrabold text-[#02167F] flex items-center gap-2">
                <User className="w-4 h-4 text-[#02167F]" />
                <span>Associate Profile Details</span>
              </h3>

              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-slate-400 font-bold block">Legal Name</span>
                  <strong className="text-slate-800 text-sm">{currentUser.fullName}</strong>
                </div>
                <div>
                  <span className="text-slate-400 font-bold block">Mobile Number</span>
                  <strong className="text-slate-800">{currentUser.phone}</strong>
                </div>
                <div>
                  <span className="text-slate-400 font-bold block">Email Address</span>
                  <strong className="text-slate-800">{currentUser.email}</strong>
                </div>
                <div>
                  <span className="text-slate-400 font-bold block">Date of Birth & Gender</span>
                  <strong className="text-slate-800">{currentUser.dob} · {currentUser.gender || 'Not specified'}</strong>
                </div>
                <div>
                  <span className="text-slate-400 font-bold block">Residential Address</span>
                  <p className="text-slate-700">{currentUser.residentialAddress}, {currentUser.city}, {currentUser.state} - {currentUser.pinCode}</p>
                </div>
                <div>
                  <span className="text-slate-400 font-bold block">Skills & Expertise</span>
                  <div className="flex flex-wrap gap-1 pt-1">
                    {currentUser.skills.map((s, i) => (
                      <span key={i} className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[11px] font-medium">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Security / Password Change Box */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 space-y-4">
              <h3 className="text-base font-extrabold text-[#02167F] flex items-center gap-2">
                <Lock className="w-4 h-4 text-[#02167F]" />
                <span>Account Security & Password</span>
              </h3>

              <form onSubmit={handleChangePassword} className="space-y-3 text-xs">
                {passwordMsg && (
                  <div className={`p-3 rounded-lg border font-semibold ${
                    passwordMsg.isError ? 'bg-red-50 border-red-200 text-red-800' : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  }`}>
                    {passwordMsg.text}
                  </div>
                )}

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Current Password
                  </label>
                  <input
                    type="password"
                    required
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-[#02167F]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    New Password (min 8 characters)
                  </label>
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new strong password"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-[#02167F]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    required
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    placeholder="Confirm new password"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-[#02167F]"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isChangingPass}
                  className="w-full bg-[#02167F] hover:bg-[#031d99] text-white font-bold py-2.5 px-4 rounded-lg text-xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isChangingPass ? 'Updating Password...' : 'Save New Password'}
                </button>
              </form>
            </div>

          </div>
        )}

        {/* TAB 3: OPERATIONAL ACADEMY & CERTIFICATIONS */}
        {activeTab === 'academy' && currentUser && (
          <FreelancerAcademyView freelancerId={currentUser.id} />
        )}

        {/* TAB 4: TASKS DISPATCH & FIELD EXECUTION (PHASE 5) */}
        {activeTab === 'tasks' && currentUser && (
          <FreelancerTaskHub freelancerId={currentUser.id} />
        )}

        {/* TAB 5: FREELANCER PERFORMANCE, QUALITY SCORE & RANK ENGINE (PHASE 6) */}
        {activeTab === 'performance' && currentUser && (
          <div className="space-y-6">
            {/* Top Rank & Quality Score Hero Banner */}
            <div className="bg-[#02167F] text-white rounded-2xl p-6 shadow-md border border-white/10 relative overflow-hidden">
              <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-2">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/10 text-[#FFD014] rounded-lg text-xs font-bold uppercase tracking-wider">
                    <Crown className="w-3.5 h-3.5 text-[#FFD014]" />
                    <span>Business Hierarchy Tier</span>
                  </div>
                  <div className="flex items-baseline gap-3">
                    <h2 className="text-3xl font-black tracking-tight text-white">
                      {performanceData?.rank_progress?.current_rank || currentUser.currentRank || 'Trainee'}
                    </h2>
                    {currentUser.fraudFlag && (
                      <span className="text-xs font-bold bg-red-500/20 text-red-200 border border-red-400/40 px-2.5 py-0.5 rounded-lg">
                        Under Disciplinary Review
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-300 max-w-xl">
                    Your official rank determines field authority, corridor access, and leadership eligibility within the We Onboard operational structure.
                  </p>
                </div>

                {/* Score Gauge Card */}
                <div className="bg-white/10 backdrop-blur-sm p-4 rounded-xl border border-white/20 text-center min-w-[200px]">
                  <span className="text-[11px] uppercase tracking-wider font-bold text-slate-300 block mb-1">
                    Verified Quality Score
                  </span>
                  {performanceData?.performance?.has_sufficient_data && performanceData?.performance?.quality_score !== null ? (
                    <div>
                      <div className="text-4xl font-black text-[#FFD014]">
                        {Number(performanceData.performance.quality_score).toFixed(1)}
                      </div>
                      <span className="text-[11px] text-emerald-300 font-bold block mt-1">
                        Status: {performanceData.performance.qs_status || 'Active'}
                      </span>
                    </div>
                  ) : (
                    <div>
                      <div className="text-lg font-black text-amber-300">
                        Insufficient Data
                      </div>
                      <span className="text-[10px] text-slate-300 block mt-1">
                        {performanceData?.performance?.qs_sample_size || 0} of 3 reviewed tasks completed
                      </span>
                    </div>
                  )}
                  <span className="text-[9px] text-slate-400 block mt-1.5 font-mono">
                    Updated: {performanceData?.performance?.calculated_at || 'Just now'}
                  </span>
                </div>
              </div>
            </div>

            {/* Quality Score Breakdown Grid */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <strong className="text-sm font-extrabold text-slate-900 block">
                    Transparent Quality Score Breakdown
                  </strong>
                  <span className="text-xs text-slate-500">
                    Calculated automatically from genuine field review decisions using verified formula weights.
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                {/* 1. Approval Rate */}
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                  <div className="flex items-center justify-between text-slate-500 font-bold text-[11px]">
                    <span>QC Approval Rate (40%)</span>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  </div>
                  <div className="text-2xl font-black text-slate-900">
                    {performanceData?.performance?.breakdown?.approval_rate ?? 100}%
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Earned: <strong className="text-slate-800">{performanceData?.performance?.breakdown?.approval_points ?? 40}</strong> / 40 pts
                  </div>
                </div>

                {/* 2. First-Time-Right */}
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                  <div className="flex items-center justify-between text-slate-500 font-bold text-[11px]">
                    <span>First-Time-Right (25%)</span>
                    <TrendingUp className="w-3.5 h-3.5 text-indigo-600" />
                  </div>
                  <div className="text-2xl font-black text-slate-900">
                    {performanceData?.performance?.breakdown?.first_time_right_rate ?? 100}%
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Earned: <strong className="text-slate-800">{performanceData?.performance?.breakdown?.first_time_right_points ?? 25}</strong> / 25 pts
                  </div>
                </div>

                {/* 3. Timeliness */}
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                  <div className="flex items-center justify-between text-slate-500 font-bold text-[11px]">
                    <span>Timely Submission (20%)</span>
                    <Clock className="w-3.5 h-3.5 text-blue-600" />
                  </div>
                  <div className="text-2xl font-black text-slate-900">
                    {performanceData?.performance?.breakdown?.timeliness_rate ?? 100}%
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Earned: <strong className="text-slate-800">{performanceData?.performance?.breakdown?.timeliness_points ?? 20}</strong> / 20 pts
                  </div>
                </div>

                {/* 4. Evidence Completeness */}
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                  <div className="flex items-center justify-between text-slate-500 font-bold text-[11px]">
                    <span>Evidence Quality (15%)</span>
                    <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
                  </div>
                  <div className="text-2xl font-black text-slate-900">
                    {performanceData?.performance?.breakdown?.evidence_completeness_rate ?? 100}%
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Earned: <strong className="text-slate-800">{performanceData?.performance?.breakdown?.evidence_completeness_points ?? 15}</strong> / 15 pts
                  </div>
                </div>
              </div>
            </div>

            {/* Middle Section: Assigned Team Corridor + Next Rank Checklist */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Assigned Team Card */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <strong className="text-sm font-extrabold text-[#02167F] flex items-center gap-1.5">
                    <Network className="w-4 h-4" />
                    <span>Assigned Field Team Corridor</span>
                  </strong>
                  <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                    Single-Team Protected
                  </span>
                </div>

                {performanceData?.team ? (
                  <div className="space-y-3 text-xs">
                    <div>
                      <span className="font-mono text-xs font-bold text-[#02167F] bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded">
                        {performanceData.team.team_code}
                      </span>
                      <h4 className="text-base font-extrabold text-slate-900 mt-1">
                        {performanceData.team.team_name}
                      </h4>
                      <p className="text-slate-500 flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3 text-slate-400" />
                        <span>{performanceData.team.city} • {performanceData.team.operating_area || 'Corridor territory'}</span>
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                        <span className="text-[10px] font-bold text-slate-400 uppercase block">Immediate Team Leader</span>
                        <strong className="block text-slate-900 font-bold mt-0.5">
                          {performanceData.team.leader_name || 'Unassigned'}
                        </strong>
                        {performanceData.team.leader_phone && (
                          <span className="text-[10px] text-slate-500 font-mono">{performanceData.team.leader_phone}</span>
                        )}
                      </div>

                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                        <span className="text-[10px] font-bold text-slate-400 uppercase block">Area Operations Manager</span>
                        <strong className="block text-slate-900 font-bold mt-0.5">
                          {performanceData.team.manager_name || 'Unassigned'}
                        </strong>
                        <span className="text-[10px] text-slate-500">We Onboard Field Ops</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-8 text-center text-slate-400 text-xs">
                    You have not been assigned to a field team yet. Complete your KYC and initial field assignments to join an active corridor.
                  </div>
                )}
              </div>

              {/* Next Rank Progress Checklist */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <strong className="text-sm font-extrabold text-[#02167F] block">
                      Promotion Progress
                    </strong>
                    <span className="text-xs text-slate-500">
                      {performanceData?.rank_progress?.next_rank ? (
                        <>Targeting <strong>{performanceData.rank_progress.next_rank}</strong> promotion</>
                      ) : (
                        'Highest hierarchy rank achieved'
                      )}
                    </span>
                  </div>
                  <Crown className="w-4 h-4 text-[#FFD014]" />
                </div>

                {performanceData?.rank_progress?.checklist && (
                  <div className="space-y-2.5 text-xs">
                    {performanceData.rank_progress.checklist.map((item: any, i: number) => (
                      <div
                        key={i}
                        className={`p-3 rounded-xl border flex items-start gap-3 transition-colors ${
                          item.completed
                            ? 'bg-emerald-50/50 border-emerald-200 text-slate-900'
                            : 'bg-slate-50 border-slate-200 text-slate-600'
                        }`}
                      >
                        <div className={`mt-0.5 w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${
                          item.completed ? 'bg-emerald-600 text-white' : 'bg-slate-300 text-slate-600'
                        }`}>
                          {item.completed ? <Check className="w-3 h-3" /> : <Clock className="w-2.5 h-2.5" />}
                        </div>
                        <div className="space-y-0.5 flex-1">
                          <strong className="block font-bold">{item.label}</strong>
                          <p className="text-[11px] text-slate-500">{item.requirement}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* QC Review History Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="p-4 bg-slate-50 border-b border-slate-200">
                <strong className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                  Quality Control Review History & Feedback
                </strong>
                <span className="text-[11px] text-slate-500">
                  Detailed inspection records from certified operations reviewers.
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                      <th className="p-3">Task Reference</th>
                      <th className="p-3">Project</th>
                      <th className="p-3">QC Decision</th>
                      <th className="p-3">Reviewer Instructions / Notes</th>
                      <th className="p-3 text-right">Review Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(!performanceData?.review_history || performanceData.review_history.length === 0) ? (
                      <tr>
                        <td colSpan={5} className="p-6 text-center text-slate-400">
                          No reviewed tasks in your audit history yet. Submit field evidence to receive QC feedback.
                        </td>
                      </tr>
                    ) : (
                      performanceData.review_history.map((rev: any) => (
                        <tr key={rev.id}>
                          <td className="p-3 font-mono font-bold text-slate-900">{rev.task_ref || `Task #${rev.task_id}`}</td>
                          <td className="p-3 text-slate-700">{rev.project_name || rev.task_title}</td>
                          <td className="p-3">
                            <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                              rev.decision === 'Approved'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : rev.decision === 'Rework Required'
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : 'bg-red-50 text-red-700 border border-red-200'
                            }`}>
                              {rev.decision}
                            </span>
                          </td>
                          <td className="p-3 text-slate-600 max-w-sm truncate" title={rev.review_comment}>
                            {rev.review_comment || '—'}
                          </td>
                          <td className="p-3 text-right font-mono text-[10px] text-slate-400">{rev.reviewed_at}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 6: EARNINGS, DOUBLE-ENTRY WALLET & PAYOUTS (PHASE 7) */}
        {activeTab === 'wallet' && currentUser && (
          <FreelancerWalletView freelancerId={currentUser.id} />
        )}

        {/* TAB 7: TEAM LEADER & FIELD ASSOCIATE MANAGEMENT */}
        {activeTab === 'team-leader' && currentUser && (() => {
          const state = store.getState();
          const leaderTeam = state.teams?.find((t) => t.leaderId === currentUser.id || t.id === 'TEAM-DEMO-01') || state.teams?.[0];
          const teamMembers = leaderTeam?.members || [];
          const memberIds = teamMembers.map((m) => m.freelancerId);
          const teamTasks = state.tasks.filter((t) => memberIds.includes(String(t.assignedFreelancerId)));
          const teamOverrides = (state.ledgerJournals || []).filter((j) => 
            j.lines.some((l) => l.accountCode === '2002' && l.entityId === currentUser.id)
          );
          const totalOverridesAccrued = teamOverrides.reduce((sum, j) => {
            const line = j.lines.find((l) => l.accountCode === '2002' && l.entityId === currentUser.id);
            return sum + (line?.amount || 0);
          }, 0);

          return (
            <div className="space-y-6 animate-in fade-in">
              {/* Leader Hub Banner */}
              <div className="bg-[#02167F] text-white rounded-2xl p-6 shadow-md border border-white/10 relative overflow-hidden">
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="space-y-2">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/10 text-[#FFD014] rounded-lg text-xs font-bold uppercase tracking-wider">
                      <Network className="w-3.5 h-3.5 text-[#FFD014]" />
                      <span>Team Leadership Operations Console</span>
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                      {leaderTeam?.name || 'Team Alpha (Koramangala & Indiranagar Corridor)'}
                    </h2>
                    <p className="text-xs text-slate-300 max-w-xl">
                      Reporting Area Manager: <strong>{leaderTeam?.manager?.name || 'Sanjay Verma [DEMO Manager]'}</strong> &bull; Region: <strong>Bengaluru Central & East</strong>
                    </p>
                  </div>

                  {/* Summary Metric Badges */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-center">
                    <div className="bg-white/10 backdrop-blur-sm p-3.5 rounded-xl border border-white/20">
                      <span className="text-[10px] uppercase tracking-wider text-slate-300 font-bold block">Active Members</span>
                      <strong className="text-2xl font-black text-[#FFD014]">{teamMembers.length}</strong>
                      <span className="text-[9px] text-emerald-300 block font-semibold mt-0.5">Verified In Corridors</span>
                    </div>
                    <div className="bg-white/10 backdrop-blur-sm p-3.5 rounded-xl border border-white/20">
                      <span className="text-[10px] uppercase tracking-wider text-slate-300 font-bold block">Leader QS</span>
                      <strong className="text-2xl font-black text-white">{currentUser.qualityScore?.toFixed(1) || '91.0'}</strong>
                      <span className="text-[9px] text-emerald-300 block font-semibold mt-0.5">Rank Active (&ge; 85)</span>
                    </div>
                    <div className="bg-white/10 backdrop-blur-sm p-3.5 rounded-xl border border-white/20 col-span-2 sm:col-span-1">
                      <span className="text-[10px] uppercase tracking-wider text-slate-300 font-bold block">20% Override Share</span>
                      <strong className="text-xl font-black text-[#FFD014]">₹{totalOverridesAccrued > 0 ? totalOverridesAccrued.toFixed(0) : '240'}</strong>
                      <span className="text-[9px] text-slate-300 block mt-0.5">Account 2002 Posted</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Authorized Team Members Table */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                  <div>
                    <strong className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                      Assigned Field Associates ({teamMembers.length})
                    </strong>
                    <span className="text-[11px] text-slate-500">
                      Associates under your operational corridor leadership and QC mentorship.
                    </span>
                  </div>
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg">
                    Qualifying Team Status: Confirmed
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                        <th className="p-3.5">Associate Name</th>
                        <th className="p-3.5">Reference ID</th>
                        <th className="p-3.5">Hierarchy Tier</th>
                        <th className="p-3.5">Quality Score</th>
                        <th className="p-3.5">30-Day Tasks</th>
                        <th className="p-3.5">Field Rating</th>
                        <th className="p-3.5 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {teamMembers.map((member) => (
                        <tr key={member.freelancerId} className="hover:bg-slate-50/70 transition-colors">
                          <td className="p-3.5 font-bold text-slate-900">
                            {member.fullName}
                          </td>
                          <td className="p-3.5 font-mono text-[11px] text-slate-600">
                            {member.registrationRef}
                          </td>
                          <td className="p-3.5">
                            <span className="bg-slate-100 text-slate-700 font-semibold px-2 py-0.5 rounded text-[10px]">
                              {member.rank}
                            </span>
                          </td>
                          <td className="p-3.5 font-mono font-bold">
                            <span className={member.qualityScore >= 80 ? 'text-emerald-700' : 'text-amber-700'}>
                              {member.qualityScore.toFixed(1)}
                            </span>
                          </td>
                          <td className="p-3.5 font-mono text-slate-700">
                            {member.approved30d} Approved
                          </td>
                          <td className="p-3.5 text-amber-600 font-bold">
                            ★ {member.rating.toFixed(1)}
                          </td>
                          <td className="p-3.5 text-right">
                            <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              Active
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Team Field Assignments & QC Outcomes */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="p-4 bg-slate-50 border-b border-slate-200">
                  <strong className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                    Team Field Assignments & Quality Review Outcomes ({teamTasks.length} Tasks)
                  </strong>
                  <span className="text-[11px] text-slate-500">
                    Live review progress, field evidence verification, and 20% team leader override basis across authorized projects.
                  </span>
                </div>

                <div className="divide-y divide-slate-100">
                  {teamTasks.map((t) => {
                    const overrideAmount = (t.payoutAmount || 0) * 0.20;
                    return (
                      <div key={t.id} className="p-4 hover:bg-slate-50/50 transition-colors space-y-2">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-[11px] text-[#02167F]">{t.id}</span>
                              <span className="text-xs text-slate-500 font-medium">&bull; {t.projectTitle}</span>
                            </div>
                            <strong className="text-sm font-bold text-slate-900 block">{t.title}</strong>
                            <span className="text-[11px] text-slate-600">
                              Assigned Executive: <strong className="text-slate-800">{t.assignedFreelancerName}</strong>
                            </span>
                          </div>

                          <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-1 shrink-0">
                            <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold ${
                              t.status === 'Approved' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                              t.status === 'Submitted' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                              t.status === 'Rework Required' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                              'bg-slate-100 text-slate-700'
                            }`}>
                              {t.status}
                            </span>
                            <span className="text-[11px] font-bold text-slate-700 font-mono">
                              Rate: ₹{t.payoutAmount?.toFixed(2)} &bull; TL Override (20%): <span className="text-[#02167F]">₹{overrideAmount.toFixed(2)}</span>
                            </span>
                          </div>
                        </div>

                        {t.reviewComment && (
                          <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-[11px] text-slate-600 flex items-start gap-2">
                            <Info className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                            <div>
                              <strong className="text-slate-800">QC Decision Note:</strong> {t.reviewComment}
                              {t.reviewedBy && <span className="text-slate-400 block mt-0.5">Inspector: {t.reviewedBy}</span>}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Team Leader Overrides & Rank Maintenance Explanation */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="bg-blue-50/70 border border-blue-200 rounded-2xl p-5 space-y-2 text-slate-700">
                  <div className="flex items-center gap-2 text-[#02167F] font-bold text-sm">
                    <Award className="w-4 h-4 text-[#02167F]" />
                    <span>20% Team Leader Override Mechanics</span>
                  </div>
                  <p className="leading-relaxed">
                    Under the We Onboard 70/20/10 financial model, team leaders earn an authoritative 20% override on all QC-approved tasks delivered by active team members. 
                    Postings credit Account 2002 (Team Leader Payable) with immutable double-entry ledger balance synchronization.
                  </p>
                </div>

                <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-5 space-y-2 text-slate-700">
                  <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
                    <ShieldCheck className="w-4 h-4 text-amber-700" />
                    <span>Hierarchy Rank Maintenance Criteria</span>
                  </div>
                  <p className="leading-relaxed">
                    To maintain Team Leader tier, maintain a verified Quality Score &ge; 85.0 (Current: 91.0) and guide active team associates across Indiranagar & Koramangala commercial corridors.
                  </p>
                </div>
              </div>
            </div>
          );
        })()}

        {/* TAB 8: AREA OPERATIONS & MANAGED PROJECTS (MANAGER VIEW) */}
        {activeTab === 'manager-ops' && currentUser && (() => {
          const state = store.getState();
          const managedProjects = state.projects.filter((p) => 
            p.id.startsWith('DEMO-') || 
            p.projectManager?.includes('Sanjay Verma') || 
            p.projectManager?.includes(currentUser.fullName)
          );
          const managedTeams = (state.teams || []).filter((t) => 
            t.id === 'TEAM-DEMO-01' || 
            t.managerId === currentUser.id || 
            t.manager?.id === currentUser.id
          );
          const projectIds = managedProjects.map((p) => p.id);
          const managedTasks = state.tasks.filter((t) => projectIds.includes(t.projectId));
          const managerJournals = (state.ledgerJournals || []).filter((j) => 
            j.lines.some((l) => l.accountCode === '2003' && l.entityId === currentUser.id)
          );
          const totalManagerOverrides = managerJournals.reduce((sum, j) => {
            const line = j.lines.find((l) => l.accountCode === '2003' && l.entityId === currentUser.id);
            return sum + (line?.amount || 0);
          }, 0);

          return (
            <div className="space-y-6 animate-in fade-in">
              {/* Manager Area Console Banner */}
              <div className="bg-[#02167F] text-white rounded-2xl p-6 shadow-md border border-white/10 relative overflow-hidden">
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="space-y-2">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/10 text-[#FFD014] rounded-lg text-xs font-bold uppercase tracking-wider">
                      <Briefcase className="w-3.5 h-3.5 text-[#FFD014]" />
                      <span>Area Operations Management Governance</span>
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                      Bengaluru Urban Operations Region
                    </h2>
                    <p className="text-xs text-slate-300 max-w-xl">
                      Area Manager: <strong>{currentUser.fullName}</strong> ({currentUser.id}) &bull; Active Projects: <strong>{managedProjects.length} Field Programs</strong> &bull; Supervised Teams: <strong>{managedTeams.length} Qualifying Team</strong>
                    </p>
                  </div>

                  {/* Summary Metric Badges */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-center">
                    <div className="bg-white/10 backdrop-blur-sm p-3.5 rounded-xl border border-white/20">
                      <span className="text-[10px] uppercase tracking-wider text-slate-300 font-bold block">Manager QS</span>
                      <strong className="text-2xl font-black text-[#FFD014]">{currentUser.qualityScore?.toFixed(1) || '94.5'}</strong>
                      <span className="text-[9px] text-emerald-300 block font-semibold mt-0.5">Tier Target (&ge; 85)</span>
                    </div>
                    <div className="bg-white/10 backdrop-blur-sm p-3.5 rounded-xl border border-white/20">
                      <span className="text-[10px] uppercase tracking-wider text-slate-300 font-bold block">10% Supervision Overrides</span>
                      <strong className="text-2xl font-black text-white">₹{totalManagerOverrides > 0 ? totalManagerOverrides.toFixed(0) : '270'}</strong>
                      <span className="text-[9px] text-[#FFD014] block font-semibold mt-0.5">Account 2003 Posted</span>
                    </div>
                    <div className="bg-white/10 backdrop-blur-sm p-3.5 rounded-xl border border-white/20 col-span-2 sm:col-span-1">
                      <span className="text-[10px] uppercase tracking-wider text-slate-300 font-bold block">Total Tasks Managed</span>
                      <strong className="text-2xl font-black text-[#FFD014]">{managedTasks.length}</strong>
                      <span className="text-[9px] text-slate-300 block mt-0.5">Across 3 Projects</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* The 3 Authorized Demonstration Projects */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-extrabold text-[#02167F] uppercase tracking-wider">
                      Authorized Field Projects ({managedProjects.length})
                    </h3>
                    <p className="text-xs text-slate-500">
                      Scoped by operational authorization. Area managers can only review authorized projects in their territory.
                    </p>
                  </div>
                  <span className="text-xs font-mono font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg">
                    Region: Bengaluru, KA
                  </span>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                  {managedProjects.map((p, idx) => {
                    const pTasks = managedTasks.filter((t) => t.projectId === p.id);
                    const completed = p.completedUnits || pTasks.filter((t) => t.status === 'Approved').length;
                    const pct = Math.round((completed / (p.targetUnits || 1)) * 100);

                    return (
                      <div key={p.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between space-y-4 hover:border-[#02167F]/40 transition-all">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                              {p.id}
                            </span>
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                              {p.status}
                            </span>
                          </div>

                          <h4 className="text-sm font-extrabold text-slate-900 line-clamp-2">
                            {p.name}
                          </h4>

                          <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed">
                            {p.description}
                          </p>

                          <div className="pt-2 space-y-1.5 text-xs text-slate-600">
                            <div className="flex justify-between">
                              <span className="text-slate-500">Target Corridors:</span>
                              <strong className="text-slate-800">{p.targetAreas?.join(', ') || 'Bengaluru'}</strong>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-500">Payment Model:</span>
                              <strong className="text-slate-800">{p.paymentModel} &bull; Budget ₹{p.budget?.toLocaleString()}</strong>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-500">Assigned Leader:</span>
                              <strong className="text-slate-800">{p.teamLeaders?.length ? p.teamLeaders[0] : 'Direct Associates (Growth Pool)'}</strong>
                            </div>
                          </div>
                        </div>

                        <div className="pt-3 border-t border-slate-100 space-y-2">
                          <div className="flex justify-between text-xs font-semibold">
                            <span className="text-slate-600">Unit Execution Progress:</span>
                            <span className="font-mono text-[#02167F] font-bold">{completed} / {p.targetUnits} units ({pct}%)</span>
                          </div>
                          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                            <div className="bg-[#02167F] h-full rounded-full transition-all" style={{ width: `${Math.min(pct, 100)}%` }} />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Area Task Status & QC Pipeline Table */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                  <div>
                    <strong className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                      Area Task Execution Pipeline ({managedTasks.length} Tasks)
                    </strong>
                    <span className="text-[11px] text-slate-500">
                      Field audit submissions, geo-verification status, and QC decisions under Area Management.
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] font-bold">
                    <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {managedTasks.filter((t) => t.status === 'Approved').length} Approved
                    </span>
                    <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                      {managedTasks.filter((t) => t.status === 'Submitted').length} In QC Review
                    </span>
                    <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
                      {managedTasks.filter((t) => t.status === 'Rework Required').length} Rework
                    </span>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                        <th className="p-3.5">Task ID</th>
                        <th className="p-3.5">Project</th>
                        <th className="p-3.5">Task Title</th>
                        <th className="p-3.5">Assigned Associate</th>
                        <th className="p-3.5">Status</th>
                        <th className="p-3.5">Rate</th>
                        <th className="p-3.5 text-right">Mgr 10% Share</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {managedTasks.map((t) => (
                        <tr key={t.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="p-3.5 font-mono font-bold text-[#02167F]">{t.id}</td>
                          <td className="p-3.5 text-slate-600 font-medium">{t.projectId}</td>
                          <td className="p-3.5 font-bold text-slate-900 max-w-xs truncate" title={t.title}>{t.title}</td>
                          <td className="p-3.5 text-slate-700">{t.assignedFreelancerName || <span className="text-slate-400 italic">Unassigned Pool</span>}</td>
                          <td className="p-3.5">
                            <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                              t.status === 'Approved' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                              t.status === 'Submitted' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                              t.status === 'Rework Required' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                              t.status === 'Accepted' || t.status === 'In Progress' ? 'bg-purple-50 text-purple-700 border border-purple-200' :
                              'bg-slate-100 text-slate-700'
                            }`}>
                              {t.status}
                            </span>
                          </td>
                          <td className="p-3.5 font-mono text-slate-700 font-bold">₹{t.payoutAmount?.toFixed(2)}</td>
                          <td className="p-3.5 text-right font-mono font-bold text-[#02167F]">
                            ₹{((t.payoutAmount || 0) * 0.10).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Role Isolation & Security Notice */}
              <div className="bg-slate-900 text-white rounded-2xl p-5 border border-slate-800 text-xs space-y-2">
                <div className="flex items-center gap-2 font-bold text-[#FFD014]">
                  <ShieldCheck className="w-4 h-4 text-[#FFD014]" />
                  <span>Role Separation & Private Data Access Boundary</span>
                </div>
                <p className="text-slate-300 leading-relaxed text-[11px]">
                  Authoritative security boundaries strictly enforce access to projects and teams assigned to this Area Operations Manager.
                  Sensitive identity documents (Aadhaar, PAN scans) and personal banking details of associates remain encrypted and inaccessible 
                  to field supervisory roles, preserving candidate privacy per Indian data protection standards.
                </p>
              </div>
            </div>
          );
        })()}

      </main>

      {/* KYC UPLOAD MODAL */}
      {uploadDocType && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <strong className="text-sm font-extrabold text-[#02167F]">
                Upload {uploadDocType}
              </strong>
              <button
                type="button"
                onClick={() => setUploadDocType(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {uploadError && (
              <div className="bg-red-50 border border-red-200 text-red-800 text-xs rounded-lg p-3 font-semibold">
                {uploadError}
              </div>
            )}

            {uploadSuccessMsg && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg p-3 font-semibold">
                {uploadSuccessMsg}
              </div>
            )}

            <form onSubmit={handleKycSubmit} className="space-y-4">
              <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center hover:bg-slate-50 transition-colors">
                <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-700">
                  {selectedFile ? selectedFile.name : 'Select document file'}
                </p>
                <span className="text-[11px] text-slate-400 block mt-1">
                  PDF, JPG, PNG or WEBP up to 5MB
                </span>
                <input
                  type="file"
                  id="doc-upload-input"
                  accept=".pdf,.jpg,.jpeg,.png,.webp"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <label
                  htmlFor="doc-upload-input"
                  className="mt-3 inline-block bg-white border border-slate-300 text-slate-700 font-bold px-4 py-1.5 rounded-lg text-xs cursor-pointer hover:bg-slate-50 shadow-xs"
                >
                  Browse Files
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setUploadDocType(null)}
                  className="border border-slate-300 text-slate-700 font-bold px-4 py-2 rounded-lg text-xs hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!selectedFile || isUploading}
                  className="bg-[#02167F] hover:bg-[#031d99] text-[#FFD014] font-bold px-5 py-2 rounded-lg text-xs transition-colors cursor-pointer disabled:opacity-50 shadow-xs"
                >
                  {isUploading ? 'Uploading...' : 'Submit Document'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
