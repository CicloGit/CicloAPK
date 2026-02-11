
import React from 'react';

const DNAIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 01-1.414 1.414L12 6.414l-4.293 4.293a1 1 0 01-1.414-1.414l6-6z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.293 10.293a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L6.414 12l4.293 4.293a1 1 0 01-1.414 1.414l-6-6z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.293 20.707a1 1 0 011.414 0l6-6a1 1 0 01-1.414-1.414L12 17.586l-4.293-4.293a1 1 0 01-1.414 1.414l6 6z" />
  </svg>
);

export default DNAIcon;
