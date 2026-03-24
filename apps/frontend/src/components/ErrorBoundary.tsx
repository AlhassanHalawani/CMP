import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error('[ErrorBoundary] Uncaught error:', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
          <div className="border-2 border-border bg-secondary-background p-8 shadow-shadow max-w-md w-full">
            <h2 className="text-xl font-heading font-bold mb-2">Something went wrong</h2>
            <p className="text-sm opacity-70 mb-4">
              {this.state.error?.message ?? 'An unexpected error occurred.'}
            </p>
            <button
              className="border-2 border-border bg-main text-main-foreground px-4 py-2 font-bold shadow-shadow hover:translate-y-0.5 transition-transform"
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.href = '/';
              }}
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

/** Lightweight page-level fallback used inside route error boundaries. */
export function PageError({ message }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 p-16 text-center">
      <p className="text-lg font-bold">Failed to load this page</p>
      <p className="text-sm opacity-60">{message ?? 'Please try refreshing the page.'}</p>
      <button
        className="border-2 border-border bg-main text-main-foreground px-4 py-2 font-bold text-sm shadow-shadow"
        onClick={() => window.location.reload()}
      >
        Retry
      </button>
    </div>
  );
}
