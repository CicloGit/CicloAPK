import React, { useEffect, useMemo, useState } from 'react';
import ChartBarIcon from '../../icons/ChartBarIcon';
import { CubeIcon } from '../../icons/CubeIcon';
import TrendingUpIcon from '../../icons/TrendingUpIcon';
import { CashIcon } from '../../icons/CashIcon';
import CalculatorIcon from '../../icons/CalculatorIcon';
import LoadingSpinner from '../../shared/LoadingSpinner';
import {
    MarketTrend,
    ProducerAnimal,
    ProducerApplicationArea,
    ProducerInput,
    ProducerInputType,
    ProducerTargetSpecies,
    ProductionProject,
    Property,
} from '../../../types';
import { reportsService, ConsumptionReportRow, CapacityReport, LotAuditReading } from '../../../services/reportsService';
import { producerOpsService } from '../../../services/producerOpsService';
import { propertyService } from '../../../services/propertyService';
import { useToast } from '../../../contexts/ToastContext';
import { useApp } from '../../../contexts/AppContext';
import { getActivityAutomationProfile } from '../../../config/activityProfiles';

const INPUT_TYPE_LABELS: Record<ProducerInputType, string> = {
    ADUBO: 'Adubo',
    RACAO: 'Racao',
    SAL_MINERAL: 'Sal mineral',
    MEDICAMENTO: 'Medicamento',
    SEMENTE: 'Semente',
    DEFENSIVO: 'Defensivo',
    OUTRO: 'Outro',
};

const APPLICATION_AREA_LABELS: Record<ProducerApplicationArea, string> = {
    PASTAGEM: 'Pastagem',
    LAVOURA: 'Lavoura',
    CONFINAMENTO: 'Confinamento',
    AVIARIO: 'Aviario',
    CURRAL: 'Curral',
    GERAL: 'Geral',
};

const SPECIES_LABELS: Record<ProducerTargetSpecies, string> = {
    BOVINOS: 'Bovinos',
    AVES: 'Aves',
    SUINOS: 'Suinos',
    OVINOS: 'Ovinos',
    CAPRINOS: 'Caprinos',
    EQUINOS: 'Equinos',
    PEIXES: 'Peixes',
};

const SPECIES_REQUIRED_TYPES = new Set<ProducerInputType>(['RACAO', 'SAL_MINERAL', 'MEDICAMENTO']);

const DEFAULT_AREA_BY_TYPE: Record<ProducerInputType, ProducerApplicationArea> = {
    ADUBO: 'PASTAGEM',
    RACAO: 'CONFINAMENTO',
    SAL_MINERAL: 'CURRAL',
    MEDICAMENTO: 'CURRAL',
    SEMENTE: 'LAVOURA',
    DEFENSIVO: 'LAVOURA',
    OUTRO: 'GERAL',
};

const ReportsView: React.FC = () => {
    const { addToast } = useToast();
    const { selectedProductionId, currentUser } = useApp();
    const [activeReport, setActiveReport] = useState<'CONSUMPTION' | 'CAPACITY' | 'MARGIN' | 'REGISTRY'>('CONSUMPTION');
    const [selectedLotId, setSelectedLotId] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [partialWarnings, setPartialWarnings] = useState<string[]>([]);

    const [marketTrends, setMarketTrends] = useState<MarketTrend[]>([]);
    const [consumptionData, setConsumptionData] = useState<ConsumptionReportRow[]>([]);
    const [capacityData, setCapacityData] = useState<CapacityReport | null>(null);
    const [registryKpis, setRegistryKpis] = useState<{ totalAnimals: number; totalExpenses: number; costPerHead: number }>({
        totalAnimals: 0,
        totalExpenses: 0,
        costPerHead: 0,
    });

    const [propertyData, setPropertyData] = useState<Property | null>(null);
    const [activities, setActivities] = useState<ProductionProject[]>([]);
    const [animals, setAnimals] = useState<ProducerAnimal[]>([]);
    const [plots, setPlots] = useState<Array<{ id: string; name: string }>>([]);
    const [lots, setLots] = useState<Array<{ id: string; name: string; category: string; headcount: number; averageWeightKg: number }>>([]);
    const [inputs, setInputs] = useState<ProducerInput[]>([]);
    const [expenses, setExpenses] = useState<Array<{ id: string; description: string; amount: number; category: string; date: string }>>([]);

    const [lotAudits, setLotAudits] = useState<LotAuditReading[]>([]);
    const [auditForm, setAuditForm] = useState({
        checkedHeadcount: '',
        checkedWeightKg: '',
        evidenceReference: '',
        notes: '',
    });

    const [newLot, setNewLot] = useState({ name: '', category: '', headcount: '', averageWeightKg: '' });
    const [newInput, setNewInput] = useState<{
        name: string;
        inputType: ProducerInputType;
        applicationArea: ProducerApplicationArea;
        targetSpecies: ProducerTargetSpecies[];
        launchLinkType: 'GERAL' | 'ANIMAL' | 'LOTE' | 'TALHAO';
        linkedAnimalId: string;
        linkedLotId: string;
        linkedPlotId: string;
        unit: string;
        unitCost: string;
        stock: string;
    }>({
        name: '',
        inputType: 'RACAO',
        applicationArea: DEFAULT_AREA_BY_TYPE.RACAO,
        targetSpecies: ['BOVINOS'],
        launchLinkType: 'GERAL',
        linkedAnimalId: '',
        linkedLotId: '',
        linkedPlotId: '',
        unit: 'kg',
        unitCost: '',
        stock: '',
    });
    const [newExpense, setNewExpense] = useState({ description: '', category: 'OPERACIONAL', amount: '' });

    const [simCommodity, setSimCommodity] = useState('Boi Gordo');
    const [salePrice, setSalePrice] = useState<number>(0);
    const [costPerUnit, setCostPerUnit] = useState<number>(180.00);
    const [replacementCost, setReplacementCost] = useState<number>(2500.00);
    const [saleWeight, setSaleWeight] = useState<number>(20);

    const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
    const toErrorMessage = (reason: unknown): string => (reason instanceof Error ? reason.message : 'erro desconhecido');
    const activeProject = useMemo(() => {
        if (!selectedProductionId || selectedProductionId === 'ALL') {
            return activities[0] ?? null;
        }
        return activities.find((activity) => activity.id === selectedProductionId) ?? activities[0] ?? null;
    }, [activities, selectedProductionId]);
    const activityProfile = useMemo(() => getActivityAutomationProfile(activeProject?.type), [activeProject?.type]);
    const allowedAreaEntries = useMemo(
        () =>
            Object.entries(APPLICATION_AREA_LABELS).filter(([value]) =>
                activityProfile.allowedApplicationAreas.includes(value as ProducerApplicationArea)
            ),
        [activityProfile.allowedApplicationAreas]
    );
    const allowedTargetSpeciesEntries = useMemo(
        () =>
            Object.entries(SPECIES_LABELS).filter(([value]) =>
                activityProfile.allowedTargetSpecies.includes(value as ProducerTargetSpecies)
            ),
        [activityProfile.allowedTargetSpecies]
    );
    const selectedLot = useMemo(
        () => lots.find((lot) => lot.id === selectedLotId) ?? null,
        [lots, selectedLotId]
    );
    const filteredConsumptionData = useMemo(
        () => consumptionData.filter((row) => !selectedLotId || !row.lotId || row.lotId === selectedLotId),
        [consumptionData, selectedLotId]
    );
    const filteredLotAudits = useMemo(
        () => lotAudits.filter((audit) => !selectedLotId || audit.lotId === selectedLotId),
        [lotAudits, selectedLotId]
    );
    const resolveInputLinkLabel = (input: {
        launchLinkType?: 'GERAL' | 'ANIMAL' | 'LOTE' | 'TALHAO';
        linkedAnimalId?: string;
        linkedLotId?: string;
        linkedPlotId?: string;
    }): string => {
        if (input.launchLinkType === 'ANIMAL') {
            const animal = animals.find((row) => row.id === input.linkedAnimalId);
            return `Animal: ${animal?.earringCode ?? input.linkedAnimalId ?? '-'}`;
        }
        if (input.launchLinkType === 'LOTE') {
            const lot = lots.find((row) => row.id === input.linkedLotId);
            return `Lote: ${lot?.name ?? input.linkedLotId ?? '-'}`;
        }
        if (input.launchLinkType === 'TALHAO') {
            const plot = plots.find((row) => row.id === input.linkedPlotId);
            return `Talhao: ${plot?.name ?? input.linkedPlotId ?? '-'}`;
        }
        return 'Geral';
    };

    const loadAll = async () => {
        setIsLoading(true);
        setLoadError(null);
        setPartialWarnings([]);

        const [loadedTrends, loadedConsumption, loadedCapacity, loadedKpis, loadedWorkspace, loadedLots, loadedAnimals, loadedInputs, loadedExpenses, loadedLotAudits] = await Promise.allSettled([
            reportsService.listMarketTrends(),
            reportsService.listConsumptionRows(),
            reportsService.getCapacityReport(),
            producerOpsService.getKpis(),
            propertyService.loadWorkspace(),
            producerOpsService.listAnimalLots(),
            producerOpsService.listAnimals(),
            producerOpsService.listInputs(),
            producerOpsService.listExpenses(),
            reportsService.listLotAuditReadings(),
        ]);

        const warnings: string[] = [];
        const hasAnySuccess = [
            loadedTrends,
            loadedConsumption,
            loadedCapacity,
            loadedKpis,
            loadedWorkspace,
            loadedLots,
            loadedAnimals,
            loadedInputs,
            loadedExpenses,
            loadedLotAudits,
        ].some((entry) => entry.status === 'fulfilled');

        if (loadedTrends.status === 'fulfilled') {
            setMarketTrends(loadedTrends.value);
        } else {
            setMarketTrends([]);
            warnings.push(`Tendencias de mercado: ${toErrorMessage(loadedTrends.reason)}`);
        }

        if (loadedConsumption.status === 'fulfilled') {
            setConsumptionData(loadedConsumption.value);
        } else {
            setConsumptionData([]);
            warnings.push(`Consumo por lote: ${toErrorMessage(loadedConsumption.reason)}`);
        }

        if (loadedCapacity.status === 'fulfilled') {
            setCapacityData(loadedCapacity.value);
        } else {
            setCapacityData(null);
            warnings.push(`Capacidade produtiva: ${toErrorMessage(loadedCapacity.reason)}`);
        }

        if (loadedKpis.status === 'fulfilled') {
            setRegistryKpis(loadedKpis.value);
        } else {
            setRegistryKpis({ totalAnimals: 0, totalExpenses: 0, costPerHead: 0 });
            warnings.push(`KPIs de cadastro: ${toErrorMessage(loadedKpis.reason)}`);
        }

        if (loadedWorkspace.status === 'fulfilled') {
            setPropertyData(loadedWorkspace.value.property);
            setActivities(loadedWorkspace.value.activities);
            setPlots(loadedWorkspace.value.pastures.map((pasture) => ({ id: pasture.id, name: pasture.name })));
        } else {
            setPropertyData(null);
            setActivities([]);
            setPlots([]);
            warnings.push(`Cadastro da propriedade: ${toErrorMessage(loadedWorkspace.reason)}`);
        }

        if (loadedLots.status === 'fulfilled') {
            setLots(loadedLots.value);
            setSelectedLotId((previous) => previous || loadedLots.value[0]?.id || '');
        } else {
            setLots([]);
            setSelectedLotId('');
            warnings.push(`Lotes de animais: ${toErrorMessage(loadedLots.reason)}`);
        }

        if (loadedAnimals.status === 'fulfilled') {
            setAnimals(loadedAnimals.value);
        } else {
            setAnimals([]);
            warnings.push(`Animais rastreados: ${toErrorMessage(loadedAnimals.reason)}`);
        }

        if (loadedInputs.status === 'fulfilled') {
            setInputs(loadedInputs.value);
        } else {
            setInputs([]);
            warnings.push(`Insumos: ${toErrorMessage(loadedInputs.reason)}`);
        }

        if (loadedExpenses.status === 'fulfilled') {
            setExpenses(loadedExpenses.value);
        } else {
            setExpenses([]);
            warnings.push(`Despesas operacionais: ${toErrorMessage(loadedExpenses.reason)}`);
        }

        if (loadedLotAudits.status === 'fulfilled') {
            setLotAudits(loadedLotAudits.value);
        } else {
            setLotAudits([]);
            warnings.push(`Leituras de auditoria: ${toErrorMessage(loadedLotAudits.reason)}`);
        }

        if (!hasAnySuccess) {
            setLoadError('Nao foi possivel carregar os relatorios.');
        } else if (warnings.length > 0) {
            setPartialWarnings(warnings);
            addToast({
                type: 'warning',
                title: 'Relatorios carregados parcialmente',
                message: 'Algumas fontes falharam; os dados disponiveis foram exibidos.',
            });
        }

        setIsLoading(false);
    };

    useEffect(() => {
        void loadAll();
    }, []);

    useEffect(() => {
        if (lots.length === 0) {
            setSelectedLotId('');
            return;
        }
        if (!lots.some((lot) => lot.id === selectedLotId)) {
            setSelectedLotId(lots[0].id);
        }
    }, [lots, selectedLotId]);

    useEffect(() => {
        const fallbackArea = activityProfile.allowedApplicationAreas[0] ?? DEFAULT_AREA_BY_TYPE.RACAO;
        const fallbackSpecies = activityProfile.defaultTargetSpecies;
        setNewInput((previous) => ({
            ...previous,
            applicationArea: activityProfile.allowedApplicationAreas.includes(previous.applicationArea)
                ? previous.applicationArea
                : fallbackArea,
            targetSpecies: previous.targetSpecies.filter((entry) => activityProfile.allowedTargetSpecies.includes(entry)),
            unit: previous.unit || activityProfile.defaultInputUnit,
        }));

        if (fallbackSpecies.length > 0) {
            setNewInput((previous) => ({
                ...previous,
                targetSpecies:
                    previous.targetSpecies.length > 0
                        ? previous.targetSpecies.filter((entry) => activityProfile.allowedTargetSpecies.includes(entry))
                        : fallbackSpecies,
            }));
        }
    }, [
        activityProfile.allowedApplicationAreas,
        activityProfile.allowedTargetSpecies,
        activityProfile.defaultInputUnit,
        activityProfile.defaultTargetSpecies,
    ]);

    const refreshRegistryData = async () => {
        const [kpis, loadedLots, loadedAnimals, loadedInputs, loadedExpenses, loadedAudits] = await Promise.allSettled([
            producerOpsService.getKpis(),
            producerOpsService.listAnimalLots(),
            producerOpsService.listAnimals(),
            producerOpsService.listInputs(),
            producerOpsService.listExpenses(),
            reportsService.listLotAuditReadings(),
        ]);
        const refreshWarnings: string[] = [];

        if (kpis.status === 'fulfilled') {
            setRegistryKpis(kpis.value);
        } else {
            refreshWarnings.push(`KPIs: ${toErrorMessage(kpis.reason)}`);
        }

        if (loadedLots.status === 'fulfilled') {
            setLots(loadedLots.value);
            setSelectedLotId((previous) => previous || loadedLots.value[0]?.id || '');
        } else {
            refreshWarnings.push(`Lotes: ${toErrorMessage(loadedLots.reason)}`);
        }

        if (loadedAnimals.status === 'fulfilled') {
            setAnimals(loadedAnimals.value);
        } else {
            refreshWarnings.push(`Animais: ${toErrorMessage(loadedAnimals.reason)}`);
        }

        if (loadedInputs.status === 'fulfilled') {
            setInputs(loadedInputs.value);
        } else {
            refreshWarnings.push(`Insumos: ${toErrorMessage(loadedInputs.reason)}`);
        }

        if (loadedExpenses.status === 'fulfilled') {
            setExpenses(loadedExpenses.value);
        } else {
            refreshWarnings.push(`Despesas: ${toErrorMessage(loadedExpenses.reason)}`);
        }

        if (loadedAudits.status === 'fulfilled') {
            setLotAudits(loadedAudits.value);
        } else {
            refreshWarnings.push(`Auditoria: ${toErrorMessage(loadedAudits.reason)}`);
        }

        if (refreshWarnings.length > 0) {
            addToast({
                type: 'warning',
                title: 'Atualizacao parcial',
                message: 'Parte dos dados de cadastro nao foi atualizada neste momento.',
            });
        }
    };

    const handleSaveProperty = async () => {
        if (!propertyData) return;
        const result = await propertyService.updateProperty(propertyData);
        if (!result.success) {
            addToast({ type: 'error', title: 'Falha ao salvar', message: result.error || 'Nao foi possivel atualizar a propriedade.' });
            return;
        }
        addToast({ type: 'success', title: 'Propriedade atualizada', message: 'Cadastro salvo no Firebase.' });
    };

    const handleCreateLot = async () => {
        if (!newLot.name || !newLot.category || !newLot.headcount || !newLot.averageWeightKg) {
            addToast({ type: 'warning', title: 'Dados incompletos', message: 'Preencha os dados do lote.' });
            return;
        }
        await producerOpsService.createAnimalLot({
            name: newLot.name,
            category: newLot.category,
            headcount: Number(newLot.headcount),
            averageWeightKg: Number(newLot.averageWeightKg),
        });
        setNewLot({ name: '', category: '', headcount: '', averageWeightKg: '' });
        await refreshRegistryData();
        addToast({ type: 'success', title: 'Lote cadastrado', message: 'Lote salvo com sucesso.' });
    };

    const handleCreateInput = async () => {
        if (!newInput.name || !newInput.unitCost || !newInput.stock) {
            addToast({ type: 'warning', title: 'Dados incompletos', message: 'Preencha os dados do insumo.' });
            return;
        }
        if (
            SPECIES_REQUIRED_TYPES.has(newInput.inputType) &&
            activityProfile.allowedTargetSpecies.length > 0 &&
            newInput.targetSpecies.length === 0
        ) {
            addToast({ type: 'warning', title: 'Classificacao obrigatoria', message: 'Selecione ao menos uma especie-alvo para este tipo de insumo.' });
            return;
        }
        await producerOpsService.createInput({
            name: newInput.name,
            inputType: newInput.inputType,
            applicationArea: newInput.applicationArea,
            targetSpecies: newInput.targetSpecies,
            launchLinkType: newInput.launchLinkType,
            linkedAnimalId: newInput.launchLinkType === 'ANIMAL' ? newInput.linkedAnimalId : undefined,
            linkedLotId: newInput.launchLinkType === 'LOTE' ? newInput.linkedLotId : undefined,
            linkedPlotId: newInput.launchLinkType === 'TALHAO' ? newInput.linkedPlotId : undefined,
            unit: newInput.unit,
            unitCost: Number(newInput.unitCost),
            stock: Number(newInput.stock),
        });
        setNewInput({
            name: '',
            inputType: 'RACAO',
            applicationArea: activityProfile.allowedApplicationAreas[0] ?? DEFAULT_AREA_BY_TYPE.RACAO,
            targetSpecies: activityProfile.defaultTargetSpecies,
            launchLinkType: 'GERAL',
            linkedAnimalId: '',
            linkedLotId: '',
            linkedPlotId: '',
            unit: activityProfile.defaultInputUnit,
            unitCost: '',
            stock: '',
        });
        await refreshRegistryData();
        addToast({ type: 'success', title: 'Insumo cadastrado', message: 'Insumo salvo com sucesso.' });
    };

    const handleInputTypeChange = (inputType: ProducerInputType) => {
        const suggestedArea = DEFAULT_AREA_BY_TYPE[inputType];
        const normalizedArea = activityProfile.allowedApplicationAreas.includes(suggestedArea)
            ? suggestedArea
            : activityProfile.allowedApplicationAreas[0] ?? suggestedArea;

        setNewInput((previous) => ({
            ...previous,
            inputType,
            applicationArea: normalizedArea,
            targetSpecies: SPECIES_REQUIRED_TYPES.has(inputType)
                ? (() => {
                    const nextSpecies = previous.targetSpecies.filter((entry) => activityProfile.allowedTargetSpecies.includes(entry));
                    if (nextSpecies.length > 0) {
                        return nextSpecies;
                    }
                    return activityProfile.defaultTargetSpecies;
                })()
                : [],
        }));
    };

    const toggleInputSpecies = (species: ProducerTargetSpecies) => {
        if (!activityProfile.allowedTargetSpecies.includes(species)) {
            return;
        }
        setNewInput((previous) => {
            if (previous.targetSpecies.includes(species)) {
                return { ...previous, targetSpecies: previous.targetSpecies.filter((entry) => entry !== species) };
            }
            return { ...previous, targetSpecies: [...previous.targetSpecies, species] };
        });
    };

    const handleCreateExpense = async () => {
        if (!newExpense.description || !newExpense.amount) {
            addToast({ type: 'warning', title: 'Dados incompletos', message: 'Preencha os dados da despesa.' });
            return;
        }
        await producerOpsService.createExpense({
            description: newExpense.description,
            category: newExpense.category as 'OPERACIONAL' | 'INSUMO' | 'MANUTENCAO' | 'PESSOAL' | 'OUTROS',
            amount: Number(newExpense.amount),
            source: 'ADMINISTRADOR',
        });
        setNewExpense({ description: '', category: 'OPERACIONAL', amount: '' });
        await refreshRegistryData();
        addToast({ type: 'success', title: 'Despesa lancada', message: 'Despesa registrada no operacional.' });
    };

    const handleCreateLotAuditReading = async () => {
        if (!selectedLot) {
            addToast({ type: 'warning', title: 'Lote obrigatorio', message: 'Selecione o lote antes de iniciar a leitura de auditoria.' });
            return;
        }
        if (!auditForm.evidenceReference.trim()) {
            addToast({ type: 'warning', title: 'Evidencia obrigatoria', message: 'Informe a evidencia digital da conferencia/pesagem.' });
            return;
        }

        const checkedHeadcount = Number(auditForm.checkedHeadcount || 0);
        const checkedWeightKg = Number(auditForm.checkedWeightKg || 0);

        await reportsService.createLotAuditReading({
            actor: currentUser?.name ?? 'Produtor',
            lotId: selectedLot.id,
            lotName: selectedLot.name,
            checkedHeadcount,
            checkedWeightKg,
            notes: auditForm.notes,
            evidenceReference: auditForm.evidenceReference,
        });

        setAuditForm({
            checkedHeadcount: '',
            checkedWeightKg: '',
            evidenceReference: '',
            notes: '',
        });
        await refreshRegistryData();
        addToast({ type: 'success', title: 'Leitura registrada', message: 'Conferencia/pesagem do lote registrada com auditoria.' });
    };

    const marketReferencePrice = useMemo(() => {
        const exactCommodity = marketTrends.find((trend) => trend.commodity === simCommodity);
        if (exactCommodity) {
            return exactCommodity.price;
        }
        const fallbackCommodity = marketTrends.find((trend) => trend.commodity === activityProfile.defaultCommodity);
        return fallbackCommodity?.price || 295.0;
    }, [marketTrends, simCommodity, activityProfile.defaultCommodity]);

    useEffect(() => {
        setSimCommodity(activityProfile.defaultCommodity);
    }, [activityProfile.defaultCommodity]);

    useEffect(() => {
        if (salePrice === 0) {
            setSalePrice(marketReferencePrice);
        }
    }, [marketReferencePrice, salePrice]);

    const revenuePerHead = salePrice * saleWeight;
    const totalCostPerHead = costPerUnit * saleWeight;
    const grossMarginPerHead = revenuePerHead - totalCostPerHead;
    const marginPercent = totalCostPerHead > 0 ? (grossMarginPerHead / totalCostPerHead) * 100 : 0;
    const exchangeRatio = replacementCost > 0 ? (revenuePerHead / replacementCost) : 0;

    const scenarios = useMemo(() => {
        const variations = [-0.1, 0, 0.1];
        return variations.map(v => {
            const p = salePrice * (1 + v);
            const r = p * saleWeight;
            const m = r - totalCostPerHead;
            return {
                label: v === 0 ? 'Cenario Base' : v > 0 ? 'Otimista (+10%)' : 'Pessimista (-10%)',
                price: p,
                margin: m,
                roi: totalCostPerHead > 0 ? (m / totalCostPerHead) * 100 : 0,
                ratio: replacementCost > 0 ? (r / replacementCost) : 0
            };
        });
    }, [salePrice, saleWeight, totalCostPerHead, replacementCost]);

    const capacityProgressPercent = capacityData && capacityData.totalDays > 0
        ? Math.min(100, Math.max(0, (capacityData.daysElapsed / capacityData.totalDays) * 100))
        : 0;

    const capacityMortalityPercent = capacityData && capacityData.animalsIn > 0
        ? (capacityData.mortality / capacityData.animalsIn) * 100
        : 0;

    const inputsByArea = useMemo(() => {
        return inputs.reduce<Record<ProducerApplicationArea, typeof inputs>>(
            (grouped, input) => {
                if (!grouped[input.applicationArea]) {
                    grouped[input.applicationArea] = [];
                }
                grouped[input.applicationArea].push(input);
                return grouped;
            },
            {} as Record<ProducerApplicationArea, typeof inputs>
        );
    }, [inputs]);

    if (isLoading) {
        return <LoadingSpinner text="Carregando relatorios..." />;
    }

    if (loadError) {
        return <div className="p-6 bg-red-50 text-red-700 border border-red-200 rounded-lg">{loadError}</div>;
    }

    return (
        <div className="max-w-6xl mx-auto pb-20">
            <h2 className="text-3xl font-bold text-slate-800 mb-2 flex items-center">
                <ChartBarIcon className="h-8 w-8 mr-3 text-indigo-600" />
                Relatorios Gerenciais & Performance
            </h2>
            <p className="text-slate-600 mb-4">
                Analise detalhada baseada nos lancamentos operacionais de campo.
                {activeProject ? ` Perfil automatico ativo: ${activeProject.type}.` : ''}
            </p>
            {activeProject && (
                <div className="mb-6 rounded-xl border border-slate-200 bg-white p-4">
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                        Adaptacao automatica por atividade
                    </p>
                    <p className="mt-1 text-sm text-slate-700">
                        Unidade principal: <span className="font-semibold">{activityProfile.unitLabel}</span> | Agrupamento:
                        <span className="font-semibold"> {activityProfile.lotLabel}</span>
                    </p>
                    <p className="mt-2 text-xs text-slate-600">
                        Campos obrigatorios: {activityProfile.requiredRegistryFields.join(' | ')}
                    </p>
                    <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
                        {activityProfile.checklist.map((item) => (
                            <p key={item} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
                                {item}
                            </p>
                        ))}
                    </div>
                    {activityProfile.embrapaReferences.length > 0 && (
                        <div className="mt-3">
                            <p className="text-xs font-semibold text-slate-700">Referencias tecnicas Embrapa</p>
                            <div className="mt-1 space-y-1">
                                {activityProfile.embrapaReferences.map((reference) => (
                                    <a
                                        className="block text-xs text-indigo-700 hover:underline"
                                        href={reference.url}
                                        key={reference.url}
                                        rel="noreferrer"
                                        target="_blank"
                                    >
                                        {reference.title}
                                    </a>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
            {partialWarnings.length > 0 && (
                <div className="mb-6 p-4 rounded-lg border border-amber-200 bg-amber-50 text-amber-800 text-sm">
                    <p className="font-semibold mb-1">Carregamento parcial detectado</p>
                    <p>Algumas fontes falharam e foram ignoradas temporariamente:</p>
                    <p className="mt-1 text-xs">{partialWarnings.slice(0, 4).join(' | ')}</p>
                </div>
            )}

            <div className="flex flex-wrap gap-2 bg-slate-200 p-1 rounded-lg mb-8 w-fit">
                <button onClick={() => setActiveReport('CONSUMPTION')} className={`flex items-center px-4 md:px-6 py-2 rounded-md text-xs md:text-sm font-semibold transition-colors ${activeReport === 'CONSUMPTION' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-600 hover:bg-slate-300'}`}><CubeIcon className="h-4 w-4 mr-2" />Consumo</button>
                <button onClick={() => setActiveReport('CAPACITY')} className={`flex items-center px-4 md:px-6 py-2 rounded-md text-xs md:text-sm font-semibold transition-colors ${activeReport === 'CAPACITY' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-600 hover:bg-slate-300'}`}><TrendingUpIcon className="h-4 w-4 mr-2" />Capacidade</button>
                <button onClick={() => setActiveReport('MARGIN')} className={`flex items-center px-4 md:px-6 py-2 rounded-md text-xs md:text-sm font-semibold transition-colors ${activeReport === 'MARGIN' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-600 hover:bg-slate-300'}`}><CashIcon className="h-4 w-4 mr-2" />Margem & Lucro</button>
                <button onClick={() => setActiveReport('REGISTRY')} className={`flex items-center px-4 md:px-6 py-2 rounded-md text-xs md:text-sm font-semibold transition-colors ${activeReport === 'REGISTRY' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-600 hover:bg-slate-300'}`}>Cadastros</button>
            </div>

            {activeReport === 'CONSUMPTION' && (
                <div className="animate-fade-in space-y-6">
                    <div className="bg-white p-6 rounded-xl shadow-md border border-slate-200">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-slate-800">Relatorio de Consumo por Lote</h3>
                            <select value={selectedLotId} onChange={(e) => setSelectedLotId(e.target.value)} className="p-2 border border-slate-300 rounded-md bg-slate-50 text-sm font-semibold text-slate-700">
                                {lots.map((lot) => <option key={lot.id} value={lot.id}>{lot.name}</option>)}
                            </select>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                            <div className="p-4 bg-indigo-50 rounded-lg border border-indigo-100">
                                <p className="text-xs font-bold text-indigo-800 uppercase">
                                    Total de {activityProfile.unitLabel} no {activityProfile.lotLabel}
                                </p>
                                <p className="text-2xl font-bold text-indigo-900">
                                    {registryKpis.totalAnimals} <span className="text-sm font-normal">{activityProfile.unitLabel}</span>
                                </p>
                            </div>
                            <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-100">
                                <p className="text-xs font-bold text-emerald-800 uppercase">Custo Medio Total / Cabeca</p>
                                <p className="text-2xl font-bold text-emerald-900">{formatCurrency(registryKpis.costPerHead)}</p>
                            </div>
                            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                                <p className="text-xs font-bold text-slate-600 uppercase">Despesas Operacionais</p>
                                <p className="text-lg font-bold text-slate-800">{formatCurrency(registryKpis.totalExpenses)}</p>
                            </div>
                        </div>

                        <div className="mb-8 rounded-lg border border-slate-200 p-4 bg-slate-50">
                            <h4 className="font-bold text-slate-800 mb-2">Auditoria de lote (leitura, conferencia e pesagem)</h4>
                            <p className="text-xs text-slate-600 mb-3">
                                Selecione primeiro o lote auditado e registre leitura com evidencia digital para liberar o fechamento.
                            </p>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                                <input
                                    value={auditForm.checkedHeadcount}
                                    onChange={(e) => setAuditForm((prev) => ({ ...prev, checkedHeadcount: e.target.value }))}
                                    className="p-2 border rounded"
                                    placeholder="Cabecas conferidas"
                                />
                                <input
                                    value={auditForm.checkedWeightKg}
                                    onChange={(e) => setAuditForm((prev) => ({ ...prev, checkedWeightKg: e.target.value }))}
                                    className="p-2 border rounded"
                                    placeholder="Peso conferido (kg)"
                                />
                                <input
                                    value={auditForm.evidenceReference}
                                    onChange={(e) => setAuditForm((prev) => ({ ...prev, evidenceReference: e.target.value }))}
                                    className="p-2 border rounded"
                                    placeholder="Evidencia digital (QR/foto/video/hash)"
                                />
                                <input
                                    value={auditForm.notes}
                                    onChange={(e) => setAuditForm((prev) => ({ ...prev, notes: e.target.value }))}
                                    className="p-2 border rounded"
                                    placeholder="Observacoes"
                                />
                            </div>
                            <button onClick={() => void handleCreateLotAuditReading()} className="mt-3 px-4 py-2 bg-indigo-600 text-white rounded-md font-semibold">
                                Registrar leitura de auditoria
                            </button>
                            <div className="mt-3 space-y-2">
                                {filteredLotAudits.slice(0, 5).map((audit) => (
                                    <div key={audit.id} className="text-xs flex flex-wrap gap-3 justify-between border-b border-slate-200 pb-2">
                                        <span>{audit.lotName}</span>
                                        <span>cabecas: {audit.checkedHeadcount}</span>
                                        <span>peso: {audit.checkedWeightKg} kg</span>
                                        <span>{new Date(audit.createdAt).toLocaleString('pt-BR')}</span>
                                    </div>
                                ))}
                                {filteredLotAudits.length === 0 && (
                                    <p className="text-xs text-slate-500">Nenhuma leitura de auditoria registrada para este lote.</p>
                                )}
                            </div>
                        </div>

                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-100 text-xs text-slate-700 uppercase">
                                <tr>
                                    <th className="p-4 rounded-tl-lg">Produto / Insumo</th>
                                    <th className="p-4">Consumo Total (Lote)</th>
                                    <th className="p-4">Media / Animal</th>
                                    <th className="p-4">Media Diaria</th>
                                    <th className="p-4 rounded-tr-lg text-right">Custo Estimado</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredConsumptionData.length === 0 && (
                                    <tr>
                                        <td className="p-4 text-slate-500" colSpan={5}>
                                            Nenhum dado de consumo disponivel para o periodo.
                                        </td>
                                    </tr>
                                )}
                                {filteredConsumptionData.map((row) => (
                                    <tr key={row.id} className="border-b hover:bg-slate-50">
                                        <td className="p-4 font-bold text-slate-700">{row.product}</td>
                                        <td className="p-4 font-mono text-slate-600">{row.total}</td>
                                        <td className="p-4 font-mono text-indigo-600 font-bold">{row.avgPerAnimal}</td>
                                        <td className="p-4 text-slate-500">{row.dailyAvg}</td>
                                        <td className="p-4 text-right font-bold text-slate-800">{row.costPerHead}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {activeReport === 'CAPACITY' && (
                <div className="animate-fade-in">
                    {capacityData ? (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            <div className="bg-white p-6 rounded-xl shadow-md border border-slate-200">
                                <h3 className="text-xl font-bold text-slate-800 mb-6">Tempo de Producao (Ciclo Atual)</h3>
                                <div className="relative pt-6 pb-2">
                                    <div className="flex justify-between text-xs font-bold text-slate-500 mb-2 uppercase">
                                        <span>Inicio: {capacityData.cycleStart}</span>
                                        <span>Hoje (Dia {capacityData.daysElapsed})</span>
                                        <span>Meta: {capacityData.projectedEnd}</span>
                                    </div>
                                    <div className="w-full h-4 bg-slate-200 rounded-full overflow-hidden">
                                        <div className="h-full bg-indigo-600 rounded-full" style={{ width: `${capacityProgressPercent}%` }}></div>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white p-6 rounded-xl shadow-md border border-slate-200">
                                <h3 className="text-xl font-bold text-slate-800 mb-6">Capacidade & Evolucao</h3>
                                <ul className="space-y-4">
                                    <li className="flex justify-between items-center p-3 bg-slate-50 rounded"><span className="text-sm font-semibold text-slate-600">{activityProfile.unitLabel} Entrados</span><span className="font-bold text-slate-800">{capacityData.animalsIn}</span></li>
                                    <li className="flex justify-between items-center p-3 bg-slate-50 rounded"><span className="text-sm font-semibold text-slate-600">Mortalidade / Perda</span><span className="font-bold text-red-600">{capacityData.mortality} ({capacityMortalityPercent.toFixed(1)}%)</span></li>
                                    <li className="flex justify-between items-center p-3 bg-slate-50 rounded"><span className="text-sm font-semibold text-slate-600">{activityProfile.averageMeasureLabel}</span><span className="font-bold text-indigo-600">{capacityData.currentWeight}</span></li>
                                    <li className="flex justify-between items-center p-3 border border-indigo-100 bg-indigo-50 rounded"><span className="text-sm font-bold text-indigo-800">Peso Meta (Abate)</span><span className="font-bold text-indigo-800">{capacityData.projectedWeight}</span></li>
                                </ul>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-white p-8 rounded-xl shadow-md border border-slate-200">
                            <h3 className="text-xl font-bold text-slate-800 mb-2">Capacidade produtiva indisponivel</h3>
                            <p className="text-sm text-slate-600 mb-4">
                                Nao encontramos o documento `reportCapacity/current` no Firestore ou houve falha de leitura.
                            </p>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="p-4 bg-slate-50 rounded border border-slate-200">
                                    <p className="text-xs uppercase font-bold text-slate-500">{activityProfile.unitLabel} cadastrados</p>
                                    <p className="text-xl font-bold text-slate-800">{registryKpis.totalAnimals}</p>
                                </div>
                                <div className="p-4 bg-slate-50 rounded border border-slate-200">
                                    <p className="text-xs uppercase font-bold text-slate-500">Despesa operacional</p>
                                    <p className="text-xl font-bold text-slate-800">{formatCurrency(registryKpis.totalExpenses)}</p>
                                </div>
                                <div className="p-4 bg-slate-50 rounded border border-slate-200">
                                    <p className="text-xs uppercase font-bold text-slate-500">Custo por {activityProfile.unitLabel}</p>
                                    <p className="text-xl font-bold text-slate-800">{formatCurrency(registryKpis.costPerHead)}</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {activeReport === 'MARGIN' && (
                <div className="animate-fade-in space-y-8">
                    <div className="bg-white p-8 rounded-xl shadow-md border border-slate-200">
                        <div className="flex items-center mb-6"><CalculatorIcon className="h-6 w-6 text-emerald-600 mr-2" /><h3 className="text-xl font-bold text-slate-800">Simulador de Lucratividade em Tempo Real</h3></div>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Cenario de Mercado</label>
                                <select value={simCommodity} onChange={(e) => setSimCommodity(e.target.value)} className="w-full p-3 border border-slate-300 rounded-md">
                                    {[activityProfile.defaultCommodity, ...marketTrends.map((trend) => trend.commodity)]
                                        .filter((value, index, array) => array.indexOf(value) === index)
                                        .map((commodity) => (
                                            <option key={commodity} value={commodity}>{commodity}</option>
                                        ))}
                                </select>
                            </div>
                            <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Preco Venda (@)</label><input type="number" value={salePrice} onChange={(e) => setSalePrice(Number(e.target.value || 0))} className="w-full p-3 border border-slate-300 rounded-md" /></div>
                            <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Custo por @</label><input type="number" value={costPerUnit} onChange={(e) => setCostPerUnit(Number(e.target.value || 0))} className="w-full p-3 border border-slate-300 rounded-md" /></div>
                            <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">{activityProfile.volumeInputLabel}</label><input type="number" value={saleWeight} onChange={(e) => setSaleWeight(Number(e.target.value || 0))} className="w-full p-3 border border-slate-300 rounded-md" /></div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="p-4 bg-emerald-50 rounded-lg"><p className="text-xs uppercase text-emerald-700 font-bold">Margem Bruta / Cabeca</p><p className="text-2xl font-bold text-emerald-700">{formatCurrency(grossMarginPerHead)}</p></div>
                            <div className="p-4 bg-indigo-50 rounded-lg"><p className="text-xs uppercase text-indigo-700 font-bold">Margem (%)</p><p className="text-2xl font-bold text-indigo-700">{marginPercent.toFixed(1)}%</p></div>
                            <div className="p-4 bg-amber-50 rounded-lg"><p className="text-xs uppercase text-amber-700 font-bold">Relacao de Troca</p><p className="text-2xl font-bold text-amber-700">{exchangeRatio.toFixed(2)}</p></div>
                        </div>
                        <div className="mt-6"><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Custo reposicao</label><input type="number" value={replacementCost} onChange={(e) => setReplacementCost(Number(e.target.value || 0))} className="w-full md:w-64 p-3 border border-slate-300 rounded-md" /></div>
                        <div className="mt-6 overflow-x-auto"><table className="w-full text-sm"><thead><tr className="bg-slate-100"><th className="p-3 text-left">Cenario</th><th className="p-3 text-left">Preco</th><th className="p-3 text-left">Margem</th><th className="p-3 text-left">ROI</th><th className="p-3 text-left">Relacao</th></tr></thead><tbody>{scenarios.map((scenario) => (<tr key={scenario.label} className="border-b"><td className="p-3 font-semibold">{scenario.label}</td><td className="p-3">{formatCurrency(scenario.price)}</td><td className="p-3">{formatCurrency(scenario.margin)}</td><td className="p-3">{scenario.roi.toFixed(1)}%</td><td className="p-3">{scenario.ratio.toFixed(2)}</td></tr>))}</tbody></table></div>
                    </div>
                </div>
            )}

            {activeReport === 'REGISTRY' && (
                <div className="animate-fade-in space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-white p-4 rounded-lg border"><p className="text-xs uppercase text-slate-500 font-bold">{activityProfile.unitLabel} cadastrados</p><p className="text-2xl font-bold text-slate-800">{registryKpis.totalAnimals}</p></div>
                        <div className="bg-white p-4 rounded-lg border"><p className="text-xs uppercase text-slate-500 font-bold">Despesas Operacionais</p><p className="text-2xl font-bold text-slate-800">{formatCurrency(registryKpis.totalExpenses)}</p></div>
                        <div className="bg-white p-4 rounded-lg border"><p className="text-xs uppercase text-slate-500 font-bold">Custo medio por {activityProfile.unitLabel}</p><p className="text-2xl font-bold text-slate-800">{formatCurrency(registryKpis.costPerHead)}</p></div>
                    </div>

                    {propertyData && (
                        <div className="bg-white p-6 rounded-xl shadow-md border border-slate-200">
                            <h3 className="text-lg font-bold text-slate-800 mb-4">Cadastro da Propriedade</h3>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                                <input value={propertyData.name} onChange={(e) => setPropertyData({ ...propertyData, name: e.target.value })} className="p-2 border rounded" placeholder="Nome" />
                                <input value={propertyData.carNumber} onChange={(e) => setPropertyData({ ...propertyData, carNumber: e.target.value })} className="p-2 border rounded" placeholder="CAR" />
                                <input type="number" value={propertyData.totalArea} onChange={(e) => setPropertyData({ ...propertyData, totalArea: Number(e.target.value || 0) })} className="p-2 border rounded" placeholder="Area" />
                                <input type="number" value={propertyData.animalCount} onChange={(e) => setPropertyData({ ...propertyData, animalCount: Number(e.target.value || 0) })} className="p-2 border rounded" placeholder="Animais" />
                            </div>
                            <button onClick={() => void handleSaveProperty()} className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-md font-semibold">Salvar propriedade</button>
                        </div>
                    )}

                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                        <div className="bg-white p-6 rounded-xl shadow-md border border-slate-200 space-y-4">
                            <h3 className="text-lg font-bold text-slate-800">Cadastro de {activityProfile.lotLabel}</h3>
                            <div className="grid grid-cols-2 gap-3">
                                <input value={newLot.name} onChange={(e) => setNewLot({ ...newLot, name: e.target.value })} className="p-2 border rounded" placeholder={`Nome do ${activityProfile.lotLabel.toLowerCase()}`} />
                                <input value={newLot.category} onChange={(e) => setNewLot({ ...newLot, category: e.target.value })} className="p-2 border rounded" placeholder={activityProfile.lotCategoryLabel} />
                                <input type="number" value={newLot.headcount} onChange={(e) => setNewLot({ ...newLot, headcount: e.target.value })} className="p-2 border rounded" placeholder={`Qtd ${activityProfile.unitLabel}`} />
                                <input type="number" value={newLot.averageWeightKg} onChange={(e) => setNewLot({ ...newLot, averageWeightKg: e.target.value })} className="p-2 border rounded" placeholder={activityProfile.averageMeasureLabel} />
                            </div>
                            <button onClick={() => void handleCreateLot()} className="px-4 py-2 bg-emerald-600 text-white rounded-md font-semibold">Cadastrar lote</button>
                            <div className="border-t pt-3 space-y-2">{lots.map((lot) => <div key={lot.id} className="text-sm flex justify-between"><span>{lot.name} ({lot.category})</span><span className="font-semibold">{lot.headcount} {activityProfile.unitLabel}</span></div>)}</div>
                        </div>

                        <div className="bg-white p-6 rounded-xl shadow-md border border-slate-200 space-y-4">
                            <h3 className="text-lg font-bold text-slate-800">Cadastro de {activityProfile.inventoryLabel}</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <input value={newInput.name} onChange={(e) => setNewInput({ ...newInput, name: e.target.value })} className="p-2 border rounded" placeholder="Nome do insumo" />
                                <select value={newInput.inputType} onChange={(e) => handleInputTypeChange(e.target.value as ProducerInputType)} className="p-2 border rounded">
                                    {Object.entries(INPUT_TYPE_LABELS).filter(([value]) => activityProfile.allowedInputTypes.includes(value as ProducerInputType)).map(([value, label]) => (
                                        <option key={value} value={value}>{label}</option>
                                    ))}
                                </select>
                                <select value={newInput.applicationArea} onChange={(e) => setNewInput({ ...newInput, applicationArea: e.target.value as ProducerApplicationArea })} className="p-2 border rounded">
                                    {allowedAreaEntries.map(([value, label]) => (
                                        <option key={value} value={value}>{label}</option>
                                    ))}
                                </select>
                                <input value={newInput.unit} onChange={(e) => setNewInput({ ...newInput, unit: e.target.value })} className="p-2 border rounded" placeholder="Unidade" />
                                <input type="number" value={newInput.unitCost} onChange={(e) => setNewInput({ ...newInput, unitCost: e.target.value })} className="p-2 border rounded" placeholder="Custo unitario" />
                                <input type="number" value={newInput.stock} onChange={(e) => setNewInput({ ...newInput, stock: e.target.value })} className="p-2 border rounded" placeholder="Estoque" />
                                <select
                                    value={newInput.launchLinkType}
                                    onChange={(e) => setNewInput({ ...newInput, launchLinkType: e.target.value as 'GERAL' | 'ANIMAL' | 'LOTE' | 'TALHAO', linkedAnimalId: '', linkedLotId: '', linkedPlotId: '' })}
                                    className="p-2 border rounded"
                                >
                                    <option value="GERAL">Lancamento geral</option>
                                    <option value="ANIMAL">Vincular a animal</option>
                                    <option value="LOTE">Vincular a lote</option>
                                    <option value="TALHAO">Vincular a talhao</option>
                                </select>
                                {newInput.launchLinkType === 'ANIMAL' && (
                                    <select value={newInput.linkedAnimalId} onChange={(e) => setNewInput({ ...newInput, linkedAnimalId: e.target.value })} className="p-2 border rounded">
                                        <option value="">Selecionar animal</option>
                                        {animals.map((animal) => (
                                            <option key={animal.id} value={animal.id}>{animal.earringCode} ({animal.species})</option>
                                        ))}
                                    </select>
                                )}
                                {newInput.launchLinkType === 'LOTE' && (
                                    <select value={newInput.linkedLotId} onChange={(e) => setNewInput({ ...newInput, linkedLotId: e.target.value })} className="p-2 border rounded">
                                        <option value="">Selecionar lote</option>
                                        {lots.map((lot) => (
                                            <option key={lot.id} value={lot.id}>{lot.name}</option>
                                        ))}
                                    </select>
                                )}
                                {newInput.launchLinkType === 'TALHAO' && (
                                    <select value={newInput.linkedPlotId} onChange={(e) => setNewInput({ ...newInput, linkedPlotId: e.target.value })} className="p-2 border rounded">
                                        <option value="">Selecionar talhao/pasto</option>
                                        {plots.map((plot) => (
                                            <option key={plot.id} value={plot.id}>{plot.name}</option>
                                        ))}
                                    </select>
                                )}
                            </div>
                            <div className="border rounded-lg p-3 bg-slate-50">
                                <p className="text-xs font-bold text-slate-600 uppercase mb-2">Especie-alvo</p>
                                {allowedTargetSpeciesEntries.length > 0 ? (
                                    <div className="flex flex-wrap gap-2">
                                    {allowedTargetSpeciesEntries.map(([value, label]) => {
                                        const species = value as ProducerTargetSpecies;
                                        const checked = newInput.targetSpecies.includes(species);
                                        return (
                                            <label key={value} className="inline-flex items-center gap-2 text-sm text-slate-700 bg-white border rounded px-2 py-1">
                                                <input
                                                    type="checkbox"
                                                    checked={checked}
                                                    onChange={() => toggleInputSpecies(species)}
                                                    disabled={!SPECIES_REQUIRED_TYPES.has(newInput.inputType)}
                                                />
                                                {label}
                                            </label>
                                        );
                                    })}
                                    </div>
                                ) : (
                                    <p className="text-xs text-slate-500">
                                        Este perfil utiliza classificacao de insumo sem especie-alvo na interface.
                                    </p>
                                )}
                                {!SPECIES_REQUIRED_TYPES.has(newInput.inputType) && allowedTargetSpeciesEntries.length > 0 && (
                                    <p className="text-xs text-slate-500 mt-2">Para este tipo de insumo, a especie-alvo e opcional.</p>
                                )}
                            </div>
                            <button onClick={() => void handleCreateInput()} className="px-4 py-2 bg-emerald-600 text-white rounded-md font-semibold">Cadastrar insumo</button>
                            <div className="border-t pt-3 space-y-3">
                                {Object.entries(inputsByArea).map(([area, areaInputs]) => (
                                    <div key={area} className="border rounded-lg p-3">
                                        <p className="text-xs font-bold uppercase text-slate-500 mb-2">
                                            {APPLICATION_AREA_LABELS[area as ProducerApplicationArea]}
                                        </p>
                                        <div className="space-y-2">
                                            {areaInputs.map((input) => (
                                                <div key={input.id} className="text-sm flex flex-col gap-1 border-b border-slate-100 pb-2 last:border-b-0">
                                                    <div className="flex justify-between">
                                                        <span className="font-semibold text-slate-800">{input.name}</span>
                                                        <span className="font-semibold">{input.stock} {input.unit}</span>
                                                    </div>
                                                    <div className="flex flex-wrap gap-2 text-xs text-slate-600">
                                                        <span className="px-2 py-0.5 rounded bg-slate-100">{INPUT_TYPE_LABELS[input.inputType]}</span>
                                                        <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700">{resolveInputLinkLabel(input)}</span>
                                                        {input.targetSpecies.length > 0 && (
                                                            <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700">
                                                                {input.targetSpecies.map((species) => SPECIES_LABELS[species]).join(', ')}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-xl shadow-md border border-slate-200 space-y-4">
                        <h3 className="text-lg font-bold text-slate-800">Cadastro de Despesas Operacionais</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <input value={newExpense.description} onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })} className="p-2 border rounded" placeholder="Descricao" />
                            <select value={newExpense.category} onChange={(e) => setNewExpense({ ...newExpense, category: e.target.value })} className="p-2 border rounded">
                                <option value="OPERACIONAL">Operacional</option>
                                <option value="INSUMO">Insumo</option>
                                <option value="MANUTENCAO">Manutencao</option>
                                <option value="PESSOAL">Pessoal</option>
                                <option value="OUTROS">Outros</option>
                            </select>
                            <input type="number" value={newExpense.amount} onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })} className="p-2 border rounded" placeholder="Valor (R$)" />
                        </div>
                        <button onClick={() => void handleCreateExpense()} className="px-4 py-2 bg-emerald-600 text-white rounded-md font-semibold">Lancar despesa</button>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead><tr className="bg-slate-100"><th className="p-2 text-left">Data</th><th className="p-2 text-left">Descricao</th><th className="p-2 text-left">Categoria</th><th className="p-2 text-right">Valor</th></tr></thead>
                                <tbody>{expenses.map((expense) => (<tr key={expense.id} className="border-b"><td className="p-2">{expense.date}</td><td className="p-2">{expense.description}</td><td className="p-2">{expense.category}</td><td className="p-2 text-right font-semibold">{formatCurrency(expense.amount)}</td></tr>))}</tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ReportsView;
