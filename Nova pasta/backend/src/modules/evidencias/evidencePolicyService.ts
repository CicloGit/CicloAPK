import { eventEvidencePolicies } from '../../config/evidencePolicy';
import { ApplicationError } from '../../shared/errors/ApplicationError';

export interface ValidatableEvidence {
  evidenceKind: string;
}

export function validateEvidences(eventType: string, evidences: ValidatableEvidence[]): void {
  const policy = eventEvidencePolicies.find((item) => item.eventType === eventType);
  if (!policy) {
    return;
  }

  const evidenceKinds = new Set(evidences.map((item) => item.evidenceKind.toUpperCase()));
  const hasAnyValidCombination = policy.requiredAnyOf.some((combination) =>
    combination.every((item) => evidenceKinds.has(item)),
  );

  if (!hasAnyValidCombination) {
    throw new ApplicationError(
      `Evidencias insuficientes para ${eventType}. Regras: ${JSON.stringify(policy.requiredAnyOf)}`,
      400,
      'EVIDENCE_POLICY_VIOLATION',
    );
  }
}
