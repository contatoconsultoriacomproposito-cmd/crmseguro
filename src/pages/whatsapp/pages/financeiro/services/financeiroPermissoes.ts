import type {
  ContextoPermissaoFinanceiro,
  TipoUsuarioFinanceiro,
} from "../types/financeiro";

export type AcaoPermissaoFinanceiro =
  | "VISUALIZAR"
  | "CRIAR"
  | "EDITAR"
  | "BAIXAR"
  | "BAIXAR_LOTE"
  | "ESTORNAR"
  | "RECONSTRUIR"
  | "LANCAMENTO_AVULSO";

export interface ResultadoPermissaoFinanceiro {
  acao: AcaoPermissaoFinanceiro;
  permitido: boolean;
  motivoBloqueio: string | null;
}

function usuarioPodeOperarFinanceiro(
  tipoUsuario: TipoUsuarioFinanceiro,
): boolean {
  return (
    tipoUsuario === "CORRETORA" ||
    tipoUsuario === "CORRETOR"
  );
}

function obterMotivoBloqueio(
  acao: AcaoPermissaoFinanceiro,
  tipoUsuario: TipoUsuarioFinanceiro,
): string {
  if (tipoUsuario === "CORRETOR") {
    if (acao === "VISUALIZAR") return "";
    return "Você não possui permissão para operar o financeiro deste contrato.";
  }

  if (tipoUsuario === "ADMIN") {
    return "O perfil ADMIN ainda não possui permissão financeira definida.";
  }

  return "Você não possui permissão para executar esta ação financeira.";
}

export function podeVisualizarFinanceiro(
  contexto: ContextoPermissaoFinanceiro,
): boolean {
  return (
    contexto.tipoUsuario === "CORRETORA" ||
    contexto.tipoUsuario === "CORRETOR"
  );
}

export function podeOperarFinanceiro(
  contexto: ContextoPermissaoFinanceiro,
): boolean {
  return usuarioPodeOperarFinanceiro(
    contexto.tipoUsuario,
  );
}

export function verificarPermissaoFinanceiro(
  contexto: ContextoPermissaoFinanceiro,
  acao: AcaoPermissaoFinanceiro,
): ResultadoPermissaoFinanceiro {
  if (acao === "VISUALIZAR") {
    const permitido =
      podeVisualizarFinanceiro(contexto);

    return {
      acao,
      permitido,
      motivoBloqueio: permitido
        ? null
        : obterMotivoBloqueio(
            acao,
            contexto.tipoUsuario,
          ),
    };
  }

  const permitido =
    podeOperarFinanceiro(contexto);

  return {
    acao,
    permitido,
    motivoBloqueio: permitido
      ? null
      : obterMotivoBloqueio(
          acao,
          contexto.tipoUsuario,
        ),
  };
}

export function obterPermissoesFinanceiro(
  contexto: ContextoPermissaoFinanceiro,
): ResultadoPermissaoFinanceiro[] {
  const acoes: AcaoPermissaoFinanceiro[] = [
    "VISUALIZAR",
    "CRIAR",
    "EDITAR",
    "BAIXAR",
    "BAIXAR_LOTE",
    "ESTORNAR",
    "RECONSTRUIR",
    "LANCAMENTO_AVULSO",
  ];

  return acoes.map((acao) =>
    verificarPermissaoFinanceiro(
      contexto,
      acao,
    ),
  );
}

export function podeExecutarAcaoFinanceiro(
  contexto: ContextoPermissaoFinanceiro,
  acao: AcaoPermissaoFinanceiro,
): boolean {
  return verificarPermissaoFinanceiro(
    contexto,
    acao,
  ).permitido;
}

export function buscarPermissaoFinanceiro(
  permissoes: ResultadoPermissaoFinanceiro[],
  acao: AcaoPermissaoFinanceiro,
): ResultadoPermissaoFinanceiro | null {
  return (
    permissoes.find(
      (permissao) =>
        permissao.acao === acao,
    ) ?? null
  );
}