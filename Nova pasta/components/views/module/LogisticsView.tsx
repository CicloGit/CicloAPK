import React, { useEffect, useMemo, useState } from 'react';
import LoadingSpinner from '../../shared/LoadingSpinner';
import {
  logisticsService,
  recommendTransportMode,
  SHORT_DISTANCE_ELECTRIC_LIMIT_KM,
} from '../../../services/logisticsService';
import { LogisticsEntry, LogisticsStatus, LogisticsTransportMode } from '../../../types';
import { useApp } from '../../../contexts/AppContext';

const STATUS_BADGE: Record<LogisticsStatus, string> = {
  SOLICITADO: 'bg-yellow-100 text-yellow-800',
  ACEITO: 'bg-blue-100 text-blue-800',
  CARREGAMENTO_AUTORIZADO: 'bg-indigo-100 text-indigo-800',
  EM_TRANSITO: 'bg-violet-100 text-violet-800',
  AGUARDANDO_DESCARGA: 'bg-amber-100 text-amber-800',
  DESCARGA_AUTORIZADA: 'bg-teal-100 text-teal-800',
  FINALIZADO: 'bg-emerald-100 text-emerald-800',
  CANCELADO: 'bg-slate-100 text-slate-700',
};

const statusLabel = (status: LogisticsStatus): string =>
  status.replace(/_/g, ' ');

const MODE_LABEL: Record<LogisticsTransportMode, string> = {
  ELETRICO: 'Veiculo eletrico',
  COMBUSTAO: 'Veiculo a combustao',
  FERROVIA: 'Ferrovia',
};

const MODE_BADGE: Record<LogisticsTransportMode, string> = {
  ELETRICO: 'bg-emerald-100 text-emerald-800',
  COMBUSTAO: 'bg-orange-100 text-orange-800',
  FERROVIA: 'bg-cyan-100 text-cyan-800',
};

const haulLabel = (distanceKm: number | undefined): string => {
  if (typeof distanceKm !== 'number') {
    return '-';
  }
  return distanceKm <= SHORT_DISTANCE_ELECTRIC_LIMIT_KM ? 'Curta distancia' : 'Longa distancia';
};

const LogisticsView: React.FC = () => {
  const { currentUser } = useApp();
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [entries, setEntries] = useState<LogisticsEntry[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  const [evidenceById, setEvidenceById] = useState<Record<string, string>>({});
  const [locationById, setLocationById] = useState<Record<string, string>>({});
  const [driverById, setDriverById] = useState<Record<string, string>>({});
  const [plateById, setPlateById] = useState<Record<string, string>>({});
  const [carrierById, setCarrierById] = useState<Record<string, string>>({});
  const [transportModeById, setTransportModeById] = useState<Record<string, LogisticsTransportMode>>({});
  const [requestForm, setRequestForm] = useState({
    type: 'Coleta' as LogisticsEntry['type'],
    description: '',
    origin: '',
    destination: '',
    distanceKm: '',
    railAvailable: false,
    evidenceReference: '',
    openForMarketplace: true,
  });

  const actor = currentUser?.name ? `${currentUser.name} (${currentUser.role})` : 'Operador Logistico';

  const loadEntries = async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const rows = await logisticsService.listEntries();
      setEntries(rows);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Nao foi possivel carregar o portal logistico.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadEntries();
  }, []);

  const pendingCount = useMemo(
    () =>
      entries.filter((entry) =>
        entry.status === 'SOLICITADO' ||
        entry.status === 'ACEITO' ||
        entry.status === 'CARREGAMENTO_AUTORIZADO' ||
        entry.status === 'EM_TRANSITO' ||
        entry.status === 'AGUARDANDO_DESCARGA' ||
        entry.status === 'DESCARGA_AUTORIZADA'
      ).length,
    [entries]
  );

  const electricPriorityCount = useMemo(
    () => entries.filter((entry) => entry.recommendedTransportMode === 'ELETRICO').length,
    [entries]
  );

  const longDistanceCount = useMemo(
    () =>
      entries.filter(
        (entry) =>
          typeof entry.distanceKm === 'number' && entry.distanceKm > SHORT_DISTANCE_ELECTRIC_LIMIT_KM
      ).length,
    [entries]
  );

  const requestDistanceKm = Number(requestForm.distanceKm);
  const requestRecommendation = useMemo(() => {
    if (!Number.isFinite(requestDistanceKm) || requestDistanceKm <= 0) {
      return null;
    }
    return recommendTransportMode(requestDistanceKm, requestForm.railAvailable);
  }, [requestDistanceKm, requestForm.railAvailable]);

  const runAction = async (entryId: string, callback: () => Promise<unknown>, successMessage: string) => {
    setActionError(null);
    setActionMessage(null);
    setIsUpdating(entryId);
    try {
      await callback();
      setActionMessage(successMessage);
      await loadEntries();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Nao foi possivel atualizar a solicitacao.');
    } finally {
      setIsUpdating(null);
    }
  };

  const handleCreateRequest = async (event: React.FormEvent) => {
    event.preventDefault();
    setActionError(null);
    setActionMessage(null);
    setIsSubmitting(true);
    try {
      const recommendation =
        requestRecommendation ??
        recommendTransportMode(requestDistanceKm, requestForm.railAvailable);

      await logisticsService.createRequest({
        actor,
        type: requestForm.type,
        description: requestForm.description,
        origin: requestForm.origin,
        destination: requestForm.destination,
        distanceKm: requestDistanceKm,
        railAvailable: requestForm.railAvailable,
        openForMarketplace: requestForm.openForMarketplace,
        evidenceReference: requestForm.evidenceReference || undefined,
      });
      setRequestForm({
        type: 'Coleta',
        description: '',
        origin: '',
        destination: '',
        distanceKm: '',
        railAvailable: false,
        evidenceReference: '',
        openForMarketplace: true,
      });
      setActionMessage(
        `Solicitacao registrada. Modal prioritario: ${MODE_LABEL[recommendation.recommendedMode]}.`
      );
      await loadEntries();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Nao foi possivel criar solicitacao.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <LoadingSpinner text="Carregando portal logistico..." />;
  }

  if (loadError) {
    return <div className="p-6 bg-red-50 text-red-700 border border-red-200 rounded-lg">{loadError}</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-slate-800 mb-2">Portal Logistico</h2>
        <p className="text-slate-600">
          Solicitacoes de coleta/transporte com rastreio, autorizacao de carga/descarga e politica
          automatica de modal por distancia.
        </p>
      </div>

      <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
        Regra ativa: ate {SHORT_DISTANCE_ELECTRIC_LIMIT_KM} km prioriza veiculo eletrico. Acima de{' '}
        {SHORT_DISTANCE_ELECTRIC_LIMIT_KM} km prioriza combustao ou ferrovia.
      </div>

      {actionError && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{actionError}</div>}
      {actionMessage && <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{actionMessage}</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase text-slate-500 font-bold">Solicitacoes em andamento</p>
          <p className="text-3xl font-bold text-slate-800">{pendingCount}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase text-slate-500 font-bold">Transportes finalizados</p>
          <p className="text-3xl font-bold text-slate-800">{entries.filter((entry) => entry.status === 'FINALIZADO').length}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase text-slate-500 font-bold">Abertas no mercado</p>
          <p className="text-3xl font-bold text-slate-800">
            {entries.filter((entry) => entry.status === 'SOLICITADO' && entry.openForMarketplace).length}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase text-slate-500 font-bold">Prioridade eletrica</p>
          <p className="text-3xl font-bold text-slate-800">{electricPriorityCount}</p>
          <p className="text-xs text-slate-500 mt-1">rotas curtas</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase text-slate-500 font-bold">Rotas longas</p>
          <p className="text-3xl font-bold text-slate-800">{longDistanceCount}</p>
          <p className="text-xs text-slate-500 mt-1">&gt; {SHORT_DISTANCE_ELECTRIC_LIMIT_KM} km</p>
        </div>
      </div>

      <form onSubmit={handleCreateRequest} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
        <h3 className="text-lg font-bold text-slate-800">Nova solicitacao de coleta/transporte</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          <select
            className="p-2 border rounded bg-white"
            value={requestForm.type}
            onChange={(event) => setRequestForm((prev) => ({ ...prev, type: event.target.value as LogisticsEntry['type'] }))}
          >
            <option value="Coleta">Coleta</option>
            <option value="Entrega">Entrega</option>
            <option value="Transferencia">Transferencia</option>
          </select>
          <input
            className="p-2 border rounded"
            placeholder="Origem"
            value={requestForm.origin}
            onChange={(event) => setRequestForm((prev) => ({ ...prev, origin: event.target.value }))}
          />
          <input
            className="p-2 border rounded"
            placeholder="Destino"
            value={requestForm.destination}
            onChange={(event) => setRequestForm((prev) => ({ ...prev, destination: event.target.value }))}
          />
          <input
            type="number"
            min={1}
            step={0.1}
            className="p-2 border rounded"
            placeholder="Distancia estimada (km)"
            value={requestForm.distanceKm}
            onChange={(event) => setRequestForm((prev) => ({ ...prev, distanceKm: event.target.value }))}
            required
          />
          <input
            className="p-2 border rounded lg:col-span-2"
            placeholder="Descricao da carga/rota"
            value={requestForm.description}
            onChange={(event) => setRequestForm((prev) => ({ ...prev, description: event.target.value }))}
          />
          <input
            className="p-2 border rounded"
            placeholder="Evidencia inicial (opcional)"
            value={requestForm.evidenceReference}
            onChange={(event) => setRequestForm((prev) => ({ ...prev, evidenceReference: event.target.value }))}
          />
          <label className="inline-flex items-center gap-2 rounded border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={requestForm.railAvailable}
              onChange={(event) => setRequestForm((prev) => ({ ...prev, railAvailable: event.target.checked }))}
            />
            Ferrovia disponivel para esta rota
          </label>
        </div>
        <label className="inline-flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={requestForm.openForMarketplace}
            onChange={(event) => setRequestForm((prev) => ({ ...prev, openForMarketplace: event.target.checked }))}
          />
          Disponibilizar solicitacao para frotistas/freteiros no mercado aberto
        </label>
        {requestRecommendation && (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
            Recomendacao automatica: <strong>{MODE_LABEL[requestRecommendation.recommendedMode]}</strong> |{' '}
            perfil: {requestRecommendation.haulProfile === 'CURTA_DISTANCIA' ? 'curta distancia' : 'longa distancia'}
          </div>
        )}
        <div>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-2 rounded-md bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-60"
          >
            {isSubmitting ? 'Registrando...' : 'Registrar solicitacao'}
          </button>
        </div>
      </form>

      <div className="space-y-4">
        {entries.length === 0 && (
          <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
            Nenhuma solicitacao logistica encontrada.
          </div>
        )}
        {entries.map((entry) => {
          const evidence = evidenceById[entry.id] ?? '';
          const currentLocation = locationById[entry.id] ?? '';
          const driver = driverById[entry.id] ?? entry.driver ?? '';
          const plate = plateById[entry.id] ?? entry.plate ?? '';
          const carrierName = carrierById[entry.id] ?? entry.carrierName ?? '';
          const busy = isUpdating === entry.id;
          const entryRecommendation =
            typeof entry.distanceKm === 'number' && entry.distanceKm > 0
              ? recommendTransportMode(entry.distanceKm, entry.railAvailable === true)
              : null;
          const modeOptions: LogisticsTransportMode[] = entryRecommendation?.allowedModes ?? [
            'ELETRICO',
            'COMBUSTAO',
            'FERROVIA',
          ];
          const selectedTransportMode =
            transportModeById[entry.id] ??
            entry.selectedTransportMode ??
            entryRecommendation?.recommendedMode ??
            'COMBUSTAO';

          return (
            <div key={entry.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
                <div>
                  <p className="text-xs text-slate-500 font-mono">{entry.id}</p>
                  <h4 className="text-lg font-bold text-slate-800">{entry.description}</h4>
                  <p className="text-sm text-slate-600">{`${entry.origin} -> ${entry.destination}`}</p>
                  <p className="text-xs text-slate-500 mt-1">
                    solicitante: {entry.requestorName ?? '-'} | transportador: {entry.carrierName ?? '-'}
                  </p>
                </div>
                <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${STATUS_BADGE[entry.status]}`}>
                  {statusLabel(entry.status)}
                </span>
              </div>

              <div className="mt-3 text-xs text-slate-600 space-y-1">
                <p>rastreio: {entry.trackingCode ?? '-'} | local atual: {entry.currentLocation ?? '-'}</p>
                <p>carregamento autorizado: {entry.loadAuthorizedAt ?? '-'} | descarga autorizada: {entry.unloadAuthorizedAt ?? '-'}</p>
                <p>
                  distancia: {typeof entry.distanceKm === 'number' ? `${entry.distanceKm} km` : '-'} | perfil:{' '}
                  {haulLabel(entry.distanceKm)} | ferrovia:{' '}
                  {entry.railAvailable === true ? 'disponivel' : 'indisponivel'}
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[11px] text-slate-500">modal recomendado:</span>
                  <span
                    className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                      MODE_BADGE[entryRecommendation?.recommendedMode ?? entry.recommendedTransportMode ?? 'COMBUSTAO']
                    }`}
                  >
                    {MODE_LABEL[entryRecommendation?.recommendedMode ?? entry.recommendedTransportMode ?? 'COMBUSTAO']}
                  </span>
                  <span className="text-[11px] text-slate-500">modal selecionado:</span>
                  <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${MODE_BADGE[selectedTransportMode]}`}>
                    {MODE_LABEL[selectedTransportMode]}
                  </span>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
                <input
                  className="p-2 border rounded"
                  placeholder="Evidencia (QR/foto/video/hash)"
                  value={evidence}
                  onChange={(event) => setEvidenceById((prev) => ({ ...prev, [entry.id]: event.target.value }))}
                />
                <input
                  className="p-2 border rounded"
                  placeholder="Local atual"
                  value={currentLocation}
                  onChange={(event) => setLocationById((prev) => ({ ...prev, [entry.id]: event.target.value }))}
                />
                <input
                  className="p-2 border rounded"
                  placeholder="Motorista"
                  value={driver}
                  onChange={(event) => setDriverById((prev) => ({ ...prev, [entry.id]: event.target.value }))}
                />
                <input
                  className="p-2 border rounded"
                  placeholder="Placa"
                  value={plate}
                  onChange={(event) => setPlateById((prev) => ({ ...prev, [entry.id]: event.target.value }))}
                />
              </div>
              <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2">
                <input
                  className="p-2 border rounded"
                  placeholder="Nome transportador/freteiro"
                  value={carrierName}
                  onChange={(event) => setCarrierById((prev) => ({ ...prev, [entry.id]: event.target.value }))}
                />
                <select
                  className="p-2 border rounded bg-white"
                  value={selectedTransportMode}
                  disabled={entry.status !== 'SOLICITADO'}
                  onChange={(event) =>
                    setTransportModeById((prev) => ({
                      ...prev,
                      [entry.id]: event.target.value as LogisticsTransportMode,
                    }))
                  }
                >
                  {modeOptions.map((mode) => (
                    <option key={mode} value={mode}>
                      {MODE_LABEL[mode]}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {entry.status === 'SOLICITADO' && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      void runAction(
                        entry.id,
                        () =>
                          logisticsService.acceptRequest({
                            entryId: entry.id,
                            actor,
                            carrierName: carrierName || actor,
                            driver,
                            plate,
                            evidenceReference: evidence,
                            selectedTransportMode,
                          }),
                        `Solicitacao aceita com modal ${MODE_LABEL[selectedTransportMode]}.`
                      )
                    }
                    className="px-3 py-2 rounded bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 disabled:opacity-60"
                  >
                    Aceitar frete
                  </button>
                )}

                {entry.status === 'ACEITO' && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      void runAction(
                        entry.id,
                        () =>
                          logisticsService.authorizeLoading({
                            entryId: entry.id,
                            actor,
                            evidenceReference: evidence,
                          }),
                        'Carregamento autorizado com trilha de auditoria.'
                      )
                    }
                    className="px-3 py-2 rounded bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 disabled:opacity-60"
                  >
                    Autorizar carregamento
                  </button>
                )}

                {entry.status === 'CARREGAMENTO_AUTORIZADO' && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      void runAction(
                        entry.id,
                        () =>
                          logisticsService.startTransit({
                            entryId: entry.id,
                            actor,
                            currentLocation,
                            evidenceReference: evidence,
                          }),
                        'Transporte iniciado com rastreio.'
                      )
                    }
                    className="px-3 py-2 rounded bg-violet-600 text-white text-xs font-semibold hover:bg-violet-700 disabled:opacity-60"
                  >
                    Iniciar transito
                  </button>
                )}

                {entry.status === 'EM_TRANSITO' && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      void runAction(
                        entry.id,
                        () =>
                          logisticsService.requestUnloading({
                            entryId: entry.id,
                            actor,
                            currentLocation,
                            evidenceReference: evidence,
                          }),
                        'Chegada registrada. Aguardando autorizacao de descarga.'
                      )
                    }
                    className="px-3 py-2 rounded bg-amber-600 text-white text-xs font-semibold hover:bg-amber-700 disabled:opacity-60"
                  >
                    Solicitar descarga
                  </button>
                )}

                {entry.status === 'AGUARDANDO_DESCARGA' && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      void runAction(
                        entry.id,
                        () =>
                          logisticsService.authorizeUnloading({
                            entryId: entry.id,
                            actor,
                            evidenceReference: evidence,
                          }),
                        'Descarga autorizada.'
                      )
                    }
                    className="px-3 py-2 rounded bg-teal-600 text-white text-xs font-semibold hover:bg-teal-700 disabled:opacity-60"
                  >
                    Autorizar descarga
                  </button>
                )}

                {entry.status === 'DESCARGA_AUTORIZADA' && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      void runAction(
                        entry.id,
                        () =>
                          logisticsService.finalizeTransport({
                            entryId: entry.id,
                            actor,
                            evidenceReference: evidence,
                          }),
                        'Transporte finalizado e apto para liberacao documental.'
                      )
                    }
                    className="px-3 py-2 rounded bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 disabled:opacity-60"
                  >
                    Finalizar transporte
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default LogisticsView;
