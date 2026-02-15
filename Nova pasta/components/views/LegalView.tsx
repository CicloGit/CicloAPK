import React, { useEffect, useMemo, useState } from 'react';
import LoadingSpinner from '../shared/LoadingSpinner';
import { legalService, LegalComplianceAlert, LegalContract, LegalLicense } from '../../services/legalService';

const LegalView: React.FC = () => {
  const [contracts, setContracts] = useState<LegalContract[]>([]);
  const [licenses, setLicenses] = useState<LegalLicense[]>([]);
  const [alerts, setAlerts] = useState<LegalComplianceAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    const loadLegal = async () => {
      setIsLoading(true);
      setLoadError(null);
      try {
        const [loadedContracts, loadedLicenses, loadedAlerts] = await Promise.all([
          legalService.listContracts(),
          legalService.listLicenses(),
          legalService.listComplianceAlerts(),
        ]);
        setContracts(loadedContracts);
        setLicenses(loadedLicenses);
        setAlerts(loadedAlerts);
      } catch {
        setLoadError('Nao foi possivel carregar o modulo juridico.');
      } finally {
        setIsLoading(false);
      }
    };

    void loadLegal();
  }, []);

  const openAlerts = useMemo(
    () => alerts.filter((item) => item.status === 'ABERTO'),
    [alerts]
  );

  if (isLoading) {
    return <LoadingSpinner text="Carregando juridico..." />;
  }

  if (loadError) {
    return <div className="p-6 bg-red-50 text-red-700 border border-red-200 rounded-lg">{loadError}</div>;
  }

  return (
    <div>
      <h2 className="text-3xl font-bold text-slate-800 mb-2">Modulo Juridico</h2>
      <p className="text-slate-600 mb-8">Governanca contratual, licencas e compliance ambiental.</p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-md p-5">
          <p className="text-xs text-slate-500 uppercase font-semibold">Contratos Ativos</p>
          <p className="text-2xl font-bold text-slate-800 mt-2">{contracts.filter(c => c.status === 'ATIVO').length}</p>
        </div>
        <div className="bg-white rounded-lg shadow-md p-5">
          <p className="text-xs text-slate-500 uppercase font-semibold">Licencas Validas</p>
          <p className="text-2xl font-bold text-emerald-600 mt-2">{licenses.filter(l => l.status === 'VALIDA').length}</p>
        </div>
        <div className="bg-white rounded-lg shadow-md p-5">
          <p className="text-xs text-slate-500 uppercase font-semibold">Alertas em Aberto</p>
          <p className="text-2xl font-bold text-red-600 mt-2">{openAlerts.length}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="font-bold text-slate-800 mb-4">Contratos</h3>
          <div className="space-y-4">
            {contracts.map(contract => (
              <div key={contract.id} className="border border-slate-200 rounded-lg p-4">
                <p className="text-sm font-semibold text-slate-700">{contract.title}</p>
                <p className="text-xs text-slate-500">{contract.counterpart}</p>
                <div className="flex justify-between text-xs text-slate-500 mt-2">
                  <span>Assinado: {contract.signedAt}</span>
                  <span>Expira: {contract.expiresAt}</span>
                </div>
                <span className="mt-2 inline-block text-xs px-2 py-1 rounded-full bg-slate-100 text-slate-700">
                  {contract.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="font-bold text-slate-800 mb-4">Licencas</h3>
          <div className="space-y-4">
            {licenses.map(license => (
              <div key={license.id} className="border border-slate-200 rounded-lg p-4">
                <p className="text-sm font-semibold text-slate-700">{license.name}</p>
                <p className="text-xs text-slate-500">{license.agency}</p>
                <div className="flex justify-between text-xs text-slate-500 mt-2">
                  <span>Validade: {license.expiresAt}</span>
                  <span>{license.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="font-bold text-slate-800 mb-4">Compliance</h3>
          <div className="space-y-4">
            {alerts.map(alert => (
              <div key={alert.id} className="border border-slate-200 rounded-lg p-4">
                <p className="text-sm font-semibold text-slate-700">{alert.title}</p>
                <div className="flex justify-between text-xs text-slate-500 mt-2">
                  <span>Prazo: {alert.dueDate}</span>
                  <span>{alert.severity}</span>
                </div>
                <span className={`mt-2 inline-block text-xs px-2 py-1 rounded-full ${alert.status === 'ABERTO' ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>
                  {alert.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LegalView;
