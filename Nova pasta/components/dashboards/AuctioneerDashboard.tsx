import React, { useEffect, useMemo, useState } from 'react';
import LoadingSpinner from '../shared/LoadingSpinner';
import CodeScannerField from '../shared/CodeScannerField';
import VoiceCommandPanel from '../shared/VoiceCommandPanel';
import {
  AuctionBidSignal,
  AuctionEvent,
  AuctionEventStatus,
  AuctionLiveStreamStatus,
  AuctionLot,
  AuctionModality,
  AuctionParticipantChannel,
  AuctionStreamProvider,
} from '../../types';
import { auctioneerService } from '../../services/auctioneerService';
import { useApp } from '../../contexts/AppContext';

const MODALITIES: AuctionModality[] = ['PRESENCIAL', 'ONLINE', 'HIBRIDO'];
const EVENT_STATUSES: AuctionEventStatus[] = ['RASCUNHO', 'AGENDADO', 'AO_VIVO', 'ENCERRADO', 'CANCELADO'];
const LIVE_STATUSES: AuctionLiveStreamStatus[] = ['PREPARACAO', 'AO_VIVO', 'ENCERRADA'];
const STREAM_PROVIDERS: AuctionStreamProvider[] = ['YOUTUBE', 'VIMEO', 'MEET', 'TEAMS', 'RTMP', 'OUTRO'];
const BID_CHANNELS: AuctionParticipantChannel[] = ['PRESENCIAL', 'ONLINE'];

const parseNumber = (value: string): number | undefined => {
  const parsed = Number(value.trim().replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : undefined;
};

const formatDateTime = (value?: string): string => {
  if (!value) return 'Nao definido';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString('pt-BR');
};

const formatMoney = (value?: number): string =>
  value === undefined || value === null
    ? '-'
    : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const normalizeVoice = (value: string): string =>
  value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

const AuctioneerDashboard: React.FC = () => {
  const { currentUser } = useApp();
  const normalizedRole = String(currentUser?.role ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
  const isAuctioneer = normalizedRole.includes('leiloeiro');
  const actor = currentUser?.name ? `${currentUser.name} (${currentUser.role})` : 'Leiloeiro';

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [lots, setLots] = useState<AuctionLot[]>([]);
  const [events, setEvents] = useState<AuctionEvent[]>([]);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [bidSignals, setBidSignals] = useState<AuctionBidSignal[]>([]);
  const [isSignalsLoading, setIsSignalsLoading] = useState(true);
  const [assistantNoteByLotId, setAssistantNoteByLotId] = useState<Record<string, string>>({});
  const [signalRejectionById, setSignalRejectionById] = useState<Record<string, string>>({});

  const [profileForm, setProfileForm] = useState({
    name: '',
    parkName: '',
    city: '',
    state: '',
    lat: '',
    lon: '',
    radiusKm: '180',
    streamProvider: 'YOUTUBE' as AuctionStreamProvider,
    streamUrl: '',
    modePresencial: true,
    modeOnline: true,
    modeHibrido: true,
  });

  const [registerForm, setRegisterForm] = useState({
    producerName: '',
    propertyRegistrationNumber: '',
    lotName: '',
    category: '',
    reservePrice: '',
    auctionDate: '',
    locationLabel: '',
    geoLat: '',
    geoLon: '',
    primaryVideoReference: '',
    modePresencial: true,
    modeOnline: true,
    modeHibrido: true,
  });

  const [eventForm, setEventForm] = useState({
    title: '',
    modality: 'HIBRIDO' as AuctionModality,
    startsAt: '',
    endsAt: '',
    provider: 'YOUTUBE' as AuctionStreamProvider,
    streamUrl: '',
    selectedLots: {} as Record<string, boolean>,
  });

  const [eventStreamUrlById, setEventStreamUrlById] = useState<Record<string, string>>({});
  const [eventStreamStatusById, setEventStreamStatusById] = useState<Record<string, AuctionLiveStreamStatus>>({});
  const [eventStreamProviderById, setEventStreamProviderById] = useState<Record<string, AuctionStreamProvider>>({});
  const [lotStreamUrlById, setLotStreamUrlById] = useState<Record<string, string>>({});
  const [lotStreamStatusById, setLotStreamStatusById] = useState<Record<string, AuctionLiveStreamStatus>>({});
  const [bidderByLotId, setBidderByLotId] = useState<Record<string, string>>({});
  const [bidAmountByLotId, setBidAmountByLotId] = useState<Record<string, string>>({});
  const [bidChannelByLotId, setBidChannelByLotId] = useState<Record<string, AuctionParticipantChannel>>({});
  const [evidenceByLotId, setEvidenceByLotId] = useState<Record<string, string>>({});

  const selectedEvent = useMemo(
    () => events.find((event) => event.id === selectedEventId) ?? events[0] ?? null,
    [events, selectedEventId]
  );

  const lotsById = useMemo(() => {
    const map = new Map<string, AuctionLot>();
    lots.forEach((lot) => map.set(lot.id, lot));
    return map;
  }, [lots]);

  const liveLots = useMemo(() => {
    if (!selectedEvent) return lots;
    const rows = selectedEvent.lots.map((item) => lotsById.get(item.lotId)).filter((lot): lot is AuctionLot => Boolean(lot));
    return rows.length > 0 ? rows : lots;
  }, [selectedEvent, lotsById, lots]);

  const bidSignalsByLotId = useMemo(() => {
    return bidSignals.reduce<Record<string, AuctionBidSignal[]>>((acc, signal) => {
      if (!acc[signal.lotId]) {
        acc[signal.lotId] = [];
      }
      acc[signal.lotId].push(signal);
      return acc;
    }, {});
  }, [bidSignals]);

  const modalitiesFromProfile = (): AuctionModality[] => {
    const rows: AuctionModality[] = [];
    if (profileForm.modePresencial) rows.push('PRESENCIAL');
    if (profileForm.modeOnline) rows.push('ONLINE');
    if (profileForm.modeHibrido) rows.push('HIBRIDO');
    return rows;
  };

  const modalitiesFromLot = (): AuctionModality[] => {
    const rows: AuctionModality[] = [];
    if (registerForm.modePresencial) rows.push('PRESENCIAL');
    if (registerForm.modeOnline) rows.push('ONLINE');
    if (registerForm.modeHibrido) rows.push('HIBRIDO');
    return rows;
  };

  const hydrateLots = (rows: AuctionLot[]) => {
    setLotStreamUrlById(rows.reduce((acc, lot) => ({ ...acc, [lot.id]: lot.liveStreamUrl ?? '' }), {}));
    setLotStreamStatusById(rows.reduce((acc, lot) => ({ ...acc, [lot.id]: lot.liveStreamStatus ?? 'PREPARACAO' }), {}));
    setBidChannelByLotId(rows.reduce((acc, lot) => ({ ...acc, [lot.id]: lot.winnerChannel ?? 'PRESENCIAL' }), {}));
  };

  const hydrateEvents = (rows: AuctionEvent[]) => {
    setEventStreamUrlById(rows.reduce((acc, event) => ({ ...acc, [event.id]: event.liveStreamUrl ?? '' }), {}));
    setEventStreamStatusById(rows.reduce((acc, event) => ({ ...acc, [event.id]: event.liveStreamStatus ?? 'PREPARACAO' }), {}));
    setEventStreamProviderById(rows.reduce((acc, event) => ({ ...acc, [event.id]: event.liveStreamProvider ?? 'YOUTUBE' }), {}));
  };

  const refresh = async () => {
    const [profile, loadedLots, loadedEvents] = await Promise.all([
      auctioneerService.getProfile(),
      auctioneerService.listLotsForCurrentAuctioneer(),
      auctioneerService.listEvents(),
    ]);
    setLots(loadedLots);
    setEvents(loadedEvents);
    hydrateLots(loadedLots);
    hydrateEvents(loadedEvents);
    if (loadedEvents.length > 0 && !loadedEvents.find((row) => row.id === selectedEventId)) {
      setSelectedEventId(loadedEvents[0].id);
    }
    if (profile) {
      setProfileForm((prev) => ({
        ...prev,
        name: profile.name,
        parkName: profile.parkName,
        city: profile.city,
        state: profile.state,
        lat: String(profile.parkLatitude),
        lon: String(profile.parkLongitude),
        radiusKm: String(profile.serviceRadiusKm),
        streamProvider: profile.liveStreamProvider ?? 'YOUTUBE',
        streamUrl: profile.defaultLiveStreamUrl ?? '',
        modePresencial: profile.modalities.includes('PRESENCIAL'),
        modeOnline: profile.modalities.includes('ONLINE'),
        modeHibrido: profile.modalities.includes('HIBRIDO'),
      }));
    }
  };

  useEffect(() => {
    (async () => {
      setIsLoading(true);
      try {
        await refresh();
        setError(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Falha ao carregar painel do leiloeiro.');
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
        auctionEventId: selectedEvent?.id,
        onChange: (signals) => {
          if (!mounted) return;
          setBidSignals(signals);
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
        const message = watchError instanceof Error ? watchError.message : 'Falha ao iniciar monitoramento de lances online.';
        setError(message);
        setIsSignalsLoading(false);
      });

    return () => {
      mounted = false;
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [selectedEvent?.id]);

  const clearAlerts = () => {
    setError(null);
    setMessage(null);
  };

  const onVoiceCommand = (command: string) => {
    const normalized = normalizeVoice(command);
    if (normalized.includes('parque')) setMessage('Comando reconhecido: cadastre/ajuste o parque.');
    else if (normalized.includes('agenda')) setMessage('Comando reconhecido: configure a sessao na agenda.');
    else if (normalized.includes('ao vivo') || normalized.includes('lance')) setMessage('Comando reconhecido: operacao ao vivo.');
    else setError('Comando de voz nao reconhecido.');
  };

  if (isLoading) return <LoadingSpinner text="Carregando sistema de leilao..." />;

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-3xl font-bold text-slate-800">Sistema Completo de Leilao (Presencial + Online)</h2>
        <p className="text-slate-600">Cadastro do parque, direcao por proximidade, agenda de sessao e transmissao ao vivo com lance remoto.</p>
      </header>

      <VoiceCommandPanel onCommand={onVoiceCommand} hints={['parque', 'agenda', 'ao vivo']} />
      {error && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      {message && <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{message}</div>}

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
        <h3 className="text-lg font-bold text-slate-800">1) Cadastro do parque</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input className="p-2 border rounded" placeholder="Leiloeiro" value={profileForm.name} onChange={(e) => setProfileForm((prev) => ({ ...prev, name: e.target.value }))} />
          <input className="p-2 border rounded" placeholder="Parque de leiloes" value={profileForm.parkName} onChange={(e) => setProfileForm((prev) => ({ ...prev, parkName: e.target.value }))} />
          <input className="p-2 border rounded" placeholder="Cidade/UF" value={`${profileForm.city}/${profileForm.state}`} onChange={() => {}} readOnly />
          <input className="p-2 border rounded" placeholder="Cidade" value={profileForm.city} onChange={(e) => setProfileForm((prev) => ({ ...prev, city: e.target.value }))} />
          <input className="p-2 border rounded" placeholder="UF" value={profileForm.state} onChange={(e) => setProfileForm((prev) => ({ ...prev, state: e.target.value.toUpperCase() }))} />
          <input className="p-2 border rounded" placeholder="Raio (km)" value={profileForm.radiusKm} onChange={(e) => setProfileForm((prev) => ({ ...prev, radiusKm: e.target.value }))} />
          <input className="p-2 border rounded" placeholder="Latitude do parque" value={profileForm.lat} onChange={(e) => setProfileForm((prev) => ({ ...prev, lat: e.target.value }))} />
          <input className="p-2 border rounded" placeholder="Longitude do parque" value={profileForm.lon} onChange={(e) => setProfileForm((prev) => ({ ...prev, lon: e.target.value }))} />
          <select className="p-2 border rounded bg-white" value={profileForm.streamProvider} onChange={(e) => setProfileForm((prev) => ({ ...prev, streamProvider: e.target.value as AuctionStreamProvider }))}>
            {STREAM_PROVIDERS.map((provider) => <option key={provider} value={provider}>{provider}</option>)}
          </select>
        </div>
        <div className="flex flex-wrap gap-3 text-sm text-slate-700">
          <label className="flex items-center gap-2"><input type="checkbox" checked={profileForm.modePresencial} onChange={(e) => setProfileForm((prev) => ({ ...prev, modePresencial: e.target.checked }))} />Presencial</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={profileForm.modeOnline} onChange={(e) => setProfileForm((prev) => ({ ...prev, modeOnline: e.target.checked }))} />Online</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={profileForm.modeHibrido} onChange={(e) => setProfileForm((prev) => ({ ...prev, modeHibrido: e.target.checked }))} />Hibrido</label>
        </div>
        <button type="button" onClick={async () => {
          clearAlerts();
          try {
            await auctioneerService.upsertProfile({
              actor,
              name: profileForm.name,
              parkName: profileForm.parkName,
              city: profileForm.city,
              state: profileForm.state,
              parkLatitude: parseNumber(profileForm.lat) ?? Number.NaN,
              parkLongitude: parseNumber(profileForm.lon) ?? Number.NaN,
              serviceRadiusKm: parseNumber(profileForm.radiusKm),
              modalities: modalitiesFromProfile(),
              liveStreamProvider: profileForm.streamProvider,
              defaultLiveStreamUrl: profileForm.streamUrl || undefined,
            });
            await refresh();
            setMessage('Cadastro do parque salvo.');
          } catch (e) {
            setError(e instanceof Error ? e.message : 'Falha ao salvar parque.');
          }
        }} className="px-4 py-2 rounded bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700">Salvar parque</button>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
        <h3 className="text-lg font-bold text-slate-800">2) Cadastro e direcao de lotes</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input className="p-2 border rounded" placeholder="Produtor" value={registerForm.producerName} onChange={(e) => setRegisterForm((prev) => ({ ...prev, producerName: e.target.value }))} />
          <input className="p-2 border rounded" placeholder="CAR/IE" value={registerForm.propertyRegistrationNumber} onChange={(e) => setRegisterForm((prev) => ({ ...prev, propertyRegistrationNumber: e.target.value.toUpperCase() }))} />
          <input className="p-2 border rounded" placeholder="Nome do lote" value={registerForm.lotName} onChange={(e) => setRegisterForm((prev) => ({ ...prev, lotName: e.target.value }))} />
          <input className="p-2 border rounded" placeholder="Categoria" value={registerForm.category} onChange={(e) => setRegisterForm((prev) => ({ ...prev, category: e.target.value }))} />
          <input className="p-2 border rounded" placeholder="Preco de reserva" value={registerForm.reservePrice} onChange={(e) => setRegisterForm((prev) => ({ ...prev, reservePrice: e.target.value }))} />
          <input type="date" className="p-2 border rounded" value={registerForm.auctionDate} onChange={(e) => setRegisterForm((prev) => ({ ...prev, auctionDate: e.target.value }))} />
          <input className="p-2 border rounded" placeholder="Localizacao textual" value={registerForm.locationLabel} onChange={(e) => setRegisterForm((prev) => ({ ...prev, locationLabel: e.target.value }))} />
          <input className="p-2 border rounded" placeholder="Latitude do lote" value={registerForm.geoLat} onChange={(e) => setRegisterForm((prev) => ({ ...prev, geoLat: e.target.value }))} />
          <input className="p-2 border rounded" placeholder="Longitude do lote" value={registerForm.geoLon} onChange={(e) => setRegisterForm((prev) => ({ ...prev, geoLon: e.target.value }))} />
        </div>
        <CodeScannerField label="Referencia de video do lote" mode="ANY" value={registerForm.primaryVideoReference} onChange={(nextValue) => setRegisterForm((prev) => ({ ...prev, primaryVideoReference: nextValue }))} placeholder="URL/hash do video" />
        <button type="button" onClick={async () => {
          clearAlerts();
          try {
            await auctioneerService.registerLot({
              actor,
              producerName: registerForm.producerName,
              propertyRegistrationNumber: registerForm.propertyRegistrationNumber,
              lotName: registerForm.lotName || undefined,
              category: registerForm.category,
              reservePrice: parseNumber(registerForm.reservePrice),
              auctionDate: registerForm.auctionDate || undefined,
              locationLabel: registerForm.locationLabel || undefined,
              geoCenter: parseNumber(registerForm.geoLat) !== undefined && parseNumber(registerForm.geoLon) !== undefined ? { lat: Number(parseNumber(registerForm.geoLat)), lon: Number(parseNumber(registerForm.geoLon)) } : undefined,
              allowedModalities: modalitiesFromLot(),
              primaryVideoReference: registerForm.primaryVideoReference,
            });
            await refresh();
            setMessage('Lote cadastrado com sucesso.');
          } catch (e) {
            setError(e instanceof Error ? e.message : 'Falha ao cadastrar lote.');
          }
        }} className="px-4 py-2 rounded bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700">Cadastrar lote</button>
        <div className="space-y-2">
          {lots.map((lot) => (
            <div key={lot.id} className="rounded-lg border border-slate-200 p-3 flex flex-wrap items-center gap-3">
              <div className="min-w-[250px]">
                <p className="font-semibold text-slate-800">{lot.lotName}</p>
                <p className="text-xs text-slate-500">{lot.producerName} | {lot.locationLabel || '-'} | {lot.distanceToAuctionParkKm !== undefined ? `${lot.distanceToAuctionParkKm.toFixed(2)} km` : 'sem distancia'}</p>
              </div>
              <button type="button" onClick={async () => {
                clearAlerts();
                try {
                  await auctioneerService.assignLotToCurrentAuctioneer({ lotId: lot.id, actor });
                  await refresh();
                  setMessage('Lote direcionado para o parque.');
                } catch (e) {
                  setError(e instanceof Error ? e.message : 'Falha ao direcionar lote.');
                }
              }} className="px-3 py-1.5 rounded bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700">Direcionar</button>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
        <h3 className="text-lg font-bold text-slate-800">3) Agenda de sessoes presenciais/online</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input className="p-2 border rounded md:col-span-2" placeholder="Titulo da sessao" value={eventForm.title} onChange={(e) => setEventForm((prev) => ({ ...prev, title: e.target.value }))} />
          <select className="p-2 border rounded bg-white" value={eventForm.modality} onChange={(e) => setEventForm((prev) => ({ ...prev, modality: e.target.value as AuctionModality }))}>
            {MODALITIES.map((mode) => <option key={mode} value={mode}>{mode}</option>)}
          </select>
          <input type="datetime-local" className="p-2 border rounded" value={eventForm.startsAt} onChange={(e) => setEventForm((prev) => ({ ...prev, startsAt: e.target.value }))} />
          <input type="datetime-local" className="p-2 border rounded" value={eventForm.endsAt} onChange={(e) => setEventForm((prev) => ({ ...prev, endsAt: e.target.value }))} />
          <select className="p-2 border rounded bg-white" value={eventForm.provider} onChange={(e) => setEventForm((prev) => ({ ...prev, provider: e.target.value as AuctionStreamProvider }))}>
            {STREAM_PROVIDERS.map((provider) => <option key={provider} value={provider}>{provider}</option>)}
          </select>
          <input className="p-2 border rounded md:col-span-3" placeholder="URL da transmissao da sessao" value={eventForm.streamUrl} onChange={(e) => setEventForm((prev) => ({ ...prev, streamUrl: e.target.value }))} />
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
          <p className="text-sm font-semibold text-slate-700 mb-2">Selecionar lotes para sessao</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-40 overflow-y-auto">
            {lots.map((lot) => (
              <label key={`sched-${lot.id}`} className="flex items-start gap-2 rounded border border-slate-200 bg-white p-2 text-xs text-slate-700">
                <input type="checkbox" checked={eventForm.selectedLots[lot.id] === true} onChange={(e) => setEventForm((prev) => ({ ...prev, selectedLots: { ...prev.selectedLots, [lot.id]: e.target.checked } }))} />
                <span>{lot.lotName} | {lot.producerName}</span>
              </label>
            ))}
          </div>
        </div>
        <button type="button" onClick={async () => {
          clearAlerts();
          try {
            const lotIds = Object.entries(eventForm.selectedLots).filter(([, checked]) => checked).map(([lotId]) => lotId);
            const created = await auctioneerService.scheduleEvent({
              actor,
              title: eventForm.title,
              modality: eventForm.modality,
              startsAt: eventForm.startsAt,
              endsAt: eventForm.endsAt,
              lotIds,
              liveStreamProvider: eventForm.provider,
              liveStreamUrl: eventForm.streamUrl || undefined,
              onlineBidEnabled: eventForm.modality === 'ONLINE' || eventForm.modality === 'HIBRIDO',
              inPersonEnabled: eventForm.modality === 'PRESENCIAL' || eventForm.modality === 'HIBRIDO',
            });
            await refresh();
            setSelectedEventId(created.id);
            setMessage('Sessao agendada com sucesso.');
          } catch (e) {
            setError(e instanceof Error ? e.message : 'Falha ao agendar sessao.');
          }
        }} className="px-4 py-2 rounded bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700">Agendar sessao</button>

        <div className="space-y-2">
          {events.map((event) => (
            <div key={event.id} className={`rounded-lg border p-3 ${selectedEvent?.id === event.id ? 'border-indigo-300 bg-indigo-50/40' : 'border-slate-200'}`}>
              <div className="flex items-center gap-2">
                <p className="font-semibold text-slate-800">{event.title}</p>
                <span className="rounded bg-slate-100 px-2 py-0.5 text-[11px] text-slate-700">{event.modality}</span>
                <button type="button" onClick={() => setSelectedEventId(event.id)} className="ml-auto px-2 py-1 rounded border border-slate-300 text-xs hover:bg-slate-100">Selecionar</button>
              </div>
              <p className="text-xs text-slate-600">{formatDateTime(event.startsAt)} ate {formatDateTime(event.endsAt)} | Status: {event.status}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {EVENT_STATUSES.map((status) => (
                  <button key={`${event.id}-${status}`} type="button" onClick={async () => {
                    clearAlerts();
                    try {
                      await auctioneerService.updateEventStatus({ eventId: event.id, actor, status });
                      await refresh();
                      setMessage(`Sessao atualizada para ${status}.`);
                    } catch (e) {
                      setError(e instanceof Error ? e.message : 'Falha ao atualizar status da sessao.');
                    }
                  }} className="px-2 py-1 rounded bg-slate-100 text-slate-700 text-[11px] font-semibold hover:bg-slate-200">{status}</button>
                ))}
              </div>
              <div className="mt-2 grid grid-cols-1 md:grid-cols-3 gap-2">
                <input value={eventStreamUrlById[event.id] ?? event.liveStreamUrl ?? ''} onChange={(e) => setEventStreamUrlById((prev) => ({ ...prev, [event.id]: e.target.value }))} className="p-2 border rounded text-xs" placeholder="URL da transmissao" />
                <select value={eventStreamProviderById[event.id] ?? event.liveStreamProvider ?? 'YOUTUBE'} onChange={(e) => setEventStreamProviderById((prev) => ({ ...prev, [event.id]: e.target.value as AuctionStreamProvider }))} className="p-2 border rounded text-xs bg-white">
                  {STREAM_PROVIDERS.map((provider) => <option key={`${event.id}-${provider}`} value={provider}>{provider}</option>)}
                </select>
                <select value={eventStreamStatusById[event.id] ?? event.liveStreamStatus ?? 'PREPARACAO'} onChange={(e) => setEventStreamStatusById((prev) => ({ ...prev, [event.id]: e.target.value as AuctionLiveStreamStatus }))} className="p-2 border rounded text-xs bg-white">
                  {LIVE_STATUSES.map((status) => <option key={`${event.id}-live-${status}`} value={status}>{status}</option>)}
                </select>
              </div>
              <button type="button" onClick={async () => {
                clearAlerts();
                try {
                  await auctioneerService.updateEventLiveStream({
                    eventId: event.id,
                    actor,
                    liveStreamProvider: eventStreamProviderById[event.id] ?? 'YOUTUBE',
                    liveStreamUrl: eventStreamUrlById[event.id] ?? '',
                    liveStreamStatus: eventStreamStatusById[event.id] ?? 'PREPARACAO',
                  });
                  await refresh();
                  setMessage('Transmissao da sessao atualizada.');
                } catch (e) {
                  setError(e instanceof Error ? e.message : 'Falha ao atualizar transmissao da sessao.');
                }
              }} className="mt-2 px-3 py-2 rounded bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700">Atualizar transmissao da sessao</button>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
        <h3 className="text-lg font-bold text-slate-800">4) Operacao ao vivo e controle de lances online em tempo real</h3>
        <select value={selectedEvent?.id ?? ''} onChange={(e) => setSelectedEventId(e.target.value)} className="p-2 border rounded bg-white text-sm">
          <option value="">Selecionar sessao</option>
          {events.map((event) => <option key={`live-${event.id}`} value={event.id}>{event.title} | {event.status}</option>)}
        </select>
        <p className="text-xs text-slate-500">
          {isSignalsLoading
            ? 'Sincronizando fila de lances online...'
            : `Fila online sincronizada em tempo real (${bidSignals.length} registros no contexto atual).`}
        </p>
        <div className="space-y-2">
          {liveLots.map((lot) => {
            const lotSignals = bidSignalsByLotId[lot.id] ?? [];
            const pendingSignals = lotSignals.filter((signal) => signal.status === 'RECEBIDO');
            return (
              <div key={`live-lot-${lot.id}`} className="rounded-lg border border-slate-200 p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-slate-800">{lot.lotName}</p>
                  <span className={`rounded px-2 py-0.5 text-[11px] font-semibold ${pendingSignals.length > 0 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>
                    Online pendentes: {pendingSignals.length}
                  </span>
                </div>
                <p className="text-xs text-slate-600 mb-2">{lot.producerName} | Maior lance: {formatMoney(lot.highestBid)} | Vencedor: {lot.winningBidderName || '-'}</p>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                  <input value={lotStreamUrlById[lot.id] ?? lot.liveStreamUrl ?? ''} onChange={(e) => setLotStreamUrlById((prev) => ({ ...prev, [lot.id]: e.target.value }))} className="p-2 border rounded text-xs md:col-span-2" placeholder="URL de transmissao do lote" />
                  <select value={lotStreamStatusById[lot.id] ?? lot.liveStreamStatus ?? 'PREPARACAO'} onChange={(e) => setLotStreamStatusById((prev) => ({ ...prev, [lot.id]: e.target.value as AuctionLiveStreamStatus }))} className="p-2 border rounded text-xs bg-white">
                    {LIVE_STATUSES.map((status) => <option key={`${lot.id}-status-${status}`} value={status}>{status}</option>)}
                  </select>
                  <button type="button" onClick={async () => {
                    clearAlerts();
                    try {
                      await auctioneerService.updateLiveStream({
                        lotId: lot.id,
                        actor,
                        liveStreamUrl: lotStreamUrlById[lot.id] ?? '',
                        liveStreamStatus: lotStreamStatusById[lot.id] ?? 'PREPARACAO',
                        evidenceReference: evidenceByLotId[lot.id]?.trim() || undefined,
                      });
                      await refresh();
                      setMessage('Transmissao do lote atualizada.');
                    } catch (e) {
                      setError(e instanceof Error ? e.message : 'Falha ao atualizar transmissao do lote.');
                    }
                  }} className="px-3 py-2 rounded bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700">Atualizar live</button>
                </div>

                {isAuctioneer ? (
                  <div className="mt-2 grid grid-cols-1 md:grid-cols-4 gap-2">
                    <input value={bidderByLotId[lot.id] ?? ''} onChange={(e) => setBidderByLotId((prev) => ({ ...prev, [lot.id]: e.target.value }))} className="p-2 border rounded text-xs" placeholder="Participante" />
                    <input value={bidAmountByLotId[lot.id] ?? ''} onChange={(e) => setBidAmountByLotId((prev) => ({ ...prev, [lot.id]: e.target.value }))} className="p-2 border rounded text-xs" placeholder="Valor do lance" />
                    <select value={bidChannelByLotId[lot.id] ?? 'PRESENCIAL'} onChange={(e) => setBidChannelByLotId((prev) => ({ ...prev, [lot.id]: e.target.value as AuctionParticipantChannel }))} className="p-2 border rounded text-xs bg-white">
                      {BID_CHANNELS.map((channel) => <option key={`${lot.id}-channel-${channel}`} value={channel}>{channel}</option>)}
                    </select>
                    <button type="button" onClick={async () => {
                      clearAlerts();
                      try {
                        const amount = parseNumber(bidAmountByLotId[lot.id] ?? '');
                        if (!amount || amount <= 0) throw new Error('Valor de lance invalido.');
                        await auctioneerService.registerBid({
                          lotId: lot.id,
                          actor,
                          bidderName: bidderByLotId[lot.id] ?? '',
                          amount,
                          channel: bidChannelByLotId[lot.id] ?? 'PRESENCIAL',
                          auctionEventId: selectedEvent?.id,
                          evidenceReference: evidenceByLotId[lot.id]?.trim() || undefined,
                        });
                        await refresh();
                        setMessage('Lance registrado com sucesso.');
                      } catch (e) {
                        setError(e instanceof Error ? e.message : 'Falha ao registrar lance.');
                      }
                    }} className="px-3 py-2 rounded bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700">Registrar lance</button>
                  </div>
                ) : (
                  <div className="mt-2 grid grid-cols-1 md:grid-cols-4 gap-2">
                    <input value={bidderByLotId[lot.id] ?? ''} onChange={(e) => setBidderByLotId((prev) => ({ ...prev, [lot.id]: e.target.value }))} className="p-2 border rounded text-xs" placeholder="Participante online" />
                    <input value={bidAmountByLotId[lot.id] ?? ''} onChange={(e) => setBidAmountByLotId((prev) => ({ ...prev, [lot.id]: e.target.value }))} className="p-2 border rounded text-xs" placeholder="Valor recebido" />
                    <input value={assistantNoteByLotId[lot.id] ?? ''} onChange={(e) => setAssistantNoteByLotId((prev) => ({ ...prev, [lot.id]: e.target.value }))} className="p-2 border rounded text-xs" placeholder="Observacao do assistente" />
                    <button type="button" onClick={async () => {
                      clearAlerts();
                      try {
                        const amount = parseNumber(bidAmountByLotId[lot.id] ?? '');
                        if (!amount || amount <= 0) throw new Error('Valor de lance invalido.');
                        await auctioneerService.registerBidSignal({
                          lotId: lot.id,
                          actor,
                          bidderName: bidderByLotId[lot.id] ?? '',
                          amount,
                          auctionEventId: selectedEvent?.id,
                          assistantNote: assistantNoteByLotId[lot.id] ?? '',
                          evidenceReference: evidenceByLotId[lot.id]?.trim() || undefined,
                        });
                        setMessage('Recebimento online sinalizado para validacao do leiloeiro.');
                      } catch (e) {
                        setError(e instanceof Error ? e.message : 'Falha ao sinalizar recebimento online.');
                      }
                    }} className="px-3 py-2 rounded bg-amber-600 text-white text-xs font-semibold hover:bg-amber-700">Sinalizar lance online</button>
                  </div>
                )}

                <div className="mt-2">
                  <CodeScannerField label="Evidencia digital do lance/live" mode="ANY" value={evidenceByLotId[lot.id] ?? ''} onChange={(nextValue) => setEvidenceByLotId((prev) => ({ ...prev, [lot.id]: nextValue }))} placeholder="QR/link/hash" />
                </div>

                <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs font-semibold text-slate-700">Fila de lances online (tempo real)</p>
                  <div className="mt-2 space-y-2">
                    {lotSignals.length === 0 && <p className="text-xs text-slate-500">Nenhum recebimento online para este lote.</p>}
                    {lotSignals.map((signal) => (
                      <div key={signal.id} className="rounded border border-slate-200 bg-white p-2 text-xs">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold text-slate-800">{signal.bidderName}</span>
                          <span className="text-slate-500">{formatMoney(signal.amount)}</span>
                          <span className={`rounded px-2 py-0.5 font-semibold ${
                            signal.status === 'VALIDADO'
                              ? 'bg-emerald-100 text-emerald-700'
                              : signal.status === 'REJEITADO'
                                ? 'bg-red-100 text-red-700'
                                : 'bg-amber-100 text-amber-700'
                          }`}>
                            {signal.status}
                          </span>
                          <span className="ml-auto text-slate-500">{formatDateTime(signal.createdAt)}</span>
                        </div>
                        <p className="mt-1 text-slate-600">
                          Assistente: {signal.assistantName || '-'} {signal.assistantNote ? `| ${signal.assistantNote}` : ''}
                        </p>
                        {signal.rejectionReason && <p className="mt-1 text-red-600">Motivo rejeicao: {signal.rejectionReason}</p>}
                        {isAuctioneer && signal.status === 'RECEBIDO' && (
                          <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-3">
                            <input
                              value={signalRejectionById[signal.id] ?? ''}
                              onChange={(event) => setSignalRejectionById((prev) => ({ ...prev, [signal.id]: event.target.value }))}
                              className="rounded border p-2 text-xs md:col-span-2"
                              placeholder="Motivo para rejeitar (obrigatorio ao rejeitar)"
                            />
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={async () => {
                                  clearAlerts();
                                  try {
                                    await auctioneerService.reviewBidSignal({
                                      signalId: signal.id,
                                      actor,
                                      decision: 'VALIDAR',
                                      evidenceReference: evidenceByLotId[lot.id]?.trim() || undefined,
                                    });
                                    setMessage('Lance online validado e lancado no lote.');
                                  } catch (e) {
                                    setError(e instanceof Error ? e.message : 'Falha ao validar lance online.');
                                  }
                                }}
                                className="rounded bg-emerald-600 px-2 py-1 font-semibold text-white hover:bg-emerald-700"
                              >
                                Validar
                              </button>
                              <button
                                type="button"
                                onClick={async () => {
                                  clearAlerts();
                                  try {
                                    await auctioneerService.reviewBidSignal({
                                      signalId: signal.id,
                                      actor,
                                      decision: 'REJEITAR',
                                      rejectionReason: signalRejectionById[signal.id] ?? '',
                                      evidenceReference: evidenceByLotId[lot.id]?.trim() || undefined,
                                    });
                                    setMessage('Recebimento online rejeitado.');
                                  } catch (e) {
                                    setError(e instanceof Error ? e.message : 'Falha ao rejeitar recebimento online.');
                                  }
                                }}
                                className="rounded bg-red-600 px-2 py-1 font-semibold text-white hover:bg-red-700"
                              >
                                Rejeitar
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};

export default AuctioneerDashboard;
