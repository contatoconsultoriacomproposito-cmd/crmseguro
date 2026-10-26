import {
  Download,
  ExternalLink,
  File,
  FileAudio,
  FileImage,
  FileText,
  FileVideo,
  Loader2,
  Plus,
  RefreshCw,
  Trash2,
} from 'lucide-react'
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { toast } from 'sonner'
import { supabase } from '../../../../../../lib/supabaseClient'
import { useAuth } from '../../../../../../auth/AuthContext'
import { criarUrlLeituraStorage } from '../../../../armazenamento/services/storageService'
import { excluirArquivoStorage } from '../../../../armazenamento/services/storageService'
import type { ClienteCentral } from '../../../types/centralClientes'
import ModalAdicionarArquivoCliente from '../../ModalAdicionarArquivoCliente'

interface ArquivoRow {
  id: string
  nome_original: string
  mime_type: string | null
  tamanho_bytes: number
  tipo_arquivo:
    | 'IMAGEM'
    | 'AUDIO'
    | 'VIDEO'
    | 'DOCUMENTO'
    | 'OUTRO'
  origem: string | null
  origem_id: string | null
  storage_path: string
  status: string
  metadata: Record<string, unknown>
  created_at: string
}

const tamanho = (
  bytes?: number | null
) => {
  const value = Number(bytes || 0)

  if (value < 1024) {
    return `${value} B`
  }

  if (value < 1024 ** 2) {
    return `${(
      value / 1024
    ).toFixed(1)} KB`
  }

  if (value < 1024 ** 3) {
    return `${(
      value /
      1024 ** 2
    ).toFixed(1)} MB`
  }

  return `${(
    value /
    1024 ** 3
  ).toFixed(1)} GB`
}

const formatarData = (
  valor?: string | null
) => {
  if (!valor) return '—'

  const data = new Date(valor)

  if (
    Number.isNaN(
      data.getTime()
    )
  ) {
    return '—'
  }

  return new Intl.DateTimeFormat(
    'pt-BR',
    {
      dateStyle: 'short',
      timeStyle: 'short',
    }
  ).format(data)
}

const labelOrigem = (
  origem?: string | null
) => {
  switch (origem) {
    case 'WHATSAPP':
      return 'WhatsApp'
    case 'DOCUMENTOS':
      return 'Documentos'
    case 'SINISTRO':
      return 'Sinistro'
    case 'ASSISTENCIA':
      return 'Assistência'
    case 'CLIENTE':
      return 'Cliente'
    case 'EMPRESA':
      return 'Empresa'
    case 'OUTRO':
      return 'Outro'
    default:
      return origem || 'CRM'
  }
}

function IconeArquivo({
  tipo,
}: {
  tipo: ArquivoRow['tipo_arquivo']
}) {
  switch (tipo) {
    case 'IMAGEM':
      return (
        <FileImage
          size={17}
        />
      )

    case 'AUDIO':
      return (
        <FileAudio
          size={17}
        />
      )

    case 'VIDEO':
      return (
        <FileVideo
          size={17}
        />
      )

    case 'DOCUMENTO':
      return (
        <FileText
          size={17}
        />
      )

    default:
      return (
        <File
          size={17}
        />
      )
  }
}

export default function ClienteArquivosTab({
  cliente,
}: {
  cliente: ClienteCentral
}) {
  const { userProfile } = useAuth()

  const podeExcluir =
    userProfile?.tipo_usuario ===
    'CORRETORA'

  const [
    itens,
    setItens,
  ] = useState<ArquivoRow[]>([])

  const [
    loading,
    setLoading,
  ] = useState(true)

  const [
    atualizando,
    setAtualizando,
  ] = useState(false)

  const [
    arquivoEmAcao,
    setArquivoEmAcao,
  ] = useState<string | null>(
    null
  )

  const [
    modalAdicionarAberto,
    setModalAdicionarAberto,
  ] = useState(false)

  const carregar =
    useCallback(
      async (
        mostrarLoading = true
      ) => {
        if (mostrarLoading) {
          setLoading(true)
        }

        try {
          const coluna =
            cliente.tipo === 'PF'
              ? 'crm_pessoa_id'
              : 'crm_empresa_id'

          const {
            data,
            error,
          } = await supabase
            .from('crm_arquivos')
            .select(`
              id,
              nome_original,
              mime_type,
              tamanho_bytes,
              tipo_arquivo,
              origem,
              origem_id,
              storage_path,
              status,
              metadata,
              created_at
            `)
            .eq(
              coluna,
              cliente.id
            )
            .eq(
              'status',
              'ATIVO'
            )
            .order(
              'created_at',
              {
                ascending: false,
              }
            )

          if (error) {
            throw error
          }

          setItens(
            (data || []).map(
              item => ({
                ...item,
                tamanho_bytes:
                  Number(
                    item.tamanho_bytes ||
                      0
                  ),
                metadata:
                  item.metadata || {},
              })
            ) as ArquivoRow[]
          )
        } catch (error: any) {
          console.error(
            'Erro ao carregar arquivos do cliente:',
            error
          )

          toast.error(
            error?.message ||
              'Não foi possível carregar os arquivos.'
          )

          setItens([])
        } finally {
          if (mostrarLoading) {
            setLoading(false)
          }
        }
      },
      [
        cliente.id,
        cliente.tipo,
      ]
    )

  useEffect(() => {
    void carregar()
  }, [carregar])

  const atualizar =
    async () => {
      if (
        atualizando ||
        arquivoEmAcao
      ) {
        return
      }

      setAtualizando(true)

      try {
        await carregar(false)
      } finally {
        setAtualizando(false)
      }
    }

  const handleArquivoAdicionado =
    async () => {
      await carregar(false)
    }

  const totalBytes =
    useMemo(
      () =>
        itens.reduce(
          (
            total,
            item
          ) =>
            total +
            Number(
              item.tamanho_bytes ||
                0
            ),
          0
        ),
      [itens]
    )

  const visualizarArquivo =
    async (
      arquivo: ArquivoRow
    ) => {
      if (arquivoEmAcao) {
        return
      }

      /*
       * Abrimos a aba imediatamente
       * para evitar bloqueio de popup
       * depois do await.
       */
      const novaAba =
        window.open(
          '',
          '_blank'
        )

      try {
        setArquivoEmAcao(
          arquivo.id
        )

        const readUrl =
          await criarUrlLeituraStorage(
            arquivo.storage_path
          )

        if (!novaAba) {
          throw new Error(
            'O navegador bloqueou a nova janela. Permita pop-ups para visualizar o arquivo.'
          )
        }

        novaAba.location.href =
          readUrl
      } catch (error) {
        novaAba?.close()

        console.error(
          'Erro ao visualizar arquivo:',
          error
        )

        toast.error(
          error instanceof Error
            ? error.message
            : 'Não foi possível visualizar o arquivo.'
        )
      } finally {
        setArquivoEmAcao(
          null
        )
      }
    }

  const baixarArquivo =
    async (
      arquivo: ArquivoRow
    ) => {
      if (arquivoEmAcao) {
        return
      }

      try {
        setArquivoEmAcao(
          arquivo.id
        )

        const readUrl =
          await criarUrlLeituraStorage(
            arquivo.storage_path
          )

        const response =
          await fetch(
            readUrl
          )

        if (!response.ok) {
          throw new Error(
            'Não foi possível baixar o arquivo.'
          )
        }

        const blob =
          await response.blob()

        const blobUrl =
          URL.createObjectURL(
            blob
          )

        const link =
          document.createElement(
            'a'
          )

        link.href =
          blobUrl

        link.download =
          arquivo.nome_original ||
          'arquivo'

        link.style.display =
          'none'

        document.body.appendChild(
          link
        )

        link.click()
        link.remove()

        URL.revokeObjectURL(
          blobUrl
        )
      } catch (error) {
        console.error(
          'Erro ao baixar arquivo:',
          error
        )

        toast.error(
          error instanceof Error
            ? error.message
            : 'Não foi possível baixar o arquivo.'
        )
      } finally {
        setArquivoEmAcao(
          null
        )
      }
    }

  const excluirArquivo =
    async (
      arquivo: ArquivoRow
    ) => {
      if (arquivoEmAcao) {
        return
      }

      const confirmado =
        window.confirm(
          `Deseja realmente excluir o arquivo "${arquivo.nome_original}"?\n\n` +
            'Esta ação é permanente e removerá o arquivo definitivamente do armazenamento.'
        )

      if (!confirmado) {
        return
      }

      try {
        setArquivoEmAcao(
          arquivo.id
        )

        await excluirArquivoStorage(
          arquivo.id
        )

        /*
         * Retira imediatamente da
         * interface e depois confirma
         * o estado real no banco.
         */
        setItens(
          atual =>
            atual.filter(
              item =>
                item.id !==
                arquivo.id
            )
        )

        toast.success(
          'Arquivo excluído com sucesso.'
        )

        await carregar(false)
      } catch (error) {
        console.error(
          'Erro ao excluir arquivo:',
          error
        )

        toast.error(
          error instanceof Error
            ? error.message
            : 'Não foi possível excluir o arquivo.'
        )
      } finally {
        setArquivoEmAcao(
          null
        )
      }
    }

  if (loading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <Loader2
          size={22}
          className="animate-spin text-blue-600"
        />
      </div>
    )
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-800">
              Arquivos
            </h3>

            <p className="mt-0.5 text-xs text-slate-400">
              Arquivos do cliente armazenados na Central de Armazenamento.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() =>
                setModalAdicionarAberto(
                  true
                )
              }
              disabled={
                Boolean(
                  arquivoEmAcao
                )
              }
              className="inline-flex h-9 items-center gap-2 rounded-lg bg-blue-600 px-3 text-xs font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Plus
                size={14}
              />

              Adicionar documento
            </button>

            <button
              type="button"
              onClick={() => {
                void atualizar()
              }}
              disabled={
                atualizando ||
                Boolean(
                  arquivoEmAcao
                )
              }
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RefreshCw
                size={14}
                className={
                  atualizando
                    ? 'animate-spin'
                    : ''
                }
              />

              Atualizar
            </button>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
              Arquivos vinculados
            </p>

            <p className="mt-1 text-xl font-bold text-slate-900">
              {itens.length}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
              Espaço utilizado
            </p>

            <p className="mt-1 text-xl font-bold text-slate-900">
              {tamanho(
                totalBytes
              )}
            </p>
          </div>
        </div>

        {itens.length === 0 ? (
          <div className="flex min-h-36 flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white px-4 text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 text-slate-400">
              <File size={18} />
            </div>

            <p className="mt-3 text-sm font-semibold text-slate-600">
              Nenhum arquivo vinculado
            </p>

            <p className="mt-1 max-w-md text-xs text-slate-400">
              Ainda não existem arquivos ativos vinculados diretamente a este cliente.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="divide-y divide-slate-100">
              {itens.map(
                item => {
                  const processando =
                    arquivoEmAcao ===
                    item.id

                  return (
                    <article
                      key={
                        item.id
                      }
                      className="flex flex-col gap-4 p-4 transition hover:bg-slate-50 lg:flex-row lg:items-center lg:justify-between"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                          {processando ? (
                            <Loader2
                              size={17}
                              className="animate-spin"
                            />
                          ) : (
                            <IconeArquivo
                              tipo={
                                item.tipo_arquivo
                              }
                            />
                          )}
                        </div>

                        <div className="min-w-0">
                          <p
                            className="truncate text-sm font-semibold text-slate-700"
                            title={
                              item.nome_original
                            }
                          >
                            {
                              item.nome_original
                            }
                          </p>

                          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-slate-400">
                            <span>
                              {
                                item.tipo_arquivo
                              }
                            </span>

                            <span>
                              •
                            </span>

                            <span>
                              {tamanho(
                                item.tamanho_bytes
                              )}
                            </span>

                            <span>
                              •
                            </span>

                            <span>
                              {labelOrigem(
                                item.origem
                              )}
                            </span>

                            <span>
                              •
                            </span>

                            <span>
                              {formatarData(
                                item.created_at
                              )}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center gap-2">
                        <button
                          type="button"
                          title="Visualizar arquivo"
                          disabled={
                            Boolean(
                              arquivoEmAcao
                            )
                          }
                          onClick={() =>
                            void visualizarArquivo(
                              item
                            )
                          }
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <ExternalLink
                            size={15}
                          />
                        </button>

                        <button
                          type="button"
                          title="Baixar arquivo"
                          disabled={
                            Boolean(
                              arquivoEmAcao
                            )
                          }
                          onClick={() =>
                            void baixarArquivo(
                              item
                            )
                          }
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-600 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <Download
                            size={15}
                          />
                        </button>

                        {podeExcluir && (
                          <button
                            type="button"
                            title="Excluir arquivo"
                            disabled={
                              Boolean(
                                arquivoEmAcao
                              )
                            }
                            onClick={() =>
                              void excluirArquivo(
                                item
                              )
                            }
                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            <Trash2
                              size={15}
                            />
                          </button>
                        )}
                      </div>
                    </article>
                  )
                }
              )}
            </div>
          </div>
        )}
      </div>

      {modalAdicionarAberto && (
        <ModalAdicionarArquivoCliente
          cliente={{
            id:
              cliente.id,

            tipo:
              cliente.tipo,

            nome:
              cliente.nome,

            documento:
              cliente.documento ||
              null,
          }}
          onClose={() =>
            setModalAdicionarAberto(
              false
            )
          }
          onSuccess={
            handleArquivoAdicionado
          }
        />
      )}
    </>
  )
}