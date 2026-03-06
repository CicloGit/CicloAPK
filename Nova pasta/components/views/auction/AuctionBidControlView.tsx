import React, { useEffect, useMemo, useState } from 'react';
import LoadingSpinner from '../../shared/LoadingSpinner';
import CodeScannerField from '../../shared/CodeScannerField';
import { auctioneerService } from '../../../services/auctioneerService';
import { AuctionBidSignal, AuctionEvent, AuctionLot } from '../../../types';
import { useApp } from '../../../contexts/AppContext';

const parseNumber = (value: string): number | undefined => {
  const parsed = Number(value.trim().replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : undefined;
};

const formatMoney = (value?: number): string =>
  value === undefined || value === null
    ? '-'
    : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const formatDateTime = (value?: string): string => {
  if (!value) return '-';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString('pt-BR');
};

const normalizeRole = (role: string | undefined): string =>
  String(role ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

const AuctionBidControlView: React.FC = () => {
  const { currentUser } = useApp();
  const role = normalizeRole(currentUser?.role);
  const isAuctioneer = role.includes('leiloeiro');
  const actor = currentUser?.name ? `${currentUser.name} (${currentUser.role})` : 'Operador de Leilao';

  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [lots, setLots] = useState<AuctionLot[]>([]);
  const [events, setEvents] = useState<AuctionEvent[]>([]);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [selectedLotId, setSelectedLotId] = useState('');
  const [signals, setSignals] = useState<AuctionBidSignal[]>([]);
  const [isSignalsLoading, setIsSignalsLoading] = useState(true);
  const [isSubmittingSignal, setIsSubmittingSignal] = useState(false);
  const [isReviewingById, setIsReviewingById] = useState<Record<string, boolean>>({});

  const [signalForm, setSignalForm] = useState({
    bidderName: '',
    amount: '',
    assistantNote: '',
    evidenceReference: '',
  });

  const [rejectionBySignalId, setRejectionBySignalId] = useState<Record<string, string>>({});
  const selectedEvent = useMemo(
    () => events.find((event) => event.id === selectedEventId) ?? null,
    [events, selectedEventId]
  );

  const visibleLots = useMemo(() => {
    if (!selectedEvent) {
      return lots;
    }
    const lotIds = new Set(selectedEvent.lots.map((item) => item.lotId));
    const rows = lots.filter((lot) => lotIds.has(lot.id));
    return rows.length > 0 ? rows : lots;
  }, [selectedEvent, lots]);

  const selectedLot = useMemo(
    () => visibleLots.find((lot) => lot.id === selectedLotId) ?? null,
    [visibleLots, selectedLotId]
  );

  const pendingCount = useMemo(
    () => signals.filter((signal) => signal.status === 'RECEBIDO').length,
    [signals]
  );

  const refreshBaseData = async () => {
    const [loadedLots, loadedEvents] = await Promise.all([
      auctioneerService.listLotsForCurrentAuctioneer(),
      auctioneerService.listEvents(),
    ]);
    setLots(loadedLots);
    setEvents(loadedEvents);

    if (!selectedEventId && loadedEvents.length > 0) {
      setSelectedEventId(loadedEvents[0].id);
    }
    if (!selectedLotId && loadedLots.length > 0) {
      setSelectedLotId(loadedLots[0].id);
    }
  };

  useEffect(() => {
    (async () => {
      setIsLoading(true);
      setLoadError(null);
      try {
        await refreshBaseData();
      } catch (loadErr) {
        setLoadError(loadErr instanceof Error ? loadErr.message : 'Falha ao carregar controle de lances.');
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    let mounted = true;
    let unsubscribe: (() => void) | null = null;
    setIsSignalsLoading(true);
    void auctioneerService
      .watchBidSignals({
        auctionEventId: selectedEventId || undefined,
        lotId: selectedLotId || undefined,
        onChange: (rows) => {
          if (!mounted) return;
          setSignals(rows);
          setIsSignalsLoading(false);
        },
        onError: (watchError) => {
          if (!mounted) return;
          setError(watchError.message);
          setIsSignalsLoading(false);
        },
      })
      .then((stop) => {
        if (!mounted) {
          stop();
          return;
        }
        unsubscribe = stop;
      })
      .catch((watchError) => {
        if (!mounted) return;
        setError(watchError instanceof Error ? watchError.message : 'Falha ao iniciar fila em tempo real.');
        setIsSignalsLoading(false);
      });

    return () => {
      mounted = false;
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [selectedEventId, selectedLotId]);

  const clearAlerts = () => {
    setError(null);
    setMessage(null);
  };

  const handleRegisterSignal = async (event: React.FormEvent) => {
    event.preventDefault();
    clearAlerts();
    if (!selectedLotId) {
      setError('Selecione um lote para registrar o recebimento do lance.');
      return;
    }

    const amount = parseNumber(signalForm.amount);
    if (!amount || amount <= 0) {
      setError('Informe um valor valido para o lance.');
      return;
    }

    setIsSubmittingSignal(true);
    try {
      await auctioneerService.registerBidSignal({
        lotId: selectedLotId,
        actor,
        bidderName: signalForm.bidderName,
        amount,
        auctionEventId: selectedEventId || undefined,
        assistantNote: signalForm.assistantNote || undefined,
        evidenceReference: signalForm.evidenceReference || undefined,
      });
      setSignalForm({
        bidderName: '',
        amount: '',
        assistantNote: '',
        evidenceReference: '',
      });
      setMessage('Recebimento de lance online registrado para validacao.');
    } catch (registerError) {
      setError(registerError instanceof Error ? registerError.message : 'Falha ao registrar lance online.');
    } finally {
      setIsSubmittingSignal(false);
    }
  };

  const handleReviewSignal = async (
    signal: AuctionBidSignal,
    decision: 'VALIDAR' | 'REJEITAR'
  ) => {
    clearAlerts();
    setIsReviewingById((prev) => ({ ...prev, [signal.id]: true }));
    try {
      await auctioneerService.reviewBidSignal({
        signalId: signal.id,
        actor,
        decision,
        rejectionReason: rejectionBySignalId[signal.id] || undefined,
        evidenceReference: signal.evidenceReference || undefined,
      });
      setMessage(decision === 'VALIDAR' ? 'Lance validado e lancado no lote.' : 'Recebimento rejeitado.');
    } catch (reviewError) {
      setError(reviewError instanceof Error ? reviewError.message : 'Falha ao revisar lance online.');
    } finally {
      setIsReviewingById((prev) => ({ ...prev, [signal.id]: false }));
    }
  };

  if (isLoading) {
    return <LoadingSpinner text="Carregando controle de lances..." />;
  }

  if (loadError) {
    return <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">{loadError}</div>;
  }

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-3xl font-bold text-slate-800">Controle de Lances Online</h2>
        <p className="text-slate-600">
          Assistentes registram recebimentos em tempo real e o leiloeiro valida/rejeita com trilha auditavel.
        </p>
      </header>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      {message && <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{message}</div>}

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase font-bold text-slate-500">Recebidos pendentes</p>
          <p className="mt-1 text-3xl font-bold text-slate-800">{pendingCount}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase font-bold text-slate-500">Lances no filtro atual</p>
          <p className="mt-1 text-3xl font-bold text-slate-800">{signals.length}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase font-bold text-slate-500">Sincronizacao</p>
          <p className="mt-1 text-sm font-semibold text-slate-700">
            {isSignalsLoading ? 'Sincronizando fila em tempo real...' : 'Fila sincronizada em tempo real'}
          </p>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-lg font-bold text-slate-800">Registrar recebimento online</h3>
        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
          <select
            className="rounded border p-2"
            value={selectedEventId}
            onChange={(event) => setSelectedEventId(event.target.value)}
          >
            <option value="">Sem filtro de sessao</option>
            {events.map((row) => (
              <option key={row.id} value={row.id}>
                {row.title} ({row.status})
              </option>
            ))}
          </select>
          <select
            className="rounded border p-2 md:col-span-2"
            value={selectedLotId}
            onChange={(event) => setSelectedLotId(event.target.value)}
          >
            <option value="">Selecione o lote</option>
            {visibleLots.map((lot) => (
              <option key={lot.id} value={lot.id}>
                {lot.lotName} | {lot.producerName}
              </option>
            ))}
          </select>
        </div>

        {selectedLot && (
          <p className="mt-2 text-xs text-slate-500">
            Lote selecionado: {selectedLot.lotName} | Maior lance atual: {formatMoney(selectedLot.highestBid)}
          </p>
        )}

        <form onSubmit={handleRegisterSignal} className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-4">
          <input
            className="rounded border p-2"
            placeholder="Participante online"
            value={signalForm.bidderName}
            onChange={(event) => setSignalForm((prev) => ({ ...prev, bidderName: event.target.value }))}
            required
          />
          <input
            className="rounded border p-2"
            placeholder="Valor recebido"
            value={signalForm.amount}
            onChange={(event) => setSignalForm((prev) => ({ ...prev, amount: event.target.value }))}
            required
          />
          <input
            className="rounded border p-2 md:col-span-2"
            placeholder="Observacao do assistente"
            value={signalForm.assistantNote}
            onChange={(event) => setSignalForm((prev) => ({ ...prev, assistantNote: event.target.value }))}
          />
          <div className="md:col-span-3">
            <CodeScannerField
              label="Evidencia do recebimento (QR/link/hash)"
              mode="ANY"
              value={signalForm.evidenceReference}
              onChange={(nextValue) => setSignalForm((prev) => ({ ...prev, evidenceReference: nextValue }))}
              placeholder="Opcional"
            />
          </div>
          <button
            type="submit"
            disabled={isSubmittingSignal}
            className="rounded bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-60"
          >
            {isSubmittingSignal ? 'Registrando...' : 'Sinalizar lance recebido'}
          </button>
        </form>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-lg font-bold text-slate-800">Fila de lances online</h3>
        <div className="mt-3 space-y-2">
          {signals.length === 0 && (
            <p className="rounded border border-slate-200 bg-slate-50 p-3 text-sm text-slate-500">
              Nenhum recebimento online no filtro atual.
            </p>
          )}
          {signals.map((signal) => {
            const isReviewing = isReviewingById[signal.id] === true;
            return (
              <div key={signal.id} className="rounded-lg border border-slate-200 p-3">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="font-semibold text-slate-800">{signal.bidderName}</span>
                  <span className="text-slate-600">{formatMoney(signal.amount)}</span>
                  <span className={`rounded px-2 py-0.5 text-xs font-semibold ${
                    signal.status === 'VALIDADO'
                      ? 'bg-emerald-100 text-emerald-700'
                      : signal.status === 'REJEITADO'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-amber-100 text-amber-700'
                  }`}>
                    {signal.status}
                  </span>
                  <span className="ml-auto text-xs text-slate-500">{formatDateTime(signal.createdAt)}</span>
                </div>
                <p className="mt-1 text-xs text-slate-600">
                  Lote: {signal.lotName || signal.lotId} | Assistente: {signal.assistantName || '-'}
                </p>
                {signal.assistantNote && <p className="mt-1 text-xs text-slate-500">Obs: {signal.assistantNote}</p>}
                {signal.rejectionReason && (
                  <p className="mt-1 text-xs text-red-600">Motivo da rejeicao: {signal.rejectionReason}</p>
                )}

                {isAuctioneer && signal.status === 'RECEBIDO' && (
                  <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-4">
                    <input
                      className="rounded border p-2 text-xs md:col-span-2"
                      placeholder="Motivo da rejeicao (obrigatorio ao rejeitar)"
                      value={rejectionBySignalId[signal.id] ?? ''}
                      onChange={(event) =>
                        setRejectionBySignalId((prev) => ({ ...prev, [signal.id]: event.target.value }))
                      }
                    />
                    <button
                      type="button"
                      disabled={isReviewing}
                      onClick={() => void handleReviewSignal(signal, 'VALIDAR')}
                      className="rounded bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                    >
                      Validar
                    </button>
                    <button
                      type="button"
                      disabled={isReviewing}
                      onClick={() => void handleReviewSignal(signal, 'REJEITAR')}
                      className="rounded bg-red-600 px-3 py-2 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-60"
                    >
                      Rejeitar
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};

export default AuctionBidControlView;
