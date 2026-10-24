import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'

import {
  Download,
  ExternalLink,
  FileImage,
  FileText,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  X,
} from 'lucide-react'

import { toast } from 'sonner'

import {
  baixarDocumento,
  excluirDocumento,
  listarDocumentos,
  visualizarDocumento,
} from '../services/documentosService'

import {
  obterLabelCategoriaDocumento,
  type DocumentoArquivo,
} from '../types/documentos'

interface DocumentosMenuProps {
  conversationId: string
  onClose: () => void
  onAdicionarDocumento: () => void
  refreshKey?: number
}

function formatarBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return '0 B'
  }

  const unidades = [
    'B',
    'KB',
    'MB',
    'GB',
  ]

  const indice = Math.min(
    Math.floor(
      Math.log(bytes) / Math.log(1024)
    ),
    unidades.length - 1
  )

  const valor =
    bytes / Math.pow(1024, indice)

  const casas =
    indice === 0
      ? 0
      : valor >= 10
        ? 1
        : 2

  return `${valor.toFixed(casas)} ${unidades[indice]}`
}

function formatarData(
  valor: string | null | undefined
): string {
  if (!valor) {
    return ''
  }

  const data = new Date(valor)

  if (Number.isNaN(data.getTime())) {
    return ''
  }

  return new Intl.DateTimeFormat(
    'pt-BR',
    {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }
  ).format(data)
}

function obterIconeDocumento(
  documento: DocumentoArquivo
) {
  if (documento.tipoArquivo === 'IMAGEM') {
    return (
      <FileImage
        size={17}
        className="text-blue-600"
      />
    )
  }

  return (
    <FileText
      size={17}
      className="text-red-500"
    />
  )
}

function obterClasseIcone(
  documento: DocumentoArquivo
): string {
  if (documento.tipoArquivo === 'IMAGEM') {
    return [
      'bg-blue-50',
      'dark:bg-blue-950/40',
    ].join(' ')
  }

  return [
    'bg-red-50',
    'dark:bg-red-950/30',
  ].join(' ')
}

export function DocumentosMenu({
  conversationId,
  onClose,
  onAdicionarDocumento,
  refreshKey = 0,
}: DocumentosMenuProps) {
  const [documentos, setDocumentos] =
    useState<DocumentoArquivo[]>([])

  const [busca, setBusca] =
    useState('')

  const [loading, setLoading] =
    useState(true)

  const [
    atualizando,
    setAtualizando,
  ] = useState(false)

  const [
    arquivoEmAcao,
    setArquivoEmAcao,
    ] = useState<string | null>(null)

    const [
    arquivoEmExclusao,
    setArquivoEmExclusao,
    ] = useState<string | null>(null)

  const carregarDocumentos =
    useCallback(
      async (
        silencioso = false
      ) => {
        const id =
          conversationId?.trim()

        if (!id) {
          setDocumentos([])
          setLoading(false)
          return
        }

        try {
          if (silencioso) {
            setAtualizando(true)
          } else {
            setLoading(true)
          }

          const resultado =
            await listarDocumentos({
              conversationId: id,
            })

          setDocumentos(resultado)
        } catch (error) {
          console.error(
            'Erro ao carregar documentos:',
            error
          )

          setDocumentos([])

          toast.error(
            error instanceof Error
              ? error.message
              : 'Não foi possível carregar os documentos.'
          )
        } finally {
          setLoading(false)
          setAtualizando(false)
        }
      },
      [conversationId]
    )

  useEffect(() => {
    void carregarDocumentos()
  }, [
    carregarDocumentos,
    refreshKey,
  ])

  const documentosFiltrados =
    useMemo(() => {
      const termo =
        busca
          .trim()
          .toLocaleLowerCase(
            'pt-BR'
          )

      if (!termo) {
        return documentos
      }

      return documentos.filter(
        documento => {
          const categoria =
            obterLabelCategoriaDocumento(
              documento.categoria
            )

          const conteudo = [
            documento.nomeOriginal,
            categoria,
            documento.origem,
          ]
            .join(' ')
            .toLocaleLowerCase(
              'pt-BR'
            )

          return conteudo.includes(
            termo
          )
        }
      )
    }, [documentos, busca])

  const gruposDocumentos = useMemo(() => {
  const configuracaoGrupos = [
    {
      id: 'APOLICE',
      titulo: 'Apólices',
    },
    {
      id: 'COTACAO',
      titulo: 'Cotações',
    },
    {
      id: 'PROPOSTA',
      titulo: 'Propostas',
    },
    {
      id: 'ENDOSSO',
      titulo: 'Endossos',
    },
    {
      id: 'BOLETO',
      titulo: 'Boletos / Parcelas',
    },
    {
      id: 'CERTIFICADO',
      titulo: 'Certificados / Carteirinhas',
    },

    {
      id: 'RG',
      titulo: 'RG',
    },
    {
      id: 'CNH',
      titulo: 'CNH',
    },
    {
      id: 'CPF',
      titulo: 'CPF',
    },
    {
      id: 'COMPROVANTE_RESIDENCIA',
      titulo: 'Comprovantes de residência',
    },
    {
      id: 'COMPROVANTE_RENDA',
      titulo: 'Comprovantes de renda',
    },
    {
      id: 'CERTIDAO_NASCIMENTO',
      titulo: 'Certidões de nascimento',
    },
    {
      id: 'CERTIDAO_CASAMENTO',
      titulo: 'Certidões de casamento',
    },
    {
      id: 'PASSAPORTE',
      titulo: 'Passaportes',
    },
    {
      id: 'CRLV',
      titulo: 'CRLV / Documentos de veículos',
    },
    {
      id: 'OUTRO_PF',
      titulo: 'Outros documentos pessoais',
    },

    {
      id: 'CONTRATO_SOCIAL',
      titulo: 'Contratos sociais',
    },
    {
      id: 'CARTAO_CNPJ',
      titulo: 'Cartões CNPJ',
    },
    {
      id: 'ALTERACAO_CONTRATUAL',
      titulo: 'Alterações contratuais',
    },
    {
      id: 'COMPROVANTE_ENDERECO_PJ',
      titulo: 'Comprovantes de endereço empresarial',
    },
    {
      id: 'FATURAMENTO',
      titulo: 'Faturamento',
    },
    {
      id: 'BALANCO_DRE',
      titulo: 'Balanço / DRE',
    },
    {
      id: 'RELACAO_FUNCIONARIOS',
      titulo: 'Relação de funcionários',
    },
    {
      id: 'RELACAO_VEICULOS',
      titulo: 'Frota / Relação de veículos',
    },
    {
      id: 'OUTRO_PJ',
      titulo: 'Outros documentos empresariais',
    },
  ]

  const categoriasConhecidas =
    configuracaoGrupos.map(
      grupo => grupo.id
    )

  const grupos: Array<{
    id: string
    titulo: string
    documentos: DocumentoArquivo[]
  }> = configuracaoGrupos.map(
    grupo => ({
      id: grupo.id,
      titulo: grupo.titulo,
      documentos:
        documentosFiltrados.filter(
          documento =>
            documento.categoria ===
            grupo.id
        ),
    })
  )

  grupos.push({
    id: 'SEM_CATEGORIA',
    titulo: 'Outros documentos',
    documentos:
      documentosFiltrados.filter(
        documento =>
          !documento.categoria ||
          !categoriasConhecidas.includes(
            documento.categoria
          )
      ),
  })

  if (busca.trim()) {
    return grupos.filter(
      grupo =>
        grupo.documentos.length > 0
    )
  }

  return grupos
}, [documentosFiltrados, busca])

  
  const handleVisualizar =
    async (
      documento: DocumentoArquivo
    ) => {
      if (arquivoEmAcao) {
        return
      }

      try {
        setArquivoEmAcao(
          documento.id
        )

        await visualizarDocumento({
          conversationId,
          arquivoId: documento.id,
        })
      } catch (error) {
        console.error(
          'Erro ao visualizar documento:',
          error
        )

        toast.error(
          error instanceof Error
            ? error.message
            : 'Não foi possível visualizar o documento.'
        )
      } finally {
        setArquivoEmAcao(null)
      }
    }

  const handleBaixar =
    async (
      event: React.MouseEvent,
      documento: DocumentoArquivo
    ) => {
      event.stopPropagation()

      if (arquivoEmAcao) {
        return
      }

      try {
        setArquivoEmAcao(
          documento.id
        )

        await baixarDocumento({
          conversationId,
          arquivoId: documento.id,
        })
      } catch (error) {
        console.error(
          'Erro ao baixar documento:',
          error
        )

        toast.error(
          error instanceof Error
            ? error.message
            : 'Não foi possível baixar o documento.'
        )
      } finally {
        setArquivoEmAcao(null)
      }
    }

const handleExcluir = async (
  event: React.MouseEvent,
  documento: DocumentoArquivo
) => {
  event.stopPropagation()

  if (arquivoEmAcao || arquivoEmExclusao) {
    return
  }

  const confirmou = window.confirm(
    `Deseja realmente excluir o documento "${documento.nomeOriginal}"?\n\nEsta ação não poderá ser desfeita.`
  )

  if (!confirmou) {
    return
  }

  try {
    setArquivoEmExclusao(documento.id)

    await excluirDocumento(documento.id)

    setDocumentos(documentosAtuais =>
      documentosAtuais.filter(
        item => item.id !== documento.id
      )
    )

    toast.success(
      'Documento excluído com sucesso.'
    )
  } catch (error) {
    console.error(
      'Erro ao excluir documento:',
      error
    )

    toast.error(
      error instanceof Error
        ? error.message
        : 'Não foi possível excluir o documento.'
    )
  } finally {
    setArquivoEmExclusao(null)
  }
}

  const handleAdicionar =
    () => {
      onAdicionarDocumento()
    }

  return (
    <div
      className={[
        'absolute',
        'right-0',
        'top-full',
        'z-50',
        'mt-2',
        'w-[360px]',
        'overflow-hidden',
        'rounded-xl',
        'border',
        'border-gray-200',
        'bg-white',
        'shadow-xl',
        'dark:border-slate-700',
        'dark:bg-slate-950',
      ].join(' ')}
    >
      <div
        className={[
          'flex',
          'items-center',
          'justify-between',
          'border-b',
          'border-gray-100',
          'px-4',
          'py-3',
          'dark:border-slate-800',
        ].join(' ')}
      >
        <div className="min-w-0">
          <h3
            className={[
              'text-sm',
              'font-semibold',
              'text-gray-800',
              'dark:text-slate-100',
            ].join(' ')}
          >
            Central de documentos
          </h3>

          <p
            className={[
              'mt-0.5',
              'text-[11px]',
              'text-gray-400',
              'dark:text-slate-500',
            ].join(' ')}
          >
            {documentos.length === 1
              ? '1 documento'
              : `${documentos.length} documentos`}
          </p>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            title="Atualizar documentos"
            disabled={
              loading ||
              atualizando
            }
            onClick={() => {
              void carregarDocumentos(
                true
              )
            }}
            className={[
              'flex',
              'h-8',
              'w-8',
              'items-center',
              'justify-center',
              'rounded-lg',
              'text-gray-400',
              'transition',
              'hover:bg-gray-100',
              'hover:text-gray-600',
              'disabled:cursor-not-allowed',
              'disabled:opacity-50',
              'dark:hover:bg-slate-800',
              'dark:hover:text-slate-200',
            ].join(' ')}
          >
            <RefreshCw
              size={15}
              className={
                atualizando
                  ? 'animate-spin'
                  : ''
              }
            />
          </button>

          <button
            type="button"
            title="Fechar"
            onClick={onClose}
            className={[
              'flex',
              'h-8',
              'w-8',
              'items-center',
              'justify-center',
              'rounded-lg',
              'text-gray-400',
              'transition',
              'hover:bg-gray-100',
              'hover:text-gray-600',
              'dark:hover:bg-slate-800',
              'dark:hover:text-slate-200',
            ].join(' ')}
          >
            <X size={16} />
          </button>
        </div>
      </div>

      <div
        className={[
          'border-b',
          'border-gray-100',
          'p-3',
          'dark:border-slate-800',
        ].join(' ')}
      >
        <div
          className={[
            'flex',
            'items-center',
            'gap-2',
            'rounded-lg',
            'border',
            'border-gray-200',
            'bg-white',
            'px-3',
            'focus-within:border-blue-400',
            'focus-within:ring-2',
            'focus-within:ring-blue-100',
            'dark:border-slate-700',
            'dark:bg-slate-900',
            'dark:focus-within:border-blue-500',
            'dark:focus-within:ring-blue-950',
          ].join(' ')}
        >
          <Search
            size={15}
            className="shrink-0 text-gray-400"
          />

          <input
            value={busca}
            onChange={event =>
              setBusca(
                event.target.value
              )
            }
            placeholder="Pesquisar documento..."
            className={[
              'h-9',
              'min-w-0',
              'flex-1',
              'bg-transparent',
              'text-sm',
              'text-gray-700',
              'outline-none',
              'placeholder:text-gray-400',
              'dark:text-slate-200',
              'dark:placeholder:text-slate-500',
            ].join(' ')}
          />

          {busca && (
            <button
              type="button"
              title="Limpar pesquisa"
              onClick={() =>
                setBusca('')
              }
              className={[
                'flex',
                'h-6',
                'w-6',
                'items-center',
                'justify-center',
                'rounded-md',
                'text-gray-400',
                'transition',
                'hover:bg-gray-100',
                'hover:text-gray-600',
                'dark:hover:bg-slate-800',
                'dark:hover:text-slate-200',
              ].join(' ')}
            >
              <X size={13} />
            </button>
          )}
        </div>
      </div>

      <div
        className={[
          'max-h-[330px]',
          'overflow-y-auto',
          'p-2',
        ].join(' ')}
      >
        {loading ? (
          <div
            className={[
              'flex',
              'min-h-[150px]',
              'items-center',
              'justify-center',
            ].join(' ')}
          >
            <div
              className={[
                'flex',
                'flex-col',
                'items-center',
                'gap-2',
                'text-sm',
                'text-gray-400',
              ].join(' ')}
            >
              <Loader2
                size={20}
                className="animate-spin"
              />

              <span>
                Carregando documentos...
              </span>
            </div>
          </div>
        ) : documentosFiltrados.length > 0 ? (
  <div className="space-y-4">
    {gruposDocumentos.map(grupo => (
      <div key={grupo.id}>
        <div
          className={[
            'mb-1.5',
            'flex',
            'items-center',
            'justify-between',
            'px-2',
          ].join(' ')}
        >
          <span
            className={[
              'text-[11px]',
              'font-semibold',
              'uppercase',
              'tracking-wide',
              'text-gray-500',
              'dark:text-slate-400',
            ].join(' ')}
          >
            {grupo.titulo}
          </span>

          <span
            className={[
              'rounded-full',
              'bg-gray-100',
              'px-1.5',
              'py-0.5',
              'text-[10px]',
              'font-medium',
              'text-gray-500',
              'dark:bg-slate-800',
              'dark:text-slate-400',
            ].join(' ')}
          >
            {grupo.documentos.length}
          </span>
        </div>

        <div className="space-y-1">
          {grupo.documentos.map(
            documento => {
                const executando =
                  arquivoEmAcao ===
                  documento.id

                const categoria =
                  obterLabelCategoriaDocumento(
                    documento.categoria
                  )
                
                const tipoTitularDocumento =
                typeof documento.metadata
                    ?.tipo_titular_documento === 'string'
                    ? documento.metadata
                        .tipo_titular_documento
                    : null

                const documentoSocioRepresentante =
                tipoTitularDocumento ===
                'SOCIO_REPRESENTANTE'

                const data =
                  formatarData(
                    documento.createdAt
                  )

                return (
                  <div
                    key={documento.id}
                    className={[
                      'group',
                      'flex',
                      'items-center',
                      'gap-2',
                      'rounded-lg',
                      'p-2',
                      'transition',
                      'hover:bg-gray-50',
                      'dark:hover:bg-slate-900',
                    ].join(' ')}
                  >
                    <button
                      type="button"
                      disabled={
                        Boolean(
                          arquivoEmAcao
                        )
                      }
                      onClick={() => {
                        void handleVisualizar(
                          documento
                        )
                      }}
                      className={[
                        'flex',
                        'min-w-0',
                        'flex-1',
                        'items-center',
                        'gap-3',
                        'text-left',
                        'disabled:cursor-not-allowed',
                      ].join(' ')}
                    >
                      <div
                        className={[
                          'flex',
                          'h-10',
                          'w-10',
                          'shrink-0',
                          'items-center',
                          'justify-center',
                          'rounded-lg',
                          obterClasseIcone(
                            documento
                          ),
                        ].join(' ')}
                      >
                        {executando ? (
                          <Loader2
                            size={17}
                            className="animate-spin text-gray-400"
                          />
                        ) : (
                          obterIconeDocumento(
                            documento
                          )
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p
                          className={[
                            'truncate',
                            'text-sm',
                            'font-medium',
                            'text-gray-800',
                            'dark:text-slate-200',
                          ].join(' ')}
                          title={
                            documento.nomeOriginal
                          }
                        >
                          {
                            documento.nomeOriginal
                          }
                        </p>

                        <div
                          className={[
                            'mt-0.5',
                            'flex',
                            'min-w-0',
                            'items-center',
                            'gap-1',
                            'text-[11px]',
                            'text-gray-400',
                            'dark:text-slate-500',
                          ].join(' ')}
                        >
                          <span className="truncate">
                            {categoria}
                            {documentoSocioRepresentante
                                ? ' • Sócio / representante'
                                : ''}
                            </span>

                          {data && (
                            <>
                              <span>
                                •
                              </span>

                              <span className="shrink-0">
                                {data}
                              </span>
                            </>
                          )}

                          {documento.tamanhoBytes >
                            0 && (
                            <>
                              <span>
                                •
                              </span>

                              <span className="shrink-0">
                                {formatarBytes(
                                  documento.tamanhoBytes
                                )}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </button>

                    <div
                      className={[
                        'flex',
                        'shrink-0',
                        'items-center',
                        'gap-0.5',
                      ].join(' ')}
                    >
                      <button
                        type="button"
                        title="Visualizar"
                        disabled={
                          Boolean(
                            arquivoEmAcao
                          )
                        }
                        onClick={() => {
                          void handleVisualizar(
                            documento
                          )
                        }}
                        className={[
                          'flex',
                          'h-8',
                          'w-8',
                          'items-center',
                          'justify-center',
                          'rounded-lg',
                          'text-gray-400',
                          'transition',
                          'hover:bg-white',
                          'hover:text-blue-600',
                          'disabled:cursor-not-allowed',
                          'disabled:opacity-40',
                          'dark:hover:bg-slate-800',
                          'dark:hover:text-blue-400',
                        ].join(' ')}
                      >
                        <ExternalLink
                          size={14}
                        />
                      </button>

                      <button
                        type="button"
                        title="Baixar"
                        disabled={
                          Boolean(
                            arquivoEmAcao
                          )
                        }
                        onClick={event => {
                          void handleBaixar(
                            event,
                            documento
                          )
                        }}
                        className={[
                          'flex',
                          'h-8',
                          'w-8',
                          'items-center',
                          'justify-center',
                          'rounded-lg',
                          'text-gray-400',
                          'transition',
                          'hover:bg-white',
                          'hover:text-blue-600',
                          'disabled:cursor-not-allowed',
                          'disabled:opacity-40',
                          'dark:hover:bg-slate-800',
                          'dark:hover:text-blue-400',
                        ].join(' ')}
                      >
                        <Download
                          size={14}
                        />
                      </button>
                      <button
                    type="button"
                    title="Excluir"
                    disabled={Boolean(
                        arquivoEmAcao ||
                        arquivoEmExclusao
                    )}
                    onClick={event => {
                        void handleExcluir(
                        event,
                        documento
                        )
                    }}
                    className={[
                        'flex',
                        'h-8',
                        'w-8',
                        'items-center',
                        'justify-center',
                        'rounded-lg',
                        'text-gray-400',
                        'transition',
                        'hover:bg-red-50',
                        'hover:text-red-600',
                        'disabled:cursor-not-allowed',
                        'disabled:opacity-40',
                        'dark:hover:bg-red-950/30',
                        'dark:hover:text-red-400',
                    ].join(' ')}
                    >
                    {arquivoEmExclusao ===
                    documento.id ? (
                        <Loader2
                        size={14}
                        className="animate-spin"
                        />
                    ) : (
                        <Trash2 size={14} />
                    )}
                    </button>
                    </div>
                  </div>
                )
                    }
                    )}
                </div>
            </div>
            ))}
        </div>
        ) : (
          <div
            className={[
              'flex',
              'min-h-[150px]',
              'flex-col',
              'items-center',
              'justify-center',
              'px-5',
              'text-center',
            ].join(' ')}
          >
            <div
              className={[
                'mb-3',
                'flex',
                'h-11',
                'w-11',
                'items-center',
                'justify-center',
                'rounded-xl',
                'bg-gray-50',
                'text-gray-400',
                'dark:bg-slate-900',
                'dark:text-slate-500',
              ].join(' ')}
            >
              <FileText size={20} />
            </div>

            <p
              className={[
                'text-sm',
                'font-medium',
                'text-gray-600',
                'dark:text-slate-300',
              ].join(' ')}
            >
              {busca
                ? 'Nenhum documento encontrado'
                : 'Nenhum documento cadastrado'}
            </p>

            <p
              className={[
                'mt-1',
                'text-xs',
                'text-gray-400',
                'dark:text-slate-500',
              ].join(' ')}
            >
              {busca
                ? 'Tente pesquisar por outro termo.'
                : 'Adicione o primeiro documento deste cliente.'}
            </p>
          </div>
        )}
      </div>

      <div
        className={[
          'border-t',
          'border-gray-100',
          'p-3',
          'dark:border-slate-800',
        ].join(' ')}
      >
        <button
          type="button"
          onClick={handleAdicionar}
          className={[
            'flex',
            'w-full',
            'items-center',
            'justify-center',
            'gap-2',
            'rounded-lg',
            'border',
            'border-dashed',
            'border-gray-300',
            'py-2.5',
            'text-sm',
            'font-medium',
            'text-gray-600',
            'transition',
            'hover:border-blue-300',
            'hover:bg-blue-50',
            'hover:text-blue-600',
            'dark:border-slate-700',
            'dark:text-slate-300',
            'dark:hover:border-blue-800',
            'dark:hover:bg-blue-950/30',
            'dark:hover:text-blue-400',
          ].join(' ')}
        >
          <Plus size={15} />
          Adicionar documento
        </button>
      </div>
    </div>
  )
}

export default DocumentosMenu