import React, { useState } from 'react';
import { AdminFraudRule, RuleSimulationResult } from '../../types';
import { adminApi, SimulateRulePayload } from '../../services/adminApi';
import {
  Play,
  X,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Clock,
  Sparkles,
  Zap,
} from 'lucide-react';

interface RuleSimulatorModalProps {
  rule: AdminFraudRule;
  onClose: () => void;
}

const PRESET_TRANSACTIONS: { label: string; data: Record<string, any> }[] = [
  {
    label: 'High-Value Crypto Outlier ($25,000)',
    data: {
      id: 'SIM-TXN-CRYPTO-99',
      amount: 25000.0,
      currency: 'USD',
      user_id: 'USR-CUST-1001',
      merchant_name: 'Binance Global Hub',
      merchant_category: 'crypto_exchange',
      payment_method: 'credit_card',
      device_id: 'DEV-SIM-FOREIGN-01',
      city: 'Unknown Overseas',
      country: 'KY',
      failed_attempts: 4,
    },
  },
  {
    label: 'Normal Domestic Micro-Payment ($45.50)',
    data: {
      id: 'SIM-TXN-NORMAL-01',
      amount: 45.5,
      currency: 'USD',
      user_id: 'USR-CUST-1001',
      merchant_name: 'Local Supermarket',
      merchant_category: 'grocery',
      payment_method: 'debit_card',
      device_id: 'DEV-KNOWN-01',
      city: 'New York',
      country: 'US',
      failed_attempts: 0,
    },
  },
  {
    label: 'Night-Time Velocity Spike ($3,200, 3 failed)',
    data: {
      id: 'SIM-TXN-NIGHT-03',
      amount: 3200.0,
      currency: 'USD',
      user_id: 'USR-CUST-1002',
      merchant_name: 'Luxury Watch Boutique',
      merchant_category: 'luxury_goods',
      payment_method: 'wire_transfer',
      device_id: 'DEV-SIM-UNKNOWN-02',
      city: 'Las Vegas',
      country: 'US',
      failed_attempts: 3,
    },
  },
];

export const RuleSimulatorModal: React.FC<RuleSimulatorModalProps> = ({
  rule,
  onClose,
}) => {
  const [selectedPreset, setSelectedPreset] = useState<number>(0);
  const [txnInput, setTxnInput] = useState<Record<string, any>>({ ...PRESET_TRANSACTIONS[0].data });
  const [simulationResult, setSimulationResult] = useState<RuleSimulationResult | null>(null);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handlePresetSelect = (idx: number) => {
    setSelectedPreset(idx);
    setTxnInput({ ...PRESET_TRANSACTIONS[idx].data });
    setSimulationResult(null);
  };

  const handleFieldChange = (key: string, val: any) => {
    setTxnInput((prev) => ({ ...prev, [key]: val }));
    setSimulationResult(null);
  };

  const handleRunSimulation = async () => {
    setIsSimulating(true);
    setErrorMessage(null);

    try {
      const payload: SimulateRulePayload = {
        rule_code: rule.rule_code,
        configuration: rule.condition_config || {},
        weight: rule.weight,
        severity: rule.severity,
        transaction_data: txnInput,
      };

      const result = await adminApi.simulateRule(rule.id, payload);
      setSimulationResult(result);
    } catch (err: any) {
      setErrorMessage(err.response?.data?.detail || 'Failed to execute dry-run simulation.');
    } finally {
      setIsSimulating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-3xl w-full p-6 shadow-2xl space-y-5 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center border-b border-slate-800 pb-3">
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Safe Rule Simulation Bench</span>
            </h3>
            <span className="text-xs text-slate-400">
              Testing <strong className="text-white">{rule.name}</strong> ({rule.rule_code}) in isolated sandbox
            </span>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Safety Disclaimer */}
        <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl text-xs text-blue-400 flex items-center gap-2">
          <Zap className="w-4 h-4 flex-shrink-0" />
          <span>
            <strong>Zero Side-Effect Guarantee:</strong> Simulation runs purely in-memory. No production executions, transactions, or alerts will be written.
          </span>
        </div>

        <div className="flex-1 overflow-y-auto space-y-5 pr-1">
          {/* Preset Selector */}
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-2">
              Select Synthetic Transaction Scenario
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {PRESET_TRANSACTIONS.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handlePresetSelect(idx)}
                  className={`p-3 rounded-xl border text-left text-xs transition-all ${
                    selectedPreset === idx
                      ? 'bg-blue-600/20 border-blue-500 text-white font-semibold shadow-sm'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                  }`}
                >
                  <div className="line-clamp-2">{preset.label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Transaction Parameters Sandbox */}
          <div className="bg-slate-950/60 border border-slate-800/80 p-4 rounded-xl space-y-3">
            <div className="text-xs font-semibold text-slate-300 border-b border-slate-800 pb-2">
              Customizable Transaction Fields
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] font-medium text-slate-400 block mb-1">
                  Amount ($)
                </label>
                <input
                  type="number"
                  value={txnInput.amount || 0}
                  onChange={(e) => handleFieldChange('amount', parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                />
              </div>

              <div>
                <label className="text-[11px] font-medium text-slate-400 block mb-1">
                  Failed Attempts
                </label>
                <input
                  type="number"
                  value={txnInput.failed_attempts || 0}
                  onChange={(e) => handleFieldChange('failed_attempts', parseInt(e.target.value, 10) || 0)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                />
              </div>

              <div>
                <label className="text-[11px] font-medium text-slate-400 block mb-1">
                  Merchant Category
                </label>
                <input
                  type="text"
                  value={txnInput.merchant_category || ''}
                  onChange={(e) => handleFieldChange('merchant_category', e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                />
              </div>
            </div>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Simulation Output Card */}
          {simulationResult && (
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-4 animate-in fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                <div className="flex items-center gap-3">
                  <div
                    className={`p-3 rounded-xl border ${
                      simulationResult.triggered
                        ? 'bg-rose-500/15 border-rose-500/30 text-rose-400'
                        : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                    }`}
                  >
                    {simulationResult.triggered ? (
                      <Flame className="w-6 h-6" />
                    ) : (
                      <CheckCircle2 className="w-6 h-6" />
                    )}
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Simulation Verdict
                    </div>
                    <div className="text-lg font-bold text-white flex items-center gap-2">
                      <span>{simulationResult.triggered ? 'RULE TRIGGERED' : 'RULE PASSED (NOT TRIGGERED)'}</span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded font-mono ${
                          simulationResult.triggered
                            ? 'bg-rose-500/20 text-rose-300'
                            : 'bg-emerald-500/20 text-emerald-300'
                        }`}
                      >
                        +{simulationResult.score} pts
                      </span>
                    </div>
                  </div>
                </div>

                <div className="text-xs text-slate-400 flex items-center gap-1 font-mono">
                  <Clock className="w-3.5 h-3.5 text-slate-500" />
                  <span>{simulationResult.execution_time_ms} ms</span>
                </div>
              </div>

              {/* Natural Language Reason */}
              <div>
                <div className="text-xs font-semibold text-slate-400 mb-1">Evaluation Explanation:</div>
                <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-200">
                  {simulationResult.explanation}
                </div>
              </div>

              {/* Feature Values Snapshot */}
              {simulationResult.matched_features && Object.keys(simulationResult.matched_features).length > 0 && (
                <div>
                  <div className="text-xs font-semibold text-slate-400 mb-1.5">
                    Evaluated Feature Variables:
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 font-mono text-xs">
                    {Object.entries(simulationResult.matched_features).map(([k, v]) => (
                      <div key={k} className="p-2 bg-slate-900/80 border border-slate-800/80 rounded-lg">
                        <span className="text-slate-500 block text-[10px]">{k}</span>
                        <span className="text-white font-bold">{String(v)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
          >
            Close Sandbox
          </button>
          <button
            type="button"
            onClick={handleRunSimulation}
            disabled={isSimulating}
            className="px-5 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-amber-500/20 disabled:opacity-50 transition-all"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>{isSimulating ? 'Evaluating...' : 'Run Simulation'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
