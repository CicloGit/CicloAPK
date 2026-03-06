import React, { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import FlowIcon from '../icons/FlowIcon';
import { useApp } from '../../contexts/AppContext';
import { ViewType } from '../../types';
import { canAccessView } from '../../config/accessControl';
import {
  getScreenFlowsForRole,
  SCREEN_FLOW_CATALOG,
  SCREEN_FLOW_STAGE_LABEL,
  ScreenFlowDefinition,
} from '../../config/screenFlows';

const renderFlowCard = (
  flow: ScreenFlowDefinition,
  isHighlighted: boolean,
  canAccessStep: (view: ViewType) => boolean
) => (
  <article
    className={`rounded-2xl border bg-white p-5 shadow-sm transition ${
      isHighlighted ? 'border-emerald-300 shadow-emerald-100' : 'border-slate-200'
    }`}
    key={flow.id}
  >
    <div className="mb-4 flex flex-wrap items-center gap-2">
      <span className="rounded-md bg-slate-100 px-2 py-1 text-[10px] font-bold tracking-[0.12em] text-slate-600">
        {flow.id}
      </span>
      <h3 className="text-base font-bold text-slate-900">{flow.title}</h3>
    </div>
    <p className="mb-4 text-sm text-slate-600">{flow.summary}</p>
    <div className="mb-4 text-[11px] text-slate-500">
      Perfis: <span className="font-semibold text-slate-700">{flow.roles.join(', ')}</span>
    </div>
    <ol className="space-y-2">
      {flow.steps.map((step, index) => {
        const stepContent = (
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-emerald-700">
              {SCREEN_FLOW_STAGE_LABEL[step.stage]}
            </p>
            <p className="text-sm font-semibold text-slate-800">{step.title}</p>
            <p className="text-xs text-slate-500">{step.description}</p>
            {step.requiredEvidence.length > 0 && (
              <p className="mt-1 text-[11px] text-slate-500">
                Evidencias: <span className="font-semibold text-slate-700">{step.requiredEvidence.join(', ')}</span>
              </p>
            )}
          </div>
        );

        return (
          <li className="flex gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2" key={step.id}>
            <span className="inline-flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-emerald-600 text-xs font-bold text-white">
              {index + 1}
            </span>
            {step.view === 'accountControl' || !canAccessStep(step.view) ? (
              stepContent
            ) : (
              <Link className="min-w-0 transition hover:text-emerald-700" to={step.path}>
                {stepContent}
              </Link>
            )}
          </li>
        );
      })}
    </ol>
  </article>
);

const ScreenFlowsView: React.FC = () => {
  const { currentUser } = useApp();
  const navigate = useNavigate();

  const roleFlows = useMemo(() => getScreenFlowsForRole(currentUser?.role), [currentUser?.role]);
  const highlightedIds = useMemo(() => new Set(roleFlows.map((flow) => flow.id)), [roleFlows]);
  const canAccessStep = (view: ViewType) => Boolean(currentUser && canAccessView(currentUser, view));

  return (
    <div className="mx-auto max-w-7xl pb-10">
      <header className="mb-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <FlowIcon className="h-8 w-8 text-emerald-600" />
          <h2 className="text-2xl font-bold text-slate-900">Fluxos de Telas do Sistema</h2>
          <button
            className="ml-auto rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
            onClick={() => {
              if (typeof window !== 'undefined' && window.history.length > 1) {
                navigate(-1);
                return;
              }
              navigate('/dashboard');
            }}
            type="button"
          >
            Voltar tela anterior
          </button>
        </div>
        <p className="mt-3 max-w-4xl text-sm text-slate-600">
          Todos os lancamentos e funcoes devem seguir estes fluxos de telas para manter padrao operacional, emissao
          fiscal correta, aplicacao de SROW/escrow e auditoria digital.
        </p>
        <p className="mt-2 text-xs text-slate-500">
          Perfil ativo: <span className="font-semibold text-slate-700">{currentUser?.role ?? 'Nao autenticado'}</span>
        </p>
      </header>

      <section className="mb-8">
        <h3 className="mb-3 text-lg font-bold text-slate-900">Fluxos ativos para o seu perfil</h3>
        {roleFlows.length === 0 ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            Nenhum fluxo de tela foi mapeado para este perfil.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            {roleFlows.map((flow) => renderFlowCard(flow, true, canAccessStep))}
          </div>
        )}
      </section>

      <section>
        <h3 className="mb-3 text-lg font-bold text-slate-900">Catalogo completo de fluxos</h3>
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {SCREEN_FLOW_CATALOG.map((flow) => renderFlowCard(flow, highlightedIds.has(flow.id), canAccessStep))}
        </div>
      </section>
    </div>
  );
};

export default ScreenFlowsView;
