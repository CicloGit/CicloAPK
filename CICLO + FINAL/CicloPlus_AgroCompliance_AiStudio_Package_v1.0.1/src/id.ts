import { v4 as uuidv4 } from "uuid";

/**
 * Dígito verificador por Luhn (mod 10).
 * Entrada: apenas dígitos.
 */
export function luhnDigit(baseDigits: string): number {
  const digits = baseDigits.replace(/\D/g, "").split("").map(d => parseInt(d, 10));
  let sum = 0;
  let doubleIt = true; // começa dobrando a partir do último dígito
  for (let i = digits.length - 1; i >= 0; i--) {
    let n = digits[i];
    if (doubleIt) {
      n = n * 2;
      if (n > 9) n = n - 9;
    }
    sum += n;
    doubleIt = !doubleIt;
  }
  const mod = sum % 10;
  return (10 - mod) % 10;
}

export function pad(num: number, size: number): string {
  const s = String(num);
  if (s.length >= size) return s;
  return "0".repeat(size - s.length) + s;
}

export function newId(): string {
  return uuidv4();
}

/**
 * Gera código curto da mãe: ORG-SEQ(5)-DC
 * ORG deve ter 2 ou 3 caracteres.
 * DC calculado sobre SEQ (cinco dígitos). (Mais simples e suficiente para evitar erro humano)
 */
export function makeMotherCode(orgCode: string, seq: number): string {
  const seq5 = pad(seq, 5);
  const dc = luhnDigit(seq5);
  return `${orgCode}-${seq5}-${dc}`;
}

export function makeCalfCode(motherCode: string, childSeq: number): string {
  return `${motherCode}-${pad(childSeq, 2)}`;
}
