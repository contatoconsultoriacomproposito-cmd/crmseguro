import {
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from 'react'
import {
  Building2,
  CheckCircle2,
  File,
  FileImage,
  FileText,
  Loader2,
  Upload,
  UserRound,
  X,
} from 'lucide-react'
import { toast } from 'sonner'

import {
  DOCUMENTO_GRUPOS,
  listarCategoriasParaCliente,
  type DocumentoCategoria,
  type DocumentoGrupo,
} from '../../documentos/types/documentos'


import {
  adicionarArquivoCliente,
  type ClienteArquivoUpload,
} from '../services/clienteArquivosService'


import {
  isStorageLimitError,
} from '../../services/storageQuotaError'



interface ModalAdicionarArquivoClienteProps {
  cliente: {
    id: string
    tipo: 'PF' | 'PJ'
    nome: string
    documento?: string | null
  }
  onClose: () => void
  onSuccess: () => void | Promise<void>
  onStorageLimit?: () => void | Promise<void>
}

const ACCEPT_DOCUMENTOS = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  '.pdf',
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
  '.doc',
  '.docx',
  '.xls',
  '.xlsx',
  '.csv',
  '.txt',
].join(',')

function formatarDocumento(
  valor: string | null | undefined,
  tipo: 'PF' | 'PJ'
): string {
  if (!valor) return ''

  const numeros = valor.replace(/\D/g, '')

  if (
    tipo === 'PF' &&
    numeros.length === 11
  ) {
    return numeros.replace(
      /(\d{3})(\d{3})(\d{3})(\d{2})/,
      '$1.$2.$3-$4'
    )
  }

  if (
    tipo === 'PJ' &&
    numeros.length === 14
  ) {
    return numeros.replace(
      /(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/,
      '$1.$2.$3/$4-$5'
    )
  }

  return valor
}

function formatarBytes(
  bytes: number
): string {
  if (
    !Number.isFinite(bytes) ||
    bytes <= 0
  ) {
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
      Math.log(bytes) /
        Math.log(1024)
    ),
    unidades.length - 1
  )

  const valor =
    bytes /
    Math.pow(1024, indice)

  const casas =
    indice === 0
      ? 0
      : valor >= 10
        ? 1
        : 2

  return `${valor.toFixed(casas)} ${unidades[indice]}`
}

function obterExtensaoArquivo(
  nome: string
): string {
  const partes =
    nome.split('.')

  if (partes.length <= 1) {
    return ''
  }

  return (
    partes
      .pop()
      ?.toUpperCase() ?? ''
  )
}

function obterIconeArquivo(
  arquivo: File
) {
  if (
    arquivo.type.startsWith(
      'image/'
    )
  ) {
    return (
      <FileImage
        size={22}
        className="text-blue-600"
      />
    )
  }

  if (
    arquivo.type ===
      'application/pdf' ||
    arquivo.name
      .toLowerCase()
      .endsWith('.pdf')
  ) {
    return (
      <FileText
        size={22}
        className="text-red-500"
      />
    )
  }

  return (
    <File
      size={22}
      className="text-slate-500"
    />
  )
}

export default function ModalAdicionarArquivoCliente({
  cliente,
  onClose,
  onSuccess,
  onStorageLimit,
}: ModalAdicionarArquivoClienteProps) {
  const inputArquivoRef =
    useRef<HTMLInputElement | null>(
      null
    )

  const [
    categoria,
    setCategoria,
  ] =
    useState<DocumentoCategoria | ''>(
      ''
    )

  const [
    arquivo,
    setArquivo,
  ] =
    useState<File | null>(
      null
    )

  const [
    enviando,
    setEnviando,
  ] =
    useState(false)

  const categoriasPermitidas =
    useMemo(() => {
      return listarCategoriasParaCliente(
        cliente.tipo
      )
    }, [cliente.tipo])

  const gruposDisponiveis =
    useMemo(() => {
      const grupos =
        new Set<DocumentoGrupo>(
          categoriasPermitidas.map(
            item => item.grupo
          )
        )

      return DOCUMENTO_GRUPOS.filter(
        grupo =>
          grupos.has(
            grupo.value
          )
      )
    }, [
      categoriasPermitidas,
    ])

  const handleSelecionarArquivo =
    (
      event:
        ChangeEvent<HTMLInputElement>
    ) => {
      const selecionado =
        event.target.files?.[0] ??
        null

      if (!selecionado) {
        return
      }

      if (
        selecionado.size <= 0
      ) {
        toast.error(
          'O arquivo selecionado está vazio.'
        )

        event.target.value = ''
        return
      }

      setArquivo(selecionado)
    }

  const handleRemoverArquivo =
    () => {
      setArquivo(null)

      if (
        inputArquivoRef.current
      ) {
        inputArquivoRef.current.value =
          ''
      }
    }

  const handleEnviar =
    async () => {
      if (enviando) {
        return
      }

      if (!categoria) {
        toast.error(
          'Selecione a categoria do documento.'
        )
        return
      }

      if (!arquivo) {
        toast.error(
          'Selecione o arquivo que deseja enviar.'
        )
        return
      }

      const payload:
        ClienteArquivoUpload = {
          clienteId:
            cliente.id,

          clienteTipo:
            cliente.tipo,

          categoria,

          arquivo,
        }

      try {
        setEnviando(true)

        await adicionarArquivoCliente(
          payload
        )

        toast.success(
          'Documento adicionado com sucesso.'
        )

        await onSuccess()

        onClose()
      } catch (error) {
        console.error(
          'Erro ao adicionar documento à ficha do cliente:',
          error
        )

        if (
          isStorageLimitError(
            error
          )
        ) {
          toast.error(
            'O documento não cabe no espaço disponível.'
          )

          if (
            onStorageLimit
          ) {
            onClose()
            await onStorageLimit()
          }

          return
        }

        toast.error(
          error instanceof Error
            ? error.message
            : 'Não foi possível adicionar o documento.'
        )
      } finally {
        setEnviando(false)
      }
    }

  return (
    <div
      className={[
        'fixed',
        'inset-0',
        'z-[100]',
        'flex',
        'items-center',
        'justify-center',
        'bg-slate-950/60',
        'p-4',
        'backdrop-blur-sm',
      ].join(' ')}
      onMouseDown={event => {
        if (
          event.target ===
          event.currentTarget &&
          !enviando
        ) {
          onClose()
        }
      }}
    >
      <div
        className={[
          'flex',
          'max-h-[90vh]',
          'w-full',
          'max-w-xl',
          'flex-col',
          'overflow-hidden',
          'rounded-2xl',
          'border',
          'border-gray-200',
          'bg-white',
          'shadow-2xl',
          'dark:border-slate-800',
          'dark:bg-slate-950',
        ].join(' ')}
      >
        <header
          className={[
            'flex',
            'items-center',
            'justify-between',
            'gap-4',
            'border-b',
            'border-gray-100',
            'px-5',
            'py-4',
            'dark:border-slate-800',
          ].join(' ')}
        >
          <div
            className={[
              'flex',
              'min-w-0',
              'items-center',
              'gap-3',
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
                'rounded-xl',
                'bg-blue-50',
                'text-blue-600',
                'dark:bg-blue-950/50',
                'dark:text-blue-400',
              ].join(' ')}
            >
              <Upload size={20} />
            </div>

            <div className="min-w-0">
              <h2
                className={[
                  'text-base',
                  'font-semibold',
                  'text-gray-900',
                  'dark:text-slate-100',
                ].join(' ')}
              >
                Adicionar documento
              </h2>

              <p
                className={[
                  'mt-0.5',
                  'text-xs',
                  'text-gray-500',
                  'dark:text-slate-400',
                ].join(' ')}
              >
                Arquivo da ficha do cliente
              </p>
            </div>
          </div>

          <button
            type="button"
            disabled={enviando}
            onClick={onClose}
            className={[
              'flex',
              'h-9',
              'w-9',
              'shrink-0',
              'items-center',
              'justify-center',
              'rounded-lg',
              'text-gray-400',
              'transition',
              'hover:bg-gray-100',
              'hover:text-gray-700',
              'disabled:cursor-not-allowed',
              'disabled:opacity-50',
              'dark:hover:bg-slate-800',
              'dark:hover:text-slate-200',
            ].join(' ')}
          >
            <X size={18} />
          </button>
        </header>

        <div
          className={[
            'flex-1',
            'space-y-5',
            'overflow-y-auto',
            'px-5',
            'py-5',
          ].join(' ')}
        >
          <section>
            <label
              className={[
                'mb-2',
                'block',
                'text-sm',
                'font-medium',
                'text-gray-700',
                'dark:text-slate-300',
              ].join(' ')}
            >
              Cliente
            </label>

            <div
              className={[
                'flex',
                'items-center',
                'gap-3',
                'rounded-xl',
                'border',
                'border-gray-200',
                'bg-gray-50',
                'p-3',
                'dark:border-slate-800',
                'dark:bg-slate-900/60',
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
                  'rounded-xl',
                  cliente.tipo === 'PF'
                    ? 'bg-blue-100 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400'
                    : 'bg-violet-100 text-violet-600 dark:bg-violet-950/50 dark:text-violet-400',
                ].join(' ')}
              >
                {cliente.tipo ===
                'PF' ? (
                  <UserRound
                    size={18}
                  />
                ) : (
                  <Building2
                    size={18}
                  />
                )}
              </div>

              <div
                className="min-w-0 flex-1"
              >
                <div
                  className={[
                    'flex',
                    'items-center',
                    'gap-2',
                  ].join(' ')}
                >
                  <p
                    className={[
                      'truncate',
                      'text-sm',
                      'font-semibold',
                      'text-gray-800',
                      'dark:text-slate-200',
                    ].join(' ')}
                  >
                    {cliente.nome}
                  </p>

                  <span
                    className={[
                      'shrink-0',
                      'rounded-full',
                      'px-2',
                      'py-0.5',
                      'text-[10px]',
                      'font-semibold',
                      cliente.tipo ===
                      'PF'
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300'
                        : 'bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300',
                    ].join(' ')}
                  >
                    {cliente.tipo}
                  </span>
                </div>

                {cliente.documento && (
                  <p
                    className={[
                      'mt-0.5',
                      'text-xs',
                      'text-gray-400',
                      'dark:text-slate-500',
                    ].join(' ')}
                  >
                    {cliente.tipo ===
                    'PF'
                      ? 'CPF'
                      : 'CNPJ'}
                    :{' '}
                    {formatarDocumento(
                      cliente.documento,
                      cliente.tipo
                    )}
                  </p>
                )}
              </div>

              <CheckCircle2
                size={18}
                className="shrink-0 text-emerald-500"
              />
            </div>
          </section>

          <section>
            <label
              htmlFor="categoria-arquivo-cliente"
              className={[
                'mb-2',
                'block',
                'text-sm',
                'font-medium',
                'text-gray-700',
                'dark:text-slate-300',
              ].join(' ')}
            >
              Categoria do documento
            </label>

            <select
              id="categoria-arquivo-cliente"
              value={categoria}
              disabled={enviando}
              onChange={event =>
                setCategoria(
                  event.target
                    .value as
                    | DocumentoCategoria
                    | ''
                )
              }
              className={[
                'h-11',
                'w-full',
                'rounded-xl',
                'border',
                'border-gray-200',
                'bg-white',
                'px-3',
                'text-sm',
                'text-gray-700',
                'outline-none',
                'transition',
                'focus:border-blue-400',
                'focus:ring-2',
                'focus:ring-blue-100',
                'disabled:cursor-not-allowed',
                'disabled:opacity-60',
                'dark:border-slate-700',
                'dark:bg-slate-900',
                'dark:text-slate-200',
                'dark:focus:border-blue-500',
                'dark:focus:ring-blue-950',
              ].join(' ')}
            >
              <option value="">
                Selecione uma categoria
              </option>

              {gruposDisponiveis.map(
                grupo => {
                  const opcoes =
                    categoriasPermitidas.filter(
                      item =>
                        item.grupo ===
                        grupo.value
                    )

                  if (
                    opcoes.length === 0
                  ) {
                    return null
                  }

                  return (
                    <optgroup
                      key={
                        grupo.value
                      }
                      label={
                        grupo.label
                      }
                    >
                      {opcoes.map(
                        opcao => (
                          <option
                            key={
                              opcao.value
                            }
                            value={
                              opcao.value
                            }
                          >
                            {
                              opcao.label
                            }
                          </option>
                        )
                      )}
                    </optgroup>
                  )
                }
              )}
            </select>
          </section>

          <section>
            <label
              className={[
                'mb-2',
                'block',
                'text-sm',
                'font-medium',
                'text-gray-700',
                'dark:text-slate-300',
              ].join(' ')}
            >
              Arquivo
            </label>

            <input
              ref={inputArquivoRef}
              type="file"
              accept={ACCEPT_DOCUMENTOS}
              disabled={enviando}
              onChange={
                handleSelecionarArquivo
              }
              className="hidden"
            />

            {!arquivo ? (
              <button
                type="button"
                disabled={enviando}
                onClick={() =>
                  inputArquivoRef
                    .current
                    ?.click()
                }
                className={[
                  'flex',
                  'min-h-[130px]',
                  'w-full',
                  'flex-col',
                  'items-center',
                  'justify-center',
                  'rounded-xl',
                  'border-2',
                  'border-dashed',
                  'border-gray-200',
                  'bg-gray-50/50',
                  'px-5',
                  'py-6',
                  'text-center',
                  'transition',
                  'hover:border-blue-300',
                  'hover:bg-blue-50/40',
                  'disabled:cursor-not-allowed',
                  'disabled:opacity-60',
                  'dark:border-slate-700',
                  'dark:bg-slate-900/30',
                  'dark:hover:border-blue-700',
                  'dark:hover:bg-blue-950/20',
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
                    'bg-blue-100',
                    'text-blue-600',
                    'dark:bg-blue-950/50',
                    'dark:text-blue-400',
                  ].join(' ')}
                >
                  <Upload
                    size={20}
                  />
                </div>

                <p
                  className={[
                    'text-sm',
                    'font-medium',
                    'text-gray-700',
                    'dark:text-slate-200',
                  ].join(' ')}
                >
                  Selecionar arquivo
                </p>

                <p
                  className={[
                    'mt-1',
                    'text-xs',
                    'text-gray-400',
                    'dark:text-slate-500',
                  ].join(' ')}
                >
                  PDF, imagem, Word,
                  Excel, CSV ou TXT
                </p>
              </button>
            ) : (
              <div
                className={[
                  'flex',
                  'items-center',
                  'gap-3',
                  'rounded-xl',
                  'border',
                  'border-gray-200',
                  'bg-gray-50',
                  'p-3',
                  'dark:border-slate-800',
                  'dark:bg-slate-900/60',
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
                    'rounded-xl',
                    'bg-white',
                    'shadow-sm',
                    'dark:bg-slate-950',
                  ].join(' ')}
                >
                  {obterIconeArquivo(
                    arquivo
                  )}
                </div>

                <div
                  className="min-w-0 flex-1"
                >
                  <p
                    className={[
                      'truncate',
                      'text-sm',
                      'font-medium',
                      'text-gray-800',
                      'dark:text-slate-200',
                    ].join(' ')}
                  >
                    {arquivo.name}
                  </p>

                  <p
                    className={[
                      'mt-0.5',
                      'text-xs',
                      'text-gray-400',
                      'dark:text-slate-500',
                    ].join(' ')}
                  >
                    {obterExtensaoArquivo(
                      arquivo.name
                    ) || 'ARQUIVO'}
                    {' • '}
                    {formatarBytes(
                      arquivo.size
                    )}
                  </p>
                </div>

                <button
                  type="button"
                  disabled={enviando}
                  onClick={
                    handleRemoverArquivo
                  }
                  className={[
                    'flex',
                    'h-8',
                    'w-8',
                    'shrink-0',
                    'items-center',
                    'justify-center',
                    'rounded-lg',
                    'text-gray-400',
                    'transition',
                    'hover:bg-red-50',
                    'hover:text-red-500',
                    'disabled:cursor-not-allowed',
                    'disabled:opacity-50',
                    'dark:hover:bg-red-950/30',
                  ].join(' ')}
                >
                  <X size={16} />
                </button>
              </div>
            )}
          </section>
        </div>

        <footer
          className={[
            'flex',
            'items-center',
            'justify-end',
            'gap-2',
            'border-t',
            'border-gray-100',
            'px-5',
            'py-4',
            'dark:border-slate-800',
          ].join(' ')}
        >
          <button
            type="button"
            disabled={enviando}
            onClick={onClose}
            className={[
              'h-10',
              'rounded-xl',
              'border',
              'border-gray-200',
              'px-4',
              'text-sm',
              'font-medium',
              'text-gray-600',
              'transition',
              'hover:bg-gray-50',
              'disabled:cursor-not-allowed',
              'disabled:opacity-50',
              'dark:border-slate-700',
              'dark:text-slate-300',
              'dark:hover:bg-slate-900',
            ].join(' ')}
          >
            Cancelar
          </button>

          <button
            type="button"
            disabled={
              enviando ||
              !categoria ||
              !arquivo
            }
            onClick={() => {
              void handleEnviar()
            }}
            className={[
              'flex',
              'h-10',
              'items-center',
              'justify-center',
              'gap-2',
              'rounded-xl',
              'bg-blue-600',
              'px-4',
              'text-sm',
              'font-semibold',
              'text-white',
              'transition',
              'hover:bg-blue-700',
              'disabled:cursor-not-allowed',
              'disabled:opacity-50',
            ].join(' ')}
          >
            {enviando ? (
              <>
                <Loader2
                  size={16}
                  className="animate-spin"
                />
                Enviando...
              </>
            ) : (
              <>
                <Upload
                  size={16}
                />
                Adicionar documento
              </>
            )}
          </button>
        </footer>
      </div>
    </div>
  )
}