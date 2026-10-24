import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Archive,
  ChevronRight,
  Download,
  ExternalLink,
  File,
  FileAudio,
  FileImage,
  FileText,
  FileVideo,
  FolderArchive,
  HardDrive,
  Loader2,
  MessageCircle,
  RefreshCw,
  Search,
  ShieldAlert,
  Trash2,
  Users,
  PhoneCall,
} from 'lucide-react'

import { useAuth } from '../../../../auth/AuthContext'

import {
  buscarStorageDashboard,
  buscarStorageDashboardCarteira,
  criarUrlLeituraStorage,
  excluirArquivoStorage,
  formatarBytes,
  listarCorretoresStorage,
  listarStorageArquivos,
  type StorageArquivo,
  type StorageCategoriaDocumento,
  type StorageClassificacaoArquivo,
  type StorageCorretor,
  type StorageDashboard,
  type StorageDashboardCarteira,
  type StorageOrigem,
  type StorageTipoArquivo,
  type StorageTipoTitularDocumento,
} from './storageService'

const ORIGENS: Array<{ value: StorageOrigem; label: string }> = [
  { value: 'WHATSAPP', label: 'WhatsApp' },
  { value: 'DOCUMENTOS', label: 'Documentos' },
  { value: 'SINISTRO', label: 'Sinistros' },
  { value: 'ASSISTENCIA', label: 'Assistências' },
  { value: 'CLIENTE', label: 'Clientes' },
  { value: 'EMPRESA', label: 'Empresas' },
  { value: 'OUTRO', label: 'Outros' },
]

const TIPOS_ARQUIVO: Array<{ value: StorageTipoArquivo; label: string }> = [
  { value: 'IMAGEM', label: 'Imagens' },
  { value: 'AUDIO', label: 'Áudios' },
  { value: 'VIDEO', label: 'Vídeos' },
  { value: 'DOCUMENTO', label: 'Documentos' },
  { value: 'OUTRO', label: 'Outros' },
]

const TIPOS_WHATSAPP: Array<{ value: StorageClassificacaoArquivo; label: string }> = [
  { value: 'IMAGEM', label: 'Imagens' },
  { value: 'AUDIO', label: 'Áudios' },
  { value: 'VIDEO', label: 'Vídeos' },
  { value: 'DOCUMENTO', label: 'Documentos' },
  { value: 'LIGACAO', label: 'Ligações' },
]

const LABELS_CATEGORIAS: Partial<Record<StorageCategoriaDocumento, string>> = {
  APOLICE: 'Apólices',
  COTACAO: 'Cotações',
  PROPOSTA: 'Propostas',
  ENDOSSO: 'Endossos',
  BOLETO: 'Boletos / Parcelas',
  CERTIFICADO: 'Certificados / Carteirinhas',
  RG: 'RG',
  CNH: 'CNH',
  CPF: 'CPF',
  COMPROVANTE_RESIDENCIA: 'Comprovantes de residência',
  COMPROVANTE_RENDA: 'Comprovantes de renda',
  CERTIDAO_NASCIMENTO: 'Certidões de nascimento',
  CERTIDAO_CASAMENTO: 'Certidões de casamento',
  PASSAPORTE: 'Passaportes',
  CRLV: 'CRLV / Documentos de veículos',
  OUTRO_PF: 'Outros documentos pessoais',
  CONTRATO_SOCIAL: 'Contratos sociais',
  CARTAO_CNPJ: 'Cartões CNPJ',
  ALTERACAO_CONTRATUAL: 'Alterações contratuais',
  COMPROVANTE_ENDERECO_PJ: 'Comprovantes de endereço empresarial',
  FATURAMENTO: 'Faturamento',
  BALANCO_DRE: 'Balanço / DRE',
  RELACAO_FUNCIONARIOS: 'Relação de funcionários',
  RELACAO_VEICULOS: 'Frota / Relação de veículos',
  OUTRO_PJ: 'Outros documentos empresariais',
}

const CATEGORIAS_DOCUMENTOS: StorageCategoriaDocumento[] = [
  'APOLICE',
  'COTACAO',
  'PROPOSTA',
  'ENDOSSO',
  'BOLETO',
  'CERTIFICADO',
]

const CATEGORIAS_CLIENTE: StorageCategoriaDocumento[] = [
  'RG',
  'CNH',
  'CPF',
  'COMPROVANTE_RESIDENCIA',
  'COMPROVANTE_RENDA',
  'CERTIDAO_NASCIMENTO',
  'CERTIDAO_CASAMENTO',
  'PASSAPORTE',
  'CRLV',
  'OUTRO_PF',
]

const CATEGORIAS_EMPRESA: StorageCategoriaDocumento[] = [
  'CONTRATO_SOCIAL',
  'CARTAO_CNPJ',
  'ALTERACAO_CONTRATUAL',
  'COMPROVANTE_ENDERECO_PJ',
  'FATURAMENTO',
  'BALANCO_DRE',
  'RELACAO_FUNCIONARIOS',
  'RELACAO_VEICULOS',
  'CRLV',
  'OUTRO_PJ',
]

const CATEGORIAS_SOCIOS: StorageCategoriaDocumento[] = [
  'RG',
  'CNH',
  'CPF',
  'COMPROVANTE_RESIDENCIA',
  'COMPROVANTE_RENDA',
  'CERTIDAO_NASCIMENTO',
  'CERTIDAO_CASAMENTO',
  'PASSAPORTE',
  'OUTRO_PF',
]

interface ItemSubcategoria {
  id: string
  label: string
  totalArquivos: number
  tamanhoBytes: number
  tipoArquivo?: StorageClassificacaoArquivo
  categoria?: StorageCategoriaDocumento
  titular?: StorageTipoTitularDocumento
}

interface SecaoSubcategorias {
  id: string
  titulo: string
  descricao?: string
  itens: ItemSubcategoria[]
}

function formatarData(data: string): string {
  if (!data) return '-'
  const valor = new Date(data)
  if (Number.isNaN(valor.getTime())) return '-'
  return valor.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function labelOrigem(origem: StorageOrigem): string {
  return ORIGENS.find((item) => item.value === origem)?.label ?? origem
}

function labelTipo(tipo: StorageClassificacaoArquivo): string {
  return (
    TIPOS_WHATSAPP.find((item) => item.value === tipo)?.label ??
    TIPOS_ARQUIVO.find((item) => item.value === tipo)?.label ??
    tipo
  )
}

function labelCategoria(
  categoria: StorageCategoriaDocumento | string | null | undefined
): string {
  if (!categoria) return 'Sem categoria'
  return LABELS_CATEGORIAS[categoria as StorageCategoriaDocumento] ?? categoria
}

function IconeArquivo({
  tipo,
  className = 'h-5 w-5',
}: {
  tipo: StorageClassificacaoArquivo
  className?: string
}) {
  switch (tipo) {
    case 'IMAGEM':
      return <FileImage className={className} />
    case 'AUDIO':
      return <FileAudio className={className} />
    case 'VIDEO':
      return <FileVideo className={className} />
    case 'DOCUMENTO':
      return <FileText className={className} />
    case 'LIGACAO':
      return <PhoneCall className={className} />
    default:
      return <File className={className} />
  }
}

function formatarTelefoneContexto(value?: string | null) {
  if (!value) return ''
  const digits = value.replace(/\D/g, '')
  const nacional =
    digits.startsWith('55') && digits.length >= 12
      ? digits.slice(2)
      : digits

  if (nacional.length === 11) {
    return nacional.replace(
      /^(\d{2})(\d{5})(\d{4})$/,
      '($1) $2-$3'
    )
  }

  if (nacional.length === 10) {
    return nacional.replace(
      /^(\d{2})(\d{4})(\d{4})$/,
      '($1) $2-$3'
    )
  }

  return value
}

function formatarDocumentoContexto(value?: string | null) {
  if (!value) return ''
  const digits = value.replace(/\D/g, '')

  if (digits.length === 11) {
    return digits.replace(
      /^(\d{3})(\d{3})(\d{3})(\d{2})$/,
      '$1.$2.$3-$4'
    )
  }

  if (digits.length === 14) {
    return digits.replace(
      /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
      '$1.$2.$3/$4-$5'
    )
  }

  return value
}

function CardResumo({
  titulo,
  valor,
  subtitulo,
  icon: Icon,
}: {
  titulo: string
  valor: string
  subtitulo?: string
  icon: typeof HardDrive
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
            {titulo}
          </p>
          <p className="mt-2 truncate text-2xl font-semibold text-slate-900 dark:text-slate-100">
            {valor}
          </p>
          {subtitulo && (
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {subtitulo}
            </p>
          )}
        </div>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600 dark:bg-slate-900 dark:text-slate-300">
          <Icon size={20} />
        </div>
      </div>
    </div>
  )
}

export default function CentralArmazenamento() {
  const { userProfile, loading: authLoading } = useAuth()

  const [dashboardGlobal, setDashboardGlobal] =
    useState<StorageDashboard | null>(null)

  const [dashboardCarteira, setDashboardCarteira] =
    useState<StorageDashboardCarteira | null>(null)

  const [corretores, setCorretores] =
    useState<StorageCorretor[]>([])

  const [corretorSelecionado, setCorretorSelecionado] =
    useState('')

  const [arquivos, setArquivos] =
    useState<StorageArquivo[]>([])

  const [loadingDashboard, setLoadingDashboard] =
    useState(true)

  const [loadingArquivos, setLoadingArquivos] =
    useState(true)

  const [loadingCorretores, setLoadingCorretores] =
    useState(false)

  const [atualizando, setAtualizando] =
    useState(false)

  const [erroDashboard, setErroDashboard] =
    useState('')

  const [erroArquivos, setErroArquivos] =
    useState('')

  const [buscaDigitada, setBuscaDigitada] =
    useState('')

  const [busca, setBusca] =
    useState('')

  const [origem, setOrigem] =
    useState<StorageOrigem | ''>('')

  const [tipoArquivo, setTipoArquivo] =
    useState<StorageClassificacaoArquivo | ''>('')

  const [
    categoriaDocumento,
    setCategoriaDocumento,
  ] = useState<StorageCategoriaDocumento | ''>('')

  const [
    tipoTitularDocumento,
    setTipoTitularDocumento,
  ] = useState<StorageTipoTitularDocumento | ''>('')

  const [pagina, setPagina] =
    useState(1)

  const [totalArquivos, setTotalArquivos] =
    useState(0)

  const [totalPaginas, setTotalPaginas] =
    useState(0)

  const [arquivoEmAcao, setArquivoEmAcao] =
    useState<string | null>(null)

  const porPagina = 20

  const isCorretora =
    userProfile?.tipo_usuario === 'CORRETORA'

  const isCorretor =
    userProfile?.tipo_usuario === 'CORRETOR'

  const podeAcessar =
    Boolean(userProfile) &&
    (isCorretora || isCorretor)

  const podeExcluir =
    isCorretora

  const corretoraId = useMemo(() => {
    if (!userProfile) return null

    if (userProfile.tipo_usuario === 'CORRETORA') {
      return userProfile.id
    }

    if (userProfile.tipo_usuario === 'CORRETOR') {
      return userProfile.corretora_id || null
    }

    return null
  }, [userProfile])

  const corretorFiltroEfetivo = useMemo(() => {
    if (!userProfile) return null

    if (isCorretor) {
      return userProfile.id
    }

    if (isCorretora && corretorSelecionado) {
      return corretorSelecionado
    }

    return null
  }, [
    userProfile,
    isCorretor,
    isCorretora,
    corretorSelecionado,
  ])

  const usandoRecorteCarteira =
    isCorretor ||
    Boolean(corretorSelecionado)

  const dashboardAtivo =
    usandoRecorteCarteira
      ? dashboardCarteira
      : dashboardGlobal

  const subcategoriasAtivas =
    dashboardAtivo?.subcategorias ?? []

  const consumoPorOrigemAtivo =
    dashboardAtivo?.consumo_por_origem ?? []

  const carregarCorretores =
    useCallback(async () => {
      if (
        !corretoraId ||
        !isCorretora
      ) {
        setCorretores([])
        return
      }

      setLoadingCorretores(true)

      try {
        const resultado =
          await listarCorretoresStorage(
            corretoraId
          )

        setCorretores(resultado)
      } catch (error) {
        console.error(
          'Erro ao carregar corretores da Central:',
          error
        )

        setCorretores([])
      } finally {
        setLoadingCorretores(false)
      }
    }, [
      corretoraId,
      isCorretora,
    ])

  const carregarDashboard =
    useCallback(async () => {
      if (!corretoraId) return

      setLoadingDashboard(true)
      setErroDashboard('')

      try {
        if (usandoRecorteCarteira) {
          const resultado =
            await buscarStorageDashboardCarteira(
              corretoraId,
              corretorFiltroEfetivo
            )

          setDashboardCarteira(resultado)
          return
        }

        const resultado =
          await buscarStorageDashboard(
            corretoraId
          )

        setDashboardGlobal(resultado)
      } catch (error) {
        console.error(
          'Erro ao carregar dashboard de armazenamento:',
          error
        )

        setErroDashboard(
          error instanceof Error
            ? error.message
            : 'Não foi possível carregar o resumo do armazenamento.'
        )
      } finally {
        setLoadingDashboard(false)
      }
    }, [
      corretoraId,
      usandoRecorteCarteira,
      corretorFiltroEfetivo,
    ])

  const carregarArquivos =
    useCallback(async () => {
      if (!corretoraId) return

      setLoadingArquivos(true)
      setErroArquivos('')

      try {
        const resultado =
          await listarStorageArquivos(
            corretoraId,
            {
              busca:
                busca || undefined,

              origem:
                origem || undefined,

              tipo_arquivo:
                tipoArquivo &&
                tipoArquivo !== 'LIGACAO'
                  ? tipoArquivo
                  : undefined,

              gravacao_ligacao:
                origem === 'WHATSAPP' &&
                tipoArquivo === 'LIGACAO'
                  ? true
                  : origem === 'WHATSAPP' &&
                      tipoArquivo === 'AUDIO'
                    ? false
                    : undefined,

              categoria_documento:
                categoriaDocumento ||
                undefined,

              tipo_titular_documento:
                tipoTitularDocumento ||
                undefined,

              corretor_id:
                corretorFiltroEfetivo ||
                undefined,

              status: 'ATIVO',
              pagina,
              por_pagina: porPagina,
            }
          )

        setArquivos(
          resultado.arquivos
        )

        setTotalArquivos(
          resultado.total
        )

        setTotalPaginas(
          resultado.total_paginas
        )
      } catch (error) {
        console.error(
          'Erro ao carregar arquivos:',
          error
        )

        setArquivos([])
        setTotalArquivos(0)
        setTotalPaginas(0)

        setErroArquivos(
          error instanceof Error
            ? error.message
            : 'Não foi possível carregar os arquivos.'
        )
      } finally {
        setLoadingArquivos(false)
      }
    }, [
      corretoraId,
      busca,
      origem,
      tipoArquivo,
      categoriaDocumento,
      tipoTitularDocumento,
      corretorFiltroEfetivo,
      pagina,
    ])

  const atualizarTudo =
    useCallback(async () => {
      if (!corretoraId) return

      setAtualizando(true)

      try {
        const tarefas: Promise<unknown>[] = [
          carregarDashboard(),
          carregarArquivos(),
        ]

        if (isCorretora) {
          tarefas.push(
            carregarCorretores()
          )
        }

        await Promise.all(tarefas)
      } finally {
        setAtualizando(false)
      }
    }, [
      corretoraId,
      isCorretora,
      carregarDashboard,
      carregarArquivos,
      carregarCorretores,
    ])

  useEffect(() => {
    if (!corretoraId) {
      setLoadingDashboard(false)
      return
    }

    carregarDashboard()
  }, [
    corretoraId,
    carregarDashboard,
  ])

  useEffect(() => {
    if (!corretoraId) {
      setLoadingArquivos(false)
      return
    }

    carregarArquivos()
  }, [
    corretoraId,
    carregarArquivos,
  ])

  useEffect(() => {
    if (
      corretoraId &&
      isCorretora
    ) {
      carregarCorretores()
    }
  }, [
    corretoraId,
    isCorretora,
    carregarCorretores,
  ])

  useEffect(() => {
    const timer =
      window.setTimeout(() => {
        setBusca(
          buscaDigitada.trim()
        )

        setPagina(1)
      }, 400)

    return () => {
      window.clearTimeout(timer)
    }
  }, [buscaDigitada])

  useEffect(() => {
    setPagina(1)
  }, [corretorSelecionado])

  const percentualUsado =
    !usandoRecorteCarteira
      ? dashboardGlobal?.percentual_usado ?? 0
      : dashboardGlobal?.limite_bytes
        ? Math.min(
            100,
            (
              (dashboardCarteira?.usado_bytes ?? 0) /
              dashboardGlobal.limite_bytes
            ) * 100
          )
        : 0

  const inicioExibicao =
    totalArquivos === 0
      ? 0
      : (pagina - 1) *
          porPagina +
        1

  const fimExibicao =
    Math.min(
      pagina * porPagina,
      totalArquivos
    )

  const corretorSelecionadoNome =
    useMemo(() => {
      if (isCorretor) {
        return userProfile?.nome ||
          'Minha carteira'
      }

      if (!corretorSelecionado) {
        return null
      }

      return (
        corretores.find(
          (item) =>
            item.id ===
            corretorSelecionado
        )?.nome ??
        'Corretor selecionado'
      )
    }, [
      isCorretor,
      userProfile,
      corretorSelecionado,
      corretores,
    ])

  const consumoOrigemSelecionada =
    useMemo(() => {
      if (!origem) {
        return null
      }

      return (
        consumoPorOrigemAtivo.find(
          (item) =>
            item.origem === origem
        ) ?? null
      )
    }, [
      consumoPorOrigemAtivo,
      origem,
    ])

  const linhasOrigemSelecionada =
    useMemo(() => {
      if (!origem) {
        return []
      }

      return subcategoriasAtivas.filter(
        (item) =>
          item.origem === origem
      )
    }, [
      subcategoriasAtivas,
      origem,
    ])

  const totalSemCategoria =
    useMemo(() => {
      if (!origem) return 0

      return linhasOrigemSelecionada
        .filter(
          (item) =>
            !item.categoria_documento
        )
        .reduce(
          (total, item) =>
            total +
            item.total_arquivos,
          0
        )
    }, [
      origem,
      linhasOrigemSelecionada,
    ])

  const maiorOrigem =
    useMemo(() => {
      if (!usandoRecorteCarteira) {
        return null
      }

      return consumoPorOrigemAtivo
        .filter(
          (item) =>
            item.tamanho_bytes > 0
        )
        .sort(
          (a, b) =>
            b.tamanho_bytes -
            a.tamanho_bytes
        )[0] ?? null
    }, [
      usandoRecorteCarteira,
      consumoPorOrigemAtivo,
    ])

  const secoesSubcategorias =
    useMemo<SecaoSubcategorias[]>(() => {
      if (!origem) {
        return []
      }

      const linhas =
        subcategoriasAtivas.filter(
          (item) =>
            item.origem === origem
        )

      const montarPorTipoArquivo =
        (): ItemSubcategoria[] => {
          const tipos =
            origem === 'WHATSAPP'
              ? TIPOS_WHATSAPP
              : TIPOS_ARQUIVO

          return tipos.map(
            (tipo) => {
              const correspondentes =
                linhas.filter(
                  (item) =>
                    item.tipo_arquivo ===
                    tipo.value
                )

              const totalArquivos =
                correspondentes.reduce(
                  (total, item) =>
                    total +
                    item.total_arquivos,
                  0
                )

              const tamanhoBytes =
                correspondentes.reduce(
                  (total, item) =>
                    total +
                    item.tamanho_bytes,
                  0
                )

              return {
                id: `TIPO_${tipo.value}`,
                label: tipo.label,
                totalArquivos,
                tamanhoBytes,
                tipoArquivo:
                  tipo.value,
              }
            }
          ).filter(
            (item) =>
              item.totalArquivos > 0
          )
        }

      const montarPorCategoria = (
        categorias: StorageCategoriaDocumento[],
        titular?:
          StorageTipoTitularDocumento
      ): ItemSubcategoria[] => {
        return categorias
          .map((categoria) => {
            const correspondentes =
              linhas.filter(
                (item) => {
                  if (
                    item.categoria_documento !==
                    categoria
                  ) {
                    return false
                  }

                  if (
                    titular &&
                    item.tipo_titular_documento !==
                      titular
                  ) {
                    return false
                  }

                  return true
                }
              )

            const totalArquivos =
              correspondentes.reduce(
                (total, item) =>
                  total +
                  item.total_arquivos,
                0
              )

            const tamanhoBytes =
              correspondentes.reduce(
                (total, item) =>
                  total +
                  item.tamanho_bytes,
                0
              )

            return {
              id: `${titular ?? 'GERAL'}_${categoria}`,
              label:
                labelCategoria(
                  categoria
                ),
              totalArquivos,
              tamanhoBytes,
              categoria,
              titular,
            }
          })
          .filter(
            (item) =>
              item.totalArquivos > 0
          )
      }

      if (
        origem === 'WHATSAPP'
      ) {
        return [
          {
            id: 'WHATSAPP_TIPOS',
            titulo:
              'Arquivos do WhatsApp',
            descricao:
              'Navegue pelos arquivos conforme o formato armazenado.',
            itens:
              montarPorTipoArquivo(),
          },
        ]
      }

      if (
        origem === 'DOCUMENTOS'
      ) {
        return [
          {
            id: 'DOCUMENTOS_GERAIS',
            titulo: 'Documentos',
            descricao:
              'Documentos comerciais e securitários armazenados.',
            itens:
              montarPorCategoria(
                CATEGORIAS_DOCUMENTOS
              ),
          },
        ]
      }

      if (
        origem === 'CLIENTE'
      ) {
        return [
          {
            id: 'DOCUMENTOS_CLIENTE',
            titulo:
              'Documentos pessoais',
            descricao:
              'Documentos vinculados diretamente a clientes pessoa física.',
            itens:
              montarPorCategoria(
                CATEGORIAS_CLIENTE,
                'CLIENTE'
              ),
          },
        ]
      }

      if (
        origem === 'EMPRESA'
      ) {
        return [
          {
            id: 'DOCUMENTOS_EMPRESA',
            titulo:
              'Documentos empresariais',
            descricao:
              'Documentos pertencentes à empresa.',
            itens:
              montarPorCategoria(
                CATEGORIAS_EMPRESA,
                'EMPRESA'
              ),
          },
          {
            id: 'DOCUMENTOS_SOCIOS',
            titulo:
              'Sócios / representantes',
            descricao:
              'Documentos pessoais de sócios e representantes vinculados à empresa.',
            itens:
              montarPorCategoria(
                CATEGORIAS_SOCIOS,
                'SOCIO_REPRESENTANTE'
              ),
          },
        ].filter(
          (secao) =>
            secao.itens.length > 0
        )
      }

      return [
        {
          id: `${origem}_TIPOS`,
          titulo:
            `Arquivos de ${labelOrigem(
              origem
            )}`,
          descricao:
            'Navegue pelos arquivos conforme o formato armazenado.',
          itens:
            montarPorTipoArquivo(),
        },
      ]
    }, [
      subcategoriasAtivas,
      origem,
    ])

  const labelFiltroSelecionado =
    useMemo(() => {
      if (categoriaDocumento) {
        return labelCategoria(
          categoriaDocumento
        )
      }

      if (tipoArquivo) {
        return labelTipo(
          tipoArquivo
        )
      }

      return null
    }, [
      categoriaDocumento,
      tipoArquivo,
    ])

  const tituloTabela =
    useMemo(() => {
      if (
        categoriaDocumento &&
        tipoTitularDocumento ===
          'SOCIO_REPRESENTANTE'
      ) {
        return `${labelCategoria(
          categoriaDocumento
        )} de sócios / representantes`
      }

      if (categoriaDocumento) {
        return labelCategoria(
          categoriaDocumento
        )
      }

      if (
        origem &&
        tipoArquivo
      ) {
        return `${labelTipo(
          tipoArquivo
        )} — ${labelOrigem(
          origem
        )}`
      }

      if (origem) {
        return `Arquivos — ${labelOrigem(
          origem
        )}`
      }

      return 'Arquivos'
    }, [
      origem,
      tipoArquivo,
      categoriaDocumento,
      tipoTitularDocumento,
    ])

  const limparNavegacao =
    useCallback(() => {
      setOrigem('')
      setTipoArquivo('')
      setCategoriaDocumento('')
      setTipoTitularDocumento('')
      setPagina(1)
    }, [])

  const selecionarOrigem =
    useCallback(
      (
        novaOrigem:
          StorageOrigem
      ) => {
        setOrigem(novaOrigem)
        setTipoArquivo('')
        setCategoriaDocumento('')
        setTipoTitularDocumento('')
        setPagina(1)
      },
      []
    )

  const selecionarSubcategoria =
    useCallback(
      (
        item:
          ItemSubcategoria
      ) => {
        if (
          item.tipoArquivo
        ) {
          setTipoArquivo(
            item.tipoArquivo
          )

          setCategoriaDocumento('')
          setTipoTitularDocumento('')
        } else if (
          item.categoria
        ) {
          setCategoriaDocumento(
            item.categoria
          )

          setTipoTitularDocumento(
            item.titular ?? ''
          )

          setTipoArquivo('')
        }

        setPagina(1)
      },
      []
    )

  const limparSubcategoria =
    useCallback(() => {
      setTipoArquivo('')
      setCategoriaDocumento('')
      setTipoTitularDocumento('')
      setPagina(1)
    }, [])

  const handleVisualizarArquivo =
    async (
      arquivo:
        StorageArquivo
    ) => {
      if (arquivoEmAcao) return

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

        const mensagem =
          error instanceof Error
            ? error.message
            : 'Não foi possível visualizar o arquivo.'

        alert(mensagem)
      } finally {
        setArquivoEmAcao(null)
      }
    }

  const handleBaixarArquivo =
    async (
      arquivo:
        StorageArquivo
    ) => {
      if (arquivoEmAcao) return

      try {
        setArquivoEmAcao(
          arquivo.id
        )

        const readUrl =
          await criarUrlLeituraStorage(
            arquivo.storage_path
          )

        const response =
          await fetch(readUrl)

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
          document.createElement('a')

        link.href = blobUrl
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
        const mensagem =
          error instanceof Error
            ? error.message
            : 'Não foi possível baixar o arquivo.'

        alert(mensagem)
      } finally {
        setArquivoEmAcao(null)
      }
    }

  const handleExcluirArquivo =
    async (
      arquivo:
        StorageArquivo
    ) => {
      if (
        arquivoEmAcao ||
        !podeExcluir
      ) {
        return
      }

      const confirmado =
        window.confirm(
          `Deseja realmente excluir o arquivo "${arquivo.nome_original}"?\n\n` +
            'Esta ação é permanente e removerá o arquivo definitivamente do armazenamento.'
        )

      if (!confirmado) return

      try {
        setArquivoEmAcao(
          arquivo.id
        )

        await excluirArquivoStorage(
          arquivo.id
        )

        if (
          arquivos.length === 1 &&
          pagina > 1
        ) {
          setPagina(
            (paginaAtual) =>
              Math.max(
                1,
                paginaAtual - 1
              )
          )

          await carregarDashboard()
        } else {
          await Promise.all([
            carregarDashboard(),
            carregarArquivos(),
          ])
        }

        alert(
          'Arquivo excluído com sucesso.'
        )
      } catch (error) {
        console.error(
          'Erro ao excluir arquivo:',
          error
        )

        const mensagem =
          error instanceof Error
            ? error.message
            : 'Não foi possível excluir o arquivo.'

        alert(mensagem)
      } finally {
        setArquivoEmAcao(null)
      }
    }

  if (authLoading) {
    return (
      <div className="flex min-h-[500px] items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-slate-500" />
      </div>
    )
  }

  if (!podeAcessar) {
    return (
      <div className="flex min-h-[500px] items-center justify-center p-6">
        <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-600 dark:bg-slate-900 dark:text-slate-300">
            <ShieldAlert size={24} />
          </div>

          <h1 className="mt-4 text-lg font-semibold text-slate-900 dark:text-slate-100">
            Acesso restrito
          </h1>

          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            A Central de Armazenamento está disponível somente para perfis de corretora e corretor autorizados.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-full bg-slate-50 p-4 dark:bg-slate-950 md:p-6">
      <div className="mx-auto w-full max-w-[1600px]">
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900">
                <FolderArchive size={22} />
              </div>

              <div>
                <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
                  Central de Armazenamento
                </h1>

                <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
                  {isCorretor
                    ? 'Arquivos e consumo de armazenamento vinculados à sua carteira de clientes.'
                    : 'Controle de arquivos e consumo de armazenamento da corretora.'}
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            {isCorretora && (
              <select
                value={corretorSelecionado}
                disabled={loadingCorretores}
                onChange={(event) => {
                  setCorretorSelecionado(
                    event.target.value
                  )
                  setPagina(1)
                  limparNavegacao()
                }}
                className="h-10 min-w-[240px] rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 shadow-sm outline-none transition focus:border-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              >
                <option value="">
                  Todos os corretores
                </option>

                {corretores.map(
                  (corretor) => (
                    <option
                      key={corretor.id}
                      value={corretor.id}
                    >
                      {corretor.nome}
                    </option>
                  )
                )}
              </select>
            )}

            <button
              type="button"
              onClick={atualizarTudo}
              disabled={atualizando}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <RefreshCw
                size={16}
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

        {usandoRecorteCarteira && (
          <div className="mb-4 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 dark:border-blue-900/50 dark:bg-blue-950/20">
            <div className="flex items-center gap-2">
              <Users
                size={17}
                className="text-blue-600 dark:text-blue-400"
              />
              <p className="text-sm font-medium text-blue-800 dark:text-blue-300">
                {isCorretor
                  ? 'Visualizando somente arquivos vinculados aos clientes da sua carteira.'
                  : `Visualizando arquivos da carteira de ${corretorSelecionadoNome}.`}
              </p>
            </div>
          </div>
        )}

        {erroDashboard && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
            {erroDashboard}
          </div>
        )}

        {loadingDashboard ? (
          <div className="mb-6 flex min-h-[160px] items-center justify-center rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
            <Loader2 className="h-6 w-6 animate-spin text-slate-500" />
          </div>
        ) : dashboardAtivo ? (
          <>
            {!usandoRecorteCarteira && dashboardGlobal ? (
              <>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  <CardResumo
                    titulo="Armazenamento contratado"
                    valor={formatarBytes(
                      dashboardGlobal.limite_bytes
                    )}
                    subtitulo={
                      dashboardGlobal.config
                        .liberar_excedente
                        ? 'Excedente permitido'
                        : 'Limite controlado'
                    }
                    icon={HardDrive}
                  />

                  <CardResumo
                    titulo="Espaço utilizado"
                    valor={formatarBytes(
                      dashboardGlobal.usado_bytes
                    )}
                    subtitulo={`${percentualUsado.toLocaleString(
                      'pt-BR',
                      {
                        minimumFractionDigits: 1,
                        maximumFractionDigits: 1,
                      }
                    )}% do contratado`}
                    icon={Archive}
                  />

                  <CardResumo
                    titulo="Espaço disponível"
                    valor={formatarBytes(
                      dashboardGlobal.disponivel_bytes
                    )}
                    subtitulo={
                      dashboardGlobal.config.ativo
                        ? 'Armazenamento ativo'
                        : 'Armazenamento inativo'
                    }
                    icon={HardDrive}
                  />

                  <CardResumo
                    titulo="Arquivos armazenados"
                    valor={dashboardGlobal.total_arquivos.toLocaleString(
                      'pt-BR'
                    )}
                    subtitulo="Arquivos ativos"
                    icon={File}
                  />
                </div>

                <div className="mt-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
                  <div className="mb-3 flex items-center justify-between gap-4">
                    <div>
                      <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        Utilização do armazenamento
                      </h2>

                      <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                        {formatarBytes(
                          dashboardGlobal.usado_bytes
                        )}{' '}
                        de{' '}
                        {formatarBytes(
                          dashboardGlobal.limite_bytes
                        )}
                      </p>
                    </div>

                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                      {percentualUsado.toLocaleString(
                        'pt-BR',
                        {
                          minimumFractionDigits: 1,
                          maximumFractionDigits: 1,
                        }
                      )}
                      %
                    </span>
                  </div>

                  <div className="h-2.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div
                      className="h-full rounded-full bg-blue-600 transition-all duration-300"
                      style={{
                        width: `${Math.min(
                          100,
                          Math.max(
                            0,
                            percentualUsado
                          )
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              </>
            ) : dashboardCarteira ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <CardResumo
                  titulo={
                    isCorretor
                      ? 'Arquivos da minha carteira'
                      : 'Arquivos deste corretor'
                  }
                  valor={dashboardCarteira.total_arquivos.toLocaleString(
                    'pt-BR'
                  )}
                  subtitulo="Arquivos ativos vinculados à carteira"
                  icon={File}
                />

                <CardResumo
                  titulo={
                    isCorretor
                      ? 'Espaço da minha carteira'
                      : 'Consumo deste corretor'
                  }
                  valor={formatarBytes(
                    dashboardCarteira.usado_bytes
                  )}
                  subtitulo={
                    dashboardGlobal?.limite_bytes
                      ? `${percentualUsado.toLocaleString(
                          'pt-BR',
                          {
                            minimumFractionDigits: 1,
                            maximumFractionDigits: 1,
                          }
                        )}% do armazenamento contratado`
                      : 'Consumo dos arquivos vinculados'
                  }
                  icon={Archive}
                />

                <CardResumo
                  titulo="Clientes com arquivos"
                  valor={dashboardCarteira.total_clientes.toLocaleString(
                    'pt-BR'
                  )}
                  subtitulo="Pessoas e empresas com arquivos vinculados"
                  icon={Users}
                />

                <CardResumo
                  titulo="Maior origem de consumo"
                  valor={
                    maiorOrigem
                      ? labelOrigem(
                          maiorOrigem.origem
                        )
                      : '-'
                  }
                  subtitulo={
                    maiorOrigem
                      ? formatarBytes(
                          maiorOrigem.tamanho_bytes
                        )
                      : 'Nenhum consumo registrado'
                  }
                  icon={FolderArchive}
                />
              </div>
            ) : null}

            <div className="mt-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Consumo por origem
                </h2>

                {origem && (
                  <button
                    type="button"
                    onClick={limparNavegacao}
                    className="text-xs font-medium text-blue-600 transition hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                  >
                    Ver todos os arquivos
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
                {consumoPorOrigemAtivo.map(
                  (item) => {
                    const selecionado =
                      origem ===
                      item.origem

                    return (
                      <button
                        key={item.origem}
                        type="button"
                        onClick={() =>
                          selecionarOrigem(
                            item.origem
                          )
                        }
                        className={`group rounded-xl border p-4 text-left shadow-sm transition ${
                          selecionado
                            ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-500/10 dark:border-blue-500 dark:bg-blue-950/20'
                            : 'border-slate-200 bg-white hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-950 dark:hover:border-blue-700'
                        }`}
                      >
                        <div
                          className={`mb-3 flex h-9 w-9 items-center justify-center rounded-lg transition ${
                            selecionado
                              ? 'bg-blue-600 text-white'
                              : 'bg-slate-100 text-slate-600 group-hover:bg-blue-50 group-hover:text-blue-600 dark:bg-slate-900 dark:text-slate-300 dark:group-hover:bg-blue-950/40 dark:group-hover:text-blue-400'
                          }`}
                        >
                          {item.origem ===
                          'WHATSAPP' ? (
                            <MessageCircle
                              size={18}
                            />
                          ) : (
                            <FolderArchive
                              size={18}
                            />
                          )}
                        </div>

                        <p
                          className={`truncate text-xs font-medium ${
                            selecionado
                              ? 'text-blue-700 dark:text-blue-300'
                              : 'text-slate-500 dark:text-slate-400'
                          }`}
                        >
                          {labelOrigem(
                            item.origem
                          )}
                        </p>

                        <p className="mt-1 truncate text-base font-semibold text-slate-900 dark:text-slate-100">
                          {formatarBytes(
                            item.tamanho_bytes
                          )}
                        </p>

                        <p className="mt-1 text-xs text-slate-400">
                          {item.total_arquivos.toLocaleString(
                            'pt-BR'
                          )}{' '}
                          {item.total_arquivos ===
                          1
                            ? 'arquivo'
                            : 'arquivos'}
                        </p>
                      </button>
                    )
                  }
                )}
              </div>
            </div>

            {origem && (
              <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
                <div className="border-b border-slate-200 px-5 py-4 dark:border-slate-800">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <FolderArchive
                          size={18}
                          className="text-blue-600 dark:text-blue-400"
                        />

                        <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                          {labelOrigem(
                            origem
                          )}
                        </h2>
                      </div>

                      {consumoOrigemSelecionada && (
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                          {consumoOrigemSelecionada.total_arquivos.toLocaleString(
                            'pt-BR'
                          )}{' '}
                          {consumoOrigemSelecionada.total_arquivos ===
                          1
                            ? 'arquivo'
                            : 'arquivos'}{' '}
                          •{' '}
                          {formatarBytes(
                            consumoOrigemSelecionada.tamanho_bytes
                          )}
                        </p>
                      )}
                    </div>

                    {(tipoArquivo ||
                      categoriaDocumento ||
                      tipoTitularDocumento) && (
                      <button
                        type="button"
                        onClick={
                          limparSubcategoria
                        }
                        className="inline-flex h-9 items-center justify-center rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                      >
                        Mostrar tudo de{' '}
                        {labelOrigem(
                          origem
                        )}
                      </button>
                    )}
                  </div>
                </div>

                <div className="p-5">
                  {secoesSubcategorias.length ===
                  0 ? (
                    <div className="rounded-lg border border-dashed border-slate-200 px-4 py-8 text-center dark:border-slate-800">
                      <FolderArchive className="mx-auto h-6 w-6 text-slate-400" />

                      <p className="mt-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                        Nenhuma subcategoria disponível
                      </p>

                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        Esta origem ainda não possui arquivos classificados.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {secoesSubcategorias.map(
                        (secao) => (
                          <div
                            key={secao.id}
                          >
                            <div className="mb-3">
                              <div className="flex items-center gap-2">
                                {secao.id ===
                                'DOCUMENTOS_SOCIOS' ? (
                                  <Users
                                    size={16}
                                    className="text-slate-500 dark:text-slate-400"
                                  />
                                ) : (
                                  <FolderArchive
                                    size={16}
                                    className="text-slate-500 dark:text-slate-400"
                                  />
                                )}

                                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                                  {secao.titulo}
                                </h3>
                              </div>

                              {secao.descricao && (
                                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                  {secao.descricao}
                                </p>
                              )}
                            </div>

                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                              {secao.itens.map(
                                (item) => {
                                  const selecionado =
                                    item.tipoArquivo
                                      ? tipoArquivo ===
                                        item.tipoArquivo
                                      : categoriaDocumento ===
                                          item.categoria &&
                                        (item.titular
                                          ? tipoTitularDocumento ===
                                            item.titular
                                          : true)

                                  return (
                                    <button
                                      key={item.id}
                                      type="button"
                                      onClick={() =>
                                        selecionarSubcategoria(
                                          item
                                        )
                                      }
                                      className={`group flex items-center gap-3 rounded-xl border p-3.5 text-left transition ${
                                        selecionado
                                          ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-500/10 dark:border-blue-500 dark:bg-blue-950/20'
                                          : 'border-slate-200 bg-slate-50/50 hover:border-blue-300 hover:bg-white hover:shadow-sm dark:border-slate-800 dark:bg-slate-900/40 dark:hover:border-blue-700 dark:hover:bg-slate-900'
                                      }`}
                                    >
                                      <div
                                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                                          selecionado
                                            ? 'bg-blue-600 text-white'
                                            : 'bg-white text-slate-500 shadow-sm group-hover:text-blue-600 dark:bg-slate-950 dark:text-slate-400 dark:group-hover:text-blue-400'
                                        }`}
                                      >
                                        {item.tipoArquivo ? (
                                          <IconeArquivo
                                            tipo={
                                              item.tipoArquivo
                                            }
                                            className="h-[18px] w-[18px]"
                                          />
                                        ) : item.titular ===
                                          'SOCIO_REPRESENTANTE' ? (
                                          <Users
                                            size={18}
                                          />
                                        ) : (
                                          <FileText
                                            size={18}
                                          />
                                        )}
                                      </div>

                                      <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-200">
                                          {item.label}
                                        </p>

                                        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                                          {item.totalArquivos.toLocaleString(
                                            'pt-BR'
                                          )}{' '}
                                          {item.totalArquivos ===
                                          1
                                            ? 'arquivo'
                                            : 'arquivos'}{' '}
                                          •{' '}
                                          {formatarBytes(
                                            item.tamanhoBytes
                                          )}
                                        </p>
                                      </div>

                                      <ChevronRight
                                        size={16}
                                        className={`shrink-0 ${
                                          selecionado
                                            ? 'text-blue-600 dark:text-blue-400'
                                            : 'text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-blue-500 dark:text-slate-700'
                                        }`}
                                      />
                                    </button>
                                  )
                                }
                              )}
                            </div>
                          </div>
                        )
                      )}

                      {totalSemCategoria >
                        0 &&
                        origem !==
                          'WHATSAPP' && (
                          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-900/50 dark:bg-amber-950/20">
                            <p className="text-xs font-medium text-amber-800 dark:text-amber-300">
                              {totalSemCategoria.toLocaleString(
                                'pt-BR'
                              )}{' '}
                              {totalSemCategoria ===
                              1
                                ? 'arquivo anterior não possui'
                                : 'arquivos anteriores não possuem'}{' '}
                              classificação documental.
                            </p>

                            <p className="mt-1 text-xs text-amber-700/80 dark:text-amber-400/80">
                              Esses arquivos continuam disponíveis ao selecionar todos os arquivos desta origem.
                            </p>
                          </div>
                        )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        ) : null}

        <div className="mt-6">
          <div className="mb-3 flex flex-wrap items-center gap-1.5 text-xs">
            <button
              type="button"
              onClick={
                limparNavegacao
              }
              className={`font-medium transition ${
                !origem
                  ? 'text-slate-900 dark:text-slate-100'
                  : 'text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300'
              }`}
            >
              Todos os arquivos
            </button>

            {origem && (
              <>
                <ChevronRight
                  size={14}
                  className="text-slate-400"
                />

                <button
                  type="button"
                  onClick={
                    limparSubcategoria
                  }
                  className={`font-medium transition ${
                    !labelFiltroSelecionado
                      ? 'text-slate-900 dark:text-slate-100'
                      : 'text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300'
                  }`}
                >
                  {labelOrigem(
                    origem
                  )}
                </button>
              </>
            )}

            {tipoTitularDocumento ===
              'SOCIO_REPRESENTANTE' &&
              categoriaDocumento && (
                <>
                  <ChevronRight
                    size={14}
                    className="text-slate-400"
                  />

                  <span className="font-medium text-slate-500 dark:text-slate-400">
                    Sócios / representantes
                  </span>
                </>
              )}

            {tipoTitularDocumento ===
              'EMPRESA' &&
              categoriaDocumento && (
                <>
                  <ChevronRight
                    size={14}
                    className="text-slate-400"
                  />

                  <span className="font-medium text-slate-500 dark:text-slate-400">
                    Documentos empresariais
                  </span>
                </>
              )}

            {labelFiltroSelecionado && (
              <>
                <ChevronRight
                  size={14}
                  className="text-slate-400"
                />

                <span className="font-semibold text-slate-900 dark:text-slate-100">
                  {labelFiltroSelecionado}
                </span>
              </>
            )}
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <div className="border-b border-slate-200 p-4 dark:border-slate-800">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                <div>
                  <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                    {tituloTabela}
                  </h2>

                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                    {origem
                      ? 'Arquivos correspondentes à navegação e aos filtros selecionados.'
                      : usandoRecorteCarteira
                        ? 'Arquivos vinculados aos clientes da carteira selecionada.'
                        : 'Catálogo central de arquivos armazenados.'}
                  </p>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row">
                  <div className="relative min-w-0 sm:w-[280px]">
                    <Search
                      size={16}
                      className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    />

                    <input
                      type="text"
                      value={
                        buscaDigitada
                      }
                      onChange={(
                        event
                      ) =>
                        setBuscaDigitada(
                          event.target
                            .value
                        )
                      }
                      placeholder="Pesquisar arquivo..."
                      className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                    />
                  </div>

                  <select
                    value={origem}
                    onChange={(
                      event
                    ) => {
                      const valor =
                        event.target
                          .value as
                          | StorageOrigem
                          | ''

                      if (valor) {
                        selecionarOrigem(
                          valor
                        )
                      } else {
                        limparNavegacao()
                      }
                    }}
                    className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                  >
                    <option value="">
                      Todas as origens
                    </option>

                    {ORIGENS.map(
                      (item) => (
                        <option
                          key={
                            item.value
                          }
                          value={
                            item.value
                          }
                        >
                          {
                            item.label
                          }
                        </option>
                      )
                    )}
                  </select>

                  <select
                    value={
                      tipoArquivo
                    }
                    onChange={(
                      event
                    ) => {
                      setTipoArquivo(
                        event.target
                          .value as
                            | StorageClassificacaoArquivo
                            | ''
                      )

                      setPagina(1)
                    }}
                    className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                  >
                    <option value="">
                      Todos os tipos
                    </option>

                    {(
                      origem === 'WHATSAPP'
                        ? TIPOS_WHATSAPP
                        : TIPOS_ARQUIVO
                    ).map(
                      (item) => (
                        <option
                          key={
                            item.value
                          }
                          value={
                            item.value
                          }
                        >
                          {
                            item.label
                          }
                        </option>
                      )
                    )}
                  </select>
                </div>
              </div>
            </div>

            {erroArquivos && (
              <div className="m-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
                {erroArquivos}
              </div>
            )}

            {loadingArquivos ? (
              <div className="flex min-h-[280px] items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-slate-500" />
              </div>
            ) : arquivos.length ===
              0 ? (
              <div className="flex min-h-[280px] flex-col items-center justify-center px-6 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-500 dark:bg-slate-900 dark:text-slate-400">
                  <FolderArchive
                    size={22}
                  />
                </div>

                <h3 className="mt-4 text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Nenhum arquivo encontrado
                </h3>

                <p className="mt-1 max-w-md text-sm text-slate-500 dark:text-slate-400">
                  Não existem arquivos ativos correspondentes aos filtros selecionados.
                </p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1100px]">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-left dark:border-slate-800 dark:bg-slate-900/50">
                        <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                          Arquivo
                        </th>
                        <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                          Origem
                        </th>
                        <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                          Contexto
                        </th>
                        <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                          Tipo
                        </th>
                        <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                          Tamanho
                        </th>
                        <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                          Data
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                          Ações
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {arquivos.map((arquivo) => {
                        const categoriaMetadata =
                          typeof arquivo.metadata?.categoria_documento ===
                          'string'
                            ? arquivo.metadata.categoria_documento
                            : null

                        const titularMetadata =
                          typeof arquivo.metadata?.tipo_titular_documento ===
                          'string'
                            ? arquivo.metadata.tipo_titular_documento
                            : null

                        const contexto =
                          arquivo.contexto

                        const identificadorContexto =
                          contexto?.telefone
                            ? formatarTelefoneContexto(
                                contexto.telefone
                              )
                            : contexto?.documento
                              ? formatarDocumentoContexto(
                                  contexto.documento
                                )
                              : ''

                        const detalhesContexto = [
                          identificadorContexto,
                          contexto?.subtitulo || null,
                        ]
                          .filter(Boolean)
                          .join(' • ')

                        return (
                          <tr
                            key={arquivo.id}
                            className="border-b border-slate-100 transition last:border-b-0 hover:bg-slate-50 dark:border-slate-900 dark:hover:bg-slate-900/40"
                          >
                            <td className="px-4 py-3.5">
                              <div className="flex min-w-0 items-center gap-3">
                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600 dark:bg-slate-900 dark:text-slate-300">
                                  <IconeArquivo
                                    tipo={arquivo.tipo_arquivo}
                                  />
                                </div>

                                <div className="min-w-0">
                                  <p
                                    className="max-w-[360px] truncate text-sm font-medium text-slate-900 dark:text-slate-100"
                                    title={arquivo.nome_original}
                                  >
                                    {arquivo.nome_original}
                                  </p>

                                  <p className="mt-0.5 max-w-[420px] truncate text-xs text-slate-400">
                                    {arquivo.mime_type ||
                                      'Tipo não informado'}

                                    {categoriaMetadata
                                      ? ` • ${labelCategoria(
                                          categoriaMetadata
                                        )}`
                                      : ''}

                                    {titularMetadata ===
                                    'SOCIO_REPRESENTANTE'
                                      ? ' • Sócio / representante'
                                      : ''}
                                  </p>
                                </div>
                              </div>
                            </td>

                            <td className="px-4 py-3.5">
                              <span className="inline-flex rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600 dark:bg-slate-900 dark:text-slate-300">
                                {labelOrigem(
                                  arquivo.origem
                                )}
                              </span>
                            </td>

                            <td className="px-4 py-3.5">
                              {contexto ? (
                                <div className="min-w-[220px] max-w-[320px]">
                                  <p
                                    className="truncate text-sm font-medium text-slate-800 dark:text-slate-200"
                                    title={contexto.titulo}
                                  >
                                    {contexto.titulo}
                                  </p>

                                  {detalhesContexto ? (
                                    <p
                                      className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400"
                                      title={detalhesContexto}
                                    >
                                      {detalhesContexto}
                                    </p>
                                  ) : null}
                                </div>
                              ) : (
                                <span className="text-xs text-slate-400">
                                  Sem vínculo identificado
                                </span>
                              )}
                            </td>

                            <td className="px-4 py-3.5 text-sm text-slate-600 dark:text-slate-300">
                              {labelTipo(
                                arquivo.tipo_arquivo
                              )}
                            </td>

                            <td className="px-4 py-3.5 text-sm text-slate-600 dark:text-slate-300">
                              {formatarBytes(
                                arquivo.tamanho_bytes
                              )}
                            </td>

                            <td className="px-4 py-3.5 text-sm text-slate-600 dark:text-slate-300">
                              {formatarData(
                                arquivo.created_at
                              )}
                            </td>

                            <td className="px-4 py-3.5">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  type="button"
                                  title="Visualizar arquivo"
                                  disabled={
                                    arquivoEmAcao ===
                                    arquivo.id
                                  }
                                  onClick={() =>
                                    handleVisualizarArquivo(
                                      arquivo
                                    )
                                  }
                                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-blue-400"
                                >
                                  {arquivoEmAcao ===
                                  arquivo.id ? (
                                    <Loader2
                                      size={16}
                                      className="animate-spin"
                                    />
                                  ) : (
                                    <ExternalLink
                                      size={16}
                                    />
                                  )}
                                </button>

                                <button
                                  type="button"
                                  title="Baixar arquivo"
                                  disabled={
                                    arquivoEmAcao ===
                                    arquivo.id
                                  }
                                  onClick={() =>
                                    handleBaixarArquivo(
                                      arquivo
                                    )
                                  }
                                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-blue-400"
                                >
                                  {arquivoEmAcao ===
                                  arquivo.id ? (
                                    <Loader2
                                      size={16}
                                      className="animate-spin"
                                    />
                                  ) : (
                                    <Download
                                      size={16}
                                    />
                                  )}
                                </button>

                                {podeExcluir && (
                                  <button
                                    type="button"
                                    title="Excluir arquivo"
                                    disabled={
                                      arquivoEmAcao ===
                                      arquivo.id
                                    }
                                    onClick={() =>
                                      handleExcluirArquivo(
                                        arquivo
                                      )
                                    }
                                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-red-200 bg-white text-red-600 transition hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-900/60 dark:bg-slate-900 dark:text-red-400 dark:hover:bg-red-950/40 dark:hover:text-red-300"
                                  >
                                    {arquivoEmAcao ===
                                    arquivo.id ? (
                                      <Loader2
                                        size={16}
                                        className="animate-spin"
                                      />
                                    ) : (
                                      <Trash2
                                        size={16}
                                      />
                                    )}
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="flex flex-col gap-3 border-t border-slate-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Exibindo{' '}
                    {inicioExibicao} a{' '}
                    {fimExibicao} de{' '}
                    {totalArquivos.toLocaleString(
                      'pt-BR'
                    )}{' '}
                    arquivos
                  </p>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={
                        pagina <= 1
                      }
                      onClick={() =>
                        setPagina(
                          (
                            paginaAtual
                          ) =>
                            Math.max(
                              1,
                              paginaAtual -
                                1
                            )
                        )
                      }
                      className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                      Anterior
                    </button>

                    <span className="px-2 text-xs font-medium text-slate-500 dark:text-slate-400">
                      Página {pagina} de{' '}
                      {Math.max(
                        1,
                        totalPaginas
                      )}
                    </span>

                    <button
                      type="button"
                      disabled={
                        pagina >=
                        totalPaginas
                      }
                      onClick={() =>
                        setPagina(
                          (
                            paginaAtual
                          ) =>
                            paginaAtual +
                            1
                        )
                      }
                      className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                      Próxima
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
