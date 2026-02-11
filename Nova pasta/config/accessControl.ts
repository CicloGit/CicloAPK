
import { User, ViewType } from '../types';

export const roleAccessConfig: Record<User['role'], ViewType[]> = {
    'Produtor': [
        'dashboard', 'producerPortal', 'stock', 'commercial', 'logistics', 
        'propertyRegistration', 'contracts', 'sales', 'financials', 'accountControl', 
        'management', 'futureMarket', 'workforce', 'liveHandling', 'integrations', 
        'fieldOperations', 'reports', 'carbonMarket', 'customInputRequest'
    ],
    'Produtor de Sementes': [
        'dashboard', 'stock', 'reports', 'integrations', 'financials'
    ],
    'Técnico': ['dashboard', 'technicianPortal', 'producerPortal', 'liveHandling', 'operatorPortal'],
    'Investidor': ['dashboard', 'investorPortal', 'finance'],
    'Fornecedor': ['dashboard', 'supplierPortal', 'stock', 'logistics', 'integrations'],
    'Operador': ['operatorPortal', 'liveHandling'],
    'Gestor': [
        'dashboard', 'producerPortal', 'technicianPortal', 'investorPortal', 'supplierPortal',
        'finance', 'stock', 'commercial', 'logistics', 'legal',
        'propertyRegistration', 'contracts', 'sales', 'financials', 'accountControl', 
        'management', 'futureMarket', 'workforce', 'operatorPortal', 'integrations', 
        'reports', 'carbonMarket'
    ],
    'Integradora': [
        'dashboard', 'integratorPortal', 'contracts', 'financials', 'logistics', 'integrations'
    ]
};
