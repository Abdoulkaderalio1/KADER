import React from 'react';
import { ShieldAlert, RotateCcw } from 'lucide-react';

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      message: error.message || 'Une erreur inattendue est survenue.',
    };
  }

  render() {
    if (this.state.hasError) {
      let readable = this.state.message;
      try {
        const parsed = JSON.parse(this.state.message);
        if (parsed.error) {
          readable = `Accès base de données refusé (${parsed.operationType ?? 'lecture'}) : ${parsed.error}`;
        }
      } catch {
        // Keep original message
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-[var(--canvas)] text-[var(--ink)] p-6">
          <div className="max-w-lg w-full bg-[var(--surface)] border border-[var(--border-hairline)] rounded-xl p-8 space-y-5">
            <div className="flex items-center gap-3 text-amber-600 dark:text-amber-400">
              <ShieldAlert className="w-6 h-6 shrink-0" />
              <h2 className="font-display text-2xl font-semibold">Interruption de session</h2>
            </div>
            <p className="text-sm text-[var(--ink-muted)] leading-relaxed">{readable}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-white bg-[var(--accent)] hover:bg-[var(--accent-hover)] transition-colors cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              Recharger l’application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
