import React, { useEffect, useMemo, useState } from 'react';
import {
  AVG_WEIGHT_GAIN_PER_UA,
  PRICE_PER_KG_LIVE_WEIGHT,
  SECTOR_VARIETIES,
  cultivarFactors,
  productFactors,
} from '../../constants';
import {
  Pasture,
  ProductionProject,
  ProductionSector,
  Property,
} from '../../types';
import PropertyMapView from './maps/PropertyMapView';
import { useToast } from '../../contexts/ToastContext';
import { propertyService } from '../../services/propertyService';
import SkeletonLoader from '../shared/SkeletonLoader';

const PropertyRegistrationView: React.FC = () => {
  const { addToast } = useToast();

  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [activeTab, setActiveTab] = useState<'Data' | 'Map'>('Data');

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

  const [pastures, setPastures] = useState<Pasture[]>([]);
  const [divisionName, setDivisionName] = useState('');
  const [divisionLat, setDivisionLat] = useState('');
  const [divisionLong, setDivisionLong] = useState('');

  const [carInput, setCarInput] = useState('');
  const [carSearchStatus, setCarSearchStatus] = useState<'IDLE' | 'LOADING' | 'FOUND' | 'ERROR'>('IDLE');
  const [sicarData, setSicarData] = useState<Record<string, string> | null>(null);
  const [pendingDeleteActivity, setPendingDeleteActivity] = useState<ProductionProject | null>(null);
  const [deletePassword, setDeletePassword] = useState('');

  const [selectedCultivar, setSelectedCultivar] = useState(cultivarFactors[0].name);
  const [selectedProduct, setSelectedProduct] = useState(productFactors[0].name);
  const [calculatedCapacity, setCalculatedCapacity] = useState<number | null>(null);

  const [pastureInvestment, setPastureInvestment] = useState(0);
  const [cattleInvestment, setCattleInvestment] = useState(0);
  const [investmentAnalysis, setInvestmentAnalysis] = useState<number | null>(null);

  useEffect(() => {
    const loadWorkspace = async () => {
      try {
        const workspace = await propertyService.loadWorkspace();
        setPropertyData(workspace.property);
        setEditableData(workspace.property);
        setActivities(workspace.activities);
        setPastures(workspace.pastures);
        setPastureInvestment(workspace.property.pastureInvestmentPerHa || 0);
        setCattleInvestment(workspace.property.cattleInvestmentPerHa || 0);
      } catch {
        addToast({ type: 'error', title: 'Falha de carga', message: 'Nao foi possivel carregar os dados da propriedade.' });
      } finally {
        setIsBootstrapping(false);
      }
    };

    void loadWorkspace();
  }, [addToast]);

  const availableVarieties = useMemo(() => {
    if (!newActivity.sector) {
      return [];
    }
    return SECTOR_VARIETIES[newActivity.sector] ?? [];
  }, [newActivity.sector]);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  const saveProperty = async () => {
    const result = await propertyService.updateProperty(editableData);
    if (!result.success) {
      addToast({ type: 'error', title: 'Erro de validacao', message: result.error || 'Campos invalidos.' });
      return;
    }
    setPropertyData(editableData);
    setIsEditing(false);
    addToast({ type: 'success', title: 'Dados salvos', message: 'Propriedade atualizada.' });
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    const isNumeric = ['totalArea', 'currentStockingCapacity', 'animalCount'].includes(name);
    setEditableData((prev) => ({ ...prev, [name]: isNumeric ? Number(value || 0) : value }));
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
      addToast({ type: 'warning', title: 'Dados incompletos', message: result.message || 'Preencha os campos.' });
      return;
    }
    setActivities((prev) => [...prev, result.newProject!]);
    setNewActivity({ sector: '', variety: '', name: '', volume: '' });
  };

  const handleDeleteActivity = async () => {
    if (!pendingDeleteActivity) {
      return;
    }
    const result = await propertyService.deleteActivity(pendingDeleteActivity.id, deletePassword);
    if (!result.success) {
      addToast({ type: 'error', title: 'Falha na exclusao', message: result.message || 'Nao foi possivel remover.' });
      return;
    }
    setActivities((prev) => prev.filter((activity) => activity.id !== pendingDeleteActivity.id));
    setPendingDeleteActivity(null);
    setDeletePassword('');
    addToast({ type: 'success', title: 'Atividade excluida', message: 'Registro removido com sucesso.' });
  };

  const handleSaveDivision = async () => {
    const lat = Number(divisionLat);
    const long = Number(divisionLong);
    if (!divisionName.trim() || Number.isNaN(lat) || Number.isNaN(long)) {
      addToast({ type: 'warning', title: 'Divisao invalida', message: 'Informe nome e coordenadas validas.' });
      return;
    }

    // The service requires at least 3 points; we derive a minimal triangle from the informed coordinate.
    const points = [
      { lat: lat.toFixed(6), long: long.toFixed(6) },
      { lat: (lat + 0.0001).toFixed(6), long: long.toFixed(6) },
      { lat: lat.toFixed(6), long: (long + 0.0001).toFixed(6) },
    ];

    const result = await propertyService.saveDivision({
      name: divisionName.trim(),
      points,
    });
    if (!result.success || !result.newPasture) {
      addToast({ type: 'warning', title: 'Divisao invalida', message: result.message || 'Informe nome e coordenadas.' });
      return;
    }
    setPastures((prev) => [...prev, result.newPasture!]);
    setDivisionName('');
    setDivisionLat('');
    setDivisionLong('');
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

  const handleCapacityCalc = () => {
    const cultivar = cultivarFactors.find((item) => item.name === selectedCultivar);
    const product = productFactors.find((item) => item.name === selectedProduct);
    if (!cultivar || !product) {
      return;
    }
    const nextValue = propertyData.currentStockingCapacity * cultivar.factor * (1 + product.factor);
    setCalculatedCapacity(nextValue);
  };

  const applyCapacity = async () => {
    if (calculatedCapacity === null) {
      return;
    }
    const nextData = propertyService.addHistoryItem(propertyData, {
      action: `Aplicacao de ${selectedProduct}`,
      details: `Lotacao para ${calculatedCapacity.toFixed(2)} UA/ha`,
    });
    const finalData = { ...nextData, currentStockingCapacity: Number(calculatedCapacity.toFixed(2)) };
    const result = await propertyService.updateProperty(finalData);
    if (!result.success) {
      addToast({ type: 'error', title: 'Falha ao salvar manejo', message: result.error || 'Erro ao atualizar capacidade.' });
      return;
    }
    setPropertyData(finalData);
    setEditableData(finalData);
    setCalculatedCapacity(null);
  };

  const calculateInvestment = () => {
    const total = pastureInvestment + cattleInvestment;
    const grossRevenue = propertyData.currentStockingCapacity * AVG_WEIGHT_GAIN_PER_UA * PRICE_PER_KG_LIVE_WEIGHT;
    setInvestmentAnalysis(grossRevenue - total);
  };

  const applyInvestment = async () => {
    if (investmentAnalysis === null) {
      return;
    }
    const nextData = propertyService.addHistoryItem(propertyData, {
      action: 'Registro de investimento',
      details: `Pastagem ${formatCurrency(pastureInvestment)} | Bovinos ${formatCurrency(cattleInvestment)}`,
    });
    const finalData = {
      ...nextData,
      pastureInvestmentPerHa: pastureInvestment,
      cattleInvestmentPerHa: cattleInvestment,
    };
    const result = await propertyService.updateProperty(finalData);
    if (!result.success) {
      addToast({ type: 'error', title: 'Falha ao salvar investimento', message: result.error || 'Erro ao atualizar investimento.' });
      return;
    }
    setPropertyData(finalData);
    setEditableData(finalData);
  };

  if (isBootstrapping) {
    return (
      <div className="space-y-4">
        <SkeletonLoader className="h-10 w-1/3" />
        <SkeletonLoader className="h-24 w-full" />
        <SkeletonLoader className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-slate-800">Cadastro e gestao da propriedade</h2>
          <p className="text-slate-600">Fluxos de CAR, mapa, manejo e investimento.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setActiveTab('Data')} className={`px-3 py-2 rounded ${activeTab === 'Data' ? 'bg-slate-700 text-white' : 'bg-slate-200 text-slate-700'}`}>
            Dados
          </button>
          <button onClick={() => setActiveTab('Map')} className={`px-3 py-2 rounded ${activeTab === 'Map' ? 'bg-slate-700 text-white' : 'bg-slate-200 text-slate-700'}`}>
            Mapa
          </button>
        </div>
      </div>
      {activeTab === 'Data' && (
        <div className="space-y-6">
          <section className="bg-white border border-slate-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-slate-800">Dados principais</h3>
              {!isEditing ? (
                <button onClick={() => setIsEditing(true)} className="px-3 py-2 bg-slate-700 text-white rounded text-sm">Editar</button>
              ) : (
                <button onClick={() => void saveProperty()} className="px-3 py-2 bg-emerald-600 text-white rounded text-sm">Salvar</button>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <input name="name" value={isEditing ? editableData.name : propertyData.name} onChange={handleInputChange} disabled={!isEditing} className="p-2 border rounded disabled:bg-slate-100" />
              <input name="carNumber" value={isEditing ? editableData.carNumber : propertyData.carNumber} onChange={handleInputChange} disabled={!isEditing} className="p-2 border rounded disabled:bg-slate-100" />
              <input type="number" name="totalArea" value={isEditing ? editableData.totalArea : propertyData.totalArea} onChange={handleInputChange} disabled={!isEditing} className="p-2 border rounded disabled:bg-slate-100" />
              <input type="number" step="0.01" name="currentStockingCapacity" value={isEditing ? editableData.currentStockingCapacity : propertyData.currentStockingCapacity} onChange={handleInputChange} disabled={!isEditing} className="p-2 border rounded disabled:bg-slate-100" />
              <input type="number" name="animalCount" value={isEditing ? editableData.animalCount : propertyData.animalCount} onChange={handleInputChange} disabled={!isEditing} className="p-2 border rounded disabled:bg-slate-100" />
            </div>
          </section>

          <section className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-3">
              <h3 className="font-semibold text-slate-800">Simulador de manejo</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <select value={selectedCultivar} onChange={(event) => setSelectedCultivar(event.target.value)} className="p-2 border rounded">
                  {cultivarFactors.map((item) => (
                    <option key={item.name} value={item.name}>{item.name}</option>
                  ))}
                </select>
                <select value={selectedProduct} onChange={(event) => setSelectedProduct(event.target.value)} className="p-2 border rounded">
                  {productFactors.map((item) => (
                    <option key={item.name} value={item.name}>{item.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2">
                <button onClick={handleCapacityCalc} className="px-3 py-2 bg-indigo-600 text-white rounded text-sm">Calcular</button>
                {calculatedCapacity !== null && <button onClick={() => void applyCapacity()} className="px-3 py-2 bg-emerald-600 text-white rounded text-sm">Aplicar</button>}
              </div>
              {calculatedCapacity !== null && <p className="text-sm text-slate-600">Nova lotacao: <strong>{calculatedCapacity.toFixed(2)} UA/ha</strong></p>}
            </div>

            <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-3">
              <h3 className="font-semibold text-slate-800">Investimento</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input type="number" value={pastureInvestment} onChange={(event) => setPastureInvestment(Number(event.target.value || 0))} className="p-2 border rounded" placeholder="Pastagem R$/ha" />
                <input type="number" value={cattleInvestment} onChange={(event) => setCattleInvestment(Number(event.target.value || 0))} className="p-2 border rounded" placeholder="Bovinos R$/ha" />
              </div>
              <div className="flex gap-2">
                <button onClick={calculateInvestment} className="px-3 py-2 bg-slate-700 text-white rounded text-sm">Calcular</button>
                {investmentAnalysis !== null && <button onClick={() => void applyInvestment()} className="px-3 py-2 bg-emerald-600 text-white rounded text-sm">Salvar</button>}
              </div>
              {investmentAnalysis !== null && <p className="text-sm text-slate-600">Retorno esperado: <strong>{formatCurrency(investmentAnalysis)}</strong></p>}
            </div>
          </section>

          <section className="bg-white border border-slate-200 rounded-lg p-4 space-y-3">
            <h3 className="font-semibold text-slate-800">Atividades</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
              <select value={newActivity.sector} onChange={(event) => setNewActivity((prev) => ({ ...prev, sector: event.target.value as ProductionSector, variety: '' }))} className="p-2 border rounded">
                <option value="">Setor</option>
                {Object.keys(SECTOR_VARIETIES).map((sector) => <option key={sector} value={sector}>{sector}</option>)}
              </select>
              <select value={newActivity.variety} onChange={(event) => setNewActivity((prev) => ({ ...prev, variety: event.target.value }))} className="p-2 border rounded" disabled={!newActivity.sector}>
                <option value="">Variedade</option>
                {availableVarieties.map((variety) => <option key={variety} value={variety}>{variety}</option>)}
              </select>
              <input value={newActivity.name} onChange={(event) => setNewActivity((prev) => ({ ...prev, name: event.target.value }))} className="p-2 border rounded" placeholder="Nome" />
              <div className="flex gap-2">
                <input value={newActivity.volume} onChange={(event) => setNewActivity((prev) => ({ ...prev, volume: event.target.value }))} className="p-2 border rounded flex-1" placeholder="Volume" />
                <button onClick={() => void handleSaveActivity()} className="px-3 py-2 bg-indigo-600 text-white rounded text-sm">Add</button>
              </div>
            </div>
            <div className="space-y-2">
              {activities.map((activity) => (
                <div key={activity.id} className="flex items-center justify-between p-2 border border-slate-200 rounded">
                  <div>
                    <p className="font-semibold text-slate-800">{activity.name}</p>
                    <p className="text-xs text-slate-500">{activity.type} | {activity.status} | {activity.volume}</p>
                  </div>
                  <button
                    onClick={() => {
                      setPendingDeleteActivity(activity);
                      setDeletePassword('');
                    }}
                    className="text-red-600 text-sm"
                  >
                    Excluir
                  </button>
                </div>
              ))}
            </div>
            {pendingDeleteActivity && (
              <div className="mt-3 border border-red-200 bg-red-50 rounded p-3 space-y-2">
                <p className="text-sm text-red-700">
                  Excluir atividade <strong>{pendingDeleteActivity.name}</strong> ({pendingDeleteActivity.type}).
                </p>
                <input
                  type="password"
                  value={deletePassword}
                  onChange={(event) => setDeletePassword(event.target.value)}
                  className="p-2 border rounded w-full"
                  placeholder="Senha de autorizacao"
                />
                <p className="text-xs text-red-700">Senha padrao (se nao configurada no .env): CICLO123</p>
                <div className="flex gap-2">
                  <button onClick={() => void handleDeleteActivity()} className="px-3 py-2 bg-red-600 text-white rounded text-sm">Confirmar exclusao</button>
                  <button
                    onClick={() => {
                      setPendingDeleteActivity(null);
                      setDeletePassword('');
                    }}
                    className="px-3 py-2 bg-slate-200 text-slate-700 rounded text-sm"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>
      )}

      {activeTab === 'Map' && (
        <div className="space-y-4">
          <section className="bg-white border border-slate-200 rounded-lg p-4 space-y-3">
            <h3 className="font-semibold text-slate-800">Consulta CAR</h3>
            <div className="flex flex-col md:flex-row gap-2">
              <input value={carInput} onChange={(event) => setCarInput(event.target.value)} className="p-2 border rounded flex-1" placeholder="Numero do CAR" />
              <button onClick={() => void handleSearchCAR()} className="px-3 py-2 bg-indigo-600 text-white rounded text-sm">Buscar</button>
            </div>
            {carSearchStatus === 'ERROR' && <p className="text-sm text-red-600">CAR nao encontrado.</p>}
            {carSearchStatus === 'FOUND' && sicarData && (
              <div className="text-sm text-slate-600 border border-emerald-200 bg-emerald-50 rounded p-3">
                <p><strong>Municipio:</strong> {sicarData.municipality}</p>
                <p><strong>Area:</strong> {sicarData.totalArea}</p>
                <p><strong>Status:</strong> {sicarData.status}</p>
              </div>
            )}
          </section>

          <section className="bg-white border border-slate-200 rounded-lg p-4 space-y-3">
            <h3 className="font-semibold text-slate-800">Nova divisao</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
              <input value={divisionName} onChange={(event) => setDivisionName(event.target.value)} className="p-2 border rounded" placeholder="Nome" />
              <input value={divisionLat} onChange={(event) => setDivisionLat(event.target.value)} className="p-2 border rounded" placeholder="Latitude" />
              <input value={divisionLong} onChange={(event) => setDivisionLong(event.target.value)} className="p-2 border rounded" placeholder="Longitude" />
              <button onClick={() => void handleSaveDivision()} className="px-3 py-2 bg-emerald-600 text-white rounded text-sm">Salvar</button>
            </div>
          </section>

          <PropertyMapView property={propertyData} pastures={pastures} />
        </div>
      )}
    </div>
  );
};

export default PropertyRegistrationView;
