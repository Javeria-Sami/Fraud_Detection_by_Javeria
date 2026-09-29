import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertOctagon, RefreshCw, Home, ShieldAlert } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[400px] flex items-center justify-center p-6 animate-in fade-in duration-200">
          <div className="w-full max-w-2xl bg-soc-card border border-rose-500/30 rounded-2xl shadow-2xl p-6 sm:p-8 space-y-6">
            <div className="flex items-start gap-4 pb-4 border-b border-soc-border">
              <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-500 dark:text-rose-400 shrink-0">
                <ShieldAlert className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h2 className="text-lg sm:text-xl font-bold text-soc-foreground tracking-tight flex items-center gap-2">
                  <span>{this.props.fallbackTitle || 'Component Rendering Error'}</span>
                  <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-400 text-[10px] font-mono font-bold uppercase">
                    CAUGHT
                  </span>
                </h2>
                <p className="text-xs text-soc-muted leading-relaxed">
                  An unexpected exception occurred while rendering this SOC interface view. The defense shell prevented a total crash.
                </p>
              </div>
            </div>

            {this.state.error && (
              <div className="space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-soc-muted font-mono">
                  Diagnostic Message
                </span>
                <div className="p-3.5 rounded-xl bg-soc-surface border border-soc-border text-xs font-mono text-rose-400 break-words leading-relaxed overflow-x-auto">
                  {this.state.error.toString()}
                </div>
              </div>
            )}

            {this.state.errorInfo?.componentStack && (
              <details className="group text-xs text-soc-muted">
                <summary className="cursor-pointer font-mono text-[11px] text-soc-muted hover:text-soc-foreground transition-colors select-none">
                  ▶ View Stack Trace Details
                </summary>
                <pre className="mt-2 p-3 rounded-xl bg-slate-950 text-slate-400 font-mono text-[10px] max-h-48 overflow-y-auto leading-relaxed border border-slate-800">
                  {this.state.errorInfo.componentStack}
                </pre>
              </details>
            )}

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                onClick={this.handleReset}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md flex items-center gap-1.5 transition-all"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Retry View</span>
              </button>

              <button
                onClick={this.handleReload}
                className="px-4 py-2 rounded-xl bg-soc-surface hover:bg-soc-cardHover border border-soc-border text-soc-foreground text-xs font-semibold flex items-center gap-1.5 transition-all"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Reload Page</span>
              </button>

              <button
                onClick={this.handleGoHome}
                className="px-4 py-2 rounded-xl bg-soc-surface hover:bg-soc-cardHover border border-soc-border text-soc-muted hover:text-soc-foreground text-xs font-semibold flex items-center gap-1.5 transition-all"
              >
                <Home className="w-3.5 h-3.5" />
                <span>Return to SOC Dashboard</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
