import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Wallet, 
  ArrowUpRight, 
  Clock, 
  ShieldCheck, 
  CheckCircle2, 
  XCircle, 
  RefreshCw, 
  AlertCircle, 
  FileText, 
  PlusCircle, 
  Search,
  Filter,
  Check,
  Ban,
  Download,
  Lock
} from 'lucide-react';
import { api } from '../../services/api';
import { store, exportToCsv } from '../../services/store';
import { 
  LedgerJournal, 
  EarningEntitlement, 
  ReserveRecord, 
  PayoutRequest, 
  TrialBalanceReport 
} from '../../types';

export const FinancialConsole: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'journals' | 'earnings' | 'reserves' | 'payouts' | 'reconciliation'>('journals');
  const [loading, setLoading] = useState(true);

  // Data states
  const [overview, setOverview] = useState<any>(null);
  const [journals, setJournals] = useState<LedgerJournal[]>([]);
  const [entitlements, setEntitlements] = useState<EarningEntitlement[]>([]);
  const [reserves, setReserves] = useState<ReserveRecord[]>([]);
  const [payouts, setPayouts] = useState<PayoutRequest[]>([]);
  const [reconciliation, setReconciliation] = useState<any>(null);

  // Filters
  const [journalTypeFilter, setJournalTypeFilter] = useState('');
  const [journalRefSearch, setJournalRefSearch] = useState('');
  const [payoutStatusFilter, setPayoutStatusFilter] = useState('');
  const [reserveStatusFilter, setReserveStatusFilter] = useState('');

  // Selected Journal Detail Modal
  const [selectedJournal, setSelectedJournal] = useState<LedgerJournal | null>(null);

  // Payout Action Modal
  const [payoutModalAction, setPayoutModalAction] = useState<{
    payout: PayoutRequest;
    type: 'settle' | 'reject';
  } | null>(null);
  const [payoutReason, setPayoutReason] = useState('');
  const [providerTransferId, setProviderTransferId] = useState('');
  const [processingAction, setProcessingAction] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<{ success: boolean; msg: string } | null>(null);

  // Manual Adjustment Modal
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [adjNarration, setAdjNarration] = useState('');
  const [adjSupervisorReason, setAdjSupervisorReason] = useState('');
  const [reversalJournalId, setReversalJournalId] = useState<string>('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [ov, jRes, eRes, rRes, pRes, recRes] = await Promise.all([
        api.getAdminFinancialOverview(),
        api.getAdminJournals({ type: journalTypeFilter, ref: journalRefSearch }),
        api.getAdminEarnings(50),
        api.getAdminReserves(reserveStatusFilter),
        api.getAdminPayouts(payoutStatusFilter),
        api.getAdminFinancialReconciliation()
      ]);

      if (ov && ov.success) setOverview(ov);
      if (jRes && jRes.success) setJournals(jRes.journals || []);
      if (eRes && eRes.success) setEntitlements(eRes.entitlements || []);
      if (rRes && rRes.success) setReserves(rRes.reserves || []);
      if (pRes && pRes.success) setPayouts(pRes.payouts || []);
      if (recRes && recRes.success) setReconciliation(recRes);
    } catch (err) {
      console.error('Failed to load financial console data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [journalTypeFilter, journalRefSearch, payoutStatusFilter, reserveStatusFilter]);

  // Handle Payout Settle or Reject
  const handleProcessPayout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payoutModalAction) return;

    if (payoutModalAction.type === 'reject' && !payoutReason.trim()) {
      alert('A specific rejection or refund reason is mandatory.');
      return;
    }

    setProcessingAction(true);
    try {
      const res = await api.processAdminPayout({
        payout_id: payoutModalAction.payout.id,
        action: payoutModalAction.type,
        provider_transfer_id: providerTransferId.trim() || undefined,
        reason: payoutReason.trim() || undefined
      });

      if (res.success) {
        setActionFeedback({ success: true, msg: res.message || 'Action executed successfully.' });
        setTimeout(() => {
          setPayoutModalAction(null);
          setPayoutReason('');
          setProviderTransferId('');
          setActionFeedback(null);
          loadData();
        }, 1200);
      } else {
        setActionFeedback({ success: false, msg: res.message || res.error || 'Execution failed.' });
      }
    } catch (err: any) {
      setActionFeedback({ success: false, msg: err.message || 'Error occurred.' });
    } finally {
      setProcessingAction(false);
    }
  };

  // Handle Batch Reserve Release
  const handleReleaseMaturedReserves = async () => {
    if (!confirm('Execute batch release of all 15-day matured quality reserves? This will post double-entry transfer journals crediting available balances.')) {
      return;
    }
    try {
      const res = await api.releaseMaturedReserves();
      alert(res.message || 'Batch release completed.');
      loadData();
    } catch (err: any) {
      alert(`Error releasing reserves: ${err.message}`);
    }
  };

  // Handle Manual Adjustment
  const handlePostAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjNarration.trim() || !adjSupervisorReason.trim()) {
      alert('Narration and supervisor justification reason are required.');
      return;
    }

    try {
      const res = await api.postAdminFinancialAdjustment({
        narration: adjNarration.trim(),
        supervisor_reason: adjSupervisorReason.trim(),
        reversal_of_journal_id: reversalJournalId ? Number(reversalJournalId) : undefined
      });

      if (res.success) {
        alert(res.message || 'Adjustment posted successfully.');
        setShowAdjustModal(false);
        setAdjNarration('');
        setAdjSupervisorReason('');
        setReversalJournalId('');
        loadData();
      } else {
        alert(res.message || res.error || 'Failed to post adjustment.');
      }
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  const tb = overview?.trial_balance;
  const isBalanced = tb?.is_balanced ?? true;

  return (
    <div className="space-y-6">
      {/* Header & KPI Summary */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Financial Console & Double-Entry Ledger</h1>
            <span className={`text-xs font-semibold px-2.5 py-0.5 rounded border ${
              isBalanced 
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                : 'bg-rose-50 text-rose-700 border-rose-200'
            }`}>
              {isBalanced ? 'Trial Balance: Verified Balanced (0.00 Diff)' : 'Trial Balance: Discrepancy Detected'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Phase 7 Accounting System · Hostinger Shared Hosting Compatible · Immutable Journals · 70/20/10 Split Engine
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAdjustModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50 transition"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            Adjustment / Reversal
          </button>
          <button
            onClick={loadData}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50 transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Sync
          </button>
        </div>
      </div>

      {/* Top Financial Health KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Project Cost (5001) */}
        <div className="bg-white p-4 rounded border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
            <span>Direct Field Cost</span>
            <Building2 className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-xl font-black text-slate-900">
            ₹{(overview?.earning_stats?.total_gross_field_cost || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            {overview?.earning_stats?.total_entitlements_count || 0} QC-approved milestones recognized
          </p>
        </div>

        {/* Growth Pool (3001) */}
        <div className="bg-white p-4 rounded border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
            <span>Growth Pool Retained</span>
            <ShieldCheck className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-xl font-black text-purple-900">
            ₹{(overview?.growth_pool?.total_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Unallocated TL/Manager shares routed to platform
          </p>
        </div>

        {/* Reserves Held (2004) */}
        <div className="bg-white p-4 rounded border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
            <span>Quality Reserves Held</span>
            <Lock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-xl font-black text-slate-900">
            ₹{(overview?.reserve_stats?.held_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            {overview?.reserve_stats?.held_count || 0} active holds · {overview?.reserve_stats?.matured_ready_count || 0} matured ready
          </p>
        </div>

        {/* Pending Payouts (2005) */}
        <div className="bg-white p-4 rounded border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
            <span>Pending Payouts</span>
            <Clock className="w-4 h-4 text-sky-600" />
          </div>
          <div className="text-xl font-black text-slate-900">
            ₹{(overview?.payout_stats?.pending_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            {overview?.payout_stats?.pending_count || 0} associate withdrawal requests awaiting review
          </p>
        </div>

        {/* Total Settled Disbursed */}
        <div className="bg-white p-4 rounded border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
            <span>Disbursed to Bank</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl font-black text-slate-900">
            ₹{(overview?.payout_stats?.paid_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            {overview?.payout_stats?.paid_count || 0} transfers confirmed by payment provider
          </p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-slate-200">
        <nav className="flex space-x-6 text-sm font-semibold">
          <button
            onClick={() => setActiveTab('journals')}
            className={`pb-3 border-b-2 transition ${
              activeTab === 'journals'
                ? 'border-brand-navy text-brand-navy'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Double-Entry Journals ({journals.length})
          </button>
          <button
            onClick={() => setActiveTab('earnings')}
            className={`pb-3 border-b-2 transition ${
              activeTab === 'earnings'
                ? 'border-brand-navy text-brand-navy'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Earnings & 70/20/10 Splits ({entitlements.length})
          </button>
          <button
            onClick={() => setActiveTab('reserves')}
            className={`pb-3 border-b-2 transition ${
              activeTab === 'reserves'
                ? 'border-brand-navy text-brand-navy'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            15-Day Quality Reserves ({reserves.length})
          </button>
          <button
            onClick={() => setActiveTab('payouts')}
            className={`pb-3 border-b-2 transition ${
              activeTab === 'payouts'
                ? 'border-brand-navy text-brand-navy'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Payout Review & Settlement ({payouts.length})
          </button>
          <button
            onClick={() => setActiveTab('reconciliation')}
            className={`pb-3 border-b-2 transition ${
              activeTab === 'reconciliation'
                ? 'border-brand-navy text-brand-navy'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Trial Balance & Audit
          </button>
        </nav>
      </div>

      {/* TAB 1: DOUBLE-ENTRY JOURNALS */}
      {activeTab === 'journals' && (
        <div className="space-y-4">
          <div className="bg-white p-3 rounded border border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 text-slate-600 font-medium">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <span>Type:</span>
                <select
                  value={journalTypeFilter}
                  onChange={(e) => setJournalTypeFilter(e.target.value)}
                  className="px-2 py-1 text-xs border border-slate-300 rounded focus:ring-1 focus:ring-brand-navy"
                >
                  <option value="">All Types</option>
                  <option value="EARNING_RECOGNITION">Earning Recognition</option>
                  <option value="PAYOUT_REQUESTED">Payout Requested</option>
                  <option value="PAYOUT_SETTLED">Payout Settled</option>
                  <option value="PAYOUT_REVERSED">Payout Reversed</option>
                  <option value="RESERVE_RELEASE">Reserve Release</option>
                  <option value="MANUAL_ADJUSTMENT">Manual Adjustment</option>
                </select>
              </div>

              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
                <input
                  type="text"
                  placeholder="Search journal / task ref..."
                  value={journalRefSearch}
                  onChange={(e) => setJournalRefSearch(e.target.value)}
                  className="pl-8 pr-3 py-1 text-xs border border-slate-300 rounded focus:ring-1 focus:ring-brand-navy w-56"
                />
              </div>
            </div>

            <div className="text-slate-500">
              Debits: <strong className="text-slate-800">₹{journals.reduce((s, j) => s + j.totalDebit, 0).toFixed(2)}</strong> · Credits: <strong className="text-slate-800">₹{journals.reduce((s, j) => s + j.totalCredit, 0).toFixed(2)}</strong>
            </div>
          </div>

          <div className="bg-white rounded border border-slate-200 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-100 text-slate-600 font-semibold uppercase text-[11px] tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Journal Ref</th>
                    <th className="py-3 px-4">Date & Time</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Reference</th>
                    <th className="py-3 px-4 text-right">Debit (INR)</th>
                    <th className="py-3 px-4 text-right">Credit (INR)</th>
                    <th className="py-3 px-4">Balance</th>
                    <th className="py-3 px-4">Narration</th>
                    <th className="py-3 px-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {journals.map((j) => {
                    const balanced = Math.abs(j.totalDebit - j.totalCredit) < 0.005;
                    return (
                      <tr key={j.id} className="hover:bg-slate-50/80 transition">
                        <td className="py-3 px-4 font-mono font-bold text-slate-900">
                          {j.journalRef}
                        </td>
                        <td className="py-3 px-4 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                          {j.postedAt?.slice(0, 16)}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className="font-medium text-slate-700">
                            {j.transactionType.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-600">
                          {j.referenceId || '—'}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-semibold text-slate-900">
                          ₹{j.totalDebit.toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-semibold text-slate-900">
                          ₹{j.totalCredit.toFixed(2)}
                        </td>
                        <td className="py-3 px-4">
                          {balanced ? (
                            <span className="inline-flex items-center text-emerald-700 font-medium">
                              <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Balanced
                            </span>
                          ) : (
                            <span className="inline-flex items-center text-rose-700 font-bold">
                              <XCircle className="w-3.5 h-3.5 mr-1" /> Unbalanced
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-slate-600 max-w-xs truncate" title={j.narration}>
                          {j.narration}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => setSelectedJournal(j)}
                            className="px-2 py-1 text-[11px] font-semibold text-brand-navy bg-brand-navy/5 hover:bg-brand-navy/10 rounded"
                          >
                            Inspect Lines
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: EARNINGS & 70/20/10 ALLOCATIONS */}
      {activeTab === 'earnings' && (
        <div className="bg-white rounded border border-slate-200 overflow-hidden shadow-sm">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">QC Earning Entitlements & Split Audit</h3>
              <p className="text-xs text-slate-500">
                Verified breakdown: 70% Executing Associate (90% available + 10% reserve hold), 20% Team Leader override, 10% Area Manager share, Growth Pool routing for unallocated shares.
              </p>
            </div>
            <button
              onClick={() => {
                const rows = entitlements.map((e) => ({
                  Entitlement_Ref: e.entitlementRef,
                  Task_Ref: e.taskRef,
                  Gross_Rate: e.grossRate,
                  Freelancer_Gross: e.freelancerShareGross,
                  Reserve_Held: e.freelancerReserveAmount,
                  Freelancer_Net: e.freelancerShareNet,
                  Team_Leader_Share: e.teamLeaderShare,
                  TL_Routed_Growth: e.teamLeaderRoutedToGrowth ? 'Yes' : 'No',
                  Manager_Share: e.managerShare,
                  Mgr_Routed_Growth: e.managerRoutedToGrowth ? 'Yes' : 'No',
                  Growth_Pool_Share: e.growthPoolShare
                }));
                exportToCsv('weonboard_earning_entitlements', rows);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50"
            >
              <Download className="w-3.5 h-3.5" />
              Export CSV
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-100 text-slate-600 font-semibold uppercase text-[11px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Entitlement Ref</th>
                  <th className="py-3 px-4">Task / Project</th>
                  <th className="py-3 px-4">Associate</th>
                  <th className="py-3 px-4 text-right">Gross Rate</th>
                  <th className="py-3 px-4 text-right">70% Freelancer</th>
                  <th className="py-3 px-4 text-right">10% Reserve</th>
                  <th className="py-3 px-4 text-right">20% Team Leader</th>
                  <th className="py-3 px-4 text-right">10% Manager</th>
                  <th className="py-3 px-4 text-right">Growth Pool</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {entitlements.map((e) => (
                  <tr key={e.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900 whitespace-nowrap">
                      {e.entitlementRef}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-800">{e.taskRef}</div>
                      <div className="text-[11px] text-slate-500 truncate max-w-xs">{e.taskTitle || e.projectName}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-800">{e.freelancerName}</div>
                      <div className="text-[11px] font-mono text-slate-500">{e.freelancerRef}</div>
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                      ₹{e.grossRate.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-emerald-700 font-semibold">
                      ₹{e.freelancerShareNet.toFixed(2)}
                      <div className="text-[10px] text-slate-500 font-normal">Avail (90%)</div>
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-amber-700">
                      ₹{e.freelancerReserveAmount.toFixed(2)}
                      <div className="text-[10px] text-slate-500 font-normal">Hold (10%)</div>
                    </td>
                    <td className="py-3 px-4 text-right font-mono">
                      {e.teamLeaderRoutedToGrowth ? (
                        <span className="text-slate-400">→ Growth Pool</span>
                      ) : (
                        <span className="text-indigo-700 font-semibold">₹{e.teamLeaderShare.toFixed(2)}</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right font-mono">
                      {e.managerRoutedToGrowth ? (
                        <span className="text-slate-400">→ Growth Pool</span>
                      ) : (
                        <span className="text-indigo-700 font-semibold">₹{e.managerShare.toFixed(2)}</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-purple-700">
                      ₹{e.growthPoolShare.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: RESERVES & 15-DAY HOLD */}
      {activeTab === 'reserves' && (
        <div className="bg-white rounded border border-slate-200 overflow-hidden shadow-sm">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">10% Quality Assurance Reserve Management</h3>
              <p className="text-xs text-slate-500">
                Tracks withheld quality guarantees. Matured reserves (15+ days old) can be released in batch.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={reserveStatusFilter}
                onChange={(e) => setReserveStatusFilter(e.target.value)}
                className="px-2 py-1 text-xs border border-slate-300 rounded"
              >
                <option value="">All Statuses</option>
                <option value="Held">Held</option>
                <option value="Released">Released</option>
              </select>
              <button
                onClick={handleReleaseMaturedReserves}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded shadow-sm transition"
              >
                <Clock className="w-3.5 h-3.5" />
                Release Matured Reserves
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-100 text-slate-600 font-semibold uppercase text-[11px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Reserve Ref</th>
                  <th className="py-3 px-4">Associate</th>
                  <th className="py-3 px-4">Task Ref</th>
                  <th className="py-3 px-4 text-right">Held Amount (INR)</th>
                  <th className="py-3 px-4">Hold Period</th>
                  <th className="py-3 px-4">Maturity Date</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Release Journal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {reserves.map((r) => {
                  const isMatured = new Date(r.releaseDueAt) <= new Date();
                  return (
                    <tr key={r.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">
                        {r.reserveRef}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-800">{r.freelancerName}</div>
                        <div className="text-[11px] font-mono text-slate-500">{r.freelancerRef}</div>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-700">
                        {r.taskRef}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                        ₹{r.amount.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {r.holdDays} days (10%)
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px]">
                        <span className={r.status === 'Held' && isMatured ? 'text-amber-700 font-bold' : 'text-slate-700'}>
                          {r.releaseDueAt?.slice(0, 16)}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {r.status === 'Released' ? (
                          <span className="text-emerald-700 font-medium">Released</span>
                        ) : isMatured ? (
                          <span className="text-amber-700 font-bold">Matured (Ready)</span>
                        ) : (
                          <span className="text-slate-600">Active Hold</span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-500 text-[11px]">
                        {r.releaseJournalRef || (r.status === 'Released' ? 'JRN-RELEASE' : '—')}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: PAYOUT REVIEW & SETTLEMENT */}
      {activeTab === 'payouts' && (
        <div className="bg-white rounded border border-slate-200 overflow-hidden shadow-sm">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Payout Requests & Disbursement Clearing</h3>
              <p className="text-xs text-slate-500">
                Review associate withdrawal requests, approve settlement via simulated provider, or reject with fund refund
              </p>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={payoutStatusFilter}
                onChange={(e) => setPayoutStatusFilter(e.target.value)}
                className="px-2 py-1 text-xs border border-slate-300 rounded"
              >
                <option value="">All Statuses</option>
                <option value="Requested">Requested</option>
                <option value="Paid">Paid</option>
                <option value="Failed">Failed / Cancelled</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-100 text-slate-600 font-semibold uppercase text-[11px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Payout Ref</th>
                  <th className="py-3 px-4">Associate</th>
                  <th className="py-3 px-4">Method & Account</th>
                  <th className="py-3 px-4 text-right">Amount (INR)</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Provider Ref / Reason</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payouts.map((p) => {
                  const isPending = ['Requested', 'Under Review', 'Processing', 'Approved'].includes(p.status);
                  return (
                    <tr key={p.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                        {p.createdAt?.slice(0, 16)}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">
                        {p.payoutRef}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-800">{p.beneficiaryName}</div>
                        <div className="text-[11px] font-mono text-slate-500">{p.freelancerRef}</div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-semibold text-slate-700">{p.paymentMethod}</span>
                        <span className="text-slate-500 font-mono ml-1">· {p.beneficiaryDetails}</span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-black text-slate-900">
                        ₹{p.amount.toFixed(2)}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold border ${
                          p.status === 'Paid' ? 'text-emerald-700 bg-emerald-50 border-emerald-200' :
                          p.status === 'Failed' || p.status === 'Cancelled' ? 'text-rose-700 bg-rose-50 border-rose-200' :
                          'text-amber-700 bg-amber-50 border-amber-200'
                        }`}>
                          {p.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-600 font-mono text-[11px]">
                        {p.providerTransferId ? (
                          <span className="text-emerald-700 font-semibold">{p.providerTransferId}</span>
                        ) : p.failureReason ? (
                          <span className="text-rose-600">{p.failureReason}</span>
                        ) : (
                          <span className="text-slate-400">Clearing hold</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {isPending ? (
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => {
                                setPayoutModalAction({ payout: p, type: 'settle' });
                                setProviderTransferId(`SIM-TRF-${Math.random().toString(36).substring(2, 7).toUpperCase()}`);
                              }}
                              className="px-2 py-1 text-[11px] font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded transition shadow-sm"
                            >
                              Settle
                            </button>
                            <button
                              onClick={() => {
                                setPayoutModalAction({ payout: p, type: 'reject' });
                                setPayoutReason('Beneficiary bank account verification failed');
                              }}
                              className="px-2 py-1 text-[11px] font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded transition"
                            >
                              Reject & Refund
                            </button>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[11px]">Closed</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: TRIAL BALANCE & RECONCILIATION */}
      {activeTab === 'reconciliation' && (
        <div className="space-y-6">
          <div className="bg-white rounded border border-slate-200 p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">General Ledger Trial Balance</h3>
                <p className="text-xs text-slate-500">
                  Comprehensive audit verifying mathematical equality between debit balances and credit balances.
                </p>
              </div>
              <div className="text-right">
                <span className={`text-xs font-bold px-3 py-1 rounded border ${
                  isBalanced ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'
                }`}>
                  {isBalanced ? 'Trial Balance Balanced (Debits == Credits)' : 'Discrepancy Detected'}
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-100 text-slate-600 font-semibold uppercase text-[11px] tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-4">Code</th>
                    <th className="py-2.5 px-4">Account Name</th>
                    <th className="py-2.5 px-4">Classification</th>
                    <th className="py-2.5 px-4 text-right">Total Debit (INR)</th>
                    <th className="py-2.5 px-4 text-right">Total Credit (INR)</th>
                    <th className="py-2.5 px-4 text-right">Net Balance (INR)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {(tb?.accounts || []).map((acc: any) => (
                    <tr key={acc.account_code} className="hover:bg-slate-50 transition">
                      <td className="py-2.5 px-4 font-bold text-slate-900">{acc.account_code}</td>
                      <td className="py-2.5 px-4 font-sans font-medium text-slate-800">{acc.account_name}</td>
                      <td className="py-2.5 px-4 font-sans text-slate-600">{acc.account_type}</td>
                      <td className="py-2.5 px-4 text-right">₹{acc.total_debit.toFixed(2)}</td>
                      <td className="py-2.5 px-4 text-right">₹{acc.total_credit.toFixed(2)}</td>
                      <td className="py-2.5 px-4 text-right font-bold text-slate-900">₹{acc.net_balance.toFixed(2)}</td>
                    </tr>
                  ))}
                  <tr className="bg-slate-50 font-bold border-t-2 border-slate-300">
                    <td colSpan={3} className="py-3 px-4 font-sans uppercase">Grand Totals</td>
                    <td className="py-3 px-4 text-right text-brand-navy">₹{(tb?.grand_total_debit || 0).toFixed(2)}</td>
                    <td className="py-3 px-4 text-right text-brand-navy">₹{(tb?.grand_total_credit || 0).toFixed(2)}</td>
                    <td className="py-3 px-4 text-right text-emerald-700">
                      Diff: ₹{(tb?.discrepancy || 0).toFixed(2)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Associate Wallet vs Ledger Variance Report */}
          <div className="bg-white rounded border border-slate-200 p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Associate Wallet vs. Ledger Variance Audit</h3>
                <p className="text-xs text-slate-500">
                  Compares wallet available balance projections directly against itemized double-entry ledger entries on Account 2001.
                </p>
              </div>
              <span className="text-xs font-semibold text-slate-500">
                {reconciliation?.wallet_audits?.length || 0} Wallets Audited
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-100 text-slate-600 font-semibold uppercase text-[11px] tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-4">Associate</th>
                    <th className="py-2.5 px-4">Registration Ref</th>
                    <th className="py-2.5 px-4 text-right">Wallet Available</th>
                    <th className="py-2.5 px-4 text-right">Ledger Account 2001</th>
                    <th className="py-2.5 px-4 text-right">Variance</th>
                    <th className="py-2.5 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(reconciliation?.wallet_audits || []).map((w: any) => (
                    <tr key={w.freelancer_id} className="hover:bg-slate-50 transition">
                      <td className="py-2.5 px-4 font-semibold text-slate-900">{w.full_name}</td>
                      <td className="py-2.5 px-4 font-mono text-slate-500">{w.registration_ref}</td>
                      <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-900">
                        ₹{(w.wallet_available || 0).toFixed(2)}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono text-slate-700">
                        ₹{(w.ledger_available || 0).toFixed(2)}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono">
                        ₹{(w.available_discrepancy || 0).toFixed(2)}
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        <span className="inline-flex items-center text-emerald-700 font-semibold">
                          <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Reconciled
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* INSPECT JOURNAL MODAL */}
      {selectedJournal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-4 bg-brand-navy text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base">Journal Lines Inspector — {selectedJournal.journalRef}</h3>
                <p className="text-xs text-white/70">{selectedJournal.narration}</p>
              </div>
              <button
                onClick={() => setSelectedJournal(null)}
                className="text-white/70 hover:text-white text-lg font-bold"
              >
                ×
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-3 gap-3 bg-slate-50 p-3 rounded border border-slate-200 text-xs">
                <div>
                  <span className="text-slate-500">Transaction Type:</span>
                  <div className="font-bold text-slate-900 mt-0.5">{selectedJournal.transactionType}</div>
                </div>
                <div>
                  <span className="text-slate-500">Posted By:</span>
                  <div className="font-bold text-slate-900 mt-0.5">{selectedJournal.postedBy}</div>
                </div>
                <div>
                  <span className="text-slate-500">Posted At:</span>
                  <div className="font-mono text-slate-700 mt-0.5">{selectedJournal.postedAt}</div>
                </div>
              </div>

              <div className="border border-slate-200 rounded overflow-hidden">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-100 text-slate-600 font-semibold uppercase text-[11px] tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Account</th>
                      <th className="py-2.5 px-3">Entity</th>
                      <th className="py-2.5 px-3">Type</th>
                      <th className="py-2.5 px-3 text-right">Debit (INR)</th>
                      <th className="py-2.5 px-3 text-right">Credit (INR)</th>
                      <th className="py-2.5 px-3">Line Narration</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(selectedJournal.lines || []).map((line, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 transition">
                        <td className="py-2 px-3 font-mono font-bold text-slate-900">{line.accountCode}</td>
                        <td className="py-2 px-3">{line.entityType} ({line.entityId || 'System'})</td>
                        <td className="py-2 px-3 font-semibold">{line.entryType}</td>
                        <td className="py-2 px-3 text-right font-mono">
                          {line.entryType === 'DEBIT' ? `₹${line.amount.toFixed(2)}` : '—'}
                        </td>
                        <td className="py-2 px-3 text-right font-mono">
                          {line.entryType === 'CREDIT' ? `₹${line.amount.toFixed(2)}` : '—'}
                        </td>
                        <td className="py-2 px-3 text-slate-600 max-w-xs truncate">{line.lineNarration}</td>
                      </tr>
                    ))}
                    <tr className="bg-slate-50 font-bold border-t border-slate-200">
                      <td colSpan={3} className="py-2 px-3">Total</td>
                      <td className="py-2 px-3 text-right font-mono">₹{selectedJournal.totalDebit.toFixed(2)}</td>
                      <td className="py-2 px-3 text-right font-mono">₹{selectedJournal.totalCredit.toFixed(2)}</td>
                      <td></td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={() => setSelectedJournal(null)}
                  className="px-4 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PROCESS PAYOUT MODAL (SETTLE OR REJECT) */}
      {payoutModalAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95">
            <div className={`p-4 text-white flex items-center justify-between ${
              payoutModalAction.type === 'settle' ? 'bg-emerald-700' : 'bg-rose-700'
            }`}>
              <h3 className="font-bold text-base">
                {payoutModalAction.type === 'settle' ? 'Confirm Payout Settlement' : 'Reject & Refund Payout'}
              </h3>
              <button
                onClick={() => setPayoutModalAction(null)}
                className="text-white/70 hover:text-white text-lg font-bold"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleProcessPayout} className="p-6 space-y-4">
              {actionFeedback && (
                <div className={`p-3 rounded text-xs font-medium border ${
                  actionFeedback.success ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-rose-50 text-rose-800 border-rose-200'
                }`}>
                  {actionFeedback.msg}
                </div>
              )}

              <div className="p-3 bg-slate-50 rounded border border-slate-200 text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Payout Ref:</span>
                  <span className="font-mono font-bold text-slate-900">{payoutModalAction.payout.payoutRef}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Beneficiary:</span>
                  <span className="font-semibold text-slate-900">{payoutModalAction.payout.beneficiaryName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Account / VPA:</span>
                  <span className="font-mono text-slate-700">{payoutModalAction.payout.beneficiaryDetails}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Amount:</span>
                  <span className="font-mono font-bold text-slate-900">₹{payoutModalAction.payout.amount.toFixed(2)}</span>
                </div>
              </div>

              {payoutModalAction.type === 'settle' ? (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Provider Transfer Reference *
                  </label>
                  <input
                    type="text"
                    value={providerTransferId}
                    onChange={(e) => setProviderTransferId(e.target.value)}
                    placeholder="e.g. SIM-TRF-98124 or Bank UTR"
                    required
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded font-mono focus:ring-1 focus:ring-brand-navy"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Settling posts a balanced journal clearing funds from Account 2005 to Account 1001 (Cash/Bank).
                  </p>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Rejection / Refund Reason *
                  </label>
                  <textarea
                    rows={3}
                    value={payoutReason}
                    onChange={(e) => setPayoutReason(e.target.value)}
                    placeholder="Provide detailed cause for rejecting payout..."
                    required
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded focus:ring-1 focus:ring-brand-navy"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Rejecting automatically restores the ₹{payoutModalAction.payout.amount.toFixed(2)} to the associate's available balance via a linked reversal journal.
                  </p>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setPayoutModalAction(null)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={processingAction}
                  className={`px-4 py-2 text-xs font-semibold text-white rounded transition shadow-sm ${
                    payoutModalAction.type === 'settle' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
                  }`}
                >
                  {processingAction ? 'Executing Journal...' : (payoutModalAction.type === 'settle' ? 'Confirm Settlement' : 'Confirm Rejection & Refund')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MANUAL ADJUSTMENT / REVERSAL MODAL */}
      {showAdjustModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-4 bg-brand-navy text-white flex items-center justify-between">
              <h3 className="font-bold text-base">Authorized Journal Reversal / Adjustment</h3>
              <button
                onClick={() => setShowAdjustModal(false)}
                className="text-white/70 hover:text-white text-lg font-bold"
              >
                ×
              </button>
            </div>

            <form onSubmit={handlePostAdjustment} className="p-6 space-y-4">
              <div className="p-3 bg-amber-50 rounded border border-amber-200 text-xs text-amber-900">
                <strong>Segregation of Duties:</strong> Posted double-entry journals are permanent. To correct an erroneous entry, specify the original journal ID to generate a balanced linked reversal entry.
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Original Journal ID to Reverse (Optional)
                </label>
                <input
                  type="number"
                  value={reversalJournalId}
                  onChange={(e) => setReversalJournalId(e.target.value)}
                  placeholder="e.g. 1 (Leave blank for direct correction)"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded font-mono focus:ring-1 focus:ring-brand-navy"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Narration *
                </label>
                <input
                  type="text"
                  value={adjNarration}
                  onChange={(e) => setAdjNarration(e.target.value)}
                  placeholder="e.g. Corrective reversal of erroneous task recognition"
                  required
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded focus:ring-1 focus:ring-brand-navy"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Supervisor Justification Reason *
                </label>
                <textarea
                  rows={3}
                  value={adjSupervisorReason}
                  onChange={(e) => setAdjSupervisorReason(e.target.value)}
                  placeholder="Mandatory business reason and audit documentation..."
                  required
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded focus:ring-1 focus:ring-brand-navy"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAdjustModal(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-brand-navy hover:bg-brand-navy/90 rounded transition shadow-sm"
                >
                  Post Adjustment Journal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
