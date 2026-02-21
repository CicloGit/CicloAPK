import React, { useEffect, useMemo, useState } from 'react';
import { StockMovement, InventoryItem } from '../../../types';
import { CubeIcon } from '../../icons/CubeIcon';
import PlusCircleIcon from '../../icons/PlusCircleIcon';
import ExclamationIcon from '../../icons/ExclamationIcon';
import CheckCircleIcon from '../../icons/CheckCircleIcon';
import LockClosedIcon from '../../icons/LockClosedIcon';
import DocumentTextIcon from '../../icons/DocumentTextIcon';
import XIcon from '../../icons/XIcon';
import { stockService } from '../../../services/stockService';
import { storageService } from '../../../services/storageService';
import { useToast } from '../../../contexts/ToastContext';
import { useApp } from '../../../contexts/AppContext';
import { Validators } from '../../../lib/validators';
import LoadingButton from '../../shared/LoadingButton';
import InlineError from '../../shared/InlineError';
import LoadingSpinner from '../../shared/LoadingSpinner';

const INVENTORY_CATEGORIES: InventoryItem['category'][] = [
  'Insumo',
  'Consumivel',
  'Medicamento',
  'Ferramenta',
  'Bem Patrimonial',
  'Outro',
];

const StockView: React.FC = () => {
  const { addToast } = useToast();
  const { currentUser } = useApp();

  const [activeTab, setActiveTab] = useState<'INVENTORY' | 'INBOUND' | 'OUTBOUND'>('INVENTORY');
  const [searchTerm, setSearchTerm] = useState('');
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [isCreatingItem, setIsCreatingItem] = useState(false);
  const [newItem, setNewItem] = useState({
    name: '',
    category: 'Consumivel' as InventoryItem['category'],
    quantity: '',
    unit: '',
    minLevel: '',
    location: '',
    unitCost: '',
    assetTag: '',
  });

  const [newInbound, setNewInbound] = useState({
    itemId: '',
    quantity: '',
    invoiceNumber: '',
    reason: '',
  });
  const [isLaunchingInbound, setIsLaunchingInbound] = useState(false);

  const [isReportingLoss, setIsReportingLoss] = useState(false);
  const [lossItem, setLossItem] = useState('');
  const [lossQty, setLossQty] = useState('');
  const [lossReason, setLossReason] = useState('');
  const [lossPhoto, setLossPhoto] = useState<File | null>(null);
  const [isSubmittingLoss, setIsSubmittingLoss] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [isConfirmingEntry, setIsConfirmingEntry] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [invoiceNumber, setInvoiceNumber] = useState('');

  const filteredItems = useMemo(
    () =>
      inventory.filter(
        (item) =>
          item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.location.toLowerCase().includes(searchTerm.toLowerCase())
      ),
    [inventory, searchTerm]
  );

  const totalInventoryValue = useMemo(
    () => inventory.reduce((sum, item) => sum + item.quantity * Number(item.unitCost ?? 0), 0),
    [inventory]
  );

  const formattedCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  const loadStockData = async () => {
    setIsLoading(true);
    try {
      const [inventoryData, movementData] = await Promise.all([stockService.listInventory(), stockService.listMovements()]);
      setInventory(inventoryData);
      setMovements(movementData);
    } catch {
      addToast({ type: 'error', title: 'Falha de carga', message: 'Nao foi possivel carregar os dados de estoque.' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadStockData();
  }, []);

  const handleCreateItem = async () => {
    if (!newItem.name.trim() || !newItem.unit.trim() || !newItem.location.trim()) {
      addToast({ type: 'warning', title: 'Dados incompletos', message: 'Informe nome, unidade e localizacao.' });
      return;
    }

    setIsCreatingItem(true);
    try {
      const created = await stockService.createInventoryItem({
        name: newItem.name.trim(),
        category: newItem.category,
        quantity: Number(newItem.quantity || 0),
        unit: newItem.unit.trim(),
        minLevel: Number(newItem.minLevel || 0),
        location: newItem.location.trim(),
        unitCost: newItem.unitCost ? Number(newItem.unitCost) : undefined,
        assetTag: newItem.assetTag.trim() || undefined,
      });
      setInventory((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
      setNewItem({
        name: '',
        category: 'Consumivel',
        quantity: '',
        unit: '',
        minLevel: '',
        location: '',
        unitCost: '',
        assetTag: '',
      });
      addToast({ type: 'success', title: 'Item cadastrado', message: 'Cadastro de estoque salvo no Firebase.' });
    } catch {
      addToast({ type: 'error', title: 'Falha ao cadastrar', message: 'Nao foi possivel criar o item de estoque.' });
    } finally {
      setIsCreatingItem(false);
    }
  };

  const handleLaunchInbound = async () => {
    if (!newInbound.itemId || !newInbound.quantity) {
      addToast({ type: 'warning', title: 'Dados incompletos', message: 'Selecione item e quantidade.' });
      return;
    }

    const selected = inventory.find((item) => item.id === newInbound.itemId);
    if (!selected) {
      addToast({ type: 'error', title: 'Item invalido', message: 'Item de estoque nao encontrado.' });
      return;
    }

    setIsLaunchingInbound(true);
    try {
      const requester = currentUser?.name ? `${currentUser.name} (${currentUser.role})` : 'Usuario autenticado';
      const createdMovement = await stockService.registerInboundPurchase({
        itemId: selected.id,
        itemName: selected.name,
        quantity: Number(newInbound.quantity),
        unit: selected.unit,
        requester,
        invoiceNumber: newInbound.invoiceNumber.trim() || undefined,
        reason: newInbound.reason.trim() || undefined,
      });

      setMovements((prev) => [createdMovement, ...prev]);
      if (createdMovement.status === 'COMPLETED') {
        await loadStockData();
      }

      setNewInbound({ itemId: '', quantity: '', invoiceNumber: '', reason: '' });
      addToast({
        type: 'success',
        title: 'Entrada registrada',
        message:
          createdMovement.status === 'COMPLETED'
            ? 'Entrada com NF confirmada e saldo atualizado.'
            : 'Entrada criada aguardando confirmacao de NF.',
      });
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Falha ao registrar entrada',
        message: error instanceof Error ? error.message : 'Nao foi possivel registrar a entrada.',
      });
    } finally {
      setIsLaunchingInbound(false);
    }
  };

  const handleConfirmEntry = async (id: string) => {
    if (!invoiceNumber) {
      addToast({ type: 'warning', title: 'Atencao', message: 'Numero da Nota Fiscal e obrigatorio para auditoria.' });
      return;
    }

    setConfirmingId(id);
    const result = await stockService.confirmInboundEntry(id, invoiceNumber);

    if (result.success) {
      setMovements((prev) => prev.map((m) => (m.id === id ? { ...m, status: 'COMPLETED', invoiceNumber } : m)));
      await loadStockData();
      setIsConfirmingEntry(null);
      setInvoiceNumber('');
      addToast({ type: 'success', title: 'Entrada confirmada', message: 'Estoque atualizado e NF registrada.' });
    } else {
      addToast({ type: 'error', title: 'Falha na confirmacao', message: result.message || 'Nao foi possivel confirmar a entrada.' });
    }
    setConfirmingId(null);
  };

  const handleReportLoss = async () => {
    setFormError(null);
    setIsSubmittingLoss(true);

    const validation = Validators.stockMovement({
      itemId: lossItem,
      quantity: lossQty,
      type: 'OUTBOUND_LOSS',
      reason: lossReason,
      hasPhoto: !!lossPhoto,
    });

    if (!validation.success) {
      setFormError(validation.error ?? 'Dados de entrada invalidos.');
      setIsSubmittingLoss(false);
      return;
    }

    if (!lossPhoto) {
      setFormError('Foto da perda obrigatoria para auditoria.');
      setIsSubmittingLoss(false);
      return;
    }

    const tenantId = currentUser?.tenantId;
    if (!tenantId) {
      setFormError('Tenant do usuario nao identificado.');
      setIsSubmittingLoss(false);
      return;
    }

    let proofUrl = '';
    try {
      proofUrl = await storageService.uploadStockLossProof(lossPhoto, tenantId, lossItem || 'stock-loss');
    } catch {
      setFormError('Falha ao enviar evidencia para o Storage.');
      setIsSubmittingLoss(false);
      return;
    }

    const requester = currentUser?.name ? `${currentUser.name} (${currentUser.role})` : 'Usuario autenticado';
    const result = await stockService.registerStockUsage({
      itemId: lossItem,
      quantity: Number(lossQty),
      reason: lossReason,
      proofUrl,
      requester,
    });

    if (result.success && result.newMovement) {
      setMovements((prev) => [result.newMovement!, ...prev]);
      await loadStockData();
      setIsReportingLoss(false);
      setLossItem('');
      setLossQty('');
      setLossReason('');
      setLossPhoto(null);
      addToast({ type: 'success', title: 'Baixa registrada', message: 'Perda auditada e registrada com sucesso.' });
    } else {
      setFormError(result.message || 'Ocorreu um erro na operacao.');
    }
    setIsSubmittingLoss(false);
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setLossPhoto(e.target.files[0]);
    }
  };

  if (isLoading) {
    return <LoadingSpinner text="Carregando estoque..." />;
  }

  return (
    <div>
      <h2 className="text-3xl font-bold text-slate-800 mb-2">Controle de Estoque e Patrimonio</h2>
      <p className="text-slate-600 mb-8">Cadastre consumiveis, bens e aquisicoes com rastreio por localizacao, NF e auditoria.</p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-md flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-500">Itens Monitorados</p>
            <p className="text-2xl font-bold text-slate-800">{inventory.length}</p>
          </div>
          <CubeIcon className="h-8 w-8 text-blue-500" />
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-500">Valor em Estoque (real)</p>
            <p className="text-2xl font-bold text-emerald-600">{formattedCurrency(totalInventoryValue)}</p>
          </div>
          <span className="text-2xl">R$</span>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md flex items-center justify-between border-l-4 border-orange-500">
          <div>
            <p className="text-sm text-slate-500">Alertas de Reposicao</p>
            <p className="text-2xl font-bold text-orange-600">{inventory.filter((i) => i.quantity <= i.minLevel).length}</p>
          </div>
          <ExclamationIcon className="h-8 w-8 text-orange-500" />
        </div>
      </div>

      <div className="flex space-x-1 bg-slate-200 p-1 rounded-lg mb-6 w-fit">
        <button
          onClick={() => setActiveTab('INVENTORY')}
          className={`flex items-center px-4 py-2 rounded-md text-sm font-semibold transition-colors ${
            activeTab === 'INVENTORY' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-600 hover:bg-slate-300'
          }`}
        >
          <CubeIcon className="h-4 w-4 mr-2" />
          Inventario
        </button>
        <button
          onClick={() => setActiveTab('INBOUND')}
          className={`flex items-center px-4 py-2 rounded-md text-sm font-semibold transition-colors ${
            activeTab === 'INBOUND' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-600 hover:bg-slate-300'
          }`}
        >
          <PlusCircleIcon className="h-4 w-4 mr-2" />
          Entradas
        </button>
        <button
          onClick={() => setActiveTab('OUTBOUND')}
          className={`flex items-center px-4 py-2 rounded-md text-sm font-semibold transition-colors ${
            activeTab === 'OUTBOUND' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-600 hover:bg-slate-300'
          }`}
        >
          <DocumentTextIcon className="h-4 w-4 mr-2" />
          Saidas e Auditoria
        </button>
      </div>

      {activeTab === 'INVENTORY' && (
        <div className="space-y-6 animate-fade-in">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-bold text-slate-800 mb-4">Cadastrar item de estoque/patrimonio</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <input value={newItem.name} onChange={(e) => setNewItem((prev) => ({ ...prev, name: e.target.value }))} className="p-2 border border-slate-300 rounded-md" placeholder="Nome do item" />
              <select value={newItem.category} onChange={(e) => setNewItem((prev) => ({ ...prev, category: e.target.value as InventoryItem['category'] }))} className="p-2 border border-slate-300 rounded-md bg-white">
                {INVENTORY_CATEGORIES.map((category) => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
              <input value={newItem.unit} onChange={(e) => setNewItem((prev) => ({ ...prev, unit: e.target.value }))} className="p-2 border border-slate-300 rounded-md" placeholder="Unidade (kg, un, lt)" />
              <input value={newItem.location} onChange={(e) => setNewItem((prev) => ({ ...prev, location: e.target.value }))} className="p-2 border border-slate-300 rounded-md" placeholder="Localizacao fisica" />
              <input type="number" value={newItem.quantity} onChange={(e) => setNewItem((prev) => ({ ...prev, quantity: e.target.value }))} className="p-2 border border-slate-300 rounded-md" placeholder="Saldo inicial" min="0" />
              <input type="number" value={newItem.minLevel} onChange={(e) => setNewItem((prev) => ({ ...prev, minLevel: e.target.value }))} className="p-2 border border-slate-300 rounded-md" placeholder="Nivel minimo" min="0" />
              <input type="number" value={newItem.unitCost} onChange={(e) => setNewItem((prev) => ({ ...prev, unitCost: e.target.value }))} className="p-2 border border-slate-300 rounded-md" placeholder="Custo unitario (R$)" min="0" step="0.01" />
              <input value={newItem.assetTag} onChange={(e) => setNewItem((prev) => ({ ...prev, assetTag: e.target.value }))} className="p-2 border border-slate-300 rounded-md" placeholder="Etiqueta patrimonial (opcional)" />
            </div>
            <div className="mt-4">
              <button onClick={() => void handleCreateItem()} disabled={isCreatingItem} className="px-4 py-2 bg-emerald-600 text-white rounded-md font-semibold hover:bg-emerald-700 disabled:opacity-60">
                {isCreatingItem ? 'Salvando...' : 'Cadastrar Item'}
              </button>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
              <input
                type="text"
                placeholder="Buscar por item, categoria ou localizacao..."
                className="w-full md:w-1/2 p-2 border border-slate-300 rounded-md"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <div className="text-xs text-slate-500 bg-yellow-50 p-2 rounded border border-yellow-100 flex items-center">
                <LockClosedIcon className="h-3 w-3 mr-1" />
                Controle por saldo, localizacao e custo unitario.
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-slate-700 uppercase bg-slate-100">
                  <tr>
                    <th className="px-6 py-3">Item</th>
                    <th className="px-6 py-3">Categoria</th>
                    <th className="px-6 py-3">Saldo</th>
                    <th className="px-6 py-3">Localizacao</th>
                    <th className="px-6 py-3">Custo unitario</th>
                    <th className="px-6 py-3">Patrimonio</th>
                    <th className="px-6 py-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.map((item) => (
                    <tr key={item.id} className="border-b hover:bg-slate-50">
                      <td className="px-6 py-4 font-semibold text-slate-800">{item.name}</td>
                      <td className="px-6 py-4 text-slate-600">{item.category}</td>
                      <td className="px-6 py-4">
                        <span className="font-bold text-lg">{item.quantity}</span> <span className="text-xs">{item.unit}</span>
                      </td>
                      <td className="px-6 py-4">{item.location}</td>
                      <td className="px-6 py-4">{item.unitCost !== undefined ? formattedCurrency(item.unitCost) : '-'}</td>
                      <td className="px-6 py-4">{item.assetTag || '-'}</td>
                      <td className="px-6 py-4">
                        {item.quantity <= item.minLevel ? (
                          <span className="px-2 py-1 text-xs font-bold text-red-700 bg-red-100 rounded-full">Critico</span>
                        ) : (
                          <span className="px-2 py-1 text-xs font-medium text-green-700 bg-green-100 rounded-full">Normal</span>
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

      {activeTab === 'INBOUND' && (
        <div className="space-y-6 animate-fade-in">
          <div className="bg-white rounded-lg shadow-md p-6 space-y-4">
            <h3 className="text-lg font-bold text-slate-800">Lancar nova aquisicao/entrada</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <select value={newInbound.itemId} onChange={(e) => setNewInbound((prev) => ({ ...prev, itemId: e.target.value }))} className="p-2 border border-slate-300 rounded-md bg-white">
                <option value="">Selecione o item</option>
                {inventory.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} ({item.location})
                  </option>
                ))}
              </select>
              <input type="number" value={newInbound.quantity} onChange={(e) => setNewInbound((prev) => ({ ...prev, quantity: e.target.value }))} className="p-2 border border-slate-300 rounded-md" placeholder="Quantidade" min="0" />
              <input value={newInbound.invoiceNumber} onChange={(e) => setNewInbound((prev) => ({ ...prev, invoiceNumber: e.target.value }))} className="p-2 border border-slate-300 rounded-md" placeholder="NF (opcional na criacao)" />
              <input value={newInbound.reason} onChange={(e) => setNewInbound((prev) => ({ ...prev, reason: e.target.value }))} className="p-2 border border-slate-300 rounded-md" placeholder="Motivo / aplicacao" />
            </div>
            <button onClick={() => void handleLaunchInbound()} disabled={isLaunchingInbound} className="px-4 py-2 bg-indigo-600 text-white rounded-md font-semibold hover:bg-indigo-700 disabled:opacity-60">
              {isLaunchingInbound ? 'Lancando...' : 'Registrar Entrada'}
            </button>
          </div>

          <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg flex items-start">
            <LockClosedIcon className="h-5 w-5 text-blue-600 mr-2 mt-0.5" />
            <div>
              <h4 className="font-bold text-blue-800 text-sm">Fluxo rigoroso de entrada</h4>
              <p className="text-xs text-blue-700 mt-1">Sem NF: entrada fica pendente. Com NF: saldo e rastreabilidade atualizados automaticamente.</p>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-700 uppercase bg-slate-100">
                <tr>
                  <th className="p-4">Data</th>
                  <th className="p-4">Solicitante</th>
                  <th className="p-4">Item</th>
                  <th className="p-4">Qtd</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Acao</th>
                </tr>
              </thead>
              <tbody>
                {movements
                  .filter((movement) => movement.type === 'INBOUND_PURCHASE')
                  .map((movement) => (
                    <tr key={movement.id} className="border-b hover:bg-slate-50">
                      <td className="p-4">{movement.date}</td>
                      <td className="p-4 font-semibold">{movement.requester}</td>
                      <td className="p-4">{movement.itemName}</td>
                      <td className="p-4 font-bold text-green-600">+{movement.quantity} {movement.unit}</td>
                      <td className="p-4">
                        {movement.status === 'INVOICE_REQUIRED' && <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded font-bold">Aguardando NF</span>}
                        {movement.status === 'COMPLETED' && <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded font-bold">Confirmado</span>}
                      </td>
                      <td className="p-4 text-right">
                        {movement.status === 'INVOICE_REQUIRED' &&
                          (isConfirmingEntry === movement.id ? (
                            <div className="flex items-center justify-end gap-2">
                              <input
                                type="text"
                                placeholder="N NF"
                                className="p-1 border border-slate-300 rounded text-xs w-32"
                                value={invoiceNumber}
                                onChange={(event) => setInvoiceNumber(event.target.value)}
                              />
                              <LoadingButton loading={confirmingId === movement.id} onClick={() => handleConfirmEntry(movement.id)} className="bg-green-500 text-white p-1 rounded hover:bg-green-600 w-7 h-7">
                                <CheckCircleIcon className="h-4 w-4" />
                              </LoadingButton>
                              <button onClick={() => setIsConfirmingEntry(null)} className="bg-slate-300 text-slate-600 p-1 rounded hover:bg-slate-400 w-7 h-7">
                                <XIcon className="h-4 w-4" />
                              </button>
                            </div>
                          ) : (
                            <button onClick={() => setIsConfirmingEntry(movement.id)} className="text-indigo-600 font-bold hover:underline text-xs">
                              Confirmar recebimento
                            </button>
                          ))}
                        {movement.status === 'COMPLETED' && (
                          <span className="text-xs text-slate-400 flex items-center justify-end">
                            <LockClosedIcon className="h-3 w-3 mr-1" />
                            NF: {movement.invoiceNumber}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'OUTBOUND' && (
        <div className="space-y-6 animate-fade-in">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-xl font-bold text-slate-800">Historico de saidas e consumo</h3>
              <p className="text-sm text-slate-500">Saidas automaticas via operacao ou perdas auditadas.</p>
            </div>
            <button onClick={() => setIsReportingLoss(true)} className="flex items-center px-4 py-2 bg-red-100 text-red-700 rounded-md hover:bg-red-200 text-sm font-bold border border-red-200">
              <ExclamationIcon className="h-4 w-4 mr-2" />
              Reportar perda / quebra
            </button>
          </div>

          {isReportingLoss && (
            <div className="bg-red-50 p-6 rounded-lg border border-red-200 mb-6 animate-fade-in">
              <h4 className="font-bold text-red-800 mb-4">Registro de perda (auditoria obrigatoria)</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-xs font-bold text-red-700 mb-1">Item</label>
                  <select className="w-full p-2 border border-red-200 rounded" value={lossItem} onChange={(e) => setLossItem(e.target.value)}>
                    <option value="">Selecione...</option>
                    {inventory.map((item) => (
                      <option key={item.id} value={item.id}>{item.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-red-700 mb-1">Quantidade perdida</label>
                  <input type="number" className="w-full p-2 border border-red-200 rounded" value={lossQty} onChange={(e) => setLossQty(e.target.value)} />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-red-700 mb-1">Motivo / justificativa</label>
                  <input type="text" className="w-full p-2 border border-red-200 rounded" placeholder="Ex: avaria, vencimento, quebra" value={lossReason} onChange={(e) => setLossReason(e.target.value)} />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-red-700 mb-1">Foto comprobatoria (obrigatorio)</label>
                  <div className="flex items-center gap-4">
                    <input type="file" accept="image/*" onChange={handlePhotoUpload} className="text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-red-100 file:text-red-700 hover:file:bg-red-200" />
                    {lossPhoto && <span className="text-green-600 text-xs font-bold flex items-center"><CheckCircleIcon className="h-4 w-4 mr-1" />Foto anexada</span>}
                  </div>
                </div>
              </div>
              <InlineError message={formError} />
              <div className="flex justify-end gap-2 mt-4">
                <button onClick={() => setIsReportingLoss(false)} className="px-4 py-2 text-slate-600 font-bold text-sm">Cancelar</button>
                <LoadingButton loading={isSubmittingLoss} loadingText="Confirmando..." onClick={handleReportLoss} className="px-4 py-2 bg-red-600 text-white font-bold rounded hover:bg-red-700 text-sm shadow-sm">
                  Confirmar perda
                </LoadingButton>
              </div>
            </div>
          )}

          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-700 uppercase bg-slate-100">
                <tr>
                  <th className="p-4">Data</th>
                  <th className="p-4">Tipo</th>
                  <th className="p-4">Item</th>
                  <th className="p-4">Qtd</th>
                  <th className="p-4">Origem</th>
                  <th className="p-4">Hash de auditoria</th>
                </tr>
              </thead>
              <tbody>
                {movements
                  .filter((movement) => movement.type.startsWith('OUTBOUND'))
                  .map((movement) => (
                    <tr key={movement.id} className="border-b hover:bg-slate-50">
                      <td className="p-4 text-slate-500">{movement.date}</td>
                      <td className="p-4">
                        {movement.type === 'OUTBOUND_LOSS' ? (
                          <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded font-bold">PERDA</span>
                        ) : (
                          <span className="bg-slate-100 text-slate-800 text-xs px-2 py-1 rounded font-bold">CONSUMO</span>
                        )}
                      </td>
                      <td className="p-4 font-semibold">{movement.itemName}</td>
                      <td className="p-4 font-bold text-slate-700">-{movement.quantity} {movement.unit}</td>
                      <td className="p-4 text-xs">{movement.requester}</td>
                      <td className="p-4">
                        {movement.auditHash ? (
                          <div className="flex items-center text-emerald-600 text-xs font-mono" title={movement.auditHash}>
                            <LockClosedIcon className="h-3 w-3 mr-1" />
                            {movement.auditHash.substring(0, 8)}...
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">Automatico (operacao)</span>
                        )}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default StockView;
