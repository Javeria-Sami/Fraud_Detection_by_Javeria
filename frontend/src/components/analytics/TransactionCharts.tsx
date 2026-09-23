import React from 'react';
import {
  TransactionAnalyticsResponse,
} from '../../types';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
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
  TrendingUp,
  PieChart as PieIcon,
  CreditCard,
  ShoppingBag,
  Coins,
} from 'lucide-react';

interface TransactionChartsProps {
  data: TransactionAnalyticsResponse;
  isLoading?: boolean;
}

const STATUS_COLORS: Record<string, string> = {
  APPROVED: '#10B981', // green
  FLAGGED: '#F59E0B',  // amber
  REJECTED: '#EF4444', // red
  SUSPENDED: '#8B5CF6',// purple
  PENDING: '#6B7280',  // gray
};

const PALETTE = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'];

export const TransactionCharts: React.FC<TransactionChartsProps> = ({ data, isLoading }) => {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-pulse">
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl h-80 p-5" />
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl h-80 p-5" />
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl h-80 p-5" />
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl h-80 p-5" />
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
      {/* Currencies Summary Banner */}
      {data.currencies && data.currencies.length > 0 && (
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
            <Coins className="w-4 h-4 text-emerald-400" />
            <span>Volume by Currency:</span>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {data.currencies.map((curr) => (
              <div
                key={curr.currency}
                className="flex items-center gap-2 px-3 py-1.5 bg-slate-800/80 border border-slate-700/60 rounded-lg text-xs"
              >
                <span className="font-bold text-white">{curr.currency}</span>
                <span className="text-slate-400">
                  {curr.total_volume.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </span>
                <span className="text-slate-500">({curr.transaction_count} txns)</span>
                {curr.flagged_volume > 0 && (
                  <span className="text-amber-400 text-[10px] font-medium bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                    Flagged: {curr.flagged_volume.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Time-Series Transaction Volume & Anomaly Rate */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-blue-400" />
                <span>Transaction Volume Over Time</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Total throughput vs. flagged transaction velocity
              </p>
            </div>
            <span className="text-xs text-slate-500 bg-slate-800 px-2 py-1 rounded">
              {data.volume_trend?.length || 0} Intervals
            </span>
          </div>

          <div className="h-64 w-full">
            {data.volume_trend && data.volume_trend.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.volume_trend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="txnCountGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="flaggedGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#EF4444" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#EF4444" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="time" stroke="#64748b" fontSize={10} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={10} tickLine={false} />
                  <Tooltip contentStyle={customTooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                  <Area
                    type="monotone"
                    dataKey="transaction_count"
                    name="Total Txns"
                    stroke="#3B82F6"
                    fillOpacity={1}
                    fill="url(#txnCountGrad)"
                    strokeWidth={2}
                  />
                  <Area
                    type="monotone"
                    dataKey="flagged_count"
                    name="Flagged Txns"
                    stroke="#EF4444"
                    fillOpacity={1}
                    fill="url(#flaggedGrad)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-xs text-slate-500">
                No time-series data for selected window
              </div>
            )}
          </div>
        </div>

        {/* Transaction Status Distribution */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <PieIcon className="w-4 h-4 text-emerald-400" />
                <span>Status Breakdown</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Outcome ratio across approved, flagged, and rejected
              </p>
            </div>
            <span className="text-xs text-slate-500 bg-slate-800 px-2 py-1 rounded">
              {data.total_transactions.toLocaleString()} Txns
            </span>
          </div>

          <div className="h-64 w-full flex items-center">
            {data.status_distribution && data.status_distribution.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.status_distribution}
                    dataKey="count"
                    nameKey="status"
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={3}
                  >
                    {data.status_distribution.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={STATUS_COLORS[entry.status] || PALETTE[index % PALETTE.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={customTooltipStyle} />
                  <Legend
                    layout="vertical"
                    align="right"
                    verticalAlign="middle"
                    wrapperStyle={{ fontSize: '11px', paddingLeft: '10px' }}
                    formatter={(val, entry: any) => {
                      const item = data.status_distribution.find((d) => d.status === val);
                      return `${val}: ${item?.count || 0} (${item?.percentage || 0}%)`;
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full w-full text-xs text-slate-500">
                No status data available
              </div>
            )}
          </div>
        </div>

        {/* Merchant Category Distribution */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-purple-400" />
                <span>Merchant Category Breakdown</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Transaction volume distribution by merchant sector
              </p>
            </div>
          </div>

          <div className="h-64 w-full">
            {data.category_distribution && data.category_distribution.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={data.category_distribution.slice(0, 7)}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                  <XAxis type="number" stroke="#64748b" fontSize={10} tickLine={false} />
                  <YAxis
                    dataKey="category"
                    type="category"
                    stroke="#94a3b8"
                    fontSize={10}
                    tickLine={false}
                    width={80}
                  />
                  <Tooltip contentStyle={customTooltipStyle} />
                  <Bar dataKey="count" name="Transactions" fill="#8B5CF6" radius={[0, 4, 4, 0]}>
                    {data.category_distribution.slice(0, 7).map((_, index) => (
                      <Cell key={`bar-${index}`} fill={PALETTE[index % PALETTE.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-xs text-slate-500">
                No merchant category data available
              </div>
            )}
          </div>
        </div>

        {/* Payment Method Distribution */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-cyan-400" />
                <span>Payment Method Breakdown</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Distribution across card, transfer, crypto, and digital wallets
              </p>
            </div>
          </div>

          <div className="h-64 w-full">
            {data.payment_method_distribution && data.payment_method_distribution.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={data.payment_method_distribution}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="payment_method" stroke="#64748b" fontSize={10} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={10} tickLine={false} />
                  <Tooltip contentStyle={customTooltipStyle} />
                  <Bar dataKey="count" name="Count" fill="#06B6D4" radius={[4, 4, 0, 0]}>
                    {data.payment_method_distribution.map((_, index) => (
                      <Cell key={`pm-${index}`} fill={PALETTE[index % PALETTE.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-xs text-slate-500">
                No payment method data available
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
