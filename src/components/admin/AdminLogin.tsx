import React, { useState } from 'react';
import { Shield, ArrowLeft, Lock, Mail, AlertCircle, AlertTriangle } from 'lucide-react';
import { store } from '../../services/store';
import { api } from '../../services/api';
import { AdminUser } from '../../types';

interface AdminLoginProps {
  onSuccess: () => void;
  onBackToWebsite: () => void;
}

export const AdminLogin: React.FC<AdminLoginProps> = ({ onSuccess, onBackToWebsite }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSandboxNotice, setIsSandboxNotice] = useState(false);

  const adminUsers = store.getState().adminUsers;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const res = await api.loginAdmin(email, password);

      if (res.success) {
        onSuccess();
      } else {
        setError(res.error || 'Invalid administrator credentials. Please check your work email and password.');
        if (res.storage === 'preview_sandbox') {
          setIsSandboxNotice(true);
        }
      }
    } catch {
      setError('Unable to reach authentication server. Please check your network or try sandbox mode.');
      setIsSandboxNotice(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSandboxEnter = (u: AdminUser) => {
    store.loginAdminPreview(u.email);
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
            <div className="bg-rose-50 border border-rose-200 text-rose-800 p-3.5 rounded-xl text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">{error}</p>
                {isSandboxNotice && (
                  <p className="text-[11px] text-rose-700 mt-1">
                    Tip: If testing in an offline development environment without Hostinger PHP connectivity, you can use the Isolated Sandbox below.
                  </p>
                )}
              </div>
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
                  placeholder="Enter administrator password"
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-[#02167F] focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-500">
              <span className="text-[11px] text-slate-500">
                Rate-limited server verification
              </span>
              <span className="text-[11px] font-mono text-emerald-700 font-bold">
                ✓ BCrypt &amp; CSRF Protected
              </span>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-[#02167F] hover:bg-[#031d99] text-[#FFD014] font-extrabold py-3 rounded-xl text-sm transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
            >
              <Shield className="w-4 h-4" />
              <span>{isSubmitting ? 'Authenticating...' : 'Sign In to Dashboard →'}</span>
            </button>
          </form>

          {/* Development / Preview Sandbox Mode (Explicitly Labeled) */}
          <div className="pt-4 border-t border-slate-100">
            <div className="flex items-center justify-center gap-1.5 mb-2">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
              <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                Isolated Preview Sandbox (No Server Connection)
              </span>
            </div>
            <p className="text-[11px] text-slate-500 text-center mb-2.5">
              Select a simulated role profile to evaluate UI layouts without connecting to live Hostinger MySQL.
            </p>
            <div className="space-y-1.5">
              {adminUsers.slice(0, 3).map((u) => (
                <button
                  key={u.id}
                  onClick={() => handleSandboxEnter(u)}
                  className="w-full text-left p-2 rounded-lg border border-slate-200 hover:border-[#02167F] hover:bg-blue-50/50 transition-colors flex items-center justify-between text-xs cursor-pointer"
                  title="Enter local preview sandbox with this role profile"
                >
                  <div>
                    <strong className="text-slate-900 block font-bold">{u.name}</strong>
                    <span className="text-slate-500 text-[11px]">{u.email}</span>
                  </div>
                  <span className="font-mono text-[10px] bg-slate-100 px-2 py-0.5 rounded text-[#02167F] font-bold">
                    Sandbox: {u.role}
                  </span>
                </button>
              ))}
            </div>
          </div>

        </div>

        <p className="text-center text-xs text-white/60">
          Target API: https://api.weonboard.in/v1 &bull; Hostinger Shared Hosting
        </p>

      </div>
    </div>
  );
};
