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

## 4. Fluxos de UX/UI Complexos Implementados

### Cadastro de Propriedade (`PropertyRegistrationView.tsx`)
1. **Busca CAR**: O usuário digita o número do CAR -> Sistema simula consulta API -> Retorna GeoJSON.
2. **Desenho de Talhões**: Usuário insere coordenadas manuais -> Sistema desenha polígonos SVG sobre o mapa de satélite.
3. **Cálculo de Capacidade**: Baseado no tamanho da área e tipo de cultivo/pasto.

### Manejo em Tempo Real (`LiveHandlingView.tsx`)
1. **Adaptação Setorial**: Lê `sectorUtils.ts` para saber se pede "Peso" (Gado) ou "Umidade" (Soja).
2. **Simulação IoT**: Botões simulam conexão com balanças ou leitores RFID.

### Estoque e Auditoria (`StockView.tsx`)
1. **Entrada**: Exige número de NF.
2. **Saída (Perda)**: Exige foto e justificativa.
3. **Auditoria**: Gera um hash simulado (Blockchain-like) para cada transação crítica.

## 5. Pontos para Análise e Melhoria (Prompt para IA)
Ao analisar este código, foque em:
1. **Performance**: O arquivo `constants.ts` está grande. Como migrar isso para um Context API ou State Management (Zustand/Redux) eficiente?
2. **Tipagem**: Verificar se `any` está sendo usado indevidamente em `sectorUtils.ts` ou nos componentes de mapa.
3. **Escalabilidade**: A lógica de renderização condicional do `Sidebar.tsx` baseada em permissões e setores pode ser abstraída para um hook `useNavigation`?
4. **Segurança**: Como garantir que a validação de regras em `rulesEngine.ts` seja executada obrigatoriamente antes de qualquer `setState` crítico?

