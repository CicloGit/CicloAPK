import React from 'react';
import { useNavigate } from 'react-router-dom';
import { User, OperationalActionType } from '../../types';
import { useApp } from '../../contexts/AppContext';
import ProducerDashboard from '../dashboards/ProducerDashboard';
import ManagerDashboard from '../dashboards/ManagerDashboard';
import TechnicianDashboard from '../dashboards/TechnicianDashboard';
import InvestorDashboard from '../dashboards/InvestorDashboard';
import SupplierDashboard from '../dashboards/SupplierDashboard';
import IntegratorDashboard from '../dashboards/IntegratorDashboard';

const DashboardView: React.FC = () => {
  const { currentUser, selectedProductionId, setSelectedProductionId, setCurrentAction } = useApp();
  const navigate = useNavigate();

  if (!currentUser) {
    return null; // Should be redirected by ProtectedRoute
  }

  const handleActionNavigation = (action: OperationalActionType) => {
    setCurrentAction(action);
    navigate('/operational-action');
  };

  const renderDashboardByRole = () => {
    switch (currentUser.role) {
      case 'Produtor':
        return (
          <ProducerDashboard
            selectedProductionId={selectedProductionId}
            setSelectedProductionId={setSelectedProductionId}
            setCurrentAction={handleActionNavigation}
          />
        );
      case 'Gestor':
        return <ManagerDashboard />;
      case 'Técnico':
        return <TechnicianDashboard />;
      case 'Investidor':
        return <InvestorDashboard />;
      case 'Fornecedor':
        return <SupplierDashboard />;
      case 'Integradora':
        return <IntegratorDashboard />;
      default:
        // Fallback for any other defined role
        return (
          <ProducerDashboard
            selectedProductionId={selectedProductionId}
            setSelectedProductionId={setSelectedProductionId}
            setCurrentAction={handleActionNavigation}
          />
        );
    }
  };

  return <>{renderDashboardByRole()}</>;
};

export default DashboardView;
