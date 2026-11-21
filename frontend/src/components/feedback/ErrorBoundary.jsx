import React, { Component } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import Button from '../common/Button';

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an unhandled error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  handleGoHome = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200/90 p-8 shadow-xl text-center">
            <div className="w-14 h-14 rounded-full bg-rose-50 border border-rose-200 flex items-center justify-center mx-auto mb-4 text-rose-600">
              <AlertTriangle className="w-7 h-7" />
            </div>

            <h2 className="text-xl font-bold text-slate-900 tracking-tight">Something went wrong</h2>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
              An unexpected application error occurred. We have intercepted it to prevent the application from crashing.
            </p>

            {this.state.error && (
              <div className="mt-4 p-3 bg-slate-50 rounded-lg border border-slate-200 text-left overflow-x-auto">
                <code className="text-xs text-rose-600 font-mono block">
                  {this.state.error.toString()}
                </code>
              </div>
            )}

            <div className="mt-6 flex items-center justify-center gap-3">
              <Button variant="outline" size="sm" onClick={this.handleGoHome} leftIcon={Home}>
                Home
              </Button>
              <Button variant="primary" size="sm" onClick={this.handleReset} leftIcon={RefreshCw}>
                Reload Application
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
