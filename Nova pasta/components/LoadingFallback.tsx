// components/LoadingFallback.tsx
import React from 'react';

/**
 * Componente de loading usado durante lazy loading de componentes
 * Aparece enquanto o código da página está sendo carregado
 */
const LoadingFallback: React.FC = () => {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="text-center">
        {/* Spinner animado */}
        <div className="inline-block">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-t-4 border-blue-600"></div>
        </div>
        
        {/* Texto de carregamento */}
        <p className="mt-4 text-lg font-medium text-slate-700">
          Carregando módulo...
        </p>
        
        {/* Texto opcional */}
        <p className="mt-2 text-sm text-slate-500">
          Preparando a interface
        </p>
      </div>
    </div>
  );
};

export default LoadingFallback;
