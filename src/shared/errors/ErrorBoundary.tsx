import { Component, type ErrorInfo, type ReactNode } from 'react';

import { CrashScreen } from './CrashScreen';
import { recordError, useErrorReports } from './errorReports';

/**
 * The app's error boundary (M89): a render error anywhere is saved and sent, and Something went wrong takes the app's
 * place. A fatal error from the global handler (captureErrors.ts) shows the same screen through `crashed`.
 */
export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    useErrorReports.setState({ crashed: recordError(error, 'render', true, info.componentStack ?? undefined) });
  }

  render() {
    return this.state.failed ? <CrashScreen /> : <CrashGate>{this.props.children}</CrashGate>;
  }
}

/** Shows Something went wrong after a fatal error outside rendering (an event handler, a timer). */
function CrashGate({ children }: { children: ReactNode }) {
  const crashed = useErrorReports((s) => s.crashed);
  return crashed ? <CrashScreen /> : children;
}
