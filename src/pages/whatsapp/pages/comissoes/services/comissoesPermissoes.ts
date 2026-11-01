import type {
  AcaoPermissaoComissao,
  ContextoPermissaoComissao,
  TipoUsuarioComissao,
} from "../types/comissoes";

const PERMISSOES_COMISSAO: Record<
  TipoUsuarioComissao,
  AcaoPermissaoComissao[]
> = {
  CORRETORA: [
    "VISUALIZAR",
    "CRIAR",
    "EDITAR",
    "RECONSTRUIR",
    "RECEBER",
    "ESTORNAR_RECEBIMENTO",
    "GERENCIAR_SPLITS",
    "CANCELAR_PROVISAO",
    "REVERTER_CANCELAMENTO_PROVISAO",
  ],

  CORRETOR: [
    "VISUALIZAR",
    "CRIAR",
    "EDITAR",
    "RECONSTRUIR",
    "RECEBER",
    "ESTORNAR_RECEBIMENTO",
    "GERENCIAR_SPLITS",
    "CANCELAR_PROVISAO",
    "REVERTER_CANCELAMENTO_PROVISAO",
  ],

  ADMIN: [],
};

export function podeExecutarAcaoComissao(
  contexto: ContextoPermissaoComissao,
  acao: AcaoPermissaoComissao
): boolean {
  if (
    !contexto?.tipoUsuario ||
    !contexto?.usuarioId
  ) {
    return false;
  }

  return PERMISSOES_COMISSAO[
    contexto.tipoUsuario
  ].includes(acao);
}

export function podeVisualizarComissao(
  contexto: ContextoPermissaoComissao
): boolean {
  return podeExecutarAcaoComissao(
    contexto,
    "VISUALIZAR"
  );
}

export function podeCriarComissao(
  contexto: ContextoPermissaoComissao
): boolean {
  return podeExecutarAcaoComissao(
    contexto,
    "CRIAR"
  );
}

export function podeEditarComissao(
  contexto: ContextoPermissaoComissao
): boolean {
  return podeExecutarAcaoComissao(
    contexto,
    "EDITAR"
  );
}

export function podeReconstruirComissao(
  contexto: ContextoPermissaoComissao
): boolean {
  return podeExecutarAcaoComissao(
    contexto,
    "RECONSTRUIR"
  );
}

export function podeReceberComissao(
  contexto: ContextoPermissaoComissao
): boolean {
  return podeExecutarAcaoComissao(
    contexto,
    "RECEBER"
  );
}

export function podeEstornarRecebimentoComissao(
  contexto: ContextoPermissaoComissao
): boolean {
  return podeExecutarAcaoComissao(
    contexto,
    "ESTORNAR_RECEBIMENTO"
  );
}

export function podeGerenciarSplitsComissao(
  contexto: ContextoPermissaoComissao
): boolean {
  return podeExecutarAcaoComissao(
    contexto,
    "GERENCIAR_SPLITS"
  );
}





export function podeCancelarProvisaoComissao(
  contexto: ContextoPermissaoComissao
): boolean {
  return podeExecutarAcaoComissao(
    contexto,
    "CANCELAR_PROVISAO"
  );
}

export function podeReverterCancelamentoProvisaoComissao(
  contexto: ContextoPermissaoComissao
): boolean {
  return podeExecutarAcaoComissao(
    contexto,
    "REVERTER_CANCELAMENTO_PROVISAO"
  );
}

export function usuarioPodeOperarComissoes(
  contexto: ContextoPermissaoComissao
): boolean {
  return (
    podeCriarComissao(contexto) ||
    podeEditarComissao(contexto) ||
    podeReconstruirComissao(contexto) ||
    podeReceberComissao(contexto) ||
    podeEstornarRecebimentoComissao(contexto) ||
    podeGerenciarSplitsComissao(contexto) ||
    podeCancelarProvisaoComissao(contexto) ||
    podeReverterCancelamentoProvisaoComissao(contexto)
  );
}

export function usuarioSomenteVisualizaComissoes(
  contexto: ContextoPermissaoComissao
): boolean {
  return (
    podeVisualizarComissao(contexto) &&
    !usuarioPodeOperarComissoes(contexto)
  );
}