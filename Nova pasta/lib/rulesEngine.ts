import { InventoryItem } from '../types';

export type Rule = (data: any, context: any) => { success: boolean, message?: string };

/**
 * Simula o motor de regras de pré-execução, validando dados contra um
 * conjunto de regras de negócio antes de persistir mudanças.
 */
export class RulesEngine {
    /**
     * Executa um conjunto de regras contra um payload de dados.
     * @param rules Array de funções de regra a serem executadas.
     * @param data Os dados da operação a serem validados.
     * @param context Dados adicionais necessários para a validação (ex: estado atual do sistema).
     * @returns Um objeto com o resultado da validação e uma lista de erros.
     */
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

// REGRA EXEMPLO: Garante que a quantidade solicitada para baixa não é maior que o saldo.
export const hasSufficientStock: Rule = (data: { quantity: number }, context: { item: InventoryItem }) => {
    if (context.item.quantity >= data.quantity) {
        return { success: true };
    }
    return { 
        success: false, 
        message: `Estoque insuficiente para ${context.item.name}. Saldo: ${context.item.quantity}, Requisitado: ${data.quantity}` 
    };
};
