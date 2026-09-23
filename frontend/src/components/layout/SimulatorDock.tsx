import React, { useState, useEffect } from 'react';
import { apiClient } from '../../services/api';
import { Play, Pause, Zap, X, Activity, Gauge, Flame, AlertCircle } from 'lucide-react';

interface SimulatorDockProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SimulatorDock: React.FC<SimulatorDockProps> = ({ isOpen, onClose }) => {
  const [isRunning, setIsRunning] = useState(false);
  const [rate, setRate] = useState<number>(2.0);
  const [scenario, setScenario] = useState<string>('mixed_risk');
  const [anomalyProb, setAnomalyProb] = useState<number>(0.20);
  const [totalEmitted, setTotalEmitted] = useState<number>(0);
  const [isEmittingSingle, setIsEmittingSingle] = useState<boolean>(false);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await apiClient.get('/simulator/status');
        setIsRunning(res.data.is_running);
        setRate(res.data.rate_per_second || 2.0);
        setScenario(res.data.scenario || 'mixed_risk');
        setAnomalyProb(res.data.anomaly_probability || 0.20);
        setTotalEmitted(res.data.total_emitted || 0);
      } catch (e) {
        // ignore
      }
    };
    if (isOpen) {
      fetchStatus();
    }
  }, [isOpen]);

  const handleToggleRunning = async () => {
    try {
      if (!isRunning) {
        const res = await apiClient.post('/simulator/start', {
          is_running: true,
          rate_per_second: rate,
          scenario,
          anomaly_probability: anomalyProb,
        });
        setIsRunning(true);
        if (res.data.status) setTotalEmitted(res.data.status.total_emitted);
      } else {
        await apiClient.post('/simulator/stop');
        setIsRunning(false);
      }
    } catch (err) {
      console.error('Failed to toggle simulator:', err);
    }
  };

  const handleEmitSingle = async (selectedScenario?: string) => {
    setIsEmittingSingle(true);
    try {
      await apiClient.post(`/simulator/emit?scenario=${selectedScenario || scenario}`);
      setTotalEmitted((prev) => prev + 1);
    } catch (err) {
      console.error('Failed to emit single transaction:', err);
    } finally {
      setIsEmittingSingle(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-6 right-6 w-96 bg-soc-card border border-blue-500/40 rounded-2xl shadow-2xl p-5 z-50 backdrop-blur-xl animate-in fade-in slide-in-from-bottom-5 duration-200">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-soc-border pb-3 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-blue-500/20 text-blue-400">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Live Transaction Generator</h4>
            <span className="text-[10px] text-slate-400">Synthetic Ingestion Simulator</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold ${
            isRunning ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-slate-800 text-slate-400'
          }`}>
            {isRunning ? 'EMITTING...' : 'IDLE'}
          </span>
          <button onClick={onClose} className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Controls */}
      <div className="space-y-4">
        {/* Scenario Selector */}
        <div>
          <label className="text-[11px] font-semibold text-slate-300 mb-1.5 block">Traffic / Attack Scenario</label>
          <select
            value={scenario}
            onChange={(e) => setScenario(e.target.value)}
            disabled={isRunning}
            className="w-full bg-soc-bg border border-soc-border rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
          >
            <option value="mixed_risk">Mixed Traffic (Realistic Day)</option>
            <option value="fraud_spike">Fraud Spike (Coordinated Attack)</option>
            <option value="high_amount">High Value Whale Anomaly</option>
            <option value="rapid_burst">Card-Testing Velocity Burst</option>
            <option value="geo_hop">Impossible Geo-Hop (Flight Speed)</option>
            <option value="new_device">Account Takeover / New Device</option>
            <option value="normal">Normal Baseline Only</option>
          </select>
        </div>

        {/* Sliders: Rate & Anomaly Probability */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="flex justify-between text-[11px] text-slate-300 mb-1">
              <span>Velocity</span>
              <span className="font-mono text-blue-400 font-bold">{rate} tx/s</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="15"
              step="0.5"
              value={rate}
              onChange={(e) => setRate(parseFloat(e.target.value))}
              disabled={isRunning}
              className="w-full accent-blue-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
            />
          </div>
          <div>
            <div className="flex justify-between text-[11px] text-slate-300 mb-1">
              <span>Anomaly %</span>
              <span className="font-mono text-rose-400 font-bold">{(anomalyProb * 100).toFixed(0)}%</span>
            </div>
            <input
              type="range"
              min="0.05"
              max="1.0"
              step="0.05"
              value={anomalyProb}
              onChange={(e) => setAnomalyProb(parseFloat(e.target.value))}
              disabled={isRunning}
              className="w-full accent-rose-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-2 flex items-center gap-2">
          <button
            onClick={handleToggleRunning}
            className={`flex-1 py-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-2 shadow-lg transition-all ${
              isRunning
                ? 'bg-amber-600 hover:bg-amber-500 text-white'
                : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-500/25'
            }`}
          >
            {isRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            <span>{isRunning ? 'Pause Stream' : 'Start Live Stream'}</span>
          </button>

          <button
            onClick={() => handleEmitSingle()}
            disabled={isEmittingSingle}
            className="px-3.5 py-2.5 rounded-lg bg-soc-bg border border-soc-border hover:bg-slate-800 text-xs font-semibold text-slate-200 flex items-center gap-1.5 transition-colors"
            title="Inject 1 transaction now"
          >
            <Zap className="w-4 h-4 text-amber-400" />
            <span>Emit 1</span>
          </button>
        </div>

        {/* Quick Attack Presets */}
        <div className="border-t border-soc-border pt-3">
          <div className="text-[10px] uppercase font-bold text-slate-400 mb-2">Instant Threat Injection</div>
          <div className="grid grid-cols-2 gap-1.5">
            <button
              onClick={() => handleEmitSingle('high_amount')}
              className="px-2 py-1.5 bg-soc-bg border border-soc-border hover:border-rose-500/50 rounded text-[11px] text-slate-300 hover:text-rose-300 text-left flex items-center gap-1.5"
            >
              <Flame className="w-3 h-3 text-rose-400" />
              <span>High Whale Txn</span>
            </button>
            <button
              onClick={() => handleEmitSingle('rapid_burst')}
              className="px-2 py-1.5 bg-soc-bg border border-soc-border hover:border-amber-500/50 rounded text-[11px] text-slate-300 hover:text-amber-300 text-left flex items-center gap-1.5"
            >
              <Zap className="w-3 h-3 text-amber-400" />
              <span>Velocity Burst</span>
            </button>
          </div>
        </div>

        {/* Total Emitted Counter */}
        <div className="text-center text-[10px] text-slate-500 font-mono">
          Total Synthetic Generated: <span className="text-slate-300 font-bold">{totalEmitted}</span>
        </div>
      </div>
    </div>
  );
};
