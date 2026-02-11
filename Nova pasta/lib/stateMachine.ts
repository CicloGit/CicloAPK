import { StockMovement, StockStatus } from '../types';

// Define as transições de estado permitidas para movimentações de estoque.
type StockStateTransition = {
    from: StockStatus[];
    to: StockStatus;
};

const validTransitions: Record<string, StockStateTransition> = {
    APPROVE: { from: ['PENDING_APPROVAL'], to: 'APPROVED' },
    COMPLETE_INVOICE: { from: ['INVOICE_REQUIRED'], to: 'COMPLETED' },
    AUDIT: { from: ['APPROVED', 'PENDING_APPROVAL'], to: 'AUDITED' },
};

/**
 * Simula a máquina de estados formal para controlar o ciclo de vida
 * das movimentações de estoque.
 */
export class StockMovementStateMachine {
    /**
     * Tenta transicionar o estado de uma movimentação.
     * @param movement O objeto de movimentação atual.
     * @param action A ação que dispara a transição.
     * @returns A movimentação com o novo estado.
     * @throws {Error} se a transição for inválida.
     */
    static transition(movement: StockMovement, action: 'APPROVE' | 'COMPLETE_INVOICE' | 'AUDIT'): StockMovement {
        const transition = validTransitions[action];
        if (transition && transition.from.includes(movement.status)) {
            return { ...movement, status: transition.to };
        }
        throw new Error(`Transição inválida de ${movement.status} com a ação ${action}`);
    }

    /**
     * Verifica se uma transição é possível sem executá-la.
     * @param movement O objeto de movimentação atual.
     * @param action A ação a ser verificada.
     * @returns {boolean} True se a transição for válida.
     */
    static canTransition(movement: StockMovement, action: 'APPROVE' | 'COMPLETE_INVOICE' | 'AUDIT'): boolean {
        const transition = validTransitions[action];
        return transition ? transition.from.includes(movement.status) : false;
    }
}
