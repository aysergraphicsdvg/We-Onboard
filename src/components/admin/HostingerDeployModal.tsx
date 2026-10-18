import React, { useState } from 'react';
import { 
  Download, 
  FileCode, 
  Server, 
  Database, 
  CheckCircle2, 
  ShieldCheck, 
  X, 
  Copy, 
  ExternalLink 
} from 'lucide-react';
import { generateHostingerFiles, downloadHostingerZip, HostingerFile } from '../../services/hostingerPackage';

interface HostingerDeployModalProps {
  onClose: () => void;
}

export const HostingerDeployModal: React.FC<HostingerDeployModalProps> = ({ onClose }) => {
  const files = generateHostingerFiles();
  const [selectedFile, setSelectedFile] = useState<HostingerFile>(files[0]);
  const [isDownloading, setIsDownloading] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      await downloadHostingerZip();
    } catch (err) {
      console.error(err);
      alert('Failed to generate ZIP package. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(selectedFile.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#02167F]/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-4xl w-full p-6 sm:p-8 max-h-[90vh] overflow-y-auto relative shadow-2xl border border-slate-200 animate-in zoom-in-95 space-y-6">
        
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-700 rounded-full"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="bg-[#FFD014] text-[#02167F] font-black text-xs px-2 py-0.5 rounded">
                HOSTINGER
              </span>
              <span className="text-xs font-mono text-slate-500">PHP 8.x + MySQL Deployment Package</span>
            </div>
            <h3 className="text-2xl font-extrabold text-[#02167F]">
              Export Hostinger Business Shared Hosting Package
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Ready-to-upload zip containing MVC architecture, PDO database migrations, .htaccess, and one-time installer.
            </p>
          </div>

          <button
            onClick={handleDownload}
            disabled={isDownloading}
            className="bg-[#02167F] hover:bg-[#031d99] text-[#FFD014] font-extrabold px-5 py-3 rounded-xl text-xs flex items-center gap-2 shadow-md hover:shadow-lg disabled:opacity-50 transition-all shrink-0"
          >
            <Download className="w-4 h-4" />
            <span>{isDownloading ? 'Packaging Files...' : 'Download .ZIP Package'}</span>
          </button>
        </div>

        {/* Hosting Architecture Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-200">
            <strong className="text-[#02167F] block font-bold mb-1">1. Target Environment</strong>
            <p className="text-slate-600 leading-relaxed">Hostinger Business Shared Hosting (or Cloud Startup). Runs inside <code>public_html</code>.</p>
          </div>
          <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200">
            <strong className="text-amber-900 block font-bold mb-1">2. Zero Dependencies</strong>
            <p className="text-slate-600 leading-relaxed">No Node.js runtime, no Firebase, no Docker required on the host. Native PHP 8.1/8.2 PDO.</p>
          </div>
          <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200">
            <strong className="text-emerald-900 block font-bold mb-1">3. Automated Setup</strong>
            <p className="text-slate-600 leading-relaxed">Includes <code>install.php</code> to initialize the MySQL database and create the Super Admin.</p>
          </div>
        </div>

        {/* Source File Explorer */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-700">
            <span>Browse Included Source Files ({files.length} Files):</span>
            <button
              onClick={handleCopyCode}
              className="text-[#02167F] hover:underline flex items-center gap-1 font-semibold"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>{copied ? 'Copied to Clipboard!' : 'Copy Code'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 border border-slate-200 rounded-xl overflow-hidden bg-slate-50">
            
            {/* File List */}
            <div className="md:col-span-4 bg-white border-r border-slate-200 p-3 space-y-1 text-xs">
              {files.map((file) => (
                <button
                  key={file.path}
                  onClick={() => setSelectedFile(file)}
                  className={`w-full text-left px-3 py-2 rounded-lg font-mono text-[11px] flex items-center gap-2 transition-colors ${
                    selectedFile.path === file.path
                      ? 'bg-[#02167F] text-[#FFD014] font-bold'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <FileCode className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{file.path}</span>
                </button>
              ))}
            </div>

            {/* Code Preview */}
            <div className="md:col-span-8 p-3 flex flex-col">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200 text-xs">
                <span className="font-mono font-bold text-[#02167F]">{selectedFile.path}</span>
                <span className="text-[10px] text-slate-500 italic truncate max-w-xs">{selectedFile.description}</span>
              </div>
              <pre className="bg-slate-900 text-slate-200 p-4 rounded-lg font-mono text-[11px] overflow-x-auto max-h-72 leading-relaxed selection:bg-[#FFD014] selection:text-[#02167F]">
                <code>{selectedFile.content}</code>
              </pre>
            </div>

          </div>
        </div>

        {/* 5-Step Hostinger Instructions */}
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs space-y-2">
          <strong className="text-[#02167F] text-sm block">Quick Hostinger Upload Checklist:</strong>
          <ol className="list-decimal pl-5 space-y-1 text-slate-700">
            <li>Download the zip above and open Hostinger hPanel &rarr; <strong>File Manager</strong>.</li>
            <li>Extract all files into <code>public_html</code> (or configured subdomain root).</li>
            <li>In hPanel &rarr; <strong>Databases</strong>, create a new MySQL database & user.</li>
            <li>Navigate to <code>https://yourdomain.com/install.php</code> in your browser to run the 1-click installer.</li>
            <li>Log into <code>/admin/login.php</code> with your created Super Admin credentials!</li>
          </ol>
        </div>

        <div className="flex items-center justify-between pt-2">
          <span className="text-[11px] text-slate-400 font-mono">
            Hostinger Shared Hosting Compatibility Verified
          </span>
          <button
            onClick={onClose}
            className="bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold px-5 py-2 rounded-lg text-xs"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
