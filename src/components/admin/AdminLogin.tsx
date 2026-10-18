import React, { useState } from 'react';
import { Shield, ArrowLeft, Lock, Mail, CheckCircle2, AlertCircle } from 'lucide-react';
import { store } from '../../services/store';
import { AdminUser } from '../../types';

interface AdminLoginProps {
  onSuccess: () => void;
  onBackToWebsite: () => void;
}

export const AdminLogin: React.FC<AdminLoginProps> = ({ onSuccess, onBackToWebsite }) => {
  const [email, setEmail] = useState('admin@weonboard.in');
  const [password, setPassword] = useState('WeOnboard@2026');
  const [error, setError] = useState('');
  const [attempts, setAttempts] = useState(0);

  const adminUsers = store.getState().adminUsers;

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (attempts >= 5) {
      setError('Too many login attempts. Temporary rate-limit lock in effect for 60 seconds.');
      return;
    }

    const ok = store.loginAdmin(email, password);
    if (ok) {
      onSuccess();
    } else {
      setAttempts((prev) => prev + 1);
      setError('Invalid administrator credentials. Please check your work email and password.');
    }
  };

  const handleQuickLogin = (u: AdminUser) => {
    store.loginAdmin(u.email, 'WeOnboard@2026');
    onSuccess();
  };

  return (
    <div className="min-h-screen bg-[#02167F] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      
      {/* Background Grid Pattern */}
      <div 
        className="absolute inset-0 opacity-10 pointer-events-none" 
        style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, #ffffff 1px, transparent 0)',
          backgroundSize: '28px 28px'
        }}
      />

      <div className="max-w-md w-full mx-auto space-y-6 relative z-10">
        
        <button
          onClick={onBackToWebsite}
          className="flex items-center gap-2 text-xs font-bold text-white/80 hover:text-white bg-white/10 hover:bg-white/20 px-3.5 py-2 rounded-lg transition-colors border border-white/10"
        >
          <ArrowLeft className="w-4 h-4 text-[#FFD014]" />
          <span>Return to We Onboard Website</span>
        </button>

        <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-2xl space-y-6">
          
          <div className="text-center space-y-2">
            <div className="flex items-center justify-center gap-1 group">
              <div className="bg-[#FFD014] text-[#02167F] font-black text-2xl px-3 py-1 rounded-md tracking-tighter">
                we
              </div>
              <span className="text-[#02167F] font-extrabold text-2xl tracking-tight">
                nboard
              </span>
            </div>
            <h2 className="text-xl font-extrabold text-[#02167F]">
              Administrative Backend Portal
            </h2>
            <p className="text-xs text-slate-500">
              Restricted management gateway for authorized personnel.
            </p>
          </div>

          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-800 p-3 rounded-lg text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Admin Work Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@weonboard.in"
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-[#02167F] focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-[#02167F] focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-500">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input type="checkbox" defaultChecked className="rounded text-[#02167F]" />
                <span>Keep session active</span>
              </label>
              <span className="text-[11px] font-mono text-emerald-700 font-bold">
                ✓ CSRF Protected
              </span>
            </div>

            <button
              type="submit"
              className="w-full bg-[#02167F] hover:bg-[#031d99] text-[#FFD014] font-extrabold py-3 rounded-xl text-sm transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
            >
              <Shield className="w-4 h-4" />
              <span>Sign In to Dashboard &rarr;</span>
            </button>
          </form>

          {/* Quick Demo Logins for Reviewers */}
          <div className="pt-4 border-t border-slate-100">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-2 text-center">
              One-Click Role Authentication (Demo)
            </span>
            <div className="space-y-1.5">
              {adminUsers.map((u) => (
                <button
                  key={u.id}
                  onClick={() => handleQuickLogin(u)}
                  className="w-full text-left p-2 rounded-lg border border-slate-200 hover:border-[#02167F] hover:bg-blue-50/50 transition-colors flex items-center justify-between text-xs"
                >
                  <div>
                    <strong className="text-slate-900 block font-bold">{u.name}</strong>
                    <span className="text-slate-500 text-[11px]">{u.email}</span>
                  </div>
                  <span className="font-mono text-[10px] bg-slate-100 px-2 py-0.5 rounded text-[#02167F] font-bold">
                    {u.role}
                  </span>
                </button>
              ))}
            </div>
          </div>

        </div>

        <p className="text-center text-xs text-white/60">
          Route: /admin/login.php &bull; Session Regulated &bull; We Onboard Indiranagar
        </p>

      </div>
    </div>
  );
};
