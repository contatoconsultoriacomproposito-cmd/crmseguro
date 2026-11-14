import type { SelecoesFiltroComissao } from "../types/comissoes";
/** Aceita valores legados simples e as novas seleções múltiplas. */
export function valoresFiltro<T extends string = string>(
  valor?: SelecoesFiltroComissao<T> | "" | null
): T[] {
  if (!valor) return [];
  return (Array.isArray(valor) ? valor : [valor]).filter(Boolean) as T[];
}
export function incluiFiltro<T extends string = string>(
  valor: SelecoesFiltroComissao<T> | "" | undefined,
  candidato: string | null | undefined
): boolean {
  const marcados = valoresFiltro(valor);
  return !marcados.length || (candidato != null && marcados.includes(candidato as T));
}
export function temFiltro(valor?: string | string[] | null): boolean {
  return valoresFiltro(valor).length > 0;
}
