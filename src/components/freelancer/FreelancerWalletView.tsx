import React, { useState, useEffect } from 'react';
import { 
  Wallet, 
  ArrowUpRight, 
  Clock, 
  ShieldCheck, 
  Download, 
  Calendar, 
  AlertCircle, 
  CheckCircle2, 
  XCircle, 
  RefreshCw,
  Building2,
  Lock,
  ChevronDown,
  ChevronUp,
  FileText
} from 'lucide-react';
import { api } from '../../services/api';
import { store, exportToCsv } from '../../services/store';
import { FreelancerWallet, LedgerEntry, ReserveRecord, PayoutRequest, EarningEntitlement } from '../../types';

interface FreelancerWalletViewProps {
  freelancerId?: string | number;
}

export const FreelancerWalletView: React.FC<FreelancerWalletViewProps> = ({ freelancerId }) => {
  const [wallet, setWallet] = useState<FreelancerWallet | null>(null);
  const [ledgerEntries, setLedgerEntries] = useState<LedgerEntry[]>([]);
  const [reserves, setReserves] = useState<ReserveRecord[]>([]);
  const [payouts, setPayouts] = useState<PayoutRequest[]>([]);
  const [entitlements, setEntitlements] = useState<EarningEntitlement[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'transactions' | 'reserves' | 'payouts' | 'statements'>('transactions');

  // Payout Modal State
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'UPI' | 'Bank Transfer' | 'NEFT'>('UPI');
  const [beneficiaryName, setBeneficiaryName] = useState('');
  const [beneficiaryDetails, setBeneficiaryDetails] = useState('');
  const [payoutSubmitting, setPayoutSubmitting] = useState(false);
  const [payoutError, setPayoutError] = useState<string | null>(null);
  const [payoutSuccess, setPayoutSuccess] = useState<string | null>(null);

  // Statement Filters
  const [stmtStart, setStmtStart] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().split('T')[0];
  });
  const [stmtEnd, setStmtEnd] = useState(() => new Date().toISOString().split('T')[0]);

  const loadWalletData = async () => {
    setLoading(true);
    try {
      const data = await api.getFreelancerWallet(freelancerId);
      if (data && data.success) {
        setWallet(data.wallet);
        setLedgerEntries(data.ledger_entries || []);
        setReserves(data.reserves || []);
        setPayouts(data.payouts || []);
        setEntitlements(data.entitlements || []);
        if (data.wallet?.freelancer_name && !beneficiaryName) {
          setBeneficiaryName(data.wallet.freelancer_name);
        }
      }
    } catch (err) {
      console.error('Error fetching wallet:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWalletData();
  }, [freelancerId]);

  const handleRequestPayout = async (e: React.FormEvent) => {
    e.preventDefault();
    setPayoutError(null);
    setPayoutSuccess(null);

    const amountNum = parseFloat(payoutAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setPayoutError('Please enter a valid payout amount.');
      return;
    }
    if (amountNum < (wallet?.minPayoutAmount || 500)) {
      setPayoutError(`Minimum payout request is ₹${wallet?.minPayoutAmount || 500}.`);
      return;
    }
    if (amountNum > (wallet?.availableBalance || 0)) {
      setPayoutError(`Amount exceeds your available balance of ₹${(wallet?.availableBalance || 0).toFixed(2)}.`);
      return;
    }
    if (!beneficiaryName.trim() || !beneficiaryDetails.trim()) {
      setPayoutError('Beneficiary name and account or UPI ID are required.');
      return;
    }

    setPayoutSubmitting(true);
    try {
      const res = await api.requestPayout({
        amount: amountNum,
        payment_method: paymentMethod,
        beneficiary_name: beneficiaryName.trim(),
        beneficiary_details: beneficiaryDetails.trim()
      });

      if (res.success) {
        setPayoutSuccess(res.message || 'Payout request submitted successfully.');
        setPayoutAmount('');
        setTimeout(() => {
          setShowPayoutModal(false);
          setPayoutSuccess(null);
          loadWalletData();
        }, 1500);
      } else {
        setPayoutError(res.message || res.error || 'Failed to submit payout request.');
      }
    } catch (err: any) {
      setPayoutError(err.message || 'An unexpected error occurred.');
    } finally {
      setPayoutSubmitting(false);
    }
  };

  const handleExportStatement = () => {
    const rows = ledgerEntries.map((e) => ({
      Date: e.createdAt,
      Journal_Ref: (e as any).journal_ref || '',
      Type: (e as any).transaction_type || '',
      Account: `${e.accountCode} - ${(e as any).account_name || ''}`,
      Entry_Type: e.entryType,
      Amount_INR: e.amount,
      Narration: e.lineNarration
    }));
    exportToCsv(`weonboard_statement_${stmtStart}_to_${stmtEnd}`, rows);
  };

  if (loading && !wallet) {
    return (
      <div className="py-16 text-center text-slate-500">
        <RefreshCw className="w-8 h-8 mx-auto animate-spin mb-3 text-brand-navy" />
        <p className="text-sm font-medium">Reconciling Double-Entry Wallet Balances...</p>
      </div>
    );
  }

  const available = wallet?.availableBalance || 0;
  const reserved = wallet?.reservedBalance || 0;
  const pending = wallet?.pendingEarnings || 0;
  const inProgress = wallet?.payoutsInProgress || 0;
  const paid = wallet?.paidPayouts || 0;
  const totalEarned = wallet?.totalEarned || 0;

  return (
    <div className="space-y-6">
      {/* Top Banner / Headline */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">Earnings & Associate Wallet</h2>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
              Double-Entry Reconciled
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-0.5">
            Real-time ledger projection for {wallet?.freelancerName} ({wallet?.registrationRef}) · Rank: <strong className="text-slate-700">{wallet?.currentRank}</strong>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadWalletData}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50 transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>
          <button
            onClick={() => {
              setPayoutError(null);
              setPayoutSuccess(null);
              setShowPayoutModal(true);
            }}
            disabled={available < (wallet?.minPayoutAmount || 500) || !wallet?.isKycApproved || wallet?.hasFraudFlag}
            className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded shadow-sm transition ${
              available >= (wallet?.minPayoutAmount || 500) && wallet?.isKycApproved && !wallet?.hasFraudFlag
                ? 'bg-brand-navy text-white hover:bg-brand-navy/90'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            <ArrowUpRight className="w-4 h-4" />
            Request Payout
          </button>
        </div>
      </div>

      {/* KYC / Disciplinary Warning Notice if not verified */}
      {!wallet?.isKycApproved && (
        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r text-sm text-amber-900 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold">KYC Verification Pending:</span> While earnings are established on QC approval, withdrawals are locked until your identity documents are reviewed and verified by the administrative compliance team.
          </div>
        </div>
      )}

      {wallet?.hasFraudFlag && (
        <div className="bg-rose-50 border-l-4 border-rose-500 p-4 rounded-r text-sm text-rose-900 flex items-start gap-3">
          <XCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold">Withdrawal Hold:</span> Account has an active policy observation or quality dispute. Withdrawals are temporarily paused pending operational resolution.
          </div>
        </div>
      )}

      {/* Financial KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Available Balance */}
        <div className="bg-white p-5 rounded border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
            <span>Available Balance</span>
            <Wallet className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">
            ₹{available.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <p className="text-xs text-slate-500 mt-2">
            Withdrawable funds from approved work & released reserves
          </p>
        </div>

        {/* Reserved Balance (10%) */}
        <div className="bg-white p-5 rounded border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
            <span>15-Day Quality Reserve</span>
            <Lock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">
            ₹{reserved.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <p className="text-xs text-slate-500 mt-2">
            10% held for 15 days; auto-credits to available upon maturity
          </p>
        </div>

        {/* Pending QC Verification */}
        <div className="bg-white p-5 rounded border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
            <span>Pending QC Review</span>
            <Clock className="w-4 h-4 text-sky-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">
            ₹{pending.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <p className="text-xs text-slate-500 mt-2">
            Estimated 70% share for submitted field proofs awaiting review
          </p>
        </div>

        {/* Payouts in Progress */}
        <div className="bg-white p-5 rounded border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
            <span>In-Transit Payouts</span>
            <RefreshCw className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">
            ₹{inProgress.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <p className="text-xs text-slate-500 mt-2">
            Earmarked clearing requests currently being processed
          </p>
        </div>

        {/* Lifetime Earnings */}
        <div className="bg-white p-5 rounded border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
            <span>Total Earned (Gross 70%)</span>
            <ShieldCheck className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">
            ₹{totalEarned.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div className="flex items-center justify-between text-xs text-slate-500 mt-2">
            <span>Disbursed: ₹{paid.toLocaleString('en-IN', { minimumFractionDigits: 0 })}</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200 flex items-center justify-between">
        <nav className="flex space-x-6">
          <button
            onClick={() => setActiveTab('transactions')}
            className={`pb-3 text-sm font-semibold border-b-2 transition ${
              activeTab === 'transactions'
                ? 'border-brand-navy text-brand-navy'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Ledger Activity ({ledgerEntries.length})
          </button>
          <button
            onClick={() => setActiveTab('reserves')}
            className={`pb-3 text-sm font-semibold border-b-2 transition ${
              activeTab === 'reserves'
                ? 'border-brand-navy text-brand-navy'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            15-Day Quality Reserves ({reserves.length})
          </button>
          <button
            onClick={() => setActiveTab('payouts')}
            className={`pb-3 text-sm font-semibold border-b-2 transition ${
              activeTab === 'payouts'
                ? 'border-brand-navy text-brand-navy'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Payout Requests ({payouts.length})
          </button>
          <button
            onClick={() => setActiveTab('statements')}
            className={`pb-3 text-sm font-semibold border-b-2 transition ${
              activeTab === 'statements'
                ? 'border-brand-navy text-brand-navy'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Account Statement & CSV
          </button>
        </nav>
      </div>

      {/* Tab 1: Ledger Activity */}
      {activeTab === 'transactions' && (
        <div className="bg-white rounded border border-slate-200 overflow-hidden shadow-sm">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Individual Double-Entry Line Records</h3>
              <p className="text-xs text-slate-500">Immutable ledger entries referencing verified field milestones and clearing transfers</p>
            </div>
            <span className="text-xs text-slate-500">Showing last {ledgerEntries.length} movements</span>
          </div>

          {ledgerEntries.length === 0 ? (
            <div className="p-12 text-center text-slate-500 text-sm">
              No financial ledger entries recorded yet. Once your tasks pass Quality Control, earnings will post here automatically.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-100 text-slate-600 font-semibold uppercase text-[11px] tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Date & Time</th>
                    <th className="py-3 px-4">Journal Ref</th>
                    <th className="py-3 px-4">Transaction Type</th>
                    <th className="py-3 px-4">Ledger Account</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4 text-right">Amount (INR)</th>
                    <th className="py-3 px-4">Narration</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {ledgerEntries.map((e) => {
                    const isCredit = e.entryType === 'CREDIT';
                    return (
                      <tr key={e.id} className="hover:bg-slate-50/80 transition">
                        <td className="py-3 px-4 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                          {e.createdAt?.slice(0, 16)}
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-800 font-semibold whitespace-nowrap">
                          {(e as any).journal_ref || 'JRN-HIST'}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className="text-slate-700 font-medium">
                            {((e as any).transaction_type || 'EARNING_RECOGNITION').replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className="font-mono text-slate-600 font-medium">{e.accountCode}</span>
                          <span className="text-slate-500 ml-1.5">· {(e as any).account_name || 'Payable'}</span>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className={`font-semibold ${isCredit ? 'text-emerald-700' : 'text-slate-800'}`}>
                            {e.entryType}
                          </span>
                        </td>
                        <td className={`py-3 px-4 text-right font-mono font-bold whitespace-nowrap ${isCredit ? 'text-emerald-700' : 'text-slate-900'}`}>
                          {isCredit ? '+' : '-'}₹{e.amount.toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-slate-600 max-w-xs truncate" title={e.lineNarration}>
                          {e.lineNarration}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: 15-Day Quality Reserves */}
      {activeTab === 'reserves' && (
        <div className="bg-white rounded border border-slate-200 overflow-hidden shadow-sm">
          <div className="p-4 bg-slate-50 border-b border-slate-200">
            <h3 className="text-sm font-bold text-slate-900">10% Quality Assurance Reserve Ledger</h3>
            <p className="text-xs text-slate-500">
              In accordance with operational policy, 10% of gross earnings is retained for 15 days to guarantee field quality. Upon maturity, the reserve is automatically credited to your available balance.
            </p>
          </div>

          {reserves.length === 0 ? (
            <div className="p-12 text-center text-slate-500 text-sm">
              No reserve records currently active.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-100 text-slate-600 font-semibold uppercase text-[11px] tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Reserve Ref</th>
                    <th className="py-3 px-4">Task Reference</th>
                    <th className="py-3 px-4">Created Date</th>
                    <th className="py-3 px-4">Release Due Date</th>
                    <th className="py-3 px-4 text-right">Amount (INR)</th>
                    <th className="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {reserves.map((r) => {
                    const isMatured = new Date(r.releaseDueAt) <= new Date();
                    return (
                      <tr key={r.id} className="hover:bg-slate-50/80 transition">
                        <td className="py-3 px-4 font-mono font-semibold text-slate-900">
                          {r.reserveRef}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-medium text-slate-800">{r.taskRef || 'Task'}</div>
                          <div className="text-[11px] text-slate-500 truncate max-w-xs">{r.taskTitle}</div>
                        </td>
                        <td className="py-3 px-4 text-slate-600 font-mono text-[11px]">
                          {r.createdAt?.slice(0, 16)}
                        </td>
                        <td className="py-3 px-4 font-mono text-[11px]">
                          <span className={r.status === 'Held' && isMatured ? 'text-amber-700 font-bold' : 'text-slate-700'}>
                            {r.releaseDueAt?.slice(0, 16)}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                          ₹{r.amount.toFixed(2)}
                        </td>
                        <td className="py-3 px-4">
                          {r.status === 'Released' ? (
                            <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Released to Available
                            </span>
                          ) : isMatured ? (
                            <span className="inline-flex items-center gap-1 text-amber-700 font-medium">
                              <Clock className="w-3.5 h-3.5" /> Matured (Pending Batch Run)
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-slate-600">
                              <Lock className="w-3.5 h-3.5 text-slate-400" /> Held (15-Day Quality Window)
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Payout Requests */}
      {activeTab === 'payouts' && (
        <div className="bg-white rounded border border-slate-200 overflow-hidden shadow-sm">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Payout Requests & Disbursed Transfers</h3>
              <p className="text-xs text-slate-500">Track all bank/UPI withdrawals and confirmation references</p>
            </div>
            <button
              onClick={() => {
                setPayoutError(null);
                setPayoutSuccess(null);
                setShowPayoutModal(true);
              }}
              disabled={available < (wallet?.minPayoutAmount || 500) || !wallet?.isKycApproved || wallet?.hasFraudFlag}
              className={`px-3 py-1.5 text-xs font-semibold rounded transition ${
                available >= (wallet?.minPayoutAmount || 500) && wallet?.isKycApproved && !wallet?.hasFraudFlag
                  ? 'bg-brand-navy text-white hover:bg-brand-navy/90'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              + New Payout Request
            </button>
          </div>

          {payouts.length === 0 ? (
            <div className="p-12 text-center text-slate-500 text-sm">
              No payout requests filed yet. You can request a payout anytime your available balance reaches ₹{wallet?.minPayoutAmount || 500}.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-100 text-slate-600 font-semibold uppercase text-[11px] tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Payout Ref</th>
                    <th className="py-3 px-4">Beneficiary</th>
                    <th className="py-3 px-4">Method & Account</th>
                    <th className="py-3 px-4 text-right">Amount (INR)</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Provider Confirmation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {payouts.map((p) => {
                    const statusColor = 
                      p.status === 'Paid' ? 'text-emerald-700 bg-emerald-50 border-emerald-200' :
                      p.status === 'Failed' || p.status === 'Cancelled' ? 'text-rose-700 bg-rose-50 border-rose-200' :
                      'text-amber-700 bg-amber-50 border-amber-200';
                    return (
                      <tr key={p.id} className="hover:bg-slate-50/80 transition">
                        <td className="py-3 px-4 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                          {p.createdAt?.slice(0, 16)}
                        </td>
                        <td className="py-3 px-4 font-mono font-semibold text-slate-900">
                          {p.payoutRef}
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-800">
                          {p.beneficiaryName}
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-semibold text-slate-700">{p.paymentMethod}</span>
                          <span className="text-slate-500 font-mono ml-1">· {p.beneficiaryDetails}</span>
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                          ₹{p.amount.toFixed(2)}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold border ${statusColor}`}>
                            {p.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-600 font-mono text-[11px]">
                          {p.providerTransferId ? (
                            <span className="text-emerald-700 font-medium">Ref: {p.providerTransferId}</span>
                          ) : p.failureReason ? (
                            <span className="text-rose-600 truncate max-w-xs block" title={p.failureReason}>
                              Refunded: {p.failureReason}
                            </span>
                          ) : (
                            <span className="text-slate-400">Clearing in progress</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 4: Statements & CSV */}
      {activeTab === 'statements' && (
        <div className="bg-white rounded border border-slate-200 p-6 shadow-sm space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
            <div>
              <h3 className="text-base font-bold text-slate-900">Periodic Financial Statement</h3>
              <p className="text-xs text-slate-500">Generate and export itemized ledger movements for tax, accounting, or auditing</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 text-xs text-slate-600">
                <Calendar className="w-4 h-4 text-slate-400" />
                <span>From</span>
                <input
                  type="date"
                  value={stmtStart}
                  onChange={(e) => setStmtStart(e.target.value)}
                  className="px-2 py-1 text-xs border border-slate-300 rounded focus:ring-1 focus:ring-brand-navy"
                />
                <span>To</span>
                <input
                  type="date"
                  value={stmtEnd}
                  onChange={(e) => setStmtEnd(e.target.value)}
                  className="px-2 py-1 text-xs border border-slate-300 rounded focus:ring-1 focus:ring-brand-navy"
                />
              </div>
              <button
                onClick={handleExportStatement}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-brand-navy rounded hover:bg-brand-navy/90 transition shadow-sm"
              >
                <Download className="w-3.5 h-3.5" />
                Download Statement (CSV)
              </button>
            </div>
          </div>

          {/* Statement Overview Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 p-4 bg-slate-50 rounded border border-slate-200 text-xs">
            <div>
              <div className="text-slate-500">Associate Name:</div>
              <div className="font-bold text-slate-900 mt-0.5">{wallet?.freelancerName}</div>
            </div>
            <div>
              <div className="text-slate-500">Registration Ref:</div>
              <div className="font-mono font-bold text-slate-900 mt-0.5">{wallet?.registrationRef}</div>
            </div>
            <div>
              <div className="text-slate-500">Available Balance:</div>
              <div className="font-mono font-bold text-emerald-700 mt-0.5">₹{available.toFixed(2)}</div>
            </div>
            <div>
              <div className="text-slate-500">Disbursed to Date:</div>
              <div className="font-mono font-bold text-slate-900 mt-0.5">₹{paid.toFixed(2)}</div>
            </div>
          </div>

          {/* Itemized Table */}
          <div className="overflow-x-auto border border-slate-200 rounded">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-100 text-slate-600 font-semibold uppercase text-[11px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-4">Date</th>
                  <th className="py-2.5 px-4">Ref</th>
                  <th className="py-2.5 px-4">Account</th>
                  <th className="py-2.5 px-4">Entry</th>
                  <th className="py-2.5 px-4 text-right">Amount (INR)</th>
                  <th className="py-2.5 px-4">Narration</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {ledgerEntries.slice(0, 20).map((e) => (
                  <tr key={e.id} className="hover:bg-slate-50 transition">
                    <td className="py-2 px-4 font-mono text-slate-500 text-[11px]">{e.createdAt?.slice(0, 10)}</td>
                    <td className="py-2 px-4 font-mono font-semibold text-slate-800">{(e as any).journal_ref || 'JRN'}</td>
                    <td className="py-2 px-4 font-mono text-slate-600">{e.accountCode}</td>
                    <td className="py-2 px-4 font-bold">{e.entryType}</td>
                    <td className={`py-2 px-4 text-right font-mono font-bold ${e.entryType === 'CREDIT' ? 'text-emerald-700' : 'text-slate-900'}`}>
                      ₹{e.amount.toFixed(2)}
                    </td>
                    <td className="py-2 px-4 text-slate-600 max-w-xs truncate">{e.lineNarration}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Payout Request Modal */}
      {showPayoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-4 bg-brand-navy text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ArrowUpRight className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-base">Request Earnings Withdrawal</h3>
              </div>
              <button
                onClick={() => setShowPayoutModal(false)}
                className="text-white/70 hover:text-white text-lg font-bold"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleRequestPayout} className="p-6 space-y-4">
              {payoutError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded text-rose-800 text-xs font-medium">
                  {payoutError}
                </div>
              )}

              {payoutSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded text-emerald-800 text-xs font-medium">
                  {payoutSuccess}
                </div>
              )}

              <div className="p-3 bg-slate-50 rounded border border-slate-200 text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Available Balance:</span>
                  <span className="font-mono font-bold text-slate-900">₹{available.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Minimum Withdrawal:</span>
                  <span className="font-mono text-slate-700">₹{wallet?.minPayoutAmount || 500}.00</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Withdrawal Amount (INR) *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-400 font-bold">₹</span>
                  <input
                    type="number"
                    step="0.01"
                    min={wallet?.minPayoutAmount || 500}
                    max={available}
                    value={payoutAmount}
                    onChange={(e) => setPayoutAmount(e.target.value)}
                    placeholder="e.g. 1500"
                    required
                    className="w-full pl-8 pr-16 py-2 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-brand-navy font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setPayoutAmount(available.toString())}
                    className="absolute right-2 top-2 text-[11px] font-bold text-brand-navy hover:underline px-1.5 py-0.5 bg-slate-100 rounded"
                  >
                    MAX
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Payment Method *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['UPI', 'Bank Transfer', 'NEFT'] as const).map((method) => (
                    <button
                      key={method}
                      type="button"
                      onClick={() => setPaymentMethod(method)}
                      className={`py-2 px-3 text-xs font-medium rounded border text-center transition ${
                        paymentMethod === method
                          ? 'border-brand-navy bg-brand-navy/5 text-brand-navy font-bold'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {method}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Beneficiary Account Name *
                </label>
                <input
                  type="text"
                  value={beneficiaryName}
                  onChange={(e) => setBeneficiaryName(e.target.value)}
                  placeholder="Legal name on bank account"
                  required
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-brand-navy"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  {paymentMethod === 'UPI' ? 'UPI ID (VPA) *' : 'Account Number & IFSC Code *'}
                </label>
                <input
                  type="text"
                  value={beneficiaryDetails}
                  onChange={(e) => setBeneficiaryDetails(e.target.value)}
                  placeholder={paymentMethod === 'UPI' ? 'e.g. mobile@upi or name@okaxis' : 'A/C: 123456789, IFSC: HDFC0001234'}
                  required
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-brand-navy font-mono"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowPayoutModal(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={payoutSubmitting}
                  className="px-5 py-2 text-xs font-semibold text-white bg-brand-navy rounded hover:bg-brand-navy/90 transition shadow-sm disabled:opacity-60"
                >
                  {payoutSubmitting ? 'Earmarking Clearing...' : 'Confirm Withdrawal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
