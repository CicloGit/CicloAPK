
import React from 'react';

const CurrencyDollarIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v.01M12 16v-1m0-1v.01M12 16c-1.11 0-2.08-.402-2.599-1M12 16H9.5M12 8H9.5m3.5 12a9 9 0 110-18 9 9 0 010 18z" />
  </svg>
);

export default CurrencyDollarIcon;
