
import React from 'react';
import { User } from '../types';
import { mockUsers } from '../constants';

interface LoginViewProps {
  onLogin: (user: User) => void;
}

const LoginView: React.FC<LoginViewProps> = ({ onLogin }) => {
  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-200">
      <div className="w-full max-w-md p-8 space-y-8 bg-white rounded-2xl shadow-lg text-center">
        <div>
          <h1 className="text-4xl font-bold text-slate-800">Ciclo<span className="text-emerald-500">+</span></h1>
          <p className="mt-2 text-slate-600">Selecione um perfil para acessar o sistema.</p>
        </div>
        
        <div className="space-y-3">
            {mockUsers.map(user => (
                <button
                    key={user.role}
                    onClick={() => onLogin(user)}
                    className="w-full px-4 py-3 font-semibold text-white bg-slate-700 rounded-lg hover:bg-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 transition-all duration-200 ease-in-out transform hover:scale-105"
                >
                    Entrar como {user.role}
                </button>
            ))}
        </div>

        <div className="pt-4 text-xs text-slate-500">
            Este é um protótipo de sistema. A autenticação é simulada.
        </div>
      </div>
    </div>
  );
};

export default LoginView;
