import React, { useEffect, useState } from 'react';

const getInitialOnlineState = (): boolean => {
  if (typeof navigator === 'undefined') {
    return true;
  }

  return navigator.onLine;
};

const OfflineBanner: React.FC = () => {
  const [isOnline, setIsOnline] = useState<boolean>(getInitialOnlineState);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline) {
    return null;
  }

  return (
    <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800 shadow-sm">
      Sem conexao. O app continua operando em modo local e sincroniza quando a internet voltar.
    </div>
  );
};

export default OfflineBanner;
