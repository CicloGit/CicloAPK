import React, { useEffect, useMemo, useState } from 'react';
import LoadingSpinner from '../../shared/LoadingSpinner';
import { useApp } from '../../../contexts/AppContext';
import { milkCollectionService } from '../../../services/milkCollectionService';
import { MilkDepositAuthorization, MilkSampleTest, MilkTank, MilkTankEntry } from '../../../types';

const parseNumber = (value: string): number | undefined => {
  const parsed = Number(value.trim().replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : undefined;
};

const formatDateTime = (value?: string): string => {
  if (!value) return '-';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString('pt-BR');
};

const toDateTimeLocal = (value: Date): string => {
  const pad = (next: number) => String(next).padStart(2, '0');
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}T${pad(value.getHours())}:${pad(value.getMinutes())}`;
};

const formatWeight = (value: number): string => `${value.toFixed(2)} kg`;

const MilkControlView: React.FC = () => {
  const { currentUser } = useApp();
  const actor = currentUser?.name ? `${currentUser.name} (${currentUser.role})` : 'Operador de Leite';

  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [tanks, setTanks] = useState<MilkTank[]>([]);
  const [authorizations, setAuthorizations] = useState<MilkDepositAuthorization[]>([]);
  const [samples, setSamples] = useState<MilkSampleTest[]>([]);
  const [entries, setEntries] = useState<MilkTankEntry[]>([]);

  const [isSavingTank, setIsSavingTank] = useState(false);
  const [isSavingAuthorization, setIsSavingAuthorization] = useState(false);
  const [isSavingSample, setIsSavingSample] = useState(false);
  const [isSavingDeposit, setIsSavingDeposit] = useState(false);

  const [tankForm, setTankForm] = useState({
    name: '',
    capacityKg: '',
  });

  const [authorizationForm, setAuthorizationForm] = useState({
    producerName: '',
    producerCredential: '',
    badgeId: '',
    identityDocument: '',
    validUntil: toDateTimeLocal(new Date(Date.now() + 1000 * 60 * 60 * 6)),
    notes: '',
  });

  const [sampleForm, setSampleForm] = useState({
    tankId: '',
    producerCredential: '',
    batchCode: '',
    fatPercent: '',
    proteinPercent: '',
    ccs: '',
    temperatureC: '',
    result: 'APROVADA' as MilkSampleTest['result'],
    notes: '',
  });

  const [depositForm, setDepositForm] = useState({
    tankId: '',
    authorizationId: '',
    weightAddedKg: '',
    sampleTestId: '',
  });

  const activeAuthorizations = useMemo(
    () => authorizations.filter((entry) => entry.status === 'ATIVA'),
    [authorizations]
  );

  const selectedAuthorization = useMemo(
    () => authorizations.find((entry) => entry.id === depositForm.authorizationId) ?? null,
    [authorizations, depositForm.authorizationId]
  );

  const totalCapacityKg = useMemo(
    () => tanks.reduce((sum, tank) => sum + tank.capacityKg, 0),
    [tanks]
  );

  const totalCurrentWeightKg = useMemo(
    () => tanks.reduce((sum, tank) => sum + tank.currentWeightKg, 0),
    [tanks]
  );

  const refresh = async () => {
    const [loadedTanks, loadedAuthorizations, loadedSamples, loadedEntries] = await Promise.all([
      milkCollectionService.listTanks(),
      milkCollectionService.listAuthorizations(),
      milkCollectionService.listSampleTests(),
      milkCollectionService.listEntries(),
    ]);
    setTanks(loadedTanks);
    setAuthorizations(loadedAuthorizations);
    setSamples(loadedSamples);
    setEntries(loadedEntries);

    if (!sampleForm.tankId && loadedTanks.length > 0) {
      setSampleForm((prev) => ({ ...prev, tankId: loadedTanks[0].id }));
    }
    if (!depositForm.tankId && loadedTanks.length > 0) {
      setDepositForm((prev) => ({ ...prev, tankId: loadedTanks[0].id }));
    }
  };

  useEffect(() => {
    (async () => {
      setIsLoading(true);
      setLoadError(null);
      try {
        await refresh();
      } catch (loadErr) {
        setLoadError(loadErr instanceof Error ? loadErr.message : 'Falha ao carregar modulo de leite.');
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      void refresh().catch(() => {
        // silent background refresh
      });
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  const clearAlerts = () => {
    setError(null);
    setMessage(null);
  };

  const handleCreateTank = async (event: React.FormEvent) => {
    event.preventDefault();
    clearAlerts();
    const capacityKg = parseNumber(tankForm.capacityKg);
    if (!capacityKg || capacityKg <= 0) {
      setError('Informe uma capacidade valida em kg.');
      return;
    }
    setIsSavingTank(true);
    try {
      await milkCollectionService.createTank({
        actor,
        name: tankForm.name,
        capacityKg,
      });
      setTankForm({ name: '', capacityKg: '' });
      await refresh();
      setMessage('Tanque cadastrado com sucesso.');
    } catch (saveErr) {
      setError(saveErr instanceof Error ? saveErr.message : 'Falha ao cadastrar tanque.');
    } finally {
      setIsSavingTank(false);
    }
  };

  const handleCreateAuthorization = async (event: React.FormEvent) => {
    event.preventDefault();
    clearAlerts();
    setIsSavingAuthorization(true);
    try {
      await milkCollectionService.createAuthorization({
        actor,
        producerName: authorizationForm.producerName,
        producerCredential: authorizationForm.producerCredential,
        badgeId: authorizationForm.badgeId,
        identityDocument: authorizationForm.identityDocument,
        validUntil: authorizationForm.validUntil,
        notes: authorizationForm.notes || undefined,
      });
      setAuthorizationForm({
        producerName: '',
        producerCredential: '',
        badgeId: '',
        identityDocument: '',
        validUntil: toDateTimeLocal(new Date(Date.now() + 1000 * 60 * 60 * 6)),
        notes: '',
      });
      await refresh();
      setMessage('Autorizacao registrada com sucesso.');
    } catch (saveErr) {
      setError(saveErr instanceof Error ? saveErr.message : 'Falha ao registrar autorizacao.');
    } finally {
      setIsSavingAuthorization(false);
    }
  };

  const handleRegisterSample = async (event: React.FormEvent) => {
    event.preventDefault();
    clearAlerts();
    const fatPercent = parseNumber(sampleForm.fatPercent);
    const proteinPercent = parseNumber(sampleForm.proteinPercent);
    const ccs = parseNumber(sampleForm.ccs);
    const temperatureC = parseNumber(sampleForm.temperatureC);
    if (fatPercent === undefined || proteinPercent === undefined || ccs === undefined || temperatureC === undefined) {
      setError('Preencha os parametros numericos da amostra.');
      return;
    }

    setIsSavingSample(true);
    try {
      await milkCollectionService.registerSampleTest({
        actor,
        tankId: sampleForm.tankId,
        producerCredential: sampleForm.producerCredential,
        batchCode: sampleForm.batchCode,
        fatPercent,
        proteinPercent,
        ccs,
        temperatureC,
        result: sampleForm.result,
        notes: sampleForm.notes || undefined,
      });
      setSampleForm((prev) => ({
        ...prev,
        producerCredential: '',
        batchCode: '',
        fatPercent: '',
        proteinPercent: '',
        ccs: '',
        temperatureC: '',
        notes: '',
      }));
      await refresh();
      setMessage('Amostra registrada com sucesso.');
    } catch (saveErr) {
      setError(saveErr instanceof Error ? saveErr.message : 'Falha ao registrar amostra.');
    } finally {
      setIsSavingSample(false);
    }
  };

  const handleRegisterDeposit = async (event: React.FormEvent) => {
    event.preventDefault();
    clearAlerts();
    const weightAddedKg = parseNumber(depositForm.weightAddedKg);
    if (!weightAddedKg || weightAddedKg <= 0) {
      setError('Informe o peso descarregado em kg.');
      return;
    }

    setIsSavingDeposit(true);
    try {
      await milkCollectionService.registerTankDeposit({
        actor,
        tankId: depositForm.tankId,
        authorizationId: depositForm.authorizationId,
        weightAddedKg,
        sampleTestId: depositForm.sampleTestId || undefined,
      });
      setDepositForm((prev) => ({
        ...prev,
        authorizationId: '',
        weightAddedKg: '',
        sampleTestId: '',
      }));
      await refresh();
      setMessage('Descarga registrada. Peso do tanque atualizado em tempo real.');
    } catch (saveErr) {
      setError(saveErr instanceof Error ? saveErr.message : 'Falha ao registrar descarga.');
    } finally {
      setIsSavingDeposit(false);
    }
  };

  if (isLoading) {
    return <LoadingSpinner text="Carregando controle de leite..." />;
  }

  if (loadError) {
    return <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">{loadError}</div>;
  }

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-3xl font-bold text-slate-800">Controle de Leite (kg)</h2>
        <p className="text-slate-600">
          Tanques por kg, autorizacao por credencial/cracha/identidade, amostragem e descarga com peso em tempo real.
        </p>
      </header>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      {message && <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{message}</div>}

      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase font-bold text-slate-500">Tanques ativos</p>
          <p className="mt-1 text-3xl font-bold text-slate-800">{tanks.length}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase font-bold text-slate-500">Capacidade total</p>
          <p className="mt-1 text-3xl font-bold text-slate-800">{formatWeight(totalCapacityKg)}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase font-bold text-slate-500">Peso atual total</p>
          <p className="mt-1 text-3xl font-bold text-slate-800">{formatWeight(totalCurrentWeightKg)}</p>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-lg font-bold text-slate-800">1) Cadastro de tanques (kg)</h3>
        <form onSubmit={handleCreateTank} className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
          <input
            className="rounded border p-2 md:col-span-2"
            placeholder="Nome do tanque"
            value={tankForm.name}
            onChange={(event) => setTankForm((prev) => ({ ...prev, name: event.target.value }))}
            required
          />
          <input
            className="rounded border p-2"
            placeholder="Capacidade (kg)"
            value={tankForm.capacityKg}
            onChange={(event) => setTankForm((prev) => ({ ...prev, capacityKg: event.target.value }))}
            required
          />
          <button
            type="submit"
            disabled={isSavingTank}
            className="rounded bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            {isSavingTank ? 'Salvando...' : 'Cadastrar tanque'}
          </button>
        </form>

        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
          {tanks.map((tank) => {
            const occupancy = tank.capacityKg > 0 ? Math.min((tank.currentWeightKg / tank.capacityKg) * 100, 100) : 0;
            return (
              <div key={tank.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="font-semibold text-slate-800">{tank.name}</p>
                <p className="text-xs text-slate-600">
                  Atual: {formatWeight(tank.currentWeightKg)} | Capacidade: {formatWeight(tank.capacityKg)}
                </p>
                <div className="mt-2 h-2 overflow-hidden rounded bg-slate-200">
                  <div className="h-full bg-emerald-500" style={{ width: `${occupancy.toFixed(1)}%` }} />
                </div>
                <p className="mt-1 text-[11px] text-slate-500">Ocupacao: {occupancy.toFixed(1)}%</p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-lg font-bold text-slate-800">2) Autorizacao de descarga (credencial + cracha + identidade)</h3>
        <form onSubmit={handleCreateAuthorization} className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
          <input
            className="rounded border p-2"
            placeholder="Produtor"
            value={authorizationForm.producerName}
            onChange={(event) => setAuthorizationForm((prev) => ({ ...prev, producerName: event.target.value }))}
            required
          />
          <input
            className="rounded border p-2"
            placeholder="Credencial do produtor"
            value={authorizationForm.producerCredential}
            onChange={(event) => setAuthorizationForm((prev) => ({ ...prev, producerCredential: event.target.value }))}
            required
          />
          <input
            className="rounded border p-2"
            placeholder="Crachá"
            value={authorizationForm.badgeId}
            onChange={(event) => setAuthorizationForm((prev) => ({ ...prev, badgeId: event.target.value }))}
            required
          />
          <input
            className="rounded border p-2"
            placeholder="Documento de identidade"
            value={authorizationForm.identityDocument}
            onChange={(event) => setAuthorizationForm((prev) => ({ ...prev, identityDocument: event.target.value }))}
            required
          />
          <input
            type="datetime-local"
            className="rounded border p-2"
            value={authorizationForm.validUntil}
            onChange={(event) => setAuthorizationForm((prev) => ({ ...prev, validUntil: event.target.value }))}
            required
          />
          <input
            className="rounded border p-2 md:col-span-3"
            placeholder="Observacoes"
            value={authorizationForm.notes}
            onChange={(event) => setAuthorizationForm((prev) => ({ ...prev, notes: event.target.value }))}
          />
          <button
            type="submit"
            disabled={isSavingAuthorization}
            className="rounded bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            {isSavingAuthorization ? 'Autorizando...' : 'Autorizar descarga'}
          </button>
        </form>

        <div className="mt-3 space-y-2">
          {authorizations.slice(0, 8).map((authorization) => (
            <div key={authorization.id} className="rounded border border-slate-200 p-3 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-slate-800">{authorization.producerName}</span>
                <span className={`rounded px-2 py-0.5 text-xs font-semibold ${
                  authorization.status === 'ATIVA'
                    ? 'bg-emerald-100 text-emerald-700'
                    : authorization.status === 'USADA'
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-slate-100 text-slate-600'
                }`}>
                  {authorization.status}
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-600">
                Credencial: {authorization.producerCredential} | Crachá: {authorization.badgeId} | Doc: {authorization.identityDocument}
              </p>
              <p className="text-xs text-slate-500">
                Autorizado em {formatDateTime(authorization.authorizedAt)} | Valido ate {formatDateTime(authorization.validUntil)}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-lg font-bold text-slate-800">3) Coleta de amostra</h3>
        <form onSubmit={handleRegisterSample} className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-4">
          <select
            className="rounded border p-2"
            value={sampleForm.tankId}
            onChange={(event) => setSampleForm((prev) => ({ ...prev, tankId: event.target.value }))}
            required
          >
            <option value="">Tanque</option>
            {tanks.map((tank) => (
              <option key={tank.id} value={tank.id}>
                {tank.name}
              </option>
            ))}
          </select>
          <input
            className="rounded border p-2"
            placeholder="Credencial do produtor"
            value={sampleForm.producerCredential}
            onChange={(event) => setSampleForm((prev) => ({ ...prev, producerCredential: event.target.value }))}
            required
          />
          <input
            className="rounded border p-2"
            placeholder="Codigo do lote"
            value={sampleForm.batchCode}
            onChange={(event) => setSampleForm((prev) => ({ ...prev, batchCode: event.target.value }))}
            required
          />
          <select
            className="rounded border p-2 bg-white"
            value={sampleForm.result}
            onChange={(event) => setSampleForm((prev) => ({ ...prev, result: event.target.value as MilkSampleTest['result'] }))}
          >
            <option value="APROVADA">APROVADA</option>
            <option value="REJEITADA">REJEITADA</option>
            <option value="ALERTA">ALERTA</option>
          </select>
          <input
            className="rounded border p-2"
            placeholder="Gordura (%)"
            value={sampleForm.fatPercent}
            onChange={(event) => setSampleForm((prev) => ({ ...prev, fatPercent: event.target.value }))}
            required
          />
          <input
            className="rounded border p-2"
            placeholder="Proteina (%)"
            value={sampleForm.proteinPercent}
            onChange={(event) => setSampleForm((prev) => ({ ...prev, proteinPercent: event.target.value }))}
            required
          />
          <input
            className="rounded border p-2"
            placeholder="CCS"
            value={sampleForm.ccs}
            onChange={(event) => setSampleForm((prev) => ({ ...prev, ccs: event.target.value }))}
            required
          />
          <input
            className="rounded border p-2"
            placeholder="Temperatura (C)"
            value={sampleForm.temperatureC}
            onChange={(event) => setSampleForm((prev) => ({ ...prev, temperatureC: event.target.value }))}
            required
          />
          <button
            type="submit"
            disabled={isSavingSample}
            className="rounded bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            {isSavingSample ? 'Registrando...' : 'Registrar amostra'}
          </button>
        </form>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-lg font-bold text-slate-800">4) Descarga no tanque (peso em tempo real)</h3>
        <form onSubmit={handleRegisterDeposit} className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-4">
          <select
            className="rounded border p-2"
            value={depositForm.tankId}
            onChange={(event) => setDepositForm((prev) => ({ ...prev, tankId: event.target.value }))}
            required
          >
            <option value="">Tanque</option>
            {tanks.map((tank) => (
              <option key={tank.id} value={tank.id}>
                {tank.name} ({formatWeight(tank.currentWeightKg)})
              </option>
            ))}
          </select>
          <select
            className="rounded border p-2"
            value={depositForm.authorizationId}
            onChange={(event) => setDepositForm((prev) => ({ ...prev, authorizationId: event.target.value }))}
            required
          >
            <option value="">Autorizacao ativa</option>
            {activeAuthorizations.map((authorization) => (
              <option key={authorization.id} value={authorization.id}>
                {authorization.producerName} | {authorization.producerCredential} | crachá {authorization.badgeId}
              </option>
            ))}
          </select>
          <input
            className="rounded border p-2"
            placeholder="Peso descarregado (kg)"
            value={depositForm.weightAddedKg}
            onChange={(event) => setDepositForm((prev) => ({ ...prev, weightAddedKg: event.target.value }))}
            required
          />
          <select
            className="rounded border p-2"
            value={depositForm.sampleTestId}
            onChange={(event) => setDepositForm((prev) => ({ ...prev, sampleTestId: event.target.value }))}
          >
            <option value="">Amostra vinculada (opcional)</option>
            {samples.map((sample) => (
              <option key={sample.id} value={sample.id}>
                {sample.batchCode} | {sample.result}
              </option>
            ))}
          </select>
          <button
            type="submit"
            disabled={isSavingDeposit}
            className="rounded bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            {isSavingDeposit ? 'Lancando...' : 'Lancar descarga'}
          </button>
        </form>

        {selectedAuthorization && (
          <p className="mt-2 text-xs text-slate-500">
            Autorizacao selecionada: {selectedAuthorization.producerName} | credencial {selectedAuthorization.producerCredential} | crachá {selectedAuthorization.badgeId}
          </p>
        )}

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="bg-slate-100 text-xs uppercase text-slate-600">
              <tr>
                <th className="px-3 py-2 text-left">Data/hora</th>
                <th className="px-3 py-2 text-left">Produtor</th>
                <th className="px-3 py-2 text-left">Credencial</th>
                <th className="px-3 py-2 text-left">Crachá</th>
                <th className="px-3 py-2 text-left">Tanque</th>
                <th className="px-3 py-2 text-right">Antes</th>
                <th className="px-3 py-2 text-right">Adicionado</th>
                <th className="px-3 py-2 text-right">Depois</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.id} className="border-b border-slate-100">
                  <td className="px-3 py-2">{formatDateTime(entry.recordedAt)}</td>
                  <td className="px-3 py-2 font-semibold text-slate-800">{entry.producerName}</td>
                  <td className="px-3 py-2">{entry.producerCredential}</td>
                  <td className="px-3 py-2">{entry.badgeId}</td>
                  <td className="px-3 py-2">{entry.tankId}</td>
                  <td className="px-3 py-2 text-right">{formatWeight(entry.weightBeforeKg)}</td>
                  <td className="px-3 py-2 text-right font-semibold text-emerald-700">+{formatWeight(entry.weightAddedKg)}</td>
                  <td className="px-3 py-2 text-right font-semibold">{formatWeight(entry.weightAfterKg)}</td>
                </tr>
              ))}
              {entries.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-3 py-4 text-center text-slate-500">
                    Nenhuma descarga registrada.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

export default MilkControlView;
