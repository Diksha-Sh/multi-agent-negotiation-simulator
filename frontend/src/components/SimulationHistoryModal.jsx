import { useState, useEffect } from 'react';
import {
  X,
  History,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Calendar,
  Layers,
  ChevronDown,
  ChevronUp,
  Trash2,
  Database,
  RefreshCw,
  ShoppingBag,
  Briefcase,
  Wallet,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { fetchUserSimulations, deleteSimulationRecord, isSupabaseConfigured } from '../services/supabase';

const SCENARIO_ICONS = {
  vendor_pricing: ShoppingBag,
  job_offer: Briefcase,
  project_budget_allocation: Wallet,
};

export default function SimulationHistoryModal({ isOpen, onClose, currentUser }) {
  const { isDark } = useTheme();
  const [simulations, setSimulations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [storageSource, setStorageSource] = useState('local');

  const isConnected = isSupabaseConfigured();

  const loadHistory = async () => {
    setIsLoading(true);
    try {
      const { data, source } = await fetchUserSimulations(currentUser?.id);
      setSimulations(data || []);
      setStorageSource(source);
    } catch (err) {
      console.warn('Failed to load history:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let ignore = false;
    if (isOpen) {
      fetchUserSimulations(currentUser?.id).then(({ data, source }) => {
        if (!ignore) {
          setSimulations(data || []);
          setStorageSource(source);
          setIsLoading(false);
        }
      }).catch((err) => {
        console.warn('Failed to load history:', err);
        if (!ignore) setIsLoading(false);
      });
    }
    return () => {
      ignore = true;
    };
  }, [isOpen, currentUser]);

  if (!isOpen) return null;

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this simulation from history?')) {
      await deleteSimulationRecord(id);
      setSimulations((prev) => prev.filter((s) => s.id !== id));
      if (expandedId === id) setExpandedId(null);
    }
  };

  const filteredSimulations = simulations.filter((sim) => {
    if (filterStatus === 'all') return true;
    return sim.status === filterStatus;
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case 'accepted':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/30">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Deal Agreed
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-500 border border-rose-500/30">
            <XCircle className="w-3.5 h-3.5" />
            Walkaway Rejection
          </span>
        );
      case 'deadlock':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-500 border border-amber-500/30">
            <AlertTriangle className="w-3.5 h-3.5" />
            Max Rounds Deadlock
          </span>
        );
    }
  };

  const formatDate = (isoString) => {
    if (!isoString) return 'Just now';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div
        className={`relative w-full max-w-4xl rounded-2xl border shadow-2xl overflow-hidden z-10 flex flex-col max-h-[90vh] transition-colors duration-200 ${
          isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        {/* Modal Header */}
        <div
          className={`px-6 py-4 border-b flex items-center justify-between gap-4 ${
            isDark ? 'border-slate-800 bg-slate-950/60' : 'border-slate-100 bg-slate-50'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-500 flex items-center justify-center">
              <History className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold">Simulation History</h2>
                <span
                  className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    isConnected && storageSource === 'supabase'
                      ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30'
                      : 'bg-amber-500/10 text-amber-500 border-amber-500/30'
                  }`}
                  title={isConnected ? 'Connected to Supabase PostgreSQL' : 'Local browser storage fallback'}
                >
                  <Database className="w-3 h-3" />
                  {isConnected && storageSource === 'supabase' ? 'Supabase Cloud' : 'Local Storage Cache'}
                </span>
              </div>
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                {currentUser?.email
                  ? `Recorded negotiations for ${currentUser.email}`
                  : 'Past recorded negotiation sessions'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={loadHistory}
              className={`p-2 rounded-lg border transition-colors ${
                isDark ? 'border-slate-800 hover:bg-slate-800 text-slate-400' : 'border-slate-200 hover:bg-slate-100 text-slate-600'
              }`}
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className={`p-2 rounded-lg border transition-colors ${
                isDark ? 'border-slate-800 hover:bg-slate-800 text-slate-400' : 'border-slate-200 hover:bg-slate-100 text-slate-600'
              }`}
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Filter bar */}
        <div
          className={`px-6 py-2.5 border-b flex items-center justify-between gap-3 text-xs ${
            isDark ? 'border-slate-800/80 bg-slate-900/40' : 'border-slate-100 bg-slate-50/50'
          }`}
        >
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className={`font-semibold mr-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Filter:</span>
            {['all', 'accepted', 'deadlock', 'rejected'].map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setFilterStatus(status)}
                className={`px-2.5 py-1 rounded-lg font-medium capitalize transition-all ${
                  filterStatus === status
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : isDark
                    ? 'bg-slate-800/60 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                    : 'bg-slate-200/60 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                }`}
              >
                {status === 'all' ? `All (${simulations.length})` : status}
              </button>
            ))}
          </div>

          <span className={`text-[11px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
            Showing {filteredSimulations.length} session{filteredSimulations.length === 1 ? '' : 's'}
          </span>
        </div>

        {/* Body content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-3">
              <RefreshCw className="w-6 h-6 animate-spin text-indigo-500" />
              <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Loading simulation history...</p>
            </div>
          ) : filteredSimulations.length === 0 ? (
            <div className="py-16 text-center max-w-sm mx-auto">
              <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-500 flex items-center justify-center mx-auto mb-4">
                <History className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold mb-1">No Simulation Records Found</h3>
              <p className={`text-xs mb-4 leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                {filterStatus !== 'all'
                  ? `No simulations with status "${filterStatus}". Try switching the filter.`
                  : 'Completed negotiation simulations from the Arena will automatically appear here.'}
              </p>
            </div>
          ) : (
            filteredSimulations.map((sim) => {
              const isExpanded = expandedId === sim.id;
              const IconComponent = SCENARIO_ICONS[sim.scenario_id] || Layers;
              const turnsList = Array.isArray(sim.turns) ? sim.turns : [];

              return (
                <div
                  key={sim.id}
                  className={`border rounded-xl overflow-hidden transition-all duration-150 ${
                    isDark ? 'border-slate-800 bg-slate-900/60 hover:border-slate-700' : 'border-slate-200 bg-white hover:border-slate-300 shadow-sm'
                  }`}
                >
                  {/* Summary Card Header */}
                  <div
                    onClick={() => setExpandedId(isExpanded ? null : sim.id)}
                    className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer"
                  >
                    <div className="flex items-start sm:items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-500 flex items-center justify-center shrink-0">
                        <IconComponent className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <h4 className="text-sm font-bold">{sim.scenario_title || sim.scenario_id}</h4>
                          {getStatusBadge(sim.status)}
                        </div>
                        <div className={`flex items-center gap-3 text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" />
                            {formatDate(sim.created_at)}
                          </span>
                          <span>•</span>
                          <span>{sim.total_rounds || 0} Rounds</span>
                          <span>•</span>
                          <span>{sim.total_turns || turnsList.length} Turns</span>
                          {sim.winner && (
                            <>
                              <span>•</span>
                              <span className="text-indigo-400 font-semibold">
                                Winner: {sim.winner}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <button
                        type="button"
                        onClick={(e) => handleDelete(sim.id, e)}
                        className={`p-2 rounded-lg border text-rose-500 transition-colors ${
                          isDark ? 'border-slate-800 hover:bg-rose-500/10' : 'border-slate-200 hover:bg-rose-50'
                        }`}
                        title="Delete simulation"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        className={`p-2 rounded-lg border text-slate-400 transition-colors ${
                          isDark ? 'border-slate-800' : 'border-slate-200'
                        }`}
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Expanded Turn-by-Turn Replay Drawer */}
                  {isExpanded && (
                    <div
                      className={`border-t p-4 sm:p-5 space-y-3 ${
                        isDark ? 'border-slate-800 bg-slate-950/50' : 'border-slate-100 bg-slate-50/70'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-indigo-500">
                          Negotiation Transcript ({turnsList.length} Turns)
                        </span>
                        <span className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                          ID: <code className="font-mono">{sim.id}</code>
                        </span>
                      </div>

                      {turnsList.length === 0 ? (
                        <p className="text-xs text-slate-500 italic">No detailed turn transcript recorded.</p>
                      ) : (
                        <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                          {turnsList.map((t, idx) => (
                            <div
                              key={idx}
                              className={`p-3 rounded-lg border text-xs flex flex-col gap-1.5 ${
                                isDark ? 'border-slate-800 bg-slate-900/80' : 'border-slate-200 bg-white'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <span className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-400 text-[10px] font-bold flex items-center justify-center">
                                    {t.turn_number || idx + 1}
                                  </span>
                                  <span className="font-bold">{t.agent_name || t.agent_id}</span>
                                  <span className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                    ({t.role || 'Agent'})
                                  </span>
                                </div>
                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                                    t.action === 'accept'
                                      ? 'bg-emerald-500/20 text-emerald-400'
                                      : t.action === 'reject'
                                      ? 'bg-rose-500/20 text-rose-400'
                                      : 'bg-indigo-500/20 text-indigo-400'
                                  }`}
                                >
                                  {t.action}
                                </span>
                              </div>

                              {t.offer && Object.keys(t.offer).length > 0 && (
                                <div className="flex items-center gap-2 py-0.5">
                                  <span className={`font-semibold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                    Proposed Terms:
                                  </span>
                                  <span className="font-mono text-indigo-400 font-bold">
                                    {Object.entries(t.offer)
                                      .map(([k, v]) => `${k.replace(/_/g, ' ')}: ${v}`)
                                      .join(' • ')}
                                  </span>
                                </div>
                              )}

                              {t.reasoning && (
                                <p className={`leading-relaxed italic ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                                  "{t.reasoning}"
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div
          className={`px-6 py-3.5 border-t flex items-center justify-between text-xs ${
            isDark ? 'border-slate-800 bg-slate-950/60' : 'border-slate-100 bg-slate-50'
          }`}
        >
          <span className={`${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            {isConnected ? '✓ Supabase Connected' : 'ℹ Running with local fallback storage'}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-sm"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
