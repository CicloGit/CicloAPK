import React, { useEffect, useMemo, useState } from 'react';
import { SECTOR_VARIETIES } from '../../config/propertyReferenceData';
import {
  Pasture,
  ProductionProject,
  ProductionSector,
  Property,
  ProducerAnimal,
  ProducerAnimalLot,
} from '../../types';
import PropertyMapView from './maps/PropertyMapView';
import { useToast } from '../../contexts/ToastContext';
import { propertyService } from '../../services/propertyService';
import { producerOpsService } from '../../services/producerOpsService';
import { immutableAuditService } from '../../services/immutableAuditService';
import SkeletonLoader from '../shared/SkeletonLoader';

type PropertyTab = 'PROPERTY' | 'PLOTS' | 'ANIMALS' | 'MAP';
type AnimalTab = 'UNIT' | 'WEIGHT' | 'ASSEMBLE';

const UNITARY_SPECIES: ProducerAnimal['species'][] = ['BOVINO', 'SUINO', 'OVINO', 'CAPRINO', 'EQUINO'];
const WEIGHT_SPECIES: ProducerAnimal['species'][] = ['AVE', 'PEIXE', 'OUTRO'];

const toNumber = (value: string): number => {
  const parsed = Number(String(value ?? '').replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : 0;
};

const maybeProofUrl = (value: string): string | undefined => {
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }
  return /^https?:\/\/\S+$/i.test(trimmed) ? trimmed : undefined;
};

const formatSpecies = (species: ProducerAnimal['species']): string => {
  switch (species) {
    case 'BOVINO':
      return 'Bovino';
    case 'SUINO':
      return 'Suino';
    case 'OVINO':
      return 'Ovino';
    case 'CAPRINO':
      return 'Caprino';
    case 'EQUINO':
      return 'Equino';
    case 'AVE':
      return 'Ave';
    case 'PEIXE':
      return 'Peixe';
    default:
      return 'Outro';
  }
};

const PropertyRegistrationView: React.FC = () => {
  const { addToast } = useToast();

  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [activeTab, setActiveTab] = useState<PropertyTab>('PROPERTY');
  const [animalTab, setAnimalTab] = useState<AnimalTab>('UNIT');

  const [propertyData, setPropertyData] = useState<Property>(propertyService.getEmptyProperty());
  const [editableData, setEditableData] = useState<Property>(propertyService.getEmptyProperty());
  const [isEditing, setIsEditing] = useState(false);

  const [activities, setActivities] = useState<ProductionProject[]>([]);
  const [newActivity, setNewActivity] = useState<{
    sector: ProductionSector | '';
    variety: string;
    name: string;
    volume: string;
  }>({ sector: '', variety: '', name: '', volume: '' });
  const [pendingDeleteActivity, setPendingDeleteActivity] = useState<ProductionProject | null>(null);
  const [deletePassword, setDeletePassword] = useState('');

  const [pastures, setPastures] = useState<Pasture[]>([]);
  const [divisionForm, setDivisionForm] = useState({
    name: '',
    lat: '',
    long: '',
    cultivar: '',
    stockingRate: '',
    forageKgHa: '',
    entryDate: '',
    exitDate: '',
    evidenceRef: '',
  });
  const [plotCoordinates, setPlotCoordinates] = useState<Array<{ lat: string; long: string }>>([]);
  const [realMapProvider, setRealMapProvider] = useState<'GOOGLE_MAPS' | 'GOOGLE_EARTH' | 'ARCGIS'>('GOOGLE_MAPS');

  const [animals, setAnimals] = useState<ProducerAnimal[]>([]);
  const [animalLots, setAnimalLots] = useState<ProducerAnimalLot[]>([]);
  const [unitAnimalForm, setUnitAnimalForm] = useState({
    species: 'BOVINO' as ProducerAnimal['species'],
    category: '',
    earringCode: '',
    currentWeightKg: '',
    pastureId: '',
    parentAnimalIds: [] as string[],
    evidenceRef: '',
  });
  const [weightLotForm, setWeightLotForm] = useState({
    name: '',
    category: '',
    species: 'PEIXE' as ProducerAnimal['species'],
    phase: 'INICIAL',
    ageInDays: '',
    headcount: '',
    totalWeightKg: '',
    pastureId: '',
    distributionArea: '',
    evidenceRef: '',
  });
  const [assembleLotForm, setAssembleLotForm] = useState({
    name: '',
    category: '',
    pastureId: '',
    distributionArea: '',
    selectedAnimalIds: [] as string[],
    evidenceRef: '',
  });

  const [carInput, setCarInput] = useState('');
  const [carSearchStatus, setCarSearchStatus] = useState<'IDLE' | 'LOADING' | 'FOUND' | 'ERROR'>('IDLE');
  const [sicarData, setSicarData] = useState<Record<string, string> | null>(null);

  useEffect(() => {
    let isMounted = true;
    const loadWorkspace = async () => {
      try {
        const [workspace, loadedAnimals, loadedLots] = await Promise.all([
          propertyService.loadWorkspace(),
          producerOpsService.listAnimals().catch(() => []),
          producerOpsService.listAnimalLots().catch(() => []),
        ]);
        if (!isMounted) {
          return;
        }
        setPropertyData(workspace.property);
        setEditableData(workspace.property);
        setActivities(workspace.activities);
        setPastures(workspace.pastures);
        setAnimals(loadedAnimals);
        setAnimalLots(loadedLots);
      } catch {
        if (isMounted) {
          addToast({
            type: 'error',
            title: 'Falha de carga',
            message: 'Nao foi possivel carregar cadastro de propriedade.',
          });
        }
      } finally {
        if (isMounted) {
          setIsBootstrapping(false);
        }
      }
    };

    void loadWorkspace();
    return () => {
      isMounted = false;
    };
  }, [addToast]);

  const availableVarieties = useMemo(() => {
    if (!newActivity.sector) {
      return [];
    }
    return SECTOR_VARIETIES[newActivity.sector] ?? [];
  }, [newActivity.sector]);

  const unassignedUnitAnimals = useMemo(
    () =>
      animals.filter(
        (animal) =>
          animal.trackingMode === 'UNIT' &&
          !animal.lotId &&
          (animal.lifecycleStatus ?? 'ACTIVE') === 'ACTIVE' &&
          animal.status !== 'SOLD'
      ),
    [animals]
  );

  const selectedAnimalsForAssembly = useMemo(
    () => unassignedUnitAnimals.filter((animal) => assembleLotForm.selectedAnimalIds.includes(animal.id)),
    [assembleLotForm.selectedAnimalIds, unassignedUnitAnimals]
  );

  const selectedAssemblyWeight = useMemo(
    () => selectedAnimalsForAssembly.reduce((sum, animal) => sum + Number(animal.currentWeightKg ?? 0), 0),
    [selectedAnimalsForAssembly]
  );

  const coordinatePreview = useMemo(() => {
    if (plotCoordinates.length < 3) {
      return [] as Array<{ x: number; y: number }>;
    }

    const parsed = plotCoordinates
      .map((point) => ({
        lat: Number(String(point.lat).replace(',', '.')),
        lon: Number(String(point.long).replace(',', '.')),
      }))
      .filter((point) => Number.isFinite(point.lat) && Number.isFinite(point.lon));

    if (parsed.length < 3) {
      return [] as Array<{ x: number; y: number }>;
    }

    const minLat = Math.min(...parsed.map((point) => point.lat));
    const maxLat = Math.max(...parsed.map((point) => point.lat));
    const minLon = Math.min(...parsed.map((point) => point.lon));
    const maxLon = Math.max(...parsed.map((point) => point.lon));

    return parsed.map((point) => ({
      x: maxLon === minLon ? 50 : ((point.lon - minLon) / (maxLon - minLon)) * 90 + 5,
      y: maxLat === minLat ? 50 : 95 - ((point.lat - minLat) / (maxLat - minLat)) * 90,
    }));
  }, [plotCoordinates]);

  const plotCenter = useMemo(() => {
    if (plotCoordinates.length === 0) {
      return null;
    }
    const parsed = plotCoordinates
      .map((point) => ({
        lat: Number(String(point.lat).replace(',', '.')),
        lon: Number(String(point.long).replace(',', '.')),
      }))
      .filter((point) => Number.isFinite(point.lat) && Number.isFinite(point.lon));

    if (parsed.length === 0) {
      return null;
    }

    const avgLat = parsed.reduce((sum, point) => sum + point.lat, 0) / parsed.length;
    const avgLon = parsed.reduce((sum, point) => sum + point.lon, 0) / parsed.length;
    return { lat: avgLat, lon: avgLon };
  }, [plotCoordinates]);

  const realMapLinks = useMemo(() => {
    if (!plotCenter) {
      return null;
    }
    const lat = plotCenter.lat.toFixed(6);
    const lon = plotCenter.lon.toFixed(6);
    return {
      googleMaps: `https://www.google.com/maps?q=${lat},${lon}`,
      googleEarth: `https://earth.google.com/web/search/${lat},${lon}`,
      arcgis: `https://www.arcgis.com/home/webmap/viewer.html?center=${lon},${lat}&level=15`,
      googleMapsEmbed: `https://maps.google.com/maps?q=${lat},${lon}&z=15&output=embed`,
    };
  }, [plotCenter]);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  const pastureNameById = (pastureId?: string) => {
    if (!pastureId) return 'Nao informado';
    return pastures.find((pasture) => pasture.id === pastureId)?.name ?? pastureId;
  };

  const safelyAppendAudit = async (params: {
    action: string;
    details: string;
    evidenceRef?: string;
    metadata?: Record<string, unknown>;
  }) => {
    try {
      await immutableAuditService.append({
        actor: 'Produtor',
        action: params.action,
        details: params.details,
        proofUrl: maybeProofUrl(params.evidenceRef ?? ''),
        metadata: {
          evidenceRef: params.evidenceRef?.trim() || undefined,
          ...(params.metadata ?? {}),
        },
      });
    } catch {
      addToast({
        type: 'warning',
        title: 'Auditoria pendente',
        message: 'Registro salvo, mas a trilha imutavel nao foi gravada agora.',
      });
    }
  };

  const refreshAnimalsAndLots = async () => {
    const [loadedAnimals, loadedLots] = await Promise.all([
      producerOpsService.listAnimals(),
      producerOpsService.listAnimalLots(),
    ]);
    setAnimals(loadedAnimals);
    setAnimalLots(loadedLots);
  };

  const saveProperty = async () => {
    const result = await propertyService.updateProperty(editableData);
    if (!result.success) {
      addToast({
        type: 'error',
        title: 'Erro de validacao',
        message: result.error || 'Campos invalidos.',
      });
      return;
    }

    setPropertyData(editableData);
    setIsEditing(false);
    addToast({ type: 'success', title: 'Dados salvos', message: 'Cadastro da propriedade atualizado.' });
    await safelyAppendAudit({
      action: 'PROPERTY_UPDATED',
      details: `Propriedade ${editableData.name} atualizada (CAR ${editableData.carNumber}).`,
      metadata: {
        propertyId: editableData.id,
        totalArea: editableData.totalArea,
        animalCount: editableData.animalCount,
      },
    });
  };

  const handleSaveActivity = async () => {
    if (!newActivity.sector) {
      addToast({ type: 'warning', title: 'Dados incompletos', message: 'Selecione o setor da atividade.' });
      return;
    }

    const result = await propertyService.saveActivity({
      ...newActivity,
      sector: newActivity.sector,
    });
    if (!result.success || !result.newProject) {
      addToast({
        type: 'warning',
        title: 'Dados incompletos',
        message: result.message || 'Preencha os campos obrigatorios.',
      });
      return;
    }

    setActivities((prev) => [...prev, result.newProject!]);
    setNewActivity({ sector: '', variety: '', name: '', volume: '' });
    addToast({ type: 'success', title: 'Atividade cadastrada', message: 'Atividade vinculada a propriedade.' });
  };

  const handleDeleteActivity = async () => {
    if (!pendingDeleteActivity) {
      return;
    }

    const result = await propertyService.deleteActivity(pendingDeleteActivity.id, deletePassword);
    if (!result.success) {
      addToast({
        type: 'error',
        title: 'Falha na exclusao',
        message: result.message || 'Nao foi possivel remover a atividade.',
      });
      return;
    }

    setActivities((prev) => prev.filter((activity) => activity.id !== pendingDeleteActivity.id));
    addToast({ type: 'success', title: 'Atividade excluida', message: 'Registro removido com sucesso.' });
    await safelyAppendAudit({
      action: 'ACTIVITY_DELETED',
      details: `Atividade ${pendingDeleteActivity.name} removida no cadastro da propriedade.`,
      metadata: { activityId: pendingDeleteActivity.id },
    });
    setPendingDeleteActivity(null);
    setDeletePassword('');
  };

  const handleAddCoordinatePoint = () => {
    const latValue = divisionForm.lat.replace(',', '.').trim();
    const longValue = divisionForm.long.replace(',', '.').trim();
    const lat = Number(latValue);
    const long = Number(longValue);

    if (!Number.isFinite(lat) || !Number.isFinite(long)) {
      addToast({
        type: 'warning',
        title: 'Coordenada invalida',
        message: 'Informe latitude e longitude validas para adicionar ao desenho do talhao.',
      });
      return;
    }

    setPlotCoordinates((prev) => [...prev, { lat: lat.toFixed(6), long: long.toFixed(6) }]);
    setDivisionForm((prev) => ({ ...prev, lat: '', long: '' }));
  };

  const handleRemoveCoordinatePoint = (index: number) => {
    setPlotCoordinates((prev) => prev.filter((_, pointIndex) => pointIndex !== index));
  };

  const handleSaveDivision = async () => {
    if (!divisionForm.name.trim() || plotCoordinates.length < 3) {
      addToast({
        type: 'warning',
        title: 'Talhao invalido',
        message: 'Informe nome e desenhe o talhao com ao menos 3 coordenadas.',
      });
      return;
    }

    const points = plotCoordinates.map((point) => ({
      lat: String(point.lat),
      long: String(point.long),
    }));

    const result = await propertyService.saveDivision({
      name: divisionForm.name.trim(),
      points,
      cultivar: divisionForm.cultivar.trim() || undefined,
      stockingRate: divisionForm.stockingRate.trim() || undefined,
      estimatedForageProduction: divisionForm.forageKgHa.trim() ? toNumber(divisionForm.forageKgHa) : undefined,
      entryDate: divisionForm.entryDate.trim() || undefined,
      exitDate: divisionForm.exitDate.trim() || undefined,
    });
    if (!result.success || !result.newPasture) {
      addToast({
        type: 'warning',
        title: 'Talhao invalido',
        message: result.message || 'Nao foi possivel salvar talhao.',
      });
      return;
    }

    setPastures((prev) => [...prev, result.newPasture!]);
    addToast({
      type: 'success',
      title: 'Talhao cadastrado',
      message: 'Separacao de talhoes atualizada com sucesso.',
    });
    await safelyAppendAudit({
      action: 'PLOT_REGISTERED',
      details: `Talhao ${result.newPasture.name} cadastrado com area ${result.newPasture.area} ha.`,
      evidenceRef: divisionForm.evidenceRef,
      metadata: {
        pastureId: result.newPasture.id,
        cultivar: result.newPasture.cultivar,
        stockingRate: result.newPasture.stockingRate,
      },
    });

    setDivisionForm({
      name: '',
      lat: '',
      long: '',
      cultivar: '',
      stockingRate: '',
      forageKgHa: '',
      entryDate: '',
      exitDate: '',
      evidenceRef: '',
    });
    setPlotCoordinates([]);
  };

  const handleSaveUnitAnimal = async () => {
    if (!unitAnimalForm.earringCode.trim()) {
      addToast({
        type: 'warning',
        title: 'Dados incompletos',
        message: 'Brinco/chip e obrigatorio para cadastro unitario.',
      });
      return;
    }

    try {
      const created = await producerOpsService.createAnimal({
        earringCode: unitAnimalForm.earringCode,
        species: unitAnimalForm.species,
        category: unitAnimalForm.category.trim() || unitAnimalForm.species,
        trackingMode: 'UNIT',
        currentWeightKg: unitAnimalForm.currentWeightKg.trim() ? toNumber(unitAnimalForm.currentWeightKg) : undefined,
        pastureId: unitAnimalForm.pastureId || undefined,
        lotId: undefined,
        parentAnimalIds: unitAnimalForm.parentAnimalIds,
      });

      await refreshAnimalsAndLots();
      addToast({
        type: 'success',
        title: 'Animal cadastrado',
        message: `Rastreio ${created.trackingCode || created.earringCode} salvo com sucesso.`,
      });
      await safelyAppendAudit({
        action: 'ANIMAL_REGISTERED_UNIT',
        details: `Animal ${created.earringCode} (${created.species}) cadastrado com rastreio unitario.`,
        evidenceRef: unitAnimalForm.evidenceRef,
        metadata: {
          animalId: created.id,
          pastureId: created.pastureId,
          genealogyCode: created.genealogyCode,
        },
      });
      setUnitAnimalForm({
        species: 'BOVINO',
        category: '',
        earringCode: '',
        currentWeightKg: '',
        pastureId: '',
        parentAnimalIds: [],
        evidenceRef: '',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha no cadastro do animal.';
      addToast({ type: 'error', title: 'Falha no cadastro', message });
    }
  };

  const handleSaveWeightLot = async () => {
    if (!weightLotForm.name.trim() || !weightLotForm.category.trim()) {
      addToast({
        type: 'warning',
        title: 'Dados incompletos',
        message: 'Informe nome e categoria do lote por peso.',
      });
      return;
    }

    try {
      const created = await producerOpsService.createTrackedWeightLot({
        name: weightLotForm.name,
        category: weightLotForm.category,
        species: weightLotForm.species,
        phase: weightLotForm.phase || 'INICIAL',
        ageInDays: weightLotForm.ageInDays.trim() ? toNumber(weightLotForm.ageInDays) : undefined,
        headcount: Math.max(1, toNumber(weightLotForm.headcount)),
        totalWeightKg: Math.max(1, toNumber(weightLotForm.totalWeightKg)),
        pastureId: weightLotForm.pastureId || undefined,
        distributionArea: weightLotForm.distributionArea.trim() || undefined,
      });

      await refreshAnimalsAndLots();
      addToast({
        type: 'success',
        title: 'Lote por peso cadastrado',
        message: `${created.name} salvo com ${created.headcount} unidades.`,
      });
      await safelyAppendAudit({
        action: 'ANIMAL_LOT_REGISTERED_WEIGHT',
        details: `Lote ${created.name} (${created.species}) cadastrado por peso total ${created.totalWeightKg} kg.`,
        evidenceRef: weightLotForm.evidenceRef,
        metadata: {
          lotId: created.id,
          pastureId: created.pastureId,
          phase: created.phase,
          ageInDays: created.ageInDays,
        },
      });
      setWeightLotForm({
        name: '',
        category: '',
        species: 'PEIXE',
        phase: 'INICIAL',
        ageInDays: '',
        headcount: '',
        totalWeightKg: '',
        pastureId: '',
        distributionArea: '',
        evidenceRef: '',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha no cadastro do lote.';
      addToast({ type: 'error', title: 'Falha no cadastro', message });
    }
  };

  const toggleAssembleAnimal = (animalId: string) => {
    setAssembleLotForm((prev) => {
      const exists = prev.selectedAnimalIds.includes(animalId);
      return {
        ...prev,
        selectedAnimalIds: exists
          ? prev.selectedAnimalIds.filter((id) => id !== animalId)
          : [...prev.selectedAnimalIds, animalId],
      };
    });
  };

  const toggleParentAnimal = (animalId: string) => {
    setUnitAnimalForm((prev) => {
      const exists = prev.parentAnimalIds.includes(animalId);
      return {
        ...prev,
        parentAnimalIds: exists ? prev.parentAnimalIds.filter((id) => id !== animalId) : [...prev.parentAnimalIds, animalId],
      };
    });
  };

  const handleCreateLotFromAnimals = async () => {
    if (!assembleLotForm.name.trim() || assembleLotForm.selectedAnimalIds.length < 2) {
      addToast({
        type: 'warning',
        title: 'Dados incompletos',
        message: 'Informe nome do lote e selecione ao menos 2 animais unitarios.',
      });
      return;
    }

    try {
      const created = await producerOpsService.createAnimalLotFromAnimalIds({
        name: assembleLotForm.name,
        category: assembleLotForm.category || 'Lote por leitura',
        animalIds: assembleLotForm.selectedAnimalIds,
        pastureId: assembleLotForm.pastureId || undefined,
        distributionArea: assembleLotForm.distributionArea || undefined,
      });

      await refreshAnimalsAndLots();
      addToast({
        type: 'success',
        title: 'Lote formado',
        message: `${created.name} criado com ${created.headcount} animais lidos.`,
      });
      await safelyAppendAudit({
        action: 'ANIMAL_LOT_FORMED_BY_UNIT_READ',
        details: `Lote ${created.name} formado por leitura de ${created.headcount} animais unitarios.`,
        evidenceRef: assembleLotForm.evidenceRef,
        metadata: {
          lotId: created.id,
          animalIds: assembleLotForm.selectedAnimalIds,
          totalWeightKg: created.totalWeightKg,
        },
      });
      setAssembleLotForm({
        name: '',
        category: '',
        pastureId: '',
        distributionArea: '',
        selectedAnimalIds: [],
        evidenceRef: '',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha ao formar lote por leitura.';
      addToast({ type: 'error', title: 'Falha ao formar lote', message });
    }
  };

  const handleSearchCAR = async () => {
    if (!carInput.trim()) {
      return;
    }

    setCarSearchStatus('LOADING');
    const result = await propertyService.searchCAR(carInput.trim());
    if (result.success && result.data) {
      setSicarData(result.data as Record<string, string>);
      setCarSearchStatus('FOUND');
      return;
    }

    setCarSearchStatus('ERROR');
    setSicarData(null);
  };

  if (isBootstrapping) {
    return (
      <div className="space-y-4">
        <SkeletonLoader className="h-10 w-1/3" />
        <SkeletonLoader className="h-24 w-full" />
        <SkeletonLoader className="h-72 w-full" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto pb-16 space-y-6 text-safe-wrap">
      <div className="app-surface p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <h2 className="text-3xl font-bold text-slate-900">Cadastro e gestao da propriedade</h2>
            <p className="text-slate-600 mt-1">
              Fluxo limpo por abas: cadastro principal, separacao de talhoes, animais com rastreio e auditoria.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setActiveTab('PROPERTY')}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                activeTab === 'PROPERTY' ? 'bg-teal-700 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Cadastro da propriedade
            </button>
            <button
              onClick={() => setActiveTab('PLOTS')}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                activeTab === 'PLOTS' ? 'bg-teal-700 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Talhoes
            </button>
            <button
              onClick={() => setActiveTab('ANIMALS')}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                activeTab === 'ANIMALS' ? 'bg-teal-700 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Animais e lotes
            </button>
            <button
              onClick={() => setActiveTab('MAP')}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                activeTab === 'MAP' ? 'bg-teal-700 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Mapa e CAR
            </button>
          </div>
        </div>
      </div>

      {activeTab === 'PROPERTY' && (
        <div className="space-y-6 animate-fade-in">
          <section className="app-surface p-5 sm:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-900">Cadastro principal da propriedade</h3>
              {!isEditing ? (
                <button onClick={() => setIsEditing(true)} className="px-4 py-2 rounded-lg bg-slate-900 text-white text-sm">
                  Editar cadastro
                </button>
              ) : (
                <button onClick={() => void saveProperty()} className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm">
                  Salvar cadastro
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              <label className="text-sm text-slate-700">
                Nome da propriedade
                <input
                  value={isEditing ? editableData.name : propertyData.name}
                  onChange={(event) => setEditableData((prev) => ({ ...prev, name: event.target.value }))}
                  disabled={!isEditing}
                  className="mt-1 w-full p-2.5 border border-slate-300 rounded-lg disabled:bg-slate-100"
                  placeholder="Ex.: Fazenda Boa Vista"
                />
              </label>
              <label className="text-sm text-slate-700">
                Numero do CAR
                <input
                  value={isEditing ? editableData.carNumber : propertyData.carNumber}
                  onChange={(event) =>
                    setEditableData((prev) => ({
                      ...prev,
                      carNumber: event.target.value.toUpperCase(),
                    }))
                  }
                  disabled={!isEditing}
                  className="mt-1 w-full p-2.5 border border-slate-300 rounded-lg disabled:bg-slate-100"
                  placeholder="MT-123456"
                />
              </label>
              <label className="text-sm text-slate-700">
                Area total (ha)
                <input
                  type="number"
                  min={0}
                  value={isEditing ? editableData.totalArea : propertyData.totalArea}
                  onChange={(event) =>
                    setEditableData((prev) => ({ ...prev, totalArea: Number(event.target.value || 0) }))
                  }
                  disabled={!isEditing}
                  className="mt-1 w-full p-2.5 border border-slate-300 rounded-lg disabled:bg-slate-100"
                />
              </label>
              <label className="text-sm text-slate-700">
                Capacidade atual (UA/ha)
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={isEditing ? editableData.currentStockingCapacity : propertyData.currentStockingCapacity}
                  onChange={(event) =>
                    setEditableData((prev) => ({
                      ...prev,
                      currentStockingCapacity: Number(event.target.value || 0),
                    }))
                  }
                  disabled={!isEditing}
                  className="mt-1 w-full p-2.5 border border-slate-300 rounded-lg disabled:bg-slate-100"
                />
              </label>
              <label className="text-sm text-slate-700">
                Quantidade de animais (resumo)
                <input
                  type="number"
                  min={0}
                  value={isEditing ? editableData.animalCount : propertyData.animalCount}
                  onChange={(event) =>
                    setEditableData((prev) => ({
                      ...prev,
                      animalCount: Number(event.target.value || 0),
                    }))
                  }
                  disabled={!isEditing}
                  className="mt-1 w-full p-2.5 border border-slate-300 rounded-lg disabled:bg-slate-100"
                />
              </label>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                <p className="font-semibold mb-1">Resumo financeiro por hectare</p>
                <p>Pastagem: {formatCurrency(propertyData.pastureInvestmentPerHa ?? 0)}</p>
                <p>Bovinos: {formatCurrency(propertyData.cattleInvestmentPerHa ?? 0)}</p>
              </div>
            </div>
          </section>

          <section className="app-surface p-5 sm:p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Atividades produtivas da propriedade</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
              <select
                value={newActivity.sector}
                onChange={(event) =>
                  setNewActivity((prev) => ({
                    ...prev,
                    sector: event.target.value as ProductionSector,
                    variety: '',
                  }))
                }
                className="p-2.5 border border-slate-300 rounded-lg"
              >
                <option value="">Setor</option>
                {Object.keys(SECTOR_VARIETIES).map((sector) => (
                  <option key={sector} value={sector}>
                    {sector}
                  </option>
                ))}
              </select>
              <select
                value={newActivity.variety}
                onChange={(event) => setNewActivity((prev) => ({ ...prev, variety: event.target.value }))}
                className="p-2.5 border border-slate-300 rounded-lg"
                disabled={!newActivity.sector}
              >
                <option value="">Variedade</option>
                {availableVarieties.map((variety) => (
                  <option key={variety} value={variety}>
                    {variety}
                  </option>
                ))}
              </select>
              <input
                value={newActivity.name}
                onChange={(event) => setNewActivity((prev) => ({ ...prev, name: event.target.value }))}
                className="p-2.5 border border-slate-300 rounded-lg"
                placeholder="Nome da atividade"
              />
              <input
                value={newActivity.volume}
                onChange={(event) => setNewActivity((prev) => ({ ...prev, volume: event.target.value }))}
                className="p-2.5 border border-slate-300 rounded-lg"
                placeholder="Volume previsto"
              />
              <button onClick={() => void handleSaveActivity()} className="px-4 py-2 rounded-lg bg-teal-700 text-white text-sm">
                Adicionar
              </button>
            </div>

            <div className="mt-4 space-y-2">
              {activities.length === 0 && (
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                  Nenhuma atividade cadastrada para esta propriedade.
                </div>
              )}
              {activities.map((activity) => (
                <div key={activity.id} className="rounded-lg border border-slate-200 bg-white p-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900">{activity.name}</p>
                    <p className="text-xs text-slate-500">
                      {activity.type} | {activity.status} | {activity.volume}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setPendingDeleteActivity(activity);
                      setDeletePassword('');
                    }}
                    className="px-3 py-1.5 rounded border border-red-200 text-red-700 text-xs font-semibold"
                  >
                    Excluir
                  </button>
                </div>
              ))}
            </div>

            {pendingDeleteActivity && (
              <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 space-y-3 animate-slide-down">
                <p className="text-sm text-red-700">
                  Excluir atividade <strong>{pendingDeleteActivity.name}</strong>. Informe senha de autorizacao.
                </p>
                <input
                  type="password"
                  value={deletePassword}
                  onChange={(event) => setDeletePassword(event.target.value)}
                  className="w-full p-2.5 border border-red-200 rounded-lg"
                  placeholder="Senha de autorizacao"
                />
                <p className="text-xs text-red-700">Senha padrao (se nao configurada): CICLO123</p>
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => void handleDeleteActivity()} className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm">
                    Confirmar exclusao
                  </button>
                  <button
                    onClick={() => {
                      setPendingDeleteActivity(null);
                      setDeletePassword('');
                    }}
                    className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg text-sm"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>
      )}

      {activeTab === 'PLOTS' && (
        <div className="space-y-6 animate-fade-in">
          <section className="app-surface p-5 sm:p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Separacao e cadastro de talhoes</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
              <input
                value={divisionForm.name}
                onChange={(event) => setDivisionForm((prev) => ({ ...prev, name: event.target.value }))}
                className="p-2.5 border border-slate-300 rounded-lg"
                placeholder="Nome do talhao"
              />
              <input
                value={divisionForm.lat}
                onChange={(event) => setDivisionForm((prev) => ({ ...prev, lat: event.target.value }))}
                className="p-2.5 border border-slate-300 rounded-lg"
                placeholder="Latitude"
              />
              <input
                value={divisionForm.long}
                onChange={(event) => setDivisionForm((prev) => ({ ...prev, long: event.target.value }))}
                className="p-2.5 border border-slate-300 rounded-lg"
                placeholder="Longitude"
              />
              <button
                type="button"
                onClick={handleAddCoordinatePoint}
                className="px-4 py-2 rounded-lg bg-slate-800 text-white text-sm font-semibold hover:bg-slate-900"
              >
                Adicionar coordenada
              </button>
              <input
                value={divisionForm.cultivar}
                onChange={(event) => setDivisionForm((prev) => ({ ...prev, cultivar: event.target.value }))}
                className="p-2.5 border border-slate-300 rounded-lg"
                placeholder="Cultivar/cultura"
              />
              <input
                value={divisionForm.stockingRate}
                onChange={(event) => setDivisionForm((prev) => ({ ...prev, stockingRate: event.target.value }))}
                className="p-2.5 border border-slate-300 rounded-lg"
                placeholder="Lotacao (UA/ha)"
              />
              <input
                value={divisionForm.forageKgHa}
                onChange={(event) => setDivisionForm((prev) => ({ ...prev, forageKgHa: event.target.value }))}
                className="p-2.5 border border-slate-300 rounded-lg"
                placeholder="Forragem estimada (kg/ha)"
              />
              <input
                type="date"
                value={divisionForm.entryDate}
                onChange={(event) => setDivisionForm((prev) => ({ ...prev, entryDate: event.target.value }))}
                className="p-2.5 border border-slate-300 rounded-lg"
              />
              <input
                type="date"
                value={divisionForm.exitDate}
                onChange={(event) => setDivisionForm((prev) => ({ ...prev, exitDate: event.target.value }))}
                className="p-2.5 border border-slate-300 rounded-lg"
              />
            </div>
            <div className="mt-4 grid grid-cols-1 xl:grid-cols-2 gap-4">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-bold text-slate-800">Coordenadas do talhao</h4>
                  <span className="text-xs text-slate-500">{plotCoordinates.length} pontos</span>
                </div>
                {plotCoordinates.length === 0 ? (
                  <p className="text-xs text-slate-500">Adicione ao menos 3 coordenadas para desenhar o talhao.</p>
                ) : (
                  <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                    {plotCoordinates.map((point, index) => (
                      <div key={`${point.lat}-${point.long}-${index}`} className="flex items-center justify-between bg-white border border-slate-200 rounded p-2 text-xs">
                        <span className="font-semibold text-slate-700">
                          P{index + 1}: {point.lat}, {point.long}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveCoordinatePoint(index)}
                          className="px-2 py-1 rounded border border-red-200 text-red-700 hover:bg-red-50"
                        >
                          Remover
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="rounded-lg border border-slate-200 bg-white p-4">
                <h4 className="text-sm font-bold text-slate-800 mb-2">Desenho no mapa por coordenadas</h4>
                {coordinatePreview.length < 3 ? (
                  <div className="h-36 rounded border border-dashed border-slate-300 flex items-center justify-center text-xs text-slate-500">
                    Aguardando 3+ coordenadas para formar o poligono.
                  </div>
                ) : (
                  <svg viewBox="0 0 100 100" className="h-36 w-full rounded border border-slate-300 bg-slate-900">
                    <polygon
                      points={coordinatePreview.map((point) => `${point.x},${point.y}`).join(' ')}
                      fill="rgba(34,197,94,0.35)"
                      stroke="#22c55e"
                      strokeWidth="1.2"
                    />
                    {coordinatePreview.map((point, index) => (
                      <g key={`preview-${index}`}>
                        <circle cx={point.x} cy={point.y} r="1.8" fill="#f8fafc" />
                        <text x={point.x + 1.8} y={point.y - 1.8} fontSize="3" fill="#e2e8f0">
                          {index + 1}
                        </text>
                      </g>
                    ))}
                    </svg>
                )}
                <div className="mt-3 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-semibold text-slate-700">Mapa real:</span>
                    <select
                      value={realMapProvider}
                      onChange={(event) => setRealMapProvider(event.target.value as 'GOOGLE_MAPS' | 'GOOGLE_EARTH' | 'ARCGIS')}
                      className="p-1.5 border border-slate-300 rounded bg-white text-xs"
                    >
                      <option value="GOOGLE_MAPS">Google Maps</option>
                      <option value="GOOGLE_EARTH">Google Earth</option>
                      <option value="ARCGIS">ArcGIS</option>
                    </select>
                  </div>
                  {realMapLinks ? (
                    <>
                      <div className="flex flex-wrap gap-2">
                        <a href={realMapLinks.googleMaps} target="_blank" rel="noreferrer" className="px-2 py-1 rounded border border-slate-300 text-xs text-slate-700 hover:bg-slate-100">
                          Abrir Google Maps
                        </a>
                        <a href={realMapLinks.googleEarth} target="_blank" rel="noreferrer" className="px-2 py-1 rounded border border-slate-300 text-xs text-slate-700 hover:bg-slate-100">
                          Abrir Google Earth
                        </a>
                        <a href={realMapLinks.arcgis} target="_blank" rel="noreferrer" className="px-2 py-1 rounded border border-slate-300 text-xs text-slate-700 hover:bg-slate-100">
                          Abrir ArcGIS
                        </a>
                      </div>
                      {realMapProvider === 'GOOGLE_MAPS' && (
                        <iframe
                          title="Mapa real Google Maps"
                          src={realMapLinks.googleMapsEmbed}
                          className="w-full h-44 rounded border border-slate-300"
                          loading="lazy"
                          referrerPolicy="no-referrer-when-downgrade"
                        />
                      )}
                      {realMapProvider !== 'GOOGLE_MAPS' && (
                        <p className="text-xs text-slate-500">
                          Para {realMapProvider === 'GOOGLE_EARTH' ? 'Google Earth' : 'ArcGIS'}, use o botao acima para abrir o mapa real no provedor.
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="text-xs text-slate-500">Adicione coordenadas para habilitar Google Maps, Google Earth e ArcGIS.</p>
                  )}
                </div>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3">
              <input
                value={divisionForm.evidenceRef}
                onChange={(event) => setDivisionForm((prev) => ({ ...prev, evidenceRef: event.target.value }))}
                className="p-2.5 border border-slate-300 rounded-lg"
                placeholder="Referencia de evidencia (QR, foto, video ou URL)"
              />
              <button onClick={() => void handleSaveDivision()} className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm">
                Salvar talhao
              </button>
            </div>
          </section>

          <section className="app-surface p-5 sm:p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Talhoes cadastrados</h3>
            {pastures.length === 0 ? (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                Nenhum talhao cadastrado ainda.
              </div>
            ) : (
              <div className="overflow-x-auto custom-scrollbar">
                <table className="text-sm">
                  <thead className="bg-slate-100 text-slate-700">
                    <tr>
                      <th className="p-2 text-left">Talhao</th>
                      <th className="p-2 text-left">Area (ha)</th>
                      <th className="p-2 text-left">Cultivar</th>
                      <th className="p-2 text-left">Lotacao</th>
                      <th className="p-2 text-left">Forragem</th>
                      <th className="p-2 text-left">Entrada</th>
                      <th className="p-2 text-left">Saida</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pastures.map((pasture) => (
                      <tr key={pasture.id} className="border-b border-slate-100">
                        <td className="p-2 font-medium text-slate-800">{pasture.name}</td>
                        <td className="p-2 text-slate-600">{pasture.area}</td>
                        <td className="p-2 text-slate-600">{pasture.cultivar || '-'}</td>
                        <td className="p-2 text-slate-600">{pasture.stockingRate || '-'}</td>
                        <td className="p-2 text-slate-600">{pasture.estimatedForageProduction || 0}</td>
                        <td className="p-2 text-slate-600">{pasture.entryDate || '-'}</td>
                        <td className="p-2 text-slate-600">{pasture.exitDate || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      )}

      {activeTab === 'ANIMALS' && (
        <div className="space-y-6 animate-fade-in">
          <section className="app-surface p-5 sm:p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Cadastro inicial de animais com rastreio e auditoria</h3>
            <div className="flex flex-wrap gap-2 mb-4">
              <button
                onClick={() => setAnimalTab('UNIT')}
                className={`px-3 py-2 rounded-lg text-sm font-semibold ${
                  animalTab === 'UNIT' ? 'bg-teal-700 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Cadastro unitario (brinco/chip)
              </button>
              <button
                onClick={() => setAnimalTab('WEIGHT')}
                className={`px-3 py-2 rounded-lg text-sm font-semibold ${
                  animalTab === 'WEIGHT' ? 'bg-teal-700 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Cadastro por lote/peso
              </button>
              <button
                onClick={() => setAnimalTab('ASSEMBLE')}
                className={`px-3 py-2 rounded-lg text-sm font-semibold ${
                  animalTab === 'ASSEMBLE' ? 'bg-teal-700 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Formar lote por leitura
              </button>
            </div>

            {animalTab === 'UNIT' && (
              <div className="space-y-3 animate-fade-in">
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
                  <select
                    value={unitAnimalForm.species}
                    onChange={(event) =>
                      setUnitAnimalForm((prev) => ({
                        ...prev,
                        species: event.target.value as ProducerAnimal['species'],
                      }))
                    }
                    className="p-2.5 border border-slate-300 rounded-lg"
                  >
                    {UNITARY_SPECIES.map((species) => (
                      <option key={species} value={species}>
                        {formatSpecies(species)}
                      </option>
                    ))}
                  </select>
                  <input
                    value={unitAnimalForm.earringCode}
                    onChange={(event) => setUnitAnimalForm((prev) => ({ ...prev, earringCode: event.target.value }))}
                    className="p-2.5 border border-slate-300 rounded-lg"
                    placeholder="Brinco/chip rastreavel"
                  />
                  <input
                    value={unitAnimalForm.category}
                    onChange={(event) => setUnitAnimalForm((prev) => ({ ...prev, category: event.target.value }))}
                    className="p-2.5 border border-slate-300 rounded-lg"
                    placeholder="Categoria (cria, recria, etc.)"
                  />
                  <input
                    type="number"
                    value={unitAnimalForm.currentWeightKg}
                    onChange={(event) => setUnitAnimalForm((prev) => ({ ...prev, currentWeightKg: event.target.value }))}
                    className="p-2.5 border border-slate-300 rounded-lg"
                    placeholder="Peso atual (kg)"
                  />
                  <select
                    value={unitAnimalForm.pastureId}
                    onChange={(event) => setUnitAnimalForm((prev) => ({ ...prev, pastureId: event.target.value }))}
                    className="p-2.5 border border-slate-300 rounded-lg"
                  >
                    <option value="">Talhao/pasto (opcional)</option>
                    {pastures.map((pasture) => (
                      <option key={pasture.id} value={pasture.id}>
                        {pasture.name}
                      </option>
                    ))}
                  </select>
                  <input
                    value={unitAnimalForm.evidenceRef}
                    onChange={(event) => setUnitAnimalForm((prev) => ({ ...prev, evidenceRef: event.target.value }))}
                    className="p-2.5 border border-slate-300 rounded-lg md:col-span-2 xl:col-span-3"
                    placeholder="Evidencia digital (QR/foto/video/url)"
                  />
                </div>

                <div className="rounded-lg border border-slate-200 p-3">
                  <p className="text-sm font-semibold text-slate-800 mb-2">Genealogia (pais opcionais)</p>
                  {animals.filter((animal) => animal.trackingMode === 'UNIT').length === 0 ? (
                    <p className="text-sm text-slate-500">Nenhum animal unitario cadastrado para vinculo genealogico.</p>
                  ) : (
                    <div className="max-h-36 overflow-y-auto custom-scrollbar space-y-2 pr-1">
                      {animals
                        .filter((animal) => animal.trackingMode === 'UNIT')
                        .map((animal) => (
                          <label key={animal.id} className="flex items-center gap-2 text-sm text-slate-700">
                            <input
                              type="checkbox"
                              checked={unitAnimalForm.parentAnimalIds.includes(animal.id)}
                              onChange={() => toggleParentAnimal(animal.id)}
                            />
                            <span>
                              {animal.earringCode} ({formatSpecies(animal.species)})
                            </span>
                          </label>
                        ))}
                    </div>
                  )}
                </div>

                <div className="flex justify-end">
                  <button onClick={() => void handleSaveUnitAnimal()} className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm">
                    Salvar cadastro unitario
                  </button>
                </div>
              </div>
            )}

            {animalTab === 'WEIGHT' && (
              <div className="space-y-3 animate-fade-in">
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
                  <input
                    value={weightLotForm.name}
                    onChange={(event) => setWeightLotForm((prev) => ({ ...prev, name: event.target.value }))}
                    className="p-2.5 border border-slate-300 rounded-lg"
                    placeholder="Nome do lote"
                  />
                  <input
                    value={weightLotForm.category}
                    onChange={(event) => setWeightLotForm((prev) => ({ ...prev, category: event.target.value }))}
                    className="p-2.5 border border-slate-300 rounded-lg"
                    placeholder="Categoria"
                  />
                  <select
                    value={weightLotForm.species}
                    onChange={(event) =>
                      setWeightLotForm((prev) => ({
                        ...prev,
                        species: event.target.value as ProducerAnimal['species'],
                      }))
                    }
                    className="p-2.5 border border-slate-300 rounded-lg"
                  >
                    {WEIGHT_SPECIES.map((species) => (
                      <option key={species} value={species}>
                        {formatSpecies(species)}
                      </option>
                    ))}
                  </select>
                  <input
                    value={weightLotForm.phase}
                    onChange={(event) => setWeightLotForm((prev) => ({ ...prev, phase: event.target.value }))}
                    className="p-2.5 border border-slate-300 rounded-lg"
                    placeholder="Fase (inicial/recria/final)"
                  />
                  <input
                    type="number"
                    value={weightLotForm.ageInDays}
                    onChange={(event) => setWeightLotForm((prev) => ({ ...prev, ageInDays: event.target.value }))}
                    className="p-2.5 border border-slate-300 rounded-lg"
                    placeholder="Idade media (dias)"
                  />
                  <input
                    type="number"
                    value={weightLotForm.headcount}
                    onChange={(event) => setWeightLotForm((prev) => ({ ...prev, headcount: event.target.value }))}
                    className="p-2.5 border border-slate-300 rounded-lg"
                    placeholder="Quantidade de unidades"
                  />
                  <input
                    type="number"
                    value={weightLotForm.totalWeightKg}
                    onChange={(event) => setWeightLotForm((prev) => ({ ...prev, totalWeightKg: event.target.value }))}
                    className="p-2.5 border border-slate-300 rounded-lg"
                    placeholder="Peso total (kg)"
                  />
                  <select
                    value={weightLotForm.pastureId}
                    onChange={(event) => setWeightLotForm((prev) => ({ ...prev, pastureId: event.target.value }))}
                    className="p-2.5 border border-slate-300 rounded-lg"
                  >
                    <option value="">Talhao/pasto (opcional)</option>
                    {pastures.map((pasture) => (
                      <option key={pasture.id} value={pasture.id}>
                        {pasture.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <input
                    value={weightLotForm.distributionArea}
                    onChange={(event) => setWeightLotForm((prev) => ({ ...prev, distributionArea: event.target.value }))}
                    className="p-2.5 border border-slate-300 rounded-lg"
                    placeholder="Area de distribuicao do lote"
                  />
                  <input
                    value={weightLotForm.evidenceRef}
                    onChange={(event) => setWeightLotForm((prev) => ({ ...prev, evidenceRef: event.target.value }))}
                    className="p-2.5 border border-slate-300 rounded-lg"
                    placeholder="Evidencia digital (QR/foto/video/url)"
                  />
                </div>
                <div className="flex justify-end">
                  <button onClick={() => void handleSaveWeightLot()} className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm">
                    Salvar lote por peso
                  </button>
                </div>
              </div>
            )}

            {animalTab === 'ASSEMBLE' && (
              <div className="space-y-4 animate-fade-in">
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
                  <input
                    value={assembleLotForm.name}
                    onChange={(event) => setAssembleLotForm((prev) => ({ ...prev, name: event.target.value }))}
                    className="p-2.5 border border-slate-300 rounded-lg"
                    placeholder="Nome do novo lote"
                  />
                  <input
                    value={assembleLotForm.category}
                    onChange={(event) => setAssembleLotForm((prev) => ({ ...prev, category: event.target.value }))}
                    className="p-2.5 border border-slate-300 rounded-lg"
                    placeholder="Categoria"
                  />
                  <select
                    value={assembleLotForm.pastureId}
                    onChange={(event) => setAssembleLotForm((prev) => ({ ...prev, pastureId: event.target.value }))}
                    className="p-2.5 border border-slate-300 rounded-lg"
                  >
                    <option value="">Talhao/pasto (opcional)</option>
                    {pastures.map((pasture) => (
                      <option key={pasture.id} value={pasture.id}>
                        {pasture.name}
                      </option>
                    ))}
                  </select>
                  <input
                    value={assembleLotForm.distributionArea}
                    onChange={(event) => setAssembleLotForm((prev) => ({ ...prev, distributionArea: event.target.value }))}
                    className="p-2.5 border border-slate-300 rounded-lg"
                    placeholder="Area de distribuicao"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3">
                  <input
                    value={assembleLotForm.evidenceRef}
                    onChange={(event) => setAssembleLotForm((prev) => ({ ...prev, evidenceRef: event.target.value }))}
                    className="p-2.5 border border-slate-300 rounded-lg"
                    placeholder="Evidencia digital (QR/foto/video/url)"
                  />
                  <button
                    onClick={() => void handleCreateLotFromAnimals()}
                    className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm"
                  >
                    Formar lote
                  </button>
                </div>

                <div className="rounded-lg border border-slate-200 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                    <p className="text-sm font-semibold text-slate-800">Animais unitarios disponiveis para leitura</p>
                    <p className="text-xs text-slate-500">
                      Selecionados: {assembleLotForm.selectedAnimalIds.length} | Peso total: {selectedAssemblyWeight.toFixed(2)} kg
                    </p>
                  </div>
                  {unassignedUnitAnimals.length === 0 ? (
                    <p className="text-sm text-slate-500">Nao ha animais unitarios livres para formar lote.</p>
                  ) : (
                    <div className="max-h-48 overflow-y-auto custom-scrollbar space-y-2 pr-1">
                      {unassignedUnitAnimals.map((animal) => (
                        <label key={animal.id} className="flex items-center gap-2 text-sm text-slate-700">
                          <input
                            type="checkbox"
                            checked={assembleLotForm.selectedAnimalIds.includes(animal.id)}
                            onChange={() => toggleAssembleAnimal(animal.id)}
                          />
                          <span>
                            {animal.earringCode} | {formatSpecies(animal.species)} | {animal.currentWeightKg ?? 0} kg
                          </span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </section>

          <section className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <div className="app-surface p-5">
              <h4 className="font-bold text-slate-900 mb-3">Animais cadastrados</h4>
              {animals.length === 0 ? (
                <p className="text-sm text-slate-500">Sem animais cadastrados.</p>
              ) : (
                <div className="space-y-2 max-h-72 overflow-y-auto custom-scrollbar pr-1">
                  {animals.map((animal) => (
                    <div key={animal.id} className="rounded-lg border border-slate-200 bg-white p-3">
                      <p className="font-semibold text-slate-800">{animal.earringCode}</p>
                      <p className="text-xs text-slate-500">
                        {formatSpecies(animal.species)} | {animal.category} | {animal.currentWeightKg ?? 0} kg
                      </p>
                      <p className="text-xs text-slate-500">
                        Lote: {animal.lotId || 'Nao vinculado'} | Talhao: {pastureNameById(animal.pastureId)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="app-surface p-5">
              <h4 className="font-bold text-slate-900 mb-3">Lotes animais</h4>
              {animalLots.length === 0 ? (
                <p className="text-sm text-slate-500">Sem lotes cadastrados.</p>
              ) : (
                <div className="space-y-2 max-h-72 overflow-y-auto custom-scrollbar pr-1">
                  {animalLots.map((lot) => (
                    <div key={lot.id} className="rounded-lg border border-slate-200 bg-white p-3">
                      <p className="font-semibold text-slate-800">{lot.name}</p>
                      <p className="text-xs text-slate-500">
                        {lot.category} | {formatSpecies(lot.species || 'OUTRO')} | Modo {lot.trackingMode || 'N/A'}
                      </p>
                      <p className="text-xs text-slate-500">
                        Cabecas: {lot.headcount} | Peso total: {lot.totalWeightKg ?? 0} kg | Talhao: {pastureNameById(lot.pastureId)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>
      )}

      {activeTab === 'MAP' && (
        <div className="space-y-6 animate-fade-in">
          <section className="app-surface p-5 sm:p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-3">Consulta CAR</h3>
            <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3">
              <input
                value={carInput}
                onChange={(event) => setCarInput(event.target.value)}
                className="p-2.5 border border-slate-300 rounded-lg"
                placeholder="Numero do CAR"
              />
              <button onClick={() => void handleSearchCAR()} className="px-4 py-2 rounded-lg bg-teal-700 text-white text-sm">
                {carSearchStatus === 'LOADING' ? 'Buscando...' : 'Buscar CAR'}
              </button>
            </div>
            {carSearchStatus === 'ERROR' && (
              <p className="mt-3 text-sm text-red-700">CAR nao encontrado. Verifique o numero informado.</p>
            )}
            {carSearchStatus === 'FOUND' && sicarData && (
              <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-slate-700">
                <p>
                  <strong>Municipio:</strong> {sicarData.municipality || 'Nao informado'}
                </p>
                <p>
                  <strong>Area:</strong> {sicarData.totalArea || 'Nao informado'}
                </p>
                <p>
                  <strong>Status:</strong> {sicarData.status || 'Nao informado'}
                </p>
              </div>
            )}
          </section>

          <section className="app-surface p-2 sm:p-3">
            <PropertyMapView property={propertyData} pastures={pastures} />
          </section>
        </div>
      )}
    </div>
  );
};

export default PropertyRegistrationView;
