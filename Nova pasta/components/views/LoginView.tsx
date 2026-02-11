import React, { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import TrendingUpIcon from '../icons/TrendingUpIcon';
import { useApp } from '../../contexts/AppContext';
import { User } from '../../types';
import { roleAccessConfig } from '../../config/accessControl';

const LoginView: React.FC = () => {
  const { login, register, isAuthLoading } = useApp();
  const navigate = useNavigate();
  const location = useLocation();

  const [mode, setMode] = useState<'LOGIN' | 'REGISTER'>('LOGIN');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<User['role']>('Produtor');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname || '/';
  const roleOptions = useMemo(() => Object.keys(roleAccessConfig) as User['role'][], []);

  const resetSensitiveState = () => {
    setPassword('');
    setConfirmPassword('');
  };

  const navigateAfterAuth = (user: User) => {
    if (user.role === 'Operador') {
      navigate('/operator-portal', { replace: true });
      return;
    }

    navigate(from, { replace: true });
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      if (mode === 'LOGIN') {
        const user = await login(email.trim(), password);
        navigateAfterAuth(user);
      } else {
        if (!name.trim()) {
          throw new Error('Informe o nome completo.');
        }
        if (password !== confirmPassword) {
          throw new Error('As senhas nao conferem.');
        }

        const user = await register({
          name: name.trim(),
          email: email.trim(),
          password,
          role,
        });
        navigateAfterAuth(user);
      }
    } catch (authError) {
      const message = authError instanceof Error ? authError.message : 'Falha ao autenticar.';
      setError(message);
    } finally {
      resetSensitiveState();
      setIsSubmitting(false);
    }
  };

  const handlePublicAccess = () => {
    navigate('/public-market');
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-200">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-2xl shadow-xl border border-slate-100">
        <div className="text-center">
          <h1 className="text-5xl font-extrabold text-slate-800 tracking-tight">
            Ciclo<span className="text-emerald-500">+</span>
          </h1>
          <p className="mt-3 text-slate-600 font-medium">ERP Agro Inteligente</p>
        </div>

        <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-lg">
          <button
            type="button"
            onClick={() => setMode('LOGIN')}
            className={`px-3 py-2 rounded-md text-sm font-semibold ${
              mode === 'LOGIN' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
            }`}
          >
            Entrar
          </button>
          <button
            type="button"
            onClick={() => setMode('REGISTER')}
            className={`px-3 py-2 rounded-md text-sm font-semibold ${
              mode === 'REGISTER' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
            }`}
          >
            Criar Conta
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'REGISTER' && (
            <>
              <div>
                <label htmlFor="full-name" className="block text-sm font-semibold text-slate-700 mb-1">
                  Nome
                </label>
                <input
                  id="full-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full p-3 border border-slate-300 rounded-md"
                  placeholder="Nome completo"
                  required
                />
              </div>
              <div>
                <label htmlFor="role" className="block text-sm font-semibold text-slate-700 mb-1">
                  Perfil
                </label>
                <select
                  id="role"
                  value={role}
                  onChange={(e) => setRole(e.target.value as User['role'])}
                  className="w-full p-3 border border-slate-300 rounded-md"
                >
                  {roleOptions.map((roleOption) => (
                    <option key={roleOption} value={roleOption}>
                      {roleOption}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-semibold text-slate-700 mb-1">
              E-mail
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-3 border border-slate-300 rounded-md"
              placeholder="voce@dominio.com"
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-semibold text-slate-700 mb-1">
              Senha
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 border border-slate-300 rounded-md"
              placeholder="********"
              required
              minLength={6}
            />
          </div>

          {mode === 'REGISTER' && (
            <div>
              <label htmlFor="confirm-password" className="block text-sm font-semibold text-slate-700 mb-1">
                Confirmar Senha
              </label>
              <input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full p-3 border border-slate-300 rounded-md"
                placeholder="********"
                required
                minLength={6}
              />
            </div>
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={isSubmitting || isAuthLoading}
            className="w-full px-4 py-3 font-semibold text-white bg-slate-700 rounded-lg hover:bg-emerald-600 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting || isAuthLoading
              ? 'Processando...'
              : mode === 'LOGIN'
              ? 'Entrar na Plataforma'
              : 'Criar Conta e Entrar'}
          </button>
        </form>

        <div className="pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={handlePublicAccess}
            className="flex items-center justify-center w-full px-4 py-3 font-semibold text-slate-700 bg-white border-2 border-slate-200 rounded-lg hover:border-emerald-500 hover:text-emerald-600 transition-colors"
          >
            <TrendingUpIcon className="h-5 w-5 mr-2" />
            Acessar Ciclo+ Intelligence (Publico)
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoginView;
