import { AuditEvent } from '../types';

/**
 * Função utilitária para calcular o hash SHA-256 de uma string.
 * Usa a API nativa do navegador `crypto.subtle`.
 */
async function sha256(message: string): Promise<string> {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Simula a criação de um log de auditoria imutável, encadeando hashes
 * para garantir a integridade da trilha (Blockchain-like).
 */
export class AuditChain {
    /**
     * Cria e hasheia um novo evento de auditoria.
     * @param data Os dados do evento a serem registrados.
     * @param previousHash O hash do último evento na cadeia.
     * @returns O objeto de evento completo, incluindo seu novo hash.
     */
    static async createAuditEvent(
        data: Omit<AuditEvent, 'id' | 'timestamp' | 'hash'>, 
        previousHash: string
    ): Promise<AuditEvent> {
        
        const event: Omit<AuditEvent, 'hash'> = {
            ...data,
            id: `AUD-${Date.now()}`,
            timestamp: new Date().toISOString(),
        };

        // O encadeamento é crucial: o novo hash depende do conteúdo E do hash anterior.
        const contentToHash = JSON.stringify(event) + previousHash;
        const hash = await sha256(contentToHash);

        return { ...event, hash };
    }
}
