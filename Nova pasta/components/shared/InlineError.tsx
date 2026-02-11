
import React from 'react';
import ExclamationCircleIcon from '../icons/ExclamationCircleIcon';

interface InlineErrorProps {
  message?: string | null;
}

const InlineError: React.FC<InlineErrorProps> = ({ message }) => {
  if (!message) return null;

  return (
    <div className="flex items-center text-sm text-red-700 bg-red-50 p-3 rounded-lg mt-2 border border-red-200 animate-fade-in" role="alert">
      <ExclamationCircleIcon className="h-5 w-5 mr-2 flex-shrink-0" />
      <span className="font-semibold">{message}</span>
    </div>
  );
};

export default InlineError;
