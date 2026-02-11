
import React from 'react';

interface ModuleViewProps {
  title: string;
  features: string[];
}

const FeatureIcon: React.FC = () => (
    <svg className="h-5 w-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

const ModuleView: React.FC<ModuleViewProps> = ({ title, features }) => {
  return (
    <div>
      <h2 className="text-3xl font-bold text-slate-800 mb-2">{title}</h2>
      <p className="text-slate-600 mb-8">Funcionalidades disponíveis neste módulo.</p>
      
      <div className="bg-white rounded-lg shadow-md p-6">
        <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-4">
          {features.map((feature, index) => (
            <li key={index} className="flex items-start">
              <div className="flex-shrink-0 mt-1">
                <FeatureIcon />
              </div>
              <span className="ml-3 text-sm text-slate-700">{feature}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default ModuleView;
