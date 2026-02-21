import React, { useEffect, useMemo, useState } from 'react';
import { OperatorTask, OperatorRequest, Pasture, ProducerExpense } from '../../../types';
import ClipboardListIcon from '../../icons/ClipboardListIcon';
import CheckCircleIcon from '../../icons/CheckCircleIcon';
import XIcon from '../../icons/XIcon';
import MapIcon from '../../icons/MapIcon';
import MicrophoneIcon from '../../icons/MicrophoneIcon';
import DocumentTextIcon from '../../icons/DocumentTextIcon';
import ShoppingCartIcon from '../../icons/ShoppingCartIcon';
import CurrencyDollarIcon from '../../icons/CurrencyDollarIcon';
import LoadingSpinner from '../../shared/LoadingSpinner';
import { operatorService } from '../../../services/operatorService';
import { fieldOperationsService, FieldDiaryEntry } from '../../../services/fieldOperationsService';
import { useToast } from '../../../contexts/ToastContext';
import { producerOpsService } from '../../../services/producerOpsService';
import { propertyService } from '../../../services/propertyService';

const FieldOperationsView: React.FC = () => {
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = useState<'VALIDATION' | 'REQUESTS' | 'DIARY' | 'AREA'>('VALIDATION');
  const [tasks, setTasks] = useState<OperatorTask[]>([]);
  const [requests, setRequests] = useState<OperatorRequest[]>([]);
  const [diaryEntries, setDiaryEntries] = useState<FieldDiaryEntry[]>([]);
  const [pastures, setPastures] = useState<Pasture[]>([]);
  const [areaEntries, setAreaEntries] = useState<ProducerExpense[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [areaForm, setAreaForm] = useState({
    pastureId: '',
    areaHa: '',
    cost: '',
    expectedRevenue: '',
    description: '',
  });
  const [isSavingArea, setIsSavingArea] = useState(false);

  useEffect(() => {
    const loadFieldOperations = async () => {
      setIsLoading(true);
      setLoadError(null);
      try {
        const [loadedTasks, loadedRequests, loadedDiary, workspace, loadedExpenses] = await Promise.all([
          operatorService.listTasks(),
          operatorService.listRequests(),
          fieldOperationsService.listDiaryEntries(),
          propertyService.loadWorkspace(),
          producerOpsService.listExpenses(),
        ]);
        setTasks(loadedTasks);
        setRequests(loadedRequests);
        setDiaryEntries(loadedDiary);
        setPastures(workspace.pastures);
        setAreaEntries(loadedExpenses.filter((expense) => expense.relatedPastureId));
      } catch {
        setLoadError('Nao foi possivel carregar o controle operacional.');
      } finally {
        setIsLoading(false);
      }
    };

    void loadFieldOperations();
  }, []);

  const pendingTasks = useMemo(() => tasks.filter((task) => task.status === 'PENDING_REVIEW'), [tasks]);
  const completedTasks = useMemo(() => tasks.filter((task) => task.status === 'COMPLETED'), [tasks]);

  const areaEntriesSorted = useMemo(
    () => [...areaEntries].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [areaEntries]
  );

  const areaSummary = useMemo(() => {
    const totalCost = areaEntries.reduce((sum, entry) => sum + entry.amount, 0);
    const totalExpectedRevenue = areaEntries.reduce((sum, entry) => sum + Number(entry.expectedRevenue ?? 0), 0);
    const totalProfit = areaEntries.reduce((sum, entry) => sum + Number(entry.profit ?? 0), 0);
    return { totalCost, totalExpectedRevenue, totalProfit };
  }, [areaEntries]);

  const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  const pastureNameById = (pastureId?: string) => {
    if (!pastureId) return 'Nao informado';
    return pastures.find((pasture) => pasture.id === pastureId)?.name ?? pastureId;
  };

  const handleTaskAction = async (taskId: string, action: 'APPROVE' | 'REJECT') => {
    const status = action === 'APPROVE' ? 'COMPLETED' : 'REJECTED';
    const previousStatus = tasks.find((task) => task.id === taskId)?.status;
    setTasks((prev) => prev.map((task) => (task.id === taskId ? { ...task, status } : task)));
    try {
      await operatorService.updateTaskStatus(taskId, status);
      await producerOpsService.createActivity({
        title: action === 'APPROVE' ? 'Tarefa operacional aprovada' : 'Tarefa operacional rejeitada',
        details: `Task ${taskId} -> ${status}`,
        actor: 'Administrador',
        actorRole: 'ADMINISTRADOR',
      });
      addToast({ type: 'success', title: 'Tarefa atualizada', message: 'Status salvo no Firebase.' });
    } catch {
      if (previousStatus) {
        setTasks((prev) => prev.map((task) => (task.id === taskId ? { ...task, status: previousStatus } : task)));
      }
      addToast({ type: 'error', title: 'Falha ao atualizar', message: 'Nao foi possivel salvar a tarefa.' });
    }
  };

  const handleRequestAction = async (requestId: string, action: 'APPROVE' | 'REJECT') => {
    const status = action === 'APPROVE' ? 'APPROVED' : 'REJECTED';
    const previousStatus = requests.find((request) => request.id === requestId)?.status;
    setRequests((prev) => prev.map((request) => (request.id === requestId ? { ...request, status } : request)));
    try {
      await operatorService.updateRequestStatus(requestId, status);
      if (action === 'APPROVE') {
        const approvedRequest = requests.find((request) => request.id === requestId);
        if (approvedRequest) {
          await producerOpsService.registerRequestApprovalExpense({
            requestId: approvedRequest.id,
            item: approvedRequest.item,
            quantity: approvedRequest.quantity,
            actor: 'Administrador',
            role: 'ADMINISTRADOR',
          });
        }
      } else {
        await producerOpsService.createActivity({
          title: 'Solicitacao operacional rejeitada',
          details: `Request ${requestId}`,
          actor: 'Administrador',
          actorRole: 'ADMINISTRADOR',
        });
      }
      addToast({ type: 'success', title: 'Solicitacao atualizada', message: 'Status salvo no Firebase.' });
    } catch {
      if (previousStatus) {
        setRequests((prev) => prev.map((request) => (request.id === requestId ? { ...request, status: previousStatus } : request)));
      }
      addToast({ type: 'error', title: 'Falha ao atualizar', message: 'Nao foi possivel salvar a solicitacao.' });
    }
  };

  const handleSaveAreaEntry = async () => {
    if (!areaForm.pastureId || !areaForm.areaHa || !areaForm.cost || !areaForm.description.trim()) {
      addToast({
        type: 'warning',
        title: 'Dados incompletos',
        message: 'Informe talhao/pasto, area, custo e descricao do manejo.',
      });
      return;
    }

    const cost = Number(areaForm.cost);
    const expectedRevenue = Number(areaForm.expectedRevenue || 0);
    const areaHa = Number(areaForm.areaHa);
    const profit = expectedRevenue - cost;

    setIsSavingArea(true);
    try {
      const createdExpense = await producerOpsService.createExpense({
        description: areaForm.description.trim(),
        category: 'OPERACIONAL',
        amount: cost,
        source: 'ADMINISTRADOR',
        relatedPastureId: areaForm.pastureId,
        areaHa,
        expectedRevenue,
        profit,
      });

      await producerOpsService.createActivity({
        title: 'Lancamento de manejo por area',
        details: `${pastureNameById(areaForm.pastureId)} | ${areaHa.toFixed(2)} ha | custo ${formatCurrency(cost)} | lucro estimado ${formatCurrency(profit)}`,
        actor: 'Administrador',
        actorRole: 'ADMINISTRADOR',
      });

      setAreaEntries((prev) => [createdExpense, ...prev]);
      setAreaForm({ pastureId: '', areaHa: '', cost: '', expectedRevenue: '', description: '' });
      addToast({ type: 'success', title: 'Area registrada', message: 'Historico do talhao/pasto atualizado com sucesso.' });
    } catch {
      addToast({ type: 'error', title: 'Falha no lancamento', message: 'Nao foi possivel registrar o manejo por area.' });
    } finally {
      setIsSavingArea(false);
    }
  };

  if (isLoading) {
    return <LoadingSpinner text="Carregando operacoes..." />;
  }

  if (loadError) {
    return <div className="p-6 bg-red-50 text-red-700 border border-red-200 rounded-lg">{loadError}</div>;
  }

  return (
    <div className="max-w-6xl mx-auto pb-20">
      <h2 className="text-3xl font-bold text-slate-800 mb-2 flex items-center">
        <ClipboardListIcon className="h-8 w-8 mr-3 text-indigo-600" />
        Controle operacional e de equipe
      </h2>
      <p className="text-slate-600 mb-8">
        Validacao de tarefas, aprovacao de pedidos, diario dos operadores e historico por talhao/pasto.
      </p>

      <div className="flex flex-wrap gap-1 bg-slate-200 p-1 rounded-lg mb-6 w-fit">
        <button
          onClick={() => setActiveTab('VALIDATION')}
          className={`flex items-center px-4 py-2 rounded-md text-sm font-semibold transition-colors ${activeTab === 'VALIDATION' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-600 hover:bg-slate-300'}`}
        >
          <CheckCircleIcon className="h-4 w-4 mr-2" />
          Validacao de tarefas
          {pendingTasks.length > 0 && <span className="ml-2 bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">{pendingTasks.length}</span>}
        </button>
        <button
          onClick={() => setActiveTab('REQUESTS')}
          className={`flex items-center px-4 py-2 rounded-md text-sm font-semibold transition-colors ${activeTab === 'REQUESTS' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-600 hover:bg-slate-300'}`}
        >
          <ShoppingCartIcon className="h-4 w-4 mr-2" />
          Solicitacoes de compra
        </button>
        <button
          onClick={() => setActiveTab('DIARY')}
          className={`flex items-center px-4 py-2 rounded-md text-sm font-semibold transition-colors ${activeTab === 'DIARY' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-600 hover:bg-slate-300'}`}
        >
          <DocumentTextIcon className="h-4 w-4 mr-2" />
          Diario de campo
        </button>
        <button
          onClick={() => setActiveTab('AREA')}
          className={`flex items-center px-4 py-2 rounded-md text-sm font-semibold transition-colors ${activeTab === 'AREA' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-600 hover:bg-slate-300'}`}
        >
          <MapIcon className="h-4 w-4 mr-2" />
          Talhoes e pastos
        </button>
      </div>

      {activeTab === 'VALIDATION' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-fade-in">
          <div>
            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center">
              <span className="w-3 h-3 bg-amber-500 rounded-full mr-2"></span>
              Aguardando validacao
            </h3>
            {pendingTasks.length === 0 ? (
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-8 text-center text-slate-500">
                Nenhuma tarefa pendente de revisao.
              </div>
            ) : (
              <div className="space-y-4">
                {pendingTasks.map((task) => (
                  <div key={task.id} className="bg-white p-5 rounded-lg shadow-md border-l-4 border-amber-500">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h4 className="font-bold text-slate-800 text-lg">{task.title}</h4>
                        <p className="text-sm text-slate-500">
                          Executado por: <span className="font-semibold">{task.executor}</span>
                        </p>
                        <p className="text-xs text-slate-400">{task.timestamp}</p>
                      </div>
                      <span className="bg-amber-100 text-amber-800 text-xs px-2 py-1 rounded font-bold uppercase">
                        Revisar
                      </span>
                    </div>

                    <div className="bg-slate-50 p-3 rounded mb-4 border border-slate-100">
                      <p className="text-sm text-slate-700 italic">"{task.details}"</p>
                      <div className="flex items-center mt-2 text-xs text-slate-500 font-mono">
                        <MapIcon className="h-3 w-3 mr-1" />
                        GPS: {task.geolocation}
                      </div>
                    </div>

                    {task.proofType === 'PHOTO' && (
                      <div className="mb-4">
                        {task.proofUrl ? (
                          <a href={task.proofUrl} target="_blank" rel="noreferrer" className="block">
                            <img src={task.proofUrl} alt={`Comprovacao da tarefa ${task.id}`} className="w-full h-32 object-cover rounded-lg border border-slate-200" />
                          </a>
                        ) : (
                          <div className="w-full h-32 bg-slate-100 rounded-lg flex items-center justify-center text-slate-500 border border-slate-200 text-xs">
                            Sem comprovacao fotografica anexada
                          </div>
                        )}
                      </div>
                    )}

                    <div className="flex gap-3">
                      <button onClick={() => handleTaskAction(task.id, 'APPROVE')} className="flex-1 py-2 bg-emerald-500 text-white font-bold rounded hover:bg-emerald-600 transition-colors flex justify-center items-center">
                        <CheckCircleIcon className="h-5 w-5 mr-2" />
                        Aprovar execucao
                      </button>
                      <button onClick={() => handleTaskAction(task.id, 'REJECT')} className="px-4 py-2 bg-red-100 text-red-700 font-bold rounded hover:bg-red-200 transition-colors flex justify-center items-center">
                        <XIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center">
              <span className="w-3 h-3 bg-emerald-500 rounded-full mr-2"></span>
              Historico recente (aprovados)
            </h3>
            <div className="space-y-3">
              {completedTasks.map((task) => (
                <div key={task.id} className="bg-white p-4 rounded-lg shadow-sm border border-slate-100 flex justify-between items-center opacity-75 hover:opacity-100 transition-opacity">
                  <div>
                    <p className="font-bold text-slate-700">{task.title}</p>
                    <p className="text-xs text-slate-500">
                      {task.executor} | {task.timestamp}
                    </p>
                  </div>
                  <span className="text-emerald-600">
                    <CheckCircleIcon className="h-6 w-6" />
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'REQUESTS' && (
        <div className="animate-fade-in bg-white rounded-lg shadow-md p-6">
          <h3 className="text-xl font-bold text-slate-800 mb-6">Central de aprovacao de pedidos</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-100 text-xs text-slate-700 uppercase">
                <tr>
                  <th className="p-4">Item solicitado</th>
                  <th className="p-4">Qtd</th>
                  <th className="p-4">Solicitante</th>
                  <th className="p-4">Data</th>
                  <th className="p-4">Prioridade</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Acao</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((request) => (
                  <tr key={request.id} className="border-b hover:bg-slate-50">
                    <td className="p-4 font-bold text-slate-800">{request.item}</td>
                    <td className="p-4">{request.quantity}</td>
                    <td className="p-4 text-slate-600">{request.requester}</td>
                    <td className="p-4 text-slate-500">{request.date}</td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded text-xs font-bold ${request.priority === 'HIGH' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'}`}>
                        {request.priority}
                      </span>
                    </td>
                    <td className="p-4">
                      <span
                        className={`px-2 py-1 rounded text-xs font-bold ${
                          request.status === 'APPROVED'
                            ? 'bg-green-100 text-green-800'
                            : request.status === 'REJECTED'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {request.status}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      {request.status === 'PENDING' && (
                        <div className="flex justify-end gap-2">
                          <button onClick={() => handleRequestAction(request.id, 'APPROVE')} className="text-green-600 hover:bg-green-50 p-1 rounded font-bold text-xs uppercase border border-green-200">
                            Aprovar
                          </button>
                          <button onClick={() => handleRequestAction(request.id, 'REJECT')} className="text-red-600 hover:bg-red-50 p-1 rounded font-bold text-xs uppercase border border-red-200">
                            Negar
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'DIARY' && (
        <div className="animate-fade-in space-y-6">
          <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg">
            <h4 className="font-bold text-blue-800">Transcricao automatica de audio</h4>
            <p className="text-sm text-blue-700">Relatos gravados pelos operadores sao convertidos em texto pela IA do sistema.</p>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {diaryEntries.map((entry) => (
              <div key={entry.id} className="bg-white p-6 rounded-lg shadow-md border border-slate-200">
                <div className="flex items-center mb-3">
                  <div className={`p-2 rounded-full mr-3 ${entry.type === 'AUDIO' ? 'bg-indigo-100' : 'bg-emerald-100'}`}>
                    {entry.type === 'AUDIO' ? (
                      <MicrophoneIcon className="h-5 w-5 text-indigo-600" />
                    ) : (
                      <DocumentTextIcon className="h-5 w-5 text-emerald-600" />
                    )}
                  </div>
                  <div>
                    <p className="font-bold text-slate-800">
                      {entry.author} ({entry.role})
                    </p>
                    <p className="text-xs text-slate-500">
                      {entry.date} | {entry.location}
                    </p>
                  </div>
                </div>
                <div className="bg-slate-50 p-4 rounded border border-slate-100">
                  <p className="text-slate-700 italic">"{entry.transcript}"</p>
                </div>
                {entry.aiAction && (
                  <div className="mt-3 flex gap-2">
                    <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">Acao IA: {entry.aiAction}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'AREA' && (
        <div className="animate-fade-in space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-lg border border-slate-200">
              <p className="text-xs uppercase font-bold text-slate-500">Custo total por area</p>
              <p className="text-2xl font-bold text-red-600">{formatCurrency(areaSummary.totalCost)}</p>
            </div>
            <div className="bg-white p-4 rounded-lg border border-slate-200">
              <p className="text-xs uppercase font-bold text-slate-500">Receita esperada</p>
              <p className="text-2xl font-bold text-indigo-600">{formatCurrency(areaSummary.totalExpectedRevenue)}</p>
            </div>
            <div className="bg-white p-4 rounded-lg border border-slate-200">
              <p className="text-xs uppercase font-bold text-slate-500">Lucro estimado por area</p>
              <p className={`text-2xl font-bold ${areaSummary.totalProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                {formatCurrency(areaSummary.totalProfit)}
              </p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md border border-slate-200">
            <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center">
              <CurrencyDollarIcon className="h-5 w-5 mr-2 text-indigo-600" />
              Lancamento de manejo por talhao/pasto
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              <select value={areaForm.pastureId} onChange={(event) => setAreaForm((prev) => ({ ...prev, pastureId: event.target.value }))} className="p-2 border border-slate-300 rounded-md bg-white">
                <option value="">Talhao/Pasto</option>
                {pastures.map((pasture) => (
                  <option key={pasture.id} value={pasture.id}>
                    {pasture.name}
                  </option>
                ))}
              </select>
              <input type="number" value={areaForm.areaHa} onChange={(event) => setAreaForm((prev) => ({ ...prev, areaHa: event.target.value }))} className="p-2 border border-slate-300 rounded-md" placeholder="Area (ha)" min="0" step="0.01" />
              <input type="number" value={areaForm.cost} onChange={(event) => setAreaForm((prev) => ({ ...prev, cost: event.target.value }))} className="p-2 border border-slate-300 rounded-md" placeholder="Custo (R$)" min="0" step="0.01" />
              <input type="number" value={areaForm.expectedRevenue} onChange={(event) => setAreaForm((prev) => ({ ...prev, expectedRevenue: event.target.value }))} className="p-2 border border-slate-300 rounded-md" placeholder="Receita esperada (R$)" min="0" step="0.01" />
              <input value={areaForm.description} onChange={(event) => setAreaForm((prev) => ({ ...prev, description: event.target.value }))} className="p-2 border border-slate-300 rounded-md" placeholder="Descricao do manejo" />
            </div>
            <div className="mt-4">
              <button onClick={() => void handleSaveAreaEntry()} disabled={isSavingArea} className="px-4 py-2 bg-emerald-600 text-white rounded-md font-semibold hover:bg-emerald-700 disabled:opacity-60">
                {isSavingArea ? 'Salvando...' : 'Registrar custo por area'}
              </button>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-200">
              <h3 className="text-lg font-bold text-slate-800">Historico por talhao/pasto</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-slate-700 uppercase bg-slate-100">
                  <tr>
                    <th className="px-4 py-3">Data</th>
                    <th className="px-4 py-3">Talhao/Pasto</th>
                    <th className="px-4 py-3">Descricao</th>
                    <th className="px-4 py-3">Area (ha)</th>
                    <th className="px-4 py-3">Custo</th>
                    <th className="px-4 py-3">Receita esperada</th>
                    <th className="px-4 py-3">Lucro estimado</th>
                  </tr>
                </thead>
                <tbody>
                  {areaEntriesSorted.length === 0 && (
                    <tr>
                      <td className="px-4 py-6 text-slate-500" colSpan={7}>
                        Nenhum lancamento por area registrado.
                      </td>
                    </tr>
                  )}
                  {areaEntriesSorted.map((entry) => (
                    <tr key={entry.id} className="border-b last:border-b-0 hover:bg-slate-50">
                      <td className="px-4 py-3">{entry.date}</td>
                      <td className="px-4 py-3 font-semibold text-slate-800">{pastureNameById(entry.relatedPastureId)}</td>
                      <td className="px-4 py-3">{entry.description}</td>
                      <td className="px-4 py-3">{entry.areaHa?.toFixed(2) ?? '-'}</td>
                      <td className="px-4 py-3">{formatCurrency(entry.amount)}</td>
                      <td className="px-4 py-3">{formatCurrency(Number(entry.expectedRevenue ?? 0))}</td>
                      <td className={`px-4 py-3 font-semibold ${Number(entry.profit ?? 0) >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                        {formatCurrency(Number(entry.profit ?? 0))}
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

export default FieldOperationsView;
