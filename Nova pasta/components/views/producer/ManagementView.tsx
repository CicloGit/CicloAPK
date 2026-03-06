import React, { useEffect, useMemo, useState } from 'react';
import {
  InventoryItem,
  ManagementAlert,
  ManagementRecord,
  Pasture,
  ProducerAnimal,
  ProducerCultureProfile,
  ProducerSoilType,
  ProductionProject,
  PublicClimateRegion,
} from '../../../types';
import BeakerIcon from '../../icons/BeakerIcon';
import ExclamationIcon from '../../icons/ExclamationIcon';
import PlusCircleIcon from '../../icons/PlusCircleIcon';
import LoadingSpinner from '../../shared/LoadingSpinner';
import { useToast } from '../../../contexts/ToastContext';
import { managementService } from '../../../services/managementService';
import { propertyService } from '../../../services/propertyService';
import { producerOpsService } from '../../../services/producerOpsService';
import { stockService } from '../../../services/stockService';
import { cropIntelligenceService } from '../../../services/cropIntelligenceService';
import { aiAnalysisService } from '../../../services/aiAnalysisService';
import { publicMarketService } from '../../../services/publicMarketService';

const GROUPED_SPECIES = new Set<ProducerAnimal['species']>(['AVE', 'PEIXE', 'OUTRO']);

const REGION_OPTIONS: PublicClimateRegion[] = ['NORTE', 'NORDESTE', 'CENTRO_OESTE', 'SUDESTE', 'SUL'];
const SOIL_OPTIONS: ProducerSoilType[] = ['ARGILOSO', 'MISTO', 'SILTOSO', 'ARENOSO'];

const toNumber = (value: string): number => {
  const parsed = Number(String(value ?? '').replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : 0;
};

const CompactAlertItem: React.FC<{ alert: ManagementAlert; onResolve: () => void }> = ({ alert, onResolve }) => (
  <div className="flex items-center justify-between p-3 mb-2 rounded-md border-l-4 shadow-sm bg-white border-amber-500">
    <div className="flex flex-col">
      <span className="text-xs font-bold uppercase opacity-80">{alert.type} - {alert.dueDate}</span>
      <span className="font-bold text-sm">{alert.message}</span>
      <span className="text-xs mt-0.5">Local: {alert.target}</span>
    </div>
    <button onClick={onResolve} className="ml-4 px-3 py-1.5 bg-white border border-slate-200 text-xs font-bold rounded">
      Resolver
    </button>
  </div>
);

const ManagementView: React.FC = () => {
  const { addToast } = useToast();
  const [projects, setProjects] = useState<ProductionProject[]>([]);
  const [pastures, setPastures] = useState<Pasture[]>([]);
  const [history, setHistory] = useState<ManagementRecord[]>([]);
  const [alerts, setAlerts] = useState<ManagementAlert[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [animals, setAnimals] = useState<ProducerAnimal[]>([]);
  const [cultures, setCultures] = useState<ProducerCultureProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const [animalForm, setAnimalForm] = useState({
    species: 'BOVINO' as ProducerAnimal['species'],
    category: '',
    earringCode: '',
    currentWeightKg: '',
    pastureId: '',
    headcount: '',
    totalWeightKg: '',
    phase: '',
  });
  const [slaughterForm, setSlaughterForm] = useState({
    animalId: '',
    returnPastureId: '',
    notes: '',
  });
  const [isRegisteringSlaughter, setIsRegisteringSlaughter] = useState(false);
  const [cultureForm, setCultureForm] = useState({
    name: '',
    species: '',
    pastureId: '',
    region: 'SUDESTE' as PublicClimateRegion,
    soilType: 'MISTO' as ProducerSoilType,
    plantedAt: new Date().toISOString().slice(0, 10),
  });
  const [managementForm, setManagementForm] = useState({
    target: '',
    product: '',
    quantity: '',
    cultureId: '',
    region: 'SUDESTE' as PublicClimateRegion,
    soilType: 'MISTO' as ProducerSoilType,
    rainfallMm: '0',
    fertilizationKgHa: '0',
    animalHandlingDays: '0',
    estimatedCost: '0',
  });
  const [analysisForm, setAnalysisForm] = useState({
    cultureId: '',
    fertilizationKgHa: '0',
    animalHandlingDays: '0',
  });

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      setLoadError(null);
      try {
        const [workspace, loadedHistory, loadedAlerts, loadedInventory, loadedAnimals, loadedCultures] = await Promise.all([
          propertyService.loadWorkspace(),
          managementService.listHistory(),
          managementService.listAlerts(),
          stockService.listInventory(),
          producerOpsService.listAnimals(),
          cropIntelligenceService.listCultures(),
        ]);
        setProjects(workspace.activities);
        setPastures(workspace.pastures);
        setHistory(loadedHistory);
        setAlerts(loadedAlerts);
        setInventory(loadedInventory);
        setAnimals(loadedAnimals);
        setCultures(loadedCultures);
      } catch {
        setLoadError('Nao foi possivel carregar o modulo de manejo.');
      } finally {
        setIsLoading(false);
      }
    };
    void load();
  }, []);

  const activeProject = projects[0];
  const recentHistory = useMemo(() => history.slice(0, 8), [history]);
  const activeUnitAnimals = useMemo(
    () =>
      animals.filter(
        (animal) => animal.trackingMode === 'UNIT' && (animal.lifecycleStatus ?? 'ACTIVE') !== 'CYCLE_CLOSED'
      ),
    [animals]
  );
  const selectedCulture = useMemo(() => cultures.find((c) => c.id === managementForm.cultureId) ?? null, [cultures, managementForm.cultureId]);
  const selectedCultureForAnalysis = useMemo(() => cultures.find((c) => c.id === analysisForm.cultureId) ?? null, [cultures, analysisForm.cultureId]);

  const resolveAlert = (alert: ManagementAlert) => {
    setManagementForm((prev) => ({ ...prev, target: alert.target }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const saveAnimal = async () => {
    try {
      if (GROUPED_SPECIES.has(animalForm.species)) {
        await producerOpsService.createTrackedWeightLot({
          name: `${animalForm.category || animalForm.species} ${new Date().toLocaleDateString('pt-BR')}`,
          category: animalForm.category || animalForm.species,
          species: animalForm.species,
          phase: animalForm.phase || 'INICIAL',
          headcount: Math.max(1, toNumber(animalForm.headcount)),
          totalWeightKg: Math.max(1, toNumber(animalForm.totalWeightKg)),
          pastureId: animalForm.pastureId || undefined,
        });
      } else {
        if (!animalForm.earringCode.trim()) throw new Error('Informe brinco/chip para cadastro unitario.');
        await producerOpsService.createAnimal({
          earringCode: animalForm.earringCode,
          species: animalForm.species,
          category: animalForm.category || 'GERAL',
          trackingMode: 'UNIT',
          currentWeightKg: toNumber(animalForm.currentWeightKg) || undefined,
          pastureId: animalForm.pastureId || undefined,
          lotId: undefined,
          parentAnimalIds: [],
        });
      }
      setAnimals(await producerOpsService.listAnimals());
      addToast({ type: 'success', title: 'Cadastro animal salvo', message: 'Registro persistido no Firebase real.' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha no cadastro animal.';
      addToast({ type: 'error', title: 'Falha no cadastro', message });
    }
  };

  const registerSlaughterAndReturnCollar = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!slaughterForm.animalId.trim()) {
      addToast({ type: 'warning', title: 'Animal obrigatorio', message: 'Selecione o animal para registrar o abate.' });
      return;
    }

    setIsRegisteringSlaughter(true);
    try {
      const updated = await producerOpsService.registerSlaughterAndReturnCollar({
        animalId: slaughterForm.animalId,
        returnPastureId: slaughterForm.returnPastureId || undefined,
        notes: slaughterForm.notes,
      });
      const refreshedAnimals = await producerOpsService.listAnimals();
      setAnimals(refreshedAnimals);
      setSlaughterForm({ animalId: '', returnPastureId: '', notes: '' });
      addToast({
        type: 'success',
        title: 'Abate registrado',
        message: `Colar ${updated.earringCode} liberado para recadastro em novos lotes.`,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha ao registrar abate e devolucao do colar.';
      addToast({ type: 'error', title: 'Falha no abate', message });
    } finally {
      setIsRegisteringSlaughter(false);
    }
  };

  const saveCulture = async () => {
    try {
      const created = await cropIntelligenceService.createCulture({
        name: cultureForm.name,
        species: cultureForm.species,
        pastureId: cultureForm.pastureId,
        region: cultureForm.region,
        soilType: cultureForm.soilType,
        plantedAt: cultureForm.plantedAt,
      });
      setCultures((prev) => [created, ...prev]);
      addToast({ type: 'success', title: 'Cultura cadastrada', message: 'Talhao atualizado com cultura monitorada.' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha no cadastro de cultura.';
      addToast({ type: 'error', title: 'Falha no cadastro', message });
    }
  };

  const analyzeCulturePhoto = async () => {
    if (!selectedCultureForAnalysis || !photoFile) {
      addToast({ type: 'warning', title: 'Dados incompletos', message: 'Selecione a cultura e anexe uma foto.' });
      return;
    }

    setIsAnalyzing(true);
    try {
      let rainfallMm = selectedCultureForAnalysis.lastRainMm;
      try {
        const forecast = await publicMarketService.getClimateForecast(selectedCultureForAnalysis.region);
        rainfallMm = forecast.days.slice(0, 7).reduce((sum, day) => sum + Number(day.precipitationMm ?? 0), 0);
      } catch {
        // Mantem ultimo acumulado conhecido.
      }

      const daysFromPlanting = Math.max(0, Math.floor((Date.now() - new Date(selectedCultureForAnalysis.plantedAt).getTime()) / (1000 * 60 * 60 * 24)));
      const season = cropIntelligenceService.resolveSeason();

      const analysis = await aiAnalysisService.runAnalysis({
        imageName: photoFile.name,
        context: {
          cultureName: selectedCultureForAnalysis.name,
          soilType: selectedCultureForAnalysis.soilType,
          region: selectedCultureForAnalysis.region,
          season,
          rainfallMm,
          fertilizationKgHa: toNumber(analysisForm.fertilizationKgHa),
          animalHandlingDays: toNumber(analysisForm.animalHandlingDays),
          daysFromPlanting,
        },
      });

      const fallback = cropIntelligenceService.calculateCultureMetrics({
        stage: analysis.stage ?? selectedCultureForAnalysis.currentStage,
        soilType: selectedCultureForAnalysis.soilType,
        rainfallMm,
        season,
        fertilizationKgHa: toNumber(analysisForm.fertilizationKgHa),
        animalHandlingDays: toNumber(analysisForm.animalHandlingDays),
      });

      await cropIntelligenceService.registerCulturePhotoAnalysis({
        culture: selectedCultureForAnalysis,
        photoFile,
        diagnosis: analysis.diagnosis,
        confidence: analysis.confidence,
        recommendation: analysis.recommendation,
        stage: analysis.stage ?? selectedCultureForAnalysis.currentStage,
        condition: analysis.condition ?? fallback.condition,
        nutrientN: analysis.nutrientN ?? fallback.nutrientN,
        nutrientP: analysis.nutrientP ?? fallback.nutrientP,
        nutrientK: analysis.nutrientK ?? fallback.nutrientK,
        nutrientIndex: analysis.nutrientIndex ?? fallback.nutrientIndex,
        estimatedProductivityKgHa: analysis.estimatedProductivityKgHa ?? fallback.estimatedProductivityKgHa,
        rainfallMm,
        season: analysis.season ?? season,
        region: analysis.region ?? selectedCultureForAnalysis.region,
        soilType: selectedCultureForAnalysis.soilType,
      });

      setCultures(await cropIntelligenceService.listCultures());
      addToast({ type: 'success', title: 'Analise concluida', message: 'Estagio e nutrientes atualizados no talhao.' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha na analise da cultura.';
      addToast({ type: 'error', title: 'Falha na analise', message });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const registerManagement = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!managementForm.target || !managementForm.product || !managementForm.quantity) return;
    try {
      const season = cropIntelligenceService.resolveSeason();
      const metrics = cropIntelligenceService.calculateCultureMetrics({
        stage: selectedCulture?.currentStage ?? 'VEGETATIVO',
        soilType: managementForm.soilType,
        rainfallMm: toNumber(managementForm.rainfallMm),
        season,
        fertilizationKgHa: toNumber(managementForm.fertilizationKgHa),
        animalHandlingDays: toNumber(managementForm.animalHandlingDays),
      });
      const record = await managementService.createHistoryRecord({
        target: managementForm.target,
        actionType: 'Manejo',
        product: managementForm.product,
        quantity: managementForm.quantity,
        executor: 'Produtor',
        targetType: selectedCulture ? 'CULTURE' : 'PASTURE',
        pastureId: selectedCulture?.pastureId,
        cultureId: selectedCulture?.id,
        climateRegion: managementForm.region,
        soilType: managementForm.soilType,
        season,
        rainfallMm: toNumber(managementForm.rainfallMm),
        fertilizationKgHa: toNumber(managementForm.fertilizationKgHa),
        animalHandlingDays: toNumber(managementForm.animalHandlingDays),
        estimatedProductivityKgHa: metrics.estimatedProductivityKgHa,
        estimatedNutrientIndex: metrics.nutrientIndex,
        recommendations: [metrics.condition === 'CRITICA' ? 'Intervencao imediata.' : 'Monitoramento semanal.'],
      });
      setHistory((prev) => [record, ...prev]);
      addToast({ type: 'success', title: 'Manejo registrado', message: 'Simulacao gravada com dados reais.' });
    } catch {
      addToast({ type: 'error', title: 'Falha no registro', message: 'Nao foi possivel registrar o manejo.' });
    }
  };

  if (isLoading) return <LoadingSpinner text="Carregando manejo..." />;
  if (loadError) return <div className="p-6 bg-red-50 text-red-700 border border-red-200 rounded-lg">{loadError}</div>;

  return (
    <div className="max-w-6xl mx-auto pb-20 space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-800 flex items-center">
          <BeakerIcon className="h-6 w-6 mr-2 text-emerald-600" />
          Manejo Integrado do Produtor
        </h2>
        <p className="text-sm text-slate-500">Projeto ativo: {activeProject?.name || 'Nao selecionado'}</p>
      </div>

      <div>
        <h3 className="text-xs font-bold text-slate-500 uppercase mb-2 flex items-center">
          <ExclamationIcon className="h-4 w-4 mr-1" /> Tarefas Pendentes ({alerts.length})
        </h3>
        {alerts.map((alert) => <CompactAlertItem key={alert.id} alert={alert} onResolve={() => resolveAlert(alert)} />)}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-3">
          <h3 className="font-semibold text-slate-800">Cadastro de Animais</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <select value={animalForm.species} onChange={(event) => setAnimalForm((prev) => ({ ...prev, species: event.target.value as ProducerAnimal['species'] }))} className="p-2 border rounded">
              <option value="BOVINO">Bovino</option><option value="SUINO">Suino</option><option value="OVINO">Ovino</option><option value="CAPRINO">Caprino</option><option value="EQUINO">Equino</option><option value="AVE">Aves</option><option value="PEIXE">Peixes</option><option value="OUTRO">Outros</option>
            </select>
            <input value={animalForm.category} onChange={(event) => setAnimalForm((prev) => ({ ...prev, category: event.target.value }))} className="p-2 border rounded" placeholder="Categoria" />
            {!GROUPED_SPECIES.has(animalForm.species) && <input value={animalForm.earringCode} onChange={(event) => setAnimalForm((prev) => ({ ...prev, earringCode: event.target.value }))} className="p-2 border rounded" placeholder="Brinco/chip" />}
            {!GROUPED_SPECIES.has(animalForm.species) && <input type="number" value={animalForm.currentWeightKg} onChange={(event) => setAnimalForm((prev) => ({ ...prev, currentWeightKg: event.target.value }))} className="p-2 border rounded" placeholder="Peso (kg)" />}
            {GROUPED_SPECIES.has(animalForm.species) && <input value={animalForm.phase} onChange={(event) => setAnimalForm((prev) => ({ ...prev, phase: event.target.value }))} className="p-2 border rounded" placeholder="Fase" />}
            {GROUPED_SPECIES.has(animalForm.species) && <input type="number" value={animalForm.headcount} onChange={(event) => setAnimalForm((prev) => ({ ...prev, headcount: event.target.value }))} className="p-2 border rounded" placeholder="Quantidade" />}
            {GROUPED_SPECIES.has(animalForm.species) && <input type="number" value={animalForm.totalWeightKg} onChange={(event) => setAnimalForm((prev) => ({ ...prev, totalWeightKg: event.target.value }))} className="p-2 border rounded" placeholder="Peso total (kg)" />}
            <select value={animalForm.pastureId} onChange={(event) => setAnimalForm((prev) => ({ ...prev, pastureId: event.target.value }))} className="p-2 border rounded">
              <option value="">Talhao/Pasto</option>
              {pastures.map((pasture) => <option key={pasture.id} value={pasture.id}>{pasture.name}</option>)}
            </select>
          </div>
          <button onClick={() => void saveAnimal()} className="px-3 py-2 bg-emerald-600 text-white rounded font-semibold">Salvar animal/lote</button>
          <form onSubmit={registerSlaughterAndReturnCollar} className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-2">
            <p className="text-xs font-bold uppercase text-slate-600">Abate e devolucao de colar</p>
            <select
              value={slaughterForm.animalId}
              onChange={(event) => setSlaughterForm((prev) => ({ ...prev, animalId: event.target.value }))}
              className="w-full p-2 border rounded text-sm bg-white"
            >
              <option value="">Selecionar animal unitario</option>
              {activeUnitAnimals.map((animal) => (
                <option key={animal.id} value={animal.id}>
                  {animal.earringCode} | {animal.species} | {animal.category}
                </option>
              ))}
            </select>
            <select
              value={slaughterForm.returnPastureId}
              onChange={(event) => setSlaughterForm((prev) => ({ ...prev, returnPastureId: event.target.value }))}
              className="w-full p-2 border rounded text-sm bg-white"
            >
              <option value="">Local de devolucao (opcional)</option>
              {pastures.map((pasture) => (
                <option key={pasture.id} value={pasture.id}>
                  {pasture.name}
                </option>
              ))}
            </select>
            <input
              value={slaughterForm.notes}
              onChange={(event) => setSlaughterForm((prev) => ({ ...prev, notes: event.target.value }))}
              className="w-full p-2 border rounded text-sm"
              placeholder="Observacao do abate/devolucao (opcional)"
            />
            <button
              type="submit"
              disabled={isRegisteringSlaughter}
              className="px-3 py-2 bg-amber-600 text-white rounded font-semibold disabled:opacity-60"
            >
              {isRegisteringSlaughter ? 'Registrando...' : 'Registrar abate e devolver colar'}
            </button>
            <p className="text-[11px] text-slate-500">
              O ciclo do animal e encerrado e o mesmo numero de colar fica disponivel para novo cadastro futuro.
            </p>
          </form>
          <p className="text-xs text-slate-500">Total cadastrado: {animals.length}</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-3">
          <h3 className="font-semibold text-slate-800">Cadastro de Culturas</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <input value={cultureForm.name} onChange={(event) => setCultureForm((prev) => ({ ...prev, name: event.target.value }))} className="p-2 border rounded" placeholder="Nome" />
            <input value={cultureForm.species} onChange={(event) => setCultureForm((prev) => ({ ...prev, species: event.target.value }))} className="p-2 border rounded" placeholder="Especie" />
            <select value={cultureForm.pastureId} onChange={(event) => setCultureForm((prev) => ({ ...prev, pastureId: event.target.value }))} className="p-2 border rounded">
              <option value="">Talhao/Pasto</option>
              {pastures.map((pasture) => <option key={pasture.id} value={pasture.id}>{pasture.name}</option>)}
            </select>
            <select value={cultureForm.region} onChange={(event) => setCultureForm((prev) => ({ ...prev, region: event.target.value as PublicClimateRegion }))} className="p-2 border rounded">
              {REGION_OPTIONS.map((region) => <option key={region} value={region}>{region}</option>)}
            </select>
            <select value={cultureForm.soilType} onChange={(event) => setCultureForm((prev) => ({ ...prev, soilType: event.target.value as ProducerSoilType }))} className="p-2 border rounded">
              {SOIL_OPTIONS.map((soil) => <option key={soil} value={soil}>{soil}</option>)}
            </select>
            <input type="date" value={cultureForm.plantedAt} onChange={(event) => setCultureForm((prev) => ({ ...prev, plantedAt: event.target.value }))} className="p-2 border rounded" />
          </div>
          <button onClick={() => void saveCulture()} className="px-3 py-2 bg-indigo-600 text-white rounded font-semibold">Salvar cultura</button>
          <p className="text-xs text-slate-500">Total de culturas: {cultures.length}</p>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-3">
        <h3 className="font-semibold text-slate-800">Analise por Foto (IA) e Atualizacao de Estagio</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
          <select value={analysisForm.cultureId} onChange={(event) => setAnalysisForm((prev) => ({ ...prev, cultureId: event.target.value }))} className="p-2 border rounded">
            <option value="">Selecionar cultura</option>
            {cultures.map((culture) => <option key={culture.id} value={culture.id}>{culture.name} - {culture.species}</option>)}
          </select>
          <input type="number" value={analysisForm.fertilizationKgHa} onChange={(event) => setAnalysisForm((prev) => ({ ...prev, fertilizationKgHa: event.target.value }))} className="p-2 border rounded" placeholder="Adubacao kg/ha" />
          <input type="number" value={analysisForm.animalHandlingDays} onChange={(event) => setAnalysisForm((prev) => ({ ...prev, animalHandlingDays: event.target.value }))} className="p-2 border rounded" placeholder="Manejo animal dias" />
          <input type="file" accept="image/*" onChange={(event) => setPhotoFile(event.target.files?.[0] ?? null)} className="p-2 border rounded bg-white" />
        </div>
        <button onClick={() => void analyzeCulturePhoto()} disabled={isAnalyzing} className="px-3 py-2 bg-emerald-600 text-white rounded font-semibold disabled:opacity-60">
          {isAnalyzing ? 'Analisando...' : 'Analisar e atualizar talhao'}
        </button>
        {selectedCultureForAnalysis && <p className="text-xs text-slate-600">Estagio atual: {selectedCultureForAnalysis.currentStage} | Condicao: {selectedCultureForAnalysis.currentCondition}</p>}
      </div>

      <form onSubmit={registerManagement} className="bg-white border border-slate-200 rounded-lg p-4 space-y-3">
        <h3 className="font-semibold text-slate-800">Simulacao de Manejo (capim/cultura + clima + solo + epoca)</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
          <input name="target" value={managementForm.target} onChange={(event) => setManagementForm((prev) => ({ ...prev, target: event.target.value }))} className="p-2 border rounded" placeholder="Talhao/pasto alvo" />
          <select name="cultureId" value={managementForm.cultureId} onChange={(event) => setManagementForm((prev) => ({ ...prev, cultureId: event.target.value }))} className="p-2 border rounded">
            <option value="">Sem cultura vinculada</option>
            {cultures.map((culture) => <option key={culture.id} value={culture.id}>{culture.name}</option>)}
          </select>
          <select name="region" value={managementForm.region} onChange={(event) => setManagementForm((prev) => ({ ...prev, region: event.target.value as PublicClimateRegion }))} className="p-2 border rounded">
            {REGION_OPTIONS.map((region) => <option key={region} value={region}>{region}</option>)}
          </select>
          <select name="soilType" value={managementForm.soilType} onChange={(event) => setManagementForm((prev) => ({ ...prev, soilType: event.target.value as ProducerSoilType }))} className="p-2 border rounded">
            {SOIL_OPTIONS.map((soil) => <option key={soil} value={soil}>{soil}</option>)}
          </select>
          <select name="product" value={managementForm.product} onChange={(event) => setManagementForm((prev) => ({ ...prev, product: event.target.value }))} className="p-2 border rounded">
            <option value="">Produto/insumo</option>
            {inventory.map((item) => <option key={item.id} value={item.name}>{item.name} ({item.quantity} {item.unit})</option>)}
          </select>
          <input name="quantity" value={managementForm.quantity} onChange={(event) => setManagementForm((prev) => ({ ...prev, quantity: event.target.value }))} className="p-2 border rounded" placeholder="Quantidade" />
          <input type="number" name="rainfallMm" value={managementForm.rainfallMm} onChange={(event) => setManagementForm((prev) => ({ ...prev, rainfallMm: event.target.value }))} className="p-2 border rounded" placeholder="Chuva mm" />
          <input type="number" name="fertilizationKgHa" value={managementForm.fertilizationKgHa} onChange={(event) => setManagementForm((prev) => ({ ...prev, fertilizationKgHa: event.target.value }))} className="p-2 border rounded" placeholder="Adubacao kg/ha" />
          <input type="number" name="animalHandlingDays" value={managementForm.animalHandlingDays} onChange={(event) => setManagementForm((prev) => ({ ...prev, animalHandlingDays: event.target.value }))} className="p-2 border rounded" placeholder="Manejo animal dias" />
          <input type="number" name="estimatedCost" value={managementForm.estimatedCost} onChange={(event) => setManagementForm((prev) => ({ ...prev, estimatedCost: event.target.value }))} className="p-2 border rounded" placeholder="Custo (R$)" />
        </div>
        <button type="submit" className="w-full py-3 bg-slate-800 text-white rounded font-bold flex items-center justify-center">
          <PlusCircleIcon className="h-5 w-5 mr-2" /> Registrar manejo
        </button>
      </form>

      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-3 border-b border-slate-100 text-sm font-bold text-slate-700">Ultimos registros</div>
        <ul className="divide-y divide-slate-100">
          {recentHistory.map((record) => (
            <li key={record.id} className="p-3">
              <p className="text-sm font-semibold text-slate-800">{record.actionType} - {record.target}</p>
              <p className="text-xs text-slate-500">{record.product} | {record.quantity} | {record.date}</p>
              {(record.estimatedProductivityKgHa || record.estimatedNutrientIndex) && (
                <p className="text-xs text-slate-600">
                  Prod.: {record.estimatedProductivityKgHa?.toFixed(0) ?? '-'} kg/ha | Nutriente: {record.estimatedNutrientIndex?.toFixed(1) ?? '-'}
                </p>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default ManagementView;
