import React, { useState, useEffect, useCallback, useRef } from 'react';
import { apiClient } from '../services/api';
import { useRealtime } from '../hooks/useRealtime';
import {
  SecurityDashboardData,
  Transaction,
  Alert,
  LiveActivityItem,
  EventEnvelope,
} from '../types';

import { DashboardHeader } from '../components/dashboard/DashboardHeader';
import { KPIGrid } from '../components/dashboard/KPIGrid';
import { RiskDistributionCard } from '../components/dashboard/RiskDistributionCard';
import { ActivityTrendCard } from '../components/dashboard/ActivityTrendCard';
import { LiveActivityFeed } from '../components/dashboard/LiveActivityFeed';
import { ActiveAlertsPanel } from '../components/dashboard/ActiveAlertsPanel';
import { RecentTransactionsPanel } from '../components/dashboard/RecentTransactionsPanel';
import { SystemStatusPanel } from '../components/dashboard/SystemStatusPanel';

const MAX_LIVE_EVENTS = 50;

export const Dashboard: React.FC = () => {
  const [timeRange, setTimeRange] = useState<string>('24h');
  const [dashboardData, setDashboardData] = useState<SecurityDashboardData | null>(null);
  const [liveActivities, setLiveActivities] = useState<LiveActivityItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Real-time WebSocket connection
  const { connectionState, subscribeEvent } = useRealtime('all');
  const initialLoadRef = useRef(false);

  // Fetch dashboard aggregate data
  const fetchDashboardData = useCallback(
    async (isManualRefresh = false) => {
      if (isManualRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      try {
        const res = await apiClient.get<SecurityDashboardData>(
          `/analytics/dashboard?time_range=${encodeURIComponent(timeRange)}`
        );
        setDashboardData(res.data);
      } catch (err: any) {
        console.error('Failed to fetch dashboard intelligence:', err);
        setError(
          err.response?.data?.detail ||
            'Unable to connect to security analytics aggregation service.'
        );
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [timeRange]
  );

  // Initial and on time-range change
  useEffect(() => {
    fetchDashboardData(initialLoadRef.current);
    initialLoadRef.current = true;
  }, [fetchDashboardData]);

  // Real-time WebSocket event listeners
  useEffect(() => {
    // 1. Transaction Created Event
    const unsubTx = subscribeEvent<any>('transaction.created', (envelope: EventEnvelope<any>) => {
      const payload = envelope.payload;
      if (!payload) return;

      const newTx: Transaction = {
        id: payload.id || payload.transaction_id || envelope.entity_id,
        user_id: payload.user_id || 'UNKNOWN',
        user_name: payload.user_name,
        amount: Number(payload.amount) || 0,
        currency: payload.currency || 'USD',
        merchant_name: payload.merchant_name || 'Unknown Merchant',
        merchant_category: payload.merchant_category || 'General',
        payment_method: payload.payment_method || 'CARD',
        device_id: payload.device_id || 'dev_unknown',
        failed_attempts: payload.failed_attempts || 0,
        source: payload.source || 'WEB',
        risk_score: Number(payload.risk_score) || 0,
        risk_level: payload.risk_level || 'LOW',
        ml_anomaly_score: Number(payload.ml_anomaly_score) || 0,
        rules_triggered: payload.rules_triggered || [],
        risk_factors: payload.risk_factors || [],
        status: payload.status || 'APPROVED',
        timestamp: payload.timestamp || envelope.occurred_at,
        created_at: payload.created_at || envelope.occurred_at,
      };

      // Update recent transactions and reconcile KPIs
      setDashboardData((prev) => {
        if (!prev) return null;
        const isHigh = newTx.risk_level === 'HIGH';
        const isCrit = newTx.risk_level === 'CRITICAL';
        const isFlagged = isHigh || isCrit;

        const updatedTxList = [newTx, ...prev.recent_transactions.slice(0, 9)];
        const newTotalTx = prev.kpis.total_transactions + 1;
        const newTotalVol = prev.kpis.total_volume + newTx.amount;
        const newAnomalyCount = prev.kpis.anomaly_count + (newTx.ml_anomaly_score >= 0.65 ? 1 : 0);

        return {
          ...prev,
          recent_transactions: updatedTxList,
          kpis: {
            ...prev.kpis,
            total_transactions: newTotalTx,
            total_volume: roundDec(newTotalVol),
            high_risk_transactions: prev.kpis.high_risk_transactions + (isHigh ? 1 : 0),
            critical_transactions: prev.kpis.critical_transactions + (isCrit ? 1 : 0),
            suspicious_transactions: prev.kpis.suspicious_transactions + (isFlagged ? 1 : 0),
            flagged_amount: roundDec(prev.kpis.flagged_amount + (isFlagged ? newTx.amount : 0)),
            anomaly_count: newAnomalyCount,
            anomaly_rate: roundDec((newAnomalyCount / newTotalTx) * 100),
          },
          risk_distribution: {
            ...prev.risk_distribution,
            [newTx.risk_level]: (prev.risk_distribution[newTx.risk_level] || 0) + 1,
          },
        };
      });

      // Add to live activity feed
      const activityItem: LiveActivityItem = {
        id: envelope.event_id || `act_tx_${Date.now()}_${Math.random()}`,
        type: envelope.event_type,
        title: `Transaction Evaluated: $${newTx.amount.toFixed(2)} at ${newTx.merchant_name}`,
        timestamp: envelope.occurred_at || new Date().toISOString(),
        entityId: newTx.id,
        riskScore: newTx.risk_score,
        details: `Risk Level: ${newTx.risk_level} • Decision: ${newTx.status}`,
      };

      setLiveActivities((prev) => [activityItem, ...prev.slice(0, MAX_LIVE_EVENTS - 1)]);
    });

    // 2. Alert Created Event
    const unsubAlert = subscribeEvent<any>('alert.created', (envelope: EventEnvelope<any>) => {
      const payload = envelope.payload;
      if (!payload) return;

      const newAlert: Alert = {
        id: payload.id || payload.alert_id || envelope.entity_id,
        transaction_id: payload.transaction_id || '',
        user_id: payload.user_id || 'UNKNOWN',
        severity: payload.severity || envelope.severity || 'HIGH',
        risk_score: Number(payload.risk_score) || 80,
        alert_reason: payload.alert_reason || payload.message || 'Suspicious financial anomaly detected',
        triggered_rules: payload.triggered_rules || [],
        model_version: payload.model_version || 'v1.0.0',
        status: payload.status || 'NEW',
        created_at: payload.created_at || envelope.occurred_at,
        updated_at: payload.updated_at || envelope.occurred_at,
      };

      // Update active alerts queue & KPIs
      setDashboardData((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          active_alerts: [newAlert, ...prev.active_alerts.slice(0, 5)],
          kpis: {
            ...prev.kpis,
            active_alerts: prev.kpis.active_alerts + 1,
            critical_alerts: prev.kpis.critical_alerts + (newAlert.severity === 'CRITICAL' ? 1 : 0),
          },
        };
      });

      // Add to live activity feed
      const activityItem: LiveActivityItem = {
        id: envelope.event_id || `act_al_${Date.now()}_${Math.random()}`,
        type: envelope.event_type,
        title: `${newAlert.severity} Security Alert Triggered`,
        timestamp: envelope.occurred_at || new Date().toISOString(),
        entityId: newAlert.id,
        riskScore: newAlert.risk_score,
        severity: newAlert.severity,
        details: newAlert.alert_reason,
      };

      setLiveActivities((prev) => [activityItem, ...prev.slice(0, MAX_LIVE_EVENTS - 1)]);
    });

    // 3. Risk Calculated Event
    const unsubRisk = subscribeEvent<any>('risk.calculated', (envelope: EventEnvelope<any>) => {
      const payload = envelope.payload;
      if (!payload) return;

      const activityItem: LiveActivityItem = {
        id: envelope.event_id || `act_rk_${Date.now()}_${Math.random()}`,
        type: envelope.event_type,
        title: `Risk Assessment Calculated: Score ${payload.risk_score ?? payload.score ?? 'N/A'}`,
        timestamp: envelope.occurred_at || new Date().toISOString(),
        entityId: payload.transaction_id || envelope.entity_id,
        riskScore: Number(payload.risk_score ?? payload.score ?? 0),
        details: `Risk Band: ${payload.risk_level || payload.risk_tier || 'EVALUATED'}`,
      };

      setLiveActivities((prev) => [activityItem, ...prev.slice(0, MAX_LIVE_EVENTS - 1)]);
    });

    return () => {
      unsubTx();
      unsubAlert();
      unsubRisk();
    };
  }, [subscribeEvent]);

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Header with Time Filter & Live Connection Status */}
      <DashboardHeader
        timeRange={timeRange}
        onTimeRangeChange={(r) => setTimeRange(r)}
        onRefresh={() => fetchDashboardData(true)}
        isRefreshing={isRefreshing}
        connectionState={connectionState}
        lastUpdated={dashboardData?.generated_at}
      />

      {/* 2. Primary KPI Stat Cards Row */}
      <KPIGrid
        kpis={dashboardData?.kpis ?? null}
        timeRange={timeRange}
        isLoading={isLoading}
        error={error}
      />

      {/* 3. Operational Visualizations Row: Trend Chart & Risk Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <ActivityTrendCard
            trends={dashboardData?.trends}
            timeRange={timeRange}
            isLoading={isLoading}
            error={error}
            onRetry={() => fetchDashboardData(true)}
          />
        </div>
        <div className="lg:col-span-1">
          <RiskDistributionCard
            distribution={dashboardData?.risk_distribution}
            isLoading={isLoading}
            error={error}
            onRetry={() => fetchDashboardData(true)}
          />
        </div>
      </div>

      {/* 4. Live Activity Stream & Active Alerts Queue */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <LiveActivityFeed
          events={liveActivities}
          onClear={() => setLiveActivities([])}
          maxEvents={MAX_LIVE_EVENTS}
        />
        <ActiveAlertsPanel
          alerts={dashboardData?.active_alerts}
          isLoading={isLoading}
          error={error}
          onRetry={() => fetchDashboardData(true)}
        />
      </div>

      {/* 5. Recent Ingested Transactions Table / Card View */}
      <RecentTransactionsPanel
        transactions={dashboardData?.recent_transactions}
        isLoading={isLoading}
        error={error}
        onRetry={() => fetchDashboardData(true)}
      />

      {/* 6. System Subsystems Operational Health Matrix */}
      <SystemStatusPanel
        systems={dashboardData?.system_status}
        isLoading={isLoading}
        error={error}
        onRetry={() => fetchDashboardData(true)}
      />
    </div>
  );
};

function roundDec(num: number): number {
  return Math.round((num + Number.EPSILON) * 100) / 100;
}
