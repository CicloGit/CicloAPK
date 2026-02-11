
import React from 'react';

interface LoadingButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  loadingText?: string;
  children: React.ReactNode;
}

const LoadingButton: React.FC<LoadingButtonProps> = ({ loading, loadingText, children, ...props }) => {
  const { className, disabled } = props;

  return (
    <button {...props} disabled={loading || disabled} className={`${className} relative`}>
      <span className={loading ? 'opacity-0' : 'opacity-100 transition-opacity'}>{children}</span>
      {loading && (
        <span className="absolute inset-0 flex items-center justify-center">
          <span className="animate-spin h-5 w-5 border-2 border-current border-t-transparent rounded-full"></span>
          {loadingText && <span className="ml-2">{loadingText}</span>}
        </span>
      )}
    </button>
  );
};

export default LoadingButton;
