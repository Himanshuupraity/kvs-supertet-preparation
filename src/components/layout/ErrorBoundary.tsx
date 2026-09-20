import { Component, type ErrorInfo, type ReactNode } from 'react';

export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  componentDidCatch(error: Error, info: ErrorInfo) { console.error('UI error', error, info); }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="min-h-dvh grid place-items-center p-6 text-center">
        <div className="card p-6 max-w-md">
          <h1 className="text-lg font-bold mb-2">Something went wrong</h1>
          <p className="text-sm text-ink-muted mb-4">{this.state.error.message}</p>
          <button type="button" className="btn-primary" onClick={() => { this.setState({ error: null }); window.location.href = '/'; }}>Go to Home</button>
        </div>
      </div>
    );
  }
}
