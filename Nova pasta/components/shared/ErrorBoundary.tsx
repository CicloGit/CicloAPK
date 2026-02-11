
import React, { Component, ErrorInfo, ReactNode } from 'react';
import ExclamationIcon from '../icons/ExclamationIcon';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  // FIX: Refactored to use a constructor to initialize state. This resolves issues where class property initializers might not be correctly handled by the build setup, causing 'this.props' to be unavailable.
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: undefined };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="flex flex-col items-center justify-center h-full min-h-[400px] p-8 bg-slate-50 rounded-lg border border-slate-200 text-center">
          <div className="bg-red-100 p-4 rounded-full mb-4">
            <ExclamationIcon className="h-10 w-10 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Algo deu errado</h2>
          <p className="text-slate-600 mb-6 max-w-md">
            Ocorreu um erro inesperado ao carregar este módulo. Tente recarregar a página.
          </p>
          <div className="bg-white p-4 rounded border border-slate-200 mb-6 w-full max-w-lg overflow-auto">
             <code className="text-xs text-red-500 font-mono text-left block">
                {this.state.error?.message}
             </code>
          </div>
          <button 
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 transition-colors shadow-md"
          >
            Recarregar Aplicação
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
