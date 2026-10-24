import {
  useCallback,
  useEffect,
  useState,
} from 'react'
import {
  Loader2,
  MessageCircle,
  SendHorizontal,
  X,
} from 'lucide-react'
import {
  buscarContextoNovaConversa,
  buscarResponsaveisDaConexao,
  type NovaConversaConnection,
  type NovaConversaResponsible,
} from '../services/novaConversaService'
import type {
  SendContactMessageData,
  SendContactMessageResult,
} from '../types/whatsapp'
import type {
  WhatsAppContato,
} from '../services/whatsappContatosService'

interface WhatsAppContatoMensagemModalProps {
  open: boolean
  contato: WhatsAppContato | null
  onClose: () => void
  onSend: (
    data: SendContactMessageData
  ) => Promise<SendContactMessageResult>
  onSent: (
    conversationId: string
  ) => Promise<void> | void
}

function somenteNumeros(
  value: string
) {
  return value.replace(
    /\D/g,
    ''
  )
}

function formatarTelefone(
  value: string
) {
  const digits =
    somenteNumeros(
      value
    )

  const nacional =
    digits.startsWith('55') &&
    digits.length >= 12
      ? digits.slice(2)
      : digits

  if (
    nacional.length === 11
  ) {
    return nacional.replace(
      /^(\d{2})(\d{5})(\d{4})$/,
      '($1) $2-$3'
    )
  }

  if (
    nacional.length === 10
  ) {
    return nacional.replace(
      /^(\d{2})(\d{4})(\d{4})$/,
      '($1) $2-$3'
    )
  }

  return value
}

export default function WhatsAppContatoMensagemModal({
  open,
  contato,
  onClose,
  onSend,
  onSent,
}: WhatsAppContatoMensagemModalProps) {
  const [
    connections,
    setConnections,
  ] =
    useState<
      NovaConversaConnection[]
    >([])

  const [
    responsaveis,
    setResponsaveis,
  ] =
    useState<
      NovaConversaResponsible[]
    >([])

  const [
    connectionId,
    setConnectionId,
  ] =
    useState('')

  const [
    assignedUserId,
    setAssignedUserId,
  ] =
    useState('')

  const [
    mensagem,
    setMensagem,
  ] =
    useState('')

  const [
    carregandoContexto,
    setCarregandoContexto,
  ] =
    useState(false)

  const [
    carregandoResponsaveis,
    setCarregandoResponsaveis,
  ] =
    useState(false)

  const [
    enviando,
    setEnviando,
  ] =
    useState(false)

  const [
    erro,
    setErro,
  ] =
    useState('')

  const [
    userId,
    setUserId,
  ] =
    useState('')

  const carregarResponsaveis =
    useCallback(
      async (
        instanciaId: string,
        usuarioLogadoId?: string
      ) => {
        if (!instanciaId) {
          setResponsaveis([])
          setAssignedUserId('')
          return
        }

        try {
          setCarregandoResponsaveis(
            true
          )

          const resultado =
            await buscarResponsaveisDaConexao(
              instanciaId
            )

          setResponsaveis(
            resultado
          )

          const usuarioAtual =
            resultado.find(
              item =>
                item.id ===
                (
                  usuarioLogadoId ||
                  userId
                )
            )

          setAssignedUserId(
            usuarioAtual?.id ??
              resultado[0]?.id ??
              ''
          )
        } catch (error) {
          console.error(
            'Erro ao carregar responsáveis:',
            error
          )

          setResponsaveis([])
          setAssignedUserId('')

          setErro(
            error instanceof Error
              ? error.message
              : 'Não foi possível carregar os responsáveis.'
          )
        } finally {
          setCarregandoResponsaveis(
            false
          )
        }
      },
      [userId]
    )

  useEffect(() => {
    if (
      !open ||
      !contato
    ) {
      return
    }

    let ativo = true

    const carregar =
      async () => {
        try {
          setCarregandoContexto(
            true
          )

          setErro('')
          setMensagem('')
          setConnections([])
          setResponsaveis([])
          setConnectionId('')
          setAssignedUserId('')

          const contexto =
            await buscarContextoNovaConversa()

          if (!ativo) {
            return
          }

          setUserId(
            contexto.userId
          )

          setConnections(
            contexto.connections
          )

          if (
            contexto.connections
              .length === 0
          ) {
            setErro(
              'Nenhuma conexão WhatsApp disponível para envio.'
            )
            return
          }

          const primeiraConexao =
            contexto.connections[0]

          setConnectionId(
            primeiraConexao.id
          )

          await carregarResponsaveis(
            primeiraConexao.id,
            contexto.userId
          )
        } catch (error) {
          console.error(
            'Erro ao carregar contexto da mensagem:',
            error
          )

          if (!ativo) {
            return
          }

          setErro(
            error instanceof Error
              ? error.message
              : 'Não foi possível preparar o envio da mensagem.'
          )
        } finally {
          if (ativo) {
            setCarregandoContexto(
              false
            )
          }
        }
      }

    void carregar()

    return () => {
      ativo = false
    }
  }, [
    open,
    contato,
    carregarResponsaveis,
  ])

  const handleConnectionChange =
    async (
      novaConnectionId: string
    ) => {
      setConnectionId(
        novaConnectionId
      )

      setErro('')

      await carregarResponsaveis(
        novaConnectionId
      )
    }

  const handleClose = () => {
    if (enviando) {
      return
    }

    onClose()
  }

  const handleEnviar =
    async () => {
      if (
        !contato ||
        enviando
      ) {
        return
      }

      const texto =
        mensagem.trim()

      if (!connectionId) {
        setErro(
          'Selecione uma conexão WhatsApp.'
        )
        return
      }

      if (!assignedUserId) {
        setErro(
          'Selecione o responsável pela conversa.'
        )
        return
      }

      if (!texto) {
        setErro(
          'Digite a mensagem que deseja enviar.'
        )
        return
      }

      try {
        setEnviando(true)
        setErro('')

        const resultado =
          await onSend({
            contactId:
              contato.id,
            instanceId:
              connectionId,
            assignedUserId,
            text:
              texto,
          })

        await onSent(
          resultado.conversationId
        )

        setMensagem('')
        onClose()
      } catch (error) {
        console.error(
          'Erro ao enviar primeira mensagem:',
          error
        )

        setErro(
          error instanceof Error
            ? error.message
            : 'Não foi possível enviar a mensagem.'
        )
      } finally {
        setEnviando(false)
      }
    }

  if (
    !open ||
    !contato
  ) {
    return null
  }

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/50 p-4">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950">
        <div className="flex items-start justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400">
              <MessageCircle
                size={19}
              />
            </div>

            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                Enviar mensagem
              </h2>

              <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
                {contato.nome ||
                  'Contato sem nome'}
              </p>

              <p className="mt-0.5 text-xs text-slate-400">
                {formatarTelefone(
                  contato.telefone
                )}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={
              handleClose
            }
            disabled={
              enviando
            }
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50 dark:hover:bg-slate-900 dark:hover:text-slate-200"
          >
            <X
              size={18}
            />
          </button>
        </div>

        <div className="space-y-4 p-5">
          {carregandoContexto ? (
            <div className="flex min-h-[220px] flex-col items-center justify-center gap-3">
              <Loader2
                size={25}
                className="animate-spin text-blue-600"
              />

              <p className="text-sm text-slate-500 dark:text-slate-400">
                Preparando envio...
              </p>
            </div>
          ) : (
            <>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Conexão WhatsApp
                </label>

                <select
                  value={
                    connectionId
                  }
                  onChange={e =>
                    void handleConnectionChange(
                      e.target.value
                    )
                  }
                  disabled={
                    enviando ||
                    connections.length ===
                      0
                  }
                  className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
                >
                  {connections.length ===
                  0 ? (
                    <option value="">
                      Nenhuma conexão disponível
                    </option>
                  ) : (
                    connections.map(
                      connection => (
                        <option
                          key={
                            connection.id
                          }
                          value={
                            connection.id
                          }
                        >
                          {connection.nome}
                          {connection.telefone
                            ? ` — ${formatarTelefone(
                                connection.telefone
                              )}`
                            : ''}
                        </option>
                      )
                    )
                  )}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Responsável
                </label>

                <select
                  value={
                    assignedUserId
                  }
                  onChange={e =>
                    setAssignedUserId(
                      e.target.value
                    )
                  }
                  disabled={
                    enviando ||
                    carregandoResponsaveis ||
                    !connectionId
                  }
                  className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
                >
                  {carregandoResponsaveis ? (
                    <option value="">
                      Carregando responsáveis...
                    </option>
                  ) : responsaveis.length ===
                    0 ? (
                    <option value="">
                      Nenhum responsável disponível
                    </option>
                  ) : (
                    responsaveis.map(
                      responsavel => (
                        <option
                          key={
                            responsavel.id
                          }
                          value={
                            responsavel.id
                          }
                        >
                          {responsavel.nome}
                          {responsavel.funcao_equipe
                            ? ` — ${responsavel.funcao_equipe}`
                            : ''}
                        </option>
                      )
                    )
                  )}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Mensagem
                </label>

                <textarea
                  value={
                    mensagem
                  }
                  onChange={e =>
                    setMensagem(
                      e.target.value
                    )
                  }
                  disabled={
                    enviando
                  }
                  rows={5}
                  placeholder="Digite sua mensagem..."
                  className="w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
                />
              </div>

              {erro && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
                  {erro}
                </div>
              )}
            </>
          )}
        </div>

        {!carregandoContexto && (
          <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-4 dark:border-slate-800">
            <button
              type="button"
              onClick={
                handleClose
              }
              disabled={
                enviando
              }
              className="h-10 rounded-lg border border-slate-200 px-4 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-900"
            >
              Cancelar
            </button>

            <button
              type="button"
              onClick={() =>
                void handleEnviar()
              }
              disabled={
                enviando ||
                !connectionId ||
                !assignedUserId ||
                !mensagem.trim()
              }
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {enviando ? (
                <Loader2
                  size={16}
                  className="animate-spin"
                />
              ) : (
                <SendHorizontal
                  size={16}
                />
              )}

              {enviando
                ? 'Enviando...'
                : 'Enviar mensagem'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}