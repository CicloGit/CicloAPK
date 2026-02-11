
// Simulação de Zod para ambientes sem o pacote instalado, 
// mantendo a estrutura para fácil migração.

export interface ValidationResult {
    success: boolean;
    error?: string;
    data?: any;
}

export const Validators = {
    property: (data: any): ValidationResult => {
        const errors: string[] = [];
        
        if (!data.name || data.name.length < 3) errors.push("Nome da propriedade muito curto.");
        if (!data.carNumber || !/^[A-Z]{2}-\d+/.test(data.carNumber)) errors.push("Formato do CAR inválido (Ex: MT-12345).");
        if (data.totalArea <= 0) errors.push("Área total deve ser maior que zero.");
        if (data.currentStockingCapacity < 0) errors.push("Capacidade não pode ser negativa.");
        
        return {
            success: errors.length === 0,
            error: errors.join(' '),
            data
        };
    },

    division: (data: any): ValidationResult => {
        const errors: string[] = [];
        if (!data.name) errors.push("Nome da divisão é obrigatório.");
        if (!data.points || data.points.length < 3) errors.push("Polígono deve ter no mínimo 3 pontos.");
        
        return {
            success: errors.length === 0,
            error: errors.join(' '),
            data
        };
    },

    activity: (data: any): ValidationResult => {
        const errors: string[] = [];
        if (!data.sector) errors.push("Selecione um setor produtivo.");
        if (!data.name) errors.push("Nome da atividade é obrigatório.");
        
        return {
            success: errors.length === 0,
            error: errors.join(' '),
            data
        };
    },

    stockMovement: (data: any): ValidationResult => {
        const errors: string[] = [];
        if (!data.itemId) errors.push("Selecione um item.");
        if (!data.quantity || Number(data.quantity) <= 0) errors.push("Quantidade inválida.");
        
        if (data.type === 'OUTBOUND_LOSS') {
            if (!data.reason || data.reason.length < 5) errors.push("Motivo da perda é obrigatório e deve ser detalhado.");
            if (!data.proofUrl && !data.hasPhoto) errors.push("Foto comprovatória é obrigatória para perdas.");
        }

        if (data.type === 'INBOUND_PURCHASE') {
             // In a real scenario, we would validate invoice format
             if(data.invoiceNumber && data.invoiceNumber.length < 3) errors.push("Número da Nota Fiscal inválido.");
        }

        return {
            success: errors.length === 0,
            error: errors.join(' '),
            data
        };
    },

    operationalAction: (data: any): ValidationResult => {
        const errors: string[] = [];
        // Generic validation for dynamic forms
        const requiredFields = ['target', 'date', 'value']; // Simplified logic
        
        // Specific checks based on action type could go here
        if(data.actionType === 'registerAnimal' && !data.id) errors.push("ID do animal é obrigatório.");
        if(data.actionType === 'registerPlanting' && !data.area) errors.push("Área/Talhão é obrigatório.");

        return {
            success: errors.length === 0,
            error: errors.join(' '),
            data
        };
    }
};
