import React, { useState } from 'react';
import { UserCheck, Plus, Shield, CheckCircle2, X } from 'lucide-react';
import { store } from '../../services/store';
import { AdminRole, AdminUser } from '../../types';

export const UserManager: React.FC = () => {
  const [users, setUsers] = useState<AdminUser[]>(store.getState().adminUsers);
  const [showAddUser, setShowAddUser] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<AdminRole>('Administrator');

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newEmail) return;

    store.addAdminUser(newName, newEmail, newRole);
    setUsers([...store.getState().adminUsers]);
    setShowAddUser(false);
    setNewName('');
    setNewEmail('');
    alert(`Staff account created for ${newName} with role ${newRole}!`);
  };

  const handleToggleActive = (id: string) => {
    store.toggleAdminUserActive(id);
    setUsers([...store.getState().adminUsers]);
  };

  const rolesMatrix = [
    { role: 'Super Admin', access: 'Full system control, credentials, database, audit log access, CMS & RBAC' },
    { role: 'Administrator', access: 'Enquiries, freelancers, projects, client management, CMS' },
    { role: 'Enquiry Manager', access: 'View, assign, and update contact enquiries & proposals' },
    { role: 'Freelancer Coordinator', access: 'Review freelancer registrations, verify KYC docs, certify training' },
    { role: 'Project Manager', access: 'Create field projects, assign tasks, review submitted geo-tag evidence' },
    { role: 'Finance Manager', access: 'View approved work records and bank payout summaries' },
    { role: 'Content Manager', access: 'Edit hero banners, services, FAQs, and public website copy' },
  ];

  return (
    <div className="space-y-6 animate-in fade-in">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-[#02167F]">
            Staff Accounts & Role-Based Access Control (RBAC)
          </h2>
          <p className="text-xs text-slate-500">
            Manage administrative privileges, operational scopes and staff security.
          </p>
        </div>

        <button
          onClick={() => setShowAddUser(true)}
          className="bg-[#02167F] hover:bg-[#031d99] text-[#FFD014] font-bold px-3.5 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-sm self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Staff Account</span>
        </button>
      </div>

      {/* Staff Accounts Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3">User ID</th>
                <th className="px-4 py-3">Staff Name & Email</th>
                <th className="px-4 py-3">Assigned Role</th>
                <th className="px-4 py-3">Last Login</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Access Control</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-blue-50/40 transition-colors">
                  <td className="px-4 py-3 font-mono font-bold text-[#02167F]">
                    {u.id}
                  </td>
                  <td className="px-4 py-3">
                    <strong className="text-slate-900 block font-bold">{u.name}</strong>
                    <span className="text-slate-500">{u.email}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                      u.role === 'Super Admin' ? 'bg-purple-100 text-purple-800' :
                      u.role === 'Administrator' ? 'bg-blue-100 text-blue-800' :
                      'bg-slate-100 text-slate-700'
                    }`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-slate-500 text-[11px]">
                    {u.lastLogin || 'Never logged in'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-[11px] font-bold ${u.isActive ? 'text-emerald-700' : 'text-slate-400'}`}>
                      {u.isActive ? '● Active' : '○ Suspended'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {u.role !== 'Super Admin' && (
                      <button
                        onClick={() => handleToggleActive(u.id)}
                        className="text-xs font-bold text-slate-600 hover:text-slate-900 hover:underline"
                      >
                        {u.isActive ? 'Suspend' : 'Reactivate'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Permissions Matrix */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
        <h3 className="text-sm font-extrabold text-[#02167F]">
          Operational Role Permissions Matrix (Server Enforced)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          {rolesMatrix.map((rm) => (
            <div key={rm.role} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
              <strong className="text-slate-900 font-bold block">{rm.role}</strong>
              <p className="text-slate-600 text-[11px] leading-relaxed">{rm.access}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Add Staff Account Modal */}
      {showAddUser && (
        <div className="fixed inset-0 z-50 bg-[#02167F]/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 sm:p-8 relative shadow-2xl border border-slate-200 animate-in zoom-in-95 space-y-4">
            <button onClick={() => setShowAddUser(false)} className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-700">
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-xl font-extrabold text-[#02167F]">
              Add Staff User
            </h3>

            <form onSubmit={handleCreateUser} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Ramesh Hegde"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Work Email</label>
                <input
                  type="email"
                  required
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="ramesh@weonboard.in"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Assigned Operational Role</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as AdminRole)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-bold"
                >
                  <option value="Administrator">Administrator</option>
                  <option value="Enquiry Manager">Enquiry Manager</option>
                  <option value="Freelancer Coordinator">Freelancer Coordinator</option>
                  <option value="Project Manager">Project Manager</option>
                  <option value="Finance Manager">Finance Manager</option>
                  <option value="Content Manager">Content Manager</option>
                </select>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button type="button" onClick={() => setShowAddUser(false)} className="px-4 py-2 text-xs font-bold text-slate-600">
                  Cancel
                </button>
                <button type="submit" className="bg-[#02167F] text-[#FFD014] font-bold px-5 py-2 rounded-lg text-xs">
                  Create User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
