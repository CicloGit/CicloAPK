
# EXPORTAÇÃO DO PROJETO CICLO+ ERP
# Data: 07/06/2024
# Finalidade: Análise de Arquitetura e Melhorias (Claude/GPT)

---

## ARQUIVO: ARCHITECTURE_AND_SCHEMAS.md
```markdown
# Ciclo+ ERP - Arquitetura e Esquemas de Desenvolvimento

Este documento descreve a estrutura, o fluxo de dados e os principais componentes do sistema Ciclo+ para fins de análise e refatoração.

## 1. Visão Geral
O Ciclo+ é um ERP Agrícola modular desenvolvido em React/TypeScript. Ele utiliza uma arquitetura baseada em "Kernel" (Núcleo) e "Módulos", permitindo que diferentes setores produtivos (Soja, Gado, Café, etc.) utilizem a mesma base lógica com interfaces adaptáveis.

## 2. Estrutura de Diretórios
- **/components/views/**: Telas principais do sistema (ex: Financeiro, Estoque, Mapas).
- **/components/dashboards/**: Dashboards específicos por *Persona* (Produtor, Investidor, Técnico).
- **/config/sectorUtils.ts**: **[CRÍTICO]** Arquivo de configuração dinâmica. Define como a UI se comporta baseada no `ProductionSector` (ex: muda labels de "Animal" para "Talhão" se for Agricultura).
- **/constants.ts**: "Banco de Dados" simulado. Contém todos os Mocks e definições de tipos estáticos.
- **/services/**: Camada de abstração de lógica (ex: `stockService.ts` simula validação de regras e auditoria).
- **/types.ts**: Definições de tipagem TypeScript (Interfaces e Types).

## 3. Esquemas de Dados Principais (Entities)

### Propriedade e Geo (`Property`)
Representa a fazenda.
- Campos Chave: `perimeter` (Polígono Lat/Long), `infrastructure` (Pontos de interesse), `pastures` (Divisões internas/Talhões).
- Integração: O sistema simula busca de dados governamentais (CAR/SICAR) para preencher o perímetro.

### Projeto Produtivo (`ProductionProject`)
A unidade central de custo e lucro.
- Tipos: Agricultura, Pecuária, etc.
- Ciclo de Vida: Planejamento -> Em Andamento -> Concluído.
- Relacionamento: Um projeto possui `FinancialDetails` e `AnimalProductionDetails` (ou equivalentes agrícolas).

### Movimentação de Estoque (`StockMovement`)
Controla o fluxo de insumos com auditoria.
- Estados: `PENDING_APPROVAL` -> `INVOICE_REQUIRED` -> `AUDITED`.
- Regra de Negócio: Saídas de "Perda" exigem prova digital (foto/url) e geram hash de auditoria.

### Finanças e UPCL (`Receivable` / `Transaction`)
Simula um sistema de liquidação financeira.
- Lógica de Split: Pagamentos recebidos são divididos automaticamente entre Produtor, Plataforma e Logística.
- Escrow: Valores ficam bloqueados até a confirmação de etapas (ex: Entrega física).
```

---

## ARQUIVO: types.ts
```typescript
export type ViewType = 
  'dashboard' | 
  'architecture' | 
  'dataDictionary' | 
  'operations' | 
  'flows' | 
  'eventsMatrix' | 
  'systemConfig' | 
  'producerPortal' | 
  'technicianPortal' | 
  'investorPortal' | 
  'supplierPortal' | 
  'integratorPortal' | 
  'operatorPortal' | 
  'finance' | 
  'stock' | 
  'commercial' | 
  'logistics' | 
  'legal'|
  'propertyRegistration' |
  'operationalAction' |
  'contracts' |
  'sales' |
  'financials' |
  'accountControl' |
  'management' |
  'futureMarket' |
  'workforce' |
  'publicMarket' |
  'aiAnalysis' |
  'liveHandling' |
  'integrations' |
  'fieldOperations' |
  'reports' |
  'carbonMarket' | 
  'customInputRequest' |
  'mobileApp';

export type ProductionSector = 
    'Agricultura' | 
    'Hortifruti' | 
    'Fruticultura' |
    'Pecuária (Bovinos Corte)' | 
    'Pecuária (Bovinos Leite)' |
    'Silvicultura' | 
    'Apicultura' | 
    'Piscicultura' | 
    'Avicultura' | 
    'Suinocultura' | 
    'Ovinocultura' |
    'Equinocultura' |
    'Caprinocultura' |
    'Produção de Sementes';

// ... (Outros tipos principais omitidos para brevidade, mas devem ser considerados na análise) ...

export interface Property {
    id: string;
    name: string;
    carNumber: string;
    totalArea: number;
    currentStockingCapacity: number;
    animalCount: number;
    pastureManagementHistory: PastureManagementHistoryItem[];
    pastureInvestmentPerHa?: number;
    cattleInvestmentPerHa?: number;
    infrastructure?: MapInfrastructure[];
    machinery?: Machinery[];
    perimeter?: { x: number, y: number }[];
    satelliteImageUrl?: string;
}

export interface Pasture {
    id: string;
    name: string;
    area: number;
    grassHeight: number;
    cultivar: string;
    estimatedForageProduction: number;
    grazingPeriod: { start: string, end: string };
    entryDate: string;
    exitDate: string;
    stockingRate: string;
    managementRecommendations: string[];
    managementHistory: string[];
    animals: Animal[];
    polygon?: { x: number, y: number }[];
    center?: { x: number, y: number };
}
```

---

## ARQUIVO: config/sectorUtils.ts
```typescript
import { ProductionSector, ViewType } from '../types';

export interface SectorConfig {
    labels: {
        liveHandling: string;
        management: string;
        unit: string;
        group: string;
    };
    managementTabs: string[];
    liveHandling: {
        title: string;
        primaryInput: string;
        primaryUnit: string;
        actions: string[];
    };
    navigation: {
        view: ViewType;
        label: string;
    }[];
    supportedViews: ViewType[];
}

export const getSectorSettings = (sector: ProductionSector | undefined): SectorConfig => {
    // ... (Lógica de configuração dinâmica por setor) ...
    // Exemplo para Agricultura:
    // labels: { liveHandling: 'Monitoramento de Campo', management: 'Tratos Culturais', unit: 'Talhão', group: 'Safra' }
    // Exemplo para Pecuária:
    // labels: { liveHandling: 'Curral Inteligente', management: 'Manejo Sanitário/Nutricional', unit: 'Animal', group: 'Lote/Pasto' }
    
    // (Consulte o arquivo original para a implementação completa do switch/case)
    return {} as SectorConfig; // Placeholder para exportação
};
```

---

## ARQUIVO: lib/rulesEngine.ts
```typescript
import { InventoryItem } from '../types';

export type Rule = (data: any, context: any) => { success: boolean, message?: string };

export class RulesEngine {
    static validate(rules: Rule[], data: any, context: any): { success: boolean, errors: string[] } {
        const errors: string[] = [];
        for (const rule of rules) {
            const result = rule(data, context);
            if (!result.success) {
                errors.push(result.message || 'Validation failed');
            }
        }
        return { success: errors.length === 0, errors };
    }
}

export const hasSufficientStock: Rule = (data: { quantity: number }, context: { item: InventoryItem }) => {
    if (context.item.quantity >= data.quantity) {
        return { success: true };
    }
    return { 
        success: false, 
        message: `Estoque insuficiente para ${context.item.name}. Saldo: ${context.item.quantity}, Requisitado: ${data.quantity}` 
    };
};
```

---

## ARQUIVO: services/stockService.ts
```typescript
import { mockInventoryItems, mockStockMovements, mockAuditEvents } from '../constants';
import { InventoryItem, StockMovement, AuditEvent } from '../types';
import { RulesEngine, hasSufficientStock } from '../lib/rulesEngine';
import { AuditChain } from '../lib/auditChain';

// Simula backend/controller
export const stockService = {
    async registerStockUsage(
        data: { itemId: string; quantity: number; reason: string; proofUrl: string; requester: string }
    ): Promise<{ success: boolean; message?: string; newMovement?: StockMovement; auditEvent?: AuditEvent }> {
        
        // Lógica simulada de acesso ao DB
        const item = mockInventoryItems.find(i => i.id === data.itemId); // Em prod, usaria DB real
        if (!item) return { success: false, message: 'Item não encontrado.' };

        // 1. Regras
        const validation = RulesEngine.validate([hasSufficientStock], { quantity: data.quantity }, { item });
        if (!validation.success) return { success: false, message: validation.errors.join(', ') };

        // 2. Auditoria (Blockchain-like)
        const previousHash = '0000...'; // Simplificado
        const auditData = { ...data, action: 'STOCK_OUTBOUND_LOSS', verified: true };
        const newAuditEvent = await AuditChain.createAuditEvent(auditData, previousHash);
        
        // 3. Persistência
        const newMovement: StockMovement = {
            id: `MOV-${Date.now()}`,
            itemId: data.itemId,
            itemName: item.name,
            type: 'OUTBOUND_LOSS',
            quantity: data.quantity,
            unit: item.unit,
            date: new Date().toLocaleDateString('pt-BR'),
            status: 'AUDITED',
            requester: data.requester,
            reason: data.reason,
            proofUrl: data.proofUrl,
            auditHash: newAuditEvent.hash,
        };

        return { success: true, newMovement, auditEvent: newAuditEvent };
    }
};
```

---

## ARQUIVO: components/views/PropertyRegistrationView.tsx
(Contém a lógica de integração com CAR e desenho de mapas vetoriais)
```tsx
// ... imports ...

const PropertyRegistrationView: React.FC = () => {
    // ... states ...
    
    // Funcionalidade de Busca CAR (Simulada)
    const handleSearchCAR = () => {
        // Simula delay de API e retorno do SICAR
        // Retorna polígono GeoJSON (convertido para coordenadas locais SVG)
    };

    // Funcionalidade de Desenho de Divisões
    const handleSaveDivision = () => {
        // Recebe Lat/Long manuais, converte para SVG Point e salva no estado `mapPastures`
    };

    // ... renderização do componente e integração com PropertyMapView ...
};
```

---

## ARQUIVO: components/views/maps/PropertyMapView.tsx
(Renderiza o SVG interativo com camadas)
```tsx
// ... imports ...

const PropertyMapView: React.FC<PropertyMapViewProps> = ({ property, pastures }) => {
    // Gerencia camadas (layers): Satélite, Perímetro CAR, Pastos, Infraestrutura
    
    // Renderiza SVG com coordenadas relativas (0-100) mapeadas sobre a imagem de satélite
    return (
        <div className="relative ...">
            <img src={property.satelliteImageUrl} ... />
            <svg viewBox="0 0 100 100" ...>
                {layers.sicar && renderPerimeter()}
                {layers.pastures && pastures.map(renderPolygon)}
                {/* ... */}
            </svg>
        </div>
    );
};
```

---

**Observação para Análise:**
Este export contém os arquivos estruturais e lógicos mais importantes. Arquivos de ícones (`components/icons/*`) e componentes puramente visuais foram omitidos para focar na arquitetura de software, fluxo de dados e regras de negócio.
