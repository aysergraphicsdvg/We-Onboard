import React, { useState, useEffect } from 'react';
import {
  Network,
  Award,
  Users,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  Clock,
  AlertTriangle,
  RefreshCw,
  Search,
  Filter,
  Plus,
  ArrowRight,
  TrendingUp,
  MapPin,
  Building,
  UserCheck,
  UserPlus,
  UserMinus,
  Check,
  X,
  Sliders,
  ChevronRight,
  FileText,
  AlertCircle,
  HelpCircle,
  Eye,
  Crown
} from 'lucide-react';
import { store, exportToCsv } from '../../services/store';
import { api } from '../../services/api';
import {
  Team,
  TeamMemberItem,
  RankEligibilityCandidate,
  RankPromotionRecord,
  FreelancerRank,
  Freelancer
} from '../../types';

export const TeamRankManager: React.FC = () => {
  const currentAdmin = store.getState().currentAdmin;
  const isSuperOrAdmin = currentAdmin && ['Super Admin', 'Administrator'].includes(currentAdmin.role);

  const [activeTab, setActiveTab] = useState<'teams' | 'scores' | 'ranks' | 'config'>('teams');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Teams data
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [showCreateTeamModal, setShowCreateTeamModal] = useState(false);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [showAssignLeaderModal, setShowAssignLeaderModal] = useState(false);
  const [showAssignManagerModal, setShowAssignManagerModal] = useState(false);

  // Create Team form
  const [teamName, setTeamName] = useState('');
  const [teamCity, setTeamCity] = useState('Bengaluru');
  const [teamOperatingArea, setTeamOperatingArea] = useState('');
  const [teamCode, setTeamCode] = useState('');
  const [teamError, setTeamError] = useState<string | null>(null);

  // Add Member form
  const [memberFreelancerId, setMemberFreelancerId] = useState('');
  const [memberRole, setMemberRole] = useState<'Member' | 'Deputy Leader'>('Member');
  const [addMemberError, setAddMemberError] = useState<string | null>(null);

  // Leader / Manager Assignment
  const [assignedLeaderId, setAssignedLeaderId] = useState('');
  const [assignedManagerId, setAssignedManagerId] = useState('');
  const [assignError, setAssignError] = useState<string | null>(null);

  // Performance Scores
  const [scores, setScores] = useState<any[]>([]);
  const [scoreSearch, setScoreSearch] = useState('');
  const [scoreRankFilter, setScoreRankFilter] = useState('All');
  const [scoreStatusFilter, setScoreStatusFilter] = useState('All');
  const [scoreCityFilter, setScoreCityFilter] = useState('All');
  const [selectedFreelancerForFraud, setSelectedFreelancerForFraud] = useState<any | null>(null);
  const [fraudAction, setFraudAction] = useState<'set' | 'clear'>('set');
  const [fraudReason, setFraudReason] = useState('');
  const [fraudError, setFraudError] = useState<string | null>(null);

  // Rank Engine
  const [candidates, setCandidates] = useState<RankEligibilityCandidate[]>([]);
  const [rankPromotions, setRankPromotions] = useState<RankPromotionRecord[]>([]);
  const [selectedCandidateForPromo, setSelectedCandidateForPromo] = useState<RankEligibilityCandidate | null>(null);
  const [promoAction, setPromoAction] = useState<'nominate' | 'approve' | 'reject'>('approve');
  const [promoReason, setPromoReason] = useState('');
  const [promoError, setPromoError] = useState<string | null>(null);

  // Quality Score Config
  const [qsConfig, setQsConfig] = useState<Record<string, number>>(store.getState().qualityScoreConfig);

  const loadData = async () => {
    setLoading(true);
    try {
      const [teamsData, scoresData, candidatesData] = await Promise.all([
        api.getAdminTeams(),
        api.getAdminPerformanceScores(),
        api.getAdminRankEligibility()
      ]);

      setTeams(teamsData || store.getTeams());
      setScores(scoresData?.scores || []);
      setCandidates(candidatesData || store.getRankEligibility());
      setRankPromotions(store.getState().rankPromotions || []);
      if (scoresData?.config) setQsConfig(scoresData.config);
    } catch {
      setTeams(store.getTeams());
      const s = store.getState().freelancers.map(f => {
        const c = store.calculateFreelancerScore(f.id);
        return {
          id: f.id,
          registrationRef: f.registrationRef || f.id,
          fullName: f.fullName,
          email: f.email,
          phone: f.phone,
          city: f.city,
          currentRank: f.currentRank || 'Trainee',
          teamName: f.teamName,
          qualityScore: f.qualityScore !== undefined ? f.qualityScore : null,
          qsSampleSize: f.qsSampleSize || 0,
          qsStatus: f.qsStatus || 'Insufficient Data',
          qsLastCalculatedAt: f.qsLastCalculatedAt,
          fraudFlag: Boolean(f.fraudFlag),
          fraudReason: f.fraudReason,
          isActiveMember: (f.status === 'Active' || f.onboardingStatus === 'Approved') && (f.qualityScore || 0) >= 70 && !f.fraudFlag,
          metrics: c?.task_metrics,
          breakdown: c?.breakdown
        };
      });
      setScores(s);
      setCandidates(store.getRankEligibility());
      setRankPromotions(store.getState().rankPromotions || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const unsub = store.subscribe(() => {
      setTeams(store.getTeams());
      setRankPromotions(store.getState().rankPromotions || []);
    });
    return unsub;
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  // Create Team
  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    setTeamError(null);
    if (!teamName.trim()) {
      setTeamError('Team name is required.');
      return;
    }

    try {
      const res = await api.manageAdminTeam({
        action: 'create_team',
        name: teamName.trim(),
        city: teamCity,
        operating_area: teamOperatingArea.trim(),
        team_code: teamCode.trim() || undefined
      });

      if (res.success) {
        setShowCreateTeamModal(false);
        setTeamName('');
        setTeamOperatingArea('');
        setTeamCode('');
        await loadData();
      } else {
        setTeamError(res.error || res.message || 'Failed to create team.');
      }
    } catch (err: any) {
      setTeamError(err.message || 'Error creating team.');
    }
  };

  // Add Member
  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeam) return;
    setAddMemberError(null);

    if (!memberFreelancerId) {
      setAddMemberError('Please select a freelancer.');
      return;
    }

    try {
      const res = await api.manageAdminTeam({
        action: 'add_member',
        team_id: selectedTeam.id,
        freelancer_id: memberFreelancerId,
        role_in_team: memberRole
      });

      if (res.success) {
        setShowAddMemberModal(false);
        setMemberFreelancerId('');
        await loadData();
        // Update selected team modal view
        const updated = (await api.getAdminTeams()).find(t => String(t.id) === String(selectedTeam.id));
        if (updated) setSelectedTeam(updated);
      } else {
        setAddMemberError(res.error || res.message || 'Failed to add member.');
      }
    } catch (err: any) {
      setAddMemberError(err.message || 'Error adding member.');
    }
  };

  // Remove Member
  const handleRemoveMember = async (teamId: string | number, freelancerId: string | number) => {
    if (!confirm('Are you sure you want to remove this freelancer from the team?')) return;
    try {
      await api.manageAdminTeam({
        action: 'remove_member',
        team_id: teamId,
        freelancer_id: freelancerId
      });
      await loadData();
      if (selectedTeam && String(selectedTeam.id) === String(teamId)) {
        const updated = (await api.getAdminTeams()).find(t => String(t.id) === String(teamId));
        if (updated) setSelectedTeam(updated);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to remove member');
    }
  };

  // Assign Leader
  const handleAssignLeader = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeam) return;
    setAssignError(null);

    try {
      const res = await api.manageAdminTeam({
        action: 'set_leader',
        team_id: selectedTeam.id,
        leader_id: assignedLeaderId ? assignedLeaderId : null
      });

      if (res.success) {
        setShowAssignLeaderModal(false);
        setAssignedLeaderId('');
        await loadData();
        const updated = (await api.getAdminTeams()).find(t => String(t.id) === String(selectedTeam.id));
        if (updated) setSelectedTeam(updated);
      } else {
        setAssignError(res.error || res.message || 'Failed to assign team leader.');
      }
    } catch (err: any) {
      setAssignError(err.message || 'Error assigning leader.');
    }
  };

  // Assign Manager
  const handleAssignManager = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeam) return;
    setAssignError(null);

    try {
      const res = await api.manageAdminTeam({
        action: 'set_manager',
        team_id: selectedTeam.id,
        manager_id: assignedManagerId ? assignedManagerId : null
      });

      if (res.success) {
        setShowAssignManagerModal(false);
        setAssignedManagerId('');
        await loadData();
        const updated = (await api.getAdminTeams()).find(t => String(t.id) === String(selectedTeam.id));
        if (updated) setSelectedTeam(updated);
      } else {
        setAssignError(res.error || res.message || 'Failed to assign team manager.');
      }
    } catch (err: any) {
      setAssignError(err.message || 'Error assigning manager.');
    }
  };

  // Recalculate score (single)
  const handleRecalculateSingle = async (freelancerId: string | number) => {
    try {
      await api.recalculateQualityScore(freelancerId);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Recalculation error');
    }
  };

  // Recalculate all scores
  const handleRecalculateAll = async () => {
    if (!confirm('Recalculate Quality Scores for all freelancers in the database?')) return;
    setRefreshing(true);
    try {
      await api.recalculateQualityScore();
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Bulk recalculation error');
    } finally {
      setRefreshing(false);
    }
  };

  // Manage Fraud Flag
  const handleSaveFraudFlag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFreelancerForFraud) return;
    setFraudError(null);

    if (!fraudReason.trim()) {
      setFraudError('A specific documented reason is mandatory.');
      return;
    }

    try {
      if (fraudAction === 'set') {
        const res = await api.setFreelancerFraudFlag(selectedFreelancerForFraud.id, fraudReason.trim());
        if (!res.success) {
          setFraudError(res.error || res.message || 'Failed to set flag.');
          return;
        }
      } else {
        const res = await api.clearFreelancerFraudFlag(selectedFreelancerForFraud.id, fraudReason.trim());
        if (!res.success) {
          setFraudError(res.error || res.message || 'Failed to clear flag.');
          return;
        }
      }

      setSelectedFreelancerForFraud(null);
      setFraudReason('');
      await loadData();
    } catch (err: any) {
      setFraudError(err.message || 'Error saving policy flag.');
    }
  };

  // Promote Rank Decision
  const handleSavePromotion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCandidateForPromo || !selectedCandidateForPromo.targetRank) return;
    setPromoError(null);

    if (!promoReason.trim()) {
      setPromoError('A documented administrative review reason is required.');
      return;
    }

    try {
      const res = await api.promoteFreelancerRank({
        freelancer_id: selectedCandidateForPromo.freelancerId,
        target_rank: selectedCandidateForPromo.targetRank,
        action: promoAction,
        reason: promoReason.trim()
      });

      if (res.success) {
        setSelectedCandidateForPromo(null);
        setPromoReason('');
        await loadData();
      } else {
        setPromoError(res.error || res.message || 'Failed to record promotion decision.');
      }
    } catch (err: any) {
      setPromoError(err.message || 'Error recording promotion.');
    }
  };

  // Filtered scores
  const filteredScores = scores.filter((s) => {
    if (scoreRankFilter !== 'All' && s.currentRank !== scoreRankFilter) return false;
    if (scoreStatusFilter !== 'All' && s.qsStatus !== scoreStatusFilter) return false;
    if (scoreCityFilter !== 'All' && s.city !== scoreCityFilter) return false;
    if (scoreSearch.trim()) {
      const q = scoreSearch.toLowerCase();
      const match =
        s.fullName.toLowerCase().includes(q) ||
        (s.registrationRef && s.registrationRef.toLowerCase().includes(q)) ||
        s.phone.includes(q) ||
        s.email.toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });

  const availableFreelancersForTeam = store.getState().freelancers.filter((f) => {
    return (f.status === 'Active' || f.onboardingStatus === 'Approved') && !f.teamId;
  });

  return (
    <div className="space-y-6">
      {/* HEADER WITH VIEW TOGGLES */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#02167F]/10 text-[#02167F] rounded-lg text-xs font-bold uppercase tracking-wider mb-2">
            <Network className="w-3.5 h-3.5" />
            Phase 6 Field Governance
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
            Teams, Performance & Rank Engine
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage field team corridors, audit Quality Scores, evaluate active-member qualification metrics, and govern promotion workflows.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-lg border border-slate-200 shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Sync Live Data</span>
          </button>

          {activeTab === 'teams' && (
            <button
              onClick={() => setShowCreateTeamModal(true)}
              className="px-3.5 py-2 bg-[#02167F] hover:bg-[#031d99] text-white text-xs font-bold rounded-lg shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Field Team</span>
            </button>
          )}

          {activeTab === 'scores' && (
            <button
              onClick={handleRecalculateAll}
              disabled={refreshing}
              className="px-3.5 py-2 bg-[#FFD014] hover:bg-[#e6bb12] text-[#02167F] text-xs font-extrabold rounded-lg shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Recalculate All Scores</span>
            </button>
          )}
        </div>
      </div>

      {/* TOP STATS CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 mb-1">
            <span>Active Field Teams</span>
            <Users className="w-4 h-4 text-[#02167F]" />
          </div>
          <div className="text-2xl font-black text-slate-900">{teams.filter(t => t.status === 'Active').length}</div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
            <span className="font-bold text-emerald-600">{teams.filter(t => t.isQualifyingTeam).length} qualifying</span> (&gt;=10 active members)
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 mb-1">
            <span>Verified Quality Scores</span>
            <Award className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">
            {scores.filter(s => s.qualityScore !== null).length}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            <span className="font-bold text-amber-600">{scores.filter(s => s.qsStatus === 'Insufficient Data').length}</span> insufficient data (&lt;3 tasks)
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 mb-1">
            <span>Eligible for Promotion</span>
            <Crown className="w-4 h-4 text-[#FFD014]" />
          </div>
          <div className="text-2xl font-black text-slate-900">
            {candidates.filter(c => c.isEligible).length}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Evaluated by verified rules engine
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 mb-1">
            <span>Policy Flags Active</span>
            <ShieldAlert className="w-4 h-4 text-red-600" />
          </div>
          <div className="text-2xl font-black text-red-600">
            {scores.filter(s => s.fraudFlag).length}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Disciplinary score deduction (-50 pts)
          </div>
        </div>
      </div>

      {/* SUB-TABS NAVIGATION */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('teams')}
          className={`px-4 py-3 text-xs font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
            activeTab === 'teams'
              ? 'border-[#02167F] text-[#02167F]'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Network className="w-4 h-4" />
          <span>Field Teams & Corridors ({teams.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('scores')}
          className={`px-4 py-3 text-xs font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
            activeTab === 'scores'
              ? 'border-[#02167F] text-[#02167F]'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Award className="w-4 h-4" />
          <span>Freelancer Quality Scores ({scores.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('ranks')}
          className={`px-4 py-3 text-xs font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
            activeTab === 'ranks'
              ? 'border-[#02167F] text-[#02167F]'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Crown className="w-4 h-4" />
          <span>Rank Engine & Promotion Board</span>
        </button>

        <button
          onClick={() => setActiveTab('config')}
          className={`px-4 py-3 text-xs font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
            activeTab === 'config'
              ? 'border-[#02167F] text-[#02167F]'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>Configurable Scoring Rules</span>
        </button>
      </div>

      {/* TAB 1: FIELD TEAMS & HIERARCHY */}
      {activeTab === 'teams' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {teams.map((t) => {
              const isQualifying = t.isQualifyingTeam || t.activeMembersCount >= 10;
              return (
                <div
                  key={t.id}
                  className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 hover:border-slate-300 transition-colors flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-[#02167F] bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded">
                            {t.teamCode}
                          </span>
                          {isQualifying ? (
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              Qualifying Team (&gt;=10 Active)
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              Building ({t.activeMembersCount}/10 Active)
                            </span>
                          )}
                        </div>
                        <h3 className="text-base font-extrabold text-slate-900 mt-1">
                          {t.name}
                        </h3>
                        <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3 text-slate-400" />
                          <span>{t.city} • {t.operatingArea || 'Citywide'}</span>
                        </p>
                      </div>

                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        t.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {t.status}
                      </span>
                    </div>

                    {/* Hierarchy Positions */}
                    <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100 text-xs">
                      <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                        <div className="text-[10px] uppercase font-bold text-slate-400">Team Leader</div>
                        {t.leader ? (
                          <div className="mt-0.5">
                            <strong className="block text-slate-900 text-xs font-bold">{t.leader.name}</strong>
                            <div className="text-[10px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                              <span>QS: {t.leader.qualityScore ?? 'N/A'}</span>
                              {t.leader.fraudFlag && (
                                <span className="text-red-600 font-bold">Flagged</span>
                              )}
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">Unassigned</span>
                        )}
                      </div>

                      <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                        <div className="text-[10px] uppercase font-bold text-slate-400">Area Manager</div>
                        {t.manager ? (
                          <div className="mt-0.5">
                            <strong className="block text-slate-900 text-xs font-bold">{t.manager.name}</strong>
                            <div className="text-[10px] text-slate-500 mt-0.5">
                              <span>QS: {t.manager.qualityScore ?? 'N/A'}</span>
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">Unassigned</span>
                        )}
                      </div>
                    </div>

                    {/* Member Stats */}
                    <div className="flex items-center justify-between text-xs pt-2 text-slate-600">
                      <div>
                        Total Members: <strong className="text-slate-900 font-bold">{t.totalMembers}</strong>
                      </div>
                      <div>
                        Active Verified: <strong className="text-emerald-700 font-bold">{t.activeMembersCount}</strong>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-4 mt-3 border-t border-slate-100">
                    <button
                      onClick={() => setSelectedTeam(t)}
                      className="text-xs font-bold text-[#02167F] hover:text-[#031d99] flex items-center gap-1 cursor-pointer"
                    >
                      <span>Manage Roster & Leadership</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => {
                          setSelectedTeam(t);
                          setShowAddMemberModal(true);
                        }}
                        className="px-2.5 py-1 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
                        title="Add freelancer to team"
                      >
                        + Member
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: FREELANCER QUALITY SCORES DIRECTORY */}
      {activeTab === 'scores' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3 flex-1">
              <div className="relative min-w-[240px]">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search freelancer by name, ref, phone..."
                  value={scoreSearch}
                  onChange={(e) => setScoreSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-[#02167F]"
                />
              </div>

              <div className="flex items-center gap-1.5 text-xs">
                <span className="text-slate-400 font-bold">Rank:</span>
                <select
                  value={scoreRankFilter}
                  onChange={(e) => setScoreRankFilter(e.target.value)}
                  className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                >
                  <option value="All">All Ranks</option>
                  <option value="Trainee">Trainee</option>
                  <option value="Team Member">Team Member</option>
                  <option value="Team Leader">Team Leader</option>
                  <option value="Manager">Manager</option>
                  <option value="City/Regional Head">City/Regional Head</option>
                </select>
              </div>

              <div className="flex items-center gap-1.5 text-xs">
                <span className="text-slate-400 font-bold">Score Status:</span>
                <select
                  value={scoreStatusFilter}
                  onChange={(e) => setScoreStatusFilter(e.target.value)}
                  className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                >
                  <option value="All">All Statuses</option>
                  <option value="Active">Active (Verified)</option>
                  <option value="Insufficient Data">Insufficient Data (&lt;3 Tasks)</option>
                  <option value="Under Observation">Under Observation (&lt;50 pts)</option>
                  <option value="Suspended">Suspended (Policy Flag)</option>
                </select>
              </div>
            </div>

            <button
              onClick={() => {
                exportToCsv(
                  'freelancer_quality_scores',
                  filteredScores.map(s => ({
                    ID: s.id,
                    RegistrationRef: s.registrationRef,
                    Name: s.fullName,
                    Phone: s.phone,
                    Rank: s.currentRank,
                    Team: s.teamName || 'Unassigned',
                    QualityScore: s.qualityScore ?? 'Insufficient Data',
                    SampleSize: s.qsSampleSize,
                    Status: s.qsStatus,
                    ActiveMember: s.isActiveMember ? 'Yes' : 'No',
                    FraudFlag: s.fraudFlag ? 'YES' : 'No'
                  }))
                );
              }}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg border border-slate-200 flex items-center gap-1 cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
          </div>

          {/* Directory Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                    <th className="p-3">Freelancer</th>
                    <th className="p-3">Hierarchy Rank</th>
                    <th className="p-3">Team Corridor</th>
                    <th className="p-3 text-center">Quality Score</th>
                    <th className="p-3">Score Breakdown</th>
                    <th className="p-3 text-center">Active Status</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredScores.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-400">
                        No freelancers match the selected filters.
                      </td>
                    </tr>
                  ) : (
                    filteredScores.map((s) => {
                      const hasQs = s.qualityScore !== null;
                      return (
                        <tr key={s.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="p-3">
                            <strong className="block text-slate-900 font-bold">{s.fullName}</strong>
                            <span className="font-mono text-[10px] text-slate-500">{s.registrationRef || s.id} • {s.city}</span>
                          </td>

                          <td className="p-3">
                            <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                              s.currentRank === 'Manager' || s.currentRank === 'City/Regional Head'
                                ? 'bg-purple-50 text-purple-700 border border-purple-200'
                                : s.currentRank === 'Team Leader'
                                ? 'bg-amber-50 text-amber-800 border border-amber-200'
                                : 'bg-slate-100 text-slate-700'
                            }`}>
                              {s.currentRank}
                            </span>
                          </td>

                          <td className="p-3 text-slate-600">
                            {s.teamName || <span className="text-slate-400 italic">Unassigned</span>}
                          </td>

                          <td className="p-3 text-center">
                            {hasQs ? (
                              <div>
                                <span className={`inline-block font-mono text-sm font-black px-2 py-0.5 rounded ${
                                  s.qualityScore >= 85
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : s.qualityScore >= 70
                                    ? 'bg-blue-100 text-blue-800'
                                    : 'bg-amber-100 text-amber-800'
                                }`}>
                                  {Number(s.qualityScore).toFixed(1)}
                                </span>
                                <div className="text-[10px] text-slate-400 mt-0.5">
                                  {s.qsSampleSize} reviews
                                </div>
                              </div>
                            ) : (
                              <div className="inline-block bg-slate-100 text-slate-500 text-[10px] font-bold px-2 py-1 rounded border border-slate-200">
                                Insufficient Data ({s.qsSampleSize}/3)
                              </div>
                            )}
                          </td>

                          <td className="p-3 text-[11px]">
                            {s.breakdown ? (
                              <div className="space-y-0.5">
                                <div className="flex items-center gap-2">
                                  <span className="text-slate-400">Approval:</span>
                                  <strong className="text-slate-700">{s.breakdown.approval_rate}%</strong>
                                  <span className="text-slate-400">({s.breakdown.approval_points} pts)</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-slate-400">First-time:</span>
                                  <strong className="text-slate-700">{s.breakdown.first_time_right_rate}%</strong>
                                  <span className="text-slate-400">Timely:</span>
                                  <strong className="text-slate-700">{s.breakdown.timeliness_rate}%</strong>
                                </div>
                              </div>
                            ) : (
                              <span className="text-slate-400 italic">Pending tasks</span>
                            )}
                          </td>

                          <td className="p-3 text-center">
                            {s.fraudFlag ? (
                              <span className="inline-block text-[10px] font-bold text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded" title={s.fraudReason}>
                                Policy Flagged (-50)
                              </span>
                            ) : s.isActiveMember ? (
                              <span className="inline-block text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                                Active Qualified
                              </span>
                            ) : (
                              <span className="inline-block text-[10px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                                Inactive / Ineligible
                              </span>
                            )}
                          </td>

                          <td className="p-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleRecalculateSingle(s.id)}
                                className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded cursor-pointer"
                                title="Recalculate Quality Score"
                              >
                                <RefreshCw className="w-3.5 h-3.5" />
                              </button>

                              {s.fraudFlag ? (
                                <button
                                  onClick={() => {
                                    setSelectedFreelancerForFraud(s);
                                    setFraudAction('clear');
                                    setFraudReason('');
                                  }}
                                  className="px-2 py-0.5 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 rounded cursor-pointer"
                                  title="Clear Disciplinary Flag"
                                >
                                  Clear Flag
                                </button>
                              ) : (
                                <button
                                  onClick={() => {
                                    setSelectedFreelancerForFraud(s);
                                    setFraudAction('set');
                                    setFraudReason('');
                                  }}
                                  className="px-2 py-0.5 text-[10px] font-bold text-red-700 bg-red-50 border border-red-200 hover:bg-red-100 rounded cursor-pointer"
                                  title="Flag Policy Violation"
                                >
                                  Flag Disciplinary
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: RANK ENGINE & PROMOTION BOARD */}
      {activeTab === 'ranks' && (
        <div className="space-y-6">
          {/* Hierarchy Specification Banner */}
          <div className="bg-slate-900 text-white rounded-xl p-5 border border-slate-800">
            <h3 className="text-sm font-extrabold uppercase tracking-wider text-[#FFD014] mb-2 flex items-center gap-1.5">
              <Crown className="w-4 h-4" />
              <span>We Onboard 5-Tier Business Promotion Hierarchy</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3 mt-3 text-xs">
              <div className="bg-white/5 p-3 rounded-lg border border-white/10">
                <span className="text-[10px] text-slate-400 font-bold block uppercase">Tier 1</span>
                <strong className="block text-white text-sm font-bold mt-0.5">Trainee</strong>
                <p className="text-[11px] text-slate-300 mt-1">Starting level on registration. KYC document verification pending.</p>
              </div>

              <div className="bg-white/5 p-3 rounded-lg border border-white/10">
                <span className="text-[10px] text-slate-400 font-bold block uppercase">Tier 2</span>
                <strong className="block text-white text-sm font-bold mt-0.5">Team Member</strong>
                <p className="text-[11px] text-slate-300 mt-1">KYC approved + at least 1 QC-approved field task.</p>
              </div>

              <div className="bg-white/5 p-3 rounded-lg border border-white/10">
                <span className="text-[10px] text-[#FFD014] font-bold block uppercase">Tier 3</span>
                <strong className="block text-white text-sm font-bold mt-0.5">Team Leader</strong>
                <p className="text-[11px] text-slate-300 mt-1">Leads team with &gt;=10 active members AND QS &gt;= 85.0 AND no fraud flag.</p>
              </div>

              <div className="bg-white/5 p-3 rounded-lg border border-white/10">
                <span className="text-[10px] text-[#FFD014] font-bold block uppercase">Tier 4</span>
                <strong className="block text-white text-sm font-bold mt-0.5">Manager</strong>
                <p className="text-[11px] text-slate-300 mt-1">&gt;=3 qualifying teams (each &gt;=10 active members) AND QS &gt;= 85.0.</p>
              </div>

              <div className="bg-white/5 p-3 rounded-lg border border-white/10">
                <span className="text-[10px] text-slate-400 font-bold block uppercase">Tier 5</span>
                <strong className="block text-white text-sm font-bold mt-0.5">City/Regional Head</strong>
                <p className="text-[11px] text-slate-300 mt-1">Oversees metropolitan operations, cluster leadership, &gt;=5 qualifying teams.</p>
              </div>
            </div>
          </div>

          {/* Promotion Candidate Eligibility Board */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div>
                <strong className="text-xs font-bold text-slate-900 uppercase tracking-wider block">
                  Automated Eligibility Evaluation (Verified Data)
                </strong>
                <span className="text-[11px] text-slate-500">
                  Eligibility does not automatically promote candidates. Administrative nomination & approval is required.
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                    <th className="p-3">Candidate</th>
                    <th className="p-3">Current Rank</th>
                    <th className="p-3">Target Rank</th>
                    <th className="p-3 text-center">Quality Score</th>
                    <th className="p-3">Team Metrics</th>
                    <th className="p-3 text-center">Eligibility Decision</th>
                    <th className="p-3 text-right">Review Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {candidates.map((cand) => (
                    <tr key={cand.freelancerId} className="hover:bg-slate-50/70 transition-colors">
                      <td className="p-3">
                        <strong className="block text-slate-900 font-bold">{cand.fullName}</strong>
                        <span className="font-mono text-[10px] text-slate-500">{cand.registrationRef} • {cand.city}</span>
                      </td>

                      <td className="p-3">
                        <span className="inline-block px-2 py-0.5 bg-slate-100 text-slate-700 text-[10px] font-bold rounded">
                          {cand.currentRank}
                        </span>
                      </td>

                      <td className="p-3">
                        {cand.targetRank ? (
                          <span className="inline-block px-2 py-0.5 bg-indigo-50 border border-indigo-200 text-indigo-700 text-[10px] font-extrabold rounded">
                            {cand.targetRank}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">Highest Rank Reached</span>
                        )}
                      </td>

                      <td className="p-3 text-center">
                        {cand.qualityScore !== null ? (
                          <span className="font-mono text-sm font-extrabold text-slate-900">
                            {Number(cand.qualityScore).toFixed(1)}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic text-[10px]">No Data</span>
                        )}
                      </td>

                      <td className="p-3 text-[11px]">
                        {cand.currentRank === 'Team Member' ? (
                          <div>
                            Active Members in Led Team: <strong>{cand.activeMembersInLedTeam}</strong> / 10
                          </div>
                        ) : cand.currentRank === 'Team Leader' ? (
                          <div>
                            Qualifying Teams: <strong>{cand.qualifyingTeamsCount}</strong> / 3
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      <td className="p-3 text-center">
                        {cand.isEligible ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                            <CheckCircle2 className="w-3 h-3" />
                            Eligible for Review
                          </span>
                        ) : (
                          <span className="inline-block text-[10px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded" title={cand.ineligibilityReasons.join(', ')}>
                            Requirements Pending
                          </span>
                        )}
                      </td>

                      <td className="p-3 text-right">
                        {cand.targetRank && isSuperOrAdmin ? (
                          <button
                            onClick={() => {
                              setSelectedCandidateForPromo(cand);
                              setPromoAction(cand.isEligible ? 'approve' : 'nominate');
                              setPromoReason('');
                              setPromoError(null);
                            }}
                            className={`px-3 py-1 text-xs font-bold rounded-lg cursor-pointer transition-colors ${
                              cand.isEligible
                                ? 'bg-[#02167F] hover:bg-[#031d99] text-white'
                                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                            }`}
                          >
                            Review Promotion
                          </button>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">No Action</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Promotion Audit Log History */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200">
              <strong className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                Rank Promotion History & Audit Trail
              </strong>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                    <th className="p-3">Freelancer</th>
                    <th className="p-3">Rank Transition</th>
                    <th className="p-3">Decision Status</th>
                    <th className="p-3">Reviewer Justification</th>
                    <th className="p-3">Reviewed By</th>
                    <th className="p-3">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rankPromotions.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-6 text-center text-slate-400">
                        No rank promotion records found.
                      </td>
                    </tr>
                  ) : (
                    rankPromotions.map((rp) => (
                      <tr key={rp.id}>
                        <td className="p-3 font-bold text-slate-900">{rp.full_name || `Freelancer #${rp.freelancer_id}`}</td>
                        <td className="p-3">
                          <span className="text-slate-600">{rp.from_rank}</span>
                          <span className="mx-1 text-slate-400">&rarr;</span>
                          <strong className="text-[#02167F] font-bold">{rp.to_rank}</strong>
                        </td>
                        <td className="p-3">
                          <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                            rp.status === 'Approved'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : rp.status === 'Rejected'
                              ? 'bg-red-50 text-red-700 border border-red-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}>
                            {rp.status}
                          </span>
                        </td>
                        <td className="p-3 text-slate-600 max-w-xs truncate" title={rp.decision_reason}>
                          {rp.decision_reason || '—'}
                        </td>
                        <td className="p-3 text-slate-700">{rp.reviewed_by_name || 'Admin'}</td>
                        <td className="p-3 font-mono text-[10px] text-slate-400">{rp.reviewed_at || rp.created_at}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: CONFIGURABLE SCORING RULES */}
      {activeTab === 'config' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-6">
          <div>
            <h3 className="text-base font-extrabold text-slate-900">
              Quality Score (QS) Formula Configuration
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Live weights and promotion thresholds loaded directly from the database table <code className="font-mono text-indigo-700 bg-indigo-50 px-1 py-0.5 rounded">quality_score_config</code>.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <strong className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
                Component Weights (Total: 100 Points)
              </strong>

              <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between">
                <div>
                  <strong className="block text-xs font-bold text-slate-800">1. QC Approval Rate</strong>
                  <span className="text-[11px] text-slate-500">Ratio of approved tasks over total reviewed tasks</span>
                </div>
                <span className="font-mono font-black text-sm text-[#02167F]">{qsConfig.weight_approval || 40}% (40 pts)</span>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between">
                <div>
                  <strong className="block text-xs font-bold text-slate-800">2. First-Time-Right (Low Rework)</strong>
                  <span className="text-[11px] text-slate-500">Approved without rework cycle requests</span>
                </div>
                <span className="font-mono font-black text-sm text-[#02167F]">{qsConfig.weight_rework || 25}% (25 pts)</span>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between">
                <div>
                  <strong className="block text-xs font-bold text-slate-800">3. Timely Task Completion</strong>
                  <span className="text-[11px] text-slate-500">Submitted on or before the assigned deadline</span>
                </div>
                <span className="font-mono font-black text-sm text-[#02167F]">{qsConfig.weight_timeliness || 20}% (20 pts)</span>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between">
                <div>
                  <strong className="block text-xs font-bold text-slate-800">4. Evidence & Location Completeness</strong>
                  <span className="text-[11px] text-slate-500">All required files and valid geo-coordinates supplied</span>
                </div>
                <span className="font-mono font-black text-sm text-[#02167F]">{qsConfig.weight_evidence || 15}% (15 pts)</span>
              </div>
            </div>

            <div className="space-y-4">
              <strong className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
                Disciplinary Penalties & Thresholds
              </strong>

              <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between">
                <div>
                  <strong className="block text-xs font-bold text-slate-800">Minimum Sample Size</strong>
                  <span className="text-[11px] text-slate-500">Reviewed tasks required before assigning verified score</span>
                </div>
                <span className="font-mono font-black text-sm text-slate-900">{qsConfig.min_sample_size || 3} tasks</span>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between">
                <div>
                  <strong className="block text-xs font-bold text-slate-800">Policy Violation Deduction</strong>
                  <span className="text-[11px] text-slate-500">Penalty applied when substantiated fraud flag is confirmed</span>
                </div>
                <span className="font-mono font-black text-sm text-red-600">-{qsConfig.penalty_fraud || 50} pts</span>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between">
                <div>
                  <strong className="block text-xs font-bold text-slate-800">Active Member Min QS</strong>
                  <span className="text-[11px] text-slate-500">Minimum score to qualify toward Team Leader / Manager quota</span>
                </div>
                <span className="font-mono font-black text-sm text-emerald-700">&gt;= {qsConfig.active_member_min_qs || 70.0} pts</span>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between">
                <div>
                  <strong className="block text-xs font-bold text-slate-800">Leadership Promotion Threshold</strong>
                  <span className="text-[11px] text-slate-500">Team Leader and Manager QS eligibility requirement</span>
                </div>
                <span className="font-mono font-black text-sm text-[#02167F]">&gt;= {qsConfig.leader_min_qs || 85.0} pts</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: CREATE TEAM */}
      {showCreateTeamModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <strong className="text-base font-extrabold text-[#02167F]">Create New Field Team</strong>
              <button onClick={() => setShowCreateTeamModal(false)} className="p-1 rounded text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {teamError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{teamError}</span>
              </div>
            )}

            <form onSubmit={handleCreateTeam} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Team Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Indiranagar Commercial Activation Team"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-[#02167F]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">City *</label>
                  <input
                    type="text"
                    required
                    value={teamCity}
                    onChange={(e) => setTeamCity(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Team Code (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. TM-BLR-05"
                    value={teamCode}
                    onChange={(e) => setTeamCode(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Operating Corridors / Areas</label>
                <input
                  type="text"
                  placeholder="e.g. 100ft Road, CMH Road, Defence Colony"
                  value={teamOperatingArea}
                  onChange={(e) => setTeamOperatingArea(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateTeamModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg font-bold hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#02167F] text-white rounded-lg font-bold hover:bg-[#031d99] cursor-pointer"
                >
                  Create Team
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: MANAGE TEAM ROSTER & MEMBERS */}
      {selectedTeam && !showAddMemberModal && !showAssignLeaderModal && !showAssignManagerModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="font-mono text-xs font-bold text-[#02167F]">{selectedTeam.teamCode}</span>
                <h3 className="text-lg font-extrabold text-slate-900">{selectedTeam.name}</h3>
                <p className="text-xs text-slate-500">{selectedTeam.city} • {selectedTeam.operatingArea}</p>
              </div>
              <button onClick={() => setSelectedTeam(null)} className="p-1 rounded text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Leadership Controls */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-500 uppercase text-[10px]">Team Leader</span>
                  <button
                    onClick={() => {
                      setAssignedLeaderId(selectedTeam.leader ? String(selectedTeam.leader.id) : '');
                      setShowAssignLeaderModal(true);
                    }}
                    className="text-[11px] font-bold text-[#02167F] hover:underline cursor-pointer"
                  >
                    Change
                  </button>
                </div>
                {selectedTeam.leader ? (
                  <div>
                    <strong className="block text-slate-900">{selectedTeam.leader.name}</strong>
                    <span className="text-[10px] text-slate-500 font-mono">{selectedTeam.leader.phone}</span>
                  </div>
                ) : (
                  <span className="text-slate-400 italic">No leader assigned</span>
                )}
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-500 uppercase text-[10px]">Area Manager</span>
                  <button
                    onClick={() => {
                      setAssignedManagerId(selectedTeam.manager ? String(selectedTeam.manager.id) : '');
                      setShowAssignManagerModal(true);
                    }}
                    className="text-[11px] font-bold text-[#02167F] hover:underline cursor-pointer"
                  >
                    Change
                  </button>
                </div>
                {selectedTeam.manager ? (
                  <div>
                    <strong className="block text-slate-900">{selectedTeam.manager.name}</strong>
                    <span className="text-[10px] text-slate-500 font-mono">{selectedTeam.manager.phone}</span>
                  </div>
                ) : (
                  <span className="text-slate-400 italic">No manager assigned</span>
                )}
              </div>
            </div>

            {/* Member Roster List */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <strong className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Assigned Field Members ({selectedTeam.members?.length || 0})
                </strong>
                <button
                  onClick={() => setShowAddMemberModal(true)}
                  className="px-3 py-1 bg-[#02167F] text-white text-xs font-bold rounded-lg hover:bg-[#031d99] cursor-pointer"
                >
                  + Add Member
                </button>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 text-xs">
                {(!selectedTeam.members || selectedTeam.members.length === 0) ? (
                  <div className="p-6 text-center text-slate-400">
                    No members assigned to this team yet.
                  </div>
                ) : (
                  selectedTeam.members.map((m) => (
                    <div key={m.membershipId} className="p-3 flex items-center justify-between gap-3 hover:bg-slate-50">
                      <div>
                        <div className="flex items-center gap-2">
                          <strong className="text-slate-900 font-bold">{m.fullName}</strong>
                          <span className="text-[10px] font-bold px-1.5 py-0.2 bg-slate-100 text-slate-600 rounded">
                            {m.roleInTeam}
                          </span>
                          {m.isActiveMember ? (
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded">
                              Active Qualified
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.2 rounded">
                              Inactive
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-500 mt-0.5">
                          Rank: {m.currentRank} • QS: {m.qualityScore ?? 'N/A'} • Joined: {m.joinedAt}
                        </div>
                      </div>

                      <button
                        onClick={() => handleRemoveMember(selectedTeam.id, m.freelancerId)}
                        className="text-red-600 hover:text-red-800 text-xs font-bold cursor-pointer"
                      >
                        Remove
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <button
                onClick={() => setSelectedTeam(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: ADD MEMBER MODAL */}
      {showAddMemberModal && selectedTeam && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <strong className="text-base font-extrabold text-[#02167F]">
                Add Associate to {selectedTeam.name}
              </strong>
              <button onClick={() => setShowAddMemberModal(false)} className="p-1 rounded text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {addMemberError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{addMemberError}</span>
              </div>
            )}

            <form onSubmit={handleAddMember} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Select Freelancer *</label>
                <select
                  required
                  value={memberFreelancerId}
                  onChange={(e) => setMemberFreelancerId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                >
                  <option value="">-- Choose unassigned KYC-approved freelancer --</option>
                  {availableFreelancersForTeam.map((fl) => (
                    <option key={fl.id} value={fl.id}>
                      {fl.fullName} ({fl.registrationRef || fl.id}) • {fl.city} • QS: {fl.qualityScore ?? 'N/A'}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-400 mt-1">
                  Enforces single-team membership: freelancers already assigned to another field team cannot be added.
                </p>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Role in Team</label>
                <select
                  value={memberRole}
                  onChange={(e) => setMemberRole(e.target.value as any)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                >
                  <option value="Member">Member (Field Associate)</option>
                  <option value="Deputy Leader">Deputy Leader</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddMemberModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg font-bold hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#02167F] text-white rounded-lg font-bold hover:bg-[#031d99] cursor-pointer"
                >
                  Add to Team
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: ASSIGN LEADER */}
      {showAssignLeaderModal && selectedTeam && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <strong className="text-base font-extrabold text-[#02167F]">
                Assign Team Leader ({selectedTeam.teamCode})
              </strong>
              <button onClick={() => setShowAssignLeaderModal(false)} className="p-1 rounded text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {assignError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{assignError}</span>
              </div>
            )}

            <form onSubmit={handleAssignLeader} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Team Leader</label>
                <select
                  value={assignedLeaderId}
                  onChange={(e) => setAssignedLeaderId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                >
                  <option value="">-- Remove current leader / unassigned --</option>
                  {store.getState().freelancers.filter(f => f.status === 'Active' || f.onboardingStatus === 'Approved').map((fl) => (
                    <option key={fl.id} value={fl.id}>
                      {fl.fullName} ({fl.currentRank || 'Trainee'}) • QS: {fl.qualityScore ?? 'N/A'}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-400 mt-1">
                  Circular reporting rule: The leader of this team cannot also be assigned as its oversight manager.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAssignLeaderModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg font-bold hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#02167F] text-white rounded-lg font-bold hover:bg-[#031d99] cursor-pointer"
                >
                  Save Leader
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 5: ASSIGN MANAGER */}
      {showAssignManagerModal && selectedTeam && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <strong className="text-base font-extrabold text-[#02167F]">
                Assign Area Manager ({selectedTeam.teamCode})
              </strong>
              <button onClick={() => setShowAssignManagerModal(false)} className="p-1 rounded text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {assignError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{assignError}</span>
              </div>
            )}

            <form onSubmit={handleAssignManager} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Area Manager</label>
                <select
                  value={assignedManagerId}
                  onChange={(e) => setAssignedManagerId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                >
                  <option value="">-- Remove current manager / unassigned --</option>
                  {store.getState().freelancers.filter(f => f.status === 'Active' || f.onboardingStatus === 'Approved').map((fl) => (
                    <option key={fl.id} value={fl.id}>
                      {fl.fullName} ({fl.currentRank || 'Trainee'}) • QS: {fl.qualityScore ?? 'N/A'}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-400 mt-1">
                  Circular reporting rule: A manager cannot oversee a team where they are already designated as leader or member.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAssignManagerModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg font-bold hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#02167F] text-white rounded-lg font-bold hover:bg-[#031d99] cursor-pointer"
                >
                  Save Manager
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 6: FRAUD / DISCIPLINARY POLICY MODAL */}
      {selectedFreelancerForFraud && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <strong className={`text-base font-extrabold ${fraudAction === 'set' ? 'text-red-700' : 'text-emerald-700'}`}>
                {fraudAction === 'set' ? 'Flag Disciplinary / Policy Violation' : 'Clear Policy Violation Flag'}
              </strong>
              <button onClick={() => setSelectedFreelancerForFraud(null)} className="p-1 rounded text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs">
              <span className="text-slate-500">Associate:</span> <strong className="text-slate-900">{selectedFreelancerForFraud.fullName}</strong>
              <div className="text-[11px] text-slate-400 font-mono mt-0.5">{selectedFreelancerForFraud.registrationRef}</div>
            </div>

            {fraudError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{fraudError}</span>
              </div>
            )}

            <form onSubmit={handleSaveFraudFlag} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {fraudAction === 'set' ? 'Substantiated Violation Reason *' : 'Disciplinary Resolution Justification *'}
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder={fraudAction === 'set' ? 'Document specific verified policy infraction (e.g. fraudulent GPS spoofing, forged merchant slips)...' : 'Document administrative review and resolution justification...'}
                  value={fraudReason}
                  onChange={(e) => setFraudReason(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  {fraudAction === 'set'
                    ? 'Applies immediate 50-point deduction to Quality Score and restricts task claiming and promotion.'
                    : 'Removes the 50-point penalty and restores normal Quality Score calculation.'}
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedFreelancerForFraud(null)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg font-bold hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`px-4 py-2 text-white rounded-lg font-bold cursor-pointer ${
                    fraudAction === 'set' ? 'bg-red-600 hover:bg-red-700' : 'bg-emerald-600 hover:bg-emerald-700'
                  }`}
                >
                  {fraudAction === 'set' ? 'Confirm Policy Flag' : 'Clear Policy Flag'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 7: PROMOTION DECISION MODAL */}
      {selectedCandidateForPromo && selectedCandidateForPromo.targetRank && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <strong className="text-base font-extrabold text-[#02167F]">
                Rank Promotion Review
              </strong>
              <button onClick={() => setSelectedCandidateForPromo(null)} className="p-1 rounded text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Candidate Summary */}
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <div>
                  <strong className="block text-slate-900 font-bold">{selectedCandidateForPromo.fullName}</strong>
                  <span className="text-[10px] text-slate-500 font-mono">{selectedCandidateForPromo.registrationRef}</span>
                </div>
                <div className="text-right">
                  <span className="text-slate-500">{selectedCandidateForPromo.currentRank}</span>
                  <span className="mx-1 text-slate-400">&rarr;</span>
                  <strong className="text-indigo-700 font-bold">{selectedCandidateForPromo.targetRank}</strong>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200 grid grid-cols-2 gap-2 text-[11px]">
                <div>
                  Verified Quality Score: <strong className="text-slate-900 font-bold">{selectedCandidateForPromo.qualityScore ?? 'No Data'}</strong>
                </div>
                <div>
                  Eligibility Status: <strong className={selectedCandidateForPromo.isEligible ? 'text-emerald-700 font-bold' : 'text-amber-700 font-bold'}>
                    {selectedCandidateForPromo.isEligible ? 'Meets Criteria' : 'Criteria Pending'}
                  </strong>
                </div>
              </div>

              {selectedCandidateForPromo.ineligibilityReasons.length > 0 && (
                <div className="p-2 bg-amber-50 border border-amber-200 rounded text-amber-800 text-[10px] space-y-0.5">
                  <strong className="block font-bold">Unfulfilled Criteria:</strong>
                  {selectedCandidateForPromo.ineligibilityReasons.map((r, i) => (
                    <div key={i}>• {r}</div>
                  ))}
                </div>
              )}
            </div>

            {promoError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{promoError}</span>
              </div>
            )}

            <form onSubmit={handleSavePromotion} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Administrative Decision</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setPromoAction('approve')}
                    className={`py-2 px-3 text-xs font-bold rounded-lg border text-center cursor-pointer ${
                      promoAction === 'approve'
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    Approve Promotion
                  </button>
                  <button
                    type="button"
                    onClick={() => setPromoAction('nominate')}
                    className={`py-2 px-3 text-xs font-bold rounded-lg border text-center cursor-pointer ${
                      promoAction === 'nominate'
                        ? 'bg-[#02167F] text-white border-[#02167F]'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    Nominate Only
                  </button>
                  <button
                    type="button"
                    onClick={() => setPromoAction('reject')}
                    className={`py-2 px-3 text-xs font-bold rounded-lg border text-center cursor-pointer ${
                      promoAction === 'reject'
                        ? 'bg-red-600 text-white border-red-600'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    Reject
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Reviewer Justification Reason *</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Record formal administrative justification or decision notes for audit log..."
                  value={promoReason}
                  onChange={(e) => setPromoReason(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedCandidateForPromo(null)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg font-bold hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#02167F] text-white rounded-lg font-bold hover:bg-[#031d99] cursor-pointer"
                >
                  Save Promotion Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
