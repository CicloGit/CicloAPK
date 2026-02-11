
import React from 'react';
import { useToast, ToastType } from '../../contexts/ToastContext';
import CheckCircleIcon from '../icons/CheckCircleIcon';
import ExclamationIcon from '../icons/ExclamationIcon';
import XIcon from '../icons/XIcon';

const ToastIcon: React.FC<{ type: ToastType }> = ({ type }) => {
  switch (type) {
    case 'success': return <CheckCircleIcon className="h-6 w-6 text-green-500" />;
    case 'error': return <XIcon className="h-6 w-6 text-red-500" />; // Usando X como ícone de erro por enquanto
    case 'warning': return <ExclamationIcon className="h-6 w-6 text-amber-500" />;
    case 'info': return <div className="h-6 w-6 rounded-full border-2 border-blue-500 flex items-center justify-center text-blue-500 font-bold">i</div>;
  }
};

const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useToast();

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="pointer-events-auto bg-white border-l-4 rounded shadow-lg p-4 flex items-start animate-slide-in transform transition-all duration-300"
          style={{
            borderColor: 
              toast.type === 'success' ? '#10B981' : 
              toast.type === 'error' ? '#EF4444' : 
              toast.type === 'warning' ? '#F59E0B' : '#3B82F6'
          }}
        >
          <div className="flex-shrink-0 mr-3 mt-0.5">
            <ToastIcon type={toast.type} />
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-bold text-slate-800">{toast.title}</h4>
            {toast.message && <p className="text-sm text-slate-600 mt-1">{toast.message}</p>}
          </div>
          <button 
            onClick={() => removeToast(toast.id)}
            className="ml-4 text-slate-400 hover:text-slate-600"
          >
            <span className="text-lg">×</span>
          </button>
        </div>
      ))}
    </div>
  );
};

export default ToastContainer;
