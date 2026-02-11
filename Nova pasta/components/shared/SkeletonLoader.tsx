
import React from 'react';

const SkeletonLoader: React.FC<{ className?: string, count?: number }> = ({ className, count = 1 }) => {
    return (
        <>
            {Array.from({ length: count }).map((_, index) => (
                 <div key={index} className={`animate-pulse bg-slate-200 rounded-md ${className}`}></div>
            ))}
        </>
    );
};

export default SkeletonLoader;
