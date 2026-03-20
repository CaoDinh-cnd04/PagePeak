import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = { children: ReactNode };
type State = { error: Error | null };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("App error:", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-6">
          <div className="max-w-lg w-full rounded-2xl border border-red-200 dark:border-red-800 bg-white dark:bg-slate-900 shadow-xl p-6">
            <h1 className="text-lg font-bold text-red-700 dark:text-red-400">Đã xảy ra lỗi</h1>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              {this.state.error.message}
            </p>
            <pre className="mt-4 p-3 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs overflow-auto max-h-40">
              {this.state.error.stack}
            </pre>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-4 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700"
            >
              Tải lại trang
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
