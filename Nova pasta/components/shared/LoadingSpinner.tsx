
import React from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ size = 'md', text }) => {
  const sizeClasses = {
    sm: 'h-5 w-5 border-2',
    md: 'h-10 w-10 border-4',
    lg: 'h-16 w-16 border-4',
  };

  return (
    <div className="flex flex-col items-center justify-center p-8 h-full w-full min-h-[200px]">
      <div className={`${sizeClasses[size]} animate-spin rounded-full border-slate-200 border-t-emerald-500 mb-4`}></div>
      {text && <p className="text-slate-500 text-sm font-semibold animate-pulse">{text}</p>}
    </div>
  );
};

export default LoadingSpinner;
