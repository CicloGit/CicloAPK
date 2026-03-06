import React, { useEffect, useMemo, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { OperationalActionType, ProductionProject } from '../../types';
import ArrowLeftIcon from '../icons/ArrowLeftIcon';
import { useToast } from '../../contexts/ToastContext';
import { useApp } from '../../contexts/AppContext';
import LoadingSpinner from '../shared/LoadingSpinner';
import { propertyService } from '../../services/propertyService';
import { operationalActionService } from '../../services/operationalActionService';

interface ActionField {
  key: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'textarea' | 'select';
  placeholder?: string;
  required?: boolean;
  options?: string[];
  readOnly?: boolean;
  resolveValue?: (project: ProductionProject | null) => string;
}

const actionDetails: Record<OperationalActionType, { title: string; description: string }> = {
  registerPlanting: { title: 'Registrar Plantio', description: 'Insira os detalhes do plantio realizado.' },
  soilAnalysis: { title: 'Analise de Solo', description: 'Anexe os resultados da analise de solo.' },
  planHarvest: { title: 'Planejar Colheita', description: 'Defina as datas e recursos para a colheita.' },
  sellCrop: { title: 'Vender Safra', description: 'Crie uma nova oferta de venda para a safra.' },
  registerAnimal: { title: 'Registrar Novo Animal', description: 'Adicione um novo animal ao rebanho do projeto.' },
  applyHealthProtocol: {
    title: 'Aplicar Protocolo Sanitario',
    description: 'Registre a aplicacao de um protocolo sanitario.',
  },
  registerWeight: { title: 'Registrar Pesagem', description: 'Insira os dados de uma nova pesagem de lote.' },
  sellBatch: { title: 'Vender Lote', description: 'Inicie o processo de venda de um lote de animais.' },
  waterAnalysis: {
    title: 'Analise de Agua',
    description: 'Registre os parametros de qualidade da agua (pH, O2, Amonia).',
  },
  hiveInspection: {
    title: 'Inspecao de Colmeia',
    description: 'Registre o status, saude e producao da colmeia.',
  },
  timberMeasure: {
    title: 'Medicao Florestal',
    description: 'Registre o diametro (DAP) e altura das arvores.',
  },
  dailyCollection: {
    title: 'Coleta Diaria',
    description: 'Informe a quantidade coletada hoje (ovos, frutos, etc).',
  },
  registerIrrigation: {
    title: 'Registrar Irrigacao',
    description: 'Informe o volume de agua e metodo aplicado.',
  },
  registerMilkVolume: {
    title: 'Registrar Ordenha',
    description: 'Informe o volume total de leite coletado na ordenha.',
  },
  pruning: {
    title: 'Registro de Poda/Manejo',
    description: 'Descreva o manejo realizado nas plantas.',
  },
};

const actionFieldCatalog: Record<OperationalActionType, ActionField[]> = {
  registerPlanting: [
    { key: 'area', label: 'Talhao/Area', type: 'text', placeholder: 'Ex: Talhao 05' },
    {
      key: 'culture',
      label: 'Cultura',
      type: 'text',
      readOnly: true,
      resolveValue: (project) => project?.name.split(' ')[0] ?? '',
    },
    { key: 'date', label: 'Data do Plantio', type: 'date' },
    { key: 'seedVariety', label: 'Cultivar/Semente', type: 'text', placeholder: 'Ex: BRS 1003' },
  ],
  soilAnalysis: [
    { key: 'samplingPoint', label: 'Ponto de Coleta', type: 'text', placeholder: 'Ex: Talhao 05 - Norte' },
    { key: 'collectionDate', label: 'Data da Coleta', type: 'date' },
    { key: 'ph', label: 'pH', type: 'number', placeholder: 'Ex: 5.8' },
    { key: 'organicMatter', label: 'Materia Organica (%)', type: 'number', placeholder: 'Ex: 2.1' },
    { key: 'labReference', label: 'Laudo/Referencia', type: 'text', placeholder: 'Codigo do laudo' },
  ],
  planHarvest: [
    { key: 'harvestDate', label: 'Data Prevista', type: 'date' },
    { key: 'expectedVolume', label: 'Volume Previsto', type: 'number', placeholder: 'Quantidade' },
    { key: 'unit', label: 'Unidade', type: 'text', placeholder: 'Ex: sc, kg, t' },
    { key: 'destination', label: 'Destino', type: 'text', placeholder: 'Armazem, cooperativa, cliente' },
  ],
  sellCrop: [
    { key: 'batch', label: 'Lote', type: 'text', placeholder: 'Ex: Lote Safra 2026' },
    { key: 'quantity', label: 'Quantidade', type: 'number', placeholder: 'Quantidade disponivel' },
    { key: 'unitPrice', label: 'Preco Unitario (R$)', type: 'number', placeholder: 'Ex: 132.50' },
    { key: 'channel', label: 'Canal de Venda', type: 'text', placeholder: 'Ex: Atacado direto' },
  ],
  registerAnimal: [
    { key: 'id', label: 'ID do Animal (Brinco/RFID)', type: 'text' },
    {
      key: 'category',
      label: 'Categoria',
      type: 'select',
      options: ['Bezerro', 'Novilha', 'Matriz', 'Touro', 'Terminado'],
    },
    { key: 'pasture', label: 'Pasto de Origem', type: 'text', placeholder: 'Ex: Piquete A1' },
    { key: 'entryDate', label: 'Data de Entrada', type: 'date' },
  ],
  applyHealthProtocol: [
    { key: 'target', label: 'Lote ou IDs dos Animais', type: 'text', placeholder: 'Ex: Lote 03 ou M-001, M-002' },
    { key: 'protocol', label: 'Protocolo Aplicado', type: 'text', placeholder: 'Ex: Vacina IFT' },
    { key: 'date', label: 'Data da Aplicacao', type: 'date' },
    { key: 'responsible', label: 'Responsavel Tecnico', type: 'text', placeholder: 'Nome do tecnico' },
  ],
  registerWeight: [
    { key: 'target', label: 'Lote/Animal', type: 'text', placeholder: 'Ex: Lote 12' },
    { key: 'weightKg', label: 'Peso (kg)', type: 'number', placeholder: 'Ex: 412.7' },
    { key: 'date', label: 'Data da Pesagem', type: 'date' },
    { key: 'method', label: 'Metodo', type: 'text', placeholder: 'Balanca fixa, curral, etc' },
  ],
  sellBatch: [
    { key: 'batchId', label: 'Lote', type: 'text', placeholder: 'Ex: ENG-2026-01' },
    { key: 'headCount', label: 'Quantidade de Cabecas', type: 'number', placeholder: 'Ex: 45' },
    { key: 'averageWeightKg', label: 'Peso Medio (kg)', type: 'number', placeholder: 'Ex: 495' },
    { key: 'reservePrice', label: 'Preco de Reserva (R$)', type: 'number', placeholder: 'Ex: 210000' },
  ],
  waterAnalysis: [
    { key: 'source', label: 'Fonte/Reservatorio', type: 'text', placeholder: 'Ex: Tanque 2' },
    { key: 'collectionDate', label: 'Data da Coleta', type: 'date' },
    { key: 'ph', label: 'pH', type: 'number', placeholder: 'Ex: 7.2' },
    { key: 'oxygen', label: 'O2 Dissolvido (mg/L)', type: 'number', placeholder: 'Ex: 5.5' },
    { key: 'ammonia', label: 'Amonia (mg/L)', type: 'number', placeholder: 'Ex: 0.08' },
  ],
  hiveInspection: [
    { key: 'hiveId', label: 'Colmeia', type: 'text', placeholder: 'Ex: H-07' },
    { key: 'inspectionDate', label: 'Data da Inspecao', type: 'date' },
    {
      key: 'queenStatus',
      label: 'Status da Rainha',
      type: 'select',
      options: ['Ativa', 'Ausente', 'Substituicao necessaria'],
    },
    { key: 'populationLevel', label: 'Nivel Populacional', type: 'text', placeholder: 'Ex: Alto' },
    { key: 'notes', label: 'Observacoes', type: 'textarea', required: false, placeholder: 'Detalhes tecnicos' },
  ],
  timberMeasure: [
    { key: 'plot', label: 'Talhao/Parcela', type: 'text', placeholder: 'Ex: Parcela F12' },
    { key: 'dapCm', label: 'DAP medio (cm)', type: 'number', placeholder: 'Ex: 32.4' },
    { key: 'heightM', label: 'Altura media (m)', type: 'number', placeholder: 'Ex: 18.1' },
    { key: 'treeCount', label: 'Arvores avaliadas', type: 'number', placeholder: 'Ex: 120' },
  ],
  dailyCollection: [
    { key: 'product', label: 'Produto', type: 'text', placeholder: 'Ex: Ovos, frutas, mel' },
    { key: 'date', label: 'Data da Coleta', type: 'date' },
    { key: 'quantity', label: 'Quantidade', type: 'number', placeholder: 'Ex: 850' },
    { key: 'unit', label: 'Unidade', type: 'text', placeholder: 'Ex: kg, bandejas, litros' },
  ],
  registerIrrigation: [
    { key: 'area', label: 'Area irrigada', type: 'text', placeholder: 'Ex: Talhao 03' },
    { key: 'method', label: 'Metodo', type: 'text', placeholder: 'Ex: Gotejamento' },
    { key: 'volume', label: 'Volume (m3)', type: 'number', placeholder: 'Ex: 120' },
    { key: 'date', label: 'Data', type: 'date' },
  ],
  registerMilkVolume: [
    { key: 'shift', label: 'Turno', type: 'select', options: ['Manha', 'Tarde', 'Noite'] },
    { key: 'date', label: 'Data da Ordenha', type: 'date' },
    { key: 'volumeLiters', label: 'Volume (L)', type: 'number', placeholder: 'Ex: 680' },
    { key: 'tankId', label: 'Tanque', type: 'text', placeholder: 'Ex: TK-04' },
  ],
  pruning: [
    { key: 'area', label: 'Area/Talhao', type: 'text', placeholder: 'Ex: Pomar Sul' },
    { key: 'date', label: 'Data', type: 'date' },
    {
      key: 'pruningType',
      label: 'Tipo de Poda',
      type: 'select',
      options: ['Formacao', 'Producao', 'Sanitaria', 'Limpeza'],
    },
    { key: 'residueDestination', label: 'Destino dos Residuos', type: 'text', placeholder: 'Ex: Compostagem' },
  ],
};

const OperationalActionView: React.FC = () => {
  const { addToast } = useToast();
  const { currentAction: actionType, selectedProductionId: projectId, setCurrentAction } = useApp();
  const navigate = useNavigate();
  const [project, setProject] = useState<ProductionProject | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState<Record<string, string>>({});

  if (!actionType || !projectId) {
    return <Navigate to="/dashboard" replace />;
  }

  const details = actionDetails[actionType];
  const fields = actionFieldCatalog[actionType];

  const resolvedFieldValues = useMemo(
    () =>
      fields.reduce<Record<string, string>>((acc, field) => {
        if (field.readOnly && field.resolveValue) {
          acc[field.key] = field.resolveValue(project);
          return acc;
        }
        acc[field.key] = formData[field.key] ?? '';
        return acc;
      }, {}),
    [fields, formData, project]
  );

  useEffect(() => {
    const loadProject = async () => {
      setIsLoading(true);
      setLoadError(null);
      try {
        const projects = await propertyService.listProductionProjects();
        const found = projects.find((item: ProductionProject) => item.id === projectId) ?? null;
        setProject(found);
      } catch {
        setLoadError('Nao foi possivel carregar o projeto selecionado.');
      } finally {
        setIsLoading(false);
      }
    };

    void loadProject();
  }, [projectId]);

  const onCancel = () => {
    setCurrentAction(null);
    navigate(-1);
  };

  const handleInputChange = (key: string, value: string) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleConfirm = async () => {
    const missingRequired = fields
      .filter((field) => field.required !== false)
      .filter((field) => String(resolvedFieldValues[field.key] ?? '').trim().length === 0)
      .map((field) => field.label);

    if (missingRequired.length > 0) {
      addToast({
        type: 'warning',
        title: 'Dados Incompletos',
        message: `Preencha os campos obrigatorios: ${missingRequired.join(', ')}.`,
      });
      return;
    }

    setIsSaving(true);
    try {
      await operationalActionService.createAction({
        projectId,
        actionType,
        formData: resolvedFieldValues,
      });
      addToast({
        type: 'success',
        title: 'Acao Registrada',
        message: `${details.title} salvo com sucesso no projeto.`,
      });
      setCurrentAction(null);
      navigate(-1);
    } catch {
      addToast({ type: 'error', title: 'Falha ao Salvar', message: 'Nao foi possivel registrar a acao agora.' });
    } finally {
      setIsSaving(false);
    }
  };

  const renderField = (field: ActionField) => {
    const value = resolvedFieldValues[field.key] ?? '';

    if (field.type === 'textarea') {
      return (
        <textarea
          value={value}
          onChange={(event) => handleInputChange(field.key, event.target.value)}
          className="mt-1 block w-full p-2 border border-slate-300 rounded-md"
          rows={3}
          placeholder={field.placeholder}
          readOnly={field.readOnly}
        />
      );
    }

    if (field.type === 'select') {
      return (
        <select
          value={value}
          onChange={(event) => handleInputChange(field.key, event.target.value)}
          className="mt-1 block w-full p-2 border border-slate-300 rounded-md"
          disabled={field.readOnly}
        >
          <option value="">Selecione...</option>
          {(field.options ?? []).map((option) => (
            <option key={`${field.key}-${option}`} value={option}>
              {option}
            </option>
          ))}
        </select>
      );
    }

    return (
      <input
        value={value}
        onChange={(event) => handleInputChange(field.key, event.target.value)}
        type={field.type}
        className={`mt-1 block w-full p-2 border border-slate-300 rounded-md ${field.readOnly ? 'bg-slate-100' : ''}`}
        placeholder={field.placeholder}
        readOnly={field.readOnly}
      />
    );
  };

  if (isLoading) {
    return <LoadingSpinner text="Carregando acao..." />;
  }

  if (loadError) {
    return <div className="p-6 bg-red-50 text-red-700 border border-red-200 rounded-lg">{loadError}</div>;
  }

  return (
    <div className="max-w-4xl mx-auto">
      <button onClick={onCancel} className="flex items-center text-sm font-semibold text-slate-600 hover:text-slate-800 mb-4">
        <ArrowLeftIcon className="h-4 w-4 mr-2" />
        Voltar ao Painel do Produtor
      </button>
      <div className="bg-white p-8 rounded-lg shadow-md">
        <h2 className="text-3xl font-bold text-slate-800 mb-2">{details.title}</h2>
        <p className="text-slate-600 mb-1">
          Projeto: <span className="font-semibold text-indigo-700">{project?.name ?? 'Nao localizado'}</span>
        </p>
        <p className="text-slate-600 mb-8">{details.description}</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {fields.map((field) => (
            <div key={field.key} className={field.type === 'textarea' ? 'md:col-span-2' : ''}>
              <label className="block text-sm font-medium text-slate-700">
                {field.label}
                {field.required !== false ? ' *' : ''}
              </label>
              {renderField(field)}
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-4">
          <button onClick={onCancel} className="px-6 py-2 text-sm font-semibold text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200">
            Cancelar
          </button>
          <button onClick={handleConfirm} disabled={isSaving} className="px-6 py-2 text-sm font-semibold text-white bg-emerald-500 rounded-lg hover:bg-emerald-600 shadow-md disabled:opacity-60">
            {isSaving ? 'Salvando...' : 'Confirmar Acao'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default OperationalActionView;
