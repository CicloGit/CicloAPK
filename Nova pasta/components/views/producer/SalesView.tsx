import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ConsumerMarketChannel,
  InventoryItem,
  Pasture,
  ProducerAnimal,
  ProducerAnimalLot,
  ProducerBuyerDocumentType,
  ProducerEscrowStatus,
  ProducerFiscalStatus,
  ProducerPdvSale,
  ProducerSaleSettlementMode,
  ProducerSaleSourceType,
  SalesOffer,
  SalesOfferStatus,
} from '../../../types';
import LoadingSpinner from '../../shared/LoadingSpinner';
import CodeScannerField from '../../shared/CodeScannerField';
import VoiceCommandPanel from '../../shared/VoiceCommandPanel';
import TrashIcon from '../../icons/TrashIcon';
import CheckCircleIcon from '../../icons/CheckCircleIcon';
import { salesService } from '../../../services/salesService';
import { producerOpsService } from '../../../services/producerOpsService';
import { propertyService } from '../../../services/propertyService';
import { stockService } from '../../../services/stockService';
import { storageService } from '../../../services/storageService';
import { useApp } from '../../../contexts/AppContext';

type SalesTab = 'PDV' | 'ANIMALS' | 'OFFERS';

const StatusBadge: React.FC<{ status: SalesOfferStatus }> = ({ status }) => {
  const statusStyles: Record<SalesOfferStatus, string> = {
    ATIVA: 'bg-green-100 text-green-800',
    VENDIDO: 'bg-blue-100 text-blue-800',
    CANCELADA: 'bg-slate-100 text-slate-800',
  };
  return <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusStyles[status]}`}>{status}</span>;
};

const FiscalBadge: React.FC<{ status: ProducerFiscalStatus }> = ({ status }) => {
  const styleMap: Record<ProducerFiscalStatus, string> = {
    NF_EMITIDA: 'bg-emerald-100 text-emerald-700',
    AGUARDANDO_FINALIZACAO_LEILAO: 'bg-amber-100 text-amber-700',
    AGUARDANDO_EMISSAO: 'bg-slate-100 text-slate-700',
  };
  return <span className={`px-2 py-1 rounded text-xs font-semibold ${styleMap[status]}`}>{status}</span>;
};

const EscrowBadge: React.FC<{ status: ProducerEscrowStatus }> = ({ status }) => {
  const styleMap: Record<ProducerEscrowStatus, string> = {
    ATIVO: 'bg-indigo-100 text-indigo-700',
    LIBERADO: 'bg-emerald-100 text-emerald-700',
  };
  return <span className={`px-2 py-1 rounded text-xs font-semibold ${styleMap[status]}`}>{status}</span>;
};

const channelLabel = (channel?: ConsumerMarketChannel) =>
  (channel ?? 'WHOLESALE_DIRECT') === 'WHOLESALE_DIRECT' ? 'Atacadista Direto' : 'Mercados';

const modeLabel = (mode?: SalesOffer['listingMode']) => ((mode ?? 'FIXED_PRICE') === 'AUCTION' ? 'Leilao' : 'Preco Fixo');

const sourceTypeLabel = (sourceType: ProducerSaleSourceType): string => {
  if (sourceType === 'ANIMAL_UNIT_LOT') return 'Animal por lote/unidade';
  if (sourceType === 'ANIMAL_WEIGHT') return 'Animal por peso';
  if (sourceType === 'ASSET') return 'Bem patrimonial';
  return 'Plantacao';
};

const settlementLabel = (mode: ProducerSaleSettlementMode): string =>
  mode === 'AUCTION_REMESSA' ? 'Remessa para leilao' : 'Venda direta';

const formatCurrency = (value: number): string =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const parseNumberInput = (value: string): number => {
  const sanitized = value.trim().replace(/[^\d,.-]/g, '');
  if (!sanitized) return 0;
  const normalized =
    sanitized.includes(',') && sanitized.includes('.')
      ? sanitized.replace(/\./g, '').replace(',', '.')
      : sanitized.includes(',')
        ? sanitized.replace(',', '.')
        : sanitized;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
};

const normalizeVoiceText = (value: string): string =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

const UNITARY_SPECIES = new Set<ProducerAnimal['species']>(['BOVINO', 'SUINO', 'OVINO']);
const GROUPED_SPECIES = new Set<ProducerAnimal['species']>(['AVE', 'PEIXE', 'OUTRO']);

const SalesView: React.FC = () => {
  const { currentUser } = useApp();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<SalesTab>('PDV');

  const [offers, setOffers] = useState<SalesOffer[]>([]);
  const [pdvSales, setPdvSales] = useState<ProducerPdvSale[]>([]);
  const [animals, setAnimals] = useState<ProducerAnimal[]>([]);
  const [animalLots, setAnimalLots] = useState<ProducerAnimalLot[]>([]);
  const [pastures, setPastures] = useState<Pasture[]>([]);
  const [assetStock, setAssetStock] = useState<InventoryItem[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmittingOffer, setIsSubmittingOffer] = useState(false);
  const [isSubmittingPdv, setIsSubmittingPdv] = useState(false);
  const [isSubmittingAnimal, setIsSubmittingAnimal] = useState(false);
  const [isSubmittingLot, setIsSubmittingLot] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [finalizingId, setFinalizingId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [partialWarnings, setPartialWarnings] = useState<string[]>([]);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const [newOffer, setNewOffer] = useState<{
    product: string;
    quantity: string;
    price: string;
    channel: ConsumerMarketChannel;
    offerType: 'PRODUTO' | 'ANIMAL' | 'UTENSILIO';
    listingMode: 'FIXED_PRICE' | 'AUCTION';
    description: string;
    location: string;
    auctionEndAt: string;
    minimumBid: string;
  }>({
    product: '',
    quantity: '',
    price: '',
    channel: 'WHOLESALE_DIRECT',
    offerType: 'PRODUTO',
    listingMode: 'FIXED_PRICE',
    description: '',
    location: '',
    auctionEndAt: '',
    minimumBid: '',
  });

  const [animalForm, setAnimalForm] = useState<{
    earringCode: string;
    species: ProducerAnimal['species'];
    category: string;
    trackingMode: ProducerAnimal['trackingMode'];
    currentWeightKg: string;
    pastureId: string;
  }>({
    earringCode: '',
    species: 'BOVINO',
    category: '',
    trackingMode: 'UNIT',
    currentWeightKg: '',
    pastureId: '',
  });

  const [earringScanInput, setEarringScanInput] = useState('');
  const [selectedAnimalIds, setSelectedAnimalIds] = useState<string[]>([]);
  const [lotForm, setLotForm] = useState({
    name: '',
    category: '',
    pastureId: '',
    distributionArea: '',
  });
  const [groupLotForm, setGroupLotForm] = useState({
    name: '',
    category: '',
    species: 'AVE' as ProducerAnimal['species'],
    phase: '',
    ageInDays: '',
    headcount: '',
    totalWeightKg: '',
    pastureId: '',
    distributionArea: '',
  });
  const [splitUnitLotForm, setSplitUnitLotForm] = useState({
    sourceLotId: '',
    newLotName: '',
    newLotCategory: '',
    separatedHeadcount: '',
    pastureId: '',
    distributionArea: '',
  });
  const [splitWeightLotForm, setSplitWeightLotForm] = useState({
    sourceLotId: '',
    newLotName: '',
    newLotCategory: '',
    separatedHeadcount: '',
    separatedWeightKg: '',
    phase: '',
    ageInDays: '',
    pastureId: '',
    distributionArea: '',
  });
  const [isSplittingLot, setIsSplittingLot] = useState(false);

  const [pdvForm, setPdvForm] = useState<{
    sourceType: ProducerSaleSourceType;
    settlementMode: ProducerSaleSettlementMode;
    buyerName: string;
    buyerDocumentType: ProducerBuyerDocumentType;
    buyerDocumentNumber: string;
    buyerStateRegistration: string;
    buyerEmail: string;
    buyerPhone: string;
    buyerAddressStreet: string;
    buyerAddressNumber: string;
    buyerAddressDistrict: string;
    buyerAddressCity: string;
    buyerAddressState: string;
    buyerAddressZipCode: string;
    description: string;
    unitPrice: string;
    lotId: string;
    headcount: string;
    animalWeightKg: string;
    fieldPlot: string;
    cropWeightKg: string;
    boxes: string;
    boxSize: string;
    qualityGrade: string;
    assetItemId: string;
    saleAuthorizationCode: string;
    vehiclePlate: string;
    scaleQrCode: string;
    deferFiscalEmission: boolean;
    qrCode: string;
  }>({
    sourceType: 'ANIMAL_UNIT_LOT',
    settlementMode: 'DIRECT_SALE',
    buyerName: '',
    buyerDocumentType: 'CPF',
    buyerDocumentNumber: '',
    buyerStateRegistration: '',
    buyerEmail: '',
    buyerPhone: '',
    buyerAddressStreet: '',
    buyerAddressNumber: '',
    buyerAddressDistrict: '',
    buyerAddressCity: '',
    buyerAddressState: '',
    buyerAddressZipCode: '',
    description: '',
    unitPrice: '',
    lotId: '',
    headcount: '',
    animalWeightKg: '',
    fieldPlot: '',
    cropWeightKg: '',
    boxes: '',
    boxSize: '',
    qualityGrade: '',
    assetItemId: '',
    saleAuthorizationCode: '',
    vehiclePlate: '',
    scaleQrCode: '',
    deferFiscalEmission: false,
    qrCode: '',
  });

  const [photoEvidence, setPhotoEvidence] = useState<File | null>(null);
  const [videoEvidence, setVideoEvidence] = useState<File | null>(null);
  const [authorizationEvidence, setAuthorizationEvidence] = useState<File | null>(null);

  const operationalAnimals = useMemo(
    () => animals.filter((animal) => (animal.lifecycleStatus ?? 'ACTIVE') !== 'CYCLE_CLOSED'),
    [animals]
  );

  const animalsByEarring = useMemo(() => {
    const map = new Map<string, ProducerAnimal>();
    operationalAnimals.forEach((animal) => map.set(animal.earringCode.trim().toUpperCase(), animal));
    return map;
  }, [operationalAnimals]);

  const selectedAnimals = useMemo(
    () => operationalAnimals.filter((animal) => selectedAnimalIds.includes(animal.id)),
    [operationalAnimals, selectedAnimalIds]
  );

  const unitaryAnimalLots = useMemo(
    () => animalLots.filter((lot) => lot.trackingMode !== 'WEIGHT'),
    [animalLots]
  );

  const groupedAnimalLots = useMemo(
    () => animalLots.filter((lot) => lot.trackingMode === 'WEIGHT'),
    [animalLots]
  );

  const selectedLot = useMemo(
    () => unitaryAnimalLots.find((lot) => lot.id === pdvForm.lotId) ?? null,
    [unitaryAnimalLots, pdvForm.lotId]
  );

  const selectedWeightLot = useMemo(
    () => groupedAnimalLots.find((lot) => lot.id === pdvForm.lotId) ?? null,
    [groupedAnimalLots, pdvForm.lotId]
  );
  const splitSourceUnitLot = useMemo(
    () => unitaryAnimalLots.find((lot) => lot.id === splitUnitLotForm.sourceLotId) ?? null,
    [splitUnitLotForm.sourceLotId, unitaryAnimalLots]
  );
  const splitSourceWeightLot = useMemo(
    () => groupedAnimalLots.find((lot) => lot.id === splitWeightLotForm.sourceLotId) ?? null,
    [groupedAnimalLots, splitWeightLotForm.sourceLotId]
  );

  const selectedAsset = useMemo(
    () => assetStock.find((item) => item.id === pdvForm.assetItemId) ?? null,
    [assetStock, pdvForm.assetItemId]
  );

  const actorLabel = currentUser?.name ? `${currentUser.name} (${currentUser.role})` : 'Produtor';
  const toErrorMessage = (reason: unknown): string => (reason instanceof Error ? reason.message : 'erro desconhecido');
  const pastureNameById = (pastureId?: string): string => {
    if (!pastureId) return 'Nao informado';
    return pastures.find((pasture) => pasture.id === pastureId)?.name ?? pastureId;
  };

  const reloadAll = async () => {
    const [loadedOffers, loadedPdvSales, loadedAnimals, loadedLots, loadedWorkspace, loadedInventory] = await Promise.allSettled([
      salesService.listOffers(),
      salesService.listPdvSales(),
      producerOpsService.listAnimals(),
      producerOpsService.listAnimalLots(),
      propertyService.loadWorkspace(),
      stockService.listInventory(),
    ]);

    const warnings: string[] = [];
    let hasAnySuccess = false;

    if (loadedOffers.status === 'fulfilled') {
      setOffers(loadedOffers.value);
      hasAnySuccess = true;
    } else {
      setOffers([]);
      warnings.push(`Ofertas: ${toErrorMessage(loadedOffers.reason)}`);
    }

    if (loadedPdvSales.status === 'fulfilled') {
      setPdvSales(loadedPdvSales.value);
      hasAnySuccess = true;
    } else {
      setPdvSales([]);
      warnings.push(`Vendas PDV: ${toErrorMessage(loadedPdvSales.reason)}`);
    }

    if (loadedAnimals.status === 'fulfilled') {
      setAnimals(loadedAnimals.value);
      hasAnySuccess = true;
    } else {
      setAnimals([]);
      warnings.push(`Animais: ${toErrorMessage(loadedAnimals.reason)}`);
    }

    if (loadedLots.status === 'fulfilled') {
      setAnimalLots(loadedLots.value);
      hasAnySuccess = true;
    } else {
      setAnimalLots([]);
      warnings.push(`Lotes: ${toErrorMessage(loadedLots.reason)}`);
    }

    if (loadedWorkspace.status === 'fulfilled') {
      setPastures(loadedWorkspace.value.pastures);
      hasAnySuccess = true;
    } else {
      setPastures([]);
      warnings.push(`Propriedade: ${toErrorMessage(loadedWorkspace.reason)}`);
    }

    if (loadedInventory.status === 'fulfilled') {
      setAssetStock(loadedInventory.value.filter((item) => item.category === 'Bem Patrimonial'));
      hasAnySuccess = true;
    } else {
      setAssetStock([]);
      warnings.push(`Estoque: ${toErrorMessage(loadedInventory.reason)}`);
    }

    setPartialWarnings(warnings);
    if (!hasAnySuccess) {
      throw new Error('Nenhuma fonte de comercial e vendas respondeu com sucesso.');
    }
  };

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      setLoadError(null);
      setPartialWarnings([]);
      try {
        await reloadAll();
      } catch {
        setLoadError('Nao foi possivel carregar comercial e vendas.');
      } finally {
        setIsLoading(false);
      }
    };
    void load();
  }, []);

  const handleOfferInputChange = (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = event.target;
    setNewOffer((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddOffer = async (event: React.FormEvent) => {
    event.preventDefault();
    setActionError(null);
    setActionMessage(null);
    if (!newOffer.product || !newOffer.quantity || !newOffer.price) {
      setActionError('Preencha produto, quantidade e preco para publicar a oferta.');
      return;
    }
    if (parseNumberInput(newOffer.price) <= 0) {
      setActionError('Informe um preco valido para publicar a oferta.');
      return;
    }
    if (newOffer.listingMode === 'AUCTION' && !newOffer.minimumBid) {
      setActionError('Para leilao, informe o lance minimo.');
      return;
    }
    if (newOffer.listingMode === 'AUCTION' && parseNumberInput(newOffer.minimumBid) <= 0) {
      setActionError('Para leilao, o lance minimo deve ser maior que zero.');
      return;
    }

    setIsSubmittingOffer(true);
    try {
      const created = await salesService.createOffer({
        product: newOffer.product,
        quantity: newOffer.quantity,
        price: parseNumberInput(newOffer.price),
        channel: newOffer.channel,
        offerType: newOffer.offerType,
        listingMode: newOffer.listingMode,
        description: newOffer.description,
        location: newOffer.location,
        auctionEndAt: newOffer.listingMode === 'AUCTION' ? newOffer.auctionEndAt : undefined,
        minimumBid: newOffer.listingMode === 'AUCTION' ? parseNumberInput(newOffer.minimumBid) : undefined,
      });
      setOffers((prev) => [created, ...prev]);
      setActionMessage(
        created.listingMode === 'AUCTION'
          ? 'Oferta publica de leilao publicada com inicio as 19:00 e encerramento no 7o dia.'
          : 'Oferta publicada com sucesso.'
      );
      setNewOffer((prev) => ({
        ...prev,
        product: '',
        quantity: '',
        price: '',
        description: '',
        location: '',
        auctionEndAt: '',
        minimumBid: '',
      }));
    } catch {
      setActionError('Nao foi possivel publicar a oferta.');
    } finally {
      setIsSubmittingOffer(false);
    }
  };

  const handleDeleteOffer = async (offer: SalesOffer) => {
    const confirmed = window.confirm(`Excluir a oferta "${offer.product}"?`);
    if (!confirmed) return;
    setActionError(null);
    setActionMessage(null);
    setDeletingId(offer.id);
    try {
      await salesService.deleteOffer(offer.id);
      setOffers((prev) => prev.filter((entry) => entry.id !== offer.id));
      setActionMessage('Oferta excluida com sucesso.');
    } catch {
      setActionError('Nao foi possivel excluir a oferta.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleRegisterAnimal = async (event: React.FormEvent) => {
    event.preventDefault();
    setActionError(null);
    setActionMessage(null);
    if (!animalForm.category.trim()) {
      setActionError('Informe a categoria para cadastrar o animal.');
      return;
    }
    if (GROUPED_SPECIES.has(animalForm.species)) {
      setActionError('Aves, peixes e outros devem ser cadastrados por lote/peso/fase/idade na secao de lote agrupado.');
      return;
    }
    if (!animalForm.earringCode.trim()) {
      setActionError('Informe brinco/chip unitario para cadastrar o animal.');
      return;
    }

    setIsSubmittingAnimal(true);
    try {
      const created = await producerOpsService.createAnimal({
        earringCode: animalForm.earringCode,
        species: animalForm.species,
        category: animalForm.category,
        trackingMode: UNITARY_SPECIES.has(animalForm.species) ? 'UNIT' : animalForm.trackingMode,
        currentWeightKg: animalForm.currentWeightKg ? parseNumberInput(animalForm.currentWeightKg) : undefined,
        pastureId: animalForm.pastureId || undefined,
      });
      setAnimals((prev) => [...prev, created].sort((a, b) => a.earringCode.localeCompare(b.earringCode)));
      setAnimalForm({
        earringCode: '',
        species: 'BOVINO',
        category: '',
        trackingMode: 'UNIT',
        currentWeightKg: '',
        pastureId: animalForm.pastureId,
      });
      setActionMessage(`Animal ${created.earringCode} cadastrado separadamente do estoque.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Nao foi possivel cadastrar o animal.';
      setActionError(message);
    } finally {
      setIsSubmittingAnimal(false);
    }
  };

  const handleReadEarring = () => {
    setActionError(null);
    const normalized = earringScanInput.trim().toUpperCase();
    if (!normalized) return;
    const animal = animalsByEarring.get(normalized);
    if (!animal) {
      setActionError('Brinco nao encontrado no cadastro de animais.');
      return;
    }
    if (!UNITARY_SPECIES.has(animal.species) || animal.trackingMode !== 'UNIT') {
      setActionError('A leitura por brinco aceita somente gado/ovino/suino com rastreio unitario.');
      return;
    }
    if (!selectedAnimalIds.includes(animal.id)) {
      setSelectedAnimalIds((prev) => [...prev, animal.id]);
    }
    setEarringScanInput('');
  };

  const removeSelectedAnimal = (animalId: string) => {
    setSelectedAnimalIds((prev) => prev.filter((entry) => entry !== animalId));
  };

  const handleCreateLotFromReadings = async () => {
    setActionError(null);
    setActionMessage(null);
    if (!lotForm.name.trim()) {
      setActionError('Informe o nome do lote para consolidar os animais lidos.');
      return;
    }
    if (selectedAnimalIds.length === 0) {
      setActionError('Leia ao menos um brinco para montar o lote.');
      return;
    }

    setIsSubmittingLot(true);
    try {
      const created = await producerOpsService.createAnimalLotFromAnimalIds({
        name: lotForm.name,
        category: lotForm.category || 'Lote Animal',
        animalIds: selectedAnimalIds,
        pastureId: lotForm.pastureId || undefined,
        distributionArea: lotForm.distributionArea || undefined,
      });
      setAnimalLots((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
      setAnimals(await producerOpsService.listAnimals());
      setSelectedAnimalIds([]);
      setLotForm({
        name: '',
        category: '',
        pastureId: lotForm.pastureId,
        distributionArea: '',
      });
      setActionMessage(`Lote ${created.name} formado a partir da leitura de brincos.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Nao foi possivel montar o lote.';
      setActionError(message);
    } finally {
      setIsSubmittingLot(false);
    }
  };

  const handleCreateGroupedLot = async () => {
    setActionError(null);
    setActionMessage(null);
    if (!groupLotForm.name.trim() || !groupLotForm.category.trim() || !groupLotForm.phase.trim()) {
      setActionError('Informe nome, categoria e fase para cadastrar lote de aves/peixes/outros.');
      return;
    }

    const headcount = parseNumberInput(groupLotForm.headcount);
    const totalWeightKg = parseNumberInput(groupLotForm.totalWeightKg);
    if (headcount <= 0 || totalWeightKg <= 0) {
      setActionError('Informe quantidade e peso total validos para o lote agrupado.');
      return;
    }

    setIsSubmittingLot(true);
    try {
      const created = await producerOpsService.createTrackedWeightLot({
        name: groupLotForm.name,
        category: groupLotForm.category,
        species: groupLotForm.species,
        phase: groupLotForm.phase,
        ageInDays: groupLotForm.ageInDays ? parseNumberInput(groupLotForm.ageInDays) : undefined,
        headcount,
        totalWeightKg,
        pastureId: groupLotForm.pastureId || undefined,
        distributionArea: groupLotForm.distributionArea || undefined,
      });
      setAnimalLots((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
      setGroupLotForm((prev) => ({
        ...prev,
        name: '',
        category: '',
        phase: '',
        ageInDays: '',
        headcount: '',
        totalWeightKg: '',
        distributionArea: '',
      }));
      setActionMessage(`Lote agrupado ${created.name} cadastrado com rastreio por peso/fase/idade.`);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Nao foi possivel cadastrar o lote agrupado.');
    } finally {
      setIsSubmittingLot(false);
    }
  };

  const refreshAnimalRegistry = async () => {
    const [loadedLots, loadedAnimals] = await Promise.all([
      producerOpsService.listAnimalLots(),
      producerOpsService.listAnimals(),
    ]);
    setAnimalLots(loadedLots);
    setAnimals(loadedAnimals);
  };

  const handleSplitUnitLot = async () => {
    setActionError(null);
    setActionMessage(null);
    const separatedHeadcount = parseNumberInput(splitUnitLotForm.separatedHeadcount);
    if (!splitUnitLotForm.sourceLotId) {
      setActionError('Selecione o lote unitario de origem para apartacao.');
      return;
    }
    if (!splitUnitLotForm.newLotName.trim()) {
      setActionError('Informe o nome do novo lote da apartacao.');
      return;
    }
    if (separatedHeadcount <= 0) {
      setActionError('Informe a quantidade de cabecas para apartacao.');
      return;
    }

    setIsSplittingLot(true);
    try {
      const result = await producerOpsService.splitUnitAnimalLot({
        sourceLotId: splitUnitLotForm.sourceLotId,
        newLotName: splitUnitLotForm.newLotName,
        newLotCategory: splitUnitLotForm.newLotCategory || undefined,
        separatedHeadcount,
        pastureId: splitUnitLotForm.pastureId || undefined,
        distributionArea: splitUnitLotForm.distributionArea || undefined,
      });
      await refreshAnimalRegistry();
      setSplitUnitLotForm((prev) => ({
        ...prev,
        newLotName: '',
        newLotCategory: '',
        separatedHeadcount: '',
        distributionArea: '',
      }));
      setActionMessage(
        `Apartacao concluida: ${result.createdLot.name} criado com ${result.createdLot.headcount} cabecas; ${result.sourceLot.name} ficou com ${result.sourceLot.headcount}.`
      );
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Nao foi possivel apartar o lote unitario.');
    } finally {
      setIsSplittingLot(false);
    }
  };

  const handleSplitWeightLot = async () => {
    setActionError(null);
    setActionMessage(null);
    const separatedHeadcount = parseNumberInput(splitWeightLotForm.separatedHeadcount);
    const separatedWeightKg = parseNumberInput(splitWeightLotForm.separatedWeightKg);
    if (!splitWeightLotForm.sourceLotId) {
      setActionError('Selecione o lote de peso/fase de origem para separacao.');
      return;
    }
    if (!splitWeightLotForm.newLotName.trim()) {
      setActionError('Informe o nome do novo lote separado.');
      return;
    }
    if (separatedHeadcount <= 0 || separatedWeightKg <= 0) {
      setActionError('Informe quantidade e peso validos para separar o lote.');
      return;
    }

    setIsSplittingLot(true);
    try {
      const result = await producerOpsService.splitTrackedWeightLot({
        sourceLotId: splitWeightLotForm.sourceLotId,
        newLotName: splitWeightLotForm.newLotName,
        newLotCategory: splitWeightLotForm.newLotCategory || undefined,
        separatedHeadcount,
        separatedWeightKg,
        phase: splitWeightLotForm.phase || undefined,
        ageInDays: splitWeightLotForm.ageInDays ? parseNumberInput(splitWeightLotForm.ageInDays) : undefined,
        pastureId: splitWeightLotForm.pastureId || undefined,
        distributionArea: splitWeightLotForm.distributionArea || undefined,
      });
      await refreshAnimalRegistry();
      setSplitWeightLotForm((prev) => ({
        ...prev,
        newLotName: '',
        newLotCategory: '',
        separatedHeadcount: '',
        separatedWeightKg: '',
        phase: '',
        ageInDays: '',
        distributionArea: '',
      }));
      setActionMessage(
        `Separacao por peso concluida: ${result.createdLot.name} criado com ${result.createdLot.totalWeightKg ?? 0} kg; ${result.sourceLot.name} ficou com ${result.sourceLot.totalWeightKg ?? 0} kg.`
      );
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Nao foi possivel separar o lote por peso.');
    } finally {
      setIsSplittingLot(false);
    }
  };

  const resetPdvForm = () => {
    setPdvForm({
      sourceType: 'ANIMAL_UNIT_LOT',
      settlementMode: 'DIRECT_SALE',
      buyerName: '',
      buyerDocumentType: 'CPF',
      buyerDocumentNumber: '',
      buyerStateRegistration: '',
      buyerEmail: '',
      buyerPhone: '',
      buyerAddressStreet: '',
      buyerAddressNumber: '',
      buyerAddressDistrict: '',
      buyerAddressCity: '',
      buyerAddressState: '',
      buyerAddressZipCode: '',
      description: '',
      unitPrice: '',
      lotId: '',
      headcount: '',
      animalWeightKg: '',
      fieldPlot: '',
      cropWeightKg: '',
      boxes: '',
      boxSize: '',
      qualityGrade: '',
      assetItemId: '',
      saleAuthorizationCode: '',
      vehiclePlate: '',
      scaleQrCode: '',
      deferFiscalEmission: false,
      qrCode: '',
    });
    setPhotoEvidence(null);
    setVideoEvidence(null);
    setAuthorizationEvidence(null);
  };

  const handleCreatePdvSale = async (event: React.FormEvent) => {
    event.preventDefault();
    setActionError(null);
    setActionMessage(null);

    const unitPrice = parseNumberInput(pdvForm.unitPrice);
    const hasEvidence = Boolean(
      pdvForm.qrCode.trim() ||
      pdvForm.scaleQrCode.trim() ||
      photoEvidence ||
      videoEvidence ||
      authorizationEvidence
    );
    if (!hasEvidence) {
      setActionError('Registre ao menos uma evidencia digital (QR, foto, video ou autorizacao).');
      return;
    }

    const payload: Parameters<typeof salesService.createPdvSale>[0] = {
      sourceType: pdvForm.sourceType,
      settlementMode: pdvForm.settlementMode,
      buyerProfile: {
        name: pdvForm.buyerName,
        documentType: pdvForm.buyerDocumentType,
        documentNumber: pdvForm.buyerDocumentNumber,
        stateRegistration: pdvForm.buyerStateRegistration || undefined,
        email: pdvForm.buyerEmail,
        phone: pdvForm.buyerPhone,
        addressStreet: pdvForm.buyerAddressStreet,
        addressNumber: pdvForm.buyerAddressNumber,
        addressDistrict: pdvForm.buyerAddressDistrict,
        addressCity: pdvForm.buyerAddressCity,
        addressState: pdvForm.buyerAddressState,
        addressZipCode: pdvForm.buyerAddressZipCode,
      },
      description: pdvForm.description,
      unitPrice,
      actor: actorLabel,
      deferFiscalEmission: pdvForm.deferFiscalEmission,
    };

    if (pdvForm.sourceType === 'ANIMAL_UNIT_LOT') {
      payload.lotId = pdvForm.lotId || undefined;
      payload.animalIds = selectedLot?.animalIds;
      payload.headcount = selectedLot?.headcount ?? (pdvForm.headcount ? parseNumberInput(pdvForm.headcount) : undefined);
    }
    if (pdvForm.sourceType === 'ANIMAL_WEIGHT') {
      payload.lotId = pdvForm.lotId || undefined;
      payload.totalWeightKg = selectedWeightLot?.totalWeightKg ?? parseNumberInput(pdvForm.animalWeightKg);
      payload.headcount = selectedWeightLot?.headcount ?? (pdvForm.headcount ? parseNumberInput(pdvForm.headcount) : undefined);
    }
    if (pdvForm.sourceType === 'CROP') {
      payload.fieldPlot = pdvForm.fieldPlot || undefined;
      payload.totalWeightKg = parseNumberInput(pdvForm.cropWeightKg);
      payload.boxes = parseNumberInput(pdvForm.boxes);
      payload.boxSize = pdvForm.boxSize || undefined;
      payload.qualityGrade = pdvForm.qualityGrade || undefined;
      payload.saleAuthorizationCode = pdvForm.saleAuthorizationCode || undefined;
      payload.vehiclePlate = pdvForm.vehiclePlate || undefined;
      payload.scaleQrCode = pdvForm.scaleQrCode || undefined;
    }
    if (pdvForm.sourceType === 'ASSET') {
      payload.assetItemId = pdvForm.assetItemId || undefined;
      payload.assetName = selectedAsset?.name || undefined;
    }

    setIsSubmittingPdv(true);
    try {
      let created = await salesService.createPdvSale(payload);
      const tenantId = currentUser?.tenantId;

      if (pdvForm.qrCode.trim()) {
        created = await salesService.attachSaleEvidence(created.id, {
          type: pdvForm.sourceType === 'CROP' ? 'SCALE_QR' : 'QR_CODE',
          reference: pdvForm.qrCode.trim(),
          notes: 'Leitura de QR para auditoria da operacao.',
          actor: actorLabel,
        });
      }

      if (pdvForm.sourceType === 'CROP' && pdvForm.vehiclePlate.trim()) {
        created = await salesService.attachSaleEvidence(created.id, {
          type: 'VEHICLE',
          reference: pdvForm.vehiclePlate.trim(),
          notes: 'Veiculo vinculado ao romaneio de saida.',
          actor: actorLabel,
        });
      }

      if (tenantId && photoEvidence) {
        const uploaded = await storageService.uploadEvidenceFile(photoEvidence, tenantId, created.id, `sale-photo-${Date.now()}`);
        created = await salesService.attachSaleEvidence(created.id, {
          type: 'PHOTO',
          url: uploaded.url,
          hash: uploaded.hash,
          notes: 'Evidencia fotografica da expedicao.',
          actor: actorLabel,
        });
      }

      if (tenantId && videoEvidence) {
        const uploaded = await storageService.uploadEvidenceFile(videoEvidence, tenantId, created.id, `sale-video-${Date.now()}`);
        created = await salesService.attachSaleEvidence(created.id, {
          type: 'VIDEO',
          url: uploaded.url,
          hash: uploaded.hash,
          notes: 'Evidencia em video da operacao.',
          actor: actorLabel,
        });
      }

      if (tenantId && authorizationEvidence) {
        const uploaded = await storageService.uploadEvidenceFile(
          authorizationEvidence,
          tenantId,
          created.id,
          `sale-authorization-${Date.now()}`
        );
        created = await salesService.attachSaleEvidence(created.id, {
          type: 'SALE_AUTHORIZATION',
          url: uploaded.url,
          hash: uploaded.hash,
          notes: 'Autorizacao de venda anexada.',
          actor: actorLabel,
        });
      }

      setPdvSales(await salesService.listPdvSales());
      resetPdvForm();
      setActionMessage(
        created.fiscalStatus === 'NF_EMITIDA'
          ? `Venda registrada com escrow ${created.escrowStatus.toLowerCase()} e NF ${created.fiscalDocumentNumber ?? ''} emitida automaticamente.`
          : `Venda/remessa registrada com escrow ativo. NF pendente conforme regra fiscal.`
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Nao foi possivel registrar a operacao PDV.';
      setActionError(message);
    } finally {
      setIsSubmittingPdv(false);
    }
  };

  const handleFinalizeAuction = async (saleId: string) => {
    setActionError(null);
    setActionMessage(null);
    setFinalizingId(saleId);
    try {
      const updated = await salesService.finalizeAuctionAndIssueInvoice(saleId, actorLabel);
      setPdvSales((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      setActionMessage(`Leilao finalizado, NF ${updated.fiscalDocumentNumber ?? ''} emitida e escrow liberado.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Nao foi possivel finalizar o leilao.';
      setActionError(message);
    } finally {
      setFinalizingId(null);
    }
  };

  const handleIssuePendingInvoice = async (saleId: string) => {
    setActionError(null);
    setActionMessage(null);
    setFinalizingId(saleId);
    try {
      const updated = await salesService.issuePendingFiscalDocument(saleId, actorLabel);
      setPdvSales((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      setActionMessage(`NF ${updated.fiscalDocumentNumber ?? ''} emitida para a operacao pendente e escrow liberado.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Nao foi possivel emitir a NF pendente.';
      setActionError(message);
    } finally {
      setFinalizingId(null);
    }
  };

  const handleVoiceCommand = (spokenCommand: string) => {
    const normalized = normalizeVoiceText(spokenCommand);
    if (!normalized) {
      return;
    }

    const extractAfter = (token: string): string => {
      const index = normalized.indexOf(token);
      if (index < 0) return '';
      return spokenCommand.slice(index + token.length).trim();
    };

    if (normalized.includes('aba pdv') || normalized.includes('abrir pdv')) {
      setActiveTab('PDV');
      setActionMessage('Comando de voz aplicado: aba PDV.');
      return;
    }
    if (normalized.includes('aba animais') || normalized.includes('abrir animais')) {
      navigate('/property-registration');
      setActionMessage('Comando de voz aplicado: cadastro de animais redirecionado para Propriedade.');
      return;
    }
    if (normalized.includes('aba ofertas') || normalized.includes('abrir ofertas')) {
      setActiveTab('OFFERS');
      setActionMessage('Comando de voz aplicado: aba Ofertas.');
      return;
    }

    if (normalized.startsWith('comprador ')) {
      const value = extractAfter('comprador ');
      setPdvForm((prev) => ({ ...prev, buyerName: value }));
      setActionMessage('Comando de voz aplicado: comprador preenchido.');
      return;
    }
    if (normalized.startsWith('documento ')) {
      const value = extractAfter('documento ');
      setPdvForm((prev) => ({ ...prev, buyerDocumentNumber: value }));
      setActionMessage('Comando de voz aplicado: documento preenchido.');
      return;
    }
    if (normalized.startsWith('codigo qr ') || normalized.startsWith('qr ')) {
      const value = normalized.startsWith('codigo qr ') ? extractAfter('codigo qr ') : extractAfter('qr ');
      setPdvForm((prev) => ({ ...prev, qrCode: value }));
      setActionMessage('Comando de voz aplicado: QR preenchido.');
      return;
    }
    if (normalized.startsWith('placa ')) {
      const value = extractAfter('placa ');
      setPdvForm((prev) => ({ ...prev, vehiclePlate: value.toUpperCase() }));
      setActionMessage('Comando de voz aplicado: placa preenchida.');
      return;
    }
    if (normalized.startsWith('autorizacao ')) {
      const value = extractAfter('autorizacao ');
      setPdvForm((prev) => ({ ...prev, saleAuthorizationCode: value }));
      setActionMessage('Comando de voz aplicado: autorizacao preenchida.');
      return;
    }
    if (normalized.startsWith('preco ')) {
      const value = extractAfter('preco ');
      setPdvForm((prev) => ({ ...prev, unitPrice: value }));
      setActionMessage('Comando de voz aplicado: preco preenchido.');
      return;
    }
    if (normalized.startsWith('lote ')) {
      const value = normalizeVoiceText(extractAfter('lote '));
      const found =
        unitaryAnimalLots.find((lot) => normalizeVoiceText(lot.name).includes(value)) ??
        groupedAnimalLots.find((lot) => normalizeVoiceText(lot.name).includes(value));
      if (found) {
        setPdvForm((prev) => ({ ...prev, lotId: found.id }));
        setActionMessage(`Comando de voz aplicado: lote ${found.name} selecionado.`);
        return;
      }
    }

    setActionError(
      'Comando de voz nao reconhecido. Use exemplos como: "aba pdv", "comprador Joao", "codigo qr ABC123".'
    );
  };

  if (isLoading) {
    return <LoadingSpinner text="Carregando comercial e vendas..." />;
  }

  if (loadError) {
    return <div className="p-6 bg-red-50 text-red-700 border border-red-200 rounded-lg">{loadError}</div>;
  }

  return (
    <div>
      <h2 className="text-3xl font-bold text-slate-800 mb-2">Portal Comercial e Vendas</h2>
      <p className="text-slate-600 mb-6">
        PDV fiscal com rastreio por brinco/lote, talhao/peso/caixas, bens patrimoniais e auditoria digital.
      </p>
      <VoiceCommandPanel
        className="mb-4"
        onCommand={handleVoiceCommand}
        hints={[
          'aba pdv',
          'abrir animais',
          'comprador Joao Silva',
          'codigo qr ABC123',
          'preco 150,00',
        ]}
      />
      {actionMessage && (
        <div className="mb-4 p-3 rounded-md border border-emerald-200 bg-emerald-50 text-emerald-700 text-sm">
          {actionMessage}
        </div>
      )}
      {actionError && (
        <div className="mb-4 p-3 rounded-md border border-red-200 bg-red-50 text-red-700 text-sm">
          {actionError}
        </div>
      )}
      {partialWarnings.length > 0 && (
        <div className="mb-4 p-3 rounded-md border border-amber-200 bg-amber-50 text-amber-800 text-sm">
          Carregamento parcial detectado: {partialWarnings.slice(0, 3).join(' | ')}
        </div>
      )}
      <div className="flex flex-wrap gap-2 bg-slate-200 p-1 rounded-lg mb-6 w-fit">
        <button
          onClick={() => setActiveTab('PDV')}
          className={`px-4 py-2 rounded-md text-sm font-semibold transition-colors ${
            activeTab === 'PDV' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-600 hover:bg-slate-300'
          }`}
        >
          PDV Fiscal
        </button>
        <button
          onClick={() => navigate('/property-registration')}
          className="px-4 py-2 rounded-md text-sm font-semibold transition-colors text-slate-600 hover:bg-slate-300"
        >
          Cadastro Animal (Tela Propriedade)
        </button>
        <button
          onClick={() => setActiveTab('OFFERS')}
          className={`px-4 py-2 rounded-md text-sm font-semibold transition-colors ${
            activeTab === 'OFFERS' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-600 hover:bg-slate-300'
          }`}
        >
          Ofertas Marketplace
        </button>
      </div>
      <div className="mb-6 rounded-md border border-teal-200 bg-teal-50 p-3 text-sm text-teal-800">
        Cadastro/gestao de animais e lotes ocorre somente na tela <strong>Cadastro e gestao da propriedade</strong> para manter separacao de finalidade.
      </div>

      {/* CONTENT INJECTIONS */}
      {activeTab === 'PDV' && (
        <div className="space-y-6 animate-fade-in">
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <form onSubmit={handleCreatePdvSale} className="xl:col-span-2 bg-white rounded-lg shadow-md border border-slate-200 p-6 space-y-5">
              <h3 className="text-xl font-bold text-slate-800">Emissao fiscal estilo PDV</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <label className="text-sm text-slate-600 space-y-1">
                  <span>Origem da venda</span>
                  <select
                    value={pdvForm.sourceType}
                    onChange={(event) =>
                      setPdvForm((prev) => ({
                        ...prev,
                        sourceType: event.target.value as ProducerSaleSourceType,
                        lotId: '',
                        assetItemId: '',
                        boxSize: '',
                        qualityGrade: '',
                      }))
                    }
                    className="w-full p-2 border border-slate-300 rounded-md bg-white"
                  >
                    <option value="ANIMAL_UNIT_LOT">Animal por brinco/lote</option>
                    <option value="ANIMAL_WEIGHT">Animal por peso</option>
                    <option value="CROP">Plantacao (talhao/peso/caixas)</option>
                    <option value="ASSET">Bem patrimonial</option>
                  </select>
                </label>

                <label className="text-sm text-slate-600 space-y-1">
                  <span>Liquidacao</span>
                  <select
                    value={pdvForm.settlementMode}
                    onChange={(event) =>
                      setPdvForm((prev) => ({
                        ...prev,
                        settlementMode: event.target.value as ProducerSaleSettlementMode,
                      }))
                    }
                    className="w-full p-2 border border-slate-300 rounded-md bg-white"
                  >
                    <option value="DIRECT_SALE">Venda direta (NF automatica)</option>
                    <option value="AUCTION_REMESSA">Remessa para leilao (NF apos finalizacao)</option>
                  </select>
                </label>

                <label className="text-sm text-slate-600 space-y-1">
                  <span>Nome / Razao social do comprador</span>
                  <input
                    value={pdvForm.buyerName}
                    onChange={(event) => setPdvForm((prev) => ({ ...prev, buyerName: event.target.value }))}
                    className="w-full p-2 border border-slate-300 rounded-md"
                    placeholder="Nome completo ou razao social"
                  />
                </label>

                <label className="text-sm text-slate-600 space-y-1">
                  <span>Preco unitario (R$)</span>
                  <input
                    value={pdvForm.unitPrice}
                    onChange={(event) => setPdvForm((prev) => ({ ...prev, unitPrice: event.target.value }))}
                    className="w-full p-2 border border-slate-300 rounded-md"
                    placeholder="0,00"
                  />
                </label>
              </div>

              <label className="text-sm text-slate-600 space-y-1 block">
                <span>Descricao comercial</span>
                <input
                  value={pdvForm.description}
                  onChange={(event) => setPdvForm((prev) => ({ ...prev, description: event.target.value }))}
                  className="w-full p-2 border border-slate-300 rounded-md"
                  placeholder="Resumo da operacao para NF e auditoria"
                />
              </label>

              <div className="space-y-3 p-4 rounded-lg border border-slate-200 bg-slate-50">
                <h4 className="font-semibold text-slate-800">Cadastro completo do comprador (obrigatorio para NF)</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <label className="text-sm text-slate-700 space-y-1">
                    <span>Documento</span>
                    <select
                      value={pdvForm.buyerDocumentType}
                      onChange={(event) =>
                        setPdvForm((prev) => ({
                          ...prev,
                          buyerDocumentType: event.target.value as ProducerBuyerDocumentType,
                          buyerDocumentNumber: '',
                        }))
                      }
                      className="w-full p-2 border border-slate-300 rounded-md bg-white"
                    >
                      <option value="CPF">CPF</option>
                      <option value="CNPJ">CNPJ</option>
                    </select>
                  </label>
                  <label className="text-sm text-slate-700 space-y-1">
                    <span>{pdvForm.buyerDocumentType}</span>
                    <input
                      value={pdvForm.buyerDocumentNumber}
                      onChange={(event) => setPdvForm((prev) => ({ ...prev, buyerDocumentNumber: event.target.value }))}
                      className="w-full p-2 border border-slate-300 rounded-md bg-white"
                      placeholder={pdvForm.buyerDocumentType === 'CPF' ? '000.000.000-00' : '00.000.000/0000-00'}
                    />
                  </label>
                  <label className="text-sm text-slate-700 space-y-1">
                    <span>Inscricao estadual (opcional)</span>
                    <input
                      value={pdvForm.buyerStateRegistration}
                      onChange={(event) => setPdvForm((prev) => ({ ...prev, buyerStateRegistration: event.target.value }))}
                      className="w-full p-2 border border-slate-300 rounded-md bg-white"
                      placeholder="IE ou ISENTO"
                    />
                  </label>
                  <label className="text-sm text-slate-700 space-y-1">
                    <span>E-mail</span>
                    <input
                      type="email"
                      value={pdvForm.buyerEmail}
                      onChange={(event) => setPdvForm((prev) => ({ ...prev, buyerEmail: event.target.value }))}
                      className="w-full p-2 border border-slate-300 rounded-md bg-white"
                      placeholder="comprador@dominio.com"
                    />
                  </label>
                  <label className="text-sm text-slate-700 space-y-1">
                    <span>Telefone</span>
                    <input
                      value={pdvForm.buyerPhone}
                      onChange={(event) => setPdvForm((prev) => ({ ...prev, buyerPhone: event.target.value }))}
                      className="w-full p-2 border border-slate-300 rounded-md bg-white"
                      placeholder="(00) 00000-0000"
                    />
                  </label>
                  <label className="text-sm text-slate-700 space-y-1">
                    <span>CEP</span>
                    <input
                      value={pdvForm.buyerAddressZipCode}
                      onChange={(event) => setPdvForm((prev) => ({ ...prev, buyerAddressZipCode: event.target.value }))}
                      className="w-full p-2 border border-slate-300 rounded-md bg-white"
                      placeholder="00000-000"
                    />
                  </label>
                  <label className="text-sm text-slate-700 space-y-1">
                    <span>UF</span>
                    <input
                      value={pdvForm.buyerAddressState}
                      onChange={(event) => setPdvForm((prev) => ({ ...prev, buyerAddressState: event.target.value.toUpperCase() }))}
                      maxLength={2}
                      className="w-full p-2 border border-slate-300 rounded-md bg-white uppercase"
                      placeholder="SP"
                    />
                  </label>
                  <label className="text-sm text-slate-700 space-y-1">
                    <span>Cidade</span>
                    <input
                      value={pdvForm.buyerAddressCity}
                      onChange={(event) => setPdvForm((prev) => ({ ...prev, buyerAddressCity: event.target.value }))}
                      className="w-full p-2 border border-slate-300 rounded-md bg-white"
                      placeholder="Cidade"
                    />
                  </label>
                  <label className="text-sm text-slate-700 space-y-1">
                    <span>Bairro</span>
                    <input
                      value={pdvForm.buyerAddressDistrict}
                      onChange={(event) => setPdvForm((prev) => ({ ...prev, buyerAddressDistrict: event.target.value }))}
                      className="w-full p-2 border border-slate-300 rounded-md bg-white"
                      placeholder="Bairro"
                    />
                  </label>
                  <label className="text-sm text-slate-700 space-y-1 md:col-span-2">
                    <span>Logradouro</span>
                    <input
                      value={pdvForm.buyerAddressStreet}
                      onChange={(event) => setPdvForm((prev) => ({ ...prev, buyerAddressStreet: event.target.value }))}
                      className="w-full p-2 border border-slate-300 rounded-md bg-white"
                      placeholder="Rua, avenida, estrada"
                    />
                  </label>
                  <label className="text-sm text-slate-700 space-y-1">
                    <span>Numero</span>
                    <input
                      value={pdvForm.buyerAddressNumber}
                      onChange={(event) => setPdvForm((prev) => ({ ...prev, buyerAddressNumber: event.target.value }))}
                      className="w-full p-2 border border-slate-300 rounded-md bg-white"
                      placeholder="Numero"
                    />
                  </label>
                </div>
              </div>

              {pdvForm.sourceType === 'ANIMAL_UNIT_LOT' && (
                <div className="space-y-3 p-4 rounded-lg border border-emerald-200 bg-emerald-50">
                  <h4 className="font-semibold text-emerald-800">Venda de animal por brinco/lote</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <label className="text-sm text-slate-700 space-y-1">
                      <span>Lote animal</span>
                      <select
                        value={pdvForm.lotId}
                        onChange={(event) => setPdvForm((prev) => ({ ...prev, lotId: event.target.value }))}
                        className="w-full p-2 border border-slate-300 rounded-md bg-white"
                      >
                        <option value="">Selecionar lote</option>
                        {unitaryAnimalLots.map((lot) => (
                          <option key={lot.id} value={lot.id}>
                            {lot.name} | cabecas: {lot.headcount}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="text-sm text-slate-700 space-y-1">
                      <span>Cabecas (ajuste manual opcional)</span>
                      <input
                        value={pdvForm.headcount}
                        onChange={(event) => setPdvForm((prev) => ({ ...prev, headcount: event.target.value }))}
                        className="w-full p-2 border border-slate-300 rounded-md bg-white"
                        placeholder="Ex: 20"
                      />
                    </label>
                  </div>
                  {selectedLot && (
                    <p className="text-xs text-slate-700">
                      Lote selecionado: {selectedLot.name} | cabecas: {selectedLot.headcount} | peso total:{' '}
                      {selectedLot.totalWeightKg ?? 0} kg | area: {selectedLot.distributionArea ?? pastureNameById(selectedLot.pastureId)}
                    </p>
                  )}
                </div>
              )}

              {pdvForm.sourceType === 'ANIMAL_WEIGHT' && (
                <div className="space-y-3 p-4 rounded-lg border border-amber-200 bg-amber-50">
                  <h4 className="font-semibold text-amber-800">Venda de animal por peso</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <label className="text-sm text-slate-700 space-y-1">
                      <span>Lote agrupado (aves/peixes/outros)</span>
                      <select
                        value={pdvForm.lotId}
                        onChange={(event) => setPdvForm((prev) => ({ ...prev, lotId: event.target.value }))}
                        className="w-full p-2 border border-slate-300 rounded-md bg-white"
                      >
                        <option value="">Selecionar lote agrupado</option>
                        {groupedAnimalLots.map((lot) => (
                          <option key={lot.id} value={lot.id}>
                            {lot.name} | fase: {lot.phase ?? '-'} | peso: {lot.totalWeightKg ?? 0} kg
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="text-sm text-slate-700 space-y-1">
                      <span>Peso total (kg)</span>
                      <input
                        value={pdvForm.animalWeightKg}
                        onChange={(event) => setPdvForm((prev) => ({ ...prev, animalWeightKg: event.target.value }))}
                        className="w-full p-2 border border-slate-300 rounded-md bg-white"
                        placeholder="Ex: 1840,5"
                      />
                    </label>
                    <label className="text-sm text-slate-700 space-y-1">
                      <span>Cabecas (opcional)</span>
                      <input
                        value={pdvForm.headcount}
                        onChange={(event) => setPdvForm((prev) => ({ ...prev, headcount: event.target.value }))}
                        className="w-full p-2 border border-slate-300 rounded-md bg-white"
                        placeholder="Ex: 32"
                      />
                    </label>
                  </div>
                  {selectedWeightLot && (
                    <p className="text-xs text-slate-700">
                      Lote selecionado: {selectedWeightLot.name} | fase: {selectedWeightLot.phase ?? '-'} | idade:{' '}
                      {selectedWeightLot.ageInDays ?? '-'} dias | peso total: {selectedWeightLot.totalWeightKg ?? 0} kg
                    </p>
                  )}
                </div>
              )}

              {pdvForm.sourceType === 'CROP' && (
                <div className="space-y-3 p-4 rounded-lg border border-blue-200 bg-blue-50">
                  <h4 className="font-semibold text-blue-800">Venda de plantacao por talhao/peso/caixas</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <label className="text-sm text-slate-700 space-y-1">
                      <span>Talhao/Pasto</span>
                      <select
                        value={pdvForm.fieldPlot}
                        onChange={(event) => setPdvForm((prev) => ({ ...prev, fieldPlot: event.target.value }))}
                        className="w-full p-2 border border-slate-300 rounded-md bg-white"
                      >
                        <option value="">Selecionar talhao/pasto</option>
                        {pastures.map((pasture) => (
                          <option key={pasture.id} value={pasture.name}>
                            {pasture.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="text-sm text-slate-700 space-y-1">
                      <span>Peso total (kg)</span>
                      <input
                        value={pdvForm.cropWeightKg}
                        onChange={(event) => setPdvForm((prev) => ({ ...prev, cropWeightKg: event.target.value }))}
                        className="w-full p-2 border border-slate-300 rounded-md bg-white"
                        placeholder="Ex: 15200"
                      />
                    </label>
                    <label className="text-sm text-slate-700 space-y-1">
                      <span>Caixas</span>
                      <input
                        value={pdvForm.boxes}
                        onChange={(event) => setPdvForm((prev) => ({ ...prev, boxes: event.target.value }))}
                        className="w-full p-2 border border-slate-300 rounded-md bg-white"
                        placeholder="Ex: 220"
                      />
                    </label>
                    <label className="text-sm text-slate-700 space-y-1">
                      <span>Tamanho das caixas</span>
                      <select
                        value={pdvForm.boxSize}
                        onChange={(event) => setPdvForm((prev) => ({ ...prev, boxSize: event.target.value }))}
                        className="w-full p-2 border border-slate-300 rounded-md bg-white"
                      >
                        <option value="">Selecionar tamanho</option>
                        <option value="P">Pequena (P)</option>
                        <option value="M">Media (M)</option>
                        <option value="G">Grande (G)</option>
                        <option value="EXTRA">Extra</option>
                        <option value="MISTA">Mista</option>
                      </select>
                    </label>
                    <label className="text-sm text-slate-700 space-y-1">
                      <span>Qualidade</span>
                      <select
                        value={pdvForm.qualityGrade}
                        onChange={(event) => setPdvForm((prev) => ({ ...prev, qualityGrade: event.target.value }))}
                        className="w-full p-2 border border-slate-300 rounded-md bg-white"
                      >
                        <option value="">Selecionar qualidade</option>
                        <option value="A">Classe A</option>
                        <option value="B">Classe B</option>
                        <option value="C">Classe C</option>
                        <option value="EXPORTACAO">Exportacao</option>
                        <option value="INDUSTRIA">Industria</option>
                      </select>
                    </label>
                    <CodeScannerField
                      label="QR da balanca"
                      mode="QR_ONLY"
                      value={pdvForm.scaleQrCode}
                      onChange={(nextValue) => setPdvForm((prev) => ({ ...prev, scaleQrCode: nextValue }))}
                      placeholder="Codigo QR da pesagem"
                      helperText="Use camera, leitura por imagem ou digitacao manual."
                    />
                    <label className="text-sm text-slate-700 space-y-1">
                      <span>Veiculo</span>
                      <input
                        value={pdvForm.vehiclePlate}
                        onChange={(event) => setPdvForm((prev) => ({ ...prev, vehiclePlate: event.target.value }))}
                        className="w-full p-2 border border-slate-300 rounded-md bg-white"
                        placeholder="Placa/codigo do veiculo"
                      />
                    </label>
                    <label className="text-sm text-slate-700 space-y-1">
                      <span>Autorizacao de venda</span>
                      <input
                        value={pdvForm.saleAuthorizationCode}
                        onChange={(event) => setPdvForm((prev) => ({ ...prev, saleAuthorizationCode: event.target.value }))}
                        className="w-full p-2 border border-slate-300 rounded-md bg-white"
                        placeholder="Numero/ID da autorizacao"
                      />
                    </label>
                  </div>
                </div>
              )}

              {pdvForm.sourceType === 'ASSET' && (
                <div className="space-y-3 p-4 rounded-lg border border-violet-200 bg-violet-50">
                  <h4 className="font-semibold text-violet-800">Venda/leilao de bem patrimonial</h4>
                  <label className="text-sm text-slate-700 space-y-1 block">
                    <span>Item do estoque patrimonial</span>
                    <select
                      value={pdvForm.assetItemId}
                      onChange={(event) => setPdvForm((prev) => ({ ...prev, assetItemId: event.target.value }))}
                      className="w-full p-2 border border-slate-300 rounded-md bg-white"
                    >
                      <option value="">Selecionar item</option>
                      {assetStock.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name} | qtd: {item.quantity} {item.unit}
                        </option>
                      ))}
                    </select>
                  </label>
                  {selectedAsset && (
                    <p className="text-xs text-slate-700">
                      Bem selecionado: {selectedAsset.name} | tag: {selectedAsset.assetTag ?? 'sem tag'} | local:{' '}
                      {selectedAsset.location}
                    </p>
                  )}
                </div>
              )}

              <div className="space-y-3 p-4 rounded-lg border border-slate-200 bg-slate-50">
                <h4 className="font-semibold text-slate-800">Evidencias digitais para auditoria</h4>
                <CodeScannerField
                  label="QR/codigo da operacao"
                  mode="ANY"
                  value={pdvForm.qrCode}
                  onChange={(nextValue) => setPdvForm((prev) => ({ ...prev, qrCode: nextValue }))}
                  placeholder="Leitura QR/codigo para rastreabilidade"
                  helperText="Aceita QR, codigo de barras por camera/imagem ou digitacao manual."
                />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <label className="text-sm text-slate-700 space-y-1">
                    <span>Foto</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(event) => setPhotoEvidence(event.target.files?.[0] ?? null)}
                      className="w-full p-2 border border-slate-300 rounded-md bg-white text-xs"
                    />
                  </label>
                  <label className="text-sm text-slate-700 space-y-1">
                    <span>Video</span>
                    <input
                      type="file"
                      accept="video/*"
                      onChange={(event) => setVideoEvidence(event.target.files?.[0] ?? null)}
                      className="w-full p-2 border border-slate-300 rounded-md bg-white text-xs"
                    />
                  </label>
                  <label className="text-sm text-slate-700 space-y-1">
                    <span>Autorizacao (arquivo)</span>
                    <input
                      type="file"
                      onChange={(event) => setAuthorizationEvidence(event.target.files?.[0] ?? null)}
                      className="w-full p-2 border border-slate-300 rounded-md bg-white text-xs"
                    />
                  </label>
                </div>
                {!currentUser?.tenantId && (
                  <p className="text-xs text-amber-700">
                    Sem tenantId ativo: arquivos nao serao enviados ao storage, use ao menos QR para auditoria.
                  </p>
                )}
              </div>

              <label className="inline-flex items-center text-sm text-slate-700 gap-2">
                <input
                  type="checkbox"
                  checked={pdvForm.deferFiscalEmission}
                  onChange={(event) => setPdvForm((prev) => ({ ...prev, deferFiscalEmission: event.target.checked }))}
                />
                Postergar emissao fiscal (venda direta fica AGUARDANDO_EMISSAO)
              </label>

              <button
                type="submit"
                disabled={isSubmittingPdv}
                className="px-4 py-2 rounded-md bg-emerald-600 text-white font-semibold hover:bg-emerald-700 disabled:opacity-60"
              >
                {isSubmittingPdv ? 'Registrando operacao...' : 'Registrar venda/remessa no PDV'}
              </button>
            </form>

            <div className="space-y-4">
              <div className="bg-white rounded-lg shadow-md border border-slate-200 p-4">
                <p className="text-xs uppercase font-bold text-slate-500">Operacoes PDV</p>
                <p className="text-3xl font-bold text-slate-800">{pdvSales.length}</p>
              </div>
              <div className="bg-white rounded-lg shadow-md border border-slate-200 p-4">
                <p className="text-xs uppercase font-bold text-slate-500">Pendentes de NF</p>
                <p className="text-3xl font-bold text-amber-600">
                  {pdvSales.filter((sale) => sale.fiscalStatus !== 'NF_EMITIDA').length}
                </p>
              </div>
              <div className="bg-white rounded-lg shadow-md border border-slate-200 p-4">
                <p className="text-xs uppercase font-bold text-slate-500">Valor total movimentado</p>
                <p className="text-2xl font-bold text-emerald-700">
                  {formatCurrency(pdvSales.reduce((sum, sale) => sum + sale.totalValue, 0))}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-200">
              <h3 className="text-lg font-bold text-slate-800">Historico PDV e emissao fiscal</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-100 text-xs uppercase text-slate-700">
                  <tr>
                    <th className="px-4 py-3 text-left">Data</th>
                    <th className="px-4 py-3 text-left">Origem / Comprador</th>
                    <th className="px-4 py-3 text-left">Liquidacao</th>
                    <th className="px-4 py-3 text-left">Valor</th>
                    <th className="px-4 py-3 text-left">Fiscal</th>
                    <th className="px-4 py-3 text-left">Escrow</th>
                    <th className="px-4 py-3 text-left">Evidencias</th>
                    <th className="px-4 py-3 text-right">Acao</th>
                  </tr>
                </thead>
                <tbody>
                  {pdvSales.length === 0 && (
                    <tr>
                      <td className="px-4 py-6 text-slate-500" colSpan={8}>
                        Nenhuma operacao PDV registrada.
                      </td>
                    </tr>
                  )}
                  {pdvSales.map((sale) => (
                    <tr key={sale.id} className="border-b last:border-b-0 hover:bg-slate-50">
                      <td className="px-4 py-3 whitespace-nowrap">{sale.createdAt}</td>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-slate-800">{sourceTypeLabel(sale.sourceType)}</p>
                        <p className="text-xs text-slate-500">{sale.buyer}</p>
                        <p className="text-xs text-slate-500">
                          {sale.buyerProfile
                            ? `${sale.buyerProfile.documentType}: ${sale.buyerProfile.documentNumber} | ${sale.buyerProfile.addressCity}/${sale.buyerProfile.addressState}`
                            : 'Cadastro fiscal do comprador nao informado'}
                        </p>
                        <p className="text-xs text-slate-500">
                          {sale.sourceType === 'ANIMAL_UNIT_LOT' &&
                            `lote=${sale.lotId ?? '-'} | cabecas=${sale.headcount ?? sale.animalIds?.length ?? '-'}`}
                          {sale.sourceType === 'ANIMAL_WEIGHT' &&
                            `peso=${sale.totalWeightKg ?? 0}kg | cabecas=${sale.headcount ?? '-'}`}
                          {sale.sourceType === 'CROP' &&
                            `talhao=${sale.fieldPlot ?? '-'} | peso=${sale.totalWeightKg ?? 0}kg | caixas=${sale.boxes ?? 0} (${sale.boxSize ?? '-'}) | qualidade=${sale.qualityGrade ?? '-'}`}
                          {sale.sourceType === 'ASSET' && `bem=${sale.assetName ?? sale.assetItemId ?? '-'}`}
                        </p>
                      </td>
                      <td className="px-4 py-3">{settlementLabel(sale.settlementMode)}</td>
                      <td className="px-4 py-3 font-semibold text-emerald-700">{formatCurrency(sale.totalValue)}</td>
                      <td className="px-4 py-3">
                        <div className="space-y-1">
                          <FiscalBadge status={sale.fiscalStatus} />
                          <p className="text-xs text-slate-500">{sale.fiscalDocumentNumber ?? 'NF pendente'}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="space-y-1">
                          <EscrowBadge status={sale.escrowStatus} />
                          <p className="text-xs text-slate-500">
                            {sale.escrowId ?? 'ESC-N/A'} | {formatCurrency(sale.escrowAmount)}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600">{sale.evidences.length} arquivo(s)/leitura(s)</td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        {sale.fiscalStatus === 'AGUARDANDO_FINALIZACAO_LEILAO' && (
                          <button
                            onClick={() => void handleFinalizeAuction(sale.id)}
                            disabled={finalizingId === sale.id}
                            className="px-3 py-1 rounded-md bg-amber-500 text-white text-xs font-semibold hover:bg-amber-600 disabled:opacity-60"
                          >
                            {finalizingId === sale.id ? 'Finalizando...' : 'Finalizar leilao + NF'}
                          </button>
                        )}
                        {sale.fiscalStatus === 'AGUARDANDO_EMISSAO' && (
                          <button
                            onClick={() => void handleIssuePendingInvoice(sale.id)}
                            disabled={finalizingId === sale.id}
                            className="px-3 py-1 rounded-md bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 disabled:opacity-60"
                          >
                            {finalizingId === sale.id ? 'Emitindo...' : 'Emitir NF'}
                          </button>
                        )}
                        {sale.fiscalStatus === 'NF_EMITIDA' && (
                          <span className="inline-flex items-center text-emerald-700 text-xs font-semibold">
                            <CheckCircleIcon className="h-4 w-4 mr-1" />
                            Concluida
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
      {activeTab === 'ANIMALS' && (
        <div className="space-y-6 animate-fade-in">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <form onSubmit={handleRegisterAnimal} className="bg-white rounded-lg shadow-md border border-slate-200 p-6 space-y-4">
              <h3 className="text-xl font-bold text-slate-800">Cadastro de animais separado do estoque</h3>
              <p className="text-sm text-slate-600">
                Gado, ovinos e suinos usam brinco/chip unitario. Aves, peixes e outros usam cadastro por lote/peso/fase/idade.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <label className="text-sm text-slate-600 space-y-1">
                  <span>Brinco</span>
                  <input
                    value={animalForm.earringCode}
                    onChange={(event) => setAnimalForm((prev) => ({ ...prev, earringCode: event.target.value }))}
                    className="w-full p-2 border border-slate-300 rounded-md"
                    placeholder="Ex: BR-001928"
                    disabled={GROUPED_SPECIES.has(animalForm.species)}
                  />
                </label>
                <label className="text-sm text-slate-600 space-y-1">
                  <span>Especie</span>
                  <select
                    value={animalForm.species}
                    onChange={(event) => {
                      const nextSpecies = event.target.value as ProducerAnimal['species'];
                      setAnimalForm((prev) => ({
                        ...prev,
                        species: nextSpecies,
                        trackingMode: UNITARY_SPECIES.has(nextSpecies) ? 'UNIT' : 'WEIGHT',
                        earringCode: GROUPED_SPECIES.has(nextSpecies) ? '' : prev.earringCode,
                      }));
                    }}
                    className="w-full p-2 border border-slate-300 rounded-md bg-white"
                  >
                    <option value="BOVINO">Bovino</option>
                    <option value="SUINO">Suino</option>
                    <option value="OVINO">Ovino</option>
                    <option value="CAPRINO">Caprino</option>
                    <option value="EQUINO">Equino</option>
                    <option value="AVE">Ave</option>
                    <option value="PEIXE">Peixe</option>
                    <option value="OUTRO">Outro</option>
                  </select>
                </label>
                <label className="text-sm text-slate-600 space-y-1">
                  <span>Categoria</span>
                  <input
                    value={animalForm.category}
                    onChange={(event) => setAnimalForm((prev) => ({ ...prev, category: event.target.value }))}
                    className="w-full p-2 border border-slate-300 rounded-md"
                    placeholder="Ex: Recria"
                  />
                </label>
                <label className="text-sm text-slate-600 space-y-1">
                  <span>Modo de rastreio</span>
                  <select
                    value={animalForm.trackingMode}
                    onChange={(event) =>
                      setAnimalForm((prev) => ({ ...prev, trackingMode: event.target.value as ProducerAnimal['trackingMode'] }))
                    }
                    className="w-full p-2 border border-slate-300 rounded-md bg-white"
                    disabled={UNITARY_SPECIES.has(animalForm.species) || GROUPED_SPECIES.has(animalForm.species)}
                  >
                    <option value="UNIT">Unitario</option>
                    <option value="WEIGHT">Por peso</option>
                  </select>
                </label>
                <label className="text-sm text-slate-600 space-y-1">
                  <span>Peso atual (kg)</span>
                  <input
                    value={animalForm.currentWeightKg}
                    onChange={(event) => setAnimalForm((prev) => ({ ...prev, currentWeightKg: event.target.value }))}
                    className="w-full p-2 border border-slate-300 rounded-md"
                    placeholder="Ex: 415,3"
                  />
                </label>
                <label className="text-sm text-slate-600 space-y-1">
                  <span>Pasto/Talhao</span>
                  <select
                    value={animalForm.pastureId}
                    onChange={(event) => setAnimalForm((prev) => ({ ...prev, pastureId: event.target.value }))}
                    className="w-full p-2 border border-slate-300 rounded-md bg-white"
                  >
                    <option value="">Selecionar</option>
                    {pastures.map((pasture) => (
                      <option key={pasture.id} value={pasture.id}>
                        {pasture.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              {GROUPED_SPECIES.has(animalForm.species) && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                  Para {animalForm.species.toLowerCase()}, use o formulario de lote agrupado ao lado.
                </div>
              )}
              <button
                type="submit"
                disabled={isSubmittingAnimal}
                className="px-4 py-2 rounded-md bg-emerald-600 text-white font-semibold hover:bg-emerald-700 disabled:opacity-60"
              >
                {isSubmittingAnimal ? 'Cadastrando animal...' : 'Cadastrar animal'}
              </button>
            </form>

            <div className="bg-white rounded-lg shadow-md border border-slate-200 p-6 space-y-4">
              <h3 className="text-xl font-bold text-slate-800">Leitura de brinco e formacao de lote unitario</h3>
              <p className="text-xs text-slate-600">
                Esta etapa e exclusiva para gado/ovino/suino com brinco/chip.
              </p>
              <CodeScannerField
                label="Leitura de brinco/chip"
                mode="BARCODE_ONLY"
                value={earringScanInput}
                onChange={setEarringScanInput}
                placeholder="Digite, escaneie pela camera ou envie imagem do codigo"
                helperText="Apos leitura, clique em adicionar para formar o lote."
              />
              <div className="flex justify-end">
                <button onClick={handleReadEarring} type="button" className="px-4 py-2 rounded-md bg-indigo-600 text-white font-semibold hover:bg-indigo-700">
                  Adicionar brinco lido
                </button>
              </div>

              <div className="flex flex-wrap gap-2 min-h-[40px]">
                {selectedAnimals.length === 0 && <span className="text-sm text-slate-500">Nenhum animal lido.</span>}
                {selectedAnimals.map((animal) => (
                  <span key={animal.id} className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs bg-indigo-100 text-indigo-700">
                    {animal.earringCode}
                    <button type="button" onClick={() => removeSelectedAnimal(animal.id)} className="text-indigo-900 font-bold">
                      x
                    </button>
                  </span>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <label className="text-sm text-slate-600 space-y-1">
                  <span>Nome do lote</span>
                  <input
                    value={lotForm.name}
                    onChange={(event) => setLotForm((prev) => ({ ...prev, name: event.target.value }))}
                    className="w-full p-2 border border-slate-300 rounded-md"
                    placeholder="Ex: Lote Recria Norte"
                  />
                </label>
                <label className="text-sm text-slate-600 space-y-1">
                  <span>Categoria do lote</span>
                  <input
                    value={lotForm.category}
                    onChange={(event) => setLotForm((prev) => ({ ...prev, category: event.target.value }))}
                    className="w-full p-2 border border-slate-300 rounded-md"
                    placeholder="Ex: Recria"
                  />
                </label>
                <label className="text-sm text-slate-600 space-y-1">
                  <span>Pasto/Talhao</span>
                  <select
                    value={lotForm.pastureId}
                    onChange={(event) => setLotForm((prev) => ({ ...prev, pastureId: event.target.value }))}
                    className="w-full p-2 border border-slate-300 rounded-md bg-white"
                  >
                    <option value="">Selecionar</option>
                    {pastures.map((pasture) => (
                      <option key={pasture.id} value={pasture.id}>
                        {pasture.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-sm text-slate-600 space-y-1">
                  <span>Area de distribuicao</span>
                  <input
                    value={lotForm.distributionArea}
                    onChange={(event) => setLotForm((prev) => ({ ...prev, distributionArea: event.target.value }))}
                    className="w-full p-2 border border-slate-300 rounded-md"
                    placeholder="Ex: Manga 3 / Piquete 2"
                  />
                </label>
              </div>

              <button
                type="button"
                onClick={() => void handleCreateLotFromReadings()}
                disabled={isSubmittingLot}
                className="px-4 py-2 rounded-md bg-amber-500 text-white font-semibold hover:bg-amber-600 disabled:opacity-60"
              >
                {isSubmittingLot ? 'Montando lote...' : 'Consolidar lote pelos brincos lidos'}
              </button>

              <div className="border-t border-slate-200 pt-4 space-y-3">
                <h4 className="font-semibold text-slate-800">Cadastro agrupado para aves, peixes e outros</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <label className="text-sm text-slate-600 space-y-1">
                    <span>Especie</span>
                    <select
                      value={groupLotForm.species}
                      onChange={(event) => setGroupLotForm((prev) => ({ ...prev, species: event.target.value as ProducerAnimal['species'] }))}
                      className="w-full p-2 border border-slate-300 rounded-md bg-white"
                    >
                      <option value="AVE">Ave</option>
                      <option value="PEIXE">Peixe</option>
                      <option value="OUTRO">Outro</option>
                    </select>
                  </label>
                  <label className="text-sm text-slate-600 space-y-1">
                    <span>Nome do lote</span>
                    <input
                      value={groupLotForm.name}
                      onChange={(event) => setGroupLotForm((prev) => ({ ...prev, name: event.target.value }))}
                      className="w-full p-2 border border-slate-300 rounded-md"
                    />
                  </label>
                  <label className="text-sm text-slate-600 space-y-1">
                    <span>Categoria</span>
                    <input
                      value={groupLotForm.category}
                      onChange={(event) => setGroupLotForm((prev) => ({ ...prev, category: event.target.value }))}
                      className="w-full p-2 border border-slate-300 rounded-md"
                    />
                  </label>
                  <label className="text-sm text-slate-600 space-y-1">
                    <span>Fase</span>
                    <input
                      value={groupLotForm.phase}
                      onChange={(event) => setGroupLotForm((prev) => ({ ...prev, phase: event.target.value }))}
                      className="w-full p-2 border border-slate-300 rounded-md"
                      placeholder="Ex: inicial, recria, finalizacao"
                    />
                  </label>
                  <label className="text-sm text-slate-600 space-y-1">
                    <span>Idade (dias)</span>
                    <input
                      value={groupLotForm.ageInDays}
                      onChange={(event) => setGroupLotForm((prev) => ({ ...prev, ageInDays: event.target.value }))}
                      className="w-full p-2 border border-slate-300 rounded-md"
                    />
                  </label>
                  <label className="text-sm text-slate-600 space-y-1">
                    <span>Quantidade</span>
                    <input
                      value={groupLotForm.headcount}
                      onChange={(event) => setGroupLotForm((prev) => ({ ...prev, headcount: event.target.value }))}
                      className="w-full p-2 border border-slate-300 rounded-md"
                    />
                  </label>
                  <label className="text-sm text-slate-600 space-y-1">
                    <span>Peso total (kg)</span>
                    <input
                      value={groupLotForm.totalWeightKg}
                      onChange={(event) => setGroupLotForm((prev) => ({ ...prev, totalWeightKg: event.target.value }))}
                      className="w-full p-2 border border-slate-300 rounded-md"
                    />
                  </label>
                  <label className="text-sm text-slate-600 space-y-1">
                    <span>Pasto/Talhao</span>
                    <select
                      value={groupLotForm.pastureId}
                      onChange={(event) => setGroupLotForm((prev) => ({ ...prev, pastureId: event.target.value }))}
                      className="w-full p-2 border border-slate-300 rounded-md bg-white"
                    >
                      <option value="">Selecionar</option>
                      {pastures.map((pasture) => (
                        <option key={pasture.id} value={pasture.id}>
                          {pasture.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="text-sm text-slate-600 space-y-1">
                    <span>Area de distribuicao</span>
                    <input
                      value={groupLotForm.distributionArea}
                      onChange={(event) => setGroupLotForm((prev) => ({ ...prev, distributionArea: event.target.value }))}
                      className="w-full p-2 border border-slate-300 rounded-md"
                    />
                  </label>
                </div>
                <button
                  type="button"
                  onClick={() => void handleCreateGroupedLot()}
                  disabled={isSubmittingLot}
                  className="px-4 py-2 rounded-md bg-slate-800 text-white font-semibold hover:bg-slate-900 disabled:opacity-60"
                >
                  {isSubmittingLot ? 'Cadastrando lote...' : 'Cadastrar lote agrupado'}
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg shadow-md border border-slate-200 p-6 space-y-4">
              <h3 className="text-xl font-bold text-slate-800">Apartacao de lote unitario</h3>
              <p className="text-xs text-slate-600">
                Separe parte de um lote unitario (gado/ovino/suino) para formar um novo lote com rastreio.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <label className="text-sm text-slate-600 space-y-1 md:col-span-2">
                  <span>Lote de origem</span>
                  <select
                    value={splitUnitLotForm.sourceLotId}
                    onChange={(event) => setSplitUnitLotForm((prev) => ({ ...prev, sourceLotId: event.target.value }))}
                    className="w-full p-2 border border-slate-300 rounded-md bg-white"
                  >
                    <option value="">Selecionar lote unitario</option>
                    {unitaryAnimalLots
                      .filter((lot) => lot.headcount > 1)
                      .map((lot) => (
                        <option key={lot.id} value={lot.id}>
                          {lot.name} | cabecas: {lot.headcount}
                        </option>
                      ))}
                  </select>
                </label>
                <label className="text-sm text-slate-600 space-y-1">
                  <span>Novo lote</span>
                  <input
                    value={splitUnitLotForm.newLotName}
                    onChange={(event) => setSplitUnitLotForm((prev) => ({ ...prev, newLotName: event.target.value }))}
                    className="w-full p-2 border border-slate-300 rounded-md"
                    placeholder="Ex: Lote Apartado 01"
                  />
                </label>
                <label className="text-sm text-slate-600 space-y-1">
                  <span>Categoria do novo lote</span>
                  <input
                    value={splitUnitLotForm.newLotCategory}
                    onChange={(event) => setSplitUnitLotForm((prev) => ({ ...prev, newLotCategory: event.target.value }))}
                    className="w-full p-2 border border-slate-300 rounded-md"
                    placeholder="Ex: Recria"
                  />
                </label>
                <label className="text-sm text-slate-600 space-y-1">
                  <span>Cabecas para apartar</span>
                  <input
                    value={splitUnitLotForm.separatedHeadcount}
                    onChange={(event) => setSplitUnitLotForm((prev) => ({ ...prev, separatedHeadcount: event.target.value }))}
                    className="w-full p-2 border border-slate-300 rounded-md"
                    placeholder="Ex: 12"
                  />
                </label>
                <label className="text-sm text-slate-600 space-y-1">
                  <span>Pasto/Talhao destino</span>
                  <select
                    value={splitUnitLotForm.pastureId}
                    onChange={(event) => setSplitUnitLotForm((prev) => ({ ...prev, pastureId: event.target.value }))}
                    className="w-full p-2 border border-slate-300 rounded-md bg-white"
                  >
                    <option value="">Selecionar</option>
                    {pastures.map((pasture) => (
                      <option key={pasture.id} value={pasture.id}>
                        {pasture.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-sm text-slate-600 space-y-1 md:col-span-2">
                  <span>Area de distribuicao destino</span>
                  <input
                    value={splitUnitLotForm.distributionArea}
                    onChange={(event) => setSplitUnitLotForm((prev) => ({ ...prev, distributionArea: event.target.value }))}
                    className="w-full p-2 border border-slate-300 rounded-md"
                    placeholder="Ex: Manga 5 / Corredor B"
                  />
                </label>
              </div>
              {splitSourceUnitLot && (
                <p className="text-xs text-slate-600">
                  Origem: {splitSourceUnitLot.name} | cabecas={splitSourceUnitLot.headcount} | peso total=
                  {splitSourceUnitLot.totalWeightKg ?? 0} kg
                </p>
              )}
              <button
                type="button"
                onClick={() => void handleSplitUnitLot()}
                disabled={isSplittingLot}
                className="px-4 py-2 rounded-md bg-indigo-600 text-white font-semibold hover:bg-indigo-700 disabled:opacity-60"
              >
                {isSplittingLot ? 'Apartando...' : 'Apartar e formar novo lote'}
              </button>
            </div>

            <div className="bg-white rounded-lg shadow-md border border-slate-200 p-6 space-y-4">
              <h3 className="text-xl font-bold text-slate-800">Separacao de lote por peso/fase</h3>
              <p className="text-xs text-slate-600">
                Para aves, peixes e outros: separar por quantidade e peso e gerar novo lote com fase/qualidade.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <label className="text-sm text-slate-600 space-y-1 md:col-span-2">
                  <span>Lote de origem (peso/fase)</span>
                  <select
                    value={splitWeightLotForm.sourceLotId}
                    onChange={(event) => setSplitWeightLotForm((prev) => ({ ...prev, sourceLotId: event.target.value }))}
                    className="w-full p-2 border border-slate-300 rounded-md bg-white"
                  >
                    <option value="">Selecionar lote por peso</option>
                    {groupedAnimalLots
                      .filter((lot) => lot.headcount > 1 && (lot.totalWeightKg ?? 0) > 0)
                      .map((lot) => (
                        <option key={lot.id} value={lot.id}>
                          {lot.name} | fase: {lot.phase ?? '-'} | cabecas: {lot.headcount} | peso: {lot.totalWeightKg ?? 0} kg
                        </option>
                      ))}
                  </select>
                </label>
                <label className="text-sm text-slate-600 space-y-1">
                  <span>Novo lote</span>
                  <input
                    value={splitWeightLotForm.newLotName}
                    onChange={(event) => setSplitWeightLotForm((prev) => ({ ...prev, newLotName: event.target.value }))}
                    className="w-full p-2 border border-slate-300 rounded-md"
                    placeholder="Ex: Lote Separado Fase 2"
                  />
                </label>
                <label className="text-sm text-slate-600 space-y-1">
                  <span>Categoria do novo lote</span>
                  <input
                    value={splitWeightLotForm.newLotCategory}
                    onChange={(event) => setSplitWeightLotForm((prev) => ({ ...prev, newLotCategory: event.target.value }))}
                    className="w-full p-2 border border-slate-300 rounded-md"
                  />
                </label>
                <label className="text-sm text-slate-600 space-y-1">
                  <span>Cabecas separadas</span>
                  <input
                    value={splitWeightLotForm.separatedHeadcount}
                    onChange={(event) => setSplitWeightLotForm((prev) => ({ ...prev, separatedHeadcount: event.target.value }))}
                    className="w-full p-2 border border-slate-300 rounded-md"
                  />
                </label>
                <label className="text-sm text-slate-600 space-y-1">
                  <span>Peso separado (kg)</span>
                  <input
                    value={splitWeightLotForm.separatedWeightKg}
                    onChange={(event) => setSplitWeightLotForm((prev) => ({ ...prev, separatedWeightKg: event.target.value }))}
                    className="w-full p-2 border border-slate-300 rounded-md"
                  />
                </label>
                <label className="text-sm text-slate-600 space-y-1">
                  <span>Fase do novo lote</span>
                  <input
                    value={splitWeightLotForm.phase}
                    onChange={(event) => setSplitWeightLotForm((prev) => ({ ...prev, phase: event.target.value }))}
                    className="w-full p-2 border border-slate-300 rounded-md"
                    placeholder="Ex: recria"
                  />
                </label>
                <label className="text-sm text-slate-600 space-y-1">
                  <span>Idade (dias)</span>
                  <input
                    value={splitWeightLotForm.ageInDays}
                    onChange={(event) => setSplitWeightLotForm((prev) => ({ ...prev, ageInDays: event.target.value }))}
                    className="w-full p-2 border border-slate-300 rounded-md"
                  />
                </label>
                <label className="text-sm text-slate-600 space-y-1">
                  <span>Pasto/Talhao destino</span>
                  <select
                    value={splitWeightLotForm.pastureId}
                    onChange={(event) => setSplitWeightLotForm((prev) => ({ ...prev, pastureId: event.target.value }))}
                    className="w-full p-2 border border-slate-300 rounded-md bg-white"
                  >
                    <option value="">Selecionar</option>
                    {pastures.map((pasture) => (
                      <option key={pasture.id} value={pasture.id}>
                        {pasture.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-sm text-slate-600 space-y-1 md:col-span-2">
                  <span>Area de distribuicao destino</span>
                  <input
                    value={splitWeightLotForm.distributionArea}
                    onChange={(event) => setSplitWeightLotForm((prev) => ({ ...prev, distributionArea: event.target.value }))}
                    className="w-full p-2 border border-slate-300 rounded-md"
                  />
                </label>
              </div>
              {splitSourceWeightLot && (
                <p className="text-xs text-slate-600">
                  Origem: {splitSourceWeightLot.name} | cabecas={splitSourceWeightLot.headcount} | peso=
                  {splitSourceWeightLot.totalWeightKg ?? 0} kg | fase={splitSourceWeightLot.phase ?? '-'}
                </p>
              )}
              <button
                type="button"
                onClick={() => void handleSplitWeightLot()}
                disabled={isSplittingLot}
                className="px-4 py-2 rounded-md bg-slate-800 text-white font-semibold hover:bg-slate-900 disabled:opacity-60"
              >
                {isSplittingLot ? 'Separando...' : 'Separar e formar novo lote'}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg shadow-md border border-slate-200 overflow-hidden">
              <div className="p-4 border-b border-slate-200">
                <h3 className="text-lg font-bold text-slate-800">Lotes animais</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-100 text-xs uppercase text-slate-700">
                    <tr>
                      <th className="px-4 py-3 text-left">Lote</th>
                      <th className="px-4 py-3 text-left">Cabecas</th>
                      <th className="px-4 py-3 text-left">Peso medio</th>
                      <th className="px-4 py-3 text-left">Distribuicao</th>
                    </tr>
                  </thead>
                  <tbody>
                    {animalLots.length === 0 && (
                      <tr>
                        <td className="px-4 py-6 text-slate-500" colSpan={4}>
                          Nenhum lote cadastrado.
                        </td>
                      </tr>
                    )}
                    {animalLots.map((lot) => (
                      <tr key={lot.id} className="border-b last:border-b-0 hover:bg-slate-50">
                        <td className="px-4 py-3">
                          <p className="font-semibold text-slate-800">{lot.name}</p>
                          <p className="text-xs text-slate-500">
                            {lot.category} | {lot.trackingMode === 'WEIGHT' ? 'Peso/fase' : 'Unitario'}{lot.phase ? ` | fase=${lot.phase}` : ''}
                          </p>
                        </td>
                        <td className="px-4 py-3">{lot.headcount}</td>
                        <td className="px-4 py-3">{lot.averageWeightKg.toFixed(2)} kg</td>
                        <td className="px-4 py-3 text-xs text-slate-600">
                          {lot.distributionArea ?? pastureNameById(lot.pastureId)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md border border-slate-200 overflow-hidden">
              <div className="p-4 border-b border-slate-200">
                <h3 className="text-lg font-bold text-slate-800">Animais rastreados</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-100 text-xs uppercase text-slate-700">
                    <tr>
                      <th className="px-4 py-3 text-left">Brinco</th>
                      <th className="px-4 py-3 text-left">Especie</th>
                      <th className="px-4 py-3 text-left">Categoria</th>
                      <th className="px-4 py-3 text-left">Status</th>
                      <th className="px-4 py-3 text-left">Pasto/Talhao</th>
                    </tr>
                  </thead>
                  <tbody>
                    {animals.length === 0 && (
                      <tr>
                        <td className="px-4 py-6 text-slate-500" colSpan={5}>
                          Nenhum animal cadastrado.
                        </td>
                      </tr>
                    )}
                    {animals.map((animal) => (
                      <tr key={animal.id} className="border-b last:border-b-0 hover:bg-slate-50">
                        <td className="px-4 py-3 font-semibold text-slate-800">{animal.earringCode}</td>
                        <td className="px-4 py-3">{animal.species}</td>
                        <td className="px-4 py-3">{animal.category}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-2 py-1 rounded text-xs font-semibold ${
                              animal.status === 'ACTIVE'
                                ? 'bg-emerald-100 text-emerald-700'
                                : animal.status === 'IN_LOT'
                                  ? 'bg-blue-100 text-blue-700'
                                  : animal.status === 'AUCTION'
                                    ? 'bg-amber-100 text-amber-700'
                                    : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {animal.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-600">{pastureNameById(animal.pastureId)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
      {activeTab === 'OFFERS' && (
        <div className="space-y-6 animate-fade-in">
          <form onSubmit={handleAddOffer} className="bg-white rounded-lg shadow-md border border-slate-200 p-6 space-y-4">
            <h3 className="text-xl font-bold text-slate-800">Publicar oferta no marketplace</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
              <label className="text-sm text-slate-600 space-y-1">
                <span>Produto</span>
                <input name="product" value={newOffer.product} onChange={handleOfferInputChange} className="w-full p-2 border border-slate-300 rounded-md" />
              </label>
              <label className="text-sm text-slate-600 space-y-1">
                <span>Quantidade</span>
                <input name="quantity" value={newOffer.quantity} onChange={handleOfferInputChange} className="w-full p-2 border border-slate-300 rounded-md" placeholder="Ex: 150 sc" />
              </label>
              <label className="text-sm text-slate-600 space-y-1">
                <span>Preco (R$)</span>
                <input name="price" value={newOffer.price} onChange={handleOfferInputChange} className="w-full p-2 border border-slate-300 rounded-md" placeholder="0,00" />
              </label>
              <label className="text-sm text-slate-600 space-y-1">
                <span>Tipo da oferta</span>
                <select name="offerType" value={newOffer.offerType} onChange={handleOfferInputChange} className="w-full p-2 border border-slate-300 rounded-md bg-white">
                  <option value="PRODUTO">Produto</option>
                  <option value="ANIMAL">Animal</option>
                  <option value="UTENSILIO">Utensilio</option>
                </select>
              </label>
              <label className="text-sm text-slate-600 space-y-1">
                <span>Canal</span>
                <select
                  name="channel"
                  value={newOffer.channel}
                  onChange={handleOfferInputChange}
                  className="w-full p-2 border border-slate-300 rounded-md bg-white"
                  disabled={newOffer.listingMode === 'AUCTION'}
                >
                  <option value="WHOLESALE_DIRECT">Atacadista direto</option>
                  <option value="RETAIL_MARKETS">Mercados</option>
                </select>
              </label>
              <label className="text-sm text-slate-600 space-y-1">
                <span>Modo de listagem</span>
                <select name="listingMode" value={newOffer.listingMode} onChange={handleOfferInputChange} className="w-full p-2 border border-slate-300 rounded-md bg-white">
                  <option value="FIXED_PRICE">Preco fixo</option>
                  <option value="AUCTION">Leilao</option>
                </select>
              </label>
              <label className="text-sm text-slate-600 space-y-1 xl:col-span-2">
                <span>Local</span>
                <input name="location" value={newOffer.location} onChange={handleOfferInputChange} className="w-full p-2 border border-slate-300 rounded-md" placeholder="Cidade/UF ou base da propriedade" />
              </label>
            </div>
            <label className="text-sm text-slate-600 space-y-1 block">
              <span>Descricao</span>
              <input name="description" value={newOffer.description} onChange={handleOfferInputChange} className="w-full p-2 border border-slate-300 rounded-md" placeholder="Detalhes para compradores" />
            </label>

            {newOffer.listingMode === 'AUCTION' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-4 rounded-lg border border-amber-200 bg-amber-50">
                <label className="text-sm text-slate-700 space-y-1">
                  <span>Data base do leilao (opcional)</span>
                  <input name="auctionEndAt" type="date" value={newOffer.auctionEndAt} onChange={handleOfferInputChange} className="w-full p-2 border border-slate-300 rounded-md bg-white" />
                </label>
                <label className="text-sm text-slate-700 space-y-1">
                  <span>Lance minimo (R$)</span>
                  <input name="minimumBid" value={newOffer.minimumBid} onChange={handleOfferInputChange} className="w-full p-2 border border-slate-300 rounded-md bg-white" placeholder="0,00" />
                </label>
                <p className="md:col-span-2 text-xs text-amber-800">
                  Regra fixa: oferta publica inicia sempre as 19:00 e encerra automaticamente no 7o dia.
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmittingOffer}
              className="px-4 py-2 rounded-md bg-emerald-600 text-white font-semibold hover:bg-emerald-700 disabled:opacity-60"
            >
              {isSubmittingOffer ? 'Publicando oferta...' : 'Publicar oferta'}
            </button>
          </form>

          <div className="bg-white rounded-lg shadow-md border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-200">
              <h3 className="text-lg font-bold text-slate-800">Ofertas publicadas</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-100 text-xs uppercase text-slate-700">
                  <tr>
                    <th className="px-4 py-3 text-left">Produto</th>
                    <th className="px-4 py-3 text-left">Quantidade</th>
                    <th className="px-4 py-3 text-left">Preco</th>
                    <th className="px-4 py-3 text-left">Canal/Modo</th>
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-right">Acao</th>
                  </tr>
                </thead>
                <tbody>
                  {offers.length === 0 && (
                    <tr>
                      <td className="px-4 py-6 text-slate-500" colSpan={6}>
                        Nenhuma oferta publicada.
                      </td>
                    </tr>
                  )}
                  {offers.map((offer) => (
                    <tr key={offer.id} className="border-b last:border-b-0 hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-slate-800">{offer.product}</p>
                        <p className="text-xs text-slate-500">{offer.description ?? 'Sem descricao'}</p>
                      </td>
                      <td className="px-4 py-3">{offer.quantity}</td>
                      <td className="px-4 py-3 font-semibold text-emerald-700">{formatCurrency(offer.price)}</td>
                      <td className="px-4 py-3 text-xs text-slate-600">
                        <p>{offer.listingMode === 'AUCTION' ? 'Leilao' : channelLabel(offer.channel)}</p>
                        <p>{modeLabel(offer.listingMode)}</p>
                        {offer.listingMode === 'AUCTION' && (
                          <p>
                            Janela: {offer.auctionStartAt ?? '-'} ate {offer.auctionEndAt ?? '-'}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={offer.status} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => void handleDeleteOffer(offer)}
                          disabled={deletingId === offer.id}
                          className="inline-flex items-center px-3 py-1 rounded-md border border-red-200 text-red-600 hover:bg-red-50 text-xs font-semibold disabled:opacity-60"
                        >
                          <TrashIcon className="h-4 w-4 mr-1" />
                          {deletingId === offer.id ? 'Excluindo...' : 'Excluir'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalesView;
