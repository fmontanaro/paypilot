/** Somas de registros manuais em centavos, dentro de numeric(14,2). */
export function goalBalanceAfter(balance: number, delta: number): number {
  const result = Math.round(balance * 100) + Math.round(delta * 100);
  if (!Number.isSafeInteger(result) || result < 0 || result > 99_999_999_999_999) {
    throw new RangeError("Saldo inválido.");
  }
  return result / 100;
}
