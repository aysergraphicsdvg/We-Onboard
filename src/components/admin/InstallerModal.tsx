import React, { useState } from 'react';
import { Database, CheckCircle2, AlertCircle, X, Shield, Lock, ArrowRight, RefreshCw } from 'lucide-react';
import { store } from '../../services/store';

interface InstallerModalProps {
  onClose: () => void;
}

export const InstallerModal: React.FC<InstallerModalProps> = ({ onClose }) => {
  const [step, setStep] = useState(1);
  const [dbHost, setDbHost] = useState('localhost');
  const [dbName, setDbName] = useState('u123456789_weonboard');
  const [dbUser, setDbUser] = useState('u123456789_admin');
  const [dbPass, setDbPass] = useState('••••••••••••');
  const [adminName, setAdminName] = useState('Muhammad Ali Shoaib');
  const [adminEmail, setAdminEmail] = useState('admin@weonboard.in');
  const [adminPassword, setAdminPassword] = useState('WeOnboard@2026');
  const [isInstalling, setIsInstalling] = useState(false);
  const [installed, setInstalled] = useState(false);

  const envChecks = [
    { label: 'PHP Version & Compatibility', status: 'PHP 8.2.14 (Supported)' },
    { label: 'PDO MySQL Extension', status: 'Enabled & Loaded' },
    { label: 'Session Security (HttpOnly / Lax)', status: 'Active & Verified' },
    { label: 'File Upload Permissions', status: 'Writable (public_html/storage)' },
    { label: 'OpenSSL / Random Bytes Security', status: 'Secure' }
  ];

  const handleRunInstall = (e: React.FormEvent) => {
    e.preventDefault();
    setIsInstalling(true);

    setTimeout(() => {
      setIsInstalling(false);
      setInstalled(true);
      store.logAudit(
        'Database Installer Executed',
        'Auth',
        'INSTALL_SCRIPT',
        `Installed all 27 tables on ${dbName} and configured Super Admin ${adminEmail}`
      );
    }, 1200);
  };

  const handleResetDatabase = () => {
    if (confirm('Are you sure you want to reload all initial sample data? This will restore clean Bangalore test records.')) {
      store.resetToDefault();
      alert('Database reset to clean factory state!');
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#02167F]/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-xl w-full p-6 sm:p-8 max-h-[90vh] overflow-y-auto relative shadow-2xl border border-slate-200 animate-in zoom-in-95 space-y-6">
        
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-700 rounded-full"
        >
          <X className="w-5 h-5" />
        </button>

        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-[#FFD014] text-[#02167F] font-black text-xs px-2 py-0.5 rounded">
              INSTALLER
            </span>
            <span className="text-xs font-mono text-slate-500">Route: /install.php</span>
          </div>
          <h3 className="text-2xl font-extrabold text-[#02167F]">
            One-Time Database Installer & Verification
          </h3>
          <p className="text-xs text-slate-500">
            Automated schema creation, table initialization and secure administrator provisioning.
          </p>
        </div>

        {installed ? (
          <div className="text-center py-6 space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h4 className="text-xl font-extrabold text-[#02167F]">
              Installation Locked & Completed!
            </h4>
            <p className="text-xs text-slate-600 max-w-sm mx-auto">
              All 27 tables have been initialized. A security lock <code>config/install.lock</code> has been created. 
              The installer is now disabled from unauthorized public execution.
            </p>
            <div className="pt-2 flex justify-center gap-3">
              <button
                onClick={onClose}
                className="bg-[#02167F] text-[#FFD014] font-bold px-6 py-2.5 rounded-lg text-xs"
              >
                Close Installer
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleRunInstall} className="space-y-4 text-xs">
            
            {/* Environment Readiness Check */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
              <span className="font-bold text-slate-700 block uppercase tracking-wider text-[11px]">
                Hostinger Environment Diagnostic
              </span>
              <div className="space-y-1.5">
                {envChecks.map((chk, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <span className="text-slate-600">{chk.label}</span>
                    <span className="font-mono font-bold text-emerald-700 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{chk.status}</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* DB Credentials */}
            <div className="space-y-3">
              <span className="font-bold text-slate-700 block uppercase tracking-wider text-[11px]">
                Target MySQL Database Configuration
              </span>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-600 mb-1">Host</label>
                  <input
                    type="text"
                    value={dbHost}
                    onChange={(e) => setDbHost(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-600 mb-1">Database Name</label>
                  <input
                    type="text"
                    value={dbName}
                    onChange={(e) => setDbName(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-600 mb-1">Username</label>
                  <input
                    type="text"
                    value={dbUser}
                    onChange={(e) => setDbUser(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-600 mb-1">Password</label>
                  <input
                    type="password"
                    value={dbPass}
                    onChange={(e) => setDbPass(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Initial Super Admin Setup */}
            <div className="space-y-3 pt-2 border-t border-slate-100">
              <span className="font-bold text-slate-700 block uppercase tracking-wider text-[11px]">
                Super Admin Master Account
              </span>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-600 mb-1">Full Name</label>
                  <input
                    type="text"
                    value={adminName}
                    onChange={(e) => setAdminName(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-600 mb-1">Admin Email</label>
                  <input
                    type="email"
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300"
                  />
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              <button
                type="button"
                onClick={handleResetDatabase}
                className="text-rose-700 hover:text-rose-900 font-bold flex items-center gap-1"
                title="Restore initial Bangalore demo data"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Reload Demo State</span>
              </button>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isInstalling}
                  className="bg-[#02167F] hover:bg-[#031d99] text-[#FFD014] font-bold px-5 py-2.5 rounded-lg text-xs shadow-md disabled:opacity-50"
                >
                  {isInstalling ? 'Running SQL Migrations...' : 'Execute Installer & Lock System'}
                </button>
              </div>
            </div>

          </form>
        )}

      </div>
    </div>
  );
};
