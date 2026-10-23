import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  MessageSquareText, 
  Users, 
  FolderKanban, 
  Building2, 
  Handshake, 
  Globe, 
  UserCheck, 
  ShieldAlert, 
  Download, 
  LogOut, 
  Bell, 
  ExternalLink, 
  Search, 
  CheckCircle2, 
  ChevronDown,
  Menu,
  X,
  GraduationCap,
  Network,
  Landmark
} from 'lucide-react';
import { store } from '../../services/store';
import { AdminRole, AdminUser } from '../../types';

interface AdminLayoutProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  onViewPublicSite: () => void;
  onOpenHostingerModal: () => void;
  children: React.ReactNode;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({
  currentTab,
  onSelectTab,
  onViewPublicSite,
  onOpenHostingerModal,
  children,
}) => {
  const [currentUser, setCurrentUser] = useState<AdminUser | null>(store.getState().currentAdmin);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const notifications = store.getState().notifications;
  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleRoleChange = (role: AdminRole) => {
    store.switchAdminRole(role);
    setCurrentUser(store.getState().currentAdmin);
  };

  const navItems = [
    { id: 'dashboard', label: 'Dashboard Overview', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'enquiries', label: 'Enquiry CRM', icon: <MessageSquareText className="w-4 h-4" />, badge: store.getState().enquiries.filter(e => e.status === 'New').length },
    { id: 'freelancers', label: 'Freelancers & KYC', icon: <Users className="w-4 h-4" />, badge: store.getState().freelancers.filter(f => f.status === 'Submitted' || f.status === 'Under Review').length },
    { id: 'academy', label: 'Academy & Training', icon: <GraduationCap className="w-4 h-4" /> },
    { id: 'projects', label: 'Field Projects & Tasks', icon: <FolderKanban className="w-4 h-4" />, badge: store.getState().tasks.filter(t => t.status === 'Submitted').length },
    { id: 'teams', label: 'Teams & Rank Engine', icon: <Network className="w-4 h-4" /> },
    { id: 'financial', label: 'Financials & Ledger', icon: <Landmark className="w-4 h-4" />, badge: (store.getState().payoutRequests || []).filter(p => p.status === 'Requested').length || undefined },
    { id: 'msme', label: 'MSME Support Desk', icon: <Building2 className="w-4 h-4" /> },
    { id: 'clients', label: 'Clients & Franchises', icon: <Handshake className="w-4 h-4" /> },
    { id: 'cms', label: 'Website CMS & Banners', icon: <Globe className="w-4 h-4" /> },
    { id: 'users', label: 'Staff & Roles (RBAC)', icon: <UserCheck className="w-4 h-4" /> },
    { id: 'audit', label: 'Security Audit Logs', icon: <ShieldAlert className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col md:flex-row font-sans">
      
      {/* Mobile Top Header */}
      <div className="md:hidden bg-[#02167F] text-white p-4 flex items-center justify-between sticky top-0 z-40 shadow">
        <div className="flex items-center gap-2">
          <button onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)} className="p-1 rounded text-white">
            {mobileSidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
          <div className="bg-[#FFD014] text-[#02167F] font-black text-sm px-2 py-0.5 rounded">we</div>
          <span className="font-extrabold text-base">We Onboard Admin</span>
        </div>
        <button
          onClick={onOpenHostingerModal}
          className="bg-[#FFD014] text-[#02167F] text-xs font-bold px-2.5 py-1 rounded flex items-center gap-1"
        >
          <Download className="w-3.5 h-3.5" />
          <span>ZIP</span>
        </button>
      </div>

      {/* Left Navy Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-[#02167F] text-white flex flex-col justify-between transition-transform duration-300 md:static md:translate-x-0
        ${mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="p-5">
          {/* Brand Header */}
          <div className="flex items-center justify-between pb-6 border-b border-white/15">
            <div className="flex items-center gap-1.5">
              <div className="bg-[#FFD014] text-[#02167F] font-black text-lg px-2.5 py-0.5 rounded-md">
                we
              </div>
              <div className="leading-tight">
                <span className="text-white font-black text-lg tracking-tight block">nboard</span>
                <span className="text-[10px] text-[#FFD014] uppercase tracking-wider font-bold">Admin Console</span>
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="mt-5 space-y-1">
            {navItems.map((item) => {
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onSelectTab(item.id);
                    setMobileSidebarOpen(false);
                  }}
                  className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-between group ${
                    isActive
                      ? 'bg-[#FFD014] text-[#02167F] shadow-md font-extrabold'
                      : 'text-slate-200 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    {item.icon}
                    <span>{item.label}</span>
                  </div>
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${
                      isActive ? 'bg-[#02167F] text-[#FFD014]' : 'bg-red-500 text-white'
                    }`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Bottom Actions */}
        <div className="p-4 border-t border-white/15 space-y-3">
          
          {/* Hostinger Exporter Button */}
          <button
            onClick={onOpenHostingerModal}
            className="w-full bg-white/10 hover:bg-white/20 text-[#FFD014] text-xs font-bold py-2.5 px-3 rounded-xl transition-colors flex items-center justify-center gap-2 border border-white/10"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Hostinger Deploy Package</span>
          </button>

          {/* View Public Website */}
          <button
            onClick={onViewPublicSite}
            className="w-full text-left text-xs text-slate-300 hover:text-white flex items-center justify-between px-2 py-1"
          >
            <span>Live Public Website</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>

        </div>
      </aside>

      {/* Main Content Workspace */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        
        {/* Top Header Bar */}
        <header className="bg-white border-b border-slate-200 sticky top-0 z-30 px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4 shadow-xs">
          
          {/* Breadcrumb / Title */}
          <div className="flex items-center gap-3">
            <h1 className="text-base sm:text-lg font-extrabold text-[#02167F]">
              {navItems.find((n) => n.id === currentTab)?.label || 'Administration'}
            </h1>
            <span className="text-xs text-slate-400 font-mono hidden sm:inline">
              &bull; We Onboard Indiranagar HQ
            </span>
          </div>

          {/* Right Header Controls */}
          <div className="flex items-center gap-3 sm:gap-4">
            
            {/* Quick Role Tester Switcher (Allows testing all RBAC roles!) */}
            <div className="hidden lg:flex items-center gap-1.5 bg-slate-100 border border-slate-200 rounded-lg px-2.5 py-1 text-xs">
              <span className="text-[11px] font-bold text-slate-500">Testing Role:</span>
              <select
                value={currentUser?.role || 'Super Admin'}
                onChange={(e) => handleRoleChange(e.target.value as AdminRole)}
                className="bg-transparent font-bold text-[#02167F] focus:outline-none text-xs cursor-pointer"
              >
                <option value="Super Admin">Super Admin (All Access)</option>
                <option value="Administrator">Administrator</option>
                <option value="Enquiry Manager">Enquiry Manager</option>
                <option value="Freelancer Coordinator">Freelancer Coordinator</option>
                <option value="Project Manager">Project Manager</option>
                <option value="Finance Manager">Finance Manager</option>
                <option value="Content Manager">Content Manager</option>
              </select>
            </div>

            {/* Notification Center Dropdown */}
            <div className="relative">
              <button
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                className="p-2 text-slate-600 hover:text-[#02167F] hover:bg-slate-100 rounded-lg relative transition-colors"
                title="Notifications"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white rounded-full text-[9px] font-bold flex items-center justify-center font-mono">
                    {unreadCount}
                  </span>
                )}
              </button>

              {notificationsOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white border border-slate-200 rounded-2xl shadow-2xl p-4 z-50 animate-in fade-in zoom-in-95">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <span className="text-xs font-bold text-slate-900">Notifications ({notifications.length})</span>
                    <button
                      onClick={() => store.markAllNotificationsRead()}
                      className="text-[10px] text-blue-600 hover:underline font-bold"
                    >
                      Mark all read
                    </button>
                  </div>
                  <div className="mt-3 space-y-2 max-h-64 overflow-y-auto">
                    {notifications.map((n) => (
                      <div
                        key={n.id}
                        onClick={() => {
                          if (n.link) onSelectTab(n.link);
                          setNotificationsOpen(false);
                        }}
                        className={`p-2.5 rounded-lg text-xs cursor-pointer transition-colors ${
                          n.read ? 'bg-slate-50 text-slate-600' : 'bg-blue-50/80 text-blue-900 font-medium'
                        }`}
                      >
                        <strong className="block text-slate-900 mb-0.5">{n.title}</strong>
                        <p className="text-[11px] leading-tight">{n.message}</p>
                        <span className="text-[9px] text-slate-400 mt-1 block font-mono">{n.timestamp}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* User Profile Badge & Logout Button */}
            <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
              <div className="w-8 h-8 rounded-full bg-[#02167F] text-[#FFD014] flex items-center justify-center font-bold text-xs">
                {currentUser?.name.split(' ').map((n) => n[0]).join('') || 'SA'}
              </div>
              <div className="text-left hidden sm:block">
                <span className="text-xs font-bold text-slate-900 block leading-tight">
                  {currentUser?.name || 'Administrator'}
                </span>
                <span className="text-[10px] text-emerald-700 font-semibold block">
                  {currentUser?.email || 'admin@weonboard.in'}
                </span>
              </div>
              <button
                onClick={() => {
                  store.logoutAdmin();
                  onViewPublicSite();
                }}
                className="ml-2 p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors flex items-center gap-1 text-xs font-bold"
                title="Log Out of Admin Panel"
              >
                <LogOut className="w-4 h-4 text-rose-600" />
                <span className="hidden md:inline text-[11px] text-rose-700">Logout</span>
              </button>
            </div>

          </div>

        </header>

        {/* Content Body */}
        <main className="p-4 sm:p-6 lg:p-8 space-y-6">
          {children}
        </main>

      </div>

    </div>
  );
};
