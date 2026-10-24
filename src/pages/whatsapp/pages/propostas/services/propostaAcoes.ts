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

export interface AcaoPropostaDisponivel {
  acao: AcaoProposta;
  permitido: boolean;
  motivoBloqueio: string | null;
}

export interface ContextoAcoesProposta {
  tipoUsuario: TipoUsuarioAcaoProposta;
  usuarioId: string;
}

function criarAcao(
  acao: AcaoProposta,
  permitido: boolean,
  motivoBloqueio: string | null = null,
): AcaoPropostaDisponivel {
  return {
    acao,
    permitido,
    motivoBloqueio:
      permitido ? null : motivoBloqueio,
  };
}

function possuiContratoComStatus(
  proposta: PropostaDetalhada,
  status: StatusContrato,
): boolean {
  return proposta.contratos.some(
    contrato => contrato.status === status,
  );
}

function possuiQualquerContrato(
  proposta: PropostaDetalhada,
): boolean {
  return proposta.contratos.length > 0;
}

function possuiContratoAguardandoEmissao(
  proposta: PropostaDetalhada,
): boolean {
  return possuiContratoComStatus(
    proposta,
    'AGUARDANDO_EMISSAO',
  );
}

function possuiContratoEmitido(
  proposta: PropostaDetalhada,
): boolean {
  return proposta.contratos.some(
    contrato =>
      contrato.status === 'ATIVO' ||
      contrato.status === 'CANCELADO' ||
      contrato.status === 'ENCERRADO' ||
      !!contrato.numero_apolice,
  );
}

function usuarioPodeGerenciarProposta(
  proposta: PropostaDetalhada,
  contexto: ContextoAcoesProposta,
): boolean {
  if (
    contexto.tipoUsuario === 'CORRETORA' ||
    contexto.tipoUsuario === 'ADMIN'
  ) {
    return true;
  }

  return proposta.corretor_id === contexto.usuarioId;
}

function obterMotivoSemPermissao(
  contexto: ContextoAcoesProposta,
): string {
  if (contexto.tipoUsuario === 'CORRETOR') {
    return 'Esta proposta pertence a outro corretor.';
  }

  return 'Você não possui permissão para realizar esta ação.';
}

export function obterAcoesProposta(
  proposta: PropostaDetalhada,
  contexto: ContextoAcoesProposta,
): AcaoPropostaDisponivel[] {
  const podeGerenciar =
    usuarioPodeGerenciarProposta(
      proposta,
      contexto,
    );

  const motivoSemPermissao =
    obterMotivoSemPermissao(contexto);

  const possuiContrato =
    possuiQualquerContrato(proposta);

  const aguardandoEmissao =
    possuiContratoAguardandoEmissao(
      proposta,
    );

  const contratoEmitido =
    possuiContratoEmitido(proposta);

  const somenteCorretora =
    contexto.tipoUsuario === 'CORRETORA';

  const excluir =
    proposta.status === 'EM_NEGOCIACAO' &&
    !possuiContrato &&
    podeGerenciar;

  const marcarPerdida =
    proposta.status === 'EM_NEGOCIACAO' &&
    !possuiContrato &&
    podeGerenciar;

  const reabrir =
    proposta.status === 'PERDIDA' &&
    !possuiContrato &&
    podeGerenciar;

  const reverterVenda =
    proposta.status === 'VENDIDA' &&
    possuiContrato &&
    aguardandoEmissao &&
    !contratoEmitido &&
    podeGerenciar;

  const cancelarContrato =
    proposta.status === 'VENDIDA' &&
    contratoEmitido &&
    somenteCorretora;

  return [
    criarAcao(
      'EXCLUIR',
      excluir,
      !podeGerenciar
        ? motivoSemPermissao
        : proposta.status !==
            'EM_NEGOCIACAO'
          ? 'Somente propostas em negociação podem ser excluídas.'
          : possuiContrato
            ? 'Esta proposta possui contrato vinculado e não pode ser excluída.'
            : 'A proposta não pode ser excluída.',
    ),

    criarAcao(
      'MARCAR_PERDIDA',
      marcarPerdida,
      !podeGerenciar
        ? motivoSemPermissao
        : proposta.status !==
            'EM_NEGOCIACAO'
          ? 'Somente propostas em negociação podem ser marcadas como perdidas.'
          : possuiContrato
            ? 'Uma proposta com contrato vinculado não pode ser marcada como perdida.'
            : 'A proposta não pode ser marcada como perdida.',
    ),

    criarAcao(
      'REABRIR',
      reabrir,
      !podeGerenciar
        ? motivoSemPermissao
        : proposta.status !== 'PERDIDA'
          ? 'Somente propostas perdidas podem ser reabertas.'
          : possuiContrato
            ? 'Esta proposta possui contrato vinculado e não pode ser reaberta.'
            : 'A proposta não pode ser reaberta.',
    ),

    criarAcao(
      'REVERTER_VENDA',
      reverterVenda,
      !podeGerenciar
        ? motivoSemPermissao
        : proposta.status !== 'VENDIDA'
          ? 'Somente propostas vendidas podem ter a venda revertida.'
          : contratoEmitido
            ? 'A venda não pode ser revertida após a emissão do contrato.'
            : !aguardandoEmissao
              ? 'Não existe contrato aguardando emissão para esta proposta.'
              : 'A venda não pode ser revertida.',
    ),

    criarAcao(
      'CANCELAR_CONTRATO',
      cancelarContrato,
      !somenteCorretora
        ? 'Somente a corretora pode cancelar um contrato emitido.'
        : proposta.status !== 'VENDIDA'
          ? 'Somente propostas vendidas com contrato emitido podem ser canceladas.'
          : !contratoEmitido
            ? 'O contrato ainda não foi emitido.'
            : 'O contrato não pode ser cancelado.',
    ),
  ];
}

export function buscarAcaoProposta(
  proposta: PropostaDetalhada,
  contexto: ContextoAcoesProposta,
  acao: AcaoProposta,
): AcaoPropostaDisponivel {
  const resultado =
    obterAcoesProposta(
      proposta,
      contexto,
    ).find(item => item.acao === acao);

  if (!resultado) {
    return criarAcao(
      acao,
      false,
      'Ação não disponível.',
    );
  }

  return resultado;
}

export function podeExecutarAcaoProposta(
  proposta: PropostaDetalhada,
  contexto: ContextoAcoesProposta,
  acao: AcaoProposta,
): boolean {
  return buscarAcaoProposta(
    proposta,
    contexto,
    acao,
  ).permitido;
}