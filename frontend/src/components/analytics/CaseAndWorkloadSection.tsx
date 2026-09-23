import React from 'react';
import { CaseAnalyticsResponse } from '../../types';
import {
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  CartesianGrid,
} from 'recharts';
import {
  FolderOpen,
  UserCheck,
  CheckCircle2,
  Lock,
  Clock,
  Briefcase,
  TrendingUp,
} from 'lucide-react';

interface CaseAndWorkloadSectionProps {
  data: CaseAnalyticsResponse;
  isLoading?: boolean;
}

const RESOLUTION_COLORS: Record<string, string> = {
  CONFIRMED_FRAUD: '#EF4444',
  FALSE_POSITIVE: '#10B981',
  SUSPICIOUS_CLEARED: '#3B82F6',
  ACCOUNT_TAKEOVER: '#F97316',
  CHARGEBACK_FILED: '#8B5CF6',
  POLICY_VIOLATION: '#EC4899',
  UNRESOLVED: '#6B7280',
};

const PALETTE = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4'];

export const CaseAndWorkloadSection: React.FC<CaseAndWorkloadSectionProps> = ({
  data,
  isLoading,
}) => {
  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-slate-900/60 border border-slate-800 rounded-xl h-24 p-4" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl h-80 p-5" />
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl h-80 p-5" />
        </div>
      </div>
    );
  }

  const customTooltipStyle = {
    backgroundColor: '#0f172a',
    borderColor: '#334155',
    borderRadius: '0.5rem',
    color: '#f8fafc',
    fontSize: '0.75rem',
  };

  return (
    <div className="space-y-6">
      {/* Case Lifecycle Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex items-center gap-4">
          <div className="p-3 bg-cyan-500/10 border border-cyan-500/20 rounded-xl text-cyan-400">
            <FolderOpen className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Total Cases
            </div>
            <div className="text-2xl font-bold text-white mt-1">{data.total_cases}</div>
            <div className="text-[11px] text-slate-500">Recorded dossiers</div>
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex items-center gap-4">
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Active Investigation
            </div>
            <div className="text-2xl font-bold text-white mt-1">
              {data.open_cases + data.investigating_cases}
            </div>
            <div className="text-[11px] text-amber-400">{data.investigating_cases} in triage</div>
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex items-center gap-4">
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Resolved Cases
            </div>
            <div className="text-2xl font-bold text-white mt-1">{data.resolved_cases}</div>
            <div className="text-[11px] text-slate-500">{data.closed_cases} archived</div>
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex items-center gap-4">
          <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-xl text-purple-400">
            <Briefcase className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Resolution Rate
            </div>
            <div className="text-2xl font-bold text-white mt-1">
              {(
                ((data.resolved_cases + data.closed_cases) / (data.total_cases || 1)) *
                100
              ).toFixed(1)}
              %
            </div>
            <div className="text-[11px] text-slate-500">Pipeline completion</div>
          </div>
        </div>
      </div>

      {/* Case Trend Over Time */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-cyan-400" />
              <span>Case Creation vs. Resolution Timeline</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Investigation intake compared against closed findings
            </p>
          </div>
          <span className="text-xs text-slate-500 bg-slate-800 px-2 py-1 rounded">
            {data.case_trend?.length || 0} Intervals
          </span>
        </div>

        <div className="h-64 w-full">
          {data.case_trend && data.case_trend.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.case_trend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="time" stroke="#64748b" fontSize={10} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={10} tickLine={false} />
                <Tooltip contentStyle={customTooltipStyle} />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                <Line
                  type="monotone"
                  dataKey="created_count"
                  name="Cases Opened"
                  stroke="#3B82F6"
                  strokeWidth={2}
                  dot={{ r: 2 }}
                />
                <Line
                  type="monotone"
                  dataKey="resolved_count"
                  name="Cases Resolved"
                  stroke="#10B981"
                  strokeWidth={2}
                  dot={{ r: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full text-xs text-slate-500">
              No case timeline data available
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Case Resolution Distribution */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 flex flex-col justify-between">
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Resolution Findings Outcome</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Breakdown by fraud verification result
            </p>
          </div>

          <div className="h-64 w-full flex items-center">
            {data.resolution_distribution && data.resolution_distribution.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.resolution_distribution}
                    dataKey="count"
                    nameKey="label"
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={3}
                  >
                    {data.resolution_distribution.map((entry, index) => (
                      <Cell
                        key={`res-${index}`}
                        fill={RESOLUTION_COLORS[entry.label] || PALETTE[index % PALETTE.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={customTooltipStyle} />
                  <Legend
                    layout="vertical"
                    align="right"
                    verticalAlign="middle"
                    wrapperStyle={{ fontSize: '11px', paddingLeft: '8px' }}
                    formatter={(val) => {
                      const item = data.resolution_distribution.find((d) => d.label === val);
                      return `${val}: ${item?.count || 0}`;
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full w-full text-xs text-slate-500">
                No resolution finding records
              </div>
            )}
          </div>
        </div>

        {/* Analyst Workload Table */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 flex flex-col justify-between">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-purple-400" />
                <span>Analyst Workload Distribution</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Active investigation caseload per security analyst
              </p>
            </div>
            {!data.analyst_workload && (
              <span className="flex items-center gap-1 text-[11px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                <Lock className="w-3 h-3" /> RBAC Restricted
              </span>
            )}
          </div>

          <div className="overflow-x-auto">
            {data.analyst_workload && data.analyst_workload.length > 0 ? (
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400">
                    <th className="pb-2 font-medium">Analyst</th>
                    <th className="pb-2 font-medium">Assigned</th>
                    <th className="pb-2 font-medium">Open / Active</th>
                    <th className="pb-2 font-medium">Resolved</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {data.analyst_workload.map((analyst) => (
                    <tr key={analyst.analyst_name} className="hover:bg-slate-800/40">
                      <td className="py-2.5 font-medium text-white flex items-center gap-1.5">
                        <UserCheck className="w-3.5 h-3.5 text-blue-400" />
                        <span>{analyst.analyst_name}</span>
                      </td>
                      <td className="py-2.5 text-slate-300">{analyst.assigned_cases}</td>
                      <td className="py-2.5 font-semibold text-amber-400">
                        {analyst.open_cases}
                      </td>
                      <td className="py-2.5 font-semibold text-emerald-400">
                        {analyst.resolved_cases}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="flex flex-col items-center justify-center h-48 text-xs text-slate-500 gap-2">
                <Lock className="w-6 h-6 text-slate-600" />
                <span>Analyst workload data requires Analyst or Admin role privileges</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
