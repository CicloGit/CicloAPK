# Firestore Database Schema (Ciclo+)

## Core Collections

- `users`: profile and role (`name`, `email`, `role`, `createdAt`, `updatedAt`)
- `properties`: farm master data and geometry
- `pastures`: pasture divisions linked by `propertyId`
- `productionProjects`: production units/activities

## Operations

- `operationalActions`: submitted operational actions (`projectId`, `actionType`, `formData`, `createdBy`)
- `operatorTasks`: task execution queue for operators
- `operatorRequests`: procurement/maintenance requests
- `fieldDiaryEntries`: field diary entries (audio/photo + transcript)
- `liveHandlingHistory`: real-time handling records
- `managementHistory`: management records submitted from management screen

## Inventory and Logistics

- `inventoryItems`
- `stockMovements`
- `auditEvents`
- `logisticsEntries`

## Finance and Market

- `bankAccounts`
- `transactions`
- `receivables`
- `expenses`
- `salesOffers`
- `marketplaceListings`
- `marketplaceOrders`
- `supplierOrders`
- `supplierFinancials`

## Integrator / Demand side

- `integratedProducers`
- `partnershipOffers`
- `integratorMessages`

## Public intelligence

- `marketTrends`
- `regionalStats`
- `newsItems`
- `auctionListings`
- `marketSaturation`

## Governance and Compliance

- `legalContracts`
- `legalLicenses`
- `legalComplianceAlerts`
- `systemConfigs`
- `operationsTable`
- `eventsMatrix`
- `architectureNodes`
- `dataDictionaryEntities`

## Notes

- Most collections store `createdAt` and `updatedAt` as server timestamps.
- Role-based access is enforced in `firestore.rules` through `users/{uid}.role`.
- Public read is intentionally enabled only for market intelligence collections.
