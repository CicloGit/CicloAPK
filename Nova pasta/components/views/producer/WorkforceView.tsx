import React, { useEffect, useMemo, useState } from 'react';
import UsersIcon from '../../icons/UsersIcon';
import { CashIcon } from '../../icons/CashIcon';
import ClipboardListIcon from '../../icons/ClipboardListIcon';
import ShieldCheckIcon from '../../icons/ShieldCheckIcon';
import PlusCircleIcon from '../../icons/PlusCircleIcon';
import DocumentTextIcon from '../../icons/DocumentTextIcon';
import LockClosedIcon from '../../icons/LockClosedIcon';
import LoadingSpinner from '../../shared/LoadingSpinner';
import { useToast } from '../../../contexts/ToastContext';
import { workforceService } from '../../../services/workforceService';
import { Employee, PayrollEntry, PPEOrder, TimeRecord } from '../../../types';

const WorkforceView: React.FC = () => {
    const { addToast } = useToast();
    const [activeTab, setActiveTab] = useState<'Team' | 'Time' | 'Finance' | 'Safety'>('Team');
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [timeRecords, setTimeRecords] = useState<TimeRecord[]>([]);
    const [payroll, setPayroll] = useState<PayrollEntry[]>([]);
    const [ppeOrders, setPpeOrders] = useState<PPEOrder[]>([]);
    
    // Configuration State (Producer defines rules)
    const [shiftConfig, setShiftConfig] = useState({
        entryTime: '07:00',
        exitTime: '17:00',
        lunchDuration: '60', // minutes
        tolerance: '10' // minutes
    });

    const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

    const handleGenerateReport = () => {
        addToast({ type: 'info', title: 'Gerando Relatorio', message: 'Laudo de Conformidade SST sendo processado para download.' });
        addToast({ type: 'success', title: 'Download Pronto', message: 'O arquivo PDF foi gerado com sucesso.' });
    };

    const handleSaveRules = () => {
        addToast({ type: 'success', title: 'Regras Atualizadas', message: 'Novos horarios de turno sincronizados com o app dos operadores.' });
    };

    useEffect(() => {
        const loadWorkforce = async () => {
            setIsLoading(true);
            setLoadError(null);
            try {
                const [loadedEmployees, loadedRecords, loadedPayroll, loadedPpe] = await Promise.all([
                    workforceService.listEmployees(),
                    workforceService.listTimeRecords(),
                    workforceService.listPayrollEntries(),
                    workforceService.listPPEOrders(),
                ]);
                setEmployees(loadedEmployees);
                setTimeRecords(loadedRecords);
                setPayroll(loadedPayroll);
                setPpeOrders(loadedPpe);
            } catch {
                setLoadError('Nao foi possivel carregar o modulo de pessoas.');
            } finally {
                setIsLoading(false);
            }
        };

        void loadWorkforce();
    }, []);

    const employeeById = useMemo(() => {
        return employees.reduce<Record<string, Employee>>((acc, employee) => {
            acc[employee.id] = employee;
            return acc;
        }, {});
    }, [employees]);

    if (isLoading) {
        return <LoadingSpinner text="Carregando equipe..." />;
    }

    if (loadError) {
        return <div className="p-6 bg-red-50 text-red-700 border border-red-200 rounded-lg">{loadError}</div>;
    }

    return (
        <div>
            <h2 className="text-3xl font-bold text-slate-800 mb-2">Gestao de Pessoas & Conformidade</h2>
            <p className="text-slate-600 mb-8">Gerencie sua equipe, monitore a jornada de trabalho e garanta a seguranca.</p>

            {/* Navigation Tabs */}
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 mb-6 flex overflow-hidden">
                <button onClick={() => setActiveTab('Team')} className={`flex-1 py-4 text-sm font-bold flex justify-center items-center ${activeTab === 'Team' ? 'bg-indigo-50 text-indigo-700 border-b-2 border-indigo-500' : 'text-slate-500 hover:bg-slate-50'}`}>
                    <UsersIcon className="h-5 w-5 mr-2" /> Equipe
                </button>
                <button onClick={() => setActiveTab('Time')} className={`flex-1 py-4 text-sm font-bold flex justify-center items-center ${activeTab === 'Time' ? 'bg-indigo-50 text-indigo-700 border-b-2 border-indigo-500' : 'text-slate-500 hover:bg-slate-50'}`}>
                    <ClipboardListIcon className="h-5 w-5 mr-2" /> Monitoramento de Ponto
                </button>
                <button onClick={() => setActiveTab('Finance')} className={`flex-1 py-4 text-sm font-bold flex justify-center items-center ${activeTab === 'Finance' ? 'bg-indigo-50 text-indigo-700 border-b-2 border-indigo-500' : 'text-slate-500 hover:bg-slate-50'}`}>
                    <CashIcon className="h-5 w-5 mr-2" /> Pagamentos
                </button>
                <button onClick={() => setActiveTab('Safety')} className={`flex-1 py-4 text-sm font-bold flex justify-center items-center ${activeTab === 'Safety' ? 'bg-indigo-50 text-indigo-700 border-b-2 border-indigo-500' : 'text-slate-500 hover:bg-slate-50'}`}>
                    <ShieldCheckIcon className="h-5 w-5 mr-2" /> SST & EPIs
                </button>
            </div>

            {/* TEAM TAB */}
            {activeTab === 'Team' && (
                <div className="bg-white rounded-lg shadow-md p-6">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-xl font-bold text-slate-800">Quadro de Funcionarios e Prestadores</h3>
                        <button className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 text-sm font-semibold">
                            <PlusCircleIcon className="h-4 w-4 mr-2" /> Novo Cadastro
                        </button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-slate-700 uppercase bg-slate-100">
                                <tr>
                                    <th className="px-6 py-3">Nome</th>
                                    <th className="px-6 py-3">Funcao</th>
                                    <th className="px-6 py-3">Tipo</th>
                                    <th className="px-6 py-3">Custo Base</th>
                                    <th className="px-6 py-3">Status</th>
                                    <th className="px-6 py-3 text-right">Acoes</th>
                                </tr>
                            </thead>
                            <tbody>
                                {employees.map(emp => (
                                    <tr key={emp.id} className="border-b hover:bg-slate-50">
                                        <td className="px-6 py-4 font-semibold text-slate-800">{emp.name}</td>
                                        <td className="px-6 py-4">{emp.role}</td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded-full text-xs font-bold ${emp.type === 'CLT' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'}`}>
                                                {emp.type}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            {emp.hourlyRate ? `${formatCurrency(emp.hourlyRate)}/h` : `${formatCurrency(emp.monthlySalary || 0)}/mes`}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-bold">{emp.status}</span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button className="text-indigo-600 hover:underline">Editar</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* TIME TAB (READ ONLY + CONFIG) */}
            {activeTab === 'Time' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Live Status */}
                    <div className="bg-white rounded-lg shadow-md p-6">
                        <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center">
                            <span className="relative flex h-3 w-3 mr-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                            </span>
                            Status em Tempo Real
                        </h3>
                        <p className="text-xs text-slate-500 mb-4">Funcionarios ativos no momento (GPS/Check-in).</p>
                        
                        <ul className="space-y-3">
                            <li className="flex justify-between items-center p-2 bg-green-50 rounded border border-green-100">
                                <div className="flex items-center">
                                    <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center font-bold text-xs mr-3">JS</div>
                                    <div>
                                        <p className="text-sm font-bold text-slate-700">Jose Silva</p>
                                        <p className="text-xs text-green-600">Trabalhando (Talhao 2)</p>
                                    </div>
                                </div>
                                <span className="text-xs font-mono font-bold">04h 15m</span>
                            </li>
                            <li className="flex justify-between items-center p-2 bg-green-50 rounded border border-green-100">
                                <div className="flex items-center">
                                    <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center font-bold text-xs mr-3">CS</div>
                                    <div>
                                        <p className="text-sm font-bold text-slate-700">Carlos Souza</p>
                                        <p className="text-xs text-green-600">Trabalhando (Oficina)</p>
                                    </div>
                                </div>
                                <span className="text-xs font-mono font-bold">02h 45m</span>
                            </li>
                            <li className="flex justify-between items-center p-2 bg-slate-50 rounded border border-slate-100 opacity-75">
                                <div className="flex items-center">
                                    <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center font-bold text-xs mr-3">MO</div>
                                    <div>
                                        <p className="text-sm font-bold text-slate-700">Maria Oliveira</p>
                                        <p className="text-xs text-slate-500">Folga</p>
                                    </div>
                                </div>
                                <span className="text-xs font-mono">-</span>
                            </li>
                        </ul>
                    </div>

                    {/* Schedule Configuration (Rules) */}
                    <div className="lg:col-span-2 bg-white rounded-lg shadow-md p-6">
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h3 className="text-lg font-bold text-slate-800">Definicao de Turnos e Regras</h3>
                                <p className="text-xs text-slate-500">Configure os horarios esperados. O sistema calculara horas extras automaticamente.</p>
                            </div>
                            <div title="Apenas visualizacao do historico, edicao bloqueada">
                                <LockClosedIcon className="h-5 w-5 text-slate-400" />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">Entrada Padrao</label>
                                <input type="time" value={shiftConfig.entryTime} onChange={e => setShiftConfig({...shiftConfig, entryTime: e.target.value})} className="w-full p-2 border border-slate-300 rounded text-sm" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">Saida Padrao</label>
                                <input type="time" value={shiftConfig.exitTime} onChange={e => setShiftConfig({...shiftConfig, exitTime: e.target.value})} className="w-full p-2 border border-slate-300 rounded text-sm" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">Intervalo (min)</label>
                                <input type="number" value={shiftConfig.lunchDuration} onChange={e => setShiftConfig({...shiftConfig, lunchDuration: e.target.value})} className="w-full p-2 border border-slate-300 rounded text-sm" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">Tolerancia (min)</label>
                                <input type="number" value={shiftConfig.tolerance} onChange={e => setShiftConfig({...shiftConfig, tolerance: e.target.value})} className="w-full p-2 border border-slate-300 rounded text-sm" />
                            </div>
                        </div>
                        <div className="flex justify-end border-b border-slate-200 pb-6 mb-6">
                            <button onClick={handleSaveRules} className="px-4 py-2 bg-slate-800 text-white text-sm font-bold rounded hover:bg-slate-700">
                                Salvar Regras de Turno
                            </button>
                        </div>

                        <h4 className="text-sm font-bold text-slate-700 mb-3">Espelho de Ponto (Somente Leitura)</h4>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-slate-100 text-xs text-slate-700 uppercase">
                                    <tr>
                                        <th className="p-3">Data</th>
                                        <th className="p-3">Funcionario</th>
                                        <th className="p-3">Entrada</th>
                                        <th className="p-3">Saida</th>
                                        <th className="p-3">Total</th>
                                        <th className="p-3">Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {timeRecords.map(record => {
                                        const emp = employeeById[record.employeeId];
                                        return (
                                            <tr key={record.id} className="border-b">
                                                <td className="p-3">{record.date}</td>
                                                <td className="p-3 font-semibold">{emp?.name ?? 'N/D'}</td>
                                                <td className="p-3 text-slate-500">07:05</td>
                                                <td className="p-3 text-slate-500">17:10</td>
                                                <td className="p-3 font-mono font-bold">{record.hours}h</td>
                                                <td className="p-3">
                                                    <span className={`px-2 py-1 rounded text-xs ${record.status === 'Aprovado' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                                        {record.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* FINANCE TAB */}
            {activeTab === 'Finance' && (
                <div className="bg-white rounded-lg shadow-md p-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                        <div className="bg-slate-50 p-4 rounded-lg border-l-4 border-red-500">
                            <p className="text-sm text-slate-500">Pendencias (Mes)</p>
                            <p className="text-2xl font-bold text-red-600">{formatCurrency(1200)}</p>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-lg border-l-4 border-green-500">
                            <p className="text-sm text-slate-500">Pago (Mes)</p>
                            <p className="text-2xl font-bold text-green-600">{formatCurrency(7700)}</p>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-lg border-l-4 border-indigo-500">
                            <p className="text-sm text-slate-500">Folha Estimada</p>
                            <p className="text-2xl font-bold text-indigo-600">{formatCurrency(15000)}</p>
                        </div>
                    </div>

                    <h3 className="text-xl font-bold text-slate-800 mb-4">Folha de Pagamento e Diarias</h3>
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-100 text-xs text-slate-700 uppercase">
                            <tr>
                                <th className="p-3">Vencimento</th>
                                <th className="p-3">Beneficiario</th>
                                <th className="p-3">Referencia</th>
                                <th className="p-3">Valor</th>
                                <th className="p-3">Status</th>
                                <th className="p-3 text-right">Acao</th>
                            </tr>
                        </thead>
                        <tbody>
                            {payroll.map(pay => {
                                const emp = employeeById[pay.employeeId];
                                return (
                                    <tr key={pay.id} className="border-b hover:bg-slate-50">
                                        <td className="p-3">{pay.dueDate}</td>
                                        <td className="p-3 font-semibold">{emp?.name ?? 'N/D'}</td>
                                        <td className="p-3">{pay.period}</td>
                                        <td className="p-3 font-bold">{formatCurrency(pay.amount)}</td>
                                        <td className="p-3">
                                            <span className={`px-2 py-1 rounded-full text-xs font-bold ${pay.status === 'Pago' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                {pay.status}
                                            </span>
                                        </td>
                                        <td className="p-3 text-right">
                                            {pay.status === 'Pendente' && <button className="text-indigo-600 font-bold hover:underline">Pagar</button>}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {/* SAFETY TAB */}
            {activeTab === 'Safety' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="bg-white rounded-lg shadow-md p-6">
                        <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center">
                            <ShieldCheckIcon className="h-6 w-6 mr-2 text-emerald-600" />
                            Controle de EPIs
                        </h3>
                        <p className="text-sm text-slate-600 mb-4">Registre a entrega de equipamentos de protecao para garantir a conformidade.</p>
                        
                        <div className="space-y-4 mb-6">
                            {ppeOrders.map(order => {
                                const emp = employeeById[order.requesterId];
                                return (
                                    <div key={order.id} className="border border-slate-200 p-3 rounded-md flex justify-between items-center">
                                        <div>
                                            <p className="font-bold text-sm text-slate-800">{emp?.name ?? 'N/D'}</p>
                                            <p className="text-xs text-slate-600">{order.items}</p>
                                            <p className="text-xs text-slate-400">{order.date}</p>
                                        </div>
                                        <div className="text-right">
                                            <span className={`block px-2 py-1 text-xs rounded-full font-bold mb-1 ${order.status === 'Entregue' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                                {order.status}
                                            </span>
                                            {order.conformityDoc && <span className="text-[10px] text-indigo-600 font-bold">Ficha Assinada</span>}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        <button className="w-full border border-dashed border-slate-300 p-3 text-slate-500 rounded-md hover:bg-slate-50 text-sm font-semibold">
                            + Registrar Nova Entrega de EPI
                        </button>
                    </div>

                    <div className="bg-white rounded-lg shadow-md p-6">
                        <h3 className="text-xl font-bold text-slate-800 mb-4">Conformidade e Laudos</h3>
                        <div className="bg-orange-50 border-l-4 border-orange-500 p-4 mb-6">
                            <p className="font-bold text-orange-800 text-sm">Atencao Necessaria</p>
                            <p className="text-xs text-orange-700 mt-1">2 funcionarios com exames periodicos vencendo em 30 dias.</p>
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200">
                                <div>
                                    <p className="font-bold text-slate-800">Laudo de Conformidade Mensal</p>
                                    <p className="text-xs text-slate-500">Resumo de horas, EPIs e pagamentos.</p>
                                </div>
                                <button onClick={handleGenerateReport} className="text-indigo-600 hover:text-indigo-800">
                                    <DocumentTextIcon className="h-6 w-6" />
                                </button>
                            </div>
                            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200">
                                <div>
                                    <p className="font-bold text-slate-800">Ficha de EPI Digital</p>
                                    <p className="text-xs text-slate-500">Exportar assinaturas para auditoria.</p>
                                </div>
                                <button className="text-indigo-600 hover:text-indigo-800">
                                    <DocumentTextIcon className="h-6 w-6" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default WorkforceView;
