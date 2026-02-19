import React, { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import TrendingUpIcon from '../icons/TrendingUpIcon';
import { useApp } from '../../contexts/AppContext';
import { AccessProfileType, CouncilType, User } from '../../types';
import {
  ACCESS_PROFILE_DEFINITIONS,
  ACCESS_PROFILE_OPTIONS,
  SYSTEM_MANAGER_LOGIN,
  SYSTEM_MANAGER_PASSWORD,
} from '../../lib/profileAuth';

const DEFAULT_PROFILE: AccessProfileType = 'PRODUTOR';
const PROFILE_ENTRY_ROUTE: Record<AccessProfileType, string> = {
  PRODUTOR: '/dashboard',
  EMPRESA_FORNECEDORA: '/supplier-portal',
  EMPRESA_INTEGRADORA: '/integrator-portal',
  OPERADOR: '/operator-portal',
  TECNICO: '/technician-portal',
  GESTOR: '/dashboard',
};

const LoginView: React.FC = () => {
  const { login, register, isAuthLoading } = useApp();
  const navigate = useNavigate();
  const location = useLocation();

  const [mode, setMode] = useState<'LOGIN' | 'REGISTER'>('LOGIN');
  const [profileType, setProfileType] = useState<AccessProfileType>(DEFAULT_PROFILE);
  const [name, setName] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [stateRegistration, setStateRegistration] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [councilType, setCouncilType] = useState<CouncilType | ''>('');
  const [councilNumber, setCouncilNumber] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname || '/';
  const profile = useMemo(() => ACCESS_PROFILE_DEFINITIONS[profileType], [profileType]);
  const canRegister = profileType !== 'GESTOR';

  const resetSensitiveState = () => {
    setPassword('');
    setConfirmPassword('');
  };

  const resetProfileDependentState = () => {
    setIdentifier('');
    setStateRegistration('');
    setSpecialty('');
    setCouncilType('');
    setCouncilNumber('');
    setError(null);
  };

  const navigateAfterAuth = (user: User, selectedProfileType: AccessProfileType, usingSystemManagerMaster: boolean) => {
    if (usingSystemManagerMaster) {
      navigate(PROFILE_ENTRY_ROUTE[selectedProfileType], { replace: true });
      return;
    }

    if (user.role === 'Operador') {
      navigate('/operator-portal', { replace: true });
      return;
    }

    const safeTarget = from === '/login' ? '/' : from;
    navigate(safeTarget, { replace: true });
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      if (!identifier.trim()) {
        throw new Error(`${profile.identifierLabel} obrigatorio.`);
      }

      if (mode === 'LOGIN') {
        const usingSystemManagerMaster =
          identifier.trim().toLowerCase() === SYSTEM_MANAGER_LOGIN && password === SYSTEM_MANAGER_PASSWORD;
        const user = await login({
          profileType,
          identifier: identifier.trim(),
          password,
        });
        navigateAfterAuth(user, profileType, usingSystemManagerMaster);
      } else {
        if (!canRegister) {
          throw new Error('Perfil Gestor usa apenas login padrao do sistema.');
        }
        if (!name.trim()) {
          throw new Error(`Informe ${profile.nameLabel.toLowerCase()}.`);
        }
        if (password !== confirmPassword) {
          throw new Error('As senhas nao conferem.');
        }

        const user = await register({
          profileType,
          name: name.trim(),
          identifier: identifier.trim(),
          stateRegistration: stateRegistration.trim(),
          specialty: specialty.trim(),
          councilType,
          councilNumber: councilNumber.trim(),
          password,
        });
        navigateAfterAuth(user, profileType, false);
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

        <div className="space-y-2">
          <label htmlFor="profile-type" className="block text-sm font-semibold text-slate-700">
            Perfil de acesso
          </label>
          <select
            id="profile-type"
            value={profileType}
            onChange={(event) => {
              const nextProfileType = event.target.value as AccessProfileType;
              setProfileType(nextProfileType);
              resetProfileDependentState();
              if (nextProfileType === 'GESTOR') {
                setMode('LOGIN');
                setIdentifier(SYSTEM_MANAGER_LOGIN);
              }
            }}
            className="w-full p-3 border border-slate-300 rounded-md"
          >
            {ACCESS_PROFILE_OPTIONS.map((option) => (
              <option key={option.profileType} value={option.profileType}>
                {option.label}
              </option>
            ))}
          </select>
          {profileType === 'GESTOR' && (
            <p className="text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded-md p-2">
              Gestor acessa todos os modulos com dados e funcoes reais usando login do sistema e senha padrao 159375.
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-lg">
          <button
            type="button"
            onClick={() => {
              setMode('LOGIN');
              setError(null);
            }}
            className={`px-3 py-2 rounded-md text-sm font-semibold ${
              mode === 'LOGIN' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
            }`}
          >
            Entrar
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('REGISTER');
              setError(null);
            }}
            disabled={!canRegister}
            className={`px-3 py-2 rounded-md text-sm font-semibold ${
              mode === 'REGISTER' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            Criar Conta
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'REGISTER' && (
            <div>
              <label htmlFor="full-name" className="block text-sm font-semibold text-slate-700 mb-1">
                {profile.nameLabel}
              </label>
              <input
                id="full-name"
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="w-full p-3 border border-slate-300 rounded-md"
                placeholder={profile.namePlaceholder}
                required
              />
            </div>
          )}

          <div>
            <label htmlFor="identifier" className="block text-sm font-semibold text-slate-700 mb-1">
              {profile.identifierLabel}
            </label>
            <input
              id="identifier"
              type="text"
              value={identifier}
              onChange={(event) => setIdentifier(event.target.value)}
              className="w-full p-3 border border-slate-300 rounded-md"
              placeholder={profile.identifierPlaceholder}
              required
            />
          </div>

          {mode === 'REGISTER' && profile.requiresStateRegistration && (
            <div>
              <label htmlFor="state-registration" className="block text-sm font-semibold text-slate-700 mb-1">
                Inscricao Estadual
              </label>
              <input
                id="state-registration"
                type="text"
                value={stateRegistration}
                onChange={(event) => setStateRegistration(event.target.value)}
                className="w-full p-3 border border-slate-300 rounded-md"
                placeholder="Ex.: 123456789 ou ISENTO"
                required
              />
            </div>
          )}

          {mode === 'REGISTER' && profile.requiresSpecialty && (
            <div>
              <label htmlFor="specialty" className="block text-sm font-semibold text-slate-700 mb-1">
                Especialidade
              </label>
              <input
                id="specialty"
                type="text"
                value={specialty}
                onChange={(event) => setSpecialty(event.target.value)}
                className="w-full p-3 border border-slate-300 rounded-md"
                placeholder="Ex.: Sanidade Animal"
                required
              />
            </div>
          )}

          {mode === 'REGISTER' && profile.requiresCouncilData && (
            <>
              <div>
                <label htmlFor="council-type" className="block text-sm font-semibold text-slate-700 mb-1">
                  Conselho Profissional
                </label>
                <select
                  id="council-type"
                  value={councilType}
                  onChange={(event) => setCouncilType(event.target.value as CouncilType)}
                  className="w-full p-3 border border-slate-300 rounded-md"
                  required
                >
                  <option value="" disabled>
                    Selecione o conselho
                  </option>
                  <option value="CRMV">CRMV</option>
                  <option value="CFTA">CFTA</option>
                  <option value="CREA">CREA</option>
                </select>
              </div>
              <div>
                <label htmlFor="council-number" className="block text-sm font-semibold text-slate-700 mb-1">
                  Numero do Conselho
                </label>
                <input
                  id="council-number"
                  type="text"
                  value={councilNumber}
                  onChange={(event) => setCouncilNumber(event.target.value)}
                  className="w-full p-3 border border-slate-300 rounded-md"
                  placeholder="Ex.: CRMV-12345"
                  required
                />
              </div>
            </>
          )}

          <div>
            <label htmlFor="password" className="block text-sm font-semibold text-slate-700 mb-1">
              Senha
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
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
                onChange={(event) => setConfirmPassword(event.target.value)}
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
