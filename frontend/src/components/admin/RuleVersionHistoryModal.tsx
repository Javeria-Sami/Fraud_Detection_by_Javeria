import React, { useState } from 'react';
import { AdminFraudRule, RuleVersion, RuleVersionComparisonResult } from '../../types';
import { adminApi } from '../../services/adminApi';
import {
  History,
  X,
  CheckCircle2,
  Clock,
  RotateCcw,
  GitCompare,
  ArrowRight,
  AlertTriangle,
  FileCode,
} from 'lucide-react';

interface RuleVersionHistoryModalProps {
  rule: AdminFraudRule;
  onClose: () => void;
  onRuleUpdated: (updated: AdminFraudRule) => void;
}

export const RuleVersionHistoryModal: React.FC<RuleVersionHistoryModalProps> = ({
  rule,
  onClose,
  onRuleUpdated,
}) => {
  const [selectedVersionForCompare, setSelectedVersionForCompare] = useState<string | null>(null);
  const [comparisonResult, setComparisonResult] = useState<RuleVersionComparisonResult | null>(null);
  const [isComparing, setIsComparing] = useState<boolean>(false);
  const [isActivating, setIsActivating] = useState<boolean>(false);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const versions = rule.versions || [];
  const activeVersion = versions.find((v) => v.is_active);

  const handleActivate = async (version: RuleVersion) => {
    if (version.is_active) return;
    if (!window.confirm(`Activate version ${version.version} for ${rule.name}? This will retire the current active version.`)) {
      return;
    }

    setIsActivating(true);
    setActionMessage(null);
    try {
      const updated = await adminApi.activateRuleVersion(
        rule.id,
        version.id,
        `Rollback/Re-activation of version ${version.version}`
      );
      onRuleUpdated(updated);
      setActionMessage({ type: 'success', text: `Version ${version.version} successfully activated.` });
    } catch (err: any) {
      setActionMessage({
        type: 'error',
        text: err.response?.data?.detail || 'Failed to activate selected version.',
      });
    } finally {
      setIsActivating(false);
    }
  };

  const handleCompareWithActive = async (targetVersionId: string) => {
    if (!activeVersion) return;
    setIsComparing(true);
    setSelectedVersionForCompare(targetVersionId);
    setActionMessage(null);

    try {
      const diff = await adminApi.compareRuleVersions(activeVersion.id, targetVersionId);
      setComparisonResult(diff);
    } catch (err: any) {
      setActionMessage({
        type: 'error',
        text: err.response?.data?.detail || 'Failed to compute version comparison.',
      });
    } finally {
      setIsComparing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
      <div className="bg-soc-card border border-soc-border rounded-2xl max-w-3xl w-full p-6 shadow-2xl space-y-5 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center border-b border-soc-border pb-3">
          <div>
            <h3 className="text-sm font-bold text-soc-foreground uppercase tracking-wider flex items-center gap-2">
              <History className="w-4 h-4 text-blue-500" />
              <span>Version History & Audit Timeline</span>
            </h3>
            <span className="text-xs text-blue-600 dark:text-blue-400 font-mono font-semibold">{rule.name} ({rule.rule_code})</span>
          </div>
          <button onClick={onClose} className="text-soc-muted hover:text-soc-foreground p-1 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Message Alert */}
        {actionMessage && (
          <div
            className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
              actionMessage.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                : 'bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400'
            }`}
          >
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>{actionMessage.text}</span>
          </div>
        )}

        <div className="flex-1 overflow-y-auto space-y-5 pr-1">
          {/* Versions Timeline */}
          <div className="space-y-3">
            {versions.map((ver) => {
              const isActive = ver.is_active;
              return (
                <div
                  key={ver.id}
                  className={`p-4 rounded-xl border transition-all ${
                    isActive
                      ? 'bg-blue-500/10 border-blue-500/40 shadow-sm'
                      : 'bg-soc-surface border-soc-border hover:bg-soc-cardHover'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-soc-card border border-soc-border text-soc-foreground font-mono font-bold text-xs">
                        v{ver.version}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-soc-foreground text-xs">
                            Weight: +{ver.weight} pts
                          </span>
                          {isActive ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> ACTIVE
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-soc-card border border-soc-border text-soc-muted">
                              RETIRED
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-soc-muted flex items-center gap-2 mt-0.5">
                          <span>By: {ver.created_by}</span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-soc-muted" />
                            {ver.created_at ? new Date(ver.created_at).toLocaleString() : 'N/A'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      {!isActive && activeVersion && (
                        <button
                          onClick={() => handleCompareWithActive(ver.id)}
                          className="px-2.5 py-1.5 rounded-lg bg-soc-surface hover:bg-soc-cardHover border border-soc-border text-soc-foreground text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer"
                          title="Compare diff with current active version"
                        >
                          <GitCompare className="w-3.5 h-3.5 text-purple-500" />
                          <span>Compare Diff</span>
                        </button>
                      )}

                      {!isActive && (
                        <button
                          onClick={() => handleActivate(ver)}
                          disabled={isActivating}
                          className="px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-600 dark:text-emerald-300 text-xs font-bold flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Activate / Rollback</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Configuration Preview Snippet */}
                  <div className="mt-3 pt-2.5 border-t border-soc-border font-mono text-[11px] text-soc-muted flex flex-wrap gap-x-4 gap-y-1">
                    {ver.configuration && Object.keys(ver.configuration).length > 0 ? (
                      Object.entries(ver.configuration).map(([k, v]) => (
                        <div key={k} className="flex items-center gap-1">
                          <span className="text-soc-muted">{k}:</span>
                          <span className="text-soc-foreground font-semibold">{String(v)}</span>
                        </div>
                      ))
                    ) : (
                      <span className="text-soc-muted italic">No custom parameters</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Version Comparison Diff Section */}
          {comparisonResult && (
            <div className="bg-soc-surface border border-purple-500/30 rounded-xl p-4 space-y-3 shadow-sm">
              <div className="flex items-center justify-between border-b border-soc-border pb-2">
                <div className="flex items-center gap-2 text-xs font-bold text-soc-foreground">
                  <GitCompare className="w-4 h-4 text-purple-500" />
                  <span>
                    Comparison: Active v{comparisonResult.version_a} vs Selected v{comparisonResult.version_b}
                  </span>
                </div>
                <button
                  onClick={() => setComparisonResult(null)}
                  className="text-xs text-soc-muted hover:text-soc-foreground cursor-pointer"
                >
                  Close Diff
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead>
                    <tr className="border-b border-soc-border text-soc-muted text-[11px]">
                      <th className="pb-2">Parameter Field</th>
                      <th className="pb-2">Active (v{comparisonResult.version_a})</th>
                      <th className="pb-2">Target (v{comparisonResult.version_b})</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-soc-border">
                    <tr className="hover:bg-soc-cardHover">
                      <td className="py-2 text-soc-muted">Score Weight</td>
                      <td className="py-2 text-soc-foreground">+{comparisonResult.weight_a} pts</td>
                      <td
                        className={`py-2 font-bold ${
                          comparisonResult.weight_a !== comparisonResult.weight_b
                            ? 'text-amber-600 dark:text-amber-400'
                            : 'text-soc-foreground'
                        }`}
                      >
                        +{comparisonResult.weight_b} pts
                      </td>
                    </tr>
                    {comparisonResult.configuration_diff.map((diff) => (
                      <tr
                        key={diff.field}
                        className={diff.changed ? 'bg-amber-500/10' : 'hover:bg-soc-cardHover'}
                      >
                        <td className="py-2 text-soc-muted">{diff.field}</td>
                        <td className="py-2 text-soc-foreground">{JSON.stringify(diff.value_a)}</td>
                        <td
                          className={`py-2 font-bold ${
                            diff.changed ? 'text-amber-600 dark:text-amber-400' : 'text-soc-foreground'
                          }`}
                        >
                          {JSON.stringify(diff.value_b)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-soc-border flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-soc-surface hover:bg-soc-cardHover border border-soc-border text-soc-muted hover:text-soc-foreground text-xs font-semibold transition-colors cursor-pointer"
          >
            Close Timeline
          </button>
        </div>
      </div>
    </div>
  );
};
