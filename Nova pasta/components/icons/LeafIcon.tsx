import React from 'react';

const LeafIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17.063c-2.138-.4-3.98-1.63-5.32-3.233a7.5 7.5 0 1111.96-5.832" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 12a7.5 7.5 0 00-7.5-7.5" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17.063c1.397.74 2.94.94 4.437.54" />
  </svg>
);

export default LeafIcon;
