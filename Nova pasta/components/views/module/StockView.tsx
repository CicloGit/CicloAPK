
import React, { useEffect, useState } from 'react';
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

const StockView: React.FC = () => {
    const { addToast } = useToast();
    const { currentUser } = useApp();
    const [activeTab, setActiveTab] = useState<'INVENTORY' | 'INBOUND' | 'OUTBOUND'>('INVENTORY');
    const [searchTerm, setSearchTerm] = useState('');
    const [movements, setMovements] = useState<StockMovement[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    
    // Loss Report State
    const [isReportingLoss, setIsReportingLoss] = useState(false);
    const [lossItem, setLossItem] = useState('');
    const [lossQty, setLossQty] = useState('');
    const [lossReason, setLossReason] = useState('');
    const [lossPhoto, setLossPhoto] = useState<File | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);

    // Confirmation State
    const [isConfirmingEntry, setIsConfirmingEntry] = useState<string | null>(null);
    const [confirmingId, setConfirmingId] = useState<string | null>(null);
    const [invoiceNumber, setInvoiceNumber] = useState('');

    // Use a separate state for inventory that can be updated
    const [inventory, setInventory] = useState<InventoryItem[]>([]);

    const filteredItems = inventory.filter(item => 
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.category.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const loadStockData = async () => {
        setIsLoading(true);
        try {
            const [inventoryData, movementData] = await Promise.all([
                stockService.listInventory(),
                stockService.listMovements()
            ]);
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

    const handleConfirmEntry = async (id: string) => {
        if (!invoiceNumber) {
            addToast({ type: 'warning', title: 'Atenção', message: 'Número da Nota Fiscal é obrigatório para auditoria.' });
            return;
        }
        
        setConfirmingId(id);
        const result = await stockService.confirmInboundEntry(id, invoiceNumber);

        if (result.success) {
            setMovements(prev => prev.map(m => 
                m.id === id ? { ...m, status: 'COMPLETED', invoiceNumber: invoiceNumber } : m
            ));
            await loadStockData();
            setIsConfirmingEntry(null);
            setInvoiceNumber('');
            addToast({ type: 'success', title: 'Entrada Confirmada', message: 'Estoque atualizado e NF registrada na trilha de auditoria.' });
        } else {
            addToast({ type: 'error', title: 'Falha na confirmaÃ§Ã£o', message: result.message || 'Nao foi possivel confirmar a entrada.' });
        }
        setConfirmingId(null);
    };

    const handleReportLoss = async () => {
        setFormError(null);
        setIsSubmitting(true);

        // 1. Validate Input
        const validation = Validators.stockMovement({
            itemId: lossItem,
            quantity: lossQty,
            type: 'OUTBOUND_LOSS',
            reason: lossReason,
            hasPhoto: !!lossPhoto
        });

        if (!validation.success) {
            setFormError(validation.error ?? 'Dados de entrada invÃ¡lidos.');
            setIsSubmitting(false);
            return;
        }

        // 2. Execute Service
        if (!lossPhoto) {
            setFormError('Foto da perda obrigatoria para auditoria.');
            setIsSubmitting(false);
            return;
        }

        const tenantId = currentUser?.tenantId;
        if (!tenantId) {
            setFormError('Tenant do usuario nao identificado.');
            setIsSubmitting(false);
            return;
        }

        let proofUrl = '';
        try {
            proofUrl = await storageService.uploadStockLossProof(lossPhoto, tenantId, lossItem || 'stock-loss');
        } catch {
            setFormError('Falha ao enviar evidência para o Storage.');
            setIsSubmitting(false);
            return;
        }

        const result = await stockService.registerStockUsage({
            itemId: lossItem,
            quantity: Number(lossQty),
            reason: lossReason,
            proofUrl,
            requester: 'João Silva (Produtor)'
        });
        
        if (result.success && result.newMovement) {
            setMovements(prev => [result.newMovement!, ...prev]);
            await loadStockData();
            
            setIsReportingLoss(false);
            setLossItem('');
            setLossQty('');
            setLossReason('');
            setLossPhoto(null);
            
            addToast({ type: 'success', title: 'Baixa Registrada', message: 'Perda auditada e registrada com sucesso!' });
        } else {
            setFormError(result.message || 'Ocorreu um erro na operação.');
        }
        setIsSubmitting(false);
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
            <h2 className="text-3xl font-bold text-slate-800 mb-2">Controle de Estoque & Auditoria</h2>
            <p className="text-slate-600 mb-8">Gestão rígida de insumos: Entradas via Nota Fiscal e Saídas auditadas.</p>

            {/* Overview Cards */}
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
                        <p className="text-sm text-slate-500">Valor em Estoque</p>
                        <p className="text-2xl font-bold text-emerald-600">R$ 89.750,00</p>
                    </div>
                    <span className="text-2xl">💰</span>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-md flex items-center justify-between border-l-4 border-orange-500">
                    <div>
                        <p className="text-sm text-slate-500">Alertas de Reposição</p>
                        <p className="text-2xl font-bold text-orange-600">
                            {inventory.filter(i => i.quantity <= i.minLevel).length}
                        </p>
                    </div>
                    <ExclamationIcon className="h-8 w-8 text-orange-500" />
                </div>
            </div>

            {/* Tabs */}
            <div className="flex space-x-1 bg-slate-200 p-1 rounded-lg mb-6 w-fit">
                <button 
                    onClick={() => setActiveTab('INVENTORY')}
                    className={`flex items-center px-4 py-2 rounded-md text-sm font-semibold transition-colors ${activeTab === 'INVENTORY' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-600 hover:bg-slate-300'}`}
                >
                    <CubeIcon className="h-4 w-4 mr-2" />
                    Inventário Atual
                </button>
                <button 
                    onClick={() => setActiveTab('INBOUND')}
                    className={`flex items-center px-4 py-2 rounded-md text-sm font-semibold transition-colors ${activeTab === 'INBOUND' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-600 hover:bg-slate-300'}`}
                >
                    <PlusCircleIcon className="h-4 w-4 mr-2" />
                    Esteira de Compras (Entradas)
                </button>
                <button 
                    onClick={() => setActiveTab('OUTBOUND')}
                    className={`flex items-center px-4 py-2 rounded-md text-sm font-semibold transition-colors ${activeTab === 'OUTBOUND' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-600 hover:bg-slate-300'}`}
                >
                    <DocumentTextIcon className="h-4 w-4 mr-2" />
                    Auditoria de Saídas
                </button>
            </div>

            {/* INVENTORY TAB */}
            {activeTab === 'INVENTORY' && (
                <div className="bg-white rounded-lg shadow-md p-6 animate-fade-in">
                    <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                        <input 
                            type="text" 
                            placeholder="Buscar item no inventário..." 
                            className="w-full md:w-1/3 p-2 border border-slate-300 rounded-md"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        <div className="text-xs text-slate-500 bg-yellow-50 p-2 rounded border border-yellow-100 flex items-center">
                            <LockClosedIcon className="h-3 w-3 mr-1" />
                            Inventário atualizado automaticamente pelas operações de campo.
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-slate-700 uppercase bg-slate-100">
                                <tr>
                                    <th className="px-6 py-3">Item</th>
                                    <th className="px-6 py-3">Categoria</th>
                                    <th className="px-6 py-3">Saldo Físico</th>
                                    <th className="px-6 py-3">Localização</th>
                                    <th className="px-6 py-3">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredItems.map(item => (
                                    <tr key={item.id} className="border-b hover:bg-slate-50">
                                        <td className="px-6 py-4 font-semibold text-slate-800">{item.name}</td>
                                        <td className="px-6 py-4 text-slate-600">{item.category}</td>
                                        <td className="px-6 py-4">
                                            <span className="font-bold text-lg">{item.quantity}</span> <span className="text-xs">{item.unit}</span>
                                        </td>
                                        <td className="px-6 py-4">{item.location}</td>
                                        <td className="px-6 py-4">
                                            {item.quantity <= item.minLevel ? (
                                                <span className="px-2 py-1 text-xs font-bold text-red-700 bg-red-100 rounded-full">Crítico</span>
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
            )}

            {/* INBOUND TAB (Purchasing Flow) */}
            {activeTab === 'INBOUND' && (
                <div className="space-y-6 animate-fade-in">
                    <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg flex items-start">
                        <LockClosedIcon className="h-5 w-5 text-blue-600 mr-2 mt-0.5" />
                        <div>
                            <h4 className="font-bold text-blue-800 text-sm">Fluxo Rigoroso de Entrada</h4>
                            <p className="text-xs text-blue-700 mt-1">
                                O estoque só é creditado após a confirmação da Nota Fiscal (NF). Pedidos aprovados aguardam conferência física.
                            </p>
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
                                    <th className="p-4 text-right">Ação</th>
                                </tr>
                            </thead>
                            <tbody>
                                {movements.filter(m => m.type === 'INBOUND_PURCHASE').map(mov => (
                                    <tr key={mov.id} className="border-b hover:bg-slate-50">
                                        <td className="p-4">{mov.date}</td>
                                        <td className="p-4 font-semibold">{mov.requester}</td>
                                        <td className="p-4">{mov.itemName}</td>
                                        <td className="p-4 font-bold text-green-600">+{mov.quantity} {mov.unit}</td>
                                        <td className="p-4">
                                            {mov.status === 'INVOICE_REQUIRED' && <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded font-bold">Aguardando NF</span>}
                                            {mov.status === 'COMPLETED' && <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded font-bold">Confirmado</span>}
                                        </td>
                                        <td className="p-4 text-right">
                                            {mov.status === 'INVOICE_REQUIRED' && (
                                                isConfirmingEntry === mov.id ? (
                                                    <div className="flex items-center justify-end gap-2">
                                                        <input 
                                                            type="text" 
                                                            placeholder="Nº Nota Fiscal" 
                                                            className="p-1 border border-slate-300 rounded text-xs w-32"
                                                            value={invoiceNumber}
                                                            onChange={e => setInvoiceNumber(e.target.value)}
                                                        />
                                                        <LoadingButton loading={confirmingId === mov.id} onClick={() => handleConfirmEntry(mov.id)} className="bg-green-500 text-white p-1 rounded hover:bg-green-600 w-7 h-7">
                                                            <CheckCircleIcon className="h-4 w-4"/>
                                                        </LoadingButton>
                                                        <button onClick={() => setIsConfirmingEntry(null)} className="bg-slate-300 text-slate-600 p-1 rounded hover:bg-slate-400 w-7 h-7">
                                                            <XIcon className="h-4 w-4"/>
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <button 
                                                        onClick={() => setIsConfirmingEntry(mov.id)}
                                                        className="text-indigo-600 font-bold hover:underline text-xs"
                                                    >
                                                        Confirmar Recebimento
                                                    </button>
                                                )
                                            )}
                                            {mov.status === 'COMPLETED' && (
                                                <span className="text-xs text-slate-400 flex items-center justify-end">
                                                    <LockClosedIcon className="h-3 w-3 mr-1" /> NF: {mov.invoiceNumber}
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

            {/* OUTBOUND TAB (Audit & Loss) */}
            {activeTab === 'OUTBOUND' && (
                <div className="space-y-6 animate-fade-in">
                    <div className="flex justify-between items-center">
                        <div>
                            <h3 className="text-xl font-bold text-slate-800">Histórico de Saídas & Consumo</h3>
                            <p className="text-sm text-slate-500">Saídas automáticas via operação ou perdas auditadas.</p>
                        </div>
                        <button 
                            onClick={() => setIsReportingLoss(true)}
                            className="flex items-center px-4 py-2 bg-red-100 text-red-700 rounded-md hover:bg-red-200 text-sm font-bold border border-red-200"
                        >
                            <ExclamationIcon className="h-4 w-4 mr-2" />
                            Reportar Perda / Quebra
                        </button>
                    </div>

                    {isReportingLoss && (
                        <div className="bg-red-50 p-6 rounded-lg border border-red-200 mb-6 animate-fade-in">
                            <h4 className="font-bold text-red-800 mb-4">Registro de Perda (Auditoria Obrigatória)</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                <div>
                                    <label className="block text-xs font-bold text-red-700 mb-1">Item</label>
                                    <select 
                                        className="w-full p-2 border border-red-200 rounded"
                                        value={lossItem}
                                        onChange={(e) => setLossItem(e.target.value)}
                                    >
                                        <option value="">Selecione...</option>
                                        {inventory.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-red-700 mb-1">Quantidade Perdida</label>
                                    <input 
                                        type="number" 
                                        className="w-full p-2 border border-red-200 rounded"
                                        value={lossQty}
                                        onChange={(e) => setLossQty(e.target.value)}
                                    />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-xs font-bold text-red-700 mb-1">Motivo / Justificativa</label>
                                    <input 
                                        type="text" 
                                        className="w-full p-2 border border-red-200 rounded"
                                        placeholder="Ex: Saco rasgado, validade vencida..."
                                        value={lossReason}
                                        onChange={(e) => setLossReason(e.target.value)}
                                    />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-xs font-bold text-red-700 mb-1">Foto Comprobatória (Obrigatório)</label>
                                    <div className="flex items-center gap-4">
                                        <input type="file" accept="image/*" onChange={handlePhotoUpload} className="text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-red-100 file:text-red-700 hover:file:bg-red-200"/>
                                        {lossPhoto && <span className="text-green-600 text-xs font-bold flex items-center"><CheckCircleIcon className="h-4 w-4 mr-1"/> Foto Anexada</span>}
                                    </div>
                                </div>
                            </div>
                            <InlineError message={formError} />
                            <div className="flex justify-end gap-2 mt-4">
                                <button onClick={() => setIsReportingLoss(false)} className="px-4 py-2 text-slate-600 font-bold text-sm">Cancelar</button>
                                <LoadingButton 
                                    loading={isSubmitting}
                                    loadingText="Confirmando..."
                                    onClick={handleReportLoss} 
                                    className="px-4 py-2 bg-red-600 text-white font-bold rounded hover:bg-red-700 text-sm shadow-sm"
                                >
                                    Confirmar Perda
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
                                    <th className="p-4">Hash de Auditoria</th>
                                </tr>
                            </thead>
                            <tbody>
                                {movements.filter(m => m.type.startsWith('OUTBOUND')).map(mov => (
                                    <tr key={mov.id} className="border-b hover:bg-slate-50">
                                        <td className="p-4 text-slate-500">{mov.date}</td>
                                        <td className="p-4">
                                            {mov.type === 'OUTBOUND_LOSS' ? (
                                                <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded font-bold">PERDA</span>
                                            ) : (
                                                <span className="bg-slate-100 text-slate-800 text-xs px-2 py-1 rounded font-bold">CONSUMO</span>
                                            )}
                                        </td>
                                        <td className="p-4 font-semibold">{mov.itemName}</td>
                                        <td className="p-4 font-bold text-slate-700">-{mov.quantity} {mov.unit}</td>
                                        <td className="p-4 text-xs">{mov.requester}</td>
                                        <td className="p-4">
                                            {mov.auditHash ? (
                                                <div className="flex items-center text-emerald-600 text-xs font-mono" title={mov.auditHash}>
                                                    <LockClosedIcon className="h-3 w-3 mr-1" />
                                                    {mov.auditHash.substring(0, 8)}...
                                                </div>
                                            ) : (
                                                <span className="text-xs text-slate-400">Automático (Operação)</span>
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

