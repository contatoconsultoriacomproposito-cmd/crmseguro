import type {
  PropostaDetalhada,
  StatusContrato,
} from '../types/propostas';

export type TipoUsuarioAcaoProposta =
  | 'CORRETORA'
  | 'CORRETOR'
  | 'ADMIN';

export type AcaoProposta =
  | 'EXCLUIR'
  | 'MARCAR_PERDIDA'
  | 'REABRIR'
  | 'REVERTER_VENDA'
  | 'CANCELAR_CONTRATO';

export type EscopoAcaoProposta = 'none' | 'own' | 'tenant';

export interface AcaoPropostaDisponivel {
  acao: AcaoProposta;
  permitido: boolean;
  motivoBloqueio: string | null;
}

export interface ContextoAcoesProposta {
  tipoUsuario: TipoUsuarioAcaoProposta;
  usuarioId: string;
  /**
   * Escopos efetivos da matriz operacoes.propostas, carregados pelo chamador.
   * Opcional durante a migração: quando ausente, permanece a regra legada
   * (CORRETORA/ADMIN na corretora; CORRETOR somente responsável).
   *
   * REABRIR exige simultaneamente update e lose.
   */
  escopos?: Partial<Record<'delete' | 'lose' | 'update' | 'reverse', EscopoAcaoProposta>>;
}

function criarAcao(
  acao: AcaoProposta,
  permitido: boolean,
  motivoBloqueio: string | null = null,
): AcaoPropostaDisponivel {
  return {
    acao,
    permitido,
    motivoBloqueio: permitido ? null : motivoBloqueio,
  };
}

function possuiContratoComStatus(
  proposta: PropostaDetalhada,
  status: StatusContrato,
): boolean {
  return proposta.contratos.some(contrato => contrato.status === status);
}

function possuiQualquerContrato(proposta: PropostaDetalhada): boolean {
  return proposta.contratos.length > 0;
}

function possuiContratoAguardandoEmissao(proposta: PropostaDetalhada): boolean {
  return possuiContratoComStatus(proposta, 'AGUARDANDO_EMISSAO');
}

function possuiContratoEmitido(proposta: PropostaDetalhada): boolean {
  return proposta.contratos.some(
    contrato =>
      contrato.status === 'ATIVO' ||
      contrato.status === 'CANCELADO' ||
      contrato.status === 'ENCERRADO' ||
      !!contrato.numero_apolice,
  );
}

function escopoPermite(
  escopo: EscopoAcaoProposta | undefined,
  proposta: PropostaDetalhada,
  usuarioId: string,
): boolean {
  if (escopo === 'tenant') return true;
  if (escopo === 'own') return proposta.corretor_id === usuarioId;
  return false;
}

function usuarioPodeExecutar(
  proposta: PropostaDetalhada,
  contexto: ContextoAcoesProposta,
  acao: AcaoProposta,
): boolean {
  if (acao === 'CANCELAR_CONTRATO') {
    // Operação ainda não implementada: nunca autorizar por esta matriz.
    return false;
  }

  // Durante a migração, consumidores que ainda não fornecem escopos seguem
  // o comportamento legado. Uma vez fornecido o objeto, a ausência de chave
  // significa "none" (negação por padrão), inclusive para administradores.
  if (!contexto.escopos) {
    return contexto.tipoUsuario === 'CORRETORA' ||
      contexto.tipoUsuario === 'ADMIN' ||
      proposta.corretor_id === contexto.usuarioId;
  }

  if (acao === 'REABRIR') {
    return escopoPermite(contexto.escopos.update, proposta, contexto.usuarioId) &&
      escopoPermite(contexto.escopos.lose, proposta, contexto.usuarioId);
  }

  const chave: 'delete' | 'lose' | 'reverse' =
    acao === 'EXCLUIR' ? 'delete' :
    acao === 'MARCAR_PERDIDA' ? 'lose' : 'reverse';

  return escopoPermite(contexto.escopos[chave], proposta, contexto.usuarioId);
}

function motivoSemPermissao(): string {
  return 'Você não possui permissão para esta ação nesta proposta.';
}

export function obterAcoesProposta(
  proposta: PropostaDetalhada,
  contexto: ContextoAcoesProposta,
): AcaoPropostaDisponivel[] {
  const possuiContrato = possuiQualquerContrato(proposta);
  const aguardandoEmissao = possuiContratoAguardandoEmissao(proposta);
  const contratoEmitido = possuiContratoEmitido(proposta);

  const podeExcluir = usuarioPodeExecutar(proposta, contexto, 'EXCLUIR');
  const podePerder = usuarioPodeExecutar(proposta, contexto, 'MARCAR_PERDIDA');
  const podeReabrir = usuarioPodeExecutar(proposta, contexto, 'REABRIR');
  const podeReverter = usuarioPodeExecutar(proposta, contexto, 'REVERTER_VENDA');

  const excluir = proposta.status === 'EM_NEGOCIACAO' && !possuiContrato && podeExcluir;
  const marcarPerdida = proposta.status === 'EM_NEGOCIACAO' && !possuiContrato && podePerder;
  const reabrir = proposta.status === 'PERDIDA' && !possuiContrato && podeReabrir;
  const reverterVenda = proposta.status === 'VENDIDA' &&
    possuiContrato && aguardandoEmissao && !contratoEmitido && podeReverter;

  return [
    criarAcao(
      'EXCLUIR', excluir,
      !podeExcluir ? motivoSemPermissao() :
      proposta.status !== 'EM_NEGOCIACAO' ? 'Somente propostas em negociação podem ser excluídas.' :
      possuiContrato ? 'Esta proposta possui contrato vinculado e não pode ser excluída.' :
      'A proposta não pode ser excluída.',
    ),
    criarAcao(
      'MARCAR_PERDIDA', marcarPerdida,
      !podePerder ? motivoSemPermissao() :
      proposta.status !== 'EM_NEGOCIACAO' ? 'Somente propostas em negociação podem ser marcadas como perdidas.' :
      possuiContrato ? 'Uma proposta com contrato vinculado não pode ser marcada como perdida.' :
      'A proposta não pode ser marcada como perdida.',
    ),
    criarAcao(
      'REABRIR', reabrir,
      !podeReabrir ? motivoSemPermissao() :
      proposta.status !== 'PERDIDA' ? 'Somente propostas perdidas podem ser reabertas.' :
      possuiContrato ? 'Esta proposta possui contrato vinculado e não pode ser reaberta.' :
      'A proposta não pode ser reaberta.',
    ),
    criarAcao(
      'REVERTER_VENDA', reverterVenda,
      !podeReverter ? motivoSemPermissao() :
      proposta.status !== 'VENDIDA' ? 'Somente propostas vendidas podem ter a venda revertida.' :
      contratoEmitido ? 'A venda não pode ser revertida após a emissão do contrato.' :
      !aguardandoEmissao ? 'Não existe contrato aguardando emissão para esta proposta.' :
      'A venda não pode ser revertida.',
    ),
    criarAcao(
      'CANCELAR_CONTRATO', false,
      'O cancelamento de contratos ainda não está implementado nesta etapa.',
    ),
  ];
}

export function buscarAcaoProposta(
  proposta: PropostaDetalhada,
  contexto: ContextoAcoesProposta,
  acao: AcaoProposta,
): AcaoPropostaDisponivel {
  return obterAcoesProposta(proposta, contexto).find(item => item.acao === acao) ??
    criarAcao(acao, false, 'Ação não disponível.');
}

export function podeExecutarAcaoProposta(
  proposta: PropostaDetalhada,
  contexto: ContextoAcoesProposta,
  acao: AcaoProposta,
): boolean {
  return buscarAcaoProposta(proposta, contexto, acao).permitido;
}
