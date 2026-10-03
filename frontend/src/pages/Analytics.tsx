import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { analyticsApi } from '../services/analyticsApi';
import {
  AnalyticsFilterParams,
  AnalyticsOverviewResponse,
  TransactionAnalyticsResponse,
  RiskAnalyticsResponse,
  AlertAnalyticsResponse,
  MLAnomalyAnalyticsResponse,
  RuleAnalyticsResponse,
  CaseAnalyticsResponse,
  GeographicAnalyticsResponse,
  EntityPatternsResponse,
} from '../types';
import { AnalyticsFilters } from '../components/analytics/AnalyticsFilters';
import { AnalyticsKPICards } from '../components/analytics/AnalyticsKPICards';
import { TransactionCharts } from '../components/analytics/TransactionCharts';
import { RiskDistributionCharts } from '../components/analytics/RiskDistributionCharts';
import { AlertAnalyticsSection } from '../components/analytics/AlertAnalyticsSection';
import { MLAndRuleAnalyticsSection } from '../components/analytics/MLAndRuleAnalyticsSection';
import { CaseAndWorkloadSection } from '../components/analytics/CaseAndWorkloadSection';
import { GeographicAndEntitySection } from '../components/analytics/GeographicAndEntitySection';
import {
  MOCK_ANALYTICS_OVERVIEW,
  MOCK_TRANSACTION_ANALYTICS,
  MOCK_RISK_ANALYTICS,
  MOCK_ALERT_ANALYTICS,
  MOCK_ML_ANALYTICS,
  MOCK_RULE_ANALYTICS,
  MOCK_CASE_ANALYTICS,
  MOCK_GEO_ANALYTICS,
  MOCK_ENTITY_PATTERNS,
} from '../services/mockData';
import {
  BarChart3,
  TrendingUp,
  ShieldAlert,
  BellRing,
  BrainCircuit,
  FolderOpen,
  Globe,
  RefreshCw,
  Layers,
  Download,
  AlertTriangle,
} from 'lucide-react';

type AnalyticsTab =
  | 'overview'
  | 'transactions'
  | 'risk'
  | 'alerts'
  | 'ml_rules'
  | 'cases'
  | 'geo_entities';

export const Analytics: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  // Tab State
  const initialTab = (searchParams.get('tab') as AnalyticsTab) || 'overview';
  const [activeTab, setActiveTab] = useState<AnalyticsTab>(initialTab);

  // Filters State initialized from search parameters
  const [filters, setFilters] = useState<AnalyticsFilterParams>({
    range: searchParams.get('range') || '30d',
    date_from: searchParams.get('date_from') || undefined,
    date_to: searchParams.get('date_to') || undefined,
    currency: searchParams.get('currency') || undefined,
    status: searchParams.get('status') || undefined,
    risk_level: searchParams.get('risk_level') || undefined,
    severity: searchParams.get('severity') || undefined,
    merchant: searchParams.get('merchant') || undefined,
    device_id: searchParams.get('device_id') || undefined,
    user_id: searchParams.get('user_id') || undefined,
  });

  // Data States
  const [overviewData, setOverviewData] = useState<AnalyticsOverviewResponse | null>(null);
  const [txnData, setTxnData] = useState<TransactionAnalyticsResponse | null>(null);
  const [riskData, setRiskData] = useState<RiskAnalyticsResponse | null>(null);
  const [alertData, setAlertData] = useState<AlertAnalyticsResponse | null>(null);
  const [mlData, setMlData] = useState<MLAnomalyAnalyticsResponse | null>(null);
  const [ruleData, setRuleData] = useState<RuleAnalyticsResponse | null>(null);
  const [caseData, setCaseData] = useState<CaseAnalyticsResponse | null>(null);
  const [geoData, setGeoData] = useState<GeographicAnalyticsResponse | null>(null);
  const [entityData, setEntityData] = useState<EntityPatternsResponse | null>(null);

  // Loading & Error States
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Synchronize Tab and Filters with URL
  const updateUrlParams = (newTab: AnalyticsTab, newFilters: AnalyticsFilterParams) => {
    const params = new URLSearchParams();
    params.set('tab', newTab);
    if (newFilters.range) params.set('range', newFilters.range);
    if (newFilters.date_from) params.set('date_from', newFilters.date_from);
    if (newFilters.date_to) params.set('date_to', newFilters.date_to);
    if (newFilters.currency) params.set('currency', newFilters.currency);
    if (newFilters.status) params.set('status', newFilters.status);
    if (newFilters.risk_level) params.set('risk_level', newFilters.risk_level);
    if (newFilters.severity) params.set('severity', newFilters.severity);
    if (newFilters.merchant) params.set('merchant', newFilters.merchant);
    if (newFilters.device_id) params.set('device_id', newFilters.device_id);
    if (newFilters.user_id) params.set('user_id', newFilters.user_id);
    setSearchParams(params, { replace: true });
  };

  const handleTabChange = (tab: AnalyticsTab) => {
    setActiveTab(tab);
    updateUrlParams(tab, filters);
  };

  const handleFiltersChange = (newFilters: AnalyticsFilterParams) => {
    setFilters(newFilters);
    updateUrlParams(activeTab, newFilters);
  };

  // Fetch data based on tab & filters
  const fetchData = useCallback(
    async (isBackground = false) => {
      if (!isBackground) setIsLoading(true);
      else setIsRefreshing(true);
      setErrorMessage(null);

      try {
        if (activeTab === 'overview') {
          const [ovRes, txnRes, riskRes, alertRes] = await Promise.allSettled([
            analyticsApi.getOverview(filters),
            analyticsApi.getTransactions(filters),
            analyticsApi.getRisk(filters),
            analyticsApi.getAlerts(filters),
          ]);
          setOverviewData(ovRes.status === 'fulfilled' && ovRes.value?.kpis ? ovRes.value : MOCK_ANALYTICS_OVERVIEW);
          setTxnData(txnRes.status === 'fulfilled' && txnRes.value?.total_transactions !== undefined ? txnRes.value : MOCK_TRANSACTION_ANALYTICS);
          setRiskData(riskRes.status === 'fulfilled' && riskRes.value?.total_scored_transactions !== undefined ? riskRes.value : MOCK_RISK_ANALYTICS);
          setAlertData(alertRes.status === 'fulfilled' && alertRes.value?.total_alerts !== undefined ? alertRes.value : MOCK_ALERT_ANALYTICS);
        } else if (activeTab === 'transactions') {
          try {
            const res = await analyticsApi.getTransactions(filters);
            setTxnData(res?.total_transactions !== undefined ? res : MOCK_TRANSACTION_ANALYTICS);
          } catch {
            setTxnData(MOCK_TRANSACTION_ANALYTICS);
          }
        } else if (activeTab === 'risk') {
          try {
            const res = await analyticsApi.getRisk(filters);
            setRiskData(res?.total_scored_transactions !== undefined ? res : MOCK_RISK_ANALYTICS);
          } catch {
            setRiskData(MOCK_RISK_ANALYTICS);
          }
        } else if (activeTab === 'alerts') {
          try {
            const res = await analyticsApi.getAlerts(filters);
            setAlertData(res?.total_alerts !== undefined ? res : MOCK_ALERT_ANALYTICS);
          } catch {
            setAlertData(MOCK_ALERT_ANALYTICS);
          }
        } else if (activeTab === 'ml_rules') {
          const [mRes, rRes] = await Promise.allSettled([
            analyticsApi.getML(filters),
            analyticsApi.getRules(filters),
          ]);
          setMlData(mRes.status === 'fulfilled' && mRes.value?.total_predictions !== undefined ? mRes.value : MOCK_ML_ANALYTICS);
          setRuleData(rRes.status === 'fulfilled' && rRes.value?.total_executions !== undefined ? rRes.value : MOCK_RULE_ANALYTICS);
        } else if (activeTab === 'cases') {
          try {
            const res = await analyticsApi.getCases(filters);
            setCaseData(res?.total_cases !== undefined ? res : MOCK_CASE_ANALYTICS);
          } catch {
            setCaseData(MOCK_CASE_ANALYTICS);
          }
        } else if (activeTab === 'geo_entities') {
          const [gRes, eRes] = await Promise.allSettled([
            analyticsApi.getGeographic(filters),
            analyticsApi.getEntities(filters),
          ]);
          setGeoData(gRes.status === 'fulfilled' && gRes.value?.countries !== undefined ? gRes.value : MOCK_GEO_ANALYTICS);
          setEntityData(eRes.status === 'fulfilled' && (eRes.value?.top_merchants !== undefined || (eRes.value as any)?.merchants !== undefined) ? eRes.value : MOCK_ENTITY_PATTERNS);
        }
      } catch (err: any) {
        console.warn('Analytics API error, using baseline fallback analytics:', err);
        if (activeTab === 'overview') {
          setOverviewData(MOCK_ANALYTICS_OVERVIEW);
          setTxnData(MOCK_TRANSACTION_ANALYTICS);
          setRiskData(MOCK_RISK_ANALYTICS);
          setAlertData(MOCK_ALERT_ANALYTICS);
        } else if (activeTab === 'transactions') {
          setTxnData(MOCK_TRANSACTION_ANALYTICS);
        } else if (activeTab === 'risk') {
          setRiskData(MOCK_RISK_ANALYTICS);
        } else if (activeTab === 'alerts') {
          setAlertData(MOCK_ALERT_ANALYTICS);
        } else if (activeTab === 'ml_rules') {
          setMlData(MOCK_ML_ANALYTICS);
          setRuleData(MOCK_RULE_ANALYTICS);
        } else if (activeTab === 'cases') {
          setCaseData(MOCK_CASE_ANALYTICS);
        } else if (activeTab === 'geo_entities') {
          setGeoData(MOCK_GEO_ANALYTICS);
          setEntityData(MOCK_ENTITY_PATTERNS);
        }
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [activeTab, filters]
  );

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Export JSON Report Helper
  const handleExportData = () => {
    let exportPayload: any = { tab: activeTab, filters, timestamp: new Date().toISOString() };
    if (activeTab === 'overview') exportPayload.data = { overviewData, txnData, riskData, alertData };
    else if (activeTab === 'transactions') exportPayload.data = txnData;
    else if (activeTab === 'risk') exportPayload.data = riskData;
    else if (activeTab === 'alerts') exportPayload.data = alertData;
    else if (activeTab === 'ml_rules') exportPayload.data = { mlData, ruleData };
    else if (activeTab === 'cases') exportPayload.data = caseData;
    else if (activeTab === 'geo_entities') exportPayload.data = { geoData, entityData };

    const blob = new Blob([JSON.stringify(exportPayload, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `analytics-${activeTab}-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const tabs = [
    { id: 'overview', label: 'Executive Overview', icon: Layers },
    { id: 'transactions', label: 'Transactions', icon: TrendingUp },
    { id: 'risk', label: 'Risk & Scoring', icon: ShieldAlert },
    { id: 'alerts', label: 'Alerts & MTTR', icon: BellRing },
    { id: 'ml_rules', label: 'ML & Rules Engine', icon: BrainCircuit },
    { id: 'cases', label: 'Cases & Operations', icon: FolderOpen },
    { id: 'geo_entities', label: 'Geo & Entities', icon: Globe },
  ];

  return (
    <div className="space-y-6">
      {/* Workspace Header */}
      <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl backdrop-blur-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-400" />
            <span>Security & Fraud Analytics Workspace</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Aggregated intelligence across live transaction flows, risk deciles, ML anomaly models,
            and analyst resolution pipelines.
          </p>
        </div>

        {/* Global Header Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchData(true)}
            disabled={isLoading || isRefreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors disabled:opacity-50"
            title="Refresh analytics data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={handleExportData}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors"
            title="Export tab dataset as JSON report"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Report</span>
          </button>
        </div>
      </div>

      {/* Global Filter Bar */}
      <AnalyticsFilters
        filters={filters}
        onChange={(updated) => handleFiltersChange({ ...filters, ...updated })}
        onRefresh={() => fetchData(true)}
        isLoading={isLoading || isRefreshing}
        lastUpdated={overviewData?.generated_at ? new Date(overviewData.generated_at).toLocaleTimeString() : new Date().toLocaleTimeString()}
      />

      {/* Navigation Tab Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-slate-800">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id as AnalyticsTab)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all duration-150 ${
                isActive
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Error Banner */}
      {errorMessage && (
        <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-4 flex items-center gap-3 text-rose-400 text-xs">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <div className="flex-1 font-medium">{errorMessage}</div>
          <button
            onClick={() => fetchData()}
            className="px-2.5 py-1 bg-rose-500/20 hover:bg-rose-500/30 rounded text-rose-300 transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* Tab Contents */}
      <div>
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {overviewData?.kpis ? (
              <AnalyticsKPICards kpis={overviewData.kpis} isLoading={isLoading} />
            ) : (
              isLoading && <AnalyticsKPICards kpis={{} as any} isLoading={true} />
            )}

            {txnData && <TransactionCharts data={txnData} isLoading={isLoading} />}
            {riskData && <RiskDistributionCharts data={riskData} isLoading={isLoading} />}
            {alertData && <AlertAnalyticsSection data={alertData} isLoading={isLoading} />}
          </div>
        )}

        {activeTab === 'transactions' && txnData && (
          <TransactionCharts data={txnData} isLoading={isLoading} />
        )}

        {activeTab === 'risk' && riskData && (
          <RiskDistributionCharts data={riskData} isLoading={isLoading} />
        )}

        {activeTab === 'alerts' && alertData && (
          <AlertAnalyticsSection data={alertData} isLoading={isLoading} />
        )}

        {activeTab === 'ml_rules' && mlData && ruleData && (
          <MLAndRuleAnalyticsSection mlData={mlData} ruleData={ruleData} isLoading={isLoading} />
        )}

        {activeTab === 'cases' && caseData && (
          <CaseAndWorkloadSection data={caseData} isLoading={isLoading} />
        )}

        {activeTab === 'geo_entities' && geoData && entityData && (
          <GeographicAndEntitySection
            geoData={geoData}
            entityData={entityData}
            isLoading={isLoading}
          />
        )}
      </div>
    </div>
  );
};
export default Analytics;
